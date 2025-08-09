"""
Complete GraphQL Schema with Subscriptions
Updated resolvers.py to include subscription support
"""

import strawberry
from typing import List, Optional, Dict, Any
from fastapi import HTTPException
import asyncio
from datetime import datetime

from api.v2.schema import *
from api.v2.context import get_context
from api.v2.subscriptions import Subscription
from config.database import Database

# Import existing services
from services.communication.email_service import communication_service

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
    
    # Additional Query methods...
    # (Previous implementation continues here)
    
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

@strawberry.type
class Mutation:
    """GraphQL Mutation Root - All write operations"""
    
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
            
            # Mock successful response - integrate with actual auth logic
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
    
    # Additional Mutation methods...
    # (Previous implementation continues here)

# Create the GraphQL schema with subscription support
schema = strawberry.Schema(
    query=Query, 
    mutation=Mutation, 
    subscription=Subscription
)
