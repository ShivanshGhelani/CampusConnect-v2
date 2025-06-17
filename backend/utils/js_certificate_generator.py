"""
JavaScript Certificate Generator Utility

This module provides server-side support for the JavaScript-based certificate generation system.
It handles data preparation and email sending for certificates generated in the browser.
Supports concurrent operations for handling multiple simultaneous certificate downloads.
"""

import base64
import asyncio
from datetime import datetime
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Tuple, Optional, Dict, Any
from concurrent.futures import ThreadPoolExecutor

from utils.db_operations import DatabaseOperations
from utils.email_service import EmailService
from utils.logger import get_logger
import aiofiles

logger = get_logger(__name__)

# Thread pool for concurrent operations
_thread_pool = ThreadPoolExecutor(max_workers=20)  # Support up to 20 concurrent downloads
_async_semaphore = asyncio.Semaphore(20)  # Limit concurrent async operations

# Concurrency monitoring and statistics
_active_downloads = 0
_download_stats = {
    "total_downloads": 0,
    "successful_downloads": 0,
    "failed_downloads": 0,
    "active_downloads": 0
}

async def get_certificate_data_for_js(event_id: str, enrollment_no: str) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """
    Get certificate data for JavaScript generator with concurrency support
    
    Args:
        event_id: Event ID
        enrollment_no: Student enrollment number
    
    Returns:
        Tuple of (success, message, certificate_data)
    """
    async with _async_semaphore:  # Limit concurrent operations
        try:
            # Use asyncio.gather for concurrent database operations
            student_task = DatabaseOperations.find_one("students", {"enrollment_no": enrollment_no})
            event_task = DatabaseOperations.find_one("events", {"event_id": event_id})
            
            student_data, event_data = await asyncio.gather(student_task, event_task)
            
            if not student_data:
                return False, "Student not found", None
            
            if not event_data:
                return False, "Event not found", None
              # Check if student is registered and attended
            event_participations = student_data.get('event_participations', {})
            if event_id not in event_participations:
                return False, "Student not registered for this event", None
            
            participation = event_participations[event_id]
            
            # Log participation data for debugging
            logger.debug(f"Event participation data for student {enrollment_no}, event {event_id}: {participation}")
            
            if not participation.get('attendance_id'):
                return False, "Student must have attended the event", None
            
            if not participation.get('feedback_id'):
                return False, "Student must have submitted feedback", None
            
            # Get certificate template path
            certificate_template = event_data.get('certificate_template')
            if not certificate_template:
                return False, "No certificate template configured for this event", None
            
            # Check if event is team-based
            is_team_based = event_data.get('registration_mode', '').lower() == 'team'
            
            # Prepare certificate data
            certificate_data = {
                "participant_name": student_data.get("full_name", ""),
                "department_name": student_data.get("department", ""),
                "event_name": event_data.get("event_name", ""),
                "event_date": event_data.get("start_datetime").strftime("%B %d, %Y") if event_data.get("start_datetime") else "",
                "certificate_template": certificate_template,
                "is_team_based": is_team_based,
                "enrollment_no": enrollment_no,
                "event_id": event_id
            }
              # Add team name if team-based event
            if is_team_based:
                # First try to get team name from participation data
                student_data_in_participation = participation.get('student_data', {})
                team_name = student_data_in_participation.get('team_name')
                
                # If not found in student data, get it from the event document
                if not team_name:
                    # Get team registration ID from student participation
                    team_registration_id = participation.get('team_registration_id')
                    if team_registration_id:
                        # Get team details from event document
                        team_registrations = event_data.get('team_registrations', {})
                        team_data = team_registrations.get(team_registration_id, {})
                        team_name = team_data.get('team_name')
                
                if team_name:
                    certificate_data["team_name"] = team_name
                else:
                    # For debugging, log the team ID and registration type
                    logger.warning(f"Team name not found for event: {event_id}, student: {enrollment_no}, " +
                                  f"team_id: {participation.get('team_registration_id')}, " +
                                  f"registration_type: {participation.get('registration_type')}")
                    return False, "Team name not found for team-based event", None
            
            return True, "Certificate data retrieved successfully", certificate_data
            
        except Exception as e:
            logger.error(f"Error getting certificate data: {str(e)}")
            return False, f"Error retrieving certificate data: {str(e)}", None


