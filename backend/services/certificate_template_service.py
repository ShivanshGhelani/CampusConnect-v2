"""
Certificate Template Service
Handles certificate template management with database storage and Supabase integration
"""

import logging
import uuid
from datetime import datetime
import pytz
from typing import List, Optional, Dict, Any
from pathlib import Path

from database.operations import DatabaseOperations
from services.supabase_storage_service import SupabaseStorageService
from models.certificate_template import CertificateTemplate

logger = logging.getLogger(__name__)

class CertificateTemplateService:
    """Service for managing certificate templates"""
    
    def __init__(self):
        self.db_ops = DatabaseOperations()
        self.storage_service = SupabaseStorageService()
        self.collection_name = "certificate_templates"
    
    async def get_all_templates(self) -> List[CertificateTemplate]:
        """Get all certificate templates from database"""
        try:
            templates_data = await self.db_ops.find_many(
                self.collection_name, 
                {},
                sort_by=[("created_at", -1)]
            )
            
            templates = []
            for template_data in templates_data:
                try:
                    # Convert MongoDB _id to id for Pydantic model
                    if '_id' in template_data:
                        template_data['id'] = str(template_data['_id'])
                        del template_data['_id']
                    
                    # Handle missing fields with defaults
                    if 'file_path' not in template_data:
                        template_data['file_path'] = template_data.get('storage_path')
                    
                    template = CertificateTemplate(**template_data)
                    templates.append(template)
                except Exception as e:
                    logger.warning(f"Failed to parse template {template_data.get('id', template_data.get('_id', 'unknown'))}: {e}")
                    continue
            
            return templates
            
        except Exception as e:
            logger.error(f"Error fetching certificate templates: {e}")
            return []
    
    async def get_template_by_id(self, template_id: str) -> Optional[CertificateTemplate]:
        """Get a specific template by ID"""
        try:
            # Try to find by both MongoDB _id and custom id fields
            from bson import ObjectId
            
            # First try with custom id field
            template_data = await self.db_ops.find_one(
                self.collection_name,
                {"id": template_id}
            )
            
            # If not found, try with MongoDB _id
            if not template_data:
                try:
                    if ObjectId.is_valid(template_id):
                        template_data = await self.db_ops.find_one(
                            self.collection_name,
                            {"_id": ObjectId(template_id)}
                        )
                except:
                    pass
            
            if template_data:
                # Convert MongoDB _id to id for Pydantic model
                if '_id' in template_data:
                    template_data['id'] = str(template_data['_id'])
                    del template_data['_id']
                
                # Handle missing fields with defaults
                if 'file_path' not in template_data:
                    template_data['file_path'] = template_data.get('storage_path')
                
                return CertificateTemplate(**template_data)
            return None
            
        except Exception as e:
            logger.error(f"Error fetching template {template_id}: {e}")
            return None
    
    async def create_template(
        self,
        name: str,
        filename: str,
        category: str,
        file_content: bytes,
        uploaded_by: str,
        tags: List[str] = None,
        description: str = ""
    ) -> Optional[CertificateTemplate]:
        """Create a new certificate template"""
        try:
            template_id = f"cert_template_{uuid.uuid4().hex[:8]}"
            
            # Create unique filename to avoid conflicts
            file_extension = Path(filename).suffix
            unique_filename = f"{uuid.uuid4().hex}.html"  # Always use .html extension
            storage_path = f"certificate-templates/{category}/{unique_filename}"
            
            # Upload to Supabase
            upload_result = await self.storage_service.upload_file(
                bucket_name="campusconnect",
                file_path=storage_path,
                file_content=file_content,
                content_type="text/html"
            )
            
            if not upload_result["success"]:
                logger.error(f"Failed to upload template file: {upload_result.get('error', 'Unknown error')}")
                return None
            
            # Get public URL
            file_url = self.storage_service.get_public_url("campusconnect", storage_path)
            
            # Create template object
            template = CertificateTemplate(
                id=template_id,
                name=name,
                filename=filename,
                category=category,
                file_url=file_url,
                file_path=storage_path,
                uploaded_by=uploaded_by,
                tags=tags or [],
                description=description,
                created_at=datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None),
                is_active=True
            )
            
            # Save to database
            await self.db_ops.insert_one(
                self.collection_name,
                template.dict()
            )
            
            logger.info(f"Created certificate template: {template_id}")
            return template
            
        except Exception as e:
            logger.error(f"Error creating certificate template: {e}")
            return None
    
    async def delete_template(self, template_id: str) -> bool:
        """Delete a certificate template"""
        try:
            # Get template first
            template = await self.get_template_by_id(template_id)
            if not template:
                return False
            
            # Delete from Supabase storage
            if template.file_path:
                delete_result = await self.storage_service.delete_file(
                    bucket_name="campusconnect",
                    file_path=template.file_path
                )
                if not delete_result:
                    logger.warning(f"Failed to delete template file from storage")
            
            # Delete from database - try both _id and id fields
            from bson import ObjectId
            
            # First try with MongoDB _id if the template_id is a valid ObjectId
            if ObjectId.is_valid(template_id):
                result = await self.db_ops.delete_one(
                    self.collection_name,
                    {"_id": ObjectId(template_id)}
                )
            else:
                # Fallback to custom id field
                result = await self.db_ops.delete_one(
                    self.collection_name,
                    {"id": template_id}
                )
            
            if result:
                logger.info(f"Deleted certificate template: {template_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error deleting certificate template {template_id}: {e}")
            return False
    
    async def get_template_content(self, template: CertificateTemplate) -> Optional[str]:
        """Get template HTML content"""
        try:
            if not template.file_url:
                return None
            
            # For now, we'll fetch from the public URL since we don't have a download_file_content method
            import aiohttp
            async with aiohttp.ClientSession() as session:
                async with session.get(template.file_url) as response:
                    if response.status == 200:
                        content = await response.read()
                        return content.decode('utf-8')
            
            return None
            
        except Exception as e:
            logger.error(f"Error fetching template content: {e}")
            return None
    
    async def get_template_statistics(self) -> Dict[str, Any]:
        """Get certificate template statistics"""
        try:
            templates = await self.get_all_templates()
            
            total_templates = len(templates)
            categories = {}
            recent_uploads = 0
            
            # Calculate statistics
            recent_date = datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None).replace(day=datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None).day - 30)  # Last 30 days
            
            for template in templates:
                # Category count
                category = template.category
                categories[category] = categories.get(category, 0) + 1
                
                # Recent uploads
                if template.created_at and template.created_at > recent_date:
                    recent_uploads += 1
            
            return {
                "total_templates": total_templates,
                "categories": categories,
                "recent_uploads": recent_uploads
            }
            
        except Exception as e:
            logger.error(f"Error calculating template statistics: {e}")
            return {
                "total_templates": 0,
                "categories": {},
                "recent_uploads": 0
            }
    
    async def migrate_existing_files(self) -> int:
        """Migrate existing template files to database (if any)"""
        try:
            # This would be implemented to migrate existing files
            # For now, return 0 as no migration needed
            logger.info("Certificate template migration completed (no files to migrate)")
            return 0
            
        except Exception as e:
            logger.error(f"Error during template migration: {e}")
            return 0
