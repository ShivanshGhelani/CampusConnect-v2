"""
Certificate Template Model
Represents certificate HTML templates stored in the system
"""
from datetime import datetime
from typing import Optional, List
from bson import ObjectId

class CertificateTemplate:
    """Certificate Template model for MongoDB storage"""
    
    def __init__(self, 
                 name: str,
                 filename: str,
                 category: str,
                 tags: List[str] = None,
                 description: str = "",
                 file_url: str = "",
                 storage_path: str = "",
                 size: int = 0,
                 uploaded_by: str = "",
                 created_at: datetime = None,
                 updated_at: datetime = None,
                 is_active: bool = True,
                 metadata: dict = None,
                 _id: ObjectId = None):
        
        self._id = _id or ObjectId()
        self.name = name
        self.filename = filename
        self.category = category
        self.tags = tags or []
        self.description = description
        self.file_url = file_url
        self.storage_path = storage_path
        self.size = size
        self.uploaded_by = uploaded_by
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()
        self.is_active = is_active
        self.metadata = metadata or {}
    
    def to_dict(self) -> dict:
        """Convert template to dictionary for API responses"""
        return {
            "id": str(self._id),
            "_id": str(self._id),
            "name": self.name,
            "filename": self.filename,
            "category": self.category,
            "tags": self.tags,
            "description": self.description,
            "file_url": self.file_url,
            "storage_path": self.storage_path,
            "size": self.size,
            "formatted_size": self.format_file_size(self.size),
            "uploaded_by": self.uploaded_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "uploaded_at": self.created_at.isoformat() if self.created_at else None,  # Alias for frontend
            "is_active": self.is_active,
            "metadata": self.metadata,
            "url": self.file_url,  # Alias for frontend
            "path": self.storage_path  # Alias for frontend
        }
    
    def to_mongo_dict(self) -> dict:
        """Convert template to dictionary for MongoDB storage"""
        return {
            "_id": self._id,
            "name": self.name,
            "filename": self.filename,
            "category": self.category,
            "tags": self.tags,
            "description": self.description,
            "file_url": self.file_url,
            "storage_path": self.storage_path,
            "size": self.size,
            "uploaded_by": self.uploaded_by,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "is_active": self.is_active,
            "metadata": self.metadata
        }
    
    @classmethod
    def from_mongo_dict(cls, data: dict) -> 'CertificateTemplate':
        """Create template instance from MongoDB document"""
        if not data:
            return None
            
        return cls(
            _id=data.get('_id'),
            name=data.get('name', ''),
            filename=data.get('filename', ''),
            category=data.get('category', ''),
            tags=data.get('tags', []),
            description=data.get('description', ''),
            file_url=data.get('file_url', ''),
            storage_path=data.get('storage_path', ''),
            size=data.get('size', 0),
            uploaded_by=data.get('uploaded_by', ''),
            created_at=data.get('created_at'),
            updated_at=data.get('updated_at'),
            is_active=data.get('is_active', True),
            metadata=data.get('metadata', {})
        )
    
    @staticmethod
    def format_file_size(size_bytes: int) -> str:
        """Format file size in human readable format"""
        if size_bytes == 0:
            return "0 B"
        
        size_names = ["B", "KB", "MB", "GB"]
        i = 0
        while size_bytes >= 1024 and i < len(size_names) - 1:
            size_bytes /= 1024
            i += 1
        
        return f"{size_bytes:.1f} {size_names[i]}"
    
    def update_metadata(self, **kwargs) -> None:
        """Update template metadata"""
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
        self.updated_at = datetime.utcnow()
    
    def add_tag(self, tag: str) -> None:
        """Add a tag to the template"""
        if tag and tag not in self.tags:
            self.tags.append(tag)
            self.updated_at = datetime.utcnow()
    
    def remove_tag(self, tag: str) -> None:
        """Remove a tag from the template"""
        if tag in self.tags:
            self.tags.remove(tag)
            self.updated_at = datetime.utcnow()
    
    def __str__(self) -> str:
        return f"CertificateTemplate(name='{self.name}', category='{self.category}', filename='{self.filename}')"
    
    def __repr__(self) -> str:
        return self.__str__()
