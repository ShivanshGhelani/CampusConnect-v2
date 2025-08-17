# Detailed Enhancement Plan for Dynamic Attendance System

## 1. Missing Patterns Implementation

### 1.1 Networking Events Pattern Enhancement

#### Current Gap:
The system doesn't recognize networking events, alumni meets, industry networking sessions, which typically require simple attendance marking.

#### Implementation:

```python
# Enhanced EVENT_TYPE_PATTERNS in dynamic_attendance.py
EVENT_TYPE_PATTERNS = {
    AttendanceStrategy.SINGLE_MARK: [
        r"conference|webinar|seminar|symposium|talk|lecture|presentation",
        r"guest.*lecture|keynote|demo|showcase",
        # NEW NETWORKING PATTERNS
        r"networking|alumni.*meet|industry.*networking|professional.*networking",
        r"meet.*greet|mixer|social.*hour|coffee.*chat|networking.*session",
        r"career.*fair|job.*fair|placement.*drive|recruitment.*drive",
        r"alumni.*interaction|industry.*connect|professional.*meetup"
    ],
    # ... other strategies
}

# New function to handle networking-specific logic
def detect_networking_event(event_data: Dict[str, Any]) -> bool:
    """Detect if event is networking-focused"""
    text = f"{event_data.get('event_name', '')} {event_data.get('event_type', '')} {event_data.get('detailed_description', '')}".lower()
    
    networking_indicators = [
        "networking", "alumni", "industry connect", "professional meetup",
        "career fair", "job fair", "meet and greet", "mixer",
        "social hour", "coffee chat", "interaction session"
    ]
    
    return any(indicator in text for indicator in networking_indicators)

# Enhanced strategy detection with networking logic
@classmethod
def detect_attendance_strategy(cls, event_data: Dict[str, Any]) -> AttendanceStrategy:
    # ... existing code ...
    
    # Special handling for networking events
    if cls.detect_networking_event(event_data):
        strategy_scores[AttendanceStrategy.SINGLE_MARK] += 4  # Strong preference
        logger.info("Networking event detected - favoring SINGLE_MARK strategy")
    
    # ... rest of the method
```

#### Real-Life Examples:
```python
NETWORKING_EVENT_EXAMPLES = {
    "Alumni Meet 2024": {
        "expected_strategy": "SINGLE_MARK",
        "sessions": 1,
        "criteria": "Present during event",
        "description": "Simple check-in when alumni arrive"
    },
    "Industry Networking Evening": {
        "expected_strategy": "SINGLE_MARK", 
        "sessions": 1,
        "criteria": "Attend networking session",
        "description": "Single attendance marking for professional networking"
    },
    "Career Fair Day": {
        "expected_strategy": "SINGLE_MARK",
        "sessions": 1,
        "criteria": "Visit career fair",
        "description": "Mark attendance when entering career fair venue"
    }
}
```

### 1.2 Award Ceremonies and Recognition Events

#### Current Gap:
Award ceremonies, felicitation events, recognition programs aren't properly categorized.

#### Implementation:

```python
# New patterns for award ceremonies
AWARD_CEREMONY_PATTERNS = [
    r"award.*ceremony|awards.*night|recognition.*event|felicitation",
    r"graduation.*ceremony|convocation|commencement",
    r"achievement.*ceremony|honors.*ceremony|appreciation.*event",
    r"prize.*distribution|medal.*ceremony|trophy.*presentation"
]

# Add to EVENT_TYPE_PATTERNS
EVENT_TYPE_PATTERNS = {
    AttendanceStrategy.SINGLE_MARK: [
        # ... existing patterns ...
        r"award.*ceremony|awards.*night|recognition.*event|felicitation",
        r"graduation.*ceremony|convocation|commencement|appreciation.*event",
        r"prize.*distribution|medal.*ceremony|trophy.*presentation"
    ]
}

# Special detection function
def detect_award_ceremony(event_data: Dict[str, Any]) -> bool:
    """Detect award ceremony events"""
    text = f"{event_data.get('event_name', '')} {event_data.get('event_type', '')} {event_data.get('detailed_description', '')}".lower()
    
    ceremony_indicators = [
        "award", "awards", "recognition", "felicitation", "graduation",
        "convocation", "commencement", "achievement", "honors",
        "appreciation", "prize distribution", "medal ceremony"
    ]
    
    return any(indicator in text for indicator in ceremony_indicators)

# Enhanced session generation for ceremonies
def generate_ceremony_sessions(event_data: Dict[str, Any]) -> List[AttendanceSession]:
    """Generate sessions for award ceremonies"""
    start_time = event_data.get("start_datetime")
    end_time = event_data.get("end_datetime")
    event_name = event_data.get("event_name", "Ceremony")
    
    # Most ceremonies are single sessions with arrival window
    arrival_window = timedelta(minutes=30)
    
    return [
        AttendanceSession(
            session_id="ceremony_attendance",
            session_name=f"{event_name} - Main Ceremony",
            session_type="ceremony",
            start_time=start_time,
            end_time=start_time + arrival_window,  # 30-minute check-in window
            is_mandatory=True,
            weight=1.0,
            status="pending"
        )
    ]
```

