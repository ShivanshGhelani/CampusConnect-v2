"""
Template context utility
MIGRATED TO: core.context_manager.ContextManager
This file provides backward compatibility during migration phase
"""
from fastapi import Request
from core.context_manager import ContextManager
import logging

logger = logging.getLogger(__name__)

async def get_template_context(request: Request):
    """
    DEPRECATED: Use ContextManager.get_template_context() instead
    This function is maintained for backward compatibility during migration
    """
    logger.warning("template_context.get_template_context() is deprecated. Use ContextManager.get_template_context() instead.")
    return await ContextManager.get_template_context(request)
