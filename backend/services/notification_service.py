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
            notification_dict = notification.dict()
            
            result = await db[self.collection_name].insert_one(notification_dict)
            
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
                # Handle ID field for Pydantic compatibility
                if "_id" in notif_data:
                    # Only use MongoDB _id if no custom id field exists
                    if "id" not in notif_data or notif_data["id"] is None:
                        notif_data["id"] = str(notif_data["_id"])
                    del notif_data["_id"]  # Remove the original _id field
                elif "id" in notif_data and hasattr(notif_data["id"], '__str__'):
                    notif_data["id"] = str(notif_data["id"])
                
                notification = Notification(**notif_data)
                notifications.append(notification)
            
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
            
            # Add detailed logging for debugging
            logger.info(f"🔍 Looking for notification with:")
            logger.info(f"   - notification_id: {notification_id}")
            logger.info(f"   - recipient_username: {username}")
            logger.info(f"   - action_required: True")
            
            # Get the notification
            notification_data = await db[self.collection_name].find_one({
                "id": notification_id,
                "recipient_username": username,
                "action_required": True
            })
            
            if not notification_data:
                # Additional debugging - check if notification exists with different criteria
                logger.error(f"❌ Notification not found with standard criteria")
                
                # Check if notification exists at all
                any_notification = await db[self.collection_name].find_one({"id": notification_id})
                if any_notification:
                    logger.error(f"❌ Notification exists but with different criteria:")
                    logger.error(f"   - actual recipient_username: {any_notification.get('recipient_username')}")
                    logger.error(f"   - actual action_required: {any_notification.get('action_required')}")
                    logger.error(f"   - provided username: {username}")
                else:
                    logger.error(f"❌ Notification {notification_id} does not exist in database")
                
                return NotificationResponse(
                    success=False,
                    message="Notification not found or action not required"
                )
            
            notification = Notification(**notification_data)
            
            # Log notification details for debugging
            logger.info(f"🔍 Processing notification action:")
            logger.info(f"   - notification_id: {notification_id}")
            logger.info(f"   - action: {action}")
            logger.info(f"   - action_type: {notification.action_type}")
            logger.info(f"   - action_required: {notification.action_required}")
            logger.info(f"   - reason: {reason}")
            
            # Handle different action types
            if notification.action_type == "approve_event_deletion" and action == "approve":
                await self._handle_event_deletion_approval(notification, True, reason, additional_data)
            elif notification.action_type == "approve_event_deletion" and action == "reject":
                await self._handle_event_deletion_approval(notification, False, reason, additional_data)
            elif notification.action_type == "approve_event" and action == "approve":
                await self._handle_event_approval(notification, True, reason, additional_data)
            elif notification.action_type == "approve_event" and action == "reject":
                await self._handle_event_approval(notification, False, reason, additional_data)
            else:
                return NotificationResponse(
                    success=False,
                    message=f"Unknown action type: {notification.action_type}"
                )
            
            # Mark notification as read and update metadata, then archive for event actions
            current_time = datetime.utcnow()
            update_data = {
                "status": NotificationStatus.READ.value,
                "read_at": current_time,
                f"metadata.action_taken": action,
                f"metadata.action_reason": reason,
                f"metadata.action_timestamp": current_time.isoformat()
            }
            
            # Archive event approval/rejection notifications after processing
            if notification.action_type in ["approve_event"]:
                update_data["status"] = NotificationStatus.ARCHIVED.value
                update_data["archived_at"] = current_time
                logger.info(f"🗂️ Archiving notification {notification_id} after event action")
            
            await db[self.collection_name].update_one(
                {"id": notification_id},
                {"$set": update_data}
            )
            
            logger.info(f"Handled notification action: {notification_id} - {action} by {username}")
            return NotificationResponse(
                success=True,
                message=f"Action '{action}' completed successfully"
            )
            
        except Exception as e:
            logger.error(f"Error handling notification action: {e}")
            return NotificationResponse(success=False, message=str(e))
    
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

    async def _handle_event_approval(self, notification: Notification, approved: bool, reason: str = None, additional_data: dict = None):
        """Handle event approval/rejection with email notifications and organizer account creation"""
        from database.operations import DatabaseOperations
        from services.email.service import EmailService
        from models.admin_user import AdminUser, AdminRole
        import secrets
        import string
        
        try:
            event_id = notification.action_data.get("event_id")
            event_name = notification.action_data.get("event_name", "Unknown Event")
            created_by = notification.action_data.get("created_by", "Unknown User")
            organizers = notification.action_data.get("organizers", [])
            event_data = notification.action_data  # Full event data for email templates
            
            if not event_id:
                logger.error("No event_id in notification action_data")
                return

            db = await Database.get_database("CampusConnect")
            if db is None:
                logger.error("Database connection failed")
                return
            
            # Initialize email service
            email_service = EmailService()
            logger.info(f"📧 Email service initialized for event {event_id} action: {'approve' if approved else 'reject'}")
            
            if approved:
                # Approve the event - update status to approved
                result = await db["events"].update_one(
                    {"event_id": event_id},
                    {"$set": {"status": "approved", "approved_at": datetime.utcnow()}}
                )
                
                if result.modified_count > 0:
                    logger.info(f"✅ Event {event_id} approved successfully")
                    
                    # Get super admin details for email template
                    super_admin = await db["admin_users"].find_one({"username": notification.recipient_username})
                    super_admin_name = super_admin.get("name", notification.recipient_username) if super_admin else notification.recipient_username
                    super_admin_email = super_admin.get("email", "") if super_admin else ""
                    super_admin_phone = super_admin.get("phone", "") if super_admin else ""
                    
                    # Process each organizer
                    for organizer in organizers:
                        organizer_email = organizer.get("email")
                        organizer_name = organizer.get("name", "Unknown Organizer")
                        organizer_employee_id = organizer.get("employee_id")
                        
                        if not organizer_email:
                            logger.warning(f"No email found for organizer: {organizer_name}")
                            continue
                        
                        # Check if organizer already has an admin account
                        existing_admin = await db["admin_users"].find_one({"email": organizer_email})
                        is_new_organizer = existing_admin is None
                        
                        username = None
                        temporary_password = None
                        
                        if is_new_organizer:
                            # Generate username and temporary password
                            username = organizer_employee_id or f"org_{organizer_email.split('@')[0]}"
                            # Ensure username is unique
                            existing_username = await db["admin_users"].find_one({"username": username})
                            if existing_username:
                                username = f"{username}_{secrets.token_hex(3)}"
                            
                            # Generate temporary password
                            temporary_password = self._generate_secure_password()
                            
                            # Create admin account for organizer
                            new_admin = AdminUser(
                                fullname=organizer_name,
                                username=username,
                                email=organizer_email,
                                password=temporary_password,
                                role=AdminRole.ORGANIZER_ADMIN,
                                is_active=True,
                                created_by=notification.recipient_username
                            )
                            
                            # Insert new admin user
                            admin_dict = new_admin.dict()
                            # Add extra fields that are not in the Pydantic model but needed in database
                            admin_dict["employee_id"] = organizer_employee_id
                            admin_dict["department"] = event_data.get("organizing_department", "")
                            admin_dict["must_change_password"] = True
                            await db["admin_users"].insert_one(admin_dict)
                            
                            logger.info(f"✅ Created new organizer admin account: {username}")
                        else:
                            username = existing_admin["username"]
                            logger.info(f"ℹ️ Using existing admin account: {username}")
                        
                        # Send approval email with event template
                        try:
                            if is_new_organizer:
                                # Send email with credentials for new organizers
                                success = await email_service.send_new_organizer_approval_notification(
                                    organizer_email=organizer_email,
                                    organizer_name=organizer_name,
                                    event_data=event_data,
                                    super_admin_name=super_admin_name,
                                    approval_date=datetime.utcnow().strftime("%B %d, %Y at %I:%M %p"),
                                    username=username,
                                    temporary_password=temporary_password,
                                    portal_url="http://localhost:3000/admin",  # Update with actual URL
                                    approval_message=reason
                                )
                            else:
                                # Send approval email for existing organizers (without credentials)
                                subject = f"🎉 Event Approved: {event_name}"
                                html_content = email_service.render_template(
                                    'event_approved.html',
                                    organizer_name=organizer_name,
                                    event_name=event_name,
                                    super_admin_name=super_admin_name,
                                    approval_date=datetime.utcnow().strftime("%B %d, %Y at %I:%M %p"),
                                    event_id=event_id,
                                    event_type=event_data.get("event_type", "N/A"),
                                    organizing_department=event_data.get("organizing_department", "N/A"),
                                    start_date=event_data.get("start_date", "TBD"),
                                    end_date=event_data.get("end_date", "TBD"),
                                    event_mode=event_data.get("mode", "N/A"),
                                    is_new_organizer=False,
                                    username=username,
                                    portal_url="http://localhost:3000/admin",
                                    approval_message=reason,
                                    support_email="support@campusconnect.edu"
                                )
                                success = await email_service.send_email_async(organizer_email, subject, html_content)
                            
                            if success:
                                logger.info(f"✅ Sent approval email to {organizer_email}")
                            else:
                                logger.error(f"❌ Failed to send approval email to {organizer_email}")
                            
                        except Exception as e:
                            logger.error(f"Failed to send approval email to {organizer_email}: {e}")
                    
                    # Create success notification for event creator
                    await self.create_notification(
                        notification_type=NotificationType.EVENT_APPROVED,
                        title="Event Approved",
                        message=f"Your event '{event_name}' has been approved! All organizers have been notified and given admin access.",
                        recipient_username=created_by,
                        recipient_role="event_creator",
                        sender_username=notification.recipient_username,
                        sender_role="super_admin",
                        related_entity_type="event",
                        related_entity_id=event_id,
                        priority=NotificationPriority.HIGH,
                        action_required=False,
                        metadata={
                            "approval_reason": reason,
                            "approved_by": notification.recipient_username,
                            "organizers_count": len(organizers)
                        }
                    )
                else:
                    logger.warning(f"⚠️ Event {event_id} not found or already processed")
            else:
                # Reject the event - DELETE it from database
                logger.info(f"🔄 Starting event rejection process for event_id: {event_id}")
                logger.info(f"📧 Event has {len(organizers)} organizers to notify")
                
                result = await db["events"].delete_one({"event_id": event_id})
                
                if result.deleted_count > 0:
                    logger.info(f"🗑️ Event {event_id} rejected and deleted successfully")
                    
                    # Get super admin details for email template
                    super_admin = await db["admin_users"].find_one({"username": notification.recipient_username})
                    super_admin_name = super_admin.get("name", notification.recipient_username) if super_admin else notification.recipient_username
                    super_admin_email = super_admin.get("email", "") if super_admin else ""
                    super_admin_phone = super_admin.get("phone", "") if super_admin else ""
                    super_admin_office = super_admin.get("office", "") if super_admin else ""
                    
                    # Send rejection email to all organizers
                    for organizer in organizers:
                        organizer_email = organizer.get("email")
                        organizer_name = organizer.get("name", "Unknown Organizer")
                        
                        if not organizer_email:
                            logger.warning(f"No email found for organizer: {organizer_name}")
                            continue
                        
                        try:
                            logger.info(f"📧 Attempting to send rejection email to {organizer_email}")
                            success = await email_service.send_new_organizer_declined_notification(
                                organizer_email=organizer_email,
                                organizer_name=organizer_name,
                                event_data=event_data,
                                super_admin_name=super_admin_name,
                                super_admin_email=super_admin_email,
                                decision_date=datetime.utcnow().strftime("%B %d, %Y at %I:%M %p"),
                                reason=reason or "No specific reason provided",
                                portal_url="http://localhost:3000/admin",  # Update with actual URL
                                super_admin_phone=super_admin_phone,
                                super_admin_office=super_admin_office
                            )
                            
                            if success:
                                logger.info(f"✅ Sent rejection email to {organizer_email}")
                            else:
                                logger.error(f"❌ Failed to send rejection email to {organizer_email}")
                            
                        except Exception as e:
                            logger.error(f"❌ Exception sending rejection email to {organizer_email}: {e}")
                            import traceback
                            logger.error(f"Full traceback: {traceback.format_exc()}")
                    
                    # Notify the event creator about rejection
                    await self.create_notification(
                        notification_type=NotificationType.EVENT_REJECTED,
                        title="Event Rejected",
                        message=f"Your event '{event_name}' has been rejected and removed. Reason: {reason or 'No reason provided'}",
                        recipient_username=created_by,
                        recipient_role="event_creator", 
                        sender_username=notification.recipient_username,
                        sender_role="super_admin",
                        related_entity_type="event",
                        related_entity_id=event_id,
                        priority=NotificationPriority.HIGH,
                        action_required=False,
                        metadata={
                            "rejection_reason": reason,
                            "rejected_by": notification.recipient_username
                        }
                    )
                else:
                    logger.warning(f"⚠️ Event {event_id} not found for deletion")
                    
        except Exception as e:
            logger.error(f"Error handling event approval: {e}")
            raise

    def _generate_secure_password(self, length: int = 12) -> str:
        """Generate a secure temporary password"""
        import secrets
        import string
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        password = ''.join(secrets.choice(alphabet) for _ in range(length))
        return password

# Create singleton instance
notification_service = NotificationService()
