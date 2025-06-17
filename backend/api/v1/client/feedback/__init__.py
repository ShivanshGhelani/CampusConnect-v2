"""
Client Feedback API
Handles feedback-related API endpoints for students
"""
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException, Depends
from dependencies.auth import require_student_login, get_current_student
from models.student import Student
from utils.db_operations import DatabaseOperations
from utils.event_lifecycle_helpers import submit_feedback

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/status/{event_id}")
async def get_feedback_status(event_id: str, student: Student = Depends(require_student_login)):
    """Get feedback status for a specific event"""
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
        
        # Check attendance status (required for feedback)
        attendance_id = participation.get('attendance_id')
        if not attendance_id:
            return {
                "success": False,
                "message": "You must attend the event before submitting feedback",
                "attended": False
            }
        
        # Check feedback status
        feedback_id = participation.get('feedback_id')
        feedback_submitted_at = participation.get('feedback_submitted_at')
        
        return {
            "success": True,
            "registered": True,
            "attended": True,
            "feedback_submitted": bool(feedback_id),
            "feedback_data": {
                "feedback_id": feedback_id,
                "feedback_submitted_at": feedback_submitted_at,
                "attendance_id": attendance_id,
                "registration_id": participation.get('registration_id')
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting feedback status: {str(e)}")
        return {"success": False, "message": f"Error getting feedback status: {str(e)}"}

@router.post("/submit/{event_id}")
async def submit_feedback_api(event_id: str, request: Request, student: Student = Depends(require_student_login)):
    """API endpoint to submit feedback for an event"""
    try:
        data = await request.json()
        
        # Extract feedback data
        feedback_data = {
            "overall_rating": data.get("overall_rating"),
            "content_quality": data.get("content_quality"),
            "speaker_effectiveness": data.get("speaker_effectiveness"),
            "organization": data.get("organization"),
            "venue_rating": data.get("venue_rating"),
            "likelihood_recommend": data.get("likelihood_recommend"),
            "most_valuable": data.get("most_valuable", ""),
            "suggestions": data.get("suggestions", ""),
            "additional_comments": data.get("additional_comments", ""),
            "attended_similar": data.get("attended_similar"),
            "learned_something_new": data.get("learned_something_new"),
            "met_expectations": data.get("met_expectations"),
            "would_attend_future": data.get("would_attend_future")
        }
        
        # Validate required fields
        required_fields = ["overall_rating", "content_quality", "speaker_effectiveness", "organization"]
        missing_fields = [field for field in required_fields if not feedback_data.get(field)]
        
        if missing_fields:
            return {
                "success": False, 
                "message": f"Missing required fields: {', '.join(missing_fields)}"
            }
        
        # Submit feedback using the event lifecycle helper
        success, feedback_id, message = await submit_feedback(
            student.enrollment_no, 
            event_id, 
            feedback_data
        )
        
        if success:
            return {
                "success": True,
                "message": "Feedback submitted successfully",
                "feedback_id": feedback_id
            }
        else:
            return {"success": False, "message": message}
        
    except Exception as e:
        logger.error(f"Error submitting feedback: {str(e)}")
        return {"success": False, "message": f"Error submitting feedback: {str(e)}"}

@router.get("/form-data/{event_id}")
async def get_feedback_form_data(event_id: str, student: Student = Depends(require_student_login)):
    """Get pre-filled data for feedback form"""
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
        
        # Check if student attended the event
        attendance_id = participation.get('attendance_id')
        if not attendance_id:
            return {
                "success": False,
                "message": "You must attend the event before submitting feedback",
                "attended": False
            }
        
        # Check if feedback already submitted
        if participation.get('feedback_id'):
            return {
                "success": False,
                "message": "Feedback already submitted for this event",
                "already_submitted": True,
                "feedback_data": {
                    "feedback_id": participation.get('feedback_id'),
                    "feedback_submitted_at": participation.get('feedback_submitted_at')
                }
            }
        
        # Return form data
        return {
            "success": True,
            "message": "Form data ready",
            "form_data": {
                "registration_id": participation.get('registration_id', ''),
                "attendance_id": attendance_id,
                "full_name": student_data.get('full_name', ''),
                "enrollment_no": student_data.get('enrollment_no', ''),
                "email": student_data.get('email', ''),
                "department": student_data.get('department', ''),
                "registration_type": participation.get('registration_type', 'individual')
            },
            "event_data": {
                "event_id": event_id,
                "event_name": event.get('event_name', ''),
                "event_date": event.get('start_datetime', ''),
                "venue": event.get('venue', ''),
                "description": event.get('description', ''),
                "category": event.get('category', '')
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting feedback form data: {str(e)}")
        return {"success": False, "message": f"Error getting form data: {str(e)}"}

@router.get("/history")
async def get_feedback_history(student: Student = Depends(require_student_login)):
    """Get feedback history for the logged-in student"""
    try:
        # Get student data
        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": student.enrollment_no})
        if not student_data:
            return {"success": False, "message": "Student not found"}
        
        # Get all event participations with feedback
        event_participations = student_data.get('event_participations', {})
        feedback_history = []
        
        for event_id, participation in event_participations.items():
            feedback_id = participation.get('feedback_id')
            if feedback_id:  # Only include events where feedback was submitted
                # Get event details
                event = await DatabaseOperations.find_one("events", {"event_id": event_id})
                if event:
                    feedback_history.append({
                        "event_id": event_id,
                        "event_name": event.get('event_name', ''),
                        "event_date": event.get('start_datetime', ''),
                        "venue": event.get('venue', ''),
                        "feedback_id": feedback_id,
                        "feedback_submitted_at": participation.get('feedback_submitted_at'),
                        "registration_id": participation.get('registration_id', ''),
                        "attendance_id": participation.get('attendance_id', ''),
                        "registration_type": participation.get('registration_type', 'individual')
                    })
        
        # Sort by feedback submission date (most recent first)
        feedback_history.sort(
            key=lambda x: x.get('feedback_submitted_at', datetime.min), 
            reverse=True
        )
        
        return {
            "success": True,
            "message": f"Found {len(feedback_history)} feedback records",
            "feedback_history": feedback_history
        }
        
    except Exception as e:
        logger.error(f"Error getting feedback history: {str(e)}")
        return {"success": False, "message": f"Error getting feedback history: {str(e)}"}

@router.get("/analytics/{event_id}")
async def get_feedback_analytics(event_id: str, student: Student = Depends(require_student_login)):
    """Get aggregated feedback analytics for an event (student can see summary)"""
    try:
        # Verify student attended this event
        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": student.enrollment_no})
        if not student_data:
            return {"success": False, "message": "Student not found"}
        
        event_participations = student_data.get('event_participations', {})
        participation = event_participations.get(event_id)
        
        if not participation or not participation.get('attendance_id'):
            return {
                "success": False,
                "message": "You must have attended this event to view analytics"
            }
        
        # Get event details
        event = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event:
            return {"success": False, "message": "Event not found"}
        
        # Get all feedback for this event (aggregated data only)
        # This would typically query a feedback collection for the event
        # For now, return basic analytics structure
        
        return {
            "success": True,
            "message": "Feedback analytics retrieved",
            "analytics": {
                "event_id": event_id,
                "event_name": event.get('event_name', ''),
                "total_attendees": event.get('total_attendees', 0),
                "feedback_submissions": event.get('feedback_count', 0),
                "response_rate": "N/A",  # Calculate if needed
                "average_ratings": {
                    "overall_rating": "N/A",
                    "content_quality": "N/A",
                    "speaker_effectiveness": "N/A",
                    "organization": "N/A",
                    "venue_rating": "N/A"
                },
                "recommendation_percentage": "N/A"
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting feedback analytics: {str(e)}")
        return {"success": False, "message": f"Error getting analytics: {str(e)}"}
