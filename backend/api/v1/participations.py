"""
Unified Participation API Routes
===============================
API endpoints for managing student-event participations using the new unified structure.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Dict, Any, Optional
from datetime import datetime

from dependencies.auth import require_admin, get_current_student
from services.participation_service import participation_service
from models.participation import CreateParticipation, RegistrationType
from core.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/participations", tags=["participations"])

@router.post("/register")
async def register_for_event(
    registration_data: CreateParticipation,
    current_user = Depends(get_current_student)
):
    """Register a student for an event using the new unified participation system"""
    try:
        # Ensure the student can only register themselves
        if registration_data.enrollment_no != current_user.get("enrollment_no"):
            raise HTTPException(status_code=403, detail="You can only register yourself")
        
        result = await participation_service.create_participation(registration_data)
        
        if result["success"]:
            return {
                "success": True,
                "message": "Registration successful",
                "participation_id": result["participation_id"],
                "registration_id": result["registration_id"]
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in registration: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/student/{enrollment_no}")
async def get_student_participations(
    enrollment_no: str,
    include_details: bool = Query(False, description="Include event details"),
    current_user = Depends(get_current_student)
):
    """Get all participations for a student"""
    try:
        # Students can only view their own participations
        if current_user.get("enrollment_no") != enrollment_no:
            raise HTTPException(status_code=403, detail="Access denied")
        
        participations = await participation_service.get_student_participations(
            enrollment_no, include_details
        )
        
        return {
            "success": True,
            "participations": participations,
            "total_count": len(participations)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting student participations: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/event/{event_id}")
async def get_event_participations(
    event_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    registration_type: Optional[RegistrationType] = None,
    current_user = Depends(require_admin)
):
    """Get all participations for an event (Admin only)"""
    try:
        # Build query
        query = {"event.event_id": event_id}
        if registration_type:
            query["registration.type"] = registration_type.value
        
        # Calculate skip for pagination
        skip = (page - 1) * limit
        
        # Get participations with pagination
        participations = await participation_service.get_participations_with_pagination(
            query, skip, limit
        )
        
        # Get total count for pagination info
        total_count = await participation_service.count_participations(query)
        
        return {
            "success": True,
            "participations": participations,
            "pagination": {
                "page": page,
                "limit": limit,
                "total_count": total_count,
                "total_pages": (total_count + limit - 1) // limit
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting event participations: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/event/{event_id}/statistics")
async def get_event_participation_statistics(
    event_id: str,
    current_user = Depends(require_admin)
):
    """Get comprehensive statistics for event participations (Admin only)"""
    try:
        stats = await participation_service.get_event_statistics(event_id)
        
        return {
            "success": True,
            "event_id": event_id,
            "statistics": stats
        }
        
    except Exception as e:
        logger.error(f"Error getting event statistics: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/event/{event_id}/refresh-stats")
async def refresh_event_statistics(
    event_id: str,
    current_user = Depends(require_admin)
):
    """Refresh event's registration_stats based on current participations (Admin only)"""
    try:
        result = await participation_service.update_event_registration_stats(event_id)
        
        if result["success"]:
            return {
                "success": True,
                "message": "Event statistics refreshed successfully",
                "updated_stats": result["stats"]
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error refreshing event statistics: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/attendance/{participation_id}/mark")
async def mark_attendance(
    participation_id: str,
    session_index: int,
    attendance_id: str,
    current_user = Depends(require_admin)
):
    """Mark attendance for a specific session (Admin only)"""
    try:
        result = await participation_service.mark_attendance(
            participation_id, session_index, attendance_id
        )
        
        if result:
            return {
                "success": True,
                "message": "Attendance marked successfully",
                "participation_id": participation_id,
                "session_index": session_index
            }
        else:
            raise HTTPException(status_code=400, detail="Failed to mark attendance")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking attendance: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/participation/{participation_id}")
async def get_participation_details(
    participation_id: str,
    current_user = Depends(get_current_student)
):
    """Get detailed information about a specific participation"""
    try:
        participation = await participation_service.get_participation_by_id(participation_id)
        
        if not participation:
            raise HTTPException(status_code=404, detail="Participation not found")
        
        # Check if student can access this participation
        if (current_user.get("user_type") == "student" and 
            participation.get("student", {}).get("enrollment_no") != current_user.get("enrollment_no")):
            raise HTTPException(status_code=403, detail="Access denied")
        
        return {
            "success": True,
            "participation": participation
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting participation details: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/participation/{participation_id}/stage")
async def update_participation_stage(
    participation_id: str,
    new_stage: str,
    current_user = Depends(require_admin)
):
    """Update the lifecycle stage of a participation (Admin only)"""
    try:
        result = await participation_service.update_participation_stage(
            participation_id, new_stage
        )
        
        if result["success"]:
            return {
                "success": True,
                "message": f"Participation stage updated to {new_stage}",
                "participation_id": participation_id,
                "new_stage": new_stage
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating participation stage: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/teams/{event_id}")
async def get_event_teams(
    event_id: str,
    current_user = Depends(require_admin)
):
    """Get all teams for an event with their members (Admin only)"""
    try:
        # Get all team participations for the event
        team_participations = await participation_service.get_participations_by_query({
            "event.event_id": event_id,
            "registration.type": {"$in": ["team_leader", "team_member"]}
        })
        
        # Group by team
        teams = {}
        for participation in team_participations:
            team_name = participation.get("team", {}).get("team_name")
            if team_name:
                if team_name not in teams:
                    teams[team_name] = {
                        "team_name": team_name,
                        "team_id": participation.get("team", {}).get("team_id"),
                        "leader": None,
                        "members": [],
                        "total_size": 0
                    }
                
                member_info = {
                    "enrollment_no": participation.get("student", {}).get("enrollment_no"),
                    "full_name": participation.get("student", {}).get("full_name"),
                    "email": participation.get("student", {}).get("email"),
                    "participation_id": participation.get("participation_id"),
                    "registration_id": participation.get("registration", {}).get("registration_id")
                }
                
                if participation.get("team", {}).get("is_leader"):
                    teams[team_name]["leader"] = member_info
                else:
                    teams[team_name]["members"].append(member_info)
                
                teams[team_name]["total_size"] += 1
        
        return {
            "success": True,
            "event_id": event_id,
            "teams": list(teams.values()),
            "total_teams": len(teams)
        }
        
    except Exception as e:
        logger.error(f"Error getting event teams: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
