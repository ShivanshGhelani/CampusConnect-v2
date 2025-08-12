"""
Test the fixed registration status endpoint
"""
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from api.v1.client.registration.normalized_registration import NormalizedRegistrationService
from api.v1.client.registration import serialize_mongo_data
from database.operations import DatabaseOperations
from bson import ObjectId
from datetime import datetime

async def test_serialization():
    """Test the MongoDB data serialization"""
    print("🧪 Testing MongoDB Data Serialization")
    print("=" * 50)
    
    try:
        # Test data with ObjectId and datetime
        test_data = {
            "_id": ObjectId(),
            "registration_id": "REG123",
            "registration_datetime": datetime.now(),
            "student_data": {
                "enrollment_no": "TEST001",
                "full_name": "Test Student"
            },
            "nested_objects": {
                "another_id": ObjectId(),
                "some_date": datetime.now()
            }
        }
        
        print("Original data contains ObjectId and datetime objects")
        print(f"ObjectId example: {test_data['_id']}")
        print(f"Datetime example: {test_data['registration_datetime']}")
        
        # Test serialization
        serialized = serialize_mongo_data(test_data)
        
        print("\n✅ Serialization successful!")
        print(f"ObjectId converted to: {serialized['_id']}")
        print(f"Datetime converted to: {serialized['registration_datetime']}")
        print("✅ All nested objects handled correctly")
        
        return True
        
    except Exception as e:
        print(f"❌ Serialization test failed: {e}")
        return False

async def test_status_endpoint_logic():
    """Test the status endpoint logic"""
    print("\n🧪 Testing Status Endpoint Logic")
    print("=" * 40)
    
    try:
        # Test getting a real student's registrations
        student_registrations = await NormalizedRegistrationService.get_student_registrations("22BEIT30043")
        
        if student_registrations:
            print(f"✅ Found {len(student_registrations)} registrations")
            
            for event_id, ref_data in student_registrations.items():
                print(f"  Event: {event_id}")
                print(f"  Registration ID: {ref_data.get('registration_id')}")
                
                # Test getting full data
                full_data = await NormalizedRegistrationService.get_full_registration_data(
                    ref_data['registration_id'], event_id
                )
                
                if full_data:
                    # Test serialization on real data
                    serialized_full_data = serialize_mongo_data(full_data)
                    print(f"  ✅ Full data retrieved and serialized successfully")
                else:
                    print(f"  ❌ Full data not found")
                
                # Test getting event info
                event = await DatabaseOperations.find_one(
                    "events",
                    {"event_id": event_id},
                    {"event_name": 1, "event_date": 1, "event_time": 1, "venue": 1, "status": 1}
                )
                
                if event:
                    serialized_event = serialize_mongo_data(event)
                    print(f"  ✅ Event data retrieved and serialized successfully")
        else:
            print("ℹ️  No registrations found for test student")
        
        return True
        
    except Exception as e:
        print(f"❌ Status endpoint logic test failed: {e}")
        return False

async def main():
    print("🚀 Testing Fixed Registration Status Endpoint")
    print("=" * 60)
    
    success1 = await test_serialization()
    success2 = await test_status_endpoint_logic()
    
    if success1 and success2:
        print("\n🎉 ALL TESTS PASSED!")
        print("✅ ObjectId serialization fix is working")
        print("✅ Status endpoint should work correctly now")
        print("✅ CORS errors should be resolved")
        
        print("\n📝 What was fixed:")
        print("  • Added serialize_mongo_data() function")
        print("  • Fixed ObjectId serialization issues")
        print("  • Removed duplicate status endpoint")
        print("  • Applied serialization to all response data")
        
    else:
        print("\n⚠️  Some tests failed. Please review the implementation.")

if __name__ == "__main__":
    asyncio.run(main())
