"""Event feedback and certificate routes."""
from fastapi import APIRouter, Request, HTTPException, Response, Depends, status
from fastapi.templating import Jinja2Templates
from fastapi.responses import RedirectResponse
from datetime import datetime
from models.student import Student
from models.feedback import EventFeedback
from config.database import Database
from utils.db_operations import DatabaseOperations
from utils.email_service import EmailService
from dependencies.auth import require_student_login
from utils.event_status_manager import EventStatusManager
from models.event import EventSubStatus
from utils.id_generator import generate_feedback_id

router = APIRouter()
templates = Jinja2Templates(directory="templates")
email_service = EmailService()

@router.get("/events/{event_id}/feedback")
async def show_feedback_form(request: Request, event_id: str, student: Student = Depends(require_student_login)):
    """Display the feedback form for an event before certificate collection"""
    try:
        # Get event details with updated status from EventStatusManager
        event = await EventStatusManager.get_event_by_id(event_id)
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Check if certificates are available
        if event.get('sub_status') != EventSubStatus.CERTIFICATE_AVAILABLE.value:
            raise HTTPException(
                status_code=400, 
                detail="Feedback collection is not available for this event at this time"
            )
        
        # Get student data and check event participation
        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": student.enrollment_no})
        if not student_data:
            raise HTTPException(status_code=404, detail="Student data not found")
          # Check if student is registered for this event using event_participations
        event_participations = student_data.get('event_participations', {})
        if event_id not in event_participations:
            return templates.TemplateResponse(
                "client/not_registered.html",
                {
                    "request": request,
                    "event": event,
                    "student": student,
                    "error": "You must be registered for this event to provide feedback",
                    "is_student_logged_in": True,
                    "student_data": student.model_dump()
                }
            )
        
        participation = event_participations[event_id]
        registration_id = participation.get('registration_id')
        attendance_id = participation.get('attendance_id')
        
        # Verify registration_id is not null
        if not registration_id:            # Create registration object to avoid template rendering issues
            registration = {
                "registrar_id": "",
                "enrollment_no": student.enrollment_no,
                "full_name": student_data.get("full_name", ""),
                "email": student_data.get("email", ""),
                "department": student_data.get("department", ""),
                "semester": student_data.get("semester", "")
            }
            return templates.TemplateResponse(
            "client/feedback_form.html",
                {
                    "request": request,
                    "event": event,
                    "student": student,
                    "registration": registration,
                    "error": "Invalid registration - registration ID not found",
                    "is_student_logged_in": True,
                    "student_data": student.model_dump()
                }
            )
          # Verify attendance_id is not null (student must have attended)
        if not attendance_id:
            # Create registration object to avoid template rendering issues
            registration = {
                "registrar_id": registration_id,
                "enrollment_no": student.enrollment_no,
                "full_name": student_data.get("full_name", ""),
                "email": student_data.get("email", ""),
                "department": student_data.get("department", ""),
                "semester": student_data.get("semester", "")
            }
            return templates.TemplateResponse(
                "client/feedback_form.html",
                {
                    "request": request,
                    "event": event,
                    "student": student,
                    "registration": registration,
                    "error": "You must have attended this event to provide feedback",
                    "is_student_logged_in": True,
                    "student_data": student.model_dump()
                }
            )
          # Check if student already submitted feedback
        existing_feedback_id = participation.get('feedback_id')
        if existing_feedback_id:
            # Redirect to certificate download page with feedback_submitted=True
            return RedirectResponse(
                url=f"/client/events/{event_id}/certificate?feedback_submitted=True",
                status_code=303
            )        # Create registration object for template compatibility
        registration = {
            "registrar_id": registration_id,
            "enrollment_no": student.enrollment_no,
            "full_name": student_data.get("full_name", ""),
            "email": student_data.get("email", ""),
            "mobile_no": student_data.get("mobile_no", ""),
            "department": student_data.get("department", ""),
            "semester": student_data.get("semester", ""),
            "registration_type": participation.get("registration_type", "individual")
        }

        # Add conditional properties for template based on event data
        event['is_team_based'] = event.get('registration_mode') == 'team'
        event['is_paid'] = (event.get('registration_type') == 'paid' and 
                           event.get('registration_fee', 0) > 0)        
        return templates.TemplateResponse(
            "client/feedback_form.html",
            {
                "request": request,
                "event": event,
                "student": student,
                "registration": registration,
                "is_student_logged_in": True,
                "student_data": student.model_dump()
            }
        )

    except HTTPException as he:
        if he.status_code == status.HTTP_401_UNAUTHORIZED:
            return RedirectResponse(
                url=f"/client/login?redirect={request.url.path}",
                status_code=302
            )
        raise he
    except Exception as e:
        print(f"Error in show_feedback_form: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/events/{event_id}/feedback")
