from pydantic import BaseModel, EmailStr, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone


class TeamParticipant(BaseModel):
    enrollment_no: str = Field(..., min_length=3, max_length=20, description="Student enrollment number")
    full_name: Optional[str] = Field(default=None, description="Auto-filled participant name")
    email: Optional[str] = Field(default=None, description="Auto-filled participant email")
    department: Optional[str] = Field(default=None, description="Auto-filled participant department")
    semester: Optional[int] = Field(default=None, description="Auto-filled participant semester")


class TeamRegistrationRequest(BaseModel):
    """Model for team registration requests when conflicts exist"""
    request_id: str = Field(..., description="Unique request ID")
    event_id: str = Field(..., description="Event ID for the registration")
    team_leader_enrollment: str = Field(..., description="Team leader's enrollment number")
    team_name: str = Field(..., description="Name of the team")
    requested_member_enrollment: str = Field(..., description="Enrollment number of requested member")
    request_status: str = Field(default="pending", description="Status: pending, approved, rejected")
    request_datetime: str = Field(..., description="When the request was made")
    response_datetime: Optional[str] = Field(None, description="When the request was responded to")
    requester_message: Optional[str] = Field(None, description="Optional message from requester")
    response_message: Optional[str] = Field(None, description="Optional response message")
    current_team_info: Optional[Dict[str, Any]] = Field(None, description="Info about member's current team")


class TeamRegistrationConflict(BaseModel):
    """Model for team registration conflict information"""
    enrollment_no: str
    full_name: str
    current_team_name: str
    current_team_leader: str
    registration_type: str  # "team_leader", "team_member"
    registration_id: str
    requires_approval: bool = True
    conflict_type: str = "already_registered"  # "already_registered", "multiple_teams_not_allowed"


class TeamApprovalRequest(BaseModel):
    """Model for team member approval requests"""
    request_id: str
    action: str  # "approve", "reject"
    response_message: Optional[str] = None


class TeamRegistrationForm(BaseModel):
    # Team leader information (same as individual registration)
    full_name: str = Field(..., min_length=2, max_length=100, description="Team leader's full name")
    enrollment_no: str = Field(..., min_length=3, max_length=20, description="Team leader's enrollment number")
    email: EmailStr = Field(..., description="Team leader's valid institute email address")
    mobile_no: str = Field(..., pattern="^[0-9]{10}$", description="Team leader's 10-digit mobile number")
    department: str = Field(..., min_length=2, max_length=50, description="Team leader's department name")
    semester: int = Field(..., ge=1, le=8, description="Team leader's current semester (1-8)")
    gender: str = Field(..., description="Team leader's gender (male/female/other)")
    date_of_birth: datetime = Field(..., description="Team leader's date of birth")
    
    # Team specific information
    team_name: str = Field(..., min_length=2, max_length=100, description="Team name")
    team_participants: List[TeamParticipant] = Field(..., min_items=0, description="List of team participants (excluding leader)")
    
    # Auto-generated fields
    registrar_id: Optional[str] = Field(default=None, description="Auto-generated team registrar ID")
    registration_datetime: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Registration timestamp")

    @validator('team_participants')
    def validate_team_size(cls, v, values):
        """Validate team size against event constraints"""
        # Note: This will be validated in the route handler with actual event constraints
        if 'team_name' in values and len(v) == 0:
            raise ValueError("Team must have at least one participant besides the leader")
        return v

    @validator('team_participants')
    def validate_unique_enrollments(cls, v, values):
        """Ensure no duplicate enrollment numbers in team"""
        enrollment_numbers = [p.enrollment_no for p in v]
        
        # Check for duplicates within participants
        if len(enrollment_numbers) != len(set(enrollment_numbers)):
            raise ValueError("Duplicate enrollment numbers found in team participants")
        
        # Check if leader is included in participants
        if 'enrollment_no' in values and values['enrollment_no'] in enrollment_numbers:
            raise ValueError("Team leader cannot be included in participants list")
        
        return v

    @property
    def total_team_size(self) -> int:
        """Calculate total team size including leader"""
        return len(self.team_participants) + 1  # +1 for the leader

    @property
    def year(self) -> int:
        """Calculate year based on leader's semester"""
        return (self.semester - 1) // 2 + 1

    @classmethod
    def get_department_code(cls, department: str) -> str:
        """Get department code from department name"""
        dept_parts = department.split()
        if len(dept_parts) > 1:
            return "".join(word[0] for word in dept_parts)[:2].upper()
        else:
            return dept_parts[0][:2].upper()

    @classmethod
    def generate_team_registrar_id(cls, enrollment_no: str, team_name: str, department: str) -> str:
        """Generate a unique team registrar ID
        Format: T + DEPARTMENTCODE + LAST3DIGITS + FIRST3TEAMNAME
        Example: TIT043HAC for a team named "Hackers" with leader enrollment 22BEIT30043 in Information Technology
        """
        # Get department code
        dept_code = cls.get_department_code(department)
        
        # Get last 3 digits from leader's enrollment number
        last_three_digits = "".join(filter(str.isdigit, enrollment_no))[-3:]
        
        # Get first 3 characters of team name (alphanumeric only)
        team_code = ''.join(c.upper() for c in team_name if c.isalnum())[:3]
        
        return f"T{dept_code}{last_three_digits}{team_code}"


class TeamValidationResult(BaseModel):
    """Result of team participant validation"""
    valid_participants: List[dict] = Field(default=[], description="List of valid participants with their details")
    invalid_enrollments: List[str] = Field(default=[], description="List of invalid enrollment numbers")
    error_messages: List[str] = Field(default=[], description="List of validation error messages")
    is_valid: bool = Field(default=False, description="Whether all participants are valid")
