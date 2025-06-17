"""
Header context utility for admin layout
Provides enhanced statistics and notifications for the admin header
"""
from typing import Dict, Any
from utils.db_operations import DatabaseOperations
from utils.navigation_counts import get_navigation_counts
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

async def get_header_context(current_user=None) -> Dict[str, Any]:
    """
    Get enhanced context data for the admin header including:
    - Real-time statistics
    - Notification counts
    - Recent activity indicators
    - Role-specific metrics
    """
    try:
        # Get base navigation counts
        nav_counts = await get_navigation_counts()
        
        # Initialize header context with navigation counts
        header_context = nav_counts.copy()
        
        if not current_user:
            return header_context
        
        # Add role-specific enhancements
        if current_user.role == 'super_admin':
            header_context.update(await get_super_admin_metrics())
        elif current_user.role == 'executive_admin':
            header_context.update(await get_executive_admin_metrics())
        elif current_user.role == 'content_admin':
            header_context.update(await get_content_admin_metrics())
        elif current_user.role == 'event_admin':
            header_context.update(await get_event_admin_metrics(current_user))
        
        # Add common metrics
        header_context.update({
            'today_registrations': await get_today_registrations(),
            'pending_actions': await get_pending_actions(current_user),
            'system_health': await get_system_health(),
            'last_activity': await get_last_activity(current_user)
        })
        
        return header_context
        
    except Exception as e:
        logger.error(f"Error getting header context: {str(e)}")
        return nav_counts if 'nav_counts' in locals() else {}

async def get_super_admin_metrics() -> Dict[str, Any]:
    """Get metrics specific to super admin role"""
    try:
        # Get recent admin activities
        recent_logins = await DatabaseOperations.find_many(
            "users", 
            {"is_admin": True, "last_login": {"$gte": datetime.now() - timedelta(days=7)}}
        )
        
        # Get system-wide statistics
        total_registrations = await DatabaseOperations.count_documents("registrations", {})
        total_feedback = await DatabaseOperations.count_documents("feedback", {})
        
        return {
            'recent_admin_logins': len(recent_logins),
            'total_registrations': total_registrations,
            'total_feedback': total_feedback,
            'system_alerts': await get_system_alerts()
        }
    except Exception as e:
        logger.error(f"Error getting super admin metrics: {str(e)}")
        return {}

async def get_executive_admin_metrics() -> Dict[str, Any]:
    """Get metrics specific to executive admin role"""
    try:
        # Events needing approval or attention
        pending_events = await DatabaseOperations.find_many(
            "events", 
            {"status": {"$in": ["pending", "draft"]}}
        )
        
        # Recent event activities
        recent_events = await DatabaseOperations.find_many(
            "events",
            {"created_at": {"$gte": datetime.now() - timedelta(days=7)}}
        )
        
        return {
            'pending_events': len(pending_events),
            'recent_events': len(recent_events),
            'events_this_week': await get_events_this_week()
        }
    except Exception as e:
        logger.error(f"Error getting executive admin metrics: {str(e)}")
        return {}

async def get_content_admin_metrics() -> Dict[str, Any]:
    """Get metrics specific to content admin role"""
    try:
        # Student-related statistics
        new_students_today = await DatabaseOperations.find_many(
            "students",
            {"created_at": {"$gte": datetime.now().replace(hour=0, minute=0, second=0)}}
        )
        
        # Recent registrations
        recent_registrations = await DatabaseOperations.find_many(
            "registrations",
            {"registration_date": {"$gte": datetime.now() - timedelta(days=1)}}
        )
        
        return {
            'new_students_today': len(new_students_today),
            'recent_registrations': len(recent_registrations),
            'student_activity': await get_student_activity()
        }
    except Exception as e:
        logger.error(f"Error getting content admin metrics: {str(e)}")
        return {}

