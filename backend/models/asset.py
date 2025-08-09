"""
Asset Model
Handles asset storage metadata and URL management
"""
from datetime import datetime
from typing import Optional, Dict, Any
from bson import ObjectId


class Asset:
    def __init__(
        self,
        original_filename: str,
        stored_filename: str,
        file_size: int,
        mime_type: str,
        asset_type: str,
        uploaded_by: str,
        file_url: str,
        name: str,
        shortened_url: str = "",
        image_tag: str = "",
        signature_type: Optional[str] = None,
        department: Optional[str] = None,
        description: Optional[str] = None,
        tags: Optional[list] = None,
        _id: Optional[ObjectId] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None
    ):
        self._id = _id or ObjectId()
        self.original_filename = original_filename
        self.stored_filename = stored_filename
        self.file_size = file_size
        self.mime_type = mime_type
        self.asset_type = asset_type  # image, document, video, etc.
        self.signature_type = signature_type  # principal, faculty, head-of-department
        self.department = department  # for faculty/hod signatures
        self.name = name
        self.uploaded_by = uploaded_by
        self.file_url = file_url
        self.shortened_url = shortened_url
        self.image_tag = image_tag
        self.description = description or ""
        self.tags = tags or []
        self.downloads = 0
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

    def to_dict(self) -> Dict[str, Any]:
        """Convert Asset object to dictionary"""
        # Handle created_at - could be string or datetime
        created_at_str = None
        if self.created_at:
            if isinstance(self.created_at, str):
                created_at_str = self.created_at
            else:
                created_at_str = self.created_at.isoformat()
        
        # Handle updated_at - could be string or datetime  
        updated_at_str = None
        if self.updated_at:
            if isinstance(self.updated_at, str):
                updated_at_str = self.updated_at
            else:
                updated_at_str = self.updated_at.isoformat()
        
        return {
            "_id": str(self._id),
            "id": str(self._id),
            "original_filename": self.original_filename,
            "stored_filename": self.stored_filename,
            "name": self.name,
            "file_size": self.file_size,
            "formatted_size": self._format_file_size(self.file_size),
            "mime_type": self.mime_type,
            "asset_type": self.asset_type,
            "signature_type": self.signature_type,
            "department": self.department,
            "uploaded_by": self.uploaded_by,
            "file_url": self.file_url,
            "shortened_url": self.shortened_url,
            "image_tag": self.image_tag,
            "description": self.description,
            "tags": self.tags,
            "downloads": self.downloads,
            "created_at": created_at_str,
            "updated_at": updated_at_str
        }

    @staticmethod
    def _format_file_size(size_bytes: int) -> str:
        """Format file size in human readable format"""
        if size_bytes == 0:
            return "0 B"
        
        size_names = ["B", "KB", "MB", "GB"]
        i = 0
        while size_bytes >= 1024 and i < len(size_names) - 1:
            size_bytes /= 1024
            i += 1
        
        return f"{size_bytes:.1f} {size_names[i]}"

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Asset':
        """Create Asset object from dictionary"""
        from datetime import datetime
        
        # Handle created_at - could be string or datetime
        created_at = data.get("created_at")
        if isinstance(created_at, str):
            try:
                created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            except:
                created_at = None
        
        # Handle updated_at - could be string or datetime
        updated_at = data.get("updated_at")
        if isinstance(updated_at, str):
            try:
                updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
            except:
                updated_at = None
        
        return cls(
            _id=ObjectId(data["_id"]) if "_id" in data else None,
            original_filename=data["original_filename"],
            stored_filename=data["stored_filename"],
            name=data.get("name", data["original_filename"]),
            file_size=data["file_size"],
            mime_type=data["mime_type"],
            asset_type=data["asset_type"],
            signature_type=data.get("signature_type"),
            department=data.get("department"),
            uploaded_by=data["uploaded_by"],
            file_url=data.get("file_url", data.get("supabase_url", "")),  # Backward compatibility
            shortened_url=data.get("shortened_url", ""),
            image_tag=data.get("image_tag", ""),
            description=data.get("description", ""),
            tags=data.get("tags", []),
            created_at=created_at,
            updated_at=updated_at
        )

    def update_downloads(self):
        """Increment download counter"""
        self.downloads += 1
        self.updated_at = datetime.utcnow()
