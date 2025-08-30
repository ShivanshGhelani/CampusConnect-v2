"""
Student Registration Models - Event Lifecycle Compliant
======================================================
Simplified models following event_lifecycle.txt specifications
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

class StudentInfo(BaseModel):
    """Simple student information"""
    enrollment_no: str
    name: str
    email: str
    phone: Optional[str] = None
    department: Optional[str] = None

class EventInfo(BaseModel):
    """Simple event information"""
    event_id: str
    title: str
    event_type: str
    start_date: datetime

class RegistrationDetails(BaseModel):
    """Simple registration details"""
    registration_id: str
    registered_at: datetime
    status: RegistrationStatus = RegistrationStatus.ACTIVE
    registration_type: str = "individual"  # individual or team

class TeamInfo(BaseModel):
    """Simple team information (optional)"""
    team_name: Optional[str] = None
    team_leader: Optional[str] = None
    team_members: Optional[List[str]] = None
    team_size: Optional[int] = None

class TaskInfo(BaseModel):
    """Task information for team management"""
    task_id: str
    title: str
    description: Optional[str] = ""
    priority: str = "medium"  # low, medium, high
    deadline: Optional[datetime] = None
    assigned_to: List[str] = []  # List of enrollment numbers
    category: str = "general"
    status: str = "pending"  # pending, in_progress, completed, cancelled
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_by: Optional[str] = None
    completed_at: Optional[datetime] = None
    reviews: List[Dict[str, Any]] = []

class MessageInfo(BaseModel):
    """Message information for team communication"""
    message_id: str
    content: str
    priority: str = "normal"  # low, normal, high, urgent
    mentions: List[str] = []  # List of enrollment numbers mentioned
    category: str = "general"
    sent_by: str
    sent_at: datetime = Field(default_factory=datetime.utcnow)
    read_by: List[str] = []  # List of enrollment numbers who read the message
    reactions: Dict[str, List[str]] = {}  # emoji -> list of enrollment numbers
    replies: List[Dict[str, Any]] = []

class RoleAssignment(BaseModel):
    """Role assignment information for team members"""
    role: str
    permissions: List[str] = []
    description: Optional[str] = ""
    assigned_by: str
    assigned_at: datetime = Field(default_factory=datetime.utcnow)

class AttendanceSessionInfo(BaseModel):
    """Individual attendance session information"""
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
    """Unified attendance information for all strategies"""
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
    """Simple feedback information"""
    submitted: bool = False
    submitted_at: Optional[datetime] = None
    rating: Optional[int] = None
    comments: Optional[str] = None

class CertificateInfo(BaseModel):
    """Simple certificate information"""
    eligible: bool = False
    issued: bool = False
    issued_at: Optional[datetime] = None
    certificate_id: Optional[str] = None
    status: CertificateStatus = CertificateStatus.NOT_ELIGIBLE

class StudentRegistration(BaseModel):
    """Main student registration document - event_lifecycle.txt compliant"""
    id: Optional[str] = Field(default=None, alias="_id")
    student: StudentInfo
    event: EventInfo
    registration: RegistrationDetails
    team: Optional[TeamInfo] = None
    attendance: AttendanceInfo = Field(default_factory=AttendanceInfo)
    feedback: FeedbackInfo = Field(default_factory=FeedbackInfo)
    certificate: CertificateInfo = Field(default_factory=CertificateInfo)
    
    # Team Management Fields (for team registrations only)
    tasks: List[TaskInfo] = Field(default=[], description="Team tasks")
    messages: List[MessageInfo] = Field(default=[], description="Team messages")
    team_roles: Dict[str, RoleAssignment] = Field(default={}, description="Role assignments by enrollment number")
    team_members: Optional[List[Dict[str, Any]]] = Field(default=None, description="Detailed team member information")
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True  # Allow both 'id' and '_id'

class CreateRegistrationRequest(BaseModel):
    """Request model for creating registration"""
    event_id: str
    registration_type: str = "individual"
    team_info: Optional[Dict[str, Any]] = None
    additional_data: Optional[Dict[str, Any]] = None

class RegistrationResponse(BaseModel):
    """Response model for registration operations"""
    success: bool
    message: str
    registration_id: Optional[str] = None
    data: Optional[Dict[str, Any]] = None

class RegistrationStats(BaseModel):
    """Simple registration statistics"""
    total_registrations: int
    active_registrations: int
    cancelled_registrations: int
    attendance_marked: int
    feedback_submitted: int
    certificates_issued: int
    attendance_percentage: float
    feedback_percentage: float
    certificate_percentage: float

class DashboardData(BaseModel):
    """Dashboard data for different user roles"""
    user_type: str  # student, organizer, admin
    data: Dict[str, Any]
    last_updated: datetime = Field(default_factory=datetime.utcnow)
