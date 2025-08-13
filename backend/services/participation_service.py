"""
Student Event Participation Service
===================================
Unified service for managing student-event relationships following the simplified architecture.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
from database.operations import DatabaseOperations
from models.participation import (
    StudentEventParticipation, CreateParticipation, ParticipationResponse,
    ParticipationStats, SimplifiedEventStats, StudentInfo, EventInfo,
    RegistrationDetails, TeamInfo, RegistrationType, ParticipationStage
)
from core.id_generator import generate_registration_id
from core.logger import get_logger
import secrets
import string

logger = get_logger(__name__)

class StudentEventParticipationService:
    """
    Unified service for managing student-event participations.
    Replaces the complex nested dictionary approach with a clean, single-document-per-relationship model.
    """
    
    def __init__(self):
        self.collection = "student_event_participations"
        self.events_collection = "events"
        self.students_collection = "students"
    
    def _generate_participation_id(self, enrollment_no: str, event_id: str) -> str:
        """Generate unique participation ID"""
        random_suffix = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
        return f"PART_{enrollment_no}_{event_id}_{random_suffix}"
    
    def _generate_composite_id(self, enrollment_no: str, event_id: str) -> str:
        """Generate composite ID for MongoDB document"""
        return f"{enrollment_no}_{event_id}"
    
    async def create_participation(self, create_data: CreateParticipation) -> Dict[str, Any]:
        """
        Create a new student-event participation.
        This replaces the old complex registration tracking in events collection.
        """
        try:
            logger.info(f"Creating participation for {create_data.enrollment_no} in event {create_data.event_id}")
            
            # Check if participation already exists
            composite_id = self._generate_composite_id(create_data.enrollment_no, create_data.event_id)
            existing = await DatabaseOperations.find_one(self.collection, {"_id": composite_id})
            
            if existing:
                return {
                    "success": False,
                    "message": "Student is already registered for this event",
                    "participation_id": existing.get("participation_id")
                }
            
            # Get student information
            student_data = await DatabaseOperations.find_one(
                self.students_collection, 
                {"enrollment_no": create_data.enrollment_no}
            )
            if not student_data:
                return {"success": False, "message": "Student not found"}
            
            # Get event information
            event_data = await DatabaseOperations.find_one(
                self.events_collection,
                {"event_id": create_data.event_id}
            )
            if not event_data:
                return {"success": False, "message": "Event not found"}
            
            # Create student info
            student_info = StudentInfo(
                enrollment_no=student_data["enrollment_no"],
                full_name=student_data["full_name"],
                email=student_data["email"],
                department=student_data["department"],
                semester=student_data["semester"]
            )
            
            # Create event info
            event_info = EventInfo(
                event_id=event_data["event_id"],
                event_name=event_data["event_name"],
                event_type=event_data["event_type"],
                organizing_department=event_data["organizing_department"],
                start_datetime=event_data["start_datetime"],
                end_datetime=event_data["end_datetime"],
                is_certificate_based=event_data.get("is_certificate_based", False)
            )
            
            # Generate IDs
            participation_id = self._generate_participation_id(create_data.enrollment_no, create_data.event_id)
            registration_id = generate_registration_id(create_data.enrollment_no, create_data.event_id, student_data["full_name"])
            
            # Create registration details
            registration_details = RegistrationDetails(
                registration_id=registration_id,
                type=create_data.registration_type,
                registered_at=datetime.utcnow(),
                status="active"
            )
            
            # Create team info if applicable
            team_info = None
            if create_data.team_name:
                team_info = TeamInfo(
                    team_name=create_data.team_name,
                    team_id=create_data.team_id or f"TEAM_{create_data.team_name}_{create_data.event_id}",
                    is_leader=create_data.is_team_leader,
                    team_size=1,  # Will be updated when more members join
                    leader_enrollment=create_data.enrollment_no if create_data.is_team_leader else ""
                )
            
            # Initialize attendance based on event's attendance strategy
            attendance_tracking = self._initialize_attendance_tracking(event_data)
            
            # Create participation document
            participation = StudentEventParticipation(
                _id=composite_id,
                participation_id=participation_id,
                student=student_info,
                event=event_info,
                registration=registration_details,
                team=team_info,
                attendance=attendance_tracking
            )
            
            # Save to database
            result = await DatabaseOperations.insert_one(
                self.collection,
                participation.model_dump()
            )
            
            if result:
                # Update event statistics
                await self._update_event_stats(create_data.event_id)
                
                logger.info(f"Successfully created participation {participation_id}")
                return {
                    "success": True,
                    "message": "Registration successful",
                    "participation_id": participation_id,
                    "registration_id": registration_id
                }
            else:
                return {"success": False, "message": "Failed to create participation"}
                
        except Exception as e:
            logger.error(f"Error creating participation: {str(e)}")
            return {"success": False, "message": f"Registration failed: {str(e)}"}
    
    def _initialize_attendance_tracking(self, event_data: Dict) -> Any:
        """Initialize attendance tracking based on event's attendance strategy"""
        from models.participation import AttendanceTracking, AttendanceSession
        
        sessions = []
        
        # Get attendance sessions from event data
        if "attendance_sessions" in event_data:
            for session_data in event_data["attendance_sessions"]:
                session = AttendanceSession(
                    session_id=session_data["session_id"],
                    session_name=session_data["session_name"],
                    marked=False
                )
                sessions.append(session)
        
        return AttendanceTracking(
            strategy=event_data.get("attendance_strategy", "single_mark"),
            sessions=sessions,
            total_percentage=0.0,
            is_eligible=False
        )
    
    async def get_participation(self, enrollment_no: str, event_id: str) -> Optional[Dict]:
        """Get student participation for an event"""
        try:
            composite_id = self._generate_composite_id(enrollment_no, event_id)
            participation = await DatabaseOperations.find_one(
                self.collection,
                {"_id": composite_id}
            )
            return participation
        except Exception as e:
            logger.error(f"Error getting participation: {str(e)}")
            return None
    
    async def get_student_participations(self, enrollment_no: str) -> List[Dict]:
        """Get all participations for a student"""
        try:
            participations = await DatabaseOperations.find_many(
                self.collection,
                {"student.enrollment_no": enrollment_no}
            )
            return participations
        except Exception as e:
            logger.error(f"Error getting student participations: {str(e)}")
            return []
    
    async def get_event_participations(self, event_id: str, page: int = 1, limit: int = 50) -> Dict:
        """Get all participations for an event with pagination"""
        try:
            skip = (page - 1) * limit
            
            participations = await DatabaseOperations.find_many(
                self.collection,
                {"event.event_id": event_id},
                skip=skip,
                limit=limit
            )
            
            total_count = await DatabaseOperations.count_documents(
                self.collection,
                {"event.event_id": event_id}
            )
            
            return {
                "participations": participations,
                "total_count": total_count,
                "page": page,
                "limit": limit,
                "has_more": skip + limit < total_count
            }
        except Exception as e:
            logger.error(f"Error getting event participations: {str(e)}")
            return {"participations": [], "total_count": 0, "page": page, "limit": limit, "has_more": False}
    
    async def update_participation_stage(self, participation_id: str, new_stage: ParticipationStage) -> bool:
        """Update participation lifecycle stage"""
        try:
            participation = await DatabaseOperations.find_one(
                self.collection,
                {"participation_id": participation_id}
            )
            
            if not participation:
                return False
            
            # Update lifecycle
            stages_completed = participation.get("lifecycle", {}).get("stages_completed", [])
            
            stage_progression = {
                ParticipationStage.REGISTERED: ["registration"],
                ParticipationStage.ATTENDING: ["registration", "attending"],
                ParticipationStage.FEEDBACK_PENDING: ["registration", "attending", "feedback_pending"],
                ParticipationStage.CERTIFICATE_ELIGIBLE: ["registration", "attending", "feedback_pending", "certificate_eligible"],
                ParticipationStage.COMPLETED: ["registration", "attending", "feedback_pending", "certificate_eligible", "completed"]
            }
            
            # Calculate completion percentage
            completion_percentages = {
                ParticipationStage.REGISTERED: 20,
                ParticipationStage.ATTENDING: 40,
                ParticipationStage.FEEDBACK_PENDING: 60,
                ParticipationStage.CERTIFICATE_ELIGIBLE: 80,
                ParticipationStage.COMPLETED: 100
            }
            
            # Determine next action
            next_actions = {
                ParticipationStage.REGISTERED: "mark_attendance",
                ParticipationStage.ATTENDING: "submit_feedback",
                ParticipationStage.FEEDBACK_PENDING: "check_certificate_eligibility",
                ParticipationStage.CERTIFICATE_ELIGIBLE: "download_certificate",
                ParticipationStage.COMPLETED: "event_completed"
            }
            
            update_data = {
                "lifecycle.current_stage": new_stage.value,
                "lifecycle.stages_completed": stage_progression[new_stage],
                "lifecycle.completion_percentage": completion_percentages[new_stage],
                "lifecycle.next_action": next_actions[new_stage],
                "updated_at": datetime.utcnow()
            }
            
            result = await DatabaseOperations.update_one(
                self.collection,
                {"participation_id": participation_id},
                {"$set": update_data}
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error updating participation stage: {str(e)}")
            return False
    
    async def _update_event_stats(self, event_id: str) -> None:
        """Update simplified event statistics"""
        try:
            # Get participation stats
            stats = await self.get_participation_stats(event_id)
            
            # Update events collection with simplified stats
            simplified_stats = SimplifiedEventStats(
                individual_count=stats.individual_registrations,
                team_count=stats.team_registrations,
                total_participants=stats.total_participants,
                attendance_marked=stats.attendance_marked,
                feedback_submitted=stats.feedback_submitted,
                certificates_issued=stats.certificates_issued,
                last_updated=datetime.utcnow()
            )
            
            await DatabaseOperations.update_one(
                self.events_collection,
                {"event_id": event_id},
                {"$set": {"registration_stats": simplified_stats.model_dump()}}
            )
            
        except Exception as e:
            logger.error(f"Error updating event stats: {str(e)}")
    
    async def get_participation_stats(self, event_id: str) -> ParticipationStats:
        """Get comprehensive participation statistics for an event"""
        try:
            # Get all participations for event
            participations = await DatabaseOperations.find_many(
                self.collection,
                {"event.event_id": event_id}
            )
            
            stats = ParticipationStats()
            
            for participation in participations:
                stats.total_participants += 1
                
                # Count registration types
                reg_type = participation.get("registration", {}).get("type", "individual")
                if reg_type == "individual":
                    stats.individual_registrations += 1
                elif reg_type in ["team_leader", "team_member"]:
                    stats.team_registrations += 1
                
                # Count lifecycle stages
                current_stage = participation.get("lifecycle", {}).get("current_stage", "registered")
                if current_stage == "registered":
                    stats.registered += 1
                elif current_stage == "attending":
                    stats.attending += 1
                elif current_stage == "feedback_pending":
                    stats.feedback_pending += 1
                elif current_stage == "certificate_eligible":
                    stats.certificate_eligible += 1
                elif current_stage == "completed":
                    stats.completed += 1
                
                # Count specific actions
                if participation.get("attendance", {}).get("total_percentage", 0) > 0:
                    stats.attendance_marked += 1
                
                if participation.get("feedback", {}).get("submitted", False):
                    stats.feedback_submitted += 1
                
                if participation.get("certificate", {}).get("issued", False):
                    stats.certificates_issued += 1
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting participation stats: {str(e)}")
            return ParticipationStats()
    
    async def mark_attendance(self, participation_id: str, session_id: str, attendance_id: str) -> bool:
        """Mark attendance for a specific session"""
        try:
            # Update the specific session
            result = await DatabaseOperations.update_one(
                self.collection,
                {
                    "participation_id": participation_id,
                    "attendance.sessions.session_id": session_id
                },
                {
                    "$set": {
                        "attendance.sessions.$.marked": True,
                        "attendance.sessions.$.marked_at": datetime.utcnow(),
                        "attendance.sessions.$.attendance_id": attendance_id,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            if result:
                # Recalculate attendance percentage
                await self._recalculate_attendance_percentage(participation_id)
                
            return result
            
        except Exception as e:
            logger.error(f"Error marking attendance: {str(e)}")
            return False
    
    async def _recalculate_attendance_percentage(self, participation_id: str) -> None:
        """Recalculate attendance percentage and eligibility"""
        try:
            participation = await DatabaseOperations.find_one(
                self.collection,
                {"participation_id": participation_id}
            )
            
            if not participation:
                return
            
            sessions = participation.get("attendance", {}).get("sessions", [])
            if not sessions:
                return
            
            attended_sessions = sum(1 for session in sessions if session.get("marked", False))
            total_sessions = len(sessions)
            percentage = (attended_sessions / total_sessions) * 100 if total_sessions > 0 else 0
            
            # Check eligibility (default 75% required)
            required_percentage = 75.0  # Could be made configurable per event
            is_eligible = percentage >= required_percentage
            
            update_data = {
                "attendance.total_percentage": percentage,
                "attendance.is_eligible": is_eligible,
                "attendance.attendance_summary": {
                    "total_sessions": total_sessions,
                    "attended_sessions": attended_sessions,
                    "required_percentage": required_percentage,
                    "actual_percentage": percentage
                },
                "updated_at": datetime.utcnow()
            }
            
            await DatabaseOperations.update_one(
                self.collection,
                {"participation_id": participation_id},
                {"$set": update_data}
            )
            
        except Exception as e:
            logger.error(f"Error recalculating attendance percentage: {str(e)}")
    
    async def get_event_statistics(self, event_id: str) -> Dict[str, Any]:
        """Get comprehensive statistics for an event"""
        try:
            # Get all participations for the event
            participations = await DatabaseOperations.find_many(
                self.collection,
                {"event_id": event_id}
            )
            
            # Calculate statistics
            stats = {
                "total_participants": len(participations),
                "individual_count": len([p for p in participations if p.get("registration", {}).get("type") == "individual"]),
                "team_count": len([p for p in participations if p.get("registration", {}).get("type") in ["team_leader", "team_member"]]),
                "team_leaders": len([p for p in participations if p.get("registration", {}).get("type") == "team_leader"]),
                "attendance_marked": len([p for p in participations if p.get("attendance", {}).get("is_eligible", False)]),
                "feedback_submitted": len([p for p in participations if p.get("feedback", {}).get("submitted", False)]),
                "certificates_issued": len([p for p in participations if p.get("certificate", {}).get("issued", False)])
            }
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting event statistics: {str(e)}")
            return {}
    
    async def update_event_registration_stats(self, event_id: str) -> Dict[str, Any]:
        """Update event's registration_stats based on current participations"""
        try:
            stats = await self.get_event_statistics(event_id)
            
            # Update the event's registration_stats
            registration_stats = {
                "individual_count": stats["individual_count"],
                "team_count": stats["team_leaders"],  # Count unique teams by team leaders
                "total_participants": stats["total_participants"],
                "attendance_marked": stats["attendance_marked"],
                "feedback_submitted": stats["feedback_submitted"],
                "certificates_issued": stats["certificates_issued"],
                "last_updated": datetime.utcnow()
            }
            
            await DatabaseOperations.update_one(
                "events",
                {"event_id": event_id},
                {"$set": {"registration_stats": registration_stats}}
            )
            
            return {"success": True, "stats": registration_stats}
            
        except Exception as e:
            logger.error(f"Error updating event registration stats: {str(e)}")
            return {"success": False, "message": str(e)}
    
    async def get_student_participations(self, enrollment_no: str, include_details: bool = False) -> List[Dict[str, Any]]:
        """Get all participations for a student"""
        try:
            query = {"student.enrollment_no": enrollment_no}
            
            participations = await DatabaseOperations.find_many(
                self.collection,
                query
            )
            
            if include_details:
                # Enrich with event details
                for participation in participations:
                    event = await DatabaseOperations.find_one(
                        "events",
                        {"event_id": participation["event"]["event_id"]}
                    )
                    if event:
                        participation["event_details"] = {
                            "title": event.get("title"),
                            "description": event.get("description"),
                            "start_date": event.get("start_date"),
                            "end_date": event.get("end_date"),
                            "venue": event.get("venue")
                        }
            
            return participations
            
        except Exception as e:
            logger.error(f"Error getting student participations: {str(e)}")
            return []
    
    async def get_participation_by_id(self, participation_id: str) -> Optional[Dict[str, Any]]:
        """Get a participation by its ID"""
        try:
            return await DatabaseOperations.find_one(
                self.collection,
                {"participation_id": participation_id}
            )
        except Exception as e:
            logger.error(f"Error getting participation by ID: {str(e)}")
            return None
    
    async def get_participations_with_pagination(self, query: Dict, skip: int, limit: int) -> List[Dict[str, Any]]:
        """Get participations with pagination"""
        try:
            return await DatabaseOperations.find_many_with_pagination(
                self.collection,
                query,
                skip=skip,
                limit=limit,
                sort_by="created_at",
                sort_order=-1
            )
        except Exception as e:
            logger.error(f"Error getting participations with pagination: {str(e)}")
            return []
    
    async def count_participations(self, query: Dict) -> int:
        """Count participations matching a query"""
        try:
            return await DatabaseOperations.count_documents(self.collection, query)
        except Exception as e:
            logger.error(f"Error counting participations: {str(e)}")
            return 0
    
    async def get_participations_by_query(self, query: Dict) -> List[Dict[str, Any]]:
        """Get participations by custom query"""
        try:
            return await DatabaseOperations.find_many(self.collection, query)
        except Exception as e:
            logger.error(f"Error getting participations by query: {str(e)}")
            return []

# Global service instance
participation_service = StudentEventParticipationService()
