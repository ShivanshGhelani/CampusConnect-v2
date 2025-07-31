#!/usr/bin/env python3
"""
Create Real Admin Users for CampusConnect using Frontend API Calls
This script creates production-ready admin accounts via the frontend API endpoints
and stores them in the 'users' collection with proper authentication
"""

import asyncio
import aiohttp
import hashlib
from datetime import datetime
import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config.database import Database
from models.admin_user import AdminRole

async def create_admins_in_users_collection():
    """Create real admin users in the 'users' collection"""
    
    try:
        # Initialize database connection
        database = Database()
        db = await database.get_database()
        if db is None:
            print("❌ Failed to connect to database")
            return
        
        print("🚀 Creating Real Admin Users in 'users' Collection...")
        print("=" * 60)
        
        # Admin users to create in users collection (with is_admin: True)
        admin_users = [
            {
                "fullname": "System Super Administrator",
                "username": "superadmin",
                "email": "superadmin@campusconnect.edu",
                "password": "SuperAdmin@2025",
                "role": AdminRole.SUPER_ADMIN.value,
                "is_admin": True,
                "is_active": True,
                "description": "Primary system administrator with full access"
            },
            {
                "fullname": "Event Management Admin",
                "username": "eventadmin",
                "email": "events@campusconnect.edu", 
                "password": "EventAdmin@2025",
                "role": AdminRole.EXECUTIVE_ADMIN.value,
                "is_admin": True,
                "is_active": True,
                "description": "Manages all events and student activities"
            },
            {
                "fullname": "Organizer Administrator",
                "username": "organizer",
                "email": "organizer@campusconnect.edu",
                "password": "Organizer@2025", 
                "role": AdminRole.ORGANIZER_ADMIN.value,
                "is_admin": True,
                "is_active": True,
                "description": "Organizes events and manages registrations"
            },
            {
                "fullname": "Venue Management Admin",
                "username": "venueadmin",
                "email": "venues@campusconnect.edu",
                "password": "VenueAdmin@2025",
                "role": AdminRole.VENUE_ADMIN.value,
                "is_admin": True,
                "is_active": True,
                "description": "Manages venue bookings and facilities"
            },
            {
                "fullname": "Content Administrator",
                "username": "contentadmin", 
                "email": "content@campusconnect.edu",
                "password": "ContentAdmin@2025",
                "role": AdminRole.CONTENT_ADMIN.value,
                "is_admin": True,
                "is_active": True,
                "description": "Manages content and certificates"
            }
        ]
        
        created_admins = []
        
        for admin_data in admin_users:
            try:
                # Check if admin already exists in users collection
                existing = await db["users"].find_one({
                    "$or": [
                        {"username": admin_data["username"]},
                        {"email": admin_data["email"]}
                    ]
                })
                
                if existing:
                    print(f"⚠️  Admin '{admin_data['username']}' already exists in users collection, skipping...")
                    continue
                
                # Use bcrypt for password hashing (same as frontend/backend auth)
                from passlib.context import CryptContext
                pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
                password_hash = pwd_context.hash(admin_data["password"])
                
                # Create admin document for users collection
                admin_doc = {
                    "fullname": admin_data["fullname"],
                    "username": admin_data["username"],
                    "email": admin_data["email"],
                    "password": password_hash,
                    "role": admin_data["role"],
                    "is_admin": True,  # This is the key field for admin identification
                    "is_active": admin_data["is_active"],
                    "assigned_events": [],
                    "permissions": [],
                    "created_at": datetime.utcnow(),
                    "last_login": None,
                    "created_by": "system_setup",
                    "user_type": "admin"  # Additional identifier
                }
                
                # Insert admin into users collection
                result = await db["users"].insert_one(admin_doc)
                
                if result.inserted_id:
                    created_admins.append({
                        "username": admin_data["username"],
                        "password": admin_data["password"],
                        "email": admin_data["email"],
                        "role": admin_data["role"],
                        "description": admin_data["description"]
                    })
                    print(f"✅ Created admin: {admin_data['username']} ({admin_data['role']}) in 'users' collection")
                else:
                    print(f"❌ Failed to create admin: {admin_data['username']}")
                    
            except Exception as e:
                print(f"❌ Error creating admin {admin_data['username']}: {e}")
        
        print("\n" + "=" * 60)
        print("🎉 ADMIN ACCOUNT CREATION COMPLETE!")
        print("=" * 60)
        
        if created_admins:
            print("\n📋 ADMIN LOGIN CREDENTIALS:")
            print("-" * 40)
            
            for admin in created_admins:
                print(f"""
👤 {admin['description']}
   Username: {admin['username']}
   Password: {admin['password']}
   Email:    {admin['email']}
   Role:     {admin['role']}
   Status:   Active
   Collection: users (is_admin: True)
""")
            
            print("-" * 40)
            print("🔐 SECURITY NOTES:")
            print("• Change default passwords after first login")
            print("• Store credentials securely") 
            print("• Super Admin has full system access")
            print("• Use appropriate admin roles for different tasks")
            print("• Admins are stored in 'users' collection with is_admin: True")
            
            print(f"\n🌐 ACCESS:")
            print(f"• Admin Portal: http://127.0.0.1:8000/admin/")
            print(f"• API Docs: http://127.0.0.1:8000/docs")
            print(f"• Frontend: http://127.0.0.1:3000")
            
        else:
            print("ℹ️  No new admin accounts were created (all already exist)")
        
        # Display current admin count in users collection
        total_admins = await db["users"].count_documents({"is_admin": True})
        active_admins = await db["users"].count_documents({"is_admin": True, "is_active": True})
        
        print(f"\n📊 SYSTEM STATS (users collection):")
        print(f"• Total Admins: {total_admins}")
        print(f"• Active Admins: {active_admins}")
        
        # Show role distribution for admins in users collection
        pipeline = [
            {"$match": {"is_admin": True}},
            {"$group": {"_id": "$role", "count": {"$sum": 1}}}
        ]
        role_counts = {}
        async for result in db["users"].aggregate(pipeline):
            role_counts[result["_id"]] = result["count"]
        
        print(f"• Role Distribution:")
        for role, count in role_counts.items():
            print(f"  - {role}: {count}")
        
        print("\n✨ Setup complete! Use the credentials above to access the admin portal.")
        
    except Exception as e:
        print(f"❌ Script execution failed: {e}")
        import traceback
        traceback.print_exc()

