import warnings
import json
import logging
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from config.database import Database
from utils.dynamic_event_scheduler import start_dynamic_scheduler, stop_dynamic_scheduler
from utils.json_encoder import CustomJSONEncoder
from utils.logger import setup_logger

# Suppress bcrypt version warning globally
warnings.filterwarnings("ignore", message=".*error reading bcrypt version.*")

# Set up application logging
logger = setup_logger(logging.INFO)

# Create FastAPI app
app = FastAPI()

# Configure CORS for frontend communication
import os
import re

# Environment-aware configuration
def get_environment():
    """Get current environment (development/production)"""
    return os.getenv("ENVIRONMENT", "development").lower()

def is_production():
    """Check if running in production"""
    return get_environment() == "production"

def get_cors_origins():
    """Get CORS origins based on environment"""
    if is_production():
        # Production: Use environment variable for allowed origins
        cors_origins = os.getenv("CORS_ORIGINS", "")
        if cors_origins:
            return [origin.strip() for origin in cors_origins.split(",") if origin.strip()]
        else:
            # Fallback: Add your production domains here when ready
            return [
                # "https://yourapp.vercel.app",  # Your frontend domain
                # "https://your-custom-domain.com",  # Custom domain if any
            ]
    else:
        # Development: Include local and testing origins
        dev_origins = [
            "http://localhost:3000",  # React development server
            "http://localhost:5173",  # Vite development server
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
            "http://localhost:8080",  # Alternative development ports
            "http://127.0.0.1:8080",
            "https://jaguar-giving-awfully.ngrok-free.app",
            "http://192.168.29.221:5173", 
        ]
        
        # Add any additional development origins from environment
        additional_origins = os.environ.get("ADDITIONAL_CORS_ORIGINS", "").split(",")
        dev_origins.extend([origin.strip() for origin in additional_origins if origin.strip()])
        
        return dev_origins

# Custom CORS middleware to handle dynamic origins (for development)
class DynamicCORSMiddleware:
    def __init__(self, app, allowed_origins=None, **kwargs):
        self.app = app
        self.allowed_origins = allowed_origins or []
        self.kwargs = kwargs
        
    def is_origin_allowed(self, origin):
        if not origin:
            return False
            
        # Check exact matches
        if origin in self.allowed_origins:
            return True
            
        # For development only: Check for ngrok and local network patterns
        if not is_production():
            # Check for ngrok patterns
            if re.match(r'https://.*\.ngrok-free\.app$', origin):
                return True
            if re.match(r'https://.*\.ngrok\.io$', origin):
                return True
                
            # Check for local network access patterns (192.168.x.x, 10.x.x.x, etc.)
            if re.match(r'https?://(?:192\.168\.|10\.|172\.(?:1[6-9]|2[0-9]|3[01])\.|127\.0\.0\.1|localhost).*', origin):
                return True
            
        return False

# Get allowed origins based on environment
ALLOWED_ORIGINS = get_cors_origins()

# Log configuration for debugging
print(f"Environment: {get_environment()}")
print(f"CORS Origins: {ALLOWED_ORIGINS}")
if is_production():
    print("Production mode: Strict CORS policy")
else:
    print("Development mode: Flexible CORS policy for testing")

# Use custom CORS check for development
cors_middleware = DynamicCORSMiddleware(app, ALLOWED_ORIGINS)

# Configure CORS middleware based on environment
if is_production():
    # Production: Strict CORS policy
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,  # Only specified origins
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["*"],
    )
else:
    # Development: Flexible CORS policy for testing with --host and ngrok
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"https://.*\.ngrok-free\.app|https://.*\.ngrok\.io|https?://(?:192\.168\.|10\.|172\.(?:1[6-9]|2[0-9]|3[01])\.|127\.0\.0\.1|localhost).*",
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["*"],
    )

# Configure JSON encoder for the entire application
json._default_encoder = CustomJSONEncoder()