async def submit_feedback(request: Request, event_id: str, student: Student = Depends(require_student_login)):
    """Handle feedback form submission"""
    try:
        # Get form data
        form_data = await request.form()
        
        # Get event details
        event = await EventStatusManager.get_event_by_id(event_id)
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
            
        # Add conditional properties for template based on event data
        event['is_team_based'] = event.get('registration_mode') == 'team'
        event['is_paid'] = (event.get('registration_type') == 'paid' and 
                           event.get('registration_fee', 0) > 0)
        
        # Get student data and check event participation
        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": student.enrollment_no})
        if not student_data:
            raise HTTPException(status_code=404, detail="Student data not found")
          # Check if student is registered for this event using event_participations
        event_participations = student_data.get('event_participations', {})
        if event_id not in event_participations:
            return templates.TemplateResponse(
                "client/not_registered.html",
                {
                    "request": request,
                    "event": event,
                    "student": student,
                    "error": "You must be registered for this event to provide feedback",
                    "is_student_logged_in": True,
                    "student_data": student.model_dump()
                },
                status_code=400
            )
        
        participation = event_participations[event_id]
        registration_id = participation.get('registration_id')
        attendance_id = participation.get('attendance_id')
          # Verify registration_id and attendance_id exist
        if not registration_id:
            # Create registration object to avoid template rendering issues
            registration = {
                "registrar_id": "",
                "enrollment_no": student.enrollment_no,
                "full_name": student_data.get("full_name", ""),
                "email": student_data.get("email", ""),
                "department": student_data.get("department", ""),
                "semester": student_data.get("semester", "")
            }
            return templates.TemplateResponse(
                "client/feedback_form.html",
                {
                    "request": request,
                    "event": event,
                    "student": student,
                    "registration": registration,
                    "error": "Invalid registration - registration ID not found",
                    "is_student_logged_in": True,
                    "student_data": student.model_dump()
                },
                status_code=400
            )
        if not attendance_id:
            # Create registration object to avoid template rendering issues
            registration = {
                "registrar_id": registration_id,
                "enrollment_no": student.enrollment_no,
                "full_name": student_data.get("full_name", ""),
                "email": student_data.get("email", ""),
                "department": student_data.get("department", ""),
                "semester": student_data.get("semester", "")
            }
            return templates.TemplateResponse(
                "client/feedback_form.html",
                {
                    "request": request,
                    "event": event,
                    "student": student,
                    "registration": registration,
                    "error": "You must have attended this event to provide feedback",
                    "is_student_logged_in": True,
                    "student_data": student.model_dump()
                },
                status_code=400
            )
        
        # Check if feedback already submitted
        existing_feedback_id = participation.get('feedback_id')
        if existing_feedback_id:            return templates.TemplateResponse(
                "client/feedback_confirmation.html",
                {
                    "request": request,
                    "event": event,
                    "student": student,
                    "registration_id": registration_id,
                    "feedback_id": existing_feedback_id,
                    "is_student_logged_in": True,
                    "student_data": student.model_dump(),
                    "message": "You have already submitted feedback for this event"
                }
            )

        # Generate feedback ID using the utility function
        feedback_id = generate_feedback_id(student.enrollment_no, event_id)

        # Create comprehensive feedback record
        feedback_data = {
            "feedback_id": feedback_id,
            "registration_id": registration_id,
            "attendance_id": attendance_id,
            "event_id": event_id,
            "enrollment_no": student.enrollment_no,
            "name": student_data.get("full_name", ""),
            "email": student_data.get("email", ""),
            
            # Step 1: Participant Details
            "participant_name": form_data.get("participant_name", ""),
            "participant_email": form_data.get("participant_email", ""),
            "department": form_data.get("department", ""),
            "year_of_study": form_data.get("year_of_study", ""),            # Step 2: General Event Experience
            "overall_satisfaction": form_data.get("overall_satisfaction", ""),  # Changed from int() to string
            "recommendation_likelihood": form_data.get("recommendation_likelihood", ""),  # Store as string since form sends 'very_likely', etc.
            "favorite_part": form_data.get("favorite_part", ""),
            "future_improvements": form_data.get("future_improvements", ""),
              # Step 3: Event Logistics & Organization
            "well_organized": form_data.get("well_organized", ""),
            "communication_quality": form_data.get("communication_quality", ""),
            "schedule_adherence": form_data.get("schedule_adherence", ""),
            "venue_suitability": form_data.get("venue_suitability", ""),
            
            # Step 4: Content & Delivery
            "content_relevance": form_data.get("content_relevance", ""),
            "speaker_engagement": form_data.get("speaker_engagement", ""),
            "met_expectations": form_data.get("met_expectations", ""),
            "outstanding_sessions": form_data.get("outstanding_sessions", ""),
            
            # Step 5: Team Event Specific (if applicable)
            "team_format_management": form_data.get("team_format_management", ""),
            "rules_clarity": form_data.get("rules_clarity", ""),
            
            # Step 6: Paid Event Specific (if applicable)
            "value_for_money": form_data.get("value_for_money", ""),
            "payment_process": form_data.get("payment_process", ""),
            
            # Step 7: Suggestions & Final Comments
            "future_suggestions": form_data.get("future_suggestions", ""),
            
            # Metadata
            "submitted_at": datetime.now(),
            "form_version": "comprehensive_v1"
        }

        # Store feedback in event's feedbacks collection using event_id as collection name
        feedback_collection_name = f"{event_id}_feedbacks"
        await DatabaseOperations.insert_one(feedback_collection_name, feedback_data)
        
        # Also store in main event document for tracking
        await DatabaseOperations.update_one(
            "events",
            {"event_id": event_id},
            {"$set": {f"feedbacks.{feedback_id}": student.enrollment_no}}
        )
        
        # Update student's event participation record with feedback_id
        await DatabaseOperations.update_one(
            "students",
            {"enrollment_no": student.enrollment_no},
            {"$set": {f"event_participations.{event_id}.feedback_id": feedback_id}}
        )

        # Send feedback confirmation email
        try:
            await email_service.send_feedback_confirmation(
                student_email=student_data.get("email"),
                student_name=student_data.get("full_name"),
                event_title=event.get("event_name", event_id),
                event_date=event.get("start_datetime")
            )
        except Exception as e:
            print(f"Failed to send feedback confirmation email: {str(e)}")
            # Continue even if email fails
        
        # Create registration object for template
        registration = {
            "registrar_id": registration_id,
            "enrollment_no": student.enrollment_no,
            "full_name": student_data.get("full_name", ""),
            "email": student_data.get("email", "")
        }
          # Show success page
        return templates.TemplateResponse(
            "client/feedback_success.html",
            {
                "request": request,
                "event": event,
                "student": student,
                "registration": registration,
                "is_student_logged_in": True,
                "student_data": student.model_dump(),
                "feedback": feedback_data
            }
        )

    except HTTPException as he:
        if he.status_code == status.HTTP_401_UNAUTHORIZED:            return RedirectResponse(
                url=f"/client/login?redirect={request.url.path}",
                status_code=302
            )
        raise he
        
    except ValueError as ve:
        # Create registration object for template even on error
        student_data = await DatabaseOperations.find_one("students", {"enrollment_no": student.enrollment_no})
        event_participations = student_data.get('event_participations', {})
        participation = event_participations.get(event_id, {})
        
        registration = {
            "registrar_id": participation.get('registration_id', ''),
            "enrollment_no": student.enrollment_no,
            "full_name": student_data.get("full_name", ""),
            "email": student_data.get("email", ""),
            "department": student_data.get("department", ""),
            "semester": student_data.get("semester", "")
        }
        return templates.TemplateResponse(
            "client/feedback_form.html",
            {
                "request": request,
                "event": event if 'event' in locals() else None,
                "student": student,
                "registration": registration,
                "error": str(ve),
                "form_data": form_data if 'form_data' in locals() else {},
                "is_student_logged_in": True,
                "student_data": student.model_dump()
            },
            status_code=422
        )
    except Exception as e:
        print(f"Error in submit_feedback: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/events/{event_id}/feature-development")
async def show_feature_development(request: Request, event_id: str, student: Student = Depends(require_student_login)):
    """Display the feature under development page"""
    try:
        # Get event details
        event = await EventStatusManager.get_event_by_id(event_id)
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
          # Get registration record
        event_collection = await Database.get_event_collection(event_id)
        if event_collection is None:
            raise HTTPException(status_code=500, detail="Event collection not found")

        registration = await event_collection.find_one({
            "enrollment_no": student.enrollment_no
        })
        
        if not registration:
            return templates.TemplateResponse(
                "client/not_registered.html",
                {
                    "request": request,
                    "event": event,
                    "student": student,
                    "is_student_logged_in": True,
                    "student_data": student.model_dump()                }
            )

        return templates.TemplateResponse(
            "client/feature_development.html",
            {
                "request": request,
                "event": event,
                "student": student,
                "registration": registration,
                "is_student_logged_in": True,
                "student_data": student.model_dump()
            }
        )

    except HTTPException as he:
        if he.status_code == status.HTTP_401_UNAUTHORIZED:
            return RedirectResponse(
                url=f"/client/login?redirect={request.url.path}",
                status_code=302
            )
        raise he
    except Exception as e:
        print(f"Error in show_feature_development: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
