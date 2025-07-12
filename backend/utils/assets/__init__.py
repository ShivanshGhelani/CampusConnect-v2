# Assets Utils Package

# Asset Context and Management
from .asset_context import asset_context, get_template_globals
from .certificate_assets import (
    cert_logo_url,
    cert_signature_url, 
    cert_faculty_signature,
    cert_hod_signature,
    cert_principal_signature,
    cert_asset_path,
    get_certificate_asset_context
)

__all__ = [
    # Asset Context
    "asset_context",
    "get_template_globals",
      # Certificate Assets
    "cert_logo_url",
    "cert_signature_url",
    "cert_faculty_signature", 
    "cert_hod_signature",
    "cert_principal_signature",
    "cert_asset_path",
    "get_certificate_asset_context"
]