# Add session middleware for student authentication
# Configure session settings based on environment
def get_session_config():
    """Get session configuration based on environment"""
    if is_production():
        return {
            "secret_key": os.getenv("SESSION_SECRET_KEY", "CHANGE-THIS-IN-PRODUCTION"),
            "max_age": 3600,
            "same_site": "none",  # For cross-site cookies in production
            "https_only": True,   # HTTPS required in production
            "domain": os.getenv("COOKIE_DOMAIN"),  # e.g., ".yourdomain.com"
        }
    else:
        # Development: Check if external access is needed
        external_access = os.getenv("ENABLE_EXTERNAL_ACCESS", "false").lower() == "true"
        
        if external_access:
            # For --host or ngrok usage
            return {
                "secret_key": os.getenv("SESSION_SECRET_KEY", "development-secret-key"),
                "max_age": 3600,
                "same_site": "none",  # Required for external access
                "https_only": False,  # HTTP allowed in development
            }
        else:
            # For localhost development (default)
            return {
                "secret_key": os.getenv("SESSION_SECRET_KEY", "development-secret-key"),
                "max_age": 3600,
                "same_site": "lax",   # Secure for localhost
                "https_only": False,  # HTTP allowed in development
            }

session_config = get_session_config()
print(f"Session config: HTTPS={session_config['https_only']}, SameSite={session_config['same_site']}")

app.add_middleware(
    SessionMiddleware, 
    **session_config
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Configure templates
templates = Jinja2Templates(directory="templates")

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if exc.status_code == 401:
        # Check if this is an API request
        if "/api/" in request.url.path:
            # For API endpoints, return JSON error response
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=401,
                content={"success": False, "message": "Authentication required", "detail": exc.detail}
            )
        else:
            # For any other protected routes, redirect to React frontend login
            return RedirectResponse(url="http://localhost:3000/login", status_code=302)
    
    # Prepare enhanced error context
    from datetime import datetime
    error_context = {
        "request": request,
        "status_code": exc.status_code,
        "detail": exc.detail,
        "current_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "request_path": request.url.path,
        "request_method": request.method
    }
    
    # Add specific error messages based on status code
    if exc.status_code == 404:
        error_context["user_friendly_message"] = "The requested resource was not found."
    elif exc.status_code == 403:
        error_context["user_friendly_message"] = "You don't have permission to access this resource."
    elif exc.status_code >= 500:
        error_context["user_friendly_message"] = "We're experiencing technical difficulties. Please try again later."
    elif exc.status_code >= 400 and exc.status_code < 500:
        error_context["user_friendly_message"] = "There was an issue with your request. Please check and try again."
    
    response = templates.TemplateResponse(
        "error.html",
        error_context,
        status_code=exc.status_code,
    )
    
    # Add cache control headers to prevent error page caching
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    
    return response

@app.exception_handler(500)
async def internal_server_error_handler(request: Request, exc):
    """Handle 500 Internal Server Errors"""
    from datetime import datetime
    logger.error(f"Internal Server Error: {str(exc)} on {request.url.path}")
    
    error_context = {
        "request": request,
        "status_code": 500,
        "detail": "Internal server error occurred",
        "current_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "request_path": request.url.path,
        "request_method": request.method,
        "user_friendly_message": "We're experiencing technical difficulties. Our team has been notified."
    }
    
    response = templates.TemplateResponse(
        "error.html",
        error_context,
        status_code=500,
    )
    
    # Add cache control headers
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    
    return response

# Include routes
from routes.admin import router as admin_router
from routes.auth import router as auth_router
from api import router as api_router

# Mount routes in correct order (most specific first)
app.include_router(api_router)     # API routes at /api/...
app.include_router(admin_router)   # Admin routes including /admin/...
app.include_router(auth_router)    # Auth routes at /auth/...

# Global variable to keep scheduler task alive
scheduler_task = None

