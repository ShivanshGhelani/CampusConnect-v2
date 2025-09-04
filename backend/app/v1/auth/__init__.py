"""
Streamlined Authentication API Routes
Phase 3B+ Consolidated Authentication System

CONSOLIDATION SUMMARY:
- Phase 3A: Team Management (175→164 endpoints, -11 reduction) ✅
- Phase 3B: Login Redirects (167→158 endpoints, -9 reduction) ✅  
- Phase 3B+: Auth API Consolidation (161→155 endpoints, -6 reduction) ✅

ENDPOINTS CONSOLIDATED:
Old Separate Endpoints (REMOVED):
- /admin/login, /login (GET redirects)
- /api/auth/login, /api/auth/logout (legacy redirects)  
- /api/v1/auth/admin/login, /api/v1/auth/admin/logout (POST APIs)
- /api/v1/auth/student/login, /api/v1/auth/student/logout (POST APIs)
- /api/v1/auth/faculty/login, /api/v1/auth/faculty/logout (POST APIs)

New Unified Endpoints (ACTIVE):
- /api/v1/auth/login (POST - unified with user_type parameter)
- /api/v1/auth/logout (POST - auto-detects user type)
- /api/v1/auth/redirect/login (GET - unified redirect with query params)
- /api/v1/auth/redirect/logout (GET - unified redirect with query params)
- /api/v1/auth/info (GET - system information)
"""

from fastapi import APIRouter, Request, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import logging
import re
from datetime import datetime
from database.operations import DatabaseOperations

# Import essential routers
from .password_reset import router as password_reset_router
from .status import router as status_router  
from .redirects import router as redirects_router
from .auth import router as unified_auth_router

router = APIRouter()
logger = logging.getLogger(__name__)

# Essential Pydantic models for registration (kept from original)
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

# Essential utility functions
from models.student import Student
from models.faculty import Faculty
from utils.token_manager import token_manager
from middleware.auth_middleware import AuthMiddleware
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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

# Include all consolidated routers
router.include_router(password_reset_router)      # Password reset functionality
router.include_router(status_router)              # Auth status endpoints  
router.include_router(redirects_router)         # Redirect endpoints
router.include_router(unified_auth_router)        # Unified login/logout endpoints
