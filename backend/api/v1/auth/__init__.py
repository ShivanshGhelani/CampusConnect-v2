"""
Authentication API Routes
Handles authentication-related API endpoints with token-based "Remember Me" functionality
"""
from fastapi import APIRouter, Request, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from models.admin_user import AdminUser, AdminRole
from models.student import Student
from models.faculty import Faculty, FacultyCreate
from dependencies.auth import get_current_admin
from ...legacy.auth_legacy import authenticate_admin  # Updated path
from dependencies.auth import get_current_student_optional, get_current_student
from database.operations import DatabaseOperations
from utils.token_manager import token_manager
from middleware.auth_middleware import AuthMiddleware, create_token_response
from datetime import datetime
from typing import Union, Optional
import logging
import re
from passlib.context import CryptContext

# Import password reset router and unified status router
from .password_reset import router as password_reset_router
from .status import router as status_router

# Password hashing context for faculty
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def authenticate_student(enrollment_no: str, password: str) -> Union[Student, None]:
    """Authenticate student using enrollment number and password"""
    try:
        # Find student in database
        student_data = await DatabaseOperations.find_one(
            "students",
            {
                "enrollment_no": enrollment_no,
                "is_active": True
            }
        )
        
        if not student_data:
            return None
        
        # Verify password using Student model method
        if Student.verify_password(password, student_data.get("password_hash", "")):
            return Student(**student_data)
        
        return None
    except Exception as e:
        logger.error(f"Error authenticating student: {e}")
        return None

router = APIRouter()
logger = logging.getLogger(__name__)

# Pydantic models for request validation
class AdminLoginRequest(BaseModel):
    username: str
    password: str
    remember_me: bool = False

class StudentLoginRequest(BaseModel):
    enrollment_no: str
    password: str
    remember_me: bool = False

class StudentRegisterRequest(BaseModel):
    full_name: str
    enrollment_no: str
    email: str
    mobile_no: str
    gender: str
    date_of_birth: str
    department: str
    semester: int
    password: str

class FacultyLoginRequest(BaseModel):
    employee_id: str
    password: str
    remember_me: bool = False

class FacultyRegisterRequest(BaseModel):
    employee_id: str
    full_name: str
    email: str
    contact_no: str
    department: str
    designation: str
    qualification: str
    specialization: str = None
    experience_years: int
    seating: str = None
    gender: str
    date_of_birth: str
    date_of_joining: str = None
    employment_type: str = None
    password: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str

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
                "user_type": "admin",
                "employee_id": admin.employee_id  # Add missing employee_id
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
                "mobile_no": student.mobile_no,
                "department": student.department,
                "semester": student.semester,
                "gender": student.gender,
                "date_of_birth": student.date_of_birth.isoformat() if student.date_of_birth else None,
                "user_type": "student"
            },
            "redirect_url": "/client/dashboard"
        }
    except HTTPException:
        return {"authenticated": False, "user_type": "student"}
    except Exception as e:
        return {"authenticated": False, "error": str(e), "user_type": "student"}

@router.get("/faculty/status")
async def faculty_auth_status(request: Request):
    """API endpoint to check if faculty is authenticated"""
    try:
        faculty_data = request.session.get("faculty")
        if faculty_data:
            return {
                "authenticated": True,
                "user": {
                    "employee_id": faculty_data.get("employee_id"),
                    "faculty_id": faculty_data.get("employee_id"),  # Alias for consistency
                    "full_name": faculty_data.get("full_name"),
                    "email": faculty_data.get("email"),
                    "mobile_no": faculty_data.get("contact_no"),
                    "phone_number": faculty_data.get("contact_no"),  # Alias for consistency
                    "department": faculty_data.get("department"),
                    "designation": faculty_data.get("designation"),
                    "gender": faculty_data.get("gender"),
                    "date_of_birth": faculty_data.get("date_of_birth"),
                    "user_type": "faculty"
                },
                "redirect_url": "/faculty/profile"
            }
        else:
            return {"authenticated": False, "user_type": "faculty"}
    except Exception as e:
        return {"authenticated": False, "error": str(e), "user_type": "faculty"}