@app.on_event("startup")
async def startup_db_client():
    global scheduler_task
    await Database.connect_db()
    
    # Initialize SMTP connection pool
    from services.email.smtp_pool import smtp_pool
    logger.info("SMTP Connection Pool initialized for high-performance email delivery")
    
    # Initialize dynamic event scheduler with background task
    await start_dynamic_scheduler()
    print("Started Dynamic Event Scheduler - updates triggered by event timing")
    
    # Start certificate email queue
    from services.email.queue import certificate_email_queue
    await certificate_email_queue.start()
    print("Started Certificate Email Queue - background processing for email delivery")
    
    # Create a background task to keep scheduler alive
    import asyncio
    from utils.dynamic_event_scheduler import dynamic_scheduler
    scheduler_task = asyncio.create_task(keep_scheduler_alive())
      # Verify scheduler is running
    from utils.dynamic_event_scheduler import get_scheduler_status
    status = await get_scheduler_status()
    print(f"Scheduler status: {status['running']}, Queue size: {status['triggers_queued']}")

async def keep_scheduler_alive():
    """Background task to monitor and restart scheduler if needed"""
    import asyncio
    from utils.dynamic_event_scheduler import dynamic_scheduler, get_scheduler_status
    
    while True:
        try:
            status = await get_scheduler_status()
            if not status['running']:
                print("Scheduler stopped unexpectedly - restarting...")
                await dynamic_scheduler.start()
                print("Scheduler restarted successfully")
            
            # Check every 5 minutes
            await asyncio.sleep(300)
        except Exception as e:
            print(f"Error in scheduler monitor: {e}")
            await asyncio.sleep(60)

@app.on_event("shutdown")
async def shutdown_db_client():
    global scheduler_task
    if scheduler_task:
        scheduler_task.cancel()
    await stop_dynamic_scheduler()
    
    # Stop certificate email queue
    from services.email.queue import certificate_email_queue
    await certificate_email_queue.stop()
    print("Stopped Certificate Email Queue")
    
    # Shutdown SMTP connection pool
    from services.email.smtp_pool import smtp_pool
    smtp_pool.shutdown()
    print("Stopped SMTP Connection Pool")
    
    await Database.close_db()

# Health check endpoint for debugging API connectivity
@app.get("/api/health")
async def health_check(request: Request):
    """Simple health check endpoint to test API connectivity"""
    from datetime import datetime
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "host": request.headers.get("host"),
        "origin": request.headers.get("origin"),
        "user_agent": request.headers.get("user-agent"),
        "cors_configured": True
    }

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    """Redirect root to React frontend"""
    return RedirectResponse(url="http://localhost:3000", status_code=302)

@app.get("/favicon.ico")
async def favicon():
    """Serve the favicon"""
    from fastapi.responses import FileResponse
    import os
    favicon_path = os.path.join("static", "favicon.ico")
    if os.path.exists(favicon_path):
        return FileResponse(favicon_path, media_type="image/x-icon")
    else:
        # Fallback to 204 if file doesn't exist
        from fastapi.responses import Response
        return Response(status_code=204)

# Add missing routes
@app.get("/admin/login")
async def admin_login_redirect():
    """Redirect old admin login URL to new auth login URL"""
    return RedirectResponse(url="/auth/login", status_code=301)

@app.post("/admin/login")
async def admin_login_post_redirect():
    """Redirect old admin login POST URL to new auth login URL"""
    return RedirectResponse(url="/auth/login", status_code=307)  # 307 preserves POST method

@app.get("/login")
async def login_redirect():
    """Redirect /login to React frontend"""
    return RedirectResponse(url="http://localhost:3000/login", status_code=301)

@app.get("/event-categories")
async def event_categories():
    """Redirect event categories to React frontend"""
    return RedirectResponse(url="http://localhost:3000/events", status_code=301)

@app.get("/health/scheduler")
async def scheduler_health():
    """Check the health of the dynamic event scheduler"""
    from utils.dynamic_event_scheduler import get_scheduler_status
    status = await get_scheduler_status()
    return status

# Mount special routes for certificate assets with shortened paths
@app.get("/logo/{filename:path}")
async def serve_logo(filename: str):
    """Serve logo files from the uploads/assets/logo directory"""
    return RedirectResponse(url=f"/static/uploads/assets/logo/{filename}")

@app.get("/signature/{path:path}")
async def serve_signature(path: str):
    """Serve signature files from the uploads/assets/signature directory"""
    return RedirectResponse(url=f"/static/uploads/assets/signature/{path}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)