"""
GraphQL Schema Definitions for CampusConnect API v2
Comprehensive GraphQL implementation based on existing REST API structure
"""

import strawberry
from typing import List, Optional, Union
from datetime import datetime
from enum import Enum

# Enums
@strawberry.enum
class UserType(Enum):
    ADMIN = "admin"
    STUDENT = "student"
    FACULTY = "faculty"

@strawberry.enum
class EventStatus(Enum):
    UPCOMING = "upcoming"
    REGISTRATION_OPEN = "registration_open"
    REGISTRATION_CLOSED = "registration_closed"
    ONGOING = "ongoing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

@strawberry.enum
class RegistrationMode(Enum):
    INDIVIDUAL = "individual"
    TEAM = "team"

@strawberry.enum
class EventMode(Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    HYBRID = "hybrid"

@strawberry.enum
class AdminRole(Enum):
    SUPER_ADMIN = "super_admin"
    EXECUTIVE_ADMIN = "executive_admin"
    ORGANIZER_ADMIN = "organizer_admin"

@strawberry.enum
class Gender(Enum):
    MALE = "Male"
    FEMALE = "Female"
    OTHER = "Other"
    PREFER_NOT_TO_SAY = "Prefer not to say"

# Input Types
@strawberry.input
class LoginInput:
    username: Optional[str] = None
    enrollment_no: Optional[str] = None
    employee_id: Optional[str] = None
    password: str
    remember_me: Optional[bool] = False

@strawberry.input
class StudentRegistrationInput:
    full_name: str
    enrollment_no: str
    email: str
    mobile_no: str
    gender: Gender
    date_of_birth: str
    department: str
    semester: int
    password: str

@strawberry.input
class FacultyRegistrationInput:
    employee_id: str
    full_name: str
    email: str
    contact_no: str
    department: str
    designation: str
    qualification: str
    specialization: Optional[str] = None
    experience_years: int
    gender: Gender
    date_of_birth: str
    password: str

@strawberry.input
class EventCreateInput:
    event_id: str
    event_name: str
    event_type: str
    organizing_department: str
    short_description: str
    detailed_description: str
    start_date: str
    start_time: str
    end_date: str
    end_time: str
    venue: str
    venue_id: Optional[str] = None
    mode: EventMode
    status: str
    target_audience: List[str]
    faculty_organizers: List[str]
    contacts: List[str]
    registration_start_date: str
    registration_end_date: str
    certificate_end_date: str
    registration_mode: RegistrationMode
    team_size_min: Optional[int] = None
    team_size_max: Optional[int] = None
    max_participants: int
    registration_type: str
    registration_fee: Optional[float] = None

@strawberry.input
class EventFilterInput:
    status: Optional[EventStatus] = None
    category: Optional[str] = None
    department: Optional[str] = None
    event_type: Optional[str] = None
    start_date_from: Optional[str] = None
    start_date_to: Optional[str] = None

@strawberry.input
class TeamMemberInput:
    enrollment_no: str
    full_name: str
    email: str
    department: str

@strawberry.input
class TeamRegistrationInput:
    event_id: str
    team_name: str
    team_members: List[TeamMemberInput]
    additional_fields: Optional[str] = None

@strawberry.input
class IndividualRegistrationInput:
    event_id: str
    additional_fields: Optional[str] = None

@strawberry.input
class FeedbackInput:
    event_id: str
    rating: int
    feedback_text: Optional[str] = None
    suggestions: Optional[str] = None
    would_recommend: Optional[bool] = None

@strawberry.input
class CertificateEmailInput:
    event_id: str
    enrollment_no: str
    pdf_base64: str
    file_name: str

# Basic Types
@strawberry.type
class User:
    username: Optional[str] = None
    enrollment_no: Optional[str] = None
    employee_id: Optional[str] = None
    full_name: str
    email: str
    department: str
    user_type: UserType
    role: Optional[str] = None

@strawberry.type
class Student:
    enrollment_no: str
    full_name: str
    email: str
    mobile_no: str
    gender: Gender
    date_of_birth: str
    department: str
    semester: int
    user_type: UserType = UserType.STUDENT

@strawberry.type
class Faculty:
    employee_id: str
    full_name: str
    email: str
    contact_no: str
    department: str
    designation: str
    qualification: str
    specialization: Optional[str] = None
    experience_years: int
    gender: Gender
    date_of_birth: str
    user_type: UserType = UserType.FACULTY

@strawberry.type
class Admin:
    username: str
    fullname: str
    email: str
    role: AdminRole
    department: str
    user_type: UserType = UserType.ADMIN

@strawberry.type
class Event:
    event_id: str
    event_name: str
    event_type: str
    organizing_department: str
    short_description: str
    detailed_description: str
    start_date: str
    start_time: str
    end_date: str
    end_time: str
    venue: str
    venue_id: Optional[str] = None
    mode: EventMode
    status: EventStatus
    target_audience: List[str]
    faculty_organizers: List[str]
    contacts: List[str]
    registration_start_date: str
    registration_end_date: str
    certificate_end_date: str
    registration_mode: RegistrationMode
    team_size_min: Optional[int] = None
    team_size_max: Optional[int] = None
    max_participants: int
    registration_type: str
    registration_fee: Optional[float] = None
    current_registrations: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

@strawberry.type
class Registration:
    registration_id: str
    event_id: str
    student_enrollment: str
    registration_type: RegistrationMode
    team_name: Optional[str] = None
    team_members: Optional[List[str]] = None
    registration_date: str
    attendance_marked: bool = False
    certificate_generated: bool = False

@strawberry.type
class EventStats:
    event_id: str
    total_registrations: int
    individual_registrations: int
    team_registrations: int
    total_participants: int
    attendance_marked: int
    certificates_generated: int
    feedback_received: int
    average_rating: Optional[float] = None

@strawberry.type
class CertificateData:
    student_name: str
    enrollment_no: str
    department: str
    event_name: str
    event_date: str
    certificate_id: str
    team_name: Optional[str] = None

@strawberry.type
class CertificateTemplate:
    template_content: str
    template_type: str
    event_id: str

# Response Types
@strawberry.type
class AuthResponse:
    success: bool
    message: str
    user: Optional[User] = None
    redirect_url: Optional[str] = None
    auth_type: Optional[str] = None
    expires_in: Optional[int] = None

@strawberry.type
class SuccessResponse:
    success: bool
    message: str
    data: Optional[str] = None

@strawberry.type
class EventListResponse:
    events: List[Event]
    total_count: int
    page: int
    limit: int
    has_next: bool

@strawberry.type
class RegistrationResponse:
    success: bool
    message: str
    registration_id: Optional[str] = None
    event_id: str

@strawberry.type
class DashboardStats:
    total_events: int
    active_events: int
    total_registrations: int
    pending_approvals: int
    certificates_generated: int

@strawberry.type
class OrganizerAccess:
    is_organizer: bool
    has_organizer_access: bool
    employee_id: str
    full_name: str
    assigned_events: List[str]
    can_access_organizer_portal: bool

# Union Types for flexible user authentication
@strawberry.type
class AuthUser:
    user_type: UserType
    user_data: Union[Admin, Student, Faculty]

# Error Types
@strawberry.type
class GraphQLError:
    message: str
    code: str
    field: Optional[str] = None
