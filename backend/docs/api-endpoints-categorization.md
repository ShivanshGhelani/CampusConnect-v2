# API Endpoints Categorization & Consolidation Analysis
## Strategic Reduction Plan for CampusConnect API

**Current Status:** 149 endpoints after Phase 3 consolidation
**Goal:** Strategic categorization for further endpoint reduction opportunities

---

## 1. AUTHENTICATION & SESSION MANAGEMENT (17 endpoints)
### Core Auth Operations
- `POST /api/v1/auth/login` - Main login endpoint
- `POST /api/v1/auth/logout` - Main logout endpoint  
- `GET /api/v1/auth/status` - Authentication status check
- `GET /api/v1/auth/profile` - Get user profile information

### Registration & Onboarding
- `POST /api/v1/auth/register/student` - Student registration
- `POST /api/v1/auth/register/faculty` - Faculty registration
- `POST /api/v1/auth/faculty/complete-registration` - Complete faculty onboarding
- `GET /api/v1/auth/faculty/registration-status` - Check faculty reg status

### Password Management
- `POST /api/v1/auth/password/forgot` - Initiate password reset
- `POST /api/v1/auth/password/reset` - Complete password reset
- `GET /api/v1/auth/password/verify-token/{token}` - Verify reset token

### Redirects & Navigation
- `GET /api/v1/auth/redirect/student-dashboard` - Student dashboard redirect
- `GET /api/v1/auth/redirect/admin-dashboard` - Admin dashboard redirect
- `GET /api/v1/auth/redirect/faculty-dashboard` - Faculty dashboard redirect
- `POST /api/v1/auth/redirect/handle-login` - Handle login redirection
- `GET /api/v1/auth/redirect/handle-logout` - Handle logout redirection
- `GET /api/v1/auth/redirect/login-page` - Login page redirect

**CONSOLIDATION OPPORTUNITIES:**
- **Redirect endpoints (6)** → Could be handled client-side or unified into 1-2 endpoints
- **Registration endpoints (4)** → Could merge faculty registration flows
- **Profile management** → Could integrate with client profile endpoints

---

## 2. CLIENT-FACING APIs (37 endpoints)
### Event Discovery & Information
- `GET /api/v1/client/events/available` - Available events listing
- `GET /api/v1/client/events/categories` - Event categories
- `GET /api/v1/client/events/calendar` - Calendar view
- `GET /api/v1/client/events/{event_id}` - Event details
- `GET /api/v1/client/events/{event_id}/brochure` - Event brochure
- `GET /api/v1/client/events/{event_id}/requirements` - Event requirements
- `GET /api/v1/client/events/{event_id}/stats` - Basic event statistics

### Event Registration & Management
- `POST /api/v1/client/registration/register` - Event registration
- `GET /api/v1/client/registration/status/{event_id}` - Registration status
- `POST /api/v1/client/registration/cancel/{event_id}` - Cancel registration
- `GET /api/v1/client/registration/history` - Registration history
- `GET /api/v1/client/registration/upcoming` - Upcoming registrations
- `GET /api/v1/client/registration/summary/{event_id}` - Registration summary
- `GET /api/v1/client/registration/certificate/{event_id}` - Get certificate

### User Profile Management
- `GET /api/v1/client/profile/me` - User profile details
- `PUT /api/v1/client/profile/update` - Update profile
- `POST /api/v1/client/profile/upload-photo` - Upload profile photo
- `GET /api/v1/client/profile/photo/{user_id}` - Get profile photo
- `DELETE /api/v1/client/profile/photo` - Delete profile photo

### Event Feedback & Interaction
- `GET /api/v1/client/feedback/form/{event_id}` - Get feedback form
- `POST /api/v1/client/feedback/submit/{event_id}` - Submit feedback
- `GET /api/v1/client/feedback/thank-you/{event_id}` - Thank you page

### Venue Information
- `GET /api/v1/client/venues/` - List venues
- `GET /api/v1/client/venues/list` - Alternative venue list
- `GET /api/v1/client/venues/{venue_id}` - Venue details

### Dashboard & Activity
- `GET /api/v1/client/dashboard/stats` - Dashboard statistics
- `GET /api/v1/client/dashboard/recent-events` - Recent events
- `GET /api/v1/client/dashboard/upcoming-events` - Upcoming events
- `GET /api/v1/client/dashboard/activity-feed` - Activity feed

### Navigation & Redirects
- `GET /api/v1/client/redirect/dashboard` - Dashboard redirect
- `GET /api/v1/client/redirect/profile` - Profile redirect
- `GET /api/v1/client/redirect/events` - Events redirect
- `GET /api/v1/client/redirect/registration-history` - History redirect
- `GET /api/v1/client/redirect/feedback/{event_id}` - Feedback redirect
- `GET /api/v1/client/redirect/certificate/{event_id}` - Certificate redirect

**CONSOLIDATION OPPORTUNITIES:**
- **Venue endpoints (3)** → Duplicate functionality with admin venues
- **Dashboard endpoints (4)** → Could merge into single dashboard API
- **Redirect endpoints (6)** → Should be handled client-side
- **Profile photo endpoints (3)** → Could consolidate upload/delete operations

