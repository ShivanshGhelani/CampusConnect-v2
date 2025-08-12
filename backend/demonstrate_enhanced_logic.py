#!/usr/bin/env python3
"""
Enhanced Duration-Based Attendance Strategy Demonstration
Shows the improved logic for intelligent event-type and duration-based classification
"""

from datetime import datetime, timedelta
from models.dynamic_attendance import AttendanceStrategy, AttendanceIntelligenceService

def demonstrate_enhanced_duration_logic():
    """Demonstrate the enhanced duration-based classification"""
    print("🎯 ENHANCED DURATION-BASED ATTENDANCE STRATEGY DEMONSTRATION")
    print("=" * 80)
    print("Showcasing intelligent classification based on event type AND duration")
    print()
    
    # Test cases demonstrating the enhancement
    test_cases = [
        {
            "title": "Industrial Visit - Duration Intelligence",
            "scenarios": [
                {
                    "name": "Short Factory Visit (4 hours)",
                    "event": {
                        "event_name": "Tech Company Visit",
                        "event_type": "industrial visit",
                        "detailed_description": "Visit to local tech company for CS students",
                        "start_datetime": datetime(2024, 6, 15, 9, 0),
                        "end_datetime": datetime(2024, 6, 15, 13, 0),  # 4 hours
                    },
                    "expected": AttendanceStrategy.SINGLE_MARK,
                    "rationale": "Single-day visit ≤ 8 hours → single attendance mark sufficient"
                },
                {
                    "name": "Extended Industrial Program (3 days)",
                    "event": {
                        "event_name": "Industrial Training Program",
                        "event_type": "industrial visit",
                        "detailed_description": "Multi-day industrial exposure and training",
                        "start_datetime": datetime(2024, 6, 15, 9, 0),
                        "end_datetime": datetime(2024, 6, 17, 17, 0),  # 3 days
                    },
                    "expected": AttendanceStrategy.DAY_BASED,
                    "rationale": "Multi-day program → daily attendance tracking needed"
                }
            ]
        },
        {
            "title": "Hackathon - Consistent Session-Based Approach",
            "scenarios": [
                {
                    "name": "Mini Hackathon (6 hours)",
                    "event": {
                        "event_name": "Quick Code Sprint",
                        "event_type": "hackathon",
                        "detailed_description": "6-hour coding challenge for beginners",
                        "start_datetime": datetime(2024, 7, 20, 10, 0),
                        "end_datetime": datetime(2024, 7, 20, 16, 0),  # 6 hours
                    },
                    "expected": AttendanceStrategy.SESSION_BASED,
                    "rationale": "Even short hackathons have distinct phases (start, mid-review, demo)"
                },
                {
                    "name": "Marathon Hackathon (48 hours)",
                    "event": {
                        "event_name": "Weekend Coding Marathon",
                        "event_type": "hackathon",
                        "detailed_description": "48-hour intensive coding competition",
                        "start_datetime": datetime(2024, 7, 20, 18, 0),
                        "end_datetime": datetime(2024, 7, 22, 18, 0),  # 48 hours
                    },
                    "expected": AttendanceStrategy.SESSION_BASED,
                    "rationale": "Long hackathons still use session-based (not day-based) for checkpoint tracking"
                }
            ]
        },
        {
            "title": "Workshop - Duration-Sensitive Classification",
            "scenarios": [
                {
                    "name": "Quick Workshop (2 hours)",
                    "event": {
                        "event_name": "Intro to Git",
                        "event_type": "workshop",
                        "detailed_description": "Quick introduction to version control",
                        "start_datetime": datetime(2024, 8, 10, 14, 0),
                        "end_datetime": datetime(2024, 8, 10, 16, 0),  # 2 hours
                    },
                    "expected": AttendanceStrategy.SINGLE_MARK,
                    "rationale": "Short workshop → single attendance check"
                },
                {
                    "name": "Intensive Bootcamp (5 days)",
                    "event": {
                        "event_name": "Full-Stack Development Bootcamp",
                        "event_type": "workshop",
                        "detailed_description": "Intensive 5-day web development training",
                        "start_datetime": datetime(2024, 8, 10, 9, 0),
                        "end_datetime": datetime(2024, 8, 14, 17, 0),  # 5 days
                    },
                    "expected": AttendanceStrategy.DAY_BASED,
                    "rationale": "Multi-day workshop → daily attendance tracking"
                }
            ]
        },
        {
            "title": "Cultural Events - Competition vs Performance",
            "scenarios": [
                {
                    "name": "Cultural Performance (3 hours)",
                    "event": {
                        "event_name": "Annual Cultural Show",
                        "event_type": "cultural",
                        "detailed_description": "Cultural performance showcase with various acts",
                        "start_datetime": datetime(2024, 9, 5, 18, 0),
                        "end_datetime": datetime(2024, 9, 5, 21, 0),  # 3 hours
                    },
                    "expected": AttendanceStrategy.SINGLE_MARK,
                    "rationale": "Simple cultural performance → single attendance mark"
                },
                {
                    "name": "Cultural Competition (6 hours)",
                    "event": {
                        "event_name": "Inter-College Dance Competition",
                        "event_type": "cultural",
                        "detailed_description": "Cultural dance competition with registration, rounds and awards",
                        "start_datetime": datetime(2024, 9, 5, 10, 0),
                        "end_datetime": datetime(2024, 9, 5, 16, 0),  # 6 hours
                    },
                    "expected": AttendanceStrategy.MILESTONE_BASED,
                    "rationale": "Cultural competition has phases: registration → performance → awards"
                }
            ]
        },
        {
            "title": "Unknown Events - Duration-Based Fallback",
            "scenarios": [
                {
                    "name": "Short Unknown Event (3 hours)",
                    "event": {
                        "event_name": "Special Session",
                        "event_type": "unknown",
                        "detailed_description": "Special session with unclear categorization",
                        "start_datetime": datetime(2024, 10, 1, 14, 0),
                        "end_datetime": datetime(2024, 10, 1, 17, 0),  # 3 hours
                    },
                    "expected": AttendanceStrategy.SINGLE_MARK,
                    "rationale": "Unknown + short duration → fallback to single mark"
                },
                {
                    "name": "Long Unknown Event (10 hours)",
                    "event": {
                        "event_name": "Extended Special Program",
                        "event_type": "unknown",
                        "detailed_description": "Long special program with unclear categorization",
                        "start_datetime": datetime(2024, 10, 1, 9, 0),
                        "end_datetime": datetime(2024, 10, 1, 19, 0),  # 10 hours
                    },
                    "expected": AttendanceStrategy.SESSION_BASED,
                    "rationale": "Unknown + long duration → fallback to session-based tracking"
                }
            ]
        }
    ]
    
    # Run demonstrations
    total_scenarios = 0
    correct_classifications = 0
    
    for test_case in test_cases:
        print(f"📋 {test_case['title']}")
        print("-" * 60)
        
        for scenario in test_case['scenarios']:
            total_scenarios += 1
            event = scenario['event']
            expected = scenario['expected']
            
            # Calculate duration for display
            duration = event['end_datetime'] - event['start_datetime']
            duration_str = f"{duration.days}d " if duration.days > 0 else ""
            duration_str += f"{duration.seconds // 3600}h"
            
            # Get actual classification
            actual = AttendanceIntelligenceService.detect_attendance_strategy(event)
            
            # Check if correct
            is_correct = actual == expected
            correct_classifications += 1 if is_correct else 0
            
            # Display result
            status = "✅" if is_correct else "❌"
            print(f"{status} {scenario['name']} ({duration_str})")
            print(f"   Strategy: {actual}")
            print(f"   Rationale: {scenario['rationale']}")
            if not is_correct:
                print(f"   ⚠️  Expected: {expected}")
            print()
        
        print()
    
    # Summary
    accuracy = (correct_classifications / total_scenarios) * 100
    print("=" * 80)
    print("📊 ENHANCED DURATION LOGIC DEMONSTRATION SUMMARY")
    print("=" * 80)
    print(f"✅ Scenarios Tested: {total_scenarios}")
    print(f"✅ Correct Classifications: {correct_classifications}")
    print(f"✅ Accuracy: {accuracy:.1f}%")
    print()
    
    if accuracy == 100:
        print("🎉 PERFECT! Enhanced duration logic handles all scenarios correctly!")
        print()
        print("🔥 KEY IMPROVEMENTS:")
        print("   • Industrial visits: Duration-sensitive (≤8h = single, >1d = daily)")
        print("   • Hackathons: Always session-based regardless of duration")
        print("   • Workshops: Duration-dependent (short = single, multi-day = daily)")
        print("   • Cultural events: Competition-aware (competitions = milestone-based)")
        print("   • Unknown events: Smart duration-based fallback logic")
        print("   • Enhanced tie-breaking and edge case handling")
    else:
        print("⚠️  Some scenarios need attention. Review the failed classifications.")
    
    print("=" * 80)
    return accuracy == 100

if __name__ == "__main__":
    success = demonstrate_enhanced_duration_logic()
    exit(0 if success else 1)
