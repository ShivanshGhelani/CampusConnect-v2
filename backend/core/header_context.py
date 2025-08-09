"""
Header context utility for admin layout
MIGRATED TO: core.context_manager.ContextManager
This file provides backward compatibility during migration phase
"""
from core.context_manager import ContextManager
import logging

logger = logging.getLogger(__name__)

async def get_header_context(current_user=None):
    """
    DEPRECATED: Use ContextManager.get_header_context() instead
    This function is maintained for backward compatibility during migration
    """
    logger.warning("header_context.get_header_context() is deprecated. Use ContextManager.get_header_context() instead.")
    return await ContextManager.get_header_context(current_user)