@router.post("/admin/login")
async def admin_login_api(request: Request, login_data: AdminLoginRequest):
    """API endpoint for admin login with token-based authentication"""
    try:
        username = login_data.username
        password = login_data.password
        remember_me = login_data.remember_me
        
        logger.info(f"Admin login attempt via API: {username}")
        
        if not all([username, password]):
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Username and password are required"}
            )
        
        admin = await authenticate_admin(username, password)
        if not admin:
            logger.warning(f"Authentication failed for user: {username}")
            return JSONResponse(
                status_code=401,
                content={"success": False, "message": "Invalid username or password"}
            )
        
        logger.info(f"Authentication successful for user: {username}, role: {admin.role}")
        
        # Update last login time in the correct collection
        # First try admin_users collection
        admin_users_result = await DatabaseOperations.update_one(
            "admin_users",
            {"username": username},
            {"$set": {"last_login": datetime.utcnow()}}
        )
        
        # If not updated in admin_users, try users collection (for other user types)
        if not admin_users_result:
            await DatabaseOperations.update_one(
                "users",
                {"username": username},
                {"$set": {"last_login": datetime.utcnow()}}
            )
        
        # Prepare user data for token
        admin_data = admin.model_dump()
        current_time = datetime.utcnow()
        
        for key, value in admin_data.items():
            if isinstance(value, datetime):
                admin_data[key] = value.isoformat()
        
        # Generate tokens if Redis is available
        tokens = {}
        if token_manager.is_available():
            tokens = token_manager.generate_tokens(
                user_id=username,
                user_type='admin',
                user_data=admin_data,
                remember_me=remember_me
            )
        
        # Always store in session as fallback
        admin_data["login_time"] = current_time.isoformat()
        request.session["admin"] = admin_data
        
        # Determine redirect URL based on role
        redirect_urls = {
            AdminRole.SUPER_ADMIN: "/admin/dashboard",
            AdminRole.EXECUTIVE_ADMIN: "/admin/events/create",
            AdminRole.ORGANIZER_ADMIN: "/admin/events"
        }
        
        response_data = {
            "success": True,
            "message": "Login successful",
            "redirect_url": redirect_urls.get(admin.role, "/admin/dashboard"),
            "user": {
                "username": admin.username,
                "fullname": admin.fullname,
                "role": admin.role.value if admin.role else None,
                "user_type": "admin",
                "employee_id": admin.employee_id
            },
            "auth_type": "token" if tokens else "session",
            "remember_me": remember_me
        }
        
        # Add token information if available
        if tokens:
            response_data["expires_in"] = tokens.get("expires_in", 3600)
        
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
        logger.error(f"Error in admin login API: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "Internal server error"}
        )

@router.post("/admin/logout")
async def admin_logout_api(request: Request):
    """API endpoint for admin logout with token cleanup"""
    try:
        # Get admin info for token cleanup
        admin_data = request.session.get("admin")
        if admin_data:
            username = admin_data.get("username")
            if username and token_manager.is_available():
                token_manager.revoke_user_tokens(username, 'admin')
        
        # Clear admin session
        if "admin" in request.session:
            del request.session["admin"]
        
        response_data = {
            "success": True,
            "message": "Logout successful"
        }
        
        # Create response and clear token cookies
        response = JSONResponse(content=response_data)
        AuthMiddleware.clear_token_cookies(response)
        
        return response
        
    except Exception as e:
        logger.error(f"Error in admin logout API: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "Internal server error"}
        )

