#!/usr/bin/env python3
"""
Test Frontend Admin Management API Endpoints
Verify that the newly created admins work with the frontend admin management system
"""

import asyncio
import aiohttp
import json

async def test_admin_management_apis():
    """Test the admin management APIs with proper authentication"""
    
    print("🧪 TESTING FRONTEND ADMIN MANAGEMENT APIs")
    print("=" * 60)
    
    # Test login credentials  
    super_admin = {
        "username": "superadmin",
        "password": "SuperAdmin@2025"
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            print("1️⃣  Testing Admin Login...")
            
            # Login as super admin
            login_response = await session.post(
                "http://127.0.0.1:8000/api/v1/auth/admin/login",
                json=super_admin
            )
            
            if login_response.status == 200:
                login_result = await login_response.json()
                print(f"✅ Login successful: {login_result['message']}")
                print(f"   User: {login_result['user']['fullname']} ({login_result['user']['role']})")
                
                print("\n2️⃣  Testing Admin List API...")
                
                # Test the admin list API (this should now work)
                admins_response = await session.get(
                    "http://127.0.0.1:8000/api/v1/admin/admin-users/"
                )
                
                if admins_response.status == 200:
                    admins_result = await admins_response.json()
                    print(f"✅ Admin list API successful!")
                    
                    if "users" in admins_result:
                        admin_users = admins_result["users"]
                        print(f"   Found {len(admin_users)} admin users:")
                        
                        for admin in admin_users:
                            print(f"   • {admin.get('fullname', 'N/A')} ({admin.get('username', 'N/A')}) - {admin.get('role', 'N/A')}")
                    else:
                        print(f"   API Response: {admins_result}")
                        
                else:
                    print(f"❌ Admin list API failed with status: {admins_response.status}")
                    error_text = await admins_response.text()
                    print(f"   Error: {error_text}")
                
                print("\n3️⃣  Testing Create Admin API...")
                
                # Test creating a new admin via API
                new_admin_data = {
                    "fullname": "Test API Admin",
                    "username": "testapiadmin",
                    "email": "testapi@campusconnect.edu",
                    "password": "TestAPI@2025",
                    "role": "organizer_admin",
                    "is_active": True
                }
                
                create_response = await session.post(
                    "http://127.0.0.1:8000/api/v1/admin/admin-users/create",
                    json=new_admin_data
                )
                
                if create_response.status == 200:
                    create_result = await create_response.json()
                    print(f"✅ Create admin API successful!")
                    print(f"   Result: {create_result['message']}")
                else:
                    print(f"❌ Create admin API failed with status: {create_response.status}")
                    error_text = await create_response.text()
                    print(f"   Error: {error_text}")
                
                print("\n4️⃣  Testing Other Admin Authentication...")
                
                # Test login with one of the newly created admins
                event_admin = {
                    "username": "eventadmin", 
                    "password": "EventAdmin@2025"
                }
                
                event_login_response = await session.post(
                    "http://127.0.0.1:8000/api/v1/auth/admin/login",
                    json=event_admin
                )
                
                if event_login_response.status == 200:
                    event_result = await event_login_response.json()
                    print(f"✅ Event Admin login successful!")
                    print(f"   User: {event_result['user']['fullname']} ({event_result['user']['role']})")
                else:
                    print(f"❌ Event Admin login failed with status: {event_login_response.status}")
                    error_text = await event_login_response.text()
                    print(f"   Error: {error_text}")
                
            else:
                print(f"❌ Super Admin login failed with status: {login_response.status}")
                error_text = await login_response.text()
                print(f"   Error: {error_text}")
                
    except Exception as e:
        print(f"❌ Test execution failed: {e}")
        import traceback
        traceback.print_exc()

async def show_all_admin_credentials():
    """Display all available admin credentials for easy access"""
    
    print("\n📋 ALL ADMIN CREDENTIALS FOR TESTING:")
    print("=" * 60)
    
    admins = [
        {
            "title": "🔥 Super Administrator",
            "username": "superadmin",
            "password": "SuperAdmin@2025", 
            "role": "super_admin",
            "description": "Full system access - can manage all admins"
        },
        {
            "title": "📅 Event Administrator", 
            "username": "eventadmin",
            "password": "EventAdmin@2025",
            "role": "executive_admin", 
            "description": "Manages all events and student activities"
        },
        {
            "title": "🎯 Organizer Administrator",
            "username": "organizer", 
            "password": "Organizer@2025",
            "role": "organizer_admin",
            "description": "Organizes events and manages registrations"
        },
        {
            "title": "🏢 Venue Administrator",
            "username": "venueadmin",
            "password": "VenueAdmin@2025", 
            "role": "venue_admin",
            "description": "Manages venue bookings and facilities"
        },
        {
            "title": "📝 Content Administrator", 
            "username": "contentadmin",
            "password": "ContentAdmin@2025",
            "role": "content_admin", 
            "description": "Manages content and certificates"
        },
        {
            "title": "👑 Original Admin (Existing)",
            "username": "SHIV9090",
            "password": "[Your existing password]",
            "role": "super_admin",
            "description": "Original admin account"
        }
    ]
    
    for admin in admins:
        print(f"{admin['title']}")
        print(f"   Username: {admin['username']}")
        print(f"   Password: {admin['password']}")
        print(f"   Role: {admin['role']}")
        print(f"   Description: {admin['description']}")
        print()
    
    print("🌐 ACCESS URLS:")
    print("• Admin Portal: http://127.0.0.1:8000/admin/")
    print("• API Documentation: http://127.0.0.1:8000/docs") 
    print("• Frontend: http://127.0.0.1:3000")
    print("• Admin Management: http://127.0.0.1:8000/admin/manage-admin")
    
    print("\n🔧 API ENDPOINTS TO TEST:")
    print("• POST /api/v1/auth/admin/login - Admin login")
    print("• GET  /api/v1/admin/admin-users/ - List all admins")
    print("• POST /api/v1/admin/admin-users/create - Create new admin")
    print("• GET  /api/v1/admin/admin-users/me - Get current admin profile")
    print("• GET  /api/v1/admin/admin-users/roles/available - Get available roles")

if __name__ == "__main__":
    async def main():
        await show_all_admin_credentials()
        await test_admin_management_apis()
    
    asyncio.run(main())
