"""
Attendance Session Customization API
===================================

API endpoints for customizing auto-generated attendance sessions.
Allows organizers to modify session structure, names, timings, and criteria.
"""

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from pydantic import BaseModel, Field

from services.event_attendance_service import event_attendance_service
from services.event_registration_service import event_registration_service
from models.dynamic_attendance import AttendanceIntelligenceService
from dependencies.auth import get_current_user
from core.logger import get_logger
from models.dynamic_attendance import AttendanceSession, AttendanceStrategy, AttendanceCriteria

# Setup logger
logger = get_logger(__name__)

# Router setup
router = APIRouter(prefix="/api/v1/attendance/customize", tags=["Attendance Customization"])

# Request/Response Models
class SessionCustomizationRequest(BaseModel):
    """Request model for customizing a session"""
    session_id: str = Field(..., description="Session ID to customize")
    session_name: Optional[str] = Field(None, description="Custom session name")
    start_time: Optional[datetime] = Field(None, description="Custom start time")
    end_time: Optional[datetime] = Field(None, description="Custom end time")
    is_mandatory: Optional[bool] = Field(None, description="Whether session is mandatory")
    weight: Optional[float] = Field(None, description="Session weight (0.1 - 2.0)")

class NewSessionRequest(BaseModel):
    """Request model for adding a new session"""
    session_name: str = Field(..., description="Session name")
    session_type: str = Field(default="session", description="Session type")
    start_time: datetime = Field(..., description="Session start time")
    end_time: datetime = Field(..., description="Session end time")
    is_mandatory: bool = Field(default=True, description="Whether session is mandatory")
    weight: float = Field(default=1.0, description="Session weight")
    insert_after: Optional[str] = Field(None, description="Insert after this session ID")

class BulkSessionUpdateRequest(BaseModel):
    """Request model for bulk session updates"""
    sessions: List[SessionCustomizationRequest] = Field(..., description="List of session updates")
    new_sessions: Optional[List[NewSessionRequest]] = Field(default=[], description="New sessions to add")
    remove_sessions: Optional[List[str]] = Field(default=[], description="Session IDs to remove")
    criteria_updates: Optional[Dict[str, Any]] = Field(None, description="Criteria updates")

class CriteriaUpdateRequest(BaseModel):
    """Request model for updating attendance criteria"""
    minimum_percentage: Optional[float] = Field(None, description="Minimum attendance percentage")
    required_sessions: Optional[int] = Field(None, description="Required number of sessions")
    required_milestones: Optional[List[str]] = Field(None, description="Required milestone session IDs")

# Initialize service
# Initialize services
attendance_intelligence = AttendanceIntelligenceService()

@router.get("/preview/{event_id}")
async def preview_attendance_sessions(
    event_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """
    Preview auto-generated attendance sessions for an event
    """
    try:
        # Check user permissions
        if current_user.get('user_type') != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can preview attendance sessions"
            )
        
        # Get or initialize attendance configuration
        result = await attendance_service.initialize_event_attendance(event_id)
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["message"]
            )
        
        config = result["config"]
        
        # Format response with customization suggestions
        response = {
            "event_id": event_id,
            "strategy": config["strategy"],
            "criteria": config["criteria"],
            "sessions": config["sessions"],
            "customization_options": {
                "can_add_sessions": True,
                "can_remove_sessions": len(config["sessions"]) > 1,
                "can_modify_names": True,
                "can_adjust_timings": True,
                "can_change_weights": True,
                "suggested_improvements": _get_customization_suggestions(config)
            },
            "preview_meta": {
                "total_duration": _calculate_total_duration(config["sessions"]),
                "session_count": len(config["sessions"]),
                "mandatory_sessions": len([s for s in config["sessions"] if s.get("is_mandatory", True)]),
                "total_weight": sum(s.get("weight", 1.0) for s in config["sessions"])
            }
        }
        
        logger.info(f"Previewed attendance sessions for event {event_id}")
        return JSONResponse(content=response)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error previewing attendance sessions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to preview sessions: {str(e)}"
        )

