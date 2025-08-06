#!/usr/bin/env python3
"""
Simple migration script to hash plain text passwords for organizer accounts.
"""

import asyncio
import sys
import os
from datetime import datetime

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def migrate_passwords():
    try:
        print("🔄 Starting organizer password migration...")
        print(f"⏰ Started at: {datetime.now()}")
        
        # Import after adding to path
        from config.database import get_database
        from routes.auth import get_password_hash
        
        print("✅ Imports successful")
        
        # Connect to database
        db = await get_database()
        print("✅ Database connected")
        
        # Find organizer accounts
        organizers = await db.users.find({"user_type": "organizer"}).to_list(length=None)
        print(f"📊 Found {len(organizers)} organizer accounts")
        
        if not organizers:
            print("ℹ️  No organizer accounts found")
            return
        
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
            return
        
        print(f"\\n🔐 Found {len(need_migration)} organizers with plain text passwords")
        
        # Migrate each one
        for org in need_migration:
            try:
                print(f"🔄 Migrating password for: {org['username']}")
                
                # Hash the password
                hashed_password = await get_password_hash(org["plain_password"])
                print(f"   Original: {org['plain_password']}")
                print(f"   Hashed: {hashed_password[:30]}...")
                
                # Update in database
                result = await db.users.update_one(
                    {"_id": org["_id"]},
                    {"$set": {"password": hashed_password}}
                )
                
                if result.modified_count > 0:
                    print(f"   ✅ Successfully updated password for {org['username']}")
                else:
                    print(f"   ❌ Failed to update password for {org['username']}")
                    
            except Exception as e:
                print(f"   ❌ Error migrating {org['username']}: {str(e)}")
        
        print(f"\\n🎉 Migration completed at: {datetime.now()}")
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(migrate_passwords())
