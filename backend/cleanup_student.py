#!/usr/bin/env python3
"""
Manual Team Member Cleanup Script
Use this to clean up a specific student's registration data when "already registered" error occurs
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from config.settings import MONGODB_URL, DB_NAME

async def cleanup_specific_student():
    """Clean up a specific student's registration data"""
    
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DB_NAME]
    
    event_id = 'STARTUP_PITCH_COMP_2025'
    
    # Replace this with the enrollment number causing the issue
    student_enrollment = input("Enter the enrollment number causing 'already registered' error: ").strip().upper()
    
    if not student_enrollment:
        print("No enrollment number provided. Exiting.")
        return
    
    print(f"=== CLEANING UP DATA FOR STUDENT: {student_enrollment} ===")
    print()
    
    try:
        # Get current event data
        event = await db['events'].find_one({'event_id': event_id})
        if not event:
            print("❌ Event not found!")
            return
        
        registrations = event.get('registrations', {})
        
        # Find any registrations for this student
        student_registrations = []
        for reg_id, reg_data in registrations.items():
            if (reg_data and 
                reg_data.get('student_data', {}).get('enrollment_no') == student_enrollment):
                student_registrations.append({
                    'reg_id': reg_id,
                    'type': reg_data.get('registration_type'),
                    'name': reg_data.get('student_data', {}).get('full_name')
                })
        
        print(f"Found {len(student_registrations)} registrations for {student_enrollment}:")
        for reg in student_registrations:
            print(f"  - {reg['reg_id']}: {reg['name']} ({reg['type']})")
        
        if not student_registrations:
            print("✅ No registrations found for this student")
        else:
            print("\\n🔧 Removing all registrations for this student...")
            
            # Remove all registrations for this student
            clean_registrations = {}
            removed_count = 0
            
            for reg_id, reg_data in registrations.items():
                if (reg_data and 
                    reg_data.get('student_data', {}).get('enrollment_no') != student_enrollment):
                    clean_registrations[reg_id] = reg_data
                else:
                    removed_count += 1
                    print(f"  ✅ Removed registration: {reg_id}")
            
            # Update the event with clean registrations
            await db['events'].update_one(
                {'event_id': event_id},
                {'$set': {'registrations': clean_registrations}}
            )
            
            print(f"✅ Removed {removed_count} registration(s) from event")
        
        # Check and clean participation records
        participation_records = await db['student_participation'].find({
            'event_id': event_id,
            'enrollment_no': student_enrollment
        }).to_list(None)
        
        print(f"\\nFound {len(participation_records)} participation records for {student_enrollment}")
        
        if participation_records:
            # Remove participation records
            result = await db['student_participation'].delete_many({
                'event_id': event_id,
                'enrollment_no': student_enrollment
            })
            print(f"✅ Removed {result.deleted_count} participation record(s)")
        
        # Also check if student is in any team leader's members array
        updated_leaders = 0
        for reg_id, reg_data in clean_registrations.items():
            if reg_data.get('registration_type') == 'team':
                team_members = reg_data.get('student_data', {}).get('team_members', [])
                original_count = len(team_members)
                
                # Remove the student from team members array
                updated_members = [
                    member for member in team_members 
                    if member.get('enrollment_no') != student_enrollment
                ]
                
                if len(updated_members) != original_count:
                    await db['events'].update_one(
                        {'event_id': event_id},
                        {
                            '$set': {
                                f'registrations.{reg_id}.student_data.team_members': updated_members
                            }
                        }
                    )
                    updated_leaders += 1
                    leader_name = reg_data.get('student_data', {}).get('full_name')
                    print(f"✅ Removed {student_enrollment} from {leader_name}'s team members array")
        
        print(f"\\n✅ CLEANUP COMPLETED!")
        print(f"   - Registrations removed: {len(student_registrations)}")
        print(f"   - Participation records removed: {len(participation_records)}")
        print(f"   - Team leader arrays updated: {updated_leaders}")
        print(f"\\n🎉 {student_enrollment} should now be able to be re-added to the team!")
        
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        await client.close()

if __name__ == "__main__":
    asyncio.run(cleanup_specific_student())
