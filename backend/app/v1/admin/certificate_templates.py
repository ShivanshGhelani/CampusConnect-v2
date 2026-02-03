"""
Admin Certificate Templates API Routes
Handles certificate HTML template management with database storage
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Request
from fastapi.responses import JSONResponse
from models.admin_user import AdminUser
from dependencies.auth import require_admin
from services.certificate_template_service import CertificateTemplateService
import logging
import os
from pathlib import Path
from typing import Optional, List, Dict
import uuid
from datetime import datetime
import json

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize certificate template service
template_service = CertificateTemplateService()

# Allowed file extensions for HTML templates
ALLOWED_EXTENSIONS = {'.html', '.htm'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# Valid certificate categories
VALID_CATEGORIES = ["Academics", "Events & Fests"]

@router.get("/")
async def list_certificate_templates_root(
    admin: AdminUser = Depends(require_admin)
):
    """List certificate templates from database (root endpoint for frontend compatibility)"""
    try:
        # Get templates from database
        templates = await template_service.get_all_templates()
        
        # Convert to API response format
        template_list = [template.to_dict() for template in templates]
        
        logger.info(f"Retrieved {len(template_list)} certificate templates from database")
        
        return JSONResponse({
            "success": True,
            "message": "Certificate templates retrieved successfully",
            "templates": template_list,
            "data": template_list  # Add both formats for frontend compatibility
        })
        
    except Exception as e:
        logger.error(f"Error listing certificate templates: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve certificate templates")

@router.get("/dashboard")
async def list_certificate_templates(
    admin: AdminUser = Depends(require_admin)
):
    """List certificate templates from database"""
    try:
        # Get templates from database
        templates = await template_service.get_all_templates()
        
        # Convert to API response format
        template_list = [template.to_dict() for template in templates]
        
        logger.info(f"Retrieved {len(template_list)} certificate templates from database")
        
        return JSONResponse({
            "success": True,
            "message": "Certificate templates retrieved successfully",
            "templates": template_list
        })
        
    except Exception as e:
        logger.error(f"Error listing certificate templates: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve certificate templates")

@router.post("/upload")
async def upload_certificate_template(
    file: UploadFile = File(...),
    template_name: str = Form(...),
    category: str = Form("Academics"),
    description: Optional[str] = Form(None),
    admin: AdminUser = Depends(require_admin)
):
    """Upload a new certificate HTML template to database and storage"""
    try:
        # Validate filename exists
        if not file.filename:
            raise HTTPException(
                status_code=400,
                detail="No file provided"
            )
        
        # Validate file extension
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400, 
                detail=f"File type {file_ext} not allowed. Only HTML files (.html, .htm) are accepted."
            )
        
        # Validate template name
        if not template_name.strip():
            raise HTTPException(
                status_code=400,
                detail="Template name is required"
            )
        
        # Validate category
        if category not in VALID_CATEGORIES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid category. Must be one of: {', '.join(VALID_CATEGORIES)}"
            )
        
        # Clean template name (remove special characters)
        clean_name = "".join(c for c in template_name.strip() if c.isalnum() or c in (' ', '-', '_')).rstrip()
        if not clean_name:
            raise HTTPException(
                status_code=400,
                detail="Template name contains invalid characters"
            )
        
        # Read file content and check size
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        # Generate filename from template name
        filename = f"{clean_name.replace(' ', '_')}.html"
        
        # Validate HTML content (basic check)
        try:
            content_str = content.decode('utf-8')
            if '<html' not in content_str.lower() and '<body' not in content_str.lower():
                raise HTTPException(
                    status_code=400,
                    detail="Invalid HTML content. The file should contain valid HTML structure."
                )
        except UnicodeDecodeError:
            raise HTTPException(
                status_code=400,
                detail="Invalid file encoding. Please upload a UTF-8 encoded HTML file."
            )
        
        # Generate smart tags
        tags = []
        if description:
            desc_tags = [tag.strip() for tag in description.split(',') if tag.strip()]
            tags.extend(desc_tags)
        
        # Create template using service
        template = await template_service.create_template(
            name=clean_name,
            filename=filename,
            category=category,
            file_content=content,
            uploaded_by=admin.username,
            tags=tags,
            description=description or f"Certificate template for {category.lower()} category"
        )
        
        if not template:
            raise HTTPException(
                status_code=500,
                detail="Failed to create certificate template"
            )
        
        return JSONResponse({
            "success": True,
            "message": "Certificate template uploaded successfully",
            "template": template.to_dict()
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading certificate template: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to upload certificate template")

@router.delete("/{template_id}")
async def delete_certificate_template(
    template_id: str,
    admin: AdminUser = Depends(require_admin)
):
    """Delete a certificate template from database"""
    try:
        success = await template_service.delete_template(template_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Certificate template not found")
        
        return JSONResponse({
            "success": True,
            "message": "Certificate template deleted successfully"
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting certificate template: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete certificate template")

@router.post("/migrate")
async def migrate_existing_templates(admin: AdminUser = Depends(require_admin)):
    """Migrate existing template files to database"""
    try:
        migrated_count = await template_service.migrate_existing_files()
        
        return JSONResponse({
            "success": True,
            "message": f"Successfully migrated {migrated_count} certificate templates to database",
            "migrated_count": migrated_count
        })
        
    except Exception as e:
        logger.error(f"Error migrating templates: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to migrate templates")
