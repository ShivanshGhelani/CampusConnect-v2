"""
API tests for client event endpoints
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock
from datetime import datetime, timedelta
from main import app


class TestClientEventAPI:
    """Test cases for client event API endpoints."""
    
    @pytest.mark.asyncio
    async def test_get_active_events(self, test_client: AsyncClient, mock_database):
        """Test retrieving active events for students."""
        # Add test events
        future_time = datetime.utcnow() + timedelta(days=7)
        test_events = [
            {
                "event_id": "EVT11111111",
                "title": "Active Event 1",
                "description": "First active event",
                "start_time": future_time,
                "registration_end": future_time - timedelta(hours=1),
                "status": "active",
                "is_active": True
            },
            {
                "event_id": "EVT22222222",
                "title": "Active Event 2",
                "description": "Second active event",
                "start_time": future_time + timedelta(days=1),
                "registration_end": future_time + timedelta(days=1) - timedelta(hours=1),
                "status": "active",
                "is_active": True
            },
            {
                "event_id": "EVT33333333",
                "title": "Inactive Event",
                "description": "This should not appear",
                "status": "cancelled",
                "is_active": False
            }
        ]
        mock_database["events"].documents.extend(test_events)
        
        response = await test_client.get("/api/v1/client/events")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"]
        assert len(data["events"]) == 2
        assert data["events"][0]["title"] == "Active Event 1"
        assert data["events"][1]["title"] == "Active Event 2"
    
    @pytest.mark.asyncio
    async def test_get_event_details(self, test_client: AsyncClient, mock_database):
        """Test retrieving specific event details."""
        # Add test event
        test_event = {
            "event_id": "EVT12345678",
            "title": "Test Event Details",
            "description": "Detailed event description",
            "event_type": "Workshop",
            "start_time": datetime.utcnow() + timedelta(days=5),
            "max_participants": 50,
            "registration_fee": 100.0,
            "venue_id": "VEN12345678",
            "status": "active"
        }
        mock_database["events"].documents.append(test_event)
        
        # Add venue details
        mock_database["venues"].documents.append({
            "venue_id": "VEN12345678",
            "venue_name": "Test Hall",
            "location": "Main Building"
        })
        
        response = await test_client.get("/api/v1/client/events/EVT12345678")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"]
        assert data["event"]["event_id"] == "EVT12345678"
        assert data["event"]["title"] == "Test Event Details"
    
    @pytest.mark.asyncio
    async def test_register_for_event_success(self, test_client: AsyncClient, mock_database, authenticated_student_session):
        """Test successful event registration."""
        # Add test event
        future_time = datetime.utcnow() + timedelta(days=7)
        test_event = {
            "event_id": "EVT12345678",
            "title": "Registration Test Event",
            "start_time": future_time,
            "registration_end": future_time - timedelta(hours=1),
            "max_participants": 50,
            "registration_fee": 0.0,
            "is_team_event": False,
            "status": "active"
        }
        mock_database["events"].documents.append(test_event)
        
        # Add student data
        mock_database["students"].documents.append({
            "enrollment_no": "TEST001",
            "email": "test.student@college.edu",
            "full_name": "Test Student",
            "events_participated": []
        })
        
        with patch('core.id_generator.generate_registration_id', return_value="REG12345678"):
            with patch('fastapi.Request.session', authenticated_student_session):
                response = await test_client.post("/api/v1/client/events/EVT12345678/register")
        
        assert response.status_code == 201
        data = response.json()
        assert data["success"]
        assert data["registration_id"] == "REG12345678"
        assert data["message"] == "Registration successful"
    
    @pytest.mark.asyncio
    async def test_register_for_event_already_registered(self, test_client: AsyncClient, mock_database, authenticated_student_session):
        """Test registration when already registered."""
        # Add test event
        test_event = {
            "event_id": "EVT12345678",
            "title": "Test Event",
            "status": "active"
        }
        mock_database["events"].documents.append(test_event)
        
        # Add existing registration
        mock_database["registrations"].documents.append({
            "event_id": "EVT12345678",
            "student_enrollment": "TEST001",
            "registration_id": "REG11111111"
        })
        
        with patch('fastapi.Request.session', authenticated_student_session):
            response = await test_client.post("/api/v1/client/events/EVT12345678/register")
        
        assert response.status_code == 400
        data = response.json()
        assert not data["success"]
        assert "already registered" in data["message"]
    
    @pytest.mark.asyncio
    async def test_register_for_event_registration_closed(self, test_client: AsyncClient, mock_database, authenticated_student_session):
        """Test registration when registration period is closed."""
        # Add test event with closed registration
        past_time = datetime.utcnow() - timedelta(hours=1)
        test_event = {
            "event_id": "EVT12345678",
            "title": "Closed Registration Event",
            "registration_end": past_time,
            "status": "active"
        }
        mock_database["events"].documents.append(test_event)
        
        with patch('fastapi.Request.session', authenticated_student_session):
            response = await test_client.post("/api/v1/client/events/EVT12345678/register")
        
        assert response.status_code == 400
        data = response.json()
        assert not data["success"]
        assert "registration closed" in data["message"].lower()
    
    @pytest.mark.asyncio
    async def test_register_team_event_success(self, test_client: AsyncClient, mock_database, authenticated_student_session):
        """Test successful team event registration."""
        # Add team event
        future_time = datetime.utcnow() + timedelta(days=7)
        test_event = {
            "event_id": "EVT12345678",
            "title": "Team Event",
            "start_time": future_time,
            "registration_end": future_time - timedelta(hours=1),
            "is_team_event": True,
            "max_team_size": 4,
            "max_participants": 20,
            "status": "active"
        }
        mock_database["events"].documents.append(test_event)
        
        # Add student data
        mock_database["students"].documents.append({
            "enrollment_no": "TEST001",
            "email": "test.student@college.edu",
            "full_name": "Test Student"
        })
        
        team_data = {
            "team_name": "Test Team",
            "team_members": [
                {"enrollment_no": "TEST002", "full_name": "Member 2"},
                {"enrollment_no": "TEST003", "full_name": "Member 3"}
            ]
        }
        
        with patch('core.id_generator.generate_team_registration_id', return_value="TEAM123456"):
            with patch('core.id_generator.generate_registration_id', side_effect=["REG1", "REG2", "REG3"]):
                with patch('fastapi.Request.session', authenticated_student_session):
                    response = await test_client.post(
                        "/api/v1/client/events/EVT12345678/register/team",
                        json=team_data
                    )
        
        assert response.status_code == 201
        data = response.json()
        assert data["success"]
        assert data["team_registration_id"] == "TEAM123456"
    
    @pytest.mark.asyncio
    async def test_get_student_registrations(self, test_client: AsyncClient, mock_database, authenticated_student_session):
        """Test retrieving student's event registrations."""
        # Add test registrations
        test_registrations = [
            {
                "registration_id": "REG11111111",
                "event_id": "EVT11111111",
                "student_enrollment": "TEST001",
                "registration_date": datetime.utcnow()
            },
            {
                "registration_id": "REG22222222",
                "event_id": "EVT22222222",
                "student_enrollment": "TEST001",
                "registration_date": datetime.utcnow()
            }
        ]
        mock_database["registrations"].documents.extend(test_registrations)
        
        # Add corresponding events
        test_events = [
            {
                "event_id": "EVT11111111",
                "title": "Event 1",
                "start_time": datetime.utcnow() + timedelta(days=3)
            },
            {
                "event_id": "EVT22222222",
                "title": "Event 2",
                "start_time": datetime.utcnow() + timedelta(days=5)
            }
        ]
        mock_database["events"].documents.extend(test_events)
        
        with patch('fastapi.Request.session', authenticated_student_session):
            response = await test_client.get("/api/v1/client/registrations")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"]
        assert len(data["registrations"]) == 2
    
    @pytest.mark.asyncio
    async def test_cancel_registration_success(self, test_client: AsyncClient, mock_database, authenticated_student_session):
        """Test successful registration cancellation."""
        # Add test registration
        mock_database["registrations"].documents.append({
            "registration_id": "REG12345678",
            "event_id": "EVT12345678",
            "student_enrollment": "TEST001",
            "status": "active"
        })
        
        # Add event (should allow cancellation before start)
        mock_database["events"].documents.append({
            "event_id": "EVT12345678",
            "title": "Cancellable Event",
            "start_time": datetime.utcnow() + timedelta(days=3)
        })
        
        with patch('fastapi.Request.session', authenticated_student_session):
            response = await test_client.delete("/api/v1/client/registrations/REG12345678")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"]
        assert data["message"] == "Registration cancelled successfully"
    
    @pytest.mark.asyncio
    async def test_submit_feedback_success(self, test_client: AsyncClient, mock_database, authenticated_student_session):
        """Test successful feedback submission."""
        # Add test registration with attendance
        mock_database["registrations"].documents.append({
            "registration_id": "REG12345678",
            "event_id": "EVT12345678",
            "student_enrollment": "TEST001",
            "attendance_id": "ATT12345678"
        })
        
        # Add past event
        mock_database["events"].documents.append({
            "event_id": "EVT12345678",
            "title": "Past Event",
            "end_time": datetime.utcnow() - timedelta(hours=2)
        })
        
        feedback_data = {
            "overall_rating": 4,
            "content_rating": 5,
            "organization_rating": 4,
            "venue_rating": 3,
            "comments": "Great event, learned a lot!"
        }
        
        with patch('core.id_generator.generate_feedback_id', return_value="FB123456"):
            with patch('fastapi.Request.session', authenticated_student_session):
                response = await test_client.post(
                    "/api/v1/client/events/EVT12345678/feedback",
                    json=feedback_data
                )
        
        assert response.status_code == 201
        data = response.json()
        assert data["success"]
        assert data["feedback_id"] == "FB123456"
    
    @pytest.mark.asyncio
    async def test_unauthenticated_access(self, test_client: AsyncClient):
        """Test unauthenticated access to protected endpoints."""
        response = await test_client.post("/api/v1/client/events/EVT12345678/register")
        
        assert response.status_code == 401
        data = response.json()
        assert not data["success"]
        assert "Authentication required" in data["message"]
    
    @pytest.mark.asyncio
    async def test_event_not_found(self, test_client: AsyncClient, mock_database):
        """Test accessing non-existent event."""
        response = await test_client.get("/api/v1/client/events/NONEXISTENT")
        
        assert response.status_code == 404
        data = response.json()
        assert not data["success"]
        assert "Event not found" in data["message"]
    
    @pytest.mark.asyncio
    async def test_registration_capacity_full(self, test_client: AsyncClient, mock_database, authenticated_student_session):
        """Test registration when event is at capacity."""
        # Add event at capacity
        test_event = {
            "event_id": "EVT12345678",
            "title": "Full Event",
            "max_participants": 2,
            "registration_end": datetime.utcnow() + timedelta(hours=1),
            "status": "active"
        }
        mock_database["events"].documents.append(test_event)
        
        # Add existing registrations to fill capacity
        mock_database["registrations"].documents.extend([
            {
                "event_id": "EVT12345678",
                "student_enrollment": "OTHER001",
                "status": "active"
            },
            {
                "event_id": "EVT12345678",
                "student_enrollment": "OTHER002",
                "status": "active"
            }
        ])
        
        with patch('fastapi.Request.session', authenticated_student_session):
            response = await test_client.post("/api/v1/client/events/EVT12345678/register")
        
        assert response.status_code == 400
        data = response.json()
        assert not data["success"]
        assert "full" in data["message"].lower() or "capacity" in data["message"].lower()
