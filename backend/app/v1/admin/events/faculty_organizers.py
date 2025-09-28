"""
Faculty Organizers API endpoints

Handles faculty organizer related operations for events.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List

from dependencies.auth import get_current_admin
from models.admin_user import AdminUser
from services.event_organizer_service import event_organizer_service
from core.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()

@router.get("/faculty-organizers")
async def get_faculty_organizers(
    search: Optional[str] = Query(None, description="Search query for faculty name, email, or employee ID"),
    department: Optional[str] = Query(None, description="Filter by department"),
    designation: Optional[str] = Query(None, description="Filter by designation"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of results"),
    skip: int = Query(0, ge=0, description="Number of results to skip for pagination"),
    admin: AdminUser = Depends(get_current_admin)
):
    """
    Get faculty members who can be event organizers
    
    Returns:
        List of faculty organizers with their basic information
    """
    try:
        logger.info(f"Admin {admin.username} requesting faculty organizers list")
        
        result = await event_organizer_service.get_faculty_organizers(
            search_query=search,
            department=department,
            designation=designation,
            limit=limit,
            skip=skip
        )
        
        if result["success"]:
            return {
                "success": True,
                "data": result["faculty"],
                "metadata": {
                    "total_count": result["total_count"],
                    "returned_count": result["returned_count"],
                    "has_more": result["has_more"],
                    "limit": limit,
                    "skip": skip
                }
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to fetch faculty organizers: {result.get('error', 'Unknown error')}"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_faculty_organizers endpoint: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/faculty-organizers/{employee_id}/assigned-events")
async def get_faculty_assigned_events(
    employee_id: str,
    admin: AdminUser = Depends(get_current_admin)
):
    """
    Get events assigned to a specific faculty organizer
    
    Args:
        employee_id: Faculty employee ID
        
    Returns:
        List of event IDs assigned to the faculty member
    """
    try:
        logger.info(f"Admin {admin.username} requesting assigned events for faculty {employee_id}")
        
        assigned_events = await event_organizer_service.get_faculty_assigned_events(employee_id)
        
        return {
            "success": True,
            "data": {
                "employee_id": employee_id,
                "assigned_events": assigned_events,
                "event_count": len(assigned_events)
            }
        }
    
    except Exception as e:
        logger.error(f"Error getting assigned events for faculty {employee_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get assigned events: {str(e)}"
        )
