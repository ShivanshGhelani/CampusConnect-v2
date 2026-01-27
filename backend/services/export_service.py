"""
Export Service for generating various reports and documents
=========================================================
Handles PDF generation for sign sheets, reports, and other documents.
"""

import json
import logging
from datetime import datetime
import pytz
from typing import Dict, List, Any, Optional
from io import BytesIO
import base64

from database.operations import DatabaseOperations
from core.logger import get_logger

logger = get_logger(__name__)

class ExportService:
    """Service for generating export documents and reports"""
    
    def __init__(self):
        self.logger = logger
    
    async def generate_sign_sheet(self, event_id: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Generate sign sheet for event registrations
        
        Args:
            event_id: Event ID to generate sign sheet for
            options: Additional options for customization
            
        Returns:
            Dict containing HTML content and metadata
        """
        try:
            # Get event details
            event = await DatabaseOperations.find_one("events", {"event_id": event_id})
            if not event:
                raise ValueError(f"Event {event_id} not found")
            
            # Get registrations for the event
            registrations_data = await self._get_event_registrations(event_id)
            
            # Generate HTML content
            html_content = await self._generate_sign_sheet_html(event, registrations_data, options)
            
            return {
                "success": True,
                "html_content": html_content,
                "metadata": {
                    "event_id": event_id,
                    "event_name": event.get("event_name"),
                    "total_registrations": len(registrations_data),
                    "generated_at": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None).isoformat(),
                    "report_type": "sign_sheet"
                }
            }
            
        except Exception as e:
            self.logger.error(f"Error generating sign sheet for event {event_id}: {str(e)}")
            raise
    
    async def generate_attendance_report(self, event_id: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate attendance report for an event"""
        try:
            # Get event details
            event = await DatabaseOperations.find_one("events", {"event_id": event_id})
            if not event:
                raise ValueError(f"Event {event_id} not found")
            
            # Get attendance data
            attendance_data = await self._get_attendance_data(event_id)
            
            # Generate HTML content
            html_content = await self._generate_attendance_report_html(event, attendance_data, options)
            
            return {
                "success": True,
                "html_content": html_content,
                "metadata": {
                    "event_id": event_id,
                    "event_name": event.get("event_name"),
                    "total_participants": len(attendance_data),
                    "generated_at": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None).isoformat(),
                    "report_type": "attendance_report"
                }
            }
            
        except Exception as e:
            self.logger.error(f"Error generating attendance report for event {event_id}: {str(e)}")
            raise
    
    async def generate_feedback_report(self, event_id: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate feedback report for an event"""
        try:
            # Get event details
            event = await DatabaseOperations.find_one("events", {"event_id": event_id})
            if not event:
                raise ValueError(f"Event {event_id} not found")
            
            # Get feedback data
            feedback_data = await self._get_feedback_data(event_id)
            
            # Generate HTML content
            html_content = await self._generate_feedback_report_html(event, feedback_data, options)
            
            return {
                "success": True,
                "html_content": html_content,
                "metadata": {
                    "event_id": event_id,
                    "event_name": event.get("event_name"),
                    "total_responses": len(feedback_data),
                    "generated_at": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None).isoformat(),
                    "report_type": "feedback_report"
                }
            }
            
        except Exception as e:
            self.logger.error(f"Error generating feedback report for event {event_id}: {str(e)}")
            raise
    
    async def generate_budget_report(self, event_id: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate budget report for an event"""
        try:
            # Get event details
            event = await DatabaseOperations.find_one("events", {"event_id": event_id})
            if not event:
                raise ValueError(f"Event {event_id} not found")
            
            # Get financial data
            budget_data = await self._get_budget_data(event_id)
            
            # Generate HTML content
            html_content = await self._generate_budget_report_html(event, budget_data, options)
            
            return {
                "success": True,
                "html_content": html_content,
                "metadata": {
                    "event_id": event_id,
                    "event_name": event.get("event_name"),
                    "generated_at": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None).isoformat(),
                    "report_type": "budget_report"
                }
            }
            
        except Exception as e:
            self.logger.error(f"Error generating budget report for event {event_id}: {str(e)}")
            raise
    
    async def _get_event_registrations(self, event_id: str) -> List[Dict[str, Any]]:
        """Get all registrations for an event"""
        try:
            # First get the event to check target audience
            event = await DatabaseOperations.find_one("events", {"event_id": event_id})
            target_audience = event.get("target_audience", "all") if event else "all"
            
            all_registrations = []
            
            # Only get student registrations if target audience is student or all
            if target_audience in ["student", "all"]:
                # Get student registrations
                student_registrations = await DatabaseOperations.find_many(
                    "student_registrations",
                    {"event.event_id": event_id},
                    sort_by=[("registration.timestamp", 1)]
                )
                
                # Process student registrations
                for i, reg in enumerate(student_registrations):
                    try:
                        if not isinstance(reg, dict):
                            self.logger.error(f"Student registration {i} is not a dict: {type(reg)} - {reg}")
                            continue
                            
                        if reg.get("registration_type") == "team":
                            # Handle team registration
                            team_info = reg.get("team", {})
                            team_members = reg.get("team_members", [])
                            # Get the team registration_id from the parent document
                            team_registration_id = reg.get("registration_id", "N/A")
                            
                            for member in team_members:
                                student_info = member.get("student", {})
                                all_registrations.append({
                                    "id": student_info.get("enrollment_no", ""),
                                    "name": student_info.get("name", "Unknown"),
                                    "enrollment_no": student_info.get("enrollment_no", ""),
                                    "department": student_info.get("department", "Unknown"),
                                    "email": student_info.get("email", ""),
                                    "mobile": student_info.get("mobile_no", student_info.get("phone", "")),
                                    "phone": student_info.get("mobile_no", student_info.get("phone", "")),
                                    "semester": student_info.get("semester", ""),
                                    "type": "student",
                                    "registration_type": "team",
                                    "team_name": team_info.get("name", ""),
                                    "registration_id": team_registration_id,  # Add team registration ID to each member
                                    "is_team_leader": member.get("is_team_leader", False),
                                    "registration_timestamp": reg.get("registration", {}).get("timestamp"),
                                    "team_status": team_info.get("status", "pending"),  # Extract team status
                                    "status": team_info.get("status", "pending")  # For compatibility
                                })
                        else:
                            # Individual student registration
                            student_info = reg.get("student", {})
                            registration_info = reg.get("registration", {})
                            all_registrations.append({
                                "id": student_info.get("enrollment_no", ""),
                                "name": student_info.get("name", "Unknown"),
                                "enrollment_no": student_info.get("enrollment_no", ""),
                                "department": student_info.get("department", "Unknown"),
                                "email": student_info.get("email", ""),
                                "semester": student_info.get("semester", ""),
                                "type": "student",
                                "registration_type": "individual",
                                "registration_timestamp": registration_info.get("timestamp"),
                                "status": registration_info.get("status", "pending")  # Extract individual registration status
                            })
                    except Exception as e:
                        self.logger.error(f"Error processing student registration {i}: {e} - {reg}")
                        continue
            
            # Only get faculty registrations if target audience is faculty or all
            if target_audience in ["faculty", "all"]:
                # Get faculty registrations
                faculty_registrations = await DatabaseOperations.find_many(
                    "faculty_registrations", 
                    {"event.event_id": event_id},
                    sort_by=[("registration.timestamp", 1)]
                )
                
                # Process faculty registrations
                for i, reg in enumerate(faculty_registrations):
                    try:
                        if not isinstance(reg, dict):
                            self.logger.error(f"Faculty registration {i} is not a dict: {type(reg)} - {reg}")
                            continue
                            
                        faculty_info = reg.get("faculty", {})
                        registration_info = reg.get("registration", {})
                        all_registrations.append({
                            "id": faculty_info.get("employee_id", ""),
                            "name": faculty_info.get("name", "Unknown"),
                            "enrollment_no": faculty_info.get("employee_id", ""),
                            "department": faculty_info.get("department", "Unknown"),
                            "email": faculty_info.get("email", ""),
                            "designation": faculty_info.get("designation", ""),
                            "type": "faculty",
                            "registration_type": "individual",
                            "registration_timestamp": registration_info.get("timestamp"),
                            "registration_status": registration_info.get("status", "pending"),  # Extract faculty registration status
                            "status": registration_info.get("status", "pending")  # For compatibility
                        })
                    except Exception as e:
                        self.logger.error(f"Error processing faculty registration {i}: {e} - {reg}")
                        continue
            
            # Sort by name
            all_registrations.sort(key=lambda x: x.get("name", "").lower())
            
            self.logger.info(f"Retrieved {len(all_registrations)} registrations for event {event_id} (target audience: {target_audience})")
            return all_registrations
            
        except Exception as e:
            self.logger.error(f"Error getting registrations for event {event_id}: {str(e)}")
            raise
    
    async def _generate_sign_sheet_html(self, event: Dict[str, Any], registrations: List[Dict[str, Any]], options: Optional[Dict[str, Any]] = None) -> str:
        """Generate HTML content for sign sheet"""
        
        # Format event date and time
        def format_date(date_str):
            if not date_str:
                return "N/A"
            try:
                return datetime.fromisoformat(date_str.replace('Z', '+00:00')).strftime("%B %d, %Y")
            except:
                return date_str
        
        def format_time(time_str):
            if not time_str:
                return "N/A"
            try:
                return datetime.strptime(time_str, "%H:%M").strftime("%I:%M %p")
            except:
                return time_str
        
        event_date = format_date(event.get("start_date"))
        event_time = format_time(event.get("start_time"))
        venue = event.get("venue", "N/A")
        if event.get("mode") == "online":
            venue = "Online Event"
        elif event.get("mode") == "hybrid":
            venue = f"{venue} (Hybrid)"
        
        # Get number of empty rows from options
        empty_rows = options.get("include_empty_rows", 10) if options else 10
        
        # Separate individual and team registrations
        individual_registrations = [r for r in registrations if r.get('registration_type') != 'team']
        team_registrations = [r for r in registrations if r.get('registration_type') == 'team']
        
        # Group team members by team
        teams = {}
        for reg in team_registrations:
            team_name = reg.get('team_name', 'Unknown Team')
            if team_name not in teams:
                teams[team_name] = {
                    'members': [],
                    'registration_id': reg.get('registration_id', 'N/A')
                }
            teams[team_name]['members'].append(reg)
        
        # Generate registration rows for individuals
        registration_rows = ""
        row_counter = 1
        
        for reg in individual_registrations:
            # First column: Name and ID info (combined)
            name_cell = f"""
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">{reg.get('name', 'Unknown')}</div>
                <div style="font-size: 11px; color: #666; margin-bottom: 2px;">
                    {reg.get('type', 'student').title()} ID: {reg.get('enrollment_no', reg.get('id', 'N/A'))}
                </div>
            """
            
            # Add enrollment number for students (separate from ID)
            if reg.get('type') == 'student' and reg.get('enrollment_no'):
                name_cell += f'<div style="font-size: 10px; color: #888;">Enrollment: {reg.get("enrollment_no")}</div>'
            
            # Second column: Department and Email (combined)
            dept_cell = f"""
                <div style="font-size: 12px; margin-bottom: 3px; font-weight: 500;">{reg.get('department', 'Unknown')}</div>
                <div style="font-size: 10px; color: #666; word-break: break-all;">{reg.get('email', 'N/A')}</div>
            """
            
            # Add additional info for faculty
            if reg.get('type') == 'faculty' and reg.get('designation'):
                dept_cell += f'<div style="font-size: 9px; color: #0066cc; margin-top: 2px;">{reg.get("designation")}</div>'
            
            # Add semester info for students
            if reg.get('type') == 'student' and reg.get('semester'):
                dept_cell += f'<div style="font-size: 9px; color: #888; margin-top: 1px;">Semester: {reg.get("semester")}</div>'
            
            registration_rows += f"""
                <tr style="border-bottom: 1px solid #ddd; page-break-inside: avoid;">
                    <td style="padding: 15px 8px; text-align: center; width: 50px; font-weight: bold; border-right: 1px solid #ddd; vertical-align: top;">{row_counter}</td>
                    <td style="padding: 15px 8px; width: 280px; border-right: 1px solid #ddd; vertical-align: top;">{name_cell}</td>
                    <td style="padding: 15px 8px; width: 220px; border-right: 1px solid #ddd; vertical-align: top;">{dept_cell}</td>
                    <td style="padding: 15px 8px; width: 120px; border-right: 1px solid #ddd; background-color: #f8f9fa; vertical-align: top; min-height: 60px;"></td>
                </tr>
            """
            row_counter += 1
        
        # Generate team rows
        team_rows = ""
        for team_name, team_data in sorted(teams.items()):
            members = team_data['members']
            registration_id = team_data['registration_id']
            
            # Sort members to put leader first
            members.sort(key=lambda m: (not m.get('is_team_leader', False), m.get('name', '')))
            
            # Team header row
            team_rows += f"""
                <tr style="background-color: #e3f2fd; border: 2px solid #2196f3;">
                    <td colspan="4" style="padding: 12px 8px; font-weight: bold; font-size: 14px; color: #1565c0;">
                        <span style="margin-right: 10px;">👥 TEAM:</span>
                        <span style="font-size: 16px;">{team_name}</span>
                        <span style="margin-left: 15px; font-size: 11px; color: #666; font-weight: normal;">Registration ID: {registration_id}</span>
                        <span style="float: right; font-size: 12px; color: #666; font-weight: normal;">{len(members)} member(s)</span>
                    </td>
                </tr>
            """
            
            # Team member rows
            for member in members:
                leader_badge = '<span style="background: #ffd700; color: #000; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold; margin-left: 8px;">👑 LEADER</span>' if member.get('is_team_leader') else ''
                
                name_cell = f"""
                    <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">
                        {member.get('name', 'Unknown')}{leader_badge}
                    </div>
                    <div style="font-size: 11px; color: #666; margin-bottom: 2px;">
                        Enrollment: {member.get('enrollment_no', 'N/A')}
                    </div>
                """
                
                dept_cell = f"""
                    <div style="font-size: 12px; margin-bottom: 3px; font-weight: 500;">{member.get('department', 'Unknown')}</div>
                    <div style="font-size: 10px; color: #666; word-break: break-all;">{member.get('email', 'N/A')}</div>
                """
                
                if member.get('mobile') or member.get('phone'):
                    contact = member.get('mobile') or member.get('phone')
                    dept_cell += f'<div style="font-size: 10px; color: #666; margin-top: 2px;">📞 {contact}</div>'
                
                if member.get('semester'):
                    dept_cell += f'<div style="font-size: 9px; color: #888; margin-top: 1px;">Semester: {member.get("semester")}</div>'
                
                team_rows += f"""
                    <tr style="border-bottom: 1px solid #ddd; background-color: #f5f5f5; page-break-inside: avoid;">
                        <td style="padding: 15px 8px; text-align: center; width: 50px; font-weight: bold; border-right: 1px solid #ddd; vertical-align: top;">{row_counter}</td>
                        <td style="padding: 15px 8px; width: 280px; border-right: 1px solid #ddd; vertical-align: top;">{name_cell}</td>
                        <td style="padding: 15px 8px; width: 220px; border-right: 1px solid #ddd; vertical-align: top;">{dept_cell}</td>
                        <td style="padding: 15px 8px; width: 120px; border-right: 1px solid #ddd; background-color: #fff; vertical-align: top; min-height: 60px;"></td>
                    </tr>
                """
                row_counter += 1
        
        # Generate empty rows for additional attendees
        empty_rows_html = ""
        for i in range(1, empty_rows + 1):
            empty_rows_html += f"""
                <tr style="border-bottom: 1px solid #ddd; page-break-inside: avoid;">
                    <td style="padding: 15px 8px; text-align: center; border-right: 1px solid #ddd; color: #ccc; vertical-align: top;">{row_counter}</td>
                    <td style="padding: 15px 8px; border-right: 1px solid #ddd; vertical-align: top; min-height: 60px;"></td>
                    <td style="padding: 15px 8px; border-right: 1px solid #ddd; vertical-align: top;"></td>
                    <td style="padding: 15px 8px; background-color: #f8f9fa; vertical-align: top;"></td>
                </tr>
            """
            row_counter += 1
        
        # Count different participant types
        student_count = len([r for r in registrations if r.get('type') == 'student'])
        faculty_count = len([r for r in registrations if r.get('type') == 'faculty'])
        team_count = len(set([r.get('team_name') for r in registrations if r.get('team_name')]))
        
        # Generate HTML content
        html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Sign Sheet - {event.get('event_name', 'Event')}</title>
            <style>
                @page {{
                    size: A4;
                    margin: 0.5in;
                }}
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    margin: 0;
                    line-height: 1.4;
                    color: #333;
                    font-size: 14px;
                }}
                .header {{
                    text-align: center;
                    margin-bottom: 25px;
                    border-bottom: 3px solid #0066cc;
                    padding-bottom: 15px;
                    page-break-after: avoid;
                }}
                .header h1 {{
                    margin: 0;
                    color: #0066cc;
                    font-size: 26px;
                    font-weight: bold;
                    letter-spacing: 1px;
                }}
                .header h2 {{
                    margin: 8px 0 5px 0;
                    color: #333;
                    font-size: 20px;
                    font-weight: 600;
                }}
                .header .subtitle {{
                    color: #666;
                    font-size: 14px;
                    margin: 5px 0;
                }}
                .event-info {{
                    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                    padding: 20px;
                    border-radius: 10px;
                    margin-bottom: 20px;
                    border: 1px solid #dee2e6;
                    page-break-after: avoid;
                }}
                .event-info-grid {{
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                }}
                .event-info-item {{
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 0;
                }}
                .event-info-label {{
                    font-weight: bold;
                    color: #495057;
                    font-size: 13px;
                }}
                .event-info-value {{
                    color: #212529;
                    font-weight: 500;
                    text-align: right;
                    font-size: 13px;
                }}
                .stats {{
                    display: flex;
                    justify-content: space-around;
                    margin-bottom: 25px;
                    padding: 15px;
                    background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
                    border-radius: 8px;
                    border: 1px solid #90caf9;
                    page-break-after: avoid;
                }}
                .stat-item {{
                    text-align: center;
                }}
                .stat-number {{
                    font-size: 24px;
                    font-weight: bold;
                    color: #0066cc;
                    display: block;
                }}
                .stat-label {{
                    font-size: 12px;
                    color: #666;
                    margin-top: 4px;
                }}
                .signatures-table {{
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    border-radius: 8px;
                    overflow: hidden;
                }}
                .signatures-table th {{
                    background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
                    color: white;
                    padding: 15px 8px;
                    text-align: center;
                    font-weight: bold;
                    font-size: 14px;
                    border-bottom: 2px solid #004499;
                }}
                .signatures-table td {{
                    vertical-align: top;
                    border-right: 1px solid #ddd;
                }}
                .signatures-table tr:nth-child(even) {{
                    background-color: #f8f9fa;
                }}
                .signatures-table tr:hover {{
                    background-color: #e3f2fd;
                }}
                .footer {{
                    margin-top: 30px;
                    text-align: center;
                    font-size: 11px;
                    color: #666;
                    border-top: 2px solid #ddd;
                    padding-top: 20px;
                    page-break-inside: avoid;
                }}
                .footer .instructions {{
                    background: #fff3cd;
                    border: 1px solid #ffeaa7;
                    border-radius: 5px;
                    padding: 12px;
                    margin-bottom: 15px;
                    color: #856404;
                    font-size: 12px;
                    text-align: left;
                }}
                .footer .signature-line {{
                    margin-top: 20px;
                    padding-top: 15px;
                    border-top: 1px solid #ccc;
                }}
                @media print {{
                    body {{ 
                        margin: 0; 
                        font-size: 12px;
                    }}
                    .header {{ 
                        break-after: avoid; 
                        margin-bottom: 20px;
                    }}
                    .signatures-table {{ 
                        break-inside: avoid; 
                    }}
                    .signatures-table tr {{
                        break-inside: avoid;
                    }}
                    .footer {{
                        break-before: avoid;
                    }}
                    .stat-number {{
                        font-size: 20px;
                    }}
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>ATTENDANCE SIGN SHEET</h1>
                <h2>{event.get('event_name', 'Event Name')}</h2>
                <div class="subtitle">Please sign next to your name to confirm attendance</div>
            </div>
            
            <div class="event-info">
                <div class="event-info-grid">
                    <div class="event-info-item">
                        <span class="event-info-label">Event ID:</span>
                        <span class="event-info-value">{event.get('event_id', 'N/A')}</span>
                    </div>
                    <div class="event-info-item">
                        <span class="event-info-label">Date:</span>
                        <span class="event-info-value">{event_date}</span>
                    </div>
                    <div class="event-info-item">
                        <span class="event-info-label">Time:</span>
                        <span class="event-info-value">{event_time}</span>
                    </div>
                    <div class="event-info-item">
                        <span class="event-info-label">Venue:</span>
                        <span class="event-info-value">{venue}</span>
                    </div>
                    <div class="event-info-item">
                        <span class="event-info-label">Event Type:</span>
                        <span class="event-info-value">{event.get('event_type', 'N/A').title()}</span>
                    </div>
                    <div class="event-info-item">
                        <span class="event-info-label">Mode:</span>
                        <span class="event-info-value">{event.get('mode', 'N/A').title()}</span>
                    </div>
                </div>
            </div>
            
            <div class="stats">
                <div class="stat-item">
                    <span class="stat-number">{len(registrations)}</span>
                    <div class="stat-label">Total Registered</div>
                </div>
                <div class="stat-item">
                    <span class="stat-number">{student_count}</span>
                    <div class="stat-label">Students</div>
                </div>
                <div class="stat-item">
                    <span class="stat-number">{faculty_count}</span>
                    <div class="stat-label">Faculty</div>
                </div>
                {f'<div class="stat-item"><span class="stat-number">{team_count}</span><div class="stat-label">Teams</div></div>' if team_count > 0 else ''}
                <div class="stat-item">
                    <span class="stat-number">____</span>
                    <div class="stat-label">Present</div>
                </div>
            </div>
            
            <table class="signatures-table">
                <thead>
                    <tr>
                        <th style="width: 50px;">#</th>
                        <th style="width: 280px;">Name & ID</th>
                        <th style="width: 220px;">Department & Contact</th>
                        <th style="width: 120px;">Signature</th>
                    </tr>
                </thead>
                <tbody>
                    {registration_rows}
                    {team_rows}
                    {empty_rows_html}
                </tbody>
            </table>
            
            <div class="footer">
                <div class="instructions">
                    <strong>Instructions:</strong> 
                    <ul style="margin: 8px 0; padding-left: 20px; text-align: left;">
                        <li>Please sign clearly next to your name to confirm attendance</li>
                        <li>If your name is not listed, please add your details in the empty rows</li>
                        <li>Late arrivals should sign in the "Additional Attendees" section</li>
                        <li>Team leaders should ensure all team members sign individually</li>
                    </ul>
                </div>
                
                <div>
                    <strong>Report Details:</strong><br>
                    Generated on {datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None).strftime("%B %d, %Y at %I:%M %p UTC")} | CampusConnect Event Management System<br>
                    Document ID: SIGN-{event.get('event_id', 'UNKNOWN')}-{datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None).strftime("%Y%m%d")}
                </div>
                
                <div class="signature-line">
                    <div style="display: flex; justify-content: space-between; margin-top: 20px;">
                        <div style="text-align: center; width: 45%;">
                            <div style="border-top: 1px solid #333; padding-top: 5px; margin-top: 40px;">
                                <strong>Event Organizer Signature</strong><br>
                                <small>Date: ___________</small>
                            </div>
                        </div>
                        <div style="text-align: center; width: 45%;">
                            <div style="border-top: 1px solid #333; padding-top: 5px; margin-top: 40px;">
                                <strong>Faculty Coordinator Signature</strong><br>
                                <small>Date: ___________</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        return html_content
    
    async def _get_attendance_data(self, event_id: str) -> List[Dict[str, Any]]:
        """Get attendance data for an event from registrations"""
        try:
            # First get the event to check target audience
            event = await DatabaseOperations.find_one("events", {"event_id": event_id})
            target_audience = event.get("target_audience", "all") if event else "all"
            
            attendance_data = []
            
            # Only get student attendance if target audience is student or all
            if target_audience in ["student", "all"]:
                # Get student registrations with attendance data
                student_registrations = await DatabaseOperations.find_many(
                    "student_registrations",
                    {"event.event_id": event_id},
                )
                
                # Process student attendance
                for reg in student_registrations:
                    if reg.get("registration_type") == "team":
                        team_members = reg.get("team_members", [])
                        for member in team_members:
                            attendance = member.get("attendance", {})
                            if attendance.get("status") == "present" or attendance.get("percentage", 0) > 0:
                                student_info = member.get("student", {})
                                attendance_data.append({
                                    "id": student_info.get("enrollment_no", ""),
                                    "name": student_info.get("name", "Unknown"),
                                    "department": student_info.get("department", "Unknown"),
                                    "type": "student",
                                    "status": attendance.get("status", "absent"),
                                    "percentage": attendance.get("percentage", 0)
                                })
                    else:
                        # Individual student registration
                        attendance = reg.get("attendance", {})
                        if attendance.get("status") == "present" or attendance.get("percentage", 0) > 0:
                            student_info = reg.get("student", {})
                            attendance_data.append({
                                "id": student_info.get("enrollment_no", ""),
                                "name": student_info.get("name", "Unknown"),
                                "department": student_info.get("department", "Unknown"),
                                "type": "student",
                                "status": attendance.get("status", "absent"),
                                "percentage": attendance.get("percentage", 0)
                            })
            
            # Only get faculty attendance if target audience is faculty or all
            if target_audience in ["faculty", "all"]:
                # Get faculty registrations with attendance data
                faculty_registrations = await DatabaseOperations.find_many(
                    "faculty_registrations", 
                    {"event.event_id": event_id}
                )
                
                # Process faculty attendance
                for reg in faculty_registrations:
                    attendance = reg.get("attendance", {})
                    if attendance.get("status") == "present" or attendance.get("percentage", 0) > 0:
                        faculty_info = reg.get("faculty", {})
                        attendance_data.append({
                            "id": faculty_info.get("employee_id", ""),
                            "name": faculty_info.get("name", "Unknown"),
                            "department": faculty_info.get("department", "Unknown"),
                            "type": "faculty",
                            "status": attendance.get("status", "absent"),
                            "percentage": attendance.get("percentage", 0)
                        })
            
            self.logger.info(f"Retrieved {len(attendance_data)} attendance records for event {event_id} (target audience: {target_audience})")
            return attendance_data
            
        except Exception as e:
            self.logger.error(f"Error getting attendance data for event {event_id}: {str(e)}")
            return []
    
    async def _get_feedback_data(self, event_id: str) -> List[Dict[str, Any]]:
        """Get feedback data for an event from registrations"""
        try:
            # First get the event to check target audience
            event = await DatabaseOperations.find_one("events", {"event_id": event_id})
            target_audience = event.get("target_audience", "all") if event else "all"
            
            feedback_data = []
            
            # Only get student feedback if target audience is student or all
            if target_audience in ["student", "all"]:
                # Get student registrations with feedback data
                student_registrations = await DatabaseOperations.find_many(
                    "student_registrations",
                    {"event.event_id": event_id},
                )
                
                # Process student feedback
                for reg in student_registrations:
                    if reg.get("registration_type") == "team":
                        team_members = reg.get("team_members", [])
                        for member in team_members:
                            feedback = member.get("feedback", {})
                            if feedback.get("submitted"):
                                student_info = member.get("student", {})
                                feedback_data.append({
                                    "id": student_info.get("enrollment_no", ""),
                                    "name": student_info.get("name", "Unknown"),
                                    "type": "student",
                                    "rating": feedback.get("rating", 0),
                                    "comments": feedback.get("comments", ""),
                                    "submitted_at": feedback.get("submitted_at")
                                })
                    else:
                        # Individual student registration
                        feedback = reg.get("feedback", {})
                        if feedback.get("submitted"):
                            student_info = reg.get("student", {})
                            feedback_data.append({
                                "id": student_info.get("enrollment_no", ""),
                                "name": student_info.get("name", "Unknown"),
                                "type": "student", 
                                "rating": feedback.get("rating", 0),
                                "comments": feedback.get("comments", ""),
                                "submitted_at": feedback.get("submitted_at")
                            })
            
            # Only get faculty feedback if target audience is faculty or all
            if target_audience in ["faculty", "all"]:
                # Get faculty registrations with feedback data
                faculty_registrations = await DatabaseOperations.find_many(
                    "faculty_registrations", 
                    {"event.event_id": event_id}
                )
                
                # Process faculty feedback
                for reg in faculty_registrations:
                    feedback = reg.get("feedback", {})
                    if feedback.get("submitted"):
                        faculty_info = reg.get("faculty", {})
                        feedback_data.append({
                            "id": faculty_info.get("employee_id", ""),
                            "name": faculty_info.get("name", "Unknown"),
                            "type": "faculty",
                            "rating": feedback.get("rating", 0),
                            "comments": feedback.get("comments", ""),
                            "submitted_at": feedback.get("submitted_at")
                        })
            
            self.logger.info(f"Retrieved {len(feedback_data)} feedback records for event {event_id} (target audience: {target_audience})")
            return feedback_data
            
        except Exception as e:
            self.logger.error(f"Error getting feedback data for event {event_id}: {str(e)}")
            return []
    
    async def _get_budget_data(self, event_id: str) -> Dict[str, Any]:
        """Get budget data for an event"""
        # Implementation would depend on your budget tracking system
        # This is a placeholder
        return {}
    
    async def _generate_attendance_report_html(self, event: Dict[str, Any], attendance_data: List[Dict[str, Any]], options: Optional[Dict[str, Any]] = None) -> str:
        """Generate HTML for attendance report"""
        
        # Get full registrations data with attendance status
        registrations = await self._get_event_registrations(event['event_id'])
        
        # Add attendance status to registrations
        for reg in registrations:
            # Find matching attendance record by ID
            att_record = next((a for a in attendance_data if a.get('id') == reg.get('enrollment_no', reg.get('id'))), None)
            if att_record:
                reg['attendance_status'] = att_record.get('status', 'absent')
                reg['attendance_percentage'] = att_record.get('percentage', 0)
                reg['sessions_attended'] = att_record.get('sessions_attended', 0)
            else:
                reg['attendance_status'] = 'absent'
                reg['attendance_percentage'] = 0
                reg['sessions_attended'] = 0
        
        # Format event date and time
        def format_date(date_str):
            if not date_str:
                return "N/A"
            try:
                return datetime.fromisoformat(date_str.replace('Z', '+00:00')).strftime("%B %d, %Y")
            except:
                return date_str
        
        event_date = format_date(event.get("start_date"))
        venue = event.get("venue", "N/A")
        if event.get("mode") == "online":
            venue = "Online Event"
        elif event.get("mode") == "hybrid":
            venue = f"{venue} (Hybrid)"
        
        # Separate individual and team registrations
        individual_registrations = [r for r in registrations if r.get('registration_type') != 'team']
        team_registrations = [r for r in registrations if r.get('registration_type') == 'team']
        
        # Group team members by team
        teams = {}
        for reg in team_registrations:
            team_name = reg.get('team_name', 'Unknown Team')
            if team_name not in teams:
                teams[team_name] = {
                    'members': [],
                    'registration_id': reg.get('registration_id', 'N/A')
                }
            teams[team_name]['members'].append(reg)
        
        # Generate rows for individuals
        table_rows = ""
        row_counter = 1
        
        for reg in individual_registrations:
            status = reg.get('attendance_status', 'absent')
            percentage = reg.get('attendance_percentage', 0)
            sessions = reg.get('sessions_attended', 0)
            
            status_badge = {
                'present': '<span style="background: #16a34a; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">Present</span>',
                'partial': '<span style="background: #ca8a04; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">Partial</span>',
                'absent': '<span style="background: #dc2626; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">Absent</span>'
            }.get(status, status)
            
            table_rows += f"""
                <tr>
                    <td style="text-align: center;">{row_counter}</td>
                    <td>{reg.get('enrollment_no', reg.get('id', 'N/A'))}</td>
                    <td>{reg.get('registration_id', 'N/A')}</td>
                    <td>{reg.get('name', 'Unknown')}</td>
                    <td>{reg.get('department', 'Unknown')}</td>
                    <td>{reg.get('semester', reg.get('designation', 'N/A'))}</td>
                    <td>{status_badge}</td>
                    <td style="text-align: center;">{percentage}%</td>
                    <td style="text-align: center;">{sessions if sessions else '-'}</td>
                </tr>
            """
            row_counter += 1
        
        # Generate team rows
        team_rows = ""
        for team_name, team_data in sorted(teams.items()):
            members = team_data['members']
            registration_id = team_data['registration_id']
            
            # Calculate team statistics
            total_members = len(members)
            present_members = len([m for m in members if m.get('attendance_status') == 'present'])
            avg_percentage = sum([m.get('attendance_percentage', 0) for m in members]) / total_members if total_members > 0 else 0
            
            # Sort members to put leader first
            members.sort(key=lambda m: (not m.get('is_team_leader', False), m.get('name', '')))
            
            # Team header row
            team_rows += f"""
                <tr style="background-color: #e3f2fd; border: 2px solid #2196f3;">
                    <td colspan="9" style="padding: 12px 8px; font-weight: bold; font-size: 14px; color: #1565c0;">
                        <span style="margin-right: 10px;">👥 TEAM:</span>
                        <span style="font-size: 16px;">{team_name}</span>
                        <span style="margin-left: 15px; font-size: 11px; color: #666; font-weight: normal;">Registration ID: {registration_id}</span>
                        <span style="float: right; font-size: 12px; color: #666; font-weight: normal;">{present_members}/{total_members} Present • Avg: {avg_percentage:.1f}%</span>
                    </td>
                </tr>
            """
            
            # Team member rows
            for member in members:
                status = member.get('attendance_status', 'absent')
                percentage = member.get('attendance_percentage', 0)
                sessions = member.get('sessions_attended', 0)
                leader_badge = '<span style="background: #ffd700; color: #000; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold; margin-left: 8px;">👑 LEADER</span>' if member.get('is_team_leader') else ''
                
                status_badge = {
                    'present': '<span style="background: #16a34a; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">Present</span>',
                    'partial': '<span style="background: #ca8a04; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">Partial</span>',
                    'absent': '<span style="background: #dc2626; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">Absent</span>'
                }.get(status, status)
                
                team_rows += f"""
                    <tr style="background-color: #f5f5f5;">
                        <td style="text-align: center;">{row_counter}</td>
                        <td>{member.get('enrollment_no', 'N/A')}</td>
                        <td style="font-size: 10px; color: #666;">{registration_id}</td>
                        <td>{member.get('name', 'Unknown')}{leader_badge}</td>
                        <td>{member.get('department', 'Unknown')}</td>
                        <td>{member.get('semester', 'N/A')}</td>
                        <td>{status_badge}</td>
                        <td style="text-align: center;">{percentage}%</td>
                        <td style="text-align: center;">{sessions if sessions else '-'}</td>
                    </tr>
                """
                row_counter += 1
        
        # Calculate statistics
        total_registrations = len(registrations)
        present_count = len([r for r in registrations if r.get('attendance_status') == 'present'])
        partial_count = len([r for r in registrations if r.get('attendance_status') == 'partial'])
        absent_count = len([r for r in registrations if r.get('attendance_status') == 'absent'])
        attendance_percentage = round((present_count / total_registrations * 100) if total_registrations > 0 else 0, 1)
        
        # Generate simple HTML (templates are in frontend, backend generates basic structure)
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Attendance Report - {event.get('event_name', 'Event')}</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                h1 {{ color: #1f4e78; text-align: center; }}
                h2 {{ color: #3b82f6; text-align: center; }}
                .stats {{ display: flex; justify-content: space-around; margin: 20px 0; }}
                .stat-box {{ text-align: center; padding: 15px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 8px; }}
                .stat-number {{ font-size: 28px; font-weight: bold; color: #1f4e78; }}
                .stat-label {{ font-size: 12px; color: #6b7280; margin-top: 5px; }}
                table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
                th {{ background: #1f4e78; color: white; padding: 10px; text-align: left; font-size: 11px; }}
                td {{ border: 1px solid #d1d5db; padding: 8px; font-size: 10px; }}
                tr:nth-child(even) {{ background: #f9fafb; }}
            </style>
        </head>
        <body>
            <h1>Attendance Report</h1>
            <h2>{event.get('event_name', 'Event Name')}</h2>
            <p style="text-align: center; color: #666;">Generated on: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}</p>
            
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 15px; margin: 20px 0; border-radius: 8px;">
                <strong>Event Details:</strong><br>
                <strong>Event ID:</strong> {event.get('event_id', 'N/A')}<br>
                <strong>Date:</strong> {event_date}<br>
                <strong>Venue:</strong> {venue}<br>
                <strong>Strategy:</strong> {event.get('attendance_strategy', {}).get('strategy_type', 'N/A').replace('_', ' ').title()}
            </div>
            
            <div class="stats">
                <div class="stat-box">
                    <div class="stat-number">{total_registrations}</div>
                    <div class="stat-label">Total Registrations</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number" style="color: #16a34a;">{present_count}</div>
                    <div class="stat-label">Present</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number" style="color: #ca8a04;">{partial_count}</div>
                    <div class="stat-label">Partial</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number" style="color: #dc2626;">{absent_count}</div>
                    <div class="stat-label">Absent</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number" style="color: #2563eb;">{attendance_percentage}%</div>
                    <div class="stat-label">Attendance Rate</div>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th style="width: 5%;">#</th>
                        <th style="width: 12%;">ID</th>
                        <th style="width: 15%;">Registration ID</th>
                        <th style="width: 20%;">Name</th>
                        <th style="width: 15%;">Department</th>
                        <th style="width: 10%;">Sem/Desig</th>
                        <th style="width: 10%;">Status</th>
                        <th style="width: 8%;">%</th>
                        <th style="width: 10%;">Sessions</th>
                    </tr>
                </thead>
                <tbody>
                    {table_rows}
                    {team_rows}
                </tbody>
            </table>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #1f4e78; text-align: center; font-size: 11px; color: #666;">
                <p>This report was generated automatically by CampusConnect Event Management System</p>
                <p>© {datetime.now().year} - All Rights Reserved</p>
            </div>
        </body>
        </html>
        """
        
        return html
    
    async def _generate_feedback_report_html(self, event: Dict[str, Any], feedback_data: List[Dict[str, Any]], options: Optional[Dict[str, Any]] = None) -> str:
        """Generate HTML for feedback report"""
        # Placeholder implementation
        return "<html><body><h1>Feedback Report</h1><p>Coming soon...</p></body></html>"
    
    async def _generate_budget_report_html(self, event: Dict[str, Any], budget_data: Dict[str, Any], options: Optional[Dict[str, Any]] = None) -> str:
        """Generate HTML for budget report"""
        # Placeholder implementation
        return "<html><body><h1>Budget Report</h1><p>Coming soon...</p></body></html>"

# Create singleton instance
export_service = ExportService()
