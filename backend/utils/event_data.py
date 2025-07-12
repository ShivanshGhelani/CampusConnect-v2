"""
Event Data Manager - Utility functions for managing event data structures
according to the new team-based and individual event requirements.
"""

from typing import Dict, List, Optional, Tuple
from datetime import datetime
from database.operations import DatabaseOperations


class EventDataManager:
    """Manages event data operations for different event types"""
    
    @staticmethod
    async def add_individual_registration(event_id: str, enrollment_no: str, registrar_id: str, 
                                        is_paid: bool = False, payment_id: str = None) -> bool:
        """
        Add individual registration to event data structure
        
        For Individual Free Events:
        - Add to event.registrations: {registrar_id: enrollment_no}
        
        For Individual Paid Events:
        - Add to event.registrations: {registrar_id: enrollment_no}
        - Payment handled in student data
        """
        try:
            # Update event data
            update_data = {
                f"registrations.{registrar_id}": enrollment_no
            }
            
            await DatabaseOperations.update_one(
                "events",
                {"event_id": event_id},
                {"$set": update_data}
            )
            
            # Update student data
            student_participation_data = {
                "registration_id": registrar_id,
                "registration_date": datetime.utcnow(),
                "registration_type": "individual"
            }
            
            if is_paid:
                student_participation_data["payment_id"] = payment_id
                student_participation_data["payment_status"] = "pending"
            
            await DatabaseOperations.update_one(
                "students",
                {"enrollment_no": enrollment_no},
                {
                    "$set": {
                        f"event_participations.{event_id}": student_participation_data
                    }
                }
            )
            
            return True
            
        except Exception as e:
            print(f"Error adding individual registration: {e}")
            return False
    
    @staticmethod
    async def add_team_registration(event_id: str, team_name: str, members: List[Dict[str, str]], 
                                  is_paid: bool = False, payment_id: str = None) -> bool:
        """
        Add team registration to event data structure
        
        Args:
            members: List of {"enrollment_no": "registrar_id"} dicts
            
        For Team Free Events:
        - Add to event.team_registrations: {team_name: {member1_enrollment: registrar_id, ...}}
        
        For Team Paid Events:
        - Add to event.team_registrations: {team_name: {member1_enrollment: registrar_id, ..., payment_id: value, payment_status: pending}}
        """
        try:
            # Prepare team registration data
            team_data = {}
            for member in members:
                enrollment_no = member["enrollment_no"]
                registrar_id = member["registrar_id"]
                team_data[enrollment_no] = registrar_id
            
            # Add payment info for paid events
            if is_paid:
                team_data["payment_id"] = payment_id
                team_data["payment_status"] = "pending"
            
            # Update event data
            await DatabaseOperations.update_one(
                "events",
                {"event_id": event_id},
                {
                    "$set": {
                        f"team_registrations.{team_name}": team_data
                    }
                }
            )
            
            # Update each student's data
            for member in members:
                enrollment_no = member["enrollment_no"]
                registrar_id = member["registrar_id"]
                
                student_participation_data = {
                    "registration_id": registrar_id,
                    "registration_date": datetime.utcnow(),
                    "registration_type": "team_member",
                    "team_name": team_name
                }
                
                if is_paid:
                    student_participation_data["payment_id"] = payment_id
                    student_participation_data["payment_status"] = "pending"
                
                await DatabaseOperations.update_one(
                    "students",
                    {"enrollment_no": enrollment_no},
                    {
                        "$set": {
                            f"event_participations.{event_id}": student_participation_data
                        }
                    }
                )
            
            return True
            
        except Exception as e:
            print(f"Error adding team registration: {e}")
            return False
    
    @staticmethod
    async def add_individual_attendance(event_id: str, enrollment_no: str, attendance_id: str) -> bool:
        """Add individual attendance record"""
        try:
            # Update event data
            await DatabaseOperations.update_one(
                "events",
                {"event_id": event_id},
                {
                    "$set": {
                        f"attendances.{attendance_id}": enrollment_no
                    }
                }
            )
            
            # Update student data
            await DatabaseOperations.update_one(
                "students",
                {"enrollment_no": enrollment_no},
                {
                    "$set": {
                        f"event_participations.{event_id}.attendance_id": attendance_id
                    }
                }
            )
            
            return True
            
        except Exception as e:
            print(f"Error adding individual attendance: {e}")
            return False
    
    @staticmethod
    async def add_team_attendance(event_id: str, team_name: str, members: List[Dict[str, str]]) -> bool:
        """
        Add team attendance records
        
        Args:
            members: List of {"enrollment_no": "attendance_id"} dicts
        """
        try:
            # Prepare team attendance data
            team_attendance_data = {}
            for member in members:
                enrollment_no = member["enrollment_no"]
                attendance_id = member["attendance_id"]
                team_attendance_data[enrollment_no] = attendance_id
            
            # Update event data
            await DatabaseOperations.update_one(
                "events",
                {"event_id": event_id},
                {
                    "$set": {
                        f"team_attendances.{team_name}": team_attendance_data
                    }
                }
            )
            
            # Update each student's data
            for member in members:
                enrollment_no = member["enrollment_no"]
                attendance_id = member["attendance_id"]
                
                await DatabaseOperations.update_one(
                    "students",
                    {"enrollment_no": enrollment_no},
                    {
                        "$set": {
                            f"event_participations.{event_id}.attendance_id": attendance_id
                        }
                    }
                )
            
            return True
            
        except Exception as e:
            print(f"Error adding team attendance: {e}")
            return False
    
    @staticmethod
    async def add_individual_feedback(event_id: str, enrollment_no: str, feedback_id: str) -> bool:
        """Add individual feedback record"""
        try:
            # Update event data
            await DatabaseOperations.update_one(
                "events",
                {"event_id": event_id},
                {
                    "$set": {
                        f"feedbacks.{feedback_id}": enrollment_no
                    }
                }
            )
            
            # Update student data
            await DatabaseOperations.update_one(
                "students",
                {"enrollment_no": enrollment_no},
                {
                    "$set": {
                        f"event_participations.{event_id}.feedback_id": feedback_id
                    }
                }
            )
            
            return True
            
        except Exception as e:
            print(f"Error adding individual feedback: {e}")
            return False
    
    @staticmethod
    async def add_team_feedback(event_id: str, team_name: str, members: List[Dict[str, str]]) -> bool:
        """
        Add team feedback records
        
        Args:
            members: List of {"enrollment_no": "feedback_id"} dicts
        """
        try:
            # Prepare team feedback data
            team_feedback_data = {}
            for member in members:
                enrollment_no = member["enrollment_no"]
                feedback_id = member["feedback_id"]
                team_feedback_data[enrollment_no] = feedback_id
            
            # Update event data
            await DatabaseOperations.update_one(
                "events",
                {"event_id": event_id},
                {
                    "$set": {
                        f"team_feedbacks.{team_name}": team_feedback_data
                    }
                }
            )
            
            # Update each student's data
            for member in members:
                enrollment_no = member["enrollment_no"]
                feedback_id = member["feedback_id"]
                
                await DatabaseOperations.update_one(
                    "students",
                    {"enrollment_no": enrollment_no},
                    {
                        "$set": {
                            f"event_participations.{event_id}.feedback_id": feedback_id
                        }
                    }
                )
            
            return True
            
        except Exception as e:
            print(f"Error adding team feedback: {e}")
            return False
    
    @staticmethod
    async def add_individual_certificate(event_id: str, enrollment_no: str, certificate_id: str) -> bool:
        """Add individual certificate record"""
        try:
            # Update event data
            await DatabaseOperations.update_one(
                "events",
                {"event_id": event_id},
                {
                    "$set": {
                        f"certificates.{certificate_id}": enrollment_no
                    }
                }
            )
            
            # Update student data
            await DatabaseOperations.update_one(
                "students",
                {"enrollment_no": enrollment_no},
                {
                    "$set": {
                        f"event_participations.{event_id}.certificate_id": certificate_id
                    }
                }
            )
            
            return True
            
        except Exception as e:
            print(f"Error adding individual certificate: {e}")
            return False
    
    @staticmethod
    async def add_team_certificate(event_id: str, team_name: str, members: List[Dict[str, str]]) -> bool:
        """
        Add team certificate records
        
        Args:
            members: List of {"enrollment_no": "certificate_id"} dicts
        """
        try:
            # Prepare team certificate data
            team_certificate_data = {}
            for member in members:
                enrollment_no = member["enrollment_no"]
                certificate_id = member["certificate_id"]
                team_certificate_data[enrollment_no] = certificate_id
            
            # Update event data
            await DatabaseOperations.update_one(
                "events",
                {"event_id": event_id},
                {
                    "$set": {
                        f"team_certificates.{team_name}": team_certificate_data
                    }
                }
            )
            
            # Update each student's data
            for member in members:
                enrollment_no = member["enrollment_no"]
                certificate_id = member["certificate_id"]
                
                await DatabaseOperations.update_one(
                    "students",
                    {"enrollment_no": enrollment_no},
                    {
                        "$set": {
                            f"event_participations.{event_id}.certificate_id": certificate_id
                        }
                    }
                )
            
            return True
            
        except Exception as e:
            print(f"Error adding team certificate: {e}")
            return False
    
    @staticmethod
    async def update_payment_status(event_id: str, enrollment_no: str, payment_status: str, 
                                  team_name: str = None) -> bool:
        """
        Update payment status for individual or team registration
        
        Args:
            event_id: Event ID
            enrollment_no: Student enrollment number
            payment_status: "complete" or "pending"
            team_name: Team name if this is a team event
        """
        try:
            # Update student data
            await DatabaseOperations.update_one(
                "students",
                {"enrollment_no": enrollment_no},
                {
                    "$set": {
                        f"event_participations.{event_id}.payment_status": payment_status
                    }
                }
            )
            
            # Update event data for team events
            if team_name:
                await DatabaseOperations.update_one(
                    "events",
                    {"event_id": event_id},
                    {
                        "$set": {
                            f"team_registrations.{team_name}.payment_status": payment_status
                        }
                    }
                )
            
            return True
            
        except Exception as e:            
            print(f"Error updating payment status: {e}")
            return False
    
    @staticmethod
    async def get_event_statistics(event_id: str) -> Dict:
        """Get comprehensive statistics for an event"""
        try:
            event = await DatabaseOperations.find_one("events", {"event_id": event_id})
            if not event:
                return {}
            
            is_team_based = event.get("is_team_based", False)
            
            if is_team_based:
                # For team-based events:
                # - team_registrations count = number of teams
                # - registrations count = total participants (including team members)
                stats = {
                    "total_individual_registrations": 0,  # No individual registrations for team events
                    "total_team_registrations": len(event.get("team_registrations", {})),
                    "total_participants": len(event.get("registrations", {})),  # Total participants
                    "total_team_members": len(event.get("registrations", {})),  # Same as participants for team events
                }
            else:
                # For individual events:
                # - registrations count = individual registrations
                # - no team registrations
                stats = {
                    "total_individual_registrations": len(event.get("registrations", {})),
                    "total_team_registrations": 0,  # No teams for individual events
                    "total_participants": len(event.get("registrations", {})),
                    "total_team_members": 0,  # No team members for individual events
                }
            
            # Common statistics (attendance, feedback, certificates)
            stats.update({
                "total_attendances": len(event.get("attendances", {})) + sum(
                    len(team_attendance) for team_attendance in event.get("team_attendances", {}).values()
                ),
                "total_feedbacks": len(event.get("feedbacks", {})) + sum(
                    len(team_feedback) for team_feedback in event.get("team_feedbacks", {}).values()
                ),
                "total_certificates": len(event.get("certificates", {})) + sum(
                    len(team_certificate) for team_certificate in event.get("team_certificates", {}).values()
                )
            })
            
            # Payment statistics for paid events
            if event.get("is_paid", False):
                # Count completed payments for individual registrations
                individual_paid = 0
                for registrar_id, enrollment_no in event.get("registrations", {}).items():
                    student_data = await DatabaseOperations.find_one("students", {"enrollment_no": enrollment_no})
                    if student_data:
                        participation = student_data.get("event_participations", {}).get(event_id, {})
                        if participation.get("payment_status") == "complete":
                            individual_paid += 1
                
                # Count completed payments for teams
                team_paid = 0
                for team_name, team_data in event.get("team_registrations", {}).items():
                    if team_data.get("payment_status") == "complete":
                        team_paid += 1
                
                stats["payments_completed"] = individual_paid + team_paid
                stats["payments_pending"] = (stats["total_individual_registrations"] + 
                                           stats["total_team_registrations"] - 
                                           stats["payments_completed"])
            
            return stats
            
        except Exception as e:
            print(f"Error getting event statistics: {e}")
            return {}    @staticmethod
    async def get_event_registrations_with_details(event_id: str, limit: int = 5) -> Dict:
        """
        Get registration details with student information for admin display
        
        Args:
            event_id: Event ID
            limit: Maximum number of registrations to return (0 for all)
            
        Returns:
            Dict containing individual and team registrations with student details
        """
        try:
            event = await DatabaseOperations.find_one("events", {"event_id": event_id})
            if not event:
                return {"individual_registrations": [], "team_registrations": []}
            
            is_team_based = event.get("is_team_based", False)
            
            result = {
                "individual_registrations": [],
                "team_registrations": [],
                "is_team_based": is_team_based
            }
            
            if is_team_based:
                # For team-based events, focus on team_registrations and ignore individual registrations
                team_registrations = []
                for team_registration_id, team_data in event.get("team_registrations", {}).items():
                    # Handle the actual team data structure:
                    # {
                    #     "team_registration_id": "TEAM_INNOVATI_10056_543C",
                    #     "team_name": "DRID",
                    #     "team_leader_enrollment": "22CSEB10056", 
                    #     "participants": ["22BEIT30043"],
                    #     "registration_date": datetime(...)
                    # }
                    
                    team_members = []
                    team_name = team_data.get("team_name", team_registration_id)
                    team_leader_enrollment = team_data.get("team_leader_enrollment")
                    registration_date = team_data.get("registration_date")
                    participants = team_data.get("participants", [])
                    
                    # Add team leader to participants list if not already included
                    all_participants = [team_leader_enrollment] if team_leader_enrollment else []
                    if participants:
                        all_participants.extend(participants)
                    
                    # Remove duplicates while preserving order
                    seen = set()
                    unique_participants = []
                    for participant in all_participants:
                        if participant and participant not in seen:
                            seen.add(participant)
                            unique_participants.append(participant)
                    
                    # Get student details for all team members
                    for enrollment_no in unique_participants:
                        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": enrollment_no})
                        if student_data:
                            participation = student_data.get("event_participations", {}).get(event_id, {})
                            
                            # Determine if this is the team leader
                            is_team_leader = (enrollment_no == team_leader_enrollment)
                            member_info = {
                                "registrar_id": participation.get("registration_id", team_registration_id),
                                "enrollment_no": enrollment_no,
                                "full_name": student_data.get("full_name", "N/A"),
                                "email": student_data.get("email", "N/A"),
                                "mobile_no": student_data.get("mobile_no", "N/A"),
                                "department": student_data.get("department", "N/A"),
                                "semester": student_data.get("semester", "N/A"),
                                "registration_type": "team_leader" if is_team_leader else "team_member",
                                "attendance_id": participation.get("attendance_id"),
                                "feedback_id": participation.get("feedback_id"),
                                "certificate_id": participation.get("certificate_id")
                            }
                            
                            team_members.append(member_info)
                    
                    if team_members:
                        team_registrations.append({
                            "team_name": team_name,
                            "team_leader_enrollment": team_leader_enrollment,
                            "registration_date": registration_date,
                            "payment_status": team_data.get("payment_status"),
                            "payment_id": team_data.get("payment_id"),
                            "members": team_members,
                            "member_count": len(team_members)
                        })
                
                # Sort teams by registration date (newest first)
                team_registrations.sort(
                    key=lambda x: x.get("registration_date") or datetime.min,
                    reverse=True
                )
                
                # Apply limit if specified
                if limit > 0:
                    team_registrations = team_registrations[:limit]
                
                result["team_registrations"] = team_registrations
                
            else:
                # For individual events, process individual registrations
                individual_registrations = []
                for registrar_id, enrollment_no in event.get("registrations", {}).items():
                    student_data = await DatabaseOperations.find_one("students", {"enrollment_no": enrollment_no})
                    if student_data:
                        participation = student_data.get("event_participations", {}).get(event_id, {})
                        individual_registrations.append({
                            "registrar_id": registrar_id,
                            "enrollment_no": enrollment_no,
                            "full_name": student_data.get("full_name", "N/A"),
                            "email": student_data.get("email", "N/A"),
                            "mobile_no": student_data.get("mobile_no", "N/A"),
                            "department": student_data.get("department", "N/A"),
                            "semester": student_data.get("semester", "N/A"),
                            "registration_date": participation.get("registration_date"),
                            "attendance_id": participation.get("attendance_id"),
                            "feedback_id": participation.get("feedback_id"),
                            "certificate_id": participation.get("certificate_id"),
                            "payment_status": participation.get("payment_status")
                        })
                
                # Sort by registration date (newest first)
                individual_registrations.sort(
                    key=lambda x: x.get("registration_date") or datetime.min, 
                    reverse=True
                )
                
                # Apply limit if specified
                if limit > 0:
                    individual_registrations = individual_registrations[:limit]
                
                result["individual_registrations"] = individual_registrations
            
            return result
            
        except Exception as e:
            print(f"Error getting event registrations with details: {e}")
            return {"individual_registrations": [], "team_registrations": []}
