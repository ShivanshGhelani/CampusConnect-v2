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
from utils.timezone_helper import get_current_ist, ist_to_utc

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
        # Get current IST time and convert to UTC for storage
        current_ist = get_current_ist()
        registration_datetime = ist_to_utc(current_ist).isoformat()
        
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

@router.post("/check-enhanced-conflicts")
async def check_enhanced_registration_conflicts(request: Request):
    """Enhanced API endpoint to check for registration conflicts with approval system"""
    try:
        data = await request.json()
        event_id = data.get("event_id")
        enrollment_numbers = data.get("enrollment_numbers", [])
        
        if not event_id or not enrollment_numbers:
            return {"success": False, "message": "Event ID and enrollment numbers are required"}
        
        # Get event details to check if multiple team registrations are allowed
        event = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event:
            return {"success": False, "message": "Event not found"}
        
        # Check event settings for multiple team registrations
        allow_multiple_teams = event.get('allow_multiple_team_registrations', False)
        
        conflicts = []
        pending_approvals = []
        
        # Check each enrollment number for existing registration
        for enrollment_no in enrollment_numbers:
            student_data = await DatabaseOperations.find_one("students", {"enrollment_no": enrollment_no})
            if student_data:
                event_participations = student_data.get('event_participations', {})
                
                if event_id in event_participations:
                    participation = event_participations[event_id]
                    
                    # Get current team information
                    current_team_name = participation.get('student_data', {}).get('team_name', 'Unknown Team')
                    current_registration_type = participation.get('registration_type', 'individual')
                    current_team_leader = participation.get('team_leader_enrollment', 'N/A')
                    
                    if allow_multiple_teams:
                        # Multiple teams allowed - create approval request
                        pending_approvals.append({
                            "enrollment_no": enrollment_no,
                            "full_name": student_data.get('full_name', ''),
                            "current_team_name": current_team_name,
                            "current_team_leader": current_team_leader,
                            "registration_type": current_registration_type,
                            "registration_id": participation.get('registration_id', ''),
                            "requires_approval": True,
                            "message": f"Student is already part of team '{current_team_name}'. Approval required to join another team."
                        })
                    else:
                        # Multiple teams not allowed - hard conflict
                        conflicts.append({
                            "enrollment_no": enrollment_no,
                            "full_name": student_data.get('full_name', ''),
                            "current_team_name": current_team_name,
                            "current_team_leader": current_team_leader,
                            "registration_type": current_registration_type,
                            "registration_id": participation.get('registration_id', ''),
                            "requires_approval": False,
                            "message": f"Student is already registered for this event in team '{current_team_name}'. Multiple team registrations not allowed."
                        })
        
        # Prepare response based on conflicts and approval requirements
        if conflicts and not allow_multiple_teams:
            return {
                "success": False,
                "message": "Some team members are already registered for this event",
                "conflicts": conflicts,
                "allow_multiple_teams": allow_multiple_teams,
                "conflict_resolution": "not_allowed"
            }
        elif pending_approvals and allow_multiple_teams:
            return {
                "success": False,
                "message": "Some team members are already in other teams. Approval requests will be sent.",
                "pending_approvals": pending_approvals,
                "allow_multiple_teams": allow_multiple_teams,
                "conflict_resolution": "approval_required"
            }
        else:
            return {
                "success": True,
                "message": "No registration conflicts found",
                "allow_multiple_teams": allow_multiple_teams
            }
        
    except Exception as e:
        logger.error(f"Error checking enhanced registration conflicts: {str(e)}")
        return {"success": False, "message": f"Error checking conflicts: {str(e)}"}

