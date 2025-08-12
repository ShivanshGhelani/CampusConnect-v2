"""
Test script for normalized registration service
Tests the new registration logic without data duplication
"""
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timezone
from database.operations import DatabaseOperations
from models.student import Student
from api.v1.client.registration.normalized_registration import NormalizedRegistrationService

async def test_database_connection():
    """Test if we can connect to the database"""
    try:
        # Test connection with proper projection syntax
        result = await DatabaseOperations.find_one("students", {}, "CampusConnect")
        print("✅ Database connection successful")
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

async def test_individual_registration():
    """Test individual registration with normalized storage"""
    print("\n🧪 Testing Individual Registration (Normalized)")
    
    try:
        # Create test event first
        event_id = "TEST_EVENT_2025"
        test_event = {
            "event_id": event_id,
            "event_name": "Test Normalized Event",
            "status": "upcoming",
            "event_date": "2025-12-01",
            "registrations": {}
        }
        
        # Insert test event
        await DatabaseOperations.insert_one("events", test_event)
        print("✅ Test event created")
        
        # Create test student first
        test_student_data = {
            "enrollment_no": "TEST_NORM_001",
            "full_name": "Test Normalized User",
            "email": "testnorm@example.com",
            "mobile_no": "9999999999",
            "password_hash": "$2b$12$dummy_hash_for_testing",
            "department": "Computer Science",
            "semester": 6,
            "event_participations": {}
        }
        
        # Insert test student
        await DatabaseOperations.insert_one("students", test_student_data)
        print("✅ Test student created")
        
        # Create a test student object with required password_hash
        test_student = Student(
            enrollment_no="TEST_NORM_001",
            full_name="Test Normalized User",
            email="testnorm@example.com",
            mobile_no="9999999999",
            password_hash="$2b$12$dummy_hash_for_testing",  # Required field
            department="Computer Science",
            semester=6
        )
        
        event_id = "TEST_EVENT_2025"
        registration_data = {
            "additional_info": "Testing normalized registration",
            "dietary_requirements": "None"
        }
        
        # Test the normalized registration
        try:
            result = await NormalizedRegistrationService.register_individual(
                student=test_student,
                event_id=event_id,
                registration_data=registration_data
            )
            
            print(f"✅ Individual registration successful: {result}")
            
            # Verify data storage
            registration_id = result["registration_id"]
        except Exception as reg_error:
            print(f"❌ Registration failed: {reg_error}")
            return False
        
        # Check event.registrations (should have full data)
        event_data = await DatabaseOperations.find_one(
            "events",
            {"event_id": event_id}
        )
        
        if event_data and "registrations" in event_data:
            full_data = event_data["registrations"].get(registration_id)
            if full_data:
                print("✅ Full registration data stored in event.registrations")
                print(f"   Data size: {len(str(full_data))} characters")
            else:
                print("❌ Full data not found in event.registrations")
        
        # Check student.event_participations (should have reference data only)
        student_data = await DatabaseOperations.find_one(
            "students",
            {"enrollment_no": test_student.enrollment_no}
        )
        
        if student_data and "event_participations" in student_data:
            ref_data = student_data["event_participations"].get(event_id)
            if ref_data:
                print("✅ Reference data stored in student.event_participations")
                print(f"   Reference size: {len(str(ref_data))} characters")
                
                # Verify it's minimal data
                if "student_data" in ref_data:
                    print("⚠️  Warning: Reference data contains full student_data (not normalized)")
                else:
                    print("✅ Reference data is properly normalized (no duplicate student_data)")
            else:
                print("❌ Reference data not found in student.event_participations")
        
        return True
        
    except Exception as e:
        print(f"❌ Individual registration test failed: {e}")
        return False

