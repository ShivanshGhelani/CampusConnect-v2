#!/usr/bin/env python3
"""
Test script to verify team management API endpoints exist
"""

import asyncio
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def test_team_management_endpoints():
    """Test if team management endpoints exist"""
    print("🧪 TESTING TEAM MANAGEMENT API ENDPOINTS")
    print("=" * 60)
    
    try:
        # Import FastAPI app to check routes
        from main import app
        
        routes = []
        for route in app.routes:
            if hasattr(route, 'path') and hasattr(route, 'methods'):
                route_info = f"{list(route.methods)} {route.path}"
                routes.append(route_info)
        
        # Check for team management endpoints
        team_endpoints = [
            "/api/v1/client/registration/validate-participant",
            "/api/v1/client/registration/add-team-member",
            "/api/v1/client/registration/remove-team-member", 
            "/api/v1/client/registration/cancel/{event_id}"
        ]
        
        print("🔍 Checking Team Management Endpoints:")
        for endpoint in team_endpoints:
            found = False
            for route in routes:
                if endpoint.replace("{event_id}", "") in route or endpoint in route:
                    print(f"   ✅ {endpoint} - FOUND")
                    found = True
                    break
            
            if not found:
                print(f"   ❌ {endpoint} - NOT FOUND")
        
        print(f"\n📋 Available Registration Routes:")
        registration_routes = [route for route in routes if "/registration/" in route]
        for route in registration_routes[:10]:  # Show first 10
            print(f"   - {route}")
        
        if len(registration_routes) > 10:
            print(f"   ... and {len(registration_routes) - 10} more routes")
        
        return True
        
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Run the test"""
    success = await test_team_management_endpoints()
    
    print("\n" + "=" * 60)
    if success:
        print("🎉 TEAM MANAGEMENT ENDPOINT TEST COMPLETED!")
        print("✅ Check the output above to see which endpoints are available")
    else:
        print("❌ Team management endpoint test failed")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
