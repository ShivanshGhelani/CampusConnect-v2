"""
Test Registration API - Event Lifecycle Implementation
======================================================
Integration tests for the new registration API endpoints
"""

import pytest
import asyncio
from datetime import datetime
from fastapi.testclient import TestClient
from unittest.mock import Mock, AsyncMock, patch
import sys
import os

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from models.registration import RegistrationResponse, DashboardData

class TestRegistrationAPI:
    """Test suite for Registration API endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    def mock_student_user(self):
        """Mock student user for authentication"""
        user = Mock()
        user.enrollment_no = "22BEIT30043"
        user.user_type = "student"
        return user
    
    @pytest.fixture
    def mock_organizer_user(self):
        """Mock organizer user for authentication"""
        user = Mock()
        user.employee_id = "EMP001"
        user.user_type = "faculty"
        return user
    
    @patch('api.v1.registrations.get_current_student')
    @patch('services.registration_service.SimpleRegistrationService.register_student')
    def test_register_individual_success(self, mock_register, mock_auth, client, mock_student_user):
        """Test successful individual registration"""
        # Mock authentication
        mock_auth.return_value = mock_student_user
        
        # Mock service response
        mock_register.return_value = RegistrationResponse(
            success=True,
            message="Registration successful",
            registration_id="REG_22BEIT30043_EVT001"
        )
        
        # Test request
        response = client.post(
            "/api/v1/registrations/individual/EVT001",
            json={"additional_info": "test"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Registration successful"
        assert data["registration_id"] == "REG_22BEIT30043_EVT001"
    
    @patch('api.v1.registrations.get_current_student')
    @patch('services.registration_service.SimpleRegistrationService.register_student')
    def test_register_team_success(self, mock_register, mock_auth, client, mock_student_user):
        """Test successful team registration"""
        mock_auth.return_value = mock_student_user
        
        mock_register.return_value = RegistrationResponse(
            success=True,
            message="Team registration successful",
            registration_id="REG_22BEIT30043_EVT001"
        )
        
        team_data = {
            "team_name": "Tech Enthusiasts",
            "team_leader": "22BEIT30043",
            "team_members": ["22BEIT30044", "22BEIT30045"]
        }
        
        response = client.post(
            "/api/v1/registrations/team/EVT001",
            json=team_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
    
    @patch('api.v1.registrations.get_current_student')
    @patch('services.registration_service.SimpleRegistrationService.get_registration_status')
    def test_get_registration_status(self, mock_status, mock_auth, client, mock_student_user):
        """Test getting registration status"""
        mock_auth.return_value = mock_student_user
        
        mock_status.return_value = {
            "registered": True,
            "registration": {
                "_id": "REG_22BEIT30043_EVT001",
                "status": "active"
            },
            "completion_status": {
                "completed_steps": 2,
                "total_steps": 4,
                "completion_percentage": 50.0
            }
        }
        
        response = client.get("/api/v1/registrations/status/EVT001")
        
        assert response.status_code == 200
        data = response.json()
        assert data["registered"] is True
        assert "completion_status" in data
    
    @patch('api.v1.registrations.get_current_student')
    @patch('services.registration_service.SimpleRegistrationService.mark_attendance')
    def test_mark_attendance(self, mock_attendance, mock_auth, client, mock_student_user):
        """Test marking attendance"""
        mock_auth.return_value = mock_student_user
        
        mock_attendance.return_value = RegistrationResponse(
            success=True,
            message="Attendance marked successfully"
        )
        
        attendance_data = {"session": 1, "location": "Room A"}
        
        response = client.post(
            "/api/v1/registrations/attendance/EVT001/mark",
            json=attendance_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "Attendance marked" in data["message"]
    
    @patch('api.v1.registrations.get_current_student')
    @patch('services.registration_service.SimpleRegistrationService.submit_feedback')
    def test_submit_feedback(self, mock_feedback, mock_auth, client, mock_student_user):
        """Test submitting feedback"""
        mock_auth.return_value = mock_student_user
        
        mock_feedback.return_value = RegistrationResponse(
            success=True,
            message="Feedback submitted successfully"
        )
        
        feedback_data = {
            "rating": 5,
            "comments": "Excellent workshop!"
        }
        
        response = client.post(
            "/api/v1/registrations/feedback/EVT001/submit",
            json=feedback_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "Feedback submitted" in data["message"]
    
    @patch('api.v1.registrations.get_current_student')
    @patch('services.registration_service.SimpleRegistrationService.get_student_dashboard')
    def test_student_dashboard(self, mock_dashboard, mock_auth, client, mock_student_user):
        """Test student dashboard endpoint"""
        mock_auth.return_value = mock_student_user
        
        mock_dashboard.return_value = DashboardData(
            user_type="student",
            data={
                "total_registrations": 3,
                "active_events": [{"event_id": "EVT001", "title": "Workshop 1"}],
                "completed_events": [{"event_id": "EVT002", "title": "Workshop 2"}],
                "certificates_available": [{"event_id": "EVT003", "title": "Seminar"}]
            }
        )
        
        response = client.get("/api/v1/registrations/student/dashboard")
        
        assert response.status_code == 200
        data = response.json()
        assert data["user_type"] == "student"
        assert data["data"]["total_registrations"] == 3
    
    @patch('api.v1.registrations.get_current_organizer')
    @patch('services.registration_service.SimpleRegistrationService.get_organizer_dashboard')
    def test_organizer_dashboard(self, mock_dashboard, mock_auth, client, mock_organizer_user):
        """Test organizer dashboard endpoint"""
        mock_auth.return_value = mock_organizer_user
        
        mock_dashboard.return_value = DashboardData(
            user_type="organizer",
            data={
                "event_id": "EVT001",
                "statistics": {
                    "total_registrations": 100,
                    "attendance_percentage": 85.0,
                    "feedback_percentage": 70.0
                },
                "real_time_data": {
                    "total_registered": 100,
                    "present_today": 85,
                    "feedback_submitted": 70
                }
            }
        )
        
        response = client.get("/api/v1/registrations/organizer/event/EVT001/dashboard")
        
        assert response.status_code == 200
        data = response.json()
        assert data["user_type"] == "organizer"
        assert data["data"]["event_id"] == "EVT001"
    
    @patch('api.v1.registrations.get_current_organizer')
    @patch('database.operations.DatabaseOperations.find_many')
    @patch('database.operations.DatabaseOperations.count_documents')
    def test_get_event_registrations(self, mock_count, mock_find, mock_auth, client, mock_organizer_user):
        """Test getting event registrations"""
        mock_auth.return_value = mock_organizer_user
        
        mock_registrations = [
            {"_id": "REG_001", "student": {"name": "John Doe"}},
            {"_id": "REG_002", "student": {"name": "Jane Smith"}}
        ]
        
        mock_find.return_value = mock_registrations
        mock_count.return_value = 2
        
        response = client.get("/api/v1/registrations/event/EVT001/registrations")
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_count"] == 2
        assert len(data["registrations"]) == 2
    
    @patch('api.v1.registrations.get_current_organizer')
    @patch('services.registration_service.SimpleRegistrationService.mark_attendance')
    def test_mark_bulk_attendance(self, mock_attendance, mock_auth, client, mock_organizer_user):
        """Test bulk attendance marking"""
        mock_auth.return_value = mock_organizer_user
        
        mock_attendance.return_value = RegistrationResponse(
            success=True,
            message="Attendance marked successfully"
        )
        
        attendance_list = [
            {"enrollment_no": "22BEIT30043", "present": True},
            {"enrollment_no": "22BEIT30044", "present": True}
        ]
        
        response = client.post(
            "/api/v1/registrations/attendance/EVT001/mark-bulk",
            json=attendance_list
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "Processed 2 attendance records" in data["message"]
    
    @patch('api.v1.registrations.get_current_organizer')
    @patch('database.operations.DatabaseOperations.find_many')
    def test_get_event_statistics(self, mock_find, mock_auth, client, mock_organizer_user):
        """Test getting event statistics"""
        mock_auth.return_value = mock_organizer_user
        
        mock_registrations = [
            {"registration": {"status": "active"}, "attendance": {"marked": True}, 
             "feedback": {"submitted": True}, "certificate": {"issued": False}},
            {"registration": {"status": "active"}, "attendance": {"marked": False}, 
             "feedback": {"submitted": False}, "certificate": {"issued": False}}
        ]
        
        mock_find.return_value = mock_registrations
        
        response = client.get("/api/v1/registrations/statistics/EVT001")
        
        assert response.status_code == 200
        data = response.json()
        assert data["event_id"] == "EVT001"
        assert "statistics" in data
    
    def test_invalid_authentication(self, client):
        """Test endpoints without authentication"""
        # Test student endpoint without auth
        response = client.post("/api/v1/registrations/individual/EVT001")
        assert response.status_code in [401, 403]  # Unauthorized or Forbidden
        
        # Test organizer endpoint without auth
        response = client.get("/api/v1/registrations/organizer/event/EVT001/dashboard")
        assert response.status_code in [401, 403]
    
    @patch('api.v1.registrations.get_current_student')
    @patch('services.registration_service.SimpleRegistrationService.register_student')
    def test_registration_error_handling(self, mock_register, mock_auth, client, mock_student_user):
        """Test error handling in registration"""
        mock_auth.return_value = mock_student_user
        
        # Mock service error
        mock_register.side_effect = Exception("Database connection failed")
        
        response = client.post("/api/v1/registrations/individual/EVT001")
        
        assert response.status_code == 500
        data = response.json()
        assert "Registration failed" in data["detail"]

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
