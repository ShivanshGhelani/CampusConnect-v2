#!/usr/bin/env python3
"""
Test script to verify trigger updates when event dates are modified
"""
import asyncio
from config.database import Database
from utils.dynamic_event_scheduler import dynamic_scheduler
from utils.event_status_manager import EventStatusManager
from datetime import datetime, timedelta

async def test_trigger_updates():
    await Database.connect_db()
    
    print('🧪 Testing Event Trigger Updates...')
    
    # Get the current scheduler status
    print('\n📊 Current Scheduler Status:')
    status = await dynamic_scheduler.get_status()
    print(f'   Running: {status["running"]}')
    print(f'   Triggers in Queue: {status["triggers_queued"]}')
    print(f'   Next Trigger: {status["next_trigger"]}')
    
    # Get an event to test with
    events = await EventStatusManager.get_available_events('all')
    if not events:
        print('❌ No events found to test with')
        return
    
    test_event = events[0]
    event_id = test_event.get('event_id')
    
    print(f'\n🔍 Testing with Event: {event_id}')
    print(f'   Current Status: {test_event.get("status")} / {test_event.get("sub_status")}')
    print(f'   Registration Start: {test_event.get("registration_start_date")}')
    print(f'   Registration End: {test_event.get("registration_end_date")}')
    
    # Display current triggers for this event
    current_triggers = [t for t in dynamic_scheduler.trigger_queue if t.event_id == event_id]
    print(f'\n🎯 Current Triggers for {event_id}: {len(current_triggers)}')
    for i, trigger in enumerate(current_triggers):
        trigger_time = trigger.trigger_time
        trigger_type = trigger.trigger_type.value
        time_until = trigger_time - datetime.now()
        print(f'   {i+1}. {trigger_type} at {trigger_time} (in {time_until})')
    
    # Simulate updating the event with new dates (move registration end to tomorrow)
    print(f'\n🔄 Simulating date update...')
    tomorrow = datetime.now() + timedelta(days=1)
    
    # Create updated event data
    updated_event = test_event.copy()
    updated_event['registration_end_date'] = tomorrow
    updated_event['updated_at'] = datetime.now()
    
    print(f'   New Registration End: {tomorrow}')
    
    # Call the update function
    await dynamic_scheduler.update_event_triggers(event_id, updated_event)
    
    # Check updated triggers
    updated_triggers = [t for t in dynamic_scheduler.trigger_queue if t.event_id == event_id]
    print(f'\n✅ Updated Triggers for {event_id}: {len(updated_triggers)}')
    for i, trigger in enumerate(updated_triggers):
        trigger_time = trigger.trigger_time
        trigger_type = trigger.trigger_type.value
        time_until = trigger_time - datetime.now()
        print(f'   {i+1}. {trigger_type} at {trigger_time} (in {time_until})')
    
    print(f'\n📊 Final Scheduler Status:')
    final_status = await dynamic_scheduler.get_status()
    print(f'   Triggers in Queue: {final_status["triggers_queued"]}')
    print(f'   Next Trigger: {final_status["next_trigger"]}')
    
    await Database.close_db()

if __name__ == "__main__":
    asyncio.run(test_trigger_updates())
