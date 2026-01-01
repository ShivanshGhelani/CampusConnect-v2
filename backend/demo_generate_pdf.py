"""
Demo: Generate a real certificate PDF

This script demonstrates the complete certificate generation workflow:
1. Fetch event and student data from database
2. Generate certificate with filled placeholders
3. Create PDF file
4. Save to disk
"""

from services.certificate_generation_service import CertificateGenerationService
from pymongo import MongoClient
from bson import ObjectId
import os

# MongoDB connection
MONGODB_URI = "mongodb+srv://autobotmyra:autobotmyra28@autobotmyra.matjavv.mongodb.net/?retryWrites=true&w=majority&appName=autobotmyra"
DATABASE_NAME = "CampusConnect"

# Output directory for PDFs
OUTPUT_DIR = "generated_certificates"


def demo_certificate_generation():
    """Generate a demo certificate PDF"""
    
    print("=" * 100)
    print("CERTIFICATE PDF GENERATION DEMO")
    print("=" * 100)
    
    try:
        # Connect to database
        client = MongoClient(MONGODB_URI)
        db = client[DATABASE_NAME]
        
        print("\n✅ Connected to MongoDB")
        
        # Get an event with certificates
        event = db.events.find_one({
            'is_certificate_based': True,
            'certificate_templates': {'$exists': True, '$ne': {}}
        })
        
        if not event:
            print("\n❌ No events with certificates found")
            return
        
        event_id = str(event['_id'])
        event_name = event.get('event_name', 'Unknown Event')
        
        print(f"\n📌 Event Selected: {event_name}")
        print(f"   Event ID: {event_id}")
        
        # Get a registered student for this event
        registration = db.registrations.find_one({
            'event_id': ObjectId(event_id),
            'registration_status': 'Accepted'
        })
        
        if not registration:
            print("\n❌ No accepted registrations found for this event")
            print("   Creating mock student data for demo...")
            
            # Create mock student for demo
            mock_student = {
                'student_name': 'John Doe',
                'email': 'john.doe@example.com',
                'college': 'Demo College',
                'department': 'Computer Science'
            }
            student_result = db.students.insert_one(mock_student)
            student_id = str(student_result.inserted_id)
            
            # Create mock registration
            mock_registration = {
                'event_id': ObjectId(event_id),
                'student_id': ObjectId(student_id),
                'registration_status': 'Accepted'
            }
            registration_result = db.registrations.insert_one(mock_registration)
            registration_id = str(registration_result.inserted_id)
            
            print(f"   ✅ Created mock student: {mock_student['student_name']}")
        else:
            student_id = str(registration['student_id'])
            registration_id = str(registration['_id'])
            
            student = db.students.find_one({'_id': ObjectId(student_id)})
            if student:
                print(f"\n👤 Student: {student.get('student_name', 'Unknown')}")
                print(f"   Student ID: {student_id}")
        
        print(f"\n📋 Registration ID: {registration_id}")
        
        # Initialize certificate service
        service = CertificateGenerationService(db)
        
        print("\n🔄 Generating certificate...")
        
        # Generate certificate
        result = service.generate_certificate_for_participant(
            event_id=event_id,
            student_id=student_id,
            registration_id=registration_id
        )
        
        if not result['success']:
            print(f"\n❌ Certificate generation failed: {result.get('error')}")
            return
        
        print("\n✅ Certificate generated successfully!")
        print(f"   Certificate ID: {result['certificate_id']}")
        print(f"   Database ID: {result['database_id']}")
        print(f"   Participant: {result['participant_name']}")
        print(f"   Event: {result['event_name']}")
        print(f"   Template: {result['template_name']}")
        
        if result.get('pdf_available'):
            print(f"\n📄 PDF Generated:")
            print(f"   Size: {result['pdf_size_kb']:.2f} KB")
            
            # Create output directory
            os.makedirs(OUTPUT_DIR, exist_ok=True)
            
            # Save PDF to file
            certificate_id = result['certificate_id']
            pdf_filename = f"{certificate_id}.pdf"
            pdf_path = os.path.join(OUTPUT_DIR, pdf_filename)
            
            print(f"\n💾 Saving PDF to: {pdf_path}")
            
            success = service.save_certificate_pdf(certificate_id, pdf_path)
            
            if success:
                print(f"   ✅ PDF saved successfully!")
                print(f"   📂 Location: {os.path.abspath(pdf_path)}")
                
                # Show file size
                file_size = os.path.getsize(pdf_path) / 1024
                print(f"   📊 File size: {file_size:.2f} KB")
            else:
                print(f"   ❌ Failed to save PDF")
        else:
            print(f"\n⚠️  PDF generation not available")
            print(f"   Install WeasyPrint: pip install weasyprint")
            print(f"\n   HTML certificate available instead:")
            print(f"   Length: {len(result.get('filled_html', ''))} characters")
        
        client.close()
        
        print("\n" + "=" * 100)
        print("✅ DEMO COMPLETE")
        print("=" * 100)
        
        if result.get('pdf_available'):
            print(f"\n💡 Your certificate PDF is ready!")
            print(f"   Open: {os.path.abspath(pdf_path)}")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    # Check if WeasyPrint is installed
    try:
        import weasyprint
        print("✅ WeasyPrint is installed - PDF generation available\n")
    except ImportError:
        print("⚠️  WeasyPrint NOT installed - PDF generation will not work")
        print("   Install with: pip install weasyprint\n")
    
    demo_certificate_generation()
