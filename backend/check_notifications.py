#!/usr/bin/env python3
"""
Test script to check notifications in the notification center
"""

import requests
import json

# Backend URL
BASE_URL = "http://localhost:8000"

def login_admin():
    """Login as admin and get session/token"""
    login_url = f"{BASE_URL}/auth/login"
    
    login_data = {
        "username": "SHIV9090",
        "password": "Shiv@9090"
    }
    
    print(f"🔐 Logging in as SHIV9090...")
    
    session = requests.Session()
    
    try:
        response = session.post(login_url, data=login_data)
        if response.status_code == 200:
            print("✅ Login successful!")
            return session
        else:
            print(f"❌ Login failed: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None

def check_notifications(session):
    """Check notifications in the notification center"""
    notifications_url = f"{BASE_URL}/api/v1/admin/notifications/"
    
    print("🔔 Checking notifications...")
    
    try:
        response = session.get(notifications_url)
        print(f"Notifications response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Notifications retrieved successfully!")
            print(f"📊 Notification data: {json.dumps(data, indent=2)}")
            return True
        else:
            print(f"❌ Failed to get notifications: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Notification retrieval error: {e}")
        return False

def get_notification_stats(session):
    """Get notification statistics"""
    stats_url = f"{BASE_URL}/api/v1/admin/notifications/stats"
    
    print("📊 Getting notification stats...")
    
    try:
        response = session.get(stats_url)
        if response.status_code == 200:
            data = response.json()
            print("✅ Stats retrieved successfully!")
            print(f"📊 Stats: {json.dumps(data, indent=2)}")
            return True
        else:
            print(f"❌ Failed to get stats: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Stats error: {e}")
        return False

def main():
    print("🔍 Checking Super Admin notification center...")
    print("=" * 50)
    
    # Login
    session = login_admin()
    if not session:
        print("❌ Authentication failed!")
        return
    
    # Check notifications
    notifications_ok = check_notifications(session)
    
    # Get stats
    stats_ok = get_notification_stats(session)
    
    if notifications_ok and stats_ok:
        print("\n🎉 Notification center is working!")
    else:
        print("\n💥 There are still issues with the notification center!")

if __name__ == "__main__":
    main()
