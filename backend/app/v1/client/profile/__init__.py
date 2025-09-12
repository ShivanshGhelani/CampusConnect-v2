"""
Client Profile API
Handles student and faculty profile-related API endpoints
"""
import logging
import traceback
from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException, Depends
from dependencies.auth import require_student_login, get_current_student, get_current_faculty_optional, get_current_user, require_faculty_login, require_student_login_hybrid, get_current_student_hybrid, require_faculty_login_hybrid
from models.student import Student, StudentUpdate
from models.faculty import Faculty, FacultyUpdate
from database.operations import DatabaseOperations
from typing import Union

# Import team tools router (LEGACY - DISABLED IN PHASE 3A)
# from .team_tools import router as team_tools_router

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/complete-profile")
async def get_complete_profile(student: Student = Depends(require_student_login_hybrid)):
    """Get complete profile information including stats and event history in one call - OPTIMIZED"""
    try:
        logger.info(f"Complete profile requested for student: {student.enrollment_no}")
        
        # Get complete student data from database
        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": student.enrollment_no})
        if not student_data:
            return {"success": False, "message": "Student profile not found"}
        
        # Build profile data (same as /info endpoint but optimized)
        def get_mobile_number():
            """Get mobile number from various possible field names"""
            return (student_data.get('mobile_no') or 
                   student_data.get('phone_number') or 
                   student_data.get('contact_no') or 
                   '')
        
        def format_date_field(date_value):
            """Safely format date fields"""
            if not date_value:
                return ''
            if hasattr(date_value, 'isoformat'):
                return date_value.isoformat().split('T')[0]  # Return only date part
            return str(date_value)
        
        profile_data = {
            "enrollment_no": student_data.get('enrollment_no', ''),
            "enrollment_number": student_data.get('enrollment_no', ''),  # Alternative field name
            "full_name": student_data.get('full_name', ''),
            "email": student_data.get('email', ''),
            "mobile_no": get_mobile_number(),
            "phone_number": get_mobile_number(),  # Provide both for compatibility
            "department": student_data.get('department', ''),
            "semester": student_data.get('semester', ''),
            "year_of_admission": student_data.get('year_of_admission', ''),
            "date_of_birth": format_date_field(student_data.get('date_of_birth')),
            "gender": student_data.get('gender', ''),
            "address": student_data.get('address', ''),
            "parent_mobile": student_data.get('parent_mobile', ''),
            "emergency_contact": student_data.get('emergency_contact', ''),
            "profile_created_at": student_data.get('created_at', '').isoformat() if hasattr(student_data.get('created_at', ''), 'isoformat') else student_data.get('created_at', ''),
            "last_updated": student_data.get('updated_at', '').isoformat() if hasattr(student_data.get('updated_at', ''), 'isoformat') else student_data.get('updated_at', ''),
            "is_active": student_data.get('is_active', True),
            "avatar_url": student_data.get('avatar_url', None)
        }
        
        # Get event participations - FIXED: event_participations is a list
        event_participations = student_data.get('event_participations', [])
        
        # Build dashboard stats and event history simultaneously for efficiency
        stats = {
            "total_registrations": len(event_participations),
            "attendance_marked": 0,
            "feedback_submitted": 0,
            "certificates_earned": 0,
            "individual_registrations": 0,
            "team_registrations": 0,
            "recent_activities": []
        }
        
        event_history = []
        
        # Process all participations in one pass for efficiency
        for participation in event_participations:
            event_id = participation.get('event_id')
            
            # Count statistics
            if participation.get('attendance_id'):
                stats["attendance_marked"] += 1
            if participation.get('feedback_id'):
                stats["feedback_submitted"] += 1
            if participation.get('certificate_id'):
                stats["certificates_earned"] += 1
            
            # Count registration types
            reg_type = participation.get('registration_type', 'individual')
            if reg_type in ['team_leader', 'team_participant']:
                stats["team_registrations"] += 1
            else:
                stats["individual_registrations"] += 1
            
            # Collect recent activities
            activities = []
            if participation.get('registration_date'):
                activities.append({
                    "type": "registration",
                    "event_id": event_id,
                    "timestamp": participation.get('registration_date'),
                    "description": f"Registered for event"
                })
            if participation.get('attendance_marked_at'):
                activities.append({
                    "type": "attendance",
                    "event_id": event_id,
                    "timestamp": participation.get('attendance_marked_at'),
                    "description": f"Attended event"
                })
            if participation.get('feedback_submitted_at'):
                activities.append({
                    "type": "feedback",
                    "event_id": event_id,
                    "timestamp": participation.get('feedback_submitted_at'),
                    "description": f"Submitted feedback"
                })
            
            stats["recent_activities"].extend(activities)
            
            # Build event history entry (only if we need the event data)
            if event_id:
                event = await DatabaseOperations.find_one("events", {"event_id": event_id})
                if event:
                    history_item = {
                        "event_id": event_id,
                        "event_name": event.get('event_name', ''),
                        "event_date": event.get('start_datetime', ''),
                        "venue": event.get('venue', ''),
                        "category": event.get('category', ''),
                        "status": event.get('status', ''),
                        "sub_status": event.get('sub_status', ''),
                        "registration_data": {
                            "registration_id": participation.get('registration_id'),
                            "registration_type": participation.get('registration_type', 'individual'),
                            "registration_date": participation.get('registration_date'),
                            "team_name": participation.get('team_name') or participation.get('student_data', {}).get('team_name'),
                            "team_registration_id": participation.get('team_registration_id'),
                            "is_team_leader": participation.get('is_team_leader', False)
                        },
                        "participation_status": {
                            "attended": bool(participation.get('attendance_id')),
                            "attendance_id": participation.get('attendance_id'),
                            "attendance_date": participation.get('attendance_marked_at'),
                            "feedback_submitted": bool(participation.get('feedback_id')),
                            "feedback_id": participation.get('feedback_id'),
                            "feedback_date": participation.get('feedback_submitted_at'),
                            "certificate_earned": bool(participation.get('certificate_id')),
                            "certificate_id": participation.get('certificate_id')
                        }
                    }
                    event_history.append(history_item)
        
        # Sort activities and history by timestamp
        def get_activity_sort_key(x):
            timestamp = x.get('timestamp', datetime.min)
            if isinstance(timestamp, str):
                try:
                    if timestamp:
                        dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                        if dt.tzinfo is None:
                            dt = dt.replace(tzinfo=timezone.utc)
                        return dt
                    else:
                        return datetime.min.replace(tzinfo=timezone.utc)
                except:
                    return datetime.min.replace(tzinfo=timezone.utc)
            elif hasattr(timestamp, 'year'):
                if timestamp.tzinfo is None:
                    timestamp = timestamp.replace(tzinfo=timezone.utc)
                return timestamp
            else:
                return datetime.min.replace(tzinfo=timezone.utc)
        
        def get_event_sort_key(x):
            date_val = x.get('event_date', '')
            if isinstance(date_val, str):
                try:
                    if date_val:
                        dt = datetime.fromisoformat(date_val.replace('Z', '+00:00'))
                        if dt.tzinfo is None:
                            dt = dt.replace(tzinfo=timezone.utc)
                        return dt
                    else:
                        return datetime.min.replace(tzinfo=timezone.utc)
                except:
                    return datetime.min.replace(tzinfo=timezone.utc)
            elif hasattr(date_val, 'year'):
                if date_val.tzinfo is None:
                    date_val = date_val.replace(tzinfo=timezone.utc)
                return date_val
            else:
                return datetime.min.replace(tzinfo=timezone.utc)
        
        stats["recent_activities"].sort(key=get_activity_sort_key, reverse=True)
        stats["recent_activities"] = stats["recent_activities"][:10]  # Limit to last 10
        
        event_history.sort(key=get_event_sort_key, reverse=True)
        
        # Calculate participation rates
        if stats["total_registrations"] > 0:
            stats["attendance_rate"] = round(
                (stats["attendance_marked"] / stats["total_registrations"]) * 100, 1
            )
            stats["feedback_rate"] = round(
                (stats["feedback_submitted"] / stats["total_registrations"]) * 100, 1
            )
        else:
            stats["attendance_rate"] = 0
            stats["feedback_rate"] = 0
        
        logger.info(f"Complete profile data retrieved for {student.enrollment_no}: {len(event_history)} events, {len(stats['recent_activities'])} activities")
        
        return {
            "success": True,
            "message": "Complete profile information retrieved successfully",
            "profile": profile_data,
            "stats": stats,
            "event_history": event_history
        }
        
    except Exception as e:
        logger.error(f"Error getting complete profile: {str(e)}")
        return {"success": False, "message": f"Error retrieving complete profile: {str(e)}"}

