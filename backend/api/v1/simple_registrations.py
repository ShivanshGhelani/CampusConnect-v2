"""
Simple Registration API Endpoints
=================================
Implements clean, fast API endpoints as specified in event_lifecycle.txt

These endpoints provide:
- Simple, intuitive URL structure
- Fast response times (target: under 2 seconds)
- Clean request/response format
- Proper error handling
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, Any, Optional
from datetime import datetime

from dependencies.auth import get_current_student, require_admin
from services.simple_registration_service import simple_registration_service
from core.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/registrations", tags=["simple-registrations"])

# ============================================================================
# STUDENT ENDPOINTS (Clean and Simple)
# ============================================================================

@router.post("/individual/{event_id}")
async def register_individual(
    event_id: str,
    registration_data: Dict[str, Any],
    current_user = Depends(get_current_student)
):
    """
    Register individual student for event
    Simple endpoint as specified in event_lifecycle.txt
    """
    try:
        enrollment_no = current_user.get("enrollment_no")
        
        # Add registration type
        registration_data["type"] = "individual"
        
        result = await simple_registration_service.register_student(
            enrollment_no, event_id, registration_data
        )
        
        if result["success"]:
            return {
                "success": True,
                "message": "Registration successful",
                "registration_id": result["registration_id"],
                "event_id": event_id,
                "enrollment_no": enrollment_no
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Individual registration error: {str(e)}")
        raise HTTPException(status_code=500, detail="Registration failed")

@router.post("/team/{event_id}")
async def register_team(
    event_id: str,
    team_data: Dict[str, Any],
    current_user = Depends(get_current_student)
):
    """
    Register team for event (leader registration)
    Simple endpoint as specified in event_lifecycle.txt
    """
    try:
        enrollment_no = current_user.get("enrollment_no")
        
        # Add registration type for team leader
        team_data["type"] = "team_leader"
        
        result = await simple_registration_service.register_student(
            enrollment_no, event_id, team_data
        )
        
        if result["success"]:
            return {
                "success": True,
                "message": "Team registration successful",
                "registration_id": result["registration_id"],
                "event_id": event_id,
                "team_leader": enrollment_no,
                "team_name": team_data.get("team_name")
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Team registration error: {str(e)}")
        raise HTTPException(status_code=500, detail="Team registration failed")

@router.get("/status/{event_id}")
async def get_registration_status(
    event_id: str,
    current_user = Depends(get_current_student)
):
    """
    Get registration status for student and event
    Fast single query as specified in event_lifecycle.txt
    """
    try:
        enrollment_no = current_user.get("enrollment_no")
        
        result = await simple_registration_service.get_registration_status(
            enrollment_no, event_id
        )
        
        if result["success"]:
            return {
                "success": True,
                "event_id": event_id,
                "enrollment_no": enrollment_no,
                "registered": result["registered"],
                "registration": result["registration"]
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Status check error: {str(e)}")
        raise HTTPException(status_code=500, detail="Status check failed")

@router.delete("/cancel/{event_id}")
async def cancel_registration(
    event_id: str,
    current_user = Depends(get_current_student)
):
    """
    Cancel registration for event
    Simple cancellation as specified in event_lifecycle.txt
    """
    try:
        enrollment_no = current_user.get("enrollment_no")
        
        result = await simple_registration_service.cancel_registration(
            enrollment_no, event_id
        )
        
        if result["success"]:
            return {
                "success": True,
                "message": "Registration cancelled successfully",
                "event_id": event_id,
                "enrollment_no": enrollment_no
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cancellation error: {str(e)}")
        raise HTTPException(status_code=500, detail="Cancellation failed")

@router.post("/attendance/{event_id}/mark")
async def mark_attendance(
    event_id: str,
    attendance_data: Dict[str, Any],
    current_user = Depends(get_current_student)
):
    """
    Mark attendance for event
    Simple attendance marking as specified in event_lifecycle.txt
    """
    try:
        enrollment_no = current_user.get("enrollment_no")
        session_type = attendance_data.get("session_type", "physical")
        
        result = await simple_registration_service.mark_attendance(
            enrollment_no, event_id, session_type
        )
        
        if result["success"]:
            return {
                "success": True,
                "message": "Attendance marked successfully",
                "event_id": event_id,
                "enrollment_no": enrollment_no,
                "session_type": session_type
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Attendance marking error: {str(e)}")
        raise HTTPException(status_code=500, detail="Attendance marking failed")

@router.post("/feedback/{event_id}/submit")
async def submit_feedback(
    event_id: str,
    feedback_data: Dict[str, Any],
    current_user = Depends(get_current_student)
):
    """
    Submit feedback for event
    Simple feedback submission as specified in event_lifecycle.txt
    """
    try:
        enrollment_no = current_user.get("enrollment_no")
        rating = feedback_data.get("rating")
        comments = feedback_data.get("comments", "")
        
        if not rating or not isinstance(rating, int) or rating < 1 or rating > 5:
            raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
        
        result = await simple_registration_service.submit_feedback(
            enrollment_no, event_id, rating, comments
        )
        
        if result["success"]:
            return {
                "success": True,
                "message": "Feedback submitted successfully",
                "event_id": event_id,
                "enrollment_no": enrollment_no,
                "rating": rating
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Feedback submission error: {str(e)}")
        raise HTTPException(status_code=500, detail="Feedback submission failed")

# ============================================================================
# ADMIN ENDPOINTS (Simple Analytics)
# ============================================================================

@router.get("/event/{event_id}/registrations")
async def get_event_registrations(
    event_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user = Depends(require_admin)
):
    """
    Get all registrations for event (Admin only)
    Fast query with indexing as specified in event_lifecycle.txt
    """
    try:
        result = await simple_registration_service.get_event_registrations(event_id)
        
        if result["success"]:
            registrations = result["registrations"]
            
            # Apply pagination
            paginated_registrations = registrations[offset:offset+limit]
            
            return {
                "success": True,
                "event_id": event_id,
                "registrations": paginated_registrations,
                "pagination": {
                    "total_count": len(registrations),
                    "limit": limit,
                    "offset": offset,
                    "showing": len(paginated_registrations)
                }
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get registrations error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get registrations")

@router.post("/attendance/{event_id}/mark-bulk")
async def mark_bulk_attendance(
    event_id: str,
    attendance_list: Dict[str, Any],
    current_user = Depends(require_admin)
):
    """
    Mark attendance for multiple students (Admin only)
    Simple bulk operation as specified in event_lifecycle.txt
    """
    try:
        enrollment_numbers = attendance_list.get("enrollment_numbers", [])
        session_type = attendance_list.get("session_type", "physical")
        
        if not enrollment_numbers:
            raise HTTPException(status_code=400, detail="No enrollment numbers provided")
        
        results = []
        success_count = 0
        
        for enrollment_no in enrollment_numbers:
            result = await simple_registration_service.mark_attendance(
                enrollment_no, event_id, session_type
            )
            
            results.append({
                "enrollment_no": enrollment_no,
                "success": result["success"],
                "message": result["message"]
            })
            
            if result["success"]:
                success_count += 1
        
        return {
            "success": True,
            "message": f"Marked attendance for {success_count}/{len(enrollment_numbers)} students",
            "event_id": event_id,
            "session_type": session_type,
            "results": results,
            "summary": {
                "total": len(enrollment_numbers),
                "successful": success_count,
                "failed": len(enrollment_numbers) - success_count
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Bulk attendance error: {str(e)}")
        raise HTTPException(status_code=500, detail="Bulk attendance marking failed")

@router.post("/certificates/{event_id}/issue-bulk")
async def issue_bulk_certificates(
    event_id: str,
    certificate_list: Dict[str, Any],
    current_user = Depends(require_admin)
):
    """
    Issue certificates for multiple students (Admin only)
    Simple bulk operation as specified in event_lifecycle.txt
    """
    try:
        enrollment_numbers = certificate_list.get("enrollment_numbers", [])
        
        if not enrollment_numbers:
            raise HTTPException(status_code=400, detail="No enrollment numbers provided")
        
        results = []
        success_count = 0
        
        for enrollment_no in enrollment_numbers:
            result = await simple_registration_service.issue_certificate(
                enrollment_no, event_id
            )
            
            results.append({
                "enrollment_no": enrollment_no,
                "success": result["success"],
                "message": result["message"],
                "certificate_id": result.get("certificate_id")
            })
            
            if result["success"]:
                success_count += 1
        
        return {
            "success": True,
            "message": f"Issued certificates for {success_count}/{len(enrollment_numbers)} students",
            "event_id": event_id,
            "results": results,
            "summary": {
                "total": len(enrollment_numbers),
                "successful": success_count,
                "failed": len(enrollment_numbers) - success_count
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Bulk certificate issuance error: {str(e)}")
        raise HTTPException(status_code=500, detail="Bulk certificate issuance failed")

@router.get("/statistics/{event_id}")
async def get_event_statistics(
    event_id: str,
    current_user = Depends(require_admin)
):
    """
    Get simple event statistics
    Fast aggregation as specified in event_lifecycle.txt
    """
    try:
        # Get all registrations for the event
        result = await simple_registration_service.get_event_registrations(event_id)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
        
        registrations = result["registrations"]
        
        # Calculate simple statistics
        total_registrations = len(registrations)
        individual_count = len([r for r in registrations if r.get("registration", {}).get("type") == "individual"])
        team_leaders = len([r for r in registrations if r.get("registration", {}).get("type") == "team_leader"])
        team_members = len([r for r in registrations if r.get("registration", {}).get("type") == "team_member"])
        attendance_marked = len([r for r in registrations if r.get("attendance", {}).get("marked")])
        feedback_submitted = len([r for r in registrations if r.get("feedback", {}).get("submitted")])
        certificates_issued = len([r for r in registrations if r.get("certificate", {}).get("issued")])
        
        statistics = {
            "event_id": event_id,
            "total_registrations": total_registrations,
            "individual_count": individual_count,
            "team_count": team_leaders,  # Number of teams = number of team leaders
            "team_members": team_members,
            "attendance_marked": attendance_marked,
            "feedback_submitted": feedback_submitted,
            "certificates_issued": certificates_issued,
            "completion_rates": {
                "attendance_rate": (attendance_marked / total_registrations * 100) if total_registrations > 0 else 0,
                "feedback_rate": (feedback_submitted / total_registrations * 100) if total_registrations > 0 else 0,
                "certificate_rate": (certificates_issued / total_registrations * 100) if total_registrations > 0 else 0
            },
            "last_updated": datetime.utcnow()
        }
        
        return {
            "success": True,
            "statistics": statistics
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Statistics error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get statistics")
