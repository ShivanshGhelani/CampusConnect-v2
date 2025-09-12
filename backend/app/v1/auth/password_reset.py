from fastapi import APIRouter, HTTPException, Depends, Request
from models.password_reset import (
    ForgotPasswordRequest, 
    ForgotPasswordFacultyRequest,
    ResetPasswordRequest,
    TokenValidationResponse,
    ForgotPasswordResponse,
    ResetPasswordResponse
)
from services.password_reset_service import password_reset_service
from core.logger import get_logger
from typing import Union
from pydantic import BaseModel

logger = get_logger(__name__)

router = APIRouter(tags=["Password Reset"])

def extract_client_ip(request: Request) -> str:
    """Extract client IP address from request headers"""
    client_ip = request.client.host
    if "x-forwarded-for" in request.headers:
        client_ip = request.headers["x-forwarded-for"].split(",")[0].strip()
    elif "x-real-ip" in request.headers:
        client_ip = request.headers["x-real-ip"]
    return client_ip

@router.post("/forgot-password/{user_type}", response_model=ForgotPasswordResponse)
async def forgot_password_unified(
    user_type: str, 
    request_data: Union[ForgotPasswordRequest, ForgotPasswordFacultyRequest], 
    request: Request
):
    """
    UNIFIED password reset endpoint for all user types
    
    Supports:
    - POST /forgot-password/student (enrollment_no + email)
    - POST /forgot-password/faculty (employee_id + email)
    """
    try:
        # Validate user type
        if user_type not in ['student', 'faculty']:
            raise HTTPException(
                status_code=400, 
                detail="Invalid user type. Must be 'student' or 'faculty'"
            )
        
        # Extract client IP address (unified logic)
        client_ip = extract_client_ip(request)
        
        # Route to appropriate service method based on user type
        if user_type == 'student':
            # Validate student request data
            if not hasattr(request_data, 'enrollment_no'):
                raise HTTPException(
                    status_code=400, 
                    detail="enrollment_no is required for student password reset"
                )
            
            result = await password_reset_service.initiate_password_reset_student(
                enrollment_no=request_data.enrollment_no,
                email=request_data.email,
                client_ip=client_ip
            )
        else:  # faculty
            # Validate faculty request data
            if not hasattr(request_data, 'employee_id'):
                raise HTTPException(
                    status_code=400, 
                    detail="employee_id is required for faculty password reset"
                )
            
            result = await password_reset_service.initiate_password_reset_faculty(
                employee_id=request_data.employee_id,
                email=request_data.email,
                client_ip=client_ip
            )
        
        # Unified response handling
        if result['success']:
            return ForgotPasswordResponse(
                message=result['message'],
                email_sent=result['email_sent']
            )
        else:
            raise HTTPException(status_code=400, detail=result['message'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in unified forgot password endpoint for {user_type}: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to process password reset request. Please try again later."
        )

@router.get("/validate-reset-token/{token}", response_model=TokenValidationResponse)
async def validate_reset_token(token: str):
    """
    Validate password reset token and return user info
    """
    try:
        result = await password_reset_service.validate_reset_token(token)
        
        return TokenValidationResponse(
            is_valid=result['is_valid'],
            user_type=result.get('user_type'),
            user_info=result.get('user_info'),
            message=result['message']
        )
        
    except Exception as e:
        logger.error(f"Error validating reset token: {e}")
        return TokenValidationResponse(
            is_valid=False,
            message="Token validation failed"
        )

@router.post("/reset-password/{token}", response_model=ResetPasswordResponse)
async def reset_password(token: str, request: ResetPasswordRequest):
    """
    Reset user password using valid token
    """
    try:
        # Basic password validation
        if len(request.new_password) < 6:
            raise HTTPException(
                status_code=400, 
                detail="Password must be at least 6 characters long"
            )
        
        result = await password_reset_service.reset_password(
            token=token,
            new_password=request.new_password
        )
        
        if result['success']:
            return ResetPasswordResponse(
                message=result['message'],
                success=True
            )
        else:
            raise HTTPException(status_code=400, detail=result['message'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in reset password endpoint: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to reset password. Please try again later."
        )
