"""
Client Registration API
Handles event registration validation and API endpoints for students
"""
import logging
from datetime import datetime
from fastapi import APIRouter, Request, HTTPException, Depends
from dependencies.auth import require_student_login, get_current_student
from models.student import Student
from database.operations import DatabaseOperations
from core.id_generator import generate_registration_id, generate_team_registration_id

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/register/{event_id}")
async def register_for_event(
    event_id: str,
    request: Request,
    student: Student = Depends(require_student_login)
):
    """Register a student for an event"""
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
        
        # Get student data
        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": student.enrollment_no})
        if not student_data:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Check if already registered
        event_participations = student_data.get('event_participations', {})
        if event_id in event_participations:
            raise HTTPException(status_code=409, detail="You are already registered for this event")
        
        # Generate registration ID
        registration_id = generate_registration_id(
            student.enrollment_no, 
            event_id, 
            data.get('full_name', student_data.get('full_name'))
        )
        
        # Prepare registration data
        registration_type = data.get('registration_type', 'individual')
        registration_datetime = datetime.utcnow().isoformat()
        
        # Base participation data
        participation_data = {
            "registration_id": registration_id,
            "registration_type": registration_type,
            "registration_datetime": registration_datetime,
            "student_data": {
                "full_name": data.get('full_name', student_data.get('full_name')),
                "enrollment_no": data.get('enrollment_no', student.enrollment_no),
                "email": data.get('email', student_data.get('email')),
                "mobile_no": data.get('mobile_no', student_data.get('mobile_no')),
                "department": data.get('department', student_data.get('department')),
                "semester": data.get('semester', student_data.get('semester')),
                "gender": data.get('gender', student_data.get('gender')),
                "date_of_birth": data.get('date_of_birth', student_data.get('date_of_birth'))
            }
        }
        
        # Handle team registration
        if registration_type == 'team':
            team_name = data.get('team_name')
            team_members = data.get('team_members', [])
            
            if not team_name:
                raise HTTPException(status_code=400, detail="Team name is required for team registration")
            
            if not team_members:
                raise HTTPException(status_code=400, detail="Team members are required for team registration")
            
            # Generate team registration ID
            team_registration_id = generate_team_registration_id(
                team_name, 
                event_id, 
                student.enrollment_no
            )
            
            participation_data.update({
                "team_registration_id": team_registration_id,
                "student_data": {
                    **participation_data["student_data"],
                    "team_name": team_name,
                    "team_members": team_members,
                    "is_team_leader": True
                }
            })
            
            # Register team members
            for member in team_members:
                member_enrollment = member.get('enrollment_no')
                if member_enrollment:
                    # Check if member exists
                    member_data = await DatabaseOperations.find_one("students", {"enrollment_no": member_enrollment})
                    if member_data:
                        # Check if member is already registered for this event
                        member_participations = member_data.get('event_participations', {})
                        if event_id not in member_participations:
                            # Register team member
                            member_registration_id = generate_registration_id(
                                member_enrollment,
                                event_id,
                                member.get('name', member_data.get('full_name'))
                            )
                            member_participation_data = {
                                "registration_id": member_registration_id,
                                "registration_type": "team_member",
                                "registration_datetime": registration_datetime,
                                "team_registration_id": team_registration_id,
                                "team_leader_enrollment": student.enrollment_no,
                                "student_data": {
                                    "full_name": member.get('name', member_data.get('full_name')),
                                    "enrollment_no": member_enrollment,
                                    "email": member.get('email', member_data.get('email')),
                                    "mobile_no": member.get('mobile_no', member_data.get('mobile_no')),
                                    "department": member_data.get('department'),
                                    "semester": member_data.get('semester'),
                                    "team_name": team_name,
                                    "is_team_leader": False
                                }
                            }
                            
                            # Update member's event participations
                            await DatabaseOperations.update_one(
                                "students",
                                {"enrollment_no": member_enrollment},
                                {"$set": {f"event_participations.{event_id}": member_participation_data}}
                            )
                            
                            # Add to event registrations
                            await DatabaseOperations.update_one(
                                "events",
                                {"event_id": event_id},
                                {"$set": {f"registrations.{member_registration_id}": member_participation_data}}
                            )
        
        # Update student's event participations
        await DatabaseOperations.update_one(
            "students",
            {"enrollment_no": student.enrollment_no},
            {"$set": {f"event_participations.{event_id}": participation_data}}
        )
        
        # Add to event registrations mapping
        await DatabaseOperations.update_one(
            "events",
            {"event_id": event_id},
            {"$set": {f"registrations.{registration_id}": participation_data}}
        )
        
        # Send confirmation email (optional)
        try:
            # TODO: Implement registration confirmation email
            logger.info(f"Registration successful for {student.enrollment_no} in event {event_id}")
        except Exception as email_error:
            logger.warning(f"Email notification skipped: {email_error}")
        
        return {
            "success": True,
            "message": "Registration successful",
            "registration_id": registration_id,
            "registration_type": registration_type,
            "payment_status": "free"  # Default to free, can be updated based on event requirements
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in register_for_event: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

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

@router.get("/validate-faculty-participant")
async def validate_faculty_participant(faculty_id: str):
    """API endpoint to validate team participant faculty ID"""
    try:
        # Clean and validate faculty ID
        faculty_id = faculty_id.strip()
        
        if not faculty_id:
            return {"success": False, "message": "Faculty ID is required"}
        
        # Check if faculty exists in database
        faculty = await DatabaseOperations.find_one("faculties", {"employee_id": faculty_id})
        
        if not faculty:
            return {
                "success": False, 
                "message": f"Faculty with ID {faculty_id} not found in our database"
            }
        
        # Return faculty details for team registration
        return {
            "success": True,
            "message": "Faculty found",
            "faculty_data": {
                "faculty_id": faculty.get('employee_id', ''),
                "full_name": faculty.get('full_name', ''),
                "email": faculty.get('email', ''),
                "department": faculty.get('department', ''),
                "designation": faculty.get('designation', ''),
                "contact_no": faculty.get('contact_no', '')
            }
        }
        
    except Exception as e:
        logger.error(f"Error in validate_faculty_participant: {str(e)}")
        return {"success": False, "message": f"Error validating faculty participant: {str(e)}"}

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
        # Get event data which contains the registrations
        event = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event:
            return {"success": False, "message": "Event not found"}
        
        # Check if registrations exist for this event
        registrations = event.get('registrations', {})
        
        # Find registration for current student
        student_registration = None
        registration_id = None
        
        for reg_id, reg_data in registrations.items():
            # Check if this registration belongs to the current student
            student_data = reg_data.get('student_data', {})
            if student_data.get('enrollment_no') == student.enrollment_no:
                student_registration = reg_data
                registration_id = reg_id
                break
        
        if not student_registration:
            return {
                "success": True,
                "registered": False,
                "message": "Not registered for this event"
            }
        
        # Get team members with complete data if it's a team registration
        team_members_with_data = []
        if student_registration.get('registration_type') == 'team':
            team_members = student_registration.get('student_data', {}).get('team_members', [])
            for member in team_members:
                member_enrollment = member.get('enrollment_no')
                if member_enrollment:
                    # Get complete student data for team member from students collection
                    member_student_data = await DatabaseOperations.find_one("students", {"enrollment_no": member_enrollment})
                    if member_student_data:
                        team_members_with_data.append({
                            "enrollment_no": member_enrollment,
                            "full_name": member_student_data.get('full_name', member.get('name', 'N/A')),
                            "name": member_student_data.get('full_name', member.get('name', 'N/A')),  # Alias
                            "department": member_student_data.get('department', 'N/A'),
                            "semester": member_student_data.get('semester', 'N/A'),
                            "email": member_student_data.get('email', member.get('email', 'N/A')),
                            "mobile_no": member_student_data.get('mobile_no', member.get('mobile_no', 'N/A'))
                        })
                    else:
                        # Fallback to stored data if student not found
                        team_members_with_data.append({
                            "enrollment_no": member_enrollment,
                            "full_name": member.get('name', 'N/A'),
                            "name": member.get('name', 'N/A'),
                            "department": "N/A",  # Not available in stored data
                            "semester": "N/A",
                            "email": member.get('email', 'N/A'),
                            "mobile_no": member.get('mobile_no', 'N/A')
                        })

        # Extract student data from the registration
        reg_student_data = student_registration.get('student_data', {})

        return {
            "success": True,
            "registered": True,
            "registration_data": {
                "registration_id": student_registration.get('registration_id'),
                "registrar_id": student_registration.get('registration_id'),  # Alias for backward compatibility
                "registration_type": student_registration.get('registration_type', 'individual'),
                "registration_datetime": student_registration.get('registration_datetime'),
                "team_name": reg_student_data.get('team_name'),
                "team_registration_id": student_registration.get('team_registration_id'),
                "team_members": team_members_with_data,  # Complete team member data with departments
                # Leader data (current student) from the registration
                "full_name": reg_student_data.get('full_name'),
                "enrollment_no": reg_student_data.get('enrollment_no'),
                "department": reg_student_data.get('department'),  # This should be available in stored registration
                "semester": reg_student_data.get('semester'),
                "email": reg_student_data.get('email'),
                "mobile_no": reg_student_data.get('mobile_no'),
                "payment_status": "free"  # Default value, can be updated based on event requirements
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting registration status: {str(e)}")
        return {"success": False, "message": f"Error getting registration status: {str(e)}"}

@router.post("/cancel/{event_id}")
async def cancel_registration(event_id: str, student: Student = Depends(require_student_login)):
    """Cancel registration for an event (if allowed) - Complete cleanup"""
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
        
        registration_type = participation.get('registration_type', 'individual')
        registration_id = participation.get('registration_id')
        team_registration_id = participation.get('team_registration_id')
        
        logger.info(f"Cancelling registration: {registration_type} for {student.enrollment_no} in event {event_id}")
        
        # Handle team registration cancellation
        if registration_type == 'team':
            # This is a team leader cancelling - cancel entire team
            team_members = participation.get('student_data', {}).get('team_members', [])
            
            logger.info(f"Cancelling team registration with {len(team_members)} members")
            
            # Remove all team members from students collection
            for member in team_members:
                member_enrollment = member.get('enrollment_no')
                if member_enrollment:
                    logger.info(f"Removing team member {member_enrollment} from students collection")
                    await DatabaseOperations.update_one(
                        "students",
                        {"enrollment_no": member_enrollment},
                        {"$unset": {f"event_participations.{event_id}": ""}}
                    )
            
            # Remove all team member registrations from events collection
            registrations = event.get('registrations', {})
            team_registration_ids_to_remove = []
            
            for reg_id, reg_data in registrations.items():
                # Remove team leader registration
                if reg_id == registration_id:
                    team_registration_ids_to_remove.append(reg_id)
                    continue
                
                # Remove team member registrations
                reg_student_data = reg_data.get('student_data', {})
                reg_team_id = reg_data.get('team_registration_id')
                
                if (reg_team_id == team_registration_id or 
                    reg_student_data.get('enrollment_no') in [m.get('enrollment_no') for m in team_members]):
                    team_registration_ids_to_remove.append(reg_id)
            
            # Remove all identified registrations from events collection
            for reg_id in team_registration_ids_to_remove:
                logger.info(f"Removing registration {reg_id} from events collection")
                await DatabaseOperations.update_one(
                    "events",
                    {"event_id": event_id},
                    {"$unset": {f"registrations.{reg_id}": ""}}
                )
            
            # Remove from team_registrations if it exists
            if team_registration_id:
                logger.info(f"Removing team registration {team_registration_id} from events collection")
                await DatabaseOperations.update_one(
                    "events",
                    {"event_id": event_id},
                    {"$unset": {f"team_registrations.{team_registration_id}": ""}}
                )
        
        elif registration_type in ['team_member', 'team_participant']:
            # This is a team member cancelling - just remove this member
            logger.info(f"Cancelling individual team member registration")
            
            # Remove from student's event_participations
            await DatabaseOperations.update_one(
                "students",
                {"enrollment_no": student.enrollment_no},
                {"$unset": {f"event_participations.{event_id}": ""}}
            )
            
            # Remove from event's registrations
            if registration_id:
                await DatabaseOperations.update_one(
                    "events",
                    {"event_id": event_id},
                    {"$unset": {f"registrations.{registration_id}": ""}}
                )
        
        else:
            # Individual registration cancellation
            logger.info(f"Cancelling individual registration")
            
            # Remove from student's event_participations
            await DatabaseOperations.update_one(
                "students",
                {"enrollment_no": student.enrollment_no},
                {"$unset": {f"event_participations.{event_id}": ""}}
            )
            
            # Remove from event's registrations
            if registration_id:
                await DatabaseOperations.update_one(
                    "events",
                    {"event_id": event_id},
                    {"$unset": {f"registrations.{registration_id}": ""}}
                )
        
        # Always remove the current student's participation
        await DatabaseOperations.update_one(
            "students",
            {"enrollment_no": student.enrollment_no},
            {"$unset": {f"event_participations.{event_id}": ""}}
        )
        
        logger.info(f"Registration cancellation completed for {student.enrollment_no} in event {event_id}")
        
        return {
            "success": True,
            "message": "Registration cancelled successfully"
        }
        
    except Exception as e:
        logger.error(f"Error cancelling registration: {str(e)}")
        return {"success": False, "message": f"Error cancelling registration: {str(e)}"}


@router.post("/add-team-member")
async def add_team_member(
    request: Request,
    student: Student = Depends(require_student_login)
):
    """Add a new member to an existing team registration"""
    try:
        request_data = await request.json()
        event_id = request_data.get('event_id')
        team_id = request_data.get('team_id')
        enrollment_no = request_data.get('enrollment_no')
        
        if not all([event_id, enrollment_no]):
            return {"success": False, "message": "Event ID and enrollment number are required"}
        
        # Get event data
        event = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event:
            return {"success": False, "message": "Event not found"}
        
        # Find the team leader's registration
        registrations = event.get('registrations', {})
        team_registration = None
        team_reg_id = None
        
        for reg_id, reg_data in registrations.items():
            student_data = reg_data.get('student_data', {})
            if (student_data.get('enrollment_no') == student.enrollment_no and 
                reg_data.get('registration_type') == 'team'):
                team_registration = reg_data
                team_reg_id = reg_id
                break
        
        if not team_registration:
            return {"success": False, "message": "Team registration not found or you're not the team leader"}
        
        # Check if student exists
        new_member = await DatabaseOperations.find_one("students", {"enrollment_no": enrollment_no})
        if not new_member:
            return {"success": False, "message": "Student not found"}
        
        # Check if student is already registered for this event
        for reg_data in registrations.values():
            if reg_data.get('student_data', {}).get('enrollment_no') == enrollment_no:
                return {"success": False, "message": "Student is already registered for this event"}
        
        # Check team size limit
        current_team_members = team_registration.get('student_data', {}).get('team_members', [])
        team_size_max = event.get('team_size_max', 5)
        current_size = 1 + len(current_team_members)  # Leader + members
        
        if current_size >= team_size_max:
            return {"success": False, "message": f"Team is already at maximum size ({team_size_max})"}
        
        # Add the new member to the team
        new_member_data = {
            "enrollment_no": enrollment_no,
            "name": new_member.get('full_name'),
            "email": new_member.get('email'),
            "mobile_no": new_member.get('mobile_no')
        }
        
        current_team_members.append(new_member_data)
        
        # Update the team registration
        update_data = {
            f"registrations.{team_reg_id}.student_data.team_members": current_team_members
        }
        
        await DatabaseOperations.update_one(
            "events", 
            {"event_id": event_id}, 
            {"$set": update_data}
        )
        
        logger.info(f"Added team member {enrollment_no} to team {team_id} for event {event_id}")
        
        return {
            "success": True,
            "message": "Team member added successfully",
            "member_data": new_member_data
        }
        
    except Exception as e:
        logger.error(f"Error adding team member: {str(e)}")
        return {"success": False, "message": f"Error adding team member: {str(e)}"}


@router.post("/remove-team-member")
async def remove_team_member(
    request: Request,
    student: Student = Depends(require_student_login)
):
    """Remove a member from an existing team registration"""
    try:
        request_data = await request.json()
        event_id = request_data.get('event_id')
        team_id = request_data.get('team_id')
        enrollment_no = request_data.get('enrollment_no')
        
        if not all([event_id, enrollment_no]):
            return {"success": False, "message": "Event ID and enrollment number are required"}
        
        # Get event data
        event = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event:
            return {"success": False, "message": "Event not found"}
        
        # Find the team leader's registration
        registrations = event.get('registrations', {})
        team_registration = None
        team_reg_id = None
        
        for reg_id, reg_data in registrations.items():
            student_data = reg_data.get('student_data', {})
            if (student_data.get('enrollment_no') == student.enrollment_no and 
                reg_data.get('registration_type') == 'team'):
                team_registration = reg_data
                team_reg_id = reg_id
                break
        
        if not team_registration:
            return {"success": False, "message": "Team registration not found or you're not the team leader"}
        
        # Find and remove the team member
        current_team_members = team_registration.get('student_data', {}).get('team_members', [])
        member_found = False
        updated_members = []
        
        for member in current_team_members:
            if member.get('enrollment_no') != enrollment_no:
                updated_members.append(member)
            else:
                member_found = True
        
        if not member_found:
            return {"success": False, "message": "Team member not found"}
        
        # Update the team registration
        update_data = {
            f"registrations.{team_reg_id}.student_data.team_members": updated_members
        }
        
        await DatabaseOperations.update_one(
            "events", 
            {"event_id": event_id}, 
            {"$set": update_data}
        )
        
        logger.info(f"Removed team member {enrollment_no} from team {team_id} for event {event_id}")
        
        return {
            "success": True,
            "message": "Team member removed successfully"
        }
        
    except Exception as e:
        logger.error(f"Error removing team member: {str(e)}")
        return {"success": False, "message": f"Error removing team member: {str(e)}"}
