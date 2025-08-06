#!/usr/bin/env python3
"""
Migration script to hash plain text passwords for organizer accounts.

This script finds organizer accounts in the users collection that have
plain text passwords and converts them to properly hashed passwords.
"""

import asyncio
import logging
from config.database import get_database
from routes.auth import get_password_hash
from passlib.context import CryptContext

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Password context for checking if password is already hashed
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def is_password_hashed(password: str) -> bool:
    """Check if a password is already hashed (bcrypt format)"""
    if not password:
        return False
    # bcrypt hashes start with $2a$, $2b$, $2x$, or $2y$
    return password.startswith(('$2a$', '$2b$', '$2x$', '$2y$'))

async def migrate_organizer_passwords():
    """Main migration function"""
    try:
        db = await get_database()
        
        # Find all organizer accounts in users collection
        logger.info("🔍 Finding organizer accounts in users collection...")
        organizers = await db.users.find({"user_type": "organizer"}).to_list(length=None)
        
        logger.info(f"📊 Found {len(organizers)} organizer accounts")
        
        if not organizers:
            logger.info("✅ No organizer accounts found to migrate")
            return
        
        # Check each organizer's password
        organizers_to_update = []
        
        for organizer in organizers:
            username = organizer.get("username", "Unknown")
            password = organizer.get("password", "")
            
            if not password:
                logger.warning(f"⚠️  Organizer {username} has no password field")
                continue
                
            if is_password_hashed(password):
                logger.info(f"✅ Organizer {username} already has hashed password")
            else:
                logger.warning(f"❌ Organizer {username} has plain text password: {password[:10]}...")
                organizers_to_update.append({
                    "username": username,
                    "_id": organizer["_id"],
                    "plain_password": password
                })
        
        if not organizers_to_update:
            logger.info("✅ All organizer passwords are already properly hashed")
            return
        
        logger.info(f"🔄 Need to hash passwords for {len(organizers_to_update)} organizers")
        
        # Ask for confirmation
        print(f"\n⚠️  IMPORTANT: This will hash plain text passwords for {len(organizers_to_update)} organizers:")
        for org in organizers_to_update:
            print(f"   - {org['username']} (password: {org['plain_password'][:10]}...)")
        
        confirm = input("\nDo you want to continue? (yes/no): ").strip().lower()
        if confirm not in ['yes', 'y']:
            logger.info("❌ Migration cancelled by user")
            return
        
        # Hash passwords and update database
        logger.info("🔐 Starting password hashing migration...")
        
        updated_count = 0
        for org in organizers_to_update:
            try:
                # Hash the plain text password
                hashed_password = await get_password_hash(org["plain_password"])
                
                # Update the database
                result = await db.users.update_one(
                    {"_id": org["_id"]},
                    {"$set": {"password": hashed_password}}
                )
                
                if result.modified_count > 0:
                    logger.info(f"✅ Updated password for organizer: {org['username']}")
                    logger.info(f"   Plain text: {org['plain_password']}")
                    logger.info(f"   Hashed: {hashed_password[:30]}...")
                    updated_count += 1
                else:
                    logger.error(f"❌ Failed to update password for organizer: {org['username']}")
                    
            except Exception as e:
                logger.error(f"❌ Error updating organizer {org['username']}: {str(e)}")
        
        logger.info(f"✅ Migration completed! Updated {updated_count}/{len(organizers_to_update)} organizer passwords")
        
        # Verify the migration
        logger.info("🔍 Verifying migration...")
        for org in organizers_to_update[:updated_count]:
            updated_organizer = await db.users.find_one({"_id": org["_id"]})
            if updated_organizer:
                new_password = updated_organizer.get("password", "")
                if is_password_hashed(new_password):
                    logger.info(f"✅ Verified: {org['username']} now has hashed password")
                else:
                    logger.error(f"❌ Verification failed: {org['username']} still has plain text password")
        
        logger.info("🎉 Password migration completed successfully!")
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {str(e)}")
        raise

if __name__ == "__main__":
    asyncio.run(migrate_organizer_passwords())
