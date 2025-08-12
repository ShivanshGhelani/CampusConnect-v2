# Simple Event Status Manager
# Replacement for missing event_status_manager module

from database.operations import DatabaseOperations
from core.logger import get_logger
from datetime import datetime
from typing import List, Dict, Optional

logger = get_logger(__name__)

class EventStatusManager:
    """Simple event status management for Phase 1"""
    
    @staticmethod
    async def get_available_events(status: str = "all", include_pending_approval: bool = False) -> List[Dict]:
        """Get available events based on status
        
        Args:
            status: Event status filter ("all", "upcoming", "active", etc.)
            include_pending_approval: Whether to include events pending approval (for admin use)
        """
        try:
            query = {}
            
            if status == "upcoming":
                query["event_date"] = {"$gte": datetime.utcnow().isoformat()}
            elif status == "active":
                query["registration_open"] = True
            
            # If include_pending_approval is True, don't filter by status
            if include_pending_approval:
                # For admin views, include all events regardless of approval status
                pass
            else:
                # For regular views, exclude pending approval events
                if "status" not in query:
                    query["status"] = {"$ne": "pending_approval"}
            
            events = await DatabaseOperations.find_many("events", query)
            return events or []
            
        except Exception as e:
            logger.error(f"Failed to get events: {str(e)}")
            return []
    
    @staticmethod
    async def get_event_by_id(event_id: str) -> Optional[Dict]:
        """Get event by ID"""
        try:
            event = await DatabaseOperations.find_one("events", {"event_id": event_id})
            return event
            
        except Exception as e:
            logger.error(f"Failed to get event {event_id}: {str(e)}")
            return None
