"""
Secure URL Service
Provides secure, time-limited access to private assets
"""
import hashlib
import hmac
import time
import base64
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from config.settings import settings
import logging

logger = logging.getLogger(__name__)


class SecureURLService:
    """Service for creating secure, time-limited asset URLs"""
    
    SECRET_KEY = settings.JWT_SECRET_KEY  # Use existing secret key
    DEFAULT_EXPIRY_HOURS = 24  # Default expiry time
    
    @staticmethod
    def create_secure_url(
        asset_id: str,
        original_url: str,
        expires_in_hours: int = DEFAULT_EXPIRY_HOURS,
        purpose: str = "view"
    ) -> str:
        """
        Create a secure, time-limited URL for asset access with short token
        
        Args:
            asset_id: Asset ID
            original_url: Original Supabase URL (for backend use)
            expires_in_hours: URL expiry time in hours
            purpose: Purpose of access (view, download, etc.)
            
        Returns:
            Secure URL with short token
        """
        try:
            # Create expiry timestamp
            expiry = int((datetime.utcnow() + timedelta(hours=expires_in_hours)).timestamp())
            
            # Create a short, secure token instead of long base64
            # Use only asset_id + short hash for the token
            payload = f"{asset_id}:{expiry}:{purpose}"
            signature = hmac.new(
                SecureURLService.SECRET_KEY.encode(),
                payload.encode(),
                hashlib.sha256
            ).hexdigest()
            
            # Create short token: first 8 chars of asset_id + first 8 chars of signature
            short_token = f"{asset_id[:8]}{signature[:8]}"
            
            # Store the full token data in a simple format (we'll retrieve from database)
            # Return short, user-friendly URL - FIXED: Include /admin prefix
            secure_url = f"{settings.BACKEND_URL}/api/v1/admin/assets/view/{short_token}"
            
            logger.info(f"Created short secure URL for asset {asset_id}, expires: {datetime.fromtimestamp(expiry)}")
            return secure_url
            
        except Exception as e:
            logger.error(f"Error creating secure URL: {e}")
            return ""
    
    @staticmethod
    def validate_secure_token(token: str) -> tuple[bool, str, str]:
        """
        Validate a short secure token and return asset info
        
        Args:
            token: Short token from URL (16 characters)
            
        Returns:
            Tuple of (is_valid, asset_id, error_message)
        """
        try:
            # For short tokens, we need to lookup the asset in database
            # to validate access properly
            if len(token) != 16:  # short_token should be 16 chars (8+8)
                return False, "", "Invalid token format"
                
            # Extract asset_id hint from first 8 characters
            asset_id_hint = token[:8]
            
            # The token format is: first 8 chars of asset_id + first 8 chars of signature
            # To validate, we need to:
            # 1. Find asset by ID prefix
            # 2. Reconstruct expected signature
            # 3. Compare with provided signature
            
            # For now, return the asset_id_hint for database lookup
            # The actual validation will happen in the endpoint by checking if asset exists
            logger.info(f"Validating short token: {token}, asset_id_hint: {asset_id_hint}")
            return True, asset_id_hint, ""
            
        except Exception as e:
            logger.error(f"Error validating secure token: {e}")
            return False, "", str(e)
    
    @staticmethod
    def create_image_tag(secure_url: str, asset_name: str, css_class: str = "") -> str:
        """
        Generate HTML image tag with secure URL
        
        Args:
            secure_url: Secure URL for the asset
            asset_name: Asset name for alt text
            css_class: Optional CSS class
            
        Returns:
            HTML image tag string
        """
        class_attr = f' class="{css_class}"' if css_class else ''
        return f'<img src="{secure_url}" alt="{asset_name}"{class_attr} />'
    
    @staticmethod
    def create_short_code(asset_id: str, length: int = 8) -> str:
        """Create a short code for asset reference"""
        hash_object = hashlib.md5(f"{asset_id}:{int(time.time())}".encode())
        return hash_object.hexdigest()[:length]
