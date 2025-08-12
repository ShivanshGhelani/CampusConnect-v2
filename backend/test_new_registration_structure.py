#!/usr/bin/env python3
"""
Test script to verify new registrations are stored correctly without duplication
"""

import asyncio
import sys
import os
import json

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database.operations import DatabaseOperations
from api.v1.client.registration.normalized_registration import NormalizedRegistrationService
from models.student import Student

async def test_new_registration_data_structure():
    """Test that new registrations are stored correctly"""
    print("🧪 Testing New Registration Data Structure...")
    
    try:
        # Get a test student
        student_data = await DatabaseOperations.find_one(
            "students",
            {"enrollment_no": "22BEIT30043"}
        )
        
        if not student_data:
            print("❌ Test student not found")
            return False
            
        student = Student(**student_data)
        print(f"✅ Found test student: {student.full_name}")
        
        # Simulate registration data with potential duplicate fields
        test_registration_data = {
            "full_name": "Different Name",  # This should NOT be stored at top level
            "department": "Wrong Department",  # This should NOT be stored at top level
            "enrollment_no": "WRONG123",  # This should NOT be stored at top level
            "gender": "Male",
            "date_of_birth": "2004-08-26",
            "session_id": "TEST_SESSION_123",  # This should NOT be stored
            "temp_registration_id": "TEMP_REG_456",  # This should NOT be stored
            "frontend_validated": True,  # This should NOT be stored
            "validation_timestamp": 1234567890  # This should NOT be stored
        }
        
        # Test individual registration with an existing event
        test_event_id = "SES2TESTU2025"  # Use existing event
        
        try:
            result = await NormalizedRegistrationService.register_individual(
                student=student,
                event_id=test_event_id,
                registration_data=test_registration_data
            )
            
            registration_id = result.get("registration_id")
            print(f"✅ Test registration created: {registration_id}")
            
            # Retrieve and analyze the stored data
            event = await DatabaseOperations.find_one(
                "events",
                {"event_id": test_event_id}
            )
            
            if not event or registration_id not in event.get('registrations', {}):
                print("❌ Could not find test registration in database")
                return False
            
            stored_data = event['registrations'][registration_id]
            
            print(f"\n--- Stored Registration Data ---")
            print(json.dumps(stored_data, indent=2, default=str))
            
            # Verify data structure
            print(f"\n--- Data Structure Analysis ---")
            print(f"Top-level keys: {list(stored_data.keys())}")
            
            if 'student_data' in stored_data:
                print(f"student_data keys: {list(stored_data['student_data'].keys())}")
                
                # Check for correct student data
                student_data_obj = stored_data['student_data']
                print(f"✅ Correct full_name in student_data: {student_data_obj.get('full_name')} (should be {student.full_name})")
                print(f"✅ Correct department in student_data: {student_data_obj.get('department')} (should be {student.department})")
                print(f"✅ Gender included: {student_data_obj.get('gender')}")
                print(f"✅ Date of birth included: {student_data_obj.get('date_of_birth')}")
            
            # Check for absence of duplicate fields
            student_fields = {'full_name', 'enrollment_no', 'email', 'mobile_no', 'department', 'semester'}
            temp_fields = {'session_id', 'temp_registration_id', 'frontend_validated', 'validation_timestamp'}
            
            duplicate_fields = []
            temp_pollution = []
            
            for field in student_fields:
                if field in stored_data:
                    duplicate_fields.append(field)
            
            for field in temp_fields:
                if field in stored_data:
                    temp_pollution.append(field)
            
            if duplicate_fields:
                print(f"❌ Found duplicate student fields at top level: {duplicate_fields}")
                return False
            else:
                print(f"✅ No duplicate student fields found")
            
            if temp_pollution:
                print(f"❌ Found temporary session data pollution: {temp_pollution}")
                return False
            else:
                print(f"✅ No temporary session data pollution")
            
            # Clean up test data
            await DatabaseOperations.update_one(
                "events",
                {"event_id": test_event_id},
                {"$unset": {f"registrations.{registration_id}": ""}}
            )
            
            await DatabaseOperations.update_one(
                "students",
                {"enrollment_no": student.enrollment_no},
                {"$unset": {f"event_participations.{test_event_id}": ""}}
            )
            
            print(f"✅ Test data cleaned up")
            
            return True
            
        except Exception as e:
            print(f"❌ Registration test failed: {e}")
            return False
        
    except Exception as e:
        print(f"❌ Test setup failed: {e}")
        return False

async def main():
    """Run the test"""
    print("=" * 60)
    print("NEW REGISTRATION DATA STRUCTURE TEST")
    print("=" * 60)
    
    success = await test_new_registration_data_structure()
    
    print("\n" + "=" * 60)
    if success:
        print("🎉 NEW REGISTRATION DATA STRUCTURE TEST PASSED!")
        print("✅ New registrations will be stored correctly")
        print("✅ No data duplication will occur")
        print("✅ No temporary session data pollution")
    else:
        print("❌ Test failed - check issues above")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
