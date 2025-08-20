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
            status: Event status filter ("all", "upcoming", "active", "pending_approval", etc.)
            include_pending_approval: Whether to include events pending approval (for admin use)
        """
        try:
            query = {}
            
            if status == "pending_approval":
                # Specifically query for events pending approval
                query["event_approval_status"] = "pending_approval"
            elif status == "upcoming":
                query["event_date"] = {"$gte": datetime.utcnow().isoformat()}
                # Exclude pending approval events from regular upcoming list
                if not include_pending_approval:
                    query["event_approval_status"] = {"$ne": "pending_approval"}
            elif status == "active":
                query["registration_open"] = True
                # Exclude pending approval events from regular active list
                if not include_pending_approval:
                    query["event_approval_status"] = {"$ne": "pending_approval"}
            elif status != "all":
                # For other specific statuses, use the regular status field
                query["status"] = status
                # Exclude pending approval events from regular status queries
                if not include_pending_approval:
                    query["event_approval_status"] = {"$ne": "pending_approval"}
            
            # If include_pending_approval is True and status is "all", include all events
            if status == "all" and not include_pending_approval:
                # For regular views, exclude pending approval events
                query["event_approval_status"] = {"$ne": "pending_approval"}
            
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
