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
    
    # Updated registration tracking fields for new enrollment_no-based structure
    # INDIVIDUAL EVENTS: enrollment_no -> registration_id (NEW STRUCTURE)
    registrations: Dict[str, str] = Field(default={}, description="""
    Individual registrations mapped by enrollment number:
    {
        "22BEIT30043": "REG12345",
        "22BEIT30044": "REG12346"
    }
    Use enrollment_no to find student data in students collection
    """)
    
    # TEAM EVENTS: team_name -> {enrollment_no: registration_id} (SIMPLIFIED STRUCTURE)
    team_registrations: Dict[str, Dict] = Field(default={}, description="""
    Team registrations mapped by team_name:
    {
        "team_name": {
            "22BEIT30043": "REG12345",  # team leader
            "22BEIT30044": "REG12346",  # team member
            "22BEIT30045": "REG12347",  # team member
            ...
            # Optional metadata
            "payment_id": "PAY123",
            "payment_status": "complete",
            "team_leader": "22BEIT30043"
        }
    }
    Use enrollment_no to find student data in students collection
    """)
    
    # ATTENDANCE TRACKING: enrollment_no -> [attendance_ids] (NEW STRUCTURE)
    attendances: Dict[str, List[str]] = Field(default={}, description="""
    Individual attendances mapped by enrollment number:
    {
        "22BEIT30043": ["ATT12345", "ATT12346"],  # Multiple attendance sessions
        "22BEIT30044": ["ATT12347"]               # Single attendance
    }
    Supports multiple attendance sessions (physical, virtual, day-based)
    Store attendance IDs only when attendance is actually marked
    """)
    
    # TEAM ATTENDANCES: team_name -> {enrollment_no: [attendance_ids]} (NEW STRUCTURE)
    team_attendances: Dict[str, Dict[str, List[str]]] = Field(default={}, description="""
    Team attendances mapped by team_name:
    {
        "team_name": {
            "22BEIT30043": ["ATT12345"],  # team leader attendance
            "22BEIT30044": ["ATT12346"],  # team member attendance
            ...
        }
    }
    """)
    
    # FEEDBACK TRACKING: enrollment_no -> feedback_id (NEW STRUCTURE)
    feedbacks: Dict[str, str] = Field(default={}, description="""
    Individual feedbacks mapped by enrollment number:
    {
        "22BEIT30043": "FEED12345",
        "22BEIT30044": "FEED12346"
    }
    Store feedback ID only when feedback is actually submitted
    """)
    
    # TEAM FEEDBACKS: team_name -> {enrollment_no: feedback_id} (NEW STRUCTURE)
    team_feedbacks: Dict[str, Dict[str, str]] = Field(default={}, description="""
    Team feedbacks mapped by team_name:
    {
        "team_name": {
            "22BEIT30043": "FEED12345",  # team leader feedback
            "22BEIT30044": "FEED12346",  # team member feedback
            ...
        }
    }
    """)
    
    # CERTIFICATE TRACKING: enrollment_no -> certificate_id (NEW STRUCTURE)
    certificates: Dict[str, str] = Field(default={}, description="""
    Individual certificates mapped by enrollment number:
    {
        "22BEIT30043": "CERT12345",
        "22BEIT30044": "CERT12346"
    }
    Store certificate ID only when certificate is actually collected/generated
    """)
    
    # TEAM CERTIFICATES: team_name -> {enrollment_no: certificate_id} (NEW STRUCTURE)
    team_certificates: Dict[str, Dict[str, str]] = Field(default={}, description="""
    Team certificates mapped by team_name:
    {
        "team_name": {
            "22BEIT30043": "CERT12345",  # team leader certificate
            "22BEIT30044": "CERT12346",  # team member certificate
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
    
    # NEW ENROLLMENT-BASED HELPER METHODS
    
    def add_individual_registration(self, enrollment_no: str, registration_id: str) -> None:
        """Add individual registration using enrollment_no as key"""
        self.registrations[enrollment_no] = registration_id
    
    def add_team_registration(self, team_name: str, enrollment_no: str, registration_id: str, 
                            is_leader: bool = False, **metadata) -> None:
        """Add team member registration using enrollment_no as key"""
        if team_name not in self.team_registrations:
            self.team_registrations[team_name] = {}
        
        self.team_registrations[team_name][enrollment_no] = registration_id
        
        # Add metadata like team leader info, payment details
        if is_leader:
            self.team_registrations[team_name]["team_leader"] = enrollment_no
        
        for key, value in metadata.items():
            if not key.startswith("22"):  # Not an enrollment number
                self.team_registrations[team_name][key] = value
    
    def add_attendance(self, enrollment_no: str, attendance_id: str, team_name: str = None) -> None:
        """Add attendance record using enrollment_no as key (store only when marked)"""
        if team_name:
            # Team attendance
            if team_name not in self.team_attendances:
                self.team_attendances[team_name] = {}
            if enrollment_no not in self.team_attendances[team_name]:
                self.team_attendances[team_name][enrollment_no] = []
            self.team_attendances[team_name][enrollment_no].append(attendance_id)
        else:
            # Individual attendance
            if enrollment_no not in self.attendances:
                self.attendances[enrollment_no] = []
            self.attendances[enrollment_no].append(attendance_id)
    
    def add_feedback(self, enrollment_no: str, feedback_id: str, team_name: str = None) -> None:
        """Add feedback record using enrollment_no as key (store only when submitted)"""
        if team_name:
            # Team feedback
            if team_name not in self.team_feedbacks:
                self.team_feedbacks[team_name] = {}
            self.team_feedbacks[team_name][enrollment_no] = feedback_id
        else:
            # Individual feedback
            self.feedbacks[enrollment_no] = feedback_id
    
    def add_certificate(self, enrollment_no: str, certificate_id: str, team_name: str = None) -> None:
        """Add certificate record using enrollment_no as key (store only when collected)"""
        if team_name:
            # Team certificate
            if team_name not in self.team_certificates:
                self.team_certificates[team_name] = {}
            self.team_certificates[team_name][enrollment_no] = certificate_id
        else:
            # Individual certificate
            self.certificates[enrollment_no] = certificate_id
    
    def get_student_registration_id(self, enrollment_no: str) -> str:
        """Get registration ID for a student (individual or team)"""
        # Check individual registrations first
        if enrollment_no in self.registrations:
            return self.registrations[enrollment_no]
        
        # Check team registrations
        for team_name, team_data in self.team_registrations.items():
            if enrollment_no in team_data and isinstance(team_data[enrollment_no], str):
                return team_data[enrollment_no]
        
        return None
    
    def get_student_attendance_ids(self, enrollment_no: str) -> List[str]:
        """Get all attendance IDs for a student (individual or team)"""
        attendance_ids = []
        
        # Check individual attendances
        if enrollment_no in self.attendances:
            attendance_ids.extend(self.attendances[enrollment_no])
        
        # Check team attendances
        for team_name, team_data in self.team_attendances.items():
            if enrollment_no in team_data:
                attendance_ids.extend(team_data[enrollment_no])
        
        return attendance_ids
    
    def is_student_registered(self, enrollment_no: str) -> bool:
        """Check if student is registered for this event"""
        return self.get_student_registration_id(enrollment_no) is not None
    
    def get_registration_stats(self) -> Dict[str, int]:
        """Get registration statistics following new structure"""
        individual_count = len(self.registrations)
        team_count = 0
        team_members_count = 0
        
        for team_name, team_data in self.team_registrations.items():
            team_count += 1
            # Count only enrollment numbers (not metadata fields)
            members = [k for k in team_data.keys() if k.startswith("22")]
            team_members_count += len(members)
        
        return {
            "individual_registrations": individual_count,
            "team_count": team_count,
            "team_members": team_members_count,
            "total_participants": individual_count + team_members_count
        }
    
    def get_available_forms(self) -> List[str]:
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
    target_outcomes: Optional[str] = Field(default=None, description="Target outcomes for the event")
    prerequisites: Optional[str] = Field(default=None, description="Prerequisites for participation")
    what_to_bring: Optional[str] = Field(default=None, description="What participants should bring")

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
