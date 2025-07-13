"""
Unit tests for Student model
"""
import pytest
from datetime import datetime
from pydantic import ValidationError
from models.student import Student, StudentUpdate, EventParticipation


class TestStudent:
    """Test cases for Student model."""
    
    def test_student_creation_valid_data(self, sample_student_data):
        """Test student creation with valid data."""
        student = Student(**sample_student_data)
        
        assert student.enrollment_no == "TEST001"
        assert student.email == "test.student@college.edu"
        assert student.mobile_no == "9876543210"
        assert student.full_name == "Test Student"
        assert student.department == "Information Technology"
        assert student.semester == 5
    
    def test_student_creation_invalid_email(self, sample_student_data):
        """Test student creation with invalid email."""
        sample_student_data["email"] = "invalid-email"
        
        with pytest.raises(ValidationError):
            Student(**sample_student_data)
    
    def test_student_creation_invalid_mobile(self, sample_student_data):
        """Test student creation with invalid mobile number."""
        sample_student_data["mobile_no"] = "123"  # Too short
        
        with pytest.raises(ValidationError):
            Student(**sample_student_data)
        
        sample_student_data["mobile_no"] = "abcdefghij"  # Non-numeric
        
        with pytest.raises(ValidationError):
            Student(**sample_student_data)
    
    def test_student_creation_invalid_semester(self, sample_student_data):
        """Test student creation with invalid semester."""
        sample_student_data["semester"] = 0  # Too low
        
        with pytest.raises(ValidationError):
            Student(**sample_student_data)
        
        sample_student_data["semester"] = 9  # Too high
        
        with pytest.raises(ValidationError):
            Student(**sample_student_data)
    
    def test_student_password_hashing(self, sample_student_data):
        """Test password hashing functionality."""
        student = Student(**sample_student_data)
        plain_password = "test_password"
        
        # Test password verification using the static method
        assert Student.verify_password(plain_password, student.password_hash)
        assert not Student.verify_password("wrong_password", student.password_hash)


class TestStudentUpdate:
    """Test cases for StudentUpdate model."""
    
    def test_student_update_valid_data(self):
        """Test student update with valid data."""
        update_data = {
            "full_name": "Updated Name",
            "department": "Computer Science",
            "semester": 6,
            "mobile_no": "9999999999"
        }
        
        student_update = StudentUpdate(**update_data)
        
        assert student_update.full_name == "Updated Name"
        assert student_update.department == "Computer Science"
        assert student_update.semester == 6
        assert student_update.mobile_no == "9999999999"
    
    def test_student_update_partial_data(self):
        """Test student update with partial data."""
        update_data = {
            "full_name": "Updated Name"
        }
        
        student_update = StudentUpdate(**update_data)
        
        assert student_update.full_name == "Updated Name"
        assert student_update.department is None
        assert student_update.semester is None
        assert student_update.mobile_no is None
    
    def test_student_update_invalid_name_length(self):
        """Test student update with invalid name length."""
        update_data = {
            "full_name": "A"  # Too short
        }
        
        with pytest.raises(ValidationError):
            StudentUpdate(**update_data)
    
    def test_student_update_invalid_semester(self):
        """Test student update with invalid semester."""
        update_data = {
            "semester": 0  # Too low
        }
        
        with pytest.raises(ValidationError):
            StudentUpdate(**update_data)


class TestEventParticipation:
    """Test cases for EventParticipation model."""
    
    def test_event_participation_creation(self):
        """Test event participation creation."""
        participation_data = {
            "registration_id": "REG001",
            "registration_type": "individual"
        }
        
        participation = EventParticipation(**participation_data)
        
        assert participation.registration_id == "REG001"
        assert participation.registration_type == "individual"
        assert participation.attendance_id is None
        assert participation.feedback_id is None
        assert participation.certificate_id is None
        assert not participation.certificate_email_sent
    
    def test_event_participation_team_event(self):
        """Test event participation for team event."""
        participation_data = {
            "registration_id": "REG001",
            "registration_type": "team_member",
            "team_name": "Test Team",
            "team_registration_id": "TEAM001"
        }
        
        participation = EventParticipation(**participation_data)
        
        assert participation.registration_type == "team_member"
        assert participation.team_name == "Test Team"
        assert participation.team_registration_id == "TEAM001"
    
    def test_event_participation_paid_event(self):
        """Test event participation for paid event."""
        participation_data = {
            "registration_id": "REG001",
            "registration_type": "individual",
            "payment_id": "PAY001",
            "payment_status": "complete"
        }
        
        participation = EventParticipation(**participation_data)
        
        assert participation.payment_id == "PAY001"
        assert participation.payment_status == "complete"
    
    def test_event_participation_default_values(self):
        """Test event participation default values."""
        participation_data = {
            "registration_id": "REG001",
            "registration_type": "individual"
        }
        
        participation = EventParticipation(**participation_data)
        
        assert isinstance(participation.registration_date, datetime)
        assert not participation.certificate_email_sent
        assert participation.attendance_id is None
        assert participation.feedback_id is None
