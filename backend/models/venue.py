"""
Simple Venue Model for University Venue Listing
No booking system, just a list of available venues
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


class Venue(BaseModel):
    """Simple venue model for listing university venues"""
    venue_id: str = Field(..., description="Unique venue identifier")
    name: str = Field(..., description="Venue name")
    location: str = Field(..., description="Venue location/address")
    description: Optional[str] = Field(default=None, description="Venue description")
    capacity: Optional[int] = Field(default=None, description="Maximum capacity")
    facilities: List[str] = Field(default=[], description="Available facilities (e.g., projector, AC, etc.)")
    venue_type: str = Field(..., description="Type of venue (auditorium, classroom, hall, etc.)")
    is_active: bool = Field(default=True, description="Whether venue is active/available")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")
    created_by: str = Field(..., description="Admin who added this venue")
    updated_by: Optional[str] = Field(default=None, description="Admin who last updated this venue")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class VenueCreate(BaseModel):
    """Model for creating a new venue"""
    name: str = Field(..., description="Venue name")
    location: str = Field(..., description="Venue location/address")
    description: Optional[str] = Field(default=None, description="Venue description")
    capacity: Optional[int] = Field(default=None, description="Maximum capacity")
    facilities: List[str] = Field(default=[], description="Available facilities")
    venue_type: str = Field(..., description="Type of venue")


class VenueUpdate(BaseModel):
    """Model for updating venue information"""
    name: Optional[str] = Field(default=None, description="Venue name")
    location: Optional[str] = Field(default=None, description="Venue location/address")
    description: Optional[str] = Field(default=None, description="Venue description")
    capacity: Optional[int] = Field(default=None, description="Maximum capacity")
    facilities: Optional[List[str]] = Field(default=None, description="Available facilities")
    venue_type: Optional[str] = Field(default=None, description="Type of venue")
    is_active: Optional[bool] = Field(default=None, description="Whether venue is active")


class VenueResponse(BaseModel):
    """Response model for venue operations"""
    success: bool
    message: str
    venue: Optional[Venue] = None
    venues: Optional[List[Venue]] = None


# Predefined venue types for consistency
VENUE_TYPES = [
    "auditorium",
    "classroom", 
    "conference_hall",
    "seminar_hall",
    "laboratory",
    "sports_ground",
    "library_hall",
    "cafeteria",
    "outdoor_space",
    "multipurpose_hall",
    "other"
]

# Common facilities for venues
COMMON_FACILITIES = [
    "projector",
    "sound_system",
    "microphone",
    "air_conditioning",
    "wifi",
    "whiteboard",
    "smart_board",
    "stage",
    "seating_arrangement",
    "parking",
    "accessibility_features",
    "catering_facility"
]
