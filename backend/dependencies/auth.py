from fastapi import Request, HTTPException, Depends, status
from fastapi.responses import RedirectResponse
from datetime import datetime
from models.admin_user import AdminUser, AdminRole
from models.student import Student
from models.faculty import Faculty
from core.permissions import PermissionManager, require_super_admin
from middleware.auth_middleware import AuthMiddleware
from typing import Optional, Union
import logging

logger = logging.getLogger(__name__)

async def get_current_admin(request: Request) -> AdminUser:
    """Get current authenticated admin from session or token (hybrid auth)"""
    logger.info("get_current_admin called - trying token auth first")
    logger.info(f"Request cookies: {dict(request.cookies)}")
    logger.info(f"Session data keys: {list(request.session.keys()) if hasattr(request, 'session') else 'No session'}")
    
    # Debug: Check Authorization header
    auth_header = request.headers.get("Authorization")
    logger.info(f"Authorization header: {auth_header}")
    
    # First try token-based authentication
    try:
        admin_from_token = await AuthMiddleware.authenticate_user_with_token(request, required_user_type='admin')
        if admin_from_token and isinstance(admin_from_token, AdminUser):
            logger.info(f"Token auth successful for admin: {admin_from_token.username}")
            return admin_from_token
        else:
            logger.info("Token auth returned None or non-AdminUser object")
    except Exception as e:
        logger.info(f"Token auth failed with exception: {str(e)}")
    
    # Fallback to session-based authentication
    logger.info("Trying session-based authentication")
    admin_data = request.session.get('admin')  # Changed from 'admin_user' to 'admin'
    if not admin_data:
        logger.error("No admin data in session")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    try:
        # Convert datetime strings back to datetime objects
        for key, value in admin_data.items():
            if key in ['created_at', 'last_login', 'login_time'] and isinstance(value, str):
                try:
                    admin_data[key] = datetime.fromisoformat(value)
                except ValueError:
                    admin_data[key] = None
        
        return AdminUser(**admin_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session data"
        )

async def refresh_admin_session(request: Request) -> AdminUser:
    """Refresh admin session - get updated data from database for organizers"""
    admin = await get_current_admin(request)
    
    # If this is an organizer admin, refresh from database to get latest assigned events
    if admin.role == AdminRole.ORGANIZER_ADMIN:
        from database.operations import DatabaseOperations
        faculty = await DatabaseOperations.find_one(
            "faculties",
            {
                "employee_id": admin.username
            }
        )
        
        if faculty:
            # Update admin data with latest organizer info
            admin_data = admin.model_dump()
            admin_data["assigned_events"] = faculty.get("assigned_events", [])
            admin_data["permissions"] = faculty.get("organizer_permissions", [])
            admin_data["employee_id"] = faculty.get("employee_id")  # Add employee_id
            
            # Update session
            for key, value in admin_data.items():
                if isinstance(value, datetime):
                    admin_data[key] = value.isoformat()
            
            request.session["admin"] = admin_data
            return AdminUser(**admin_data)
    
    return admin

async def get_current_student(request: Request) -> Student:
    """Get currently logged in student from session or token (hybrid auth)"""
    logger.info("get_current_student called - trying token auth first")
    logger.info(f"Request cookies: {dict(request.cookies)}")
    logger.info(f"Session data keys: {list(request.session.keys()) if hasattr(request, 'session') else 'No session'}")
    
    # Debug: Check Authorization header
    auth_header = request.headers.get("Authorization")
    logger.info(f"Authorization header: {auth_header}")
    
    # First try token-based authentication
    try:
        student_from_token = await AuthMiddleware.authenticate_user_with_token(request, required_user_type='student')
        if student_from_token and isinstance(student_from_token, Student):
            logger.info(f"Token auth successful for student: {student_from_token.enrollment_no}")
            return student_from_token
        else:
            logger.info("Token auth returned None or non-Student object")
    except Exception as e:
        logger.info(f"Token auth failed: {str(e)}")
    
    # Fallback to session-based authentication
    logger.info("Trying session-based authentication")
    student_data = request.session.get("student")
    if not student_data:
        logger.error("No student data in session")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Student not logged in"
        )
    
    logger.info(f"Found student data in session for: {student_data.get('enrollment_no', 'unknown')}")
    
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
    """Get currently logged in faculty from session or token (hybrid auth)"""
    logger.info("get_current_faculty called - trying token auth first")
    logger.info(f"Request cookies: {dict(request.cookies)}")
    logger.info(f"Session data keys: {list(request.session.keys()) if hasattr(request, 'session') else 'No session'}")
    
    # Debug: Check Authorization header
    auth_header = request.headers.get("Authorization")
    logger.info(f"Authorization header: {auth_header}")
    
    # First try token-based authentication
    try:
        faculty_from_token = await AuthMiddleware.authenticate_user_with_token(request, required_user_type='faculty')
        if faculty_from_token and isinstance(faculty_from_token, Faculty):
            logger.info(f"Token auth successful for faculty: {faculty_from_token.employee_id}")
            return faculty_from_token
        else:
            logger.info("Token auth returned None or non-Faculty object")
    except Exception as e:
        logger.info(f"Token auth failed with exception: {str(e)}")
    
    # Fallback to session-based authentication
    logger.info("Trying session-based authentication")
    faculty_data = request.session.get("faculty")
    if not faculty_data:
        logger.error("No faculty data in session")
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
    """Dependency to require admin authentication with session refresh for Organizer Admins"""
    admin = await require_admin(request)
    
    # For Organizer Admins, refresh session to get latest assigned events
    if admin.role == AdminRole.ORGANIZER_ADMIN:
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