@router.post("/student/login")
async def student_login_api(request: Request, login_data: StudentLoginRequest):
    """API endpoint for student login with token-based authentication"""
    try:
        enrollment_no = login_data.enrollment_no
        password = login_data.password
        remember_me = login_data.remember_me
        
        if not all([enrollment_no, password]):
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Enrollment number and password are required"}
            )
        
        student = await authenticate_student(enrollment_no, password)
        if not student:
            return JSONResponse(
                status_code=401,
                content={"success": False, "message": "Invalid enrollment number or password"}
            )
        
        # Update last login time
        await DatabaseOperations.update_one(
            "students",
            {"enrollment_no": enrollment_no},
            {"$set": {"last_login": datetime.utcnow()}}
        )
        
        # Prepare user data for token
        student_data = student.model_dump()
        for key, value in student_data.items():
            if isinstance(value, datetime):
                student_data[key] = value.isoformat()
        
        # Generate tokens if Redis is available
        tokens = {}
        if token_manager.is_available():
            tokens = token_manager.generate_tokens(
                user_id=enrollment_no,
                user_type='student',
                user_data=student_data,
                remember_me=remember_me
            )
        
        # Always store in session as fallback
        request.session["student"] = student_data
        request.session["student_enrollment"] = enrollment_no
        
        response_data = {
            "success": True,
            "message": "Login successful",
            "redirect_url": "/client/dashboard",
            "user": {
                "enrollment_no": student.enrollment_no,
                "full_name": student.full_name,
                "email": student.email,
                "department": student.department,
                "semester": student.semester,
                "user_type": "student"
            },
            "auth_type": "token" if tokens else "session",
            "remember_me": remember_me
        }
        
        # Add token information if available
        if tokens:
            response_data["expires_in"] = tokens.get("expires_in", 3600)
        
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
        logger.error(f"Error in student login API: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "Internal server error"}
        )

@router.post("/faculty/login")
async def faculty_login_api(request: Request, login_data: FacultyLoginRequest):
    """API endpoint for faculty login with token-based authentication"""
    try:
        employee_id = login_data.employee_id
        password = login_data.password
        remember_me = login_data.remember_me
        
        if not all([employee_id, password]):
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Employee ID and password are required"}
            )
        
        faculty = await authenticate_faculty(employee_id, password)
        if not faculty:
            return JSONResponse(
                status_code=401,
                content={"success": False, "message": "Invalid employee ID or password"}
            )
        
        # Update last login time
        await DatabaseOperations.update_one(
            "faculties",
            {"employee_id": employee_id},
            {"$set": {"last_login": datetime.utcnow()}}
        )
        
        # Prepare user data for token
        faculty_data = faculty.model_dump()
        for key, value in faculty_data.items():
            if isinstance(value, datetime):
                faculty_data[key] = value.isoformat()
        
        # Generate tokens if Redis is available
        tokens = {}
        if token_manager.is_available():
            tokens = token_manager.generate_tokens(
                user_id=employee_id,
                user_type='faculty',
                user_data=faculty_data,
                remember_me=remember_me
            )
        
        # Always store in session as fallback
        request.session["faculty"] = faculty_data
        request.session["faculty_employee_id"] = employee_id
        
        response_data = {
            "success": True,
            "message": "Login successful",
            "redirect_url": "/faculty/profile",
            "user": {
                "employee_id": faculty.employee_id,
                "full_name": faculty.full_name,
                "email": faculty.email,
                "department": faculty.department,
                "contact_no": faculty.contact_no,
                "user_type": "faculty"
            },
            "auth_type": "token" if tokens else "session",
            "remember_me": remember_me
        }
        
        # Add token information if available
        if tokens:
            response_data["expires_in"] = tokens.get("expires_in", 3600)
        
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
        logger.error(f"Error in faculty login API: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "Internal server error"}
        )

@router.post("/student/logout")
async def student_logout_api(request: Request):
    """API endpoint for student logout with token cleanup"""
    try:
        # Get student info for token cleanup
        student_data = request.session.get("student")
        if student_data:
            enrollment_no = student_data.get("enrollment_no")
            if enrollment_no and token_manager.is_available():
                token_manager.revoke_user_tokens(enrollment_no, 'student')
        
        # Clear session data
        request.session.pop("student", None)
        request.session.pop("student_enrollment", None)
        
        response_data = {"success": True, "message": "Logout successful"}
        
        # Create response and clear token cookies
        response = JSONResponse(content=response_data)
        AuthMiddleware.clear_token_cookies(response)
        
        return response
        
    except Exception as e:
        logger.error(f"Error in student logout API: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "Internal server error"}
        )

