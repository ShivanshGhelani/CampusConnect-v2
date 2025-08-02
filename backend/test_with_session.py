#!/usr/bin/env python3
"""
Test with session cookies from browser
"""

import asyncio
import aiohttp
import json

async def test_with_session():
    """Test endpoints with session cookie from browser"""
    
    # The session cookie from your browser request
    session_cookie = "eyJzdHVkZW50IjogeyJlbnJvbGxtZW50X25vIjogIjIyQ1NFQjEwMDU2IiwgImVtYWlsIjogImF1dG9ib3RteXJhQGdtYWlsLmNvbSIsICJtb2JpbGVfbm8iOiAiOTY2NDY2MzY0OSIsICJwYXNzd29yZF9oYXNoIjogIiQyYiQxMiRNWFNRdlpEcEJmLlA5U2hrd3J0Rjlld2xjcHFpZ1d0bm5QZ2JzT1R4SVczSFJZSDFBL2NheSIsICJmdWxsX25hbWUiOiAiUml5YSBTaGFybWEiLCAiZGVwYXJ0bWVudCI6ICJJbmZvcm1hdGlvbiBUZWNobm9sb2d5IiwgInNlbWVzdGVyIjogNywgImlzX2FjdGl2ZSI6IHRydWUsICJldmVudF9wYXJ0aWNpcGF0aW…IjogbnVsbCwgInBheW1lbnRfc3RhdHVzIjogbnVsbCwgInJlZ2lzdHJhdGlvbl9kYXRlIjogIjIwMjUtMDgtMDJUMDU6NTg6MDcuNDE1Mjg3IiwgInJlZ2lzdHJhdGlvbl90eXBlIjogImluZGl2aWR1YWwiLCAidGVhbV9uYW1lIjogbnVsbCwgInRlYW1fcmVnaXN0cmF0aW9uX2lkIjogbnVsbH19LCAiY3JlYXRlZF9hdCI6ICIyMDI1LTA2LTAxVDE2OjQ1OjU4LjU3MTAwMCIsICJsYXN0X2xvZ2luIjogIjIwMjUtMDgtMDFUMTc6MDQ6NTkuNDM1MDAwIiwgImRhdGVfb2ZfYmlydGgiOiAiMjAwNC0xMi0wOFQwMDowMDowMCIsICJnZW5kZXIiOiAiRmVtYWxlIn0sICJzdHVkZW50X2Vucm9sbG1lbnQiOiAiMjJDU0VCMTAwNTYifQ==.aI3Pug.zdPbER8p-hQctniW8kdGNFnpHfQ"
    
    headers = {
        "Cookie": f"session={session_cookie}",
        "Content-Type": "application/json"
    }
    
    base_url = "http://127.0.0.1:8000"
    
    async with aiohttp.ClientSession() as session:
        # Test auth endpoint first
        print("Testing auth endpoint...")
        auth_url = f"{base_url}/api/v1/client/profile/test-auth"
        
        try:
            async with session.get(auth_url, headers=headers) as response:
                print(f"Auth Status: {response.status}")
                text = await response.text()
                print(f"Auth Response: {text}")
        except Exception as e:
            print(f"Auth Error: {e}")
            
        print("\n" + "="*50 + "\n")
        
        # Test team-info endpoint
        print("Testing team-info endpoint...")
        team_url = f"{base_url}/api/v1/client/profile/team-info/STARTUP_PITCH_COMP_2025/TEAM500DB9"
        
        try:
            async with session.get(team_url, headers=headers) as response:
                print(f"Team Status: {response.status}")
                if response.status == 200:
                    data = await response.json()
                    print(f"Team Data: {json.dumps(data, indent=2)}")
                else:
                    text = await response.text()
                    print(f"Team Error: {text}")
        except Exception as e:
            print(f"Team Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_with_session())
