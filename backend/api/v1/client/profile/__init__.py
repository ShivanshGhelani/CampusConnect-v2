"""
Client Profile API
Handles student and faculty profile-related API endpoints
"""
import logging
from datetime import datetime
from fastapi import APIRouter, Request, HTTPException, Depends
from dependencies.auth import require_student_login, get_current_student, get_current_faculty_optional, get_current_user, require_faculty_login
from models.student import Student, StudentUpdate
from models.faculty import Faculty, FacultyUpdate
from database.operations import DatabaseOperations
from typing import Union

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/info")
async def get_profile_info(student: Student = Depends(require_student_login)):
    """Get current student profile information"""
    try:
        # Get complete student data from database
        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": student.enrollment_no})
        if not student_data:
            return {"success": False, "message": "Student profile not found"}
          # Remove sensitive information
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
            "profile_created_at": student_data.get('created_at', ''),
            "last_updated": student_data.get('updated_at', ''),
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
            "profile_created_at": faculty_data.get('created_at', ''),
            "last_updated": faculty_data.get('updated_at', ''),
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
                        return datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                    else:
                        return datetime.min
                except:
                    return datetime.min
            elif hasattr(timestamp, 'year'):  # datetime object
                return timestamp
            else:
                return datetime.min
        
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
                    from datetime import datetime
                    if date_val:
                        return datetime.fromisoformat(date_val.replace('Z', '+00:00'))
                    else:
                        return datetime.min
                except:
                    return datetime.min
            elif hasattr(date_val, 'year'):  # datetime object
                return date_val
            else:
                return datetime.min
        
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
