"""
Admin Events API
Handles event management API endpoints for administrators
"""
import logging
from datetime import datetime
import pytz
from fastapi import APIRouter, Request, HTTPException, Depends, Query, UploadFile, File, Form
from fastapi.responses import JSONResponse
from utils.timezone_helper import format_for_frontend
from dependencies.auth import require_admin, require_super_admin_access, require_executive_admin_or_higher, require_admin_with_refresh
from models.admin_user import AdminUser, AdminRole
from models.event import CreateEvent, UpdateEvent, EventResponse
from models.notification import NotificationType, NotificationPriority
from database.operations import DatabaseOperations
from config.database import Database
from utils.event_status_manager import EventStatusManager
from utils.dynamic_event_scheduler import add_event_to_scheduler, update_event_in_scheduler, remove_event_from_scheduler
from services.communication.notification_service import notification_service
from services.event_organizer_service import event_organizer_service
from services.event_action_logger import event_action_logger
from models.dynamic_attendance import AttendanceIntelligenceService
from typing import Optional, List
from bson import ObjectId
import json
from services.event_registration_service import event_registration_service
from services.faculty_registration_service import faculty_registration_service
from services.event_feedback_service import event_feedback_service
from .faculty_organizers import router as faculty_organizers_router
from .approval import router as approval_router

logger = logging.getLogger(__name__)
router = APIRouter()

# Include faculty organizers routes
router.include_router(faculty_organizers_router)

def format_registration_timestamp(timestamp):
    """Convert UTC timestamp to IST for admin display"""
    if not timestamp:
        return ''
    try:
        return format_for_frontend(timestamp)
    except Exception:
        return timestamp  # Return original if conversion fails

def fix_objectid(doc):
    if isinstance(doc, list):
        return [fix_objectid(d) for d in doc]
    if isinstance(doc, dict):
        return {k: fix_objectid(v) for k, v in doc.items()}
    if isinstance(doc, ObjectId):
        return str(doc)
    return doc

