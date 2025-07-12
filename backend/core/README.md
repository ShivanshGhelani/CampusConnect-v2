# Core Directory

## Overview
The core directory contains fundamental system components and utilities that form the backbone of the CampusConnect application. These are essential modules that provide core functionality used throughout the system, including ID generation, logging, permissions, template context, and fundamental operations.

## Location Update
This directory was moved from `utils/core/` to `backend/core/` to emphasize its role as core system infrastructure rather than auxiliary utilities.

## Architecture Pattern
Core modules follow the **Foundation Pattern** with:
- **Singleton Services**: Core services instantiated once and reused
- **Functional Design**: Pure functions for deterministic operations
- **Performance Focus**: Optimized for frequent use across the system
- **System Integration**: Deep integration with FastAPI and MongoDB

## Core Modules

### **`logger.py`**
- **Purpose**: Centralized logging configuration
- **Features**:
  - Console and file handlers
  - Different log levels for different outputs
  - UTF-8 encoding support
  - Structured log formatting

### **`id_generator.py`**
- **Purpose**: Unique ID generation for all system entities
- **Features**:
  - Registration, team, attendance, feedback, certificate IDs
  - Cryptographic hash-based uniqueness
  - Consistent ID format across modules
  - Collision-resistant generation

### **`json_encoder.py`**
- **Purpose**: Custom JSON encoder for MongoDB and datetime objects
- **Features**:
  - ObjectId serialization
  - Datetime ISO formatting
  - Seamless JSON API responses

### **`permissions.py`**
- **Purpose**: Role-based access control (RBAC) system
- **Features**:
  - Hierarchical admin roles
  - Permission-based access validation
  - 17 different permission types
  - Integration with FastAPI dependencies

### **`testing_utils.py`**
- **Purpose**: Testing framework integration utilities
- **Features**:
  - Programmatic test execution
  - Test discovery and listing
  - Project path management
  - Integration with scripts/testing directory

## Template & Context Modules

### **`template_context.py`**
- **Purpose**: Common template context for student sessions
- **Features**:
  - Student login status tracking
  - Session data management
  - Count calculations for templates

### **`navigation_counts.py`**
- **Purpose**: Admin sidebar navigation counts
- **Features**:
  - Real-time counts for events by status
  - Student and admin counts
  - Performance-optimized calculations

### **`header_context.py`**
- **Purpose**: Admin header context with role-based metrics
- **Features**:
  - Real-time statistics for admin dashboard
  - Role-specific metrics
  - Notification counts and activity indicators
  - System health monitoring

## Certificate Generation

### **`js_certificate_generator.py`**
- **Purpose**: Server-side support for JavaScript certificate generation
- **Features**:
  - Concurrent operations (20 simultaneous downloads)
  - Base64 PDF handling and email integration
  - Performance monitoring and statistics
  - Async semaphore for load management

## Usage Patterns

### **Logging**
```python
from core.logger import setup_logger

# Setup application logging
logger = setup_logger(log_level=logging.INFO)

# Use in modules
import logging
logger = logging.getLogger(__name__)
logger.info("Operation completed successfully")
logger.error("Error occurred", exc_info=True)
```

### **ID Generation**
```python
from core.id_generator import (
    generate_registration_id,
    generate_team_registration_id,
    generate_attendance_id,
    generate_certificate_id
)

# Generate various IDs
reg_id = generate_registration_id("22BEIT30043", "EVENT123", "John Doe")
team_id = generate_team_registration_id("Team Alpha", "EVENT123", "22BEIT30043")
att_id = generate_attendance_id("22BEIT30043", "EVENT123")
cert_id = generate_certificate_id("22BEIT30043", "EVENT123")
```

### **Permissions**
```python
from core.permissions import PermissionManager

# Check permissions
can_delete = PermissionManager.check_permission(admin_user, "admin.events.delete")
can_view = PermissionManager.has_role_permission(admin_user.role, "admin.events.read")

# Get user permissions
permissions = PermissionManager.get_user_permissions(admin_user)
```

### **JSON Encoding**
```python
from core.json_encoder import CustomJSONEncoder
import json

# Use custom encoder for MongoDB objects
data = {"_id": ObjectId("..."), "created_at": datetime.now()}
json_string = json.dumps(data, cls=CustomJSONEncoder)
```

### **Testing Integration**
```python
from core.testing_utils import run_test, list_tests

# List available tests
tests = list_tests()
print(f"Available tests: {tests}")

# Run specific test
success = run_test("test_email_service.py")
```

## Template Context Usage

### **Navigation Counts**
```python
from core.navigation_counts import get_navigation_counts

# Get counts for admin sidebar
counts = await get_navigation_counts()
# Returns: {
#     "all_events_count": 25,
#     "ongoing_events_count": 5,
#     "upcoming_events_count": 10,
#     "completed_events_count": 10,
#     "student_count": 150,
#     "admin_count": 5
# }
```

### **Header Context**
```python
from core.header_context import get_header_context

# Get enhanced header data for admin
context = await get_header_context(current_admin)
# Includes role-specific metrics, notifications, system health
```

## Permission System

### **Role Hierarchy**
```python
class AdminRole(str, Enum):
    SUPER_ADMIN = "super_admin"        # Full system access
    EXECUTIVE_ADMIN = "executive_admin" # Event management + analytics  
    EVENT_ADMIN = "event_admin"        # Event operations only
    CONTENT_ADMIN = "content_admin"    # Content management
```

### **Permission Categories**
- **User Management**: create, read, update, delete users
- **Event Management**: create, read, update, delete events
- **Student Management**: manage student data and records
- **System Administration**: logs, settings, analytics
- **Content Management**: templates, assets, content

### **Permission Checking**
```python
# Role-based permissions
ROLE_PERMISSIONS = {
    AdminRole.SUPER_ADMIN: [
        "admin.users.create", "admin.users.read", "admin.users.update", "admin.users.delete",
        "admin.events.create", "admin.events.read", "admin.events.update", "admin.events.delete",
        "admin.students.create", "admin.students.read", "admin.students.update", "admin.students.delete",
        "admin.dashboard.view", "admin.analytics.view", "admin.settings.manage",
        "admin.logs.view", "admin.system.manage"
    ],
    AdminRole.EXECUTIVE_ADMIN: [
        "admin.events.create", "admin.events.read", "admin.events.update",
        "admin.students.read", "admin.dashboard.view", "admin.analytics.view"
    ],
    # ... other roles
}
```

## ID Generation Patterns

### **ID Format Standards**
- **Registration ID**: `REG` + 6-char hash (e.g., `REG4A7B2C`)
- **Team Registration**: `TEAM` + 8-char hash (e.g., `TEAM1A2B3C4D`)
- **Attendance ID**: `ATT` + timestamp + 4-char hash
- **Certificate ID**: `CERT` + enrollment + event + timestamp

### **Uniqueness Guarantees**
- MD5 hash with timestamp and unique inputs
- Collision detection and retry logic
- Cryptographically secure random components
- Database uniqueness validation

## Logging Configuration

### **Log Levels**
- **DEBUG**: Development debugging information
- **INFO**: General operational messages
- **WARNING**: Potential issues that don't affect operation
- **ERROR**: Error conditions that affect specific operations
- **CRITICAL**: Serious errors that affect system operation

### **Log Format**
```
%(asctime)s - %(levelname)s - %(name)s - [%(filename)s:%(lineno)d] - %(message)s
```

### **Output Destinations**
- **Console**: INFO level and above
- **File**: WARNING level and above to `logs/app.log`
- **Structured**: JSON format for log aggregation systems

---

*Last Updated: July 12, 2025*
