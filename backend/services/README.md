# Services Directory

## Overview
The services directory contains business logic layer components that handle core application operations. These services provide an abstraction layer between the API endpoints and database operations, implementing the business rules and workflows of the CampusConnect system.

## Architecture Pattern
Services follow the **Service Layer Pattern** with:
- **Async Operations**: All methods use async/await for non-blocking database operations
- **Error Handling**: Comprehensive exception handling with detailed logging
- **Database Abstraction**: Clean separation between business logic and data access
- **Singleton Pattern**: Service instances created at module level for reuse

## Current Services

### 🏢 **Venue Service** (`venue_service.py`)
- **Purpose**: Manages venue information and booking operations
- **Features**:
  - CRUD operations for venues
  - Venue availability checking
  - Booking management
  - Statistics and reporting
- **Key Methods**:
  - `get_venues()` - Retrieve all venues
  - `create_venue()` - Add new venue
  - `update_venue()` - Modify venue details
  - `delete_venue()` - Remove venue
  - `get_statistics()` - Venue usage stats

### 📧 **Email Services** (`email/`)
Email services moved from utils to services to better reflect their role as business logic components:

#### **`email/service.py`**
- **Purpose**: Primary email service with Jinja2 templating
- **Features**:
  - Template-based email composition
  - Async email sending with thread pools
  - Connection management with timeout handling
  - Support for attachments and HTML/text emails

#### **`email/optimized_service.py`**
- **Purpose**: High-performance email service using connection pooling
- **Features**:
  - 4-6 seconds saved per email through connection reuse
  - Thread-safe concurrent operations
  - Automatic connection health management
  - Reduced SMTP overhead

#### **`email/smtp_pool.py`**
- **Purpose**: Enterprise-grade SMTP connection pool management
- **Features**:
  - Configurable connection pool with health monitoring
  - Automatic connection recycling and recovery
  - Thread-safe operations for concurrent access
  - Comprehensive statistics and performance monitoring

#### **`email/queue.py`**
- **Purpose**: Background email delivery queue system
- **Features**:
  - Async queue with 1000 email capacity
  - Batch processing with configurable workers
  - Retry logic with exponential backoff
  - Certificate delivery optimization

## Service Development Guidelines

### **File Structure**
```python
class ServiceName:
    def __init__(self):
        # Service initialization
        pass
    
    async def get_database(self):
        """Get database connection"""
        return await Database.get_database()
    
    async def service_method(self, params) -> ReturnType:
        """Service method implementation"""
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            
            # Business logic here
            result = await db[collection].operation()
            return formatted_result
            
        except Exception as e:
            logger.error(f"Error in service_method: {e}")
            raise

# Create singleton instance
service_name = ServiceName()
```

### **Best Practices**
1. **Database Connections**: Always check `if db is None` before operations
2. **Error Handling**: Use try-except blocks with detailed logging
3. **Return Types**: Use proper type hints for all methods
4. **Business Logic**: Keep database operations separate from business rules
5. **Testing**: All services should be testable independently

### **Authentication Integration**
Services work with FastAPI dependencies:
- `require_admin()` - Basic admin authentication
- `require_super_admin_access()` - Super admin only
- `require_executive_admin_or_higher()` - Executive+ access

### **Database Collections**
Services interact with MongoDB collections:
- `venues` - Venue information
- `venue_bookings` - Booking records
- `events` - Event data
- `students` - Student information
- `users` - Admin users

## Email Service Usage

### **Basic Email Operations**
```python
from services.email.service import EmailService

email_service = EmailService()

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

### **High-Performance Email**
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

### **Queue-Based Processing**
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
```

## Future Services (Planned)

### **Student Service**
- Student registration and management
- Academic record handling
- Profile management

### **Event Service**
- Event creation and management
- Registration handling
- Lifecycle management

### **Certificate Service**
- Certificate generation
- Template management
- Delivery tracking

### **Faculty Service**
- Faculty information management
- Department assignments
- Role management

### **Authentication Service**
- User authentication
- Session management
- Permission validation

## Integration Points

### **API Layer**
- Services are consumed by API endpoints in `api/v1/admin/`
- Each service maps to corresponding API routes
- Services handle business logic while APIs handle HTTP concerns

### **Database Layer**
- Services use `database.operations.DatabaseOperations` for connections
- MongoDB operations through Motor async driver
- Collection names as strings for flexibility

### **Utils Integration**
- Services can use utilities from `utils/` folder
- Common operations like ID generation, statistics
- Event management and system utilities

## Development Workflow

### **Adding New Services**
1. Create new service file in `services/` directory
2. Follow the established patterns and naming conventions
3. Implement proper error handling and logging
4. Create corresponding API endpoints
5. Add to admin router includes
6. Test through admin panel or authenticated requests

### **Service Dependencies**
- All services depend on database connectivity
- Some services may depend on other services
- Utils can be imported as needed
- Email services for notifications

## Performance Considerations

### **Database Operations**
- Use async/await for all database operations
- Implement proper indexing for frequently queried fields
- Consider caching for read-heavy operations

### **Memory Management**
- Services are singletons to reduce memory overhead
- Avoid storing large datasets in service instances
- Use generators for large result sets

### **Error Recovery**
- Implement retry logic for transient failures
- Graceful degradation when dependencies are unavailable
- Comprehensive logging for debugging

---

*Last Updated: July 12, 2025*
*Part of CampusConnect Backend Architecture*
*Email services moved from utils/email/ to services/email/*
