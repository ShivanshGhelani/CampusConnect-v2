#!/usr/bin/env python3
"""Debug script to test auth module import"""

import sys
import traceback

try:
    print("Testing import of app.v1.auth...")
    import app.v1.auth
    print(f"✅ Success! Auth router has {len(app.v1.auth.router.routes)} routes")
    
    # List all routes in the auth router
    print("\nRoutes in auth router:")
    for i, route in enumerate(app.v1.auth.router.routes):
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            print(f"  {i+1}. {route.path} [{', '.join(route.methods)}]")
        else:
            print(f"  {i+1}. {route} (no path/methods)")
            
except Exception as e:
    print(f"❌ Error importing auth module: {e}")
    traceback.print_exc()
