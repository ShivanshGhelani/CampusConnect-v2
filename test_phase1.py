"""
Quick Phase 1 T# Configuration
BASE_URL = "http://localhost:8000/api/v1/testing"
HEADERS = {"Content-Type": "application/json"}ing Runner
============================

This script runs the bulk testing scenarios to validate Phase 1 attendance improvements.
Run this to check if our 85%+ accuracy target is met.

Usage:
python test_phase1.py

Requirements:
- Backend server running on localhost:8000
- All Phase 1 services implemented
"""

import requests
import json
from datetime import datetime
import sys

# Configuration
BASE_URL = "http://localhost:8000/api/v1/testing"
HEADERS = {"Content-Type": "application/json"}

def test_single_scenario():
    """Test a single scenario first"""
    print("🧪 Testing single scenario (Hackathon)...")
    
    test_data = {
        "event_name": "CodeStorm 2024 - 24 Hour Hackathon",
        "event_type": "Technical Competition", 
        "detailed_description": "24-hour coding marathon with team collaboration, mentorship sessions, and final presentations.",
        "start_datetime": "2024-01-15T09:00:00Z",
        "end_datetime": "2024-01-16T09:00:00Z",
        "venue": {"venue_name": "Innovation Lab Complex", "venue_type": "Laboratory", "capacity": 100},
        "registration_mode": "team",
        "max_team_size": 4,
        "expected_strategy": "session_based"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/strategy-detection", json=test_data, headers=HEADERS)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Single test successful!")
            print(f"   Detected: {result.get('detected_strategy')}")
            print(f"   Expected: session_based")
            print(f"   Confidence: {result.get('confidence', 0.0):.1f}")
            print(f"   Sessions: {result.get('sessions_generated', 0)}")
            return True
        else:
            print(f"❌ Single test failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Single test error: {str(e)}")
        return False

def run_bulk_tests():
    """Run all bulk testing scenarios"""
    print("\n🔄 Running bulk testing scenarios...")
    
    try:
        response = requests.post(f"{BASE_URL}/bulk-scenarios", headers=HEADERS)
        
        if response.status_code == 200:
            result = response.json()
            
            print(f"\n📊 PHASE 1 TEST RESULTS")
            print(f"=" * 50)
            print(f"Overall Accuracy: {result.get('overall_accuracy', 'N/A')}")
            print(f"Main Scenarios: {result.get('main_scenarios_accuracy', 'N/A')}")
            print(f"Edge Cases: {result.get('edge_cases_accuracy', 'N/A')}")
            print(f"Target Met: {'✅ YES' if result.get('target_met', False) else '❌ NO'}")
            print(f"Tests Passed: {result.get('correct_predictions', 0)}/{result.get('total_tests', 0)}")
            
            # Strategy breakdown
            print(f"\n📈 Strategy Accuracy Breakdown:")
            strategy_accuracy = result.get('strategy_accuracy', {})
            for strategy, accuracy in strategy_accuracy.items():
                print(f"   {strategy}: {accuracy}")
            
            # Failed scenarios
            failed = result.get('failed_scenarios', [])
            if failed:
                print(f"\n❌ Failed Scenarios ({len(failed)}):")
                for failure in failed[:5]:  # Show first 5 failures
                    scenario = failure.get('scenario', 'Unknown')
                    expected = failure.get('expected', 'N/A')
                    detected = failure.get('detected', 'N/A')
                    print(f"   • {scenario}: Expected {expected}, Got {detected}")
                
                if len(failed) > 5:
                    print(f"   ... and {len(failed) - 5} more")
            
            # Recommendations
            recommendations = result.get('recommendations', [])
            if recommendations:
                print(f"\n💡 Recommendations:")
                for rec in recommendations:
                    print(f"   {rec}")
            
            return result.get('target_met', False)
            
        else:
            print(f"❌ Bulk test failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Bulk test error: {str(e)}")
        return False

def check_server_health():
    """Check if the backend server is running"""
    try:
        response = requests.get(f"http://localhost:8000/docs", timeout=5)
        return response.status_code == 200
    except:
        return False

def main():
    """Main test runner"""
    print("🚀 Phase 1 Attendance System Testing")
    print("=" * 40)
    
    # Check server
    print("🔍 Checking server status...")
    if not check_server_health():
        print("❌ Backend server not accessible at localhost:8000")
        print("   Please start the server with: uvicorn main:app --reload --port 8000")
        sys.exit(1)
    
    print("✅ Server is running")
    
    # Test single scenario first
    if not test_single_scenario():
        print("\n❌ Single scenario test failed - checking basic functionality")
        sys.exit(1)
    
    # Run comprehensive tests
    success = run_bulk_tests()
    
    print(f"\n🎯 FINAL RESULT")
    print(f"=" * 20)
    if success:
        print("✅ Phase 1 implementation SUCCESSFUL!")
        print("   Target accuracy of 85%+ achieved")
        print("   Ready to proceed to Phase 2")
    else:
        print("❌ Phase 1 implementation needs improvement")
        print("   Review failed scenarios and adjust patterns")
        print("   Re-run tests after fixes")
    
    print(f"\nTest completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    main()
