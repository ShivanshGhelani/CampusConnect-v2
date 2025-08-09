"""
WebP Image Optimization Service
Converts images to WebP format for better compression and quality
"""
import io
import aiohttp
import asyncio
from PIL import Image
from typing import Optional, Tuple
import logging

logger = logging.getLogger(__name__)


class WebPOptimizationService:
    """Service for optimizing images to WebP format"""
    
    @staticmethod
    async def optimize_to_webp(
        image_content: bytes, 
        quality: int = 85, 
        max_width: Optional[int] = None,
        max_height: Optional[int] = None
    ) -> Tuple[bytes, str]:
        """
        Convert image to WebP format with optimization
        
        Args:
            image_content: Original image bytes
            quality: WebP quality (1-100, default 85)
            max_width: Maximum width for resizing
            max_height: Maximum height for resizing
            
        Returns:
            Tuple of (optimized_webp_bytes, mime_type)
        """
        try:
            # Load image from bytes
            image = Image.open(io.BytesIO(image_content))
            
            # Convert to RGB if necessary (removes alpha channel for WebP)
            if image.mode in ('RGBA', 'LA', 'P'):
                # Create white background for transparent images
                background = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'P':
                    image = image.convert('RGBA')
                if 'transparency' in image.info:
                    background.paste(image, mask=image.split()[-1])
                else:
                    background.paste(image)
                image = background
            elif image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Resize if dimensions are specified
            if max_width or max_height:
                original_width, original_height = image.size
                
                # Calculate new dimensions maintaining aspect ratio
                if max_width and max_height:
                    # Fit within both constraints
                    width_ratio = max_width / original_width
                    height_ratio = max_height / original_height
                    ratio = min(width_ratio, height_ratio, 1.0)  # Don't upscale
                elif max_width:
                    ratio = min(max_width / original_width, 1.0)
                else:  # max_height
                    ratio = min(max_height / original_height, 1.0)
                
                if ratio < 1.0:
                    new_width = int(original_width * ratio)
                    new_height = int(original_height * ratio)
                    image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Save as WebP
            webp_buffer = io.BytesIO()
            image.save(
                webp_buffer, 
                format='WEBP', 
                quality=quality,
                optimize=True,
                method=6  # Best compression method
            )
            
            webp_bytes = webp_buffer.getvalue()
            
            logger.info(f"Image optimized: {len(image_content)} bytes -> {len(webp_bytes)} bytes "
                       f"({len(webp_bytes)/len(image_content)*100:.1f}% of original)")
            
            return webp_bytes, 'image/webp'
            
        except Exception as e:
            logger.error(f"Error optimizing image to WebP: {e}")
            # Fallback: return original image
            return image_content, 'image/jpeg'

    @staticmethod
    def is_image(mime_type: str) -> bool:
        """Check if the file is an image that can be optimized"""
        image_types = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
            'image/bmp', 'image/tiff', 'image/webp'
        ]
        return mime_type.lower() in image_types

    @staticmethod
    async def get_optimized_filename(original_filename: str) -> str:
        """Generate filename for WebP version"""
        name_without_ext = original_filename.rsplit('.', 1)[0]
        return f"{name_without_ext}_optimized.webp"

    @staticmethod
    async def calculate_savings(original_size: int, optimized_size: int) -> dict:
        """Calculate compression savings"""
        savings_bytes = original_size - optimized_size
        savings_percent = (savings_bytes / original_size) * 100 if original_size > 0 else 0
        
        return {
            "original_size": original_size,
            "optimized_size": optimized_size,
            "savings_bytes": savings_bytes,
            "savings_percent": round(savings_percent, 2),
            "compression_ratio": round(optimized_size / original_size, 3) if original_size > 0 else 0
        }
