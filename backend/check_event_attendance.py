"""
Check attendance records for a specific event
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from config.settings import get_settings
import logging
import json

settings = get_settings()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def check_event_attendance(event_id):
    """Check attendance records for specific event"""
    
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DB_NAME]
    
    logger.info(f"\n{'='*60}")
    logger.info(f"Checking event: {event_id}")
    logger.info(f"{'='*60}\n")
    
    # Get event config
    event = await db.events.find_one({"event_id": event_id})
    
    if not event:
        logger.error(f"❌ Event {event_id} not found!")
        client.close()
        return
    
    logger.info(f"✅ Event found: {event.get('event_name')}")
    
    # Check attendance strategy
    att_strategy = event.get("attendance_strategy")
    if isinstance(att_strategy, str):
        logger.warning(f"⚠️ attendance_strategy is a string: {att_strategy}")
    elif isinstance(att_strategy, dict):
        sessions = att_strategy.get("sessions", [])
        logger.info(f"\n📋 Configured Sessions ({len(sessions)}):")
        for sess in sessions:
            logger.info(f"  - {sess.get('session_id')}: {sess.get('session_name')}")
    
    # Find registrations for this event
    student_regs = await db.student_registrations.find({
        "event_id": event_id
    }).to_list(length=None)
    
    logger.info(f"\n👥 Total Student Registrations: {len(student_regs)}")
    
    student_regs_with_att = [r for r in student_regs if r.get("attendance", {}).get("sessions")]
    logger.info(f"   With attendance sessions: {len(student_regs_with_att)}")
    
    for reg in student_regs_with_att:
        logger.info(f"\n  Registration: {reg.get('registration_id')}")
        att_sessions = reg.get("attendance", {}).get("sessions", [])
        logger.info(f"  Attendance sessions ({len(att_sessions)}):")
        for sess in att_sessions:
            logger.info(f"    - {sess.get('session_id')}: '{sess.get('session_name')}' (marked_by: {sess.get('marked_by', 'N/A')})")
        
        # Check team members
        team_members = reg.get("team_members", [])
        if team_members:
            logger.info(f"  Team members: {len(team_members)}")
            for idx, member in enumerate(team_members):
                member_id = member.get("student", {}).get("enrollment_no", f"member_{idx}")
                member_sessions = member.get("attendance", {}).get("sessions", [])
                if member_sessions:
                    logger.info(f"    Member {member_id}:")
                    for sess in member_sessions:
                        logger.info(f"      - {sess.get('session_id')}: '{sess.get('session_name')}'")
    
    # Also check faculty registrations
    faculty_regs = await db.faculty_registrations.find({
        "event_id": event_id
    }).to_list(length=None)
    
    logger.info(f"\n👨‍🏫 Total Faculty Registrations: {len(faculty_regs)}")
    
    faculty_regs_with_att = [r for r in faculty_regs if r.get("attendance", {}).get("sessions")]
    logger.info(f"   With attendance sessions: {len(faculty_regs_with_att)}")
    
    for reg in faculty_regs_with_att:
        logger.info(f"\n  Registration: {reg.get('registration_id')}")
        att_sessions = reg.get("attendance", {}).get("sessions", [])
        logger.info(f"  Attendance sessions ({len(att_sessions)}):")
        for sess in att_sessions:
            logger.info(f"    - {sess.get('session_id')}: '{sess.get('session_name')}' (marked_by: {sess.get('marked_by', 'N/A')})")
        
        # Check team members
        team_members = reg.get("team_members", [])
        if team_members:
            logger.info(f"  Team members: {len(team_members)}")
            for idx, member in enumerate(team_members):
                member_id = member.get("faculty", {}).get("employee_id") or member.get("student", {}).get("enrollment_no", f"member_{idx}")
                member_sessions = member.get("attendance", {}).get("sessions", [])
                if member_sessions:
                    logger.info(f"    Member {member_id}:")
                    for sess in member_sessions:
                        logger.info(f"      - {sess.get('session_id')}: '{sess.get('session_name')}'")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_event_attendance("FTICWOSTU2025"))
