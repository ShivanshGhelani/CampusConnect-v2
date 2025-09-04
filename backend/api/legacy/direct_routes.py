"""
Legacy Direct Routes
Maps the old direct routes (without /api prefix) for backward compatibility
"""
from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import RedirectResponse
from dependencies.auth import require_admin
from models.admin_user import AdminUser, AdminRole
import os

router = APIRouter(tags=["legacy-direct-routes"])

# Get frontend URL from environment
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Admin routes (originally from routes/admin)
@router.get("/admin")
async def admin_root_no_slash(request: Request, admin: AdminUser = Depends(require_admin)):
    """Redirect root admin path to React frontend"""
    return RedirectResponse(url=f"{FRONTEND_URL}/admin", status_code=303)

@router.get("/admin/")
async def admin_root_with_slash(request: Request, admin: AdminUser = Depends(require_admin)):
    """Redirect root admin path to React frontend"""
    return RedirectResponse(url=f"{FRONTEND_URL}/admin", status_code=303)

# Organizer routes (originally from routes/organizer)
@router.get("/organizer")
async def organizer_root_no_slash(request: Request, admin: AdminUser = Depends(require_admin)):
    """Redirect root organizer path to React frontend"""
    # Only organizer admins can access this
    if admin.role != AdminRole.ORGANIZER_ADMIN:
        raise HTTPException(status_code=403, detail="Organizer access required")
    
    return RedirectResponse(url=f"{FRONTEND_URL}/organizer", status_code=303)

@router.get("/organizer/")
async def organizer_root_with_slash(request: Request, admin: AdminUser = Depends(require_admin)):
    """Redirect root organizer path to React frontend"""
    # Only organizer admins can access this
    if admin.role != AdminRole.ORGANIZER_ADMIN:
        raise HTTPException(status_code=403, detail="Organizer access required")
    
    return RedirectResponse(url=f"{FRONTEND_URL}/organizer", status_code=303)

@router.get("/organizer/dashboard")
async def organizer_dashboard(request: Request, admin: AdminUser = Depends(require_admin)):
    """Redirect to organizer dashboard"""
    # Only organizer admins can access this
    if admin.role != AdminRole.ORGANIZER_ADMIN:
        raise HTTPException(status_code=403, detail="Organizer access required")
    
    return RedirectResponse(url=f"{FRONTEND_URL}/organizer/dashboard", status_code=303)

@router.get("/organizer/events")
async def organizer_events(request: Request, admin: AdminUser = Depends(require_admin)):
    """Redirect to organizer events page"""
    # Only organizer admins can access this
    if admin.role != AdminRole.ORGANIZER_ADMIN:
        raise HTTPException(status_code=403, detail="Organizer access required")
    
    return RedirectResponse(url=f"{FRONTEND_URL}/organizer/events", status_code=303)
