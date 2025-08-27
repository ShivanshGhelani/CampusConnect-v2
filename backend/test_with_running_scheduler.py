#!/usr/bin/env python3
"""
Test script to start scheduler and verify trigger updates work
"""
import asyncio
from config.database import Database
from utils.dynamic_event_scheduler import dynamic_scheduler, start_dynamic_scheduler
from utils.event_status_manager import EventStatusManager
from datetime import datetime, timedelta

async def test_with_running_scheduler():
    await Database.connect_db()
    
    print('🚀 Starting Scheduler and Testing Trigger Updates...')
    
    # Start the scheduler
    print('\n⚡ Starting dynamic scheduler...')
    await start_dynamic_scheduler()
    
    # Wait a moment for startup
    await asyncio.sleep(2)
    
    # Check scheduler status
    status = await dynamic_scheduler.get_status()
    print(f'   Scheduler running: {status["running"]}')
    print(f'   Initial triggers in queue: {status["triggers_queued"]}')
    
    if not status["running"]:
        print('❌ Scheduler failed to start!')
        return
    
    # Get the event
    event_id = "ARRCOSTU2025"
    event = await EventStatusManager.get_event_by_id(event_id)
    
    if not event:
        print(f'❌ Event {event_id} not found')
        return
    
    print(f'\n🔍 Testing trigger update for event: {event_id}')
    
    # Show current triggers for this event
    current_triggers = [t for t in dynamic_scheduler.trigger_queue if t.event_id == event_id]
    print(f'   Triggers before update: {len(current_triggers)}')
    
    # Update the event with a new registration end date (tomorrow)
    tomorrow = datetime.now() + timedelta(days=1)
    updated_event = event.copy()
    updated_event['registration_end_date'] = tomorrow
    
    print(f'   Updating registration_end_date to: {tomorrow}')
    
    # Update triggers
    await dynamic_scheduler.update_event_triggers(event_id, updated_event)
    
    # Check triggers after update
    updated_triggers = [t for t in dynamic_scheduler.trigger_queue if t.event_id == event_id]
    print(f'   Triggers after update: {len(updated_triggers)}')
    
    for trigger in updated_triggers:
        time_until = trigger.trigger_time - datetime.now()
        print(f'     - {trigger.trigger_type.value} at {trigger.trigger_time} (in {time_until})')
    
    # Check overall scheduler status
    final_status = await dynamic_scheduler.get_status()
    print(f'\n📊 Final Status:')
    print(f'   Scheduler running: {final_status["running"]}')
    print(f'   Total triggers: {final_status["triggers_queued"]}')
    print(f'   Next trigger: {final_status["next_trigger"]}')
    
    # Stop scheduler
    print(f'\n🛑 Stopping scheduler...')
    await dynamic_scheduler.stop()
    
    await Database.close_db()

if __name__ == "__main__":
    asyncio.run(test_with_running_scheduler())
