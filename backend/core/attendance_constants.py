"""
Attendance System Constants

This module contains constants and enums for the dual-layer attendance verification system.
"""

from enum import Enum

class AttendanceStatus(str, Enum):
    """Final attendance status enumeration for dual-layer attendance system"""
    ABSENT = "absent"
    VIRTUAL_ONLY = "virtual_only"
    PHYSICAL_ONLY = "physical_only"
    PRESENT = "present"

# Attendance ID prefixes
VIRTUAL_ATTENDANCE_PREFIX = "VATT"
PHYSICAL_ATTENDANCE_PREFIX = "PATT"
REGISTRATION_PREFIX = "REG"
TEAM_REGISTRATION_PREFIX = "TEAM"

# Default attendance status
DEFAULT_ATTENDANCE_STATUS = AttendanceStatus.ABSENT

# Attendance validation rules
ATTENDANCE_RULES = {
    "virtual_required": True,  # Virtual attendance is required
    "physical_required": True,  # Physical attendance is required
    "allow_partial": True,     # Allow partial attendance (virtual or physical only)
    "final_status_auto_update": True,  # Auto-update final status when attendance is marked
}
