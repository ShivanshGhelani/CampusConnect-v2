"""
Unified Attendance Management API
================================
Simplified attendance system with 3 core endpoints:
1. GET /config/{event_id} - Get attendance strategy and participants
2. POST /mark - Mark attendance for participants
3. GET /analytics/{event_id} - Get attendance analytics
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import secrets
import jwt
from dependencies.auth import require_admin, get_current_student
from models.admin_user import AdminUser
from database.operations import DatabaseOperations
from core.logger import get_logger
from config.settings import settings

logger = get_logger(__name__)

router = APIRouter(prefix="/attendance", tags=["attendance"])

@router.get("/config/{event_id}")
async def get_attendance_config_and_participants(
    event_id: str,
    current_user: AdminUser = Depends(require_admin)
):
    """
    Get attendance configuration from event and all participants for the event
    Returns: event attendance strategy, sessions/days/milestones, and participant list
    """
    try:
        # Get event with attendance strategy
        event = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Extract attendance configuration
        attendance_config = {
            "event_id": event_id,
            "event_name": event.get("event_name"),
            "attendance_mandatory": event.get("attendance_mandatory", True),
            "attendance_strategy": event.get("attendance_strategy", "single_mark"),
            "attendance_config": event.get("attendance_config", {}),
            "registration_mode": event.get("registration_mode", "individual"),
            "is_team_based": event.get("is_team_based", False)
        }
        
        # Get student participants for this event
        student_participants = await DatabaseOperations.find_many(
            "student_registrations", 
            {"event.event_id": event_id}
        )
        
        # Get faculty participants for this event
        faculty_participants = await DatabaseOperations.find_many(
            "faculty_registrations", 
            {"event.event_id": event_id}
        )
        
        # Process participants to include attendance status
        processed_students = []
        for participant in student_participants:
            processed_students.append({
                "registration_id": participant.get("registration_id"),
                "participant_type": "student",
                "student": participant.get("student", {}),
                "team": participant.get("team"),  # Will be None for individual registrations
                "registration": participant.get("registration", {}),
                "attendance": participant.get("attendance", {}),
                "event": participant.get("event", {})
            })
        
        processed_faculty = []
        for participant in faculty_participants:
            processed_faculty.append({
                "registration_id": participant.get("registration_id"),
                "participant_type": "faculty",
                "faculty": participant.get("faculty", {}),
                "registration": participant.get("registration", {}),
                "attendance": participant.get("attendance", {}),
                "event": participant.get("event", {})
            })
        
        # Combine all participants
        all_participants = processed_students + processed_faculty
        
        return {
            "success": True,
            "data": {
                "config": attendance_config,
                "participants": all_participants,
                "total_participants": len(all_participants),
                "student_participants": len(processed_students),
                "faculty_participants": len(processed_faculty)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting attendance config: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/mark")
async def mark_attendance(
    request_data: Dict[str, Any],
    current_user: AdminUser = Depends(require_admin)
):
    """
    Mark attendance for participants based on strategy
    Supports: single_mark, session_based, day_based, milestone_based
    """
    try:
        registration_id = request_data.get("registration_id")
        attendance_type = request_data.get("attendance_type", "present")  # present/absent
        session_id = request_data.get("session_id")  # For session_based, day_based, milestone_based
        notes = request_data.get("notes", "")
        
        if not registration_id:
            raise HTTPException(status_code=400, detail="Registration ID is required")
        
        # Find the participant in both collections
        participant = None
        collection_name = None
        
        # Check student registrations first
        student_participant = await DatabaseOperations.find_one(
            "student_registrations", 
            {"registration_id": registration_id}
        )
        
        if student_participant:
            participant = student_participant
            collection_name = "student_registrations"
        else:
            # Check faculty registrations
            faculty_participant = await DatabaseOperations.find_one(
                "faculty_registrations", 
                {"registration_id": registration_id}
            )
            if faculty_participant:
                participant = faculty_participant
                collection_name = "faculty_registrations"
        
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        # Get event to understand the attendance strategy
        event_id = participant["event"]["event_id"]
        event = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        attendance_strategy = event.get("attendance_strategy", "single_mark")
        attendance_config = event.get("attendance_config", {})
        
        # Get current attendance data
        current_attendance = participant.get("attendance", {})
        
        # Mark attendance based on strategy
        updated_attendance = await _mark_attendance_by_strategy(
            current_attendance, 
            attendance_strategy, 
            attendance_config, 
            attendance_type, 
            session_id, 
            current_user.username,
            notes
        )
        
        # Update the participant's attendance in database
        await DatabaseOperations.update_one(
            collection_name,
            {"registration_id": registration_id},
            {"$set": {"attendance": updated_attendance}}
        )
        
        return {
            "success": True,
            "message": "Attendance marked successfully",
            "data": {
                "registration_id": registration_id,
                "attendance": updated_attendance
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking attendance: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/analytics/{event_id}")
async def get_attendance_analytics(
    event_id: str,
    current_user: AdminUser = Depends(require_admin)
):
    """Get attendance analytics for an event"""
    try:
        # Get all participants for this event
        student_participants = await DatabaseOperations.find_many(
            "student_registrations", 
            {"event.event_id": event_id}
        )
        
        faculty_participants = await DatabaseOperations.find_many(
            "faculty_registrations", 
            {"event.event_id": event_id}
        )
        
        all_participants = student_participants + faculty_participants
        total_registered = len(all_participants)
        
        if total_registered == 0:
            return {
                "success": True,
                "data": {
                    "total_registered": 0,
                    "total_present": 0,
                    "total_absent": 0,
                    "attendance_rate": 0,
                    "by_status": {},
                    "by_type": {"student": 0, "faculty": 0}
                }
            }
        
        # Calculate analytics
        present_count = 0
        absent_count = 0
        pending_count = 0
        partial_count = 0
        
        student_present = 0
        faculty_present = 0
        
        for participant in all_participants:
            attendance = participant.get("attendance", {})
            status = attendance.get("status", "pending")
            percentage = attendance.get("percentage", 0.0)
            
            if status == "present" or percentage == 100.0:
                present_count += 1
                if "student" in participant:
                    student_present += 1
                else:
                    faculty_present += 1
            elif status == "absent" or percentage == 0.0:
                absent_count += 1
            elif 0 < percentage < 100:
                partial_count += 1
            else:
                pending_count += 1
        
        attendance_rate = (present_count / total_registered * 100) if total_registered > 0 else 0
        
        analytics = {
            "total_registered": total_registered,
            "total_present": present_count,
            "total_absent": absent_count,
            "total_partial": partial_count,
            "total_pending": pending_count,
            "attendance_rate": round(attendance_rate, 2),
            "by_status": {
                "present": present_count,
                "absent": absent_count,
                "partial": partial_count,
                "pending": pending_count
            },
            "by_type": {
                "student": {
                    "total": len(student_participants),
                    "present": student_present
                },
                "faculty": {
                    "total": len(faculty_participants),
                    "present": faculty_present
                }
            }
        }
        
        return {
            "success": True,
            "event_id": event_id,
            "data": analytics
        }
        
    except Exception as e:
        logger.error(f"Error getting attendance analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

async def _mark_attendance_by_strategy(
    current_attendance: Dict[str, Any], 
    strategy: str, 
    config: Dict[str, Any], 
    attendance_type: str, 
    session_id: Optional[str], 
    marked_by: str,
    notes: str
) -> Dict[str, Any]:
    """
    Mark attendance based on the strategy and calculate percentage
    """
    now = datetime.utcnow()
    
    # Initialize attendance if empty
    if not current_attendance:
        current_attendance = {
            "strategy": strategy,
            "status": "pending",
            "percentage": 0.0,
            "last_updated": None,
            "marked_by": None,
            "marking_method": "manual",
            "sessions": [],
            "total_sessions": 0,
            "sessions_attended": 0,
            "marked": False,
            "marked_at": None
        }
    
    if strategy == "single_mark":
        # Simple present/absent marking
        current_attendance.update({
            "status": "present" if attendance_type == "present" else "absent",
            "percentage": 100.0 if attendance_type == "present" else 0.0,
            "marked": attendance_type == "present",
            "marked_at": now.isoformat() if attendance_type == "present" else None,
            "marked_by": marked_by,
            "last_updated": now.isoformat(),
            "notes": notes
        })
    
    elif strategy in ["session_based", "day_based", "milestone_based"]:
        # Get sessions/days/milestones from config
        sessions = config.get("sessions", [])
        if not sessions:
            raise HTTPException(status_code=400, detail="No sessions configured for this strategy")
        
        if not session_id:
            raise HTTPException(status_code=400, detail="Session ID is required for this strategy")
        
        # Find the session
        target_session = None
        for session in sessions:
            if session.get("session_id") == session_id:
                target_session = session
                break
        
        if not target_session:
            raise HTTPException(status_code=400, detail="Session not found")
        
        # Update sessions list
        attended_sessions = current_attendance.get("sessions", [])
        
        # Remove existing entry for this session if any
        attended_sessions = [s for s in attended_sessions if s.get("session_id") != session_id]
        
        if attendance_type == "present":
            # Add this session as attended
            attended_sessions.append({
                "session_id": session_id,
                "session_name": target_session.get("session_name", session_id),
                "marked_at": now.isoformat(),
                "marked_by": marked_by,
                "weight": target_session.get("weight", 1),
                "notes": notes
            })
        
        # Calculate percentage based on weights
        total_weight = sum(s.get("weight", 1) for s in sessions)
        attended_weight = sum(s.get("weight", 1) for s in attended_sessions)
        percentage = (attended_weight / total_weight * 100) if total_weight > 0 else 0
        
        # Determine status based on percentage and minimum required
        minimum_percentage = config.get("minimum_percentage", 75)
        if percentage >= minimum_percentage:
            status = "present"
        elif percentage > 0:
            status = "partial"
        else:
            status = "absent"
        
        current_attendance.update({
            "sessions": attended_sessions,
            "total_sessions": len(sessions),
            "sessions_attended": len(attended_sessions),
            "percentage": round(percentage, 2),
            "status": status,
            "last_updated": now.isoformat(),
            "marked_by": marked_by,
            "notes": notes
        })
    
    return current_attendance

@router.post("/generate-scanner-token/{event_id}")
async def generate_scanner_token(
    event_id: str,
    expires_in_hours: int = Query(default=24, description="Token expiration in hours"),
    current_user: AdminUser = Depends(require_admin)
):
    """
    Generate a secure token link for QR scanner access to mark attendance
    Stores the token in the event document for validation
    """
    try:
        # Get event
        event = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Calculate expiration time
        expires_at = datetime.utcnow() + timedelta(hours=expires_in_hours)
        
        # Generate secure token
        token_payload = {
            "event_id": event_id,
            "type": "scanner_token",
            "generated_by": current_user.email,
            "generated_at": datetime.utcnow().isoformat(),
            "expires_at": expires_at.isoformat(),
            "permissions": ["mark_attendance", "view_participants"]
        }
        
        scanner_token = jwt.encode(
            token_payload, 
            settings.JWT_SECRET_KEY, 
            algorithm=settings.JWT_ALGORITHM
        )
        
        # Update event with scanner token info
        scanner_info = {
            "scanner_token": scanner_token,
            "token_generated_at": datetime.utcnow().isoformat(),
            "token_expires_at": expires_at.isoformat(),
            "token_generated_by": current_user.email,
            "token_active": True
        }
        
        await DatabaseOperations.update_one(
            "events",
            {"event_id": event_id},
            {"$set": {"scanner_info": scanner_info}}
        )
        
        # Generate scanner URL
        base_url = settings.FRONTEND_URL if settings.ENVIRONMENT == "production" else "http://localhost:3000"
        scanner_url = f"{base_url}/scanner/{scanner_token}"
        
        logger.info(f"Generated scanner token for event {event_id} by {current_user.email}")
        
        return {
            "success": True,
            "data": {
                "scanner_token": scanner_token,
                "scanner_url": scanner_url,
                "expires_at": expires_at.isoformat(),
                "expires_in_hours": expires_in_hours,
                "event_id": event_id,
                "event_name": event.get("event_name")
            }
        }
        
    except Exception as e:
        logger.error(f"Error generating scanner token for event {event_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate scanner token: {str(e)}")

@router.get("/scanner-info/{token}")
async def get_scanner_info(token: str):
    """
    Validate scanner token and return event info for QR scanner
    Public endpoint - no auth required
    """
    try:
        # Decode token
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Scanner token has expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid scanner token")
        
        event_id = payload.get("event_id")
        if not event_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        
        # Get event and verify token is still active
        event = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        scanner_info = event.get("scanner_info", {})
        if not scanner_info.get("token_active", False):
            raise HTTPException(status_code=401, detail="Scanner token has been deactivated")
        
        if scanner_info.get("scanner_token") != token:
            raise HTTPException(status_code=401, detail="Token mismatch")
        
        return {
            "success": True,
            "data": {
                "event_id": event_id,
                "event_name": event.get("event_name"),
                "attendance_strategy": event.get("attendance_strategy", "single_mark"),
                "attendance_config": event.get("attendance_config", {}),
                "is_team_based": event.get("is_team_based", False),
                "registration_mode": event.get("registration_mode", "individual"),
                "token_expires_at": payload.get("expires_at"),
                "permissions": payload.get("permissions", [])
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating scanner token: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to validate scanner token")

@router.post("/scan-mark")
async def scan_and_mark_attendance(
    token: str,
    qr_data: Dict[str, Any]
):
    """
    Mark attendance using scanner token and QR code data
    Public endpoint - validates token for permission
    """
    try:
        # Validate token first
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Scanner token has expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid scanner token")
        
        event_id = payload.get("event_id")
        permissions = payload.get("permissions", [])
        
        if "mark_attendance" not in permissions:
            raise HTTPException(status_code=403, detail="Token does not have attendance marking permission")
        
        # Verify event and token
        event = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        scanner_info = event.get("scanner_info", {})
        if not scanner_info.get("token_active", False) or scanner_info.get("scanner_token") != token:
            raise HTTPException(status_code=401, detail="Invalid or inactive scanner token")
        
        # Parse QR data
        registration_id = qr_data.get("registration_id")
        if not registration_id:
            raise HTTPException(status_code=400, detail="Invalid QR code: missing registration_id")
        
        # Get volunteer information
        marked_by = qr_data.get("marked_by", "QR Scanner")
        marked_by_email = qr_data.get("marked_by_email", "")
        marked_at = qr_data.get("marked_at", datetime.utcnow().isoformat())
        
        # Mark attendance using existing logic
        attendance_data = {
            "registration_id": registration_id,
            "attendance_type": qr_data.get("attendance_type", "present"),
            "session_id": qr_data.get("session_id"),
            "notes": f"Marked via QR scanner by {marked_by} ({marked_by_email}) at {marked_at}"
        }
        
        # Find the registration
        student_reg = await DatabaseOperations.find_one(
            "student_registrations", 
            {"registration_id": registration_id, "event.event_id": event_id}
        )
        faculty_reg = await DatabaseOperations.find_one(
            "faculty_registrations", 
            {"registration_id": registration_id, "event.event_id": event_id}
        )
        
        if not student_reg and not faculty_reg:
            raise HTTPException(status_code=404, detail="Registration not found for this event")
        
        # Use existing mark attendance logic with volunteer information
        result = await _mark_attendance_by_strategy(
            event,
            student_reg or faculty_reg,
            attendance_data["attendance_type"],
            attendance_data.get("session_id"),
            marked_by,
            attendance_data.get("notes", "")
        )
        
        return {
            "success": True,
            "data": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in scan and mark attendance: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to mark attendance: {str(e)}")
