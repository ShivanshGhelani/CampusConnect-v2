"""
Faculty Model
Handles faculty data structure and database operations
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, EmailStr, validator
from bson import ObjectId
from enum import Enum

class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"

class Faculty(BaseModel):
    """Faculty model for database operations"""
    employee_id: str = Field(..., description="Unique alphanumeric employee ID")
    full_name: str = Field(..., min_length=2, max_length=100)
    department: str = Field(..., description="Faculty department")
    designation: Optional[str] = Field(None, description="Faculty designation (e.g., Professor, Associate Professor)")
    qualification: Optional[str] = Field(None, description="Faculty highest qualification")
    specialization: Optional[str] = Field(None, description="Faculty area of specialization")
    experience_years: Optional[int] = Field(None, ge=0, description="Years of experience")
    password: str = Field(..., description="Hashed password")
    email: EmailStr = Field(..., description="Faculty email address")
    contact_no: str = Field(..., description="Faculty contact number")
    seating: Optional[str] = Field(None, description="Faculty seating arrangement/room")
    gender: Optional[Gender] = Field(None, description="Faculty gender")
    date_of_birth: Optional[datetime] = Field(None, description="Faculty date of birth")
    date_of_joining: Optional[datetime] = Field(None, description="Faculty joining date")
    is_active: bool = Field(default=True, description="Whether faculty account is active")
    event_participations: List[str] = Field(default_factory=list, description="List of event IDs faculty participated in")
    # Organizer-specific fields
    is_organizer: bool = Field(default=False, description="Whether faculty can act as organizer")
    assigned_events: List[str] = Field(default_factory=list, description="List of event IDs faculty can organize")
    organizer_permissions: List[str] = Field(default_factory=list, description="Specific organizer permissions")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")
    
    @validator('event_participations', pre=True, always=True)
    def validate_event_participations(cls, v):
        """Ensure event_participation is always a list of strings"""
        if v is None:
            return []
        elif isinstance(v, dict):
            # Convert dict format to list format for backward compatibility
            return list(v.keys()) if v else []
        elif isinstance(v, list):
            # If list contains objects, extract event_ids
            result = []
            for item in v:
                if isinstance(item, dict) and 'event_id' in item:
                    result.append(item['event_id'])
                elif isinstance(item, str):
                    result.append(item)
            return result
        else:
            # Fallback: return empty list for any other type
            return []
    
    class Config:
        validate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class FacultyCreate(BaseModel):
    """Model for faculty creation"""
    employee_id: str = Field(..., description="Unique alphanumeric employee ID")
    full_name: str = Field(..., min_length=2, max_length=100)
    department: str = Field(..., description="Faculty department")
    designation: Optional[str] = Field(None, description="Faculty designation (e.g., Professor, Associate Professor)")
    qualification: Optional[str] = Field(None, description="Faculty highest qualification")
    specialization: Optional[str] = Field(None, description="Faculty area of specialization")
    experience_years: Optional[int] = Field(None, ge=0, description="Years of experience")
    password: str = Field(..., min_length=6, description="Faculty password")
    email: EmailStr = Field(..., description="Faculty email address")
    contact_no: str = Field(..., description="Faculty contact number")
    seating: Optional[str] = Field(None, description="Faculty seating arrangement/room")
    gender: Optional[Gender] = Field(None, description="Faculty gender")
    date_of_birth: Optional[str] = Field(None, description="Faculty date of birth (YYYY-MM-DD)")
    date_of_joining: Optional[str] = Field(None, description="Faculty joining date (YYYY-MM-DD)")
    is_active: bool = Field(default=True, description="Whether faculty account is active")
    is_organizer: bool = Field(default=False, description="Whether faculty can act as organizer")

class FacultyUpdate(BaseModel):
    """Model for faculty updates"""
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    department: Optional[str] = Field(None, description="Faculty department")
    designation: Optional[str] = Field(None, description="Faculty designation")
    qualification: Optional[str] = Field(None, description="Faculty highest qualification")
    specialization: Optional[str] = Field(None, description="Faculty area of specialization")
    experience_years: Optional[int] = Field(None, ge=0, description="Years of experience")
    email: Optional[EmailStr] = Field(None, description="Faculty email address")
    contact_no: Optional[str] = Field(None, description="Faculty contact number")
    seating: Optional[str] = Field(None, description="Faculty seating arrangement/room")
    gender: Optional[Gender] = Field(None, description="Faculty gender")
    date_of_birth: Optional[str] = Field(None, description="Faculty date of birth (YYYY-MM-DD)")
    date_of_joining: Optional[str] = Field(None, description="Faculty joining date (YYYY-MM-DD)")
    is_active: Optional[bool] = Field(None, description="Whether faculty account is active")
    is_organizer: Optional[bool] = Field(None, description="Whether faculty can act as organizer")

class FacultyLogin(BaseModel):
    """Model for faculty login"""
    employee_id: str = Field(..., description="Faculty employee ID")
    password: str = Field(..., description="Faculty password")

class FacultyResponse(BaseModel):
    """Model for faculty response"""
    employee_id: str
    full_name: str
    department: str
    designation: Optional[str]
    qualification: Optional[str]
    specialization: Optional[str]
    experience_years: Optional[int]
    email: str
    contact_no: str
    seating: Optional[str]
    gender: str
    date_of_birth: Optional[datetime]
    date_of_joining: Optional[datetime]
    is_active: bool = Field(default=True, description="Whether faculty account is active")
    event_participations: List[str]
    # Organizer-specific fields
    is_organizer: bool
    assigned_events: List[str]
    organizer_permissions: List[str]
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime]
    
    class Config:
        validate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat() if v else None}

class FacultyStats(BaseModel):
    """Model for faculty statistics"""
    total_faculty: int
    by_department: Dict[str, int]
    by_gender: Dict[str, int]
    recent_registrations: int
    active_faculty: int