#### Real-Life Examples:
```python
AWARD_CEREMONY_EXAMPLES = {
    "Annual Awards Night": {
        "duration": "3 hours",
        "strategy": "SINGLE_MARK",
        "check_in_window": "30 minutes from start",
        "special_notes": "VIP guests, formal attire required"
    },
    "Graduation Ceremony": {
        "duration": "4 hours", 
        "strategy": "SINGLE_MARK",
        "check_in_window": "1 hour before ceremony",
        "special_notes": "Family attendance, photo sessions"
    },
    "Sports Achievement Felicitation": {
        "duration": "2 hours",
        "strategy": "SINGLE_MARK", 
        "check_in_window": "15 minutes from start",
        "special_notes": "Sports team recognition"
    }
}
```

### 1.3 Orientation Programs and Onboarding

#### Current Gap:
Orientation programs for new students/employees aren't handled properly. These typically need multi-session or day-based tracking.

#### Implementation:

```python
# New patterns for orientation
ORIENTATION_PATTERNS = [
    r"orientation|induction|onboarding|introduction.*program",
    r"fresher.*orientation|new.*student.*orientation|welcome.*program",
    r"employee.*orientation|staff.*induction|faculty.*orientation",
    r"familiarization|getting.*started|basics.*program"
]

# Add to EVENT_TYPE_PATTERNS  
EVENT_TYPE_PATTERNS = {
    AttendanceStrategy.DAY_BASED: [
        # ... existing patterns ...
        r"orientation|induction|onboarding|introduction.*program",
        r"fresher.*orientation|new.*student.*orientation|welcome.*program",
        r"employee.*orientation|staff.*induction|faculty.*orientation"
    ]
}

# Special detection and handling
def detect_orientation_program(event_data: Dict[str, Any]) -> bool:
    """Detect orientation/onboarding programs"""
    text = f"{event_data.get('event_name', '')} {event_data.get('event_type', '')} {event_data.get('detailed_description', '')}".lower()
    
    orientation_indicators = [
        "orientation", "induction", "onboarding", "introduction",
        "fresher", "new student", "welcome program", "familiarization",
        "getting started", "basics program"
    ]
    
    return any(indicator in text for indicator in orientation_indicators)

# Specialized session generation for orientations
def generate_orientation_sessions(event_data: Dict[str, Any]) -> List[AttendanceSession]:
    """Generate structured sessions for orientation programs"""
    start_time = event_data.get("start_datetime")
    end_time = event_data.get("end_datetime")
    duration = end_time - start_time
    duration_days = duration.days + (1 if duration.seconds > 0 else 0)
    
    sessions = []
    
    if duration_days == 1:
        # Single day orientation - multiple sessions
        sessions = [
            AttendanceSession(
                session_id="orientation_welcome",
                session_name="Welcome & Introduction",
                session_type="orientation_session",
                start_time=start_time,
                end_time=start_time + timedelta(hours=2),
                is_mandatory=True,
                weight=1.0
            ),
            AttendanceSession(
                session_id="orientation_tour",
                session_name="Campus/Facility Tour", 
                session_type="orientation_session",
                start_time=start_time + timedelta(hours=2),
                end_time=start_time + timedelta(hours=4),
                is_mandatory=True,
                weight=1.0
            ),
            AttendanceSession(
                session_id="orientation_procedures",
                session_name="Procedures & Guidelines",
                session_type="orientation_session", 
                start_time=start_time + timedelta(hours=5),
                end_time=start_time + timedelta(hours=7),
                is_mandatory=True,
                weight=1.0
            )
        ]
    else:
        # Multi-day orientation - daily sessions
        for day in range(duration_days):
            day_start = start_time + timedelta(days=day)
            sessions.append(
                AttendanceSession(
                    session_id=f"orientation_day_{day+1}",
                    session_name=f"Orientation Day {day+1}",
                    session_type="orientation_day",
                    start_time=day_start,
                    end_time=day_start + timedelta(hours=8),  # Full day
                    is_mandatory=True,
                    weight=1.0
                )
            )
    
    return sessions

# Enhanced criteria for orientations
def get_orientation_criteria() -> Dict[str, Any]:
    """Special criteria for orientation programs"""
    return {
        "minimum_percentage": 90.0,  # Higher requirement for orientation
        "required_sessions": None,
        "description": "90% attendance required for orientation completion",
        "mandatory_sessions": "all",  # All sessions are mandatory
        "grace_period": timedelta(minutes=15)  # 15-minute grace period
    }
```

