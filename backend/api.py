"""
Alternative Vercel handler using a different approach.
"""

from main import app

# Direct export of the FastAPI app for Vercel
# Vercel's Python runtime should be able to handle FastAPI directly
application = app

# Also export as 'app' for compatibility
app_export = app

# Traditional WSGI-style handler
def application_handler(environ, start_response):
    """WSGI-compatible handler"""
    return app(environ, start_response)

__all__ = ['application', 'app_export', 'application_handler']