"""
ID Generator Utility

This module provides functions to generate unique IDs for various entities
in the UCG system including registrations, certificates, attendance, etc.
"""

import hashlib
import secrets
import string
from datetime import datetime
from typing import Optional


def generate_base_id(prefix: str, length: int = 8) -> str:
    """Generate a base ID with given prefix and random string"""
    # Generate random alphanumeric string
    alphabet = string.ascii_uppercase + string.digits
    random_part = ''.join(secrets.choice(alphabet) for _ in range(length))
    return f"{prefix}{random_part}"


def generate_registration_id(enrollment_no: str, event_id: str, full_name: str) -> str:
    """
    Generate a unique registration ID for an event registration
    
    Args:
        enrollment_no: Student enrollment number
        event_id: Event ID
        full_name: Student's full name
    
    Returns:
        Unique registration ID
    """
    # Create a hash from the combination to ensure uniqueness
    combined = f"{enrollment_no}_{event_id}_{full_name}_{datetime.now().isoformat()}"
    hash_object = hashlib.md5(combined.encode())
    hash_hex = hash_object.hexdigest()[:6].upper()
    
    return f"REG{hash_hex}"


def generate_team_registration_id(team_name: str, event_id: str, leader_enrollment: str) -> str:
    """
    DEPRECATED: Generate a unique team registration ID
    
    This function is deprecated. Use the new ParticipationService instead.
    The new unified system handles both individual and team registrations
    through a single participation_id.
    
    Args:
        team_name: Name of the team
        event_id: Event ID
        leader_enrollment: Team leader's enrollment number
    
    Returns:
        Unique team registration ID
    """
    import warnings
    warnings.warn(
        "generate_team_registration_id is deprecated. Use ParticipationService instead.",
        DeprecationWarning,
        stacklevel=2
    )
    
    # Create a hash from the combination to ensure uniqueness
    combined = f"{team_name}_{event_id}_{leader_enrollment}_{datetime.now().isoformat()}"
    hash_object = hashlib.md5(combined.encode())
    hash_hex = hash_object.hexdigest()[:6].upper()
    
    return f"TEAM{hash_hex}"


def generate_attendance_id(enrollment_no: str, event_id: str) -> str:
    """
    Generate a unique attendance ID
    
    Args:
        enrollment_no: Student enrollment number
        event_id: Event ID
    
    Returns:
        Unique attendance ID
    """
    # Create a hash from the combination to ensure uniqueness
    combined = f"{enrollment_no}_{event_id}_attendance_{datetime.now().isoformat()}"
    hash_object = hashlib.md5(combined.encode())
    hash_hex = hash_object.hexdigest()[:6].upper()
    
    return f"ATT{hash_hex}"


def generate_virtual_attendance_id(enrollment_no: str, event_id: str) -> str:
    """
    Generate a unique virtual attendance ID for dual-layer attendance system
    
    Args:
        enrollment_no: Student enrollment number
        event_id: Event ID
    
    Returns:
        Unique virtual attendance ID (VATT{8digits})
    """
    # Create a hash from the combination to ensure uniqueness
    combined = f"{enrollment_no}_{event_id}_virtual_attendance_{datetime.now().isoformat()}"
    hash_object = hashlib.md5(combined.encode())
    hash_hex = hash_object.hexdigest()[:8].upper()
    
    return f"VATT{hash_hex}"


def generate_physical_attendance_id(enrollment_no: str, event_id: str, marked_by: str = "admin") -> str:
    """
    Generate a unique physical attendance ID for dual-layer attendance system
    
    Args:
        enrollment_no: Student enrollment number
        event_id: Event ID
        marked_by: Admin who marked the attendance
    
    Returns:
        Unique physical attendance ID (PATT{8digits})
    """
    # Create a hash from the combination to ensure uniqueness
    combined = f"{enrollment_no}_{event_id}_physical_attendance_{marked_by}_{datetime.now().isoformat()}"
    hash_object = hashlib.md5(combined.encode())
    hash_hex = hash_object.hexdigest()[:8].upper()
    
    return f"PATT{hash_hex}"


def generate_feedback_id(enrollment_no: str, event_id: str) -> str:
    """
    Generate a unique feedback ID
    
    Args:
        enrollment_no: Student enrollment number
        event_id: Event ID
    
    Returns:
        Unique feedback ID
    """
    # Create a hash from the combination to ensure uniqueness
    combined = f"{enrollment_no}_{event_id}_feedback_{datetime.now().isoformat()}"
    hash_object = hashlib.md5(combined.encode())
    hash_hex = hash_object.hexdigest()[:6].upper()
    
    return f"FDB{hash_hex}"


def generate_certificate_id(enrollment_no: str, event_id: str, full_name: str) -> str:
    """
    Generate a unique certificate ID
    
    Args:
        enrollment_no: Student enrollment number
        event_id: Event ID
        full_name: Student's full name
    
    Returns:
        Unique certificate ID
    """
    # Create a hash from the combination to ensure uniqueness
    combined = f"{enrollment_no}_{event_id}_{full_name}_certificate_{datetime.now().isoformat()}"
    hash_object = hashlib.md5(combined.encode())
    hash_hex = hash_object.hexdigest()[:8].upper()
    
    return f"CERT{hash_hex}"


def generate_event_id(event_name: str, organizing_department: Optional[str] = None) -> str:
    """
    Generate a unique event ID
    
    Args:
        event_name: Name of the event
        organizing_department: Department organizing the event
    
    Returns:
        Unique event ID
    """
    # Create a base from event name and department
    base_text = event_name.lower().replace(' ', '_')
    if organizing_department:
        base_text += f"_{organizing_department.lower().replace(' ', '_')}"
    
    # Add timestamp for uniqueness
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Create hash for shortening
    combined = f"{base_text}_{timestamp}"
    hash_object = hashlib.md5(combined.encode())
    hash_hex = hash_object.hexdigest()[:6].upper()
    
    return f"EVT{hash_hex}"


