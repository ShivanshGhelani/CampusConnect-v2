#!/usr/bin/env python3
"""
Debug Team Registration Issues
Check what's missing for team member 22CSEB10056
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from config.settings import MONGODB_URL, DB_NAME

async def debug_team_registration():
    """Debug team registration issues"""
    
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DB_NAME]
    
    event_id = 'STARTUP_PITCH_COMP_2025'
    team_id = 'TEAM500DB9'
    leader_enrollment = '22BEIT30043'
    member1_enrollment = '22BECE30052'
    member2_enrollment = '22CSEB10056'
    
    print(f"=== DEBUGGING TEAM {team_id} ===")
    print()
    
    try:
        # 1. Check event registrations
        event = await db['events'].find_one({'event_id': event_id})
        if not event:
            print("❌ Event not found!")
            return
        
        registrations = event.get('registrations', {})
        print(f"📋 TOTAL REGISTRATIONS: {len(registrations)}")
        print()
        
        # Find team leader's registration
        leader_reg = None
        for reg_id, reg_data in registrations.items():
            if (reg_data and 
                reg_data.get('student_data', {}).get('enrollment_no') == leader_enrollment):
                leader_reg = reg_data
                leader_reg_id = reg_id
                break
        
        if leader_reg:
            print(f"✅ TEAM LEADER REGISTRATION FOUND:")
            print(f"   Registration ID: {leader_reg_id}")
            print(f"   Name: {leader_reg.get('student_data', {}).get('full_name')}")
            print(f"   Type: {leader_reg.get('registration_type')}")
            team_members = leader_reg.get('student_data', {}).get('team_members', [])
            print(f"   Team Members in Array: {len(team_members)}")
            for i, member in enumerate(team_members, 1):
                print(f"     {i}. {member.get('full_name')} ({member.get('enrollment_no')})")
            print()
        else:
            print("❌ Team leader registration not found!")
            return
        
        # Check individual registrations for each member
        for enrollment, name in [
            (member1_enrollment, "Member 1"),
            (member2_enrollment, "Member 2")
        ]:
            print(f"🔍 CHECKING {name} ({enrollment}):")
            
            # Check if they have individual registration
            individual_reg = None
            for reg_id, reg_data in registrations.items():
                if (reg_data and 
                    reg_data.get('student_data', {}).get('enrollment_no') == enrollment):
                    individual_reg = reg_data
                    individual_reg_id = reg_id
                    break
            
            if individual_reg:
                print(f"   ✅ Individual Registration: {individual_reg_id}")
                print(f"   Name: {individual_reg.get('student_data', {}).get('full_name')}")
                print(f"   Type: {individual_reg.get('registration_type')}")
                print(f"   Team ID: {individual_reg.get('team_id')}")
            else:
                print(f"   ❌ No individual registration found")
            
            # Check participation record
            participation = await db['student_participation'].find_one({
                'event_id': event_id,
                'enrollment_no': enrollment
            })
            
            if participation:
                print(f"   ✅ Participation Record Found")
                print(f"   Participation Type: {participation.get('participation_type')}")
                print(f"   Team ID: {participation.get('team_id')}")
            else:
                print(f"   ❌ No participation record found")
            
            print()
        
        print("🔧 RECOMMENDED FIXES:")
        
        # Check what's missing for member2
        member2_has_registration = any(
            reg_data and reg_data.get('student_data', {}).get('enrollment_no') == member2_enrollment
            for reg_data in registrations.values()
        )
        
        member2_has_participation = await db['student_participation'].find_one({
            'event_id': event_id,
            'enrollment_no': member2_enrollment
        }) is not None
        
        if not member2_has_registration:
            print(f"   1. Create individual registration for {member2_enrollment}")
        
        if not member2_has_participation:
            print(f"   2. Create participation record for {member2_enrollment}")
        
        if member2_has_registration and member2_has_participation:
            print(f"   ✅ All data exists - check frontend refresh or API issues")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(debug_team_registration())
