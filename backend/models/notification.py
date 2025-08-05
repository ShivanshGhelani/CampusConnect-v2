from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum

class NotificationType(str, Enum):
    """Types of notifications in the system"""
    EVENT_APPROVAL_REQUEST = "event_approval_request"
    EVENT_APPROVED = "event_approved"
    EVENT_REJECTED = "event_rejected"
    EVENT_DELETION_REQUEST = "event_deletion_request"
    VENUE_BOOKING_REQUEST = "venue_booking_request"
    VENUE_BOOKING_APPROVED = "venue_booking_approved"
    VENUE_BOOKING_REJECTED = "venue_booking_rejected"
    EVENT_DELETION_APPROVED = "event_deletion_approved"
    EVENT_DELETION_REJECTED = "event_deletion_rejected"
    SYSTEM_ALERT = "system_alert"
    MAINTENANCE_SCHEDULED = "maintenance_scheduled"

class NotificationPriority(str, Enum):
    """Priority levels for notifications"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class NotificationStatus(str, Enum):
    """Status of notifications"""
    UNREAD = "unread"
    READ = "read"
    ARCHIVED = "archived"

class Notification(BaseModel):
    """Notification model for admin communications"""
    id: Optional[str] = Field(default=None, description="Unique notification ID")
    type: NotificationType = Field(..., description="Type of notification")
    priority: NotificationPriority = Field(default=NotificationPriority.MEDIUM, description="Priority level")
    status: NotificationStatus = Field(default=NotificationStatus.UNREAD, description="Read status")
    
    # Content
    title: str = Field(..., min_length=1, max_length=200, description="Notification title")
    message: str = Field(..., min_length=1, max_length=1000, description="Notification message")
    
    # Recipients and sender
    recipient_username: str = Field(..., description="Username of the recipient admin")
    recipient_role: str = Field(..., description="Role of the recipient admin")
    sender_username: Optional[str] = Field(default=None, description="Username of the sender (if applicable)")
    sender_role: Optional[str] = Field(default=None, description="Role of the sender")
    
    # Related data
    related_entity_type: Optional[str] = Field(default=None, description="Type of related entity (event, venue, booking)")
    related_entity_id: Optional[str] = Field(default=None, description="ID of the related entity")
    metadata: Optional[Dict[str, Any]] = Field(default={}, description="Additional notification data")
    
    # Actions
    action_required: bool = Field(default=False, description="Whether this notification requires action")
    action_type: Optional[str] = Field(default=None, description="Type of action required (approve, reject, acknowledge)")
    action_data: Optional[Dict[str, Any]] = Field(default={}, description="Data needed for the action")
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow, description="When notification was created")
    read_at: Optional[datetime] = Field(default=None, description="When notification was read")
    archived_at: Optional[datetime] = Field(default=None, description="When notification was archived")
    expires_at: Optional[datetime] = Field(default=None, description="When notification expires (auto-archive)")
    
    # Email notification
    email_sent: bool = Field(default=False, description="Whether email notification was sent")
    email_sent_at: Optional[datetime] = Field(default=None, description="When email was sent")
    
    class Config:
        use_enum_values = True

class NotificationResponse(BaseModel):
    """Response model for notification operations"""
    success: bool
    message: str
    notification_id: Optional[str] = None

class NotificationListResponse(BaseModel):
    """Response model for notification list"""
    notifications: List[Notification]
    total_count: int
    unread_count: int
    page: int
    per_page: int

class MarkAsReadRequest(BaseModel):
    """Request model for marking notifications as read"""
    notification_ids: List[str] = Field(..., description="List of notification IDs to mark as read")

class NotificationActionRequest(BaseModel):
    """Request model for notification actions (approve/reject)"""
    action: str = Field(..., description="Action to take (approve/reject)")
    reason: Optional[str] = Field(default=None, description="Reason for the action")
    additional_data: Optional[Dict[str, Any]] = Field(default={}, description="Additional action data")
