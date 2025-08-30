"""
Team Management Tools API
========================
Enhanced team management features for registered students
Handles task management, role assignment, messaging, and report generation
"""

import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Request, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from dependencies.auth import require_student_login, get_current_student
from models.student import Student
from database.operations import DatabaseOperations
from services.event_registration_service import event_registration_service

logger = logging.getLogger(__name__)
router = APIRouter()

# ===== PYDANTIC MODELS =====

class TaskData(BaseModel):
    """Task creation/update data model"""
    title: str = Field(..., min_length=3, max_length=100)
    description: Optional[str] = Field(default="", max_length=500)
    priority: str = Field(default="medium", description="low, medium, high")
    deadline: Optional[datetime] = None
    assigned_to: List[str] = Field(default=[], description="List of enrollment numbers")
    category: str = Field(default="general", description="Task category")

class RoleAssignmentData(BaseModel):
    """Role assignment data model"""
    member_enrollment: str = Field(..., description="Enrollment number of member")
    role: str = Field(..., description="Role to assign")
    permissions: List[str] = Field(default=[], description="List of permissions")
    description: Optional[str] = Field(default="", max_length=200)

class MessageData(BaseModel):
    """Team message data model"""
    content: str = Field(..., min_length=1, max_length=1000)
    priority: str = Field(default="normal", description="low, normal, high, urgent")
    mentions: List[str] = Field(default=[], description="List of enrollment numbers to mention")
    category: str = Field(default="general", description="Message category")

class ReportGenerationData(BaseModel):
    """Report generation request data model"""
    report_type: str = Field(..., description="team_overview, task_summary, attendance_report, communication_log")
    format: str = Field(default="json", description="json, csv, pdf")
    date_range: Optional[Dict[str, str]] = Field(default=None, description="start_date and end_date")
    include_sections: List[str] = Field(default=[], description="Sections to include in report")

# ===== UTILITY FUNCTIONS =====

async def get_team_registration(event_id: str, student_enrollment: str) -> Optional[Dict[str, Any]]:
    """Get team registration data for a student and event"""
    try:
        # Find the student's registration in student_registrations collection
        registration = await DatabaseOperations.find_one(
            "student_registrations",
            {
                "$or": [
                    # Student is team leader (stored in team.team_leader)
                    {
                        "event.event_id": event_id,
                        "registration_type": "team",
                        "team.team_leader": student_enrollment
                    },
                    # Student is team member (in team_members array)
                    {
                        "event.event_id": event_id,
                        "registration_type": "team",
                        "team_members.student.enrollment_no": student_enrollment
                    }
                ]
            }
        )
        
        # If registration found, ensure team management fields exist
        if registration:
            # Initialize missing team management fields
            updates = {}
            if 'tasks' not in registration:
                updates['tasks'] = []
            if 'messages' not in registration:
                updates['messages'] = []
            if 'team_roles' not in registration:
                updates['team_roles'] = {}
            
            # Update database with missing fields if needed
            if updates:
                await DatabaseOperations.update_one(
                    "student_registrations",
                    {"_id": registration["_id"]},
                    {"$set": updates}
                )
                # Add fields to returned registration
                registration.update(updates)
        
        return registration
    except Exception as e:
        logger.error(f"Error getting team registration: {str(e)}")
        return None

async def verify_team_leadership(event_id: str, student_enrollment: str) -> bool:
    """Verify if student is team leader for the event"""
    try:
        registration = await DatabaseOperations.find_one(
            "student_registrations",
            {
                "event.event_id": event_id,
                "registration_type": "team",
                "team.team_leader": student_enrollment
            }
        )
        return registration is not None
    except Exception as e:
        logger.error(f"Error verifying team leadership: {str(e)}")
        return False

async def get_team_members(event_id: str, team_registration_id: str) -> List[Dict[str, Any]]:
    """Get all team members for a team registration"""
    try:
        registration = await DatabaseOperations.find_one(
            "student_registrations",
            {
                "event.event_id": event_id,
                "registration_id": team_registration_id
            }
        )
        
        if not registration:
            return []
        
        members = []
        
        # Get team leader from team data
        team_data = registration.get("team", {})
        team_leader_enrollment = team_data.get("team_leader")
        
        # Add all team members from team_members array
        team_members = registration.get("team_members", [])
        for member in team_members:
            if isinstance(member, dict) and member.get("student"):
                student_info = member["student"]
                enrollment = student_info.get("enrollment_no")
                is_leader = enrollment == team_leader_enrollment
                
                members.append({
                    "enrollment_no": enrollment,
                    "name": student_info.get("name"),
                    "email": student_info.get("email"),
                    "role": "team_leader" if is_leader else "team_member",
                    "is_leader": is_leader,
                    "assigned_roles": registration.get("team_roles", {}).get(enrollment, []),
                    "permissions": ["all"] if is_leader else ["basic"]
                })
        
        return members
    except Exception as e:
        logger.error(f"Error getting team members: {str(e)}")
        return []

# ===== API ENDPOINTS =====

