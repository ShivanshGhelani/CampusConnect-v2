# Utils Package - Final Organization
#
# This package is organized into logical subdirectories:
# - events/     - Event management, scheduling, lifecycle  
# - assets/     - Asset management and template context
# - analytics/  - Statistics and analytics utilities
#
# System utilities are in the root utils/ folder:
# - cache_control.py, redis_cache.py, scheduled_tasks.py

# Import subpackages
from . import events
from . import assets
from . import analytics

# Import system utilities from root
from .cache_control import CacheControl, add_cache_control_middleware
from .redis_cache import EventCache
from .scheduled_tasks import update_event_statuses

__all__ = [
    # Subpackages
    "events",
    "assets", 
    "analytics",
    
    # System utilities
    "CacheControl",
    "add_cache_control_middleware",
    "EventCache",
    "update_event_statuses"
]