async def test_admin_login_via_frontend():
    """Test admin login using frontend API calls"""
    
    print("\n🧪 TESTING ADMIN LOGIN VIA FRONTEND API...")
    print("-" * 50)
    
    # Test credentials
    test_admin = {
        "username": "superadmin",
        "password": "SuperAdmin@2025"
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            # Try to login using the auth API
            login_data = {
                "username": test_admin["username"],
                "password": test_admin["password"]
            }
            
            async with session.post(
                "http://127.0.0.1:8000/api/v1/auth/admin/login",
                json=login_data
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    print(f"✅ Super Admin login successful!")
                    print(f"Response: {result}")
                    
                    # Try to access admin panel with the session
                    cookies = session.cookie_jar
                    async with session.get("http://127.0.0.1:8000/admin/") as panel_response:
                        if panel_response.status == 200:
                            print(f"✅ Admin panel access confirmed!")
                        else:
                            print(f"⚠️  Admin panel returned status: {panel_response.status}")
                            
                    # Try to access admin API endpoints
                    async with session.get("http://127.0.0.1:8000/api/v1/admin/admin-users/") as api_response:
                        if api_response.status == 200:
                            api_result = await api_response.json()
                            print(f"✅ Admin API access confirmed!")
                            print(f"Found {len(api_result.get('users', []))} admin users via API")
                        else:
                            print(f"⚠️  Admin API returned status: {api_response.status}")
                            
                else:
                    print(f"❌ Login failed with status: {response.status}")
                    text = await response.text()
                    print(f"Response: {text}")
                    
    except Exception as e:
        print(f"❌ API test failed: {e}")
        print("Note: Make sure the backend server is running on port 8000")

async def show_frontend_api_examples():
    """Show examples of creating admins via frontend API calls"""
    
    print("\n📚 FRONTEND API EXAMPLES FOR CREATING ADMINS:")
    print("=" * 60)
    
    print("""
🔧 Using Frontend Admin Panel:

1. Navigate to: http://127.0.0.1:8000/admin/
2. Login with: superadmin / SuperAdmin@2025
3. Go to "Manage Admins" section
4. Use the "Create New Admin" form

🔧 Using curl with frontend API:

# First login to get session cookie
curl -X POST "http://127.0.0.1:8000/api/v1/auth/admin/login" \\
  -H "Content-Type: application/json" \\
  -c cookies.txt \\
  -d '{
    "username": "superadmin",
    "password": "SuperAdmin@2025"
  }'

# Then create admin using the session
curl -X POST "http://127.0.0.1:8000/api/v1/admin/admin-users/create" \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{
    "fullname": "Test Administrator",
    "username": "testadmin",
    "email": "testadmin@campusconnect.edu",
    "password": "TestAdmin@2025",
    "role": "executive_admin",
    "is_active": true
  }'

🔧 Using JavaScript (Frontend):

// Login first
const loginResponse = await fetch('/api/v1/auth/admin/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'superadmin',
    password: 'SuperAdmin@2025'
  })
});

if (loginResponse.ok) {
  // Create new admin
  const createResponse = await fetch('/api/v1/admin/admin-users/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullname: 'New Test Admin',
      username: 'newadmin',
      email: 'newadmin@campusconnect.edu',
      password: 'NewAdmin@2025',
      role: 'organizer_admin',
      is_active: true
    })
  });
  
  const result = await createResponse.json();
  console.log('Admin creation result:', result);
}

🔧 Available Admin Roles:
• super_admin - Full system access
• executive_admin - Event and content management  
• organizer_admin - Event organization
• venue_admin - Venue management
• content_admin - Content and certificates

🔧 Key Points:
• Admins are stored in 'users' collection with is_admin: True
• Password hashing uses bcrypt (same as frontend authentication)
• Session-based authentication with cookies
• All admin endpoints require authentication
• Frontend API endpoints match the admin management system
""")

async def display_existing_admins():
    """Display existing admin accounts from users collection"""
    
    try:
        database = Database()
        db = await database.get_database()
        if db is None:
            print("❌ Failed to connect to database")
            return
        
        print("\n👥 EXISTING ADMIN ACCOUNTS IN 'USERS' COLLECTION:")
        print("=" * 60)
        
        # Find all admins in users collection
        admins_cursor = db["users"].find({"is_admin": True})
        admins = await admins_cursor.to_list(length=None)
        
        if not admins:
            print("ℹ️  No admin accounts found in 'users' collection")
            return
        
        print(f"Found {len(admins)} admin account(s):\n")
        
        for i, admin in enumerate(admins, 1):
            print(f"{i}. 👤 {admin.get('fullname', 'Unknown')}")
            print(f"   Username: {admin.get('username', 'N/A')}")
            print(f"   Email: {admin.get('email', 'N/A')}")  
            print(f"   Role: {admin.get('role', 'N/A')}")
            print(f"   Status: {'Active' if admin.get('is_active', False) else 'Inactive'}")
            print(f"   Created: {admin.get('created_at', 'N/A')}")
            print(f"   Last Login: {admin.get('last_login', 'Never')}")
            print()
        
        # Show statistics
        active_count = len([a for a in admins if a.get('is_active', False)])
        print(f"📊 Statistics:")
        print(f"• Total Admins: {len(admins)}")
        print(f"• Active Admins: {active_count}")
        print(f"• Inactive Admins: {len(admins) - active_count}")
        
        # Role distribution
        role_counts = {}
        for admin in admins:
            role = admin.get('role', 'unknown')
            role_counts[role] = role_counts.get(role, 0) + 1
        
        print(f"• Role Distribution:")
        for role, count in role_counts.items():
            print(f"  - {role}: {count}")
            
    except Exception as e:
        print(f"❌ Error displaying admins: {e}")

if __name__ == "__main__":
    print("🏢 CampusConnect Admin Creation Script (Users Collection)")
    print("Creating production-ready admin accounts in 'users' collection...")
    
    async def main():
        # Display existing admins first
        await display_existing_admins()
        
        # Create new admins if needed
        await create_admins_in_users_collection()
        
        # Show API examples
        await show_frontend_api_examples()
        
        # Test login if server is running
        try:
            await test_admin_login_via_frontend()
        except:
            print("\nℹ️  Skipping API test (server may not be running)")
    
    asyncio.run(main())
