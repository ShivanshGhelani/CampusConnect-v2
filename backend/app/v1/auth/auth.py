"""
Unified Authentication API Endpoints
Consolidates separate admin/student/faculty login/logout endpoints into unified endpoints with user type filtering
Phase 3B+ - Authentication API Consolidation (6→2 endpoints, -4 reduction) + Legacy Cleanup
"""

from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, Union, Literal
from models.admin_user import AdminUser, AdminRole
from models.student import Student
from models.faculty import Faculty
from dependencies.auth import get_current_admin, get_current_student_optional
from database.operations import DatabaseOperations
from utils.token_manager import token_manager
from middleware.auth_middleware import AuthMiddleware
from datetime import datetime
import pytz
import logging
from passlib.context import CryptContext

router = APIRouter()
logger = logging.getLogger(__name__)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Pydantic Models
class UnifiedLoginRequest(BaseModel):
    """Unified login request for all user types"""
    user_type: Literal["admin", "student", "faculty"] = Field(..., description="Type of user logging in")
    username: Optional[str] = Field(None, description="Admin username")
    enrollment_no: Optional[str] = Field(None, description="Student enrollment number") 
    employee_id: Optional[str] = Field(None, description="Faculty employee ID")
    password: str = Field(..., description="User password")
    remember_me: bool = Field(default=False, description="Remember login session")

class UnifiedLogoutRequest(BaseModel):
    """Unified logout request (auto-detects user type)"""
    pass  # No parameters needed - auto-detect from session/token

# Authentication Functions
async def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return pwd_context.verify(plain_password, hashed_password)

async def get_password_hash(password: str) -> str:
    """Hash password"""
    return pwd_context.hash(password)

async def authenticate_admin(username: str, password: str) -> Union[AdminUser, None]:
    """Authenticate admin using username and password"""
    try:
        # First check admin_users collection (existing super admins, executive admins, etc.)
        admin = await DatabaseOperations.find_one(
            "admin_users", 
            {
                "username": username,
                "is_active": True
            }
        )
        
        if admin and await verify_password(password, admin.get("password", "")):
            logger.info(f"Admin authenticated from admin_users collection: {username}")
            return AdminUser(**admin)
        
        # Also check legacy users collection with is_admin flag (for backward compatibility)
        legacy_admin = await DatabaseOperations.find_one(
            "users", 
            {
                "username": username,
                "is_admin": True,
                "is_active": True
            }
        )
        
        if legacy_admin and await verify_password(password, legacy_admin.get("password", "")):
            return AdminUser(**legacy_admin)
        
        # Check faculties collection for faculty organizers
        faculty = await DatabaseOperations.find_one(
            "faculties",
            {
                "employee_id": username,
                "$or": [
                    # Check if faculty has organizer permissions
                    {"organizer_permissions": {"$exists": True, "$ne": []}},
                    # Legacy format with is_organizer flag
                    {"is_organizer": True}
                ]
            }
        )
        
        if faculty and await verify_password(password, faculty.get("password", "")):
            # Create AdminUser object for faculty organizer
            # Handle both new and legacy formats
            permissions = faculty.get("organizer_permissions", [])
            assigned_events = faculty.get("assigned_events", [])
            
            admin_data = {
                "username": faculty["employee_id"],
                "employee_id": faculty["employee_id"],  # Add employee_id field
                "email": faculty.get("email", ""),
                "fullname": faculty.get("full_name", ""),
                "password": faculty.get("password", ""),  # Required field
                "role": AdminRole.ORGANIZER_ADMIN,
                "permissions": permissions,
                "assigned_events": assigned_events,
                "is_active": True,
                "created_at": faculty.get("created_at", datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None)),
                "last_login": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None)
            }
            logger.info(f"Faculty organizer authenticated: {username} with {len(assigned_events)} assigned events")
            return AdminUser(**admin_data)
        
        logger.warning(f"Authentication failed for username: {username}")
        return None
    except Exception as e:
        logger.error(f"Error authenticating admin: {e}")
        return None

