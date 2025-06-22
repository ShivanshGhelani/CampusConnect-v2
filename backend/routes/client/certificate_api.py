"""
Certificate API routes for JavaScript-based certificate generation
Handles API endpoints for certificate data retrieval and email sending
"""

import logging
from pathlib import Path
from datetime import datetime
from typing import Any, Dict
from fastapi import APIRouter, Request, HTTPException, Depends
from dependencies.auth import require_student_login, get_current_student
from models.student import Student
from utils.db_operations import DatabaseOperations

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()

def clean_mongo_data(data: Any) -> Any:
    """Clean MongoDB data for JSON serialization by converting ObjectId and datetime objects"""
    if isinstance(data, dict):
        return {key: clean_mongo_data(value) for key, value in data.items() if key != '_id'}
    elif isinstance(data, list):
        return [clean_mongo_data(item) for item in data]
    elif hasattr(data, '__dict__') and hasattr(data, '__class__'):
        # Handle ObjectId and other MongoDB objects
        return str(data)
    elif isinstance(data, datetime):
        return data.isoformat()
    else:
        return data

@router.post("/certificate-data")
async def get_certificate_data_api(request: Request, student: Student = Depends(require_student_login)):
    """API endpoint to get certificate data for JavaScript generator"""
    try:
        from utils.js_certificate_generator import get_certificate_data_for_js
        
        data = await request.json()
        event_id = data.get("event_id")
        enrollment_no = data.get("enrollment_no")
        
        if not event_id or not enrollment_no:
            return {"success": False, "message": "Event ID and enrollment number are required"}
        
        # Verify the logged-in student matches the requested enrollment
        if student.enrollment_no != enrollment_no:
            return {"success": False, "message": "Unauthorized: You can only generate certificates for your own enrollment"}
        
        success, message, certificate_data = await get_certificate_data_for_js(event_id, enrollment_no)
        
        if success:
            return {"success": True, "message": message, "data": certificate_data}
        else:
            return {"success": False, "message": message}
            
    except Exception as e:
        logger.error(f"Error in get_certificate_data_api: {str(e)}")
        return {"success": False, "message": f"Error retrieving certificate data: {str(e)}"}

@router.post("/send-certificate-email")
async def send_certificate_email_api(request: Request, student: Student = Depends(require_student_login)):
    """API endpoint to send certificate email from JavaScript-generated PDF (only once per student per event)"""
    try:
        from utils.email_queue import certificate_email_queue
        from utils.db_operations import DatabaseOperations
        
        data = await request.json()
        event_id = data.get("event_id")
        enrollment_no = data.get("enrollment_no")
        pdf_base64 = data.get("pdf_base64")
        file_name = data.get("file_name")
        
        if not all([event_id, enrollment_no, pdf_base64, file_name]):
            return {"success": False, "message": "All fields are required"}
        
        # Verify the logged-in student matches the requested enrollment
        if student.enrollment_no != enrollment_no:
            return {"success": False, "message": "Unauthorized: You can only send certificates for your own enrollment"}
        
        # Check if email has already been sent for this student and event
        student_doc = await DatabaseOperations.find_one("students", {"enrollment_no": enrollment_no})
        if not student_doc:
            return {"success": False, "message": "Student not found"}
        
        participations = student_doc.get("event_participations", {})
        participation = participations.get(event_id, {})
        
        if participation.get("certificate_email_sent", False):
            logger.info(f"Certificate email already sent for student {enrollment_no} and event {event_id}")
            return {"success": True, "message": "Certificate email has already been sent for this event"}
        
        # Get event data for email
        event_doc = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event_doc:
            return {"success": False, "message": "Event not found"}
        
        # Add email task to queue (non-blocking)
        success = await certificate_email_queue.add_certificate_email(
            event_id=event_id,
            enrollment_no=enrollment_no,
            student_name=student_doc.get("full_name", ""),
            student_email=student_doc.get("email", ""),
            event_title=event_doc.get("event_name", ""),
            pdf_base64=pdf_base64,
            file_name=file_name
        )
        
        if success:
            logger.info(f"Certificate email queued for student {enrollment_no} and event {event_id}")
            return {"success": True, "message": "Certificate email queued successfully! You will receive it shortly."}
        else:
            return {"success": False, "message": "Failed to queue certificate email. Please try again."}
        
    except Exception as e:
        logger.error(f"Error in send_certificate_email_api: {str(e)}")
        return {"success": False, "message": f"Error sending certificate email: {str(e)}"}

