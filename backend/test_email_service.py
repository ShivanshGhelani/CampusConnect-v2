"""
Test Email Service - Debug SMTP Connection
Run this to test if email service is working properly
"""
import asyncio
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from services.communication.email_service import communication_service
from config.settings import get_settings

async def test_email_service():
    """Test email service connection and sending"""
    settings = get_settings()
    
    print("=" * 60)
    print("EMAIL SERVICE DIAGNOSTICS")
    print("=" * 60)
    
    # Check settings
    print("\n1. Configuration:")
    print(f"   SMTP Server: {settings.SMTP_SERVER}")
    print(f"   SMTP Port: {settings.SMTP_PORT}")
    print(f"   Email User: {settings.EMAIL_USER}")
    print(f"   Email Password Set: {'Yes' if settings.EMAIL_PASSWORD else 'No'}")
    print(f"   From Email: {settings.FROM_EMAIL or settings.EMAIL_USER}")
    
    # Check service status
    print("\n2. Service Status:")
    stats = communication_service.get_statistics()
    print(f"   Service Status: {stats['service_info']['status']}")
    print(f"   Development Mode: {stats['service_info']['development_mode']}")
    print(f"   Circuit Breaker: {stats['circuit_breaker']['state']}")
    
    # Health check
    print("\n3. Health Check:")
    try:
        health = await communication_service.health_check()
        print(f"   Status: {health['status']}")
        print(f"   Connection OK: {health.get('connection_ok', 'N/A')}")
        if health.get('connection_time'):
            print(f"   Connection Time: {health['connection_time']:.2f}s")
        if health.get('error'):
            print(f"   Error: {health['error']}")
        if health.get('note'):
            print(f"   Note: {health['note']}")
    except Exception as e:
        print(f"   Health check failed: {e}")
    
    # Test email sending
    print("\n4. Test Email Send:")
    test_email = input("   Enter email address to test (or press Enter to skip): ").strip()
    
    if test_email:
        print(f"   Sending test email to {test_email}...")
        try:
            success = await communication_service.send_email_async(
                to_email=test_email,
                subject="CampusConnect Email Service Test",
                content="<h1>Test Email</h1><p>If you received this, the email service is working!</p>",
                content_type="html"
            )
            
            if success:
                print("   ✅ Email sent successfully!")
            else:
                print("   ❌ Email failed to send")
                print("   Check logs above for detailed error information")
        except Exception as e:
            print(f"   ❌ Exception: {e}")
    else:
        print("   Skipped test email send")
    
    # Show pool stats
    print("\n5. Connection Pool Statistics:")
    pool_stats = stats['smtp_pool']
    print(f"   Connections Created: {pool_stats['connections_created']}")
    print(f"   Connections Reused: {pool_stats['connections_reused']}")
    print(f"   Failed Connections: {pool_stats['failed_connections']}")
    print(f"   Connection Errors: {pool_stats['connection_errors']}")
    print(f"   Emails Sent: {pool_stats['total_emails_sent']}")
    print(f"   Retry Attempts: {pool_stats['retry_attempts']}")
    
    print("\n" + "=" * 60)
    print("DIAGNOSTICS COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_email_service())
