"""
Admin permission management system
"""
from typing import List, Dict, Optional
from models.admin_user import AdminUser, AdminRole
from fastapi import HTTPException, status

class PermissionManager:
    """Manages role-based permissions for admin users"""
    
    # Define permissions for each role
    ROLE_PERMISSIONS = {
        AdminRole.SUPER_ADMIN: [
            "admin.users.create",
            "admin.users.read", 
            "admin.users.update",
            "admin.users.delete",
            "admin.events.create",
            "admin.events.read",
            "admin.events.update", 
            "admin.events.delete",
            "admin.students.create",
            "admin.students.read",
            "admin.students.update",
            "admin.students.delete",
            "admin.dashboard.view",
            "admin.analytics.view",
            "admin.settings.manage",
            "admin.logs.view",
            "admin.audit_logs.view",
            "admin.notifications.manage",
            "admin.system.manage"
        ],
        AdminRole.EXECUTIVE_ADMIN: [
            "admin.events.create",
            "admin.events.read",
            "admin.events.update",
            "admin.certificates.create",
            "admin.certificates.read",
            "admin.certificates.templates.manage",
            "admin.students.read",
            "admin.dashboard.view.limited",
            "admin.notifications.view"
        ],
        # Legacy roles for backward compatibility
        AdminRole.EVENT_ADMIN: [
            "admin.events.read",
            "admin.events.update", 
            "admin.students.read",
            "admin.dashboard.view"
        ],
        AdminRole.CONTENT_ADMIN: [
            "admin.events.create",
            "admin.events.read",
            "admin.events.update",
            "admin.students.read",
            "admin.dashboard.view"
        ]
    }
    
    @classmethod
    def has_permission(cls, admin: AdminUser, permission: str, event_id: Optional[str] = None) -> bool:
        """Check if admin has a specific permission"""
        if not admin.is_active:
            return False
            
        # Super admin has all permissions
        if admin.role == AdminRole.SUPER_ADMIN:
            return True
            
        # Check role-based permissions
        role_permissions = cls.ROLE_PERMISSIONS.get(admin.role, [])
        
        # For event-specific permissions, check if admin has access to the event
        if event_id and admin.role == AdminRole.EVENT_ADMIN:
            if event_id not in (admin.assigned_events or []):
                return False
                
        return permission in role_permissions
    
    @classmethod
    def can_access_event(cls, admin: AdminUser, event_id: str) -> bool:
        """Check if admin can access a specific event"""
        if admin.role == AdminRole.SUPER_ADMIN:
            return True
        
        if admin.role == AdminRole.EXECUTIVE_ADMIN:
            return True  # Executive admins can access all events
            
        if admin.role == AdminRole.EVENT_ADMIN:
            return event_id in (admin.assigned_events or [])
            
        return False
    
    @classmethod
    def can_request_event_deletion(cls, admin: AdminUser, event_id: str) -> bool:
        """Check if admin can request event deletion"""
        if admin.role == AdminRole.SUPER_ADMIN:
            return True  # Super admin can delete directly
            
        return False
    
    @classmethod
    def get_accessible_events(cls, admin: AdminUser, all_events: List[Dict]) -> List[Dict]:
        """Get events that admin can access"""
        if admin.role in [AdminRole.SUPER_ADMIN, AdminRole.EXECUTIVE_ADMIN]:
            return all_events
            
        if admin.role == AdminRole.EVENT_ADMIN:
            assigned_event_ids = admin.assigned_events or []
            return [event for event in all_events if event.get("event_id") in assigned_event_ids]
            
        return []
    
    @classmethod
    def get_user_permissions(cls, admin: AdminUser) -> List[str]:
        """Get all permissions for a user"""
        if not admin.is_active:
            return []
            
        return cls.ROLE_PERMISSIONS.get(admin.role, [])
    
    @classmethod
    def can_create_admin(cls, admin: AdminUser, target_role: AdminRole) -> bool:
        """Check if admin can create another admin with target role"""
        # Only super admin can create other admins
        if admin.role != AdminRole.SUPER_ADMIN:
            return False
            
        # Super admin can create any role
        return True
    
    @classmethod
    def can_manage_user(cls, admin: AdminUser, target_admin: AdminUser) -> bool:
        """Check if admin can manage (update/delete) another admin"""
        # Only super admin can manage other admins
        if admin.role != AdminRole.SUPER_ADMIN:
            return False
            
        # Super admin can manage anyone except cannot delete themselves
        if admin.username == target_admin.username and "delete" in str(admin):
            return False
            
        return True
    
    @classmethod
    def filter_events_by_permission(cls, admin: AdminUser, events: List[Dict]) -> List[Dict]:
        """Filter events based on admin permissions"""
        if admin.role == AdminRole.SUPER_ADMIN:
            return events
            
        if admin.role == AdminRole.EVENT_ADMIN:
            # Event admins can only see their assigned events
            assigned_event_ids = admin.assigned_events or []
            return [event for event in events if event.get("event_id") in assigned_event_ids]
            
        # Executive and Content admins can see all events
        return events

def require_permission(permission: str, event_id: Optional[str] = None):
    """Decorator to require specific permission"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Extract admin from function arguments
            admin = None
            for arg in args:
                if isinstance(arg, AdminUser):
                    admin = arg
                    break
            
            if not admin:
                # Try to get from kwargs
                admin = kwargs.get('current_admin')
                
            if not admin:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Admin authentication required"
                )
                
            if not PermissionManager.has_permission(admin, permission, event_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Insufficient permissions. Required: {permission}"
                )
                
            return func(*args, **kwargs)
        return wrapper
    return decorator

def require_super_admin(admin: AdminUser):
    """Helper to require super admin role"""
    if admin.role != AdminRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
