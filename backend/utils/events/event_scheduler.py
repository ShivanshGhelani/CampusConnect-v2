"""
Dynamic Event-Driven Scheduler for Real-time Event Status Updates

This scheduler maintains a queue of datetime events and triggers updates exactly when 
event status changes should occur, eliminating delays and unnecessary runs.
"""

import asyncio
import heapq
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import logging
from config.database import Database
from database.operations import DatabaseOperations

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - [EventScheduler] %(message)s'
)
logger = logging.getLogger(__name__)

class EventTriggerType(Enum):
    """Types of event triggers"""
    REGISTRATION_OPEN = "registration_open"
    REGISTRATION_CLOSE = "registration_close"
    EVENT_START = "event_start"
    EVENT_END = "event_end"
    CERTIFICATE_START = "certificate_start"
    CERTIFICATE_END = "certificate_end"

@dataclass
class ScheduledTrigger:
    """Represents a scheduled trigger for event status update"""
    trigger_time: datetime
    event_id: str
    trigger_type: EventTriggerType
    trigger_id: str = field(default_factory=lambda: f"{datetime.now().timestamp()}")
    
    def __lt__(self, other):
        """Enable heap ordering by trigger_time"""
        return self.trigger_time < other.trigger_time

class DynamicEventScheduler:
    """
    Dynamic event scheduler that triggers updates exactly when event status changes occur
    """
    
    def __init__(self):
        self.trigger_queue: List[ScheduledTrigger] = []
        self.running = False
        self._scheduler_task: Optional[asyncio.Task] = None
        self._stop_event = asyncio.Event()
        
    async def initialize(self):
        """Initialize the scheduler with all events from database"""
        try:
            logger.info("Initializing Dynamic Event Scheduler...")
            
            # Clear existing queue
            self.trigger_queue.clear()
            
            # Load all events from database
            events = await DatabaseOperations.find_many("events", {})
            if not events:
                logger.info("No events found in database")
                return
                
            current_time = datetime.now()
            added_triggers = 0
            
            for event in events:
                triggers_added = await self._add_event_triggers(event, current_time)
                added_triggers += triggers_added
                
            logger.info(f"Initialized scheduler with {added_triggers} triggers from {len(events)} events")
            logger.info(f"Next trigger: {self._get_next_trigger_info()}")
            
        except Exception as e:
            logger.error(f"Error initializing scheduler: {str(e)}")
            
    async def _add_event_triggers(self, event: Dict[str, Any], current_time: datetime) -> int:
        """Add all relevant triggers for an event"""
        event_id = event.get('event_id')
        if not event_id:
            return 0
            
        # Convert string dates to datetime objects
        date_fields = {
            'registration_start_date': EventTriggerType.REGISTRATION_OPEN,
            'registration_end_date': EventTriggerType.REGISTRATION_CLOSE,
            'start_datetime': EventTriggerType.EVENT_START,
            'end_datetime': EventTriggerType.EVENT_END,
        }
        
        # Add certificate triggers if available
        if event.get('certificate_start_date'):
            date_fields['certificate_start_date'] = EventTriggerType.CERTIFICATE_START
        if event.get('certificate_end_date'):
            date_fields['certificate_end_date'] = EventTriggerType.CERTIFICATE_END
            
        triggers_added = 0
        
        for date_field, trigger_type in date_fields.items():
            date_value = event.get(date_field)
            if not date_value:
                continue
                
            # Convert string to datetime if needed
            if isinstance(date_value, str):
                try:
                    date_value = datetime.fromisoformat(date_value.replace('Z', '+00:00'))
                except (ValueError, AttributeError):
                    logger.warning(f"Invalid date format for {event_id}.{date_field}: {date_value}")
                    continue
                    
            # Only add future triggers
            if date_value > current_time:
                trigger = ScheduledTrigger(
                    trigger_time=date_value,
                    event_id=event_id,
                    trigger_type=trigger_type
                )
                heapq.heappush(self.trigger_queue, trigger)
                triggers_added += 1
                
        return triggers_added
        
    async def add_new_event(self, event: Dict[str, Any]):
        """Add triggers for a newly created event"""
        current_time = datetime.now()
        triggers_added = await self._add_event_triggers(event, current_time)
        
        if triggers_added > 0:
            logger.info(f"Added {triggers_added} triggers for new event: {event.get('event_id')}")
            logger.info(f"Next trigger: {self._get_next_trigger_info()}")
            
    async def update_event_triggers(self, event_id: str, updated_event: Dict[str, Any]):
        """Update triggers for an event when its dates change"""
        # Remove existing triggers for this event
        await self._remove_event_triggers(event_id)
        
        # Add new triggers
        current_time = datetime.now()
        triggers_added = await self._add_event_triggers(updated_event, current_time)
        
        if triggers_added > 0:
            logger.info(f"Updated {triggers_added} triggers for event: {event_id}")
            logger.info(f"Next trigger: {self._get_next_trigger_info()}")
            
    async def _remove_event_triggers(self, event_id: str):
        """Remove all triggers for a specific event"""
        # Filter out triggers for the specified event
        self.trigger_queue = [
            trigger for trigger in self.trigger_queue 
            if trigger.event_id != event_id
        ]
        # Re-heapify the queue
        heapq.heapify(self.trigger_queue)
        
    async def remove_event(self, event_id: str):
        """Remove all triggers for a deleted event"""
        await self._remove_event_triggers(event_id)
        logger.info(f"Removed all triggers for deleted event: {event_id}")
        
    def _get_next_trigger_info(self) -> str:
        """Get information about the next trigger"""
        if not self.trigger_queue:
            return "No scheduled triggers"
            
        next_trigger = self.trigger_queue[0]
        time_until = next_trigger.trigger_time - datetime.now()
        
        return f"{next_trigger.trigger_type.value} for {next_trigger.event_id} in {time_until}"
        
    async def start(self):
        """Start the scheduler"""
        if self.running:
            logger.warning("Scheduler is already running")
            return
            
        self.running = True
        self._stop_event.clear()
          # Initialize with current events
        await self.initialize()
        
        # Start the scheduler task
        self._scheduler_task = asyncio.create_task(self._scheduler_loop())
        logger.info("Dynamic Event Scheduler started")
        
    async def stop(self):
        """Stop the scheduler"""
        if not self.running:
            return
            
        self.running = False
        self._stop_event.set()
        
        if self._scheduler_task:
            try:
                await asyncio.wait_for(self._scheduler_task, timeout=5.0)
            except asyncio.TimeoutError:
                self._scheduler_task.cancel()
                try:
                    await self._scheduler_task
                except asyncio.CancelledError:
                    pass
        
        logger.info("Dynamic Event Scheduler stopped")
        
    async def _scheduler_loop(self):
        """
        Main scheduler loop that processes triggers with dynamic re-evaluation.
        
        This implementation fixes the critical queue issue by:
        1. Using shorter wait intervals (max 60 seconds) to re-evaluate the queue
        2. Processing all ready triggers in each iteration
        3. Continuously checking for new triggers that might be added
        """
        logger.info("Starting dynamic scheduler loop...")
        
        while self.running:
            try:
                current_time = datetime.now()
                
                # Check for triggers that are ready to execute
                ready_triggers = []
                
                # Process all triggers that are due (time <= current_time)
                while self.trigger_queue:
                    earliest_trigger = self.trigger_queue[0]
                    
                    if earliest_trigger.trigger_time <= current_time:
                        # This trigger is ready to execute
                        trigger = heapq.heappop(self.trigger_queue)
                        ready_triggers.append(trigger)
                    else:
                        # No more ready triggers
                        break
                
                # Execute all ready triggers
                for trigger in ready_triggers:
                    await self._execute_trigger(trigger)
                
                # Check if we have more triggers to process
                if not self.trigger_queue:
                    # No triggers, wait for new ones or stop signal
                    logger.info("No triggers in queue, waiting for new events...")
                    try:
                        await asyncio.wait_for(self._stop_event.wait(), timeout=300)  # 5 minutes
                        break  # Stop event was set
                    except asyncio.TimeoutError:
                        # Timeout reached, continue to check for new triggers
                        continue
                
                # Calculate time until next trigger
                next_trigger = self.trigger_queue[0]
                time_until_trigger = (next_trigger.trigger_time - current_time).total_seconds()
                
                # CRITICAL FIX: Use shorter wait times to handle dynamic queue changes
                # This ensures we re-evaluate the queue frequently and don't miss
                # triggers that are added with earlier times
                wait_time = min(time_until_trigger, 60.0)  # Maximum 60 seconds
                
                if wait_time > 0:
                    try:
                        logger.info(f"Next trigger: {next_trigger.trigger_type.value} for {next_trigger.event_id} in {time_until_trigger:.0f}s (re-checking queue in {wait_time:.0f}s)")
                        await asyncio.wait_for(self._stop_event.wait(), timeout=wait_time)
                        # Stop event was set
                        break
                    except asyncio.TimeoutError:
                        # Timeout reached, re-evaluate the queue
                        # This is the key fix - we loop back to check for new triggers
                        continue
                        
            except Exception as e:
                logger.error(f"Error in scheduler loop: {str(e)}")
                await asyncio.sleep(10)  # Wait 10 seconds before retrying
                
        logger.info("Scheduler loop ended")
                
    async def _execute_trigger(self, trigger: ScheduledTrigger):
        """Execute a specific trigger"""
        try:
            logger.info(f"Executing trigger: {trigger.trigger_type.value} for event {trigger.event_id}")
            
            # Update the specific event's status
            await self._update_event_status(trigger.event_id, trigger.trigger_type)
            
            logger.info(f"Successfully executed trigger: {trigger.trigger_type.value} for event {trigger.event_id}")
            
        except Exception as e:
            logger.error(f"Error executing trigger {trigger.trigger_type.value} for event {trigger.event_id}: {str(e)}")
            
    async def _update_event_status(self, event_id: str, trigger_type: EventTriggerType):
        """Update the status of a specific event"""
        try:
            # Fetch the current event data
            event = await DatabaseOperations.find_one("events", {"event_id": event_id})
            if not event:
                logger.warning(f"Event {event_id} not found for status update")
                return
                  # Determine new status based on current time and event dates
            current_time = datetime.now()
            new_status, new_sub_status = await self._calculate_event_status(event, current_time)
            
            # Update if status has changed
            current_status = event.get('status', 'unknown')
            current_sub_status = event.get('sub_status', 'unknown')
            if current_status != new_status or current_sub_status != new_sub_status:
                success = await DatabaseOperations.update_one(
                    "events",
                    {"event_id": event_id},
                    {"$set": {
                        "status": new_status,
                        "sub_status": new_sub_status,
                        "last_status_update": current_time,
                        "updated_by_scheduler": True
                    }}                )
                
                if success:
                    logger.info(f"Updated event {event_id} status: {current_status}/{current_sub_status} -> {new_status}/{new_sub_status}")
                    
                    # Log the status change for auditing
                    await self._log_status_change(event_id, f"{current_status}/{current_sub_status}", f"{new_status}/{new_sub_status}", trigger_type)
                else:
                    logger.error(f"Failed to update status for event {event_id}")
            else:
                logger.info(f"Event {event_id} status unchanged: {current_status}/{current_sub_status}")
                
        except Exception as e:
            logger.error(f"Error updating status for event {event_id}: {str(e)}")
            
    async def _calculate_event_status(self, event: Dict[str, Any], current_time: datetime) -> tuple[str, str]:
        """Calculate the appropriate status and sub_status for an event based on current time"""
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
        elif registration_end and current_time >= registration_start and current_time < registration_end:
            # During registration window
            return "upcoming", "registration_open"
        elif current_time >= registration_end and current_time < event_start:
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
            
    async def _log_status_change(self, event_id: str, old_status: str, new_status: str, trigger_type: EventTriggerType):
        """Log status changes for auditing"""
        try:
            log_entry = {
                "event_id": event_id,
                "old_status": old_status,
                "new_status": new_status,
                "trigger_type": trigger_type.value,
                "timestamp": datetime.now(),
                "scheduler_version": "dynamic_v1"
            }
            
            await DatabaseOperations.insert_one("event_status_logs", log_entry)
            
        except Exception as e:
            logger.error(f"Error logging status change for event {event_id}: {str(e)}")
            
    async def get_status(self) -> Dict[str, Any]:
        """Get current scheduler status"""
        return {
            "running": self.running,
            "triggers_queued": len(self.trigger_queue),
            "next_trigger": self._get_next_trigger_info(),
            "queue_preview": [
                {
                    "event_id": trigger.event_id,
                    "trigger_type": trigger.trigger_type.value,
                    "trigger_time": trigger.trigger_time.isoformat(),
                    "time_until": str(trigger.trigger_time - datetime.now())
                }
                for trigger in sorted(self.trigger_queue)[:5]  # Show next 5 triggers
            ]
        }

    def get_scheduled_triggers(self) -> List[Dict[str, Any]]:
        """Get all scheduled triggers formatted for the admin dashboard"""
        triggers = []
        current_time = datetime.now()
        
        for trigger in sorted(self.trigger_queue):
            time_until_trigger = (trigger.trigger_time - current_time).total_seconds()
            
            triggers.append({
                "event_id": trigger.event_id,
                "trigger_type": trigger.trigger_type.value,
                "trigger_time": trigger.trigger_time.isoformat(),
                "time_until_trigger": time_until_trigger,
                "time_until_formatted": self._format_relative_time(time_until_trigger),
                "is_past_due": time_until_trigger < 0
            })
        
        return triggers

    def _format_relative_time(self, seconds: float) -> str:
        """Format seconds into human-readable relative time"""
        if seconds < 0:
            return f"Past due by {self._format_positive_time(-seconds)}"
        elif seconds < 60:
            return f"{int(seconds)} seconds"
        elif seconds < 3600:
            minutes = int(seconds / 60)
            return f"{minutes} minute{'s' if minutes != 1 else ''}"
        elif seconds < 86400:
            hours = int(seconds / 3600)
            return f"{hours} hour{'s' if hours != 1 else ''}"
        else:
            days = int(seconds / 86400)
            return f"{days} day{'s' if days != 1 else ''}"

    def _format_positive_time(self, seconds: float) -> str:
        """Format positive seconds into human-readable time"""
        if seconds < 60:
            return f"{int(seconds)} seconds"
        elif seconds < 3600:
            minutes = int(seconds / 60)
            return f"{minutes} minute{'s' if minutes != 1 else ''}"
        elif seconds < 86400:
            hours = int(seconds / 3600)
            return f"{hours} hour{'s' if hours != 1 else ''}"
        else:
            days = int(seconds / 86400)
            return f"{days} day{'s' if days != 1 else ''}"

# Global scheduler instance
dynamic_scheduler = DynamicEventScheduler()
scheduler_instance = dynamic_scheduler  # Alias for easier access

# Convenience functions for integration
async def start_dynamic_scheduler():
    """Start the dynamic event scheduler"""
    await dynamic_scheduler.start()

async def stop_dynamic_scheduler():
    """Stop the dynamic event scheduler"""
    await dynamic_scheduler.stop()

async def add_event_to_scheduler(event: Dict[str, Any]):
    """Add a new event to the scheduler"""
    await dynamic_scheduler.add_new_event(event)

async def update_event_in_scheduler(event_id: str, updated_event: Dict[str, Any]):
    """Update an event in the scheduler"""
    await dynamic_scheduler.update_event_triggers(event_id, updated_event)

async def remove_event_from_scheduler(event_id: str):
    """Remove an event from the scheduler"""
    await dynamic_scheduler.remove_event(event_id)

async def get_scheduler_status():
    """Get current scheduler status"""
    return await dynamic_scheduler.get_status()

# Backward compatibility alias
scheduler = dynamic_scheduler