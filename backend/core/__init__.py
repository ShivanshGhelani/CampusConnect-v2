"""
Core module initialization
"""

# Essential exports only
from .logger import get_logger, setup_logger
from .json_encoder import CustomJSONEncoder
from .id_generator import generate_id
