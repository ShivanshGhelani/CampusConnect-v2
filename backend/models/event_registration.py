"""
Event Registration Models with Dual-Layer Attendance Verification

This module contains models for event registration and the new dual-layer
attendance verification system that tracks both virtual and physical attendance.
"""

from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class AttendanceStatus(str, Enum):
    """Final attendance status enumeration"""
    ABSENT = "absent"
    VIRTUAL_ONLY = "virtual_only"
    PHYSICAL_ONLY = "physical_only"
    PRESENT = "present"


class EventRegistration(BaseModel):
    """Enhanced event registration model with dual-layer attendance tracking"""
    
    # Basic registration info
    registration_id: str = Field(..., description="Unique registration ID (REG{8digits})")
    event_id: str = Field(..., description="Event identifier")
    student_enrollment: str = Field(..., description="Student enrollment number")
    registration_timestamp: datetime = Field(default_factory=datetime.utcnow, description="Registration date and time")
    
    # Registration details
    registrar_id: str = Field(..., description="Generated registrar ID from registration form")
    student_data: Dict[str, Any] = Field(default={}, description="Student registration form data")
    
    # Payment tracking (for paid events)
    payment_id: Optional[str] = Field(default=None, description="Payment transaction ID")
    payment_status: str = Field(default="free", description="free, pending, completed, failed")
    payment_amount: Optional[float] = Field(default=None, description="Payment amount")
    
    # Dual-layer attendance tracking
    virtual_attendance_id: Optional[str] = Field(default=None, description="Virtual attendance ID (VATT{8digits})")
    physical_attendance_id: Optional[str] = Field(default=None, description="Physical attendance ID (PATT{8digits})")
    final_attendance_status: AttendanceStatus = Field(default=AttendanceStatus.ABSENT, description="Final attendance status")
    
    # Attendance timestamps
    attendance_timestamps: Dict[str, datetime] = Field(default={}, description="Timestamps for virtual and physical attendance")
    
    # Additional metadata
    attendance_metadata: Dict[str, Any] = Field(default={}, description="Additional attendance tracking data")
    
    # Certificate tracking
    certificate_id: Optional[str] = Field(default=None, description="Certificate ID if generated")
    certificate_issued: bool = Field(default=False, description="Whether certificate has been issued")
    
    # Feedback tracking
    feedback_id: Optional[str] = Field(default=None, description="Feedback ID if submitted")
    feedback_submitted: bool = Field(default=False, description="Whether feedback has been submitted")
    
    def mark_virtual_attendance(self, virtual_attendance_id: str, timestamp: Optional[datetime] = None) -> None:
        """Mark virtual attendance and update timestamps"""
        self.virtual_attendance_id = virtual_attendance_id
        if timestamp is None:
            timestamp = datetime.utcnow()
        self.attendance_timestamps["virtual"] = timestamp
        self._update_final_attendance_status()
    
    def mark_physical_attendance(self, physical_attendance_id: str, timestamp: Optional[datetime] = None, marked_by: Optional[str] = None) -> None:
        """Mark physical attendance and update timestamps"""
        self.physical_attendance_id = physical_attendance_id
        if timestamp is None:
            timestamp = datetime.utcnow()
        self.attendance_timestamps["physical"] = timestamp
        
        # Store who marked physical attendance
        if marked_by:
            if "physical_marked_by" not in self.attendance_metadata:
                self.attendance_metadata["physical_marked_by"] = marked_by
        
        self._update_final_attendance_status()
    
    def _update_final_attendance_status(self) -> None:
        """Update the final attendance status based on virtual and physical attendance"""
        has_virtual = self.virtual_attendance_id is not None
        has_physical = self.physical_attendance_id is not None
        
        if has_virtual and has_physical:
            self.final_attendance_status = AttendanceStatus.PRESENT
        elif has_virtual and not has_physical:
            self.final_attendance_status = AttendanceStatus.VIRTUAL_ONLY
        elif not has_virtual and has_physical:
            self.final_attendance_status = AttendanceStatus.PHYSICAL_ONLY
        else:
            self.final_attendance_status = AttendanceStatus.ABSENT
    
    def is_fully_attended(self) -> bool:
        """Check if student has completed both virtual and physical attendance"""
        return self.final_attendance_status == AttendanceStatus.PRESENT
    
    def get_attendance_summary(self) -> Dict[str, Any]:
        """Get a summary of attendance status"""
        return {
            "registration_id": self.registration_id,
            "student_enrollment": self.student_enrollment,
            "virtual_attendance_id": self.virtual_attendance_id,
            "physical_attendance_id": self.physical_attendance_id,
            "final_status": self.final_attendance_status.value,
            "timestamps": self.attendance_timestamps,
            "is_present": self.is_fully_attended()
        }


