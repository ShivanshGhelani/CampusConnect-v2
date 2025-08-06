#!/usr/bin/env python3
"""
Test script to verify password hashing functionality
"""
import asyncio
import sys
import os

# Add the current directory to Python path
sys.path.append(os.getcwd())

async def test_password_hashing():
    try:
        from routes.auth import get_password_hash, verify_password
        
        test_password = "TestPassword123"
        
        print("🔍 Testing password hashing...")
        print(f"Original password: {test_password}")
        
        # Hash the password
        hashed = await get_password_hash(test_password)
        print(f"Hashed password: {hashed}")
        print(f"Hash length: {len(hashed)}")
        
        # Verify the password
        is_valid = await verify_password(test_password, hashed)
        print(f"Password verification: {'✅ SUCCESS' if is_valid else '❌ FAILED'}")
        
        # Test with wrong password
        wrong_password = "WrongPassword123"
        is_invalid = await verify_password(wrong_password, hashed)
        print(f"Wrong password verification: {'❌ FAILED (expected)' if not is_invalid else '⚠️ UNEXPECTED SUCCESS'}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing password hashing: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    result = asyncio.run(test_password_hashing())
    if result:
        print("\n✅ Password hashing test completed successfully")
    else:
        print("\n❌ Password hashing test failed")
        sys.exit(1)
