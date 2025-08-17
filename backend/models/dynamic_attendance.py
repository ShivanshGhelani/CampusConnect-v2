"""
Dynamic Event-Type Based Attendance Management System
=====================================================

This module provides intelligent, context-aware attendance management that automatically
determines the appropriate attendance strategy based on event metadata and type.

Key Features:
- Event-type intelligent attendance patterns
- Dynamic criteria calculation
- Automated attendance strategy selection
- Flexible session management
- Real-world event scenarios support
"""

from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
from enum import Enum
from pydantic import BaseModel, Field, field_validator
import re

class AttendanceStrategy(Enum):
    """Attendance strategy types based on event nature"""
    SINGLE_MARK = "single_mark"           # Conference, webinar, seminar - one-time attendance
    DAY_BASED = "day_based"               # Workshop, training, sports - daily attendance with % criteria
    SESSION_BASED = "session_based"       # Hackathon, competition - round/session based with custom criteria
    MILESTONE_BASED = "milestone_based"   # Cultural events, technical events - milestone/phase based
    CONTINUOUS = "continuous"             # Long-term projects, research events

class AttendanceCriteria(BaseModel):
    """Attendance criteria configuration"""
    strategy: AttendanceStrategy
    minimum_percentage: Optional[float] = None  # For percentage-based criteria
    required_sessions: Optional[int] = None     # For session-based criteria
    required_milestones: Optional[List[str]] = None  # For milestone-based criteria
    auto_calculate: bool = True                 # Whether to auto-calculate from event metadata
    
class AttendanceSession(BaseModel):
    """Individual attendance session/milestone"""
    session_id: str
    session_name: str
    session_type: str  # "day", "session", "milestone", "continuous_check"
    start_time: datetime
    end_time: datetime
    is_mandatory: bool = True
    weight: float = 1.0  # Weight for calculating final attendance
    status: str = "pending"  # "pending", "active", "completed"
    
class DynamicAttendanceConfig(BaseModel):
    """Dynamic attendance configuration for an event"""
    event_id: str
    event_type: str
    event_name: str
    strategy: AttendanceStrategy
    criteria: AttendanceCriteria
    sessions: List[AttendanceSession] = []
    auto_generated: bool = True  # Whether config was auto-generated
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
class StudentAttendanceRecord(BaseModel):
    """Individual student attendance record"""
    student_enrollment: str
    event_id: str
    sessions_attended: Dict[str, Dict[str, Any]] = {}  # session_id -> attendance_data
    overall_percentage: float = 0.0
    final_status: str = "pending"  # "pending", "present", "absent", "partial"
    calculated_at: Optional[datetime] = None
    
class AttendanceIntelligenceService:
    """Service to intelligently determine attendance strategies based on event metadata"""
    
    # Event type patterns for automatic strategy detection
    EVENT_TYPE_PATTERNS = {
        AttendanceStrategy.SINGLE_MARK: [
            r"conference|webinar|seminar|symposium|talk|lecture|presentation",
            r"guest.*lecture|keynote|demo|showcase"
        ],
        AttendanceStrategy.DAY_BASED: [
            r"workshop|training|bootcamp|course|academy",
            r"sports|tournament|league|championship",
            r"internship|industrial.*visit|field.*trip"
        ],
        AttendanceStrategy.SESSION_BASED: [
            r"hackathon|coding.*marathon|programming.*contest",
            r"competition|contest|challenge|round|qualifier",
            r"debate|quiz|treasure.*hunt|gaming"
        ],
        AttendanceStrategy.MILESTONE_BASED: [
            r"cultural|fest|celebration|exhibition|fair",
            r"project.*expo|innovation.*showcase|startup.*pitch",
            r"technical.*event|robotics|ai.*challenge"
        ],
        AttendanceStrategy.CONTINUOUS: [
            r"research|thesis|dissertation|long.*term",
            r"mentorship|internship|collaboration"
        ]
    }
    
    # Default criteria based on strategy
    DEFAULT_CRITERIA = {
        AttendanceStrategy.SINGLE_MARK: {
            "minimum_percentage": None,
            "required_sessions": 1,
            "description": "Single attendance marking required"
        },
        AttendanceStrategy.DAY_BASED: {
            "minimum_percentage": 80.0,
            "required_sessions": None,
            "description": "80% daily attendance required"
        },
        AttendanceStrategy.SESSION_BASED: {
            "minimum_percentage": 75.0,
            "required_sessions": None,
            "description": "75% session attendance required"
        },
        AttendanceStrategy.MILESTONE_BASED: {
            "minimum_percentage": 60.0,
            "required_milestones": ["registration", "participation", "completion"],
            "description": "Key milestone participation required"
        },
        AttendanceStrategy.CONTINUOUS: {
            "minimum_percentage": 90.0,
            "required_sessions": None,
            "description": "90% continuous engagement required"
        }
    }
    
    @classmethod
    def detect_attendance_strategy(cls, event_data: Dict[str, Any]) -> AttendanceStrategy:
        """
        Intelligently detect the appropriate attendance strategy based on event metadata
        Enhanced with duration-based analysis and intelligent event type detection
        """
        event_name = event_data.get("event_name", "").lower()
        event_type = event_data.get("event_type", "").lower()
        description = event_data.get("detailed_description", "").lower()
        
        # Combine all text for pattern matching
        combined_text = f"{event_name} {event_type} {description}"
        
        # Calculate event duration for duration-based decisions
        start_time = event_data.get("start_datetime")
        end_time = event_data.get("end_datetime")
        duration_hours = 0
        duration_days = 0
        
        if start_time and end_time:
            duration = end_time - start_time
            duration_hours = duration.total_seconds() / 3600
            duration_days = duration.days
        
        # Score each strategy based on pattern matches
        strategy_scores = {}
        
        for strategy, patterns in cls.EVENT_TYPE_PATTERNS.items():
            score = 0
            for pattern in patterns:
                matches = len(re.findall(pattern, combined_text))
                score += matches
            strategy_scores[strategy] = score
        
        # ENHANCED DURATION-BASED HEURISTICS
        
        # 1. VERY SHORT EVENTS (<= 6 hours) - Strong preference for SINGLE_MARK
        if duration_hours <= 6:
            strategy_scores[AttendanceStrategy.SINGLE_MARK] += 3
            # Exception: Even short hackathons can be session-based
            if "hackathon" in combined_text or "marathon" in combined_text:
                strategy_scores[AttendanceStrategy.SESSION_BASED] += 3
        
        # 2. MEDIUM EVENTS (6-24 hours) - Context and duration matter
        elif duration_hours <= 24:
            if "hackathon" in combined_text or "marathon" in combined_text or "24" in combined_text:
                strategy_scores[AttendanceStrategy.SESSION_BASED] += 4
            elif "workshop" in combined_text or "training" in combined_text:
                if duration_hours >= 10:  # Long workshops can be session-based
                    strategy_scores[AttendanceStrategy.SESSION_BASED] += 2
                else:
                    strategy_scores[AttendanceStrategy.SINGLE_MARK] += 2
            elif duration_hours >= 8:  # Long single-day events default to session-based
                strategy_scores[AttendanceStrategy.SESSION_BASED] += 2
            else:  # Shorter events default to single mark
                strategy_scores[AttendanceStrategy.SINGLE_MARK] += 1
        
        # 3. MULTI-DAY EVENTS (> 24 hours) - Usually day-based or continuous
        elif duration_days >= 2:
            if duration_days <= 7:  # Short multi-day events
                strategy_scores[AttendanceStrategy.DAY_BASED] += 3
            else:  # Long-term events (> 1 week)
                strategy_scores[AttendanceStrategy.CONTINUOUS] += 3
        
        # ENHANCED EVENT-SPECIFIC LOGIC
        
        # Industrial visits - Duration-sensitive
        if "industrial" in combined_text or "industry" in combined_text or "visit" in combined_text:
            if duration_hours <= 8:  # Single-day industrial visit
                strategy_scores[AttendanceStrategy.SINGLE_MARK] += 4
                # Reset day-based score for short visits
                strategy_scores[AttendanceStrategy.DAY_BASED] = max(0, strategy_scores.get(AttendanceStrategy.DAY_BASED, 0) - 2)
            else:  # Multi-day industrial program
                strategy_scores[AttendanceStrategy.DAY_BASED] += 3
        
        # Field trips - Usually single day, single mark
        if "field.*trip" in combined_text or "field trip" in combined_text:
            if duration_hours <= 12:
                strategy_scores[AttendanceStrategy.SINGLE_MARK] += 4
                strategy_scores[AttendanceStrategy.DAY_BASED] = max(0, strategy_scores.get(AttendanceStrategy.DAY_BASED, 0) - 1)
        
        # Hackathons - Always session-based regardless of duration
        if "hackathon" in combined_text or "coding.*marathon" in combined_text:
            strategy_scores[AttendanceStrategy.SESSION_BASED] += 5
            if duration_hours >= 20:  # Long hackathons get extra session-based preference
                strategy_scores[AttendanceStrategy.SESSION_BASED] += 2
        
        # Competitions - Session-based for structured competitions
        if "competition" in combined_text or "contest" in combined_text or "championship" in combined_text:
            if duration_hours >= 4:  # Structured competitions with multiple rounds
                strategy_scores[AttendanceStrategy.SESSION_BASED] += 3
            else:  # Quick competitions
                strategy_scores[AttendanceStrategy.SINGLE_MARK] += 2
        
        # Workshops and training - Duration-dependent
        if "workshop" in combined_text or "training" in combined_text or "bootcamp" in combined_text:
            if duration_days >= 2:  # Multi-day workshops
                strategy_scores[AttendanceStrategy.DAY_BASED] += 4
            elif duration_hours >= 6:  # Long single-day workshops
                strategy_scores[AttendanceStrategy.SINGLE_MARK] += 3
            else:  # Short workshops
                strategy_scores[AttendanceStrategy.SINGLE_MARK] += 4
        
        # Conferences and seminars - Usually single mark
        if "conference" in combined_text or "seminar" in combined_text or "symposium" in combined_text:
            strategy_scores[AttendanceStrategy.SINGLE_MARK] += 4
            if duration_days >= 2:  # Multi-day conferences might need day-based
                strategy_scores[AttendanceStrategy.DAY_BASED] += 2
        
        # Sports events - Duration matters for tournament vs single match
        if "sports" in combined_text or "tournament" in combined_text or "league" in combined_text:
            if duration_days >= 2:  # Multi-day tournaments
                strategy_scores[AttendanceStrategy.DAY_BASED] += 4
            else:  # Single-day sports events
                strategy_scores[AttendanceStrategy.SINGLE_MARK] += 3
        
        # Cultural events - Check for festival vs single performance
        if "cultural" in combined_text or "fest" in combined_text or "festival" in combined_text:
            if duration_days >= 2:  # Multi-day festivals
                strategy_scores[AttendanceStrategy.MILESTONE_BASED] += 4
            elif "competition" in combined_text or "championship" in combined_text or "contest" in combined_text:
                # Cultural competitions have phases even if single day
                strategy_scores[AttendanceStrategy.MILESTONE_BASED] += 5
            else:  # Single-day cultural events (performances, shows)
                strategy_scores[AttendanceStrategy.SINGLE_MARK] += 2
        
        # Research and internships - Always continuous for long-term
        if "research" in combined_text or "internship" in combined_text or "mentorship" in combined_text:
            if duration_days >= 14:  # Long-term programs
                strategy_scores[AttendanceStrategy.CONTINUOUS] += 5
            elif duration_days >= 7:  # Week-long programs
                strategy_scores[AttendanceStrategy.DAY_BASED] += 3
            else:  # Short research sessions
                strategy_scores[AttendanceStrategy.SINGLE_MARK] += 2
        
        # DEFAULT FALLBACK LOGIC based purely on duration (when no strong patterns found)
        max_pattern_score = max(strategy_scores.values()) if strategy_scores else 0
        
        # Apply duration-based logic if pattern scores are low or tied
        if max_pattern_score <= 2:  # Weak or no pattern matches
            if duration_hours <= 4:
                strategy_scores[AttendanceStrategy.SINGLE_MARK] = max(strategy_scores.get(AttendanceStrategy.SINGLE_MARK, 0), 3)
            elif duration_hours <= 24:
                if duration_hours >= 8:
                    strategy_scores[AttendanceStrategy.SESSION_BASED] = max(strategy_scores.get(AttendanceStrategy.SESSION_BASED, 0), 3)
                else:
                    strategy_scores[AttendanceStrategy.SINGLE_MARK] = max(strategy_scores.get(AttendanceStrategy.SINGLE_MARK, 0), 3)
            elif duration_days <= 7:
                strategy_scores[AttendanceStrategy.DAY_BASED] = max(strategy_scores.get(AttendanceStrategy.DAY_BASED, 0), 3)
            else:
                strategy_scores[AttendanceStrategy.CONTINUOUS] = max(strategy_scores.get(AttendanceStrategy.CONTINUOUS, 0), 3)
        
        # Team-based events often favor session-based or milestone-based
        if event_data.get("registration_mode") == "team":
            strategy_scores[AttendanceStrategy.SESSION_BASED] = strategy_scores.get(AttendanceStrategy.SESSION_BASED, 0) + 1
            strategy_scores[AttendanceStrategy.MILESTONE_BASED] = strategy_scores.get(AttendanceStrategy.MILESTONE_BASED, 0) + 1
        
        # Determine the winning strategy
        max_score = max(strategy_scores.values()) if strategy_scores else 0
        
        if max_score == 0:
            # Ultimate fallback for events with no data
            return AttendanceStrategy.SINGLE_MARK
        
        # Get all strategies with the maximum score
        winning_strategies = [strategy for strategy, score in strategy_scores.items() if score == max_score]
        
        # Tie-breaking logic based on event characteristics and duration
        if len(winning_strategies) > 1:
            # Duration-based tie-breaking
            if duration_hours <= 6:
                # Short events prefer single mark
                if AttendanceStrategy.SINGLE_MARK in winning_strategies:
                    return AttendanceStrategy.SINGLE_MARK
            elif duration_hours <= 24:
                # Medium duration events prefer session-based
                if AttendanceStrategy.SESSION_BASED in winning_strategies:
                    return AttendanceStrategy.SESSION_BASED
                elif AttendanceStrategy.SINGLE_MARK in winning_strategies:
                    return AttendanceStrategy.SINGLE_MARK
            elif duration_days <= 7:
                # Multi-day events prefer day-based
                if AttendanceStrategy.DAY_BASED in winning_strategies:
                    return AttendanceStrategy.DAY_BASED
            else:
                # Long-term events prefer continuous
                if AttendanceStrategy.CONTINUOUS in winning_strategies:
                    return AttendanceStrategy.CONTINUOUS
        
        # Return the strategy with the highest score
        return winning_strategies[0]
    
    @classmethod
    def generate_attendance_sessions(cls, event_data: Dict[str, Any], strategy: AttendanceStrategy) -> List[AttendanceSession]:
        """
        Generate appropriate attendance sessions based on strategy and event data
        """
        sessions = []
        start_time = event_data.get("start_datetime")
        end_time = event_data.get("end_datetime")
        event_name = event_data.get("event_name", "Event")
        
        if not start_time or not end_time:
            return sessions
        
        if strategy == AttendanceStrategy.SINGLE_MARK:
            sessions.append(AttendanceSession(
                session_id="main_session",
                session_name=f"{event_name} - Attendance",
                session_type="single",
                start_time=start_time,
                end_time=end_time,
                is_mandatory=True,
                weight=1.0
            ))
            
        elif strategy == AttendanceStrategy.DAY_BASED:
            # Generate daily sessions
            current_date = start_time.date()
            end_date = end_time.date()
            day_count = 1
            
            while current_date <= end_date:
                # Create timezone-aware datetime objects
                # Handle both timezone-aware and timezone-naive datetimes
                if start_time.tzinfo:
                    day_start = datetime.combine(current_date, start_time.time(), tzinfo=start_time.tzinfo)
                    day_end = datetime.combine(current_date, end_time.time(), tzinfo=end_time.tzinfo)
                else:
                    day_start = datetime.combine(current_date, start_time.time())
                    day_end = datetime.combine(current_date, end_time.time())
                
                # Adjust for last day
                if current_date == end_date:
                    day_end = end_time
                
                sessions.append(AttendanceSession(
                    session_id=f"day_{day_count}",
                    session_name=f"Day {day_count} - {current_date.strftime('%B %d, %Y')}",
                    session_type="day",
                    start_time=day_start,
                    end_time=day_end,
                    is_mandatory=True,
                    weight=1.0
                ))
                
                current_date += timedelta(days=1)
                day_count += 1
                
        elif strategy == AttendanceStrategy.SESSION_BASED:
            # Generate session-based attendance (hackathon/competition rounds)
            duration = end_time - start_time
            
            if "hackathon" in event_name.lower() or "24" in event_name:
                # 24-hour hackathon sessions
                sessions.extend([
                    AttendanceSession(
                        session_id="opening",
                        session_name="Opening Ceremony",
                        session_type="session",
                        start_time=start_time,
                        end_time=start_time + timedelta(hours=2),
                        is_mandatory=True,
                        weight=0.2
                    ),
                    AttendanceSession(
                        session_id="mid_review",
                        session_name="Mid-point Review",
                        session_type="session",
                        start_time=start_time + timedelta(hours=12),
                        end_time=start_time + timedelta(hours=14),
                        is_mandatory=True,
                        weight=0.3
                    ),
                    AttendanceSession(
                        session_id="final_presentation",
                        session_name="Final Presentation",
                        session_type="session",
                        start_time=end_time - timedelta(hours=4),
                        end_time=end_time,
                        is_mandatory=True,
                        weight=0.5
                    )
                ])
            else:
                # Generic competition rounds
                session_duration = duration / 3  # Divide into 3 rounds
                for i in range(3):
                    session_start = start_time + (session_duration * i)
                    session_end = session_start + session_duration
                    
                    sessions.append(AttendanceSession(
                        session_id=f"round_{i+1}",
                        session_name=f"Round {i+1}",
                        session_type="session",
                        start_time=session_start,
                        end_time=session_end,
                        is_mandatory=True,
                        weight=1.0
                    ))
                    
        elif strategy == AttendanceStrategy.MILESTONE_BASED:
            # Cultural/technical event milestones
            sessions.extend([
                AttendanceSession(
                    session_id="registration_check",
                    session_name="Registration & Setup",
                    session_type="milestone",
                    start_time=start_time,
                    end_time=start_time + timedelta(hours=1),
                    is_mandatory=True,
                    weight=0.3
                ),
                AttendanceSession(
                    session_id="main_participation",
                    session_name="Main Event Participation",
                    session_type="milestone",
                    start_time=start_time + timedelta(hours=1),
                    end_time=end_time - timedelta(hours=1),
                    is_mandatory=True,
                    weight=0.6
                ),
                AttendanceSession(
                    session_id="completion",
                    session_name="Event Completion",
                    session_type="milestone",
                    start_time=end_time - timedelta(hours=1),
                    end_time=end_time,
                    is_mandatory=True,
                    weight=0.1
                )
            ])
            
        elif strategy == AttendanceStrategy.CONTINUOUS:
            # Long-term engagement tracking
            duration = end_time - start_time
            check_interval = max(timedelta(days=7), duration / 10)  # Weekly or 10% intervals
            
            current_time = start_time
            check_count = 1
            
            while current_time < end_time:
                next_check = min(current_time + check_interval, end_time)
                
                sessions.append(AttendanceSession(
                    session_id=f"check_{check_count}",
                    session_name=f"Progress Check {check_count}",
                    session_type="continuous_check",
                    start_time=current_time,
                    end_time=next_check,
                    is_mandatory=True,
                    weight=1.0
                ))
                
                current_time = next_check
                check_count += 1
        
        return sessions
    
    @classmethod
    def create_dynamic_config(cls, event_data: Dict[str, Any]) -> DynamicAttendanceConfig:
        """
        Create complete dynamic attendance configuration for an event
        """
        # Detect strategy
        strategy = cls.detect_attendance_strategy(event_data)
        
        # Get default criteria
        default_criteria = cls.DEFAULT_CRITERIA[strategy]
        
        # Create criteria object
        criteria = AttendanceCriteria(
            strategy=strategy,
            minimum_percentage=default_criteria.get("minimum_percentage"),
            required_sessions=default_criteria.get("required_sessions"),
            required_milestones=default_criteria.get("required_milestones"),
            auto_calculate=True
        )
        
        # Generate sessions
        sessions = cls.generate_attendance_sessions(event_data, strategy)
        
        # Create configuration
        config = DynamicAttendanceConfig(
            event_id=event_data["event_id"],
            event_type=event_data["event_type"],
            event_name=event_data["event_name"],
            strategy=strategy,
            criteria=criteria,
            sessions=sessions,
            auto_generated=True
        )
        
        return config
    
    @classmethod
    def calculate_attendance_status(cls, attendance_record: StudentAttendanceRecord, 
                                  config: DynamicAttendanceConfig) -> Dict[str, Any]:
        """
        Calculate final attendance status based on strategy and criteria
        """
        sessions_attended = len(attendance_record.sessions_attended)
        total_sessions = len(config.sessions)
        
        if total_sessions == 0:
            return {
                "status": "pending",
                "percentage": 0.0,
                "message": "No sessions configured"
            }
        
        # Calculate weighted attendance percentage
        total_weight = sum(session.weight for session in config.sessions)
        attended_weight = sum(
            session.weight 
            for session in config.sessions 
            if session.session_id in attendance_record.sessions_attended
        )
        
        percentage = (attended_weight / total_weight) * 100 if total_weight > 0 else 0
        
        # Determine status based on strategy and criteria
        if config.criteria.strategy == AttendanceStrategy.SINGLE_MARK:
            status = "present" if sessions_attended > 0 else "absent"
            
        elif config.criteria.minimum_percentage:
            status = "present" if percentage >= config.criteria.minimum_percentage else "absent"
            
        elif config.criteria.required_sessions:
            status = "present" if sessions_attended >= config.criteria.required_sessions else "absent"
            
        elif config.criteria.required_milestones:
            attended_milestones = [
                session.session_name 
                for session in config.sessions 
                if session.session_id in attendance_record.sessions_attended
            ]
            required_count = len(config.criteria.required_milestones)
            status = "present" if len(attended_milestones) >= required_count else "absent"
            
        else:
            # Default percentage-based
            status = "present" if percentage >= 75.0 else "absent"
        
        # Handle partial attendance
        if status == "absent" and percentage > 0:
            status = "partial"
        
        return {
            "status": status,
            "percentage": round(percentage, 2),
            "sessions_attended": sessions_attended,
            "total_sessions": total_sessions,
            "message": cls._get_status_message(status, percentage, config.criteria.strategy)
        }
    
    @classmethod
    def _get_status_message(cls, status: str, percentage: float, strategy: AttendanceStrategy) -> str:
        """Generate human-readable status message"""
        if status == "present":
            if strategy == AttendanceStrategy.SINGLE_MARK:
                return "Attendance marked successfully"
            else:
                return f"Attendance complete ({percentage}%)"
                
        elif status == "partial":
            return f"Partial attendance ({percentage}%) - below required threshold"
            
        else:  # absent
            return "Attendance not marked or below minimum requirement"

    async def analyze_event_requirements(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze event requirements and provide comprehensive attendance strategy analysis
        This method is called by the attendance preview API
        """
        try:
            # Detect the appropriate attendance strategy
            detected_strategy = self.detect_attendance_strategy(event_data)
            
            # Generate sessions based on the detected strategy
            sessions = self.generate_attendance_sessions(event_data, detected_strategy)
            
            # Get default criteria for the strategy
            criteria_config = self.DEFAULT_CRITERIA.get(detected_strategy, {})
            
            # Create criteria object
            criteria = AttendanceCriteria(
                strategy=detected_strategy,
                minimum_percentage=criteria_config.get("minimum_percentage"),
                required_sessions=criteria_config.get("required_sessions"),
                required_milestones=criteria_config.get("required_milestones"),
                auto_calculate=True
            )
            
            # Calculate event duration
            start_time = event_data.get("start_datetime")
            end_time = event_data.get("end_datetime")
            duration_hours = 0
            if start_time and end_time:
                duration = end_time - start_time
                duration_hours = duration.total_seconds() / 3600
            
            # Generate strategy analysis
            strategy_info = {
                "type": detected_strategy.value,
                "name": self._get_strategy_display_name(detected_strategy),
                "description": criteria_config.get("description", ""),
                "reasoning": self._get_strategy_reasoning(event_data, detected_strategy, duration_hours),
                "confidence": self._calculate_confidence_score(event_data, detected_strategy),
                "sessions": [
                    {
                        "session_id": session.session_id,
                        "session_name": session.session_name,
                        "session_type": session.session_type,
                        "start_time": session.start_time.isoformat(),
                        "end_time": session.end_time.isoformat(),
                        "duration_minutes": int((session.end_time - session.start_time).total_seconds() / 60),
                        "is_mandatory": session.is_mandatory,
                        "weight": session.weight
                    }
                    for session in sessions
                ],
                "config": {
                    "strategy": detected_strategy.value,
                    "criteria": criteria.dict(),
                    "total_sessions": len(sessions),
                    "mandatory_sessions": len([s for s in sessions if s.is_mandatory])
                },
                "criteria": criteria.dict(),
                "estimated_completion_rate": self._estimate_completion_rate(detected_strategy, len(sessions)),
                "recommendations": self._generate_recommendations(event_data, detected_strategy, sessions)
            }
            
            return {
                "success": True,
                "strategy": strategy_info
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def _get_strategy_display_name(self, strategy: AttendanceStrategy) -> str:
        """Get human-readable strategy name"""
        names = {
            AttendanceStrategy.SINGLE_MARK: "Single Attendance",
            AttendanceStrategy.DAY_BASED: "Daily Attendance",
            AttendanceStrategy.SESSION_BASED: "Session-Based Attendance",
            AttendanceStrategy.MILESTONE_BASED: "Milestone-Based Attendance",
            AttendanceStrategy.CONTINUOUS: "Continuous Engagement"
        }
        return names.get(strategy, "Unknown Strategy")
    
    def _get_strategy_reasoning(self, event_data: Dict[str, Any], strategy: AttendanceStrategy, duration_hours: float) -> str:
        """Generate reasoning for why this strategy was selected"""
        event_type = event_data.get("event_type", "").lower()
        event_name = event_data.get("event_name", "").lower()
        
        if strategy == AttendanceStrategy.SINGLE_MARK:
            return f"Short-duration event ({duration_hours:.1f} hours) suitable for single attendance marking"
        elif strategy == AttendanceStrategy.DAY_BASED:
            return f"Multi-day event detected with training/workshop characteristics"
        elif strategy == AttendanceStrategy.SESSION_BASED:
            return f"Competition or hackathon format detected with multiple rounds/sessions"
        elif strategy == AttendanceStrategy.MILESTONE_BASED:
            return f"Cultural or technical event with distinct phases/milestones"
        elif strategy == AttendanceStrategy.CONTINUOUS:
            return f"Long-term event requiring continuous engagement tracking"
        else:
            return "Strategy selected based on event characteristics"
    
    def _calculate_confidence_score(self, event_data: Dict[str, Any], strategy: AttendanceStrategy) -> float:
        """Calculate confidence score for strategy selection"""
        event_name = event_data.get("event_name", "").lower()
        event_type = event_data.get("event_type", "").lower()
        description = event_data.get("detailed_description", "").lower()
        combined_text = f"{event_name} {event_type} {description}"
        
        # Count pattern matches for the selected strategy
        patterns = self.EVENT_TYPE_PATTERNS.get(strategy, [])
        match_count = sum(len(re.findall(pattern, combined_text)) for pattern in patterns)
        
        # Base confidence + bonus for matches
        base_confidence = 0.6
        match_bonus = min(0.3, match_count * 0.1)
        
        return min(0.95, base_confidence + match_bonus)
    
    def _estimate_completion_rate(self, strategy: AttendanceStrategy, session_count: int) -> float:
        """Estimate completion rate based on strategy and session count"""
        base_rates = {
            AttendanceStrategy.SINGLE_MARK: 0.9,
            AttendanceStrategy.DAY_BASED: 0.8,
            AttendanceStrategy.SESSION_BASED: 0.75,
            AttendanceStrategy.MILESTONE_BASED: 0.7,
            AttendanceStrategy.CONTINUOUS: 0.65
        }
        
        base_rate = base_rates.get(strategy, 0.75)
        
        # Reduce rate based on complexity (more sessions = lower completion)
        if session_count > 5:
            base_rate -= 0.1
        elif session_count > 3:
            base_rate -= 0.05
        
        return max(0.5, base_rate)
    
    def _generate_recommendations(self, event_data: Dict[str, Any], strategy: AttendanceStrategy, 
                                sessions: List[AttendanceSession]) -> List[str]:
        """Generate recommendations for the selected strategy"""
        recommendations = []
        
        session_count = len(sessions)
        mandatory_count = len([s for s in sessions if s.is_mandatory])
        
        if strategy == AttendanceStrategy.SINGLE_MARK:
            recommendations.append("Simple attendance marking - participants mark once during event")
            recommendations.append("Consider QR code or digital check-in for efficiency")
        
        elif strategy == AttendanceStrategy.DAY_BASED:
            recommendations.append(f"Daily attendance tracking across {session_count} day(s)")
            recommendations.append("80% daily attendance required for completion")
        
        elif strategy == AttendanceStrategy.SESSION_BASED:
            recommendations.append(f"Track attendance across {session_count} sessions/rounds")
            recommendations.append(f"{mandatory_count} mandatory sessions must be attended")
            if session_count > 4:
                recommendations.append("Consider reducing sessions for better completion rates")
        
        elif strategy == AttendanceStrategy.MILESTONE_BASED:
            recommendations.append("Milestone-based tracking for cultural/technical events")
            recommendations.append("Track key phases: registration, participation, completion")
        
        elif strategy == AttendanceStrategy.CONTINUOUS:
            recommendations.append("Continuous engagement monitoring")
            recommendations.append("90% participation required throughout event duration")
        
        # General recommendations
        if session_count > 3:
            recommendations.append("Consider automated attendance tracking tools")
        
        return recommendations


class DynamicAttendanceService:
    """Service for managing dynamic attendance configurations and tracking"""
    
    def __init__(self):
        self.intelligence_service = AttendanceIntelligenceService()
    
    async def create_attendance_config_for_event(self, event_data: Dict[str, Any]) -> DynamicAttendanceConfig:
        """Create and store attendance configuration for an event"""
        config = self.intelligence_service.create_dynamic_config(event_data)
        
        # Store configuration in database
        from database.operations import DatabaseOperations
        
        await DatabaseOperations.insert_one(
            "attendance_configs",
            config.dict()
        )
        
        return config
    
    async def get_attendance_config(self, event_id: str) -> Optional[DynamicAttendanceConfig]:
        """Get attendance configuration for an event"""
        from database.operations import DatabaseOperations
        
        config_data = await DatabaseOperations.find_one(
            "attendance_configs",
            {"event_id": event_id}
        )
        
        if config_data:
            return DynamicAttendanceConfig(**config_data)
        return None
    
    async def mark_session_attendance(self, event_id: str, session_id: str, 
                                    student_enrollment: str, 
                                    attendance_data: Dict[str, Any]) -> Dict[str, Any]:
        """Mark attendance for a specific session"""
        from database.operations import DatabaseOperations
        
        # Get or create attendance record
        record_data = await DatabaseOperations.find_one(
            "student_attendance_records",
            {
                "student_enrollment": student_enrollment,
                "event_id": event_id
            }
        )
        
        if not record_data:
            record = StudentAttendanceRecord(
                student_enrollment=student_enrollment,
                event_id=event_id
            )
        else:
            record = StudentAttendanceRecord(**record_data)
        
        # Mark session attendance
        record.sessions_attended[session_id] = {
            "marked_at": datetime.utcnow(),
            "attendance_id": attendance_data.get("attendance_id"),
            **attendance_data
        }
        
        # Get config and recalculate status
        config = await self.get_attendance_config(event_id)
        if config:
            status_result = self.intelligence_service.calculate_attendance_status(record, config)
            record.overall_percentage = status_result["percentage"]
            record.final_status = status_result["status"]
            record.calculated_at = datetime.utcnow()
        
        # Update record in database
        await DatabaseOperations.upsert_one(
            "student_attendance_records",
            {
                "student_enrollment": student_enrollment,
                "event_id": event_id
            },
            record.dict()
        )
        
        return {
            "success": True,
            "session_marked": session_id,
            "overall_status": record.final_status,
            "percentage": record.overall_percentage
        }
    
    async def get_student_attendance_status(self, event_id: str, 
                                          student_enrollment: str) -> Dict[str, Any]:
        """Get comprehensive attendance status for a student"""
        from database.operations import DatabaseOperations
        
        # Get attendance record
        record_data = await DatabaseOperations.find_one(
            "student_attendance_records",
            {
                "student_enrollment": student_enrollment,
                "event_id": event_id
            }
        )
        
        # Get attendance config
        config = await self.get_attendance_config(event_id)
        
        if not config:
            return {
                "success": False,
                "message": "Attendance configuration not found for event"
            }
        
        if not record_data:
            # No attendance record yet
            return {
                "success": True,
                "attendance_strategy": config.strategy.value,
                "sessions": [session.dict() for session in config.sessions],
                "sessions_attended": [],
                "overall_percentage": 0.0,
                "final_status": "pending",
                "next_session": self._get_next_session(config)
            }
        
        record = StudentAttendanceRecord(**record_data)
        
        # Recalculate status
        status_result = self.intelligence_service.calculate_attendance_status(record, config)
        
        return {
            "success": True,
            "attendance_strategy": config.strategy.value,
            "sessions": [session.dict() for session in config.sessions],
            "sessions_attended": list(record.sessions_attended.keys()),
            "attendance_details": record.sessions_attended,
            "overall_percentage": status_result["percentage"],
            "final_status": status_result["status"],
            "message": status_result["message"],
            "next_session": self._get_next_session(config, record.sessions_attended)
        }
    
    def _get_next_session(self, config: DynamicAttendanceConfig, 
                         attended_sessions: Dict[str, Any] = None) -> Optional[Dict[str, Any]]:
        """Get next available session for attendance"""
        if not attended_sessions:
            attended_sessions = {}
        
        current_time = datetime.utcnow()
        
        for session in config.sessions:
            if (session.session_id not in attended_sessions and 
                session.start_time <= current_time <= session.end_time):
                return {
                    "session_id": session.session_id,
                    "session_name": session.session_name,
                    "session_type": session.session_type,
                    "end_time": session.end_time,
                    "is_mandatory": session.is_mandatory
                }
        
        return None
