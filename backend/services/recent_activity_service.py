#!/usr/bin/env python3
"""
Recent Activity Service
Provides recent event activity data for the admin dashboard API.

This module can be imported by API endpoints to fetch recent activity logs
in a format suitable for the frontend Recent Activity section.
"""

import logging
from datetime import datetime, timedelta
import pytz
from typing import Dict, List, Any, Optional

from config.database import Database

logger = logging.getLogger(__name__)

class RecentActivityService:
    """Service class for fetching recent activity logs"""
    
    @staticmethod
    def calculate_time_ago(timestamp: datetime) -> str:
        """Calculate human-readable time ago from timestamp"""
        if isinstance(timestamp, str):
            try:
                timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            except:
                return "Unknown time"
        
        now = datetime.now(pytz.timezone('Asia/Kolkata'))
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=None)
        if now.tzinfo is not None:
            now = now.replace(tzinfo=None)
        
        diff = now - timestamp
        
        if diff.days > 0:
            if diff.days == 1:
                return "1 day"
            return f"{diff.days} days"
        
        hours = diff.seconds // 3600
        if hours > 0:
            if hours == 1:
                return "1 hour"
            return f"{hours} hours"
        
        minutes = diff.seconds // 60
        if minutes > 0:
            if minutes == 1:
                return "1 minute"
            return f"{minutes} minutes"
        
        return "Just now"
    
    @staticmethod
    def generate_activity_message(log_data: Dict[str, Any]) -> Dict[str, str]:
        """Generate dynamic activity message based on log type"""
        event_id = log_data.get('event_id', 'Unknown Event')
        event_name = log_data.get('event_name', 'Unknown Event')
        trigger_type = log_data.get('trigger_type', 'unknown')
        performed_by = log_data.get('performed_by', 'System')
        old_status = log_data.get('old_status', '')
        new_status = log_data.get('new_status', '')
        time_ago = log_data.get('time_ago', 'unknown time')
        
        # Determine if it's a person or system
        is_system = performed_by.lower() in ['system', 'scheduler', 'auto']
        performer = 'System' if is_system else performed_by
        
        # Generate messages based on trigger type
        if 'creation' in trigger_type or 'create' in trigger_type:
            return {
                'action': 'Event Created',
                'message': f'Event {event_id} was created by {performer}',
                'description': f'New event created in the system',
                'icon': 'fas fa-plus-circle',
                'color': 'text-green-600',
                'bg_color': 'bg-green-100'
            }
            
        elif 'update' in trigger_type:
            if old_status == new_status:
                return {
                    'action': 'Event Updated',
                    'message': f'Event {event_id} was updated by {performer}',
                    'description': f'Event details were modified',
                    'icon': 'fas fa-edit',
                    'color': 'text-blue-600',
                    'bg_color': 'bg-blue-100'
                }
            else:
                return {
                    'action': 'Status Changed',
                    'message': f'Event {event_id} status changed by {performer}',
                    'description': f'{old_status} → {new_status}',
                    'icon': 'fas fa-exchange-alt',
                    'color': 'text-orange-600',
                    'bg_color': 'bg-orange-100'
                }
                
        elif 'deletion' in trigger_type or 'delete' in trigger_type:
            return {
                'action': 'Event Deleted',
                'message': f'Event {event_id} was deleted by {performer}',
                'description': f'Event permanently removed from system',
                'icon': 'fas fa-trash-alt',
                'color': 'text-red-600',
                'bg_color': 'bg-red-100'
            }
            
        elif 'cancellation' in trigger_type or 'cancel' in trigger_type:
            return {
                'action': 'Event Cancelled',
                'message': f'Event {event_id} was cancelled by {performer}',
                'description': f'Event status changed to cancelled',
                'icon': 'fas fa-ban',
                'color': 'text-red-600',
                'bg_color': 'bg-red-100'
            }
            
        elif 'registration opened' in trigger_type or 'registration_open' in trigger_type:
            return {
                'action': 'Registration Opened',
                'message': f'Registration opened for {event_id}',
                'description': f'System automatically opened registration',
                'icon': 'fas fa-door-open',
                'color': 'text-green-600',
                'bg_color': 'bg-green-100'
            }
            
        elif 'registration closed' in trigger_type or 'registration_close' in trigger_type:
            return {
                'action': 'Registration Closed',
                'message': f'Registration closed for {event_id}',
                'description': f'System automatically closed registration',
                'icon': 'fas fa-door-closed',
                'color': 'text-orange-600',
                'bg_color': 'bg-orange-100'
            }
            
        elif 'event started' in trigger_type or 'event_start' in trigger_type:
            return {
                'action': 'Event Started',
                'message': f'Event {event_id} has started',
                'description': f'Event is now in progress',
                'icon': 'fas fa-play-circle',
                'color': 'text-blue-600',
                'bg_color': 'bg-blue-100'
            }
            
        elif 'event ended' in trigger_type or 'event_end' in trigger_type:
            return {
                'action': 'Event Ended',
                'message': f'Event {event_id} has ended',
                'description': f'Event completed successfully',
                'icon': 'fas fa-stop-circle',
                'color': 'text-gray-600',
                'bg_color': 'bg-gray-100'
            }
            
        else:
            # Default for unknown trigger types
            return {
                'action': 'Event Activity',
                'message': f'Event {event_id} - {trigger_type} by {performer}',
                'description': f'{old_status} → {new_status}' if old_status != new_status else 'Event activity recorded',
                'icon': 'fas fa-clock',
                'color': 'text-gray-600',
                'bg_color': 'bg-gray-100'
            }

    @staticmethod
    def format_trigger_type(trigger_type: str) -> str:
        """Format trigger type for display"""
        if not trigger_type:
            return "unknown"
        
        # Map common trigger types to readable names
        trigger_map = {
            "manual_creation": "manual creation",
            "manual_update": "manual update", 
            "manual_deletion": "manual deletion",
            "manual_cancellation": "manual cancellation",
            "scheduler_registration_open": "registration opened",
            "scheduler_registration_close": "registration closed",
            "scheduler_event_start": "event started",
            "scheduler_event_end": "event ended",
            "registration_open": "registration opened",
            "registration_close": "registration closed",
            "event_start": "event started",
            "event_end": "event ended",
            "auto_status_update": "auto status update"
        }
        
        return trigger_map.get(trigger_type, trigger_type.replace('_', ' '))
    
    @staticmethod
    def format_status_for_display(status: str) -> str:
        """Format status for display"""
        if not status:
            return "Unknown"
        
        # Handle combined status/sub_status format
        if '/' in status:
            parts = status.split('/')
            formatted_parts = [part.replace('_', ' ').title() for part in parts]
            return '/'.join(formatted_parts)
        
        return status.replace('_', ' ').title()
    
    @staticmethod
    async def get_recent_activity(limit: int = 20) -> List[Dict[str, Any]]:
        """
        Retrieve recent activity logs from event_status_logs collection
        
        Args:
            limit: Maximum number of logs to retrieve (default: 20)
            
        Returns:
            List of formatted activity log dictionaries
        """
        try:
            db = await Database.get_database()
            
            if db is None:
                logger.error("Database connection failed")
                return []
            
            # Check if event_status_logs collection exists
            collections = await db.list_collection_names()
            if "event_status_logs" not in collections:
                logger.warning("event_status_logs collection does not exist")
                return []
            
            # Fetch recent logs sorted by timestamp descending
            recent_logs = await db.event_status_logs.find().sort("timestamp", -1).limit(limit).to_list(limit)
            
            logger.info(f"Retrieved {len(recent_logs)} activity logs")
            
            # Format logs for frontend consumption
            formatted_logs = []
            
            for log in recent_logs:
                # Extract log data with defaults
                event_id = log.get('event_id', 'Unknown')
                event_name = log.get('event_name', 'Unknown Event')
                old_status = log.get('old_status', 'Unknown')
                new_status = log.get('new_status', 'Unknown')
                trigger_type = log.get('trigger_type', 'unknown')
                trigger_source = log.get('trigger_source', 'unknown')
                performed_by = log.get('performed_by', 'System')
                timestamp = log.get('timestamp')
                
                # Calculate time ago
                time_ago = RecentActivityService.calculate_time_ago(timestamp) if timestamp else "Unknown time"
                
                # Format trigger type for display
                formatted_trigger = RecentActivityService.format_trigger_type(trigger_type)
                
                # Format statuses for display
                formatted_old_status = RecentActivityService.format_status_for_display(old_status)
                formatted_new_status = RecentActivityService.format_status_for_display(new_status)
                
                # Generate dynamic activity message
                activity_info = RecentActivityService.generate_activity_message({
                    'event_id': event_id,
                    'event_name': event_name,
                    'trigger_type': trigger_type,
                    'performed_by': performed_by,
                    'old_status': formatted_old_status,
                    'new_status': formatted_new_status,
                    'time_ago': time_ago
                })
                
                # Create formatted log entry
                formatted_log = {
                    "id": str(log.get('_id', f"{event_id}_{int(datetime.now(pytz.timezone('Asia/Kolkata')).timestamp())}")),
                    "event_id": event_id,
                    "event_name": event_name,
                    "old_status": formatted_old_status,
                    "new_status": formatted_new_status,
                    "trigger_type": formatted_trigger,
                    "trigger_source": trigger_source,
                    "performed_by": performed_by,
                    "time_ago": time_ago,
                    "timestamp": timestamp.isoformat() if timestamp else None,
                    # Enhanced activity information
                    "activity": activity_info
                }
                
                formatted_logs.append(formatted_log)
            
            return formatted_logs
            
        except Exception as e:
            logger.error(f"Failed to retrieve activity logs: {str(e)}")
            return []
    
    @staticmethod
    async def get_activity_summary() -> Dict[str, Any]:
        """
        Get summary statistics about activity logs
        
        Returns:
            Dictionary containing summary statistics
        """
        try:
            db = await Database.get_database()
            
            if db is None:
                return {
                    "total_logs": 0,
                    "recent_activity_count": 0,
                    "collection_exists": False
                }
            
            # Check if collection exists
            collections = await db.list_collection_names()
            if "event_status_logs" not in collections:
                return {
                    "total_logs": 0,
                    "recent_activity_count": 0,
                    "collection_exists": False
                }
            
            # Get total count
            total_logs = await db.event_status_logs.count_documents({})
            
            # Get recent activity (last 24 hours)
            yesterday = datetime.now(pytz.timezone('Asia/Kolkata')) - timedelta(days=1)
            recent_count = await db.event_status_logs.count_documents({
                "timestamp": {"$gte": yesterday}
            })
            
            # Get trigger type distribution
            trigger_types = await db.event_status_logs.distinct("trigger_type")
            
            summary = {
                "total_logs": total_logs,
                "recent_activity_count": recent_count,
                "collection_exists": True,
                "trigger_types": trigger_types,
                "last_updated": datetime.now(pytz.timezone('Asia/Kolkata')).isoformat()
            }
            
            return summary
            
        except Exception as e:
            logger.error(f"Failed to generate activity summary: {str(e)}")
            return {
                "total_logs": 0,
                "recent_activity_count": 0,
                "collection_exists": False,
                "error": str(e)
            }

# Convenience function for direct API use
async def get_recent_activity_for_dashboard(limit: int = 20) -> Dict[str, Any]:
    """
    Get recent activity data formatted for dashboard API response
    
    Args:
        limit: Maximum number of logs to retrieve (default: 20)
        
    Returns:
        Dictionary with success status and activity data
    """
    try:
        activity_logs = await RecentActivityService.get_recent_activity(limit)
        
        return {
            "success": True,
            "data": {
                "recent_activity": activity_logs,
                "count": len(activity_logs),
                "retrieved_at": datetime.now(pytz.timezone('Asia/Kolkata')).isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get dashboard activity data: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "data": {
                "recent_activity": [],
                "count": 0
            }
        }