---

## 3. ADMIN MANAGEMENT APIS (69 endpoints)
### 3A. Event Management (22 endpoints)
#### Core Event Operations
- `GET /api/v1/admin/events/list` - List all events
- `POST /api/v1/admin/events/create` - Create new event
- `GET /api/v1/admin/events/{event_id}` - Get event details
- `PUT /api/v1/admin/events/{event_id}` - Update event
- `DELETE /api/v1/admin/events/{event_id}` - Delete event

#### Event Status Management
- `POST /api/v1/admin/events/{event_id}/publish` - Publish event
- `POST /api/v1/admin/events/{event_id}/draft` - Set to draft
- `POST /api/v1/admin/events/{event_id}/archive` - Archive event
- `POST /api/v1/admin/events/{event_id}/restore` - Restore event

#### Registration Management
- `GET /api/v1/admin/events/{event_id}/registrations` - Event registrations
- `POST /api/v1/admin/events/{event_id}/approve-registration/{registration_id}` - Approve registration
- `POST /api/v1/admin/events/{event_id}/reject-registration/{registration_id}` - Reject registration
- `GET /api/v1/admin/events/{event_id}/export/registrations` - Export registrations

#### Analytics & Reporting
- `GET /api/v1/admin/events/{event_id}/stats` - Event statistics
- `GET /api/v1/admin/events/{event_id}/analytics` - Detailed analytics
- `GET /api/v1/admin/events/{event_id}/export/analytics` - Export analytics

#### Feedback Management
- `POST /api/v1/admin/events/feedback/create/{event_id}` - Create feedback form
- `GET /api/v1/admin/events/feedback/{event_id}` - Get feedback form
- `PUT /api/v1/admin/events/feedback/update/{event_id}` - Update feedback form
- `GET /api/v1/admin/events/feedback/responses/{event_id}` - Feedback responses
- `GET /api/v1/admin/events/feedback/analytics/{event_id}` - Feedback analytics  
- `DELETE /api/v1/admin/events/feedback/delete/{event_id}` - Delete feedback form

### 3B. Asset Management (12 endpoints)
#### Core Asset Operations
- `GET /api/v1/admin/assets/list` - List assets
- `GET /api/v1/admin/assets/statistics` - Asset statistics
- `POST /api/v1/admin/assets/upload` - Upload asset
- `GET /api/v1/admin/assets/details/{asset_id}` - Asset details
- `DELETE /api/v1/admin/assets/delete/{asset_id}` - Delete asset

#### Asset Access & Sharing
- `GET /api/v1/admin/assets/short-url/{asset_id}` - Generate short URL
- `GET /api/v1/admin/assets/image-tag/{asset_id}` - HTML image tag
- `GET /api/v1/admin/assets/s/{short_code}` - Short URL redirect
- `GET /api/v1/admin/assets/view/{token}` - View via token
- `GET /api/v1/admin/assets/secure/{access_token}` - Secure asset access

#### Legacy Support
- `GET /api/v1/admin/assets/dashboard` - Legacy dashboard redirect

### 3C. Venue Management (9 endpoints)
- `GET /api/v1/admin/venues/` - List active venues
- `POST /api/v1/admin/venues/` - Create venue
- `GET /api/v1/admin/venues/list` - Alternative venue list
- `GET /api/v1/admin/venues/all` - List all venues
- `GET /api/v1/admin/venues/{venue_id}` - Venue details
- `PUT /api/v1/admin/venues/{venue_id}` - Update venue
- `DELETE /api/v1/admin/venues/{venue_id}` - Soft delete venue
- `POST /api/v1/admin/venues/{venue_id}/restore` - Restore venue
- `DELETE /api/v1/admin/venues/{venue_id}/permanent` - Hard delete venue

### 3D. User Management (7 endpoints)
- `GET /api/v1/admin/users/list` - List users
- `POST /api/v1/admin/users/list` - Create user
- `PUT /api/v1/admin/users/list` - Update user
- `DELETE /api/v1/admin/users/list/{user_id}` - Soft delete user
- `PATCH /api/v1/admin/users/restore/{user_id}` - Restore user
- `DELETE /api/v1/admin/users/hard-delete/{user_id}` - Hard delete user

### 3E. Attendance & Participation (8 endpoints)
- `POST /api/v1/admin/attendance-preview/preview-strategy` - Preview attendance strategy
- `POST /api/v1/admin/attendance-preview/validate-custom-strategy` - Validate strategy
- `GET /api/v1/admin/participation/event/{event_id}/participants` - Event participants
- `POST /api/v1/admin/participation/attendance/mark` - Mark attendance
- `POST /api/v1/admin/participation/attendance/bulk-mark` - Bulk mark attendance
- `POST /api/v1/admin/participation/certificate/issue` - Issue certificate
- `GET /api/v1/admin/participation/student/{enrollment_no}/participations` - Student history
- `GET /api/v1/admin/participation/statistics/event/{event_id}` - Participation stats

