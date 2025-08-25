#!/usr/bin/env python3
"""
Admin API endpoints for dashboard and management functions.
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, List, Any
import logging

from dependencies.auth import require_admin
from services.recent_activity_service import RecentActivityService

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/dashboard/recent-activity")
async def get_recent_activity(
    limit: int = 20,
    current_admin=Depends(require_admin)
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
    current_admin=Depends(require_admin)
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
