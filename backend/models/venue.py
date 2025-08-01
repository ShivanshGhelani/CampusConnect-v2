from typing import Dict, List, Optional, Any
from datetime import datetime, time
from enum import Enum
from pydantic import BaseModel, Field, field_validator, model_validator

class VenueType(Enum):
    """Types of venues available"""
    AUDITORIUM = "auditorium"
    CLASSROOM = "classroom"
    LABORATORY = "laboratory"
    SEMINAR_HALL = "seminar_hall"
    CONFERENCE_ROOM = "conference_room"
    OUTDOOR_GROUND = "outdoor_ground"
    CAFETERIA = "cafeteria"
    LIBRARY_HALL = "library_hall"
    SPORTS_COMPLEX = "sports_complex"
    OTHER = "other"

class VenueStatus(Enum):
    """Venue availability status"""
    AVAILABLE = "available"
    BOOKED = "booked"
    MAINTENANCE = "maintenance"
    UNAVAILABLE = "unavailable"

class BookingStatus(Enum):
    """Booking confirmation status"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"

class BookingStatusChange(BaseModel):
    """Status change history for bookings"""
    status: BookingStatus = Field(..., description="Status value")
    changed_by: str = Field(..., description="Username who changed the status")
    changed_by_role: str = Field(..., description="Role of the person who changed status")
    changed_at: datetime = Field(default_factory=datetime.utcnow, description="When status was changed")
    reason: Optional[str] = Field(None, description="Reason for status change")
    notes: Optional[str] = Field(None, description="Additional notes")

class VenueBooking(BaseModel):
    """Individual venue booking details"""
    booking_id: str = Field(..., description="Unique booking identifier")
    event_id: str = Field(..., description="Associated event ID")
    event_name: str = Field(..., description="Name of the event")
    booked_by: str = Field(..., description="User ID who booked the venue")
    booked_by_name: str = Field(..., description="Name of the person who booked")
    booked_by_role: str = Field(default="organizer_admin", description="Role of the person who booked")
    booking_date: datetime = Field(default_factory=datetime.utcnow, description="When the booking was made")
    start_datetime: datetime = Field(..., description="Booking start time")
    end_datetime: datetime = Field(..., description="Booking end time")
    status: BookingStatus = Field(default=BookingStatus.PENDING, description="Current booking status")
    
    # Enhanced tracking
    booking_status_history: List[BookingStatusChange] = Field(default=[], description="Complete status change history")
    priority: Optional[str] = Field(default="medium", description="Booking priority (low, medium, high, urgent)")
    requires_approval: bool = Field(default=True, description="Whether booking requires venue admin approval")
    
    # Approval workflow
    approved_by: Optional[str] = Field(None, description="Venue admin who approved the booking")
    approved_at: Optional[datetime] = Field(None, description="When the booking was approved")
    rejection_reason: Optional[str] = Field(None, description="Reason for rejection if applicable")
    
    # Notes and communication
    notes: Optional[str] = Field(None, description="Additional booking notes")
    admin_notes: Optional[str] = Field(None, description="Internal admin notes")
    special_requirements: Optional[str] = Field(None, description="Special requirements for the booking")
    
    # Legacy fields for backward compatibility
    confirmed_by: Optional[str] = Field(None, description="Admin who confirmed the booking (legacy)")
    confirmed_at: Optional[datetime] = Field(None, description="When the booking was confirmed (legacy)")

class VenueContact(BaseModel):
    """Contact information for venue booking"""
    name: str = Field(..., description="Contact person name")
    designation: str = Field(..., description="Contact person designation")
    phone: str = Field(..., description="Contact phone number")
    email: str = Field(..., description="Contact email address")
    department: Optional[str] = Field(None, description="Department of contact person")

class VenueFacilities(BaseModel):
    """Venue facilities and amenities"""
    capacity: int = Field(..., description="Maximum capacity")
    has_projector: bool = Field(default=False, description="Projector available")
    has_audio_system: bool = Field(default=False, description="Audio system available")
    has_microphone: bool = Field(default=False, description="Microphone available")
    has_whiteboard: bool = Field(default=False, description="Whiteboard available")
    has_air_conditioning: bool = Field(default=False, description="Air conditioning available")
    has_wifi: bool = Field(default=False, description="WiFi available")
    has_parking: bool = Field(default=False, description="Parking available")
    additional_facilities: List[str] = Field(default=[], description="Additional facilities")

class Venue(BaseModel):
    """Main venue model"""
    venue_id: str = Field(..., description="Unique venue identifier")
    venue_name: str = Field(..., description="Name of the venue")
    venue_type: VenueType = Field(..., description="Type of venue")
    location: str = Field(..., description="Physical location/address")
    building: Optional[str] = Field(None, description="Building name")
    floor: Optional[str] = Field(None, description="Floor number")
    room_number: Optional[str] = Field(None, description="Room number")
    description: Optional[str] = Field(None, description="Venue description")
    
    # Facilities and features
    facilities: VenueFacilities = Field(..., description="Venue facilities")
    
    # Contact information
    contact_person: VenueContact = Field(..., description="Contact for booking")
    
    # Availability
    is_active: bool = Field(default=True, description="Whether venue is active")
    status: VenueStatus = Field(default=VenueStatus.AVAILABLE, description="Current venue status")
    
    # Operating hours
    operating_hours: Dict[str, Dict[str, str]] = Field(
        default={
            "monday": {"start": "09:00", "end": "18:00"},
            "tuesday": {"start": "09:00", "end": "18:00"},
            "wednesday": {"start": "09:00", "end": "18:00"},
            "thursday": {"start": "09:00", "end": "18:00"},
            "friday": {"start": "09:00", "end": "18:00"},
            "saturday": {"start": "09:00", "end": "18:00"},
            "sunday": {"start": "09:00", "end": "18:00"}
        },
        description="Operating hours for each day"
    )
    
    # Bookings
    bookings: List[VenueBooking] = Field(default=[], description="List of venue bookings")
    
    # Metadata
    created_by: str = Field(..., description="Admin who created the venue")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    updated_by: Optional[str] = Field(None, description="Admin who last updated")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    
    @field_validator('bookings')
    @classmethod
    def validate_bookings(cls, v):
        """Validate that bookings don't overlap"""
        if not v:
            return v
            
        # Sort bookings by start time
        sorted_bookings = sorted(v, key=lambda x: x.start_datetime)
        
        # Check for overlaps
        for i in range(len(sorted_bookings) - 1):
            current = sorted_bookings[i]
            next_booking = sorted_bookings[i + 1]
            
            # Skip cancelled bookings
            if current.status == BookingStatus.CANCELLED or next_booking.status == BookingStatus.CANCELLED:
                continue
                
            if current.end_datetime > next_booking.start_datetime:
                raise ValueError(f"Booking conflict: {current.event_name} overlaps with {next_booking.event_name}")
        
        return v

