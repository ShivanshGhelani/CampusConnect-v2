# Dependencies Directory

## Overview
The dependencies directory contains FastAPI dependency injection modules that handle cross-cutting concerns like authentication, authorization, and request validation. These dependencies provide reusable components that can be injected into API endpoints.

## Authentication Dependencies

### 🔐 **Authentication Module** (`auth.py`)
- **Purpose**: Manages user authentication and session validation
- **Features**:
  - Session-based authentication
  - Role-based access control
  - Password hashing and verification
  - Admin and student authentication flows

## Dependency Functions

### **Admin Authentication**
```python
async def require_admin(request: Request) -> AdminUser:
    """
    Require admin authentication for endpoint access
    
    Returns:
        AdminUser: Authenticated admin user object
    
    Raises:
        HTTPException: 401 if not authenticated, 403 if not admin
    """
```

### **Role-Based Dependencies**
```python
async def require_super_admin_access(
    current_admin: AdminUser = Depends(require_admin)
) -> AdminUser:
    """Require super admin access level"""

async def require_executive_admin_or_higher(
    current_admin: AdminUser = Depends(require_admin)
) -> AdminUser:
    """Require executive admin or higher access level"""

async def require_event_admin_or_higher(
    current_admin: AdminUser = Depends(require_admin)
) -> AdminUser:
    """Require event admin or higher access level"""
```

### **Student Authentication**
```python
async def get_current_student(request: Request) -> Optional[StudentUser]:
    """
    Get current authenticated student
    
    Returns:
        StudentUser: Current student or None if not authenticated
    """

async def require_student_auth(request: Request) -> StudentUser:
    """
    Require student authentication
    
    Returns:
        StudentUser: Authenticated student user
    
    Raises:
        HTTPException: 401 if not authenticated
    """
```

## Authentication Flow

### **Admin Authentication Process**
1. **Session Check**: Verify admin session exists
2. **User Lookup**: Fetch admin user from database
3. **Role Validation**: Check user has admin privileges
4. **Permission Check**: Validate specific role permissions
5. **Return User**: Provide authenticated admin object

### **Student Authentication Process**
1. **Session Check**: Verify student session exists
2. **User Lookup**: Fetch student data from database
3. **Status Check**: Ensure student account is active
4. **Return User**: Provide authenticated student object

## Permission System Integration

### **Role Hierarchy**
```python
class AdminRole(str, Enum):
    SUPER_ADMIN = "super_admin"        # Full system access
    EXECUTIVE_ADMIN = "executive_admin" # Event management + analytics
    EVENT_ADMIN = "event_admin"        # Event operations only
    CONTENT_ADMIN = "content_admin"    # Content management
```

### **Permission Matrix**
- **Super Admin**: All permissions
- **Executive Admin**: Event management, analytics, student data
- **Event Admin**: Event operations, student data (read-only)
- **Content Admin**: Event creation, content management

## Usage Patterns

### **API Endpoint Protection**
```python
from dependencies.auth import require_admin, require_super_admin_access

@router.get("/admin/users")
async def get_users(
    current_admin: AdminUser = Depends(require_super_admin_access)
):
    """Only super admins can access user management"""
    return await user_service.get_all_users()

@router.get("/admin/events")
async def get_events(
    current_admin: AdminUser = Depends(require_admin)
):
    """Any admin can view events"""
    return await event_service.get_events()
```

### **Role-Based Filtering**
```python
@router.get("/admin/analytics")
async def get_analytics(
    current_admin: AdminUser = Depends(require_executive_admin_or_higher)
):
    """Executive admins and above can view analytics"""
    if current_admin.role == AdminRole.SUPER_ADMIN:
        return await analytics_service.get_full_analytics()
    else:
        return await analytics_service.get_limited_analytics()
```

## Security Features

### **Session Management**
- Secure session cookies with HttpOnly flag
- Session timeout and cleanup
- Cross-site request forgery (CSRF) protection
- Session invalidation on logout

### **Password Security**
- Bcrypt hashing with salt
- Minimum password complexity requirements
- Password change tracking
- Account lockout after failed attempts

