"""
Client Feedback API
===================
Handles feedback submission and retrieval for students
"""

import json
import logging
from datetime import datetime
from fastapi import APIRouter, Request, HTTPException, Depends, Form
from fastapi.responses import JSONResponse
from dependencies.auth import require_student_login
from models.student import Student
from services.event_feedback_service import event_feedback_service
from typing import Dict, Any

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/form/{event_id}")
async def get_feedback_form(
    event_id: str,
    student: Student = Depends(require_student_login)
):
    """Get feedback form for an event"""
    try:
        result = await event_feedback_service.get_feedback_form(event_id)
        
        if result["success"]:
            return JSONResponse(status_code=200, content=result)
        else:
            raise HTTPException(status_code=404, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting feedback form: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting feedback form: {str(e)}")

@router.post("/submit")
async def submit_feedback(
    request: Request,
    student: Student = Depends(require_student_login)
):
    """Submit feedback for an event"""
    try:
        body = await request.json()
        
        logger.info(f"Feedback submission received - Body keys: {body.keys()}")
        
        event_id = body.get("event_id")
        feedback_responses = body.get("feedback_responses", {})
        is_test_mode = body.get("_test_mode", False)
        test_enrollment = body.get("_test_enrollment")
        test_registration_id = body.get("_test_registration_id")
        
        logger.info(f"Event ID: {event_id}, Responses count: {len(feedback_responses)}, Test mode: {is_test_mode}")
        
        if not event_id:
            logger.error("Event ID is missing")
            raise HTTPException(status_code=400, detail="Event ID is required")
        
        if not feedback_responses:
            logger.error("Feedback responses are missing")
            raise HTTPException(status_code=400, detail="Feedback responses are required")
        
        # Use test enrollment if in test mode
        student_enrollment = test_enrollment if is_test_mode and test_enrollment else student.enrollment_no
        
        if is_test_mode:
            # For test mode, use a simplified submission without eligibility checks
            result = await event_feedback_service.submit_test_feedback(
                event_id=event_id,
                student_enrollment=student_enrollment,
                feedback_responses=feedback_responses,
                test_registration_id=test_registration_id
            )
        else:
            # Normal submission with full validation
            result = await event_feedback_service.submit_feedback(
                event_id=event_id,
                student_enrollment=student_enrollment,
                feedback_responses=feedback_responses
            )
        
        if result["success"]:
            return JSONResponse(status_code=200, content=result)
        else:
            logger.error(f"Feedback submission failed: {result.get('message')}")
            raise HTTPException(status_code=400, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting feedback: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error submitting feedback: {str(e)}")

@router.get("/eligibility/{event_id}")
async def check_feedback_eligibility(
    event_id: str,
    student: Student = Depends(require_student_login)
):
    """Check if student is eligible to submit feedback"""
    try:
        result = await event_feedback_service.check_feedback_eligibility(
            event_id=event_id,
            student_enrollment=student.enrollment_no
        )
        
        return JSONResponse(status_code=200, content=result)
            
    except Exception as e:
        logger.error(f"Error checking feedback eligibility: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error checking eligibility: {str(e)}")


@router.get("/test-health")
async def test_health():
    """PHASE 4A: REMOVE IN PRODUCTION - Simple health check for test endpoints"""
    logger.warning(f"PHASE 4A: /test-health endpoint should be removed in production")
    return {
        "status": "ok", 
        "message": "Test feedback API is working - REMOVE IN PRODUCTION",
        "phase_4a_note": "This test endpoint will be removed in production deployment"
    }

@router.get("/test-form/{event_id}")
async def get_test_feedback_form(event_id: str):
    """PHASE 4A: REMOVE IN PRODUCTION - Get feedback form for testing purposes (no authentication required)"""
    logger.warning(f"PHASE 4A: /test-form endpoint should be removed in production")
    
    try:
        logger.info(f"Getting test feedback form for event: {event_id}")
        
        # Direct database access to bypass service issues
        from database.operations import DatabaseOperations
        
        event = await DatabaseOperations.find_one(
            "events",
            {"event_id": event_id},
            {"feedback_form": 1, "event_name": 1, "event_id": 1}
        )
        
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        feedback_form = event.get("feedback_form")
        if not feedback_form:
            raise HTTPException(status_code=404, detail="No feedback form found for this event")
        
        if not feedback_form.get("is_active", True):
            raise HTTPException(status_code=404, detail="Feedback form is not active")
        
        # Handle datetime serialization manually
        from datetime import datetime
        def serialize_datetime(obj):
            if isinstance(obj, dict):
                return {k: serialize_datetime(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [serialize_datetime(item) for item in obj]
            elif isinstance(obj, datetime):
                return obj.isoformat()
            else:
                return obj
        
        serialized_feedback_form = serialize_datetime(feedback_form)
        
        result = {
            "success": True,
            "feedback_form": serialized_feedback_form,
            "event": {
                "event_id": event["event_id"],
                "event_name": event["event_name"]
            },
            "phase_4a_note": "REMOVE IN PRODUCTION - This test endpoint bypasses authentication"
        }
        
        logger.info(f"Successfully retrieved feedback form for {event_id}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error getting test feedback form: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/test-submit")
async def submit_test_feedback(
    event_id: str = Form(...),
    student_enrollment: str = Form(...),
    responses: str = Form(...)
):
    """PHASE 4A: REMOVE IN PRODUCTION - Submit test feedback for an event (test mode only - no authentication required)"""
    logger.warning(f"PHASE 4A: /test-submit endpoint should be removed in production")
    
    try:
        # Parse the responses JSON
        try:
            feedback_responses = json.loads(responses)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=400,
                detail="Invalid feedback responses format"
            )
        
        # Submit test feedback using the service
        result = await event_feedback_service.submit_test_feedback(
            event_id=event_id,
            student_enrollment=student_enrollment,
            feedback_responses=feedback_responses
        )
        
        if result["success"]:
            logger.info(f"Test feedback submitted for event {event_id} by {student_enrollment}")
            result["phase_4a_note"] = "REMOVE IN PRODUCTION - This test endpoint bypasses authentication"
            return JSONResponse(status_code=200, content=result)
        else:
            raise HTTPException(
                status_code=400,
                detail=result["message"]
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting test feedback for event {event_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to submit test feedback"
        )