#### Real-Life Examples:
```python
ORIENTATION_EXAMPLES = {
    "Fresher Orientation Week": {
        "duration": "5 days",
        "strategy": "DAY_BASED",
        "sessions_per_day": 3,
        "mandatory_percentage": 90,
        "content": ["Welcome session", "Campus tour", "Academic procedures", "Hostel allocation", "Club introductions"]
    },
    "New Faculty Orientation": {
        "duration": "2 days", 
        "strategy": "DAY_BASED",
        "sessions_per_day": 4,
        "mandatory_percentage": 95,
        "content": ["HR procedures", "Academic policies", "Research guidelines", "System access"]
    },
    "Industry Internship Orientation": {
        "duration": "1 day",
        "strategy": "SESSION_BASED",
        "total_sessions": 4,
        "mandatory_percentage": 100,
        "content": ["Company overview", "Safety training", "Project assignment", "Mentor introduction"]
    }
}
```

## 2. Venue-Based Intelligence Implementation

### Current Gap:
The system doesn't consider venue information when determining attendance strategies.

### Implementation:

```python
# New venue intelligence module
class VenueIntelligence:
    """Venue-based attendance strategy enhancement"""
    
    VENUE_PATTERNS = {
        "auditorium": {
            "preferred_strategies": [AttendanceStrategy.SINGLE_MARK, AttendanceStrategy.SESSION_BASED],
            "characteristics": ["large_capacity", "formal_setting", "presentation_focused"],
            "typical_events": ["conferences", "seminars", "award_ceremonies"]
        },
        "laboratory": {
            "preferred_strategies": [AttendanceStrategy.SESSION_BASED, AttendanceStrategy.DAY_BASED],
            "characteristics": ["hands_on", "small_groups", "practical_work"],
            "typical_events": ["workshops", "practical_sessions", "experiments"]
        },
        "outdoor": {
            "preferred_strategies": [AttendanceStrategy.MILESTONE_BASED, AttendanceStrategy.SESSION_BASED],
            "characteristics": ["weather_dependent", "physical_activity", "group_activities"],
            "typical_events": ["sports", "cultural_events", "team_building"]
        },
        "online": {
            "preferred_strategies": [AttendanceStrategy.SESSION_BASED, AttendanceStrategy.CONTINUOUS],
            "characteristics": ["virtual", "attendance_tracking_challenging", "time_zone_issues"],
            "typical_events": ["webinars", "online_courses", "virtual_conferences"]
        }
    }
    
    @classmethod
    def analyze_venue(cls, venue_info: str) -> Dict[str, Any]:
        """Analyze venue and return intelligence"""
        venue_lower = venue_info.lower()
        
        venue_type = "unknown"
        characteristics = []
        
        if any(keyword in venue_lower for keyword in ["auditorium", "hall", "amphitheater"]):
            venue_type = "auditorium"
        elif any(keyword in venue_lower for keyword in ["lab", "laboratory", "workshop_room"]):
            venue_type = "laboratory"
        elif any(keyword in venue_lower for keyword in ["ground", "field", "outdoor", "garden", "campus"]):
            venue_type = "outdoor"
        elif any(keyword in venue_lower for keyword in ["online", "virtual", "zoom", "teams", "meet"]):
            venue_type = "online"
        elif any(keyword in venue_lower for keyword in ["classroom", "room", "seminar_room"]):
            venue_type = "classroom"
        
        return {
            "venue_type": venue_type,
            "venue_info": cls.VENUE_PATTERNS.get(venue_type, {}),
            "capacity_estimate": cls._estimate_capacity(venue_lower),
            "formality_level": cls._assess_formality(venue_lower)
        }
    
    @classmethod
    def _estimate_capacity(cls, venue: str) -> str:
        """Estimate venue capacity"""
        if "auditorium" in venue or "hall" in venue:
            return "large"  # 200+ people
        elif "classroom" in venue or "seminar" in venue:
            return "medium"  # 50-200 people
        elif "lab" in venue:
            return "small"  # <50 people
        else:
            return "unknown"
    
    @classmethod
    def _assess_formality(cls, venue: str) -> str:
        """Assess formality level of venue"""
        if "auditorium" in venue or "conference" in venue:
            return "formal"
        elif "lab" in venue or "workshop" in venue:
            return "informal"
        else:
            return "neutral"

# Integration with strategy detection
def enhance_strategy_with_venue(strategy: AttendanceStrategy, event_data: Dict[str, Any]) -> AttendanceStrategy:
    """Enhance strategy selection with venue intelligence"""
    venue = event_data.get("venue", "")
    if not venue:
        return strategy
    
    venue_analysis = VenueIntelligence.analyze_venue(venue)
    venue_info = venue_analysis.get("venue_info", {})
    preferred_strategies = venue_info.get("preferred_strategies", [])
    
    if not preferred_strategies:
        return strategy
    
    # If current strategy is not venue-appropriate, suggest alternatives
    if strategy not in preferred_strategies:
        # Return the first preferred strategy for this venue type
        return preferred_strategies[0]
    
    return strategy

# Usage in detect_attendance_strategy method
@classmethod
def detect_attendance_strategy(cls, event_data: Dict[str, Any]) -> AttendanceStrategy:
    # ... existing strategy detection logic ...
    
    # Apply venue-based enhancement
    detected_strategy = enhance_strategy_with_venue(detected_strategy, event_data)
    
    return detected_strategy
```

