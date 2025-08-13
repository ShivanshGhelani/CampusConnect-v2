"""
Admin Participation Management API Endpoints
============================================
RESTful endpoints for admin management of student participations.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime

from services.participation_service import StudentEventParticipationService
from services.integration_service import integration_service
from dependencies.auth import require_admin
from core.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)

# Request/Response Models
class AttendanceMarkRequest(BaseModel):
    enrollment_no: str
    event_id: str
    present: bool
    session_id: Optional[str] = None

class CertificateIssueRequest(BaseModel):
    enrollment_no: str
    event_id: str
    certificate_id: str
    download_url: Optional[str] = None

class BulkAttendanceRequest(BaseModel):
    event_id: str
    attendance_data: List[Dict[str, Any]]  # [{"enrollment_no": "123", "present": true, "session_id": "session1"}]

# Admin Participation Management Endpoints
@router.get("/event/{event_id}/participants")
async def get_event_participants(
    event_id: str,
    admin_user: Dict[str, Any] = Depends(require_admin("admin.events.read"))
):
    """Get all participants for an event"""
    try:
        result = await integration_service.get_event_participants(event_id)
        
        if result["success"]:
            return {
                "success": True,
                "participants": result["participants"],
                "count": result["count"],
                "event_id": event_id
            }
        else:
            raise HTTPException(status_code=500, detail=result["message"])
            
    except Exception as e:
        logger.error(f"Failed to get participants for event {event_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get participants: {str(e)}")

@router.post("/attendance/mark")
async def mark_attendance(
    request: AttendanceMarkRequest,
    admin_user: Dict[str, Any] = Depends(require_admin("admin.events.update"))
):
    """Mark attendance for a student"""
    try:
        result = await integration_service.mark_attendance_for_event(
            enrollment_no=request.enrollment_no,
            event_id=request.event_id,
            present=request.present,
            session_id=request.session_id
        )
        
        if result["success"]:
            logger.info(f"Attendance marked for {request.enrollment_no} in event {request.event_id}: {request.present}")
            return {
                "success": True,
                "message": result["message"],
                "data": result.get("data")
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except Exception as e:
        logger.error(f"Failed to mark attendance: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to mark attendance: {str(e)}")

@router.post("/attendance/bulk-mark")
async def bulk_mark_attendance(
    request: BulkAttendanceRequest,
    admin_user: Dict[str, Any] = Depends(require_admin("admin.events.update"))
):
    """Mark attendance for multiple students"""
    try:
        results = []
        errors = []
        
        for attendance_item in request.attendance_data:
            try:
                result = await integration_service.mark_attendance_for_event(
                    enrollment_no=attendance_item["enrollment_no"],
                    event_id=request.event_id,
                    present=attendance_item.get("present", False),
                    session_id=attendance_item.get("session_id")
                )
                results.append({
                    "enrollment_no": attendance_item["enrollment_no"],
                    "success": result["success"],
                    "message": result["message"]
                })
            except Exception as e:
                errors.append({
                    "enrollment_no": attendance_item["enrollment_no"],
                    "error": str(e)
                })
        
        return {
            "success": True,
            "processed": len(results),
            "errors": len(errors),
            "results": results,
            "error_details": errors
        }
        
    except Exception as e:
        logger.error(f"Bulk attendance marking failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Bulk attendance marking failed: {str(e)}")

@router.post("/certificate/issue")
async def issue_certificate(
    request: CertificateIssueRequest,
    admin_user: Dict[str, Any] = Depends(require_admin("admin.certificates.create"))
):
    """Issue certificate to a student"""
    try:
        result = await integration_service.issue_certificate(
            enrollment_no=request.enrollment_no,
            event_id=request.event_id,
            certificate_data={
                "certificate_id": request.certificate_id,
                "download_url": request.download_url
            }
        )
        
        if result["success"]:
            logger.info(f"Certificate issued to {request.enrollment_no} for event {request.event_id}")
            return {
                "success": True,
                "message": result["message"],
                "data": result.get("data")
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except Exception as e:
        logger.error(f"Failed to issue certificate: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to issue certificate: {str(e)}")

@router.get("/student/{enrollment_no}/participations")
async def get_student_participations(
    enrollment_no: str,
    admin_user: Dict[str, Any] = Depends(require_admin("admin.students.read"))
):
    """Get all participations for a specific student"""
    try:
        result = await integration_service.get_student_registrations(enrollment_no)
        
        if result["success"]:
            return {
                "success": True,
                "student_enrollment": enrollment_no,
                "participations": result["registrations"],
                "count": result["count"]
            }
        else:
            raise HTTPException(status_code=500, detail=result["message"])
            
    except Exception as e:
        logger.error(f"Failed to get student participations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get student participations: {str(e)}")

@router.get("/statistics/event/{event_id}")
async def get_event_statistics(
    event_id: str,
    admin_user: Dict[str, Any] = Depends(require_admin("admin.events.read"))
):
    """Get participation statistics for an event"""
    try:
        result = await integration_service.get_event_participants(event_id)
        
        if result["success"]:
            participants = result["participants"]
            
            # Calculate statistics
            total_registered = len(participants)
            attended = sum(1 for p in participants if p.get("present", False))
            certificates_issued = sum(1 for p in participants if p.get("lifecycle_stage") == "completed")
            
            statistics = {
                "event_id": event_id,
                "total_registered": total_registered,
                "attendance_marked": sum(1 for p in participants if p.get("attendance_marked", False)),
                "attended": attended,
                "absent": sum(1 for p in participants if p.get("attendance_marked", False) and not p.get("present", False)),
                "certificates_issued": certificates_issued,
                "completion_rate": (certificates_issued / total_registered * 100) if total_registered > 0 else 0,
                "attendance_rate": (attended / total_registered * 100) if total_registered > 0 else 0
            }
            
            return {
                "success": True,
                "statistics": statistics
            }
        else:
            raise HTTPException(status_code=500, detail=result["message"])
            
    except Exception as e:
        logger.error(f"Failed to get event statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get event statistics: {str(e)}")
