"""
Core module initialization
"""

# Essential exports only
from .logger import get_logger, setup_logger
from .json_encoder import CustomJSONEncoder
# ID generation migrated to frontend - use frontend-generated IDs instead
