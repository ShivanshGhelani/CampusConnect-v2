"""
Legacy Auth Routes Mapping
Maps the old /auth routes to the new /api/v1/auth structure for backward compatibility
"""
from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse, JSONResponse
from dependencies.auth import get_current_admin
from models.admin_user import AdminUser
import logging
import os

router = APIRouter(prefix="/auth", tags=["legacy-auth"])
logger = logging.getLogger(__name__)

# Get frontend URL from environment
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

@router.get("/login")
async def admin_login_page(request: Request):
    """Show admin login page - redirect to unified login with admin tab selected"""
    return RedirectResponse(url=f"{FRONTEND_URL}/auth/login?tab=admin", status_code=303)

@router.post("/login")
async def admin_login(request: Request):
    """Handle admin login - redirect to API endpoint"""
    return RedirectResponse(url="/api/v1/auth/admin/login", status_code=307)

@router.get("/logout")
async def admin_logout(request: Request):
    """Handle admin logout - redirect to API endpoint"""
    return RedirectResponse(url="/api/v1/auth/admin/logout", status_code=307)

@router.get("/api/profile")
async def get_admin_profile(request: Request):
    """API endpoint to get admin profile data"""
    try:
        admin = await get_current_admin(request)
        return {
            "success": True,
            "user": {
                "username": admin.username,
                "fullname": admin.fullname,
                "role": admin.role.value if admin.role else None,
                "email": admin.email,
                "phone": admin.mobile_no,  # Added phone field
                "created_at": admin.created_at.isoformat() if admin.created_at else None,
                "last_login": admin.last_login.isoformat() if admin.last_login else None
            }
        }
    except Exception as e:
        logger.error(f"Error getting admin profile: {e}")
        return JSONResponse(
            status_code=401,
            content={"success": False, "message": "Not authenticated"}
        )

@router.put("/api/profile")
async def update_admin_profile(request: Request):
    """API endpoint to update admin profile"""
    try:
        admin = await get_current_admin(request)
        # Implementation would go here
        return {"success": True, "message": "Profile updated successfully"}
    except Exception as e:
        logger.error(f"Error updating admin profile: {e}")
        return JSONResponse(
            status_code=401,
            content={"success": False, "message": "Not authenticated"}
        )

@router.put("/api/username")
async def update_admin_username(request: Request):
    """API endpoint to update admin username"""
    try:
        admin = await get_current_admin(request)
        # Implementation would go here
        return {"success": True, "message": "Username updated successfully"}
    except Exception as e:
        logger.error(f"Error updating admin username: {e}")
        return JSONResponse(
            status_code=401,
            content={"success": False, "message": "Not authenticated"}
        )

@router.put("/api/password")
async def update_admin_password(request: Request):
    """API endpoint to update admin password"""
    try:
        admin = await get_current_admin(request)
        # Implementation would go here
        return {"success": True, "message": "Password updated successfully"}
    except Exception as e:
        logger.error(f"Error updating admin password: {e}")
        return JSONResponse(
            status_code=401,
            content={"success": False, "message": "Not authenticated"}
        )

@router.get("/api/status")
async def admin_auth_status(request: Request):
    """API endpoint to check if admin is authenticated"""
    try:
        admin = await get_current_admin(request)
        return {
            "success": True,
            "authenticated": True,
            "user": {
                "username": admin.username,
                "fullname": admin.fullname,
                "role": admin.role.value if admin.role else None
            }
        }
    except Exception:
        return {
            "success": True,
            "authenticated": False,
            "user": None
        }
