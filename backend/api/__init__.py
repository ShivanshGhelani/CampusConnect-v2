"""
API Routes Module
Handles all API endpoints for CampusConnect
"""
from fastapi import APIRouter
from .v1 import router as v1_router
from .legacy.auth_routes import router as legacy_auth_router  # Updated path

router = APIRouter(prefix="/api")

# Include API versions
router.include_router(v1_router, prefix="/v1", tags=["api-v1"])

# Include legacy auth routes for backward compatibility (mounted at /api/auth)  
router.include_router(legacy_auth_router, tags=["legacy-auth"])
