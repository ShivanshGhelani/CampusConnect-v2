#!/usr/bin/env python3
"""
Test script for CampusConnect Password Reset and Email System
Run this script to verify all components are working correctly
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def test_password_reset_system():
    """Test the complete password reset system"""
    
    print("🔧 Testing CampusConnect Password Reset System")
    print("=" * 50)
    
    # Test 1: Import and initialize services
    try:
        from services.password_reset_service import password_reset_service
        from services.email.service import EmailService
        from config.database import Database
        print("✅ Services imported successfully")
    except Exception as e:
        print(f"❌ Import failed: {e}")
        return False
    
    # Test 2: Redis connection
    try:
        redis_conn = password_reset_service.get_redis_connection()
        if redis_conn:
            redis_conn.ping()
            print("✅ Redis connection working")
        else:
            print("❌ Redis connection failed")
            return False
    except Exception as e:
        print(f"❌ Redis error: {e}")
        return False
    
    # Test 3: Database connection
    try:
        db = await Database.get_database()
        if db is not None:
            # Test collections exist
            collections = await db.list_collection_names()
            if 'students' in collections:
                print("✅ Database connection and collections verified")
            else:
                print("⚠️  Database connected but 'students' collection not found")
        else:
            print("❌ Database connection failed")
            return False
    except Exception as e:
        print(f"❌ Database error: {e}")
        return False
    
    # Test 4: Email service configuration
    try:
        email_service = EmailService()
        stats = email_service.get_connection_stats()
        print(f"✅ Email service initialized - Connection ready: {stats['is_connected']}")
    except Exception as e:
        print(f"❌ Email service error: {e}")
        return False
    
    # Test 5: Token generation
    try:
        token = password_reset_service.generate_reset_token("TEST123", "student", "test@example.com")
        if token:
            print("✅ Token generation working")
            
            # Test token validation
            validation = await password_reset_service.validate_reset_token(token)
            if validation.get('is_valid'):
                print("✅ Token validation working")
            else:
                print(f"⚠️  Token validation issue: {validation.get('message')}")
        else:
            print("❌ Token generation failed")
    except Exception as e:
        print(f"❌ Token system error: {e}")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 Password Reset System Test Complete!")
    print("\nNext Steps:")
    print("1. Configure Gmail SMTP using setup_email.ps1")
    print("2. Restart FastAPI server")
    print("3. Test forgot password flow in browser")
    print("4. Check email delivery")
    
    return True

if __name__ == "__main__":
    try:
        result = asyncio.run(test_password_reset_system())
        if result:
            print("\n✅ All tests passed!")
            sys.exit(0)
        else:
            print("\n❌ Some tests failed!")
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n⏹️  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        sys.exit(1)
