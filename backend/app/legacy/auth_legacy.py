"""
Legacy Authentication Routes
Contains the original auth functionality from routes/auth.py
This will be integrated with the existing api/v1/auth module
"""
from fastapi import APIRouter, Request, HTTPException, status
from fastapi.templating import Jinja2Templates
from fastapi.responses import RedirectResponse
from models.admin_user import AdminUser, AdminRole
from datetime import datetime
from database.operations import DatabaseOperations
from passlib.context import CryptContext
from typing import Union
import logging

router = APIRouter(prefix="/auth-legacy", tags=["legacy-auth-api"])
templates = Jinja2Templates(directory="templates")
logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

async def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

async def authenticate_admin(username: str, password: str) -> Union[AdminUser, None]:
    """Authenticate admin using username and password"""
    
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
            "created_at": faculty.get("created_at", datetime.utcnow()),
            "last_login": datetime.utcnow()
        }
        logger.info(f"Faculty organizer authenticated: {username} with {len(assigned_events)} assigned events")
        return AdminUser(**admin_data)
    
    logger.warning(f"Authentication failed for username: {username}")
    return None

async def get_current_admin(request: Request) -> AdminUser:
    """Get current authenticated admin from session"""
    admin_data = request.session.get('admin')  # Changed from 'admin_user' to 'admin'
    if not admin_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    try:
        return AdminUser(**admin_data)
    except Exception as e:
        logger.error(f"Error creating AdminUser from session data: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session data"
        )

# REST OF THE AUTH ROUTES FROM THE ORIGINAL FILE WOULD GO HERE
# This is a placeholder - you would need to copy the rest of the routes/auth.py content here
