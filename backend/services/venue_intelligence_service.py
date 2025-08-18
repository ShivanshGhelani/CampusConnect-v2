"""
Venue Intelligence Service for Attendance Strategy Enhancement
=============================================================

This service provides intelligent venue analysis to enhance attendance strategy detection.
Venues play a crucial role in determining the appropriate attendance management approach.

Key Features:
- Venue type classification
- Capacity-based strategy hints
- Location context analysis
- Venue-specific attendance patterns
- Integration with dynamic attendance system
"""

from typing import Dict, List, Optional, Any
from enum import Enum
from dataclasses import dataclass

import re

class VenueType(Enum):
    """Venue type classifications for attendance strategy hints"""
    AUDITORIUM = "auditorium"           # Large capacity, formal events
    CLASSROOM = "classroom"             # Small capacity, academic sessions
    LABORATORY = "laboratory"           # Technical, hands-on activities
    SPORTS_FACILITY = "sports_facility" # Physical activities, tournaments
    OUTDOOR_SPACE = "outdoor_space"     # Cultural events, large gatherings
    CONFERENCE_HALL = "conference_hall" # Professional events, seminars
    WORKSHOP_SPACE = "workshop_space"   # Interactive sessions, training
    CULTURAL_CENTER = "cultural_center" # Arts, performances, exhibitions
    MULTI_PURPOSE = "multi_purpose"     # Flexible spaces for various events
    ONLINE_PLATFORM = "online_platform" # Virtual events

@dataclass
class VenueCharacteristics:
    """Venue characteristics for intelligent analysis"""
    venue_type: VenueType
    capacity_range: str  # "small", "medium", "large", "very_large"
    formality_level: str  # "formal", "semi_formal", "informal"
    activity_type: str   # "passive", "interactive", "physical", "technical"
    monitoring_ease: str # "easy", "moderate", "difficult"
    strategy_hints: List[str]  # Suggested attendance strategies

