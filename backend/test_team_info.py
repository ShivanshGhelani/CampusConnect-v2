#!/usr/bin/env python3
"""
Test Team Info API Endpoint
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from config.settings import MONGODB_URL, DB_NAME

async def test_team_info_logic():
    """Test the logic of the team-info endpoint"""
    
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DB_NAME]
    
    event_id = 'STARTUP_PITCH_COMP_2025'
    team_id = 'TEAM500DB9'
    
    print(f"=== TESTING TEAM INFO LOGIC FOR {team_id} ===")
    
    try:
        # Get the event to verify it exists
        event = await db['events'].find_one({"event_id": event_id})
        if not event:
            print("❌ Event not found")
            return
        
        print(f"✅ Event found: {event.get('event_name', 'Unnamed Event')}")
        
        # Get team information from event registrations
        registrations = event.get('registrations', {})
        team_registration = None
        team_leader_data = None
        
        print(f"📋 Total registrations: {len(registrations)}")
        
        # Find the team leader's registration to get team name
        for reg_id, reg_data in registrations.items():
            if (reg_data and 
                reg_data.get('registration_type') == 'team' and
                reg_data.get('team_registration_id') == team_id):
                team_registration = reg_data
                team_leader_data = reg_data.get('student_data', {})
                print(f"✅ Found team leader registration: {reg_id}")
                break
        
        if not team_registration:
            print("❌ Team registration not found")
            # Debug: List all team registrations
            print("\\nDEBUG: All team registrations:")
            for reg_id, reg_data in registrations.items():
                if reg_data and reg_data.get('registration_type') == 'team':
                    print(f"  - {reg_id}: team_id={reg_data.get('team_registration_id')}, leader={reg_data.get('student_data', {}).get('enrollment_no')}")
            return
        
        team_name = team_leader_data.get('team_name', 'Unknown Team')
        print(f"✅ Team name: {team_name}")
        
        # Get all team members from the leader's team_members array
        team_members_array = team_leader_data.get('team_members', [])
        print(f"✅ Team members in array: {len(team_members_array)}")
        
        # Build complete team member list including leader
        team_members = []
        
        # Add team leader first
        leader_info = {
            "enrollment_no": team_leader_data.get("enrollment_no", "Unknown"),
            "full_name": team_leader_data.get("full_name", "Unknown"),
            "registration_id": team_registration.get("registration_id", "N/A"),
            "registration_type": "team_leader",
            "team_registration_id": team_id
        }
        team_members.append(leader_info)
        print(f"✅ Added team leader: {leader_info['full_name']} ({leader_info['enrollment_no']})")
        
        # Add team members
        for member in team_members_array:
            if member and member.get('enrollment_no'):
                # Find the member's individual registration for registration_id
                member_reg_id = "N/A"
                for reg_id, reg_data in registrations.items():
                    if (reg_data and 
                        reg_data.get('student_data', {}).get('enrollment_no') == member.get('enrollment_no') and
                        reg_data.get('registration_type') == 'team_member'):
                        member_reg_id = reg_data.get('registration_id', reg_id)
                        break
                
                member_info = {
                    "enrollment_no": member.get("enrollment_no", "Unknown"),
                    "full_name": member.get("full_name", "Unknown"),
                    "registration_id": member_reg_id,
                    "registration_type": "team_member",
                    "team_registration_id": team_id
                }
                team_members.append(member_info)
                print(f"✅ Added team member: {member_info['full_name']} ({member_info['enrollment_no']})")
        
        print(f"\\n🎯 FINAL RESULT:")
        print(f"   Team Name: {team_name}")
        print(f"   Team ID: {team_id}")
        print(f"   Total Members: {len(team_members)}")
        print(f"   Event: {event.get('event_name', '')}")
        
        return {
            "success": True,
            "message": "Team details retrieved successfully",
            "data": {
                "team_name": team_name,
                "team_id": team_id,
                "event_id": event_id,
                "event_name": event.get("event_name", ""),
                "total_members": len(team_members),
                "members": team_members
            }
        }
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "message": f"Error retrieving team info: {str(e)}"}
    finally:
        client.close()

if __name__ == "__main__":
    result = asyncio.run(test_team_info_logic())
    print(f"\\n📝 API Response would be:")
    import json
    print(json.dumps(result, indent=2))
