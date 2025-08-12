# CampusConnect - Registration API Endpoints
# Phase 1.5: Enhanced registration endpoints with multiple team support

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime

from services.enhanced_student_registration_service import EnhancedStudentRegistrationService
from dependencies.auth import get_current_user
from core.logger import get_logger

logger = get_logger(__name__)

# Initialize router
registration_router = APIRouter(
    prefix="/api/v1/registrations",
    tags=["Student Registrations"]
)

# Pydantic models for request validation

class IndividualRegistrationRequest(BaseModel):
    """Request model for individual student registration"""
    enrollment_no: str = Field(..., description="Student enrollment number", example="22BEIT30043")
    event_id: str = Field(..., description="Event identifier", example="EVT001")
    
    @validator('enrollment_no')
    def validate_enrollment_no(cls, v):
        if not v or len(v.strip()) < 5:
            raise ValueError('Valid enrollment number is required')
        return v.strip().upper()
    
    @validator('event_id')
    def validate_event_id(cls, v):
        if not v or len(v.strip()) < 3:
            raise ValueError('Valid event ID is required')
        return v.strip()

class TeamRegistrationRequest(BaseModel):
    """Request model for team registration"""
    team_leader_enrollment: str = Field(..., description="Team leader enrollment number")
    event_id: str = Field(..., description="Event identifier")
    team_name: str = Field(..., description="Team name", example="CodeMasters")
    member_enrollments: List[str] = Field(..., description="List of team member enrollments")
    
    @validator('team_leader_enrollment')
    def validate_leader_enrollment(cls, v):
        if not v or len(v.strip()) < 5:
            raise ValueError('Valid team leader enrollment is required')
        return v.strip().upper()
    
    @validator('team_name')
    def validate_team_name(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError('Team name must be at least 2 characters')
        if len(v.strip()) > 50:
            raise ValueError('Team name must be less than 50 characters')
        return v.strip()
    
    @validator('member_enrollments')
    def validate_member_enrollments(cls, v):
        if not v or len(v) == 0:
            raise ValueError('At least one team member is required')
        if len(v) > 10:
            raise ValueError('Maximum 10 team members allowed')
        
        # Clean and validate each enrollment
        cleaned_enrollments = []
        for enrollment in v:
            if not enrollment or len(enrollment.strip()) < 5:
                raise ValueError(f'Invalid enrollment number: {enrollment}')
            cleaned_enrollments.append(enrollment.strip().upper())
        
        # Check for duplicates
        if len(cleaned_enrollments) != len(set(cleaned_enrollments)):
            raise ValueError('Duplicate team members not allowed')
        
        return cleaned_enrollments

class RegistrationCancellationRequest(BaseModel):
    """Request model for registration cancellation"""
    enrollment_no: str = Field(..., description="Student enrollment number")
    event_id: str = Field(..., description="Event identifier")
    reason: Optional[str] = Field("User requested", description="Cancellation reason")

# API Endpoints

@registration_router.post("/individual", status_code=status.HTTP_201_CREATED)
async def register_individual_student(
    request: IndividualRegistrationRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Register individual student for an event
    
    - **enrollment_no**: Student's enrollment number
    - **event_id**: Target event identifier
    
    Returns registration details and confirmation
    """
    try:
        logger.info(f"Individual registration request: {request.enrollment_no} -> {request.event_id}")
        
        # Initialize registration service
        registration_service = EnhancedStudentRegistrationService()
        
        # Process registration
        result = await registration_service.register_individual_student(
            request.enrollment_no, 
            request.event_id
        )
        
        if result["success"]:
            logger.info(f"Individual registration successful: {result['registration_id']}")
            return JSONResponse(
                status_code=status.HTTP_201_CREATED,
                content={
                    "success": True,
                    "message": result["message"],
                    "registration_id": result["registration_id"],
                    "data": result["registration_data"]
                }
            )
        else:
            logger.warning(f"Individual registration failed: {result['message']}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "success": False,
                    "message": result["message"]
                }
            )
            
    except ValueError as ve:
        logger.error(f"Validation error: {str(ve)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"success": False, "message": str(ve)}
        )
    except Exception as e:
        logger.error(f"Individual registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": "Registration failed due to system error"}
        )

@registration_router.post("/team", status_code=status.HTTP_201_CREATED)
async def register_team(
    request: TeamRegistrationRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Register team for an event
    
    - **team_leader_enrollment**: Team leader's enrollment number
    - **event_id**: Target event identifier
    - **team_name**: Name of the team
    - **member_enrollments**: List of team member enrollments
    
    Returns team registration details and member confirmations
    """
    try:
        logger.info(f"Team registration request: {request.team_name} -> {request.event_id}")
        
        # Prepare team data
        team_data = {
            "team_name": request.team_name,
            "member_enrollments": request.member_enrollments,
            "team_leader": request.team_leader_enrollment
        }
        
        # Initialize registration service
        registration_service = EnhancedStudentRegistrationService()
        
        # Process team registration
        result = await registration_service.register_team(
            request.team_leader_enrollment,
            request.event_id,
            team_data
        )
        
        if result["success"]:
            logger.info(f"Team registration successful: {result['team_id']}")
            return JSONResponse(
                status_code=status.HTTP_201_CREATED,
                content={
                    "success": True,
                    "message": result["message"],
                    "team_id": result["team_id"],
                    "data": result["team_data"]
                }
            )
        else:
            logger.warning(f"Team registration failed: {result['message']}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "success": False,
                    "message": result["message"]
                }
            )
            
    except ValueError as ve:
        logger.error(f"Team validation error: {str(ve)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"success": False, "message": str(ve)}
        )
    except Exception as e:
        logger.error(f"Team registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": "Team registration failed due to system error"}
        )

