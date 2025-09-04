"""
Authentication Middleware for Token-based Authentication
Handles both session-based and token-based authentication with automatic refresh
"""

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any, Union
from utils.token_manager import token_manager
from models.admin_user import AdminUser
from models.student import Student
from models.faculty import Faculty
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class AuthMiddleware:
    """Middleware for handling authentication with automatic token refresh"""
    
    @staticmethod
    def get_token_from_request(request: Request) -> Optional[str]:
        """
        Extract access token from request
        Looks for token in Authorization header or cookies
        """
        # Check Authorization header
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            return auth_header.split(" ")[1]
        
        # Check cookies
        token = request.cookies.get("access_token")
        if token:
            return token
        
        return None
    
    @staticmethod
    def get_refresh_token_from_request(request: Request) -> Optional[str]:
        """Extract refresh token from request cookies"""
        return request.cookies.get("refresh_token")
    
    @staticmethod
    async def authenticate_user_with_token(request: Request, required_user_type: Optional[str] = None) -> Optional[Union[AdminUser, Student, Faculty]]:
        """
        Authenticate user using access token with automatic refresh
        
        Args:
            request: FastAPI request object
            required_user_type: Required user type ('admin', 'student', 'faculty') or None for any
            
        Returns:
            User object if authenticated, None otherwise
        """
        access_token = AuthMiddleware.get_token_from_request(request)
        
        if not access_token:
            # No token provided, fall back to session-based auth if needed
            return None
        
        # Validate access token
        token_data = token_manager.validate_access_token(access_token)
        
        if not token_data:
            # Access token invalid or expired, try to refresh
            refresh_token = AuthMiddleware.get_refresh_token_from_request(request)
            
            if refresh_token:
                # Try to refresh the access token
                new_token_data = token_manager.refresh_access_token(refresh_token)
                if new_token_data:
                    # Get updated user data
                    new_access_token = new_token_data['access_token']
                    token_data = token_manager.validate_access_token(new_access_token)
                    
                    if token_data:
                        # Set new access token in response (will be handled by route)
                        logger.info(f"Refreshed access token for {token_data.get('user_type')} {token_data.get('user_id')}")
                        # Store new token in request for route to set in response
                        request.state.new_access_token = new_access_token
                        request.state.token_expires_in = new_token_data['expires_in']
                else:
                    # Refresh failed, user needs to login again
                    logger.warning("Token refresh failed, user needs to re-authenticate")
                    return None
            else:
                # No refresh token available
                return None
        
        if not token_data:
            return None
        
        user_type = token_data.get('user_type')
        user_data = token_data.get('user_data', {})
        
        # Check required user type
        if required_user_type and user_type != required_user_type:
            return None
        
        # Convert to appropriate user model
        try:
            if user_type == 'admin':
                return AdminUser(**user_data)
            elif user_type == 'student':
                # Convert ISO datetime strings back to datetime objects for Student model
                for key, value in user_data.items():
                    if isinstance(value, str) and ('_at' in key or key == 'last_login'):
                        try:
                            user_data[key] = datetime.fromisoformat(value) if value else None
                        except ValueError:
                            user_data[key] = None
                return Student(**user_data)
            elif user_type == 'faculty':
                # Convert ISO datetime strings back to datetime objects for Faculty model
                for key, value in user_data.items():
                    if isinstance(value, str) and ('_at' in key or key == 'last_login'):
                        try:
                            user_data[key] = datetime.fromisoformat(value) if value else None
                        except ValueError:
                            user_data[key] = None
                return Faculty(**user_data)
            else:
                logger.warning(f"Unknown user type: {user_type}")
                return None
                
        except Exception as e:
            logger.error(f"Failed to create user model from token data: {e}")
            return None
    
    @staticmethod
    def set_token_cookies(response, access_token: str, refresh_token: Optional[str] = None, expires_in: int = 3600):
        """
        Set authentication tokens as HTTP-only cookies
        
        Args:
            response: FastAPI response object
            access_token: Access token to set
            refresh_token: Refresh token to set (optional)
            expires_in: Access token expiration in seconds
        """
        import os
        
        # Determine if we're in production (cross-origin) mode or using HTTPS
        is_production = os.getenv("ENVIRONMENT") == "production"
        backend_url = os.getenv("BACKEND_URL", "")
        is_https = backend_url.startswith("https://") or is_production
        
        # Set access token cookie (expires with token)
        response.set_cookie(
            key="access_token",
            value=access_token,
            max_age=expires_in,
            httponly=True,
            secure=is_https,  # Secure if HTTPS (includes ngrok)
            samesite="none" if is_https else "lax"  # Cross-origin for HTTPS, lax for local HTTP
        )
        
        # Set refresh token cookie (30 days if provided)
        if refresh_token:
            response.set_cookie(
                key="refresh_token",
                value=refresh_token,
                max_age=30 * 24 * 3600,  # 30 days
                httponly=True,
                secure=is_https,  # Secure if HTTPS (includes ngrok)
                samesite="none" if is_https else "lax"  # Cross-origin for HTTPS, lax for local HTTP
            )
    
    @staticmethod
    def clear_token_cookies(response):
        """Clear authentication token cookies"""
        import os
        is_production = os.getenv("ENVIRONMENT") == "production"
        
        response.delete_cookie(
            key="access_token", 
            httponly=True, 
            secure=is_production,
            samesite="none" if is_production else "lax"
        )
        response.delete_cookie(
            key="refresh_token", 
            httponly=True, 
            secure=is_production,
            samesite="none" if is_production else "lax"
        )


