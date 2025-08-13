# Utils Package - Simplified imports

# Core utilities directly from utils directory
try:
    from .statistics import StatisticsManager
except ImportError:
    StatisticsManager = None

try:
    from .cache_control import CacheControl
except ImportError:
    CacheControl = None

try:
    from .redis_cache import EventCache
except ImportError:
    EventCache = None

try:
    from .event_status_manager import EventStatusManager
except ImportError:
    EventStatusManager = None

try:
    from .dynamic_event_scheduler import DynamicEventScheduler
except ImportError:
    DynamicEventScheduler = None

try:
    from .asset_context import asset_context
except ImportError:
    asset_context = None

try:
    from .certificate_assets import (
        cert_logo_url, cert_signature_url, 
        cert_faculty_signature, cert_principal_signature
    )
except ImportError:
    cert_logo_url = cert_signature_url = cert_faculty_signature = cert_principal_signature = None

# Create a simple TimezoneHelper class if it doesn't exist
try:
    from .timezone_helper import TimezoneHelper
except ImportError:
    class TimezoneHelper:
        """Simple timezone helper fallback"""
        @staticmethod
        def utc_to_ist(dt):
            return dt
        
        @staticmethod
        def ist_to_utc(dt):
            return dt

try:
    from .token_manager import TokenManager
except ImportError:
    TokenManager = None

__all__ = [
    # Statistics and analytics
    "StatisticsManager",
    
    # Caching
    "CacheControl",
    "EventCache",
    
    # Event management
    "EventStatusManager", 
    "DynamicEventScheduler",
    
    # Asset management
    "asset_context",
    "cert_logo_url",
    "cert_signature_url", 
    "cert_faculty_signature",
    "cert_principal_signature",
    
    # Utilities
    "TimezoneHelper",
    "TokenManager"
]