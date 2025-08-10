"""
Faculty Organizer Service

Handles faculty organizer assignment to events and manages faculty event relationships.
"""

from typing import List, Dict, Any, Optional
import logging
from datetime import datetime

from config.database import Database
from core.logger import get_logger

logger = get_logger(__name__)

class FacultyOrganizerService:
    """Service for managing faculty organizer assignments"""
    
    def __init__(self):
        self.db = None
    
    async def get_database(self):
        """Get database connection"""
        if self.db is None:
            self.db = await Database.get_database()
        return self.db
    
    async def assign_event_to_faculty(self, faculty_employee_ids: List[str], event_id: str) -> Dict[str, Any]:
        """
        Assign an event to multiple faculty organizers
        
        Args:
            faculty_employee_ids: List of faculty employee IDs
            event_id: Event ID to assign
            
        Returns:
            Dict with success status, assigned count, and message
        """
        try:
            db = await self.get_database()
            assigned_count = 0
            failed_assignments = []
            
            for employee_id in faculty_employee_ids:
                try:
                    # Check if faculty exists
                    faculty = await db.faculties.find_one({"employee_id": employee_id})
                    if not faculty:
                        failed_assignments.append(f"Faculty {employee_id} not found")
                        continue
                    
                    # Add event to faculty's assigned_events array
                    result = await db.faculties.update_one(
                        {"employee_id": employee_id},
                        {
                            "$addToSet": {"assigned_events": event_id},
                            "$set": {"updated_at": datetime.utcnow()}
                        }
                    )
                    
                    if result.modified_count > 0:
                        assigned_count += 1
                        logger.info(f"✅ Assigned event {event_id} to faculty {employee_id}")
                    else:
                        # Check if event was already assigned
                        faculty_check = await db.faculties.find_one({
                            "employee_id": employee_id,
                            "assigned_events": event_id
                        })
                        if faculty_check:
                            assigned_count += 1  # Already assigned, count as success
                            logger.info(f"ℹ️ Event {event_id} already assigned to faculty {employee_id}")
                        else:
                            failed_assignments.append(f"Failed to assign to faculty {employee_id}")
                            
                except Exception as e:
                    failed_assignments.append(f"Error assigning to faculty {employee_id}: {str(e)}")
                    logger.error(f"Error assigning event {event_id} to faculty {employee_id}: {e}")
            
            success = assigned_count > 0
            message = f"Assigned event to {assigned_count} faculty organizers"
            
            if failed_assignments:
                message += f". Failures: {'; '.join(failed_assignments)}"
            
            return {
                "success": success,
                "assigned_count": assigned_count,
                "total_requested": len(faculty_employee_ids),
                "failed_assignments": failed_assignments,
                "message": message
            }
            
        except Exception as e:
            logger.error(f"Error in assign_event_to_faculty: {e}")
            return {
                "success": False,
                "assigned_count": 0,
                "total_requested": len(faculty_employee_ids),
                "failed_assignments": [f"Service error: {str(e)}"],
                "message": f"Failed to assign event to faculty: {str(e)}"
            }
    
    async def remove_event_from_faculty(self, faculty_employee_ids: List[str], event_id: str) -> Dict[str, Any]:
        """
        Remove an event assignment from multiple faculty organizers
        
        Args:
            faculty_employee_ids: List of faculty employee IDs
            event_id: Event ID to remove
            
        Returns:
            Dict with success status, removed count, and message
        """
        try:
            db = await self.get_database()
            removed_count = 0
            failed_removals = []
            
            for employee_id in faculty_employee_ids:
                try:
                    # Remove event from faculty's assigned_events array
                    result = await db.faculties.update_one(
                        {"employee_id": employee_id},
                        {
                            "$pull": {"assigned_events": event_id},
                            "$set": {"updated_at": datetime.utcnow()}
                        }
                    )
                    
                    if result.modified_count > 0:
                        removed_count += 1
                        logger.info(f"✅ Removed event {event_id} from faculty {employee_id}")
                    else:
                        # Faculty might not exist or event not assigned
                        failed_removals.append(f"Faculty {employee_id} not found or event not assigned")
                        
                except Exception as e:
                    failed_removals.append(f"Error removing from faculty {employee_id}: {str(e)}")
                    logger.error(f"Error removing event {event_id} from faculty {employee_id}: {e}")
            
            success = removed_count > 0
            message = f"Removed event from {removed_count} faculty organizers"
            
            if failed_removals:
                message += f". Failures: {'; '.join(failed_removals)}"
            
            return {
                "success": success,
                "removed_count": removed_count,
                "total_requested": len(faculty_employee_ids),
                "failed_removals": failed_removals,
                "message": message
            }
            
        except Exception as e:
            logger.error(f"Error in remove_event_from_faculty: {e}")
            return {
                "success": False,
                "removed_count": 0,
                "total_requested": len(faculty_employee_ids),
                "failed_removals": [f"Service error: {str(e)}"],
                "message": f"Failed to remove event from faculty: {str(e)}"
            }

    async def unassign_event_from_faculty(self, faculty_employee_ids: List[str], event_id: str) -> Dict[str, Any]:
        """
        Remove an event assignment from multiple faculty organizers
        
        Args:
            faculty_employee_ids: List of faculty employee IDs
            event_id: Event ID to unassign
            
        Returns:
            Dict with success status, unassigned count, and message
        """
        try:
            db = await self.get_database()
            unassigned_count = 0
            failed_unassignments = []
            
            for employee_id in faculty_employee_ids:
                try:
                    # Remove event from faculty's assigned_events array
                    result = await db.faculties.update_one(
                        {"employee_id": employee_id},
                        {
                            "$pull": {"assigned_events": event_id},
                            "$set": {"updated_at": datetime.utcnow()}
                        }
                    )
                    
                    if result.modified_count > 0:
                        unassigned_count += 1
                        logger.info(f"✅ Unassigned event {event_id} from faculty {employee_id}")
                    else:
                        # Faculty might not exist or event not assigned
                        failed_unassignments.append(f"Faculty {employee_id} not found or event not assigned")
                        
                except Exception as e:
                    failed_unassignments.append(f"Error unassigning from faculty {employee_id}: {str(e)}")
                    logger.error(f"Error unassigning event {event_id} from faculty {employee_id}: {e}")
            
            success = unassigned_count > 0
            message = f"Unassigned event from {unassigned_count} faculty organizers"
            
            if failed_unassignments:
                message += f". Failures: {'; '.join(failed_unassignments)}"
            
            return {
                "success": success,
                "unassigned_count": unassigned_count,
                "total_requested": len(faculty_employee_ids),
                "failed_unassignments": failed_unassignments,
                "message": message
            }
            
        except Exception as e:
            logger.error(f"Error in unassign_event_from_faculty: {e}")
            return {
                "success": False,
                "unassigned_count": 0,
                "total_requested": len(faculty_employee_ids),
                "failed_unassignments": [f"Service error: {str(e)}"],
                "message": f"Failed to unassign event from faculty: {str(e)}"
            }
    
    async def get_faculty_organizers(
        self, 
        search_query: Optional[str] = None,
        department: Optional[str] = None,
        designation: Optional[str] = None,
        limit: int = 50,
        skip: int = 0
    ) -> Dict[str, Any]:
        """
        Get faculty members who can be organizers
        
        Args:
            search_query: Search in name, email, or employee_id
            department: Filter by department
            designation: Filter by designation
            limit: Maximum number of results
            skip: Number of results to skip (pagination)
            
        Returns:
            Dict with faculty list and metadata
        """
        try:
            db = await self.get_database()
            
            # Build query filter
            query_filter = {
                "is_active": True,  # Only active faculty (corrected field name)
                "is_organizer": True  # Only faculty marked as organizers
            }
            
            # Add search query
            if search_query:
                query_filter["$or"] = [
                    {"full_name": {"$regex": search_query, "$options": "i"}},
                    {"email": {"$regex": search_query, "$options": "i"}},
                    {"employee_id": {"$regex": search_query, "$options": "i"}}
                ]
            
            # Add department filter
            if department:
                query_filter["department"] = department
                
            # Add designation filter
            if designation:
                query_filter["designation"] = designation
            
            # Get total count
            total_count = await db.faculties.count_documents(query_filter)
            
            # Get faculty list
            cursor = db.faculties.find(
                query_filter,
                {
                    "employee_id": 1,
                    "full_name": 1,
                    "email": 1,
                    "department": 1,
                    "designation": 1,
                    "assigned_events": 1,
                    "profile_picture": 1,
                    "_id": 0
                }
            ).sort("full_name", 1).skip(skip).limit(limit)
            
            faculty_list = await cursor.to_list(length=limit)
            
            return {
                "success": True,
                "faculty": faculty_list,
                "total_count": total_count,
                "returned_count": len(faculty_list),
                "has_more": (skip + len(faculty_list)) < total_count
            }
            
        except Exception as e:
            logger.error(f"Error in get_faculty_organizers: {e}")
            return {
                "success": False,
                "faculty": [],
                "total_count": 0,
                "returned_count": 0,
                "has_more": False,
                "error": str(e)
            }
    
    async def validate_faculty_organizers(self, faculty_employee_ids: List[str]) -> Dict[str, Any]:
        """
        Validate that all provided faculty employee IDs exist and are active organizers
        
        Args:
            faculty_employee_ids: List of faculty employee IDs to validate
            
        Returns:
            Dict with validation results including valid status, missing IDs, and inactive IDs
        """
        try:
            db = await self.get_database()
            
            if not faculty_employee_ids:
                return {
                    "valid": True,
                    "missing": [],
                    "inactive": [],
                    "validated_ids": []
                }
            
            # Check which faculty exist and are active organizers
            existing_faculty = await db.faculties.find(
                {
                    "employee_id": {"$in": faculty_employee_ids},
                    "is_active": True,
                    "is_organizer": True
                },
                {"employee_id": 1, "_id": 0}
            ).to_list(length=len(faculty_employee_ids))
            
            existing_ids = [f["employee_id"] for f in existing_faculty]
            missing_ids = [id for id in faculty_employee_ids if id not in existing_ids]
            
            # Check for inactive faculty
            inactive_faculty = await db.faculties.find(
                {
                    "employee_id": {"$in": faculty_employee_ids},
                    "$or": [
                        {"is_active": {"$ne": True}},
                        {"is_organizer": {"$ne": True}}
                    ]
                },
                {"employee_id": 1, "_id": 0}
            ).to_list(length=len(faculty_employee_ids))
            
            inactive_ids = [f["employee_id"] for f in inactive_faculty]
            
            is_valid = len(missing_ids) == 0 and len(inactive_ids) == 0
            
            return {
                "valid": is_valid,
                "missing": missing_ids,
                "inactive": inactive_ids,
                "validated_ids": existing_ids
            }
            
        except Exception as e:
            logger.error(f"Error validating faculty organizers: {e}")
            return {
                "valid": False,
                "missing": faculty_employee_ids,
                "inactive": [],
                "validated_ids": [],
                "error": str(e)
            }
    
    async def get_faculty_organizers_by_ids(self, faculty_employee_ids: List[str]) -> List[Dict[str, Any]]:
        """
        Get faculty organizer details by their employee IDs
        
        Args:
            faculty_employee_ids: List of faculty employee IDs
            
        Returns:
            List of faculty organizer details
        """
        try:
            db = await self.get_database()
            
            if not faculty_employee_ids:
                return []
            
            # Get faculty details
            faculty_cursor = db.faculties.find(
                {
                    "employee_id": {"$in": faculty_employee_ids},
                    "is_active": True
                },
                {
                    "employee_id": 1,
                    "full_name": 1,
                    "email": 1,
                    "department": 1,
                    "designation": 1,
                    "contact_no": 1,
                    "profile_picture": 1,
                    "_id": 0
                }
            )
            
            faculty_list = await faculty_cursor.to_list(length=len(faculty_employee_ids))
            
            return faculty_list
            
        except Exception as e:
            logger.error(f"Error getting faculty organizers by IDs: {e}")
            return []
    
    async def get_faculty_assigned_events(self, employee_id: str) -> List[str]:
        """
        Get list of event IDs assigned to a faculty member
        
        Args:
            employee_id: Faculty employee ID
            
        Returns:
            List of event IDs
        """
        try:
            db = await self.get_database()
            
            faculty = await db.faculties.find_one(
                {"employee_id": employee_id},
                {"assigned_events": 1, "_id": 0}
            )
            
            if faculty and "assigned_events" in faculty:
                return faculty["assigned_events"]
            else:
                return []
                
        except Exception as e:
            logger.error(f"Error getting assigned events for faculty {employee_id}: {e}")
            return []

# Create a global instance
faculty_organizer_service = FacultyOrganizerService()
