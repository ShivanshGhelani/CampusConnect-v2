"""
Professional Event Registration & Attendance API
================================================
Clean API endpoints for event registration and attendance operations.
Student/Client-facing endpoints only.
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from services.event_registration_service import event_registration_service
from services.event_attendance_service import event_attendance_service
from dependencies.auth import get_current_student

router = APIRouter(prefix="/registrations", tags=["registrations"])

# REMOVED: Redundant /individual/{event_id} endpoint 
# Frontend uses /api/v1/client/registration/register instead

# REMOVED: Duplicate registration status endpoint 
# Use /api/v1/client/registration/status/{event_id} instead

@router.post("/attendance/{event_id}/mark")
async def mark_attendance(
    event_id: str,
    attendance_data: Dict[str, Any],
    current_user=Depends(get_current_student)
):
    """Mark attendance for current student (Student-facing endpoint)"""
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

# REMOVED: /event/{event_id}/registrations - This is admin functionality
# Use /api/v1/admin/participation/participants instead

