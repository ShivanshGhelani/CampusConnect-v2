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
from datetime import datetime, timedelta, timezone
import pytz
import secrets
import jwt
from dependencies.auth import require_admin, get_current_student
from models.admin_user import AdminUser
from database.operations import DatabaseOperations
from core.logger import get_logger
from config.settings import settings

logger = get_logger(__name__)

# Testing flag - set to False in production
TESTING_MODE = True  # When True, token time validation is bypassed

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
        
        # Extract attendance configuration from attendance_strategy field
        attendance_strategy_data = event.get("attendance_strategy", {})
        attendance_config = {
            "event_id": event_id,
            "event_name": event.get("event_name"),
            "attendance_mandatory": event.get("attendance_mandatory", True),
            "attendance_strategy": attendance_strategy_data,  # Full strategy object
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
            registration_type = participant.get("registration_type", "individual")
            
            if registration_type == "team" and participant.get("team_members"):
                # Team-based registration - add the team record with team_members
                processed_students.append({
                    "registration_id": participant.get("registration_id"),
                    "registration_type": "team",
                    "participant_type": "student",
                    "team": participant.get("team"),
                    "team_members": participant.get("team_members", []),
                    "additional_data": participant.get("additional_data", {}),
                    "event": participant.get("event", {}),
                    "created_at": participant.get("created_at"),
                    "updated_at": participant.get("updated_at")
                })
            else:
                # Individual registration
                processed_students.append({
                    "registration_id": participant.get("registration_id"),
                    "registration_type": "individual",
                    "participant_type": "student",
                    "student": participant.get("student", {}),
                    "team": participant.get("team"),  # Will be None for individual registrations
                    "registration": participant.get("registration", {}),
                    "attendance": participant.get("attendance", {}),
                    "event": participant.get("event", {})
                })
        
        processed_faculty = []
        for participant in faculty_participants:
            registration_type = participant.get("registration_type", "individual")
            
            if registration_type == "team" and participant.get("team_members"):
                # Team-based registration - add the team record with team_members
                processed_faculty.append({
                    "registration_id": participant.get("registration_id"),
                    "registration_type": "team",
                    "participant_type": "faculty",
                    "team": participant.get("team"),
                    "team_members": participant.get("team_members", []),
                    "additional_data": participant.get("additional_data", {}),
                    "event": participant.get("event", {}),
                    "created_at": participant.get("created_at"),
                    "updated_at": participant.get("updated_at")
                })
            else:
                # Individual registration
                processed_faculty.append({
                    "registration_id": participant.get("registration_id"),
                    "registration_type": "individual",
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
    Handles both individual registrations and team member attendance
    """
    try:
        registration_id = request_data.get("registration_id")
        attendance_type = request_data.get("attendance_type", "present")  # present/absent
        session_id = request_data.get("session_id")  # For session_based, day_based, milestone_based
        member_index = request_data.get("member_index")  # For team member attendance marking
        notes = request_data.get("notes", "")
        
        if not registration_id:
            raise HTTPException(status_code=400, detail="Registration ID is required")
        
        # Find the participant in both collections
        participant = None
        collection_name = None
        
        # For team members, the registration_id might be a team member's registration_id
        # First check if this is a team member registration_id within team registrations
        team_registration = None
        team_member_data = None
        
        # Check student registrations first for team-based registrations
        student_team_registration = await DatabaseOperations.find_one(
            "student_registrations", 
            {"registration_type": "team", "team_members.registration_id": registration_id}
        )
        
        if student_team_registration:
            team_registration = student_team_registration
            collection_name = "student_registrations"
            # Find the specific team member
            for member in team_registration.get("team_members", []):
                if member.get("registration_id") == registration_id:
                    team_member_data = member
                    break
        else:
            # Check for individual student registration
            student_participant = await DatabaseOperations.find_one(
                "student_registrations", 
                {"registration_id": registration_id}
            )
            
            if student_participant:
                participant = student_participant
                collection_name = "student_registrations"
            else:
                # Check faculty registrations for team-based
                faculty_team_registration = await DatabaseOperations.find_one(
                    "faculty_registrations", 
                    {"registration_type": "team", "team_members.registration_id": registration_id}
                )
                
                if faculty_team_registration:
                    team_registration = faculty_team_registration
                    collection_name = "faculty_registrations"
                    # Find the specific team member
                    for member in team_registration.get("team_members", []):
                        if member.get("registration_id") == registration_id:
                            team_member_data = member
                            break
                else:
                    # Check for individual faculty registration
                    faculty_participant = await DatabaseOperations.find_one(
                        "faculty_registrations", 
                        {"registration_id": registration_id}
                    )
                    if faculty_participant:
                        participant = faculty_participant
                        collection_name = "faculty_registrations"
        
        if not participant and not team_member_data:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        # Determine if this is a team member or individual registration
        if team_member_data and team_registration:
            # Team member attendance marking
            event_id = team_registration["event"]["event_id"]
            event = await DatabaseOperations.find_one("events", {"event_id": event_id})
            if not event:
                raise HTTPException(status_code=404, detail="Event not found")
            
            attendance_strategy_data = event.get("attendance_strategy", {})
            attendance_strategy = attendance_strategy_data.get("strategy", "single_mark")
            
            # Get current attendance data for this team member
            current_attendance = team_member_data.get("attendance", {})
            
            # Mark attendance for the team member
            updated_attendance = await _mark_attendance_by_strategy(
                current_attendance, 
                attendance_strategy, 
                attendance_strategy_data, 
                attendance_type, 
                session_id, 
                current_user.username,
                notes
            )
            
            # Update the team member's attendance in the team registration
            team_members = team_registration.get("team_members", [])
            for i, member in enumerate(team_members):
                if member.get("registration_id") == registration_id:
                    team_members[i]["attendance"] = updated_attendance
                    break
            
            # Update the database with the modified team registration
            await DatabaseOperations.update_one(
                collection_name,
                {"registration_id": team_registration["registration_id"]},
                {"$set": {"team_members": team_members}}
            )
            
            return {
                "success": True,
                "message": "Team member attendance marked successfully",
                "data": {
                    "registration_id": registration_id,
                    "team_registration_id": team_registration["registration_id"],
                    "attendance": updated_attendance,
                    "member_name": team_member_data.get("student", {}).get("name") or team_member_data.get("faculty", {}).get("name")
                }
            }
        else:
            # Individual registration attendance marking
            event_id = participant["event"]["event_id"]
            event = await DatabaseOperations.find_one("events", {"event_id": event_id})
            if not event:
                raise HTTPException(status_code=404, detail="Event not found")

            attendance_strategy_data = event.get("attendance_strategy", {})
            attendance_strategy = attendance_strategy_data.get("strategy", "single_mark")
            
            # Get current attendance data
            current_attendance = participant.get("attendance", {})
            
            # Mark attendance based on strategy
            updated_attendance = await _mark_attendance_by_strategy(
                current_attendance, 
                attendance_strategy, 
                attendance_strategy_data, 
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
    ist = pytz.timezone('Asia/Kolkata')
    now = datetime.now(ist)
    
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
        percentage = min((attended_weight / total_weight * 100) if total_weight > 0 else 0, 100)
        
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

@router.get("/qr-data/{event_id}")
async def get_qr_data_for_event(
    event_id: str,
    target_audience: str = Query(..., description="student or faculty"),
    registration_type: str = Query(..., description="individual or team"), 
    registration_id: str = Query(..., description="Registration ID to fetch data for")
):
    """
    Get proper registration data for QR code generation
    
    Query Parameters:
    - target_audience: "student" or "faculty" 
    - registration_type: "individual" or "team"
    - registration_id: The specific registration ID
    
    Returns properly formatted data for QR code generation
    """
    try:
        logger.info(f"Fetching QR data: event_id={event_id}, audience={target_audience}, type={registration_type}, reg_id={registration_id}")
        
        # Validate input parameters
        if target_audience not in ["student", "faculty"]:
            raise HTTPException(status_code=400, detail="target_audience must be 'student' or 'faculty'")
        
        if registration_type not in ["individual", "team"]:
            raise HTTPException(status_code=400, detail="registration_type must be 'individual' or 'team'")
        
        # Get event data
        event = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Choose collection based on target audience
        collection_name = "student_registrations" if target_audience == "student" else "faculty_registrations"
        
        # Find registration based on type and registration_id
        # For team registrations, the registration_id passed is a member's ID (nested in team_members array)
        # For individual registrations, it's at the root level
        if registration_type == "team":
            query = {
                "team_members.registration_id": registration_id,
                "event.event_id": event_id
            }
        else:
            query = {
                "registration_id": registration_id,
                "event.event_id": event_id
            }
        
        registration = await DatabaseOperations.find_one(collection_name, query)
        if not registration:
            raise HTTPException(status_code=404, detail=f"Registration not found in {collection_name}")
        
        # Format response based on registration type and audience
        if target_audience == "student":
            if registration_type == "individual":
                # Individual student registration
                qr_data = {
                    "registration_id": registration["registration_id"],
                    "event_id": event_id,
                    "event_name": event.get("event_name", ""),
                    "type": "individual",
                    "user_type": "student",
                    "user": {
                        "name": registration["student"]["name"],
                        "id": registration["student"]["enrollment_no"],
                        "department": registration["student"]["department"],
                        "email": registration["student"]["email"],
                        "type": "student"
                    },
                    "event": {
                        "date": event.get("event_date"),
                        "time": event.get("event_time"), 
                        "venue": event.get("venue")
                    },
                    "attendance": registration.get("attendance", {}),
                    "generated": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None).isoformat(),
                    "version": "3.0"
                }
            else:
                # Team student registration - MINIMAL QR DATA (only IDs, fetch full data via API)
                qr_data = {
                    "registration_id": registration["registration_id"],  # Team registration ID
                    "event_id": event_id,
                    "type": "team",
                    "user_type": "student",
                    "version": "4.0"  # Version 4.0 = minimal team QR, requires backend fetch
                }
        else:
            # Faculty registration (always individual)
            qr_data = {
                "registration_id": registration["registration_id"],
                "event_id": event_id,
                "event_name": event.get("event_name", ""),
                "type": "individual", 
                "user_type": "faculty",
                "user": {
                    "name": registration["faculty"]["name"],
                    "id": registration["faculty"]["employee_id"],
                    "department": registration["faculty"]["department"],
                    "email": registration["faculty"]["email"],
                    "type": "faculty"
                },
                "event": {
                    "date": event.get("event_date"),
                    "time": event.get("event_time"),
                    "venue": event.get("venue")
                },
                "attendance": registration.get("attendance", {}),
                "generated": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None).isoformat(),
                "version": "3.0"
            }
        
        return {
            "success": True,
            "data": qr_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching QR data: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching QR data")


# ==================== OLD JWT TOKEN-BASED SCANNER SYSTEM ====================
# DEPRECATED: Use /api/scanner/invitation/* endpoints instead (volunteer_scanner.py)
# This old system is kept disabled for reference only
# Uncomment if you need backward compatibility

# @router.post("/generate-scanner-token/{event_id}")
# async def generate_scanner_token(
#     event_id: str,
#     session_id: Optional[str] = Query(default=None, description="Session ID for session-based events"),
#     expires_in_hours: Optional[int] = Query(default=None, description="Manual override for token expiration in hours"),
#     current_user: AdminUser = Depends(require_admin)
# ):
#     """
#     Generate a secure token link for QR scanner access to mark attendance
#     Uses session timing when available, or manual hours override
#     """
#     # OLD CODE - COMMENTED OUT
#     pass

# @router.get("/scanner-info/{token}")
# async def get_scanner_info(token: str):
#     """
#     Validate scanner token and return event info for QR scanner
#     Public endpoint - no auth required
#     """
#     # OLD CODE - COMMENTED OUT
#     pass

# ==================== END OF DEPRECATED SCANNER SYSTEM ====================

@router.post("/scan-and-mark")
async def scan_and_mark_attendance(
    request_data: Dict[str, Any]
):
    """
    Mark attendance using scanner token and QR code data
    Returns detailed participant information and attendance status
    """
    try:
        qr_code = request_data.get("qr_code")
        scanner_token = request_data.get("scanner_token")
        volunteer_name = request_data.get("volunteer_name", "QR Scanner")
        volunteer_contact = request_data.get("volunteer_contact", "")
        volunteer_role = request_data.get("volunteer_role", "Volunteer")
        
        if not qr_code or not scanner_token:
            raise HTTPException(status_code=400, detail="QR code and scanner token are required")
        
        # Validate scanner token
        try:
            payload = jwt.decode(scanner_token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        except jwt.ExpiredSignatureError:
            if TESTING_MODE:
                logger.warning("Token expired but allowing access due to TESTING_MODE")
                try:
                    payload = jwt.decode(scanner_token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM], options={"verify_exp": False})
                except jwt.InvalidTokenError:
                    raise HTTPException(status_code=401, detail="Invalid scanner token")
            else:
                raise HTTPException(status_code=401, detail="Scanner token has expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid scanner token")
        
        event_id = payload.get("event_id")
        session_id = payload.get("session_id")
        permissions = payload.get("permissions", [])
        
        if "mark_attendance" not in permissions:
            raise HTTPException(status_code=403, detail="Token does not have attendance marking permission")
        
        # Parse QR code (assuming it contains registration_id)
        try:
            import json
            qr_data = json.loads(qr_code)
            registration_id = qr_data.get("registration_id")
        except:
            # If QR code is just a registration_id string
            registration_id = qr_code
        
        if not registration_id:
            raise HTTPException(status_code=400, detail="Invalid QR code: missing registration_id")
        
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
        
        participant = student_reg or faculty_reg
        collection_name = "student_registrations" if student_reg else "faculty_registrations"
        
        # Get event to understand strategy
        event = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        attendance_strategy_data = event.get("attendance_strategy", {})
        attendance_strategy = attendance_strategy_data.get("strategy", "single_mark")
        is_team_based = event.get("is_team_based", False)
        
        # Check current attendance status
        current_attendance = participant.get("attendance", {})
        
        # For session-based strategies, check if already marked for this session
        already_marked = False
        attendance_status = "pending"
        
        if attendance_strategy in ["session_based", "day_based", "milestone_based"] and session_id:
            attended_sessions = current_attendance.get("sessions", [])
            for session in attended_sessions:
                if session.get("session_id") == session_id:
                    already_marked = True
                    attendance_status = "already_marked"
                    break
        elif attendance_strategy == "single_mark":
            if current_attendance.get("marked", False):
                already_marked = True
                attendance_status = "already_marked"
        
        participant_info = {}
        if student_reg:
            student_data = participant.get("student", {})
            participant_info = {
                "type": "student",
                "name": student_data.get("full_name", "Unknown Student"),
                "email": student_data.get("email", ""),
                "student_id": student_data.get("student_id", ""),
                "department": student_data.get("department", ""),
                "year": student_data.get("year", "")
            }
        else:
            faculty_data = participant.get("faculty", {})
            participant_info = {
                "type": "faculty",
                "name": faculty_data.get("name", "Unknown Faculty"),
                "email": faculty_data.get("email", ""),
                "faculty_id": faculty_data.get("faculty_id", ""),
                "department": faculty_data.get("department", ""),
                "designation": faculty_data.get("designation", "")
            }
        
        # Handle team-based registration
        team_info = None
        if is_team_based and participant.get("team"):
            team_info = {
                "team_name": participant["team"].get("team_name"),
                "team_id": participant["team"].get("team_id"),
                "team_size": len(participant["team"].get("members", [])),
                "members": participant["team"].get("members", [])
            }
        
        # If not already marked, mark attendance
        if not already_marked:
            notes = f"Marked via QR scanner by {volunteer_name} ({volunteer_contact}, {volunteer_role})"
            
            updated_attendance = await _mark_attendance_by_strategy(
                current_attendance,
                attendance_strategy,
                attendance_strategy_data,
                "present",
                session_id,
                volunteer_name,
                notes
            )
            
            # Update database
            await DatabaseOperations.update_one(
                collection_name,
                {"registration_id": registration_id},
                {"$set": {"attendance": updated_attendance}}
            )
            
            attendance_status = "marked"
            
            # Log the attendance marking
            logger.info(f"Attendance marked for {registration_id} by {volunteer_name} via QR scanner")
        
        return {
            "success": True,
            "attendance_status": attendance_status,
            "participant": participant_info,
            "team": team_info,
            "event_info": {
                "event_id": event_id,
                "event_name": event.get("event_name"),
                "strategy": attendance_strategy
            },
            "session_info": {
                "session_id": session_id,
                "marked_by": volunteer_name,
                "marked_at": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None).isoformat()
            },
            # For backward compatibility
            "student_name": participant_info.get("name") if participant_info.get("type") == "student" else None,
            "faculty_name": participant_info.get("name") if participant_info.get("type") == "faculty" else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in scan and mark attendance: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process QR scan: {str(e)}")
