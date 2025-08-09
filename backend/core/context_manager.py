"""
Consolidated Context Manager for CampusConnect
Provides efficient context data for admin and client interfaces
Focused on header context and template context (navigation counts removed as legacy v1)
"""
from typing import Dict, Any, Optional
from fastapi import Request
from database.operations import DatabaseOperations
from utils.event_status_manager import EventStatusManager
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class ContextManager:
    """
    Unified context management system for CampusConnect
    Handles header context and template context (navigation counts removed - legacy v1)
    """
    
    @staticmethod
    async def get_header_context(current_user=None) -> Dict[str, Any]:
        """
        Get enhanced context data for the admin header including:
        - Real-time statistics
        - Notification counts  
        - Recent activity indicators
        - Role-specific metrics
        """
        try:
            # Initialize header context
            header_context = {}
            
            if not current_user:
                return header_context
            
            # Add role-specific enhancements
            if current_user.role == 'super_admin':
                header_context.update(await ContextManager._get_super_admin_metrics())
            elif current_user.role == 'executive_admin':
                header_context.update(await ContextManager._get_executive_admin_metrics())
            elif current_user.role == 'organizer_admin':
                header_context.update(await ContextManager._get_organizer_admin_metrics(current_user))
            
            # Add common metrics
            header_context.update({
                'today_registrations': await ContextManager._get_today_registrations(),
                'pending_actions': await ContextManager._get_pending_actions(current_user),
                'system_health': await ContextManager._get_system_health(),
                'last_activity': await ContextManager._get_last_activity(current_user)
            })
            
            return header_context
            
        except Exception as e:
            logger.error(f"Error getting header context: {str(e)}")
            return {}

    @staticmethod
    async def get_template_context(request: Request) -> Dict[str, Any]:
        """
        Get common context data for templates
        Focused on student session info and basic counts
        """
        try:
            is_student_logged_in = "student" in request.session
            student_data = request.session.get("student", None)
            
            # Get basic counts for template context (only what's actually needed)
            student_count = await DatabaseOperations.count_documents("students", {})
            total_events = await DatabaseOperations.count_documents("events", {})
            
            return {
                "is_student_logged_in": is_student_logged_in,
                "student_data": student_data,
                "student_count": student_count,
                "total_events": total_events
            }
            
        except Exception as e:
            logger.error(f"Error getting template context: {str(e)}")
            return {
                "is_student_logged_in": False,
                "student_data": None,
                "student_count": 0,
                "total_events": 0
            }

    @staticmethod
    async def get_complete_context(request: Request, current_user=None) -> Dict[str, Any]:
        """
        Get complete context combining header and template contexts
        Useful for complex admin pages that need everything
        """
        try:
            # Get all context components
            header_context = await ContextManager.get_header_context(current_user)
            template_context = await ContextManager.get_template_context(request)
            
            # Merge contexts
            complete_context = {**header_context, **template_context}
            
            # Add meta information
            complete_context.update({
                'context_generated_at': datetime.now().isoformat(),
                'context_version': '2.1',
                'user_role': getattr(current_user, 'role', 'anonymous') if current_user else 'anonymous'
            })
            
            return complete_context
            
        except Exception as e:
            logger.error(f"Error getting complete context: {str(e)}")
            return {}

    # Private helper methods for role-specific metrics
    @staticmethod
    async def _get_super_admin_metrics() -> Dict[str, Any]:
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
                'system_alerts': await ContextManager._get_system_alerts()
            }
        except Exception as e:
            logger.error(f"Error getting super admin metrics: {str(e)}")
            return {}

    @staticmethod
    async def _get_executive_admin_metrics() -> Dict[str, Any]:
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
                'events_this_week': await ContextManager._get_events_this_week()
            }
        except Exception as e:
            logger.error(f"Error getting executive admin metrics: {str(e)}")
            return {}

    @staticmethod
    async def _get_organizer_admin_metrics(current_user) -> Dict[str, Any]:
        """Get metrics specific to organizer admin role"""
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
                'upcoming_deadlines': await ContextManager._get_upcoming_deadlines(event_ids)
            }
        except Exception as e:
            logger.error(f"Error getting organizer admin metrics: {str(e)}")
            return {}

    @staticmethod
    async def _get_today_registrations() -> int:
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

    @staticmethod
    async def _get_pending_actions(current_user) -> int:
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

    @staticmethod
    async def _get_system_health() -> str:
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

    @staticmethod
    async def _get_last_activity(current_user) -> str:
        """Get last activity timestamp for user"""
        try:
            if hasattr(current_user, 'last_login') and current_user.last_login:
                return current_user.last_login.strftime("%H:%M")
            return "Unknown"
        except Exception:
            return "Unknown"

    @staticmethod
    async def _get_system_alerts() -> int:
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

    @staticmethod
    async def _get_events_this_week() -> int:
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

    @staticmethod
    async def _get_upcoming_deadlines(event_ids) -> int:
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


# Backward compatibility functions (to be used during migration)
async def get_header_context(current_user=None) -> Dict[str, Any]:
    """Backward compatibility wrapper for header context"""
    return await ContextManager.get_header_context(current_user)

async def get_template_context(request) -> Dict[str, Any]:
    """Backward compatibility wrapper for template context"""
    return await ContextManager.get_template_context(request)
