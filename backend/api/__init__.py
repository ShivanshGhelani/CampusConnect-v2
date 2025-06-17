"""
API Routes Module
Handles all API endpoints for CampusConnect
"""
from fastapi import APIRouter
from .v1 import router as v1_router

router = APIRouter(prefix="/api")

# Include API versions
router.include_router(v1_router, prefix="/v1", tags=["api-v1"])