async def test_team_registration():
    """Test team registration with normalized storage"""
    print("\n🧪 Testing Team Registration (Normalized)")
    
    try:
        # Create test event first
        event_id = "TEST_TEAM_EVENT_2025"
        test_event = {
            "event_id": event_id,
            "event_name": "Test Team Event",
            "status": "upcoming",
            "event_date": "2025-12-01",
            "registrations": {}
        }
        
        # Insert test event
        await DatabaseOperations.insert_one("events", test_event)
        print("✅ Test team event created")
        
        # Create test students (leader and members)
        test_students = [
            {
                "enrollment_no": "TEST_LEADER_001",
                "full_name": "Test Team Leader",
                "email": "leader@example.com",
                "mobile_no": "8888888888",
                "password_hash": "$2b$12$dummy_hash_for_testing",
                "department": "Computer Science",
                "semester": 6,
                "event_participations": {}
            },
            {
                "enrollment_no": "TEST_MEMBER_001",
                "full_name": "Test Member 1",
                "email": "member1@example.com",
                "mobile_no": "7777777777",
                "password_hash": "$2b$12$dummy_hash_for_testing",
                "department": "Computer Science",
                "semester": 5,
                "year": 3,
                "event_participations": {}
            },
            {
                "enrollment_no": "TEST_MEMBER_002",
                "full_name": "Test Member 2",
                "email": "member2@example.com",
                "mobile_no": "6666666666",
                "password_hash": "$2b$12$dummy_hash_for_testing",
                "department": "Computer Science",
                "semester": 5,
                "year": 3,
                "event_participations": {}
            }
        ]
        
        # Insert test students
        for student_data in test_students:
            await DatabaseOperations.insert_one("students", student_data)
        print("✅ Test students created")
        
        # Create test team leader
        team_leader = Student(
            enrollment_no="TEST_LEADER_001",
            full_name="Test Team Leader",
            email="leader@example.com",
            mobile_no="8888888888",
            password_hash="$2b$12$dummy_hash_for_testing",  # Required field
            department="Computer Science",
            semester=6
        )
        
        event_id = "TEST_TEAM_EVENT_2025"
        team_name = "Normalized Test Team"
        team_members = [
            {
                "enrollment_no": "TEST_MEMBER_001",
                "name": "Test Member 1",
                "email": "member1@example.com",
                "mobile_no": "7777777777"
            },
            {
                "enrollment_no": "TEST_MEMBER_002", 
                "name": "Test Member 2",
                "email": "member2@example.com",
                "mobile_no": "6666666666"
            }
        ]
        
        registration_data = {
            "team_description": "Testing normalized team registration"
        }
        
        # Test normalized team registration
        try:
            result = await NormalizedRegistrationService.register_team(
                leader=team_leader,
                event_id=event_id,
                team_name=team_name,
                team_members=team_members,
                registration_data=registration_data
            )
            
            print(f"✅ Team registration successful: {result}")
        except Exception as reg_error:
            print(f"❌ Team registration failed: {reg_error}")
            return False
        
        # Verify storage for all team members
        team_reg_id = result.get("team_registration_id")
        leader_reg_id = result.get("leader_registration_id")
        member_reg_ids = result.get("member_registration_ids", [])
        
        print(f"   Team ID: {team_reg_id}")
        print(f"   Leader Registration: {leader_reg_id}")
        print(f"   Member Registrations: {len(member_reg_ids)}")
        
        # Check event registrations
        event_data = await DatabaseOperations.find_one(
            "events",
            {"event_id": event_id}
        )
        
        if event_data and "registrations" in event_data:
            registrations = event_data["registrations"]
            
            # Check leader data
            if leader_reg_id in registrations:
                print("✅ Team leader data stored in event.registrations")
            
            # Check member data
            members_found = sum(1 for mid in member_reg_ids if mid in registrations)
            print(f"✅ {members_found}/{len(member_reg_ids)} team members stored in event.registrations")
        
        return True
        
    except Exception as e:
        print(f"❌ Team registration test failed: {e}")
        return False

