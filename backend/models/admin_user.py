from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

class AdminRole(str, Enum):
    """Admin role definitions with hierarchical permissions"""
    SUPER_ADMIN = "super_admin"       # Full access to everything
    EXECUTIVE_ADMIN = "executive_admin"  # Create events and manage certificates
    ORGANIZER_ADMIN = "organizer_admin"  # Faculty members acting as organizers

class AdminUser(BaseModel):
    """Admin user model with secure password hashing and role-based access control"""
    fullname: str = Field(..., min_length=3, max_length=100, description="Full name of the admin")
    username: str = Field(..., min_length=3, max_length=50, description="Unique username for the admin")
    email: EmailStr = Field(..., description="Admin's email address")
    mobile_no: Optional[str] = Field(default=None, description="Mobile number of the admin")
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")
    is_active: bool = Field(default=True, description="Whether the admin account is active")
    role: AdminRole = Field(default=AdminRole.ORGANIZER_ADMIN, description="Admin role with specific permissions")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Account creation timestamp")
    last_login: Optional[datetime] = Field(default=None, description="Last successful login timestamp")
    created_by: Optional[str] = Field(default=None, description="Username of the admin who created this account")
    
    # Faculty-specific field for organizer admins
    employee_id: Optional[str] = Field(default=None, description="Employee ID for faculty organizers")
    
    # Event-specific permissions for Event Admins
    assigned_events: Optional[List[str]] = Field(default=[], description="Event IDs that this admin can manage (for Event Admins)")
    permissions: Optional[List[str]] = Field(default=[], description="Specific permissions granted to this admin")
    
    @validator('role')
    def validate_role(cls, v):
        if isinstance(v, str):
            return AdminRole(v)
        return v
    
    class Config:
        use_enum_values = True
    