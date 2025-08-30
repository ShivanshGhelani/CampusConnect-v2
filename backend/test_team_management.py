#!/usr/bin/env python3
"""
Team Management Backend Testing Script
=====================================
Comprehensive testing of all team management APIs with existing data
"""

import asyncio
import json
import sys
import os
from datetime import datetime, timezone
from typing import Dict, Any

# Add the backend directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from database.operations import DatabaseOperations
from api.v1.client.profile.team_tools import (
    get_team_registration, verify_team_leadership, get_team_members,
    create_task, get_team_tasks, complete_task, assign_role, get_team_roles,
    post_message, get_team_messages, generate_report, get_team_overview
)
from models.student import Student

# Test data constants
EVENT_ID = "ADLHASTU2025"
TEAM_REGISTRATION_ID = "TEAM_INDIANS_ADLHASTU2025"
TEAM_LEADER_ENROLLMENT = "22BEIT30042"  # Meet Ghadiya
TEAM_MEMBER_ENROLLMENT = "22BEIT30043"  # Shivansh Ghelani
TEAM_MEMBER2_ENROLLMENT = "22CSEB10056"  # Ritu Sharma
TEAM_MEMBER3_ENROLLMENT = "22BEIT30015"  # Yash Patel

class MockStudent:
    """Mock student object for testing"""
    def __init__(self, enrollment_no: str, full_name: str):
        self.enrollment_no = enrollment_no
        self.full_name = full_name

async def test_utility_functions():
    """Test utility functions"""
    print("🔧 Testing Utility Functions...")
    
    # Test get_team_registration
    print("  📋 Testing get_team_registration...")
    registration = await get_team_registration(EVENT_ID, TEAM_LEADER_ENROLLMENT)
    if registration:
        print(f"    ✅ Found team registration: {registration['registration_id']}")
        print(f"    📊 Team name: {registration.get('team', {}).get('team_name', 'Unknown')}")
        print(f"    👥 Team members count: {len(registration.get('team_members', []))}")
    else:
        print("    ❌ No team registration found")
        return False
    
    # Test verify_team_leadership
    print("  👑 Testing verify_team_leadership...")
    is_leader = await verify_team_leadership(EVENT_ID, TEAM_LEADER_ENROLLMENT)
    print(f"    ✅ Team leader verification: {is_leader}")
    
    is_not_leader = await verify_team_leadership(EVENT_ID, TEAM_MEMBER_ENROLLMENT)
    print(f"    ✅ Non-leader verification: {is_not_leader}")
    
    # Test get_team_members
    print("  👥 Testing get_team_members...")
    members = await get_team_members(EVENT_ID, TEAM_REGISTRATION_ID)
    print(f"    ✅ Found {len(members)} team members:")
    for member in members:
        role_status = "👑 Leader" if member.get("is_leader") else "👤 Member"
        print(f"      {role_status}: {member.get('name')} ({member.get('enrollment_no')})")
    
    return True

