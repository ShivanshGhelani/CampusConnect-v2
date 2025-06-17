"""
Event Status Manager

This module provides high-level methods for managing event statuses and retrieving events
by their current status. It integrates with the Dynamic Event Scheduler for real-time
status updates.
"""

from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import logging
from utils.db_operations import DatabaseOperations
from utils.dynamic_event_scheduler import dynamic_scheduler

logger = logging.getLogger(__name__)

class EventStatusManager:
    """
    Manages event statuses and provides high-level methods for event retrieval
    and status management. Integrates with the Dynamic Event Scheduler.
    """
    
    @staticmethod
    def _get_event_field(event, field_name, default=None):
        """
        Safely get a field from an event object, whether it's a dict or Pydantic model.
        
        Args:
            event: Event object (dict or Pydantic model)
            field_name: Name of the field to get
            default: Default value if field doesn't exist
            
        Returns:
            Field value or default
        """
        if hasattr(event, field_name):
            # Pydantic model - use attribute access
            return getattr(event, field_name, default)
        elif hasattr(event, 'get'):
            # Dictionary - use get method
            return event.get(field_name, default)
        else:
            # Unknown type, try both
            try:
                return getattr(event, field_name, default)
            except AttributeError:
                try:
                    return event.get(field_name, default)
                except (AttributeError, TypeError):
                    return default
    
    @staticmethod
    async def get_available_events(status_filter: str = "all") -> List[Dict[str, Any]]:
        """
        Get events filtered by their current status.
        
        Args:
            status_filter: Filter for event status ("upcoming", "ongoing", "completed", "all")
            
        Returns:
            List of events matching the status filter
        """
        try:
            # Build query based on status filter
            query = {}
            
            if status_filter == "upcoming":
                query["status"] = "upcoming"
            elif status_filter == "ongoing":
                query["status"] = "ongoing"
            elif status_filter == "completed":
                query["status"] = "completed"
            # "all" means no status filter
            
            # Get events from database
            events = await DatabaseOperations.find_many("events", query)
            
            if not events:
                return []
            
            # Update status for each event to ensure accuracy
            current_time = datetime.now()
            updated_events = []
            
            for event in events:
                # Calculate current status and sub_status
                calculated_status, calculated_sub_status = await EventStatusManager._calculate_event_status(event, current_time)
                
                # Update the event status if it has changed
                if event.get('status') != calculated_status or event.get('sub_status') != calculated_sub_status:
                    await DatabaseOperations.update_one(
                        "events",
                        {"event_id": event.get('event_id')},
                        {"$set": {
                            "status": calculated_status,
                            "sub_status": calculated_sub_status,
                            "last_status_update": current_time
                        }}
                    )
                    event['status'] = calculated_status
                    event['sub_status'] = calculated_sub_status
                    logger.info(f"Updated event {event.get('event_id')} status to {calculated_status}/{calculated_sub_status}")
                  # Apply status filter after status update
                if status_filter == "all" or event.get('status') == status_filter:
                    updated_events.append(event)
            
            # Sort events by start date with safe datetime handling
            def safe_sort_key(event):
                start_datetime = event.get('start_datetime', datetime.min)
                if isinstance(start_datetime, str):
                    try:
                        return datetime.fromisoformat(start_datetime.replace('Z', '+00:00'))
                    except (ValueError, AttributeError):
                        return datetime.min
                elif isinstance(start_datetime, datetime):
                    return start_datetime
                else:
                    return datetime.min
            
            updated_events.sort(key=safe_sort_key)
            
            logger.info(f"Retrieved {len(updated_events)} events with status filter: {status_filter}")
            return updated_events
            
        except Exception as e:
            logger.error(f"Error getting available events: {str(e)}")
            return []
    
    @staticmethod
    async def update_all_events_status(force_update: bool = False) -> Dict[str, int]:
        """
        Update the status of all events based on current time.
        
        Args:
            force_update: If True, update all events regardless of last update time
            
        Returns:
            Dictionary with update statistics
        """
        try:
            logger.info("Starting bulk event status update...")
            
            # Get all events
            events = await DatabaseOperations.find_many("events", {})
            
            if not events:
                logger.info("No events found for status update")
                return {"total": 0, "updated": 0, "unchanged": 0}
            
            current_time = datetime.now()
            stats = {"total": len(events), "updated": 0, "unchanged": 0}
            
            for event in events:
                try:
                    event_id = event.get('event_id')
                    current_status = event.get('status', 'unknown')
                    current_sub_status = event.get('sub_status', 'unknown')
                    
                    # Calculate new status and sub_status
                    new_status, new_sub_status = await EventStatusManager._calculate_event_status(event, current_time)
                    
                    # Update if status has changed or force update is requested
                    if current_status != new_status or current_sub_status != new_sub_status or force_update:
                        success = await DatabaseOperations.update_one(
                            "events",
                            {"event_id": event_id},
                            {"$set": {
                                "status": new_status,
                                "sub_status": new_sub_status,
                                "last_status_update": current_time,
                                "bulk_updated": True
                            }}
                        )
                        
                        if success:
                            stats["updated"] += 1
                            logger.info(f"Updated event {event_id}: {current_status}/{current_sub_status} -> {new_status}/{new_sub_status}")
                        else:
                            logger.error(f"Failed to update event {event_id}")
                    else:
                        stats["unchanged"] += 1
                        
                except Exception as e:
                    logger.error(f"Error updating event {event.get('event_id', 'unknown')}: {str(e)}")
            
            logger.info(f"Bulk update completed: {stats['updated']} updated, {stats['unchanged']} unchanged")
            return stats
            
        except Exception as e:
            logger.error(f"Error in bulk event status update: {str(e)}")
            return {"total": 0, "updated": 0, "unchanged": 0, "error": str(e)}
    
    @staticmethod
    async def get_event_timeline(event) -> Dict[str, Any]:
        """
        Get timeline information for an event including registration and event periods.
        
        Args:
            event: Event object (dict or Pydantic model)
            
        Returns:
            Timeline information with status indicators
        """
        try:
            current_time = datetime.now()
            
            # Convert string dates to datetime objects
            date_fields = ["start_datetime", "end_datetime", "registration_start_date", "registration_end_date", "certificate_end_date"]
            event_dates = {}
            
            for field in date_fields:
                date_value = EventStatusManager._get_event_field(event, field)
                if date_value:
                    if isinstance(date_value, str):
                        try:
                            event_dates[field] = datetime.fromisoformat(date_value.replace('Z', '+00:00'))
                        except (ValueError, AttributeError):
                            logger.warning(f"Invalid date format for {field}: {date_value}")
                            event_dates[field] = None
                    else:
                        event_dates[field] = date_value
                else:
                    event_dates[field] = None
            
            # Calculate timeline status  
            current_status, current_sub_status = await EventStatusManager._calculate_event_status_for_object(event, current_time)
            timeline = {
                "event_id": EventStatusManager._get_event_field(event, 'event_id'),
                "current_status": current_status,
                "current_sub_status": current_sub_status,
                "registration": {
                    "start_date": event_dates.get('registration_start_date'),
                    "end_date": event_dates.get('registration_end_date'),
                    "is_open": False,
                    "is_closed": False,
                    "opens_in": None,
                    "closes_in": None
                },
                "event": {
                    "start_date": event_dates.get('start_datetime'),
                    "end_date": event_dates.get('end_datetime'),
                    "is_ongoing": False,
                    "is_completed": False,
                    "starts_in": None,
                    "ends_in": None
                },
                "certificate": {
                    "end_date": event_dates.get('certificate_end_date'),
                    "is_available": False,
                    "expires_in": None
                }
            }
            
            # Registration timeline
            reg_start = event_dates.get('registration_start_date')
            reg_end = event_dates.get('registration_end_date')
            
            if reg_start and reg_end:
                if current_time < reg_start:
                    timeline["registration"]["opens_in"] = reg_start - current_time
                elif reg_start <= current_time <= reg_end:
                    timeline["registration"]["is_open"] = True
                    timeline["registration"]["closes_in"] = reg_end - current_time
                else:
                    timeline["registration"]["is_closed"] = True
            
            # Event timeline
            event_start = event_dates.get('start_datetime')
            event_end = event_dates.get('end_datetime')
            
            if event_start and event_end:
                if current_time < event_start:
                    timeline["event"]["starts_in"] = event_start - current_time
                elif event_start <= current_time <= event_end:
                    timeline["event"]["is_ongoing"] = True
                    timeline["event"]["ends_in"] = event_end - current_time
                else:
                    timeline["event"]["is_completed"] = True
            
            # Certificate timeline
            certificate_end = event_dates.get('certificate_end_date')
            if certificate_end and event_end:
                if event_end <= current_time < certificate_end:
                    timeline["certificate"]["is_available"] = True
                    timeline["certificate"]["expires_in"] = certificate_end - current_time
            
            return timeline
            
        except Exception as e:
            logger.error(f"Error getting event timeline: {str(e)}")
            return {
                "event_id": EventStatusManager._get_event_field(event, 'event_id'),
                "error": str(e),
                "current_status": "unknown",
                "current_sub_status": "unknown"
            }
    
    @staticmethod
    async def _calculate_event_status_for_object(event, current_time: datetime) -> Tuple[str, str]:
        """
        Calculate the appropriate status and sub_status for an event object (dict or Pydantic model).
        
        Returns:
            Tuple of (status, sub_status)
        """
        try:
            # Get dates using the helper function
            registration_start = EventStatusManager._get_event_field(event, 'registration_start_date')
            registration_end = EventStatusManager._get_event_field(event, 'registration_end_date')
            start_time = EventStatusManager._get_event_field(event, 'start_datetime')
            end_time = EventStatusManager._get_event_field(event, 'end_datetime')
            certificate_end = EventStatusManager._get_event_field(event, 'certificate_end_date')
            
            # Convert string dates to datetime objects if needed
            date_fields = [
                ('registration_start', registration_start),
                ('registration_end', registration_end),
                ('start_time', start_time),
                ('end_time', end_time),
                ('certificate_end', certificate_end)
            ]
            
            converted_dates = {}
            for field_name, date_value in date_fields:
                if isinstance(date_value, str):
                    try:
                        converted_dates[field_name] = datetime.fromisoformat(date_value.replace('Z', '+00:00'))
                    except (ValueError, AttributeError):
                        logger.warning(f"Invalid {field_name} format: {date_value}")
                        converted_dates[field_name] = None
                else:
                    converted_dates[field_name] = date_value
                        
            registration_start = converted_dates['registration_start']
            registration_end = converted_dates['registration_end']
            start_time = converted_dates['start_time']
            end_time = converted_dates['end_time']
            certificate_end = converted_dates['certificate_end']
                        
            if not start_time or not end_time:
                return "draft", "draft"
            
            # Implement comprehensive status logic
            if registration_start and current_time < registration_start:
                # Before registration starts
                return "upcoming", "registration_not_started"
            elif registration_start and registration_end and current_time >= registration_start and current_time < registration_end:
                # During registration window
                return "upcoming", "registration_open"
            elif registration_end and current_time >= registration_end and current_time < start_time:
                # Between registration end and event start
                return "upcoming", "registration_closed"
            elif current_time >= start_time and current_time < end_time:
                # During event
                return "ongoing", "event_started"
            elif current_time >= end_time:
                # After event ends
                if certificate_end and current_time < certificate_end:
                    # Between event end and certificate end
                    return "ongoing", "certificate_available"
                else:
                    # After certificate end (or no certificate end date)
                    return "completed", "event_ended"
            else:
                # Fallback - if no registration dates, consider it upcoming until event start
                if current_time < start_time:
                    return "upcoming", "registration_open"
                else:
                    return "draft", "draft"
                
        except Exception as e:
            logger.error(f"Error calculating event status: {str(e)}")
            return "unknown", "unknown"
    
    @staticmethod
    async def _calculate_event_status(event: Dict[str, Any], current_time: datetime) -> Tuple[str, str]:
        """
        Calculate the appropriate status and sub_status for an event based on current time.
        This uses the same comprehensive logic as the Dynamic Event Scheduler.
        
        Returns:
            Tuple of (status, sub_status)
        """
        try:
            # Convert string dates to datetime objects
            date_fields = ["start_datetime", "end_datetime", "registration_start_date", "registration_end_date", "certificate_end_date"]
            for field in date_fields:
                if isinstance(event.get(field), str):
                    try:
                        event[field] = datetime.fromisoformat(event[field].replace('Z', '+00:00'))
                    except (ValueError, AttributeError):
                        logger.warning(f"Invalid date format for {field}: {event.get(field)}")
                        
            # Get date fields
            registration_start = event.get('registration_start_date')
            registration_end = event.get('registration_end_date')
            event_start = event.get('start_datetime')
            event_end = event.get('end_datetime')
            certificate_end = event.get('certificate_end_date')
            
            if not event_start or not event_end:
                return "draft", "draft"
            
            # Implement comprehensive status logic
            if registration_start and current_time < registration_start:
                # Before registration starts
                return "upcoming", "registration_not_started"
            elif registration_start and registration_end and current_time >= registration_start and current_time < registration_end:
                # During registration window
                return "upcoming", "registration_open"
            elif registration_end and current_time >= registration_end and current_time < event_start:
                # Between registration end and event start
                return "upcoming", "registration_closed"
            elif current_time >= event_start and current_time < event_end:
                # During event
                return "ongoing", "event_started"
            elif current_time >= event_end:
                # After event ends
                if certificate_end and current_time < certificate_end:
                    # Between event end and certificate end
                    return "ongoing", "certificate_available"
                else:
                    # After certificate end (or no certificate end date)
                    return "completed", "event_ended"
            else:
                # Fallback - if no registration dates, consider it upcoming until event start
                if current_time < event_start:
                    return "upcoming", "registration_open"
                else:
                    return "draft", "draft"
                
        except Exception as e:
            logger.error(f"Error calculating event status: {str(e)}")
            return "unknown", "unknown"
    
    @staticmethod
    async def get_event_by_id(event_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a single event by ID with updated status.
        
        Args:
            event_id: The event ID to retrieve
            
        Returns:
            Event dictionary or None if not found
        """
        try:
            event = await DatabaseOperations.find_one("events", {"event_id": event_id})
            
            if not event:
                return None
            
            # Update status to ensure accuracy
            current_time = datetime.now()
            calculated_status, calculated_sub_status = await EventStatusManager._calculate_event_status(event, current_time)
            
            if event.get('status') != calculated_status or event.get('sub_status') != calculated_sub_status:
                await DatabaseOperations.update_one(
                    "events",
                    {"event_id": event_id},
                    {"$set": {
                        "status": calculated_status,
                        "sub_status": calculated_sub_status,
                        "last_status_update": current_time
                    }}
                )
                event['status'] = calculated_status
                event['sub_status'] = calculated_sub_status
                logger.info(f"Updated event {event_id} status to {calculated_status}/{calculated_sub_status}")
            
            return event
            
        except Exception as e:
            logger.error(f"Error getting event by ID {event_id}: {str(e)}")
            return None
