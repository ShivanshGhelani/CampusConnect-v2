"""
Asset Model - Simplified
Handles asset storage with secure URLs that never expire
"""
from datetime import datetime
import pytz
from typing import Optional, Dict, Any
from bson import ObjectId


class Asset:
    def __init__(
        self,
        original_filename: str,
        file_size: int,
        mime_type: str,
        asset_type: str,
        created_by: str,
        secure_url: str,  # Never-expiring secure URL for private bucket access
        name: str,
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
        self.file_size = file_size
        self.mime_type = mime_type
        self.asset_type = asset_type  # logo, signature, etc.
        self.signature_type = signature_type  # principal, faculty, head-of-department
        self.department = department  # for faculty/hod signatures
        self.name = name
        self.created_by = created_by  # Who uploaded this asset
        self.secure_url = secure_url  # Never-expiring secure URL
        self.file_url = secure_url  # For backward compatibility - same as secure_url
        self.description = description or ""
        self.tags = tags or []
        self.download_count = 0
        self.created_at = created_at or datetime.now(pytz.timezone('Asia/Kolkata'))
        self.updated_at = updated_at or datetime.now(pytz.timezone('Asia/Kolkata'))

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
            "name": self.name,
            "file_size": self.file_size,
            "formatted_size": self._format_file_size(self.file_size),
            "mime_type": self.mime_type,
            "asset_type": self.asset_type,
            "signature_type": self.signature_type,
            "department": self.department,
            "created_by": self.created_by,
            "file_url": self.secure_url,  # For frontend compatibility
            "secure_url": self.secure_url,
            "description": self.description,
            "tags": self.tags,
            "download_count": self.download_count,
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
        
        # Handle backwards compatibility for created_by/uploaded_by
        created_by = data.get("created_by") or data.get("uploaded_by", "Unknown")
        
        # Handle backwards compatibility for secure_url/file_url
        secure_url = data.get("secure_url") or data.get("file_url") or data.get("supabase_url", "")
        
        return cls(
            _id=ObjectId(data["_id"]) if "_id" in data else None,
            original_filename=data.get("original_filename", "unknown"),
            name=data.get("name", data.get("original_filename", "Unknown")),
            file_size=data.get("file_size", 0),
            mime_type=data.get("mime_type", "application/octet-stream"),
            asset_type=data.get("asset_type", "other"),
            signature_type=data.get("signature_type"),
            department=data.get("department"),
            created_by=created_by,
            secure_url=secure_url,
            description=data.get("description", ""),
            tags=data.get("tags", []),
            created_at=created_at,
            updated_at=updated_at
        )

    def increment_download(self):
        """Increment download counter"""
        self.download_count += 1
        self.updated_at = datetime.now(pytz.timezone('Asia/Kolkata'))
