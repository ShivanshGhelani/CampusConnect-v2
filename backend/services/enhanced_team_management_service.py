#!/usr/bin/env python3
"""
Enhanced Team Management Service
Comprehensive team management with roles, tasks, communication, and reporting
"""

import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from database.operations import DatabaseOperations
from models.team_management import (
    TeamTask, TaskStatus, TaskPriority, TeamRole, TeamRoleAssignment, 
    TeamMessage, TeamPerformanceReport,
    TEAM_TASKS_COLLECTION, TEAM_ROLE_ASSIGNMENTS_COLLECTION,
    TEAM_MESSAGES_COLLECTION, TEAM_REPORTS_COLLECTION
)
from core.logger import logger
import json
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from io import BytesIO
import base64

class EnhancedTeamManagementService:
    """Enhanced team management service with full feature set"""
    
    def __init__(self):
        self.logger = logger
    
    # ============ ROLE MANAGEMENT ============
    
    async def assign_role(self, event_id: str, team_id: str, enrollment_no: str, 
                         role: TeamRole, custom_role_name: str = None, 
                         role_description: str = None, assigned_by: str = None) -> Dict[str, Any]:
        """Assign a role to a team member"""
        try:
            # Validate team membership
            if not await self._validate_team_membership(event_id, team_id, enrollment_no):
                return {"success": False, "message": "Student is not a member of this team"}
            
            # Generate assignment ID
            assignment_id = f"ROLE_{uuid.uuid4().hex[:8].upper()}"
            
            # Check if user already has a role for this team
            existing_assignment = await DatabaseOperations.find_one(
                TEAM_ROLE_ASSIGNMENTS_COLLECTION,
                {
                    "event_id": event_id,
                    "team_id": team_id,
                    "enrollment_no": enrollment_no,
                    "is_active": True
                }
            )
            
            # Deactivate existing role if any
            if existing_assignment:
                await DatabaseOperations.update_one(
                    TEAM_ROLE_ASSIGNMENTS_COLLECTION,
                    {"assignment_id": existing_assignment["assignment_id"]},
                    {"$set": {"is_active": False}}
                )
            
            # Create new role assignment
            assignment = TeamRoleAssignment(
                assignment_id=assignment_id,
                event_id=event_id,
                team_id=team_id,
                enrollment_no=enrollment_no,
                role=role,
                custom_role_name=custom_role_name if role == TeamRole.CUSTOM else None,
                role_description=role_description,
                assigned_by=assigned_by or enrollment_no
            )
            
            # Save to database
            await DatabaseOperations.insert_one(
                TEAM_ROLE_ASSIGNMENTS_COLLECTION,
                assignment.dict()
            )
            
            self.logger.info(f"Role assigned: {role.value} to {enrollment_no} in team {team_id}")
            
            return {
                "success": True,
                "message": "Role assigned successfully",
                "assignment_id": assignment_id,
                "role": role.value,
                "custom_role_name": custom_role_name
            }
            
        except Exception as e:
            self.logger.error(f"Error assigning role: {str(e)}")
            return {"success": False, "message": f"Failed to assign role: {str(e)}"}
    
    async def get_team_roles(self, event_id: str, team_id: str) -> Dict[str, Any]:
        """Get all role assignments for a team"""
        try:
            assignments = await DatabaseOperations.find_many(
                TEAM_ROLE_ASSIGNMENTS_COLLECTION,
                {
                    "event_id": event_id,
                    "team_id": team_id,
                    "is_active": True
                }
            )
            
            # Get student details for each assignment
            role_data = []
            for assignment in assignments:
                student = await DatabaseOperations.find_one(
                    "students",
                    {"enrollment_no": assignment["enrollment_no"]}
                )
                
                role_info = {
                    "assignment_id": assignment["assignment_id"],
                    "enrollment_no": assignment["enrollment_no"],
                    "student_name": student.get("full_name", "Unknown") if student else "Unknown",
                    "role": assignment["role"],
                    "custom_role_name": assignment.get("custom_role_name"),
                    "role_description": assignment.get("role_description"),
                    "assigned_at": assignment["assigned_at"],
                    "assigned_by": assignment["assigned_by"]
                }
                role_data.append(role_info)
            
            return {
                "success": True,
                "roles": role_data,
                "total_assignments": len(role_data)
            }
            
        except Exception as e:
            self.logger.error(f"Error getting team roles: {str(e)}")
            return {"success": False, "message": f"Failed to get team roles: {str(e)}"}
    
    # ============ TASK MANAGEMENT ============
    
    async def create_task(self, event_id: str, team_id: str, title: str, 
                         description: str = None, priority: TaskPriority = TaskPriority.MEDIUM,
                         assigned_to: List[str] = None, due_date: datetime = None,
                         created_by: str = None) -> Dict[str, Any]:
        """Create a new team task"""
        try:
            # Generate task ID
            task_id = f"TASK_{uuid.uuid4().hex[:8].upper()}"
            
            # Validate assigned members are in team
            if assigned_to:
                for enrollment in assigned_to:
                    if not await self._validate_team_membership(event_id, team_id, enrollment):
                        return {"success": False, "message": f"Student {enrollment} is not a member of this team"}
            
            # Create task
            task = TeamTask(
                task_id=task_id,
                event_id=event_id,
                team_id=team_id,
                title=title,
                description=description,
                priority=priority,
                assigned_to=assigned_to or [],
                created_by=created_by,
                due_date=due_date
            )
            
            # Save to database
            await DatabaseOperations.insert_one(
                TEAM_TASKS_COLLECTION,
                task.dict()
            )
            
            self.logger.info(f"Task created: {task_id} for team {team_id}")
            
            return {
                "success": True,
                "message": "Task created successfully",
                "task_id": task_id,
                "task": task.dict()
            }
            
        except Exception as e:
            self.logger.error(f"Error creating task: {str(e)}")
            return {"success": False, "message": f"Failed to create task: {str(e)}"}
    
    async def assign_task(self, task_id: str, assigned_to: List[str], 
                         assigned_by: str = None) -> Dict[str, Any]:
        """Assign task to team members"""
        try:
            # Get task
            task = await DatabaseOperations.find_one(
                TEAM_TASKS_COLLECTION,
                {"task_id": task_id}
            )
            
            if not task:
                return {"success": False, "message": "Task not found"}
            
            # Validate assigned members are in team
            for enrollment in assigned_to:
                if not await self._validate_team_membership(task["event_id"], task["team_id"], enrollment):
                    return {"success": False, "message": f"Student {enrollment} is not a member of this team"}
            
            # Update task assignment
            await DatabaseOperations.update_one(
                TEAM_TASKS_COLLECTION,
                {"task_id": task_id},
                {
                    "$set": {
                        "assigned_to": assigned_to,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            self.logger.info(f"Task {task_id} assigned to {len(assigned_to)} members")
            
            return {
                "success": True,
                "message": "Task assigned successfully",
                "assigned_to": assigned_to
            }
            
        except Exception as e:
            self.logger.error(f"Error assigning task: {str(e)}")
            return {"success": False, "message": f"Failed to assign task: {str(e)}"}
    
    async def update_task_status(self, task_id: str, status: TaskStatus, 
                                completed_by: str = None, progress: int = None) -> Dict[str, Any]:
        """Update task status and progress"""
        try:
            update_data = {
                "status": status.value,
                "updated_at": datetime.utcnow()
            }
            
            if progress is not None:
                update_data["progress_percentage"] = max(0, min(100, progress))
            
            if status == TaskStatus.COMPLETED:
                update_data["completed_at"] = datetime.utcnow()
                update_data["completed_by"] = completed_by
                update_data["progress_percentage"] = 100
            
            # Update task
            result = await DatabaseOperations.update_one(
                TEAM_TASKS_COLLECTION,
                {"task_id": task_id},
                {"$set": update_data}
            )
            
            if not result:
                return {"success": False, "message": "Task not found"}
            
            self.logger.info(f"Task {task_id} status updated to {status.value}")
            
            return {
                "success": True,
                "message": "Task status updated successfully",
                "status": status.value,
                "progress": update_data.get("progress_percentage")
            }
            
        except Exception as e:
            self.logger.error(f"Error updating task status: {str(e)}")
            return {"success": False, "message": f"Failed to update task status: {str(e)}"}
    
    async def get_team_tasks(self, event_id: str, team_id: str, 
                            assigned_to: str = None) -> Dict[str, Any]:
        """Get team tasks with optional filtering by assignee"""
        try:
            query = {
                "event_id": event_id,
                "team_id": team_id
            }
            
            if assigned_to:
                query["assigned_to"] = {"$in": [assigned_to]}
            
            tasks = await DatabaseOperations.find_many(
                TEAM_TASKS_COLLECTION,
                query,
                sort_by=[("created_at", -1)]
            )
            
            # Enhance tasks with student details
            enhanced_tasks = []
            for task in tasks:
                # Get assigned student details
                assigned_students = []
                for enrollment in task.get("assigned_to", []):
                    student = await DatabaseOperations.find_one(
                        "students",
                        {"enrollment_no": enrollment}
                    )
                    if student:
                        assigned_students.append({
                            "enrollment_no": enrollment,
                            "name": student.get("full_name", "Unknown")
                        })
                
                # Get creator details
                creator = await DatabaseOperations.find_one(
                    "students",
                    {"enrollment_no": task["created_by"]}
                )
                
                task_data = {
                    **task,
                    "assigned_students": assigned_students,
                    "creator_name": creator.get("full_name", "Unknown") if creator else "Unknown"
                }
                enhanced_tasks.append(task_data)
            
            # Calculate task statistics
            stats = {
                "total_tasks": len(enhanced_tasks),
                "completed_tasks": len([t for t in enhanced_tasks if t["status"] == "completed"]),
                "in_progress_tasks": len([t for t in enhanced_tasks if t["status"] == "in_progress"]),
                "todo_tasks": len([t for t in enhanced_tasks if t["status"] == "todo"]),
                "overdue_tasks": len([
                    t for t in enhanced_tasks 
                    if t.get("due_date") and datetime.fromisoformat(t["due_date"].replace("Z", "")) < datetime.utcnow()
                    and t["status"] != "completed"
                ])
            }
            
            return {
                "success": True,
                "tasks": enhanced_tasks,
                "statistics": stats
            }
            
        except Exception as e:
            self.logger.error(f"Error getting team tasks: {str(e)}")
            return {"success": False, "message": f"Failed to get team tasks: {str(e)}"}
    
    # ============ COMMUNICATION ============
    
    async def post_message(self, event_id: str, team_id: str, sender_enrollment: str,
                          title: str, content: str, message_type: str = "announcement",
                          is_pinned: bool = False, recipients: List[str] = None) -> Dict[str, Any]:
        """Post a message to the team"""
        try:
            # Generate message ID
            message_id = f"MSG_{uuid.uuid4().hex[:8].upper()}"
            
            # Validate sender is team member
            if not await self._validate_team_membership(event_id, team_id, sender_enrollment):
                return {"success": False, "message": "You are not a member of this team"}
            
            # Create message
            message = TeamMessage(
                message_id=message_id,
                event_id=event_id,
                team_id=team_id,
                sender_enrollment=sender_enrollment,
                message_type=message_type,
                title=title,
                content=content,
                is_pinned=is_pinned,
                recipients=recipients or []
            )
            
            # Save to database
            await DatabaseOperations.insert_one(
                TEAM_MESSAGES_COLLECTION,
                message.dict()
            )
            
            self.logger.info(f"Message posted: {message_id} in team {team_id}")
            
            return {
                "success": True,
                "message": "Message posted successfully",
                "message_id": message_id
            }
            
        except Exception as e:
            self.logger.error(f"Error posting message: {str(e)}")
            return {"success": False, "message": f"Failed to post message: {str(e)}"}
    
    async def get_team_messages(self, event_id: str, team_id: str, 
                               recipient_enrollment: str = None) -> Dict[str, Any]:
        """Get team messages"""
        try:
            query = {
                "event_id": event_id,
                "team_id": team_id,
                "is_visible": True
            }
            
            # Filter by recipient if specified
            if recipient_enrollment:
                query["$or"] = [
                    {"recipients": {"$size": 0}},  # Messages for all team members
                    {"recipients": {"$in": [recipient_enrollment]}}  # Messages for specific recipient
                ]
            
            messages = await DatabaseOperations.find_many(
                TEAM_MESSAGES_COLLECTION,
                query,
                sort_by=[("is_pinned", -1), ("created_at", -1)]
            )
            
            # Enhance messages with sender details
            enhanced_messages = []
            for message in messages:
                sender = await DatabaseOperations.find_one(
                    "students",
                    {"enrollment_no": message["sender_enrollment"]}
                )
                
                message_data = {
                    **message,
                    "sender_name": sender.get("full_name", "Unknown") if sender else "Unknown"
                }
                enhanced_messages.append(message_data)
            
            return {
                "success": True,
                "messages": enhanced_messages,
                "total_messages": len(enhanced_messages)
            }
            
        except Exception as e:
            self.logger.error(f"Error getting team messages: {str(e)}")
            return {"success": False, "message": f"Failed to get team messages: {str(e)}"}
    
    # ============ REPORTING ============
    
    async def generate_team_report(self, event_id: str, team_id: str, 
                                  generated_by: str) -> Dict[str, Any]:
        """Generate comprehensive team performance report"""
        try:
            # Get team details
            team_details = await self._get_team_details(event_id, team_id)
            if not team_details:
                return {"success": False, "message": "Team not found"}
            
            # Collect all data
            role_assignments = await self.get_team_roles(event_id, team_id)
            task_data = await self.get_team_tasks(event_id, team_id)
            messages = await self.get_team_messages(event_id, team_id)
            
            # Generate report data
            report_data = await self._compile_report_data(
                event_id, team_id, team_details, role_assignments, task_data, messages
            )
            
            # Generate PDF
            pdf_base64 = await self._generate_pdf_report(report_data)
            
            # Save report metadata
            report_id = f"RPT_{uuid.uuid4().hex[:8].upper()}"
            report_record = TeamPerformanceReport(
                report_id=report_id,
                event_id=event_id,
                team_id=team_id,
                generated_by=generated_by,
                team_name=team_details["team_name"],
                team_leader=team_details["team_leader"]["enrollment_no"],
                total_members=team_details["total_members"],
                registration_summary=report_data["registration_summary"],
                attendance_summary=report_data["attendance_summary"],
                feedback_summary=report_data["feedback_summary"],
                certificate_summary=report_data["certificate_summary"],
                task_summary=report_data["task_summary"],
                role_distribution=report_data["role_distribution"],
                performance_metrics=report_data["performance_metrics"]
            )
            
            await DatabaseOperations.insert_one(
                TEAM_REPORTS_COLLECTION,
                report_record.dict()
            )
            
            self.logger.info(f"Team report generated: {report_id} for team {team_id}")
            
            return {
                "success": True,
                "message": "Team report generated successfully",
                "report_id": report_id,
                "pdf_data": pdf_base64,
                "report_data": report_data
            }
            
        except Exception as e:
            self.logger.error(f"Error generating team report: {str(e)}")
            return {"success": False, "message": f"Failed to generate team report: {str(e)}"}
    
    # ============ HELPER METHODS ============
    
    async def _validate_team_membership(self, event_id: str, team_id: str, enrollment_no: str) -> bool:
        """Validate if student is a member of the team"""
        try:
            # Check in event registrations
            event = await DatabaseOperations.find_one("events", {"event_id": event_id})
            if not event:
                return False
            
            registrations = event.get("registrations", {})
            for reg_data in registrations.values():
                if reg_data.get("team_registration_id") == team_id:
                    # Check if this is the team leader
                    if reg_data.get("student_data", {}).get("enrollment_no") == enrollment_no:
                        return True
                    
                    # Check if this is a team member
                    team_members = reg_data.get("student_data", {}).get("team_members", [])
                    for member in team_members:
                        if member.get("enrollment_no") == enrollment_no:
                            return True
            
            return False
            
        except Exception as e:
            self.logger.error(f"Error validating team membership: {str(e)}")
            return False
    
    async def _get_team_details(self, event_id: str, team_id: str) -> Optional[Dict[str, Any]]:
        """Get comprehensive team details"""
        try:
            event = await DatabaseOperations.find_one("events", {"event_id": event_id})
            if not event:
                return None
            
            registrations = event.get("registrations", {})
            for reg_data in registrations.values():
                if reg_data.get("team_registration_id") == team_id:
                    team_members = reg_data.get("student_data", {}).get("team_members", [])
                    return {
                        "team_id": team_id,
                        "team_name": reg_data.get("student_data", {}).get("team_name"),
                        "team_leader": reg_data.get("student_data", {}),
                        "team_members": team_members,
                        "total_members": 1 + len(team_members),
                        "registration_date": reg_data.get("registration_datetime")
                    }
            
            return None
            
        except Exception as e:
            self.logger.error(f"Error getting team details: {str(e)}")
            return None
    
    async def _compile_report_data(self, event_id: str, team_id: str, team_details: Dict,
                                  role_assignments: Dict, task_data: Dict, messages: Dict) -> Dict[str, Any]:
        """Compile comprehensive report data"""
        try:
            # Basic info
            basic_info = {
                "event_id": event_id,
                "team_id": team_id,
                "team_name": team_details["team_name"],
                "team_leader": team_details["team_leader"],
                "total_members": team_details["total_members"],
                "registration_date": team_details["registration_date"]
            }
            
            # Registration summary
            registration_summary = {
                "registered_members": team_details["total_members"],
                "registration_complete": True,
                "registration_date": team_details["registration_date"]
            }
            
            # Task summary
            if task_data.get("success"):
                task_stats = task_data.get("statistics", {})
                task_summary = {
                    "total_tasks": task_stats.get("total_tasks", 0),
                    "completed_tasks": task_stats.get("completed_tasks", 0),
                    "in_progress_tasks": task_stats.get("in_progress_tasks", 0),
                    "todo_tasks": task_stats.get("todo_tasks", 0),
                    "overdue_tasks": task_stats.get("overdue_tasks", 0),
                    "completion_rate": (
                        task_stats.get("completed_tasks", 0) / max(1, task_stats.get("total_tasks", 1)) * 100
                    )
                }
            else:
                task_summary = {"total_tasks": 0, "completed_tasks": 0, "completion_rate": 0}
            
            # Role distribution
            if role_assignments.get("success"):
                roles = role_assignments.get("roles", [])
                role_distribution = {}
                for role_info in roles:
                    role_name = role_info.get("custom_role_name") or role_info.get("role")
                    role_distribution[role_name] = role_distribution.get(role_name, 0) + 1
            else:
                role_distribution = {}
            
            # Performance metrics
            performance_metrics = {
                "team_activity_score": min(100, (
                    task_summary.get("completion_rate", 0) * 0.4 +
                    (len(messages.get("messages", [])) / max(1, team_details["total_members"])) * 10 +
                    len(role_distribution) * 5
                )),
                "collaboration_score": min(100, len(messages.get("messages", [])) * 2),
                "organization_score": min(100, len(role_distribution) * 20)
            }
            
            return {
                "basic_info": basic_info,
                "registration_summary": registration_summary,
                "attendance_summary": {"total_attended": 0, "attendance_rate": 0},  # Placeholder
                "feedback_summary": {"total_submitted": 0, "feedback_rate": 0},  # Placeholder
                "certificate_summary": {"total_earned": 0, "certificate_rate": 0},  # Placeholder
                "task_summary": task_summary,
                "role_distribution": role_distribution,
                "performance_metrics": performance_metrics,
                "communication_summary": {
                    "total_messages": len(messages.get("messages", [])),
                    "message_types": {}
                }
            }
            
        except Exception as e:
            self.logger.error(f"Error compiling report data: {str(e)}")
            return {}
    
    async def _generate_pdf_report(self, report_data: Dict[str, Any]) -> str:
        """Generate PDF report and return as base64 string"""
        try:
            buffer = BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4)
            styles = getSampleStyleSheet()
            story = []
            
            # Title
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=24,
                spaceAfter=30,
                alignment=1,  # Center alignment
                textColor=colors.HexColor('#2563eb')
            )
            
            story.append(Paragraph(f"Team Performance Report", title_style))
            story.append(Spacer(1, 20))
            
            # Team Info Section
            team_info = report_data.get("basic_info", {})
            story.append(Paragraph("Team Information", styles['Heading2']))
            
            team_data = [
                ["Team Name:", team_info.get("team_name", "N/A")],
                ["Team Leader:", team_info.get("team_leader", {}).get("full_name", "N/A")],
                ["Total Members:", str(team_info.get("total_members", 0))],
                ["Registration Date:", team_info.get("registration_date", "N/A")[:10] if team_info.get("registration_date") else "N/A"]
            ]
            
            team_table = Table(team_data, colWidths=[2*inch, 4*inch])
            team_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.grey),
                ('TEXTCOLOR', (0, 0), (0, -1), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
                ('BACKGROUND', (1, 0), (1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(team_table)
            story.append(Spacer(1, 20))
            
            # Task Performance Section
            task_summary = report_data.get("task_summary", {})
            story.append(Paragraph("Task Performance", styles['Heading2']))
            
            task_data = [
                ["Metric", "Value"],
                ["Total Tasks", str(task_summary.get("total_tasks", 0))],
                ["Completed Tasks", str(task_summary.get("completed_tasks", 0))],
                ["In Progress", str(task_summary.get("in_progress_tasks", 0))],
                ["To Do", str(task_summary.get("todo_tasks", 0))],
                ["Completion Rate", f"{task_summary.get('completion_rate', 0):.1f}%"]
            ]
            
            task_table = Table(task_data, colWidths=[3*inch, 3*inch])
            task_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(task_table)
            story.append(Spacer(1, 20))
            
            # Role Distribution Section
            role_distribution = report_data.get("role_distribution", {})
            if role_distribution:
                story.append(Paragraph("Role Distribution", styles['Heading2']))
                
                role_data = [["Role", "Members"]]
                for role, count in role_distribution.items():
                    role_data.append([role, str(count)])
                
                role_table = Table(role_data, colWidths=[4*inch, 2*inch])
                role_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                    ('FONTSIZE', (0, 0), (-1, -1), 10),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black)
                ]))
                
                story.append(role_table)
                story.append(Spacer(1, 20))
            
            # Performance Metrics Section
            metrics = report_data.get("performance_metrics", {})
            story.append(Paragraph("Performance Metrics", styles['Heading2']))
            
            metrics_data = [
                ["Metric", "Score"],
                ["Team Activity Score", f"{metrics.get('team_activity_score', 0):.1f}%"],
                ["Collaboration Score", f"{metrics.get('collaboration_score', 0):.1f}%"],
                ["Organization Score", f"{metrics.get('organization_score', 0):.1f}%"]
            ]
            
            metrics_table = Table(metrics_data, colWidths=[4*inch, 2*inch])
            metrics_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(metrics_table)
            
            # Build PDF
            doc.build(story)
            
            # Get PDF data and encode as base64
            pdf_data = buffer.getvalue()
            buffer.close()
            
            return base64.b64encode(pdf_data).decode('utf-8')
            
        except Exception as e:
            self.logger.error(f"Error generating PDF report: {str(e)}")
            return ""
