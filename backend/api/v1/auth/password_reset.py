from fastapi import APIRouter, HTTPException, Depends
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

logger = get_logger(__name__)

router = APIRouter(tags=["Password Reset"])

@router.post("/forgot-password/student", response_model=ForgotPasswordResponse)
async def forgot_password_student(request: ForgotPasswordRequest):
    """
    Initiate password reset for student
    """
    try:
        result = await password_reset_service.initiate_password_reset_student(
            enrollment_no=request.enrollment_no,
            email=request.email
        )
        
        if result['success']:
            return ForgotPasswordResponse(
                message=result['message'],
                email_sent=result['email_sent']
            )
        else:
            raise HTTPException(status_code=400, detail=result['message'])
            
    except Exception as e:
        logger.error(f"Error in forgot password student endpoint: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to process password reset request. Please try again later."
        )

@router.post("/forgot-password/faculty", response_model=ForgotPasswordResponse)
async def forgot_password_faculty(request: ForgotPasswordFacultyRequest):
    """
    Initiate password reset for faculty
    """
    try:
        result = await password_reset_service.initiate_password_reset_faculty(
            employee_id=request.employee_id,
            email=request.email
        )
        
        if result['success']:
            return ForgotPasswordResponse(
                message=result['message'],
                email_sent=result['email_sent']
            )
        else:
            raise HTTPException(status_code=400, detail=result['message'])
            
    except Exception as e:
        logger.error(f"Error in forgot password faculty endpoint: {e}")
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
