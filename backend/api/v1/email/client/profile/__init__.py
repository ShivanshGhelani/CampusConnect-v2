"""
Client Profile API
Handles student and faculty profile-related API endpoints
"""
import logging
import traceback
from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException, Depends
from dependencies.auth import require_student_login, get_current_student, get_current_faculty_optional, get_current_user, require_faculty_login
from models.student import Student, StudentUpdate
from models.faculty import Faculty, FacultyUpdate
from database.operations import DatabaseOperations
from typing import Union

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/complete-profile")
async def get_complete_profile(student: Student = Depends(require_student_login)):
    """Get complete profile information including stats and event history in one call"""
    try:
        # Get complete student data from database
        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": student.enrollment_no})
        if not student_data:
            return {"success": False, "message": "Student profile not found"}
        
        # Build profile data (same as /info endpoint)
        profile_data = {
            "enrollment_no": student_data.get('enrollment_no', ''),
            "full_name": student_data.get('full_name', ''),
            "email": student_data.get('email', ''),
            "mobile_no": student_data.get('mobile_no', ''),
            "department": student_data.get('department', ''),
            "semester": student_data.get('semester', ''),
            "year_of_admission": student_data.get('year_of_admission', ''),
            "date_of_birth": student_data.get('date_of_birth', ''),
            "gender": student_data.get('gender', ''),
            "address": student_data.get('address', ''),
            "parent_mobile": student_data.get('parent_mobile', ''),
            "emergency_contact": student_data.get('emergency_contact', ''),
            "profile_created_at": student_data.get('created_at', '').isoformat() if hasattr(student_data.get('created_at', ''), 'isoformat') else student_data.get('created_at', ''),
            "last_updated": student_data.get('updated_at', '').isoformat() if hasattr(student_data.get('updated_at', ''), 'isoformat') else student_data.get('updated_at', ''),
            "is_active": student_data.get('is_active', True),
            "avatar_url": student_data.get('avatar_url', None)
        }
        
        # Get event participations for stats and history
        event_participations = student_data.get('event_participations', {})
        
        # Build dashboard stats (same as /dashboard-stats endpoint)
        stats = {
            "total_registrations": len(event_participations),
            "attendance_marked": 0,
            "feedback_submitted": 0,
            "certificates_earned": 0,
            "individual_registrations": 0,
            "team_registrations": 0,
            "recent_activities": []
        }
        
        # Calculate statistics and build event history simultaneously
        event_history = []
        
        for event_id, participation in event_participations.items():
            # Count attendance
            if participation.get('attendance_id'):
                stats["attendance_marked"] += 1
            
            # Count feedback
            if participation.get('feedback_id'):
                stats["feedback_submitted"] += 1
            
            # Count certificates
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
            if participation.get('registration_datetime'):
                activities.append({
                    "type": "registration",
                    "event_id": event_id,
                    "timestamp": participation.get('registration_datetime'),
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
            
            # Build event history entry
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
                        "registration_date": participation.get('registration_datetime'),
                        "team_name": participation.get('student_data', {}).get('team_name'),
                        "team_registration_id": participation.get('team_registration_id')
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

@router.get("/info")
async def get_profile_info(student: Student = Depends(require_student_login)):
    """Get current student profile information"""
    try:
        # Get complete student data from database
        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": student.enrollment_no})
        if not student_data:
            return {"success": False, "message": "Student profile not found"}
          # Remove sensitive information and ensure all fields are JSON serializable
        profile_data = {
            "enrollment_no": student_data.get('enrollment_no', ''),
            "full_name": student_data.get('full_name', ''),
            "email": student_data.get('email', ''),
            "mobile_no": student_data.get('mobile_no', ''),
            "department": student_data.get('department', ''),
            "semester": student_data.get('semester', ''),
            "year_of_admission": student_data.get('year_of_admission', ''),
            "date_of_birth": student_data.get('date_of_birth', ''),
            "gender": student_data.get('gender', ''),
            "address": student_data.get('address', ''),
            "parent_mobile": student_data.get('parent_mobile', ''),
            "emergency_contact": student_data.get('emergency_contact', ''),
            "profile_created_at": student_data.get('created_at', '').isoformat() if hasattr(student_data.get('created_at', ''), 'isoformat') else student_data.get('created_at', ''),
            "last_updated": student_data.get('updated_at', '').isoformat() if hasattr(student_data.get('updated_at', ''), 'isoformat') else student_data.get('updated_at', ''),
            "is_active": student_data.get('is_active', True),
            "avatar_url": student_data.get('avatar_url', None)
        }
        
        return {
            "success": True,
            "message": "Profile information retrieved successfully",
            "profile": profile_data
        }
        
    except Exception as e:
        logger.error(f"Error getting profile info: {str(e)}")
        return {"success": False, "message": f"Error retrieving profile: {str(e)}"}

@router.put("/update")
async def update_profile(request: Request, student: Student = Depends(require_student_login)):
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

@router.get("/faculty/info")
async def get_faculty_profile_info(faculty: Faculty = Depends(require_faculty_login)):
    """Get current faculty profile information"""
    try:
        # Get complete faculty data from database
        faculty_data = await DatabaseOperations.find_one("faculties", {"employee_id": faculty.employee_id})
        if not faculty_data:
            return {"success": False, "message": "Faculty profile not found"}
        
        # Remove sensitive information
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
            "avatar_url": faculty_data.get('avatar_url'),  # Include avatar URL
            "profile_created_at": faculty_data.get('created_at', '').isoformat() if hasattr(faculty_data.get('created_at', ''), 'isoformat') else faculty_data.get('created_at', ''),
            "last_updated": faculty_data.get('updated_at', '').isoformat() if hasattr(faculty_data.get('updated_at', ''), 'isoformat') else faculty_data.get('updated_at', ''),
            "is_active": faculty_data.get('is_active', True),
            "event_participation": faculty_data.get('event_participation', [])
        }
        
        return {
            "success": True,
            "message": "Faculty profile information retrieved successfully",
            "profile": profile_data
        }
        
    except Exception as e:
        logger.error(f"Error getting faculty profile info: {str(e)}")
        return {"success": False, "message": f"Error retrieving profile: {str(e)}"}

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

@router.get("/dashboard-stats")
async def get_dashboard_stats(student: Student = Depends(require_student_login)):
    """Get dashboard statistics for the student"""
    try:
        # Get student data
        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": student.enrollment_no})
        if not student_data:
            return {"success": False, "message": "Student not found"}
        
        # Analyze event participations
        event_participations = student_data.get('event_participations', {})
        
        stats = {
            "total_registrations": len(event_participations),
            "attendance_marked": 0,
            "feedback_submitted": 0,
            "certificates_earned": 0,
            "individual_registrations": 0,
            "team_registrations": 0,
            "recent_activities": []
        }
        
        # Calculate statistics
        for event_id, participation in event_participations.items():
            # Count attendance
            if participation.get('attendance_id'):
                stats["attendance_marked"] += 1
            
            # Count feedback
            if participation.get('feedback_id'):
                stats["feedback_submitted"] += 1
            
            # Count certificates
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
            if participation.get('registration_datetime'):
                activities.append({
                    "type": "registration",
                    "event_id": event_id,
                    "timestamp": participation.get('registration_datetime'),
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
        
        # Sort recent activities by timestamp (most recent first)
        def get_activity_sort_key(x):
            timestamp = x.get('timestamp', datetime.min)
            if isinstance(timestamp, str):
                try:
                    if timestamp:
                        # Parse ISO string and make it timezone-aware (UTC)
                        dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                        if dt.tzinfo is None:
                            # If somehow still naive, assume UTC
                            dt = dt.replace(tzinfo=timezone.utc)
                        return dt
                    else:
                        # Return timezone-aware datetime.min
                        return datetime.min.replace(tzinfo=timezone.utc)
                except:
                    return datetime.min.replace(tzinfo=timezone.utc)
            elif hasattr(timestamp, 'year'):  # datetime object
                # Ensure it's timezone-aware
                if timestamp.tzinfo is None:
                    timestamp = timestamp.replace(tzinfo=timezone.utc)
                return timestamp
            else:
                return datetime.min.replace(tzinfo=timezone.utc)
        
        stats["recent_activities"].sort(key=get_activity_sort_key, reverse=True)
        
        # Limit to last 10 activities
        stats["recent_activities"] = stats["recent_activities"][:10]
        
        # Calculate participation rate
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
        
        return {
            "success": True,
            "message": "Dashboard statistics retrieved successfully",
            "stats": stats
        }
        
    except Exception as e:
        logger.error(f"Error getting dashboard stats: {str(e)}")
        return {"success": False, "message": f"Error retrieving dashboard stats: {str(e)}"}

@router.get("/event-history")
async def get_event_history(student: Student = Depends(require_student_login)):
    """Get complete event participation history for the student"""
    try:
        # Get student data
        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": student.enrollment_no})
        if not student_data:
            return {"success": False, "message": "Student not found"}
        
        # Get event participations
        event_participations = student_data.get('event_participations', {})
        
        if not event_participations:
            return {
                "success": True,
                "message": "No event participation history found",
                "event_history": []
            }
        
        # Get event details for each participation
        event_history = []
        for event_id, participation in event_participations.items():
            # Get event details
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
                        "registration_date": participation.get('registration_datetime'),
                        "team_name": participation.get('student_data', {}).get('team_name'),
                        "team_registration_id": participation.get('team_registration_id')
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
        
        # Sort by event date (most recent first)
        def get_sort_key(x):
            date_val = x.get('event_date', '')
            if isinstance(date_val, str):
                try:
                    if date_val:
                        # Parse ISO string and make it timezone-aware (UTC)
                        dt = datetime.fromisoformat(date_val.replace('Z', '+00:00'))
                        if dt.tzinfo is None:
                            # If somehow still naive, assume UTC
                            dt = dt.replace(tzinfo=timezone.utc)
                        return dt
                    else:
                        return datetime.min.replace(tzinfo=timezone.utc)
                except:
                    return datetime.min.replace(tzinfo=timezone.utc)
            elif hasattr(date_val, 'year'):  # datetime object
                # Ensure it's timezone-aware
                if date_val.tzinfo is None:
                    date_val = date_val.replace(tzinfo=timezone.utc)
                return date_val
            else:
                return datetime.min.replace(tzinfo=timezone.utc)
        
        event_history.sort(key=get_sort_key, reverse=True)
        
        return {
            "success": True,
            "message": f"Retrieved {len(event_history)} event participation records",
            "event_history": event_history
        }
        
    except Exception as e:
        logger.error(f"Error getting event history: {str(e)}")
        return {"success": False, "message": f"Error retrieving event history: {str(e)}"}

@router.post("/change-password")
async def change_password(request: Request, student: Student = Depends(require_student_login)):
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

@router.get("/faculty/dashboard-stats")
async def get_faculty_dashboard_stats(faculty: Faculty = Depends(require_faculty_login)):
    """Get dashboard statistics for faculty"""
    try:
        # Get faculty data
        faculty_data = await DatabaseOperations.find_one("faculties", {"employee_id": faculty.employee_id})
        if not faculty_data:
            return {"success": False, "message": "Faculty not found"}
        
        # Analyze event participations
        event_participation = faculty_data.get('event_participation', [])
        
        stats = {
            "total_events_participated": len(event_participation),
            "total_registrations": len(event_participation),  # For compatibility with frontend
            "attendance_marked": len(event_participation),   # Assuming faculty attended events they participated in
            "feedback_submitted": 0,  # Could be extended based on faculty feedback system
            "certificates_earned": len(event_participation),  # Assuming faculty get certificates
            "individual_registrations": len(event_participation),
            "team_registrations": 0,  # Faculty typically don't do team registrations
            "recent_activities": []
        }
        
        # Get recent activities (limit to last 5 events)
        if event_participation:
            # Get event details for recent activities
            recent_event_ids = event_participation[-5:]  # Last 5 events
            for event_id in recent_event_ids:
                try:
                    event = await DatabaseOperations.find_one("events", {"event_id": event_id})
                    if event:
                        stats["recent_activities"].append({
                            "event_id": event_id,
                            "event_name": event.get("event_name", "Unknown Event"),
                            "event_type": event.get("event_type", "Unknown"),
                            "status": "participated",
                            "date": event.get("start_datetime", datetime.now()).isoformat() if event.get("start_datetime") else datetime.now().isoformat()
                        })
                except Exception as e:
                    logger.warning(f"Error getting event details for {event_id}: {e}")
                    continue
        
        return {
            "success": True,
            "message": "Faculty dashboard stats retrieved successfully",
            "stats": stats
        }
        
    except Exception as e:
        logger.error(f"Error getting faculty dashboard stats: {str(e)}")
        return {"success": False, "message": f"Error retrieving dashboard stats: {str(e)}"}


@router.get("/team-details/{event_id}/{team_id}")
async def get_team_details(
    event_id: str, 
    team_id: str, 
    student: Student = Depends(require_student_login)
):
    """Get detailed team member information for a specific team and event"""
    try:
        # Get the event to verify it exists
        event = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event:
            return {"success": False, "message": "Event not found"}
        
        # Find all students who have this event in their participations with the matching team_id
        students = await DatabaseOperations.find_many("students", {
            f"event_participations.{event_id}.team_registration_id": team_id
        })
        
        if not students:
            return {"success": False, "message": "No team members found for this team"}
        
        # Get team member details
        team_members = []
        team_name = None
        
        for student_doc in students:
            # Get participation data for this student and event
            participation_data = student_doc.get("event_participations", {}).get(event_id, {})
            
            if participation_data.get("team_registration_id") == team_id:
                # Get team name from the first student (all should have the same team name)
                if not team_name:
                    team_name = participation_data.get("student_data", {}).get("team_name", "Unknown Team")
                
                member_info = {
                    "enrollment_no": student_doc.get("enrollment_no", "Unknown"),
                    "full_name": student_doc.get("full_name", "Unknown"),
                    "registration_id": participation_data.get("registration_id", "N/A"),
                    "registration_type": participation_data.get("registration_type", "team_member"),
                    "team_registration_id": team_id,
                    "attendance": {
                        "marked": bool(participation_data.get("attendance_id")),
                        "attendance_id": participation_data.get("attendance_id"),
                        "attendance_date": participation_data.get("attendance_marked_at")
                    },
                    "feedback": {
                        "submitted": bool(participation_data.get("feedback_id")),
                        "feedback_id": participation_data.get("feedback_id")
                    },
                    "certificate": {
                        "earned": bool(participation_data.get("certificate_id")),
                        "certificate_id": participation_data.get("certificate_id")
                    }
                }
                team_members.append(member_info)
        
        # Sort team members: team leader first, then team members
        team_members.sort(key=lambda x: (x["registration_type"] not in ["team_leader", "team"], x["full_name"]))
        
        return {
            "success": True,
            "message": "Team details retrieved successfully",
            "data": {
                "team_name": team_name or "Unknown Team",
                "team_id": team_id,
                "event_id": event_id,
                "event_name": event.get("event_name", ""),
                "total_members": len(team_members),
                "members": team_members
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting team details: {str(e)}")
        return {"success": False, "message": f"Error retrieving team details: {str(e)}"}


@router.get("/test-auth")
async def test_auth(student: Student = Depends(require_student_login)):
    """Simple test endpoint to check if student authentication works"""
    return {
        "success": True,
        "message": "Student authentication working",
        "student_enrollment": student.enrollment_no,
        "student_name": student.full_name
    }

@router.get("/team-info-debug/{event_id}/{team_id}")
async def get_team_info_debug(event_id: str, team_id: str):
    """Debug version without authentication requirement"""
    try:
        logger.info(f"Getting team info (debug) for event {event_id}, team {team_id}")
        
        # Get the event to verify it exists
        event = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event:
            logger.warning(f"Event {event_id} not found")
            return {"success": False, "message": "Event not found"}
        
        # Get team information from event registrations
        registrations = event.get('registrations', {})
        team_registration = None
        team_leader_data = None
        
        logger.info(f"Found {len(registrations)} registrations for event {event_id}")
        
        # Find the team leader's registration to get team name
        for reg_id, reg_data in registrations.items():
            if (reg_data and 
                reg_data.get('registration_type') == 'team' and
                reg_data.get('team_registration_id') == team_id):
                team_registration = reg_data
                team_leader_data = reg_data.get('student_data', {})
                logger.info(f"Found team leader registration {reg_id}")
                break
        
        if not team_registration:
            logger.warning(f"Team registration not found for team {team_id}")
            return {"success": False, "message": "Team registration not found"}
        
        team_name = team_leader_data.get('team_name', 'Unknown Team')
        logger.info(f"Team name: {team_name}")
        
        # Get all team members from the leader's team_members array
        team_members_array = team_leader_data.get('team_members', [])
        logger.info(f"Found {len(team_members_array)} team members in array")
        
        # Build complete team member list including leader
        team_members = []
        
        # Add team leader first
        leader_info = {
            "enrollment_no": team_leader_data.get("enrollment_no", "Unknown"),
            "full_name": team_leader_data.get("full_name", "Unknown"),
            "registration_id": team_registration.get("registration_id", "N/A"),
            "registration_type": "team_leader",
            "team_registration_id": team_id,
            "email": team_leader_data.get("email", ""),
            "phone": team_leader_data.get("mobile_no", ""),
            "course": team_leader_data.get("department", ""),
            "semester": team_leader_data.get("semester", ""),
            "attendance": {
                "marked": False,
                "attendance_id": None,
                "attendance_date": None
            },
            "feedback": {
                "submitted": False,
                "feedback_id": None
            },
            "certificate": {
                "earned": False,
                "certificate_id": None
            }
        }
        team_members.append(leader_info)
        
        # Add team members
        for member in team_members_array:
            if member and member.get('enrollment_no'):
                # Find the member's individual registration for registration_id
                member_reg_id = "N/A"
                for reg_id, reg_data in registrations.items():
                    if (reg_data and 
                        reg_data.get('student_data', {}).get('enrollment_no') == member.get('enrollment_no') and
                        reg_data.get('registration_type') == 'team_member'):
                        member_reg_id = reg_data.get('registration_id', reg_id)
                        break
                
                member_info = {
                    "enrollment_no": member.get("enrollment_no", "Unknown"),
                    "full_name": member.get("full_name", "Unknown"),
                    "registration_id": member_reg_id,
                    "registration_type": "team_member",
                    "team_registration_id": team_id,
                    "email": member.get("email", ""),
                    "phone": member.get("phone", ""),
                    "course": member.get("course", ""),
                    "semester": member.get("semester", ""),
                    "attendance": {
                        "marked": False,
                        "attendance_id": None,
                        "attendance_date": None
                    },
                    "feedback": {
                        "submitted": False,
                        "feedback_id": None
                    },
                    "certificate": {
                        "earned": False,
                        "certificate_id": None
                    }
                }
                team_members.append(member_info)
        
        response = {
            "success": True,
            "message": "Team details retrieved successfully (debug mode)",
            "data": {
                "team_name": team_name,
                "team_id": team_id,
                "event_id": event_id,
                "event_name": event.get("event_name", ""),
                "total_members": len(team_members),
                "members": team_members
            }
        }
        
        logger.info(f"Successfully retrieved team info for {team_id}: {len(team_members)} members")
        return response
        
    except Exception as e:
        logger.error(f"Error getting team info (debug): {str(e)}")
        traceback.print_exc()
        return {"success": False, "message": f"Error retrieving team info: {str(e)}"}

@router.get("/team-info/{event_id}/{team_id}")
async def get_team_info(
    event_id: str, 
    team_id: str, 
    request: Request
):
    """Get detailed team member information - modified to handle auth issues"""
    try:
        # Try to get student from session, but don't fail if not present
        student = None
        try:
            from dependencies.auth import get_current_student
            student = await get_current_student(request)
            logger.info(f"Student authenticated: {student.enrollment_no}")
        except Exception as auth_error:
            logger.warning(f"Authentication failed, proceeding without student context: {auth_error}")
        
        logger.info(f"Getting team info for event {event_id}, team {team_id}")
        
        # Get the event to verify it exists
        event = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event:
            logger.warning(f"Event {event_id} not found")
            return {"success": False, "message": "Event not found"}
        
        # Get team information from event registrations
        registrations = event.get('registrations', {})
        team_registration = None
        team_leader_data = None
        
        logger.info(f"Found {len(registrations)} registrations for event {event_id}")
        
        # Find the team leader's registration to get team name
        for reg_id, reg_data in registrations.items():
            if (reg_data and 
                reg_data.get('registration_type') in ['team', 'team_leader'] and
                reg_data.get('team_registration_id') == team_id):
                team_registration = reg_data
                team_leader_data = reg_data.get('student_data', {})
                logger.info(f"Found team leader registration {reg_id}")
                break
        
        if not team_registration:
            logger.warning(f"Team registration not found for team {team_id}")
            return {"success": False, "message": "Team registration not found"}
        
        team_name = team_leader_data.get('team_name', 'Unknown Team')
        logger.info(f"Team name: {team_name}")
        
        # Get all team members from the leader's team_members array
        team_members_array = team_leader_data.get('team_members', [])
        logger.info(f"Found {len(team_members_array)} team members in array")
        
        # Also get team members from separate registrations (normalized structure)
        separate_team_members = []
        for reg_id, reg_data in registrations.items():
            if (reg_data and 
                reg_data.get('registration_type') == 'team_member' and
                reg_data.get('team_registration_id') == team_id):
                separate_team_members.append({
                    "reg_id": reg_id,
                    "data": reg_data
                })
        logger.info(f"Found {len(separate_team_members)} team members as separate registrations")
        
        # Build complete team member list including leader
        team_members = []
        
        # Add team leader first
        leader_info = {
            "enrollment_no": team_leader_data.get("enrollment_no", "Unknown"),
            "full_name": team_leader_data.get("full_name", "Unknown"),
            "registration_id": team_registration.get("registration_id", "N/A"),
            "registration_type": "team_leader",
            "team_registration_id": team_id,
            "email": team_leader_data.get("email", ""),
            "phone": team_leader_data.get("mobile_no", ""),
            "course": team_leader_data.get("department", ""),
            "semester": team_leader_data.get("semester", ""),
            "attendance": {
                "marked": False,
                "attendance_id": None,
                "attendance_date": None
            },
            "feedback": {
                "submitted": False,
                "feedback_id": None
            },
            "certificate": {
                "earned": False,
                "certificate_id": None
            }
        }
        team_members.append(leader_info)
        
        # Add team members
        for member in team_members_array:
            if member and member.get('enrollment_no'):
                # Find the member's individual registration for registration_id
                member_reg_id = "N/A"
                for reg_id, reg_data in registrations.items():
                    if (reg_data and 
                        reg_data.get('student_data', {}).get('enrollment_no') == member.get('enrollment_no') and
                        reg_data.get('registration_type') == 'team_member'):
                        member_reg_id = reg_data.get('registration_id', reg_id)
                        break
                
                member_info = {
                    "enrollment_no": member.get("enrollment_no", "Unknown"),
                    "full_name": member.get("full_name", "Unknown"),
                    "registration_id": member_reg_id,
                    "registration_type": "team_member",
                    "team_registration_id": team_id,
                    "email": member.get("email", ""),
                    "phone": member.get("phone", ""),
                    "course": member.get("course", ""),
                    "semester": member.get("semester", ""),
                    "attendance": {
                        "marked": False,
                        "attendance_id": None,
                        "attendance_date": None
                    },
                    "feedback": {
                        "submitted": False,
                        "feedback_id": None
                    },
                    "certificate": {
                        "earned": False,
                        "certificate_id": None
                    }
                }
                team_members.append(member_info)
        
        # Add team members from separate registrations (normalized structure)
        for member_reg in separate_team_members:
            reg_data = member_reg["data"]
            student_data = reg_data.get("student_data", {})
            
            member_info = {
                "enrollment_no": student_data.get("enrollment_no", "Unknown"),
                "full_name": student_data.get("full_name", "Unknown"),
                "registration_id": reg_data.get("registration_id", member_reg["reg_id"]),
                "registration_type": "team_member",
                "team_registration_id": team_id,
                "email": student_data.get("email", ""),
                "phone": student_data.get("mobile_no", ""),
                "course": student_data.get("department", ""),
                "semester": student_data.get("semester", ""),
                "attendance": {
                    "marked": False,
                    "attendance_id": None,
                    "attendance_date": None
                },
                "feedback": {
                    "submitted": False,
                    "feedback_id": None
                },
                "certificate": {
                    "earned": False,
                    "certificate_id": None
                }
            }
            team_members.append(member_info)
        
        response = {
            "success": True,
            "message": "Team details retrieved successfully",
            "data": {
                "team_name": team_name,
                "team_id": team_id,
                "event_id": event_id,
                "event_name": event.get("event_name", ""),
                "total_members": len(team_members),
                "members": team_members
            },
            "auth_status": "authenticated" if student else "guest"
        }
        
        logger.info(f"Successfully retrieved team info for {team_id}: {len(team_members)} members")
        return response
        
    except Exception as e:
        logger.error(f"Error getting team info: {str(e)}")
        traceback.print_exc()
        return {"success": False, "message": f"Error retrieving team info: {str(e)}"}
