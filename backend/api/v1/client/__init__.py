"""
Client API Routes
All client-side API endpoints
"""
from fastapi import APIRouter
from .attendance import router as attendance_router
from .registration import router as registration_router
from .feedback import router as feedback_router
from .certificates import router as certificates_router
from .events import router as events_router
from .profile import router as profile_router

router = APIRouter()

# Include all client API routes
router.include_router(attendance_router, prefix="/attendance", tags=["client-attendance-api"])
router.include_router(registration_router, prefix="/registration", tags=["client-registration-api"])
router.include_router(feedback_router, prefix="/feedback", tags=["client-feedback-api"])
router.include_router(certificates_router, prefix="/certificates", tags=["client-certificates-api"])
router.include_router(events_router, prefix="/events", tags=["client-events-api"])
router.include_router(profile_router, prefix="/profile", tags=["client-profile-api"])
