"""
Missing Event Type Patterns Enhancement (Phase 1.4)
===================================================

This module adds support for additional event types that were not covered
in the original pattern recognition system. These are common real-world events
that needed specific attendance strategy handling.

Key Additions:
- Academic events (thesis defense, viva, examinations)
- Professional events (placement drives, industry interactions)
- Social events (community service, volunteer programs)
- Specialized technical events (bootcamps, certification programs)
- Hybrid and online event patterns
- Government and institutional events
"""

from typing import Dict, List, Any
from models.dynamic_attendance import AttendanceStrategy

class MissingEventTypePatternsService:
    """Service to handle additional event types not covered in base patterns"""
    
    # Additional event type patterns for specialized events
    ADDITIONAL_EVENT_PATTERNS = {
        AttendanceStrategy.SINGLE_MARK: [
            # Academic Ceremonies & Formal Events
            r"thesis.*defense|viva.*voce|dissertation.*defense|oral.*exam",
            r"convocation|graduation|commencement|degree.*ceremony|diploma.*ceremony",
            r"orientation|induction|welcome.*ceremony|farewell|valedictory",
            r"memorial.*service|tribute|dedication.*ceremony|foundation.*day",
            
            # Professional & Industry Events
            r"placement.*drive|recruitment.*drive|job.*interview|career.*counseling",
            r"industry.*interaction|corporate.*visit|company.*presentation",
            r"alumni.*meet|networking.*session|professional.*meet",
            r"skill.*assessment|aptitude.*test|screening.*test",
            
            # Health & Welfare Events
            r"medical.*camp|health.*checkup|vaccination.*drive|blood.*donation",
            r"health.*awareness|mental.*health|wellness.*program|fitness.*assessment",
            r"eye.*checkup|dental.*checkup|medical.*screening",
            
            # Information Sessions
            r"information.*session|briefing|announcement|notice|circular",
            r"instruction.*session|guideline.*session|rule.*explanation",
            r"policy.*briefing|procedure.*explanation|system.*demo",
            
            # Single-day Cultural Events
            r"cultural.*program|cultural.*evening|cultural.*night",
            r"talent.*show|performance|concert|music.*show|dance.*performance",
            r"drama|play|theater|skit|mime|storytelling",
            
            # Single-day Technical Events
            r"tech.*talk|technical.*session|expert.*talk|industry.*expert",
            r"product.*demo|technology.*showcase|software.*demo|app.*launch"
        ],
        
        AttendanceStrategy.DAY_BASED: [
            # Academic Programs
            r"semester.*program|academic.*session|course.*work|class.*schedule",
            r"examination|exam.*schedule|test.*series|assessment.*program",
            r"practical.*exam|lab.*exam|project.*evaluation|assignment.*submission",
            r"revision.*program|doubt.*clearing|tutorial.*session|help.*desk",
            
            # Intensive Programs
            r"bootcamp|intensive.*program|crash.*course|accelerated.*learning",
            r"certification.*program|skill.*development|capacity.*building",
            r"training.*program|professional.*development|upskilling",
            r"language.*course|communication.*skills|soft.*skills.*training",
            
            # Extended Workshops
            r"hands.*on.*training|practical.*training|laboratory.*work|fieldwork",
            r"project.*work|group.*project|team.*project|collaborative.*work",
            r"research.*work|data.*collection|survey.*work|study.*program",
            
            # Multi-day Cultural & Social
            r"cultural.*week|festival.*week|celebration.*week|awareness.*week",
            r"social.*service.*week|community.*service|volunteer.*program",
            r"environmental.*program|cleanliness.*drive|green.*initiative",
            
            # Extended Sports & Physical Activities
            r"sports.*week|athletic.*program|fitness.*program|yoga.*program",
            r"outdoor.*activities|adventure.*program|trekking|camping"
        ],
        
        AttendanceStrategy.SESSION_BASED: [
            # Competitive Examinations & Tests
            r"entrance.*exam|competitive.*exam|selection.*test|screening.*exam",
            r"olympiad|quiz.*competition|knowledge.*competition|brain.*battle",
            r"spelling.*bee|elocution.*competition|debate.*competition|mun",
            r"case.*study.*competition|business.*simulation|stock.*market.*simulation",
            
            # Technical Competitions
            r"coding.*contest|programming.*competition|algorithmic.*contest",
            r"app.*development.*competition|web.*development.*contest|ui.*ux.*contest",
            r"data.*science.*competition|ml.*challenge|ai.*competition|deep.*learning.*contest",
            r"cybersecurity.*challenge|ethical.*hacking|penetration.*testing|ctf",
            
            # Design & Creative Competitions
            r"design.*competition|logo.*design|poster.*design|graphic.*design",
            r"photography.*competition|video.*competition|animation.*contest",
            r"creative.*writing|essay.*competition|poetry.*competition|literary.*contest",
            r"art.*competition|painting.*competition|sketching|sculpture",
            
            # Multi-round Events
            r"elimination.*round|qualifier|semi.*final|final.*round|championship.*round",
            r"group.*discussion|personal.*interview|technical.*interview|hr.*round",
            r"presentation.*round|demo.*round|pitch.*round|proposal.*round",
            
            # Gaming & Entertainment
            r"gaming.*tournament|esports|video.*game.*competition|online.*gaming",
            r"board.*game.*competition|puzzle.*competition|brain.*game|strategy.*game",
            r"treasure.*hunt|scavenger.*hunt|mystery.*solving|riddle.*competition"
        ],
        
        AttendanceStrategy.MILESTONE_BASED: [
            # Project-based Events
            r"project.*exhibition|project.*expo|innovation.*showcase|startup.*showcase",
            r"science.*fair|science.*exhibition|research.*showcase|thesis.*presentation",
            r"poster.*presentation|research.*poster|academic.*poster|scientific.*poster",
            r"prototype.*demo|mvp.*demo|product.*showcase|technology.*fair",
            
            # Cultural Festivals & Celebrations
            r"annual.*fest|college.*fest|university.*fest|inter.*college.*fest",
            r"cultural.*festival|art.*festival|music.*festival|dance.*festival",
            r"literary.*festival|book.*fair|author.*meet|poetry.*festival",
            r"food.*festival|craft.*fair|handicraft.*exhibition|trade.*fair",
            
            # Social & Community Events
            r"social.*awareness.*campaign|community.*outreach|public.*awareness",
            r"charity.*event|fund.*raising|donation.*drive|social.*cause",
            r"environmental.*awareness|sustainability.*program|eco.*friendly.*initiative",
            r"cleanliness.*drive|plantation.*drive|water.*conservation",
            
            # Multi-phase Academic Events
            r"academic.*conference|research.*conference|symposium|colloquium",
            r"workshop.*series|seminar.*series|lecture.*series|masterclass.*series",
            r"training.*module|certification.*module|course.*module|learning.*path",
            
            # Complex Competitions
            r"business.*plan.*competition|entrepreneurship.*challenge|startup.*competition",
            r"innovation.*challenge|idea.*competition|solution.*challenge|problem.*solving",
            r"social.*innovation|impact.*challenge|sustainability.*challenge"
        ],
        
        AttendanceStrategy.CONTINUOUS: [
            # Long-term Academic Programs
            r"semester.*course|academic.*year|annual.*program|degree.*program",
            r"diploma.*course|certificate.*course|professional.*course|distance.*learning",
            r"online.*course|e.*learning|mooc|self.*paced.*learning|blended.*learning",
            r"independent.*study|guided.*study|mentored.*learning|peer.*learning",
            
            # Research & Development
            r"research.*project|thesis.*work|dissertation.*work|phd.*program",
            r"research.*fellowship|post.*doc|visiting.*scholar|research.*collaboration",
            r"patent.*work|innovation.*project|product.*development|prototype.*development",
            r"startup.*incubation|entrepreneurship.*program|business.*development",
            
            # Professional Development
            r"internship|industrial.*training|on.*job.*training|apprenticeship",
            r"mentorship.*program|coaching.*program|guidance.*program|career.*development",
            r"skill.*assessment.*program|competency.*development|professional.*certification",
            r"leadership.*program|management.*training|executive.*development",
            
            # Long-term Projects
            r"community.*project|social.*project|environmental.*project|sustainability.*project",
            r"volunteer.*program|social.*service|community.*service|outreach.*program",
            r"monitoring.*program|evaluation.*program|assessment.*program|tracking.*program",
            
            # Extended Learning Programs
            r"language.*learning|foreign.*language|communication.*development|writing.*skills",
            r"technical.*skills|programming.*skills|software.*development|system.*development",
            r"data.*analysis.*program|research.*methodology|statistical.*analysis"
        ]
    }
    
    # Event type priority modifiers for better strategy selection
    EVENT_TYPE_PRIORITIES = {
        # High priority events that need specific strategies
        "thesis_defense": {"strategy": AttendanceStrategy.SINGLE_MARK, "priority": 10},
        "viva_voce": {"strategy": AttendanceStrategy.SINGLE_MARK, "priority": 10},
        "placement_drive": {"strategy": AttendanceStrategy.SESSION_BASED, "priority": 9},
        "hackathon": {"strategy": AttendanceStrategy.SESSION_BASED, "priority": 10},
        "medical_camp": {"strategy": AttendanceStrategy.SINGLE_MARK, "priority": 8},
        "blood_donation": {"strategy": AttendanceStrategy.SINGLE_MARK, "priority": 8},
        
        # Medium priority events
        "bootcamp": {"strategy": AttendanceStrategy.DAY_BASED, "priority": 7},
        "certification_program": {"strategy": AttendanceStrategy.DAY_BASED, "priority": 7},
        "project_expo": {"strategy": AttendanceStrategy.MILESTONE_BASED, "priority": 8},
        "cultural_fest": {"strategy": AttendanceStrategy.MILESTONE_BASED, "priority": 7},
        
        # Long-term events
        "internship": {"strategy": AttendanceStrategy.CONTINUOUS, "priority": 9},
        "research_project": {"strategy": AttendanceStrategy.CONTINUOUS, "priority": 8},
        "semester_course": {"strategy": AttendanceStrategy.CONTINUOUS, "priority": 6}
    }
    
    @classmethod
    def detect_specialized_event_type(cls, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Detect specialized event types and provide enhanced strategy recommendations
        
        Returns:
            Dictionary with detected event type and strategy recommendations
        """
        event_name = event_data.get("event_name", "").lower()
        event_type = event_data.get("event_type", "").lower()
        description = event_data.get("detailed_description", "").lower()
        
        combined_text = f"{event_name} {event_type} {description}"
        
        # Check for high-priority specialized patterns
        detected_specializations = []
        strategy_scores = {strategy: 0 for strategy in AttendanceStrategy}
        
        # Score additional patterns
        for strategy, patterns in cls.ADDITIONAL_EVENT_PATTERNS.items():
            score = 0
            matched_patterns = []
            
            for pattern in patterns:
                import re
                matches = re.findall(pattern, combined_text)
                if matches:
                    score += len(matches)
                    matched_patterns.append(pattern)
            
            if score > 0:
                strategy_scores[strategy] += score
                detected_specializations.append({
                    "strategy": strategy,
                    "score": score,
                    "matched_patterns": matched_patterns
                })
        
        # Check for high-priority event types
        priority_bonus = {}
        for event_key, priority_info in cls.EVENT_TYPE_PRIORITIES.items():
            if event_key.replace("_", " ") in combined_text or event_key.replace("_", ".*") in combined_text:
                strategy = priority_info["strategy"]
                priority = priority_info["priority"]
                priority_bonus[strategy] = priority_bonus.get(strategy, 0) + priority
        
        # Apply priority bonuses
        for strategy, bonus in priority_bonus.items():
            strategy_scores[strategy] += bonus
        
        # Find the best strategy
        max_score = max(strategy_scores.values()) if strategy_scores else 0
        recommended_strategy = None
        confidence = 0.0
        
        if max_score > 0:
            for strategy, score in strategy_scores.items():
                if score == max_score:
                    recommended_strategy = strategy
                    # Calculate confidence based on score and pattern matches
                    confidence = min(0.95, 0.6 + (score * 0.05))
                    break
        
        return {
            "has_specialization": max_score > 0,
            "recommended_strategy": recommended_strategy.value if recommended_strategy else None,
            "confidence": confidence,
            "strategy_scores": {s.value: score for s, score in strategy_scores.items()},
            "detected_specializations": detected_specializations,
            "priority_matches": list(priority_bonus.keys()) if priority_bonus else [],
            "enhancement_reasoning": cls._generate_specialization_reasoning(
                detected_specializations, recommended_strategy, combined_text
            )
        }
    
    @classmethod
    def _generate_specialization_reasoning(cls, specializations: List[Dict], 
                                         recommended_strategy: AttendanceStrategy,
                                         event_text: str) -> str:
        """Generate reasoning for specialized event detection"""
        if not specializations:
            return "No specialized event patterns detected"
        
        reasoning = "Specialized event patterns detected: "
        
        # Group by strategy
        strategy_groups = {}
        for spec in specializations:
            strategy = spec["strategy"]
            if strategy not in strategy_groups:
                strategy_groups[strategy] = []
            strategy_groups[strategy].append(spec)
        
        # Generate reasoning for each strategy
        strategy_reasons = []
        for strategy, specs in strategy_groups.items():
            total_score = sum(spec["score"] for spec in specs)
            pattern_count = sum(len(spec["matched_patterns"]) for spec in specs)
            strategy_name = strategy.value.replace("_", " ").title()
            strategy_reasons.append(f"{strategy_name} ({total_score} matches, {pattern_count} patterns)")
        
        reasoning += "; ".join(strategy_reasons)
        
        if recommended_strategy:
            reasoning += f". Recommended: {recommended_strategy.value.replace('_', ' ').title()} strategy."
        
        return reasoning
    
    @classmethod
    def get_strategy_enhancement_bonus(cls, event_data: Dict[str, Any], 
                                     base_strategy: AttendanceStrategy) -> float:
        """
        Get bonus score for base strategy based on specialized pattern detection
        Used to enhance the main strategy detection algorithm
        """
        specialization_result = cls.detect_specialized_event_type(event_data)
        
        if not specialization_result["has_specialization"]:
            return 0.0
        
        # If specialized detection recommends the same strategy, give bonus
        if specialization_result["recommended_strategy"] == base_strategy.value:
            return specialization_result["confidence"] * 3.0  # Up to 3 point bonus
        
        # If specialized detection suggests different strategy, small penalty
        elif specialization_result["recommended_strategy"]:
            return -0.5
        
        return 0.0
    
    @classmethod
    def get_missing_pattern_recommendations(cls, event_data: Dict[str, Any]) -> List[str]:
        """Get recommendations for events with missing or unclear patterns"""
        recommendations = []
        
        specialization_result = cls.detect_specialized_event_type(event_data)
        
        if specialization_result["has_specialization"]:
            strategy = specialization_result["recommended_strategy"]
            confidence = specialization_result["confidence"]
            
            if confidence >= 0.8:
                recommendations.append(f"High confidence specialized pattern detected: {strategy}")
            elif confidence >= 0.6:
                recommendations.append(f"Moderate confidence specialized pattern: {strategy}")
            else:
                recommendations.append(f"Weak specialized pattern detected: {strategy}")
            
            # Add specific recommendations based on detected patterns
            if "thesis" in event_data.get("event_name", "").lower():
                recommendations.append("Consider single attendance for thesis defense events")
            
            if "placement" in event_data.get("event_name", "").lower():
                recommendations.append("Use session-based tracking for placement rounds")
            
            if "medical" in event_data.get("event_name", "").lower():
                recommendations.append("Single attendance sufficient for medical camps")
        
        else:
            recommendations.append("No specialized patterns detected - using default strategy detection")
            recommendations.append("Consider manual strategy selection if default seems inappropriate")
        
        return recommendations
