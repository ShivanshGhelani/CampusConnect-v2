"""
Dynamic Attendance API Endpoints
===============================

RESTful API endpoints for the dynamic attendance management system.
Provides intelligent, event-type-aware attendance functionality.
"""

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from typing import Dict, List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field

from services.event_attendance_service import event_attendance_service
from services.event_registration_service import event_registration_service
from models.dynamic_attendance import AttendanceIntelligenceService
from dependencies.auth import get_current_user
from core.logger import get_logger

# Setup logger
logger = get_logger(__name__)

# Router setup
router = APIRouter(prefix="/api/v1/attendance", tags=["Dynamic Attendance"])

# Request/Response Models
class AttendanceMarkRequest(BaseModel):
    """Request model for marking attendance"""
    student_enrollment: str = Field(..., description="Student enrollment number")
    session_id: Optional[str] = Field(None, description="Specific session ID (auto-detected if not provided)")
    device_fingerprint: Optional[str] = Field(None, description="Device fingerprint for verification")
    location_data: Optional[Dict[str, Any]] = Field(None, description="Location verification data")
    notes: Optional[str] = Field(None, description="Additional notes")

class BulkAttendanceMarkRequest(BaseModel):
    """Request model for bulk attendance marking"""
    student_enrollments: List[str] = Field(..., description="List of student enrollment numbers")
    session_id: Optional[str] = Field(None, description="Specific session ID")
    marked_by: str = Field(..., description="Who is marking the attendance")
    notes: Optional[str] = Field(None, description="Bulk marking notes")

# Initialize service
# Initialize services
attendance_intelligence = AttendanceIntelligenceService()

@router.post("/initialize/{event_id}")
async def initialize_event_attendance(
    event_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """
    Initialize dynamic attendance configuration for an event
    
    - **event_id**: Event identifier
    
    Automatically detects the appropriate attendance strategy based on event metadata
    """
    try:
        logger.info(f"Initializing attendance for event: {event_id}")
        
        result = await attendance_service.initialize_event_attendance(event_id)
        
        if result["success"]:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "success": True,
                    "message": result["message"],
                    "data": {
                        "event_id": event_id,
                        "strategy": result["strategy"],
                        "sessions_count": result.get("sessions_count", 0),
                        "criteria": result.get("criteria", {}),
                        "auto_detected": True
                    }
                }
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "success": False,
                    "message": result["message"],
                    "error_type": "initialization_failed"
                }
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error initializing event attendance: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "message": "Internal server error during attendance initialization",
                "error_type": "server_error"
            }
        )

@router.post("/mark/{event_id}")
async def mark_student_attendance(
    event_id: str,
    request: AttendanceMarkRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Mark attendance for a student with intelligent session detection
    
    - **event_id**: Event identifier
    - **student_enrollment**: Student's enrollment number
    - **session_id**: Optional specific session (auto-detected if not provided)
    - **device_fingerprint**: Device verification data
    - **location_data**: Location verification data
    - **notes**: Additional notes
    
    Returns attendance confirmation with strategy-specific feedback
    """
    try:
        logger.info(f"Marking attendance: {request.student_enrollment} -> {event_id}")
        
        # Prepare attendance metadata
        attendance_metadata = {
            "marked_by": current_user.get("user_id"),
            "marking_method": "api",
            "device_fingerprint": request.device_fingerprint,
            "location_data": request.location_data,
            "notes": request.notes
        }
        
        result = await attendance_service.mark_student_attendance(
            event_id=event_id,
            student_enrollment=request.student_enrollment,
            session_id=request.session_id,
            attendance_metadata=attendance_metadata
        )
        
        if result["success"]:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "success": True,
                    "message": result["message"],
                    "data": {
                        "attendance_id": result["attendance_id"],
                        "session_id": result["session_id"],
                        "session_name": result["session_name"],
                        "overall_status": result["overall_status"],
                        "percentage": result["percentage"],
                        "strategy": result["strategy"],
                        "marked_at": datetime.utcnow().isoformat()
                    }
                }
            )
        else:
            # Handle different error types
            status_code = status.HTTP_409_CONFLICT if result.get("already_marked") else status.HTTP_400_BAD_REQUEST
            
            raise HTTPException(
                status_code=status_code,
                detail={
                    "success": False,
                    "message": result["message"],
                    "error_type": "already_marked" if result.get("already_marked") else "marking_failed",
                    "already_marked": result.get("already_marked", False)
                }
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking attendance: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "message": "Internal server error during attendance marking",
                "error_type": "server_error"
            }
        )

@router.post("/bulk-mark/{event_id}")
async def bulk_mark_attendance(
    event_id: str,
    request: BulkAttendanceMarkRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Mark attendance for multiple students at once
    
    - **event_id**: Event identifier
    - **student_enrollments**: List of student enrollment numbers
    - **session_id**: Optional specific session
    - **marked_by**: Who is marking the attendance
    - **notes**: Bulk marking notes
    
    Returns summary of successful and failed markings
    """
    try:
        logger.info(f"Bulk marking attendance for {len(request.student_enrollments)} students in event {event_id}")
        
        results = {"successful": [], "failed": []}
        
        # Process each student
        for enrollment in request.student_enrollments:
            try:
                attendance_metadata = {
                    "marked_by": request.marked_by,
                    "marking_method": "bulk_api",
                    "notes": request.notes,
                    "bulk_operation": True
                }
                
                result = await attendance_service.mark_student_attendance(
                    event_id=event_id,
                    student_enrollment=enrollment,
                    session_id=request.session_id,
                    attendance_metadata=attendance_metadata
                )
                
                if result["success"]:
                    results["successful"].append({
                        "enrollment": enrollment,
                        "attendance_id": result["attendance_id"],
                        "session_name": result["session_name"],
                        "status": result["overall_status"]
                    })
                else:
                    results["failed"].append({
                        "enrollment": enrollment,
                        "reason": result["message"]
                    })
                    
            except Exception as e:
                results["failed"].append({
                    "enrollment": enrollment,
                    "reason": f"Processing error: {str(e)}"
                })
        
        success_count = len(results["successful"])
        total_count = len(request.student_enrollments)
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "success": True,
                "message": f"Bulk attendance completed: {success_count}/{total_count} successful",
                "data": {
                    "total_requested": total_count,
                    "successful_count": success_count,
                    "failed_count": len(results["failed"]),
                    "results": results,
                    "marked_at": datetime.utcnow().isoformat()
                }
            }
        )
        
    except Exception as e:
        logger.error(f"Error in bulk attendance marking: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "message": "Internal server error during bulk attendance marking",
                "error_type": "server_error"
            }
        )

