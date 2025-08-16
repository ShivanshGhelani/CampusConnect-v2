"""
Test Runner - Event Lifecycle Implementation
===========================================
Comprehensive test runner for all event lifecycle tests
"""

import subprocess
import sys
import os
import asyncio
from datetime import datetime
from pathlib import Path

class EventLifecycleTestRunner:
    """
    Test runner for event lifecycle implementation
    """
    
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.test_dir = self.project_root / "tests"
        self.scripts_dir = self.project_root / "scripts"
        
    def run_unit_tests(self):
        """Run unit tests with pytest"""
        print("🧪 Running Unit Tests...")
        print("="*50)
        
        try:
            # Install test dependencies
            print("📦 Installing test dependencies...")
            subprocess.run([
                sys.executable, "-m", "pip", "install", "-r", 
                str(self.test_dir / "requirements.txt")
            ], check=True, capture_output=True)
            
            # Run pytest
            result = subprocess.run([
                sys.executable, "-m", "pytest",
                str(self.test_dir),
                "-v",
                "--tb=short",
                "--cov=services",
                "--cov=models", 
                "--cov=api",
                "--cov-report=term-missing",
                "--cov-report=html:htmlcov"
            ], capture_output=True, text=True, cwd=self.project_root)
            
            print(result.stdout)
            if result.stderr:
                print("STDERR:", result.stderr)
            
            if result.returncode == 0:
                print("✅ Unit tests passed!")
                return True
            else:
                print("❌ Unit tests failed!")
                return False
                
        except Exception as e:
            print(f"❌ Error running unit tests: {str(e)}")
            return False
    
    async def run_integration_tests(self):
        """Run integration tests"""
        print("\n🔗 Running Integration Tests...")
        print("="*50)
        
        try:
            # Import and run integration test
            sys.path.append(str(self.scripts_dir))
            from test_event_lifecycle_integration import EventLifecycleIntegrationTest
            
            test_runner = EventLifecycleIntegrationTest()
            
            # Setup test data
            print("🔧 Setting up test environment...")
            await test_runner.setup_test_data()
            
            # Run tests
            tests = [
                ("Complete Lifecycle", test_runner.test_complete_lifecycle()),
                ("Performance", test_runner.test_performance()),
                ("Concurrent Registrations", test_runner.test_concurrent_registrations())
            ]
            
            results = {}
            for test_name, test_coro in tests:
                try:
                    print(f"\n🧪 Running {test_name} Test...")
                    result = await test_coro
                    results[test_name] = "PASSED" if result is not False else "FAILED"
                    print(f"✅ {test_name}: PASSED")
                except Exception as e:
                    results[test_name] = f"FAILED: {str(e)}"
                    print(f"❌ {test_name}: FAILED - {str(e)}")
            
            # Cleanup
            await test_runner.cleanup_test_data()
            
            # Return results
            passed = sum(1 for r in results.values() if r == "PASSED")
            total = len(results)
            
            print(f"\n📊 Integration Tests: {passed}/{total} passed")
            return passed == total
            
        except Exception as e:
            print(f"❌ Error running integration tests: {str(e)}")
            return False
    
    def run_api_tests(self):
        """Run API tests"""
        print("\n🌐 Running API Tests...")
        print("="*50)
        
        try:
            # Run specific API tests
            result = subprocess.run([
                sys.executable, "-m", "pytest",
                str(self.test_dir / "test_registration_api.py"),
                "-v",
                "--tb=short"
            ], capture_output=True, text=True, cwd=self.project_root)
            
            print(result.stdout)
            if result.stderr:
                print("STDERR:", result.stderr)
            
            if result.returncode == 0:
                print("✅ API tests passed!")
                return True
            else:
                print("❌ API tests failed!")
                return False
                
        except Exception as e:
            print(f"❌ Error running API tests: {str(e)}")
            return False
    
    def run_database_migration_test(self):
        """Test database migration"""
        print("\n🗄️  Running Database Migration Test...")
        print("="*50)
        
        try:
            # Run migration script in test mode
            result = subprocess.run([
                sys.executable,
                str(self.scripts_dir / "migrate_event_lifecycle.py")
            ], capture_output=True, text=True, cwd=self.project_root)
            
            print(result.stdout)
            if result.stderr:
                print("STDERR:", result.stderr)
            
            if result.returncode == 0:
                print("✅ Database migration test passed!")
                return True
            else:
                print("❌ Database migration test failed!")
                return False
                
        except Exception as e:
            print(f"❌ Error testing database migration: {str(e)}")
            return False
    
    def generate_test_report(self, results):
        """Generate comprehensive test report"""
        report_path = self.project_root / "test_report.md"
        
        with open(report_path, 'w') as f:
            f.write("# Event Lifecycle Implementation - Test Report\n\n")
            f.write(f"**Generated:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC\n\n")
            
            f.write("## Test Summary\n\n")
            
            passed_count = sum(1 for r in results.values() if r)
            total_count = len(results)
            
            f.write(f"- **Total Tests:** {total_count}\n")
            f.write(f"- **Passed:** {passed_count}\n")
            f.write(f"- **Failed:** {total_count - passed_count}\n")
            f.write(f"- **Success Rate:** {(passed_count/total_count)*100:.1f}%\n\n")
            
            if passed_count == total_count:
                f.write("🎉 **ALL TESTS PASSED!**\n\n")
            else:
                f.write("⚠️ **Some tests failed. Review required.**\n\n")
            
            f.write("## Detailed Results\n\n")
            
            for test_name, passed in results.items():
                status = "✅ PASSED" if passed else "❌ FAILED"
                f.write(f"- **{test_name}:** {status}\n")
            
            f.write("\n## Next Steps\n\n")
            
            if passed_count == total_count:
                f.write("1. ✅ All tests passed - implementation ready for deployment\n")
                f.write("2. 📝 Update documentation\n")
                f.write("3. 🚀 Deploy to staging environment\n")
                f.write("4. 🧪 Run user acceptance tests\n")
            else:
                f.write("1. 🔍 Review failed tests and fix issues\n")
                f.write("2. 🔄 Re-run tests after fixes\n")
                f.write("3. 📋 Update implementation plan if needed\n")
            
            f.write("\n## Coverage Report\n\n")
            f.write("HTML coverage report available at: `htmlcov/index.html`\n")
            
        print(f"\n📄 Test report generated: {report_path}")

