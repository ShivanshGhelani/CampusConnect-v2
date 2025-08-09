# Utils Package - Reorganized with Backward Compatibility
# 
# This package has been reorganized into logical subdirectories:
# - database/   - Database operations and utilities
# - email/      - Email services and delivery systems  
# - assets/     - Asset management and template context
# - system/     - Event management, caching, statistics
# - core/       - Basic utilities, logging, permissions
#
# For backward compatibility, old import paths are maintained below.
# New code should use the reorganized import paths.

# Backward compatibility imports - will be deprecated in future versions
try:
    # Database utilities
    from .database.operations import DatabaseOperations
    # Legacy alias
    from .database.operations import DatabaseOperations as db_operations
    
    # Email utilities  
    from .email.service import EmailService
    from .email.optimized_service import OptimizedEmailService
    from .email.smtp_pool import smtp_pool
    from .email.queue import CertificateEmailQueue
    
    # Asset utilities
    from .assets.context import asset_context, get_template_globals
    from .assets.certificates import (
        cert_logo_url, cert_signature_url, 
        cert_faculty_signature, cert_principal_signature
    )
    
    # System utilities
    from .system.event_scheduler import DynamicEventScheduler
    from .system.event_status import EventStatusManager
    from .system.event_data import EventDataManager
    from .system.event_lifecycle import mark_attendance
    from .system.statistics import StatisticsManager
    from .system.cache_control import CacheControl
    from .system.redis_cache import EventCache
    
    # Core utilities
    from .core.logger import setup_logger
    from .core.id_generator import (
        generate_registration_id, generate_team_registration_id,
        generate_attendance_id, generate_certificate_id
    )
    from .core.json_encoder import CustomJSONEncoder
    from .core.permissions import PermissionManager
    from .core.testing_utils import run_test, list_tests
    from .core.template_context import get_template_context
    from .core.header_context import get_header_context
    from .core.context_manager import ContextManager
    from .core.js_certificate_generator import get_certificate_data_for_js
    
except ImportError as e:
    # If imports fail, provide a helpful error message
    import warnings
    warnings.warn(
        f"Some utils modules failed to import: {e}. "
        "This may be due to the reorganization. Please update import paths.",
        ImportWarning
    )

# Preferred imports for new code (examples):
# from utils.database.operations import DatabaseOperations
# from utils.email.service import EmailService  
# from utils.assets.certificates import cert_logo_url
# from utils.system.event_status import EventStatusManager
# from utils.core.logger import setup_logger