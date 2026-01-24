"""
Professional Organizer Access API
=================================
Unified API for organizer access management and portal functionality.
Combines functionality from unified_organizer.py and organizer_portal.py.
"""

from fastapi import APIRouter, Request, Depends, HTTPException, status
from fastapi.responses import RedirectResponse, JSONResponse
from typing import Optional, List
from datetime import datetime
import pytz
import logging
import os

from models.faculty import Faculty
from models.admin_user import AdminUser, AdminRole
from dependencies.auth import require_faculty_login, require_admin
from database.operations import DatabaseOperations
from core.permissions import PermissionManager

router = APIRouter(prefix="/organizer", tags=["organizer-access"])
logger = logging.getLogger(__name__)

class OrganizerAccessManager:
    """Professional organizer access management operations"""
    
    @staticmethod
    async def grant_organizer_access(faculty_employee_id: str, assigned_events: List[str] = None) -> bool:
        """Grant organizer access to a faculty member"""
        try:
            update_data = {
                "is_organizer": True,
                "assigned_events": assigned_events or [],
                "organizer_permissions": [
                    "admin.events.read",
                    "admin.events.create", 
                    "admin.events.update",
                    "admin.students.read",
                    "admin.certificates.create",
                    "admin.certificates.read",
                    "admin.venues.read",
                    "admin.venues.create",
                    "admin.assets.read",
                    "admin.assets.create",
                    "admin.feedback.read",
                    "admin.feedback.create"
                ],
                "updated_at": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None)
            }
            
            result = await DatabaseOperations.update_one(
                "faculties",
                {"employee_id": faculty_employee_id},
                {"$set": update_data}
            )
            
            return bool(result)
        except Exception as e:
            logger.error(f"Error granting organizer access: {str(e)}")
            return False
    
    @staticmethod
    async def revoke_organizer_access(faculty_employee_id: str) -> bool:
        """Revoke organizer access from a faculty member"""
        try:
            update_data = {
                "is_organizer": False,
                "assigned_events": [],
                "organizer_permissions": [],
                "updated_at": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None)
            }
            
            result = await DatabaseOperations.update_one(
                "faculties",
                {"employee_id": faculty_employee_id},
                {"$set": update_data}
            )
            
            return bool(result)
        except Exception as e:
            logger.error(f"Error revoking organizer access: {str(e)}")
            return False

# Organizer Access Management Endpoints (CONSOLIDATED - removed unused endpoints)

@router.post("/access-portal")
async def access_organizer_portal(request: Request, faculty: Faculty = Depends(require_faculty_login)):
    """Faculty member accesses organizer portal (creates admin session)"""
    try:
        # Check if faculty has organizer access (either is_organizer flag or organizer_permissions)
        has_organizer_access = (
            getattr(faculty, 'is_organizer', False) or 
            len(getattr(faculty, 'organizer_permissions', [])) > 0
        )
        
        if not has_organizer_access:
            return JSONResponse(
                content={
                    "success": False,
                    "message": "You do not have organizer access. Please request access first."
                },
                status_code=403
            )
        
        # Create organizer admin session for authenticated faculty
        # Convert faculty to AdminUser format for organizer portal
        admin_data = {
            "fullname": faculty.full_name,
            "username": faculty.employee_id,
            "employee_id": faculty.employee_id,  # Add this critical field!
            "email": faculty.email,
            "password": faculty.password,
            "is_active": True,
            "role": AdminRole.ORGANIZER_ADMIN,
            "created_at": getattr(faculty, 'created_at', None),
            "last_login": getattr(faculty, 'last_login', None),
            "created_by": "system",
            "assigned_events": getattr(faculty, 'assigned_events', []),
            "permissions": getattr(faculty, 'organizer_permissions', [])
        }
        
        try:
            organizer_admin = AdminUser(**admin_data)
        except Exception as e:
            logger.error(f"Error creating AdminUser object: {str(e)}")
            return JSONResponse(
                content={
                    "success": False,
                    "message": "Error creating admin session"
                },
                status_code=500
            )
        
        # Store organizer admin session
        current_time = datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None)
        admin_session_data = organizer_admin.model_dump()
        
        # Serialize datetime objects
        for key, value in admin_session_data.items():
            if isinstance(value, datetime):
                admin_session_data[key] = value.isoformat()
        
        # Add session metadata
        admin_session_data["login_time"] = current_time.isoformat()
        admin_session_data["login_type"] = "organizer"
        
        # Store in session
        request.session["admin"] = admin_session_data
        
        # Generate admin tokens for cross-device compatibility
        from utils.token_manager import TokenManager
        token_manager = TokenManager()
        
        admin_tokens = {}
        if token_manager.is_available():
            admin_tokens = token_manager.generate_tokens(
                user_id=faculty.employee_id,
                user_type='admin',
                user_data=admin_session_data,
                remember_me=True  # Use remember_me for organizer sessions
            )
        
        response_data = {
            "success": True,
            "message": "Successfully authenticated as organizer",
            "redirect_url": "/admin/events",
            "data": {
                "organizer_name": faculty.full_name,
                "employee_id": faculty.employee_id,
                "role": "organizer_admin",
                "assigned_events": getattr(faculty, 'assigned_events', [])
            }
        }
        
        # Add token information if available
        if admin_tokens:
            response_data["auth_type"] = "token"
            response_data["expires_in"] = admin_tokens.get("expires_in", 3600)
            # Include tokens in response for cross-device Bearer auth support
            response_data["access_token"] = admin_tokens.get("access_token")
            response_data["refresh_token"] = admin_tokens.get("refresh_token")
        else:
            response_data["auth_type"] = "session"
        
        # Create response
        response = JSONResponse(content=response_data)
        
        # Set admin token cookies if tokens were generated
        if admin_tokens:
            from middleware.auth_middleware import AuthMiddleware
            AuthMiddleware.set_token_cookies(
                response,
                access_token=admin_tokens["access_token"],
                refresh_token=admin_tokens.get("refresh_token"),
                expires_in=admin_tokens.get("expires_in", 3600)
            )
        
        return response
        
    except Exception as e:
        logger.error(f"Error accessing organizer portal: {str(e)}", exc_info=True)
        return JSONResponse(
            content={
                "success": False,
                "message": f"Internal server error: {str(e)}"
            },
            status_code=500
        )

