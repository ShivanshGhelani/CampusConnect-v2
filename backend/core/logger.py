"""
Centralized logging configuration for the application.

This module sets up proper logging for the entire application
with different handlers and formatters.
"""

import logging
import sys
from pathlib import Path

# Configure root logger
def setup_logger(log_level=logging.INFO):
    """
    Set up and configure the application logger.
    
    Args:
        log_level: Logging level (default: logging.INFO)
    
    Returns:
        The configured logger
    """
    # Create logs directory if it doesn't exist
    log_dir = Path('logs')
    log_dir.mkdir(exist_ok=True)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Remove existing handlers if any
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_format = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(name)s - %(message)s'
    )
    console_handler.setFormatter(console_format)
    
    # File handler for errors
    file_handler = logging.FileHandler(log_dir / 'app.log', encoding='utf-8')
    file_handler.setLevel(logging.WARNING)
    file_format = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(name)s - [%(filename)s:%(lineno)d] - %(message)s'
    )
    file_handler.setFormatter(file_format)
    
    # Add handlers to the root logger
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)
    
    return root_logger

def get_logger(name):
    """
    Get a logger for a specific module.
    
    Args:
        name: Name of the module
    
    Returns:
        A logger configured with the application settings
    """
    return logging.getLogger(name)
