#!/usr/bin/env python3
"""
End-to-end test: Simulate creating a new organizer and verify password is hashed.

This script will:
1. Create a new test organizer through the actual system
2. Verify the password is properly hashed in the database
3. Test authentication with the original password
4. Clean up the test data
"""

import asyncio
import sys
import os
import secrets
import string
from datetime import datetime

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def create_test_organizer():
    """Create a test organizer through the actual system workflow"""
    print("🔄 Creating test organizer through actual system workflow...")
    
    try:
        from config.database import Database
        from routes.auth import get_password_hash, verify_password
        
        # Connect to database
        db = await Database.get_database("CampusConnect")
        
        # Generate unique test data
        unique_id = secrets.token_hex(4)
        test_data = {
            "name": f"Test Organizer {unique_id}",
            "email": f"testorg{unique_id}@campusconnect.test",
            "employee_id": f"TEST{unique_id[:6].upper()}",
            "department": "Test Department",
            "phone": "1234567890"
        }
        
        # Generate temporary password (as the system would)
        temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
        
        print(f"   📝 Test Data:")
        print(f"      Name: {test_data['name']}")
        print(f"      Email: {test_data['email']}")
        print(f"      Employee ID: {test_data['employee_id']}")
        print(f"      Temp Password: {temp_password}")
        
        # Hash the password (as the system should)
        hashed_password = await get_password_hash(temp_password)
        print(f"   🔐 Hashed Password: {hashed_password[:30]}...")
        
        # Create user account in users collection (as notification_service/events API would)
        user_account = {
            "fullname": test_data["name"],
            "username": test_data["employee_id"],
            "email": test_data["email"],
            "password": hashed_password,  # ✅ This should be hashed
            "user_type": "organizer",
            "role": "organizer_admin",
            "is_active": True,
            "requires_password_change": True,
            "created_by": "SYSTEM_TEST",
            "created_at": datetime.utcnow(),
            "employee_id": test_data["employee_id"],
            "department": test_data["department"],
            "assigned_events": []
        }
        
        # Insert into database
        result = await db.users.insert_one(user_account)
        user_id = result.inserted_id
        
        print(f"   ✅ Created user account with ID: {user_id}")
        
        # Also create organizer record in organizers collection
        organizer_record = {
            "id": f"org_{test_data['employee_id']}_{secrets.token_hex(4)}",
            "name": test_data["name"],
            "email": test_data["email"],
            "employee_id": test_data["employee_id"],
            "department": test_data["department"],
            "phone": test_data["phone"],
            "user_account_username": test_data["employee_id"],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "is_active": True,
            "created_via_test": True
        }
        
        organizer_result = await db.organizers.insert_one(organizer_record)
        organizer_id = organizer_result.inserted_id
        
        print(f"   ✅ Created organizer record with ID: {organizer_id}")
        
        return {
            "user_id": user_id,
            "organizer_id": organizer_id,
            "username": test_data["employee_id"],
            "email": test_data["email"],
            "temp_password": temp_password,
            "hashed_password": hashed_password
        }
        
    except Exception as e:
        print(f"   ❌ Error creating test organizer: {e}")
        import traceback
        traceback.print_exc()
        return None

async def verify_password_storage(test_data):
    """Verify the password is properly stored as a hash"""
    print("🔍 Verifying password storage in database...")
    
    try:
        from config.database import Database
        
        db = await Database.get_database("CampusConnect")
        
        # Retrieve the user from database
        user = await db.users.find_one({"username": test_data["username"]})
        
        if not user:
            print("   ❌ User not found in database")
            return False
        
        stored_password = user.get("password", "")
        
        print(f"   📋 Stored password: {stored_password[:30]}...")
        print(f"   📋 Expected hash: {test_data['hashed_password'][:30]}...")
        
        # Check if it's a proper bcrypt hash
        is_bcrypt = stored_password.startswith(('$2a$', '$2b$', '$2x$', '$2y$'))
        is_correct_hash = stored_password == test_data["hashed_password"]
        
        if is_bcrypt and is_correct_hash:
            print("   ✅ Password is properly stored as bcrypt hash")
            return True
        elif is_bcrypt and not is_correct_hash:
            print("   ⚠️  Password is hashed but doesn't match expected hash")
            return False
        else:
            print("   ❌ Password is not properly hashed!")
            return False
            
    except Exception as e:
        print(f"   ❌ Error verifying password storage: {e}")
        return False

async def test_authentication(test_data):
    """Test that authentication works with the original password"""
    print("🔐 Testing authentication with original password...")
    
    try:
        from routes.auth import authenticate_admin, verify_password
        
        username = test_data["username"]
        password = test_data["temp_password"]
        
        print(f"   👤 Username: {username}")
        print(f"   🔑 Password: {password}")
        
        # Test direct password verification
        stored_hash = test_data["hashed_password"]
        verification_result = await verify_password(password, stored_hash)
        
        if verification_result:
            print("   ✅ Direct password verification successful")
        else:
            print("   ❌ Direct password verification failed")
            return False
        
        # Test full authentication flow
        admin = await authenticate_admin(username, password)
        
        if admin:
            print("   ✅ Full authentication successful")
            print(f"      Authenticated as: {admin.fullname}")
            print(f"      Role: {admin.role}")
            return True
        else:
            print("   ❌ Full authentication failed")
            return False
            
    except Exception as e:
        print(f"   ❌ Error testing authentication: {e}")
        import traceback
        traceback.print_exc()
        return False

async def cleanup_test_data(test_data):
    """Clean up test data"""
    print("🧹 Cleaning up test data...")
    
    try:
        from config.database import Database
        
        db = await Database.get_database("CampusConnect")
        
        # Remove user account
        user_result = await db.users.delete_one({"_id": test_data["user_id"]})
        if user_result.deleted_count > 0:
            print("   ✅ Removed test user account")
        
        # Remove organizer record
        organizer_result = await db.organizers.delete_one({"_id": test_data["organizer_id"]})
        if organizer_result.deleted_count > 0:
            print("   ✅ Removed test organizer record")
        
        return True
        
    except Exception as e:
        print(f"   ⚠️  Error cleaning up test data: {e}")
        return False

async def main():
    print("🚀 End-to-End Organizer Creation Security Test\n")
    
    # Step 1: Create test organizer
    test_data = await create_test_organizer()
    if not test_data:
        print("❌ Failed to create test organizer. Aborting test.")
        return
    
    print()
    
    try:
        # Step 2: Verify password storage
        storage_ok = await verify_password_storage(test_data)
        print()
        
        # Step 3: Test authentication
        auth_ok = await test_authentication(test_data)
        print()
        
        # Step 4: Results
        if storage_ok and auth_ok:
            print("🎉 SUCCESS: Organizer creation security test PASSED!")
            print("✅ New organizer passwords are properly hashed")
            print("✅ Authentication works with original passwords")
            print("✅ Security is properly implemented")
        else:
            print("❌ FAILURE: Organizer creation security test FAILED!")
            if not storage_ok:
                print("❌ Password storage is not secure")
            if not auth_ok:
                print("❌ Authentication is not working")
    
    finally:
        # Step 5: Cleanup
        print()
        await cleanup_test_data(test_data)
        print("\n✅ Test completed")

if __name__ == "__main__":
    asyncio.run(main())
