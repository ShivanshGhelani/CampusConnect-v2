# Admin API Endpoints Documentation

**Complete list of all API endpoints in the `app/v1/admin/` folder**

Generated on: January 2025  
Scope: Backend Admin Panel APIs Only  
Authentication: All endpoints require admin authentication  

---

## 1. Asset Management (`/admin/assets/`)

**File:** `app/v1/admin/assets.py`  
**Purpose:** Comprehensive asset management for admin panel including uploads, secure access, and statistics

### Endpoints:

#### `GET /admin/assets/`
- **Description:** List all assets with filtering, pagination, and search
- **Query Parameters:**
  - `page` (int): Page number for pagination (default: 1)
  - `limit` (int): Items per page (default: 20, max: 100)
  - `asset_type` (str): Filter by asset type (image, video, document, etc.)
  - `search` (str): Search assets by name or tags
- **Response:** Paginated list of assets with metadata

#### `GET /admin/assets/dashboard`
- **Description:** Get assets for admin dashboard display
- **Features:** Optimized for dashboard display with essential metadata
- **Response:** Formatted asset list for dashboard consumption

#### `GET /admin/assets/statistics`
- **Description:** Get comprehensive asset statistics
- **Response:** Total count, storage usage, type breakdown, recent uploads

#### `POST /admin/assets/upload`
- **Description:** Upload new assets with validation and optimization
- **Body:** Multipart form data with file and metadata
- **Features:** 
  - File type validation
  - Size limits enforcement
  - WebP optimization for images
  - Automatic metadata extraction
- **Response:** Upload confirmation with asset details

#### `GET /admin/assets/{asset_id}/secure-url`
- **Description:** Generate secure, time-limited URLs for asset access
- **Parameters:** `asset_id` (string): Asset identifier
- **Response:** Secure URL with expiration time

#### `DELETE /admin/assets/{asset_id}`
- **Description:** Soft delete an asset (admin only)
- **Parameters:** `asset_id` (string): Asset identifier
- **Response:** Deletion confirmation

#### `POST /admin/assets/{asset_id}/restore`
- **Description:** Restore a soft-deleted asset
- **Parameters:** `asset_id` (string): Asset identifier
- **Response:** Restoration confirmation

#### `DELETE /admin/assets/{asset_id}/permanent`
- **Description:** Permanently delete asset from storage (irreversible)
- **Parameters:** `asset_id` (string): Asset identifier
- **Response:** Permanent deletion confirmation

---

## 2. Attendance Preview (`/admin/attendance-preview/`)

**File:** `app/v1/admin/attendance_preview.py`  
**Purpose:** AI-driven attendance strategy preview and validation for event creation workflow

### Endpoints:

#### `POST /admin/attendance-preview/`
- **Description:** Generate attendance strategy preview using AI analysis
- **Body:** Event details for strategy analysis
- **Features:**
  - AI-powered attendance strategy recommendations
  - Considers event type, duration, capacity
  - Provides multiple strategy options
- **Response:** Detailed attendance strategy recommendations

#### `POST /admin/attendance-preview/validate`
- **Description:** Validate custom attendance strategies
- **Body:** Custom attendance strategy configuration
- **Features:**
  - Strategy validation logic
  - Compatibility checks
  - Best practice recommendations
- **Response:** Validation results with suggestions

---

## 3. Certificate Templates (`/admin/certificate-templates/`)

**File:** `app/v1/admin/certificate_templates.py`  
**Purpose:** HTML certificate template management with database storage

### Endpoints:

#### `GET /admin/certificate-templates/`
- **Description:** List certificate templates (root endpoint for frontend compatibility)
- **Response:** Complete list of certificate templates from database

#### `GET /admin/certificate-templates/dashboard`
- **Description:** List certificate templates for dashboard display
- **Response:** Template list optimized for dashboard consumption

#### `GET /admin/certificate-templates/statistics`
- **Description:** Get certificate template statistics
- **Response:** Total templates, categories breakdown, recent uploads

#### `POST /admin/certificate-templates/upload`
- **Description:** Upload new HTML certificate template
- **Body:** Multipart form with HTML file and template metadata
- **Features:**
  - HTML validation
  - Template name sanitization
  - Category assignment
  - File size limits (10MB)
- **Supported Categories:** "Academics", "Events & Fests"
- **Response:** Upload confirmation with template details

#### `DELETE /admin/certificate-templates/{template_id}`
- **Description:** Delete certificate template from database
- **Parameters:** `template_id` (string): Template identifier
- **Response:** Deletion confirmation