@router.put("/sessions/{event_id}")
async def customize_attendance_sessions(
    event_id: str,
    updates: BulkSessionUpdateRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Customize attendance sessions for an event
    """
    try:
        # Check user permissions
        if current_user.get('user_type') != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can customize attendance sessions"
            )
        
        # Get current configuration
        current_config = await attendance_service.get_attendance_config(event_id)
        if not current_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attendance configuration not found. Initialize first."
            )
        
        # Validate and apply updates
        validation_result = _validate_session_updates(current_config, updates)
        if not validation_result["valid"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=validation_result["error"]
            )
        
        # Apply session modifications
        updated_sessions = _apply_session_updates(current_config.sessions, updates)
        
        # Update criteria if provided
        updated_criteria = current_config.criteria
        if updates.criteria_updates:
            updated_criteria = _apply_criteria_updates(current_config.criteria, updates.criteria_updates)
        
        # Save updated configuration
        save_result = await attendance_service.update_attendance_config(
            event_id,
            sessions=updated_sessions,
            criteria=updated_criteria
        )
        
        if not save_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=save_result["message"]
            )
        
        # Return updated configuration
        response = {
            "success": True,
            "message": "Attendance sessions customized successfully",
            "event_id": event_id,
            "updated_sessions": [session.dict() for session in updated_sessions],
            "updated_criteria": updated_criteria.dict(),
            "changes_summary": _generate_changes_summary(current_config.sessions, updated_sessions, updates)
        }
        
        logger.info(f"Customized attendance sessions for event {event_id}")
        return JSONResponse(content=response)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error customizing attendance sessions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to customize sessions: {str(e)}"
        )

@router.post("/sessions/{event_id}/add")
async def add_attendance_session(
    event_id: str,
    new_session: NewSessionRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Add a new attendance session to an event
    """
    try:
        # Check user permissions
        if current_user.get('user_type') != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can add attendance sessions"
            )
        
        # Get current configuration
        current_config = await attendance_service.get_attendance_config(event_id)
        if not current_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attendance configuration not found"
            )
        
        # Validate new session
        validation_result = _validate_new_session(current_config.sessions, new_session)
        if not validation_result["valid"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=validation_result["error"]
            )
        
        # Create new session
        session_id = f"custom_session_{len(current_config.sessions) + 1}_{int(datetime.utcnow().timestamp())}"
        new_attendance_session = AttendanceSession(
            session_id=session_id,
            session_name=new_session.session_name,
            session_type=new_session.session_type,
            start_time=new_session.start_time,
            end_time=new_session.end_time,
            is_mandatory=new_session.is_mandatory,
            weight=new_session.weight,
            status="pending"
        )
        
        # Insert session at appropriate position
        updated_sessions = _insert_session(current_config.sessions, new_attendance_session, new_session.insert_after)
        
        # Save updated configuration
        save_result = await attendance_service.update_attendance_config(
            event_id,
            sessions=updated_sessions
        )
        
        if not save_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=save_result["message"]
            )
        
        response = {
            "success": True,
            "message": "New attendance session added successfully",
            "event_id": event_id,
            "new_session": new_attendance_session.dict(),
            "total_sessions": len(updated_sessions)
        }
        
        logger.info(f"Added new attendance session for event {event_id}: {new_session.session_name}")
        return JSONResponse(content=response)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding attendance session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add session: {str(e)}"
        )

@router.delete("/sessions/{event_id}/{session_id}")
async def remove_attendance_session(
    event_id: str,
    session_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """
    Remove an attendance session from an event
    """
    try:
        # Check user permissions
        if current_user.get('user_type') != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can remove attendance sessions"
            )
        
        # Get current configuration
        current_config = await attendance_service.get_attendance_config(event_id)
        if not current_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attendance configuration not found"
            )
        
        # Check if session exists
        session_to_remove = None
        for session in current_config.sessions:
            if session.session_id == session_id:
                session_to_remove = session
                break
        
        if not session_to_remove:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found"
            )
        
        # Check if it's safe to remove (must have at least 1 session)
        if len(current_config.sessions) <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the last remaining session"
            )
        
        # Remove session
        updated_sessions = [s for s in current_config.sessions if s.session_id != session_id]
        
        # Save updated configuration
        save_result = await attendance_service.update_attendance_config(
            event_id,
            sessions=updated_sessions
        )
        
        if not save_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=save_result["message"]
            )
        
        response = {
            "success": True,
            "message": f"Session '{session_to_remove.session_name}' removed successfully",
            "event_id": event_id,
            "removed_session_id": session_id,
            "remaining_sessions": len(updated_sessions)
        }
        
        logger.info(f"Removed attendance session {session_id} from event {event_id}")
        return JSONResponse(content=response)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing attendance session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove session: {str(e)}"
        )

