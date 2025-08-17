"""
API v1 Routes
Main API version 1 router
"""
from fastapi import APIRouter
from .client import router as client_router
from .admin import router as admin_router  
from .auth import router as auth_router
from .unified_organizer import router as unified_organizer_router
from .email import router as email_router
from .organizer_portal import router as organizer_portal_router
from .legacy_auth_routes import router as legacy_auth_router
# from .venues import router as venues_router

router = APIRouter()

# Include all API v1 routes
router.include_router(auth_router, prefix="/auth", tags=["auth-api"])
router.include_router(client_router, prefix="/client", tags=["client-api"])
router.include_router(admin_router, prefix="/admin", tags=["admin-api"])
router.include_router(email_router, tags=["email-api"])
router.include_router(organizer_portal_router, tags=["organizer-portal-api"])

# Phase 4 Optimization: Unified organizer routes (replaces organizer + faculty_organizer)
router.include_router(unified_organizer_router, tags=["unified-organizer-api"])

# router.include_router(venues_router, prefix="/venues", tags=["venues-api"])

# Legacy auth routes for backward compatibility (mounted without prefix)
# These will be available directly under /api instead of /api/v1
