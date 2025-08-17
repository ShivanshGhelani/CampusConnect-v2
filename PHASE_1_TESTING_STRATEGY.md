# Phase 1 Testing Strategy & Test Data Generator

## Smart Testing Approach 🎯

Instead of manually filling forms for 100+ event combinations, we'll create:

1. **Automated Test Data Generator** - Creates realistic event data
2. **Strategy Validation API** - Tests strategy detection without full event creation
3. **Sample Event Database** - Pre-filled realistic scenarios
4. **Comparison Tool** - Before/After accuracy analysis

---

## 🤖 1. Automated Test Data Generator

### **Event Test Data Scenarios**

```python
TEST_EVENT_SCENARIOS = {
    # High Priority Test Cases (Most Common)
    "hackathon_24h": {
        "event_name": "CodeStorm 2024 - 24 Hour Hackathon",
        "event_type": "Technical Competition",
        "detailed_description": "24-hour coding marathon with team collaboration, mentorship sessions, and final presentations. Participants will build innovative solutions.",
        "start_datetime": "2024-01-15T09:00:00Z",
        "end_datetime": "2024-01-16T09:00:00Z",
        "venue": {"venue_name": "Innovation Lab", "venue_type": "Laboratory"},
        "registration_mode": "team",
        "max_team_size": 4,
        "expected_strategy": "session_based"
    },
    
    "industrial_visit": {
        "event_name": "Industrial Visit to Tech Corporation",
        "event_type": "Educational Visit",
        "detailed_description": "Single day visit to understand industry operations, manufacturing processes, and career opportunities.",
        "start_datetime": "2024-02-10T08:00:00Z", 
        "end_datetime": "2024-02-10T17:00:00Z",
        "venue": {"venue_name": "Tech Corp Manufacturing Plant", "venue_type": "Industrial Facility"},
        "registration_mode": "individual",
        "expected_strategy": "single_mark"
    },
    
    "thesis_defense": {
        "event_name": "PhD Thesis Defense - AI in Healthcare",
        "event_type": "Academic Defense",
        "detailed_description": "Doctoral thesis defense presentation and viva voce examination for PhD in Computer Science.",
        "start_datetime": "2024-03-05T14:00:00Z",
        "end_datetime": "2024-03-05T16:00:00Z", 
        "venue": {"venue_name": "Conference Room A", "venue_type": "Conference Hall"},
        "registration_mode": "individual",
        "expected_strategy": "single_mark"
    },
    
    "workshop_3day": {
        "event_name": "Machine Learning Workshop - Beginner to Advanced",
        "event_type": "Technical Workshop", 
        "detailed_description": "Comprehensive 3-day hands-on workshop covering ML fundamentals, practical implementations, and project development.",
        "start_datetime": "2024-04-01T09:00:00Z",
        "end_datetime": "2024-04-03T17:00:00Z",
        "venue": {"venue_name": "Computer Lab Block B", "venue_type": "Laboratory"},
        "registration_mode": "individual",
        "expected_strategy": "day_based"
    },
    
    "cultural_fest_annual": {
        "event_name": "Kaleidoscope 2024 - Annual Cultural Festival",
        "event_type": "Cultural Festival",
        "detailed_description": "Multi-day cultural extravaganza featuring dance, music, drama competitions, art exhibitions, and celebrity performances.",
        "start_datetime": "2024-05-10T09:00:00Z",
        "end_datetime": "2024-05-12T22:00:00Z",
        "venue": {"venue_name": "Open Air Amphitheater", "venue_type": "Outdoor Space"},
        "registration_mode": "individual",
        "expected_strategy": "milestone_based"
    },
    
    "placement_drive": {
        "event_name": "Google Campus Placement Drive 2024",
        "event_type": "Recruitment Drive",
        "detailed_description": "Multi-round placement process including aptitude test, technical interviews, HR rounds, and final selection.",
        "start_datetime": "2024-06-15T09:00:00Z",
        "end_datetime": "2024-06-15T18:00:00Z",
        "venue": {"venue_name": "Placement Cell Auditorium", "venue_type": "Auditorium"},
        "registration_mode": "individual", 
        "expected_strategy": "session_based"
    },
    
    "sports_tournament": {
        "event_name": "Inter-College Basketball Championship",
        "event_type": "Sports Tournament",
        "detailed_description": "5-day basketball tournament with league matches, semi-finals, and championship finals.",
        "start_datetime": "2024-07-20T08:00:00Z",
        "end_datetime": "2024-07-24T20:00:00Z",
        "venue": {"venue_name": "Sports Complex Basketball Court", "venue_type": "Sports Facility"},
        "registration_mode": "team",
        "max_team_size": 12,
        "expected_strategy": "day_based"
    },
    
    "research_internship": {
        "event_name": "Summer Research Internship Program",
        "event_type": "Research Program", 
        "detailed_description": "8-week intensive research internship with weekly progress reviews, mentorship, and final project presentation.",
        "start_datetime": "2024-06-01T09:00:00Z",
        "end_datetime": "2024-07-26T17:00:00Z",
        "venue": {"venue_name": "Research Lab Complex", "venue_type": "Laboratory"},
        "registration_mode": "individual",
        "expected_strategy": "continuous"
    },
    
    "medical_camp": {
        "event_name": "Free Health Checkup Camp",
        "event_type": "Health & Welfare",
        "detailed_description": "Free medical screening including blood pressure, diabetes, eye checkup, and general physician consultation.",
        "start_datetime": "2024-08-10T08:00:00Z",
        "end_datetime": "2024-08-10T16:00:00Z",
        "venue": {"venue_name": "College Dispensary", "venue_type": "Medical Facility"},
        "registration_mode": "individual",
        "expected_strategy": "single_mark"
    },
    
    "project_expo": {
        "event_name": "Innovation Showcase - Final Year Projects",
        "event_type": "Technical Exhibition",
        "detailed_description": "Student project exhibition with registration, presentation rounds, judge evaluations, and award ceremony.",
        "start_datetime": "2024-09-15T09:00:00Z", 
        "end_datetime": "2024-09-15T18:00:00Z",
        "venue": {"venue_name": "Exhibition Hall", "venue_type": "Multi Purpose"},
        "registration_mode": "team",
        "max_team_size": 3,
        "expected_strategy": "milestone_based"
    }
}

# Edge Cases & Tricky Scenarios
EDGE_CASE_SCENARIOS = {
    "short_workshop": {
        "event_name": "Git & GitHub Crash Course", 
        "event_type": "Workshop",
        "detailed_description": "2-hour intensive hands-on session on version control basics.",
        "start_datetime": "2024-10-01T14:00:00Z",
        "end_datetime": "2024-10-01T16:00:00Z",
        "venue": {"venue_name": "Computer Lab", "venue_type": "Laboratory"},
        "registration_mode": "individual",
        "expected_strategy": "single_mark"  # Should NOT be day_based despite being workshop
    },
    
    "long_seminar": {
        "event_name": "AI Ethics Symposium",
        "event_type": "Conference", 
        "detailed_description": "Full-day symposium with multiple speakers, panel discussions, and networking sessions.",
        "start_datetime": "2024-11-01T09:00:00Z",
        "end_datetime": "2024-11-01T18:00:00Z", 
        "venue": {"venue_name": "Main Auditorium", "venue_type": "Auditorium"},
        "registration_mode": "individual",
        "expected_strategy": "single_mark"  # Should remain single_mark despite long duration
    },
    
    "mini_hackathon": {
        "event_name": "4-Hour App Development Challenge",
        "event_type": "Coding Competition",
        "detailed_description": "Quick app development challenge with opening briefing and final presentation.",
        "start_datetime": "2024-12-01T13:00:00Z",
        "end_datetime": "2024-12-01T17:00:00Z",
        "venue": {"venue_name": "Innovation Hub", "venue_type": "Laboratory"},
        "registration_mode": "team",
        "max_team_size": 2,
        "expected_strategy": "session_based"  # Should be session_based despite short duration
    },
    
    "online_workshop": {
        "event_name": "Digital Marketing Masterclass",
        "event_type": "Online Workshop",
        "detailed_description": "Interactive online workshop with live demos, breakout sessions, and Q&A.",
        "start_datetime": "2024-12-15T15:00:00Z",
        "end_datetime": "2024-12-15T18:00:00Z",
        "venue": {"venue_name": "Zoom Platform", "venue_type": "Online Platform"},
        "registration_mode": "individual",
        "expected_strategy": "single_mark"  # Online should be optimized for virtual attendance
    },
    
    "hybrid_event": {
        "event_name": "Hybrid Tech Conference 2024",
        "event_type": "Conference",
        "detailed_description": "Two-day hybrid conference with both physical and virtual participation options.",
        "start_datetime": "2024-12-20T09:00:00Z",
        "end_datetime": "2024-12-21T17:00:00Z",
        "venue": {"venue_name": "Auditorium + Online Platform", "venue_type": "Multi Purpose"}, 
        "registration_mode": "individual",
        "expected_strategy": "day_based"  # Multi-day should be day_based
    }
}
```

