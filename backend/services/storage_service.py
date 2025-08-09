"""
Supabase Storage Service
Handles file uploads and downloads to/from Supabase Storage
"""
import logging
from typing import Optional, Dict, Any, BinaryIO
from supabase import create_client, Client
from config.settings import get_settings
import uuid
from pathlib import Path

logger = logging.getLogger(__name__)

class SupabaseStorageService:
    """Service class for Supabase Storage operations"""
    
    def __init__(self):
        self.settings = get_settings()
        self.client: Optional[Client] = None
        self.bucket_name = self.settings.SUPABASE_STORAGE_BUCKET
        logger.info(f"SupabaseStorageService initializing with bucket: {self.bucket_name}")
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize Supabase client"""
        try:
            logger.info(f"Initializing Supabase client with URL: {self.settings.SUPABASE_URL}")
            logger.info(f"Anon key available: {bool(self.settings.SUPABASE_ANON_KEY)}")
            logger.info(f"Service role key available: {bool(self.settings.SUPABASE_SERVICE_ROLE_KEY)}")
            
            if not self.settings.SUPABASE_URL or not self.settings.SUPABASE_ANON_KEY:
                logger.warning("Supabase credentials not configured. Storage operations will be disabled.")
                return
            
            # Try service role key first, fall back to anon key
            api_key = self.settings.SUPABASE_SERVICE_ROLE_KEY or self.settings.SUPABASE_ANON_KEY
            
            self.client = create_client(
                self.settings.SUPABASE_URL,
                api_key
            )
            
            # Ensure bucket exists
            self._ensure_bucket_exists()
            
            logger.info("Supabase storage client initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {str(e)}")
            logger.exception("Full exception details:")
            self.client = None
    
    def _ensure_bucket_exists(self):
        """Ensure the storage bucket exists (campusconnect bucket should already exist)"""
        try:
            if not self.client:
                return
            
            # Check if bucket exists
            buckets = self.client.storage.list_buckets()
            bucket_names = [bucket.name for bucket in buckets]
            
            if self.bucket_name not in bucket_names:
                logger.warning(f"Supabase bucket '{self.bucket_name}' not found. Please create it manually in Supabase dashboard.")
            else:
                logger.info(f"Using existing Supabase storage bucket: {self.bucket_name}")
            
        except Exception as e:
            logger.error(f"Error checking bucket existence: {str(e)}")
    
    async def upload_file(self, 
                         file_content: bytes, 
                         filename: str, 
                         category: str,
                         content_type: str = "text/html") -> Optional[Dict[str, Any]]:
        """
        Upload file to Supabase Storage
        
        Args:
            file_content: File content as bytes
            filename: Original filename
            category: Category folder (e.g., 'Academics', 'Events & Fests')
            content_type: MIME type of the file
            
        Returns:
            Dict with file URL and storage path if successful, None otherwise
        """
        try:
            if not self.client:
                logger.error("Supabase client not initialized")
                return None
            
            # Generate unique filename to prevent conflicts
            file_extension = Path(filename).suffix
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            
            # Create storage path: certificate-templates/category/unique_filename
            # This keeps templates separate from other assets in the campusconnect bucket
            category_folder = category.replace(' ', '_').replace('&', 'and')
            storage_path = f"certificate-templates/{category_folder}/{unique_filename}"
            
            # Upload to Supabase Storage
            result = self.client.storage.from_(self.bucket_name).upload(
                path=storage_path,
                file=file_content,
                file_options={
                    "content-type": content_type,
                    "cache-control": "3600"  # Cache for 1 hour
                }
            )
            
            if result:
                # Get public URL
                public_url = self.client.storage.from_(self.bucket_name).get_public_url(storage_path)
                
                logger.info(f"File uploaded successfully to Supabase: {storage_path}")
                
                return {
                    "storage_path": storage_path,
                    "public_url": public_url,
                    "bucket": self.bucket_name,
                    "original_filename": filename,
                    "unique_filename": unique_filename
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error uploading file to Supabase: {str(e)}")
            return None
    
    async def download_file(self, storage_path: str) -> Optional[bytes]:
        """
        Download file from Supabase Storage
        
        Args:
            storage_path: Path to file in storage
            
        Returns:
            File content as bytes if successful, None otherwise
        """
        try:
            if not self.client:
                logger.error("Supabase client not initialized")
                return None
            
            result = self.client.storage.from_(self.bucket_name).download(storage_path)
            
            if result:
                logger.info(f"File downloaded successfully from Supabase: {storage_path}")
                return result
            
            return None
            
        except Exception as e:
            logger.error(f"Error downloading file from Supabase: {str(e)}")
            return None
    
    async def delete_file(self, storage_path: str) -> bool:
        """
        Delete file from Supabase Storage
        
        Args:
            storage_path: Path to file in storage
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if not self.client:
                logger.error("Supabase client not initialized")
                return False
            
            result = self.client.storage.from_(self.bucket_name).remove([storage_path])
            
            if result:
                logger.info(f"File deleted successfully from Supabase: {storage_path}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error deleting file from Supabase: {str(e)}")
            return False
    
    async def get_file_url(self, storage_path: str) -> Optional[str]:
        """
        Get public URL for a file in Supabase Storage
        
        Args:
            storage_path: Path to file in storage
            
        Returns:
            Public URL if successful, None otherwise
        """
        try:
            if not self.client:
                logger.error("Supabase client not initialized")
                return None
            
            public_url = self.client.storage.from_(self.bucket_name).get_public_url(storage_path)
            return public_url
            
        except Exception as e:
            logger.error(f"Error getting file URL from Supabase: {str(e)}")
            return None
    
    async def list_files(self, prefix: str = "certificate-templates") -> list:
        """
        List certificate template files in Supabase Storage
        
        Args:
            prefix: Folder prefix to filter files (defaults to certificate-templates)
            
        Returns:
            List of file objects
        """
        try:
            if not self.client:
                logger.error("Supabase client not initialized")
                return []
            
            result = self.client.storage.from_(self.bucket_name).list(prefix)
            
            if result:
                logger.info(f"Listed {len(result)} files from Supabase with prefix: {prefix}")
                return result
            
            return []
            
        except Exception as e:
            logger.error(f"Error listing files from Supabase: {str(e)}")
            return []
    
    def is_available(self) -> bool:
        """Check if Supabase storage is available"""
        available = self.client is not None
        logger.info(f"Supabase storage is_available: {available}, client: {type(self.client)}")
        return available

# Global instance
supabase_storage = SupabaseStorageService()
