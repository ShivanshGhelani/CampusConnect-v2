#!/usr/bin/env python3
"""
Helper functions for generating IDs during different phases of the event lifecycle
These functions will be used by attendance, feedback, and certificate modules
"""

import asyncio
from typing import Dict, Optional, List
from utils.db_operations import DatabaseOperations
from utils.id_generator import generate_attendance_id, generate_feedback_id, generate_certificate_id
from datetime import datetime, timezone

async def mark_attendance(enrollment_no: str, event_id: str, present: bool = True):
    """
    Mark attendance for a participant during the attendance marking phase
    
    Args:
        enrollment_no: Student enrollment number
        event_id: Event ID
        present: Whether the student was present (True) or absent (False)
    
    Returns:
        tuple: (success: bool, attendance_id: str or None, message: str)
    """
    try:
        # Get student data
        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": enrollment_no})
        if not student_data:
            return False, None, "Student not found"
        
        # Check if student is registered for this event
        participations = student_data.get('event_participations', {})
        if event_id not in participations:
            return False, None, "Student not registered for this event"
        
        participation = participations[event_id]
        registration_id = participation.get('registration_id')
        
        if not registration_id:
            return False, None, "Registration ID not found - invalid registration"
        
        # Check if attendance already marked
        existing_attendance_id = participation.get('attendance_id')
        if existing_attendance_id:
            return False, existing_attendance_id, "Attendance already marked"
        
        if present:
            # Generate attendance ID only if student was present
            from models.attendance import AttendanceRecord
            attendance_id = AttendanceRecord.generate_attendance_id(
                enrollment_no=enrollment_no,
                full_name=student_data.get('full_name', ''),
                event_id=event_id
            )
            
            # Update student record with attendance ID and status
            await DatabaseOperations.update_one(
                "students",
                {"enrollment_no": enrollment_no},
                {"$set": {
                    f"event_participations.{event_id}.attendance_id": attendance_id,
                    f"event_participations.{event_id}.attendance_status": "present",
                    f"event_participations.{event_id}.attendance_marked_at": datetime.now(timezone.utc)
                }}
            )
            
            # Store attendance in event data for admin tracking
            await DatabaseOperations.update_one(
                "events",
                {"event_id": event_id},
                {"$set": {f"attendances.{attendance_id}": {
                    "enrollment_no": enrollment_no,
                    "registration_id": registration_id,
                    "attendance_status": "present",
                    "marked_at": datetime.now(timezone.utc)
                }}}
            )
            
            return True, attendance_id, "Attendance marked as present"
        else:
            # For absent students, we don't generate attendance_id (it remains None)
            # But we still update the student record to indicate attendance was processed
            await DatabaseOperations.update_one(
                "students",
                {"enrollment_no": enrollment_no},
                {"$set": {
                    f"event_participations.{event_id}.attendance_status": "absent",
                    f"event_participations.{event_id}.attendance_marked_at": datetime.now(timezone.utc)
                }}
            )
            
            # Also store in event data for tracking
            await DatabaseOperations.update_one(
                "events",
                {"event_id": event_id},
                {"$set": {f"attendances.{enrollment_no}": {
                    "enrollment_no": enrollment_no,
                    "registration_id": registration_id,
                    "attendance_status": "absent",
                    "marked_at": datetime.now(timezone.utc)
                }}}
            )
            
            return True, None, "Attendance marked as absent"
            
    except Exception as e:
        print(f"Error marking attendance: {str(e)}")
        return False, None, f"Error marking attendance: {str(e)}"

