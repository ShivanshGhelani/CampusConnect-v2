"""
Test Redis connection with Upstash
Run this to verify Redis connection is working
"""
import os
import redis
from dotenv import load_dotenv

load_dotenv()

def test_redis_connection():
    redis_url = os.getenv("UPSTASH_REDIS_URL")
    print(f"Testing Redis connection to Upstash...")
    print(f"URL: {redis_url[:30]}..." if redis_url else "No URL found")
    
    try:
        # Connect with SSL/TLS parameters for redis-py 5.x
        # Redis automatically detects SSL from the URL (rediss://)
        client = redis.from_url(
            redis_url,
            decode_responses=True,
            socket_connect_timeout=10,
            socket_timeout=10,
            retry_on_timeout=True
        )
        
        # Test connection
        print("\n1. Testing PING...")
        result = client.ping()
        print(f"   ✓ PING successful: {result}")
        
        # Test SET
        print("\n2. Testing SET...")
        client.set("test_key", "Hello from CampusConnect!", ex=60)
        print("   ✓ SET successful")
        
        # Test GET
        print("\n3. Testing GET...")
        value = client.get("test_key")
        print(f"   ✓ GET successful: {value}")
        
        # Test DELETE
        print("\n4. Testing DELETE...")
        client.delete("test_key")
        print("   ✓ DELETE successful")
        
        # Test INFO
        print("\n5. Testing INFO...")
        info = client.info("server")
        print(f"   ✓ Redis Server Version: {info.get('redis_version', 'Unknown')}")
        
        print("\n✅ All Redis tests passed! Connection is working perfectly.")
        return True
        
    except redis.ConnectionError as e:
        print(f"\n❌ Connection Error: {e}")
        print("\nPossible solutions:")
        print("1. Check if UPSTASH_REDIS_URL in .env is correct")
        print("2. Verify Upstash Redis instance is active")
        print("3. Check firewall/network settings")
        return False
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print(f"   Error type: {type(e).__name__}")
        return False

if __name__ == "__main__":
    test_redis_connection()
