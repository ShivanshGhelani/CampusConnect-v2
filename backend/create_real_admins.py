#!/usr/bin/env python3
"""
Create Real Admin Users for CampusConnect
This script creates production-ready admin accounts with proper authentication
"""

import asyncio
import hashlib
from datetime import datetime
import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config.database import Database
from models.admin_user import AdminRole

async def create_real_admins():
    """Create real admin users for the system"""
    
    try:
        # Initialize database connection
        database = Database()
        db = await database.get_database()
        if db is None:
            print("❌ Failed to connect to database")
            return
        
        print("🚀 Creating Real Admin Users for CampusConnect...")
        print("=" * 60)
        
        # Admin users to create
        admin_users = [
            {
                "fullname": "System Super Administrator",
                "username": "superadmin",
                "email": "superadmin@campusconnect.edu",
                "password": "SuperAdmin@2025",
                "role": AdminRole.SUPER_ADMIN.value,
                "is_active": True,
                "description": "Primary system administrator with full access"
            },
            {
                "fullname": "Event Management Admin",
                "username": "eventadmin",
                "email": "events@campusconnect.edu", 
                "password": "EventAdmin@2025",
                "role": AdminRole.EXECUTIVE_ADMIN.value,
                "is_active": True,
                "description": "Manages all events and student activities"
            },
            {
                "fullname": "Organizer Administrator",
                "username": "organizer",
                "email": "organizer@campusconnect.edu",
                "password": "Organizer@2025", 
                "role": AdminRole.ORGANIZER_ADMIN.value,
                "is_active": True,
                "description": "Organizes events and manages registrations"
            },
            {
                "fullname": "Venue Management Admin",
                "username": "venueadmin",
                "email": "venues@campusconnect.edu",
                "password": "VenueAdmin@2025",
                "role": AdminRole.VENUE_ADMIN.value,
                "is_active": True,
                "description": "Manages venue bookings and facilities"
            },
            {
                "fullname": "Content Administrator",
                "username": "contentadmin", 
                "email": "content@campusconnect.edu",
                "password": "ContentAdmin@2025",
                "role": AdminRole.CONTENT_ADMIN.value,
                "is_active": True,
                "description": "Manages content and certificates"
            }
        ]
        
        created_admins = []
        
        for admin_data in admin_users:
            try:
                # Check if admin already exists
                existing = await db["admin_users"].find_one({
                    "$or": [
                        {"username": admin_data["username"]},
                        {"email": admin_data["email"]}
                    ]
                })
                
                if existing:
                    print(f"⚠️  Admin '{admin_data['username']}' already exists, skipping...")
                    continue
                
                # Hash password
                password_hash = hashlib.sha256(admin_data["password"].encode()).hexdigest()
                
                # Create admin document
                admin_doc = {
                    "fullname": admin_data["fullname"],
                    "username": admin_data["username"],
                    "email": admin_data["email"],
                    "password": password_hash,
                    "role": admin_data["role"],
                    "is_active": admin_data["is_active"],
                    "assigned_events": [],
                    "permissions": [],
                    "created_at": datetime.utcnow(),
                    "last_login": None,
                    "created_by": "system_setup"
                }
                
                # Insert admin
                result = await db["admin_users"].insert_one(admin_doc)
                
                if result.inserted_id:
                    created_admins.append({
                        "username": admin_data["username"],
                        "password": admin_data["password"],
                        "email": admin_data["email"],
                        "role": admin_data["role"],
                        "description": admin_data["description"]
                    })
                    print(f"✅ Created admin: {admin_data['username']} ({admin_data['role']})")
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
""")
            
            print("-" * 40)
            print("🔐 SECURITY NOTES:")
            print("• Change default passwords after first login")
            print("• Store credentials securely") 
            print("• Super Admin has full system access")
            print("• Use appropriate admin roles for different tasks")
            
            print(f"\n🌐 ACCESS:")
            print(f"• Admin Portal: http://127.0.0.1:8000/admin/")
            print(f"• API Docs: http://127.0.0.1:8000/docs")
            print(f"• Frontend: http://127.0.0.1:3000")
            
        else:
            print("ℹ️  No new admin accounts were created (all already exist)")
        
        # Display current admin count
        total_admins = await db["admin_users"].count_documents({})
        active_admins = await db["admin_users"].count_documents({"is_active": True})
        
        print(f"\n📊 SYSTEM STATS:")
        print(f"• Total Admins: {total_admins}")
        print(f"• Active Admins: {active_admins}")
        
        # Show role distribution
        pipeline = [{"$group": {"_id": "$role", "count": {"$sum": 1}}}]
        role_counts = {}
        async for result in db["admin_users"].aggregate(pipeline):
            role_counts[result["_id"]] = result["count"]
        
        print(f"• Role Distribution:")
        for role, count in role_counts.items():
            print(f"  - {role}: {count}")
        
        print("\n✨ Setup complete! Use the credentials above to access the admin portal.")
        
    except Exception as e:
        print(f"❌ Script execution failed: {e}")
        import traceback
        traceback.print_exc()

async def test_admin_login_api():
    """Test admin login using API calls"""
    import aiohttp
    
    print("\n🧪 TESTING ADMIN LOGIN VIA API...")
    print("-" * 40)
    
    # Test credentials
    test_admin = {
        "username": "superadmin",
        "password": "SuperAdmin@2025"
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            # Try to login
            login_data = {
                "username": test_admin["username"],
                "password": test_admin["password"]
            }
            
            async with session.post(
                "http://127.0.0.1:8000/auth/admin/login",
                data=login_data
            ) as response:
                if response.status == 200:
                    print(f"✅ Super Admin login successful!")
                    
                    # Try to access admin panel
                    async with session.get("http://127.0.0.1:8000/admin/") as panel_response:
                        if panel_response.status == 200:
                            print(f"✅ Admin panel access confirmed!")
                        else:
                            print(f"⚠️  Admin panel returned status: {panel_response.status}")
                            
                else:
                    print(f"❌ Login failed with status: {response.status}")
                    text = await response.text()
                    print(f"Response: {text}")
                    
    except Exception as e:
        print(f"❌ API test failed: {e}")
        print("Note: Make sure the backend server is running on port 8000")

async def show_api_examples():
    """Show examples of API calls for creating admins"""
    
    print("\n📚 API EXAMPLES FOR CREATING ADMINS:")
    print("=" * 50)
    
    print("""
