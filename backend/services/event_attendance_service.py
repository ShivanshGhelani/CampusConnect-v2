"""
Event Attendance Service
=======================
Handles ALL attendance marking operations for registered students.
ONLY UPDATES existing registration documents in student_registrations collection.

SINGLE RESPONSIBILITY: Attendance operations only  
COLLECTION: student_registrations (updates existing documents only)
REQUIREMENT: Student must be registered first (registration document must exist)
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from database.operations import DatabaseOperations
from core.logger import get_logger

logger = get_logger(__name__)

class EventAttendanceService:
    """
    Professional service for event attendance operations.
    Only updates existing registration documents with attendance data.
    """
    
    def __init__(self):
        self.collection = "student_registrations"
        self.events_collection = "events"
    
    async def mark_single_attendance(
        self,
        enrollment_no: str,
        event_id: str,
        marked_by: str,
        marking_method: str = "manual"
    ) -> Dict[str, Any]:
        """
        Mark single attendance for events with 'single_mark' strategy.
        Updates existing registration document only.
        """
        try:
            logger.info(f"Single attendance marking: {enrollment_no} -> {event_id}")
            
            # Find existing registration
            registration = await self._get_registration(enrollment_no, event_id)
            if not registration:
                return {"success": False, "message": "Student not registered for this event"}
            
            # Verify attendance strategy
            if registration["attendance"]["strategy"] != "single_mark":
                return {"success": False, "message": "Event does not use single mark attendance"}
            
            # Check if already marked
            if registration["attendance"]["marked"]:
                return {"success": False, "message": "Attendance already marked"}
            
            # Update attendance
            attendance_update = {
                "attendance.marked": True,
                "attendance.marked_at": datetime.utcnow(),
                "attendance.status": "present",
                "attendance.percentage": 100.0,
                "attendance.last_updated": datetime.utcnow(),
                "attendance.marked_by": marked_by,
                "attendance.marking_method": marking_method
            }
            
            await self._update_registration_attendance(enrollment_no, event_id, attendance_update)
            
            logger.info(f"Single attendance marked: {enrollment_no} -> {event_id}")
            
            return {
                "success": True,
                "message": "Single attendance marked successfully",
                "attendance_data": {
                    "strategy": "single_mark",
                    "status": "present",
                    "percentage": 100.0,
                    "marked_at": datetime.utcnow().isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Single attendance marking error: {e}")
            return {"success": False, "message": f"Attendance marking failed: {str(e)}"}
    
    async def mark_day_attendance(
        self,
        enrollment_no: str,
        event_id: str,
        day_number: int,
        marked_by: str,
        marking_method: str = "manual"
    ) -> Dict[str, Any]:
        """
        Mark day attendance for events with 'day_based' strategy.
        Updates specific day in the pre-created days array.
        """
        try:
            logger.info(f"Day attendance marking: {enrollment_no} -> {event_id} -> Day {day_number}")
            
            # Find existing registration
            registration = await self._get_registration(enrollment_no, event_id)
            if not registration:
                return {"success": False, "message": "Student not registered for this event"}
            
            # Verify attendance strategy
            if registration["attendance"]["strategy"] != "day_based":
                return {"success": False, "message": "Event does not use day-based attendance"}
            
            # Check if day exists in structure
            days = registration["attendance"].get("days", [])
            target_day = next((d for d in days if d["day"] == day_number), None)
            
            if not target_day:
                return {"success": False, "message": f"Day {day_number} not found in event structure"}
            
            # Check if day already marked
            if target_day["marked"]:
                return {"success": False, "message": f"Day {day_number} attendance already marked"}
            
            # Update the specific day
            await DatabaseOperations.update_one(
                self.collection,
                {
                    "student.enrollment_no": enrollment_no,
                    "event.event_id": event_id,
                    "attendance.days.day": day_number
                },
                {
                    "$set": {
                        "attendance.days.$.marked": True,
                        "attendance.days.$.marked_at": datetime.utcnow(),
                        "attendance.last_updated": datetime.utcnow(),
                        "attendance.marked_by": marked_by,
                        "attendance.marking_method": marking_method
                    }
                }
            )
            
            # Recalculate overall attendance percentage
            await self._recalculate_day_based_attendance(enrollment_no, event_id)
            
            logger.info(f"Day attendance marked: {enrollment_no} -> {event_id} -> Day {day_number}")
            
            return {
                "success": True,
                "message": f"Day {day_number} attendance marked successfully",
                "attendance_data": await self._get_attendance_summary(enrollment_no, event_id)
            }
            
        except Exception as e:
            logger.error(f"Day attendance marking error: {e}")
            return {"success": False, "message": f"Day attendance marking failed: {str(e)}"}
    
    async def mark_session_attendance(
        self,
        enrollment_no: str,
        event_id: str,
        session_id: str,
        session_name: str,
        marked_by: str,
        marking_method: str = "manual"
    ) -> Dict[str, Any]:
        """
        Mark session attendance for events with 'session_based' strategy.
        Adds session to the sessions array or updates existing.
        """
        try:
            logger.info(f"Session attendance marking: {enrollment_no} -> {event_id} -> {session_id}")
            
            # Find existing registration
            registration = await self._get_registration(enrollment_no, event_id)
            if not registration:
                return {"success": False, "message": "Student not registered for this event"}
            
            # Verify attendance strategy
            if registration["attendance"]["strategy"] != "session_based":
                return {"success": False, "message": "Event does not use session-based attendance"}
            
            # Check if session already marked
            sessions = registration["attendance"].get("sessions", [])
            existing_session = next((s for s in sessions if s.get("session_id") == session_id), None)
            
            if existing_session:
                return {"success": False, "message": f"Session {session_name} attendance already marked"}
            
            # Add new session attendance
            session_data = {
                "session_id": session_id,
                "session_name": session_name,
                "marked": True,
                "marked_at": datetime.utcnow(),
                "marked_by": marked_by,
                "marking_method": marking_method
            }
            
            await DatabaseOperations.update_one(
                self.collection,
                {
                    "student.enrollment_no": enrollment_no,
                    "event.event_id": event_id
                },
                {
                    "$push": {"attendance.sessions": session_data},
                    "$set": {
                        "attendance.last_updated": datetime.utcnow(),
                        "attendance.marked_by": marked_by,
                        "attendance.marking_method": marking_method
                    }
                }
            )
            
            # Recalculate overall attendance
            await self._recalculate_session_based_attendance(enrollment_no, event_id)
            
            logger.info(f"Session attendance marked: {enrollment_no} -> {event_id} -> {session_id}")
            
            return {
                "success": True,
                "message": f"Session {session_name} attendance marked successfully",
                "attendance_data": await self._get_attendance_summary(enrollment_no, event_id)
            }
            
        except Exception as e:
            logger.error(f"Session attendance marking error: {e}")
            return {"success": False, "message": f"Session attendance marking failed: {str(e)}"}
    
    async def mark_milestone_attendance(
        self,
        enrollment_no: str,
        event_id: str,
        milestone_id: str,
        milestone_name: str,
        marked_by: str,
        marking_method: str = "manual"
    ) -> Dict[str, Any]:
        """
        Mark milestone attendance for events with 'milestone_based' strategy.
        Adds milestone to the milestones array or updates existing.
        """
        try:
            logger.info(f"Milestone attendance marking: {enrollment_no} -> {event_id} -> {milestone_id}")
            
            # Find existing registration
            registration = await self._get_registration(enrollment_no, event_id)
            if not registration:
                return {"success": False, "message": "Student not registered for this event"}
            
            # Verify attendance strategy
            if registration["attendance"]["strategy"] != "milestone_based":
                return {"success": False, "message": "Event does not use milestone-based attendance"}
            
            # Check if milestone already marked
            milestones = registration["attendance"].get("milestones", [])
            existing_milestone = next((m for m in milestones if m.get("milestone_id") == milestone_id), None)
            
            if existing_milestone:
                return {"success": False, "message": f"Milestone {milestone_name} already completed"}
            
            # Add new milestone completion
            milestone_data = {
                "milestone_id": milestone_id,
                "milestone_name": milestone_name,
                "completed": True,
                "completed_at": datetime.utcnow(),
                "marked_by": marked_by,
                "marking_method": marking_method
            }
            
            await DatabaseOperations.update_one(
                self.collection,
                {
                    "student.enrollment_no": enrollment_no,
                    "event.event_id": event_id
                },
                {
                    "$push": {"attendance.milestones": milestone_data},
                    "$set": {
                        "attendance.last_updated": datetime.utcnow(),
                        "attendance.marked_by": marked_by,
                        "attendance.marking_method": marking_method
                    }
                }
            )
            
            # Recalculate overall attendance
            await self._recalculate_milestone_based_attendance(enrollment_no, event_id)
            
            logger.info(f"Milestone attendance marked: {enrollment_no} -> {event_id} -> {milestone_id}")
            
            return {
                "success": True,
                "message": f"Milestone {milestone_name} completed successfully",
                "attendance_data": await self._get_attendance_summary(enrollment_no, event_id)
            }
            
        except Exception as e:
            logger.error(f"Milestone attendance marking error: {e}")
            return {"success": False, "message": f"Milestone marking failed: {str(e)}"}
    
    async def initialize_event_attendance_structure(
        self,
        event_id: str
    ) -> Dict[str, Any]:
        """
        Initialize attendance structure for existing registrations when attendance system is set up.
        This updates all existing registrations with proper session/milestone structures.
        """
        try:
            logger.info(f"Initializing attendance structure for event: {event_id}")
            
            # Get event data to determine strategy and structure
            event_data = await DatabaseOperations.find_one(self.events_collection, {"event_id": event_id})
            if not event_data:
                return {"success": False, "message": "Event not found"}
            
            # Use the 4-day strategy detection system to get proper structure
            attendance_config = await self._get_dynamic_attendance_config(event_id, event_data)
            
            if not attendance_config:
                return {"success": False, "message": "Could not determine attendance configuration"}
            
            # Get all registrations for this event
            registrations = await DatabaseOperations.find_many(
                self.collection,
                {"event.event_id": event_id}
            )
            
            updated_count = 0
            
            for registration in registrations:
                # Update attendance structure based on strategy
                if attendance_config["strategy"] == "session_based":
                    # Initialize sessions array with event sessions
                    sessions_structure = [
                        {
                            "session_id": session["session_id"],
                            "session_name": session["session_name"],
                            "session_type": session.get("session_type", "regular"),
                            "marked": False,
                            "marked_at": None,
                            "weight": session.get("weight", 1.0)
                        }
                        for session in attendance_config.get("sessions", [])
                    ]
                    
                    await DatabaseOperations.update_one(
                        self.collection,
                        {"registration_id": registration["registration_id"]},
                        {
                            "$set": {
                                "attendance.sessions": sessions_structure,
                                "attendance.total_sessions": len(sessions_structure),
                                "attendance.sessions_attended": 0
                            }
                        }
                    )
                    
                elif attendance_config["strategy"] == "milestone_based":
                    # Initialize milestones array
                    milestones_structure = [
                        {
                            "milestone_id": milestone["milestone_id"],
                            "milestone_name": milestone["milestone_name"],
                            "milestone_type": milestone.get("milestone_type", "regular"),
                            "completed": False,
                            "completed_at": None,
                            "is_mandatory": milestone.get("is_mandatory", True)
                        }
                        for milestone in attendance_config.get("milestones", [])
                    ]
                    
                    await DatabaseOperations.update_one(
                        self.collection,
                        {"registration_id": registration["registration_id"]},
                        {
                            "$set": {
                                "attendance.milestones": milestones_structure,
                                "attendance.total_milestones": len(milestones_structure),
                                "attendance.milestones_completed": 0
                            }
                        }
                    )
                
                updated_count += 1
            
            logger.info(f"Attendance structure initialized for {updated_count} registrations in event {event_id}")
            
            return {
                "success": True,
                "message": f"Attendance structure initialized for {updated_count} registrations",
                "strategy": attendance_config["strategy"],
                "updated_registrations": updated_count
            }
            
        except Exception as e:
            logger.error(f"Attendance structure initialization error: {e}")
            return {"success": False, "message": f"Initialization failed: {str(e)}"}
    
    async def get_attendance_status(
        self,
        enrollment_no: str,
        event_id: str
    ) -> Dict[str, Any]:
        """Get complete attendance status for a student."""
        try:
            registration = await self._get_registration(enrollment_no, event_id)
            if not registration:
                return {"success": False, "message": "Student not registered for this event"}
            
            attendance_data = registration["attendance"]
            
            return {
                "success": True,
                "attendance": {
                    "strategy": attendance_data["strategy"],
                    "status": attendance_data["status"],
                    "percentage": attendance_data["percentage"],
                    "last_updated": attendance_data["last_updated"],
                    "marked_by": attendance_data.get("marked_by"),
                    "marking_method": attendance_data.get("marking_method"),
                    "details": self._get_strategy_specific_details(attendance_data)
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting attendance status: {e}")
            return {"success": False, "message": f"Error: {str(e)}"}
    
    # PRIVATE HELPER METHODS
    
    async def _get_registration(
        self,
        enrollment_no: str,
        event_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get registration document for student and event."""
        return await DatabaseOperations.find_one(
            self.collection,
            {
                "student.enrollment_no": enrollment_no,
                "event.event_id": event_id
            }
        )
    
    async def _update_registration_attendance(
        self,
        enrollment_no: str,
        event_id: str,
        update_data: Dict[str, Any]
    ) -> None:
        """Update attendance data in registration document."""
        await DatabaseOperations.update_one(
            self.collection,
            {
                "student.enrollment_no": enrollment_no,
                "event.event_id": event_id
            },
            {"$set": update_data}
        )
    
    async def _recalculate_day_based_attendance(
        self,
        enrollment_no: str,
        event_id: str
    ) -> None:
        """Recalculate overall attendance percentage for day-based strategy."""
        registration = await self._get_registration(enrollment_no, event_id)
        if not registration:
            return
        
        days = registration["attendance"].get("days", [])
        total_days = len(days)
        attended_days = len([d for d in days if d["marked"]])
        
        percentage = (attended_days / total_days * 100) if total_days > 0 else 0
        status = self._calculate_attendance_status(percentage)
        
        await self._update_registration_attendance(
            enrollment_no, event_id,
            {
                "attendance.days_attended": attended_days,
                "attendance.percentage": percentage,
                "attendance.status": status
            }
        )
    
    async def _recalculate_session_based_attendance(
        self,
        enrollment_no: str,
        event_id: str
    ) -> None:
        """Recalculate overall attendance percentage for session-based strategy."""
        registration = await self._get_registration(enrollment_no, event_id)
        if not registration:
            return
        
        sessions = registration["attendance"].get("sessions", [])
        total_sessions = registration["attendance"].get("total_sessions", len(sessions))
        attended_sessions = len([s for s in sessions if s.get("marked")])
        
        percentage = (attended_sessions / total_sessions * 100) if total_sessions > 0 else 0
        status = self._calculate_attendance_status(percentage)
        
        await self._update_registration_attendance(
            enrollment_no, event_id,
            {
                "attendance.sessions_attended": attended_sessions,
                "attendance.percentage": percentage,
                "attendance.status": status
            }
        )
    
    async def _recalculate_milestone_based_attendance(
        self,
        enrollment_no: str,
        event_id: str
    ) -> None:
        """Recalculate overall attendance percentage for milestone-based strategy."""
        registration = await self._get_registration(enrollment_no, event_id)
        if not registration:
            return
        
        milestones = registration["attendance"].get("milestones", [])
        total_milestones = registration["attendance"].get("total_milestones", len(milestones))
        completed_milestones = len([m for m in milestones if m.get("completed")])
        
        percentage = (completed_milestones / total_milestones * 100) if total_milestones > 0 else 0
        status = self._calculate_attendance_status(percentage)
        
        await self._update_registration_attendance(
            enrollment_no, event_id,
            {
                "attendance.milestones_completed": completed_milestones,
                "attendance.percentage": percentage,
                "attendance.status": status
            }
        )
    
    def _calculate_attendance_status(self, percentage: float) -> str:
        """Calculate attendance status based on percentage."""
        if percentage >= 75:
            return "present"
        elif percentage > 0:
            return "partial"
        else:
            return "absent"
    
    async def _get_dynamic_attendance_config(
        self,
        event_id: str,
        event_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Get attendance configuration using the working dynamic attendance system."""
        try:
            from services.dynamic_attendance_service import IntegratedDynamicAttendanceService
            
            dynamic_service = IntegratedDynamicAttendanceService()
            result = await dynamic_service.initialize_event_attendance(event_id)
            
            if result["success"]:
                return result.get("config")
            
            return None
            
        except Exception as e:
            logger.warning(f"Dynamic attendance config failed: {e}")
            return None
    
    async def _get_attendance_summary(
        self,
        enrollment_no: str,
        event_id: str
    ) -> Dict[str, Any]:
        """Get attendance summary for response."""
        registration = await self._get_registration(enrollment_no, event_id)
        if not registration:
            return {}
        
        attendance = registration["attendance"]
        return {
            "strategy": attendance["strategy"],
            "status": attendance["status"],
            "percentage": attendance["percentage"],
            "last_updated": attendance["last_updated"]
        }
    
    def _get_strategy_specific_details(self, attendance_data: Dict[str, Any]) -> Dict[str, Any]:
        """Get strategy-specific attendance details."""
        strategy = attendance_data["strategy"]
        
        if strategy == "single_mark":
            return {
                "marked": attendance_data.get("marked", False),
                "marked_at": attendance_data.get("marked_at")
            }
        elif strategy == "day_based":
            return {
                "days": attendance_data.get("days", []),
                "total_days": attendance_data.get("total_days", 0),
                "days_attended": attendance_data.get("days_attended", 0)
            }
        elif strategy == "session_based":
            return {
                "sessions": attendance_data.get("sessions", []),
                "total_sessions": attendance_data.get("total_sessions", 0),
                "sessions_attended": attendance_data.get("sessions_attended", 0)
            }
        elif strategy == "milestone_based":
            return {
                "milestones": attendance_data.get("milestones", []),
                "total_milestones": attendance_data.get("total_milestones", 0),
                "milestones_completed": attendance_data.get("milestones_completed", 0)
            }
        else:
            return {}


# Service instance
event_attendance_service = EventAttendanceService()
