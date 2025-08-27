#!/usr/bin/env python3
"""
Test script for Enhanced EventStatusManager
"""
import asyncio
from config.database import Database
from utils.event_status_manager import EventStatusManager

async def test_status_manager():
    await Database.connect_db()
    
    print('🧪 Testing Enhanced EventStatusManager...')
    
    # Get events and test status calculation
    events = await EventStatusManager.get_available_events('all')
    
    print(f'\n📊 Found {len(events)} events')
    
    # Test a specific event
    for event in events[:2]:  # Test first 2 events
        event_id = event.get('event_id')
        status = event.get('status', 'unknown')
        sub_status = event.get('sub_status', 'unknown')
        reg_start = event.get('registration_start_date')
        reg_end = event.get('registration_end_date')
        event_start = event.get('start_datetime')
        
        print(f'\n🔍 Event: {event_id}')
        print(f'   Status: {status} / {sub_status}')
        print(f'   Registration Start: {reg_start}')
        print(f'   Registration End: {reg_end}')
        print(f'   Event Start: {event_start}')
        
        # Test timeline info
        timeline = await EventStatusManager.get_event_timeline_info(event)
        phases_count = len(timeline['phases'])
        print(f'   Timeline Phases: {phases_count}')
        
        for i, phase in enumerate(timeline['phases']):
            phase_name = phase['name']
            phase_status = phase['status']
            is_current = phase.get('is_current', False)
            current_marker = "→ " if is_current else "  "
            print(f'     {current_marker}{i+1}. {phase_name} ({phase_status})')
        
        if timeline.get('next_phase'):
            next_phase = timeline['next_phase']
            time_remaining = timeline['time_remaining']
            print(f'   ⏰ Next Phase: {next_phase["name"]} in {time_remaining}')
        else:
            print(f'   ✅ Next Phase: None (event completed)')
    
    await Database.close_db()

if __name__ == "__main__":
    asyncio.run(test_status_manager())
