import warnings
import json
import logging
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

from config.database import Database
from utils.dynamic_event_scheduler import start_dynamic_scheduler, stop_dynamic_scheduler
from core.json_encoder import CustomJSONEncoder
from core.logger import setup_logger
from middleware.logging_middleware import LoggingMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

# Suppress bcrypt version warning globally
warnings.filterwarnings("ignore", message=".*error reading bcrypt version.*")

# Set up application logging
logger = setup_logger(logging.INFO)

# Create FastAPI app
app = FastAPI()
app.add_middleware(LoggingMiddleware)  # Add logging middleware

instrumentator = Instrumentator().instrument(app)
instrumentator.expose(app, endpoint="/metrics")

# Configure CORS for frontend communication - UPDATED FOR DEPLOYMENT
import os
from config.settings import get_settings

# Get settings
settings = get_settings()

# CORS configuration - Allow multiple origins for different deployment scenarios
ALLOWED_ORIGINS = [
    # Local development
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    
    # Production deployments
    "https://campusconnectldrp.vercel.app",
    "http://campusconnectldrp.vercel.app",
]

# Get additional origins from environment variables
additional_origins = os.getenv("ADDITIONAL_CORS_ORIGINS", "")
if additional_origins:
    ALLOWED_ORIGINS.extend([origin.strip() for origin in additional_origins.split(",")])

# Use frontend URL from settings
FRONTEND_URL = settings.FRONTEND_URL

# Manual CORS handler (replacing CORS middleware to avoid conflicts)
@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    origin = request.headers.get("origin")
    
    # Handle preflight requests
    if request.method == "OPTIONS":
        if origin in ALLOWED_ORIGINS:
            response = Response()
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "accept, accept-encoding, authorization, content-type, dnt, origin, user-agent, x-csrftoken, x-requested-with, ngrok-skip-browser-warning"
            response.headers["Access-Control-Max-Age"] = "86400"
            return response
    
    # Process actual request
    response = await call_next(request)
    
    # Add CORS headers for allowed origins
    if origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "accept, accept-encoding, authorization, content-type, dnt, origin, user-agent, x-csrftoken, x-requested-with, ngrok-skip-browser-warning"
    
    # Force override any existing CORS headers that might be wildcards
    if 'access-control-allow-origin' in response.headers:
        if response.headers['access-control-allow-origin'] == '*' and origin in ALLOWED_ORIGINS:
            response.headers["Access-Control-Allow-Origin"] = origin
    
    return response

# Configure JSON encoder for the entire application
json._default_encoder = CustomJSONEncoder()

# Add session middleware for student authentication
session_secret = os.getenv("SESSION_SECRET_KEY", "development-secret-key-for-cors-debugging")

