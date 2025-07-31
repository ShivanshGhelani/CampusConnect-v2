#!/usr/bin/env python3
"""
Display Existing Admin Credentials
Shows the current admin accounts for CampusConnect
"""

import asyncio
import hashlib
from datetime import datetime
import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config.database import Database

async def show_existing_admins():
    """Display existing admin accounts and their credentials"""
    
    try:
        # Initialize database connection
        database = Database()
        db = await database.get_database()
        if db is None:
            print("❌ Failed to connect to database")
            return
        
        print("🔐 EXISTING ADMIN ACCOUNTS")
        print("=" * 60)
        
        # Get all admin users
        cursor = db["admin_users"].find({}, {"password": 0}).sort("created_at", 1)
        admins = await cursor.to_list(length=None)
        
        if not admins:
            print("ℹ️  No admin accounts found in the system")
            return
        
        # Default passwords (since these were created by the script)
        default_passwords = {
            "superadmin": "SuperAdmin@2025",
            "eventadmin": "EventAdmin@2025", 
            "organizer": "Organizer@2025",
            "venueadmin": "VenueAdmin@2025",
            "contentadmin": "ContentAdmin@2025"
        }
        
        print(f"📋 FOUND {len(admins)} ADMIN ACCOUNTS:")
        print("-" * 60)
        
        for i, admin in enumerate(admins, 1):
            username = admin['username']
            password = default_passwords.get(username, "Ask system administrator")
            
            role_descriptions = {
                "super_admin": "Full system administrator access",
                "executive_admin": "Event and content management", 
                "organizer_admin": "Event organization and management",
                "venue_admin": "Venue booking and facility management",
                "content_admin": "Content and certificate management",
                "event_admin": "Specific event management"
            }
            
            description = role_descriptions.get(admin['role'], admin['role'])
            status = "🟢 Active" if admin.get('is_active', True) else "🔴 Inactive"
            
            print(f"""
{i}. 👤 {admin['fullname']}
   Username:  {username}
   Password:  {password}
   Email:     {admin['email']}
   Role:      {admin['role']} 
   Purpose:   {description}
   Status:    {status}
   Created:   {admin.get('created_at', 'Unknown')}
""")
        
        print("-" * 60)
        print("🌐 ACCESS POINTS:")
        print(f"• Admin Portal: http://127.0.0.1:8000/admin/")
        print(f"• API Documentation: http://127.0.0.1:8000/docs")
        print(f"• Frontend: http://127.0.0.1:3000")
        
        print("\n🔧 QUICK LOGIN TEST:")
        print("Use these credentials to test login:")
        print(f"Primary Admin - Username: superadmin, Password: {default_passwords['superadmin']}")
        
        return admins
        
    except Exception as e:
        print(f"❌ Error retrieving admin accounts: {e}")
        import traceback
        traceback.print_exc()

async def test_admin_authentication():
    """Test admin authentication with correct endpoint"""
    import aiohttp
    
    print("\n🧪 TESTING ADMIN AUTHENTICATION...")
    print("-" * 40)
    
    try:
        async with aiohttp.ClientSession() as session:
            # Test login with form data (not JSON)
            login_data = aiohttp.FormData()
            login_data.add_field('username', 'superadmin')
            login_data.add_field('password', 'SuperAdmin@2025')
            
            # Try the correct admin login endpoint
            async with session.post(
                "http://127.0.0.1:8000/auth/admin/login",
                data=login_data
            ) as response:
                print(f"Login Response Status: {response.status}")
                
                if response.status == 200:
                    print("✅ Authentication successful!")
                    
                    # Check if we can access admin panel
                    async with session.get("http://127.0.0.1:8000/admin/") as admin_response:
                        print(f"Admin Panel Status: {admin_response.status}")
                        if admin_response.status == 200:
                            print("✅ Admin panel access confirmed!")
                        else:
                            print("⚠️  Admin panel access issue")
                            
                elif response.status == 302:
                    print("✅ Authentication successful (redirect response)!")
                    location = response.headers.get('Location', 'Unknown')
                    print(f"Redirected to: {location}")
                    
                else:
                    text = await response.text()
                    print(f"❌ Authentication failed")
                    print(f"Response: {text[:200]}...")
                    
    except aiohttp.ClientConnectorError:
        print("❌ Cannot connect to server. Make sure it's running on port 8000")
        print("Start server with: uvicorn main:app --reload --port 8000")
    except Exception as e:
        print(f"❌ Test failed: {e}")

async def create_api_test_script():
    """Create a test script for API calls"""
    
    api_test_script = '''#!/usr/bin/env python3
"""
Admin API Test Script
Test admin creation and management via API calls
"""

import requests
import json

def test_admin_api():
    """Test admin API endpoints"""
    
    base_url = "http://127.0.0.1:8000"
    
    # Create session for maintaining cookies
    session = requests.Session()
    
    print("🔐 Testing Admin Login...")
    
    # Step 1: Login as super admin
    login_data = {
        "username": "superadmin", 
        "password": "SuperAdmin@2025"
    }
    
    login_response = session.post(
        f"{base_url}/auth/admin/login",
        data=login_data  # Use form data, not JSON
    )
    
    print(f"Login Status: {login_response.status_code}")
    
    if login_response.status_code in [200, 302]:
        print("✅ Login successful!")
        
        # Step 2: Create a new admin via API
        print("\\n👤 Creating new admin via API...")
        
        new_admin_data = {
            "fullname": "API Test Administrator",
            "username": "apitestadmin",
            "email": "apitest@campusconnect.edu",
            "password": "APITest@2025",
            "role": "executive_admin",
            "is_active": True
        }
        
        create_response = session.post(
            f"{base_url}/api/v1/admin/admin-users/create",
            json=new_admin_data
        )
        
        print(f"Create Admin Status: {create_response.status_code}")
        
        if create_response.status_code == 200:
            result = create_response.json()
            print("✅ Admin created successfully!")
            print(f"New admin username: {result.get('username')}")
            print(f"New admin role: {result.get('role')}")
            
            print("\\n📋 NEW ADMIN CREDENTIALS:")
            print(f"Username: {new_admin_data['username']}")
            print(f"Password: {new_admin_data['password']}")
            print(f"Email: {new_admin_data['email']}")
            print(f"Role: {new_admin_data['role']}")
            
        else:
            print(f"❌ Admin creation failed")
            print(f"Response: {create_response.text}")
            
        # Step 3: List all admins
        print("\\n📜 Fetching all admins...")
        
        list_response = session.get(f"{base_url}/api/v1/admin/admin-users/")
        
        if list_response.status_code == 200:
            admins_data = list_response.json()
            print(f"✅ Found {admins_data['total_count']} total admins")
            
            for admin in admins_data['admins']:
                print(f"  - {admin['username']} ({admin['role']}) - {admin['fullname']}")
        else:
            print(f"❌ Failed to fetch admins: {list_response.status_code}")
            
    else:
        print(f"❌ Login failed: {login_response.text}")

if __name__ == "__main__":
    test_admin_api()
'''
    
    with open("test_admin_api.py", "w") as f:
        f.write(api_test_script)
    
    print("\n📝 Created test_admin_api.py script")
    print("Run with: python test_admin_api.py")

if __name__ == "__main__":
    async def main():
        admins = await show_existing_admins()
        await test_admin_authentication()
        await create_api_test_script()
    
    asyncio.run(main())