# Admin Management Endpoints
@router.post("/admin/grant-access/{faculty_employee_id}")
async def grant_organizer_access(
    faculty_employee_id: str,
    request: Request,
    assigned_events: Optional[List[str]] = None,
    admin: AdminUser = Depends(require_admin)
):
    """Admin endpoint to grant organizer access to faculty"""
    try:
        # Only super admins can grant organizer access
        if admin.role != AdminRole.SUPER_ADMIN:
            raise HTTPException(status_code=403, detail="Super admin access required")
        
        # Check if faculty exists
        faculty = await DatabaseOperations.find_one(
            "faculties",
            {"employee_id": faculty_employee_id, "is_active": True}
        )
        
        if not faculty:
            raise HTTPException(status_code=404, detail="Faculty not found or inactive")
        
        # Grant organizer access
        success = await OrganizerAccessManager.grant_organizer_access(
            faculty_employee_id, assigned_events or []
        )
        
        if success:
            return JSONResponse(
                content={
                    "success": True,
                    "message": f"Organizer access granted to {faculty['full_name']}"
                }
            )
        else:
            return JSONResponse(
                content={
                    "success": False,
                    "message": "Failed to grant organizer access"
                },
                status_code=500
            )
            
    except Exception as e:
        logger.error(f"Error granting organizer access: {str(e)}")
        return JSONResponse(
            content={
                "success": False,
                "message": "Internal server error"
            },
            status_code=500
        )

@router.post("/admin/revoke-access/{faculty_employee_id}")
async def revoke_organizer_access(
    faculty_employee_id: str,
    request: Request,
    admin: AdminUser = Depends(require_admin)
):
    """Admin endpoint to revoke organizer access from faculty"""
    try:
        # Only super admins can revoke organizer access
        if admin.role != AdminRole.SUPER_ADMIN:
            raise HTTPException(status_code=403, detail="Super admin access required")
        
        # Revoke organizer access
        success = await OrganizerAccessManager.revoke_organizer_access(faculty_employee_id)
        
        if success:
            return JSONResponse(
                content={
                    "success": True,
                    "message": "Organizer access revoked successfully"
                }
            )
        else:
            return JSONResponse(
                content={
                    "success": False,
                    "message": "Failed to revoke organizer access"
                },
                status_code=500
            )
            
    except Exception as e:
        logger.error(f"Error revoking organizer access: {str(e)}")
        return JSONResponse(
            content={
                "success": False,
                "message": "Internal server error"
            },
            status_code=500
        )

@router.get("/admin/requests")
async def get_organizer_requests(request: Request, admin: AdminUser = Depends(require_admin)):
    """Get all pending organizer access requests (Super Admin only)"""
    try:
        # Only super admins can view requests
        if admin.role != AdminRole.SUPER_ADMIN:
            raise HTTPException(status_code=403, detail="Super admin access required")
        
        # Get all pending requests
        requests = await DatabaseOperations.find_many(
            "organizer_requests",
            {"status": "pending"},
            sort_by="requested_at",
            sort_order=-1
        )
        
        return JSONResponse(
            content={
                "success": True,
                "data": {
                    "requests": requests,
                    "total": len(requests)
                }
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting organizer requests: {str(e)}")
        return JSONResponse(
            content={
                "success": False,
                "message": "Internal server error"
            },
            status_code=500
        )
