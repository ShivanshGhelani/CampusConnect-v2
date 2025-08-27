# Enhanced Event Status Manager with intelligent status calculation
# Comprehensive event status management with real-time status updates

from database.operations import DatabaseOperations
from core.logger import get_logger
from datetime import datetime
from typing import List, Dict, Optional

logger = get_logger(__name__)

class EventStatusManager:
    """Enhanced event status management with intelligent status calculation"""
    
    @staticmethod
    async def calculate_event_status(event: Dict, current_time: datetime = None) -> tuple[str, str]:
        """Calculate the appropriate status and sub_status for an event based on current time"""
        if current_time is None:
            current_time = datetime.utcnow()
            
        # Convert string dates to datetime objects
        date_fields = ["start_datetime", "end_datetime", "registration_start_date", "registration_end_date", "certificate_end_date"]
        for field in date_fields:
            if isinstance(event.get(field), str):
                try:
                    event[field] = datetime.fromisoformat(event[field].replace('Z', '+00:00').replace('+00:00', ''))
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
        elif registration_end and registration_start and current_time >= registration_start and current_time < registration_end:
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
            # Fallback
            return "draft", "draft"
    
    @staticmethod
    async def update_event_status_if_needed(event: Dict) -> Dict:
        """Update event status if it's outdated based on current time"""
        try:
            current_time = datetime.utcnow()
            current_status = event.get('status', 'draft')
            current_sub_status = event.get('sub_status', 'draft')
            
            # Calculate what the status should be
            calculated_status, calculated_sub_status = await EventStatusManager.calculate_event_status(event, current_time)
            
            # If status needs updating, update in database and return updated event
            if current_status != calculated_status or current_sub_status != calculated_sub_status:
                logger.info(f"🔄 Updating event {event.get('event_id')} status: {current_status}/{current_sub_status} -> {calculated_status}/{calculated_sub_status}")
                
                # Update in database
                await DatabaseOperations.update_one(
                    "events",
                    {"event_id": event.get('event_id')},
                    {"$set": {
                        "status": calculated_status,
                        "sub_status": calculated_sub_status,
                        "status_updated_at": current_time
                    }}
                )
                
                # Update the event object
                event['status'] = calculated_status
                event['sub_status'] = calculated_sub_status
                event['status_updated_at'] = current_time
                
            return event
            
        except Exception as e:
            logger.error(f"Error updating event status: {str(e)}")
            return event
    

    @staticmethod
    async def get_available_events(status: str = "all", include_pending_approval: bool = False) -> List[Dict]:
        """Get available events based on status with real-time status updates
        
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
                # For upcoming events, we'll filter after status calculation
                if not include_pending_approval:
                    query["event_approval_status"] = {"$ne": "pending_approval"}
            elif status == "active":
                # For active events, we'll filter after status calculation
                if not include_pending_approval:
                    query["event_approval_status"] = {"$ne": "pending_approval"}
            elif status != "all":
                # For other specific statuses, use the regular status field but also check calculated status
                query["status"] = status
                if not include_pending_approval:
                    query["event_approval_status"] = {"$ne": "pending_approval"}
            
            # If include_pending_approval is True and status is "all", include all events
            if status == "all" and not include_pending_approval:
                # For regular views, exclude pending approval events
                query["event_approval_status"] = {"$ne": "pending_approval"}
            
            events = await DatabaseOperations.find_many("events", query)
            
            # Update status for all events and filter based on calculated status
            updated_events = []
            for event in events or []:
                # Update event status based on current time
                updated_event = await EventStatusManager.update_event_status_if_needed(event)
                
                # Apply filtering based on calculated status
                calculated_status = updated_event.get('status', 'draft')
                calculated_sub_status = updated_event.get('sub_status', 'draft')
                
                # Filter based on requested status after calculation
                should_include = False
                
                if status == "all" or status == "pending_approval":
                    should_include = True
                elif status == "upcoming":
                    should_include = calculated_status == "upcoming"
                elif status == "active" or status == "ongoing":
                    should_include = calculated_status in ["upcoming", "ongoing"] and calculated_sub_status in ["registration_open", "event_started"]
                elif status == "completed":
                    should_include = calculated_status == "completed"
                else:
                    # Exact status match
                    should_include = calculated_status == status
                
                if should_include:
                    updated_events.append(updated_event)
            
            return updated_events
            
        except Exception as e:
            logger.error(f"Failed to get events: {str(e)}")
            return []
    
    @staticmethod
    async def get_event_by_id(event_id: str) -> Optional[Dict]:
        """Get event by ID with real-time status update"""
        try:
            event = await DatabaseOperations.find_one("events", {"event_id": event_id})
            if event:
                # Update event status based on current time
                event = await EventStatusManager.update_event_status_if_needed(event)
            return event
            
        except Exception as e:
            logger.error(f"Failed to get event {event_id}: {str(e)}")
            return None
    
    @staticmethod
    async def get_event_timeline_info(event: Dict) -> Dict:
        """Get comprehensive timeline information for an event"""
        try:
            current_time = datetime.utcnow()
            
            # Ensure event has updated status
            event = await EventStatusManager.update_event_status_if_needed(event)
            
            # Extract dates
            registration_start = event.get('registration_start_date')
            registration_end = event.get('registration_end_date')
            event_start = event.get('start_datetime')
            event_end = event.get('end_datetime')
            certificate_end = event.get('certificate_end_date')
            
            # Convert string dates to datetime objects
            date_fields = {
                'registration_start': registration_start,
                'registration_end': registration_end,
                'event_start': event_start,
                'event_end': event_end,
                'certificate_end': certificate_end
            }
            
            for field_name, date_value in date_fields.items():
                if isinstance(date_value, str):
                    try:
                        date_fields[field_name] = datetime.fromisoformat(date_value.replace('Z', '+00:00').replace('+00:00', ''))
                    except (ValueError, AttributeError):
                        date_fields[field_name] = None
            
            # Calculate timeline phases
            phases = []
            
            # Registration Opens
            if date_fields['registration_start']:
                phases.append({
                    'name': 'Registration Opens',
                    'date': date_fields['registration_start'],
                    'status': 'completed' if current_time >= date_fields['registration_start'] else 'upcoming',
                    'is_current': current_time >= date_fields['registration_start'] and (not date_fields['registration_end'] or current_time < date_fields['registration_end'])
                })
            
            # Registration Closes
            if date_fields['registration_end']:
                phases.append({
                    'name': 'Registration Closes',
                    'date': date_fields['registration_end'],
                    'status': 'completed' if current_time >= date_fields['registration_end'] else 'upcoming',
                    'is_current': False
                })
            
            # Event Starts
            if date_fields['event_start']:
                phases.append({
                    'name': 'Event Starts',
                    'date': date_fields['event_start'],
                    'status': 'completed' if current_time >= date_fields['event_start'] else 'upcoming',
                    'is_current': current_time >= date_fields['event_start'] and (not date_fields['event_end'] or current_time < date_fields['event_end'])
                })
            
            # Event Ends
            if date_fields['event_end']:
                phases.append({
                    'name': 'Event Ends',
                    'date': date_fields['event_end'],
                    'status': 'completed' if current_time >= date_fields['event_end'] else 'upcoming',
                    'is_current': False
                })
            
            # Certificate Available
            if date_fields['certificate_end']:
                phases.append({
                    'name': 'Certificate Available',
                    'date': date_fields['certificate_end'],
                    'status': 'completed' if current_time >= date_fields['certificate_end'] else 'upcoming',
                    'is_current': current_time >= date_fields['event_end'] and current_time < date_fields['certificate_end'] if date_fields['event_end'] else False
                })
            
            # Calculate next upcoming phase
            next_phase = None
            for phase in phases:
                if phase['status'] == 'upcoming':
                    next_phase = phase
                    break
            
            # Calculate time remaining to next phase
            time_remaining = None
            if next_phase:
                time_diff = next_phase['date'] - current_time
                days = time_diff.days
                hours, remainder = divmod(time_diff.seconds, 3600)
                minutes, _ = divmod(remainder, 60)
                
                if days > 0:
                    time_remaining = f"{days} days {hours}h {minutes}m"
                elif hours > 0:
                    time_remaining = f"{hours}h {minutes}m"
                else:
                    time_remaining = f"{minutes}m"
            
            return {
                'phases': phases,
                'next_phase': next_phase,
                'time_remaining': time_remaining,
                'current_status': event.get('status'),
                'current_sub_status': event.get('sub_status')
            }
            
        except Exception as e:
            logger.error(f"Error getting timeline info: {str(e)}")
            return {
                'phases': [],
                'next_phase': None,
                'time_remaining': None,
                'current_status': event.get('status', 'unknown'),
                'current_sub_status': event.get('sub_status', 'unknown')
            }
