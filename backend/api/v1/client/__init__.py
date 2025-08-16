"""
Client API Routes
All client-side API endpoints for students and faculty
"""
from fastapi import APIRouter
from .events import router as events_router
from .profile import router as profile_router

router = APIRouter()

# Include active client API routes (registration system rebuilt)
router.include_router(events_router, prefix="/events", tags=["client-events-api"])
router.include_router(profile_router, prefix="/profile", tags=["client-profile-api"])

# Add registration routes for students
from ..registrations import router as registrations_router
router.include_router(registrations_router, prefix="/registrations", tags=["student-registrations"])
