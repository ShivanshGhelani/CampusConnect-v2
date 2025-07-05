from typing import Dict, List, Optional, Any
from datetime import datetime, time
from enum import Enum
from pydantic import BaseModel, Field, field_validator

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
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"

class VenueBooking(BaseModel):
    """Individual venue booking details"""
    booking_id: str = Field(..., description="Unique booking identifier")
    event_id: str = Field(..., description="Associated event ID")
    event_name: str = Field(..., description="Name of the event")
    booked_by: str = Field(..., description="User ID who booked the venue")
    booked_by_name: str = Field(..., description="Name of the person who booked")
    booking_date: datetime = Field(default_factory=datetime.utcnow, description="When the booking was made")
    start_datetime: datetime = Field(..., description="Booking start time")
    end_datetime: datetime = Field(..., description="Booking end time")
    status: BookingStatus = Field(default=BookingStatus.PENDING, description="Booking status")
    notes: Optional[str] = Field(None, description="Additional booking notes")
    confirmed_by: Optional[str] = Field(None, description="Admin who confirmed the booking")
    confirmed_at: Optional[datetime] = Field(None, description="When the booking was confirmed")

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
    venue_name: str = Field(..., min_length=1, max_length=200)
    venue_type: VenueType
    location: str = Field(..., min_length=1, max_length=500)
    building: Optional[str] = Field(None, max_length=100)
    floor: Optional[str] = Field(None, max_length=20)
    room_number: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=1000)
    facilities: VenueFacilities
    contact_person: VenueContact
    operating_hours: Optional[Dict[str, Dict[str, str]]] = None

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

class VenueBookingCreate(BaseModel):
    """Model for creating a venue booking"""
    event_id: str
    event_name: str
    start_datetime: datetime
    end_datetime: datetime
    notes: Optional[str] = None
    
    @field_validator('end_datetime')
    @classmethod
    def validate_end_datetime(cls, v, info):
        if 'start_datetime' in info.data and v <= info.data['start_datetime']:
            raise ValueError('End datetime must be after start datetime')
        return v

class VenueBookingUpdate(BaseModel):
    """Model for updating venue booking"""
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    status: Optional[BookingStatus] = None
    notes: Optional[str] = None

class VenueResponse(BaseModel):
    """Response model for venue"""
    venue_id: str
    venue_name: str
    venue_type: str
    location: str
    building: Optional[str]
    floor: Optional[str]
    room_number: Optional[str]
    description: Optional[str]
    facilities: VenueFacilities
    contact_person: VenueContact
    is_active: bool
    status: str
    operating_hours: Dict[str, Dict[str, str]]
    bookings: List[VenueBooking]
    created_at: datetime
    updated_at: Optional[datetime]

class VenueListResponse(BaseModel):
    """Response model for venue list"""
    venue_id: str
    venue_name: str
    venue_type: str
    location: str
    capacity: int
    is_active: bool
    status: str
    current_bookings_count: int
    next_booking: Optional[VenueBooking]

class VenueAvailabilityRequest(BaseModel):
    """Request model for checking venue availability"""
    start_datetime: datetime
    end_datetime: datetime
    
    @field_validator('end_datetime')
    @classmethod
    def validate_end_datetime(cls, v, info):
        if 'start_datetime' in info.data and v <= info.data['start_datetime']:
            raise ValueError('End datetime must be after start datetime')
        return v

class VenueAvailabilityResponse(BaseModel):
    """Response model for venue availability"""
    venue_id: str
    venue_name: str
    is_available: bool
    conflicts: List[VenueBooking]
    suggested_slots: List[Dict[str, datetime]]