app.add_middleware(
    SessionMiddleware, 
    secret_key=session_secret,
    max_age=3600,            # 1 hour
    same_site="none",        # Required for cross-origin requests (Vercel -> ngrok)
    https_only=True,         # Required for same_site="none" and ngrok uses HTTPS
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
            # Use frontend URL from settings
            return RedirectResponse(url=f"{FRONTEND_URL}/login", status_code=302)
    
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

# Include routes - Now all consolidated in APP structure with robust error handling
print("🔧 Starting route loading process...")

try:
    # Primary route loading
    print("📦 Loading primary routers...")
    from app import router as api_router
    from app.v1.storage import router as storage_router
    from app.v1.registrations import router as registrations_router
    
    print(f"✅ Primary routers loaded - API: {len(api_router.routes)}, Storage: {len(storage_router.routes)}, Registrations: {len(registrations_router.routes)}")
    
    # Mount routes in correct order (most specific first)
    app.include_router(registrations_router, prefix="/api/v1")  # Registration routes at /api/v1/registrations/...
    app.include_router(storage_router) # Storage routes at /api/v1/storage/...
    app.include_router(api_router)     # API routes at /api/... (includes all admin, auth, email, organizer functionality)
    
    # Verify admin routes are loaded
    admin_routes = [route for route in app.routes if hasattr(route, 'path') and '/admin' in route.path]
    print(f"✅ Successfully loaded {len(api_router.routes)} API routes with {len(admin_routes)} admin routes")
    
    # If we have very few admin routes, try to load them directly
    if len(admin_routes) < 10:
        print(f"⚠️ Only {len(admin_routes)} admin routes found - attempting direct admin router loading...")
        
        try:
            # Try to load admin router directly
            from app.v1.admin import router as admin_router
            print(f"📂 Direct admin router has {len(admin_router.routes)} routes")
            
            # If the admin router exists but wasn't included properly, include it directly
            if len(admin_router.routes) > len(admin_routes):
                print("🔄 Admin router not properly included - adding directly...")
                app.include_router(admin_router, prefix="/api/v1/admin", tags=["admin-direct"])
                
                # Recount admin routes
                admin_routes = [route for route in app.routes if hasattr(route, 'path') and '/admin' in route.path]
                print(f"✅ After direct inclusion: {len(admin_routes)} admin routes")
            
        except Exception as admin_error:
            print(f"❌ Failed to load admin router directly: {admin_error}")
            
            # Try to load individual admin modules
            print("🔄 Attempting to load individual admin modules...")
            
            admin_modules = [
                ("events", "/api/v1/admin/events"),
                ("users", "/api/v1/admin/users"), 
                ("venues", "/api/v1/admin/venues"),
                ("assets", "/api/v1/admin/assets"),
                ("certificate_templates", "/api/v1/admin/certificate-templates")
            ]
            
            for module_name, prefix in admin_modules:
                try:
                    if module_name == "events":
                        from app.v1.admin.events import router as module_router
                    elif module_name == "users":
                        from app.v1.admin.users import router as module_router
                    elif module_name == "venues":
                        from app.v1.admin.venues import router as module_router
                    elif module_name == "assets":
                        from app.v1.admin.assets import router as module_router
                    elif module_name == "certificate_templates":
                        from app.v1.admin.certificate_templates import router as module_router
                    
                    app.include_router(module_router, prefix=prefix, tags=[f"admin-{module_name}"])
                    print(f"✅ Loaded {module_name} admin module with {len(module_router.routes)} routes")
                    
                except Exception as module_error:
                    print(f"❌ Failed to load {module_name} admin module: {module_error}")
    
except Exception as e:
    print(f"❌ CRITICAL ERROR loading routes: {e}")
    import traceback
    traceback.print_exc()
    
    # Emergency fallback: Load absolutely minimal routes
    print("🚨 EMERGENCY FALLBACK: Loading minimal routes...")
    try:
        from app.v1.auth import router as auth_router
        app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth-emergency"])
        print("✅ Emergency auth routes loaded")
        
        # Try to add a simple admin endpoint
        @app.get("/api/v1/admin/emergency-test")
        async def emergency_admin_test():
            return {"message": "Emergency admin endpoint active", "status": "minimal"}
        
        print("✅ Emergency admin test endpoint added")
        
    except Exception as emergency_error:
        print(f"❌ Even emergency fallback failed: {emergency_error}")
        raise

# Final route count
total_routes = len(app.routes)
admin_routes = [route for route in app.routes if hasattr(route, 'path') and '/admin' in route.path]
print(f"🎯 FINAL ROUTE COUNT: {total_routes} total routes, {len(admin_routes)} admin routes")

# List first few admin routes for verification
if admin_routes:
    print("📋 First 5 admin routes:")
    for i, route in enumerate(admin_routes[:5]):
        methods = list(route.methods) if hasattr(route, 'methods') and route.methods else []
        print(f"   {i+1}. {route.path} [{', '.join(methods)}]")
else:
    print("❌ NO ADMIN ROUTES FOUND!")

# Global variable to keep scheduler task alive
scheduler_task = None

@app.on_event("startup")
async def startup_db_client():
    # Serverless-friendly startup
    import os
    is_serverless = os.getenv("VERCEL") == "1" or os.getenv("AWS_LAMBDA_FUNCTION_NAME") is not None
    
    global scheduler_task
    await Database.connect_db()
    
    # Skip background tasks in serverless environment
    if not is_serverless:
        # Communication service will be initialized automatically when first accessed (singleton)
        # No need to explicitly initialize it here
        logger.info("Communication service ready for high-performance email delivery")
        
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
    else:
        print("Running in serverless mode - background tasks disabled")

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
    import os
    is_serverless = os.getenv("VERCEL") == "1" or os.getenv("AWS_LAMBDA_FUNCTION_NAME") is not None
    
    global scheduler_task
    
    if not is_serverless:
        if scheduler_task:
            scheduler_task.cancel()
        await stop_dynamic_scheduler()
        
        # Communication service cleanup happens automatically
        print("Communication service cleanup completed")
    
    await Database.close_db()
    print("Database connections closed")

# Health check endpoint for debugging API connectivity
@app.get("/api/health")
@app.head("/api/health")
async def health_check(request: Request):
    """Simple health check endpoint to test API connectivity - supports both GET and HEAD"""
    from datetime import datetime
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "host": request.headers.get("host"),
        "origin": request.headers.get("origin"),
        "user_agent": request.headers.get("user-agent"),
        "cors_configured": True
    }

# Debug endpoints for troubleshooting Render deployment
@app.get("/api/debug/routes")
async def debug_routes():
    """Debug endpoint to list all registered routes"""
    import sys
    routes_info = []
    
    for route in app.routes:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            routes_info.append({
                "path": route.path,
                "methods": list(route.methods) if route.methods else [],
                "name": getattr(route, 'name', 'unnamed')
            })
    
    admin_routes = [r for r in routes_info if '/admin' in r['path']]
    
    return {
        "total_routes": len(routes_info),
        "admin_routes_count": len(admin_routes),
        "admin_routes": admin_routes[:20],  # First 20 admin routes
        "sample_routes": routes_info[:10],  # First 10 routes overall
        "server_info": {
            "python_version": sys.version,
            "environment": os.getenv("ENVIRONMENT", "unknown"),
            "render": os.getenv("RENDER", "not_set"),
            "port": os.getenv("PORT", "not_set")
        }
    }

