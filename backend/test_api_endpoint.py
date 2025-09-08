#!/usr/bin/env python3
"""
Simple test to verify the API endpoint with image upload functionality
"""

import requests
import os
from pathlib import Path

def test_image_upload_api():
    """Test the generate_event_report_with_uploads endpoint"""
    
    # API endpoint
    url = "http://localhost:8000/api/v1/admin/export/generate-event-report-with-uploads"
    
    # Test data
    data = {
        "event_id": "DVCCOSTU2025",  # Event that has images
        "include_personal_data": "true",
        "include_images": "true"
    }
    
    # Check if we have a test image
    test_image_path = "S:/Projects/ClgCerti/CampusConnect/backend/static/favicon.ico"
    
    files = {}
    if os.path.exists(test_image_path):
        files = {
            "images": ("test_image.ico", open(test_image_path, "rb"), "image/x-icon")
        }
    
    try:
        print("Testing API endpoint with image upload...")
        response = requests.post(url, data=data, files=files)
        
        if files:
            files["images"][1].close()  # Close the file
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {response.headers}")
        
        if response.status_code == 200:
            print("✅ API endpoint working correctly!")
            # Check if response contains HTML
            if 'html' in response.headers.get('content-type', '').lower():
                print("✅ HTML report generated successfully")
            else:
                print("✅ JSON response received")
                try:
                    json_response = response.json()
                    if 'success' in json_response:
                        print(f"✅ Success: {json_response['success']}")
                    if 'html_content' in json_response:
                        print("✅ HTML content included in response")
                except:
                    print("Response is not JSON")
        else:
            print(f"❌ API Error: {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Is the FastAPI server running?")
        print("To start server: cd backend && python main.py")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_image_upload_api()
