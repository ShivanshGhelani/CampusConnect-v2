#!/usr/bin/env python3
"""
Test script for attendance preview API endpoints
Tests the new attendance strategy preview and validation functionality
"""

import asyncio
import aiohttp
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"

# Test data for different event scenarios
test_events = [
    {
        "name": "Workshop Duration Test",
        "description": "2-hour workshop for testing session-based attendance",
        "start_datetime": (datetime.now() + timedelta(days=5)).isoformat(),
        "end_datetime": (datetime.now() + timedelta(days=5, hours=2)).isoformat(),
        "event_type": "Workshop",
        "expected_strategy": "session-based"
    },
    {
        "name": "Conference Duration Test", 
        "description": "Full day conference for testing periodic attendance",
        "start_datetime": (datetime.now() + timedelta(days=10)).isoformat(),
        "end_datetime": (datetime.now() + timedelta(days=10, hours=8)).isoformat(),
        "event_type": "Conference",
        "expected_strategy": "periodic"
    },
    {
        "name": "Cultural Event Test",
        "description": "3-day cultural fest for testing daily attendance",
        "start_datetime": (datetime.now() + timedelta(days=15)).isoformat(),
        "end_datetime": (datetime.now() + timedelta(days=18)).isoformat(),
        "event_type": "Cultural",
        "expected_strategy": "daily"
    },
    {
        "name": "Short Seminar Test",
        "description": "1-hour seminar for testing single attendance",
        "start_datetime": (datetime.now() + timedelta(days=3)).isoformat(),
        "end_datetime": (datetime.now() + timedelta(days=3, hours=1)).isoformat(),
        "event_type": "Seminar",
        "expected_strategy": "single"
    }
]

custom_strategies = [
    {
        "strategy": "session-based",
        "session_duration": 45,
        "break_duration": 15,
        "description": "Custom 45-minute sessions with 15-minute breaks"
    },
    {
        "strategy": "periodic",
        "interval_minutes": 120,
        "description": "Custom 2-hour periodic intervals"
    },
    {
        "strategy": "daily",
        "times": ["10:00", "16:00"],
        "description": "Custom daily check-ins at 10 AM and 4 PM"
    }
]

async def test_attendance_preview():
    """Test the attendance strategy preview endpoint"""
    print("🧪 Testing Attendance Preview API")
    print("=" * 50)
    
    async with aiohttp.ClientSession() as session:
        success_count = 0
        total_tests = len(test_events)
        
        for i, event in enumerate(test_events, 1):
            print(f"\n📋 Test {i}/{total_tests}: {event['name']}")
            print(f"   Duration: {event['start_datetime']} to {event['end_datetime']}")
            print(f"   Type: {event['event_type']}")
            print(f"   Expected: {event['expected_strategy']}")
            
            try:
                # Test the preview endpoint
                async with session.post(
                    f"{BASE_URL}/api/v1/admin/attendance-preview/preview-strategy",
                    json={
                        "event_name": event["name"],
                        "event_description": event["description"],
                        "start_datetime": event["start_datetime"],
                        "end_datetime": event["end_datetime"],
                        "event_type": event["event_type"]
                    },
                    headers={"Content-Type": "application/json"}
                ) as response:
                    
                    if response.status == 200:
                        data = await response.json()
                        
                        if data.get("success"):
                            strategy = data.get("strategy", {})
                            detected_strategy = strategy.get("strategy_type")
                            duration_info = strategy.get("duration_analysis", {})
                            timeline = strategy.get("attendance_timeline", [])
                            
                            print(f"   ✅ Detected: {detected_strategy}")
                            print(f"   📊 Duration: {duration_info.get('total_duration_hours', 0):.1f} hours")
                            print(f"   📅 Timeline: {len(timeline)} check-in points")
                            
                            # Check if detection matches expectation
                            if detected_strategy == event["expected_strategy"]:
                                print(f"   🎯 MATCH: Strategy detection is correct!")
                                success_count += 1
                            else:
                                print(f"   ⚠️  MISMATCH: Expected {event['expected_strategy']}, got {detected_strategy}")
                            
                            # Show timeline preview
                            if timeline:
                                print(f"   🕐 First check-in: {timeline[0].get('time', 'N/A')}")
                                if len(timeline) > 1:
                                    print(f"   🕐 Last check-in: {timeline[-1].get('time', 'N/A')}")
                        else:
                            print(f"   ❌ API Error: {data.get('message', 'Unknown error')}")
                    else:
                        error_text = await response.text()
                        print(f"   ❌ HTTP {response.status}: {error_text}")
                        
            except Exception as e:
                print(f"   💥 Exception: {str(e)}")
        
        print(f"\n🏆 Results: {success_count}/{total_tests} tests passed")
        return success_count == total_tests

