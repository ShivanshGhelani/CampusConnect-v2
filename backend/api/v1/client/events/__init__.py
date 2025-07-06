"""
Client Events API with Redis Caching Support
Handles event-related API endpoints for students and faculty (browsing, details, etc.)
"""
import logging
from fastapi import APIRouter, Request, HTTPException, Depends, Query
from dependencies.auth import get_current_student_optional, get_current_faculty_optional, get_current_user, require_student_login
from models.student import Student
from models.faculty import Faculty
from utils.db_operations import DatabaseOperations
from utils.event_status_manager import EventStatusManager
from bson import ObjectId
from datetime import datetime
from typing import Union, Optional

# Import Redis cache with fallback
try:
    from utils.redis_cache import event_cache
    REDIS_CACHE_AVAILABLE = True
except ImportError:
    REDIS_CACHE_AVAILABLE = False
    event_cache = None

logger = logging.getLogger(__name__)
router = APIRouter()

def serialize_event(event):
    """Convert MongoDB document to JSON-serializable format"""
    if not event:
        return None
    
    # Create a copy to avoid modifying the original
    serialized = {}
    
    for key, value in event.items():
        if isinstance(value, ObjectId):
            serialized[key] = str(value)
        elif isinstance(value, datetime):
            serialized[key] = value.isoformat()
        elif isinstance(value, dict):
            # Recursively handle nested dictionaries
            serialized[key] = serialize_event(value)
        elif isinstance(value, list):
            # Handle lists that might contain ObjectIds or dicts
            serialized[key] = [
                serialize_event(item) if isinstance(item, dict) 
                else str(item) if isinstance(item, ObjectId)
                else item.isoformat() if isinstance(item, datetime)
                else item
                for item in value
            ]
        else:
            serialized[key] = value
    
    return serialized

@router.get("/list")
async def get_events_list(
    status: str = Query("all", description="Filter by event status: all, upcoming, ongoing, completed"),
    category: str = Query(None, description="Filter by event category"),
    page: int = Query(1, description="Page number for pagination"),
    limit: int = Query(10, description="Number of events per page"),
    force_refresh: bool = Query(False, description="Force refresh cache"),
    current_user: Union[Student, Faculty, None] = Depends(get_current_user)
):
    """Get paginated list of events with optional filters and Redis caching, filtered by user type"""
    try:
        # Try to get from Redis cache first (if not forcing refresh and caching is available)
        cached_events = None
        if REDIS_CACHE_AVAILABLE and event_cache and not force_refresh:
            try:
                cached_events = event_cache.get_events()
                if cached_events:
                    logger.info(f"Using cached events data from Redis")
            except Exception as e:
                logger.warning(f"Redis cache retrieval failed: {e}")
        
        # Get fresh data if no cache hit
        if not cached_events:
            logger.info(f"Fetching fresh events data for status: {status}")
            # Get events using EventStatusManager
            if status == "all":
                events = await EventStatusManager.get_available_events("all")
            else:
                events = await EventStatusManager.get_available_events(status)
            
            # Cache the fresh data in Redis (for better performance on subsequent requests)
            if REDIS_CACHE_AVAILABLE and event_cache and status == "all":
                try:
                    event_cache.set_events(events)
                    logger.info(f"Cached {len(events)} events in Redis")
                except Exception as e:
                    logger.warning(f"Redis cache storage failed: {e}")
        else:
            events = cached_events
        
        # Filter by target audience based on current user type
        if current_user:
            user_type = "student" if isinstance(current_user, Student) else "faculty"
            events = [
                event for event in events 
                if event.get('target_audience') in [user_type, 'both']
            ]
        else:
            # For non-logged in users, show all events
            pass
        
        # Filter by category if specified
        if category:
            events = [event for event in events if event.get('category', '').lower() == category.lower()]        
        
        # Add registration status for logged-in users
        if current_user:
            if isinstance(current_user, Student):
                student_data = await DatabaseOperations.find_one("students", {"enrollment_no": current_user.enrollment_no})
                if student_data:
                    event_participations = student_data.get('event_participations', {})
                    for event in events:
                        event_id = event.get('event_id')
                        if event_id in event_participations:
                            participation = event_participations[event_id]
                            event['user_registration_status'] = {
                                "registered": True,
                                "registration_id": participation.get('registration_id'),
                                "registration_type": participation.get('registration_type', 'individual'),
                                "attendance_marked": bool(participation.get('attendance_id')),
                                "feedback_submitted": bool(participation.get('feedback_id')),
                                "certificate_available": bool(participation.get('certificate_id'))
                            }
                        else:
                            event['user_registration_status'] = {"registered": False}
                else:
                    # Student not found in database, mark all as not registered
                    for event in events:
                        event['user_registration_status'] = {"registered": False}
            elif isinstance(current_user, Faculty):
                # For faculty, we might add similar tracking in the future
                # For now, just mark all events as not registered (faculty don't register for events)
                for event in events:
                    event['user_registration_status'] = {"registered": False}
        
        # Pagination
        total_events = len(events)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_events = events[start_idx:end_idx]
        
        # Serialize events to handle ObjectIds and datetime objects
        serialized_events = [serialize_event(event) for event in paginated_events]
        
        # Add cache information to response
        cache_info = {}
        if REDIS_CACHE_AVAILABLE and event_cache:
            try:
                cache_info = event_cache.get_cache_info()
            except Exception as e:
                cache_info = {"error": str(e)}
        
        return {
            "success": True,
            "message": f"Retrieved {len(serialized_events)} events",
            "events": serialized_events,
            "pagination": {
                "current_page": page,
                "total_pages": (total_events + limit - 1) // limit,
                "total_events": total_events,
                "events_per_page": limit,
                "has_next": end_idx < total_events,
                "has_previous": page > 1
            },
            "cache_info": cache_info,
            "from_cache": bool(cached_events)
        }
        
    except Exception as e:
        logger.error(f"Error getting events list: {str(e)}")
        return {"success": False, "message": f"Error retrieving events: {str(e)}"}

