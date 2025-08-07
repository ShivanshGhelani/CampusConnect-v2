"""
Script to insert 20 sample university venues into the CampusConnect database
Run this script from the backend directory: python insert_venues.py
"""

import asyncio
import json
from datetime import datetime
from typing import List, Dict
import sys
import os

# Add the backend directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.operations import DatabaseOperations
from config.database import Database

async def load_venues_from_json(file_path: str) -> List[Dict]:
    """Load venues from JSON file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            venues = json.load(file)
        return venues
    except FileNotFoundError:
        print(f"Error: File {file_path} not found")
        return []
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}")
        return []

async def insert_venues_to_database(venues: List[Dict]) -> None:
    """Insert venues into the database"""
    try:
        # Connect to database
        await Database.connect_db()
        
        success_count = 0
        failed_count = 0
        
        for venue in venues:
            try:
                # Add timestamps
                current_time = datetime.utcnow()
                venue['created_at'] = current_time
                venue['updated_at'] = current_time
                
                # Insert venue into database
                result = await DatabaseOperations.insert_one("venues", venue)
                
                if result:
                    success_count += 1
                    print(f"✅ Inserted venue: {venue['name']}")
                else:
                    failed_count += 1
                    print(f"❌ Failed to insert venue: {venue['name']}")
                    
            except Exception as e:
                failed_count += 1
                print(f"❌ Error inserting venue {venue.get('name', 'Unknown')}: {e}")
        
        print(f"\n📊 Summary:")
        print(f"✅ Successfully inserted: {success_count} venues")
        print(f"❌ Failed insertions: {failed_count} venues")
        print(f"📝 Total venues processed: {len(venues)}")
        
    except Exception as e:
        print(f"❌ Database connection error: {e}")
    finally:
        # Close database connection
        await Database.close_db()

async def check_existing_venues() -> None:
    """Check if venues already exist in the database"""
    try:
        await Database.connect_db()
        
        # Count existing venues
        count = await DatabaseOperations.count_documents("venues")
        print(f"📋 Current venues in database: {count}")
        
        if count > 0:
            # Show some existing venues
            existing_venues = await DatabaseOperations.find_many("venues", limit=5)
            print(f"📝 Sample existing venues:")
            for venue in existing_venues:
                print(f"  - {venue.get('name', 'Unknown')} ({venue.get('venue_type', 'Unknown type')})")
        
    except Exception as e:
        print(f"❌ Error checking existing venues: {e}")

async def main():
    """Main function to run the venue insertion script"""
    print("🏛️  CampusConnect Venue Insertion Script")
    print("=" * 50)
    
    # Check existing venues first
    print("🔍 Checking existing venues...")
    await check_existing_venues()
    print()
    
    # Load venues from JSON
    venues_file = "venues.json"
    print(f"📂 Loading venues from {venues_file}...")
    venues = await load_venues_from_json(venues_file)
    
    if not venues:
        print("❌ No venues loaded. Exiting.")
        return
    
    print(f"📋 Loaded {len(venues)} venues from JSON file")
    print()
    
    # Confirm insertion
    response = input("🤔 Do you want to proceed with inserting these venues? (y/N): ")
    if response.lower() not in ['y', 'yes']:
        print("❌ Operation cancelled by user")
        return
    
    print()
    print("🚀 Starting venue insertion...")
    print("-" * 30)
    
    # Insert venues
    await insert_venues_to_database(venues)
    
    print()
    print("✅ Venue insertion process completed!")

if __name__ == "__main__":
    # Run the async main function
    asyncio.run(main())
