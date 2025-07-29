# CampusConnect API Integration Guide

## Overview
This document provides comprehensive documentation for the CampusConnect frontend API integration. The system integrates with **87+ backend endpoints** organized into authentication, client, and admin APIs.

## API Configuration

### Base Configuration
**File**: `src/api/axios.js`

```javascript
// API Base URL Configuration
const getApiBaseUrl = () => {
  const envApiUrl = import.meta.env.VITE_API_BASE_URL;
  return envApiUrl || 'http://localhost:8000';
};

// Axios Instance Configuration
const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,  // Required for session cookies
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### Authentication Method
- **Session-based authentication** using HTTP cookies
- **No token storage** in localStorage for security
- **Automatic credential handling** via `withCredentials: true`

## API Categories

## 🔐 Authentication APIs (`/api/v1/auth/`)

### Student Authentication
```javascript
// Login
authAPI.studentLogin({ enrollment_no, password })

// Register
authAPI.studentRegister({ 
  enrollment_no, 
  password, 
  full_name, 
  email,
  phone_number,
  department,
  year_of_study 
})

// Check status
authAPI.studentStatus()

// Logout
authAPI.studentLogout()
```

### Faculty Authentication
```javascript
// Login
authAPI.facultyLogin({ employee_id, password })

// Register
authAPI.facultyRegister({ 
  employee_id, 
  password, 
  full_name, 
  email,
  phone_number,
  department,
  designation 
})

// Check status
authAPI.facultyStatus()

// Logout
authAPI.facultyLogout()
```

### Admin Authentication
```javascript
// Login
authAPI.adminLogin({ username, password })

// Check status
authAPI.adminStatus()

// Logout
authAPI.adminLogout()
```

## 👥 Client APIs (`/api/v1/client/`)

### Event Management
```javascript
// Get all events with filters
clientAPI.getEvents({ 
  category: 'technical',
  status: 'upcoming',
  search: 'hackathon' 
})

// Get specific event details
clientAPI.getEventDetails(eventId)

// Get event categories
clientAPI.getEventCategories()

// Search events
clientAPI.searchEvents('hackathon', { category: 'technical' })

// Get upcoming events
clientAPI.getUpcomingEvents({ limit: 10 })
```

### Registration Management
```javascript
// Register for event
clientAPI.registerForEvent(eventId, {
  registration_type: 'individual', // or 'team'
  team_name: 'Team Name', // for team registration
  team_members: [
    { enrollment_no: '123', name: 'John' },
    { enrollment_no: '456', name: 'Jane' }
  ]
})

// Check registration status
clientAPI.getRegistrationStatus(eventId)

// Validate registration data
clientAPI.validateRegistration({ 
  enrollment_no: '123456',
  event_id: eventId 
})

// Validate participant
clientAPI.validateParticipant('123456')

// Check registration conflicts
clientAPI.checkRegistrationConflicts({
  event_id: eventId,
  start_date: '2025-07-29',
  end_date: '2025-07-30'
})

// Cancel registration
clientAPI.cancelRegistration(eventId)
```

### Attendance Management
```javascript
// Mark attendance
clientAPI.markAttendance(eventId, {
  enrollment_no: '123456',
  attendance_code: 'ABC123'
})

// Get attendance status
clientAPI.getAttendanceStatus(eventId)

// Validate attendance form
clientAPI.validateAttendanceForm(eventId)

// Get attendance history
clientAPI.getAttendanceHistory({ 
  enrollment_no: '123456',
  limit: 20 
})
```

### Feedback System
```javascript
// Submit feedback
clientAPI.submitFeedback(eventId, {
  rating: 5,
  comments: 'Great event!',
  suggestions: 'More hands-on sessions',
  categories: {
    content: 5,
    organization: 4,
    venue: 5
  }
})

// Get feedback status
clientAPI.getFeedbackStatus(eventId)

// Get feedback form data
clientAPI.getFeedbackFormData(eventId)

// Get feedback history
clientAPI.getFeedbackHistory({ enrollment_no: '123456' })

// Get feedback analytics
clientAPI.getFeedbackAnalytics(eventId)
```

### Certificate Management
```javascript
// Get certificate data
clientAPI.getCertificateData({
  event_id: eventId,
  enrollment_no: '123456'
})

