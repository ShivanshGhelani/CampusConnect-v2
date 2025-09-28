#!/usr/bin/env python3
"""
Attendance Strategy Preview and Validation API
Provides endpoints for previewing and validating attendance strategies during event creation
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from models.dynamic_attendance import AttendanceStrategy, AttendanceIntelligenceService, DynamicAttendanceConfig, AttendanceCriteria
from dependencies.auth import require_admin
from models.admin_user import AdminUser
from core.logger import get_logger

# Create router
router = APIRouter()
logger = get_logger(__name__)

# Pydantic models for request/response
class EventPreviewRequest(BaseModel):
    event_name: str = Field(..., description="Name of the event")
    event_type: str = Field(..., description="Type of event")
    start_datetime: datetime = Field(..., description="Event start datetime")
    end_datetime: datetime = Field(..., description="Event end datetime")
    detailed_description: Optional[str] = Field("", description="Detailed description")
    target_audience: Optional[str] = Field("students", description="Target audience")
    registration_mode: Optional[str] = Field("individual", description="Registration mode")

class CustomStrategyRequest(BaseModel):
    event_name: str = Field(..., description="Name of the event")
    event_type: str = Field(..., description="Type of event")
    start_datetime: datetime = Field(..., description="Event start datetime")
    end_datetime: datetime = Field(..., description="Event end datetime")
    custom_strategy: Dict[str, Any] = Field(..., description="Custom strategy configuration")
    detailed_description: Optional[str] = Field("", description="Detailed description")
    target_audience: Optional[str] = Field("students", description="Target audience")
    registration_mode: Optional[str] = Field("individual", description="Registration mode")

# Initialize the attendance intelligence service
attendance_ai = AttendanceIntelligenceService()

@router.post("/preview-strategy")
async def preview_attendance_strategy(
    request: EventPreviewRequest,
    admin: AdminUser = Depends(require_admin)
):
    """
    Preview attendance strategy for event data
    Returns the detected strategy, sessions, and configuration details
    """
    try:
        logger.debug(f"Previewing attendance strategy for event: {request.event_name}")
        
        # Convert request to format expected by AI service
        event_data = {
            "event_name": request.event_name,
            "event_type": request.event_type,
            "start_datetime": request.start_datetime,
            "end_datetime": request.end_datetime,
            "detailed_description": request.detailed_description or "",
            "target_audience": request.target_audience or "students",
            "registration_mode": request.registration_mode or "individual"
        }
        
        # Get AI-generated strategy
        strategy_analysis = await attendance_ai.analyze_event_requirements(event_data)
        
        if not strategy_analysis.get("success", False):
            logger.error(f"AI analysis failed: {strategy_analysis}")
            raise HTTPException(
                status_code=400,
                detail=f"Failed to analyze event: {strategy_analysis.get('error', 'Unknown error')}"
            )
        
        strategy_data = strategy_analysis["strategy"]
        
        # Format the response
        response = {
            "success": True,
            "event_details": {
                "name": request.event_name,
                "type": request.event_type,
                "duration_hours": (request.end_datetime - request.start_datetime).total_seconds() / 3600,
                "start": request.start_datetime.isoformat(),
                "end": request.end_datetime.isoformat()
            },
            "detected_strategy": {
                "type": strategy_data.get("type", "unknown"),
                "name": strategy_data.get("name", "Unknown Strategy"),
                "description": strategy_data.get("description", ""),
                "reasoning": strategy_data.get("reasoning", ""),
                "confidence": strategy_data.get("confidence", 0.0)
            },
            "sessions": strategy_data.get("sessions", []),
            "attendance_config": strategy_data.get("config", {}),
            "criteria": strategy_data.get("criteria", {}),
            "estimated_completion_rate": strategy_data.get("estimated_completion_rate", 0.8),
            "recommendations": strategy_data.get("recommendations", [])
        }
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in preview_attendance_strategy: {str(e)}")
        logger.error(f"Exception type: {type(e).__name__}")
        logger.error(f"Event data: {event_data}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.post("/validate-custom-strategy")
async def validate_custom_strategy(
    request: CustomStrategyRequest,
    admin: AdminUser = Depends(require_admin)
):
    """
    Validate a custom attendance strategy configuration
    Allows users to override the detected strategy
    """
    try:
        logger.debug(f"Validating custom strategy for event: {request.event_name}")
        
        # Extract custom strategy details
        custom_strategy = request.custom_strategy
        
        # Validate the custom strategy structure
        required_fields = ["type", "sessions", "criteria"]
        missing_fields = [field for field in required_fields if field not in custom_strategy]
        
        if missing_fields:
            logger.warning(f"Missing required fields in custom strategy: {missing_fields}")
            raise HTTPException(
                status_code=400,
                detail=f"Missing required fields in custom strategy: {missing_fields}"
            )
        
        # Validate strategy type
        valid_strategies = ["single_mark", "day_based", "session_based", "milestone_based", "continuous"]
        if custom_strategy["type"] not in valid_strategies:
            logger.warning(f"Invalid strategy type: {custom_strategy['type']}")
            raise HTTPException(
                status_code=400,
                detail=f"Invalid strategy type. Must be one of: {valid_strategies}"
            )
        
        # Validate sessions structure
        sessions = custom_strategy.get("sessions", [])
        if not isinstance(sessions, list) or len(sessions) == 0:
            logger.warning("Sessions must be a non-empty list")
            raise HTTPException(
                status_code=400,
                detail="Sessions must be a non-empty list"
            )
        
        # Validate each session
        for i, session in enumerate(sessions):
            if not isinstance(session, dict):
                logger.warning(f"Session {i+1} must be a dictionary")
                raise HTTPException(
                    status_code=400,
                    detail=f"Session {i+1} must be a dictionary"
                )
            
            required_session_fields = ["name", "start_time"]
            missing_session_fields = [field for field in required_session_fields if field not in session]
            
            if missing_session_fields:
                logger.warning(f"Session {i+1} missing required fields: {missing_session_fields}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Session {i+1} missing required fields: {missing_session_fields}"
                )
        
        # Validate criteria
        criteria = custom_strategy.get("criteria", {})
        if not isinstance(criteria, dict):
            logger.warning("Criteria must be a dictionary")
            raise HTTPException(
                status_code=400,
                detail="Criteria must be a dictionary"
            )
        
        # Create AttendanceCriteria object to validate structure - but handle enum conversion
        try:
            # Convert string strategy to enum for validation
            criteria_for_validation = dict(criteria)
            if "strategy" in criteria_for_validation and isinstance(criteria_for_validation["strategy"], str):
                from models.dynamic_attendance import AttendanceStrategy
                criteria_for_validation["strategy"] = AttendanceStrategy(criteria_for_validation["strategy"])
            
            attendance_criteria = AttendanceCriteria(**criteria_for_validation)
        except Exception as e:
            logger.warning(f"Invalid criteria configuration: {str(e)}")
            raise HTTPException(
                status_code=400,
                detail=f"Invalid criteria configuration: {str(e)}"
            )
        
        # If all validations pass, create a preview of the custom strategy
        event_duration = (request.end_datetime - request.start_datetime).total_seconds() / 3600
        
        # Generate strategy-specific sessions using the AI service
        event_data_for_sessions = {
            "event_name": request.event_name,
            "event_type": request.event_type,
            "start_datetime": request.start_datetime,
            "end_datetime": request.end_datetime,
            "detailed_description": request.detailed_description or "",
            "target_audience": request.target_audience or "students",
            "registration_mode": request.registration_mode or "individual"
        }
        
        # Import the strategy enum
        from models.dynamic_attendance import AttendanceStrategy
        
        # Convert string to enum for session generation
        strategy_enum = AttendanceStrategy(custom_strategy["type"])
        
        # Generate sessions based on the selected strategy
        generated_sessions = attendance_ai.generate_attendance_sessions(event_data_for_sessions, strategy_enum)
        
        # Convert sessions to the format expected by frontend
        session_data = [
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
            for session in generated_sessions
        ]
        
        # Calculate estimated completion rate based on strategy complexity
        if custom_strategy["type"] == "single_mark":
            estimated_completion = 0.9
        elif custom_strategy["type"] == "day_based":
            estimated_completion = max(0.6, 0.9 - (len(session_data) * 0.05))
        elif custom_strategy["type"] == "session_based":
            estimated_completion = 0.8
        elif custom_strategy["type"] == "milestone_based":
            estimated_completion = 0.7
        else:  # continuous
            estimated_completion = 0.7
        
        response = {
            "success": True,
            "validation_status": "valid",
            "event_details": {
                "name": request.event_name,
                "type": request.event_type,
                "duration_hours": event_duration,
                "start": request.start_datetime.isoformat(),
                "end": request.end_datetime.isoformat()
            },
            "custom_strategy": {
                "type": custom_strategy["type"],
                "name": custom_strategy.get("name", f"Custom {custom_strategy['type'].replace('_', ' ').title()}"),
                "description": custom_strategy.get("description", "User-defined custom strategy"),
                "sessions": session_data,  # Use generated sessions
                "criteria": criteria,
                "config": custom_strategy.get("config", {})
            },
            "estimated_completion_rate": estimated_completion,
            "validation_details": {
                "total_sessions": len(session_data),  # Use generated sessions count
                "total_duration_minutes": sum(session.get("duration_minutes", 0) for session in session_data),
                "strategy_complexity": "low" if len(session_data) <= 2 else "medium" if len(session_data) <= 4 else "high"
            },
            "recommendations": [
                f"Strategy has {len(session_data)} session(s)",
                f"Estimated completion rate: {estimated_completion:.1%}",
                "Custom strategy validated successfully"
            ]
        }
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in validate_custom_strategy: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )