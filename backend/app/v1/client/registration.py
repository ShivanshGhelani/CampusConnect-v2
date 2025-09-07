"""
Client Registration API Routes
Handles event registration for students and faculty via client interface
"""
import logging
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, Any
from pydantic import BaseModel
from dependencies.auth import get_current_student, get_current_faculty, get_current_user
from services.event_registration_service import event_registration_service
from services.faculty_registration_service import faculty_registration_service

logger = logging.getLogger(__name__)
router = APIRouter()

class RegistrationRequest(BaseModel):
    event_id: str
    registration_type: str = "individual"  # "individual" or "team"
    student_data: Dict[str, Any] = {}
    faculty_data: Dict[str, Any] = {}  # Added faculty_data support
    team_data: Dict[str, Any] = {}
    action: str = "register"  # "register", "add_participant", "remove_participant", etc.

@router.post("/register")
async def register_for_event(
    request: RegistrationRequest,
    current_user=Depends(get_current_user)
):
    """
    Universal registration endpoint for events
    Handles individual registration and team registration for both students and faculty
    """
    try:
        # Detect user type and get appropriate identifier
        user_type = None
        user_id = None
        
        if hasattr(current_user, 'enrollment_no'):
            user_type = "student"
            user_id = current_user.enrollment_no
            logger.info(f"Student registration request: {request.action} for event {request.event_id} by student {user_id}")
        elif hasattr(current_user, 'employee_id'):
            user_type = "faculty"
            user_id = current_user.employee_id
            logger.info(f"Faculty registration request: {request.action} for event {request.event_id} by faculty {user_id}")
        else:
            raise HTTPException(status_code=400, detail="Invalid user type for registration")
        
        # Handle different registration actions
        if request.action == "register":
            if request.registration_type == "individual":
                if user_type == "student":
                    # Student individual registration
                    result = await event_registration_service.register_individual(
                        enrollment_no=user_id,
                        event_id=request.event_id,
                        additional_data=request.student_data
                    )
                elif user_type == "faculty":
                    # Faculty individual registration
                    result = await faculty_registration_service.register_individual(
                        employee_id=user_id,
                        event_id=request.event_id,
                        additional_data=request.faculty_data
                    )
                    
            elif request.registration_type == "team":
                if user_type == "student":
                    # Student team registration
                    result = await event_registration_service.register_team(
                        team_leader_enrollment=user_id,
                        event_id=request.event_id,
                        team_data=request.team_data
                    )
                elif user_type == "faculty":
                    # Faculty team registration
                    result = await faculty_registration_service.register_team(
                        team_leader_employee_id=user_id,
                        event_id=request.event_id,
                        team_data=request.team_data
                    )
            else:
                raise HTTPException(status_code=400, detail="Invalid registration type")
                
        elif request.action == "add_member":
            # Add team member functionality
            if user_type == "student":
                team_registration_id = request.team_data.get("team_registration_id")
                new_member_enrollment = request.team_data.get("new_member_enrollment")
                
                if not team_registration_id or not new_member_enrollment:
                    raise HTTPException(status_code=400, detail="Missing team_registration_id or new_member_enrollment")
                
                result = await event_registration_service.add_team_member(
                    event_id=request.event_id,
                    team_registration_id=team_registration_id,
                    new_member_enrollment=new_member_enrollment,
                    requester_enrollment=user_id
                )
            else:
                raise HTTPException(status_code=400, detail="Faculty team member management not yet implemented")
                
        elif request.action == "remove_member":
            # Remove team member functionality
            if user_type == "student":
                team_registration_id = request.team_data.get("team_registration_id")
                remove_member_enrollment = request.team_data.get("remove_member_enrollment")
                
                if not team_registration_id or not remove_member_enrollment:
                    raise HTTPException(status_code=400, detail="Missing team_registration_id or remove_member_enrollment")
                
                result = await event_registration_service.remove_team_member(
                    event_id=request.event_id,
                    team_registration_id=team_registration_id,
                    remove_member_enrollment=remove_member_enrollment,
                    requester_enrollment=user_id
                )
            else:
                raise HTTPException(status_code=400, detail="Faculty team member management not yet implemented")
                
        elif request.action == "send_invitation":
            # Send team invitation functionality
            if user_type == "student":
                team_registration_id = request.team_data.get("team_registration_id")
                invitee_enrollment = request.team_data.get("invitee_enrollment")
                
                if not team_registration_id or not invitee_enrollment:
                    raise HTTPException(status_code=400, detail="Missing team_registration_id or invitee_enrollment")
                
                result = await event_registration_service.send_team_invitation(
                    event_id=request.event_id,
                    team_registration_id=team_registration_id,
                    invitee_enrollment=invitee_enrollment,
                    inviter_enrollment=user_id
                )
            else:
                raise HTTPException(status_code=400, detail="Faculty team invitations not yet implemented")
                
        else:
            raise HTTPException(status_code=400, detail=f"Action '{request.action}' not supported")
        
        # Convert service response to API response
        if hasattr(result, 'success'):
            # RegistrationResponse object from register operations
            if result.success:
                return {
                    "success": True,
                    "message": result.message,
                    "registration_id": result.registration_id,
                    "data": result.data
                }
            else:
                raise HTTPException(status_code=400, detail=result.message)
        else:
            # Dict response (for team management add/remove operations)
            if result.get("success"):
                return result
            else:
                raise HTTPException(status_code=400, detail=result.get("message", "Operation failed"))
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@router.get("/status/{event_id}")
async def get_registration_status(
    event_id: str,
    current_user=Depends(get_current_user)
):
    """Get registration status for current user (student or faculty)"""
    try:
        # Check user type and route to appropriate service
        if hasattr(current_user, 'enrollment_no'):
            # Student registration status
            result = await event_registration_service.get_registration_status(
                enrollment_no=current_user.enrollment_no,
                event_id=event_id
            )
        elif hasattr(current_user, 'employee_id'):
            # Faculty registration status
            result = await faculty_registration_service.get_registration_status(
                employee_id=current_user.employee_id,
                event_id=event_id
            )
        else:
            return {"success": False, "message": "Invalid user type for registration status"}
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting registration status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get registration status: {str(e)}")

