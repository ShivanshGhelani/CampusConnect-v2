# CampusConnect - Registration Testing Framework
# Comprehensive testing for Phase 1 registration system

import asyncio
import json
from typing import Dict, List, Any
from datetime import datetime
import sys
import os

# Add backend to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.student_registration_service import StudentRegistrationService
from database.operations import DatabaseOperations
from core.logger import get_logger

logger = get_logger(__name__)

class RegistrationTestSuite:
    """Comprehensive test suite for student registration system"""
    
    def __init__(self):
        self.service = StudentRegistrationService()
        self.test_results = []
        self.passed_tests = 0
        self.failed_tests = 0
        
        # Test data
        self.test_student = {
            "enrollment_no": "22BEIT30043",
            "name": "Test Student",
            "email": "test.student@example.com",
            "department": "IT",
            "year": 3,
            "phone": "9876543210"
        }
        
        self.test_event = {
            "event_id": "TEST_EVENT_001",
            "event_name": "Test Technical Workshop",
            "event_date": datetime.utcnow().isoformat(),
            "event_type": "technical",
            "organizer": "IT Department",
            "max_capacity": 100,
            "registration_open": True
        }
        
        self.test_team_data = {
            "team_name": "CodeMasters Test Team",
            "team_leader": "22BEIT30043",
            "member_enrollments": ["22BEIT30044", "22BEIT30045", "22BEIT30046"]
        }
    
    async def setup_test_data(self):
        """Setup test data in database"""
        try:
            # Ensure test student exists
            await DatabaseOperations.upsert_one(
                "students",
                {"enrollment_no": self.test_student["enrollment_no"]},
                self.test_student
            )
            
            # Add team members
            for i, enrollment in enumerate(self.test_team_data["member_enrollments"], 44):
                await DatabaseOperations.upsert_one(
                    "students",
                    {"enrollment_no": enrollment},
                    {
                        "enrollment_no": enrollment,
                        "name": f"Team Member {i-43}",
                        "email": f"member{i-43}@example.com",
                        "department": "IT",
                        "year": 3,
                        "phone": f"987654321{i-43}"
                    }
                )
            
            # Ensure test event exists
            await DatabaseOperations.upsert_one(
                "events",
                {"event_id": self.test_event["event_id"]},
                self.test_event
            )
            
            logger.info("Test data setup completed")
            
        except Exception as e:
            logger.error(f"Test data setup failed: {str(e)}")
            raise
    
    async def cleanup_test_data(self):
        """Clean up test data from database"""
        try:
            # Remove test registrations
            await DatabaseOperations.delete_many(
                "student_registrations",
                {"event.event_id": self.test_event["event_id"]}
            )
            
            # Remove test students
            test_enrollments = [self.test_student["enrollment_no"]] + self.test_team_data["member_enrollments"]
            for enrollment in test_enrollments:
                await DatabaseOperations.delete_one(
                    "students",
                    {"enrollment_no": enrollment}
                )
            
            # Remove test event
            await DatabaseOperations.delete_one(
                "events",
                {"event_id": self.test_event["event_id"]}
            )
            
            logger.info("Test data cleanup completed")
            
        except Exception as e:
            logger.error(f"Test data cleanup failed: {str(e)}")
    
    def log_test_result(self, test_name: str, passed: bool, message: str, details: Dict = None):
        """Log test result"""
        if passed:
            self.passed_tests += 1
            status = "PASS"
        else:
            self.failed_tests += 1
            status = "FAIL"
        
        result = {
            "test_name": test_name,
            "status": status,
            "message": message,
            "details": details or {},
            "timestamp": datetime.utcnow().isoformat()
        }
        
        self.test_results.append(result)
        logger.info(f"[{status}] {test_name}: {message}")
    
    async def test_individual_registration_success(self):
        """Test successful individual registration"""
        try:
            result = await self.service.register_individual_student(
                self.test_student["enrollment_no"],
                self.test_event["event_id"]
            )
            
            if result["success"]:
                self.log_test_result(
                    "Individual Registration Success",
                    True,
                    "Individual registration completed successfully",
                    {"registration_id": result["registration_id"]}
                )
            else:
                self.log_test_result(
                    "Individual Registration Success",
                    False,
                    f"Registration failed: {result['message']}"
                )
                
        except Exception as e:
            self.log_test_result(
                "Individual Registration Success",
                False,
                f"Test failed with exception: {str(e)}"
            )
    
    async def test_duplicate_registration_prevention(self):
        """Test prevention of duplicate registrations"""
        try:
            # Try to register the same student again
            result = await self.service.register_individual_student(
                self.test_student["enrollment_no"],
                self.test_event["event_id"]
            )
            
            if not result["success"] and "already registered" in result["message"].lower():
                self.log_test_result(
                    "Duplicate Registration Prevention",
                    True,
                    "Duplicate registration properly prevented"
                )
            else:
                self.log_test_result(
                    "Duplicate Registration Prevention",
                    False,
                    "Duplicate registration was not prevented"
                )
                
        except Exception as e:
            self.log_test_result(
                "Duplicate Registration Prevention",
                False,
                f"Test failed with exception: {str(e)}"
            )
    
    async def test_team_registration_success(self):
        """Test successful team registration"""
        try:
            result = await self.service.register_team(
                self.test_team_data["team_leader"],
                self.test_event["event_id"],
                self.test_team_data
            )
            
            if result["success"]:
                self.log_test_result(
                    "Team Registration Success",
                    True,
                    "Team registration completed successfully",
                    {"team_id": result["team_id"]}
                )
            else:
                self.log_test_result(
                    "Team Registration Success",
                    False,
                    f"Team registration failed: {result['message']}"
                )
                
        except Exception as e:
            self.log_test_result(
                "Team Registration Success",
                False,
                f"Test failed with exception: {str(e)}"
            )
    
    async def test_registration_status_retrieval(self):
        """Test registration status retrieval"""
        try:
            status_data = await self.service.get_registration_status(
                self.test_student["enrollment_no"],
                self.test_event["event_id"]
            )
            
            if status_data and status_data.get("registration_found"):
                self.log_test_result(
                    "Registration Status Retrieval",
                    True,
                    "Registration status retrieved successfully",
                    {"status": status_data["registration_status"]}
                )
            else:
                self.log_test_result(
                    "Registration Status Retrieval",
                    False,
                    "Failed to retrieve registration status"
                )
                
        except Exception as e:
            self.log_test_result(
                "Registration Status Retrieval",
                False,
                f"Test failed with exception: {str(e)}"
            )
    
    async def test_registration_cancellation(self):
        """Test registration cancellation"""
        try:
            result = await self.service.cancel_registration(
                self.test_student["enrollment_no"],
                self.test_event["event_id"],
                "Test cancellation"
            )
            
            if result["success"]:
                self.log_test_result(
                    "Registration Cancellation",
                    True,
                    "Registration cancelled successfully",
                    {"registration_id": result["registration_id"]}
                )
            else:
                self.log_test_result(
                    "Registration Cancellation",
                    False,
                    f"Cancellation failed: {result['message']}"
                )
                
        except Exception as e:
            self.log_test_result(
                "Registration Cancellation",
                False,
                f"Test failed with exception: {str(e)}"
            )
    
    async def test_invalid_student_registration(self):
        """Test registration with invalid student"""
        try:
            result = await self.service.register_individual_student(
                "INVALID_ENROLLMENT",
                self.test_event["event_id"]
            )
            
            if not result["success"] and "not found" in result["message"].lower():
                self.log_test_result(
                    "Invalid Student Registration",
                    True,
                    "Invalid student registration properly rejected"
                )
            else:
                self.log_test_result(
                    "Invalid Student Registration",
                    False,
                    "Invalid student registration was not rejected"
                )
                
        except Exception as e:
            self.log_test_result(
                "Invalid Student Registration",
                False,
                f"Test failed with exception: {str(e)}"
            )
    
    async def test_invalid_event_registration(self):
        """Test registration for invalid event"""
        try:
            result = await self.service.register_individual_student(
                self.test_student["enrollment_no"],
                "INVALID_EVENT_ID"
            )
            
            if not result["success"] and "not found" in result["message"].lower():
                self.log_test_result(
                    "Invalid Event Registration",
                    True,
                    "Invalid event registration properly rejected"
                )
            else:
                self.log_test_result(
                    "Invalid Event Registration",
                    False,
                    "Invalid event registration was not rejected"
                )
                
        except Exception as e:
            self.log_test_result(
                "Invalid Event Registration",
                False,
                f"Test failed with exception: {str(e)}"
            )
    
    async def run_all_tests(self):
        """Run all registration tests"""
        print("🚀 Starting CampusConnect Registration System Tests")
        print("=" * 60)
        
        try:
            # Setup test environment
            await self.setup_test_data()
            
            # Run individual registration tests
            await self.test_individual_registration_success()
            await self.test_duplicate_registration_prevention()
            await self.test_registration_status_retrieval()
            await self.test_registration_cancellation()
            
            # Run team registration tests
            await self.test_team_registration_success()
            
            # Run validation tests
            await self.test_invalid_student_registration()
            await self.test_invalid_event_registration()
            
        finally:
            # Clean up test data
            await self.cleanup_test_data()
        
        # Generate test report
        self.generate_test_report()
    
    def generate_test_report(self):
        """Generate comprehensive test report"""
        total_tests = self.passed_tests + self.failed_tests
        success_rate = (self.passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print("\n" + "=" * 60)
        print("📊 TEST EXECUTION SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.failed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        print()
        
        # Detailed results
        print("📋 DETAILED TEST RESULTS")
        print("-" * 60)
        
        for result in self.test_results:
            status_emoji = "✅" if result["status"] == "PASS" else "❌"
            print(f"{status_emoji} {result['test_name']}")
            print(f"   Message: {result['message']}")
            if result["details"]:
                print(f"   Details: {json.dumps(result['details'], indent=6)}")
            print()
        
        # Overall assessment
        if success_rate >= 90:
            print("🎉 EXCELLENT: Registration system is working perfectly!")
        elif success_rate >= 70:
            print("✅ GOOD: Registration system is mostly functional with minor issues")
        elif success_rate >= 50:
            print("⚠️  WARNING: Registration system has significant issues")
        else:
            print("🚨 CRITICAL: Registration system has major problems")
        
        return {
            "total_tests": total_tests,
            "passed": self.passed_tests,
            "failed": self.failed_tests,
            "success_rate": success_rate,
            "results": self.test_results,
            "timestamp": datetime.utcnow().isoformat()
        }

# Performance testing
class PerformanceTestSuite:
    """Performance testing for registration system"""
    
    def __init__(self):
        self.service = StudentRegistrationService()
    
    async def test_bulk_registrations(self, count: int = 100):
        """Test bulk registration performance"""
        print(f"\n🏃‍♂️ Performance Test: {count} Bulk Registrations")
        print("-" * 50)
        
        start_time = datetime.utcnow()
        successful_registrations = 0
        
        for i in range(count):
            try:
                enrollment = f"PERF_TEST_{str(i).zfill(5)}"
                
                # Create test student
                await DatabaseOperations.upsert_one(
                    "students",
                    {"enrollment_no": enrollment},
                    {
                        "enrollment_no": enrollment,
                        "name": f"Performance Test Student {i}",
                        "email": f"perftest{i}@example.com",
                        "department": "IT",
                        "year": 3,
                        "phone": "9876543210"
                    }
                )
                
                # Register for event
                result = await self.service.register_individual_student(
                    enrollment,
                    "TEST_EVENT_001"
                )
                
                if result["success"]:
                    successful_registrations += 1
                
            except Exception as e:
                print(f"Registration {i} failed: {str(e)}")
        
        end_time = datetime.utcnow()
        duration = (end_time - start_time).total_seconds()
        
        print(f"Total Time: {duration:.2f} seconds")
        print(f"Successful Registrations: {successful_registrations}/{count}")
        print(f"Average Time per Registration: {(duration/count)*1000:.2f}ms")
        print(f"Registrations per Second: {count/duration:.2f}")
        
        # Cleanup
        await DatabaseOperations.delete_many(
            "student_registrations",
            {"event.event_id": "TEST_EVENT_001"}
        )
        
        for i in range(count):
            enrollment = f"PERF_TEST_{str(i).zfill(5)}"
            await DatabaseOperations.delete_one(
                "students",
                {"enrollment_no": enrollment}
            )

# Main test execution
async def main():
    """Main test execution function"""
    print("🎯 CampusConnect Registration System Testing")
    print("Phase 1: Student Registration Service")
    print("=" * 60)
    
    # Run functional tests
    test_suite = RegistrationTestSuite()
    test_results = await test_suite.run_all_tests()
    
    # Run performance tests if functional tests pass
    if test_results["success_rate"] >= 70:
        print("\n🚀 Running Performance Tests...")
        performance_suite = PerformanceTestSuite()
        await performance_suite.test_bulk_registrations(50)
    else:
        print("\n⚠️ Skipping performance tests due to functional test failures")
    
    print("\n✨ Testing completed!")
    return test_results

if __name__ == "__main__":
    # Run the tests
    test_results = asyncio.run(main())
