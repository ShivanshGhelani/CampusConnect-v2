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

