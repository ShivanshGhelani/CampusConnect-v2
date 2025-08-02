#!/usr/bin/env python3
"""
Debug script to test team details functionality
"""
import asyncio
import sys
sys.path.append('.')

from database.operations import DatabaseOperations

async def debug_team_details():
    """Debug the team details functionality"""
    try:
        # Connect to database
        from config.database import Database
        await Database.connect_db()
        
        event_id = "STARTUP_PITCH_COMP_2025"
        team_id = "TEAMCD504D"
        
        print(f"Debugging team details for Event: {event_id}, Team: {team_id}")
        
        # Get the event
        event = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event:
            print("❌ Event not found")
            return
        
        print("✅ Event found")
        print(f"Event name: {event.get('event_name', 'N/A')}")
        
        # Check team registrations
        team_registrations = event.get("team_registrations", {})
        print(f"Total teams: {len(team_registrations)}")
        
        # Find the team by team_id
        team_info = None
        team_name = None
        
        for t_name, t_data in team_registrations.items():
            print(f"Checking team: {t_name}")
            if isinstance(t_data, dict):
                for member_enrollment, member_data in t_data.items():
                    if member_enrollment not in ["payment_id", "payment_status"]:
                        if isinstance(member_data, dict):
                            if member_data.get("team_registration_id") == team_id:
                                team_info = t_data
                                team_name = t_name
                                print(f"✅ Found team: {team_name}")
                                print(f"Team registration ID: {team_id}")
                                break
                if team_info:
                    break
        
        if not team_info:
            print("❌ Team not found with the given team_id")
            print("Available teams:")
            for t_name, t_data in team_registrations.items():
                if isinstance(t_data, dict):
                    for member_enrollment, member_data in t_data.items():
                        if member_enrollment not in ["payment_id", "payment_status"] and isinstance(member_data, dict):
                            print(f"  - Team: {t_name}, Team ID: {member_data.get('team_registration_id', 'N/A')}")
                            break
            
            # Let's also check what registration data exists for this event
            print(f"\nChecking individual registrations for event {event_id}:")
            registrations = event.get("registrations", {})
            print(f"Individual registrations count: {len(registrations)}")
            
            for reg_id, reg_data in registrations.items():
                if isinstance(reg_data, dict):
                    enrollment = reg_data.get("enrollment_no", "N/A")
                    print(f"  - Registration ID: {reg_id}, Student: {enrollment}")
            
            # Check if any student has this event in their participations with team info
            print(f"\nSearching for students with event participation in {event_id}:")
            students = await DatabaseOperations.find_many("students", {"event_participations": {"$exists": True}})
            for student in students:
                participation = student.get("event_participations", {}).get(event_id)
                if participation:
                    enrollment = student.get("enrollment_no", "N/A")
                    reg_type = participation.get("registration_type", "N/A")
                    team_reg_id = participation.get("team_registration_id", "N/A")
                    team_name = participation.get("student_data", {}).get("team_name", "N/A")
                    print(f"  - Student: {enrollment}, Type: {reg_type}, Team ID: {team_reg_id}, Team Name: {team_name}")
            
            return
        
        print(f"✅ Team found: {team_name}")
        print(f"Team members count: {len([k for k in team_info.keys() if k not in ['payment_id', 'payment_status']])}")
        
        # Check team members
        for member_enrollment, member_data in team_info.items():
            if member_enrollment in ["payment_id", "payment_status"]:
                continue
                
            if isinstance(member_data, dict):
                print(f"Member: {member_enrollment}")
                
                # Get student details
                student_doc = await DatabaseOperations.find_one("students", {"enrollment_no": member_enrollment})
                
                if student_doc:
                    print(f"  ✅ Student found: {student_doc.get('full_name', 'N/A')}")
                    
                    # Get participation data
                    participation_data = student_doc.get("event_participations", {}).get(event_id, {})
                    print(f"  Registration type: {participation_data.get('registration_type', 'N/A')}")
                    print(f"  Has attendance: {bool(participation_data.get('attendance_id'))}")
                else:
                    print(f"  ❌ Student not found in database")
        
        print("✅ Debug completed successfully")
        
    except Exception as e:
        print(f"❌ Error during debug: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_team_details())