@router.get("/faculty/complete-profile")
async def get_faculty_complete_profile(faculty: Faculty = Depends(require_faculty_login_hybrid)):
    """Get complete faculty profile information including stats and event history in one call - OPTIMIZED"""
    try:
        logger.info(f"Complete faculty profile requested for: {faculty.employee_id}")
        
        # Get complete faculty data from database
        faculty_data = await DatabaseOperations.find_one("faculties", {"employee_id": faculty.employee_id})
        if not faculty_data:
            return {"success": False, "message": "Faculty profile not found"}
        
        # Check both possible field names for event participations
        event_participations = (
            faculty_data.get('event_participations', []) or 
            faculty_data.get('event_participation', [])
        )
        
        # Build profile data
        profile_data = {
            "employee_id": faculty_data.get('employee_id', ''),
            "full_name": faculty_data.get('full_name', ''),
            "email": faculty_data.get('email', ''),
            "contact_no": faculty_data.get('contact_no', ''),
            "department": faculty_data.get('department', ''),
            "designation": faculty_data.get('designation', ''),
            "qualification": faculty_data.get('qualification', ''),
            "specialization": faculty_data.get('specialization', ''),
            "experience_years": faculty_data.get('experience_years', ''),
            "seating": faculty_data.get('seating', ''),
            "gender": faculty_data.get('gender', ''),
            "date_of_birth": faculty_data.get('date_of_birth', ''),
            "date_of_joining": faculty_data.get('date_of_joining', ''),
            "avatar_url": faculty_data.get('avatar_url'),
            "profile_created_at": faculty_data.get('created_at', '').isoformat() if hasattr(faculty_data.get('created_at', ''), 'isoformat') else faculty_data.get('created_at', ''),
            "last_updated": faculty_data.get('updated_at', '').isoformat() if hasattr(faculty_data.get('updated_at', ''), 'isoformat') else faculty_data.get('updated_at', ''),
            "is_active": faculty_data.get('is_active', True),
            "event_participation": event_participations
        }
        
        # Process event participations for stats and history
        if event_participations and isinstance(event_participations[0], dict):
            participation_count = len(event_participations)
            event_ids = [p.get('event_id') for p in event_participations if p.get('event_id')]
            participations_dict = {p.get('event_id'): p for p in event_participations if p.get('event_id')}
        else:
            participation_count = len(event_participations)
            event_ids = event_participations
            participations_dict = {}
        
        # Build dashboard stats
        stats = {
            "total_events_participated": participation_count,
            "total_registrations": participation_count,
            "attendance_marked": participation_count,
            "feedback_submitted": 0,
            "certificates_earned": participation_count,
            "individual_registrations": participation_count,
            "team_registrations": 0,
            "recent_activities": []
        }
        
        # Build event history
        event_history = []
        
        # Process each event participation for history
        for event_id in event_ids[-10:]:  # Limit to last 10 for performance
            try:
                event = await DatabaseOperations.find_one("events", {"event_id": event_id})
                if not event:
                    continue
                
                # Get faculty registration for this event
                registration = await DatabaseOperations.find_one(
                    "faculty_registrations",
                    {
                        "faculty.employee_id": faculty.employee_id,
                        "event.event_id": event_id
                    }
                )
                
                participation_data = participations_dict.get(event_id, {})
                
                history_item = {
                    "event_id": event_id,
                    "event_name": event.get("event_name", "Unknown Event"),
                    "event_date": event.get("start_datetime"),
                    "venue": event.get("venue", "TBD"),
                    "category": event.get("event_type", "Unknown"),
                    "status": event.get("status", "unknown"),
                    "sub_status": event.get("sub_status", "unknown"),
                    "registration_data": {
                        "registration_id": (
                            participation_data.get("registration_id") or
                            registration.get("registration_id", "N/A") if registration else "N/A"
                        ),
                        "registration_type": (
                            participation_data.get("registration_type") or
                            registration.get("registration", {}).get("registration_type", "individual") if registration else "individual"
                        ),
                        "registration_date": (
                            participation_data.get("registration_date") or
                            registration.get("registration", {}).get("registered_at") if registration else None
                        ),
                        "status": (
                            participation_data.get("status") or
                            registration.get("registration", {}).get("status", "confirmed") if registration else "confirmed"
                        )
                    },
                    "participation_status": participation_data.get("status", "registered")
                }
                
                event_history.append(history_item)
                
                # Add to recent activities
                stats["recent_activities"].append({
                    "event_id": event_id,
                    "event_name": event.get("event_name", "Unknown Event"),
                    "event_type": event.get("event_type", "Unknown"),
                    "status": "participated",
                    "date": event.get("start_datetime", datetime.now()).isoformat() if event.get("start_datetime") else datetime.now().isoformat()
                })
                
            except Exception as e:
                logger.warning(f"Error processing event {event_id} for faculty {faculty.employee_id}: {e}")
                continue
        
        # Sort event history by date (most recent first)
        def get_sort_key(item):
            event_date = item.get("event_date")
            if event_date:
                try:
                    return datetime.fromisoformat(str(event_date).replace('Z', '+00:00'))
                except (ValueError, AttributeError):
                    return datetime.min
            return datetime.min
        
        event_history.sort(key=get_sort_key, reverse=True)
        stats["recent_activities"].sort(key=lambda x: x.get("date", ""), reverse=True)
        
        logger.info(f"Complete faculty profile data retrieved for {faculty.employee_id}: {len(event_history)} events, {len(stats['recent_activities'])} activities")
        
        return {
            "success": True,
            "message": "Complete faculty profile information retrieved successfully",
            "profile": profile_data,
            "stats": stats,
            "event_history": event_history
        }
        
    except Exception as e:
        logger.error(f"Error getting complete faculty profile: {str(e)}")
        return {"success": False, "message": f"Error retrieving complete faculty profile: {str(e)}"}


