from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field, field_validator
from core.logger import get_logger

logger = get_logger(__name__)

class EventMainStatus(Enum):
    """Main event status categories"""
    DRAFT = "draft"
    UPCOMING = "upcoming"
    ONGOING = "ongoing"
    COMPLETED = "completed"
    PENDING_APPROVAL = "pending_approval"  # New status for approval workflow

class EventSubStatus(Enum):
    """Detailed event sub-status for registration and event lifecycle"""
    REGISTRATION_NOT_STARTED = "registration_not_started"
    REGISTRATION_OPEN = "registration_open"
    REGISTRATION_CLOSED = "registration_closed"
    EVENT_STARTED = "event_started"
    EVENT_ENDED = "event_ended"
    CERTIFICATE_AVAILABLE = "certificate_available"
    EVENT_COMPLETED = "event_completed"
    PENDING_APPROVAL = "pending_approval"  # New sub-status for approval workflow

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

class EventContact(BaseModel):
    """Event contact information"""
    name: str = Field(..., description="Contact person name")
    contact: str = Field(..., description="Contact number or email")

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
    mode: str
    status: str = "upcoming"  # Values: "upcoming", "ongoing", "completed"
    sub_status: Optional[str] = "registration_not_started"  # Detailed status
    
    # New fields for event targeting and categorization
    target_audience: str = Field(..., description="Target audience: student, faculty, or both")
    is_xenesis_event: bool = Field(default=False, description="Whether this is a Xenesis event")
    
    # Additional event details
    faculty_organizers: List[str] = Field(default=[], description="List of faculty employee IDs who are organizers")
    contacts: List[EventContact] = Field(default=[], description="Contact information")
    
    # Approval workflow fields
    approval_required: bool = Field(default=True, description="Whether event requires approval")
    event_created_by: Optional[str] = Field(default=None, description="Who created the event (for Executive Admin sessions)")
    approved_by: Optional[str] = Field(default=None, description="Who approved the event")
    approved_at: Optional[datetime] = Field(default=None, description="When the event was approved")
    declined_by: Optional[str] = Field(default=None, description="Who declined the event")
    declined_at: Optional[datetime] = Field(default=None, description="When the event was declined")
    decline_reason: Optional[str] = Field(default=None, description="Reason for declining the event")
    
    # Registration settings extended
    registration_mode: str = Field(default="individual", description="individual or team")
    team_size_min: Optional[int] = Field(default=None, description="Minimum team size for team events")
    team_size_max: Optional[int] = Field(default=None, description="Maximum team size for team events")
    allow_multiple_team_registrations: bool = Field(default=False, description="Allow multiple team registrations per student")
    max_participants: Optional[int] = Field(default=None, description="Maximum number of participants")
    min_participants: int = Field(default=1, description="Minimum number of participants")
    fee_description: Optional[str] = Field(default=None, description="Description of what the fee includes")
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
    
    # Simplified registration tracking - just statistics
    registration_stats: Dict[str, Any] = Field(default={}, description="""
    Simplified registration statistics:
    {
        "individual_count": 150,
        "team_count": 25,
        "total_participants": 250,
        "attendance_marked": 180,
        "feedback_submitted": 160,
        "certificates_issued": 140,
        "last_updated": "2025-08-13T10:30:00Z"
    }
    All detailed tracking moved to student_event_participations collection
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
    
    # SIMPLIFIED HELPER METHODS (Updated for new architecture)
    
    def get_registration_stats(self) -> Dict[str, int]:
        """Get registration statistics from simplified structure"""
        return self.registration_stats
    
    def update_registration_stats(self, stats_update: Dict[str, Any]) -> None:
        """Update registration statistics"""
        if not self.registration_stats:
            self.registration_stats = {
                "individual_count": 0,
                "team_count": 0,
                "total_participants": 0,
                "attendance_marked": 0,
                "feedback_submitted": 0,
                "certificates_issued": 0,
                "last_updated": datetime.utcnow()
            }
        
        self.registration_stats.update(stats_update)
        self.registration_stats["last_updated"] = datetime.utcnow()
    
    def get_participant_count(self) -> int:
        """Get total participant count"""
        return self.registration_stats.get("total_participants", 0)
    
    def is_registration_full(self) -> bool:
        """Check if event registration is full"""
        if not self.max_participants:
            return False
        return self.get_participant_count() >= self.max_participants
    
    # DEPRECATED METHODS (Kept for backward compatibility during migration)
    # These methods will be removed after migration to student_event_participations
    
    def add_individual_registration(self, enrollment_no: str, registration_id: str) -> None:
        """DEPRECATED: Use ParticipationService instead"""
        logger.warning("add_individual_registration is deprecated. Use ParticipationService.create_participation()")
        pass
    
    def add_team_registration(self, team_name: str, enrollment_no: str, registration_id: str, 
                            is_leader: bool = False, **metadata) -> None:
        """DEPRECATED: Use ParticipationService instead"""
        logger.warning("add_team_registration is deprecated. Use ParticipationService.create_participation()")
        pass
    
    def add_attendance(self, enrollment_no: str, attendance_id: str, team_name: str = None) -> None:
        """DEPRECATED: Use ParticipationService instead"""
        logger.warning("add_attendance is deprecated. Use ParticipationService.mark_attendance()")
        pass
    
    def add_feedback(self, enrollment_no: str, feedback_id: str, team_name: str = None) -> None:
        """DEPRECATED: Use ParticipationService instead"""
        logger.warning("add_feedback is deprecated. Use ParticipationService instead")
        pass
    
    def add_certificate(self, enrollment_no: str, certificate_id: str, team_name: str = None) -> None:
        """DEPRECATED: Use ParticipationService instead"""
        logger.warning("add_certificate is deprecated. Use ParticipationService instead")
        pass
    
    def get_student_registration_id(self, enrollment_no: str) -> str:
        """DEPRECATED: Use ParticipationService.get_participation() instead"""
        logger.warning("get_student_registration_id is deprecated. Use ParticipationService.get_participation()")
        return None
    
    def get_student_attendance_ids(self, enrollment_no: str) -> List[str]:
        """DEPRECATED: Use ParticipationService.get_participation() instead"""
        logger.warning("get_student_attendance_ids is deprecated. Use ParticipationService.get_participation()")
        return []
    
    def is_student_registered(self, enrollment_no: str) -> bool:
        """DEPRECATED: Use ParticipationService.get_participation() instead"""
        logger.warning("is_student_registered is deprecated. Use ParticipationService.get_participation()")
        return False
    
    def update_status(self, current_time: datetime = None) -> None:
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
        """Get list of available forms for this event"""
        forms = []
        current_time = datetime.now()
        
        # Registration form
        if (self.registration_start_date and self.registration_end_date and 
            self.registration_start_date <= current_time <= self.registration_end_date):
            forms.append("registration")
        
        # Feedback form (available after event ends)
        if current_time >= self.end_datetime:
            forms.append("feedback")
        
        # Certificate form (if certificates are available)
        if (current_time >= self.end_datetime and 
            (not self.certificate_end_date or current_time <= self.certificate_end_date)):
            forms.append("certificate")
        
        return forms

class CreateEvent(BaseModel):
    """Model for creating a new event"""
    event_id: str = Field(..., description="Unique event identifier")
    event_name: str = Field(..., description="Event title")
    event_type: str = Field(..., description="Type of event")
    organizing_department: str = Field(..., description="Organizing department/club")
    short_description: str = Field(..., description="Brief description")
    detailed_description: str = Field(..., description="Detailed description")
    
    # Date and time fields
    start_date: str = Field(..., description="Event start date (YYYY-MM-DD)")
    start_time: str = Field(..., description="Event start time (HH:MM)")
    end_date: str = Field(..., description="Event end date (YYYY-MM-DD)")
    end_time: str = Field(..., description="Event end time (HH:MM)")
    registration_start_date: str = Field(..., description="Registration start date")
    registration_start_time: str = Field(..., description="Registration start time")
    registration_end_date: str = Field(..., description="Registration end date")
    registration_end_time: str = Field(..., description="Registration end time")
    certificate_end_date: str = Field(..., description="Certificate availability end date")
    certificate_end_time: str = Field(..., description="Certificate availability end time")
    
    # Venue and mode
    mode: str = Field(..., description="Event mode: online, offline, hybrid")
    venue: str = Field(..., description="Venue name or platform link")
    venue_id: Optional[str] = Field(default=None, description="Venue ID if selecting existing venue")
    venue_type: Optional[str] = Field(default=None, description="Type of venue: existing or custom")
    
    # New targeting fields
    target_audience: str = Field(..., description="student, faculty, or both")
    is_xenesis_event: bool = Field(default=False, description="Xenesis event flag")
    
    # Contact information
    faculty_organizers: List[str] = Field(..., description="List of faculty employee IDs who are organizers")
    contacts: List[EventContact] = Field(..., description="Contact information objects")
    
    # Registration settings
    registration_type: str = Field(..., description="free, paid, or sponsored")
    registration_fee: Optional[float] = Field(default=None, description="Registration fee")
    fee_description: Optional[str] = Field(default=None, description="Fee description")
    registration_mode: str = Field(..., description="individual or team")
    team_size_min: Optional[int] = Field(default=None, description="Min team size")
    team_size_max: Optional[int] = Field(default=None, description="Max team size")
    allow_multiple_team_registrations: bool = Field(default=False, description="Allow multiple team registrations")
    max_participants: Optional[int] = Field(default=None, description="Max participants")
    min_participants: int = Field(default=1, description="Min participants")
    
    # Approval workflow fields
    approval_required: bool = Field(default=True, description="Whether event requires approval")
    status: str = Field(default="pending_approval", description="Event status")
    event_created_by: Optional[str] = Field(default=None, description="Who created the event (for Executive Admin sessions)")
    event_creator_email: Optional[str] = Field(default=None, description="Email of the event creator (for notifications)")
    
    # Additional optional fields
    # Legacy fields removed: target_outcomes, prerequisites, what_to_bring (Step 5-6 removed from system)
    
    # Attendance configuration fields
    attendance_strategy: Optional[str] = Field(default=None, description="Attendance strategy (single_mark, day_based, session_based, etc.)")
    attendance_criteria: Optional[Dict[str, Any]] = Field(default=None, description="Attendance criteria configuration")
    custom_attendance_config: Optional[Dict[str, Any]] = Field(default=None, description="Custom attendance configuration if user overrides auto-detection")
    
    # Certificate configuration fields
    is_certificate_based: bool = Field(default=False, description="Whether this event issues certificates")
    certificate_templates: Optional[Dict[str, str]] = Field(default=None, description="Certificate template URLs mapped by certificate type")
    event_poster_url: Optional[str] = Field(default=None, description="URL of the uploaded event poster")
    
    # Certificate configuration fields
    is_certificate_based: bool = Field(default=False, description="Whether this event issues certificates")
    certificate_templates: Optional[Dict[str, str]] = Field(default=None, description="Certificate template URLs mapped by certificate type")
    event_poster_url: Optional[str] = Field(default=None, description="URL of the uploaded event poster")

class UpdateEvent(BaseModel):
    """Model for updating an existing event"""
    event_name: Optional[str] = None
    event_type: Optional[str] = None
    organizing_department: Optional[str] = None
    short_description: Optional[str] = None
    detailed_description: Optional[str] = None
    start_date: Optional[str] = None
    start_time: Optional[str] = None
    end_date: Optional[str] = None
    end_time: Optional[str] = None
    registration_start_date: Optional[str] = None
    registration_start_time: Optional[str] = None
    registration_end_date: Optional[str] = None
    registration_end_time: Optional[str] = None
    certificate_end_date: Optional[str] = None
    certificate_end_time: Optional[str] = None
    mode: Optional[str] = None
    venue: Optional[str] = None
    target_audience: Optional[str] = None
    is_xenesis_event: Optional[bool] = None
    faculty_organizers: Optional[List[str]] = None
    contacts: Optional[List[Dict[str, str]]] = None
    registration_type: Optional[str] = None
    registration_fee: Optional[float] = None
    fee_description: Optional[str] = None
    registration_mode: Optional[str] = None
    team_size_min: Optional[int] = None
    team_size_max: Optional[int] = None
    max_participants: Optional[int] = None
    min_participants: Optional[int] = None

class EventResponse(BaseModel):
    """Response model for event data"""
    event_id: str
    event_name: str
    event_type: str
    organizing_department: str
    short_description: str
    detailed_description: Optional[str] = None
    start_datetime: datetime
    end_datetime: datetime
    venue: str
    mode: str
    status: str
    sub_status: Optional[str] = None
    target_audience: str
    is_xenesis_event: bool
    faculty_organizers: List[str] = []
    contacts: List[Dict[str, str]] = []
    registration_mode: str = "individual"
    team_size_min: Optional[int] = None
    team_size_max: Optional[int] = None
    max_participants: Optional[int] = None
    min_participants: int = 1
    fee_description: Optional[str] = None
    registration_start_date: Optional[datetime] = None
    registration_end_date: Optional[datetime] = None
    certificate_end_date: Optional[datetime] = None
    is_paid: bool = False
    is_team_based: bool = False
    registration_fee: Optional[float] = None
