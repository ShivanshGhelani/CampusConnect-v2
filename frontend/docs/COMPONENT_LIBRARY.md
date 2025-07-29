# CampusConnect Frontend Component Library

## Overview
This document provides a comprehensive guide to all React components used in the CampusConnect frontend application. Components are organized by functionality and location within the application.

## Component Categories

### 🔐 Authentication Components

#### ProtectedRoute.jsx
**Location**: `src/components/ProtectedRoute.jsx`  
**Purpose**: Route-level authentication guard for protecting sensitive pages  
**Props**:
- `children` (ReactNode) - Components to render when authenticated
- `userType` (string) - Required user type ('admin', 'student', 'faculty')

**Usage**:
```jsx
<ProtectedRoute userType="student">
  <StudentDashboard />
</ProtectedRoute>
```

### 🎨 Layout Components

#### AdminLayout.jsx
**Location**: `src/components/admin/AdminLayout.jsx`  
**Purpose**: Wrapper layout for all administrative pages  
**Features**: Navigation sidebar, header, breadcrumbs

#### Layout.jsx
**Location**: `src/components/client/Layout.jsx`  
**Purpose**: General layout wrapper for client-facing pages  
**Features**: Public navigation, footer, responsive design

#### Navigation.jsx
**Location**: `src/components/client/Navigation.jsx`  
**Purpose**: Main navigation component with role-based menu items  
**Features**: Responsive menu, authentication state awareness, logout functionality

#### TopBanner.jsx
**Location**: `src/components/client/TopBanner.jsx`  
**Purpose**: Header banner component for announcements and branding

### 🖼️ Media Components

#### Avatar.jsx
**Location**: `src/components/common/Avatar.jsx`  
**Purpose**: User avatar display with fallback initials  
**Props**:
- `src` (string) - Avatar image URL
- `alt` (string) - Alt text for image
- `size` (string) - Size variant ('sm', 'md', 'lg', 'xl')
- `initials` (string) - Fallback initials

#### AvatarUpload.jsx
**Location**: `src/components/client/AvatarUpload.jsx`  
**Purpose**: Avatar upload and cropping interface  
**Features**: Image upload, crop functionality, preview, validation

### 📊 Data Display Components

#### EventCard.jsx
**Location**: `src/components/client/EventCard.jsx`  
**Purpose**: Event information display card  
**Features**: Event details, registration status, responsive layout

#### ProfileEventCard.jsx
**Location**: `src/components/client/ProfileEventCard.jsx`  
**Purpose**: User-specific event card with registration info  
**Features**: Registration status, attendance info, certificate access

#### StudentCard.jsx
**Location**: `src/components/admin/StudentCard.jsx`  
**Purpose**: Student information display for admin interface  
**Features**: Student details, status indicators, action buttons

#### FacultyCard.jsx
**Location**: `src/components/admin/FacultyCard.jsx`  
**Purpose**: Faculty information display for admin interface  
**Features**: Faculty details, department info, contact information

### 🔧 Utility Components

#### LoadingSpinner.jsx
**Location**: `src/components/LoadingSpinner.jsx`  
**Purpose**: Loading state indicator  
**Props**:
- `size` (string) - Size variant ('sm', 'md', 'lg')
- `color` (string) - Color theme
- `text` (string) - Optional loading text

#### ScrollToTop.jsx
**Location**: `src/components/common/ScrollToTop.jsx`  
**Purpose**: Automatic page scroll management on route changes

#### DateRangePicker.jsx
**Location**: `src/components/common/DateRangePicker.jsx`  
**Purpose**: Date range selection component  
**Features**: Calendar interface, range validation, time selection

## Page Components

### 🏠 Public Pages

#### Homepage.jsx
**Location**: `src/pages/client/Homepage.jsx`  
**Purpose**: Landing page with event highlights and navigation

#### EventList.jsx
**Location**: `src/pages/client/EventList.jsx`  
**Purpose**: Public event listing with filters and search

#### EventDetail.jsx
**Location**: `src/pages/client/EventDetail.jsx`  
**Purpose**: Detailed event information and registration access

### 🔑 Authentication Pages

#### LoginPage.jsx
**Location**: `src/pages/auth/LoginPage.jsx`  
**Purpose**: Unified login interface for all user types  
**Features**: Role selection, credential validation, session management

#### RegisterPage.jsx
**Location**: `src/pages/auth/RegisterPage.jsx`  
**Purpose**: Student registration interface  
**Features**: Form validation, enrollment number verification, account creation

### 👨‍🎓 Student Pages

#### ProfilePage.jsx
**Location**: `src/pages/client/student/Account/ProfilePage.jsx`  
**Purpose**: Student dashboard and profile overview  
**Features**: Profile display, event history, certificate access

#### EditProfile.jsx
**Location**: `src/pages/client/student/Account/EditProfile.jsx`  
**Purpose**: Student profile editing interface  
**Features**: Form validation, avatar upload, data persistence

#### TeamManagement.jsx
**Location**: `src/pages/client/student/Account/TeamManagement.jsx`  
**Purpose**: Team creation and management for events  
**Features**: Team formation, member invitation, team dissolution

### 👨‍🏫 Faculty Pages

#### FacultyProfilePage.jsx
**Location**: `src/pages/client/faculty/Account/FacultyProfilePage.jsx`  
**Purpose**: Faculty dashboard and profile management

#### FacultyProfileEdit.jsx
**Location**: `src/pages/client/faculty/Account/FacultyProfileEdit.jsx`  
**Purpose**: Faculty profile editing interface

### 🛠️ Administrative Pages

#### Dashboard.jsx
**Location**: `src/pages/admin/Dashboard.jsx`  
**Purpose**: Main administrative dashboard  
**Features**: Real-time statistics, quick actions, system overview

