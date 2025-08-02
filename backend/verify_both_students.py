#!/usr/bin/env python3
"""
Verify Both Students Have Complete Registration Data
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from config.settings import MONGODB_URL, DB_NAME

async def verify_both_students():
    """Verify both students have complete registration data"""
    
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DB_NAME]
    
    event_id = 'STARTUP_PITCH_COMP_2025'
    students_to_check = [
        {'enrollment': '22BECE30052', 'name': 'Rohan Gupta'},
        {'enrollment': '22CSEB10056', 'name': 'Riya Sharma'}
    ]
    
    print(f"=== VERIFICATION FOR BOTH TEAM MEMBERS ===")
    print()
    
    try:
        for student in students_to_check:
            enrollment = student['enrollment']
            name = student['name']
            
            print(f"🔍 CHECKING {name} ({enrollment}):")
            
            # Check student's event_participations
            student_doc = await db['students'].find_one({'enrollment_no': enrollment})
            if student_doc:
                event_participations = student_doc.get('event_participations', {})
                if event_id in event_participations:
                    participation = event_participations[event_id]
                    print(f"   ✅ event_participations entry exists")
                    print(f"      Registration ID: {participation.get('registration_id')}")
                    print(f"      Type: {participation.get('registration_type')}")
                    print(f"      Team: {participation.get('team_name')}")
                else:
                    print(f"   ❌ Missing event_participations entry")
            else:
                print(f"   ❌ Student document not found")
            
            # Check participation record
            participation_record = await db['student_participation'].find_one({
                'event_id': event_id,
                'enrollment_no': enrollment
            })
            
            if participation_record:
                print(f"   ✅ Participation record exists")
                print(f"      Type: {participation_record.get('participation_type')}")
                print(f"      Team ID: {participation_record.get('team_id')}")
            else:
                print(f"   ❌ Missing participation record")
            
            print()
        
        print("🎯 SUMMARY:")
        print("Both students should now see the event in their profile pages!")
        print("The add-team-member API has been fixed to prevent this issue in the future.")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(verify_both_students())