async def authenticate_student(enrollment_no: str, password: str) -> Union[Student, None]:
    """Authenticate student user"""
    try:
        student_data = await DatabaseOperations.find_one(
            "students",
            {"enrollment_no": enrollment_no, "is_active": True}
        )
        
        if not student_data:
            return None
        
        if Student.verify_password(password, student_data.get("password_hash", "")):
            return Student(**student_data)
        
        return None
    except Exception as e:
        logger.error(f"Error authenticating student: {e}")
        return None

async def authenticate_faculty(employee_id: str, password: str) -> Union[Faculty, None]:
    """Authenticate faculty user"""
    try:
        faculty_data = await DatabaseOperations.find_one(
            "faculties", 
            {"employee_id": employee_id, "is_active": True}
        )
        
        if faculty_data and pwd_context.verify(password, faculty_data.get("password", "")):
            # Normalize gender for enum validation
            if 'gender' in faculty_data and faculty_data['gender']:
                faculty_data['gender'] = faculty_data['gender'].lower()
            return Faculty(**faculty_data)
        
        return None
    except Exception as e:
        logger.error(f"Error authenticating faculty: {e}")
        return None

@router.post("/login")
async def unified_login(request: Request, login_data: UnifiedLoginRequest):
    """
    Unified login endpoint for all user types (admin, student, faculty)
    Replaces 3 separate login endpoints with single endpoint + user_type parameter
    """
    try:
        user_type = login_data.user_type
        password = login_data.password
        remember_me = login_data.remember_me
        
        logger.info(f"Unified login attempt for user_type: {user_type}")
        
        # Route to appropriate authentication based on user_type
        user = None
        user_id = None
        collection = None
        
        if user_type == "admin":
            if not login_data.username:
                return JSONResponse(
                    status_code=400,
                    content={"success": False, "message": "Username is required for admin login"}
                )
            user = await authenticate_admin(login_data.username, password)
            user_id = login_data.username
            collection = "admin_users"
            
        elif user_type == "student":
            if not login_data.enrollment_no:
                return JSONResponse(
                    status_code=400,
                    content={"success": False, "message": "Enrollment number is required for student login"}
                )
            user = await authenticate_student(login_data.enrollment_no, password)
            user_id = login_data.enrollment_no
            collection = "students"
            
        elif user_type == "faculty":
            if not login_data.employee_id:
                return JSONResponse(
                    status_code=400,
                    content={"success": False, "message": "Employee ID is required for faculty login"}
                )
            user = await authenticate_faculty(login_data.employee_id, password)
            user_id = login_data.employee_id
            collection = "faculties"
        
        # Check authentication result
        if not user:
            logger.warning(f"Authentication failed for {user_type}: {user_id}")
            return JSONResponse(
                status_code=401,
                content={"success": False, "message": "Invalid credentials"}
            )
        
        logger.info(f"Authentication successful for {user_type}: {user_id}")
        
        # Update last login time
        await DatabaseOperations.update_one(
            collection,
            {("username" if user_type == "admin" else 
              "enrollment_no" if user_type == "student" else "employee_id"): user_id},
            {"$set": {"last_login": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None)}}
        )
        
        # Prepare user data for token/session
        user_data = user.model_dump()
        current_time = datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None)
        
        # Convert ALL datetime objects to ISO strings (including None check)
        # This ensures session data is always JSON-serializable
        for key, value in list(user_data.items()):
            if isinstance(value, datetime):
                user_data[key] = value.isoformat()
            elif value is None and key in ['date_of_birth', 'created_at', 'updated_at', 'last_login']:
                # Keep None as None, don't convert
                pass
        
        # Generate tokens - CRITICAL FIX: Always generate for iOS compatibility
        # iOS Safari blocks third-party cookies, so we MUST use Bearer tokens
        tokens = {}
        try:
            if token_manager.is_available():
                # Use Redis-backed tokens if available
                tokens = token_manager.generate_tokens(
                    user_id=user_id,
                    user_type=user_type,
                    user_data=user_data,
                    remember_me=remember_me
                )
            else:
                # Fallback: Generate JWT tokens without Redis (stateless)
                # This ensures iOS users can login via Bearer tokens
                import jwt
                from datetime import timedelta
                from config.settings import get_settings
                settings = get_settings()
                
                expires_in = 30 * 24 * 3600 if remember_me else 3600  # 30 days or 1 hour
                exp_time = datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None) + timedelta(seconds=expires_in)
                
                token_payload = {
                    "user_id": user_id,
                    "user_type": user_type,
                    "user_data": user_data,
                    "exp": exp_time,
                    "iat": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None)
                }
                
                access_token = jwt.encode(
                    token_payload,
                    settings.JWT_SECRET_KEY,
                    algorithm=settings.JWT_ALGORITHM
                )
                
                tokens = {
                    "access_token": access_token,
                    "expires_in": expires_in,
                    "token_type": "Bearer"
                }
                
                logger.info(f"Generated stateless JWT token for {user_type} {user_id} (Redis unavailable)")
        except Exception as e:
            logger.error(f"Failed to generate tokens: {e}")
            # Continue anyway - session-based auth will be used
        
        # Store in session as fallback
        user_data["login_time"] = current_time.isoformat()
        session_key = f"{user_type}"
        request.session[session_key] = user_data
        
        if user_type == "student":
            request.session["student_enrollment"] = user_id
        elif user_type == "faculty":
            request.session["faculty_employee_id"] = user_id
        
        # Determine redirect URL based on user type and role
        redirect_urls = {
            "admin": {
                AdminRole.SUPER_ADMIN: "/admin/dashboard",
                AdminRole.EXECUTIVE_ADMIN: "/admin/events/create", 
                AdminRole.ORGANIZER_ADMIN: "/admin/events"
            },
            "student": "/client/dashboard",
            "faculty": "/faculty/profile"
        }
        
        if user_type == "admin":
            redirect_url = redirect_urls["admin"].get(user.role, "/admin/dashboard")
        else:
            redirect_url = redirect_urls[user_type]
        
        # Build user info for response
        if user_type == "admin":
            user_info = {
                "username": user.username,
                "fullname": user.fullname,
                "role": user.role.value if user.role else None,
                "user_type": "admin",
                "employee_id": user.employee_id
            }
        elif user_type == "student":
            user_info = {
                "enrollment_no": user.enrollment_no,
                "full_name": user.full_name,
                "email": user.email,
                "department": user.department,
                "semester": user.semester,
                "user_type": "student"
            }
        else:  # faculty
            user_info = {
                "employee_id": user.employee_id,
                "full_name": user.full_name,
                "email": user.email,
                "department": user.department,
                "contact_no": user.contact_no,
                "user_type": "faculty"
            }
        
        response_data = {
            "success": True,
            "message": "Login successful",
            "redirect_url": redirect_url,
            "user": user_info,
            "auth_type": "token" if tokens else "session",
            "remember_me": remember_me,
            "user_type": user_type
        }
        
        # Add token information if available
        if tokens:
            response_data["expires_in"] = tokens.get("expires_in", 3600)
            response_data["access_token"] = tokens.get("access_token")
            response_data["refresh_token"] = tokens.get("refresh_token")
        
        # Create response
        response = JSONResponse(content=response_data)
        
        # Set token cookies if tokens were generated
        if tokens:
            AuthMiddleware.set_token_cookies(
                response,
                access_token=tokens["access_token"],
                refresh_token=tokens.get("refresh_token"),
                expires_in=tokens.get("expires_in", 3600)
            )
        
        return response
        
    except Exception as e:
        logger.error(f"Error in unified login: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "Internal server error"}
        )

