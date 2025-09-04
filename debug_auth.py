"""
Debug authentication flow in detail
"""

import requests
import json

BACKEND_URL = "http://localhost:8000"

def debug_auth_flow():
    """Debug the complete authentication flow"""
    
    # Step 1: Login
    print("🔐 Step 1: Login")
    login_data = {
        "username": "SHIV9090",
        "password": "Shiv@9090",
        "remember_me": False
    }
    
    session = requests.Session()  # Use session to maintain cookies
    
    login_response = session.post(
        f"{BACKEND_URL}/api/v1/auth/admin/login",
        json=login_data
    )
    
    print(f"   Status: {login_response.status_code}")
    if login_response.status_code == 200:
        data = login_response.json()
        print(f"   Success: {data['success']}")
        print(f"   Auth Type: {data.get('auth_type')}")
        print(f"   Cookies Set: {list(session.cookies.keys())}")
        
        # Print cookie values (first few chars for security)
        for cookie_name, cookie_value in session.cookies.items():
            print(f"   Cookie {cookie_name}: {cookie_value[:20]}...")
    else:
        print(f"   Error: {login_response.text}")
        return
    
    print()
    
    # Step 2: Check session debug
    print("🔍 Step 2: Session Debug")
    debug_response = session.get(f"{BACKEND_URL}/api/debug/session")
    print(f"   Status: {debug_response.status_code}")
    if debug_response.status_code == 200:
        debug_data = debug_response.json()
        print(f"   Session Keys: {debug_data.get('session_keys', [])}")
        print(f"   Has Admin: {debug_data.get('has_admin')}")
        print(f"   Has Student: {debug_data.get('has_student')}")
        print(f"   Has Faculty: {debug_data.get('has_faculty')}")
        print(f"   Cookies in Request: {list(debug_data.get('cookies', {}).keys())}")
    else:
        print(f"   Error: {debug_response.text}")
    
    print()
    
    # Step 3: Test dashboard API
    print("📊 Step 3: Dashboard API")
    dashboard_response = session.get(f"{BACKEND_URL}/api/v1/admin/dashboard/recent-activity")
    print(f"   Status: {dashboard_response.status_code}")
    if dashboard_response.status_code == 200:
        print(f"   Success: API accessible")
    else:
        print(f"   Error: {dashboard_response.text}")
    
    print()
    
    # Step 4: Test analytics API
    print("📈 Step 4: Analytics API")
    analytics_response = session.get(f"{BACKEND_URL}/api/v1/admin/analytics/overview")
    print(f"   Status: {analytics_response.status_code}")
    if analytics_response.status_code == 200:
        print(f"   Success: API accessible")
    else:
        print(f"   Error: {analytics_response.text}")

if __name__ == "__main__":
    print("🐛 Debugging CampusConnect Authentication Flow")
    print("=" * 60)
    debug_auth_flow()
    print("=" * 60)