class TeamEventRegistration(BaseModel):
    """Team-based event registration with dual-layer attendance tracking"""
    
    # Team registration info
    team_registration_id: str = Field(..., description="Unique team registration ID (TEAM{8digits})")
    event_id: str = Field(..., description="Event identifier")
    team_name: str = Field(..., description="Team name")
    team_leader_enrollment: str = Field(..., description="Team leader enrollment number")
    registration_timestamp: datetime = Field(default_factory=datetime.utcnow, description="Registration date and time")
    
    # Team member registrations
    team_members: Dict[str, EventRegistration] = Field(default={}, description="Team member registrations by enrollment number")
    
    # Team payment tracking (for paid events)
    team_payment_id: Optional[str] = Field(default=None, description="Team payment transaction ID")
    team_payment_status: str = Field(default="free", description="free, pending, completed, failed")
    team_payment_amount: Optional[float] = Field(default=None, description="Total team payment amount")
    
    def add_team_member(self, member_registration: EventRegistration) -> None:
        """Add a team member registration"""
        self.team_members[member_registration.student_enrollment] = member_registration
    
    def get_team_attendance_summary(self) -> Dict[str, Any]:
        """Get attendance summary for the entire team"""
        total_members = len(self.team_members)
        present_count = sum(1 for member in self.team_members.values() if member.is_fully_attended())
        virtual_only_count = sum(1 for member in self.team_members.values() if member.final_attendance_status == AttendanceStatus.VIRTUAL_ONLY)
        physical_only_count = sum(1 for member in self.team_members.values() if member.final_attendance_status == AttendanceStatus.PHYSICAL_ONLY)
        absent_count = sum(1 for member in self.team_members.values() if member.final_attendance_status == AttendanceStatus.ABSENT)
        
        return {
            "team_registration_id": self.team_registration_id,
            "team_name": self.team_name,
            "team_leader": self.team_leader_enrollment,
            "total_members": total_members,
            "present_count": present_count,
            "virtual_only_count": virtual_only_count,
            "physical_only_count": physical_only_count,
            "absent_count": absent_count,
            "attendance_percentage": (present_count / total_members * 100) if total_members > 0 else 0,
            "members": {
                enrollment: member.get_attendance_summary() 
                for enrollment, member in self.team_members.items()
            }
        }


# Request/Response models for API endpoints

class VirtualAttendanceRequest(BaseModel):
    """Request model for marking virtual attendance"""
    registration_id: str = Field(..., description="Registration ID to mark attendance for")
    location_data: Optional[Dict[str, Any]] = Field(default=None, description="Optional location/IP data")


class PhysicalAttendanceRequest(BaseModel):
    """Request model for marking physical attendance by admin"""
    registration_id: str = Field(..., description="Registration ID to mark attendance for")
    notes: Optional[str] = Field(default=None, description="Optional notes about attendance marking")


class AttendanceResponse(BaseModel):
    """Response model for attendance operations"""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None


class BulkPhysicalAttendanceRequest(BaseModel):
    """Request model for bulk marking physical attendance"""
    registration_ids: list[str] = Field(..., description="List of registration IDs to mark")
    notes: Optional[str] = Field(default=None, description="Optional notes for bulk operation")


class AttendanceStatsResponse(BaseModel):
    """Response model for attendance statistics"""
    event_id: str
    total_registrations: int
    virtual_attendance_count: int
    physical_attendance_count: int
    present_count: int
    virtual_only_count: int
    physical_only_count: int
    absent_count: int
    attendance_percentage: float
    last_updated: datetime


class RegistrationLookupRequest(BaseModel):
    """Request model for looking up registration by student and event"""
    student_enrollment: str = Field(..., description="Student enrollment number")
    event_id: str = Field(..., description="Event ID")


class RegistrationResponse(BaseModel):
    """Response model for registration data"""
    success: bool
    message: str
    registration: Optional[EventRegistration] = None
