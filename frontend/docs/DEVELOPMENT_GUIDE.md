# CampusConnect Frontend Development Guide

## Quick Start

### Prerequisites
- **Node.js** 18+ with npm
- **Git** for version control
- **VS Code** (recommended) with extensions:
  - ES7+ React/Redux/React-Native snippets
  - Tailwind CSS IntelliSense
  - Auto Rename Tag
  - Bracket Pair Colorizer

### Setup
```bash
# Clone repository
git clone https://github.com/ShivanshGhelani/CampusConnect-v2.git
cd CampusConnect-v2/frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Access application
http://localhost:3000
```

## Development Environment

### Available Scripts
```bash
npm run dev                 # Start development server (localhost)
npm run dev:localhost       # Start with explicit localhost binding
npm run build              # Build for production
npm run lint               # Run ESLint
npm run preview            # Preview production build
```

### Environment Variables
Create `.env` file in frontend root:
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

## Project Structure

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── api/               # API integration
│   ├── assets/            # Images, icons, static files
│   ├── components/        # Reusable UI components
│   │   ├── admin/         # Admin-specific components
│   │   ├── client/        # Client-facing components
│   │   └── common/        # Shared components
│   ├── context/           # React Context providers
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Third-party configurations
│   ├── pages/             # Page components
│   │   ├── admin/         # Admin pages
│   │   ├── auth/          # Authentication pages
│   │   └── client/        # Client pages
│   ├── routes/            # Route configuration
│   ├── styles/            # Global styles
│   ├── App.jsx            # Root component
│   └── main.jsx           # Entry point
├── docs/                  # Documentation
├── package.json           # Dependencies and scripts
├── tailwind.config.js     # Tailwind configuration
├── vite.config.js         # Vite configuration
└── eslint.config.js       # ESLint configuration
```

## Coding Standards

### File Naming Conventions
- **Components**: PascalCase (`StudentCard.jsx`)
- **Pages**: PascalCase (`EventDetail.jsx`)
- **Hooks**: camelCase with 'use' prefix (`useAvatar.js`)
- **Utilities**: camelCase (`apiHelpers.js`)
- **Constants**: UPPER_SNAKE_CASE (`API_ENDPOINTS.js`)

### Component Structure
```jsx
// Standard component template
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

/**
 * ComponentName - Brief description of component purpose
 * @param {string} prop1 - Description of prop1
 * @param {function} onAction - Callback function
 */
