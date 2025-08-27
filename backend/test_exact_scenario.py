#!/usr/bin/env python3

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.event_registration_service import EventRegistrationService
from database.operations import DatabaseOperations

async def test_exact_frontend_scenario():
    """Test the exact scenario that's happening from the frontend"""
    
    print("🔍 Testing exact frontend cancel registration scenario...")
    
    service = EventRegistrationService()
    
    # Use the exact same parameters as in the frontend error
    enrollment_no = "22BEIT30043"  # This is likely the logged-in user
    event_id = "CCDCOSTU2025"      # This was in the server logs
    
    print(f"📝 Testing with: {enrollment_no} -> {event_id}")
    
    # First, let's see if there's already a registration
    existing_reg = await DatabaseOperations.find_one(
        "student_registrations",
        {
            "student.enrollment_no": enrollment_no,
            "event.event_id": event_id
        }
    )
    
    if existing_reg:
        print(f"✅ Found existing registration: {existing_reg.get('registration_id')}")
    else:
        print("📝 No existing registration, creating one...")
        # Create a registration first
        reg_result = await service.register_individual(
            enrollment_no=enrollment_no,
            event_id=event_id
        )
        print(f"Registration result: {reg_result.success} - {reg_result.message}")
        
        if not reg_result.success:
            print("❌ Failed to create registration for testing")
            return
    
    # Now test the cancellation with extensive error catching
    print("🗑️ Testing cancellation...")
    try:
        cancel_result = await service.cancel_registration(enrollment_no, event_id)
        print(f"✅ Cancel result: {cancel_result}")
        
    except AttributeError as e:
        if "deleted_count" in str(e):
            print(f"🎯 FOUND THE ERROR: {e}")
            print("This is the exact error we're looking for!")
            import traceback
            traceback.print_exc()
        else:
            print(f"❌ Different AttributeError: {e}")
            
    except Exception as e:
        print(f"❌ Other error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_exact_frontend_scenario())
