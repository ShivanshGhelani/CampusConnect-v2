#!/usr/bin/env python3
"""
Direct Test of Team Info Endpoint Logic
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from config.settings import MONGODB_URL, DB_NAME

async def test_team_info_direct():
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DB_NAME]
    
    try:
        # Simulate the exact logic from the team-info endpoint
        event_id = 'STARTUP_PITCH_COMP_2025'
        team_id = 'TEAM500DB9'
        
        print('Testing team-info endpoint logic...')
        
        # Get the event to verify it exists
        event = await db['events'].find_one({'event_id': event_id})
        if not event:
            print('Event not found')
            return
        
        event_name = event.get('event_name', 'Unknown Event')
        print(f'Event found: {event_name}')
        
        # Get team information from event registrations
        registrations = event.get('registrations', {})
        team_registration = None
        team_leader_data = None
        
        print(f'Total registrations: {len(registrations)}')
        
        # Find the team leader's registration to get team name
        for reg_id, reg_data in registrations.items():
            if (reg_data and 
                reg_data.get('registration_type') == 'team' and
                reg_data.get('team_registration_id') == team_id):
                team_registration = reg_data
                team_leader_data = reg_data.get('student_data', {})
                leader_name = team_leader_data.get('full_name', 'Unknown')
                print(f'Found team leader: {leader_name}')
                break
        
        if not team_registration:
            print('Team registration not found')
            return
        
        team_name = team_leader_data.get('team_name', 'Unknown Team')
        print(f'Team name: {team_name}')
        
        # Get all team members from the leader's team_members array
        team_members_array = team_leader_data.get('team_members', [])
        print(f'Team members in array: {len(team_members_array)}')
        
        # Test building the response
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
        print(f'Added team leader: {leader_info["full_name"]}')
        
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
                print(f'Added team member: {member_info["full_name"]}')
        
        response = {
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
        
        print('SUCCESS: team-info logic works')
        print(f'Response: {response}')
        
    except Exception as e:
        print(f'ERROR: {e}')
        import traceback
        traceback.print_exc()
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(test_team_info_direct())
