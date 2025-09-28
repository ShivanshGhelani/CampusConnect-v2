"""
Render-specific entry point with explicit route loading
This ensures all admin routes are properly loaded on Render
"""

import warnings
import json
import logging
import os
import sys
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse, Response, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

# Suppress bcrypt version warning globally
warnings.filterwarnings("ignore", message=".*error reading bcrypt version.*")

print("🚀 Starting CampusConnect API for Render...")
print(f"📍 Python version: {sys.version}")
print(f"📍 Environment: {os.getenv('ENVIRONMENT', 'unknown')}")
print(f"📍 Port: {os.getenv('PORT', 'unknown')}")

# Set up application logging
from core.logger import setup_logger
logger = setup_logger(logging.INFO)

# Create FastAPI app
app = FastAPI(
    title="CampusConnect API",
    description="Campus Event Management System",
    version="1.0.0"
)

# Add logging middleware
from middleware.logging_middleware import LoggingMiddleware
app.add_middleware(LoggingMiddleware)

# Configure CORS
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://campusconnectldrp.vercel.app",
    "http://campusconnectldrp.vercel.app",
]

# Add additional origins from environment variables
additional_origins = os.getenv("ADDITIONAL_CORS_ORIGINS", "")
if additional_origins:
    ALLOWED_ORIGINS.extend([origin.strip() for origin in additional_origins.split(",")])

# Manual CORS handler
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
    
    return response

# Add session middleware
session_secret = os.getenv("SESSION_SECRET_KEY", "development-secret-key-for-cors-debugging")
app.add_middleware(
    SessionMiddleware, 
    secret_key=session_secret,
    max_age=3600,
    same_site="none",
    https_only=True,
)

# Configure JSON encoder
from core.json_encoder import CustomJSONEncoder
json._default_encoder = CustomJSONEncoder()

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Configure templates
templates = Jinja2Templates(directory="templates")

# Explicitly load all routes with error handling
print("🔧 Loading API routes...")

try:
    # Load main routers
    from app import router as api_router
    from app.v1.storage import router as storage_router
    from app.v1.registrations import router as registrations_router
    
    # Mount routes in correct order
    app.include_router(registrations_router, prefix="/api/v1", tags=["registrations"])
    app.include_router(storage_router, tags=["storage"])
    app.include_router(api_router, tags=["api"])
    
    print(f"✅ Successfully loaded API router with {len(api_router.routes)} routes")
    
    # Verify admin routes are loaded
    admin_routes = [route for route in app.routes if hasattr(route, 'path') and '/admin' in route.path]
    print(f"✅ Admin routes loaded: {len(admin_routes)} routes")
    
    if admin_routes:
        print("📋 Sample admin routes:")
        for route in admin_routes[:5]:  # Show first 5
            methods = list(route.methods) if hasattr(route, 'methods') and route.methods else []
            print(f"   {route.path} [{', '.join(methods)}]")
    
except Exception as e:
    print(f"❌ CRITICAL ERROR loading routes: {e}")
    import traceback
    traceback.print_exc()
    
    # Don't fail completely - try to load minimal routes
    try:
        print("🔄 Loading fallback routes...")
        from app.v1.auth import router as auth_router
        app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth-fallback"])
        print("✅ Fallback auth routes loaded")
    except Exception as fallback_error:
        print(f"❌ Fallback loading also failed: {fallback_error}")

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if exc.status_code == 401:
        if "/api/" in request.url.path:
            return JSONResponse(
                status_code=401,
                content={"success": False, "message": "Authentication required", "detail": exc.detail}
            )
        else:
            from config.settings import get_settings
            settings = get_settings()
            return RedirectResponse(url=f"{settings.FRONTEND_URL}/login", status_code=302)
    
    # For other errors, return JSON for API endpoints
    if "/api/" in request.url.path:
        return JSONResponse(
            status_code=exc.status_code,
            content={"success": False, "message": str(exc.detail), "status_code": exc.status_code}
        )
    
    # For non-API endpoints, use template
    from datetime import datetime
    error_context = {
        "request": request,
        "status_code": exc.status_code,
        "detail": exc.detail,
        "current_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "request_path": request.url.path,
        "request_method": request.method,
        "user_friendly_message": "An error occurred while processing your request."
    }
    
    response = templates.TemplateResponse(
        "error.html",
        error_context,
        status_code=exc.status_code,
    )
    
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    
    return response

# Basic endpoints
@app.get("/")
async def root():
    """Root endpoint"""
    from config.settings import get_settings
    settings = get_settings()
    return RedirectResponse(url=settings.FRONTEND_URL, status_code=302)

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    from datetime import datetime
    
    # Count routes
    total_routes = len(app.routes)
    admin_routes = len([r for r in app.routes if hasattr(r, 'path') and '/admin' in r.path])
    
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": os.getenv("ENVIRONMENT", "unknown"),
        "render": os.getenv("RENDER", "not_set"),
        "port": os.getenv("PORT", "not_set"),
        "routes_loaded": {
            "total": total_routes,
            "admin": admin_routes
        }
    }

@app.get("/api/debug/routes")
async def debug_routes():
    """Debug endpoint - list all routes"""
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
        "admin_routes": sorted(admin_routes, key=lambda x: x['path'])[:50],
        "server_info": {
            "python_version": sys.version,
            "environment": os.getenv("ENVIRONMENT", "unknown"),
            "render": os.getenv("RENDER", "not_set"),
            "port": os.getenv("PORT", "not_set")
        }
    }

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Startup event"""
    print("🚀 CampusConnect API startup...")
    
    # Connect to database
    from config.database import Database
    await Database.connect_db()
    print("✅ Database connected")
    
    # Start scheduler if not serverless
    is_serverless = os.getenv("VERCEL") == "1" or os.getenv("AWS_LAMBDA_FUNCTION_NAME") is not None
    if not is_serverless:
        try:
            from utils.dynamic_event_scheduler import start_dynamic_scheduler
            await start_dynamic_scheduler()
            print("✅ Event scheduler started")
        except Exception as e:
            print(f"⚠️ Scheduler failed to start: {e}")
    else:
        print("ℹ️ Serverless mode - scheduler disabled")
    
    print("🎉 Startup complete!")

@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event"""
    print("🛑 Shutting down...")
    
    # Stop scheduler
    is_serverless = os.getenv("VERCEL") == "1" or os.getenv("AWS_LAMBDA_FUNCTION_NAME") is not None
    if not is_serverless:
        try:
            from utils.dynamic_event_scheduler import stop_dynamic_scheduler
            await stop_dynamic_scheduler()
            print("✅ Scheduler stopped")
        except Exception as e:
            print(f"⚠️ Error stopping scheduler: {e}")
    
    # Close database
    from config.database import Database
    await Database.close_db()
    print("✅ Database disconnected")
    
    print("👋 Shutdown complete")

# Export app
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)