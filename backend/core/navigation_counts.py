"""
Navigation counts utility for admin sidebar
Provides consistent navigation count calculations across all admin pages
"""
from typing import Dict
from database.operations import DatabaseOperations
from utils.event_status import EventStatusManager
import logging

logger = logging.getLogger(__name__)

async def get_navigation_counts() -> Dict[str, int]:
    """
    Calculate all navigation counts for the admin sidebar.
    Returns a dictionary with all count variables needed by the layout template.
    """
    try:
        # Get all events count (regardless of publication status)
        all_events = await DatabaseOperations.find_many("events", {})
        all_events_count = len(all_events)
        
        # Use EventStatusManager to get accurate event counts by status
        ongoing_events = await EventStatusManager.get_available_events("ongoing")
        upcoming_events = await EventStatusManager.get_available_events("upcoming") 
        completed_events = await EventStatusManager.get_available_events("completed")
        
        ongoing_events_count = len(ongoing_events)
        upcoming_events_count = len(upcoming_events)
        completed_events_count = len(completed_events)
        
        # Get student count
        student_count = await DatabaseOperations.count_documents("students", {})
        
        # Get admin count
        admin_count = await DatabaseOperations.count_documents("users", {"is_admin": True})
        
        return {
            "all_events_count": all_events_count,
            "ongoing_events_count": ongoing_events_count,
            "upcoming_events_count": upcoming_events_count,
            "completed_events_count": completed_events_count,
            "student_count": student_count,
            "admin_count": admin_count
        }
        
    except Exception as e:
        logger.error(f"Error calculating navigation counts: {str(e)}")
        # Return zeros if there's an error to prevent template crashes
        return {
            "all_events_count": 0,
            "ongoing_events_count": 0,
            "upcoming_events_count": 0,
            "completed_events_count": 0,
            "student_count": 0,
            "admin_count": 0
        }
