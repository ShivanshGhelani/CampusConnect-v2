"""
Integration tests for event management workflow
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock
from datetime import datetime, timedelta
from main import app


class TestEventWorkflowIntegration:
    """Integration tests for complete event management workflow."""
    
    @pytest.mark.asyncio
    async def test_complete_event_lifecycle(self, test_client: AsyncClient, mock_database, authenticated_admin_session, authenticated_student_session):
        """Test complete event lifecycle from creation to completion."""
        
        # Step 1: Admin creates venue
        venue_data = {
            "venue_name": "Integration Test Hall",
            "venue_type": "conference_hall",
            "capacity": 50,
            "location": "Test Building",
            "description": "A hall for integration testing"
        }
        
        with patch('core.id_generator.generate_venue_id', return_value="VEN12345678"):
            with patch('fastapi.Request.session', authenticated_admin_session):
                venue_response = await test_client.post("/api/v1/admin/venues", json=venue_data)
        
        assert venue_response.status_code == 201
        venue_result = venue_response.json()
        assert venue_result["success"]
        venue_id = venue_result["venue_id"]
        
        # Step 2: Admin creates event
        start_time = datetime.utcnow() + timedelta(days=7)
        end_time = start_time + timedelta(hours=2)
        
        event_data = {
            "title": "Integration Test Workshop",
            "description": "A workshop for integration testing",
            "event_type": "Workshop",
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "venue_id": venue_id,
            "max_participants": 30,
            "registration_fee": 0.0,
            "is_team_event": False
        }
        
        with patch('core.id_generator.generate_event_id', return_value="EVT12345678"):
            with patch('fastapi.Request.session', authenticated_admin_session):
                event_response = await test_client.post("/api/v1/admin/events", json=event_data)
        
        assert event_response.status_code == 201
        event_result = event_response.json()
        assert event_result["success"]
        event_id = event_result["event_id"]
        
        # Step 3: Student views available events
        public_events_response = await test_client.get("/api/v1/client/events")
        assert public_events_response.status_code == 200
        events_data = public_events_response.json()
        assert events_data["success"]
        
        # Find our created event
        created_event = None
        for event in events_data["events"]:
            if event["event_id"] == event_id:
                created_event = event
                break
        
        assert created_event is not None
        assert created_event["title"] == "Integration Test Workshop"
        
        # Step 4: Student registers for event
        with patch('core.id_generator.generate_registration_id', return_value="REG12345678"):
            with patch('fastapi.Request.session', authenticated_student_session):
                register_response = await test_client.post(f"/api/v1/client/events/{event_id}/register")
        
        assert register_response.status_code == 201
        register_result = register_response.json()
        assert register_result["success"]
        registration_id = register_result["registration_id"]
        
        # Step 5: Admin views event registrations
        with patch('fastapi.Request.session', authenticated_admin_session):
            registrations_response = await test_client.get(f"/api/v1/admin/events/{event_id}/registrations")
        
        assert registrations_response.status_code == 200
        registrations_data = registrations_response.json()
        assert registrations_data["success"]
        assert len(registrations_data["registrations"]) == 1
        assert registrations_data["registrations"][0]["registration_id"] == registration_id
        
        # Step 6: Admin marks attendance
        attendance_data = {
            "registration_ids": [registration_id],
            "present": True
        }
        
        with patch('core.id_generator.generate_attendance_id', return_value="ATT12345678"):
            with patch('fastapi.Request.session', authenticated_admin_session):
                attendance_response = await test_client.post(
                    f"/api/v1/admin/events/{event_id}/attendance",
                    json=attendance_data
                )
        
        assert attendance_response.status_code == 200
        attendance_result = attendance_response.json()
        assert attendance_result["success"]
        
        # Step 7: Student submits feedback (after event completion)
        feedback_data = {
            "overall_rating": 5,
            "content_rating": 4,
            "organization_rating": 5,
            "venue_rating": 4,
            "comments": "Excellent workshop, very informative!"
        }
        
        with patch('core.id_generator.generate_feedback_id', return_value="FB123456"):
            with patch('fastapi.Request.session', authenticated_student_session):
                feedback_response = await test_client.post(
                    f"/api/v1/client/events/{event_id}/feedback",
                    json=feedback_data
                )
        
        assert feedback_response.status_code == 201
        feedback_result = feedback_response.json()
        assert feedback_result["success"]
        
        # Step 8: Admin generates certificates
        with patch('core.js_certificate_generator.JSCertificateGenerator') as mock_cert_gen:
            mock_instance = mock_cert_gen.return_value
            mock_instance.generate_certificate = AsyncMock(return_value="certificate.pdf")
            
            with patch('fastapi.Request.session', authenticated_admin_session):
                certificate_response = await test_client.post(f"/api/v1/admin/events/{event_id}/certificates/generate")
        
        assert certificate_response.status_code == 200
        certificate_result = certificate_response.json()
        assert certificate_result["success"]
    
    @pytest.mark.asyncio
    async def test_team_event_workflow(self, test_client: AsyncClient, mock_database, authenticated_admin_session, authenticated_student_session):
        """Test team event registration and management workflow."""
        
        # Create team event
        start_time = datetime.utcnow() + timedelta(days=5)
        end_time = start_time + timedelta(hours=3)
        
        # Add venue first
        mock_database["venues"].documents.append({
            "venue_id": "VEN12345678",
            "venue_name": "Team Event Hall",
            "is_active": True
        })
        
        team_event_data = {
            "title": "Team Competition",
            "description": "A competitive team event",
            "event_type": "Competition",
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "venue_id": "VEN12345678",
            "max_participants": 20,  # 5 teams of 4
            "is_team_event": True,
            "max_team_size": 4,
            "registration_fee": 200.0
        }
        
        with patch('core.id_generator.generate_event_id', return_value="EVT87654321"):
            with patch('fastapi.Request.session', authenticated_admin_session):
                event_response = await test_client.post("/api/v1/admin/events", json=team_event_data)
        
        assert event_response.status_code == 201
        event_result = event_response.json()
        team_event_id = event_result["event_id"]
        
        # Team registration
        team_data = {
            "team_name": "Integration Test Team",
            "team_members": [
                {"enrollment_no": "MEMBER001", "full_name": "Member One"},
                {"enrollment_no": "MEMBER002", "full_name": "Member Two"},
                {"enrollment_no": "MEMBER003", "full_name": "Member Three"}
            ]
        }
        
        with patch('core.id_generator.generate_team_registration_id', return_value="TEAM123456"):
            with patch('core.id_generator.generate_registration_id', side_effect=["REG1", "REG2", "REG3", "REG4"]):
                with patch('fastapi.Request.session', authenticated_student_session):
                    team_register_response = await test_client.post(
                        f"/api/v1/client/events/{team_event_id}/register/team",
                        json=team_data
                    )
        
        assert team_register_response.status_code == 201
        team_register_result = team_register_response.json()
        assert team_register_result["success"]
        team_registration_id = team_register_result["team_registration_id"]
        
        # Admin views team registrations
        with patch('fastapi.Request.session', authenticated_admin_session):
            team_registrations_response = await test_client.get(f"/api/v1/admin/events/{team_event_id}/registrations")
        
        assert team_registrations_response.status_code == 200
        team_registrations_data = team_registrations_response.json()
        assert team_registrations_data["success"]
        # Should have 4 individual registrations (leader + 3 members)
        assert len(team_registrations_data["registrations"]) == 4
    
    @pytest.mark.asyncio
    async def test_event_cancellation_workflow(self, test_client: AsyncClient, mock_database, authenticated_admin_session, authenticated_student_session):
        """Test event cancellation and notification workflow."""
        
        # Create event with registrations
        future_time = datetime.utcnow() + timedelta(days=10)
        
        # Add venue and event
        mock_database["venues"].documents.append({
            "venue_id": "VEN12345678",
            "venue_name": "Cancellation Test Hall",
            "is_active": True
        })
        
        mock_database["events"].documents.append({
            "event_id": "EVT99999999",
            "title": "Event to Cancel",
            "start_time": future_time,
            "venue_id": "VEN12345678",
            "status": "active"
        })
        
        # Add some registrations
        mock_database["registrations"].documents.extend([
            {
                "registration_id": "REG111",
                "event_id": "EVT99999999",
                "student_enrollment": "STUD001"
            },
            {
                "registration_id": "REG222",
                "event_id": "EVT99999999",
                "student_enrollment": "STUD002"
            }
        ])
        
        # Cancel event
        with patch('fastapi.Request.session', authenticated_admin_session):
            cancel_response = await test_client.patch(
                "/api/v1/admin/events/EVT99999999",
                json={"status": "cancelled"}
            )
        
        assert cancel_response.status_code == 200
        cancel_result = cancel_response.json()
        assert cancel_result["success"]
        
        # Verify event is cancelled
        with patch('fastapi.Request.session', authenticated_admin_session):
            event_check_response = await test_client.get("/api/v1/admin/events/EVT99999999")
        
        assert event_check_response.status_code == 200
        event_check_data = event_check_response.json()
        assert event_check_data["event"]["status"] == "cancelled"
    
    @pytest.mark.asyncio
    async def test_concurrent_registration_handling(self, test_client: AsyncClient, mock_database, authenticated_student_session):
        """Test handling of concurrent registrations for limited capacity events."""
        
        # Create event with limited capacity
        future_time = datetime.utcnow() + timedelta(days=3)
        
        limited_event = {
            "event_id": "EVT11111111",
            "title": "Limited Capacity Event",
            "max_participants": 2,
            "registration_end": future_time - timedelta(hours=1),
            "status": "active"
        }
        mock_database["events"].documents.append(limited_event)
        
        # Add one existing registration
        mock_database["registrations"].documents.append({
            "event_id": "EVT11111111",
            "student_enrollment": "EXISTING001",
            "status": "active"
        })
        
        # Try to register (should succeed - 1 spot left)
        with patch('core.id_generator.generate_registration_id', return_value="REG12345678"):
            with patch('fastapi.Request.session', authenticated_student_session):
                first_registration = await test_client.post("/api/v1/client/events/EVT11111111/register")
        
        assert first_registration.status_code == 201
        
        # Add another student's registration to fill capacity
        mock_database["registrations"].documents.append({
            "event_id": "EVT11111111",
            "student_enrollment": "TEST001",  # From authenticated_student_session
            "registration_id": "REG12345678",
            "status": "active"
        })
        
        # Try to register again with different student (should fail - at capacity)
        different_student_session = {
            "student": {
                "enrollment_no": "DIFFERENT001",
                "email": "different@college.edu",
                "full_name": "Different Student"
            }
        }
        
        with patch('fastapi.Request.session', different_student_session):
            second_registration = await test_client.post("/api/v1/client/events/EVT11111111/register")
        
        assert second_registration.status_code == 400
        second_result = second_registration.json()
        assert "full" in second_result["message"].lower() or "capacity" in second_result["message"].lower()
    
    @pytest.mark.asyncio
    async def test_error_handling_workflow(self, test_client: AsyncClient, mock_database):
        """Test error handling throughout the workflow."""
        
        # Test various error scenarios
        
        # 1. Register for non-existent event
        response = await test_client.post("/api/v1/client/events/NONEXISTENT/register")
        assert response.status_code == 401  # Unauthenticated first
        
        # 2. Admin access without authentication
        response = await test_client.get("/api/v1/admin/events")
        assert response.status_code == 401
        
        # 3. Invalid event data
        invalid_event = {
            "title": "",  # Empty title
            "max_participants": -5  # Invalid capacity
        }
        
        response = await test_client.post("/api/v1/admin/events", json=invalid_event)
        assert response.status_code in [401, 422]  # Unauthorized or validation error
        
        # 4. Database connection error simulation
        with patch('config.database.Database.get_database', side_effect=Exception("Database error")):
            response = await test_client.get("/api/v1/client/events")
            assert response.status_code == 500
