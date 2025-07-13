"""
Unit tests for Venue model
"""
import pytest
from datetime import datetime, timedelta
from pydantic import ValidationError
from models.venue import Venue, VenueCreate, VenueUpdate, VenueBooking, VenueBookingCreate


class TestVenue:
    """Test cases for Venue model."""
    
    def test_venue_creation_valid_data(self, sample_venue_data):
        """Test venue creation with valid data."""
        venue = Venue(**sample_venue_data)
        
        assert venue.venue_id == "VEN001"
        assert venue.venue_name == "Test Hall"
        assert venue.venue_type == "conference_hall"
        assert venue.capacity == 100
        assert venue.location == "Main Building"
        assert venue.is_active
    
    def test_venue_with_features(self, sample_venue_data):
        """Test venue with features list."""
        sample_venue_data["features"] = ["Projector", "Sound System", "AC"]
        
        venue = Venue(**sample_venue_data)
        
        assert len(venue.features) == 3
        assert "Projector" in venue.features
        assert "Sound System" in venue.features
        assert "AC" in venue.features
    
    def test_venue_negative_capacity_validation(self, sample_venue_data):
        """Test venue with negative capacity validation."""
        sample_venue_data["capacity"] = -10
        
        with pytest.raises(ValidationError):
            Venue(**sample_venue_data)
    
    def test_venue_name_length_validation(self, sample_venue_data):
        """Test venue name length validation."""
        sample_venue_data["venue_name"] = ""  # Too short
        
        with pytest.raises(ValidationError):
            Venue(**sample_venue_data)
        
        sample_venue_data["venue_name"] = "A" * 101  # Too long
        
        with pytest.raises(ValidationError):
            Venue(**sample_venue_data)
    
    def test_venue_default_values(self):
        """Test venue default values."""
        minimal_data = {
            "venue_id": "VEN002",
            "venue_name": "Simple Hall",
            "venue_type": "classroom",
            "capacity": 50,
            "location": "Building A"
        }
        
        venue = Venue(**minimal_data)
        
        assert venue.features == []
        assert venue.is_active
        assert isinstance(venue.created_at, datetime)
        assert isinstance(venue.updated_at, datetime)


class TestVenueCreate:
    """Test cases for VenueCreate model."""
    
    def test_venue_create_valid_data(self):
        """Test venue creation with valid data."""
        venue_data = {
            "venue_name": "New Conference Hall",
            "venue_type": "conference_hall",
            "capacity": 200,
            "location": "New Building",
            "description": "A spacious conference hall",
            "features": ["Smart Board", "Video Conferencing"]
        }
        
        venue_create = VenueCreate(**venue_data)
        
        assert venue_create.venue_name == "New Conference Hall"
        assert venue_create.capacity == 200
        assert len(venue_create.features) == 2
    
    def test_venue_create_minimal_data(self):
        """Test venue creation with minimal required data."""
        venue_data = {
            "venue_name": "Basic Room",
            "venue_type": "classroom",
            "capacity": 30,
            "location": "First Floor"
        }
        
        venue_create = VenueCreate(**venue_data)
        
        assert venue_create.venue_name == "Basic Room"
        assert venue_create.features == []
        assert venue_create.description is None
    
    def test_venue_create_invalid_type(self):
        """Test venue creation with invalid type."""
        venue_data = {
            "venue_name": "Test Venue",
            "venue_type": "invalid_type",
            "capacity": 50,
            "location": "Test Location"
        }
        
        with pytest.raises(ValidationError):
            VenueCreate(**venue_data)


class TestVenueUpdate:
    """Test cases for VenueUpdate model."""
    
    def test_venue_update_partial_data(self):
        """Test venue update with partial data."""
        update_data = {
            "venue_name": "Updated Hall Name",
            "capacity": 150
        }
        
        venue_update = VenueUpdate(**update_data)
        
        assert venue_update.venue_name == "Updated Hall Name"
        assert venue_update.capacity == 150
        assert venue_update.description is None
        assert venue_update.location is None
    
    def test_venue_update_features(self):
        """Test venue features update."""
        update_data = {
            "features": ["Updated Feature 1", "Updated Feature 2"]
        }
        
        venue_update = VenueUpdate(**update_data)
        
        assert len(venue_update.features) == 2
        assert "Updated Feature 1" in venue_update.features
    
    def test_venue_update_status(self):
        """Test venue status update."""
        update_data = {
            "is_active": False
        }
        
        venue_update = VenueUpdate(**update_data)
        
        assert not venue_update.is_active


class TestVenueBooking:
    """Test cases for VenueBooking model."""
    
    def test_venue_booking_creation(self):
        """Test venue booking creation."""
        start_time = datetime.utcnow() + timedelta(days=1)
        end_time = start_time + timedelta(hours=2)
        
        booking_data = {
            "booking_id": "BOOK001",
            "venue_id": "VEN001",
            "event_id": "EVT001",
            "booked_by": "ADM001",
            "start_time": start_time,
            "end_time": end_time,
            "purpose": "Workshop Session",
            "status": "confirmed"
        }
        
        booking = VenueBooking(**booking_data)
        
        assert booking.booking_id == "BOOK001"
        assert booking.venue_id == "VEN001"
        assert booking.event_id == "EVT001"
        assert booking.purpose == "Workshop Session"
        assert booking.status == "confirmed"
    
    def test_venue_booking_time_validation(self):
        """Test venue booking time validation."""
        start_time = datetime.utcnow() + timedelta(days=1)
        end_time = start_time - timedelta(hours=1)  # End before start
        
        booking_data = {
            "booking_id": "BOOK001",
            "venue_id": "VEN001",
            "booked_by": "ADM001",
            "start_time": start_time,
            "end_time": end_time,
            "purpose": "Test Booking"
        }
        
        with pytest.raises(ValidationError):
            VenueBooking(**booking_data)
    
    def test_venue_booking_default_status(self):
        """Test venue booking default status."""
        start_time = datetime.utcnow() + timedelta(days=1)
        end_time = start_time + timedelta(hours=2)
        
        booking_data = {
            "booking_id": "BOOK001",
            "venue_id": "VEN001",
            "booked_by": "ADM001",
            "start_time": start_time,
            "end_time": end_time,
            "purpose": "Test Booking"
        }
        
        booking = VenueBooking(**booking_data)
        
        assert booking.status == "pending"


class TestVenueBookingCreate:
    """Test cases for VenueBookingCreate model."""
    
    def test_venue_booking_create_valid_data(self):
        """Test venue booking creation with valid data."""
        start_time = datetime.utcnow() + timedelta(days=2)
        end_time = start_time + timedelta(hours=3)
        
        booking_data = {
            "venue_id": "VEN001",
            "event_id": "EVT001",
            "start_time": start_time,
            "end_time": end_time,
            "purpose": "Conference Meeting"
        }
        
        booking_create = VenueBookingCreate(**booking_data)
        
        assert booking_create.venue_id == "VEN001"
        assert booking_create.event_id == "EVT001"
        assert booking_create.purpose == "Conference Meeting"
    
    def test_venue_booking_create_without_event(self):
        """Test venue booking creation without event."""
        start_time = datetime.utcnow() + timedelta(days=2)
        end_time = start_time + timedelta(hours=1)
        
        booking_data = {
            "venue_id": "VEN001",
            "start_time": start_time,
            "end_time": end_time,
            "purpose": "General Meeting"
        }
        
        booking_create = VenueBookingCreate(**booking_data)
        
        assert booking_create.event_id is None
        assert booking_create.purpose == "General Meeting"