async def send_certificate_email_from_js(
    event_id: str, 
    enrollment_no: str, 
    pdf_base64: str, 
    file_name: str
) -> Tuple[bool, str]:
    """
    Send certificate email with PDF attachment from JavaScript-generated certificate
    Implements one-time email logic to prevent duplicate emails per student per event
    
    Args:
        event_id: Event ID
        enrollment_no: Student enrollment number
        pdf_base64: Base64 encoded PDF data
        file_name: Name for the PDF file
    
    Returns:
        Tuple of (success, message)
    """
    async with _async_semaphore:  # Limit concurrent operations
        temp_file_path = None
        try:
            # Use asyncio.gather for concurrent database operations
            student_task = DatabaseOperations.find_one("students", {"enrollment_no": enrollment_no})
            event_task = DatabaseOperations.find_one("events", {"event_id": event_id})
            
            student_data, event_data = await asyncio.gather(student_task, event_task)
            
            if not student_data:
                return False, "Student not found"
            
            if not event_data:
                return False, "Event not found"
            
            # Check if email has already been sent for this student and event
            event_participations = student_data.get("event_participations", {})
            participation = event_participations.get(event_id, {})
            
            if participation.get("certificate_email_sent", False):
                return True, "Certificate email already sent. Download completed successfully."
            
            student_email = student_data.get("email")
            if not student_email:
                return False, "Student email not found"
              # Create temporary PDF file
            try:
                # Decode base64 PDF data
                pdf_data = base64.b64decode(pdf_base64)
                
                # Validate that we have actual PDF data
                if not pdf_data.startswith(b'%PDF'):
                    logger.error(f"Invalid PDF data received - does not start with PDF header")
                    return False, "Invalid PDF data received"
                
                logger.info(f"PDF data validation: {len(pdf_data)} bytes, starts with PDF header: {pdf_data[:10]}")
                
                # Create temporary file using the naming convention: student_full_name[0]_eventname[0]
                safe_file_name = generate_certificate_file_name(
                    student_data.get("full_name", ""), 
                    event_data.get("event_name", "")
                )
                
                # Create temporary file
                with NamedTemporaryFile(delete=False, suffix='.pdf', prefix=f'{safe_file_name}_') as temp_file:
                    temp_file.write(pdf_data)
                    temp_file_path = temp_file.name
                
                logger.info(f"Created temporary PDF file: {temp_file_path} ({len(pdf_data)} bytes)")
                
                # Verify the temporary file is a valid PDF
                try:
                    with open(temp_file_path, 'rb') as verify_file:
                        header = verify_file.read(10)
                        if not header.startswith(b'%PDF'):
                            logger.error(f"Temporary PDF file validation failed - invalid header: {header}")
                            return False, "Created PDF file is invalid"
                    logger.info("Temporary PDF file validation successful")
                except Exception as verify_error:
                    logger.error(f"PDF file verification failed: {str(verify_error)}")
                    return False, f"PDF file verification failed: {str(verify_error)}"
                
                # Send email with attachment using thread pool for I/O operation
                email_service = EmailService()
                
                success = await email_service.send_certificate_notification(
                    student_email=student_email,
                    student_name=student_data.get("full_name", ""),
                    event_title=event_data.get("event_name", ""),
                    certificate_url=f"/client/events/{event_id}/certificate",
                    event_date=event_data.get("start_datetime").strftime("%B %d, %Y") if event_data.get("start_datetime") else None,
                    certificate_pdf_path=temp_file_path
                )
                
                if success:
                    # Mark email as sent in the database
                    await DatabaseOperations.update_one(
                        "students",
                        {"enrollment_no": enrollment_no},
                        {"$set": {f"event_participations.{event_id}.certificate_email_sent": True}}
                    )
                    logger.info(f"Certificate email sent and marked for student {enrollment_no} for event {event_id}")
                    return True, "Certificate email sent successfully! You will receive it shortly."
                else:
                    return False, "Failed to send certificate email"
                    
            except Exception as pdf_error:
                logger.error(f"Error processing PDF data: {str(pdf_error)}")
                return False, f"Error processing PDF: {str(pdf_error)}"
            
            finally:
                # Clean up temporary file
                if temp_file_path and Path(temp_file_path).exists():
                    try:
                        await asyncio.get_event_loop().run_in_executor(
                            _thread_pool, Path(temp_file_path).unlink
                        )
                        logger.info(f"Cleaned up temporary file: {temp_file_path}")
                    except Exception as cleanup_error:
                        logger.warning(f"Failed to clean up temporary file {temp_file_path}: {cleanup_error}")
                        
        except Exception as e:
            logger.error(f"Error sending certificate email: {str(e)}")
            return False, f"Error sending email: {str(e)}"


