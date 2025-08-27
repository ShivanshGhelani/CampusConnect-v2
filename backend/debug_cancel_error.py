#!/usr/bin/env python3

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.event_registration_service import EventRegistrationService
from database.operations import DatabaseOperations

async def debug_cancel_registration():
    """Debug the cancel registration error step by step"""
    
    print("🔍 Debugging cancel registration error...")
    
    # First, create a test registration
    service = EventRegistrationService()
    
    # Get an existing student and event
    students = await DatabaseOperations.find_many('students', {}, limit=1)
    events = await DatabaseOperations.find_many('events', {}, limit=1)
    
    if not students or not events:
        print("❌ No students or events found for testing")
        return
    
    enrollment_no = students[0]['enrollment_no']
    event_id = events[0]['event_id']
    
    print(f"📝 Testing with student: {enrollment_no}, event: {event_id}")
    
    # Create a registration first
    try:
        print("1️⃣ Creating test registration...")
        reg_result = await service.register_individual(
            enrollment_no=enrollment_no,
            event_id=event_id
        )
        print(f"   Registration result: {reg_result}")
        
        if not reg_result.success:
            print(f"❌ Registration failed: {reg_result.message}")
            return
        
        print("✅ Registration created successfully")
        
        # Now try to cancel it and see exactly where the error occurs
        print("2️⃣ Attempting cancellation...")
        
        # Let's manually step through the cancel process
        print("   Finding registration...")
        registration = await DatabaseOperations.find_one(
            service.collection,
            {
                "student.enrollment_no": enrollment_no,
                "event.event_id": event_id
            }
        )
        
        if not registration:
            print("❌ Registration not found")
            return
        
        print(f"   ✅ Found registration: {registration.get('registration_id')}")
        
        # Test the delete operation specifically
        print("   Testing delete operation...")
        try:
            delete_result = await DatabaseOperations.delete_one(
                service.collection,
                {
                    "student.enrollment_no": enrollment_no,
                    "event.event_id": event_id
                }
            )
            print(f"   Delete result: {delete_result}")
            print(f"   Delete result type: {type(delete_result)}")
            
            # Check if delete_result has deleted_count attribute
            if hasattr(delete_result, 'deleted_count'):
                print(f"   Delete result has deleted_count: {delete_result.deleted_count}")
            else:
                print(f"   Delete result does NOT have deleted_count attribute")
                
        except Exception as e:
            print(f"❌ Error in delete operation: {e}")
            print(f"   Exception type: {type(e)}")
            import traceback
            traceback.print_exc()
            
        # Now try the full cancel method
        print("3️⃣ Testing full cancel method...")
        try:
            cancel_result = await service.cancel_registration(enrollment_no, event_id)
            print(f"   Cancel result: {cancel_result}")
        except Exception as e:
            print(f"❌ Error in cancel method: {e}")
            print(f"   Exception type: {type(e)}")
            import traceback
            traceback.print_exc()
            
        # Let's also test with a fresh registration
        print("4️⃣ Creating fresh registration for clean test...")
        try:
            fresh_reg = await service.register_individual(
                enrollment_no=enrollment_no,
                event_id=event_id
            )
            print(f"   Fresh registration: {fresh_reg.success}")
            
            if fresh_reg.success:
                print("   Now attempting cancel on fresh registration...")
                fresh_cancel = await service.cancel_registration(enrollment_no, event_id)
                print(f"   Fresh cancel result: {fresh_cancel}")
        except Exception as e:
            print(f"❌ Error in fresh test: {e}")
            import traceback
            traceback.print_exc()
            
    except Exception as e:
        print(f"❌ Error during debug: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_cancel_registration())
