#!/usr/bin/env python3
"""
Team Registration Data Migration Script
Fixes missing team member registrations for STARTUP_PITCH_COMP_2025 event
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from config.settings import MONGODB_URL, DB_NAME
from datetime import datetime
import uuid

async def fix_team_registrations():
    """Fix missing team member registrations and create proper participation records"""
    
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DB_NAME]
    
    event_id = 'STARTUP_PITCH_COMP_2025'
    
    print("=== FIXING TEAM REGISTRATION DATA ===")
    print(f"Event: {event_id}")
    print()
    
    try:
        # Get the event
        event = await db['events'].find_one({'event_id': event_id})
        if not event:
            print("❌ Event not found!")
            return
        
        registrations = event.get('registrations', {})
        print(f"Current registrations: {len(registrations)}")
        
        # Find the team leader registration
        team_leader_reg = None
        team_registration_id = None
        
        for reg_id, reg_data in registrations.items():
            if reg_data.get('registration_type') == 'team':
                team_leader_reg = reg_data
                team_registration_id = reg_data.get('team_registration_id')
                break
        
        if not team_leader_reg:
            print("❌ No team leader registration found!")
            return
        
        print(f"Team Leader: {team_leader_reg['student_data']['full_name']}")
        print(f"Team ID: {team_registration_id}")
        
        # Get team members from leader's record
        team_members = team_leader_reg['student_data'].get('team_members', [])
        print(f"Team members listed: {len(team_members)}")
        
        # Check which members are missing registrations
        existing_enrollments = set()
        for reg_data in registrations.values():
            enrollment = reg_data['student_data'].get('enrollment_no')
            if enrollment:
                existing_enrollments.add(enrollment)
        
        print("Existing registrations for enrollments:", existing_enrollments)
        
        missing_members = []
        for member in team_members:
            enrollment = member.get('enrollment_no')
            if enrollment not in existing_enrollments:
                missing_members.append(member)
        
        print(f"Missing registrations for {len(missing_members)} members:")
        for member in missing_members:
            print(f"  - {member.get('name')} ({member.get('enrollment_no')})")
        
        if not missing_members:
            print("✅ All team members have registrations!")
            await client.close()
            return
        
        # Check if missing members exist in students collection
        new_registrations = {}
        
        for member in missing_members:
            enrollment_no = member.get('enrollment_no')
            
            # Find student in database
            student = await db['students'].find_one({'enrollment_no': enrollment_no})
            
            if not student:
                print(f"❌ Student {enrollment_no} not found in students collection!")
                continue
            
            # Generate new registration ID
            new_reg_id = f"REG{uuid.uuid4().hex[:6].upper()}"
            
            # Create registration record matching the existing format
            new_registration = {
                'registration_id': new_reg_id,
                'registration_type': 'team_member',
                'registration_datetime': datetime.utcnow().isoformat() + '+00:00',
                'team_registration_id': team_registration_id,
                'team_leader_enrollment': team_leader_reg['student_data']['enrollment_no'],
                'student_data': {
                    'full_name': student.get('full_name'),
                    'enrollment_no': student.get('enrollment_no'),
                    'email': student.get('email'),
                    'mobile_no': student.get('mobile_no'),
                    'department': student.get('department'),
                    'semester': student.get('semester'),
                    'team_name': team_leader_reg['student_data'].get('team_name'),
                    'is_team_leader': False
                }
            }
            
            new_registrations[new_reg_id] = new_registration
            print(f"✅ Created registration for {student.get('full_name')} - ID: {new_reg_id}")
        
        if new_registrations:
            # Update the event with new registrations
            update_result = await db['events'].update_one(
                {'event_id': event_id},
                {
                    '$set': {
                        f'registrations.{reg_id}': reg_data 
                        for reg_id, reg_data in new_registrations.items()
                    }
                }
            )
            
            print(f"✅ Updated event with {len(new_registrations)} new registrations")
            print(f"Database update result: {update_result.modified_count} documents modified")
            
            # Verify the update
            updated_event = await db['events'].find_one(
                {'event_id': event_id}, 
                {'registrations': 1}
            )
            total_regs = len(updated_event.get('registrations', {}))
            print(f"✅ Total registrations now: {total_regs}")
            
        # Now create participation records for all team members
        print("\n=== CREATING PARTICIPATION RECORDS ===")
        
        # Get updated registrations
        final_event = await db['events'].find_one({'event_id': event_id})
        all_registrations = final_event.get('registrations', {})
        
        participation_records = []
        
        for reg_id, reg_data in all_registrations.items():
            student_data = reg_data['student_data']
            
            participation_record = {
                'event_id': event_id,
                'enrollment_no': student_data['enrollment_no'],
                'full_name': student_data['full_name'],
                'registration_id': reg_id,
                'registration_type': reg_data['registration_type'],
                'team_registration_id': reg_data.get('team_registration_id'),
                'team_name': student_data.get('team_name'),
                'registration_datetime': reg_data['registration_datetime'],
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
            
            participation_records.append(participation_record)
        
        # Clear existing participation records for this event and insert new ones
        await db['student_participation'].delete_many({'event_id': event_id})
        
        if participation_records:
            insert_result = await db['student_participation'].insert_many(participation_records)
            print(f"✅ Created {len(insert_result.inserted_ids)} participation records")
            
            for record in participation_records:
                role = "LEADER" if record['registration_type'] == 'team' else "MEMBER"
                print(f"  {role}: {record['full_name']} ({record['enrollment_no']})")
        
        print("\n=== MIGRATION COMPLETED SUCCESSFULLY ===")
        print(f"✅ Fixed team registrations for event: {event_id}")
        print(f"✅ Total team members: {len(participation_records)}")
        print("✅ All members now have proper registration and participation records")
        
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        await client.close()

if __name__ == "__main__":
    asyncio.run(fix_team_registrations())
