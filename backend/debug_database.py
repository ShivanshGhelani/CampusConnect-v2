#!/usr/bin/env python3
"""
Debug Database Structure
========================
Check the actual structure of the student_registrations collection
"""

import asyncio
import sys
import os
from pprint import pprint

# Add the backend directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from database.operations import DatabaseOperations

EVENT_ID = "ADLHASTU2025"
TEAM_REGISTRATION_ID = "TEAM_INDIANS_ADLHASTU2025"
TEAM_LEADER_ENROLLMENT = "22BEIT30042"

async def debug_database():
    """Debug the database structure"""
    print("🔍 Debugging Database Structure...")
    
    # Check all student_registrations for this event
    print(f"\n📋 Looking for registrations for event: {EVENT_ID}")
    
    try:
        # Find all registrations for this event
        all_registrations = await DatabaseOperations.find_many(
            "student_registrations",
            {"event.event_id": EVENT_ID}
        )
        
        print(f"Found {len(all_registrations)} registrations for event {EVENT_ID}")
        
        for i, reg in enumerate(all_registrations):
            print(f"\n📄 Registration {i+1}:")
            print(f"  🆔 ID: {reg.get('_id')}")
            print(f"  📝 Registration ID: {reg.get('registration_id')}")
            print(f"  📊 Type: {reg.get('registration_type')}")
            
            # Check if it's a team registration
            if reg.get('registration_type') == 'team':
                print(f"  👥 Team Data:")
                team_data = reg.get('team', {})
                print(f"    🏷️  Team Name: {team_data.get('team_name')}")
                print(f"    👑 Team Leader: {team_data.get('team_leader')}")
                print(f"    📊 Team Size: {team_data.get('team_size')}")
                
                # Check team members
                team_members = reg.get('team_members', [])
                print(f"    👥 Team Members ({len(team_members)}):")
                for j, member in enumerate(team_members):
                    student = member.get('student', {})
                    enrollment = student.get('enrollment_no', 'Unknown')
                    name = student.get('name', 'Unknown')
                    is_leader = member.get('is_team_leader', False)
                    leader_status = "👑 Leader" if is_leader else "👤 Member"
                    print(f"      {j+1}. {leader_status}: {name} ({enrollment})")
                
                # Check if this is our target team
                if reg.get('registration_id') == TEAM_REGISTRATION_ID:
                    print(f"  🎯 THIS IS OUR TARGET TEAM!")
                
            else:
                # Individual registration
                student_data = reg.get('student', {})
                print(f"  👤 Student: {student_data.get('name')} ({student_data.get('enrollment_no')})")
        
        # Specifically look for the team leader
        print(f"\n👑 Looking specifically for team leader: {TEAM_LEADER_ENROLLMENT}")
        
        # Try different query approaches
        queries_to_try = [
            # Query 1: Team leader as main student
            {
                "event.event_id": EVENT_ID,
                "registration_type": "team",
                "student.enrollment_no": TEAM_LEADER_ENROLLMENT
            },
            # Query 2: Team leader in team_members
            {
                "event.event_id": EVENT_ID,
                "registration_type": "team", 
                "team_members.student.enrollment_no": TEAM_LEADER_ENROLLMENT
            },
            # Query 3: Team leader in team info
            {
                "event.event_id": EVENT_ID,
                "team.team_leader": TEAM_LEADER_ENROLLMENT
            },
            # Query 4: Any mention of team leader
            {
                "event.event_id": EVENT_ID,
                "$or": [
                    {"student.enrollment_no": TEAM_LEADER_ENROLLMENT},
                    {"team_members.student.enrollment_no": TEAM_LEADER_ENROLLMENT},
                    {"team.team_leader": TEAM_LEADER_ENROLLMENT}
                ]
            }
        ]
        
        for i, query in enumerate(queries_to_try, 1):
            print(f"\n🔍 Query {i}: {query}")
            results = await DatabaseOperations.find_many("student_registrations", query)
            print(f"  📊 Results: {len(results)} found")
            
            if results:
                for result in results:
                    reg_id = result.get('registration_id', 'Unknown')
                    reg_type = result.get('registration_type', 'Unknown')
                    print(f"    ✅ Found: {reg_id} (type: {reg_type})")
        
        # Check the exact structure of our target registration
        print(f"\n🎯 Looking specifically for registration ID: {TEAM_REGISTRATION_ID}")
        target_reg = await DatabaseOperations.find_one(
            "student_registrations",
            {"registration_id": TEAM_REGISTRATION_ID}
        )
        
        if target_reg:
            print("✅ Found target registration!")
            print("📋 Structure analysis:")
            
            # Analyze the structure
            keys = list(target_reg.keys())
            print(f"  🔑 Top-level keys: {keys}")
            
            # Check specific fields we need
            fields_to_check = [
                'registration_type',
                'event.event_id', 
                'student.enrollment_no',
                'team.team_leader',
                'team_members',
                'tasks',
                'messages', 
                'team_roles'
            ]
            
            for field in fields_to_check:
                if '.' in field:
                    # Nested field
                    parts = field.split('.')
                    value = target_reg
                    for part in parts:
                        value = value.get(part, {}) if isinstance(value, dict) else None
                        if value is None:
                            break
                else:
                    # Top-level field
                    value = target_reg.get(field)
                
                if value is not None:
                    if isinstance(value, (list, dict)):
                        print(f"  ✅ {field}: {type(value).__name__} (length: {len(value)})")
                    else:
                        print(f"  ✅ {field}: {value}")
                else:
                    print(f"  ❌ {field}: Not found")
            
            # Show team management fields specifically
            print(f"\n📊 Team Management Fields:")
            tasks = target_reg.get('tasks', [])
            messages = target_reg.get('messages', [])
            team_roles = target_reg.get('team_roles', {})
            
            print(f"  📋 Tasks: {len(tasks)} items")
            print(f"  💬 Messages: {len(messages)} items") 
            print(f"  👔 Team Roles: {len(team_roles)} items")
            
            # If these fields don't exist, we need to initialize them
            if 'tasks' not in target_reg:
                print("  ⚠️  'tasks' field missing - will be initialized as empty array")
            if 'messages' not in target_reg:
                print("  ⚠️  'messages' field missing - will be initialized as empty array")
            if 'team_roles' not in target_reg:
                print("  ⚠️  'team_roles' field missing - will be initialized as empty object")
                
        else:
            print("❌ Target registration not found!")
            
    except Exception as e:
        print(f"❌ Database error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_database())
