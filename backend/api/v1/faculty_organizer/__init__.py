"""
Faculty Organizer API endpoints
These endpoints handle the transition from faculty to organizer portal
"""
from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import Optional
import logging

from models.faculty import Faculty
from dependencies.auth import require_faculty_login

router = APIRouter(prefix="/faculty/organizer", tags=["faculty-organizer"])
logger = logging.getLogger(__name__)

@router.get("/access-check")
async def check_organizer_access(request: Request, faculty: Faculty = Depends(require_faculty_login)):
    """Check if current faculty member has organizer access"""
    try:
        return JSONResponse(
            content={
                "success": True,
                "data": {
                    "has_organizer_access": faculty.is_organizer,
                    "employee_id": faculty.employee_id,
                    "full_name": faculty.full_name,
                    "assigned_events": faculty.assigned_events if faculty.is_organizer else [],
                    "can_access_organizer_portal": faculty.is_organizer
                }
            }
        )
        
    except Exception as e:
        logger.error(f"Error checking organizer access: {str(e)}")
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
        logger.info(f"Faculty is_organizer status: {getattr(faculty, 'is_organizer', False)}")
        
        # Check if faculty has organizer access
        if not getattr(faculty, 'is_organizer', False):
            logger.warning(f"Faculty {faculty.employee_id} does not have organizer access")
            return JSONResponse(
                content={
                    "success": False,
                    "message": "You don't have organizer access. Please request access from the super admin.",
                    "debug_info": {
                        "employee_id": faculty.employee_id,
                        "is_organizer": getattr(faculty, 'is_organizer', False),
                        "assigned_events": getattr(faculty, 'assigned_events', [])
                    }
                },
                status_code=403
            )
        
        # Create organizer admin session for authenticated faculty
        logger.info(f"Creating organizer admin session for authenticated faculty {faculty.employee_id}")
        
        # Convert faculty to AdminUser format for organizer portal
        from models.admin_user import AdminUser, AdminRole
        admin_data = {
            "fullname": faculty.full_name,
            "username": faculty.employee_id,
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
            logger.info(f"Successfully created organizer admin for {faculty.employee_id}")
        except Exception as e:
            logger.error(f"Failed to create organizer admin for {faculty.employee_id}: {str(e)}")
            return JSONResponse(
                content={
                    "success": False,
                    "message": "Unable to create organizer session. Please try again or contact support.",
                    "debug_info": {
                        "employee_id": faculty.employee_id,
                        "creation_failed": True,
                        "error": str(e)
                    }
                },
                status_code=500
            )
        
        # Store organizer admin session
        from datetime import datetime
        admin_data = organizer_admin.model_dump()
        current_time = datetime.utcnow()
        
        # Serialize datetime objects
        for key, value in admin_data.items():
            if isinstance(value, datetime):
                admin_data[key] = value.isoformat()
        
        # Add session metadata
        admin_data["login_time"] = current_time.isoformat()
        admin_data["login_type"] = "organizer"
        
        # Store in session
        request.session["admin"] = admin_data
        
        logger.info(f"Successfully authenticated {faculty.employee_id} as organizer admin")
        
        return JSONResponse(
            content={
                "success": True,
                "message": "Successfully authenticated as organizer",
                "redirect_url": "/admin/events",  # Organizer admin should go to events, not dashboard
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