// Get certificate status
clientAPI.getCertificateStatus(eventId)

// Get certificate template
clientAPI.getCertificateTemplate(eventId)

// Send certificate via email
clientAPI.sendCertificateEmail({
  event_id: eventId,
  enrollment_no: '123456',
  email: 'student@example.com'
})

// Validate certificate access
clientAPI.validateCertificateAccess({
  event_id: eventId,
  enrollment_no: '123456'
})

// Debug certificate (development)
clientAPI.debugCertificate(eventId, '123456')
```

### Profile Management
```javascript
// Get user profile
clientAPI.getProfile()

// Update profile
clientAPI.updateProfile({
  full_name: 'Updated Name',
  email: 'new@example.com',
  phone_number: '+1234567890',
  bio: 'Updated bio'
})

// Get dashboard statistics
clientAPI.getDashboardStats()

// Get event history
clientAPI.getEventHistory({ 
  status: 'completed',
  limit: 10 
})

// Change password
clientAPI.changePassword({
  current_password: 'oldpass',
  new_password: 'newpass',
  confirm_password: 'newpass'
})
```

## 🛠️ Admin APIs (`/api/v1/admin/`)

### Analytics & Dashboard
```javascript
// Get dashboard statistics
adminAPI.getDashboardStats()

// Get events analytics
adminAPI.getEventsAnalytics({ 
  date_from: '2025-01-01',
  date_to: '2025-12-31' 
})

// Get student analytics
adminAPI.getStudentsAnalytics()

// Get registration analytics
adminAPI.getRegistrationsAnalytics({ 
  event_id: eventId 
})

// Get certificate analytics
adminAPI.getCertificatesAnalytics()

// Export analytics data
adminAPI.exportAnalyticsData({ 
  format: 'csv',
  date_range: '2025' 
})

// Get real-time dashboard stats
adminAPI.getDashboardRealTimeStats()
```

### Event Management
```javascript
// Get all events with filters
adminAPI.getEvents({ 
  status: 'active',
  category: 'technical',
  date_from: '2025-07-01' 
})

// Get specific event
adminAPI.getEvent(eventId)

// Create new event
adminAPI.createEvent({
  title: 'New Event',
  description: 'Event description',
  event_type: 'workshop',
  category: 'technical',
  start_date: '2025-08-01',
  end_date: '2025-08-02',
  venue_id: 'venue123',
  max_participants: 100,
  registration_deadline: '2025-07-25'
})

// Update event
adminAPI.updateEvent(eventId, {
  title: 'Updated Event Title',
  max_participants: 150
})

// Delete event
adminAPI.deleteEvent(eventId)

// Get event registrations
adminAPI.getEventRegistrations(eventId, { 
  status: 'confirmed',
  page: 1,
  limit: 50 
})

// Export event data
adminAPI.exportEventData(eventId, {
  format: 'excel',
  include_registrations: true,
  include_attendance: true
})

// Bulk update event status
adminAPI.bulkUpdateEventStatus({
  event_ids: [eventId1, eventId2],
  status: 'cancelled'
})
```

### Student Management
```javascript
// Get all students with filters
adminAPI.getStudents({ 
  department: 'Computer Science',
  year: 2024,
  status: 'active' 
})

// Get student details
adminAPI.getStudentDetails('123456')

// Update student
adminAPI.updateStudent('123456', {
  full_name: 'Updated Name',
  email: 'updated@example.com',
  phone_number: '+1234567890'
})

// Create new student
adminAPI.createStudent({
  enrollment_no: '789012',
  full_name: 'New Student',
  email: 'new@example.com',
  department: 'Computer Science',
  year_of_study: 2
})

// Bulk import students
adminAPI.bulkImportStudents({
  students: [
    { enrollment_no: '111', name: 'Student 1' },
    { enrollment_no: '222', name: 'Student 2' }
  ]
})

// Get student statistics
adminAPI.getStudentStatistics()

// Toggle student status
adminAPI.toggleStudentStatus('123456')

