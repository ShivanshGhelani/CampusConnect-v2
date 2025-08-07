"""
Alternative script to insert venues using direct MongoDB operations
This script can be run independently without the CampusConnect application structure
"""

import asyncio
import json
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
import os
from typing import List, Dict

# MongoDB configuration - update these values according to your setup
MONGODB_URL = "mongodb://localhost:27017"  # Update this if different
DATABASE_NAME = "CampusConnect"
COLLECTION_NAME = "venues"

async def insert_venues_direct():
    """Insert venues directly using MongoDB motor client"""
    
    # Load venues from JSON
    script_dir = os.path.dirname(os.path.abspath(__file__))
    venues_file = os.path.join(script_dir, "..", "venues.json")
    
    try:
        with open(venues_file, 'r', encoding='utf-8') as file:
            venues = json.load(file)
    except FileNotFoundError:
        print(f"❌ Error: venues.json not found at {venues_file}")
        return
    except json.JSONDecodeError as e:
        print(f"❌ Error parsing JSON: {e}")
        return
    
    # Connect to MongoDB
    try:
        client = AsyncIOMotorClient(MONGODB_URL)
        await client.server_info()  # Test connection
        print("✅ Connected to MongoDB")
        
        db = client[DATABASE_NAME]
        collection = db[COLLECTION_NAME]
        
        # Add timestamps to all venues
        current_time = datetime.utcnow()
        for venue in venues:
            venue['created_at'] = current_time
            venue['updated_at'] = current_time
        
        # Insert venues in batch
        result = await collection.insert_many(venues)
        
        print(f"✅ Successfully inserted {len(result.inserted_ids)} venues")
        print(f"📋 Inserted venue IDs: {[str(id) for id in result.inserted_ids[:5]]}{'...' if len(result.inserted_ids) > 5 else ''}")
        
        # Verify insertion
        count = await collection.count_documents({})
        print(f"📊 Total venues in database: {count}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        if 'client' in locals():
            client.close()
            print("🔌 Closed MongoDB connection")

if __name__ == "__main__":
    print("🏛️  Direct MongoDB Venue Insertion Script")
    print("=" * 50)
    print(f"📡 MongoDB URL: {MONGODB_URL}")
    print(f"🗄️  Database: {DATABASE_NAME}")
    print(f"📚 Collection: {COLLECTION_NAME}")
    print()
    
    response = input("🤔 Do you want to proceed with inserting venues? (y/N): ")
    if response.lower() in ['y', 'yes']:
        asyncio.run(insert_venues_direct())
    else:
        print("❌ Operation cancelled by user")