def generate_certificate_file_name(student_name: str, event_name: str) -> str:
    """
    Generate a safe file name for certificate download
    
    Args:
        student_name: Student's full name
        event_name: Event name
    
    Returns:
        Safe file name for certificate
    """
    # Clean names for file system
    safe_student_name = "".join(c for c in student_name if c.isalnum() or c in " -_").strip()
    safe_event_name = "".join(c for c in event_name if c.isalnum() or c in " -_").strip()
    
    # Replace spaces with underscores and limit length
    safe_student_name = safe_student_name.replace(" ", "_")[:20]
    safe_event_name = safe_event_name.replace(" ", "_")[:30]
    
    # Create file name
    timestamp = datetime.now().strftime("%Y%m%d")
    file_name = f"certificate_{safe_student_name}_{safe_event_name}_{timestamp}.pdf"
    
    return file_name


async def process_certificate_template(template_path: str, certificate_data: Dict[str, Any]) -> str:
    """
    Process certificate template by replacing placeholders with actual data
    
    Args:
        template_path: Path to the certificate template HTML file
        certificate_data: Dictionary containing certificate data
    
    Returns:
        Processed HTML content with placeholders replaced
    """
    try:
        # Read template file
        template_file_path = Path("data") / template_path
        if not template_file_path.exists():
            raise FileNotFoundError(f"Template file not found: {template_path}")
        
        with open(template_file_path, 'r', encoding='utf-8') as file:
            html_content = file.read()
        
        # Replace placeholders
        placeholders = {
            "{{ participant_name }}": certificate_data.get("participant_name", ""),
            "{{ department_name }}": certificate_data.get("department_name", ""),
        }
        
        # Add team name placeholder if team-based event
        if certificate_data.get("is_team_based") and certificate_data.get("team_name"):
            placeholders["{{ team_name }}"] = certificate_data.get("team_name", "")
        
        # Replace all placeholders
        for placeholder, value in placeholders.items():
            html_content = html_content.replace(placeholder, value)
        
        return html_content
        
    except Exception as e:
        logger.error(f"Error processing certificate template: {str(e)}")
        raise


async def validate_certificate_eligibility(event_id: str, enrollment_no: str) -> Tuple[bool, str]:
    """
    Validate if student is eligible for certificate download
    
    Args:
        event_id: Event ID
        enrollment_no: Student enrollment number
    
    Returns:
        Tuple of (is_eligible, message)
    """
    try:
        # Get student data
        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": enrollment_no})
        if not student_data:
            return False, "Student not found"
        
        # Get event data
        event_data = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event_data:
            return False, "Event not found"
        
        # Check event status - should be in certificate available phase
        event_status = event_data.get('sub_status')
        if event_status != 'certificate_available':
            return False, "Certificates are not yet available for this event"
        
        # Check if student is registered
        event_participations = student_data.get('event_participations', {})
        if event_id not in event_participations:
            return False, "Student is not registered for this event"
        
        participation = event_participations[event_id]
        
        # Check attendance
        if not participation.get('attendance_id'):
            return False, "Student must have attended the event to receive a certificate"
        
        # Check feedback submission
        if not participation.get('feedback_id'):
            return False, "Student must have submitted feedback to receive a certificate"
        
        return True, "Student is eligible for certificate"
        
    except Exception as e:
        logger.error(f"Error validating certificate eligibility: {str(e)}")
        return False, f"Error validating eligibility: {str(e)}"


# Utility functions for certificate management

def create_temp_certificate_file(pdf_data: bytes, file_name: str) -> str:
    """Create a temporary certificate file and return its path"""
    try:
        temp_dir = Path("temp")
        temp_dir.mkdir(exist_ok=True)
        
        temp_file_path = temp_dir / file_name
        
        with open(temp_file_path, 'wb') as f:
            f.write(pdf_data)
        
        return str(temp_file_path)
        
    except Exception as e:
        logger.error(f"Error creating temporary certificate file: {str(e)}")
        raise


