"""
Token Manager for Redis-based Authentication
Handles refresh tokens with 30-day expiration and access token management
"""

import json
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import secrets
import hashlib
import os

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logging.warning("Redis not installed. Run 'pip install redis' to enable token management.")

logger = logging.getLogger(__name__)

class TokenManager:
    """Redis-based token manager for authentication with remember me functionality"""
    
    def __init__(self, redis_host='localhost', redis_port=6379, redis_db=1):
        """
        Initialize Redis token manager
        
        Args:
            redis_host: Redis server host
            redis_port: Redis server port  
            redis_db: Redis database number (using db=1 for tokens, separate from cache)
        """
        self.redis_client = None
        self.access_token_expiry = 3600  # 1 hour in seconds
        self.refresh_token_expiry = 30 * 24 * 3600  # 30 days in seconds
        
        if REDIS_AVAILABLE:
            # First try to use Upstash Redis URL from environment
            redis_url = os.getenv("UPSTASH_REDIS_URL") or os.getenv("REDIS_URL")
            
            if redis_url:
                try:
                    self.redis_client = redis.from_url(redis_url, decode_responses=True)
                    self.redis_client.ping()
                    logger.info(f"Token manager initialized successfully with cloud Redis")
                except Exception as e:
                    logger.warning(f"Failed to connect to Redis for token management: {e}")
                    self.redis_client = None
            else:
                # Fallback to local Redis only if no cloud URL is provided
                try:
                    self.redis_client = redis.Redis(
                        host=redis_host,
                        port=redis_port,
                        db=redis_db,
                        decode_responses=True,
                        socket_connect_timeout=2,
                        socket_timeout=2
                    )
                    # Test connection
                    self.redis_client.ping()
                    logger.info(f"Token manager initialized successfully on {redis_host}:{redis_port}/db{redis_db}")
                except Exception as e:
                    logger.warning(f"Failed to connect to Redis for token management: {e}")
                    self.redis_client = None
        else:
            logger.warning("Redis not available, token management disabled")
    
    def is_available(self) -> bool:
        """Check if Redis token management is available."""
        return self.redis_client is not None
    
    def _generate_token(self) -> str:
        """Generate a secure random token"""
        return secrets.token_urlsafe(32)
    
    def _hash_token(self, token: str) -> str:
        """Hash a token for secure storage"""
        return hashlib.sha256(token.encode()).hexdigest()
    
    def _get_user_key(self, user_id: str, user_type: str) -> str:
        """Generate Redis key for user tokens"""
        return f"tokens:{user_type}:{user_id}"
    
    def _get_refresh_token_key(self, token_hash: str) -> str:
        """Generate Redis key for refresh token lookup"""
        return f"refresh_token:{token_hash}"
    
    def generate_tokens(self, user_id: str, user_type: str, user_data: Dict[str, Any], remember_me: bool = False) -> Dict[str, str]:
        """
        Generate access and refresh tokens for a user
        
        Args:
            user_id: Unique identifier for the user (enrollment_no, employee_id, username)
            user_type: Type of user ('student', 'faculty', 'admin')
            user_data: User information to store with tokens
            remember_me: Whether to generate refresh token
            
        Returns:
            Dictionary with access_token and refresh_token (if remember_me=True)
        """
        if not self.is_available():
            logger.warning("Token manager not available, falling back to session-only auth")
            return {}
        
        try:
            access_token = self._generate_token()
            current_time = datetime.utcnow()
            
            # Prepare token data
            token_data = {
                'user_id': user_id,
                'user_type': user_type,
                'user_data': user_data,
                'access_token': access_token,
                'created_at': current_time.isoformat(),
                'expires_at': (current_time + timedelta(seconds=self.access_token_expiry)).isoformat(),
                'remember_me': remember_me
            }
            
            user_key = self._get_user_key(user_id, user_type)
            
            if remember_me:
                # Generate refresh token
                refresh_token = self._generate_token()
                refresh_token_hash = self._hash_token(refresh_token)
                
                token_data['refresh_token'] = refresh_token
                token_data['refresh_token_hash'] = refresh_token_hash
                token_data['refresh_expires_at'] = (current_time + timedelta(seconds=self.refresh_token_expiry)).isoformat()
                
                # Store refresh token lookup
                refresh_key = self._get_refresh_token_key(refresh_token_hash)
                refresh_lookup_data = {
                    'user_id': user_id,
                    'user_type': user_type,
                    'created_at': current_time.isoformat(),
                    'expires_at': token_data['refresh_expires_at']
                }
                
                # Set refresh token with 30-day expiration
                self.redis_client.setex(
                    refresh_key,
                    self.refresh_token_expiry,
                    json.dumps(refresh_lookup_data)
                )
                
                # Store user tokens with 30-day expiration
                self.redis_client.setex(
                    user_key,
                    self.refresh_token_expiry,
                    json.dumps(token_data, default=str)
                )
                
                logger.info(f"Generated tokens with remember_me for {user_type} {user_id}")
                return {
                    'access_token': access_token,
                    'refresh_token': refresh_token,
                    'expires_in': self.access_token_expiry
                }
            else:
                # Store user tokens with 1-hour expiration (access token only)
                self.redis_client.setex(
                    user_key,
                    self.access_token_expiry,
                    json.dumps(token_data, default=str)
                )
                
                logger.info(f"Generated access token only for {user_type} {user_id}")
                return {
                    'access_token': access_token,
                    'expires_in': self.access_token_expiry
                }
                
        except Exception as e:
            logger.error(f"Failed to generate tokens for {user_type} {user_id}: {e}")
            return {}
    
    def validate_access_token(self, access_token: str) -> Optional[Dict[str, Any]]:
        """
        Validate an access token and return user data
        
        Args:
            access_token: The access token to validate
            
        Returns:
            User data if token is valid, None otherwise
        """
        if not self.is_available():
            return None
        
        try:
            # We need to scan for the token since we don't know the user_id
            pattern = "tokens:*"
            for key in self.redis_client.scan_iter(match=pattern):
                token_data_str = self.redis_client.get(key)
                if token_data_str:
                    token_data = json.loads(token_data_str)
                    if token_data.get('access_token') == access_token:
                        # Check if token is expired
                        expires_at = datetime.fromisoformat(token_data['expires_at'])
                        if datetime.utcnow() > expires_at:
                            # Token expired, clean up
                            self.redis_client.delete(key)
                            return None
                        
                        return token_data
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to validate access token: {e}")
            return None
    
    def refresh_access_token(self, refresh_token: str) -> Optional[Dict[str, str]]:
        """
        Generate a new access token using a refresh token
        
        Args:
            refresh_token: The refresh token
            
        Returns:
            New token data if refresh is successful, None otherwise
        """
        if not self.is_available():
            return None
        
        try:
            refresh_token_hash = self._hash_token(refresh_token)
            refresh_key = self._get_refresh_token_key(refresh_token_hash)
            
            # Get refresh token data
            refresh_data_str = self.redis_client.get(refresh_key)
            if not refresh_data_str:
                logger.warning("Refresh token not found or expired")
                return None
            
            refresh_data = json.loads(refresh_data_str)
            user_id = refresh_data['user_id']
            user_type = refresh_data['user_type']
            
            # Get current user token data
            user_key = self._get_user_key(user_id, user_type)
            token_data_str = self.redis_client.get(user_key)
            if not token_data_str:
                logger.warning(f"User token data not found for {user_type} {user_id}")
                return None
            
            token_data = json.loads(token_data_str)
            
            # Verify the refresh token matches
            if token_data.get('refresh_token') != refresh_token:
                logger.warning("Refresh token mismatch")
                return None
            
            # Check if refresh token is expired
            refresh_expires_at = datetime.fromisoformat(refresh_data['expires_at'])
            if datetime.utcnow() > refresh_expires_at:
                # Clean up expired tokens
                self.redis_client.delete(refresh_key)
                self.redis_client.delete(user_key)
                logger.warning("Refresh token expired")
                return None
            
            # Generate new access token
            new_access_token = self._generate_token()
            current_time = datetime.utcnow()
            
            # Update token data
            token_data['access_token'] = new_access_token
            token_data['created_at'] = current_time.isoformat()
            token_data['expires_at'] = (current_time + timedelta(seconds=self.access_token_expiry)).isoformat()
            
            # Update user token data in Redis
            remaining_ttl = self.redis_client.ttl(user_key)
            if remaining_ttl > 0:
                self.redis_client.setex(
                    user_key,
                    remaining_ttl,
                    json.dumps(token_data, default=str)
                )
            else:
                # Fallback to refresh token expiry
                self.redis_client.setex(
                    user_key,
                    self.refresh_token_expiry,
                    json.dumps(token_data, default=str)
                )
            
            logger.info(f"Refreshed access token for {user_type} {user_id}")
            return {
                'access_token': new_access_token,
                'expires_in': self.access_token_expiry
            }
            
        except Exception as e:
            logger.error(f"Failed to refresh access token: {e}")
            return None
    
    def revoke_user_tokens(self, user_id: str, user_type: str) -> bool:
        """
        Revoke all tokens for a user (logout)
        
        Args:
            user_id: User identifier
            user_type: Type of user
            
        Returns:
            True if tokens were revoked successfully
        """
        if not self.is_available():
            return True  # No tokens to revoke
        
        try:
            user_key = self._get_user_key(user_id, user_type)
            
            # Get current token data to find refresh token
            token_data_str = self.redis_client.get(user_key)
            if token_data_str:
                token_data = json.loads(token_data_str)
                refresh_token = token_data.get('refresh_token')
                
                if refresh_token:
                    refresh_token_hash = self._hash_token(refresh_token)
                    refresh_key = self._get_refresh_token_key(refresh_token_hash)
                    self.redis_client.delete(refresh_key)
            
            # Delete user token data
            self.redis_client.delete(user_key)
            
            logger.info(f"Revoked tokens for {user_type} {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to revoke tokens for {user_type} {user_id}: {e}")
            return False
    
    def cleanup_expired_tokens(self) -> int:
        """
        Clean up expired tokens (maintenance task)
        
        Returns:
            Number of tokens cleaned up
        """
        if not self.is_available():
            return 0
        
        try:
            cleaned_count = 0
            current_time = datetime.utcnow()
            
            # Clean up user tokens
            pattern = "tokens:*"
            for key in self.redis_client.scan_iter(match=pattern):
                token_data_str = self.redis_client.get(key)
                if token_data_str:
                    try:
                        token_data = json.loads(token_data_str)
                        expires_at = datetime.fromisoformat(token_data.get('expires_at', ''))
                        if current_time > expires_at:
                            # Clean up associated refresh token if exists
                            refresh_token = token_data.get('refresh_token')
                            if refresh_token:
                                refresh_token_hash = self._hash_token(refresh_token)
                                refresh_key = self._get_refresh_token_key(refresh_token_hash)
                                self.redis_client.delete(refresh_key)
                            
                            self.redis_client.delete(key)
                            cleaned_count += 1
                    except (ValueError, KeyError, TypeError):
                        # Invalid data, delete the key
                        self.redis_client.delete(key)
                        cleaned_count += 1
            
            # Clean up orphaned refresh tokens
            pattern = "refresh_token:*"
            for key in self.redis_client.scan_iter(match=pattern):
                refresh_data_str = self.redis_client.get(key)
                if refresh_data_str:
                    try:
                        refresh_data = json.loads(refresh_data_str)
                        expires_at = datetime.fromisoformat(refresh_data.get('expires_at', ''))
                        if current_time > expires_at:
                            self.redis_client.delete(key)
                            cleaned_count += 1
                    except (ValueError, KeyError, TypeError):
                        # Invalid data, delete the key
                        self.redis_client.delete(key)
                        cleaned_count += 1
            
            if cleaned_count > 0:
                logger.info(f"Cleaned up {cleaned_count} expired tokens")
            
            return cleaned_count
            
        except Exception as e:
            logger.error(f"Failed to cleanup expired tokens: {e}")
            return 0
    
    def get_token_stats(self) -> Dict[str, Any]:
        """
        Get statistics about stored tokens
        
        Returns:
            Dictionary with token statistics
        """
        if not self.is_available():
            return {'available': False, 'reason': 'Redis not available'}
        
        try:
            stats = {
                'available': True,
                'total_user_tokens': 0,
                'total_refresh_tokens': 0,
                'tokens_by_type': {},
                'tokens_with_remember_me': 0
            }
            
            # Count user tokens
            pattern = "tokens:*"
            for key in self.redis_client.scan_iter(match=pattern):
                stats['total_user_tokens'] += 1
                
                # Extract user type from key
                parts = key.split(':')
                if len(parts) >= 2:
                    user_type = parts[1]
                    stats['tokens_by_type'][user_type] = stats['tokens_by_type'].get(user_type, 0) + 1
                
                # Check if token has remember_me
                token_data_str = self.redis_client.get(key)
                if token_data_str:
                    try:
                        token_data = json.loads(token_data_str)
                        if token_data.get('remember_me'):
                            stats['tokens_with_remember_me'] += 1
                    except (ValueError, TypeError):
                        pass
            
            # Count refresh tokens
            pattern = "refresh_token:*"
            for key in self.redis_client.scan_iter(match=pattern):
                stats['total_refresh_tokens'] += 1
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get token stats: {e}")
            return {'available': True, 'error': str(e)}


# Singleton instance for easy import
token_manager = TokenManager()