@router.put("/update")
async def update_profile(request: Request, student: Student = Depends(require_student_login_hybrid)):
    """Update student profile information"""
    try:
        data = await request.json()        # Define updatable fields
        updatable_fields = [
            'full_name', 'email', 'mobile_no', 'department', 'semester',
            'date_of_birth', 'gender', 'address', 'parent_mobile', 'emergency_contact',
            'avatar_path', 'avatar_url'
        ]
          # Build update data with only allowed fields
        update_data = {}
        for field in updatable_fields:
            if field in data:
                # Allow null values for avatar_url (to remove avatar)
                if field == 'avatar_url' or data[field] is not None:
                    update_data[field] = data[field]
        
        if not update_data:
            return {"success": False, "message": "No valid fields provided for update"}
        
        # Add timestamp
        update_data['updated_at'] = datetime.utcnow()
          # Update database
        result = await DatabaseOperations.update_one(
            "students",
            {"enrollment_no": student.enrollment_no},
            {"$set": update_data}
        )
        
        if result:
            return {
                "success": True,
                "message": "Profile updated successfully",
                "updated_fields": list(update_data.keys())
            }
        else:
            return {"success": False, "message": "No changes were made to the profile"}
        
    except Exception as e:
        logger.error(f"Error updating profile: {str(e)}")
        return {"success": False, "message": f"Error updating profile: {str(e)}"}


