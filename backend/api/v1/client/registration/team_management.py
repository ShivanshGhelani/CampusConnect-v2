#!/usr/bin/env python3
"""
Fixed Team Management API Endpoints
Properly handles team member addition/removal with full data consistency
"""

from fastapi import APIRouter, Request, Depends, HTTPException
from dependencies.auth import require_student_login
from models.student import Student
from database.operations import DatabaseOperations
from core.logger import logger
from datetime import datetime
import uuid

router = APIRouter()

@router.post("/add-team-member-fixed")
async def add_team_member_fixed(
    request: Request,
    student: Student = Depends(require_student_login)
):
    """
    Add a new member to an existing team registration with full data consistency
    Creates proper registration record and participation data
    """
    try:
        request_data = await request.json()
        event_id = request_data.get('event_id')
        team_id = request_data.get('team_id')
        enrollment_no = request_data.get('enrollment_no')
        
        if not all([event_id, enrollment_no]):
            return {"success": False, "message": "Event ID and enrollment number are required"}
        
        # Get event data
        event = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event:
            return {"success": False, "message": "Event not found"}
        
        # Find the team leader's registration
        registrations = event.get('registrations', {})
        team_registration = None
        team_reg_id = None
        team_registration_id = None
        
        for reg_id, reg_data in registrations.items():
            student_data = reg_data.get('student_data', {})
            if (student_data.get('enrollment_no') == student.enrollment_no and 
                reg_data.get('registration_type') == 'team'):
                team_registration = reg_data
                team_reg_id = reg_id
                team_registration_id = reg_data.get('team_registration_id')
                break
        
        if not team_registration:
            return {"success": False, "message": "Team registration not found or you're not the team leader"}
        
        # Check if student exists
        new_member = await DatabaseOperations.find_one("students", {"enrollment_no": enrollment_no})
        if not new_member:
            return {"success": False, "message": "Student not found"}
        
        # Check if student is already registered for this event
        for reg_data in registrations.values():
            if reg_data.get('student_data', {}).get('enrollment_no') == enrollment_no:
                return {"success": False, "message": "Student is already registered for this event"}
        
        # Check team size limit
        current_team_members = team_registration.get('student_data', {}).get('team_members', [])
        team_size_max = event.get('team_size_max', 5)
        current_size = 1 + len(current_team_members)  # Leader + members
        
        if current_size >= team_size_max:
            return {"success": False, "message": f"Team is already at maximum size ({team_size_max})"}
        
        # Generate new registration ID for the team member
        new_reg_id = f"REG{uuid.uuid4().hex[:6].upper()}"
        
        # Create new member data for team leader's array
        new_member_data = {
            "enrollment_no": enrollment_no,
            "name": new_member.get('full_name'),
            "email": new_member.get('email'),
            "mobile_no": new_member.get('mobile_no')
        }
        
        # Create full registration record for the new team member
        new_member_registration = {
            'registration_id': new_reg_id,
            'registration_type': 'team_member',
            'registration_datetime': datetime.utcnow().isoformat() + '+00:00',
            'team_registration_id': team_registration_id,
            'team_leader_enrollment': student.enrollment_no,
            'student_data': {
                'full_name': new_member.get('full_name'),
                'enrollment_no': new_member.get('enrollment_no'),
                'email': new_member.get('email'),
                'mobile_no': new_member.get('mobile_no'),
                'department': new_member.get('department'),
                'semester': new_member.get('semester'),
                'team_name': team_registration['student_data'].get('team_name'),
                'is_team_leader': False
            }
        }
        
        # Create participation record for the new member
        participation_record = {
            'event_id': event_id,
            'enrollment_no': new_member.get('enrollment_no'),
            'full_name': new_member.get('full_name'),
            'registration_id': new_reg_id,
            'registration_type': 'team_member',
            'team_registration_id': team_registration_id,
            'team_name': team_registration['student_data'].get('team_name'),
            'registration_datetime': new_member_registration['registration_datetime'],
            'attendance': {
                'marked': False,
                'attendance_id': None,
                'attendance_date': None
            },
            'feedback': {
                'submitted': False,
                'feedback_id': None
            },
            'certificate': {
                'earned': False,
                'certificate_id': None
            }
        }
        
        # Update team leader's members array
        current_team_members.append(new_member_data)
        
        # Perform all database updates
        # 1. Add new member registration to event
        await DatabaseOperations.update_one(
            "events", 
            {"event_id": event_id}, 
            {
                "$set": {
                    f"registrations.{team_reg_id}.student_data.team_members": current_team_members,
                    f"registrations.{new_reg_id}": new_member_registration
                }
            }
        )
        
        # 2. Add/update participation record
        existing_participation = await DatabaseOperations.find_one(
            "student_participation", 
            {"event_id": event_id, "enrollment_no": enrollment_no}
        )
        
        if existing_participation:
            await DatabaseOperations.update_one(
                "student_participation",
                {"event_id": event_id, "enrollment_no": enrollment_no},
                {"$set": participation_record}
            )
        else:
            await DatabaseOperations.insert_one("student_participation", participation_record)
        
        logger.info(f"Added team member {enrollment_no} to team {team_registration_id} for event {event_id} with registration {new_reg_id}")
        
        return {
            "success": True,
            "message": "Team member added successfully",
            "member_data": new_member_data,
            "registration_id": new_reg_id
        }
        
    except Exception as e:
        logger.error(f"Error adding team member: {str(e)}")
        return {"success": False, "message": f"Error adding team member: {str(e)}"}


