#!/usr/bin/env python3
"""
Debug script to check why triggers aren't being created for updated events
"""
import asyncio
from config.database import Database
from utils.dynamic_event_scheduler import dynamic_scheduler
from utils.event_status_manager import EventStatusManager
from datetime import datetime

async def debug_trigger_creation():
    await Database.connect_db()
    
    print('🔍 Debugging Trigger Creation for Event Updates...')
    
    # Get the specific event from logs
    event_id = "ARRCOSTU2025"
    event = await EventStatusManager.get_event_by_id(event_id)
    
    if not event:
        print(f'❌ Event {event_id} not found')
        return
    
    print(f'\n📋 Event: {event_id}')
    print(f'   Status: {event.get("status")} / {event.get("sub_status")}')
    
    # Check all date fields
    current_time = datetime.now()
    print(f'\n⏰ Current Time: {current_time}')
    
    date_fields = {
        'registration_start_date': 'REGISTRATION_OPEN',
        'registration_end_date': 'REGISTRATION_CLOSE', 
        'start_datetime': 'EVENT_START',
        'end_datetime': 'EVENT_END',
        'certificate_end_date': 'CERTIFICATE_END'
    }
    
    future_dates = 0
    for field, trigger_type in date_fields.items():
        date_value = event.get(field)
        if date_value:
            if isinstance(date_value, str):
                try:
                    date_obj = datetime.fromisoformat(date_value.replace('Z', '+00:00'))
                except:
                    date_obj = None
            else:
                date_obj = date_value
                
            if date_obj:
                is_future = date_obj > current_time
                time_diff = date_obj - current_time
                status = "FUTURE ✅" if is_future else "PAST ❌"
                print(f'   {field}: {date_obj} ({status}) - {time_diff}')
                if is_future:
                    future_dates += 1
            else:
                print(f'   {field}: Invalid date format')
        else:
            print(f'   {field}: Not set')
    
    print(f'\n📊 Summary:')
    print(f'   Future dates that should create triggers: {future_dates}')
    
    # Check current triggers in scheduler for this event
    current_triggers = [t for t in dynamic_scheduler.trigger_queue if t.event_id == event_id]
    print(f'   Current triggers in scheduler: {len(current_triggers)}')
    
    for trigger in current_triggers:
        print(f'     - {trigger.trigger_type.value} at {trigger.trigger_time}')
    
    # Check if scheduler is running
    status = await dynamic_scheduler.get_status()
    print(f'   Scheduler running: {status["running"]}')
    print(f'   Total triggers in queue: {status["triggers_queued"]}')
    
    # Try manually adding triggers to see what happens
    print(f'\n🧪 Testing manual trigger addition...')
    triggers_added = await dynamic_scheduler._add_event_triggers(event, current_time)
    print(f'   Triggers added: {triggers_added}')
    
    # Check again
    new_triggers = [t for t in dynamic_scheduler.trigger_queue if t.event_id == event_id]
    print(f'   Triggers after manual add: {len(new_triggers)}')
    
    for trigger in new_triggers:
        print(f'     - {trigger.trigger_type.value} at {trigger.trigger_time}')
    
    await Database.close_db()

if __name__ == "__main__":
    asyncio.run(debug_trigger_creation())
