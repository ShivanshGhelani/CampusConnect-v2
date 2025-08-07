from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class Contact(BaseModel):
    name: str
    contact: str  # email or phone

class EventStatus(BaseModel):
    category: str = Field(
        ..., 
        description="Event category: upcoming, ongoing, or completed"
    )  # upcoming, ongoing, completed
    sub_status: str = Field(
        ..., 
        description="Detailed status: registration_open, registration_close, event_started, event_ended, certificates_available, completed"
    )
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_schema_extra = {
            "example": {
                "category": "upcoming",
                "sub_status": "registration_open",
                "updated_at": "2025-01-01T00:00:00"
            }
        }

class EventForm(BaseModel):
    # Step 1: Basic Event Information
    event_id: str  # No spaces allowed, used for database and folder names
    event_name: str
    event_type: str
    short_description: str
    detailed_description: str

    # Step 2: Faculty Organizers & Contact Info
    organizing_department: str
    faculty_organizers: List[str]  # List of faculty employee IDs
    contacts: List[Contact]

    # Step 3: Date & Time
    registration_start_date: datetime
    registration_end_date: datetime
    start_datetime: datetime
    end_datetime: datetime
    certificate_end_date: datetime  # Certificate distribution deadline    # Step 4: Event Mode & Location
    mode: str  # Online, Offline, Hybrid
    venue: str  # Room number or meeting link

    # Step 5: Target Outcomes / Goals
    target_outcomes: Optional[str] = None  # Learning objectives and measurable goals

    # Step 6: Prerequisites & What to Bring (Optional)
    prerequisites: Optional[str] = None  # Prerequisites for the event
    what_to_bring: Optional[str] = None  # What participants should bring    # Step 7: Registration Type & Fee Structure
    registration_type: str  # Free, Paid, Sponsored
    registration_mode: str  # Individual, Team
    registration_fee: Optional[float] = 0.0  # Fee amount (if paid)
    fee_description: Optional[str] = None  # Additional fee details
    max_participants: Optional[int] = None  # Maximum number of participants
    min_participants: Optional[int] = 1  # Minimum number of participants
    team_size_min: Optional[int] = None  # Minimum team size (if team-based)
    team_size_max: Optional[int] = None  # Maximum team size (if team-based)    # Step 8: Certificate Template
    certificate_template: Optional[str] = None  # Path to the template file
    template_assets: Optional[List[str]] = []  # Paths to asset files

    # Step 9: Review & Submit (handled in frontend)
    
    # Step 10: Event Status
    status: EventStatus = Field(default_factory=lambda: EventStatus(
        category="upcoming",
        sub_status="registration_open"
    ))

class EventFormResponse(EventForm):
    id: str = Field(..., alias="_id")

    class Config:
        populate_by_name = True  # For Pydantic v2 compatibility
