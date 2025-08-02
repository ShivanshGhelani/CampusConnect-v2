#!/usr/bin/env python3
"""
Test the updated team details API endpoint
"""
import asyncio
import sys
sys.path.append('.')

from database.operations import DatabaseOperations

async def test_updated_api():
    """Test the updated team details API logic"""
    try:
        # Connect to database
        from config.database import Database
        await Database.connect_db()
        
        event_id = "STARTUP_PITCH_COMP_2025"
        team_id = "TEAMCD504D"
        
        print(f"Testing updated API logic for Event: {event_id}, Team: {team_id}")
        
        # Get the event to verify it exists
        event = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event:
            print("❌ Event not found")
            return
        
        print("✅ Event found")
        
        # Find all students who have this event in their participations with the matching team_id
        students = await DatabaseOperations.find_many("students", {
            f"event_participations.{event_id}.team_registration_id": team_id
        })
        
        if not students:
            print("❌ No team members found for this team")
            return
            
        print(f"✅ Found {len(students)} team members")
        
        # Get team member details
        team_members = []
        team_name = None
        
        for student_doc in students:
            # Get participation data for this student and event
            participation_data = student_doc.get("event_participations", {}).get(event_id, {})
            
            if participation_data.get("team_registration_id") == team_id:
                # Get team name from the first student (all should have the same team name)
                if not team_name:
                    team_name = participation_data.get("student_data", {}).get("team_name", "Unknown Team")
                
                member_info = {
                    "enrollment_no": student_doc.get("enrollment_no", "Unknown"),
                    "full_name": student_doc.get("full_name", "Unknown"),
                    "registration_id": participation_data.get("registration_id", "N/A"),
                    "registration_type": participation_data.get("registration_type", "team_member"),
                    "team_registration_id": team_id,
                    "attendance": {
                        "marked": bool(participation_data.get("attendance_id")),
                        "attendance_id": participation_data.get("attendance_id"),
                        "attendance_date": participation_data.get("attendance_marked_at")
                    },
                    "feedback": {
                        "submitted": bool(participation_data.get("feedback_id")),
                        "feedback_id": participation_data.get("feedback_id")
                    },
                    "certificate": {
                        "earned": bool(participation_data.get("certificate_id")),
                        "certificate_id": participation_data.get("certificate_id")
                    }
                }
                team_members.append(member_info)
        
        # Sort team members: team leader first, then team members
        team_members.sort(key=lambda x: (x["registration_type"] not in ["team_leader", "team"], x["full_name"]))
        
        result = {
            "success": True,
            "message": "Team details retrieved successfully",
            "data": {
                "team_name": team_name or "Unknown Team",
                "team_id": team_id,
                "event_id": event_id,
                "event_name": event.get("event_name", ""),
                "total_members": len(team_members),
                "members": team_members
            }
        }
        
        print("✅ API Result:")
        print(f"Team Name: {result['data']['team_name']}")
        print(f"Total Members: {result['data']['total_members']}")
        print("Members:")
        for member in result['data']['members']:
            print(f"  - {member['full_name']} ({member['enrollment_no']}) - {member['registration_type']}")
            print(f"    Registration ID: {member['registration_id']}")
            print(f"    Attendance: {'✅' if member['attendance']['marked'] else '❌'}")
        
        print("✅ Test completed successfully")
        
    except Exception as e:
        print(f"❌ Error during test: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_updated_api())
