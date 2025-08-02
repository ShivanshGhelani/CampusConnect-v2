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
            
            # Registration ID format: {student_enrollment}_{event_id}
            # Extract event_id from registration_id
            parts = registration_id.split('_')
            if len(parts) < 2:
                return None
            
            student_enrollment = parts[0]
            event_id = '_'.join(parts[1:])  # Join back in case event_id contains underscores
            
            # Find the event and look for the registration
            event = await db["events"].find_one(
                {"event_id": event_id, "registrations.registration_id": registration_id},
                {"registrations.$": 1}
            )
            
            if event and "registrations" in event and event["registrations"]:
                reg_data = event["registrations"][0]
                return EventRegistration(**reg_data)
            
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
            
            # The registration_id is the key in the registrations dictionary
            registration_id = request.registration_id
            
            # Extract event_id from registration_id if needed
            # First try to find the event that contains this registration
            event = await db["events"].find_one({
                f"registrations.{registration_id}": {"$exists": True}
            })
            
            if not event:
                return AttendanceResponse(
                    success=False,
                    message="Registration not found"
                )
            
            event_id = event["event_id"]
            registrations = event.get("registrations", {})
            current_reg = registrations.get(registration_id)
            
            if not current_reg:
                return AttendanceResponse(
                    success=False,
                    message="Registration not found in event"
                )
            
            # Check if physical attendance already marked
            if current_reg.get("physical_attendance_id"):
                return AttendanceResponse(
                    success=False,
                    message="Physical attendance already marked",
                    data=current_reg
                )
            
            # Get student enrollment
            student_enrollment = (
                current_reg.get("enrollment_no") or 
                current_reg.get("student_enrollment") or
                current_reg.get("student_data", {}).get("enrollment_no") or
                current_reg.get("student_data", {}).get("student_enrollment")
            )
            
            if not student_enrollment:
                return AttendanceResponse(
                    success=False,
                    message="Student enrollment not found in registration"
                )
            
            # Generate physical attendance ID
            physical_attendance_id = generate_physical_attendance_id(
                student_enrollment, 
                event_id,
                marked_by
            )
            
            # Mark physical attendance
            timestamp = datetime.utcnow()
            
            # Update the registration in the event document
            update_data = {
                f"registrations.{registration_id}.physical_attendance_id": physical_attendance_id,
                f"registrations.{registration_id}.physical_attendance_timestamp": timestamp.isoformat(),
                f"registrations.{registration_id}.physical_attendance_marked_by": marked_by,
            }
            
            # Update final attendance status
            has_virtual = current_reg.get("virtual_attendance_id") is not None
            if has_virtual:
                update_data[f"registrations.{registration_id}.final_attendance_status"] = "present"
            else:
                update_data[f"registrations.{registration_id}.final_attendance_status"] = "physical_only"
            
            # Add metadata
            if "attendance_metadata" not in current_reg:
                current_reg["attendance_metadata"] = {}
            
            attendance_metadata = current_reg.get("attendance_metadata", {})
            attendance_metadata["physical_marked_at"] = timestamp.isoformat()
            if request.notes:
                attendance_metadata["physical_notes"] = request.notes
            
            update_data[f"registrations.{registration_id}.attendance_metadata"] = attendance_metadata
            
            # Update in database
            result = await db["events"].update_one(
                {"event_id": event_id},
                {"$set": update_data}
            )
            
            if result.modified_count == 0:
                return AttendanceResponse(
                    success=False,
                    message="Failed to update attendance in database"
                )
            
            logger.info(f"Physical attendance marked for {student_enrollment} in event {event_id} by {marked_by}")
            
            # Get updated registration for response
            updated_reg = {**current_reg}
            updated_reg["physical_attendance_id"] = physical_attendance_id
            updated_reg["physical_attendance_timestamp"] = timestamp.isoformat()
            updated_reg["physical_attendance_marked_by"] = marked_by
            updated_reg["final_attendance_status"] = "present" if has_virtual else "physical_only"
            
            if "attendance_metadata" not in updated_reg:
                updated_reg["attendance_metadata"] = {}
            updated_reg["attendance_metadata"]["physical_marked_at"] = timestamp.isoformat()
            if request.notes:
                updated_reg["attendance_metadata"]["physical_notes"] = request.notes
            
            return AttendanceResponse(
                success=True,
                message="Physical attendance marked successfully",
                data=updated_reg
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
            
            # Get the event with its registrations and attendances
            event = await db["events"].find_one({"event_id": event_id}, {"registrations": 1, "attendances": 1})
            
            if not event or "registrations" not in event:
                return AttendanceStatsResponse(
                    event_id=event_id,
                    total_registrations=0,
                    virtual_attendance_count=0,
                    physical_attendance_count=0,
                    present_count=0,
                    virtual_only_count=0,
                    physical_only_count=0,
                    absent_count=0,
                    attendance_percentage=0.0,
                    last_updated=datetime.utcnow()
                )
            
            registrations_dict = event.get("registrations", {})
            attendances_dict = event.get("attendances", {})
            
            # Create a mapping of registration_id to attendance status
            virtual_attendance_map = {}
            for att_data in attendances_dict.values():
                reg_id = att_data.get("registration_id")
                if reg_id:
                    virtual_attendance_map[reg_id] = True
            
            # Filter out registrations without valid enrollment numbers
            valid_registrations = {}
            for reg_id, reg_data in registrations_dict.items():
                # Check enrollment number in multiple possible locations
                enrollment = (
                    reg_data.get("enrollment_no") or  # Top level (legacy)
                    reg_data.get("student_data", {}).get("enrollment_no")  # New structure
                )
                if enrollment and enrollment.strip():
                    valid_registrations[reg_id] = reg_data
            
            # Calculate statistics by combining both data sources (only valid registrations)
            total_registrations = len(valid_registrations)
            virtual_attendance_count = len(virtual_attendance_map)
            physical_attendance_count = sum(1 for reg in valid_registrations.values() if reg.get("physical_attendance_id"))
            
            # Count by final status - only for valid registrations
            present_count = 0
            virtual_only_count = 0
            physical_only_count = 0
            absent_count = 0
            
            for reg_id, reg_data in valid_registrations.items():
                has_virtual = reg_id in virtual_attendance_map
                has_physical = reg_data.get("physical_attendance_id") is not None
                
                if has_virtual and has_physical:
                    present_count += 1
                elif has_virtual and not has_physical:
                    virtual_only_count += 1
                elif not has_virtual and has_physical:
                    physical_only_count += 1
                else:
                    absent_count += 1
            
            # Calculate attendance percentage (present + virtual_only + physical_only)
            attended_count = present_count + virtual_only_count + physical_only_count
            attendance_percentage = (attended_count / total_registrations * 100) if total_registrations > 0 else 0
            
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
            
            # Get the event with its registrations and attendances
            event = await db["events"].find_one({"event_id": event_id}, {"registrations": 1, "attendances": 1})
            
            if not event or "registrations" not in event:
                logger.info(f"No registrations found for event {event_id}")
                return []
            
            registrations_dict = event.get("registrations", {})
            attendances_dict = event.get("attendances", {})
            
            # Filter out registrations without valid enrollment numbers
            valid_registrations = {}
            for reg_id, reg_data in registrations_dict.items():
                # Check enrollment number in multiple possible locations
                enrollment = (
                    reg_data.get("enrollment_no") or  # Top level (legacy)
                    reg_data.get("student_data", {}).get("enrollment_no")  # New structure
                )
                if isinstance(reg_data, dict) and enrollment and enrollment.strip():
                    valid_registrations[reg_id] = reg_data
            
            logger.info(f"Filtered {len(registrations_dict) - len(valid_registrations)} invalid registrations")
            
            # Create a mapping of registration_id to virtual attendance data
            virtual_attendance_map = {}
            for att_id, att_data in attendances_dict.items():
                reg_id = att_data.get("registration_id")
                if reg_id and reg_id in valid_registrations:  # Only include attendance for valid registrations
                    virtual_attendance_map[reg_id] = {
                        "virtual_attendance_id": att_id,
                        "virtual_attendance_timestamp": att_data.get("marked_at"),
                        "virtual_attendance_status": att_data.get("attendance_status")
                    }
            
            result = []
            
            # Process only valid registrations
            for registration_id, reg_data in valid_registrations.items():
                # Get student enrollment from the registration data
                student_enrollment = (
                    reg_data.get("enrollment_no") or  # Top level (legacy)
                    reg_data.get("student_data", {}).get("enrollment_no")  # New structure
                )
                
                if student_enrollment:
                    # Get student data from students collection
                    student = await db["students"].find_one(
                        {"enrollment_number": student_enrollment},
                        {"full_name": 1, "email": 1, "phone": 1, "course": 1, "year": 1}
                    )
                    
                    # Normalize registration data structure
                    student_data = {}
                    if "student_data" in reg_data:
                        student_data = reg_data["student_data"]
                    else:
                        # Map old format to new format
                        student_data = {
                            "full_name": reg_data.get("full_name", ""),
                            "enrollment_no": student_enrollment,
                            "email": reg_data.get("email", ""),
                            "mobile_no": reg_data.get("mobile_no", ""),
                            "department": reg_data.get("department", ""),
                            "semester": reg_data.get("semester", ""),
                            "gender": reg_data.get("gender", ""),
                            "date_of_birth": reg_data.get("date_of_birth", "")
                        }
                    
                    # Get virtual attendance data for this registration
                    virtual_att_data = virtual_attendance_map.get(registration_id, {})
                    
                    # Calculate final attendance status based on both virtual and physical
                    has_virtual = virtual_att_data.get("virtual_attendance_id") is not None
                    has_physical = reg_data.get("physical_attendance_id") is not None
                    
                    if has_virtual and has_physical:
                        final_status = "present"
                    elif has_virtual and not has_physical:
                        final_status = "virtual_only"
                    elif not has_virtual and has_physical:
                        final_status = "physical_only"
                    else:
                        final_status = "absent"
                    
                    # Create enhanced registration object
                    # Remove final_attendance_status from original data to avoid override
                    reg_data_filtered = {k: v for k, v in reg_data.items() if k != "final_attendance_status"}
                    
                    enhanced_reg = {
                        "registration_id": registration_id,
                        "student_enrollment": student_enrollment,
                        "student_data": {**student_data, **(student if student else {})},
                        "registration_datetime": reg_data.get("registration_datetime") or reg_data.get("registration_date"),
                        "registration_status": reg_data.get("registration_status", "confirmed"),
                        "final_attendance_status": final_status,
                        
                        # Virtual attendance data (from attendances collection)
                        "virtual_attendance_id": virtual_att_data.get("virtual_attendance_id"),
                        "virtual_attendance_timestamp": virtual_att_data.get("virtual_attendance_timestamp"),
                        "virtual_attendance_status": virtual_att_data.get("virtual_attendance_status"),
                        
                        # Physical attendance data (from registrations collection)
                        "physical_attendance_id": reg_data.get("physical_attendance_id"),
                        "physical_attendance_timestamp": reg_data.get("physical_attendance_timestamp"),
                        "physical_attendance_marked_by": reg_data.get("physical_attendance_marked_by"),
                        
                        "attendance_metadata": reg_data.get("attendance_metadata", {}),
                        # Include original registration data for compatibility (excluding final_attendance_status)
                        **reg_data_filtered
                    }
                    
                    result.append(enhanced_reg)
            
            logger.info(f"Retrieved {len(result)} registrations for event {event_id}")
            return result
            
        except Exception as e:
            logger.error(f"Error getting event registrations: {e}")
            raise


# Create service instance
event_registration_service = EventRegistrationService()
