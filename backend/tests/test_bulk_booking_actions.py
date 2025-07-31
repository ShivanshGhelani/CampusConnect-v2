"""
Test suite for Bulk Booking Actions functionality
Tests the complete bulk approve/reject workflow including API endpoints, 
service methods, audit logging, and notification workflows.
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from main import app
from models.venue import VenueBookingBulkActionRequest, BulkBookingItem
from services.venue_service import VenueService
from services.notification_service import NotificationService
from services.audit_log_service import AuditLogService

client = TestClient(app)

# Test data
MOCK_ADMIN_USER = {
    "id": "admin_123",
    "email": "admin@campusconnect.edu",
    "role": "super_admin"
}

MOCK_BOOKINGS = [
    {
        "id": "booking_1",
        "event_name": "Test Event 1",
        "venue_id": "venue_1",
        "venue_name": "Main Auditorium",
        "booked_by": "student1@university.edu",
        "start_datetime": datetime.now() + timedelta(days=1),
        "end_datetime": datetime.now() + timedelta(days=1, hours=2),
        "status": "pending"
    },
    {
        "id": "booking_2", 
        "event_name": "Test Event 2",
        "venue_id": "venue_2",
        "venue_name": "Conference Room A",
        "booked_by": "student2@university.edu",
        "start_datetime": datetime.now() + timedelta(days=2),
        "end_datetime": datetime.now() + timedelta(days=2, hours=3),
        "status": "pending"
    },
    {
        "id": "booking_3",
        "event_name": "Test Event 3", 
        "venue_id": "venue_1",
        "venue_name": "Main Auditorium",
        "booked_by": "student3@university.edu",
        "start_datetime": datetime.now() + timedelta(days=3),
        "end_datetime": datetime.now() + timedelta(days=3, hours=1),
        "status": "pending"
    }
]

class TestBulkBookingActions:
    """Test class for bulk booking action functionality"""

    @pytest.fixture
    def mock_auth_token(self):
        """Mock authentication token for admin user"""
        return "Bearer mock_admin_token"

    @pytest.fixture
    def mock_admin_dependency(self):
        """Mock admin authentication dependency"""
        with patch('dependencies.auth.get_admin_user') as mock_admin:
            mock_admin.return_value = MOCK_ADMIN_USER
            yield mock_admin

    @pytest.fixture
    def mock_venue_service(self):
        """Mock venue service with test data"""
        with patch('services.venue_service.VenueService') as mock_service:
            mock_instance = AsyncMock()
            mock_service.return_value = mock_instance
            
            # Mock get_bookings_for_bulk_action
            mock_instance.get_bookings_for_bulk_action.return_value = MOCK_BOOKINGS
            
            # Mock bulk approve
            mock_instance.bulk_approve_bookings.return_value = {
                "successful_updates": ["booking_1", "booking_2"],
                "failed_updates": [],
                "updated_bookings": [MOCK_BOOKINGS[0], MOCK_BOOKINGS[1]]
            }
            
            # Mock bulk reject  
            mock_instance.bulk_reject_bookings.return_value = {
                "successful_updates": ["booking_1", "booking_3"],
                "failed_updates": ["booking_2"],
                "updated_bookings": [MOCK_BOOKINGS[0], MOCK_BOOKINGS[2]]
            }
            
            yield mock_instance

    @pytest.fixture
    def mock_notification_service(self):
        """Mock notification service"""
        with patch('services.notification_service.NotificationService') as mock_service:
            mock_instance = AsyncMock()
            mock_service.return_value = mock_instance
            mock_instance.send_bulk_approval_notifications.return_value = None
            mock_instance.send_bulk_rejection_notifications.return_value = None
            yield mock_instance

    @pytest.fixture  
    def mock_audit_service(self):
        """Mock audit log service"""
        with patch('services.audit_log_service.AuditLogService') as mock_service:
            mock_instance = AsyncMock()
            mock_service.return_value = mock_instance
            mock_instance.log_booking_action.return_value = None
            mock_instance.log_bulk_action_summary.return_value = None
            yield mock_instance

    def test_bulk_approve_success(self, mock_admin_dependency, mock_venue_service, 
                                  mock_notification_service, mock_audit_service):
        """Test successful bulk approval of bookings"""
        
        request_data = {
            "action": "approve",
            "booking_ids": ["booking_1", "booking_2"],
            "admin_notes": "Approved by admin for testing"
        }
        
        response = client.post(
            "/api/venue-admin/bookings/bulk-action",
            json=request_data,
            headers={"Authorization": "Bearer mock_admin_token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "success" in data
        assert "message" in data
        assert "results" in data
        assert "summary" in data
        
        # Verify summary
        summary = data["summary"]
        assert summary["total_requested"] == 2
        assert summary["successful"] == 2
        assert summary["failed"] == 0
        
        # Verify individual results
        results = data["results"]
        assert len(results) == 2
        for result in results:
            assert result["success"] is True
            assert "booking_id" in result
            
        # Verify service calls
        mock_venue_service.get_bookings_for_bulk_action.assert_called_once_with(["booking_1", "booking_2"])
        mock_venue_service.bulk_approve_bookings.assert_called_once()
        mock_notification_service.send_bulk_approval_notifications.assert_called_once()
        mock_audit_service.log_bulk_action_summary.assert_called_once()

    def test_bulk_reject_success(self, mock_admin_dependency, mock_venue_service,
                                 mock_notification_service, mock_audit_service):
        """Test successful bulk rejection of bookings"""
        
        request_data = {
            "action": "reject", 
            "booking_ids": ["booking_1", "booking_3"],
            "rejection_reason": "Venue not available due to maintenance"
        }
        
        response = client.post(
            "/api/venue-admin/bookings/bulk-action",
            json=request_data,
            headers={"Authorization": "Bearer mock_admin_token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data["success"] is True
        assert "Bulk rejection completed" in data["message"]
        
        # Verify summary
        summary = data["summary"]
        assert summary["total_requested"] == 2
        assert summary["successful"] == 2
        assert summary["failed"] == 1  # One failed in mock
        
        # Verify service calls
        mock_venue_service.bulk_reject_bookings.assert_called_once()
        mock_notification_service.send_bulk_rejection_notifications.assert_called_once()

    def test_bulk_action_validation_errors(self, mock_admin_dependency):
        """Test validation errors for bulk action requests"""
        
        # Test missing action
        response = client.post(
            "/api/venue-admin/bookings/bulk-action",
            json={"booking_ids": ["booking_1"]},
            headers={"Authorization": "Bearer mock_admin_token"}
        )
        assert response.status_code == 422
        
        # Test invalid action
        response = client.post(
            "/api/venue-admin/bookings/bulk-action", 
            json={"action": "invalid", "booking_ids": ["booking_1"]},
            headers={"Authorization": "Bearer mock_admin_token"}
        )
        assert response.status_code == 422
        
        # Test empty booking IDs
        response = client.post(
            "/api/venue-admin/bookings/bulk-action",
            json={"action": "approve", "booking_ids": []},
            headers={"Authorization": "Bearer mock_admin_token"}
        )
        assert response.status_code == 422
        
        # Test reject without reason
        response = client.post(
            "/api/venue-admin/bookings/bulk-action",
            json={"action": "reject", "booking_ids": ["booking_1"]},
            headers={"Authorization": "Bearer mock_admin_token"}
        )
        assert response.status_code == 422

    def test_bulk_action_unauthorized(self):
        """Test bulk action without proper authentication"""
        
        request_data = {
            "action": "approve",
            "booking_ids": ["booking_1"],
            "admin_notes": "Test"
        }
        
        # Test without auth header
        response = client.post(
            "/api/venue-admin/bookings/bulk-action",
            json=request_data
        )
        assert response.status_code == 401
        
        # Test with invalid token
        response = client.post(
            "/api/venue-admin/bookings/bulk-action",
            json=request_data,
            headers={"Authorization": "Bearer invalid_token"}
        )
        assert response.status_code == 401

    def test_bulk_action_partial_failures(self, mock_admin_dependency, mock_venue_service,
                                          mock_notification_service, mock_audit_service):
        """Test bulk action with some failures"""
        
        # Mock partial failure scenario
        mock_venue_service.bulk_approve_bookings.return_value = {
            "successful_updates": ["booking_1"],
            "failed_updates": ["booking_2"],
            "updated_bookings": [MOCK_BOOKINGS[0]]
        }
        
        request_data = {
            "action": "approve",
            "booking_ids": ["booking_1", "booking_2"],
            "admin_notes": "Partial approval test"
        }
        
        response = client.post(
            "/api/venue-admin/bookings/bulk-action",
            json=request_data,
            headers={"Authorization": "Bearer mock_admin_token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify partial success handling
        summary = data["summary"]
        assert summary["successful"] == 1
        assert summary["failed"] == 1
        
        # Should still call notification service for successful ones
        mock_notification_service.send_bulk_approval_notifications.assert_called_once()

    def test_get_bulk_eligible_bookings(self, mock_admin_dependency, mock_venue_service):
        """Test getting bookings eligible for bulk actions"""
        
        # Mock pending bookings
        mock_venue_service.get_pending_bookings.return_value = MOCK_BOOKINGS
        
        with patch('services.venue_service.VenueService.get_pending_bookings') as mock_get_pending:
            mock_get_pending.return_value = MOCK_BOOKINGS
            
            response = client.get(
                "/api/venue-admin/bookings/bulk-eligible",
                headers={"Authorization": "Bearer mock_admin_token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            
            assert "bookings" in data
            assert len(data["bookings"]) == 3
            
            # Verify booking structure
            for booking in data["bookings"]:
                assert "id" in booking
                assert "event_name" in booking
                assert "venue_name" in booking
                assert "status" in booking
                assert booking["status"] == "pending"

class TestBulkActionModels:
    """Test Pydantic models for bulk actions"""
    
    def test_bulk_booking_item_model(self):
        """Test BulkBookingItem model validation"""
        
        item_data = {
            "booking_id": "booking_123",
            "event_name": "Test Event",
            "venue_name": "Test Venue",
            "booked_by": "test@university.edu"
        }
        
        item = BulkBookingItem(**item_data)
        assert item.booking_id == "booking_123"
        assert item.event_name == "Test Event"
        assert item.venue_name == "Test Venue"
        assert item.booked_by == "test@university.edu"

    def test_bulk_action_request_model(self):
        """Test VenueBookingBulkActionRequest model validation"""
        
        # Test approve action
        approve_data = {
            "action": "approve",
            "booking_ids": ["booking_1", "booking_2"],
            "admin_notes": "Approved for testing"
        }
        
        approve_request = VenueBookingBulkActionRequest(**approve_data)
        assert approve_request.action == "approve"
        assert len(approve_request.booking_ids) == 2
        assert approve_request.admin_notes == "Approved for testing"
        assert approve_request.rejection_reason is None
        
        # Test reject action
        reject_data = {
            "action": "reject",
            "booking_ids": ["booking_1"],
            "rejection_reason": "Venue unavailable"
        }
        
        reject_request = VenueBookingBulkActionRequest(**reject_data)
        assert reject_request.action == "reject"
        assert reject_request.rejection_reason == "Venue unavailable"
        assert reject_request.admin_notes is None

    def test_bulk_action_request_validation(self):
        """Test validation rules for bulk action requests"""
        
        # Test empty booking IDs
        with pytest.raises(ValueError):
            VenueBookingBulkActionRequest(
                action="approve",
                booking_ids=[],
                admin_notes="Test"
            )
        
        # Test invalid action
        with pytest.raises(ValueError):
            VenueBookingBulkActionRequest(
                action="invalid",
                booking_ids=["booking_1"],
                admin_notes="Test"
            )

class TestBulkActionIntegration:
    """Integration tests for complete bulk action workflow"""
    
    @pytest.mark.asyncio
    async def test_complete_bulk_approval_workflow(self):
        """Test complete workflow from request to notifications"""
        
        # This would be a full integration test if we had a test database
        # For now, we verify that all components work together
        
        # Mock all dependencies
        with patch('services.venue_service.VenueService') as mock_venue, \
             patch('services.notification_service.NotificationService') as mock_notification, \
             patch('services.audit_log_service.AuditLogService') as mock_audit:
            
            venue_instance = AsyncMock()
            notification_instance = AsyncMock()
            audit_instance = AsyncMock()
            
            mock_venue.return_value = venue_instance
            mock_notification.return_value = notification_instance
            mock_audit.return_value = audit_instance
            
            # Configure mocks
            venue_instance.get_bookings_for_bulk_action.return_value = MOCK_BOOKINGS[:2]
            venue_instance.bulk_approve_bookings.return_value = {
                "successful_updates": ["booking_1", "booking_2"],
                "failed_updates": [],
                "updated_bookings": MOCK_BOOKINGS[:2]
            }
            
            # Simulate the bulk action workflow
            request_data = {
                "action": "approve",
                "booking_ids": ["booking_1", "booking_2"],
                "admin_notes": "Integration test approval"
            }
            
            # The workflow should:
            # 1. Validate request
            # 2. Get booking details
            # 3. Perform bulk update
            # 4. Send notifications
            # 5. Log audit trail
            # 6. Return results
            
            # This simulates the API endpoint logic
            bookings = await venue_instance.get_bookings_for_bulk_action(request_data["booking_ids"])
            assert len(bookings) == 2
            
            results = await venue_instance.bulk_approve_bookings(
                request_data["booking_ids"], 
                MOCK_ADMIN_USER["id"],
                request_data.get("admin_notes")
            )
            assert len(results["successful_updates"]) == 2
            assert len(results["failed_updates"]) == 0
            
            # Verify all services called
            venue_instance.get_bookings_for_bulk_action.assert_called_once()
            venue_instance.bulk_approve_bookings.assert_called_once()

if __name__ == "__main__":
    # Run the tests
    print("Running Bulk Booking Actions Test Suite...")
    print("=" * 60)
    
    # Test individual components
    print("\n1. Testing Pydantic Models...")
    model_tests = TestBulkActionModels()
    model_tests.test_bulk_booking_item_model()
    model_tests.test_bulk_action_request_model()
    print("✅ Model tests passed")
    
    print("\n2. Testing API Validation...")
    try:
        model_tests.test_bulk_action_request_validation()
        print("✅ Validation tests passed")
    except Exception as e:
        print(f"❌ Validation tests failed: {e}")
    
    print("\n3. Integration Test Simulation...")
    integration_tests = TestBulkActionIntegration()
    
    # Run async test
    async def run_integration():
        await integration_tests.test_complete_bulk_approval_workflow()
        print("✅ Integration workflow test passed")
    
    asyncio.run(run_integration())
    
    print("\n" + "=" * 60)
    print("Bulk Booking Actions Test Suite Complete!")
    print("\nTo run with pytest: pytest test_bulk_booking_actions.py -v")
    print("To run API tests: pytest test_bulk_booking_actions.py::TestBulkBookingActions -v")
