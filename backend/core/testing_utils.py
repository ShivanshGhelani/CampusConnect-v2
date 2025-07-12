"""
Testing Utilities Module

Provides utilities to access and run tests from anywhere in the project.
Import this module to get access to testing functions.

Usage:
    from utils.testing_utils import run_test, list_tests, get_test_path
    
    # List all available tests
    tests = list_tests()
    
    # Get path to a specific test
    test_path = get_test_path("quick_email_test.py")
    
    # Run a test programmatically
    success = run_test("test_all_email_templates_fixed.py")
"""

import os
import sys
import subprocess
import asyncio
from pathlib import Path
from typing import List, Optional, Union

# Get project paths
PROJECT_ROOT = Path(__file__).parent.parent.absolute()
TESTING_DIR = PROJECT_ROOT / "scripts" / "testing"

def get_project_root() -> Path:
    """Get the project root directory"""
    return PROJECT_ROOT

def get_testing_dir() -> Path:
    """Get the testing directory path"""
    return TESTING_DIR

def list_tests() -> List[str]:
    """
    List all available test files in the testing directory
    
    Returns:
        List of test filenames
    """
    if not TESTING_DIR.exists():
        return []
    
    test_files = []
    for file in TESTING_DIR.glob("*.py"):
        if file.name.startswith(("test_", "quick_")) and file.name != "__init__.py":
            test_files.append(file.name)
    
    return sorted(test_files)

def get_test_path(test_name: str) -> Path:
    """
    Get the full path to a test file
    
    Args:
        test_name: Name of the test file (with or without .py extension)
        
    Returns:
        Path object pointing to the test file
    """
    if not test_name.endswith('.py'):
        test_name += '.py'
    
    return TESTING_DIR / test_name

def test_exists(test_name: str) -> bool:
    """
    Check if a test file exists
    
    Args:
        test_name: Name of the test file
        
    Returns:
        True if test exists, False otherwise
    """
    return get_test_path(test_name).exists()

def run_test(test_name: str, capture_output: bool = False) -> Union[bool, tuple]:
    """
    Run a specific test file
    
    Args:
        test_name: Name of the test file to run
        capture_output: If True, return (success, stdout, stderr) tuple
        
    Returns:
        If capture_output=False: Boolean indicating success
        If capture_output=True: Tuple of (success, stdout, stderr)
    """
    test_path = get_test_path(test_name)
    
    if not test_path.exists():
        if capture_output:
            return False, "", f"Test file '{test_name}' not found"
        else:
            print(f"❌ Test file '{test_name}' not found in {TESTING_DIR}")
            return False
    
    # Change to project root directory
    original_cwd = os.getcwd()
    os.chdir(PROJECT_ROOT)
    
    try:
        if capture_output:
            result = subprocess.run([sys.executable, str(test_path)], 
                                  capture_output=True, text=True, cwd=PROJECT_ROOT)
            success = result.returncode == 0
            return success, result.stdout, result.stderr
        else:
            print(f"🚀 Running test: {test_name}")
            print(f"📁 Location: {test_path}")
            print("=" * 60)
            
            result = subprocess.run([sys.executable, str(test_path)], cwd=PROJECT_ROOT)
            success = result.returncode == 0
            
            if success:
                print("\n✅ Test completed successfully!")
            else:
                print(f"\n❌ Test failed with exit code: {result.returncode}")
            
            return success
            
    except Exception as e:
        if capture_output:
            return False, "", f"Error running test: {str(e)}"
        else:
            print(f"💥 Error running test: {str(e)}")
            return False
    finally:
        os.chdir(original_cwd)

async def run_test_async(test_name: str) -> bool:
    """
    Run a test asynchronously
    
    Args:
        test_name: Name of the test file to run
        
    Returns:
        Boolean indicating success
    """
    test_path = get_test_path(test_name)
    
    if not test_path.exists():
        print(f"❌ Test file '{test_name}' not found in {TESTING_DIR}")
        return False
    
    try:
        print(f"🚀 Running test async: {test_name}")
        
        # Run the test asynchronously
        process = await asyncio.create_subprocess_exec(
            sys.executable, str(test_path),
            cwd=PROJECT_ROOT,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode == 0:
            print("✅ Test completed successfully!")
            if stdout:
                print(stdout.decode())
            return True
        else:
            print(f"❌ Test failed with exit code: {process.returncode}")
            if stderr:
                print(stderr.decode())
            return False
            
    except Exception as e:
        print(f"💥 Error running async test: {str(e)}")
        return False

def get_tests_by_category() -> dict:
    """
    Get tests organized by category
    
    Returns:
        Dictionary with categories as keys and test lists as values
    """
    tests = list_tests()
    
    categories = {
        "email": [],
        "team": [],
        "registration": [],
        "certificate": [],
        "general": []
    }
    
    for test in tests:
        test_lower = test.lower()
        if "email" in test_lower:
            categories["email"].append(test)
        elif "team" in test_lower:
            categories["team"].append(test)
        elif "registration" in test_lower or "register" in test_lower:
            categories["registration"].append(test)
        elif "cert" in test_lower:
            categories["certificate"].append(test)
        else:
            categories["general"].append(test)
    
    # Remove empty categories
    return {k: v for k, v in categories.items() if v}

def print_test_menu():
    """Print a formatted menu of available tests"""
    print("📋 Available Tests - UCG Event Management System")
    print("=" * 60)
    
    categories = get_tests_by_category()
    
    for category, tests in categories.items():
        print(f"\n{category.upper()} TESTS:")
        for i, test in enumerate(tests, 1):
            print(f"  {i:2d}. {test}")
    
    total_tests = sum(len(tests) for tests in categories.values())
    print(f"\n📊 Total: {total_tests} test files available")
    print("\nUsage examples:")
    print("  from utils.testing_utils import run_test")
    print("  run_test('quick_email_test.py')")
    print("  python run_test.py quick_email_test.py")

# Convenience function for interactive use
def interactive_test_runner():
    """Interactive test runner for console use"""
    tests = list_tests()
    
    if not tests:
        print("❌ No test files found in scripts/testing/")
        return
    
    print_test_menu()
    
    while True:
        try:
            choice = input("\nEnter test name (or 'quit' to exit): ").strip()
            
            if choice.lower() in ['quit', 'exit', 'q']:
                break
                
            if choice in tests:
                run_test(choice)
            else:
                print(f"❌ Test '{choice}' not found. Available tests:")
                for test in tests[:5]:  # Show first 5
                    print(f"  📝 {test}")
                if len(tests) > 5:
                    print(f"  ... and {len(tests) - 5} more")
                    
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye!")
            break