### Real-Life Venue Examples:

```python
VENUE_EXAMPLES = {
    "Dr. APJ Abdul Kalam Auditorium": {
        "type": "auditorium",
        "capacity": "500+",
        "suitable_for": ["conferences", "seminars", "award_ceremonies"],
        "preferred_strategy": "SINGLE_MARK",
        "attendance_method": "QR_code_at_entrance"
    },
    "Computer Science Lab 301": {
        "type": "laboratory", 
        "capacity": "30-40",
        "suitable_for": ["programming_workshops", "practical_sessions"],
        "preferred_strategy": "SESSION_BASED",
        "attendance_method": "system_login_tracking"
    },
    "Main Sports Ground": {
        "type": "outdoor",
        "capacity": "1000+", 
        "suitable_for": ["sports_events", "cultural_programs"],
        "preferred_strategy": "MILESTONE_BASED",
        "attendance_method": "GPS_based_checkin"
    },
    "Google Meet Room": {
        "type": "online",
        "capacity": "unlimited",
        "suitable_for": ["webinars", "online_classes"],
        "preferred_strategy": "SESSION_BASED", 
        "attendance_method": "platform_analytics"
    }
}
```

## 3. Registration Mode Context Awareness

### Current Gap:
The system doesn't consider whether events are team-based or individual when determining attendance strategies.

### Implementation:

