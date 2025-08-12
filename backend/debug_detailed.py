#!/usr/bin/env python3
"""
Enhanced debug script to see internal scoring
"""

from datetime import datetime
import re
from models.dynamic_attendance import AttendanceStrategy, AttendanceIntelligenceService

def debug_strategy_detection(event_data):
    """Debug version of detect_attendance_strategy with verbose output"""
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
    
    print(f"Combined text: '{combined_text}'")
    print(f"Duration: {duration_hours} hours, {duration_days} days")
    
    # Score each strategy based on pattern matches
    strategy_scores = {}
    
    for strategy, patterns in AttendanceIntelligenceService.EVENT_TYPE_PATTERNS.items():
        score = 0
        for pattern in patterns:
            matches = len(re.findall(pattern, combined_text))
            score += matches
        strategy_scores[strategy] = score
        if score > 0:
            print(f"Pattern match - {strategy}: {score}")
    
    print(f"Initial pattern scores: {strategy_scores}")
    
    # Apply duration-based heuristics (simulate the enhanced logic)
    # 1. VERY SHORT EVENTS (<= 6 hours) - Strong preference for SINGLE_MARK
    if duration_hours <= 6:
        strategy_scores[AttendanceStrategy.SINGLE_MARK] += 3
        print(f"Applied: Very short event bonus (+3 to SINGLE_MARK)")
        # Exception: Even short hackathons can be session-based
        if "hackathon" in combined_text or "marathon" in combined_text:
            strategy_scores[AttendanceStrategy.SESSION_BASED] += 3
            print(f"Applied: Hackathon exception (+3 to SESSION_BASED)")
    
    # 2. MEDIUM EVENTS (6-24 hours) - Context and duration matter
    elif duration_hours <= 24:
        if "hackathon" in combined_text or "marathon" in combined_text or "24" in combined_text:
            strategy_scores[AttendanceStrategy.SESSION_BASED] += 4
            print(f"Applied: Hackathon medium event (+4 to SESSION_BASED)")
        elif "workshop" in combined_text or "training" in combined_text:
            if duration_hours >= 10:  # Long workshops can be session-based
                strategy_scores[AttendanceStrategy.SESSION_BASED] += 2
                print(f"Applied: Long workshop (+2 to SESSION_BASED)")
            else:
                strategy_scores[AttendanceStrategy.SINGLE_MARK] += 2
                print(f"Applied: Short workshop (+2 to SINGLE_MARK)")
        elif duration_hours >= 8:  # Long single-day events default to session-based
            strategy_scores[AttendanceStrategy.SESSION_BASED] += 2
            print(f"Applied: Long single-day event (+2 to SESSION_BASED)")
        else:  # Shorter events default to single mark
            strategy_scores[AttendanceStrategy.SINGLE_MARK] += 1
            print(f"Applied: Short-medium event (+1 to SINGLE_MARK)")
    
    print(f"After duration heuristics: {strategy_scores}")
    
    # Check fallback logic
    max_pattern_score = max(strategy_scores.values()) if strategy_scores else 0
    print(f"Max pattern score: {max_pattern_score}")
    
    # Apply duration-based logic if pattern scores are low or tied
    if max_pattern_score <= 2:  # Weak or no pattern matches
        print("Applying fallback duration logic...")
        if duration_hours <= 4:
            strategy_scores[AttendanceStrategy.SINGLE_MARK] = max(strategy_scores.get(AttendanceStrategy.SINGLE_MARK, 0), 3)
            print(f"Applied: Very short fallback (+3 to SINGLE_MARK)")
        elif duration_hours <= 24:
            if duration_hours >= 8:
                strategy_scores[AttendanceStrategy.SESSION_BASED] = max(strategy_scores.get(AttendanceStrategy.SESSION_BASED, 0), 3)
                print(f"Applied: Medium duration fallback (+3 to SESSION_BASED)")
            else:
                strategy_scores[AttendanceStrategy.SINGLE_MARK] = max(strategy_scores.get(AttendanceStrategy.SINGLE_MARK, 0), 3)
                print(f"Applied: Short duration fallback (+3 to SINGLE_MARK)")
    
    print(f"Final scores: {strategy_scores}")
    
    # Determine the winning strategy
    max_score = max(strategy_scores.values()) if strategy_scores else 0
    winning_strategies = [strategy for strategy, score in strategy_scores.items() if score == max_score]
    
    print(f"Winning strategies: {winning_strategies}")
    print(f"Final decision: {winning_strategies[0]}")
    
    return winning_strategies[0]

# Test the problematic case
unknown_medium = {
    "event_name": "Mystery Long Event",
    "event_type": "unknown",
    "detailed_description": "Some longer event with no clear category",
    "start_datetime": datetime(2024, 5, 1, 9, 0),
    "end_datetime": datetime(2024, 5, 1, 19, 0),  # 10 hours
    "registration_mode": "individual"
}

print("=== DEBUGGING UNKNOWN MEDIUM EVENT ===")
result = debug_strategy_detection(unknown_medium)