class VenueIntelligenceService:
    """Service for analyzing venue characteristics and providing attendance strategy hints"""
    
    # Venue classification patterns
    VENUE_CLASSIFICATION_PATTERNS = {
        VenueType.AUDITORIUM: [
            r"auditorium|amphitheater|hall|main.*hall|assembly.*hall",
            r"lecture.*hall|presentation.*hall|conference.*auditorium"
        ],
        VenueType.CLASSROOM: [
            r"classroom|class.*room|lecture.*room|seminar.*room",
            r"room.*\d+|cr.*\d+|lr.*\d+|tutorial.*room"
        ],
        VenueType.LABORATORY: [
            r"lab|laboratory|computer.*lab|tech.*lab|innovation.*lab",
            r"maker.*space|fab.*lab|research.*lab|science.*lab"
        ],
        VenueType.SPORTS_FACILITY: [
            r"ground|field|stadium|sports.*complex|gymnasium|court",
            r"playground|athletic.*track|sports.*ground|football.*field"
        ],
        VenueType.OUTDOOR_SPACE: [
            r"garden|lawn|courtyard|plaza|open.*space|outdoor",
            r"amphitheater|open.*air|ground|campus.*ground"
        ],
        VenueType.CONFERENCE_HALL: [
            r"conference.*hall|convention.*center|business.*center",
            r"meeting.*hall|seminar.*hall|corporate.*hall"
        ],
        VenueType.WORKSHOP_SPACE: [
            r"workshop|training.*room|activity.*center|studio",
            r"hands.*on.*space|practical.*room|interactive.*space"
        ],
        VenueType.CULTURAL_CENTER: [
            r"cultural.*center|arts.*center|performance.*hall",
            r"exhibition.*hall|gallery|theater|cultural.*complex"
        ],
        VenueType.MULTI_PURPOSE: [
            r"multi.*purpose|multipurpose|flexible.*space|activity.*hall",
            r"function.*hall|event.*space|general.*purpose"
        ],
        VenueType.ONLINE_PLATFORM: [
            r"online|virtual|zoom|teams|meet|webinar|digital",
            r"remote|web.*based|internet|streaming"
        ]
    }
    
    # Venue characteristics database
    VENUE_CHARACTERISTICS = {
        VenueType.AUDITORIUM: VenueCharacteristics(
            venue_type=VenueType.AUDITORIUM,
            capacity_range="large",
            formality_level="formal",
            activity_type="passive",
            monitoring_ease="easy",
            strategy_hints=["single_mark", "milestone_based"]
        ),
        VenueType.CLASSROOM: VenueCharacteristics(
            venue_type=VenueType.CLASSROOM,
            capacity_range="small",
            formality_level="formal",
            activity_type="interactive",
            monitoring_ease="easy",
            strategy_hints=["single_mark", "session_based"]
        ),
        VenueType.LABORATORY: VenueCharacteristics(
            venue_type=VenueType.LABORATORY,
            capacity_range="small",
            formality_level="semi_formal",
            activity_type="technical",
            monitoring_ease="moderate",
            strategy_hints=["session_based", "continuous"]
        ),
        VenueType.SPORTS_FACILITY: VenueCharacteristics(
            venue_type=VenueType.SPORTS_FACILITY,
            capacity_range="medium",
            formality_level="informal",
            activity_type="physical",
            monitoring_ease="moderate",
            strategy_hints=["day_based", "session_based"]
        ),
        VenueType.OUTDOOR_SPACE: VenueCharacteristics(
            venue_type=VenueType.OUTDOOR_SPACE,
            capacity_range="very_large",
            formality_level="informal",
            activity_type="interactive",
            monitoring_ease="difficult",
            strategy_hints=["milestone_based", "day_based"]
        ),
        VenueType.CONFERENCE_HALL: VenueCharacteristics(
            venue_type=VenueType.CONFERENCE_HALL,
            capacity_range="medium",
            formality_level="formal",
            activity_type="passive",
            monitoring_ease="easy",
            strategy_hints=["single_mark", "day_based"]
        ),
        VenueType.WORKSHOP_SPACE: VenueCharacteristics(
            venue_type=VenueType.WORKSHOP_SPACE,
            capacity_range="small",
            formality_level="semi_formal",
            activity_type="interactive",
            monitoring_ease="easy",
            strategy_hints=["session_based", "single_mark"]
        ),
        VenueType.CULTURAL_CENTER: VenueCharacteristics(
            venue_type=VenueType.CULTURAL_CENTER,
            capacity_range="medium",
            formality_level="semi_formal",
            activity_type="interactive",
            monitoring_ease="moderate",
            strategy_hints=["milestone_based", "session_based"]
        ),
        VenueType.MULTI_PURPOSE: VenueCharacteristics(
            venue_type=VenueType.MULTI_PURPOSE,
            capacity_range="medium",
            formality_level="semi_formal",
            activity_type="interactive",
            monitoring_ease="moderate",
            strategy_hints=["session_based", "milestone_based"]
        ),
        VenueType.ONLINE_PLATFORM: VenueCharacteristics(
            venue_type=VenueType.ONLINE_PLATFORM,
            capacity_range="large",
            formality_level="formal",
            activity_type="passive",
            monitoring_ease="easy",
            strategy_hints=["single_mark", "session_based"]
        )
    }
    
    # Capacity estimation patterns
    CAPACITY_PATTERNS = {
        "small": [r"room|classroom|lab|studio", r"capacity.*[1-4]\d|[1-4]\d.*seater"],
        "medium": [r"hall|center|space", r"capacity.*[5-9]\d|[5-9]\d.*seater"],
        "large": [r"auditorium|theater|complex", r"capacity.*[1-9]\d{2}|[1-9]\d{2}.*seater"],
        "very_large": [r"stadium|ground|field|arena", r"capacity.*\d{4,}|\d{4,}.*seater"]
    }
    
    @classmethod
    def analyze_venue(cls, venue_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze venue characteristics and provide attendance strategy hints
        
        Args:
            venue_data: Dictionary containing venue information
            
        Returns:
            Dictionary with venue analysis and strategy recommendations
        """
        # Extract venue information
        venue_name = str(venue_data.get("venue_name", "")).lower()
        venue_type_input = str(venue_data.get("venue_type", "")).lower()
        venue_description = str(venue_data.get("description", "")).lower()
        venue_capacity = venue_data.get("capacity")
        
        # Combine text for analysis
        combined_venue_text = f"{venue_name} {venue_type_input} {venue_description}"
        
        # Classify venue type
        detected_venue_type = cls._classify_venue_type(combined_venue_text)
        
        # Estimate capacity range
        capacity_range = cls._estimate_capacity_range(combined_venue_text, venue_capacity)
        
        # Get venue characteristics
        characteristics = cls.VENUE_CHARACTERISTICS.get(
            detected_venue_type, 
            cls.VENUE_CHARACTERISTICS[VenueType.MULTI_PURPOSE]
        )
        
        # Override capacity range if detected from text/numbers
        if capacity_range != "medium":  # Don't override if we couldn't detect
            characteristics.capacity_range = capacity_range
        
        # Generate strategy recommendations based on venue
        strategy_recommendations = cls._generate_venue_strategy_recommendations(
            characteristics, combined_venue_text
        )
        
        # Calculate confidence score
        confidence_score = cls._calculate_venue_confidence(
            detected_venue_type, combined_venue_text
        )
        
        return {
            "venue_type": detected_venue_type.value,
            "venue_type_display": detected_venue_type.value.replace("_", " ").title(),
            "capacity_range": characteristics.capacity_range,
            "formality_level": characteristics.formality_level,
            "activity_type": characteristics.activity_type,
            "monitoring_ease": characteristics.monitoring_ease,
            "strategy_hints": strategy_recommendations,
            "confidence_score": confidence_score,
            "venue_characteristics": characteristics.__dict__,
            "analysis_reasoning": cls._generate_venue_reasoning(
                detected_venue_type, characteristics, combined_venue_text
            )
        }
    
    @classmethod
    def _classify_venue_type(cls, venue_text: str) -> VenueType:
        """Classify venue type based on text patterns"""
        type_scores = {}
        
        # Score each venue type based on pattern matches
        for venue_type, patterns in cls.VENUE_CLASSIFICATION_PATTERNS.items():
            score = 0
            for pattern in patterns:
                matches = len(re.findall(pattern, venue_text))
                score += matches
            type_scores[venue_type] = score
        
        # Find the highest scoring venue type
        max_score = max(type_scores.values()) if type_scores else 0
        
        if max_score == 0:
            return VenueType.MULTI_PURPOSE  # Default fallback
        
        # Return the venue type with highest score
        for venue_type, score in type_scores.items():
            if score == max_score:
                return venue_type
        
        return VenueType.MULTI_PURPOSE
    
    @classmethod
    def _estimate_capacity_range(cls, venue_text: str, capacity_number: Optional[int] = None) -> str:
        """Estimate venue capacity range from text and numbers"""
        
        # If we have a specific capacity number, use it
        if capacity_number:
            if capacity_number <= 50:
                return "small"
            elif capacity_number <= 200:
                return "medium"
            elif capacity_number <= 1000:
                return "large"
            else:
                return "very_large"
        
        # Otherwise, analyze text patterns
        for capacity_range, patterns in cls.CAPACITY_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, venue_text):
                    return capacity_range
        
        return "medium"  # Default fallback
    
    @classmethod
    def _generate_venue_strategy_recommendations(cls, characteristics: VenueCharacteristics, 
                                               venue_text: str) -> List[Dict[str, Any]]:
        """Generate specific strategy recommendations for the venue"""
        recommendations = []
        
        for strategy_hint in characteristics.strategy_hints:
            # Create detailed recommendation with reasoning
            recommendation = {
                "strategy": strategy_hint,
                "priority": "high" if strategy_hint == characteristics.strategy_hints[0] else "medium",
                "reasoning": cls._get_strategy_venue_reasoning(strategy_hint, characteristics),
                "suitability_score": cls._calculate_strategy_suitability(
                    strategy_hint, characteristics, venue_text
                )
            }
            recommendations.append(recommendation)
        
        # Sort by suitability score
        recommendations.sort(key=lambda x: x["suitability_score"], reverse=True)
        
        return recommendations
    
    @classmethod
    def _get_strategy_venue_reasoning(cls, strategy: str, characteristics: VenueCharacteristics) -> str:
        """Get reasoning for why a strategy suits this venue type"""
        venue_type = characteristics.venue_type.value.replace("_", " ")
        
        reasoning_map = {
            "single_mark": f"Single attendance marking suits {venue_type} with {characteristics.formality_level} setting and {characteristics.monitoring_ease} monitoring",
            "day_based": f"Daily tracking appropriate for {venue_type} with {characteristics.capacity_range} capacity and {characteristics.activity_type} activities",
            "session_based": f"Session-based tracking ideal for {venue_type} with {characteristics.activity_type} activities and {characteristics.monitoring_ease} monitoring",
            "milestone_based": f"Milestone tracking suits {venue_type} with {characteristics.activity_type} activities and {characteristics.formality_level} environment",
            "continuous": f"Continuous monitoring appropriate for {venue_type} with {characteristics.activity_type} activities requiring sustained engagement"
        }
        
        return reasoning_map.get(strategy, f"Strategy suitable for {venue_type} characteristics")
    
    @classmethod
    def _calculate_strategy_suitability(cls, strategy: str, characteristics: VenueCharacteristics, 
                                      venue_text: str) -> float:
        """Calculate how suitable a strategy is for this venue"""
        base_score = 0.6
        
        # Venue type specific bonuses
        if strategy == "single_mark":
            if characteristics.venue_type in [VenueType.AUDITORIUM, VenueType.CONFERENCE_HALL]:
                base_score += 0.3
            elif characteristics.monitoring_ease == "easy":
                base_score += 0.2
        
        elif strategy == "session_based":
            if characteristics.venue_type in [VenueType.LABORATORY, VenueType.WORKSHOP_SPACE]:
                base_score += 0.3
            elif characteristics.activity_type == "technical":
                base_score += 0.2
        
        elif strategy == "day_based":
            if characteristics.venue_type == VenueType.SPORTS_FACILITY:
                base_score += 0.3
            elif characteristics.capacity_range in ["medium", "large"]:
                base_score += 0.1
        
        elif strategy == "milestone_based":
            if characteristics.venue_type in [VenueType.CULTURAL_CENTER, VenueType.OUTDOOR_SPACE]:
                base_score += 0.3
            elif characteristics.activity_type == "interactive":
                base_score += 0.2
        
        elif strategy == "continuous":
            if characteristics.venue_type == VenueType.LABORATORY:
                base_score += 0.2
            elif "research" in venue_text or "long" in venue_text:
                base_score += 0.1
        
        return min(1.0, base_score)
    
    @classmethod
    def _calculate_venue_confidence(cls, venue_type: VenueType, venue_text: str) -> float:
        """Calculate confidence score for venue classification"""
        patterns = cls.VENUE_CLASSIFICATION_PATTERNS.get(venue_type, [])
        match_count = sum(len(re.findall(pattern, venue_text)) for pattern in patterns)
        
        base_confidence = 0.5
        match_bonus = min(0.4, match_count * 0.1)
        text_length_bonus = min(0.1, len(venue_text) / 100)  # Bonus for more detailed descriptions
        
        return min(0.95, base_confidence + match_bonus + text_length_bonus)
    
    @classmethod
    def _generate_venue_reasoning(cls, venue_type: VenueType, characteristics: VenueCharacteristics, 
                                venue_text: str) -> str:
        """Generate human-readable reasoning for venue analysis"""
        venue_name = venue_type.value.replace("_", " ").title()
        
        reasoning = f"Classified as {venue_name} based on venue name/description patterns. "
        reasoning += f"This venue type typically has {characteristics.capacity_range} capacity, "
        reasoning += f"{characteristics.formality_level} formality level, and supports {characteristics.activity_type} activities. "
        reasoning += f"Attendance monitoring is expected to be {characteristics.monitoring_ease}."
        
        return reasoning
    
    @classmethod
    def get_venue_strategy_bonus(cls, venue_analysis: Dict[str, Any], event_strategy: str) -> float:
        """
        Get bonus score for strategy based on venue analysis
        Used by the main attendance strategy detection algorithm
        """
        strategy_hints = venue_analysis.get("strategy_hints", [])
        
        for hint in strategy_hints:
            if hint["strategy"] == event_strategy:
                # Convert suitability score to bonus (0-3 range)
                return hint["suitability_score"] * 3.0
        
        return 0.0
    
    @classmethod
    def is_venue_suitable_for_strategy(cls, venue_analysis: Dict[str, Any], 
                                     strategy: str, threshold: float = 0.7) -> bool:
        """Check if venue is suitable for a specific attendance strategy"""
        strategy_hints = venue_analysis.get("strategy_hints", [])
        
        for hint in strategy_hints:
            if hint["strategy"] == strategy:
                return hint["suitability_score"] >= threshold
        
        return False
    
    @classmethod
    def get_venue_recommendations(cls, venue_analysis: Dict[str, Any]) -> List[str]:
        """Get venue-specific recommendations for attendance management"""
        recommendations = []
        
        venue_type = venue_analysis.get("venue_type", "")
        monitoring_ease = venue_analysis.get("monitoring_ease", "")
        capacity_range = venue_analysis.get("capacity_range", "")
        
        # Monitoring recommendations
        if monitoring_ease == "difficult":
            recommendations.append("Consider digital check-in methods for easier attendance tracking")
            recommendations.append("Use multiple check-in points if venue is large or outdoor")
        
        elif monitoring_ease == "easy":
            recommendations.append("Single check-in point should be sufficient for this venue")
        
        # Capacity-based recommendations
        if capacity_range == "very_large":
            recommendations.append("Consider QR codes or mobile apps for efficient mass attendance")
            recommendations.append("Plan for multiple attendance collection points")
        
        elif capacity_range == "small":
            recommendations.append("Manual attendance tracking is feasible for this venue size")
        
        # Venue-specific recommendations
        if venue_type == "outdoor_space":
            recommendations.append("Weather backup plan may affect attendance tracking")
            recommendations.append("Consider GPS-based check-in for outdoor events")
        
        elif venue_type == "online_platform":
            recommendations.append("Use platform-specific attendance features (login tracking, engagement metrics)")
            recommendations.append("Consider screenshot verification for important sessions")
        
        elif venue_type == "laboratory":
            recommendations.append("Track attendance per lab session or experiment")
            recommendations.append("Consider safety compliance as part of attendance criteria")
        
        return recommendations