```python
# Enhanced registration mode intelligence
class RegistrationModeIntelligence:
    """Handle team vs individual event attendance logic"""
    
    @classmethod
    def adjust_strategy_for_mode(cls, strategy: AttendanceStrategy, event_data: Dict[str, Any]) -> AttendanceStrategy:
        """Adjust strategy based on registration mode"""
        reg_mode = event_data.get("registration_mode", "individual")
        team_size_min = event_data.get("team_size_min", 1)
        team_size_max = event_data.get("team_size_max", 1)
        
        if reg_mode == "team" or team_size_max > 1:
            return cls._handle_team_events(strategy, event_data)
        else:
            return cls._handle_individual_events(strategy, event_data)
    
    @classmethod
    def _handle_team_events(cls, strategy: AttendanceStrategy, event_data: Dict[str, Any]) -> AttendanceStrategy:
        """Handle team-based events"""
        team_size = event_data.get("team_size_max", 4)
        
        # Team events often benefit from milestone or session-based tracking
        if strategy == AttendanceStrategy.SINGLE_MARK and team_size > 3:
            # Large teams might need multiple checkpoints
            return AttendanceStrategy.MILESTONE_BASED
        
        elif strategy == AttendanceStrategy.DAY_BASED:
            # Team events with daily activities work well with sessions
            return AttendanceStrategy.SESSION_BASED
        
        return strategy
    
    @classmethod
    def _handle_individual_events(cls, strategy: AttendanceStrategy, event_data: Dict[str, Any]) -> AttendanceStrategy:
        """Handle individual events"""
        max_participants = event_data.get("max_participants", 100)
        
        # Large individual events might need different tracking
        if max_participants > 500 and strategy == AttendanceStrategy.SESSION_BASED:
            # Very large events might be better with single mark
            return AttendanceStrategy.SINGLE_MARK
        
        return strategy

# Team attendance tracking enhancements
def generate_team_based_sessions(event_data: Dict[str, Any], strategy: AttendanceStrategy) -> List[AttendanceSession]:
    """Generate sessions optimized for team events"""
    base_sessions = generate_attendance_sessions(event_data, strategy)
    
    team_size_max = event_data.get("team_size_max", 4)
    
    if team_size_max > 5:  # Large teams
        # Add team coordination sessions
        base_sessions.insert(0, AttendanceSession(
            session_id="team_registration",
            session_name="Team Registration & Setup",
            session_type="team_milestone",
            start_time=event_data.get("start_datetime"),
            end_time=event_data.get("start_datetime") + timedelta(hours=1),
            is_mandatory=True,
            weight=0.5  # Lower weight for setup
        ))
    
    return base_sessions

# Enhanced criteria for team events
def get_team_event_criteria(strategy: AttendanceStrategy, event_data: Dict[str, Any]) -> Dict[str, Any]:
    """Get criteria adjusted for team events"""
    base_criteria = DEFAULT_CRITERIA[strategy].copy()
    
    team_size = event_data.get("team_size_max", 1)
    
    if team_size > 1:
        # Team events might need different attendance rules
        if strategy == AttendanceStrategy.SESSION_BASED:
            # For teams, require at least 75% of team members in 75% of sessions
            base_criteria["team_minimum_members"] = max(1, team_size * 0.75)
            base_criteria["description"] = f"75% team members must attend 75% of sessions"
        
        elif strategy == AttendanceStrategy.MILESTONE_BASED:
            # Teams must complete milestones together
            base_criteria["team_completion_required"] = True
            base_criteria["description"] = "All team milestones must be completed together"
    
    return base_criteria
```

### Team Event Examples:

```python
TEAM_EVENT_EXAMPLES = {
    "Hackathon 24hrs": {
        "registration_mode": "team",
        "team_size": "3-5",
        "strategy": "MILESTONE_BASED",
        "team_tracking": "All members must check-in together at milestones",
        "milestones": ["Registration", "Problem Statement", "Mid-checkpoint", "Final Submission"]
    },
    "Business Case Competition": {
        "registration_mode": "team",
        "team_size": "4-6", 
        "strategy": "SESSION_BASED",
        "team_tracking": "75% team members in each round",
        "sessions": ["Case Analysis", "Presentation Prep", "Final Presentation"]
    },
    "Sports Tournament": {
        "registration_mode": "team",
        "team_size": "11-15",
        "strategy": "SESSION_BASED", 
        "team_tracking": "Minimum playing XI attendance required",
        "sessions": ["Practice", "Group Stage", "Knockout", "Final"]
    }
}
```

## 4. Dynamic Criteria Based on Event Complexity

### Current Gap:
Attendance criteria are static and don't adapt to event difficulty, importance, or complexity.

### Implementation:

