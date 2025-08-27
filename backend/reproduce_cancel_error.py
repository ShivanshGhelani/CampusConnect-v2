#!/usr/bin/env python3

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.event_registration_service import event_registration_service
from database.operations import DatabaseOperations

async def reproduce_cancel_error():
    """Reproduce the exact cancel registration error from the logs"""
    
    print("🔍 Reproducing cancel registration error...")
    
    # Use the exact parameters from the server logs
    enrollment_no = "22BEIT30043"
    event_id = "CCDCOSTU2025" 
    
    print(f"📝 Testing cancellation: {enrollment_no} -> {event_id}")
    
    # First, ensure we have a registration to cancel
    existing_reg = await DatabaseOperations.find_one(
        "student_registrations",
        {
            "student.enrollment_no": enrollment_no,
            "event.event_id": event_id
        }
    )
    
    if not existing_reg:
        print("📝 Creating registration first...")
        reg_result = await event_registration_service.register_individual(
            enrollment_no=enrollment_no,
            event_id=event_id
        )
        print(f"Registration: {reg_result.success} - {reg_result.message}")
        
        if not reg_result.success:
            print("❌ Failed to create registration")
            return
    else:
        print(f"✅ Found existing registration: {existing_reg.get('registration_id')}")
    
    # Now try to cancel - this should reproduce the error
    print("🗑️ Attempting cancellation...")
    
    try:
        # Call the same method that the API endpoint calls
        result = await event_registration_service.cancel_registration(
            enrollment_no=enrollment_no,
            event_id=event_id
        )
        print(f"✅ Cancel result: {result}")
        
    except AttributeError as e:
        if "'bool' object has no attribute 'deleted_count'" in str(e):
            print(f"🎯 REPRODUCED THE ERROR: {e}")
            import traceback
            print("Full traceback:")
            traceback.print_exc()
        else:
            print(f"❌ Different AttributeError: {e}")
            traceback.print_exc()
            
    except Exception as e:
        print(f"❌ Other error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(reproduce_cancel_error())
