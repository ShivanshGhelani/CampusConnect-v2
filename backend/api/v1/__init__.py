"""
API v1 Routes
Main API version 1 router
"""
from fastapi import APIRouter
from .client import router as client_router  # Restored - client router found
from .admin import router as admin_router  
from .auth import router as auth_router
from .organizer_access import router as organizer_access_router  # Professional organizer API
from .email import router as email_router
# from .dynamic_attendance import router as dynamic_attendance_router  # Temporarily disabled - needs refactoring
# from .attendance_customization import router as attendance_customization_router  # Temporarily disabled - needs refactoring
from .registrations import router as registrations_router
from ..legacy import router as legacy_router  # Backward compatibility routes
# from .venues import router as venues_router

router = APIRouter()

# Include all API v1 routes
router.include_router(auth_router, prefix="/auth", tags=["auth-api"])
router.include_router(client_router, prefix="/client", tags=["client-api"])  # Restored - client router found
router.include_router(admin_router, prefix="/admin", tags=["admin-api"])
router.include_router(email_router, tags=["email-api"])

# Professional Organizer Access System
router.include_router(organizer_access_router, tags=["organizer-access-api"])

# Dynamic Attendance System (Phase 1 Complete)
# router.include_router(dynamic_attendance_router, tags=["dynamic-attendance-api"])  # Temporarily disabled - needs refactoring
# router.include_router(attendance_customization_router, tags=["attendance-customization-api"])  # Temporarily disabled - needs refactoring

# Professional Event Registration & Attendance System
router.include_router(registrations_router, tags=["event-registrations-api"])

# Backward Compatibility Routes
router.include_router(legacy_router, tags=["legacy-compatibility-api"])

# router.include_router(venues_router, prefix="/venues", tags=["venues-api"])

# Legacy auth routes for backward compatibility (mounted without prefix)
# These will be available directly under /api instead of /api/v1
# Now handled by legacy router system
