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
from datetime import datetime, timedelta
import pytz
from zoneinfo import ZoneInfo
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
        self.invitations_collection = "team_invitations"
    
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
                        "$set": {
                            f"registered_students.{registration_id}": enrollment_no,
                            "registration_stats.last_updated": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None)
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
            
            # Validate team composition
            if not team_members or team_leader_enrollment not in team_members:
                return RegistrationResponse(
                    success=False,
                    message="Invalid team composition: team leader must be included in team members"
                )
            
            # Get event data first to check multiple team registration policy
            _, event_data = await self._get_student_and_event_data(team_leader_enrollment, event_id)
            if not event_data:
                return RegistrationResponse(success=False, message="Event not found")
            
            # Check if multiple team registrations are allowed
            allow_multiple_teams = event_data.get("allow_multiple_team_registrations", False)
            
            # FIXED: Track members by category - new, eligible for invitation, and blocked
            new_members = []
            invitation_required_members = []
            blocked_members = []
            
            # Check registration status for each member
            for enrollment_no in team_members:
                existing = await self._check_existing_registration(enrollment_no, event_id)
                if existing:
                    # Check if this student can join multiple teams
                    reg_type = "individual"
                    if existing.get("registration_type") == "team" or existing.get("registration", {}).get("type") == "team":
                        if existing.get("team", {}).get("team_leader") == enrollment_no:
                            reg_type = "team leader"
                        else:
                            reg_type = "team member"
                    
                    # Handle different scenarios based on multiple team registration setting
                    if reg_type == "individual" or reg_type == "team leader":
                        blocked_members.append((enrollment_no, f"already registered as {reg_type}"))
                    elif reg_type == "team member" and not allow_multiple_teams:
                        blocked_members.append((enrollment_no, f"already registered as team member and multiple teams not allowed"))
                    elif reg_type == "team member" and allow_multiple_teams:
                        # FIXED: Send invitation instead of direct addition
                        if enrollment_no != team_leader_enrollment:  # Leader doesn't need invitation to their own team
                            invitation_required_members.append(enrollment_no)
                            logger.info(f"Student {enrollment_no} already registered - will send invitation")
                        else:
                            blocked_members.append((enrollment_no, "team leader cannot be in multiple teams"))
                else:
                    new_members.append(enrollment_no)
            
            # Block registration if there are any blocked members
            if blocked_members:
                blocked_list = [f"{enrollment} ({reason})" for enrollment, reason in blocked_members]
                return RegistrationResponse(
                    success=False,
                    message=f"Cannot register team. Following members are blocked: {'; '.join(blocked_list)}"
                )
            
            logger.info(f"Team composition: {len(new_members)} new members, {len(invitation_required_members)} invitations to send")
            if not event_data:
                return RegistrationResponse(success=False, message="Event not found")
            
            # FIXED: Only register team with new members + team leader
            # Members requiring invitations will be handled separately
            actual_team_members = [m for m in team_members if m in new_members or m == team_leader_enrollment]
            
            if len(actual_team_members) < 1:
                return RegistrationResponse(
                    success=False,
                    message="Cannot create team: all members require invitations"
                )
            
            # FIXED: Generate registration details only for actual team members (new + leader)
            team_registration_details = []
            team_leader_reg_id = team_data.get("additional_data", {}).get("registration_id")
            
            for enrollment_no in actual_team_members:
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
                        "phone": student_data.get("mobile_no"),
                        "department": student_data.get("department"),
                        "semester": student_data.get("semester")
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
            team_registration_id = team_data.get("additional_data", {}).get("temp_team_id")
            
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
                    "team_size": len(actual_team_members),  # FIXED: Use actual team size
                    "registered_at": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None),
                    "status": "confirmed"
                },
                "team_members": team_registration_details,
                "created_at": datetime.now(ZoneInfo("Asia/Kolkata")),
                "updated_at": datetime.now(ZoneInfo("Asia/Kolkata"))
            }
            
            # Insert single team registration document
            await DatabaseOperations.insert_one(self.collection, team_registration_doc)
            
            logger.info(f"Team registration successful: {team_name} ({len(team_registration_details)} members)")
            
            # FIXED: Update only new members' student documents
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
                                "registration_date": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None),
                                "status": "registered"
                            }
                        }
                    }
                )
            
            # FIXED: Update event document - only add new registrations
            new_registrations = {}
            for member_detail in team_registration_details:
                new_registrations[member_detail["registration_id"]] = member_detail["student"]["enrollment_no"]
            
            # Update event document - increment team registration stats and add new registrations
            update_query = {
                "$inc": {
                    "registration_stats.team_count": 1,
                    "registration_stats.total_participants": len(new_members)  # Only count new members
                },
                "$set": {
                    "registration_stats.last_updated": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None),
                    **{f"registered_students.{reg_id}": enrollment for reg_id, enrollment in new_registrations.items()}
                }
            }
            
            await DatabaseOperations.update_one(
                "events",
                {"event_id": event_id},
                update_query
            )
            
            # FIXED: Send invitations to already-registered members
            invitations_sent = []
            invitation_errors = []
            
            for invitee_enrollment in invitation_required_members:
                try:
                    invitation_result = await self.send_team_invitation(
                        event_id=event_id,
                        team_registration_id=team_registration_id,
                        invitee_enrollment=invitee_enrollment,
                        inviter_enrollment=team_leader_enrollment
                    )
                    
                    if invitation_result.get("success"):
                        invitations_sent.append(invitee_enrollment)
                        logger.info(f"✅ Invitation sent to {invitee_enrollment}")
                    else:
                        invitation_errors.append(f"{invitee_enrollment}: {invitation_result.get('message', 'Unknown error')}")
                        logger.error(f"❌ Failed to send invitation to {invitee_enrollment}: {invitation_result.get('message')}")
                        
                except Exception as e:
                    invitation_errors.append(f"{invitee_enrollment}: {str(e)}")
                    logger.error(f"❌ Exception sending invitation to {invitee_enrollment}: {e}")
            
            logger.info(f"Updated student and event documents for team registration: {team_name}")
            
            # FIXED: Build comprehensive response with invitation status
            response_message = f"Team registration successful with {len(team_registration_details)} members"
            if invitations_sent:
                response_message += f". Invitations sent to {len(invitations_sent)} already-registered students"
            if invitation_errors:
                response_message += f". Failed to send {len(invitation_errors)} invitations"
            
            return RegistrationResponse(
                success=True,
                message=response_message,
                registration_id=team_registration_id,
                data={
                    "team_name": team_name,
                    "team_registration_id": team_registration_id,
                    "team_members": team_registration_details,
                    "team_leader": team_leader_enrollment,
                    "invitations_sent": invitations_sent,
                    "invitation_errors": invitation_errors,
                    "pending_invitations": len(invitations_sent)
                }
            )
            
        except Exception as e:
            logger.error(f"Team registration failed: {e}")
            return RegistrationResponse(
                success=False,
                message=f"Team registration failed: {str(e)}"
            )
    
    async def add_team_member(
        self,
        event_id: str,
        team_registration_id: str,
        new_member_enrollment: str,
        requester_enrollment: str
    ) -> Dict[str, Any]:
        """Add a new member to an existing team registration."""
        try:
            logger.info(f"Adding team member: {new_member_enrollment} to team {team_registration_id}")
            
            # Get team registration
            team_reg = await DatabaseOperations.find_one(
                self.collection,
                {"registration_id": team_registration_id, "registration_type": "team"}
            )
            
            if not team_reg:
                return {"success": False, "message": "Team registration not found"}
            
            # Check if requester is team leader
            if team_reg["team"]["team_leader"] != requester_enrollment:
                return {"success": False, "message": "Only team leader can add members"}
            
            # Get event data for team size validation
            event_data = await DatabaseOperations.find_one(self.events_collection, {"event_id": event_id})
            if not event_data:
                return {"success": False, "message": "Event not found"}
            
            # Check team size limits
            current_team_size = len(team_reg.get("team_members", []))
            max_team_size = event_data.get("team_size_max", 10)  # Default to 10 if not specified
            
            logger.info(f"Add member team size check: current={current_team_size}, max={max_team_size}")
            
            if current_team_size >= max_team_size:
                return {
                    "success": False, 
                    "message": f"Cannot add member. Team is already at maximum size ({current_team_size}/{max_team_size} members)"
                }
            
            # Check if new member already in team
            existing_member = any(
                member["student"]["enrollment_no"] == new_member_enrollment 
                for member in team_reg["team_members"]
            )
            if existing_member:
                return {"success": False, "message": "Student already in team"}
            
            # Check if student exists and get data
            student_data = await DatabaseOperations.find_one(
                self.students_collection,
                {"enrollment_no": new_member_enrollment}
            )
            
            if not student_data:
                return {"success": False, "message": "Student not found"}
            
            # FIXED: Check if student already registered for this event
            existing_reg = await self._check_existing_registration(new_member_enrollment, event_id)
            if existing_reg:
                # Use event_data already fetched above for multiple team registrations check
                allow_multiple = event_data.get("allow_multiple_team_registrations", False)
                
                if not allow_multiple:
                    return {"success": False, "message": "Student already registered for this event and multiple teams not allowed"}
                
                # Check registration type for multiple team eligibility
                reg_type = "individual"
                if existing_reg.get("registration_type") == "team":
                    if existing_reg["team"]["team_leader"] == new_member_enrollment:
                        reg_type = "team leader"
                    else:
                        reg_type = "team member"
                
                # Handle different scenarios
                if reg_type == "individual":
                    return {"success": False, "message": "Student has individual registration and cannot join teams"}
                elif reg_type == "team leader":
                    return {"success": False, "message": "Team leader cannot join multiple teams"}
                elif reg_type == "team member" and allow_multiple:
                    # FIXED: Send invitation instead of direct addition
                    logger.info(f"Student {new_member_enrollment} already registered as team member - sending invitation")
                    return await self.send_team_invitation(
                        event_id=event_id,
                        team_registration_id=team_registration_id,
                        invitee_enrollment=new_member_enrollment,
                        inviter_enrollment=requester_enrollment
                    )
            
            # Get event data for attendance strategy
            event_data = await DatabaseOperations.find_one(self.events_collection, {"event_id": event_id})
            attendance_strategy = await self._get_event_attendance_strategy(event_data)
            
            # Generate registration ID for new member
            import random
            import string
            member_reg_id = "REG" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
            
            # Create new member document
            new_member = {
                "registration_id": member_reg_id,
                "student": {
                    "enrollment_no": student_data["enrollment_no"],
                    "name": student_data.get("full_name", student_data.get("name", "")),
                    "email": student_data.get("email", ""),
                    "phone": student_data.get("mobile_no", student_data.get("phone", "")),
                    "department": student_data.get("department", ""),
                    "semester": student_data.get("semester", "")
                },
                "is_team_leader": False,
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
            
            # Update team registration document
            await DatabaseOperations.update_one(
                self.collection,
                {"registration_id": team_registration_id},
                {
                    "$push": {"team_members": new_member},
                    "$inc": {"team.team_size": 1},
                    "$set": {"updated_at": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None)}
                }
            )
            
            # Update student's event_participations
            await DatabaseOperations.update_one(
                self.students_collection,
                {"enrollment_no": new_member_enrollment},
                {
                    "$addToSet": {
                        "event_participations": {
                            "event_id": event_id,
                            "event_name": event_data["event_name"],
                            "registration_id": member_reg_id,
                            "team_registration_id": team_registration_id,
                            "registration_type": "team",
                            "team_name": team_reg["team"]["team_name"],
                            "is_team_leader": False,
                            "registration_date": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None),
                            "status": "registered"
                        }
                    }
                }
            )
            
            # Update event's registered_students with new format
            await DatabaseOperations.update_one(
                self.events_collection,
                {"event_id": event_id},
                {
                    "$set": {f"registered_students.{member_reg_id}": new_member_enrollment},
                    "$inc": {"registration_stats.total_participants": 1}
                }
            )
            
            logger.info(f"✅ Team member added successfully: {new_member_enrollment}")
            return {
                "success": True,
                "message": "Team member added successfully",
                "member_data": new_member["student"]
            }
            
        except Exception as e:
            logger.error(f"Failed to add team member: {str(e)}")
            return {"success": False, "message": f"Failed to add team member: {str(e)}"}
    
    async def _add_team_member_direct(
        self,
        event_id: str,
        team_registration_id: str,
        new_member_enrollment: str
    ) -> Dict[str, Any]:
        """Directly add a member to team (used for invitation acceptance)."""
        try:
            logger.info(f"Directly adding team member: {new_member_enrollment} to team {team_registration_id}")
            
            # Get team registration
            team_reg = await DatabaseOperations.find_one(
                self.collection,
                {"registration_id": team_registration_id, "registration_type": "team"}
            )
            
            if not team_reg:
                return {"success": False, "message": "Team registration not found"}
            
            # Get event data for team size validation
            event_data = await DatabaseOperations.find_one(self.events_collection, {"event_id": event_id})
            if not event_data:
                return {"success": False, "message": "Event not found"}
            
            # Check team size limits
            current_team_size = len(team_reg.get("team_members", []))
            max_team_size = event_data.get("team_size_max", 10)  # Default to 10 if not specified
            
            logger.info(f"Direct add team size check: current={current_team_size}, max={max_team_size}")
            
            if current_team_size >= max_team_size:
                return {
                    "success": False, 
                    "message": f"Cannot add member. Team is already at maximum size ({current_team_size}/{max_team_size} members)"
                }
            
            # Check if new member already in team
            existing_member = any(
                member["student"]["enrollment_no"] == new_member_enrollment 
                for member in team_reg["team_members"]
            )
            if existing_member:
                return {"success": False, "message": "Student already in team"}
            
            # Check if student exists and get data
            student_data = await DatabaseOperations.find_one(
                self.students_collection,
                {"enrollment_no": new_member_enrollment}
            )
            
            if not student_data:
                return {"success": False, "message": "Student not found"}
            
            # Get event data for attendance strategy
            event_data = await DatabaseOperations.find_one(self.events_collection, {"event_id": event_id})
            attendance_strategy = await self._get_event_attendance_strategy(event_data)
            
            # Generate registration ID for new member
            import random
            import string
            member_reg_id = "REG" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
            
            # Create new member document
            new_member = {
                "registration_id": member_reg_id,
                "student": {
                    "enrollment_no": student_data["enrollment_no"],
                    "name": student_data.get("full_name", student_data.get("name", "")),
                    "email": student_data.get("email", ""),
                    "phone": student_data.get("mobile_no", student_data.get("phone", "")),
                    "department": student_data.get("department", ""),
                    "semester": student_data.get("semester", "")
                },
                "is_team_leader": False,
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
            
            # Update team registration document
            await DatabaseOperations.update_one(
                self.collection,
                {"registration_id": team_registration_id},
                {
                    "$push": {"team_members": new_member},
                    "$inc": {"team.team_size": 1},
                    "$set": {"updated_at": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None)}
                }
            )
            
            # Update student's event_participations
            await DatabaseOperations.update_one(
                self.students_collection,
                {"enrollment_no": new_member_enrollment},
                {
                    "$addToSet": {
                        "event_participations": {
                            "event_id": event_id,
                            "event_name": event_data["event_name"],
                            "registration_id": member_reg_id,
                            "team_registration_id": team_registration_id,
                            "registration_type": "team",
                            "team_name": team_reg["team"]["team_name"],
                            "is_team_leader": False,
                            "registration_date": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None),
                            "status": "registered"
                        }
                    }
                }
            )
            
            # Update event's registered_students with new format
            await DatabaseOperations.update_one(
                self.events_collection,
                {"event_id": event_id},
                {
                    "$set": {f"registered_students.{member_reg_id}": new_member_enrollment},
                    "$inc": {"registration_stats.total_participants": 1}
                }
            )
            
            logger.info(f"✅ Team member added directly via invitation: {new_member_enrollment}")
            return {
                "success": True,
                "message": "Successfully joined team via invitation",
                "member_data": new_member["student"]
            }
            
        except Exception as e:
            logger.error(f"Failed to add team member directly: {str(e)}")
            return {"success": False, "message": f"Failed to join team: {str(e)}"}
    
    async def remove_team_member(
        self,
        event_id: str,
        team_registration_id: str,
        remove_member_enrollment: str,
        requester_enrollment: str
    ) -> Dict[str, Any]:
        """Remove a member from an existing team registration."""
        try:
            logger.info(f"Removing team member: {remove_member_enrollment} from team {team_registration_id}")
            
            # Get team registration
            team_reg = await DatabaseOperations.find_one(
                self.collection,
                {"registration_id": team_registration_id, "registration_type": "team"}
            )
            
            if not team_reg:
                return {"success": False, "message": "Team registration not found"}
            
            # Check if requester is team leader
            if team_reg["team"]["team_leader"] != requester_enrollment:
                return {"success": False, "message": "Only team leader can remove members"}
            
            # Cannot remove team leader
            if remove_member_enrollment == team_reg["team"]["team_leader"]:
                return {"success": False, "message": "Cannot remove team leader"}
            
            # Check if member exists in team and get their registration_id
            member_to_remove = None
            for member in team_reg["team_members"]:
                if member["student"]["enrollment_no"] == remove_member_enrollment:
                    member_to_remove = member
                    break
                    
            if not member_to_remove:
                return {"success": False, "message": "Member not found in team"}
            
            # Get event details to check minimum team size
            event = await DatabaseOperations.find_one("events", {"event_id": event_id})
            if not event:
                return {"success": False, "message": "Event not found"}
            
            # Check minimum team size requirement
            min_team_size = event.get("team_size_min", 2)
            current_team_size = team_reg["team"]["team_size"]
            
            if current_team_size <= min_team_size:
                return {
                    "success": False, 
                    "message": f"Cannot remove member! Minimum team size required is {min_team_size} members."
                }
            
            # Remove member from team registration document
            await DatabaseOperations.update_one(
                self.collection,
                {"registration_id": team_registration_id},
                {
                    "$pull": {
                        "team_members": {
                            "student.enrollment_no": remove_member_enrollment
                        }
                    },
                    "$inc": {"team.team_size": -1},
                    "$set": {"updated_at": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None)}
                }
            )
            
            # Remove from student's event_participations
            await DatabaseOperations.update_one(
                self.students_collection,
                {"enrollment_no": remove_member_enrollment},
                {
                    "$pull": {
                        "event_participations": {
                            "event_id": event_id,
                            "team_registration_id": team_registration_id
                        }
                    }
                }
            )
            
            # Remove from event's registered_students using registration_id
            member_registration_id = member_to_remove["registration_id"]
            await DatabaseOperations.update_one(
                self.events_collection,
                {"event_id": event_id},
                {
                    "$unset": {f"registered_students.{member_registration_id}": ""},
                    "$inc": {"registration_stats.total_participants": -1}
                }
            )
            
            logger.info(f"✅ Team member removed successfully: {remove_member_enrollment}")
            return {
                "success": True,
                "message": "Team member removed successfully"
            }
            
        except Exception as e:
            logger.error(f"Failed to remove team member: {str(e)}")
            return {"success": False, "message": f"Failed to remove team member: {str(e)}"}
    
    async def send_team_invitation(
        self,
        event_id: str,
        team_registration_id: str,
        invitee_enrollment: str,
        inviter_enrollment: str
    ) -> Dict[str, Any]:
        """Send team invitation to a student."""
        try:
            logger.info(f"Sending team invitation to {invitee_enrollment} from {inviter_enrollment}")
            
            # Get team registration
            team_reg = await DatabaseOperations.find_one(
                self.collection,
                {"registration_id": team_registration_id, "registration_type": "team"}
            )
            
            if not team_reg:
                return {"success": False, "message": "Team registration not found"}
            
            # Check if inviter is team leader
            if team_reg["team"]["team_leader"] != inviter_enrollment:
                return {"success": False, "message": "Only team leader can send invitations"}
            
            # Check team size limits before sending invitation
            event = await DatabaseOperations.find_one(
                self.events_collection,
                {"event_id": event_id}
            )
            
            if not event:
                return {"success": False, "message": "Event not found"}
            
            current_team_size = len(team_reg.get("team_members", []))
            max_team_size = event.get("team_size_max", 10)  # Default to 10 if not specified
            
            # Count pending invitations to avoid oversending
            pending_invitations_count = await DatabaseOperations.count_documents(
                self.invitations_collection,
                {
                    "team_registration_id": team_registration_id,
                    "status": "pending"
                }
            )
            
            potential_team_size = current_team_size + pending_invitations_count + 1  # +1 for this new invitation
            
            logger.info(f"Team size check for invitation: current={current_team_size}, pending={pending_invitations_count}, potential={potential_team_size}, max={max_team_size}")
            
            if potential_team_size > max_team_size:
                return {
                    "success": False, 
                    "message": f"Cannot send invitation. Team would exceed maximum size ({potential_team_size}/{max_team_size} with pending invitations)"
                }
            
            # Check if invitation already exists
            existing_invitation = await DatabaseOperations.find_one(
                self.invitations_collection,
                {
                    "event_id": event_id,
                    "team_registration_id": team_registration_id,
                    "invitee_enrollment": invitee_enrollment,
                    "status": "pending"
                }
            )
            
            if existing_invitation:
                return {"success": False, "message": "Invitation already sent to this student"}
            
            # FIXED: Get team leader name from team members
            team_leader_name = "Team Leader"  # Default
            for member in team_reg.get("team_members", []):
                if member.get("is_team_leader"):
                    team_leader_name = member["student"]["name"]
                    break
            
            # Create invitation document
            invitation_id = f"INV_{event_id}_{team_registration_id}_{invitee_enrollment}_{int(datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None).timestamp())}"
            
            invitation_doc = {
                "invitation_id": invitation_id,
                "event_id": event_id,
                "team_registration_id": team_registration_id,
                "team_name": team_reg["team"]["team_name"],
                "inviter_enrollment": inviter_enrollment,
                "inviter_name": team_leader_name,  # FIXED: Use extracted name
                "invitee_enrollment": invitee_enrollment,
                "status": "pending",  # pending, accepted, declined
                "created_at": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None),
                "expires_at": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None).replace(hour=23, minute=59, second=59) + timedelta(days=7),  # 7 days to respond
                "event_name": team_reg["event"]["event_name"]
            }
            
            # Insert invitation
            await DatabaseOperations.insert_one(self.invitations_collection, invitation_doc)
            
            logger.info(f"Team invitation sent successfully: {invitation_id}")
            return {
                "success": True,
                "message": "Team invitation sent successfully",
                "invitation_id": invitation_id
            }
            
        except Exception as e:
            logger.error(f"Failed to send team invitation: {str(e)}")
            return {"success": False, "message": f"Failed to send invitation: {str(e)}"}
    
    async def respond_to_team_invitation(
        self,
        invitation_id: str,
        response: str,  # "accept" or "decline"
        student_enrollment: str
    ) -> Dict[str, Any]:
        """Respond to a team invitation."""
        try:
            logger.info(f"Processing invitation response: {invitation_id} - {response}")
            
            # Get invitation
            invitation = await DatabaseOperations.find_one(
                self.invitations_collection,
                {"invitation_id": invitation_id}
            )
            
            if not invitation:
                return {"success": False, "message": "Invitation not found"}
            
            # Check if student is the intended invitee
            if invitation["invitee_enrollment"] != student_enrollment:
                return {"success": False, "message": "Not authorized to respond to this invitation"}
            
            # Check if invitation is still pending
            if invitation["status"] != "pending":
                return {"success": False, "message": f"Invitation already {invitation['status']}"}
            
            # Check if invitation has expired
            if datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None) > invitation["expires_at"]:
                await DatabaseOperations.update_one(
                    self.invitations_collection,
                    {"invitation_id": invitation_id},
                    {"$set": {"status": "expired", "responded_at": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None)}}
                )
                return {"success": False, "message": "Invitation has expired"}
            
            if response == "accept":
                # FIXED: Check team size limits before adding member
                # Get current team registration to check size limits
                team_registration = await DatabaseOperations.find_one(
                    self.collection,
                    {
                        "registration_id": invitation["team_registration_id"],
                        "registration_type": "team"
                    }
                )
                
                if not team_registration:
                    return {"success": False, "message": "Team registration not found"}
                
                # Get event to check team size limits
                event = await DatabaseOperations.find_one(
                    self.events_collection,
                    {"event_id": invitation["event_id"]}
                )
                
                if not event:
                    return {"success": False, "message": "Event not found"}
                
                # Check team size limits
                current_team_size = len(team_registration.get("team_members", []))
                max_team_size = event.get("team_size_max", 10)  # Default to 10 if not specified
                
                logger.info(f"Team size check: current={current_team_size}, max={max_team_size}")
                
                if current_team_size >= max_team_size:
                    # Mark invitation as expired due to team being full
                    await DatabaseOperations.update_one(
                        self.invitations_collection,
                        {"invitation_id": invitation_id},
                        {"$set": {"status": "expired", "responded_at": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None), "reason": "team_full"}}
                    )
                    return {
                        "success": False, 
                        "message": f"Cannot join team '{team_registration.get('team', {}).get('team_name', 'Unknown')}'. Team is already full ({current_team_size}/{max_team_size} members). The invitation has been automatically declined."
                    }
                
                # FIXED: Directly add student to team without checking existing registration
                # (since they already received an invitation, they're eligible)
                result = await self._add_team_member_direct(
                    invitation["event_id"],
                    invitation["team_registration_id"],
                    student_enrollment
                )
                
                if result["success"]:
                    # Mark invitation as accepted
                    await DatabaseOperations.update_one(
                        self.invitations_collection,
                        {"invitation_id": invitation_id},
                        {"$set": {"status": "accepted", "responded_at": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None)}}
                    )
                    return {"success": True, "message": "Invitation accepted and joined team successfully"}
                else:
                    return result
                    
            elif response == "decline":
                # Mark invitation as declined
                await DatabaseOperations.update_one(
                    self.invitations_collection,
                    {"invitation_id": invitation_id},
                    {"$set": {"status": "declined", "responded_at": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None)}}
                )
                return {"success": True, "message": "Invitation declined"}
            
            else:
                return {"success": False, "message": "Invalid response. Use 'accept' or 'decline'"}
                
        except Exception as e:
            logger.error(f"Failed to respond to invitation: {str(e)}")
            return {"success": False, "message": f"Failed to respond to invitation: {str(e)}"}
    
    async def get_student_invitations(
        self,
        student_enrollment: str,
        status: str = "pending"
    ) -> Dict[str, Any]:
        """Get all invitations for a student."""
        try:
            invitations = await DatabaseOperations.find_many(
                self.invitations_collection,
                {
                    "invitee_enrollment": student_enrollment,
                    "status": status
                }
            )
            
            # FIXED: Serialize invitations to handle ObjectId and datetime fields
            serialized_invitations = []
            for invitation in invitations:
                serialized_invitation = {
                    "invitation_id": invitation.get("invitation_id"),
                    "event_id": invitation.get("event_id"),
                    "event_name": invitation.get("event_name"),
                    "team_registration_id": invitation.get("team_registration_id"),
                    "team_name": invitation.get("team_name"),
                    "inviter_enrollment": invitation.get("inviter_enrollment"),
                    "inviter_name": invitation.get("inviter_name"),
                    "invitee_enrollment": invitation.get("invitee_enrollment"),
                    "status": invitation.get("status"),
                    "created_at": invitation.get("created_at").isoformat() if invitation.get("created_at") else None,
                    "expires_at": invitation.get("expires_at").isoformat() if invitation.get("expires_at") else None,
                    "responded_at": invitation.get("responded_at").isoformat() if invitation.get("responded_at") else None
                }
                serialized_invitations.append(serialized_invitation)
            
            return {
                "success": True,
                "invitations": serialized_invitations,
                "count": len(serialized_invitations)
            }
            
        except Exception as e:
            logger.error(f"Failed to get student invitations: {str(e)}")
            return {"success": False, "message": f"Failed to get invitations: {str(e)}"}
    
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
                    "$unset": {
                        f"registered_students.{registration_id}": ""
                    },
                    "$set": {
                        "registration_stats.last_updated": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None)
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
            
            # 2. Remove from ALL team members' event_participations and collect registration IDs
            member_enrollments = []
            member_registration_ids = []
            for member in team_members:
                enrollment = member.get("student", {}).get("enrollment_no")
                registration_id = member.get("registration_id")
                
                if enrollment:
                    member_enrollments.append(enrollment)
                if registration_id:
                    member_registration_ids.append(registration_id)
                    
                if enrollment:
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
            
            # 3. Update event document - remove all team member registrations and decrement stats
            unset_operations = {}
            for reg_id in member_registration_ids:
                unset_operations[f"registered_students.{reg_id}"] = ""
                
            await DatabaseOperations.update_one(
                "events",
                {"event_id": event_id},
                {
                    "$inc": {
                        "registration_stats.team_count": -1,
                        "registration_stats.total_participants": -len(member_enrollments)
                    },
                    "$unset": unset_operations,
                    "$set": {
                        "registration_stats.last_updated": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None)
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
    
    async def get_team_details_by_registration_id(
        self,
        team_registration_id: str
    ) -> Dict[str, Any]:
        """Get team details by team registration ID."""
        try:
            logger.info(f"Getting team details for registration ID: {team_registration_id}")
            
            # Find team registration
            team_registration = await DatabaseOperations.find_one(
                self.collection,
                {
                    "registration_id": team_registration_id,
                    "registration_type": "team"
                }
            )
            
            if not team_registration:
                return {
                    "success": False,
                    "message": "Team registration not found"
                }
            
            # Convert ObjectIds to strings for JSON serialization
            from core.json_encoder import CustomJSONEncoder
            import json
            
            serialized_data = json.loads(json.dumps(team_registration, cls=CustomJSONEncoder))
            
            return {
                "success": True,
                "team": {
                    "team_name": team_registration.get("team", {}).get("team_name", ""),
                    "team_leader": team_registration.get("team", {}).get("team_leader", ""),
                    "registration_id": team_registration.get("registration_id"),
                    "event_name": team_registration.get("event", {}).get("event_name", ""),
                    "event_id": team_registration.get("event", {}).get("event_id", ""),
                    "status": team_registration.get("team", {}).get("status", ""),
                    "registered_at": team_registration.get("team", {}).get("registered_at"),
                    "members": team_registration.get("team_members", []),
                    "total_members": len(team_registration.get("team_members", []))
                },
                "full_data": serialized_data
            }
            
        except Exception as e:
            logger.error(f"Error getting team details: {e}")
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
        print("Student Data:", student_data)
        # Create base registration document
        registration_doc = {
            "registration_id": registration_id,
            "student": {
                "enrollment_no": student_data["enrollment_no"],
                "name": student_data.get("full_name", student_data.get("name", "")),
                "email": student_data.get("email", ""),
                "phone": student_data.get("mobile_no"),
                "department": student_data.get("department"),
                "year": additional_data.get("year")
            },
            "event": {
                "event_id": event_data["event_id"],
                "event_name": event_data.get("event_name", ""),
                "event_type": event_data.get("event_type", ""), # workshop, seminar, competition
                "start_datetime": event_data.get("start_datetime"),
                "end_datetime": event_data.get("end_datetime")
            },
            "registration": {
                "type": registration_type,
                "status": "confirmed",
                "registered_at": datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None),
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
