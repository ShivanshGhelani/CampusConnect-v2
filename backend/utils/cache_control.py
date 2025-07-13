"""
Cache Control Utilities
Provides utilities for managing browser cache behavior, especially for authentication-related pages.
"""

from fastapi import Response
from fastapi.responses import RedirectResponse, HTMLResponse


class CacheControl:
    """Utility class for managing cache control headers"""
    
    @staticmethod
    def no_cache(response: Response) -> Response:
        """Add no-cache headers to prevent browser caching"""
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0, private"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        response.headers["Last-Modified"] = "0"
        response.headers["ETag"] = ""
        return response
    
    @staticmethod
    def short_cache(response: Response, max_age: int = 300) -> Response:
        """Add short-term cache headers (default 5 minutes)"""
        response.headers["Cache-Control"] = f"public, max-age={max_age}"
        return response
    
    @staticmethod
    def auth_redirect(url: str, status_code: int = 303) -> RedirectResponse:
        """Create a redirect response with no-cache headers for authentication flows"""
        response = RedirectResponse(url=url, status_code=status_code)
        return CacheControl.no_cache(response)
    
    @staticmethod
    def secure_page_response(template_response) -> Response:
        """Add cache control headers to secure pages (dashboards, login, etc.)"""
        template_response.headers["Cache-Control"] = "no-cache, must-revalidate, max-age=0"
        template_response.headers["Pragma"] = "no-cache"
        return template_response


def add_cache_control_middleware(app):
    """Add cache control middleware to the FastAPI app"""
    
    @app.middleware("http")
    async def cache_control_middleware(request, call_next):
        response = await call_next(request)
        
        # Apply cache control based on request path
        path = request.url.path
        
        # No cache for authentication-related paths
        if any(auth_path in path for auth_path in ['/login', '/logout', '/auth', '/dashboard']):
            response = CacheControl.no_cache(response)
        
        # Short cache for static assets
        elif any(static_path in path for static_path in ['/static', '/favicon', '.css', '.js', '.png', '.jpg', '.svg']):
            response = CacheControl.short_cache(response, max_age=3600)  # 1 hour for static assets
        
        return response
