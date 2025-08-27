"""
Client Registration API Routes
Handles event registration for students and faculty via client interface
"""
import logging
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
from pydantic import BaseModel
from dependencies.auth import get_current_student, get_current_faculty, get_current_user
from services.event_registration_service import event_registration_service

logger = logging.getLogger(__name__)
router = APIRouter()

class RegistrationRequest(BaseModel):
    event_id: str
    registration_type: str = "individual"  # "individual" or "team"
    student_data: Dict[str, Any] = {}
    team_data: Dict[str, Any] = {}
    action: str = "register"  # "register", "add_participant", "remove_participant", etc.

@router.post("/register")
async def register_for_event(
    request: RegistrationRequest,
    current_user=Depends(get_current_user)
):
    """
    Universal registration endpoint for events
    Handles individual registration and team registration
    """
    try:
        logger.info(f"Registration request: {request.action} for event {request.event_id} by user {current_user.enrollment_no if hasattr(current_user, 'enrollment_no') else 'unknown'}")
        
        # Get user identifier - only students can register for events
        if not hasattr(current_user, 'enrollment_no'):
            raise HTTPException(status_code=400, detail="Only students can register for events")
        
        user_id = current_user.enrollment_no
        
        # Handle different registration actions
        if request.action == "register":
            if request.registration_type == "individual":
                # Individual registration - FIXED: Pass student_data as additional_data for ID generation
                result = await event_registration_service.register_individual(
                    enrollment_no=user_id,
                    event_id=request.event_id,
                    additional_data=request.student_data  # Changed to use student_data
                )
            elif request.registration_type == "team":
                # Team registration - FIXED: Pass student_data as additional_data for ID generation
                result = await event_registration_service.register_team(
                    team_leader_enrollment=user_id,
                    event_id=request.event_id,
                    team_data=request.team_data,
                    additional_data=request.student_data  # Changed to use student_data
                )
            else:
                raise HTTPException(status_code=400, detail="Invalid registration type")
                
        else:
            # For now, only basic registration is supported
            # Team management features can be added later
            raise HTTPException(status_code=400, detail=f"Action '{request.action}' not yet implemented")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@router.get("/status/{event_id}")
async def get_registration_status(
    event_id: str,
    current_user=Depends(get_current_user)
):
    """Get registration status for current user"""
    try:
        # Only students have registration status
        if not hasattr(current_user, 'enrollment_no'):
            return {"success": False, "message": "Only students can have registration status"}
        
        result = await event_registration_service.get_registration_status(
            enrollment_no=current_user.enrollment_no,
            event_id=event_id
        )
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting registration status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get registration status: {str(e)}")

@router.get("/event/{event_id}/status")
async def get_registration_status_alt(
    event_id: str,
    current_user=Depends(get_current_user)
):
    """Get registration status for current user (alternative URL pattern)"""
    # This is just a duplicate of the above to match frontend expectations
    return await get_registration_status(event_id, current_user)

@router.delete("/cancel/{event_id}")
async def cancel_registration(
    event_id: str,
    current_user=Depends(get_current_user)
):
    """Cancel registration for an event"""
    try:
        # Only students can cancel registrations
        if not hasattr(current_user, 'enrollment_no'):
            raise HTTPException(status_code=400, detail="Only students can cancel registrations")
        
        logger.info(f"🔍 API: Starting cancel registration for {current_user.enrollment_no} -> {event_id}")
        
        result = await event_registration_service.cancel_registration(
            enrollment_no=current_user.enrollment_no,
            event_id=event_id
        )
        
        logger.info(f"🔍 API: Cancel registration completed: {result}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling registration: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to cancel registration: {str(e)}")

@router.get("/my-registrations")
async def get_my_registrations(
    current_user=Depends(get_current_user)
):
    """Get all registrations for current user"""
    try:
        # Only students have registrations
        if not hasattr(current_user, 'enrollment_no'):
            return {"success": True, "registrations": [], "message": "No registrations available for this user type"}
        
        # Use get_event_registrations method with student filter
        result = await event_registration_service.get_event_registrations(
            event_id=None,  # Get all events for this student
            filters={"enrollment_no": current_user.enrollment_no}
        )
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user registrations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get registrations: {str(e)}")
