"""
Cleanup Script: Remove Duplicate Attendance Fields
===================================================
This script removes the old duplicate attendance_config and attendance_criteria fields
from all events, keeping only the consolidated attendance_strategy field.

Run this ONCE to clean up your database.
"""

import asyncio
from database.operations import DatabaseOperations
from core.logger import get_logger

logger = get_logger(__name__)

async def cleanup_attendance_duplicates():
    """Remove duplicate attendance fields from all events"""
    try:
        logger.info("🧹 Starting attendance field cleanup...")
        
        # Find all events with duplicate fields
        events = await DatabaseOperations.find_many(
            "events",
            {
                "$or": [
                    {"attendance_config": {"$exists": True}},
                    {"attendance_criteria": {"$exists": True}}
                ]
            }
        )
        
        logger.info(f"📊 Found {len(events)} events with duplicate attendance fields")
        
        cleaned_count = 0
        for event in events:
            event_id = event.get("event_id")
            
            # Check what fields exist
            has_config = "attendance_config" in event
            has_criteria = "attendance_criteria" in event
            has_strategy = "attendance_strategy" in event
            
            logger.info(f"\n🔍 Event {event_id}:")
            logger.info(f"   - attendance_strategy: {'✅' if has_strategy else '❌'}")
            logger.info(f"   - attendance_config: {'⚠️ DUPLICATE' if has_config else '✅ Clean'}")
            logger.info(f"   - attendance_criteria: {'⚠️ DUPLICATE' if has_criteria else '✅ Clean'}")
            
            if has_config or has_criteria:
                # Remove duplicate fields
                update_ops = {"$unset": {}}
                
                if has_config:
                    update_ops["$unset"]["attendance_config"] = ""
                if has_criteria:
                    update_ops["$unset"]["attendance_criteria"] = ""
                
                await DatabaseOperations.update_one(
                    "events",
                    {"event_id": event_id},
                    update_ops
                )
                
                cleaned_count += 1
                logger.info(f"   ✅ Cleaned up {event_id}")
        
        logger.info(f"\n🎉 Cleanup complete! Cleaned {cleaned_count} events")
        logger.info(f"✅ All events now use only attendance_strategy field")
        
        return {
            "success": True,
            "total_events": len(events),
            "cleaned_count": cleaned_count
        }
        
    except Exception as e:
        logger.error(f"❌ Cleanup failed: {e}")
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    print("=" * 60)
    print("Attendance Field Cleanup Script")
    print("=" * 60)
    print("\nThis will remove duplicate attendance_config and attendance_criteria")
    print("fields from ALL events in the database.")
    print("\n⚠️  WARNING: This operation cannot be undone!")
    print("\nMake sure you have a backup before proceeding.")
    print("=" * 60)
    
    confirm = input("\nType 'YES' to proceed with cleanup: ")
    
    if confirm == "YES":
        print("\n🚀 Starting cleanup...")
        result = asyncio.run(cleanup_attendance_duplicates())
        
        if result["success"]:
            print(f"\n✅ SUCCESS!")
            print(f"   - Total events processed: {result['total_events']}")
            print(f"   - Events cleaned: {result['cleaned_count']}")
        else:
            print(f"\n❌ FAILED: {result['error']}")
    else:
        print("\n❌ Cleanup cancelled")
