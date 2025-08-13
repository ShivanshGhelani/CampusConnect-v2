"""
Student Event Participation Models
==================================
New unified models for managing student-event relationships following the simplified architecture plan.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field

class ParticipationStage(Enum):
    """Student participation lifecycle stages"""
    REGISTERED = "registered"
    ATTENDING = "attending"
    FEEDBACK_PENDING = "feedback_pending"
    CERTIFICATE_ELIGIBLE = "certificate_eligible"
    COMPLETED = "completed"

class RegistrationType(Enum):
    """Registration type enumeration"""
    INDIVIDUAL = "individual"
    TEAM_LEADER = "team_leader"
    TEAM_MEMBER = "team_member"

class RegistrationStatus(Enum):
    """Registration status enumeration"""
    ACTIVE = "active"
    CANCELLED = "cancelled"
    COMPLETED = "completed"

class PaymentStatus(Enum):
    """Payment status enumeration"""
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    NOT_REQUIRED = "not_required"

class StudentInfo(BaseModel):
    """Student reference information"""
    enrollment_no: str
    full_name: str
    email: str
    department: str
    semester: int

class EventInfo(BaseModel):
    """Event reference information"""
    event_id: str
    event_name: str
    event_type: str
    organizing_department: str
    start_datetime: datetime
    end_datetime: datetime
    is_certificate_based: bool

class RegistrationDetails(BaseModel):
    """Registration details"""
    registration_id: str
    type: RegistrationType
    registered_at: datetime = Field(default_factory=datetime.utcnow)
    status: RegistrationStatus = RegistrationStatus.ACTIVE
    payment_status: PaymentStatus = PaymentStatus.NOT_REQUIRED
    payment_id: Optional[str] = None

class TeamInfo(BaseModel):
    """Team information for team events"""
    team_name: str
    team_id: str
    is_leader: bool
    team_size: int
    leader_enrollment: str

class AttendanceSession(BaseModel):
    """Individual attendance session"""
    session_id: str
    session_name: str
    marked: bool = False
    marked_at: Optional[datetime] = None
    marked_by: Optional[str] = None
    attendance_id: Optional[str] = None

class AttendanceTracking(BaseModel):
    """Attendance tracking information"""
    strategy: str  # session_based, day_based, single_mark
    sessions: List[AttendanceSession] = []
    total_percentage: float = 0.0
    is_eligible: bool = False
    attendance_summary: Dict[str, Any] = {}

class FeedbackManagement(BaseModel):
    """Feedback management information"""
    form_published: bool = False
    submitted: bool = False
    feedback_id: Optional[str] = None
    submitted_at: Optional[datetime] = None
    rating: Optional[float] = None
    auto_publish_at: Optional[datetime] = None

class CertificateEligibilityCriteria(BaseModel):
    """Certificate eligibility criteria"""
    attendance_required: float = 75.0
    feedback_required: bool = True
    custom_criteria: List[str] = []

class CertificateManagement(BaseModel):
    """Certificate management information"""
    eligible: bool = False
    eligibility_checked: bool = False
    eligibility_criteria: CertificateEligibilityCriteria = Field(default_factory=CertificateEligibilityCriteria)
    issued: bool = False
    certificate_id: Optional[str] = None
    certificate_type: Optional[str] = None
    issued_at: Optional[datetime] = None
    download_count: int = 0

class LifecycleTracking(BaseModel):
    """Lifecycle tracking information"""
    current_stage: ParticipationStage = ParticipationStage.REGISTERED
    stages_completed: List[str] = ["registration"]
    next_action: str = "mark_attendance"
    completion_percentage: float = 20.0  # 20% for registration completed

class StudentEventParticipation(BaseModel):
    """
    Unified student event participation model
    One document per student-event relationship
    """
    class Config:
        populate_by_name = True
        
    # Primary identifiers
    id: str = Field(..., alias="_id", description="enrollment_no + event_id")
    participation_id: str = Field(..., description="Unique participation ID")
    
    # Reference information
    student: StudentInfo
    event: EventInfo
    
    # Participation details
    registration: RegistrationDetails
    team: Optional[TeamInfo] = None
    attendance: AttendanceTracking = Field(default_factory=AttendanceTracking)
    feedback: FeedbackManagement = Field(default_factory=FeedbackManagement)
    certificate: CertificateManagement = Field(default_factory=CertificateManagement)
    lifecycle: LifecycleTracking = Field(default_factory=LifecycleTracking)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class CreateParticipation(BaseModel):
    """Model for creating a new participation"""
    enrollment_no: str
    event_id: str
    registration_type: RegistrationType = RegistrationType.INDIVIDUAL
    team_name: Optional[str] = None
    team_id: Optional[str] = None
    is_team_leader: bool = False

class ParticipationResponse(BaseModel):
    """Response model for participation data"""
    participation_id: str
    student: StudentInfo
    event: EventInfo
    registration: RegistrationDetails
    team: Optional[TeamInfo] = None
    attendance: AttendanceTracking
    feedback: FeedbackManagement
    certificate: CertificateManagement
    lifecycle: LifecycleTracking
    created_at: datetime
    updated_at: datetime

class ParticipationStats(BaseModel):
    """Statistics for event participations"""
    total_participants: int = 0
    individual_registrations: int = 0
    team_registrations: int = 0
    attendance_marked: int = 0
    feedback_submitted: int = 0
    certificates_issued: int = 0
    
    # Stage breakdown
    registered: int = 0
    attending: int = 0
    feedback_pending: int = 0
    certificate_eligible: int = 0
    completed: int = 0

class SimplifiedEventStats(BaseModel):
    """Simplified event statistics for the events collection"""
    individual_count: int = 0
    team_count: int = 0
    total_participants: int = 0
    attendance_marked: int = 0
    feedback_submitted: int = 0
    certificates_issued: int = 0
    last_updated: datetime = Field(default_factory=datetime.utcnow)
