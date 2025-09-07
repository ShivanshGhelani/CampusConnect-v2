#!/usr/bin/env python3
"""
Admin API endpoints for dashboard and management functions.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Dict, List, Any
import logging

from dependencies.auth import require_admin, get_current_admin
from middleware.auth_middleware import require_admin_token_auth, get_current_admin_from_token
from services.recent_activity_service import RecentActivityService
from database.operations import DatabaseOperations

logger = logging.getLogger(__name__)
router = APIRouter()

async def require_admin_hybrid(request: Request):
    """
    Hybrid admin authentication - tries token first, then session
    """
    # Try token authentication first
    try:
        admin = await get_current_admin_from_token(request)
        if admin:
            return admin
    except:
        pass
    
    # Fall back to session authentication
    try:
        admin = await get_current_admin(request)
        if admin:
            return admin
    except:
        pass
    
    # No authentication found
    raise HTTPException(
        status_code=401,
        detail="Valid admin authentication required"
    )