@router.post("/send-team-approval-request")
async def send_team_approval_request(request: Request, student: Student = Depends(require_student_login)):
    """Send approval requests to students who are already in other teams"""
    try:
        data = await request.json()
        event_id = data.get("event_id")
        team_name = data.get("team_name")
        requested_members = data.get("requested_members", [])  # List of enrollment numbers
        
        if not all([event_id, team_name, requested_members]):
            return {"success": False, "message": "Event ID, team name, and requested members are required"}
        
        # Generate approval requests
        requests_created = []
        
        for member_enrollment in requested_members:
            # Generate unique request ID
            request_id = f"TREQ_{event_id}_{student.enrollment_no}_{member_enrollment}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
            
            # Get member's current team info
            member_data = await DatabaseOperations.find_one("students", {"enrollment_no": member_enrollment})
            current_team_info = {}
            
            if member_data:
                event_participations = member_data.get('event_participations', {})
                if event_id in event_participations:
                    participation = event_participations[event_id]
                    current_team_info = {
                        "team_name": participation.get('student_data', {}).get('team_name', 'Unknown'),
                        "team_leader": participation.get('team_leader_enrollment', 'N/A'),
                        "registration_type": participation.get('registration_type', 'individual')
                    }
            
            # Create approval request
            approval_request = {
                "request_id": request_id,
                "event_id": event_id,
                "team_leader_enrollment": student.enrollment_no,
                "team_name": team_name,
                "requested_member_enrollment": member_enrollment,
                "request_status": "pending",
                "request_datetime": datetime.utcnow().isoformat(),
                "requester_message": data.get("message", f"You are invited to join team '{team_name}'"),
                "current_team_info": current_team_info
            }
            
            # Store the approval request
            await DatabaseOperations.insert_one("team_approval_requests", approval_request)
            
            # Add to member's pending requests
            await DatabaseOperations.update_one(
                "students",
                {"enrollment_no": member_enrollment},
                {"$push": {f"pending_team_requests.{event_id}": request_id}}
            )
            
            requests_created.append({
                "member_enrollment": member_enrollment,
                "request_id": request_id,
                "status": "sent"
            })
        
        return {
            "success": True,
            "message": f"Approval requests sent to {len(requests_created)} members",
            "requests_created": requests_created
        }
        
    except Exception as e:
        logger.error(f"Error sending team approval requests: {str(e)}")
        return {"success": False, "message": f"Error sending approval requests: {str(e)}"}

@router.post("/respond-team-approval")
async def respond_team_approval(request: Request, student: Student = Depends(require_student_login)):
    """Respond to a team approval request (approve/reject)"""
    try:
        data = await request.json()
        request_id = data.get("request_id")
        action = data.get("action")  # "approve" or "reject"
        response_message = data.get("response_message", "")
        
        if not request_id or action not in ["approve", "reject"]:
            return {"success": False, "message": "Valid request ID and action (approve/reject) are required"}
        
        # Get the approval request
        approval_request = await DatabaseOperations.find_one("team_approval_requests", {"request_id": request_id})
        if not approval_request:
            return {"success": False, "message": "Approval request not found"}
        
        # Verify the student is the one being requested
        if approval_request.get("requested_member_enrollment") != student.enrollment_no:
            return {"success": False, "message": "You are not authorized to respond to this request"}
        
        # Check if already responded
        if approval_request.get("request_status") != "pending":
            return {"success": False, "message": "This request has already been responded to"}
        
        # Update approval request status
        response_datetime = datetime.utcnow().isoformat()
        await DatabaseOperations.update_one(
            "team_approval_requests",
            {"request_id": request_id},
            {
                "$set": {
                    "request_status": action + "d",  # "approved" or "rejected"
                    "response_datetime": response_datetime,
                    "response_message": response_message
                }
            }
        )
        
        if action == "approve":
            # If approved, allow the student to be added to the new team
            # This will be handled by the team registration process
            message = "Team invitation approved. You can now be added to the new team."
        else:
            message = "Team invitation rejected."
        
        # Remove from pending requests
        event_id = approval_request.get("event_id")
        await DatabaseOperations.update_one(
            "students",
            {"enrollment_no": student.enrollment_no},
            {"$pull": {f"pending_team_requests.{event_id}": request_id}}
        )
        
        return {
            "success": True,
            "message": message,
            "action": action,
            "request_id": request_id
        }
        
    except Exception as e:
        logger.error(f"Error responding to team approval: {str(e)}")
        return {"success": False, "message": f"Error responding to approval: {str(e)}"}

@router.get("/pending-team-requests")
async def get_pending_team_requests(student: Student = Depends(require_student_login)):
    """Get all pending team approval requests for the current student"""
    try:
        # Get student's pending requests
        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": student.enrollment_no})
        if not student_data:
            return {"success": False, "message": "Student not found"}
        
        pending_requests = student_data.get('pending_team_requests', {})
        all_requests = []
        
        for event_id, request_ids in pending_requests.items():
            for request_id in request_ids:
                # Get detailed request information
                request_details = await DatabaseOperations.find_one("team_approval_requests", {"request_id": request_id})
                if request_details and request_details.get("request_status") == "pending":
                    # Get event details
                    event = await DatabaseOperations.find_one("events", {"event_id": event_id})
                    event_name = event.get("event_name", "Unknown Event") if event else "Unknown Event"
                    
                    # Get team leader details
                    leader = await DatabaseOperations.find_one("students", {"enrollment_no": request_details.get("team_leader_enrollment")})
                    leader_name = leader.get("full_name", "Unknown") if leader else "Unknown"
                    
                    all_requests.append({
                        **request_details,
                        "event_name": event_name,
                        "team_leader_name": leader_name
                    })
        
        return {
            "success": True,
            "pending_requests": all_requests,
            "total_requests": len(all_requests)
        }
        
    except Exception as e:
        logger.error(f"Error getting pending team requests: {str(e)}")
        return {"success": False, "message": f"Error getting pending requests: {str(e)}"}

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
    """Add a new member to an existing team registration with full data consistency"""
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
        team_registration_id = None
        
        for reg_id, reg_data in registrations.items():
            student_data = reg_data.get('student_data', {})
            if (student_data.get('enrollment_no') == student.enrollment_no and 
                reg_data.get('registration_type') == 'team'):
                team_registration = reg_data
                team_reg_id = reg_id
                team_registration_id = reg_data.get('team_registration_id')
                break
        
        if not team_registration:
            return {"success": False, "message": "Team registration not found or you're not the team leader"}
        
        # Check if student exists
        new_member = await DatabaseOperations.find_one("students", {"enrollment_no": enrollment_no})
        if not new_member:
            return {"success": False, "message": "Student not found"}
        
        # Check if student is already registered for this event
        for reg_data in registrations.values():
            if (reg_data and 
                reg_data.get('student_data', {}).get('enrollment_no') == enrollment_no and
                reg_data.get('registration_type') in ['individual', 'team', 'team_member']):
                return {"success": False, "message": "Student is already registered for this event"}
        
        # Check team size limit
        current_team_members = team_registration.get('student_data', {}).get('team_members', [])
        team_size_max = event.get('team_size_max', 5)
        current_size = 1 + len(current_team_members)  # Leader + members
        
        if current_size >= team_size_max:
            return {"success": False, "message": f"Team is already at maximum size ({team_size_max})"}
        
        # Generate new registration ID for the team member
        import uuid
        new_reg_id = f"REG{uuid.uuid4().hex[:6].upper()}"
        
        # Create new member data for team leader's array
        new_member_data = {
            "enrollment_no": enrollment_no,
            "full_name": new_member.get('full_name'),  # Fixed: use 'full_name' not 'name'
            "email": new_member.get('email'),
            "phone": new_member.get('mobile_no'),  # Fixed: use 'phone' to match expected field
            "course": new_member.get('course', new_member.get('department', '')),  # Added course
            "semester": new_member.get('semester', '')  # Added semester
        }
        
        # Create full registration record for the new team member
        new_member_registration = {
            'registration_id': new_reg_id,
            'registration_type': 'team_member',
            'registration_datetime': datetime.utcnow().isoformat() + '+00:00',
            'team_registration_id': team_registration_id,
            'team_id': team_registration_id,  # Added: Include team_id for consistency
            'team_leader_enrollment': student.enrollment_no,
            'student_data': {
                'full_name': new_member.get('full_name'),
                'enrollment_no': new_member.get('enrollment_no'),
                'email': new_member.get('email'),
                'mobile_no': new_member.get('mobile_no'),
                'department': new_member.get('department'),
                'semester': new_member.get('semester'),
                'team_name': team_registration['student_data'].get('team_name'),
                'is_team_leader': False
            }
        }
        
        # Create participation record for the new member
        participation_record = {
            'event_id': event_id,
            'enrollment_no': new_member.get('enrollment_no'),
            'full_name': new_member.get('full_name'),
            'registration_id': new_reg_id,
            'registration_type': 'team_member',
            'participation_type': 'team_member',  # Added: for consistency
            'team_registration_id': team_registration_id,
            'team_id': team_registration_id,  # Added: Include team_id
            'team_name': team_registration['student_data'].get('team_name'),
            'registration_datetime': new_member_registration['registration_datetime'],
            'status': 'registered',  # Added: status field
            'attendance': {
                'marked': False,
                'attendance_id': None,
                'attendance_date': None
            },
            'feedback': {
                'submitted': False,
                'feedback_id': None
            },
            'certificate': {
                'earned': False,
                'certificate_id': None
            }
        }
        
        # Update team leader's members array
        current_team_members.append(new_member_data)
        
        # Perform all database updates
        # 1. Add new member registration to event and update team leader's array
        await DatabaseOperations.update_one(
            "events", 
            {"event_id": event_id}, 
            {
                "$set": {
                    f"registrations.{team_reg_id}.student_data.team_members": current_team_members,
                    f"registrations.{new_reg_id}": new_member_registration
                }
            }
        )
        
        # 2. Add/update participation record
        existing_participation = await DatabaseOperations.find_one(
            "student_participation", 
            {"event_id": event_id, "enrollment_no": enrollment_no}
        )
        
        if existing_participation:
            await DatabaseOperations.update_one(
                "student_participation",
                {"event_id": event_id, "enrollment_no": enrollment_no},
                {"$set": participation_record}
            )
        else:
            await DatabaseOperations.insert_one("student_participation", participation_record)
        
        # 3. CRITICAL: Add event participation to the student's individual record
        # This is what makes the event show up in the student's profile page
        student_participation_data = {
            'registration_id': new_reg_id,
            'registration_type': 'team_member',
            'registration_datetime': new_member_registration['registration_datetime'],
            'team_registration_id': team_registration_id,
            'team_name': team_registration['student_data'].get('team_name'),
            'team_leader_enrollment': student.enrollment_no,
            'status': 'registered'
        }
        
        await DatabaseOperations.update_one(
            "students",
            {"enrollment_no": enrollment_no},
            {"$set": {f"event_participations.{event_id}": student_participation_data}}
        )
        
        logger.info(f"Added team member {enrollment_no} to team {team_registration_id} for event {event_id} with registration {new_reg_id}")
        
        return {
            "success": True,
            "message": "Team member added successfully",
            "member_data": new_member_data,
            "registration_id": new_reg_id
        }
        
    except Exception as e:
        logger.error(f"Error adding team member: {str(e)}")
        return {"success": False, "message": f"Error adding team member: {str(e)}"}


