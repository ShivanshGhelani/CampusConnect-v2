"""
Faculty Management Service
==========================
Handles basic faculty operations - CRUD and management.
Renamed from faculty_service.py to avoid naming conflicts.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
import pytz
from database.operations import DatabaseOperations
from models.faculty import Faculty, FacultyResponse
import logging

logger = logging.getLogger(__name__)

class FacultyManagementService:
    def __init__(self):
        self.db = DatabaseOperations()
        self.faculty_collection = "faculties"
    
    async def get_faculty_organizers(self, faculty_ids: List[str]) -> List[Dict[str, Any]]:
        """Get faculty details for given employee IDs"""
        try:
            if not faculty_ids:
                return []
            
            faculty_list = []
            for employee_id in faculty_ids:
                faculty = await self.db.find_one(
                    self.faculty_collection, 
                    {"employee_id": employee_id, "is_active": True}
                )
                
                if faculty:
                    # Remove password from response
                    faculty.pop("password", None)
                    faculty_list.append({
                        "employee_id": faculty["employee_id"],
                        "full_name": faculty["full_name"],
                        "email": faculty["email"],
                        "department": faculty["department"],
                        "designation": faculty.get("designation", ""),
                        "contact_no": faculty["contact_no"]
                    })
                else:
                    logger.warning(f"Faculty with employee_id {employee_id} not found or inactive")
            
            return faculty_list
            
        except Exception as e:
            logger.error(f"Error getting faculty organizers: {e}")
            return []
    
    async def validate_faculty_organizers(self, faculty_ids: List[str]) -> Dict[str, Any]:
        """Validate that all faculty IDs exist and are active"""
        try:
            if not faculty_ids:
                return {"valid": True, "missing": [], "inactive": []}
            
            missing = []
            inactive = []
            
            for employee_id in faculty_ids:
                faculty = await self.db.find_one(
                    self.faculty_collection, 
                    {"employee_id": employee_id}
                )
                
                if not faculty:
                    missing.append(employee_id)
                elif not faculty.get("is_active", True):
                    inactive.append(employee_id)
            
            is_valid = len(missing) == 0 and len(inactive) == 0
            
            return {
                "valid": is_valid,
                "missing": missing,
                "inactive": inactive
            }
            
        except Exception as e:
            logger.error(f"Error validating faculty organizers: {e}")
            return {"valid": False, "missing": faculty_ids, "inactive": []}
    
    async def assign_event_to_faculty(self, faculty_ids: List[str], event_id: str) -> Dict[str, Any]:
        """Assign event to faculty organizers - add event_id to their event_participation list"""
        try:
            if not faculty_ids or not event_id:
                return {"success": False, "message": "Missing faculty IDs or event ID"}
            
            success_count = 0
            failed_assignments = []
            
            for employee_id in faculty_ids:
                try:
                    # Add event_id to faculty's event_participation array if not already present
                    result = await self.db.update_one(
                        self.faculty_collection,
                        {"employee_id": employee_id, "is_active": True},
                        {
                            "$addToSet": {"event_participation": event_id},
                            "$set": {"updated_at": datetime.now(pytz.timezone('Asia/Kolkata'))}
                        }
                    )
                    
                    if result:
                        success_count += 1
                        logger.info(f"✅ Assigned event {event_id} to faculty {employee_id}")
                    else:
                        failed_assignments.append(employee_id)
                        logger.warning(f"❌ Failed to assign event {event_id} to faculty {employee_id}")
                        
                except Exception as e:
                    failed_assignments.append(employee_id)
                    logger.error(f"❌ Error assigning event to faculty {employee_id}: {e}")
            
            return {
                "success": success_count > 0,
                "assigned_count": success_count,
                "total_count": len(faculty_ids),
                "failed_assignments": failed_assignments,
                "message": f"Assigned event to {success_count}/{len(faculty_ids)} faculty members"
            }
            
        except Exception as e:
            logger.error(f"Error assigning event to faculty: {e}")
            return {
                "success": False,
                "assigned_count": 0,
                "total_count": len(faculty_ids),
                "failed_assignments": faculty_ids,
                "message": f"Error assigning event: {str(e)}"
            }
    
    async def get_faculty_events(self, employee_id: str) -> List[str]:
        """Get list of event IDs assigned to a faculty member"""
        try:
            faculty = await self.db.find_one(
                self.faculty_collection,
                {"employee_id": employee_id, "is_active": True}
            )
            
            if faculty:
                return faculty.get("event_participation", [])
            else:
                logger.warning(f"Faculty {employee_id} not found or inactive")
                return []
                
        except Exception as e:
            logger.error(f"Error getting faculty events for {employee_id}: {e}")
            return []
    
    async def remove_event_from_faculty(self, faculty_ids: List[str], event_id: str) -> Dict[str, Any]:
        """Remove event from faculty organizers - remove event_id from their event_participation list"""
        try:
            if not faculty_ids or not event_id:
                return {"success": False, "message": "Missing faculty IDs or event ID"}
            
            success_count = 0
            failed_removals = []
            
            for employee_id in faculty_ids:
                try:
                    result = await self.db.update_one(
                        self.faculty_collection,
                        {"employee_id": employee_id},
                        {
                            "$pull": {"event_participation": event_id},
                            "$set": {"updated_at": datetime.now(pytz.timezone('Asia/Kolkata'))}
                        }
                    )
                    
                    if result:
                        success_count += 1
                        logger.info(f"✅ Removed event {event_id} from faculty {employee_id}")
                    else:
                        failed_removals.append(employee_id)
                        
                except Exception as e:
                    failed_removals.append(employee_id)
                    logger.error(f"❌ Error removing event from faculty {employee_id}: {e}")
            
            return {
                "success": success_count > 0,
                "removed_count": success_count,
                "total_count": len(faculty_ids),
                "failed_removals": failed_removals,
                "message": f"Removed event from {success_count}/{len(faculty_ids)} faculty members"
            }
            
        except Exception as e:
            logger.error(f"Error removing event from faculty: {e}")
            return {
                "success": False,
                "removed_count": 0,
                "total_count": len(faculty_ids),
                "failed_removals": faculty_ids,
                "message": f"Error removing event: {str(e)}"
            }

# Create singleton instance
faculty_management_service = FacultyManagementService()