def cleanup_temp_certificate_file(file_path: str) -> None:
    """Clean up temporary certificate file"""
    try:
        path = Path(file_path)
        if path.exists():
            path.unlink()
            logger.info(f"Cleaned up temporary file: {file_path}")
    except Exception as e:
        logger.warning(f"Failed to clean up temporary file {file_path}: {str(e)}")


# Background task for certificate processing
async def process_certificate_background(event_id: str, enrollment_no: str) -> None:
    """
    Background task to process certificate generation and email
    This can be used for bulk certificate generation
    """
    try:
        # Validate eligibility
        is_eligible, message = await validate_certificate_eligibility(event_id, enrollment_no)
        if not is_eligible:
            logger.warning(f"Certificate not eligible for {enrollment_no} in {event_id}: {message}")
            return
        
        # Get certificate data
        success, msg, cert_data = await get_certificate_data_for_js(event_id, enrollment_no)
        if not success:
            logger.error(f"Failed to get certificate data for {enrollment_no} in {event_id}: {msg}")
            return
        
        logger.info(f"Background certificate processing completed for {enrollment_no} in {event_id}")
        
    except Exception as e:
        logger.error(f"Background certificate processing failed for {enrollment_no} in {event_id}: {str(e)}")


# Batch processing functions
async def process_bulk_certificates(event_id: str, enrollment_numbers: list) -> Dict[str, Any]:
    """
    Process certificates for multiple students
    
    Args:
        event_id: Event ID
        enrollment_numbers: List of student enrollment numbers
    
    Returns:
        Dictionary with processing results
    """
    results = {
        "successful": [],
        "failed": [],
        "total": len(enrollment_numbers)
    }
    
    for enrollment_no in enrollment_numbers:
        try:
            # Process in background
            await process_certificate_background(event_id, enrollment_no)
            results["successful"].append(enrollment_no)
        except Exception as e:
            logger.error(f"Bulk certificate processing failed for {enrollment_no}: {str(e)}")
            results["failed"].append({
                "enrollment_no": enrollment_no,
                "error": str(e)
            })
        
        # Add small delay to prevent overwhelming the system
        await asyncio.sleep(0.1)
    
    return results


# Concurrency monitoring and statistics
_active_downloads = 0
_download_stats = {
    "total_downloads": 0,
    "successful_downloads": 0,
    "failed_downloads": 0,
    "active_downloads": 0
}

async def get_certificate_download_stats() -> Dict[str, int]:
    """Get current certificate download statistics"""
    global _download_stats
    _download_stats["active_downloads"] = _active_downloads
    return _download_stats.copy()

async def increment_download_counter():
    """Increment active download counter"""
    global _active_downloads, _download_stats
    _active_downloads += 1
    _download_stats["total_downloads"] += 1

async def decrement_download_counter(success: bool = True):
    """Decrement active download counter and update success/failure stats"""
    global _active_downloads, _download_stats
    _active_downloads = max(0, _active_downloads - 1)
    if success:
        _download_stats["successful_downloads"] += 1
    else:
        _download_stats["failed_downloads"] += 1

# Enhanced certificate generation with monitoring
async def generate_certificate_with_monitoring(event_id: str, enrollment_no: str) -> Tuple[bool, str]:
    """
    Generate certificate with download monitoring and concurrency tracking
    
    Args:
        event_id: Event ID
        enrollment_no: Student enrollment number
        
    Returns:
        Tuple of (success, message)
    """
    await increment_download_counter()
    
    try:
        # Validate eligibility first
        is_eligible, message = await validate_certificate_eligibility(event_id, enrollment_no)
        if not is_eligible:
            await decrement_download_counter(success=False)
            return False, message
        
        # Get certificate data
        success, msg, cert_data = await get_certificate_data_for_js(event_id, enrollment_no)
        if not success:
            await decrement_download_counter(success=False)
            return False, msg
        
        # Generate certificate ID if not exists
        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": enrollment_no})
        participations = student_data.get("event_participations", {})
        participation = participations.get(event_id, {})
        
        if not participation.get('certificate_id'):
            from utils.id_generator import generate_certificate_id
            certificate_id = generate_certificate_id(enrollment_no, event_id, student_data.get("full_name", ""))
            
            # Update student's event participation with the certificate ID
            await DatabaseOperations.update_one(
                "students",
                {"enrollment_no": enrollment_no},
                {"$set": {f"event_participations.{event_id}.certificate_id": certificate_id}}
            )
        
        await decrement_download_counter(success=True)
        return True, "Certificate generated successfully"
        
    except Exception as e:
        await decrement_download_counter(success=False)
        logger.error(f"Error in certificate generation with monitoring: {str(e)}")
        return False, f"Certificate generation failed: {str(e)}"

