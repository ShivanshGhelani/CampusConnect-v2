import os
import warnings
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from config.database import Database
from core.logger import setup_logger
import logging

# Suppress warnings
warnings.filterwarnings("ignore", message=".*error reading bcrypt version.*")

# Set up logging
logger = setup_logger(logging.INFO)

# Check if running in serverless environment
IS_SERVERLESS = os.getenv("VERCEL") == "1" or os.getenv("AWS_LAMBDA_FUNCTION_NAME") is not None

# Create FastAPI app
app = FastAPI(
    title="Campus Connect API",
    version="1.0.0",
    description="Campus Connect Event Management System"
)

# CORS configuration
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://campusconnectldrp.vercel.app",
    "http://campusconnectldrp.vercel.app",
]

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
from app import router as api_router
from app.v1.storage import router as storage_router
from app.v1.registrations import router as registrations_router

app.include_router(registrations_router, prefix="/api/v1")
app.include_router(storage_router)
app.include_router(api_router)

@app.on_event("startup")
async def startup():
    """Startup event handler"""
    try:
        await Database.connect_db()
        logger.info("Database connected successfully")
        
        # Skip background tasks in serverless
        if not IS_SERVERLESS:
            from utils.dynamic_event_scheduler import start_dynamic_scheduler
            await start_dynamic_scheduler()
            logger.info("Scheduler started")
        else:
            logger.info("Running in serverless mode - skipping scheduler")
            
    except Exception as e:
        logger.error(f"Startup error: {e}")

@app.on_event("shutdown")
async def shutdown():
    """Shutdown event handler"""
    try:
        if not IS_SERVERLESS:
            from utils.dynamic_event_scheduler import stop_dynamic_scheduler
            await stop_dynamic_scheduler()
            logger.info("Scheduler stopped")
            
        await Database.close_db()
        logger.info("Database disconnected")
        
    except Exception as e:
        logger.error(f"Shutdown error: {e}")

@app.get("/")
async def root():
    return {"message": "Campus Connect API", "status": "running"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "environment": "serverless" if IS_SERVERLESS else "development"
    }

@app.get("/api/health")
async def api_health():
    return {"status": "API healthy"}

# Error handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if "/api/" in request.url.path:
        return JSONResponse(
            status_code=exc.status_code,
            content={"success": False, "message": exc.detail}
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail}
    )

# Vercel handler
from mangum import Mangum
handler = Mangum(app, lifespan="off")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))