@router.put("/faculty/update")
async def update_faculty_profile(request: Request, faculty: Faculty = Depends(get_current_faculty_optional)):
    """Update faculty profile information"""
    if not faculty:
        raise HTTPException(status_code=401, detail="Faculty not logged in")
    
    try:
        data = await request.json()
        
        # Define updatable fields for faculty
        updatable_fields = [
            'full_name', 'email', 'contact_no', 'department', 'designation',
            'qualification', 'specialization', 'experience_years', 'seating',
            'gender', 'date_of_birth', 'date_of_joining', 'avatar_url'
        ]
        
        # Build update data with only allowed fields
        update_data = {}
        for field in updatable_fields:
            if field in data:
                # Allow null values for avatar_url (to remove avatar)
                if field == 'avatar_url' or data[field] is not None:
                    update_data[field] = data[field]
        
        # Handle password change if provided
        if 'new_password' in data and data['new_password']:
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            
            # Verify current password first
            if 'current_password' not in data:
                return {"success": False, "message": "Current password is required to change password"}
            
            # Get current faculty data to verify password
            faculty_data = await DatabaseOperations.find_one("faculties", {"employee_id": faculty.employee_id})
            if not faculty_data:
                return {"success": False, "message": "Faculty not found"}
            
            # Verify current password
            if not pwd_context.verify(data['current_password'], faculty_data.get('password', '')):
                return {"success": False, "message": "Current password is incorrect"}
            
            # Update password
            update_data['password'] = pwd_context.hash(data['new_password'])
        
        if not update_data:
            return {"success": False, "message": "No valid fields provided for update"}
        
        # Add timestamp
        update_data['updated_at'] = datetime.utcnow()
        
        # Update database
        result = await DatabaseOperations.update_one(
            "faculties",
            {"employee_id": faculty.employee_id},
            {"$set": update_data}
        )
        
        if result:
            return {
                "success": True,
                "message": "Faculty profile updated successfully",
                "updated_fields": list(update_data.keys())
            }
        else:
            return {"success": False, "message": "No changes were made to the profile"}
        
    except Exception as e:
        logger.error(f"Error updating faculty profile: {str(e)}")
        return {"success": False, "message": f"Error updating profile: {str(e)}"}