async def submit_feedback(enrollment_no: str, event_id: str, feedback_data: dict):
    """
    Submit feedback for a participant during the feedback submission phase
    
    Args:
        enrollment_no: Student enrollment number
        event_id: Event ID
        feedback_data: Feedback form data
    
    Returns:
        tuple: (success: bool, feedback_id: str or None, message: str)
    """
    try:
        # Get student data
        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": enrollment_no})
        if not student_data:
            return False, None, "Student not found"
        
        # Check if student is registered and attended
        participations = student_data.get('event_participations', {})
        if event_id not in participations:
            return False, None, "Student not registered for this event"
        
        participation = participations[event_id]
        registration_id = participation.get('registration_id')
        attendance_id = participation.get('attendance_id')
        
        if not registration_id:
            return False, None, "Registration ID not found - invalid registration"
        
        if not attendance_id:
            return False, None, "Attendance ID not found - student did not attend the event"
        
        # Check if feedback already submitted
        existing_feedback_id = participation.get('feedback_id')
        if existing_feedback_id:
            return False, existing_feedback_id, "Feedback already submitted"
        
        # Generate feedback ID
        feedback_id = generate_feedback_id(enrollment_no, event_id)
        
        # Prepare comprehensive feedback data with metadata
        complete_feedback_data = {
            "feedback_id": feedback_id,
            "registration_id": registration_id,
            "attendance_id": attendance_id,
            "event_id": event_id,
            "enrollment_no": enrollment_no,
            "submitted_at": datetime.now(timezone.utc),
            **feedback_data  # Include all form data
        }
        
        # Store feedback in dedicated collection for the event
        feedback_collection_name = f"{event_id}_feedbacks"
        await DatabaseOperations.insert_one(feedback_collection_name, complete_feedback_data)
        
        # Update main event document for tracking
        await DatabaseOperations.update_one(
            "events",
            {"event_id": event_id},
            {"$set": {f"feedbacks.{feedback_id}": enrollment_no}}
        )
        
        # Update student record with feedback ID
        await DatabaseOperations.update_one(
            "students",
            {"enrollment_no": enrollment_no},
            {"$set": {f"event_participations.{event_id}.feedback_id": feedback_id}}
        )
        
        return True, feedback_id, "Feedback submitted successfully"
        
    except Exception as e:
        print(f"Error submitting feedback: {str(e)}")
        return False, None, f"Error submitting feedback: {str(e)}"

async def generate_certificate(enrollment_no: str, event_id: str):
    """
    Generate certificate for a participant during the certificate generation phase
    
    Args:
        enrollment_no: Student enrollment number
        event_id: Event ID
    
    Returns:
        tuple: (success: bool, certificate_id: str or None, message: str)
    """
    try:
        # Get student data
        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": enrollment_no})
        if not student_data:
            return False, None, "Student not found"
        
        # Check if student completed all required steps
        participations = student_data.get('event_participations', {})
        if event_id not in participations:
            return False, None, "Student not registered for this event"
        
        participation = participations[event_id]
        registration_id = participation.get('registration_id')
        attendance_id = participation.get('attendance_id')
        feedback_id = participation.get('feedback_id')
        
        if not registration_id:
            return False, None, "Registration ID not found - invalid registration"
        
        if not attendance_id:
            return False, None, "Attendance ID not found - student did not attend the event"
        
        if not feedback_id:
            return False, None, "Feedback ID not found - student did not submit feedback"
        
        # Check if certificate already generated
        existing_certificate_id = participation.get('certificate_id')
        if existing_certificate_id:
            return False, existing_certificate_id, "Certificate already generated"
        
        # Generate certificate ID
        student_name = participation.get('student_data', {}).get('full_name', '')
        certificate_id = generate_certificate_id(enrollment_no, event_id, student_name)
          # Update student record with certificate ID
        await DatabaseOperations.update_one(
            "students",
            {"enrollment_no": enrollment_no},
            {"$set": {f"event_participations.{event_id}.certificate_id": certificate_id}}
        )
        
        # Here you would also generate and save the actual certificate
        # await DatabaseOperations.insert_one("certificates", {
        #     "certificate_id": certificate_id,
        #     "enrollment_no": enrollment_no,
        #     "event_id": event_id,
        #     "student_name": student_name,
        #     "generated_at": datetime.utcnow(),
        #     "certificate_url": f"/certificates/{certificate_id}.pdf"
        # })
        
        # Send certificate notification email
        try:
            from utils.email_service import EmailService
            email_service = EmailService()
            
            # Get event details for email
            event_data = await DatabaseOperations.find_one("events", {"event_id": event_id})
            event_title = event_data.get('event_name', 'Unknown Event') if event_data else 'Unknown Event'
            event_date = event_data.get('formatted_date', None) if event_data else None
            
            # Get student email
            student_email = student_data.get('email') or participation.get('student_data', {}).get('email')
            
            if student_email:
                # Certificate URL (would be actual download URL in production)
                certificate_url = f"/client/events/{event_id}/certificate"
                
                await email_service.send_certificate_notification(
                    student_email=student_email,
                    student_name=student_name,
                    event_title=event_title,
                    certificate_url=certificate_url,
                    event_date=event_date
                )
                print(f"✅ Certificate notification email sent to {student_email}")
            else:
                print(f"⚠️ No email address found for student {enrollment_no}")
                
        except Exception as email_error:
            # Don't fail certificate generation if email fails
            print(f"⚠️ Failed to send certificate notification email: {email_error}")
        
        return True, certificate_id, "Certificate generated successfully"
        
    except Exception as e:
        return False, None, f"Error generating certificate: {str(e)}"

