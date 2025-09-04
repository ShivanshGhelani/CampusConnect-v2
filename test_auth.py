"""
Test script to verify CampusConnect authentication is working
"""

import requests
import json

# Configuration
BACKEND_URL = "http://localhost:8000"  # Local backend for testing
# BACKEND_URL = "https://jaguar-giving-awfully.ngrok-free.app"  # Uncomment for ngrok testing

def test_health():
    """Test backend health"""
    try:
        response = requests.get(f"{BACKEND_URL}/api/health")
        print(f"✅ Backend Health: {response.status_code}")
        if response.status_code == 200:
            print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"❌ Backend Health Failed: {e}")

def test_admin_login():
    """Test admin login"""
    try:
        login_data = {
            "username": "SHIV9090",
            "password": "Shiv@9090",
            "remember_me": False
        }
        
        response = requests.post(
            f"{BACKEND_URL}/api/v1/auth/admin/login",
            json=login_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"✅ Admin Login: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Success: {data['success']}")
            print(f"   User: {data['user']['username']} ({data['user']['role']})")
            print(f"   Auth Type: {data.get('auth_type', 'session')}")
            
            # Check if cookies were set
            cookies = response.cookies
            print(f"   Cookies: {list(cookies.keys())}")
            
            return response.cookies
        else:
            print(f"   Error: {response.text}")
            
    except Exception as e:
        print(f"❌ Admin Login Failed: {e}")
    
    return None

def test_dashboard_api(cookies=None):
    """Test dashboard API with authentication"""
    try:
        response = requests.get(
            f"{BACKEND_URL}/api/v1/admin/dashboard/recent-activity",
            cookies=cookies,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"✅ Dashboard API: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Success: {data['success']}")
            print(f"   Activities: {data['total']}")
        else:
            print(f"   Error: {response.text}")
            
    except Exception as e:
        print(f"❌ Dashboard API Failed: {e}")

def test_analytics_api(cookies=None):
    """Test analytics API with authentication"""
    try:
        response = requests.get(
            f"{BACKEND_URL}/api/v1/admin/analytics/overview",
            cookies=cookies,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"✅ Analytics API: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Success: {data['success']}")
            print(f"   Students: {data['data']['total_students']}")
            print(f"   Events: {data['data']['total_events']}")
        else:
            print(f"   Error: {response.text}")
            
    except Exception as e:
        print(f"❌ Analytics API Failed: {e}")

if __name__ == "__main__":
    print("🔍 Testing CampusConnect Authentication")
    print("=" * 50)
    
    # Test 1: Backend Health
    test_health()
    print()
    
    # Test 2: Admin Login
    cookies = test_admin_login()
    print()
    
    # Test 3: Dashboard API (with session/cookies)
    if cookies:
        test_dashboard_api(cookies)
        print()
        
        # Test 4: Analytics API
        test_analytics_api(cookies)
        print()
    
    print("=" * 50)
    print("Testing complete!")
