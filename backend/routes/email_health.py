"""
Email Service Health Check and Monitoring Endpoint
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import logging
from typing import Dict, Any

from services.communication.email_service import communication_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/email", tags=["Email Service"])

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

@router.post("/test")
async def test_email_service(
    test_email: str = "test@example.com",
    bypass_circuit_breaker: bool = False
):
    """
    Test email service by sending a test email
    """
    try:
        if bypass_circuit_breaker:
            # Direct call bypassing circuit breaker
            success = await communication_service.send_email_async(
                to_email=test_email,
                subject="🧪 Email Service Test - CampusConnect",
                content="<h2>Email Service Test</h2><p>This is a test email to verify the email service is working correctly.</p>",
                content_type="html"
            )
        else:
            # Normal call through circuit breaker
            success = await communication_service.send_email_async(
                to_email=test_email,
                subject="🧪 Email Service Test - CampusConnect",
                content="<h2>Email Service Test</h2><p>This is a test email to verify the email service is working correctly.</p>",
                content_type="html"
            )
        
        if success:
            return {
                "status": "success",
                "message": f"Test email sent successfully to {test_email}",
                "circuit_breaker_state": communication_service.circuit_breaker.get_state()
            }
        else:
            return JSONResponse(
                content={
                    "status": "error",
                    "message": f"Failed to send test email to {test_email}",
                    "circuit_breaker_state": communication_service.circuit_breaker.get_state()
                },
                status_code=500
            )
        
    except Exception as e:
        logger.error(f"Email service test failed: {e}")
        return JSONResponse(
            content={
                "status": "error",
                "message": f"Email service test failed: {str(e)}",
                "circuit_breaker_state": communication_service.circuit_breaker.get_state()
            },
            status_code=500
        )