@router.post("/faculty/logout")
async def faculty_logout_api(request: Request):
    """API endpoint for faculty logout with token cleanup"""
    try:
        # Get faculty info for token cleanup
        faculty_data = request.session.get("faculty")
        if faculty_data:
            employee_id = faculty_data.get("employee_id")
            if employee_id and token_manager.is_available():
                token_manager.revoke_user_tokens(employee_id, 'faculty')
        
        # Clear session data
        request.session.pop("faculty", None)
        request.session.pop("faculty_employee_id", None)
        
        response_data = {"success": True, "message": "Logout successful"}
        
        # Create response and clear token cookies
        response = JSONResponse(content=response_data)
        AuthMiddleware.clear_token_cookies(response)
        
        return response
        
    except Exception as e:
        logger.error(f"Error in faculty logout API: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "Internal server error"}
        )

@router.post("/refresh-token")
async def refresh_token_api(request: Request, refresh_data: RefreshTokenRequest):
    """API endpoint to refresh access token using refresh token"""
    try:
        refresh_token = refresh_data.refresh_token
        
        if not refresh_token:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Refresh token is required"}
            )
        
        # Try to refresh the access token
        new_token_data = token_manager.refresh_access_token(refresh_token)
        if not new_token_data:
            return JSONResponse(
                status_code=401,
                content={"success": False, "message": "Invalid or expired refresh token"}
            )
        
        response_data = {
            "success": True,
            "message": "Token refreshed successfully",
            "access_token": new_token_data["access_token"],
            "expires_in": new_token_data["expires_in"]
        }
        
        # Create response and set new access token cookie
        response = JSONResponse(content=response_data)
        response.set_cookie(
            key="access_token",
            value=new_token_data["access_token"],
            max_age=new_token_data["expires_in"],
            httponly=True,
            secure=True,  # Set to True in production with HTTPS
            samesite="lax"
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Error in refresh token API: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "Internal server error"}
        )

@router.post("/student/register")
async def student_register_api(request: Request, register_data: StudentRegisterRequest):
    """API endpoint for student registration"""
    try:
        import re
        from bson import ObjectId
        
        # Extract data from request
        enrollment_no = register_data.enrollment_no.strip().upper()
        full_name = register_data.full_name.strip()
        email = register_data.email.strip().lower()
        mobile_no = register_data.mobile_no.strip()
        password = register_data.password
        department = register_data.department.strip()
        semester = register_data.semester
        gender = register_data.gender.strip().lower()  # Normalize to lowercase
        date_of_birth = register_data.date_of_birth.strip()
        
        # Validation
        errors = []
        
        if not enrollment_no or not re.match(r'^\d{2}[A-Z]{2,4}\d{5}$', enrollment_no):
            errors.append("Invalid enrollment number format (e.g., 21BECE40015)")
            
        if not full_name or len(full_name) < 2:
            errors.append("Valid full name is required")
            
        if not email or "@" not in email:
            errors.append("Valid email address is required")
            
        if not mobile_no or len(mobile_no) != 10 or not mobile_no.isdigit():
            errors.append("Valid 10-digit mobile number is required")
            
        # Enhanced password validation
        if not password or len(password) < 6:
            errors.append("Password must be at least 6 characters long")
        if not any(c in "!@#$%^&*" for c in password):
            errors.append("Password must contain at least one special character")
        if not any(c.isdigit() for c in password):
            errors.append("Password must contain at least one number")
        
        # Gender validation
        if not gender:
            errors.append("Gender is required")
        elif gender not in ["male", "female", "other"]:
            errors.append("Please select a valid gender option")
        
        # Department validation
        if not department:
            errors.append("Department is required")
        
        # Semester validation
        if not semester or not isinstance(semester, int) or semester < 1 or semester > 8:
            errors.append("Valid semester (1-8) is required")
        
        # Date of birth validation
        if not date_of_birth:
            errors.append("Date of birth is required")
        else:
            try:
                birth_date = datetime.strptime(date_of_birth, '%Y-%m-%d')
                today = datetime.now()
                age = today.year - birth_date.year
                
                if today.month < birth_date.month or (today.month == birth_date.month and today.day < birth_date.day):
                    age -= 1
                if age < 15:
                    errors.append("You must be at least 15 years old to register")
                elif age > 100:
                    errors.append("Please enter a valid date of birth")
            except ValueError:
                errors.append("Please enter a valid date of birth")
        
        if errors:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "; ".join(errors)}
            )
        
        # Check if student already exists
        existing_student = await DatabaseOperations.find_one(
            "students",
            {"$or": [
                {"enrollment_no": enrollment_no},
                {"email": email},
                {"mobile_no": mobile_no}
            ]}
        )
        
        if existing_student:
            if existing_student.get("enrollment_no") == enrollment_no:
                return JSONResponse(
                    status_code=400,
                    content={"success": False, "message": "Student with this enrollment number already exists"}
                )
            elif existing_student.get("email") == email:
                return JSONResponse(
                    status_code=400,
                    content={"success": False, "message": "Student with this email already exists"}
                )
            elif existing_student.get("mobile_no") == mobile_no:
                return JSONResponse(
                    status_code=400,
                    content={"success": False, "message": "Student with this mobile number already exists"}
                )
        
        # Create new student
        new_student = Student(
            enrollment_no=enrollment_no,
            full_name=full_name,
            email=email,
            mobile_no=mobile_no,
            password_hash=Student.get_password_hash(password),
            department=department,
            semester=semester,
            gender=gender,
            date_of_birth=datetime.strptime(date_of_birth, '%Y-%m-%d'),
            created_at=datetime.utcnow(),
            is_active=True
        )
          # Save to database
        result = await DatabaseOperations.insert_one("students", new_student.model_dump())
        
        if result:  # result is the inserted_id as a string
            return {
                "success": True,
                "message": "Registration successful! You can now login with your credentials.",
                "user": {
                    "enrollment_no": enrollment_no,
                    "full_name": full_name,
                    "email": email,
                    "user_type": "student"
                }
            }
        else:
            return JSONResponse(
                status_code=500,
                content={"success": False, "message": "Registration failed. Please try again."}
            )
            
    except Exception as e:
        logger.error(f"Error in student registration API: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "Internal server error"}
        )

