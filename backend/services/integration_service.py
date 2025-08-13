"""
Service Integration Layer
========================
Provides integration between existing services and the new ParticipationService.
Handles backward compatibility and service coordination.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
from .participation_service import StudentEventParticipationService
from models.participation import CreateParticipation, RegistrationType, ParticipationStage
from database.operations import DatabaseOperations
from config.database import Database

class ServiceIntegrationLayer:
    """Integration layer for coordinating between old and new services"""
    
    def __init__(self):
        self.participation_service = StudentEventParticipationService()
        # Don't initialize database connection in __init__ - it's async
    
    async def register_student_for_event(self, enrollment_no: str, event_id: str, 
                                       registration_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Legacy method for registering students to events.
        Now uses the unified ParticipationService internally.
        """
        try:
            # Convert legacy registration data to new format
            create_participation = CreateParticipation(
                student_enrollment_no=enrollment_no,
                event_id=event_id,
                registration_type=RegistrationType(registration_data.get("type", "individual")),
                team_info=registration_data.get("team_info"),
                additional_data=registration_data.get("additional_data", {})
            )
            
            # Use the new participation service
            result = await self.participation_service.create_participation(create_participation)
            
            return {
                "success": True,
                "participation_id": result.participation_id,
                "message": "Student registered successfully",
                "data": result.dict()
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Registration failed: {str(e)}",
                "error": str(e)
            }
    
    async def mark_attendance_for_event(self, enrollment_no: str, event_id: str,
                                      present: bool, session_id: str = None) -> Dict[str, Any]:
        """
        Legacy method for marking attendance.
        Now uses the unified ParticipationService internally.
        """
        try:
            # Find the participation
            participation = await self.participation_service.get_participation_by_student_event(
                enrollment_no, event_id
            )
            
            if not participation:
                return {
                    "success": False,
                    "message": "Student not registered for this event"
                }
            
            # Mark attendance using new service
            result = await self.participation_service.mark_attendance(
                participation.participation_id, present, session_id
            )
            
            return {
                "success": True,
                "message": "Attendance marked successfully",
                "data": result.dict()
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to mark attendance: {str(e)}",
                "error": str(e)
            }
    
    async def get_event_participants(self, event_id: str) -> Dict[str, Any]:
        """
        Legacy method for getting event participants.
        Now uses the unified ParticipationService internally.
        """
        try:
            # Get participants using new service
            participants = await self.participation_service.get_event_participants(event_id)
            
            # Convert to legacy format for backward compatibility
            legacy_format = []
            for participant in participants:
                legacy_format.append({
                    "enrollment_no": participant.student.enrollment_no,
                    "name": participant.student.name,
                    "email": participant.student.email,
                    "department": participant.student.department,
                    "status": participant.registration.status,
                    "registered_at": participant.registration.registered_at,
                    "attendance_marked": participant.attendance.marked,
                    "present": participant.attendance.present,
                    "lifecycle_stage": participant.lifecycle.current_stage
                })
            
            return {
                "success": True,
                "participants": legacy_format,
                "count": len(legacy_format)
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to get participants: {str(e)}",
                "error": str(e)
            }
    
    async def get_student_registrations(self, enrollment_no: str) -> Dict[str, Any]:
        """
        Legacy method for getting student registrations.
        Now uses the unified ParticipationService internally.
        """
        try:
            # Get student participations using new service
            participations = await self.participation_service.get_student_participations(enrollment_no)
            
            # Convert to legacy format
            legacy_format = []
            for participation in participations:
                legacy_format.append({
                    "event_id": participation.event.event_id,
                    "event_title": participation.event.title,
                    "event_type": participation.event.type,
                    "registration_status": participation.registration.status,
                    "registered_at": participation.registration.registered_at,
                    "attendance_status": "present" if participation.attendance.present else "absent" if participation.attendance.marked else "not_marked",
                    "lifecycle_stage": participation.lifecycle.current_stage,
                    "certificate_issued": participation.certificate.issued
                })
            
            return {
                "success": True,
                "registrations": legacy_format,
                "count": len(legacy_format)
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to get student registrations: {str(e)}",
                "error": str(e)
            }
    
    async def issue_certificate(self, enrollment_no: str, event_id: str,
                              certificate_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Legacy method for issuing certificates.
        Now uses the unified ParticipationService internally.
        """
        try:
            # Find the participation
            participation = await self.participation_service.get_participation_by_student_event(
                enrollment_no, event_id
            )
            
            if not participation:
                return {
                    "success": False,
                    "message": "Student not registered for this event"
                }
            
            # Issue certificate using new service
            result = await self.participation_service.issue_certificate(
                participation.participation_id,
                certificate_data.get("certificate_id"),
                certificate_data.get("download_url")
            )
            
            return {
                "success": True,
                "message": "Certificate issued successfully",
                "data": result.dict()
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to issue certificate: {str(e)}",
                "error": str(e)
            }

# Global instance for easy import
integration_service = ServiceIntegrationLayer()
