# CampusConnect - Enhanced Registration Service
# Phase 1.5: Multiple Team Registration Support
# Supports complex team participation scenarios with event-level configuration

from datetime import datetime
from typing import Dict, List, Optional, Union
import secrets
import string
from database.operations import DatabaseOperations
from core.id_generator import generate_registration_id
from core.logger import get_logger

logger = get_logger(__name__)

class EnhancedStudentRegistrationService:
    """
    Enhanced registration service supporting multiple team participation.
    Handles event-level 'allow_multiple_team_registrations' configuration.
    """
    
    def __init__(self):
        self.collection = "student_registrations"
        self.events_collection = "events"
        self.students_collection = "students"
    
    async def register_individual_student(self, enrollment_no: str, event_id: str) -> Dict:
        """
        Register individual student for event - Enhanced with team conflict checking
        """
        try:
            logger.info(f"Starting individual registration for {enrollment_no} in event {event_id}")
            
            # Check if already registered (any type)
            existing_registration = await self._check_any_existing_registration(enrollment_no, event_id)
            if existing_registration:
                reg_type = existing_registration.get("registration", {}).get("type", "unknown")
                return {
                    "success": False,
                    "message": f"Student is already registered as {reg_type} for this event",
                    "registration_id": existing_registration.get("registration_id")
                }
            
            # Get student and event information
            student_info = await self._get_student_info(enrollment_no)
            if not student_info:
                return {"success": False, "message": "Student not found in system"}
            
            event_info = await self._get_event_info(event_id)
            if not event_info:
                return {"success": False, "message": "Event not found"}
            
            # Check if event allows individual registration
            registration_mode = event_info.get("registration_mode", "individual")
            if registration_mode == "team":
                return {
                    "success": False,
                    "message": "This event only allows team registrations"
                }
            
            # Check event capacity
            capacity_check = await self._check_event_capacity(event_id)
            if not capacity_check["available"]:
                return {"success": False, "message": capacity_check["message"]}
            
            # Generate registration ID and create document
            registration_id = generate_registration_id(enrollment_no, event_id, student_info.get("name", "Unknown"))
            registration_document = await self._create_individual_registration_document(
                enrollment_no, event_id, registration_id, student_info, event_info
            )
            
            # Insert registration
            result = await DatabaseOperations.insert_one(self.collection, registration_document)
            
            if result:
                logger.info(f"Individual registration successful: {registration_id}")
                await self._update_event_registration_count(event_id, 1)
                
                return {
                    "success": True,
                    "message": "Registration successful",
                    "registration_id": registration_id,
                    "registration_data": {
                        "student_name": student_info.get("name", "Unknown"),
                        "event_name": event_info["event_name"],
                        "registration_type": "individual"
                    }
                }
            else:
                return {"success": False, "message": "Registration failed due to database error"}
                
        except Exception as e:
            logger.error(f"Individual registration error: {str(e)}")
            return {"success": False, "message": "Registration failed due to system error"}
    
    async def register_team(self, team_leader_enrollment: str, event_id: str, team_data: Dict) -> Dict:
        """
        Enhanced team registration with multiple team participation support
        
        Logic:
        - If allow_multiple_team_registrations = False: Standard single team per event
        - If allow_multiple_team_registrations = True: Multiple teams allowed with constraints:
          * Team leader can only lead ONE team per event
          * Team members can join multiple teams in same event
          * Cannot be both leader and member in same event
        """
        try:
            logger.info(f"Starting team registration for leader {team_leader_enrollment} in event {event_id}")
            
            # Get event information first
            event_info = await self._get_event_info(event_id)
            if not event_info:
                return {"success": False, "message": "Event not found"}
            
            # Check if event allows team registration
            registration_mode = event_info.get("registration_mode", "individual")
            if registration_mode == "individual":
                return {"success": False, "message": "This event only allows individual registrations"}
            
            # Get multiple team registration setting
            allow_multiple_teams = event_info.get("allow_multiple_team_registrations", False)
            
            # Validate team data
            validation_result = await self._validate_team_data(team_data, event_info)
            if not validation_result["valid"]:
                return {"success": False, "message": validation_result["message"]}
            
            # Prepare all team members list
            all_members = [team_leader_enrollment] + team_data.get("member_enrollments", [])
            
            # Enhanced registration conflict checking
            conflict_check = await self._check_team_registration_conflicts(
                all_members, team_leader_enrollment, event_id, allow_multiple_teams
            )
            
            if not conflict_check["allowed"]:
                return {"success": False, "message": conflict_check["message"]}
            
            # Validate all team members exist
            for member_enrollment in all_members:
                member_info = await self._get_student_info(member_enrollment)
                if not member_info:
                    return {
                        "success": False,
                        "message": f"Team member not found: {member_enrollment}"
                    }
            
            # Check event capacity
            capacity_check = await self._check_event_capacity(event_id, len(all_members))
            if not capacity_check["available"]:
                return {"success": False, "message": capacity_check["message"]}
            
            # Generate team ID
            team_id = await self._generate_team_id(event_id)
            
            # Create registration documents for all team members
            registration_results = []
            
            for member_enrollment in all_members:
                is_leader = (member_enrollment == team_leader_enrollment)
                
                # Get member info
                member_info = await self._get_student_info(member_enrollment)
                
                # Generate registration ID
                registration_id = generate_registration_id(member_enrollment, event_id, member_info.get("name", "Unknown"))
                
                # Create registration document
                registration_document = await self._create_team_registration_document(
                    member_enrollment, event_id, registration_id, member_info, 
                    event_info, team_data, team_id, is_leader, team_leader_enrollment
                )
                
                # Insert registration
                result = await DatabaseOperations.insert_one(self.collection, registration_document)
                
                if result:
                    registration_results.append({
                        "enrollment_no": member_enrollment,
                        "registration_id": registration_id,
                        "name": member_info.get("name", "Unknown"),
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
                    "total_members": len(all_members),
                    "multiple_teams_allowed": allow_multiple_teams,
                    "registration_details": registration_results
                }
            }
            
        except Exception as e:
            logger.error(f"Team registration error: {str(e)}")
            return {"success": False, "message": "Team registration failed due to system error"}
    
    async def _check_team_registration_conflicts(self, all_members: List[str], 
                                               team_leader_enrollment: str, 
                                               event_id: str, 
                                               allow_multiple_teams: bool) -> Dict:
        """
        Enhanced conflict checking for team registrations
        
        Rules:
        1. If allow_multiple_teams = False: No existing registrations allowed
        2. If allow_multiple_teams = True:
           - Team leader cannot already be a team leader in this event
           - Team leader cannot already be a team member in this event  
           - Team members cannot already be team leaders in this event
           - Team members CAN be members in other teams in this event
        """
        
        if not allow_multiple_teams:
            # Standard single team logic - check for any existing registrations
            existing_registrations = []
            for member in all_members:
                existing = await self._check_any_existing_registration(member, event_id)
                if existing:
                    existing_registrations.append(member)
            
            if existing_registrations:
                return {
                    "allowed": False,
                    "message": f"Team members already registered: {', '.join(existing_registrations)}"
                }
            
            return {"allowed": True, "message": "No conflicts found"}
        
        else:
            # Multiple teams allowed - enhanced validation
            conflicts = []
            
            # Check team leader constraints
            leader_conflicts = await self._check_leader_conflicts(team_leader_enrollment, event_id)
            if leader_conflicts:
                conflicts.extend(leader_conflicts)
            
            # Check team member constraints
            for member_enrollment in all_members:
                if member_enrollment != team_leader_enrollment:  # Skip leader (already checked)
                    member_conflicts = await self._check_member_conflicts(member_enrollment, event_id)
                    if member_conflicts:
                        conflicts.extend(member_conflicts)
            
            if conflicts:
                return {
                    "allowed": False,
                    "message": "; ".join(conflicts)
                }
            
            return {"allowed": True, "message": "Multiple team registration allowed"}
    
    async def _check_leader_conflicts(self, enrollment_no: str, event_id: str) -> List[str]:
        """Check if enrollment_no can be a team leader"""
        conflicts = []
        
        # Get all existing registrations for this student in this event
        existing_registrations = await DatabaseOperations.find_many(
            self.collection,
            {
                "student.enrollment_no": enrollment_no,
                "event.event_id": event_id,
                "registration.status": {"$in": ["active", "completed"]}
            }
        )
        
        for registration in existing_registrations:
            reg_type = registration.get("registration", {}).get("type")
            
            if reg_type == "individual":
                conflicts.append(f"{enrollment_no} is already registered as individual participant")
            elif reg_type == "team_leader":
                conflicts.append(f"{enrollment_no} is already team leader of another team")
            elif reg_type == "team_member":
                conflicts.append(f"{enrollment_no} cannot be team leader while being team member")
        
        return conflicts
    
    async def _check_member_conflicts(self, enrollment_no: str, event_id: str) -> List[str]:
        """Check if enrollment_no can be a team member"""
        conflicts = []
        
        # Get all existing registrations for this student in this event
        existing_registrations = await DatabaseOperations.find_many(
            self.collection,
            {
                "student.enrollment_no": enrollment_no,
                "event.event_id": event_id,
                "registration.status": {"$in": ["active", "completed"]}
            }
        )
        
        for registration in existing_registrations:
            reg_type = registration.get("registration", {}).get("type")
            
            if reg_type == "individual":
                conflicts.append(f"{enrollment_no} is already registered as individual participant")
            elif reg_type == "team_leader":
                conflicts.append(f"{enrollment_no} cannot be team member while being team leader")
            # Note: team_member is allowed (can be in multiple teams)
        
        return conflicts
    
    async def _check_any_existing_registration(self, enrollment_no: str, event_id: str) -> Optional[Dict]:
        """Check if student has any existing registration for event"""
        return await DatabaseOperations.find_one(
            self.collection,
            {
                "student.enrollment_no": enrollment_no,
                "event.event_id": event_id,
                "registration.status": {"$in": ["active", "completed"]}
            }
        )
    
    async def get_student_registrations_for_event(self, enrollment_no: str, event_id: str) -> Dict:
        """
        Get all registrations for a student in a specific event
        (Useful for multiple team participation scenarios)
        """
        try:
            registrations = await DatabaseOperations.find_many(
                self.collection,
                {
                    "student.enrollment_no": enrollment_no,
                    "event.event_id": event_id,
                    "registration.status": {"$in": ["active", "completed"]}
                }
            )
            
            individual_registrations = []
            team_registrations = []
            leadership_roles = []
            member_roles = []
            
            for registration in registrations:
                reg_type = registration.get("registration", {}).get("type")
                
                if reg_type == "individual":
                    individual_registrations.append(registration)
                elif reg_type == "team_leader":
                    team_registrations.append(registration)
                    leadership_roles.append({
                        "team_id": registration.get("team", {}).get("team_id"),
                        "team_name": registration.get("team", {}).get("team_name"),
                        "registration_id": registration.get("registration_id")
                    })
                elif reg_type == "team_member":
                    team_registrations.append(registration)
                    member_roles.append({
                        "team_id": registration.get("team", {}).get("team_id"),
                        "team_name": registration.get("team", {}).get("team_name"),
                        "registration_id": registration.get("registration_id")
                    })
            
            return {
                "success": True,
                "enrollment_no": enrollment_no,
                "event_id": event_id,
                "total_registrations": len(registrations),
                "individual_registrations": len(individual_registrations),
                "team_registrations": len(team_registrations),
                "leadership_roles": leadership_roles,
                "member_roles": member_roles,
                "registrations": registrations
            }
            
        except Exception as e:
            logger.error(f"Error getting student registrations: {str(e)}")
            return {"success": False, "message": "Failed to retrieve registrations"}
    
    # Include all other methods from the original service with minimal changes
    async def _validate_team_data(self, team_data: Dict, event_info: Dict) -> Dict:
        """Validate team data against event requirements"""
        team_name = team_data.get("team_name", "").strip()
        if not team_name or len(team_name) < 2:
            return {"valid": False, "message": "Team name must be at least 2 characters"}
        
        member_enrollments = team_data.get("member_enrollments", [])
        if not member_enrollments:
            return {"valid": False, "message": "At least one team member is required"}
        
        # Check team size against event requirements
        total_team_size = len(member_enrollments) + 1  # +1 for leader
        min_size = event_info.get("team_size_min", 2)
        max_size = event_info.get("team_size_max", 5)
        
        if total_team_size < min_size:
            return {"valid": False, "message": f"Team size must be at least {min_size} members"}
        
        if total_team_size > max_size:
            return {"valid": False, "message": f"Team size cannot exceed {max_size} members"}
        
        # Check for duplicate members
        if len(member_enrollments) != len(set(member_enrollments)):
            return {"valid": False, "message": "Duplicate team members not allowed"}
        
        return {"valid": True, "message": "Team data is valid"}
    
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
    
    async def _check_event_capacity(self, event_id: str, additional_count: int = 1) -> Dict:
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
        
        if current_count + additional_count > max_participants:
            return {"available": False, "message": "Event capacity would be exceeded"}
        
        return {"available": True, "message": f"Available slots: {max_participants - current_count}"}
    
    async def _generate_team_id(self, event_id: str) -> str:
        """Generate unique team ID for event"""
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        random_suffix = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(4))
        return f"TEAM_{event_id}_{timestamp}_{random_suffix}"
    
    async def _create_individual_registration_document(self, enrollment_no: str, event_id: str, 
                                                     registration_id: str, student_info: Dict, 
                                                     event_info: Dict) -> Dict:
        """Create individual registration document"""
        return {
            "_id": f"REG_{enrollment_no}_{event_id}_{datetime.utcnow().strftime('%Y%m%d')}",
            "registration_id": registration_id,
            "student": {
                "enrollment_no": enrollment_no,
                "name": student_info.get("name", "Unknown"),
                "email": student_info.get("email", ""),
                "department": student_info.get("department", ""),
                "year": student_info.get("year", 0),
                "phone": student_info.get("phone", "")
            },
            "event": {
                "event_id": event_id,
                "event_name": event_info["event_name"],
                "event_date": event_info.get("start_datetime", datetime.utcnow()).isoformat(),
                "organizer": event_info.get("organizing_department", ""),
                "event_type": event_info.get("event_type", "")
            },
            "registration": {
                "type": "individual",
                "status": "active",
                "registered_at": datetime.utcnow(),
                "registration_method": "online"
            },
            "attendance": {
                "virtual_confirmation": {"confirmed": False},
                "final_status": "pending"
            },
            "feedback": {"submitted": False},
            "certificate": {"issued": False}
        }
    
    async def _create_team_registration_document(self, enrollment_no: str, event_id: str,
                                               registration_id: str, student_info: Dict,
                                               event_info: Dict, team_data: Dict,
                                               team_id: str, is_leader: bool, 
                                               team_leader_enrollment: str) -> Dict:
        """Create team registration document"""
        return {
            "_id": f"REG_{enrollment_no}_{event_id}_{team_id}_{datetime.utcnow().strftime('%Y%m%d')}",
            "registration_id": registration_id,
            "student": {
                "enrollment_no": enrollment_no,
                "name": student_info.get("name", "Unknown"),
                "email": student_info.get("email", ""),
                "department": student_info.get("department", ""),
                "year": student_info.get("year", 0),
                "phone": student_info.get("phone", "")
            },
            "event": {
                "event_id": event_id,
                "event_name": event_info["event_name"],
                "event_date": event_info.get("start_datetime", datetime.utcnow()).isoformat(),
                "organizer": event_info.get("organizing_department", ""),
                "event_type": event_info.get("event_type", ""),
                "allows_multiple_teams": event_info.get("allow_multiple_team_registrations", False)
            },
            "registration": {
                "type": "team_leader" if is_leader else "team_member",
                "status": "active",
                "registered_at": datetime.utcnow(),
                "registration_method": "online"
            },
            "team": {
                "team_id": team_id,
                "team_name": team_data["team_name"],
                "team_leader": team_leader_enrollment,
                "role": "Leader" if is_leader else "Member",
                "total_members": len(team_data.get("member_enrollments", [])) + 1
            },
            "attendance": {
                "virtual_confirmation": {"confirmed": False},
                "final_status": "pending"
            },
            "feedback": {"submitted": False},
            "certificate": {"issued": False}
        }
    
    async def _update_event_registration_count(self, event_id: str, count_increment: int):
        """Update event registration count"""
        # This would update the event document with new registration count
        # Implementation depends on your event tracking requirements
        pass
    
    async def _rollback_team_registrations(self, registration_results: List[Dict], team_id: str):
        """Rollback team registrations in case of failure"""
        for result in registration_results:
            await DatabaseOperations.delete_one(
                self.collection,
                {"registration_id": result["registration_id"]}
            )
