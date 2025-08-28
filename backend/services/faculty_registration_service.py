"""
Faculty Registration Service
============================
Handles ALL faculty event registration operations: individual, team, team management, cancellation.
Creates registration documents with pre-structured attendance fields based on event strategy.

SINGLE RESPONSIBILITY: Faculty registration operations only
COLLECTION: faculty_registrations (mirrors student_registrations)
"""

from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
from database.operations import DatabaseOperations
from models.registration import RegistrationResponse
from core.logger import get_logger

logger = get_logger(__name__)

class FacultyRegistrationService:
    """
    Professional service for faculty event registration operations.
    Creates documents with proper attendance structure based on event strategy.
    Mirrors EventRegistrationService but for faculty with employee_id.
    """
    
    def __init__(self):
        self.collection = "faculty_registrations"
        self.events_collection = "events"
        self.faculties_collection = "faculties"
    
    async def register_individual(
        self, 
        employee_id: str, 
        event_id: str, 
        additional_data: Dict[str, Any] = None
    ) -> RegistrationResponse:
        """
        Register individual faculty for event.
        Creates document with pre-structured attendance fields based on event strategy.
        """
        try:
            logger.info(f"Faculty individual registration: {employee_id} -> {event_id}")
            
            # Check if already registered
            existing = await self._check_existing_registration(employee_id, event_id)
            if existing:
                return RegistrationResponse(
                    success=False,
                    message="Already registered for this event",
                    registration_id=existing["registration_id"]
                )
            
            # Get faculty and event data
            faculty_data, event_data = await self._get_faculty_and_event_data(employee_id, event_id)
            if not faculty_data:
                return RegistrationResponse(success=False, message="Faculty not found")
            if not event_data:
                return RegistrationResponse(success=False, message="Event not found")
            
            # Use registration_id from frontend if provided, otherwise generate using proper format
            registration_id = additional_data.get("registration_id") if additional_data else None
            if not registration_id:
                # Fallback: generate using same format as students (short alphanumeric)
                import random
                import string
                registration_id = "REG" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
                logger.warning(f"No registration_id from frontend, generated: {registration_id}")
            else:
                logger.info(f"Using frontend-generated registration_id: {registration_id}")
            
            # Create registration document with pre-structured attendance fields
            registration_doc = await self._create_registration_document(
                registration_id=registration_id,
                faculty_data=faculty_data,
                event_data=event_data,
                registration_type="individual",
                additional_data=additional_data or {}
            )
            
            # Insert registration
            await DatabaseOperations.insert_one(self.collection, registration_doc)
            
            # Update faculty document - add event to event_participation
            try:
                logger.info(f"Updating faculty document for employee_id: {employee_id}")
                faculty_update_result = await DatabaseOperations.update_one(
                    "faculties",
                    {"employee_id": employee_id},
                    {
                        "$addToSet": {
                            "event_participation": {
                                "event_id": event_id,
                                "event_name": event_data["event_name"],
                                "registration_id": registration_id,
                                "registration_type": "individual",
                                "registration_date": registration_doc["registration"]["registered_at"],
                                "status": "registered"
                            }
                        }
                    }
                )
                logger.info(f"Faculty document update result: {faculty_update_result}")
                if faculty_update_result is False:
                    raise Exception(f"Faculty document update failed for {employee_id}")
            except Exception as e:
                logger.error(f"CRITICAL: Failed to update faculty document: {e}")
                raise Exception(f"Faculty document update failed: {e}")
            
            # Update event document - increment registration stats and add to participated_faculties
            try:
                event_update_result = await DatabaseOperations.update_one(
                    "events",
                    {"event_id": event_id},
                    {
                        "$inc": {
                            "registration_stats.faculty_individual_count": 1,
                            "registration_stats.total_participants": 1
                        },
                        "$addToSet": {
                            "participated_faculties": employee_id
                        },
                        "$set": {
                            "registration_stats.last_updated": datetime.utcnow()
                        }
                    }
                )
                logger.info(f"Event document update result: {event_update_result}")
                if event_update_result is False:
                    raise Exception(f"Event document update failed for {event_id}")
            except Exception as e:
                logger.error(f"CRITICAL: Failed to update event document: {e}")
                raise Exception(f"Event document update failed: {e}")
            
            logger.info(f"Faculty individual registration successful: {registration_id}")
            
            return RegistrationResponse(
                success=True,
                message="Faculty individual registration successful",
                registration_id=registration_id,
                data={
                    "event_name": event_data["event_name"],
                    "registration_type": "individual",
                    "attendance_structure": registration_doc["attendance"]
                }
            )
            
        except Exception as e:
            logger.error(f"Faculty individual registration error: {e}")
            return RegistrationResponse(
                success=False,
                message=f"Registration failed: {str(e)}"
            )
    
    async def register_team(
        self,
        team_leader_employee_id: str,
        event_id: str,
        team_data: Dict[str, Any]
    ) -> RegistrationResponse:
        """
        Register faculty team for event.
        Creates documents for all team members with shared team information.
        """
        try:
            team_name = team_data.get("team_name")
            team_members = team_data.get("team_members", [])  # List of employee IDs
            
            logger.info(f"Faculty team registration: {team_name} -> {event_id} ({len(team_members)} members)")
            
            # Validate team members
            if not team_members or team_leader_employee_id not in team_members:
                return RegistrationResponse(
                    success=False,
                    message="Invalid team composition"
                )
            
            # Check if any member is already registered
            for employee_id in team_members:
                existing = await self._check_existing_registration(employee_id, event_id)
                if existing:
                    return RegistrationResponse(
                        success=False,
                        message=f"Faculty {employee_id} already registered for this event"
                    )
            
            # Get event data
            _, event_data = await self._get_faculty_and_event_data(team_leader_employee_id, event_id)
            if not event_data:
                return RegistrationResponse(success=False, message="Event not found")
            
            # Create team registration for each member
            team_registration_ids = []
            team_info = {
                "team_name": team_name,
                "team_leader": team_leader_employee_id,
                "team_members": team_members,
                "team_size": len(team_members)
            }
            
            for employee_id in team_members:
                # Get faculty data
                faculty_data, _ = await self._get_faculty_and_event_data(employee_id, event_id)
                if not faculty_data:
                    continue
                
                # Use frontend-generated team registration IDs if available
                member_reg_id = None
                if team_data and "team_registration_ids" in team_data:
                    team_reg_ids = team_data["team_registration_ids"]
                    member_index = team_members.index(employee_id)
                    if member_index < len(team_reg_ids):
                        member_reg_id = team_reg_ids[member_index]
                
                registration_id = member_reg_id or f"REG_FAC_{employee_id}_{event_id}"
                if member_reg_id:
                    logger.info(f"Using frontend team registration_id: {registration_id}")
                else:
                    logger.warning(f"No team registration_id from frontend, generated: {registration_id}")
                
                # Create registration document for team member
                registration_doc = await self._create_registration_document(
                    registration_id=registration_id,
                    faculty_data=faculty_data,
                    event_data=event_data,
                    registration_type="team",
                    team_info=team_info,
                    additional_data=team_data.get("additional_data", {})
                )
                
                await DatabaseOperations.insert_one(self.collection, registration_doc)
                team_registration_ids.append(registration_id)
            
            logger.info(f"Faculty team registration successful: {team_name} ({len(team_registration_ids)} members)")
            
            # Update all team members' faculty documents
            for employee_id in team_members:
                await DatabaseOperations.update_one(
                    "faculties",
                    {"employee_id": employee_id},
                    {
                        "$addToSet": {
                            "event_participation": {
                                "event_id": event_id,
                                "event_name": event_data["event_name"],
                                "registration_id": f"TEAM_FAC_{team_name}_{event_id}",
                                "registration_type": "team",
                                "team_name": team_name,
                                "registration_date": datetime.utcnow(),
                                "status": "registered"
                            }
                        }
                    }
                )
            
            # Update event document - increment team registration stats
            await DatabaseOperations.update_one(
                "events",
                {"event_id": event_id},
                {
                    "$inc": {
                        "registration_stats.faculty_team_count": 1,
                        "registration_stats.total_participants": len(team_members)
                    },
                    "$addToSet": {
                        "participated_faculties": {"$each": team_members}
                    },
                    "$set": {
                        "registration_stats.last_updated": datetime.utcnow()
                    }
                }
            )
            
            logger.info(f"Updated faculty and event documents for team registration: {team_name}")
            
            return RegistrationResponse(
                success=True,
                message=f"Faculty team registration successful ({len(team_registration_ids)} members)",
                registration_id=f"TEAM_FAC_{team_name}_{event_id}",
                data={
                    "team_name": team_name,
                    "team_registrations": team_registration_ids,
                    "event_name": event_data["event_name"]
                }
            )
            
        except Exception as e:
            logger.error(f"Faculty team registration error: {e}")
            return RegistrationResponse(
                success=False,
                message=f"Faculty team registration failed: {str(e)}"
            )
    
    async def cancel_registration(
        self,
        employee_id: str,
        event_id: str
    ) -> Dict[str, Any]:
        """Cancel faculty registration for event and clean up all related data."""
        try:
            logger.info(f"🔍 FACULTY CANCEL START: {employee_id} -> {event_id}")
            
            # First, find the registration to get details
            registration = await DatabaseOperations.find_one(
                self.collection,
                {
                    "faculty.employee_id": employee_id,
                    "event.event_id": event_id
                }
            )
            
            if not registration:
                logger.info(f"🔍 FACULTY CANCEL: No registration found")
                return {
                    "success": False,
                    "message": "Registration not found or already cancelled"
                }
            
            registration_id = registration.get("registration_id")
            registration_type = registration.get("registration", {}).get("type", "individual")
            
            logger.info(f"🔍 FACULTY CANCEL: Found registration {registration_id}, type: {registration_type}")
            
            # 1. Delete from faculty_registrations collection
            delete_result = await DatabaseOperations.delete_one(
                self.collection,
                {
                    "faculty.employee_id": employee_id,
                    "event.event_id": event_id
                }
            )
            
            if not delete_result:
                logger.error(f"🔍 FACULTY CANCEL: Delete failed - registration not found")
                return {
                    "success": False,
                    "message": "Failed to delete registration document - not found"
                }
            
            # 2. Remove from faculty's event_participation array
            try:
                faculty_update_result = await DatabaseOperations.update_one(
                    "faculties",
                    {"employee_id": employee_id},
                    {
                        "$pull": {
                            "event_participation": {
                                "event_id": event_id
                            }
                        }
                    }
                )
                logger.info(f"Removed participation from faculty document: {faculty_update_result}")
            except Exception as e:
                logger.error(f"Failed to update faculty document during cancellation: {e}")
            
            # 3. Update event document - decrement stats and remove from participated list
            try:
                # Determine which counters to decrement
                decrement_update = {
                    "registration_stats.total_participants": -1
                }
                
                if registration_type == "individual":
                    decrement_update["registration_stats.faculty_individual_count"] = -1
                elif registration_type in ["team", "team_leader", "team_member"]:
                    decrement_update["registration_stats.faculty_team_count"] = -1
                
                event_update_result = await DatabaseOperations.update_one(
                    "events",
                    {"event_id": event_id},
                    {
                        "$inc": decrement_update,
                        "$pull": {
                            "participated_faculties": employee_id
                        },
                        "$set": {
                            "registration_stats.last_updated": datetime.utcnow()
                        }
                    }
                )
                logger.info(f"Updated event document during faculty cancellation: {event_update_result}")
            except Exception as e:
                logger.error(f"Failed to update event document during faculty cancellation: {e}")
            
            logger.info(f"Faculty registration cancellation completed: {registration_id}")
            
            return {
                "success": True,
                "message": "Faculty registration cancelled successfully",
                "registration_id": registration_id
            }
            
        except Exception as e:
            logger.error(f"Faculty registration cancellation error: {e}")
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
            return {
                "success": False,
                "message": f"Cancellation failed: {str(e)}"
            }
    
    async def get_registration_status(
        self,
        employee_id: str,
        event_id: str
    ) -> Dict[str, Any]:
        """Get registration status for faculty and event."""
        try:
            registration = await DatabaseOperations.find_one(
                self.collection,
                {
                    "faculty.employee_id": employee_id,
                    "event.event_id": event_id
                }
            )
            
            if not registration:
                return {
                    "success": False,
                    "message": "Registration not found",
                    "registered": False
                }
            
            return {
                "success": True,
                "registered": True,
                "registration_id": registration["registration_id"],
                "registration_type": registration["registration"]["type"],
                "status": registration["registration"]["status"],
                "registered_at": registration["registration"]["registered_at"],
                "team_info": registration.get("team"),
                "attendance_structure": registration["attendance"]
            }
            
        except Exception as e:
            logger.error(f"Error getting faculty registration status: {e}")
            return {
                "success": False,
                "message": f"Error: {str(e)}"
            }
    
    async def get_event_registrations(
        self,
        event_id: str,
        registration_type: Optional[str] = None,
        limit: int = 50,
        skip: int = 0
    ) -> Dict[str, Any]:
        """Get all faculty registrations for an event with pagination."""
        try:
            # Build query
            query = {"event.event_id": event_id}
            if registration_type:
                query["registration.type"] = registration_type
            
            # Get registrations with pagination
            registrations = await DatabaseOperations.find_many(
                self.collection,
                query,
                limit=limit,
                skip=skip,
                sort_by=[("registration.registered_at", -1)]
            )
            
            # Get total count
            total_count = await DatabaseOperations.count_documents(self.collection, query)
            
            return {
                "success": True,
                "registrations": registrations,
                "pagination": {
                    "total": total_count,
                    "limit": limit,
                    "skip": skip,
                    "has_more": (skip + limit) < total_count
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting faculty event registrations: {e}")
            return {
                "success": False,
                "message": f"Error: {str(e)}"
            }
    
    # PRIVATE HELPER METHODS
    
    async def _check_existing_registration(
        self,
        employee_id: str,
        event_id: str
    ) -> Optional[Dict[str, Any]]:
        """Check if faculty already registered for event."""
        return await DatabaseOperations.find_one(
            self.collection,
            {
                "faculty.employee_id": employee_id,
                "event.event_id": event_id
            }
        )
    
    async def _get_faculty_and_event_data(
        self,
        employee_id: str,
        event_id: str
    ) -> Tuple[Optional[Dict], Optional[Dict]]:
        """Get faculty and event data in parallel."""
        faculty_data = await DatabaseOperations.find_one(
            self.faculties_collection,
            {"employee_id": employee_id}
        )
        
        event_data = await DatabaseOperations.find_one(
            self.events_collection,
            {"event_id": event_id}
        )
        
        return faculty_data, event_data
    
    async def _create_registration_document(
        self,
        registration_id: str,
        faculty_data: Dict[str, Any],
        event_data: Dict[str, Any],
        registration_type: str,
        team_info: Optional[Dict[str, Any]] = None,
        additional_data: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Create faculty registration document with pre-structured attendance fields.
        The attendance structure is created based on the event's attendance strategy.
        """
        
        # Get attendance strategy from event
        attendance_strategy = await self._get_event_attendance_strategy(event_data)
        
        # Create base registration document for faculty
        registration_doc = {
            "registration_id": registration_id,
            "faculty": {
                "employee_id": faculty_data["employee_id"],
                "name": faculty_data.get("full_name", faculty_data.get("name", "")),
                "email": faculty_data.get("email", ""),
                "contact_no": faculty_data.get("contact_no"),
                "department": faculty_data.get("department"),
                "designation": faculty_data.get("designation")
            },
            "event": {
                "event_id": event_data["event_id"],
                "event_name": event_data.get("event_name", ""),
                "event_type": event_data.get("event_type", ""),
                "start_datetime": event_data.get("start_datetime"),
                "end_datetime": event_data.get("end_datetime")
            },
            "registration": {
                "type": registration_type,
                "status": "confirmed",
                "registered_at": datetime.utcnow(),
                "additional_data": additional_data or {}
            },
            "team": team_info,
            "attendance": self._create_attendance_structure(attendance_strategy, event_data),
            "feedback": {
                "submitted": False,
                "rating": None,
                "comments": None,
                "submitted_at": None
            },
            "certificate": {
                "eligible": False,
                "issued": False,
                "certificate_id": None,
                "issued_at": None
            }
        }
        
        return registration_doc
    
    async def _get_event_attendance_strategy(self, event_data: Dict[str, Any]) -> str:
        """
        Get attendance strategy for event using the existing 4-day intelligence system.
        This preserves all the working strategy detection logic.
        """
        try:
            # Import the working strategy detection system
            from models.dynamic_attendance import AttendanceIntelligenceService
            
            # Use the proven 4-day strategy detection system
            strategy = AttendanceIntelligenceService.detect_attendance_strategy(event_data)
            return strategy.value
            
        except Exception as e:
            logger.warning(f"Strategy detection failed, using default: {e}")
            return "single_mark"  # Fallback to simple strategy
    
    def _create_attendance_structure(
        self,
        strategy: str,
        event_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create attendance structure based on strategy.
        Pre-creates all required fields that attendance service will update.
        """
        
        base_structure = {
            "strategy": strategy,
            "status": "pending",  # pending, present, partial, absent
            "percentage": 0.0,
            "last_updated": None,
            "marked_by": None,
            "marking_method": None
        }
        
        if strategy == "single_mark":
            base_structure.update({
                "marked": False,
                "marked_at": None
            })
            
        elif strategy == "day_based":
            # Pre-create day slots based on event duration
            event_days = self._calculate_event_days(event_data)
            base_structure.update({
                "days": [
                    {
                        "day": i + 1,
                        "date": None,  # Will be calculated
                        "marked": False,
                        "marked_at": None
                    }
                    for i in range(event_days)
                ],
                "total_days": event_days,
                "days_attended": 0
            })
            
        elif strategy == "session_based":
            # Pre-create session slots (will be populated by attendance service)
            base_structure.update({
                "sessions": [],  # Will be populated when attendance is initialized
                "total_sessions": 0,
                "sessions_attended": 0
            })
            
        elif strategy == "milestone_based":
            base_structure.update({
                "milestones": [],  # Will be populated based on event milestones
                "total_milestones": 0,
                "milestones_completed": 0
            })
            
        elif strategy == "continuous":
            base_structure.update({
                "engagement_periods": [],
                "total_engagement_time": 0,
                "active_time": 0
            })
        
        return base_structure
    
    def _calculate_event_days(self, event_data: Dict[str, Any]) -> int:
        """Calculate number of days for an event."""
        try:
            start = event_data.get("start_datetime")
            end = event_data.get("end_datetime")
            
            if start and end:
                if isinstance(start, str):
                    start = datetime.fromisoformat(start.replace('Z', '+00:00'))
                if isinstance(end, str):
                    end = datetime.fromisoformat(end.replace('Z', '+00:00'))
                
                return max(1, (end - start).days + 1)
            
            return 1  # Default to single day
            
        except Exception:
            return 1  # Fallback to single day


# Service instance
faculty_registration_service = FacultyRegistrationService()
