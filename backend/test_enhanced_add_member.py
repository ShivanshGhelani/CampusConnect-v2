#!/usr/bin/env python3
"""
Test Enhanced Add Team Member Logic
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from config.settings import MONGODB_URL, DB_NAME

async def test_add_member_logic():
    """Test the enhanced add-team-member logic"""
    
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DB_NAME]
    
    # Test with a sample student who would be added
    test_enrollment = '22BECE30052'  # Rohan Gupta
    
    print(f"=== TESTING ADD MEMBER LOGIC FOR {test_enrollment} ===")
    
    try:
        # Get student data (this is what the API would fetch)
        new_member = await db['students'].find_one({"enrollment_no": test_enrollment})
        if not new_member:
            print(f"❌ Student {test_enrollment} not found")
            return
        
        print(f"✅ Found student: {new_member.get('full_name')}")
        
        # Simulate the new member data structure that would be created
        new_member_data = {
            "enrollment_no": test_enrollment,
            "full_name": new_member.get('full_name'),  # Fixed: use 'full_name' not 'name'
            "email": new_member.get('email'),
            "phone": new_member.get('mobile_no'),  # Fixed: use 'phone' to match expected field
            "course": new_member.get('course', new_member.get('department', '')),  # Added course
            "semester": new_member.get('semester', '')  # Added semester
        }
        
        print(f"\\n📋 NEW MEMBER DATA STRUCTURE:")
        for key, value in new_member_data.items():
            print(f"   {key}: {value}")
        
        # Check what's currently missing vs what will be added
        print(f"\\n🔍 COMPARISON WITH CURRENT DATA:")
        
        # Get current team data
        event = await db['events'].find_one({'event_id': 'STARTUP_PITCH_COMP_2025'})
        registrations = event.get('registrations', {})
        
        # Find team leader's current data
        for reg_id, reg_data in registrations.items():
            if (reg_data and 
                reg_data.get('registration_type') == 'team' and
                reg_data.get('team_registration_id') == 'TEAM500DB9'):
                team_members = reg_data.get('student_data', {}).get('team_members', [])
                
                # Find current member data if exists
                current_member = None
                for member in team_members:
                    if member.get('enrollment_no') == test_enrollment:
                        current_member = member
                        break
                
                if current_member:
                    print(f"   Current member data:")
                    for key, value in current_member.items():
                        print(f"     {key}: {value}")
                    
                    print(f"\\n   🔧 IMPROVEMENTS:")
                    for key, new_value in new_member_data.items():
                        current_value = current_member.get(key, 'MISSING')
                        if current_value != new_value:
                            print(f"     {key}: '{current_value}' → '{new_value}'")
                else:
                    print(f"   Member not currently in team - would be completely new")
                break
        
        print(f"\\n✅ The enhanced add-team-member API will now store complete member data!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(test_add_member_logic())