@router.post("/change-password")
async def change_password(request: Request, student: Student = Depends(require_student_login_hybrid)):
    """Change student password"""
    try:
        data = await request.json()
        current_password = data.get("current_password")
        new_password = data.get("new_password")
        confirm_password = data.get("confirm_password")
        
        if not all([current_password, new_password, confirm_password]):
            return {"success": False, "message": "All password fields are required"}
        
        if new_password != confirm_password:
            return {"success": False, "message": "New password and confirmation do not match"}
        
        if len(new_password) < 6:
            return {"success": False, "message": "New password must be at least 6 characters long"}
        
        # Get student data to verify current password
        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": student.enrollment_no})
        if not student_data:
            return {"success": False, "message": "Student not found"}
        
        # Verify current password using the same method as authentication
        from models.student import Student as StudentModel
        
        if not StudentModel.verify_password(current_password, student_data.get('password_hash', '')):
            return {"success": False, "message": "Current password is incorrect"}
        
        # Hash new password using the same method as registration
        hashed_new_password = StudentModel.hash_password(new_password)
        
        # Update password in database (note: field is 'password_hash', not 'password')
        result = await DatabaseOperations.update_one(
            "students",
            {"enrollment_no": student.enrollment_no},
            {"$set": {
                "password_hash": hashed_new_password,
                "updated_at": datetime.utcnow()
            }}
        )
        
        if result:  # DatabaseOperations.update_one returns boolean
            return {
                "success": True,
                "message": "Password changed successfully"
            }
        else:
            return {"success": False, "message": "Failed to update password"}
        
    except Exception as e:
        logger.error(f"Error changing password: {str(e)}")
        return {"success": False, "message": f"Error changing password: {str(e)}"}



