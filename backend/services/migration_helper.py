"""
Migration Helper Utilities
=========================
Provides utilities for migrating between old and new registration systems.
Helps with data conversion and compatibility.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
from database.operations import DatabaseOperations

class MigrationHelper:
    """Helper utilities for system migration"""
    
    def __init__(self):
        self.db = DatabaseOperations.get_database()
    
    async def verify_migration_integrity(self) -> Dict[str, Any]:
        """Verify that migration was completed successfully"""
        try:
            # Check registration collection
            registrations_collection = self.db["student_registrations"]
            registrations_count = await registrations_collection.count_documents({})
            
            # Check events collection for legacy data
            events_collection = self.db["events"]
            events_with_registrations = 0
            total_legacy_registrations = 0
            
            async for event in events_collection.find({}):
                registrations = event.get("registrations", {})
                if registrations:
                    events_with_registrations += 1
                    if isinstance(registrations, dict):
                        total_legacy_registrations += len(registrations)
                    elif isinstance(registrations, list):
                        total_legacy_registrations += len(registrations)
            
            return {
                "migration_complete": registrations_count > 0,
                "registrations_count": registrations_count,
                "legacy_events_with_registrations": events_with_registrations,
                "legacy_registrations_count": total_legacy_registrations,
                "integrity_status": "VERIFIED" if registrations_count >= total_legacy_registrations else "INCOMPLETE"
            }
            
        except Exception as e:
            return {
                "migration_complete": False,
                "error": str(e),
                "integrity_status": "ERROR"
            }
    
    async def get_system_health_status(self) -> Dict[str, Any]:
        """Get overall system health after migration"""
        try:
            # Check database collections
            collections = await self.db.list_collection_names()
            
            # Check registration system
            registrations_collection = self.db["student_registrations"]
            sample_registration = await registrations_collection.find_one({})
            
            # Check indexes
            indexes = await registrations_collection.list_indexes().to_list(length=None)
            index_names = [idx["name"] for idx in indexes]
            
            required_indexes = ["idx_student_enrollment", "idx_event_id", "idx_registration_id"]
            indexes_present = all(idx in index_names for idx in required_indexes)
            
            return {
                "database_connected": True,
                "collections_present": "student_registrations" in collections,
                "sample_data_exists": sample_registration is not None,
                "indexes_present": indexes_present,
                "total_indexes": len(indexes),
                "system_status": "HEALTHY" if all([
                    "student_registrations" in collections,
                    sample_registration is not None,
                    indexes_present
                ]) else "NEEDS_ATTENTION"
            }
            
        except Exception as e:
            return {
                "database_connected": False,
                "error": str(e),
                "system_status": "ERROR"
            }
    
    def convert_legacy_registration_to_registration(self, enrollment_no: str, 
                                                   event_data: Dict[str, Any],
                                                   registration_data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert legacy registration format to new registration format"""
        try:
            registration = {
                "registration_id": f"{event_data.get('event_id')}_{enrollment_no}_{int(datetime.now().timestamp())}",
                "student": {
                    "enrollment_no": enrollment_no,
                    "name": registration_data.get("name", ""),
                    "email": registration_data.get("email", ""),
                    "phone": registration_data.get("phone", ""),
                    "department": registration_data.get("department", ""),
                    "semester": registration_data.get("semester", ""),
                    "year": registration_data.get("year", "")
                },
                "event": {
                    "event_id": event_data.get("event_id", ""),
                    "title": event_data.get("event_name", ""),
                    "type": event_data.get("event_type", "workshop"),
                    "date": event_data.get("start_datetime"),
                    "venue": event_data.get("venue", "")
                },
                "registration": {
                    "registered_at": registration_data.get("registered_at", datetime.now()),
                    "status": registration_data.get("status", "confirmed"),
                    "type": registration_data.get("type", "individual"),
                    "payment_status": registration_data.get("payment_status", "not_required"),
                    "confirmation_sent": registration_data.get("confirmation_sent", False)
                },
                "team": None,
                "attendance": {
                    "marked": registration_data.get("attendance_marked", False),
                    "present": registration_data.get("present", False),
                    "marked_at": registration_data.get("attendance_marked_at"),
                    "marked_by": registration_data.get("attendance_marked_by"),
                    "is_eligible": registration_data.get("is_eligible", True)
                },
                "feedback": {
                    "submitted": registration_data.get("feedback_submitted", False),
                    "rating": registration_data.get("feedback_rating"),
                    "comments": registration_data.get("feedback_comments", ""),
                    "submitted_at": registration_data.get("feedback_submitted_at")
                },
                "certificate": {
                    "issued": registration_data.get("certificate_issued", False),
                    "certificate_id": registration_data.get("certificate_id"),
                    "issued_at": registration_data.get("certificate_issued_at"),
                    "download_url": registration_data.get("certificate_download_url")
                },
                "lifecycle": {
                    "current_stage": self._determine_lifecycle_stage(registration_data),
                    "stage_history": []
                },
                "metadata": {
                    "converted_from": "legacy_registration",
                    "conversion_timestamp": datetime.now()
                },
                "created_at": registration_data.get("registered_at", datetime.now()),
                "updated_at": datetime.now()
            }
            
            return registration
            
        except Exception as e:
            raise Exception(f"Failed to convert legacy registration: {str(e)}")
    
    def _determine_lifecycle_stage(self, registration_data: Dict[str, Any]) -> str:
        """Determine lifecycle stage from legacy registration data"""
        if registration_data.get("certificate_issued"):
            return "completed"
        elif registration_data.get("feedback_submitted"):
            return "feedback_submitted"
        elif registration_data.get("attendance_marked"):
            return "attended" if registration_data.get("present") else "absent"
        elif registration_data.get("confirmation_sent"):
            return "confirmed"
        else:
            return "registered"

# Global instance
migration_helper = MigrationHelper()