#### `GET /admin/certificate-templates/{template_id}/preview`
- **Description:** Get template content for preview
- **Parameters:** `template_id` (string): Template identifier
- **Response:** Template HTML content and metadata

#### `POST /admin/certificate-templates/migrate`
- **Description:** Migrate existing template files to database
- **Response:** Migration results with count of migrated templates

---

## 4. Event Management (`/admin/events/`)

**Folder:** `app/v1/admin/events/`  
**Purpose:** Event approval system and faculty organizer management

### 4.1 Event Approval (`/admin/events/approval/`)

**File:** `app/v1/admin/events/approval.py`

#### `POST /admin/events/approval/approve/{event_id}`
- **Description:** Approve a pending event
- **Parameters:** `event_id` (string): Event identifier
- **Access:** Super Admin and assigned Faculty Organizers
- **Features:**
  - Permission validation
  - Status update to approved
  - Email notification to creator
  - Cache invalidation
  - Event scheduler integration
- **Response:** Approval confirmation with event details

#### `POST /admin/events/approval/decline/{event_id}`
- **Description:** Decline a pending event
- **Parameters:** `event_id` (string): Event identifier
- **Body:** `{"reason": "decline reason"}`
- **Access:** Super Admin and assigned Faculty Organizers
- **Features:**
  - Status update to declined
  - Event deletion from database
  - Faculty assignment removal
  - Email notification to creator
  - Cache invalidation
- **Response:** Decline confirmation with deletion status

### 4.2 Faculty Organizers (`/admin/events/faculty-organizers/`)

**File:** `app/v1/admin/events/faculty_organizers.py`

#### `GET /admin/events/faculty-organizers`
- **Description:** Get faculty members who can be event organizers
- **Query Parameters:**
  - `search` (str): Search by name, email, or employee ID
  - `department` (str): Filter by department
  - `designation` (str): Filter by designation
  - `limit` (int): Max results (1-100, default: 50)
  - `skip` (int): Pagination offset
- **Response:** Paginated faculty organizer list with metadata

#### `GET /admin/events/faculty-organizers/{employee_id}/assigned-events`
- **Description:** Get events assigned to specific faculty organizer
- **Parameters:** `employee_id` (string): Faculty employee identifier
- **Response:** List of assigned event IDs with count

---

## 5. Participation Management (`/admin/participation/`)

**File:** `app/v1/admin/participation_management.py`  
**Purpose:** Admin registration management for events

### Endpoints:

#### `GET /admin/participation/event/{event_id}/participants`
- **Description:** Get all participants for an event (admin-specific formatting)
- **Parameters:** `event_id` (string): Event identifier
- **Query Parameters:**
  - `page` (int): Page number (default: 1)
  - `limit` (int): Items per page (1-200, default: 50)
  - `registration_type` (str): Filter by "individual" or "team"
  - `search` (str): Search participants by name, enrollment, email
- **Response:** Paginated participant list with admin-specific data formatting

#### `POST /admin/participation/attendance/mark`
- **Description:** Mark attendance for a student (admin only)
- **Body:**
  ```json
  {
    "enrollment_no": "string",
    "event_id": "string"
  }
  ```
- **Response:** Attendance marking confirmation

#### `POST /admin/participation/attendance/bulk-mark`
- **Description:** Mark attendance for multiple students
- **Body:**
  ```json
  {
    "event_id": "string",
    "attendance_data": [
      {"enrollment_no": "string"},
      {"enrollment_no": "string"}
    ]
  }
  ```
- **Response:** Bulk attendance results with success/failure summary

#### `POST /admin/participation/certificate/issue`
- **Description:** Issue certificate for a student
- **Body:** Certificate issuance data
- **Status:** Endpoint placeholder - requires implementation
- **Response:** Certificate issuance confirmation

#### `GET /admin/participation/student/{enrollment_no}/participations`
- **Description:** Get participation history for specific student
- **Parameters:** `enrollment_no` (string): Student enrollment number
- **Query Parameters:**
  - `include_details` (bool): Include event details (default: false)
  - `page` (int): Page number
  - `limit` (int): Items per page (1-200)
- **Response:** Paginated student participation history

#### `GET /admin/participation/statistics/event/{event_id}`
- **Description:** Get comprehensive participation statistics for an event
- **Parameters:** `event_id` (string): Event identifier
- **Response:** Detailed event participation statistics

---

## 6. User Management (`/admin/users/`) - **CONSOLIDATED**

**File:** `app/v1/admin/users.py`  
**Purpose:** Comprehensive user management with optimized CRUD operations

### **CONSOLIDATED ENDPOINTS (6 endpoints total - reduced from 12+):**