@router.get("/details/{event_id}")
async def get_event_details(event_id: str, student: Student = Depends(get_current_student_optional)):
    """Get detailed information about a specific event"""
    try:
        # Get event details with updated status (no caching for event details to ensure freshness)
        event = await EventStatusManager.get_event_by_id(event_id)
        if not event:
            return {"success": False, "message": "Event not found"}
        
        # Add registration status for logged-in students
        user_registration_status = {"registered": False}
        if student:
            student_data = await DatabaseOperations.find_one("students", {"enrollment_no": student.enrollment_no})
            if student_data:
                event_participations = student_data.get('event_participations', {})
                if event_id in event_participations:
                    participation = event_participations[event_id]
                    user_registration_status = {
                        "registered": True,
                        "registration_id": participation.get('registration_id'),
                        "registration_type": participation.get('registration_type', 'individual'),
                        "registration_date": participation.get('registration_datetime'),
                        "attendance_marked": bool(participation.get('attendance_id')),
                        "attendance_id": participation.get('attendance_id'),
                        "feedback_submitted": bool(participation.get('feedback_id')),
                        "feedback_id": participation.get('feedback_id'),
                        "certificate_available": bool(participation.get('certificate_id')),
                        "certificate_id": participation.get('certificate_id'),
                        "team_name": participation.get('student_data', {}).get('team_name'),
                        "team_registration_id": participation.get('team_registration_id')
                    }
        
        # Add registration statistics
        registration_stats = {
            "total_registrations": len(event.get('registrations', {})),
            "individual_registrations": 0,
            "team_registrations": 0,
            "total_participants": 0
        }
        
        # Calculate registration statistics
        registrations = event.get('registrations', {})
        team_registrations = event.get('team_registrations', {})
        
        registration_stats["individual_registrations"] = len(registrations)
        registration_stats["team_registrations"] = len(team_registrations)
        
        # Count total participants (individuals + team members)
        total_participants = len(registrations)
        for team_data in team_registrations.values():
            if isinstance(team_data, dict) and 'members' in team_data:
                total_participants += len(team_data['members'])
        
        registration_stats["total_participants"] = total_participants
        
        event['user_registration_status'] = user_registration_status
        event['registration_stats'] = registration_stats
        
        # Serialize event to handle ObjectIds and datetime objects
        serialized_event = serialize_event(event)
        
        return {
            "success": True,
            "message": "Event details retrieved successfully",
            "event": serialized_event
        }
        
    except Exception as e:
        logger.error(f"Error getting event details: {str(e)}")
        return {"success": False, "message": f"Error retrieving event details: {str(e)}"}

