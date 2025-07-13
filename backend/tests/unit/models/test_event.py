"""
Unit tests for Event model
"""
import pytest
from datetime import datetime, timedelta
from pydantic import ValidationError
from models.event import Event, CreateEvent, UpdateEvent


class TestEvent:
    """Test cases for Event model."""
    
    def test_event_creation_valid_data(self, sample_event_data):
        """Test event creation with valid data."""
        event = Event(**sample_event_data)
        
        assert event.event_id == "EVT001"
        assert event.title == "Test Event"
        assert event.description == "A test event for testing purposes"
        assert event.event_type == "Workshop"
        assert event.max_participants == 100
        assert event.registration_fee == 0.0
        assert not event.is_team_event
        assert event.status == "active"
    
    def test_event_creation_team_event(self, sample_event_data):
        """Test team event creation."""
        sample_event_data.update({
            "is_team_event": True,
            "max_team_size": 5
        })
        
        event = Event(**sample_event_data)
        
        assert event.is_team_event
        assert event.max_team_size == 5
    
    def test_event_creation_paid_event(self, sample_event_data):
        """Test paid event creation."""
        sample_event_data["registration_fee"] = 500.0
        
        event = Event(**sample_event_data)
        
        assert event.registration_fee == 500.0
        assert event.is_paid_event
    
    def test_event_creation_free_event(self, sample_event_data):
        """Test free event creation."""
        sample_event_data["registration_fee"] = 0.0
        
        event = Event(**sample_event_data)
        
        assert event.registration_fee == 0.0
        assert not event.is_paid_event
    
    def test_event_time_validation(self, sample_event_data):
        """Test event time validation."""
        # End time before start time should be invalid
        sample_event_data["end_time"] = sample_event_data["start_time"] - timedelta(hours=1)
        
        with pytest.raises(ValidationError):
            Event(**sample_event_data)
    
    def test_event_registration_time_validation(self, sample_event_data):
        """Test registration time validation."""
        # Registration end after event start should be invalid
        sample_event_data["registration_end"] = sample_event_data["start_time"] + timedelta(hours=1)
        
        with pytest.raises(ValidationError):
            Event(**sample_event_data)
    
    def test_event_negative_fee_validation(self, sample_event_data):
        """Test negative registration fee validation."""
        sample_event_data["registration_fee"] = -100.0
        
        with pytest.raises(ValidationError):
            Event(**sample_event_data)
    
    def test_event_negative_participants_validation(self, sample_event_data):
        """Test negative max participants validation."""
        sample_event_data["max_participants"] = -10
        
        with pytest.raises(ValidationError):
            Event(**sample_event_data)
    
    def test_event_title_length_validation(self, sample_event_data):
        """Test event title length validation."""
        sample_event_data["title"] = "A" * 201  # Too long
        
        with pytest.raises(ValidationError):
            Event(**sample_event_data)
        
        sample_event_data["title"] = ""  # Too short
        
        with pytest.raises(ValidationError):
            Event(**sample_event_data)


class TestCreateEvent:
    """Test cases for CreateEvent model."""
    
    def test_event_create_valid_data(self):
        """Test event creation with valid data."""
        start_time = datetime.utcnow() + timedelta(days=7)
        end_time = start_time + timedelta(hours=2)
        
        event_data = {
            "title": "New Test Event",
            "description": "A new test event",
            "event_type": "Seminar",
            "start_time": start_time,
            "end_time": end_time,
            "venue_id": "VEN001",
            "max_participants": 50,
            "registration_fee": 100.0
        }
        
        event_create = CreateEvent(**event_data)
        
        assert event_create.title == "New Test Event"
        assert event_create.max_participants == 50
        assert event_create.registration_fee == 100.0
    
    def test_event_create_team_event(self):
        """Test team event creation."""
        start_time = datetime.utcnow() + timedelta(days=7)
        end_time = start_time + timedelta(hours=2)
        
        event_data = {
            "title": "Team Competition",
            "description": "A team competition event",
            "event_type": "Competition",
            "start_time": start_time,
            "end_time": end_time,
            "venue_id": "VEN001",
            "max_participants": 20,
            "is_team_event": True,
            "max_team_size": 4
        }
        
        event_create = CreateEvent(**event_data)
        
        assert event_create.is_team_event
        assert event_create.max_team_size == 4
    
    def test_event_create_with_registration_times(self):
        """Test event creation with custom registration times."""
        start_time = datetime.utcnow() + timedelta(days=7)
        end_time = start_time + timedelta(hours=2)
        reg_start = datetime.utcnow()
        reg_end = start_time - timedelta(hours=2)
        
        event_data = {
            "title": "Custom Registration Event",
            "description": "Event with custom registration times",
            "event_type": "Workshop",
            "start_time": start_time,
            "end_time": end_time,
            "venue_id": "VEN001",
            "max_participants": 30,
            "registration_start": reg_start,
            "registration_end": reg_end
        }
        
        event_create = CreateEvent(**event_data)
        
        assert event_create.registration_start == reg_start
        assert event_create.registration_end == reg_end


class TestUpdateEvent:
    """Test cases for UpdateEvent model."""
    
    def test_event_update_partial_data(self):
        """Test event update with partial data."""
        update_data = {
            "title": "Updated Event Title",
            "max_participants": 150
        }
        
        event_update = UpdateEvent(**update_data)
        
        assert event_update.title == "Updated Event Title"
        assert event_update.max_participants == 150
        assert event_update.description is None
        assert event_update.venue_id is None
    
    def test_event_update_status_change(self):
        """Test event status update."""
        update_data = {
            "status": "cancelled"
        }
        
        event_update = UpdateEvent(**update_data)
        
        assert event_update.status == "cancelled"
    
    def test_event_update_invalid_status(self):
        """Test event update with invalid status."""
        update_data = {
            "status": "invalid_status"
        }
        
        with pytest.raises(ValidationError):
            UpdateEvent(**update_data)
    
    def test_event_update_fee_change(self):
        """Test event registration fee update."""
        update_data = {
            "registration_fee": 250.0
        }
        
        event_update = UpdateEvent(**update_data)
        
        assert event_update.registration_fee == 250.0
    
    def test_event_update_team_settings(self):
        """Test team event settings update."""
        update_data = {
            "is_team_event": True,
            "max_team_size": 6
        }
        
        event_update = UpdateEvent(**update_data)
        
        assert event_update.is_team_event
        assert event_update.max_team_size == 6