# PHASE 4A: LEGACY TEAM ENDPOINTS - Redirect to unified team endpoints
# These endpoints are replaced by the Phase 3A unified team management system

@router.get("/team-details/{event_id}/{team_id}")
async def get_team_details(
    event_id: str, 
    team_id: str, 
    student: Student = Depends(require_student_login_hybrid)
):
    """LEGACY: Redirect to unified team endpoint - Get detailed team member information"""
    logger.info(f"PHASE 4A: Redirecting /team-details to unified team endpoint")
    # Redirect to unified team data endpoint
    from .team_tools import get_unified_team_data
    return await get_unified_team_data(event_id, mode="info", student_data={"enrollment_no": student.enrollment_no})


@router.get("/test-auth")
async def test_auth(student: Student = Depends(require_student_login_hybrid)):
    """PHASE 4A: REMOVED IN PRODUCTION - Test endpoint for authentication verification"""
    logger.warning(f"PHASE 4A: /test-auth endpoint should be removed in production")
    return {
        "success": True,
        "message": "Student authentication working - REMOVE IN PRODUCTION",
        "student_enrollment": student.enrollment_no,
        "student_name": student.full_name,
        "phase_4a_note": "This endpoint will be removed in production deployment"
    }

@router.get("/team-info/{event_id}/{team_id}")
async def get_team_info(
    event_id: str, 
    team_id: str, 
    request: Request
):
    """LEGACY: Redirect to unified team endpoint - Get detailed team member information"""
    logger.info(f"PHASE 4A: Redirecting /team-info to unified team endpoint")
    
    # Try to get student from session for auth context
    try:
        from dependencies.auth import get_current_student
        student = await get_current_student(request)
        student_data = {"enrollment_no": student.enrollment_no}
    except Exception:
        # If auth fails, use guest mode
        student_data = {"enrollment_no": "guest"}
    
    # Redirect to unified team data endpoint
    from .team_tools import get_unified_team_data
    result = await get_unified_team_data(event_id, mode="info", student_data=student_data)
    
    # Add legacy compatibility note
    result["legacy_note"] = "PHASE 4A: This endpoint redirects to unified team management"
    result["unified_endpoint"] = f"/api/v1/client/profile/team/{event_id}/unified?mode=info"
    
    return result

@router.get("/team-registration-details/{event_id}")
async def get_team_registration_details(
    event_id: str,
    student: Student = Depends(require_student_login_hybrid)
):
    """LEGACY: Redirect to unified team endpoint - Get complete team registration details"""
    logger.info(f"PHASE 4A: Redirecting /team-registration-details to unified team endpoint")
    
    # Redirect to unified team data endpoint with registration mode
    from .team_tools import get_unified_team_data
    result = await get_unified_team_data(event_id, mode="full", student_data={"enrollment_no": student.enrollment_no})
    
    # Add legacy compatibility note
    result["legacy_note"] = "PHASE 4A: This endpoint redirects to unified team management"
    result["unified_endpoint"] = f"/api/v1/client/profile/team/{event_id}/unified?mode=full"
    
    return result

# Include team management tools (LEGACY - DISABLED IN PHASE 3A)
# router.include_router(team_tools_router, prefix="/team-tools", tags=["Team Management"])

# PHASE 3A: Include consolidated team management - REPLACES old team_tools.py (11 endpoints eliminated)
from .team_tools import router as team_tools_router
router.include_router(team_tools_router, prefix="", tags=["Team Management"])
