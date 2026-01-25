"""
Admin Registration Management API Routes
====================================
Admin-specific routes for managing student registrations in events.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Dict, Any, Optional
from datetime import datetime

from dependencies.auth import require_admin
from models.admin_user import AdminUser
from services.event_registration_service import event_registration_service
from services.event_attendance_service import event_attendance_service
from core.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()

@router.get("/participants")
async def get_participants(
    event_id: Optional[str] = Query(None, description="Get participants for specific event"),
    enrollment_no: Optional[str] = Query(None, description="Get participation history for specific student"),
    employee_id: Optional[str] = Query(None, description="Get participation history for specific faculty"),
    include_statistics: bool = Query(False, description="Include statistics in response"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    registration_type: Optional[str] = Query(None, description="Filter by individual/team"),
    search: Optional[str] = Query(None, description="Search by name, enrollment, email"),
    current_user: AdminUser = Depends(require_admin)
):
    """
    Unified participants endpoint - handles event participants, student history, faculty history, and statistics
    """
    try:
        from database.operations import DatabaseOperations
        
        # Build base query based on parameters
        if event_id:
            # Get event participants from both collections
            student_query = {"event.event_id": event_id}
            faculty_query = {"event.event_id": event_id}
            mode = "event_participants"
        elif enrollment_no:
            # Get student participation history
            student_query = {"student.enrollment_no": enrollment_no}
            faculty_query = {}
            mode = "student_history"
        elif employee_id:
            # Get faculty participation history
            student_query = {}
            faculty_query = {"faculty.employee_id": employee_id}
            mode = "faculty_history"
        else:
            raise HTTPException(status_code=400, detail="Either event_id, enrollment_no, or employee_id is required")
        
        # Add registration type filter
        if registration_type:
            if student_query:
                student_query["registration.type"] = registration_type
            if faculty_query:
                faculty_query["registration.type"] = registration_type
        
        # Get data from both collections
        student_registrations = []
        faculty_registrations = []
        
        if student_query:
            student_registrations = await DatabaseOperations.find_many(
                "student_registrations", 
                student_query,
                limit=limit * 2  # Get more to handle filtering
            )
        
        if faculty_query:
            faculty_registrations = await DatabaseOperations.find_many(
                "faculty_registrations",
                faculty_query, 
                limit=limit * 2
            )
        
        # Process and format participants
        all_participants = []
        
        # Process student registrations (both individual and team)
        for reg in student_registrations:
            if reg.get("registration_type") == "team":
                # Handle team registration - create single team entry
                team_info = reg.get("team", {})
                team_members = reg.get("team_members", [])
                
                # Find team leader from team_members
                team_leader_name = "Unknown"
                team_leader_enrollment = ""
                for member in team_members:
                    if member.get("is_team_leader", False):
                        student_info = member.get("student", {})
                        team_leader_name = student_info.get("name", "Unknown")
                        team_leader_enrollment = student_info.get("enrollment_no", "")
                        break
                
                # Also check team.team_leader field (enrollment number format)
                if team_leader_name == "Unknown" and team_info.get("team_leader"):
                    team_leader_enrollment = team_info.get("team_leader", "")
                    # Find the name from team_members using the enrollment
                    for member in team_members:
                        student_info = member.get("student", {})
                        if student_info.get("enrollment_no") == team_leader_enrollment:
                            team_leader_name = student_info.get("name", "Unknown")
                            break
                
                # Create single team entry
                all_participants.append({
                    "participation_id": str(reg.get("_id", "")),
                    "registration_id": reg.get("registration_id", ""),
                    "participant_type": "student",
                    "registration_type": "team",
                    
                    # Team details (displayed as main info)
                    "name": team_info.get("team_name", "Unknown Team"),
                    "full_name": team_info.get("team_name", "Unknown Team"),
                    "team_name": team_info.get("team_name", "Unknown Team"),
                    "team_leader": team_leader_name,
                    "team_leader_enrollment": team_leader_enrollment,
                    "team_size": len(team_members),
                    "member_count": len(team_members),
                    
                    # Team members details for expandable view
                    "team_members": [{
                        "registration_id": tm.get("registration_id", ""),
                        "name": tm.get("student", {}).get("name", "Unknown"),
                        "enrollment_no": tm.get("student", {}).get("enrollment_no", ""),
                        "email": tm.get("student", {}).get("email", ""),
                        "phone": tm.get("student", {}).get("phone", ""),
                        "department": tm.get("student", {}).get("department", ""),
                        "semester": tm.get("student", {}).get("semester", ""),
                        "is_team_leader": tm.get("is_team_leader", False)
                    } for tm in team_members],
                    
                    # Registration details
                    "registration_date": reg.get("registration", {}).get("registered_at") or reg.get("created_at"),
                    "status": reg.get("registration", {}).get("status", "active"),
                    
                    # Team attendance summary
                    "attended": any(tm.get("attendance", {}).get("marked", False) for tm in team_members),
                    "attendance_status": "partial" if any(tm.get("attendance", {}).get("marked", False) for tm in team_members) else "pending",
                    
                    # Event details
                    "event": reg.get("event", {})
                })
            else:
                # Handle individual student registration
                student_info = reg.get("student", {})
                additional_data = reg.get("registration", {}).get("additional_data", {})
                
                all_participants.append({
                    "participation_id": str(reg.get("_id", "")),
                    "registration_id": reg.get("registration_id", ""),
                    "participant_type": "student", 
                    "registration_type": "individual",
                    
                    # Student details - prefer additional_data for complete info
                    "name": additional_data.get("full_name") or student_info.get("name", "Unknown"),
                    "full_name": additional_data.get("full_name") or student_info.get("name", "Unknown"),
                    "enrollment_no": additional_data.get("enrollment_no") or student_info.get("enrollment_no", ""),
                    "email": additional_data.get("email") or student_info.get("email", ""),
                    "department": additional_data.get("department") or student_info.get("department", ""),
                    "semester": additional_data.get("semester") or student_info.get("semester", ""),
                    "phone": additional_data.get("mobile_no") or student_info.get("phone", ""),
                    "year": student_info.get("year", ""),
                    
                    # Registration details
                    "registration_date": reg.get("registration", {}).get("registered_at"),
                    "status": reg.get("registration", {}).get("status", "unknown"),
                    
                    # Attendance details
                    "attended": reg.get("attendance", {}).get("marked", False),
                    "attendance_status": reg.get("attendance", {}).get("status", "pending"),
                    "attendance_percentage": reg.get("attendance", {}).get("percentage", 0),
                    
                    # Event details
                    "event": reg.get("event", {})
                })
        
        # Process faculty registrations
        for reg in faculty_registrations:
            faculty_info = reg.get("faculty", {})
            # print(f"Processing faculty registration: {faculty_info}")
            all_participants.append({
                "participation_id": str(reg.get("_id", "")),
                "registration_id": reg.get("registration_id", ""),
                "participant_type": "faculty",
                "registration_type": "individual",
                
                # Faculty details  
                "name": faculty_info.get("name", "Unknown"),
                "full_name": faculty_info.get("name", "Unknown"),
                "employee_id": faculty_info.get("employee_id", ""),
                "email": faculty_info.get("email", ""),
                "department": faculty_info.get("department", ""),
                "designation": faculty_info.get("designation", ""),
                "phone": faculty_info.get("contact_no", ""),  # Fixed: contact_no not phone
                
                # Registration details
                "registration_date": reg.get("registration", {}).get("registered_at"),
                "status": reg.get("registration", {}).get("status", "unknown"),
                
                # Attendance details
                "attended": reg.get("attendance", {}).get("marked", False),
                "attendance_status": reg.get("attendance", {}).get("status", "pending"),
                "attendance_percentage": reg.get("attendance", {}).get("percentage", 0),
                
                # Event details
                "event": reg.get("event", {})
            })
        
        # Apply search filter
        if search:
            filtered_participants = []
            search_lower = search.lower()
            for participant in all_participants:
                if (search_lower in participant.get("name", "").lower() or
                    search_lower in participant.get("email", "").lower() or
                    search_lower in participant.get("enrollment_no", "").lower() or
                    search_lower in participant.get("employee_id", "").lower() or
                    search_lower in participant.get("department", "").lower()):
                    filtered_participants.append(participant)
            all_participants = filtered_participants
        
        # Pagination
        total_count = len(all_participants)
        skip = (page - 1) * limit
        paginated_participants = all_participants[skip:skip + limit]
        
        # Build response
        response = {
            "success": True,
            "mode": mode,
            "participants": paginated_participants,
            "registrations": paginated_participants,  # For compatibility
            "pagination": {
                "page": page,
                "limit": limit,
                "total_count": total_count,
                "total_pages": (total_count + limit - 1) // limit
            }
        }
        
        # Add statistics if requested
        if include_statistics and event_id:
            stats = {
                "total_participants": total_count,
                "student_participants": len([p for p in all_participants if p["participant_type"] == "student"]),
                "faculty_participants": len([p for p in all_participants if p["participant_type"] == "faculty"]),
                "team_participants": len([p for p in all_participants if p["registration_type"] == "team"]),
                "individual_participants": len([p for p in all_participants if p["registration_type"] == "individual"]),
                "attended_count": len([p for p in all_participants if p["attended"]]),
                "attendance_rate": (len([p for p in all_participants if p["attended"]]) / total_count * 100) if total_count > 0 else 0
            }
            response["statistics"] = stats
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting participants: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/attendance/mark")
async def mark_student_attendance(
    attendance_data: Dict[str, Any],
    current_user: AdminUser = Depends(require_admin)
):
    """Mark attendance for a student (Admin only)"""
    try:
        # Admin attendance marking - simplified for now
        enrollment_no = attendance_data.get("enrollment_no")
        event_id = attendance_data.get("event_id")
        
        if not enrollment_no or not event_id:
            raise HTTPException(status_code=400, detail="enrollment_no and event_id required")
            
        # For now, assume single mark strategy - this should be expanded based on event strategy
        result = await event_attendance_service.mark_single_attendance(
            enrollment_no=enrollment_no,
            event_id=event_id,
            marked_by=current_user.username,
            marking_method="admin_manual"
        )
        
        if result["success"]:
            return {
                "success": True,
                "message": "Attendance marked successfully",
                "participation_id": result.get("participation_id")
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking attendance: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/attendance/bulk-mark")
async def bulk_mark_attendance(
    bulk_data: Dict[str, Any],
    current_user: AdminUser = Depends(require_admin)
):
    """Mark attendance for multiple students (Admin only)"""
    try:
        event_id = bulk_data.get("event_id")
        attendance_list = bulk_data.get("attendance_data", [])
        
        results = []
        for attendance_item in attendance_list:
            # Simplified bulk attendance - assume single mark strategy
            enrollment_no = attendance_item.get("enrollment_no")
            if enrollment_no:
                result = await event_attendance_service.mark_single_attendance(
                    enrollment_no=enrollment_no,
                    event_id=event_id,
                    marked_by=current_user.username,
                    marking_method="admin_bulk"
                )
                results.append(result)
            else:
                results.append({"success": False, "message": "enrollment_no required"})
        
        successful_count = sum(1 for r in results if r["success"])
        
        return {
            "success": True,
            "message": f"Bulk attendance marking completed. {successful_count}/{len(attendance_list)} successful.",
            "results": results,
            "summary": {
                "total_processed": len(attendance_list),
                "successful": successful_count,
                "failed": len(attendance_list) - successful_count
            }
        }
        
    except Exception as e:
        logger.error(f"Error in bulk attendance marking: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Removed unused endpoints - now using unified /participants endpoint with query parameters
