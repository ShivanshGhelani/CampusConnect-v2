"""
Test configuration and shared fixtures for CampusConnect Backend
"""
import pytest
import pytest_asyncio
import asyncio
from typing import AsyncGenerator, Generator
from httpx import AsyncClient
from motor.motor_asyncio import AsyncIOMotorClient
from unittest.mock import AsyncMock, MagicMock, patch
import os
from datetime import datetime, timedelta

# Set test environment
os.environ["ENVIRONMENT"] = "test"
os.environ["MONGODB_URL"] = "mongodb://localhost:27017/campusconnect_test"

# Import after setting environment variables
from main import app
from config.database import Database


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def test_client() -> AsyncGenerator[AsyncClient, None]:
    """Create a test client for the FastAPI application."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


@pytest_asyncio.fixture
async def mock_database():
    """Mock database for testing without actual database operations."""
    mock_db = AsyncMock()
    
    # Mock common database operations
    mock_collection = AsyncMock()
    mock_db.__getitem__.return_value = mock_collection
    
    # Mock find operations
    mock_collection.find_one = AsyncMock(return_value=None)
    mock_collection.find = AsyncMock(return_value=[])
    mock_collection.insert_one = AsyncMock(return_value=MagicMock(inserted_id="test_id"))
    mock_collection.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
    mock_collection.delete_one = AsyncMock(return_value=MagicMock(deleted_count=1))
    mock_collection.count_documents = AsyncMock(return_value=0)
    
    with patch.object(Database, 'get_database', return_value=mock_db):
        yield mock_db


@pytest.fixture
def mock_smtp_pool():
    """Mock SMTP pool for email testing."""
    with patch('services.email.smtp_pool.smtp_pool') as mock_pool:
        mock_pool.get_connection = AsyncMock()
        mock_pool.return_connection = AsyncMock()
        mock_pool.shutdown = MagicMock()
        yield mock_pool


@pytest.fixture
def sample_student_data():
    """Sample student data for testing."""
    from models.student import Student
    
    password = "test_password"
    password_hash = Student.get_password_hash(password)
    
    return {
        "enrollment_no": "TEST001",
        "email": "test.student@college.edu",
        "mobile_no": "9876543210",
        "full_name": "Test Student",
        "department": "Information Technology",
        "semester": 5,
        "password_hash": password_hash,
        "date_of_birth": datetime(2000, 1, 15),
        "gender": "Male",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "last_login": datetime.utcnow()
    }


@pytest.fixture
def sample_admin_data():
    """Sample admin data for testing."""
    return {
        "fullname": "Test Admin",
        "username": "test_admin",
        "email": "admin@college.edu",
        "password": "admin_password123",
        "role": "event_admin",
        "is_active": True,
        "created_at": datetime.utcnow(),
        "last_login": datetime.utcnow(),
        "created_by": None,
        "assigned_events": [],
        "permissions": []
    }


@pytest.fixture
def sample_event_data():
    """Sample event data for testing."""
    start_time = datetime.utcnow() + timedelta(days=7)
    end_time = start_time + timedelta(hours=2)
    
    return {
        "event_id": "EVT001",
        "event_name": "Test Event",
        "event_type": "Workshop",
        "organizing_department": "Information Technology",
        "short_description": "A test event for testing purposes",
        "detailed_description": "A detailed description of the test event",
        "start_datetime": start_time,
        "end_datetime": end_time,
        "venue": "Test Hall",
        "venue_id": "VEN001",
        "mode": "offline",
        "status": "upcoming",
        "sub_status": "registration_not_started",
        "target_audience": "student",
        "is_xenesis_event": False,
        "organizers": ["ADM001"],
        "contacts": [{"name": "Test Admin", "email": "admin@test.com"}],
        "registration_mode": "individual",
        "min_participants": 1,
        "published": False,
        "is_paid": False,
        "is_team_based": False,
        "registrations": {},
        "team_registrations": {},
        "attendance": {},
        "total_registrations": 0,
        "participants_limit": 100,
        "custom_fields": []
    }


@pytest.fixture
def sample_venue_data():
    """Sample venue data for testing."""
    return {
        "venue_id": "VEN001",
        "venue_name": "Test Hall",
        "venue_type": "seminar_hall",
        "location": "Main Building, Ground Floor",
        "building": "Main Building",
        "floor": "Ground Floor",
        "room_number": "101",
        "description": "A test venue for testing purposes",
        "facilities": {
            "capacity": 100,
            "has_projector": True,
            "has_audio_system": True,
            "has_microphone": True,
            "has_whiteboard": True,
            "has_air_conditioning": True,
            "has_wifi": True,
            "has_parking": False,
            "additional_facilities": ["Sound System", "Stage"]
        },
        "contact_person": {
            "name": "Test Contact",
            "designation": "Venue Manager",
            "phone": "9876543210",
            "email": "contact@college.edu",
            "department": "Administration"
        },
        "is_active": True,
        "status": "available",
        "operating_hours": {
            "monday": {"start": "09:00", "end": "18:00"},
            "tuesday": {"start": "09:00", "end": "18:00"},
            "wednesday": {"start": "09:00", "end": "18:00"},
            "thursday": {"start": "09:00", "end": "18:00"},
            "friday": {"start": "09:00", "end": "18:00"},
            "saturday": {"start": "09:00", "end": "18:00"},
            "sunday": {"start": "09:00", "end": "18:00"}
        },
        "bookings": [],
        "created_by": "ADM001",
        "created_at": datetime.utcnow(),
        "updated_by": None,
        "updated_at": None
    }


@pytest.fixture
def mock_file_upload():
    """Mock file upload for testing."""
    class MockFile:
        def __init__(self, filename="test.jpg", content_type="image/jpeg"):
            self.filename = filename
            self.content_type = content_type
            self.file = MagicMock()
            
        async def read(self):
            return b"mock file content"
            
        async def seek(self, position):
            pass
    
    return MockFile()


@pytest.fixture
def authenticated_admin_session():
    """Mock authenticated admin session."""
    return {
        "admin": {
            "admin_id": "ADM001",
            "username": "test_admin",
            "email": "admin@college.edu",
            "full_name": "Test Admin",
            "role": "admin",
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "last_login": datetime.utcnow().isoformat()
        }
    }


@pytest.fixture
def authenticated_student_session():
    """Mock authenticated student session."""
    return {
        "student": {
            "enrollment_no": "TEST001",
            "email": "test.student@college.edu",
            "mobile_no": "9876543210",
            "full_name": "Test Student",
            "department": "Information Technology",
            "semester": 5,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "last_login": datetime.utcnow().isoformat(),
            "events_participated": []
        }
    }


@pytest.fixture
def mock_supabase_client():
    """Mock Supabase client for file storage testing."""
    mock_client = MagicMock()
    mock_storage = MagicMock()
    mock_bucket = MagicMock()
    
    mock_client.storage = mock_storage
    mock_storage.from_ = MagicMock(return_value=mock_bucket)
    mock_bucket.upload = MagicMock(return_value={"data": {"path": "test/path"}})
    mock_bucket.remove = MagicMock(return_value={"data": True})
    mock_bucket.get_public_url = MagicMock(return_value={"data": {"publicUrl": "http://test.url"}})
    
    return mock_client


@pytest.fixture
def mock_certificate_generator():
    """Mock certificate generator for testing."""
    with patch('core.js_certificate_generator.JSCertificateGenerator') as mock_gen:
        mock_instance = MagicMock()
        mock_gen.return_value = mock_instance
        mock_instance.generate_certificate = AsyncMock(return_value="test_certificate.pdf")
        yield mock_instance


# Cleanup fixtures
@pytest_asyncio.fixture
async def cleanup_test_data():
    """Cleanup test data after tests."""
    yield
    # Add any cleanup logic here if needed
    pass
