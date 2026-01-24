"""
Universal Certificate Generation Service

This service handles automatic certificate generation after feedback submission.
It supports multiple placeholder formats: [], {{}}, and () to ensure compatibility
with any certificate template design.
"""

import re
import requests
import io
import base64
from datetime import datetime
import pytz
from typing import Dict, Optional, List, Tuple
from bson import ObjectId

# PDF generation imports
try:
    from weasyprint import HTML, CSS
    PDF_LIBRARY = 'weasyprint'
except ImportError:
    PDF_LIBRARY = None
    print("⚠️  WeasyPrint not installed. PDF generation will be disabled.")
    print("   Install with: pip install weasyprint")


class CertificateGenerationService:
    """
    Universal certificate autofill service that works with any placeholder format.
    
    Supported placeholder formats:
    - [PARTICIPANT_NAME] - Square brackets
    - {{PARTICIPANT_NAME}} - Double curly braces
    - (PARTICIPANT_NAME) - Parentheses
    """
    
    # All supported placeholder patterns
    PLACEHOLDER_PATTERNS = [
        (r'\[([A-Z_\s]+)\]', lambda x: f'[{x}]'),           # [PLACEHOLDER]
        (r'\{\{([A-Z_\s]+)\}\}', lambda x: f'{{{{{x}}}}}'),  # {{PLACEHOLDER}}
        (r'\(([A-Z_\s]+)\)', lambda x: f'({x})'),            # (PLACEHOLDER)
    ]
    
    def __init__(self, db):
        """
        Initialize the certificate generation service.
        
        Args:
            db: MongoDB database instance (can be None for testing)
        """
        self.db = db
        if db is not None:
            self.events_collection = db['events']
            self.registrations_collection = db['registrations']
            self.students_collection = db['students']
            self.certificates_collection = db['certificates']
        else:
            self.events_collection = None
            self.registrations_collection = None
            self.students_collection = None
            self.certificates_collection = None
    
    def generate_certificate_for_participant(
        self,
        event_id: str,
        student_id: str,
        registration_id: str
    ) -> Dict:
        """
        Generate a certificate for a participant after feedback submission.
        
        Args:
            event_id: Event ObjectId as string
            student_id: Student ObjectId as string
            registration_id: Registration ObjectId as string
            
        Returns:
            Dictionary with certificate data and filled HTML
        """
        try:
            # Fetch event details
            event = self.events_collection.find_one({'_id': ObjectId(event_id)})
            if not event:
                raise ValueError(f"Event not found: {event_id}")
            
            # Check if event has certificates
            if not event.get('is_certificate_based'):
                raise ValueError(f"Event does not offer certificates: {event.get('event_name')}")
            
            certificate_templates = event.get('certificate_templates', {})
            if not certificate_templates:
                raise ValueError(f"No certificate templates found for event: {event.get('event_name')}")
            
            # Fetch student details
            student = self.students_collection.find_one({'_id': ObjectId(student_id)})
            if not student:
                raise ValueError(f"Student not found: {student_id}")
            
            # Fetch registration details
            registration = self.registrations_collection.find_one({'_id': ObjectId(registration_id)})
            if not registration:
                raise ValueError(f"Registration not found: {registration_id}")
            
            # Get the first available certificate template
            template_name, template_url = next(iter(certificate_templates.items()))
            
            # Fetch template HTML
            html_content = self._fetch_template_html(template_url)
            
            # Prepare certificate data
            certificate_data = self._prepare_certificate_data(event, student, registration)
            
            # Fill placeholders in HTML
            filled_html = self._fill_placeholders(html_content, certificate_data)
            
            # Generate certificate ID and add it to data
            certificate_id = self._generate_certificate_id(event, student)
            certificate_data['CERTIFICATE_ID'] = certificate_id
            certificate_data['CERTIFICATE ID'] = certificate_id
            
            # Fill certificate ID in HTML (second pass)
            filled_html = self._fill_placeholders(filled_html, certificate_data)
            
            # Generate PDF from filled HTML
            pdf_bytes = None
            pdf_base64 = None
            if PDF_LIBRARY:
                try:
                    pdf_bytes = self._generate_pdf_from_html(filled_html)
                    pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
                except Exception as pdf_error:
                    print(f"⚠️  PDF generation failed: {pdf_error}")
                    import traceback
                    traceback.print_exc()
            
            # Save certificate record to database
            certificate_record = {
                'certificate_id': certificate_id,
                'event_id': ObjectId(event_id),
                'student_id': ObjectId(student_id),
                'registration_id': ObjectId(registration_id),
                'template_name': template_name,
                'template_url': template_url,
                'generated_at': datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None),
                'certificate_data': certificate_data,
                'filled_html': filled_html,
                'pdf_base64': pdf_base64,  # Store PDF as base64
                'status': 'generated'
            }
            
            result = self.certificates_collection.insert_one(certificate_record)
            
            return {
                'success': True,
                'certificate_id': certificate_id,
                'database_id': str(result.inserted_id),
                'template_name': template_name,
                'filled_html': filled_html,
                'pdf_available': pdf_bytes is not None,
                'pdf_base64': pdf_base64,  # Can be used directly in browser
                'pdf_size_kb': len(pdf_bytes) / 1024 if pdf_bytes else 0,
                'participant_name': certificate_data['PARTICIPANT_NAME'],
                'event_name': certificate_data['EVENT_NAME'],
                'generated_at': certificate_record['generated_at'].isoformat()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _fetch_template_html(self, template_url: str) -> str:
        """Fetch HTML template from URL"""
        try:
            response = requests.get(template_url, timeout=10)
            response.raise_for_status()
            return response.text
        except Exception as e:
            raise ValueError(f"Failed to fetch template from {template_url}: {e}")
    
    def _prepare_certificate_data(
        self,
        event: Dict,
        student: Dict,
        registration: Dict
    ) -> Dict[str, str]:
        """
        Prepare all possible certificate data fields.
        
        This includes all common certificate placeholders that might appear
        in different template designs.
        """
        # Get event dates
        start_date = event.get('start_date_time')
        end_date = event.get('end_date_time')
        
        # Format dates
        if isinstance(start_date, datetime):
            event_date = start_date.strftime('%B %d, %Y')
            event_start_date = start_date.strftime('%B %d, %Y')
        else:
            event_date = 'N/A'
            event_start_date = 'N/A'
        
        if isinstance(end_date, datetime):
            event_end_date = end_date.strftime('%B %d, %Y')
        else:
            event_end_date = event_start_date
        
        # Certificate issue date (today)
        issue_date = datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None).strftime('%B %d, %Y')
        
        # Participant name formatting
        participant_name = student.get('student_name', 'N/A')
        
        # Build comprehensive certificate data
        certificate_data = {
            # Participant Information
            'PARTICIPANT_NAME': participant_name,
            'PARTICIPANT NAME': participant_name,
            'STUDENT_NAME': participant_name,
            'STUDENT NAME': participant_name,
            'RECIPIENT_NAME': participant_name,
            'RECIPIENT NAME': participant_name,
            'NAME': participant_name,
            
            # Event Information
            'EVENT_NAME': event.get('event_name', 'N/A'),
            'EVENT NAME': event.get('event_name', 'N/A'),
            'WORKSHOP_TITLE': event.get('event_name', 'N/A'),
            'WORKSHOP TITLE': event.get('event_name', 'N/A'),
            'SEMINAR_TITLE': event.get('event_name', 'N/A'),
            'SEMINAR TITLE': event.get('event_name', 'N/A'),
            'COURSE_NAME': event.get('event_name', 'N/A'),
            'COURSE NAME': event.get('event_name', 'N/A'),
            'WORKSHOP/SEMINAR TITLE': event.get('event_name', 'N/A'),
            'COURSE/EVENT NAME': event.get('event_name', 'N/A'),
            
            # Department/Organization
            'DEPARTMENT_NAME': event.get('department', 'N/A'),
            'DEPARTMENT NAME': event.get('department', 'N/A'),
            'ORGANIZING_DEPARTMENT': event.get('department', 'N/A'),
            'ORGANIZING DEPARTMENT': event.get('department', 'N/A'),
            'INSTITUTION_NAME': 'Your Institution Name',  # Configure this
            'INSTITUTION NAME': 'Your Institution Name',
            'ORGANIZING_INSTITUTION': 'Your Institution Name',
            'ORGANIZING INSTITUTION': 'Your Institution Name',
            'ORGANIZING_COMPANY': 'Your Institution Name',
            'ORGANIZING COMPANY': 'Your Institution Name',
            'ORGANIZING INSTITUTION/COMPANY': 'Your Institution Name',
            
            # Dates
            'DATE': event_date,
            'EVENT_DATE': event_date,
            'EVENT DATE': event_date,
            'START_DATE': event_start_date,
            'START DATE': event_start_date,
            'END_DATE': event_end_date,
            'END DATE': event_end_date,
            'ISSUE_DATE': issue_date,
            'ISSUE DATE': issue_date,
            'CERTIFICATE_DATE': issue_date,
            'CERTIFICATE DATE': issue_date,
            
            # Event Details
            'EVENT_DESCRIPTION': event.get('event_description', 'N/A'),
            'EVENT DESCRIPTION': event.get('event_description', 'N/A'),
            'VENUE': event.get('venue', {}).get('venue_name', 'N/A') if isinstance(event.get('venue'), dict) else str(event.get('venue', 'N/A')),
            'EVENT_VENUE': event.get('venue', {}).get('venue_name', 'N/A') if isinstance(event.get('venue'), dict) else str(event.get('venue', 'N/A')),
            'EVENT VENUE': event.get('venue', {}).get('venue_name', 'N/A') if isinstance(event.get('venue'), dict) else str(event.get('venue', 'N/A')),
            
            # Certificate Metadata
            'CERTIFICATE_ID': '',  # Will be filled later
            'CERTIFICATE ID': '',
            'CERTIFICATE_TYPE': event.get('certificate_type', 'Certificate of Participation'),
            'CERTIFICATE TYPE': event.get('certificate_type', 'Certificate of Participation'),
        }
        
        return certificate_data
    
    def _fill_placeholders(self, html_content: str, certificate_data: Dict[str, str]) -> str:
        """
        Fill placeholders in HTML template with actual data.
        
        This method checks ALL placeholder formats and fills them automatically.
        Works with [], {{}}, and () patterns.
        """
        filled_html = html_content
        
        # Try each placeholder pattern
        for pattern, format_func in self.PLACEHOLDER_PATTERNS:
            # Find all placeholders of this pattern type
            matches = re.findall(pattern, filled_html)
            
            for placeholder_key in matches:
                placeholder_key_clean = placeholder_key.strip()
                
                # Get the value from certificate data
                if placeholder_key_clean in certificate_data:
                    value = certificate_data[placeholder_key_clean]
                    placeholder_full = format_func(placeholder_key_clean)
                    filled_html = filled_html.replace(placeholder_full, value)
        
        return filled_html
    
    def _generate_pdf_from_html(self, html_content: str) -> bytes:
        """
        Generate PDF from HTML content using WeasyPrint.
        
        Args:
            html_content: Filled HTML certificate template
            
        Returns:
            PDF file as bytes
        """
        if PDF_LIBRARY != 'weasyprint':
            raise RuntimeError("WeasyPrint not available for PDF generation")
        
        try:
            # Create PDF from HTML string
            pdf_bytes = HTML(string=html_content).write_pdf()
            return pdf_bytes
        except Exception as e:
            raise RuntimeError(f"PDF generation failed: {str(e)}")
    
    def _generate_certificate_id(self, event: Dict, student: Dict) -> str:
        """
        Generate unique certificate ID.
        
        Format: EVENT_CODE-STUDENT_ID-TIMESTAMP
        Example: CMDCOSTU2025-STU001-20260101
        """
        event_code = event.get('event_code', 'EVENT')
        student_id_short = str(student.get('_id', ''))[-6:].upper()
        timestamp = datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None).strftime('%Y%m%d')
        
        return f"{event_code}-{student_id_short}-{timestamp}"
    
    def get_certificate_by_id(self, certificate_id: str) -> Optional[Dict]:
        """Get certificate by certificate ID"""
        return self.certificates_collection.find_one({'certificate_id': certificate_id})
    
    def get_certificates_for_student(self, student_id: str) -> List[Dict]:
        """Get all certificates for a student"""
        return list(self.certificates_collection.find({
            'student_id': ObjectId(student_id)
        }).sort('generated_at', -1))
    
    def get_certificates_for_event(self, event_id: str) -> List[Dict]:
        """Get all certificates for an event"""
        return list(self.certificates_collection.find({
            'event_id': ObjectId(event_id)
        }).sort('generated_at', -1))
    
    def detect_placeholder_format(self, html_content: str) -> List[Tuple[str, List[str]]]:
        """
        Detect which placeholder format(s) are used in a template.
        
        Returns:
            List of tuples: (format_name, list_of_placeholders)
        """
        results = []
        
        format_names = ['square', 'curly_double', 'paren']
        
        for idx, (pattern, _) in enumerate(self.PLACEHOLDER_PATTERNS):
            matches = re.findall(pattern, html_content)
            if matches:
                unique_matches = sorted(set(m.strip() for m in matches))
                results.append((format_names[idx], unique_matches))
        
        return results
    
    def get_certificate_pdf(self, certificate_id: str) -> Optional[bytes]:
        """
        Get PDF bytes for a certificate.
        
        Args:
            certificate_id: Certificate ID
            
        Returns:
            PDF bytes or None if not found
        """
        certificate = self.certificates_collection.find_one({'certificate_id': certificate_id})
        if not certificate:
            return None
        
        # If PDF already generated and stored
        if certificate.get('pdf_base64'):
            return base64.b64decode(certificate['pdf_base64'])
        
        # If only HTML stored, generate PDF on-the-fly
        if certificate.get('filled_html') and PDF_LIBRARY:
            try:
                return self._generate_pdf_from_html(certificate['filled_html'])
            except Exception as e:
                print(f"Error generating PDF: {e}")
                return None
        
        return None
    
    def save_certificate_pdf(self, certificate_id: str, output_path: str) -> bool:
        """
        Save certificate PDF to file.
        
        Args:
            certificate_id: Certificate ID
            output_path: Path where PDF should be saved
            
        Returns:
            True if successful, False otherwise
        """
        pdf_bytes = self.get_certificate_pdf(certificate_id)
        if not pdf_bytes:
            return False
        
        try:
            with open(output_path, 'wb') as f:
                f.write(pdf_bytes)
            return True
        except Exception as e:
            print(f"Error saving PDF: {e}")
            return False


# Convenience function for route handlers
def generate_certificate_after_feedback(db, event_id: str, student_id: str, registration_id: str) -> Dict:
    """
    Generate certificate after feedback submission.
    
    This is the main function to call from your feedback submission route.
    
    Args:
        db: MongoDB database instance
        event_id: Event ObjectId as string
        student_id: Student ObjectId as string  
        registration_id: Registration ObjectId as string
        
    Returns:
        Dictionary with certificate generation result
    """
    service = CertificateGenerationService(db)
    return service.generate_certificate_for_participant(event_id, student_id, registration_id)
