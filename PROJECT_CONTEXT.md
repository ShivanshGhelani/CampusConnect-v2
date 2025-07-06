# CampusConnect - Project Context & Development Notes

## Project Overview
CampusConnect is a comprehensive campus management system built with FastAPI (backend) and modern frontend technologies. It handles student registrations, event management, venue booking, certificate generation, and administrative functions.

## Tech Stack
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (with Motor async driver)
- **Frontend**: React/Vue (in `/frontend` directory)
- **Authentication**: Session-based auth with role-based permissions
- **File Storage**: Local filesystem with organized asset management

## Project Structure
```
backend/
├── main.py                 # FastAPI app entry point
├── config/                 # Database and app configuration
├── models/                 # Pydantic models for data validation
├── services/               # Business logic layer
├── routes/                 # API endpoints organized by feature
│   ├── admin/             # Admin panel routes
│   ├── client/            # Student/public routes
│   └── auth/              # Authentication routes
├── api/                   # Versioned API endpoints
│   └── v1/
│       ├── admin/         # Admin API endpoints
│       └── client/        # Client API endpoints
├── dependencies/          # FastAPI dependencies (auth, etc.)
├── utils/                 # Utility functions
├── templates/             # Jinja2 templates
└── static/               # Static files (CSS, JS, images)

frontend/
├── src/                  # Frontend source code
├── public/               # Public assets
└── package.json          # Frontend dependencies
```

## Key Features Implemented

### 1. Authentication System
- **Location**: `dependencies/auth.py`, `routes/auth.py`
- **Admin Roles**: SUPER_ADMIN, EXECUTIVE_ADMIN, EVENT_ADMIN, CONTENT_ADMIN
- **Functions Available**:
  - `require_admin()` - Basic admin authentication
  - `require_super_admin_access()` - Super admin only
  - `require_executive_admin_or_higher()` - Executive+ access
  - `get_current_student()` - Student authentication

### 2. Venue Management System (Recently Implemented)
- **Service**: `services/venue_service.py`
- **Routes**: `routes/admin/venues.py` and `api/v1/admin/venues/__init__.py`
- **Model**: `models/venue.py`
- **Features**:
  - CRUD operations for venues
  - Venue booking system
  - Statistics and reporting
  - Flexible update system for partial updates

### 3. Event Management
- **Location**: `routes/admin/events.py`, `api/v1/admin/events/`
- **Features**: Event creation, registration management, certificate generation

### 4. Student Management
- **Location**: `routes/admin/students.py`
- **Features**: Student data management, registration tracking

## Database Collections

### MongoDB Collections Used:
1. **venues** - Venue information
2. **venue_bookings** - Venue booking records
3. **events** - Event data
4. **students** - Student information
5. **registrations** - Event registrations
6. **admin_users** - Administrative users

## Development Commands

### Server Management
```bash
# Start development server
cd s:\Projects\ClgCerti\CampusConnect\backend
python main.py

# Test imports
python -c "import main; print('Import successful')"

# Check specific module
python -c "from services.venue_service import venue_service; print('Service imported')"
```

### API Testing Commands (PowerShell)
```powershell
# Get venues list
Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/v1/admin/venues/" -Headers @{"accept"="application/json"}

# Get venue statistics
Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/v1/admin/venues/stats/overview" -Headers @{"accept"="application/json"}

# Delete venue
Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/v1/admin/venues/{venue_id}" -Method DELETE -Headers @{"accept"="application/json"}

# Update venue
Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/v1/admin/venues/{venue_id}" -Method PUT -Headers @{"accept"="application/json"; "Content-Type"="application/json"} -Body '{"venue_name":"Updated Name"}'
```

## Recent Development History

### Latest Session (July 6, 2025)
1. **Issue**: 404 error on `/api/v1/admin/venues/stats/overview` endpoint
2. **Solution**: 
   - Added missing venue routes in `routes/admin/venues.py`
   - Fixed import error (`get_current_admin_user` → `require_admin`)
   - Added missing `get_statistics()` method to `VenueService`
   - Implemented comprehensive venue management system

3. **Features Added**:
   - Venue CRUD operations
   - Venue deletion with validation
   - Flexible venue updates
   - Venue statistics endpoint
   - Venue booking system

## Known Issues & Solutions

### Common Import Errors
- **Error**: `ImportError: cannot import name 'get_current_admin_user'`
- **Solution**: Use `require_admin` instead from `dependencies.auth`

### Authentication Field Access
- **Issue**: Accessing `current_admin["user_id"]` fails
- **Solution**: Use `current_admin.username` (AdminUser model uses username, not user_id)

### DateTime Handling
- **Issue**: MongoDB datetime comparison errors
- **Solution**: Store dates as ISO strings for consistency

### Server Restart Required
- **When**: After adding new methods to service classes
- **Why**: Python modules are cached, need restart to reload

## File Patterns & Conventions

### Service Classes
- Location: `services/{feature}_service.py`
- Pattern: Async methods, MongoDB operations
- Singleton: Create instance at bottom of file

### Route Files
- Admin routes: `routes/admin/{feature}.py`
- API routes: `api/v1/admin/{feature}/__init__.py`
- Always include proper dependencies and error handling

### Models
- Location: `models/{feature}.py`
- Use Pydantic models for validation
- Separate Create/Update/Response models

## Environment Setup
- **Development URL**: http://127.0.0.1:8000
- **Admin Panel**: Available at `/admin/`
- **API Docs**: Available at `/docs` (Swagger UI)
- **Database**: MongoDB (connection configured in `config/database.py`)

## Next Steps / TODO
- [ ] Test venue statistics endpoint after server restart
- [ ] Implement venue booking conflict resolution
- [ ] Add venue availability calendar
- [ ] Enhance venue search and filtering
- [ ] Add venue capacity management
- [ ] Implement venue maintenance scheduling

## Quick Reference - Key Functions

### Venue Service (`services/venue_service.py`)
- `create_venue(venue_data)` - Create new venue
- `get_venues(filters)` - Get venues with optional filtering  
- `get_venue_by_id(venue_id)` - Get specific venue
- `update_venue_flexible(venue_id, data)` - Flexible partial updates
- `delete_venue(venue_id)` - Delete venue with validation
- `get_statistics()` - Get venue statistics
- `create_booking(venue_id, booking_data)` - Create venue booking

### Authentication (`dependencies/auth.py`)
- `require_admin()` - Basic admin auth
- `require_super_admin_access()` - Super admin only
- `require_executive_admin_or_higher()` - Executive+ access
- `get_current_student()` - Student auth

## Database Connection
- **Service**: Uses `config.database.Database.get_database()`
- **Pattern**: Always check if db is None before operations
- **Collections**: Use string names, not direct references

---

*Last Updated: July 6, 2025*
*Current Focus: Venue Management System Implementation*
