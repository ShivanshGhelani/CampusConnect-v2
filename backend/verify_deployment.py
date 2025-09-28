#!/usr/bin/env python3
"""
Deployment verification script - checks if all necessary Python packages and files exist
Run this on Render to verify the deployment
"""

import os
import sys
import traceback
from pathlib import Path

def check_file_structure():
    """Check if all necessary __init__.py files exist"""
    print("🔍 Checking Python package structure...")
    
    required_init_files = [
        "app/__init__.py",
        "app/v1/__init__.py", 
        "app/v1/admin/__init__.py",
        "app/v1/admin/events/__init__.py"
    ]
    
    missing_files = []
    
    for init_file in required_init_files:
        if os.path.exists(init_file):
            print(f"  ✅ {init_file}")
        else:
            print(f"  ❌ {init_file} - MISSING")
            missing_files.append(init_file)
    
    return len(missing_files) == 0, missing_files

def check_admin_modules():
    """Check if admin modules can be imported"""
    print("\n🔍 Checking admin module imports...")
    
    modules_to_check = [
        ("app", "Main app module"),
        ("app.v1", "API v1 module"),
        ("app.v1.admin", "Admin module"),
        ("app.v1.admin.events", "Admin events module"),
        ("app.v1.admin.users", "Admin users module"),
        ("app.v1.admin.venues", "Admin venues module"),
        ("app.v1.admin.assets", "Admin assets module")
    ]
    
    import_results = []
    
    for module_name, description in modules_to_check:
        try:
            __import__(module_name)
            print(f"  ✅ {module_name} - {description}")
            import_results.append(True)
        except Exception as e:
            print(f"  ❌ {module_name} - {description} - ERROR: {str(e)}")
            import_results.append(False)
    
    return all(import_results), import_results

def check_dependencies():
    """Check if all required dependencies are installed"""
    print("\n🔍 Checking Python dependencies...")
    
    required_packages = [
        "fastapi",
        "uvicorn", 
        "pymongo",
        "redis",
        "pydantic",
        "python-dotenv",
        "bcrypt",
        "PyJWT"
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
            print(f"  ✅ {package}")
        except ImportError:
            try:
                # Try alternative names
                if package == "python-dotenv":
                    __import__("dotenv")
                    print(f"  ✅ {package} (as dotenv)")
                else:
                    print(f"  ❌ {package} - MISSING")
                    missing_packages.append(package)
            except ImportError:
                print(f"  ❌ {package} - MISSING")
                missing_packages.append(package)
    
    return len(missing_packages) == 0, missing_packages

def check_environment():
    """Check environment variables and configuration"""
    print("\n🔍 Checking environment configuration...")
    
    env_vars = [
        "MONGODB_URL",
        "SESSION_SECRET_KEY",
        "REDIS_URL"
    ]
    
    for var in env_vars:
        value = os.getenv(var)
        if value:
            # Show only first 20 chars for security
            display_value = value[:20] + "..." if len(value) > 20 else value
            print(f"  ✅ {var} = {display_value}")
        else:
            print(f"  ⚠️ {var} - NOT SET")
    
    print(f"\n📍 Environment Info:")
    print(f"  Python version: {sys.version}")
    print(f"  Platform: {sys.platform}")
    print(f"  Current directory: {os.getcwd()}")
    print(f"  ENVIRONMENT: {os.getenv('ENVIRONMENT', 'not_set')}")
    print(f"  RENDER: {os.getenv('RENDER', 'not_set')}")
    print(f"  PORT: {os.getenv('PORT', 'not_set')}")

def main():
    """Main verification function"""
    print("🚀 CampusConnect Deployment Verification")
    print("=" * 50)
    
    all_checks_passed = True
    
    # Check file structure
    files_ok, missing_files = check_file_structure()
    if not files_ok:
        all_checks_passed = False
        print(f"\n❌ Missing {len(missing_files)} required files!")
        
    # Check imports
    imports_ok, import_results = check_admin_modules()
    if not imports_ok:
        all_checks_passed = False
        print(f"\n❌ Failed to import some modules!")
    
    # Check dependencies
    deps_ok, missing_deps = check_dependencies()
    if not deps_ok:
        all_checks_passed = False
        print(f"\n❌ Missing {len(missing_deps)} required packages!")
    
    # Check environment
    check_environment()
    
    print("\n" + "=" * 50)
    if all_checks_passed:
        print("✅ ALL CHECKS PASSED - Deployment should work correctly!")
    else:
        print("❌ SOME CHECKS FAILED - This may cause deployment issues!")
        
        if missing_files:
            print(f"\n🔧 FIX: Create missing __init__.py files:")
            for file in missing_files:
                print(f"   touch {file}")
        
        if missing_deps:
            print(f"\n🔧 FIX: Install missing packages:")
            print(f"   pip install {' '.join(missing_deps)}")
    
    print("\n🔍 To test admin routes after fixing:")
    print("   curl https://your-app.onrender.com/api/debug/routes")
    print("   curl https://your-app.onrender.com/api/debug/imports")
    
    return all_checks_passed

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"❌ Verification script failed: {e}")
        traceback.print_exc()
        sys.exit(1)