@router.patch("/criteria/{event_id}")
async def update_attendance_criteria(
    event_id: str,
    criteria_updates: CriteriaUpdateRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Update attendance criteria for an event
    """
    try:
        # Check user permissions
        if current_user.get('user_type') != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can update attendance criteria"
            )
        
        # Get current configuration
        current_config = await attendance_service.get_attendance_config(event_id)
        if not current_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attendance configuration not found"
            )
        
        # Apply criteria updates
        updated_criteria = _apply_criteria_updates(current_config.criteria, criteria_updates.dict(exclude_none=True))
        
        # Validate updated criteria
        validation_result = _validate_criteria_updates(current_config, updated_criteria)
        if not validation_result["valid"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=validation_result["error"]
            )
        
        # Save updated configuration
        save_result = await attendance_service.update_attendance_config(
            event_id,
            criteria=updated_criteria
        )
        
        if not save_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=save_result["message"]
            )
        
        response = {
            "success": True,
            "message": "Attendance criteria updated successfully",
            "event_id": event_id,
            "updated_criteria": updated_criteria.dict(),
            "changes": _generate_criteria_changes_summary(current_config.criteria, updated_criteria)
        }
        
        logger.info(f"Updated attendance criteria for event {event_id}")
        return JSONResponse(content=response)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating attendance criteria: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update criteria: {str(e)}"
        )

# Helper Functions
def _get_customization_suggestions(config: Dict[str, Any]) -> List[str]:
    """Generate customization suggestions based on current configuration"""
    suggestions = []
    
    strategy = config.get("strategy")
    sessions = config.get("sessions", [])
    
    if strategy == "session_based":
        if len(sessions) == 4:
            suggestions.append("Consider adding more rounds if your competition has preliminary qualifiers")
            suggestions.append("You can rename rounds to match your competition structure (e.g., 'Qualification', 'Semi-final')")
        
        # Check for equal duration sessions
        if len(set(s.get("duration_minutes", 0) for s in sessions)) == 1:
            suggestions.append("All sessions have equal duration. Consider adjusting for different round complexities")
    
    elif strategy == "milestone_based":
        suggestions.append("Define specific milestones that participants must attend")
        suggestions.append("Consider which milestones are most critical for event completion")
    
    if len(sessions) > 5:
        suggestions.append("Consider consolidating some sessions to reduce attendance complexity")
    
    return suggestions

def _calculate_total_duration(sessions: List[Dict[str, Any]]) -> str:
    """Calculate total duration of all sessions"""
    total_minutes = 0
    for session in sessions:
        start = datetime.fromisoformat(session["start_time"].replace("Z", "+00:00"))
        end = datetime.fromisoformat(session["end_time"].replace("Z", "+00:00"))
        duration = (end - start).total_seconds() / 60
        total_minutes += duration
    
    hours = int(total_minutes // 60)
    minutes = int(total_minutes % 60)
    
    if hours > 0:
        return f"{hours}h {minutes}m"
    else:
        return f"{minutes}m"

def _validate_session_updates(current_config, updates: BulkSessionUpdateRequest) -> Dict[str, Any]:
    """Validate session updates"""
    # Basic validation logic
    errors = []
    
    # Check session overlaps
    # Check minimum session requirements
    # Validate time ranges
    # etc.
    
    return {"valid": len(errors) == 0, "error": "; ".join(errors) if errors else None}

def _apply_session_updates(current_sessions: List[AttendanceSession], updates: BulkSessionUpdateRequest) -> List[AttendanceSession]:
    """Apply session updates and return updated session list"""
    # Implementation for applying updates
    updated_sessions = current_sessions.copy()
    
    # Apply modifications
    for update in updates.sessions:
        for i, session in enumerate(updated_sessions):
            if session.session_id == update.session_id:
                # Update session properties
                if update.session_name:
                    updated_sessions[i].session_name = update.session_name
                if update.start_time:
                    updated_sessions[i].start_time = update.start_time
                if update.end_time:
                    updated_sessions[i].end_time = update.end_time
                if update.is_mandatory is not None:
                    updated_sessions[i].is_mandatory = update.is_mandatory
                if update.weight:
                    updated_sessions[i].weight = update.weight
                break
    
    # Remove sessions
    if updates.remove_sessions:
        updated_sessions = [s for s in updated_sessions if s.session_id not in updates.remove_sessions]
    
    # Add new sessions
    for new_session in updates.new_sessions:
        session_id = f"custom_session_{len(updated_sessions) + 1}_{int(datetime.utcnow().timestamp())}"
        new_attendance_session = AttendanceSession(
            session_id=session_id,
            session_name=new_session.session_name,
            session_type=new_session.session_type,
            start_time=new_session.start_time,
            end_time=new_session.end_time,
            is_mandatory=new_session.is_mandatory,
            weight=new_session.weight,
            status="pending"
        )
        updated_sessions.append(new_attendance_session)
    
    return updated_sessions

def _apply_criteria_updates(current_criteria: AttendanceCriteria, updates: Dict[str, Any]) -> AttendanceCriteria:
    """Apply criteria updates"""
    # Create updated criteria
    criteria_dict = current_criteria.dict()
    criteria_dict.update(updates)
    
    return AttendanceCriteria(**criteria_dict)

def _validate_new_session(current_sessions: List[AttendanceSession], new_session: NewSessionRequest) -> Dict[str, Any]:
    """Validate new session"""
    errors = []
    
    # Check time conflicts
    for session in current_sessions:
        if (new_session.start_time < session.end_time and new_session.end_time > session.start_time):
            errors.append(f"New session conflicts with existing session: {session.session_name}")
    
    # Check valid time range
    if new_session.end_time <= new_session.start_time:
        errors.append("Session end time must be after start time")
    
    # Check weight range
    if new_session.weight < 0.1 or new_session.weight > 2.0:
        errors.append("Session weight must be between 0.1 and 2.0")
    
    return {"valid": len(errors) == 0, "error": "; ".join(errors) if errors else None}

def _insert_session(current_sessions: List[AttendanceSession], new_session: AttendanceSession, insert_after: Optional[str]) -> List[AttendanceSession]:
    """Insert new session at appropriate position"""
    if not insert_after:
        return current_sessions + [new_session]
    
    for i, session in enumerate(current_sessions):
        if session.session_id == insert_after:
            return current_sessions[:i+1] + [new_session] + current_sessions[i+1:]
    
    # If insert_after not found, append to end
    return current_sessions + [new_session]

def _validate_criteria_updates(current_config, updated_criteria: AttendanceCriteria) -> Dict[str, Any]:
    """Validate criteria updates"""
    errors = []
    
    # Strategy-specific validation
    if current_config.strategy == AttendanceStrategy.SESSION_BASED:
        if updated_criteria.required_sessions and updated_criteria.required_sessions > len(current_config.sessions):
            errors.append("Required sessions cannot exceed total available sessions")
    
    return {"valid": len(errors) == 0, "error": "; ".join(errors) if errors else None}

def _generate_changes_summary(old_sessions: List[AttendanceSession], new_sessions: List[AttendanceSession], updates: BulkSessionUpdateRequest) -> Dict[str, Any]:
    """Generate summary of changes made"""
    return {
        "sessions_modified": len(updates.sessions),
        "sessions_added": len(updates.new_sessions),
        "sessions_removed": len(updates.remove_sessions),
        "total_sessions_before": len(old_sessions),
        "total_sessions_after": len(new_sessions)
    }

def _generate_criteria_changes_summary(old_criteria: AttendanceCriteria, new_criteria: AttendanceCriteria) -> Dict[str, Any]:
    """Generate summary of criteria changes"""
    changes = {}
    
    if old_criteria.minimum_percentage != new_criteria.minimum_percentage:
        changes["minimum_percentage"] = {
            "old": old_criteria.minimum_percentage,
            "new": new_criteria.minimum_percentage
        }
    
    if old_criteria.required_sessions != new_criteria.required_sessions:
        changes["required_sessions"] = {
            "old": old_criteria.required_sessions,
            "new": new_criteria.required_sessions
        }
    
    return changes