@router.get("/event/{event_id}/status")
async def get_registration_status_alt(
    event_id: str,
    current_user=Depends(get_current_user)
):
    """LEGACY: Redirect to main status endpoint - Get registration status (alternative URL pattern)"""
    logger.info(f"PHASE 4A: Redirecting /event/{event_id}/status to /status/{event_id}")
    return await get_registration_status(event_id, current_user)

@router.delete("/cancel/{event_id}")
async def cancel_registration(
    event_id: str,
    current_user=Depends(get_current_user)
):
    """Cancel registration for an event (student or faculty)"""
    try:
        # Check user type and route to appropriate service
        if hasattr(current_user, 'enrollment_no'):
            # Student registration cancellation
            logger.info(f"🔍 API: Starting cancel student registration for {current_user.enrollment_no} -> {event_id}")
            result = await event_registration_service.cancel_registration(
                enrollment_no=current_user.enrollment_no,
                event_id=event_id
            )
        elif hasattr(current_user, 'employee_id'):
            # Faculty registration cancellation
            logger.info(f"🔍 API: Starting cancel faculty registration for {current_user.employee_id} -> {event_id}")
            result = await faculty_registration_service.cancel_registration(
                employee_id=current_user.employee_id,
                event_id=event_id
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid user type for registration cancellation")
        
        logger.info(f"🔍 API: Cancel registration completed: {result}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling registration: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to cancel registration: {str(e)}")

# Unified User Lookup Endpoint

@router.get("/lookup")
async def unified_user_lookup(
    user_type: str = Query(..., description="Type of user to lookup: 'faculty' or 'student'"),
    user_id: str = Query(..., description="User identifier: employee_id for faculty, enrollment_no for student"),
    action: str = Query("basic", description="Lookup action: 'basic' for user info, 'eligibility' for event eligibility check"),
    event_id: str = Query(None, description="Event ID (required for eligibility action)"),
    current_user=Depends(get_current_user)
):
    """
    Unified user lookup endpoint - handles faculty lookup, student lookup, and eligibility checking
    
    Parameters:
    - user_type: "faculty" or "student"
    - user_id: employee_id (for faculty) or enrollment_no (for student)
    - action: "basic" (default) or "eligibility"
    - event_id: Required when action is "eligibility"
    """
    try:
        from database.operations import DatabaseOperations
        
        if user_type not in ["faculty", "student"]:
            raise HTTPException(status_code=400, detail="user_type must be 'faculty' or 'student'")
        
        if action == "eligibility" and not event_id:
            raise HTTPException(status_code=400, detail="event_id is required for eligibility action")
        
        # Handle Faculty Lookup
        if user_type == "faculty":
            # Find faculty by employee_id
            faculty = await DatabaseOperations.find_one(
                "faculties",
                {"employee_id": user_id}
            )
            
            if not faculty:
                return {
                    "success": False,
                    "found": False,
                    "message": "Faculty not found"
                }
            
            # Return faculty information
            faculty_info = {
                "employee_id": faculty["employee_id"],
                "full_name": faculty.get("full_name", ""),
                "email": faculty.get("email", ""),
                "contact_no": faculty.get("contact_no", ""),
                "department": faculty.get("department", ""),
                "designation": faculty.get("designation", "")
            }
            
            result = {
                "success": True,
                "found": True,
                "user_type": "faculty",
                "user_data": faculty_info
            }
            
            # Faculty eligibility checking not implemented yet
            if action == "eligibility":
                result["eligible"] = True
                result["message"] = "Faculty eligibility checking not yet implemented - assuming eligible"
            
            return result
        
        # Handle Student Lookup
        elif user_type == "student":
            # Find student by enrollment_no
            student = await DatabaseOperations.find_one(
                "students",
                {"enrollment_no": user_id}
            )
            
            if not student:
                return {
                    "success": False,
                    "found": False,
                    "message": "Student not found in database"
                }
            
            # Return student information
            student_info = {
                "enrollment_no": student["enrollment_no"],
                "full_name": student.get("full_name", ""),
                "email": student.get("email", ""),
                "mobile_no": student.get("mobile_no", ""),
                "department": student.get("department", ""),
                "semester": student.get("semester", "")
            }
            
            result = {
                "success": True,
                "found": True,
                "user_type": "student",
                "user_data": student_info
            }
            
            # Handle eligibility checking for students
            if action == "eligibility":
                # Find event
                event = await DatabaseOperations.find_one(
                    "events",
                    {"event_id": event_id}
                )
                
                if not event:
                    result.update({
                        "eligible": False,
                        "message": "Event not found"
                    })
                    return result
                
                # Check eligibility criteria
                eligibility_issues = []
                
                # Check department eligibility
                if "student_department" in event and event["student_department"]:
                    allowed_departments = event["student_department"]
                    if isinstance(allowed_departments, str):
                        allowed_departments = [allowed_departments]
                    
                    student_dept = student.get("department", "")
                    if student_dept not in allowed_departments:
                        eligibility_issues.append(f"Department '{student_dept}' not eligible. Allowed: {', '.join(allowed_departments)}")
                
                # Check semester eligibility
                if "student_semester" in event and event["student_semester"]:
                    allowed_semesters = event["student_semester"]
                    if isinstance(allowed_semesters, (int, str)):
                        allowed_semesters = [int(allowed_semesters)]
                    elif isinstance(allowed_semesters, list):
                        allowed_semesters = [int(s) for s in allowed_semesters]
                    
                    student_sem = int(student.get("semester", 0))
                    if student_sem not in allowed_semesters:
                        eligibility_issues.append(f"Semester {student_sem} not eligible. Allowed: {', '.join(map(str, allowed_semesters))}")
                
                # Check if student is already registered for this event
                existing_registration = await DatabaseOperations.find_one(
                    "student_registrations",
                    {
                        "$or": [
                            # Check for individual registration
                            {
                                "student.enrollment_no": user_id,
                                "event.event_id": event_id,
                                "registration.type": "individual"
                            },
                            # Check if student is team leader in team registration
                            {
                                "team.team_leader": user_id,
                                "event.event_id": event_id,
                                "registration_type": "team"
                            },
                            # Check if student is team member in team registration
                            {
                                "team_members.student.enrollment_no": user_id,
                                "event.event_id": event_id,
                                "registration_type": "team"
                            }
                        ]
                    }
                )
                
                if existing_registration:
                    # Check if multiple team registrations are allowed
                    allow_multiple = event.get("allow_multiple_team_registrations", False)
                    
                    # Student is already registered - determine registration type
                    reg_type = "individual"
                    if existing_registration.get("registration_type") == "team":
                        if existing_registration.get("team", {}).get("team_leader") == user_id:
                            reg_type = "team leader"
                        else:
                            reg_type = "team member"
                    
                    # Handle different scenarios based on multiple team registration setting
                    if reg_type == "individual":
                        # Individual registration always blocks further registration
                        eligibility_issues.append(f"Student already registered for this event as {reg_type}")
                    elif reg_type == "team leader":
                        # Team leaders cannot join multiple teams
                        eligibility_issues.append(f"Team leader cannot join multiple teams")
                    elif reg_type == "team member" and not allow_multiple:
                        # Team member and multiple teams not allowed
                        eligibility_issues.append(f"Student already registered for this event as {reg_type}")
                    elif reg_type == "team member" and allow_multiple:
                        # Team member can join another team if multiple teams are allowed
                        pass  # No eligibility issue
                
                # Return eligibility result
                is_eligible = len(eligibility_issues) == 0
                
                result.update({
                    "eligible": is_eligible,
                    "eligibility_issues": eligibility_issues,
                    "already_registered": existing_registration is not None,
                    "registration_type": existing_registration.get("registration_type") if existing_registration else None,
                    "message": "Eligible for event" if is_eligible else f"Not eligible: {'; '.join(eligibility_issues)}"
                })
            
            return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in unified user lookup: {str(e)}")
        raise HTTPException(status_code=500, detail=f"User lookup failed: {str(e)}")

# Team invitation endpoints

@router.get("/invitations")
async def get_my_invitations(
    status: str = Query("pending", description="Filter by invitation status"),
    current_user=Depends(get_current_user)
):
    """Get team invitations for current student"""
    try:
        if not hasattr(current_user, 'enrollment_no'):
            raise HTTPException(status_code=400, detail="Only students can receive team invitations")
        
        result = await event_registration_service.get_student_invitations(
            student_enrollment=current_user.enrollment_no,
            status=status
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting invitations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get invitations: {str(e)}")

@router.post("/invitations/{invitation_id}/respond")
async def respond_to_invitation(
    invitation_id: str,
    response_data: dict,
    current_user=Depends(get_current_user)
):
    """Respond to a team invitation (accept or decline)"""
    try:
        if not hasattr(current_user, 'enrollment_no'):
            raise HTTPException(status_code=400, detail="Only students can respond to team invitations")
        
        response = response_data.get("response")  # "accept" or "decline"
        
        if response not in ["accept", "decline"]:
            raise HTTPException(status_code=400, detail="Response must be 'accept' or 'decline'")
        
        result = await event_registration_service.respond_to_team_invitation(
            invitation_id=invitation_id,
            response=response,
            student_enrollment=current_user.enrollment_no
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error responding to invitation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to respond to invitation: {str(e)}")

@router.get("/team/{team_registration_id}/details")
async def get_team_details(
    team_registration_id: str,
    current_user=Depends(get_current_user)
):
    """Get team details by team registration ID"""
    try:
        # Check user type and route to appropriate service
        if hasattr(current_user, 'enrollment_no'):
            result = await event_registration_service.get_team_details_by_registration_id(
                team_registration_id
            )
        elif hasattr(current_user, 'employee_id'):
            # Faculty can also view team details
            result = await event_registration_service.get_team_details_by_registration_id(
                team_registration_id
            )
        else:
            raise HTTPException(status_code=401, detail="User type not supported")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting team details: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get team details: {str(e)}")
