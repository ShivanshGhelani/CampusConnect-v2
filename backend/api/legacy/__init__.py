"""
Legacy API Routes
================
Backward compatibility routes for existing integrations.
All legacy routes are mounted here to maintain API compatibility.
"""

from fastapi import APIRouter
from .direct_routes import router as direct_routes_router
from .auth_routes import router as auth_routes_router
from .auth_legacy import router as auth_legacy_router

router = APIRouter(tags=["legacy-compatibility"])

# Include all legacy routes
router.include_router(direct_routes_router, tags=["legacy-direct-routes"])  
router.include_router(auth_routes_router, tags=["legacy-auth-routes"])
router.include_router(auth_legacy_router, tags=["legacy-auth-implementation"])
