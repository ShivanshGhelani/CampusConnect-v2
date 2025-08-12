#!/usr/bin/env python3
"""
Debug cultural dance competition
"""

from datetime import datetime, timedelta
from models.dynamic_attendance import AttendanceStrategy, AttendanceIntelligenceService

# Test the cultural dance competition
cultural_dance = {
    "event_id": "DANCE_REAL",
    "event_name": "Annual Dance Championship Cultural Festival",
    "event_type": "cultural",
    "detailed_description": "Cultural dance competition with registration, performance rounds and award ceremony at the annual fest",
    "start_datetime": datetime.utcnow() + timedelta(hours=6),
    "end_datetime": datetime.utcnow() + timedelta(hours=12),
    "registration_mode": "individual"
}

duration = cultural_dance["end_datetime"] - cultural_dance["start_datetime"]
print(f"Duration: {duration.total_seconds() / 3600} hours")

strategy = AttendanceIntelligenceService.detect_attendance_strategy(cultural_dance)
print(f"Detected strategy: {strategy}")
print(f"Expected: {AttendanceStrategy.MILESTONE_BASED}")
print(f"Match: {strategy == AttendanceStrategy.MILESTONE_BASED}")