async def get_event_admin_metrics(current_user) -> Dict[str, Any]:
    """Get metrics specific to event admin role"""
    try:
        # Get events assigned to this admin
        assigned_events = await DatabaseOperations.find_many(
            "events",
            {"assigned_admin": current_user.username}
        )
        
        # Get registrations for assigned events
        event_ids = [event.get('event_id') for event in assigned_events]
        total_registrations = 0
        
        if event_ids:
            registrations = await DatabaseOperations.find_many(
                "registrations",
                {"event_id": {"$in": event_ids}}
            )
            total_registrations = len(registrations)
        
        return {
            'total_events': len(assigned_events),
            'my_event_registrations': total_registrations,
            'upcoming_deadlines': await get_upcoming_deadlines(event_ids)
        }
    except Exception as e:
        logger.error(f"Error getting event admin metrics: {str(e)}")
        return {}

async def get_today_registrations() -> int:
    """Get count of registrations made today"""
    try:
        today_start = datetime.now().replace(hour=0, minute=0, second=0)
        registrations = await DatabaseOperations.find_many(
            "registrations",
            {"registration_date": {"$gte": today_start}}
        )
        return len(registrations)
    except Exception:
        return 0

async def get_pending_actions(current_user) -> int:
    """Get count of pending actions for the current user"""
    try:
        pending_count = 0
        
        if current_user.role == 'super_admin':
            # Pending admin approvals, system alerts, etc.
            pending_events = await DatabaseOperations.count_documents("events", {"status": "pending"})
            pending_count += pending_events
            
        elif current_user.role == 'executive_admin':
            # Pending event approvals
            pending_events = await DatabaseOperations.count_documents("events", {"status": "pending"})
            pending_count += pending_events
            
        return pending_count
    except Exception:
        return 0

async def get_system_health() -> str:
    """Get system health status"""
    try:
        # Simple health check - can be expanded
        events_count = await DatabaseOperations.count_documents("events", {})
        students_count = await DatabaseOperations.count_documents("students", {})
        
        if events_count > 0 and students_count > 0:
            return "healthy"
        elif events_count > 0 or students_count > 0:
            return "warning"
        else:
            return "error"
    except Exception:
        return "unknown"

async def get_last_activity(current_user) -> str:
    """Get last activity timestamp for user"""
    try:
        if hasattr(current_user, 'last_login') and current_user.last_login:
            return current_user.last_login.strftime("%H:%M")
        return "Unknown"
    except Exception:
        return "Unknown"

async def get_system_alerts() -> int:
    """Get count of system alerts"""
    try:
        # This can be expanded to check for various system conditions
        alerts = 0
        
        # Check for events with issues
        problematic_events = await DatabaseOperations.find_many(
            "events",
            {"status": {"$in": ["cancelled", "error"]}}
        )
        alerts += len(problematic_events)
        
        return alerts
    except Exception:
        return 0

async def get_events_this_week() -> int:
    """Get count of events happening this week"""
    try:
        week_start = datetime.now() - timedelta(days=datetime.now().weekday())
        week_end = week_start + timedelta(days=7)
        
        events = await DatabaseOperations.find_many(
            "events",
            {
                "start_datetime": {
                    "$gte": week_start,
                    "$lt": week_end
                }
            }
        )
        return len(events)
    except Exception:
        return 0

async def get_student_activity() -> Dict[str, int]:
    """Get student activity metrics"""
    try:
        today = datetime.now().replace(hour=0, minute=0, second=0)
        
        # Active students (logged in recently)
        active_students = await DatabaseOperations.find_many(
            "students",
            {"last_login": {"$gte": today - timedelta(days=7)}}
        )
        
        return {
            'active_this_week': len(active_students)
        }
    except Exception:
        return {'active_this_week': 0}

async def get_upcoming_deadlines(event_ids) -> int:
    """Get count of upcoming deadlines for events"""
    try:
        if not event_ids:
            return 0
            
        upcoming = datetime.now() + timedelta(days=3)  # Next 3 days
        
        events_with_deadlines = await DatabaseOperations.find_many(
            "events",
            {
                "event_id": {"$in": event_ids},
                "$or": [
                    {"registration_end_date": {"$lte": upcoming}},
                    {"start_datetime": {"$lte": upcoming}}
                ]
            }
        )
        return len(events_with_deadlines)
    except Exception:
        return 0
