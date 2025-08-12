"""
Migration script to convert existing duplicated data to normalized format
"""
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from api.v1.client.registration.normalized_registration import migrate_existing_registrations

async def main():
    print("🚀 Starting Migration to Normalized Registration Storage")
    print("=" * 60)
    
    try:
        migration_count = await migrate_existing_registrations()
        
        print("\n" + "=" * 60)
        print(f"✅ Migration completed successfully!")
        print(f"📊 Migrated {migration_count} registrations to normalized format")
        print("🎯 Data duplication has been eliminated")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = asyncio.run(main())
    if success:
        print("\n🚀 Ready to switch to normalized endpoints!")
    else:
        print("\n⚠️  Please fix migration issues before proceeding.")
