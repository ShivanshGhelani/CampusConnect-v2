"""
Mock implementations for testing
"""
from unittest.mock import AsyncMock, MagicMock
from typing import Dict, Any, List, Optional
from datetime import datetime


class MockDatabase:
    """Mock database for testing without actual database operations."""
    
    def __init__(self):
        self.data = {}
        self.collections = {}
    
    def __getitem__(self, collection_name: str):
        if collection_name not in self.collections:
            self.collections[collection_name] = MockCollection(collection_name)
        return self.collections[collection_name]
    
    def reset(self):
        """Reset all mock data."""
        self.data = {}
        self.collections = {}


class MockCollection:
    """Mock MongoDB collection for testing."""
    
    def __init__(self, name: str):
        self.name = name
        self.documents = []
        self.next_id = 1
    
    async def find_one(self, filter_query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Mock find_one operation."""
        for doc in self.documents:
            if self._matches_filter(doc, filter_query):
                return doc
        return None
    
    async def find(self, filter_query: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Mock find operation."""
        if filter_query is None:
            return self.documents
        
        return [doc for doc in self.documents if self._matches_filter(doc, filter_query)]
    
    async def insert_one(self, document: Dict[str, Any]) -> MagicMock:
        """Mock insert_one operation."""
        doc_copy = document.copy()
        doc_copy["_id"] = str(self.next_id)
        self.next_id += 1
        self.documents.append(doc_copy)
        
        result = MagicMock()
        result.inserted_id = doc_copy["_id"]
        return result
    
    async def update_one(self, filter_query: Dict[str, Any], update_data: Dict[str, Any]) -> MagicMock:
        """Mock update_one operation."""
        for doc in self.documents:
            if self._matches_filter(doc, filter_query):
                if "$set" in update_data:
                    doc.update(update_data["$set"])
                elif "$push" in update_data:
                    for key, value in update_data["$push"].items():
                        if key not in doc:
                            doc[key] = []
                        doc[key].append(value)
                
                result = MagicMock()
                result.modified_count = 1
                return result
        
        result = MagicMock()
        result.modified_count = 0
        return result
    
    async def delete_one(self, filter_query: Dict[str, Any]) -> MagicMock:
        """Mock delete_one operation."""
        for i, doc in enumerate(self.documents):
            if self._matches_filter(doc, filter_query):
                del self.documents[i]
                result = MagicMock()
                result.deleted_count = 1
                return result
        
        result = MagicMock()
        result.deleted_count = 0
        return result
    
    async def count_documents(self, filter_query: Dict[str, Any] = None) -> int:
        """Mock count_documents operation."""
        if filter_query is None:
            return len(self.documents)
        
        count = 0
        for doc in self.documents:
            if self._matches_filter(doc, filter_query):
                count += 1
        return count
    
    def _matches_filter(self, document: Dict[str, Any], filter_query: Dict[str, Any]) -> bool:
        """Check if document matches filter query (simplified)."""
        for key, value in filter_query.items():
            if key not in document:
                return False
            
            if isinstance(value, dict):
                # Handle regex queries
                if "$regex" in value:
                    import re
                    pattern = value["$regex"]
                    options = value.get("$options", "")
                    flags = re.IGNORECASE if "i" in options else 0
                    if not re.search(pattern, str(document[key]), flags):
                        return False
                # Handle other operators as needed
                elif "$gte" in value:
                    if document[key] < value["$gte"]:
                        return False
                elif "$lte" in value:
                    if document[key] > value["$lte"]:
                        return False
                elif "$in" in value:
                    if document[key] not in value["$in"]:
                        return False
            else:
                if document[key] != value:
                    return False
        
        return True


class MockSMTPPool:
    """Mock SMTP pool for email testing."""
    
    def __init__(self):
        self.connections = []
        self.sent_emails = []
    
    async def get_connection(self):
        """Get mock SMTP connection."""
        return MockSMTPConnection()
    
    async def return_connection(self, connection):
        """Return mock SMTP connection."""
        pass
    
    def shutdown(self):
        """Shutdown mock SMTP pool."""
        pass


class MockSMTPConnection:
    """Mock SMTP connection for email testing."""
    
    async def send_message(self, message):
        """Mock send message."""
        return True


class MockSupabaseClient:
    """Mock Supabase client for file storage testing."""
    
    def __init__(self):
        self.storage = MockSupabaseStorage()
        self.uploaded_files = []
        self.deleted_files = []
    
    def from_(self, bucket_name: str):
        """Get bucket mock."""
        return MockSupabaseBucket(bucket_name, self)


class MockSupabaseStorage:
    """Mock Supabase storage."""
    
    def from_(self, bucket_name: str):
        """Get bucket mock."""
        return MockSupabaseBucket(bucket_name)


class MockSupabaseBucket:
    """Mock Supabase bucket."""
    
    def __init__(self, bucket_name: str, client=None):
        self.bucket_name = bucket_name
        self.client = client
    
    def upload(self, path: str, file_data: bytes, file_options: Dict = None):
        """Mock file upload."""
        if self.client:
            self.client.uploaded_files.append({
                "bucket": self.bucket_name,
                "path": path,
                "size": len(file_data),
                "uploaded_at": datetime.utcnow()
            })
        
        return {
            "data": {"path": path},
            "error": None
        }
    
    def remove(self, paths: List[str]):
        """Mock file removal."""
        if self.client:
            for path in paths:
                self.client.deleted_files.append({
                    "bucket": self.bucket_name,
                    "path": path,
                    "deleted_at": datetime.utcnow()
                })
        
        return {
            "data": paths,
            "error": None
        }
    
    def get_public_url(self, path: str):
        """Mock get public URL."""
        return {
            "data": {"publicUrl": f"https://mock-supabase.com/{self.bucket_name}/{path}"}
        }
