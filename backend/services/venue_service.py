"""
MongoDB-based Venue Service
Handles all venue CRUD operations using MongoDB
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from config.database import Database
from models.venue import VenueCreate, VenueUpdate, VenueBookingCreate, VenueBookingUpdate
from utils.id_generator import generate_venue_id, generate_booking_id
import logging

logger = logging.getLogger(__name__)

class VenueService:
    """Service class for venue operations using MongoDB"""
    
    def __init__(self):
        self.db_name = "CampusConnect"
        self.venues_collection = "venues"
        self.bookings_collection = "venue_bookings"
    
    async def get_database(self) -> AsyncIOMotorDatabase:
        """Get MongoDB database instance"""
        return await Database.get_database(self.db_name)
    
    async def create_venue(self, venue_data: VenueCreate) -> Dict[str, Any]:
        """Create a new venue in MongoDB"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            # Check if venue name already exists
            existing_venue = await db[self.venues_collection].find_one({
                "venue_name": {"$regex": f"^{venue_data.venue_name}$", "$options": "i"}
            })
            
            if existing_venue:
                raise ValueError("Venue with this name already exists")
            
            # Generate venue ID
            venue_id = generate_venue_id()
            
            # Create venue document
            venue_doc = {
                "venue_id": venue_id,
                "venue_name": venue_data.venue_name,
                "venue_type": venue_data.venue_type.value,
                "location": venue_data.location,
                "building": venue_data.building,
                "floor": venue_data.floor,
                "room_number": venue_data.room_number,
                "description": venue_data.description,
                "facilities": {
                    "capacity": venue_data.capacity,
                    "has_projector": venue_data.has_projector,
                    "has_audio_system": venue_data.has_audio_system,
                    "has_microphone": venue_data.has_microphone,
                    "has_whiteboard": venue_data.has_whiteboard,
                    "has_air_conditioning": venue_data.has_air_conditioning,
                    "has_wifi": venue_data.has_wifi,
                    "has_parking": venue_data.has_parking,
                    "additional_facilities": venue_data.additional_facilities
                },
                "contact_person": {
                    "name": venue_data.contact_name,
                    "designation": venue_data.contact_designation,
                    "phone": venue_data.contact_phone,
                    "email": venue_data.contact_email,
                    "department": venue_data.contact_department
                },
                "is_active": venue_data.is_active,
                "status": "available",
                "operating_hours": venue_data.operating_hours or {
                    "monday": {"start": "09:00", "end": "18:00"},
                    "tuesday": {"start": "09:00", "end": "18:00"},
                    "wednesday": {"start": "09:00", "end": "18:00"},
                    "thursday": {"start": "09:00", "end": "18:00"},
                    "friday": {"start": "09:00", "end": "18:00"},
                    "saturday": {"start": "09:00", "end": "18:00"},
                    "sunday": {"start": "09:00", "end": "18:00"}
                },
                "created_by": venue_data.created_by,
                "created_at": datetime.utcnow(),
                "updated_by": None,
                "updated_at": None
            }
            
            # Insert venue
            result = await db[self.venues_collection].insert_one(venue_doc)
            
            if result.inserted_id:
                # Return the created venue
                created_venue = await db[self.venues_collection].find_one({"_id": result.inserted_id})
                
                # Format the response to match VenueResponse model
                return {
                    "venue_id": created_venue["venue_id"],
                    "venue_name": created_venue["venue_name"],
                    "venue_type": created_venue["venue_type"],
                    "location": created_venue["location"],
                    "building": created_venue.get("building"),
                    "floor": created_venue.get("floor"),
                    "room_number": created_venue.get("room_number"),
                    "description": created_venue.get("description"),
                    "facilities": created_venue["facilities"],
                    "contact_person": created_venue["contact_person"],
                    "is_active": created_venue["is_active"],
                    "status": created_venue["status"],
                    "operating_hours": created_venue.get("operating_hours"),
                    "bookings": [],  # No bookings for newly created venue
                    "created_at": created_venue["created_at"].isoformat() if isinstance(created_venue["created_at"], datetime) else created_venue["created_at"],
                    "updated_at": created_venue["updated_at"].isoformat() if created_venue["updated_at"] and isinstance(created_venue["updated_at"], datetime) else None
                }
            else:
                raise Exception("Failed to create venue")
                
        except Exception as e:
            logger.error(f"Error creating venue: {e}")
            raise
    
    async def get_venues(self, filters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Get all venues with optional filtering"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            # Build query
            query = {}
            if filters:
                if filters.get('venue_type'):
                    query['venue_type'] = filters['venue_type']
                if filters.get('status'):
                    query['status'] = filters['status']
                if filters.get('is_active') is not None:
                    query['is_active'] = filters['is_active']
                if filters.get('search'):
                    search_term = filters['search']
                    query['$or'] = [
                        {"venue_name": {"$regex": search_term, "$options": "i"}},
                        {"location": {"$regex": search_term, "$options": "i"}}
                    ]
            
            # Get venues
            venues_cursor = db[self.venues_collection].find(query)
            venues = await venues_cursor.to_list(length=None)
            
            # Get booking counts for each venue and format response
            formatted_venues = []
            for venue in venues:
                # Count active bookings
                booking_count = await db[self.bookings_collection].count_documents({
                    "venue_id": venue["venue_id"],
                    "status": {"$nin": ["cancelled", "completed"]}
                })
                
                # Find next booking
                next_booking = await db[self.bookings_collection].find_one({
                    "venue_id": venue["venue_id"],
                    "status": {"$nin": ["cancelled", "completed"]},
                    "start_datetime": {"$gte": datetime.utcnow().isoformat()}
                }, sort=[("start_datetime", 1)])
                
                # Format next booking if exists
                formatted_next_booking = None
                if next_booking:
                    formatted_next_booking = {
                        "booking_id": next_booking["booking_id"],
                        "event_name": next_booking["event_name"],
                        "start_datetime": next_booking["start_datetime"],
                        "end_datetime": next_booking["end_datetime"]
                    }
                
                # Format venue for VenueListResponse
                formatted_venue = {
                    "venue_id": venue["venue_id"],
                    "venue_name": venue["venue_name"],
                    "venue_type": venue["venue_type"],
                    "location": venue["location"],
                    "capacity": venue.get("facilities", {}).get("capacity", 0),
                    "is_active": venue["is_active"],
                    "status": venue["status"],
                    "current_bookings_count": booking_count,
                    "next_booking": formatted_next_booking
                }
                formatted_venues.append(formatted_venue)
            
            return formatted_venues
            
        except Exception as e:
            logger.error(f"Error getting venues: {e}")
            raise
    
    async def get_venue_by_id(self, venue_id: str) -> Optional[Dict[str, Any]]:
        """Get a single venue by ID"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            venue = await db[self.venues_collection].find_one({"venue_id": venue_id})
            
            if venue:
                # Get bookings for this venue
                bookings_cursor = db[self.bookings_collection].find({"venue_id": venue_id})
                bookings = await bookings_cursor.to_list(length=None)
                
                # Format bookings
                formatted_bookings = []
                for booking in bookings:
                    formatted_bookings.append({
                        "booking_id": booking["booking_id"],
                        "event_id": booking["event_id"],
                        "event_name": booking["event_name"],
                        "booked_by": booking["booked_by"],
                        "booked_by_name": booking["booked_by_name"],
                        "booking_date": booking["booking_date"].isoformat() if isinstance(booking["booking_date"], datetime) else booking["booking_date"],
                        "start_datetime": booking["start_datetime"],
                        "end_datetime": booking["end_datetime"],
                        "status": booking["status"],
                        "notes": booking.get("notes")
                    })
                
                # Format venue for VenueResponse
                return {
                    "venue_id": venue["venue_id"],
                    "venue_name": venue["venue_name"],
                    "venue_type": venue["venue_type"],
                    "location": venue["location"],
                    "building": venue.get("building"),
                    "floor": venue.get("floor"),
                    "room_number": venue.get("room_number"),
                    "description": venue.get("description"),
                    "facilities": venue["facilities"],
                    "contact_person": venue["contact_person"],
                    "is_active": venue["is_active"],
                    "status": venue["status"],
                    "operating_hours": venue.get("operating_hours"),
                    "bookings": formatted_bookings,
                    "created_at": venue["created_at"].isoformat() if isinstance(venue["created_at"], datetime) else venue["created_at"],
                    "updated_at": venue["updated_at"].isoformat() if venue["updated_at"] and isinstance(venue["updated_at"], datetime) else None
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting venue {venue_id}: {e}")
            raise
    
    async def update_venue(self, venue_id: str, venue_data: VenueUpdate) -> Optional[Dict[str, Any]]:
        """Update a venue"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            # Build update document
            update_doc = {"updated_at": datetime.utcnow()}
            
            if venue_data.venue_name:
                update_doc["venue_name"] = venue_data.venue_name
            if venue_data.venue_type:
                update_doc["venue_type"] = venue_data.venue_type.value
            if venue_data.location:
                update_doc["location"] = venue_data.location
            if venue_data.building:
                update_doc["building"] = venue_data.building
            if venue_data.floor:
                update_doc["floor"] = venue_data.floor
            if venue_data.room_number:
                update_doc["room_number"] = venue_data.room_number
            if venue_data.description:
                update_doc["description"] = venue_data.description
            if venue_data.facilities:
                update_doc["facilities"] = venue_data.facilities.model_dump()
            if venue_data.contact_person:
                update_doc["contact_person"] = venue_data.contact_person.model_dump()
            if venue_data.is_active is not None:
                update_doc["is_active"] = venue_data.is_active
            if venue_data.status:
                update_doc["status"] = venue_data.status.value
            if venue_data.operating_hours:
                update_doc["operating_hours"] = venue_data.operating_hours
            
            # Update venue
            result = await db[self.venues_collection].update_one(
                {"venue_id": venue_id},
                {"$set": update_doc}
            )
            
            if result.modified_count > 0:
                return await self.get_venue_by_id(venue_id)
            else:
                return None
                
        except Exception as e:
            logger.error(f"Error updating venue {venue_id}: {e}")
            raise
    
    async def delete_venue(self, venue_id: str) -> bool:
        """Delete a venue"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            # Check if venue has active bookings
            active_bookings = await db[self.bookings_collection].count_documents({
                "venue_id": venue_id,
                "status": {"$nin": ["cancelled", "completed"]}
            })
            
            if active_bookings > 0:
                raise ValueError("Cannot delete venue with active bookings")
            
            # Delete venue
            result = await db[self.venues_collection].delete_one({"venue_id": venue_id})
            
            return result.deleted_count > 0
            
        except Exception as e:
            logger.error(f"Error deleting venue {venue_id}: {e}")
            raise
    
    async def create_booking(self, venue_id: str, booking_data: VenueBookingCreate) -> Dict[str, Any]:
        """Create a venue booking"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            # Check if venue exists
            venue = await db[self.venues_collection].find_one({"venue_id": venue_id})
            if not venue:
                raise ValueError("Venue not found")
            
            # Parse datetime strings
            start_datetime = datetime.fromisoformat(booking_data.start_datetime.replace('Z', '+00:00'))
            end_datetime = datetime.fromisoformat(booking_data.end_datetime.replace('Z', '+00:00'))
            
            # Check availability
            conflicting_booking = await db[self.bookings_collection].find_one({
                "venue_id": venue_id,
                "status": {"$nin": ["cancelled"]},
                "$or": [
                    {
                        "start_datetime": {"$lt": end_datetime},
                        "end_datetime": {"$gt": start_datetime}
                    }
                ]
            })
            
            if conflicting_booking:
                raise ValueError("Venue is not available for the requested time slot")
            
            # Generate booking ID
            booking_id = generate_booking_id()
            
            # Create booking document
            booking_doc = {
                "booking_id": booking_id,
                "venue_id": venue_id,
                "event_id": booking_data.event_id,
                "event_name": booking_data.event_name,
                "booked_by": booking_data.booked_by,
                "booked_by_name": booking_data.booked_by_name,
                "booking_date": datetime.utcnow(),
                "start_datetime": start_datetime,
                "end_datetime": end_datetime,
                "status": "pending",
                "notes": booking_data.notes,
                "confirmed_by": None,
                "confirmed_at": None
            }
            
            # Insert booking
            result = await db[self.bookings_collection].insert_one(booking_doc)
            
            if result.inserted_id:
                created_booking = await db[self.bookings_collection].find_one({"_id": result.inserted_id})
                created_booking["_id"] = str(created_booking["_id"])
                return created_booking
            else:
                raise Exception("Failed to create booking")
                
        except Exception as e:
            logger.error(f"Error creating booking for venue {venue_id}: {e}")
            raise
    
    async def get_statistics(self) -> Dict[str, Any]:
        """Get venue statistics"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            # Count venues
            total_venues = await db[self.venues_collection].count_documents({})
            active_venues = await db[self.venues_collection].count_documents({"is_active": True})
            
            # Count bookings
            total_bookings = await db[self.bookings_collection].count_documents({})
            active_bookings = await db[self.bookings_collection].count_documents({
                "status": {"$nin": ["cancelled", "completed"]}
            })
            
            return {
                "total_venues": total_venues,
                "active_venues": active_venues,
                "inactive_venues": total_venues - active_venues,
                "total_bookings": total_bookings,
                "active_bookings": active_bookings,
                "completed_bookings": await db[self.bookings_collection].count_documents({"status": "completed"}),
                "cancelled_bookings": await db[self.bookings_collection].count_documents({"status": "cancelled"})
            }
            
        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            raise

# Create singleton instance
venue_service = VenueService()
