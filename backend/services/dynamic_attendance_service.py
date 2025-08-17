"""
Dynamic Attendance Management Service
====================================

This service integrates the dynamic attendance system with the existing CampusConnect
infrastructure, providing intelligent attendance management based on event types.

Key Features:
- Automatic attendance strategy detection
- Event-aware session generation
- Intelligent criteria calculation
- Seamless integration with existing registration system
- Real-world event scenario support
"""

import asyncio
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
from database.operations import DatabaseOperations
from models.dynamic_attendance import (
    DynamicAttendanceService, 
    AttendanceStrategy,
    DynamicAttendanceConfig,
    StudentAttendanceRecord,
    AttendanceSession,
    AttendanceCriteria
)
from core.logger import get_logger

# Setup logger
logger = get_logger(__name__)
from core.id_generator import generate_attendance_id

class IntegratedDynamicAttendanceService:
    """
    Main service for dynamic attendance management that integrates with CampusConnect
    """
    
    def __init__(self):
        self.dynamic_service = DynamicAttendanceService()
    
    async def initialize_event_attendance(self, event_id: str) -> Dict[str, Any]:
        """
        Initialize dynamic attendance configuration when an event is created
        or when attendance system is first accessed for an event
        """
        try:
            # Check if config already exists
            existing_config = await self.dynamic_service.get_attendance_config(event_id)
            if existing_config:
                return {
                    "success": True,
                    "message": "Attendance configuration already exists",
                    "config": existing_config.dict(),
                    "strategy": existing_config.strategy.value
                }
            
            # Get event data
            event_data = await DatabaseOperations.find_one("events", {"event_id": event_id})
            if not event_data:
                return {
                    "success": False,
                    "message": "Event not found"
                }
            
            # Create dynamic attendance configuration
            config = await self.dynamic_service.create_attendance_config_for_event(event_data)
            
            logger.info(f"Initialized dynamic attendance for event {event_id} with strategy: {config.strategy.value}")
            
            return {
                "success": True,
                "message": f"Dynamic attendance initialized with {config.strategy.value} strategy",
                "config": config.dict(),
                "strategy": config.strategy.value,
                "sessions_count": len(config.sessions),
                "criteria": config.criteria.dict()
            }
            
        except Exception as e:
            logger.error(f"Error initializing event attendance: {e}")
            return {
                "success": False,
                "message": f"Failed to initialize attendance: {str(e)}"
            }
    
    async def mark_student_attendance(self, event_id: str, student_enrollment: str, 
                                    session_id: Optional[str] = None,
                                    attendance_metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Mark attendance for a student with intelligent session detection
        """
        try:
            # Get attendance configuration
            config = await self.dynamic_service.get_attendance_config(event_id)
            if not config:
                # Auto-initialize if not exists
                init_result = await self.initialize_event_attendance(event_id)
                if not init_result["success"]:
                    return init_result
                config = await self.dynamic_service.get_attendance_config(event_id)
            
            # Determine session to mark
            if not session_id:
                session_id = self._determine_current_session(config)
                if not session_id:
                    return {
                        "success": False,
                        "message": "No active session available for attendance marking"
                    }
            
            # Validate session exists
            session = next((s for s in config.sessions if s.session_id == session_id), None)
            if not session:
                return {
                    "success": False,
                    "message": f"Session {session_id} not found"
                }
            
            # Check if attendance already marked for this session
            existing_record = await DatabaseOperations.find_one(
                "student_attendance_records",
                {
                    "student_enrollment": student_enrollment,
                    "event_id": event_id
                }
            )
            
            if existing_record and session_id in existing_record.get("sessions_attended", {}):
                return {
                    "success": False,
                    "message": f"Attendance already marked for {session.session_name}",
                    "already_marked": True
                }
            
            # Generate attendance ID
            attendance_id = generate_attendance_id(student_enrollment, event_id, session_id)
            
            # Prepare attendance data
            attendance_data = {
                "attendance_id": attendance_id,
                "session_name": session.session_name,
                "session_type": session.session_type,
                "marked_at": datetime.utcnow(),
                "weight": session.weight,
                **(attendance_metadata or {})
            }
            
            # Mark attendance using dynamic service
            result = await self.dynamic_service.mark_session_attendance(
                event_id, session_id, student_enrollment, attendance_data
            )
            
            # Update event's attendance tracking
            await self._update_event_attendance_tracking(event_id, student_enrollment, attendance_id)
            
            # Log the attendance marking
            logger.info(f"Attendance marked: {student_enrollment} -> {event_id} -> {session_id}")
            
            return {
                "success": True,
                "message": f"Attendance marked for {session.session_name}",
                "attendance_id": attendance_id,
                "session_id": session_id,
                "session_name": session.session_name,
                "overall_status": result["overall_status"],
                "percentage": result["percentage"],
                "strategy": config.strategy.value
            }
            
        except Exception as e:
            logger.error(f"Error marking attendance: {e}")
            return {
                "success": False,
                "message": f"Failed to mark attendance: {str(e)}"
            }
    
    async def get_student_attendance_dashboard(self, event_id: str, 
                                             student_enrollment: str) -> Dict[str, Any]:
        """
        Get comprehensive attendance dashboard for a student
        """
        try:
            # Get attendance status from dynamic service
            status = await self.dynamic_service.get_student_attendance_status(event_id, student_enrollment)
            
            if not status["success"]:
                return status
            
            # Get event details for context
            event_data = await DatabaseOperations.find_one("events", {"event_id": event_id})
            
            # Get registration details from new unified collection
            registration_data = await DatabaseOperations.find_one(
                "student_registrations",
                {
                    "student.enrollment_no": student_enrollment,
                    "event.event_id": event_id
                }
            )
            
            # Enhance status with additional context
            enhanced_status = {
                **status,
                "event_name": event_data.get("event_name") if event_data else "Unknown Event",
                "event_type": event_data.get("event_type") if event_data else "Unknown",
                "registration_type": registration_data.get("registration", {}).get("type") if registration_data else None,
                "attendance_requirements": self._get_attendance_requirements(status["attendance_strategy"]),
                "progress": self._calculate_progress(status),
                "recommendations": self._get_attendance_recommendations(status)
            }
            
            return enhanced_status
            
        except Exception as e:
            logger.error(f"Error getting attendance dashboard: {e}")
            return {
                "success": False,
                "message": f"Failed to get attendance status: {str(e)}"
            }
    
    async def get_event_attendance_analytics(self, event_id: str) -> Dict[str, Any]:
        """
        Get comprehensive attendance analytics for an event
        """
        try:
            # Get attendance configuration
            config = await self.dynamic_service.get_attendance_config(event_id)
            if not config:
                return {
                    "success": False,
                    "message": "Attendance configuration not found"
                }
            
            # Get all attendance records for this event
            records = await DatabaseOperations.find_many(
                "student_attendance_records",
                {"event_id": event_id}
            )
            
            # Get event registrations for comparison (using new unified collection)
            registrations = await DatabaseOperations.find_many(
                "student_registrations",
                {"event.event_id": event_id}
            )
            
            total_registered = len(registrations)
            total_with_attendance = len(records)
            
            # Calculate session-wise attendance
            session_stats = {}
            for session in config.sessions:
                attended_count = sum(
                    1 for record in records 
                    if session.session_id in record.get("sessions_attended", {})
                )
                session_stats[session.session_id] = {
                    "session_name": session.session_name,
                    "session_type": session.session_type,
                    "attended_count": attended_count,
                    "attendance_rate": (attended_count / total_registered * 100) if total_registered > 0 else 0,
                    "is_mandatory": session.is_mandatory,
                    "weight": session.weight
                }
            
            # Calculate overall statistics
            status_distribution = {"present": 0, "absent": 0, "partial": 0, "pending": 0}
            for record in records:
                status = record.get("final_status", "pending")
                status_distribution[status] += 1
            
            # Add pending students (registered but no attendance record)
            status_distribution["pending"] += total_registered - total_with_attendance
            
            return {
                "success": True,
                "event_id": event_id,
                "strategy": config.strategy.value,
                "total_registered": total_registered,
                "total_sessions": len(config.sessions),
                "session_statistics": session_stats,
                "overall_statistics": {
                    "status_distribution": status_distribution,
                    "attendance_rate": (total_with_attendance / total_registered * 100) if total_registered > 0 else 0,
                    "completion_rate": (status_distribution["present"] / total_registered * 100) if total_registered > 0 else 0
                },
                "criteria": config.criteria.dict(),
                "generated_at": datetime.utcnow()
            }
            
        except Exception as e:
            logger.error(f"Error getting event attendance analytics: {e}")
            return {
                "success": False,
                "message": f"Failed to get analytics: {str(e)}"
            }
    
    async def get_active_attendance_sessions(self, event_id: str) -> Dict[str, Any]:
        """
        Get currently active attendance sessions for an event
        """
        try:
            config = await self.dynamic_service.get_attendance_config(event_id)
            if not config:
                return {
                    "success": False,
                    "message": "Attendance configuration not found"
                }
            
            current_time = datetime.utcnow()
            active_sessions = []
            upcoming_sessions = []
            
            for session in config.sessions:
                if session.start_time <= current_time <= session.end_time:
                    active_sessions.append({
                        "session_id": session.session_id,
                        "session_name": session.session_name,
                        "session_type": session.session_type,
                        "end_time": session.end_time,
                        "time_remaining": (session.end_time - current_time).total_seconds(),
                        "is_mandatory": session.is_mandatory
                    })
                elif session.start_time > current_time:
                    upcoming_sessions.append({
                        "session_id": session.session_id,
                        "session_name": session.session_name,
                        "session_type": session.session_type,
                        "start_time": session.start_time,
                        "time_until_start": (session.start_time - current_time).total_seconds(),
                        "is_mandatory": session.is_mandatory
                    })
            
            return {
                "success": True,
                "strategy": config.strategy.value,
                "active_sessions": active_sessions,
                "upcoming_sessions": upcoming_sessions[:3],  # Next 3 upcoming
                "can_mark_attendance": len(active_sessions) > 0
            }
            
        except Exception as e:
            logger.error(f"Error getting active sessions: {e}")
            return {
                "success": False,
                "message": f"Failed to get active sessions: {str(e)}"
            }
    
    def _determine_current_session(self, config: DynamicAttendanceConfig) -> Optional[str]:
        """Determine which session should be marked based on current time"""
        current_time = datetime.utcnow()
        
        # Find currently active session
        for session in config.sessions:
            if session.start_time <= current_time <= session.end_time:
                return session.session_id
        
        return None
    
    async def _update_event_attendance_tracking(self, event_id: str, student_enrollment: str, 
                                               attendance_id: str) -> None:
        """Update event's attendance tracking arrays"""
        try:
            # Get event to determine if it's individual or team
            event_data = await DatabaseOperations.find_one("events", {"event_id": event_id})
            if not event_data:
                return
            
            # Check if student is in team registration
            team_name = None
            for t_name, team_data in event_data.get("team_registrations", {}).items():
                if student_enrollment in team_data:
                    team_name = t_name
                    break
            
            if team_name:
                # Update team attendance
                await DatabaseOperations.update_one(
                    "events",
                    {"event_id": event_id},
                    {
                        "$addToSet": {
                            f"team_attendances.{team_name}.{student_enrollment}": attendance_id
                        }
                    }
                )
            else:
                # Update individual attendance
                await DatabaseOperations.update_one(
                    "events",
                    {"event_id": event_id},
                    {
                        "$addToSet": {
                            f"attendances.{student_enrollment}": attendance_id
                        }
                    }
                )
                
        except Exception as e:
            logger.error(f"Error updating event attendance tracking: {e}")
    
    def _get_attendance_requirements(self, strategy: str) -> Dict[str, Any]:
        """Get human-readable attendance requirements"""
        requirements = {
            "single_mark": {
                "type": "Single Attendance",
                "description": "Attend the event and mark your presence once",
                "criteria": "Present during the event"
            },
            "day_based": {
                "type": "Daily Attendance",
                "description": "Attend each day of the event",
                "criteria": "80% of days attended"
            },
            "session_based": {
                "type": "Session-Based Attendance",
                "description": "Attend required sessions/rounds",
                "criteria": "75% of sessions attended"
            },
            "milestone_based": {
                "type": "Milestone Attendance",
                "description": "Complete key milestones of the event",
                "criteria": "All mandatory milestones completed"
            },
            "continuous": {
                "type": "Continuous Engagement",
                "description": "Maintain consistent participation",
                "criteria": "90% engagement throughout event"
            }
        }
        
        return requirements.get(strategy, requirements["single_mark"])
    
    def _calculate_progress(self, status: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate attendance progress metrics"""
        total_sessions = len(status.get("sessions", []))
        attended_sessions = len(status.get("sessions_attended", []))
        
        return {
            "sessions_completed": attended_sessions,
            "total_sessions": total_sessions,
            "completion_percentage": (attended_sessions / total_sessions * 100) if total_sessions > 0 else 0,
            "overall_percentage": status.get("overall_percentage", 0),
            "status": status.get("final_status", "pending")
        }
    
    def _get_attendance_recommendations(self, status: Dict[str, Any]) -> List[str]:
        """Get personalized attendance recommendations"""
        recommendations = []
        
        strategy = status.get("attendance_strategy", "single_mark")
        final_status = status.get("final_status", "pending")
        percentage = status.get("overall_percentage", 0)
        
        if final_status == "pending":
            if strategy == "single_mark":
                recommendations.append("Mark your attendance when you arrive at the event")
            else:
                recommendations.append("Start attending sessions to begin your attendance tracking")
                
        elif final_status == "partial":
            if strategy == "day_based":
                recommendations.append(f"Attend remaining days to improve your {percentage}% attendance")
            elif strategy == "session_based":
                recommendations.append(f"Join upcoming sessions to meet the 75% requirement (currently {percentage}%)")
            else:
                recommendations.append("Complete remaining milestones to achieve full attendance")
                
        elif final_status == "present":
            recommendations.append("Great! You've met the attendance requirements")
            
        else:  # absent
            recommendations.append("Contact event organizers if you believe this is an error")
        
        # Add next session recommendation if available
        next_session = status.get("next_session")
        if next_session:
            recommendations.append(f"Next: {next_session['session_name']}")
        
        return recommendations
    
    async def get_attendance_config(self, event_id: str) -> Optional[DynamicAttendanceConfig]:
        """
        Get existing attendance configuration for an event
        """
        try:
            return await self.dynamic_service.get_attendance_config(event_id)
        except Exception as e:
            logger.error(f"Error getting attendance config: {e}")
            return None
    
    async def update_attendance_config(self, event_id: str, 
                                     sessions: Optional[List[AttendanceSession]] = None,
                                     criteria: Optional[AttendanceCriteria] = None) -> Dict[str, Any]:
        """
        Update attendance configuration for an event
        """
        try:
            # Get current configuration
            current_config = await self.dynamic_service.get_attendance_config(event_id)
            if not current_config:
                return {
                    "success": False,
                    "message": "Attendance configuration not found"
                }
            
            # Update sessions if provided
            if sessions is not None:
                current_config.sessions = sessions
            
            # Update criteria if provided
            if criteria is not None:
                current_config.criteria = criteria
            
            # Update timestamp
            current_config.updated_at = datetime.utcnow()
            
            # Save updated configuration
            result = await self.dynamic_service.save_attendance_config(current_config)
            
            if result:
                logger.info(f"Updated attendance configuration for event {event_id}")
                return {
                    "success": True,
                    "message": "Attendance configuration updated successfully",
                    "config": current_config.dict()
                }
            else:
                return {
                    "success": False,
                    "message": "Failed to save updated configuration"
                }
                
        except Exception as e:
            logger.error(f"Error updating attendance config: {e}")
            return {
                "success": False,
                "message": f"Failed to update configuration: {str(e)}"
            }


# Factory function for easy service creation
def create_dynamic_attendance_service() -> IntegratedDynamicAttendanceService:
    """Factory function to create integrated dynamic attendance service"""
    return IntegratedDynamicAttendanceService()
