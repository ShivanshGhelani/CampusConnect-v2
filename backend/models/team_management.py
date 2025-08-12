#!/usr/bin/env python3
"""
Team Task Management Models
Enhanced team management with roles, tasks, and communication
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class TaskStatus(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class TeamRole(str, Enum):
    TEAM_LEADER = "team_leader"
    COORDINATOR = "coordinator"
    DEVELOPER = "developer"
    DESIGNER = "designer"
    RESEARCHER = "researcher"
    PRESENTER = "presenter"
    CUSTOM = "custom"

class TeamTask(BaseModel):
    """Team task model with assignment and tracking"""
    task_id: str = Field(..., description="Unique task identifier")
    event_id: str = Field(..., description="Event this task belongs to")
    team_id: str = Field(..., description="Team this task belongs to")
    title: str = Field(..., min_length=1, max_length=200, description="Task title")
    description: Optional[str] = Field(None, max_length=1000, description="Task description")
    priority: TaskPriority = Field(default=TaskPriority.MEDIUM, description="Task priority")
    status: TaskStatus = Field(default=TaskStatus.TODO, description="Task status")
    
    # Assignment details
    assigned_to: List[str] = Field(default=[], description="List of enrollment numbers assigned to this task")
    created_by: str = Field(..., description="Enrollment number of task creator")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Task creation time")
    
    # Tracking details
    due_date: Optional[datetime] = Field(None, description="Task due date")
    completed_at: Optional[datetime] = Field(None, description="Task completion time")
    completed_by: Optional[str] = Field(None, description="Enrollment number of who completed the task")
    
    # Progress tracking
    progress_percentage: int = Field(default=0, ge=0, le=100, description="Task completion percentage")
    comments: List[Dict[str, Any]] = Field(default=[], description="Task comments and updates")
    
    class Config:
        use_enum_values = True

class TeamRoleAssignment(BaseModel):
    """Team member role assignment"""
    assignment_id: str = Field(..., description="Unique assignment identifier")
    event_id: str = Field(..., description="Event ID")
    team_id: str = Field(..., description="Team ID")
    enrollment_no: str = Field(..., description="Student enrollment number")
    role: TeamRole = Field(..., description="Assigned role")
    custom_role_name: Optional[str] = Field(None, description="Custom role name if role is CUSTOM")
    role_description: Optional[str] = Field(None, max_length=500, description="Role description")
    assigned_by: str = Field(..., description="Who assigned this role (enrollment number)")
    assigned_at: datetime = Field(default_factory=datetime.utcnow, description="Role assignment time")
    is_active: bool = Field(default=True, description="Whether the role assignment is active")
    
    class Config:
        use_enum_values = True

class TeamMessage(BaseModel):
    """Team communication messages"""
    message_id: str = Field(..., description="Unique message identifier")
    event_id: str = Field(..., description="Event ID")
    team_id: str = Field(..., description="Team ID")
    sender_enrollment: str = Field(..., description="Sender's enrollment number")
    message_type: str = Field(default="announcement", description="Message type: announcement, discussion, update")
    title: str = Field(..., min_length=1, max_length=200, description="Message title")
    content: str = Field(..., min_length=1, max_length=2000, description="Message content")
    is_pinned: bool = Field(default=False, description="Whether message is pinned")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Message creation time")
    edited_at: Optional[datetime] = Field(None, description="Last edit time")
    is_visible: bool = Field(default=True, description="Whether message is visible to team")
    
    # Recipients (empty means all team members)
    recipients: List[str] = Field(default=[], description="Specific recipients (enrollment numbers)")
    
    class Config:
        use_enum_values = True

class TeamPerformanceReport(BaseModel):
    """Team performance report data structure"""
    report_id: str = Field(..., description="Unique report identifier")
    event_id: str = Field(..., description="Event ID")
    team_id: str = Field(..., description="Team ID")
    generated_by: str = Field(..., description="Who generated the report")
    generated_at: datetime = Field(default_factory=datetime.utcnow, description="Report generation time")
    
    # Team summary
    team_name: str = Field(..., description="Team name")
    team_leader: str = Field(..., description="Team leader enrollment")
    total_members: int = Field(..., ge=1, description="Total team members")
    
    # Registration data
    registration_summary: Dict[str, Any] = Field(default={}, description="Registration summary data")
    
    # Attendance data
    attendance_summary: Dict[str, Any] = Field(default={}, description="Attendance summary data")
    
    # Feedback data
    feedback_summary: Dict[str, Any] = Field(default={}, description="Feedback summary data")
    
    # Certificate data
    certificate_summary: Dict[str, Any] = Field(default={}, description="Certificate summary data")
    
    # Task performance
    task_summary: Dict[str, Any] = Field(default={}, description="Task completion summary")
    
    # Role distribution
    role_distribution: Dict[str, Any] = Field(default={}, description="Role assignment summary")
    
    # Performance metrics
    performance_metrics: Dict[str, Any] = Field(default={}, description="Calculated performance metrics")

# Database collection names
TEAM_TASKS_COLLECTION = "team_tasks"
TEAM_ROLE_ASSIGNMENTS_COLLECTION = "team_role_assignments"  
TEAM_MESSAGES_COLLECTION = "team_messages"
TEAM_REPORTS_COLLECTION = "team_reports"