---

## 🔧 2. Strategy Testing API Endpoint

Create a dedicated testing endpoint that doesn't require full event creation:

```python
# Add to backend/api/v1/attendance_testing.py

@router.post("/test-strategy-detection")
async def test_strategy_detection(test_data: dict):
    """
    Test attendance strategy detection without creating events
    """
    try:
        # Convert test data to proper datetime objects
        if isinstance(test_data.get("start_datetime"), str):
            test_data["start_datetime"] = datetime.fromisoformat(test_data["start_datetime"].replace("Z", "+00:00"))
        if isinstance(test_data.get("end_datetime"), str): 
            test_data["end_datetime"] = datetime.fromisoformat(test_data["end_datetime"].replace("Z", "+00:00"))
        
        # Run strategy detection
        from services.dynamic_attendance_service import IntegratedDynamicAttendanceService
        service = IntegratedDynamicAttendanceService()
        
        result = await service.dynamic_service.intelligence_service.analyze_event_requirements(test_data)
        
        return {
            "success": True,
            "input_data": test_data,
            "detected_strategy": result["strategy"]["type"],
            "confidence": result["strategy"]["confidence"], 
            "reasoning": result["strategy"]["reasoning"],
            "sessions_generated": len(result["strategy"]["sessions"]),
            "venue_analysis": result["strategy"].get("venue_analysis"),
            "missing_patterns": result["strategy"].get("missing_patterns_analysis"),
            "enhancement_info": result["strategy"].get("enhancement_info")
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "input_data": test_data
        }

@router.post("/bulk-test-scenarios") 
async def bulk_test_scenarios():
    """
    Test all predefined scenarios and return accuracy report
    """
    results = []
    correct_predictions = 0
    total_tests = 0
    
    # Test main scenarios
    for scenario_name, scenario_data in TEST_EVENT_SCENARIOS.items():
        result = await test_strategy_detection(scenario_data)
        expected = scenario_data.get("expected_strategy")
        detected = result.get("detected_strategy")
        
        is_correct = (detected == expected)
        if is_correct:
            correct_predictions += 1
        total_tests += 1
        
        results.append({
            "scenario": scenario_name,
            "expected": expected,
            "detected": detected, 
            "correct": is_correct,
            "confidence": result.get("confidence"),
            "reasoning": result.get("reasoning")
        })
    
    # Test edge cases
    for scenario_name, scenario_data in EDGE_CASE_SCENARIOS.items():
        result = await test_strategy_detection(scenario_data)
        expected = scenario_data.get("expected_strategy") 
        detected = result.get("detected_strategy")
        
        is_correct = (detected == expected)
        if is_correct:
            correct_predictions += 1
        total_tests += 1
        
        results.append({
            "scenario": f"EDGE: {scenario_name}",
            "expected": expected,
            "detected": detected,
            "correct": is_correct, 
            "confidence": result.get("confidence"),
            "reasoning": result.get("reasoning")
        })
    
    accuracy = (correct_predictions / total_tests) * 100 if total_tests > 0 else 0
    
    return {
        "success": True,
        "overall_accuracy": f"{accuracy:.1f}%",
        "correct_predictions": correct_predictions,
        "total_tests": total_tests,
        "failed_scenarios": [r for r in results if not r["correct"]],
        "all_results": results,
        "summary": {
            "phase_1_target": "85%+",
            "achieved": f"{accuracy:.1f}%",
            "target_met": accuracy >= 85.0
        }
    }
```