# Template processing enhancement
async def get_certificate_template_content(template_name: str) -> str:
    """
    Get certificate template content asynchronously
    
    Args:
        template_name: Name of the template file
        
    Returns:
        Template HTML content
    """
    try:
        template_path = Path("data") / template_name
        
        if not template_path.exists():
            raise FileNotFoundError(f"Certificate template not found: {template_name}")
        
        # Use aiofiles for async file reading
        async with aiofiles.open(template_path, 'r', encoding='utf-8') as file:
            content = await file.read()
            
        return content
        
    except Exception as e:
        logger.error(f"Error reading certificate template: {str(e)}")
        raise

# Cleanup utilities for temporary files
async def cleanup_old_temp_files(max_age_hours: int = 24) -> int:
    """
    Clean up old temporary certificate files
    
    Args:
        max_age_hours: Maximum age of temp files in hours before cleanup
        
    Returns:
        Number of files cleaned up
    """
    try:
        temp_dir = Path("temp")
        if not temp_dir.exists():
            return 0
        
        current_time = datetime.now()
        cleaned_count = 0
        
        for file_path in temp_dir.glob("cert_*.pdf"):
            try:
                file_age = current_time - datetime.fromtimestamp(file_path.stat().st_mtime)
                if file_age.total_seconds() > (max_age_hours * 3600):
                    await asyncio.get_event_loop().run_in_executor(_thread_pool, file_path.unlink)
                    cleaned_count += 1
                    logger.info(f"Cleaned up old temp file: {file_path}")
            except Exception as file_error:
                logger.warning(f"Failed to clean up temp file {file_path}: {file_error}")
        
        return cleaned_count
        
    except Exception as e:
        logger.error(f"Error cleaning up old temp files: {str(e)}")
        return 0

async def debug_team_certificate_data(event_id: str, enrollment_no: str) -> Dict[str, Any]:
    """
    Debug function to gather all relevant data for troubleshooting team certificate issues
    
    Args:
        event_id: Event ID
        enrollment_no: Student enrollment number
    
    Returns:
        Dictionary with all relevant data for debugging
    """
    debug_data = {
        "event_id": event_id,
        "enrollment_no": enrollment_no,
        "timestamp": datetime.now().isoformat()
    }
    
    try:
        # Get student data
        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": enrollment_no})
        if student_data:
            debug_data["student_found"] = True
            debug_data["student_name"] = student_data.get("full_name")
            
            # Get participation data
            event_participations = student_data.get("event_participations", {})
            if event_id in event_participations:
                participation = event_participations[event_id]
                debug_data["participation_found"] = True
                debug_data["participation_data"] = participation
                debug_data["registration_type"] = participation.get("registration_type")
                debug_data["team_registration_id"] = participation.get("team_registration_id")
                debug_data["has_attendance"] = bool(participation.get("attendance_id"))
                debug_data["has_feedback"] = bool(participation.get("feedback_id"))
            else:
                debug_data["participation_found"] = False
        else:
            debug_data["student_found"] = False
        
        # Get event data
        event_data = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if event_data:
            debug_data["event_found"] = True
            debug_data["event_name"] = event_data.get("event_name")
            debug_data["is_team_based"] = event_data.get("registration_mode") == "team"
            
            # Get team data
            team_registration_id = debug_data.get("team_registration_id")
            if team_registration_id:
                team_registrations = event_data.get("team_registrations", {})
                if team_registration_id in team_registrations:
                    team_data = team_registrations[team_registration_id]
                    debug_data["team_found"] = True
                    debug_data["team_name"] = team_data.get("team_name")
                    debug_data["team_leader"] = team_data.get("team_leader_enrollment")
                    debug_data["team_participants"] = team_data.get("participants", [])
                else:
                    debug_data["team_found"] = False
        else:
            debug_data["event_found"] = False
    
    except Exception as e:
        debug_data["error"] = str(e)
    
    return debug_data
