#!/usr/bin/env python3
"""
Simple test script to verify venue management API endpoints
"""

import requests
import json
from datetime import datetime, timedelta

# Base URL for the API
BASE_URL = "http://localhost:8000"  # Adjust if your FastAPI server runs on a different port

def test_venue_endpoints():
    print("🧪 Testing Venue Management API Endpoints")
    print("=" * 50)
    
    # Test 1: Get all venues (should return empty list initially)
    print("\n1. Testing GET /api/v1/admin/venues")
    try:
        response = requests.get(f"{BASE_URL}/api/v1/admin/venues")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test 2: Add a new venue
    print("\n2. Testing POST /api/v1/admin/venues")
    new_venue = {
        "name": "Test Auditorium",
        "location": "Main Building, Ground Floor",
        "capacity": 200,
        "description": "Large auditorium with modern AV equipment",
        "contactPersonName": "John Doe",
        "contactPersonEmail": "john.doe@example.com",
        "contactPersonPhone": "+1-234-567-8900",
        "facilities": ["Projector", "Sound System", "Air Conditioning", "Wi-Fi"],
        "accessibility": ["Wheelchair Accessible", "Elevator Access"],
        "equipmentAvailable": ["Microphones", "Speakers", "Laptop", "Clicker"]
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/v1/admin/venues", 
                               json=new_venue,
                               headers={"Content-Type": "application/json"})
        print(f"Status: {response.status_code}")
        if response.status_code == 201:
            venue_data = response.json()
            venue_id = venue_data["venue"]["id"]
            print(f"Created venue with ID: {venue_id}")
            print(f"Response: {json.dumps(venue_data, indent=2)}")
        else:
            print(f"Error: {response.text}")
            venue_id = None
    except Exception as e:
        print(f"Error: {e}")
        venue_id = None
    
    # Test 3: Get venue statistics
    print("\n3. Testing GET /api/v1/admin/venues/statistics")
    try:
        response = requests.get(f"{BASE_URL}/api/v1/admin/venues/statistics")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test 4: Book the venue (if we created one)
    if venue_id:
        print(f"\n4. Testing POST /api/v1/admin/venues/{venue_id}/book")
        booking_data = {
            "eventName": "Test Event",
            "organizerName": "Jane Smith",
            "organizerEmail": "jane.smith@example.com",
            "startTime": "10:00",
            "endTime": "12:00",
            "date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
            "attendees": 50,
            "purpose": "Testing venue booking functionality"
        }
        
        try:
            response = requests.post(f"{BASE_URL}/api/v1/admin/venues/{venue_id}/book",
                                   json=booking_data,
                                   headers={"Content-Type": "application/json"})
            print(f"Status: {response.status_code}")
            if response.status_code == 201:
                data = response.json()
                print(f"Response: {json.dumps(data, indent=2)}")
            else:
                print(f"Error: {response.text}")
        except Exception as e:
            print(f"Error: {e}")
        
        # Test 5: Check venue availability
        print(f"\n5. Testing GET /api/v1/admin/venues/{venue_id}/availability")
        try:
            test_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
            response = requests.get(f"{BASE_URL}/api/v1/admin/venues/{venue_id}/availability?date={test_date}")
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"Response: {json.dumps(data, indent=2)}")
            else:
                print(f"Error: {response.text}")
        except Exception as e:
            print(f"Error: {e}")
    
    print("\n" + "=" * 50)
    print("✅ Test completed!")
    print("\nNote: Make sure your FastAPI server is running on the specified port")
    print("You can start it with: python -m uvicorn backend.main:app --reload")

if __name__ == "__main__":
    test_venue_endpoints()