@router.post("/faculty/register")
async def faculty_register_api(request: Request, register_data: FacultyRegisterRequest):
    """API endpoint for faculty registration"""
    try:
        # Extract data from request
        employee_id = register_data.employee_id.strip().upper()
        full_name = register_data.full_name.strip()
        email = register_data.email.strip().lower()
        contact_no = register_data.contact_no.strip()
        password = register_data.password
        department = register_data.department.strip()
        designation = register_data.designation.strip()
        qualification = register_data.qualification.strip()
        specialization = register_data.specialization.strip() if register_data.specialization else None
        experience_years = register_data.experience_years
        seating = register_data.seating.strip() if register_data.seating else None
        gender = register_data.gender.strip().lower()  # Normalize to lowercase
        date_of_birth = register_data.date_of_birth.strip()
        date_of_joining = register_data.date_of_joining.strip() if register_data.date_of_joining else None
        employment_type = register_data.employment_type.strip() if register_data.employment_type else None
        
        # Validation
        errors = []
        
        # Employee ID validation (alphanumeric format)
        if not employee_id or not re.match(r'^[A-Z0-9]{3,20}$', employee_id):
            errors.append("Invalid employee ID format (3-20 alphanumeric characters)")
            
        if not full_name or len(full_name) < 2:
            errors.append("Valid full name is required")
            
        if not email or "@" not in email:
            errors.append("Valid email address is required")
            
        if not contact_no or len(contact_no) != 10 or not contact_no.isdigit():
            errors.append("Valid 10-digit contact number is required")
            
        # Enhanced password validation
        if not password or len(password) < 6:
            errors.append("Password must be at least 6 characters long")
        if not any(c in "!@#$%^&*" for c in password):
            errors.append("Password must contain at least one special character")
        if not any(c.isdigit() for c in password):
            errors.append("Password must contain at least one number")
        
        # Gender validation
        if not gender:
            errors.append("Gender is required")
        elif gender not in ["male", "female", "other"]:
            errors.append("Please select a valid gender option")
        
        # Department validation
        if not department:
            errors.append("Department is required")
        
        # Designation validation
        if not designation:
            errors.append("Designation is required")
        
        # Qualification validation
        if not qualification:
            errors.append("Qualification is required")
        
        # Experience validation
        if experience_years is None or experience_years < 0 or experience_years > 50:
            errors.append("Experience years must be between 0 and 50")
        
        # Date of birth validation
        if not date_of_birth:
            errors.append("Date of birth is required")
        else:
            try:
                birth_date = datetime.strptime(date_of_birth, '%Y-%m-%d')
                today = datetime.now()
                age = today.year - birth_date.year
                
                if today.month < birth_date.month or (today.month == birth_date.month and today.day < birth_date.day):
                    age -= 1
                if age < 18:
                    errors.append("You must be at least 18 years old to register")
                elif age > 80:
                    errors.append("Please enter a valid date of birth")
            except ValueError:
                errors.append("Please enter a valid date of birth")
        
        if errors:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "; ".join(errors)}
            )
        
        # Check if faculty already exists
        existing_faculty = await DatabaseOperations.find_one(
            "faculties",
            {"$or": [
                {"employee_id": employee_id},
                {"email": email},
                {"contact_no": contact_no}
            ]}
        )
        
        if existing_faculty:
            if existing_faculty.get("employee_id") == employee_id:
                return JSONResponse(
                    status_code=400,
                    content={"success": False, "message": "Faculty with this employee ID already exists"}
                )
            elif existing_faculty.get("email") == email:
                return JSONResponse(
                    status_code=400,
                    content={"success": False, "message": "Faculty with this email already exists"}
                )
            elif existing_faculty.get("contact_no") == contact_no:
                return JSONResponse(
                    status_code=400,
                    content={"success": False, "message": "Faculty with this contact number already exists"}
                )
        
        # Create new faculty
        hashed_password = pwd_context.hash(password)
        birth_date = datetime.strptime(date_of_birth, '%Y-%m-%d')
        joining_date = None
        if date_of_joining:
            try:
                joining_date = datetime.strptime(date_of_joining, '%Y-%m-%d')
            except ValueError:
                errors.append("Invalid date of joining format. Use YYYY-MM-DD")
                return JSONResponse(
                    status_code=400,
                    content={"success": False, "message": "; ".join(errors)}
                )
        
        faculty_doc = {
            "employee_id": employee_id,
            "full_name": full_name,
            "department": department,
            "designation": designation,
            "qualification": qualification,
            "specialization": specialization,
            "experience_years": experience_years,
            "password": hashed_password,
            "email": email,
            "contact_no": contact_no,
            "seating": seating,
            "gender": gender,
            "date_of_birth": birth_date,
            "date_of_joining": joining_date,
            "employment_type": employment_type,
            "event_participation": [],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "last_login": None,
            "is_active": True,
            # Auto-grant organizer permissions for new faculty
            "is_organizer": True,
            "assigned_events": [],
            "organizer_permissions": [
                "admin.events.read",
                "admin.events.create", 
                "admin.events.update",
                "admin.events.delete",
                "admin.students.read",
                "admin.certificates.create",
                "admin.certificates.read",
                "admin.venues.read",
                "admin.venues.create",
                "admin.assets.read",
                "admin.assets.create",
                "admin.feedback.read",
                "admin.feedback.create"
            ]
        }
        
        # Save to database
        result = await DatabaseOperations.insert_one("faculties", faculty_doc)
        
        if result:  # result is the inserted_id as a string
            return {
                "success": True,
                "message": "Registration successful! You can now login with your credentials.",
                "user": {
                    "employee_id": employee_id,
                    "full_name": full_name,
                    "email": email,
                    "user_type": "faculty"
                }
            }
        else:
            return JSONResponse(
                status_code=500,
                content={"success": False, "message": "Registration failed. Please try again."}
            )
            
    except Exception as e:
        logger.error(f"Error in faculty registration API: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "Internal server error"}
        )

