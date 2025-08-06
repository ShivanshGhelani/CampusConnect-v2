#!/usr/bin/env python3
"""
Direct MongoDB Atlas update for organizer password hashing
"""

import os
import sys
from pymongo import MongoClient

# MongoDB Atlas connection from .env
MONGODB_URL = ""
DB_NAME = "CampusConnect"

try:
    print("🔍 Connecting to MongoDB Atlas...")
    client = MongoClient(MONGODB_URL)
    db = client[DB_NAME]
    
    # Test connection
    db.command('ping')
    print("✅ Connected to MongoDB Atlas successfully")
    
    # Check available collections
    collections = db.list_collection_names()
    print(f"📚 Available collections: {collections}")
    
    if "users" not in collections:
        print("❌ 'users' collection not found")
        sys.exit(1)
    
    # Find all organizers with plain text passwords
    organizers = list(db.users.find({"user_type": "organizer"}))
    print(f"📊 Found {len(organizers)} organizer accounts")
    
    if not organizers:
        print("ℹ️  No organizer accounts found")
        sys.exit(0)
    
    # Check which ones need migration
    need_migration = []
    
    for org in organizers:
        username = org.get("username", "Unknown")
        password = org.get("password", "")
        
        # Check if password is already hashed (bcrypt format)
        is_hashed = password.startswith(('$2a$', '$2b$', '$2x$', '$2y$'))
        
        print(f"  - {username}: {'✅ Already hashed' if is_hashed else '❌ Plain text'} ({password[:15]}...)")
        
        if not is_hashed and password:
            need_migration.append({
                "_id": org["_id"],
                "username": username,
                "plain_password": password
            })
    
    if not need_migration:
        print("✅ All organizer passwords are already properly hashed!")
        sys.exit(0)
    
    print(f"\n🔐 Found {len(need_migration)} organizers with plain text passwords:")
    for org in need_migration:
        print(f"  - {org['username']}: {org['plain_password']}")
    
    # For each organizer, hash their password
    for org in need_migration:
        username = org['username']
        plain_password = org['plain_password']
        
        print(f"\n🔄 Processing organizer: {username}")
        print(f"   Plain password: {plain_password}")
        
        # Generate the hashed password using bcrypt
        import bcrypt
        password_bytes = plain_password.encode('utf-8')
        salt = bcrypt.gensalt(rounds=12)
        hashed_password = bcrypt.hashpw(password_bytes, salt)
        hashed_string = hashed_password.decode('utf-8')
        
        print(f"   Hashed password: {hashed_string[:30]}...")
        
        # Verify the hash works
        is_valid = bcrypt.checkpw(password_bytes, hashed_password)
        print(f"   Hash verification: {'✅ SUCCESS' if is_valid else '❌ FAILED'}")
        
        if not is_valid:
            print(f"   ⚠️  Skipping {username} due to hash verification failure")
            continue
        
        # Update in database
        result = db.users.update_one(
            {"_id": org["_id"]},
            {"$set": {"password": hashed_string}}
        )
        
        if result.modified_count > 0:
            print(f"   ✅ Successfully updated password for {username}")
            
            # Verify the update in database
            updated_organizer = db.users.find_one({"_id": org["_id"]})
            new_password = updated_organizer.get("password", "")
            if new_password.startswith("$2b$"):
                print(f"   ✅ Database verification: Password properly hashed")
            else:
                print(f"   ❌ Database verification: Password not properly updated")
        else:
            print(f"   ❌ Failed to update password for {username}")
    
    print(f"\n🎉 Password migration completed!")
    
    # Final verification - check all organizers again
    print(f"\n🔍 Final verification:")
    final_organizers = list(db.users.find({"user_type": "organizer"}))
    all_hashed = True
    
    for org in final_organizers:
        username = org.get("username", "Unknown")
        password = org.get("password", "")
        is_hashed = password.startswith(('$2a$', '$2b$', '$2x$', '$2y$'))
        
        print(f"  - {username}: {'✅ Hashed' if is_hashed else '❌ Plain text'}")
        if not is_hashed:
            all_hashed = False
    
    if all_hashed:
        print("🎉 SUCCESS: All organizer passwords are now properly hashed!")
    else:
        print("⚠️  WARNING: Some organizer passwords are still not hashed")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    if 'client' in locals():
        client.close()
        print("📝 Closed MongoDB connection")
 