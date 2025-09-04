# Admin API Endpoints - Complete Categorization

## Overview
Comprehensive categorization of all admin-side API endpoints in the CampusConnect backend system.

**Base Path**: `/api/v1/admin`

---

## 1. DASHBOARD & ANALYTICS (3 endpoints)
### Dashboard Management
- `GET /dashboard/recent-activity` - Get recent activity logs for admin dashboard
- `GET /dashboard/activity-summary` - Get activity summary statistics for dashboard
- `GET /analytics/overview` - Get analytics overview with real-time scheduler data

---

## 2. EVENT MANAGEMENT (19 endpoints)
### Core Event Operations
- `POST /events/create` - Create a new event
- `PUT /events/update/{event_id}` - Update existing event details
- `GET /events/details/{event_id}` - Get detailed event information
- `DELETE /events/delete/{event_id}` - Delete an event (with storage cleanup)
- `GET /events/list` - Get paginated list of all events
- `GET /events/stats` - Get event statistics and analytics

### Event Status & Approval
- `GET /events/pending-approval` - Get events pending approval (appears twice in code)
- `POST /events/bulk-update-status` - Bulk update event status for multiple events
- `POST /events/approve/{event_id}` - Approve a pending event
- `POST /events/decline/{event_id}` - Decline/reject a pending event

### Event Data & Analytics
- `GET /events/registrations/{event_id}` - Get event registrations data
- `GET /events/attendance/{event_id}` - Get event attendance data  
- `POST /events/export/{event_id}` - Export event data
- `GET /events/faculty-organizers` - Get faculty organizers list
- `GET /events/faculty-organizers/{employee_id}/assigned-events` - Get events assigned to specific faculty

### Event Notifications
- `POST /events/trigger-pending-notifications` - Trigger pending notifications (appears twice in code)

### Event Feedback System
- `POST /events/feedback/create/{event_id}` - Create feedback form for event
- `GET /events/feedback/form/{event_id}` - Get feedback form for event
- `GET /events/feedback/responses/{event_id}` - Get feedback responses for event
- `GET /events/feedback/analytics/{event_id}` - Get feedback analytics for event
- `DELETE /events/feedback/delete/{event_id}` - Delete feedback form for event

---

## 3. USER MANAGEMENT (6 endpoints)
### User Operations
- `GET /users/list` - Get paginated list of users
- `POST /users/list` - Create/add new user (bulk operations)
- `PUT /users/list` - Update user information (bulk operations)
- `DELETE /users/list/{user_id}` - Soft delete user account
- `PATCH /users/restore/{user_id}` - Restore soft-deleted user
- `DELETE /users/hard-delete/{user_id}` - Permanently delete user

---

## 4. VENUE MANAGEMENT (9 endpoints)
### Venue CRUD Operations
- `GET /venues/` - Get all venues (primary endpoint)
- `GET /venues/list` - Get venues list (alternative endpoint)  
- `GET /venues/all` - Get all venues (comprehensive endpoint)
- `GET /venues/{venue_id}` - Get specific venue details
- `POST /venues/` - Create new venue
- `PUT /venues/{venue_id}` - Update venue information
- `DELETE /venues/{venue_id}` - Soft delete venue
- `POST /venues/{venue_id}/restore` - Restore soft-deleted venue
- `DELETE /venues/{venue_id}/permanent` - Permanently delete venue

---

## 5. ASSET MANAGEMENT (11 endpoints)
### Asset Operations
- `GET /assets/list` - Get list of all assets
- `GET /assets/statistics` - Get asset usage statistics
- `POST /assets/upload` - Upload new asset
- `GET /assets/details/{asset_id}` - Get detailed asset information
- `DELETE /assets/delete/{asset_id}` - Delete asset
- `GET /assets/dashboard` - Get asset management dashboard

### Asset Access & URLs
- `GET /assets/short-url/{asset_id}` - Get short URL for asset
- `GET /assets/image-tag/{asset_id}` - Get HTML image tag for asset
- `GET /assets/s/{short_code}` - Access asset via short code
- `GET /assets/view/{token}` - View asset with token
- `GET /assets/secure/{access_token}` - Secure asset access

---

## 6. ATTENDANCE MANAGEMENT (2 endpoints)
### Attendance Strategy Testing
- `POST /attendance-preview/preview-strategy` - Preview attendance marking strategy
- `POST /attendance-preview/validate-custom-strategy` - Validate custom attendance strategy

---

## 7. PARTICIPATION MANAGEMENT (6 endpoints)
### Participation Operations
- `GET /participation/event/{event_id}/participants` - Get participants for specific event
- `GET /participation/student/{enrollment_no}/participations` - Get student participation history
- `GET /participation/statistics/event/{event_id}` - Get participation statistics for event

### Attendance & Certificates
- `POST /participation/attendance/mark` - Mark individual attendance
- `POST /participation/attendance/bulk-mark` - Bulk mark attendance
- `POST /participation/certificate/issue` - Issue participation certificate

---

## ENDPOINT COUNT SUMMARY

| Category | Count |
|----------|-------|
| Dashboard & Analytics | 3 |
| Event Management | 19 |
| User Management | 6 |
| Venue Management | 9 |
| Asset Management | 11 |
| Attendance Management | 2 |
| Participation Management | 6 |
| **TOTAL ADMIN ENDPOINTS** | **56** |

---

## FUNCTIONALITY BREAKDOWN

### High-Frequency Operations
- Event CRUD (Create, Read, Update, Delete)
- User management with soft/hard delete
- Asset upload and management
- Venue administration

### Specialized Features
- Event feedback system (5 endpoints)
- Faculty organizer management (2 endpoints)
- Attendance strategy preview (2 endpoints)
- Bulk operations for status updates and attendance

### Security Features
- Asset secure access with tokens
- User restoration capabilities
- Permanent deletion safeguards

### Analytics & Monitoring
- Dashboard with real-time data
- Event statistics and analytics
- Participation tracking
- Asset usage statistics

---

## NOTES
1. Some endpoints appear duplicated in the code (e.g., `/events/pending-approval` and `/events/trigger-pending-notifications`)
2. The venue endpoints have multiple variations (/, /list, /all) which might be candidates for consolidation
3. Asset management includes comprehensive URL shortening and secure access features
4. Participation management covers both attendance and certificate issuance workflows

---

**Generated on**: September 4, 2025  
**Total Admin Endpoints Identified**: 56
