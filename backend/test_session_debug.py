#!/usr/bin/env python3
"""
Test to debug student session authentication
"""
import aiohttp
import asyncio
import json

async def test_student_session():
    """Test if student session is properly maintained"""
    
    base_url = "http://127.0.0.1:8000"
    
    async with aiohttp.ClientSession() as session:
        print("Testing student session authentication...")
        
        # First, let's try to access a simple student endpoint to see if auth works
        test_url = f"{base_url}/api/v1/client/profile/test-auth"
        
        print(f"Testing URL: {test_url}")
        
        try:
            async with session.get(test_url) as response:
                print(f"Status Code: {response.status}")
                text = await response.text()
                print(f"Response: {text[:500]}...")
                
        except Exception as e:
            print(f"Error: {e}")
            
        print("\n" + "="*50)
        
        # Now test the actual team-info endpoint
        event_id = "66ad7b31db99ed42a5080988"
        team_id = "1736194748808"
        team_url = f"{base_url}/api/v1/client/profile/team-info/{event_id}/{team_id}"
        
        print(f"Testing team-info URL: {team_url}")
        
        try:
            async with session.get(team_url) as response:
                print(f"Status Code: {response.status}")
                text = await response.text()
                print(f"Response: {text[:500]}...")
                
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_student_session())
