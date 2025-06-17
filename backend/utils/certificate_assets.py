"""
Certificate Asset Helpers

Special asset management functions specifically for certificate templates.
These functions provide shortcuts for commonly used certificate assets.
"""

from config.paths import upload_url, static_url

def cert_logo_url(logo_name: str) -> str:
    """
    Get URL for certificate logos.
    
    Args:
        logo_name: Name of logo file (e.g., 'ksv.png', 'ldrp.png')
        
    Returns:
        Full URL to the logo asset
        
    Example:
        cert_logo_url('ksv.png') → '/static/uploads/assets/logo/ksv.png'
    """
    return upload_url(f'assets/logo/{logo_name}')

def cert_signature_url(role: str, department: str, name: str) -> str:
    """
    Get URL for certificate signatures with role-based organization.
    
    Args:
        role: Role type ('faculty', 'head-of-department', 'principal')
        department: Department name ('information-technology', 'computer-science', etc.)
        name: Signature file name (e.g., 'nilam.jpg', 'mehulbarot.png')
        
    Returns:
        Full URL to the signature asset
        
    Examples:
        cert_signature_url('faculty', 'information-technology', 'nilam.jpg')
        → '/static/uploads/assets/signature/faculty/information-technology/nilam.jpg'
        
        cert_signature_url('principal', '', 'gargi.png')  
        → '/static/uploads/assets/signature/principal/gargi.png'
    """
    if department:
        return upload_url(f'assets/signature/{role}/{department}/{name}')
    else:
        return upload_url(f'assets/signature/{role}/{name}')

def cert_faculty_signature(department: str, name: str) -> str:
    """
    Shortcut for faculty signatures.
    
    Args:
        department: Department name
        name: Faculty signature file name
        
    Returns:
        URL to faculty signature
    """
    return cert_signature_url('faculty', department, name)

def cert_hod_signature(department: str, name: str) -> str:
    """
    Shortcut for Head of Department signatures.
    
    Args:
        department: Department name  
        name: HOD signature file name
        
    Returns:
        URL to HOD signature
    """
    return cert_signature_url('head-of-department', department, name)

def cert_principal_signature(name: str) -> str:
    """
    Shortcut for Principal signatures.
    
    Args:
        name: Principal signature file name
        
    Returns:
        URL to principal signature
    """
    return cert_signature_url('principal', '', name)

def cert_asset_path(path: str) -> str:
    """
    Universal asset path resolver for user-uploaded certificate templates.
    Converts user-friendly short paths to full asset URLs.
    
    This function handles the common patterns that users use when creating templates:
    - /logo/filename.ext → '/static/uploads/assets/logo/filename.ext'
    - /signature/role/department/filename.ext → '/static/uploads/assets/signature/role/department/filename.ext'
    - /signature/principal/filename.ext → '/static/uploads/assets/signature/principal/filename.ext'
    - /assets/... → '/static/uploads/assets/...'
    
    Args:
        path: User-friendly asset path starting with /
        
    Returns:
        Full URL to the asset
        
    Examples:
        cert_asset_path('/logo/ksv.png') → '/static/uploads/assets/logo/ksv.png'
        cert_asset_path('/signature/faculty/information-technology/nilam.jpg') 
        → '/static/uploads/assets/signature/faculty/information-technology/nilam.jpg'
        cert_asset_path('/signature/principal/gargi.png')
        → '/static/uploads/assets/signature/principal/gargi.png'
    """
    # Compatibility fix for direct asset URLs in templates
    # These start with /logo/, /signature/, etc. and need to be properly mapped
    
    # Remove leading slash for processing
    clean_path = path.lstrip('/')
    
    # If path already starts with 'assets/', just prepend upload base
    if clean_path.startswith('assets/'):
        return upload_url(clean_path)
    
    # Handle common certificate asset patterns
    if clean_path.startswith('logo/'):
        # /logo/filename → /static/uploads/assets/logo/filename
        return upload_url(f'assets/{clean_path}')
    
    elif clean_path.startswith('signature/'):
        # /signature/... → /static/uploads/assets/signature/...
        return upload_url(f'assets/{clean_path}')
    
    else:
        # Default: treat as assets subfolder
        return upload_url(f'assets/{clean_path}')

# Create shortcuts for template context
def get_certificate_asset_context():
    """
    Get certificate-specific asset functions for template context.
    
    Returns:
        Dictionary of certificate asset functions
    """
    return {
        'cert_logo_url': cert_logo_url,
        'cert_signature_url': cert_signature_url,
        'cert_faculty_signature': cert_faculty_signature,
        'cert_hod_signature': cert_hod_signature,
        'cert_principal_signature': cert_principal_signature,
        'cert_asset_path': cert_asset_path,  # Universal path resolver
    }
