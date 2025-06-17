"""
API v1 Routes
Main API version 1 router
"""
from fastapi import APIRouter
from .client import router as client_router
from .admin import router as admin_router  
from .auth import router as auth_router

router = APIRouter()

# Include all API v1 routes
router.include_router(auth_router, prefix="/auth", tags=["auth-api"])
router.include_router(client_router, prefix="/client", tags=["client-api"])
router.include_router(admin_router, prefix="/admin", tags=["admin-api"])
