"""
Admin Message Models for inter-admin communication system
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, validator
from enum import Enum

class MessagePriority(str, Enum):
    """Message priority levels"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

class ThreadStatus(str, Enum):
    """Thread status options"""
    ACTIVE = "active"
    ARCHIVED = "archived"
    CLOSED = "closed"

class MessageStatus(str, Enum):
    """Individual message status"""
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"

class ThreadContext(BaseModel):
    """Context information for message threads"""
    venue_id: Optional[str] = None
    event_id: Optional[str] = None
    booking_id: Optional[str] = None
    maintenance_id: Optional[str] = None
    category: Optional[str] = None  # 'venue', 'event', 'booking', 'maintenance', 'general'
    
class MessageContent(BaseModel):
    """Individual message within a thread"""
    message_id: str
    sender_username: str
    sender_role: str
    sender_name: str
    content: str = Field(..., min_length=1, max_length=2000)
    timestamp: str  # ISO format datetime
    status: MessageStatus = MessageStatus.SENT
    read_by: List[str] = Field(default_factory=list)  # List of usernames who read this message
    read_timestamps: Dict[str, str] = Field(default_factory=dict)  # username -> timestamp
    edited_at: Optional[str] = None
    is_system_message: bool = False
    
    @validator('content')
    def validate_content(cls, v):
        if not v or not v.strip():
            raise ValueError('Message content cannot be empty')
        return v.strip()

class AdminMessageThread(BaseModel):
    """Main message thread model"""
    thread_id: str
    subject: str = Field(..., min_length=1, max_length=200)
    participants: List[str] = Field(..., min_items=2)  # List of usernames
    participant_roles: Dict[str, str] = Field(default_factory=dict)  # username -> role
    participant_names: Dict[str, str] = Field(default_factory=dict)  # username -> full name
    messages: List[MessageContent] = Field(default_factory=list)
    context: Optional[ThreadContext] = None
    priority: MessagePriority = MessagePriority.NORMAL
    status: ThreadStatus = ThreadStatus.ACTIVE
    created_by: str
    created_at: str  # ISO format datetime
    updated_at: str  # ISO format datetime
    last_message_at: Optional[str] = None
    is_pinned: bool = False
    tags: List[str] = Field(default_factory=list)
    
    # Read status tracking
    unread_count: Dict[str, int] = Field(default_factory=dict)  # username -> unread count
    last_read_message: Dict[str, str] = Field(default_factory=dict)  # username -> message_id
    
    @validator('participants')
    def validate_participants(cls, v):
        if len(v) < 2:
            raise ValueError('Thread must have at least 2 participants')
        if len(set(v)) != len(v):
            raise ValueError('Participants must be unique')
        return v
    
    @validator('subject')
    def validate_subject(cls, v):
        if not v or not v.strip():
            raise ValueError('Subject cannot be empty')
        return v.strip()

class CreateThreadRequest(BaseModel):
    """Request model for creating a new message thread"""
    subject: str = Field(..., min_length=1, max_length=200)
    participants: List[str] = Field(..., min_items=1)  # Excludes sender (will be added automatically)
    initial_message: str = Field(..., min_length=1, max_length=2000)
    context: Optional[ThreadContext] = None
    priority: MessagePriority = MessagePriority.NORMAL
    tags: List[str] = Field(default_factory=list)
    
    @validator('initial_message')
    def validate_initial_message(cls, v):
        if not v or not v.strip():
            raise ValueError('Initial message cannot be empty')
        return v.strip()

class SendMessageRequest(BaseModel):
    """Request model for sending a message in existing thread"""
    content: str = Field(..., min_length=1, max_length=2000)
    
    @validator('content')
    def validate_content(cls, v):
        if not v or not v.strip():
            raise ValueError('Message content cannot be empty')
        return v.strip()

class UpdateThreadRequest(BaseModel):
    """Request model for updating thread properties"""
    subject: Optional[str] = Field(None, min_length=1, max_length=200)
    priority: Optional[MessagePriority] = None
    status: Optional[ThreadStatus] = None
    is_pinned: Optional[bool] = None
    tags: Optional[List[str]] = None

class MarkReadRequest(BaseModel):
    """Request model for marking messages as read"""
    message_ids: Optional[List[str]] = None  # If None, mark all as read
    
class ThreadFilters(BaseModel):
    """Filters for thread listing"""
    status: Optional[List[ThreadStatus]] = None
    priority: Optional[List[MessagePriority]] = None
    participants: Optional[List[str]] = None
    context_category: Optional[str] = None
    venue_id: Optional[str] = None
    event_id: Optional[str] = None
    tags: Optional[List[str]] = None
    unread_only: bool = False
    pinned_only: bool = False
    created_after: Optional[str] = None  # ISO datetime
    created_before: Optional[str] = None  # ISO datetime
    search_query: Optional[str] = None  # Search in subject and message content
    
class ThreadSummary(BaseModel):
    """Simplified thread model for listing"""
    thread_id: str
    subject: str
    participants: List[str]
    participant_names: Dict[str, str]
    participant_roles: Dict[str, str]
    last_message_preview: str
    last_message_at: Optional[str]
    last_message_sender: Optional[str]
    unread_count: int
    total_messages: int
    priority: MessagePriority
    status: ThreadStatus
    is_pinned: bool
    tags: List[str]
    context: Optional[ThreadContext]
    created_at: str

class MessageThreadResponse(BaseModel):
    """Response model for message operations"""
    success: bool
    message: str
    thread_id: Optional[str] = None
    thread: Optional[AdminMessageThread] = None
    message_id: Optional[str] = None

class ThreadListResponse(BaseModel):
    """Response model for thread listing"""
    success: bool
    message: str
    threads: List[ThreadSummary] = Field(default_factory=list)
    total_count: int = 0
    unread_threads: int = 0
    page: int = 1
    per_page: int = 20
    total_pages: int = 0

class MessageStatistics(BaseModel):
    """Statistics for admin messaging system"""
    total_threads: int = 0
    active_threads: int = 0
    archived_threads: int = 0
    total_messages: int = 0
    unread_messages: int = 0
    threads_by_priority: Dict[str, int] = Field(default_factory=dict)
    messages_last_7_days: int = 0
    most_active_participants: List[Dict[str, Any]] = Field(default_factory=list)
    average_response_time_hours: float = 0.0