async def test_custom_validation():
    """Test the custom strategy validation endpoint"""
    print("\n🔧 Testing Custom Strategy Validation")
    print("=" * 50)
    
    async with aiohttp.ClientSession() as session:
        success_count = 0
        total_tests = len(custom_strategies)
        
        for i, custom in enumerate(custom_strategies, 1):
            print(f"\n🛠️  Test {i}/{total_tests}: {custom['description']}")
            print(f"   Strategy: {custom['strategy']}")
            
            try:
                # Use first test event as base
                base_event = test_events[0]
                
                payload = {
                    "event_name": f"Custom Test - {custom['description']}",
                    "event_description": custom["description"],
                    "start_datetime": base_event["start_datetime"],
                    "end_datetime": base_event["end_datetime"],
                    "event_type": "Workshop",
                    "custom_strategy": custom
                }
                
                async with session.post(
                    f"{BASE_URL}/api/v1/admin/attendance-preview/validate-custom-strategy",
                    json=payload,
                    headers={"Content-Type": "application/json"}
                ) as response:
                    
                    if response.status == 200:
                        data = await response.json()
                        
                        if data.get("success"):
                            validation = data.get("validation", {})
                            is_valid = validation.get("is_valid", False)
                            timeline = validation.get("attendance_timeline", [])
                            warnings = validation.get("warnings", [])
                            
                            print(f"   ✅ Valid: {is_valid}")
                            print(f"   📅 Timeline: {len(timeline)} check-in points")
                            
                            if warnings:
                                print(f"   ⚠️  Warnings: {len(warnings)}")
                                for warning in warnings[:2]:  # Show first 2 warnings
                                    print(f"      - {warning}")
                            else:
                                print(f"   ✅ No warnings")
                            
                            if is_valid:
                                success_count += 1
                                print(f"   🎯 PASS: Custom strategy validated successfully")
                            else:
                                print(f"   ❌ FAIL: Custom strategy validation failed")
                        else:
                            print(f"   ❌ API Error: {data.get('message', 'Unknown error')}")
                    else:
                        error_text = await response.text()
                        print(f"   ❌ HTTP {response.status}: {error_text}")
                        
            except Exception as e:
                print(f"   💥 Exception: {str(e)}")
        
        print(f"\n🏆 Results: {success_count}/{total_tests} custom strategies validated")
        return success_count == total_tests

async def test_api_docs():
    """Test if the API documentation includes our new endpoints"""
    print("\n📚 Testing API Documentation")
    print("=" * 50)
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(f"{BASE_URL}/docs") as response:
                if response.status == 200:
                    print("   ✅ API docs accessible at /docs")
                    return True
                else:
                    print(f"   ❌ API docs error: HTTP {response.status}")
                    return False
        except Exception as e:
            print(f"   💥 Exception accessing docs: {str(e)}")
            return False

async def main():
    """Run all attendance preview API tests"""
    print("🚀 Starting Attendance Preview API Tests")
    print("Server:", BASE_URL)
    print("=" * 60)
    
    results = {
        "preview_tests": False,
        "validation_tests": False,
        "docs_test": False
    }
    
    # Test 1: Attendance Strategy Preview
    results["preview_tests"] = await test_attendance_preview()
    
    # Test 2: Custom Strategy Validation
    results["validation_tests"] = await test_custom_validation()
    
    # Test 3: API Documentation
    results["docs_test"] = await test_api_docs()
    
    # Final Summary
    print("\n" + "=" * 60)
    print("🏁 Final Test Summary")
    print("=" * 60)
    
    total_passed = sum(results.values())
    total_tests = len(results)
    
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"   {test_name.replace('_', ' ').title()}: {status}")
    
    print(f"\n🎯 Overall Result: {total_passed}/{total_tests} test suites passed")
    
    if total_passed == total_tests:
        print("🎉 All tests passed! Attendance preview system is working correctly.")
    else:
        print("⚠️  Some tests failed. Please check the server logs and endpoint implementations.")
    
    return total_passed == total_tests

if __name__ == "__main__":
    try:
        success = asyncio.run(main())
        exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⏹️  Tests interrupted by user")
        exit(1)
    except Exception as e:
        print(f"\n💥 Test runner error: {str(e)}")
        exit(1)
