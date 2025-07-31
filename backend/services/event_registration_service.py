"""
Event Registration Service with Dual-Layer Attendance Verification

This service handles event registration and the new dual-layer attendance system
that tracks both virtual (student self-marking) and physical (admin verification) attendance.
"""

import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient

from config.database import Database
from models.event_registration import (
    EventRegistration, TeamEventRegistration, AttendanceStatus,
    VirtualAttendanceRequest, PhysicalAttendanceRequest, AttendanceResponse,
    BulkPhysicalAttendanceRequest, AttendanceStatsResponse,
    RegistrationLookupRequest, RegistrationResponse
)
from core.id_generator import (
    generate_registration_id, generate_team_registration_id,
    generate_virtual_attendance_id, generate_physical_attendance_id
)

logger = logging.getLogger(__name__)

class EventRegistrationService:
    """Service for managing event registrations and dual-layer attendance"""
    
    def __init__(self):
        self.db_client = None
    
    async def get_database(self):
        """Get database connection"""
        try:
            if self.db_client is None:
                self.db_client = Database()
            return await self.db_client.get_database()
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            return None
    
    # Registration Helper Functions
    
    async def is_student_registered_for_event(self, student_enrollment: str, event_id: str) -> bool:
        """
        Check if a student is registered for an event
        
        Args:
            student_enrollment: Student's enrollment number
            event_id: Event ID
            
        Returns:
            True if student is registered, False otherwise
        """
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            # Check individual registrations
            individual_registration = await db["event_registrations"].find_one({
                "student_enrollment": student_enrollment,
                "event_id": event_id
            })
            
            if individual_registration:
                return True
            
            # Check team registrations
            team_registration = await db["team_event_registrations"].find_one({
                "event_id": event_id,
                f"team_members.{student_enrollment}": {"$exists": True}
            })
            
            return team_registration is not None
            
        except Exception as e:
            logger.error(f"Error checking registration: {e}")
            return False
    
    async def get_registration_by_student_and_event(self, student_enrollment: str, event_id: str) -> Optional[EventRegistration]:
        """
        Get registration details for a specific student and event
        
        Args:
            student_enrollment: Student's enrollment number
            event_id: Event ID
            
        Returns:
            EventRegistration object if found, None otherwise
        """
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            # Try to find individual registration first
            individual_registration = await db["event_registrations"].find_one({
                "student_enrollment": student_enrollment,
                "event_id": event_id
            })
            
            if individual_registration:
                return EventRegistration(**individual_registration)
            
            # Check team registrations
            team_registration = await db["team_event_registrations"].find_one({
                "event_id": event_id,
                f"team_members.{student_enrollment}": {"$exists": True}
            })
            
            if team_registration:
                team_reg = TeamEventRegistration(**team_registration)
                return team_reg.team_members.get(student_enrollment)
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting registration: {e}")
            return None
    
    async def get_registration_by_id(self, registration_id: str) -> Optional[EventRegistration]:
        """
        Get registration by registration ID
        
        Args:
            registration_id: Registration ID
            
        Returns:
            EventRegistration object if found, None otherwise
        """
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            # Try individual registrations first
            individual_registration = await db["event_registrations"].find_one({
                "registration_id": registration_id
            })
            
            if individual_registration:
                return EventRegistration(**individual_registration)
            
            # Check team registrations
            team_registration = await db["team_event_registrations"].find_one({
                f"team_members.{registration_id.split('_')[0]}.registration_id": registration_id
            })
            
            if team_registration:
                team_reg = TeamEventRegistration(**team_registration)
                for member in team_reg.team_members.values():
                    if member.registration_id == registration_id:
                        return member
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting registration by ID: {e}")
            return None
    
    # Virtual Attendance Functions
    
    async def mark_virtual_attendance(self, request: VirtualAttendanceRequest, student_enrollment: str = None) -> AttendanceResponse:
        """
        Mark virtual attendance for a student
        
        Args:
            request: Virtual attendance request
            student_enrollment: Optional student enrollment (for validation)
            
        Returns:
            AttendanceResponse with success status and details
        """
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            # Get the registration
            registration = await self.get_registration_by_id(request.registration_id)
            if not registration:
                return AttendanceResponse(
                    success=False,
                    message="Registration not found"
                )
            
            # Validate student enrollment if provided
            if student_enrollment and registration.student_enrollment != student_enrollment:
                return AttendanceResponse(
                    success=False,
                    message="Registration does not belong to this student"
                )
            
            # Check if virtual attendance already marked
            if registration.virtual_attendance_id:
                return AttendanceResponse(
                    success=False,
                    message="Virtual attendance already marked",
                    data=registration.get_attendance_summary()
                )
            
            # Generate virtual attendance ID
            virtual_attendance_id = generate_virtual_attendance_id(
                registration.student_enrollment, 
                registration.event_id
            )
            
            # Mark virtual attendance
            timestamp = datetime.utcnow()
            registration.mark_virtual_attendance(virtual_attendance_id, timestamp)
            
            # Add metadata
            if request.location_data:
                registration.attendance_metadata["virtual_location"] = request.location_data
            registration.attendance_metadata["virtual_marked_at"] = timestamp.isoformat()
            
            # Update in database
            await db["event_registrations"].update_one(
                {"registration_id": request.registration_id},
                {"$set": registration.dict()}
            )
            
            logger.info(f"Virtual attendance marked for {registration.student_enrollment} in event {registration.event_id}")
            
            return AttendanceResponse(
                success=True,
                message="Virtual attendance marked successfully",
                data=registration.get_attendance_summary()
            )
            
        except Exception as e:
            logger.error(f"Error marking virtual attendance: {e}")
            return AttendanceResponse(
                success=False,
                message=f"Failed to mark virtual attendance: {str(e)}"
            )
    
    # Physical Attendance Functions
    
    async def mark_physical_attendance(self, request: PhysicalAttendanceRequest, marked_by: str) -> AttendanceResponse:
        """
        Mark physical attendance for a student (admin/organizer action)
        
        Args:
            request: Physical attendance request
            marked_by: Admin username who marked the attendance
            
        Returns:
            AttendanceResponse with success status and details
        """
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            # Get the registration
            registration = await self.get_registration_by_id(request.registration_id)
            if not registration:
                return AttendanceResponse(
                    success=False,
                    message="Registration not found"
                )
            
            # Check if physical attendance already marked
            if registration.physical_attendance_id:
                return AttendanceResponse(
                    success=False,
                    message="Physical attendance already marked",
                    data=registration.get_attendance_summary()
                )
            
            # Generate physical attendance ID
            physical_attendance_id = generate_physical_attendance_id(
                registration.student_enrollment, 
                registration.event_id,
                marked_by
            )
            
            # Mark physical attendance
            timestamp = datetime.utcnow()
            registration.mark_physical_attendance(physical_attendance_id, timestamp, marked_by)
            
            # Add metadata
            if request.notes:
                registration.attendance_metadata["physical_notes"] = request.notes
            registration.attendance_metadata["physical_marked_at"] = timestamp.isoformat()
            
            # Update in database
            await db["event_registrations"].update_one(
                {"registration_id": request.registration_id},
                {"$set": registration.dict()}
            )
            
            logger.info(f"Physical attendance marked for {registration.student_enrollment} in event {registration.event_id} by {marked_by}")
            
            return AttendanceResponse(
                success=True,
                message="Physical attendance marked successfully",
                data=registration.get_attendance_summary()
            )
            
        except Exception as e:
            logger.error(f"Error marking physical attendance: {e}")
            return AttendanceResponse(
                success=False,
                message=f"Failed to mark physical attendance: {str(e)}"
            )
    
    async def bulk_mark_physical_attendance(self, request: BulkPhysicalAttendanceRequest, marked_by: str) -> AttendanceResponse:
        """
        Mark physical attendance for multiple students in bulk
        
        Args:
            request: Bulk physical attendance request
            marked_by: Admin username who marked the attendance
            
        Returns:
            AttendanceResponse with success status and details
        """
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            results = {
                "successful": [],
                "failed": [],
                "already_marked": []
            }
            
            for registration_id in request.registration_ids:
                # Create individual request
                individual_request = PhysicalAttendanceRequest(
                    registration_id=registration_id,
                    notes=request.notes
                )
                
                # Mark attendance
                response = await self.mark_physical_attendance(individual_request, marked_by)
                
                if response.success:
                    results["successful"].append({
                        "registration_id": registration_id,
                        "data": response.data
                    })
                elif "already marked" in response.message:
                    results["already_marked"].append(registration_id)
                else:
                    results["failed"].append({
                        "registration_id": registration_id,
                        "error": response.message
                    })
            
            total_processed = len(request.registration_ids)
            successful_count = len(results["successful"])
            
            return AttendanceResponse(
                success=True,
                message=f"Processed {total_processed} registrations. {successful_count} marked successfully.",
                data=results
            )
            
        except Exception as e:
            logger.error(f"Error in bulk physical attendance marking: {e}")
            return AttendanceResponse(
                success=False,
                message=f"Failed to process bulk attendance: {str(e)}"
            )
    
    # Statistics and Reporting
    
    async def get_attendance_statistics(self, event_id: str) -> AttendanceStatsResponse:
        """
        Get attendance statistics for an event
        
        Args:
            event_id: Event ID
            
        Returns:
            AttendanceStatsResponse with detailed statistics
        """
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            # Get all registrations for the event
            registrations = await db["event_registrations"].find({"event_id": event_id}).to_list(None)
            
            # Calculate statistics
            total_registrations = len(registrations)
            virtual_attendance_count = sum(1 for reg in registrations if reg.get("virtual_attendance_id"))
            physical_attendance_count = sum(1 for reg in registrations if reg.get("physical_attendance_id"))
            
            # Count by final status
            present_count = sum(1 for reg in registrations if reg.get("final_attendance_status") == "present")
            virtual_only_count = sum(1 for reg in registrations if reg.get("final_attendance_status") == "virtual_only")
            physical_only_count = sum(1 for reg in registrations if reg.get("final_attendance_status") == "physical_only")
            absent_count = sum(1 for reg in registrations if reg.get("final_attendance_status") == "absent")
            
            # Calculate attendance percentage (based on present count)
            attendance_percentage = (present_count / total_registrations * 100) if total_registrations > 0 else 0
            
            return AttendanceStatsResponse(
                event_id=event_id,
                total_registrations=total_registrations,
                virtual_attendance_count=virtual_attendance_count,
                physical_attendance_count=physical_attendance_count,
                present_count=present_count,
                virtual_only_count=virtual_only_count,
                physical_only_count=physical_only_count,
                absent_count=absent_count,
                attendance_percentage=round(attendance_percentage, 2),
                last_updated=datetime.utcnow()
            )
            
        except Exception as e:
            logger.error(f"Error getting attendance statistics: {e}")
            raise
    
    async def get_event_registrations_with_attendance(self, event_id: str) -> List[Dict[str, Any]]:
        """
        Get all registrations for an event with attendance details
        
        Args:
            event_id: Event ID
            
        Returns:
            List of registration dictionaries with attendance information
        """
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            registrations = await db["event_registrations"].find({"event_id": event_id}).to_list(None)
            
            result = []
            for reg_data in registrations:
                reg = EventRegistration(**reg_data)
                result.append({
                    **reg.dict(),
                    "attendance_summary": reg.get_attendance_summary()
                })
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting event registrations: {e}")
            raise


# Create service instance
event_registration_service = EventRegistrationService()