🔧 Using curl to create a new admin:

curl -X POST "http://127.0.0.1:8000/api/v1/admin/admin-users/create" \\
  -H "Content-Type: application/json" \\
  -b "session=your_session_cookie" \\
  -d '{
    "fullname": "Test Administrator",
    "username": "testadmin",
    "email": "testadmin@campusconnect.edu",
    "password": "TestAdmin@2025",
    "role": "executive_admin",
    "is_active": true
  }'

🔧 Using Python requests:

import requests

# First login as super admin
login_data = {
    "username": "superadmin",
    "password": "SuperAdmin@2025"
}

session = requests.Session()
login_response = session.post(
    "http://127.0.0.1:8000/auth/admin/login",
    data=login_data
)

if login_response.status_code == 200:
    # Create new admin
    admin_data = {
        "fullname": "New Test Admin",
        "username": "newadmin",
        "email": "newadmin@campusconnect.edu", 
        "password": "NewAdmin@2025",
        "role": "organizer_admin",
        "is_active": True
    }
    
    create_response = session.post(
        "http://127.0.0.1:8000/api/v1/admin/admin-users/create",
        json=admin_data
    )
    
    print(f"Admin creation status: {create_response.status_code}")
    print(f"Response: {create_response.json()}")

🔧 Available Admin Roles:
• super_admin - Full system access
• executive_admin - Event and content management
• organizer_admin - Event organization
• venue_admin - Venue management  
• content_admin - Content and certificates
• event_admin - Specific event management
""")

if __name__ == "__main__":
    print("🏢 CampusConnect Admin Creation Script")
    print("Creating production-ready admin accounts...")
    
    async def main():
        await create_real_admins()
        await show_api_examples()
        
        # Test login if server is running
        try:
            await test_admin_login_api()
        except:
            print("\nℹ️  Skipping API test (server may not be running)")
    
    asyncio.run(main())