```python
# Event complexity analyzer
class EventComplexityAnalyzer:
    """Analyze event complexity and adjust criteria accordingly"""
    
    COMPLEXITY_INDICATORS = {
        "high": [
            "advanced", "expert", "professional", "certification", "examination",
            "assessment", "evaluation", "final", "capstone", "thesis"
        ],
        "medium": [
            "intermediate", "regular", "standard", "normal", "general",
            "basic", "fundamental", "core", "essential"
        ],
        "low": [
            "beginner", "introductory", "intro", "basic", "starter",
            "orientation", "overview", "casual", "informal"
        ]
    }
    
    IMPORTANCE_INDICATORS = {
        "critical": [
            "mandatory", "compulsory", "required", "essential", "critical",
            "vital", "important", "key", "primary", "core"
        ],
        "high": [
            "significant", "major", "substantial", "notable", "considerable"
        ],
        "medium": [
            "regular", "standard", "normal", "typical", "usual"
        ],
        "low": [
            "optional", "voluntary", "supplementary", "additional", "extra",
            "bonus", "informal", "casual"
        ]
    }
    
    @classmethod
    def analyze_complexity(cls, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze event complexity and importance"""
        text = f"{event_data.get('event_name', '')} {event_data.get('event_type', '')} {event_data.get('detailed_description', '')}".lower()
        
        complexity_score = cls._calculate_complexity_score(text)
        importance_score = cls._calculate_importance_score(text)
        
        # Additional factors
        duration_factor = cls._get_duration_factor(event_data)
        team_factor = cls._get_team_factor(event_data)
        
        overall_complexity = (complexity_score + importance_score + duration_factor + team_factor) / 4
        
        return {
            "complexity_level": cls._get_complexity_level(overall_complexity),
            "complexity_score": overall_complexity,
            "factors": {
                "content_complexity": complexity_score,
                "importance": importance_score,
                "duration_impact": duration_factor,
                "team_complexity": team_factor
            },
            "recommended_adjustments": cls._get_recommended_adjustments(overall_complexity)
        }
    
    @classmethod
    def _calculate_complexity_score(cls, text: str) -> float:
        """Calculate complexity based on content"""
        score = 0.5  # Base score
        
        for level, indicators in cls.COMPLEXITY_INDICATORS.items():
            matches = sum(1 for indicator in indicators if indicator in text)
            if level == "high":
                score += matches * 0.2
            elif level == "medium":
                score += matches * 0.1
            elif level == "low":
                score -= matches * 0.1
        
        return max(0.0, min(1.0, score))
    
    @classmethod
    def _calculate_importance_score(cls, text: str) -> float:
        """Calculate importance based on language used"""
        score = 0.5  # Base score
        
        for level, indicators in cls.IMPORTANCE_INDICATORS.items():
            matches = sum(1 for indicator in indicators if indicator in text)
            if level == "critical":
                score += matches * 0.25
            elif level == "high":
                score += matches * 0.15
            elif level == "medium":
                score += matches * 0.05
            elif level == "low":
                score -= matches * 0.1
        
        return max(0.0, min(1.0, score))
    
    @classmethod
    def _get_duration_factor(cls, event_data: Dict[str, Any]) -> float:
        """Get complexity factor based on duration"""
        start_time = event_data.get("start_datetime")
        end_time = event_data.get("end_datetime")
        
        if not start_time or not end_time:
            return 0.5
        
        duration = end_time - start_time
        hours = duration.total_seconds() / 3600
        
        if hours > 40:  # Very long events
            return 0.9
        elif hours > 16:  # Long events
            return 0.7
        elif hours > 8:  # Medium events
            return 0.6
        elif hours > 4:  # Short events
            return 0.4
        else:  # Very short events
            return 0.3
    
    @classmethod
    def _get_team_factor(cls, event_data: Dict[str, Any]) -> float:
        """Get complexity factor based on team requirements"""
        if event_data.get("registration_mode") == "team":
            team_size = event_data.get("team_size_max", 1)
            if team_size > 8:
                return 0.8  # Large teams are complex
            elif team_size > 4:
                return 0.6  # Medium teams
            else:
                return 0.5  # Small teams
        return 0.4  # Individual events
    
    @classmethod
    def _get_complexity_level(cls, score: float) -> str:
        """Convert score to complexity level"""
        if score >= 0.8:
            return "very_high"
        elif score >= 0.65:
            return "high" 
        elif score >= 0.5:
            return "medium"
        elif score >= 0.35:
            return "low"
        else:
            return "very_low"
    
    @classmethod
    def _get_recommended_adjustments(cls, complexity_score: float) -> Dict[str, Any]:
        """Get recommended criteria adjustments"""
        if complexity_score >= 0.8:
            return {
                "attendance_percentage": +10,  # Increase requirement
                "grace_period": -5,  # Reduce grace period
                "mandatory_sessions": "increase",
                "flexibility": "reduce"
            }
        elif complexity_score >= 0.65:
            return {
                "attendance_percentage": +5,
                "grace_period": 0,
                "mandatory_sessions": "maintain",
                "flexibility": "maintain"
            }
        elif complexity_score <= 0.35:
            return {
                "attendance_percentage": -5,  # Reduce requirement
                "grace_period": +10,  # Increase grace period
                "mandatory_sessions": "reduce",
                "flexibility": "increase"
            }
        else:
            return {
                "attendance_percentage": 0,
                "grace_period": 0,
                "mandatory_sessions": "maintain",
                "flexibility": "maintain"
            }

# Dynamic criteria adjustment
def adjust_criteria_for_complexity(base_criteria: Dict[str, Any], event_data: Dict[str, Any]) -> Dict[str, Any]:
    """Adjust attendance criteria based on event complexity"""
    complexity_analysis = EventComplexityAnalyzer.analyze_complexity(event_data)
    adjustments = complexity_analysis["recommended_adjustments"]
    
    adjusted_criteria = base_criteria.copy()
    
    # Adjust percentage requirements
    if "minimum_percentage" in adjusted_criteria and adjusted_criteria["minimum_percentage"]:
        percentage_adjustment = adjustments.get("attendance_percentage", 0)
        new_percentage = adjusted_criteria["minimum_percentage"] + percentage_adjustment
        adjusted_criteria["minimum_percentage"] = max(50, min(100, new_percentage))
    
    # Add complexity metadata
    adjusted_criteria["complexity_analysis"] = complexity_analysis
    adjusted_criteria["complexity_level"] = complexity_analysis["complexity_level"]
    
    # Update description
    complexity_level = complexity_analysis["complexity_level"]
    if complexity_level in ["high", "very_high"]:
        adjusted_criteria["description"] += " (High complexity event - strict attendance required)"
    elif complexity_level in ["low", "very_low"]:
        adjusted_criteria["description"] += " (Introductory event - flexible attendance)"
    
    return adjusted_criteria

# Integration with main system
@classmethod
def create_dynamic_config(cls, event_data: Dict[str, Any]) -> DynamicAttendanceConfig:
    """Enhanced config creation with complexity analysis"""
    strategy = cls.detect_attendance_strategy(event_data)
    
    # Apply venue and registration mode enhancements
    strategy = enhance_strategy_with_venue(strategy, event_data)
    strategy = RegistrationModeIntelligence.adjust_strategy_for_mode(strategy, event_data)
    
    # Get base criteria and adjust for complexity
    base_criteria_config = cls.DEFAULT_CRITERIA[strategy]
    adjusted_criteria_config = adjust_criteria_for_complexity(base_criteria_config, event_data)
    
    # Create criteria object with adjustments
    criteria = AttendanceCriteria(
        strategy=strategy,
        minimum_percentage=adjusted_criteria_config.get("minimum_percentage"),
        required_sessions=adjusted_criteria_config.get("required_sessions"),
        required_milestones=adjusted_criteria_config.get("required_milestones"),
        auto_calculate=True
    )
    
    # Generate sessions (enhanced based on complexity)
    sessions = cls.generate_attendance_sessions(event_data, strategy)
    
    # Apply complexity-based session adjustments
    sessions = cls._adjust_sessions_for_complexity(sessions, event_data)
    
    return DynamicAttendanceConfig(
        event_id=event_data["event_id"],
        event_type=event_data["event_type"],
        event_name=event_data["event_name"],
        strategy=strategy,
        criteria=criteria,
        sessions=sessions,
        auto_generated=True
    )
```

### Complexity Examples:

```python
COMPLEXITY_EXAMPLES = {
    "Advanced Machine Learning Workshop": {
        "complexity_factors": ["advanced", "technical", "certification"],
        "complexity_level": "very_high",
        "original_criteria": "75% attendance",
        "adjusted_criteria": "85% attendance + mandatory assessment",
        "justification": "Advanced technical content requires higher engagement"
    },
    "Introductory Photography Workshop": {
        "complexity_factors": ["introductory", "beginner", "creative"],
        "complexity_level": "low",
        "original_criteria": "80% attendance", 
        "adjusted_criteria": "70% attendance + flexible timing",
        "justification": "Beginner-friendly content allows more flexibility"
    },
    "Final Year Project Presentation": {
        "complexity_factors": ["final", "assessment", "critical", "mandatory"],
        "complexity_level": "very_high",
        "original_criteria": "Single attendance",
        "adjusted_criteria": "Mandatory attendance + backup session",
        "justification": "Critical academic milestone requires strict attendance"
    }
}
```

This detailed implementation plan addresses all the critical gaps in your dynamic attendance system, making it much more intelligent and adaptable to real-world scenarios. Each enhancement includes specific code implementations, real-life examples, and integration points with your existing system.
