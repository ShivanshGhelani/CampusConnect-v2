#!/usr/bin/env python3

import asyncio
import sys
import os
sys.path.append(os.path.dirname(__file__))

from services.event_registration_service import EventRegistrationService
from database.operations import DatabaseOperations

async def test_cancel_registration():
    """Test the cancel registration functionality step by step"""
    
    service = EventRegistrationService()
    
    # First, let's see what registrations exist
    print("=== Finding existing registrations ===")
    registrations = await DatabaseOperations.find_many(
        "student_registrations", 
        {"student.enrollment_no": "2023CSB1049"},
        limit=5
    )
    
    for reg in registrations:
        print(f"Registration: {reg.get('registration_id')} -> Event: {reg.get('event', {}).get('event_id')}")
    
    if registrations:
        # Try to cancel the first one
        event_id = registrations[0].get('event', {}).get('event_id')
        print(f"\n=== Testing cancel registration for event: {event_id} ===")
        
        try:
            result = await service.cancel_registration("2023CSB1049", event_id)
            print(f"Cancel result: {result}")
            print(f"Result type: {type(result)}")
            
            if isinstance(result, dict) and result.get('success'):
                print("✅ Cancellation successful!")
            else:
                print(f"❌ Cancellation failed: {result.get('message', 'Unknown error')}")
                
        except Exception as e:
            print(f"❌ Exception during cancellation: {e}")
            print(f"Exception type: {type(e)}")
            import traceback
            traceback.print_exc()
    else:
        print("No registrations found for testing")

if __name__ == "__main__":
    asyncio.run(test_cancel_registration())
