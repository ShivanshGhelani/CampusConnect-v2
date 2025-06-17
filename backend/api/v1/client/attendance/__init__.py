"""
Client Attendance API
Handles attendance-related API endpoints for students
"""
import logging
from datetime import datetime
from fastapi import APIRouter, Request, HTTPException, Depends
from dependencies.auth import require_student_login, get_current_student
from models.student import Student
from utils.db_operations import DatabaseOperations
from utils.event_lifecycle_helpers import mark_attendance

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/status/{event_id}")
async def get_attendance_status(event_id: str, student: Student = Depends(require_student_login)):
    """Get attendance status for a specific event"""
    try:
        # Get student data
        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": student.enrollment_no})
        if not student_data:
            return {"success": False, "message": "Student not found"}
        
        # Check if student is registered for this event
        event_participations = student_data.get('event_participations', {})
        participation = event_participations.get(event_id)
        
        if not participation:
            return {
                "success": False,
                "message": "You are not registered for this event",
                "registered": False
            }
        
        # Check attendance status
        attendance_id = participation.get('attendance_id')
        attendance_marked_at = participation.get('attendance_marked_at')
        
        return {
            "success": True,
            "registered": True,
            "attendance_marked": bool(attendance_id),
            "attendance_data": {
                "attendance_id": attendance_id,
                "attendance_marked_at": attendance_marked_at,
                "registration_id": participation.get('registration_id')
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting attendance status: {str(e)}")
        return {"success": False, "message": f"Error getting attendance status: {str(e)}"}

@router.post("/mark/{event_id}")
async def mark_attendance_api(event_id: str, request: Request, student: Student = Depends(require_student_login)):
    """API endpoint to mark attendance for an event"""
    try:
        data = await request.json()
        registration_id = data.get("registration_id")
        student_name = data.get("student_name")
        enrollment_no = data.get("enrollment_no")
        
        # Validate input data
        if not all([registration_id, student_name, enrollment_no]):
            return {"success": False, "message": "All fields are required"}
        
        # Verify the logged-in student matches the submitted data
        if student.enrollment_no != enrollment_no:
            return {"success": False, "message": "Enrollment number mismatch"}
        
        # Get student data
        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": student.enrollment_no})
        if not student_data:
            return {"success": False, "message": "Student not found"}
        
        # Check if student is registered for this event
        event_participations = student_data.get('event_participations', {})
        participation = event_participations.get(event_id)
        
        if not participation:
            return {"success": False, "message": "You are not registered for this event"}
        
        # Validate registration ID
        expected_registration_id = participation.get('registration_id', '')
        if registration_id.upper() != expected_registration_id.upper():
            return {
                "success": False, 
                "message": f"Invalid registration ID. Your registration ID is: {expected_registration_id}"
            }
        
        # Check if attendance already marked
        if participation.get('attendance_id'):
            return {"success": False, "message": "Attendance already marked for this event"}
        
        # Mark attendance using the event lifecycle helper
        success, attendance_id, message = await mark_attendance(student.enrollment_no, event_id, present=True)
        
        if success:
            return {
                "success": True,
                "message": "Attendance marked successfully",
                "attendance_id": attendance_id
            }
        else:
            return {"success": False, "message": message}
        
    except Exception as e:
        logger.error(f"Error marking attendance: {str(e)}")
        return {"success": False, "message": f"Error marking attendance: {str(e)}"}

@router.get("/validate-form/{event_id}")
async def validate_attendance_form(event_id: str, student: Student = Depends(require_student_login)):
    """Validate and get pre-filled data for attendance form"""
    try:
        # Get event details
        event = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event:
            return {"success": False, "message": "Event not found"}
        
        # Get student data
        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": student.enrollment_no})
        if not student_data:
            return {"success": False, "message": "Student not found"}
        
        # Check if student is registered for this event
        event_participations = student_data.get('event_participations', {})
        participation = event_participations.get(event_id)
        
        if not participation:
            return {
                "success": False,
                "message": "You are not registered for this event",
                "registered": False
            }
        
        # Check if attendance already marked
        if participation.get('attendance_id'):
            return {
                "success": False,
                "message": "Attendance already marked for this event",
                "already_marked": True,
                "attendance_data": {
                    "attendance_id": participation.get('attendance_id'),
                    "attendance_marked_at": participation.get('attendance_marked_at')
                }
            }
        
        # Return pre-filled form data
        return {
            "success": True,
            "message": "Form data ready",
            "form_data": {
                "registration_id": participation.get('registration_id', ''),
                "full_name": student_data.get('full_name', ''),
                "enrollment_no": student_data.get('enrollment_no', ''),
                "email": student_data.get('email', ''),
                "mobile_no": student_data.get('mobile_no', ''),
                "department": student_data.get('department', ''),
                "semester": student_data.get('semester', ''),
                "registration_type": participation.get('registration_type', 'individual')
            },
            "event_data": {
                "event_id": event_id,
                "event_name": event.get('event_name', ''),
                "event_date": event.get('start_datetime', ''),
                "venue": event.get('venue', '')
            }
        }
        
    except Exception as e:
        logger.error(f"Error validating attendance form: {str(e)}")
        return {"success": False, "message": f"Error validating form: {str(e)}"}

@router.get("/history")
async def get_attendance_history(student: Student = Depends(require_student_login)):
    """Get attendance history for the logged-in student"""
    try:
        # Get student data
        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": student.enrollment_no})
        if not student_data:
            return {"success": False, "message": "Student not found"}
        
        # Get all event participations with attendance
        event_participations = student_data.get('event_participations', {})
        attendance_history = []
        
        for event_id, participation in event_participations.items():
            attendance_id = participation.get('attendance_id')
            if attendance_id:  # Only include events where attendance was marked
                # Get event details
                event = await DatabaseOperations.find_one("events", {"event_id": event_id})
                if event:
                    attendance_history.append({
                        "event_id": event_id,
                        "event_name": event.get('event_name', ''),
                        "event_date": event.get('start_datetime', ''),
                        "venue": event.get('venue', ''),
                        "attendance_id": attendance_id,
                        "attendance_marked_at": participation.get('attendance_marked_at'),
                        "registration_id": participation.get('registration_id', ''),
                        "registration_type": participation.get('registration_type', 'individual')
                    })
        
        # Sort by attendance date (most recent first)
        attendance_history.sort(
            key=lambda x: x.get('attendance_marked_at', datetime.min), 
            reverse=True
        )
        
        return {
            "success": True,
            "message": f"Found {len(attendance_history)} attendance records",
            "attendance_history": attendance_history
        }
        
    except Exception as e:
        logger.error(f"Error getting attendance history: {str(e)}")
        return {"success": False, "message": f"Error getting attendance history: {str(e)}"}
