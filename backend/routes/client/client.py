import warnings
import re
import logging
from fastapi import APIRouter, Request, HTTPException, Response, Depends, status, Form
from fastapi.templating import Jinja2Templates
from fastapi.responses import RedirectResponse, HTMLResponse
from datetime import datetime, timedelta
from utils.db_operations import DatabaseOperations
from utils.email_service import EmailService
from models.registration import RegistrationForm
from models.student import Student
from models.attendance import AttendanceRecord
from config.database import Database
from bson import ObjectId
from utils.template_context import get_template_context
from utils.statistics import StatisticsManager
from dependencies.auth import require_student_login, get_current_student, get_current_student_optional

# Configure logging
logger = logging.getLogger(__name__)

# Suppress bcrypt version warning
warnings.filterwarnings("ignore", message=".*error reading bcrypt version.*")

router = APIRouter()  # Removed prefix="/client" since the parent router already has this prefix
templates = Jinja2Templates(directory="templates")
email_service = EmailService()

@router.get("/")
async def index(request: Request):
    """Render the client homepage with upcoming and ongoing events"""
    try:
        from utils.event_status_manager import EventStatusManager

        # Get events and update their status
        upcoming_events = await EventStatusManager.get_available_events("upcoming")
        ongoing_events = await EventStatusManager.get_available_events("ongoing")
        
        # Convert datetime strings to datetime objects and sort by relevant dates
        current_date = datetime.now()
        
        # Convert and sort upcoming events
        for event in upcoming_events:
            for date_field in ["start_datetime", "end_datetime", "registration_start_date", "registration_end_date"]:
                if isinstance(event.get(date_field), str):
                    try:
                        event[date_field] = datetime.fromisoformat(event[date_field].replace('Z', '+00:00'))
                    except (ValueError, AttributeError):
                        event[date_field] = current_date
                elif event.get(date_field) is None:
                    event[date_field] = current_date
        
        # Convert and sort ongoing events  
        for event in ongoing_events:
            for date_field in ["start_datetime", "end_datetime", "registration_start_date", "registration_end_date"]:
                if isinstance(event.get(date_field), str):
                    try:
                        event[date_field] = datetime.fromisoformat(event[date_field].replace('Z', '+00:00'))
                    except (ValueError, AttributeError):
                        event[date_field] = current_date
                elif event.get(date_field) is None:
                    event[date_field] = current_date
        
        # Safe sort function
        def safe_sort_key(event, field):
            value = event.get(field, current_date)
            if isinstance(value, str):
                try:
                    return datetime.fromisoformat(value.replace('Z', '+00:00'))
                except (ValueError, AttributeError):
                    return current_date
            elif isinstance(value, datetime):
                return value
            else:
                return current_date
        
        upcoming_events.sort(key=lambda x: safe_sort_key(x, 'start_datetime'))
        ongoing_events.sort(key=lambda x: safe_sort_key(x, 'end_datetime'))
        
        # Calculate event type counts for the homepage
        all_events = upcoming_events + ongoing_events
        event_type_counts = {}
        for event in all_events:
            event_type = event.get('event_type', 'other').lower()
            event_type_counts[event_type] = event_type_counts.get(event_type, 0) + 1
        
        # Get real platform statistics from database
        platform_stats = await StatisticsManager.get_platform_statistics()
          # Format statistics for display
        formatted_stats = {
            "total_events": StatisticsManager.format_stat_number(platform_stats["total_events"]),
            "active_students": StatisticsManager.format_stat_number(platform_stats["active_students"]),
            "certificates_issued": StatisticsManager.format_stat_number(platform_stats["certificates_issued"]),
            "platform_rating": StatisticsManager.format_rating(platform_stats["platform_rating"])
        }
        
        # Get template context
        template_context = await get_template_context(request)
        
        # Convert datetime objects to ISO format strings for template
        serialized_upcoming_events = []
        for event in upcoming_events:
            serialized_event = {}
            for key, value in event.items():                
                if isinstance(value, datetime):
                    serialized_event[key] = value.isoformat()
                else:
                    serialized_event[key] = value
            serialized_upcoming_events.append(serialized_event)
            
        serialized_ongoing_events = []
        for event in ongoing_events:
            serialized_event = {}
            for key, value in event.items():
                if isinstance(value, datetime):
                    serialized_event[key] = value.isoformat()
                else:
                    serialized_event[key] = value
            serialized_ongoing_events.append(serialized_event)
        return templates.TemplateResponse(
            "client/index.html",
            {
                "request": request,
                "upcoming_events": serialized_upcoming_events,
                "ongoing_events": serialized_ongoing_events,                "current_datetime": datetime.now(),
                "event_type_counts": event_type_counts,
                "platform_stats": formatted_stats,
                **template_context
            }
        )
    except Exception as e:
        logger.error(f"Error in client index: {str(e)}")
        template_context = await get_template_context(request)
        return templates.TemplateResponse(
            "client/index.html",
            {
                "request": request,
                "upcoming_events": [],
                "ongoing_events": [],
                "current_datetime": datetime.now(),
                "error": str(e),
                **template_context
            }
        )

@router.get("/events")
async def list_events(request: Request, filter: str = "upcoming"):
    """Client-side event listing page"""
    try:
        from utils.event_status_manager import EventStatusManager
        
        # Get events based on filter - Only allow upcoming and ongoing for client side
        filter = filter.lower()
        if filter not in ["upcoming", "ongoing", "all"]:
            filter = "upcoming"  # Default to upcoming for students
        
        if filter == "all":
            # For client side, "all" means upcoming + ongoing (exclude completed)
            upcoming_events = await EventStatusManager.get_available_events("upcoming")
            ongoing_events = await EventStatusManager.get_available_events("ongoing")
            events = upcoming_events + ongoing_events
        else:
            # Get specific type of events (upcoming or ongoing only)
            events = await EventStatusManager.get_available_events(filter)        # Convert datetime strings to datetime objects for sorting and processing
        current_date = datetime.now()
        
        for i, event in enumerate(events):
            for date_field in ["start_datetime", "end_datetime", "registration_start_date", "registration_end_date"]:
                value = event.get(date_field)
                
                if isinstance(value, str):
                    try:
                        event[date_field] = datetime.fromisoformat(value.replace('Z', '+00:00'))
                    except (ValueError, AttributeError) as e:
                        event[date_field] = current_date  # Fallback to current date                elif value is None:
                    event[date_field] = current_date  # Handle None values
        
        # Sort events with safe key function
        def safe_sort_key(event, field):
            value = event.get(field, current_date)
            # Always return a datetime object
            if isinstance(value, datetime):
                return value
            elif isinstance(value, str):
                try:
                    result = datetime.fromisoformat(value.replace('Z', '+00:00'))
                    return result
                except (ValueError, AttributeError):
                    return current_date
            else:
                return current_date
        
        # Sort events
        try:
            if filter in ["upcoming", "all"]:
                # For upcoming events or all events, sort by start date
                events.sort(key=lambda x: safe_sort_key(x, 'start_datetime'))
            elif filter == "ongoing":
                # For ongoing events, sort by end date
                events.sort(key=lambda x: safe_sort_key(x, 'end_datetime'))
        except Exception as sort_error:
            logger.warning(f"Error sorting events: {sort_error}")
            # Don't sort if there's an error
            pass
            
        # Get all events to calculate dynamic filter categories
        try:
            all_upcoming = await EventStatusManager.get_available_events("upcoming")
            all_ongoing = await EventStatusManager.get_available_events("ongoing")
            all_events = all_upcoming + all_ongoing
            
            # Convert datetime strings to datetime objects for all events
            for event in all_events:
                for date_field in ["start_datetime", "end_datetime", "registration_start_date", "registration_end_date"]:
                    if isinstance(event.get(date_field), str):
                        try:
                            event[date_field] = datetime.fromisoformat(event[date_field].replace('Z', '+00:00'))
                        except (ValueError, AttributeError):
                            event[date_field] = current_date  # Fallback to current date                elif event.get(date_field) is None:
                    event[date_field] = current_date  # Handle None values
            
            # Calculate event type counts
            event_type_counts = {}
            for event in all_events:
                event_type = event.get('event_type', 'other').lower()
                event_type_counts[event_type] = event_type_counts.get(event_type, 0) + 1
        except Exception as counts_error:
            logger.warning(f"Error calculating event type counts: {counts_error}")
            event_type_counts = {}
            
        # Get template context
        template_context = await get_template_context(request)
          # Ensure all datetime objects in template_context are serialized
        serialized_template_context = {}
        for key, value in template_context.items():
            if isinstance(value, datetime):
                serialized_template_context[key] = value.isoformat()
            else:
                serialized_template_context[key] = value

        # Convert datetime objects to ISO format strings for template
        serialized_events = []
        for event in events:
            serialized_event = {}
            for key, value in event.items():
                try:                    
                    if isinstance(value, datetime):
                        serialized_event[key] = value.isoformat()
                    else:
                        serialized_event[key] = value
                except Exception as serialize_error:
                    serialized_event[key] = str(value)  # Fallback to string conversion
            serialized_events.append(serialized_event)
        # Ensure all template values are properly serialized
        current_datetime_str = datetime.now().isoformat()
        
        return templates.TemplateResponse(
            "client/events.html",
            {
                "request": request,
                "events": serialized_events,                "filter": filter,
                "current_datetime": current_datetime_str,
                "event_type_counts": event_type_counts,
                **serialized_template_context
            }
        )
    except Exception as e:
        print(f"Error in client events: {str(e)}")
        # Ensure consistent datetime serialization in error case
        current_datetime_str = datetime.now().isoformat()
        # Get template context for error case
        template_context = await get_template_context(request)
        return templates.TemplateResponse(
            "client/events.html",
            {
                "request": request,
                "events": [],
                "filter": filter,
                "current_datetime": current_datetime_str,
                "error": str(e),
                **template_context
            }
        )

