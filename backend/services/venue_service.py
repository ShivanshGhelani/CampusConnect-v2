"""
Simple Venue Service for University Venue Management
No booking system, just CRUD operations for venue listing
"""

import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from database.operations import DatabaseOperations
from models.venue import Venue, VenueCreate, VenueUpdate, VenueResponse

logger = logging.getLogger(__name__)


class VenueService:
    """Service class for managing university venues"""

    @staticmethod
    async def create_venue(venue_data: VenueCreate, created_by: str, venue_id: str = None) -> VenueResponse:
        """Create a new venue"""
        try:
            # Use frontend-provided venue_id or generate simple fallback
            if not venue_id:
                import secrets
                venue_id = f"VEN{secrets.token_hex(4).upper()}"
            
            # Create venue document
            venue_doc = {
                "venue_id": venue_id,
                "name": venue_data.name,
                "location": venue_data.location,
                "description": venue_data.description,
                "capacity": venue_data.capacity,
                "facilities": venue_data.facilities,
                "venue_type": venue_data.venue_type,
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "created_by": created_by
            }

            # Insert venue into database
            result = await DatabaseOperations.insert_one("venues", venue_doc)
            
            if result:
                venue = Venue(**venue_doc)
                logger.info(f"Venue created successfully: {venue_id}")
                return VenueResponse(
                    success=True,
                    message="Venue created successfully",
                    venue=venue
                )
            else:
                logger.error("Failed to create venue in database")
                return VenueResponse(
                    success=False,
                    message="Failed to create venue"
                )

        except Exception as e:
            logger.error(f"Error creating venue: {e}")
            return VenueResponse(
                success=False,
                message=f"Error creating venue: {str(e)}"
            )

    @staticmethod
    async def get_all_venues(include_inactive: bool = False) -> VenueResponse:
        """Get all venues"""
        try:
            # Build query filter
            query = {}
            if not include_inactive:
                query["is_active"] = True

            # Get venues from database
            venues_data = await DatabaseOperations.find_many("venues", query)
            
            venues = [Venue(**venue_data) for venue_data in venues_data]
            
            logger.info(f"Retrieved {len(venues)} venues")
            return VenueResponse(
                success=True,
                message=f"Retrieved {len(venues)} venues",
                venues=venues
            )

        except Exception as e:
            logger.error(f"Error getting venues: {e}")
            return VenueResponse(
                success=False,
                message=f"Error retrieving venues: {str(e)}"
            )

    @staticmethod
    async def get_venue_by_id(venue_id: str) -> VenueResponse:
        """Get a specific venue by ID"""
        try:
            venue_data = await DatabaseOperations.find_one("venues", {"venue_id": venue_id})
            
            if venue_data:
                venue = Venue(**venue_data)
                return VenueResponse(
                    success=True,
                    message="Venue retrieved successfully",
                    venue=venue
                )
            else:
                return VenueResponse(
                    success=False,
                    message="Venue not found"
                )

        except Exception as e:
            logger.error(f"Error getting venue {venue_id}: {e}")
            return VenueResponse(
                success=False,
                message=f"Error retrieving venue: {str(e)}"
            )

    @staticmethod
    async def update_venue(venue_id: str, venue_data: VenueUpdate, updated_by: str) -> VenueResponse:
        """Update venue information"""
        try:
            # Build update document
            update_doc = {"updated_at": datetime.utcnow()}
            
            if venue_data.name is not None:
                update_doc["name"] = venue_data.name
            if venue_data.location is not None:
                update_doc["location"] = venue_data.location
            if venue_data.description is not None:
                update_doc["description"] = venue_data.description
            if venue_data.capacity is not None:
                update_doc["capacity"] = venue_data.capacity
            if venue_data.facilities is not None:
                update_doc["facilities"] = venue_data.facilities
            if venue_data.venue_type is not None:
                update_doc["venue_type"] = venue_data.venue_type
            if venue_data.is_active is not None:
                update_doc["is_active"] = venue_data.is_active

            # Update venue in database
            result = await DatabaseOperations.update_one(
                "venues",
                {"venue_id": venue_id},
                {"$set": update_doc}
            )

            if result.modified_count > 0:
                # Get updated venue
                updated_venue_data = await DatabaseOperations.find_one("venues", {"venue_id": venue_id})
                venue = Venue(**updated_venue_data)
                
                logger.info(f"Venue updated successfully: {venue_id}")
                return VenueResponse(
                    success=True,
                    message="Venue updated successfully",
                    venue=venue
                )
            else:
                return VenueResponse(
                    success=False,
                    message="Venue not found or no changes made"
                )

        except Exception as e:
            logger.error(f"Error updating venue {venue_id}: {e}")
            return VenueResponse(
                success=False,
                message=f"Error updating venue: {str(e)}"
            )

    @staticmethod
    async def delete_venue(venue_id: str) -> VenueResponse:
        """Delete a venue (soft delete by setting is_active to False)"""
        try:
            result = await DatabaseOperations.update_one(
                "venues",
                {"venue_id": venue_id},
                {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
            )

            if result.modified_count > 0:
                logger.info(f"Venue deleted successfully: {venue_id}")
                return VenueResponse(
                    success=True,
                    message="Venue deleted successfully"
                )
            else:
                return VenueResponse(
                    success=False,
                    message="Venue not found"
                )

        except Exception as e:
            logger.error(f"Error deleting venue {venue_id}: {e}")
            return VenueResponse(
                success=False,
                message=f"Error deleting venue: {str(e)}"
            )

    @staticmethod
    async def search_venues(search_term: str, venue_type: Optional[str] = None) -> VenueResponse:
        """Search venues by name, location, or description"""
        try:
            # Build search query
            query = {
                "is_active": True,
                "$or": [
                    {"name": {"$regex": search_term, "$options": "i"}},
                    {"location": {"$regex": search_term, "$options": "i"}},
                    {"description": {"$regex": search_term, "$options": "i"}}
                ]
            }

            if venue_type:
                query["venue_type"] = venue_type

            venues_data = await DatabaseOperations.find_many("venues", query)
            venues = [Venue(**venue_data) for venue_data in venues_data]

            return VenueResponse(
                success=True,
                message=f"Found {len(venues)} venues matching search criteria",
                venues=venues
            )

        except Exception as e:
            logger.error(f"Error searching venues: {e}")
            return VenueResponse(
                success=False,
                message=f"Error searching venues: {str(e)}"
            )

    @staticmethod
    async def get_venues_by_type(venue_type: str) -> VenueResponse:
        """Get venues by type"""
        try:
            venues_data = await DatabaseOperations.find_many(
                "venues", 
                {"venue_type": venue_type, "is_active": True}
            )
            
            venues = [Venue(**venue_data) for venue_data in venues_data]

            return VenueResponse(
                success=True,
                message=f"Found {len(venues)} venues of type {venue_type}",
                venues=venues
            )

        except Exception as e:
            logger.error(f"Error getting venues by type {venue_type}: {e}")
            return VenueResponse(
                success=False,
                message=f"Error retrieving venues: {str(e)}"
            )


# Create service instance
venue_service = VenueService()
