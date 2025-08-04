from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field

class Organizer(BaseModel):
    """Event organizer model for database storage"""
    id: Optional[str] = Field(default=None, description="Organizer ID (auto-generated)")
    name: str = Field(..., description="Organizer full name")
    email: str = Field(..., description="Organizer email address")
    employee_id: str = Field(..., description="Employee/Faculty ID")
    department: Optional[str] = Field(default=None, description="Department/Faculty")
    phone: Optional[str] = Field(default=None, description="Phone number")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")
    is_active: bool = Field(default=True, description="Whether organizer is active")

class CreateOrganizer(BaseModel):
    """Model for creating a new organizer"""
    name: str = Field(..., description="Organizer full name")
    email: str = Field(..., description="Organizer email address")
    employee_id: str = Field(..., description="Employee/Faculty ID")
    department: Optional[str] = Field(default=None, description="Department/Faculty")
    phone: Optional[str] = Field(default=None, description="Phone number")

class UpdateOrganizer(BaseModel):
    """Model for updating an existing organizer"""
    name: Optional[str] = None
    email: Optional[str] = None
    employee_id: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None

class OrganizerResponse(BaseModel):
    """Response model for organizer data"""
    id: str
    name: str
    email: str
    employee_id: str
    department: Optional[str] = None
    phone: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    is_active: bool