# Pydantic models for API
class VenueCreate(BaseModel):
    """Model for creating a new venue"""
    venue_name: str = Field(..., min_length=1, max_length=200, description="Name of the venue")
    venue_type: VenueType = Field(..., description="Type of venue")
    location: str = Field(..., min_length=1, max_length=500, description="Physical location/address")
    building: Optional[str] = Field(None, max_length=100, description="Building name")
    floor: Optional[str] = Field(None, max_length=20, description="Floor number")
    room_number: Optional[str] = Field(None, max_length=50, description="Room number")
    description: Optional[str] = Field(None, max_length=1000, description="Venue description")
    
    # Simplified facilities - just capacity is required
    capacity: int = Field(..., gt=0, description="Maximum capacity")
    has_projector: bool = Field(default=False, description="Projector available")
    has_audio_system: bool = Field(default=False, description="Audio system available")
    has_microphone: bool = Field(default=False, description="Microphone available")
    has_whiteboard: bool = Field(default=False, description="Whiteboard available")
    has_air_conditioning: bool = Field(default=False, description="Air conditioning available")
    has_wifi: bool = Field(default=False, description="WiFi available")
    has_parking: bool = Field(default=False, description="Parking available")
    additional_facilities: List[str] = Field(default=[], description="Additional facilities")
    
    # Simplified contact - just name and phone required
    contact_name: str = Field(..., min_length=1, max_length=100, description="Contact person name")
    contact_designation: str = Field(default="Venue Manager", max_length=100, description="Contact person designation")
    contact_phone: str = Field(..., min_length=10, max_length=20, description="Contact phone number")
    contact_email: str = Field(..., description="Contact email address")
    contact_department: Optional[str] = Field(None, max_length=100, description="Department of contact person")
    
    # Optional fields
    is_active: bool = Field(default=True, description="Whether venue is active")
    operating_hours: Optional[Dict[str, Dict[str, str]]] = Field(
        default=None,
        description="Operating hours for each day"
    )
    created_by: str = Field(default="admin", description="Admin who created the venue")

