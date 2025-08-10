"""
Password Reset API Test Script
Tests both student and faculty password reset endpoints
"""
import requests
import json

# Base URL for your API
BASE_URL = "http://localhost:8000"

def test_student_password_reset():
    """Test student password reset endpoint"""
    print("🧪 Testing Student Password Reset...")
    
    url = f"{BASE_URL}/api/v1/auth/forgot-password/student"
    data = {
        "enrollment_no": "22BEIT30043",
        "email": "shivansh_22043@ldrp.ac.in"
    }
    
    try:
        response = requests.post(url, json=data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            print("✅ Student password reset working correctly!")
        else:
            print("❌ Student password reset failed!")
            
    except Exception as e:
        print(f"❌ Error testing student reset: {e}")

def test_faculty_password_reset():
    """Test faculty password reset endpoint"""
    print("\n🧪 Testing Faculty Password Reset...")
    
    url = f"{BASE_URL}/api/v1/auth/forgot-password/faculty"
    data = {
        "employee_id": "EMP002",
        "email": "nilamthakkar_ce@ldrp.ac.in"
    }
    
    try:
        response = requests.post(url, json=data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            print("✅ Faculty password reset working correctly!")
        else:
            print("❌ Faculty password reset failed!")
            
    except Exception as e:
        print(f"❌ Error testing faculty reset: {e}")

def test_invalid_credentials():
    """Test with invalid credentials"""
    print("\n🧪 Testing Invalid Credentials...")
    
    # Test invalid student
    url = f"{BASE_URL}/api/v1/auth/forgot-password/student"
    data = {
        "enrollment_no": "INVALID123",
        "email": "invalid@example.com"
    }
    
    try:
        response = requests.post(url, json=data)
        print(f"Invalid Student - Status: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    print("🔐 CampusConnect Password Reset API Test")
    print("=" * 50)
    
    test_student_password_reset()
    test_faculty_password_reset()
    test_invalid_credentials()
    
    print("\n✨ Testing Complete!")
    print("\nNote: Check your email inbox for reset links if tests pass!")