@router.get("/status/{event_id}/{student_enrollment}")
async def get_student_attendance_status(
    event_id: str,
    student_enrollment: str,
    current_user: Dict = Depends(get_current_user)
):
    """
    Get comprehensive attendance status for a student
    
    - **event_id**: Event identifier
    - **student_enrollment**: Student's enrollment number
    
    Returns detailed attendance dashboard with strategy-specific information
    """
    try:
        logger.info(f"Getting attendance status: {student_enrollment} -> {event_id}")
        
        dashboard = await attendance_service.get_student_attendance_dashboard(event_id, student_enrollment)
        
        if dashboard["success"]:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "success": True,
                    "message": "Attendance status retrieved successfully",
                    "data": dashboard
                }
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "success": False,
                    "message": dashboard["message"],
                    "error_type": "status_not_found"
                }
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting attendance status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "message": "Internal server error while retrieving attendance status",
                "error_type": "server_error"
            }
        )

@router.get("/analytics/{event_id}")
async def get_event_attendance_analytics(
    event_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """
    Get comprehensive attendance analytics for an event
    
    - **event_id**: Event identifier
    
    Returns detailed analytics including session-wise statistics and overall metrics
    """
    try:
        logger.info(f"Getting attendance analytics for event: {event_id}")
        
        analytics = await attendance_service.get_event_attendance_analytics(event_id)
        
        if analytics["success"]:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "success": True,
                    "message": "Attendance analytics retrieved successfully",
                    "data": analytics
                }
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "success": False,
                    "message": analytics["message"],
                    "error_type": "analytics_not_found"
                }
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting attendance analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "message": "Internal server error while retrieving analytics",
                "error_type": "server_error"
            }
        )

@router.get("/sessions/{event_id}/active")
async def get_active_attendance_sessions(
    event_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """
    Get currently active attendance sessions for an event
    
    - **event_id**: Event identifier
    
    Returns active and upcoming sessions available for attendance marking
    """
    try:
        logger.info(f"Getting active sessions for event: {event_id}")
        
        sessions = await attendance_service.get_active_attendance_sessions(event_id)
        
        if sessions["success"]:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "success": True,
                    "message": "Active sessions retrieved successfully",
                    "data": sessions
                }
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "success": False,
                    "message": sessions["message"],
                    "error_type": "sessions_not_found"
                }
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting active sessions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "message": "Internal server error while retrieving active sessions",
                "error_type": "server_error"
            }
        )

@router.get("/config/{event_id}")
async def get_event_attendance_configuration(
    event_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """
    Get attendance configuration for an event
    
    - **event_id**: Event identifier
    
    Returns the dynamic attendance configuration including strategy and sessions
    """
    try:
        logger.info(f"Getting attendance config for event: {event_id}")
        
        # Get service and configuration
        config = await attendance_service.dynamic_service.get_attendance_config(event_id)
        
        if config:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "success": True,
                    "message": "Attendance configuration retrieved successfully",
                    "data": {
                        "event_id": config.event_id,
                        "strategy": config.strategy.value,
                        "criteria": config.criteria.dict(),
                        "sessions": [session.dict() for session in config.sessions],
                        "auto_generated": config.auto_generated,
                        "created_at": config.created_at.isoformat(),
                        "updated_at": config.updated_at.isoformat()
                    }
                }
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "success": False,
                    "message": "Attendance configuration not found. Initialize attendance for this event first.",
                    "error_type": "config_not_found"
                }
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting attendance configuration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "message": "Internal server error while retrieving configuration",
                "error_type": "server_error"
            }
        )

# Legacy compatibility endpoint
@router.post("/mark-physical/{event_id}")
async def legacy_mark_physical_attendance(
    event_id: str,
    request: AttendanceMarkRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Legacy endpoint for physical attendance marking (compatibility)
    
    This endpoint provides backward compatibility while using the new dynamic system
    """
    try:
        # Use the new dynamic system but mark as "physical" type
        attendance_metadata = {
            "marked_by": current_user.get("user_id"),
            "marking_method": "legacy_physical",
            "attendance_type": "physical",
            "device_fingerprint": request.device_fingerprint,
            "location_data": request.location_data,
            "notes": request.notes
        }
        
        result = await attendance_service.mark_student_attendance(
            event_id=event_id,
            student_enrollment=request.student_enrollment,
            session_id=request.session_id,
            attendance_metadata=attendance_metadata
        )
        
        if result["success"]:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "success": True,
                    "message": "Physical attendance marked successfully",
                    "attendance_id": result["attendance_id"],
                    "session_name": result["session_name"],
                    "overall_status": result["overall_status"],
                    "percentage": result["percentage"],
                    "legacy_compatible": True
                }
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "success": False,
                    "message": result["message"],
                    "legacy_compatible": True
                }
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in legacy physical attendance: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "message": "Internal server error during physical attendance marking",
                "legacy_compatible": True
            }
        )
