"""
Updated Event Registration Service - Enrollment-Based Structure
Implements the new "store once, map anywhere" principle using enrollment_no as primary key
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from fastapi import HTTPException
from database.operations import DatabaseOperations
from core.id_generator import generate_registration_id, generate_team_registration_id
from utils.timezone_helper import get_current_ist, ist_to_utc

logger = logging.getLogger(__name__)

class EnrollmentBasedRegistrationService:
    """
    Enhanced registration service using enrollment_no-based data mapping
    Follows the principle: Store student data once in students collection, 
    map everywhere using enrollment_no
    """
    
    async def register_individual_student(
        self, 
        event_id: str, 
        enrollment_no: str, 
        registration_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Register individual student using new enrollment-based structure
        
        Args:
            event_id: Event identifier
            enrollment_no: Student enrollment number
            registration_data: Registration form data
            
        Returns:
            Registration response with success status and IDs
        """
        try:
            # Get event document
            event = await DatabaseOperations.find_one("events", {"event_id": event_id})
            if not event:
                raise HTTPException(status_code=404, detail="Event not found")
            
            # Check if registration is open
            if event.get('status') != 'upcoming' or event.get('sub_status') != 'registration_open':
                raise HTTPException(status_code=400, detail="Registration is not open for this event")
            
            # Check if student is already registered (NEW STRUCTURE)
            if enrollment_no in event.get('registrations', {}):
                raise HTTPException(status_code=409, detail="Student already registered for this event")
            
            # Get student data from students collection (single source of truth)
            student_data = await DatabaseOperations.find_one("students", {"enrollment_no": enrollment_no})
            if not student_data:
                raise HTTPException(status_code=404, detail="Student not found")
            
            # Generate registration ID
            registration_id = generate_registration_id(
                enrollment_no, 
                event_id, 
                student_data.get('full_name')
            )
            
            # Get current timestamp
            current_ist = get_current_ist()
            registration_datetime = ist_to_utc(current_ist)
            
            # STEP 1: Update student's event_participations (existing structure - works well)
            participation_data = {
                "registration_id": registration_id,
                "registration_type": "individual",
                "registration_datetime": registration_datetime,
                # Store only IDs and minimal metadata, not full student data
                "attendance_id": None,  # Will be set when attendance is marked
                "feedback_id": None,    # Will be set when feedback is submitted  
                "certificate_id": None, # Will be set when certificate is collected
                "certificate_email_sent": False
            }
            
            await DatabaseOperations.update_one(
                "students",
                {"enrollment_no": enrollment_no},
                {"$set": {f"event_participations.{event_id}": participation_data}}
            )
            
            # STEP 2: Update event's registrations using NEW ENROLLMENT-BASED STRUCTURE
            # KEY CHANGE: enrollment_no -> registration_id (instead of registration_id -> enrollment_no)
            await DatabaseOperations.update_one(
                "events",
                {"event_id": event_id},
                {"$set": {f"registrations.{enrollment_no}": registration_id}}
            )
            
            logger.info(f"✅ Individual registration successful: {enrollment_no} -> {registration_id} for event {event_id}")
            
            return {
                "success": True,
                "message": "Registration successful",
                "registration_id": registration_id,
                "enrollment_no": enrollment_no,
                "registration_type": "individual",
                "event_id": event_id,
                "registered_at": registration_datetime.isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Individual registration failed for {enrollment_no}: {str(e)}")
            raise
    
    async def register_team(
        self, 
        event_id: str, 
        team_name: str, 
        team_leader_enrollment: str, 
        team_members: List[str],
        registration_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Register team using new enrollment-based structure
        
        Args:
            event_id: Event identifier
            team_name: Name of the team
            team_leader_enrollment: Team leader's enrollment number
            team_members: List of team member enrollment numbers
            registration_data: Additional registration data
            
        Returns:
            Team registration response
        """
        try:
            # Get event document
            event = await DatabaseOperations.find_one("events", {"event_id": event_id})
            if not event:
                raise HTTPException(status_code=404, detail="Event not found")
            
            # Check if registration is open
            if event.get('status') != 'upcoming' or event.get('sub_status') != 'registration_open':
                raise HTTPException(status_code=400, detail="Registration is not open for this event")
            
            # Check if team name already exists
            team_registrations = event.get('team_registrations', {})
            if team_name in team_registrations:
                raise HTTPException(status_code=409, detail="Team name already exists")
            
            # Validate all team members exist and are not registered
            all_enrollments = [team_leader_enrollment] + team_members
            existing_registrations = event.get('registrations', {})
            
            for enrollment in all_enrollments:
                # Check individual registrations
                if enrollment in existing_registrations:
                    raise HTTPException(status_code=409, detail=f"Student {enrollment} is already registered")
                
                # Check team registrations
                for existing_team_name, team_data in team_registrations.items():
                    if enrollment in team_data and enrollment.startswith("22"):  # Is enrollment number
                        raise HTTPException(status_code=409, detail=f"Student {enrollment} is already in team {existing_team_name}")
            
            # Generate team registration ID
            team_registration_id = generate_team_registration_id(team_name, event_id, team_leader_enrollment)
            current_ist = get_current_ist()
            registration_datetime = ist_to_utc(current_ist)
            
            # STEP 1: Register each team member in students collection
            team_member_registrations = {}
            
            for enrollment in all_enrollments:
                is_leader = (enrollment == team_leader_enrollment)
                
                # Generate individual registration ID for each member
                member_registration_id = generate_registration_id(enrollment, event_id, "Team Member")
                
                # Update student's event_participations
                participation_data = {
                    "registration_id": member_registration_id,
                    "registration_type": "team_leader" if is_leader else "team_member",
                    "registration_datetime": registration_datetime,
                    "team_name": team_name,
                    "team_registration_id": team_registration_id,
                    "attendance_id": None,
                    "feedback_id": None,
                    "certificate_id": None,
                    "certificate_email_sent": False
                }
                
                await DatabaseOperations.update_one(
                    "students",
                    {"enrollment_no": enrollment},
                    {"$set": {f"event_participations.{event_id}": participation_data}}
                )
                
                team_member_registrations[enrollment] = member_registration_id
            
            # STEP 2: Update event's team_registrations using NEW ENROLLMENT-BASED STRUCTURE
            team_data = {}
            
            # Add each member with enrollment_no as key, registration_id as value
            for enrollment, reg_id in team_member_registrations.items():
                team_data[enrollment] = reg_id
            
            # Add team metadata (non-enrollment keys)
            team_data.update({
                "team_leader": team_leader_enrollment,
                "team_registration_id": team_registration_id,
                "registered_at": registration_datetime.isoformat(),
                "member_count": len(all_enrollments)
            })
            
            await DatabaseOperations.update_one(
                "events",
                {"event_id": event_id},
                {"$set": {f"team_registrations.{team_name}": team_data}}
            )
            
            logger.info(f"✅ Team registration successful: {team_name} with {len(all_enrollments)} members for event {event_id}")
            
            return {
                "success": True,
                "message": "Team registration successful",
                "team_name": team_name,
                "team_registration_id": team_registration_id,
                "team_leader": team_leader_enrollment,
                "team_members": team_members,
                "member_registrations": team_member_registrations,
                "event_id": event_id,
                "registered_at": registration_datetime.isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Team registration failed for {team_name}: {str(e)}")
            raise
    
    async def mark_attendance(
        self, 
        event_id: str, 
        enrollment_no: str, 
        attendance_id: str,
        attendance_type: str = "physical",
        session_name: str = None
    ) -> Dict[str, Any]:
        """
        Mark attendance using new enrollment-based structure
        Store attendance IDs only when actually marked (not pre-created)
        
        Args:
            event_id: Event identifier
            enrollment_no: Student enrollment number
            attendance_id: Generated attendance ID
            attendance_type: Type of attendance (physical, virtual, session-based)
            session_name: Optional session name for multi-session events
            
        Returns:
            Attendance marking response
        """
        try:
            # STEP 1: Update student's event_participations
            student_data = await DatabaseOperations.find_one("students", {"enrollment_no": enrollment_no})
            if not student_data:
                raise HTTPException(status_code=404, detail="Student not found")
            
            participation = student_data.get('event_participations', {}).get(event_id)
            if not participation:
                raise HTTPException(status_code=404, detail="Student not registered for this event")
            
            # Check if attendance already marked (prevent duplicates)
            if participation.get('attendance_id'):
                raise HTTPException(status_code=409, detail="Attendance already marked")
            
            # Update student participation with attendance ID
            await DatabaseOperations.update_one(
                "students",
                {"enrollment_no": enrollment_no},
                {"$set": {
                    f"event_participations.{event_id}.attendance_id": attendance_id,
                    f"event_participations.{event_id}.attendance_marked_at": datetime.utcnow(),
                    f"event_participations.{event_id}.attendance_status": "present"
                }}
            )
            
            # STEP 2: Update event's attendances using NEW ENROLLMENT-BASED STRUCTURE
            # KEY CHANGE: enrollment_no -> [attendance_ids] (supports multiple sessions)
            event = await DatabaseOperations.find_one("events", {"event_id": event_id})
            if not event:
                raise HTTPException(status_code=404, detail="Event not found")
            
            # Determine if this is individual or team attendance
            team_name = participation.get('team_name')
            
            if team_name:
                # Team attendance: team_name -> {enrollment_no: [attendance_ids]}
                update_path = f"team_attendances.{team_name}.{enrollment_no}"
                current_attendances = event.get('team_attendances', {}).get(team_name, {}).get(enrollment_no, [])
            else:
                # Individual attendance: enrollment_no -> [attendance_ids]
                update_path = f"attendances.{enrollment_no}"
                current_attendances = event.get('attendances', {}).get(enrollment_no, [])
            
            # Add new attendance ID to the list
            updated_attendances = current_attendances + [attendance_id]
            
            await DatabaseOperations.update_one(
                "events",
                {"event_id": event_id},
                {"$set": {update_path: updated_attendances}}
            )
            
            logger.info(f"✅ Attendance marked: {enrollment_no} -> {attendance_id} for event {event_id}")
            
            return {
                "success": True,
                "message": "Attendance marked successfully",
                "enrollment_no": enrollment_no,
                "attendance_id": attendance_id,
                "event_id": event_id,
                "marked_at": datetime.utcnow().isoformat(),
                "team_name": team_name
            }
            
        except Exception as e:
            logger.error(f"❌ Attendance marking failed for {enrollment_no}: {str(e)}")
            raise
    
    async def submit_feedback(
        self, 
        event_id: str, 
        enrollment_no: str, 
        feedback_id: str,
        feedback_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Submit feedback using new enrollment-based structure
        Store feedback IDs only when actually submitted
        """
        try:
            # STEP 1: Validate student and attendance
            student_data = await DatabaseOperations.find_one("students", {"enrollment_no": enrollment_no})
            if not student_data:
                raise HTTPException(status_code=404, detail="Student not found")
            
            participation = student_data.get('event_participations', {}).get(event_id)
            if not participation:
                raise HTTPException(status_code=404, detail="Student not registered for this event")
            
            if not participation.get('attendance_id'):
                raise HTTPException(status_code=400, detail="Feedback can only be submitted after attending the event")
            
            if participation.get('feedback_id'):
                raise HTTPException(status_code=409, detail="Feedback already submitted")
            
            # STEP 2: Update student participation
            await DatabaseOperations.update_one(
                "students",
                {"enrollment_no": enrollment_no},
                {"$set": {
                    f"event_participations.{event_id}.feedback_id": feedback_id,
                    f"event_participations.{event_id}.feedback_submitted_at": datetime.utcnow()
                }}
            )
            
            # STEP 3: Update event's feedbacks using NEW ENROLLMENT-BASED STRUCTURE
            team_name = participation.get('team_name')
            
            if team_name:
                # Team feedback: team_name -> {enrollment_no: feedback_id}
                update_path = f"team_feedbacks.{team_name}.{enrollment_no}"
            else:
                # Individual feedback: enrollment_no -> feedback_id
                update_path = f"feedbacks.{enrollment_no}"
            
            await DatabaseOperations.update_one(
                "events",
                {"event_id": event_id},
                {"$set": {update_path: feedback_id}}
            )
            
            # STEP 4: Store actual feedback data in dedicated collection
            feedback_document = {
                "feedback_id": feedback_id,
                "event_id": event_id,
                "enrollment_no": enrollment_no,
                "registration_id": participation['registration_id'],
                "attendance_id": participation['attendance_id'],
                "submitted_at": datetime.utcnow(),
                **feedback_data
            }
            
            await DatabaseOperations.insert_one(f"{event_id}_feedbacks", feedback_document)
            
            logger.info(f"✅ Feedback submitted: {enrollment_no} -> {feedback_id} for event {event_id}")
            
            return {
                "success": True,
                "message": "Feedback submitted successfully",
                "enrollment_no": enrollment_no,
                "feedback_id": feedback_id,
                "event_id": event_id,
                "submitted_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Feedback submission failed for {enrollment_no}: {str(e)}")
            raise
    
    async def issue_certificate(
        self, 
        event_id: str, 
        enrollment_no: str, 
        certificate_id: str
    ) -> Dict[str, Any]:
        """
        Issue certificate using new enrollment-based structure
        Store certificate IDs only when actually collected/generated
        """
        try:
            # STEP 1: Validate student and feedback
            student_data = await DatabaseOperations.find_one("students", {"enrollment_no": enrollment_no})
            if not student_data:
                raise HTTPException(status_code=404, detail="Student not found")
            
            participation = student_data.get('event_participations', {}).get(event_id)
            if not participation:
                raise HTTPException(status_code=404, detail="Student not registered for this event")
            
            if not participation.get('attendance_id'):
                raise HTTPException(status_code=400, detail="Certificate can only be issued after attending the event")
            
            if not participation.get('feedback_id'):
                raise HTTPException(status_code=400, detail="Certificate can only be issued after submitting feedback")
            
            if participation.get('certificate_id'):
                raise HTTPException(status_code=409, detail="Certificate already issued")
            
            # STEP 2: Update student participation
            await DatabaseOperations.update_one(
                "students",
                {"enrollment_no": enrollment_no},
                {"$set": {
                    f"event_participations.{event_id}.certificate_id": certificate_id,
                    f"event_participations.{event_id}.certificate_issued_at": datetime.utcnow()
                }}
            )
            
            # STEP 3: Update event's certificates using NEW ENROLLMENT-BASED STRUCTURE
            team_name = participation.get('team_name')
            
            if team_name:
                # Team certificate: team_name -> {enrollment_no: certificate_id}
                update_path = f"team_certificates.{team_name}.{enrollment_no}"
            else:
                # Individual certificate: enrollment_no -> certificate_id
                update_path = f"certificates.{enrollment_no}"
            
            await DatabaseOperations.update_one(
                "events",
                {"event_id": event_id},
                {"$set": {update_path: certificate_id}}
            )
            
            logger.info(f"✅ Certificate issued: {enrollment_no} -> {certificate_id} for event {event_id}")
            
            return {
                "success": True,
                "message": "Certificate issued successfully",
                "enrollment_no": enrollment_no,
                "certificate_id": certificate_id,
                "event_id": event_id,
                "issued_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Certificate issuance failed for {enrollment_no}: {str(e)}")
            raise
    
    async def get_student_event_details(self, event_id: str, enrollment_no: str) -> Dict[str, Any]:
        """
        Get complete event details for a student using enrollment-based lookup
        Demonstrates the "map anywhere" principle - use enrollment_no to find all related data
        """
        try:
            # Get student data (single source of truth)
            student_data = await DatabaseOperations.find_one("students", {"enrollment_no": enrollment_no})
            if not student_data:
                raise HTTPException(status_code=404, detail="Student not found")
            
            # Get event data
            event = await DatabaseOperations.find_one("events", {"event_id": event_id})
            if not event:
                raise HTTPException(status_code=404, detail="Event not found")
            
            # Get participation from student document
            participation = student_data.get('event_participations', {}).get(event_id)
            if not participation:
                return {
                    "registered": False,
                    "student_data": {
                        "enrollment_no": enrollment_no,
                        "full_name": student_data.get('full_name'),
                        "email": student_data.get('email'),
                        "department": student_data.get('department')
                    },
                    "event_data": {
                        "event_id": event_id,
                        "event_name": event.get('event_name'),
                        "status": event.get('status')
                    }
                }
            
            # Build comprehensive response using enrollment-based mapping
            response = {
                "registered": True,
                "student_data": {
                    "enrollment_no": enrollment_no,
                    "full_name": student_data.get('full_name'),
                    "email": student_data.get('email'),
                    "department": student_data.get('department'),
                    "semester": student_data.get('semester')
                },
                "participation_data": participation,
                "registration": {
                    "registration_id": participation.get('registration_id'),
                    "registration_type": participation.get('registration_type'),
                    "registered_at": participation.get('registration_datetime')
                },
                "attendance": {
                    "attendance_id": participation.get('attendance_id'),
                    "marked": participation.get('attendance_id') is not None,
                    "marked_at": participation.get('attendance_marked_at')
                },
                "feedback": {
                    "feedback_id": participation.get('feedback_id'),
                    "submitted": participation.get('feedback_id') is not None,
                    "submitted_at": participation.get('feedback_submitted_at')
                },
                "certificate": {
                    "certificate_id": participation.get('certificate_id'),
                    "issued": participation.get('certificate_id') is not None,
                    "issued_at": participation.get('certificate_issued_at')
                }
            }
            
            # Add team information if applicable
            team_name = participation.get('team_name')
            if team_name:
                response["team"] = {
                    "team_name": team_name,
                    "team_registration_id": participation.get('team_registration_id'),
                    "is_leader": participation.get('registration_type') == 'team_leader'
                }
            
            return response
            
        except Exception as e:
            logger.error(f"❌ Failed to get student event details for {enrollment_no}: {str(e)}")
            raise
