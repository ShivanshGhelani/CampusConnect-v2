from fastapi import APIRouter
from .client import router as client_router
from .event_registration import router as registration_router
from .feedback import router as feedback_router
from .registration_validation import router as validation_router
from .certificate_api import router as certificate_api_router

router = APIRouter(prefix="/client")

router.include_router(client_router, tags=["client"])
router.include_router(registration_router, tags=["registration"])
router.include_router(feedback_router, tags=["feedback"])
router.include_router(validation_router, tags=["validation"])
router.include_router(certificate_api_router, prefix="/api", tags=["certificate-api"])