@router.post("/validate-field")
async def validate_field_api(request: Request):
    """API endpoint to validate individual form fields (email, phone, enrollment_no, employee_id)"""
    try:
        data = await request.json()
        field_name = data.get("field_name")
        field_value = data.get("field_value", "").strip()
        user_type = data.get("user_type", "student")  # student or faculty
        current_user_id = data.get("current_user_id")  # For profile edit validation
        
        if not field_name or not field_value:
            return {"success": True, "available": True, "message": ""}
        
        field_value_lower = field_value.lower()
        
        # For email and phone, check BOTH students and faculty collections for cross-validation
        if field_name in ["email", "mobile_no", "contact_no"]:
            # Normalize field names for query
            student_field = "mobile_no" if field_name in ["mobile_no", "contact_no"] else field_name
            faculty_field = "contact_no" if field_name in ["mobile_no", "contact_no"] else field_name
            
            # Check students collection
            student_query = {}
            if field_name == "email":
                student_query = {"email": field_value_lower}
            elif field_name in ["mobile_no", "contact_no"]:
                student_query = {"mobile_no": field_value}
            
            existing_student = await DatabaseOperations.find_one("students", student_query)
            
            # Check faculty collection
            faculty_query = {}
            if field_name == "email":
                faculty_query = {"email": field_value_lower}
            elif field_name in ["mobile_no", "contact_no"]:
                faculty_query = {"contact_no": field_value}
            
            existing_faculty = await DatabaseOperations.find_one("faculties", faculty_query)
            
            # If editing profile, exclude current user from validation
            if current_user_id:
                if user_type == "student" and existing_student:
                    # Check if the found student is the current user
                    if (existing_student.get("enrollment_no") == current_user_id or 
                        str(existing_student.get("_id")) == current_user_id):
                        existing_student = None
                elif user_type == "faculty" and existing_faculty:
                    # Check if the found faculty is the current user
                    if (existing_faculty.get("employee_id") == current_user_id or 
                        str(existing_faculty.get("_id")) == current_user_id):
                        existing_faculty = None
            
            # Return appropriate error message
            if existing_student:
                field_display = field_name.replace("_", " ").title()
                return {
                    "success": True,
                    "available": False,
                    "message": f"This {field_display} is already registered with a student account"
                }
            
            if existing_faculty:
                field_display = field_name.replace("_", " ").title()
                return {
                    "success": True,
                    "available": False,
                    "message": f"This {field_display} is already registered with a faculty account"
                }
        
        # For enrollment_no, only check students collection
        elif user_type == "student" and field_name == "enrollment_no":
            query = {"enrollment_no": field_value.upper()}
            existing_student = await DatabaseOperations.find_one("students", query)
            
            # If editing profile, exclude current user
            if current_user_id and existing_student:
                if (existing_student.get("enrollment_no") == current_user_id or 
                    str(existing_student.get("_id")) == current_user_id):
                    existing_student = None
            
            if existing_student:
                return {
                    "success": True,
                    "available": False,
                    "message": "This Enrollment No is already registered"
                }
        
        # For employee_id, only check faculty collection
        elif user_type == "faculty" and field_name == "employee_id":
            query = {"employee_id": field_value.upper()}
            existing_faculty = await DatabaseOperations.find_one("faculties", query)
            
            # If editing profile, exclude current user
            if current_user_id and existing_faculty:
                if (existing_faculty.get("employee_id") == current_user_id or 
                    str(existing_faculty.get("_id")) == current_user_id):
                    existing_faculty = None
            
            if existing_faculty:
                return {
                    "success": True,
                    "available": False,
                    "message": "This Employee ID is already registered"
                }
        
        return {"success": True, "available": True, "message": "Available"}
        
    except Exception as e:
        logger.error(f"Error in field validation API: {str(e)}")
        return {"success": False, "available": True, "message": "Validation check failed"}

# Faculty Authentication Functions
async def authenticate_faculty(employee_id: str, password: str):
    """Authenticate faculty using employee ID and password"""
    try:
        faculty = await DatabaseOperations.find_one(
            "faculties", 
            {
                "employee_id": employee_id,
                "is_active": True
            }
        )
        
        if faculty and pwd_context.verify(password, faculty.get("password", "")):
            # Convert to Faculty model - normalize gender case
            from models.faculty import Faculty
            # Normalize gender to lowercase for enum validation
            if 'gender' in faculty and faculty['gender']:
                faculty['gender'] = faculty['gender'].lower()
            
            faculty_obj = Faculty(**faculty)
            logger.info(f"✅ Faculty authenticated: {faculty_obj.full_name} (employee_id: {faculty_obj.employee_id})")
            return faculty_obj
        
        logger.warning(f"❌ Faculty authentication failed for employee_id: {employee_id}")
        return None
    except Exception as e:
        logger.error(f"Error authenticating faculty: {str(e)}")
        return None

# Include password reset routes and unified status routes
router.include_router(password_reset_router)
router.include_router(status_router)