def generate_admin_id(username: str) -> str:
    """
    Generate a unique admin user ID
    
    Args:
        username: Admin username
    
    Returns:
        Unique admin ID
    """
    # Create a hash from username and timestamp
    combined = f"{username}_{datetime.now().isoformat()}"
    hash_object = hashlib.md5(combined.encode())
    hash_hex = hash_object.hexdigest()[:6].upper()
    
    return f"ADM{hash_hex}"


def generate_payment_id(registration_id: str, amount: float) -> str:
    """
    Generate a unique payment ID
    
    Args:
        registration_id: Associated registration ID
        amount: Payment amount
    
    Returns:
        Unique payment ID
    """
    # Create a hash from registration and payment details
    combined = f"{registration_id}_{amount}_{datetime.now().isoformat()}"
    hash_object = hashlib.md5(combined.encode())
    hash_hex = hash_object.hexdigest()[:6].upper()
    
    return f"PAY{hash_hex}"


def generate_session_id() -> str:
    """
    Generate a secure session ID
    
    Returns:
        Secure session ID
    """
    return secrets.token_urlsafe(32)


def generate_api_key(prefix: str = "UCG") -> str:
    """
    Generate a secure API key
    
    Args:
        prefix: Prefix for the API key
    
    Returns:
        Secure API key
    """
    random_part = secrets.token_urlsafe(24)
    return f"{prefix}_{random_part}"


def validate_id_format(id_value: str, expected_prefix: str) -> bool:
    """
    Validate if an ID has the correct format
    
    Args:
        id_value: ID value to validate
        expected_prefix: Expected prefix (e.g., "REG", "CERT", etc.)
    
    Returns:
        True if valid format, False otherwise
    """
    if not id_value or not isinstance(id_value, str):
        return False
    
    return id_value.startswith(expected_prefix) and len(id_value) > len(expected_prefix)


# Utility functions for ID manipulation

def extract_prefix(id_value: str) -> Optional[str]:
    """Extract prefix from an ID"""
    if not id_value:
        return None
    
    # Find where the prefix ends (first digit)
    for i, char in enumerate(id_value):
        if char.isdigit():
            return id_value[:i]
    
    return id_value  # If no digits found, return the whole string


def get_id_type(id_value: str) -> Optional[str]:
    """Get the type of ID based on its prefix"""
    prefix = extract_prefix(id_value)
    
    id_types = {
        "REG": "registration",
        "TEAM": "team_registration", 
        "ATT": "attendance",
        "VATT": "virtual_attendance",
        "PATT": "physical_attendance",
        "FDB": "feedback",
        "CERT": "certificate",
        "EVT": "event",
        "ADM": "admin",
        "PAY": "payment"
    }
    
    return id_types.get(prefix)


def is_valid_registration_id(id_value: str) -> bool:
    """Check if the ID is a valid registration ID"""
    return validate_id_format(id_value, "REG")


def is_valid_certificate_id(id_value: str) -> bool:
    """Check if the ID is a valid certificate ID"""
    return validate_id_format(id_value, "CERT")


def is_valid_attendance_id(id_value: str) -> bool:
    """Check if the ID is a valid attendance ID"""
    return validate_id_format(id_value, "ATT")


def is_valid_virtual_attendance_id(id_value: str) -> bool:
    """Check if the ID is a valid virtual attendance ID"""
    return validate_id_format(id_value, "VATT")


def is_valid_physical_attendance_id(id_value: str) -> bool:
    """Check if the ID is a valid physical attendance ID"""
    return validate_id_format(id_value, "PATT")


def is_valid_feedback_id(id_value: str) -> bool:
    """Check if the ID is a valid feedback ID"""
    return validate_id_format(id_value, "FDB")


# Batch ID generation functions

def generate_bulk_registration_ids(count: int, event_id: str) -> list:
    """Generate multiple registration IDs for bulk operations"""
    ids = []
    for i in range(count):
        # Use a counter to ensure uniqueness
        combined = f"bulk_{event_id}_{i}_{datetime.now().isoformat()}"
        hash_object = hashlib.md5(combined.encode())
        hash_hex = hash_object.hexdigest()[:6].upper()
        ids.append(f"REG{hash_hex}")
    
    return ids


def generate_bulk_certificate_ids(enrollment_numbers: list, event_id: str) -> dict:
    """Generate certificate IDs for multiple students"""
    certificate_ids = {}
    
    for enrollment_no in enrollment_numbers:
        cert_id = generate_certificate_id(enrollment_no, event_id, f"Student_{enrollment_no}")
        certificate_ids[enrollment_no] = cert_id
    
    return certificate_ids


def generate_notification_id() -> str:
    """
    Generate a unique notification ID
    
    Returns:
        Unique notification ID in format NOT{8-digit-code}
    """
    return generate_base_id("NOT", 8)


def generate_audit_id() -> str:
    """
    Generate a unique audit log ID
    
    Returns:
        Unique audit log ID in format AUD{8-digit-code}
    """
    return generate_base_id("AUD", 8)


# Generic ID generator function for backwards compatibility
def generate_id(prefix: str = "ID", length: int = 8) -> str:
    """
    Generate a generic unique ID with specified prefix
    
    Args:
        prefix: Prefix for the ID
        length: Length of the random part
    
    Returns:
        Unique ID in format {prefix}{random-code}
    """
    return generate_base_id(prefix, length)
