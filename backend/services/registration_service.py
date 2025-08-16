"""
Simple Registration Service - Event Lifecycle Compliant
=======================================================
Simplified service following event_lifecycle.txt specifications
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
from database.operations import DatabaseOperations
from models.registration import (
    StudentRegistration, CreateRegistrationRequest, RegistrationResponse,
    RegistrationStats, StudentInfo, EventInfo, RegistrationDetails,
    TeamInfo, AttendanceInfo, FeedbackInfo, CertificateInfo,
    RegistrationStatus, AttendanceStatus, CertificateStatus, DashboardData
)
from core.id_generator import generate_registration_id
from core.logger import get_logger
import secrets
import string

logger = get_logger(__name__)

class SimpleRegistrationService:
    """
    Simple registration service following event_lifecycle.txt specifications
    Collection: student_registrations (as per event_lifecycle.txt)
    """
    
    def __init__(self):
        self.collection = "student_registrations"  # Renamed as per event_lifecycle.txt
        self.events_collection = "events"
        self.students_collection = "students"
        self.db = DatabaseOperations()
    
    def _generate_registration_id(self, enrollment_no: str, event_id: str) -> str:
        """Generate registration ID as per event_lifecycle.txt format"""
        return f"REG_{enrollment_no}_{event_id}"
    
    async def register_student(self, enrollment_no: str, request: CreateRegistrationRequest) -> RegistrationResponse:
        """
        Register student for event - simple and fast
        """
        try:
            logger.info(f"Registering student {enrollment_no} for event {request.event_id}")
            
            # Generate registration ID
            registration_id = self._generate_registration_id(enrollment_no, request.event_id)
            
            # Check if already registered
            existing = await self.db.find_one(
                self.collection,
                {"_id": registration_id}
            )
            
            if existing:
                return RegistrationResponse(
                    success=False,
                    message="Already registered for this event",
                    registration_id=registration_id
                )
            
            # Get student info
            student_data = await self.db.find_one(
                self.students_collection,
                {"enrollment_no": enrollment_no}
            )
            
            if not student_data:
                return RegistrationResponse(
                    success=False,
                    message="Student not found"
                )
            
            # Get event info
            event_data = await self.db.find_one(
                self.events_collection,
                {"_id": request.event_id}
            )
            
            if not event_data:
                return RegistrationResponse(
                    success=False,
                    message="Event not found"
                )
            
            # Create registration document
            registration_doc = {
                "_id": registration_id,
                "student": {
                    "enrollment_no": enrollment_no,
                    "name": student_data.get("name", ""),
                    "email": student_data.get("email", ""),
                    "phone": student_data.get("phone"),
                    "department": student_data.get("department")
                },
                "event": {
                    "event_id": request.event_id,
                    "title": event_data.get("title", ""),
                    "event_type": event_data.get("event_type", ""),
                    "start_date": event_data.get("start_date")
                },
                "registration": {
                    "registration_id": registration_id,
                    "registered_at": datetime.utcnow(),
                    "status": RegistrationStatus.ACTIVE.value,
                    "registration_type": request.registration_type
                },
                "team": request.team_info if request.team_info else None,
                "attendance": {
                    "marked": False,
                    "marked_at": None,
                    "status": AttendanceStatus.NOT_MARKED.value,
                    "sessions_attended": 0,
                    "total_sessions": event_data.get("total_sessions", 1),
                    "attendance_percentage": 0.0
                },
                "feedback": {
                    "submitted": False,
                    "submitted_at": None,
                    "rating": None,
                    "comments": None
                },
                "certificate": {
                    "eligible": False,
                    "issued": False,
                    "issued_at": None,
                    "certificate_id": None,
                    "status": CertificateStatus.NOT_ELIGIBLE.value
                },
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            # Insert registration
            result = await self.db.insert_one(self.collection, registration_doc)
            
            if result:
                return RegistrationResponse(
                    success=True,
                    message="Registration successful",
                    registration_id=registration_id,
                    data={"registration_id": registration_id}
                )
            else:
                return RegistrationResponse(
                    success=False,
                    message="Failed to create registration"
                )
                
        except Exception as e:
            logger.error(f"Error registering student: {str(e)}")
            return RegistrationResponse(
                success=False,
                message=f"Registration failed: {str(e)}"
            )
    
    async def get_registration_status(self, enrollment_no: str, event_id: str) -> Dict[str, Any]:
        """
        Get registration status - simple query
        """
        try:
            registration_id = self._generate_registration_id(enrollment_no, event_id)
            
            registration = await self.db.find_one(
                self.collection,
                {"_id": registration_id}
            )
            
            if not registration:
                return {
                    "registered": False,
                    "message": "Not registered for this event"
                }
            
            return {
                "registered": True,
                "registration": registration,
                "completion_status": self._calculate_completion_status(registration)
            }
            
        except Exception as e:
            logger.error(f"Error getting registration status: {str(e)}")
            return {
                "registered": False,
                "error": str(e)
            }
    
    async def mark_attendance(self, enrollment_no: str, event_id: str, attendance_data: Dict[str, Any] = None) -> RegistrationResponse:
        """
        Mark attendance - simple update
        """
        try:
            registration_id = self._generate_registration_id(enrollment_no, event_id)
            
            update_data = {
                "attendance.marked": True,
                "attendance.marked_at": datetime.utcnow(),
                "attendance.status": AttendanceStatus.PRESENT.value,
                "updated_at": datetime.utcnow()
            }
            
            # Handle session-based attendance if applicable
            if attendance_data and "session" in attendance_data:
                registration = await self.db.find_one(self.collection, {"_id": registration_id})
                if registration:
                    sessions_attended = registration.get("attendance", {}).get("sessions_attended", 0) + 1
                    total_sessions = registration.get("attendance", {}).get("total_sessions", 1)
                    
                    update_data.update({
                        "attendance.sessions_attended": sessions_attended,
                        "attendance.attendance_percentage": (sessions_attended / total_sessions) * 100
                    })
            
            result = await self.db.update_one(
                self.collection,
                {"_id": registration_id},
                {"$set": update_data}
            )
            
            if result:
                # Check certificate eligibility
                await self._check_certificate_eligibility(registration_id)
                
                return RegistrationResponse(
                    success=True,
                    message="Attendance marked successfully"
                )
            else:
                return RegistrationResponse(
                    success=False,
                    message="Failed to mark attendance"
                )
                
        except Exception as e:
            logger.error(f"Error marking attendance: {str(e)}")
            return RegistrationResponse(
                success=False,
                message=f"Failed to mark attendance: {str(e)}"
            )
    
    async def submit_feedback(self, enrollment_no: str, event_id: str, feedback_data: Dict[str, Any]) -> RegistrationResponse:
        """
        Submit feedback - simple update
        """
        try:
            registration_id = self._generate_registration_id(enrollment_no, event_id)
            
            update_data = {
                "feedback.submitted": True,
                "feedback.submitted_at": datetime.utcnow(),
                "feedback.rating": feedback_data.get("rating"),
                "feedback.comments": feedback_data.get("comments"),
                "updated_at": datetime.utcnow()
            }
            
            result = await self.db.update_one(
                self.collection,
                {"_id": registration_id},
                {"$set": update_data}
            )
            
            if result:
                # Check certificate eligibility
                await self._check_certificate_eligibility(registration_id)
                
                return RegistrationResponse(
                    success=True,
                    message="Feedback submitted successfully"
                )
            else:
                return RegistrationResponse(
                    success=False,
                    message="Failed to submit feedback"
                )
                
        except Exception as e:
            logger.error(f"Error submitting feedback: {str(e)}")
            return RegistrationResponse(
                success=False,
                message=f"Failed to submit feedback: {str(e)}"
            )
    
    async def get_student_dashboard(self, enrollment_no: str) -> DashboardData:
        """
        Get student dashboard data
        """
        try:
            # Get all registrations for student
            registrations = await self.db.find_many(
                self.collection,
                {"student.enrollment_no": enrollment_no}
            )
            
            dashboard_data = {
                "total_registrations": len(registrations),
                "active_events": [],
                "completed_events": [],
                "upcoming_events": [],
                "certificates_available": [],
                "attendance_summary": {
                    "total_events": 0,
                    "attended_events": 0,
                    "attendance_percentage": 0
                },
                "feedback_summary": {
                    "total_events": 0,
                    "feedback_submitted": 0,
                    "feedback_percentage": 0
                }
            }
            
            for reg in registrations:
                event_data = {
                    "event_id": reg["event"]["event_id"],
                    "title": reg["event"]["title"],
                    "event_type": reg["event"]["event_type"],
                    "registration_id": reg["registration"]["registration_id"],
                    "status": reg["registration"]["status"],
                    "attendance": reg["attendance"],
                    "feedback": reg["feedback"],
                    "certificate": reg["certificate"]
                }
                
                if reg["registration"]["status"] == RegistrationStatus.COMPLETED.value:
                    dashboard_data["completed_events"].append(event_data)
                else:
                    dashboard_data["active_events"].append(event_data)
                
                if reg["certificate"]["eligible"] and not reg["certificate"]["issued"]:
                    dashboard_data["certificates_available"].append(event_data)
            
            return DashboardData(
                user_type="student",
                data=dashboard_data
            )
            
        except Exception as e:
            logger.error(f"Error getting student dashboard: {str(e)}")
            return DashboardData(
                user_type="student",
                data={"error": str(e)}
            )
    
    async def get_organizer_dashboard(self, event_id: str) -> DashboardData:
        """
        Get organizer dashboard data for specific event
        """
        try:
            # Get all registrations for event
            registrations = await self.db.find_many(
                self.collection,
                {"event.event_id": event_id}
            )
            
            stats = self._calculate_event_stats(registrations)
            
            dashboard_data = {
                "event_id": event_id,
                "statistics": stats,
                "registrations": registrations,
                "real_time_data": {
                    "total_registered": len(registrations),
                    "present_today": sum(1 for r in registrations if r["attendance"]["marked"]),
                    "feedback_submitted": sum(1 for r in registrations if r["feedback"]["submitted"]),
                    "certificates_eligible": sum(1 for r in registrations if r["certificate"]["eligible"])
                }
            }
            
            return DashboardData(
                user_type="organizer",
                data=dashboard_data
            )
            
        except Exception as e:
            logger.error(f"Error getting organizer dashboard: {str(e)}")
            return DashboardData(
                user_type="organizer",
                data={"error": str(e)}
            )
    
    def _calculate_completion_status(self, registration: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate completion percentage for registration"""
        completed_steps = 1  # Registration is complete
        total_steps = 4  # Registration, Attendance, Feedback, Certificate
        
        if registration.get("attendance", {}).get("marked"):
            completed_steps += 1
        
        if registration.get("feedback", {}).get("submitted"):
            completed_steps += 1
        
        if registration.get("certificate", {}).get("issued"):
            completed_steps += 1
        
        return {
            "completed_steps": completed_steps,
            "total_steps": total_steps,
            "completion_percentage": (completed_steps / total_steps) * 100,
            "next_step": self._get_next_step(registration)
        }
    
    def _get_next_step(self, registration: Dict[str, Any]) -> str:
        """Get next step in lifecycle"""
        if not registration.get("attendance", {}).get("marked"):
            return "Mark Attendance"
        elif not registration.get("feedback", {}).get("submitted"):
            return "Submit Feedback"
        elif registration.get("certificate", {}).get("eligible") and not registration.get("certificate", {}).get("issued"):
            return "Collect Certificate"
        else:
            return "Completed"
    
    async def _check_certificate_eligibility(self, registration_id: str):
        """Check and update certificate eligibility"""
        try:
            registration = await self.db.find_one(self.collection, {"_id": registration_id})
            
            if registration:
                attendance_marked = registration.get("attendance", {}).get("marked", False)
                feedback_submitted = registration.get("feedback", {}).get("submitted", False)
                
                if attendance_marked and feedback_submitted:
                    await self.db.update_one(
                        self.collection,
                        {"_id": registration_id},
                        {"$set": {
                            "certificate.eligible": True,
                            "certificate.status": CertificateStatus.ELIGIBLE.value,
                            "updated_at": datetime.utcnow()
                        }}
                    )
                    
        except Exception as e:
            logger.error(f"Error checking certificate eligibility: {str(e)}")
    
    def _calculate_event_stats(self, registrations: List[Dict[str, Any]]) -> RegistrationStats:
        """Calculate event statistics"""
        total = len(registrations)
        active = sum(1 for r in registrations if r["registration"]["status"] == RegistrationStatus.ACTIVE.value)
        cancelled = sum(1 for r in registrations if r["registration"]["status"] == RegistrationStatus.CANCELLED.value)
        attendance_marked = sum(1 for r in registrations if r["attendance"]["marked"])
        feedback_submitted = sum(1 for r in registrations if r["feedback"]["submitted"])
        certificates_issued = sum(1 for r in registrations if r["certificate"]["issued"])
        
        return RegistrationStats(
            total_registrations=total,
            active_registrations=active,
            cancelled_registrations=cancelled,
            attendance_marked=attendance_marked,
            feedback_submitted=feedback_submitted,
            certificates_issued=certificates_issued,
            attendance_percentage=(attendance_marked / total * 100) if total > 0 else 0,
            feedback_percentage=(feedback_submitted / total * 100) if total > 0 else 0,
            certificate_percentage=(certificates_issued / total * 100) if total > 0 else 0
        )