@router.post("/remove-team-member")
async def remove_team_member(
    request: Request,
    student: Student = Depends(require_student_login)
):
    """Remove a member from an existing team registration with full data consistency"""
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
        
        # Find the member's registration ID
        member_reg_id = None
        for reg_id, reg_data in registrations.items():
            if (reg_data.get('student_data', {}).get('enrollment_no') == enrollment_no and 
                reg_data.get('registration_type') == 'team_member'):
                member_reg_id = reg_id
                break
        
        # Find and remove the team member from leader's array
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
        
        # Prepare database updates
        update_operations = {
            "$set": {
                f"registrations.{team_reg_id}.student_data.team_members": updated_members
            }
        }
        
        # Remove member registration if it exists
        if member_reg_id:
            update_operations["$unset"] = {
                f"registrations.{member_reg_id}": ""
            }
        
        # Update the team registration and remove member registration
        # First, update the team leader's members array
        await DatabaseOperations.update_one(
            "events", 
            {"event_id": event_id}, 
            {
                "$set": {
                    f"registrations.{team_reg_id}.student_data.team_members": updated_members
                }
            }
        )
        
        # Then, remove the member's registration record if it exists
        if member_reg_id:
            await DatabaseOperations.update_one(
                "events", 
                {"event_id": event_id}, 
                {
                    "$unset": {
                        f"registrations.{member_reg_id}": ""
                    }
                }
            )
            
            # Additional cleanup: rebuild registrations without null/empty values
            updated_event = await DatabaseOperations.find_one("events", {"event_id": event_id})
            clean_registrations = {}
            
            for reg_id, reg_data in updated_event.get('registrations', {}).items():
                if reg_data and reg_data.get('student_data', {}).get('enrollment_no'):
                    clean_registrations[reg_id] = reg_data
            
            await DatabaseOperations.update_one(
                "events", 
                {"event_id": event_id}, 
                {
                    "$set": {
                        "registrations": clean_registrations
                    }
                }
            )
        
        # Remove participation record
        await DatabaseOperations.delete_one(
            "student_participation",
            {"event_id": event_id, "enrollment_no": enrollment_no}
        )
        
        # CRITICAL: Remove event participation from the student's individual record
        # This ensures the event no longer shows in the student's profile page
        await DatabaseOperations.update_one(
            "students",
            {"enrollment_no": enrollment_no},
            {"$unset": {f"event_participations.{event_id}": ""}}
        )
        
        logger.info(f"Removed team member {enrollment_no} from team {team_id} for event {event_id}")
        
        return {
            "success": True,
            "message": "Team member removed successfully"
        }
        
    except Exception as e:
        logger.error(f"Error removing team member: {str(e)}")
        return {"success": False, "message": f"Error removing team member: {str(e)}"}
