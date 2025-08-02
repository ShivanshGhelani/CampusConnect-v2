#!/usr/bin/env python3
"""
Quick Team Member Cleanup Script
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from config.settings import MONGODB_URL, DB_NAME

async def cleanup_specific_student():
    """Clean up a specific student's registration data"""
    
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DB_NAME]
    
    event_id = 'STARTUP_PITCH_COMP_2025'
    student_enrollment = '22BECE30052'  # Hardcoded for quick fix
    
    print(f"=== CLEANING UP DATA FOR STUDENT: {student_enrollment} ===")
    
    try:
        # Clean participation records
        result = await db['student_participation'].delete_many({
            'event_id': event_id,
            'enrollment_no': student_enrollment
        })
        print(f"✅ Removed {result.deleted_count} participation record(s)")
        
        # Get event and clean registrations if any
        event = await db['events'].find_one({'event_id': event_id})
        if event:
            registrations = event.get('registrations', {})
            clean_registrations = {}
            removed_count = 0
            
            for reg_id, reg_data in registrations.items():
                if (reg_data and 
                    reg_data.get('student_data', {}).get('enrollment_no') == student_enrollment):
                    removed_count += 1
                    print(f"  ✅ Found and removing registration: {reg_id}")
                elif reg_data:  # Keep non-null registrations
                    clean_registrations[reg_id] = reg_data
            
            if removed_count > 0:
                await db['events'].update_one(
                    {'event_id': event_id},
                    {'$set': {'registrations': clean_registrations}}
                )
                print(f"✅ Removed {removed_count} registration(s) from event")
            else:
                print("✅ No registrations found to remove")
        
        print(f"\\n🎉 {student_enrollment} cleanup completed!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(cleanup_specific_student())
