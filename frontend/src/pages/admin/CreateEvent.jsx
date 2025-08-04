import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import DateRangePicker from '../../components/common/DateRangePicker';
import DateTimePicker from '../../components/common/DateTimePicker';
import ClockPicker from '../../components/common/ClockPicker';
import { useAuth } from '../../context/AuthContext';
import { venueApi } from '../../api/axios';
import { adminAPI } from '../../api/axios';
import { formatDateToLocal } from '../../utils/dateHelpers';

// Helper for step progress
const steps = [
  'Basic Info',
  'Organizer & Location',
  'Schedule & Registration',
  'Certificate',
  'Review'
];

function CreateEvent() {
  const navigate = useNavigate();
  const { user, userType, isAuthenticated, logout } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = steps.length;
  const [venues, setVenues] = useState([]);
  const [selectedVenueId, setSelectedVenueId] = useState('');
  const [venueBookings, setVenueBookings] = useState([]);
  const [showVenueAvailability, setShowVenueAvailability] = useState(false);
  const [bookingDateRange, setBookingDateRange] = useState({ start: null, end: null });
  
  // Session management for Executive Admin
  const [eventCreatorSession, setEventCreatorSession] = useState(null);
  const [showCreatorModal, setShowCreatorModal] = useState(false);
  const [creatorName, setCreatorName] = useState('');
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());

  // Organizer management states
  const [showNewOrganizerModal, setShowNewOrganizerModal] = useState(false);
  const [newOrganizerForm, setNewOrganizerForm] = useState({
    name: '',
    email: '',
    employee_id: ''
  });
  const [activeOrganizerDropdown, setActiveOrganizerDropdown] = useState(null);
  const [existingOrganizers, setExistingOrganizers] = useState([]);
  const [filteredOrganizers, setFilteredOrganizers] = useState([]);
  const [currentOrganizerIndex, setCurrentOrganizerIndex] = useState(null);

  // Session management functions
  const createEventCreatorSession = (name) => {
    if (user && user.role === 'executive_admin') {
      // Create unique session key for this user
      const sessionKey = `eventCreatorSession_${user.username || user.id || 'default'}`;
      
      const sessionData = {
        creatorName: name || user.fullname || user.username || 'Executive Admin',
        createdAt: new Date().getTime(),
        lastActivity: new Date().getTime(),
        userId: user.username || user.id || 'default', // Track which user created this session
        sessionId: Date.now() + '_' + Math.random().toString(36).substr(2, 9) // Unique session ID
      };
      
      // Store in both state and sessionStorage with user-specific key
      setEventCreatorSession(sessionData);
      sessionStorage.setItem(sessionKey, JSON.stringify(sessionData));
      setLastActivityTime(Date.now());
      
      console.log('Event creator session created for user:', user.username, sessionData);
    }
  };

  const getEventCreatorSession = () => {
    if (!user || user.role !== 'executive_admin') return null;
    
    // Use user-specific session key
    const sessionKey = `eventCreatorSession_${user.username || user.id || 'default'}`;
    const stored = sessionStorage.getItem(sessionKey);
    
    if (stored) {
      const sessionData = JSON.parse(stored);
      const now = new Date().getTime();
      const timeSinceLastActivity = now - sessionData.lastActivity;
      
      // Verify this session belongs to the current user
      const currentUserId = user.username || user.id || 'default';
      if (sessionData.userId !== currentUserId) {
        // Session belongs to different user, remove it
        sessionStorage.removeItem(sessionKey);
        setEventCreatorSession(null);
        console.log('Session belongs to different user, removing...');
        return null;
      }
      
      // Check if 60 minutes have passed since last activity
      if (timeSinceLastActivity < (60 * 60 * 1000)) {
        setEventCreatorSession(sessionData);
        return sessionData;
      } else {
        // Session expired due to inactivity, remove it and logout
        sessionStorage.removeItem(sessionKey);
        setEventCreatorSession(null);
        console.log('Session expired due to inactivity. Logging out...');
        // Auto logout
        setTimeout(() => {
          logout();
          navigate('/login');
        }, 1000);
        return null;
      }
    }
    return null;
  };

  const updateLastActivity = () => {
    if (!user || user.role !== 'executive_admin') return;
    
    const now = Date.now();
    setLastActivityTime(now);
    
    if (eventCreatorSession) {
      const sessionKey = `eventCreatorSession_${user.username || user.id || 'default'}`;
      const updatedSession = {
        ...eventCreatorSession,
        lastActivity: now
      };
      setEventCreatorSession(updatedSession);
      sessionStorage.setItem(sessionKey, JSON.stringify(updatedSession));
    }
  };

  const clearEventCreatorSession = () => {
    if (user && user.role === 'executive_admin') {
      const sessionKey = `eventCreatorSession_${user.username || user.id || 'default'}`;
      sessionStorage.removeItem(sessionKey);
      setEventCreatorSession(null);
      console.log('Event creator session cleared for user:', user.username);
    }
  };

  const getTimeRemaining = () => {
    if (!eventCreatorSession) return 0;
    const now = new Date().getTime();
    const timeSinceLastActivity = now - eventCreatorSession.lastActivity;
    const remaining = (60 * 60 * 1000) - timeSinceLastActivity; // 60 minutes - time since last activity
    return Math.max(0, remaining);
  };

  const formatTimeRemaining = (milliseconds) => {
    const minutes = Math.floor(milliseconds / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle creator modal submission
  const handleCreatorSubmit = () => {
    if (creatorName.trim()) {
      createEventCreatorSession(creatorName.trim());
      setShowCreatorModal(false);
      setCreatorName('');
    }
  };
  const [venueAvailability, setVenueAvailability] = useState([]);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // Form state (expanded for all fields) - Move this before useEffect that uses it
  const [form, setForm] = useState({
    event_id: '',
    event_name: '',
    event_type: '',
    target_audience: '',
    is_xenesis_event: false,
    short_description: '',
    detailed_description: '',
    organizing_department: '',
    organizers: [{ 
      id: null, 
      name: '', 
      email: '', 
      employee_id: '', 
      searchQuery: '',
      selected: false, 
      isNew: false 
    }],
    contacts: [{ name: '', contact: '' }],
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    registration_start_date: '',
    registration_start_time: '',
    registration_end_date: '',
    registration_end_time: '',
    certificate_end_date: '',
    certificate_end_time: '',
    mode: '',
    venue: '',
    venue_id: '',
    registration_type: '',
    registration_fee: '',
    fee_description: '',
    registration_mode: '',
    team_size_min: '',
    team_size_max: '',
    allow_multiple_team_registrations: false,
    max_participants: '',
    min_participants: '1',
    certificate_template: null,
    assets: [],
  });
  const [errors, setErrors] = useState({});
  const [existingEventIds, setExistingEventIds] = useState([]);
  const [checkingEventId, setCheckingEventId] = useState(false);
  const [userClickedSubmit, setUserClickedSubmit] = useState(false);
  const [justArrivedAtReview, setJustArrivedAtReview] = useState(false);

  // Load venues on component mount, but only after authentication is checked
  useEffect(() => {
    if (isAuthenticated && userType === 'admin') {
      loadVenues();
      loadExistingEventIds();
    }
  }, [isAuthenticated, userType]);

  // Initialize event creator session for Executive Admin
  useEffect(() => {
    if (isAuthenticated && userType === 'admin' && user && user.role === 'executive_admin') {
      // Check if there's an existing valid session
      const existingSession = getEventCreatorSession();
      
      if (!existingSession) {
        // Show modal to ask for creator name
        setShowCreatorModal(true);
      }
    }
  }, [isAuthenticated, userType, user]);

  // Activity tracking - update last activity on user interactions
  useEffect(() => {
    const trackActivity = () => {
      updateLastActivity();
    };

    // Add event listeners for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, trackActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, trackActivity, true);
      });
    };
  }, [eventCreatorSession]);

  // Inactivity timer - check every minute for logout
  useEffect(() => {
    if (user?.role === 'executive_admin' && eventCreatorSession) {
      const timer = setInterval(() => {
        const timeRemaining = getTimeRemaining();
        
        if (timeRemaining <= 0) {
          // Session expired due to inactivity
          clearEventCreatorSession();
          console.log('Session expired due to inactivity. Logging out...');
          alert('Session expired due to inactivity. You will be logged out.');
          logout();
          navigate('/login');
        }
      }, 60000); // Check every minute

      return () => clearInterval(timer);
    }
  }, [eventCreatorSession, user]);

  // Track when we arrive at step 5 to prevent immediate auto-submission
  useEffect(() => {
    if (currentStep === totalSteps) {
      console.log('🛡️ Arrived at review page - setting protection against auto-submission');
      setJustArrivedAtReview(true);
      setUserClickedSubmit(false);
      
      // Reset the protection after 2 seconds
      const timer = setTimeout(() => {
        console.log('🛡️ Auto-submission protection disabled after delay');
        setJustArrivedAtReview(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    } else {
      setJustArrivedAtReview(false);
    }
  }, [currentStep, totalSteps]);

  const loadExistingEventIds = async () => {
    try {
      console.log('🔄 Loading existing event IDs from database...');
      const response = await adminAPI.getEvents();
      if (response.data && response.data.events) {
        const eventIds = response.data.events.map(event => event.event_id);
        setExistingEventIds(eventIds);
        console.log('📋 Loaded existing event IDs:', eventIds);
        
        // Clear any existing event_id errors since we've refreshed the list
        if (form.event_id) {
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.event_id;
            return newErrors;
          });
          
          // Re-check the current event ID against the fresh list
          setTimeout(() => {
            if (form.event_id && form.event_id.length >= 3) {
              checkEventIdAvailability(form.event_id);
            }
          }, 100);
        }
      }
    } catch (err) {
      console.error('Error loading existing event IDs:', err);
    }
  };

  const loadVenues = async () => {
    try {
      console.log('Loading venues from API...');
      console.log('Auth status:', { isAuthenticated, userType, user: user?.username });
      
      if (!isAuthenticated || userType !== 'admin') {
        console.error('Not authenticated as admin');
        alert('Please log in as an admin to access this feature.');
        return;
      }
      
      const response = await venueApi.list();
      console.log('Venues API response:', response);
      
      if (response.data) {
        // The venueApi.list() returns response.data which contains the venues array
        const venueArray = Array.isArray(response.data) ? response.data : [];
        setVenues(venueArray);
        console.log(`Loaded ${venueArray.length} venues`);
      } else {
        console.error('No data received from venues API');
      }
    } catch (err) {
      console.error('Error loading venues:', err);
      
      if (err.response?.status === 401) {
        alert('Authentication required. Please log in as admin first.');
      } else {
        console.error('Venues API error:', err.message);
      }
    }
  };

  // Check for duplicate event ID
  const checkEventIdAvailability = async (eventId) => {
    if (!eventId || eventId.length < 3) return;
    
    console.log('🔍 Checking Event ID availability for:', eventId);
    console.log('📋 Current existing IDs:', existingEventIds);
    
    setCheckingEventId(true);
    try {
      // Check against existing event IDs
      const isDuplicate = existingEventIds.includes(eventId);
      console.log('❓ Is duplicate?', isDuplicate);
      
      if (isDuplicate) {
        console.log('❌ Event ID already exists!');
        setErrors(prev => ({
          ...prev,
          event_id: 'This Event ID already exists. Please choose a different one.'
        }));
      } else {
        console.log('✅ Event ID is available!');
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.event_id;
          return newErrors;
        });
      }
    } catch (err) {
      console.error('Error checking event ID:', err);
    } finally {
      setCheckingEventId(false);
    }
  };

  // Debounced event ID checking
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (form.event_id && form.event_id.length >= 3) {
        checkEventIdAvailability(form.event_id);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [form.event_id, existingEventIds]);

  // Helper function to generate suggested event ID
  const generateSuggestedEventId = (originalId) => {
    const currentYear = new Date().getFullYear();
    const baseId = originalId.replace(/\d+$/, ''); // Remove trailing numbers
    
    // Try with current year
    const withYear = `${baseId}${currentYear}`;
    if (!existingEventIds.includes(withYear)) {
      return withYear;
    }
    
    // Try with incremental numbers
    for (let i = 1; i <= 99; i++) {
      const numbered = `${baseId}${i}`;
      if (!existingEventIds.includes(numbered)) {
        return numbered;
      }
    }
    
    // Try with year and number
    for (let i = 1; i <= 99; i++) {
      const yearNumbered = `${baseId}${currentYear}_${i}`;
      if (!existingEventIds.includes(yearNumbered)) {
        return yearNumbered;
      }
    }
    
    return `${baseId}${Date.now()}`;
  };

  const checkVenueAvailability = async () => {
    if (!selectedVenueId || selectedVenueId === 'custom') return;
    
    try {
      setCheckingAvailability(true);
      const response = await venueApi.getBookings(selectedVenueId);
      console.log('Venue bookings response:', response);
      
      if (response.data) {
        const bookings = response.data.bookings || response.data || [];
        setVenueBookings(bookings);
        
        // Convert bookings to date ranges for the date picker
        const bookedRanges = bookings.map(booking => ({
          start: booking.start_datetime.split('T')[0],
          end: booking.end_datetime.split('T')[0],
          eventName: booking.event_name
        }));
        
        setVenueAvailability(bookedRanges);
      }
    } catch (err) {
      console.error('Error checking venue availability:', err);
    } finally {
      setCheckingAvailability(false);
    }
  };

  // Check venue availability when venue changes
  useEffect(() => {
    if (selectedVenueId && selectedVenueId !== 'custom') {
      checkVenueAvailability();
    } else {
      setVenueAvailability([]);
      setVenueBookings([]);
    }
  }, [selectedVenueId]);

  // Load existing organizers on component mount
  useEffect(() => {
    const fetchExistingOrganizers = async () => {
      try {
        console.log('Loading existing organizers...');
        
        const response = await adminAPI.getEventOrganizers();
        console.log('Loaded organizers from API:', response.data);
        setExistingOrganizers(response.data || []);
        setFilteredOrganizers(response.data || []);
      } catch (error) {
        console.error('Error fetching organizers:', error);
        if (error.response?.status === 404) {
          // API endpoint doesn't exist yet - start with empty array
          console.log('Organizers API not implemented yet - starting with empty array');
        } else {
          console.error('Error response from organizers API:', error.response?.status);
        }
        // Start with empty array - we'll build the database as we go
        console.log('Starting with empty organizers database');
        setExistingOrganizers([]);
        setFilteredOrganizers([]);
      }
    };

    fetchExistingOrganizers();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeOrganizerDropdown !== null && 
          !event.target.closest('.organizer-dropdown-container')) {
        setActiveOrganizerDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeOrganizerDropdown]);

  // Handlers
  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    
    if (type === 'file') {
      if (name === 'certificate_template') {
        setForm((prev) => ({ ...prev, certificate_template: files[0] }));
      } else if (name === 'assets') {
        setForm((prev) => ({ ...prev, assets: Array.from(files) }));
      }
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };
  const handleOrganizerChange = (idx, value) => {
    const newOrganizers = [...form.organizers];
    newOrganizers[idx] = value;
    setForm((prev) => ({ ...prev, organizers: newOrganizers }));
  };
  
  // New organizer management functions
  const addOrganizer = () => {
    setForm(prev => ({ 
      ...prev, 
      organizers: [...prev.organizers, { 
        id: null, 
        name: '', 
        email: '', 
        employee_id: '', 
        searchQuery: '',
        selected: false, 
        isNew: false 
      }] 
    }));
  };
  
  const removeOrganizer = (idx) => {
    const newOrganizers = form.organizers.filter((_, i) => i !== idx);
    setForm((prev) => ({ ...prev, organizers: newOrganizers }));
  };

  const handleOrganizerSearch = (idx, searchQuery) => {
    const newOrganizers = [...form.organizers];
    newOrganizers[idx].searchQuery = searchQuery;
    setForm((prev) => ({ ...prev, organizers: newOrganizers }));
    
    // Filter existing organizers based on search
    if (searchQuery.trim()) {
      const filtered = existingOrganizers.filter(org => 
        org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.employee_id.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredOrganizers(filtered);
    } else {
      setFilteredOrganizers(existingOrganizers);
    }
  };

  const selectExistingOrganizer = (idx, organizer) => {
    const newOrganizers = [...form.organizers];
    newOrganizers[idx] = {
      id: organizer.id,
      name: organizer.name,
      email: organizer.email,
      employee_id: organizer.employee_id,
      searchQuery: organizer.name,
      selected: true,
      isNew: false
    };
    setForm((prev) => ({ ...prev, organizers: newOrganizers }));
    setActiveOrganizerDropdown(null);
  };

  const clearOrganizerSelection = (idx) => {
    const newOrganizers = [...form.organizers];
    newOrganizers[idx] = {
      id: null,
      name: '',
      email: '',
      employee_id: '',
      searchQuery: '',
      selected: false,
      isNew: false
    };
    setForm((prev) => ({ ...prev, organizers: newOrganizers }));
  };

  const openNewOrganizerModal = (idx) => {
    setCurrentOrganizerIndex(idx);
    setShowNewOrganizerModal(true);
    setActiveOrganizerDropdown(null);
  };

  const closeNewOrganizerModal = () => {
    setShowNewOrganizerModal(false);
    setCurrentOrganizerIndex(null);
    setNewOrganizerForm({ name: '', email: '', employee_id: '' });
  };

  const handleNewOrganizerSubmit = (e) => {
    e.preventDefault();
    
    if (currentOrganizerIndex !== null) {
      const newOrganizers = [...form.organizers];
      newOrganizers[currentOrganizerIndex] = {
        id: null, // Will be assigned after approval
        name: newOrganizerForm.name,
        email: newOrganizerForm.email,
        employee_id: newOrganizerForm.employee_id,
        searchQuery: newOrganizerForm.name,
        selected: true,
        isNew: true
      };
      setForm((prev) => ({ ...prev, organizers: newOrganizers }));
    }
    
    closeNewOrganizerModal();
  };
  const handleContactChange = (idx, field, value) => {
    const newContacts = [...form.contacts];
    newContacts[idx][field] = value;
    setForm((prev) => ({ ...prev, contacts: newContacts }));
  };
  const addContact = () => setForm((prev) => ({ ...prev, contacts: [...prev.contacts, { name: '', contact: '' }] }));
  const removeContact = (idx) => {
    const newContacts = form.contacts.filter((_, i) => i !== idx);
    setForm((prev) => ({ ...prev, contacts: newContacts }));
  };

  // Handle venue selection
  const handleVenueSelection = (venueId) => {
    setSelectedVenueId(venueId);
    const selectedVenue = venues.find(v => v.venue_id === venueId);
    if (selectedVenue) {
      setForm(prev => ({
        ...prev,
        venue_id: venueId,
        venue: selectedVenue.venue_name + ' - ' + selectedVenue.location
      }));
    } else if (venueId === 'custom') {
      setForm(prev => ({
        ...prev,
        venue_id: '',
        venue: ''
      }));
    } else {
      setForm(prev => ({
        ...prev,
        venue_id: '',
        venue: ''
      }));
    }
    setShowVenueAvailability(venueId !== '' && venueId !== 'custom');
  };

  // Handle date range change for venue booking
  const handleBookingDateChange = (startDate, endDate) => {
    setBookingDateRange({ start: startDate, end: endDate });
    
    if (startDate && endDate) {
      // Update form dates to match the selected booking range
      setForm(prev => ({
        ...prev,
        start_date: formatDateToLocal(startDate),
        end_date: formatDateToLocal(endDate)
      }));
    }
  };

  // Dynamic fields for registration/fee/team
  const showFeeFields = form.registration_type === 'paid';
  const showTeamFields = form.registration_mode === 'team';

  // Handle any form-related events that might trigger submission
  const handleFormEvent = (e) => {
    // Prevent any Enter key presses from submitting the form
    if (e.type === 'keydown' && e.key === 'Enter') {
      // Allow Enter in textareas
      if (e.target.tagName === 'TEXTAREA') {
        return;
      }
      
      // For other inputs, prevent default and don't trigger form submission
      e.preventDefault();
      console.log('Enter key pressed, prevented form submission');
      return false;
    }
  };

  // Validation logic for each step
  const validateStep = (step) => {
    let stepErrors = {};
    if (step === 1) {
      if (!form.event_id) stepErrors.event_id = 'Event ID is required';
      if (form.event_id && existingEventIds.includes(form.event_id)) {
        stepErrors.event_id = 'This Event ID already exists. Please choose a different one.';
      }
      if (!form.event_name) stepErrors.event_name = 'Event Title is required';
      if (!form.event_type) stepErrors.event_type = 'Event Type is required';
      if (!form.target_audience) stepErrors.target_audience = 'Target Audience is required';
      if (!form.short_description) stepErrors.short_description = 'Short Description is required';
      if (!form.detailed_description) stepErrors.detailed_description = 'Detailed Description is required';
    } else if (step === 2) {
      if (!form.organizing_department) stepErrors.organizing_department = 'Organizing Department/Club is required';
      
      // New organizer validation
      const selectedOrganizers = form.organizers.filter(org => org.selected);
      if (selectedOrganizers.length === 0) {
        stepErrors.organizers = 'At least one organizer must be selected';
      } else {
        // Validate each selected organizer
        selectedOrganizers.forEach((org, idx) => {
          if (!org.name || !org.email || !org.employee_id) {
            stepErrors.organizers = 'All organizer fields (name, email, employee ID) are required';
          }
          if (org.email && !org.email.includes('@')) {
            stepErrors.organizers = 'Valid email address is required for all organizers';
          }
        });
      }
      
      if (!form.contacts.length || form.contacts.some((c) => !c.name || !c.contact)) {
        stepErrors.contacts = 'At least one contact with name and contact is required';
      }
      
      if (!form.mode) stepErrors.mode = 'Event Mode is required';
      if ((form.mode === 'offline' || form.mode === 'hybrid') && !form.venue) {
        stepErrors.venue = 'Venue selection is required for offline/hybrid events';
      }
      if (form.mode === 'online' && !form.venue) {
        stepErrors.venue = 'Platform/Meeting link is required for online events';
      }
    } else if (step === 3) {
      // Date/Time validation
      ['start_date','start_time','end_date','end_time','registration_start_date','registration_start_time','registration_end_date','registration_end_time','certificate_end_date','certificate_end_time'].forEach((f) => { if (!form[f]) stepErrors[f] = 'Required'; });
      // Date/time logic
      const start = new Date(`${form.start_date}T${form.start_time}`);
      const end = new Date(`${form.end_date}T${form.end_time}`);
      const regStart = new Date(`${form.registration_start_date}T${form.registration_start_time}`);
      const regEnd = new Date(`${form.registration_end_date}T${form.registration_end_time}`);
      if (end <= start) stepErrors.end_time = 'End must be after start';
      if (regEnd <= regStart) stepErrors.registration_end_time = 'Reg end must be after reg start';
      if (regEnd > start) stepErrors.registration_end_time = 'Reg end must be before event start';
      
      // Registration validation
      if (!form.registration_type) stepErrors.registration_type = 'Registration Type is required';
      if (showFeeFields && !form.registration_fee) stepErrors.registration_fee = 'Fee is required';
      if (!form.registration_mode) stepErrors.registration_mode = 'Registration Mode is required';
      if (showTeamFields) {
        if (!form.team_size_min) stepErrors.team_size_min = 'Min team size required';
        if (!form.team_size_max) stepErrors.team_size_max = 'Max team size required';
      }
    } else if (step === 4) {
      if (!form.certificate_template) stepErrors.certificate_template = 'Certificate template is required';
    }
    
    setErrors(stepErrors);
    const isValid = Object.keys(stepErrors).length === 0;
    return isValid;
  };

  // Navigation with validation
  const nextStep = () => {
    console.log('🔄 NEXT STEP CLICKED');
    console.log('Current Step:', currentStep, 'Moving to:', currentStep + 1);
    
    // Reset submit click tracking when moving steps
    setUserClickedSubmit(false);
    
    if (validateStep(currentStep)) {
      const newStep = Math.min(currentStep + 1, totalSteps);
      console.log('✅ Validation passed, moving to step:', newStep);
      setCurrentStep(newStep);
    } else {
      console.log('❌ Validation failed, staying on step:', currentStep);
    }
  };
  const prevStep = () => {
    // Reset submit click tracking when moving steps
    setUserClickedSubmit(false);
    setCurrentStep((s) => Math.max(s - 1, 1));
  };

  // Review summary
  const renderReview = () => (
    <div className="space-y-6 max-h-96 overflow-y-auto">
      <div>
        <h3 className="font-semibold text-lg mb-2">Basic Information</h3>
        <p><strong>Event ID:</strong> {form.event_id}</p>
        <p><strong>Event Name:</strong> {form.event_name}</p>
        <p><strong>Event Type:</strong> {form.event_type}</p>
        <p><strong>Short Description:</strong> {form.short_description}</p>
        <p><strong>Detailed Description:</strong> {form.detailed_description}</p>
      </div>
      <div>
        <h3 className="font-semibold text-lg mb-2">Organizer Information</h3>
        <p><strong>Department/Club:</strong> {form.organizing_department}</p>
        <p><strong>Organizers:</strong> {form.organizers.filter(org => org.selected && org.name.trim() !== '').map(org => org.name).join(', ')}</p>
        <p><strong>Contacts:</strong> {form.contacts.map((c) => `${c.name} (${c.contact})`).join(', ')}</p>
      </div>
      <div>
        <h3 className="font-semibold text-lg mb-2">Schedule</h3>
        <p><strong>Start:</strong> {form.start_date} at {form.start_time}</p>
        <p><strong>End:</strong> {form.end_date} at {form.end_time}</p>
        <p><strong>Registration Period:</strong> {form.registration_start_date} at {form.registration_start_time} to {form.registration_end_date} at {form.registration_end_time}</p>
        <p><strong>Certificate Available Until:</strong> {form.certificate_end_date} at {form.certificate_end_time}</p>
      </div>
      <div>
        <h3 className="font-semibold text-lg mb-2">Venue</h3>
        <p><strong>Mode:</strong> {form.mode}</p>
        <p><strong>Location/Platform:</strong> {form.venue}</p>
      </div>
      <div>
        <h3 className="font-semibold text-lg mb-2">Registration Details</h3>
        <p><strong>Registration Type:</strong> {form.registration_type}</p>
        {showFeeFields && <p><strong>Registration Fee:</strong> ₹{form.registration_fee}</p>}
        {form.fee_description && <p><strong>Fee Description:</strong> {form.fee_description}</p>}
        <p><strong>Registration Mode:</strong> {form.registration_mode}</p>
        {showTeamFields && (
          <>
            <p><strong>Min Team Size:</strong> {form.team_size_min}</p>
            <p><strong>Max Team Size:</strong> {form.team_size_max}</p>
            <p><strong>Multiple Teams Allowed:</strong> {form.allow_multiple_team_registrations ? 'Yes (with approval)' : 'No'}</p>
          </>
        )}
        {form.max_participants && <p><strong>Max Participants:</strong> {form.max_participants}</p>}
        <p><strong>Min Participants:</strong> {form.min_participants}</p>
      </div>
      <div>
        <h3 className="font-semibold text-lg mb-2">Certificate Template</h3>
        <p>{form.certificate_template ? form.certificate_template.name : 'No file selected'}</p>
        <p>{form.assets.length ? `${form.assets.length} asset(s) selected` : 'No assets uploaded'}</p>
      </div>
      
      {/* Event Creator Information for Executive Admin */}
      {user?.role === 'executive_admin' && (
        <div>
          <h3 className="font-semibold text-lg mb-2">Event Creator</h3>
          {eventCreatorSession && getTimeRemaining() > 0 ? (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <p><strong>Created By:</strong> {eventCreatorSession.creatorName}</p>
              <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                Session Active
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <p><strong>Created By:</strong> {user.fullname || user.username || 'Executive Admin'}</p>
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                No Active Session
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Form submission (optional backend integration)
  const handleSubmit = async (e) => {
    console.log('🚨 FORM SUBMIT TRIGGERED!');
    console.log('Current Step:', currentStep, 'Total Steps:', totalSteps);
    console.log('Event target:', e.target.tagName, e.target.type);
    console.log('Event submitter:', e.nativeEvent?.submitter?.textContent);
    console.log('Event type:', e.type);
    console.log('Event isTrusted:', e.isTrusted);
    
    e.preventDefault();
    
    // CRITICAL: Only allow submission if it's a trusted user event and on final step
    if (!e.isTrusted) {
      console.log('❌ BLOCKED: Event not trusted (programmatic submission)');
      return false;
    }
    
    // Only submit if we're on the final step (step 5) AND explicitly requested
    if (currentStep !== totalSteps) {
      console.log('❌ BLOCKED: Not on final step');
      return false;
    }
    
    // Additional check: ensure submitter is the actual submit button
    if (!e.nativeEvent?.submitter || e.nativeEvent.submitter.textContent !== 'Create Event') {
      console.log('❌ BLOCKED: Invalid submitter');
      return false;
    }
    
    // Additional check: ensure user actually clicked the submit button
    if (!userClickedSubmit) {
      console.log('❌ BLOCKED: User did not click submit button');
      return false;
    }
    
    // Additional check: prevent submission if we just arrived at review page
    if (justArrivedAtReview) {
      console.log('❌ BLOCKED: Just arrived at review page - auto-submission protection active');
      return false;
    }
    
    if (!validateStep(currentStep)) {
      console.log('❌ BLOCKED: Validation failed');
      return false;
    }
    
    // Check authentication before submitting
    if (!isAuthenticated || userType !== 'admin') {
      alert('Authentication required. Please log in as admin first.');
      return false;
    }
    
    try {
      // Prepare form data for submission
      const eventData = {
        event_id: form.event_id,
        event_name: form.event_name,
        event_type: form.event_type,
        target_audience: form.target_audience,
        is_xenesis_event: form.is_xenesis_event,
        short_description: form.short_description,
        detailed_description: form.detailed_description,
        organizing_department: form.organizing_department,
        organizers: form.organizers.filter(org => org.selected && org.name.trim() !== '').map(org => ({
          id: org.id,
          name: org.name,
          email: org.email,
          employee_id: org.employee_id,
          isNew: org.isNew
        })),
        contacts: form.contacts.filter(contact => contact.name.trim() !== '' && contact.contact.trim() !== ''),
        start_date: form.start_date,
        start_time: form.start_time,
        end_date: form.end_date,
        end_time: form.end_time,
        registration_start_date: form.registration_start_date,
        registration_start_time: form.registration_start_time,
        registration_end_date: form.registration_end_date,
        registration_end_time: form.registration_end_time,
        certificate_end_date: form.certificate_end_date,
        certificate_end_time: form.certificate_end_time,
        mode: form.mode,
        venue: form.venue,
        venue_id: form.venue_id || null,
        target_outcomes: form.target_outcomes,
        prerequisites: form.prerequisites || null,
        what_to_bring: form.what_to_bring || null,
        registration_type: form.registration_type,
        registration_fee: form.registration_fee ? parseFloat(form.registration_fee) : null,
        fee_description: form.fee_description || null,
        registration_mode: form.registration_mode,
        team_size_min: form.team_size_min ? parseInt(form.team_size_min) : null,
        team_size_max: form.team_size_max ? parseInt(form.team_size_max) : null,
        allow_multiple_team_registrations: form.allow_multiple_team_registrations || false,
        max_participants: form.max_participants ? parseInt(form.max_participants) : null,
        min_participants: parseInt(form.min_participants) || 1,
        // Always set status to pending approval for ALL events (universal approval required)
        status: 'pending_approval',
        approval_required: true
      };

      // Note: All events require Super Admin approval regardless of organizer type
      // New organizers will receive email notifications with login credentials if approved
      // Existing organizers will only receive notifications in the notification center
      console.log('All events require approval - status set to pending_approval');

      // Add event_created_by for Executive Admin users with session
      if (user.role === 'executive_admin' && eventCreatorSession) {
        // Check if session is still valid (not expired due to inactivity)
        const timeRemaining = getTimeRemaining();
        if (timeRemaining > 0) {
          eventData.event_created_by = eventCreatorSession.creatorName;
          console.log('Adding event_created_by:', eventCreatorSession.creatorName);
        } else {
          // Session expired, clear it and use fallback
          clearEventCreatorSession();
          eventData.event_created_by = user.fullname || user.username || 'Executive Admin';
          console.log('Session expired, using fallback for event_created_by:', eventData.event_created_by);
        }
      } else if (user.role === 'executive_admin') {
        // Fallback if no session exists
        eventData.event_created_by = user.fullname || user.username || 'Executive Admin';
        console.log('No session found, using fallback for event_created_by:', eventData.event_created_by);
      }

      console.log('Submitting event data:', eventData);

      const response = await adminAPI.createEvent(eventData);
      console.log('Response:', response);

      if (response.data && response.data.success) {
        // Clear the session after successful event creation
        if (user.role === 'executive_admin' && eventCreatorSession) {
          console.log('Event request submitted successfully. Clearing creator session.');
          clearEventCreatorSession();
        }
        
        // Determine success message based on user role
        const successMessage = user.role === 'executive_admin' 
          ? 'Event Request Sent Successfully! It is pending Super Admin approval.'
          : 'Event created successfully! It is pending Super Admin approval.';
        
        // Navigate to success page with event data
        navigate('/admin/events/created-success', {
          state: { 
            eventData: eventData,
            pendingApproval: true,
            message: successMessage
          }
        });
      } else {
        alert(`Error creating event: ${response.data?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      
      // Handle axios error responses
      if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 401) {
          alert('Authentication required. Please log in as admin first.');
          window.location.href = '/auth/login?mode=admin';
        } else if (status === 403) {
          alert('Access denied. You do not have permission to create events.');
        } else if (status === 400 && data.detail && data.detail.includes('Event with this ID already exists')) {
          // Handle duplicate event ID specifically
          const suggestedId = generateSuggestedEventId(form.event_id);
          const message = `❌ Event ID "${form.event_id}" already exists!\n\n` +
                         `Existing Event IDs: ${existingEventIds.join(', ')}\n\n` +
                         `💡 Suggested alternative: "${suggestedId}"\n\n` +
                         `Please go back and choose a unique Event ID.`;
          alert(message);
          
          // Set the error in the form
          setErrors(prev => ({
            ...prev,
            event_id: `This Event ID already exists. Try: ${suggestedId}`
          }));
          
          // Go back to step 1
          setCurrentStep(1);
        } else if (status === 422) {
          alert(`Validation error: ${data.detail || 'Please check your form data'}`);
          console.error('Validation errors:', data.detail);
        } else {
          alert(`Error creating event: ${data.message || data.detail || 'Unknown error'}`);
        }
      } else if (error.request) {
        // Network error
        console.error('Network error details:', error.request);
        alert('Network connection error. Please check if the backend server is running and accessible.');
      } else {
        // Other error
        console.error('Other error details:', error);
        alert(`Unexpected error: ${error.message}. Please check the browser console for details.`);
      }
    }
  };

  // Render step content
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Basic Event Information</h2>
              <p className="text-sm text-gray-600">Provide essential details about your event</p>
            </div>
            
            <div className="space-y-6">
              {/* Event ID and Event Title in same row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Event ID <span className="text-red-500">*</span>
                    </label>
                    <button 
                      type="button"
                      onClick={loadExistingEventIds}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                      title="Refresh existing Event IDs from database"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Refresh IDs</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input 
                      type="text" 
                      name="event_id" 
                      value={form.event_id} 
                      onChange={handleChange} 
                      required 
                      pattern="[A-Za-z0-9_]+" 
                      title="No spaces allowed. Use letters, numbers and underscores only." 
                      placeholder="e.g., PYWS2025" 
                      className={`block w-full px-3 py-2 border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.event_id ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 
                        form.event_id && !checkingEventId && !errors.event_id ? 'border-green-300 focus:border-green-500 focus:ring-green-500' : 
                        'border-gray-300 focus:border-blue-500'
                      }`} 
                    />
                    {checkingEventId && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      </div>
                    )}
                    {form.event_id && !checkingEventId && !errors.event_id && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                    <span>Unique identifier for the event. Use letters, numbers, and underscores only.</span>
                    <span className="text-gray-400">
                      {existingEventIds.length} existing IDs loaded
                    </span>
                  </div>
                  {errors.event_id && <p className="text-xs text-red-600 mt-1">{errors.event_id}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Title <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    name="event_name" 
                    value={form.event_name} 
                    onChange={handleChange} 
                    required 
                    placeholder="e.g., Python Workshop 2025" 
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.event_name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500'
                    }`} 
                  />
                  <p className="text-xs text-gray-500 mt-1">Choose a clear, descriptive title that reflects the event's purpose</p>
                  {errors.event_name && <p className="text-xs text-red-600 mt-1">{errors.event_name}</p>}
                </div>
              </div>
              
              {/* Event Type, Target Audience, and Xenesis Event */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Type <span className="text-red-500">*</span>
                  </label>
                  <select 
                    name="event_type" 
                    value={form.event_type} 
                    onChange={handleChange} 
                    required 
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.event_type ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500'
                    }`}
                  >
                    <option value="">Select Type</option>
                    <option value="technical">Technical Event</option>
                    <option value="cultural">Cultural Event</option>
                    <option value="sports">Sports Event</option>
                    <option value="workshop">Workshop/Training</option>
                    <option value="seminar">Seminar/Conference</option>
                    <option value="competition">Competition</option>
                    <option value="hackathon">Hackathon</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.event_type && <p className="text-xs text-red-600 mt-1">{errors.event_type}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Audience <span className="text-red-500">*</span>
                  </label>
                  <select 
                    name="target_audience" 
                    value={form.target_audience} 
                    onChange={handleChange} 
                    required 
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.target_audience ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500'
                    }`}
                  >
                    <option value="">Select Audience</option>
                    <option value="student">Students Only</option>
                    <option value="faculty">Faculty Only</option>
                    <option value="both">Students & Faculty</option>
                  </select>
                  {errors.target_audience && <p className="text-xs text-red-600 mt-1">{errors.target_audience}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Category
                  </label>
                  <div className="flex items-center h-10 px-3 py-2 border border-gray-300 rounded-md">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="is_xenesis_event"
                        checked={form.is_xenesis_event}
                        onChange={(e) => setForm(prev => ({ ...prev, is_xenesis_event: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                      />
                      <span className="text-sm text-gray-700">Xenesis Event</span>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Check if this is a Xenesis category event</p>
                </div>
              </div>
              
              {/* Short Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Short Description <span className="text-red-500">*</span>
                </label>
                <textarea 
                  name="short_description" 
                  value={form.short_description} 
                  onChange={handleChange} 
                  required 
                  rows={2} 
                  placeholder="Write a brief overview of the event (max 200 characters)" 
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                    errors.short_description ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500'
                  }`} 
                />
                <p className="text-xs text-gray-500 mt-1">A concise summary that will appear in event listings</p>
                {errors.short_description && <p className="text-xs text-red-600 mt-1">{errors.short_description}</p>}
              </div>

              {/* Detailed Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Detailed Description <span className="text-red-500">*</span>
                </label>
                <textarea 
                  name="detailed_description" 
                  value={form.detailed_description} 
                  onChange={handleChange} 
                  required 
                  rows={4} 
                  placeholder="Provide comprehensive details about the event, including objectives, highlights, and what participants can expect" 
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                    errors.detailed_description ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500'
                  }`} 
                />
                <p className="text-xs text-gray-500 mt-1">Full description of the event, including agenda, requirements, and other important information</p>
                {errors.detailed_description && <p className="text-xs text-red-600 mt-1">{errors.detailed_description}</p>}
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div>
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Organizer, Contact & Event Location</h2>
              <p className="text-sm text-gray-600">Specify who is organizing the event, contact information, and event location details</p>
            </div>
            
            <div className="space-y-10">
              {/* Organizer & Contact Information Section */}
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-6 border-b pb-2">Organizer & Contact Information</h3>
                <div className="space-y-6">
                  {/* Organizing Department */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Organizing Department/Club <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      name="organizing_department" 
                      value={form.organizing_department} 
                      onChange={handleChange} 
                      required 
                      placeholder="e.g., Computer Science Department"
                      className={`block w-full px-3 py-2 border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.organizing_department ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500'
                      }`} 
                    />
                    {errors.organizing_department && <p className="text-xs text-red-600 mt-1">{errors.organizing_department}</p>}
                  </div>

                  {/* Organizers */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event Organizers <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-4">
                      {form.organizers.map((organizer, idx) => (
                        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50" key={idx}>
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="text-sm font-medium text-gray-800">Organizer #{idx + 1}</h4>
                            {form.organizers.length > 1 && (
                              <button 
                                type="button" 
                                onClick={() => removeOrganizer(idx)} 
                                className="px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-xs font-medium"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          
                          {/* Organizer Selection */}
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Select Organizer</label>
                              <div className="relative organizer-dropdown-container">
                                <input
                                  type="text"
                                  value={organizer.searchQuery || ''}
                                  onChange={(e) => handleOrganizerSearch(idx, e.target.value)}
                                  placeholder="Search existing organizers..."
                                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  onFocus={() => setActiveOrganizerDropdown(idx)}
                                />
                                <div className="absolute right-2 top-2">
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                  </svg>
                                </div>
                                
                                {/* Dropdown Results */}
                                {activeOrganizerDropdown === idx && (
                                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                                    {filteredOrganizers.length > 0 ? (
                                      <>
                                        {filteredOrganizers.map((org) => (
                                          <div
                                            key={org.id}
                                            onClick={() => selectExistingOrganizer(idx, org)}
                                            className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                          >
                                            <div className="flex justify-between items-center">
                                              <div>
                                                <p className="text-sm font-medium text-gray-900">{org.name}</p>
                                                <p className="text-xs text-gray-500">{org.email}</p>
                                              </div>
                                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                EMP: {org.employee_id}
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                        <div className="border-t border-gray-200">
                                          <div
                                            onClick={() => openNewOrganizerModal(idx)}
                                            className="px-3 py-2 hover:bg-green-50 cursor-pointer text-green-700 font-medium text-sm flex items-center"
                                          >
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                            First time organizing / Not listed
                                          </div>
                                        </div>
                                      </>
                                    ) : (
                                      <div
                                        onClick={() => openNewOrganizerModal(idx)}
                                        className="px-3 py-3 hover:bg-green-50 cursor-pointer text-green-700 font-medium text-sm flex items-center justify-center"
                                      >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        Create New Organizer Profile
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Selected Organizer Display */}
                            {organizer.selected && (
                              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-blue-900">{organizer.name}</p>
                                    <p className="text-xs text-blue-700">{organizer.email}</p>
                                    <p className="text-xs text-blue-600">Employee ID: {organizer.employee_id}</p>
                                    {organizer.isNew && (
                                      <span className="inline-block mt-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                        New Organizer - Requires Approval
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => clearOrganizerSelection(idx)}
                                    className="text-blue-600 hover:text-blue-800 text-xs underline"
                                  >
                                    Change
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {idx === form.organizers.length - 1 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <button 
                                type="button" 
                                onClick={addOrganizer} 
                                className="w-full px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm font-medium flex items-center justify-center"
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Add Another Organizer
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {errors.organizers && <p className="text-xs text-red-600 mt-1">{errors.organizers}</p>}
                  </div>

                  {/* Contact Information */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Information <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      {form.contacts.map((c, idx) => (
                        <div className="grid grid-cols-2 gap-2" key={idx}>
                          <input 
                            type="text" 
                            value={c.name} 
                            onChange={e => handleContactChange(idx, 'name', e.target.value)} 
                            required 
                            placeholder="Contact Name"
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                          />
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              value={c.contact} 
                              onChange={e => handleContactChange(idx, 'contact', e.target.value)} 
                              required 
                              placeholder="Email/Phone"
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                            />
                            {form.contacts.length > 1 && (
                              <button 
                                type="button" 
                                onClick={() => removeContact(idx)} 
                                className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm font-medium"
                              >
                                −
                              </button>
                            )}
                            {idx === form.contacts.length - 1 && (
                              <button 
                                type="button" 
                                onClick={addContact} 
                                className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm font-medium"
                              >
                                +
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {errors.contacts && <p className="text-xs text-red-600 mt-1">{errors.contacts}</p>}
                  </div>
                </div>
              </div>

              {/* Event Mode & Location Section */}
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-6 border-b pb-2">Event Mode & Location</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Mode<span className="text-red-500">*</span></label>
                    <select name="mode" value={form.mode} onChange={handleChange} required className={`mt-1 block w-full rounded-md border ${errors.mode ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2`}>
                      <option value="">Select Mode</option>
                      <option value="online">Online</option>
                      <option value="offline">Offline</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                    {errors.mode && <p className="text-xs text-red-500">{errors.mode}</p>}
                  </div>

                  {form.mode === 'offline' || form.mode === 'hybrid' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Venue Selection<span className="text-red-500">*</span>
                      </label>
                      
                      {/* Venue Selection */}
                      <div className="mb-4">
                        <select 
                          value={selectedVenueId} 
                          onChange={(e) => handleVenueSelection(e.target.value)}
                          className={`w-full rounded-md border ${errors.venue ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3`}
                        >
                          <option value="">Select a venue...</option>
                          {venues.filter(v => v.is_active).map((venue) => (
                            <option key={venue.venue_id} value={venue.venue_id}>
                              {venue.venue_name} - {venue.location} (Capacity: {venue.capacity || 'N/A'})
                            </option>
                          ))}
                        </select>
                        {errors.venue && <p className="text-xs text-red-500">{errors.venue}</p>}
                      </div>

                      {/* Selected Venue Details */}
                      {selectedVenueId && selectedVenueId !== 'custom' && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                          {(() => {
                            const selectedVenue = venues.find(v => v.venue_id === selectedVenueId);
                            return selectedVenue ? (
                              <div>
                                <h4 className="font-semibold text-blue-900 mb-2">Selected Venue: {selectedVenue.venue_name}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                                  <div>
                                    <p><strong>Location:</strong> {selectedVenue.location}</p>
                                    <p><strong>Capacity:</strong> {selectedVenue.capacity || 'N/A'} people</p>
                                    {selectedVenue.contact_person?.name && (
                                      <p><strong>Contact:</strong> {selectedVenue.contact_person.name}</p>
                                    )}
                                  </div>
                                  <div>
                                    {selectedVenue.facilities?.additional_facilities && selectedVenue.facilities.additional_facilities.length > 0 && (
                                      <div>
                                        <p><strong>Facilities:</strong></p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {selectedVenue.facilities.additional_facilities.slice(0, 3).map((facility, idx) => (
                                            <span key={idx} className="px-2 py-1 bg-blue-200 text-blue-800 rounded-full text-xs">
                                              {facility}
                                            </span>
                                          ))}
                                          {selectedVenue.facilities.additional_facilities.length > 3 && (
                                            <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded-full text-xs">
                                              +{selectedVenue.facilities.additional_facilities.length - 3} more
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : null;
                          })()}
                        </div>
                      )}

                      {/* Date Range Selection for Venue Booking */}
                      {selectedVenueId && selectedVenueId !== 'custom' && (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Select Booking Date Range<span className="text-red-500">*</span>
                          </label>
                          <DateRangePicker
                            startDate={bookingDateRange.start}
                            endDate={bookingDateRange.end}
                            onDateChange={handleBookingDateChange}
                            bookedDates={venueAvailability}
                            minDate={formatDateToLocal(new Date())}
                            className="w-full"
                          />
                          <p className="text-xs text-gray-500 mt-2">
                            {checkingAvailability ? 'Checking availability...' : 'Red dates are already booked. Select available dates for your event.'}
                          </p>
                        </div>
                      )}

                      {/* Venue Availability Status */}
                      {showVenueAvailability && venueBookings.length > 0 && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                          <h5 className="font-semibold text-gray-900 mb-3">
                            <i className="fas fa-info-circle mr-2"></i>
                            Current Bookings for This Venue
                          </h5>
                          <div className="space-y-2">
                            {venueBookings.slice(0, 3).map((booking, idx) => (
                              <div key={idx} className="bg-red-100 border border-red-200 rounded-lg p-3">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium text-red-900">{booking.event_name}</p>
                                    <p className="text-sm text-red-700">
                                      {new Date(booking.start_datetime).toLocaleDateString()} - {new Date(booking.end_datetime).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <span className="px-2 py-1 bg-red-200 text-red-800 rounded-full text-xs">
                                    Booked
                                  </span>
                                </div>
                              </div>
                            ))}
                            {venueBookings.length > 3 && (
                              <p className="text-sm text-gray-600 mt-2">
                                And {venueBookings.length - 3} more bookings...
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Manual venue entry for custom locations */}
                      <div className="mt-4">
                        <label className="flex items-center text-sm text-gray-600">
                          <input 
                            type="checkbox" 
                            checked={selectedVenueId === 'custom'}
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleVenueSelection('custom');
                                setForm(prev => ({ ...prev, venue: '' }));
                              } else {
                                handleVenueSelection('');
                              }
                            }}
                            className="mr-2"
                          />
                          Use custom venue/location (not in the venue list)
                        </label>
                      </div>

                      {selectedVenueId === 'custom' && (
                        <div className="mt-3">
                          <input 
                            type="text" 
                            name="venue" 
                            value={form.venue} 
                            onChange={handleChange} 
                            placeholder="Enter custom venue or location"
                            className={`w-full rounded-md border ${errors.venue ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3`}
                          />
                        </div>
                      )}
                    </div>
                  ) : form.mode === 'online' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Platform/Meeting Link<span className="text-red-500">*</span></label>
                      <input 
                        type="url" 
                        name="venue" 
                        value={form.venue} 
                        onChange={handleChange} 
                        placeholder="e.g., https://meet.google.com/xyz-abc-def or Zoom Meeting ID"
                        required 
                        className={`mt-1 block w-full rounded-md border ${errors.venue ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3`} 
                      />
                      {errors.venue && <p className="text-xs text-red-500">{errors.venue}</p>}
                      <p className="text-xs text-gray-500 mt-1">
                        For online events, provide the meeting platform link or details
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div>
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                <div className="relative group">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="orange" className="w-5 h-5 mr-2 cursor-help">
                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 0 1 .67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 1 1-.671-1.34l.041-.022ZM12 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                  </svg>
                  
                  {/* Tooltip */}
                  <div className="absolute left-0 top-8 w-80 bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-lg z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="flex items-start space-x-2">
                      <div className="w-5 h-5 text-amber-600 mt-0.5">⚠️</div>
                      <div className="text-sm text-amber-800">
                        <p className="font-medium mb-2">Schedule & Registration Guidelines:</p>
                        <ul className="space-y-1 text-xs">
                          <li>• <strong>Registration Period:</strong> When participants can register for the event</li>
                          <li>• <strong>Event Schedule:</strong> The actual event start and end times</li>
                          <li>• <strong>Certificate End:</strong> When certificates will no longer be downloadable</li>
                          <li>• Registration must end before the event starts</li>
                          <li>• Event end time must be after start time</li>
                          <li>• Certificate distribution should end after the event concludes</li>
                          <li>• All times are in your local timezone</li>
                          <li>• Choose appropriate registration type and participant limits</li>
                        </ul>
                      </div>
                    </div>
                    
                    {/* Arrow pointing up */}
                    <div className="absolute -top-2 left-4 w-4 h-4 bg-amber-50 border-l border-t border-amber-200 transform rotate-45"></div>
                  </div>
                </div>
                Schedule & Registration Details
              </h2>
              <p className="text-sm text-gray-600">Set the schedule for your event, registration periods, and configure registration settings</p>
            </div>
            
            <div className="space-y-10">
              {/* Date & Time Section */}
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-6 border-b pb-2">Event Schedule</h3>
                <div className="space-y-8">
                  {/* 1 & 2. Registration Period and Event Period - Side by Side */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Registration Period */}
                    <DateRangePicker
                      label="Registration Period"
                      startDate={form.registration_start_date ? new Date(form.registration_start_date) : null}
                      endDate={form.registration_end_date ? new Date(form.registration_end_date) : null}
                      startTime={form.registration_start_time}
                      endTime={form.registration_end_time}
                      onDateChange={(startDate, endDate) => {
                        setForm(prev => ({
                          ...prev,
                          registration_start_date: formatDateToLocal(startDate),
                          registration_end_date: formatDateToLocal(endDate)
                        }));
                      }}
                      onTimeChange={(startTime, endTime) => {
                        setForm(prev => ({
                          ...prev,
                          registration_start_time: startTime || '',
                          registration_end_time: endTime || ''
                        }));
                      }}
                      includeTime={true}
                      required={true}
                      placeholder="Select registration period"
                      minDate={formatDateToLocal(new Date())}
                      error={errors.registration_start_date || errors.registration_end_date || errors.registration_start_time || errors.registration_end_time}
                      className="w-full"
                    />

                    {/* Event Period */}
                    <DateRangePicker
                      label="Event Schedule"
                      startDate={form.start_date ? new Date(form.start_date) : null}
                      endDate={form.end_date ? new Date(form.end_date) : null}
                      startTime={form.start_time}
                      endTime={form.end_time}
                      onDateChange={(startDate, endDate) => {
                        setForm(prev => ({
                          ...prev,
                          start_date: formatDateToLocal(startDate),
                          end_date: formatDateToLocal(endDate)
                        }));
                      }}
                      onTimeChange={(startTime, endTime) => {
                        setForm(prev => ({
                          ...prev,
                          start_time: startTime || '',
                          end_time: endTime || ''
                        }));
                      }}
                      includeTime={true}
                      required={true}
                      placeholder="Select event duration"
                      minDate={form.registration_start_date || formatDateToLocal(new Date())}
                      error={errors.start_date || errors.end_date || errors.start_time || errors.end_time}
                      className="w-full"
                    />
                  </div>

                  {/* Certificate Distribution End & Timeline Preview - Side by Side */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Certificate Distribution End - Left Side */}
                    <div className="bg-purple-50 rounded-lg p-8 border border-purple-200 cursor-pointer hover:bg-purple-100 transition-colors min-h-[350px] flex flex-col">
                      <div className="flex-1">
                        <DateRangePicker
                          label="Certificate Distribution End"
                          startDate={form.certificate_end_date ? new Date(form.certificate_end_date) : null}
                          endDate={null} // Single date picker
                          startTime={form.certificate_end_time}
                          endTime={null} // Single time picker
                          onDateChange={(startDate, endDate) => {
                            setForm(prev => ({
                              ...prev,
                              certificate_end_date: formatDateToLocal(startDate)
                            }));
                          }}
                          onTimeChange={(startTime, endTime) => {
                            setForm(prev => ({
                              ...prev,
                              certificate_end_time: startTime || ''
                            }));
                          }}
                          includeTime={true}
                          required={true}
                          placeholder="Select certificate distribution end date"
                          minDate={form.end_date || formatDateToLocal(new Date())}
                          error={errors.certificate_end_date || errors.certificate_end_time}
                          className="w-full"
                          singleDate={true} // Enable single date mode
                          description="Set when certificates will no longer be available for download"
                          theme="purple"
                        />
                        
                        <div className="mt-4 p-3 bg-purple-100 border border-purple-300 rounded-lg">
                          <p className="text-sm text-purple-800">
                            <strong>📅 Note:</strong> After this date and time, certificates will no longer be available for download by participants.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Timeline Validation Display - Right Side */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 min-h-[350px] flex flex-col">
                      <h3 className="text-lg font-medium text-blue-900 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        Event Timeline Preview
                      </h3>
                      
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${form.registration_start_date && form.registration_start_time ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                          <span className={`text-sm font-medium ${form.registration_start_date && form.registration_start_time ? 'text-green-800' : 'text-gray-600'}`}>Registration Opens:</span>
                          <span className={`text-sm ${form.registration_start_date && form.registration_start_time ? 'text-green-700' : 'text-gray-500 italic'}`}>
                            {form.registration_start_date && form.registration_start_time 
                              ? new Date(`${form.registration_start_date}T${form.registration_start_time}`).toLocaleString()
                              : 'Not set yet'
                            }
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${form.registration_end_date && form.registration_end_time ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>
                          <span className={`text-sm font-medium ${form.registration_end_date && form.registration_end_time ? 'text-yellow-800' : 'text-gray-600'}`}>Registration Closes:</span>
                          <span className={`text-sm ${form.registration_end_date && form.registration_end_time ? 'text-yellow-700' : 'text-gray-500 italic'}`}>
                            {form.registration_end_date && form.registration_end_time 
                              ? new Date(`${form.registration_end_date}T${form.registration_end_time}`).toLocaleString()
                              : 'Not set yet'
                            }
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${form.start_date && form.start_time ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                          <span className={`text-sm font-medium ${form.start_date && form.start_time ? 'text-blue-800' : 'text-gray-600'}`}>Event Starts:</span>
                          <span className={`text-sm ${form.start_date && form.start_time ? 'text-blue-700' : 'text-gray-500 italic'}`}>
                            {form.start_date && form.start_time 
                              ? new Date(`${form.start_date}T${form.start_time}`).toLocaleString()
                              : 'Not set yet'
                            }
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${form.end_date && form.end_time ? 'bg-indigo-500' : 'bg-gray-300'}`}></div>
                          <span className={`text-sm font-medium ${form.end_date && form.end_time ? 'text-indigo-800' : 'text-gray-600'}`}>Event Ends:</span>
                          <span className={`text-sm ${form.end_date && form.end_time ? 'text-indigo-700' : 'text-gray-500 italic'}`}>
                            {form.end_date && form.end_time 
                              ? new Date(`${form.end_date}T${form.end_time}`).toLocaleString()
                              : 'Not set yet'
                            }
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${form.certificate_end_date && form.certificate_end_time ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
                          <span className={`text-sm font-medium ${form.certificate_end_date && form.certificate_end_time ? 'text-purple-800' : 'text-gray-600'}`}>Certificates Expire:</span>
                          <span className={`text-sm ${form.certificate_end_date && form.certificate_end_time ? 'text-purple-700' : 'text-gray-500 italic'}`}>
                            {form.certificate_end_date && form.certificate_end_time 
                              ? new Date(`${form.certificate_end_date}T${form.certificate_end_time}`).toLocaleString()
                              : 'Not set yet'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Registration Type & Fee Structure Section */}
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-6 border-b pb-2">Registration Settings</h3>
                <div className="space-y-6">
                  {/* Registration Type and Mode in same row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700">
                        Registration Type<span className="text-red-500">*</span>
                      </label>
                      <select name="registration_type" value={form.registration_type} onChange={handleChange} required className={`mt-1 px-4 py-2 w-full rounded-lg border ${errors.registration_type ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}>
                        <option value="">Select Registration Type</option>
                        <option value="free">Free Registration</option>
                        <option value="paid">Paid Registration</option>
                        <option value="sponsored">Sponsored Event</option>
                      </select>
                      <p className="helper-text text-xs text-gray-500 mt-1">Choose whether the event is free, paid, or sponsored</p>
                      {errors.registration_type && <p className="text-xs text-red-500">{errors.registration_type}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700">Registration Mode<span className="text-red-500">*</span></label>
                      <select name="registration_mode" value={form.registration_mode} onChange={handleChange} required className={`mt-1 px-4 py-2 w-full rounded-lg border ${errors.registration_mode ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}>
                        <option value="">Select Registration Mode</option>
                        <option value="individual">Individual Registration</option>
                        <option value="team">Team Registration</option>
                      </select>
                      <p className="helper-text text-xs text-gray-500 mt-1">Choose whether participants register individually or as teams</p>
                      {errors.registration_mode && <p className="text-xs text-red-500">{errors.registration_mode}</p>}
                    </div>
                  </div>
                  {showFeeFields && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="fee-fields">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700">Registration Fee (₹)</label>
                        <input type="number" name="registration_fee" min="0" step="0.01" value={form.registration_fee} onChange={handleChange} placeholder="e.g., 500.00" className={`mt-1 px-4 py-2 w-full rounded-lg border ${errors.registration_fee ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`} />
                        <p className="helper-text text-xs text-gray-500 mt-1">Enter the registration fee amount</p>
                        {errors.registration_fee && <p className="text-xs text-red-500">{errors.registration_fee}</p>}
                      </div>
                      <div className="mt-4 md:mt-0">
                        <label className="block text-sm font-semibold text-gray-700">Fee Description <span className="text-gray-500">(Optional)</span></label>
                        <textarea name="fee_description" value={form.fee_description} onChange={handleChange} rows={3} placeholder="e.g., Includes lunch, materials, certificate, etc." className="mt-1 px-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
                        <p className="helper-text text-xs text-gray-500 mt-1">Describe what the fee includes or additional payment details</p>
                      </div>
                    </div>
                  )}
                  {showTeamFields && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="team-fields">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700">Minimum Team Size</label>
                        <input type="number" name="team_size_min" min="2" value={form.team_size_min} onChange={handleChange} placeholder="e.g., 2" className={`mt-1 px-4 py-2 w-full rounded-lg border ${errors.team_size_min ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`} />
                        <p className="helper-text text-xs text-gray-500 mt-1">Minimum number of members per team</p>
                        {errors.team_size_min && <p className="text-xs text-red-500">{errors.team_size_min}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700">Maximum Team Size</label>
                        <input type="number" name="team_size_max" min="2" value={form.team_size_max} onChange={handleChange} placeholder="e.g., 5" className={`mt-1 px-4 py-2 w-full rounded-lg border ${errors.team_size_max ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`} />
                        <p className="helper-text text-xs text-gray-500 mt-1">Maximum number of members per team</p>
                        {errors.team_size_max && <p className="text-xs text-red-500">{errors.team_size_max}</p>}
                      </div>
                      <div className="md:col-span-2">
                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            name="allow_multiple_team_registrations"
                            checked={form.allow_multiple_team_registrations}
                            onChange={handleChange}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                          />
                          <div>
                            <span className="text-sm font-semibold text-gray-700">Allow Multiple Team Registrations</span>
                            <p className="text-xs text-gray-500">Allow students to be part of multiple teams for this event (requires approval)</p>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700">Maximum Participants <span className="text-gray-500">(Optional)</span></label>
                      <input type="number" name="max_participants" min="1" value={form.max_participants} onChange={handleChange} placeholder="e.g., 100" className="mt-1 px-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
                      <p className="helper-text text-xs text-gray-500 mt-1">Maximum number of participants allowed (leave empty for unlimited)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700">Minimum Participants</label>
                      <input type="number" name="min_participants" min="1" value={form.min_participants} onChange={handleChange} placeholder="e.g., 10" className="mt-1 px-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
                      <p className="helper-text text-xs text-gray-500 mt-1">Minimum number of participants required for the event to proceed</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Certificate Template</h2>
              <p className="text-sm text-gray-600">Upload and configure the certificate template for participants</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Certificate Template (HTML)<span className="text-red-500">*</span></label>
                <input type="file" name="certificate_template" accept=".html" onChange={handleChange} required className={`mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 ${errors.certificate_template ? 'border-red-500' : ''}`} />
                {errors.certificate_template && <p className="text-xs text-red-500">{errors.certificate_template}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Template Assets</label>
                <input type="file" name="assets" multiple onChange={handleChange} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Review</h2>
              <p className="text-sm text-gray-600">Review all event details before submission</p>
              
              {/* Auto-submission protection indicator */}
              {justArrivedAtReview && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-yellow-800 font-medium">
                      Auto-submission protection active
                    </span>
                  </div>
                  <p className="text-xs text-yellow-700 mt-1">
                    Please wait a moment before clicking "Create Event" to prevent accidental submission.
                  </p>
                </div>
              )}
            </div>
            {renderReview()}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Once you submit this form, your event will be created and published. Please ensure all information is correct before proceeding.
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Progress bar width
  const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <AdminLayout pageTitle="Create Event">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Create New Event</h1>
              <p className="text-sm text-gray-600 mt-1">Configure event details and settings</p>
              
              {/* Executive Admin Session Indicator */}
              {user?.role === 'executive_admin' && (
                <div className="mt-4">
                  {eventCreatorSession ? (
                    <div className="inline-flex items-center px-3 py-1.5 bg-green-50 border border-green-200 rounded-md">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-sm text-green-800">
                        Creator: {eventCreatorSession.creatorName}
                      </span>
                      <button
                        onClick={() => setShowCreatorModal(true)}
                        className="ml-2 text-xs text-green-700 hover:text-green-900 px-1 py-0.5 rounded"
                        title="Change creator"
                      >
                        Edit
                      </button>
                    </div>
                  ) : (
                    <div className="inline-flex items-center px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-md">
                      <div className="w-2 h-2 bg-amber-500 rounded-full mr-2"></div>
                      <span className="text-sm text-amber-800">No active session</span>
                      <button
                        onClick={() => setShowCreatorModal(true)}
                        className="ml-2 text-xs text-amber-700 hover:text-amber-900 px-1 py-0.5 rounded"
                      >
                        Start
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Quick Actions */}
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => window.open('/admin/certificates', '_blank')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-md text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                Certificates
              </button>
              <button
                type="button"
                onClick={() => window.open('/admin/certificate-editor', '_blank')}
                className="inline-flex items-center px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
                Editor
              </button>
            </div>
          </div>
        </div>

        {/* Progress Stepper */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="relative">
            {/* Progress Line */}
            <div className="absolute top-6 left-0 w-full h-0.5 bg-gray-200">
              <div 
                className="h-full bg-blue-600 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            {/* Steps */}
            <div className="relative flex justify-between">
              {steps.map((label, idx) => {
                const stepNum = idx + 1;
                const isActive = stepNum === currentStep;
                const isCompleted = stepNum < currentStep;
                
                return (
                  <div key={idx} className="flex flex-col items-center">
                    <div className={`
                      w-12 h-12 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-all duration-200
                      ${isActive ? 'border-blue-600 bg-blue-600 text-white' : 
                        isCompleted ? 'border-green-500 bg-green-500 text-white' : 
                        'border-gray-300 bg-white text-gray-500'}
                    `}>
                      {isCompleted ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : stepNum}
                    </div>
                    <span className={`
                      mt-2 text-xs text-center font-medium max-w-20
                      ${isActive ? 'text-blue-600' : 
                        isCompleted ? 'text-green-600' : 
                        'text-gray-500'}
                    `}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <form 
            onKeyDown={handleFormEvent}
            noValidate
            autoComplete="off"
          >
            {/* Form Content */}
            <div className="p-8">
              {renderStep()}
            </div>

            {/* Form Actions */}
            <div className="border-t border-gray-200 px-8 py-6 bg-gray-50">
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={prevStep}
                  className={`
                    inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 
                    rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                    ${currentStep === 1 ? 'invisible' : ''}
                  `}
                  disabled={currentStep === 1}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
                  </svg>
                  Previous
                </button>

                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">
                    Step {currentStep} of {totalSteps}
                  </span>
                  
                  {currentStep < totalSteps ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="inline-flex items-center px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md text-sm font-medium transition-colors"
                    >
                      Next
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                      </svg>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={async (e) => {
                        console.log('🖱️ Submit button clicked by user');
                        setUserClickedSubmit(true);
                        
                        // Create a synthetic event with the required properties
                        const syntheticEvent = {
                          preventDefault: () => {},
                          isTrusted: true,
                          type: 'submit',
                          target: e.target.closest('form'),
                          nativeEvent: {
                            submitter: e.target
                          }
                        };
                        
                        // Call handleSubmit directly
                        await handleSubmit(syntheticEvent);
                      }}
                      disabled={justArrivedAtReview}
                      className={`inline-flex items-center px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                        justArrivedAtReview 
                          ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                      </svg>
                      {justArrivedAtReview ? 'Please wait...' : 'Create Event'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Creator Modal */}
      {showCreatorModal && (
        <div className="fixed inset-0 bg-white/50 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Who is creating this event?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Since this is a universal Executive Admin account, please enter your actual name to track who is creating events.
            </p>
            <input
              type="text"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCreatorSubmit();
                }
              }}
              autoFocus
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreatorModal(false);
                  setCreatorName('');
                  // If no session exists and user cancels, logout immediately
                  if (!eventCreatorSession) {
                    alert('Creator session is required for Executive Admin. Logging out...');
                    logout();
                    navigate('/login');
                  }
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatorSubmit}
                disabled={!creatorName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Start Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Organizer Modal */}
      {showNewOrganizerModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Create New Organizer Profile
              </h3>
              <button
                onClick={closeNewOrganizerModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleNewOrganizerSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newOrganizerForm.name}
                  onChange={(e) => setNewOrganizerForm(prev => ({...prev, name: e.target.value}))}
                  placeholder="Enter organizer's full name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={newOrganizerForm.email}
                  onChange={(e) => setNewOrganizerForm(prev => ({...prev, email: e.target.value}))}
                  placeholder="Enter official email address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Login credentials will be sent to this email
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newOrganizerForm.employee_id}
                  onChange={(e) => setNewOrganizerForm(prev => ({...prev, employee_id: e.target.value}))}
                  placeholder="Enter employee ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="text-xs text-yellow-800">
                    <p className="font-medium mb-1">Important Notes:</p>
                    <ul className="space-y-1">
                      <li>• Login credentials will be emailed automatically</li>
                      <li>• Organizer can only manage their own events</li>
                      <li>• Password change required on first login</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeNewOrganizerModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Create Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default CreateEvent;
