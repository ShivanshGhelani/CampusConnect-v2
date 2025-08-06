#!/usr/bin/env python3
"""
Test organizer authentication after password hashing fix
"""

import asyncio
import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def test_organizer_auth():
    try:
        print("🔐 Testing organizer authentication after password migration...")
        
        # Import authentication functions
        from routes.auth import authenticate_admin, verify_password
        
        # Test credentials
        username = "EMP001"
        password = "k%$3!CroG1Gq"  # Original plain text password
        
        print(f"👤 Testing login for: {username}")
        print(f"🔑 Using password: {password}")
        
        # Attempt authentication
        print("\n🔍 Attempting authentication...")
        admin = await authenticate_admin(username, password)
        
        if admin:
            print("✅ AUTHENTICATION SUCCESSFUL!")
            print(f"   Username: {admin.username}")
            print(f"   Full Name: {admin.fullname}")
            print(f"   Email: {admin.email}")
            print(f"   Role: {admin.role}")
            print(f"   User Type: {getattr(admin, 'user_type', 'N/A')}")
            print(f"   Active: {admin.is_active}")
            return True
        else:
            print("❌ AUTHENTICATION FAILED!")
            return False
            
    except Exception as e:
        print(f"❌ Error during authentication test: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_password_verification():
    try:
        print("\n🧪 Testing password verification directly...")
        
        # Import database operations
        from config.database import Database
        from routes.auth import verify_password
        
        # Get database
        db = await Database.get_database("CampusConnect")
        
        # Find the organizer
        organizer = await db.users.find_one({"username": "EMP001", "user_type": "organizer"})
        
        if not organizer:
            print("❌ Organizer not found in database")
            return False
        
        stored_hash = organizer.get("password", "")
        plain_password = "k%$3!CroG1Gq"
        
        print(f"📋 Stored hash: {stored_hash[:30]}...")
        print(f"🔑 Plain password: {plain_password}")
        
        # Test verification
        is_valid = await verify_password(plain_password, stored_hash)
        
        if is_valid:
            print("✅ PASSWORD VERIFICATION SUCCESSFUL!")
            return True
        else:
            print("❌ PASSWORD VERIFICATION FAILED!")
            return False
            
    except Exception as e:
        print(f"❌ Error during password verification test: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    print("🚀 Starting organizer authentication tests...\n")
    
    # Test 1: Direct password verification
    test1_result = await test_password_verification()
    
    # Test 2: Full authentication flow
    test2_result = await test_organizer_auth()
    
    # Summary
    print(f"\n📊 TEST RESULTS:")
    print(f"   Password Verification: {'✅ PASS' if test1_result else '❌ FAIL'}")
    print(f"   Full Authentication: {'✅ PASS' if test2_result else '❌ FAIL'}")
    
    if test1_result and test2_result:
        print(f"\n🎉 ALL TESTS PASSED! Organizer authentication is working correctly.")
        print(f"💡 The 401 error should now be resolved for organizer login.")
    else:
        print(f"\n⚠️  SOME TESTS FAILED! Authentication issues may persist.")

if __name__ == "__main__":
    asyncio.run(main())