@router.get("/categories")
async def get_event_categories():
    """Get list of all event categories"""
    try:
        # Get all events to extract unique categories
        events = await DatabaseOperations.find_many("events", {})
        
        categories = set()
        for event in events:
            category = event.get('category')
            if category:
                categories.add(category)
        
        return {
            "success": True,
            "message": f"Found {len(categories)} categories",
            "categories": sorted(list(categories))
        }
        
    except Exception as e:
        logger.error(f"Error getting event categories: {str(e)}")
        return {"success": False, "message": f"Error retrieving categories: {str(e)}"}

@router.get("/search")
async def search_events(
    q: str = Query(..., description="Search query"),
    status: str = Query("all", description="Filter by event status"),
    category: str = Query(None, description="Filter by event category"),
    page: int = Query(1, description="Page number for pagination"),
    limit: int = Query(10, description="Number of events per page"),
    student: Student = Depends(get_current_student_optional)
):
    """Search events by name, description, or category"""
    try:
        if not q or len(q.strip()) < 2:
            return {"success": False, "message": "Search query must be at least 2 characters long"}
        
        # Get events based on status filter
        if status == "all":
            events = await EventStatusManager.get_available_events("all")
        else:
            events = await EventStatusManager.get_available_events(status)
        
        # Search in event name, description, and category
        search_query = q.lower().strip()
        matching_events = []
        
        for event in events:
            event_name = event.get('event_name', '').lower()
            event_description = event.get('description', '').lower()
            event_category = event.get('category', '').lower()
            
            if (search_query in event_name or 
                search_query in event_description or 
                search_query in event_category):
                matching_events.append(event)
        
        # Filter by category if specified
        if category:
            matching_events = [
                event for event in matching_events 
                if event.get('category', '').lower() == category.lower()
            ]
        
        # Add registration status for logged-in students
        if student:
            student_data = await DatabaseOperations.find_one("students", {"enrollment_no": student.enrollment_no})
            if student_data:
                event_participations = student_data.get('event_participations', {})
                for event in matching_events:
                    event_id = event.get('event_id')
                    if event_id in event_participations:
                        participation = event_participations[event_id]
                        event['user_registration_status'] = {
                            "registered": True,
                            "registration_id": participation.get('registration_id'),
                            "registration_type": participation.get('registration_type', 'individual'),
                            "attendance_marked": bool(participation.get('attendance_id')),
                            "feedback_submitted": bool(participation.get('feedback_id')),
                            "certificate_available": bool(participation.get('certificate_id'))
                        }
                    else:
                        event['user_registration_status'] = {"registered": False}
        
        # Pagination
        total_events = len(matching_events)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_events = matching_events[start_idx:end_idx]
        
        return {
            "success": True,
            "message": f"Found {total_events} events matching '{q}'",
            "events": paginated_events,
            "search_query": q,
            "pagination": {
                "current_page": page,
                "total_pages": (total_events + limit - 1) // limit,
                "total_events": total_events,
                "events_per_page": limit,
                "has_next": end_idx < total_events,
                "has_previous": page > 1
            }
        }
        
    except Exception as e:
        logger.error(f"Error searching events: {str(e)}")
        return {"success": False, "message": f"Error searching events: {str(e)}"}

@router.get("/upcoming")
async def get_upcoming_events(
    limit: int = Query(5, description="Number of upcoming events to retrieve"),
    student: Student = Depends(get_current_student_optional)
):
    """Get upcoming events (quick access endpoint)"""
    try:
        # Get upcoming events
        events = await EventStatusManager.get_available_events("upcoming")
        
        # Sort by start date
        events.sort(key=lambda x: x.get('start_datetime', ''))
        
        # Limit results
        limited_events = events[:limit]
        
        # Add registration status for logged-in students
        if student:
            student_data = await DatabaseOperations.find_one("students", {"enrollment_no": student.enrollment_no})
            if student_data:
                event_participations = student_data.get('event_participations', {})
                for event in limited_events:
                    event_id = event.get('event_id')
                    if event_id in event_participations:
                        participation = event_participations[event_id]
                        event['user_registration_status'] = {
                            "registered": True,
                            "registration_type": participation.get('registration_type', 'individual'),
                            "attendance_marked": bool(participation.get('attendance_id'))
                        }
                    else:
                        event['user_registration_status'] = {"registered": False}
        
        return {
            "success": True,
            "message": f"Retrieved {len(limited_events)} upcoming events",
            "events": limited_events
        }
        
    except Exception as e:
        logger.error(f"Error getting upcoming events: {str(e)}")
        return {"success": False, "message": f"Error retrieving upcoming events: {str(e)}"}
