import asyncio
import sys
import json
sys.path.insert(0, 's:/Projects/ClgCerti/CampusConnect/backend')

from database.operations import DatabaseOperations

async def check_structures():
    # Get a sample event
    event = await DatabaseOperations.find_one(
        "events",
        {"event_id": "EW2TESTU2026"}
    )
    
    print("=== EVENT STRUCTURE ===")
    if event:
        if '_id' in event:
            del event['_id']
        print(json.dumps(event, indent=2, default=str))
    
    print("\n=== STUDENT REGISTRATION STRUCTURE ===")
    student_reg = await DatabaseOperations.find_one(
        "student_registrations",
        {"registration_id": "REGJVIY8XM01"}
    )
    if student_reg:
        if '_id' in student_reg:
            del student_reg['_id']
        print(json.dumps(student_reg, indent=2, default=str))
    
    print("\n=== CHECKING FOR TEAM REGISTRATIONS ===")
    team_regs = await DatabaseOperations.find(
        "student_registrations",
        {"registration.type": "team"}
    )
    team_count = len(team_regs) if isinstance(team_regs, list) else 0
    print(f"Found {team_count} team registrations")
    if team_count > 0:
        if '_id' in team_regs[0]:
            del team_regs[0]['_id']
        print(json.dumps(team_regs[0], indent=2, default=str))

if __name__ == "__main__":
    asyncio.run(check_structures())
