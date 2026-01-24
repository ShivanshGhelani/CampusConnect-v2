"""
Fix attendance percentages that exceed 100%
This script caps all attendance percentages at 100% maximum
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from config.settings import get_settings
import logging

settings = get_settings()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def fix_attendance_percentages():
    """Fix all attendance percentages exceeding 100%"""
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DB_NAME]
    
    collections_to_fix = [
        "student_registrations",
        "faculty_registrations"
    ]
    
    total_fixed = 0
    
    for collection_name in collections_to_fix:
        logger.info(f"\n{'='*60}")
        logger.info(f"Processing collection: {collection_name}")
        logger.info(f"{'='*60}")
        
        collection = db[collection_name]
        
        # Find all documents with attendance percentage > 100
        cursor = collection.find({
            "$or": [
                {"attendance.percentage": {"$gt": 100}},
                {"team_members.attendance.percentage": {"$gt": 100}}
            ]
        })
        
        docs_with_issues = await cursor.to_list(length=None)
        
        if not docs_with_issues:
            logger.info(f"✅ No issues found in {collection_name}")
            continue
        
        logger.info(f"🔍 Found {len(docs_with_issues)} documents with percentage > 100%")
        
        # Fix each document
        for doc in docs_with_issues:
            doc_id = doc["_id"]
            
            # Check if it has top-level attendance
            if doc.get("attendance", {}).get("percentage", 0) > 100:
                old_percentage = doc["attendance"]["percentage"]
                
                # Update to cap at 100%
                result = await collection.update_one(
                    {"_id": doc_id},
                    {"$set": {"attendance.percentage": 100.0}}
                )
                
                if result.modified_count > 0:
                    total_fixed += 1
                    logger.info(f"  ✅ Fixed {doc.get('registration_id', doc_id)}: {old_percentage}% → 100%")
        
        # Also fix team member attendance percentages if they exist
        cursor_teams = collection.find({
            "team_members.attendance.percentage": {"$gt": 100}
        })
        
        team_docs_with_issues = await cursor_teams.to_list(length=None)
        
        if team_docs_with_issues:
            logger.info(f"🔍 Found {len(team_docs_with_issues)} team documents with member percentage > 100%")
            
            for doc in team_docs_with_issues:
                doc_id = doc["_id"]
                team_members = doc.get("team_members", [])
                
                # Fix each team member's attendance
                for idx, member in enumerate(team_members):
                    member_attendance = member.get("attendance", {})
                    if member_attendance.get("percentage", 0) > 100:
                        old_percentage = member_attendance["percentage"]
                        
                        result = await collection.update_one(
                            {"_id": doc_id},
                            {"$set": {f"team_members.{idx}.attendance.percentage": 100.0}}
                        )
                        
                        if result.modified_count > 0:
                            total_fixed += 1
                            member_id = member.get("student", {}).get("enrollment_no") or member.get("faculty", {}).get("employee_id")
                            logger.info(f"  ✅ Fixed team member {member_id}: {old_percentage}% → 100%")
    
    logger.info(f"\n{'='*60}")
    logger.info(f"✅ SUMMARY: Fixed {total_fixed} attendance records")
    logger.info(f"{'='*60}\n")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_attendance_percentages())
