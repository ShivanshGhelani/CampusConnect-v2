"""
Maintenance model for venue maintenance scheduling
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field, field_validator, model_validator

class MaintenanceStatus(Enum):
    """Status of maintenance window"""
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class MaintenanceCreate(BaseModel):
    """Model for creating a maintenance window"""
    venue_id: str = Field(..., description="ID of the venue")
    start_time: datetime = Field(..., description="Start time of maintenance window")
    end_time: datetime = Field(..., description="End time of maintenance window")
    reason: str = Field(..., min_length=3, max_length=500, description="Reason for maintenance")
    notify_affected_users: bool = Field(default=True, description="Whether to notify users with conflicting bookings")
    
    @model_validator(mode='after')
    def validate_time_window(self):
        if self.start_time >= self.end_time:
            raise ValueError('start_time must be before end_time')
        
        # Ensure maintenance is scheduled for the future
        if self.start_time <= datetime.utcnow():
            raise ValueError('Maintenance can only be scheduled for future time')
        
        return self

class MaintenanceUpdate(BaseModel):
    """Model for updating a maintenance window"""
    start_time: Optional[datetime] = Field(None, description="New start time")
    end_time: Optional[datetime] = Field(None, description="New end time")
    reason: Optional[str] = Field(None, min_length=3, max_length=500, description="Updated reason")
    status: Optional[MaintenanceStatus] = Field(None, description="Updated status")
    
    @model_validator(mode='after')
    def validate_time_window(self):
        if self.start_time and self.end_time:
            if self.start_time >= self.end_time:
                raise ValueError('start_time must be before end_time')
        
        return self

class MaintenanceWindow(BaseModel):
    """Complete maintenance window model"""
    id: str = Field(..., description="Maintenance window ID")
    venue_id: str = Field(..., description="Venue ID")
    venue_name: Optional[str] = Field(None, description="Venue name (populated)")
    start_time: datetime = Field(..., description="Start time")
    end_time: datetime = Field(..., description="End time")
    reason: str = Field(..., description="Reason for maintenance")
    status: MaintenanceStatus = Field(default=MaintenanceStatus.SCHEDULED, description="Current status")
    created_by: str = Field(..., description="Admin who created the maintenance")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    affected_bookings: List[str] = Field(default_factory=list, description="List of booking IDs affected")
    notification_sent: bool = Field(default=False, description="Whether notifications were sent")
    
    class Config:
        use_enum_values = True

class MaintenanceConflict(BaseModel):
    """Model for maintenance-booking conflicts"""
    maintenance_id: str = Field(..., description="Maintenance window ID")
    booking_id: str = Field(..., description="Conflicting booking ID")
    event_name: str = Field(..., description="Event name")
    conflict_type: str = Field(..., description="Type of conflict: 'overlap', 'complete_overlap'")
    resolution_required: bool = Field(default=True, description="Whether manual resolution is needed")

class MaintenanceListResponse(BaseModel):
    """Response model for maintenance list"""
    maintenance_windows: List[MaintenanceWindow] = Field(default_factory=list)
    total_count: int = Field(default=0)
    upcoming_count: int = Field(default=0)
    active_count: int = Field(default=0)

class MaintenanceResponse(BaseModel):
    """Standard response for maintenance operations"""
    success: bool = Field(..., description="Success status")
    message: str = Field(..., description="Response message")
    maintenance_id: Optional[str] = Field(None, description="Maintenance window ID")
    conflicts: List[MaintenanceConflict] = Field(default_factory=list, description="Any conflicts detected")
    affected_bookings_count: int = Field(default=0, description="Number of affected bookings")

class MaintenanceValidationRequest(BaseModel):
    """Request model for validating maintenance window"""
    venue_id: str = Field(..., description="Venue ID to check")
    start_time: datetime = Field(..., description="Proposed start time")
    end_time: datetime = Field(..., description="Proposed end time")
    exclude_maintenance_id: Optional[str] = Field(None, description="Maintenance ID to exclude from conflict check")

class MaintenanceValidationResponse(BaseModel):
    """Response for maintenance validation"""
    valid: bool = Field(..., description="Whether the window is valid")
    conflicts: List[MaintenanceConflict] = Field(default_factory=list)
    overlapping_maintenance: List[str] = Field(default_factory=list, description="Overlapping maintenance window IDs")
    message: str = Field(..., description="Validation message")