@router.get("/events/{event_id}")
async def event_details(request: Request, event_id: str):
    """View details of a specific event"""
    try:
        from utils.event_status_manager import EventStatusManager
        from models.event import Event, EventSubStatus
        
        # Get event details and convert to Event model
        event_data = await DatabaseOperations.find_one(
            "events", 
            {"event_id": event_id}
        )
        if not event_data:
            raise HTTPException(status_code=404, detail="Event not found")
              # Check if student is logged in
        try:
            student = await get_current_student_optional(request)
            is_student_logged_in = student is not None
            student_data = student.model_dump() if student else None
        except:
            is_student_logged_in = False
            student_data = None
            
        # Convert string dates to datetime objects
        for date_field in ["start_datetime", "end_datetime", "registration_start_date", "registration_end_date",
                          "certificate_start_date", "certificate_end_date"]:
            if isinstance(event_data.get(date_field), str):
                event_data[date_field] = datetime.fromisoformat(event_data[date_field].replace('Z', '+00:00'))
          # Create Event model (status will be updated in get_event_timeline)
        try:
            # First try with normalization of attendances
            event = Event(**event_data)
        except Exception as e:
            print(f"Error creating Event model: {str(e)}")
            # If there's a validation error, try to fix the attendances field
            if "attendances" in event_data:
                fixed_attendances = {}
                for att_id, att_value in event_data["attendances"].items():
                    if isinstance(att_value, str):
                        # Convert string to dictionary
                        fixed_attendances[att_id] = {
                            "enrollment_no": att_value,
                            "marked_at": datetime.now().isoformat(),
                            "status": "present"
                        }
                    else:
                        fixed_attendances[att_id] = att_value
                event_data["attendances"] = fixed_attendances
            
            # Try again with fixed data
            event = Event(**event_data)
            
            # Also update database with fixed data
            await DatabaseOperations.update_one(
                "events",
                {"event_id": event_id},
                {"$set": {"attendances": event_data["attendances"]}}
            )

        # Get timeline (this also updates status)
        timeline = await EventStatusManager.get_event_timeline(event)
            
        # Get available forms (status already updated)  
        available_forms = event.get_available_forms()

        # Calculate registration time remaining
        registration_time_remaining = None
        if "registration" in available_forms:
            current_date = datetime.now()
            time_diff = event.registration_end_date - current_date
            if time_diff.days > 0:
                registration_time_remaining = f"{time_diff.days} days"
            elif time_diff.seconds > 3600:
                hours = time_diff.seconds // 3600
                registration_time_remaining = f"{hours} hours"
            else:
                registration_time_remaining = "Less than 1 hour"

        # Calculate event duration
        event_duration = None
        if event.start_datetime and event.end_datetime:
            duration = event.end_datetime - event.start_datetime
            if duration.days > 0:
                event_duration = f"{duration.days} days"
            else:
                hours = duration.seconds // 3600
                minutes = (duration.seconds % 3600) // 60
                if hours > 0:
                    event_duration = f"{hours}h {minutes}m"
                else:
                    event_duration = f"{minutes} minutes"

        # Get registration statistics
        registration_stats = {
            "total_registrations": 0,
            "available_spots": None,
            "waiting_list": 0
        }

        try:
            # Use event-specific database for registrations
            event_collection = await Database.get_event_collection(event_id)
            if event_collection is not None:
                cursor = event_collection.find({})
                registrations = await cursor.to_list(length=None)
                registration_stats["total_registrations"] = len(registrations)
                
                # Calculate available spots if there's a limit
                if event_data.get('registration_limit'):
                    registration_stats["available_spots"] = max(0, event_data['registration_limit'] - registration_stats["total_registrations"])
                    if registration_stats["total_registrations"] > event_data['registration_limit']:
                        registration_stats["waiting_list"] = registration_stats["total_registrations"] - event_data['registration_limit']
        except Exception as e:
            print(f"Could not fetch registration stats: {e}")

        # Check if registration is possible (FIXED: compare with .value)
        can_register = (
            event.sub_status == EventSubStatus.REGISTRATION_OPEN.value and
            (not event_data.get('registration_limit') or registration_stats["available_spots"] > 0)
        )

        # Determine registration status for template (FIXED: compare with .value)
        if event.sub_status == EventSubStatus.REGISTRATION_NOT_STARTED.value:
            registration_status = "not_started"
        elif event.sub_status == EventSubStatus.REGISTRATION_OPEN.value:
            registration_status = "open"
        elif event.sub_status in [EventSubStatus.REGISTRATION_CLOSED.value, EventSubStatus.EVENT_STARTED.value, EventSubStatus.EVENT_ENDED.value, EventSubStatus.CERTIFICATE_AVAILABLE.value, EventSubStatus.EVENT_COMPLETED.value]:
            registration_status = "ended"
        else:
            registration_status = "ended"  # Default fallback

        # Process contact information
        event_contacts = []
        if event_data.get('contacts'):
            for contact in event_data['contacts']:
                contact_info = contact.get('contact', '')
                email = phone = None

                if '@' in contact_info and '.' in contact_info:
                    email = contact_info
                elif any(char.isdigit() for char in contact_info):
                    cleaned_phone = ''.join(filter(str.isdigit, contact_info))
                    if len(cleaned_phone) >= 10:
                        phone = contact_info

                event_contacts.append({
                    'name': contact.get('name', ''),
                    'role': None,
                    'email': email,
                    'phone': phone
                })

        # Add timeline, contacts and other details to event data
        event_data.update({
            'event_contacts': event_contacts,
            'timeline': timeline,
            'available_forms': available_forms,
            'status': event.status,
            'sub_status': event.sub_status,
        })        # Convert datetime objects to ISO format strings for template
        serialized_event_data = {}
        for key, value in event_data.items():
            if isinstance(value, datetime):
                serialized_event_data[key] = value.isoformat()
            else:
                serialized_event_data[key] = value

        return templates.TemplateResponse(
            "client/event_details.html", 
            {
                "request": request,
                "event": serialized_event_data,
                "timeline": timeline,
                "available_forms": available_forms,
                "registration_time_remaining": registration_time_remaining,
                "event_duration": event_duration,
                "registration_stats": registration_stats,
                "registration_status": registration_status,
                "can_register": can_register,
                "is_student_logged_in": is_student_logged_in,
                "student_data": student_data
            }
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error in event_details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Event registration routes have been moved to event_registration.py for better organization
# and proper authentication handling

# Event registration submission has been moved to event_registration.py for better organization
# and proper authentication handling

# Student Authentication Functions
async def authenticate_student(enrollment_no: str, password: str) -> Student:
    """Authenticate student using enrollment number and password"""
    # Check if student exists in the students collection with correct password
    student = await DatabaseOperations.find_one(
        "students", 
        {
            "enrollment_no": enrollment_no,
            "is_active": True
        }
    )
    
    if student and Student.verify_password(password, student.get("password_hash", "")):
        return Student(**student)
    
    return None

# Student Login Routes
@router.get("/login")
async def student_login_page(request: Request):
    """Show student login page"""
    template_context = await get_template_context(request)
    # Check if admin tab is requested via query parameter
    tab = request.query_params.get("tab", "student")
    return templates.TemplateResponse(
        "auth/login.html",
        {
            "request": request,
            "active_tab": tab,
            **template_context
        }
    )

@router.post("/login")
async def student_login(request: Request):
    """Handle student login"""
    form_data = await request.form()
    enrollment_no = form_data.get("enrollment_no")
    password = form_data.get("password")
    redirect_url = form_data.get("redirect", "/client/dashboard")
    
    print(f"[DEBUG] Login attempt for: {enrollment_no} with redirect to: {redirect_url}")    # Validate required fields
    if not all([enrollment_no, password]):
        print("[DEBUG] Missing enrollment or password")
        template_context = await get_template_context(request)
        return templates.TemplateResponse(
            "auth/login.html",
            {
                "request": request,
                "error": "Both enrollment number and password are required",
                "form_data": form_data,
                "active_tab": "student",
                **template_context
            },
            status_code=400
        )
      # Authenticate student
    student = await authenticate_student(enrollment_no, password)
    if not student:
        print(f"[DEBUG] Authentication failed for {enrollment_no}")
        template_context = await get_template_context(request)
        return templates.TemplateResponse(
            "auth/login.html",
            {
                "request": request,
                "error": "Invalid enrollment number or password. Please try again.",
                "form_data": form_data,
                "active_tab": "student",
                **template_context
            },
            status_code=401
        )
    
    print(f"[DEBUG] Authentication successful for {enrollment_no}")
    
    # Update last login time
    await DatabaseOperations.update_one(
        "students",
        {"enrollment_no": enrollment_no},
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    # Convert student data to dict and serialize datetime objects
    student_data = student.model_dump()
    for key, value in student_data.items():
        if isinstance(value, datetime):
            student_data[key] = value.isoformat()
        elif isinstance(value, ObjectId):
            student_data[key] = str(value)
      # Store student in session
    request.session["student"] = student_data
    request.session["student_enrollment"] = enrollment_no
    
    print(f"[DEBUG] Session data set. Keys in session: {list(request.session.keys())}")
    print(f"[DEBUG] Redirecting to {redirect_url}")
      # Use status code 303 (See Other) for redirect after successful login
    # This ensures the browser doesn't use cache for the login page when navigating back
    response = RedirectResponse(url=redirect_url, status_code=303)
    
    # Add cache control headers to prevent caching login page
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    
    return response

@router.get("/logout") 
async def student_logout(request: Request):
    """Handle student logout"""
    # Clear all session data
    request.session.clear()
    
    # Create a response that redirects to events page
    response = RedirectResponse(url="/client/events", status_code=303)
    
    # Add cache control headers to prevent caching
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    
    return response

@router.get("/dashboard")
async def student_dashboard(request: Request):
    """Student dashboard showing their registrations and event history"""
    print(f"[DEBUG] Dashboard access attempt. Keys in session: {list(request.session.keys())}")
    print(f"[DEBUG] Student enrollment in session: {request.session.get('student_enrollment')}")
    
    try:
        student = await get_current_student(request)
        print(f"[DEBUG] Student successfully retrieved from session: {student.enrollment_no}")
    except HTTPException as e:
        print(f"[DEBUG] Error retrieving student from session: {str(e)}")
        return RedirectResponse(url="/client/login", status_code=302)
    
    # Handle flash messages from URL parameters
    success_msg = request.query_params.get("success")
    error_msg = request.query_params.get("error")
    event_name = request.query_params.get("event_name", "Event")
    flash_messages = []
    if success_msg == "registration_cancelled":
        flash_messages.append(("success", f"Successfully cancelled registration for {event_name}"))
    elif success_msg == "Profile updated successfully!" or success_msg == "profile_updated":
        flash_messages.append(("success", "Profile updated successfully!"))
    elif error_msg == "not_registered":
        flash_messages.append(("error", "You are not registered for this event"))
    elif error_msg == "event_not_found":
        flash_messages.append(("error", "Event not found"))
    elif error_msg == "event_started":
        flash_messages.append(("error", "Cannot cancel registration - event has already started"))
    elif error_msg == "database_error":
        flash_messages.append(("error", "Database error occurred while cancelling registration"))
    elif error_msg == "registration_not_found":
        flash_messages.append(("error", "Registration record not found"))
    elif error_msg == "update_failed":
        flash_messages.append(("error", "Failed to update student record"))
    elif error_msg == "participant_cannot_cancel":
        flash_messages.append(("error", "Only team leaders can cancel team registrations. Please contact your team leader."))
    elif error_msg == "unexpected_error":
        flash_messages.append(("error", "An unexpected error occurred"))
      # Get student's registrations using the new event_participations system
    registrations = []
    
    # Get the student document from database to access event_participations
    student_doc = await DatabaseOperations.find_one("students", {"enrollment_no": student.enrollment_no})
    event_participations = student_doc.get("event_participations", {}) if student_doc else {}
      # Fetch event details for each registered event
    for event_id, participation in event_participations.items():
        # Get event details (show all registered events regardless of published status)
        event = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event:
            continue  # Skip if event not found
            
        # Convert datetime objects to ISO format strings in both event and participation
        serialized_event = {}
        for key, value in event.items():
            if isinstance(value, datetime):
                serialized_event[key] = value.isoformat()
            else:
                serialized_event[key] = value
                
        serialized_participation = {}
        for key, value in participation.items():
            if isinstance(value, datetime):
                serialized_participation[key] = value.isoformat()
            else:
                serialized_participation[key] = value
        
        # Explicitly set registration_type for ease of use in template
        registration_type = participation.get('registration_type', 'individual')
        serialized_participation['registration_type'] = registration_type
                
        registrations.append({
            "event": serialized_event,
            "registration": serialized_participation,  # Use participation data instead of separate registration
            "event_id": event_id
        })    # Convert student data to serializable format
    serialized_student = student.model_dump()

    # Handle created_at date specifically
    if "created_at" in serialized_student:
        created_at = serialized_student["created_at"]
        if isinstance(created_at, str):
            try:
                # Parse string to datetime if it's a string
                # Remove any timezone info to ensure consistent formatting
                created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                created_at = created_at.replace(tzinfo=None)  # Convert to naive datetime
            except ValueError:
                created_at = None
        elif isinstance(created_at, datetime):
            # If it's already a datetime, ensure it's naive
            created_at = created_at.replace(tzinfo=None)
        serialized_student["created_at"] = created_at

    # Convert other datetime fields to ISO format for template
    for key, value in serialized_student.items():
        if key != "created_at" and isinstance(value, datetime):
            serialized_student[key] = value.isoformat()
    
    return templates.TemplateResponse(
        "client/dashboard.html",
        {
            "request": request,
            "student": serialized_student,
            "registrations": registrations,
            "datetime": datetime,
            "flash_messages": flash_messages
        }
    )

# Student Profile Routes
@router.get("/profile/edit")
async def profile_edit_page(request: Request, student: Student = Depends(require_student_login)):
    """Show profile edit page"""
    # Convert datetime fields to strings for template
    student_data = student.model_dump()
    today = datetime.now().date().isoformat()
    
    return templates.TemplateResponse(
        "client/profile_edit.html",
        {
            "request": request,
            "student": student_data,
            "today": today
        }
    )

@router.post("/profile/edit")
async def profile_edit(request: Request, student: Student = Depends(require_student_login)):
    """Handle profile update"""
    try:
        form_data = await request.form()
        logger.info(f"Profile edit form submitted for {student.enrollment_no}")
        
        # Extract form data
        full_name = form_data.get("full_name", "").strip()
        mobile_no = form_data.get("mobile_no", "").strip()
        department = form_data.get("department", "").strip()
        semester = form_data.get("semester")
        gender = form_data.get("gender", "").strip()
        date_of_birth = form_data.get("date_of_birth", "").strip()
        new_password = form_data.get("new_password", "").strip()
        confirm_new_password = form_data.get("confirm_new_password", "").strip()
        
        # Validation
        errors = []
        
        if not full_name or len(full_name) < 2:
            errors.append("Valid full name is required")
            
        if not mobile_no or len(mobile_no) != 10 or not mobile_no.isdigit():
            errors.append("Valid 10-digit mobile number is required")
        
        # Password validation (only if user wants to change password)
        if new_password or confirm_new_password:
            if len(new_password) < 6:
                errors.append("New password must be at least 6 characters long")
            if new_password != confirm_new_password:
                errors.append("New passwords do not match")
        
        if errors:
            student_data = student.model_dump()
            today = datetime.now().date().isoformat()
            return templates.TemplateResponse(
                "client/profile_edit.html",
                {
                    "request": request,
                    "student": student_data,
                    "today": today,
                    "error": "; ".join(errors)
                }
            )
          # Get email from form
        email = form_data.get("email", "").strip().lower()
        
        # Validate email
        if not email or "@" not in email:
            errors.append("Valid email address is required")
        
        # Check if email is already taken by another student
        if email != student.email:  # Only check if email is different
            existing_student = await DatabaseOperations.find_one(
                "students",
                {
                    "email": email,
                    "enrollment_no": {"$ne": student.enrollment_no}  # Exclude current student
                }
            )
            if existing_student:
                errors.append("This email is already registered with another account")
        
        if errors:
            student_data = student.model_dump()
            today = datetime.now().date().isoformat()
            return templates.TemplateResponse(
                "client/profile_edit.html",
                {
                    "request": request,
                    "student": student_data,
                    "today": today,
                    "error": "; ".join(errors)
                }
            )
            
        # Prepare update data
        update_data = {
            "full_name": full_name,
            "email": email,
            "mobile_no": mobile_no,
        }
        
        # Add optional fields if provided
        if department:
            update_data["department"] = department
        if semester:
            update_data["semester"] = int(semester)
        if gender:
            update_data["gender"] = gender
        if date_of_birth:
            try:
                update_data["date_of_birth"] = datetime.strptime(date_of_birth, "%Y-%m-%d")
            except ValueError:
                pass  # Skip invalid date
        
        # Add password hash if changing password
        if new_password:
            update_data["password_hash"] = Student.hash_password(new_password)        # Update student in database
        result = await DatabaseOperations.update_one(
            "students",
            {"enrollment_no": student.enrollment_no},
            {"$set": update_data}
        )
        
        if result:
            # Update the student object in session
            updated_student = await DatabaseOperations.find_one(
                "students", 
                {"enrollment_no": student.enrollment_no}
            )
            
            if updated_student:
                # Remove ObjectId field before creating Student model
                if '_id' in updated_student:
                    del updated_student['_id']
                
                # Convert updated student data to serializable format
                from models.student import Student as StudentModel
                student_instance = StudentModel(**updated_student)
                student_data = student_instance.model_dump()
                
                # Serialize datetime objects and ObjectId to ISO strings
                for key, value in student_data.items():
                    if isinstance(value, datetime):
                        student_data[key] = value.isoformat()
                    elif isinstance(value, ObjectId):
                        student_data[key] = str(value)
                
                # Update session with serialized data
                request.session["student_enrollment"] = student.enrollment_no
                request.session["student"] = student_data
                
                return RedirectResponse(
                    url="/client/dashboard?success=Profile updated successfully!",
                    status_code=302
                )
        student_data = student.model_dump()
        today = datetime.now().date().isoformat()
        return templates.TemplateResponse(
            "client/profile_edit.html",
            {
                "request": request,
                "student": student_data,
                "today": today,
                "error": "Failed to update profile. Please try again."
            }
        )
        
    except Exception as e:
        print(f"Profile update error: {e}")
        student_data = student.model_dump()
        today = datetime.now().date().isoformat()
        return templates.TemplateResponse(
            "client/profile_edit.html",
            {
                "request": request,
                "student": student_data,
                "today": today,
                "error": "An error occurred while updating your profile. Please try again."
            }
        )

# Student Registration Routes
@router.get("/register")
async def student_register_page(request: Request):
    """Show student registration page"""
    template_context = await get_template_context(request)
    return templates.TemplateResponse(
        "auth/register.html",
        {
            "request": request,
            **template_context
        }
    )

@router.post("/register")
async def student_register(request: Request):
    """Handle student registration"""
    try:
        form_data = await request.form()
          # Extract form data
        enrollment_no = form_data.get("enrollment_no", "").strip().upper()
        full_name = form_data.get("full_name", "").strip()
        email = form_data.get("email", "").strip().lower()
        mobile_no = form_data.get("mobile_no", "").strip()
        password = form_data.get("password", "")
        confirm_password = form_data.get("confirm_password", "").strip()
        department = form_data.get("department", "").strip()
        semester = form_data.get("semester")
        gender = form_data.get("gender", "").strip()
        date_of_birth = form_data.get("date_of_birth", "").strip()
        
        # Validation
        errors = []
        
        if not enrollment_no or not re.match(r'^\d{2}[A-Z]{2,4}\d{5}$', enrollment_no):
            errors.append("Invalid enrollment number format (e.g., 21BECE40015)")
            
        if not full_name or len(full_name) < 2:
            errors.append("Valid full name is required")
            
        if not email or "@" not in email:
            errors.append("Valid email address is required")
            
        if not mobile_no or len(mobile_no) != 10 or not mobile_no.isdigit():
            errors.append("Valid 10-digit mobile number is required")
            
        # Enhanced password validation
        if not password or len(password) < 6:
            errors.append("Password must be at least 6 characters long")
        if not any(c in "!@#$%^&*" for c in password):
            errors.append("Password must contain at least one special character")
        if not any(c.isdigit() for c in password):
            errors.append("Password must contain at least one number")            
        if password != confirm_password:
            errors.append("Passwords do not match")
        
        # Gender validation
        if not gender:
            errors.append("Gender is required")
        elif gender not in ["Male", "Female", "Other", "Prefer not to say"]:
            errors.append("Please select a valid gender option")
        
        # Date of birth validation
        if not date_of_birth:
            errors.append("Date of birth is required")
        else:
            try:
                birth_date = datetime.strptime(date_of_birth, '%Y-%m-%d')
                today = datetime.now()
                age = today.year - birth_date.year
                
                # Adjust age if birthday hasn't occurred this year
                if today.month < birth_date.month or (today.month == birth_date.month and today.day < birth_date.day):
                    age -= 1
                if age < 15:
                    errors.append("You must be at least 15 years old to register")
                elif age > 100:
                    errors.append("Please enter a valid date of birth")
            except ValueError:
                errors.append("Please enter a valid date of birth")        
        if errors:
            template_context = await get_template_context(request)
            return templates.TemplateResponse(
                "auth/register.html",
                {
                    "request": request,
                    "error": "; ".join(errors),
                    "form_data": form_data,
                    **template_context
                },
                status_code=400
            )
        
        # Check if student already exists
        existing_student = await DatabaseOperations.find_one(
            "students", 
            {"$or": [
                {"enrollment_no": enrollment_no},
                {"email": email},
                {"mobile_no": mobile_no}
            ]}
        )        
        if existing_student:
            if existing_student.get("enrollment_no") == enrollment_no:
                errors.append("Student with this enrollment number already exists")
            elif existing_student.get("email") == email:
                errors.append("Student with this email already exists")
            elif existing_student.get("mobile_no") == mobile_no:
                errors.append("Student with this mobile number already exists")
        if errors:
            template_context = await get_template_context(request)
            return templates.TemplateResponse(
                "auth/register.html",
                {
                    "request": request,
                    "error": "; ".join(errors),
                    "form_data": form_data,
                    **template_context
                },
                status_code=400
            )
        
        # Hash the password
        password_hash = Student.hash_password(password)
          # Create student record
        student_data = {
            "enrollment_no": enrollment_no,
            "full_name": full_name,
            "email": email,
            "mobile_no": mobile_no,
            "password_hash": password_hash,
            "department": department if department else None,
            "semester": int(semester) if semester else None,
            "gender": gender,
            "date_of_birth": datetime.strptime(date_of_birth, '%Y-%m-%d'),
            "is_active": True,
            "created_at": datetime.utcnow(),
            "last_login": None
        }
        
        # Save to database
        result = await DatabaseOperations.insert_one("students", student_data)
        if result:
            template_context = await get_template_context(request)
            return templates.TemplateResponse(
                "auth/register.html",
                {
                    "request": request,
                    "success": "Account created successfully! You can now login with your credentials.",
                    **template_context
                }
            )
        else:
            template_context = await get_template_context(request)
            return templates.TemplateResponse(
                "auth/register.html",
                {
                    "request": request,
                    "error": "Failed to create account. Please try again.",
                    "form_data": form_data,
                    **template_context
                },status_code=500
            )
            
    except Exception as e:
        print(f"Registration error: {e}")
        template_context = await get_template_context(request)
        return templates.TemplateResponse(
            "auth/register.html",
            {
                "request": request,
                "error": "An error occurred during registration. Please try again.",
                "form_data": form_data if 'form_data' in locals() else {},
                **template_context
            },
            status_code=500
        )

@router.get("/registration-not-started")
async def registration_not_started(request: Request):
    """Display registration not started page"""
    context = await get_template_context(request)
    context["request"] = request
    return templates.TemplateResponse(
        "client/registration_not_started.html",
        context
    )

# Certificate download route - Updated for JavaScript implementation
@router.get("/events/{event_id}/certificate")
async def download_certificate(request: Request, event_id: str, student: Student = Depends(require_student_login)):
    """Download certificate for completed events - requires student login and feedback submission"""
    # Get feedback_submitted from query parameters
    feedback_submitted = request.query_params.get("feedback_submitted", "").lower() == "true"
    
    try:
        from utils.event_status_manager import EventStatusManager
        from models.event import Event, EventSubStatus
        from utils.js_certificate_generator import validate_certificate_eligibility
        
        # Get event details with updated status from EventStatusManager
        event = await EventStatusManager.get_event_by_id(event_id)
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Check if certificates are available
        if event.get('sub_status') != EventSubStatus.CERTIFICATE_AVAILABLE.value:
            raise HTTPException(
                status_code=400, 
                detail="Certificates are not available for this event at this time"
            )
        
        # Import settings for debug flag
        from config.settings import settings
        
        # Validate certificate eligibility using the new utility
        is_eligible, eligibility_message = await validate_certificate_eligibility(event_id, student.enrollment_no)
        
        if not is_eligible:
            return templates.TemplateResponse(
                "client/certificate_download.html",
                {
                    "request": request,
                    "event": event,
                    "student": student,
                    "error": eligibility_message,
                    "is_student_logged_in": True,
                    "student_data": student.model_dump(),
                    "config": {"DEBUG": settings.DEBUG}
                }
            )
        
        # Check if student is registered for this event and has attended using the new data structure
        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": student.enrollment_no})
        if not student_data:
            return templates.TemplateResponse(
                "client/certificate_download.html",
                {
                    "request": request,
                    "event": event,
                    "student": student,
                    "error": "Student data not found",
                    "is_student_logged_in": True,
                    "student_data": student.model_dump(),
                    "config": {"DEBUG": settings.DEBUG}
                }
            )
        
        # Check event participation in the student record
        event_participations = student_data.get('event_participations', {})
        participation = event_participations.get(event_id)
        
        if not participation:
            return templates.TemplateResponse(
                "client/certificate_download.html",
                {
                    "request": request,
                    "event": event,
                    "student": student,
                    "error": "You must be registered for this event to download a certificate",
                    "is_student_logged_in": True,
                    "student_data": student.model_dump(),
                    "config": {"DEBUG": settings.DEBUG}
                }
            )
        
        # Check for attendance - must have attendance record
        if not participation.get('attendance_id'):
            return templates.TemplateResponse(
                "client/certificate_download.html",
                {
                    "request": request,
                    "event": event,
                    "student": student,
                    "error": "You must have attended this event to download a certificate",
                    "is_student_logged_in": True,
                    "student_data": student.model_dump(),
                    "config": {"DEBUG": settings.DEBUG}
                }
            )
        
        # Check for feedback submission - must have feedback record
        if not participation.get('feedback_id') and not feedback_submitted:
            return RedirectResponse(
                url=f"/client/events/{event_id}/feedback",
                status_code=303,
            )
        
        # Get team information for team-based events
        team_info = None
        if event.get('registration_mode', '').lower() == 'team':
            student_data_in_participation = participation.get('student_data', {})
            team_name = student_data_in_participation.get('team_name')
            
            if team_name:
                team_info = {
                    'team_name': team_name,
                    'team_id': participation.get('team_registration_id')
                }
        
        # Check if certificate already exists
        certificate_id = participation.get('certificate_id')
        
        # If no certificate yet, generate one
        if not certificate_id:
            from utils.id_generator import generate_certificate_id
            
            # Generate a new certificate ID
            certificate_id = generate_certificate_id(student.enrollment_no, event_id, student_data.get("full_name", ""))
            
            # Update student's event participation with the certificate ID
            await DatabaseOperations.update_one(
                "students",
                {"enrollment_no": student.enrollment_no},
                {"$set": {f"event_participations.{event_id}.certificate_id": certificate_id}}
            )
            
            # Also update event's certificates record
            await DatabaseOperations.update_one(
                "events",
                {"event_id": event_id},
                {"$set": {f"certificates.{certificate_id}": student.enrollment_no}}
            )
        
        # Create certificate data for the template
        certificate = {
            "certificate_id": certificate_id,
            "full_name": student_data.get("full_name", ""),
            "event_name": event.get("event_name", ""),
            "issue_date": datetime.now().strftime("%d %B %Y"),
            "event_date": event.get("start_date", "").strftime("%d %B %Y") if event.get("start_date") else ""
        }
        
        # Create registration and attendance objects for template compatibility
        registration = {
            "registrar_id": participation.get('registration_id'),
            "full_name": student_data.get("full_name", ""),
            "email": student_data.get("email", ""),
        }
        
        attendance = {
            "attendance_id": participation.get('attendance_id')
        }
        
        # Import settings for debug flag
        from config.settings import settings
        
        # Return certificate download page with validated=True
        return templates.TemplateResponse(
            "client/certificate_download.html",
            {
                "request": request,
                "event": event,
                "student": student,
                "certificate": certificate,
                "registration": registration,
                "attendance": attendance,
                "team_info": team_info,
                "validated": True,  # All requirements are met
                "is_student_logged_in": True,
                "student_data": student.model_dump(),
                "message": "Your certificate is ready for download!",
                "config": {"DEBUG": settings.DEBUG}  # Add config for debug section
            }
        )
        
    except HTTPException as he:
        if he.status_code == status.HTTP_401_UNAUTHORIZED:
            # Redirect to login with return URL
            return RedirectResponse(
                url=f"/client/login?redirect={request.url.path}",
                status_code=302
            )
        raise he
    except Exception as e:
        print(f"Error in download_certificate: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Old certificate route - replaced by clean JavaScript implementation
# Use /client/certificate/download/{event_id} for new clean implementation

@router.post("/events/{event_id}/certificate/download")
async def download_certificate_post(request: Request, event_id: str, student: Student = Depends(require_student_login)):
    """POST route for certificate download - fallback for JavaScript generator"""
    try:
        # This is a fallback route for the JavaScript certificate generator
        # Redirect to the GET route which handles the main certificate download logic
        return RedirectResponse(
            url=f"/client/events/{event_id}/certificate",
            status_code=303
        )
    except Exception as e:
        logger.error(f"Error in certificate download POST: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/validate-registration")
async def validate_registration_api(request: Request, registration_id: str, event_id: str, student: Student = Depends(require_student_login)):
    """API endpoint to validate registration ID and return student details for auto-filling"""
    try:
        # Get student data
        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": student.enrollment_no})
        if not student_data:
            return {"success": False, "message": "Student data not found"}
        
        # Check event_participations for this event
        event_participations = student_data.get('event_participations', {})
        if event_id not in event_participations:
            return {"success": False, "message": "You are not registered for this event"}
        
        # Get participation data
        participation = event_participations[event_id]
        student_registration_id = participation.get('registration_id')
        
        # Verify registration_id matches
        if not student_registration_id:
            return {"success": False, "message": "Registration ID not found"}
        
        if student_registration_id.upper() != registration_id.upper():
            return {"success": False, "message": f"Invalid registration ID. Your registration ID is: {student_registration_id}"}
        
        # Check if attendance already marked
        existing_attendance_id = participation.get('attendance_id')
        if existing_attendance_id:
            return {"success": False, "message": "Attendance already marked for this event"}
        
        # Return student details for auto-filling
        student_details = {
            "enrollment_no": student.enrollment_no,
            "full_name": student_data.get("full_name", ""),
            "email": student_data.get("email", ""),
            "mobile_no": student_data.get("mobile_no", ""),
            "department": student_data.get("department", ""),
            "semester": student_data.get("semester", ""),
            "registration_type": participation.get("registration_type", "individual"),
            "registration_id": student_registration_id
        }
        
        return {
            "success": True,
            "student": student_details,
            "message": "Registration validated successfully"
        }
        
    except Exception as e:
        print(f"Error in validate_registration_api: {str(e)}")
        return {"success": False, "message": "An error occurred while validating registration"}
   

# Add debug route for testing authentication
@router.get("/debug/auth")
async def debug_auth_route(request: Request):
    """Debug endpoint to check authentication state"""
    
    print("=== DEBUG AUTH ENDPOINT ===")
    print(f"Session keys: {list(request.session.keys())}")
    print(f"Session data: {dict(request.session)}")
    
    # Test our auth function
    try:
        student = await get_current_student_optional(request)
        print(f"get_current_student_optional result: {student}")
        is_logged_in_auth = student is not None
        student_data_auth = student.model_dump() if student else None
    except Exception as e:
        print(f"Error with get_current_student_optional: {e}")
        is_logged_in_auth = False
        student_data_auth = None
    
    # Test template context utility
    try:
        template_context = await get_template_context(request)
        print(f"Template context: {template_context}")
        is_logged_in_template = template_context.get("is_student_logged_in", False)
        student_data_template = template_context.get("student_data")
    except Exception as e:
        print(f"Error with get_template_context: {e}")
        is_logged_in_template = False
        student_data_template = None
    
    debug_info = {
        "session_keys": list(request.session.keys()),
        "session_has_student": "student" in request.session,
        "session_has_student_enrollment": "student_enrollment" in request.session,
        "auth_function_logged_in": is_logged_in_auth,
        "template_context_logged_in": is_logged_in_template,
        "auth_student_data": str(student_data_auth),
        "template_student_data": str(student_data_template),
    }
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Authentication Debug</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 20px; }}
            .debug-section {{ margin: 20px 0; padding: 15px; border: 1px solid #ccc; }}
            .true {{ color: green; font-weight: bold; }}
            .false {{ color: red; font-weight: bold; }}
            pre {{ background: #f5f5f5; padding: 10px; overflow-x: auto; }}
        </style>
    </head>
    <body>
        <h1>Authentication Debug Information</h1>
        
        <div class="debug-section">
            <h2>Session Information</h2>
            <p>Session Keys: {debug_info['session_keys']}</p>
            <p>Has 'student' key: <span class="{'true' if debug_info['session_has_student'] else 'false'}">{debug_info['session_has_student']}</span></p>
            <p>Has 'student_enrollment' key: <span class="{'true' if debug_info['session_has_student_enrollment'] else 'false'}">{debug_info['session_has_student_enrollment']}</span></p>
        </div>
        
        <div class="debug-section">
            <h2>Authentication Function Results</h2>
            <p>get_current_student_optional logged in: <span class="{'true' if debug_info['auth_function_logged_in'] else 'false'}">{debug_info['auth_function_logged_in']}</span></p>
            <p>Student data: {debug_info['auth_student_data']}</p>
        </div>
        
        <div class="debug-section">
            <h2>Template Context Results</h2>
            <p>Template context logged in: <span class="{'true' if debug_info['template_context_logged_in'] else 'false'}">{debug_info['template_context_logged_in']}</span></p>
            <p>Student data: {debug_info['template_student_data']}</p>
        </div>
        
        <div class="debug-section">
            <h2>Test Links</h2>
            <p><a href="/client/events">Go to Events Page</a></p>
            <p><a href="/client/login">Go to Login Page</a></p>
            <p><a href="/client/logout">Logout</a></p>
        </div>    </body>
    </html>
    """
    
    return HTMLResponse(content=html_content)


# JavaScript Certificate Generator API Endpoints
# Note: Certificate API endpoints moved to certificate_api.py router

@router.get("/certificate/download/{event_id}")
async def certificate_download_clean(
    request: Request, 
    event_id: str,
    current_student: Student = Depends(get_current_student)
):
    """
    Certificate download page for clean JavaScript implementation
    """
    try:
        from utils.js_certificate_generator import validate_certificate_eligibility
        from config.settings import settings
        
        # Get event details using DatabaseOperations
        event = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
            
        # Validate certificate eligibility
        enrollment_no = current_student.enrollment_no
        is_eligible, eligibility_message = await validate_certificate_eligibility(event_id, enrollment_no)
        
        if not is_eligible:
            context = await get_template_context(request)
            context.update({
                'event': event,
                'error': eligibility_message,
                'page_title': f'Certificate Not Available - {event.get("event_name", "Event")}',
                'config': {"DEBUG": settings.DEBUG}
            })
            return templates.TemplateResponse("client/certificate_download.html", context)
            
        # Check if student is registered for this event by looking at participations
        student_doc = await DatabaseOperations.find_one("students", {"enrollment_no": enrollment_no})
        if not student_doc:
            raise HTTPException(status_code=404, detail="Student not found")
            
        participations = student_doc.get("event_participations", {})
        participation = participations.get(event_id)
        
        if not participation:
            raise HTTPException(status_code=403, detail="You are not registered for this event")
            
        # Get team information for team-based events
        team_info = None
        if event.get('registration_mode', '').lower() == 'team':
            # Check if there's team data in the participation
            student_data = participation.get('student_data', {})
            team_name = student_data.get('team_name')
            
            if team_name:
                team_info = {
                    'team_name': team_name,
                    'team_id': participation.get('team_registration_id')
                }
                
        # Create certificate data if it doesn't exist
        certificate_id = participation.get('certificate_id')
        if not certificate_id:
            from utils.id_generator import generate_certificate_id
            certificate_id = generate_certificate_id(enrollment_no, event_id, student_doc.get("full_name", ""))
            
            # Update student's event participation with the certificate ID
            await DatabaseOperations.update_one(
                "students",
                {"enrollment_no": enrollment_no},
                {"$set": {f"event_participations.{event_id}.certificate_id": certificate_id}}
            )
                
        # Prepare template context
        context = await get_template_context(request)
        context.update({
            'event': event,
            'team_info': team_info,
            'page_title': f'Download Certificate - {event.get("event_name", "Event")}',
            'config': {"DEBUG": settings.DEBUG},
            'certificate': {'certificate_id': certificate_id},
            'validated': True  # Certificate is available for download
        })
        
        return templates.TemplateResponse("client/certificate_download.html", context)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in certificate download page: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/api/certificate-template/{event_id}")
async def get_certificate_template(event_id: str, current_student: Student = Depends(get_current_student)):
    """API endpoint to get certificate template content and placeholder data"""
    try:
        from pathlib import Path
        
        # Get event data
        event_data = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event_data:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Get student data
        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": current_student.enrollment_no})
        if not student_data:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Check if student is registered for this event
        event_participations = student_data.get('event_participations', {})
        if event_id not in event_participations:
            raise HTTPException(status_code=403, detail="Student not registered for this event")
        
        participation = event_participations[event_id]
        
        # Get certificate template path
        certificate_template = event_data.get('certificate_template')
        if not certificate_template:
            return {"success": False, "message": "No certificate template configured for this event"}
        
        # Construct the full template path
        template_path = Path(certificate_template)
        
        # Check if the file exists
        if not template_path.exists():
            logger.error(f"Certificate template not found: {template_path}")
            return {"success": False, "message": f"Certificate template file not found: {certificate_template}"}
        
        # Read the template content
        try:
            with open(template_path, 'r', encoding='utf-8') as file:
                template_content = file.read()
        except Exception as read_error:
            logger.error(f"Error reading template file: {str(read_error)}")
            return {"success": False, "message": f"Error reading template file: {str(read_error)}"}
        
        # Prepare placeholder data
        placeholder_data = {
            "participant_name": student_data.get("full_name", ""),
            "department_name": student_data.get("department", ""),
            "event_name": event_data.get("event_name", ""),
            "event_date": event_data.get("start_datetime", ""),
            "certificate_id": participation.get("certificate_id", "")
        }
        
        # Add team name for team-based events
        if event_data.get('registration_mode', '').lower() == 'team':
            student_data_in_participation = participation.get('student_data', {})
            team_name = student_data_in_participation.get('team_name')
            if team_name:
                placeholder_data["team_name"] = team_name
        
        return {
            "success": True,
            "message": "Certificate template loaded successfully",
            "template_content": template_content,
            "placeholder_data": placeholder_data,
            "template_path": str(template_path)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading certificate template: {str(e)}")
        return {"success": False, "message": f"Error loading certificate template: {str(e)}"}

# Test endpoint to verify API routing
@router.get("/test-api")
async def test_api():
    """Simple test endpoint to verify API routing works"""
    return {"success": True, "message": "API routing is working"}

@router.get("/api/auth/status")
async def auth_status(request: Request, student: Student = Depends(get_current_student_optional)):
    """API endpoint to check if student is authenticated"""
    try:
        if student:
            return {
                "authenticated": True,
                "student": {
                    "enrollment_no": student.enrollment_no,
                    "full_name": student.full_name,
                    "email": student.email
                }
            }
        else:
            return {"authenticated": False}
    except Exception as e:
        logger.error(f"Error in auth status: {str(e)}")
        return {"authenticated": False, "error": str(e)}

@router.get("/events/{event_id}/mark-attendance")
async def mark_attendance_form(request: Request, event_id: str, student: Student = Depends(require_student_login)):
    """Show attendance marking form for students"""
    try:        # Fetch event details
        event = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Check if student is registered for this event using event_participations
        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": student.enrollment_no})
        if not student_data:
            raise HTTPException(status_code=404, detail="Student not found")
        
        event_participations = student_data.get('event_participations', {})
        participation = event_participations.get(event_id)
        
        if not participation:
            return templates.TemplateResponse(
                "client/not_registered.html",
                {
                    "request": request,
                    "event": event,
                    "student": student,
                    "student_data": student.model_dump(),
                    "error": "You are not registered for this event",
                    "is_student_logged_in": True
                },
                status_code=403
            )        # Check if attendance already marked
        if participation.get('attendance_id'):
            # Create registration data for the confirmation template
            registration_for_template = {
                "registrar_id": participation.get('registration_id', ''),
                "full_name": student_data.get('full_name', ''),
                "enrollment_no": student_data.get('enrollment_no', ''),
                "email": student_data.get('email', ''),
                "mobile_no": student_data.get('mobile_no', ''),
                "department": student_data.get('department', ''),
                "semester": student_data.get('semester', ''),
                "registration_type": participation.get('registration_type', 'individual')
            }
            
            # Create attendance object
            attendance_data = {
                "attendance_id": participation.get('attendance_id'),
                "attendance_marked_at": participation.get('attendance_marked_at') or participation.get('registration_date')
            }
            
            return templates.TemplateResponse(
                "client/attendance_confirmation.html",
                {
                    "request": request,
                    "event": event,
                    "student": student,
                    "student_data": student.model_dump(),
                    "participation": participation,
                    "registration": registration_for_template,
                    "attendance": attendance_data,
                    "is_student_logged_in": True
                }
            )# Get registration data for auto-filling form
        # Student data comes from the main student document, registration_id from participation
        
        # Debug logging to see what data we have
        logger.info(f"Debug - participation data: {participation}")
        logger.info(f"Debug - student_data from database: {student_data}")
        
        # Create the registration object with the correct field mapping for the template
        registration_for_template = {
            "registrar_id": participation.get('registration_id', ''),  # From participation
            "full_name": student_data.get('full_name', ''),          # From student document
            "enrollment_no": student_data.get('enrollment_no', ''),   # From student document  
            "email": student_data.get('email', ''),                  # From student document
            "mobile_no": student_data.get('mobile_no', ''),          # From student document
            "department": student_data.get('department', ''),        # From student document
            "semester": student_data.get('semester', ''),            # From student document
            "registration_type": participation.get('registration_type', 'individual')  # From participation
        }
        
        logger.info(f"Debug - registration_for_template: {registration_for_template}")
        auto_filled = bool(registration_for_template.get('full_name') and registration_for_template.get('registrar_id'))
        logger.info(f"Debug - auto_filled: {auto_filled}")
        
        return templates.TemplateResponse(
            "client/mark_attendance.html",
            {
                "request": request,
                "event": event,
                "student": student,
                "student_data": student.model_dump(),
                "participation": participation,
                "registration": registration_for_template,
                "auto_filled": auto_filled,                "is_student_logged_in": True
            }
        )
    
    except Exception as e:
        logger.error(f"Error in mark_attendance_form: {str(e)}")
        return templates.TemplateResponse(
            "error.html",
            {
                "request": request,
                "error": "An error occurred while loading the attendance form",
                "status_code": 500
            },
            status_code=500
        )

@router.post("/events/{event_id}/mark-attendance")
async def mark_attendance_submit(request: Request, event_id: str, student: Student = Depends(require_student_login)):
    """Process attendance marking for students"""
    try:
        # Fetch event details
        event = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
          # Get form data
        form_data = await request.form()
        registration_id = form_data.get("registration_id", "").strip()
        student_name = form_data.get("student_name", "").strip()
        enrollment_no = form_data.get("enrollment_no", "").strip()
        
        # Basic validation
        if not registration_id or not student_name or not enrollment_no:
            return templates.TemplateResponse(
                "client/mark_attendance.html",
                {
                    "request": request,
                    "event": event,
                    "student": student,
                    "student_data": student.model_dump(),
                    "error": "Please fill in all required fields"
                },
                status_code=400
            )
        
        # Check if student is registered for this event using event_participations
        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": student.enrollment_no})
        if not student_data:
            raise HTTPException(status_code=404, detail="Student not found")
        
        event_participations = student_data.get('event_participations', {})
        participation = event_participations.get(event_id)
        
        if not participation:
            return templates.TemplateResponse(
                "client/not_registered.html",
                {
                    "request": request,
                    "event": event,
                    "student": student,
                    "student_data": student.model_dump(),
                    "error": "You are not registered for this event",
                    "is_student_logged_in": True
                },
                status_code=403
            )
        
        # Validate submitted data against registration
        expected_registration_id = participation.get('registration_id', '')
        expected_enrollment_no = student.enrollment_no
        
        if registration_id.upper() != expected_registration_id.upper():
            # Get registration data for re-rendering the form
            registration_data = None
            event_collection = await Database.get_event_collection(event_id)
            if event_collection is not None:
                registration_data = await event_collection.find_one({"enrollment_no": student.enrollment_no})
            
            return templates.TemplateResponse(
                "client/mark_attendance.html",
                {
                    "request": request,
                    "event": event,
                    "student": student,
                    "student_data": student.model_dump(),
                    "registration": registration_data,
                    "auto_filled": True if registration_data else False,
                    "error": f"Invalid registration ID. Your registration ID is: {expected_registration_id}"
                },
                status_code=400
            )
        
        if enrollment_no != expected_enrollment_no:
            # Get registration data for re-rendering the form
            registration_data = None
            event_collection = await Database.get_event_collection(event_id)
            if event_collection is not None:
                registration_data = await event_collection.find_one({"enrollment_no": student.enrollment_no})
            
            return templates.TemplateResponse(
                "client/mark_attendance.html",
                {
                    "request": request,
                    "event": event,
                    "student": student,
                    "student_data": student.model_dump(),
                    "registration": registration_data,
                    "auto_filled": True if registration_data else False,
                    "error": "Enrollment number mismatch"
                },
                status_code=400
            )
        
        # Check if attendance already marked
        if participation.get('attendance_id'):
            return templates.TemplateResponse(
                "error.html",
                {
                    "request": request,
                    "error": "Attendance already marked for this event",
                    "student": student,
                    "status_code": 400
                },
                status_code=400
            )
          # Generate attendance ID and mark attendance
        from utils.id_generator import generate_attendance_id
        attendance_id = generate_attendance_id(enrollment_no, event_id)
        
        # Update the event-specific collection with attendance
        event_collection = await Database.get_event_collection(event_id)
        if event_collection is not None:
            await event_collection.update_one(
                {"enrollment_no": student.enrollment_no},
                {
                    "$set": {
                        "attendance_id": attendance_id,
                        "attended": True,
                        "attendance_marked_at": datetime.now()
                    }
                }
            )
          # Update student's event_participations
        await DatabaseOperations.update_one(
            "students",
            {"enrollment_no": student.enrollment_no},
            {
                "$set": {
                    f"event_participations.{event_id}.attendance_id": attendance_id,
                    f"event_participations.{event_id}.attended": True,
                    f"event_participations.{event_id}.attendance_marked_at": datetime.now()
                }
            }
        )
          # Redirect to attendance success page
        return RedirectResponse(
            url=f"/client/events/{event_id}/attendance-success?attendance_id={attendance_id}", 
            status_code=303
        )
    
    except Exception as e:
        logger.error(f"Error in mark_attendance_submit: {str(e)}")
        return templates.TemplateResponse(
            "error.html",
            {
                "request": request,
                "error": "An error occurred while marking attendance",
                "student": student,
                "status_code": 500
            },
            status_code=500
        )

@router.get("/events/{event_id}/attendance-success")
async def attendance_success(request: Request, event_id: str, attendance_id: str, student: Student = Depends(require_student_login)):
    """Show attendance success page"""
    try:
        # Fetch event details
        event = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Get student data and verify attendance
        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": student.enrollment_no})
        if not student_data:
            raise HTTPException(status_code=404, detail="Student not found")
        
        event_participations = student_data.get('event_participations', {})
        participation = event_participations.get(event_id)
        
        if not participation or participation.get('attendance_id') != attendance_id:
            raise HTTPException(status_code=404, detail="Attendance record not found")
        
        # Create registration data for the template
        registration_for_template = {
            "registrar_id": participation.get('registration_id', ''),
            "full_name": student_data.get('full_name', ''),
            "enrollment_no": student_data.get('enrollment_no', ''),
            "email": student_data.get('email', ''),
            "mobile_no": student_data.get('mobile_no', ''),
            "department": student_data.get('department', ''),
            "semester": student_data.get('semester', ''),
            "registration_type": participation.get('registration_type', 'individual')
        }
        
        # Create attendance object
        attendance_data = {
            "attendance_id": participation.get('attendance_id'),
            "attendance_marked_at": participation.get('attendance_marked_at') or participation.get('registration_date')
        }
        
        return templates.TemplateResponse(
            "client/attendance_success.html",
            {
                "request": request,
                "event": event,
                "student": student,
                "student_data": student.model_dump(),
                "participation": participation,
                "registration": registration_for_template,
                "attendance": attendance_data,
                "already_marked": False,  # This is for new attendance marking
                "is_student_logged_in": True
            }
        )
    
    except Exception as e:
        logger.error(f"Error in attendance_success: {str(e)}")
        return templates.TemplateResponse(
            "error.html",
            {
                "request": request,
                "error": "An error occurred while loading the attendance success page",
                "student": student,
                "status_code": 500
            },
            status_code=500
        )
