#!/usr/bin/env python3
"""
Debug script to check the latest registration data structure in the database
"""

import asyncio
import sys
import os
import json

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database.operations import DatabaseOperations

async def debug_latest_registration():
    """Debug the latest registration data in the database"""
    print("🔍 Debugging Latest Registration Data...")
    
    try:
        # Find the latest registration based on your ID
        events = await DatabaseOperations.find_many("events", {})
        
        found_registration = None
        for event in events:
            registrations = event.get('registrations', {})
            if 'REGDCF6ED' in registrations:
                found_registration = registrations['REGDCF6ED']
                print(f"Found registration REGDCF6ED in event: {event.get('event_id')}")
                break
        
        if not found_registration:
            print("❌ Registration REGDCF6ED not found")
            return
            
        print(f"\n--- Full Registration Data Structure ---")
        print(json.dumps(found_registration, indent=2, default=str))
        
        print(f"\n--- Data Analysis ---")
        print(f"Top-level keys: {list(found_registration.keys())}")
        
        if 'student_data' in found_registration:
            print(f"student_data keys: {list(found_registration['student_data'].keys())}")
        
        # Check for duplication
        duplicate_keys = []
        if 'student_data' in found_registration:
            student_keys = set(found_registration['student_data'].keys())
            top_keys = set(found_registration.keys()) - {'student_data'}
            duplicate_keys = list(student_keys.intersection(top_keys))
        
        if duplicate_keys:
            print(f"⚠️  Duplicate keys found: {duplicate_keys}")
            for key in duplicate_keys:
                print(f"   - {key}: top={found_registration.get(key)} vs student_data={found_registration.get('student_data', {}).get(key)}")
        else:
            print("✅ No duplicate keys found")
        
    except Exception as e:
        print(f"❌ Debug failed: {e}")

if __name__ == "__main__":
    asyncio.run(debug_latest_registration())
