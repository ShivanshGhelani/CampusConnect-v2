from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field, field_validator

class EventMainStatus(Enum):
    """Main event status categories"""
    DRAFT = "draft"
    UPCOMING = "upcoming"
    ONGOING = "ongoing"
    COMPLETED = "completed"

class EventSubStatus(Enum):
    """Detailed event sub-status for registration and event lifecycle"""
    REGISTRATION_NOT_STARTED = "registration_not_started"
    REGISTRATION_OPEN = "registration_open"
    REGISTRATION_CLOSED = "registration_closed"
    EVENT_STARTED = "event_started"
    EVENT_ENDED = "event_ended"
    CERTIFICATE_AVAILABLE = "certificate_available"
    EVENT_COMPLETED = "event_completed"

class CustomField(BaseModel):
    name: str
    type: str = "text"
    required: bool = False
    options: Optional[List[str]] = None

class TeamRegistration(BaseModel):
    """Team registration details"""
    team_registration_id: str = Field(..., description="Generated team registration ID")
    team_name: str = Field(..., description="Name of the team")
    team_leader_enrollment: str = Field(..., description="Enrollment number of team leader")
    participants: List[str] = Field(..., description="List of participant enrollment numbers")
    registration_date: datetime = Field(default_factory=datetime.utcnow, description="Date of team registration")

class Event(BaseModel):
    event_id: str
    event_name: str
    event_type: str
    organizing_department: str
    short_description: str
    detailed_description: Optional[str] = None
    start_datetime: datetime
    end_datetime: datetime
    venue: str
    venue_id: Optional[str] = None  # Link to venue management system
    mode: str
    status: str = "upcoming"  # Values: "upcoming", "ongoing", "completed"
    sub_status: Optional[str] = "registration_not_started"  # Detailed status
    published: bool = False
    
    # Registration settings
    registration_start_date: Optional[datetime] = None
    registration_end_date: Optional[datetime] = None
    registration_period: int = 30  # days
    form_status: str = "draft"  # draft or published
    require_verification: bool = False
    allow_edit_after_submit: bool = False
    custom_fields: List[CustomField] = []
    
    # Event configuration
    is_paid: bool = Field(default=False, description="Whether this is a paid event")
    is_team_based: bool = Field(default=False, description="Whether this is a team-based event")
    registration_fee: Optional[float] = Field(default=None, description="Registration fee for paid events")
    
    # Updated registration tracking fields for new data structure
    # For individual events: registration_id -> enrollment_no
    # For team events: team_name -> {member_enrollments: [registrar_ids], payment_id?, payment_status?}
    registrations: Dict[str, str] = Field(default={}, description="Individual registrations: registrar_id -> enrollment_no")
    
    # Team registrations with payment support
    team_registrations: Dict[str, Dict] = Field(default={}, description="""
    Team registrations mapped by team_name:
    {
        "team_name": {
            "member1_enrollment": "registrar_id",
            "member2_enrollment": "registrar_id", 
            ...
            "payment_id": "value",  # for paid events
            "payment_status": "complete/pending"  # for paid events
        }
    }
    """)    # Attendance tracking
    # For individual events: attendance_id -> attendance details
    # For team events: team_name -> {member_enrollments: attendance_ids}
    attendances: Dict[str, Any] = Field(default={}, description="Individual attendances: attendance_id -> attendance details")
    team_attendances: Dict[str, Dict] = Field(default={}, description="""
    Team attendances mapped by team_name:
    {
        "team_name": {
            "member1_enrollment": "attendance_id",
            "member2_enrollment": "attendance_id",
            ...
        }
    }
    """)
    
    @field_validator('attendances')
    @classmethod
    def validate_attendances(cls, v):
        """
        Convert legacy string values to dictionary format
        This handles backward compatibility with old data format
        """
        if not v:
            return {}
            
        result = {}
        for key, value in v.items():
            if isinstance(value, str):
                # Convert legacy format (attendance_id: enrollment_no) to dictionary
                result[key] = {
                    "enrollment_no": value,
                    "marked_at": datetime.now().isoformat(),
                    "status": "present"
                }
            else:
                result[key] = value
                
        return result
    
    # Feedback tracking
    # For individual events: feedback_id -> enrollment_no  
    # For team events: team_name -> {member_enrollments: feedback_ids}
    feedbacks: Dict[str, str] = Field(default={}, description="Individual feedbacks: feedback_id -> enrollment_no")
    team_feedbacks: Dict[str, Dict] = Field(default={}, description="""
    Team feedbacks mapped by team_name:
    {
        "team_name": {
            "member1_enrollment": "feedback_id",
            "member2_enrollment": "feedback_id",
            ...
        }
    }
    """)
    
    # Certificate tracking
    # For individual events: certificate_id -> enrollment_no
    # For team events: team_name -> {member_enrollments: certificate_ids}
    certificates: Dict[str, str] = Field(default={}, description="Individual certificates: certificate_id -> enrollment_no")
    team_certificates: Dict[str, Dict] = Field(default={}, description="""
    Team certificates mapped by team_name:
    {
        "team_name": {
            "member1_enrollment": "certificate_id", 
            "member2_enrollment": "certificate_id",
            ...
        }
    }
    """)
    
    # Certificate settings
    certificate_start_date: Optional[datetime] = None
    certificate_end_date: Optional[datetime] = None
    
    def update_status(self, current_time: Optional[datetime] = None) -> None:
        """Update event status and sub_status based on current time"""
        if current_time is None:
            current_time = datetime.now()
        
        # Update sub_status based on time progression
        if self.registration_start_date and current_time < self.registration_start_date:
            self.sub_status = EventSubStatus.REGISTRATION_NOT_STARTED.value
            self.status = "upcoming"
        elif self.registration_end_date and current_time >= self.registration_start_date and current_time < self.registration_end_date:
            self.sub_status = EventSubStatus.REGISTRATION_OPEN.value
            self.status = "upcoming"
        elif current_time >= self.registration_end_date and current_time < self.start_datetime:
            self.sub_status = EventSubStatus.REGISTRATION_CLOSED.value
            self.status = "upcoming"
        elif current_time >= self.start_datetime and current_time < self.end_datetime:
            self.sub_status = EventSubStatus.EVENT_STARTED.value
            self.status = "ongoing"
        elif current_time >= self.end_datetime:
            if self.certificate_end_date and current_time < self.certificate_end_date:
                self.sub_status = EventSubStatus.CERTIFICATE_AVAILABLE.value
                self.status = "ongoing"
            else:
                self.sub_status = EventSubStatus.EVENT_COMPLETED.value
                self.status = "completed"
    
    def get_available_forms(self) -> List[str]:
        """
        Get list of available forms based on current event status.
        
        Returns:
            List of available form types: ['registration', 'certificate', 'attendance']
        """
        available_forms = []
        
        # Check if registration is available
        if self.sub_status == EventSubStatus.REGISTRATION_OPEN.value:
            available_forms.append("registration")
        
        # Check if certificate form is available
        if self.sub_status == EventSubStatus.CERTIFICATE_AVAILABLE.value:
            available_forms.append("certificate")
        
        # Check if attendance form is available (during event)
        if self.sub_status == EventSubStatus.EVENT_STARTED.value:
            available_forms.append("attendance")
        
        return available_forms