@router.post("/logout")
async def unified_logout(request: Request):
    """
    Unified logout endpoint for all user types
    Auto-detects user type from session/token and performs appropriate logout
    Replaces 3 separate logout endpoints with single smart endpoint
    """
    try:
        # Auto-detect user type from session
        user_type = None
        user_id = None
        
        if "admin" in request.session:
            user_type = "admin"
            admin_data = request.session.get("admin")
            user_id = admin_data.get("username") if admin_data else None
        elif "student" in request.session:
            user_type = "student"
            student_data = request.session.get("student")
            user_id = student_data.get("enrollment_no") if student_data else None
        elif "faculty" in request.session:
            user_type = "faculty"
            faculty_data = request.session.get("faculty")
            user_id = faculty_data.get("employee_id") if faculty_data else None
        
        if not user_type:
            return JSONResponse(
                status_code=401,
                content={"success": False, "message": "No active session found"}
            )
        
        logger.info(f"Unified logout for {user_type}: {user_id}")
        
        # Revoke tokens if available
        if user_id and token_manager.is_available():
            token_manager.revoke_user_tokens(user_id, user_type)
        
        # Clear session data based on user type
        if user_type == "admin":
            request.session.pop("admin", None)
        elif user_type == "student":
            request.session.pop("student", None)
            request.session.pop("student_enrollment", None)
        elif user_type == "faculty":
            request.session.pop("faculty", None)
            request.session.pop("faculty_employee_id", None)
        
        response_data = {
            "success": True,
            "message": "Logout successful",
            "user_type": user_type
        }
        
        # Create response and clear token cookies
        response = JSONResponse(content=response_data)
        AuthMiddleware.clear_token_cookies(response)
        
        return response
        
    except Exception as e:
        logger.error(f"Error in unified logout: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "Internal server error"}
        )

