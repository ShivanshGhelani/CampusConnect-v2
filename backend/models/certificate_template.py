"""
Certificate Template Model
Pydantic models for certificate template management
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class CertificateTemplate(BaseModel):
    """Certificate Template model"""
    id: str = Field(..., description="Unique template identifier")
    name: str = Field(..., description="Template name")
    filename: str = Field(..., description="Original filename")
    category: str = Field(..., description="Template category")
    file_url: str = Field(..., description="Public URL to template file")
    file_path: Optional[str] = Field(None, description="Storage file path")
    uploaded_by: str = Field(..., description="Username who uploaded the template")
    tags: List[str] = Field(default_factory=list, description="Template tags")
    description: str = Field(default="", description="Template description")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    is_active: bool = Field(default=True, description="Whether template is active")
    
    def to_dict(self) -> dict:
        """Convert to dictionary format for API responses"""
        return {
            "id": self.id,
            "name": self.name,
            "filename": self.filename,
            "category": self.category,
            "file_url": self.file_url,
            "file_path": self.file_path,
            "uploaded_by": self.uploaded_by,
            "tags": self.tags,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "is_active": self.is_active
        }
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
