from fastapi import APIRouter, Request, HTTPException, status
from fastapi.templating import Jinja2Templates
from fastapi.responses import RedirectResponse
from models.admin_user import AdminUser, AdminRole
from datetime import datetime
from utils.db_operations import DatabaseOperations
from passlib.context import CryptContext
from typing import Union
import logging

router = APIRouter(prefix="/auth")  # Add prefix here
templates = Jinja2Templates(directory="templates")
logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

async def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

async def authenticate_admin(username: str, password: str) -> Union[AdminUser, None]:
    """Authenticate admin using username and password"""
    # Check if admin exists in the users collection
    admin = await DatabaseOperations.find_one(
        "users", 
        {
            "username": username,
            "is_admin": True,
            "is_active": True
        }
    )
    
    if admin and await verify_password(password, admin.get("password", "")):
        return AdminUser(**admin)
    
    return None

async def get_current_admin(request: Request) -> AdminUser:
    """Get currently logged in admin from session"""
    admin_data = request.session.get("admin")
    if not admin_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin not logged in"
        )
    
    # Check if session has expired (1 hour)
    login_time_str = admin_data.get("login_time")
    if not login_time_str:
        # Old session without login_time, expire it
        request.session.clear()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired"
        )
    
    try:
        login_time = datetime.fromisoformat(login_time_str)
        current_time = datetime.utcnow()
        
        # Check if session is older than 1 hour
        if (current_time - login_time).total_seconds() > 3600:  # 3600 seconds = 1 hour
            request.session.clear()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired"
            )
    except (ValueError, TypeError):
        # Invalid login_time format, expire session
        request.session.clear()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session"
        )
    
    try:
        return AdminUser(**admin_data)
    except Exception as validation_error:
        # If admin data is invalid (e.g., old role format), clear session
        logger.warning(f"Invalid admin session data, clearing session: {str(validation_error)}")
        request.session.clear()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session data"
        )

async def refresh_admin_session(request: Request) -> AdminUser:
    """Refresh admin session data from database to get latest assigned events"""
    admin_data = request.session.get("admin")
    if not admin_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin not logged in"
        )
    
    # Get fresh admin data from database
    fresh_admin = await DatabaseOperations.find_one(
        "users", 
        {
            "username": admin_data.get("username"),
            "is_admin": True,
            "is_active": True
        }
    )
    
    if not fresh_admin:
        # Admin no longer exists or is inactive, clear session
        request.session.clear()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin account no longer active"
        )
      # Update session with fresh data but keep login_time
    # Convert ObjectId to string for JSON serialization
    session_data = dict(fresh_admin)
    if "_id" in session_data:
        session_data["_id"] = str(session_data["_id"])
    session_data["login_time"] = admin_data.get("login_time")
    request.session["admin"] = session_data
    
    return AdminUser(**fresh_admin)

@router.get("/login")  # Now this will be /auth/login
async def admin_login_page(request: Request):
    """Show admin login page - redirect to unified login with admin tab selected"""
    # Check if admin is already logged in with valid session
    try:
        admin = await get_current_admin(request)
        # If we get here, admin is already logged in with valid session
        # Redirect based on role
        if admin.role == AdminRole.SUPER_ADMIN:
            return RedirectResponse(url="/admin/dashboard", status_code=302)
        elif admin.role == AdminRole.EXECUTIVE_ADMIN:
            return RedirectResponse(url="/admin/events/create", status_code=302)
        elif admin.role == AdminRole.EVENT_ADMIN:
            return RedirectResponse(url="/admin/events", status_code=302)
        elif admin.role == AdminRole.CONTENT_ADMIN:
            return RedirectResponse(url="/admin/events", status_code=302)
        else:
            return RedirectResponse(url="/admin/dashboard", status_code=302)
    except HTTPException:        # Not logged in or session expired, redirect to unified login with admin tab
        return RedirectResponse(url="/client/login?tab=admin", status_code=302)

@router.post("/login")  # Now this will be /auth/login
async def admin_login(request: Request):
    """Handle admin login"""
    form_data = await request.form()
    username = form_data.get("username")
    password = form_data.get("password")    # Validate required fields
    if not all([username, password]):
        return RedirectResponse(url="/client/login?tab=admin&error=Both username and password are required", status_code=302)
    
    # Authenticate admin
    admin = await authenticate_admin(username, password)
    if not admin:
        return RedirectResponse(url="/client/login?tab=admin&error=Invalid username or password", status_code=302)
      # Update last login time
    await DatabaseOperations.update_one(
        "users",
        {"username": username},
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    # Store admin in session with serialized datetime values and login time
    admin_data = admin.model_dump()
    current_time = datetime.utcnow()
    
    for key, value in admin_data.items():
        if isinstance(value, datetime):
            admin_data[key] = value.isoformat()
      # Add login time for session expiration tracking        
    admin_data["login_time"] = current_time.isoformat()
    
    request.session["admin"] = admin_data
    
    # Role-based redirect after login
    if admin.role == AdminRole.SUPER_ADMIN:
        # Super Admin goes to dashboard
        return RedirectResponse(url="/admin/dashboard", status_code=303)
    elif admin.role == AdminRole.EXECUTIVE_ADMIN:
        # Executive Admin goes directly to create event page
        return RedirectResponse(url="/admin/events/create", status_code=303)
    elif admin.role == AdminRole.EVENT_ADMIN:
        # Event Admin goes to events page (filtered view)
        return RedirectResponse(url="/admin/events", status_code=303)
    elif admin.role == AdminRole.CONTENT_ADMIN:
        # Content Admin goes to events page (read-only view)
        return RedirectResponse(url="/admin/events", status_code=303)
    else:
        # Default fallback to dashboard
        return RedirectResponse(url="/admin/dashboard", status_code=303)

@router.get("/logout")
async def admin_logout(request: Request):
    """Handle admin logout"""
    # Clear all session data
    request.session.clear()    # Create a response that redirects to unified login page with admin tab
    response = RedirectResponse(url="/client/login?tab=admin", status_code=302)
    
    # Add comprehensive cache control headers to prevent caching
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0, private"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    response.headers["Last-Modified"] = "0"
    response.headers["ETag"] = ""
    
    return response

@router.get("/api/status")
async def admin_auth_status(request: Request):
    """API endpoint to check if admin is authenticated"""
    try:
        # Check if admin session exists and is valid
        admin = await get_current_admin(request)
        return {
            "authenticated": True,
            "admin": {
                "username": admin.username,
                "fullname": admin.fullname,
                "role": admin.role.value if admin.role else None
            },
            "redirect_url": "/admin/dashboard"
        }
    except HTTPException:
        return {"authenticated": False}
    except Exception as e:
        return {"authenticated": False, "error": str(e)}
