#!/usr/bin/env python3
"""
Direct database update for organizer password hashing
"""

import os
import sys
from pymongo import MongoClient

# Try different MongoDB connections and database names
connection_attempts = [
    ("mongodb://localhost:27017/", "CampusConnect"),
    ("mongodb://localhost:27017/", "campusconnect"),
    ("mongodb://localhost:27017/", "campus_connect"),
    ("mongodb://127.0.0.1:27017/", "CampusConnect"),
    ("mongodb://127.0.0.1:27017/", "campusconnect"),
]

organizer = None
db = None
client = None

for mongodb_url, db_name in connection_attempts:
    try:
        print(f"🔍 Trying connection: {mongodb_url} -> {db_name}")
        client = MongoClient(mongodb_url)
        db = client[db_name]
        
        # Test connection
        db.command('ping')
        print(f"✅ Connected to MongoDB: {db_name}")
        
        # Check if users collection exists
        collections = db.list_collection_names()
        print(f"� Available collections: {collections}")
        
        if "users" in collections:
            # Try to find the organizer
            organizer = db.users.find_one({"username": "EMP001", "user_type": "organizer"})
            if organizer:
                print(f"✅ Found organizer EMP001 in database: {db_name}")
                break
            else:
                # List all organizers to see what's available
                organizers = list(db.users.find({"user_type": "organizer"}, {"username": 1, "password": 1}))
                print(f"📋 Found {len(organizers)} organizers in {db_name}:")
                for org in organizers:
                    password = org.get("password", "")
                    is_hashed = password.startswith("$2b$")
                    print(f"  - {org.get('username', 'N/A')}: {'✅ hashed' if is_hashed else '❌ plain'} ({password[:15]}...)")
                
                if organizers:
                    # Use the first organizer if EMP001 not found
                    organizer = organizers[0]
                    print(f"🔄 Using organizer: {organizer.get('username', 'N/A')}")
                    break
        else:
            print(f"❌ No 'users' collection found in {db_name}")
            
    except Exception as e:
        print(f"❌ Failed to connect to {mongodb_url} -> {db_name}: {e}")
        continue

if not organizer:
    
    if not organizer:
        print("❌ Organizer EMP001 not found")
        sys.exit(1)
    
    current_password = organizer.get("password", "")
    print(f"📋 Current password: {current_password}")
    
    # Check if already hashed
    if current_password.startswith("$2b$"):
        print("✅ Password is already hashed!")
        sys.exit(0)
    
    # Update with hashed password
    hashed_password = "$2b$12$OaFcCsL3JttQOsBeNs848eTruYZS.eTddMDx9SiiKHmC03W.29i.K"
    
    result = db.users.update_one(
        {"username": "EMP001"},
        {"$set": {"password": hashed_password}}
    )
    
    if result.modified_count > 0:
        print("✅ Successfully updated password for EMP001!")
        print(f"   New password hash: {hashed_password[:30]}...")
        
        # Verify the update
        updated_organizer = db.users.find_one({"username": "EMP001"})
        new_password = updated_organizer.get("password", "")
        print(f"✅ Verification: Password now starts with {new_password[:10]}...")
    else:
        print("❌ Failed to update password")
    
except Exception as e:
    print(f"❌ Error: {e}")
    print("💡 Try checking if MongoDB is running on localhost:27017")
    print("💡 Or adjust the MongoDB connection string in the script")
