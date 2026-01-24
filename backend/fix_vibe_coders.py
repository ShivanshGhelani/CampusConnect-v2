"""
Fix VIBE-CODERS team session names
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from config.settings import get_settings
import logging

settings = get_settings()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def fix_vibe_coders():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DB_NAME]
    
    # Find the registration
    reg = await db.student_registrations.find_one({
        "registration_id": "TEAMRXHS39MKS5"
    })
    
    if not reg:
        logger.error("Registration not found")
        client.close()
        return
    
    logger.info(f"Found registration: {reg.get('registration_id')}")
    
    # Get event_id from nested structure
    event_id = reg.get("event", {}).get("event_id")
    logger.info(f"Event ID: {event_id}")
    
    # Get event config to find correct session names
    event = await db.events.find_one({"event_id": event_id})
    
    if not event:
        logger.error(f"Event {event_id} not found")
        client.close()
        return
    
    # Get session names from event config
    att_strategy = event.get("attendance_strategy", {})
    if isinstance(att_strategy, str):
        logger.error("attendance_strategy is a string, cannot proceed")
        client.close()
        return
    
    sessions_config = att_strategy.get("sessions", [])
    session_names = {s.get("session_id"): s.get("session_name") for s in sessions_config if s.get("session_id")}
    
    logger.info(f"Session mapping: {session_names}")
    
    # Fix each team member's attendance
    team_members = reg.get("team_members", [])
    updated = False
    
    for idx, member in enumerate(team_members):
        member_name = member.get("student", {}).get("name", f"Member {idx + 1}")
        member_sessions = member.get("attendance", {}).get("sessions", [])
        
        for sess_idx, sess in enumerate(member_sessions):
            session_id = sess.get("session_id")
            current_name = sess.get("session_name")
            
            if session_id in session_names:
                correct_name = session_names[session_id]
                
                if current_name != correct_name:
                    logger.info(f"  Fixing {member_name} session {session_id}: '{current_name}' → '{correct_name}'")
                    team_members[idx]["attendance"]["sessions"][sess_idx]["session_name"] = correct_name
                    updated = True
    
    if updated:
        # Update the document
        result = await db.student_registrations.update_one(
            {"registration_id": "TEAMRXHS39MKS5"},
            {"$set": {"team_members": team_members}}
        )
        
        if result.modified_count > 0:
            logger.info(f"✅ Successfully updated {result.modified_count} document(s)")
        else:
            logger.warning("⚠️ No documents were modified")
    else:
        logger.info("ℹ️ No updates needed")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_vibe_coders())
