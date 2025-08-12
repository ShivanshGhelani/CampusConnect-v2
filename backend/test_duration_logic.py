#!/usr/bin/env python3
"""
Enhanced Duration-Based Attendance Strategy Detection Tests
Tests the refined logic for duration-sensitive event classification
"""

from datetime import datetime, timedelta
from models.dynamic_attendance import AttendanceStrategy, AttendanceIntelligenceService

def test_industrial_visit_duration_logic():
    """Test industrial visit classification based on duration"""
    print("=== TESTING INDUSTRIAL VISIT DURATION LOGIC ===")
    
    # Test 1: Single-day industrial visit (4 hours) - Should be SINGLE_MARK
    single_day_visit = {
        "event_name": "Industrial Visit to Tech Park",
        "event_type": "industrial visit",
        "detailed_description": "Visit to local manufacturing plant for engineering students",
        "start_datetime": datetime(2024, 3, 15, 9, 0),
        "end_datetime": datetime(2024, 3, 15, 13, 0),  # 4 hours
        "registration_mode": "individual"
    }
    
    strategy = AttendanceIntelligenceService.detect_attendance_strategy(single_day_visit)
    print(f"✓ Single-day industrial visit (4 hrs): {strategy}")
    assert strategy == AttendanceStrategy.SINGLE_MARK, f"Expected SINGLE_MARK, got {strategy}"
    
    # Test 2: Single-day long industrial visit (8 hours) - Should be SINGLE_MARK
    long_single_visit = {
        "event_name": "Extended Industrial Visit",
        "event_type": "industry visit",
        "detailed_description": "Full-day industrial plant tour and workshop",
        "start_datetime": datetime(2024, 3, 15, 8, 0),
        "end_datetime": datetime(2024, 3, 15, 16, 0),  # 8 hours
        "registration_mode": "individual"
    }
    
    strategy = AttendanceIntelligenceService.detect_attendance_strategy(long_single_visit)
    print(f"✓ Long single-day industrial visit (8 hrs): {strategy}")
    assert strategy == AttendanceStrategy.SINGLE_MARK, f"Expected SINGLE_MARK, got {strategy}"
    
    # Test 3: Multi-day industrial program - Should be DAY_BASED
    multi_day_visit = {
        "event_name": "Industrial Training Program",
        "event_type": "industrial visit",
        "detailed_description": "Three-day industrial training and hands-on experience",
        "start_datetime": datetime(2024, 3, 15, 9, 0),
        "end_datetime": datetime(2024, 3, 17, 17, 0),  # 3 days
        "registration_mode": "individual"
    }
    
    strategy = AttendanceIntelligenceService.detect_attendance_strategy(multi_day_visit)
    print(f"✓ Multi-day industrial visit (3 days): {strategy}")
    assert strategy == AttendanceStrategy.DAY_BASED, f"Expected DAY_BASED, got {strategy}"
    
    print("✅ All industrial visit duration tests passed!\n")

def test_hackathon_duration_logic():
    """Test hackathon classification based on duration"""
    print("=== TESTING HACKATHON DURATION LOGIC ===")
    
    # Test 1: Short hackathon (6 hours) - Should be SESSION_BASED
    short_hackathon = {
        "event_name": "Code Sprint Challenge",
        "event_type": "hackathon",
        "detailed_description": "6-hour coding challenge for beginners",
        "start_datetime": datetime(2024, 3, 16, 10, 0),
        "end_datetime": datetime(2024, 3, 16, 16, 0),  # 6 hours
        "registration_mode": "team"
    }
    
    strategy = AttendanceIntelligenceService.detect_attendance_strategy(short_hackathon)
    print(f"✓ Short hackathon (6 hrs): {strategy}")
    assert strategy == AttendanceStrategy.SESSION_BASED, f"Expected SESSION_BASED, got {strategy}"
    
    # Test 2: Standard 24-hour hackathon - Should be SESSION_BASED
    standard_hackathon = {
        "event_name": "24-Hour Hackathon Marathon",
        "event_type": "hackathon",
        "detailed_description": "24-hour non-stop coding marathon with prizes",
        "start_datetime": datetime(2024, 3, 16, 18, 0),
        "end_datetime": datetime(2024, 3, 17, 18, 0),  # 24 hours
        "registration_mode": "team"
    }
    
    strategy = AttendanceIntelligenceService.detect_attendance_strategy(standard_hackathon)
    print(f"✓ Standard 24-hour hackathon: {strategy}")
    assert strategy == AttendanceStrategy.SESSION_BASED, f"Expected SESSION_BASED, got {strategy}"
    
    # Test 3: Extended 48-hour hackathon - Should be SESSION_BASED
    extended_hackathon = {
        "event_name": "Weekend Hackathon Challenge",
        "event_type": "coding marathon",
        "detailed_description": "48-hour intensive hackathon with mentoring sessions",
        "start_datetime": datetime(2024, 3, 16, 9, 0),
        "end_datetime": datetime(2024, 3, 18, 9, 0),  # 48 hours
        "registration_mode": "team"
    }
    
    strategy = AttendanceIntelligenceService.detect_attendance_strategy(extended_hackathon)
    print(f"✓ Extended 48-hour hackathon: {strategy}")
    assert strategy == AttendanceStrategy.SESSION_BASED, f"Expected SESSION_BASED, got {strategy}"
    
    print("✅ All hackathon duration tests passed!\n")

