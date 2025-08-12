#!/usr/bin/env python3
"""
Enhanced Team Management API Endpoints
Complete team management with roles, tasks, communication, and reporting
"""

from fastapi import APIRouter, Request, Depends, HTTPException, Query
from dependencies.auth import require_student_login
from models.student import Student
from models.team_management import TeamRole, TaskStatus, TaskPriority
from services.enhanced_team_management_service import EnhancedTeamManagementService
from datetime import datetime
from typing import List, Optional
import uuid

router = APIRouter(prefix="/enhanced")

# Initialize service
team_service = EnhancedTeamManagementService()

# ============ ROLE MANAGEMENT ENDPOINTS ============

@router.post("/assign-role")
async def assign_team_role(
    request: Request,
    student: Student = Depends(require_student_login)
):
    """Assign a role to a team member"""
    try:
        data = await request.json()
        
        result = await team_service.assign_role(
            event_id=data.get("event_id"),
            team_id=data.get("team_id"),
            enrollment_no=data.get("enrollment_no"),
            role=TeamRole(data.get("role")),
            custom_role_name=data.get("custom_role_name"),
            role_description=data.get("role_description"),
            assigned_by=student.enrollment_no
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid role: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to assign role: {str(e)}")

@router.get("/roles/{event_id}/{team_id}")
async def get_team_roles(
    event_id: str,
    team_id: str,
    student: Student = Depends(require_student_login)
):
    """Get all role assignments for a team"""
    try:
        result = await team_service.get_team_roles(event_id, team_id)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get team roles: {str(e)}")

@router.get("/available-roles")
async def get_available_roles():
    """Get list of available roles"""
    try:
        roles = [
            {"value": "team_leader", "label": "Team Leader", "description": "Leads and coordinates the team"},
            {"value": "coordinator", "label": "Coordinator", "description": "Coordinates team activities and schedules"},
            {"value": "developer", "label": "Developer", "description": "Handles technical development tasks"},
            {"value": "designer", "label": "Designer", "description": "Responsible for design and creative work"},
            {"value": "researcher", "label": "Researcher", "description": "Conducts research and analysis"},
            {"value": "presenter", "label": "Presenter", "description": "Handles presentations and public speaking"},
            {"value": "custom", "label": "Custom Role", "description": "Define a custom role"}
        ]
        
        return {
            "success": True,
            "roles": roles
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get available roles: {str(e)}")

# ============ TASK MANAGEMENT ENDPOINTS ============

@router.post("/create-task")
async def create_team_task(
    request: Request,
    student: Student = Depends(require_student_login)
):
    """Create a new team task"""
    try:
        data = await request.json()
        
        # Parse due date if provided
        due_date = None
        if data.get("due_date"):
            due_date = datetime.fromisoformat(data["due_date"].replace("Z", ""))
        
        result = await team_service.create_task(
            event_id=data.get("event_id"),
            team_id=data.get("team_id"),
            title=data.get("title"),
            description=data.get("description"),
            priority=TaskPriority(data.get("priority", "medium")),
            assigned_to=data.get("assigned_to", []),
            due_date=due_date,
            created_by=student.enrollment_no
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid priority: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create task: {str(e)}")

@router.post("/assign-task")
async def assign_task_to_members(
    request: Request,
    student: Student = Depends(require_student_login)
):
    """Assign task to team members"""
    try:
        data = await request.json()
        
        result = await team_service.assign_task(
            task_id=data.get("task_id"),
            assigned_to=data.get("assigned_to", []),
            assigned_by=student.enrollment_no
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to assign task: {str(e)}")

@router.post("/update-task-status")
async def update_task_status(
    request: Request,
    student: Student = Depends(require_student_login)
):
    """Update task status and progress"""
    try:
        data = await request.json()
        
        result = await team_service.update_task_status(
            task_id=data.get("task_id"),
            status=TaskStatus(data.get("status")),
            completed_by=student.enrollment_no if data.get("status") == "completed" else None,
            progress=data.get("progress")
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid status: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update task status: {str(e)}")

@router.get("/tasks/{event_id}/{team_id}")
async def get_team_tasks(
    event_id: str,
    team_id: str,
    assigned_to: Optional[str] = Query(None, description="Filter tasks by assignee"),
    student: Student = Depends(require_student_login)
):
    """Get team tasks with optional filtering"""
    try:
        result = await team_service.get_team_tasks(
            event_id=event_id,
            team_id=team_id,
            assigned_to=assigned_to
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get team tasks: {str(e)}")

@router.get("/my-tasks/{event_id}/{team_id}")
async def get_my_tasks(
    event_id: str,
    team_id: str,
    student: Student = Depends(require_student_login)
):
    """Get tasks assigned to the current user"""
    try:
        result = await team_service.get_team_tasks(
            event_id=event_id,
            team_id=team_id,
            assigned_to=student.enrollment_no
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get my tasks: {str(e)}")

# ============ COMMUNICATION ENDPOINTS ============

@router.post("/post-message")
async def post_team_message(
    request: Request,
    student: Student = Depends(require_student_login)
):
    """Post a message to the team"""
    try:
        data = await request.json()
        
        result = await team_service.post_message(
            event_id=data.get("event_id"),
            team_id=data.get("team_id"),
            sender_enrollment=student.enrollment_no,
            title=data.get("title"),
            content=data.get("content"),
            message_type=data.get("message_type", "announcement"),
            is_pinned=data.get("is_pinned", False),
            recipients=data.get("recipients", [])
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to post message: {str(e)}")

@router.get("/messages/{event_id}/{team_id}")
async def get_team_messages(
    event_id: str,
    team_id: str,
    student: Student = Depends(require_student_login)
):
    """Get team messages"""
    try:
        result = await team_service.get_team_messages(
            event_id=event_id,
            team_id=team_id,
            recipient_enrollment=student.enrollment_no
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get team messages: {str(e)}")

# ============ REPORTING ENDPOINTS ============

@router.post("/generate-report")
async def generate_team_report(
    request: Request,
    student: Student = Depends(require_student_login)
):
    """Generate comprehensive team performance report"""
    try:
        data = await request.json()
        
        result = await team_service.generate_team_report(
            event_id=data.get("event_id"),
            team_id=data.get("team_id"),
            generated_by=student.enrollment_no
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate team report: {str(e)}")

# ============ UTILITY ENDPOINTS ============

@router.get("/team-summary/{event_id}/{team_id}")
async def get_team_summary(
    event_id: str,
    team_id: str,
    student: Student = Depends(require_student_login)
):
    """Get comprehensive team summary"""
    try:
        # Get all team data
        roles_result = await team_service.get_team_roles(event_id, team_id)
        tasks_result = await team_service.get_team_tasks(event_id, team_id)
        messages_result = await team_service.get_team_messages(event_id, team_id)
        
        # Compile summary
        summary = {
            "event_id": event_id,
            "team_id": team_id,
            "roles": roles_result.get("roles", []) if roles_result.get("success") else [],
            "role_count": len(roles_result.get("roles", [])) if roles_result.get("success") else 0,
            "tasks": tasks_result.get("statistics", {}) if tasks_result.get("success") else {},
            "messages": {
                "total": len(messages_result.get("messages", [])) if messages_result.get("success") else 0,
                "recent": messages_result.get("messages", [])[:5] if messages_result.get("success") else []
            }
        }
        
        return {
            "success": True,
            "summary": summary
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get team summary: {str(e)}")

@router.get("/dashboard/{event_id}/{team_id}")
async def get_team_dashboard(
    event_id: str,
    team_id: str,
    student: Student = Depends(require_student_login)
):
    """Get team dashboard data"""
    try:
        # Get user's tasks
        my_tasks = await team_service.get_team_tasks(event_id, team_id, student.enrollment_no)
        
        # Get user's role
        roles_result = await team_service.get_team_roles(event_id, team_id)
        user_role = None
        if roles_result.get("success"):
            for role in roles_result.get("roles", []):
                if role.get("enrollment_no") == student.enrollment_no:
                    user_role = role
                    break
        
        # Get recent messages
        messages_result = await team_service.get_team_messages(event_id, team_id, student.enrollment_no)
        recent_messages = []
        if messages_result.get("success"):
            recent_messages = messages_result.get("messages", [])[:5]
        
        # Compile dashboard data
        dashboard = {
            "user_role": user_role,
            "my_tasks": {
                "statistics": my_tasks.get("statistics", {}) if my_tasks.get("success") else {},
                "tasks": my_tasks.get("tasks", [])[:10] if my_tasks.get("success") else []
            },
            "recent_messages": recent_messages,
            "notifications": []  # Placeholder for future notifications
        }
        
        return {
            "success": True,
            "dashboard": dashboard
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get team dashboard: {str(e)}")