@app.get("/api/debug/admin-test")
async def debug_admin_test():
    """Simple admin endpoint test - no auth required"""
    from datetime import datetime
    return {
        "success": True,
        "message": "Admin endpoint is reachable",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/debug/verify-deployment")
async def verify_deployment():
    """Comprehensive deployment verification"""
    import sys
    from pathlib import Path
    
    verification_results = {
        "python_version": sys.version,
        "current_directory": str(Path.cwd()),
        "environment": {
            "ENVIRONMENT": os.getenv("ENVIRONMENT", "not_set"),
            "RENDER": os.getenv("RENDER", "not_set"), 
            "PORT": os.getenv("PORT", "not_set")
        }
    }
    
    # Check file structure
    required_files = [
        "app/__init__.py",
        "app/v1/__init__.py",
        "app/v1/admin/__init__.py", 
        "app/v1/admin/events/__init__.py"
    ]
    
    file_check = {}
    for file_path in required_files:
        file_check[file_path] = Path(file_path).exists()
    
    verification_results["file_structure"] = file_check
    
    # Check imports
    import_check = {}
    modules_to_check = [
        "app",
        "app.v1", 
        "app.v1.admin",
        "app.v1.admin.events",
        "app.v1.admin.users"
    ]
    
    for module in modules_to_check:
        try:
            __import__(module)
            import_check[module] = "SUCCESS"
        except Exception as e:
            import_check[module] = f"ERROR: {str(e)}"
    
    verification_results["import_check"] = import_check
    
    # Route count
    total_routes = len(app.routes)
    admin_routes = len([r for r in app.routes if hasattr(r, 'path') and '/admin' in r.path])
    
    verification_results["route_counts"] = {
        "total": total_routes,
        "admin": admin_routes,
        "expected_admin_minimum": 20
    }
    
    # Overall status
    files_ok = all(file_check.values())
    imports_ok = all("SUCCESS" in status for status in import_check.values())
    routes_ok = admin_routes >= 10
    
    verification_results["overall_status"] = {
        "files_ok": files_ok,
        "imports_ok": imports_ok, 
        "routes_ok": routes_ok,
        "deployment_healthy": files_ok and imports_ok and routes_ok
    }
    
    return verification_results

@app.get("/api/debug/imports")
async def debug_imports():
    """Check if admin router imports are working"""
    try:
        from app.v1.admin import router as admin_router
        admin_route_count = len(admin_router.routes) if hasattr(admin_router, 'routes') else 0
        
        # Test individual admin router imports
        import_status = {}
        
        try:
            from app.v1.admin.events import router as events_router
            import_status['events'] = len(events_router.routes) if hasattr(events_router, 'routes') else 0
        except Exception as e:
            import_status['events'] = f"Import error: {str(e)}"
            
        try:
            from app.v1.admin.users import router as users_router  
            import_status['users'] = len(users_router.routes) if hasattr(users_router, 'routes') else 0
        except Exception as e:
            import_status['users'] = f"Import error: {str(e)}"
            
        try:
            from app.v1.admin.venues import router as venues_router
            import_status['venues'] = len(venues_router.routes) if hasattr(venues_router, 'routes') else 0
        except Exception as e:
            import_status['venues'] = f"Import error: {str(e)}"
            
        return {
            "success": True,
            "admin_router_routes": admin_route_count,
            "individual_routers": import_status,
            "environment": {
                "ENVIRONMENT": os.getenv("ENVIRONMENT", "not_set"),
                "RENDER": os.getenv("RENDER", "not_set"),
                "VERCEL": os.getenv("VERCEL", "not_set")
            }
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "environment": {
                "ENVIRONMENT": os.getenv("ENVIRONMENT", "not_set"),
                "RENDER": os.getenv("RENDER", "not_set"),
                "VERCEL": os.getenv("VERCEL", "not_set")
            }
        }

# Even simpler health check for monitoring services
@app.get("/ping")
@app.head("/ping")
async def ping():
    """Ultra-simple ping endpoint for monitoring services"""
    return {"status": "ok"}

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    """Redirect root to React frontend"""
    return RedirectResponse(url=FRONTEND_URL, status_code=302)

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

# Unified login redirects - PHASE 3B CONSOLIDATION
@app.get("/event-categories")
async def event_categories():
    """Redirect event categories to React frontend"""
    return RedirectResponse(url=f"{FRONTEND_URL}/events", status_code=301)

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