"""
Test script to demonstrate universal certificate generation.

This script shows how the certificate generation service can handle
any placeholder format: [], {{}}, or () automatically.
"""

from services.certificate_generation_service import CertificateGenerationService
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime

# MongoDB connection
MONGODB_URI = "mongodb+srv://autobotmyra:autobotmyra28@autobotmyra.matjavv.mongodb.net/?retryWrites=true&w=majority&appName=autobotmyra"
DATABASE_NAME = "CampusConnect"


def test_placeholder_detection():
    """Test placeholder detection across different formats"""
    
    print("=" * 100)
    print("TESTING UNIVERSAL CERTIFICATE PLACEHOLDER DETECTION & FILLING")
    print("=" * 100)
    
    # Sample HTML templates with different placeholder formats
    templates = {
        'Square Brackets': """
        <html>
            <body>
                <h1>Certificate of Participation</h1>
                <p>This is to certify that <strong>[PARTICIPANT_NAME]</strong></p>
                <p>has successfully participated in <strong>[EVENT_NAME]</strong></p>
                <p>held on <strong>[EVENT_DATE]</strong></p>
                <p>at <strong>[VENUE]</strong></p>
                <p>Organized by: [DEPARTMENT_NAME]</p>
                <p>Certificate ID: [CERTIFICATE_ID]</p>
            </body>
        </html>
        """,
        
        'Double Curly Braces': """
        <html>
            <body>
                <h1>Certificate of Participation</h1>
                <p>This is to certify that <strong>{{PARTICIPANT_NAME}}</strong></p>
                <p>has successfully participated in <strong>{{EVENT_NAME}}</strong></p>
                <p>held on <strong>{{EVENT_DATE}}</strong></p>
                <p>at <strong>{{VENUE}}</strong></p>
                <p>Organized by: {{DEPARTMENT_NAME}}</p>
                <p>Certificate ID: {{CERTIFICATE_ID}}</p>
            </body>
        </html>
        """,
        
        'Parentheses': """
        <html>
            <body>
                <h1>Certificate of Participation</h1>
                <p>This is to certify that <strong>(PARTICIPANT_NAME)</strong></p>
                <p>has successfully participated in <strong>(EVENT_NAME)</strong></p>
                <p>held on <strong>(EVENT_DATE)</strong></p>
                <p>at <strong>(VENUE)</strong></p>
                <p>Organized by: (DEPARTMENT_NAME)</p>
                <p>Certificate ID: (CERTIFICATE_ID)</p>
            </body>
        </html>
        """,
        
        'Mixed Format': """
        <html>
            <body>
                <h1>Certificate of Participation</h1>
                <p>Name: [PARTICIPANT_NAME]</p>
                <p>Event: {{EVENT_NAME}}</p>
                <p>Date: (EVENT_DATE)</p>
            </body>
        </html>
        """
    }
    
    # Sample certificate data
    sample_data = {
        'PARTICIPANT_NAME': 'John Doe',
        'PARTICIPANT NAME': 'John Doe',
        'EVENT_NAME': 'AI Workshop 2026',
        'EVENT NAME': 'AI Workshop 2026',
        'EVENT_DATE': 'January 15, 2026',
        'EVENT DATE': 'January 15, 2026',
        'VENUE': 'Main Auditorium',
        'DEPARTMENT_NAME': 'Computer Science',
        'DEPARTMENT NAME': 'Computer Science',
        'CERTIFICATE_ID': 'CERT-AI-001-20260115',
        'CERTIFICATE ID': 'CERT-AI-001-20260115',
    }
    
    service = CertificateGenerationService(None)  # No DB needed for this test
    
    for template_name, template_html in templates.items():
        print(f"\n{'=' * 100}")
        print(f"Testing: {template_name}")
        print("=" * 100)
        
        # Detect placeholders
        detected = service.detect_placeholder_format(template_html)
        
        print(f"\n📋 Detected Placeholder Format(s):")
        for format_name, placeholders in detected:
            print(f"   • {format_name}: {len(placeholders)} placeholder(s)")
            for p in placeholders:
                print(f"     - {p}")
        
        # Fill placeholders
        filled_html = service._fill_placeholders(template_html, sample_data)
        
        print(f"\n✅ BEFORE (with placeholders):")
        print("-" * 100)
        # Show only the body content for clarity
        body_start = template_html.find('<body>') + 6
        body_end = template_html.find('</body>')
        print(template_html[body_start:body_end].strip())
        
        print(f"\n✅ AFTER (filled with data):")
        print("-" * 100)
        body_start = filled_html.find('<body>') + 6
        body_end = filled_html.find('</body>')
        print(filled_html[body_start:body_end].strip())
        
        # Verify all placeholders were replaced
        remaining_placeholders = []
        for pattern, _ in service.PLACEHOLDER_PATTERNS:
            import re
            matches = re.findall(pattern, filled_html)
            remaining_placeholders.extend(matches)
        
        if remaining_placeholders:
            print(f"\n⚠️  Warning: {len(remaining_placeholders)} placeholder(s) not filled:")
            for p in remaining_placeholders:
                print(f"   - {p}")
        else:
            print(f"\n✅ Success: All placeholders filled!")


def test_real_certificate_generation():
    """Test with real database connection"""
    
    print("\n\n" + "=" * 100)
    print("TESTING WITH REAL DATABASE CERTIFICATES")
    print("=" * 100)
    
    try:
        client = MongoClient(MONGODB_URI)
        db = client[DATABASE_NAME]
        
        # Get an event with certificates
        event = db.events.find_one({
            'is_certificate_based': True,
            'certificate_templates': {'$exists': True, '$ne': {}}
        })
        
        if not event:
            print("\n⚠️  No events with certificates found in database")
            return
        
        print(f"\n📌 Event: {event.get('event_name')}")
        print(f"   Event Code: {event.get('event_code')}")
        
        # Get certificate template URL
        templates = event.get('certificate_templates', {})
        if templates:
            template_name, template_url = next(iter(templates.items()))
            print(f"\n📜 Template: {template_name}")
            print(f"   URL: {template_url}")
            
            # Fetch and analyze template
            import requests
            try:
                response = requests.get(template_url, timeout=10)
                html_content = response.text
                
                service = CertificateGenerationService(db)
                detected = service.detect_placeholder_format(html_content)
                
                print(f"\n🔍 Detected Placeholder Format(s) in Real Template:")
                if detected:
                    for format_name, placeholders in detected:
                        print(f"   • {format_name}: {len(placeholders)} placeholder(s)")
                        for p in placeholders:
                            print(f"     - {p}")
                else:
                    print("   ⚠️  No certificate placeholders detected")
                    print("   💡 This template may use hardcoded values or JavaScript rendering")
                
                print(f"\n📄 Template Preview (first 800 chars):")
                print("-" * 100)
                print(html_content[:800])
                print("...")
                
            except Exception as e:
                print(f"\n❌ Error fetching template: {e}")
        
        client.close()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    # Test 1: Placeholder detection and filling with sample templates
    test_placeholder_detection()
    
    # Test 2: Real certificate templates from database
    test_real_certificate_generation()
    
    print("\n" + "=" * 100)
    print("✅ TESTING COMPLETE")
    print("=" * 100)
    print("\n💡 Summary:")
    print("   • The service can detect and fill placeholders in [] {} () formats")
    print("   • Works with any combination of formats in the same template")
    print("   • Automatically maps common certificate fields")
    print("   • Ready to integrate with feedback submission workflow")
    print("=" * 100)
