"""
Authentication API Routes
Handles authentication-related API endpoints
"""
from fastapi import APIRouter, Request, HTTPException, status
from fastapi.responses import JSONResponse
from models.admin_user import AdminUser, AdminRole
from models.student import Student
from routes.auth import get_current_admin, authenticate_admin
from dependencies.auth import get_current_student_optional, get_current_student
from utils.db_operations import DatabaseOperations
from datetime import datetime
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/admin/status")
async def admin_auth_status(request: Request):
    """API endpoint to check if admin is authenticated"""
    try:
        admin = await get_current_admin(request)
        return {
            "authenticated": True,
            "user": {
                "username": admin.username,
                "fullname": admin.fullname,
                "role": admin.role.value if admin.role else None,
                "user_type": "admin"
            },
            "redirect_url": "/admin/dashboard"
        }
    except HTTPException:
        return {"authenticated": False, "user_type": "admin"}
    except Exception as e:
        return {"authenticated": False, "error": str(e), "user_type": "admin"}

@router.get("/student/status")
async def student_auth_status(request: Request):
    """API endpoint to check if student is authenticated"""
    try:
        student = await get_current_student(request)
        return {
            "authenticated": True,
            "user": {
                "enrollment_no": student.enrollment_no,
                "full_name": student.full_name,
                "email": student.email,
                "department": student.department,
                "user_type": "student"
            },
            "redirect_url": "/client/dashboard"
        }
    except HTTPException:
        return {"authenticated": False, "user_type": "student"}
    except Exception as e:
        return {"authenticated": False, "error": str(e), "user_type": "student"}

@router.post("/admin/login")
async def admin_login_api(request: Request):
    """API endpoint for admin login"""
    try:
        form_data = await request.form()
        username = form_data.get("username")
        password = form_data.get("password")
        
        if not all([username, password]):
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Username and password are required"}
            )
        
        admin = await authenticate_admin(username, password)
        if not admin:
            return JSONResponse(
                status_code=401,
                content={"success": False, "message": "Invalid username or password"}
            )
        
        # Update last login time
        await DatabaseOperations.update_one(
            "users",
            {"username": username},
            {"$set": {"last_login": datetime.utcnow()}}
        )
        
        # Store admin in session
        admin_data = admin.model_dump()
        current_time = datetime.utcnow()
        
        for key, value in admin_data.items():
            if isinstance(value, datetime):
                admin_data[key] = value.isoformat()
        
        admin_data["login_time"] = current_time.isoformat()
        request.session["admin"] = admin_data
        
        # Determine redirect URL based on role
        redirect_urls = {
            AdminRole.SUPER_ADMIN: "/admin/dashboard",
            AdminRole.EXECUTIVE_ADMIN: "/admin/events/create",
            AdminRole.EVENT_ADMIN: "/admin/events",
            AdminRole.CONTENT_ADMIN: "/admin/events"
        }
        
        return {
            "success": True,
            "message": "Login successful",
            "redirect_url": redirect_urls.get(admin.role, "/admin/dashboard"),
            "user": {
                "username": admin.username,
                "fullname": admin.fullname,
                "role": admin.role.value if admin.role else None
            }
        }
        
    except Exception as e:
        logger.error(f"Error in admin login API: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "Internal server error"}
        )
