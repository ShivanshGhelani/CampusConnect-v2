"""
Attendance Strategy Testing API
==============================

This module provides API endpoints for testing the enhanced attendance strategy detection
without requiring full event creation. Used for validating Phase 1 improvements.

Features:
- Single event strategy testing
- Bulk scenario testing with predefined realistic data
- Accuracy measurement and reporting
- Edge case validation
- Performance benchmarking
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
import asyncio

# Import the enhanced services
try:
    from services.dynamic_attendance_service import IntegratedDynamicAttendanceService
    from models.dynamic_attendance import AttendanceIntelligenceService
    TESTING_AVAILABLE = True
except ImportError:
    TESTING_AVAILABLE = False

router = APIRouter(prefix="/testing", tags=["Attendance Testing"])

class EventTestData(BaseModel):
    """Test data structure for event strategy testing"""
    event_name: str
    event_type: str
    detailed_description: str
    start_datetime: str
    end_datetime: str
    venue: Dict[str, Any]
    registration_mode: str = "individual"
    max_team_size: Optional[int] = 1
    expected_strategy: Optional[str] = None

class BulkTestResult(BaseModel):
    """Result structure for bulk testing"""
    scenario: str
    expected: Optional[str]
    detected: str
    correct: bool
    confidence: float
    reasoning: str
    sessions_count: int
    venue_analysis: Optional[Dict[str, Any]] = None

# Predefined test scenarios with realistic data
TEST_EVENT_SCENARIOS = {
    "hackathon_24h": {
        "event_name": "CodeStorm 2024 - 24 Hour Hackathon",
        "event_type": "Technical Competition",
        "detailed_description": "24-hour coding marathon with team collaboration, mentorship sessions, and final presentations. Participants will build innovative solutions using cutting-edge technologies.",
        "start_datetime": "2024-01-15T09:00:00Z",
        "end_datetime": "2024-01-16T09:00:00Z",
        "venue": {"venue_name": "Innovation Lab Complex", "venue_type": "Laboratory", "capacity": 100},
        "registration_mode": "team",
        "max_team_size": 4,
        "expected_strategy": "session_based"
    },
    
    "industrial_visit": {
        "event_name": "Industrial Visit to Tech Corporation",
        "event_type": "Educational Visit",
        "detailed_description": "Single day visit to understand industry operations, manufacturing processes, and career opportunities in the technology sector.",
        "start_datetime": "2024-02-10T08:00:00Z", 
        "end_datetime": "2024-02-10T17:00:00Z",
        "venue": {"venue_name": "Tech Corp Manufacturing Plant", "venue_type": "Industrial Facility", "capacity": 50},
        "registration_mode": "individual",
        "expected_strategy": "single_mark"
    },
    
    "thesis_defense": {
        "event_name": "PhD Thesis Defense - AI in Healthcare",
        "event_type": "Academic Defense",
        "detailed_description": "Doctoral thesis defense presentation and viva voce examination for PhD in Computer Science specializing in artificial intelligence applications in healthcare.",
        "start_datetime": "2024-03-05T14:00:00Z",
        "end_datetime": "2024-03-05T16:00:00Z", 
        "venue": {"venue_name": "Conference Room A", "venue_type": "Conference Hall", "capacity": 20},
        "registration_mode": "individual",
        "expected_strategy": "single_mark"
    },
    
    "workshop_3day": {
        "event_name": "Machine Learning Workshop - Beginner to Advanced",
        "event_type": "Technical Workshop", 
        "detailed_description": "Comprehensive 3-day hands-on workshop covering ML fundamentals, practical implementations, and project development with industry experts.",
        "start_datetime": "2024-04-01T09:00:00Z",
        "end_datetime": "2024-04-03T17:00:00Z",
        "venue": {"venue_name": "Computer Lab Block B", "venue_type": "Laboratory", "capacity": 40},
        "registration_mode": "individual",
        "expected_strategy": "day_based"
    },
    
    "cultural_fest_annual": {
        "event_name": "Kaleidoscope 2024 - Annual Cultural Festival",
        "event_type": "Cultural Festival",
        "detailed_description": "Multi-day cultural extravaganza featuring dance, music, drama competitions, art exhibitions, and celebrity performances with multiple venues.",
        "start_datetime": "2024-05-10T09:00:00Z",
        "end_datetime": "2024-05-12T22:00:00Z",
        "venue": {"venue_name": "Open Air Amphitheater", "venue_type": "Outdoor Space", "capacity": 2000},
        "registration_mode": "individual",
        "expected_strategy": "milestone_based"
    },
    
    "placement_drive": {
        "event_name": "Google Campus Placement Drive 2024",
        "event_type": "Recruitment Drive",
        "detailed_description": "Multi-round placement process including aptitude test, technical interviews, HR rounds, and final selection for software engineering positions.",
        "start_datetime": "2024-06-15T09:00:00Z",
        "end_datetime": "2024-06-15T18:00:00Z",
        "venue": {"venue_name": "Placement Cell Auditorium", "venue_type": "Auditorium", "capacity": 200},
        "registration_mode": "individual", 
        "expected_strategy": "session_based"
    },
    
    "sports_tournament": {
        "event_name": "Inter-College Basketball Championship",
        "event_type": "Sports Tournament",
        "detailed_description": "5-day basketball tournament with league matches, semi-finals, and championship finals featuring 16 college teams.",
        "start_datetime": "2024-07-20T08:00:00Z",
        "end_datetime": "2024-07-24T20:00:00Z",
        "venue": {"venue_name": "Sports Complex Basketball Court", "venue_type": "Sports Facility", "capacity": 500},
        "registration_mode": "team",
        "max_team_size": 12,
        "expected_strategy": "day_based"
    },
    
    "research_internship": {
        "event_name": "Summer Research Internship Program",
        "event_type": "Research Program", 
        "detailed_description": "8-week intensive research internship with weekly progress reviews, mentorship, and final project presentation in computer science.",
        "start_datetime": "2024-06-01T09:00:00Z",
        "end_datetime": "2024-07-26T17:00:00Z",
        "venue": {"venue_name": "Research Lab Complex", "venue_type": "Laboratory", "capacity": 20},
        "registration_mode": "individual",
        "expected_strategy": "continuous"
    },
    
    "medical_camp": {
        "event_name": "Free Health Checkup Camp",
        "event_type": "Health & Welfare",
        "detailed_description": "Free medical screening including blood pressure, diabetes, eye checkup, and general physician consultation for students and staff.",
        "start_datetime": "2024-08-10T08:00:00Z",
        "end_datetime": "2024-08-10T16:00:00Z",
        "venue": {"venue_name": "College Dispensary", "venue_type": "Medical Facility", "capacity": 100},
        "registration_mode": "individual",
        "expected_strategy": "single_mark"
    },
    
    "project_expo": {
        "event_name": "Innovation Showcase - Final Year Projects",
        "event_type": "Technical Exhibition",
        "detailed_description": "Student project exhibition with registration, presentation rounds, judge evaluations, and award ceremony for engineering final year projects.",
        "start_datetime": "2024-09-15T09:00:00Z", 
        "end_datetime": "2024-09-15T18:00:00Z",
        "venue": {"venue_name": "Exhibition Hall", "venue_type": "Multi Purpose", "capacity": 300},
        "registration_mode": "team",
        "max_team_size": 3,
        "expected_strategy": "milestone_based"
    }
}

# Edge cases for comprehensive testing
EDGE_CASE_SCENARIOS = {
    "short_workshop": {
        "event_name": "Git & GitHub Crash Course", 
        "event_type": "Workshop",
        "detailed_description": "2-hour intensive hands-on session on version control basics for beginners.",
        "start_datetime": "2024-10-01T14:00:00Z",
        "end_datetime": "2024-10-01T16:00:00Z",
        "venue": {"venue_name": "Computer Lab", "venue_type": "Laboratory", "capacity": 30},
        "registration_mode": "individual",
        "expected_strategy": "single_mark"  # Should NOT be day_based despite being workshop
    },
    
    "long_conference": {
        "event_name": "AI Ethics Symposium",
        "event_type": "Conference", 
        "detailed_description": "Full-day symposium with multiple speakers, panel discussions, and networking sessions on artificial intelligence ethics.",
        "start_datetime": "2024-11-01T09:00:00Z",
        "end_datetime": "2024-11-01T18:00:00Z", 
        "venue": {"venue_name": "Main Auditorium", "venue_type": "Auditorium", "capacity": 500},
        "registration_mode": "individual",
        "expected_strategy": "single_mark"  # Should remain single_mark despite long duration
    },
    
    "mini_hackathon": {
        "event_name": "4-Hour App Development Challenge",
        "event_type": "Coding Competition",
        "detailed_description": "Quick app development challenge with opening briefing and final presentation for mobile applications.",
        "start_datetime": "2024-12-01T13:00:00Z",
        "end_datetime": "2024-12-01T17:00:00Z",
        "venue": {"venue_name": "Innovation Hub", "venue_type": "Laboratory", "capacity": 60},
        "registration_mode": "team",
        "max_team_size": 2,
        "expected_strategy": "session_based"  # Should be session_based despite short duration
    },
    
    "online_workshop": {
        "event_name": "Digital Marketing Masterclass",
        "event_type": "Online Workshop",
        "detailed_description": "Interactive online workshop with live demos, breakout sessions, and Q&A on digital marketing strategies.",
        "start_datetime": "2024-12-15T15:00:00Z",
        "end_datetime": "2024-12-15T18:00:00Z",
        "venue": {"venue_name": "Zoom Platform", "venue_type": "Online Platform", "capacity": 200},
        "registration_mode": "individual",
        "expected_strategy": "single_mark"  # Online should be optimized for virtual attendance
    },
    
    "hybrid_conference": {
        "event_name": "Hybrid Tech Conference 2024",
        "event_type": "Conference",
        "detailed_description": "Two-day hybrid conference with both physical and virtual participation options covering latest technology trends.",
        "start_datetime": "2024-12-20T09:00:00Z",
        "end_datetime": "2024-12-21T17:00:00Z",
        "venue": {"venue_name": "Auditorium + Online Platform", "venue_type": "Multi Purpose", "capacity": 300}, 
        "registration_mode": "individual",
        "expected_strategy": "day_based"  # Multi-day should be day_based
    }
}

def convert_test_data_to_event_data(test_data: Dict[str, Any]) -> Dict[str, Any]:
    """Convert test data format to internal event data format"""
    event_data = test_data.copy()
    
    # Convert datetime strings to datetime objects
    if isinstance(event_data.get("start_datetime"), str):
        event_data["start_datetime"] = datetime.fromisoformat(
            event_data["start_datetime"].replace("Z", "+00:00")
        )
    if isinstance(event_data.get("end_datetime"), str):
        event_data["end_datetime"] = datetime.fromisoformat(
            event_data["end_datetime"].replace("Z", "+00:00")
        )
    
    return event_data

@router.post("/strategy-detection")
async def test_strategy_detection(test_data: EventTestData):
    """
    Test attendance strategy detection for a single event without creating it
    """
    if not TESTING_AVAILABLE:
        raise HTTPException(status_code=503, detail="Testing services not available")
    
    try:
        # Convert test data to proper format
        event_data = convert_test_data_to_event_data(test_data.dict())
        
        # Initialize intelligence service
        intelligence_service = AttendanceIntelligenceService()
        
        # Run strategy detection and analysis
        result = await intelligence_service.analyze_event_requirements(event_data)
        
        if not result["success"]:
            return {
                "success": False,
                "error": result.get("error", "Strategy detection failed"),
                "input_data": test_data.dict()
            }
        
        strategy_info = result["strategy"]
        
        return {
            "success": True,
            "input_data": test_data.dict(),
            "detected_strategy": strategy_info["type"],
            "confidence": strategy_info["confidence"], 
            "reasoning": strategy_info["reasoning"],
            "sessions_generated": len(strategy_info["sessions"]),
            "sessions_preview": [
                {
                    "name": session["session_name"],
                    "type": session["session_type"],
                    "duration_minutes": session["duration_minutes"]
                } for session in strategy_info["sessions"][:3]  # First 3 sessions
            ],
            "venue_analysis": strategy_info.get("venue_analysis"),
            "team_analysis": strategy_info.get("team_analysis"),
            "missing_patterns": strategy_info.get("missing_patterns_analysis"),
            "enhancement_info": strategy_info.get("enhancement_info"),
            "criteria": strategy_info.get("criteria"),
            "estimated_completion_rate": strategy_info.get("estimated_completion_rate")
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Testing failed: {str(e)}",
            "input_data": test_data.dict()
        }

@router.post("/bulk-scenarios")
async def bulk_test_scenarios():
    """
    Test all predefined scenarios and return comprehensive accuracy report
    """
    if not TESTING_AVAILABLE:
        raise HTTPException(status_code=503, detail="Testing services not available")
    
    results = []
    correct_predictions = 0
    total_tests = 0
    category_stats = {
        "main_scenarios": {"correct": 0, "total": 0},
        "edge_cases": {"correct": 0, "total": 0}
    }
    
    # Test main scenarios
    for scenario_name, scenario_data in TEST_EVENT_SCENARIOS.items():
        try:
            test_data = EventTestData(**scenario_data)
            result = await test_strategy_detection(test_data)
            
            expected = scenario_data.get("expected_strategy")
            detected = result.get("detected_strategy")
            
            is_correct = (detected == expected)
            if is_correct:
                correct_predictions += 1
                category_stats["main_scenarios"]["correct"] += 1
            
            total_tests += 1
            category_stats["main_scenarios"]["total"] += 1
            
            results.append({
                "scenario": scenario_name,
                "category": "main",
                "expected": expected,
                "detected": detected, 
                "correct": is_correct,
                "confidence": result.get("confidence", 0.0),
                "reasoning": result.get("reasoning", ""),
                "sessions_count": result.get("sessions_generated", 0),
                "venue_analysis": result.get("venue_analysis") is not None,
                "enhancement_active": result.get("enhancement_info", {}).get("venue_intelligence_active", False)
            })
            
        except Exception as e:
            results.append({
                "scenario": scenario_name,
                "category": "main",
                "expected": scenario_data.get("expected_strategy"),
                "detected": "ERROR",
                "correct": False,
                "confidence": 0.0,
                "reasoning": f"Test failed: {str(e)}",
                "error": str(e)
            })
            total_tests += 1
            category_stats["main_scenarios"]["total"] += 1
    
    # Test edge cases
    for scenario_name, scenario_data in EDGE_CASE_SCENARIOS.items():
        try:
            test_data = EventTestData(**scenario_data)
            result = await test_strategy_detection(test_data)
            
            expected = scenario_data.get("expected_strategy") 
            detected = result.get("detected_strategy")
            
            is_correct = (detected == expected)
            if is_correct:
                correct_predictions += 1
                category_stats["edge_cases"]["correct"] += 1
            
            total_tests += 1
            category_stats["edge_cases"]["total"] += 1
            
            results.append({
                "scenario": f"EDGE: {scenario_name}",
                "category": "edge",
                "expected": expected,
                "detected": detected,
                "correct": is_correct, 
                "confidence": result.get("confidence", 0.0),
                "reasoning": result.get("reasoning", ""),
                "sessions_count": result.get("sessions_generated", 0)
            })
            
        except Exception as e:
            results.append({
                "scenario": f"EDGE: {scenario_name}",
                "category": "edge", 
                "expected": scenario_data.get("expected_strategy"),
                "detected": "ERROR",
                "correct": False,
                "confidence": 0.0,
                "reasoning": f"Test failed: {str(e)}",
                "error": str(e)
            })
            total_tests += 1
            category_stats["edge_cases"]["total"] += 1
    
    # Calculate accuracies
    overall_accuracy = (correct_predictions / total_tests) * 100 if total_tests > 0 else 0
    main_accuracy = (category_stats["main_scenarios"]["correct"] / category_stats["main_scenarios"]["total"]) * 100 if category_stats["main_scenarios"]["total"] > 0 else 0
    edge_accuracy = (category_stats["edge_cases"]["correct"] / category_stats["edge_cases"]["total"]) * 100 if category_stats["edge_cases"]["total"] > 0 else 0
    
    # Identify problematic patterns
    failed_scenarios = [r for r in results if not r["correct"]]
    strategy_breakdown = {}
    for result in results:
        strategy = result["detected"]
        if strategy not in strategy_breakdown:
            strategy_breakdown[strategy] = {"correct": 0, "total": 0}
        strategy_breakdown[strategy]["total"] += 1
        if result["correct"]:
            strategy_breakdown[strategy]["correct"] += 1
    
    return {
        "success": True,
        "test_timestamp": datetime.utcnow().isoformat(),
        "overall_accuracy": f"{overall_accuracy:.1f}%",
        "main_scenarios_accuracy": f"{main_accuracy:.1f}%",
        "edge_cases_accuracy": f"{edge_accuracy:.1f}%",
        "correct_predictions": correct_predictions,
        "total_tests": total_tests,
        "phase_1_target": "85%+",
        "target_met": overall_accuracy >= 85.0,
        "category_breakdown": {
            "main_scenarios": f"{main_accuracy:.1f}% ({category_stats['main_scenarios']['correct']}/{category_stats['main_scenarios']['total']})",
            "edge_cases": f"{edge_accuracy:.1f}% ({category_stats['edge_cases']['correct']}/{category_stats['edge_cases']['total']})"
        },
        "strategy_accuracy": {
            strategy: f"{(stats['correct']/stats['total']*100):.1f}% ({stats['correct']}/{stats['total']})"
            for strategy, stats in strategy_breakdown.items()
        },
        "failed_scenarios": failed_scenarios,
        "all_results": results,
        "recommendations": _generate_test_recommendations(failed_scenarios, overall_accuracy)
    }

def _generate_test_recommendations(failed_scenarios: List[Dict], accuracy: float) -> List[str]:
    """Generate recommendations based on test results"""
    recommendations = []
    
    if accuracy >= 90:
        recommendations.append("🎉 Excellent! Phase 1 exceeds all targets")
    elif accuracy >= 85:
        recommendations.append("✅ Phase 1 meets target accuracy of 85%+")
    elif accuracy >= 75:
        recommendations.append("⚠️ Phase 1 close to target - minor adjustments needed")
    else:
        recommendations.append("❌ Phase 1 below target - significant improvements needed")
    
    # Analyze failed scenarios for patterns
    failed_types = {}
    for failure in failed_scenarios:
        expected = failure.get("expected", "unknown")
        detected = failure.get("detected", "unknown")
        pattern = f"{expected} → {detected}"
        failed_types[pattern] = failed_types.get(pattern, 0) + 1
    
    if failed_types:
        recommendations.append("Common failure patterns:")
        for pattern, count in sorted(failed_types.items(), key=lambda x: x[1], reverse=True):
            recommendations.append(f"  • {pattern} ({count} times)")
    
    # Specific recommendations
    if any("hackathon" in f.get("scenario", "") for f in failed_scenarios):
        recommendations.append("🔧 Review hackathon pattern detection")
    
    if any("workshop" in f.get("scenario", "") for f in failed_scenarios):
        recommendations.append("🔧 Adjust workshop duration thresholds")
    
    if any("EDGE" in f.get("scenario", "") for f in failed_scenarios):
        recommendations.append("🔧 Fine-tune edge case handling")
    
    return recommendations

@router.get("/scenarios")
async def get_test_scenarios():
    """Get all available test scenarios for manual review"""
    return {
        "main_scenarios": TEST_EVENT_SCENARIOS,
        "edge_cases": EDGE_CASE_SCENARIOS,
        "total_scenarios": len(TEST_EVENT_SCENARIOS) + len(EDGE_CASE_SCENARIOS),
        "categories": ["main", "edge"]
    }