---

## 🎮 3. Quick Testing Methods

### **Method 1: API Testing (Recommended)**
```bash
# Test single scenario
curl -X POST "http://localhost:8000/api/v1/test-strategy-detection" \
  -H "Content-Type: application/json" \
  -d '{
    "event_name": "CodeStorm 2024 - 24 Hour Hackathon",
    "event_type": "Technical Competition", 
    "detailed_description": "24-hour coding marathon with team collaboration",
    "start_datetime": "2024-01-15T09:00:00Z",
    "end_datetime": "2024-01-16T09:00:00Z",
    "venue": {"venue_name": "Innovation Lab", "venue_type": "Laboratory"},
    "registration_mode": "team",
    "max_team_size": 4
  }'

# Test all scenarios at once
curl -X POST "http://localhost:8000/api/v1/bulk-test-scenarios"
```

### **Method 2: Frontend Testing Component**
Create a simple testing interface in your frontend:

```jsx
// Testing component for quick validation
const AttendanceStrategyTester = () => {
  const [testResults, setTestResults] = useState(null);
  
  const runAllTests = async () => {
    const response = await fetch('/api/v1/bulk-test-scenarios', {
      method: 'POST'
    });
    const results = await response.json();
    setTestResults(results);
  };
  
  return (
    <div className="p-6">
      <h2>Phase 1 Attendance Strategy Testing</h2>
      <button onClick={runAllTests} className="btn-primary">
        Run All Test Scenarios
      </button>
      
      {testResults && (
        <div className="mt-4">
          <h3>Results: {testResults.overall_accuracy}</h3>
          <p>Target: 85%+ | Achieved: {testResults.achieved}</p>
          
          {testResults.failed_scenarios.map(scenario => (
            <div key={scenario.scenario} className="bg-red-100 p-2 mb-2">
              <strong>{scenario.scenario}</strong><br/>
              Expected: {scenario.expected} | Got: {scenario.detected}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

### **Method 3: Database Seeding**
```python
# Seed realistic test events for manual verification
async def seed_test_events():
    """Seed database with realistic test events"""
    
    for scenario_name, scenario_data in TEST_EVENT_SCENARIOS.items():
        event_data = {
            "event_id": f"test_{scenario_name}_{datetime.now().strftime('%Y%m%d')}",
            "event_name": scenario_data["event_name"],
            "event_type": scenario_data["event_type"],
            "detailed_description": scenario_data["detailed_description"],
            "start_datetime": scenario_data["start_datetime"],
            "end_datetime": scenario_data["end_datetime"],
            "venue": scenario_data["venue"],
            "registration_mode": scenario_data["registration_mode"],
            "max_team_size": scenario_data.get("max_team_size", 1),
            "created_for_testing": True
        }
        
        await DatabaseOperations.insert_one("events", event_data)
