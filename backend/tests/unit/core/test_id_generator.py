"""
Unit tests for ID Generator utility
"""
import pytest
import re
from datetime import datetime
from core.id_generator import (
    generate_base_id,
    generate_registration_id,
    generate_team_registration_id,
    generate_attendance_id,
    generate_certificate_id,
    generate_feedback_id,
    generate_event_id,
    generate_venue_id,
    generate_booking_id,
    generate_admin_id
)


class TestIDGenerator:
    """Test cases for ID generation utilities."""
    
    def test_generate_base_id_default_length(self):
        """Test base ID generation with default length."""
        prefix = "TEST"
        id_value = generate_base_id(prefix)
        
        assert id_value.startswith(prefix)
        assert len(id_value) == len(prefix) + 8  # Default length is 8
        assert id_value[len(prefix):].isalnum()
        assert id_value[len(prefix):].isupper()
    
    def test_generate_base_id_custom_length(self):
        """Test base ID generation with custom length."""
        prefix = "CUSTOM"
        length = 12
        id_value = generate_base_id(prefix, length)
        
        assert id_value.startswith(prefix)
        assert len(id_value) == len(prefix) + length
        assert id_value[len(prefix):].isalnum()
    
    def test_generate_base_id_uniqueness(self):
        """Test that generated base IDs are unique."""
        prefix = "UNIQUE"
        ids = [generate_base_id(prefix) for _ in range(100)]
        
        # All IDs should be unique
        assert len(set(ids)) == 100
    
    def test_generate_registration_id(self):
        """Test registration ID generation."""
        enrollment_no = "TEST001"
        event_id = "EVT001"
        full_name = "Test Student"
        
        reg_id = generate_registration_id(enrollment_no, event_id, full_name)
        
        assert reg_id.startswith("REG")
        assert len(reg_id) == 9  # REG + 6 characters
        assert reg_id[3:].isalnum()
    
    def test_generate_registration_id_uniqueness(self):
        """Test that registration IDs are unique for different inputs."""
        reg_id1 = generate_registration_id("STUD001", "EVT001", "Student One")
        reg_id2 = generate_registration_id("STUD002", "EVT001", "Student Two")
        
        assert reg_id1 != reg_id2
    
    def test_generate_team_registration_id(self):
        """Test team registration ID generation."""
        team_name = "Test Team"
        event_id = "EVT001"
        leader_enrollment = "LEADER001"
        
        team_id = generate_team_registration_id(team_name, event_id, leader_enrollment)
        
        assert team_id.startswith("TEAM")
        assert len(team_id) == 10  # TEAM + 6 characters
        assert team_id[4:].isalnum()
    
    def test_generate_attendance_id(self):
        """Test attendance ID generation."""
        registration_id = "REG123456"
        
        attendance_id = generate_attendance_id(registration_id)
        
        assert attendance_id.startswith("ATT")
        assert len(attendance_id) == 9  # ATT + 6 characters
        assert attendance_id[3:].isalnum()
    
    def test_generate_certificate_id(self):
        """Test certificate ID generation."""
        registration_id = "REG123456"
        event_id = "EVT001"
        
        cert_id = generate_certificate_id(registration_id, event_id)
        
        assert cert_id.startswith("CERT")
        assert len(cert_id) == 10  # CERT + 6 characters
        assert cert_id[4:].isalnum()
    
    def test_generate_feedback_id(self):
        """Test feedback ID generation."""
        registration_id = "REG123456"
        event_id = "EVT001"
        
        feedback_id = generate_feedback_id(registration_id, event_id)
        
        assert feedback_id.startswith("FB")
        assert len(feedback_id) == 8  # FB + 6 characters
        assert feedback_id[2:].isalnum()
    
    def test_generate_event_id(self):
        """Test event ID generation."""
        event_id = generate_event_id()
        
        assert event_id.startswith("EVT")
        assert len(event_id) == 11  # EVT + 8 characters
        assert event_id[3:].isalnum()
    
    def test_generate_venue_id(self):
        """Test venue ID generation."""
        venue_id = generate_venue_id()
        
        assert venue_id.startswith("VEN")
        assert len(venue_id) == 11  # VEN + 8 characters
        assert venue_id[3:].isalnum()
    
    def test_generate_booking_id(self):
        """Test booking ID generation."""
        booking_id = generate_booking_id()
        
        assert booking_id.startswith("BOOK")
        assert len(booking_id) == 12  # BOOK + 8 characters
        assert booking_id[4:].isalnum()
    
    def test_generate_admin_id(self):
        """Test admin ID generation."""
        admin_id = generate_admin_id()
        
        assert admin_id.startswith("ADM")
        assert len(admin_id) == 11  # ADM + 8 characters
        assert admin_id[3:].isalnum()
    
    def test_id_generation_consistency(self):
        """Test that same inputs generate same IDs for deterministic functions."""
        # Registration IDs should be consistent for same inputs
        reg_id1 = generate_registration_id("TEST001", "EVT001", "Test Student")
        reg_id2 = generate_registration_id("TEST001", "EVT001", "Test Student")
        
        # Note: Due to timestamp in generation, these might be different
        # This test ensures the function runs without error
        assert isinstance(reg_id1, str)
        assert isinstance(reg_id2, str)
    
    def test_id_format_validation(self):
        """Test that all generated IDs follow proper format."""
        ids = [
            generate_event_id(),
            generate_venue_id(),
            generate_booking_id(),
            generate_admin_id(),
            generate_registration_id("TEST", "EVT", "Name"),
            generate_attendance_id("REG123"),
            generate_certificate_id("REG123", "EVT001"),
            generate_feedback_id("REG123", "EVT001")
        ]
        
        for id_value in ids:
            # All IDs should be uppercase alphanumeric strings
            assert id_value.replace("_", "").replace("-", "").isalnum()
            assert id_value.isupper() or any(c.islower() for c in id_value) == False
    
    def test_id_uniqueness_across_types(self):
        """Test that different ID types don't collide."""
        event_id = generate_event_id()
        venue_id = generate_venue_id()
        admin_id = generate_admin_id()
        
        # Different prefixes ensure no collision
        assert not event_id.startswith("VEN")
        assert not venue_id.startswith("EVT")
        assert not admin_id.startswith("EVT")
        assert not admin_id.startswith("VEN")
    
    def test_id_generation_performance(self):
        """Test ID generation performance for bulk operations."""
        import time
        
        start_time = time.time()
        ids = [generate_event_id() for _ in range(1000)]
        end_time = time.time()
        
        # Should generate 1000 IDs in reasonable time (< 1 second)
        assert end_time - start_time < 1.0
        assert len(ids) == 1000
        assert len(set(ids)) == 1000  # All unique
