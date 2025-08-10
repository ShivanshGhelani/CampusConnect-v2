"""
Input Validation and Sanitization Service for CampusConnect
Protects against injection attacks and malicious input
"""

import re
import bleach
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, validator, Field
from email_validator import validate_email, EmailNotValidError
import html
import urllib.parse
import logging

logger = logging.getLogger(__name__)

class InputSanitizer:
    """
    Comprehensive input sanitization and validation
    """
    
    # Allowed HTML tags for rich text (if needed)
    ALLOWED_TAGS = ['b', 'i', 'u', 'em', 'strong', 'p', 'br']
    ALLOWED_ATTRIBUTES = {}
    
    # Dangerous patterns to detect
    DANGEROUS_PATTERNS = {
        'sql_injection': [
            r"(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)",
            r"(\b(or|and)\s+\d+\s*=\s*\d+)",
            r"('|(\")|;|--|\*|\|)",
        ],
        'xss': [
            r"<script[\s\S]*?>[\s\S]*?</script>",
            r"javascript:",
            r"on\w+\s*=",
            r"<iframe",
            r"<object",
            r"<embed",
        ],
        'path_traversal': [
            r"\.\./",
            r"\.\.\\",
            r"%2e%2e%2f",
            r"%2e%2e%5c",
        ],
        'command_injection': [
            r"[;&|`]",
            r"\$\(",
            r"<%[\s\S]*?%>",
        ]
    }
    
    @classmethod
    def sanitize_string(cls, value: str, allow_html: bool = False) -> str:
        """
        Sanitize string input
        
        Args:
            value: Input string to sanitize
            allow_html: Whether to allow safe HTML tags
            
        Returns:
            Sanitized string
        """
        if not isinstance(value, str):
            return str(value)
        
        # Remove null bytes
        value = value.replace('\x00', '')
        
        # Limit length
        if len(value) > 10000:  # Adjust based on your needs
            logger.warning(f"Input too long, truncating: {len(value)} characters")
            value = value[:10000]
        
        if allow_html:
            # Use bleach to clean HTML
            value = bleach.clean(
                value,
                tags=cls.ALLOWED_TAGS,
                attributes=cls.ALLOWED_ATTRIBUTES,
                strip=True
            )
        else:
            # Escape HTML entities
            value = html.escape(value)
        
        # Check for dangerous patterns
        cls._check_dangerous_patterns(value)
        
        return value.strip()
    
    @classmethod
    def sanitize_email(cls, email: str) -> str:
        """
        Validate and sanitize email address
        """
        try:
            # Use email-validator library
            validated = validate_email(email)
            return validated.email.lower()
        except EmailNotValidError as e:
            logger.warning(f"Invalid email format: {email}")
            raise ValueError(f"Invalid email format: {str(e)}")
    
    @classmethod
    def sanitize_filename(cls, filename: str) -> str:
        """
        Sanitize filename for safe storage
        """
        # Remove path separators and dangerous characters
        filename = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '', filename)
        
        # Limit length
        if len(filename) > 255:
            name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
            filename = name[:250] + ('.' + ext if ext else '')
        
        # Prevent reserved names on Windows
        reserved_names = ['CON', 'PRN', 'AUX', 'NUL'] + [f'COM{i}' for i in range(1, 10)] + [f'LPT{i}' for i in range(1, 10)]
        if filename.upper() in reserved_names:
            filename = f"file_{filename}"
        
        return filename
    
    @classmethod
    def sanitize_phone(cls, phone: str) -> str:
        """
        Sanitize phone number
        """
        # Remove all non-digit characters except +
        phone = re.sub(r'[^\d+]', '', phone)
        
        # Basic validation
        if not re.match(r'^\+?[\d]{10,15}$', phone):
            raise ValueError("Invalid phone number format")
        
        return phone
    
    @classmethod
    def _check_dangerous_patterns(cls, value: str):
        """
        Check for dangerous patterns in input
        """
        value_lower = value.lower()
        
        for pattern_type, patterns in cls.DANGEROUS_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, value_lower, re.IGNORECASE):
                    logger.warning(f"Dangerous pattern detected ({pattern_type}): {pattern}")
                    # You might want to raise an exception or take other action
                    # For now, just log it
                    break

# Enhanced Pydantic models with validation

class SecureStudentModel(BaseModel):
    """Secure student model with comprehensive validation"""
    
    full_name: str = Field(..., min_length=1, max_length=100)
    email: str
    phone: Optional[str] = Field(None, max_length=15)
    enrollment_number: str = Field(..., min_length=1, max_length=50)
    branch: str = Field(..., min_length=1, max_length=100)
    semester: int = Field(..., ge=1, le=8)
    
    @validator('full_name')
    def validate_full_name(cls, v):
        return InputSanitizer.sanitize_string(v)
    
    @validator('email')
    def validate_email(cls, v):
        return InputSanitizer.sanitize_email(v)
    
    @validator('phone')
    def validate_phone(cls, v):
        if v:
            return InputSanitizer.sanitize_phone(v)
        return v
    
    @validator('enrollment_number')
    def validate_enrollment(cls, v):
        # Allow only alphanumeric and common separators
        if not re.match(r'^[A-Za-z0-9\-_]+$', v):
            raise ValueError("Enrollment number contains invalid characters")
        return InputSanitizer.sanitize_string(v)
    
    @validator('branch')
    def validate_branch(cls, v):
        return InputSanitizer.sanitize_string(v)