@router.post("/create-task/{event_id}")
async def create_task(
    event_id: str,
    task_data: TaskData,
    current_student: Student = Depends(require_student_login)
):
    """Create a new task for the team (team leader only)"""
    try:
        # Verify team leadership
        is_leader = await verify_team_leadership(event_id, current_student.enrollment_no)
        if not is_leader:
            raise HTTPException(status_code=403, detail="Only team leaders can create tasks")
        
        # Get team registration
        registration = await get_team_registration(event_id, current_student.enrollment_no)
        if not registration:
            raise HTTPException(status_code=404, detail="Team registration not found")
        
        # Generate task ID
        task_id = f"task_{event_id}_{int(datetime.now().timestamp())}"
        
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
            "created_by": current_student.enrollment_no,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "completed_by": None,
            "completed_at": None,
            "reviews": []
        }
        
        # Update team registration with new task
        await DatabaseOperations.update_one(
            "student_registrations",
            {"_id": registration["_id"]},
            {
                "$push": {"tasks": task},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )
        
        logger.info(f"Task created: {task_id} by {current_student.enrollment_no}")
        
        return {
            "success": True,
            "message": "Task created successfully",
            "task": task
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating task: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create task: {str(e)}")

@router.get("/tasks/{event_id}")
async def get_team_tasks(
    event_id: str,
    status: Optional[str] = Query(None, description="Filter by task status"),
    current_student: Student = Depends(require_student_login)
):
    """Get all tasks for the team"""
    try:
        # Get team registration
        registration = await get_team_registration(event_id, current_student.enrollment_no)
        if not registration:
            raise HTTPException(status_code=404, detail="Team registration not found")
        
        tasks = registration.get("tasks", [])
        
        # Filter by status if provided
        if status:
            tasks = [task for task in tasks if task.get("status") == status]
        
        # Filter tasks assigned to current student or all if team leader
        is_leader = await verify_team_leadership(event_id, current_student.enrollment_no)
        if not is_leader:
            tasks = [
                task for task in tasks 
                if current_student.enrollment_no in task.get("assigned_to", [])
            ]
        
        return {
            "success": True,
            "message": f"Retrieved {len(tasks)} tasks",
            "tasks": tasks,
            "is_team_leader": is_leader
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting tasks: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get tasks: {str(e)}")

@router.put("/task/{event_id}/{task_id}/complete")
async def complete_task(
    event_id: str,
    task_id: str,
    request: Request,
    current_student: Student = Depends(require_student_login)
):
    """Mark a task as completed with optional review"""
    try:
        data = await request.json()
        review_comment = data.get("review_comment", "")
        
        # Get team registration
        registration = await get_team_registration(event_id, current_student.enrollment_no)
        if not registration:
            raise HTTPException(status_code=404, detail="Team registration not found")
        
        # Find the task
        tasks = registration.get("tasks", [])
        task_index = next(
            (i for i, task in enumerate(tasks) if task.get("task_id") == task_id), 
            None
        )
        
        if task_index is None:
            raise HTTPException(status_code=404, detail="Task not found")
        
        task = tasks[task_index]
        
        # Check if student is assigned to this task
        if current_student.enrollment_no not in task.get("assigned_to", []):
            raise HTTPException(status_code=403, detail="You are not assigned to this task")
        
        # Update task completion
        task["status"] = "completed"
        task["completed_by"] = current_student.enrollment_no
        task["completed_at"] = datetime.now(timezone.utc).isoformat()
        task["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # Add review if provided
        if review_comment:
            task["reviews"].append({
                "reviewer": current_student.enrollment_no,
                "comment": review_comment,
                "reviewed_at": datetime.now(timezone.utc).isoformat()
            })
        
        # Update in database
        await DatabaseOperations.update_one(
            "student_registrations",
            {"_id": registration["_id"]},
            {
                "$set": {
                    f"tasks.{task_index}": task,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        logger.info(f"Task completed: {task_id} by {current_student.enrollment_no}")
        
        return {
            "success": True,
            "message": "Task completed successfully",
            "task": task
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing task: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to complete task: {str(e)}")

@router.post("/assign-role/{event_id}")
async def assign_role(
    event_id: str,
    role_data: RoleAssignmentData,
    current_student: Student = Depends(require_student_login)
):
    """Assign role to team member (team leader only)"""
    try:
        # Verify team leadership
        is_leader = await verify_team_leadership(event_id, current_student.enrollment_no)
        if not is_leader:
            raise HTTPException(status_code=403, detail="Only team leaders can assign roles")
        
        # Get team registration
        registration = await get_team_registration(event_id, current_student.enrollment_no)
        if not registration:
            raise HTTPException(status_code=404, detail="Team registration not found")
        
        # Verify member is part of team
        team_members = await get_team_members(event_id, registration["registration_id"])
        member_enrollments = [member["enrollment_no"] for member in team_members]
        
        if role_data.member_enrollment not in member_enrollments:
            raise HTTPException(status_code=404, detail="Member not found in team")
        
        # Create role assignment
        role_assignment = {
            "role": role_data.role,
            "permissions": role_data.permissions,
            "description": role_data.description,
            "assigned_by": current_student.enrollment_no,
            "assigned_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Update team roles in registration
        await DatabaseOperations.update_one(
            "student_registrations",
            {"_id": registration["_id"]},
            {
                "$set": {
                    f"team_roles.{role_data.member_enrollment}": role_assignment,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        logger.info(f"Role assigned: {role_data.role} to {role_data.member_enrollment} by {current_student.enrollment_no}")
        
        return {
            "success": True,
            "message": f"Role '{role_data.role}' assigned successfully",
            "assignment": role_assignment
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assigning role: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to assign role: {str(e)}")

@router.get("/roles/{event_id}")
async def get_team_roles(
    event_id: str,
    current_student: Student = Depends(require_student_login)
):
    """Get all role assignments for the team"""
    try:
        # Get team registration
        registration = await get_team_registration(event_id, current_student.enrollment_no)
        if not registration:
            raise HTTPException(status_code=404, detail="Team registration not found")
        
        team_roles = registration.get("team_roles", {})
        team_members = await get_team_members(event_id, registration["registration_id"])
        
        # Combine role assignments with member info
        roles_with_members = []
        for member in team_members:
            enrollment = member["enrollment_no"]
            role_info = team_roles.get(enrollment, {})
            
            roles_with_members.append({
                "enrollment_no": enrollment,
                "name": member["name"],
                "email": member["email"],
                "is_leader": member["is_leader"],
                "assigned_role": role_info.get("role", "team_member" if not member["is_leader"] else "team_leader"),
                "permissions": role_info.get("permissions", member["permissions"]),
                "description": role_info.get("description", ""),
                "assigned_by": role_info.get("assigned_by"),
                "assigned_at": role_info.get("assigned_at")
            })
        
        return {
            "success": True,
            "message": f"Retrieved roles for {len(roles_with_members)} members",
            "roles": roles_with_members
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting roles: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get roles: {str(e)}")

@router.post("/post-message/{event_id}")
async def post_message(
    event_id: str,
    message_data: MessageData,
    current_student: Student = Depends(require_student_login)
):
    """Post a message to the team communication board"""
    try:
        # Get team registration
        registration = await get_team_registration(event_id, current_student.enrollment_no)
        if not registration:
            raise HTTPException(status_code=404, detail="Team registration not found")
        
        # Generate message ID
        message_id = f"msg_{event_id}_{int(datetime.now().timestamp())}"
        
        # Create message object
        message = {
            "message_id": message_id,
            "content": message_data.content,
            "priority": message_data.priority,
            "mentions": message_data.mentions,
            "category": message_data.category,
            "sent_by": current_student.enrollment_no,
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "read_by": [current_student.enrollment_no],  # Sender automatically reads
            "reactions": {},
            "replies": []
        }
        
        # Update team registration with new message
        await DatabaseOperations.update_one(
            "student_registrations",
            {"_id": registration["_id"]},
            {
                "$push": {"messages": message},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )
        
        logger.info(f"Message posted: {message_id} by {current_student.enrollment_no}")
        
        return {
            "success": True,
            "message": "Message posted successfully",
            "message_data": message
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error posting message: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to post message: {str(e)}")

@router.get("/messages/{event_id}")
async def get_team_messages(
    event_id: str,
    limit: int = Query(50, description="Number of messages to retrieve"),
    skip: int = Query(0, description="Number of messages to skip"),
    current_student: Student = Depends(require_student_login)
):
    """Get team messages with pagination"""
    try:
        # Get team registration
        registration = await get_team_registration(event_id, current_student.enrollment_no)
        if not registration:
            raise HTTPException(status_code=404, detail="Team registration not found")
        
        messages = registration.get("messages", [])
        
        # Sort by sent_at (newest first)
        messages.sort(key=lambda x: x.get("sent_at", ""), reverse=True)
        
        # Apply pagination
        paginated_messages = messages[skip:skip + limit]
        
        # Mark messages as read by current student
        message_ids_to_mark = []
        for msg in paginated_messages:
            if current_student.enrollment_no not in msg.get("read_by", []):
                message_ids_to_mark.append(msg["message_id"])
        
        if message_ids_to_mark:
            await DatabaseOperations.update_one(
                "student_registrations",
                {"_id": registration["_id"]},
                {
                    "$addToSet": {
                        "messages.$[msg].read_by": current_student.enrollment_no
                    }
                },
                array_filters=[
                    {"msg.message_id": {"$in": message_ids_to_mark}}
                ]
            )
        
        return {
            "success": True,
            "message": f"Retrieved {len(paginated_messages)} messages",
            "messages": paginated_messages,
            "total_messages": len(messages),
            "has_more": skip + limit < len(messages)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting messages: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get messages: {str(e)}")

@router.post("/generate-report/{event_id}")
async def generate_report(
    event_id: str,
    report_data: ReportGenerationData,
    current_student: Student = Depends(require_student_login)
):
    """Generate team report (team leader only)"""
    try:
        # Verify team leadership
        is_leader = await verify_team_leadership(event_id, current_student.enrollment_no)
        if not is_leader:
            raise HTTPException(status_code=403, detail="Only team leaders can generate reports")
        
        # Get team registration
        registration = await get_team_registration(event_id, current_student.enrollment_no)
        if not registration:
            raise HTTPException(status_code=404, detail="Team registration not found")
        
        # Get team data for report
        team_members = await get_team_members(event_id, registration["registration_id"])
        tasks = registration.get("tasks", [])
        messages = registration.get("messages", [])
        
        # Generate report based on type
        report = {
            "report_id": f"report_{event_id}_{int(datetime.now().timestamp())}",
            "type": report_data.report_type,
            "format": report_data.format,
            "generated_by": current_student.enrollment_no,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "event_id": event_id,
            "team_name": registration.get("team", {}).get("team_name", "Unknown Team")
        }
        
        if report_data.report_type == "team_overview":
            report["data"] = {
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
        
        elif report_data.report_type == "task_summary":
            task_stats = {
                "total": len(tasks),
                "pending": len([t for t in tasks if t.get("status") == "pending"]),
                "completed": len([t for t in tasks if t.get("status") == "completed"]),
                "overdue": 0  # Could implement deadline checking logic
            }
            
            report["data"] = {
                "task_statistics": task_stats,
                "tasks_by_priority": {
                    "high": [t for t in tasks if t.get("priority") == "high"],
                    "medium": [t for t in tasks if t.get("priority") == "medium"],
                    "low": [t for t in tasks if t.get("priority") == "low"]
                },
                "tasks_by_member": {}
            }
            
            # Group tasks by assigned members
            for task in tasks:
                for member in task.get("assigned_to", []):
                    if member not in report["data"]["tasks_by_member"]:
                        report["data"]["tasks_by_member"][member] = []
                    report["data"]["tasks_by_member"][member].append(task)
        
        elif report_data.report_type == "communication_log":
            report["data"] = {
                "total_messages": len(messages),
                "messages_by_priority": {
                    "urgent": [m for m in messages if m.get("priority") == "urgent"],
                    "high": [m for m in messages if m.get("priority") == "high"],
                    "normal": [m for m in messages if m.get("priority") == "normal"],
                    "low": [m for m in messages if m.get("priority") == "low"]
                },
                "message_timeline": sorted(messages, key=lambda x: x.get("sent_at", "")),
                "active_participants": list(set([m.get("sent_by") for m in messages if m.get("sent_by")]))
            }
        
        else:
            # Default comprehensive report
            report["data"] = {
                "team_overview": {
                    "members": team_members,
                    "total_members": len(team_members)
                },
                "task_summary": {
                    "tasks": tasks,
                    "total_tasks": len(tasks),
                    "completed_tasks": len([t for t in tasks if t.get("status") == "completed"])
                },
                "communication_summary": {
                    "messages": messages[-20:],  # Last 20 messages
                    "total_messages": len(messages)
                }
            }
        
        logger.info(f"Report generated: {report['report_id']} by {current_student.enrollment_no}")
        
        return {
            "success": True,
            "message": f"{report_data.report_type} report generated successfully",
            "report": report
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating report: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")

@router.get("/team-overview/{event_id}")
async def get_team_overview(
    event_id: str,
    current_student: Student = Depends(require_student_login)
):
    """Get comprehensive team overview for dashboard"""
    try:
        # Get team registration
        registration = await get_team_registration(event_id, current_student.enrollment_no)
        if not registration:
            raise HTTPException(status_code=404, detail="Team registration not found")
        
        # Get team data
        team_members = await get_team_members(event_id, registration["registration_id"])
        tasks = registration.get("tasks", [])
        messages = registration.get("messages", [])
        is_leader = await verify_team_leadership(event_id, current_student.enrollment_no)
        
        # Calculate statistics
        overview = {
            "team_info": {
                "team_name": registration.get("team", {}).get("team_name", "Unknown Team"),
                "team_id": registration["registration_id"],
                "event_id": event_id,
                "total_members": len(team_members),
                "is_team_leader": is_leader
            },
            "members": team_members,
            "task_summary": {
                "total_tasks": len(tasks),
                "pending_tasks": len([t for t in tasks if t.get("status") == "pending"]),
                "completed_tasks": len([t for t in tasks if t.get("status") == "completed"]),
                "my_tasks": len([t for t in tasks if current_student.enrollment_no in t.get("assigned_to", [])]),
                "recent_tasks": sorted(tasks, key=lambda x: x.get("created_at", ""), reverse=True)[:3]
            },
            "communication_summary": {
                "total_messages": len(messages),
                "unread_messages": len([
                    m for m in messages 
                    if current_student.enrollment_no not in m.get("read_by", [])
                ]),
                "recent_messages": sorted(messages, key=lambda x: x.get("sent_at", ""), reverse=True)[:5]
            },
            "activity_feed": []
        }
        
        # Generate activity feed (combine tasks and messages)
        activities = []
        
        # Add task activities
        for task in tasks:
            activities.append({
                "type": "task",
                "action": "created" if task.get("status") == "pending" else "completed",
                "title": task.get("title"),
                "user": task.get("created_by") if task.get("status") == "pending" else task.get("completed_by"),
                "timestamp": task.get("created_at") if task.get("status") == "pending" else task.get("completed_at"),
                "priority": task.get("priority", "medium")
            })
        
        # Add message activities (recent ones only)
        for message in messages[-10:]:
            activities.append({
                "type": "message",
                "action": "posted",
                "title": message.get("content", "")[:50] + "..." if len(message.get("content", "")) > 50 else message.get("content", ""),
                "user": message.get("sent_by"),
                "timestamp": message.get("sent_at"),
                "priority": message.get("priority", "normal")
            })
        
        # Sort activities by timestamp (newest first)
        activities.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        overview["activity_feed"] = activities[:10]  # Last 10 activities
        
        return {
            "success": True,
            "message": "Team overview retrieved successfully",
            "overview": overview
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting team overview: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get team overview: {str(e)}")