const ComponentName = ({ prop1, onAction }) => {
  // Hooks at the top
  const { user, userType } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Effects after state declarations
  useEffect(() => {
    // Side effects here
  }, []);

  // Handler functions
  const handleAction = async () => {
    try {
      setLoading(true);
      // Action logic
      onAction?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Early returns for loading/error states
  if (loading) return <LoadingSpinner />;
  if (error) return <div className="error-message">{error}</div>;

  // Main render
  return (
    <div className="component-wrapper">
      <h1 className="text-2xl font-bold">{prop1}</h1>
      <button onClick={handleAction} className="btn-primary">
        Action
      </button>
    </div>
  );
};

export default ComponentName;
```

### Import Organization
```jsx
// 1. React and core libraries
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// 2. Third-party libraries
import axios from 'axios';

// 3. Internal utilities and API
import { clientAPI } from '../api/axios';
import { formatDate } from '../utils/dateHelpers';

// 4. Context and hooks
import { useAuth } from '../context/AuthContext';
import { useAvatar } from '../hooks/useAvatar';

// 5. Components (internal first, then external)
import LoadingSpinner from '../components/LoadingSpinner';
import EventCard from '../components/client/EventCard';

// 6. Assets
import logoImage from '../assets/logo.png';
```

## State Management

### Authentication Context Usage
```jsx
const { 
  user,              // Current user object
  userType,          // 'admin', 'student', 'faculty'
  isAuthenticated,   // Boolean authentication status
  isLoading,         // Authentication loading state
  login,             // Login function
  logout,            // Logout function
  error              // Authentication error
} = useAuth();
```

### Local State Patterns
```jsx
// Form state management
const [formData, setFormData] = useState({
  name: '',
  email: '',
  phone: ''
});

const updateFormField = (field, value) => {
  setFormData(prev => ({
    ...prev,
    [field]: value
  }));
};

// List management with loading/error states
const [items, setItems] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
const [page, setPage] = useState(1);
const [hasMore, setHasMore] = useState(true);
```

## API Integration Patterns

### Standard API Call Pattern
```jsx
const fetchData = async () => {
  try {
    setLoading(true);
    setError(null);
    
    const response = await clientAPI.getEvents({
      page,
      limit: 10,
      status: 'active'
    });
    
    setItems(response.data.events);
    setHasMore(response.data.has_more);
    
  } catch (error) {
    console.error('Fetch error:', error);
    
    if (error.response?.status === 404) {
      setError('No events found');
    } else if (error.response?.status === 500) {
      setError('Server error. Please try again later.');
    } else {
      setError('Failed to load events');
    }
  } finally {
    setLoading(false);
  }
};
```

### Form Submission Pattern
```jsx
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Validation
  if (!formData.name.trim()) {
    setError('Name is required');
    return;
  }
  
  try {
    setSubmitting(true);
    setError(null);
    
    await clientAPI.updateProfile(formData);
    
    setSuccess('Profile updated successfully');
    // Optional: redirect or reset form
    
  } catch (error) {
    if (error.response?.status === 400) {
      setError(error.response.data.message);
    } else {
      setError('Failed to update profile');
    }
  } finally {
    setSubmitting(false);
  }
};
```

### Pagination Pattern
```jsx
const [currentPage, setCurrentPage] = useState(1);
const [totalPages, setTotalPages] = useState(0);
const itemsPerPage = 10;

const fetchPage = async (page) => {
  try {
    const response = await adminAPI.getStudents({
      page,
      limit: itemsPerPage
    });
    
    setItems(response.data.students);
    setTotalPages(Math.ceil(response.data.total / itemsPerPage));
    setCurrentPage(page);
    
  } catch (error) {
    setError('Failed to load page');
  }
};

// Pagination component usage
<Pagination 
  currentPage={currentPage}
  totalPages={totalPages}
  onPageChange={fetchPage}
/>
```

## Styling Guidelines

### Tailwind CSS Best Practices
```jsx
// Responsive design
<div className="w-full md:w-1/2 lg:w-1/3 xl:w-1/4">

// Component-specific styles
<button className="
  px-4 py-2 
  bg-blue-600 hover:bg-blue-700 
  text-white font-medium 
  rounded-lg 
  transition-colors duration-200
  focus:outline-none focus:ring-2 focus:ring-blue-500
  disabled:opacity-50 disabled:cursor-not-allowed
">
  Submit
</button>

// Dark mode support
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
```

### Standard Component Classes
```jsx
// Buttons
const buttonClasses = {
  primary: "btn-primary",
  secondary: "btn-secondary", 
  danger: "btn-danger"
};

// Cards
<div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">

// Forms
<input className="
  w-full px-3 py-2 
  border border-gray-300 rounded-md 
  focus:outline-none focus:ring-2 focus:ring-blue-500 
  placeholder-gray-400
" />

// Modals (Standard backdrop pattern)
<div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200">
  <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
    {/* Modal content */}
  </div>
</div>
```

## Error Handling

### Component Error Boundaries
```jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Error Display Components
```jsx
const ErrorMessage = ({ error, onRetry }) => (
  <div className="bg-red-50 border border-red-200 rounded-md p-4">
    <div className="flex items-center">
      <ExclamationCircleIcon className="h-5 w-5 text-red-400 mr-2" />
      <p className="text-red-800">{error}</p>
    </div>
    {onRetry && (
      <button 
        onClick={onRetry}
        className="mt-2 text-red-600 hover:text-red-800 underline"
      >
        Try Again
      </button>
    )}
  </div>
);
```

## Performance Optimization

### React.memo for Pure Components
```jsx
const EventCard = React.memo(({ event, onRegister }) => {
  return (
    <div className="event-card">
      <h3>{event.title}</h3>
      <p>{event.description}</p>
      <button onClick={() => onRegister(event.id)}>
        Register
      </button>
    </div>
  );
});
```

### useCallback for Function Props
```jsx
const EventList = () => {
  const [events, setEvents] = useState([]);

  const handleRegister = useCallback((eventId) => {
    // Registration logic
  }, []);

  return (
    <div>
      {events.map(event => (
        <EventCard 
          key={event.id}
          event={event}
          onRegister={handleRegister}
        />
      ))}
    </div>
  );
};
```

### Lazy Loading
```jsx
// Lazy load heavy components
const AdminDashboard = React.lazy(() => import('../pages/admin/Dashboard'));
const EventDetail = React.lazy(() => import('../pages/client/EventDetail'));

// Use with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <AdminDashboard />
</Suspense>
```

## Testing Guidelines

### Component Testing Setup
```jsx
// test-utils.jsx
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';

export const renderWithProviders = (ui, options = {}) => {
  const Wrapper = ({ children }) => (
    <BrowserRouter>
      <AuthProvider>
        {children}
      </AuthProvider>
    </BrowserRouter>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};
```

### Test Examples
```jsx
// Component.test.jsx
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import EventCard from './EventCard';

test('renders event information correctly', () => {
  const mockEvent = {
    id: '1',
    title: 'Test Event',
    description: 'Test Description'
  };

  renderWithProviders(<EventCard event={mockEvent} />);
  
  expect(screen.getByText('Test Event')).toBeInTheDocument();
  expect(screen.getByText('Test Description')).toBeInTheDocument();
});

test('calls onRegister when register button is clicked', async () => {
  const mockOnRegister = jest.fn();
  const mockEvent = { id: '1', title: 'Test Event' };

  renderWithProviders(
    <EventCard event={mockEvent} onRegister={mockOnRegister} />
  );
  
  fireEvent.click(screen.getByText('Register'));
  
  await waitFor(() => {
    expect(mockOnRegister).toHaveBeenCalledWith('1');
  });
});
```

## Debugging Tips

### React Developer Tools
- Install React Developer Tools browser extension
- Use Components tab to inspect component hierarchy
- Use Profiler tab to identify performance bottlenecks

### Console Debugging
```jsx
// Add temporary debugging
console.log('Component rendered with props:', props);
console.log('Current state:', { user, loading, error });

// Use debugger statement for breakpoints
const handleSubmit = () => {
  debugger; // Browser will pause here
  // Your code
};
```

### Network Debugging
```jsx
// Log API requests in development
if (import.meta.env.DEV) {
  console.log('API Request:', { url, method, data });
}

// Monitor network tab in browser dev tools
// Check for failed requests, slow responses, etc.
```

## Common Patterns

### Modal Management
```jsx
const [isModalOpen, setIsModalOpen] = useState(false);
const [modalData, setModalData] = useState(null);

const openModal = (data) => {
  setModalData(data);
  setIsModalOpen(true);
};

const closeModal = () => {
  setIsModalOpen(false);
  setModalData(null);
};

return (
  <>
    {/* Trigger */}
    <button onClick={() => openModal(item)}>
      Edit Item
    </button>
    
    {/* Modal */}
    {isModalOpen && (
      <Modal onClose={closeModal}>
        <EditForm data={modalData} />
      </Modal>
    )}
  </>
);
```

### Search and Filter
```jsx
const [searchTerm, setSearchTerm] = useState('');
const [filters, setFilters] = useState({
  category: '',
  status: ''
});

const filteredItems = useMemo(() => {
  return items.filter(item => {
    const matchesSearch = item.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    
    const matchesCategory = !filters.category || 
      item.category === filters.category;
    
    const matchesStatus = !filters.status || 
      item.status === filters.status;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });
}, [items, searchTerm, filters]);
```

### Infinite Scroll
```jsx
const [items, setItems] = useState([]);
const [loading, setLoading] = useState(false);
const [hasMore, setHasMore] = useState(true);
const [page, setPage] = useState(1);

const loadMore = useCallback(async () => {
  if (loading || !hasMore) return;
  
  setLoading(true);
  try {
    const response = await api.getItems({ page });
    setItems(prev => [...prev, ...response.data.items]);
    setHasMore(response.data.has_more);
    setPage(prev => prev + 1);
  } catch (error) {
    console.error('Load more failed:', error);
  } finally {
    setLoading(false);
  }
}, [page, loading, hasMore]);

// Use Intersection Observer for auto-loading
const observerRef = useRef();
const lastItemRef = useCallback(node => {
  if (loading) return;
  if (observerRef.current) observerRef.current.disconnect();
  
  observerRef.current = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && hasMore) {
      loadMore();
    }
  });
  
  if (node) observerRef.current.observe(node);
}, [loading, hasMore, loadMore]);
```

## Deployment

### Build Process
```bash
# Build for production
npm run build

# Preview production build locally
npm run preview

# Build files will be in dist/ directory
```

### Environment Configuration
```javascript
// vite.config.js
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@heroicons/react']
        }
      }
    }
  },
  server: {
    port: 3000,
    host: 'localhost'
  }
});
```

---

**Last Updated**: July 29, 2025  
**React Version**: 19.1.0  
**Vite Version**: 6.3.5  
**Node.js Required**: 18+  

*This development guide should be your primary reference for frontend development practices in CampusConnect.*
