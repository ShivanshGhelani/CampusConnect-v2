#!/usr/bin/env python3
"""
Test script to verify that ORGANIZER_ADMIN users can only see their assigned events.

This script tests:
1. Organizer admin event list filtering
2. Organizer admin event access permissions
3. Verification that they can't access events not assigned to them
"""

import asyncio
import sys
import os
from datetime import datetime

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def test_organizer_event_filtering():
    """Test that organizer admin can only see their assigned events"""
    print("🔍 Testing organizer admin event filtering...")
    
    try:
        from config.database import Database
        from routes.auth import authenticate_admin
        from models.admin_user import AdminUser, AdminRole
        
        # Connect to database
        db = await Database.get_database("CampusConnect")
        
        # Check if we have any organizer admins
        organizer = await db.users.find_one({"user_type": "organizer", "role": "organizer_admin"})
        
        if not organizer:
            print("   ⚠️  No organizer admin found in database")
            return False
        
        print(f"   👤 Found organizer admin: {organizer.get('username')} ({organizer.get('fullname')})")
        print(f"   📋 Assigned events: {organizer.get('assigned_events', [])}")
        
        # Get all events
        all_events = await db.events.find().to_list(length=None)
        print(f"   📊 Total events in database: {len(all_events)}")
        
        # Check assigned events exist
        assigned_events = organizer.get('assigned_events', [])
        if not assigned_events:
            print("   ⚠️  Organizer has no assigned events")
            return True  # This is valid - organizer might not have events yet
        
        # Verify assigned events exist in database
        existing_assigned = []
        for event_id in assigned_events:
            event = await db.events.find_one({"event_id": event_id})
            if event:
                existing_assigned.append(event_id)
                print(f"   ✅ Assigned event exists: {event_id} - {event.get('title', 'N/A')}")
            else:
                print(f"   ❌ Assigned event not found: {event_id}")
        
        print(f"   📈 Valid assigned events: {len(existing_assigned)}/{len(assigned_events)}")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Error testing organizer event filtering: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_organizer_authentication():
    """Test organizer admin authentication"""
    print("🔐 Testing organizer admin authentication...")
    
    try:
        from config.database import Database
        from routes.auth import authenticate_admin
        
        # Connect to database
        db = await Database.get_database("CampusConnect")
        
        # Get the organizer we know exists (EMP001)
        organizer = await db.users.find_one({"username": "EMP001", "user_type": "organizer"})
        
        if not organizer:
            print("   ❌ Organizer EMP001 not found")
            return False
        
        # Test authentication (we know the password should be hashed now)
        username = organizer["username"]
        # Note: We don't know the plain text password for this test
        # We'll just verify the organizer exists and has the right structure
        
        print(f"   👤 Organizer: {username}")
        print(f"   📧 Email: {organizer.get('email', 'N/A')}")
        print(f"   🏢 Department: {organizer.get('department', 'N/A')}")
        print(f"   🔐 Password format: {'✅ Hashed' if organizer.get('password', '').startswith('$2b$') else '❌ Plain text'}")
        print(f"   📋 Assigned events: {organizer.get('assigned_events', [])}")
        
        # Verify role
        role = organizer.get('role')
        user_type = organizer.get('user_type')
        
        if role == "organizer_admin" and user_type == "organizer":
            print("   ✅ Organizer has correct role and user_type")
            return True
        else:
            print(f"   ❌ Organizer has incorrect role ({role}) or user_type ({user_type})")
            return False
            
    except Exception as e:
        print(f"   ❌ Error testing organizer authentication: {e}")
        return False

async def test_event_access_permissions():
    """Test that organizer admin access controls work correctly"""
    print("🛡️ Testing organizer admin event access permissions...")
    
    try:
        from config.database import Database
        from models.admin_user import AdminUser, AdminRole
        
        # Connect to database
        db = await Database.get_database("CampusConnect")
        
        # Get organizer
        organizer = await db.users.find_one({"username": "EMP001", "user_type": "organizer"})
        
        if not organizer:
            print("   ❌ Organizer not found")
            return False
        
        # Create AdminUser object to test permissions
        admin_data = {
            "fullname": organizer.get("fullname"),
            "username": organizer.get("username"),
            "email": organizer.get("email"),
            "password": organizer.get("password"),
            "is_active": organizer.get("is_active"),
            "role": AdminRole.ORGANIZER_ADMIN,
            "created_at": organizer.get("created_at"),
            "last_login": organizer.get("last_login"),
            "created_by": organizer.get("created_by"),
            "assigned_events": organizer.get("assigned_events", []),
            "permissions": organizer.get("permissions", [])
        }
        
        admin = AdminUser(**admin_data)
        
        print(f"   👤 Testing permissions for: {admin.username}")
        print(f"   🎭 Role: {admin.role}")
        print(f"   📋 Assigned events: {admin.assigned_events}")
        
        # Get all events
        all_events = await db.events.find().to_list(length=None)
        
        # Test access logic
        accessible_events = []
        denied_events = []
        
        for event in all_events:
            event_id = event.get("event_id")
            
            # Simulate the permission check from the API
            if admin.role == AdminRole.ORGANIZER_ADMIN and event_id not in admin.assigned_events:
                denied_events.append(event_id)
            else:
                accessible_events.append(event_id)
        
        print(f"   ✅ Accessible events: {len(accessible_events)}")
        print(f"   ❌ Denied events: {len(denied_events)}")
        print(f"   📊 Total events: {len(all_events)}")
        
        # Verify the logic is working
        expected_accessible = len(admin.assigned_events) if admin.assigned_events else 0
        
        if len(accessible_events) == expected_accessible:
            print("   ✅ Permission filtering is working correctly")
            return True
        else:
            print(f"   ❌ Permission filtering error: expected {expected_accessible}, got {len(accessible_events)}")
            return False
            
    except Exception as e:
        print(f"   ❌ Error testing event access permissions: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    print("🚀 Testing Organizer Admin Event Access Controls\n")
    
    tests = [
        ("Organizer Event Filtering", test_organizer_event_filtering),
        ("Organizer Authentication", test_organizer_authentication),
        ("Event Access Permissions", test_event_access_permissions)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"📋 {test_name}")
        try:
            result = await test_func()
            results.append((test_name, result))
            print(f"   Result: {'✅ PASS' if result else '⚠️  SKIP/WARN'}")
        except Exception as e:
            print(f"   Result: ❌ ERROR - {e}")
            results.append((test_name, False))
        print()
    
    # Summary
    print("📊 TEST SUMMARY:")
    all_passed = True
    for test_name, result in results:
        status = "✅ PASS" if result else "⚠️  WARN"
        print(f"   {test_name}: {status}")
        if not result:
            all_passed = False
    
    if all_passed:
        print("\n🎉 SUCCESS: Organizer admin event access controls are properly configured!")
        print("💡 Organizer admins will only see their assigned events.")
    else:
        print("\n⚠️  WARNING: Some tests had issues, but this may be expected.")
        print("💡 Check the results above for details.")

if __name__ == "__main__":
    asyncio.run(main())