class VenueUpdate(BaseModel):
    """Model for updating venue details"""
    venue_name: Optional[str] = Field(None, min_length=1, max_length=200)
    venue_type: Optional[VenueType] = None
    location: Optional[str] = Field(None, min_length=1, max_length=500)
    building: Optional[str] = Field(None, max_length=100)
    floor: Optional[str] = Field(None, max_length=20)
    room_number: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=1000)
    facilities: Optional[VenueFacilities] = None
    contact_person: Optional[VenueContact] = None
    is_active: Optional[bool] = None
    status: Optional[VenueStatus] = None
    operating_hours: Optional[Dict[str, Dict[str, str]]] = None

class VenueUpdateFlexible(BaseModel):
    """Model for updating venue details with flexible field handling"""
    venue_name: Optional[str] = Field(None, min_length=1, max_length=200)
    venue_type: Optional[str] = None  # Accept string instead of enum
    location: Optional[str] = Field(None, min_length=1, max_length=500)
    building: Optional[str] = Field(None, max_length=100)
    floor: Optional[str] = Field(None, max_length=20)
    room_number: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=1000)
    
    # Facilities fields (flat structure)
    capacity: Optional[int] = Field(None, gt=0)
    has_projector: Optional[bool] = None
    has_audio_system: Optional[bool] = None
    has_microphone: Optional[bool] = None
    has_whiteboard: Optional[bool] = None
    has_air_conditioning: Optional[bool] = None
    has_wifi: Optional[bool] = None
    has_parking: Optional[bool] = None
    additional_facilities: Optional[List[str]] = None
    
    # Contact fields (flat structure)
    contact_name: Optional[str] = Field(None, min_length=1, max_length=100)
    contact_designation: Optional[str] = Field(None, max_length=100)
    contact_phone: Optional[str] = Field(None, min_length=10, max_length=20)
    contact_email: Optional[str] = None
    contact_department: Optional[str] = Field(None, max_length=100)
    
    # Status fields
    is_active: Optional[bool] = None
    status: Optional[str] = None  # Accept string instead of enum
    operating_hours: Optional[Dict[str, Dict[str, str]]] = None

class VenueBookingCreate(BaseModel):
    """Model for creating a new venue booking"""
    event_id: str = Field(..., description="Associated event ID")
    event_name: str = Field(..., description="Name of the event")
    booked_by: str = Field(..., description="User ID who booked the venue")
    booked_by_name: str = Field(..., description="Name of the person who booked")
    start_datetime: str = Field(..., description="Booking start time (ISO format)")
    end_datetime: str = Field(..., description="Booking end time (ISO format)")
    notes: Optional[str] = Field(None, description="Additional booking notes")

