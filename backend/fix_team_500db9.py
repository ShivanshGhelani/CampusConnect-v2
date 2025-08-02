#!/usr/bin/env python3
"""
Fix Team TEAM500DB9 Registration Issues
Complete the registration process for both team members
"""

import asyncio
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from config.settings import MONGODB_URL, DB_NAME

async def fix_team_registration():
    """Fix team registration issues for TEAM500DB9"""
    
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DB_NAME]
    
    event_id = 'STARTUP_PITCH_COMP_2025'
    team_id = 'TEAM500DB9'
    
    print(f"=== FIXING TEAM {team_id} REGISTRATION ===")
    print()
    
    try:
        # Get event data
        event = await db['events'].find_one({'event_id': event_id})
        if not event:
            print("❌ Event not found!")
            return
        
        registrations = event.get('registrations', {})
        
        # Get student details
        students_collection = db['students']
        
        # Member details
        members_to_fix = [
            {
                'enrollment': '22BECE30052',
                'reg_id': 'REG125482',
                'name': 'Rohan Gupta'
            },
            {
                'enrollment': '22CSEB10056', 
                'reg_id': 'REGBFF980',
                'name': 'Riya Sharma'
            }
        ]
        
        # Step 1: Fix team leader's team_members array with proper names
        leader_reg_id = 'REGA6696A'
        leader_reg = registrations.get(leader_reg_id)
        
        if leader_reg:
            print("🔧 Step 1: Fixing team leader's team_members array...")
            
            # Get full student data for each member
            updated_members = []
            for member in members_to_fix:
                student = await students_collection.find_one({'enrollment_no': member['enrollment']})
                if student:
                    updated_members.append({
                        'enrollment_no': member['enrollment'],
                        'full_name': student.get('full_name', member['name']),
                        'email': student.get('email', ''),
                        'phone': student.get('phone', ''),
                        'course': student.get('course', ''),
                        'semester': student.get('semester', '')
                    })
                    print(f"   ✅ Added complete data for {student.get('full_name', member['name'])}")
            
            # Update team leader's registration
            await db['events'].update_one(
                {'event_id': event_id},
                {
                    '$set': {
                        f'registrations.{leader_reg_id}.student_data.team_members': updated_members
                    }
                }
            )
            print(f"   ✅ Updated team leader's team_members array with {len(updated_members)} members")
        
        # Step 2: Fix individual registrations
        print("\\n🔧 Step 2: Fixing individual member registrations...")
        
        for member in members_to_fix:
            reg_data = registrations.get(member['reg_id'])
            if reg_data:
                # Update registration with team_id
                await db['events'].update_one(
                    {'event_id': event_id},
                    {
                        '$set': {
                            f'registrations.{member["reg_id"]}.team_id': team_id
                        }
                    }
                )
                print(f"   ✅ Added team_id to {member['name']}'s registration")
        
        # Step 3: Fix/create participation records
        print("\\n🔧 Step 3: Fixing participation records...")
        
        for member in members_to_fix:
            # Check if participation exists
            existing_participation = await db['student_participation'].find_one({
                'event_id': event_id,
                'enrollment_no': member['enrollment']
            })
            
            # Get student data
            student = await students_collection.find_one({'enrollment_no': member['enrollment']})
            
            participation_data = {
                'event_id': event_id,
                'enrollment_no': member['enrollment'],
                'full_name': student.get('full_name', member['name']) if student else member['name'],
                'participation_type': 'team_member',
                'team_id': team_id,
                'registration_time': datetime.utcnow().isoformat(),
                'status': 'registered'
            }
            
            if existing_participation:
                # Update existing participation
                await db['student_participation'].update_one(
                    {
                        'event_id': event_id,
                        'enrollment_no': member['enrollment']
                    },
                    {'$set': participation_data}
                )
                print(f"   ✅ Updated participation record for {member['name']}")
            else:
                # Create new participation
                await db['student_participation'].insert_one(participation_data)
                print(f"   ✅ Created participation record for {member['name']}")
        
        print("\\n🎉 TEAM REGISTRATION FIX COMPLETED!")
        print("   - Team leader's members array updated with complete data")
        print("   - Individual registrations updated with team_id")
        print("   - Participation records fixed/created")
        print("\\n✅ Both team members should now appear in their profile pages!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(fix_team_registration())