@router.get("/certificate-status/{event_id}")
async def get_certificate_status(event_id: str, current_student: Student = Depends(get_current_student)):
    """Check if certificate is available for download for a specific event"""
    try:
        from utils.js_certificate_generator import validate_certificate_eligibility
        
        enrollment_no = current_student.enrollment_no
        
        # Check eligibility
        is_eligible, message = await validate_certificate_eligibility(event_id, enrollment_no)
        
        if not is_eligible:
            return {"success": False, "message": message, "eligible": False}
          # Get event details
        event_data = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event_data:
            return {"success": False, "message": "Event not found"}
        
        # Clean event data immediately
        event_data = clean_mongo_data(event_data)
        
        # Get student data for certificate
        student_doc = await DatabaseOperations.find_one("students", {"enrollment_no": enrollment_no})
        if not student_doc:
            return {"success": False, "message": "Student not found"}
        
        # Clean student data immediately  
        student_doc = clean_mongo_data(student_doc)
              # Get participation details
        participations = student_doc.get("event_participations", {})
        participation = participations.get(event_id, {})
        participation = clean_mongo_data(participation)  # Clean participation data
        certificate_id = participation.get("certificate_id")
          # Get team info if it's a team event
        team_info = None
        if participation.get("team_name"):
            team_info = clean_mongo_data({
                "team_name": participation.get("team_name"),
                "team_registration_id": participation.get("team_registration_id")
            })
        
        # Convert ObjectId fields to strings and clean the data
        event_clean = clean_mongo_data({
            "event_id": event_data.get("event_id"),
            "event_name": event_data.get("event_name"),
            "event_type": event_data.get("event_type"),
            "start_datetime": event_data.get("start_datetime"),
            "end_datetime": event_data.get("end_datetime"),
            "description": event_data.get("detailed_description", ""),
            "sub_status": event_data.get("sub_status")
        })
        
        student_clean = clean_mongo_data({
            "enrollment_no": student_doc.get("enrollment_no"),
            "full_name": student_doc.get("full_name"),
            "department": student_doc.get("department"),
            "email": student_doc.get("email")
        })
        
        certificate_clean = clean_mongo_data({
            "certificate_id": certificate_id
        })
        
        # Clean the entire response to ensure no ObjectId fields remain
        response = clean_mongo_data({
            "success": True,
            "eligible": True,
            "event": event_clean,
            "student": student_clean,
            "certificate": certificate_clean,
            "team_info": team_info,
            "message": "Certificate is available for download"
        })
        
        return response
        
    except Exception as e:
        logger.error(f"Error checking certificate status: {str(e)}")
        return {"success": False, "message": f"Error checking certificate status: {str(e)}"}

