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
    async def get_available_events(status: str = "all") -> List[Dict]:
        """Get available events based on status"""
        try:
            query = {}
            
            if status == "upcoming":
                query["event_date"] = {"$gte": datetime.utcnow().isoformat()}
            elif status == "active":
                query["registration_open"] = True
            
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
