#!/usr/bin/env python3
"""
Debug script for unknown medium event
"""

from datetime import datetime
from models.dynamic_attendance import AttendanceStrategy, AttendanceIntelligenceService

# Test the problematic case
unknown_medium = {
    "event_name": "Mystery Long Event",
    "event_type": "unknown",
    "detailed_description": "Some longer event with no clear category",
    "start_datetime": datetime(2024, 5, 1, 9, 0),
    "end_datetime": datetime(2024, 5, 1, 19, 0),  # 10 hours
    "registration_mode": "individual"
}

print("Debug: Unknown medium event details:")
print(f"Duration: {(unknown_medium['end_datetime'] - unknown_medium['start_datetime']).total_seconds() / 3600} hours")

# Let's manually debug the detection process
event_name = unknown_medium.get("event_name", "").lower()
event_type = unknown_medium.get("event_type", "").lower()
description = unknown_medium.get("detailed_description", "").lower()
combined_text = f"{event_name} {event_type} {description}"

print(f"Combined text: '{combined_text}'")

start_time = unknown_medium.get("start_datetime")
end_time = unknown_medium.get("end_datetime")
duration_hours = (end_time - start_time).total_seconds() / 3600
duration_days = (end_time - start_time).days

print(f"Duration hours: {duration_hours}")
print(f"Duration days: {duration_days}")

# Check what strategy gets detected
strategy = AttendanceIntelligenceService.detect_attendance_strategy(unknown_medium)
print(f"Detected strategy: {strategy}")

# Expected: Should be SESSION_BASED for 10-hour unknown event
print(f"Expected: {AttendanceStrategy.SESSION_BASED}")
print(f"Match: {strategy == AttendanceStrategy.SESSION_BASED}")
