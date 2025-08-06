#!/usr/bin/env python3
"""
Debug script to test mixed organizer email processing
This script simulates the mixed organizer scenario to identify the bug
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.notification_service import NotificationService
from models.notification import Notification, NotificationType, NotificationPriority
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_mixed_organizers():
    """Test event approval with mixed new and existing organizers"""
    
    # Create a mock notification for mixed organizer event
    mock_notification = Notification(
        id="test_mixed_org",
        notification_type=NotificationType.EVENT_APPROVAL_REQUEST,
        title="Mixed Organizer Event Approval",
        message="Test event with both new and existing organizers",
        recipient_username="super_admin",
        recipient_role="super_admin",
        sender_username="exec_admin",
        sender_role="executive_admin",
        related_entity_type="event",
        related_entity_id="test_event_123",
        priority=NotificationPriority.HIGH,
        action_required=True,
        action_data={
            "event_id": "test_event_123",
            "event_name": "Mixed Organizer Test Event",
            "created_by": "exec_admin",
            "event_type": "Workshop",
            "organizing_department": "Computer Science",
            "start_date": "2025-08-10",
            "end_date": "2025-08-10",
            "mode": "Hybrid",
            "organizers": [
                {
                    "name": "New Organizer One",
                    "email": "new1@college.edu",
                    "employee_id": "NEW001",
                    "isNew": True
                },
                {
                    "name": "Existing Organizer Two", 
                    "email": "existing@college.edu",
                    "employee_id": "EMP001",
                    "isNew": False
                },
                {
                    "name": "New Organizer Three",
                    "email": "new3@college.edu", 
                    "employee_id": "NEW003",
                    "isNew": True
                }
            ]
        },
        created_at=datetime.utcnow(),
        read_at=None,
        archived=False
    )
    
    logger.info("🧪 Starting mixed organizer test...")
    logger.info(f"📧 Event has {len(mock_notification.action_data['organizers'])} organizers:")
    
    for i, org in enumerate(mock_notification.action_data['organizers']):
        status = "NEW" if org.get('isNew') else "EXISTING"
        logger.info(f"  {i+1}. {org['name']} ({org['email']}) - {status}")
    
    try:
        notification_service = NotificationService()
        
        # Test approval with reason
        approval_reason = "Approved for testing mixed organizer email logic"
        
        logger.info("🔄 Testing event approval process...")
        await notification_service._handle_event_approval(
            mock_notification, 
            approved=True, 
            reason=approval_reason
        )
        
        logger.info("✅ Mixed organizer test completed successfully!")
        
    except Exception as e:
        logger.error(f"❌ Test failed with error: {e}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")

if __name__ == "__main__":
    print("🧪 Mixed Organizer Email Debug Tool")
    print("=" * 50)
    
    try:
        asyncio.run(test_mixed_organizers())
    except KeyboardInterrupt:
        print("\n🛑 Test interrupted by user")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
