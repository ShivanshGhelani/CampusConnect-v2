"""
Faculty Model
Handles faculty data structure and database operations
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, EmailStr
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
    password: str = Field(..., description="Hashed password")
    email: EmailStr = Field(..., description="Faculty email address")
    contact_no: str = Field(..., description="Faculty contact number")
    seating: Optional[str] = Field(None, description="Faculty seating arrangement/room")
    gender: Gender = Field(..., description="Faculty gender")
    date_of_birth: Optional[datetime] = Field(None, description="Faculty date of birth")
    event_participation: List[str] = Field(default_factory=list, description="List of event IDs faculty participated in")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class FacultyCreate(BaseModel):
    """Model for faculty creation"""
    employee_id: str = Field(..., description="Unique alphanumeric employee ID")
    full_name: str = Field(..., min_length=2, max_length=100)
    department: str = Field(..., description="Faculty department")
    password: str = Field(..., min_length=6, description="Faculty password")
    email: EmailStr = Field(..., description="Faculty email address")
    contact_no: str = Field(..., description="Faculty contact number")
    seating: Optional[str] = Field(None, description="Faculty seating arrangement/room")
    gender: Gender = Field(..., description="Faculty gender")
    date_of_birth: Optional[str] = Field(None, description="Faculty date of birth (YYYY-MM-DD)")

class FacultyUpdate(BaseModel):
    """Model for faculty updates"""
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    department: Optional[str] = Field(None, description="Faculty department")
    email: Optional[EmailStr] = Field(None, description="Faculty email address")
    contact_no: Optional[str] = Field(None, description="Faculty contact number")
    seating: Optional[str] = Field(None, description="Faculty seating arrangement/room")
    gender: Optional[Gender] = Field(None, description="Faculty gender")
    date_of_birth: Optional[str] = Field(None, description="Faculty date of birth (YYYY-MM-DD)")

class FacultyLogin(BaseModel):
    """Model for faculty login"""
    employee_id: str = Field(..., description="Faculty employee ID")
    password: str = Field(..., description="Faculty password")

class FacultyResponse(BaseModel):
    """Model for faculty response"""
    employee_id: str
    full_name: str
    department: str
    email: str
    contact_no: str
    seating: Optional[str]
    gender: str
    date_of_birth: Optional[datetime]
    event_participation: List[str]
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime]
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat() if v else None}

class FacultyStats(BaseModel):
    """Model for faculty statistics"""
    total_faculty: int
    by_department: Dict[str, int]
    by_gender: Dict[str, int]
    recent_registrations: int
    active_faculty: int
