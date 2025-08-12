"""
Normalized Registration System - Eliminates Data Duplication

This module provides a refactored registration system that eliminates the duplication
between student.event_participations and event.registrations by storing:

1. Full registration data in event.registrations (primary source)
2. Reference data only in student.event_participations (registration_id + minimal metadata)

Benefits:
- Eliminates data duplication
- Single source of truth for registration data
- Reduces storage requirements
- Prevents data inconsistency
- Maintains query performance with proper indexing
"""

from datetime import datetime, timezone
from fastapi import HTTPException
from core.id_generator import generate_registration_id, generate_team_registration_id
from database.operations import DatabaseOperations
from models.student import Student
from models.faculty import Faculty

class NormalizedRegistrationService:
    """Handles registration without data duplication"""
    
    @staticmethod
    async def register_individual(
        student: Student,
        event_id: str,
        registration_data: dict
    ) -> dict:
        """
        Register individual student with normalized storage
        
        Args:
            student: Student object
            event_id: Event identifier
            registration_data: Registration form data
            
        Returns:
            Registration result with registration_id
        """
        try:
            # Generate registration ID
            registration_id = generate_registration_id(
                student.enrollment_no,
                event_id,
                student.full_name
            )
            
            registration_datetime = datetime.now(timezone.utc)
            
            # Prepare full registration data (stored in event only)
            # Only include necessary fields, avoid spreading all form data
            full_registration_data = {
                "registration_id": registration_id,
                "registration_type": "individual",
                "registration_datetime": registration_datetime,
                "student_data": {
                    "full_name": student.full_name,
                    "enrollment_no": student.enrollment_no,
                    "email": student.email,
                    "mobile_no": student.mobile_no,
                    "department": student.department,
                    "semester": student.semester,
                    "gender": registration_data.get("gender"),
                    "date_of_birth": registration_data.get("date_of_birth")
                }
            }
            
            # Prepare minimal reference data (stored in student only)
            student_reference_data = {
                "registration_id": registration_id,
                "registration_type": "individual",
                "registration_datetime": registration_datetime,
                "event_id": event_id,
                "status": "registered"  # Basic status tracking
            }
            
            # Store full data in event.registrations (primary source)
            await DatabaseOperations.update_one(
                "events",
                {"event_id": event_id},
                {"$set": {f"registrations.{registration_id}": full_registration_data}}
            )
            
            # Store reference data in student.event_participations
            await DatabaseOperations.update_one(
                "students",
                {"enrollment_no": student.enrollment_no},
                {"$set": {f"event_participations.{event_id}": student_reference_data}}
            )
            
            return {
                "success": True,
                "registration_id": registration_id,
                "message": "Registration successful"
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")
    
    @staticmethod
    async def register_team(
        leader: Student,
        event_id: str,
        team_name: str,
        team_members: list,
        registration_data: dict
    ) -> dict:
        """
        Register team with normalized storage
        
        Args:
            leader: Team leader Student object
            event_id: Event identifier
            team_name: Name of the team
            team_members: List of team member data
            registration_data: Registration form data
            
        Returns:
            Registration result with team_registration_id
        """
        try:
            # Generate team registration ID
            team_registration_id = generate_team_registration_id(
                team_name,
                event_id,
                leader.enrollment_no
            )
            
            registration_datetime = datetime.now(timezone.utc)
            
            # Register team leader
            leader_registration_id = generate_registration_id(
                leader.enrollment_no,
                event_id,
                leader.full_name
            )
            
            # Full team leader data (stored in event only)
            leader_full_data = {
                "registration_id": leader_registration_id,
                "registration_type": "team_leader",
                "registration_datetime": registration_datetime,
                "team_registration_id": team_registration_id,
                "student_data": {
                    "full_name": leader.full_name,
                    "enrollment_no": leader.enrollment_no,
                    "email": leader.email,
                    "mobile_no": leader.mobile_no,
                    "department": leader.department,
                    "semester": leader.semester,
                    "gender": registration_data.get("gender"),
                    "date_of_birth": registration_data.get("date_of_birth"),
                    "team_name": team_name,
                    "is_team_leader": True
                },
                "team_members": team_members
            }
            
            # Reference data for team leader (stored in student only)
            leader_reference_data = {
                "registration_id": leader_registration_id,
                "registration_type": "team_leader",
                "registration_datetime": registration_datetime,
                "event_id": event_id,
                "team_registration_id": team_registration_id,
                "team_name": team_name,
                "status": "registered"
            }
            
            # Store leader data
            await DatabaseOperations.update_one(
                "events",
                {"event_id": event_id},
                {"$set": {f"registrations.{leader_registration_id}": leader_full_data}}
            )
            
            await DatabaseOperations.update_one(
                "students",
                {"enrollment_no": leader.enrollment_no},
                {"$set": {f"event_participations.{event_id}": leader_reference_data}}
            )
            
            # Register team members
            member_registrations = []
            for member in team_members:
                member_enrollment = member.get('enrollment_no')
                if member_enrollment:
                    # Check if member exists
                    member_data = await DatabaseOperations.find_one(
                        "students", 
                        {"enrollment_no": member_enrollment}
                    )
                    
                    if member_data:
                        # Check if already registered
                        member_participations = member_data.get('event_participations', {})
                        if event_id not in member_participations:
                            
                            member_registration_id = generate_registration_id(
                                member_enrollment,
                                event_id,
                                member.get('name', member_data.get('full_name'))
                            )
                            
                            # Full member data (stored in event only)
                            member_full_data = {
                                "registration_id": member_registration_id,
                                "registration_type": "team_member",
                                "registration_datetime": registration_datetime,
                                "team_registration_id": team_registration_id,
                                "team_leader_enrollment": leader.enrollment_no,
                                "student_data": {
                                    "full_name": member.get('name', member_data.get('full_name')),
                                    "enrollment_no": member_enrollment,
                                    "email": member.get('email', member_data.get('email')),
                                    "mobile_no": member.get('mobile_no', member_data.get('mobile_no')),
                                    "department": member_data.get('department'),
                                    "semester": member_data.get('semester'),
                                    "team_name": team_name,
                                    "is_team_leader": False
                                }
                            }
                            
                            # Reference data for member (stored in student only)
                            member_reference_data = {
                                "registration_id": member_registration_id,
                                "registration_type": "team_member",
                                "registration_datetime": registration_datetime,
                                "event_id": event_id,
                                "team_registration_id": team_registration_id,
                                "team_leader_enrollment": leader.enrollment_no,
                                "team_name": team_name,
                                "status": "registered"
                            }
                            
                            # Store member data
                            await DatabaseOperations.update_one(
                                "events",
                                {"event_id": event_id},
                                {"$set": {f"registrations.{member_registration_id}": member_full_data}}
                            )
                            
                            await DatabaseOperations.update_one(
                                "students",
                                {"enrollment_no": member_enrollment},
                                {"$set": {f"event_participations.{event_id}": member_reference_data}}
                            )
                            
                            member_registrations.append(member_registration_id)
            
            return {
                "success": True,
                "team_registration_id": team_registration_id,
                "leader_registration_id": leader_registration_id,
                "member_registration_ids": member_registrations,
                "message": "Team registration successful"
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Team registration failed: {str(e)}")
    
    @staticmethod
    async def get_full_registration_data(registration_id: str, event_id: str) -> dict:
        """
        Get full registration data from primary source (event.registrations)
        
        Args:
            registration_id: Registration identifier
            event_id: Event identifier
            
        Returns:
            Full registration data or None
        """
        try:
            event = await DatabaseOperations.find_one(
                "events",
                {"event_id": event_id},
                {"registrations": 1}
            )
            
            if event and "registrations" in event:
                return event["registrations"].get(registration_id)
            
            return None
            
        except Exception as e:
            print(f"Error getting registration data: {e}")
            return None
    
    @staticmethod
    async def get_student_registrations(enrollment_no: str) -> dict:
        """
        Get student's registration references and optionally resolve full data
        
        Args:
            enrollment_no: Student enrollment number
            
        Returns:
            Dictionary of event_id -> registration reference data
        """
        try:
            student = await DatabaseOperations.find_one(
                "students",
                {"enrollment_no": enrollment_no},
                {"event_participations": 1}
            )
            
            if student:
                return student.get("event_participations", {})
            
            return {}
            
        except Exception as e:
            print(f"Error getting student registrations: {e}")
            return {}


# Helper functions for backward compatibility during migration

async def get_registration_with_compatibility(event_id: str, registration_id: str) -> dict:
    """
    Helper function to get registration data with backward compatibility
    Checks both new normalized format and old duplicated format
    """
    # Try new normalized format first
    normalized_data = await NormalizedRegistrationService.get_full_registration_data(
        registration_id, event_id
    )
    
    if normalized_data:
        return normalized_data
    
    # Fallback to old format (for migration period)
    student = await DatabaseOperations.find_one(
        "students",
        {f"event_participations.{event_id}.registration_id": registration_id},
        {f"event_participations.{event_id}": 1}
    )
    
    if student and "event_participations" in student:
        return student["event_participations"].get(event_id)
    
    return None


async def migrate_existing_registrations():
    """
    Migration script to convert existing duplicated data to normalized format
    
    This script should be run once to:
    1. Keep full data in event.registrations 
    2. Replace full data in student.event_participations with references only
    """
    print("Starting migration to normalized registration storage...")
    
    # Get all students with event participations
    students = await DatabaseOperations.find_many(
        "students",
        {"event_participations": {"$exists": True, "$ne": {}}},
        {"enrollment_no": 1, "event_participations": 1}
    )
    
    migration_count = 0
    
    for student in students:
        enrollment_no = student["enrollment_no"]
        participations = student.get("event_participations", {})
        
        for event_id, participation_data in participations.items():
            if isinstance(participation_data, dict) and "registration_id" in participation_data:
                # Check if this is full data (has student_data)
                if "student_data" in participation_data:
                    # Create reference data
                    reference_data = {
                        "registration_id": participation_data["registration_id"],
                        "registration_type": participation_data.get("registration_type", "individual"),
                        "registration_datetime": participation_data.get("registration_datetime"),
                        "event_id": event_id,
                        "status": "registered"
                    }
                    
                    # Add team-specific fields if present
                    if "team_registration_id" in participation_data:
                        reference_data["team_registration_id"] = participation_data["team_registration_id"]
                        reference_data["team_name"] = participation_data.get("student_data", {}).get("team_name")
                    
                    if "team_leader_enrollment" in participation_data:
                        reference_data["team_leader_enrollment"] = participation_data["team_leader_enrollment"]
                    
                    # Replace full data with reference data
                    await DatabaseOperations.update_one(
                        "students",
                        {"enrollment_no": enrollment_no},
                        {"$set": {f"event_participations.{event_id}": reference_data}}
                    )
                    
                    migration_count += 1
                    print(f"Migrated registration {participation_data['registration_id']} for student {enrollment_no}")
    
    print(f"Migration completed. Processed {migration_count} registrations.")
    return migration_count


if __name__ == "__main__":
    import asyncio
    # Uncomment to run migration
    # asyncio.run(migrate_existing_registrations())
    pass
