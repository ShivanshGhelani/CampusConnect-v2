# CampusConnect - Simple Registration Service
# Phase 1 Implementation: Single Collection Approach for 4K University Scale

from datetime import datetime
from typing import Dict, List, Optional, Union
import secrets
import string
from database.operations import DatabaseOperations
from core.id_generator import generate_registration_id
from core.logger import get_logger

logger = get_logger(__name__)

class StudentRegistrationService:
    """
    Simple, efficient registration service using single collection approach.
    Optimized for 4,000 students with ~10,000-15,000 registrations/year.
    """
    
    def __init__(self):
        self.collection = "student_registrations"
        self.events_collection = "events"
        self.students_collection = "students"
    
    async def register_individual_student(self, enrollment_no: str, event_id: str) -> Dict:
        """
        Register individual student for event - Single database write approach
        
        Args:
            enrollment_no: Student enrollment number (e.g., "22BEIT30043")
            event_id: Event identifier (e.g., "EVT001")
            
        Returns:
            Dict with registration result and details
        """
        try:
            logger.info(f"Starting individual registration for {enrollment_no} in event {event_id}")
            
            # Check if already registered
            existing_registration = await self._check_existing_registration(enrollment_no, event_id)
            if existing_registration:
                return {
                    "success": False,
                    "message": "Student is already registered for this event",
                    "registration_id": existing_registration.get("registration_id")
                }
            
            # Get student information
            student_info = await self._get_student_info(enrollment_no)
            if not student_info:
                return {
                    "success": False,
                    "message": "Student not found in system"
                }
            
            # Get event information
            event_info = await self._get_event_info(event_id)
            if not event_info:
                return {
                    "success": False,
                    "message": "Event not found"
                }
            
            # Check event capacity and registration deadline
            capacity_check = await self._check_event_capacity(event_id)
            if not capacity_check["available"]:
                return {
                    "success": False,
                    "message": capacity_check["message"]
                }
            
            # Generate registration ID
            registration_id = generate_registration_id()
            
            # Create complete registration document
            registration_document = await self._create_individual_registration_document(
                enrollment_no, event_id, registration_id, student_info, event_info
            )
            
            # Single database write operation
            result = await DatabaseOperations.insert_one(self.collection, registration_document)
            
            if result.inserted_id:
                logger.info(f"Individual registration successful: {registration_id}")
                
                # Update event registration count
                await self._update_event_registration_count(event_id, 1)
                
                return {
                    "success": True,
                    "message": "Registration successful",
                    "registration_id": registration_id,
                    "registration_data": {
                        "student_name": student_info["full_name"],
                        "event_name": event_info["event_name"],
                        "event_date": event_info["start_datetime"].date().isoformat(),
                        "registration_type": "individual"
                    }
                }
            else:
                logger.error(f"Failed to insert registration for {enrollment_no}")
                return {
                    "success": False,
                    "message": "Registration failed due to database error"
                }
                
        except Exception as e:
            logger.error(f"Registration error for {enrollment_no}: {str(e)}")
            return {
                "success": False,
                "message": "Registration failed due to system error"
            }
    
    async def register_team(self, team_leader_enrollment: str, event_id: str, team_data: Dict) -> Dict:
        """
        Register team for event with leader and members
        
        Args:
            team_leader_enrollment: Team leader's enrollment number
            event_id: Event identifier
            team_data: Dict containing team_name, member_enrollments list
            
        Returns:
            Dict with registration result and team details
        """
        try:
            logger.info(f"Starting team registration for leader {team_leader_enrollment} in event {event_id}")
            
            # Validate team data
            validation_result = await self._validate_team_data(team_data, event_id)
            if not validation_result["valid"]:
                return {
                    "success": False,
                    "message": validation_result["message"]
                }
            
            # Get event info to check team requirements
            event_info = await self._get_event_info(event_id)
            if not event_info:
                return {
                    "success": False,
                    "message": "Event not found"
                }
            
            # Check if event allows teams
            if not event_info.get("allows_teams", False):
                return {
                    "success": False,
                    "message": "This event does not allow team registrations"
                }
            
            # Validate team size
            team_size = len(team_data.get("member_enrollments", [])) + 1  # +1 for leader
            min_team_size = event_info.get("min_team_size", 2)
            max_team_size = event_info.get("max_team_size", 5)
            
            if team_size < min_team_size or team_size > max_team_size:
                return {
                    "success": False,
                    "message": f"Team size must be between {min_team_size} and {max_team_size} members"
                }
            
            # Check if any team member is already registered
            all_members = [team_leader_enrollment] + team_data.get("member_enrollments", [])
            existing_registrations = await self._check_team_members_registration(all_members, event_id)
            
            if existing_registrations:
                return {
                    "success": False,
                    "message": f"Some team members are already registered: {', '.join(existing_registrations)}"
                }
            
            # Generate team ID
            team_id = await self._generate_team_id(event_id)
            
            # Create registration documents for all team members
            registration_results = []
            
            for member_enrollment in all_members:
                is_leader = (member_enrollment == team_leader_enrollment)
                
                # Get member info
                member_info = await self._get_student_info(member_enrollment)
                if not member_info:
                    return {
                        "success": False,
                        "message": f"Team member not found: {member_enrollment}"
                    }
                
                # Generate registration ID
                registration_id = generate_registration_id()
                
                # Create registration document
                registration_document = await self._create_team_registration_document(
                    member_enrollment, event_id, registration_id, member_info, 
                    event_info, team_id, team_data, is_leader
                )
                
                # Insert registration
                result = await DatabaseOperations.insert_one(self.collection, registration_document)
                
                if result.inserted_id:
                    registration_results.append({
                        "enrollment_no": member_enrollment,
                        "registration_id": registration_id,
                        "name": member_info["full_name"],
                        "is_leader": is_leader
                    })
                else:
                    # Rollback previous registrations if any member fails
                    await self._rollback_team_registrations(registration_results, team_id)
                    return {
                        "success": False,
                        "message": f"Registration failed for team member: {member_enrollment}"
                    }
            
            # Update event registration count
            await self._update_event_registration_count(event_id, len(all_members))
            
            logger.info(f"Team registration successful: {team_id}")
            
            return {
                "success": True,
                "message": "Team registration successful",
                "team_id": team_id,
                "team_data": {
                    "team_name": team_data["team_name"],
                    "team_leader": team_leader_enrollment,
                    "event_name": event_info["event_name"],
                    "event_date": event_info["start_datetime"].date().isoformat(),
                    "total_members": len(all_members),
                    "registration_details": registration_results
                }
            }
            
        except Exception as e:
            logger.error(f"Team registration error: {str(e)}")
            return {
                "success": False,
                "message": "Team registration failed due to system error"
            }
    
    async def get_registration_status(self, enrollment_no: str, event_id: str) -> Dict:
        """
        Get complete registration status for student in event - Single query approach
        
        Args:
            enrollment_no: Student enrollment number
            event_id: Event identifier
            
        Returns:
            Dict with complete registration status
        """
        try:
            registration = await DatabaseOperations.find_one(
                self.collection,
                {
                    "student.enrollment_no": enrollment_no,
                    "event.event_id": event_id
                }
            )
            
            if not registration:
                return {
                    "registered": False,
                    "message": "No registration found"
                }
            
            # Prepare comprehensive status
            status_data = {
                "registered": True,
                "registration_id": registration["registration_id"],
                "registration_type": registration["registration"]["type"],
                "registered_at": registration["registration"]["registered_at"],
                "status": registration["registration"]["status"],
                "student_info": registration["student"],
                "event_info": registration["event"],
                "attendance": {
                    "virtual_confirmed": registration.get("attendance", {}).get("virtual_confirmation", {}).get("confirmed", False),
                    "physical_status": registration.get("attendance", {}).get("final_status", "pending"),
                    "sessions_attended": self._count_attended_sessions(registration.get("attendance", {}))
                },
                "feedback": {
                    "submitted": registration.get("feedback", {}).get("submitted", False),
                    "eligible": registration.get("attendance", {}).get("final_status") == "present"
                },
                "certificate": {
                    "eligible": registration.get("certificate", {}).get("eligible", False),
                    "issued": registration.get("certificate", {}).get("issued", False)
                }
            }
            
            # Add team info if applicable
            if registration["registration"]["type"] in ["team_leader", "team_member"]:
                status_data["team_info"] = {
                    "team_id": registration.get("team", {}).get("team_id"),
                    "team_name": registration.get("team", {}).get("team_name"),
                    "is_leader": registration["registration"]["type"] == "team_leader",
                    "role": registration.get("team", {}).get("role", "Member"),
                    "tasks_assigned": len(registration.get("tasks", {}).get("task_list", [])),
                    "tasks_completed": self._count_completed_tasks(registration.get("tasks", {}))
                }
            
            return status_data
            
        except Exception as e:
            logger.error(f"Error getting registration status: {str(e)}")
            return {
                "registered": False,
                "message": "Error retrieving registration status"
            }
    
    async def cancel_registration(self, enrollment_no: str, event_id: str, reason: str = "User requested") -> Dict:
        """
        Cancel student registration for event
        
        Args:
            enrollment_no: Student enrollment number
            event_id: Event identifier
            reason: Cancellation reason
            
        Returns:
            Dict with cancellation result
        """
        try:
            # Find registration
            registration = await DatabaseOperations.find_one(
                self.collection,
                {
                    "student.enrollment_no": enrollment_no,
                    "event.event_id": event_id,
                    "registration.status": "active"
                }
            )
            
            if not registration:
                return {
                    "success": False,
                    "message": "Active registration not found"
                }
            
            # Check if cancellation is allowed
            event_info = await self._get_event_info(event_id)
            if event_info:
                cancellation_deadline = event_info.get("cancellation_deadline")
                if cancellation_deadline and datetime.utcnow() > cancellation_deadline:
                    return {
                        "success": False,
                        "message": "Cancellation deadline has passed"
                    }
            
            # Update registration status
            result = await DatabaseOperations.update_one(
                self.collection,
                {"registration_id": registration["registration_id"]},
                {
                    "$set": {
                        "registration.status": "cancelled",
                        "registration.cancelled_at": datetime.utcnow(),
                        "registration.cancellation_reason": reason
                    }
                }
            )
            
            if result.modified_count > 0:
                # Update event registration count
                await self._update_event_registration_count(event_id, -1)
                
                logger.info(f"Registration cancelled: {registration['registration_id']}")
                
                return {
                    "success": True,
                    "message": "Registration cancelled successfully",
                    "registration_id": registration["registration_id"]
                }
            else:
                return {
                    "success": False,
                    "message": "Failed to cancel registration"
                }
                
        except Exception as e:
            logger.error(f"Error cancelling registration: {str(e)}")
            return {
                "success": False,
                "message": "Cancellation failed due to system error"
            }
    
    # Private helper methods
    
    async def _check_existing_registration(self, enrollment_no: str, event_id: str) -> Optional[Dict]:
        """Check if student is already registered for event"""
        return await DatabaseOperations.find_one(
            self.collection,
            {
                "student.enrollment_no": enrollment_no,
                "event.event_id": event_id,
                "registration.status": {"$in": ["active", "completed"]}
            }
        )
    
    async def _get_student_info(self, enrollment_no: str) -> Optional[Dict]:
        """Get student information from students collection"""
        return await DatabaseOperations.find_one(
            self.students_collection,
            {"enrollment_no": enrollment_no}
        )
    
    async def _get_event_info(self, event_id: str) -> Optional[Dict]:
        """Get event information from events collection"""
        return await DatabaseOperations.find_one(
            self.events_collection,
            {"event_id": event_id}
        )
    
    async def _check_event_capacity(self, event_id: str) -> Dict:
        """Check if event has available capacity"""
        event_info = await self._get_event_info(event_id)
        if not event_info:
            return {"available": False, "message": "Event not found"}
        
        max_participants = event_info.get("max_participants")
        if not max_participants:
            return {"available": True, "message": "No capacity limit"}
        
        current_count = await DatabaseOperations.count_documents(
            self.collection,
            {
                "event.event_id": event_id,
                "registration.status": "active"
            }
        )
        
        if current_count >= max_participants:
            return {"available": False, "message": "Event is full"}
        
        return {"available": True, "message": f"Available slots: {max_participants - current_count}"}
    
    async def _create_individual_registration_document(self, enrollment_no: str, event_id: str, 
                                                     registration_id: str, student_info: Dict, 
                                                     event_info: Dict) -> Dict:
        """Create complete registration document for individual registration"""
        return {
            "_id": f"REG_{enrollment_no}_{event_id}",
            "registration_id": registration_id,
            "student": {
                "enrollment_no": enrollment_no,
                "name": student_info["full_name"],
                "email": student_info["email"],
                "department": student_info["department"],
                "semester": student_info.get("semester", 0),
                "phone": student_info.get("phone", "")
            },
            "event": {
                "event_id": event_id,
                "event_name": event_info["event_name"],
                "event_date": event_info["start_datetime"].date().isoformat(),
                "organizer": event_info["organizing_department"],
                "event_type": event_info.get("event_type", "general"),
                "duration_days": event_info.get("duration_days", 1)
            },
            "registration": {
                "type": "individual",
                "registered_at": datetime.utcnow(),
                "status": "active",
                "confirmation_status": "pending"
            },
            "team": {},  # Empty for individual registrations
            "attendance": {
                "virtual_confirmation": {
                    "confirmed": False,
                    "confirmed_at": None
                },
                "physical_sessions": {},
                "final_status": "pending"
            },
            "tasks": {
                "task_list": []
            },
            "feedback": {
                "submitted": False,
                "eligible": False,
                "rating": None,
                "comments": None,
                "submitted_at": None
            },
            "certificate": {
                "eligible": False,
                "issued": False,
                "certificate_id": None,
                "issued_at": None,
                "certificate_url": None
            },
            "device_tracking": {
                "registration_device": "",
                "attendance_devices": [],
                "last_activity": datetime.utcnow()
            }
        }
    
    async def _create_team_registration_document(self, enrollment_no: str, event_id: str, 
                                               registration_id: str, member_info: Dict, 
                                               event_info: Dict, team_id: str, 
                                               team_data: Dict, is_leader: bool) -> Dict:
        """Create complete registration document for team member"""
        # Get base document
        document = await self._create_individual_registration_document(
            enrollment_no, event_id, registration_id, member_info, event_info
        )
        
        # Update for team registration
        document["registration"]["type"] = "team_leader" if is_leader else "team_member"
        
        # Add team information
        document["team"] = {
            "team_id": team_id,
            "team_name": team_data["team_name"],
            "team_leader": team_data.get("team_leader", ""),
            "role": "Team Leader" if is_leader else "Member",
            "members": team_data.get("member_enrollments", []),
            "message_board": []
        }
        
        return document
    
    async def _validate_team_data(self, team_data: Dict, event_id: str) -> Dict:
        """Validate team registration data"""
        if not team_data.get("team_name"):
            return {"valid": False, "message": "Team name is required"}
        
        if not team_data.get("member_enrollments"):
            return {"valid": False, "message": "At least one team member is required"}
        
        # Check for duplicate enrollments in team
        enrollments = team_data["member_enrollments"]
        if len(enrollments) != len(set(enrollments)):
            return {"valid": False, "message": "Duplicate team members not allowed"}
        
        # Check if team name is already taken for this event
        existing_team = await DatabaseOperations.find_one(
            self.collection,
            {
                "event.event_id": event_id,
                "team.team_name": team_data["team_name"],
                "registration.status": "active"
            }
        )
        
        if existing_team:
            return {"valid": False, "message": "Team name already exists for this event"}
        
        return {"valid": True, "message": "Valid team data"}
    
    async def _check_team_members_registration(self, member_enrollments: List[str], event_id: str) -> List[str]:
        """Check if any team members are already registered"""
        existing_registrations = await DatabaseOperations.find_many(
            self.collection,
            {
                "student.enrollment_no": {"$in": member_enrollments},
                "event.event_id": event_id,
                "registration.status": "active"
            },
            projection={"student.enrollment_no": 1}
        )
        
        return [reg["student"]["enrollment_no"] for reg in existing_registrations]
    
    async def _generate_team_id(self, event_id: str) -> str:
        """Generate unique team ID for event"""
        # Count existing teams for this event
        team_count = await DatabaseOperations.count_documents(
            self.collection,
            {
                "event.event_id": event_id,
                "registration.type": "team_leader",
                "registration.status": "active"
            }
        )
        
        return f"TEAM_{event_id}_{str(team_count + 1).zfill(3)}"
    
    async def _rollback_team_registrations(self, successful_registrations: List[Dict], team_id: str):
        """Rollback team registrations if any member fails"""
        for reg in successful_registrations:
            await DatabaseOperations.delete_one(
                self.collection,
                {"registration_id": reg["registration_id"]}
            )
        logger.warning(f"Rolled back {len(successful_registrations)} registrations for team {team_id}")
    
    async def _update_event_registration_count(self, event_id: str, change: int):
        """Update event registration count"""
        await DatabaseOperations.update_one(
            self.events_collection,
            {"event_id": event_id},
            {"$inc": {"current_registrations": change}}
        )
    
    def _count_attended_sessions(self, attendance_data: Dict) -> int:
        """Count number of sessions attended"""
        physical_sessions = attendance_data.get("physical_sessions", {})
        return sum(1 for session in physical_sessions.values() if session.get("marked", False))
    
    def _count_completed_tasks(self, tasks_data: Dict) -> int:
        """Count completed tasks"""
        task_list = tasks_data.get("task_list", [])
        return sum(1 for task in task_list if task.get("status") == "completed")