#### Events.jsx
**Location**: `src/pages/admin/Events.jsx`  
**Purpose**: Event management interface  
**Features**: Event listing, creation, editing, analytics

#### Students.jsx
**Location**: `src/pages/admin/Students.jsx`  
**Purpose**: Student management interface  
**Features**: Student listing, editing, bulk operations, statistics

#### Faculty.jsx
**Location**: `src/pages/admin/Faculty.jsx`  
**Purpose**: Faculty management interface  
**Features**: Faculty listing, creation, editing, department management

#### CreateEvent.jsx
**Location**: `src/pages/admin/CreateEvent.jsx`  
**Purpose**: Event creation wizard  
**Features**: Multi-step form, validation, venue selection, schedule management

#### EditEvent.jsx
**Location**: `src/pages/admin/EditEvent.jsx`  
**Purpose**: Event editing interface  
**Features**: Full event modification, registration management, analytics

#### EventDetail.jsx
**Location**: `src/pages/admin/EventDetail.jsx`  
**Purpose**: Detailed event view for administrators  
**Features**: Registration lists, attendance tracking, certificate management

#### Venue.jsx
**Location**: `src/pages/admin/Venue.jsx`  
**Purpose**: Venue management interface  
**Features**: Venue listing, creation, booking management, availability tracking

#### Assets.jsx
**Location**: `src/pages/admin/Assets.jsx`  
**Purpose**: Asset management interface  
**Features**: File upload, organization, deletion, statistics

#### ManageCertificates.jsx
**Location**: `src/pages/admin/ManageCertificates.jsx`  
**Purpose**: Certificate management system  
**Features**: Template management, bulk generation, certificate tracking

#### ManageAdmin.jsx
**Location**: `src/pages/admin/ManageAdmin.jsx`  
**Purpose**: Admin user management  
**Features**: Admin creation, role assignment, permission management

#### SettingsProfile.jsx
**Location**: `src/pages/admin/SettingsProfile.jsx`  
**Purpose**: Admin profile and system settings

#### ExportData.jsx
**Location**: `src/pages/admin/ExportData.jsx`  
**Purpose**: Data export functionality  
**Features**: Multiple format export, filtering, bulk operations

#### EventCreatedSuccess.jsx
**Location**: `src/pages/admin/EventCreatedSuccess.jsx`  
**Purpose**: Success confirmation page after event creation

## Component Development Guidelines

### 🎯 Best Practices

#### Component Structure
```jsx
// Standard component template
import React, { useState, useEffect } from 'react';
import { ComponentName } from './ComponentName';

const ComponentName = ({ prop1, prop2, ...props }) => {
  const [state, setState] = useState(initialState);
  
  useEffect(() => {
    // Side effects
  }, [dependencies]);
  
  return (
    <div className="component-wrapper">
      {/* Component JSX */}
    </div>
  );
};

export default ComponentName;
```

#### Props Documentation
Always document component props:
```jsx
/**
 * ComponentName - Brief description
 * @param {string} prop1 - Description of prop1
 * @param {boolean} prop2 - Description of prop2
 * @param {function} onAction - Callback function
 */
```

#### Error Handling
Implement proper error boundaries:
```jsx
const ComponentName = () => {
  try {
    // Component logic
  } catch (error) {
    console.error('ComponentName error:', error);
    return <ErrorFallback error={error} />;
  }
};
```

### 🎨 Styling Guidelines

#### Tailwind CSS Usage
- Use utility classes for responsive design
- Implement consistent spacing with Tailwind scale
- Follow color palette defined in tailwind.config.js

#### Modal Standards
Always use the standard modal backdrop pattern:
```jsx
<div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200">
  <div className="modal-content">
    {/* Modal content */}
  </div>
</div>
```

#### Button Patterns
```jsx
// Primary button
<button className="btn-primary">Primary Action</button>

// Secondary button
<button className="btn-secondary">Secondary Action</button>

// Danger button
<button className="btn-danger">Delete</button>
```

### 🔄 State Management

#### Local State
Use useState for component-specific state:
```jsx
const [formData, setFormData] = useState({
  field1: '',
  field2: ''
});
```

#### Global State
Use useAuth for authentication state:
```jsx
const { user, userType, isAuthenticated } = useAuth();
```

#### Side Effects
Use useEffect with proper dependencies:
```jsx
useEffect(() => {
  fetchData();
}, [dependency1, dependency2]);
```

### 🚀 Performance Guidelines

#### Avoid Unnecessary Re-renders
```jsx
// Use React.memo for pure components
const MemoizedComponent = React.memo(({ prop1, prop2 }) => {
  return <div>{prop1} {prop2}</div>;
});

// Use useCallback for function props
const handleClick = useCallback(() => {
  // Handle click
}, [dependencies]);
```

#### Lazy Loading
```jsx
// Lazy load heavy components
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

// Use Suspense wrapper
<Suspense fallback={<LoadingSpinner />}>
  <HeavyComponent />
</Suspense>
```

## Testing Guidelines

### Unit Testing
```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import ComponentName from './ComponentName';

test('renders component correctly', () => {
  render(<ComponentName prop1="value" />);
  expect(screen.getByText('Expected Text')).toBeInTheDocument();
});
```

### Integration Testing
```jsx
import { renderWithProviders } from '../test-utils';
import ComponentName from './ComponentName';

test('component integrates with providers', () => {
  renderWithProviders(<ComponentName />);
  // Test interactions
});
```

---

**Last Updated**: July 29, 2025  
**Component Count**: 25+ core components  
**Coverage**: All major application features  

*This component library documentation should be updated as new components are added or existing ones are modified.*
