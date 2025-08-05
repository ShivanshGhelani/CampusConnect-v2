import asyncio
import sys
import os

# Add the project root to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from api.v1.admin.venues import get_venues

async def test_venues_api():
    try:
        result = await get_venues()
        print("API Response:")
        print(f"Success: {result.get('success')}")
        print(f"Message: {result.get('message')}")
        print(f"Data type: {type(result.get('data'))}")
        print(f"Data length: {len(result.get('data', []))}")
        print("Data content:")
        for venue in result.get('data', []):
            print(f"  - {venue}")
    except Exception as e:
        print(f"API Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_venues_api())
