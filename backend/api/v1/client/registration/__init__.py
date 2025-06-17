"""
Client Registration API
Handles event registration validation and API endpoints for students
"""
import logging
from fastapi import APIRouter, Request, HTTPException, Depends
from dependencies.auth import require_student_login, get_current_student
from models.student import Student
from utils.db_operations import DatabaseOperations

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/validate")
async def validate_registration_api(
    request: Request, 
    registration_id: str, 
    event_id: str, 
    student: Student = Depends(require_student_login)
):
    """API endpoint to validate registration ID and return student details for auto-filling"""
    try:
        # Get student data
        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": student.enrollment_no})
        if not student_data:
            return {"success": False, "message": "Student data not found"}
        
        # Check event_participations for this event
        event_participations = student_data.get('event_participations', {})
        if event_id not in event_participations:
            return {"success": False, "message": "You are not registered for this event"}
        
        # Get participation data
        participation = event_participations[event_id]
        student_registration_id = participation.get('registration_id')
        
        # Verify registration_id matches
        if not student_registration_id:
            return {"success": False, "message": "Registration ID not found for this event"}
        
        if registration_id.upper() != student_registration_id.upper():
            return {
                "success": False, 
                "message": f"Invalid registration ID. Your registration ID is: {student_registration_id}"
            }
        
        # Return validated student details for auto-filling
        return {
            "success": True,
            "message": "Registration ID validated successfully",
            "student_data": {
                "full_name": student_data.get('full_name', ''),
                "enrollment_no": student_data.get('enrollment_no', ''),
                "email": student_data.get('email', ''),
                "mobile_no": student_data.get('mobile_no', ''),
                "department": student_data.get('department', ''),
                "semester": student_data.get('semester', ''),
                "registration_id": student_registration_id,
                "registration_type": participation.get('registration_type', 'individual')
            }
        }
        
    except Exception as e:
        logger.error(f"Error in validate_registration_api: {str(e)}")
        return {"success": False, "message": f"Error validating registration: {str(e)}"}

@router.get("/validate-participant")
async def validate_participant(enrollment_no: str):
    """API endpoint to validate team participant enrollment number"""
    try:
        # Clean and validate enrollment number
        enrollment_no = enrollment_no.strip().upper()
        
        if not enrollment_no:
            return {"success": False, "message": "Enrollment number is required"}
        
        # Check if student exists in database
        student = await DatabaseOperations.find_one("students", {"enrollment_no": enrollment_no})
        
        if not student:
            return {
                "success": False, 
                "message": f"Student with enrollment number {enrollment_no} not found in our database"
            }
        
        # Return student details for team registration
        return {
            "success": True,
            "message": "Student found",
            "student_data": {
                "enrollment_no": student.get('enrollment_no', ''),
                "full_name": student.get('full_name', ''),
                "email": student.get('email', ''),
                "department": student.get('department', ''),
                "semester": student.get('semester', ''),
                "mobile_no": student.get('mobile_no', '')
            }
        }
        
    except Exception as e:
        logger.error(f"Error in validate_participant: {str(e)}")
        return {"success": False, "message": f"Error validating participant: {str(e)}"}

@router.post("/check-conflicts")
async def check_registration_conflicts(request: Request):
    """API endpoint to check for registration conflicts for team registration"""
    try:
        data = await request.json()
        event_id = data.get("event_id")
        enrollment_numbers = data.get("enrollment_numbers", [])
        
        if not event_id or not enrollment_numbers:
            return {"success": False, "message": "Event ID and enrollment numbers are required"}
        
        conflicts = []
        
        # Check each enrollment number for existing registration
        for enrollment_no in enrollment_numbers:
            student_data = await DatabaseOperations.find_one("students", {"enrollment_no": enrollment_no})
            if student_data:
                event_participations = student_data.get('event_participations', {})
                if event_id in event_participations:
                    conflicts.append({
                        "enrollment_no": enrollment_no,
                        "full_name": student_data.get('full_name', ''),
                        "registration_id": event_participations[event_id].get('registration_id', '')
                    })
        
        if conflicts:
            return {
                "success": False,
                "message": "Some team members are already registered for this event",
                "conflicts": conflicts
            }
        
        return {
            "success": True,
            "message": "No registration conflicts found"
        }
        
    except Exception as e:
        logger.error(f"Error checking registration conflicts: {str(e)}")
        return {"success": False, "message": f"Error checking conflicts: {str(e)}"}

@router.get("/status/{event_id}")
async def get_registration_status(event_id: str, student: Student = Depends(require_student_login)):
    """Get registration status for a specific event"""
    try:
        # Get student data
        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": student.enrollment_no})
        if not student_data:
            return {"success": False, "message": "Student not found"}
        
        # Check event_participations for this event
        event_participations = student_data.get('event_participations', {})
        participation = event_participations.get(event_id)
        
        if not participation:
            return {
                "success": True,
                "registered": False,
                "message": "Not registered for this event"
            }
        
        return {
            "success": True,
            "registered": True,
            "registration_data": {
                "registration_id": participation.get('registration_id'),
                "registration_type": participation.get('registration_type', 'individual'),
                "registration_date": participation.get('registration_datetime'),
                "attendance_id": participation.get('attendance_id'),
                "feedback_id": participation.get('feedback_id'),
                "certificate_id": participation.get('certificate_id'),
                "team_name": participation.get('student_data', {}).get('team_name'),
                "team_registration_id": participation.get('team_registration_id')
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting registration status: {str(e)}")
        return {"success": False, "message": f"Error getting registration status: {str(e)}"}

@router.post("/cancel/{event_id}")
async def cancel_registration(event_id: str, student: Student = Depends(require_student_login)):
    """Cancel registration for an event (if allowed)"""
    try:
        # Get event data to check if cancellation is allowed
        event = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event:
            return {"success": False, "message": "Event not found"}
        
        # Get student data
        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": student.enrollment_no})
        if not student_data:
            return {"success": False, "message": "Student not found"}
        
        # Check if student is registered
        event_participations = student_data.get('event_participations', {})
        if event_id not in event_participations:
            return {"success": False, "message": "You are not registered for this event"}
        
        participation = event_participations[event_id]
        
        # Check if attendance has been marked (prevent cancellation after attendance)
        if participation.get('attendance_id'):
            return {"success": False, "message": "Cannot cancel registration after attendance has been marked"}
        
        # Check event status (only allow cancellation during registration phase)
        event_status = event.get('status', '')
        event_sub_status = event.get('sub_status', '')
        
        if event_status != 'upcoming' or event_sub_status != 'registration_open':
            return {"success": False, "message": "Registration cancellation is not allowed at this time"}
        
        # Remove registration from student's event_participations
        await DatabaseOperations.update_one(
            "students",
            {"enrollment_no": student.enrollment_no},
            {"$unset": {f"event_participations.{event_id}": ""}}
        )
        
        # Remove from event's registrations mapping
        registration_id = participation.get('registration_id')
        if registration_id:
            await DatabaseOperations.update_one(
                "events",
                {"event_id": event_id},
                {"$unset": {f"registrations.{registration_id}": ""}}
            )
        
        # If it's a team registration, handle team-specific cleanup
        if participation.get('registration_type') in ['team_leader', 'team_participant']:
            team_registration_id = participation.get('team_registration_id')
            if team_registration_id:
                # Remove from team registrations (this would need more complex logic for team handling)
                pass
        
        return {
            "success": True,
            "message": "Registration cancelled successfully"
        }
        
    except Exception as e:
        logger.error(f"Error cancelling registration: {str(e)}")
        return {"success": False, "message": f"Error cancelling registration: {str(e)}"}