# Demo functions to test the flow
async def demo_event_lifecycle():
    """Demonstrate the complete event lifecycle flow"""
    print("=== Event Lifecycle Demo ===")
    
    enrollment_no = "22BEIT30043"
    event_id = "AI_ML_BOOTCAMP_2025"
    
    print(f"Testing flow for: {enrollment_no} in event: {event_id}")
    
    # Step 1: Check current registration status
    student_data = await DatabaseOperations.find_one("students", {"enrollment_no": enrollment_no})
    if student_data:
        participation = student_data.get('event_participations', {}).get(event_id, {})
        print(f"\nCurrent status:")
        print(f"  Registration ID: {participation.get('registration_id')}")
        print(f"  Attendance ID: {participation.get('attendance_id')}")
        print(f"  Feedback ID: {participation.get('feedback_id')}")
        print(f"  Certificate ID: {participation.get('certificate_id')}")
    
    # Step 2: Mark attendance
    print(f"\n--- Step 2: Marking Attendance ---")
    success, attendance_id, message = await mark_attendance(enrollment_no, event_id, present=True)
    print(f"Result: {message}")
    if success and attendance_id:
        print(f"Generated Attendance ID: {attendance_id}")
    
    # Step 3: Submit feedback
    print(f"\n--- Step 3: Submitting Feedback ---")
    feedback_data = {"rating": 5, "comments": "Great event!"}
    success, feedback_id, message = await submit_feedback(enrollment_no, event_id, feedback_data)
    print(f"Result: {message}")
    if success and feedback_id:
        print(f"Generated Feedback ID: {feedback_id}")
    
    # Step 4: Generate certificate
    print(f"\n--- Step 4: Generating Certificate ---")
    success, certificate_id, message = await generate_certificate(enrollment_no, event_id)
    print(f"Result: {message}")
    if success and certificate_id:
        print(f"Generated Certificate ID: {certificate_id}")
    
    # Final status check
    student_data = await DatabaseOperations.find_one("students", {"enrollment_no": enrollment_no})
    if student_data:
        participation = student_data.get('event_participations', {}).get(event_id, {})
        print(f"\nFinal status:")
        print(f"  Registration ID: {participation.get('registration_id')}")
        print(f"  Attendance ID: {participation.get('attendance_id')}")
        print(f"  Feedback ID: {participation.get('feedback_id')}")
        print(f"  Certificate ID: {participation.get('certificate_id')}")
        print("✅ Complete event lifecycle demonstrated!")

if __name__ == "__main__":
    asyncio.run(demo_event_lifecycle())
