from typing import Dict, List, Optional
from config.database import Database
from bson import ObjectId
import json

class DatabaseOperations:
    @classmethod
    async def find_one(cls, collection_name: str, query: Dict, db_name: str = "CampusConnect") -> Optional[Dict]:
        """Find a single document in the specified collection"""
        db = await Database.get_database(db_name)
        if db is None:
            return None
        return await db[collection_name].find_one(query)

    @classmethod
    async def find_many(cls, collection_name: str, query: Dict = {}, limit: int = 0, skip: int = 0, sort_by: Optional[List] = None, db_name: str = "CampusConnect") -> List[Dict]:
        """Find multiple documents in the specified collection"""
        db = await Database.get_database(db_name)
        if db is None:
            return []
        cursor = db[collection_name].find(query)
        
        if sort_by:
            cursor = cursor.sort(sort_by)
        if skip:
            cursor = cursor.skip(skip)
        if limit:
            cursor = cursor.limit(limit)
            
        return await cursor.to_list(length=None)

    @classmethod
    async def insert_one(cls, collection_name: str, document: Dict, db_name: str = "CampusConnect") -> Optional[str]:
        """Insert a single document into the specified collection"""
        db = await Database.get_database(db_name)
        if db is None:
            return None
        result = await db[collection_name].insert_one(document)
        return str(result.inserted_id) if result.inserted_id else None

    @classmethod
    async def update_one(cls, collection_name: str, query: Dict, update: Dict, db_name: str = "CampusConnect") -> bool:
        """Update a single document in the specified collection"""
        db = await Database.get_database(db_name)
        if db is None:
            return False
        result = await db[collection_name].update_one(query, update)
        return result.modified_count > 0

    @classmethod
    async def update_many(cls, collection_name: str, query: Dict, update: Dict, db_name: str = "CampusConnect") -> object:
        """Update multiple documents in the specified collection"""
        db = await Database.get_database(db_name)
        if db is None:
            return None
        result = await db[collection_name].update_many(query, update)
        return result

    @classmethod
    async def delete_one(cls, collection_name: str, query: Dict, db_name: str = "CampusConnect") -> bool:
        """Delete a single document from the specified collection"""
        db = await Database.get_database(db_name)
        if db is None:
            return False
        result = await db[collection_name].delete_one(query)
        return result.deleted_count > 0

    @classmethod
    async def count_documents(cls, collection_name: str, query: Dict = {}, db_name: str = "CampusConnect") -> int:
        """Count documents in the specified collection"""
        db = await Database.get_database(db_name)
        if db is None:
            return 0
        return await db[collection_name].count_documents(query)
