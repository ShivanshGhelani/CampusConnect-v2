# CampusConnect - Multiple Team Registration Test Suite
# Testing complex team participation scenarios

import asyncio
import sys
import os
from datetime import datetime

# Add backend to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.enhanced_student_registration_service import EnhancedStudentRegistrationService
from database.operations import DatabaseOperations

class MultipleTeamRegistrationTest:
    """Test suite for multiple team registration scenarios"""
    
    def __init__(self):
        self.service = EnhancedStudentRegistrationService()
        self.test_results = []
        self.passed = 0
        self.failed = 0
        
        # Test accounts as described by user
        self.test_students = {
            "A": {"enrollment_no": "22BEIT30001", "name": "Student A"},
            "B": {"enrollment_no": "22BEIT30002", "name": "Student B"}, 
            "C": {"enrollment_no": "22BEIT30003", "name": "Student C"},
            "D": {"enrollment_no": "22BEIT30004", "name": "Student D"}
        }
        
        # Test events
        self.test_events = {
            "single_team_event": {
                "event_id": "EVT_SINGLE_TEAM",
                "event_name": "Single Team Event",
                "event_type": "technical",
                "organizing_department": "IT",
                "registration_mode": "team",
                "allow_multiple_team_registrations": False,  # Standard single team
                "team_size_min": 2,
                "team_size_max": 10,
                "max_participants": 100
            },
            "multiple_team_event": {
                "event_id": "EVT_MULTIPLE_TEAM", 
                "event_name": "Multiple Team Event",
                "event_type": "technical",
                "organizing_department": "IT",
                "registration_mode": "team",
                "allow_multiple_team_registrations": True,  # Multiple teams allowed
                "team_size_min": 2,
                "team_size_max": 10,
                "max_participants": 100
            }
        }
    
    async def setup_test_data(self):
        """Setup test students and events"""
        try:
            # Create test students
            for student_data in self.test_students.values():
                student_doc = {
                    **student_data,
                    "email": f"{student_data['enrollment_no'].lower()}@test.com",
                    "department": "IT",
                    "year": 3,
                    "phone": "9876543210"
                }
                
                # Check if student exists, if not insert
                existing_student = await DatabaseOperations.find_one(
                    "students",
                    {"enrollment_no": student_data["enrollment_no"]}
                )
                if not existing_student:
                    await DatabaseOperations.insert_one("students", student_doc)
            
            # Create test events
            for event_data in self.test_events.values():
                event_doc = {
                    **event_data,
                    "start_datetime": datetime.utcnow(),
                    "end_datetime": datetime.utcnow(),
                    "venue": "Test Venue",
                    "mode": "offline"
                }
                
                # Check if event exists, if not insert
                existing_event = await DatabaseOperations.find_one(
                    "events",
                    {"event_id": event_data["event_id"]}
                )
                if not existing_event:
                    await DatabaseOperations.insert_one("events", event_doc)
            
            print("✅ Test data setup completed")
            
        except Exception as e:
            print(f"❌ Test data setup failed: {str(e)}")
            raise
    
    async def cleanup_test_data(self):
        """Clean up test data"""
        try:
            # Remove test registrations
            for event_data in self.test_events.values():
                await DatabaseOperations.delete_many(
                    "student_registrations",
                    {"event.event_id": event_data["event_id"]}
                )
            
            # Remove test students and events
            for student_data in self.test_students.values():
                await DatabaseOperations.delete_one(
                    "students",
                    {"enrollment_no": student_data["enrollment_no"]}
                )
            
            for event_data in self.test_events.values():
                await DatabaseOperations.delete_one(
                    "events", 
                    {"event_id": event_data["event_id"]}
                )
            
            print("✅ Test data cleanup completed")
            
        except Exception as e:
            print(f"⚠️ Test data cleanup failed: {str(e)}")
    
    def log_result(self, test_name: str, success: bool, message: str, details: dict = None):
        """Log test result"""
        status = "PASS" if success else "FAIL"
        result = {
            "test": test_name,
            "status": status,
            "message": message,
            "details": details or {},
            "time": datetime.utcnow().isoformat()
        }
        self.test_results.append(result)
        
        if success:
            self.passed += 1
            print(f"✅ {test_name}: {message}")
        else:
            self.failed += 1
            print(f"❌ {test_name}: {message}")
        
        if details:
            for key, value in details.items():
                print(f"   {key}: {value}")
    
    async def test_scenario_1_single_team_event(self):
        """
        Test Scenario 1: Standard single team event
        - A is team leader, B,C,D are members of Team 1
        - Should work normally (existing functionality)
        """
        print("\n🧪 Testing Scenario 1: Single Team Event (Standard)")
        print("-" * 50)
        
        try:
            team_data = {
                "team_name": "Team Alpha",
                "team_leader": self.test_students["A"]["enrollment_no"],
                "member_enrollments": [
                    self.test_students["B"]["enrollment_no"],
                    self.test_students["C"]["enrollment_no"], 
                    self.test_students["D"]["enrollment_no"]
                ]
            }
            
            result = await self.service.register_team(
                self.test_students["A"]["enrollment_no"],
                self.test_events["single_team_event"]["event_id"],
                team_data
            )
            
            if result["success"]:
                self.log_result(
                    "Single Team Registration",
                    True,
                    "Team registered successfully",
                    {
                        "team_id": result["team_id"],
                        "members": len(result["team_data"]["registration_details"])
                    }
                )
            else:
                self.log_result(
                    "Single Team Registration",
                    False,
                    f"Registration failed: {result['message']}"
                )
                
        except Exception as e:
            self.log_result(
                "Single Team Registration",
                False,
                f"Test failed: {str(e)}"
            )
    
    async def test_scenario_2_multiple_team_constraints(self):
        """
        Test Scenario 2: Multiple team event with constraints
        - A is team leader of Team 1 (B,C,D members)
        - A cannot be part of any other team (already TL)
        - B,C,D cannot be team leaders
        - B,C,D can be members of other teams
        """
        print("\n🧪 Testing Scenario 2: Multiple Team Event Constraints")
        print("-" * 50)
        
        try:
            # Step 1: Register Team 1 with A as leader
            team1_data = {
                "team_name": "Team Alpha",
                "team_leader": self.test_students["A"]["enrollment_no"],
                "member_enrollments": [
                    self.test_students["B"]["enrollment_no"],
                    self.test_students["C"]["enrollment_no"],
                    self.test_students["D"]["enrollment_no"]
                ]
            }
            
            result1 = await self.service.register_team(
                self.test_students["A"]["enrollment_no"],
                self.test_events["multiple_team_event"]["event_id"],
                team1_data
            )
            
            if result1["success"]:
                self.log_result(
                    "Team 1 Registration (A as Leader)",
                    True,
                    "Team 1 registered successfully",
                    {"team_id": result1["team_id"]}
                )
            else:
                self.log_result(
                    "Team 1 Registration (A as Leader)",
                    False,
                    f"Failed: {result1['message']}"
                )
                return  # Cannot continue without Team 1
            
            # Step 2: Try A as leader of another team (should fail)
            team2_data = {
                "team_name": "Team Beta",
                "team_leader": self.test_students["A"]["enrollment_no"],
                "member_enrollments": [self.test_students["B"]["enrollment_no"]]
            }
            
            result2 = await self.service.register_team(
                self.test_students["A"]["enrollment_no"],
                self.test_events["multiple_team_event"]["event_id"],
                team2_data
            )
            
            if not result2["success"]:
                self.log_result(
                    "A Cannot Lead Another Team",
                    True,
                    "Correctly prevented A from leading multiple teams",
                    {"reason": result2["message"]}
                )
            else:
                self.log_result(
                    "A Cannot Lead Another Team",
                    False,
                    "ERROR: A was allowed to lead multiple teams"
                )
            
            # Step 3: Try B as leader of another team (should fail - already member)
            team3_data = {
                "team_name": "Team Gamma",
                "team_leader": self.test_students["B"]["enrollment_no"],
                "member_enrollments": [self.test_students["C"]["enrollment_no"]]
            }
            
            result3 = await self.service.register_team(
                self.test_students["B"]["enrollment_no"],
                self.test_events["multiple_team_event"]["event_id"],
                team3_data
            )
            
            if not result3["success"]:
                self.log_result(
                    "B Cannot Lead While Being Member",
                    True,
                    "Correctly prevented B from leading while being member",
                    {"reason": result3["message"]}
                )
            else:
                self.log_result(
                    "B Cannot Lead While Being Member",
                    False,
                    "ERROR: B was allowed to lead while being member"
                )
            
            # Step 4: Register B as member of another team (should succeed)
            # First need a different leader (create new student E)
            student_e = {"enrollment_no": "22BEIT30005", "name": "Student E"}
            student_e_doc = {
                **student_e,
                "email": "22beit30005@test.com",
                "department": "IT",
                "year": 3,
                "phone": "9876543210"
            }
            
            # Check if student E exists, if not insert
            existing_student_e = await DatabaseOperations.find_one(
                "students",
                {"enrollment_no": student_e["enrollment_no"]}
            )
            if not existing_student_e:
                await DatabaseOperations.insert_one("students", student_e_doc)
            
            team4_data = {
                "team_name": "Team Delta",
                "team_leader": student_e["enrollment_no"],
                "member_enrollments": [self.test_students["B"]["enrollment_no"]]
            }
            
            result4 = await self.service.register_team(
                student_e["enrollment_no"],
                self.test_events["multiple_team_event"]["event_id"],
                team4_data
            )
            
            if result4["success"]:
                self.log_result(
                    "B Can Join Another Team as Member",
                    True,
                    "B successfully joined second team as member",
                    {"team_id": result4["team_id"]}
                )
            else:
                self.log_result(
                    "B Can Join Another Team as Member",
                    False,
                    f"Failed: {result4['message']}"
                )
            
            # Clean up extra student
            await DatabaseOperations.delete_one(
                "students",
                {"enrollment_no": student_e["enrollment_no"]}
            )
                
        except Exception as e:
            self.log_result(
                "Multiple Team Constraints Test",
                False,
                f"Test failed: {str(e)}"
            )
    
    async def test_scenario_3_student_multiple_teams(self):
        """
        Test Scenario 3: Student as member of multiple teams
        - Create multiple teams with different leaders
        - Add same student as member to multiple teams
        """
        print("\n🧪 Testing Scenario 3: Student in Multiple Teams")
        print("-" * 50)
        
        try:
            # Create additional test students as leaders
            extra_students = []
            for i in range(3):
                student = {
                    "enrollment_no": f"22BEIT3000{6+i}",
                    "name": f"Leader {i+1}"
                }
                student_doc = {
                    **student,
                    "email": f"{student['enrollment_no'].lower()}@test.com",
                    "department": "IT",
                    "year": 3,
                    "phone": "9876543210"
                }
                
                # Check if student exists, if not insert
                existing_student = await DatabaseOperations.find_one(
                    "students",
                    {"enrollment_no": student["enrollment_no"]}
                )
                if not existing_student:
                    await DatabaseOperations.insert_one("students", student_doc)
                    
                extra_students.append(student)
            
            teams_registered = 0
            
            # Register Student B in 3 different teams
            for i, leader in enumerate(extra_students):
                team_data = {
                    "team_name": f"Multi Team {i+1}",
                    "team_leader": leader["enrollment_no"],
                    "member_enrollments": [self.test_students["B"]["enrollment_no"]]
                }
                
                result = await self.service.register_team(
                    leader["enrollment_no"],
                    self.test_events["multiple_team_event"]["event_id"],
                    team_data
                )
                
                if result["success"]:
                    teams_registered += 1
                    self.log_result(
                        f"Multi Team {i+1} Registration",
                        True,
                        f"B successfully joined team {i+1}",
                        {"team_id": result["team_id"]}
                    )
                else:
                    self.log_result(
                        f"Multi Team {i+1} Registration",
                        False,
                        f"Failed: {result['message']}"
                    )
            
            # Test getting student's multiple registrations
            registrations = await self.service.get_student_registrations_for_event(
                self.test_students["B"]["enrollment_no"],
                self.test_events["multiple_team_event"]["event_id"]
            )
            
            if registrations["success"]:
                self.log_result(
                    "Multiple Team Membership Query",
                    True,
                    f"B is member of {len(registrations['member_roles'])} teams",
                    {
                        "total_registrations": registrations["total_registrations"],
                        "member_roles": len(registrations["member_roles"]),
                        "leadership_roles": len(registrations["leadership_roles"])
                    }
                )
            else:
                self.log_result(
                    "Multiple Team Membership Query",
                    False,
                    "Failed to query registrations"
                )
            
            # Clean up extra students
            for student in extra_students:
                await DatabaseOperations.delete_one(
                    "students",
                    {"enrollment_no": student["enrollment_no"]}
                )
                
        except Exception as e:
            self.log_result(
                "Multiple Team Membership Test",
                False,
                f"Test failed: {str(e)}"
            )
    
    async def run_all_tests(self):
        """Run all multiple team registration tests"""
        print("🚀 CampusConnect Multiple Team Registration Tests")
        print("Testing Complex Team Participation Scenarios")
        print("=" * 70)
        
        try:
            await self.setup_test_data()
            
            # Run test scenarios
            await self.test_scenario_1_single_team_event()
            await self.test_scenario_2_multiple_team_constraints()
            await self.test_scenario_3_student_multiple_teams()
            
        finally:
            await self.cleanup_test_data()
        
        # Generate summary
        total = self.passed + self.failed
        success_rate = (self.passed / total * 100) if total > 0 else 0
        
        print("\n" + "=" * 70)
        print("📊 MULTIPLE TEAM REGISTRATION TEST SUMMARY")
        print("=" * 70)
        print(f"Total Tests: {total}")
        print(f"Passed: {self.passed}")
        print(f"Failed: {self.failed}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 90:
            print("\n🎉 EXCELLENT: Multiple team registration system works perfectly!")
        elif success_rate >= 70:
            print("\n✅ GOOD: System handles most scenarios correctly")
        else:
            print("\n⚠️ NEEDS WORK: Multiple team registration has issues")
        
        return self.test_results

async def main():
    """Main test execution"""
    test_suite = MultipleTeamRegistrationTest()
    results = await test_suite.run_all_tests()
    return results

if __name__ == "__main__":
    print("Testing CampusConnect Multiple Team Registration...")
    results = asyncio.run(main())
    print(f"\nCompleted with {len(results)} test results.")
