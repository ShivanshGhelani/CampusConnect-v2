"""
Simple Venues API Routes
For listing university venues (no booking system)
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Optional
from models.venue import Venue, VenueCreate, VenueUpdate, VenueResponse
from database.operations import DatabaseOperations
from dependencies.auth import get_current_admin
from models.admin_user import AdminUser
from datetime import datetime
import pytz
import logging
import secrets

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/", response_model=List[Venue])
async def get_venues(
    include_inactive: bool = Query(False, description="Include inactive venues in results"),
    admin: AdminUser = Depends(get_current_admin)
):
    """
    Get venues with optional inactive inclusion
    
    - By default returns only active venues
    - Set include_inactive=true to get all venues (active + inactive)
    - Results are sorted by name for consistency
    """
    try:
        # Build filter query based on include_inactive parameter
        filter_query = {} if include_inactive else {"is_active": True}
        
        venues = await DatabaseOperations.find_many(
            "venues", 
            filter_query,
            sort_by=[("name", 1)]  # Always sort by name
        )
        return venues
    except Exception as e:
        logger.error(f"Error fetching venues: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch venues"
        )

# REMOVED: /all endpoint - consolidated into main endpoint with include_inactive parameter

@router.post("/", response_model=dict)
async def create_venue(
    venue_data: VenueCreate,
    current_admin: AdminUser = Depends(get_current_admin)
):
    """Create a new venue (admin only)"""
    try:
        # Generate venue ID (use frontend-generated ID if provided, fallback to simple generation)
        venue_id = f"VEN{secrets.token_hex(4).upper()}"
        
        # Create venue document
        venue = Venue(
            venue_id=venue_id,
            name=venue_data.name,
            location=venue_data.location,
            description=venue_data.description,
            capacity=venue_data.capacity,
            facilities=venue_data.facilities or [],
            venue_type=venue_data.venue_type,
            is_active=True,
            created_at=datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None),
            created_by=current_admin.username
        )
        
        # Save to database
        await DatabaseOperations.insert_one("venues", venue.model_dump())
        
        logger.info(f"Venue created: {venue_id} by {current_admin.username}")
        return {
            "success": True,
            "message": "Venue created successfully",
            "venue_id": venue_id
        }
        
    except Exception as e:
        logger.error(f"Error creating venue: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create venue"
        )

@router.put("/{venue_id}", response_model=dict)
async def update_venue(
    venue_id: str,
    venue_data: VenueUpdate,
    current_admin: AdminUser = Depends(get_current_admin)
):
    """Update a venue (admin only)"""
    try:
        # Check if venue exists
        existing_venue = await DatabaseOperations.find_one("venues", {"venue_id": venue_id})
        if not existing_venue:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Venue not found"
            )
        
        # Prepare update data
        update_data = {k: v for k, v in venue_data.model_dump().items() if v is not None}
        update_data["updated_at"] = datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None)
        update_data["updated_by"] = current_admin.username
        
        # Update venue
        result = await DatabaseOperations.update_one(
            "venues",
            {"venue_id": venue_id},
            {"$set": update_data}
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No changes made to venue"
            )
        
        logger.info(f"Venue updated: {venue_id} by {current_admin.username}")
        return {
            "success": True,
            "message": "Venue updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating venue {venue_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update venue"
        )

@router.patch("/{venue_id}/status", response_model=dict)
async def manage_venue_status(
    venue_id: str,
    action: str = Query(..., regex="^(delete|restore|permanent_delete)$", description="Action: delete, restore, or permanent_delete"),
    current_admin: AdminUser = Depends(get_current_admin)
):
    """
    CONSOLIDATED: Manage venue status - delete, restore, or permanently delete
    
    Actions:
    - delete: Soft delete (set is_active=false)
    - restore: Restore soft-deleted venue (set is_active=true)  
    - permanent_delete: Permanently remove from database (IRREVERSIBLE)
    """
    try:
        # Check if venue exists
        existing_venue = await DatabaseOperations.find_one("venues", {"venue_id": venue_id})
        if not existing_venue:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Venue not found"
            )
        
        if action == "delete":
            # Soft delete by setting is_active to False
            result = await DatabaseOperations.update_one(
                "venues",
                {"venue_id": venue_id},
                {"$set": {
                    "is_active": False,
                    "updated_at": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None),
                    "updated_by": current_admin.username
                }}
            )
            message = "Venue deleted successfully"
            log_message = f"Venue deleted: {venue_id} by {current_admin.username}"
            
        elif action == "restore":
            if existing_venue.get("is_active", True):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Venue is already active"
                )
            
            # Restore venue by setting is_active to True
            result = await DatabaseOperations.update_one(
                "venues",
                {"venue_id": venue_id},
                {"$set": {
                    "is_active": True,
                    "updated_at": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None),
                    "updated_by": current_admin.username
                }}
            )
            message = "Venue restored successfully"
            log_message = f"Venue restored: {venue_id} by {current_admin.username}"
            
        elif action == "permanent_delete":
            # Permanently delete venue from database
            result = await DatabaseOperations.delete_one("venues", {"venue_id": venue_id})
            message = "Venue permanently deleted successfully"
            log_message = f"Venue permanently deleted: {venue_id} by {current_admin.username}"
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to {action.replace('_', ' ')} venue"
            )
        
        logger.info(log_message)
        return {
            "success": True,
            "message": message
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error managing venue status {venue_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to {action.replace('_', ' ')} venue"
        )

# SINGLE ENDPOINT: All venue status operations (delete/restore/permanent_delete)
# No compatibility endpoints needed - frontend uses single manageVenueStatus method
