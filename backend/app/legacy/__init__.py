"""
Legacy API Routes
================
Essential legacy routes for backward compatibility.
Frontend redirects have been removed - frontend should handle routing.
"""

from fastapi import APIRouter
# Removed: from .direct_routes import router as direct_routes_router  # Frontend redirects removed
from .auth_routes import router as auth_routes_router
from .auth_legacy import router as auth_legacy_router

router = APIRouter(tags=["legacy-compatibility"])

# Include essential legacy routes only
# Removed: router.include_router(direct_routes_router, tags=["legacy-direct-routes"])  # Frontend redirects removed  
router.include_router(auth_routes_router, tags=["legacy-auth-routes"])
router.include_router(auth_legacy_router, tags=["legacy-auth-implementation"])
