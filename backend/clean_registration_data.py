#!/usr/bin/env python3
"""
Script to clean up duplicate data in existing registrations
Removes top-level duplicated student fields and temporary session data
"""

import asyncio
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database.operations import DatabaseOperations

async def clean_duplicate_registration_data():
    """Clean up duplicate data in all registrations"""
    print("🧹 Cleaning Up Duplicate Registration Data...")
    
    try:
        # Find all events with registrations
        events = await DatabaseOperations.find_many("events", {"registrations": {"$exists": True}})
        
        total_cleaned = 0
        
        for event in events:
            event_id = event.get('event_id')
            registrations = event.get('registrations', {})
            
            if not registrations:
                continue
                
            print(f"\n--- Processing Event: {event_id} ---")
            
            for reg_id, reg_data in registrations.items():
                print(f"  Processing registration: {reg_id}")
                
                # Check if this registration has duplicate data
                if 'student_data' not in reg_data:
                    print(f"    ⚠️  No student_data found, skipping")
                    continue
                
                student_data = reg_data['student_data']
                
                # Define fields that should only be in student_data
                student_fields = {
                    'full_name', 'enrollment_no', 'email', 'mobile_no', 
                    'department', 'semester', 'gender', 'date_of_birth'
                }
                
                # Define temporary fields that should be removed completely
                temp_fields = {
                    'session_id', 'temp_registration_id', 'frontend_validated',
                    'validation_timestamp', 'temp_team_id'
                }
                
                # Fields to preserve at top level
                preserve_fields = {
                    'registration_id', 'registration_type', 'registration_datetime',
                    'student_data', 'team_registration_id', 'team_members', 'team_name'
                }
                
                # Build clean registration data
                clean_data = {}
                
                # Keep essential fields
                for field in preserve_fields:
                    if field in reg_data:
                        clean_data[field] = reg_data[field]
                
                # Ensure student_data has all necessary fields from top level if missing
                if 'student_data' in clean_data:
                    for field in student_fields:
                        if field in reg_data and field not in clean_data['student_data']:
                            # Use top-level value to fill missing student_data
                            clean_data['student_data'][field] = reg_data[field]
                            print(f"    ✅ Added missing {field} to student_data")
                
                # Check if we need to update
                fields_to_remove = []
                
                # Find duplicate student fields at top level
                for field in student_fields:
                    if field in reg_data:
                        fields_to_remove.append(field)
                
                # Find temporary fields
                for field in temp_fields:
                    if field in reg_data:
                        fields_to_remove.append(field)
                
                if fields_to_remove:
                    print(f"    🗑️  Removing fields: {fields_to_remove}")
                    
                    # Build unset operation
                    unset_operations = {}
                    for field in fields_to_remove:
                        unset_operations[f"registrations.{reg_id}.{field}"] = ""
                    
                    # Update the registration in database
                    await DatabaseOperations.update_one(
                        "events",
                        {"event_id": event_id},
                        {"$unset": unset_operations}
                    )
                    
                    total_cleaned += 1
                    print(f"    ✅ Cleaned registration {reg_id}")
                else:
                    print(f"    ✅ Registration {reg_id} already clean")
        
        print(f"\n🎉 Cleanup completed! {total_cleaned} registrations cleaned.")
        
        return total_cleaned
        
    except Exception as e:
        print(f"❌ Cleanup failed: {e}")
        return 0

async def main():
    """Run the cleanup"""
    print("=" * 60)
    print("REGISTRATION DATA CLEANUP")
    print("=" * 60)
    
    cleaned_count = await clean_duplicate_registration_data()
    
    print("\n" + "=" * 60)
    if cleaned_count > 0:
        print(f"🎉 CLEANUP SUCCESSFUL! {cleaned_count} registrations cleaned")
        print("✅ Data duplication has been eliminated")
        print("✅ Temporary session data has been removed")
    else:
        print("ℹ️  No registrations needed cleaning")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
