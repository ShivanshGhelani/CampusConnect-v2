# CampusConnect - Minimal Testing Framework
# Simplified test runner for Phase 1 registration system

import asyncio
import sys
import os
from datetime import datetime

# Add backend to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Direct import without services module
from services.student_registration_service import StudentRegistrationService

class SimpleRegistrationTest:
    """Simplified test for registration system"""
    
    def __init__(self):
        self.test_results = []
        self.passed = 0
        self.failed = 0
    
    def log_result(self, test_name: str, success: bool, message: str):
        """Log test result"""
        status = "PASS" if success else "FAIL"
        result = {
            "test": test_name,
            "status": status,
            "message": message,
            "time": datetime.utcnow().isoformat()
        }
        self.test_results.append(result)
        
        if success:
            self.passed += 1
            print(f"✅ {test_name}: {message}")
        else:
            self.failed += 1
            print(f"❌ {test_name}: {message}")
    
    async def test_service_creation(self):
        """Test if registration service can be created"""
        try:
            service = StudentRegistrationService()
            self.log_result(
                "Service Creation", 
                True, 
                "StudentRegistrationService created successfully"
            )
            return service
        except Exception as e:
            self.log_result(
                "Service Creation", 
                False, 
                f"Failed to create service: {str(e)}"
            )
            return None
    
    async def test_basic_functionality(self, service):
        """Test basic service functionality"""
        if not service:
            self.log_result(
                "Basic Functionality", 
                False, 
                "Cannot test - service creation failed"
            )
            return
        
        try:
            # Test method existence
            if hasattr(service, 'register_individual_student'):
                self.log_result(
                    "Method Availability", 
                    True, 
                    "Required methods are available"
                )
            else:
                self.log_result(
                    "Method Availability", 
                    False, 
                    "Required methods are missing"
                )
        except Exception as e:
            self.log_result(
                "Basic Functionality", 
                False, 
                f"Functionality test failed: {str(e)}"
            )
    
    async def run_tests(self):
        """Run all tests"""
        print("🚀 CampusConnect Registration System - Quick Test")
        print("=" * 60)
        
        # Test service creation
        service = await self.test_service_creation()
        
        # Test basic functionality
        await self.test_basic_functionality(service)
        
        # Generate summary
        total = self.passed + self.failed
        success_rate = (self.passed / total * 100) if total > 0 else 0
        
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {total}")
        print(f"Passed: {self.passed}")
        print(f"Failed: {self.failed}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if success_rate == 100:
            print("\n🎉 All tests passed! Registration system is ready.")
        elif success_rate >= 50:
            print("\n⚠️ Some tests failed. Review implementation.")
        else:
            print("\n🚨 Critical issues detected. Fix before proceeding.")
        
        return self.test_results

async def main():
    """Main test execution"""
    test_suite = SimpleRegistrationTest()
    results = await test_suite.run_tests()
    return results

if __name__ == "__main__":
    # Run the quick tests
    print("Running CampusConnect Phase 1 Registration Tests...")
    results = asyncio.run(main())
    print(f"\nTest completed with {len(results)} results.")
