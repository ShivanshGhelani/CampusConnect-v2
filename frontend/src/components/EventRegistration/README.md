# EventRegistration Components

This folder contains reusable EventRegistration components that can be used by both Faculty and Student user types.

## Components

### 1. AlreadyRegistered
Displays registration confirmation details for users who are already registered for an event.

**Features:**
- Registration ID display
- Team information (for team registrations)
- Payment status
- User and event details
- Action buttons (team management, payment, etc.)

### 2. NotRegistered  
Shows the registration page for users who are not registered for an event.

**Features:**
- Event details display
- Registration availability check
- Registration options (individual/team)
- Help section
- Navigation buttons

### 3. RegistrationSuccess
Confirmation page after successful registration.

**Features:**
- Success animation
- Registration confirmation details
- Team information (if applicable)
- Next steps guidance
- Action buttons

### 4. IndividualRegistration
Registration form for individual participants.

**Features:**
- User-specific form fields
- Form validation
- Real-time availability check
- Responsive design

### 5. TeamRegistration
Registration form for team participants.

**Features:**
- Team name input
- Team leader information
- Dynamic participant management
- Real-time enrollment checking
- Team validation

## Usage

### In Student Components
```jsx
import { AlreadyRegistered } from '../../../components/EventRegistration';

const StudentAlreadyRegistered = () => {
  return <AlreadyRegistered userType="student" />;
};
```

### In Faculty Components  
```jsx
import { AlreadyRegistered } from '../../../components/EventRegistration';

const FacultyAlreadyRegistered = () => {
  return <AlreadyRegistered userType="faculty" />;
};
```

## Configuration

Each component accepts a `userType` prop that configures:

### Student Configuration
- Routes: `/student/*`
- Fields: enrollment_no, semester, year_of_study
- Features: team management, payment options
- Target audience: ['students', 'both']

### Faculty Configuration  
- Routes: `/faculty/*`
- Fields: employee_id, designation, experience_years
- Features: event management, attendance marking
- Target audience: ['faculty', 'both']

## Benefits

1. **DRY Principle**: No code duplication between faculty and student sections
2. **Maintainability**: Single source of truth for registration logic
3. **Consistency**: Uniform behavior across user types
4. **Flexibility**: Easy to add new user types or modify existing ones
5. **Testing**: Easier to test one component with different configurations

## File Structure

```
components/EventRegistration/
├── AlreadyRegistered.jsx      # Registration confirmation
├── NotRegistered.jsx          # Registration options
├── RegistrationSuccess.jsx    # Success confirmation  
├── IndividualRegistration.jsx # Individual form
├── TeamRegistration.jsx      # Team form
├── index.js                  # Export file
└── README.md                 # This file
```

## Dependencies

- React Router (useParams, useNavigate, Link)
- AuthContext (useAuth)
- clientAPI (axios)
- ClientLayout
- LoadingSpinner
- FontAwesome icons
- Tailwind CSS

## API Requirements

The components expect these API endpoints:
- `getEventDetails(eventId)`
- `getRegistrationDetails(eventId)`
- `getTeamInfo(eventId)`
- `checkUserExists(identifier)`
- `registerForEvent(data)`
- `registerTeamForEvent(data)`
- `cancelRegistration(eventId)`

## Props

All components accept:
- `userType`: 'student' | 'faculty' (default: 'student')

## Notes

- Components are fully responsive
- Form validation is built-in
- Error handling is comprehensive
- Components follow React best practices
- Tailwind CSS is used for styling
