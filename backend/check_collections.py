#!/usr/bin/env python3

import asyncio
from config.database import Database
import json

async def check_collections():
    db = await Database.get_database()
    if db is None:
        print('Failed to connect to database')
        return
    
    print('=== STUDENT REGISTRATIONS COLLECTION ===')
    student_reg = await db.student_registrations.find_one()
    if student_reg:
        print('Sample student registration document:')
        # Convert ObjectId to string for better readability
        student_reg['_id'] = str(student_reg['_id'])
        print(json.dumps(student_reg, indent=2, default=str))
        print()
    
    # Check for team-based registration
    team_reg = await db.student_registrations.find_one({'registration_mode': 'team'})
    if team_reg:
        print('Sample TEAM registration document:')
        team_reg['_id'] = str(team_reg['_id'])
        print(json.dumps(team_reg, indent=2, default=str))
        print()
    
    print('=== FACULTY REGISTRATIONS COLLECTION ===')
    faculty_reg = await db.faculty_registrations.find_one()
    if faculty_reg:
        print('Sample faculty registration document:')
        faculty_reg['_id'] = str(faculty_reg['_id'])
        print(json.dumps(faculty_reg, indent=2, default=str))
        print()
    
    print('=== EVENT WITH ATTENDANCE STRATEGY ===')
    event = await db.events.find_one({'attendance_strategy': {'$exists': True}})
    if event:
        print('Sample event with attendance strategy:')
        event['_id'] = str(event['_id'])
        # Just show relevant attendance fields
        relevant_fields = {
            'event_id': event.get('event_id'),
            'event_name': event.get('event_name'),
            'attendance_mandatory': event.get('attendance_mandatory'),
            'attendance_strategy': event.get('attendance_strategy'),
            'attendance_config': event.get('attendance_config'),
            'registration_mode': event.get('registration_mode'),
            'is_team_based': event.get('is_team_based')
        }
        print(json.dumps(relevant_fields, indent=2, default=str))
        print()
    
    # Check attendance fields structure
    print('=== ATTENDANCE FIELDS IN REGISTRATIONS ===')
    student_with_attendance = await db.student_registrations.find_one({'attendance': {'$exists': True}})
    if student_with_attendance:
        print('Student registration with attendance fields:')
        attendance_data = student_with_attendance.get('attendance', {})
        print(json.dumps(attendance_data, indent=2, default=str))
        print()
    
    faculty_with_attendance = await db.faculty_registrations.find_one({'attendance': {'$exists': True}})
    if faculty_with_attendance:
        print('Faculty registration with attendance fields:')
        attendance_data = faculty_with_attendance.get('attendance', {})
        print(json.dumps(attendance_data, indent=2, default=str))
        print()
    
    # Count documents
    student_count = await db.student_registrations.count_documents({})
    faculty_count = await db.faculty_registrations.count_documents({})
    events_count = await db.events.count_documents({})
    student_individual = await db.student_registrations.count_documents({'registration_mode': 'individual'})
    student_team = await db.student_registrations.count_documents({'registration_mode': 'team'})
    
    print(f'Total student registrations: {student_count}')
    print(f'  - Individual registrations: {student_individual}')
    print(f'  - Team registrations: {student_team}')
    print(f'Total faculty registrations: {faculty_count}')
    print(f'Total events: {events_count}')

if __name__ == '__main__':
    asyncio.run(check_collections())
