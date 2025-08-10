"""
Security Headers Middleware for CampusConnect
Adds essential security headers to protect against common web vulnerabilities
"""

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response as StarletteResponse
import logging

logger = logging.getLogger(__name__)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers to all responses
    """
    
    def __init__(self, app, config=None):
        super().__init__(app)
        self.config = config or {}
        
        # Default security headers
        self.default_headers = {
            # Prevent MIME type sniffing
            "X-Content-Type-Options": "nosniff",
            
            # Prevent embedding in frames (clickjacking protection)
            "X-Frame-Options": "DENY",
            
            # XSS Protection (legacy browsers)
            "X-XSS-Protection": "1; mode=block",
            
            # Force HTTPS (when enabled)
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
            
            # Content Security Policy
            "Content-Security-Policy": self._get_csp_policy(),
            
            # Referrer Policy
            "Referrer-Policy": "strict-origin-when-cross-origin",
            
            # Permissions Policy (formerly Feature Policy)
            "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
            
            # Prevent sensitive information caching
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        }
    
    def _get_csp_policy(self) -> str:
        """
        Generate Content Security Policy based on application needs
        """
        # Adjust this CSP based on your frontend requirements
        csp_directives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: https: blob:",
            "connect-src 'self' https://api.github.com",
            "frame-src 'self' https://www.google.com/recaptcha/",
            "worker-src 'self'",
            "object-src 'none'",
            "media-src 'self'",
            "manifest-src 'self'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "upgrade-insecure-requests"
        ]
        
        return "; ".join(csp_directives)
    
    async def dispatch(self, request: Request, call_next):
        """
        Add security headers to response
        """
        try:
            response = await call_next(request)
            
            # Add security headers
            for header_name, header_value in self.default_headers.items():
                # Skip HSTS for non-HTTPS in development
                if header_name == "Strict-Transport-Security" and not self._is_https(request):
                    continue
                
                response.headers[header_name] = header_value
            
            # Add custom headers based on request path
            self._add_route_specific_headers(request, response)
            
            logger.debug(f"Security headers added to response for {request.url.path}")
            return response
            
        except Exception as e:
            logger.error(f"Error in SecurityHeadersMiddleware: {e}")
            # Return response without additional headers if error occurs
            return await call_next(request)
    
    def _is_https(self, request: Request) -> bool:
        """Check if request is over HTTPS"""
        return request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https"
    
    def _add_route_specific_headers(self, request: Request, response: Response):
        """
        Add headers specific to certain routes
        """
        path = request.url.path
        
        # API routes - more restrictive caching
        if path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        
        # Static files - allow caching with validation
        elif path.startswith("/static/"):
            response.headers["Cache-Control"] = "public, max-age=3600, must-revalidate"
        
        # Login/auth routes - extra security
        elif any(auth_path in path for auth_path in ["/login", "/register", "/reset-password"]):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
            response.headers["Pragma"] = "no-cache"


class SecurityMonitoringMiddleware(BaseHTTPMiddleware):
    """
    Middleware to monitor and log security-related events
    """
    
    def __init__(self, app):
        super().__init__(app)
        self.suspicious_patterns = [
            # SQL Injection patterns
            "union select", "drop table", "exec sp_", "'; --",
            
            # XSS patterns
            "<script", "javascript:", "onload=", "onerror=",
            
            # Path traversal
            "../", "..\\", "%2e%2e%2f",
            
            # Command injection
            "|", ";", "&&", "||"
        ]
    
    async def dispatch(self, request: Request, call_next):
        """
        Monitor request for suspicious patterns
        """
        # Check for suspicious patterns in URL
        url_str = str(request.url).lower()
        for pattern in self.suspicious_patterns:
            if pattern in url_str:
                logger.warning(f"Suspicious pattern '{pattern}' detected in URL: {request.url}")
                break
        
        # Check user agent for common bot patterns
        user_agent = request.headers.get("user-agent", "").lower()
        bot_patterns = ["bot", "crawler", "spider", "scraper", "curl", "wget"]
        
        if any(pattern in user_agent for pattern in bot_patterns):
            logger.info(f"Bot detected: {user_agent} from {request.client.host}")
        
        # Log excessive requests from same IP
        self._track_request_frequency(request)
        
        response = await call_next(request)
        
        # Log failed authentication attempts
        if response.status_code == 401:
            logger.warning(f"Failed authentication attempt from {request.client.host} to {request.url.path}")
        
        return response
    
    def _track_request_frequency(self, request: Request):
        """
        Track request frequency to detect potential DDoS
        """
        # This is a simple implementation - in production, use Redis or similar
        # for distributed rate tracking
        pass


# Configuration for different environments
class SecurityConfig:
    DEVELOPMENT = {
        "enable_hsts": False,
        "csp_report_only": True,
        "log_level": "DEBUG"
    }
    
    PRODUCTION = {
        "enable_hsts": True,
        "csp_report_only": False,
        "log_level": "WARNING"
    }

# Usage in main.py:
"""
from middleware.security_headers import SecurityHeadersMiddleware, SecurityMonitoringMiddleware

# Add to FastAPI app
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(SecurityMonitoringMiddleware)
"""