// Update student status
adminAPI.updateStudentStatus('123456', { 
  status: 'inactive' 
})
```

### Faculty Management
```javascript
// Get all faculty
adminAPI.getFaculty({ 
  department: 'Computer Science',
  status: 'active' 
})

// Get faculty details
adminAPI.getFacultyDetails('FAC001')

// Create faculty
adminAPI.createFaculty({
  employee_id: 'FAC002',
  full_name: 'New Faculty',
  email: 'faculty@example.com',
  department: 'Computer Science',
  designation: 'Professor'
})

// Update faculty
adminAPI.updateFaculty('FAC001', {
  designation: 'Associate Professor'
})

// Delete faculty
adminAPI.deleteFaculty('FAC001')

// Toggle faculty status
adminAPI.toggleFacultyStatus('FAC001')

// Get faculty statistics
adminAPI.getFacultyStatistics()

// Bulk import faculty
adminAPI.bulkImportFaculty({
  faculty: [
    { employee_id: 'FAC003', name: 'Faculty 1' }
  ]
})

// Export faculty data
adminAPI.exportFaculty({ format: 'csv' })
```

### Certificate Management
```javascript
// Get certificates list
adminAPI.getCertificatesList({ 
  event_id: eventId,
  status: 'issued' 
})

// Get event certificates
adminAPI.getEventCertificates(eventId)

// Bulk issue certificates
adminAPI.bulkIssueCertificates({
  event_id: eventId,
  participant_ids: ['123456', '789012'],
  template_id: 'template123'
})

// Revoke certificate
adminAPI.revokeCertificate('cert123')

// Get certificate templates
adminAPI.getCertificateTemplates()

// Get certificate statistics
adminAPI.getCertificateStatistics()
```

### User Management (Admin Users)
```javascript
// Get admin users
adminAPI.getAdminUsers({ role: 'admin' })

// Get admin user details
adminAPI.getAdminUserDetails('admin_user')

// Create admin user
adminAPI.createAdminUser({
  username: 'new_admin',
  password: 'secure_password',
  role: 'admin',
  full_name: 'New Admin',
  email: 'admin@example.com'
})

// Update admin user
adminAPI.updateAdminUser('admin_user', {
  role: 'super_admin'
})

// Delete admin user
adminAPI.deleteAdminUser('admin_user')

// Assign events to admin
adminAPI.assignEventsToAdmin('admin_user', {
  event_ids: [eventId1, eventId2]
})

// Toggle admin status
adminAPI.toggleAdminStatus('admin_user')

// Get admin roles
adminAPI.getAdminRoles()

// Get admin statistics
adminAPI.getAdminStatistics()
```

### Venue Management
```javascript
// Get all venues
venueApi.list({ venue_type: 'auditorium' })

// Get specific venue
venueApi.get(venueId)

// Create venue
venueApi.create({
  name: 'New Auditorium',
  venue_type: 'auditorium',
  capacity: 500,
  location: 'Main Building',
  facilities: ['projector', 'sound_system'],
  is_active: true
})

// Update venue
venueApi.update(venueId, {
  capacity: 600,
  facilities: ['projector', 'sound_system', 'microphone']
})

// Delete venue
venueApi.delete(venueId)

// Get venue statistics
venueApi.getStatistics()

// Get venue bookings
venueApi.getBookings(venueId, { 
  date_from: '2025-07-01',
  date_to: '2025-07-31' 
})

// Book venue
venueApi.book(venueId, {
  event_id: eventId,
  start_datetime: '2025-08-01T10:00:00',
  end_datetime: '2025-08-01T18:00:00',
  purpose: 'Workshop on AI'
})

// Check venue availability
venueApi.checkAvailability(
  venueId,
  '2025-08-01T10:00:00',
  '2025-08-01T18:00:00'
)
```

### Asset Management
```javascript
// Get assets
adminAPI.getAssets('images') // or 'documents', 'certificates'

// Get asset statistics
adminAPI.getAssetStatistics()

// Upload asset
adminAPI.uploadAsset(formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
  onUploadProgress: (progressEvent) => {
    const progress = (progressEvent.loaded / progressEvent.total) * 100;
    console.log(`Upload Progress: ${progress}%`);
  }
})

