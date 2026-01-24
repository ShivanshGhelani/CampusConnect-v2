"""
Fix attendance records that have session_id but missing session_name
This script looks up the correct session_name from event config and updates the attendance records
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from config.settings import get_settings
import logging

settings = get_settings()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def fix_missing_session_names():
    """Fix all attendance records with missing session_name fields"""
    
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
        
        # Find all registrations with attendance sessions
        cursor = collection.find({
            "attendance.sessions": {"$exists": True, "$ne": []}
        })
        
        docs_with_sessions = await cursor.to_list(length=None)
        
        if not docs_with_sessions:
            logger.info(f"✅ No attendance sessions found in {collection_name}")
            continue
        
        logger.info(f"🔍 Found {len(docs_with_sessions)} documents with attendance sessions")
        
        # Process each document
        for doc in docs_with_sessions:
            doc_id = doc["_id"]
            # Try different possible field names for event ID
            event_id = doc.get("event_id") or doc.get("eventId") or doc.get("event", {}).get("event_id")
            
            if not event_id:
                logger.warning(f"  ⚠️ No event_id found for registration {doc.get('registration_id')}. Available keys: {list(doc.keys())}")
                continue
            
            attendance_sessions = doc.get("attendance", {}).get("sessions", [])
            
            # Get event config to look up session names
            event = await db.events.find_one({"event_id": event_id})
            
            # Debug logging
            logger.info(f"  🔍 Event type for {event_id}: {type(event)} - Value: {event if not isinstance(event, dict) else 'dict object'}")
            
            if not event or not isinstance(event, dict):
                # If event is None or not a dict, skip
                logger.warning(f"  ⚠️ Event '{event_id}' not found or invalid type for registration {doc.get('registration_id')}")
                continue
            
            event_sessions = event.get("attendance_strategy", {})
            
            # Handle case where attendance_strategy might be a string instead of dict
            if isinstance(event_sessions, str):
                logger.warning(f"  ⚠️ attendance_strategy is a string for event {event_id}, skipping")
                continue
            
            event_sessions = event_sessions.get("sessions", [])
            if not event_sessions:
                logger.warning(f"  ⚠️ No sessions configured in event {event_id}")
                continue
            
            # Create lookup map: session_id -> session_name
            session_lookup = {s.get("session_id"): s.get("session_name") for s in event_sessions if s.get("session_id")}
            
            # Check and fix each attendance session
            needs_update = False
            for idx, att_session in enumerate(attendance_sessions):
                session_id = att_session.get("session_id")
                current_session_name = att_session.get("session_name")
                
                if session_id and session_id in session_lookup:
                    correct_session_name = session_lookup[session_id]
                    
                    # If session_name is missing or different, fix it
                    if not current_session_name or current_session_name != correct_session_name:
                        attendance_sessions[idx]["session_name"] = correct_session_name
                        needs_update = True
                        logger.info(f"  📝 Fixing session {session_id}: '{current_session_name}' → '{correct_session_name}'")
            
            # Update the document if needed
            if needs_update:
                result = await collection.update_one(
                    {"_id": doc_id},
                    {"$set": {"attendance.sessions": attendance_sessions}}
                )
                
                if result.modified_count > 0:
                    total_fixed += 1
                    logger.info(f"  ✅ Updated registration {doc.get('registration_id')}")
            
            # Also fix team member attendance if they exist
            team_members = doc.get("team_members", [])
            if team_members:
                team_update_needed = False
                
                for member_idx, member in enumerate(team_members):
                    member_sessions = member.get("attendance", {}).get("sessions", [])
                    
                    if member_sessions:
                        for sess_idx, att_session in enumerate(member_sessions):
                            session_id = att_session.get("session_id")
                            current_session_name = att_session.get("session_name")
                            
                            if session_id and session_id in session_lookup:
                                correct_session_name = session_lookup[session_id]
                                
                                if not current_session_name or current_session_name != correct_session_name:
                                    team_members[member_idx]["attendance"]["sessions"][sess_idx]["session_name"] = correct_session_name
                                    team_update_needed = True
                                    member_id = member.get("student", {}).get("enrollment_no") or member.get("faculty", {}).get("employee_id")
                                    logger.info(f"  📝 Fixing team member {member_id} session {session_id}: '{current_session_name}' → '{correct_session_name}'")
                
                if team_update_needed:
                    result = await collection.update_one(
                        {"_id": doc_id},
                        {"$set": {"team_members": team_members}}
                    )
                    
                    if result.modified_count > 0:
                        total_fixed += 1
                        logger.info(f"  ✅ Updated team members for registration {doc.get('registration_id')}")
    
    logger.info(f"\n{'='*60}")
    logger.info(f"✅ SUMMARY: Fixed {total_fixed} attendance records")
    logger.info(f"{'='*60}\n")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_missing_session_names())
