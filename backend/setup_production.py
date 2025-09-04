#!/usr/bin/env python3
"""
CampusConnect Production Configuration Setup
Sets up environment variables for production deployment with ngrok
"""

import os
import sys
from pathlib import Path

def setup_production_environment():
    """Set up environment variables for production"""
    
    # Production configuration
    prod_config = {
        "ENVIRONMENT": "production",
        "DEBUG": "false", 
        "FRONTEND_URL": "https://campusconnectldrp.vercel.app",
        "BACKEND_URL": "https://jaguar-giving-awfully.ngrok-free.app",
        "ADDITIONAL_CORS_ORIGINS": "https://campusconnectldrp.vercel.app,https://campusconnect-self.vercel.app",
        "SESSION_SECRET_KEY": "production-session-secret-key-change-this-in-production",
    }
    
    # Set environment variables
    for key, value in prod_config.items():
        os.environ[key] = value
        print(f"✓ Set {key}={value}")
    
    print("\n🚀 Production environment configured!")
    print("\nNext steps:")
    print("1. Start ngrok: ngrok http 8000") 
    print("2. Update ngrok URL if different from: https://jaguar-giving-awfully.ngrok-free.app")
    print("3. Start backend: python main.py")
    print("4. Verify frontend can connect: https://campusconnectldrp.vercel.app")
    
    return True

def check_configuration():
    """Check current configuration"""
    print("Current Configuration:")
    print("=" * 50)
    
    important_vars = [
        "ENVIRONMENT",
        "FRONTEND_URL",
        "BACKEND_URL", 
        "ADDITIONAL_CORS_ORIGINS",
        "SESSION_SECRET_KEY"
    ]
    
    for var in important_vars:
        value = os.environ.get(var, "NOT SET")
        print(f"{var}: {value}")
    
    print("=" * 50)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "check":
        check_configuration()
    else:
        setup_production_environment()