@router.post("/remove-team-member-fixed")
async def remove_team_member_fixed(
    request: Request,
    student: Student = Depends(require_student_login)
):
    """
    Remove a member from an existing team registration with full data consistency
    Removes registration record and participation data
    """
    try:
        request_data = await request.json()
        event_id = request_data.get('event_id')
        team_id = request_data.get('team_id')
        enrollment_no = request_data.get('enrollment_no')
        
        if not all([event_id, enrollment_no]):
            return {"success": False, "message": "Event ID and enrollment number are required"}
        
        # Get event data
        event = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event:
            return {"success": False, "message": "Event not found"}
        
        # Find the team leader's registration
        registrations = event.get('registrations', {})
        team_registration = None
        team_reg_id = None
        
        for reg_id, reg_data in registrations.items():
            student_data = reg_data.get('student_data', {})
            if (student_data.get('enrollment_no') == student.enrollment_no and 
                reg_data.get('registration_type') == 'team'):
                team_registration = reg_data
                team_reg_id = reg_id
                break
        
        if not team_registration:
            return {"success": False, "message": "Team registration not found or you're not the team leader"}
        
        # Find the member's registration ID
        member_reg_id = None
        for reg_id, reg_data in registrations.items():
            if (reg_data.get('student_data', {}).get('enrollment_no') == enrollment_no and 
                reg_data.get('registration_type') == 'team_member'):
                member_reg_id = reg_id
                break
        
        # Find and remove the team member from leader's array
        current_team_members = team_registration.get('student_data', {}).get('team_members', [])
        member_found = False
        updated_members = []
        
        for member in current_team_members:
            if member.get('enrollment_no') != enrollment_no:
                updated_members.append(member)
            else:
                member_found = True
        
        if not member_found:
            return {"success": False, "message": "Team member not found"}
        
        # Prepare database updates
        unset_operations = {}
        if member_reg_id:
            unset_operations[f"registrations.{member_reg_id}"] = ""
        
        # Update the team registration and remove member registration
        await DatabaseOperations.update_one(
            "events", 
            {"event_id": event_id}, 
            {
                "$set": {
                    f"registrations.{team_reg_id}.student_data.team_members": updated_members
                },
                "$unset": unset_operations
            }
        )
        
        # Remove participation record
        await DatabaseOperations.delete_one(
            "student_participation",
            {"event_id": event_id, "enrollment_no": enrollment_no}
        )
        
        logger.info(f"Removed team member {enrollment_no} from team {team_id} for event {event_id}")
        
        return {
            "success": True,
            "message": "Team member removed successfully"
        }
        
    except Exception as e:
        logger.error(f"Error removing team member: {str(e)}")
        return {"success": False, "message": f"Error removing team member: {str(e)}"}


@router.get("/validate-team-data/{event_id}")
async def validate_team_data(
    event_id: str,
    student: Student = Depends(require_student_login)
):
    """
    Validate team data consistency and provide a summary report
    """
    try:
        # Get event data
        event = await DatabaseOperations.find_one("events", {"event_id": event_id})
        if not event:
            return {"success": False, "message": "Event not found"}
        
        registrations = event.get('registrations', {})
        
        # Find teams
        teams = {}
        for reg_id, reg_data in registrations.items():
            team_id = reg_data.get('team_registration_id')
            if team_id:
                if team_id not in teams:
                    teams[team_id] = {'leader': None, 'members': [], 'members_in_leader': []}
                
                if reg_data.get('registration_type') == 'team':
                    teams[team_id]['leader'] = reg_data
                    teams[team_id]['members_in_leader'] = reg_data.get('student_data', {}).get('team_members', [])
                elif reg_data.get('registration_type') == 'team_member':
                    teams[team_id]['members'].append(reg_data)
        
        # Check participation records
        participation_records = await DatabaseOperations.find_many(
            "student_participation", 
            {"event_id": event_id}
        )
        
        # Validate each team
        validation_results = []
        
        for team_id, team_data in teams.items():
            leader = team_data['leader']
            members = team_data['members']
            members_in_leader = team_data['members_in_leader']
            
            # Check registration consistency
            actual_enrollments = {m['student_data']['enrollment_no'] for m in members}
            listed_enrollments = {m.get('enrollment_no') for m in members_in_leader}
            
            # Check participation records
            team_participation = [p for p in participation_records if p.get('team_registration_id') == team_id]
            participation_enrollments = {p.get('enrollment_no') for p in team_participation}
            
            # Include leader in expected participations
            expected_participations = {leader['student_data']['enrollment_no']} | listed_enrollments
            
            result = {
                'team_id': team_id,
                'team_name': leader['student_data'].get('team_name') if leader else 'Unknown',
                'leader': leader['student_data']['full_name'] if leader else 'None',
                'registrations_consistent': actual_enrollments == listed_enrollments,
                'participation_consistent': participation_enrollments == expected_participations,
                'total_registrations': len(members) + (1 if leader else 0),
                'members_in_leader_array': len(members_in_leader),
                'participation_records': len(team_participation),
                'missing_registrations': listed_enrollments - actual_enrollments,
                'extra_registrations': actual_enrollments - listed_enrollments,
                'missing_participation': expected_participations - participation_enrollments,
                'extra_participation': participation_enrollments - expected_participations
            }
            
            validation_results.append(result)
        
        return {
            "success": True,
            "event_id": event_id,
            "teams_found": len(teams),
            "validation_results": validation_results
        }
        
    except Exception as e:
        logger.error(f"Error validating team data: {str(e)}")
        return {"success": False, "message": f"Error validating team data: {str(e)}"}
