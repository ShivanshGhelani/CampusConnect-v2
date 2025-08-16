"""
Organizer Portal API Routes
Faculty members access organizer functionality through these routes
"""
from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import RedirectResponse
from dependencies.auth import require_admin
from models.admin_user import AdminUser, AdminRole

router = APIRouter(prefix="/organizer-portal", tags=["organizer-portal-api"])

@router.get("")
async def organizer_root_no_slash(request: Request, admin: AdminUser = Depends(require_admin)):
    """Redirect root organizer path to React frontend"""
    # Only organizer admins can access this
    if admin.role != AdminRole.ORGANIZER_ADMIN:
        raise HTTPException(status_code=403, detail="Organizer access required")
    
    return RedirectResponse(url="http://localhost:3000/organizer", status_code=303)

@router.get("/")
async def organizer_root_with_slash(request: Request, admin: AdminUser = Depends(require_admin)):
    """Redirect root organizer path to React frontend"""
    # Only organizer admins can access this
    if admin.role != AdminRole.ORGANIZER_ADMIN:
        raise HTTPException(status_code=403, detail="Organizer access required")
    
    return RedirectResponse(url="http://localhost:3000/organizer", status_code=303)

@router.get("/dashboard")
async def organizer_dashboard(request: Request, admin: AdminUser = Depends(require_admin)):
    """Redirect to organizer dashboard"""
    # Only organizer admins can access this
    if admin.role != AdminRole.ORGANIZER_ADMIN:
        raise HTTPException(status_code=403, detail="Organizer access required")
    
    return RedirectResponse(url="http://localhost:3000/organizer/dashboard", status_code=303)

@router.get("/events")
async def organizer_events(request: Request, admin: AdminUser = Depends(require_admin)):
    """Redirect to organizer events page"""
    # Only organizer admins can access this
    if admin.role != AdminRole.ORGANIZER_ADMIN:
        raise HTTPException(status_code=403, detail="Organizer access required")
    
    return RedirectResponse(url="http://localhost:3000/organizer/events", status_code=303)
