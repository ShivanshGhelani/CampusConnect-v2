#!/usr/bin/env python3
"""
Fix Team Member Names in Team Leader's Array
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from config.settings import MONGODB_URL, DB_NAME

async def fix_team_member_names():
    """Fix team member names in the team leader's team_members array"""
    
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DB_NAME]
    
    event_id = 'STARTUP_PITCH_COMP_2025'
    team_id = 'TEAM500DB9'
    leader_reg_id = 'REGA6696A'
    
    print(f"=== FIXING TEAM MEMBER NAMES ===")
    
    try:
        # Get the event
        event = await db['events'].find_one({"event_id": event_id})
        if not event:
            print("❌ Event not found")
            return
        
        registrations = event.get('registrations', {})
        team_registration = registrations.get(leader_reg_id)
        
        if not team_registration:
            print(f"❌ Team leader registration {leader_reg_id} not found")
            return
        
        team_members_array = team_registration.get('student_data', {}).get('team_members', [])
        print(f"📋 Current team members: {len(team_members_array)}")
        
        # Update each member with complete data from students collection
        updated_members = []
        
        for member in team_members_array:
            enrollment_no = member.get('enrollment_no')
            print(f"\\n🔍 Processing {enrollment_no}...")
            
            if enrollment_no:
                # Get complete student data
                student = await db['students'].find_one({'enrollment_no': enrollment_no})
                
                if student:
                    updated_member = {
                        'enrollment_no': enrollment_no,
                        'full_name': student.get('full_name', member.get('name', 'Unknown')),
                        'email': student.get('email', member.get('email', '')),
                        'phone': student.get('mobile_no', member.get('mobile_no', '')),
                        'course': student.get('course', member.get('course', '')),
                        'semester': student.get('semester', member.get('semester', ''))
                    }
                    updated_members.append(updated_member)
                    print(f"   ✅ Updated: {updated_member['full_name']}")
                else:
                    # Keep original if student not found
                    updated_members.append(member)
                    print(f"   ⚠️ Student not found, keeping original data")
            else:
                print(f"   ❌ No enrollment number, skipping")
        
        # Update the team leader's registration with corrected member data
        await db['events'].update_one(
            {'event_id': event_id},
            {
                '$set': {
                    f'registrations.{leader_reg_id}.student_data.team_members': updated_members
                }
            }
        )
        
        print(f"\\n✅ Updated team leader's team_members array with {len(updated_members)} members")
        print("✅ Team member names should now display correctly in the team-info API!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(fix_team_member_names())