async def main():
    """Main test runner function"""
    runner = EventLifecycleTestRunner()
    
    print("🚀 Event Lifecycle Implementation - Test Suite")
    print("="*60)
    print(f"Started at: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC")
    print("="*60)
    
    # Run all tests
    results = {}
    
    # 1. Unit Tests
    results["Unit Tests"] = runner.run_unit_tests()
    
    # 2. Integration Tests
    results["Integration Tests"] = await runner.run_integration_tests()
    
    # 3. API Tests
    results["API Tests"] = runner.run_api_tests()
    
    # 4. Database Migration Test
    results["Database Migration"] = runner.run_database_migration_test()
    
    # Generate report
    runner.generate_test_report(results)
    
    # Print final summary
    print("\n" + "="*60)
    print("FINAL TEST SUMMARY")
    print("="*60)
    
    for test_name, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{test_name}: {status}")
    
    passed_count = sum(1 for r in results.values() if r)
    total_count = len(results)
    
    print(f"\nOverall: {passed_count}/{total_count} test suites passed")
    
    if passed_count == total_count:
        print("\n🎉 ALL TEST SUITES PASSED!")
        print("✅ Event Lifecycle Implementation is ready!")
    else:
        print("\n⚠️  Some test suites failed.")
        print("🔧 Please review and fix issues before proceeding.")
    
    print("="*60)

if __name__ == "__main__":
    asyncio.run(main())
