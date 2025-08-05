import asyncio
import json
from datetime import datetime

# Simple test to verify venue API responses
async def test_venue_serialization():
    try:
        from config.database import Database
        await Database.connect_db()
        
        # Import the API functions
        import sys
        import os
        sys.path.append(os.path.dirname(os.path.abspath(__file__)))
        
        from api.v1.admin.venues import get_venues
        
        # Test the get_venues API
        result = await get_venues()
        
        print("=== VENUE API TEST ===")
        print(f"Success: {result.get('success')}")
        print(f"Message: {result.get('message')}")
        print(f"Data type: {type(result.get('data'))}")
        
        # Test JSON serialization
        try:
            json_str = json.dumps(result, indent=2)
            print("✅ JSON serialization successful!")
            print("Sample venue data:")
            if result.get('data') and len(result.get('data', [])) > 0:
                venue = result['data'][0]
                print(f"  - ID: {venue.get('venue_id')}")
                print(f"  - Name: {venue.get('name')}")
                print(f"  - Type: {venue.get('venue_type')}")
                print(f"  - Active: {venue.get('is_active')}")
                print(f"  - Created: {venue.get('created_at')}")
                print(f"  - Updated: {venue.get('updated_at')}")
            else:
                print("  No venues found in database")
        except Exception as e:
            print(f"❌ JSON serialization failed: {e}")
        
        await Database.close_db()
        
    except Exception as e:
        print(f"Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_venue_serialization())
