#!/usr/bin/env python3
"""
Admin API endpoints for dashboard and management functions.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Dict, List, Any
import logging

from dependencies.auth import require_admin, get_current_admin
from middleware.auth_middleware import require_admin_token_auth, get_current_admin_from_token
from services.recent_activity_service import RecentActivityService
from database.operations import DatabaseOperations

logger = logging.getLogger(__name__)
router = APIRouter()

async def require_admin_hybrid(request: Request):
    """
    Hybrid admin authentication - tries token first, then session
    """
    # Try token authentication first
    try:
        admin = await get_current_admin_from_token(request)
        if admin:
            return admin
    except:
        pass
    
    # Fall back to session authentication
    try:
        admin = await get_current_admin(request)
        if admin:
            return admin
    except:
        pass
    
    # No authentication found
    raise HTTPException(
        status_code=401,
        detail="Valid admin authentication required"
    )

@router.get("/dashboard/recent-activity")
async def get_recent_activity(
    request: Request,
    limit: int = 20,
    current_admin=Depends(require_admin_hybrid)
) -> Dict[str, Any]:
    """
    Get recent activity logs for the admin dashboard with dynamic messaging.
    
    This endpoint fetches the latest event status logs and returns them
    with intelligent, context-aware messages based on trigger types.
    """
    try:
        service = RecentActivityService()
        activity_logs = await service.get_recent_activity(limit=limit)
        
        return {
            "success": True,
            "data": activity_logs,
            "total": len(activity_logs),
            "message": f"Retrieved {len(activity_logs)} recent activity logs"
        }
        
    except Exception as e:
        logger.error(f"Error fetching recent activity: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch recent activity: {str(e)}"
        )

@router.get("/dashboard/activity-summary")
async def get_activity_summary(
    request: Request,
    current_admin=Depends(require_admin_hybrid)
) -> Dict[str, Any]:
    """
    Get activity summary statistics for the admin dashboard.
    """
    try:
        service = RecentActivityService()
        summary = await service.get_activity_summary()
        
        return {
            "success": True,
            "data": summary,
            "message": "Activity summary retrieved successfully"
        }
        
    except Exception as e:
        logger.error(f"Error fetching activity summary: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch activity summary: {str(e)}"
        )

@router.get("/analytics/overview")
async def get_analytics_overview(
    request: Request,
    current_admin=Depends(require_admin_hybrid)
) -> Dict[str, Any]:
    """
    Get analytics overview for admin dashboard.
    """
    try:
        # Get basic statistics
        total_students = await DatabaseOperations.count_documents("students", {"is_active": True})
        total_faculty = await DatabaseOperations.count_documents("faculties", {"is_active": True})
        total_events = await DatabaseOperations.count_documents("events", {})
        total_registrations = await DatabaseOperations.count_documents("student_registrations", {})
        
        # Get recent events
        recent_events = await DatabaseOperations.find_many(
            "events", 
            {}, 
            limit=5, 
            sort_by="created_at", 
            sort_order=-1
        )
        
        analytics_data = {
            "total_students": total_students,
            "total_faculty": total_faculty, 
            "total_events": total_events,
            "total_registrations": total_registrations,
            "recent_events": recent_events[:5],  # Limit to 5 most recent
            "active_users": total_students + total_faculty
        }
        
        return {
            "success": True,
            "data": analytics_data,
            "message": "Analytics overview retrieved successfully"
        }
        
    except Exception as e:
        logger.error(f"Error fetching analytics overview: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch analytics overview: {str(e)}"
        )
