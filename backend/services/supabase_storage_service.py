"""
Supabase Storage Service
Handles file uploads and downloads to/from Supabase storage
"""
import aiohttp
import asyncio
from typing import Dict, Any, Optional
import logging
from config.settings import settings

logger = logging.getLogger(__name__)


class SupabaseStorageService:
    """Service for Supabase storage operations"""
    
    SUPABASE_URL = settings.SUPABASE_URL
    SUPABASE_SERVICE_KEY = settings.SUPABASE_SERVICE_ROLE_KEY
    
    @staticmethod
    async def upload_file(
        bucket_name: str,
        file_path: str,
        file_content: bytes,
        content_type: str = "application/octet-stream"
    ) -> Dict[str, Any]:
        """
        Upload file to Supabase storage
        
        Args:
            bucket_name: Supabase storage bucket name
            file_path: Path where file should be stored (includes filename)
            file_content: File content as bytes
            content_type: MIME type of the file
            
        Returns:
            Dictionary with upload result
        """
        try:
            upload_url = f"{SupabaseStorageService.SUPABASE_URL}/storage/v1/object/{bucket_name}/{file_path}"
            
            headers = {
                "Authorization": f"Bearer {SupabaseStorageService.SUPABASE_SERVICE_KEY}",
                "Content-Type": content_type,
                "x-upsert": "true"  # Allow overwriting
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(upload_url, data=file_content, headers=headers) as response:
                    if response.status in [200, 201]:
                        logger.info(f"File uploaded successfully: {file_path}")
                        
                        # For private buckets, generate a signed URL instead of public URL
                        if bucket_name.endswith('-private'):
                            signed_url = await SupabaseStorageService.create_signed_url(bucket_name, file_path, 3600)  # 1 hour
                            return {
                                "success": True,
                                "file_url": signed_url,
                                "file_path": file_path,
                                "is_private": True
                            }
                        else:
                            # For public buckets
                            public_url = f"{SupabaseStorageService.SUPABASE_URL}/storage/v1/object/public/{bucket_name}/{file_path}"
                            return {
                                "success": True,
                                "file_url": public_url,
                                "file_path": file_path,
                                "is_private": False
                            }
                    else:
                        error_text = await response.text()
                        logger.error(f"Upload failed: {response.status} - {error_text}")
                        return {
                            "success": False,
                            "error": f"Upload failed: {response.status} - {error_text}"
                        }
                        
        except Exception as e:
            logger.error(f"Error uploading file: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    async def delete_file(bucket_name: str, file_path: str) -> bool:
        """
        Delete file from Supabase storage
        
        Args:
            bucket_name: Supabase storage bucket name
            file_path: Path of file to delete
            
        Returns:
            True if successful, False otherwise
        """
        try:
            delete_url = f"{SupabaseStorageService.SUPABASE_URL}/storage/v1/object/{bucket_name}/{file_path}"
            
            headers = {
                "Authorization": f"Bearer {SupabaseStorageService.SUPABASE_SERVICE_KEY}"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.delete(delete_url, headers=headers) as response:
                    if response.status in [200, 204]:
                        logger.info(f"File deleted successfully: {file_path}")
                        return True
                    else:
                        error_text = await response.text()
                        logger.warning(f"Delete failed: {response.status} - {error_text}")
                        return False
                        
        except Exception as e:
            logger.error(f"Error deleting file: {e}")
            return False

    @staticmethod
    def get_public_url(bucket_name: str, file_path: str) -> str:
        """Generate public URL for a file"""
        return f"{SupabaseStorageService.SUPABASE_URL}/storage/v1/object/public/{bucket_name}/{file_path}"

    @staticmethod
    async def create_signed_url(bucket_name: str, file_path: str, expires_in: int = 3600) -> str:
        """
        Create a signed URL for private file access
        
        Args:
            bucket_name: Supabase storage bucket name
            file_path: Path of file
            expires_in: Expiration time in seconds (default 1 hour)
            
        Returns:
            Signed URL
        """
        try:
            signed_url_endpoint = f"{SupabaseStorageService.SUPABASE_URL}/storage/v1/object/sign/{bucket_name}/{file_path}"
            
            headers = {
                "Authorization": f"Bearer {SupabaseStorageService.SUPABASE_SERVICE_KEY}",
                "Content-Type": "application/json"
            }
            
            data = {
                "expiresIn": expires_in
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(signed_url_endpoint, json=data, headers=headers) as response:
                    if response.status == 200:
                        result = await response.json()
                        signed_url = f"{SupabaseStorageService.SUPABASE_URL}/storage/v1{result['signedURL']}"
                        return signed_url
                    else:
                        error_text = await response.text()
                        logger.error(f"Failed to create signed URL: {response.status} - {error_text}")
                        # Fallback to attempt public URL
                        return f"{SupabaseStorageService.SUPABASE_URL}/storage/v1/object/{bucket_name}/{file_path}"
                        
        except Exception as e:
            logger.error(f"Error creating signed URL: {e}")
            # Fallback to basic URL
            return f"{SupabaseStorageService.SUPABASE_URL}/storage/v1/object/{bucket_name}/{file_path}"

    @staticmethod
    async def list_files(bucket_name: str, folder_path: str = "") -> Dict[str, Any]:
        """
        List files in a bucket/folder
        
        Args:
            bucket_name: Supabase storage bucket name
            folder_path: Folder path to list (optional)
            
        Returns:
            Dictionary with file list
        """
        try:
            # Try POST method first (as per Supabase docs)
            list_url = f"{SupabaseStorageService.SUPABASE_URL}/storage/v1/object/list/{bucket_name}"
            
            logger.info(f"📡 Supabase list files URL: {list_url}")
            logger.info(f"🪣 Bucket: {bucket_name}, Folder: {folder_path}")
            
            headers = {
                "Authorization": f"Bearer {SupabaseStorageService.SUPABASE_SERVICE_KEY}",
                "Content-Type": "application/json"
            }
            
            # Use POST with body for prefix
            body = {}
            if folder_path:
                body["prefix"] = folder_path
                body["limit"] = 100
            
            async with aiohttp.ClientSession() as session:
                async with session.post(list_url, json=body, headers=headers) as response:
                    logger.info(f"📊 Supabase response status: {response.status}")
                    if response.status == 200:
                        files = await response.json()
                        logger.info(f"📁 Found {len(files)} files in bucket {bucket_name}/{folder_path}")
                        return {
                            "success": True,
                            "files": files
                        }
                    else:
                        error_text = await response.text()
                        logger.error(f"❌ Supabase list error (POST): {response.status} - {error_text}")
                        
                        # Fallback to GET method
                        logger.info("🔄 Trying GET method as fallback...")
                        get_url = list_url
                        if folder_path:
                            get_url += f"?prefix={folder_path}"
                        
                        async with session.get(get_url, headers={"Authorization": f"Bearer {SupabaseStorageService.SUPABASE_SERVICE_KEY}"}) as get_response:
                            logger.info(f"📊 Supabase GET response status: {get_response.status}")
                            if get_response.status == 200:
                                files = await get_response.json()
                                logger.info(f"📁 Found {len(files)} files with GET method")
                                return {
                                    "success": True,
                                    "files": files
                                }
                            else:
                                get_error = await get_response.text()
                                logger.error(f"❌ Supabase GET also failed: {get_response.status} - {get_error}")
                                return {
                                    "success": False,
                                    "error": f"Both POST and GET failed. POST: {response.status} - {error_text}, GET: {get_response.status} - {get_error}"
                                }
                        
        except Exception as e:
            logger.error(f"Error listing files: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    async def get_file_info(bucket_name: str, file_path: str) -> Optional[Dict[str, Any]]:
        """
        Get file information
        
        Args:
            bucket_name: Supabase storage bucket name
            file_path: Path of file to get info for
            
        Returns:
            Dictionary with file info or None if not found
        """
        try:
            info_url = f"{SupabaseStorageService.SUPABASE_URL}/storage/v1/object/info/{bucket_name}/{file_path}"
            
            headers = {
                "Authorization": f"Bearer {SupabaseStorageService.SUPABASE_SERVICE_KEY}"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(info_url, headers=headers) as response:
                    if response.status == 200:
                        info = await response.json()
                        return info
                    else:
                        return None
                        
        except Exception as e:
            logger.error(f"Error getting file info: {e}")
            return None
