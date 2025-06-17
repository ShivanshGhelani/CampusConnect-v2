"""
Asset Context Processor

This module provides template context functions to make assets
accessible from any template in the project.
"""

from config.paths import assets, static_url, css_url, js_url, image_url, upload_url
from utils.certificate_assets import get_certificate_asset_context

def asset_context():
    """
    Template context processor that adds asset functions to all templates.
    
    Returns:
        Dictionary of asset functions available in templates
    """
    context = {
        'static_url': static_url,
        'css_url': css_url,
        'js_url': js_url,
        'image_url': image_url,
        'upload_url': upload_url,
        'assets': assets,
    }
    
    # Add certificate-specific asset functions
    context.update(get_certificate_asset_context())
    
    return context

def get_template_globals():
    """
    Get global template variables for asset access.
    
    Usage in FastAPI:
        templates.env.globals.update(get_template_globals())
    """
    globals_dict = {
        'static_url': static_url,
        'css_url': css_url,
        'js_url': js_url,
        'image_url': image_url,
        'upload_url': upload_url,
        'assets': assets,
    }
    
    # Add certificate-specific asset functions
    globals_dict.update(get_certificate_asset_context())
    
    return globals_dict
