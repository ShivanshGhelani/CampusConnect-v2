"""
Find the VIBE-CODERS team registration
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from config.settings import get_settings
import logging

settings = get_settings()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def find_team():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DB_NAME]
    
    # Search in student registrations
    student_reg = await db.student_registrations.find_one({
        "team.team_name": "VIBE-CODERS"
    })
    
    if student_reg:
        logger.info(f"✅ Found in student_registrations")
        logger.info(f"Registration ID: {student_reg.get('registration_id')}")
        logger.info(f"Event ID: {student_reg.get('event_id')}")
        logger.info(f"Team: {student_reg.get('team', {}).get('team_name')}")
        
        # Check team members
        team_members = student_reg.get("team_members", [])
        logger.info(f"\nTeam members: {len(team_members)}")
        for idx, member in enumerate(team_members):
            student = member.get("student", {})
            logger.info(f"\n  Member {idx + 1}:")
            logger.info(f"    Name: {student.get('full_name')}")
            logger.info(f"    Enrollment: {student.get('enrollment_no')}")
            logger.info(f"    Leader: {member.get('is_team_leader', False)}")
            
            # Check attendance
            attendance = member.get("attendance", {})
            sessions = attendance.get("sessions", [])
            if sessions:
                logger.info(f"    Attendance sessions:")
                for sess in sessions:
                    logger.info(f"      - {sess.get('session_id')}: '{sess.get('session_name')}'")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(find_team())