@registration_router.get("/status/{enrollment_no}/{event_id}")
async def get_registration_status(
    enrollment_no: str,
    event_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """
    Get comprehensive registration status for student in event
    
    - **enrollment_no**: Student's enrollment number
    - **event_id**: Event identifier
    
    Returns complete registration, attendance, and certificate status
    """
    try:
        logger.info(f"Registration status request: {enrollment_no} -> {event_id}")
        
        # Initialize registration service
        registration_service = EnhancedStudentRegistrationService()
        
        # Get status
        status_data = await registration_service.get_registration_status(
            enrollment_no.upper().strip(),
            event_id.strip()
        )
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "success": True,
                "data": status_data
            }
        )
        
    except Exception as e:
        logger.error(f"Status retrieval error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": "Failed to retrieve registration status"}
        )

@registration_router.delete("/cancel")
async def cancel_registration(
    request: RegistrationCancellationRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Cancel student registration for event
    
    - **enrollment_no**: Student's enrollment number
    - **event_id**: Event identifier
    - **reason**: Optional cancellation reason
    
    Returns cancellation confirmation
    """
    try:
        logger.info(f"Registration cancellation request: {request.enrollment_no} -> {request.event_id}")
        
        # Initialize registration service
        registration_service = EnhancedStudentRegistrationService()
        
        # Process cancellation
        result = await registration_service.cancel_registration(
            request.enrollment_no.upper().strip(),
            request.event_id.strip(),
            request.reason
        )
        
        if result["success"]:
            logger.info(f"Registration cancelled: {result['registration_id']}")
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "success": True,
                    "message": result["message"],
                    "registration_id": result["registration_id"]
                }
            )
        else:
            logger.warning(f"Cancellation failed: {result['message']}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "success": False,
                    "message": result["message"]
                }
            )
            
    except Exception as e:
        logger.error(f"Cancellation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": "Cancellation failed due to system error"}
        )

@registration_router.get("/event/{event_id}/summary")
async def get_event_registration_summary(
    event_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """
    Get registration summary for an event (Admin/Organizer only)
    
    - **event_id**: Event identifier
    
    Returns registration statistics and summary
    """
    try:
        logger.info(f"Event registration summary request: {event_id}")
        
        # Initialize registration service
        registration_service = EnhancedStudentRegistrationService()
        
        # Get event registrations
        from database.operations import DatabaseOperations
        
        registrations = await DatabaseOperations.find_many(
            "student_registrations",
            {
                "event.event_id": event_id.strip(),
                "registration.status": "active"
            }
        )
        
        # Calculate summary statistics
        total_registrations = len(registrations)
        individual_count = len([r for r in registrations if r["registration"]["type"] == "individual"])
        team_registrations = [r for r in registrations if r["registration"]["type"] in ["team_leader", "team_member"]]
        team_count = len(set([r["team"]["team_id"] for r in team_registrations if r.get("team", {}).get("team_id")]))
        
        # Department-wise breakdown
        dept_breakdown = {}
        for reg in registrations:
            dept = reg["student"]["department"]
            dept_breakdown[dept] = dept_breakdown.get(dept, 0) + 1
        
        # Recent registrations (last 24 hours)
        recent_threshold = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        recent_registrations = [
            r for r in registrations 
            if r["registration"]["registered_at"] >= recent_threshold
        ]
        
        summary_data = {
            "event_id": event_id,
            "total_registrations": total_registrations,
            "registration_breakdown": {
                "individual": individual_count,
                "teams": team_count,
                "team_members": len(team_registrations)
            },
            "department_breakdown": dept_breakdown,
            "recent_registrations": len(recent_registrations),
            "attendance_summary": {
                "virtual_confirmed": len([r for r in registrations if r.get("attendance", {}).get("virtual_confirmation", {}).get("confirmed", False)]),
                "physical_present": len([r for r in registrations if r.get("attendance", {}).get("final_status") == "present"]),
                "feedback_submitted": len([r for r in registrations if r.get("feedback", {}).get("submitted", False)])
            },
            "last_updated": datetime.utcnow().isoformat()
        }
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "success": True,
                "data": summary_data
            }
        )
        
    except Exception as e:
        logger.error(f"Event summary error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": "Failed to retrieve event summary"}
        )

@registration_router.get("/student/{enrollment_no}/events")
async def get_student_events(
    enrollment_no: str,
    current_user: Dict = Depends(get_current_user)
):
    """
    Get all events registered by a student
    
    - **enrollment_no**: Student's enrollment number
    
    Returns list of all registered events with status
    """
    try:
        logger.info(f"Student events request: {enrollment_no}")
        
        from database.operations import DatabaseOperations
        
        # Get all registrations for student
        registrations = await DatabaseOperations.find_many(
            "student_registrations",
            {"student.enrollment_no": enrollment_no.upper().strip()},
            sort_by=[("registration.registered_at", -1)]
        )
        
        events_data = []
        for registration in registrations:
            event_data = {
                "event_id": registration["event"]["event_id"],
                "event_name": registration["event"]["event_name"],
                "event_date": registration["event"]["event_date"],
                "organizer": registration["event"]["organizer"],
                "registration_type": registration["registration"]["type"],
                "registration_status": registration["registration"]["status"],
                "registered_at": registration["registration"]["registered_at"].isoformat(),
                "attendance_status": registration.get("attendance", {}).get("final_status", "pending"),
                "feedback_submitted": registration.get("feedback", {}).get("submitted", False),
                "certificate_issued": registration.get("certificate", {}).get("issued", False)
            }
            
            # Add team info if applicable
            if registration["registration"]["type"] in ["team_leader", "team_member"]:
                event_data["team_info"] = {
                    "team_id": registration.get("team", {}).get("team_id"),
                    "team_name": registration.get("team", {}).get("team_name"),
                    "is_leader": registration["registration"]["type"] == "team_leader"
                }
            
            events_data.append(event_data)
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "success": True,
                "data": {
                    "enrollment_no": enrollment_no.upper().strip(),
                    "total_events": len(events_data),
                    "events": events_data
                }
            }
        )
        
    except Exception as e:
        logger.error(f"Student events error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": "Failed to retrieve student events"}
        )
