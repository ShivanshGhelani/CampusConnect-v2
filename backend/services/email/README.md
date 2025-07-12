# Email Utils

## Overview
Email utilities provide comprehensive email services including SMTP connection pooling, queue management, template processing, and optimized delivery systems for the CampusConnect platform.

## Modules

### **`service.py`** (formerly `email_service.py`)
- **Purpose**: Primary email service with Jinja2 templating
- **Features**:
  - Template-based email composition
  - Async email sending with thread pools
  - Connection management with timeout handling
  - Support for attachments and HTML/text emails

### **`optimized_service.py`** (formerly `optimized_email_service.py`)
- **Purpose**: High-performance email service using connection pooling
- **Features**:
  - 4-6 seconds saved per email through connection reuse
  - Thread-safe concurrent operations
  - Automatic connection health management
  - Reduced SMTP overhead

### **`smtp_pool.py`**
- **Purpose**: Enterprise-grade SMTP connection pool management
- **Features**:
  - Configurable connection pool with health monitoring
  - Automatic connection recycling and recovery
  - Thread-safe operations for concurrent access
  - Comprehensive statistics and performance monitoring

### **`queue.py`** (formerly `email_queue.py`)
- **Purpose**: Background email delivery queue system
- **Features**:
  - Async queue with 1000 email capacity
  - Batch processing with configurable workers
  - Retry logic with exponential backoff
  - Certificate delivery optimization

## Usage Patterns

### **Basic Email Sending**
```python
from services.email.service import EmailService

email_service = EmailService()

# Send simple email
await email_service.send_email(
    to_email="student@example.com",
    subject="Welcome to CampusConnect",
    html_content="<h1>Welcome!</h1>",
    text_content="Welcome to CampusConnect!"
)

# Send template-based email
await email_service.send_template_email(
    to_email="student@example.com",
    template_name="welcome_email.html",
    context={
        "student_name": "John Doe",
        "event_title": "Tech Conference 2025"
    }
)
```

### **High-Performance Email (Optimized Service)**
```python
from services.email.optimized_service import optimized_email_service

# Use for bulk operations - automatically uses connection pool
await optimized_email_service.send_template_email(
    to_email="student@example.com",
    template_name="certificate_email.html",
    context=certificate_data,
    attachments=["certificate.pdf"]
)
```

### **Queue-Based Email Delivery**
```python
from services.email.queue import certificate_email_queue

# Add certificate email to queue for background processing
await certificate_email_queue.add_certificate_email(
    event_id="EVENT123",
    enrollment_no="22BEIT30043",
    student_name="John Doe",
    student_email="john@example.com",
    pdf_base64=base64_pdf_data
)

# Start queue processing
await certificate_email_queue.start_workers()
```

### **SMTP Pool Management**
```python
from services.email.smtp_pool import smtp_pool

# Get pool statistics
stats = smtp_pool.get_stats()
print(f"Active connections: {stats.active_connections}")
print(f"Emails sent: {stats.total_emails_sent}")

# Use pool directly for custom operations
with smtp_pool.get_connection() as connection:
    # Custom SMTP operations
    connection.send_message(message)
```

## Email Templates

### **Template Structure**
```
templates/email/
├── base.html                 # Base template with common styling
├── welcome_email.html        # Student welcome email
├── event_reminder.html       # Event reminder notifications
├── certificate_email.html    # Certificate delivery email
├── registration_success.html # Registration confirmation
└── event_update.html        # Event updates and changes
```

### **Template Usage**
```python
# Templates automatically include base styling and assets
# Context variables are passed to template rendering
context = {
    "student_name": "John Doe",
    "event_title": "Tech Conference 2025",
    "event_date": "2025-07-15",
    "event_venue": "Main Auditorium",
    "certificate_url": "/certificates/download/ABC123"
}
```

## Performance Optimization

### **Connection Pooling Benefits**
- **Reduced Latency**: 4-6 seconds saved per email
- **Resource Efficiency**: Reuse existing connections
- **Scalability**: Handle concurrent email sending
- **Reliability**: Automatic connection recovery

### **Queue System Benefits**
- **Non-blocking**: Email sending doesn't block API responses
- **Batch Processing**: Efficient handling of bulk operations
- **Retry Logic**: Automatic retry for failed deliveries
- **Monitoring**: Real-time statistics and error tracking

## Configuration

### **SMTP Settings**
```python
# In config/settings.py
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
EMAIL_USER = "noreply@campusconnect.edu"
EMAIL_PASSWORD = "secure_password"
FROM_EMAIL = "CampusConnect <noreply@campusconnect.edu>"
```

### **Pool Configuration**
```python
# SMTP Pool settings
POOL_SIZE = 5                 # Number of persistent connections
CONNECTION_TIMEOUT = 300      # 5 minutes timeout
MAX_RETRIES = 3              # Retry attempts for failed operations
HEALTH_CHECK_INTERVAL = 60   # Health check every minute
```

### **Queue Configuration**
```python
# Email Queue settings
MAX_QUEUE_SIZE = 1000        # Maximum pending emails
MAX_WORKERS = 5              # Concurrent worker threads
BATCH_SIZE = 10              # Emails processed per batch
RETRY_DELAYS = [1, 5, 15]    # Retry delays in seconds
```

## Error Handling

### **Common Error Scenarios**
```python
try:
    await email_service.send_email(to_email, subject, content)
except SMTPAuthenticationError:
    logger.error("SMTP authentication failed - check credentials")
except SMTPRecipientsRefused:
    logger.error("Invalid recipient email address")
except ConnectionError:
    logger.error("SMTP server connection failed")
except Exception as e:
    logger.error(f"Unexpected email error: {e}")
```

### **Monitoring and Alerting**
- Failed email delivery notifications
- SMTP connection health monitoring
- Queue depth and processing rate tracking
- Performance metrics collection

## Security Considerations

### **Email Security**
- TLS/SSL encryption for SMTP connections
- Secure credential management
- Rate limiting to prevent spam
- Email content validation and sanitization

### **Template Security**
- Jinja2 auto-escaping enabled
- Input validation for template variables
- Secure file attachment handling
- Prevention of email injection attacks

## Testing

### **Unit Testing**
```python
import pytest
from services.email.service import EmailService

@pytest.mark.asyncio
async def test_email_sending():
    service = EmailService()
    result = await service.send_email(
        "test@example.com",
        "Test Subject",
        "<h1>Test</h1>"
    )
    assert result is True
```

### **Integration Testing**
- SMTP server connectivity tests
- Template rendering validation
- Queue processing verification
- Performance benchmark tests

---

*Last Updated: July 12, 2025*