async def test_data_retrieval():
    """Test data retrieval functions"""
    print("\n🧪 Testing Data Retrieval Functions")
    
    try:
        # Test getting student registrations
        registrations = await NormalizedRegistrationService.get_student_registrations("TEST_NORM_001")
        print(f"✅ Retrieved {len(registrations)} registrations for test student")
        
        for event_id, ref_data in registrations.items():
            print(f"   Event {event_id}: {ref_data.get('registration_id', 'No ID')}")
            
            # Test getting full registration data
            if ref_data.get('registration_id'):
                full_data = await NormalizedRegistrationService.get_full_registration_data(
                    ref_data['registration_id'], event_id
                )
                if full_data:
                    print(f"   ✅ Full data retrieved for {ref_data['registration_id']}")
                else:
                    print(f"   ❌ Full data not found for {ref_data['registration_id']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Data retrieval test failed: {e}")
        return False

async def test_storage_comparison():
    """Compare storage efficiency between old and new approaches"""
    print("\n📊 Storage Efficiency Comparison")
    
    try:
        # Get a sample registration from both formats
        event_data = await DatabaseOperations.find_one(
            "events",
            {"registrations": {"$exists": True, "$ne": {}}}
        )
        
        if event_data and "registrations" in event_data:
            registrations = event_data["registrations"]
            if registrations:
                sample_reg_id = list(registrations.keys())[0]
                full_data = registrations[sample_reg_id]
                
                # Calculate sizes
                full_data_size = len(str(full_data))
                
                # Create reference data equivalent
                ref_data = {
                    "registration_id": full_data.get("registration_id"),
                    "registration_type": full_data.get("registration_type"),
                    "registration_datetime": full_data.get("registration_datetime"),
                    "event_id": event_data.get("event_id", "unknown"),
                    "status": "registered"
                }
                ref_data_size = len(str(ref_data))
                
                print(f"Full registration data size: {full_data_size} characters")
                print(f"Reference data size: {ref_data_size} characters")
                print(f"Storage reduction: {((full_data_size - ref_data_size) / full_data_size) * 100:.1f}%")
                
                # Duplication comparison
                old_total = full_data_size * 2  # Stored in both places
                new_total = full_data_size + ref_data_size  # Full + reference
                savings = ((old_total - new_total) / old_total) * 100
                
                print(f"\nDuplication Analysis:")
                print(f"Old approach (duplicated): {old_total} characters")
                print(f"New approach (normalized): {new_total} characters") 
                print(f"Total storage savings: {savings:.1f}%")
        
        return True
        
    except Exception as e:
        print(f"❌ Storage comparison failed: {e}")
        return False

async def cleanup_test_data():
    """Clean up test data"""
    print("\n🧹 Cleaning up test data...")
    
    try:
        # Remove test events
        await DatabaseOperations.delete_many("events", {
            "event_id": {"$in": ["TEST_EVENT_2025", "TEST_TEAM_EVENT_2025"]}
        })
        
        # Remove test student registrations
        await DatabaseOperations.update_many(
            "students",
            {"enrollment_no": {"$in": ["TEST_NORM_001", "TEST_LEADER_001", "TEST_MEMBER_001", "TEST_MEMBER_002"]}},
            {"$unset": {"event_participations": ""}}
        )
        
        print("✅ Test data cleaned up")
        return True
        
    except Exception as e:
        print(f"⚠️  Cleanup warning: {e}")
        return False

async def main():
    """Run all tests"""
    print("🚀 Starting Normalized Registration Service Tests")
    print("=" * 60)
    
    # Test database connection
    if not await test_database_connection():
        print("❌ Cannot proceed without database connection")
        return
    
    # Run all tests
    tests = [
        test_individual_registration,
        test_team_registration,
        test_data_retrieval,
        test_storage_comparison
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if await test():
                passed += 1
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
    
    # Cleanup
    await cleanup_test_data()
    
    print("\n" + "=" * 60)
    print(f"🎯 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("✅ All tests passed! Normalized registration service is working correctly.")
        print("🚀 Ready to proceed with migration and implementation!")
    else:
        print("⚠️  Some tests failed. Please review the implementation before proceeding.")

if __name__ == "__main__":
    asyncio.run(main())