# Admin Profile Management Endpoints (moved from legacy)
@router.get("/admin/profile")
async def get_admin_profile_api(request: Request, admin: AdminUser = Depends(get_current_admin)):
    """API endpoint to get admin profile data"""
    try:
        return {
            "success": True,
            "user": {
                "username": admin.username,
                "fullname": admin.fullname,
                "role": admin.role.value if admin.role else None,
                "email": admin.email,
                "phone": admin.mobile_no if hasattr(admin, 'mobile_no') else None,
                "employee_id": admin.employee_id if hasattr(admin, 'employee_id') else None,
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

@router.put("/admin/profile")
async def update_admin_profile_api(request: Request, admin: AdminUser = Depends(get_current_admin)):
    """
    Unified admin profile update endpoint - handles profile, username, and password updates
    Uses 'update_type' parameter to determine what to update
    """
    try:
        logger.info(f"Profile update request from admin: {admin.username}")
        data = await request.json()
        update_type = data.get("update_type", "profile")  # Default to profile update
        logger.info(f"Update type: {update_type}, Data received: {[k for k in data.keys() if k != 'current_password' and k != 'new_password']}")
        
        if update_type == "profile":
            return await _update_profile_data(admin, data)
        elif update_type == "username":
            return await _update_username(admin, data)
        elif update_type == "password":
            return await _update_password(admin, data)
        else:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Invalid update_type. Use: 'profile', 'username', or 'password'"}
            )
            
    except Exception as e:
        logger.error(f"Error in unified profile update: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": f"Internal server error: {str(e)}"}
        )

async def _update_profile_data(admin: AdminUser, data: dict):
    """Handle profile data updates (fullname, email, mobile_no)"""
    fullname = data.get("fullname", "").strip()
    email = data.get("email", "").strip()
    # Handle both 'mobile_no' and 'phone' field names
    mobile_no = data.get("mobile_no", data.get("phone", "")).strip()
    
    logger.info(f"Profile data - fullname: {fullname}, email: {email}, mobile_no: {mobile_no}")
    
    if not fullname:
        logger.warning("Profile update failed: fullname is required")
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Full name is required"}
        )
    
    # Update profile in database
    update_data = {
        "fullname": fullname,
        "email": email,
        "mobile_no": mobile_no,
        "updated_at": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None)
    }
    
    # Remove empty fields
    update_data = {k: v for k, v in update_data.items() if v}
    logger.info(f"Profile update data prepared: {update_data}")
    
    success = await DatabaseOperations.update_one(
        "users",
        {"username": admin.username},
        {"$set": update_data}
    )
    
    if success:
        logger.info(f"Profile updated successfully for admin: {admin.username}")
        return {"success": True, "message": "Profile updated successfully"}
    else:
        # Check if no modification was needed (data unchanged)
        updated_admin = await DatabaseOperations.find_one("users", {"username": admin.username})
        if updated_admin and updated_admin.get("fullname") == fullname:
            logger.info(f"Profile data unchanged for admin: {admin.username}")
            return {"success": True, "message": "Profile updated successfully"}
        else:
            logger.error(f"Profile update failed for admin: {admin.username}")
            return JSONResponse(
                status_code=500,
                content={"success": False, "message": "Failed to update profile"}
            )

