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
from core.id_generator import generate_venue_id, generate_booking_id
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
                    "is_active": created_venue.get("is_active", True),
                    "status": created_venue.get("status", "available"),
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
                    "is_active": venue.get("is_active", True),
                    "status": venue.get("status", "available"),
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
                    "is_active": venue.get("is_active", True),
                    "status": venue.get("status", "available"),
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
            if venue_data.building is not None:
                update_doc["building"] = venue_data.building
            if venue_data.floor is not None:
                update_doc["floor"] = venue_data.floor
            if venue_data.room_number is not None:
                update_doc["room_number"] = venue_data.room_number
            if venue_data.description is not None:
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
    
    async def update_venue_flexible(self, venue_id: str, venue_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a venue with flexible field handling"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            # Build update document
            update_doc = {"updated_at": datetime.utcnow()}
            
            # Basic venue fields
            if venue_data.get("venue_name"):
                update_doc["venue_name"] = venue_data["venue_name"]
            if venue_data.get("venue_type"):
                update_doc["venue_type"] = venue_data["venue_type"]
            if venue_data.get("location"):
                update_doc["location"] = venue_data["location"]
            if "building" in venue_data:
                update_doc["building"] = venue_data["building"]
            if "floor" in venue_data:
                update_doc["floor"] = venue_data["floor"]
            if "room_number" in venue_data:
                update_doc["room_number"] = venue_data["room_number"]
            if "description" in venue_data:
                update_doc["description"] = venue_data["description"]
            
            # Handle facilities updates
            facilities_updates = {}
            if "capacity" in venue_data:
                facilities_updates["capacity"] = venue_data["capacity"]
            if "has_projector" in venue_data:
                facilities_updates["has_projector"] = venue_data["has_projector"]
            if "has_audio_system" in venue_data:
                facilities_updates["has_audio_system"] = venue_data["has_audio_system"]
            if "has_microphone" in venue_data:
                facilities_updates["has_microphone"] = venue_data["has_microphone"]
            if "has_whiteboard" in venue_data:
                facilities_updates["has_whiteboard"] = venue_data["has_whiteboard"]
            if "has_air_conditioning" in venue_data:
                facilities_updates["has_air_conditioning"] = venue_data["has_air_conditioning"]
            if "has_wifi" in venue_data:
                facilities_updates["has_wifi"] = venue_data["has_wifi"]
            if "has_parking" in venue_data:
                facilities_updates["has_parking"] = venue_data["has_parking"]
            if "additional_facilities" in venue_data:
                facilities_updates["additional_facilities"] = venue_data["additional_facilities"]
            
            if facilities_updates:
                for key, value in facilities_updates.items():
                    update_doc[f"facilities.{key}"] = value
            
            # Handle contact person updates
            contact_updates = {}
            if "contact_name" in venue_data:
                contact_updates["name"] = venue_data["contact_name"]
            if "contact_designation" in venue_data:
                contact_updates["designation"] = venue_data["contact_designation"]
            if "contact_phone" in venue_data:
                contact_updates["phone"] = venue_data["contact_phone"]
            if "contact_email" in venue_data:
                contact_updates["email"] = venue_data["contact_email"]
            if "contact_department" in venue_data:
                contact_updates["department"] = venue_data["contact_department"]
            
            if contact_updates:
                for key, value in contact_updates.items():
                    update_doc[f"contact_person.{key}"] = value
            
            # Status fields
            if "is_active" in venue_data:
                update_doc["is_active"] = venue_data["is_active"]
            if "status" in venue_data:
                update_doc["status"] = venue_data["status"]
            if "operating_hours" in venue_data:
                update_doc["operating_hours"] = venue_data["operating_hours"]
            
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
                        "start_datetime": {"$lt": end_datetime.isoformat()},
                        "end_datetime": {"$gt": start_datetime.isoformat()}
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
                "start_datetime": start_datetime.isoformat(),
                "end_datetime": end_datetime.isoformat(),
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
    
    async def check_availability(self, venue_id: str, start_datetime: str, end_datetime: str, exclude_booking_id: Optional[str] = None) -> Dict[str, Any]:
        """Check if a venue is available for a specific time slot"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            # Parse datetime strings
            start_dt = datetime.fromisoformat(start_datetime.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(end_datetime.replace('Z', '+00:00'))
            
            # Build query to find conflicting bookings
            query = {
                "venue_id": venue_id,
                "status": {"$nin": ["cancelled"]},
                "$or": [
                    {
                        "start_datetime": {"$lt": end_dt.isoformat()},
                        "end_datetime": {"$gt": start_dt.isoformat()}
                    }
                ]
            }
            
            # Exclude specific booking if provided
            if exclude_booking_id:
                query["booking_id"] = {"$ne": exclude_booking_id}
            
            # Find conflicting bookings
            conflicting_bookings_cursor = db[self.bookings_collection].find(query)
            conflicting_bookings = await conflicting_bookings_cursor.to_list(length=None)
            
            is_available = len(conflicting_bookings) == 0
            
            return {
                "is_available": is_available,
                "conflicting_bookings": [
                    {
                        "booking_id": booking["booking_id"],
                        "event_name": booking["event_name"],
                        "start_datetime": booking["start_datetime"],
                        "end_datetime": booking["end_datetime"],
                        "status": booking["status"]
                    }
                    for booking in conflicting_bookings
                ],
                "message": "Venue is available" if is_available else f"Venue has {len(conflicting_bookings)} conflicting booking(s)"
            }
            
        except Exception as e:
            logger.error(f"Error checking availability for venue {venue_id}: {e}")
            raise
    
    async def get_venue_bookings(self, venue_id: str) -> List[Dict[str, Any]]:
        """Get all bookings for a specific venue"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
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
                    "notes": booking.get("notes"),
                    "confirmed_by": booking.get("confirmed_by"),
                    "confirmed_at": booking.get("confirmed_at").isoformat() if booking.get("confirmed_at") and isinstance(booking.get("confirmed_at"), datetime) else booking.get("confirmed_at")
                })
            
            return formatted_bookings
            
        except Exception as e:
            logger.error(f"Error getting bookings for venue {venue_id}: {e}")
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

    async def approve_venue_booking(
        self,
        venue_id: str,
        booking_id: str,
        approved_by: str,
        admin_notes: Optional[str] = None
    ) -> bool:
        """Approve a venue booking"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            current_time = datetime.utcnow()
            
            # Update booking status to approved
            result = await db[self.bookings_collection].update_one(
                {"booking_id": booking_id, "venue_id": venue_id},
                {
                    "$set": {
                        "status": "approved",
                        "approved_by": approved_by,
                        "approved_at": current_time,
                        "admin_notes": admin_notes
                    }
                }
            )
            
            if result.modified_count > 0:
                logger.info(f"Booking {booking_id} approved by {approved_by}")
                return True
            else:
                logger.warning(f"Booking {booking_id} not found for approval")
                return False
                
        except Exception as e:
            logger.error(f"Error approving booking {booking_id}: {e}")
            raise

    async def reject_venue_booking(
        self,
        venue_id: str,
        booking_id: str,
        rejected_by: str,
        rejection_reason: Optional[str] = None
    ) -> bool:
        """Reject a venue booking"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            current_time = datetime.utcnow()
            
            # Update booking status to rejected
            result = await db[self.bookings_collection].update_one(
                {"booking_id": booking_id, "venue_id": venue_id},
                {
                    "$set": {
                        "status": "rejected",
                        "rejected_by": rejected_by,
                        "rejected_at": current_time,
                        "rejection_reason": rejection_reason
                    }
                }
            )
            
            if result.modified_count > 0:
                logger.info(f"Booking {booking_id} rejected by {rejected_by}")
                return True
            else:
                logger.warning(f"Booking {booking_id} not found for rejection")
                return False
                
        except Exception as e:
            logger.error(f"Error rejecting booking {booking_id}: {e}")
            raise

    async def update_booking_status(
        self,
        venue_id: str,
        booking_id: str,
        update_data: Dict[str, Any]
    ) -> bool:
        """Update booking status and related fields"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            current_time = datetime.utcnow()
            update_data["updated_at"] = current_time
            
            # Update booking
            result = await db[self.bookings_collection].update_one(
                {"booking_id": booking_id, "venue_id": venue_id},
                {"$set": update_data}
            )
            
            if result.modified_count > 0:
                logger.info(f"Booking {booking_id} updated successfully")
                return True
            else:
                logger.warning(f"Booking {booking_id} not found for update")
                return False
                
        except Exception as e:
            logger.error(f"Error updating booking {booking_id}: {e}")
            raise

    async def get_bookings_for_bulk_action(
        self, 
        booking_ids: Optional[List[str]] = None,
        venue_id: Optional[str] = None,
        status: str = "pending",
        admin_username: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get bookings eligible for bulk actions"""
        try:
            db = await self.get_database()
            
            # Build filter query
            filter_query = {}
            
            if booking_ids:
                filter_query["id"] = {"$in": booking_ids}
            
            if venue_id:
                filter_query["venue_id"] = venue_id
                
            if status:
                filter_query["status"] = status
            
            # Get bookings
            cursor = db[self.bookings_collection].find(filter_query)
            bookings = await cursor.to_list(length=None)
            
            # Add venue information
            for booking in bookings:
                venue = await db[self.venues_collection].find_one({"id": booking.get("venue_id")})
                if venue:
                    booking["venue_name"] = venue.get("venue_name", "Unknown")
            
            logger.info(f"Retrieved {len(bookings)} bookings for bulk action")
            return bookings
            
        except Exception as e:
            logger.error(f"Error getting bookings for bulk action: {e}")
            return []

    async def bulk_approve_bookings(
        self,
        booking_ids: List[str],
        approved_by: str,
        common_notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Bulk approve multiple venue bookings"""
        try:
            db = await self.get_database()
            current_time = datetime.utcnow().isoformat()
            
            # Update multiple bookings
            result = await db[self.bookings_collection].update_many(
                {
                    "id": {"$in": booking_ids},
                    "status": "pending"
                },
                {
                    "$set": {
                        "status": "approved",
                        "approved_by": approved_by,
                        "approved_at": current_time,
                        "admin_notes": common_notes or "Bulk approved",
                        "updated_at": current_time
                    }
                }
            )
            
            logger.info(f"Bulk approved {result.modified_count} bookings")
            return {
                "success": True,
                "modified_count": result.modified_count,
                "message": f"Successfully approved {result.modified_count} bookings"
            }
            
        except Exception as e:
            logger.error(f"Error in bulk approve bookings: {e}")
            return {"success": False, "message": str(e)}

    async def bulk_reject_bookings(
        self,
        booking_ids: List[str],
        rejected_by: str,
        common_reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """Bulk reject multiple venue bookings"""
        try:
            db = await self.get_database()
            current_time = datetime.utcnow().isoformat()
            
            # Update multiple bookings
            result = await db[self.bookings_collection].update_many(
                {
                    "id": {"$in": booking_ids},
                    "status": "pending"
                },
                {
                    "$set": {
                        "status": "rejected",
                        "rejected_by": rejected_by,
                        "rejected_at": current_time,
                        "rejection_reason": common_reason or "Bulk rejected",
                        "updated_at": current_time
                    }
                }
            )
            
            logger.info(f"Bulk rejected {result.modified_count} bookings")
            return {
                "success": True,
                "modified_count": result.modified_count,
                "message": f"Successfully rejected {result.modified_count} bookings"
            }
            
        except Exception as e:
            logger.error(f"Error in bulk reject bookings: {e}")
            return {"success": False, "message": str(e)}
    
    async def check_venue_maintenance_conflicts(
        self,
        venue_id: str,
        start_datetime: str,
        end_datetime: str
    ) -> Dict[str, Any]:
        """Check if venue booking conflicts with scheduled maintenance"""
        try:
            # Import here to avoid circular imports
            from services.maintenance_service import maintenance_service
            
            # Convert string dates to datetime objects
            start_dt = datetime.fromisoformat(start_datetime.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(end_datetime.replace('Z', '+00:00'))
            
            # Check venue availability
            is_available = await maintenance_service.check_venue_availability(
                venue_id=venue_id,
                start_time=start_dt,
                end_time=end_dt
            )
            
            if not is_available:
                # Get specific maintenance windows that conflict
                maintenance_windows = await maintenance_service.get_maintenance_windows(
                    venue_id=venue_id,
                    include_past=False
                )
                
                conflicts = []
                for maintenance in maintenance_windows.maintenance_windows:
                    if (maintenance.start_time < end_dt and maintenance.end_time > start_dt):
                        conflicts.append({
                            "maintenance_id": maintenance.id,
                            "start_time": maintenance.start_time.isoformat(),
                            "end_time": maintenance.end_time.isoformat(),
                            "reason": maintenance.reason,
                            "status": maintenance.status
                        })
                
                return {
                    "available": False,
                    "conflicts": conflicts,
                    "message": f"Venue has {len(conflicts)} scheduled maintenance window(s) during this period"
                }
            
            return {
                "available": True,
                "conflicts": [],
                "message": "Venue is available for booking"
            }
            
        except Exception as e:
            logger.error(f"Error checking maintenance conflicts: {e}")
            return {
                "available": True,  # Default to available on error
                "conflicts": [],
                "message": "Unable to check maintenance conflicts"
            }

# Create singleton instance
venue_service = VenueService()