#### `GET /admin/users/`
- **Description:** **PRIMARY** user listing endpoint with comprehensive filtering
- **Query Parameters:**
  - `user_type` (str): **REQUIRED** - "student", "faculty", or "admin"  
  - `page` (int): Page number (default: 1)
  - `limit` (int): Items per page (1-1000, default: 50)
  - `include_inactive` (bool): Include soft-deleted users
  - `user_id` (str): Fetch specific user by ID
  - `search` (str): Search by name, ID, email
- **Response:** Paginated user list with type-specific formatting
- **Features:** This is now the ONLY user listing endpoint

#### `POST /admin/users/`
- **Description:** **PRIMARY** user creation endpoint (Super Admin only)
- **Body:** Single user object or array for bulk creation
- **Required Fields:**
  - **Student:** `enrollment_no`, `full_name`, `email`, `department`, `user_type`
  - **Faculty:** `employee_id`, `full_name`, `email`, `department`, `user_type`  
  - **Admin:** `username`, `fullname`, `role`, `password`, `user_type`
- **Features:** 
  - Single and bulk creation support
  - Password hashing for all user types
  - Default permissions assignment for admins
  - Standardized metadata tracking
- **Response:** Creation confirmation with user ID(s)

#### `PUT /admin/users/`
- **Description:** **PRIMARY** user update endpoint
- **Body:** User data with `user_id`, `user_type`, and update fields
- **Features:**
  - Field validation
  - Update metadata tracking
  - Supports all user types
- **Response:** Update confirmation

#### `DELETE /admin/users/{user_id}`
- **Description:** **PRIMARY** user deletion endpoint (Super Admin only)
- **Parameters:** 
  - `user_id` (string): User identifier
  - `user_type` (query): **REQUIRED** - "student", "faculty", or "admin"
  - `permanent` (query): Boolean for hard delete (default: false)
- **Features:** 
  - Soft delete by default (sets `is_active` to false)
  - Hard delete with `permanent=true` flag
  - Safety checks prevent deleting active users for permanent deletion
- **Response:** Deletion confirmation

#### `PATCH /admin/users/{user_id}/restore`
- **Description:** **PRIMARY** user restoration endpoint (Super Admin only)
- **Parameters:**
  - `user_id` (string): User identifier  
  - `user_type` (query): **REQUIRED** - "student", "faculty", or "admin"
- **Features:** Restores `is_active` to true and removes deletion metadata
- **Response:** Restoration confirmation

### **COMPATIBILITY ALIASES (3 endpoints - redirect only):**

#### `GET /admin/users/list`
- **Status:** ✅ **Redirects to main endpoint**
- **Purpose:** Backward compatibility for frontend
- **Function:** Redirects to `GET /admin/users/` with same parameters

#### `POST /admin/users/list`
- **Status:** ✅ **Redirects to main endpoint**  
- **Purpose:** Backward compatibility for frontend
- **Function:** Redirects to `POST /admin/users/` with same body

#### `PUT /admin/users/list`
- **Status:** ✅ **Redirects to main endpoint**
- **Purpose:** Backward compatibility for frontend  
- **Function:** Redirects to `PUT /admin/users/` with same body

---

### **REMOVED/DEPRECATED ENDPOINTS:**

#### ❌ **REMOVED:** Enhanced REST endpoints (`/users/users/`)
- All `/admin/users/users/` endpoints have been removed
- Functionality consolidated into main endpoints

#### ❌ **REMOVED:** Individual delete/restore endpoints  
- `DELETE /admin/users/list/{user_id}` - Consolidated into main delete endpoint
- `DELETE /admin/users/hard-delete/{user_id}` - Consolidated with `permanent` flag
- `PATCH /admin/users/restore/{user_id}` - Consolidated into main restore endpoint

#### ❌ **FIXED:** Broken compatibility alias
- Fixed the broken `GET /admin/users/users/list` endpoint that was causing runtime errors

---

### **TECHNICAL IMPROVEMENTS:**

✅ **Fixed Issues:**
- **Collection Name Consistency:** Fixed `faculty` vs `faculties` inconsistency  
- **Metadata Standardization:** All endpoints now use `admin.username` for tracking
- **Parameter Validation:** `user_type` is now required where appropriate
- **Error Handling:** Comprehensive error responses with detailed messages

✅ **Optimizations:**
- **API Surface Reduction:** From 12+ endpoints down to 6 core endpoints  
- **Single Responsibility:** Each endpoint has one clear purpose
- **Bulk Operations:** Supported in main endpoints, not separate endpoints
- **Consistent Responses:** Standardized response format across all endpoints

