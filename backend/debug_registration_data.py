#!/usr/bin/env python3
"""
Debug script to check what's actually in the full registration data
"""

import asyncio
import sys
import os
import json

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database.operations import DatabaseOperations
from api.v1.client.registration.normalized_registration import NormalizedRegistrationService

async def debug_registration_data():
    """Debug what's in the full registration data"""
    print("🔍 Debugging Full Registration Data...")
    
    try:
        # Get test student data
        test_student = await DatabaseOperations.find_one(
            "students",
            {"enrollment_no": "22BEIT30043"}
        )
        
        if not test_student:
            print("❌ Test student not found")
            return
            
        print(f"✅ Found test student: {test_student['full_name']}")
        
        # Get student's registrations
        student_registrations = await NormalizedRegistrationService.get_student_registrations(
            test_student['enrollment_no']
        )
        
        if not student_registrations:
            print("❌ No registrations found for student")
            return
            
        print(f"✅ Found {len(student_registrations)} registrations")
        
        # Debug first registration
        event_id, reference_data = next(iter(student_registrations.items()))
        registration_id = reference_data.get('registration_id')
        
        print(f"\n--- Debugging Registration: {registration_id} ---")
        
        # Get full registration data
        full_data = await NormalizedRegistrationService.get_full_registration_data(
            registration_id, event_id
        )
        
        print(f"Full registration data structure:")
        print(json.dumps(full_data, indent=2, default=str))
        
    except Exception as e:
        print(f"❌ Debug failed: {e}")

if __name__ == "__main__":
    asyncio.run(debug_registration_data())
