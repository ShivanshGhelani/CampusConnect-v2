#!/usr/bin/env python3
"""
Test script to verify the team-info API fix
"""

import asyncio
import sys
import os
import json

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def test_team_info_api():
    """Test the team-info API endpoint with actual data"""
    print("🧪 TESTING TEAM-INFO API ENDPOINT")
    print("=" * 60)
    
    try:
        # Import and test the actual API function
        sys.path.append(os.path.join(os.path.dirname(__file__), 'api', 'v1', 'client', 'profile'))
        
        from database.operations import DatabaseOperations
        from api.v1.client.profile import get_team_info
        from fastapi import Request
        
        # Get a sample team registration
        events_with_registrations = await DatabaseOperations.find_many(
            "events", 
            {"registrations": {"$exists": True, "$ne": {}}}, 
            limit=1
        )
        
        if not events_with_registrations:
            print("❌ No events with registrations found")
            return
        
        event = events_with_registrations[0]
        event_id = event.get("event_id")
        registrations = event.get("registrations", {})
        
        # Find a team registration
        team_id = None
        for reg_id, reg_data in registrations.items():
            if reg_data and reg_data.get('registration_type') in ['team', 'team_leader']:
                team_id = reg_data.get('team_registration_id')
                break
        
        if not team_id:
            print("❌ No team registrations found")
            return
        
        print(f"📋 Testing with Event: {event_id}, Team: {team_id}")
        
        # Create a mock request object
        class MockRequest:
            def __init__(self):
                self.headers = {}
                self.cookies = {}
                self.session = {}
        
        mock_request = MockRequest()
        
        # Call the API function
        result = await get_team_info(event_id, team_id, mock_request)
        
        print(f"\n🔍 API Response:")
        print(f"Success: {result.get('success')}")
        print(f"Message: {result.get('message')}")
        
        if result.get('success') and result.get('data'):
            data = result['data']
            print(f"\n📊 Team Data:")
            print(f"Team Name: {data.get('team_name')}")
            print(f"Total Members: {data.get('total_members')}")
            print(f"Members:")
            
            for i, member in enumerate(data.get('members', [])[:5]):  # Show first 5 members
                print(f"  {i+1}. {member.get('full_name')} ({member.get('enrollment_no')})")
                print(f"     Type: {member.get('registration_type')}")
                print(f"     Registration ID: {member.get('registration_id')}")
            
            if result.get('success'):
                print(f"\n✅ SUCCESS: Team info API is working correctly!")
                print(f"   - Found team: {data.get('team_name')}")
                print(f"   - Total members: {data.get('total_members')}")
                return True
        else:
            print(f"\n❌ FAILED: {result.get('message')}")
            return False
            
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Run the test"""
    success = await test_team_info_api()
    
    print("\n" + "=" * 60)
    if success:
        print("🎉 TEAM-INFO API TEST PASSED!")
        print("✅ The 'View Team' button should now work for team members!")
    else:
        print("❌ Team-info API test failed - investigate issues above")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
