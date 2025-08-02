#!/usr/bin/env python3
"""
Script to check Redis token storage for Remember Me functionality
"""
import redis
import json
from datetime import datetime

def check_redis_tokens():
    try:
        # Connect to Redis (same config as in your app)
        r = redis.Redis(host='localhost', port=6379, db=1, decode_responses=True)
        
        # Test connection
        r.ping()
        print("✅ Connected to Redis successfully!")
        print(f"🔍 Checking Redis database 1 for tokens...\n")
        
        # Get all keys
        all_keys = r.keys("*")
        print(f"📊 Total keys found: {len(all_keys)}")
        
        if not all_keys:
            print("❌ No tokens found in Redis")
            print("💡 This could mean:")
            print("   - You haven't logged in with 'Remember me' checked")
            print("   - Tokens are being stored in a different database")
            print("   - Redis connection issue during login")
            return
        
        print("\n🔑 Token Keys Found:")
        print("-" * 50)
        
        access_tokens = []
        refresh_tokens = []
        user_tokens = []
        
        for key in all_keys:
            try:
                # Get key info
                key_type = r.type(key)
                ttl = r.ttl(key)
                
                if ttl == -1:
                    ttl_str = "No expiration"
                elif ttl == -2:
                    ttl_str = "Expired/Not found"
                else:
                    hours = ttl // 3600
                    minutes = (ttl % 3600) // 60
                    ttl_str = f"{hours}h {minutes}m remaining"
                
                print(f"Key: {key}")
                print(f"Type: {key_type}")
                print(f"TTL: {ttl_str}")
                
                # Try to get the value
                if key_type == 'string':
                    value = r.get(key)
                    try:
                        # Try to parse as JSON
                        parsed_value = json.loads(value)
                        print(f"Value: {json.dumps(parsed_value, indent=2)}")
                    except:
                        # If not JSON, show first 100 characters
                        print(f"Value: {value[:100]}{'...' if len(value) > 100 else ''}")
                
                print("-" * 30)
                
                # Categorize tokens
                if 'access_token' in key:
                    access_tokens.append(key)
                elif 'refresh_token' in key:
                    refresh_tokens.append(key)
                elif 'tokens:' in key:
                    user_tokens.append(key)
                    
            except Exception as e:
                print(f"Error reading key {key}: {e}")
        
        # Summary
        print(f"\n📈 Token Summary:")
        print(f"Access tokens: {len(access_tokens)}")
        print(f"Refresh tokens: {len(refresh_tokens)}")
        print(f"User token mappings: {len(user_tokens)}")
        
        if access_tokens or refresh_tokens or user_tokens:
            print("\n✅ Remember Me functionality appears to be working!")
            print("🔄 Tokens are being stored in Redis as expected.")
        else:
            print("\n⚠️  No token-like keys found.")
            print("💡 Try logging in again with 'Remember me' checked.")
        
    except redis.ConnectionError:
        print("❌ Could not connect to Redis")
        print("💡 Make sure Redis is running on localhost:6379")
        print("💡 Or check if Docker Redis is properly exposed")
    except Exception as e:
        print(f"❌ Error: {e}")

def check_docker_redis():
    """Check if Redis is running in Docker"""
    import subprocess
    try:
        result = subprocess.run(['docker', 'ps'], capture_output=True, text=True)
        if 'redis' in result.stdout.lower():
            print("🐳 Found Redis container running in Docker")
            print("Container info:")
            lines = result.stdout.split('\n')
            for line in lines:
                if 'redis' in line.lower():
                    print(f"   {line}")
        else:
            print("❌ No Redis container found in Docker ps")
    except Exception as e:
        print(f"⚠️  Could not check Docker containers: {e}")

if __name__ == "__main__":
    print("🔍 CampusConnect Redis Token Checker")
    print("=" * 40)
    
    # Check Docker first
    check_docker_redis()
    print()
    
    # Check Redis tokens
    check_redis_tokens()
