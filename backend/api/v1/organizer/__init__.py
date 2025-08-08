"""
Organizer API endpoints for Faculty members acting as event organizers
"""
from fastapi import APIRouter, Request, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from typing import Optional, List
from datetime import datetime
import logging

from models.faculty import Faculty
from models.admin_user import AdminUser, AdminRole
from dependencies.auth import require_faculty_login, require_admin
from database.operations import DatabaseOperations
from core.permissions import PermissionManager

router = APIRouter(prefix="/api/v1/organizer", tags=["organizer"])
logger = logging.getLogger(__name__)

class OrganizerRequest:
    """Helper class for organizer-related operations"""
    
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
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only super admins can grant organizer access"
            )
        
        # Check if faculty exists
        faculty = await DatabaseOperations.find_one(
            "faculties",
            {"employee_id": faculty_employee_id, "is_active": True}
        )
        
        if not faculty:
            return JSONResponse(
                content={
                    "success": False,
                    "message": "Faculty not found or inactive"
                },
                status_code=404
            )
        
        # Grant organizer access
        success = await OrganizerRequest.grant_organizer_access(
            faculty_employee_id, assigned_events or []
        )
        
        if success:
            # Update any pending request to approved
            await DatabaseOperations.update_one(
                "organizer_requests",
                {
                    "faculty_employee_id": faculty_employee_id,
                    "status": "pending"
                },
                {
                    "$set": {
                        "status": "approved",
                        "approved_by": admin.username,
                        "approved_at": datetime.utcnow()
                    }
                }
            )
            
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
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only super admins can revoke organizer access"
            )
        
        # Revoke organizer access
        success = await OrganizerRequest.revoke_organizer_access(faculty_employee_id)
        
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
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only super admins can view organizer requests"
            )
        
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

@router.get("/dashboard/stats")
async def get_organizer_dashboard_stats(request: Request, admin: AdminUser = Depends(require_admin)):
    """Get dashboard statistics for organizer portal"""
    try:
        # Only organizer admins can access this
        if admin.role != AdminRole.ORGANIZER_ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Organizer access required"
            )
        
        # Get assigned events
        assigned_event_ids = admin.assigned_events or []
        
        # Count statistics for assigned events
        total_events = len(assigned_event_ids)
        
        # Count registrations for assigned events
        total_registrations = 0
        if assigned_event_ids:
            registrations = await DatabaseOperations.find_many(
                "event_registrations",
                {"event_id": {"$in": assigned_event_ids}}
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
