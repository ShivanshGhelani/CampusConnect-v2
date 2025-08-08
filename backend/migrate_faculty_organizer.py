"""
Migration script to add organizer fields to existing faculty records
Run this script to update the database schema for faculty members
"""
import asyncio
import logging
from datetime import datetime
from config.database import Database
from database.operations import DatabaseOperations

logger = logging.getLogger(__name__)

async def migrate_faculty_organizer_fields():
    """Add organizer-related fields to existing faculty records"""
    try:
        print("Starting faculty organizer fields migration...")
        
        # Connect to database
        await Database.connect_db()
        
        # Get all faculty records
        faculties = await DatabaseOperations.find_many("faculties", {})
        
        updated_count = 0
        
        for faculty in faculties:
            employee_id = faculty.get("employee_id")
            
            # Check if organizer fields already exist
            if "is_organizer" not in faculty:
                update_data = {
                    "is_organizer": False,  # Default to False
                    "assigned_events": [],
                    "organizer_permissions": [],
                    "updated_at": datetime.utcnow()
                }
                
                # Update the faculty record
                result = await DatabaseOperations.update_one(
                    "faculties",
                    {"employee_id": employee_id},
                    {"$set": update_data}
                )
                
                if result:
                    updated_count += 1
                    print(f"Updated faculty: {employee_id}")
                else:
                    print(f"Failed to update faculty: {employee_id}")
        
        print(f"Migration completed. Updated {updated_count} faculty records.")
        
        return True
        
    except Exception as e:
        logger.error(f"Error in faculty migration: {str(e)}")
        print(f"Migration failed: {str(e)}")
        return False

async def grant_sample_organizer_access():
    """Grant organizer access to a sample faculty member (for testing)"""
    try:
        print("Granting sample organizer access...")
        
        # Get the first faculty member (you can modify this to target specific faculty)
        faculties = await DatabaseOperations.find_many("faculties", {}, limit=1)
        
        if not faculties:
            print("No faculty members found in database")
            return False
        
        sample_faculty = faculties[0]
        employee_id = sample_faculty.get("employee_id")
        
        # Grant organizer access
        update_data = {
            "is_organizer": True,
            "assigned_events": [],  # Can be updated later by super admin
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
            ],
            "updated_at": datetime.utcnow()
        }
        
        result = await DatabaseOperations.update_one(
            "faculties",
            {"employee_id": employee_id},
            {"$set": update_data}
        )
        
        if result:
            print(f"Granted organizer access to faculty: {employee_id}")
            print("This faculty member can now access the organizer portal")
            return True
        else:
            print(f"Failed to grant organizer access to: {employee_id}")
            return False
            
    except Exception as e:
        logger.error(f"Error granting sample organizer access: {str(e)}")
        print(f"Failed to grant sample access: {str(e)}")
        return False

async def create_organizer_requests_collection():
    """Create the organizer_requests collection with indexes"""
    try:
        print("Creating organizer_requests collection...")
        
        # Insert a sample document to create the collection
        sample_request = {
            "type": "organizer_access_request",
            "faculty_employee_id": "SAMPLE_ID",
            "faculty_name": "Sample Request",
            "faculty_email": "sample@example.com",
            "faculty_department": "Sample Department",
            "requested_at": datetime.utcnow(),
            "status": "sample",
            "message": "Sample organizer access request for collection creation"
        }
        
        await DatabaseOperations.insert_one("organizer_requests", sample_request)
        
        # Delete the sample document
        await DatabaseOperations.delete_one("organizer_requests", {"status": "sample"})
        
        print("Organizer requests collection created successfully")
        return True
        
    except Exception as e:
        logger.error(f"Error creating organizer_requests collection: {str(e)}")
        print(f"Failed to create collection: {str(e)}")
        return False

async def main():
    """Main migration function"""
    print("=" * 60)
    print("Faculty Organizer Migration Script")
    print("=" * 60)
    
    try:
        # Step 1: Migrate faculty fields
        success1 = await migrate_faculty_organizer_fields()
        
        # Step 2: Create organizer requests collection
        success2 = await create_organizer_requests_collection()
        
        # Step 3: Grant sample organizer access (optional)
        print("\nDo you want to grant organizer access to a sample faculty member? (y/n): ", end="")
        import sys
        response = input()
        
        success3 = True
        if response.lower() in ['y', 'yes']:
            success3 = await grant_sample_organizer_access()
        
        if success1 and success2 and success3:
            print("\n" + "=" * 60)
            print("Migration completed successfully!")
            print("Faculty members can now:")
            print("1. Request organizer access from their dashboard")
            print("2. Access organizer portal if granted access")
            print("3. Manage events with organizer permissions")
            print("=" * 60)
        else:
            print("\nMigration completed with some errors. Check the logs.")
            
    except Exception as e:
        logger.error(f"Error in main migration: {str(e)}")
        print(f"Migration failed: {str(e)}")
    
    finally:
        # Close database connection
        await Database.disconnect_db()

if __name__ == "__main__":
    # Run the migration
    asyncio.run(main())
