"""
Export Service for generating various reports and documents
=========================================================
Handles PDF generation for sign sheets, reports, and other documents.
"""

import json
import logging
from datetime import datetime
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
    
    async def generate_sign_sheet(self, event_id: str, options: Dict[str, Any] = None) -> Dict[str, Any]:
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
                    "generated_at": datetime.utcnow().isoformat(),
                    "report_type": "sign_sheet"
                }
            }
            
        except Exception as e:
            self.logger.error(f"Error generating sign sheet for event {event_id}: {str(e)}")
            raise
    
    async def generate_attendance_report(self, event_id: str, options: Dict[str, Any] = None) -> Dict[str, Any]:
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
                    "generated_at": datetime.utcnow().isoformat(),
                    "report_type": "attendance_report"
                }
            }
            
        except Exception as e:
            self.logger.error(f"Error generating attendance report for event {event_id}: {str(e)}")
            raise
    
    async def generate_feedback_report(self, event_id: str, options: Dict[str, Any] = None) -> Dict[str, Any]:
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
                    "generated_at": datetime.utcnow().isoformat(),
                    "report_type": "feedback_report"
                }
            }
            
        except Exception as e:
            self.logger.error(f"Error generating feedback report for event {event_id}: {str(e)}")
            raise
    
    async def generate_budget_report(self, event_id: str, options: Dict[str, Any] = None) -> Dict[str, Any]:
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
                    "generated_at": datetime.utcnow().isoformat(),
                    "report_type": "budget_report"
                }
            }
            
        except Exception as e:
            self.logger.error(f"Error generating budget report for event {event_id}: {str(e)}")
            raise
    
    async def generate_event_report(self, event_id: str, options: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Generate comprehensive event report with all details
        
        Args:
            event_id: Event ID to generate report for
            options: Additional options including event_images and event_outcomes
            
        Returns:
            Dict containing HTML content and metadata
        """
        try:
            # Get event details
            event = await DatabaseOperations.find_one("events", {"event_id": event_id})
            if not event:
                raise ValueError(f"Event {event_id} not found")
                
            self.logger.info(f"Event data type: {type(event)}, has get: {hasattr(event, 'get')}")
            
            # Get registrations and attendance data
            try:
                registrations = await self._get_event_registrations(event_id)
                self.logger.info(f"Registrations retrieved: {len(registrations)}")
            except Exception as e:
                self.logger.error(f"Error getting registrations: {e}")
                raise
                
            try:
                attendance_data = await self._get_attendance_data(event_id)
                self.logger.info(f"Attendance data retrieved: {len(attendance_data)}")
            except Exception as e:
                self.logger.error(f"Error getting attendance data: {e}")
                raise
                
            try:
                feedback_data = await self._get_feedback_data(event_id)
                self.logger.info(f"Feedback data retrieved: {len(feedback_data)}")
            except Exception as e:
                self.logger.error(f"Error getting feedback data: {e}")
                raise
            
            self.logger.info(f"All data retrieved successfully")
            
            # Generate HTML content
            try:
                html_content = await self._generate_event_report_html(
                    event, registrations, attendance_data, feedback_data, options
                )
                self.logger.info("HTML content generated successfully")
            except Exception as e:
                self.logger.error(f"Error generating HTML content: {e}")
                raise
            
            return {
                "success": True,
                "html_content": html_content,
                "metadata": {
                    "event_id": event_id,
                    "event_name": event.get("event_name"),
                    "generated_at": datetime.utcnow().isoformat(),
                    "report_type": "event_report",
                    "includes_images": bool(options and options.get("event_images")),
                    "includes_outcomes": bool(options and options.get("event_outcomes"))
                }
            }
            
        except Exception as e:
            self.logger.error(f"Error generating event report for event {event_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "html_content": None,
                "metadata": None
            }
    
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
                            
                            for member in team_members:
                                student_info = member.get("student", {})
                                all_registrations.append({
                                    "id": student_info.get("enrollment_no", ""),
                                    "name": student_info.get("name", "Unknown"),
                                    "enrollment_no": student_info.get("enrollment_no", ""),
                                    "department": student_info.get("department", "Unknown"),
                                    "email": student_info.get("email", ""),
                                    "semester": student_info.get("semester", ""),
                                    "type": "student",
                                    "registration_type": "team",
                                    "team_name": team_info.get("name", ""),
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
    
    async def _generate_sign_sheet_html(self, event: Dict[str, Any], registrations: List[Dict[str, Any]], options: Dict[str, Any] = None) -> str:
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
        
        # Generate registration rows
        registration_rows = ""
        for i, reg in enumerate(registrations, 1):
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
            
            # Add team info if applicable
            if reg.get('registration_type') == 'team' and reg.get('team_name'):
                team_badge = "👑 Leader" if reg.get('is_team_leader') else "👥 Member"
                dept_cell += f'<div style="font-size: 9px; color: #0066cc; margin-top: 2px; font-weight: bold;">Team: {reg.get("team_name")} ({team_badge})</div>'
            
            # Add semester info for students
            if reg.get('type') == 'student' and reg.get('semester'):
                dept_cell += f'<div style="font-size: 9px; color: #888; margin-top: 1px;">Semester: {reg.get("semester")}</div>'
            
            registration_rows += f"""
                <tr style="border-bottom: 1px solid #ddd; page-break-inside: avoid;">
                    <td style="padding: 15px 8px; text-align: center; width: 50px; font-weight: bold; border-right: 1px solid #ddd; vertical-align: top;">{i}</td>
                    <td style="padding: 15px 8px; width: 280px; border-right: 1px solid #ddd; vertical-align: top;">{name_cell}</td>
                    <td style="padding: 15px 8px; width: 220px; border-right: 1px solid #ddd; vertical-align: top;">{dept_cell}</td>
                    <td style="padding: 15px 8px; width: 120px; border-right: 1px solid #ddd; background-color: #f8f9fa; vertical-align: top; min-height: 60px;"></td>
                </tr>
            """
        
        # Generate empty rows for additional attendees
        empty_rows_html = ""
        for i in range(1, empty_rows + 1):
            empty_rows_html += f"""
                <tr style="border-bottom: 1px solid #ddd; page-break-inside: avoid;">
                    <td style="padding: 15px 8px; text-align: center; border-right: 1px solid #ddd; color: #ccc; vertical-align: top;">{len(registrations) + i}</td>
                    <td style="padding: 15px 8px; border-right: 1px solid #ddd; vertical-align: top; min-height: 60px;"></td>
                    <td style="padding: 15px 8px; border-right: 1px solid #ddd; vertical-align: top;"></td>
                    <td style="padding: 15px 8px; background-color: #f8f9fa; vertical-align: top;"></td>
                </tr>
            """
        
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
                    Generated on {datetime.utcnow().strftime("%B %d, %Y at %I:%M %p UTC")} | CampusConnect Event Management System<br>
                    Document ID: SIGN-{event.get('event_id', 'UNKNOWN')}-{datetime.utcnow().strftime("%Y%m%d")}
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
    
    async def _generate_attendance_report_html(self, event: Dict[str, Any], attendance_data: List[Dict[str, Any]], options: Dict[str, Any] = None) -> str:
        """Generate HTML for attendance report"""
        # Placeholder implementation
        return "<html><body><h1>Attendance Report</h1><p>Coming soon...</p></body></html>"
    
    async def _generate_feedback_report_html(self, event: Dict[str, Any], feedback_data: List[Dict[str, Any]], options: Dict[str, Any] = None) -> str:
        """Generate HTML for feedback report"""
        # Placeholder implementation
        return "<html><body><h1>Feedback Report</h1><p>Coming soon...</p></body></html>"
    
    async def _generate_budget_report_html(self, event: Dict[str, Any], budget_data: Dict[str, Any], options: Dict[str, Any] = None) -> str:
        """Generate HTML for budget report"""
        # Placeholder implementation
        return "<html><body><h1>Budget Report</h1><p>Coming soon...</p></body></html>"
    
    async def _generate_event_report_html(self, event: Dict[str, Any], registrations: List[Dict[str, Any]], 
                                        attendance_data: List[Dict[str, Any]], feedback_data: List[Dict[str, Any]], 
                                        options: Dict[str, Any] = None) -> str:
        """Generate HTML content for comprehensive event report"""
        
        print("DEBUG: Function started")
        self.logger.info(f"Starting HTML generation - event type: {type(event)}, has get: {hasattr(event, 'get')}")
        
        # Validate that event is a dictionary
        if not isinstance(event, dict):
            raise ValueError(f"Event must be a dictionary, got {type(event)}: {event}")
        
        print("DEBUG: Event validation passed")
        self.logger.info(f"Event validation passed: {event.get('event_name', 'Unknown')}")
        
        # Read the event report template
        try:
            # Use absolute path from project root
            import os
            current_dir = os.path.dirname(__file__)  # services directory
            backend_dir = os.path.dirname(current_dir)  # backend directory
            project_root = os.path.dirname(backend_dir)  # project root
            template_path = os.path.join(project_root, "frontend", "public", "templates", "event_report.html")
            self.logger.info(f"Loading template from: {template_path}")
            
            with open(template_path, "r", encoding="utf-8") as f:
                template = f.read()
            self.logger.info("Template loaded successfully from file")
        except FileNotFoundError as e:
            self.logger.warning(f"Template file not found: {e}, using fallback")
            # Fallback template if file not found
            template = self._get_fallback_event_report_template()
        except Exception as e:
            self.logger.error(f"Error loading template: {e}, using fallback")
            template = self._get_fallback_event_report_template()
        
        # Helper functions
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
        
        self.logger.info("Helper functions defined")
        
        # Calculate registration statistics
        try:
            total_regs = len(registrations)
            self.logger.info(f"Processing registrations: {total_regs} total")
            
            # Check if all registrations are dictionaries
            for i, r in enumerate(registrations):
                if not isinstance(r, dict):
                    self.logger.error(f"Registration {i} is not a dict: {type(r)} - {r}")
                    raise ValueError(f"Registration {i} is not a dictionary: {type(r)}")
            
            # Fix registration status calculation - status is nested under 'registration.status' for faculty
            confirmed_regs = 0
            pending_regs = 0
            cancelled_regs = 0
            
            for r in registrations:
                # For faculty registrations, status is in registration.status
                # For student registrations in teams, status is in team.status
                if r.get('type') == 'faculty':
                    # Faculty registrations have status in 'registration.status'
                    status = r.get('registration_status', 'pending')  # This will be set in _get_event_registrations
                elif r.get('type') == 'student' and r.get('registration_type') == 'team':
                    # Team registrations have status in 'team.status'
                    status = r.get('team_status', 'pending')  # This will be set in _get_event_registrations
                else:
                    # Individual student registrations
                    status = r.get('status', 'pending')
                
                if status == 'confirmed':
                    confirmed_regs += 1
                elif status == 'pending':
                    pending_regs += 1
                elif status == 'cancelled':
                    cancelled_regs += 1
            
            student_count = len([r for r in registrations if r.get('type') == 'student'])
            faculty_count = len([r for r in registrations if r.get('type') == 'faculty'])
            
            self.logger.info("Registration statistics calculated successfully")
        except Exception as e:
            self.logger.error(f"Error calculating registration statistics: {e}")
            raise
        
        # Calculate attendance statistics
        try:
            print(f"DEBUG: Processing attendance data: {len(attendance_data)} items")
            total_attendees = len(attendance_data)
            attendance_rate = int((total_attendees / total_regs * 100)) if total_regs > 0 else 0
            student_attendees = len([a for a in attendance_data if isinstance(a, dict) and a.get('type') == 'student'])
            faculty_attendees = len([a for a in attendance_data if isinstance(a, dict) and a.get('type') == 'faculty'])
            print("DEBUG: Attendance statistics calculated")
        except Exception as e:
            self.logger.error(f"Error calculating attendance statistics: {e}")
            raise
        
        # Calculate feedback statistics
        try:
            print(f"DEBUG: Processing feedback data: {len(feedback_data)} items")
            total_feedback = len(feedback_data)
            avg_rating = sum([f.get('rating', 0) for f in feedback_data if isinstance(f, dict)]) / total_feedback if total_feedback > 0 else 0
            rating_stars = "★" * int(avg_rating) + "☆" * (5 - int(avg_rating))
            print("DEBUG: Feedback statistics calculated")
        except Exception as e:
            self.logger.error(f"Error calculating feedback statistics: {e}")
            raise
        
        # Generate registration breakdown table
        try:
            print("DEBUG: Starting registration breakdown")
            reg_breakdown = """
            <table class="table">
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>Confirmed</th>
                        <th>Pending</th>
                        <th>Cancelled</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Students</td>
                        <td>{}</td>
                        <td>{}</td>
                        <td>{}</td>
                        <td>{}</td>
                    </tr>
                    <tr>
                        <td>Faculty</td>
                        <td>{}</td>
                        <td>{}</td>
                        <td>{}</td>
                        <td>{}</td>
                    </tr>
                </tbody>
            </table>
            """.format(
                len([r for r in registrations if r.get('type') == 'student' and r.get('status') == 'confirmed']),
                len([r for r in registrations if r.get('type') == 'student' and r.get('status') == 'pending']),
                len([r for r in registrations if r.get('type') == 'student' and r.get('status') == 'cancelled']),
                student_count,
                len([r for r in registrations if r.get('type') == 'faculty' and r.get('status') == 'confirmed']),
                len([r for r in registrations if r.get('type') == 'faculty' and r.get('status') == 'pending']),
                len([r for r in registrations if r.get('type') == 'faculty' and r.get('status') == 'cancelled']),
                faculty_count
            )
            print("DEBUG: Registration breakdown completed")
        except Exception as e:
            self.logger.error(f"Error generating registration breakdown: {e}")
            raise
        
        # Generate attendance breakdown table
        try:
            print("DEBUG: Starting attendance breakdown")
            attendance_breakdown = """
            <table class="table">
                <thead>
                    <tr>
                        <th>Department</th>
                        <th>Students</th>
                        <th>Faculty</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
            """
            
            # Group attendance by department
            dept_attendance = {}
            for attendee in attendance_data:
                # Check if attendee is a dictionary before calling .get()
                if isinstance(attendee, dict):
                    dept = attendee.get('department', 'Unknown')
                    if dept not in dept_attendance:
                        dept_attendance[dept] = {'students': 0, 'faculty': 0}
                    
                    attendee_type = attendee.get('type', 'student')
                    if attendee_type == 'student':
                        dept_attendance[dept]['students'] += 1
                    elif attendee_type == 'faculty':
                        dept_attendance[dept]['faculty'] += 1
            
            for dept, counts in dept_attendance.items():
                total = counts['students'] + counts['faculty']
                attendance_breakdown += f"""
                    <tr>
                        <td>{dept}</td>
                        <td>{counts['students']}</td>
                        <td>{counts['faculty']}</td>
                        <td>{total}</td>
                    </tr>
                """
            
            attendance_breakdown += """
                </tbody>
            </table>
            """
            print("DEBUG: Attendance breakdown completed")
        except Exception as e:
            self.logger.error(f"Error generating attendance breakdown: {e}")
            raise
        
        # Generate feedback breakdown
        try:
            print("DEBUG: Starting feedback breakdown")
            feedback_breakdown = """
            <div class="stats-grid">
                <div class="stat-box">
                    <span class="stat-number">{}</span>
                    <span class="stat-label">Excellent (5★)</span>
                </div>
                <div class="stat-box">
                    <span class="stat-number">{}</span>
                    <span class="stat-label">Good (4★)</span>
                </div>
                <div class="stat-box">
                    <span class="stat-number">{}</span>
                    <span class="stat-label">Average (3★)</span>
                </div>
                <div class="stat-box">
                    <span class="stat-number">{}</span>
                    <span class="stat-label">Poor (1-2★)</span>
                </div>
            </div>
            """.format(
                len([f for f in feedback_data if isinstance(f, dict) and f.get('rating', 0) == 5]),
                len([f for f in feedback_data if isinstance(f, dict) and f.get('rating', 0) == 4]),
                len([f for f in feedback_data if isinstance(f, dict) and f.get('rating', 0) == 3]),
                len([f for f in feedback_data if isinstance(f, dict) and f.get('rating', 0) <= 2])
            )
            print("DEBUG: Feedback breakdown completed")
        except Exception as e:
            self.logger.error(f"Error generating feedback breakdown: {e}")
            raise
        
        # Generate event images section
        try:
            print("DEBUG: Starting event images section")
            event_images_section = ""
            if options and options.get('event_images'):
                images = options['event_images']
                if images:
                    event_images_section = """
                    <div class="section page-break">
                        <div class="section-title">5. Event Images</div>
                        <div class="image-gallery">
                    """
                    for i, image in enumerate(images):
                        if not isinstance(image, dict):
                            self.logger.error(f"Image {i} is not a dict: {type(image)} - {image}")
                            continue
                        event_images_section += f"""
                            <div>
                                <img src="{image.get('url', '')}" alt="Event Image {i+1}" class="event-image">
                                <div class="image-caption">{image.get('caption', f'Event Image {i+1}')}</div>
                            </div>
                        """
                    event_images_section += """
                        </div>
                    </div>
                    """
            print("DEBUG: Event images section completed")
        except Exception as e:
            self.logger.error(f"Error generating event images section: {e}")
            raise
        
        # Generate event outcomes
        try:
            print("DEBUG: Starting event outcomes section")
            event_outcomes = ""
            if options and options.get('event_outcomes'):
                outcomes = options['event_outcomes']
                for i, outcome in enumerate(outcomes):
                    if not isinstance(outcome, dict):
                        self.logger.error(f"Outcome {i} is not a dict: {type(outcome)} - {outcome}")
                        continue
                    event_outcomes += f"""
                        <li class="outcome-item">
                            <div class="outcome-title">{outcome.get('title', 'Outcome')}</div>
                            <div class="outcome-description">{outcome.get('description', 'No description provided')}</div>
                        </li>
                    """
            print("DEBUG: Event outcomes section completed")
        except Exception as e:
            self.logger.error(f"Error generating event outcomes section: {e}")
            raise
        
        # Generate winners section
        try:
            print("DEBUG: Starting winners section")
            winners_section = ""
            if options and options.get('winners'):
                winners = options['winners']
                for i, winner in enumerate(winners):
                    if not isinstance(winner, dict):
                        self.logger.error(f"Winner {i} is not a dict: {type(winner)} - {winner}")
                        continue
                    winners_section += f"""
                        <div class="winner-card">
                            <div class="winner-position">{winner.get('position', 'Winner')}</div>
                            <div class="winner-name">{winner.get('name', 'Unknown')}</div>
                            <div class="winner-details">
                                {winner.get('department', '')} | {winner.get('id', '')}
                            </div>
                        </div>
                    """
            print("DEBUG: Winners section completed")
        except Exception as e:
            self.logger.error(f"Error generating winners section: {e}")
            raise
        
        # Replace template variables
        try:
            print("DEBUG: Starting template replacements")
            html_content = template.replace("{{DOCUMENT_TITLE}}", f"Event Report - {event.get('event_name', 'Event')}")
            html_content = html_content.replace("{{LDRP_LOGO_URL}}", "/logo/logo2.png")
            html_content = html_content.replace("{{KSV_LOGO_URL}}", "/logo/ksv.png")
            html_content = html_content.replace("{{INSTITUTION_NAME}}", "LDRP Institute of Technology & Research")
            html_content = html_content.replace("{{EVENT_NAME}}", event.get('event_name', 'Event Name'))
            html_content = html_content.replace("{{GENERATION_DATE}}", datetime.utcnow().strftime("%B %d, %Y"))
            html_content = html_content.replace("{{REPORT_ID}}", f"EVT-RPT-{event.get('event_id', 'UNKNOWN')}-{datetime.utcnow().strftime('%Y%m%d')}")
            print("DEBUG: Basic template replacements completed")
        except Exception as e:
            self.logger.error(f"Error in basic template replacements: {e}")
            raise
        
        # Event badges
        try:
            print("DEBUG: Starting event badges")
            badges = []
            if event.get('event_type'):
                badges.append(f'<span class="badge">{event.get("event_type").title()}</span>')
            if event.get('mode'):
                badges.append(f'<span class="badge">{event.get("mode").title()}</span>')
            if event.get('status'):
                badges.append(f'<span class="badge">{event.get("status").title()}</span>')
            html_content = html_content.replace("{{EVENT_BADGES}}", " ".join(badges))
            print("DEBUG: Event badges completed")
        except Exception as e:
            self.logger.error(f"Error in event badges: {e}")
            raise
        
        # Basic event details - matching actual event document structure
        try:
            print("DEBUG: Starting event details")
            html_content = html_content.replace("{{EVENT_TYPE}}", event.get('event_type', 'N/A').title())
            html_content = html_content.replace("{{EVENT_CATEGORY}}", event.get('organizing_department', 'N/A'))
            html_content = html_content.replace("{{EVENT_MODE}}", event.get('mode', 'N/A').title())
            
            # Extract date from start_datetime and end_datetime
            start_datetime = event.get('start_datetime', '')
            end_datetime = event.get('end_datetime', '')
            
            # Handle both string and datetime objects
            if start_datetime:
                if hasattr(start_datetime, 'strftime'):  # datetime object
                    start_date = start_datetime.strftime('%Y-%m-%d')
                    start_time = start_datetime.strftime('%H:%M')
                else:  # string
                    start_date = str(start_datetime).split(' ')[0]
                    start_time = str(start_datetime).split(' ')[1] if len(str(start_datetime).split(' ')) > 1 else ''
            else:
                start_date = ''
                start_time = ''
                
            if end_datetime:
                if hasattr(end_datetime, 'strftime'):  # datetime object
                    end_date = end_datetime.strftime('%Y-%m-%d')
                    end_time = end_datetime.strftime('%H:%M')
                else:  # string
                    end_date = str(end_datetime).split(' ')[0]
                    end_time = str(end_datetime).split(' ')[1] if len(str(end_datetime).split(' ')) > 1 else ''
            else:
                end_date = ''
                end_time = ''
            
            html_content = html_content.replace("{{START_DATE}}", format_date(start_date))
            html_content = html_content.replace("{{START_TIME}}", format_time(start_time))
            html_content = html_content.replace("{{END_DATE}}", format_date(end_date))
            html_content = html_content.replace("{{END_TIME}}", format_time(end_time))
            html_content = html_content.replace("{{VENUE}}", event.get('venue', 'N/A'))
            html_content = html_content.replace("{{EVENT_STATUS}}", event.get('status', 'N/A').title())
            
            # Get primary organizer from organizer_details
            organizer_details = event.get('organizer_details', [])
            if organizer_details and len(organizer_details) > 0:
                primary_organizer = organizer_details[0].get('full_name', 'N/A')
            else:
                primary_organizer = event.get('event_created_by', 'N/A')
            html_content = html_content.replace("{{PRIMARY_ORGANIZER}}", primary_organizer)
            print("DEBUG: Event details completed")
        except Exception as e:
            self.logger.error(f"Error in event details: {e}")
            raise
        
        # Event description
        try:
            print("DEBUG: Starting event description")
            # Use detailed_description instead of description
            description = event.get('detailed_description', event.get('short_description', ''))
            if description:
                detailed_description = f'''
                    <div class="subsection-title">Event Description</div>
                    <div class="description-box">{description}</div>
                '''
            else:
                detailed_description = ''
            html_content = html_content.replace("{{DETAILED_DESCRIPTION}}", detailed_description)
            print("DEBUG: Event description completed")
        except Exception as e:
            self.logger.error(f"Error in event description: {e}")
            raise
        
        # Registration details
        try:
            print("DEBUG: Starting registration details")
            html_content = html_content.replace("{{REGISTRATION_TYPE}}", event.get('target_audience', 'N/A').title())
            html_content = html_content.replace("{{REGISTRATION_MODE}}", event.get('registration_mode', 'N/A').title())
            html_content = html_content.replace("{{MIN_PARTICIPANTS}}", str(event.get('min_participants', 'N/A')))
            print("DEBUG: Registration details completed")
        except Exception as e:
            self.logger.error(f"Error in registration details: {e}")
            raise
        
        # Registration fee
        try:
            print("DEBUG: Starting registration fee")
            is_paid = event.get('is_paid', False)
            reg_fee = event.get('registration_fee')
            if is_paid and reg_fee and reg_fee > 0:
                fee_section = f'''
                    <div class="field">
                        <span class="field-label">Registration Fee:</span>
                        <span class="field-value">₹{reg_fee}</span>
                    </div>
                '''
            else:
                fee_section = '''
                    <div class="field">
                        <span class="field-label">Registration Fee:</span>
                        <span class="field-value">Free</span>
                    </div>
                '''
            html_content = html_content.replace("{{REGISTRATION_FEE}}", fee_section)
            print("DEBUG: Registration fee completed")
        except Exception as e:
            self.logger.error(f"Error in registration fee: {e}")
            raise
        
        # Max participants
        try:
            print("DEBUG: Starting max participants")
            max_participants = event.get('max_participants')
            if max_participants:
                max_part_section = f'''
                    <div class="field">
                        <span class="field-label">Maximum Participants:</span>
                        <span class="field-value">{max_participants}</span>
                    </div>
                '''
            else:
                max_part_section = ''
            html_content = html_content.replace("{{MAX_PARTICIPANTS}}", max_part_section)
            print("DEBUG: Max participants completed")
        except Exception as e:
            self.logger.error(f"Error in max participants: {e}")
            raise
        
        # Team settings
        try:
            print("DEBUG: Starting team settings")
            if event.get('is_team_based'):
                team_min = event.get('team_size_min', 'N/A')
                team_max = event.get('team_size_max', 'N/A')
                team_section = f'''
                    <div class="field">
                        <span class="field-label">Team Registration:</span>
                        <span class="field-value">Allowed (Size: {team_min} - {team_max} members)</span>
                    </div>
                '''
            else:
                team_section = '''
                    <div class="field">
                        <span class="field-label">Team Registration:</span>
                        <span class="field-value">Not Allowed (Individual Only)</span>
                    </div>
                '''
            html_content = html_content.replace("{{TEAM_SETTINGS}}", team_section)
            print("DEBUG: Team settings completed")
        except Exception as e:
            self.logger.error(f"Error in team settings: {e}")
            raise
        
        # Certificate details
        is_certificate_based = event.get('is_certificate_based', False)
        certificate_templates = event.get('certificate_templates', {})
        
        if is_certificate_based:
            certificate_template = "Configured" if certificate_templates else "Not configured"
            certificate_status = "Available" if certificate_templates else "Pending setup"
        else:
            certificate_template = "Not applicable"
            certificate_status = "Not certificate-based event"
            
        html_content = html_content.replace("{{CERTIFICATE_TEMPLATE}}", certificate_template)
        html_content = html_content.replace("{{CERTIFICATE_STATUS}}", certificate_status)
        
        # Attendance strategy
        attendance_strategy = event.get('attendance_strategy')
        attendance_config = event.get('attendance_config', {})
        if attendance_strategy:
            # Check if attendance_strategy is a dictionary or string
            if isinstance(attendance_strategy, dict):
                strategy_type = attendance_strategy.get("type", "N/A")
            else:
                # If it's a string, use it directly as the strategy type
                strategy_type = str(attendance_strategy)
            
            strategy_section = f'''
                <div class="strategy-overview">
                    <div class="strategy-item">
                        <span class="strategy-label">Strategy Type:</span>
                        <span class="strategy-value">{strategy_type.replace("_", " ").title()}</span>
                    </div>
            '''
            
            # Add more details from attendance_config
            if attendance_config:
                criteria = attendance_config.get('criteria', {})
                sessions = attendance_config.get('sessions', [])
                
                if criteria.get('minimum_percentage'):
                    strategy_section += f'''
                        <div class="strategy-item">
                            <span class="strategy-label">Minimum Attendance:</span>
                            <span class="strategy-value">{criteria.get('minimum_percentage')}%</span>
                        </div>
                    '''
                
                if sessions:
                    strategy_section += f'''
                        <div class="strategy-item">
                            <span class="strategy-label">Total Sessions:</span>
                            <span class="strategy-value">{len(sessions)} sessions</span>
                        </div>
                    '''
            
            strategy_section += '</div>'
        else:
            strategy_section = '<div class="description-box">No attendance strategy configured</div>'
        html_content = html_content.replace("{{ATTENDANCE_STRATEGY_SECTION}}", strategy_section)
        
        # Organizers section - use actual organizer details from event
        organizer_details = event.get('organizer_details', [])
        contacts = event.get('contacts', [])
        
        organizers_section = ''
        if organizer_details:
            for org in organizer_details:
                organizers_section += f'''
                    <div class="field">
                        <span class="field-label">{org.get('designation', 'Organizer')}:</span>
                        <span class="field-value">{org.get('full_name', 'N/A')} ({org.get('department', 'N/A')})</span>
                    </div>
                    <div class="field">
                        <span class="field-label">Contact:</span>
                        <span class="field-value">{org.get('email', 'N/A')} | {org.get('contact_no', 'N/A')}</span>
                    </div>
                '''
        else:
            organizers_section = '''
                <div class="field">
                    <span class="field-label">Contact Email:</span>
                    <span class="field-value">contact@ldrp.ac.in</span>
                </div>
            '''
        
        contacts_section = ''
        if contacts:
            for contact in contacts:
                contacts_section += f'''
                    <div class="field">
                        <span class="field-label">{contact.get('name', 'Contact')}:</span>
                        <span class="field-value">{contact.get('contact', 'N/A')}</span>
                    </div>
                '''
        
        html_content = html_content.replace("{{ORGANIZERS_SECTION}}", organizers_section)
        html_content = html_content.replace("{{CONTACTS_SECTION}}", contacts_section)
        
        # Fee description and additional assets
        fee_description = event.get('fee_description', '')
        if fee_description:
            fee_desc_section = f'''
                <div class="field">
                    <span class="field-label">Fee Details:</span>
                    <span class="field-value">{fee_description}</span>
                </div>
            '''
        else:
            fee_desc_section = ''
        
        html_content = html_content.replace("{{FEE_DESCRIPTION}}", fee_desc_section)
        html_content = html_content.replace("{{ADDITIONAL_ASSETS}}", "")
        
        # Statistics
        html_content = html_content.replace("{{TOTAL_REGISTRATIONS}}", str(total_regs))
        html_content = html_content.replace("{{CONFIRMED_REGISTRATIONS}}", str(confirmed_regs))
        html_content = html_content.replace("{{PENDING_REGISTRATIONS}}", str(pending_regs))
        html_content = html_content.replace("{{CANCELLED_REGISTRATIONS}}", str(cancelled_regs))
        html_content = html_content.replace("{{TOTAL_ATTENDEES}}", str(total_attendees))
        html_content = html_content.replace("{{ATTENDANCE_PERCENTAGE}}", str(attendance_rate))
        html_content = html_content.replace("{{STUDENT_ATTENDEES}}", str(student_attendees))
        html_content = html_content.replace("{{FACULTY_ATTENDEES}}", str(faculty_attendees))
        html_content = html_content.replace("{{OVERALL_RATING}}", f"{avg_rating:.1f}")
        html_content = html_content.replace("{{RATING_STARS}}", rating_stars)
        html_content = html_content.replace("{{TOTAL_FEEDBACK_COUNT}}", str(total_feedback))
        
        # Tables and sections
        html_content = html_content.replace("{{REGISTRATION_BREAKDOWN_TABLE}}", reg_breakdown)
        html_content = html_content.replace("{{ATTENDANCE_BREAKDOWN_TABLE}}", attendance_breakdown)
        html_content = html_content.replace("{{FEEDBACK_BREAKDOWN}}", feedback_breakdown)
        
        # Conditional sections - only add if data is provided
        
        # Event images section - only if images are provided
        if options and options.get('event_images') and len(options['event_images']) > 0:
            images = options['event_images']
            event_images_section = '''
                <div class="section page-break">
                    <div class="section-title">10. Event Images</div>
                    <div class="image-gallery">
            '''
            for i, image in enumerate(images):
                # Check if image is a dictionary before calling .get()
                if isinstance(image, dict):
                    caption = image.get('caption', f'Image {i+1}')
                    image_url = image.get('url', '')
                    filename = image.get('filename', '')
                    
                    # Check if it's a real image URL or placeholder
                    if image_url and not image_url.startswith('/placeholder/'):
                        # Real image - display actual image
                        event_images_section += f'''
                            <div>
                                <img src="{image_url}" alt="{caption}" class="event-image" 
                                     style="width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd;">
                                <div class="image-caption">{caption}</div>
                                <div style="font-size: 9pt; color: #888; text-align: center; margin-top: 2px;">
                                    File: {filename}
                                </div>
                            </div>
                        '''
                    else:
                        # Placeholder or failed upload
                        error_msg = image.get('error', 'Upload failed')
                        event_images_section += f'''
                            <div>
                                <div style="border: 2px dashed #f56565; padding: 20px; text-align: center; border-radius: 8px; background: #fed7d7;">
                                    <p style="color: #c53030; margin: 0; font-weight: bold;">⚠️ Image Upload Failed</p>
                                    <p style="font-size: 10pt; color: #9b2c2c; margin: 5px 0 0 0;">{caption}</p>
                                    <p style="font-size: 9pt; color: #9b2c2c; margin: 2px 0 0 0;">File: {filename}</p>
                                    <p style="font-size: 8pt; color: #9b2c2c; margin: 2px 0 0 0;">Error: {error_msg}</p>
                                </div>
                            </div>
                        '''
                else:
                    # Fallback for non-dictionary items
                    event_images_section += f'''
                        <div>
                            <div style="border: 2px dashed #ccc; padding: 20px; text-align: center; border-radius: 8px;">
                                <p style="color: #666; margin: 0;">Event Image {i+1}</p>
                                <p style="font-size: 10pt; color: #999; margin: 5px 0 0 0;">Invalid image data</p>
                            </div>
                        </div>
                    '''
            event_images_section += '''
                    </div>
                </div>
            '''
        else:
            event_images_section = ""
        html_content = html_content.replace("{{EVENT_IMAGES_SECTION}}", event_images_section)
        
        # Event outcomes section - only if outcomes are provided
        if options and (options.get('event_outcomes') or options.get('winners') or 
                       options.get('results_comparison') or options.get('actual_duration')):
            
            outcomes_section = '''
                <div class="section">
                    <div class="section-title">11. Event Outcomes and Results</div>
            '''
            
            # Add outcomes if provided
            if options.get('event_outcomes'):
                outcomes = options['event_outcomes']
                # Check if outcomes is a list and contains dictionaries
                if isinstance(outcomes, list) and any(isinstance(outcome, dict) and (outcome.get('title') or outcome.get('description')) for outcome in outcomes):
                    outcomes_section += '''
                        <div class="subsection-title">Key Outcomes</div>
                        <ul class="outcomes-list">
                    '''
                    for outcome in outcomes:
                        if isinstance(outcome, dict) and (outcome.get('title') or outcome.get('description')):
                            outcomes_section += f'''
                                <li class="outcome-item">
                                    <div class="outcome-title">{outcome.get('title', 'Outcome')}</div>
                                    <div class="outcome-description">{outcome.get('description', 'No description provided')}</div>
                                </li>
                            '''
                    outcomes_section += '</ul>'
            
            # Add winners if provided
            if options.get('winners'):
                winners = options['winners']
                # Check if winners is a list and contains dictionaries
                if isinstance(winners, list) and any(isinstance(winner, dict) and (winner.get('name') or winner.get('position')) for winner in winners):
                    outcomes_section += '''
                        <div class="subsection-title">Winners and Recognition</div>
                        <div class="winners-section">
                    '''
                    for winner in winners:
                        if isinstance(winner, dict) and (winner.get('name') or winner.get('position')):
                            outcomes_section += f'''
                                <div class="winner-card">
                                    <div class="winner-position">{winner.get('position', 'Winner')}</div>
                                    <div class="winner-name">{winner.get('name', 'Unknown')}</div>
                                    <div class="winner-details">
                                        {winner.get('department', '')} | {winner.get('id', '')}
                                    </div>
                                </div>
                            '''
                    outcomes_section += '</div>'
            
            # Add results comparison if provided
            if options.get('results_comparison'):
                outcomes_section += f'''
                    <div class="subsection-title">Expected vs Actual Results</div>
                    <div class="description-box">{options.get('results_comparison')}</div>
                '''
            
            outcomes_section += '</div>'
        else:
            outcomes_section = ""
        html_content = html_content.replace("{{EVENT_OUTCOMES_SECTION}}", outcomes_section)
        
        # Event completion section - only if additional details are provided
        if options and (options.get('actual_duration') or options.get('budget_utilization') or 
                       options.get('resources_used') or options.get('post_event_summary')):
            
            completion_section = '''
                <div class="section">
                    <div class="section-title">12. Event Completion Details</div>
                    <div class="field">
                        <span class="field-label">Completion Status:</span>
                        <span class="field-value">''' + event.get('status', 'Unknown').title() + '''</span>
                    </div>
            '''
            
            if options.get('actual_duration'):
                completion_section += f'''
                    <div class="field">
                        <span class="field-label">Actual Duration:</span>
                        <span class="field-value">{options.get('actual_duration')}</span>
                    </div>
                '''
            
            if options.get('budget_utilization'):
                completion_section += f'''
                    <div class="field">
                        <span class="field-label">Budget Utilization:</span>
                        <span class="field-value">{options.get('budget_utilization')}</span>
                    </div>
                '''
            
            if options.get('resources_used'):
                completion_section += f'''
                    <div class="field">
                        <span class="field-label">Resources Used:</span>
                        <span class="field-value">{options.get('resources_used')}</span>
                    </div>
                '''
            
            if options.get('post_event_summary'):
                completion_section += f'''
                    <div class="subsection-title">Post-Event Summary</div>
                    <div class="description-box">{options.get('post_event_summary')}</div>
                '''
            
            completion_section += '</div>'
        else:
            completion_section = ""
        html_content = html_content.replace("{{EVENT_COMPLETION_SECTION}}", completion_section)
        
        # Footer details
        html_content = html_content.replace("{{GENERATED_BY}}", options.get('generated_by', 'System') if options else 'System')
        html_content = html_content.replace("{{CURRENT_YEAR}}", str(datetime.utcnow().year))
        
        return html_content
    
    def _get_fallback_event_report_template(self) -> str:
        """Fallback template if the main template file is not found"""
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <title>{{DOCUMENT_TITLE}}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .section { margin-bottom: 25px; border: 1px solid #ddd; padding: 15px; }
                .section-title { font-size: 16pt; font-weight: bold; margin-bottom: 10px; color: #333; }
                .field { display: flex; justify-content: space-between; margin-bottom: 8px; }
                .field-label { font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Event Report</h1>
                <h2>{{EVENT_NAME}}</h2>
            </div>
            <div class="section">
                <div class="section-title">Event Overview</div>
                <div class="field"><span class="field-label">Event Name:</span><span>{{EVENT_NAME}}</span></div>
                <div class="field"><span class="field-label">Date:</span><span>{{START_DATE}}</span></div>
                <div class="field"><span class="field-label">Status:</span><span>{{EVENT_STATUS}}</span></div>
            </div>
            <div class="section">
                <div class="section-title">Statistics</div>
                <div class="field"><span class="field-label">Total Registrations:</span><span>{{TOTAL_REGISTRATIONS}}</span></div>
                <div class="field"><span class="field-label">Total Attendees:</span><span>{{TOTAL_ATTENDEES}}</span></div>
                <div class="field"><span class="field-label">Attendance Rate:</span><span>{{ATTENDANCE_PERCENTAGE}}%</span></div>
            </div>
        </body>
        </html>
        """

# Create singleton instance
export_service = ExportService()
