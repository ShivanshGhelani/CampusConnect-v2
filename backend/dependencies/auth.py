from fastapi import Request, HTTPException, Depends, status
from fastapi.responses import RedirectResponse
from datetime import datetime
from routes.auth import get_current_admin, refresh_admin_session
from models.admin_user import AdminUser, AdminRole
from models.student import Student
from models.faculty import Faculty
from utils.permissions import PermissionManager, require_super_admin
from typing import Optional, Union

async def get_current_student(request: Request) -> Student:
    """Get currently logged in student from session"""
    # print(f"[DEBUG] get_current_student called. Session keys: {list(request.session.keys())}")
    
    student_data = request.session.get("student")
    if not student_data:
        # print("[DEBUG] No student data found in session")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Student not logged in"
        )
    
    # print(f"[DEBUG] Student data found in session. Keys: {list(student_data.keys())}")
    
    # Convert ISO datetime strings back to datetime objects
    for key, value in student_data.items():
        if isinstance(value, str) and ('_at' in key or key == 'last_login'):
            try:
                student_data[key] = datetime.fromisoformat(value) if value else None
            except ValueError:
                student_data[key] = None
                
    return Student(**student_data)

async def get_current_student_optional(request: Request) -> Optional[Student]:
    """Get currently logged in student from session, return None if not logged in"""
    try:
        return await get_current_student(request)
    except HTTPException:
        return None

async def get_current_faculty(request: Request) -> Faculty:
    """Get currently logged in faculty from session"""
    faculty_data = request.session.get("faculty")
    if not faculty_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Faculty not logged in"
        )
    
    # Convert ISO datetime strings back to datetime objects
    for key, value in faculty_data.items():
        if isinstance(value, str) and ('_at' in key or key == 'last_login'):
            try:
                faculty_data[key] = datetime.fromisoformat(value) if value else None
            except ValueError:
                faculty_data[key] = None
                
    return Faculty(**faculty_data)

async def get_current_faculty_optional(request: Request) -> Optional[Faculty]:
    """Get currently logged in faculty from session, return None if not logged in"""
    try:
        return await get_current_faculty(request)
    except HTTPException:
        return None

async def get_current_user(request: Request) -> Union[Student, Faculty, None]:
    """Get currently logged in user (student or faculty), return None if not logged in"""
    # Try student first
    student = await get_current_student_optional(request)
    if student:
        return student
    
    # Try faculty
    faculty = await get_current_faculty_optional(request)
    if faculty:
        return faculty
    
    return None

async def require_admin(request: Request):
    """Dependency to require admin authentication"""
    try:
        admin = await get_current_admin(request)
        return admin
    except HTTPException as e:
        if e.status_code == status.HTTP_401_UNAUTHORIZED:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Admin login required"
            )
        raise e

async def require_admin_with_refresh(request: Request):
    """Dependency to require admin authentication with session refresh for Event Admins"""
    admin = await require_admin(request)
    
    # For Event Admins, refresh session to get latest assigned events
    if admin.role == AdminRole.EVENT_ADMIN:
        admin = await refresh_admin_session(request)
    
    return admin

async def require_super_admin_access(request: Request):
    """Dependency to require super admin authentication"""
    admin = await require_admin(request)
    if admin.role != AdminRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    return admin

async def require_executive_admin_or_higher(request: Request):
    """Dependency to require executive admin or super admin authentication"""
    admin = await require_admin(request)
    if admin.role not in [AdminRole.SUPER_ADMIN, AdminRole.EXECUTIVE_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Executive admin access or higher required"
        )
    return admin

async def require_content_admin_or_higher(request: Request):
    """Dependency to require content admin, executive admin, or super admin authentication"""
    admin = await require_admin(request)
    if admin.role not in [AdminRole.SUPER_ADMIN, AdminRole.EXECUTIVE_ADMIN, AdminRole.CONTENT_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Content admin access or higher required"
        )
    return admin

async def require_event_admin_access(request: Request, event_id: Optional[str] = None):
    """Dependency for event admin access with event assignment check"""
    admin = await require_admin(request)
    
    # For Event Admins, refresh session to get latest assigned events
    if admin.role == AdminRole.EVENT_ADMIN:
        admin = await refresh_admin_session(request)
    
    # Super admins have access to everything
    if admin.role == AdminRole.SUPER_ADMIN:
        return admin
    
    # Executive admins have access to all events for creation
    if admin.role == AdminRole.EXECUTIVE_ADMIN:
        return admin
    
    # Content admins have read-only access to all events
    if admin.role == AdminRole.CONTENT_ADMIN:
        return admin
    
    # Event admins can only access assigned events
    if admin.role == AdminRole.EVENT_ADMIN:
        if event_id and event_id not in admin.assigned_events:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to access this event"
            )
        return admin
    
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Insufficient permissions"
    )

def require_permission(permission: str, event_id: Optional[str] = None):
    """Dependency factory to require specific permission"""
    async def permission_checker(request: Request):
        admin = await require_admin(request)
        if not PermissionManager.has_permission(admin, permission, event_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required: {permission}"
            )
        return admin
    return permission_checker

async def require_student_login(request: Request):
    """Dependency to require student authentication"""
    try:
        student = await get_current_student(request)
        return student
    except HTTPException as e:
        if e.status_code == status.HTTP_401_UNAUTHORIZED:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Student login required"
            )
        raise e

async def require_faculty_login(request: Request):
    """Dependency to require faculty authentication"""
    try:
        faculty = await get_current_faculty(request)
        return faculty
    except HTTPException as e:
        if e.status_code == status.HTTP_401_UNAUTHORIZED:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Faculty login required"
            )
        raise e