async def require_organizer_admin_access(request: Request):
    """Dependency to require organizer admin authentication"""
    admin = await require_admin(request)
    if admin.role not in [AdminRole.SUPER_ADMIN, AdminRole.ORGANIZER_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organizer admin access required"
        )
    return admin

async def require_organizer_admin_or_higher(request: Request):
    """Dependency to require organizer admin, executive admin, or super admin authentication"""
    admin = await require_admin(request)
    if admin.role not in [AdminRole.SUPER_ADMIN, AdminRole.EXECUTIVE_ADMIN, AdminRole.ORGANIZER_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organizer admin access or higher required"
        )
    return admin

async def require_organizer_admin_access(request: Request, event_id: Optional[str] = None):
    """Dependency for organizer admin access with event assignment check"""
    admin = await require_admin(request)
    
    # For Organizer Admins, refresh session to get latest assigned events
    if admin.role == AdminRole.ORGANIZER_ADMIN:
        admin = await refresh_admin_session(request)
    
    # Super admins have access to everything
    if admin.role == AdminRole.SUPER_ADMIN:
        return admin
    
    # Executive admins have access to all events for creation
    if admin.role == AdminRole.EXECUTIVE_ADMIN:
        return admin
    
    # Organizer admins can only access assigned events
    if admin.role == AdminRole.ORGANIZER_ADMIN:
        if event_id and event_id not in (admin.assigned_events or []):
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

async def get_optional_admin(request: Request) -> Optional[AdminUser]:
    """Get currently logged in admin from session, return None if not logged in"""
    try:
        return await get_current_admin(request)
    except HTTPException:
        return None

async def get_optional_student(request: Request) -> Optional[Student]:
    """Get currently logged in student from session, return None if not logged in"""
    return await get_current_student_optional(request)

async def get_optional_faculty(request: Request) -> Optional[Faculty]:
    """Get currently logged in faculty from session, return None if not logged in"""
    return await get_current_faculty_optional(request)

async def get_current_student_hybrid(request: Request):
    """Hybrid authentication - tries token first, then session fallback"""
    logger.info("get_current_student_hybrid called")
    try:
        result = await get_current_student(request)
        logger.info(f"Hybrid auth successful for student: {result.enrollment_no}")
        return result
    except HTTPException as e:
        logger.error(f"Hybrid auth failed with HTTPException: {e.status_code} - {e.detail}")
        raise
    except Exception as e:
        logger.error(f"Hybrid auth failed with Exception: {str(e)} - {type(e).__name__}")
        logger.error(f"Exception traceback: {e.__class__.__module__}.{e.__class__.__name__}")
        raise

async def require_student_login_hybrid(request: Request):
    """Hybrid dependency to require student authentication (token or session)"""
    return await get_current_student_hybrid(request)

async def get_current_faculty_hybrid(request: Request):
    """Hybrid authentication for faculty - tries token first, then session fallback"""
    return await get_current_faculty(request)

async def require_faculty_login_hybrid(request: Request):
    """Hybrid dependency to require faculty authentication (token or session)"""
    return await get_current_faculty_hybrid(request)
