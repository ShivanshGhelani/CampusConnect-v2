#!/usr/bin/env python3
"""
Test Team Info Endpoint Directly
"""

import asyncio
import aiohttp
import json

async def test_team_info_endpoint():
    """Test the team-info endpoint directly"""
    
    # Test the modified endpoint that handles auth gracefully
    regular_url = "http://127.0.0.1:8000/api/v1/client/profile/team-info/STARTUP_PITCH_COMP_2025/TEAM500DB9"
    
    print(f"Testing MODIFIED endpoint: {regular_url}")
    
    try:
        async with aiohttp.ClientSession() as session:
            # Test modified endpoint (should work without strict auth)
            async with session.get(regular_url) as response:
                print(f"Modified Status Code: {response.status}")
                print(f"Modified Headers: {dict(response.headers)}")
                
                if response.status == 200:
                    try:
                        data = await response.json()
                        print(f"Modified Response Data: {json.dumps(data, indent=2)}")
                    except Exception as json_error:
                        text = await response.text()
                        print(f"Failed to parse JSON. Raw response: {text[:500]}...")
                        print(f"JSON Error: {json_error}")
                else:
                    text = await response.text()
                    print(f"Modified Error Response: {text}")
                    
    except aiohttp.ClientError as e:
        print(f"Request failed: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")

if __name__ == "__main__":
    asyncio.run(test_team_info_endpoint())
