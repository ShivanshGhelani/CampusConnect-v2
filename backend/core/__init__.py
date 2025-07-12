# Core Package

from .logger import setup_logger, get_logger
from .id_generator import (
    generate_registration_id,
    generate_team_registration_id, 
    generate_attendance_id,
    generate_certificate_id
)
from .json_encoder import CustomJSONEncoder
from .permissions import PermissionManager
from .testing_utils import run_test, list_tests, get_test_path
from .template_context import get_template_context
from .navigation_counts import get_navigation_counts
from .header_context import get_header_context
# Note: js_certificate_generator excluded due to circular import with services.email

__all__ = [
    "setup_logger",
    "get_logger", 
    "generate_registration_id",
    "generate_team_registration_id",
    "generate_attendance_id", 
    "generate_certificate_id",
    "CustomJSONEncoder",
    "PermissionManager",
    "run_test",
    "list_tests",
    "get_test_path",
    "get_template_context",
    "get_navigation_counts",
    "get_header_context"
    # Note: js_certificate_generator excluded due to circular import
]
