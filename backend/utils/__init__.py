# Utils Package - Organized into Logical Subdirectories
#
# This package is organized into the following subdirectories:
# - events/     - Event management, scheduling, lifecycle
# - assets/     - Asset management and template context
# - system/     - System utilities, caching, scheduled tasks
# - analytics/  - Statistics and analytics utilities
#
# Import from subdirectories for organized access to utilities.

# Import packages but don't expose everything with *
from . import events
from . import assets  
from . import system
from . import analytics

__all__ = [
    # Event Management
    "DynamicEventScheduler",
    "EventStatusManager", 
    "EventDataManager",
    "mark_attendance",
    "get_next_event_id",
    "generate_event_data",
    "update_event_lifecycle",
    "send_event_reminders",
    
    # Asset Management
    "asset_context", 
    "get_template_globals",
    "cert_logo_url",
    "cert_signature_url",
    "cert_faculty_signature", 
    "cert_principal_signature",
    
    # System Utilities
    "CacheControl",
    "RedisCache",
    "get_cached_events", 
    "cache_event_data",
    "update_event_statuses",
    
    # Analytics
    "get_admin_stats",
    "calculate_event_stats",
    "generate_monthly_report",
    "get_event_statistics",
    "get_registration_statistics",
    "get_venue_statistics",
    "get_admin_dashboard_stats"
]