class VenueBookingUpdate(BaseModel):
    """Model for updating a venue booking"""
    event_name: Optional[str] = Field(None, description="Name of the event")
    start_datetime: Optional[str] = Field(None, description="Booking start time (ISO format)")
    end_datetime: Optional[str] = Field(None, description="Booking end time (ISO format)")
    status: Optional[BookingStatus] = Field(None, description="Booking status")
    notes: Optional[str] = Field(None, description="Additional booking notes")

class VenueResponse(BaseModel):
    """Response model for individual venue"""
    venue_id: str
    venue_name: str
    venue_type: str
    location: str
    building: Optional[str] = None
    floor: Optional[str] = None
    room_number: Optional[str] = None
    description: Optional[str] = None
    facilities: Dict[str, Any]
    contact_person: Dict[str, Any]
    is_active: bool
    status: str
    operating_hours: Optional[Dict[str, Dict[str, str]]] = None
    bookings: List[Dict[str, Any]] = []
    created_at: str
    updated_at: Optional[str] = None

class VenueListResponse(BaseModel):
    """Response model for venue listing"""
    venue_id: str
    venue_name: str
    venue_type: str
    location: str
    capacity: int
    is_active: bool
    status: str
    current_bookings_count: int
    next_booking: Optional[Dict[str, Any]] = None

class VenueAvailabilityRequest(BaseModel):
    """Request model for checking venue availability"""
    start_datetime: str = Field(..., description="Start time (ISO format)")
    end_datetime: str = Field(..., description="End time (ISO format)")
    exclude_booking_id: Optional[str] = Field(None, description="Booking ID to exclude from check")

class VenueAvailabilityResponse(BaseModel):
    """Response model for venue availability check"""
    is_available: bool = Field(..., description="Whether venue is available")
    conflicting_bookings: List[Dict[str, Any]] = Field(default=[], description="List of conflicting bookings")
    message: str = Field(..., description="Human readable message")

class BulkBookingItem(BaseModel):
    """Individual booking item for bulk operations"""
    booking_id: str = Field(..., description="Booking ID to process")
    reason: Optional[str] = Field(None, description="Individual reason for this booking (overrides common reason)")

class BulkActionResult(BaseModel):
    """Result of a bulk action on a single booking"""
    booking_id: str = Field(..., description="Booking ID that was processed")
    status: str = Field(..., description="Result status: 'approved', 'rejected', or 'failed'")
    venue_name: Optional[str] = Field(None, description="Name of the venue")
    event_name: Optional[str] = Field(None, description="Name of the event")
    reason: Optional[str] = Field(None, description="Reason for the action")
    error: Optional[str] = Field(None, description="Error message if action failed")

class VenueBookingBulkActionRequest(BaseModel):
    """Request model for bulk venue booking actions"""
    action: str = Field(..., description="Action to perform: 'approve' or 'reject'")
    booking_ids: List[str] = Field(..., min_length=1, description="List of booking IDs to process")
    admin_notes: Optional[str] = Field(None, description="Admin notes for approval")
    rejection_reason: Optional[str] = Field(None, description="Reason for rejection (required if action is reject)")
    
    @field_validator('action')
    @classmethod
    def validate_action(cls, v):
        if v not in ['approve', 'reject']:
            raise ValueError('Action must be "approve" or "reject"')
        return v
    
    @model_validator(mode='after')
    def validate_rejection_reason(self):
        if self.action == 'reject' and not self.rejection_reason:
            raise ValueError('rejection_reason is required when action is "reject"')
        return self

class VenueBookingBulkActionResponse(BaseModel):
    """Response model for bulk venue booking actions"""
    success: bool = Field(..., description="Overall success status")
    message: str = Field(..., description="Summary message")
    results: List[BulkActionResult] = Field(default_factory=list, description="Individual booking results")
    summary: Dict[str, int] = Field(default_factory=dict, description="Action summary statistics")
