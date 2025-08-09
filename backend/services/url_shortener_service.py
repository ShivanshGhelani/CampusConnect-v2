"""
URL Shortener Service
Creates short URLs for assets and manages URL redirects
"""
import hashlib
import string
import random
from typing import Optional
from database.operations import DatabaseOperations
import logging

logger = logging.getLogger(__name__)


class URLShortenerService:
    """Service for creating and managing short URLs"""
    
    BASE_URL = "https://campusconnect.edu"  # Change to your domain
    SHORT_CODE_LENGTH = 8
    
    @staticmethod
    async def generate_short_code(length: int = SHORT_CODE_LENGTH) -> str:
        """Generate a unique short code"""
        characters = string.ascii_letters + string.digits
        max_attempts = 100
        
        for _ in range(max_attempts):
            short_code = ''.join(random.choices(characters, k=length))
            
            # Check if code already exists
            existing = await DatabaseOperations.find_one(
                "url_shortcuts", 
                {"short_code": short_code}
            )
            
            if not existing:
                return short_code
        
        # Fallback: use hash-based approach
        timestamp = str(DatabaseOperations.get_current_timestamp())
        hash_object = hashlib.md5(timestamp.encode())
        return hash_object.hexdigest()[:length]

    @staticmethod
    async def create_short_url(
        original_url: str, 
        asset_id: str,
        asset_name: str,
        created_by: str
    ) -> dict:
        """
        Create a short URL for an asset
        
        Args:
            original_url: The full Supabase URL
            asset_id: Asset ID for tracking
            asset_name: Original asset name
            created_by: User who created the short URL
            
        Returns:
            Dictionary with short URL details
        """
        try:
            # Generate unique short code
            short_code = await URLShortenerService.generate_short_code()
            
            # Create short URL
            short_url = f"{URLShortenerService.BASE_URL}/s/{short_code}"
            
            # Store in database
            url_data = {
                "short_code": short_code,
                "original_url": original_url,
                "short_url": short_url,
                "asset_id": asset_id,
                "asset_name": asset_name,
                "created_by": created_by,
                "clicks": 0,
                "created_at": DatabaseOperations.get_current_timestamp(),
                "is_active": True
            }
            
            result = await DatabaseOperations.insert_one("url_shortcuts", url_data)
            
            if result:
                logger.info(f"Short URL created: {short_url} -> {original_url}")
                return {
                    "success": True,
                    "short_code": short_code,
                    "short_url": short_url,
                    "original_url": original_url
                }
            else:
                raise Exception("Failed to save short URL to database")
                
        except Exception as e:
            logger.error(f"Error creating short URL: {e}")
            return {
                "success": False,
                "error": str(e),
                "short_url": original_url  # Fallback to original URL
            }

    @staticmethod
    async def resolve_short_url(short_code: str) -> Optional[dict]:
        """
        Resolve a short code to original URL and increment click counter
        
        Args:
            short_code: The short code to resolve
            
        Returns:
            Dictionary with original URL and metadata, or None if not found
        """
        try:
            # Find the short URL record
            url_record = await DatabaseOperations.find_one(
                "url_shortcuts",
                {"short_code": short_code, "is_active": True}
            )
            
            if not url_record:
                return None
            
            # Increment click counter
            await DatabaseOperations.update_one(
                "url_shortcuts",
                {"short_code": short_code},
                {"$inc": {"clicks": 1}}
            )
            
            return {
                "original_url": url_record["original_url"],
                "asset_id": url_record["asset_id"],
                "asset_name": url_record["asset_name"],
                "clicks": url_record.get("clicks", 0) + 1
            }
            
        except Exception as e:
            logger.error(f"Error resolving short URL {short_code}: {e}")
            return None

    @staticmethod
    async def get_url_statistics(short_code: str) -> Optional[dict]:
        """Get statistics for a short URL"""
        try:
            url_record = await DatabaseOperations.find_one(
                "url_shortcuts",
                {"short_code": short_code}
            )
            
            if not url_record:
                return None
            
            return {
                "short_code": short_code,
                "short_url": url_record["short_url"],
                "original_url": url_record["original_url"],
                "asset_name": url_record["asset_name"],
                "clicks": url_record.get("clicks", 0),
                "created_at": url_record["created_at"],
                "created_by": url_record["created_by"]
            }
            
        except Exception as e:
            logger.error(f"Error getting URL statistics: {e}")
            return None

    @staticmethod
    def generate_image_tag(short_url: str, asset_name: str, alt_text: str = None) -> str:
        """
        Generate HTML image tag for easy copying
        
        Args:
            short_url: The shortened URL
            asset_name: Original asset name for alt text
            alt_text: Custom alt text (optional)
            
        Returns:
            HTML img tag string
        """
        alt = alt_text or asset_name or "Campus Connect Asset"
        return f'<img src="{short_url}" alt="{alt}" loading="lazy" />'

    @staticmethod
    async def deactivate_short_url(short_code: str) -> bool:
        """Deactivate a short URL"""
        try:
            result = await DatabaseOperations.update_one(
                "url_shortcuts",
                {"short_code": short_code},
                {"$set": {"is_active": False}}
            )
            return bool(result)
        except Exception as e:
            logger.error(f"Error deactivating short URL: {e}")
            return False
