# CampusConnect - GitHub Copilot Instructions

## Project Overview
CampusConnect is a comprehensive university event management platform with FastAPI backend and React frontend. Features include student event registration, certificate generation with HTML templates, venue management, analytics, and role-based admin system.

## Technology Stack
- **Backend**: FastAPI + MongoDB (Motor async driver) + Python 3.8+
- **Frontend**: React 19 + Vite + Tailwind CSS 4 + Axios
- **Database**: MongoDB (async operations via Motor)
- **Authentication**: Session-based with role hierarchies (Student, Admin, Super Admin)
- **Development**: PowerShell environment, virtual environment (`backend/campusconnect/`)

## Development Workflow

### Server Management
- **Start**: Use `startApp.bat` (launches both frontend:3000 and backend:8000)
- **Backend**: `uvicorn main:app --reload` in activated venv
- **Frontend**: `npm start` via Vite dev server
- **Testing**: All admin endpoints require authentication - use browser admin panel
- **Server Restart**: Required when adding new service methods (Python module caching)

## Core Architecture Patterns

### 1. Service Layer (MongoDB Async)
```python
# services/{feature}_service.py
class FeatureService:
    async def get_database(self) -> AsyncIOMotorDatabase:
        return await Database.get_database("CampusConnect")
    
    async def create_item(self, data: CreateModel) -> Dict[str, Any]:
        try:
            db = await self.get_database()
            if db is None:
                raise Exception("Database connection failed")
            # Use string collection names: "venues", "events", "students"
            result = await db["collection_name"].insert_one(document)
            return formatted_result
        except Exception as e:
            logger.error(f"Error: {e}")
            raise

# Singleton pattern - create instance at bottom
feature_service = FeatureService()
```

### 2. API Route Structure
- **Admin HTML**: `routes/admin/{feature}.py` → Jinja2 templates
- **Admin API**: `api/v1/admin/{feature}/__init__.py` → JSON responses
- **Client API**: `api/v1/client/{feature}/__init__.py` → Student-facing
- **Dependencies**: All admin routes use `Depends(require_admin)` or role-specific variants

### 3. Frontend Certificate System
```jsx
// Certificate editor with HTML template manipulation
// Uses data-editable attributes for dynamic fields
// Export via html2canvas → PNG/PDF
import { extractEditableElements } from '../utils/domUtils';
import { exportFromIframe } from '../utils/exportUtils';

// Modal backdrop standard (ALL modals must use):
<div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200">
```

### 4. Authentication Hierarchy
```python
# dependencies/auth.py - Available functions:
require_admin()                    # Basic admin access
require_super_admin_access()       # Super admin only  
require_executive_admin_or_higher() # Executive+ roles
get_current_student()              # Student session
get_current_admin()                # Admin session

# Admin object has .username field (NOT user_id)
current_admin.username  # ✅ Correct
current_admin.user_id   # ❌ Wrong
```

## Key Project-Specific Patterns

### 1. Certificate Management
- **Templates**: HTML files with `data-editable` attributes for dynamic content
- **Storage**: `frontend/public/templates/` (accessible via `/templates/filename`)
- **Editor**: React component with iframe-based preview + live editing
- **Export**: html2canvas → PNG/PDF download via `utils/exportUtils.js`
- **API**: `certificate_templates.py` handles file upload/management

### 2. Database Operations
```python
# DateTime handling - ALWAYS use ISO strings, never datetime objects
created_at = datetime.utcnow().isoformat()  # ✅ Store as string
comparison = booking_time > "2025-01-01T00:00:00"  # ✅ Compare strings

# MongoDB collections (string names):
await db["venues"].find_one()           # Venue data
await db["venue_bookings"].find()       # Booking records  
await db["events"].insert_one()         # Event management
await db["students"].update_one()       # Student profiles
await db["admin_users"].find()          # Admin accounts
```

### 3. Testing & Debugging
```powershell
# Backend testing (auth required for all admin endpoints)
python -c "import main; print('Imports successful')"

# Cannot test admin endpoints directly - they require session auth
# Use browser: http://localhost:8000/admin/ after login
# API docs: http://localhost:8000/docs (but endpoints still need auth)

# Check server status
netstat -an | Select-String "8000|3000"
```

### 4. Common Issues & Solutions
- **Import Errors**: `get_current_admin_user` → use `require_admin` instead
- **Admin Field**: Use `current_admin.username`, not `user_id`  
- **Service Methods**: Server restart needed when adding new methods
- **Modal Styling**: All modals MUST use `backdrop-blur-sm bg-black/30` background
- **DateTime**: Store/compare ISO strings, not datetime objects

## Critical File Locations

### Backend Structure
- **Entry Point**: `main.py` (FastAPI app with CORS, sessions, route includes)
- **Database**: `config/database.py` (MongoDB Motor client singleton)
- **Services**: `services/{feature}_service.py` (business logic, async MongoDB ops)
- **Auth**: `dependencies/auth.py` (session-based auth dependencies)
- **Models**: `models/{feature}.py` (Pydantic validation models)
- **API**: `api/v1/admin/{feature}/__init__.py` (REST endpoints)
- **HTML Routes**: `routes/admin/{feature}.py` (Jinja2 template rendering)

### Frontend Structure  
- **API Client**: `src/api/axios.js` (complete endpoint documentation + functions)
- **Components**: `src/components/` (reusable UI components)
- **Pages**: `src/pages/admin/` (admin dashboard pages)
- **Utils**: `src/utils/domUtils.js` (certificate editor DOM manipulation)
- **Export**: `src/utils/exportUtils.js` (html2canvas + jsPDF certificate export)
- **Config**: `vite.config.js` (proxy setup, ngrok tunneling)

### Key Examples
- **Service Pattern**: `services/venue_service.py` (complete CRUD with MongoDB)
- **API Pattern**: `api/v1/admin/venues/__init__.py` (protected endpoints)
- **Certificate Editor**: `pages/admin/Editor.jsx` (HTML template editing)
- **Certificate Management**: `pages/admin/ManageCertificates.jsx` (file upload/management)

---

*Updated for CampusConnect v2 - July 15, 2025*
*Focus: Event management, certificate generation, venue booking*