@router.get("/certificate-template/{event_id}")
async def get_certificate_template(event_id: str, current_student: Student = Depends(get_current_student)):
    """API endpoint to get certificate template content and placeholder data"""
    try:
        # Get event data
        event_data = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event_data:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Get student data
        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": current_student.enrollment_no})
        if not student_data:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Check if student is registered for this event
        event_participations = student_data.get('event_participations', {})
        if event_id not in event_participations:
            raise HTTPException(status_code=403, detail="Student not registered for this event")
        
        participation = event_participations[event_id]
        
        # Get certificate template path
        certificate_template = event_data.get('certificate_template')
        if not certificate_template:
            return {"success": False, "message": "No certificate template configured for this event"}
        
        # Construct the full template path
        template_path = Path(certificate_template)
        
        # Check if the file exists
        if not template_path.exists():
            logger.error(f"Certificate template not found: {template_path}")
            return {"success": False, "message": f"Certificate template file not found: {certificate_template}"}
        
        # Read the template content
        try:
            with open(template_path, 'r', encoding='utf-8') as file:
                template_content = file.read()
        except Exception as read_error:
            logger.error(f"Error reading template file: {str(read_error)}")
            return {"success": False, "message": f"Error reading template file: {str(read_error)}"}
        
        # Prepare placeholder data
        placeholder_data = {
            "participant_name": student_data.get("full_name", ""),
            "department_name": student_data.get("department", ""),
            "event_name": event_data.get("event_name", ""),
            "event_date": event_data.get("start_datetime", ""),
            "certificate_id": participation.get("certificate_id", "")
        }
        
        # Add team name for team-based events
        if event_data.get('registration_mode', '').lower() == 'team':
            student_data_in_participation = participation.get('student_data', {})
            team_name = student_data_in_participation.get('team_name')
            if team_name:
                placeholder_data["team_name"] = team_name
        
        return {
            "success": True,
            "message": "Certificate template loaded successfully",
            "template_content": template_content,
            "placeholder_data": placeholder_data,
            "template_path": str(template_path)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading certificate template: {str(e)}")
        return {"success": False, "message": f"Error loading certificate template: {str(e)}"}

@router.post("/validate-certificate-access")
async def validate_certificate_access(request: Request, student: Student = Depends(require_student_login)):
    """Validate that student has access to download certificate for specific event"""
    try:
        data = await request.json()
        event_id = data.get("event_id")
        
        if not event_id:
            return {"success": False, "message": "Event ID is required"}
        
        from utils.js_certificate_generator import validate_certificate_eligibility
        
        is_eligible, message = await validate_certificate_eligibility(event_id, student.enrollment_no)
        
        return {
            "success": True,
            "eligible": is_eligible,
            "message": message
        }
        
    except Exception as e:
        logger.error(f"Error validating certificate access: {str(e)}")
        return {"success": False, "message": f"Error validating access: {str(e)}"}

@router.get("/test-template/{event_id}")
async def test_certificate_template(event_id: str):
    """Test endpoint to verify template loading (no authentication required)"""
    try:
        # Get event data
        event_data = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event_data:
            return {"success": False, "message": "Event not found"}
        
        # Get certificate template path
        certificate_template = event_data.get('certificate_template')
        if not certificate_template:
            return {"success": False, "message": "No certificate template configured for this event"}
        
        # Construct the full template path
        template_path = Path(certificate_template)
        
        # Check if the file exists
        if not template_path.exists():
            return {"success": False, "message": f"Certificate template file not found: {certificate_template}", "path_checked": str(template_path)}
        
        # Read the template content
        try:
            with open(template_path, 'r', encoding='utf-8') as file:
                template_content = file.read()
        except Exception as read_error:
            return {"success": False, "message": f"Error reading template file: {str(read_error)}"}
        
        return {
            "success": True,
            "message": "Template loaded successfully",
            "template_path": str(template_path),
            "template_exists": template_path.exists(),
            "template_length": len(template_content),
            "template_preview": template_content[:200] + "..." if len(template_content) > 200 else template_content
        }
        
    except Exception as e:
        return {"success": False, "message": f"Error: {str(e)}"}

@router.get("/email-queue-stats")
async def get_email_queue_stats(current_student: Student = Depends(get_current_student)):
    """Get email queue statistics (for debugging/monitoring)"""
    try:
        from utils.email_queue import certificate_email_queue
        stats = certificate_email_queue.get_stats()
        return {"success": True, "stats": stats}
    except Exception as e:
        logger.error(f"Error getting email queue stats: {str(e)}")
        return {"success": False, "message": f"Error getting stats: {str(e)}"}

@router.get("/api/certificate-debug/{event_id}/{enrollment_no}")
async def debug_certificate(
    request: Request, 
    event_id: str, 
    enrollment_no: str,
    student: Student = Depends(require_student_login)
):
    """Debug endpoint for certificate generation issues"""
    # Only admin users can access this endpoint
    if student.role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Unauthorized access")
        
    try:
        from utils.js_certificate_generator import debug_team_certificate_data
        
        # Get debug data
        debug_data = await debug_team_certificate_data(event_id, enrollment_no)
        return {
            "success": True,
            "debug_data": debug_data
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
