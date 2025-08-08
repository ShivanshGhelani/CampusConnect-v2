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
from routes.auth import authenticate_faculty_as_organizer

router = APIRouter(prefix="/api/v1/faculty/organizer", tags=["faculty-organizer"])
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
        # Check if faculty has organizer access
        if not faculty.is_organizer:
            return JSONResponse(
                content={
                    "success": False,
                    "message": "You don't have organizer access. Please request access from the super admin."
                },
                status_code=403
            )
        
        # Authenticate faculty as organizer admin
        organizer_admin = await authenticate_faculty_as_organizer(
            faculty.employee_id, 
            faculty.password  # Use stored password hash
        )
        
        if not organizer_admin:
            return JSONResponse(
                content={
                    "success": False,
                    "message": "Unable to authenticate as organizer"
                },
                status_code=401
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
        
        return JSONResponse(
            content={
                "success": True,
                "message": "Successfully authenticated as organizer",
                "redirect_url": "/organizer/dashboard",
                "data": {
                    "organizer_name": faculty.full_name,
                    "employee_id": faculty.employee_id,
                    "role": "organizer_admin",
                    "assigned_events": faculty.assigned_events
                }
            }
        )
        
    except Exception as e:
        logger.error(f"Error accessing organizer portal: {str(e)}")
        return JSONResponse(
            content={
                "success": False,
                "message": "Internal server error"
            },
            status_code=500
        )
