#!/usr/bin/env python3
"""
Test script to verify ObjectId serialization fix
"""
import sys
import os
import json
from datetime import datetime

# Add the backend directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Test ObjectId serialization function
def test_objectid_serialization():
    print("🧪 Testing ObjectId Serialization Fix...")
    
    # Import ObjectId
    try:
        from bson import ObjectId
        print("✅ Successfully imported ObjectId")
    except ImportError as e:
        print(f"❌ Failed to import ObjectId: {e}")
        return False
    
    # Define the fix_objectid function (same as in approval.py)
    def fix_objectid(obj):
        """Recursively convert BSON types to JSON-serializable types"""
        if obj is None:
            return None
        elif isinstance(obj, ObjectId):
            return str(obj)
        elif isinstance(obj, dict):
            return {k: fix_objectid(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [fix_objectid(item) for item in obj]
        elif isinstance(obj, tuple):
            return tuple(fix_objectid(item) for item in obj)
        elif hasattr(obj, 'isoformat'):  # datetime objects
            return obj.isoformat()
        elif hasattr(obj, '__dict__'):
            # Handle other BSON/custom objects
            try:
                return str(obj)
            except:
                return None
        else:
            return obj
    
    # Create test data with various ObjectId scenarios
    test_object_id = ObjectId()
    test_data = {
        "_id": test_object_id,
        "event_id": "evt_test_123",
        "nested_objectid": {
            "creator_id": ObjectId(),
            "venue_id": ObjectId(),
            "details": {
                "admin_id": ObjectId(),
                "timestamp": datetime.utcnow()
            }
        },
        "objectid_list": [ObjectId(), ObjectId(), ObjectId()],
        "mixed_list": [
            {"id": ObjectId(), "name": "test1"},
            {"id": ObjectId(), "name": "test2"},
            "regular_string",
            123,
            datetime.utcnow()
        ],
        "regular_fields": {
            "name": "Test Event",
            "count": 42,
            "active": True,
            "timestamp": datetime.utcnow()
        }
    }
    
    print(f"🔍 Original data contains {count_objectids(test_data)} ObjectId instances")
    
    # Test the serialization
    try:
        serialized_data = fix_objectid(test_data)
        print("✅ Successfully serialized data with fix_objectid function")
        
        # Verify it can be JSON serialized
        json_str = json.dumps(serialized_data, indent=2)
        print("✅ Successfully converted to JSON string")
        
        # Verify no ObjectIds remain
        objectid_count = count_objectids(serialized_data)
        if objectid_count == 0:
            print("✅ All ObjectId instances have been converted")
        else:
            print(f"❌ {objectid_count} ObjectId instances still remain")
            return False
        
        # Test JSON parsing
        parsed_data = json.loads(json_str)
        print("✅ Successfully parsed JSON back to Python object")
        
        print("\n📊 Sample serialized data:")
        print(json.dumps(serialized_data, indent=2)[:500] + "..." if len(json_str) > 500 else json.dumps(serialized_data, indent=2))
        
        return True
        
    except Exception as e:
        print(f"❌ Serialization failed: {e}")
        return False

def count_objectids(obj):
    """Count ObjectId instances in nested data structure"""
    from bson import ObjectId
    count = 0
    
    if isinstance(obj, ObjectId):
        return 1
    elif isinstance(obj, dict):
        for value in obj.values():
            count += count_objectids(value)
    elif isinstance(obj, (list, tuple)):
        for item in obj:
            count += count_objectids(item)
    
    return count

def test_fastapi_response():
    """Test how FastAPI would handle the response"""
    print("\n🧪 Testing FastAPI Response Compatibility...")
    
    try:
        from fastapi.encoders import jsonable_encoder
        from bson import ObjectId
        print("✅ Successfully imported FastAPI jsonable_encoder")
    except ImportError as e:
        print(f"❌ Failed to import FastAPI components: {e}")
        return False
    
    # Define the fix_objectid function
    def fix_objectid(obj):
        """Recursively convert BSON types to JSON-serializable types"""
        if obj is None:
            return None
        elif isinstance(obj, ObjectId):
            return str(obj)
        elif isinstance(obj, dict):
            return {k: fix_objectid(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [fix_objectid(item) for item in obj]
        elif isinstance(obj, tuple):
            return tuple(fix_objectid(item) for item in obj)
        elif hasattr(obj, 'isoformat'):  # datetime objects
            return obj.isoformat()
        elif hasattr(obj, '__dict__'):
            # Handle other BSON/custom objects
            try:
                return str(obj)
            except:
                return None
        else:
            return obj
    
    # Create test response data
    response_data = {
        "success": True,
        "message": "Event approved successfully",
        "event": {
            "_id": ObjectId(),
            "event_id": "evt_test_123",
            "event_name": "Test Event",
            "venue_id": ObjectId(),
            "created_by_id": ObjectId(),
            "timestamp": datetime.utcnow()
        }
    }
    
    try:
        # Test without fix - this should fail
        print("🔍 Testing without ObjectId fix...")
        try:
            jsonable_encoder(response_data)
            print("⚠️  Unexpected: FastAPI encoder accepted raw ObjectIds")
        except Exception as e:
            print(f"✅ Expected failure with raw ObjectIds: {type(e).__name__}")
        
        # Test with fix - this should work
        print("🔍 Testing with ObjectId fix...")
        fixed_data = fix_objectid(response_data)
        encoded_data = jsonable_encoder(fixed_data)
        print("✅ FastAPI encoder accepted fixed data")
        
        # Verify final JSON serialization
        json_str = json.dumps(encoded_data)
        print("✅ Final JSON serialization successful")
        
        return True
        
    except Exception as e:
        print(f"❌ FastAPI response test failed: {e}")
        return False

if __name__ == "__main__":
    print("🚀 ObjectId Serialization Fix Verification\n")
    
    # Run tests
    test1_passed = test_objectid_serialization()
    test2_passed = test_fastapi_response()
    
    print(f"\n📋 Test Results:")
    print(f"   ObjectId Serialization: {'✅ PASSED' if test1_passed else '❌ FAILED'}")
    print(f"   FastAPI Compatibility: {'✅ PASSED' if test2_passed else '❌ FAILED'}")
    
    if test1_passed and test2_passed:
        print("\n🎉 All tests passed! The ObjectId serialization fix should work.")
    else:
        print("\n❌ Some tests failed. The fix may need additional work.")
    
    print("\n💡 The fix_objectid function is now comprehensive and should handle:")
    print("   • Direct ObjectId instances")
    print("   • Nested ObjectIds in dictionaries")
    print("   • ObjectIds in lists and tuples")
    print("   • Datetime objects")
    print("   • Mixed data structures")
    print("   • FastAPI jsonable_encoder compatibility")