@router.post("/create")
async def create_event(
    event_data: CreateEvent,
    admin: AdminUser = Depends(require_admin)
):
    """Create a new event"""
    try:
        # Validate required datetime fields before parsing
        required_datetime_fields = [
            ("start_date", event_data.start_date),
            ("start_time", event_data.start_time),
            ("end_date", event_data.end_date),
            ("end_time", event_data.end_time),
            ("registration_start_date", event_data.registration_start_date),
            ("registration_start_time", event_data.registration_start_time),
            ("registration_end_date", event_data.registration_end_date),
            ("registration_end_time", event_data.registration_end_time),
        ]
        
        # Only require certificate fields if this is a certificate-based event
        if event_data.is_certificate_based:
            required_datetime_fields.extend([
                ("certificate_end_date", event_data.certificate_end_date),
                ("certificate_end_time", event_data.certificate_end_time)
            ])
        
        missing_fields = []
        for field_name, field_value in required_datetime_fields:
            if not field_value or field_value.strip() == "":
                missing_fields.append(field_name)
        
        if missing_fields:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required datetime fields: {', '.join(missing_fields)}. Please ensure all date and time fields are filled."
            )
        
        # Parse datetime from date and time strings - now safe since we validated above
        try:
            start_datetime = datetime.fromisoformat(f"{event_data.start_date}T{event_data.start_time}")
            end_datetime = datetime.fromisoformat(f"{event_data.end_date}T{event_data.end_time}")
            registration_start = datetime.fromisoformat(f"{event_data.registration_start_date}T{event_data.registration_start_time}")
            registration_end = datetime.fromisoformat(f"{event_data.registration_end_date}T{event_data.registration_end_time}")
            
            # Only parse certificate datetime if this is a certificate-based event
            certificate_end = None
            if event_data.is_certificate_based:
                certificate_end = datetime.fromisoformat(f"{event_data.certificate_end_date}T{event_data.certificate_end_time}")
        except ValueError as e:
            # Provide more specific error message for datetime parsing issues
            raise HTTPException(
                status_code=400,
                detail=f"Invalid datetime format. Please check that all dates are in YYYY-MM-DD format and times are in HH:MM format. Error: {str(e)}"
            )
        
        # Check if event ID already exists
        db = await Database.get_database()
        if db is None:
            raise HTTPException(status_code=500, detail="Database connection failed")
        
        existing_event = await db.events.find_one({"event_id": event_data.event_id})
        if existing_event:
            raise HTTPException(status_code=400, detail="Event with this ID already exists")
        
        # Validate faculty organizers
        faculty_validation = await event_organizer_service.validate_faculty_organizers(event_data.faculty_organizers)
        if not faculty_validation["valid"]:
            error_msg = "Invalid faculty organizers: "
            if faculty_validation["missing"]:
                error_msg += f"Missing faculty IDs: {', '.join(faculty_validation['missing'])}. "
            if faculty_validation["inactive"]:
                error_msg += f"Inactive faculty IDs: {', '.join(faculty_validation['inactive'])}."
            raise HTTPException(status_code=400, detail=error_msg)
        
        # Get faculty organizer details
        faculty_organizers = await event_organizer_service.get_faculty_organizers_by_ids(event_data.faculty_organizers)
        
        # Debug: Log event creator details
        creator_email = event_data.event_creator_email if event_data.event_creator_email else getattr(admin, 'email', '')
        
        # Process contacts - convert from EventContact objects to dict format for MongoDB
        processed_contacts = []
        for contact in event_data.contacts:
            contact_dict = {
                "name": contact.name,
                "contact": contact.contact
            }
            processed_contacts.append(contact_dict)
        
        # Create event document
        event_doc = {
            "event_id": event_data.event_id,
            "event_name": event_data.event_name,
            "event_type": event_data.event_type,
            "organizing_department": event_data.organizing_department,
            "short_description": event_data.short_description,
            "detailed_description": event_data.detailed_description,
            "start_datetime": start_datetime,
            "end_datetime": end_datetime,
            "venue": event_data.venue,
            "venue_id": event_data.venue_id,
            "venue_type": getattr(event_data, 'venue_type', None),
            "online_meeting_link": getattr(event_data, 'online_meeting_link', None),
            "mode": event_data.mode,
            "status": "upcoming",  # Main event status (for event lifecycle)
            "event_approval_status": "pending_approval" if event_data.approval_required else "approved",  # Separate approval status
            "sub_status": "registration_not_started",
            "published": not event_data.approval_required,  # Auto-publish if no approval required
            
            # New fields
            "target_audience": event_data.target_audience,
            "student_department": event_data.student_department,
            "student_semester": event_data.student_semester,
            "custom_text": event_data.custom_text,
            "is_xenesis_event": event_data.is_xenesis_event,
            "faculty_organizers": event_data.faculty_organizers,  # Store faculty employee IDs
            "organizer_details": faculty_organizers,  # Store faculty details for display
            "contacts": processed_contacts,      # Using processed contact objects
            
            # Certificate configuration
            "is_certificate_based": event_data.is_certificate_based,
            "certificate_templates": event_data.certificate_templates if event_data.is_certificate_based else {},
            "event_poster_url": event_data.event_poster_url,
            
            # Approval workflow fields
            "approval_required": event_data.approval_required,
            "event_created_by": event_data.event_created_by if event_data.event_created_by else admin.username,
            "event_creator_email": event_data.event_creator_email if event_data.event_creator_email else getattr(admin, 'email', ''),  # Use form email or fallback to admin email
            "approved_by": None,
            "approved_at": None,
            "declined_by": None,
            "declined_at": None,
            "decline_reason": None,
            
            # Registration settings
            "registration_start_date": registration_start,
            "registration_end_date": registration_end,
            "certificate_end_date": certificate_end,
            "registration_mode": event_data.registration_mode,
            "team_size_min": event_data.team_size_min,
            "team_size_max": event_data.team_size_max,
            "max_participants": event_data.max_participants,
            "min_participants": event_data.min_participants,
            "allow_multiple_team_registrations": event_data.allow_multiple_team_registrations,
            "is_paid": event_data.registration_type == "paid",
            "is_team_based": event_data.registration_mode == "team",
            "registration_fee": event_data.registration_fee,
            "fee_description": event_data.fee_description,
            
            # Simplified tracking - just statistics (no complex nested data)
            "registration_stats": {
                "individual_count": 0,
                "team_count": 0,
                "total_participants": 0,
                "attendance_marked": 0,
                "feedback_submitted": 0,
                "certificates_issued": 0,
                "last_updated": datetime.now(pytz.timezone('Asia/Kolkata'))
            },
            "custom_fields": [],
            
            # Metadata
            "created_by": admin.username,
            "created_at": datetime.now(pytz.timezone('Asia/Kolkata')),
            "form_status": "draft",
            "require_verification": False,
            "allow_edit_after_submit": False
        }
        
        # Add attendance mandatory field to event document
        event_doc['attendance_mandatory'] = getattr(event_data, 'attendance_mandatory', True)
        
        # Generate attendance configuration only if attendance is mandatory
        if event_doc['attendance_mandatory']:
            try:
                # Prepare event data for attendance intelligence
                attendance_event_data = {
                    'event_id': event_data.event_id,
                    'event_name': event_data.event_name,
                    'event_type': event_data.event_type,
                    'detailed_description': event_data.detailed_description,
                    'target_audience': event_data.target_audience,
                    'registration_mode': event_data.registration_mode,
                    'start_datetime': start_datetime,
                    'end_datetime': end_datetime
                }
                
                # Check if user provided custom attendance configuration
                if hasattr(event_data, 'attendance_strategy') and event_data.attendance_strategy:
                    # Use custom configuration provided by user - ONLY save attendance_strategy
                    event_doc['attendance_strategy'] = event_data.attendance_strategy
                    event_doc['attendance_auto_generated'] = False
                else:
                    # Generate automatic attendance configuration
                    attendance_config = AttendanceIntelligenceService.create_dynamic_config(attendance_event_data)
                    
                    # Add attendance configuration to event document
                    event_doc['attendance_strategy'] = attendance_config.strategy.value
                    event_doc['attendance_criteria'] = {
                        'minimum_percentage': attendance_config.criteria.minimum_percentage,
                        'required_sessions': attendance_config.criteria.required_sessions,
                        'required_milestones': attendance_config.criteria.required_milestones,
                        'auto_calculate': attendance_config.criteria.auto_calculate
                    }
                    event_doc['attendance_sessions'] = [
                        {
                            'session_id': session.session_id,
                            'session_name': session.session_name,
                            'session_type': session.session_type,
                            'start_time': session.start_time,
                            'end_time': session.end_time,
                            'is_mandatory': session.is_mandatory,
                            'weight': session.weight,
                            'status': session.status
                        }
                        for session in attendance_config.sessions
                    ]
                    event_doc['attendance_auto_generated'] = True
                    
            except Exception as e:
                # Continue with event creation even if attendance generation fails
                event_doc['attendance_strategy'] = 'single_mark'  # Default fallback
                event_doc['attendance_auto_generated'] = False
        else:
            # Attendance is not mandatory - set default values or omit attendance fields
            event_doc['attendance_strategy'] = None
            event_doc['attendance_criteria'] = None
            event_doc['attendance_sessions'] = []
            event_doc['attendance_auto_generated'] = False
        
        # Insert event
        result = await db.events.insert_one(event_doc)
        
        # Log event creation using event action logger
        try:
            from services.event_action_logger import event_action_logger
            
            # Determine the creation context
            creation_context = "direct_creation"  # For Super/Organizer Admin
            if event_data.approval_required:
                creation_context = "approval_request"  # For Executive Admin
            
            await event_action_logger.log_event_created(
                event_id=event_data.event_id,
                event_name=event_data.event_name,
                created_by_username=admin.username,
                created_by_role=admin.role.value,
                event_data=dict(event_doc),  # Convert to dict for logging
                request_metadata={
                    "creator_employee_id": getattr(admin, 'employee_id', None),
                    "creation_method": "admin_portal",
                    "creation_context": creation_context,
                    "approval_required": event_data.approval_required,
                    "event_type": event_data.event_type,
                    "organizing_department": event_data.organizing_department,
                    "target_audience": event_data.target_audience,
                    "faculty_organizers_count": len(event_data.faculty_organizers or []),
                    "attendance_mandatory": event_doc.get('attendance_mandatory', True),
                    "is_certificate_based": event_doc.get('is_certificate_based', False)
                }
            )
            
            if event_data.approval_required:
                logger.info(f"✅ Event creation request logged: {event_data.event_id} by {admin.username} (REQUIRES APPROVAL)")
            else:
                logger.info(f"✅ Event creation logged: {event_data.event_id} by {admin.username} (AUTO-APPROVED)")
                
        except Exception as log_error:
            logger.error(f"❌ Failed to log event creation for {event_data.event_id}: {log_error}")
            # Don't fail the event creation if logging fails
        
        # Role-based post-creation logic
        if admin.role == AdminRole.SUPER_ADMIN:
            # Super Admin: Event is automatically approved and active - NO APPROVAL NEEDED
            
            # Update event status to approved/active
            await db.events.update_one(
                {"event_id": event_data.event_id},
                {"$set": {
                    "status": "upcoming",
                    "sub_status": "registration_not_started",
                    "approval_required": False,
                    "approved_by": admin.username,
                    "approved_at": datetime.now(pytz.timezone('Asia/Kolkata')),
                    "published": True
                }}
            )
            
            # Assign event to faculty organizers immediately
            if event_data.faculty_organizers:
                assignment_result = await event_organizer_service.assign_event_to_faculty(
                    event_data.faculty_organizers, 
                    event_data.event_id
                )
                if assignment_result["success"]:
                    pass
            
        elif admin.role == AdminRole.ORGANIZER_ADMIN:
            # Faculty/Organizer Admin: Event is automatically approved and active - NO APPROVAL NEEDED
            
            # Update event status to approved/active
            await db.events.update_one(
                {"event_id": event_data.event_id},
                {"$set": {
                    "status": "upcoming",
                    "sub_status": "registration_not_started", 
                    "approval_required": False,
                    "approved_by": admin.username,
                    "approved_at": datetime.now(pytz.timezone('Asia/Kolkata')),
                    "published": True
                }}
            )
            
            # Assign event to the faculty organizer (current user) and any additional organizers
            faculty_organizer_ids = event_data.faculty_organizers or []
            
            # Add current faculty user if they're not already in the list
            if hasattr(admin, 'employee_id') and admin.employee_id:
                if admin.employee_id not in faculty_organizer_ids:
                    faculty_organizer_ids.append(admin.employee_id)
            
            if faculty_organizer_ids:
                assignment_result = await event_organizer_service.assign_event_to_faculty(
                    faculty_organizer_ids, 
                    event_data.event_id
                )
                if assignment_result["success"]:
                    logger.info(f"✅ Faculty Organizer: Assigned event {event_data.event_id} to {assignment_result['assigned_count']} faculty organizers")
                else:
                    logger.warning(f"⚠️ Faculty Organizer: Failed to assign event to some faculty: {assignment_result['message']}")
            
        else:
            # Executive Admin or other roles: Event requires approval - APPROVAL WORKFLOW
            logger.info(f"🔔 Executive Admin creating event: {event_data.event_id} - REQUIRES APPROVAL")
            
            # Keep event in pending approval status (no changes needed as it's already pending)
            # Assign event to faculty organizers (they'll get access when approved)
            if event_data.faculty_organizers:
                assignment_result = await event_organizer_service.assign_event_to_faculty(
                    event_data.faculty_organizers, 
                    event_data.event_id
                )
                if assignment_result["success"]:
                    logger.info(f"✅ Assigned event {event_data.event_id} to {assignment_result['assigned_count']} faculty organizers (pending approval)")
                else:
                    logger.warning(f"⚠️ Failed to assign event to some faculty: {assignment_result['message']}")
        
        # Create notification for Super Admin if event requires approval
        if event_data.approval_required and event_doc.get("event_approval_status") == "pending_approval":
            logger.info(f"🔔 Event requires approval - creating notifications for Super Admins")
            
            # Get all Super Admins to notify (check both admin_users and users collections)
            super_admins_admin = await db.admin_users.find({"role": "super_admin"}).to_list(length=None)
            super_admins_users = await db.users.find({"role": "super_admin"}).to_list(length=None)
            
            # Combine results from both collections
            super_admins = super_admins_admin + super_admins_users
            logger.info(f"🔍 Found {len(super_admins)} Super Admin(s) in database (admin_users: {len(super_admins_admin)}, users: {len(super_admins_users)})")
            
            if not super_admins:
                logger.warning("⚠️ No Super Admins found in database! No notifications will be created.")
                # You might want to handle this case - maybe notify all admins or create a system alert
            
            for super_admin in super_admins:
                try:
                    logger.info(f"🔔 Creating notification for Super Admin: {super_admin['username']}")
                    
                    # Determine the actual creator name
                    creator_name = event_data.event_created_by if hasattr(event_data, 'event_created_by') and event_data.event_created_by else admin.username
                    
                    # Debug: Log the data being sent
                    action_data_debug = {
                        "event_id": event_data.event_id,
                        "event_name": event_data.event_name,
                        "created_by": creator_name,
                        "organizing_department": event_data.organizing_department,
                        "event_type": event_data.event_type,
                        "target_audience": event_data.target_audience,
                        "mode": event_data.mode,
                        "venue": event_data.venue,
                        "online_meeting_link": getattr(event_data, 'online_meeting_link', None),
                        "short_description": event_data.short_description,
                        "detailed_description": event_data.detailed_description,
                        
                        # Consistent date format - use ISO strings
                        "start_date": start_datetime.isoformat() if start_datetime else None,
                        "end_date": end_datetime.isoformat() if end_datetime else None,
                        "registration_start_date": registration_start.isoformat() if registration_start else None,
                        "registration_end_date": registration_end.isoformat() if registration_end else None,
                        
                        # Registration details
                        "registration_mode": event_data.registration_mode,
                        "registration_type": event_data.registration_type,
                        "is_team_based": event_data.registration_mode == "team",
                        "max_participants": event_data.max_participants,
                        "min_participants": event_data.min_participants,
                        
                        # Organizers and contacts (use processed versions)
                        "faculty_organizers": event_data.faculty_organizers,
                        "organizer_details": faculty_organizers,
                        "contacts": processed_contacts,
                        
                        # Status
                        "status": event_data.status,
                        "approval_required": event_data.approval_required
                    }
                    
                    logger.info(f"🔍 DEBUG: Action data for notification: {action_data_debug}")
                    
                    await notification_service.create_notification(
                        notification_type=NotificationType.EVENT_APPROVAL_REQUEST,
                        title=f"New Event Approval Request: {event_data.event_name}",
                        message=f"Event '{event_data.event_name}' (ID: {event_data.event_id}) has been created by {creator_name} and requires your approval.",
                        recipient_username=super_admin["username"],
                        recipient_role=super_admin["role"],
                        sender_username=creator_name,  # Use actual creator name instead of system username
                        sender_role="event_creator",  # More descriptive role
                        related_entity_type="event",
                        related_entity_id=event_data.event_id,
                        priority=NotificationPriority.HIGH,
                        action_required=True,
                        action_type="approve_event",
                        action_data=action_data_debug,
                        metadata={
                            "event_type": event_data.event_type,
                            "start_date": event_data.start_date,
                            "organizing_department": event_data.organizing_department,
                            "target_audience": event_data.target_audience,
                            "mode": event_data.mode,
                            "venue": event_data.venue,
                            "online_meeting_link": getattr(event_data, 'online_meeting_link', None),
                            "registration_type": event_data.registration_type,
                            "created_via": "executive_admin_portal" if admin.role.value == "executive_admin" else "admin_portal"
                        }
                    )
                    logger.info(f"✅ Successfully created approval notification for Super Admin: {super_admin['username']}")
                except Exception as e:
                    logger.error(f"❌ Error creating notification for {super_admin['username']}: {str(e)}")
                    # Don't fail the entire event creation if notification fails
                    
            # Send email notification to the first organizer (faculty) if Executive Admin created event
            if admin.role == AdminRole.EXECUTIVE_ADMIN and event_data.faculty_organizers:
                try:
                    # Get the first faculty organizer's details
                    first_organizer_id = event_data.faculty_organizers[0]
                    first_organizer = await db.faculties.find_one({"employee_id": first_organizer_id})
                    
                    if first_organizer and first_organizer.get("email"):
                        # Import email service here to avoid circular imports
                        from services.communication.email_service import send_template_email
                        
                        creator_name = event_data.event_created_by if hasattr(event_data, 'event_created_by') and event_data.event_created_by else admin.username
                        organizer_name = first_organizer.get('full_name', 'Faculty Member')
                        
                        # Format date and time
                        formatted_date = start_datetime.strftime('%B %d, %Y') if start_datetime else 'TBD'
                        formatted_time = start_datetime.strftime('%I:%M %p') if start_datetime else 'TBD'
                        
                        context = {
                            "organizer_name": organizer_name,
                            "event_name": event_data.event_name,
                            "event_id": event_data.event_id,
                            "event_type": event_data.event_type,
                            "event_date": formatted_date,
                            "event_time": formatted_time,
                            "venue": event_data.venue,
                            "online_meeting_link": getattr(event_data, 'online_meeting_link', None),
                            "created_by": creator_name,
                            "event_description": getattr(event_data, 'event_description', 'No description provided'),
                            "dashboard_url": "https://campusconnect.edu/admin/events",  # Update with actual domain
                            "help_url": "https://campusconnect.edu/help",
                            "contact_url": "https://campusconnect.edu/contact",
                            "unsubscribe_url": "https://campusconnect.edu/notifications/unsubscribe"
                        }
                        
                        subject = f"🔔 Event Approval Request: {event_data.event_name}"
                        
                        await send_template_email(
                            to_email=first_organizer["email"],
                            template_name="event_approval_request",
                            subject=subject,
                            context=context
                        )
                        logger.info(f"✅ Approval request email sent to first organizer: {first_organizer['email']}")
                        
                    else:
                        logger.warning(f"⚠️ First organizer {first_organizer_id} not found or has no email")
                        # Log additional debug info
                        if first_organizer:
                            logger.warning(f"⚠️ Faculty found but missing email: {first_organizer.get('full_name', 'Unknown')} ({first_organizer_id})")
                        else:
                            logger.warning(f"⚠️ Faculty {first_organizer_id} not found in database")
                        
                except Exception as e:
                    logger.error(f"❌ Failed to send email to first organizer: {str(e)}")
                    logger.error(f"❌ Email details - Organizer ID: {first_organizer_id}, Email: {first_organizer.get('email', 'NO EMAIL') if 'first_organizer' in locals() else 'ORGANIZER NOT FOUND'}")
                    # Don't fail the event creation if email fails
        
        # If venue booking is needed, create venue booking
        if event_data.venue_id:
            venue_booking = {
                "booking_id": f"booking_{event_data.event_id}_{datetime.now(pytz.timezone('Asia/Kolkata')).timestamp()}",
                "venue_id": event_data.venue_id,
                "event_id": event_data.event_id,
                "event_name": event_data.event_name,
                "booked_by": admin.username,
                "booked_by_name": admin.username,
                "booking_date": datetime.now(pytz.timezone('Asia/Kolkata')),
                "start_datetime": start_datetime.isoformat(),
                "end_datetime": end_datetime.isoformat(),
                "status": "confirmed",
                "notes": f"Automatic booking for event {event_data.event_name}",
                "confirmed_by": admin.username,
                "confirmed_at": datetime.now(pytz.timezone('Asia/Kolkata'))
            }
            
            # Add booking to venue_bookings collection
            await db.venue_bookings.insert_one(venue_booking)
        
        # Invalidate admin cache since new event was created
        from utils.redis_cache import event_cache
        try:
            if event_cache.is_available():
                keys = event_cache.redis_client.keys("admin_events:*")
                if keys:
                    deleted_count = event_cache.redis_client.delete(*keys)
                    logger.info(f"🗑️ Invalidated {deleted_count} admin cache entries after event creation")
        except Exception as cache_error:
            logger.warning(f"Failed to invalidate admin cache after event creation: {cache_error}")
        
        # Add event to scheduler only if no approval required
        if not event_data.approval_required:
            try:
                await add_event_to_scheduler(event_doc)
                logger.info(f"✅ Added event {event_data.event_id} to scheduler (no approval required)")
            except Exception as scheduler_error:
                logger.warning(f"⚠️ Failed to add event to scheduler: {scheduler_error}")
                # Don't fail event creation if scheduler fails
        else:
            logger.info(f"⏸️ Event {event_data.event_id} requires approval - not adding to scheduler yet")
        
        return {
            "success": True,
            "message": "Event created successfully",
            "event_id": event_data.event_id,
            "database_id": str(result.inserted_id)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating event: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating event: {str(e)}")

@router.put("/update/{event_id}")
async def update_event(
    event_id: str,
    request: Request,
    admin: AdminUser = Depends(require_admin)
):
    """Update an existing event - handles both frontend datetime format and Pydantic model format"""
    try:
        from utils.timezone_helper import parse_frontend_datetime, ist_to_utc
        
        # Check if admin has access to this event
        if admin.role == AdminRole.ORGANIZER_ADMIN and event_id not in (admin.assigned_events or []):
            raise HTTPException(status_code=403, detail="Access denied to this event")
        
        db = await Database.get_database()
        if db is None:
            raise HTTPException(status_code=500, detail="Database connection failed")
        
        # Check if event exists
        existing_event = await db.events.find_one({"event_id": event_id})
        if not existing_event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Get request data
        data = await request.json()
        
        logger.info(f"📝 Update Event {event_id}: Received data keys: {list(data.keys())}")
        logger.info(f"🖼️ Event poster URL in request: {data.get('event_poster_url', 'NOT_PROVIDED')}")
        logger.info(f"📜 Certificate templates in request: {list(data.get('certificate_templates', {}).keys()) if data.get('certificate_templates') else 'NOT_PROVIDED'}")
        logger.info(f"👥 Organizers in request: {len(data.get('organizers', []))} organizers" if data.get('organizers') else "No organizers field")
        
        # Build update document with timezone conversion
        update_doc = {}
        
        # Handle datetime fields - support frontend format (combined datetime strings)
        def parse_frontend_combined_datetime(datetime_str):
            """Parse frontend datetime-local format (YYYY-MM-DDTHH:MM) and preserve IST timezone"""
            if not datetime_str:
                return None
            try:
                # Parse the datetime-local format and preserve as IST
                dt = datetime.fromisoformat(datetime_str)
                # Strip timezone info to prevent MongoDB from converting to UTC
                return dt.replace(tzinfo=None)
            except Exception as e:
                logger.error(f"Error parsing datetime {datetime_str}: {e}")
                return None
        
        # Handle frontend combined datetime fields
        frontend_datetime_fields = {
            'start_datetime': 'start_datetime',
            'end_datetime': 'end_datetime', 
            'registration_start_date': 'registration_start_date',
            'registration_end_date': 'registration_end_date',
            'certificate_end_date': 'certificate_end_date'
        }
        
        for frontend_field, backend_field in frontend_datetime_fields.items():
            if frontend_field in data and data[frontend_field]:
                parsed_datetime = parse_frontend_combined_datetime(data[frontend_field])
                if parsed_datetime:
                    update_doc[backend_field] = parsed_datetime
                    logger.info(f"Updated {backend_field}: {data[frontend_field]} -> {parsed_datetime} (timezone-naive IST)")
        
        # Handle other non-datetime fields
        updatable_fields = [
            'event_name', 'event_type', 'organizing_department', 'short_description', 'detailed_description',
            'venue', 'venue_id', 'mode', 'registration_type', 'registration_mode', 'registration_fee', 'fee_description',
            'team_size_min', 'team_size_max', 'min_participants', 'max_participants',
            'faculty_organizers', 'target_audience', 'student_department', 
            'student_semester', 'custom_text', 'is_xenesis_event',
            'attendance_mandatory', 'attendance_strategy', 'is_certificate_based',
            'certificate_templates', 'event_poster_url', 'allow_multiple_team_registrations'
        ]
        
        # Handle contacts specially (frontend sends 'event_contacts' or 'contacts')
        if 'event_contacts' in data or 'contacts' in data:
            contact_data = data.get('event_contacts') or data.get('contacts')
            if contact_data is not None:
                # Process contacts - ensure they have proper structure
                processed_contacts = []
                if isinstance(contact_data, list):
                    for contact in contact_data:
                        if isinstance(contact, dict) and contact.get('name') and contact.get('contact'):
                            processed_contacts.append({
                                "name": contact['name'],
                                "contact": contact['contact']
                            })
                        elif isinstance(contact, str):
                            # Handle old format if exists
                            parts = contact.split(':')
                            if len(parts) == 2:
                                processed_contacts.append({
                                    "name": parts[0].strip(),
                                    "contact": parts[1].strip()
                                })
                
                update_doc['contacts'] = processed_contacts
                logger.info(f"Updated contacts for event {event_id}: {len(processed_contacts)} contacts processed")
        
        # Handle faculty organizers with validation
        if 'faculty_organizers' in data and data['faculty_organizers'] is not None:
            
            # Validate faculty organizers
            faculty_validation = await event_organizer_service.validate_faculty_organizers(data['faculty_organizers'])
            if not faculty_validation["valid"]:
                error_msg = "Invalid faculty organizers: "
                if faculty_validation["missing"]:
                    error_msg += f"Missing faculty IDs: {', '.join(faculty_validation['missing'])}. "
                if faculty_validation["inactive"]:
                    error_msg += f"Inactive faculty IDs: {', '.join(faculty_validation['inactive'])}."
                raise HTTPException(status_code=400, detail=error_msg)
            
            # Get faculty organizer details
            faculty_organizers = await event_organizer_service.get_faculty_organizers_by_ids(data['faculty_organizers'])
            
            # Update faculty organizers field
            update_doc['faculty_organizers'] = data['faculty_organizers']
            update_doc['organizer_details'] = faculty_organizers
            
            # Handle faculty assignment changes
            current_faculty = existing_event.get('faculty_organizers', [])
            new_faculty = data['faculty_organizers']
            
            # Remove event from faculty no longer assigned
            removed_faculty = [f for f in current_faculty if f not in new_faculty]
            if removed_faculty:
                await event_organizer_service.remove_event_from_faculty(removed_faculty, event_id)
                logger.info(f"Removed event {event_id} from {len(removed_faculty)} faculty members")
            
            # Add event to newly assigned faculty
            added_faculty = [f for f in new_faculty if f not in current_faculty]
            if added_faculty:
                await event_organizer_service.assign_event_to_faculty(added_faculty, event_id)
                logger.info(f"Assigned event {event_id} to {len(added_faculty)} new faculty members")

        # Handle frontend organizers format (from EditEvent.jsx)
        elif 'organizers' in data and data['organizers'] is not None:
            logger.info(f"Processing frontend organizers format for event {event_id}")
            
            # Extract faculty IDs from the organizers array
            faculty_ids = []
            organizer_details = []
            
            for org in data['organizers']:
                if isinstance(org, dict) and org.get('faculty_id'):
                    faculty_ids.append(org['faculty_id'])
                    organizer_details.append({
                        'faculty_id': org['faculty_id'],
                        'name': org.get('name', ''),
                        'email': org.get('email', ''),
                        'employee_id': org.get('employee_id', '')
                    })
            
            if faculty_ids:
                # Validate faculty organizers
                faculty_validation = await event_organizer_service.validate_faculty_organizers(faculty_ids)
                if not faculty_validation["valid"]:
                    error_msg = "Invalid faculty organizers: "
                    if faculty_validation["missing"]:
                        error_msg += f"Missing faculty IDs: {', '.join(faculty_validation['missing'])}. "
                    if faculty_validation["inactive"]:
                        error_msg += f"Inactive faculty IDs: {', '.join(faculty_validation['inactive'])}."
                    raise HTTPException(status_code=400, detail=error_msg)
                
                # Update faculty organizers field
                update_doc['faculty_organizers'] = faculty_ids
                update_doc['organizer_details'] = organizer_details
                
                # Handle faculty assignment changes
                current_faculty = existing_event.get('faculty_organizers', [])
                new_faculty = faculty_ids
                
                # Remove event from faculty no longer assigned
                removed_faculty = [f for f in current_faculty if f not in new_faculty]
                if removed_faculty:
                    await event_organizer_service.remove_event_from_faculty(removed_faculty, event_id)
                    logger.info(f"Removed event {event_id} from {len(removed_faculty)} faculty members")
                
                # Add event to newly assigned faculty
                added_faculty = [f for f in new_faculty if f not in current_faculty]
                if added_faculty:
                    await event_organizer_service.assign_event_to_faculty(added_faculty, event_id)
                    logger.info(f"Assigned event {event_id} to {len(added_faculty)} new faculty members")
        
        # Handle other updatable fields (excluding contacts, organizers, and faculty_organizers which are handled above)
        for field in updatable_fields:
            if field in data and data[field] is not None and field not in ['faculty_organizers', 'organizers']:
                update_doc[field] = data[field]
        
        if not update_doc:
            return {"success": False, "message": "No valid fields provided for update"}
        
        # Check if registration dates were modified - if so, recalculate event status
        date_fields_modified = any(field in update_doc for field in [
            'registration_start_date', 'registration_end_date', 'start_datetime', 'end_datetime', 'certificate_end_date'
        ])
        
        if date_fields_modified:
            logger.info(f"🔄 Registration/event dates were modified for event {event_id}, recalculating status...")
            
            # Get the current time
            current_time = datetime.now(pytz.timezone('Asia/Kolkata'))
            
            # Create a temporary event object with updated dates for status calculation
            temp_event = existing_event.copy()
            temp_event.update(update_doc)
            
            # Calculate new status based on updated dates
            from utils.dynamic_event_scheduler import DynamicEventScheduler
            scheduler = DynamicEventScheduler()
            new_status, new_sub_status = await scheduler._calculate_event_status(temp_event, current_time)
            
            # Add status update to the update document
            update_doc["status"] = new_status
            update_doc["sub_status"] = new_sub_status
            
            logger.info(f"✅ Event {event_id} status recalculated: {existing_event.get('status', 'unknown')}/{existing_event.get('sub_status', 'unknown')} -> {new_status}/{new_sub_status}")
        
        # Update metadata
        update_doc["updated_by"] = admin.username
        update_doc["updated_at"] = datetime.now(pytz.timezone('Asia/Kolkata'))
        
        logger.info(f"📦 Update Event {event_id}: Final update document keys: {list(update_doc.keys())}")
        logger.info(f"🖼️ Final poster URL being saved: {update_doc.get('event_poster_url', 'NOT_IN_UPDATE')}")
        logger.info(f"📜 Final certificate templates being saved: {list(update_doc.get('certificate_templates', {}).keys()) if update_doc.get('certificate_templates') else 'NOT_IN_UPDATE'}")
        
        # Update event
        result = await db.events.update_one(
            {"event_id": event_id},
            {"$set": update_doc}
        )
        
        # Invalidate admin cache since event was updated
        from utils.redis_cache import event_cache
        try:
            if event_cache.is_available():
                keys = event_cache.redis_client.keys("admin_events:*")
                if keys:
                    deleted_count = event_cache.redis_client.delete(*keys)
                    logger.info(f"🗑️ Invalidated {deleted_count} admin cache entries after event update")
        except Exception as cache_error:
            logger.warning(f"Failed to invalidate admin cache after event update: {cache_error}")
        
        # Update event in scheduler with new dates/times
        try:
            updated_event = await db.events.find_one({"event_id": event_id})
            if updated_event:
                await update_event_in_scheduler(event_id, updated_event)
                logger.info(f"✅ Updated event {event_id} in scheduler")
        except Exception as scheduler_error:
            logger.warning(f"⚠️ Failed to update event in scheduler: {scheduler_error}")
            # Don't fail event update if scheduler fails
        
        # Log event update action for audit and status tracking
        try:
            # Get the updated event data
            final_updated_event = await db.events.find_one({"event_id": event_id})
            if final_updated_event:
                await event_action_logger.log_event_updated(
                    event_id=event_id,
                    event_name=final_updated_event.get("event_name", "Unknown Event"),
                    updated_by_username=admin.username,
                    updated_by_role=admin.role.value,
                    before_data=existing_event,
                    after_data=final_updated_event,
                    updated_fields=list(update_doc.keys()),
                    request_metadata={
                        "admin_role": admin.role.value,
                        "update_source": "admin_portal",
                        "significant_changes": event_action_logger._identify_significant_changes(list(update_doc.keys()))
                    }
                )
        except Exception as logging_error:
            logger.warning(f"⚠️ Failed to log event update: {logging_error}")
            # Don't fail event update if logging fails
        
        # Get updated event data to return to frontend
        updated_event = await db.events.find_one({"event_id": event_id})
        if updated_event:
            updated_event = fix_objectid(updated_event)
        
        return {
            "success": True,
            "message": "Event updated successfully",
            "event_id": event_id,
            "updated_fields": list(update_doc.keys()),
            "event": updated_event
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating event: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating event: {str(e)}")

@router.get("/list")
async def get_events_list(
    status: str = Query("all", description="Filter by event status"),
    target_audience: str = Query("all", description="Filter by target audience"),
    page: int = Query(1, description="Page number"),
    limit: int = Query(100, ge=1, le=1000, description="Events per page (max 1000)"),
    admin: AdminUser = Depends(require_admin_with_refresh)
):
    """Get paginated list of events for admin management with Redis caching"""
    try:
        import json
        from utils.redis_cache import event_cache
        
        # Create cache key based on filters and admin role
        cache_key = f"admin_events:{admin.role.value}:{admin.username}:{status}:{target_audience}:{page}:{limit}"
        
        # Try to get from Redis cache first
        if event_cache.is_available():
            try:
                # Use custom cache key for admin-specific data
                cached_data = event_cache.redis_client.get(cache_key)
                if cached_data:
                    logger.info(f"🔥 Cache HIT for admin events: {cache_key}")
                    return json.loads(cached_data)
            except Exception as cache_error:
                logger.warning(f"Cache read error: {cache_error}")
        
        logger.info(f"🔍 Cache MISS for admin events: {cache_key}")
        
        # Determine if we should include pending approval events
        include_pending_approval = False
        
        # FIXED: Allow pending approval events for admin users who should see them:
        # 1. Super Admins can see all pending approval events
        # 2. Organizer Admins can see pending approval events (they'll be filtered by assigned events later)
        if admin.role in [AdminRole.SUPER_ADMIN, AdminRole.ORGANIZER_ADMIN]:
            include_pending_approval = True
        
        # Get events based on status filter
        if status == "all":
            events = await EventStatusManager.get_available_events("all", include_pending_approval=include_pending_approval)
        else:
            events = await EventStatusManager.get_available_events(status, include_pending_approval=include_pending_approval)
        
        # Apply target audience filter if specified
        if target_audience != "all":
            events = [
                event for event in events 
                if event.get("target_audience") == target_audience
            ]
        
        # Filter events based on admin role
        if admin.role == AdminRole.ORGANIZER_ADMIN:
            if status == "pending_approval":
                # Debug logging for faculty organizer filtering
                logger.info(f"🔍 Faculty Organizer {admin.username} (employee_id: {admin.employee_id}) checking pending events")
                logger.info(f"📊 Total pending events before filtering: {len(events)}")
                
                # Log faculty organizers for each pending event
                for i, event in enumerate(events):
                    faculty_organizers = event.get("faculty_organizers", [])
                    event_id = event.get("event_id", "unknown")
                    logger.info(f"📋 Event {i+1} ({event_id}): faculty_organizers = {faculty_organizers}")
                    if admin.employee_id in faculty_organizers:
                        logger.info(f"✅ Match found! Faculty {admin.employee_id} can approve event {event_id}")
                    else:
                        logger.info(f"❌ No match. Faculty {admin.employee_id} not in {faculty_organizers} for event {event_id}")
                
                # For pending approval, filter by faculty_organizers list
                events = [
                    event for event in events 
                    if admin.employee_id and admin.employee_id in event.get("faculty_organizers", [])
                ]
                logger.info(f"🔍 Faculty Organizer {admin.username} viewing {len(events)} assigned pending events")
            else:
                # For other statuses, filter by assigned_events
                events = [
                    event for event in events 
                    if event.get("event_id") in (admin.assigned_events or [])
                ]
        
        # Add statistics for each event and fix status mapping
        for event in events:
            event_id = event.get('event_id')
            
            # Fix status mapping for frontend: map event_approval_status to status for approval workflow
            if event.get('event_approval_status') == 'pending_approval':
                event['status'] = 'pending_approval'
            elif event.get('event_approval_status') == 'declined':
                event['status'] = 'declined'
            # For approved events, keep the original lifecycle status (upcoming, ongoing, completed, etc.)
            
            # Count registrations
            registrations = event.get('registrations', {})
            team_registrations = event.get('team_registrations', {})
            attendances = event.get('attendances', {})
            
            event['admin_stats'] = {
                "total_individual_registrations": len(registrations),
                "total_team_registrations": len(team_registrations),
                "total_attendances": len(attendances),
                "registration_percentage": 0,  # Calculate if needed
                "attendance_percentage": 0 if len(registrations) == 0 else round((len(attendances) / len(registrations)) * 100, 1)
            }
        
        # Pagination
        total_events = len(events)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_events = events[start_idx:end_idx]
        # Fix ObjectId in all events before returning
        paginated_events = fix_objectid(paginated_events)
        
        response_data = {
            "success": True,
            "message": f"Retrieved {len(paginated_events)} events",
            "events": paginated_events,
            "pagination": {
                "current_page": page,
                "total_pages": (total_events + limit - 1) // limit,
                "total_events": total_events,
                "events_per_page": limit
            }
        }
        
        # Cache the response for 30 seconds (events don't change that frequently for admins)
        if event_cache.is_available():
            try:
                event_cache.redis_client.setex(cache_key, 30, json.dumps(response_data, default=str))
                logger.info(f"💾 Cached admin events for 30s: {cache_key}")
            except Exception as cache_error:
                logger.warning(f"Cache write error: {cache_error}")
        
        return response_data
        
    except Exception as e:
        logger.error(f"Error getting events list: {str(e)}")
        return {"success": False, "message": f"Error retrieving events: {str(e)}"}

@router.get("/pending-approval")
async def get_pending_approval_events(
    page: int = Query(1, description="Page number"),
    limit: int = Query(100, ge=1, le=1000, description="Events per page (max 1000)"),
    admin: AdminUser = Depends(require_admin)
):
    """Get events pending approval - accessible by Super Admin and Faculty Organizers"""
    try:
        # Get events with pending approval status
        events = await EventStatusManager.get_available_events("pending_approval")
        
        # Filter events based on admin role
        if admin.role == AdminRole.ORGANIZER_ADMIN:
            # Faculty organizers can only see events assigned to them
            events = [
                event for event in events 
                if admin.employee_id and admin.employee_id in event.get("faculty_organizers", [])
            ]
            logger.info(f"🔍 Faculty Organizer {admin.username} ({admin.employee_id}) viewing {len(events)} assigned pending events")
        elif admin.role == AdminRole.SUPER_ADMIN:
            logger.info(f"🔍 Super Admin {admin.username} viewing {len(events)} total pending events")
        else:
            # Executive Admin and other roles cannot see pending approval events
            events = []
        
        # Add statistics for each event
        for event in events:
            event_id = event.get('event_id')
            
            # Count registrations (should be empty for pending events)
            registrations = event.get('registrations', {})
            team_registrations = event.get('team_registrations', {})
            attendances = event.get('attendances', {})
            
            event['admin_stats'] = {
                "total_individual_registrations": len(registrations),
                "total_team_registrations": len(team_registrations),
                "total_attendances": len(attendances),
                "registration_percentage": 0,
                "attendance_percentage": 0
            }
        
        # Pagination
        total_events = len(events)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_events = events[start_idx:end_idx]
        # Fix ObjectId in all events before returning
        paginated_events = fix_objectid(paginated_events)
        
        return {
            "success": True,
            "message": f"Retrieved {len(paginated_events)} pending approval events",
            "events": paginated_events,
            "pagination": {
                "current_page": page,
                "total_pages": (total_events + limit - 1) // limit,
                "total_events": total_events,
                "events_per_page": limit
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting pending approval events: {str(e)}")
        return {"success": False, "message": f"Error retrieving pending events: {str(e)}"}

@router.get("/details/{event_id}")
async def get_event_details(event_id: str, admin: AdminUser = Depends(require_admin)):
    """Get detailed event information for admin management"""
    try:
        # Check if admin has access to this event
        if admin.role == AdminRole.ORGANIZER_ADMIN and event_id not in (admin.assigned_events or []):
            raise HTTPException(status_code=403, detail="Access denied to this event")
        
        # Get event details
        event = await EventStatusManager.get_event_by_id(event_id)
        if not event:
            return {"success": False, "message": "Event not found"}
        
        # Use saved attendance_config if available, otherwise transform attendance_strategy
        if event.get('attendance_mandatory'):
            try:
                # Priority 1: Use saved attendance_config if it exists (user has customized)
                if event.get('attendance_config') and event['attendance_config'].get('sessions'):
                    attendance_config_data = event['attendance_config']
                    
                    # Transform saved config to frontend-expected format
                    event['attendance_strategy'] = {
                        "strategy_type": attendance_config_data.get('strategy', 'session_based'),
                        "pass_criteria": {
                            "minimum_percentage": attendance_config_data.get('criteria', {}).get('minimum_percentage') or attendance_config_data.get('minimum_percentage', 75),
                            "required_sessions": attendance_config_data.get('criteria', {}).get('required_sessions'),
                            "required_milestones": attendance_config_data.get('criteria', {}).get('required_milestones'),
                            "auto_calculate": attendance_config_data.get('criteria', {}).get('auto_calculate', True)
                        },
                        "sessions": [
                            {
                                "session_id": session.get('session_id'),
                                "session_name": session.get('session_name'),
                                "session_type": session.get('session_type', 'session'),
                                "start_time": session.get('start_time'),
                                "end_time": session.get('end_time'),
                                "attendance_window_start": session.get('start_time'),
                                "attendance_window_end": session.get('end_time'),
                                "weight": session.get('weight', 1.0),
                                "is_mandatory": session.get('is_mandatory', True),
                                "status": session.get('status', 'pending'),
                                "duration_minutes": session.get('duration_minutes')
                            } for session in attendance_config_data.get('sessions', [])
                        ],
                        "event_type": event.get('event_type', 'general'),
                        "auto_generated": attendance_config_data.get('auto_generated', False),
                        "total_sessions": len(attendance_config_data.get('sessions', [])),
                        "warnings": attendance_config_data.get('warnings', []),
                        "recommendations": attendance_config_data.get('recommendations', [])
                    }
                    
                    logger.info(f"✅ Using saved attendance_config for event {event_id} with {len(attendance_config_data.get('sessions', []))} sessions")
                
                # Priority 2: Use attendance_strategy if no custom config exists
                elif event.get('attendance_strategy') and isinstance(event['attendance_strategy'], dict):
                    # Already in complex format, just ensure it has the right structure
                    strategy_data = event['attendance_strategy']
                    event['attendance_strategy'] = {
                        "strategy_type": strategy_data.get('strategy', 'session_based'),
                        "pass_criteria": {
                            "minimum_percentage": strategy_data.get('criteria', {}).get('minimum_percentage') or strategy_data.get('minimum_percentage', 75),
                            "required_sessions": strategy_data.get('criteria', {}).get('required_sessions'),
                            "required_milestones": strategy_data.get('criteria', {}).get('required_milestones'),
                            "auto_calculate": strategy_data.get('criteria', {}).get('auto_calculate', True)
                        },
                        "sessions": strategy_data.get('sessions', []),
                        "event_type": event.get('event_type', 'general'),
                        "auto_generated": strategy_data.get('auto_generated', True),
                        "total_sessions": len(strategy_data.get('sessions', [])),
                        "warnings": strategy_data.get('warnings', []),
                        "recommendations": strategy_data.get('recommendations', [])
                    }
                    
                    logger.info(f"✅ Using existing attendance_strategy for event {event_id} with {len(strategy_data.get('sessions', []))} sessions")
                
                # Priority 3: Generate dynamic config as fallback
                elif event.get('attendance_strategy'):
                    # Create dynamic attendance configuration
                    attendance_config = AttendanceIntelligenceService.create_dynamic_config(event)
                    
                    # Transform to frontend-expected format
                    event['attendance_strategy'] = {
                        "strategy_type": attendance_config.strategy.value if hasattr(attendance_config.strategy, 'value') else str(attendance_config.strategy),
                        "pass_criteria": {
                            "minimum_percentage": attendance_config.criteria.minimum_percentage,
                            "required_sessions": attendance_config.criteria.required_sessions,
                            "required_milestones": attendance_config.criteria.required_milestones,
                            "auto_calculate": attendance_config.criteria.auto_calculate
                        },
                        "sessions": [
                            {
                                "session_id": session.session_id,
                                "session_name": session.session_name,
                                "session_type": session.session_type.value if hasattr(session.session_type, 'value') else str(session.session_type),
                                "start_time": session.start_time.isoformat() if session.start_time else None,
                                "end_time": session.end_time.isoformat() if session.end_time else None,
                                "attendance_window_start": session.start_time.isoformat() if session.start_time else None,
                                "attendance_window_end": session.end_time.isoformat() if session.end_time else None,
                                "weight": session.weight,
                                "is_mandatory": session.is_mandatory,
                                "status": session.status
                            } for session in attendance_config.sessions
                        ],
                        "event_type": attendance_config.event_type,
                        "auto_generated": attendance_config.auto_generated
                    }
                    
                    logger.info(f"✅ Generated dynamic attendance_strategy for event {event_id} with {len(attendance_config.sessions)} sessions")
                
            except Exception as e:
                logger.warning(f"⚠️ Failed to process attendance configuration for event {event_id}: {str(e)}")
                # Keep original format as fallback
                pass
        
        # Get detailed registration data
        registrations = event.get('registrations', {})
        team_registrations = event.get('team_registrations', {})
        attendances = event.get('attendances', {})
        
        # Calculate detailed statistics
        total_individual_participants = len(registrations)
        total_team_participants = sum(
            len(team.get('members', [])) if isinstance(team, dict) else 0 
            for team in team_registrations.values()
        )
        total_participants = total_individual_participants + total_team_participants
        
        admin_stats = {
            "registrations": {
                "individual_count": total_individual_participants,
                "team_count": len(team_registrations),
                "total_teams": len(team_registrations),
                "total_team_participants": total_team_participants,
                "total_participants": total_participants
            },
            "attendance": {
                "total_attended": len(attendances),
                "attendance_rate": 0 if total_participants == 0 else round((len(attendances) / total_participants) * 100, 1)
            },
            "engagement": {
                "feedback_count": 0,  # Calculate if needed
                "certificates_issued": len(event.get('certificates', {}))
            }
        }
        
        event['admin_stats'] = admin_stats
        
        # Fix ObjectId serialization
        event = fix_objectid(event)
        
        return {
            "success": True,
            "message": "Event details retrieved successfully",
            "event": event
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting event details: {str(e)}")
        return {"success": False, "message": f"Error retrieving event details: {str(e)}"}

@router.get("/stats")
async def get_event_stats(
    event_id: str = Query(..., description="Event ID to get statistics for"),
    admin: AdminUser = Depends(require_admin)
):
    """Get comprehensive event statistics for admin dashboard"""
    try:
        # Check if admin has access to this event
        if admin.role == AdminRole.ORGANIZER_ADMIN and event_id not in (admin.assigned_events or []):
            raise HTTPException(status_code=403, detail="Access denied to this event")
        
        # Get event statistics using direct database operations
        event = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event:
            return {"success": False, "message": "Event not found or no statistics available"}
        
        # Calculate basic statistics from event data
        registrations = event.get('registered_students', {})
        team_registrations = event.get('team_registrations', {})
        attendances = event.get('attendances', {})
        certificates = event.get('certificates', {})
        
        total_individual_registrations = len(registrations)
        total_team_registrations = len(team_registrations)
        total_team_members = sum(len([k for k in team.keys() if k.startswith("22")]) for team in team_registrations.values() if isinstance(team, dict))
        total_participants = total_individual_registrations + total_team_members
        total_attendances = len(attendances)
        total_certificates = len(certificates)
        
        event_stats = {
            "total_participants": total_participants,
            "total_individual_registrations": total_individual_registrations,
            "total_team_registrations": total_team_registrations,
            "total_team_members": total_team_members,
            "total_attendances": total_attendances,
            "total_certificates": total_certificates,
            "total_feedbacks": 0,  # Will be calculated below
            "is_team_based": event.get('is_team_based', False)
        }
        
        # Get feedback data from both student and faculty feedback collections
        student_feedbacks = await DatabaseOperations.find_many(
            "student_feedbacks", {"event_id": event_id}
        )
        faculty_feedbacks = await DatabaseOperations.find_many(
            "faculty_feedbacks", {"event_id": event_id}
        )
        
        # Combine all feedback responses
        all_feedbacks = list(student_feedbacks) + list(faculty_feedbacks)
        total_feedbacks = len(all_feedbacks)
        event_stats["total_feedbacks"] = total_feedbacks
        
        user_type = event.get("target_audience", {})
        # Calculate average rating from overall_rating field
        avg_rating = None
        if all_feedbacks:
            ratings = [f.get("responses", {}).get("overall_rating", 0) for f in all_feedbacks if f.get("responses", {}).get("overall_rating")]
            if ratings:
                avg_rating = round(sum(ratings) / len(ratings), 1)
        
        # Prepare comprehensive stats for frontend
        stats = {
            "registrations_count": event_stats.get("total_participants", 0),
            "attendance_count": event_stats.get("total_attendances", 0),
            "feedback_count": event_stats.get("total_feedbacks", 0),
            "certificates_count": event_stats.get("total_certificates", 0),
            "avg_rating": avg_rating,
            
            # Additional detailed statistics
            "is_team_based": event_stats.get("is_team_based", False),
            "total_team_registrations": event_stats.get("total_team_registrations", 0),
            "total_team_members": event_stats.get("total_team_members", 0),
            "total_individual_registrations": event_stats.get("total_individual_registrations", 0),
            "total_participants": event_stats.get("total_participants", 0),
            
            # Calculated percentages
            "attendance_rate": 0 if event_stats.get("total_participants", 0) == 0 else round(
                (event_stats.get("total_attendances", 0) / event_stats.get("total_participants", 0)) * 100, 1
            ),
            "feedback_rate": 0 if event_stats.get("total_attendances", 0) == 0 else round(
                (event_stats.get("total_feedbacks", 0) / event_stats.get("total_attendances", 0)) * 100, 1
            ),
            "certificate_completion_rate": 0 if event_stats.get("total_feedbacks", 0) == 0 else round(
                (event_stats.get("total_certificates", 0) / event_stats.get("total_feedbacks", 0)) * 100, 1
            ),
            "user_type": user_type
        }
        
        return {
            "success": True,
            "message": "Event statistics retrieved successfully",
            "stats": stats
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting event stats: {str(e)}")
        return {"success": False, "message": f"Error retrieving event statistics: {str(e)}"}

# Removed duplicate simple deletion endpoint - using comprehensive 3-step deletion endpoint below instead

@router.get("/registrations/{event_id}")
async def get_event_registrations(
    event_id: str, 
    page: int = Query(1, description="Page number"),
    limit: int = Query(50, description="Registrations per page"),
    admin: AdminUser = Depends(require_admin)
):
    """Get detailed registration data for an event using existing registration service"""
    try:
        # Check if admin has access to this event
        if admin.role == AdminRole.ORGANIZER_ADMIN and event_id not in (admin.assigned_events or []):
            raise HTTPException(status_code=403, detail="Access denied to this event")
        
        # Get event details
        event = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event:
            return {"success": False, "message": "Event not found"}



        # Calculate skip value for pagination
        skip = (page - 1) * limit
        
        # Determine which registration service(s) to query based on target_audience
        target_audience = event.get("target_audience", "student")
        all_registrations = []
        total_count = 0
        
        # Fetch all registrations from relevant collections (without pagination at service level)
        # We'll apply pagination after merging all results
        large_limit = 100  # Get all registrations from each service
        
        if target_audience in ["student", "both"]:
            # Query student registrations
            student_result = await event_registration_service.get_event_registrations(
                event_id=event_id,
                limit=large_limit,
                skip=0
            )
            if student_result["success"]:
                all_registrations.extend(student_result.get("registrations", []))
        
        if target_audience in ["faculty", "both"]:
            # Query faculty registrations
            faculty_result = await faculty_registration_service.get_event_registrations(
                event_id=event_id,
                limit=large_limit,
                skip=0
            )
            if faculty_result["success"]:
                faculty_registrations = faculty_result.get("registrations", [])
                # Mark faculty registrations for different display
                for reg in faculty_registrations:
                    reg["_user_type"] = "faculty"
                all_registrations.extend(faculty_registrations)
        
        # Sort all registrations by registration date (newest first)
        def get_registration_date(reg):
            if reg.get("registration_type") == "team":
                return reg.get("team", {}).get("registered_at", "")
            else:
                return reg.get("registration", {}).get("registered_at", "")
        
        all_registrations.sort(key=get_registration_date, reverse=True)
        
        # Apply pagination after merging and sorting
        total_count = len(all_registrations)
        registrations = all_registrations[skip:skip + limit]
        
        # Transform registrations to match frontend expected format
        transformed_registrations = []
        for reg in registrations:
            user_type = reg.get("_user_type", "student")  # Default to student if not marked
            
            if reg.get("registration", {}).get("type") == "individual":
                if user_type == "faculty":
                    # Faculty individual registration format
                    faculty_data = reg.get("faculty", {})
                    transformed_reg = {
                        "registration_id": reg.get("registration_id"),
                        "registration_type": "individual",
                        "user_type": "faculty",
                        "faculty_data": faculty_data,
                        "full_name": faculty_data.get("name"),
                        "email": faculty_data.get("email"),
                        "department": faculty_data.get("department"),
                        "designation": faculty_data.get("designation"),
                        "employee_id": faculty_data.get("employee_id"),
                        "mobile_no": faculty_data.get("contact_no"),
                        "registration_date": reg.get("registration", {}).get("registered_at"),
                        "status": reg.get("registration", {}).get("status", "confirmed"),
                        "total_count": total_count
                    }
                else:
                    # Student individual registration format
                    transformed_reg = {
                        "registration_id": reg.get("registration_id"),
                        "registration_type": "individual",
                        "user_type": "student",
                        "student_data": reg.get("student", {}),
                        "full_name": reg.get("student", {}).get("name"),
                        "enrollment_no": reg.get("student", {}).get("enrollment_no"),
                        "email": reg.get("student", {}).get("email"),
                        "department": reg.get("student", {}).get("department"),
                        "semester": reg.get("registration", {}).get("additional_data", {}).get("semester"),
                        "mobile_no": reg.get("registration", {}).get("additional_data", {}).get("mobile_no"),
                        "registration_date": reg.get("registration", {}).get("registered_at"),
                        "status": reg.get("registration", {}).get("status", "confirmed"),
                        "total_count": total_count
                    }
                transformed_registrations.append(transformed_reg)
            elif reg.get("registration_type") == "team":
                # Team registration format based on actual database structure
                team_info = reg.get("team", {})
                team_members_data = reg.get("team_members", [])
                
                # Build unified team members array with leader first using is_team_leader field
                unified_team_members = []
                
                # First pass: Add team leader at index 0
                for member in team_members_data:
                    if member.get("is_team_leader", False):
                        student_data = member.get("student", {})
                        team_leader_data = {
                            "full_name": student_data.get("name"),
                            "enrollment_no": student_data.get("enrollment_no"),
                            "email": student_data.get("email"),
                            "department": student_data.get("department"),
                            "semester": student_data.get("semester"),
                            "mobile_no": student_data.get("mobile_no"),
                            "is_team_leader": True
                        }
                        unified_team_members.append(team_leader_data)  # Leader at index 0
                        break
                
                # Second pass: Add non-leader team members
                for member in team_members_data:
                    if not member.get("is_team_leader", False):
                        student_data = member.get("student", {})
                        member_data = {
                            "full_name": student_data.get("name"),
                            "enrollment_no": student_data.get("enrollment_no"),
                            "email": student_data.get("email"),
                            "department": student_data.get("department"),
                            "semester": student_data.get("semester"),
                            "mobile_no": student_data.get("mobile_no"),
                            "is_team_leader": False
                        }
                        unified_team_members.append(member_data)
                
                # Get team leader data for other fields
                team_leader_data = unified_team_members[0] if unified_team_members else None
                print("Total Team" , total_count)
                transformed_reg = {
                    "registration_id": reg.get("registration_id"),
                    "registration_type": "team",
                    "user_type": user_type,
                    "team_name": team_info.get("team_name"),
                    "team_leader": team_leader_data,
                    "team_members": unified_team_members,  # Leader is always at index 0
                    "member_count": len(unified_team_members),
                    "name": team_leader_data.get("full_name", "Unknown Leader") if team_leader_data else "Unknown Leader",
                    "registration_date": team_info.get("registered_at"),
                    "status": team_info.get("status", "confirmed"),
                    "team_count": total_count
                }
                transformed_registrations.append(transformed_reg)
        
        # Calculate total pages
        total_pages = (total_count + limit - 1) // limit if limit > 0 else 1
        
        # Format response for frontend compatibility
        return {
            "success": True,
            "registrations": transformed_registrations,
            "total_count": total_count,
            "page": page,
            "limit": limit,
            "total_pages": total_pages,
            "event_details": {
                "event_id": event_id,
                "target_audience": event.get("target_audience", "student"),
                "event_name": event.get("event_name", ""),
                "event_type": event.get("event_type", "")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_event_registrations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get event registrations: {str(e)}")

@router.post("/bulk-update-status")
async def bulk_update_event_status(request: Request, admin: AdminUser = Depends(require_executive_admin_or_higher)):
    """Bulk update status for multiple events"""
    try:
        data = await request.json()
        event_ids = data.get("event_ids", [])
        new_status = data.get("status")
        new_sub_status = data.get("sub_status")
        
        if not event_ids or not new_status:
            return {"success": False, "message": "Event IDs and status are required"}
        
        # Update multiple events
        update_data = {
            "status": new_status,
            "updated_by": admin.username,
            "updated_at": datetime.now(pytz.timezone('Asia/Kolkata'))
        }
        
        if new_sub_status:
            update_data["sub_status"] = new_sub_status
        
        result = await DatabaseOperations.update_many(
            "events",
            {"event_id": {"$in": event_ids}},
            {"$set": update_data}
        )
        
        # Invalidate admin cache since events were bulk updated
        from utils.redis_cache import event_cache
        try:
            if event_cache.is_available():
                keys = event_cache.redis_client.keys("admin_events:*")
                if keys:
                    deleted_count = event_cache.redis_client.delete(*keys)
                    logger.info(f"🗑️ Invalidated {deleted_count} admin cache entries after bulk event update")
        except Exception as cache_error:
            logger.warning(f"Failed to invalidate admin cache after bulk event update: {cache_error}")
        
        return {
            "success": True,
            "message": f"Updated {result.modified_count} events",
            "modified_count": result.modified_count
        }
        
    except Exception as e:
        logger.error(f"Error bulk updating event status: {str(e)}")
        return {"success": False, "message": f"Error updating events: {str(e)}"}

@router.get("/attendance/{event_id}")
async def get_event_attendance(
    event_id: str, 
    page: int = Query(1, description="Page number"),
    limit: int = Query(50, description="Attendees per page"),
    admin: AdminUser = Depends(require_admin)
):
    """Get detailed attendance data for an event"""
    try:
        # Check if admin has access to this event
        if admin.role == AdminRole.ORGANIZER_ADMIN and event_id not in (admin.assigned_events or []):
            raise HTTPException(status_code=403, detail="Access denied to this event")
        
        # Get event details
        event = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event:
            return {"success": False, "message": "Event not found"}
        
        # Get attendance records
        attendances = event.get('attendances', {})
        
        # Collect detailed attendance data
        detailed_attendance = []
        
        for attendance_id, attendance_data in attendances.items():
            # Handle both old format (string) and new format (object)
            if isinstance(attendance_data, str):
                enrollment_no = attendance_data
                marked_at = None
                registration_id = None
            else:
                enrollment_no = attendance_data.get('enrollment_no', '')
                marked_at = attendance_data.get('marked_at')
                registration_id = attendance_data.get('registration_id', '')
            
            student_data = await DatabaseOperations.find_one("students", {"enrollment_no": enrollment_no})
            if student_data:
                participation = student_data.get('event_participations', {}).get(event_id, {})
                detailed_attendance.append({
                    "attendance_id": attendance_id,
                    "enrollment_no": enrollment_no,
                    "full_name": student_data.get('full_name', ''),
                    "email": student_data.get('email', ''),
                    "department": student_data.get('department', ''),
                    "semester": student_data.get('semester', 'N/A'),
                    "registration_id": registration_id or participation.get('registration_id', ''),
                    "attendance_date": marked_at or participation.get('attendance_marked_at'),
                    "registration_date": participation.get('registration_date'),
                    "feedback_status": "submitted" if participation.get('feedback_id') else "not_submitted",
                    "certificate_status": "issued" if participation.get('certificate_id') else "not_issued"
                })
        
        # Sort by attendance date (most recent first)
        detailed_attendance.sort(key=lambda x: x.get('attendance_date') or '', reverse=True)
        
        # Pagination
        total_attendance = len(detailed_attendance)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_attendance = detailed_attendance[start_idx:end_idx]
        
        return {
            "success": True,
            "message": f"Retrieved {len(paginated_attendance)} attendance records",
            "attendance": paginated_attendance,
            "pagination": {
                "current_page": page,
                "total_pages": (total_attendance + limit - 1) // limit,
                "total_attendance": total_attendance,
                "attendees_per_page": limit
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting event attendance: {str(e)}")
        return {"success": False, "message": f"Error retrieving attendance: {str(e)}"}

@router.post("/export/{event_id}")
async def export_event_data(
    event_id: str,
    request: Request,
    admin: AdminUser = Depends(require_admin)
):
    """Export event registration data in various formats"""
    try:
        from fastapi.responses import Response
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors
        from reportlab.lib.units import inch
        from io import BytesIO
        import json
        
        # Check if admin has access to this event
        if admin.role == AdminRole.ORGANIZER_ADMIN and event_id not in (admin.assigned_events or []):
            raise HTTPException(status_code=403, detail="Access denied to this event")
        
        # Get request body
        body = await request.body()
        export_data = json.loads(body.decode()) if body else {}
        
        export_type = export_data.get('type', 'custom')
        fields = export_data.get('fields', [])
        
        # Get event details
        db = await Database.get_database()
        if db is None:
            raise HTTPException(status_code=500, detail="Database connection failed")
            
        event = await db.events.find_one({"event_id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Get registrations
        registrations = event.get('registrations', {})
        team_registrations = event.get('team_registrations', {})
        
        # Combine individual and team registrations
        all_registrations = []
        
        # Add individual registrations
        for enrollment_no, reg_data in registrations.items():
            reg_entry = {
                'enrollment_no': enrollment_no,
                'full_name': reg_data.get('full_name', ''),
                'department': reg_data.get('department', ''),
                'semester': reg_data.get('semester', ''),
                'email': reg_data.get('email', ''),
                'mobile_no': reg_data.get('mobile_no', ''),
                'gender': reg_data.get('gender', ''),
                'registration_datetime': reg_data.get('registration_datetime', ''),
                'team_name': '',
                'team_leader': 'Individual'
            }
            all_registrations.append(reg_entry)
        
        # Add team registrations
        for team_id, team_data in team_registrations.items():
            team_name = team_data.get('team_name', f'Team {team_id}')
            leader_enrollment = team_data.get('leader_enrollment_no', '')
            members = team_data.get('team_members', [])
            
            for member in members:
                reg_entry = {
                    'enrollment_no': member.get('enrollment_no', ''),
                    'full_name': member.get('full_name', ''),
                    'department': member.get('department', ''),
                    'semester': member.get('semester', ''),
                    'email': member.get('email', ''),
                    'mobile_no': member.get('mobile_no', ''),
                    'gender': member.get('gender', ''),
                    'registration_datetime': team_data.get('registration_datetime', ''),
                    'team_name': team_name,
                    'team_leader': 'Yes' if member.get('enrollment_no') == leader_enrollment else 'No'
                }
                all_registrations.append(reg_entry)
        
        # Define field mappings
        field_mapping = {
            'enrollment_no': 'Enrollment No.',
            'full_name': 'Full Name',
            'department': 'Department',
            'semester': 'Semester',
            'email': 'Email',
            'mobile_no': 'Mobile No.',
            'gender': 'Gender',
            'registration_datetime': 'Registration Date',
            'team_name': 'Team Name',
            'team_leader': 'Team Leader'
        }
        
        # Set default fields based on export type
        if export_type == 'quick-standard':
            selected_fields = ['enrollment_no', 'full_name', 'department', 'semester', 'email', 'mobile_no', 'registration_datetime']
        elif export_type == 'sign-sheet':
            selected_fields = ['enrollment_no', 'full_name', 'department', 'semester']
        else:  # custom
            selected_fields = fields if fields else ['enrollment_no', 'full_name', 'department', 'registration_datetime']
        
        # Create PDF
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=0.5*inch, rightMargin=0.5*inch)
        elements = []
        styles = getSampleStyleSheet()
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            spaceAfter=30,
            alignment=1  # Center alignment
        )
        
        if export_type == 'sign-sheet':
            title = f"Attendance Sign Sheet - {event.get('event_name', 'Event')}"
        else:
            title = f"Registration Report - {event.get('event_name', 'Event')}"
        
        elements.append(Paragraph(title, title_style))
        
        # Event details
        event_info = f"""
        <b>Event:</b> {event.get('event_name', 'N/A')}<br/>
        <b>Date:</b> {event.get('event_date', 'N/A')}<br/>
        <b>Time:</b> {event.get('event_time', 'N/A')}<br/>
        <b>Venue:</b> {event.get('venue', 'N/A')}<br/>
        <b>Total Registrations:</b> {len(all_registrations)}
        """
        elements.append(Paragraph(event_info, styles['Normal']))
        elements.append(Spacer(1, 20))
        
        # Prepare table data
        headers = [field_mapping.get(field, field) for field in selected_fields]
        
        # Add signature column for sign sheet
        if export_type == 'sign-sheet':
            headers.append('Signature')
        
        table_data = [headers]
        
        # Add registration data
        for i, reg in enumerate(all_registrations, 1):
            row = []
            for field in selected_fields:
                value = reg.get(field, '')
                # Format datetime if needed
                if field == 'registration_datetime' and value:
                    try:
                        if isinstance(value, str):
                            # Try to parse and format the datetime
                            from datetime import datetime
                            dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
                            value = dt.strftime('%Y-%m-%d %H:%M')
                    except:
                        pass
                row.append(str(value))
            
            # Add empty signature column for sign sheet
            if export_type == 'sign-sheet':
                row.append('')
            
            table_data.append(row)
        
        # Create table
        table = Table(table_data)
        
        # Style the table
        table_style = [
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]
        
        # Add extra styling for sign sheet
        if export_type == 'sign-sheet':
            # Make signature column wider
            table_style.append(('COLWIDTH', (-1, 0), (-1, -1), 1.5*inch))
            # Add more padding for signature
            table_style.append(('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]))
        
        table.setStyle(TableStyle(table_style))
        elements.append(table)
        
        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        
        # Generate filename
        event_name = event.get('event_name', 'event').replace(' ', '_').lower()
        if export_type == 'sign-sheet':
            filename = f"{event_name}_sign_sheet.pdf"
        elif export_type == 'quick-standard':
            filename = f"{event_name}_registration_report.pdf"
        else:
            filename = f"{event_name}_custom_export.pdf"
        
        # Return PDF as response
        return Response(
            content=buffer.getvalue(),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting event data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error exporting data: {str(e)}")

@router.get("/pending-approval")
async def get_pending_approval_events(
    page: int = Query(1, description="Page number"),
    limit: int = Query(100, ge=1, le=1000, description="Events per page (max 1000)"),
    admin: AdminUser = Depends(require_super_admin_access)
):
    """Get events pending Super Admin approval (Super Admin only)"""
    try:
        # Get pending approval events
        events = await EventStatusManager.get_available_events("pending_approval", include_pending_approval=True)
        
        # Add additional metadata for approval decisions
        for event in events:
            # Count selected organizers
            organizers = event.get('organizers', [])
            if isinstance(organizers, list):
                selected_organizers = [org for org in organizers if isinstance(org, dict)]
                new_organizers = [org for org in selected_organizers if org.get('isNew', False)]
                existing_organizers = [org for org in selected_organizers if not org.get('isNew', False)]
                
                event['approval_stats'] = {
                    "total_organizers": len(selected_organizers),
                    "new_organizers": len(new_organizers),
                    "existing_organizers": len(existing_organizers),
                    "requires_organizer_creation": len(new_organizers) > 0
                }
            else:
                event['approval_stats'] = {
                    "total_organizers": 0,
                    "new_organizers": 0,
                    "existing_organizers": 0,
                    "requires_organizer_creation": False
                }
        
        # Pagination
        total_events = len(events)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_events = events[start_idx:end_idx]
        paginated_events = fix_objectid(paginated_events)
        
        return {
            "success": True,
            "message": f"Retrieved {len(paginated_events)} pending approval events",
            "events": paginated_events,
            "pagination": {
                "current_page": page,
                "total_pages": (total_events + limit - 1) // limit,
                "total_events": total_events,
                "events_per_page": limit
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting pending approval events: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving pending events: {str(e)}")


@router.delete("/delete/{event_id}")
async def delete_event(
    event_id: str,
    admin: AdminUser = Depends(require_admin_with_refresh)
):
    """
    Step-by-step event deletion:
    1. Delete event files from Supabase storage
    2. Remove event ID from faculty assigned_events
    3. Delete event data from events collection
    """
    logger.info(f"🚀 DELETE ENDPOINT REACHED! Event ID: {event_id}")
    logger.info(f"🔍 Admin user: {admin.email} ({admin.role})")
    
    try:
        logger.info(f"🗑️ Starting deletion process for event: {event_id}")
        
        logger.info(f"🔗 Getting database connection...")
        db = await Database.get_database()
        if db is None:
            logger.error(f"❌ Database connection is None!")
            raise HTTPException(status_code=500, detail="Database connection failed")
        logger.info(f"✅ Database connection successful")
        
        # Check if event exists
        logger.info(f"🔍 Checking if event {event_id} exists...")
        existing_event = await db.events.find_one({"event_id": event_id})
        if not existing_event:
            logger.error(f"❌ Event {event_id} not found in database")
            raise HTTPException(status_code=404, detail="Event not found")
        logger.info(f"✅ Event found: {existing_event.get('event_name', 'Unknown')}")
        
        # Check if admin has permission to delete this event
        # Permission Logic:
        # - SUPER_ADMIN: Can delete any event
        # - EXECUTIVE_ADMIN: Can delete any event  
        # - ORGANIZER_ADMIN: Can delete events if they have explicit "admin.events.delete" permission
        #   OR if they are assigned to the event (for backwards compatibility)
        if admin.role == AdminRole.ORGANIZER_ADMIN:
            # For organizer admins, check both explicit permissions and event assignment
            # Note: organizer_permissions from faculty document is mapped to admin.permissions by auth dependency
            has_delete_permission = "admin.events.delete" in (admin.permissions or [])
            is_assigned_to_event = event_id in (admin.assigned_events or [])
            
            logger.info(f"🔐 Organizer Admin Permission Check:")
            logger.info(f"   - Admin: {admin.email}")
            logger.info(f"   - Permissions: {admin.permissions}")
            logger.info(f"   - Has delete permission: {has_delete_permission}")
            logger.info(f"   - Assigned events: {admin.assigned_events}")
            logger.info(f"   - Is assigned to event: {is_assigned_to_event}")
            
            if not (has_delete_permission or is_assigned_to_event):
                logger.error(f"❌ Organizer admin {admin.email} does not have permission to delete event {event_id}")
                logger.error(f"   - Required: 'admin.events.delete' permission OR assignment to event")
                logger.error(f"   - Current permissions: {admin.permissions}")
                logger.error(f"   - Current assignments: {admin.assigned_events}")
                raise HTTPException(
                    status_code=403, 
                    detail="Access denied. You need 'admin.events.delete' permission or assignment to this event to delete it."
                )
        elif admin.role not in [AdminRole.SUPER_ADMIN, AdminRole.EXECUTIVE_ADMIN]:
            # All other roles are not allowed to delete events
            logger.error(f"❌ Admin {admin.email} with role {admin.role} cannot delete events")
            raise HTTPException(
                status_code=403, 
                detail="Access denied. Only Super Admin, Executive Admin, or authorized Organizer Admin can delete events."
            )
        
        # Check if event has registrations
        registrations = existing_event.get('registrations', {})
        team_registrations = existing_event.get('team_registrations', {})
        
        if registrations or team_registrations:
            logger.warning(f"⚠️ Cannot delete event {event_id}: has existing registrations")
            return {
                "success": False, 
                "message": "Cannot delete event with existing registrations. Please cancel all registrations first."
            }
        
        deletion_summary = {
            "event_id": event_id,
            "files_deleted": 0,
            "faculty_updated": 0,
            "event_deleted": False,
            "errors": []
        }
        
        # STEP 1: Delete event files from Supabase storage
        logger.info(f"📁 Step 1: Deleting files for event {event_id}")
        try:
            from services.supabase_storage_service import SupabaseStorageService
            from config.settings import get_settings
            settings = get_settings()
            
            logger.info(f"📡 Step 1: Starting Supabase file deletion...")
            
            # List files in event folder
            files_result = await SupabaseStorageService.list_files(
                bucket_name=settings.SUPABASE_EVENT_BUCKET,  # campusconnect-event-data
                folder_path=event_id
            )
            
            logger.info(f"📊 Step 1: List files result - Success: {files_result.get('success')}, Files: {len(files_result.get('files', []))}")
            
            if files_result["success"]:
                logger.info(f"📁 Step 1: Found {len(files_result['files'])} files to process")
                # Delete each file
                for file_obj in files_result["files"]:
                    if file_obj["name"] != ".emptyFolderPlaceholder":
                        file_path = f"{event_id}/{file_obj['name']}"
                        logger.info(f"🗑️ Step 1: Attempting to delete file: {file_path}")
                        success = await SupabaseStorageService.delete_file(
                            bucket_name=settings.SUPABASE_EVENT_BUCKET,
                            file_path=file_path
                        )
                        if success:
                            deletion_summary["files_deleted"] += 1
                            logger.info(f"✅ Step 1: Deleted file: {file_path}")
                        else:
                            logger.warning(f"⚠️ Step 1: Failed to delete file: {file_path}")
                
                logger.info(f"✅ Step 1 Complete: Deleted {deletion_summary['files_deleted']} files")
            else:
                logger.warning(f"⚠️ Step 1: Could not list files for event {event_id}: {files_result.get('error', 'Unknown error')}")
                deletion_summary["errors"].append(f"Could not list event files: {files_result.get('error', 'Unknown error')}")
                
        except Exception as e:
            logger.error(f"❌ Step 1 Error: Failed to delete files for event {event_id}: {str(e)}")
            logger.error(f"❌ Step 1 Exception details: {type(e).__name__}: {str(e)}")
            deletion_summary["errors"].append(f"File deletion error: {str(e)}")
        
        # STEP 2: Remove event ID from faculty assigned_events
        logger.info(f"👥 Step 2: Removing event {event_id} from faculty assigned_events")
        try:
            logger.info(f"🔍 Step 2: Starting faculty assignment removal...")
            
            # Find all faculty members who have this event assigned (regardless of event.faculty_organizers)
            faculty_with_event = await db.faculties.find({
                "assigned_events": event_id
            }).to_list(length=None)
            
            logger.info(f"� Step 2: Found {len(faculty_with_event)} faculty members with this event assigned")
            
            if faculty_with_event:
                logger.info(f"📋 Step 2: Faculty members found:")
                for faculty in faculty_with_event:
                    logger.info(f"   - {faculty.get('full_name')} ({faculty.get('employee_id')})")
                
                # Remove event from ALL faculty members' assigned_events who have it
                logger.info(f"🗑️ Step 2: Executing faculty update query...")
                result = await db.faculties.update_many(
                    {"assigned_events": event_id},
                    {"$pull": {"assigned_events": event_id}}
                )
                deletion_summary["faculty_updated"] = result.modified_count
                logger.info(f"✅ Step 2 Complete: Removed event from {result.modified_count} faculty members")
            else:
                logger.info(f"ℹ️ Step 2: No faculty members found with event {event_id} assigned")
                
        except Exception as e:
            logger.error(f"❌ Step 2 Error: Failed to remove event from faculty: {str(e)}")
            logger.error(f"❌ Step 2 Exception details: {type(e).__name__}: {str(e)}")
            deletion_summary["errors"].append(f"Faculty update error: {str(e)}")
        
        # STEP 3: Delete event data from events collection
        logger.info(f"🗃️ Step 3: Deleting event document for {event_id}")
        try:
            result = await db.events.delete_one({"event_id": event_id})
            
            if result.deleted_count > 0:
                deletion_summary["event_deleted"] = True
                logger.info(f"✅ Step 3 Complete: Deleted event document for {event_id}")
                
                # Remove from scheduler if it exists
                try:
                    from utils.dynamic_event_scheduler import remove_event_from_scheduler
                    await remove_event_from_scheduler(event_id)
                    logger.info(f"🕒 Removed event {event_id} from scheduler")
                except Exception as scheduler_error:
                    logger.warning(f"⚠️ Could not remove event from scheduler: {scheduler_error}")
                    deletion_summary["errors"].append(f"Scheduler removal warning: {scheduler_error}")
                
            else:
                logger.error(f"❌ Step 3 Error: Event {event_id} not found in database")
                deletion_summary["errors"].append("Event not found in database")
                
        except Exception as e:
            logger.error(f"❌ Step 3 Error: Failed to delete event document: {str(e)}")
            deletion_summary["errors"].append(f"Event deletion error: {str(e)}")
        
        # CLEANUP: Legacy event IDs cleanup (optional)
        logger.info(f"🧹 Cleanup: Removing any legacy references to event {event_id}")
        try:
            # Clean up any legacy event references that might exist in faculties collection
            await db.faculties.update_many(
                {},
                {"$pull": {"assigned_events": event_id}}
            )
            logger.info(f"✅ Cleanup Complete: Removed any legacy references to {event_id}")
        except Exception as e:
            logger.warning(f"⚠️ Cleanup Warning: {str(e)}")
        
        # Invalidate admin cache since event was deleted
        try:
            from utils.redis_cache import event_cache
            if event_cache.is_available():
                keys = event_cache.redis_client.keys("admin_events:*")
                if keys:
                    deleted_count = event_cache.redis_client.delete(*keys)
                    logger.info(f"🗑️ Invalidated {deleted_count} admin cache entries after event deletion")
        except Exception as cache_error:
            logger.warning(f"Cache invalidation warning: {cache_error}")
        
        # Determine success status
        success = deletion_summary["event_deleted"]
        
        if success:
            # Log event deletion action for audit and status tracking
            try:
                await event_action_logger.log_event_deleted(
                    event_id=event_id,
                    event_name=existing_event.get("event_name", "Unknown Event"),
                    deleted_by_username=admin.username,
                    deleted_by_role=admin.role.value,
                    event_data=existing_event,
                    deletion_reason="Manual deletion via admin portal",
                    request_metadata={
                        "admin_role": admin.role.value,
                        "files_deleted": deletion_summary["files_deleted"],
                        "faculty_updated": deletion_summary["faculty_updated"],
                        "deletion_errors": deletion_summary["errors"],
                        "deletion_source": "admin_portal"
                    }
                )
            except Exception as logging_error:
                logger.warning(f"⚠️ Failed to log event deletion: {logging_error}")
                # Don't fail deletion if logging fails
            
            logger.info(f"🎉 Event deletion completed successfully for {event_id}")
            logger.info(f"📊 Deletion Summary: {deletion_summary}")
            
            return {
                "success": True,
                "message": f"Event '{event_id}' has been completely deleted",
                "deletion_summary": deletion_summary
            }
        else:
            logger.error(f"❌ Event deletion failed for {event_id}")
            return {
                "success": False,
                "message": "Event deletion failed",
                "deletion_summary": deletion_summary
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Critical error during event deletion: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting event: {str(e)}")

# Include approval routes AFTER all local routes to avoid conflicts
router.include_router(approval_router)

@router.post("/trigger-pending-notifications")
async def trigger_pending_notifications(
    admin: AdminUser = Depends(require_super_admin_access)
):
    """
    Trigger notifications for all pending approval events
    This endpoint finds all events with status 'pending_approval' and sends
    notification requests to Super Admins for approval.
    
    Only Super Admins can trigger this endpoint.
    """
    try:
        logger.info(f"🔔 Bulk notification trigger requested by Super Admin: {admin.username}")
        
        # Get database connection
        db = await Database.get_database()
        if db is None:
            raise HTTPException(status_code=500, detail="Database connection failed")
        
        # Find all events that need approval (event_approval_status = 'pending_approval')
        pending_events = await db.events.find({"event_approval_status": "pending_approval"}).to_list(length=None)
        logger.info(f"🔍 Found {len(pending_events)} pending approval events")
        
        if not pending_events:
            return {
                "success": True,
                "message": "No pending events found that require approval",
                "events_processed": 0,
                "notifications_sent": 0
            }
        
        # Get all Super Admins to notify (check both admin_users and users collections)
        super_admins_admin = await db.admin_users.find({"role": "super_admin"}).to_list(length=None)
        super_admins_users = await db.users.find({"role": "super_admin"}).to_list(length=None)
        
        # Combine results from both collections
        super_admins = super_admins_admin + super_admins_users
        logger.info(f"🔍 Found {len(super_admins)} Super Admin(s) in database (admin_users: {len(super_admins_admin)}, users: {len(super_admins_users)})")
        
        if not super_admins:
            return {
                "success": False,
                "message": "No Super Admins found in database",
                "events_processed": len(pending_events),
                "notifications_sent": 0
            }
        
        notifications_sent = 0
        
        # Use imported notification service singleton
        # (notification_service is already imported)
        
        # Create notifications for each pending event
        for event in pending_events:
            event_name = event.get("event_name", "Unknown Event")
            event_id = event.get("event_id", "Unknown ID")
            
            # Get the actual creator name - prioritize event_created_by over system username
            created_by = (
                event.get("event_created_by") or  # Actual person's name (e.g., "Arth Darji")
                event.get("created_by") or        # System username (e.g., "ldrpadmin")
                "Unknown Creator"
            )
            
            logger.info(f"🔔 Processing event: {event_name} (ID: {event_id}) created by {created_by}")
            
            # Send notification to each Super Admin
            for super_admin in super_admins:
                try:
                    logger.info(f"🔔 Creating notification for Super Admin: {super_admin['username']}")
                    await notification_service.create_notification(
                        notification_type=NotificationType.EVENT_APPROVAL_REQUEST,
                        title=f"New Event Approval Request: {event_name}",
                        message=f"Event '{event_name}' (ID: {event_id}) has been created by {created_by} and requires your approval.",
                        recipient_username=super_admin["username"],
                        recipient_role=super_admin["role"],
                        sender_username=created_by,
                        sender_role="event_creator",  # More descriptive role
                        related_entity_type="event",
                        related_entity_id=event_id,
                        priority=NotificationPriority.HIGH,
                        action_required=True,
                        action_type="approve_event",
                        action_data={
                            # Basic info
                            "event_id": event.get("event_id"),
                            "event_name": event.get("event_name"),
                            "created_by": created_by,  # This is "Arth Darji"
                            
                            # Event details - exact field mapping from database
                            "organizing_department": event.get("organizing_department"),
                            "event_type": event.get("event_type"),
                            "target_audience": event.get("target_audience"),
                            "mode": event.get("mode"),
                            "venue": event.get("venue"),
                            "short_description": event.get("short_description"),
                            "detailed_description": event.get("detailed_description"),
                            
                            # Dates - convert from datetime objects to strings
                            "start_date": event.get("start_datetime").isoformat() if event.get("start_datetime") else None,
                            "end_date": event.get("end_datetime").isoformat() if event.get("end_datetime") else None,
                            "registration_start_date": event.get("registration_start_date").isoformat() if event.get("registration_start_date") else None,
                            "registration_end_date": event.get("registration_end_date").isoformat() if event.get("registration_end_date") else None,
                            
                            # Registration details
                            "registration_mode": event.get("registration_mode"),
                            "registration_type": "Free" if not event.get("is_paid", False) else "Paid",
                            "is_team_based": event.get("is_team_based", False),
                            "max_participants": event.get("max_participants"),
                            "min_participants": event.get("min_participants"),
                            
                            # Organizers and contacts
                            "organizers": event.get("organizers", []),
                            "contacts": event.get("contacts", []),
                            
                            # Status
                            "status": event.get("status"),
                            "approval_required": event.get("approval_required", True)
                        },
                        metadata={
                            "event_type": event.get("event_type", "Unknown"),
                            "start_date": event.get("start_datetime", event.get("start_date", "Unknown")),
                            "organizing_department": event.get("organizing_department", "Unknown"),
                            "target_audience": event.get("target_audience", "Unknown"),
                            "mode": event.get("mode", "Unknown"),
                            "venue": event.get("venue", "Unknown"),
                            "registration_type": "paid" if event.get("is_paid") else "free",
                            "created_via": "bulk_notification_trigger"
                        }
                    )
                    logger.info(f"✅ Successfully created approval notification for Super Admin: {super_admin['username']}")
                    notifications_sent += 1
                except Exception as e:
                    logger.error(f"❌ Error creating notification for {super_admin['username']}: {str(e)}")
        
        return {
            "success": True,
            "message": f"Processed {len(pending_events)} pending events and sent {notifications_sent} notifications",
            "events_processed": len(pending_events),
            "notifications_sent": notifications_sent,
            "super_admins_found": len(super_admins),
            "pending_events": [
                {
                    "event_id": event.get("event_id"),
                    "event_name": event.get("event_name"),
                    "created_by": event.get("created_by"),
                    "status": event.get("status")
                }
                for event in pending_events
            ]
        }

    except Exception as e:
        logger.error(f"Error triggering pending notifications: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error triggering notifications: {str(e)}")

# FEEDBACK ENDPOINTS
@router.post("/feedback/create/{event_id}")
async def create_feedback_form(
    event_id: str,
    request: Request,
    admin: AdminUser = Depends(require_admin)
):
    """Create or update feedback form for an event"""
    try:
        body = await request.json()
        
        # Validate required fields
        if not body.get("elements"):
            raise HTTPException(status_code=400, detail="Feedback form elements are required")
        
        result = await event_feedback_service.create_feedback_form(event_id, body)
        
        if result["success"]:
            # Log the action
            await event_action_logger.log_action(
                event_id=event_id,
                action_type="feedback_form_created",
                performed_by=admin.username,
                details={"form_title": body.get("title", ""), "elements_count": len(body.get("elements", []))}
            )
            
            return JSONResponse(
                status_code=200,
                content=result
            )
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating feedback form: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating feedback form: {str(e)}")

@router.get("/feedback/form/{event_id}")
async def get_feedback_form(
    event_id: str,
    admin: AdminUser = Depends(require_admin)
):
    """Get feedback form for an event"""
    try:
        result = await event_feedback_service.get_feedback_form(event_id)
        
        if result["success"]:
            return JSONResponse(status_code=200, content=result)
        else:
            raise HTTPException(status_code=404, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting feedback form: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting feedback form: {str(e)}")

@router.get("/feedback/responses/{event_id}")
async def get_feedback_responses(
    event_id: str,
    page: int = Query(1, description="Page number"),
    limit: int = Query(50, description="Responses per page"),
    admin: AdminUser = Depends(require_admin)
):
    """Get all feedback responses for an event"""
    try:
        result = await event_feedback_service.get_event_feedback_responses(event_id, page, limit)
        
        if result["success"]:
            return JSONResponse(status_code=200, content=result)
        else:
            raise HTTPException(status_code=404, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting feedback responses: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting feedback responses: {str(e)}")

@router.get("/feedback/analytics/{event_id}")
async def get_feedback_analytics(
    event_id: str,
    admin: AdminUser = Depends(require_admin)
):
    """Get feedback analytics and summary for an event"""
    try:
        result = await event_feedback_service.get_feedback_analytics(event_id)
        
        if result["success"]:
            return JSONResponse(status_code=200, content=result)
        else:
            raise HTTPException(status_code=404, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting feedback analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting feedback analytics: {str(e)}")

@router.delete("/feedback/delete/{event_id}")
async def delete_feedback_form(
    event_id: str,
    admin: AdminUser = Depends(require_admin)
):
    """Delete feedback form for an event"""
    try:
        result = await event_feedback_service.delete_feedback_form(event_id)
        
        if result["success"]:
            # Log the action
            await event_action_logger.log_action(
                event_id=event_id,
                action_type="feedback_form_deleted",
                performed_by=admin.username,
                details={}
            )
            
            return JSONResponse(status_code=200, content=result)
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting feedback form: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting feedback form: {str(e)}")

# Include approval routes AFTER all local routes to avoid conflicts
router.include_router(approval_router)
