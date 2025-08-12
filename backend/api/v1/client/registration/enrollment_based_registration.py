#!/usr/bin/env python3
"""
PHASE 1: Enrollment-Based Registration API Endpoints
NEW STRUCTURE: Implements "store once, map anywhere" using enrollment_no as primary key

This is the new API layer that uses the EnrollmentBasedRegistrationService
Created as part of Phase 1 database restructuring
"""

from fastapi import APIRouter, Request, HTTPException, Depends
from dependencies.auth import require_student_login
from models.student import Student
from database.operations import DatabaseOperations
from services.enrollment_based_registration_service import EnrollmentBasedRegistrationService
from core.logger import logger
from datetime import datetime
import uuid

router = APIRouter(prefix="/v2")  # Version 2 API for new structure

# Initialize the new service
service = EnrollmentBasedRegistrationService()

@router.post("/register/individual/{event_id}")
async def register_individual_new_structure(
    event_id: str,
    request: Request,
    student: Student = Depends(require_student_login)
):
    """
    NEW STRUCTURE: Register individual student using enrollment-based mapping
    Uses enrollment_no as primary key instead of complex nested structures
    """
    try:
        # Get registration data from request
        data = await request.json()
        
        # Get event details
        event = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Check if registration is open
        if event.get('status') != 'upcoming' or event.get('sub_status') != 'registration_open':
            raise HTTPException(status_code=400, detail="Registration is not open for this event")
        
        # Check registration mode
        registration_mode = event.get('registration_mode', 'both')
        if registration_mode not in ['individual', 'both']:
            raise HTTPException(status_code=400, detail="Individual registration not allowed for this event")
        
        # Use new enrollment-based service
        result = await service.register_individual_student(
            event_id=event_id,
            enrollment_no=student.enrollment_no,
            registration_data=data
        )
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
        
        logger.info(f"NEW STRUCTURE: Individual registration successful for {student.enrollment_no} in event {event_id}")
        
        return {
            "success": True,
            "message": "Registration successful",
            "registration_id": result["registration_id"],
            "enrollment_no": result["enrollment_no"],
            "registration_type": "individual",
            "structure_version": "v2_enrollment_based",
            "payment_status": "free"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in individual registration (new structure): {str(e)}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@router.post("/register/team/{event_id}")
async def register_team_new_structure(
    event_id: str,
    request: Request,
    student: Student = Depends(require_student_login)
):
    """
    NEW STRUCTURE: Register team using enrollment-based mapping
    Maps enrollment_no -> registration_id instead of registration_id -> enrollment_no
    """
    try:
        # Get registration data from request
        data = await request.json()
        
        # Get event details
        event = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Check if registration is open
        if event.get('status') != 'upcoming' or event.get('sub_status') != 'registration_open':
            raise HTTPException(status_code=400, detail="Registration is not open for this event")
        
        # Check registration mode
        registration_mode = event.get('registration_mode', 'both')
        if registration_mode not in ['team', 'both']:
            raise HTTPException(status_code=400, detail="Team registration not allowed for this event")
        
        # Validate required team data
        team_name = data.get('team_name')
        team_members = data.get('team_members', [])
        
        if not team_name:
            raise HTTPException(status_code=400, detail="Team name is required")
        
        if not team_members:
            raise HTTPException(status_code=400, detail="At least one team member is required")
        
        # Extract enrollment numbers from team members
        team_member_enrollments = []
        for member in team_members:
            enrollment = member.get('enrollment_no')
            if enrollment:
                team_member_enrollments.append(enrollment)
        
        if not team_member_enrollments:
            raise HTTPException(status_code=400, detail="Valid team member enrollment numbers are required")
        
        # Use new enrollment-based service
        result = await service.register_team(
            event_id=event_id,
            team_name=team_name,
            team_leader_enrollment=student.enrollment_no,
            team_members=team_member_enrollments,
            registration_data=data
        )
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
        
        logger.info(f"NEW STRUCTURE: Team registration successful for team '{team_name}' led by {student.enrollment_no} in event {event_id}")
        
        return {
            "success": True,
            "message": "Team registration successful",
            "team_name": result["team_name"],
            "team_leader": result["team_leader"],
            "team_members": result["team_members"],
            "registrations": result["registrations"],
            "structure_version": "v2_enrollment_based",
            "payment_status": "free"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in team registration (new structure): {str(e)}")
        raise HTTPException(status_code=500, detail=f"Team registration failed: {str(e)}")

@router.post("/attendance/mark/{event_id}")
async def mark_attendance_new_structure(
    event_id: str,
    request: Request,
    student: Student = Depends(require_student_login)
):
    """
    NEW STRUCTURE: Mark attendance using enrollment-based mapping
    Updates enrollment_no -> [attendance_ids] mapping
    """
    try:
        data = await request.json()
        attendance_id = data.get('attendance_id') or f"ATT_{uuid.uuid4().hex[:8].upper()}"
        
        # Use new enrollment-based service
        result = await service.mark_attendance(
            event_id=event_id,
            enrollment_no=student.enrollment_no,
            attendance_id=attendance_id
        )
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
        
        logger.info(f"NEW STRUCTURE: Attendance marked for {student.enrollment_no} in event {event_id}")
        
        return {
            "success": True,
            "message": "Attendance marked successfully",
            "attendance_id": result["attendance_id"],
            "enrollment_no": result["enrollment_no"],
            "structure_version": "v2_enrollment_based"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking attendance (new structure): {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to mark attendance: {str(e)}")

@router.post("/feedback/submit/{event_id}")
async def submit_feedback_new_structure(
    event_id: str,
    request: Request,
    student: Student = Depends(require_student_login)
):
    """
    NEW STRUCTURE: Submit feedback using enrollment-based mapping
    Updates enrollment_no -> feedback_id mapping
    """
    try:
        data = await request.json()
        feedback_id = data.get('feedback_id') or f"FEED_{uuid.uuid4().hex[:8].upper()}"
        
        # Use new enrollment-based service
        result = await service.submit_feedback(
            event_id=event_id,
            enrollment_no=student.enrollment_no,
            feedback_id=feedback_id,
            feedback_data=data
        )
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
        
        logger.info(f"NEW STRUCTURE: Feedback submitted for {student.enrollment_no} in event {event_id}")
        
        return {
            "success": True,
            "message": "Feedback submitted successfully",
            "feedback_id": result["feedback_id"],
            "enrollment_no": result["enrollment_no"],
            "structure_version": "v2_enrollment_based"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting feedback (new structure): {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to submit feedback: {str(e)}")

@router.post("/certificate/issue/{event_id}")
async def issue_certificate_new_structure(
    event_id: str,
    request: Request,
    student: Student = Depends(require_student_login)
):
    """
    NEW STRUCTURE: Issue certificate using enrollment-based mapping
    Updates enrollment_no -> certificate_id mapping
    """
    try:
        data = await request.json()
        certificate_id = data.get('certificate_id') or f"CERT_{uuid.uuid4().hex[:8].upper()}"
        
        # Use new enrollment-based service
        result = await service.issue_certificate(
            event_id=event_id,
            enrollment_no=student.enrollment_no,
            certificate_id=certificate_id
        )
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
        
        logger.info(f"NEW STRUCTURE: Certificate issued for {student.enrollment_no} in event {event_id}")
        
        return {
            "success": True,
            "message": "Certificate issued successfully",
            "certificate_id": result["certificate_id"],
            "enrollment_no": result["enrollment_no"],
            "structure_version": "v2_enrollment_based"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error issuing certificate (new structure): {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to issue certificate: {str(e)}")

@router.get("/status/{event_id}")
async def get_status_new_structure(
    event_id: str,
    student: Student = Depends(require_student_login)
):
    """
    NEW STRUCTURE: Get student's event status using enrollment-based lookup
    Demonstrates "map anywhere anytime" principle
    """
    try:
        # Use new enrollment-based service
        result = await service.get_student_event_details(
            event_id=event_id,
            enrollment_no=student.enrollment_no
        )
        
        return {
            "success": True,
            "event_id": event_id,
            "enrollment_no": student.enrollment_no,
            "registered": result["registered"],
            "student_data": result["student_data"],
            "registration": result["registration"],
            "attendance": result["attendance"],
            "feedback": result["feedback"],
            "certificate": result["certificate"],
            "structure_version": "v2_enrollment_based",
            "lookup_method": "enrollment_based_direct"
        }
        
    except Exception as e:
        logger.error(f"Error getting status (new structure): {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")

@router.get("/lookup/enrollment/{enrollment_no}/event/{event_id}")
async def lookup_enrollment_anywhere(
    enrollment_no: str,
    event_id: str,
    _: Student = Depends(require_student_login)
):
    """
    NEW STRUCTURE: Demonstrates "map anywhere anytime" principle
    Lookup any enrollment number in any event using enrollment-based structure
    """
    try:
        # Use new enrollment-based service
        result = await service.get_student_event_details(
            event_id=event_id,
            enrollment_no=enrollment_no
        )
        
        return {
            "success": True,
            "message": "Enrollment-based lookup successful",
            "event_id": event_id,
            "enrollment_no": enrollment_no,
            "found": result["registered"],
            "data": result if result["registered"] else None,
            "structure_version": "v2_enrollment_based",
            "lookup_principle": "store_once_map_anywhere_anytime"
        }
        
    except Exception as e:
        logger.error(f"Error in enrollment lookup: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lookup failed: {str(e)}")

@router.get("/analytics/event/{event_id}")
async def get_event_analytics_new_structure(
    event_id: str,
    _: Student = Depends(require_student_login)
):
    """
    NEW STRUCTURE: Get event analytics using enrollment-based structure
    Shows how the new structure makes analytics easier
    """
    try:
        # Get event with new structure
        event = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Extract analytics from new structure
        analytics = {
            "event_id": event_id,
            "structure_version": "v2_enrollment_based",
            "registrations": {
                "individual_count": len(event.get("registrations", {})),
                "team_count": len(event.get("team_registrations", {})),
                "individual_enrollments": list(event.get("registrations", {}).keys()),
                "team_enrollments": {}
            },
            "attendance": {
                "individual_count": len(event.get("attendances", {})),
                "team_count": len(event.get("team_attendances", {})),
                "individual_enrollments": list(event.get("attendances", {}).keys()),
                "team_enrollments": {}
            },
            "feedback": {
                "individual_count": len(event.get("feedbacks", {})),
                "team_count": len(event.get("team_feedbacks", {})),
                "individual_enrollments": list(event.get("feedbacks", {}).keys()),
                "team_enrollments": {}
            },
            "certificates": {
                "individual_count": len(event.get("certificates", {})),
                "team_count": len(event.get("team_certificates", {})),
                "individual_enrollments": list(event.get("certificates", {}).keys()),
                "team_enrollments": {}
            }
        }
        
        # Extract team enrollment data
        for team_name, team_data in event.get("team_registrations", {}).items():
            analytics["registrations"]["team_enrollments"][team_name] = list(team_data.keys())
        
        for team_name, team_data in event.get("team_attendances", {}).items():
            analytics["attendance"]["team_enrollments"][team_name] = list(team_data.keys())
        
        for team_name, team_data in event.get("team_feedbacks", {}).items():
            analytics["feedback"]["team_enrollments"][team_name] = list(team_data.keys())
        
        for team_name, team_data in event.get("team_certificates", {}).items():
            analytics["certificates"]["team_enrollments"][team_name] = list(team_data.keys())
        
        return {
            "success": True,
            "message": "Analytics extracted using enrollment-based structure",
            "analytics": analytics,
            "benefits": [
                "Direct enrollment_no -> data mapping",
                "No complex nested lookups required",
                "Consistent structure across all operations",
                "Easy to query and aggregate"
            ]
        }
        
    except Exception as e:
        logger.error(f"Error getting analytics (new structure): {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get analytics: {str(e)}")

@router.get("/health")
async def health_check():
    """Health check for new enrollment-based structure API"""
    return {
        "status": "healthy",
        "structure_version": "v2_enrollment_based",
        "principle": "store_once_map_anywhere_anytime",
        "key_mapping": "enrollment_no -> data_ids",
        "timestamp": datetime.utcnow().isoformat()
    }
