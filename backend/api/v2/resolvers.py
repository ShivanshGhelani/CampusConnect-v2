"""
GraphQL Resolvers for CampusConnect API v2
Implementation of all GraphQL queries and mutations
"""

import strawberry
from typing import List, Optional, Dict, Any
from fastapi import HTTPException
import asyncio
from datetime import datetime

from api.v2.schema import *
from api.v2.context import get_context
from config.database import Database

# Import existing services
from services.communication.email_service import communication_service
from models.student import Student as StudentModel
from models.faculty import Faculty as FacultyModel
from models.admin_user import AdminUser as AdminModel
from models.event import Event as EventModel
from models.event_registration import EventRegistration as RegistrationModel

@strawberry.type
class Query:
    """GraphQL Query Root - All read operations"""
    
    @strawberry.field
    async def hello(self) -> str:
        """Health check query"""
        return "CampusConnect GraphQL API v2 is running!"
    
    # Authentication Queries
    @strawberry.field
    async def auth_status(self, info) -> AuthResponse:
        """Get current authentication status"""
        context = get_context(info)
        try:
            # Check for existing session or token
            user_data = context.get('user')
            if user_data:
                return AuthResponse(
                    success=True,
                    message="User authenticated",
                    user=User(
                        username=user_data.get('username'),
                        enrollment_no=user_data.get('enrollment_no'),
                        employee_id=user_data.get('employee_id'),
                        full_name=user_data.get('full_name', ''),
                        email=user_data.get('email', ''),
                        department=user_data.get('department', ''),
                        user_type=UserType(user_data.get('user_type', 'student')),
                        role=user_data.get('role')
                    )
                )
            else:
                return AuthResponse(
                    success=False,
                    message="User not authenticated"
                )
        except Exception as e:
            return AuthResponse(
                success=False,
                message=f"Authentication check failed: {str(e)}"
            )
    
    # Event Queries
    @strawberry.field
    async def events(
        self, 
        filters: Optional[EventFilterInput] = None,
        page: int = 1,
        limit: int = 10
    ) -> EventListResponse:
        """Get events list with optional filtering"""
        try:
            db = await Database.get_database()
            events_collection = db.events
            
            # Build filter query
            query = {}
            if filters:
                if filters.status:
                    query['status'] = filters.status.value
                if filters.category:
                    query['event_type'] = filters.category
                if filters.department:
                    query['organizing_department'] = filters.department
                if filters.start_date_from or filters.start_date_to:
                    date_query = {}
                    if filters.start_date_from:
                        date_query['$gte'] = filters.start_date_from
                    if filters.start_date_to:
                        date_query['$lte'] = filters.start_date_to
                    query['start_date'] = date_query
            
            # Count total documents
            total_count = await events_collection.count_documents(query)
            
            # Get paginated results
            skip = (page - 1) * limit
            cursor = events_collection.find(query).skip(skip).limit(limit)
            events_data = await cursor.to_list(length=limit)
            
            # Convert to GraphQL Event objects
            events = []
            for event_data in events_data:
                event = Event(
                    event_id=event_data['event_id'],
                    event_name=event_data['event_name'],
                    event_type=event_data['event_type'],
                    organizing_department=event_data['organizing_department'],
                    short_description=event_data['short_description'],
                    detailed_description=event_data['detailed_description'],
                    start_date=event_data['start_date'],
                    start_time=event_data['start_time'],
                    end_date=event_data['end_date'],
                    end_time=event_data['end_time'],
                    venue=event_data['venue'],
                    venue_id=event_data.get('venue_id'),
                    mode=EventMode(event_data['mode']),
                    status=EventStatus(event_data['status']),
                    target_audience=event_data['target_audience'],
                    faculty_organizers=event_data['faculty_organizers'],
                    contacts=event_data['contacts'],
                    registration_start_date=event_data['registration_start_date'],
                    registration_end_date=event_data['registration_end_date'],
                    certificate_end_date=event_data['certificate_end_date'],
                    registration_mode=RegistrationMode(event_data['registration_mode']),
                    team_size_min=event_data.get('team_size_min'),
                    team_size_max=event_data.get('team_size_max'),
                    max_participants=event_data['max_participants'],
                    registration_type=event_data['registration_type'],
                    registration_fee=event_data.get('registration_fee'),
                    current_registrations=event_data.get('current_registrations', 0),
                    created_at=event_data.get('created_at'),
                    updated_at=event_data.get('updated_at')
                )
                events.append(event)
            
            has_next = total_count > (page * limit)
            
            return EventListResponse(
                events=events,
                total_count=total_count,
                page=page,
                limit=limit,
                has_next=has_next
            )
            
        except Exception as e:
            raise Exception(f"Failed to fetch events: {str(e)}")
    
    @strawberry.field
    async def event(self, event_id: str) -> Optional[Event]:
        """Get single event by ID"""
        try:
            db = await Database.get_database()
            event_data = await db.events.find_one({"event_id": event_id})
            
            if not event_data:
                return None
            
            return Event(
                event_id=event_data['event_id'],
                event_name=event_data['event_name'],
                event_type=event_data['event_type'],
                organizing_department=event_data['organizing_department'],
                short_description=event_data['short_description'],
                detailed_description=event_data['detailed_description'],
                start_date=event_data['start_date'],
                start_time=event_data['start_time'],
                end_date=event_data['end_date'],
                end_time=event_data['end_time'],
                venue=event_data['venue'],
                venue_id=event_data.get('venue_id'),
                mode=EventMode(event_data['mode']),
                status=EventStatus(event_data['status']),
                target_audience=event_data['target_audience'],
                faculty_organizers=event_data['faculty_organizers'],
                contacts=event_data['contacts'],
                registration_start_date=event_data['registration_start_date'],
                registration_end_date=event_data['registration_end_date'],
                certificate_end_date=event_data['certificate_end_date'],
                registration_mode=RegistrationMode(event_data['registration_mode']),
                team_size_min=event_data.get('team_size_min'),
                team_size_max=event_data.get('team_size_max'),
                max_participants=event_data['max_participants'],
                registration_type=event_data['registration_type'],
                registration_fee=event_data.get('registration_fee'),
                current_registrations=event_data.get('current_registrations', 0),
                created_at=event_data.get('created_at'),
                updated_at=event_data.get('updated_at')
            )
            
        except Exception as e:
            raise Exception(f"Failed to fetch event: {str(e)}")
    
    @strawberry.field
    async def event_statistics(self, event_id: str, info) -> Optional[EventStats]:
        """Get event statistics"""
        context = get_context(info)
        # Verify admin access
        if not context.get('user') or context['user'].get('user_type') != 'admin':
            raise Exception("Admin access required")
        
        try:
            db = await Database.get_database()
            
            # Get registration statistics
            registrations = await db.event_registrations.find({"event_id": event_id}).to_list(length=None)
            
            total_registrations = len(registrations)
            individual_registrations = len([r for r in registrations if r.get('registration_type') == 'individual'])
            team_registrations = len([r for r in registrations if r.get('registration_type') == 'team'])
            
            # Calculate total participants (including team members)
            total_participants = 0
            for reg in registrations:
                if reg.get('registration_type') == 'team':
                    total_participants += len(reg.get('team_members', []))
                else:
                    total_participants += 1
            
            attendance_marked = len([r for r in registrations if r.get('attendance_marked', False)])
            certificates_generated = len([r for r in registrations if r.get('certificate_generated', False)])
            
            # Get feedback statistics
            feedbacks = await db.feedbacks.find({"event_id": event_id}).to_list(length=None)
            feedback_received = len(feedbacks)
            
            average_rating = None
            if feedbacks:
                total_rating = sum([f.get('rating', 0) for f in feedbacks])
                average_rating = round(total_rating / len(feedbacks), 2)
            
            return EventStats(
                event_id=event_id,
                total_registrations=total_registrations,
                individual_registrations=individual_registrations,
                team_registrations=team_registrations,
                total_participants=total_participants,
                attendance_marked=attendance_marked,
                certificates_generated=certificates_generated,
                feedback_received=feedback_received,
                average_rating=average_rating
            )
            
        except Exception as e:
            raise Exception(f"Failed to fetch event statistics: {str(e)}")
    
    # Registration Queries
    @strawberry.field
    async def my_registrations(self, info) -> List[Registration]:
        """Get current user's event registrations"""
        context = get_context(info)
        user = context.get('user')
        if not user or user.get('user_type') != 'student':
            raise Exception("Student authentication required")
        
        try:
            db = await Database.get_database()
            registrations = await db.event_registrations.find({
                "student_enrollment": user['enrollment_no']
            }).to_list(length=None)
            
            result = []
            for reg in registrations:
                registration = Registration(
                    registration_id=reg['registration_id'],
                    event_id=reg['event_id'],
                    student_enrollment=reg['student_enrollment'],
                    registration_type=RegistrationMode(reg['registration_type']),
                    team_name=reg.get('team_name'),
                    team_members=reg.get('team_members', []),
                    registration_date=reg['registration_date'],
                    attendance_marked=reg.get('attendance_marked', False),
                    certificate_generated=reg.get('certificate_generated', False)
                )
                result.append(registration)
            
            return result
            
        except Exception as e:
            raise Exception(f"Failed to fetch registrations: {str(e)}")
    
    @strawberry.field
    async def registration_status(self, event_id: str, info) -> Optional[Registration]:
        """Check registration status for specific event"""
        context = get_context(info)
        user = context.get('user')
        if not user or user.get('user_type') != 'student':
            raise Exception("Student authentication required")
        
        try:
            db = await Database.get_database()
            reg_data = await db.event_registrations.find_one({
                "event_id": event_id,
                "student_enrollment": user['enrollment_no']
            })
            
            if not reg_data:
                return None
            
            return Registration(
                registration_id=reg_data['registration_id'],
                event_id=reg_data['event_id'],
                student_enrollment=reg_data['student_enrollment'],
                registration_type=RegistrationMode(reg_data['registration_type']),
                team_name=reg_data.get('team_name'),
                team_members=reg_data.get('team_members', []),
                registration_date=reg_data['registration_date'],
                attendance_marked=reg_data.get('attendance_marked', False),
                certificate_generated=reg_data.get('certificate_generated', False)
            )
            
        except Exception as e:
            raise Exception(f"Failed to check registration status: {str(e)}")
    
    # Certificate Queries
    @strawberry.field
    async def certificate_data(self, event_id: str, info) -> Optional[CertificateData]:
        """Get certificate data for student"""
        context = get_context(info)
        user = context.get('user')
        if not user or user.get('user_type') != 'student':
            raise Exception("Student authentication required")
        
        try:
            # Use existing certificate service logic
            from routes.client import get_certificate_data_endpoint
            # This would need to be adapted for GraphQL context
            # For now, return mock data
            return CertificateData(
                student_name=user['full_name'],
                enrollment_no=user['enrollment_no'],
                department=user['department'],
                event_name="Sample Event",
                event_date="2025-08-09",
                certificate_id="CERT-001",
                team_name=None
            )
            
        except Exception as e:
            raise Exception(f"Failed to get certificate data: {str(e)}")
    
    # Dashboard Queries
    @strawberry.field
    async def admin_dashboard(self, info) -> DashboardStats:
        """Get admin dashboard statistics"""
        context = get_context(info)
        if not context.get('user') or context['user'].get('user_type') != 'admin':
            raise Exception("Admin access required")
        
        try:
            db = await Database.get_database()
            
            # Get counts
            total_events = await db.events.count_documents({})
            active_events = await db.events.count_documents({"status": "active"})
            total_registrations = await db.event_registrations.count_documents({})
            pending_approvals = await db.events.count_documents({"status": "pending_approval"})
            certificates_generated = await db.event_registrations.count_documents({"certificate_generated": True})
            
            return DashboardStats(
                total_events=total_events,
                active_events=active_events,
                total_registrations=total_registrations,
                pending_approvals=pending_approvals,
                certificates_generated=certificates_generated
            )
            
        except Exception as e:
            raise Exception(f"Failed to fetch dashboard stats: {str(e)}")
    
    # Organizer Queries
    @strawberry.field
    async def organizer_access_status(self, info) -> OrganizerAccess:
        """Get faculty organizer access status"""
        context = get_context(info)
        user = context.get('user')
        if not user or user.get('user_type') != 'faculty':
            raise Exception("Faculty authentication required")
        
        try:
            # Use existing organizer service logic
            return OrganizerAccess(
                is_organizer=True,  # Mock data
                has_organizer_access=True,
                employee_id=user['employee_id'],
                full_name=user['full_name'],
                assigned_events=[],
                can_access_organizer_portal=True
            )
            
        except Exception as e:
            raise Exception(f"Failed to check organizer access: {str(e)}")

