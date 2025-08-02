from pydantic import BaseModel, EmailStr
from typing import Optional

class ForgotPasswordRequest(BaseModel):
    """Request model for forgot password - Student"""
    enrollment_no: str
    email: EmailStr

class ForgotPasswordFacultyRequest(BaseModel):
    """Request model for forgot password - Faculty"""
    employee_id: str
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    """Request model for password reset"""
    new_password: str

class PasswordResetToken(BaseModel):
    """Model for password reset token data"""
    user_id: str
    user_type: str  # 'student' or 'faculty'
    email: str
    created_at: str
    expires_at: str

class TokenValidationResponse(BaseModel):
    """Response model for token validation"""
    is_valid: bool
    user_type: Optional[str] = None
    user_info: Optional[dict] = None
    message: str

class ForgotPasswordResponse(BaseModel):
    """Response model for forgot password request"""
    message: str
    email_sent: bool

class ResetPasswordResponse(BaseModel):
    """Response model for password reset"""
    message: str
    success: bool
