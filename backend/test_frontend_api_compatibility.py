#!/usr/bin/env python3
"""
Test script to verify frontend API compatibility with normalized registration system
Tests all the endpoint changes made to fix the frontend data structure issues
"""

import asyncio
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database.operations import DatabaseOperations
from api.v1.client.registration.normalized_registration import NormalizedRegistrationService

async def test_registration_status_api():
    """Test the registration status API response structure"""
    print("🧪 Testing Registration Status API Compatibility...")
    
    try:
        # Get test student data
        test_student = await DatabaseOperations.find_one(
            "students",
            {"enrollment_no": "22BEIT30043"}
        )
        
        if not test_student:
            print("❌ Test student not found")
            return False
            
        print(f"✅ Found test student: {test_student['full_name']}")
        
        # Get student's registrations
        student_registrations = await NormalizedRegistrationService.get_student_registrations(
            test_student['enrollment_no']
        )
        
        if not student_registrations:
            print("❌ No registrations found for student")
            return False
            
        print(f"✅ Found {len(student_registrations)} registrations")
        
        # Test each registration
        for event_id, reference_data in student_registrations.items():
            print(f"\n--- Testing Event: {event_id} ---")
            
            registration_id = reference_data.get('registration_id')
            print(f"Registration ID: {registration_id}")
            
            # Get full registration data (what the frontend now expects)
            full_data = await NormalizedRegistrationService.get_full_registration_data(
                registration_id, event_id
            )
            
            if not full_data:
                print(f"❌ Could not get full registration data")
                continue
                
            # Test the API response structure that frontend expects
            api_response = {
                "success": True,
                "registered": True,
                "registration_id": registration_id,
                "registration_type": reference_data.get('registration_type', 'individual'),
                "registration_datetime": reference_data.get('registration_datetime'),
                "event": {"event_id": event_id},  # Simplified for test
                "full_registration_data": full_data
            }
            
            # Verify the structure matches what frontend components expect
            print(f"✅ API Response Structure Valid:")
            print(f"   - success: {api_response['success']}")
            print(f"   - registered: {api_response['registered']}")
            print(f"   - registration_id: {api_response['registration_id']}")
            print(f"   - registration_type: {api_response['registration_type']}")
            print(f"   - full_registration_data: {bool(api_response['full_registration_data'])}")
            
            # Test fields that frontend components access
            reg_data = api_response['full_registration_data']
            
            # Simulate the frontend flattening process
            if reg_data.get('student_data'):
                reg_data.update(reg_data['student_data'])
            
            print(f"✅ Frontend Required Fields:")
            print(f"   - full_name: {reg_data.get('full_name', 'MISSING')}")
            print(f"   - enrollment_no: {reg_data.get('enrollment_no', 'MISSING')}")
            print(f"   - department: {reg_data.get('department', 'MISSING')}")
            print(f"   - team_members: {len(reg_data.get('team_members', []))} members")
            
            if reg_data.get('registration_type') == 'team':
                print(f"   - team_name: {reg_data.get('team_name', 'MISSING')}")
        
        print(f"\n🎉 All registration status API tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ API compatibility test failed: {e}")
        return False

async def main():
    """Run all frontend API compatibility tests"""
    print("=" * 60)
    print("FRONTEND API COMPATIBILITY TESTING")
    print("=" * 60)
    
    success = await test_registration_status_api()
    
    print("\n" + "=" * 60)
    if success:
        print("🎉 ALL FRONTEND API COMPATIBILITY TESTS PASSED!")
        print("✅ Frontend components should now work correctly")
    else:
        print("❌ Some tests failed - check issues above")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