### **Access Control**
- Role-based permissions
- Resource-level access control
- Audit logging for admin actions
- IP-based access restrictions (configurable)

## Error Handling

### **Authentication Errors**
```python
# 401 Unauthorized - Not logged in
raise HTTPException(
    status_code=401,
    detail="Authentication required"
)

# 403 Forbidden - Insufficient permissions
raise HTTPException(
    status_code=403,
    detail="Insufficient permissions for this operation"
)

# 404 Not Found - User not found
raise HTTPException(
    status_code=404,
    detail="User account not found"
)
```

### **Error Response Format**
```json
{
    "detail": "Authentication required",
    "error_code": "AUTH_REQUIRED",
    "timestamp": "2025-07-12T10:30:00Z"
}
```

## Integration Points

### **With Services**
- Dependencies provide authenticated user context to services
- Services use user information for audit logging
- Role-based data filtering in service layer

### **With Utils**
- Permission utilities for fine-grained access control
- Logging utilities for authentication events
- Email utilities for account notifications

### **With Models**
- AdminUser and StudentUser models for type safety
- Role enums for consistent permission checking
- Validation models for authentication requests

## Development Guidelines

### **Adding New Dependencies**
1. **Single Responsibility**: Each dependency should have one clear purpose
2. **Type Safety**: Use proper type hints for all parameters and returns
3. **Error Handling**: Provide clear error messages and appropriate HTTP status codes
4. **Documentation**: Document expected behavior and exceptions
5. **Testing**: Write unit tests for authentication logic

### **Dependency Composition**
```python
# Compose dependencies for complex requirements
async def require_event_manager(
    current_admin: AdminUser = Depends(require_admin),
    event_id: str = Path(...)
) -> Tuple[AdminUser, str]:
    """Require admin with event management permissions for specific event"""
    
    # Check if admin can manage this specific event
    if not await permission_service.can_manage_event(current_admin, event_id):
        raise HTTPException(403, "Cannot manage this event")
    
    return current_admin, event_id
```

### **Performance Considerations**
- Cache user lookups for request duration
- Minimize database queries in dependencies
- Use async operations for all database access
- Implement request-scoped caching where appropriate

## Testing Dependencies

### **Unit Testing**
```python
import pytest
from fastapi.testclient import TestClient
from dependencies.auth import require_admin

@pytest.mark.asyncio
async def test_require_admin_valid_session():
    """Test admin authentication with valid session"""
    # Mock request with valid admin session
    request = create_mock_request(admin_session=True)
    admin = await require_admin(request)
    assert admin.role in AdminRole
    assert admin.is_admin is True

@pytest.mark.asyncio 
async def test_require_admin_invalid_session():
    """Test admin authentication with invalid session"""
    request = create_mock_request(admin_session=False)
    with pytest.raises(HTTPException) as exc_info:
        await require_admin(request)
    assert exc_info.value.status_code == 401
```

### **Integration Testing**
```python
def test_protected_endpoint_with_auth(client: TestClient):
    """Test protected endpoint with proper authentication"""
    # Login as admin
    login_response = client.post("/admin/login", json={
        "username": "admin",
        "password": "password"
    })
    
    # Access protected endpoint
    response = client.get("/api/v1/admin/users")
    assert response.status_code == 200

def test_protected_endpoint_without_auth(client: TestClient):
    """Test protected endpoint without authentication"""
    response = client.get("/api/v1/admin/users")
    assert response.status_code == 401
```

## Security Best Practices

### **Authentication Security**
1. **Session Security**: Use secure, HttpOnly cookies
2. **Password Policy**: Enforce strong password requirements
3. **Rate Limiting**: Implement login attempt limiting
4. **Audit Logging**: Log all authentication events
5. **Session Timeout**: Implement reasonable session timeouts

### **Authorization Security**
1. **Principle of Least Privilege**: Grant minimum required permissions
2. **Role Validation**: Always validate user roles
3. **Resource Access**: Check permissions for specific resources
4. **Cross-Site Protection**: Implement CSRF protection
5. **Input Validation**: Validate all authentication inputs

---

*Last Updated: July 12, 2025*
*Part of CampusConnect Backend Architecture*