✅ **Database Operations:**
- **Collections:** `students`, `faculties`, `users` (for admin users)
- **Soft Delete:** Default behavior preserves data integrity
- **Hard Delete:** Available with explicit flag and safety checks  
- **Restoration:** Full restore with metadata cleanup

### **Frontend Integration:**

The frontend `admin.js` has been updated to use only the consolidated endpoints:
- All user operations now use the 6 core endpoints
- Backward compatibility maintained through aliases
- Reduced API complexity for frontend developers
- Consistent parameter patterns across all operations

**Total Endpoints:** 6 core + 3 aliases = **9 endpoints** (reduced from 15+ endpoints)

---

## 7. Venue Management (`/admin/venues/`)

**File:** `app/v1/admin/venues.py`  
**Purpose:** University venue management (no booking system)

### Endpoints:

#### `GET /admin/venues/`
- **Description:** Get venues with optional inactive inclusion
- **Query Parameters:**
  - `include_inactive` (bool): Include inactive venues (default: false)
- **Response:** List of venues sorted by name

#### `GET /admin/venues/list`
- **Description:** Alias for main venues endpoint (frontend compatibility)
- **Query Parameters:** Same as main endpoint
- **Response:** Same as main endpoint

#### `GET /admin/venues/{venue_id}`
- **Description:** Get specific venue by ID
- **Parameters:** `venue_id` (string): Venue identifier
- **Response:** Venue details or 404 if not found

#### `POST /admin/venues/`
- **Description:** Create new venue (admin only)
- **Body:** Venue creation data (`VenueCreate` model)
- **Features:**
  - Auto-generated venue ID
  - Metadata tracking (created_by, created_at)
- **Response:** Creation confirmation with venue ID

#### `PUT /admin/venues/{venue_id}`
- **Description:** Update venue (admin only)
- **Parameters:** `venue_id` (string): Venue identifier
- **Body:** Venue update data (`VenueUpdate` model)
- **Features:**
  - Partial update support
  - Update metadata tracking
- **Response:** Update confirmation

#### `DELETE /admin/venues/{venue_id}`
- **Description:** Soft delete venue (admin only)
- **Parameters:** `venue_id` (string): Venue identifier
- **Features:** Sets `is_active` to false
- **Response:** Soft deletion confirmation

#### `POST /admin/venues/{venue_id}/restore`
- **Description:** Restore soft-deleted venue (admin only)
- **Parameters:** `venue_id` (string): Venue identifier
- **Features:** Restores `is_active` to true
- **Response:** Restoration confirmation

#### `DELETE /admin/venues/{venue_id}/permanent`
- **Description:** Permanently delete venue from database (admin only)
- **Parameters:** `venue_id` (string): Venue identifier
- **Warning:** IRREVERSIBLE operation
- **Response:** Permanent deletion confirmation

---

## Summary by Category

### Core Admin Operations (35+ endpoints):
- **Asset Management:** 8 endpoints - Upload, list, secure access, statistics
- **User Management:** 15+ endpoints - CRUD operations, bulk support, soft delete
- **Event Approval:** 2 endpoints - Approve/decline with notifications
- **Venue Management:** 8 endpoints - CRUD with soft delete support

### Specialized Features:
- **Attendance Systems:** AI-powered strategy preview and bulk attendance marking
- **Certificate Management:** HTML template upload and preview system
- **Faculty Organizers:** Faculty assignment and event management
- **Participation Tracking:** Comprehensive student participation analytics

### Technical Features:
- **Authentication:** All endpoints require admin authentication
- **Pagination:** Most list endpoints support pagination
- **Search & Filtering:** Advanced search and filtering capabilities  
- **Soft Delete:** Most delete operations are reversible
- **Bulk Operations:** Support for bulk create, update, and delete
- **Error Handling:** Comprehensive error responses with detailed messages
- **Logging:** Extensive logging for audit trails
- **Cache Management:** Redis cache integration with invalidation

### Database Collections:
- `assets` - Asset storage and metadata
- `venues` - University venues
- `students` - Student user accounts
- `faculties` - Faculty user accounts  
- `users` - Admin user accounts
- `events` - Event management
- `student_registrations` - Event participation tracking
- `certificate_templates` - HTML certificate templates

### Permission Levels:
- **Admin:** Basic admin access to most endpoints
- **Super Admin:** Full access including user creation/deletion
- **Faculty Organizer:** Event approval for assigned events

This documentation covers all 35+ API endpoints found in the `app/v1/admin/` folder with their complete functionality, parameters, and features.
