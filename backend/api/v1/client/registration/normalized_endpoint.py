"""
Updated Registration Endpoint - Normalized Data Storage
Eliminates duplication between student.event_participations and event.registrations
"""
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException, Depends
from dependencies.auth import require_student_login, get_current_student
from models.student import Student
from database.operations import DatabaseOperations
from core.id_generator import generate_registration_id, generate_team_registration_id
from .normalized_registration import NormalizedRegistrationService

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/register/{event_id}")
async def register_for_event_normalized(
    event_id: str,
    request: Request,
    student: Student = Depends(require_student_login)
):
    """
    Register a student for an event using normalized storage
    - Full data stored in event.registrations (primary source)
    - Reference data stored in student.event_participations (minimal metadata)
    """
    try:
        # Get registration data from request
        data = await request.json()
        
        # Get event details
        event = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Check if event is accepting registrations
        if event.get("status") != "upcoming":
            raise HTTPException(status_code=400, detail="Event is not accepting registrations")
        
        # Check if student is already registered
        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": student.enrollment_no})
        if not student_data:
            raise HTTPException(status_code=404, detail="Student not found")
        
        event_participations = student_data.get('event_participations', {})
        if event_id in event_participations:
            raise HTTPException(status_code=400, detail="Already registered for this event")
        
        # Determine registration type
        registration_type = data.get('registration_type', 'individual')
        
        if registration_type == 'individual':
            result = await NormalizedRegistrationService.register_individual(
                student=student,
                event_id=event_id,
                registration_data=data
            )
        
        elif registration_type == 'team':
            team_name = data.get('team_name')
            team_members = data.get('team_members', [])
            
            if not team_name:
                raise HTTPException(status_code=400, detail="Team name is required for team registration")
            
            if not team_members:
                raise HTTPException(status_code=400, detail="Team members are required for team registration")
            
            result = await NormalizedRegistrationService.register_team(
                leader=student,
                event_id=event_id,
                team_name=team_name,
                team_members=team_members,
                registration_data=data
            )
        
        else:
            raise HTTPException(status_code=400, detail="Invalid registration type")
        
        return {
            "success": True,
            "message": "Registration successful",
            "registration_id": result.get("registration_id") or result.get("leader_registration_id"),
            "data": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail="Registration failed")


@router.get("/my-registrations")
async def get_my_registrations(
    student: Student = Depends(require_student_login)
):
    """
    Get student's registrations using normalized storage
    Returns reference data from student.event_participations with option to resolve full data
    """
    try:
        # Get student's registration references
        registrations = await NormalizedRegistrationService.get_student_registrations(
            student.enrollment_no
        )
        
        # Optionally resolve full data for each registration
        enriched_registrations = {}
        
        for event_id, reference_data in registrations.items():
            if reference_data and "registration_id" in reference_data:
                # Get event basic info
                event = await DatabaseOperations.find_one(
                    "events",
                    {"event_id": event_id},
                    {"event_name": 1, "event_date": 1, "event_time": 1, "venue": 1, "status": 1}
                )
                
                enriched_registrations[event_id] = {
                    **reference_data,
                    "event_info": event
                }
        
        return {
            "success": True,
            "registrations": enriched_registrations
        }
        
    except Exception as e:
        logger.error(f"Error getting registrations: {e}")
        raise HTTPException(status_code=500, detail="Failed to get registrations")


@router.get("/registration/{registration_id}/details")
async def get_registration_details(
    registration_id: str,
    student: Student = Depends(require_student_login)
):
    """
    Get full registration details from primary source (event.registrations)
    """
    try:
        # First verify the registration belongs to this student
        student_registrations = await NormalizedRegistrationService.get_student_registrations(
            student.enrollment_no
        )
        
        # Find which event this registration belongs to
        event_id = None
        for eid, ref_data in student_registrations.items():
            if ref_data.get("registration_id") == registration_id:
                event_id = eid
                break
        
        if not event_id:
            raise HTTPException(status_code=404, detail="Registration not found or not authorized")
        
        # Get full registration data from primary source
        full_data = await NormalizedRegistrationService.get_full_registration_data(
            registration_id, event_id
        )
        
        if not full_data:
            raise HTTPException(status_code=404, detail="Registration details not found")
        
        # Get event info
        event = await DatabaseOperations.find_one(
            "events",
            {"event_id": event_id},
            {"event_name": 1, "event_date": 1, "event_time": 1, "venue": 1, "status": 1}
        )
        
        return {
            "success": True,
            "registration": full_data,
            "event": event
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting registration details: {e}")
        raise HTTPException(status_code=500, detail="Failed to get registration details")


@router.delete("/registration/{registration_id}")
async def cancel_registration(
    registration_id: str,
    student: Student = Depends(require_student_login)
):
    """
    Cancel a registration (removes from both normalized storage locations)
    """
    try:
        # Find which event this registration belongs to
        student_registrations = await NormalizedRegistrationService.get_student_registrations(
            student.enrollment_no
        )
        
        event_id = None
        for eid, ref_data in student_registrations.items():
            if ref_data.get("registration_id") == registration_id:
                event_id = eid
                break
        
        if not event_id:
            raise HTTPException(status_code=404, detail="Registration not found or not authorized")
        
        # Check if cancellation is allowed (e.g., event hasn't started)
        event = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        if event.get("status") not in ["upcoming"]:
            raise HTTPException(status_code=400, detail="Cannot cancel registration for this event")
        
        # Remove from both locations
        # 1. Remove from event.registrations (primary source)
        await DatabaseOperations.update_one(
            "events",
            {"event_id": event_id},
            {"$unset": {f"registrations.{registration_id}": ""}}
        )
        
        # 2. Remove from student.event_participations (reference)
        await DatabaseOperations.update_one(
            "students",
            {"enrollment_no": student.enrollment_no},
            {"$unset": {f"event_participations.{event_id}": ""}}
        )
        
        return {
            "success": True,
            "message": "Registration cancelled successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling registration: {e}")
        raise HTTPException(status_code=500, detail="Failed to cancel registration")


@router.post("/migrate-to-normalized")
async def migrate_registrations_to_normalized():
    """
    Migration endpoint to convert existing duplicated data to normalized format
    This should be run once to eliminate data duplication
    """
    try:
        from .normalized_registration import migrate_existing_registrations
        
        migration_count = await migrate_existing_registrations()
        
        return {
            "success": True,
            "message": f"Migration completed successfully",
            "migrated_count": migration_count
        }
        
    except Exception as e:
        logger.error(f"Migration error: {e}")
        raise HTTPException(status_code=500, detail="Migration failed")
