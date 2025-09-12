"""
UNIFIED AUTH REDIRECTS - PHASE 3B CONSOLIDATION
===============================================
Consolidates all login/logout redirect endpoints into 2 unified endpoints:
1. GET /api/v1/auth/redirect/login - Handles all login redirects
2. GET /api/v1/auth/redirect/logout - Handles all logout redirects

REPLACES: 7 login redirect endpoints + 2 logout redirect endpoints = 9 endpoints → 2 endpoints (-7 reduction)
"""

import os
from fastapi import APIRouter, Request, Query
from fastapi.responses import RedirectResponse
import logging

router = APIRouter(prefix="/redirect", tags=["Auth Redirects"])
logger = logging.getLogger(__name__)

# Get frontend URL from environment
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

@router.get("/login")
async def unified_login_redirect(
    request: Request,
    type: str = Query("admin", description="Login type: admin, student, faculty, or general"),
    method: str = Query("GET", description="Original HTTP method: GET or POST"),
    source: str = Query("legacy", description="Source: legacy, admin, or direct")
):
    """
    UNIFIED login redirect endpoint
    
    Handles all login redirects based on type and source:
    - Admin logins: Redirect to frontend with admin tab
    - Student/Faculty logins: Redirect to appropriate frontend pages
    - Legacy requests: Redirect to proper API endpoints
    """
    try:
        # Handle different redirect scenarios
        if source == "direct" and type == "general":
            # Direct /login requests -> React frontend login page
            redirect_url = f"{FRONTEND_URL}/login"
            status_code = 301
            
        elif type == "admin":
            if method == "POST":
                # Admin POST requests -> Unified API endpoint (preserve POST)
                redirect_url = "/api/v1/auth/login"
                status_code = 307  # 307 preserves POST method
            else:
                # Admin GET requests -> Frontend with admin tab
                redirect_url = f"{FRONTEND_URL}/auth/login?tab=admin"
                status_code = 303
                
        elif type == "student":
            if method == "POST":
                redirect_url = "/api/v1/auth/login"
                status_code = 307
            else:
                redirect_url = f"{FRONTEND_URL}/auth/login?tab=student"
                status_code = 303
                
        elif type == "faculty":
            if method == "POST":
                redirect_url = "/api/v1/auth/login"
                status_code = 307
            else:
                redirect_url = f"{FRONTEND_URL}/auth/login?tab=faculty"
                status_code = 303
                
        else:
            # Default fallback
            redirect_url = f"{FRONTEND_URL}/login"
            status_code = 301

        logger.info(f"Login redirect: type={type}, method={method}, source={source} -> {redirect_url}")
        return RedirectResponse(url=redirect_url, status_code=status_code)
        
    except Exception as e:
        logger.error(f"Error in unified login redirect: {str(e)}")
        # Fallback to main login page
        return RedirectResponse(url=f"{FRONTEND_URL}/login", status_code=302)

@router.get("/logout")
async def unified_logout_redirect(
    request: Request,
    type: str = Query("admin", description="Logout type: admin, student, faculty"),
    return_to: str = Query(None, description="URL to redirect to after logout")
):
    """
    UNIFIED logout redirect endpoint
    
    Handles all logout redirects based on type:
    - Admin logout: Redirect to admin logout API
    - Student logout: Redirect to student logout API  
    - Faculty logout: Redirect to faculty logout API
    """
    try:
        # Route to appropriate logout API endpoint
        if type == "admin":
            redirect_url = "/api/v1/auth/logout"
        elif type == "student":
            redirect_url = "/api/v1/auth/logout"
        elif type == "faculty":
            redirect_url = "/api/v1/auth/logout"
        else:
            # Default to unified logout
            redirect_url = "/api/v1/auth/logout"
            
        logger.info(f"Logout redirect: type={type} -> {redirect_url}")
        return RedirectResponse(url=redirect_url, status_code=307)  # 307 preserves original method
        
    except Exception as e:
        logger.error(f"Error in unified logout redirect: {str(e)}")
        # Fallback to frontend home
        return RedirectResponse(url=f"{FRONTEND_URL}/", status_code=302)

@router.get("/info")
async def redirect_info():
    """
    Information endpoint about available redirects
    Useful for debugging and documentation
    """
    return {
        "success": True,
        "message": "Unified Auth Redirects - Phase 3B Consolidation",
        "endpoints": {
            "login": {
                "path": "/api/v1/auth/redirect/login",
                "parameters": {
                    "type": ["admin", "student", "faculty", "general"],
                    "method": ["GET", "POST"],
                    "source": ["legacy", "admin", "direct"]
                },
                "replaces": [
                    "/api/v1/auth/admin/login (POST)",
                    "/api/v1/auth/student/login (POST)",
                    "/api/v1/auth/faculty/login (POST)",
                    "/api/v1/auth/login (GET/POST)",
                    "/api/auth/login (GET/POST)", 
                    "/admin/login (GET/POST)",
                    "/login (GET)"
                ]
            },
            "logout": {
                "path": "/api/v1/auth/redirect/logout",
                "parameters": {
                    "type": ["admin", "student", "faculty"],
                    "return_to": "Optional return URL"
                },
                "replaces": [
                    "/api/v1/auth/admin/logout (GET)",
                    "/api/v1/auth/student/logout (GET)",
                    "/api/v1/auth/faculty/logout (GET)",
                    "/api/v1/auth/logout (GET)",
                    "/api/auth/logout (GET)"
                ]
            }
        },
        "consolidation": {
            "before": "9 redirect endpoints",
            "after": "2 unified endpoints", 
            "reduction": "7 endpoints eliminated"
        }
    }
