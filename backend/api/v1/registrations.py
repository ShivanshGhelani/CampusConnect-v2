"""
Registration API Routes - Event Lifecycle Compliant
===================================================
Simple API endpoints following event_lifecycle.txt specifications
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List, Optional
from datetime import datetime
from services.registration_service import SimpleRegistrationService
from models.registration import CreateRegistrationRequest, RegistrationResponse, DashboardData
from dependencies.auth import get_current_student, get_current_faculty, get_current_admin

router = APIRouter(prefix="/api/v1/registrations", tags=["registrations"])

# Initialize service
registration_service = SimpleRegistrationService()

# Student Registration Endpoints
@router.post("/individual/{event_id}")
async def register_individual(
    event_id: str,
    registration_data: Dict[str, Any] = None,
    current_user=Depends(get_current_student)
) -> RegistrationResponse:
    """Register individual student for event"""
    try:
        request = CreateRegistrationRequest(
            event_id=event_id,
            registration_type="individual",
            additional_data=registration_data or {}
        )
        
        result = await registration_service.register_student(
            current_user.enrollment_no,
            request
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/team/{event_id}")
async def register_team(
    event_id: str,
    team_data: Dict[str, Any],
    current_user=Depends(get_current_student)
) -> RegistrationResponse:
    """Register team for event"""
    try:
        request = CreateRegistrationRequest(
            event_id=event_id,
            registration_type="team",
            team_info=team_data
        )
        
        result = await registration_service.register_student(
            current_user.enrollment_no,
            request
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Team registration failed: {str(e)}"
        )

@router.get("/status/{event_id}")
async def get_registration_status(
    event_id: str,
    current_user=Depends(get_current_student)
) -> Dict[str, Any]:
    """Get registration status for event"""
    try:
        result = await registration_service.get_registration_status(
            current_user.enrollment_no,
            event_id
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get registration status: {str(e)}"
        )

@router.delete("/cancel/{event_id}")
async def cancel_registration(
    event_id: str,
    current_user=Depends(get_current_student)
) -> RegistrationResponse:
    """Cancel registration for event"""
    try:
        # Implement cancellation logic
        registration_id = f"REG_{current_user.enrollment_no}_{event_id}"
        
        # Update status to cancelled
        from database.operations import DatabaseOperations
        db = DatabaseOperations()
        
        result = await db.update_one(
            "student_registrations",
            {"_id": registration_id},
            {"$set": {
                "registration.status": "cancelled",
                "updated_at": datetime.utcnow()
            }}
        )
        
        if result:
            return RegistrationResponse(
                success=True,
                message="Registration cancelled successfully"
            )
        else:
            return RegistrationResponse(
                success=False,
                message="Failed to cancel registration"
            )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel registration: {str(e)}"
        )

# Event Lifecycle Endpoints
@router.post("/attendance/{event_id}/mark")
async def mark_attendance(
    event_id: str,
    attendance_data: Dict[str, Any] = None,
    current_user=Depends(get_current_student)
) -> RegistrationResponse:
    """Mark attendance for event"""
    try:
        result = await registration_service.mark_attendance(
            current_user.enrollment_no,
            event_id,
            attendance_data or {}
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark attendance: {str(e)}"
        )

@router.post("/feedback/{event_id}/submit")
async def submit_feedback(
    event_id: str,
    feedback_data: Dict[str, Any],
    current_user=Depends(get_current_student)
) -> RegistrationResponse:
    """Submit feedback for event"""
    try:
        result = await registration_service.submit_feedback(
            current_user.enrollment_no,
            event_id,
            feedback_data
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit feedback: {str(e)}"
        )

# Dashboard Endpoints
@router.get("/student/dashboard")
async def get_student_dashboard(
    current_user=Depends(get_current_student)
) -> DashboardData:
    """Get student dashboard data"""
    try:
        result = await registration_service.get_student_dashboard(
            current_user.enrollment_no
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get student dashboard: {str(e)}"
        )

@router.get("/organizer/event/{event_id}/dashboard")
async def get_organizer_dashboard(
    event_id: str,
    current_user=Depends(get_current_faculty)
) -> DashboardData:
    """Get organizer dashboard data for specific event"""
    try:
        result = await registration_service.get_organizer_dashboard(event_id)
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get organizer dashboard: {str(e)}"
        )

# Admin Analytics Endpoints
@router.get("/event/{event_id}/registrations")
async def get_event_registrations(
    event_id: str,
    skip: int = 0,
    limit: int = 100,
    current_user=Depends(get_current_faculty)
) -> Dict[str, Any]:
    """Get all registrations for an event"""
    try:
        from database.operations import DatabaseOperations
        db = DatabaseOperations()
        
        registrations = await db.find_many(
            "student_registrations",
            {"event.event_id": event_id},
            skip=skip,
            limit=limit
        )
        
        total_count = await db.count_documents(
            "student_registrations",
            {"event.event_id": event_id}
        )
        
        return {
            "registrations": registrations,
            "total_count": total_count,
            "skip": skip,
            "limit": limit
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get event registrations: {str(e)}"
        )

@router.post("/attendance/{event_id}/mark-bulk")
async def mark_bulk_attendance(
    event_id: str,
    attendance_list: List[Dict[str, Any]],
    current_user=Depends(get_current_faculty)
) -> Dict[str, Any]:
    """Mark attendance for multiple students"""
    try:
        results = []
        
        for attendance_data in attendance_list:
            enrollment_no = attendance_data.get("enrollment_no")
            if enrollment_no:
                result = await registration_service.mark_attendance(
                    enrollment_no,
                    event_id,
                    attendance_data
                )
                results.append({
                    "enrollment_no": enrollment_no,
                    "success": result.success,
                    "message": result.message
                })
        
        return {
            "success": True,
            "message": f"Processed {len(results)} attendance records",
            "results": results
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark bulk attendance: {str(e)}"
        )

@router.get("/statistics/{event_id}")
async def get_event_statistics(
    event_id: str,
    current_user=Depends(get_current_faculty)
) -> Dict[str, Any]:
    """Get event statistics"""
    try:
        from database.operations import DatabaseOperations
        db = DatabaseOperations()
        
        registrations = await db.find_many(
            "student_registrations",
            {"event.event_id": event_id}
        )
        
        stats = registration_service._calculate_event_stats(registrations)
        
        return {
            "event_id": event_id,
            "statistics": stats.dict(),
            "last_updated": datetime.utcnow()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get event statistics: {str(e)}"
        )
