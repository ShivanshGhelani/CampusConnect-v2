#!/usr/bin/env python3

import asyncio
from config.database import Database
import json

async def check_team_registrations():
    db = await Database.get_database()
    if db is None:
        print('Failed to connect to database')
        return
    
    print('=== CHECKING REGISTRATION MODES ===')
    
    # Check how registration_mode is stored in student registrations
    individual_by_reg_field = await db.student_registrations.count_documents({'registration.type': 'individual'})
    team_by_reg_field = await db.student_registrations.count_documents({'registration.type': 'team'})
    
    print(f"Student registrations with registration.type = 'individual': {individual_by_reg_field}")
    print(f"Student registrations with registration.type = 'team': {team_by_reg_field}")
    
    # Look for team data in registrations
    team_with_data = await db.student_registrations.find_one({'team': {'$ne': None}})
    if team_with_data:
        print('\nSample registration with team data:')
        print(f"Registration ID: {team_with_data.get('registration_id')}")
        print(f"Team data: {json.dumps(team_with_data.get('team'), indent=2, default=str)}")
    else:
        print('\nNo registrations with team data found')
    
    # Check all unique values in attendance.strategy field
    print('\n=== ATTENDANCE STRATEGIES IN USE ===')
    strategies = await db.student_registrations.distinct('attendance.strategy')
    print(f"Student attendance strategies: {strategies}")
    
    faculty_strategies = await db.faculty_registrations.distinct('attendance.strategy')
    print(f"Faculty attendance strategies: {faculty_strategies}")
    
    # Check events with different attendance strategies
    print('\n=== EVENTS WITH ATTENDANCE STRATEGIES ===')
    events_with_strategies = await db.events.find({'attendance_strategy': {'$exists': True}}, 
                                                  {'event_id': 1, 'event_name': 1, 'attendance_strategy': 1, 'attendance_mandatory': 1}).to_list(None)
    
    for event in events_with_strategies:
        print(f"Event: {event['event_id']} - {event['event_name']}")
        print(f"  Strategy: {event.get('attendance_strategy')}")
        print(f"  Mandatory: {event.get('attendance_mandatory')}")
        print()

if __name__ == '__main__':
    asyncio.run(check_team_registrations())
