"""
Unit tests for Venue Service
"""
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta
from bson import ObjectId
from services.venue_service import VenueService
from models.venue import VenueCreate, VenueUpdate, VenueBookingCreate
from tests.mocks import MockDatabase, MockCollection


class TestVenueService:
    """Test cases for VenueService."""
    
    @pytest.fixture
    def venue_service(self):
        """Create VenueService instance for testing."""
        return VenueService()
    
    @pytest.fixture
    def mock_db(self):
        """Create mock database for testing."""
        return MockDatabase()
    
    @pytest_asyncio.fixture
    async def venue_create_data(self):
        """Sample venue creation data."""
        return VenueCreate(
            venue_name="Test Conference Hall",
            venue_type="conference_hall",
            capacity=100,
            location="Main Building",
            description="A test conference hall",
            features=["Projector", "Sound System"]
        )
    
    @pytest.mark.asyncio
    async def test_create_venue_success(self, venue_service, mock_db, venue_create_data):
        """Test successful venue creation."""
        with patch.object(venue_service, 'get_database', return_value=mock_db):
            with patch('core.id_generator.generate_venue_id', return_value="VEN12345678"):
                result = await venue_service.create_venue(venue_create_data)
        
        assert result["success"]
        assert result["venue_id"] == "VEN12345678"
        assert result["message"] == "Venue created successfully"
    
    @pytest.mark.asyncio
    async def test_create_venue_duplicate_name(self, venue_service, mock_db, venue_create_data):
        """Test venue creation with duplicate name."""
        # Mock existing venue
        mock_db["venues"].documents.append({
            "venue_name": "Test Conference Hall",
            "venue_id": "VEN11111111"
        })
        
        with patch.object(venue_service, 'get_database', return_value=mock_db):
            with pytest.raises(ValueError, match="Venue with this name already exists"):
                await venue_service.create_venue(venue_create_data)
    
    @pytest.mark.asyncio
    async def test_get_venue_by_id_success(self, venue_service, mock_db):
        """Test successful venue retrieval by ID."""
        # Add test venue to mock database
        test_venue = {
            "venue_id": "VEN12345678",
            "venue_name": "Test Hall",
            "venue_type": "classroom",
            "capacity": 50,
            "location": "Building A",
            "is_active": True
        }
        mock_db["venues"].documents.append(test_venue)
        
        with patch.object(venue_service, 'get_database', return_value=mock_db):
            result = await venue_service.get_venue_by_id("VEN12345678")
        
        assert result is not None
        assert result["venue_id"] == "VEN12345678"
        assert result["venue_name"] == "Test Hall"
    
    @pytest.mark.asyncio
    async def test_get_venue_by_id_not_found(self, venue_service, mock_db):
        """Test venue retrieval with non-existent ID."""
        with patch.object(venue_service, 'get_database', return_value=mock_db):
            result = await venue_service.get_venue_by_id("NONEXISTENT")
        
        assert result is None
    
    @pytest.mark.asyncio
    async def test_get_all_venues(self, venue_service, mock_db):
        """Test retrieving all venues."""
        # Add test venues to mock database
        test_venues = [
            {
                "venue_id": "VEN11111111",
                "venue_name": "Hall 1",
                "venue_type": "classroom",
                "capacity": 30,
                "is_active": True
            },
            {
                "venue_id": "VEN22222222",
                "venue_name": "Hall 2",
                "venue_type": "conference_hall",
                "capacity": 100,
                "is_active": True
            }
        ]
        mock_db["venues"].documents.extend(test_venues)
        
        with patch.object(venue_service, 'get_database', return_value=mock_db):
            result = await venue_service.get_all_venues()
        
        assert len(result) == 2
        assert result[0]["venue_name"] == "Hall 1"
        assert result[1]["venue_name"] == "Hall 2"
    
    @pytest.mark.asyncio
    async def test_get_active_venues_only(self, venue_service, mock_db):
        """Test retrieving only active venues."""
        # Add test venues (one active, one inactive)
        test_venues = [
            {
                "venue_id": "VEN11111111",
                "venue_name": "Active Hall",
                "is_active": True
            },
            {
                "venue_id": "VEN22222222",
                "venue_name": "Inactive Hall",
                "is_active": False
            }
        ]
        mock_db["venues"].documents.extend(test_venues)
        
        with patch.object(venue_service, 'get_database', return_value=mock_db):
            result = await venue_service.get_all_venues(active_only=True)
        
        assert len(result) == 1
        assert result[0]["venue_name"] == "Active Hall"
    
    @pytest.mark.asyncio
    async def test_update_venue_success(self, venue_service, mock_db):
        """Test successful venue update."""
        # Add existing venue
        mock_db["venues"].documents.append({
            "venue_id": "VEN12345678",
            "venue_name": "Old Name",
            "capacity": 50
        })
        
        update_data = VenueUpdate(
            venue_name="Updated Name",
            capacity=75
        )
        
        with patch.object(venue_service, 'get_database', return_value=mock_db):
            result = await venue_service.update_venue("VEN12345678", update_data)
        
        assert result["success"]
        assert result["message"] == "Venue updated successfully"
    
    @pytest.mark.asyncio
    async def test_update_venue_not_found(self, venue_service, mock_db):
        """Test venue update with non-existent venue."""
        update_data = VenueUpdate(venue_name="Updated Name")
        
        with patch.object(venue_service, 'get_database', return_value=mock_db):
            with pytest.raises(ValueError, match="Venue not found"):
                await venue_service.update_venue("NONEXISTENT", update_data)
    
    @pytest.mark.asyncio
    async def test_delete_venue_success(self, venue_service, mock_db):
        """Test successful venue deletion (soft delete)."""
        # Add existing venue
        mock_db["venues"].documents.append({
            "venue_id": "VEN12345678",
            "venue_name": "To Delete",
            "is_active": True
        })
        
        with patch.object(venue_service, 'get_database', return_value=mock_db):
            result = await venue_service.delete_venue("VEN12345678")
        
        assert result["success"]
        assert result["message"] == "Venue deleted successfully"
    
    @pytest.mark.asyncio
    async def test_create_venue_booking_success(self, venue_service, mock_db):
        """Test successful venue booking creation."""
        # Add existing venue
        mock_db["venues"].documents.append({
            "venue_id": "VEN12345678",
            "venue_name": "Test Hall",
            "is_active": True
        })
        
        start_time = datetime.utcnow() + timedelta(days=1)
        end_time = start_time + timedelta(hours=2)
        
        booking_data = VenueBookingCreate(
            venue_id="VEN12345678",
            event_id="EVT12345678",
            start_time=start_time,
            end_time=end_time,
            purpose="Test Event"
        )
        
        with patch.object(venue_service, 'get_database', return_value=mock_db):
            with patch('core.id_generator.generate_booking_id', return_value="BOOK12345678"):
                result = await venue_service.create_venue_booking(booking_data, "ADM12345678")
        
        assert result["success"]
        assert result["booking_id"] == "BOOK12345678"
    
    @pytest.mark.asyncio
    async def test_create_venue_booking_conflict(self, venue_service, mock_db):
        """Test venue booking creation with time conflict."""
        # Add existing venue
        mock_db["venues"].documents.append({
            "venue_id": "VEN12345678",
            "venue_name": "Test Hall",
            "is_active": True
        })
        
        # Add existing booking
        start_time = datetime.utcnow() + timedelta(days=1)
        end_time = start_time + timedelta(hours=2)
        
        mock_db["venue_bookings"].documents.append({
            "venue_id": "VEN12345678",
            "start_time": start_time,
            "end_time": end_time,
            "status": "confirmed"
        })
        
        # Try to book overlapping time
        new_start = start_time + timedelta(minutes=30)
        new_end = new_start + timedelta(hours=2)
        
        booking_data = VenueBookingCreate(
            venue_id="VEN12345678",
            event_id="EVT12345678",
            start_time=new_start,
            end_time=new_end,
            purpose="Conflicting Event"
        )
        
        with patch.object(venue_service, 'get_database', return_value=mock_db):
            with pytest.raises(ValueError, match="Venue is already booked"):
                await venue_service.create_venue_booking(booking_data, "ADM12345678")
    
    @pytest.mark.asyncio
    async def test_get_venue_bookings(self, venue_service, mock_db):
        """Test retrieving venue bookings."""
        start_time = datetime.utcnow() + timedelta(days=1)
        end_time = start_time + timedelta(hours=2)
        
        # Add test bookings
        test_bookings = [
            {
                "booking_id": "BOOK11111111",
                "venue_id": "VEN12345678",
                "start_time": start_time,
                "end_time": end_time,
                "status": "confirmed"
            },
            {
                "booking_id": "BOOK22222222",
                "venue_id": "VEN12345678",
                "start_time": start_time + timedelta(days=1),
                "end_time": end_time + timedelta(days=1),
                "status": "pending"
            }
        ]
        mock_db["venue_bookings"].documents.extend(test_bookings)
        
        with patch.object(venue_service, 'get_database', return_value=mock_db):
            result = await venue_service.get_venue_bookings("VEN12345678")
        
        assert len(result) == 2
        assert result[0]["booking_id"] == "BOOK11111111"
        assert result[1]["booking_id"] == "BOOK22222222"
    
    @pytest.mark.asyncio
    async def test_check_venue_availability(self, venue_service, mock_db):
        """Test venue availability checking."""
        start_time = datetime.utcnow() + timedelta(days=1)
        end_time = start_time + timedelta(hours=2)
        
        # Add existing booking
        mock_db["venue_bookings"].documents.append({
            "venue_id": "VEN12345678",
            "start_time": start_time,
            "end_time": end_time,
            "status": "confirmed"
        })
        
        with patch.object(venue_service, 'get_database', return_value=mock_db):
            # Check overlapping time - should be unavailable
            available = await venue_service.check_venue_availability(
                "VEN12345678",
                start_time + timedelta(minutes=30),
                end_time + timedelta(minutes=30)
            )
            assert not available
            
            # Check non-overlapping time - should be available
            available = await venue_service.check_venue_availability(
                "VEN12345678",
                end_time + timedelta(hours=1),
                end_time + timedelta(hours=3)
            )
            assert available
