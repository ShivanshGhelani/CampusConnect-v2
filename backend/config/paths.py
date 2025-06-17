from pathlib import Path
import os

# Get the project root directory (FastAPI/form)
BASE_DIR = Path(__file__).parent.parent

# Templates directory structure
TEMPLATE_DIR = BASE_DIR / "templates"

# Static directory structure (Assets)
STATIC_DIR = BASE_DIR / "static"
CSS_DIR = STATIC_DIR / "css"
JS_DIR = STATIC_DIR / "js"
IMAGES_DIR = STATIC_DIR / "images"
UPLOADS_DIR = STATIC_DIR / "uploads"
ASSETS_DIR = STATIC_DIR  # Alias for static directory

# Create a comprehensive asset path resolver
class AssetPathResolver:
    """
    Centralized asset path resolver that can be imported and used
    from anywhere in the project to access static assets.
    """
    
    @staticmethod
    def get_static_url(asset_path: str) -> str:
        """
        Get URL path for static assets that works from anywhere in the project.
        
        Args:
            asset_path: Relative path to asset (e.g., 'images/logo.png', 'css/style.css')
            
        Returns:
            URL path that can be used in templates and routes
        """
        return f"/static/{asset_path.lstrip('/')}"
    
    @staticmethod
    def get_static_file_path(asset_path: str) -> Path:
        """
        Get absolute file system path to static asset.
        
        Args:
            asset_path: Relative path to asset
            
        Returns:
            Absolute Path object to the asset file
        """
        return STATIC_DIR / asset_path.lstrip('/')
    
    @staticmethod
    def get_css_url(css_file: str) -> str:
        """Get URL for CSS files"""
        if not css_file.endswith('.css'):
            css_file += '.css'
        return f"/static/css/{css_file}"
    
    @staticmethod
    def get_js_url(js_file: str) -> str:
        """Get URL for JavaScript files"""
        if not js_file.endswith('.js'):
            js_file += '.js'
        return f"/static/js/{js_file}"
    
    @staticmethod
    def get_image_url(image_file: str) -> str:
        """Get URL for image files"""
        return f"/static/images/{image_file}"
    
    @staticmethod
    def get_upload_url(upload_file: str) -> str:
        """Get URL for uploaded files"""
        return f"/static/uploads/{upload_file}"
    
    @staticmethod
    def asset_exists(asset_path: str) -> bool:
        """Check if an asset file exists"""
        return AssetPathResolver.get_static_file_path(asset_path).exists()
    
    @staticmethod
    def list_assets(subdirectory: str = "") -> list:
        """List all assets in a subdirectory"""
        search_dir = STATIC_DIR / subdirectory if subdirectory else STATIC_DIR
        if not search_dir.exists():
            return []
        
        assets = []
        for item in search_dir.rglob('*'):
            if item.is_file():
                # Get relative path from static directory
                rel_path = item.relative_to(STATIC_DIR)
                assets.append(str(rel_path).replace('\\', '/'))
        
        return sorted(assets)

# Global asset resolver instance
assets = AssetPathResolver()

# Convenience functions for quick access
def static_url(path: str) -> str:
    """Quick access to static URL"""
    return assets.get_static_url(path)

def css_url(filename: str) -> str:
    """Quick access to CSS URL"""
    return assets.get_css_url(filename)

def js_url(filename: str) -> str:
    """Quick access to JS URL"""
    return assets.get_js_url(filename)

def image_url(filename: str) -> str:
    """Quick access to image URL"""
    return assets.get_image_url(filename)

def upload_url(filename: str) -> str:
    """Quick access to upload URL"""
    return assets.get_upload_url(filename)


