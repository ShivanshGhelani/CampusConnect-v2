#!/usr/bin/env python3
"""
Team Member Cleanup and Re-add Fix Script
Fixes the issue where removed team members still appear as "already registered"
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from config.settings import MONGODB_URL, DB_NAME

async def cleanup_and_debug_team_data():
    """Clean up any orphaned registration data and debug the current state"""
    
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DB_NAME]
    
    event_id = 'STARTUP_PITCH_COMP_2025'
    
    print("=== DEBUGGING TEAM REGISTRATION CLEANUP ISSUE ===")
    print()
    
    try:
        # Get current event data
        event = await db['events'].find_one({'event_id': event_id})
        if not event:
            print("❌ Event not found!")
            return
        
        registrations = event.get('registrations', {})
        
        print(f"Current registrations in event: {len(registrations)}")
        print()
        
        # List all current registrations
        for reg_id, reg_data in registrations.items():
            student_data = reg_data.get('student_data', {})
            reg_type = reg_data.get('registration_type')
            enrollment = student_data.get('enrollment_no')
            name = student_data.get('full_name')
            
            print(f"Registration {reg_id}:")
            print(f"  Student: {name} ({enrollment})")
            print(f"  Type: {reg_type}")
            print(f"  Team ID: {reg_data.get('team_registration_id')}")
            print()
        
        # Check for any orphaned/duplicate registrations
        enrollment_counts = {}
        for reg_id, reg_data in registrations.items():
            enrollment = reg_data.get('student_data', {}).get('enrollment_no')
            if enrollment:
                if enrollment not in enrollment_counts:
                    enrollment_counts[enrollment] = []
                enrollment_counts[enrollment].append({
                    'reg_id': reg_id,
                    'type': reg_data.get('registration_type'),
                    'name': reg_data.get('student_data', {}).get('full_name')
                })
        
        print("=== DUPLICATE REGISTRATION CHECK ===")
        duplicates_found = False
        for enrollment, regs in enrollment_counts.items():
            if len(regs) > 1:
                duplicates_found = True
                print(f"❌ DUPLICATE FOUND: {enrollment}")
                for reg in regs:
                    print(f"   - {reg['reg_id']}: {reg['name']} ({reg['type']})")
                print()
        
        if not duplicates_found:
            print("✅ No duplicate registrations found")
            print()
        
        # Check participation records
        participation_records = await db['student_participation'].find({'event_id': event_id}).to_list(None)
        
        print(f"=== PARTICIPATION RECORDS ({len(participation_records)}) ===")
        for record in participation_records:
            print(f"- {record.get('full_name')} ({record.get('enrollment_no')}) - {record.get('registration_type')}")
        print()
        
        # Check for orphaned participation records (no matching registration)
        registration_enrollments = {reg_data.get('student_data', {}).get('enrollment_no') 
                                  for reg_data in registrations.values()}
        participation_enrollments = {record.get('enrollment_no') for record in participation_records}
        
        orphaned_participation = participation_enrollments - registration_enrollments
        orphaned_registrations = registration_enrollments - participation_enrollments
        
        if orphaned_participation:
            print(f"❌ ORPHANED PARTICIPATION RECORDS: {orphaned_participation}")
        if orphaned_registrations:
            print(f"❌ ORPHANED REGISTRATIONS: {orphaned_registrations}")
        
        if not orphaned_participation and not orphaned_registrations:
            print("✅ Registration and participation data is consistent")
        
        print()
        print("=== CLEANUP RECOMMENDATIONS ===")
        
        # If there are issues, provide cleanup options
        if duplicates_found or orphaned_participation or orphaned_registrations:
            print("Issues detected. Running automatic cleanup...")
            
            # Remove orphaned participation records
            if orphaned_participation:
                for enrollment in orphaned_participation:
                    await db['student_participation'].delete_many({
                        'event_id': event_id,
                        'enrollment_no': enrollment
                    })
                    print(f"✅ Removed orphaned participation record for {enrollment}")
            
            # Clean up any null/empty registrations
            clean_registrations = {}
            for reg_id, reg_data in registrations.items():
                if (reg_data and 
                    reg_data.get('student_data') and 
                    reg_data.get('student_data', {}).get('enrollment_no')):
                    clean_registrations[reg_id] = reg_data
                else:
                    print(f"✅ Removing invalid registration: {reg_id}")
            
            # Update the event with clean registrations
            await db['events'].update_one(
                {'event_id': event_id},
                {'$set': {'registrations': clean_registrations}}
            )
            
            print("✅ Cleanup completed!")
        else:
            print("✅ No cleanup needed - data is consistent")
    
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        await client.close()

if __name__ == "__main__":
    asyncio.run(cleanup_and_debug_team_data())
