"""
API Routes Module
Handles all API endpoints for CampusConnect
"""
from fastapi import APIRouter
from .v1 import router as v1_router
# Removed: from .legacy.auth_routes import router as legacy_auth_router  # Legacy routes eliminated

router = APIRouter(prefix="/api")

# Include API versions
router.include_router(v1_router, prefix="/v1", tags=["api-v1"])

# Legacy auth routes - REMOVED (consolidated into v1/auth)
# router.include_router(legacy_auth_router, tags=["legacy-auth"])  # Eliminated
