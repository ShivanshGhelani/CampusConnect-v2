from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict
from datetime import datetime
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class EventParticipation(BaseModel):
    """Event participation tracking for a student - Updated for new data structure"""
    registration_id: str = Field(..., description="Generated registration ID")
    attendance_id: Optional[str] = Field(default=None, description="Generated attendance ID when marked present")
    feedback_id: Optional[str] = Field(default=None, description="Generated feedback ID when feedback is submitted")
    certificate_id: Optional[str] = Field(default=None, description="Generated certificate ID when certificate is issued")
    certificate_email_sent: bool = Field(default=False, description="Track if certificate email was sent to prevent duplicate emails")
    
    # Payment tracking for paid events
    payment_id: Optional[str] = Field(default=None, description="Payment ID for paid events")
    payment_status: Optional[str] = Field(default=None, description="Payment status: complete/pending (for paid events only)")
      # Event participation metadata
    registration_date: datetime = Field(default_factory=datetime.utcnow, description="Date of registration")
    registration_type: str = Field(..., description="Type: 'individual' or 'team_member'")
    team_name: Optional[str] = Field(default=None, description="Team name if part of a team event")
    team_registration_id: Optional[str] = Field(default=None, description="Team registration ID for team events")

class Student(BaseModel):
    """Student model for authentication and registration tracking"""
    enrollment_no: str = Field(..., min_length=3, max_length=20, description="Student enrollment number")
    email: EmailStr = Field(..., description="Valid institute email address")
    mobile_no: str = Field(..., pattern="^[0-9]{10}$", description="10-digit mobile number")
    password_hash: str = Field(..., description="Hashed password for authentication")
    full_name: Optional[str] = Field(default=None, description="Full name of the student")
    department: Optional[str] = Field(default=None, description="Department name")
    semester: Optional[int] = Field(default=None, ge=1, le=8, description="Current semester (1-8)")
    is_active: bool = Field(default=True, description="Whether the student account is active")
    event_participations: Dict[str, EventParticipation] = Field(default={}, description="Event participations mapped by event_id")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Account creation timestamp")
    last_login: Optional[datetime] = Field(default=None, description="Last successful login timestamp")
    date_of_birth: Optional[datetime] = Field(default=None, description="Date of birth of the student")
    gender: Optional[str] = Field(default=None, description="Male or Female")
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt"""
        return pwd_context.hash(password)
    
    @staticmethod
    def get_password_hash(password: str) -> str:
        """Hash a password using bcrypt (alias for compatibility)"""
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        """Verify a password against its hash"""
        return pwd_context.verify(password, password_hash)
    
    class Config:
        json_schema_extra = {
            "example": {
                "enrollment_no": "22BEIT30043",
                "email": "student@ldrp.ac.in",
                "mobile_no": "9876543210",
                "password_hash": "hashed_password_here",
                "full_name": "John Doe",
                "department": "Information Technology",
                "semester": 5
            }
        }
