#!/usr/bin/env python3
"""
Fix Missing event_participations for Student 22CSEB10056
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from config.settings import MONGODB_URL, DB_NAME

async def fix_student_event_participation():
    """Add missing event_participations entry for student 22CSEB10056"""
    
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DB_NAME]
    
    event_id = 'STARTUP_PITCH_COMP_2025'
    student_enrollment = '22CSEB10056'
    
    print(f"=== FIXING EVENT PARTICIPATION FOR {student_enrollment} ===")
    
    try:
        # Get the student's registration data from the event
        event = await db['events'].find_one({'event_id': event_id})
        if not event:
            print("❌ Event not found!")
            return
        
        registrations = event.get('registrations', {})
        
        # Find this student's registration
        student_registration = None
        student_reg_id = None
        
        for reg_id, reg_data in registrations.items():
            if (reg_data and 
                reg_data.get('student_data', {}).get('enrollment_no') == student_enrollment):
                student_registration = reg_data
                student_reg_id = reg_id
                break
        
        if not student_registration:
            print(f"❌ Registration not found for {student_enrollment}")
            return
        
        print(f"✅ Found registration: {student_reg_id}")
        print(f"   Type: {student_registration.get('registration_type')}")
        print(f"   Team ID: {student_registration.get('team_registration_id')}")
        
        # Check if student already has event_participations entry
        student_doc = await db['students'].find_one({'enrollment_no': student_enrollment})
        if not student_doc:
            print(f"❌ Student document not found for {student_enrollment}")
            return
        
        event_participations = student_doc.get('event_participations', {})
        
        if event_id in event_participations:
            print(f"✅ Student already has event_participations entry for {event_id}")
            print(f"   Current data: {event_participations[event_id]}")
            return
        
        print(f"❌ Missing event_participations entry for {event_id}")
        
        # Create the event participation data
        student_participation_data = {
            'registration_id': student_reg_id,
            'registration_type': student_registration.get('registration_type', 'team_member'),
            'registration_datetime': student_registration.get('registration_datetime'),
            'team_registration_id': student_registration.get('team_registration_id'),
            'team_name': student_registration.get('student_data', {}).get('team_name'),
            'team_leader_enrollment': student_registration.get('team_leader_enrollment'),
            'status': 'registered'
        }
        
        print(f"🔧 Creating event_participations entry...")
        print(f"   Data: {student_participation_data}")
        
        # Add the event participation to the student's record
        await db['students'].update_one(
            {"enrollment_no": student_enrollment},
            {"$set": {f"event_participations.{event_id}": student_participation_data}}
        )
        
        print(f"✅ Successfully added event_participations entry for {student_enrollment}")
        print(f"🎉 Student {student_enrollment} should now see the event in their profile page!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(fix_student_event_participation())