### 3F. Dashboard & Analytics (3 endpoints)
- `GET /api/v1/admin/dashboard/recent-activity` - Recent activity
- `GET /api/v1/admin/dashboard/activity-summary` - Activity summary
- `GET /api/v1/admin/analytics/overview` - Analytics overview

**CONSOLIDATION OPPORTUNITIES:**
- **Venue endpoints (9)** → Duplicate list endpoints, could reduce to 6
- **Asset access endpoints (5)** → Multiple ways to access same assets
- **User management** → CRUD operations could be simplified
- **Dashboard endpoints** → Could merge into single dashboard API

---

## 4. EMAIL SERVICE APIs (3 endpoints)
- `GET /api/v1/email/health` - Health check
- `GET /api/v1/email/stats` - Statistics
- `POST /api/v1/email/circuit-breaker/reset` - Reset circuit breaker

**STATUS:** ✅ Already optimized after Phase 3D cleanup

---

## 5. ORGANIZER ACCESS APIS (11 endpoints)
### Portal Access & Navigation
- `GET /api/v1/organizer` - Root redirect
- `GET /api/v1/organizer/` - Root redirect with slash
- `GET /api/v1/organizer/dashboard` - Dashboard redirect
- `GET /api/v1/organizer/events` - Events redirect

### Access Management
- `POST /api/v1/organizer/request-access` - Request access
- `GET /api/v1/organizer/access-status` - Check access status
- `POST /api/v1/organizer/access-portal` - Access portal

### Admin Access Control
- `POST /api/v1/organizer/admin/grant-access/{faculty_employee_id}` - Grant access
- `POST /api/v1/organizer/admin/revoke-access/{faculty_employee_id}` - Revoke access
- `GET /api/v1/organizer/admin/requests` - List requests
- `GET /api/v1/organizer/dashboard-stats` - Dashboard stats

**CONSOLIDATION OPPORTUNITIES:**
- **Navigation redirects (4)** → Should be client-side routing
- **Access management** → Could streamline the access flow

---

## 6. SYSTEM & UTILITY APIS (8 endpoints)
### Health & Debugging
- `GET /api/health` - API health check
- `GET /health/scheduler` - Scheduler health

### Static File Serving
- `GET /` - Root redirect
- `GET /favicon.ico` - Favicon
- `GET /event-categories` - Event categories redirect
- `GET /logo/{filename}` - Serve logo files
- `GET /signature/{path}` - Serve signature files

**CONSOLIDATION OPPORTUNITIES:**
- **Debug endpoints (3)** → Should be removed in production
- **Static file serving** → Could be handled by web server
- **Root redirects** → Could be simplified

---

## STRATEGIC REDUCTION RECOMMENDATIONS

### Phase 4A: Redirect Consolidation (Target: -20 endpoints)
1. **Auth Redirects** (6 endpoints) → Replace with client-side routing
2. **Client Redirects** (6 endpoints) → Replace with client-side routing  
3. **Organizer Redirects** (4 endpoints) → Replace with client-side routing
4. **System Redirects** (4 endpoints) → Simplify to essential redirects only

### Phase 4B: Duplicate API Consolidation (Target: -12 endpoints)
1. **Venue APIs** → Merge client and admin venue endpoints (3 reductions)
2. **Dashboard APIs** → Consolidate dashboard endpoints across modules (5 reductions)
3. **Asset Access** → Simplify asset access methods (2 reductions)
4. **Registration APIs** → Merge similar registration endpoints (2 reductions)

### Phase 4C: Debug & Development Cleanup (Target: -8 endpoints)
1. **Debug endpoints** (3 endpoints) → Remove in production
2. **Legacy endpoints** (2 endpoints) → Remove asset dashboard, etc.
3. **Redundant health checks** (1 endpoint) → Consolidate health endpoints
4. **Test/Development endpoints** (2 endpoints) → Remove session test endpoints

### Phase 4D: API Method Consolidation (Target: -15 endpoints)
1. **CRUD Simplification** → Merge similar operations where possible
2. **Status Management** → Unify event status change endpoints
3. **Export Operations** → Consolidate export endpoints
4. **Feedback Management** → Streamline feedback CRUD operations

## PROJECTED FINAL COUNT: ~94 ENDPOINTS
**Total Reduction Goal: 55 endpoints (149 → 94)**
- Phase 4A: -20 endpoints (redirects)
- Phase 4B: -12 endpoints (duplicates) 
- Phase 4C: -8 endpoints (cleanup)
- Phase 4D: -15 endpoints (consolidation)

---

## IMPLEMENTATION PRIORITY
1. **High Impact, Low Risk:** Phase 4A (redirect removal)
2. **Medium Impact, Medium Risk:** Phase 4C (debug cleanup)
3. **High Impact, Medium Risk:** Phase 4B (duplicate consolidation)
4. **High Impact, High Risk:** Phase 4D (method consolidation)

This categorization provides a strategic roadmap for aggressive API reduction while maintaining all essential functionality.