@strawberry.type
class Mutation:
    """GraphQL Mutation Root - All write operations"""
    
    # Authentication Mutations
    @strawberry.mutation
    async def login(self, credentials: LoginInput) -> AuthResponse:
        """Universal login for all user types"""
        try:
            # Determine user type based on provided credentials
            if credentials.username:
                # Admin login
                user_type = "admin"
                identifier = credentials.username
            elif credentials.enrollment_no:
                # Student login
                user_type = "student"
                identifier = credentials.enrollment_no
            elif credentials.employee_id:
                # Faculty login
                user_type = "faculty"
                identifier = credentials.employee_id
            else:
                return AuthResponse(
                    success=False,
                    message="Invalid credentials format"
                )
            
            # Use existing authentication logic
            # This would need to be adapted to work with GraphQL context
            # For now, return mock successful response
            
            return AuthResponse(
                success=True,
                message="Login successful",
                user=User(
                    username=credentials.username,
                    enrollment_no=credentials.enrollment_no,
                    employee_id=credentials.employee_id,
                    full_name="Mock User",
                    email="mock@example.com",
                    department="Mock Department",
                    user_type=UserType(user_type)
                ),
                redirect_url="/dashboard",
                auth_type="token",
                expires_in=3600
            )
            
        except Exception as e:
            return AuthResponse(
                success=False,
                message=f"Login failed: {str(e)}"
            )
    
    @strawberry.mutation
    async def logout(self, info) -> SuccessResponse:
        """Logout current user"""
        try:
            context = get_context(info)
            # Clear session/token in context
            # Implementation would depend on authentication setup
            
            return SuccessResponse(
                success=True,
                message="Logout successful"
            )
            
        except Exception as e:
            return SuccessResponse(
                success=False,
                message=f"Logout failed: {str(e)}"
            )
    
    @strawberry.mutation
    async def register_student(self, student_data: StudentRegistrationInput) -> AuthResponse:
        """Register new student"""
        try:
            # Use existing student registration logic
            # This would create the student in database
            
            return AuthResponse(
                success=True,
                message="Student registration successful",
                user=User(
                    enrollment_no=student_data.enrollment_no,
                    full_name=student_data.full_name,
                    email=student_data.email,
                    department=student_data.department,
                    user_type=UserType.STUDENT
                ),
                redirect_url="/client/dashboard"
            )
            
        except Exception as e:
            return AuthResponse(
                success=False,
                message=f"Registration failed: {str(e)}"
            )
    
    @strawberry.mutation
    async def register_faculty(self, faculty_data: FacultyRegistrationInput) -> AuthResponse:
        """Register new faculty"""
        try:
            # Use existing faculty registration logic
            
            return AuthResponse(
                success=True,
                message="Faculty registration successful",
                user=User(
                    employee_id=faculty_data.employee_id,
                    full_name=faculty_data.full_name,
                    email=faculty_data.email,
                    department=faculty_data.department,
                    user_type=UserType.FACULTY
                ),
                redirect_url="/faculty/profile"
            )
            
        except Exception as e:
            return AuthResponse(
                success=False,
                message=f"Registration failed: {str(e)}"
            )
    
    # Event Mutations
    @strawberry.mutation
    async def create_event(self, event_data: EventCreateInput, info) -> SuccessResponse:
        """Create new event (Admin only)"""
        context = get_context(info)
        if not context.get('user') or context['user'].get('user_type') != 'admin':
            raise Exception("Admin access required")
        
        try:
            db = await Database.get_database()
            
            # Convert GraphQL input to database document
            event_doc = {
                "event_id": event_data.event_id,
                "event_name": event_data.event_name,
                "event_type": event_data.event_type,
                "organizing_department": event_data.organizing_department,
                "short_description": event_data.short_description,
                "detailed_description": event_data.detailed_description,
                "start_date": event_data.start_date,
                "start_time": event_data.start_time,
                "end_date": event_data.end_date,
                "end_time": event_data.end_time,
                "venue": event_data.venue,
                "venue_id": event_data.venue_id,
                "mode": event_data.mode.value,
                "status": event_data.status,
                "target_audience": event_data.target_audience,
                "faculty_organizers": event_data.faculty_organizers,
                "contacts": event_data.contacts,
                "registration_start_date": event_data.registration_start_date,
                "registration_end_date": event_data.registration_end_date,
                "certificate_end_date": event_data.certificate_end_date,
                "registration_mode": event_data.registration_mode.value,
                "team_size_min": event_data.team_size_min,
                "team_size_max": event_data.team_size_max,
                "max_participants": event_data.max_participants,
                "registration_type": event_data.registration_type,
                "registration_fee": event_data.registration_fee,
                "created_at": datetime.utcnow().isoformat(),
                "created_by": context['user']['username']
            }
            
            result = await db.events.insert_one(event_doc)
            
            return SuccessResponse(
                success=True,
                message="Event created successfully",
                data=str(result.inserted_id)
            )
            
        except Exception as e:
            return SuccessResponse(
                success=False,
                message=f"Failed to create event: {str(e)}"
            )
    
    @strawberry.mutation
    async def update_event(self, event_id: str, event_data: EventCreateInput, info) -> SuccessResponse:
        """Update existing event"""
        context = get_context(info)
        if not context.get('user') or context['user'].get('user_type') != 'admin':
            raise Exception("Admin access required")
        
        try:
            db = await Database.get_database()
            
            # Build update document
            update_doc = {
                "event_name": event_data.event_name,
                "event_type": event_data.event_type,
                "organizing_department": event_data.organizing_department,
                "short_description": event_data.short_description,
                "detailed_description": event_data.detailed_description,
                "start_date": event_data.start_date,
                "start_time": event_data.start_time,
                "end_date": event_data.end_date,
                "end_time": event_data.end_time,
                "venue": event_data.venue,
                "venue_id": event_data.venue_id,
                "mode": event_data.mode.value,
                "status": event_data.status,
                "target_audience": event_data.target_audience,
                "faculty_organizers": event_data.faculty_organizers,
                "contacts": event_data.contacts,
                "registration_start_date": event_data.registration_start_date,
                "registration_end_date": event_data.registration_end_date,
                "certificate_end_date": event_data.certificate_end_date,
                "registration_mode": event_data.registration_mode.value,
                "team_size_min": event_data.team_size_min,
                "team_size_max": event_data.team_size_max,
                "max_participants": event_data.max_participants,
                "registration_type": event_data.registration_type,
                "registration_fee": event_data.registration_fee,
                "updated_at": datetime.utcnow().isoformat(),
                "updated_by": context['user']['username']
            }
            
            result = await db.events.update_one(
                {"event_id": event_id},
                {"$set": update_doc}
            )
            
            if result.matched_count == 0:
                return SuccessResponse(
                    success=False,
                    message="Event not found"
                )
            
            return SuccessResponse(
                success=True,
                message="Event updated successfully"
            )
            
        except Exception as e:
            return SuccessResponse(
                success=False,
                message=f"Failed to update event: {str(e)}"
            )
    
    @strawberry.mutation
    async def delete_event(self, event_id: str, info) -> SuccessResponse:
        """Delete event (Executive Admin+)"""
        context = get_context(info)
        user = context.get('user')
        if not user or user.get('user_type') != 'admin' or user.get('role') not in ['executive_admin', 'super_admin']:
            raise Exception("Executive Admin access required")
        
        try:
            db = await Database.get_database()
            
            result = await db.events.delete_one({"event_id": event_id})
            
            if result.deleted_count == 0:
                return SuccessResponse(
                    success=False,
                    message="Event not found"
                )
            
            return SuccessResponse(
                success=True,
                message="Event deleted successfully"
            )
            
        except Exception as e:
            return SuccessResponse(
                success=False,
                message=f"Failed to delete event: {str(e)}"
            )
    
    # Registration Mutations
    @strawberry.mutation
    async def register_individual(self, registration_data: IndividualRegistrationInput, info) -> RegistrationResponse:
        """Register for event individually"""
        context = get_context(info)
        user = context.get('user')
        if not user or user.get('user_type') != 'student':
            raise Exception("Student authentication required")
        
        try:
            # Use existing registration logic
            from core.id_generator import generate_registration_id
            
            registration_id = generate_registration_id()
            
            db = await Database.get_database()
            
            # Check if already registered
            existing = await db.event_registrations.find_one({
                "event_id": registration_data.event_id,
                "student_enrollment": user['enrollment_no']
            })
            
            if existing:
                return RegistrationResponse(
                    success=False,
                    message="Already registered for this event",
                    event_id=registration_data.event_id
                )
            
            # Create registration
            reg_doc = {
                "registration_id": registration_id,
                "event_id": registration_data.event_id,
                "student_enrollment": user['enrollment_no'],
                "registration_type": "individual",
                "registration_date": datetime.utcnow().isoformat(),
                "additional_fields": registration_data.additional_fields,
                "attendance_marked": False,
                "certificate_generated": False
            }
            
            await db.event_registrations.insert_one(reg_doc)
            
            return RegistrationResponse(
                success=True,
                message="Registration successful",
                registration_id=registration_id,
                event_id=registration_data.event_id
            )
            
        except Exception as e:
            return RegistrationResponse(
                success=False,
                message=f"Registration failed: {str(e)}",
                event_id=registration_data.event_id
            )
    
    @strawberry.mutation
    async def register_team(self, registration_data: TeamRegistrationInput, info) -> RegistrationResponse:
        """Register team for event"""
        context = get_context(info)
        user = context.get('user')
        if not user or user.get('user_type') != 'student':
            raise Exception("Student authentication required")
        
        try:
            from core.id_generator import generate_registration_id
            
            registration_id = generate_registration_id()
            
            db = await Database.get_database()
            
            # Check if already registered
            existing = await db.event_registrations.find_one({
                "event_id": registration_data.event_id,
                "student_enrollment": user['enrollment_no']
            })
            
            if existing:
                return RegistrationResponse(
                    success=False,
                    message="Already registered for this event",
                    event_id=registration_data.event_id
                )
            
            # Convert team members
            team_members = []
            for member in registration_data.team_members:
                team_members.append({
                    "enrollment_no": member.enrollment_no,
                    "full_name": member.full_name,
                    "email": member.email,
                    "department": member.department
                })
            
            # Create registration
            reg_doc = {
                "registration_id": registration_id,
                "event_id": registration_data.event_id,
                "student_enrollment": user['enrollment_no'],
                "registration_type": "team",
                "team_name": registration_data.team_name,
                "team_members": team_members,
                "registration_date": datetime.utcnow().isoformat(),
                "additional_fields": registration_data.additional_fields,
                "attendance_marked": False,
                "certificate_generated": False
            }
            
            await db.event_registrations.insert_one(reg_doc)
            
            return RegistrationResponse(
                success=True,
                message="Team registration successful",
                registration_id=registration_id,
                event_id=registration_data.event_id
            )
            
        except Exception as e:
            return RegistrationResponse(
                success=False,
                message=f"Team registration failed: {str(e)}",
                event_id=registration_data.event_id
            )
    
    @strawberry.mutation
    async def mark_attendance(self, event_id: str, attendance_code: Optional[str] = None, info=None) -> SuccessResponse:
        """Mark attendance for event"""
        context = get_context(info)
        user = context.get('user')
        if not user or user.get('user_type') != 'student':
            raise Exception("Student authentication required")
        
        try:
            db = await Database.get_database()
            
            # Find registration
            registration = await db.event_registrations.find_one({
                "event_id": event_id,
                "student_enrollment": user['enrollment_no']
            })
            
            if not registration:
                return SuccessResponse(
                    success=False,
                    message="Registration not found"
                )
            
            # Update attendance
            await db.event_registrations.update_one(
                {"registration_id": registration['registration_id']},
                {"$set": {"attendance_marked": True, "attendance_date": datetime.utcnow().isoformat()}}
            )
            
            return SuccessResponse(
                success=True,
                message="Attendance marked successfully"
            )
            
        except Exception as e:
            return SuccessResponse(
                success=False,
                message=f"Failed to mark attendance: {str(e)}"
            )
    
    @strawberry.mutation
    async def submit_feedback(self, feedback_data: FeedbackInput, info) -> SuccessResponse:
        """Submit event feedback"""
        context = get_context(info)
        user = context.get('user')
        if not user or user.get('user_type') != 'student':
            raise Exception("Student authentication required")
        
        try:
            db = await Database.get_database()
            
            feedback_doc = {
                "event_id": feedback_data.event_id,
                "student_enrollment": user['enrollment_no'],
                "rating": feedback_data.rating,
                "feedback_text": feedback_data.feedback_text,
                "suggestions": feedback_data.suggestions,
                "would_recommend": feedback_data.would_recommend,
                "submitted_at": datetime.utcnow().isoformat()
            }
            
            await db.feedbacks.insert_one(feedback_doc)
            
            return SuccessResponse(
                success=True,
                message="Feedback submitted successfully"
            )
            
        except Exception as e:
            return SuccessResponse(
                success=False,
                message=f"Failed to submit feedback: {str(e)}"
            )
    
    @strawberry.mutation
    async def send_certificate_email(self, certificate_data: CertificateEmailInput, info) -> SuccessResponse:
        """Send certificate via email"""
        context = get_context(info)
        user = context.get('user')
        if not user or user.get('user_type') != 'student':
            raise Exception("Student authentication required")
        
        try:
            # Use existing email service
            success = await communication_service.send_certificate_email(
                to_email=user['email'],
                student_name=user['full_name'],
                event_name="Event Name",  # Get from database
                pdf_base64=certificate_data.pdf_base64,
                file_name=certificate_data.file_name
            )
            
            if success:
                return SuccessResponse(
                    success=True,
                    message="Certificate sent successfully"
                )
            else:
                return SuccessResponse(
                    success=False,
                    message="Failed to send certificate"
                )
            
        except Exception as e:
            return SuccessResponse(
                success=False,
                message=f"Failed to send certificate: {str(e)}"
            )

# Create the GraphQL schema
schema = strawberry.Schema(query=Query, mutation=Mutation)