class SecureFacultyModel(BaseModel):
    """Secure faculty model with comprehensive validation"""
    
    full_name: str = Field(..., min_length=1, max_length=100)
    email: str
    phone: Optional[str] = Field(None, max_length=15)
    employee_id: str = Field(..., min_length=1, max_length=50)
    department: str = Field(..., min_length=1, max_length=100)
    designation: str = Field(..., min_length=1, max_length=100)
    
    @validator('full_name')
    def validate_full_name(cls, v):
        return InputSanitizer.sanitize_string(v)
    
    @validator('email')
    def validate_email(cls, v):
        return InputSanitizer.sanitize_email(v)
    
    @validator('phone')
    def validate_phone(cls, v):
        if v:
            return InputSanitizer.sanitize_phone(v)
        return v
    
    @validator('employee_id')
    def validate_employee_id(cls, v):
        if not re.match(r'^[A-Za-z0-9\-_]+$', v):
            raise ValueError("Employee ID contains invalid characters")
        return InputSanitizer.sanitize_string(v)
    
    @validator('department', 'designation')
    def validate_text_fields(cls, v):
        return InputSanitizer.sanitize_string(v)

class SecureEventModel(BaseModel):
    """Secure event model with comprehensive validation"""
    
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=5000)
    event_type: str = Field(..., min_length=1, max_length=50)
    venue: str = Field(..., min_length=1, max_length=200)
    max_participants: int = Field(..., ge=1, le=10000)
    
    @validator('title')
    def validate_title(cls, v):
        return InputSanitizer.sanitize_string(v)
    
    @validator('description')
    def validate_description(cls, v):
        # Allow some HTML for rich text but sanitize it
        return InputSanitizer.sanitize_string(v, allow_html=True)
    
    @validator('event_type')
    def validate_event_type(cls, v):
        # Restrict to predefined types
        allowed_types = ['workshop', 'seminar', 'conference', 'competition', 'cultural', 'sports', 'other']
        if v.lower() not in allowed_types:
            raise ValueError(f"Event type must be one of: {', '.join(allowed_types)}")
        return InputSanitizer.sanitize_string(v)
    
    @validator('venue')
    def validate_venue(cls, v):
        return InputSanitizer.sanitize_string(v)

class SecurePasswordModel(BaseModel):
    """Secure password model with strength validation"""
    
    password: str = Field(..., min_length=8, max_length=128)
    
    @validator('password')
    def validate_password_strength(cls, v):
        """
        Validate password strength
        """
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        
        # Check for common patterns
        if v.lower() in ['password', '12345678', 'qwerty']:
            raise ValueError("Password is too common")
        
        # Require at least one uppercase, lowercase, and number
        if not re.search(r'[A-Z]', v):
            raise ValueError("Password must contain at least one uppercase letter")
        
        if not re.search(r'[a-z]', v):
            raise ValueError("Password must contain at least one lowercase letter")
        
        if not re.search(r'\d', v):
            raise ValueError("Password must contain at least one number")
        
        return v

# File upload validation
class FileValidator:
    """
    Validate file uploads for security
    """
    
    ALLOWED_EXTENSIONS = {
        'images': ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        'documents': ['pdf', 'doc', 'docx', 'txt'],
        'certificates': ['pdf', 'jpg', 'jpeg', 'png']
    }
    
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    
    @classmethod
    def validate_file(cls, file_content: bytes, filename: str, file_type: str = 'images') -> bool:
        """
        Validate uploaded file
        """
        # Check file size
        if len(file_content) > cls.MAX_FILE_SIZE:
            raise ValueError(f"File too large. Maximum size is {cls.MAX_FILE_SIZE // (1024*1024)}MB")
        
        # Check extension
        extension = filename.lower().split('.')[-1] if '.' in filename else ''
        if extension not in cls.ALLOWED_EXTENSIONS.get(file_type, []):
            raise ValueError(f"File type not allowed. Allowed types: {cls.ALLOWED_EXTENSIONS.get(file_type, [])}")
        
        # Check for magic bytes (basic file type validation)
        if file_type == 'images':
            if not cls._is_valid_image(file_content):
                raise ValueError("Invalid image file")
        
        return True
    
    @classmethod
    def _is_valid_image(cls, file_content: bytes) -> bool:
        """
        Check if file is a valid image based on magic bytes
        """
        # JPEG magic bytes
        if file_content.startswith(b'\xff\xd8\xff'):
            return True
        
        # PNG magic bytes
        if file_content.startswith(b'\x89PNG\r\n\x1a\n'):
            return True
        
        # GIF magic bytes
        if file_content.startswith(b'GIF87a') or file_content.startswith(b'GIF89a'):
            return True
        
        # WebP magic bytes
        if file_content[8:12] == b'WEBP':
            return True
        
        return False

# Usage examples:
"""
from services.input_validation import InputSanitizer, SecureStudentModel

# Sanitize user input
clean_name = InputSanitizer.sanitize_string(user_input)

# Validate with Pydantic models
try:
    student_data = SecureStudentModel(**request_data)
except ValidationError as e:
    # Handle validation errors
    pass
"""
