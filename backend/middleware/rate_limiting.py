"""
Rate Limiting Middleware for CampusConnect
Protects against brute force attacks and DDoS
"""

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request, HTTPException
import redis
from datetime import datetime, timedelta
import logging
import os

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Initialize Redis for rate limiting storage
# pip install redis
try:
    redis_url = os.getenv("UPSTASH_REDIS_URL") or os.getenv("REDIS_URL")
    if redis_url:
        # Redis-py 5.x automatically handles SSL from rediss:// URL
        redis_client = redis.from_url(
            redis_url, 
            decode_responses=True,
            socket_connect_timeout=10,
            socket_timeout=10,
            retry_on_timeout=True
        )
        redis_client.ping()  # Test connection
        storage_uri = redis_url
    else:
        # Fallback to local Redis
        redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
        redis_client.ping()  # Test connection
        storage_uri = "redis://localhost:6379"
except:
    redis_client = None
    storage_uri = "memory://"

# Initialize rate limiter
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=storage_uri
)

class AdvancedRateLimiter:
    """
    Advanced rate limiting with different strategies
    """
    
    def __init__(self):
        self.failed_attempts = {}
        self.blocked_ips = {}
        self.logger = logging.getLogger(__name__)
    
    def check_failed_login_attempts(self, ip: str, user_identifier: str) -> bool:
        """
        Check if IP or user has exceeded failed login attempts
        Returns True if should be blocked
        """
        key = f"failed_login:{ip}:{user_identifier}"
        current_time = datetime.utcnow()
        
        # Get current attempts
        if redis_client:
            attempts = redis_client.get(key)
            attempts = int(attempts) if attempts else 0
        else:
            attempts = self.failed_attempts.get(key, 0)
        
        # Check if blocked
        if attempts >= 5:  # Max 5 failed attempts
            self.logger.warning(f"IP {ip} blocked due to failed login attempts")
            return True
        
        return False
    
    def record_failed_login(self, ip: str, user_identifier: str):
        """Record a failed login attempt"""
        key = f"failed_login:{ip}:{user_identifier}"
        
        if redis_client:
            # Increment counter with 15-minute expiry
            redis_client.incr(key)
            redis_client.expire(key, 900)  # 15 minutes
        else:
            self.failed_attempts[key] = self.failed_attempts.get(key, 0) + 1
        
        self.logger.info(f"Failed login recorded for IP {ip}")
    
    def clear_failed_attempts(self, ip: str, user_identifier: str):
        """Clear failed attempts after successful login"""
        key = f"failed_login:{ip}:{user_identifier}"
        
        if redis_client:
            redis_client.delete(key)
        else:
            self.failed_attempts.pop(key, None)
    
    def is_ip_blocked(self, ip: str) -> bool:
        """Check if IP is in temporary block list"""
        if redis_client:
            return redis_client.exists(f"blocked_ip:{ip}")
        else:
            blocked_until = self.blocked_ips.get(ip)
            if blocked_until and datetime.utcnow() < blocked_until:
                return True
            elif blocked_until:
                # Remove expired block
                del self.blocked_ips[ip]
        
        return False
    
    def block_ip_temporarily(self, ip: str, duration_minutes: int = 15):
        """Block IP for specified duration"""
        if redis_client:
            redis_client.setex(f"blocked_ip:{ip}", duration_minutes * 60, "blocked")
        else:
            self.blocked_ips[ip] = datetime.utcnow() + timedelta(minutes=duration_minutes)
        
        self.logger.warning(f"IP {ip} temporarily blocked for {duration_minutes} minutes")

# Global rate limiter instance
rate_limiter = AdvancedRateLimiter()

# Rate limiting decorators for different endpoints
def rate_limit_login():
    """Rate limit for login endpoints"""
    return limiter.limit("5/minute")

def rate_limit_api():
    """Rate limit for general API endpoints"""
    return limiter.limit("100/minute")

def rate_limit_registration():
    """Rate limit for registration endpoints"""
    return limiter.limit("3/minute")

def rate_limit_password_reset():
    """Rate limit for password reset"""
    return limiter.limit("2/minute")

# Middleware to check blocked IPs
async def check_ip_block_middleware(request: Request, call_next):
    """
    Middleware to check if IP is blocked
    """
    client_ip = get_remote_address(request)
    
    if rate_limiter.is_ip_blocked(client_ip):
        raise HTTPException(
            status_code=429,
            detail="IP temporarily blocked due to suspicious activity"
        )
    
    response = await call_next(request)
    return response

# Usage example in routes:
"""
from middleware.rate_limiting import rate_limit_login, rate_limiter

@router.post("/login")
@rate_limit_login()
async def login(request: Request, credentials: LoginCredentials):
    client_ip = get_remote_address(request)
    
    # Check if IP should be blocked
    if rate_limiter.check_failed_login_attempts(client_ip, credentials.email):
        raise HTTPException(429, "Too many failed attempts. Try again later.")
    
    # Verify credentials...
    if not valid_credentials:
        rate_limiter.record_failed_login(client_ip, credentials.email)
        raise HTTPException(401, "Invalid credentials")
    
    # Clear failed attempts on successful login
    rate_limiter.clear_failed_attempts(client_ip, credentials.email)
    
    return {"token": "success"}
"""
