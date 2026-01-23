"""
Event Feedback Service
======================
Handles feedback form creation, management, and response collection for events.

COLLECTIONS:
- events: stores feedback_form configuration in event documents
- student_feedbacks: stores individual feedback responses
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
from database.operations import DatabaseOperations
from core.logger import get_logger
from bson import ObjectId

logger = get_logger(__name__)

class EventFeedbackService:
    """
    Professional service for event feedback operations.
    Handles feedback form creation, updates, and response collection.
    Supports both student and faculty feedback.
    """
    
    def __init__(self):
        self.events_collection = "events"
        self.student_feedbacks_collection = "student_feedbacks"
        self.faculty_feedbacks_collection = "faculty_feedbacks"
        self.registrations_collection = "student_registrations"
        self.faculty_registrations_collection = "faculty_registrations"
        self.students_collection = "students"
        self.faculty_collection = "faculties"
    
    async def create_feedback_form(
        self,
        event_id: str,
        feedback_form_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create or update feedback form for an event"""
        try:
            # Verify event exists
            event = await DatabaseOperations.find_one(
                self.events_collection,
                {"event_id": event_id}
            )
            
            if not event:
                return {
                    "success": False,
                    "message": "Event not found"
                }
            
            # Prepare feedback form data
            feedback_form = {
                "title": feedback_form_data.get("title", "Event Feedback Form"),
                "description": feedback_form_data.get("description", "Please share your feedback about this event."),
                "elements": feedback_form_data.get("elements", []),
                "is_active": feedback_form_data.get("is_active", True),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            # Add unique IDs to form elements if not present
            for i, element in enumerate(feedback_form["elements"]):
                if "id" not in element:
                    element["id"] = f"element_{i+1}"
            
            # Prepare update data
            update_data = {
                "feedback_form": feedback_form,
                "updated_at": datetime.utcnow()
            }
            
            # Add feedback_end_date for non-certificate events
            if "feedback_end_date" in feedback_form_data and feedback_form_data["feedback_end_date"]:
                # Parse the date string and store as datetime
                try:
                    from dateutil import parser
                    feedback_end_date = parser.parse(feedback_form_data["feedback_end_date"])
                    update_data["feedback_end_date"] = feedback_end_date
                except Exception as e:
                    logger.warning(f"Failed to parse feedback_end_date: {e}")
            
            # Update event with feedback form and feedback_end_date
            update_result = await DatabaseOperations.update_one(
                self.events_collection,
                {"event_id": event_id},
                {"$set": update_data}
            )
            
            if update_result:
                logger.info(f"Feedback form created/updated for event {event_id}")
                
                # Serialize datetime objects in feedback_form for JSON response
                serialized_feedback_form = {}
                for key, value in feedback_form.items():
                    if isinstance(value, datetime):
                        serialized_feedback_form[key] = value.isoformat()
                    else:
                        serialized_feedback_form[key] = value
                
                return {
                    "success": True,
                    "message": "Feedback form saved successfully",
                    "feedback_form": serialized_feedback_form
                }
            else:
                return {
                    "success": False,
                    "message": "Failed to save feedback form"
                }
                
        except Exception as e:
            logger.error(f"Error creating feedback form for event {event_id}: {str(e)}")
            return {
                "success": False,
                "message": f"Error creating feedback form: {str(e)}"
            }
    
    async def get_feedback_form(self, event_id: str) -> Dict[str, Any]:
        """Get feedback form for an event"""
        try:
            event = await DatabaseOperations.find_one(
                self.events_collection,
                {"event_id": event_id},
                {"feedback_form": 1, "event_name": 1, "event_id": 1}
            )
            
            if not event:
                return {
                    "success": False,
                    "message": "Event not found"
                }
            
            feedback_form = event.get("feedback_form")
            if not feedback_form:
                return {
                    "success": False,
                    "message": "No feedback form found for this event"
                }
            
            if not feedback_form.get("is_active", True):
                return {
                    "success": False,
                    "message": "Feedback form is not active"
                }
            
            # Convert datetime objects to ISO strings for JSON serialization
            serialized_feedback_form = {}
            for key, value in feedback_form.items():
                if isinstance(value, datetime):
                    serialized_feedback_form[key] = value.isoformat()
                else:
                    serialized_feedback_form[key] = value
            
            return {
                "success": True,
                "feedback_form": serialized_feedback_form,
                "event": {
                    "event_id": event["event_id"],
                    "event_name": event["event_name"]
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting feedback form for event {event_id}: {str(e)}")
            return {
                "success": False,
                "message": f"Error retrieving feedback form: {str(e)}"
            }
    
    async def submit_feedback(
        self,
        event_id: str,
        student_enrollment: str,
        feedback_responses: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Submit feedback response for an event"""
        try:
            # Verify event and feedback form exist
            event = await DatabaseOperations.find_one(
                self.events_collection,
                {"event_id": event_id},
                {"feedback_form": 1, "event_name": 1}
            )
            
            if not event:
                return {
                    "success": False,
                    "message": "Event not found"
                }
            
            feedback_form = event.get("feedback_form")
            if not feedback_form or not feedback_form.get("is_active", True):
                return {
                    "success": False,
                    "message": "Feedback form is not available"
                }
            
            # Check if student is registered for the event (any status accepted)
            # Registration model uses: student.enrollment_no and event.event_id
            registration = await DatabaseOperations.find_one(
                self.registrations_collection,
                {
                    "event.event_id": event_id,
                    "student.enrollment_no": student_enrollment
                }
            )
            
            if not registration:
                return {
                    "success": False,
                    "message": "You must be registered for this event to submit feedback"
                }
            
            # Check if feedback already submitted
            existing_feedback = await DatabaseOperations.find_one(
                self.student_feedbacks_collection,
                {
                    "event_id": event_id,
                    "student_enrollment": student_enrollment
                }
            )
            
            if existing_feedback:
                return {
                    "success": False,
                    "message": "You have already submitted feedback for this event"
                }
            
            # Get student info from registration document (more reliable than separate query)
            student_data = registration.get("student", {})
            
            # Get registration_id from multiple possible locations in registration document
            reg_id = (
                registration.get("registration", {}).get("registration_id") or 
                registration.get("registration", {}).get("additional_data", {}).get("registration_id") or
                registration.get("registration_id")  # Some old documents might have it at root
            )
            
            if not reg_id and registration.get("_id"):
                # Last resort: generate from MongoDB _id
                reg_id = f"REG_{str(registration['_id'])[:8].upper()}"
            
            # Create feedback document
            feedback_document = {
                "feedback_id": f"fb_{event_id}_{student_enrollment}_{int(datetime.utcnow().timestamp())}",
                "event_id": event_id,
                "event_name": event["event_name"],
                "student_enrollment": student_enrollment,
                "registration_id": reg_id or "N/A",
                "student_info": {
                    "name": student_data.get("name", ""),
                    "email": student_data.get("email", ""),
                    "department": student_data.get("department", "")
                },
                "responses": feedback_responses,
                "submitted_at": datetime.utcnow(),
                "ip_address": None,  # Can be added from request context
                "user_agent": None   # Can be added from request context
            }
            
            # Insert feedback document
            feedback_id = await DatabaseOperations.insert_one(
                self.student_feedbacks_collection,
                feedback_document
            )
            
            if feedback_id:
                # Update registration to mark feedback as submitted
                # Registration model uses: student.enrollment_no and event.event_id
                await DatabaseOperations.update_one(
                    self.registrations_collection,
                    {
                        "event.event_id": event_id,
                        "student.enrollment_no": student_enrollment
                    },
                    {
                        "$set": {
                            "feedback.submitted": True,
                            "feedback.submitted_at": datetime.utcnow()
                        }
                    }
                )
                
                logger.info(f"Feedback submitted by {student_enrollment} for event {event_id}")
                return {
                    "success": True,
                    "message": "Feedback submitted successfully",
                    "feedback_id": feedback_document["feedback_id"]
                }
            else:
                return {
                    "success": False,
                    "message": "Failed to save feedback"
                }
                
        except Exception as e:
            logger.error(f"Error submitting feedback for event {event_id}: {str(e)}")
            return {
                "success": False,
                "message": f"Error submitting feedback: {str(e)}"
            }
    
    async def submit_test_feedback(
        self,
        event_id: str,
        student_enrollment: str,
        feedback_responses: Dict[str, Any],
        test_registration_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Submit test feedback for an event (bypasses eligibility checks)"""
        try:
            # Verify event and feedback form exist
            event = await DatabaseOperations.find_one(
                self.events_collection,
                {"event_id": event_id},
                {"feedback_form": 1, "event_name": 1}
            )
            
            if not event:
                return {
                    "success": False,
                    "message": "Event not found"
                }
            
            feedback_form = event.get("feedback_form")
            if not feedback_form:
                return {
                    "success": False,
                    "message": "No feedback form found for this event"
                }
            
            # Create test feedback document (allow multiple submissions)
            feedback_document = {
                "feedback_id": f"test_fb_{event_id}_{student_enrollment}_{int(datetime.utcnow().timestamp())}",
                "event_id": event_id,
                "event_name": event["event_name"],
                "student_enrollment": student_enrollment,
                "registration_id": test_registration_id or f"test_reg_{int(datetime.utcnow().timestamp())}",
                "student_info": {
                    "name": "Test Student",
                    "email": f"{student_enrollment}@test.edu",
                    "department": "Test Department"
                },
                "responses": feedback_responses,
                "submitted_at": datetime.utcnow(),
                "is_test_submission": True,
                "test_metadata": {
                    "submitted_via": "test_environment",
                    "test_session": f"test_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
                }
            }
            
            # Insert feedback document
            feedback_id = await DatabaseOperations.insert_one(
                self.student_feedbacks_collection,
                feedback_document
            )
            
            if feedback_id:
                logger.info(f"Test feedback submitted by {student_enrollment} for event {event_id}")
                return {
                    "success": True,
                    "message": "Test feedback submitted successfully",
                    "feedback_id": feedback_document["feedback_id"],
                    "test_mode": True
                }
            else:
                return {
                    "success": False,
                    "message": "Failed to save test feedback"
                }
                
        except Exception as e:
            logger.error(f"Error submitting test feedback for event {event_id}: {str(e)}")
            return {
                "success": False,
                "message": f"Error submitting test feedback: {str(e)}"
            }
    
    async def get_event_feedback_responses(
        self,
        event_id: str,
        page: int = 1,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Get all feedback responses for an event from both student and faculty collections (admin use)"""
        try:
            skip = (page - 1) * limit
            
            # Get event info to determine target audience
            event = await DatabaseOperations.find_one(
                self.events_collection,
                {"event_id": event_id},
                {"event_name": 1, "feedback_form": 1, "target_audience": 1}
            )
            
            if not event:
                return {
                    "success": False,
                    "message": "Event not found"
                }
            
            target_audience = event.get("target_audience", {})
            
            # Collect feedback from both collections
            all_feedbacks = []
            
            # Always get student feedbacks (no target_audience check needed for feedback viewing)
            student_feedbacks = await DatabaseOperations.find_many(
                self.student_feedbacks_collection,
                {"event_id": event_id},
                projection={"_id": 0},
                sort_by=[("submitted_at", -1)]
            )
            all_feedbacks.extend(list(student_feedbacks))
            
            # Always get faculty feedbacks (no target_audience check needed for feedback viewing)
            faculty_feedbacks = await DatabaseOperations.find_many(
                self.faculty_feedbacks_collection,
                {"event_id": event_id},
                projection={"_id": 0},
                sort_by=[("submitted_at", -1)]
            )
            all_feedbacks.extend(list(faculty_feedbacks))
            
            # Sort all feedbacks by submitted_at (most recent first)
            all_feedbacks.sort(key=lambda x: x.get("submitted_at", datetime.min), reverse=True)
            
            # Get total count
            total_responses = len(all_feedbacks)
            
            # Apply pagination
            paginated_feedbacks = all_feedbacks[skip:skip + limit]
            # Apply pagination
            paginated_feedbacks = all_feedbacks[skip:skip + limit]
            
            # Serialize datetime objects in feedbacks
            serialized_feedbacks = []
            for feedback in paginated_feedbacks:
                # Safety check: ensure feedback is a dict
                if not isinstance(feedback, dict):
                    logger.warning(f"Skipping invalid feedback entry (not a dict): {type(feedback)}")
                    continue
                    
                serialized_feedback = {}
                for key, value in feedback.items():
                    if isinstance(value, datetime):
                        # Add 'Z' suffix to indicate UTC timezone
                        serialized_feedback[key] = value.isoformat() + 'Z' if not value.isoformat().endswith('Z') else value.isoformat()
                    else:
                        serialized_feedback[key] = value
                serialized_feedbacks.append(serialized_feedback)
            
            # Serialize datetime objects in feedback_form if it exists
            serialized_feedback_form = None
            if event and event.get("feedback_form"):
                feedback_form = event["feedback_form"]
                serialized_feedback_form = {}
                for key, value in feedback_form.items():
                    if isinstance(value, datetime):
                        serialized_feedback_form[key] = value.isoformat()
                    else:
                        serialized_feedback_form[key] = value
            
            return {
                "success": True,
                "event": {
                    "event_id": event_id,
                    "event_name": event.get("event_name", "") if event else "",
                    "feedback_form": serialized_feedback_form
                },
                "responses": serialized_feedbacks,
                "pagination": {
                    "total": total_responses,
                    "page": page,
                    "limit": limit,
                    "has_next": skip + limit < total_responses,
                    "has_prev": page > 1
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting feedback responses for event {event_id}: {str(e)}")
            return {
                "success": False,
                "message": f"Error retrieving feedback responses: {str(e)}"
            }
    
    async def get_feedback_analytics(self, event_id: str) -> Dict[str, Any]:
        """Get feedback analytics and summary for an event (both student and faculty)"""
        try:
            # Get event and feedback form
            event = await DatabaseOperations.find_one(
                self.events_collection,
                {"event_id": event_id},
                {"event_name": 1, "feedback_form": 1, "target_audience": 1}
            )
            
            if not event or not event.get("feedback_form"):
                return {
                    "success": False,
                    "message": "Event or feedback form not found"
                }
            
            target_audience = event.get("target_audience", {})
            
            # Get total registrations based on target audience
            total_registrations = 0
            
            # Count student registrations if applicable
            # Registration model uses: event.event_id (not event_info.event_id)
            student_registrations = await DatabaseOperations.count_documents(
                self.registrations_collection,
                {"event.event_id": event_id}
            )
            total_registrations += student_registrations
            
            # Count faculty registrations if applicable  
            faculty_registrations = await DatabaseOperations.count_documents(
                self.faculty_registrations_collection,
                {"event.event_id": event_id}
            )
            total_registrations += faculty_registrations
            
            # Get feedback responses from both collections
            student_feedbacks = await DatabaseOperations.find_many(
                self.student_feedbacks_collection,
                {"event_id": event_id},
                {"responses": 1, "submitted_at": 1}
            )
            
            faculty_feedbacks = await DatabaseOperations.find_many(
                self.faculty_feedbacks_collection,
                {"event_id": event_id},
                {"responses": 1, "submitted_at": 1}
            )
            
            # Combine all responses
            all_responses = list(student_feedbacks) + list(faculty_feedbacks)
            total_responses = len(all_responses)
            
            # Calculate response rate
            response_rate = (total_responses / total_registrations * 100) if total_registrations > 0 else 0
            
            # Analyze responses by form elements
            element_analytics = {}
            feedback_elements = event["feedback_form"].get("elements", [])
            
            for element in feedback_elements:
                element_id = element["id"]
                element_type = element["type"]
                element_analytics[element_id] = {
                    "label": element.get("label", ""),
                    "type": element_type,
                    "responses": []
                }
                
                # Collect responses for this element
                for response in all_responses:
                    if element_id in response.get("responses", {}):
                        element_analytics[element_id]["responses"].append(
                            response["responses"][element_id]
                        )
                
                # Calculate statistics based on element type
                responses_list = element_analytics[element_id]["responses"]
                if element_type == "rating":
                    if responses_list:
                        numeric_responses = [float(r) for r in responses_list if str(r).replace('.', '').isdigit()]
                        if numeric_responses:
                            element_analytics[element_id]["average"] = sum(numeric_responses) / len(numeric_responses)
                            element_analytics[element_id]["count"] = len(numeric_responses)
                
                elif element_type in ["radio", "select"]:
                    # Count occurrences of each option
                    option_counts = {}
                    for response in responses_list:
                        option_counts[response] = option_counts.get(response, 0) + 1
                    element_analytics[element_id]["option_counts"] = option_counts
                
                elif element_type == "checkbox":
                    # Count occurrences of each checkbox option
                    option_counts = {}
                    for response in responses_list:
                        if isinstance(response, list):
                            for option in response:
                                option_counts[option] = option_counts.get(option, 0) + 1
                    element_analytics[element_id]["option_counts"] = option_counts
            
            return {
                "success": True,
                "event": {
                    "event_id": event_id,
                    "event_name": event["event_name"]
                },
                "summary": {
                    "total_registrations": total_registrations,
                    "total_responses": total_responses,
                    "response_rate": round(response_rate, 2)
                },
                "element_analytics": element_analytics
            }
            
        except Exception as e:
            logger.error(f"Error getting feedback analytics for event {event_id}: {str(e)}")
            return {
                "success": False,
                "message": f"Error retrieving feedback analytics: {str(e)}"
            }
    
    async def delete_feedback_form(self, event_id: str) -> Dict[str, Any]:
        """Delete feedback form for an event"""
        try:
            # Update event to remove feedback form
            update_result = await DatabaseOperations.update_one(
                self.events_collection,
                {"event_id": event_id},
                {
                    "$unset": {"feedback_form": ""},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
            
            if update_result:
                logger.info(f"Feedback form deleted for event {event_id}")
                return {
                    "success": True,
                    "message": "Feedback form deleted successfully"
                }
            else:
                return {
                    "success": False,
                    "message": "Failed to delete feedback form or event not found"
                }
                
        except Exception as e:
            logger.error(f"Error deleting feedback form for event {event_id}: {str(e)}")
            return {
                "success": False,
                "message": f"Error deleting feedback form: {str(e)}"
            }
    
    async def check_feedback_eligibility(
        self,
        event_id: str,
        student_enrollment: str
    ) -> Dict[str, Any]:
        """Check if student is eligible to submit feedback"""
        try:
            logger.info(f"Checking eligibility for student {student_enrollment} in event {event_id}")
            
            # Check if student is registered for the event (any status accepted for feedback)
            # Registration model uses: student.enrollment_no and event.event_id
            registration = await DatabaseOperations.find_one(
                self.registrations_collection,
                {
                    "event.event_id": event_id,
                    "student.enrollment_no": student_enrollment
                }
            )
            
            logger.info(f"Registration found: {registration is not None}")
            if registration:
                logger.info(f"Registration data: {registration.get('registration', {}).get('registration_id')} - Status: {registration.get('registration', {}).get('status')}")
            
            if not registration:
                return {
                    "eligible": False,
                    "reason": "not_registered",
                    "message": "You must be registered for this event to submit feedback"
                }
            
            # Check if feedback already submitted
            existing_feedback = await DatabaseOperations.find_one(
                self.student_feedbacks_collection,
                {
                    "event_id": event_id,
                    "student_enrollment": student_enrollment
                }
            )
            
            if existing_feedback:
                submitted_at = existing_feedback.get("submitted_at")
                return {
                    "eligible": False,
                    "reason": "already_submitted",
                    "message": "You have already submitted feedback for this event",
                    "submitted_at": submitted_at.isoformat() if submitted_at else None
                }
            
            # Check if feedback form exists and is active
            event = await DatabaseOperations.find_one(
                self.events_collection,
                {"event_id": event_id},
                {"feedback_form": 1}
            )
            
            if not event or not event.get("feedback_form"):
                return {
                    "eligible": False,
                    "reason": "no_form",
                    "message": "No feedback form available for this event"
                }
            
            if not event["feedback_form"].get("is_active", True):
                return {
                    "eligible": False,
                    "reason": "form_inactive",
                    "message": "Feedback form is currently not active"
                }
            
            return {
                "eligible": True,
                "message": "You are eligible to submit feedback"
            }
            
        except Exception as e:
            logger.error(f"Error checking feedback eligibility: {str(e)}")
            return {
                "eligible": False,
                "reason": "error",
                "message": f"Error checking eligibility: {str(e)}"
            }


# Service instance
event_feedback_service = EventFeedbackService()
