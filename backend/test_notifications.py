#!/usr/bin/env python3
"""
Test script to trigger notifications for pending approval events
This script will authenticate as a Super Admin and call the bulk notification endpoint
"""

import requests
import json
import sys

# Backend URL
BASE_URL = "http://localhost:8000"

def login_admin(username: str, password: str):
    """Login as admin and get session/token"""
    login_url = f"{BASE_URL}/auth/login"
    
    # Try to login
    login_data = {
        "username": "SHIV9090",
        "password": "Shiv@9090"
    }
    
    print(f"🔐 Attempting to login as {username}...")
    
    # Create session to maintain cookies
    session = requests.Session()
    
    try:
        response = session.post(login_url, data=login_data)
        print(f"Login response status: {response.status_code}")
        print(f"Login response: {response.text[:200]}...")
        
        if response.status_code == 200:
            print("✅ Login successful!")
            return session
        else:
            print(f"❌ Login failed: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None

def debug_event_data(session):
    """Debug the event data to see what fields exist"""
    debug_url = f"{BASE_URL}/api/v1/admin/events/debug-event/MANOTECH"
    
    print("🔍 Debugging event data...")
    
    try:
        response = session.get(debug_url)
        print(f"Debug response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Event data retrieved!")
            print(f"📊 Event Data: {json.dumps(data, indent=2)}")
            return True
        else:
            print(f"❌ Failed to get event data: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Debug error: {e}")
        return False

def trigger_notifications(session):
    """Call the bulk notification trigger endpoint"""
    notification_url = f"{BASE_URL}/api/v1/admin/events/trigger-pending-notifications"
    
    print("🔔 Triggering notifications for pending events...")
    
    try:
        response = session.post(notification_url)
        print(f"Notification response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Notifications triggered successfully!")
            print(f"📊 Results: {json.dumps(data, indent=2)}")
            return True
        else:
            print(f"❌ Failed to trigger notifications: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Notification error: {e}")
        return False

def main():
    print("🚀 Testing bulk notification trigger endpoint...")
    print("=" * 50)
    
    # Use known working credentials
    username = "SHIV9090"
    password = "Shiv@9090"
    
    # Login
    session = login_admin(username, password)
    if not session:
        print("❌ Authentication failed!")
        sys.exit(1)
    
    # Debug event data first
    debug_event_data(session)
    
    # Trigger notifications
    success = trigger_notifications(session)
    
    if success:
        print("\n🎉 Test completed successfully!")
        print("Check the Super Admin notification center for new approval requests.")
    else:
        print("\n💥 Test failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
