"""
Unified Authentication Status API
Consolidates status checks for all user types (admin, student, faculty)
"""
from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse
from typing import Optional, Union
import logging

from models.admin_user import AdminUser
from models.student import Student  
from models.faculty import Faculty
from dependencies.auth import (
    get_optional_admin, get_optional_student, get_optional_faculty,
    require_admin, require_student_login, require_faculty_login
)

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/status")
async def get_unified_auth_status(
    request: Request,
    user_type: Optional[str] = None,
    admin: Optional[AdminUser] = Depends(get_optional_admin),
    student: Optional[Student] = Depends(get_optional_student),
    faculty: Optional[Faculty] = Depends(get_optional_faculty)
):
    """
    Unified authentication status endpoint
    Returns authentication status for current user or specific user type
    
    Query params:
    - user_type: Optional filter for specific user type (admin/student/faculty)
    """
    try:
        # If specific user type requested, return only that
        if user_type:
            if user_type == "admin" and admin:
                return JSONResponse(content={
                    "authenticated": True,
                    "user_type": "admin",
                    "user": {
                        "username": admin.username,
                        "fullname": admin.fullname,
                        "role": admin.role.value,
                        "user_type": "admin"
                    },
                    "redirect_url": "/admin/dashboard"
                })
            elif user_type == "student" and student:
                return JSONResponse(content={
                    "authenticated": True,
                    "user_type": "student",
                    "user": {
                        "enrollment_no": student.enrollment_no,
                        "full_name": student.full_name,
                        "email": student.email,
                        "mobile_no": student.mobile_no,
                        "department": student.department,
                        "semester": student.semester,
                        "gender": student.gender,
                        "date_of_birth": student.date_of_birth.isoformat() if student.date_of_birth else None,
                        "user_type": "student"
                    },
                    "redirect_url": "/client/dashboard"
                })
            elif user_type == "faculty" and faculty:
                return JSONResponse(content={
                    "authenticated": True,
                    "user_type": "faculty",
                    "user": {
                        "employee_id": faculty.employee_id,
                        "faculty_id": faculty.faculty_id,
                        "full_name": faculty.full_name,
                        "email": faculty.email,
                        "mobile_no": faculty.mobile_no,
                        "department": faculty.department,
                        "designation": faculty.designation,
                        "user_type": "faculty"
                    },
                    "redirect_url": "/faculty/profile"
                })
            else:
                return JSONResponse(content={
                    "authenticated": False,
                    "user_type": user_type,
                    "message": f"No authenticated {user_type} user found"
                })
        
        # Auto-detect authenticated user type
        if admin:
            return JSONResponse(content={
                "authenticated": True,
                "user_type": "admin",
                "user": {
                    "username": admin.username,
                    "fullname": admin.fullname,
                    "role": admin.role.value,
                    "user_type": "admin"
                },
                "redirect_url": "/admin/dashboard"
            })
        elif student:
            return JSONResponse(content={
                "authenticated": True,
                "user_type": "student", 
                "user": {
                    "enrollment_no": student.enrollment_no,
                    "full_name": student.full_name,
                    "email": student.email,
                    "department": student.department,
                    "user_type": "student"
                },
                "redirect_url": "/client/dashboard"
            })
        elif faculty:
            return JSONResponse(content={
                "authenticated": True,
                "user_type": "faculty",
                "user": {
                    "employee_id": faculty.employee_id,
                    "full_name": faculty.full_name,
                    "email": faculty.email,
                    "department": faculty.department,
                    "user_type": "faculty"
                },
                "redirect_url": "/faculty/profile"
            })
        else:
            return JSONResponse(content={
                "authenticated": False,
                "user_type": None,
                "message": "No authenticated user found"
            })
            
    except Exception as e:
        logger.error(f"Error in unified auth status: {str(e)}")
        return JSONResponse(
            content={
                "authenticated": False,
                "error": "Internal server error"
            },
            status_code=500
        )

# Maintain backwards compatibility with existing specific endpoints
@router.get("/admin/status")
async def get_admin_status(admin: AdminUser = Depends(require_admin)):
    """Legacy admin status endpoint (backwards compatibility)"""
    return JSONResponse(content={
        "authenticated": True,
        "user": {
            "username": admin.username,
            "fullname": admin.fullname,
            "role": admin.role.value,
            "user_type": "admin"
        },
        "redirect_url": "/admin/dashboard"
    })

@router.get("/student/status")
async def get_student_status(student: Student = Depends(require_student_login)):
    """Legacy student status endpoint (backwards compatibility)"""
    return JSONResponse(content={
        "authenticated": True,
        "user": {
            "enrollment_no": student.enrollment_no,
            "full_name": student.full_name,
            "email": student.email,
            "mobile_no": student.mobile_no,
            "department": student.department,
            "semester": student.semester,
            "gender": student.gender,
            "date_of_birth": student.date_of_birth.isoformat() if student.date_of_birth else None,
            "user_type": "student"
        },
        "redirect_url": "/client/dashboard"
    })

@router.get("/faculty/status")
async def get_faculty_status(faculty: Faculty = Depends(require_faculty_login)):
    """Legacy faculty status endpoint (backwards compatibility)"""
    return JSONResponse(content={
        "authenticated": True,
        "user": {
            "employee_id": faculty.employee_id,
            "faculty_id": faculty.faculty_id,
            "full_name": faculty.full_name,
            "email": faculty.email,
            "mobile_no": faculty.mobile_no,
            "department": faculty.department,
            "designation": faculty.designation,
            "user_type": "faculty"
        },
        "redirect_url": "/faculty/profile"
    })