# Dependency functions that can be used in FastAPI routes
async def get_current_user_from_token(request: Request) -> Optional[Union[AdminUser, Student, Faculty]]:
    """Dependency to get current user from token (any user type)"""
    return await AuthMiddleware.authenticate_user_with_token(request)

async def get_current_admin_from_token(request: Request) -> Optional[AdminUser]:
    """Dependency to get current admin from token"""
    user = await AuthMiddleware.authenticate_user_with_token(request, required_user_type='admin')
    return user if isinstance(user, AdminUser) else None

async def get_current_student_from_token(request: Request) -> Optional[Student]:
    """Dependency to get current student from token"""
    user = await AuthMiddleware.authenticate_user_with_token(request, required_user_type='student')
    return user if isinstance(user, Student) else None

async def get_current_faculty_from_token(request: Request) -> Optional[Faculty]:
    """Dependency to get current faculty from token"""
    user = await AuthMiddleware.authenticate_user_with_token(request, required_user_type='faculty')
    return user if isinstance(user, Faculty) else None

async def require_token_auth(request: Request) -> Union[AdminUser, Student, Faculty]:
    """Dependency that requires valid token authentication"""
    user = await get_current_user_from_token(request)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Valid authentication token required"
        )
    return user

async def require_admin_token_auth(request: Request) -> AdminUser:
    """Dependency that requires valid admin token authentication"""
    admin = await get_current_admin_from_token(request)
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Valid admin authentication token required"
        )
    return admin

async def require_student_token_auth(request: Request) -> Student:
    """Dependency that requires valid student token authentication"""
    student = await get_current_student_from_token(request)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Valid student authentication token required"
        )
    return student

async def require_faculty_token_auth(request: Request) -> Faculty:
    """Dependency that requires valid faculty token authentication"""
    faculty = await get_current_faculty_from_token(request)
    if not faculty:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Valid faculty authentication token required"
        )
    return faculty

def create_token_response(user_data: Dict[str, Any], message: str = "Authentication successful") -> Dict[str, Any]:
    """
    Create a standardized token response
    
    Args:
        user_data: User information
        message: Success message
        
    Returns:
        Standardized response dictionary
    """
    return {
        "success": True,
        "message": message,
        "user": user_data,
        "auth_type": "token"
    }
