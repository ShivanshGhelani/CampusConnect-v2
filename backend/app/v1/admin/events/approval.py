"""
Event Approval System - Approve/Decline endpoints for Executive Admin workflow
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime
from dependencies.auth import require_admin, require_admin_with_refresh
from models.admin_user import AdminUser, AdminRole
from config.database import Database
from services.event_organizer_service import EventOrganizerService
from utils.redis_cache import event_cache
from bson import ObjectId
import logging
import re

# Initialize router and services
router = APIRouter()
event_organizer_service = EventOrganizerService()
logger = logging.getLogger(__name__)

def invalidate_admin_cache():
    """Invalidate all admin events cache entries"""
    try:
        if event_cache.is_available():
            # Get all keys matching admin_events pattern
            keys = event_cache.redis_client.keys("admin_events:*")
            if keys:
                deleted_count = event_cache.redis_client.delete(*keys)
                logger.info(f"🗑️ Invalidated {deleted_count} admin cache entries")
            else:
                logger.debug("No admin cache entries to invalidate")
    except Exception as e:
        logger.warning(f"Failed to invalidate admin cache: {e}")

@router.post("/approve/{event_id}")
async def approve_event(
    event_id: str,
    admin: AdminUser = Depends(require_admin_with_refresh)
):
    """Approve a pending event - accessible by Super Admin and assigned faculty organizers"""
    try:
        # Get database connection
        db = await Database.get_database()
        
        # Get the event from database
        event = await db.events.find_one({"event_id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Check permissions
        can_approve = False
        
        # Super Admin can approve any event
        if admin.role == AdminRole.SUPER_ADMIN:
            can_approve = True
            logger.info(f"🔑 Super Admin {admin.username} approving event: {event_id}")
        
        # Faculty organizers can approve events assigned to them
        elif admin.role == AdminRole.ORGANIZER_ADMIN:
            # Check if this faculty is assigned to the event
            faculty_organizers = event.get("faculty_organizers", [])
            if admin.employee_id and admin.employee_id in faculty_organizers:
                can_approve = True
                logger.info(f"🔑 Faculty Organizer {admin.username} ({admin.employee_id}) approving assigned event: {event_id}")
            else:
                raise HTTPException(status_code=403, detail="You can only approve events assigned to you")
        
        else:
            raise HTTPException(status_code=403, detail="Only Super Admins and assigned Faculty Organizers can approve events")
        
        if not can_approve:
            raise HTTPException(status_code=403, detail="Permission denied")
        
        # Check if event is in pending status
        if event.get("event_approval_status") != "pending_approval":
            raise HTTPException(status_code=400, detail="Event is not in pending approval status")
        
        # Update event approval status
        update_result = await db.events.update_one(
            {"event_id": event_id},
            {
                "$set": {
                    "event_approval_status": "approved",
                    "published": True,
                    "approved_by": admin.username,
                    "approved_at": datetime.utcnow(),
                    "approval_required": False
                }
            }
        )
        if update_result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to update event status")
        
        # Invalidate admin cache since event status changed
        invalidate_admin_cache()
        # Add approved event to scheduler for real-time status updates
        try:
            # Get the updated event data
            updated_event = await db.events.find_one({"event_id": event_id})
            if updated_event:
                from utils.dynamic_event_scheduler import add_event_to_scheduler
                await add_event_to_scheduler(updated_event)
                logger.info(f"✅ Added approved event {event_id} to scheduler")
        except Exception as scheduler_error:
            logger.warning(f"⚠️ Failed to add approved event to scheduler: {scheduler_error}")
            # Don't fail the approval if scheduler fails
        
        # Log the approval action using event action logger
        try:
            from services.event_action_logger import event_action_logger
            await event_action_logger.log_event_approved(
                event_id=event_id,
                event_name=event.get("event_name", "Unknown Event"),
                approved_by_username=admin.username,
                approved_by_role=admin.role.value,
                event_data=event,
                approval_timestamp=datetime.utcnow(),
                request_metadata={
                    "approver_employee_id": admin.employee_id,
                    "approval_method": "admin_portal",
                    "event_type": event.get("event_type"),
                    "organizing_department": event.get("organizing_department")
                }
            )
            logger.info(f"✅ Approval action logged for event {event_id}")
        except Exception as log_error:
            logger.error(f"❌ Failed to log approval action for {event_id}: {log_error}")
            # Don't fail the approval if logging fails
        
        # Send approval email to event creator if they have an email
        creator_email = event.get("event_creator_email")
        if creator_email:
            try:
                # Import email service here to avoid circular imports
                from services.communication.email_service import send_template_email
                
                # Prepare email context
                event_name = event.get("event_name", "Unknown Event")
                creator_name = event.get("event_created_by", "Event Creator")
                venue = event.get("venue", "TBD")
                event_type = event.get("event_type", "General")
                
                # Extract date and time from start_datetime
                start_datetime = event.get("start_datetime")
                if start_datetime:
                    if isinstance(start_datetime, str):
                        try:
                            # Parse ISO string datetime
                            dt = datetime.fromisoformat(start_datetime.replace('Z', '+00:00'))
                            event_date = dt.strftime('%B %d, %Y')  # e.g., "September 02, 2025"
                            event_time = dt.strftime('%I:%M %p')   # e.g., "02:30 PM"
                        except:
                            event_date = "TBD"
                            event_time = "TBD"
                    elif hasattr(start_datetime, 'strftime'):
                        # Direct datetime object
                        event_date = start_datetime.strftime('%B %d, %Y')
                        event_time = start_datetime.strftime('%I:%M %p')
                    else:
                        event_date = "TBD"
                        event_time = "TBD"
                else:
                    event_date = "TBD"
                    event_time = "TBD"
                
                context = {
                    "creator_name": creator_name,
                    "event_name": event_name,
                    "event_id": event_id,
                    "event_type": event_type,
                    "event_date": event_date,
                    "event_time": event_time,
                    "venue": venue,
                    "approved_by": admin.username,
                    "approved_date": datetime.utcnow().strftime('%B %d, %Y at %I:%M %p UTC'),
                    "event_url": f"https://campusconnect.edu/events/{event_id}",  # Update with actual domain
                    "dashboard_url": "https://campusconnect.edu/admin/events",  # Update with actual domain
                    "help_url": "https://campusconnect.edu/help",
                    "event_management_guide_url": "https://campusconnect.edu/help/event-management",
                    "contact_url": "https://campusconnect.edu/contact"
                }
                
                subject = f"🎉 Event Approved: {event_name}"
                
                await send_template_email(
                    to_email=creator_email,
                    template_name="event_approved",
                    subject=subject,
                    context=context
                )
                logger.info(f"✅ Approval email sent to event creator: {creator_email}")
                
            except Exception as e:
                logger.error(f"❌ Failed to send approval email to {creator_email}: {str(e)}")
                # Don't fail the approval if email fails
        
        logger.info(f"✅ Event {event_id} approved by {admin.username}")
        
        # Get the updated event for response and fix ObjectId serialization
        updated_event = await db.events.find_one({"event_id": event_id})
        
        # Comprehensive ObjectId and BSON serialization fix
        def fix_objectid(obj):
            """Recursively convert BSON types to JSON-serializable types"""
            if obj is None:
                return None
            elif isinstance(obj, ObjectId):
                return str(obj)
            elif isinstance(obj, dict):
                return {k: fix_objectid(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [fix_objectid(item) for item in obj]
            elif isinstance(obj, tuple):
                return tuple(fix_objectid(item) for item in obj)
            elif hasattr(obj, 'isoformat'):  # datetime objects
                return obj.isoformat()
            elif hasattr(obj, '__dict__'):
                # Handle other BSON/custom objects
                try:
                    return str(obj)
                except:
                    return None
            else:
                return obj
        
        # Serialize the updated event safely
        serialized_event = fix_objectid(updated_event) if updated_event else None
        
        return {
            "success": True,
            "message": f"Event '{event.get('event_name')}' has been approved successfully",
            "event_id": event_id,
            "approved_by": admin.username,
            "approved_at": datetime.utcnow().isoformat(),
            "event": serialized_event  # Include serialized event data for frontend logging
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving event {event_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error approving event: {str(e)}")

@router.post("/decline/{event_id}")
async def decline_event(
    event_id: str,
    request: Request,
    admin: AdminUser = Depends(require_admin_with_refresh)
):
    """Decline a pending event - accessible by Super Admin and assigned faculty organizers"""
    try:
        # Parse decline reason from request body
        body = await request.json()
        decline_reason = body.get("reason", "No reason provided")
        
        # Get database connection
        db = await Database.get_database()
        
        # Get the event from database
        event = await db.events.find_one({"event_id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Check permissions (same as approve)
        can_decline = False
        
        # Super Admin can decline any event
        if admin.role == AdminRole.SUPER_ADMIN:
            can_decline = True
            logger.info(f"🔑 Super Admin {admin.username} declining event: {event_id}")
        
        # Faculty organizers can decline events assigned to them
        elif admin.role == AdminRole.ORGANIZER_ADMIN:
            # Check if this faculty is assigned to the event
            faculty_organizers = event.get("faculty_organizers", [])
            if admin.employee_id and admin.employee_id in faculty_organizers:
                can_decline = True
                logger.info(f"🔑 Faculty Organizer {admin.username} ({admin.employee_id}) declining assigned event: {event_id}")
            else:
                raise HTTPException(status_code=403, detail="You can only decline events assigned to you")
        
        else:
            raise HTTPException(status_code=403, detail="Only Super Admins and assigned Faculty Organizers can decline events")
        
        if not can_decline:
            raise HTTPException(status_code=403, detail="Permission denied")
        
        # Check if event is in pending status
        if event.get("event_approval_status") != "pending_approval":
            raise HTTPException(status_code=400, detail="Event is not in pending approval status")
        
        # Update event approval status
        update_result = await db.events.update_one(
            {"event_id": event_id},
            {
                "$set": {
                    "event_approval_status": "declined",
                    "published": False,
                    "declined_by": admin.username,
                    "declined_at": datetime.utcnow(),
                    "decline_reason": decline_reason
                }
            }
        )
        
        if update_result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to update event status")
        
        # Invalidate admin cache since event status changed
        invalidate_admin_cache()
        
        # Remove event from faculty assigned_events (since it's declined)
        faculty_organizers = event.get("faculty_organizers", [])
        if faculty_organizers:
            try:
                removal_result = await event_organizer_service.remove_event_from_faculty(
                    faculty_organizers, 
                    event_id
                )
                if removal_result["success"]:
                    logger.info(f"✅ Removed declined event {event_id} from {removal_result['removed_count']} faculty organizers")
                else:
                    logger.warning(f"⚠️ Failed to remove declined event from some faculty: {removal_result['message']}")
            except Exception as e:
                logger.error(f"❌ Error removing declined event from faculty: {str(e)}")
        
        # Log the decline action using event action logger
        try:
            from services.event_action_logger import event_action_logger
            await event_action_logger.log_event_declined(
                event_id=event_id,
                event_name=event.get("event_name", "Unknown Event"),
                declined_by_username=admin.username,
                declined_by_role=admin.role.value,
                event_data=event,
                decline_reason=decline_reason,
                decline_timestamp=datetime.utcnow(),
                request_metadata={
                    "decliner_employee_id": admin.employee_id,
                    "decline_method": "admin_portal",
                    "event_type": event.get("event_type"),
                    "organizing_department": event.get("organizing_department"),
                    "faculty_organizers_count": len(faculty_organizers)
                }
            )
            logger.info(f"✅ Decline action logged for event {event_id}")
        except Exception as log_error:
            logger.error(f"❌ Failed to log decline action for {event_id}: {log_error}")
            # Don't fail the decline if logging fails
        
        # Send decline email to event creator if they have an email
        creator_email = event.get("event_creator_email")
        if creator_email:
            try:
                # Import email service here to avoid circular imports
                from services.communication.email_service import send_template_email
                
                # Prepare email context
                event_name = event.get("event_name", "Unknown Event")
                creator_name = event.get("event_created_by", "Event Creator")
                venue = event.get("venue", "TBD")
                event_type = event.get("event_type", "General")
                created_date = event.get("created_at", datetime.utcnow()).strftime('%B %d, %Y') if isinstance(event.get("created_at"), datetime) else "Recently"
                
                # Extract date and time from start_datetime
                start_datetime = event.get("start_datetime")
                if start_datetime:
                    if isinstance(start_datetime, str):
                        try:
                            # Parse ISO string datetime
                            dt = datetime.fromisoformat(start_datetime.replace('Z', '+00:00'))
                            event_date = dt.strftime('%B %d, %Y')  # e.g., "September 02, 2025"
                            event_time = dt.strftime('%I:%M %p')   # e.g., "02:30 PM"
                        except:
                            event_date = "TBD"
                            event_time = "TBD"
                    elif hasattr(start_datetime, 'strftime'):
                        # Direct datetime object
                        event_date = start_datetime.strftime('%B %d, %Y')
                        event_time = start_datetime.strftime('%I:%M %p')
                    else:
                        event_date = "TBD"
                        event_time = "TBD"
                else:
                    event_date = "TBD"
                    event_time = "TBD"
                
                context = {
                    "creator_name": creator_name,
                    "event_name": event_name,
                    "event_id": event_id,
                    "event_type": event_type,
                    "event_date": event_date,
                    "event_time": event_time,
                    "venue": venue,
                    "created_date": created_date,
                    "declined_by": admin.username,
                    "declined_date": datetime.utcnow().strftime('%B %d, %Y at %I:%M %p UTC'),
                    "decline_reason": decline_reason if decline_reason != "No reason provided" else None,
                    "dashboard_url": "https://campusconnect.edu/admin/events",  # Update with actual domain
                    "help_url": "https://campusconnect.edu/help",
                    "contact_url": "https://campusconnect.edu/contact",
                    "guidelines_url": "https://campusconnect.edu/guidelines"
                }
                
                subject = f"❌ Event Declined: {event_name}"
                
                await send_template_email(
                    to_email=creator_email,
                    template_name="event_declined",
                    subject=subject,
                    context=context
                )
                logger.info(f"✅ Decline email sent to creator: {creator_email}")
                
            except Exception as e:
                logger.error(f"❌ Failed to send decline email to {creator_email}: {str(e)}")
                # Don't fail the decline if email fails
        
        # Delete the declined event from the database
        try:
            delete_result = await db.events.delete_one({"event_id": event_id})
            if delete_result.deleted_count == 1:
                logger.info(f"🗑️ Successfully deleted declined event {event_id} from database")
            else:
                logger.warning(f"⚠️ Failed to delete declined event {event_id} - event not found or already deleted")
        except Exception as e:
            logger.error(f"❌ Error deleting declined event {event_id}: {str(e)}")
            # Continue with response even if delete fails
        
        logger.info(f"✅ Event {event_id} declined by {admin.username} and deleted - Reason: {decline_reason}")
        
        # Create response and ensure all values are JSON serializable
        response_data = {
            "success": True,
            "message": f"Event '{event.get('event_name')}' has been declined and removed from the system",
            "event_id": event_id,
            "declined_by": admin.username,
            "declined_at": datetime.utcnow().isoformat(),
            "reason": decline_reason,
            "deleted": True
        }
        
        # Use the same robust serialization function
        def fix_objectid(obj):
            """Recursively convert BSON types to JSON-serializable types"""
            if obj is None:
                return None
            elif isinstance(obj, ObjectId):
                return str(obj)
            elif isinstance(obj, dict):
                return {k: fix_objectid(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [fix_objectid(item) for item in obj]
            elif isinstance(obj, tuple):
                return tuple(fix_objectid(item) for item in obj)
            elif hasattr(obj, 'isoformat'):  # datetime objects
                return obj.isoformat()
            elif hasattr(obj, '__dict__'):
                # Handle other BSON/custom objects
                try:
                    return str(obj)
                except:
                    return None
            else:
                return obj
        
        return fix_objectid(response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error declining event {event_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error declining event: {str(e)}")
