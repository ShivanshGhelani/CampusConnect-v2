"""
Faculty Registration Models
==========================
Faculty-specific registration models mirroring student registration structure
but with faculty-specific fields (employee_id, designation, no semester/date_of_birth)
"""

from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum

class RegistrationStatus(Enum):
    """Simple registration status"""
    ACTIVE = "active"
    CANCELLED = "cancelled"
    COMPLETED = "completed"

class AttendanceStatus(Enum):
    """Simple attendance status"""
    NOT_MARKED = "not_marked"
    PRESENT = "present"
    ABSENT = "absent"

class CertificateStatus(Enum):
    """Simple certificate status"""
    NOT_ELIGIBLE = "not_eligible"
    ELIGIBLE = "eligible"
    GENERATED = "generated"
    COLLECTED = "collected"

class FacultyInfo(BaseModel):
    """Faculty information for registration (mirrors StudentInfo)"""
    employee_id: str
    name: str
    email: str
    contact_no: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None  # Faculty-specific field

class EventInfo(BaseModel):
    """Event information (same as student registration)"""
    event_id: str
    title: str
    event_type: str
    start_date: datetime

class RegistrationDetails(BaseModel):
    """Registration details (same as student registration)"""
    registration_id: str
    registered_at: datetime
    status: RegistrationStatus = RegistrationStatus.ACTIVE
    registration_type: str = "individual"  # individual or team

class TeamInfo(BaseModel):
    """Team information for faculty teams (same structure as student teams)"""
    team_name: Optional[str] = None
    team_leader: Optional[str] = None  # employee_id instead of enrollment_no
    team_members: Optional[List[str]] = None  # List of employee_ids
    team_size: Optional[int] = None

class AttendanceSessionInfo(BaseModel):
    """Individual attendance session information (same as student)"""
    session_id: str
    session_name: str
    session_type: str  # session/day/milestone/continuous_check/single
    marked: bool = False
    marked_at: Optional[datetime] = None
    marking_method: Optional[str] = None  # attendance_portal/bulk_marking/qr_code
    marked_by: Optional[str] = None  # Username/ID of who marked attendance
    marked_by_role: Optional[str] = None  # organizer/volunteer/admin
    weight: float = 1.0
    notes: Optional[str] = None

class AttendanceInfo(BaseModel):
    """Unified attendance information for all strategies (same as student)"""
    # Core attendance fields
    marked: bool = False
    status: AttendanceStatus = AttendanceStatus.NOT_MARKED
    attendance_percentage: float = 0.0
    strategy_used: Optional[str] = None  # single_mark/day_based/session_based/milestone_based/continuous
    
    # Session-based tracking (works for ALL strategies)
    sessions: List[AttendanceSessionInfo] = []
    
    # Calculated summary fields
    total_sessions: int = 1
    sessions_attended: int = 0
    last_marked_at: Optional[datetime] = None
    last_calculated_at: Optional[datetime] = None

class FeedbackInfo(BaseModel):
    """Feedback information (same as student)"""
    submitted: bool = False
    submitted_at: Optional[datetime] = None
    rating: Optional[int] = None
    comments: Optional[str] = None

class CertificateInfo(BaseModel):
    """Certificate information (same as student)"""
    eligible: bool = False
    issued: bool = False
    issued_at: Optional[datetime] = None
    certificate_id: Optional[str] = None
    status: CertificateStatus = CertificateStatus.NOT_ELIGIBLE

class FacultyRegistration(BaseModel):
    """Main faculty registration document - mirrors StudentRegistration"""
    id: Optional[str] = Field(default=None, alias="_id")
    faculty: FacultyInfo  # Changed from 'student' to 'faculty'
    event: EventInfo
    registration: RegistrationDetails
    team: Optional[TeamInfo] = None
    attendance: AttendanceInfo = Field(default_factory=AttendanceInfo)
    feedback: FeedbackInfo = Field(default_factory=FeedbackInfo)
    certificate: CertificateInfo = Field(default_factory=CertificateInfo)
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True  # Allow both 'id' and '_id'

class CreateFacultyRegistrationRequest(BaseModel):
    """Request model for creating faculty registration"""
    event_id: str
    registration_type: str = "individual"
    team_info: Optional[Dict[str, Any]] = None
    additional_data: Optional[Dict[str, Any]] = None

class FacultyRegistrationResponse(BaseModel):
    """Response model for faculty registration operations"""
    success: bool
    message: str
    registration_id: Optional[str] = None
    data: Optional[Dict[str, Any]] = None

class FacultyRegistrationStats(BaseModel):
    """Faculty registration statistics"""
    total_registrations: int
    active_registrations: int
    cancelled_registrations: int
    attendance_marked: int
    feedback_submitted: int
    certificates_issued: int
    attendance_percentage: float
    feedback_percentage: float
    certificate_percentage: float

class FacultyDashboardData(BaseModel):
    """Dashboard data for faculty users"""
    user_type: str = "faculty"
    data: Dict[str, Any]
    last_updated: datetime = Field(default_factory=datetime.utcnow)

# Faculty-specific request/response models for the API

class FacultyRegistrationRequest(BaseModel):
    """Request model for faculty event registration API"""
    event_id: str
    registration_type: str = "individual"  # "individual" or "team"
    faculty_data: Dict[str, Any] = {}  # Faculty-specific data
    team_data: Dict[str, Any] = {}     # Team data if applicable
    action: str = "register"           # "register", "add_participant", "remove_participant", etc.

class FacultyLookupRequest(BaseModel):
    """Request model for faculty lookup"""
    employee_id: str

class FacultyLookupResponse(BaseModel):
    """Response model for faculty lookup"""
    success: bool
    faculty: Optional[Dict[str, Any]] = None
    message: Optional[str] = None

# Event update models for faculty participation

class FacultyEventParticipation(BaseModel):
    """Model for faculty event participation data in faculty document"""
    event_id: str
    event_name: str
    registration_id: str
    registration_type: str  # individual or team
    team_name: Optional[str] = None
    registration_date: datetime
    status: str = "registered"  # registered, attended, completed, cancelled

class EventFacultyStats(BaseModel):
    """Model for event statistics related to faculty participation"""
    faculty_individual_count: int = 0
    faculty_team_count: int = 0
    total_faculty_participants: int = 0
    participated_faculties: List[str] = []  # List of employee_ids
    last_updated: datetime = Field(default_factory=datetime.utcnow)
