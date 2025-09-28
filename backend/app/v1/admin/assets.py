"""
Admin Assets API Routes
Handles comprehensive asset management with database storage, WebP optimization, and secure URLs
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Request
from fastapi.responses import JSONResponse, RedirectResponse, StreamingResponse
from models.admin_user import AdminUser
from dependencies.auth import require_admin
from services.asset_service import AssetService
from services.secure_url_service import SecureURLService
from services.supabase_storage_service import SupabaseStorageService
import logging
import aiohttp
import io
from typing import Optional, List
from pathlib import Path

logger = logging.getLogger(__name__)

router = APIRouter()

# Allowed file extensions
ALLOWED_EXTENSIONS = {
    # Images
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.tiff', '.ico',
    # Documents  
    '.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt',
    # Spreadsheets
    '.xls', '.xlsx', '.csv', '.ods',
    # Presentations
    '.ppt', '.pptx', '.odp',
    # Archives
    '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2',
    # Media
    '.mp4', '.avi', '.mov', '.wmv', '.flv', '.mp3', '.wav', '.ogg', '.webm'
}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

@router.get("/")
async def get_assets_data(
    asset_type: Optional[str] = None,
    limit: int = 100,
    skip: int = 0,
    admin: AdminUser = Depends(require_admin)
):
    """Get complete assets data including list and statistics in one call"""
    try:
        # Get assets list
        assets = await AssetService.get_all_assets(
            asset_type=asset_type,
            limit=limit,
            skip=skip
        )
        
        # Get statistics
        stats = await AssetService.get_asset_statistics()
        
        return JSONResponse({
            "success": True,
            "message": "Assets data retrieved successfully",
            "data": {
                "assets": assets,
                "statistics": stats,
                "total": len(assets)
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting assets data: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve assets data"
        )

@router.post("/")
async def upload_asset(
    file: UploadFile = File(...),
    name: str = Form(...),
    asset_type: str = Form(...),
    signature_type: Optional[str] = Form(None),
    department: Optional[str] = Form(None),
    description: str = Form(""),
    tags: str = Form(""),
    admin: AdminUser = Depends(require_admin)
):
    """Upload new asset with comprehensive processing"""
    try:
        # Validate file
        if not file.filename:
            raise HTTPException(
                status_code=400,
                detail="No file provided"
            )
        
        # Check file extension
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"File type {file_ext} not allowed"
            )
        
        # Read file content
        file_content = await file.read()
        
        # Check file size
        if len(file_content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        # Process tags
        tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()] if tags else []
        
        # Upload and process asset
        result = await AssetService.upload_asset(
            file_content=file_content,
            original_filename=file.filename,
            uploaded_by=admin.username,
            name=name,
            asset_type=asset_type,
            signature_type=signature_type,
            department=department,
            description=description,
            tags=tag_list
        )
        
        if result["success"]:
            return JSONResponse({
                "success": True,
                "message": result["message"],
                "asset": result["asset"]
            })
        else:
            raise HTTPException(
                status_code=500,
                detail=result["message"]
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading asset: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to upload asset"
        )


@router.delete("/{asset_id}")
async def delete_asset(
    asset_id: str,
    permanent: bool = False,
    admin: AdminUser = Depends(require_admin)
):
    """Delete asset - supports both soft and hard delete"""
    try:
        if permanent:
            # Hard delete - completely remove from system
            success = await AssetService.delete_asset_permanent(asset_id)
            message = "Asset permanently deleted"
        else:
            # Soft delete - mark as deleted but keep in system
            success = await AssetService.delete_asset(asset_id)
            message = "Asset deleted successfully"
        
        if not success:
            raise HTTPException(
                status_code=404,
                detail="Asset not found or could not be deleted"
            )
        
        return JSONResponse({
            "success": True,
            "message": message,
            "permanent": permanent
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting asset {asset_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to delete asset"
        )








