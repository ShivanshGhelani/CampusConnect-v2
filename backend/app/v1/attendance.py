"""
Attendance Management API Endpoints
==================================
Endpoints for attendance configuration, sessions, and analytics.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, Any, Optional
from dependencies.auth import require_admin, get_current_student
from models.admin_user import AdminUser
from services.event_attendance_service import event_attendance_service
from core.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/attendance", tags=["attendance"])

@router.get("/config/{event_id}")
async def get_attendance_config(
    event_id: str,
    current_user: AdminUser = Depends(require_admin)
):
    """Get attendance configuration for an event (Admin only)"""
    try:
        # Get event attendance configuration
        from database.operations import DatabaseOperations
        db_ops = DatabaseOperations()
        
        # Look for event details
        event = await db_ops.get_document_from_collection("events", {"event_id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Default attendance config
        attendance_config = {
            "strategy": "single_mark",
            "marking_window": {
                "start_time": event.get("start_datetime"),
                "end_time": event.get("end_datetime")
            },
            "auto_marking": False,
            "manual_marking": True,
            "milestone_based": False
        }
        
        return {
            "success": True,
            "event_id": event_id,
            "config": attendance_config
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting attendance config: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/sessions/{event_id}/active")
async def get_active_attendance_sessions(
    event_id: str,
    current_user: AdminUser = Depends(require_admin)
):
    """Get active attendance sessions for an event (Admin only)"""
    try:
        # For now, return basic session info
        return {
            "success": True,
            "event_id": event_id,
            "active_sessions": [],
            "total_sessions": 0,
            "current_session": None,
            "message": "No active attendance sessions found"
        }
        
    except Exception as e:
        logger.error(f"Error getting active sessions: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/analytics/{event_id}")
async def get_attendance_analytics(
    event_id: str,
    current_user: AdminUser = Depends(require_admin)
):
    """Get attendance analytics for an event (Admin only)"""
    try:
        # Get basic attendance statistics
        from database.operations import DatabaseOperations
        db_ops = DatabaseOperations()
        
        # Get all registrations for this event
        registrations = await db_ops.get_documents_from_collection(
            "student_registrations", 
            {"event.event_id": event_id}
        )
        
        total_registered = len(registrations)
        attended_count = sum(1 for reg in registrations if reg.get("attendance", {}).get("marked", False))
        
        analytics = {
            "total_registered": total_registered,
            "total_attended": attended_count,
            "attendance_rate": (attended_count / total_registered * 100) if total_registered > 0 else 0,
            "pending_attendance": total_registered - attended_count,
            "analytics_updated": "2024-01-01T00:00:00Z"
        }
        
        return {
            "success": True,
            "event_id": event_id,
            "analytics": analytics
        }
        
    except Exception as e:
        logger.error(f"Error getting attendance analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
