#!/usr/bin/env python3
"""
Test runner script for CampusConnect Backend
Provides various test execution options and reporting
"""
import os
import sys
import subprocess
import argparse
from pathlib import Path


def run_command(command, description=""):
    """Run a command and handle errors."""
    print(f"\n{'='*60}")
    if description:
        print(f"Running: {description}")
    print(f"Command: {' '.join(command)}")
    print(f"{'='*60}")
    
    try:
        result = subprocess.run(command, check=True, text=True, capture_output=True)
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {e}")
        print(f"STDOUT: {e.stdout}")
        print(f"STDERR: {e.stderr}")
        return False


def install_test_dependencies():
    """Install test dependencies."""
    print("Installing test dependencies...")
    return run_command([
        sys.executable, "-m", "pip", "install", "-r", "test-requirements.txt"
    ], "Installing test dependencies")


def run_unit_tests():
    """Run unit tests only."""
    return run_command([
        "python", "-m", "pytest", "tests/unit/", "-v", "--tb=short"
    ], "Running unit tests")


def run_integration_tests():
    """Run integration tests only."""
    return run_command([
        "python", "-m", "pytest", "tests/integration/", "-v", "--tb=short"
    ], "Running integration tests")


def run_api_tests():
    """Run API tests only."""
    return run_command([
        "python", "-m", "pytest", "tests/api/", "-v", "--tb=short"
    ], "Running API tests")


def run_all_tests():
    """Run all tests with coverage."""
    return run_command([
        "python", "-m", "pytest", "tests/", "-v", "--tb=short", 
        "--cov=.", "--cov-report=term-missing", "--cov-report=html"
    ], "Running all tests with coverage")


def run_fast_tests():
    """Run tests without slow ones."""
    return run_command([
        "python", "-m", "pytest", "tests/", "-v", "--tb=short", "-m", "not slow"
    ], "Running fast tests only")


def run_specific_test(test_path):
    """Run a specific test file or function."""
    return run_command([
        "python", "-m", "pytest", test_path, "-v", "--tb=short"
    ], f"Running specific test: {test_path}")


def lint_code():
    """Run code linting."""
    success = True
    
    # Check if linting tools are available
    try:
        subprocess.run(["python", "-m", "black", "--version"], check=True, capture_output=True)
        subprocess.run(["python", "-m", "flake8", "--version"], check=True, capture_output=True)
        subprocess.run(["python", "-m", "isort", "--version"], check=True, capture_output=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("Linting tools not installed. Install with: pip install black flake8 isort")
        return False
    
    # Run black (code formatting check)
    print("\nChecking code formatting with black...")
    success &= run_command([
        "python", "-m", "black", "--check", "--diff", "."
    ], "Checking code formatting")
    
    # Run flake8 (style guide enforcement)
    print("\nChecking style guide with flake8...")
    success &= run_command([
        "python", "-m", "flake8", ".", "--exclude=campusconnect,temp,static,templates,logs"
    ], "Checking style guide")
    
    # Run isort (import sorting check)
    print("\nChecking import sorting with isort...")
    success &= run_command([
        "python", "-m", "isort", "--check-only", "--diff", "."
    ], "Checking import sorting")
    
    return success


def generate_test_report():
    """Generate comprehensive test report."""
    print("Generating comprehensive test report...")
    
    # Run tests with detailed reporting
    success = run_command([
        "python", "-m", "pytest", "tests/", 
        "--cov=.", 
        "--cov-report=html:tests/reports/coverage_html",
        "--cov-report=xml:tests/reports/coverage.xml",
        "--cov-report=term-missing",
        "--junit-xml=tests/reports/junit.xml",
        "-v"
    ], "Generating test report")
    
    if success:
        print("\nTest reports generated:")
        print("- HTML Coverage: tests/reports/coverage_html/index.html")
        print("- XML Coverage: tests/reports/coverage.xml")
        print("- JUnit XML: tests/reports/junit.xml")
    
    return success


def setup_test_environment():
    """Set up test environment."""
    print("Setting up test environment...")
    
    # Create necessary directories
    os.makedirs("tests/reports", exist_ok=True)
    os.makedirs("logs", exist_ok=True)
    
    # Set environment variables
    os.environ["ENVIRONMENT"] = "test"
    os.environ["MONGODB_URL"] = "mongodb://localhost:27017/campusconnect_test"
    
    print("Test environment configured:")
    print(f"- ENVIRONMENT: {os.environ.get('ENVIRONMENT')}")
    print(f"- MONGODB_URL: {os.environ.get('MONGODB_URL')}")
    
    return True


def main():
    """Main test runner function."""
    parser = argparse.ArgumentParser(description="CampusConnect Backend Test Runner")
    parser.add_argument("--install-deps", action="store_true", 
                       help="Install test dependencies")
    parser.add_argument("--unit", action="store_true", 
                       help="Run unit tests only")
    parser.add_argument("--integration", action="store_true", 
                       help="Run integration tests only")
    parser.add_argument("--api", action="store_true", 
                       help="Run API tests only")
    parser.add_argument("--all", action="store_true", 
                       help="Run all tests with coverage")
    parser.add_argument("--fast", action="store_true", 
                       help="Run fast tests only (exclude slow tests)")
    parser.add_argument("--lint", action="store_true", 
                       help="Run code linting")
    parser.add_argument("--report", action="store_true", 
                       help="Generate comprehensive test report")
    parser.add_argument("--test", type=str, 
                       help="Run specific test file or function")
    parser.add_argument("--setup", action="store_true", 
                       help="Set up test environment")
    
    args = parser.parse_args()
    
    # Change to backend directory
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)
    
    success = True
    
    # Set up test environment first
    if not setup_test_environment():
        print("Failed to set up test environment")
        sys.exit(1)
    
    # Install dependencies if requested
    if args.install_deps:
        if not install_test_dependencies():
            print("Failed to install test dependencies")
            sys.exit(1)
    
    # Run specific commands based on arguments
    if args.unit:
        success &= run_unit_tests()
    elif args.integration:
        success &= run_integration_tests()
    elif args.api:
        success &= run_api_tests()
    elif args.all:
        success &= run_all_tests()
    elif args.fast:
        success &= run_fast_tests()
    elif args.lint:
        success &= lint_code()
    elif args.report:
        success &= generate_test_report()
    elif args.test:
        success &= run_specific_test(args.test)
    elif args.setup:
        print("Test environment setup complete!")
    else:
        # Default: run all tests
        print("No specific test type specified. Running all tests...")
        success &= run_all_tests()
    
    # Exit with appropriate code
    if success:
        print("\n✅ All operations completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Some operations failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()
