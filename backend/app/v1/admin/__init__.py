"""
Admin API Routes - Optimized Structure
All admin-side API endpoints consolidated for better performance
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from .events import router as events_router
from .assets import router as assets_router
from .certificate_templates import router as certificate_templates_router  # Re-enabled
from .venues import router as venues_router
from .users import router as users_router
from .attendance_preview import router as attendance_preview_router
from .participation_management import router as participation_management_router  # Re-enabled after updating to use registration service
from .export import router as export_router  # New export router
from dependencies.auth import require_admin
from models.admin_user import AdminUser
from database.operations import DatabaseOperations
from datetime import datetime, timedelta
import pytz
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# Phase 4 Optimized: Core admin API routes
router.include_router(events_router, prefix="/events", tags=["admin-events-api"])
router.include_router(assets_router, prefix="/assets", tags=["admin-assets-api"])
router.include_router(certificate_templates_router, prefix="/certificate-templates", tags=["admin-certificate-templates-api"])  # Re-enabled
router.include_router(venues_router, prefix="/venues", tags=["admin-venues-api"])
router.include_router(users_router, prefix="/users", tags=["admin-users-api"])
router.include_router(attendance_preview_router, prefix="/attendance-preview", tags=["admin-attendance-preview-api"])
router.include_router(participation_management_router, prefix="/participation", tags=["admin-participation-management-api"])  # Re-enabled
router.include_router(export_router, prefix="/export", tags=["admin-export-api"])  # New export routes



@router.get("/dashboard/complete")
async def get_complete_dashboard(
    period: str = Query("month", regex="^(week|month|year)$", description="Analytics period"),
    activity_limit: int = Query(20, ge=1, le=50, description="Recent activity limit"),
    admin: AdminUser = Depends(require_admin)
):
    """
    Get complete admin dashboard data in a single request.
    
    This unified endpoint combines:
    - Recent activity logs with dynamic messaging
    - Activity summary statistics  
    - Analytics overview with real-time scheduler data
    
    Reduces API calls from 3 to 1 for better performance and user experience.
    """
    try:
        from services.recent_activity_service import RecentActivityService
        from utils.dynamic_event_scheduler import get_scheduler_status
        from datetime import datetime, timedelta, timezone
        
        def _format_time_ago(timestamp):
            """Helper function to format timestamp as time ago"""
            if not timestamp:
                return "Unknown time"
            try:
                if isinstance(timestamp, str):
                    timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                
                # Use local time (IST) instead of UTC for consistency
                ist_timezone = timezone(timedelta(hours=5, minutes=30))
                now = datetime.now(ist_timezone)
                
                if timestamp.tzinfo:
                    # Convert to IST if timezone aware
                    timestamp = timestamp.astimezone(ist_timezone)
                else:
                    # Assume UTC and convert to IST
                    timestamp = timestamp.replace(tzinfo=timezone.utc).astimezone(ist_timezone)
                
                diff = now - timestamp
                
                if diff.days > 0:
                    return f"{diff.days} day{'s' if diff.days != 1 else ''} ago"
                elif diff.seconds > 3600:
                    hours = diff.seconds // 3600
                    return f"{hours} hour{'s' if hours != 1 else ''} ago"
                elif diff.seconds > 60:
                    minutes = diff.seconds // 60
                    return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
                else:
                    return "Just now"
            except Exception:
                return "Unknown time"
        
        # Initialize service for recent activity
        service = RecentActivityService()
        
        # 1. GET RECENT ACTIVITY DATA
        try:
            activity_logs = await service.get_recent_activity(limit=activity_limit)
        except Exception as e:
            logger.warning(f"Failed to fetch recent activity: {e}")
            activity_logs = []
        
        # 2. GET ACTIVITY SUMMARY DATA
        try:
            activity_summary = await service.get_activity_summary()
        except Exception as e:
            logger.warning(f"Failed to fetch activity summary: {e}")
            activity_summary = {}
        
        # 3. GET ANALYTICS OVERVIEW DATA
        # Calculate date range based on period
        end_date = datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None)
        if period == "week":
            start_date = end_date - timedelta(days=7)
        elif period == "month":
            start_date = end_date - timedelta(days=30)
        elif period == "year":
            start_date = end_date - timedelta(days=365)
        else:
            start_date = end_date - timedelta(days=30)  # Default to month
        
        # Get detailed event statistics
        ist_timezone = timezone(timedelta(hours=5, minutes=30))
        current_time = datetime.now(ist_timezone)
        
        # Total events
        total_events = await DatabaseOperations.count_documents("events", {})
        
        # Active events breakdown
        upcoming_events = await DatabaseOperations.count_documents("events", {
            "status": "upcoming",
            "start_datetime": {"$gt": current_time}
        })
        
        live_events = await DatabaseOperations.count_documents("events", {
            "status": "ongoing"
        })
        
        # Pending approval events
        pending_events = await DatabaseOperations.count_documents("events", {"status": "pending_approval"})
        
        # Completed events
        completed_events = await DatabaseOperations.count_documents("events", {"status": "completed"})
        
        # Draft events
        draft_events = await DatabaseOperations.count_documents("events", {"status": "draft"})
        
        # Recent events in period
        recent_events = await DatabaseOperations.count_documents(
            "events", 
            {"created_at": {"$gte": start_date, "$lte": end_date}}
        )
        
        # Get scheduler status and triggers
        scheduler_status = await get_scheduler_status()
        
        # Get upcoming triggers from scheduler
        from utils.dynamic_event_scheduler import dynamic_scheduler
        upcoming_triggers = dynamic_scheduler.get_scheduled_triggers()
        
        # Get recent trigger activity from event status logs
        recent_trigger_activity = []
        try:
            # Query recent status changes from event_status_logs collection
            recent_logs = await DatabaseOperations.find_many(
                "event_status_logs",
                {"timestamp": {"$gte": start_date}},
                sort_by=[("timestamp", -1)],
                limit=15
            )
            
            for log in recent_logs:
                activity = {
                    "id": str(log.get("_id", "")),
                    "event_id": log.get("event_id", "Unknown"),
                    "old_status": log.get("old_status", "unknown"),
                    "new_status": log.get("new_status", "unknown"),
                    "trigger_type": log.get("trigger_type", "manual"),
                    "timestamp": log.get("timestamp"),
                    "time_ago": _format_time_ago(log.get("timestamp", current_time)),
                    "scheduler_version": log.get("scheduler_version", "unknown")
                }
                recent_trigger_activity.append(activity)
                
        except Exception as e:
            logger.warning(f"Could not fetch recent trigger activity: {e}")
            recent_trigger_activity = [{
                "id": "system_active",
                "event_id": "System Monitor",
                "old_status": "monitoring",
                "new_status": "active",
                "trigger_type": "scheduler",
                "timestamp": current_time,
                "time_ago": "Now"
            }]
        
        # Get registrations statistics
        total_registrations = await DatabaseOperations.count_documents("event_registrations", {})
        recent_registrations = await DatabaseOperations.count_documents(
            "event_registrations",
            {"registration_timestamp": {"$gte": start_date, "$lte": end_date}}
        )
        
        # Get user counts
        total_students = await DatabaseOperations.count_documents("students", {})
        total_faculty = await DatabaseOperations.count_documents("faculty", {})
        
        # Get venue count
        total_venues = await DatabaseOperations.count_documents("venues", {"is_active": True})
        
        # Combine all dashboard data
        complete_dashboard_data = {
            # Recent Activity Section
            "recent_activity": {
                "logs": activity_logs,
                "total": len(activity_logs),
                "limit_applied": activity_limit
            },
            
            # Activity Summary Section  
            "activity_summary": activity_summary,
            
            # Analytics Overview Section
            "analytics": {
                "period": period,
                "date_range": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat()
                },
                "server_time": current_time.isoformat(),
                
                # Enhanced event statistics
                "events": {
                    "total": total_events,
                    "active": upcoming_events + live_events,  # Total active events
                    "upcoming": upcoming_events,  # Events not yet started
                    "live": live_events,  # Currently ongoing events
                    "pending": pending_events,  # Awaiting approval
                    "completed": completed_events,
                    "draft": draft_events,
                    "recent": recent_events
                },
                
                # Real scheduler data
                "system_health": {
                    "scheduler_running": scheduler_status.get("running", False),
                    "triggers_queued": scheduler_status.get("triggers_queued", 0),
                    "next_trigger": scheduler_status.get("next_trigger"),
                },
                
                # Active jobs from scheduler
                "scheduler": {
                    "pending_jobs": len(upcoming_triggers),
                    "upcoming_triggers": upcoming_triggers[:10],  # Limit to 10 most recent
                    "recent_trigger_activity": recent_trigger_activity,
                    "status": "Online" if scheduler_status.get("running", False) else "Offline"
                },
                
                # Registration statistics
                "registrations": {
                    "total": total_registrations,
                    "recent": recent_registrations
                },
                
                # User statistics
                "users": {
                    "students": total_students,
                    "faculty": total_faculty,
                    "total": total_students + total_faculty
                },
                
                # Infrastructure
                "infrastructure": {
                    "venues": total_venues
                }
            }
        }
        
        return {
            "success": True,
            "data": complete_dashboard_data,
            "message": f"Complete dashboard data retrieved successfully (period: {period}, activity limit: {activity_limit})",
            "endpoints_consolidated": 3,  # Shows this replaces 3 separate endpoints
            "performance_note": "Single request replaces 3 API calls"
        }
        
    except Exception as e:
        logger.error(f"Error fetching complete dashboard data: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch complete dashboard data: {str(e)}"
        )

# Note: Other admin functionality moved to respective service layers
# - Analytics: Available through events stats endpoints
# - User management: Handled by auth service
# - Notifications: Integrated into communication service
# - Audit logs: Handled by audit service
# - Student/Faculty management: Available through respective endpoints
