"""
Volunteer Scanner API - Invitation-based attendance marking system
Replaces JWT token-based scanner with simple invitation codes
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timedelta
import pytz
import secrets
import string

from database.operations import DatabaseOperations
from models.admin_user import AdminUser
from utils.datetime_helper import safe_datetime_compare, get_current_ist, make_naive
from dependencies.auth import require_admin
import logging
import os

logger = logging.getLogger(__name__)

# Development/Testing mode - bypasses time restrictions
TESTING_MODE = os.getenv("TESTING_MODE", "True").lower() == "true"

# Helper function to serialize datetime objects
def serialize_datetime(dt):
    """Convert datetime to ISO string format with timezone"""
    if dt is None:
        return None
    if isinstance(dt, str):
        return dt
    # Ensure datetime is treated as UTC and includes 'Z' suffix
    if hasattr(dt, 'isoformat'):
        iso_string = dt.isoformat()
        # If no timezone info, assume UTC and add 'Z'
        if '+' not in iso_string and 'Z' not in iso_string:
            iso_string += 'Z'
        return iso_string
    return str(dt)

router = APIRouter(prefix="/api/scanner", tags=["Volunteer Scanner"])

# ==================== MODELS ====================

class CreateInvitationRequest(BaseModel):
    event_id: str = Field(..., description="Event ID for which to create invitation")
    expires_at: Optional[str] = Field(None, description="Manual expiry time (ISO format). If not provided, uses event attendance end time")
    target_day: Optional[int] = Field(None, description="Specific day number for day-based attendance (e.g., 1, 2, 3)")
    target_session: Optional[str] = Field(None, description="Specific session ID for session-based attendance")
    target_round: Optional[str] = Field(None, description="Specific round ID for round-based attendance")

class CreateSessionRequest(BaseModel):
    volunteer_name: str = Field(..., min_length=2, max_length=100, description="Volunteer's full name")
    volunteer_contact: str = Field(..., min_length=3, max_length=100, description="Phone number or email")

class MarkAttendanceRequest(BaseModel):
    qr_data: dict = Field(..., description="Decoded QR code data")
    attendance_data: dict = Field(..., description="Attendance details (who is present)")
    timestamp: str = Field(..., description="Timestamp of scan")
    selected_members: Optional[List[str]] = Field(None, description="For team QR: list of enrollment numbers to mark present")

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
        
        # Get attendance strategy from event
        attendance_strategy_data = event.get("attendance_strategy", {})
        attendance_start = attendance_strategy_data.get("attendance_start_time")
        attendance_end = attendance_strategy_data.get("attendance_end_time")
        
        # Fallback: use event date range if attendance_strategy not set
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
                    expires_at = datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None) + timedelta(hours=24)
            else:
                expires_at = datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None) + timedelta(hours=24)
        
        # Check if active invitation already exists with same target
        existing_invitation = await DatabaseOperations.find_one(
            "volunteer_invitations",
            {
                "event_id": request.event_id,
                "is_active": True,
                "expires_at": {"$gt": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None)},
                "target_day": request.target_day,
                "target_session": request.target_session,
                "target_round": request.target_round
            }
        )
        
        if existing_invitation:
            # Return existing invitation with same target
            invitation_code = existing_invitation["invitation_code"]
            invitation_data = existing_invitation
            logger.info(f"Returning existing invitation {invitation_code} for event {request.event_id}")
        else:
            # Deactivate ALL previous invitations for this event (different targets)
            await DatabaseOperations.update_many(
                "volunteer_invitations",
                {"event_id": request.event_id, "is_active": True},
                {"$set": {"is_active": False, "deactivated_at": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None)}}
            )
            logger.info(f"Deactivated previous invitations for event {request.event_id}")
            
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
                "created_at": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None),
                "expires_at": expires_at,
                "is_active": True,
                "attendance_start_time": attendance_start,
                "attendance_end_time": attendance_end,
                "target_day": request.target_day,
                "target_session": request.target_session,
                "target_round": request.target_round,
                "attendance_strategy": attendance_strategy_data.get("strategy", "single_mark"),
                "target_audience": event.get("target_audience"),
                "is_team_based": event.get("is_team_based", False),
                "total_scans": 0,
                "active_sessions": []
            }
            
            await DatabaseOperations.insert_one("volunteer_invitations", invitation_data)
            logger.info(f"Created invitation {invitation_code} for event {request.event_id} by {current_user.email}")
            logger.info(f"Stored expires_at: {expires_at} (type: {type(expires_at).__name__})")
            logger.info(f"Stored expires_at ISO: {expires_at.isoformat() if hasattr(expires_at, 'isoformat') else str(expires_at)}")
        
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
            # Ensure datetime is treated as UTC and includes 'Z' suffix
            if hasattr(dt, 'isoformat'):
                iso_string = dt.isoformat()
                # If no timezone info, assume UTC and add 'Z'
                if '+' not in iso_string and 'Z' not in iso_string:
                    iso_string += 'Z'
                return iso_string
            return str(dt)
        
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
            {"$set": {"is_active": False, "deactivated_at": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None), "deactivated_by": current_user.email}}
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
        # Get most recent active invitation (sort by created_at descending)
        invitations = await DatabaseOperations.find_many(
            "volunteer_invitations",
            {"event_id": event_id, "is_active": True},
            sort_by=[("created_at", -1)],
            limit=1
        )
        
        if not invitations:
            return {
                "success": True,
                "data": {
                    "has_active_invitation": False
                }
            }
        
        invitation = invitations[0]
        
        # Get active sessions
        sessions = await DatabaseOperations.find_many(
            "volunteer_sessions",
            {
                "invitation_code": invitation["invitation_code"],
                "expires_at": {"$gt": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None)}
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
            # Ensure datetime is treated as UTC and includes 'Z' suffix
            if hasattr(dt, 'isoformat'):
                iso_string = dt.isoformat()
                # If no timezone info, assume UTC and add 'Z'
                if '+' not in iso_string and 'Z' not in iso_string:
                    iso_string += 'Z'
                return iso_string
            return str(dt)
        
        # Generate invitation URL
        base_url = "https://campusconnectldrp.vercel.app"
        invitation_url = f"{base_url}/scan/{invitation['invitation_code']}"
        
        # Debug logging
        logger.info(f"Stats endpoint - Retrieved expires_at: {invitation.get('expires_at')} (type: {type(invitation.get('expires_at')).__name__})")
        logger.info(f"Stats endpoint - Serialized expires_at: {serialize_datetime(invitation.get('expires_at'))}")
        
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
                "target_day": invitation.get("target_day"),
                "target_session": invitation.get("target_session"),
                "target_round": invitation.get("target_round"),
                "attendance_strategy": invitation.get("attendance_strategy"),
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

@router.get("/invitation/{event_id}/history")
async def get_scanner_history(event_id: str, invitation_code: Optional[str] = None):
    """
    Get detailed scan history for an event
    Shows all scans made via scanner and volunteer sessions
    """
    try:
        # Find active invitations for the event
        invitation_filter = {"event_id": event_id, "is_active": True}
        if invitation_code:
            invitation_filter["invitation_code"] = invitation_code
        
        invitations = await DatabaseOperations.find_many(
            "volunteer_invitations",
            invitation_filter,
            limit=10
        )
        
        if not invitations:
            return {
                "success": True,
                "data": {
                    "scans": [],
                    "volunteer_sessions": [],
                    "stats": {
                        "total_scans": 0,
                        "total_volunteers": 0,
                        "unique_attendees": 0,
                        "active_sessions": 0
                    }
                }
            }
        
        invitation_codes = [inv["invitation_code"] for inv in invitations]
        
        # Get all volunteer sessions for these invitations
        volunteer_sessions = await DatabaseOperations.find_many(
            "volunteer_sessions",
            {"invitation_code": {"$in": invitation_codes}},
            limit=100
        )
        
        logger.info(f"Found {len(volunteer_sessions)} volunteer sessions for event {event_id}")
        
        # Get all registrations with scans marked via scanner
        # Look for attendance.sessions where marked_by exists (indicating scanner marking)
        registrations_student = await DatabaseOperations.find_many(
            "student_registrations",
            {
                "event.event_id": event_id,
                "attendance.sessions.marked_by": {"$exists": True}
            },
            limit=500
        )
        
        registrations_faculty = await DatabaseOperations.find_many(
            "faculty_registrations",
            {
                "event.event_id": event_id,
                "attendance.sessions.marked_by": {"$exists": True}
            },
            limit=500
        )
        
        logger.info(f"Found {len(registrations_student)} student registrations and {len(registrations_faculty)} faculty registrations with scanner marks")
        
        all_registrations = registrations_student + registrations_faculty
        
        # Build scan history
        scans = []
        unique_attendees = set()
        
        for registration in all_registrations:
            registration_id = registration.get("registration_id")
            attendance = registration.get("attendance", {})
            sessions = attendance.get("sessions", [])
            
            # Get participant info
            participant_name = "Unknown"
            participant_type = "unknown"
            
            if registration.get("student"):
                participant_name = registration["student"].get("name") or registration["student"].get("full_name", "Unknown")
                participant_type = "student"
            elif registration.get("faculty"):
                participant_name = registration["faculty"].get("name") or registration["faculty"].get("full_name", "Unknown")
                participant_type = "faculty"
            elif registration.get("team"):
                participant_name = registration["team"].get("team_name", "Unknown Team")
                participant_type = "team"
            
            # Extract scanner-marked sessions (sessions with marked_by field)
            for session in sessions:
                # Only include sessions that were marked by volunteers (have marked_by field)
                if session.get("marked_by"):
                    unique_attendees.add(registration_id)
                    scans.append({
                        "registration_id": registration_id,
                        "participant_name": participant_name,
                        "participant_type": participant_type,
                        "marked_by": session.get("marked_by"),
                        "marked_at": serialize_datetime(session.get("marked_at")),
                        "session_id": session.get("session_id"),
                        "session_name": session.get("session_name"),
                        "attendance_status": attendance.get("status"),
                        "attendance_percentage": attendance.get("percentage"),
                        "notes": session.get("notes"),
                        "already_marked": False  # Can enhance this by checking previous scans
                    })
        
        # Sort scans by time (most recent first)
        scans.sort(key=lambda x: x["marked_at"] if x["marked_at"] else "", reverse=True)
        
        # Count active sessions
        active_sessions = sum(1 for s in volunteer_sessions if s.get("expires_at") and safe_datetime_compare(s["expires_at"], get_current_ist(), 'gt'))
        
        # Get event config for session name lookup
        event = await DatabaseOperations.find_one("events", {"event_id": event_id})
        event_config = event.get("config", {}) if event else {}
        sessions_config = event_config.get("sessions", [])
        
        # Helper function to get session name from session id
        def get_session_name(session_id):
            if not session_id or not sessions_config:
                return None
            for session in sessions_config:
                if session.get("id") == session_id:
                    return session.get("name")
            return session_id  # Fallback to ID if name not found
        
        # Build response - use total_scans from database (which is incremented on each scan)
        return {
            "success": True,
            "data": {
                "scans": scans,
                "volunteer_sessions": [
                    {
                        "session_id": s.get("session_id"),
                        "volunteer_name": s.get("volunteer_name"),
                        "volunteer_contact": s.get("volunteer_contact"),
                        "created_at": serialize_datetime(s.get("created_at")),
                        "expires_at": serialize_datetime(s.get("expires_at")),
                        "last_activity": serialize_datetime(s.get("last_activity")),
                        "total_scans": s.get("total_scans", 0),  # Use database value directly
                        "target_day": s.get("target_day"),
                        "target_session": s.get("target_session"),
                        "target_session_name": get_session_name(s.get("target_session")),
                        "target_round": s.get("target_round")
                    }
                    for s in volunteer_sessions
                ],
                "stats": {
                    "total_scans": len(scans),
                    "total_volunteers": len(volunteer_sessions),
                    "unique_attendees": len(unique_attendees),
                    "active_sessions": active_sessions
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting scanner history for event {event_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get scanner history: {str(e)}")

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
        
        # Extract event info from nested structure
        event_data = registration.get("event", {})
        event_id = event_data.get("event_id")
        
        if not event_id:
            raise HTTPException(status_code=404, detail="Event ID not found in registration")
        
        # Get event to determine attendance strategy
        event = await DatabaseOperations.find_one(
            "events",
            {"event_id": event_id}
        )
        
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Extract attendance info based on registration type
        attendance_strategy_data = event.get("attendance_strategy", {})
        attendance_strategy = attendance_strategy_data.get("strategy", "single_mark")  # FIX: Use "strategy" not "attendance_strategy"
        
        # Get registration type from nested structure
        registration_info = registration.get("registration", {})
        registration_type = registration_info.get("type", "individual")
        
        # Extract participant info based on type
        participant_info = {}
        team_members = []
        
        if registration_type == "team":
            # Team-based registration
            team_data = registration.get("team", {})
            participant_info = {
                "type": "team",
                "team_name": team_data.get("team_name"),
                "team_leader": team_data.get("leader", {}),
                "team_size": len(team_data.get("members", []))
            }
            
            # Get all team members with their attendance status
            for member in team_data.get("members", []):
                member_info = {
                    "enrollment_no": member.get("enrollment_no"),
                    "name": member.get("name"),
                    "email": member.get("email"),
                    "phone": member.get("phone"),
                    "department": member.get("department"),
                    "is_leader": member.get("is_leader", False),
                    "attendance_marked": member.get("attendance_marked", False)
                }
                team_members.append(member_info)
        else:
            # Individual registration
            student_data = registration.get("student", {})
            faculty_data = registration.get("faculty", {})
            
            if student_data:
                participant_info = {
                    "type": "individual",
                    "enrollment_no": student_data.get("enrollment_no"),
                    "name": student_data.get("name"),
                    "email": student_data.get("email"),
                    "phone": student_data.get("phone"),
                    "department": student_data.get("department"),
                    "year": student_data.get("year")
                }
            elif faculty_data:
                participant_info = {
                    "type": "individual",
                    "employee_id": faculty_data.get("employee_id"),
                    "name": faculty_data.get("name"),
                    "email": faculty_data.get("email"),
                    "phone": faculty_data.get("phone"),
                    "department": faculty_data.get("department"),
                    "designation": faculty_data.get("designation")
                }
        
        # Build response
        response_data = {
            "registration_id": registration_id,
            "event_id": event_id,
            "event_name": event_data.get("event_name", event.get("event_name")),
            "registration_type": registration_type,
            "attendance_strategy": attendance_strategy,
            "attendance": registration.get("attendance", {}),
            "participant": participant_info,
            "team_members": team_members if team_members else None
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

@router.get("/session/{session_id}/team/{registration_id}")
async def get_team_registration_data(
    session_id: str,
    registration_id: str
):
    """
    Fetch full team registration data for scanner
    This allows minimal QR codes - scanner fetches full data via API
    Public endpoint - validates session and event match
    """
    try:
        # Validate session
        session = await DatabaseOperations.find_one(
            "volunteer_sessions",
            {"session_id": session_id}
        )
        
        if not session:
            raise HTTPException(status_code=404, detail="Invalid session")
        
        # Check if session expired
        if safe_datetime_compare(get_current_ist(), session.get("expires_at"), 'gt'):
            raise HTTPException(status_code=403, detail="Session has expired")
        
        # Get session event ID
        session_event_id = session.get("event_id")
        
        # Fetch team registration
        registration = await DatabaseOperations.find_one(
            "student_registrations",
            {"registration_id": registration_id, "registration_type": "team"}
        )
        
        if not registration:
            raise HTTPException(status_code=404, detail="Team registration not found")
        
        # Validate event match - CRITICAL SECURITY CHECK
        registration_event_id = registration.get("event", {}).get("event_id")
        if registration_event_id != session_event_id:
            # Different event - return professional error
            session_event = await DatabaseOperations.find_one("events", {"event_id": session_event_id})
            registration_event = await DatabaseOperations.find_one("events", {"event_id": registration_event_id})
            
            raise HTTPException(
                status_code=403, 
                detail={
                    "error": "event_mismatch",
                    "message": "This QR code belongs to a different event",
                    "scanner_event": {
                        "id": session_event_id,
                        "name": session_event.get("event_name") if session_event else "Unknown Event"
                    },
                    "qr_event": {
                        "id": registration_event_id,
                        "name": registration_event.get("event_name") if registration_event else "Unknown Event"
                    }
                }
            )
        
        # Get invitation to check target day/session/round
        invitation = await DatabaseOperations.find_one(
            "volunteer_invitations",
            {"invitation_code": session.get("invitation_code")}
        )
        
        target_day = invitation.get("target_day") if invitation else None
        target_session = invitation.get("target_session") if invitation else None
        target_round = invitation.get("target_round") if invitation else None
        attendance_strategy = invitation.get("attendance_strategy") if invitation else "single_mark"
        
        # Get event to fetch session names
        event = await DatabaseOperations.find_one("events", {"event_id": session_event_id})
        
        # Get session/day name for display
        target_session_name = None
        if event and event.get("attendance_strategy", {}).get("sessions"):
            sessions = event.get("attendance_strategy", {}).get("sessions", [])
            if target_session:
                session_config = next((s for s in sessions if s.get("session_id") == target_session), None)
                target_session_name = session_config.get("session_name") if session_config else target_session
            elif target_day:
                day_session = next((s for s in sessions if s.get("session_id") == f"day_{target_day}"), None)
                target_session_name = day_session.get("session_name") if day_session else f"Day {target_day}"
        
        # Extract team members with their attendance
        team_members = registration.get("team_members", [])
        team_info = registration.get("team", {})
        
        # Build response with member data filtered by target session
        members_data = []
        for member in team_members:
            student_data = member.get("student", {})
            attendance = member.get("attendance", {})
            
            # Calculate current status for target session
            member_status = {
                "enrollment_no": student_data.get("enrollment_no"),
                "name": student_data.get("name"),
                "department": student_data.get("department"),
                "mobile_no": student_data.get("mobile_no"),
                "registration_id": member.get("registration_id"),  # Individual member registration ID
                "is_leader": member.get("is_team_leader", False),
                "overall_status": attendance.get("status", "pending"),
                "percentage": min(attendance.get("percentage", 0), 100)  # Cap at 100%
            }
            
            # Add session-specific status if applicable
            if attendance_strategy == "day_based" and target_day:
                sessions = attendance.get("sessions", [])
                day_session = next((s for s in sessions if s.get("day") == target_day), None)
                # Session is marked if it has marked_at or marked_by field
                is_marked = bool(day_session and (day_session.get("marked_at") or day_session.get("marked_by")))
                member_status["current_session_status"] = "present" if is_marked else "pending"
                member_status["current_session_marked_at"] = day_session.get("marked_at") if day_session else None
                member_status["current_session_marked_by"] = day_session.get("marked_by") if day_session else None
                member_status["current_session_notes"] = day_session.get("notes") if day_session else None
            elif attendance_strategy == "session_based" and target_session:
                sessions = attendance.get("sessions", [])
                session_data = next((s for s in sessions if s.get("session_id") == target_session), None)
                # Session is marked if it has marked_at or marked_by field
                is_marked = bool(session_data and (session_data.get("marked_at") or session_data.get("marked_by")))
                member_status["current_session_status"] = "present" if is_marked else "pending"
                member_status["current_session_marked_at"] = session_data.get("marked_at") if session_data else None
                member_status["current_session_marked_by"] = session_data.get("marked_by") if session_data else None
                member_status["current_session_notes"] = session_data.get("notes") if session_data else None
            elif attendance_strategy == "round_based" and target_round:
                rounds = attendance.get("rounds", [])
                round_data = next((r for r in rounds if r.get("round_id") == target_round), None)
                # Round is marked if it has marked_at or marked_by field
                is_marked = bool(round_data and (round_data.get("marked_at") or round_data.get("marked_by")))
                member_status["current_session_status"] = "present" if is_marked else "pending"
                member_status["current_session_marked_at"] = round_data.get("marked_at") if round_data else None
                member_status["current_session_marked_by"] = round_data.get("marked_by") if round_data else None
                member_status["current_session_notes"] = round_data.get("notes") if round_data else None
            else:
                # Single mark strategy
                member_status["current_session_status"] = attendance.get("status", "pending")
                member_status["current_session_marked_at"] = attendance.get("marked_at")
                member_status["current_session_marked_by"] = attendance.get("marked_by")
                member_status["current_session_notes"] = attendance.get("notes")
            
            members_data.append(member_status)
        
        return {
            "success": True,
            "data": {
                "registration_id": registration_id,
                "event_id": session_event_id,
                "team": {
                    "name": team_info.get("team_name"),
                    "size": team_info.get("team_size"),
                    "leader_enrollment": team_info.get("team_leader")
                },
                "members": members_data,
                "attendance_strategy": attendance_strategy,
                "target": {
                    "day": target_day,
                    "session": target_session,
                    "session_name": target_session_name,  # Formatted session name
                    "round": target_round
                }
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching team data for {registration_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch team data: {str(e)}")

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
        if expires_at and safe_datetime_compare(get_current_ist(), expires_at, 'gt'):
            raise HTTPException(status_code=403, detail="This invitation has expired")
        
        # Check if within attendance window
        attendance_start = invitation.get("attendance_start_time")
        attendance_end = invitation.get("attendance_end_time")
        now = datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None)
        
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
            # Ensure datetime is treated as UTC and includes 'Z' suffix
            if hasattr(dt, 'isoformat'):
                iso_string = dt.isoformat()
                # If no timezone info, assume UTC and add 'Z'
                if '+' not in iso_string and 'Z' not in iso_string:
                    iso_string += 'Z'
                return iso_string
            return str(dt)
        
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
        if expires_at and safe_datetime_compare(get_current_ist(), expires_at, 'gt'):
            raise HTTPException(status_code=403, detail="Invitation has expired")
        
        # Generate unique session ID
        session_id = generate_session_id()
        
        # Session expires with invitation
        session_expires = expires_at if expires_at else get_current_ist() + timedelta(hours=24)
        
        # Create session document
        session_doc = {
            "session_id": session_id,
            "invitation_code": invitation_code,
            "event_id": invitation.get("event_id"),
            "volunteer_name": request.volunteer_name,
            "volunteer_contact": request.volunteer_contact,
            "created_at": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None),
            "expires_at": session_expires,
            "total_scans": 0,
            "last_activity": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None),
            "target_day": invitation.get("target_day"),
            "target_session": invitation.get("target_session"),
            "target_round": invitation.get("target_round")
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
                "expires_at": session_expires.isoformat(),
                "target_day": invitation.get("target_day"),  # Add target_day from invitation
                "target_session": invitation.get("target_session"),  # Add target_session from invitation
                "target_round": invitation.get("target_round"),  # Add target_round from invitation
                "attendance_strategy": invitation.get("attendance_strategy")  # Add attendance_strategy
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
        if safe_datetime_compare(get_current_ist(), session.get("expires_at"), 'gt'):
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
        
        # VALIDATE EVENT MATCH - Critical security check
        registration_event_id = registration.get("event", {}).get("event_id")
        session_event_id = session.get("event_id")
        
        if registration_event_id != session_event_id:
            # Different event - return professional error
            session_event = await DatabaseOperations.find_one("events", {"event_id": session_event_id})
            registration_event = await DatabaseOperations.find_one("events", {"event_id": registration_event_id})
            
            raise HTTPException(
                status_code=403, 
                detail={
                    "error": "event_mismatch",
                    "message": "This QR code belongs to a different event",
                    "scanner_event": {
                        "id": session_event_id,
                        "name": session_event.get("event_name") if session_event else "Unknown Event"
                    },
                    "qr_event": {
                        "id": registration_event_id,
                        "name": registration_event.get("event_name") if registration_event else "Unknown Event"
                    }
                }
            )
        
        # Check if this is a team registration
        is_team = registration.get("registration_type") == "team"
        selected_members = request.selected_members  # List of enrollment numbers to mark
        
        # Fetch event to get attendance strategy
        event = await DatabaseOperations.find_one(
            "events",
            {"event_id": session.get("event_id")}
        )
        
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Get current attendance object from registration
        current_attendance = registration.get("attendance", {})
        attendance_strategy_data = event.get("attendance_strategy", {})
        
        # Get invitation to determine target day/session
        invitation = await DatabaseOperations.find_one(
            "volunteer_invitations",
            {"invitation_code": session.get("invitation_code")}
        )
        
        # Get strategy - prioritize invitation's strategy, fallback to event config
        attendance_strategy = "single_mark"
        if invitation and invitation.get("attendance_strategy"):
            attendance_strategy = invitation.get("attendance_strategy")
        elif attendance_strategy_data.get("strategy"):
            attendance_strategy = attendance_strategy_data.get("strategy")
        elif current_attendance.get("strategy"):
            attendance_strategy = current_attendance.get("strategy")
        
        # Get volunteer info for marking
        marked_by = session.get("volunteer_name", "Unknown Volunteer")
        ist = pytz.timezone('Asia/Kolkata')
        marked_at_time = datetime.now(ist)
        
        # Update attendance based on strategy
        # UPDATED to match attendance.py logic exactly - allows re-marking/toggling
        attendance_updated = False
        day_marked = None
        session_marked = None
        
        if attendance_strategy == "day_based":
            # Use target_day from invitation, or from request
            day_to_mark = None
            if invitation and invitation.get("target_day"):
                day_to_mark = invitation.get("target_day")
            elif request.attendance_data.get("day"):
                day_to_mark = request.attendance_data.get("day")
            else:
                raise HTTPException(status_code=400, detail="Day number required for day-based attendance")
            
            # Get ALL configured days/sessions from event config
            all_sessions = attendance_strategy_data.get("sessions", [])
            if not all_sessions:
                raise HTTPException(status_code=400, detail="No days configured in event")
            
            # Find the target day configuration
            target_day_config = None
            for day_config in all_sessions:
                # Extract day number from session_id (e.g., "day_1" -> 1)
                if day_config.get("session_id"):
                    day_match = day_config.get("session_id", "").split("_")
                    if len(day_match) >= 2 and day_match[0] == "day":
                        try:
                            config_day_num = int(day_match[1])
                            if config_day_num == day_to_mark:
                                target_day_config = day_config
                                break
                        except ValueError:
                            continue
            
            if not target_day_config:
                raise HTTPException(status_code=400, detail=f"Day {day_to_mark} not found in event configuration")
            
            # Use SAME structure as attendance.py - sessions array with session_id
            attended_sessions = current_attendance.get("sessions", [])
            
            # Check if already marked for this day (for notification only)
            already_marked = any(s.get("session_id") == target_day_config.get("session_id") for s in attended_sessions)
            previous_marked_by = None
            previous_marked_at = None
            if already_marked:
                for s in attended_sessions:
                    if s.get("session_id") == target_day_config.get("session_id"):
                        previous_marked_by = s.get("marked_by")
                        previous_marked_at = s.get("marked_at")
                        break
            
            # Remove existing entry for this day (allows re-marking/toggling)
            attended_sessions = [s for s in attended_sessions if s.get("session_id") != target_day_config.get("session_id")]
            
            # Always mark as present when scanning QR (scanner = attendance confirmation)
            attended_sessions.append({
                "session_id": target_day_config.get("session_id"),
                "session_name": target_day_config.get("session_name", f"Day {day_to_mark}"),
                "marked_at": marked_at_time.isoformat(),
                "marked_by": marked_by,
                "weight": target_day_config.get("weight", 1),
                "notes": f"Marked via QR Scanner"
            })
            
            attendance_updated = True
            day_marked = day_to_mark
            
            # Calculate percentage based on weights (SAME as attendance.py)
            total_weight = sum(s.get("weight", 1) for s in all_sessions)
            attended_weight = sum(s.get("weight", 1) for s in attended_sessions)
            percentage = (attended_weight / total_weight * 100) if total_weight > 0 else 0
            
            # Determine status based on percentage
            minimum_percentage = attendance_strategy_data.get("criteria", {}).get("minimum_percentage", 75)
            if percentage >= minimum_percentage:
                status = "present"
            elif percentage > 0:
                status = "partial"
            else:
                status = "absent"
            
            current_attendance.update({
                "strategy": attendance_strategy,
                "sessions": attended_sessions,
                "total_sessions": len(all_sessions),
                "sessions_attended": len(attended_sessions),
                "percentage": round(percentage, 2),
                "status": status
            })
        
        elif attendance_strategy == "session_based":
            # Use target_session from invitation or from request
            session_id_to_mark = None
            if invitation and invitation.get("target_session"):
                session_id_to_mark = invitation.get("target_session")
            elif request.attendance_data.get("session_id"):
                session_id_to_mark = request.attendance_data.get("session_id")
            else:
                raise HTTPException(status_code=400, detail="session_id required for session-based attendance")
            
            # Get ALL configured sessions from event config
            all_sessions = attendance_strategy_data.get("sessions", [])
            if not all_sessions:
                raise HTTPException(status_code=400, detail="No sessions configured in event")
            
            # Find the target session configuration
            target_session_config = None
            for sess_config in all_sessions:
                if sess_config.get("session_id") == session_id_to_mark:
                    target_session_config = sess_config
                    break
            
            if not target_session_config:
                raise HTTPException(status_code=400, detail=f"Session {session_id_to_mark} not found in event configuration")
            
            # Use SAME structure as attendance.py
            attended_sessions = current_attendance.get("sessions", [])
            
            # Check if already marked for this session (for notification only)
            already_marked = any(s.get("session_id") == session_id_to_mark for s in attended_sessions)
            previous_marked_by = None
            previous_marked_at = None
            if already_marked:
                for s in attended_sessions:
                    if s.get("session_id") == session_id_to_mark:
                        previous_marked_by = s.get("marked_by")
                        previous_marked_at = s.get("marked_at")
                        break
            
            # Remove existing entry for this session (allows re-marking/toggling)
            attended_sessions = [s for s in attended_sessions if s.get("session_id") != session_id_to_mark]
            
            # Always mark as present when scanning QR
            attended_sessions.append({
                "session_id": session_id_to_mark,
                "session_name": target_session_config.get("session_name", session_id_to_mark),
                "marked_at": marked_at_time.isoformat(),
                "marked_by": marked_by,
                "weight": target_session_config.get("weight", 1),
                "notes": f"Marked via QR Scanner"
            })
            
            attendance_updated = True
            session_marked = session_id_to_mark
            
            # Calculate percentage based on weights (SAME as attendance.py)
            total_weight = sum(s.get("weight", 1) for s in all_sessions)
            attended_weight = sum(s.get("weight", 1) for s in attended_sessions)
            percentage = (attended_weight / total_weight * 100) if total_weight > 0 else 0
            
            # Determine status based on percentage
            minimum_percentage = attendance_strategy_data.get("criteria", {}).get("minimum_percentage", 75)
            if percentage >= minimum_percentage:
                status = "present"
            elif percentage > 0:
                status = "partial"
            else:
                status = "absent"
            
            current_attendance.update({
                "strategy": attendance_strategy,
                "sessions": attended_sessions,
                "total_sessions": len(all_sessions),
                "sessions_attended": len(attended_sessions),
                "percentage": round(percentage, 2),
                "status": status
            })
        
        elif attendance_strategy == "single_mark":
            # Simple single mark - QR scan = present
            current_attendance["strategy"] = attendance_strategy
            current_attendance["marked"] = True
            current_attendance["marked_at"] = marked_at_time.isoformat()
            current_attendance["marked_by"] = marked_by
            current_attendance["percentage"] = 100
            current_attendance["status"] = "present"
            attendance_updated = True
        
        if not attendance_updated:
            raise HTTPException(status_code=400, detail=f"Could not mark attendance for strategy: {attendance_strategy}")
        
        # Update last_updated timestamp
        current_attendance["last_updated"] = marked_at_time.isoformat()
        
        # TEAM HANDLING: Update individual team members if this is a team registration
        update_result = False
        members_updated = []
        
        if is_team and selected_members:
            # Update specific team members
            team_members = registration.get("team_members", [])
            
            for member in team_members:
                member_enrollment = member.get("student", {}).get("enrollment_no")
                
                # Only update members that were selected
                if member_enrollment in selected_members:
                    member_attendance = member.get("attendance", {})
                    
                    # Apply same attendance strategy logic to individual member
                    if attendance_strategy == "day_based" and day_marked:
                        sessions = member_attendance.get("sessions", [])
                        session_id_to_mark = f"day_{day_marked}"
                        
                        # Find or create session
                        session_found = False
                        for s in sessions:
                            if s.get("session_id") == session_id_to_mark:
                                s["status"] = "present"
                                s["marked_at"] = marked_at_time.isoformat()
                                s["marked_by"] = marked_by
                                s["notes"] = f"QR Scanner - {marked_by}"
                                session_found = True
                                break
                        
                        if not session_found:
                            # Get the session config to extract the proper session_name
                            target_day_config = None
                            for day_config in attendance_strategy_data.get("sessions", []):
                                if day_config.get("session_id") == session_id_to_mark:
                                    target_day_config = day_config
                                    break
                            
                            sessions.append({
                                "session_id": session_id_to_mark,
                                "session_name": target_day_config.get("session_name", f"Day {day_marked}") if target_day_config else f"Day {day_marked}",
                                "day": day_marked,
                                "status": "present",
                                "marked_at": marked_at_time.isoformat(),
                                "marked_by": marked_by,
                                "notes": f"QR Scanner - {marked_by}"
                            })
                        
                        member_attendance["sessions"] = sessions
                        
                        # Recalculate percentage
                        total_days = len(attendance_strategy_data.get("sessions", []))
                        attended_days = len([s for s in sessions if s.get("status") == "present"])
                        member_attendance["percentage"] = min(round((attended_days / total_days) * 100, 2) if total_days > 0 else 0, 100)
                        member_attendance["status"] = "present" if member_attendance["percentage"] >= 75 else "partial"
                        
                    elif attendance_strategy == "session_based" and session_marked:
                        sessions = member_attendance.get("sessions", [])
                        
                        session_found = False
                        for s in sessions:
                            if s.get("session_id") == session_marked:
                                s["status"] = "present"
                                s["marked_at"] = marked_at_time.isoformat()
                                s["marked_by"] = marked_by
                                s["notes"] = f"QR Scanner - {marked_by}"
                                session_found = True
                                break
                        
                        if not session_found:
                            # Get the session config to extract the proper session_name
                            target_session_config = None
                            for sess_config in attendance_strategy_data.get("sessions", []):
                                if sess_config.get("session_id") == session_marked:
                                    target_session_config = sess_config
                                    break
                            
                            sessions.append({
                                "session_id": session_marked,
                                "session_name": target_session_config.get("session_name", session_marked) if target_session_config else session_marked,
                                "status": "present",
                                "marked_at": marked_at_time.isoformat(),
                                "marked_by": marked_by,
                                "notes": f"QR Scanner - {marked_by}"
                            })
                        
                        member_attendance["sessions"] = sessions
                        
                        # Recalculate percentage
                        total_sessions = len(attendance_strategy_data.get("sessions", []))
                        attended_sessions = len([s for s in sessions if s.get("status") == "present"])
                        member_attendance["percentage"] = min(round((attended_sessions / total_sessions) * 100, 2) if total_sessions > 0 else 0, 100)
                        member_attendance["status"] = "present" if member_attendance["percentage"] >= 75 else "partial"
                        
                    else:
                        # Single mark strategy
                        member_attendance["marked"] = True
                        member_attendance["marked_at"] = marked_at_time.isoformat()
                        member_attendance["marked_by"] = marked_by
                        member_attendance["percentage"] = 100
                        member_attendance["status"] = "present"
                    
                    member_attendance["last_updated"] = marked_at_time.isoformat()
                    member["attendance"] = member_attendance
                    members_updated.append(member_enrollment)
            
            # Update the team registration with modified team_members
            update_result = await DatabaseOperations.update_one(
                collection_name,
                {"registration_id": registration_id},
                {"$set": {"team_members": team_members}}
            )
            
        elif is_team and selected_members is not None and len(selected_members) == 0:
            # Team QR scanned but no members selected - this is OK, just skip without error
            # This allows re-scanning to mark members later
            update_result = True  # No update needed, but mark as successful
            logger.info(f"Team QR scanned for {registration_id} but no members selected - no changes made")
            
        else:
            # Individual registration - update as before
            update_result = await DatabaseOperations.update_one(
                collection_name,
                {"registration_id": registration_id},
                {"$set": {"attendance": current_attendance}}
            )
        
        if not update_result:
            raise HTTPException(status_code=500, detail="Failed to update registration attendance")
        
        # Update session activity
        await DatabaseOperations.update_one(
            "volunteer_sessions",
            {"session_id": session_id},
            {
                "$set": {"last_activity": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None)},
                "$inc": {"total_scans": 1}
            }
        )
        
        # Update invitation scan count
        await DatabaseOperations.update_one(
            "volunteer_invitations",
            {"invitation_code": session.get("invitation_code")},
            {"$inc": {"total_scans": 1}}
        )
        
        logger.info(f"✅ ATTENDANCE UPDATED: Registration {registration_id} marked by {marked_by} via session {session_id} - Strategy: {attendance_strategy}, Day: {day_marked}, Session: {session_marked}, Team: {is_team}, Members: {len(members_updated) if is_team else 'N/A'}")
        
        # Prepare response with already_marked flag if applicable
        response_data = {
            "registration_id": registration_id,
            "marked_by": marked_by,
            "marked_at": marked_at_time.isoformat(),
            "attendance_strategy": attendance_strategy,
            "day_marked": day_marked,
            "session_marked": session_marked,
            "is_team": is_team
        }
        
        # Add team-specific data
        if is_team:
            response_data["members_updated"] = members_updated
            response_data["members_count"] = len(members_updated)
            response_data["message"] = f"✓ Marked {len(members_updated)} team member(s) present"
        else:
            response_data["attendance_percentage"] = current_attendance.get("percentage", 0)
            response_data["attendance_status"] = current_attendance.get("status", "unknown")
        
        # Add already_marked flag and message if this was a re-mark (individual only)
        if not is_team and 'already_marked' in locals() and already_marked:
            response_data["already_marked"] = True
            response_data["previous_marked_by"] = previous_marked_by
            response_data["previous_marked_at"] = previous_marked_at
            if day_marked:
                response_data["message"] = f"✓ Attendance re-confirmed for Day {day_marked} (previously marked by {previous_marked_by})"
            elif session_marked:
                response_data["message"] = f"✓ Attendance re-confirmed for session (previously marked by {previous_marked_by})"
        
        return {
            "success": True,
            "data": response_data
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
        
        is_valid = datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None) <= session.get("expires_at")
        
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

