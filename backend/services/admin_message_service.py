"""
Admin Message Service for inter-admin communication
"""
import logging
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient

from config.database import Database
from models.admin_message import (
    AdminMessageThread, CreateThreadRequest, SendMessageRequest, 
    UpdateThreadRequest, MarkReadRequest, ThreadFilters, ThreadSummary,
    MessageThreadResponse, ThreadListResponse, MessageStatistics,
    MessageContent, MessagePriority, ThreadStatus, MessageStatus, ThreadContext
)
from models.admin_user import AdminUser
from core.id_generator import generate_notification_id
from services.notification_service import notification_service
from models.notification import NotificationType

logger = logging.getLogger(__name__)

class AdminMessageService:
    def __init__(self):
        self.database = Database()
        
    async def get_database(self):
        """Get database connection"""
        return await self.database.get_database()
    
    async def create_thread(
        self, 
        request: CreateThreadRequest, 
        sender: AdminUser
    ) -> MessageThreadResponse:
        """Create a new message thread"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            # Generate thread ID
            thread_id = f"THR{generate_notification_id()}"
            message_id = f"MSG{generate_notification_id()}"
            
            current_time = datetime.utcnow().isoformat()
            
            # Add sender to participants if not already included
            all_participants = list(set(request.participants + [sender.username]))
            
            # Get participant details
            participant_roles = {}
            participant_names = {}
            
            for username in all_participants:
                admin_user = await db["admin_users"].find_one({"username": username})
                if admin_user:
                    participant_roles[username] = admin_user.get("role", "admin")
                    participant_names[username] = admin_user.get("fullname", username)
                else:
                    # Handle case where participant not found
                    participant_roles[username] = "admin"
                    participant_names[username] = username
            
            # Create initial message
            initial_message = MessageContent(
                message_id=message_id,
                sender_username=sender.username,
                sender_role=sender.role,
                sender_name=sender.fullname,
                content=request.initial_message,
                timestamp=current_time,
                status=MessageStatus.SENT,
                read_by=[sender.username],
                read_timestamps={sender.username: current_time}
            )
            
            # Initialize unread counts (all participants except sender have 1 unread)
            unread_count = {}
            last_read_message = {}
            for participant in all_participants:
                if participant == sender.username:
                    unread_count[participant] = 0
                    last_read_message[participant] = message_id
                else:
                    unread_count[participant] = 1
                    last_read_message[participant] = ""
            
            # Create thread document
            thread = AdminMessageThread(
                thread_id=thread_id,
                subject=request.subject,
                participants=all_participants,
                participant_roles=participant_roles,
                participant_names=participant_names,
                messages=[initial_message],
                context=request.context,
                priority=request.priority,
                status=ThreadStatus.ACTIVE,
                created_by=sender.username,
                created_at=current_time,
                updated_at=current_time,
                last_message_at=current_time,
                tags=request.tags,
                unread_count=unread_count,
                last_read_message=last_read_message
            )
            
            # Save to database
            await db["admin_message_threads"].insert_one(thread.dict())
            
            # Send notifications to other participants
            for participant in all_participants:
                if participant != sender.username:
                    await notification_service.create_notification(
                        notification_type=NotificationType.NEW_MESSAGE,
                        title=f"New Message: {request.subject}",
                        message=f"You have a new message from {sender.fullname} in thread '{request.subject}'",
                        recipient_username=participant,
                        recipient_role=participant_roles[participant],
                        sender_username=sender.username,
                        sender_role=sender.role,
                        related_entity_id=thread_id,
                        action_data={
                            "thread_id": thread_id,
                            "message_id": message_id,
                            "sender_name": sender.fullname
                        }
                    )
            
            logger.info(f"Created message thread {thread_id} by {sender.username}")
            
            return MessageThreadResponse(
                success=True,
                message="Thread created successfully",
                thread_id=thread_id,
                thread=thread
            )
            
        except Exception as e:
            logger.error(f"Error creating thread: {e}")
            return MessageThreadResponse(
                success=False,
                message=f"Failed to create thread: {str(e)}"
            )
    
    async def send_message(
        self, 
        thread_id: str, 
        request: SendMessageRequest, 
        sender: AdminUser
    ) -> MessageThreadResponse:
        """Send a message to an existing thread"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            # Get existing thread
            thread_doc = await db["admin_message_threads"].find_one({"thread_id": thread_id})
            if not thread_doc:
                return MessageThreadResponse(
                    success=False,
                    message="Thread not found"
                )
            
            # Check if sender is participant
            if sender.username not in thread_doc["participants"]:
                return MessageThreadResponse(
                    success=False,
                    message="You are not a participant in this thread"
                )
            
            # Generate message ID
            message_id = f"MSG{generate_notification_id()}"
            current_time = datetime.utcnow().isoformat()
            
            # Create new message
            new_message = MessageContent(
                message_id=message_id,
                sender_username=sender.username,
                sender_role=sender.role,
                sender_name=sender.fullname,
                content=request.content,
                timestamp=current_time,
                status=MessageStatus.SENT,
                read_by=[sender.username],
                read_timestamps={sender.username: current_time}
            )
            
            # Update thread with new message
            update_result = await db["admin_message_threads"].update_one(
                {"thread_id": thread_id},
                {
                    "$push": {"messages": new_message.dict()},
                    "$set": {
                        "updated_at": current_time,
                        "last_message_at": current_time
                    },
                    "$inc": {
                        **{f"unread_count.{participant}": 1 
                           for participant in thread_doc["participants"] 
                           if participant != sender.username}
                    }
                }
            )
            
            # Reset sender's unread count
            await db["admin_message_threads"].update_one(
                {"thread_id": thread_id},
                {
                    "$set": {
                        f"unread_count.{sender.username}": 0,
                        f"last_read_message.{sender.username}": message_id
                    }
                }
            )
            
            if update_result.modified_count == 0:
                return MessageThreadResponse(
                    success=False,
                    message="Failed to send message"
                )
            
            # Send notifications to other participants
            for participant in thread_doc["participants"]:
                if participant != sender.username:
                    participant_role = thread_doc["participant_roles"].get(participant, "admin")
                    await notification_service.create_notification(
                        notification_type=NotificationType.NEW_MESSAGE,
                        title=f"New Message: {thread_doc['subject']}",
                        message=f"New message from {sender.fullname} in '{thread_doc['subject']}'",
                        recipient_username=participant,
                        recipient_role=participant_role,
                        sender_username=sender.username,
                        sender_role=sender.role,
                        related_entity_id=thread_id,
                        action_data={
                            "thread_id": thread_id,
                            "message_id": message_id,
                            "sender_name": sender.fullname
                        }
                    )
            
            logger.info(f"Sent message {message_id} to thread {thread_id} by {sender.username}")
            
            return MessageThreadResponse(
                success=True,
                message="Message sent successfully",
                thread_id=thread_id,
                message_id=message_id
            )
            
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            return MessageThreadResponse(
                success=False,
                message=f"Failed to send message: {str(e)}"
            )
    
    async def get_thread(self, thread_id: str, user: AdminUser) -> MessageThreadResponse:
        """Get a specific thread with all messages"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            thread_doc = await db["admin_message_threads"].find_one({"thread_id": thread_id})
            if not thread_doc:
                return MessageThreadResponse(
                    success=False,
                    message="Thread not found"
                )
            
            # Check if user is participant (or super admin)
            if user.username not in thread_doc["participants"] and user.role != "super_admin":
                return MessageThreadResponse(
                    success=False,
                    message="Access denied"
                )
            
            # Convert to Pydantic model
            thread = AdminMessageThread(**thread_doc)
            
            return MessageThreadResponse(
                success=True,
                message="Thread retrieved successfully",
                thread=thread
            )
            
        except Exception as e:
            logger.error(f"Error getting thread {thread_id}: {e}")
            return MessageThreadResponse(
                success=False,
                message=f"Failed to get thread: {str(e)}"
            )
    
    async def get_threads(
        self, 
        user: AdminUser, 
        filters: ThreadFilters, 
        page: int = 1, 
        per_page: int = 20
    ) -> ThreadListResponse:
        """Get list of threads for a user with filters"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            # Build query
            query = {}
            
            # User access control
            if user.role != "super_admin":
                query["participants"] = user.username
            
            # Apply filters
            if filters.status:
                query["status"] = {"$in": [s.value for s in filters.status]}
            
            if filters.priority:
                query["priority"] = {"$in": [p.value for p in filters.priority]}
            
            if filters.participants:
                query["participants"] = {"$in": filters.participants}
            
            if filters.context_category:
                query["context.category"] = filters.context_category
            
            if filters.venue_id:
                query["context.venue_id"] = filters.venue_id
            
            if filters.event_id:
                query["context.event_id"] = filters.event_id
            
            if filters.tags:
                query["tags"] = {"$in": filters.tags}
            
            if filters.pinned_only:
                query["is_pinned"] = True
            
            if filters.created_after:
                query["created_at"] = {"$gte": filters.created_after}
            
            if filters.created_before:
                query.setdefault("created_at", {})["$lte"] = filters.created_before
            
            if filters.search_query:
                query["$or"] = [
                    {"subject": {"$regex": filters.search_query, "$options": "i"}},
                    {"messages.content": {"$regex": filters.search_query, "$options": "i"}}
                ]
            
            # Handle unread filter
            if filters.unread_only and user.username:
                query[f"unread_count.{user.username}"] = {"$gt": 0}
            
            # Get total count
            total_count = await db["admin_message_threads"].count_documents(query)
            
            # Calculate pagination
            skip = (page - 1) * per_page
            total_pages = (total_count + per_page - 1) // per_page
            
            # Get threads with pagination
            cursor = db["admin_message_threads"].find(query)\
                .sort("last_message_at", -1)\
                .skip(skip)\
                .limit(per_page)
            
            thread_docs = await cursor.to_list(length=per_page)
            
            # Convert to thread summaries
            thread_summaries = []
            unread_threads = 0
            
            for doc in thread_docs:
                # Get last message preview
                last_message = ""
                last_message_sender = None
                if doc.get("messages"):
                    last_msg = doc["messages"][-1]
                    last_message = last_msg["content"][:100] + "..." if len(last_msg["content"]) > 100 else last_msg["content"]
                    last_message_sender = last_msg["sender_name"]
                
                # Get user's unread count
                user_unread_count = doc.get("unread_count", {}).get(user.username, 0)
                if user_unread_count > 0:
                    unread_threads += 1
                
                summary = ThreadSummary(
                    thread_id=doc["thread_id"],
                    subject=doc["subject"],
                    participants=doc["participants"],
                    participant_names=doc.get("participant_names", {}),
                    participant_roles=doc.get("participant_roles", {}),
                    last_message_preview=last_message,
                    last_message_at=doc.get("last_message_at"),
                    last_message_sender=last_message_sender,
                    unread_count=user_unread_count,
                    total_messages=len(doc.get("messages", [])),
                    priority=MessagePriority(doc.get("priority", "normal")),
                    status=ThreadStatus(doc.get("status", "active")),
                    is_pinned=doc.get("is_pinned", False),
                    tags=doc.get("tags", []),
                    context=ThreadContext(**doc["context"]) if doc.get("context") else None,
                    created_at=doc["created_at"]
                )
                thread_summaries.append(summary)
            
            return ThreadListResponse(
                success=True,
                message="Threads retrieved successfully",
                threads=thread_summaries,
                total_count=total_count,
                unread_threads=unread_threads,
                page=page,
                per_page=per_page,
                total_pages=total_pages
            )
            
        except Exception as e:
            logger.error(f"Error getting threads: {e}")
            return ThreadListResponse(
                success=False,
                message=f"Failed to get threads: {str(e)}"
            )
    
    async def mark_as_read(
        self, 
        thread_id: str, 
        request: MarkReadRequest, 
        user: AdminUser
    ) -> MessageThreadResponse:
        """Mark messages as read"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            thread_doc = await db["admin_message_threads"].find_one({"thread_id": thread_id})
            if not thread_doc:
                return MessageThreadResponse(
                    success=False,
                    message="Thread not found"
                )
            
            # Check if user is participant
            if user.username not in thread_doc["participants"]:
                return MessageThreadResponse(
                    success=False,
                    message="Access denied"
                )
            
            current_time = datetime.utcnow().isoformat()
            
            if request.message_ids:
                # Mark specific messages as read
                for message_id in request.message_ids:
                    await db["admin_message_threads"].update_one(
                        {
                            "thread_id": thread_id,
                            "messages.message_id": message_id
                        },
                        {
                            "$addToSet": {f"messages.$.read_by": user.username},
                            "$set": {f"messages.$.read_timestamps.{user.username}": current_time}
                        }
                    )
            else:
                # Mark all messages as read
                await db["admin_message_threads"].update_one(
                    {"thread_id": thread_id},
                    {
                        "$addToSet": {"messages.$[].read_by": user.username},
                        "$set": {
                            f"messages.$[].read_timestamps.{user.username}": current_time,
                            f"unread_count.{user.username}": 0
                        }
                    }
                )
                
                # Update last read message to the latest
                if thread_doc.get("messages"):
                    latest_message_id = thread_doc["messages"][-1]["message_id"]
                    await db["admin_message_threads"].update_one(
                        {"thread_id": thread_id},
                        {"$set": {f"last_read_message.{user.username}": latest_message_id}}
                    )
            
            # Recalculate unread count
            await self._recalculate_unread_count(thread_id, user.username)
            
            logger.info(f"Marked messages as read in thread {thread_id} by {user.username}")
            
            return MessageThreadResponse(
                success=True,
                message="Messages marked as read"
            )
            
        except Exception as e:
            logger.error(f"Error marking as read: {e}")
            return MessageThreadResponse(
                success=False,
                message=f"Failed to mark as read: {str(e)}"
            )
    
    async def update_thread(
        self, 
        thread_id: str, 
        request: UpdateThreadRequest, 
        user: AdminUser
    ) -> MessageThreadResponse:
        """Update thread properties"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            thread_doc = await db["admin_message_threads"].find_one({"thread_id": thread_id})
            if not thread_doc:
                return MessageThreadResponse(
                    success=False,
                    message="Thread not found"
                )
            
            # Check permissions (creator or super admin)
            if thread_doc["created_by"] != user.username and user.role != "super_admin":
                return MessageThreadResponse(
                    success=False,
                    message="Permission denied"
                )
            
            # Build update document
            update_doc = {"updated_at": datetime.utcnow().isoformat()}
            
            if request.subject is not None:
                update_doc["subject"] = request.subject
            
            if request.priority is not None:
                update_doc["priority"] = request.priority.value
            
            if request.status is not None:
                update_doc["status"] = request.status.value
            
            if request.is_pinned is not None:
                update_doc["is_pinned"] = request.is_pinned
            
            if request.tags is not None:
                update_doc["tags"] = request.tags
            
            # Update thread
            result = await db["admin_message_threads"].update_one(
                {"thread_id": thread_id},
                {"$set": update_doc}
            )
            
            if result.modified_count == 0:
                return MessageThreadResponse(
                    success=False,
                    message="No changes made"
                )
            
            logger.info(f"Updated thread {thread_id} by {user.username}")
            
            return MessageThreadResponse(
                success=True,
                message="Thread updated successfully"
            )
            
        except Exception as e:
            logger.error(f"Error updating thread: {e}")
            return MessageThreadResponse(
                success=False,
                message=f"Failed to update thread: {str(e)}"
            )
    
    async def delete_thread(self, thread_id: str, user: AdminUser) -> MessageThreadResponse:
        """Delete/archive a thread"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            thread_doc = await db["admin_message_threads"].find_one({"thread_id": thread_id})
            if not thread_doc:
                return MessageThreadResponse(
                    success=False,
                    message="Thread not found"
                )
            
            # Check permissions (creator or super admin)
            if thread_doc["created_by"] != user.username and user.role != "super_admin":
                return MessageThreadResponse(
                    success=False,
                    message="Permission denied"
                )
            
            # Archive instead of delete for audit purposes
            await db["admin_message_threads"].update_one(
                {"thread_id": thread_id},
                {
                    "$set": {
                        "status": ThreadStatus.ARCHIVED.value,
                        "updated_at": datetime.utcnow().isoformat()
                    }
                }
            )
            
            logger.info(f"Archived thread {thread_id} by {user.username}")
            
            return MessageThreadResponse(
                success=True,
                message="Thread archived successfully"
            )
            
        except Exception as e:
            logger.error(f"Error deleting thread: {e}")
            return MessageThreadResponse(
                success=False,
                message=f"Failed to delete thread: {str(e)}"
            )
    
    async def get_statistics(self, user: AdminUser) -> MessageStatistics:
        """Get messaging statistics"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            # Build base query for user access
            base_query = {}
            if user.role != "super_admin":
                base_query["participants"] = user.username
            
            # Get basic counts
            total_threads = await db["admin_message_threads"].count_documents(base_query)
            
            active_threads = await db["admin_message_threads"].count_documents({
                **base_query,
                "status": ThreadStatus.ACTIVE.value
            })
            
            archived_threads = await db["admin_message_threads"].count_documents({
                **base_query,
                "status": ThreadStatus.ARCHIVED.value
            })
            
            # Get unread messages for user
            unread_messages = 0
            if user.username:
                pipeline = [
                    {"$match": base_query},
                    {"$project": {f"unread_count.{user.username}": 1}},
                    {"$group": {"_id": None, "total": {"$sum": f"$unread_count.{user.username}"}}}
                ]
                result = await db["admin_message_threads"].aggregate(pipeline).to_list(1)
                if result:
                    unread_messages = result[0].get("total", 0)
            
            # Get total messages count
            pipeline = [
                {"$match": base_query},
                {"$project": {"message_count": {"$size": "$messages"}}},
                {"$group": {"_id": None, "total": {"$sum": "$message_count"}}}
            ]
            result = await db["admin_message_threads"].aggregate(pipeline).to_list(1)
            total_messages = result[0].get("total", 0) if result else 0
            
            # Get threads by priority
            pipeline = [
                {"$match": base_query},
                {"$group": {"_id": "$priority", "count": {"$sum": 1}}}
            ]
            priority_results = await db["admin_message_threads"].aggregate(pipeline).to_list(10)
            threads_by_priority = {item["_id"]: item["count"] for item in priority_results}
            
            # Get messages from last 7 days
            seven_days_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
            pipeline = [
                {"$match": {**base_query, "last_message_at": {"$gte": seven_days_ago}}},
                {"$project": {"message_count": {"$size": "$messages"}}},
                {"$group": {"_id": None, "total": {"$sum": "$message_count"}}}
            ]
            result = await db["admin_message_threads"].aggregate(pipeline).to_list(1)
            messages_last_7_days = result[0].get("total", 0) if result else 0
            
            return MessageStatistics(
                total_threads=total_threads,
                active_threads=active_threads,
                archived_threads=archived_threads,
                total_messages=total_messages,
                unread_messages=unread_messages,
                threads_by_priority=threads_by_priority,
                messages_last_7_days=messages_last_7_days
            )
            
        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            return MessageStatistics()
    
    async def _recalculate_unread_count(self, thread_id: str, username: str):
        """Recalculate unread count for a user in a thread"""
        try:
            db = await self.get_database()
            if db is None:
                return
            
            # Get thread
            thread_doc = await db["admin_message_threads"].find_one({"thread_id": thread_id})
            if not thread_doc:
                return
            
            # Count unread messages
            unread_count = 0
            for message in thread_doc.get("messages", []):
                if username not in message.get("read_by", []):
                    unread_count += 1
            
            # Update count
            await db["admin_message_threads"].update_one(
                {"thread_id": thread_id},
                {"$set": {f"unread_count.{username}": unread_count}}
            )
            
        except Exception as e:
            logger.error(f"Error recalculating unread count: {e}")

# Create service instance
admin_message_service = AdminMessageService()