```

---

## 📊 4. Success Metrics to Validate

### **Critical Test Cases (Must Pass)**
1. **Hackathons** → `session_based` (90%+ accuracy)
2. **Industrial Visits** → `single_mark` (95%+ accuracy) 
3. **Thesis Defense** → `single_mark` (98%+ accuracy)
4. **Multi-day Workshops** → `day_based` (90%+ accuracy)
5. **Cultural Festivals** → `milestone_based` (85%+ accuracy)

### **Edge Cases (Should Handle)**
1. **Short workshops** → `single_mark` (not day_based)
2. **Long conferences** → `single_mark` (not session_based)
3. **Mini hackathons** → `session_based` (despite short duration)
4. **Online events** → Proper venue intelligence
5. **Team events** → Team-aware strategy selection

### **Accuracy Targets**
- **Overall System**: 85%+ 
- **Common Events**: 90%+
- **Edge Cases**: 75%+
- **High Priority Events**: 95%+

---

## 🚀 Quick Start Testing

1. **Add the test API endpoints** to your backend
2. **Run bulk test scenarios**: `POST /api/v1/bulk-test-scenarios`
3. **Check accuracy**: Should show 85%+ overall
4. **Review failed cases**: Fix any major misclassifications
5. **Test with real event data**: Use the test API with your existing events

This approach will validate Phase 1 thoroughly without manual form filling! 🎯

Would you like me to implement any of these testing components?
