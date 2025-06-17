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
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React development server (if using Create React App)
        "http://localhost:5173",  # Vite development server
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://localhost:8080",  # Alternative development ports
        "http://127.0.0.1:8080",
        "https://192.168.29.221:5173",  # Local network access
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# Configure JSON encoder for the entire application
json._default_encoder = CustomJSONEncoder()

# Add session middleware for student authentication
app.add_middleware(SessionMiddleware, secret_key="your-secret-key-change-in-production", max_age=3600)

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
        # Check if this is a student-related route
        elif request.url.path.startswith("/client/"):
            # For student routes, redirect to student login with return URL
            return RedirectResponse(
                url=f"/client/login?redirect={request.url.path}",
                status_code=302
            )
        else:
            # For admin routes, redirect to admin login
            return RedirectResponse(url="/auth/login", status_code=302)
    
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
        if "/client/" in request.url.path:
            error_context["user_friendly_message"] = "The page or event you're looking for doesn't exist."
        else:
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
from routes.client import router as client_router
from routes.auth import router as auth_router
from api import router as api_router

# Mount routes in correct order (most specific first)
app.include_router(api_router)     # API routes at /api/...
app.include_router(admin_router)   # Admin routes including /admin/...
app.include_router(auth_router)    # Auth routes at /auth/...
app.include_router(client_router)  # Client routes at /client/...

# Global variable to keep scheduler task alive
scheduler_task = None

@app.on_event("startup")
async def startup_db_client():
    global scheduler_task
    await Database.connect_db()
    
    # Initialize SMTP connection pool
    from utils.smtp_pool import smtp_pool
    logger.info("SMTP Connection Pool initialized for high-performance email delivery")
    
    # Initialize dynamic event scheduler with background task
    await start_dynamic_scheduler()
    print("Started Dynamic Event Scheduler - updates triggered by event timing")
    
    # Start certificate email queue
    from utils.email_queue import certificate_email_queue
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
    from utils.email_queue import certificate_email_queue
    await certificate_email_queue.stop()
    print("Stopped Certificate Email Queue")
    
    # Shutdown SMTP connection pool
    from utils.smtp_pool import smtp_pool
    smtp_pool.shutdown()
    print("Stopped SMTP Connection Pool")
    
    await Database.close_db()

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    """Render the homepage with upcoming and ongoing events"""
    try:
        # Get template context including student authentication status
        from utils.template_context import get_template_context
        from utils.event_status_manager import EventStatusManager
        from datetime import datetime
          # Get events and update their status
        upcoming_events = await EventStatusManager.get_available_events("upcoming")
        ongoing_events = await EventStatusManager.get_available_events("ongoing")
        
        # Sort by relevant dates and limit to 3 events each for homepage
        current_date = datetime.now()
        upcoming_events.sort(key=lambda x: x.get('start_datetime', current_date))
        ongoing_events.sort(key=lambda x: x.get('end_datetime', current_date))
        
        # Limit to maximum 3 events per section for homepage
        upcoming_events = upcoming_events[:3]
        ongoing_events = ongoing_events[:3]
        
        template_context = await get_template_context(request)
        
        return templates.TemplateResponse("client/index.html", {
            "request": request,
            "upcoming_events": upcoming_events,
            "ongoing_events": ongoing_events,
            "current_datetime": datetime.now(),
            **template_context
        })
    except Exception as e:
        print(f"Error in homepage: {str(e)}")
        # Fallback with empty events if there's an error
        from utils.template_context import get_template_context
        from datetime import datetime
        template_context = await get_template_context(request)
        
        return templates.TemplateResponse("client/index.html", {
            "request": request,
            "upcoming_events": [],
            "ongoing_events": [],
            "current_datetime": datetime.now(),
            **template_context
        })

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
    """Redirect /login to student login page"""
    return RedirectResponse(url="/client/login", status_code=301)

@app.get("/event-categories")
async def event_categories():
    """Redirect event categories to events page"""
    return RedirectResponse(url="/client/events", status_code=301)

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