// Delete asset
adminAPI.deleteAsset('asset123', '/path/to/asset.jpg')
```

### Profile Management (Admin)
```javascript
// Get admin profile
adminAPI.getProfile()

// Update admin profile
adminAPI.updateProfile({
  full_name: 'Updated Admin Name',
  email: 'updated@admin.com'
})

// Update username
adminAPI.updateUsername({
  new_username: 'new_admin_username'
})

// Update password
adminAPI.updatePassword({
  current_password: 'oldpass',
  new_password: 'newpass'
})

// Update settings
adminAPI.updateSettings({
  notifications: true,
  email_alerts: false,
  theme: 'dark'
})
```

## Error Handling

### Axios Interceptors
The API configuration includes comprehensive error handling:

```javascript
// Response Interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      localStorage.removeItem('user_data');
      localStorage.removeItem('user_type');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    
    if (error.response?.status === 403) {
      // Forbidden - insufficient permissions
      console.error('Access denied');
    }
    
    if (error.response?.status >= 500) {
      // Server error
      console.error('Server error');
    }
    
    return Promise.reject(error);
  }
);
```

### Common Error Patterns
```javascript
// Component error handling
const fetchData = async () => {
  try {
    const response = await clientAPI.getEvents();
    setEvents(response.data);
  } catch (error) {
    if (error.response?.status === 404) {
      setError('Events not found');
    } else if (error.response?.status === 500) {
      setError('Server error. Please try again later.');
    } else {
      setError('An unexpected error occurred');
    }
  }
};
```

## Usage Examples

### Authentication Flow
```javascript
// Login component
const handleLogin = async (credentials) => {
  try {
    setLoading(true);
    
    let response;
    if (userType === 'student') {
      response = await authAPI.studentLogin(credentials);
    } else if (userType === 'faculty') {
      response = await authAPI.facultyLogin(credentials);
    } else if (userType === 'admin') {
      response = await authAPI.adminLogin(credentials);
    }
    
    // Handle successful login
    dispatch({
      type: 'LOGIN_SUCCESS',
      payload: {
        user: response.data.user,
        userType: userType
      }
    });
    
    navigate('/dashboard');
    
  } catch (error) {
    setError(error.response?.data?.message || 'Login failed');
  } finally {
    setLoading(false);
  }
};
```

### Data Fetching Pattern
```javascript
// Event list component
const [events, setEvents] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  const fetchEvents = async () => {
    try {
      const response = await clientAPI.getEvents({
        status: 'upcoming',
        limit: 10
      });
      setEvents(response.data.events);
    } catch (error) {
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };
  
  fetchEvents();
}, []);
```

### Form Submission Pattern
```javascript
// Registration component
const handleSubmit = async (formData) => {
  try {
    setSubmitting(true);
    
    const response = await clientAPI.registerForEvent(eventId, {
      registration_type: formData.type,
      team_name: formData.teamName,
      team_members: formData.members
    });
    
    // Handle success
    setSuccess('Registration successful!');
    navigate('/registration-success');
    
  } catch (error) {
    if (error.response?.status === 409) {
      setError('You are already registered for this event');
    } else {
      setError(error.response?.data?.message || 'Registration failed');
    }
  } finally {
    setSubmitting(false);
  }
};
```

## Performance Optimization

### Request Caching
```javascript
// Simple cache implementation
const cache = new Map();

const getCachedData = async (key, fetchFunction) => {
  if (cache.has(key)) {
    return cache.get(key);
  }
  
  const data = await fetchFunction();
  cache.set(key, data);
  return data;
};
```

### Request Cancellation
```javascript
// Cancel requests on component unmount
useEffect(() => {
  const controller = new AbortController();
  
  const fetchData = async () => {
    try {
      const response = await api.get('/api/v1/client/events', {
        signal: controller.signal
      });
      setData(response.data);
    } catch (error) {
      if (error.name !== 'AbortError') {
        setError('Failed to fetch data');
      }
    }
  };
  
  fetchData();
  
  return () => {
    controller.abort();
  };
}, []);
```

---

**API Version**: v1  
**Total Endpoints**: 87+  
**Authentication**: Session-based  
**Base URL**: http://localhost:8000  

*This API integration guide should be updated when new endpoints are added or existing ones are modified.*
