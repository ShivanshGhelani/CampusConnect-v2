"""
Client Registration API Routes
Handles event registration for students and faculty via client interface
"""
import logging
from fastapi import APIRouter, HTTPException, Depends
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
                
        else:
            # For now, only basic registration is supported
            # Team management features can be added later
            raise HTTPException(status_code=400, detail=f"Action '{request.action}' not yet implemented")
        
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
    """Get registration status for current user (alternative URL pattern)"""
    # This is just a duplicate of the above to match frontend expectations
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

@router.get("/my-registrations")
async def get_my_registrations(
    current_user=Depends(get_current_user)
):
    """Get all registrations for current user (student or faculty)"""
    try:
        # Check user type and route to appropriate service
        if hasattr(current_user, 'enrollment_no'):
            # Student registrations
            # Note: This would need implementation in EventRegistrationService
            # For now, return placeholder
            return {"success": True, "registrations": [], "message": "Student registrations feature needs implementation"}
        elif hasattr(current_user, 'employee_id'):
            # Faculty registrations
            # Note: This would need implementation in FacultyRegistrationService
            # For now, return placeholder
            return {"success": True, "registrations": [], "message": "Faculty registrations feature needs implementation"}
        else:
            return {"success": True, "registrations": [], "message": "No registrations available for this user type"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user registrations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get registrations: {str(e)}")

# Faculty-specific endpoints

@router.get("/lookup/faculty/{employee_id}")
async def lookup_faculty(
    employee_id: str,
    current_user=Depends(get_current_user)
):
    """Lookup faculty by employee ID for registration purposes"""
    try:
        from database.operations import DatabaseOperations
        
        # Find faculty by employee_id
        faculty = await DatabaseOperations.find_one(
            "faculties",
            {"employee_id": employee_id}
        )
        
        if not faculty:
            return {
                "success": False,
                "found": False,
                "message": "Faculty not found"
            }
        
        # Return only public faculty information for registration
        faculty_info = {
            "employee_id": faculty["employee_id"],
            "full_name": faculty.get("full_name", ""),
            "email": faculty.get("email", ""),
            "contact_no": faculty.get("contact_no", ""),
            "department": faculty.get("department", ""),
            "designation": faculty.get("designation", "")
        }
        
        return {
            "success": True,
            "found": True,
            "faculty_data": faculty_info
        }
        
    except Exception as e:
        logger.error(f"Error looking up faculty: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Faculty lookup failed: {str(e)}")

@router.get("/lookup/student/{enrollment_no}")
async def lookup_student(
    enrollment_no: str,
    current_user=Depends(get_current_user)
):
    """Lookup student by enrollment number for registration purposes"""
    try:
        from database.operations import DatabaseOperations
        
        # Find student by enrollment_no
        student = await DatabaseOperations.find_one(
            "students",
            {"enrollment_no": enrollment_no}
        )
        
        if not student:
            return {
                "success": False,
                "found": False,
                "message": "Student not found in database"
            }
        
        # Return only public student information for registration
        student_info = {
            "enrollment_no": student["enrollment_no"],
            "full_name": student.get("full_name", ""),
            "email": student.get("email", ""),
            "mobile_no": student.get("mobile_no", ""),
            "department": student.get("department", ""),
            "semester": student.get("semester", "")
        }
        
        return {
            "success": True,
            "found": True,
            "student_data": student_info
        }
        
    except Exception as e:
        logger.error(f"Error looking up student: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Student lookup failed: {str(e)}")

@router.get("/lookup/student/{enrollment_no}/eligibility/{event_id}")
async def check_student_eligibility(
    enrollment_no: str,
    event_id: str,
    current_user=Depends(get_current_user)
):
    """Check if student is eligible for specific event based on event criteria"""
    try:
        from database.operations import DatabaseOperations
        
        # Find student
        student = await DatabaseOperations.find_one(
            "students",
            {"enrollment_no": enrollment_no}
        )
        
        if not student:
            return {
                "success": False,
                "found": False,
                "eligible": False,
                "message": "Student not found in database"
            }
        
        # Find event
        event = await DatabaseOperations.find_one(
            "events",
            {"event_id": event_id}
        )
        
        if not event:
            return {
                "success": False,
                "found": True,
                "eligible": False,
                "message": "Event not found"
            }
        
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
        
        # Return eligibility result
        is_eligible = len(eligibility_issues) == 0
        
        student_info = {
            "enrollment_no": student["enrollment_no"],
            "full_name": student.get("full_name", ""),
            "email": student.get("email", ""),
            "mobile_no": student.get("mobile_no", ""),
            "department": student.get("department", ""),
            "semester": student.get("semester", "")
        }
        
        return {
            "success": True,
            "found": True,
            "eligible": is_eligible,
            "student_data": student_info,
            "eligibility_issues": eligibility_issues,
            "message": "Eligible for event" if is_eligible else f"Not eligible: {'; '.join(eligibility_issues)}"
        }
        
    except Exception as e:
        logger.error(f"Error checking student eligibility: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Eligibility check failed: {str(e)}")