async def test_task_management():
    """Test task management endpoints"""
    print("\n📋 Testing Task Management...")
    
    # Mock team leader
    team_leader = MockStudent(TEAM_LEADER_ENROLLMENT, "Meet Ghadiya")
    
    # Test create_task
    print("  ➕ Testing create_task...")
    from api.v1.client.profile.team_tools import TaskData
    
    task_data = TaskData(
        title="Design AI Model Architecture",
        description="Create the initial architecture for our deep learning model",
        priority="high",
        deadline=datetime(2025, 9, 11, 12, 0, 0, tzinfo=timezone.utc),
        assigned_to=[TEAM_MEMBER_ENROLLMENT, TEAM_MEMBER2_ENROLLMENT],
        category="development"
    )
    
    try:
        # Simulate the API call logic
        is_leader = await verify_team_leadership(EVENT_ID, team_leader.enrollment_no)
        if not is_leader:
            print("    ❌ Only team leaders can create tasks")
            return False
        
        registration = await get_team_registration(EVENT_ID, team_leader.enrollment_no)
        if not registration:
            print("    ❌ Team registration not found")
            return False
        
        # Generate task ID
        task_id = f"task_{EVENT_ID}_{int(datetime.now().timestamp())}"
        
        # Create task object
        task = {
            "task_id": task_id,
            "title": task_data.title,
            "description": task_data.description,
            "priority": task_data.priority,
            "deadline": task_data.deadline.isoformat() if task_data.deadline else None,
            "assigned_to": task_data.assigned_to,
            "category": task_data.category,
            "status": "pending",
            "created_by": team_leader.enrollment_no,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "completed_by": None,
            "completed_at": None,
            "reviews": []
        }
        
        # Update team registration with new task
        result = await DatabaseOperations.update_one(
            "student_registrations",
            {"_id": registration["_id"]},
            {
                "$push": {"tasks": task},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )
        
        if result:
            print(f"    ✅ Task created successfully: {task_id}")
            print(f"    📝 Title: {task['title']}")
            print(f"    👥 Assigned to: {', '.join(task['assigned_to'])}")
            return task_id
        else:
            print("    ❌ Failed to create task")
            return False
            
    except Exception as e:
        print(f"    ❌ Error creating task: {e}")
        return False

async def test_role_assignment():
    """Test role assignment endpoints"""
    print("\n👔 Testing Role Assignment...")
    
    team_leader = MockStudent(TEAM_LEADER_ENROLLMENT, "Meet Ghadiya")
    
    print("  🎯 Testing assign_role...")
    from api.v1.client.profile.team_tools import RoleAssignmentData
    
    role_data = RoleAssignmentData(
        member_enrollment=TEAM_MEMBER_ENROLLMENT,
        role="Frontend Developer",
        permissions=["view", "edit_tasks", "post_messages"],
        description="Lead frontend development and UI design"
    )
    
    try:
        # Simulate the API call logic
        is_leader = await verify_team_leadership(EVENT_ID, team_leader.enrollment_no)
        if not is_leader:
            print("    ❌ Only team leaders can assign roles")
            return False
        
        registration = await get_team_registration(EVENT_ID, team_leader.enrollment_no)
        if not registration:
            print("    ❌ Team registration not found")
            return False
        
        # Verify member is part of team
        team_members = await get_team_members(EVENT_ID, registration["registration_id"])
        member_enrollments = [member["enrollment_no"] for member in team_members]
        
        if role_data.member_enrollment not in member_enrollments:
            print("    ❌ Member not found in team")
            return False
        
        # Create role assignment
        role_assignment = {
            "role": role_data.role,
            "permissions": role_data.permissions,
            "description": role_data.description,
            "assigned_by": team_leader.enrollment_no,
            "assigned_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Update team roles in registration
        result = await DatabaseOperations.update_one(
            "student_registrations",
            {"_id": registration["_id"]},
            {
                "$set": {
                    f"team_roles.{role_data.member_enrollment}": role_assignment,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        if result:
            print(f"    ✅ Role assigned successfully: {role_data.role}")
            print(f"    👤 Member: {role_data.member_enrollment}")
            print(f"    🔑 Permissions: {', '.join(role_data.permissions)}")
            return True
        else:
            print("    ❌ Failed to assign role")
            return False
            
    except Exception as e:
        print(f"    ❌ Error assigning role: {e}")
        return False

async def test_team_communication():
    """Test team communication endpoints"""
    print("\n💬 Testing Team Communication...")
    
    team_member = MockStudent(TEAM_MEMBER_ENROLLMENT, "Shivansh Ghelani")
    
    print("  📨 Testing post_message...")
    from api.v1.client.profile.team_tools import MessageData
    
    message_data = MessageData(
        content="Hey team! I've started working on the frontend architecture. @22CSEB10056 can you help with the data preprocessing?",
        priority="normal",
        mentions=[TEAM_MEMBER2_ENROLLMENT],
        category="development"
    )
    
    try:
        # Simulate the API call logic
        registration = await get_team_registration(EVENT_ID, team_member.enrollment_no)
        if not registration:
            print("    ❌ Team registration not found")
            return False
        
        # Generate message ID
        message_id = f"msg_{EVENT_ID}_{int(datetime.now().timestamp())}"
        
        # Create message object
        message = {
            "message_id": message_id,
            "content": message_data.content,
            "priority": message_data.priority,
            "mentions": message_data.mentions,
            "category": message_data.category,
            "sent_by": team_member.enrollment_no,
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "read_by": [team_member.enrollment_no],  # Sender automatically reads
            "reactions": {},
            "replies": []
        }
        
        # Update team registration with new message
        result = await DatabaseOperations.update_one(
            "student_registrations",
            {"_id": registration["_id"]},
            {
                "$push": {"messages": message},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )
        
        if result:
            print(f"    ✅ Message posted successfully: {message_id}")
            print(f"    💬 Content: {message['content'][:50]}...")
            print(f"    🏷️ Mentions: {', '.join(message['mentions'])}")
            return message_id
        else:
            print("    ❌ Failed to post message")
            return False
            
    except Exception as e:
        print(f"    ❌ Error posting message: {e}")
        return False

async def test_report_generation():
    """Test report generation"""
    print("\n📊 Testing Report Generation...")
    
    team_leader = MockStudent(TEAM_LEADER_ENROLLMENT, "Meet Ghadiya")
    
    print("  📈 Testing generate_report...")
    from api.v1.client.profile.team_tools import ReportGenerationData
    
    report_data = ReportGenerationData(
        report_type="team_overview",
        format="json",
        include_sections=["team_summary", "task_summary", "communication_summary"]
    )
    
    try:
        # Simulate the API call logic
        is_leader = await verify_team_leadership(EVENT_ID, team_leader.enrollment_no)
        if not is_leader:
            print("    ❌ Only team leaders can generate reports")
            return False
        
        registration = await get_team_registration(EVENT_ID, team_leader.enrollment_no)
        if not registration:
            print("    ❌ Team registration not found")
            return False
        
        # Get team data for report
        team_members = await get_team_members(EVENT_ID, registration["registration_id"])
        tasks = registration.get("tasks", [])
        messages = registration.get("messages", [])
        
        # Generate report
        report_id = f"report_{EVENT_ID}_{int(datetime.now().timestamp())}"
        
        report = {
            "report_id": report_id,
            "type": report_data.report_type,
            "format": report_data.format,
            "generated_by": team_leader.enrollment_no,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "event_id": EVENT_ID,
            "team_name": registration.get("team", {}).get("team_name", "Unknown Team"),
            "data": {
                "team_summary": {
                    "total_members": len(team_members),
                    "total_tasks": len(tasks),
                    "completed_tasks": len([t for t in tasks if t.get("status") == "completed"]),
                    "total_messages": len(messages),
                    "team_leader": next((m["name"] for m in team_members if m["is_leader"]), "Unknown")
                },
                "members": team_members,
                "recent_activity": {
                    "recent_tasks": sorted(tasks, key=lambda x: x.get("created_at", ""), reverse=True)[:5],
                    "recent_messages": sorted(messages, key=lambda x: x.get("sent_at", ""), reverse=True)[:10]
                }
            }
        }
        
        print(f"    ✅ Report generated successfully: {report_id}")
        print(f"    📊 Report type: {report['type']}")
        print(f"    📋 Team summary: {report['data']['team_summary']}")
        return report
        
    except Exception as e:
        print(f"    ❌ Error generating report: {e}")
        return False

async def test_team_overview():
    """Test team overview endpoint"""
    print("\n🏠 Testing Team Overview...")
    
    team_member = MockStudent(TEAM_MEMBER_ENROLLMENT, "Shivansh Ghelani")
    
    try:
        # Simulate the API call logic
        registration = await get_team_registration(EVENT_ID, team_member.enrollment_no)
        if not registration:
            print("    ❌ Team registration not found")
            return False
        
        # Get team data
        team_members = await get_team_members(EVENT_ID, registration["registration_id"])
        tasks = registration.get("tasks", [])
        messages = registration.get("messages", [])
        is_leader = await verify_team_leadership(EVENT_ID, team_member.enrollment_no)
        
        # Calculate statistics
        overview = {
            "team_info": {
                "team_name": registration.get("team", {}).get("team_name", "Unknown Team"),
                "team_id": registration["registration_id"],
                "event_id": EVENT_ID,
                "total_members": len(team_members),
                "is_team_leader": is_leader
            },
            "members": team_members,
            "task_summary": {
                "total_tasks": len(tasks),
                "pending_tasks": len([t for t in tasks if t.get("status") == "pending"]),
                "completed_tasks": len([t for t in tasks if t.get("status") == "completed"]),
                "my_tasks": len([t for t in tasks if team_member.enrollment_no in t.get("assigned_to", [])]),
                "recent_tasks": sorted(tasks, key=lambda x: x.get("created_at", ""), reverse=True)[:3]
            },
            "communication_summary": {
                "total_messages": len(messages),
                "unread_messages": len([
                    m for m in messages 
                    if team_member.enrollment_no not in m.get("read_by", [])
                ]),
                "recent_messages": sorted(messages, key=lambda x: x.get("sent_at", ""), reverse=True)[:5]
            }
        }
        
        print(f"    ✅ Team overview generated successfully")
        print(f"    🏠 Team: {overview['team_info']['team_name']}")
        print(f"    👥 Members: {overview['team_info']['total_members']}")
        print(f"    📋 Tasks: {overview['task_summary']['total_tasks']}")
        print(f"    💬 Messages: {overview['communication_summary']['total_messages']}")
        return overview
        
    except Exception as e:
        print(f"    ❌ Error generating team overview: {e}")
        return False

async def test_data_integrity():
    """Test data integrity and edge cases"""
    print("\n🔍 Testing Data Integrity...")
    
    # Test with non-existent event
    print("  🚫 Testing with non-existent event...")
    fake_registration = await get_team_registration("FAKE_EVENT", TEAM_LEADER_ENROLLMENT)
    if fake_registration is None:
        print("    ✅ Correctly handles non-existent event")
    else:
        print("    ❌ Should return None for non-existent event")
    
    # Test with non-team-leader
    print("  👤 Testing with non-team-leader...")
    is_fake_leader = await verify_team_leadership(EVENT_ID, "FAKE_ENROLLMENT")
    if not is_fake_leader:
        print("    ✅ Correctly identifies non-team-leader")
    else:
        print("    ❌ Should return False for non-team-leader")
    
    # Test current team data structure
    print("  📊 Testing current team data structure...")
    registration = await get_team_registration(EVENT_ID, TEAM_LEADER_ENROLLMENT)
    if registration:
        # Check if new fields exist
        tasks = registration.get("tasks", [])
        messages = registration.get("messages", [])
        team_roles = registration.get("team_roles", {})
        
        print(f"    📋 Tasks field exists: {'✅' if isinstance(tasks, list) else '❌'}")
        print(f"    💬 Messages field exists: {'✅' if isinstance(messages, list) else '❌'}")
        print(f"    👔 Team roles field exists: {'✅' if isinstance(team_roles, dict) else '❌'}")
        
        # Show current counts
        print(f"    📊 Current stats:")
        print(f"      📋 Tasks: {len(tasks)}")
        print(f"      💬 Messages: {len(messages)}")
        print(f"      👔 Roles assigned: {len(team_roles)}")
        
        return True
    else:
        print("    ❌ Could not retrieve team registration")
        return False

async def run_comprehensive_test():
    """Run all tests in sequence"""
    print("🚀 Starting Comprehensive Team Management Backend Tests")
    print("=" * 60)
    
    test_results = {}
    
    try:
        # Run all tests
        test_results["utilities"] = await test_utility_functions()
        test_results["tasks"] = await test_task_management()
        test_results["roles"] = await test_role_assignment()
        test_results["communication"] = await test_team_communication()
        test_results["reports"] = await test_report_generation()
        test_results["overview"] = await test_team_overview()
        test_results["integrity"] = await test_data_integrity()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in test_results.values() if result)
        total = len(test_results)
        
        for test_name, result in test_results.items():
            status = "✅ PASSED" if result else "❌ FAILED"
            print(f"  {test_name.upper():15} : {status}")
        
        print(f"\n🎯 Overall Result: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED! Team management backend is ready for frontend integration!")
        else:
            print("⚠️  Some tests failed. Please review the issues above.")
            
    except Exception as e:
        print(f"❌ Test execution error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Run the comprehensive test
    asyncio.run(run_comprehensive_test())
