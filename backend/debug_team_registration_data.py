#!/usr/bin/env python3
"""
Debug script to examine team registration data structure
"""

import asyncio
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def debug_team_registrations():
    """Debug team registrations to understand the data structure"""
    print("🔍 DEBUGGING TEAM REGISTRATION DATA STRUCTURE")
    print("=" * 60)
    
    try:
        from database.operations import DatabaseOperations
        # from core.logger import logger
        
        # Get a sample event with team registrations
        events_with_registrations = await DatabaseOperations.find_many(
            "events", 
            {"registrations": {"$exists": True, "$ne": {}}}, 
            limit=3
        )
        
        for event in events_with_registrations:
            event_id = event.get("event_id")
            event_name = event.get("event_name", "Unknown Event")
            registrations = event.get("registrations", {})
            
            print(f"\n📅 EVENT: {event_name} (ID: {event_id})")
            print(f"   Total registrations: {len(registrations)}")
            
            # Analyze registration types
            team_registrations = []
            team_member_registrations = []
            individual_registrations = []
            
            for reg_id, reg_data in registrations.items():
                reg_type = reg_data.get("registration_type", "unknown")
                team_reg_id = reg_data.get("team_registration_id")
                
                if reg_type in ["team", "team_leader"]:
                    team_registrations.append({
                        "reg_id": reg_id,
                        "type": reg_type,
                        "team_reg_id": team_reg_id,
                        "student_data": reg_data.get("student_data", {})
                    })
                elif reg_type == "team_member":
                    team_member_registrations.append({
                        "reg_id": reg_id,
                        "type": reg_type,
                        "team_reg_id": team_reg_id,
                        "student_data": reg_data.get("student_data", {})
                    })
                elif reg_type == "individual":
                    individual_registrations.append({
                        "reg_id": reg_id,
                        "type": reg_type
                    })
            
            print(f"   👥 Team Leaders: {len(team_registrations)}")
            for team_reg in team_registrations[:2]:  # Show first 2
                student_data = team_reg["student_data"]
                team_name = student_data.get("team_name", "No team name")
                enrollment = student_data.get("enrollment_no", "Unknown")
                print(f"      - {team_reg['reg_id']}: {enrollment} (Team: {team_name})")
                print(f"        Registration Type: {team_reg['type']}")
                print(f"        Team Reg ID: {team_reg['team_reg_id']}")
                
                # Check team members in this registration
                team_members = student_data.get("team_members", [])
                print(f"        Team members count: {len(team_members)}")
                if team_members:
                    for i, member in enumerate(team_members[:2]):  # Show first 2 members
                        member_enrollment = member.get("enrollment_no", "Unknown")
                        member_name = member.get("full_name", "Unknown")
                        print(f"          Member {i+1}: {member_enrollment} - {member_name}")
            
            print(f"   👤 Team Members: {len(team_member_registrations)}")
            for member_reg in team_member_registrations[:3]:  # Show first 3
                student_data = member_reg["student_data"]
                enrollment = student_data.get("enrollment_no", "Unknown")
                team_reg_id = member_reg["team_reg_id"]
                print(f"      - {member_reg['reg_id']}: {enrollment} (Team ID: {team_reg_id})")
            
            print(f"   🧑 Individual: {len(individual_registrations)}")
            
            # Test the team-info API logic for each team
            for team_reg in team_registrations[:1]:  # Test first team only
                team_id = team_reg["team_reg_id"]
                if team_id:
                    print(f"\n   🧪 TESTING API LOGIC FOR TEAM: {team_id}")
                    
                    # Simulate the API search logic
                    found_registration = None
                    for reg_id, reg_data in registrations.items():
                        if (reg_data and 
                            reg_data.get('registration_type') in ['team', 'team_leader'] and
                            reg_data.get('team_registration_id') == team_id):
                            found_registration = {
                                "reg_id": reg_id,
                                "data": reg_data
                            }
                            break
                    
                    if found_registration:
                        print(f"      ✅ Found team registration: {found_registration['reg_id']}")
                        student_data = found_registration['data'].get('student_data', {})
                        print(f"      Team name: {student_data.get('team_name', 'No name')}")
                        print(f"      Leader: {student_data.get('enrollment_no', 'Unknown')}")
                    else:
                        print(f"      ❌ Team registration NOT FOUND for team_id: {team_id}")
                        print(f"      Available team registrations:")
                        for reg_id, reg_data in registrations.items():
                            if reg_data.get('registration_type') in ['team', 'team_leader']:
                                print(f"         - {reg_id}: type={reg_data.get('registration_type')}, team_id={reg_data.get('team_registration_id')}")
            
            print("-" * 40)
        
        print(f"\n🎯 DIAGNOSIS COMPLETE")
        print("If 'Team registration NOT FOUND' appears above, that's the root cause!")
        
    except Exception as e:
        print(f"❌ Error during debugging: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_team_registrations())
