"""
Certificate Template Service
Handles business logic for certificate template management with Supabase Storage
"""
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from database.operations import DatabaseOperations
from models.certificate_template import CertificateTemplate
from services.storage_service import supabase_storage
from pathlib import Path
import uuid
import os

logger = logging.getLogger(__name__)

class CertificateTemplateService:
    """Service class for certificate template operations"""
    
    def __init__(self):
        self.db = DatabaseOperations()
        self.collection_name = "certificate_templates"
    
    async def create_template(self, 
                            name: str,
                            filename: str,
                            category: str,
                            file_content: bytes,
                            uploaded_by: str,
                            tags: List[str] = None,
                            description: str = "") -> CertificateTemplate:
        """Create a new certificate template with Supabase Storage"""
        try:
            # Generate unique ID for the template
            template_id = ObjectId()
            
            # Upload file to Supabase Storage
            if supabase_storage.is_available():
                upload_result = await supabase_storage.upload_file(
                    file_content=file_content,
                    filename=filename,
                    category=category,
                    content_type="text/html"
                )
                
                if not upload_result:
                    raise Exception("Failed to upload file to Supabase Storage")
                
                file_url = upload_result["public_url"]
                storage_path = upload_result["storage_path"]
                
            else:
                # Fallback to local storage if Supabase is not available
                logger.warning("Supabase Storage not available, falling back to local storage")
                storage_dir = Path("static/templates") / category
                storage_dir.mkdir(parents=True, exist_ok=True)
                
                file_path = storage_dir / filename
                with open(file_path, "wb") as f:
                    f.write(file_content)
                
                file_url = f"/static/templates/{category}/{filename}"
                storage_path = f"templates/{category}/{filename}"
            
            # Create template instance
            template = CertificateTemplate(
                _id=template_id,
                name=name,
                filename=filename,
                category=category,
                tags=tags or [],
                description=description,
                file_url=file_url,
                storage_path=storage_path,
                size=len(file_content),
                uploaded_by=uploaded_by,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                is_active=True,
                metadata={
                    "file_type": "html",
                    "original_filename": filename,
                    "upload_source": "admin_panel",
                    "storage_type": "supabase" if supabase_storage.is_available() else "local"
                }
            )
            
            # Save to database
            result = await self.db.insert_one(
                self.collection_name, 
                template.to_mongo_dict()
            )
            
            if result:  # result is the inserted_id string if successful
                logger.info(f"Certificate template '{name}' created successfully with ID: {template_id}")
                return template
            else:
                # Clean up file if database insert failed
                if supabase_storage.is_available() and 'upload_result' in locals():
                    await supabase_storage.delete_file(storage_path)
                elif 'file_path' in locals() and file_path.exists():
                    file_path.unlink()
                raise Exception("Failed to save template to database")
                
        except Exception as e:
            logger.error(f"Error creating certificate template: {str(e)}")
            raise
    
    async def get_template_by_id(self, template_id: str) -> Optional[CertificateTemplate]:
        """Get template by ID"""
        try:
            if not ObjectId.is_valid(template_id):
                return None
                
            result = await self.db.find_one(
                self.collection_name, 
                {"_id": ObjectId(template_id)}
            )
            
            if result:
                return CertificateTemplate.from_mongo_dict(result)
            return None
            
        except Exception as e:
            logger.error(f"Error getting template by ID {template_id}: {str(e)}")
            return None
    
    async def get_all_templates(self, 
                              category: str = None, 
                              is_active: bool = True) -> List[CertificateTemplate]:
        """Get all certificate templates with optional filtering"""
        try:
            query = {"is_active": is_active}
            if category:
                query["category"] = category
            
            result = await self.db.find_many(
                self.collection_name,
                query,
                sort_by=[("created_at", -1)]  # Most recent first
            )
            
            templates = []
            if result:  # result is a list of documents
                for doc in result:
                    template = CertificateTemplate.from_mongo_dict(doc)
                    if template:
                        templates.append(template)
            
            logger.info(f"Retrieved {len(templates)} certificate templates")
            return templates
            
        except Exception as e:
            logger.error(f"Error getting all templates: {str(e)}")
            return []
    
    async def update_template(self, 
                            template_id: str, 
                            update_data: Dict[str, Any]) -> Optional[CertificateTemplate]:
        """Update template metadata"""
        try:
            if not ObjectId.is_valid(template_id):
                return None
            
            # Add updated timestamp
            update_data["updated_at"] = datetime.utcnow()
            
            result = await self.db.update_by_id(
                self.collection_name,
                ObjectId(template_id),
                {"$set": update_data}
            )
            
            if result:  # result is True if successful
                return await self.get_template_by_id(template_id)
            return None
            
        except Exception as e:
            logger.error(f"Error updating template {template_id}: {str(e)}")
            return None
    
    async def delete_template(self, template_id: str) -> bool:
        """Delete template (soft delete by default)"""
        try:
            if not ObjectId.is_valid(template_id):
                return False
            
            # Get template first to get file path
            template = await self.get_template_by_id(template_id)
            if not template:
                return False
            
            # Soft delete (mark as inactive)
            result = await self.db.update_by_id(
                self.collection_name,
                ObjectId(template_id),
                {
                    "$set": {
                        "is_active": False,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            if result:  # result is True if successful
                # Delete physical file from appropriate storage
                try:
                    storage_type = template.metadata.get("storage_type", "local")
                    
                    if storage_type == "supabase" and supabase_storage.is_available():
                        # Delete from Supabase Storage
                        await supabase_storage.delete_file(template.storage_path)
                        logger.info(f"Deleted template file from Supabase: {template.storage_path}")
                    else:
                        # Delete from local storage
                        file_path = Path("static") / template.storage_path
                        if file_path.exists():
                            file_path.unlink()
                            logger.info(f"Deleted template file from local storage: {file_path}")
                        
                except Exception as file_error:
                    logger.warning(f"Could not delete template file: {file_error}")
                
                logger.info(f"Certificate template {template_id} deleted successfully")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error deleting template {template_id}: {str(e)}")
            return False
    
    async def get_template_content(self, template: CertificateTemplate) -> Optional[str]:
        """Get template HTML content for preview"""
        try:
            storage_type = template.metadata.get("storage_type", "local")
            
            if storage_type == "supabase" and supabase_storage.is_available():
                # Download from Supabase Storage
                content_bytes = await supabase_storage.download_file(template.storage_path)
                if content_bytes:
                    return content_bytes.decode('utf-8')
            else:
                # Read from local storage
                file_path = Path("static") / template.storage_path
                if file_path.exists():
                    with open(file_path, 'r', encoding='utf-8') as f:
                        return f.read()
            
            logger.warning(f"Template content not found: {template.storage_path}")
            return None
            
        except Exception as e:
            logger.error(f"Error getting template content: {str(e)}")
            return None
    
    async def search_templates(self, 
                             search_term: str, 
                             category: str = None) -> List[CertificateTemplate]:
        """Search templates by name, tags, or description"""
        try:
            query = {
                "is_active": True,
                "$or": [
                    {"name": {"$regex": search_term, "$options": "i"}},
                    {"tags": {"$regex": search_term, "$options": "i"}},
                    {"description": {"$regex": search_term, "$options": "i"}}
                ]
            }
            
            if category:
                query["category"] = category
            
            result = await self.db.find_many(
                self.collection_name,
                query,
                sort=[("created_at", -1)]
            )
            
            templates = []
            if result and result.get("success") and result.get("data"):
                for doc in result["data"]:
                    template = CertificateTemplate.from_mongo_dict(doc)
                    if template:
                        templates.append(template)
            
            return templates
            
        except Exception as e:
            logger.error(f"Error searching templates: {str(e)}")
            return []
    
    async def get_template_statistics(self) -> Dict[str, Any]:
        """Get template statistics"""
        try:
            # Get total count
            total_count = await self.db.count_documents(
                self.collection_name,
                {"is_active": True}
            )
            
            # Get category counts
            category_pipeline = [
                {"$match": {"is_active": True}},
                {"$group": {"_id": "$category", "count": {"$sum": 1}}}
            ]
            
            category_results = await self.db.aggregate(
                self.collection_name,
                category_pipeline
            )
            
            categories = {}
            for item in category_results:
                categories[item["_id"]] = item["count"]
            
            # Get recent uploads (last 7 days)
            recent_date = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            recent_date = recent_date.replace(day=recent_date.day - 7)
            
            recent_count = await self.db.count_documents(
                self.collection_name,
                {
                    "is_active": True,
                    "created_at": {"$gte": recent_date}
                }
            )
            
            return {
                "total_templates": total_count,
                "categories": categories,
                "recent_uploads": recent_count,
                "categories_count": len(categories)
            }
            
        except Exception as e:
            logger.error(f"Error getting template statistics: {str(e)}")
            return {
                "total_templates": 0,
                "categories": {},
                "recent_uploads": 0,
                "categories_count": 0
            }
    
    async def migrate_existing_files(self) -> int:
        """Migrate existing template files to database"""
        try:
            migrated_count = 0
            base_path = Path("static/templates")
            
            if not base_path.exists():
                return 0
            
            # Valid categories
            valid_categories = ["Academics", "Events & Fests"]
            
            for category in valid_categories:
                category_dir = base_path / category
                if not category_dir.exists():
                    continue
                
                for file_path in category_dir.glob("*.html"):
                    try:
                        # Check if template already exists in database
                        existing = await self.db.find_one(
                            self.collection_name,
                            {"filename": file_path.name, "category": category}
                        )
                        
                        if existing:
                            continue  # Skip if already exists
                        
                        # Read file content
                        with open(file_path, 'rb') as f:
                            content = f.read()
                        
                        # Generate smart tags based on filename
                        tags = self._generate_smart_tags(file_path.stem, category)
                        
                        # Create template in database
                        template = await self.create_template(
                            name=file_path.stem.replace('_', ' ').title(),
                            filename=file_path.name,
                            category=category,
                            file_content=content,
                            uploaded_by="system_migration",
                            tags=tags,
                            description=f"Migrated {category.lower()} certificate template"
                        )
                        
                        if template:
                            migrated_count += 1
                            logger.info(f"Migrated template: {file_path.name}")
                        
                    except Exception as file_error:
                        logger.error(f"Error migrating file {file_path}: {file_error}")
                        continue
            
            logger.info(f"Migration complete. Migrated {migrated_count} templates.")
            return migrated_count
            
        except Exception as e:
            logger.error(f"Error during migration: {str(e)}")
            return 0
    
    def _generate_smart_tags(self, filename: str, category: str) -> List[str]:
        """Generate smart tags based on filename and category"""
        tags = []
        
        # Add category tag
        tags.append(category.replace(' & ', '-').replace(' ', '-').lower())
        
        # Add filename-based tags
        name_lower = filename.lower()
        if 'excellence' in name_lower:
            tags.extend(['academic', 'achievement', 'excellence'])
        elif 'completion' in name_lower:
            tags.extend(['completion', 'course', 'certification'])
        elif 'participation' in name_lower:
            tags.extend(['participation', 'event', 'attendance'])
        elif 'winner' in name_lower or 'award' in name_lower:
            tags.extend(['winner', 'award', 'competition'])
        elif 'festival' in name_lower or 'fest' in name_lower:
            tags.extend(['festival', 'cultural', 'celebration'])
        elif 'merit' in name_lower:
            tags.extend(['merit', 'honor', 'recognition'])
        elif 'volunteer' in name_lower:
            tags.extend(['volunteer', 'service', 'community'])
        elif 'speaker' in name_lower:
            tags.extend(['speaker', 'presentation', 'expert'])
        elif 'coordinator' in name_lower:
            tags.extend(['coordinator', 'leadership', 'management'])
        elif 'topper' in name_lower:
            tags.extend(['topper', 'rank', 'performance'])
        
        return list(set(tags))  # Remove duplicates
