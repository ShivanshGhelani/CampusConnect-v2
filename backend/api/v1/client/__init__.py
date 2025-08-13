"""
Client API Routes
All client-side API endpoints for students and faculty
"""
from fastapi import APIRouter
from .events import router as events_router
from .profile import router as profile_router

router = APIRouter()

# Include active client API routes (registration system will be rebuilt)
router.include_router(events_router, prefix="/events", tags=["client-events-api"])
router.include_router(profile_router, prefix="/profile", tags=["client-profile-api"])

# NOTE: Registration, attendance, feedback, and certificate endpoints 
# have been removed and will be rebuilt as a simple unified system

# Add participation routes for students
from ..participations import router as participations_router
router.include_router(participations_router, prefix="/participations", tags=["student-participations"])

# Add student registration endpoints  
from ..student_registration import router as student_registration_router
router.include_router(student_registration_router, prefix="/registration", tags=["student-registration"])