def test_workshop_duration_logic():
    """Test workshop classification based on duration"""
    print("=== TESTING WORKSHOP DURATION LOGIC ===")
    
    # Test 1: Short workshop (2 hours) - Should be SINGLE_MARK
    short_workshop = {
        "event_name": "Introduction to AI",
        "event_type": "workshop",
        "detailed_description": "Quick intro workshop on artificial intelligence basics",
        "start_datetime": datetime(2024, 3, 20, 14, 0),
        "end_datetime": datetime(2024, 3, 20, 16, 0),  # 2 hours
        "registration_mode": "individual"
    }
    
    strategy = AttendanceIntelligenceService.detect_attendance_strategy(short_workshop)
    print(f"✓ Short workshop (2 hrs): {strategy}")
    assert strategy == AttendanceStrategy.SINGLE_MARK, f"Expected SINGLE_MARK, got {strategy}"
    
    # Test 2: Long single-day workshop (8 hours) - Should be SINGLE_MARK
    long_workshop = {
        "event_name": "Full-Day Python Bootcamp",
        "event_type": "training workshop",
        "detailed_description": "Intensive 8-hour Python programming workshop",
        "start_datetime": datetime(2024, 3, 20, 9, 0),
        "end_datetime": datetime(2024, 3, 20, 17, 0),  # 8 hours
        "registration_mode": "individual"
    }
    
    strategy = AttendanceIntelligenceService.detect_attendance_strategy(long_workshop)
    print(f"✓ Long single-day workshop (8 hrs): {strategy}")
    assert strategy == AttendanceStrategy.SINGLE_MARK, f"Expected SINGLE_MARK, got {strategy}"
    
    # Test 3: Multi-day workshop (3 days) - Should be DAY_BASED
    multi_day_workshop = {
        "event_name": "Web Development Bootcamp",
        "event_type": "training workshop",
        "detailed_description": "Three-day intensive web development training program",
        "start_datetime": datetime(2024, 3, 20, 9, 0),
        "end_datetime": datetime(2024, 3, 22, 17, 0),  # 3 days
        "registration_mode": "individual"
    }
    
    strategy = AttendanceIntelligenceService.detect_attendance_strategy(multi_day_workshop)
    print(f"✓ Multi-day workshop (3 days): {strategy}")
    assert strategy == AttendanceStrategy.DAY_BASED, f"Expected DAY_BASED, got {strategy}"
    
    print("✅ All workshop duration tests passed!\n")

def test_field_trip_logic():
    """Test field trip classification"""
    print("=== TESTING FIELD TRIP LOGIC ===")
    
    # Test 1: Standard field trip (6 hours) - Should be SINGLE_MARK
    field_trip = {
        "event_name": "Science Museum Field Trip",
        "event_type": "field trip",
        "detailed_description": "Educational visit to the science and technology museum",
        "start_datetime": datetime(2024, 3, 25, 9, 0),
        "end_datetime": datetime(2024, 3, 25, 15, 0),  # 6 hours
        "registration_mode": "individual"
    }
    
    strategy = AttendanceIntelligenceService.detect_attendance_strategy(field_trip)
    print(f"✓ Standard field trip (6 hrs): {strategy}")
    assert strategy == AttendanceStrategy.SINGLE_MARK, f"Expected SINGLE_MARK, got {strategy}"
    
    print("✅ Field trip test passed!\n")

