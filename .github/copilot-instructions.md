# CampusConnect - GitHub Copilot Instructions

## Project Overview
CampusConnect is a comprehensive campus management system with FastAPI backend and modern frontend. Handle student registrations, event management, venue booking, certificate generation, and administrative functions.

## Development Environment
- **Backend**: FastAPI server running on port 8000 (external terminal)
- **Frontend**: Running on port 3000 (external terminal)
- **Shell**: PowerShell (use PowerShell syntax for commands)
- **Database**: MongoDB with Motor async driver
- **Authentication**: Session-based with role-based permissions

## Important Development Notes

### Testing & Server Management
- **Servers Running**: Backend (port 8000) and Frontend (port 3000) run in external terminals
- **Authentication Required**: ALL admin endpoints are protected and require credentials
- **Testing**: Cannot test endpoints directly via web requests - they require authentication
- **PowerShell**: Use PowerShell syntax for all terminal commands
- **Server Restart**: Required when adding new methods to service classes (Python module caching)

### API Endpoint Access
- **Protected**: All `/api/v1/admin/*` endpoints require admin authentication
- **Testing Method**: Use browser admin panel or authenticated tools like Postman
- **Direct Testing**: Not possible via curl/Invoke-WebRequest without auth session

## Key Architecture Patterns

### 1. File Structure & Conventions
```
backend/
├── services/           # Business logic (async MongoDB operations)
├── routes/admin/      # Admin panel HTML routes
├── api/v1/admin/     # Admin REST API endpoints
├── models/           # Pydantic validation models
├── dependencies/     # FastAPI dependencies (auth, etc.)
└── utils/            # Helper utilities
```

### 2. Authentication System
- **Protected Endpoints**: ALL admin endpoints require authentication
- **Available Dependencies**:
  - `require_admin()` - Basic admin authentication
  - `require_super_admin_access()` - Super admin only
  - `require_executive_admin_or_higher()` - Executive+ access
  - `get_current_student()` - Student authentication
- **Admin Model**: `AdminUser` with `.username` field (NOT user_id)

### 3. Service Pattern
- **Location**: `services/{feature}_service.py`
- **Pattern**: Async methods, MongoDB operations
- **Database**: Always check `if db is None` before operations
- **Collections**: Use string names like "venues", "venue_bookings"
- **Singleton**: Create instance at bottom: `feature_service = FeatureService()`

### 4. Route Organization
- **Admin HTML**: `routes/admin/{feature}.py` - Returns HTML templates
- **Admin API**: `api/v1/admin/{feature}/__init__.py` - Returns JSON
- **Client API**: `api/v1/client/{feature}/__init__.py` - Student-facing APIs

## Database Schema (MongoDB Collections)

### Core Collections:
- **venues** - Venue information and details
- **venue_bookings** - Venue booking records
- **events** - Event data and metadata
- **students** - Student information
- **registrations** - Event registrations
- **admin_users** - Administrative users

### DateTime Handling:
- **Storage**: Use ISO string format for consistency
- **Comparison**: Always compare ISO strings, not datetime objects
- **Pattern**: `datetime.utcnow().isoformat()` for current time

## Testing & Development Commands

### PowerShell Testing (Remember: Endpoints are PROTECTED)
```powershell
# Cannot test directly via Invoke-WebRequest - endpoints require authentication
# Instead, test through browser at http://localhost:8000/admin/ after login
# Or use authenticated sessions in testing tools like Postman

# Server status check (unprotected)
Invoke-WebRequest -Uri "http://127.0.0.1:8000/docs" -Headers @{"accept"="text/html"}

# Test imports without running server
python -c "import main; print('Backend imports successful')"
```

### Server Management
```powershell
# Backend already running on port 8000 (external terminal)
# Frontend already running on port 3000 (external terminal)

# Check if servers are running
netstat -an | Select-String "8000"
netstat -an | Select-String "3000"
```

## Recent Implementation Status

### ✅ Venue Management System (July 6, 2025)
- **Service**: `services/venue_service.py` ✅
- **Admin Routes**: `routes/admin/venues.py` ✅  
- **API Routes**: `api/v1/admin/venues/__init__.py` ✅
- **Models**: `models/venue.py` ✅
- **Features**:
  - CRUD operations ✅
  - Delete functionality ✅
  - Flexible updates ✅
  - Statistics endpoint ✅
  - Booking system ✅

### 🔄 Current Known Issues
- Stats endpoint requires server restart to load new `get_statistics()` method
- All endpoints require proper authentication - cannot test via direct web requests

## Code Patterns & Standards

### 1. Service Methods Pattern
```python
async def method_name(self, params) -> ReturnType:
    try:
        db = await self.get_database()
        if db is None:
            raise Exception("Database connection failed")
        
        # MongoDB operations here
        result = await db[collection].operation()
        return formatted_result
        
    except Exception as e:
        logger.error(f"Error in method: {e}")
        raise
```

### 2. Route Handler Pattern
```python
@router.get("/endpoint", response_model=ResponseModel)
async def handler_name(
    params: Type,
    current_admin: AdminUser = Depends(require_admin)
):
    try:
        result = await service.method(params)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

### 3. Model Organization
- **Create Models**: For POST requests (required fields)
- **Update Models**: For PUT/PATCH (optional fields)
- **Response Models**: For API responses (all fields)
- **List Response**: Simplified for list endpoints

### 4. Frontend Modal Background Pattern
**IMPORTANT**: Always use transparent backdrop blur effect for modal backgrounds:
```jsx
// ✅ CORRECT - Modern transparent backdrop
<div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200">

// ❌ INCORRECT - Old solid background
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
```

**Modal Background Standards:**
- Use `backdrop-blur-sm bg-black/30` for transparent effect
- Include `z-[99999]` for proper layering
- Add `animate-in fade-in duration-200` for smooth transitions
- Apply to ALL modals across the application (Venue, Students, Faculty, Events, etc.)

## Common Fixes & Solutions

### Import Errors
- ❌ `get_current_admin_user` → ✅ `require_admin`
- ❌ `current_admin["user_id"]` → ✅ `current_admin.username`

### DateTime Issues
- ❌ Store datetime objects → ✅ Store ISO strings
- ❌ Compare mixed types → ✅ Compare ISO strings

### Service Method Additions
- When adding new methods to services, server restart required
- Python modules are cached until restart

## Development Workflow

### 1. Adding New Features
1. Create/update model in `models/{feature}.py`
2. Implement service in `services/{feature}_service.py`
3. Add admin routes in `routes/admin/{feature}.py`
4. Add API endpoints in `api/v1/admin/{feature}/__init__.py`
5. Update admin router includes in `routes/admin/__init__.py`
6. Test through browser (admin panel) or authenticated requests

### 2. Database Operations
- Always use async/await with Motor
- Check database connection before operations
- Use proper error handling and logging
- Format responses for API consistency

### 3. Authentication Requirements
- All admin endpoints must use auth dependencies
- Student endpoints use different auth methods
- Cannot bypass auth for testing - use proper login flow

## URLs & Access Points
- **Backend API**: http://127.0.0.1:8000
- **Frontend**: http://127.0.0.1:3000  
- **Admin Panel**: http://127.0.0.1:8000/admin/ (requires login)
- **API Docs**: http://127.0.0.1:8000/docs (Swagger UI)
- **API Base**: http://127.0.0.1:8000/api/v1/

## Current Focus Areas
- Venue management system (recently implemented)
- Authentication and permissions
- Event management enhancement
- Student registration workflows
- Certificate generation system

---

*Instructions for GitHub Copilot working on CampusConnect codebase*
*Last Updated: July 6, 2025*