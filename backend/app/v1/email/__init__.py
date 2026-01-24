"""
"""
Email Service API Routes
Handles email service health check and monitoring endpoints
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import logging
from typing import Dict, Any
from datetime import datetime

from services.communication.email_service import communication_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/email", tags=["email-api"])

@router.get("/health")
async def email_service_health():
    """
    Get email service health status and statistics
    """
    try:
        health_data = await communication_service.health_check()
        status_code = 200 if health_data.get('status') == 'healthy' else 503
        
        return JSONResponse(
            content={
                "status": "success",
                "data": health_data
            },
            status_code=status_code
        )
        
    except Exception as e:
        logger.error(f"Email health check failed: {e}")
        return JSONResponse(
            content={
                "status": "error",
                "message": f"Health check failed: {str(e)}"
            },
            status_code=503
        )

@router.get("/stats")
async def email_service_statistics():
    """
    Get comprehensive email service statistics
    """
    try:
        stats = communication_service.get_statistics()
        
        return {
            "status": "success",
            "data": stats
        }
        
    except Exception as e:
        logger.error(f"Failed to get email statistics: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get statistics: {str(e)}"
        )

@router.post("/circuit-breaker/reset")
async def reset_circuit_breaker():
    """
    Reset the email service circuit breaker
    """
    try:
        communication_service.circuit_breaker.reset()
        
        return {
            "status": "success",
            "message": "Circuit breaker reset successfully",
            "circuit_breaker_state": communication_service.circuit_breaker.get_state()
        }
        
    except Exception as e:
        logger.error(f"Failed to reset circuit breaker: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reset circuit breaker: {str(e)}"
        )

@router.post("/test-send")
async def send_test_email(to_email: str):
    """
    Send a test email to verify email service is working
    Useful for production debugging
    """
    try:
        logger.info(f"Test email requested for {to_email}")
        
        # Test email content (using HTML entities for compatibility with Python 3.13)
        subject = "CampusConnect Email Service Test"
        content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #4F46E5;">&#x2705; Email Service Working!</h2>
            <p>This is a test email from CampusConnect to verify the email service is functioning correctly.</p>
            <p><strong>Timestamp:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            <hr style="margin: 20px 0;">
            <p style="color: #6B7280; font-size: 12px;">This is an automated test email from CampusConnect.</p>
        </body>
        </html>
        """
        
        # Send test email
        success = await communication_service.send_email_async(
            to_email=to_email,
            subject=subject,
            content=content,
            content_type="html"
        )
        
        if success:
            logger.info(f"Test email sent successfully to {to_email}")
            return {
                "status": "success",
                "message": f"Test email sent successfully to {to_email}",
                "timestamp": datetime.now().isoformat()
            }
        else:
            logger.error(f"Test email failed to send to {to_email}")
            return JSONResponse(
                content={
                    "status": "error",
                    "message": "Failed to send test email - check logs for details",
                    "circuit_breaker_state": communication_service.circuit_breaker.get_state()
                },
                status_code=500
            )
        
    except Exception as e:
        logger.error(f"Test email error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Test email failed: {str(e)}"
        )