async def _update_username(admin: AdminUser, data: dict):
    """Handle username updates"""
    new_username = data.get("new_username", "").strip()
    current_password = data.get("current_password", "").strip()
    
    if not new_username:
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "New username is required"}
        )
    
    if not current_password:
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Current password is required for username change"}
        )
    
    # Verify current password
    if not pwd_context.verify(current_password, admin.password):
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Current password is incorrect"}
        )
    
    # Check if new username already exists
    existing_admin = await DatabaseOperations.find_one("users", {"username": new_username})
    if existing_admin and existing_admin.get("username") != admin.username:
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Username already exists"}
        )
    
    # Update username
    success = await DatabaseOperations.update_one(
        "users",
        {"username": admin.username},
        {"$set": {"username": new_username, "updated_at": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None)}}
    )
    
    if success:
        logger.info(f"Username updated successfully: {admin.username} -> {new_username}")
        return {"success": True, "message": "Username updated successfully"}
    else:
        logger.error(f"Username update failed: {admin.username} -> {new_username}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "Failed to update username"}
        )

async def _update_password(admin: AdminUser, data: dict):
    """Handle password updates"""
    current_password = data.get("current_password", "")
    new_password = data.get("new_password", "")
    confirm_password = data.get("confirm_password", "")
    
    if not all([current_password, new_password, confirm_password]):
        logger.warning("Password update failed: missing required fields")
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "All password fields are required"}
        )
    
    if new_password != confirm_password:
        logger.warning("Password update failed: passwords do not match")
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "New passwords do not match"}
        )
    
    # Verify current password
    if not pwd_context.verify(current_password, admin.password):
        logger.warning(f"Password update failed: incorrect current password for {admin.username}")
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Current password is incorrect"}
        )
    
    # Hash new password and update
    hashed_password = pwd_context.hash(new_password)
    
    success = await DatabaseOperations.update_one(
        "users",
        {"username": admin.username},
        {
            "$set": {
                "password": hashed_password,
                "updated_at": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None)
            }
        }
    )
    
    if success:
        logger.info(f"Password updated successfully for admin: {admin.username}")
        return {"success": True, "message": "Password updated successfully"}
    else:
        logger.error(f"Password update failed for admin: {admin.username}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "Failed to update password"}
        )

@router.get("/info")
async def unified_auth_info():
    """
    Information endpoint for unified authentication system
    Shows consolidation details and usage instructions
    """
    return {
        "success": True,
        "message": "Unified Authentication API - Phase 3B+ Consolidation + Legacy Cleanup",
        "endpoints": {
            "login": {
                "path": "/api/v1/auth/login",
                "method": "POST",
                "parameters": {
                    "user_type": ["admin", "student", "faculty"],
                    "username": "Required for admin",
                    "enrollment_no": "Required for student", 
                    "employee_id": "Required for faculty",
                    "password": "Required for all",
                    "remember_me": "Optional boolean"
                },
                "replaces": [
                    "/api/v1/auth/admin/login",
                    "/api/v1/auth/student/login",
                    "/api/v1/auth/faculty/login"
                ]
            },
            "logout": {
                "path": "/api/v1/auth/logout", 
                "method": "POST",
                "parameters": {
                    "auto_detection": "Detects user type from session/token"
                },
                "replaces": [
                    "/api/v1/auth/admin/logout",
                    "/api/v1/auth/student/logout", 
                    "/api/v1/auth/faculty/logout"
                ]
            },
            "admin_profile": {
                "paths": [
                    "GET /api/v1/auth/admin/profile",
                    "PUT /api/v1/auth/admin/profile", 
                    "PUT /api/v1/auth/admin/password"
                ],
                "replaces": [
                    "/api/legacy/auth/profile endpoints",
                    "/app/legacy/auth/profile endpoints"
                ]
            }
        },
        "consolidation": {
            "phase_3b_plus": "6 separate auth endpoints → 2 unified endpoints (-4)",
            "legacy_cleanup": "Admin profile endpoints consolidated (+3 functional)", 
            "total_active": "6 functional auth endpoints (login, logout, profile×3, info)",
            "legacy_removed": "All redundant legacy auth files eliminated"
        }
    }