def test_conference_duration_logic():
    """Test conference classification based on duration"""
    print("=== TESTING CONFERENCE DURATION LOGIC ===")
    
    # Test 1: Single-day conference - Should be SINGLE_MARK
    single_day_conf = {
        "event_name": "Tech Innovation Conference",
        "event_type": "conference",
        "detailed_description": "One-day conference on emerging technologies",
        "start_datetime": datetime(2024, 4, 5, 9, 0),
        "end_datetime": datetime(2024, 4, 5, 17, 0),  # 8 hours
        "registration_mode": "individual"
    }
    
    strategy = AttendanceIntelligenceService.detect_attendance_strategy(single_day_conf)
    print(f"✓ Single-day conference: {strategy}")
    assert strategy == AttendanceStrategy.SINGLE_MARK, f"Expected SINGLE_MARK, got {strategy}"
    
    # Test 2: Multi-day conference - Should have DAY_BASED influence
    multi_day_conf = {
        "event_name": "International Tech Summit",
        "event_type": "conference",
        "detailed_description": "Three-day international conference with multiple tracks",
        "start_datetime": datetime(2024, 4, 5, 9, 0),
        "end_datetime": datetime(2024, 4, 7, 17, 0),  # 3 days
        "registration_mode": "individual"
    }
    
    strategy = AttendanceIntelligenceService.detect_attendance_strategy(multi_day_conf)
    print(f"✓ Multi-day conference: {strategy}")
    # Multi-day conference could be either SINGLE_MARK or DAY_BASED depending on scoring
    assert strategy in [AttendanceStrategy.SINGLE_MARK, AttendanceStrategy.DAY_BASED], f"Expected SINGLE_MARK or DAY_BASED, got {strategy}"
    
    print("✅ Conference duration tests passed!\n")

def test_edge_cases():
    """Test edge cases and fallback logic"""
    print("=== TESTING EDGE CASES ===")
    
    # Test 1: Unknown event type with short duration - Should be SINGLE_MARK
    unknown_short = {
        "event_name": "Mystery Event",
        "event_type": "unknown",
        "detailed_description": "Some event with no clear category",
        "start_datetime": datetime(2024, 5, 1, 10, 0),
        "end_datetime": datetime(2024, 5, 1, 12, 0),  # 2 hours
        "registration_mode": "individual"
    }
    
    strategy = AttendanceIntelligenceService.detect_attendance_strategy(unknown_short)
    print(f"✓ Unknown short event: {strategy}")
    assert strategy == AttendanceStrategy.SINGLE_MARK, f"Expected SINGLE_MARK, got {strategy}"
    
    # Test 2: Unknown event type with medium duration - Should be SESSION_BASED
    unknown_medium = {
        "event_name": "Mystery Long Event",
        "event_type": "unknown",
        "detailed_description": "Some longer event with no clear category",
        "start_datetime": datetime(2024, 5, 1, 9, 0),
        "end_datetime": datetime(2024, 5, 1, 19, 0),  # 10 hours
        "registration_mode": "individual"
    }
    
    strategy = AttendanceIntelligenceService.detect_attendance_strategy(unknown_medium)
    print(f"✓ Unknown medium event: {strategy}")
    assert strategy == AttendanceStrategy.SESSION_BASED, f"Expected SESSION_BASED, got {strategy}"
    
    # Test 3: Event with no datetime info - Should be SINGLE_MARK (fallback)
    no_datetime = {
        "event_name": "Event Without Time",
        "event_type": "seminar",
        "detailed_description": "Event with missing datetime information",
        "registration_mode": "individual"
    }
    
    strategy = AttendanceIntelligenceService.detect_attendance_strategy(no_datetime)
    print(f"✓ Event without datetime: {strategy}")
    assert strategy == AttendanceStrategy.SINGLE_MARK, f"Expected SINGLE_MARK, got {strategy}"
    
    print("✅ All edge case tests passed!\n")

def run_all_duration_tests():
    """Run comprehensive duration-based strategy detection tests"""
    print("🚀 STARTING ENHANCED DURATION-BASED ATTENDANCE STRATEGY TESTS")
    print("=" * 70)
    
    try:
        test_industrial_visit_duration_logic()
        test_hackathon_duration_logic()
        test_workshop_duration_logic()
        test_field_trip_logic()
        test_conference_duration_logic()
        test_edge_cases()
        
        print("🎉 ALL DURATION-BASED STRATEGY TESTS PASSED!")
        print("✅ Enhanced logic correctly handles:")
        print("   • Single-day vs multi-day industrial visits")
        print("   • Various hackathon durations (6h, 24h, 48h)")
        print("   • Workshop duration sensitivity")
        print("   • Field trip classification")
        print("   • Conference duration handling")
        print("   • Edge cases and fallback scenarios")
        print("=" * 70)
        
        return True
        
    except AssertionError as e:
        print(f"❌ TEST FAILED: {e}")
        return False
    except Exception as e:
        print(f"💥 UNEXPECTED ERROR: {e}")
        return False

if __name__ == "__main__":
    success = run_all_duration_tests()
    exit(0 if success else 1)
