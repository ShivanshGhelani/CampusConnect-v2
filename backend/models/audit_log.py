from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum

class AuditActionType(str, Enum):
    """Types of audit actions"""
    # Admin Management
    ADMIN_CREATED = "admin_created"
    ADMIN_UPDATED = "admin_updated"
    ADMIN_DELETED = "admin_deleted"
    ADMIN_LOGIN = "admin_login"
    ADMIN_LOGOUT = "admin_logout"
    ADMIN_ROLE_CHANGED = "admin_role_changed"
    
    # Event Management
    EVENT_CREATED = "event_created"
    EVENT_UPDATED = "event_updated"
    EVENT_DELETED = "event_deleted"
    EVENT_CANCELLED = "event_cancelled"
    EVENT_PUBLISHED = "event_published"
    EVENT_UNPUBLISHED = "event_unpublished"
    EVENT_STATUS_CHANGED = "event_status_changed"
    EVENT_APPROVED = "event_approved"
    EVENT_REJECTED = "event_rejected"
    EVENT_DELETION_REQUESTED = "event_deletion_requested"
    EVENT_DELETION_APPROVED = "event_deletion_approved"
    EVENT_DELETION_REJECTED = "event_deletion_rejected"
    
    # Feedback Management
    FEEDBACK_FORM_CREATED = "feedback_form_created"
    FEEDBACK_FORM_UPDATED = "feedback_form_updated"
    FEEDBACK_FORM_DELETED = "feedback_form_deleted"
    FEEDBACK_SUBMITTED = "feedback_submitted"
    
    # Venue Management
    VENUE_CREATED = "venue_created"
    VENUE_UPDATED = "venue_updated"
    VENUE_DELETED = "venue_deleted"
    VENUE_BOOKING_CREATED = "venue_booking_created"
    VENUE_BOOKING_APPROVED = "venue_booking_approved"
    VENUE_BOOKING_REJECTED = "venue_booking_rejected"
    VENUE_BOOKING_CANCELLED = "venue_booking_cancelled"
    VENUE_MAINTENANCE_SCHEDULED = "venue_maintenance_scheduled"
    
    # System Actions
    SYSTEM_BACKUP = "system_backup"
    SYSTEM_MAINTENANCE = "system_maintenance"
    BULK_OPERATION = "bulk_operation"
    
    # Security Actions
    PASSWORD_CHANGED = "password_changed"
    PERMISSION_GRANTED = "permission_granted"
    PERMISSION_REVOKED = "permission_revoked"
    UNAUTHORIZED_ACCESS_ATTEMPT = "unauthorized_access_attempt"

class AuditSeverity(str, Enum):
    """Severity levels for audit events"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class AuditLog(BaseModel):
    """Audit log model for tracking administrative actions"""
    id: Optional[str] = Field(default=None, description="Unique audit log ID")
    
    # Action details
    action_type: AuditActionType = Field(..., description="Type of action performed")
    action_description: str = Field(..., min_length=1, max_length=500, description="Human-readable description of the action")
    severity: AuditSeverity = Field(default=AuditSeverity.INFO, description="Severity level of the action")
    
    # Actor information
    performed_by_username: str = Field(..., description="Username of the admin who performed the action")
    performed_by_role: str = Field(..., description="Role of the admin who performed the action")
    performed_by_ip: Optional[str] = Field(default=None, description="IP address of the actor")
    performed_by_user_agent: Optional[str] = Field(default=None, description="User agent of the actor")
    
    # Target information
    target_type: Optional[str] = Field(default=None, description="Type of target entity (admin, event, venue, booking)")
    target_id: Optional[str] = Field(default=None, description="ID of the target entity")
    target_name: Optional[str] = Field(default=None, description="Name of the target entity")
    
    # Data changes
    before_data: Optional[Dict[str, Any]] = Field(default={}, description="Data before the change")
    after_data: Optional[Dict[str, Any]] = Field(default={}, description="Data after the change")
    metadata: Optional[Dict[str, Any]] = Field(default={}, description="Additional metadata")
    
    # Timing and status
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="When the action was performed")
    success: bool = Field(default=True, description="Whether the action was successful")
    error_message: Optional[str] = Field(default=None, description="Error message if action failed")
    
    # Session and request information
    session_id: Optional[str] = Field(default=None, description="Session ID if applicable")
    request_id: Optional[str] = Field(default=None, description="Request ID for correlation")
    duration_ms: Optional[int] = Field(default=None, description="Duration of the action in milliseconds")
    
    class Config:
        use_enum_values = True

class AuditLogResponse(BaseModel):
    """Response model for audit log operations"""
    success: bool
    message: str
    audit_log_id: Optional[str] = None

class AuditLogListResponse(BaseModel):
    """Response model for audit log list"""
    audit_logs: List[AuditLog]
    total_count: int
    page: int
    per_page: int

class AuditLogFilter(BaseModel):
    """Filter model for audit log queries"""
    action_types: Optional[List[AuditActionType]] = Field(default=None, description="Filter by action types")
    performed_by_username: Optional[str] = Field(default=None, description="Filter by performer username")
    performed_by_role: Optional[str] = Field(default=None, description="Filter by performer role")
    target_type: Optional[str] = Field(default=None, description="Filter by target type")
    target_id: Optional[str] = Field(default=None, description="Filter by target ID")
    severity: Optional[AuditSeverity] = Field(default=None, description="Filter by severity")
    start_date: Optional[datetime] = Field(default=None, description="Filter from this date")
    end_date: Optional[datetime] = Field(default=None, description="Filter to this date")
    success_only: Optional[bool] = Field(default=None, description="Filter only successful actions")
    
class AuditLogStats(BaseModel):
    """Statistics model for audit logs"""
    total_actions: int
    actions_by_type: Dict[str, int]
    actions_by_role: Dict[str, int]
    actions_by_severity: Dict[str, int]
    failed_actions_count: int
    date_range: Dict[str, datetime]
