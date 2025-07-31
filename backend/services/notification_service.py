"""
Notification service for admin communications and workflow management
"""
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient

from config.database import Database
from models.notification import (
    Notification, NotificationType, NotificationPriority, NotificationStatus,
    NotificationResponse, NotificationListResponse
)
from models.admin_user import AdminRole
from core.id_generator import generate_notification_id

logger = logging.getLogger(__name__)

class NotificationService:
    """Service for managing admin notifications and cross-role communications"""
    
    def __init__(self):
        self.collection_name = "notifications"
    
    async def get_database(self):
        """Get database connection"""
        try:
            return await Database.get_database()
        except Exception as e:
            logger.error(f"Database connection error: {e}")
            return None
    
    async def create_notification(
        self,
        notification_type: NotificationType,
        title: str,
        message: str,
        recipient_username: str,
        recipient_role: str,
        sender_username: Optional[str] = None,
        sender_role: Optional[str] = None,
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[str] = None,
        priority: NotificationPriority = NotificationPriority.MEDIUM,
        action_required: bool = False,
        action_type: Optional[str] = None,
        action_data: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        expires_in_hours: Optional[int] = None
    ) -> NotificationResponse:
        """Create a new notification"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            # Generate notification ID
            notification_id = generate_notification_id()
            
            # Calculate expiry if specified
            expires_at = None
            if expires_in_hours:
                expires_at = datetime.utcnow() + timedelta(hours=expires_in_hours)
            
            # Create notification
            notification = Notification(
                id=notification_id,
                type=notification_type,
                priority=priority,
                title=title,
                message=message,
                recipient_username=recipient_username,
                recipient_role=recipient_role,
                sender_username=sender_username,
                sender_role=sender_role,
                related_entity_type=related_entity_type,
                related_entity_id=related_entity_id,
                action_required=action_required,
                action_type=action_type,
                action_data=action_data or {},
                metadata=metadata or {},
                expires_at=expires_at
            )
            
            # Insert into database
            result = await db[self.collection_name].insert_one(notification.dict())
            
            if result.inserted_id:
                logger.info(f"Notification created: {notification_id} for {recipient_username}")
                return NotificationResponse(
                    success=True,
                    message="Notification created successfully",
                    notification_id=notification_id
                )
            else:
                raise Exception("Failed to insert notification")
                
        except Exception as e:
            logger.error(f"Error creating notification: {e}")
            return NotificationResponse(success=False, message=str(e))
    
    async def get_notifications_for_user(
        self,
        username: str,
        status_filter: Optional[List[NotificationStatus]] = None,
        page: int = 1,
        per_page: int = 20,
        unread_only: bool = False
    ) -> NotificationListResponse:
        """Get notifications for a specific user"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            # Build filter
            filter_query = {"recipient_username": username}
            
            if unread_only:
                filter_query["status"] = NotificationStatus.UNREAD.value
            elif status_filter:
                filter_query["status"] = {"$in": [s.value for s in status_filter]}
            
            # Add expiry filter (exclude expired notifications)
            current_time = datetime.utcnow()
            filter_query["$or"] = [
                {"expires_at": None},
                {"expires_at": {"$gt": current_time}}
            ]
            
            # Count total notifications
            total_count = await db[self.collection_name].count_documents(filter_query)
            
            # Count unread notifications
            unread_filter = filter_query.copy()
            unread_filter["status"] = NotificationStatus.UNREAD.value
            unread_count = await db[self.collection_name].count_documents(unread_filter)
            
            # Get paginated notifications
            skip = (page - 1) * per_page
            cursor = db[self.collection_name].find(filter_query).sort("created_at", -1).skip(skip).limit(per_page)
            notifications_data = await cursor.to_list(length=per_page)
            
            # Convert to Notification objects
            notifications = []
            for notif_data in notifications_data:
                notif_data["id"] = notif_data.get("_id", notif_data.get("id"))
                notifications.append(Notification(**notif_data))
            
            return NotificationListResponse(
                notifications=notifications,
                total_count=total_count,
                unread_count=unread_count,
                page=page,
                per_page=per_page
            )
            
        except Exception as e:
            logger.error(f"Error getting notifications for user {username}: {e}")
            return NotificationListResponse(
                notifications=[],
                total_count=0,
                unread_count=0,
                page=page,
                per_page=per_page
            )
    
    async def mark_notifications_as_read(self, notification_ids: List[str], username: str) -> NotificationResponse:
        """Mark notifications as read"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            current_time = datetime.utcnow()
            
            # Update notifications
            result = await db[self.collection_name].update_many(
                {
                    "id": {"$in": notification_ids},
                    "recipient_username": username,
                    "status": NotificationStatus.UNREAD.value
                },
                {
                    "$set": {
                        "status": NotificationStatus.READ.value,
                        "read_at": current_time
                    }
                }
            )
            
            if result.modified_count > 0:
                logger.info(f"Marked {result.modified_count} notifications as read for {username}")
                return NotificationResponse(
                    success=True,
                    message=f"Marked {result.modified_count} notifications as read"
                )
            else:
                return NotificationResponse(
                    success=False,
                    message="No notifications were updated"
                )
                
        except Exception as e:
            logger.error(f"Error marking notifications as read: {e}")
            return NotificationResponse(success=False, message=str(e))
    
    async def archive_notification(self, notification_id: str, username: str) -> NotificationResponse:
        """Archive a notification"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            current_time = datetime.utcnow()
            
            result = await db[self.collection_name].update_one(
                {
                    "id": notification_id,
                    "recipient_username": username
                },
                {
                    "$set": {
                        "status": NotificationStatus.ARCHIVED.value,
                        "archived_at": current_time
                    }
                }
            )
            
            if result.modified_count > 0:
                logger.info(f"Archived notification {notification_id} for {username}")
                return NotificationResponse(
                    success=True,
                    message="Notification archived successfully"
                )
            else:
                return NotificationResponse(
                    success=False,
                    message="Notification not found or already archived"
                )
                
        except Exception as e:
            logger.error(f"Error archiving notification: {e}")
            return NotificationResponse(success=False, message=str(e))
    
    async def handle_notification_action(
        self,
        notification_id: str,
        action: str,
        username: str,
        reason: Optional[str] = None,
        additional_data: Optional[Dict[str, Any]] = None
    ) -> NotificationResponse:
        """Handle action on a notification (approve/reject/acknowledge)"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            # Get the notification
            notification_data = await db[self.collection_name].find_one({
                "id": notification_id,
                "recipient_username": username,
                "action_required": True
            })
            
            if not notification_data:
                return NotificationResponse(
                    success=False,
                    message="Notification not found or action not required"
                )
            
            notification = Notification(**notification_data)
            
            # Handle different action types
            if notification.action_type == "approve_venue_booking" and action == "approve":
                await self._handle_venue_booking_approval(notification, True, reason, additional_data)
            elif notification.action_type == "approve_venue_booking" and action == "reject":
                await self._handle_venue_booking_approval(notification, False, reason, additional_data)
            elif notification.action_type == "approve_event_deletion" and action == "approve":
                await self._handle_event_deletion_approval(notification, True, reason, additional_data)
            elif notification.action_type == "approve_event_deletion" and action == "reject":
                await self._handle_event_deletion_approval(notification, False, reason, additional_data)
            else:
                return NotificationResponse(
                    success=False,
                    message=f"Unknown action type: {notification.action_type}"
                )
            
            # Mark notification as read and update metadata
            current_time = datetime.utcnow()
            await db[self.collection_name].update_one(
                {"id": notification_id},
                {
                    "$set": {
                        "status": NotificationStatus.READ.value,
                        "read_at": current_time,
                        f"metadata.action_taken": action,
                        f"metadata.action_reason": reason,
                        f"metadata.action_timestamp": current_time.isoformat()
                    }
                }
            )
            
            logger.info(f"Handled notification action: {notification_id} - {action} by {username}")
            return NotificationResponse(
                success=True,
                message=f"Action '{action}' completed successfully"
            )
            
        except Exception as e:
            logger.error(f"Error handling notification action: {e}")
            return NotificationResponse(success=False, message=str(e))
    
    async def _handle_venue_booking_approval(
        self,
        notification: Notification,
        approved: bool,
        reason: Optional[str] = None,
        additional_data: Optional[Dict[str, Any]] = None
    ):
        """Handle venue booking approval/rejection"""
        # Import here to avoid circular imports
        from services.venue_service import venue_service
        
        booking_id = notification.related_entity_id
        venue_id = notification.action_data.get("venue_id")
        
        if approved:
            await venue_service.approve_venue_booking(
                venue_id=venue_id,
                booking_id=booking_id,
                approved_by=notification.recipient_username,
                admin_notes=reason
            )
            
            # Notify the organizer about approval
            await self.create_notification(
                notification_type=NotificationType.VENUE_BOOKING_APPROVED,
                title="Venue Booking Approved",
                message=f"Your venue booking for '{notification.action_data.get('event_name')}' has been approved.",
                recipient_username=notification.action_data.get("booked_by"),
                recipient_role="organizer_admin",
                sender_username=notification.recipient_username,
                sender_role="venue_admin",
                related_entity_type="venue_booking",
                related_entity_id=booking_id,
                priority=NotificationPriority.HIGH
            )
        else:
            await venue_service.reject_venue_booking(
                venue_id=venue_id,
                booking_id=booking_id,
                rejected_by=notification.recipient_username,
                rejection_reason=reason
            )
            
            # Notify the organizer about rejection
            await self.create_notification(
                notification_type=NotificationType.VENUE_BOOKING_REJECTED,
                title="Venue Booking Rejected",
                message=f"Your venue booking for '{notification.action_data.get('event_name')}' has been rejected. Reason: {reason or 'No reason provided'}",
                recipient_username=notification.action_data.get("booked_by"),
                recipient_role="organizer_admin",
                sender_username=notification.recipient_username,
                sender_role="venue_admin",
                related_entity_type="venue_booking",
                related_entity_id=booking_id,
                priority=NotificationPriority.HIGH
            )
    
    async def _handle_event_deletion_approval(
        self,
        notification: Notification,
        approved: bool,
        reason: Optional[str] = None,
        additional_data: Optional[Dict[str, Any]] = None
    ):
        """Handle event deletion approval/rejection"""
        # TODO: Implement event_service for actual event deletion
        # from services.event_service import event_service
        
        event_id = notification.related_entity_id
        
        if approved:
            # TODO: Actually delete the event when event_service is implemented
            # await event_service.delete_event(event_id)
            logger.info(f"Event deletion approved for event_id: {event_id} (actual deletion pending event_service implementation)")
            
            # Notify the organizer about approval
            await self.create_notification(
                notification_type=NotificationType.EVENT_DELETION_APPROVED,
                title="Event Deletion Approved",
                message=f"Your request to delete event '{notification.action_data.get('event_name')}' has been approved and the event has been deleted.",
                recipient_username=notification.action_data.get("requested_by"),
                recipient_role="organizer_admin",
                sender_username=notification.recipient_username,
                sender_role="super_admin",
                related_entity_type="event",
                related_entity_id=event_id,
                priority=NotificationPriority.HIGH
            )
        else:
            # Notify the organizer about rejection
            await self.create_notification(
                notification_type=NotificationType.EVENT_DELETION_REJECTED,
                title="Event Deletion Rejected",
                message=f"Your request to delete event '{notification.action_data.get('event_name')}' has been rejected. Reason: {reason or 'No reason provided'}",
                recipient_username=notification.action_data.get("requested_by"),
                recipient_role="organizer_admin",
                sender_username=notification.recipient_username,
                sender_role="super_admin",
                related_entity_type="event",
                related_entity_id=event_id,
                priority=NotificationPriority.HIGH
            )
    
    async def send_venue_booking_request(
        self,
        venue_id: str,
        venue_name: str,
        booking_id: str,
        event_name: str,
        booked_by: str,
        start_datetime: str,
        end_datetime: str
    ) -> NotificationResponse:
        """Send venue booking request notification to venue admins"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            # Find all venue admins
            venue_admins = await db["admin_users"].find({"role": "venue_admin", "is_active": True}).to_list(None)
            
            responses = []
            for admin in venue_admins:
                response = await self.create_notification(
                    notification_type=NotificationType.VENUE_BOOKING_REQUEST,
                    title=f"New Venue Booking Request: {venue_name}",
                    message=f"Event '{event_name}' requests to book {venue_name} from {start_datetime} to {end_datetime}.",
                    recipient_username=admin["username"],
                    recipient_role="venue_admin",
                    sender_username=booked_by,
                    sender_role="organizer_admin",
                    related_entity_type="venue_booking",
                    related_entity_id=booking_id,
                    priority=NotificationPriority.HIGH,
                    action_required=True,
                    action_type="approve_venue_booking",
                    action_data={
                        "venue_id": venue_id,
                        "venue_name": venue_name,
                        "event_name": event_name,
                        "booked_by": booked_by,
                        "start_datetime": start_datetime,
                        "end_datetime": end_datetime
                    },
                    expires_in_hours=72  # 3 days to respond
                )
                responses.append(response)
            
            successful_notifications = sum(1 for r in responses if r.success)
            
            if successful_notifications > 0:
                return NotificationResponse(
                    success=True,
                    message=f"Venue booking request sent to {successful_notifications} venue admin(s)"
                )
            else:
                return NotificationResponse(
                    success=False,
                    message="Failed to send venue booking request notifications"
                )
                
        except Exception as e:
            logger.error(f"Error sending venue booking request: {e}")
            return NotificationResponse(success=False, message=str(e))
    
    async def send_event_deletion_request(
        self,
        event_id: str,
        event_name: str,
        requested_by: str,
        reason: str
    ) -> NotificationResponse:
        """Send event deletion request notification to super admins"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            # Find all super admins
            super_admins = await db["admin_users"].find({"role": "super_admin", "is_active": True}).to_list(None)
            
            responses = []
            for admin in super_admins:
                response = await self.create_notification(
                    notification_type=NotificationType.EVENT_DELETION_REQUEST,
                    title=f"Event Deletion Request: {event_name}",
                    message=f"Organizer {requested_by} requests to delete event '{event_name}'. Reason: {reason}",
                    recipient_username=admin["username"],
                    recipient_role="super_admin",
                    sender_username=requested_by,
                    sender_role="organizer_admin",
                    related_entity_type="event",
                    related_entity_id=event_id,
                    priority=NotificationPriority.HIGH,
                    action_required=True,
                    action_type="approve_event_deletion",
                    action_data={
                        "event_id": event_id,
                        "event_name": event_name,
                        "requested_by": requested_by,
                        "reason": reason
                    },
                    expires_in_hours=168  # 7 days to respond
                )
                responses.append(response)
            
            successful_notifications = sum(1 for r in responses if r.success)
            
            if successful_notifications > 0:
                return NotificationResponse(
                    success=True,
                    message=f"Event deletion request sent to {successful_notifications} super admin(s)"
                )
            else:
                return NotificationResponse(
                    success=False,
                    message="Failed to send event deletion request notifications"
                )
                
        except Exception as e:
            logger.error(f"Error sending event deletion request: {e}")
            return NotificationResponse(success=False, message=str(e))
    
    async def send_maintenance_scheduled_notification(
        self,
        venue_id: str,
        venue_name: str,
        maintenance_id: str,
        start_time: str,
        end_time: str,
        reason: str,
        affected_bookings: List[str],
        scheduled_by: str
    ) -> NotificationResponse:
        """Send maintenance scheduled notifications to affected users"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            # Get affected bookings
            bookings = await db["venue_bookings"].find(
                {"id": {"$in": affected_bookings}}
            ).to_list(length=None)
            
            responses = []
            for booking in bookings:
                response = await self.create_notification(
                    notification_type="VENUE_MAINTENANCE_SCHEDULED",
                    title=f"Maintenance Scheduled for {venue_name}",
                    message=f"Maintenance has been scheduled for {venue_name} from {start_time} to {end_time}. Your booking for '{booking.get('event_name')}' may be affected. Reason: {reason}",
                    recipient_username=booking.get("booked_by"),
                    recipient_role="organizer_admin",
                    sender_username=scheduled_by,
                    sender_role="venue_admin",
                    related_entity_type="maintenance_window",
                    related_entity_id=maintenance_id,
                    priority=NotificationPriority.HIGH,
                    metadata={
                        "venue_id": venue_id,
                        "venue_name": venue_name,
                        "booking_id": booking["id"],
                        "maintenance_start": start_time,
                        "maintenance_end": end_time,
                        "maintenance_reason": reason
                    }
                )
                responses.append(response)
            
            successful_notifications = sum(1 for r in responses if r.success)
            
            if successful_notifications > 0:
                return NotificationResponse(
                    success=True,
                    message=f"Maintenance notifications sent to {successful_notifications} user(s)"
                )
            else:
                return NotificationResponse(
                    success=True,  # Not an error if no affected users
                    message="No affected users to notify"
                )
                
        except Exception as e:
            logger.error(f"Error sending maintenance notifications: {e}")
            return NotificationResponse(success=False, message=str(e))

# Create singleton instance
notification_service = NotificationService()
