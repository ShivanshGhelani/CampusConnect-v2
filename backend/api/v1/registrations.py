"""
Professional Event Registration & Attendance API
================================================
Clean API endpoints for event registration and attendance operations.
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from services.event_registration_service import event_registration_service
from services.event_attendance_service import event_attendance_service
from dependencies.auth import get_current_student, get_current_admin

router = APIRouter(prefix="/registrations", tags=["registrations"])

# REMOVED: Redundant /individual/{event_id} endpoint 
# Frontend uses /api/v1/client/registration/register instead

@router.get("/status/{event_id}")
async def get_registration_status(
    event_id: str,
    current_user=Depends(get_current_student)
):
    """Get registration status for current student"""
    result = await event_registration_service.get_registration_status(
        enrollment_no=current_user.enrollment_no,
        event_id=event_id
    )
    return result

@router.post("/attendance/{event_id}/mark")
async def mark_attendance(
    event_id: str,
    attendance_data: Dict[str, Any],
    current_user=Depends(get_current_student)
):
    """Mark attendance for current student"""
    enrollment_no = current_user.enrollment_no
    
    # Get registration to determine strategy
    reg_status = await event_registration_service.get_registration_status(enrollment_no, event_id)
    if not reg_status["success"]:
        raise HTTPException(status_code=404, detail="Student not registered for this event")
    
    strategy = reg_status["attendance_structure"]["strategy"]
    
    # Route to appropriate attendance marking method
    if strategy == "single_mark":
        result = await event_attendance_service.mark_single_attendance(
            enrollment_no=enrollment_no,
            event_id=event_id,
            marked_by=enrollment_no,
            marking_method="student_self"
        )
    else:
        result = {"success": False, "message": f"Strategy {strategy} not implemented yet"}
    
    return result

@router.get("/event/{event_id}/registrations")
async def get_event_registrations(
    event_id: str,
    current_user=Depends(get_current_admin)
):
    """Get all registrations for an event (admin only)"""
    result = await event_registration_service.get_event_registrations(event_id=event_id)
    return result

@router.get("/event/{event_id}/recent")
async def get_recent_registrations(
    event_id: str,
    limit: int = 10
):
    """Get recent registrations for an event (public endpoint for EventDetail.jsx)"""
    # Import the enhanced service for recent registrations
    from scripts.enhanced_registration_service import enhanced_registration_service
    
    result = await enhanced_registration_service.get_recent_registrations(
        event_id=event_id,
        limit=limit
    )
    return result
