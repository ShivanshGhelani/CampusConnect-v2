"""Registration validation routes."""
from fastapi import APIRouter, HTTPException, Depends, status
from utils.db_operations import DatabaseOperations
from models.student import Student
from dependencies.auth import require_student_login

router = APIRouter()

@router.get("/api/validate-registration")
async def validate_registration_api(registration_id: str, event_id: str, student: Student = Depends(require_student_login)):
    """API endpoint to validate registration ID and fetch associated student details"""
    try:
        if not registration_id or not registration_id.strip():
            return {"success": False, "message": "Registration ID is required"}
        
        registration_id = registration_id.strip().upper()
        
        # Get the logged-in student's data
        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": student.enrollment_no})
        if not student_data:
            return {"success": False, "message": "Student not found"}
        
        # Get the event participation for this student
        event_participations = student_data.get('event_participations', {})
        if event_id not in event_participations:
            return {"success": False, "message": "You are not registered for this event"}
            
        participation = event_participations[event_id]
        
        # Check if the provided registration ID matches the student's registration for this event
        student_registration_id = participation.get('registration_id')
        if student_registration_id != registration_id:
            return {"success": False, "message": f"Invalid registration ID. Your registration ID for this event is: {student_registration_id}"}
        
        # Format student data for response
        formatted_data = {
            "registration_id": registration_id,
            "enrollment_no": student.enrollment_no,
            "full_name": student_data.get("full_name", ""),
            "email": student_data.get("email", ""),
            "department": student_data.get("department", ""),
            "semester": student_data.get("semester", ""),
            "mobile_no": student_data.get("mobile_no", ""),
            "registration_type": participation.get("registration_type", "individual")
        }
        
        return {
            "success": True,
            "student": formatted_data,
            "message": "Registration details found"
        }
        
    except Exception as e:
        print(f"Error in validate_registration_api: {str(e)}")
        return {"success": False, "message": "Error validating registration details"}
