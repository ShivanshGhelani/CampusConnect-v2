#!/usr/bin/env python3

import asyncio
import aiohttp
import json

async def test_frontend_api_call():
    """Test the exact API call that frontend makes with real credentials"""
    
    print("🔍 Testing frontend API call with real credentials...")
    
    # Use the credentials from passwords.txt
    enrollment_no = "22BEIT30043"
    password = "Shiv@2808"
    
    async with aiohttp.ClientSession() as session:
        try:
            # Step 1: Login to get token
            print("1️⃣ Logging in...")
            login_data = {
                "enrollment_no": enrollment_no,
                "password": password
            }
            
            async with session.post('http://localhost:8000/api/v1/auth/student/login', json=login_data) as resp:
                print(f"Login response status: {resp.status}")
                login_result = await resp.json()
                print(f"Login result: {login_result}")
                
                if resp.status != 200 or not login_result.get('access_token'):
                    print("❌ Login failed, cannot proceed with test")
                    return
                
                token = login_result['access_token']
                headers = {'Authorization': f'Bearer {token}'}
                print("✅ Login successful!")
                
                # Step 2: First register for an event
                print("2️⃣ Registering for event...")
                reg_data = {
                    "event_id": "CCDCOSTU2025",
                    "registration_type": "individual"
                }
                
                async with session.post('http://localhost:8000/api/v1/client/registration/register', 
                                      json=reg_data, headers=headers) as reg_resp:
                    reg_result = await reg_resp.json()
                    print(f"Registration status: {reg_resp.status}")
                    print(f"Registration result: {reg_result}")
                    
                    # Step 3: Now try to cancel - this should reproduce the error
                    print("3️⃣ Cancelling registration...")
                    async with session.delete('http://localhost:8000/api/v1/client/registration/cancel/CCDCOSTU2025', 
                                            headers=headers) as cancel_resp:
                        print(f"Cancel response status: {cancel_resp.status}")
                        cancel_result = await cancel_resp.json()
                        print(f"Cancel result: {cancel_result}")
                        
                        # Check the server logs for the error
                        print("✅ API call completed - check server logs for the 'deleted_count' error")
                        
        except Exception as e:
            print(f"❌ Error during API test: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_frontend_api_call())
