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
import logging

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
                "updated_at": datetime.utcnow()
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
                "updated_at": datetime.utcnow()
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

# Portal Access Endpoints (from organizer_portal.py)
@router.get("")
async def organizer_root_no_slash(request: Request, admin: AdminUser = Depends(require_admin)):
    """Redirect root organizer path to React frontend"""
    if admin.role != AdminRole.ORGANIZER_ADMIN:
        raise HTTPException(status_code=403, detail="Organizer access required")
    
    return RedirectResponse(url="http://localhost:3000/organizer", status_code=303)

@router.get("/")
async def organizer_root_with_slash(request: Request, admin: AdminUser = Depends(require_admin)):
    """Redirect root organizer path to React frontend"""
    if admin.role != AdminRole.ORGANIZER_ADMIN:
        raise HTTPException(status_code=403, detail="Organizer access required")
    
    return RedirectResponse(url="http://localhost:3000/organizer", status_code=303)

@router.get("/dashboard")
async def organizer_dashboard(request: Request, admin: AdminUser = Depends(require_admin)):
    """Redirect to organizer dashboard"""
    if admin.role != AdminRole.ORGANIZER_ADMIN:
        raise HTTPException(status_code=403, detail="Organizer access required")
    
    return RedirectResponse(url="http://localhost:3000/organizer/dashboard", status_code=303)

@router.get("/events")
async def organizer_events(request: Request, admin: AdminUser = Depends(require_admin)):
    """Redirect to organizer events page"""
    if admin.role != AdminRole.ORGANIZER_ADMIN:
        raise HTTPException(status_code=403, detail="Organizer access required")
    
    return RedirectResponse(url="http://localhost:3000/organizer/events", status_code=303)

# Organizer Access Management Endpoints (from unified_organizer.py)
@router.post("/request-access")
async def request_organizer_access(request: Request, faculty: Faculty = Depends(require_faculty_login)):
    """Faculty member requests organizer access"""
    try:
        # Check if faculty already has organizer access
        if faculty.is_organizer:
            return JSONResponse(
                content={
                    "success": False,
                    "message": "You already have organizer access"
                },
                status_code=400
            )
        
        # Create a notification for super admins to approve
        notification_data = {
            "type": "organizer_access_request",
            "faculty_employee_id": faculty.employee_id,
            "faculty_name": faculty.full_name,
            "faculty_email": faculty.email,
            "faculty_department": faculty.department,
            "requested_at": datetime.utcnow(),
            "status": "pending",
            "message": f"Faculty {faculty.full_name} ({faculty.employee_id}) from {faculty.department} department has requested organizer access."
        }
        
        # Store the request in a notifications/requests collection
        await DatabaseOperations.insert_one("organizer_requests", notification_data)
        
        return JSONResponse(
            content={
                "success": True,
                "message": "Your organizer access request has been submitted. Super admins will review and approve it."
            }
        )
        
    except Exception as e:
        logger.error(f"Error in organizer access request: {str(e)}")
        return JSONResponse(
            content={
                "success": False,
                "message": "Internal server error"
            },
            status_code=500
        )

@router.get("/access-status")
async def get_organizer_access_status(request: Request, faculty: Faculty = Depends(require_faculty_login)):
    """Get current organizer access status for faculty"""
    try:
        return JSONResponse(
            content={
                "success": True,
                "data": {
                    "is_organizer": faculty.is_organizer,
                    "has_organizer_access": faculty.is_organizer,
                    "employee_id": faculty.employee_id,
                    "full_name": faculty.full_name,
                    "assigned_events": faculty.assigned_events,
                    "organizer_permissions": faculty.organizer_permissions,
                    "can_access_organizer_portal": faculty.is_organizer
                }
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting organizer status: {str(e)}")
        return JSONResponse(
            content={
                "success": False,
                "message": "Internal server error"
            },
            status_code=500
        )

@router.post("/access-portal")
async def access_organizer_portal(request: Request, faculty: Faculty = Depends(require_faculty_login)):
    """Faculty member accesses organizer portal (creates admin session)"""
    try:
        logger.info(f"Faculty {faculty.employee_id} attempting to access organizer portal")
        
        # Check if faculty has organizer access (either is_organizer flag or organizer_permissions)
        has_organizer_access = (
            getattr(faculty, 'is_organizer', False) or 
            len(getattr(faculty, 'organizer_permissions', [])) > 0
        )
        
        if not has_organizer_access:
            logger.warning(f"Faculty {faculty.employee_id} does not have organizer access")
            return JSONResponse(
                content={
                    "success": False,
                    "message": "You do not have organizer access. Please request access first."
                },
                status_code=403
            )
        
        # Create organizer admin session for authenticated faculty
        logger.info(f"Creating organizer admin session for authenticated faculty {faculty.employee_id}")
        
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
        current_time = datetime.utcnow()
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
        
        logger.info(f"Successfully authenticated {faculty.employee_id} as organizer admin")
        
        return JSONResponse(
            content={
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
        )
        
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

@router.get("/dashboard-stats")
async def get_organizer_dashboard_stats(request: Request, admin: AdminUser = Depends(require_admin)):
    """Get dashboard statistics for organizer portal"""
    try:
        # Only organizer admins can access this
        if admin.role != AdminRole.ORGANIZER_ADMIN:
            raise HTTPException(status_code=403, detail="Organizer access required")
        
        # Get assigned events
        assigned_event_ids = admin.assigned_events or []
        
        # Count statistics for assigned events
        total_events = len(assigned_event_ids)
        
        # Count registrations for assigned events
        total_registrations = 0
        if assigned_event_ids:
            registrations = await DatabaseOperations.find_many(
                "student_registrations",
                {"event.event_id": {"$in": assigned_event_ids}}
            )
            total_registrations = len(registrations)
        
        # Count certificates issued for assigned events
        total_certificates = 0
        if assigned_event_ids:
            certificates = await DatabaseOperations.find_many(
                "certificates",
                {"event_id": {"$in": assigned_event_ids}}
            )
            total_certificates = len(certificates)
        
        return JSONResponse(
            content={
                "success": True,
                "data": {
                    "total_events": total_events,
                    "total_registrations": total_registrations,
                    "total_certificates": total_certificates,
                    "assigned_events": assigned_event_ids
                }
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting organizer dashboard stats: {str(e)}")
        return JSONResponse(
            content={
                "success": False,
                "message": "Internal server error"
            },
            status_code=500
        )
