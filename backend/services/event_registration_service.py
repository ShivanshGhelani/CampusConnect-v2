"""
Event Registration Servic    async def register_individual(
        self, 
        enrollment_no: str, 
        event_id: str, 
        additional_data: Dict = None
    ) -> RegistrationResponse:======================
Handles ALL event registration operations: individual, team, team management, cancellation.
Creates registration documents with pre-structured attendance fields based on event strategy.

SINGLE RESPONSIBILITY: Registration operations only
COLLECTION: student_registrations (single source of truth)
"""

from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
from database.operations import DatabaseOperations
from models.registration import CreateRegistrationRequest, RegistrationResponse
# REMOVED: core.id_generator import - now using frontend-generated IDs
from core.logger import get_logger

logger = get_logger(__name__)

class EventRegistrationService:
    """
    Professional service for event registration operations.
    Creates documents with proper attendance structure based on event strategy.
    """
    
    def __init__(self):
        self.collection = "student_registrations"
        self.events_collection = "events"
        self.students_collection = "students"
    
    async def register_individual(
        self, 
        enrollment_no: str, 
        event_id: str, 
        additional_data: Dict[str, Any] = None
    ) -> RegistrationResponse:
        """
        Register individual student for event.
        Creates document with pre-structured attendance fields based on event strategy.
        """
        try:
            logger.info(f"Individual registration: {enrollment_no} -> {event_id}")
            
            # Check if already registered
            existing = await self._check_existing_registration(enrollment_no, event_id)
            if existing:
                return RegistrationResponse(
                    success=False,
                    message="Already registered for this event",
                    registration_id=existing["registration_id"]
                )
            
            # Get student and event data
            student_data, event_data = await self._get_student_and_event_data(enrollment_no, event_id)
            if not student_data:
                return RegistrationResponse(success=False, message="Student not found")
            if not event_data:
                return RegistrationResponse(success=False, message="Event not found")
            
            # FIXED: Use registration_id from frontend if provided, otherwise generate
            registration_id = additional_data.get("registration_id") if additional_data else None
            if not registration_id:
                # Fallback: generate using consistent short alphanumeric format
                import random
                import string
                registration_id = "REG" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
                logger.warning(f"No registration_id from frontend, generated: {registration_id}")
            else:
                logger.info(f"Using frontend-generated registration_id: {registration_id}")
            
            # Create registration document with pre-structured attendance fields
            registration_doc = await self._create_registration_document(
                registration_id=registration_id,
                student_data=student_data,
                event_data=event_data,
                registration_type="individual",
                additional_data=additional_data or {}
            )
            
            # Insert registration
            await DatabaseOperations.insert_one(self.collection, registration_doc)
            
            # Update student document - add event to event_participations
            try:
                logger.info(f"Updating student document for enrollment: {enrollment_no}")
                student_update_result = await DatabaseOperations.update_one(
                    "students",
                    {"enrollment_no": enrollment_no},
                    {
                        "$addToSet": {
                            "event_participations": {
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
                logger.info(f"Student document update result: {student_update_result}")
                # DatabaseOperations.update_one returns True for success, False for failure
                if student_update_result is False:
                    raise Exception(f"Student document update failed for {enrollment_no}")
            except Exception as e:
                logger.error(f"CRITICAL: Failed to update student document: {e}")
                # Don't silently continue - this is a critical failure
                raise Exception(f"Student document update failed: {e}")
            
            # Update event document - increment registration stats
            try:
                event_update_result = await DatabaseOperations.update_one(
                    "events",
                    {"event_id": event_id},
                    {
                        "$inc": {
                            "registration_stats.individual_count": 1,
                            "registration_stats.total_participants": 1
                        },
                        "$addToSet": {
                            "registered_students": enrollment_no
                        },
                        "$set": {
                            "registration_stats.last_updated": datetime.utcnow()
                        }
                    }
                )
                logger.info(f"Event document update result: {event_update_result}")
                # DatabaseOperations.update_one returns True for success, False for failure
                if event_update_result is False:
                    raise Exception(f"Event document update failed for {event_id}")
            except Exception as e:
                logger.error(f"CRITICAL: Failed to update event document: {e}")
                # Don't silently continue - this is a critical failure
                raise Exception(f"Event document update failed: {e}")
            
            logger.info(f"Individual registration successful: {registration_id}")
            logger.info(f"Updated student and event documents for registration: {registration_id}")
            
            return RegistrationResponse(
                success=True,
                message="Individual registration successful",
                registration_id=registration_id,
                data={
                    "event_name": event_data["event_name"],
                    "registration_type": "individual",
                    "attendance_structure": registration_doc["attendance"]
                }
            )
            
        except Exception as e:
            logger.error(f"Individual registration error: {e}")
            return RegistrationResponse(
                success=False,
                message=f"Registration failed: {str(e)}"
            )
    
    async def register_team(
        self,
        team_leader_enrollment: str,
        event_id: str,
        team_data: Dict[str, Any]
    ) -> RegistrationResponse:
        """
        Register team for event - creates ONE document with all team members.
        Each member gets their own registration_id within the team document.
        """
        try:
            team_name = team_data.get("team_name")
            team_members = team_data.get("team_members", [])  # List of enrollment numbers
            
            logger.info(f"Team registration: {team_name} -> {event_id} ({len(team_members)} members)")
            
            # Validate team members
            if not team_members or team_leader_enrollment not in team_members:
                return RegistrationResponse(
                    success=False,
                    message="Invalid team composition"
                )
            
            # Check if any member is already registered
            for enrollment_no in team_members:
                existing = await self._check_existing_registration(enrollment_no, event_id)
                if existing:
                    return RegistrationResponse(
                        success=False,
                        message=f"Student {enrollment_no} already registered for this event"
                    )
            
            # Get event data
            _, event_data = await self._get_student_and_event_data(team_leader_enrollment, event_id)
            if not event_data:
                return RegistrationResponse(success=False, message="Event not found")
            
            # Generate individual registration IDs for each team member
            team_registration_details = []
            team_leader_reg_id = team_data.get("additional_data", {}).get("registration_id")
            
            for enrollment_no in team_members:
                # Get student data
                student_data, _ = await self._get_student_and_event_data(enrollment_no, event_id)
                if not student_data:
                    continue
                
                # Generate registration ID for this member
                if enrollment_no == team_leader_enrollment and team_leader_reg_id:
                    # Use team leader's frontend-generated ID
                    member_reg_id = team_leader_reg_id
                else:
                    # Generate frontend-style ID for other members
                    import random
                    import string
                    member_reg_id = "REG" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
                
                team_registration_details.append({
                    "registration_id": member_reg_id,
                    "student": {
                        "enrollment_no": student_data["enrollment_no"],
                        "name": student_data.get("full_name", student_data.get("name", "")),
                        "email": student_data.get("email", ""),
                        "phone": student_data.get("phone"),
                        "department": student_data.get("department"),
                        "year": student_data.get("year")
                    },
                    "is_team_leader": enrollment_no == team_leader_enrollment,
                    "attendance": self._create_attendance_structure(
                        await self._get_event_attendance_strategy(event_data), 
                        event_data
                    ),
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
                })
            
            # Create single team registration document
            team_registration_id = f"TEAM_{team_name.replace(' ', '_').upper()}_{event_id}"
            
            team_registration_doc = {
                "registration_id": team_registration_id,
                "registration_type": "team",
                "event": {
                    "event_id": event_data["event_id"],
                    "event_name": event_data.get("event_name", ""),
                    "event_type": event_data.get("event_type", ""),
                    "start_datetime": event_data.get("start_datetime"),
                    "end_datetime": event_data.get("end_datetime")
                },
                "team": {
                    "team_name": team_name,
                    "team_leader": team_leader_enrollment,
                    "team_size": len(team_members),
                    "registered_at": datetime.utcnow(),
                    "status": "confirmed"
                },
                "team_members": team_registration_details,
                "additional_data": team_data.get("additional_data", {}),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            # Insert single team registration document
            await DatabaseOperations.insert_one(self.collection, team_registration_doc)
            
            logger.info(f"Team registration successful: {team_name} ({len(team_registration_details)} members)")
            
            # Update all team members' student documents
            for member_detail in team_registration_details:
                enrollment = member_detail["student"]["enrollment_no"]
                await DatabaseOperations.update_one(
                    "students",
                    {"enrollment_no": enrollment},
                    {
                        "$addToSet": {
                            "event_participations": {
                                "event_id": event_id,
                                "event_name": event_data["event_name"],
                                "registration_id": member_detail["registration_id"],
                                "team_registration_id": team_registration_id,
                                "registration_type": "team",
                                "team_name": team_name,
                                "is_team_leader": member_detail["is_team_leader"],
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
                        "registration_stats.team_count": 1,
                        "registration_stats.total_participants": len(team_members)
                    },
                    "$addToSet": {
                        "registered_students": {"$each": team_members}
                    },
                    "$set": {
                        "registration_stats.last_updated": datetime.utcnow()
                    }
                }
            )
            
            logger.info(f"Updated student and event documents for team registration: {team_name}")
            
            return RegistrationResponse(
                success=True,
                message=f"Team registration successful ({len(team_registration_details)} members)",
                registration_id=team_registration_id,
                data={
                    "team_name": team_name,
                    "team_registration_id": team_registration_id,
                    "team_members": team_registration_details,
                    "team_leader": team_leader_enrollment
                }
            )
            
        except Exception as e:
            logger.error(f"Team registration failed: {e}")
            return RegistrationResponse(
                success=False,
                message=f"Team registration failed: {str(e)}"
            )
            
            logger.info(f"Team registration successful: {team_name} ({len(team_registration_ids)} members)")
            
            # Update all team members' student documents
            all_team_enrollments = team_members  # team_members already includes the leader
            
            for enrollment in all_team_enrollments:
                await DatabaseOperations.update_one(
                    "students",
                    {"enrollment_no": enrollment},
                    {
                        "$addToSet": {
                            "event_participations": {
                                "event_id": event_id,
                                "event_name": event_data["event_name"],
                                "registration_id": f"TEAM_{team_name}_{event_id}",
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
                        "registration_stats.team_count": 1,
                        "registration_stats.total_participants": len(all_team_enrollments)
                    },
                    "$addToSet": {
                        "registered_students": {"$each": all_team_enrollments}
                    },
                    "$set": {
                        "registration_stats.last_updated": datetime.utcnow()
                    }
                }
            )
            
            logger.info(f"Updated student and event documents for team registration: {team_name}")
            
            return RegistrationResponse(
                success=True,
                message=f"Team registration successful ({len(team_registration_ids)} members)",
                registration_id=f"TEAM_{team_name}_{event_id}",
                data={
                    "team_name": team_name,
                    "team_registrations": team_registration_ids,
                    "event_name": event_data["event_name"]
                }
            )
            
        except Exception as e:
            logger.error(f"Team registration error: {e}")
            return RegistrationResponse(
                success=False,
                message=f"Team registration failed: {str(e)}"
            )
    
    async def cancel_registration(
        self,
        enrollment_no: str,
        event_id: str
    ) -> Dict[str, Any]:
        """Cancel student registration for event and clean up all related data."""
        try:
            logger.info(f"🔍 CANCEL START: {enrollment_no} -> {event_id}")
            
            # First, check for individual registration
            individual_registration = await DatabaseOperations.find_one(
                self.collection,
                {
                    "student.enrollment_no": enrollment_no,
                    "event.event_id": event_id,
                    "registration.type": "individual"  # Fixed: use registration.type instead of registration_type
                }
            )
            
            # If individual registration found, handle it
            if individual_registration:
                return await self._cancel_individual_registration(enrollment_no, event_id, individual_registration)
            
            # Check for team registration where this student is a team member
            team_registration = await DatabaseOperations.find_one(
                self.collection,
                {
                    "event.event_id": event_id,
                    "registration_type": "team",  # Fixed: use top-level registration_type for team registrations
                    "team_members.student.enrollment_no": enrollment_no
                }
            )
            
            if team_registration:
                # Check if this student is the team leader
                team_members = team_registration.get("team_members", [])
                user_member = None
                for member in team_members:
                    if member.get("student", {}).get("enrollment_no") == enrollment_no:
                        user_member = member
                        break
                
                if not user_member:
                    logger.info(f"🔍 CANCEL: Student not found in team members")
                    return {
                        "success": False,
                        "message": "Student not found in team registration"
                    }
                
                # Only team leaders can cancel the entire team
                if not user_member.get("is_team_leader", False):
                    logger.info(f"🔍 CANCEL: Only team leaders can cancel team registration")
                    return {
                        "success": False,
                        "message": "Only team leaders can cancel team registration"
                    }
                
                # Cancel the entire team
                return await self._cancel_team_registration(event_id, team_registration)
            
            # No registration found
            logger.info(f"🔍 CANCEL: No registration found")
            return {
                "success": False,
                "message": "Registration not found or already cancelled"
            }
            
        except Exception as e:
            logger.error(f"Registration cancellation error: {e}")
            # Add detailed error tracking
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
            return {
                "success": False,
                "message": f"Cancellation failed: {str(e)}"
            }
    
    async def _cancel_individual_registration(
        self,
        enrollment_no: str,
        event_id: str,
        registration: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Cancel individual registration."""
        try:
            registration_id = registration.get("registration_id")
            logger.info(f"🔍 CANCEL INDIVIDUAL: {registration_id}")
            
            # 1. Delete from student_registrations collection
            delete_result = await DatabaseOperations.delete_one(
                self.collection,
                {
                    "student.enrollment_no": enrollment_no,
                    "event.event_id": event_id,
                    "registration.type": "individual"  # Fixed: use registration.type instead of registration_type
                }
            )
            
            if not delete_result:
                return {
                    "success": False,
                    "message": "Failed to delete registration document"
                }
            
            # 2. Remove from student's event_participations
            await DatabaseOperations.update_one(
                "students",
                {"enrollment_no": enrollment_no},
                {
                    "$pull": {
                        "event_participations": {
                            "event_id": event_id
                        }
                    }
                }
            )
            
            # 3. Update event document
            await DatabaseOperations.update_one(
                "events",
                {"event_id": event_id},
                {
                    "$inc": {
                        "registration_stats.individual_count": -1,
                        "registration_stats.total_participants": -1
                    },
                    "$pull": {
                        "registered_students": enrollment_no
                    },
                    "$set": {
                        "registration_stats.last_updated": datetime.utcnow()
                    }
                }
            )
            
            logger.info(f"Individual registration cancelled: {registration_id}")
            return {
                "success": True,
                "message": "Individual registration cancelled successfully",
                "registration_id": registration_id
            }
            
        except Exception as e:
            logger.error(f"Individual cancellation error: {e}")
            return {
                "success": False,
                "message": f"Individual cancellation failed: {str(e)}"
            }
    
    async def _cancel_team_registration(
        self,
        event_id: str,
        team_registration: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Cancel entire team registration."""
        try:
            team_registration_id = team_registration.get("registration_id")
            team_name = team_registration.get("team", {}).get("team_name", "")
            team_members = team_registration.get("team_members", [])
            
            logger.info(f"🔍 CANCEL TEAM: {team_registration_id} with {len(team_members)} members")
            
            # 1. Delete the team document from student_registrations
            delete_result = await DatabaseOperations.delete_one(
                self.collection,
                {
                    "registration_id": team_registration_id,
                    "event.event_id": event_id,
                    "registration_type": "team"
                }
            )
            
            if not delete_result:
                return {
                    "success": False,
                    "message": "Failed to delete team registration document"
                }
            
            # 2. Remove from ALL team members' event_participations
            member_enrollments = []
            for member in team_members:
                enrollment = member.get("student", {}).get("enrollment_no")
                if enrollment:
                    member_enrollments.append(enrollment)
                    
                    # Remove from each student's event_participations
                    await DatabaseOperations.update_one(
                        "students",
                        {"enrollment_no": enrollment},
                        {
                            "$pull": {
                                "event_participations": {
                                    "event_id": event_id
                                }
                            }
                        }
                    )
            
            # 3. Update event document - remove all team members and decrement stats
            await DatabaseOperations.update_one(
                "events",
                {"event_id": event_id},
                {
                    "$inc": {
                        "registration_stats.team_count": -1,
                        "registration_stats.total_participants": -len(member_enrollments)
                    },
                    "$pullAll": {
                        "registered_students": member_enrollments
                    },
                    "$set": {
                        "registration_stats.last_updated": datetime.utcnow()
                    }
                }
            )
            
            logger.info(f"Team registration cancelled: {team_name} ({len(member_enrollments)} members removed)")
            return {
                "success": True,
                "message": f"Team registration cancelled successfully ({team_name})",
                "registration_id": team_registration_id,
                "team_name": team_name,
                "members_removed": len(member_enrollments)
            }
            
        except Exception as e:
            logger.error(f"Team cancellation error: {e}")
            return {
                "success": False,
                "message": f"Team cancellation failed: {str(e)}"
            }
    
    async def get_registration_status(
        self,
        enrollment_no: str,
        event_id: str
    ) -> Dict[str, Any]:
        """Get registration status for student and event - handles both individual and team registrations."""
        try:
            logger.info(f"Getting registration status for student {enrollment_no} and event {event_id}")
            
            # Check individual registration first
            individual_registration = await DatabaseOperations.find_one(
                self.collection,
                {
                    "student.enrollment_no": enrollment_no,
                    "event.event_id": event_id,
                    "registration.type": "individual"
                }
            )
            
            if individual_registration:
                logger.info(f"Found individual registration {individual_registration['registration_id']} for student {enrollment_no}")
                
                # Convert ObjectIds to strings for JSON serialization
                from core.json_encoder import CustomJSONEncoder
                import json
                
                serialized_data = json.loads(json.dumps(individual_registration, cls=CustomJSONEncoder))
                
                return {
                    "success": True,
                    "registered": True,
                    "registration_id": individual_registration["registration_id"],
                    "registration_type": "individual",
                    "status": individual_registration["registration"]["status"],
                    "registered_at": individual_registration["registration"]["registered_at"],
                    "attendance_structure": individual_registration["attendance"],
                    "full_registration_data": serialized_data,
                    "student_data": individual_registration.get("student"),
                    "event_data": individual_registration.get("event")
                }
            
            # Check team registration
            team_registration = await DatabaseOperations.find_one(
                self.collection,
                {
                    "event.event_id": event_id,
                    "registration_type": "team",
                    "team_members.student.enrollment_no": enrollment_no
                }
            )
            
            if team_registration:
                # Find the specific member's data within the team
                member_data = None
                for member in team_registration.get("team_members", []):
                    if member["student"]["enrollment_no"] == enrollment_no:
                        member_data = member
                        break
                
                if member_data:
                    logger.info(f"Found team registration {team_registration['registration_id']} for student {enrollment_no}")
                    
                    # Convert ObjectIds to strings for JSON serialization
                    from core.json_encoder import CustomJSONEncoder
                    import json
                    
                    serialized_data = json.loads(json.dumps(team_registration, cls=CustomJSONEncoder))
                    
                    return {
                        "success": True,
                        "registered": True,
                        "registration_id": member_data["registration_id"],
                        "team_registration_id": team_registration["registration_id"],
                        "registration_type": "team",
                        "status": team_registration["team"]["status"],
                        "registered_at": team_registration["team"]["registered_at"],
                        "is_team_leader": member_data.get("is_team_leader", False),
                        "team_info": team_registration.get("team"),
                        "team_members": team_registration.get("team_members"),
                        "attendance_structure": member_data.get("attendance"),
                        "full_registration_data": serialized_data,
                        "student_data": member_data.get("student"),
                        "event_data": team_registration.get("event")
                    }
            
            # No registration found
            logger.warning(f"No registration found for student {enrollment_no} and event {event_id}")
            
            # Debug: Check if student has any registrations
            any_registration = await DatabaseOperations.find_one(
                self.collection,
                {"$or": [
                    {"student.enrollment_no": enrollment_no},
                    {"team_members.student.enrollment_no": enrollment_no}
                ]}
            )
            
            if any_registration:
                event_ref = any_registration.get('event', {}) if 'event' in any_registration else any_registration.get('team_members', [{}])[0].get('event', {})
                logger.info(f"Student {enrollment_no} has registration for event {event_ref.get('event_id', 'unknown')}")
            else:
                logger.info(f"Student {enrollment_no} has no registrations at all")
            
            return {
                "success": False,
                "message": "Registration not found for this event",
                "registered": False,
                "debug_info": {
                    "student_has_other_registrations": bool(any_registration),
                    "other_event_id": event_ref.get('event_id') if any_registration else None
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting registration status: {e}")
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
        """Get all registrations for an event with pagination."""
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
            logger.error(f"Error getting event registrations: {e}")
            return {
                "success": False,
                "message": f"Error: {str(e)}"
            }
    
    # PRIVATE HELPER METHODS
    
    async def _check_existing_registration(
        self,
        enrollment_no: str,
        event_id: str
    ) -> Optional[Dict[str, Any]]:
        """Check if student already registered for event - handles both individual and team registrations."""
        
        # Check individual registration
        individual_reg = await DatabaseOperations.find_one(
            self.collection,
            {
                "student.enrollment_no": enrollment_no,
                "event.event_id": event_id,
                "registration_type": "individual"
            }
        )
        
        if individual_reg:
            return individual_reg
        
        # Check team registration - student could be in team_members array
        team_reg = await DatabaseOperations.find_one(
            self.collection,
            {
                "event.event_id": event_id,
                "registration_type": "team",
                "team_members.student.enrollment_no": enrollment_no
            }
        )
        
        return team_reg
    
    async def _get_student_and_event_data(
        self,
        enrollment_no: str,
        event_id: str
    ) -> Tuple[Optional[Dict], Optional[Dict]]:
        """Get student and event data in parallel."""
        student_data = await DatabaseOperations.find_one(
            self.students_collection,
            {"enrollment_no": enrollment_no}
        )
        
        event_data = await DatabaseOperations.find_one(
            self.events_collection,
            {"event_id": event_id}
        )
        
        return student_data, event_data
    
    async def _create_registration_document(
        self,
        registration_id: str,
        student_data: Dict[str, Any],
        event_data: Dict[str, Any],
        registration_type: str,
        team_info: Optional[Dict[str, Any]] = None,
        additional_data: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Create registration document with pre-structured attendance fields.
        The attendance structure is created based on the event's attendance strategy.
        """
        
        # Get attendance strategy from event (this uses the 4-day intelligence system)
        attendance_strategy = await self._get_event_attendance_strategy(event_data)
        
        # Create base registration document
        registration_doc = {
            "registration_id": registration_id,
            "student": {
                "enrollment_no": student_data["enrollment_no"],
                "name": student_data.get("full_name", student_data.get("name", "")),
                "email": student_data.get("email", ""),
                "phone": student_data.get("phone"),
                "department": student_data.get("department"),
                "year": student_data.get("year")
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
event_registration_service = EventRegistrationService()
