"""
Client API Routes
All client-side API endpoints for students and faculty
"""
from fastapi import APIRouter
from .events import router as events_router
from .profile import router as profile_router
from .registration import router as registration_router
from .feedback import router as feedback_router

router = APIRouter()

# Include active client API routes
router.include_router(events_router, prefix="/events", tags=["client-events-api"])
router.include_router(profile_router, prefix="/profile", tags=["client-profile-api"])
router.include_router(registration_router, prefix="/registration", tags=["client-registration-api"])
router.include_router(feedback_router, prefix="/feedback", tags=["client-feedback-api"])

# Note: Main registration routes are also available at /api/v1/registrations
# This provides the client-specific endpoints that frontend expects
