"""
Asset Management Service
Handles complete asset lifecycle with database storage, WebP optimization, and URL shortening
"""
import uuid
import mimetypes
from pathlib import Path
from typing import Optional, Dict, Any, List
from database.operations import DatabaseOperations
from models.asset import Asset
from services.webp_optimization_service import WebPOptimizationService
from services.secure_url_service import SecureURLService
from services.supabase_storage_service import SupabaseStorageService
from config.settings import settings
import logging

logger = logging.getLogger(__name__)


class AssetService:
    """Comprehensive asset management service"""
    
    # Use private bucket for assets (logos, signatures)
    ASSETS_BUCKET = settings.SUPABASE_ASSETS_BUCKET
    
    @staticmethod
    async def upload_asset(
        file_content: bytes,
        original_filename: str,
        uploaded_by: str,
        name: str,
        asset_type: str,
        signature_type: Optional[str] = None,
        department: Optional[str] = None,
        description: str = "",
        tags: List[str] = None
    ) -> Dict[str, Any]:
        """
        Upload asset with full processing pipeline:
        1. Upload to Supabase
        2. Optimize to WebP (for images)
        3. Create short URL
        4. Generate image tag
        5. Store metadata in database
        
        Args:
            file_content: File bytes
            original_filename: Original file name
            uploaded_by: Username of uploader
            description: Asset description
            tags: List of tags
            
        Returns:
            Dictionary with asset details and URLs
        """
        try:
            # Use user-provided name with proper extension
            file_ext = Path(original_filename).suffix
            
            # Create clean name for file naming
            clean_name = "".join(c for c in name if c.isalnum() or c in (' ', '-', '_')).strip()
            clean_name = clean_name.replace(' ', '_')  # Replace spaces with underscores
            
            # Detect MIME type
            mime_type, _ = mimetypes.guess_type(original_filename)
            if not mime_type:
                mime_type = 'application/octet-stream'
            
            # Use the frontend-provided asset_type instead of MIME-based detection
            # This ensures "logo" stays as "logo", not converted to "image"
            
            # Create proper folder structure based on metadata
            folder_path = AssetService._create_folder_path(
                asset_type=asset_type,
                signature_type=signature_type,
                department=department
            )
            
            # For images, convert to WebP and upload only WebP
            if WebPOptimizationService.is_image(mime_type):
                try:
                    # Optimize to WebP
                    webp_content, webp_mime = await WebPOptimizationService.optimize_to_webp(
                        file_content, 
                        quality=85,
                        max_width=1920,  # Max width for web display
                        max_height=1080  # Max height for web display
                    )
                    
                    # Upload only WebP version for images using user-provided name
                    webp_filename = f"{clean_name}_{uuid.uuid4().hex[:8]}.webp"
                    supabase_result = await SupabaseStorageService.upload_file(
                        bucket_name=AssetService.ASSETS_BUCKET,
                        file_path=f"{folder_path}/{webp_filename}",
                        file_content=webp_content,
                        content_type="image/webp"
                    )
                    
                    if not supabase_result["success"]:
                        raise Exception(f"Supabase WebP upload failed: {supabase_result['error']}")
                    
                    supabase_url = supabase_result["file_url"]
                    actual_filename = webp_filename
                    actual_mime_type = "image/webp"
                    file_size = len(webp_content)
                    
                    logger.info(f"WebP optimization and upload successful: {original_filename} -> {webp_filename}")
                    
                except Exception as e:
                    logger.error(f"WebP optimization failed for {original_filename}: {e}")
                    # Fallback to original file upload
                    fallback_filename = f"{clean_name}_{uuid.uuid4().hex[:8]}{file_ext}"
                    supabase_result = await SupabaseStorageService.upload_file(
                        bucket_name=AssetService.ASSETS_BUCKET,
                        file_path=f"{folder_path}/{fallback_filename}",
                        file_content=file_content,
                        content_type=mime_type
                    )
                    
                    if not supabase_result["success"]:
                        raise Exception(f"Supabase upload failed: {supabase_result['error']}")
                    
                    supabase_url = supabase_result["file_url"]
                    actual_filename = fallback_filename
                    actual_mime_type = mime_type
                    file_size = len(file_content)
            else:
                # For non-images, upload as-is
                non_image_filename = f"{clean_name}_{uuid.uuid4().hex[:8]}{file_ext}"
                supabase_result = await SupabaseStorageService.upload_file(
                    bucket_name=AssetService.ASSETS_BUCKET,
                    file_path=f"{folder_path}/{non_image_filename}",
                    file_content=file_content,
                    content_type=mime_type
                )
                
                if not supabase_result["success"]:
                    raise Exception(f"Supabase upload failed: {supabase_result['error']}")
                
                supabase_url = supabase_result["file_url"]
                actual_filename = non_image_filename
                actual_mime_type = mime_type
                file_size = len(file_content)
            
            # Create asset record with simplified model - use Supabase URL as secure URL
            asset = Asset(
                original_filename=original_filename,
                file_size=file_size,
                mime_type=actual_mime_type,
                asset_type=asset_type,
                signature_type=signature_type,
                department=department,
                name=name,
                created_by=uploaded_by,
                secure_url=supabase_url,  # Use Supabase URL directly as secure URL
                description=description,
                tags=tags or []
            )
            
            # Insert asset into database
            asset_dict = asset.to_dict()
            asset_id = await DatabaseOperations.insert_one("assets", asset_dict)
            
            if not asset_id:
                raise Exception("Failed to save asset to database")
            
            logger.info(f"Asset uploaded successfully: {original_filename} -> {actual_filename}")
            
            return {
                "success": True,
                "asset": asset.to_dict(),
                "message": "Asset uploaded and processed successfully"
            }
            
        except Exception as e:
            logger.error(f"Error uploading asset {original_filename}: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to upload asset"
            }

    @staticmethod
    async def get_all_assets(
        asset_type: Optional[str] = None,
        uploaded_by: Optional[str] = None,
        limit: int = 100,
        skip: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Get all assets with optional filtering
        
        Args:
            asset_type: Filter by asset type (image, document, etc.)
            uploaded_by: Filter by uploader username
            limit: Maximum number of assets to return
            skip: Number of assets to skip (for pagination)
            
        Returns:
            List of asset dictionaries
        """
        try:
            # Build query filter
            query = {}
            if asset_type:
                query["asset_type"] = asset_type
            if uploaded_by:
                query["uploaded_by"] = uploaded_by
            
            # Get assets from database
            assets = await DatabaseOperations.find_many(
                "assets",
                query,
                limit=limit,
                skip=skip,
                sort_by=[("created_at", -1)]  # Most recent first
            )
            
            return [Asset.from_dict(asset).to_dict() for asset in assets]
            
        except Exception as e:
            logger.error(f"Error getting assets: {e}")
            return []

    @staticmethod
    async def get_asset_by_id(asset_id: str) -> Optional[Dict[str, Any]]:
        """Get asset by ID"""
        try:
            asset_data = await DatabaseOperations.find_by_id("assets", asset_id)
            if asset_data:
                return Asset.from_dict(asset_data).to_dict()
            return None
        except Exception as e:
            logger.error(f"Error getting asset {asset_id}: {e}")
            return None

    @staticmethod
    async def delete_asset(asset_id: str) -> bool:
        """
        Delete asset (remove from database and Supabase)
        
        Args:
            asset_id: Asset ID to delete
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Get asset details
            asset_data = await DatabaseOperations.find_by_id("assets", asset_id)
            if not asset_data:
                return False
            
            # Delete from Supabase using secure URL to get the file path
            # Extract filename from secure_url
            secure_url = asset_data.get("secure_url") or asset_data.get("file_url", "")
            if secure_url and "/storage/v1/object/public/" in secure_url:
                # Extract the file path from the URL
                file_path = secure_url.split("/storage/v1/object/public/")[-1]
                file_path = file_path.split("?")[0]  # Remove any query parameters
                
                await SupabaseStorageService.delete_file(
                    bucket_name=AssetService.ASSETS_BUCKET,
                    file_path=file_path
                )
            
            # Remove from database
            result = await DatabaseOperations.delete_one("assets", {"_id": asset_id})
            
            logger.info(f"Asset deleted: {asset_id}")
            return bool(result)
            
        except Exception as e:
            logger.error(f"Error deleting asset {asset_id}: {e}")
            return False

    @staticmethod
    async def delete_asset_permanent(asset_id: str) -> bool:
        """
        Permanently delete asset (same as delete_asset for now)
        
        Args:
            asset_id: Asset ID to delete
            
        Returns:
            True if successful, False otherwise
        """
        return await AssetService.delete_asset(asset_id)

    @staticmethod
    async def get_asset_statistics() -> Dict[str, Any]:
        """Get comprehensive asset statistics"""
        try:
            # Total assets
            total_assets = await DatabaseOperations.count_documents("assets", {})
            
            # Assets by type
            pipeline = [
                {"$group": {"_id": "$asset_type", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]
            type_stats = await DatabaseOperations.aggregate("assets", pipeline)
            
            # Total storage used
            size_pipeline = [
                {"$group": {"_id": None, "total_size": {"$sum": "$file_size"}}}
            ]
            size_result = await DatabaseOperations.aggregate("assets", size_pipeline)
            total_size = size_result[0]["total_size"] if size_result else 0
            
            # Recent uploads (last 7 days)
            from datetime import datetime, timedelta
            import pytz
            week_ago = datetime.now(pytz.timezone('Asia/Kolkata')) - timedelta(days=7)
            recent_uploads = await DatabaseOperations.count_documents(
                "assets", 
                {"created_at": {"$gte": week_ago}}
            )
            
            return {
                "total_assets": total_assets,
                "total_size": total_size,
                "formatted_size": Asset._format_file_size(total_size),
                "recent_uploads": recent_uploads,
                "by_type": {item["_id"]: item["count"] for item in type_stats}
            }
            
        except Exception as e:
            logger.error(f"Error getting asset statistics: {e}")
            return {}

    @staticmethod
    def _create_folder_path(asset_type: str, signature_type: Optional[str] = None, department: Optional[str] = None) -> str:
        """Create organized folder structure for asset storage"""
        if asset_type == "logo":
            return "logos"
        elif asset_type == "signature":
            if signature_type == "principal":
                return "signatures/principal"
            elif signature_type == "faculty" and department:
                return f"signatures/faculty/{department}"
            elif signature_type == "head-of-department" and department:
                return f"signatures/hod/{department}"
            else:
                return "signatures/general"
        else:
            return f"assets/{asset_type}"

    @staticmethod
    def _get_asset_type(mime_type: str) -> str:
        """Determine asset type from MIME type"""
        if mime_type.startswith('image/'):
            return 'image'
        elif mime_type.startswith('video/'):
            return 'video'
        elif mime_type.startswith('audio/'):
            return 'audio'
        elif mime_type in ['application/pdf']:
            return 'document'
        elif mime_type.startswith('text/'):
            return 'document'
        elif 'word' in mime_type or 'powerpoint' in mime_type or 'excel' in mime_type:
            return 'document'
        elif 'zip' in mime_type or 'rar' in mime_type or 'tar' in mime_type:
            return 'archive'
        else:
            return 'other'
