#!/usr/bin/env python3
"""
Quick script to enable organizer access for a faculty member for testing
"""
import asyncio
import sys
from database.operations import DatabaseOperations
from config.database import Database

async def enable_faculty_organizer(employee_id: str):
    """Enable organizer access for a faculty member"""
    try:
        # Connect to database
        await Database.connect_db()
        
        # Check if faculty exists
        faculty = await DatabaseOperations.find_one(
            "faculties",
            {"employee_id": employee_id}
        )
        
        if not faculty:
            print(f"❌ Faculty with employee ID '{employee_id}' not found.")
            return False
        
        print(f"✅ Found faculty: {faculty.get('full_name')} ({employee_id})")
        
        # Update faculty to enable organizer access
        update_data = {
            "is_organizer": True,
            "assigned_events": [],  # Can be updated later by admin
            "organizer_permissions": [
                "admin.events.read",
                "admin.events.create", 
                "admin.events.update",
                "admin.students.read",
                "admin.certificates.create",
                "admin.certificates.read",
                "admin.venues.read",
                "admin.venues.create",
                "admin.assets.read",
                "admin.assets.create",
                "admin.feedback.read",
                "admin.feedback.create"
            ]
        }
        
        result = await DatabaseOperations.update_one(
            "faculties",
            {"employee_id": employee_id},
            {"$set": update_data}
        )
        
        if result:
            print(f"✅ Successfully enabled organizer access for {faculty.get('full_name')}")
            print(f"📋 Permissions granted: {len(update_data['organizer_permissions'])} permissions")
            return True
        else:
            print(f"❌ Failed to update faculty record")
            return False
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

async def list_faculty():
    """List all faculty members"""
    try:
        await Database.connect_db()
        
        faculties = await DatabaseOperations.find_many(
            "faculties",
            {"is_active": True}
        )
        
        print(f"\n📋 Active Faculty Members ({len(faculties)} found):")
        print("-" * 80)
        
        for faculty in faculties:
            organizer_status = "🟢 ORGANIZER" if faculty.get('is_organizer') else "⚪ REGULAR"
            print(f"ID: {faculty.get('employee_id')} | {faculty.get('full_name')} | {organizer_status}")
            
        return faculties
        
    except Exception as e:
        print(f"❌ Error listing faculty: {str(e)}")
        return []

async def main():
    if len(sys.argv) == 1:
        print("Faculty Organizer Management")
        print("=" * 50)
        print("Usage:")
        print("  python enable_faculty_organizer.py list                    - List all faculty")
        print("  python enable_faculty_organizer.py enable <employee_id>   - Enable organizer access")
        print("\nExamples:")
        print("  python enable_faculty_organizer.py list")
        print("  python enable_faculty_organizer.py enable FAC001")
        return
    
    command = sys.argv[1].lower()
    
    if command == "list":
        await list_faculty()
    elif command == "enable" and len(sys.argv) == 3:
        employee_id = sys.argv[2]
        await enable_faculty_organizer(employee_id)
    else:
        print("❌ Invalid command. Use 'list' or 'enable <employee_id>'")

if __name__ == "__main__":
    asyncio.run(main())
