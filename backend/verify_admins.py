#!/usr/bin/env python3
"""
Simple Admin Verification Script
Checks the admin accounts we created and provides credentials for manual testing
"""

import asyncio
from config.database import Database

async def verify_admin_accounts():
    """Verify admin accounts in both collections and show credentials"""
    
    try:
        # Initialize database connection
        database = Database()
        db = await database.get_database()
        if db is None:
            print("❌ Failed to connect to database")
            return
        
        print("🔍 VERIFYING ADMIN ACCOUNTS")
        print("=" * 60)
        
        # Check users collection (correct location)
        print("\n1️⃣  ADMINS IN 'users' COLLECTION (Correct Location):")
        print("-" * 50)
        
        users_admins = await db["users"].find({"is_admin": True}).to_list(length=None)
        
        if users_admins:
            print(f"Found {len(users_admins)} admin(s):")
            for i, admin in enumerate(users_admins, 1):
                print(f"  {i}. {admin.get('fullname', 'N/A')} (@{admin.get('username', 'N/A')}) - {admin.get('role', 'N/A')}")
        else:
            print("  No admins found in users collection")
        
        # Check admin_users collection (legacy)
        print("\n2️⃣  ADMINS IN 'admin_users' COLLECTION (Legacy Location):")
        print("-" * 50)
        
        admin_users_admins = await db["admin_users"].find({}).to_list(length=None)
        
        if admin_users_admins:
            print(f"Found {len(admin_users_admins)} admin(s):")
            for i, admin in enumerate(admin_users_admins, 1):
                print(f"  {i}. {admin.get('fullname', 'N/A')} (@{admin.get('username', 'N/A')}) - {admin.get('role', 'N/A')}")
        else:
            print("  No admins found in admin_users collection")
        
        print("\n" + "=" * 60)
        print("✅ READY TO USE ADMIN CREDENTIALS")
        print("=" * 60)
        
        # Show login credentials
        default_passwords = {
            "superadmin": "SuperAdmin@2025",
            "eventadmin": "EventAdmin@2025",
            "organizer": "Organizer@2025",
            "venueadmin": "VenueAdmin@2025",
            "contentadmin": "ContentAdmin@2025"
        }
        
        print("\n📋 LOGIN CREDENTIALS (Default Passwords):")
        print("-" * 40)
        
        for admin in users_admins:
            username = admin.get('username', '')
            password = default_passwords.get(username, "[Ask system admin]")
            role = admin.get('role', 'N/A')
            
            print(f"""
🔑 {admin.get('fullname', 'Unknown')}
   Username: {username}
   Password: {password}
   Role: {role}
   Login URL: http://127.0.0.1:8000/admin/
""")
        
        print("-" * 40)
        print("🚀 NEXT STEPS:")
        print("1. Start the backend server: uvicorn main:app --reload")
        print("2. Navigate to: http://127.0.0.1:8000/admin/")
        print("3. Login with any of the credentials above")
        print("4. Go to 'Manage Admins' to see the admin management interface")
        print("5. Test creating new admins via the frontend form")
        
        return users_admins
        
    except Exception as e:
        print(f"❌ Error verifying admin accounts: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(verify_admin_accounts())
