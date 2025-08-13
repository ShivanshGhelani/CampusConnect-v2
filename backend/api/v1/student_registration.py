"""
Student Registration API Endpoints
==================================
RESTful endpoints for student event registration using unified ParticipationService.
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime

from services.participation_service import StudentEventParticipationService
from services.integration_service import integration_service
from models.participation import CreateParticipation, RegistrationType
from dependencies.auth import get_current_student
from core.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)

# Request/Response Models
class StudentRegistrationRequest(BaseModel):
    event_id: str
    registration_type: str = "individual"
    team_info: Optional[Dict[str, Any]] = None
    additional_data: Optional[Dict[str, Any]] = None

class StudentRegistrationResponse(BaseModel):
    success: bool
    message: str
    participation_id: Optional[str] = None
    data: Optional[Dict[str, Any]] = None

class AttendanceUpdateRequest(BaseModel):
    session_id: Optional[str] = None
    present: bool

# Student Registration Endpoints
@router.post("/register", response_model=StudentRegistrationResponse)
async def register_for_event(
    request: StudentRegistrationRequest,
    current_student: Dict[str, Any] = Depends(get_current_student)
):
    """Register student for an event"""
    try:
        enrollment_no = current_student["enrollment_no"]
        
        # Use integration service for registration
        result = await integration_service.register_student_for_event(
            enrollment_no=enrollment_no,
            event_id=request.event_id,
            registration_data={
                "type": request.registration_type,
                "team_info": request.team_info,
                "additional_data": request.additional_data or {},
                "name": current_student.get("full_name", ""),
                "email": current_student.get("email", ""),
                "phone": current_student.get("mobile_no", ""),
                "department": current_student.get("department", ""),
                "semester": current_student.get("semester", ""),
            }
        )
        
        if result["success"]:
            logger.info(f"Student {enrollment_no} registered for event {request.event_id}")
            return StudentRegistrationResponse(
                success=True,
                message=result["message"],
                participation_id=result.get("participation_id"),
                data=result.get("data")
            )
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except Exception as e:
        logger.error(f"Registration failed for student {current_student.get('enrollment_no')}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@router.get("/my-registrations")
async def get_my_registrations(
    current_student: Dict[str, Any] = Depends(get_current_student)
):
    """Get current student's event registrations"""
    try:
        enrollment_no = current_student["enrollment_no"]
        
        # Use integration service
        result = await integration_service.get_student_registrations(enrollment_no)
        
        if result["success"]:
            return {
                "success": True,
                "registrations": result["registrations"],
                "count": result["count"]
            }
        else:
            raise HTTPException(status_code=500, detail=result["message"])
            
    except Exception as e:
        logger.error(f"Failed to get registrations for student {current_student.get('enrollment_no')}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get registrations: {str(e)}")

@router.delete("/unregister/{event_id}")
async def unregister_from_event(
    event_id: str,
    current_student: Dict[str, Any] = Depends(get_current_student)
):
    """Unregister student from an event"""
    try:
        # This would need to be implemented in the participation service
        # For now, return not implemented
        raise HTTPException(status_code=501, detail="Unregistration not yet implemented")
        
    except Exception as e:
        logger.error(f"Unregistration failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unregistration failed: {str(e)}")

@router.get("/event/{event_id}/status")
async def get_registration_status(
    event_id: str,
    current_student: Dict[str, Any] = Depends(get_current_student)
):
    """Get student's registration status for a specific event"""
    try:
        enrollment_no = current_student["enrollment_no"]
        
        # Get student registrations and filter for this event
        result = await integration_service.get_student_registrations(enrollment_no)
        
        if result["success"]:
            event_registration = next(
                (reg for reg in result["registrations"] if reg["event_id"] == event_id),
                None
            )
            
            return {
                "success": True,
                "registered": event_registration is not None,
                "registration_data": event_registration
            }
        else:
            raise HTTPException(status_code=500, detail=result["message"])
            
    except Exception as e:
        logger.error(f"Failed to get registration status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get registration status: {str(e)}")
