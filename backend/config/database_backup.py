from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
from config.settings import MONGODB_URL

class Database:
    client: Optional[AsyncIOMotorClient] = None
    
    @classmethod
    async def connect_db(cls):
        """Connect to MongoDB database"""
        try:
            if cls.client is None:
                cls.client = AsyncIOMotorClient(MONGODB_URL)
                await cls.client.server_info()  # Test the connection
                print("Connected to MongoDB")
            return cls.client
        except Exception as e:
            print(f"Error connecting to MongoDB: {e}")
            cls.client = None
            return None

    @classmethod
    async def close_db(cls):
        """Close database connection"""
        if cls.client:
            try:
                cls.client.close()
                cls.client = None
                print("Closed MongoDB connection")
            except Exception as e:
                print(f"Error closing MongoDB connection: {e}")

    @classmethod
    async def ensure_connected(cls):
        """Ensure database connection is established"""
        if cls.client is None:
            return await cls.connect_db()        
        try:
            await cls.client.server_info()  # Test if connection is still alive
            return cls.client
        except Exception:
            return await cls.connect_db()  # Reconnect if connection is lost

    @classmethod
    async def get_database(cls, db_name: str = "CampusConnect"):
        """Get a database instance by name with connection check"""
        try:
            if not await cls.ensure_connected():
                raise Exception("Could not establish database connection")
            
            db = cls.client[db_name]
            # Test database access
            await db.command('ping')
            return db
        except Exception as e:
            print(f"Error accessing database {db_name}: {e}")
            return None

