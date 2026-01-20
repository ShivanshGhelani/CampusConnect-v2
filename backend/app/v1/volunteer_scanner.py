"""
Volunteer Scanner API - Invitation-based attendance marking system
Replaces JWT token-based scanner with simple invitation codes
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timedelta
import secrets
import string

from database.operations import DatabaseOperations
from models.admin_user import AdminUser
from dependencies.auth import require_admin
import logging
import os

logger = logging.getLogger(__name__)

# Development/Testing mode - bypasses time restrictions
TESTING_MODE = os.getenv("TESTING_MODE", "True").lower() == "true"

router = APIRouter(prefix="/api/scanner", tags=["Volunteer Scanner"])

# ==================== MODELS ====================

class CreateInvitationRequest(BaseModel):
    event_id: str = Field(..., description="Event ID for which to create invitation")
    expires_at: Optional[str] = Field(None, description="Manual expiry time (ISO format). If not provided, uses event attendance end time")

class CreateSessionRequest(BaseModel):
    volunteer_name: str = Field(..., min_length=2, max_length=100, description="Volunteer's full name")
    volunteer_contact: str = Field(..., min_length=3, max_length=100, description="Phone number or email")

class MarkAttendanceRequest(BaseModel):
    qr_data: dict = Field(..., description="Decoded QR code data")
    attendance_data: dict = Field(..., description="Attendance details (who is present)")
    timestamp: str = Field(..., description="Timestamp of scan")

# ==================== HELPER FUNCTIONS ====================

def generate_invitation_code(length: int = 12) -> str:
    """Generate a random invitation code"""
    characters = string.ascii_uppercase + string.digits
    # Remove confusing characters: 0, O, I, 1
    characters = characters.replace('0', '').replace('O', '').replace('I', '').replace('1', '')
    return ''.join(secrets.choice(characters) for _ in range(length))

def generate_session_id() -> str:
    """Generate a unique session ID"""
    return f"sess_{secrets.token_urlsafe(16)}"

# ==================== ADMIN ENDPOINTS ====================

@router.post("/invitation/create")
async def create_invitation_link(
    request: CreateInvitationRequest,
    current_user: AdminUser = Depends(require_admin)
):
    """
    Create a new invitation link for volunteers to mark attendance
    Admin/Faculty only endpoint
    """
    try:
        # Get event
        event = await DatabaseOperations.find_one("events", {"event_id": request.event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Get attendance times from event
        attendance_config = event.get("attendance_config", {})
        attendance_start = attendance_config.get("attendance_start_time")
        attendance_end = attendance_config.get("attendance_end_time")
        
        # Fallback: use event date range if attendance_config not set
        if not attendance_start:
            event_date = event.get("event_date")
            if event_date:
                attendance_start = event_date if isinstance(event_date, datetime) else datetime.fromisoformat(str(event_date).replace('Z', '+00:00'))
        
        if not attendance_end:
            event_end_date = event.get("event_end_date") or event.get("event_date")
            if event_end_date:
                attendance_end = event_end_date if isinstance(event_end_date, datetime) else datetime.fromisoformat(str(event_end_date).replace('Z', '+00:00'))
        
        # Determine expiration time
        if request.expires_at:
            # Use provided expiry
            try:
                expires_at = datetime.fromisoformat(request.expires_at.replace('Z', '+00:00'))
            except:
                raise HTTPException(status_code=400, detail="Invalid expiry time format")
        else:
            # Use attendance end time or fallback
            if attendance_end:
                try:
                    if isinstance(attendance_end, str):
                        expires_at = datetime.fromisoformat(attendance_end.replace('Z', '+00:00'))
                    else:
                        expires_at = attendance_end
                except:
                    expires_at = datetime.utcnow() + timedelta(hours=24)
            else:
                expires_at = datetime.utcnow() + timedelta(hours=24)
        
        # Check if active invitation already exists
        existing_invitation = await DatabaseOperations.find_one(
            "volunteer_invitations",
            {
                "event_id": request.event_id,
                "is_active": True,
                "expires_at": {"$gt": datetime.utcnow()}
            }
        )
        
        if existing_invitation:
            # Return existing invitation
            invitation_code = existing_invitation["invitation_code"]
            invitation_data = existing_invitation
            logger.info(f"Returning existing invitation {invitation_code} for event {request.event_id}")
        else:
            # Generate new invitation code
            invitation_code = generate_invitation_code()
            
            # Ensure uniqueness
            while await DatabaseOperations.find_one("volunteer_invitations", {"invitation_code": invitation_code}):
                invitation_code = generate_invitation_code()
            
            # Store invitation in database
            invitation_data = {
                "invitation_code": invitation_code,
                "event_id": request.event_id,
                "event_name": event.get("event_name"),
                "created_by": current_user.email,
                "created_at": datetime.utcnow(),
                "expires_at": expires_at,
                "is_active": True,
                "attendance_start_time": attendance_start,
                "attendance_end_time": attendance_end,
                "total_scans": 0,
                "active_sessions": []
            }
            
            await DatabaseOperations.insert_one("volunteer_invitations", invitation_data)
            logger.info(f"Created invitation {invitation_code} for event {request.event_id} by {current_user.email}")
        
        # Generate invitation URL
        from config.settings import settings
        # Use correct Vercel production URL for scanner links
        base_url = "https://campusconnectldrp.vercel.app"
        invitation_url = f"{base_url}/scan/{invitation_code}"
        
        # Helper function to convert datetime to ISO string
        def serialize_datetime(dt):
            if dt is None:
                return None
            if isinstance(dt, str):
                return dt
            return dt.isoformat() if hasattr(dt, 'isoformat') else str(dt)
        
        return {
            "success": True,
            "data": {
                "invitation_code": invitation_code,
                "invitation_url": invitation_url,
                "event_id": request.event_id,
                "event_name": event.get("event_name"),
                "expires_at": expires_at.isoformat(),
                "attendance_window": {
                    "start": serialize_datetime(invitation_data.get("attendance_start_time")),
                    "end": serialize_datetime(invitation_data.get("attendance_end_time"))
                }
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating invitation for event {request.event_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create invitation: {str(e)}")

@router.delete("/invitation/{invitation_code}/deactivate")
async def deactivate_invitation(
    invitation_code: str,
    current_user: AdminUser = Depends(require_admin)
):
    """
    Deactivate an invitation link
    Admin/Faculty only endpoint
    """
    try:
        result = await DatabaseOperations.update_one(
            "volunteer_invitations",
            {"invitation_code": invitation_code},
            {"$set": {"is_active": False, "deactivated_at": datetime.utcnow(), "deactivated_by": current_user.email}}
        )
        
        # DatabaseOperations.update_one returns bool, not pymongo result
        if not result:
            raise HTTPException(status_code=404, detail="Invitation not found")
        
        logger.info(f"Deactivated invitation {invitation_code} by {current_user.email}")
        
        return {
            "success": True,
            "message": "Invitation deactivated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deactivating invitation {invitation_code}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to deactivate invitation: {str(e)}")

@router.get("/invitation/{event_id}/stats")
async def get_invitation_stats(
    event_id: str,
    current_user: AdminUser = Depends(require_admin)
):
    """
    Get statistics for an event's invitation
    Admin/Faculty only endpoint
    """
    try:
        # Get invitation
        invitation = await DatabaseOperations.find_one(
            "volunteer_invitations",
            {"event_id": event_id, "is_active": True}
        )
        
        if not invitation:
            return {
                "success": True,
                "data": {
                    "has_active_invitation": False
                }
            }
        
        # Get active sessions
        sessions = await DatabaseOperations.find_many(
            "volunteer_sessions",
            {
                "invitation_code": invitation["invitation_code"],
                "expires_at": {"$gt": datetime.utcnow()}
            }
        )
        
        # Get scan count
        scan_count = await DatabaseOperations.count_documents(
            "attendance_records",
            {"invitation_code": invitation["invitation_code"]}
        )
        
        # Helper function to serialize datetime
        def serialize_datetime(dt):
            if dt is None:
                return None
            if isinstance(dt, str):
                return dt
            return dt.isoformat() if hasattr(dt, 'isoformat') else str(dt)
        
        # Generate invitation URL
        base_url = "https://campusconnectldrp.vercel.app"
        invitation_url = f"{base_url}/scan/{invitation['invitation_code']}"
        
        return {
            "success": True,
            "data": {
                "has_active_invitation": True,
                "invitation_code": invitation["invitation_code"],
                "invitation_url": invitation_url,
                "created_at": serialize_datetime(invitation.get("created_at")),
                "expires_at": serialize_datetime(invitation.get("expires_at")),
                "attendance_start_time": serialize_datetime(invitation.get("attendance_start_time")),
                "attendance_end_time": serialize_datetime(invitation.get("attendance_end_time")),
                "total_scans": scan_count,
                "active_volunteers": len(sessions),
                "volunteers": [
                    {
                        "name": s.get("volunteer_name"),
                        "contact": s.get("volunteer_contact"),
                        "joined_at": serialize_datetime(s.get("created_at"))
                    }
                    for s in sessions
                ]
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting invitation stats for event {event_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")

@router.get("/registration/{registration_id}/status")
async def get_registration_attendance_status(
    registration_id: str
):
    """
    Get current attendance status for a registration
    Public endpoint - used by scanner to show current status
    """
    try:
        # Get registration - try student_registrations first, then faculty_registrations
        registration = await DatabaseOperations.find_one(
            "student_registrations",
            {"registration_id": registration_id}
        )
        
        if not registration:
            registration = await DatabaseOperations.find_one(
                "faculty_registrations",
                {"registration_id": registration_id}
            )
        
        if not registration:
            raise HTTPException(status_code=404, detail="Registration not found")
        
        # Get event to determine attendance strategy
        event = await DatabaseOperations.find_one(
            "events",
            {"event_id": registration.get("event_id")}
        )
        
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Extract attendance info based on registration type
        attendance_config = event.get("attendance_config", {})
        attendance_strategy = attendance_config.get("attendance_strategy", "single_mark")
        
        # Build response
        response_data = {
            "registration_id": registration_id,
            "event_id": registration.get("event_id"),
            "event_name": event.get("event_name"),
            "registration_type": registration.get("registration_type"),
            "attendance_strategy": attendance_strategy,
            "attendance": registration.get("attendance", {})
        }
        
        # Add student/faculty/team info
        if registration.get("registration_type") == "team":
            response_data["team_name"] = registration.get("team", {}).get("team_name")
            response_data["team_members"] = registration.get("team_members", [])
            # Add team leader info
            leader_id = registration.get("student_id") or registration.get("faculty_id")
            if leader_id:
                leader_profile = await DatabaseOperations.find_one(
                    "students" if registration.get("student_id") else "faculty",
                    {"_id": leader_id}
                )
                if leader_profile:
                    response_data["leader"] = {
                        "name": leader_profile.get("full_name"),
                        "enrollment": leader_profile.get("enrollment_no") or leader_profile.get("employee_id"),
                        "department": leader_profile.get("department"),
                        "email": leader_profile.get("email")
                    }
        else:
            # Individual registration
            student_id = registration.get("student_id")
            faculty_id = registration.get("faculty_id")
            
            if student_id:
                student = await DatabaseOperations.find_one("students", {"_id": student_id})
                if student:
                    response_data["student"] = {
                        "name": student.get("full_name"),
                        "enrollment": student.get("enrollment_no"),
                        "department": student.get("department"),
                        "email": student.get("email")
                    }
            elif faculty_id:
                faculty = await DatabaseOperations.find_one("faculty", {"_id": faculty_id})
                if faculty:
                    response_data["faculty"] = {
                        "name": faculty.get("full_name"),
                        "employee_id": faculty.get("employee_id"),
                        "department": faculty.get("department"),
                        "email": faculty.get("email")
                    }
        
        return {
            "success": True,
            "data": response_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting attendance status for {registration_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get attendance status: {str(e)}")

# ==================== PUBLIC ENDPOINTS ====================

@router.get("/invitation/{invitation_code}/validate")
async def validate_invitation(invitation_code: str):
    """
    Validate invitation code and return event details
    Public endpoint - no auth required
    """
    try:
        # Find invitation
        invitation = await DatabaseOperations.find_one(
            "volunteer_invitations",
            {"invitation_code": invitation_code}
        )
        
        if not invitation:
            raise HTTPException(status_code=404, detail="Invalid invitation code")
        
        # Check if active
        if not invitation.get("is_active", False):
            raise HTTPException(status_code=403, detail="This invitation has been deactivated")
        
        # Check if expired
        expires_at = invitation.get("expires_at")
        if expires_at and datetime.utcnow() > expires_at:
            raise HTTPException(status_code=403, detail="This invitation has expired")
        
        # Check if within attendance window
        attendance_start = invitation.get("attendance_start_time")
        attendance_end = invitation.get("attendance_end_time")
        now = datetime.utcnow()
        
        is_active = True
        if attendance_start and attendance_end and not TESTING_MODE:
            # Only enforce time restrictions in production
            if isinstance(attendance_start, str):
                attendance_start = datetime.fromisoformat(attendance_start.replace('Z', '+00:00'))
            if isinstance(attendance_end, str):
                attendance_end = datetime.fromisoformat(attendance_end.replace('Z', '+00:00'))
            
            is_active = attendance_start <= now <= attendance_end
        elif TESTING_MODE:
            # In testing mode, always allow access if invitation is valid
            is_active = True
            logger.info(f"TESTING_MODE: Bypassing time validation for invitation {invitation_code}")
        
        # Helper function to serialize datetime
        def serialize_datetime(dt):
            if dt is None:
                return None
            if isinstance(dt, str):
                return dt
            return dt.isoformat() if hasattr(dt, 'isoformat') else str(dt)
        
        return {
            "success": True,
            "data": {
                "event_id": invitation.get("event_id"),
                "event_name": invitation.get("event_name"),
                "attendance_start_time": serialize_datetime(invitation.get("attendance_start_time")),
                "attendance_end_time": serialize_datetime(invitation.get("attendance_end_time")),
                "expires_at": serialize_datetime(invitation.get("expires_at")),
                "is_active": is_active,
                "testing_mode": TESTING_MODE
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating invitation {invitation_code}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to validate invitation: {str(e)}")

@router.post("/invitation/{invitation_code}/session")
async def create_volunteer_session(
    invitation_code: str,
    request: CreateSessionRequest
):
    """
    Create a new volunteer scanning session
    Public endpoint - no auth required
    """
    try:
        # Validate invitation first
        invitation = await DatabaseOperations.find_one(
            "volunteer_invitations",
            {"invitation_code": invitation_code, "is_active": True}
        )
        
        if not invitation:
            raise HTTPException(status_code=404, detail="Invalid or inactive invitation")
        
        # Check expiry
        expires_at = invitation.get("expires_at")
        if expires_at and datetime.utcnow() > expires_at:
            raise HTTPException(status_code=403, detail="Invitation has expired")
        
        # Generate unique session ID
        session_id = generate_session_id()
        
        # Session expires with invitation
        session_expires = expires_at if expires_at else datetime.utcnow() + timedelta(hours=24)
        
        # Create session document
        session_doc = {
            "session_id": session_id,
            "invitation_code": invitation_code,
            "event_id": invitation.get("event_id"),
            "volunteer_name": request.volunteer_name,
            "volunteer_contact": request.volunteer_contact,
            "created_at": datetime.utcnow(),
            "expires_at": session_expires,
            "total_scans": 0,
            "last_activity": datetime.utcnow()
        }
        
        await DatabaseOperations.insert_one("volunteer_sessions", session_doc)
        
        logger.info(f"Created volunteer session {session_id} for {request.volunteer_name} on invitation {invitation_code}")
        
        return {
            "success": True,
            "data": {
                "session_id": session_id,
                "volunteer_name": request.volunteer_name,
                "volunteer_contact": request.volunteer_contact,
                "event_id": invitation.get("event_id"),
                "event_name": invitation.get("event_name"),
                "expires_at": session_expires.isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating session for invitation {invitation_code}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create session: {str(e)}")

@router.post("/session/{session_id}/mark")
async def mark_attendance(
    session_id: str,
    request: MarkAttendanceRequest
):
    """
    Mark attendance for a scanned QR code
    NOW UPDATES ACTUAL REGISTRATION DOCUMENTS!
    Public endpoint - validates session
    """
    try:
        # Get and validate session
        session = await DatabaseOperations.find_one(
            "volunteer_sessions",
            {"session_id": session_id}
        )
        
        if not session:
            raise HTTPException(status_code=404, detail="Invalid session")
        
        # Check if session expired
        if datetime.utcnow() > session.get("expires_at"):
            raise HTTPException(status_code=403, detail="Session has expired")
        
        # Extract registration ID from QR data
        registration_id = request.qr_data.get("registration_id") or request.qr_data.get("reg_id")
        
        if not registration_id:
            raise HTTPException(status_code=400, detail="No registration_id found in QR code")
        
        # Fetch registration - try student_registrations first, then faculty_registrations
        registration = await DatabaseOperations.find_one(
            "student_registrations",
            {"registration_id": registration_id}
        )
        
        collection_name = "student_registrations"
        
        if not registration:
            registration = await DatabaseOperations.find_one(
                "faculty_registrations",
                {"registration_id": registration_id}
            )
            collection_name = "faculty_registrations"
        
        if not registration:
            raise HTTPException(status_code=404, detail="Registration not found")
        
        # Fetch event to get attendance strategy
        event = await DatabaseOperations.find_one(
            "events",
            {"event_id": session.get("event_id")}
        )
        
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Get current attendance object from registration
        current_attendance = registration.get("attendance", {})
        attendance_config = event.get("attendance_config", {})
        attendance_strategy = attendance_config.get("attendance_strategy", "single_mark")
        
        # Get volunteer info for marking
        marked_by = session.get("volunteer_name", "Unknown Volunteer")
        marked_at_time = datetime.utcnow()
        
        # Update attendance based on strategy
        attendance_updated = False
        day_marked = None
        session_marked = None
        
        if attendance_strategy == "day_based":
            # Get which day to mark (default to day 1 if not specified)
            day_to_mark = request.attendance_data.get("day", 1)
            
            days = current_attendance.get("days", [])
            for day in days:
                if day.get("day") == day_to_mark:
                    day["marked"] = True
                    day["marked_at"] = marked_at_time.isoformat()
                    day["marked_by"] = marked_by
                    attendance_updated = True
                    day_marked = day_to_mark
                    break
            
            # Calculate percentage for day-based
            if days:
                marked_count = sum(1 for d in days if d.get("marked", False))
                current_attendance["percentage"] = (marked_count / len(days)) * 100
                current_attendance["status"] = "completed" if marked_count == len(days) else "partial"
        
        elif attendance_strategy == "session_based":
            # Get which session to mark
            session_id_to_mark = request.attendance_data.get("session_id")
            
            if not session_id_to_mark:
                raise HTTPException(status_code=400, detail="session_id required for session-based attendance")
            
            sessions = current_attendance.get("sessions", [])
            for sess in sessions:
                if sess.get("session_id") == session_id_to_mark:
                    sess["marked"] = True
                    sess["marked_at"] = marked_at_time.isoformat()
                    sess["marked_by"] = marked_by
                    attendance_updated = True
                    session_marked = session_id_to_mark
                    break
            
            # Calculate percentage for session-based
            if sessions:
                marked_count = sum(1 for s in sessions if s.get("marked", False))
                current_attendance["percentage"] = (marked_count / len(sessions)) * 100
                current_attendance["status"] = "completed" if marked_count == len(sessions) else "partial"
        
        elif attendance_strategy == "single_mark":
            # Simple single mark
            current_attendance["marked"] = True
            current_attendance["marked_at"] = marked_at_time.isoformat()
            current_attendance["marked_by"] = marked_by
            current_attendance["percentage"] = 100
            current_attendance["status"] = "completed"
            attendance_updated = True
        
        if not attendance_updated:
            raise HTTPException(status_code=400, detail=f"Could not mark attendance for strategy: {attendance_strategy}")
        
        # Update the registration document in the correct collection
        update_result = await DatabaseOperations.update_one(
            collection_name,  # Use the correct collection (student_registrations or faculty_registrations)
            {"registration_id": registration_id},
            {"$set": {"attendance": current_attendance}}
        )
        
        if not update_result:
            raise HTTPException(status_code=500, detail="Failed to update registration attendance")
        
        # Create audit trail in attendance_records
        attendance_record = {
            "session_id": session_id,
            "invitation_code": session.get("invitation_code"),
            "event_id": session.get("event_id"),
            "registration_id": registration_id,
            "volunteer_name": marked_by,
            "volunteer_contact": session.get("volunteer_contact"),
            "qr_data": request.qr_data,
            "attendance_data": request.attendance_data,
            "attendance_strategy": attendance_strategy,
            "day_marked": day_marked,
            "session_marked": session_marked,
            "marked_at": marked_at_time,
            "created_at": datetime.utcnow()
        }
        
        result = await DatabaseOperations.insert_one("attendance_records", attendance_record)
        attendance_id = result if isinstance(result, str) else str(result)
        
        # Update session activity
        await DatabaseOperations.update_one(
            "volunteer_sessions",
            {"session_id": session_id},
            {
                "$set": {"last_activity": datetime.utcnow()},
                "$inc": {"total_scans": 1}
            }
        )
        
        # Update invitation scan count
        await DatabaseOperations.update_one(
            "volunteer_invitations",
            {"invitation_code": session.get("invitation_code")},
            {"$inc": {"total_scans": 1}}
        )
        
        logger.info(f"✅ ATTENDANCE UPDATED: Registration {registration_id} marked by {marked_by} via session {session_id} - Strategy: {attendance_strategy}, Day: {day_marked}, Session: {session_marked}")
        
        return {
            "success": True,
            "data": {
                "attendance_id": attendance_id,
                "registration_id": registration_id,
                "marked_by": marked_by,
                "marked_at": marked_at_time.isoformat(),
                "attendance_strategy": attendance_strategy,
                "day_marked": day_marked,
                "session_marked": session_marked,
                "attendance_percentage": current_attendance.get("percentage", 0),
                "attendance_status": current_attendance.get("status", "unknown")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error marking attendance for session {session_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to mark attendance: {str(e)}")

@router.get("/session/{session_id}/status")
async def get_session_status(session_id: str):
    """
    Check if session is still valid
    Public endpoint - no auth required
    """
    try:
        session = await DatabaseOperations.find_one(
            "volunteer_sessions",
            {"session_id": session_id}
        )
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        is_valid = datetime.utcnow() <= session.get("expires_at")
        
        return {
            "success": True,
            "data": {
                "is_valid": is_valid,
                "volunteer_name": session.get("volunteer_name"),
                "expires_at": session.get("expires_at"),
                "total_scans": session.get("total_scans", 0)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting session status {session_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get session status: {str(e)}")
