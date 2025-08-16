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
from core.json_encoder import CustomJSONEncoder
from core.logger import setup_logger

# Suppress bcrypt version warning globally
warnings.filterwarnings("ignore", message=".*error reading bcrypt version.*")

# Set up application logging
logger = setup_logger(logging.INFO)

# Create FastAPI app
app = FastAPI()

# Configure CORS for frontend communication - FIXED FOR CREDENTIALS
import os

# CORS configuration - Allow specific origins when using credentials
print("Development mode: Allowing localhost origins for credentials support")

# Define allowed origins for development (cannot use "*" with credentials)
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",    # Frontend is using 127.0.0.1
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8080", 
    "http://127.0.0.1:8080",
]

print(f"CORS allowed origins: {ALLOWED_ORIGINS}")

# Add CORS middleware with specific origins (required for credentials)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # Specific origins (not "*") for credentials
    allow_credentials=True,         # This requires specific origins
    allow_methods=["*"],            # Allow all methods
    allow_headers=["*"],            # Allow all headers
)

# Configure JSON encoder for the entire application
json._default_encoder = CustomJSONEncoder()

# Add session middleware for student authentication - FIXING COOKIE ISSUE
print("Configuring session middleware with fixed cookie settings...")

# Try different session configuration - same_site="none" might be the issue
session_secret = os.getenv("SESSION_SECRET_KEY", "development-secret-key-for-cors-debugging")
print(f"Using session secret (first 10 chars): {session_secret[:10]}...")

app.add_middleware(
    SessionMiddleware, 
    secret_key=session_secret,
    max_age=3600,            # 1 hour
    same_site="lax",         # Changed from "none" - try "lax" for localhost
    https_only=False,        # Allow HTTP in development
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

# Include routes - Now all consolidated in API structure
from api import router as api_router
from api.legacy_direct_routes import router as legacy_direct_router
from api.v1.storage import router as storage_router
from api.v1.participations import router as participations_router

# Mount routes in correct order (most specific first)
app.include_router(participations_router, prefix="/api/v1")  # Participation routes at /api/v1/participations/...
app.include_router(storage_router) # Storage routes at /api/v1/storage/...
app.include_router(api_router)     # API routes at /api/... (includes all admin, auth, email, organizer functionality)
app.include_router(legacy_direct_router)  # Legacy direct routes at / (admin, organizer, etc.)

# Global variable to keep scheduler task alive
scheduler_task = None

@app.on_event("startup")
async def startup_db_client():
    global scheduler_task
    await Database.connect_db()
    
    # Initialize communication service (includes SMTP connection pool)
    from services.communication.email_service import communication_service
    logger.info("Communication service initialized for high-performance email delivery")
    
    # Initialize dynamic event scheduler with background task
    await start_dynamic_scheduler()
    print("Started Dynamic Event Scheduler - updates triggered by event timing")
    
    # Communication service is already initialized
    print("Communication Email Service - ready for email delivery")
    
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
    
    # Communication service cleanup happens automatically
    print("Communication service cleanup completed")
    
    await Database.close_db()
    print("Database connections closed")
    
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

# Debug endpoint to check session state
@app.get("/api/debug/session")
async def debug_session(request: Request):
    """Debug endpoint to check session state"""
    session_data = dict(request.session)
    return {
        "session_keys": list(session_data.keys()),
        "has_admin": "admin" in session_data,
        "has_student": "student" in session_data,
        "has_faculty": "faculty" in session_data,
        "cookies": dict(request.cookies),
        "headers": dict(request.headers)
    }

# Test endpoint to manually set session
@app.post("/api/debug/set-session")
async def set_test_session(request: Request):
    """Test endpoint to manually set session data"""
    from datetime import datetime
    
    request.session["test_key"] = "test_value"
    request.session["timestamp"] = datetime.utcnow().isoformat()
    
    return {
        "success": True,
        "message": "Test session data set",
        "session_keys": list(request.session.keys())
    }

# Test endpoint to read session
@app.get("/api/debug/get-session")
async def get_test_session(request: Request):
    """Test endpoint to read session data"""
    session_data = dict(request.session)
    return {
        "session_data": session_data,
        "cookies": dict(request.cookies)
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
    uvicorn.run(app, host="localhost", port=8000)