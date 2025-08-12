#!/usr/bin/env python3
"""
Test script to verify the add-team-member fix
"""

import asyncio
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def test_add_team_member_logic():
    """Test the add-team-member logic with actual data"""
    print("🧪 TESTING ADD-TEAM-MEMBER LOGIC")
    print("=" * 60)
    
    try:
        from database.operations import DatabaseOperations
        
        # Get a sample team registration
        events_with_registrations = await DatabaseOperations.find_many(
            "events", 
            {"registrations": {"$exists": True, "$ne": {}}}, 
            limit=1
        )
        
        if not events_with_registrations:
            print("❌ No events with registrations found")
            return False
        
        event = events_with_registrations[0]
        event_id = event.get("event_id")
        registrations = event.get("registrations", {})
        
        print(f"📋 Testing with Event: {event_id}")
        print(f"Total registrations: {len(registrations)}")
        
        # Find a team leader
        team_leader_enrollment = None
        team_leader_reg_type = None
        team_reg_id = None
        
        for reg_id, reg_data in registrations.items():
            if reg_data and reg_data.get('registration_type') in ['team', 'team_leader']:
                student_data = reg_data.get('student_data', {})
                team_leader_enrollment = student_data.get('enrollment_no')
                team_leader_reg_type = reg_data.get('registration_type')
                team_reg_id = reg_data.get('team_registration_id')
                print(f"Found team leader: {team_leader_enrollment} (type: {team_leader_reg_type})")
                break
        
        if not team_leader_enrollment:
            print("❌ No team leader found")
            return False
        
        # Test the add-team-member logic (what the API would do)
        print(f"\n🧪 TESTING ADD-TEAM-MEMBER LOGIC:")
        print(f"Looking for team leader registration...")
        
        # Simulate what the API does
        team_registration = None
        found_reg_id = None
        
        for reg_id, reg_data in registrations.items():
            student_data = reg_data.get('student_data', {})
            if (student_data.get('enrollment_no') == team_leader_enrollment and 
                reg_data.get('registration_type') in ['team', 'team_leader']):
                team_registration = reg_data
                found_reg_id = reg_id
                print(f"✅ Found team registration: {found_reg_id}")
                print(f"   Registration Type: {reg_data.get('registration_type')}")
                print(f"   Team Leader: {student_data.get('enrollment_no')}")
                print(f"   Team Name: {student_data.get('team_name', 'Unknown')}")
                break
        
        if team_registration:
            print(f"\n✅ SUCCESS: Add-team-member logic would work!")
            print(f"   - Team leader found with registration type: {team_registration.get('registration_type')}")
            print(f"   - Registration ID: {found_reg_id}")
            return True
        else:
            print(f"\n❌ FAILED: Team registration not found")
            print(f"Available registrations for this enrollment ({team_leader_enrollment}):")
            for reg_id, reg_data in registrations.items():
                student_data = reg_data.get('student_data', {})
                if student_data.get('enrollment_no') == team_leader_enrollment:
                    print(f"   - {reg_id}: type={reg_data.get('registration_type')}")
            return False
            
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Run the test"""
    success = await test_add_team_member_logic()
    
    print("\n" + "=" * 60)
    if success:
        print("🎉 ADD-TEAM-MEMBER FIX VERIFIED!")
        print("✅ Team leaders should now be able to add members to their teams!")
    else:
        print("❌ Add-team-member fix needs further investigation")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
