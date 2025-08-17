import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import DateTimePicker from '../../components/common/DateTimePicker';
import DateRangePicker from '../../components/common/DateRangePicker';
import ClockPicker from '../../components/common/ClockPicker';
import AttendancePreview from '../../components/AttendancePreview';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../api/admin';
import { formatDateToLocal } from '../../utils/dateHelpers';
import { Dropdown, SearchBox, Checkbox } from '../../components/ui';
import unifiedStorage from '../../services/unifiedStorage';

// Helper for step progress
const steps = [
  'Basic Info',
  'Organizer & Registration',
  'Schedule & Location',
  'Certificate',
  'Review'
];

function CreateEvent() {
  const navigate = useNavigate();
  const { user, userType, isAuthenticated, logout } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = steps.length;
  const [venues, setVenues] = useState([]);
  const [filteredVenues, setFilteredVenues] = useState([]);
  const [showVenueDropdown, setShowVenueDropdown] = useState(false);
  
  // Session management for Executive Admin
  const [eventCreatorSession, setEventCreatorSession] = useState(null);
  const [showCreatorModal, setShowCreatorModal] = useState(false);
  const [creatorName, setCreatorName] = useState('');
  const [creatorEmail, setCreatorEmail] = useState('');
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());

  // Organizer management states (removed new organizer modal - faculty accounts managed separately)
  const [activeOrganizerDropdown, setActiveOrganizerDropdown] = useState(null);
  const [existingOrganizers, setExistingOrganizers] = useState([]);
  const [filteredOrganizers, setFilteredOrganizers] = useState([]);

  // Notification state for duplicate selection alerts
  const [organizerNotification, setOrganizerNotification] = useState(null);

  // Attendance preview and customization states
  const [showAttendanceCustomization, setShowAttendanceCustomization] = useState(false);
  const [customAttendanceStrategy, setCustomAttendanceStrategy] = useState(null);
  
  // Loading state for form submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  // Session management functions
  const createEventCreatorSession = (name, email) => {
    if (user && user.role === 'executive_admin') {
      // Create unique session key for this user
      const sessionKey = `eventCreatorSession_${user.username || user.id || 'default'}`;
      
      const sessionData = {
        creatorName: name || user.fullname || user.username || 'Executive Admin',
        creatorEmail: email || '',
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
    if (creatorName.trim() && creatorEmail.trim()) {
      createEventCreatorSession(creatorName.trim(), creatorEmail.trim());
      setShowCreatorModal(false);
      setCreatorName('');
      setCreatorEmail('');
    }
  };
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
    attendance_mandatory: true,
    is_certificate_based: false,
    certificate_templates: {},
    event_poster: null,
    assets: [],
  });
  const [errors, setErrors] = useState({});
  const [existingEventIds, setExistingEventIds] = useState([]);

  // Helper function to format strategy type for display
  const formatStrategyType = (strategyType) => {
    const strategyMapping = {
      'session_based': 'Session Based',
      'single_mark': 'Single Mark',
      'percentage_based': 'Percentage Based',
      'time_based': 'Time Based',
      'milestone_based': 'Milestone Based',
      'continuous': 'Continuous',
      'hybrid': 'Hybrid'
    };
    
    return strategyMapping[strategyType] || (strategyType ? strategyType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Auto-detected');
  };

  // Certificate template types based on event type
  const getCertificateTypes = (eventType, eventMode = null) => {
    const certificateMapping = {
      'technical': [
        'Certificate of Participation',
        'Certificate of Achievement'
      ],
      'cultural': [
        'Certificate of Participation',
        ...(eventMode === 'hybrid' || eventMode === 'online' ? ['Winner Certificate'] : [])
      ],
      'sport': [
        'Certificate of Participation'
      ],
      'workshop': [
        'Certificate of Completion',
        'Certificate of Excellence'
      ],
      'training': [
        'Certificate of Completion',
        'Certificate of Excellence'
      ],
      'seminar': [
        'Certificate of Attendance'
      ],
      'conference': [
        'Certificate of Attendance'
      ],
      'competition': [
        'Certificate of Participation',
        ...(eventMode === 'hybrid' || eventMode === 'online' ? ['Winner Certificate'] : [])
      ],
      'hackathon': [
        'Certificate of Participation',
        'Certificate of Innovation',
        ...(eventMode === 'hybrid' || eventMode === 'online' ? ['Winner Certificate'] : [])
      ],
      'other': [
        'Certificate of Participation'
      ]
    };
    
    return certificateMapping[eventType?.toLowerCase()] || certificateMapping['other'];
  };

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
      
      console.log('🔍 Existing Session:', existingSession);
      
      if (!existingSession) {
        // Show modal to ask for creator name
        console.log('🔔 Showing creator modal for Executive Admin');
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

  const loadExistingEventIds = async () => {
    try {
      console.log('🔄 Loading existing event IDs from database...');
      const response = await adminAPI.getEvents();
      if (response.data && response.data.events) {
        const eventIds = response.data.events.map(event => event.event_id);
        setExistingEventIds(eventIds);
        console.log('📋 Loaded existing event IDs:', eventIds);
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
      
      const response = await adminAPI.getVenues();
      console.log('Venues API response:', response);
      
      if (response.data) {
        // The API returns { success: true, data: [venues], message: "..." }
        // So we need to access response.data.data, not just response.data
        const apiData = response.data.data || response.data;
        const venueArray = Array.isArray(apiData) ? apiData : [];
        setVenues(venueArray);
        // Initialize filteredVenues with all active venues
        const activeVenues = venueArray.filter(v => v.is_active);
        setFilteredVenues(activeVenues);
        console.log(`Loaded ${venueArray.length} venues (${activeVenues.length} active)`);
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

    return `${baseId}${Date.now()}`;
  };

  // Auto-generate event ID based on title, type, and audience
  const generateEventId = (title, type, audience, isXenesisEvent = false) => {
    if (!title || !type || !audience) return '';

    // Create abbreviations
    const titleWords = title.trim().split(/\s+/).filter(word => word.length > 0);
    const titleAbbr = titleWords.length > 1 
      ? titleWords.map(word => word[0].toUpperCase()).join('').slice(0, 4)
      : title.slice(0, 4).toUpperCase();

    const typeAbbr = type.slice(0, 2).toUpperCase();
    const audienceAbbr = audience === 'students' ? 'STU' 
                      : audience === 'faculty' ? 'FAC'
                      : audience === 'both' ? 'ALL'
                      : audience.slice(0, 3).toUpperCase();

    const year = new Date().getFullYear();
    
    // Create continuous base ID without underscores
    let baseId;
    if (isXenesisEvent) {
      baseId = `XEN${titleAbbr}${typeAbbr}${audienceAbbr}${year}`;
    } else {
      baseId = `${titleAbbr}${typeAbbr}${audienceAbbr}${year}`;
    }
    
    // Clean up: remove special characters and ensure valid format
    baseId = baseId.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    // Check if this ID already exists, if so add a number
    let finalId = baseId;
    let counter = 1;
    
    while (existingEventIds.includes(finalId)) {
      finalId = `${baseId}${counter}`;
      counter++;
    }
    
    return finalId;
  };

  // Auto-generate event ID when title, type, audience, or xenesis status changes
  useEffect(() => {
    if (form.event_name && form.event_type && form.target_audience) {
      const generatedId = generateEventId(form.event_name, form.event_type, form.target_audience, form.is_xenesis_event);
      if (generatedId && generatedId !== form.event_id) {
        setForm(prev => ({ ...prev, event_id: generatedId }));
      }
    }
  }, [form.event_name, form.event_type, form.target_audience, form.is_xenesis_event, existingEventIds]);

  // Load faculty organizers on component mount
  useEffect(() => {
    const fetchFacultyOrganizers = async () => {
      try {
        console.log('Loading faculty organizers...');
        
        const response = await adminAPI.getFacultyOrganizers({ limit: 100 });
        console.log('✅ Loaded faculty organizers from API:', response.data);
        console.log('🔍 Faculty data structure:', response.data.data);
        console.log('🔍 Faculty count:', response.data.data?.length || 0);
        
        const facultyData = response.data.data || [];
        setExistingOrganizers(facultyData);
        setFilteredOrganizers(facultyData);
        
        console.log('✅ Set faculty organizers in state:', facultyData.length);
        
        // If current user is faculty/organizer, pre-select them
        if (userType === 'admin' && user?.role === 'organizer_admin' && user?.employee_id) {
          const currentFaculty = facultyData.find(f => f.employee_id === user.employee_id);
          if (currentFaculty) {
            setForm(prev => ({
              ...prev,
              organizers: [{
                id: currentFaculty.employee_id,
                name: currentFaculty.full_name,
                email: currentFaculty.email,
                employee_id: currentFaculty.employee_id,
                searchQuery: '',
                selected: true,
                isNew: false
              }]
            }));
          }
        }
      } catch (error) {
        console.error('❌ Error fetching faculty organizers:', error);
        setExistingOrganizers([]);
        setFilteredOrganizers([]);
      }
    };

    if (isAuthenticated && userType) {
      fetchFacultyOrganizers();
    }
  }, [isAuthenticated, userType, user]);

  // Reset certificate templates when event type or mode changes
  useEffect(() => {
    if (form.event_type && form.is_certificate_based) {
      // Clear existing templates when event type or mode changes
      setForm(prev => ({
        ...prev,
        certificate_templates: {}
      }));
    }
  }, [form.event_type, form.mode]);

  // Clear attendance data when attendance is not mandatory
  useEffect(() => {
    if (!form.attendance_mandatory) {
      setCustomAttendanceStrategy(null);
      setShowAttendanceCustomization(false);
    }
  }, [form.attendance_mandatory]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeOrganizerDropdown !== null && 
          !event.target.closest('.organizer-dropdown-container')) {
        setActiveOrganizerDropdown(null);
      }
      // Close venue dropdown when clicking outside
      if (showVenueDropdown && !event.target.closest('.venue-search-container')) {
        setShowVenueDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeOrganizerDropdown, showVenueDropdown]);

  // Handle checkbox changes with explicit state updates
  const handleCheckboxChange = (name, checked) => {
    setForm(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  // Handlers
  const handleChange = (e) => {
    const { name, value, type, files, checked } = e.target;
    
    if (type === 'file') {
      if (name === 'certificate_template') {
        setForm((prev) => ({ ...prev, certificate_template: files[0] }));
      } else if (name === 'assets') {
        setForm((prev) => ({ ...prev, assets: Array.from(files) }));
      } else if (name === 'event_poster') {
        setForm((prev) => ({ ...prev, event_poster: files[0] }));
      }
    } else if (type === 'checkbox') {
      setForm((prev) => ({ ...prev, [name]: checked }));
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
    // Clear any existing notification when adding new organizer
    setOrganizerNotification(null);
    
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
    // Clear any existing notification
    setOrganizerNotification(null);
    
    const newOrganizers = form.organizers.filter((_, i) => i !== idx);
    setForm((prev) => ({ ...prev, organizers: newOrganizers }));
  };

  const handleOrganizerSearch = (idx, searchQuery) => {
    const newOrganizers = [...form.organizers];
    newOrganizers[idx].searchQuery = searchQuery;
    setForm((prev) => ({ ...prev, organizers: newOrganizers }));

    // Show all organizers if search is empty
    if (!searchQuery || !searchQuery.trim()) {
      setFilteredOrganizers(existingOrganizers);
      return;
    }

    // Filter existing faculty organizers based on search
    const filtered = existingOrganizers.filter(faculty => 
      faculty.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faculty.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faculty.employee_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faculty.department?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredOrganizers(filtered);
  };

  const selectExistingOrganizer = (idx, faculty) => {
    // Check if this faculty is already selected in any other organizer slot
    const isAlreadySelected = form.organizers.some((organizer, index) => 
      index !== idx && organizer.employee_id === faculty.employee_id && organizer.selected
    );

    if (isAlreadySelected) {
      // Show notification for duplicate selection
      setOrganizerNotification({
        type: 'warning',
        message: `${faculty.full_name} is already selected as an organizer for this event.`,
        faculty: faculty.full_name,
        employeeId: faculty.employee_id
      });

      // Auto-hide notification after 4 seconds
      setTimeout(() => {
        setOrganizerNotification(null);
      }, 4000);

      return; // Prevent selection
    }

    // Clear any existing notification
    setOrganizerNotification(null);

    const newOrganizers = [...form.organizers];
    newOrganizers[idx] = {
      id: faculty.employee_id,
      name: faculty.full_name,
      email: faculty.email,
      employee_id: faculty.employee_id,
      department: faculty.department,
      designation: faculty.designation,
      searchQuery: faculty.full_name,
      selected: true,
      isNew: false
    };
    setForm((prev) => ({ ...prev, organizers: newOrganizers }));
    setActiveOrganizerDropdown(null);
  };

  const clearOrganizerSelection = (idx) => {
    // Clear any existing notification
    setOrganizerNotification(null);
    
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

  // Remove unused organizer modal functions - faculty accounts managed separately

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
      // Event ID is auto-generated, so no validation needed
      if (!form.event_name) stepErrors.event_name = 'Event Title is required';
      if (!form.event_type) stepErrors.event_type = 'Event Type is required';
      if (!form.target_audience) stepErrors.target_audience = 'Target Audience is required';
      if (!form.short_description) stepErrors.short_description = 'Short Description is required';
      if (!form.detailed_description) stepErrors.detailed_description = 'Detailed Description is required';
    } else if (step === 2) {
      if (!form.organizing_department) {
        stepErrors.organizing_department = 'Organizing Department/Club is required';
      }
      
      // New organizer validation
      const selectedOrganizers = form.organizers.filter(org => org.selected);
      
      if (selectedOrganizers.length === 0) {
        stepErrors.organizers = 'At least one organizer must be selected from the dropdown';
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
    } else if (step === 3) {
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
      
      // Date/time logic validation
      const start = new Date(`${form.start_date}T${form.start_time}`);
      const end = new Date(`${form.end_date}T${form.end_time}`);
      const regStart = new Date(`${form.registration_start_date}T${form.registration_start_time}`);
      const regEnd = new Date(`${form.registration_end_date}T${form.registration_end_time}`);
      
      // Basic time ordering checks
      if (end <= start) stepErrors.end_time = 'Event end must be after event start';
      if (regEnd <= regStart) stepErrors.registration_end_time = 'Registration end must be after registration start';
      
      // Registration period constraint - event cannot start before registration ends
      if (start < regEnd) stepErrors.start_date = 'Event cannot start before registration period ends';
      
      // Ensure reasonable gap between registration end and event start (optional warning)
      const timeDiff = start - regEnd;
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      if (hoursDiff < 1 && hoursDiff >= 0) {
        stepErrors.start_time = 'Recommend at least 1 hour gap between registration end and event start';
      }
      
      // Registration validation
      if (!form.registration_type) stepErrors.registration_type = 'Registration Type is required';
      if (showFeeFields && !form.registration_fee) stepErrors.registration_fee = 'Fee is required';
      if (!form.registration_mode) stepErrors.registration_mode = 'Registration Mode is required';
      if (showTeamFields) {
        if (!form.team_size_min) stepErrors.team_size_min = 'Min team size required';
        if (!form.team_size_max) stepErrors.team_size_max = 'Max team size required';
      }
    } else if (step === 4) {
      // Only validate certificates if this is a certificate-based event
      if (form.is_certificate_based) {
        const certificateTypes = getCertificateTypes(form.event_type, form.mode);
        const hasRequiredTemplates = certificateTypes.every(type => 
          form.certificate_templates[type] && form.certificate_templates[type] !== null
        );
        
        if (!hasRequiredTemplates) {
          stepErrors.certificate_templates = 'All required certificate templates must be uploaded';
        }
      }
    }
    
    setErrors(stepErrors);
    const isValid = Object.keys(stepErrors).length === 0;
    return isValid;
  };

  // Navigation with validation
  const nextStep = () => {
    if (validateStep(currentStep)) {
      const newStep = Math.min(currentStep + 1, totalSteps);
      setCurrentStep(newStep);
    }
  };
  const prevStep = () => {
    setCurrentStep((s) => Math.max(s - 1, 1));
  };

  // Review summary
  const renderReview = () => (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Review Your Event</h2>
            <p className="text-sm text-gray-600 mt-1">Please review all details before creating your event</p>
          </div>
        </div>
      </div>

      {/* Review Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Basic Information
              </h3>
              <button 
                onClick={() => setCurrentStep(1)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Edit
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Event ID:</span>
                <span className="text-sm text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded">{form.event_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Event Name:</span>
                <span className="text-sm text-gray-900 font-medium">{form.event_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Type:</span>
                <span className="text-sm text-gray-900 capitalize">{form.event_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Audience:</span>
                <span className="text-sm text-gray-900 capitalize">{form.target_audience}</span>
              </div>
              {form.is_xenesis_event && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Category:</span>
                  <span className="text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded-full">Xenesis Event</span>
                </div>
              )}
              <div className="pt-2 border-t border-gray-100">
                <span className="text-sm font-medium text-gray-600">Description:</span>
                <p className="text-sm text-gray-900 mt-1">{form.short_description}</p>
              </div>
            </div>
          </div>

          {/* Schedule Information */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Schedule & Timeline
              </h3>
              <button 
                onClick={() => setCurrentStep(3)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Edit
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm font-medium text-green-800">Registration Period</span>
                </div>
                <p className="text-sm text-green-700 ml-5">
                  {new Date(`${form.registration_start_date}T${form.registration_start_time}`).toLocaleString()} 
                  <br />to {new Date(`${form.registration_end_date}T${form.registration_end_time}`).toLocaleString()}
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-sm font-medium text-blue-800">Event Duration</span>
                </div>
                <p className="text-sm text-blue-700 ml-5">
                  {new Date(`${form.start_date}T${form.start_time}`).toLocaleString()} 
                  <br />to {new Date(`${form.end_date}T${form.end_time}`).toLocaleString()}
                </p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                  <span className="text-sm font-medium text-purple-800">Certificate Available Until</span>
                </div>
                <p className="text-sm text-purple-700 ml-5">
                  {new Date(`${form.certificate_end_date}T${form.certificate_end_time}`).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Attendance Strategy Preview */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Attendance Strategy
              </h3>
              <button 
                onClick={() => setCurrentStep(3)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Edit
              </button>
            </div>
            
            {/* Attendance Mandatory Status */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-600">Attendance Tracking:</span>
              <span className={`text-sm px-2 py-1 rounded-full ${
                form.attendance_mandatory 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {form.attendance_mandatory ? 'Mandatory' : 'Not Required'}
              </span>
            </div>

            {form.attendance_mandatory ? (
              customAttendanceStrategy ? (
                <div className="space-y-4">
                  {/* Strategy Overview - Bullet Points Format (matching EventCreatedSuccess.jsx) */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Strategy Type:</span>
                        <span className="text-sm font-semibold text-gray-900 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                          {formatStrategyType(customAttendanceStrategy.detected_strategy?.name || 
                           customAttendanceStrategy.strategy)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Pass Criteria:</span>
                        <span className="text-sm font-semibold text-gray-900 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                          {customAttendanceStrategy.criteria?.minimum_percentage || 
                           customAttendanceStrategy.minimum_percentage || 
                           (customAttendanceStrategy.strategy === 'single_mark' ? '100' : '75')}%
                        </span>
                      </div>
                    </div>
                  </div>                                
                  {/* Strategy Description */}
                  {customAttendanceStrategy.detected_strategy?.description && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <h4 className="text-sm font-medium text-blue-900 mb-1">Strategy Description</h4>
                          <p className="text-sm text-blue-800">
                            {customAttendanceStrategy.detected_strategy.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Session Overview */}
                {customAttendanceStrategy.sessions?.length > 0 && (
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m0 10v-5a2 2 0 012-2h2a2 2 0 012 2v5a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                            </div>
                            <h4 className="text-sm font-medium text-gray-900">Session Overview</h4>
                          </div>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            {customAttendanceStrategy.sessions.length} session{customAttendanceStrategy.sessions.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {customAttendanceStrategy.sessions.slice(0, 4).map((session, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                              <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0">
                                  <span className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center text-sm font-semibold">
                                    {idx + 1}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {session.session_name || `Session ${idx + 1}`}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Session {idx + 1} of {customAttendanceStrategy.sessions.length}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">
                                  {session.duration_minutes ? 
                                    `${Math.floor(session.duration_minutes / 60)}h ${session.duration_minutes % 60}m` : 
                                    'Duration TBD'
                                  }
                                </p>
                                <p className="text-xs text-gray-500">Duration</p>
                              </div>
                            </div>
                          ))}
                          {customAttendanceStrategy.sessions.length > 4 && (
                            <div className="text-center py-2">
                              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                +{customAttendanceStrategy.sessions.length - 4} more sessions
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    {customAttendanceStrategy.recommendations?.length > 0 && (
                      <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                          </div>
                          <h4 className="text-sm font-medium text-gray-900">Strategy Recommendations</h4>
                        </div>
                        <div className="space-y-2">
                          {customAttendanceStrategy.recommendations.slice(0, 3).map((rec, idx) => (
                            <div key={idx} className="flex items-start space-x-3 p-2 bg-blue-50 rounded-md">
                              <div className="flex-shrink-0 mt-0.5">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                              </div>
                              <p className="text-sm text-blue-900">{rec}</p>
                            </div>
                          ))}
                          {customAttendanceStrategy.recommendations.length > 3 && (
                            <div className="text-center pt-2">
                              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                                +{customAttendanceStrategy.recommendations.length - 3} more recommendations
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                  <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-sm text-gray-600">Attendance strategy will be generated automatically</p>
                  <p className="text-xs text-gray-500 mt-1">Based on event type, duration, and audience</p>
                </div>
              )
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                </svg>
                <p className="text-sm text-gray-600">No attendance tracking required</p>
                <p className="text-xs text-gray-500 mt-1">Attendance data will not be collected for this event</p>
              </div>
            )}
          </div>

          {/* Event Creator Information for Executive Admin */}
          {user?.role === 'executive_admin' && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Event Creator
              </h3>
              {eventCreatorSession && getTimeRemaining() > 0 ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{eventCreatorSession.creatorName}</p>
                      <p className="text-xs text-green-600">Active Session</p>
                    </div>
                  </div>
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    Time: {formatTimeRemaining(getTimeRemaining())}
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{user.fullname || user.username || 'Executive Admin'}</p>
                    <p className="text-xs text-amber-600">No Active Session</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Organizer Information */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 text-orange-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Organizer Details
              </h3>
              <button 
                onClick={() => setCurrentStep(2)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Edit
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <span className="text-sm font-medium text-gray-600">Department/Club:</span>
                <p className="text-sm text-gray-900 mt-1">{form.organizing_department}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Organizers:</span>
                <div className="mt-2 space-y-2">
                  {form.organizers.filter(org => org.selected && org.name.trim() !== '').map((org, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{org.name}</p>
                        <p className="text-xs text-gray-600">{org.email}</p>
                        <p className="text-xs text-gray-500">ID: {org.employee_id}</p>
                      </div>
                      {org.isNew && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">New</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Contacts:</span>
                <div className="mt-2 space-y-1">
                  {form.contacts.map((c, idx) => (
                    <div key={idx} className="text-sm text-gray-900 bg-gray-50 rounded px-3 py-2">
                      {c.name} ({c.contact})
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Venue Information */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Venue & Location
              </h3>
              <button 
                onClick={() => setCurrentStep(2)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Edit
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Mode:</span>
                <span className="text-sm text-gray-900 capitalize bg-gray-50 px-2 py-1 rounded">{form.mode}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">
                  {form.mode === 'online' ? 'Platform/Link:' : 'Venue/Location:'}
                </span>
                <p className="text-sm text-gray-900 mt-1 bg-gray-50 rounded px-3 py-2">{form.venue}</p>
                {form.venue_id ? (
                  <div className="flex items-center mt-2">
                    <svg className="w-4 h-4 text-green-600 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs text-green-600 font-medium">Existing venue selected</span>
                  </div>
                ) : (
                  <div className="flex items-center mt-2">
                    <svg className="w-4 h-4 text-amber-600 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs text-amber-600 font-medium">Custom venue will be created</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Registration Details */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 text-indigo-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Registration Settings
              </h3>
              <button 
                onClick={() => setCurrentStep(3)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Edit
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Type:</span>
                <span className="text-sm text-gray-900 capitalize">{form.registration_type}</span>
              </div>
              {showFeeFields && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Fee:</span>
                  <span className="text-sm text-gray-900 font-medium">₹{form.registration_fee}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Mode:</span>
                <span className="text-sm text-gray-900 capitalize">{form.registration_mode}</span>
              </div>
              {showTeamFields && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-blue-800">Team Size:</span>
                    <span className="text-blue-700">{form.team_size_min} - {form.team_size_max} members</span>
                  </div>
                  {form.allow_multiple_team_registrations && (
                    <p className="text-xs text-blue-600 mt-1">Multiple teams allowed (with approval)</p>
                  )}
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Max Participants:</span>
                <span className="text-sm text-gray-900">{form.max_participants || 'Unlimited'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Min Participants:</span>
                <span className="text-sm text-gray-900">{form.min_participants}</span>
              </div>
            </div>
          </div>

          {/* Certificate Configuration */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Certificate Configuration
              </h3>
              <button 
                onClick={() => setCurrentStep(4)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Edit
              </button>
            </div>
            <div className="space-y-4">
              {/* Certificate Based Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Certificate Based Event:</span>
                <span className={`text-sm px-2 py-1 rounded-full ${
                  form.is_certificate_based 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {form.is_certificate_based ? 'Yes' : 'No'}
                </span>
              </div>

              {form.is_certificate_based ? (
                <>
                  {/* Certificate Template Details */}
                  <div>
                    <span className="text-sm font-medium text-gray-600">Certificate Required:</span>
                    <p className="text-sm text-gray-900 mt-1">Yes</p>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-600">Certificate Template:</span>
                    <p className="text-sm text-gray-900 mt-1">
                      {form.event_type && getCertificateTypes(form.event_type, form.mode).length > 0 ? (
                        getCertificateTypes(form.event_type, form.mode).some(type => form.certificate_templates[type]) ? 
                          getCertificateTypes(form.event_type, form.mode).find(type => form.certificate_templates[type])
                          : 'No template selected'
                      ) : 'No template selected'}
                    </p>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-600">Status:</span>
                    <p className="text-sm mt-1">
                      {form.event_type && getCertificateTypes(form.event_type, form.mode).some(type => form.certificate_templates[type]) ? (
                        <span className="text-green-600">✓ Template Uploaded</span>
                      ) : (
                        <span className="text-amber-600">⚠️ Template Required</span>
                      )}
                    </p>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-600">Available Until:</span>
                    <p className="text-sm text-gray-900 mt-1">
                      {new Date(`${form.certificate_end_date}T${form.certificate_end_time}`).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })} at {new Date(`${form.certificate_end_date}T${form.certificate_end_time}`).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                  </div>

                  {/* Certificate Types List */}
                  <div>
                    <span className="text-sm font-medium text-gray-600">Required Templates:</span>
                    <div className="mt-2 space-y-1">
                      {form.event_type && getCertificateTypes(form.event_type, form.mode).map((type, index) => {
                        const hasTemplate = form.certificate_templates[type];
                        return (
                          <div key={index} className="flex items-center space-x-2 text-xs">
                            <svg className={`w-3 h-3 ${hasTemplate ? 'text-green-600' : 'text-red-600'}`} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d={hasTemplate 
                                ? "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                : "M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                } clipRule="evenodd" />
                            </svg>
                            <span className={hasTemplate ? 'text-green-600' : 'text-red-600'}>
                              {type} {hasTemplate ? '(Uploaded)' : '(Missing)'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Event Poster */}
                  {form.event_poster && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Event Poster:</span>
                      <div className="flex items-center space-x-2 mt-1">
                        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-green-600">{form.event_poster.name}</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                  <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm text-gray-600">No certificates will be provided for this event</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-end">

          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-600">Ready to create your event?</p>
              <p className="text-xs text-gray-500">This will submit your event for approval</p>
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`flex items-center px-8 py-3 font-semibold rounded-lg shadow-lg transition-all duration-200 transform ${
                isSubmitting 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:shadow-xl hover:scale-105'
              } text-white`}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {uploadStatus || 'Creating Event...'}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Event
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Form submission (simplified)
  const handleSubmit = async (e) => {
    // If this is a form event, prevent default submission
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    
    // Only submit if we're on the final step (step 5)
    if (currentStep !== totalSteps) {
      return;
    }
    
    // Validate the current step
    if (!validateStep(currentStep)) {
      return;
    }
    
    // Check authentication
    if (!isAuthenticated || userType !== 'admin') {
      alert('Authentication required. Please log in as admin first.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Upload files to Appwrite before submitting the form
      let certificateTemplateUrls = {};
      let eventPosterUrl = null;

      if (form.is_certificate_based && form.certificate_templates) {
        setUploadStatus('Uploading certificate templates...');
        
        try {
          const uploadResults = await unifiedStorage.uploadCertificateTemplates(
            form.certificate_templates, 
            form.event_id
          );
          
          // Process upload results
          for (const [certificateType, result] of Object.entries(uploadResults)) {
            if (result.success) {
              certificateTemplateUrls[certificateType] = result.url;
            } else {
              console.error(`Failed to upload ${certificateType}:`, result.error);
              setErrors(prev => ({
                ...prev,
                certificates: `Failed to upload ${certificateType}: ${result.error}`
              }));
              setIsSubmitting(false);
              setUploadStatus('');
              return;
            }
          }
        } catch (error) {
          console.error('Error uploading certificate templates:', error);
          setErrors(prev => ({
            ...prev,
            certificates: 'Failed to upload certificate templates. Please try again.'
          }));
          setIsSubmitting(false);
          setUploadStatus('');
          return;
        }
      }

      if (form.event_poster) {
        setUploadStatus('Uploading event poster...');
        
        try {
          const posterResult = await unifiedStorage.uploadEventPoster(
            form.event_poster, 
            form.event_id
          );
          
          if (posterResult.success) {
            eventPosterUrl = posterResult.url;
          } else {
            console.error('Failed to upload event poster:', posterResult.error);
            setErrors(prev => ({
              ...prev,
              poster: `Failed to upload event poster: ${posterResult.error}`
            }));
            setIsSubmitting(false);
            setUploadStatus('');
            return;
          }
        } catch (error) {
          console.error('Error uploading event poster:', error);
          setErrors(prev => ({
            ...prev,
            poster: 'Failed to upload event poster. Please try again.'
          }));
          setIsSubmitting(false);
          setUploadStatus('');
          return;
        }
      }

      setUploadStatus('Creating event...');

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
        // Use faculty_organizers instead of organizers for the new system
        faculty_organizers: (() => {
          let facultyIds = form.organizers.filter(org => org.selected && org.employee_id).map(org => org.employee_id);
          
          // For organizer_admin role, ensure current user is included if they're faculty
          if (user?.role === 'organizer_admin' && user?.employee_id) {
            if (!facultyIds.includes(user.employee_id)) {
              facultyIds.push(user.employee_id);
            }
          }
          
          return facultyIds;
        })(),
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
        venue_id: form.venue_id || null, // Include venue_id for existing venues
        venue_type: form.venue_id ? 'existing' : 'custom', // Add venue type for backend
        registration_type: form.registration_type,
        registration_fee: form.registration_fee ? parseFloat(form.registration_fee) : null,
        fee_description: form.fee_description || null,
        registration_mode: form.registration_mode,
        team_size_min: form.team_size_min ? parseInt(form.team_size_min) : null,
        team_size_max: form.team_size_max ? parseInt(form.team_size_max) : null,
        allow_multiple_team_registrations: form.allow_multiple_team_registrations || false,
        max_participants: form.max_participants ? parseInt(form.max_participants) : null,
        min_participants: parseInt(form.min_participants) || 1,
        
        // Certificate configuration
        is_certificate_based: form.is_certificate_based,
        certificate_templates: form.is_certificate_based ? certificateTemplateUrls : {},
        certificate_types: form.is_certificate_based && form.event_type ? getCertificateTypes(form.event_type, form.mode) : [],
        
        // Event poster URL from Appwrite upload
        event_poster_url: eventPosterUrl,
        
        // Attendance configuration - only include if attendance is mandatory
        attendance_mandatory: form.attendance_mandatory,
        ...(form.attendance_mandatory && {
          attendance_strategy: customAttendanceStrategy?.strategy || null,
          attendance_criteria: customAttendanceStrategy?.criteria || null,
          custom_attendance_config: customAttendanceStrategy || null,
        }),
        
        // Set status and approval based on user role
        // Role-based event status and approval logic
        // Super Admin & Organizer Admin: Direct approval - no approval needed
        // Executive Admin: Requires approval
        status: user?.role === 'super_admin' || user?.role === 'organizer_admin' ? 'upcoming' : 'pending_approval',
        approval_required: user?.role !== 'super_admin' && user?.role !== 'organizer_admin'
      };

      // Add event_created_by and event_creator_email for Executive Admin users
      if (user.role === 'executive_admin' && eventCreatorSession) {
        const timeRemaining = getTimeRemaining();
        if (timeRemaining > 0) {
          eventData.event_created_by = eventCreatorSession.creatorName;
          eventData.event_creator_email = eventCreatorSession.creatorEmail;
        } else {
          clearEventCreatorSession();
          eventData.event_created_by = user.fullname || user.username || 'Executive Admin';
          eventData.event_creator_email = ''; // No email if session expired
        }
      } else if (user.role === 'executive_admin') {
        eventData.event_created_by = user.fullname || user.username || 'Executive Admin';
        eventData.event_creator_email = ''; // No email if no session
      }

      const response = await adminAPI.createEvent(eventData);
      
      if (response.data && response.data.success) {
        // Clear the session after successful event creation
        if (user.role === 'executive_admin' && eventCreatorSession) {
          clearEventCreatorSession();
        }
        
        let successMessage;
        let pendingApproval;
        
        // Different messages based on user role - all go to success page
        if (user?.role === 'super_admin') {
          successMessage = 'Event created and activated successfully! Faculty organizers have been assigned.';
          pendingApproval = false;
        } else if (user?.role === 'organizer_admin') {
          successMessage = 'Event created successfully! You have been assigned as the primary organizer.';
          pendingApproval = false;
        } else {
          successMessage = user.role === 'executive_admin' 
            ? 'Event Request Sent Successfully! It is pending Super Admin approval.'
            : 'Event created successfully! It is pending Super Admin approval.';
          pendingApproval = true;
        }
        
        // All users go to the success page with different states
        // Add display data for the success page
        const displayEventData = {
          ...eventData,
          // Add organizer details for display
          organizers: form.organizers.filter(org => org.selected && org.name.trim() !== ''),
          // Add certificate template info for display  
          certificate_template: form.certificate_template,
          certificate_template_name: form.certificate_template?.name,
          // Add other form fields that might be needed for display
          prerequisites: form.prerequisites,
          what_to_bring: form.what_to_bring,
          target_outcomes: form.target_outcomes,
          assets: form.assets,
          // Add attendance strategy data for display
          attendance_strategy: customAttendanceStrategy
        };

        navigate('/admin/events/created-success', {
          state: { 
            eventData: displayEventData,
            pendingApproval: pendingApproval,
            message: successMessage,
            userRole: user?.role
          }
        });
      } else {
        setIsSubmitting(false);
        alert(`Error creating event: ${response.data?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 401) {
          alert('Authentication required. Please log in as admin first.');
        } else if (status === 403) {
          alert('Access denied. You do not have permission to create events.');
        } else if (status === 400 && data.detail && data.detail.includes('Event with this ID already exists')) {
          const suggestedId = generateSuggestedEventId(form.event_id);
          alert(`Event ID "${form.event_id}" already exists! Try: ${suggestedId}`);
          setErrors(prev => ({
            ...prev,
            event_id: `This Event ID already exists. Try: ${suggestedId}`
          }));
          setCurrentStep(1);
        } else {
          alert(`Error: ${data?.message || 'Failed to create event'}`);
        }
      } else if (error.request) {
        alert('Network connection error. Please check if the backend server is running.');
      } else {
        alert(`Unexpected error: ${error.message}`);
      }
    } finally {
      setIsSubmitting(false);
      setUploadStatus('');
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
                  <div className="mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Event ID <span className="text-red-500">*</span>
                    </label>
                  </div>
                  <div className="relative">
                    <div className={`block w-full px-3 py-2 border rounded-md shadow-sm text-sm bg-gray-50 ${
                      form.event_id ? 'border-green-300 text-gray-900' : 'border-gray-200 text-gray-500'
                    }`}>
                      {form.event_id || 'Event ID will be generated automatically'}
                    </div>
                    {form.event_id && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    <span>
                      {form.event_name && form.event_type && form.target_audience 
                        ? `Preview: ${form.is_xenesis_event ? 'XEN' : ''}${form.event_name.slice(0,4).toUpperCase()}${form.event_type.slice(0,2).toUpperCase()}${form.target_audience === 'students' ? 'STU' : form.target_audience === 'faculty' ? 'FAC' : form.target_audience === 'both' ? 'ALL' : 'AUD'}${new Date().getFullYear()}`
                        : 'Fill in Event Title, Type, and Target Audience to auto-generate ID'
                      }
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
                  <Dropdown
                    options={[
                      { value: "technical", label: "Technical Event" },
                      { value: "cultural", label: "Cultural Event" },
                      { value: "sport", label: "Sport Event" },
                      { value: "workshop", label: "Workshop" },
                      { value: "training", label: "Training" },
                      { value: "seminar", label: "Seminar" },
                      { value: "conference", label: "Conference" },
                      { value: "competition", label: "Competition" },
                      { value: "hackathon", label: "Hackathon" },
                      { value: "other", label: "Other" }
                    ]}
                    value={form.event_type}
                    onChange={(value) => handleChange({ target: { name: 'event_type', value } })}
                    placeholder="Select Type"
                    required
                    error={errors.event_type}
                  />
                  {errors.event_type && <p className="text-xs text-red-600 mt-1">{errors.event_type}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Audience <span className="text-red-500">*</span>
                  </label>
                  <Dropdown
                    options={[
                      { value: "student", label: "Students Only" },
                      { value: "faculty", label: "Faculty Only" }
                    ]}
                    value={form.target_audience}
                    onChange={(value) => handleChange({ target: { name: 'target_audience', value } })}
                    placeholder="Select Audience"
                    required
                    error={errors.target_audience}
                  />
                  {errors.target_audience && <p className="text-xs text-red-600 mt-1">{errors.target_audience}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Category
                  </label>
                  <div className="h-10 flex items-center">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_xenesis_event"
                        name="is_xenesis_event"
                        checked={form.is_xenesis_event}
                        onChange={handleChange}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <label 
                        htmlFor="is_xenesis_event" 
                        className="text-sm font-medium text-gray-700 cursor-pointer"
                      >
                        Xenesis Event
                      </label>
                    </div>
                  </div>
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
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Organizer, Contact & Registration Settings</h2>
              <p className="text-sm text-gray-600">Specify who is organizing the event, contact information, and registration settings</p>
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
                    
                    {/* Duplicate Selection Notification */}
                    {organizerNotification && (
                      <div className={`mb-4 p-3 rounded-lg border-l-4 ${
                        organizerNotification.type === 'warning' 
                          ? 'bg-amber-50 border-amber-400 text-amber-800' 
                          : 'bg-red-50 border-red-400 text-red-800'
                      }`}>
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3 flex-1">
                            <p className="text-sm font-medium">Faculty Already Selected</p>
                            <p className="text-sm mt-1">{organizerNotification.message}</p>
                            <p className="text-xs mt-1 opacity-75">Employee ID: {organizerNotification.employeeId}</p>
                          </div>
                          <div className="flex-shrink-0 ml-4">
                            <button
                              type="button"
                              onClick={() => setOrganizerNotification(null)}
                              className="inline-flex text-amber-400 hover:text-amber-600 focus:outline-none focus:text-amber-600"
                            >
                              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    
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
                                <SearchBox
                                  placeholder="Search existing organizers..."
                                  value={organizer.searchQuery || ''}
                                  onChange={(value) => handleOrganizerSearch(idx, value)}
                                  showFilters={false}
                                  size="md"
                                  onFocus={() => setActiveOrganizerDropdown(idx)}
                                />
                                
                                {/* Dropdown Results */}
                                {activeOrganizerDropdown === idx && (
                                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                                    {filteredOrganizers.length > 0 ? (
                                        filteredOrganizers.map((faculty) => {
                                          // Check if this faculty is already selected
                                          const isAlreadySelected = form.organizers.some((organizer, index) => 
                                            index !== idx && organizer.employee_id === faculty.employee_id && organizer.selected
                                          );
                                          
                                          return (
                                            <div
                                              key={faculty.employee_id}
                                              onClick={() => selectExistingOrganizer(idx, faculty)}
                                              className={`px-3 py-2 border-b border-gray-100 last:border-b-0 transition-colors ${
                                                isAlreadySelected 
                                                  ? 'bg-amber-50 cursor-not-allowed' 
                                                  : 'hover:bg-blue-50 cursor-pointer'
                                              }`}
                                            >
                                              <div className="flex justify-between items-center">
                                                <div className="flex-1">
                                                  <div className="flex items-center space-x-2">
                                                    <p className={`text-sm font-medium ${
                                                      isAlreadySelected ? 'text-amber-700' : 'text-gray-900'
                                                    }`}>
                                                      {faculty.full_name}
                                                    </p>
                                                    {isAlreadySelected && (
                                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                                        Already Selected
                                                      </span>
                                                    )}
                                                  </div>
                                                  <p className={`text-xs ${
                                                    isAlreadySelected ? 'text-amber-600' : 'text-gray-500'
                                                  }`}>
                                                    {faculty.email}
                                                  </p>
                                                  <p className={`text-xs ${
                                                    isAlreadySelected ? 'text-amber-500' : 'text-gray-400'
                                                  }`}>
                                                    {faculty.department} • {faculty.designation}
                                                  </p>
                                                </div>
                                                <span className={`text-xs px-2 py-1 rounded ${
                                                  isAlreadySelected 
                                                    ? 'bg-amber-100 text-amber-800' 
                                                    : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                  {faculty.employee_id}
                                                </span>
                                              </div>
                                            </div>
                                          );
                                        })
                                    ) : (
                                      <div className="px-3 py-3 text-gray-500 text-sm text-center">
                                        No faculty found. Try a different search term.
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
                                    {organizer.department && (
                                      <p className="text-xs text-blue-500">{organizer.department} • {organizer.designation}</p>
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
                      Volunteer Contact Information <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      {form.contacts.map((c, idx) => (
                        <div className="grid grid-cols-[0.65fr_1fr] gap-2" key={idx}>
                          <input 
                            type="text" 
                            value={c.name} 
                            onChange={e => handleContactChange(idx, 'name', e.target.value)} 
                            required 
                            placeholder="Contact Name (E.g. Smriti Sharma)"
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                          />
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              value={c.contact} 
                              onChange={e => handleContactChange(idx, 'contact', e.target.value)} 
                              required 
                              placeholder="Email/Phone (E.g. smriti.sharma@college.edu / 9876543210)"
                              className="flex w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
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

              {/* Registration Settings Section */}
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-6 border-b pb-2">Registration Settings</h3>
                <div className="space-y-6">
                  {/* Registration Type and Mode in same row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700">
                        Registration Type<span className="text-red-500">*</span>
                      </label>
                      <Dropdown
                        options={[
                          { value: "free", label: "Free Registration" },
                          { value: "paid", label: "Paid Registration" },
                          { value: "sponsored", label: "Sponsored Event" }
                        ]}
                        value={form.registration_type}
                        onChange={(value) => handleChange({ target: { name: 'registration_type', value } })}
                        placeholder="Select Registration Type"
                        required
                        error={errors.registration_type}
                      />
                      <p className="helper-text text-xs text-gray-500 mt-1">Choose whether the event is free, paid, or sponsored</p>
                      {errors.registration_type && <p className="text-xs text-red-500">{errors.registration_type}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700">Registration Mode<span className="text-red-500">*</span></label>
                      <Dropdown
                        options={[
                          { value: "individual", label: "Individual Registration" },
                          { value: "team", label: "Team Registration" }
                        ]}
                        value={form.registration_mode}
                        onChange={(value) => handleChange({ target: { name: 'registration_mode', value } })}
                        placeholder="Select Registration Mode"
                        required
                        error={errors.registration_mode}
                      />
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
                        <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg">
                          <input
                            id="multiple-team-checkbox"
                            type="checkbox"
                            onChange={(e) => setForm(prev => ({ ...prev, allow_multiple_team_registrations: e.target.checked }))}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                          />
                          <label htmlFor="multiple-team-checkbox" className="cursor-pointer">
                            <span className="text-sm font-semibold text-gray-700">Allow Multiple Team Registrations</span>
                            <p className="text-xs text-gray-500">Allow students to be part of multiple teams for this event (requires approval)</p>
                          </label>
                        </div>
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
                        <p className="font-medium mb-2">Schedule, Event Mode & Location Guidelines:</p>
                        <ul className="space-y-1 text-xs">
                          <li>• <strong>Registration Period:</strong> When participants can register for the event</li>
                          <li>• <strong>Event Schedule:</strong> The actual event start and end times</li>
                          <li>• <strong>Certificate End:</strong> When certificates will no longer be downloadable</li>
                          <li>• <strong>Event Mode:</strong> Online, offline, or hybrid event format</li>
                          <li>• <strong>Venue/Location:</strong> Physical location or online platform details</li>
                          <li>• Registration must end before the event starts</li>
                          <li>• Event end time must be after start time</li>
                          <li>• Certificate distribution should end after the event concludes</li>
                          <li>• All times are in your local timezone</li>
                        </ul>
                      </div>
                    </div>
                    
                    {/* Arrow pointing up */}
                    <div className="absolute -top-2 left-4 w-4 h-4 bg-amber-50 border-l border-t border-amber-200 transform rotate-45"></div>
                  </div>
                </div>
                Schedule, Event Mode & Location
              </h2>
              <p className="text-sm text-gray-600">Set the schedule for your event, event mode, and location details</p>
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
                      constrainToRegistration={true}
                      registrationEndDate={form.registration_end_date}
                      registrationEndTime={form.registration_end_time}
                      minDate={form.registration_end_date || formatDateToLocal(new Date())}
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

              {/* Event Mode & Location Section */}
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-6 border-b pb-2">Event Mode & Location</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Mode<span className="text-red-500">*</span></label>
                    <Dropdown
                      options={[
                        { value: "online", label: "Online" },
                        { value: "offline", label: "Offline" },
                        { value: "hybrid", label: "Hybrid" }
                      ]}
                      value={form.mode}
                      onChange={(value) => handleChange({ target: { name: 'mode', value } })}
                      placeholder="Select Mode"
                      required
                      error={errors.mode}
                    />
                    {errors.mode && <p className="text-xs text-red-500">{errors.mode}</p>}
                  </div>

                  {form.mode === 'offline' || form.mode === 'hybrid' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Venue/Location<span className="text-red-500">*</span>
                      </label>
                      
                      <div className="relative venue-search-container">
                        <input 
                          type="text"
                          name="venue"
                          value={form.venue}
                          onChange={(e) => {
                            const value = e.target.value;
                            setForm(prev => ({ 
                              ...prev, 
                              venue: value,
                              venue_id: '' // Clear venue_id when manually typing
                            }));
                            
                            // Show autocomplete suggestions - all venues if empty, filtered if has text
                            if (value.trim()) {
                              const filtered = venues.filter(v => 
                                v.is_active && 
                                (v.name.toLowerCase().includes(value.toLowerCase()) || 
                                 v.location.toLowerCase().includes(value.toLowerCase()) ||
                                 `${v.name} - ${v.location}`.toLowerCase().includes(value.toLowerCase()))
                              );
                              setFilteredVenues(filtered);
                              setShowVenueDropdown(true);
                            } else {
                              // Show all active venues when field is empty
                              const allActiveVenues = venues.filter(v => v.is_active);
                              setFilteredVenues(allActiveVenues);
                              setShowVenueDropdown(allActiveVenues.length > 0);
                            }
                          }}
                          onFocus={() => {
                            // Show dropdown on focus - all venues if empty, filtered if has text
                            if (form.venue.trim()) {
                              const filtered = venues.filter(v => 
                                v.is_active && 
                                (v.name.toLowerCase().includes(form.venue.toLowerCase()) || 
                                 v.location.toLowerCase().includes(form.venue.toLowerCase()) ||
                                 `${v.name} - ${v.location}`.toLowerCase().includes(form.venue.toLowerCase()))
                              );
                              setFilteredVenues(filtered);
                              setShowVenueDropdown(true);
                            } else {
                              // Show all active venues when focused with empty field
                              const allActiveVenues = venues.filter(v => v.is_active);
                              setFilteredVenues(allActiveVenues);
                              setShowVenueDropdown(allActiveVenues.length > 0);
                            }
                          }}
                          placeholder="Click to view all venues or type to search (e.g., Main Auditorium, Room 101)"
                          className={`w-full rounded-md border ${errors.venue ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 pr-10`}
                          required
                        />
                        
                        {/* Search Icon */}
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        
                        {/* Autocomplete Dropdown */}
                        {showVenueDropdown && filteredVenues.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {filteredVenues.map((venue) => (
                              <div
                                key={venue.venue_id}
                                onClick={() => {
                                  setForm(prev => ({
                                    ...prev,
                                    venue_id: venue.venue_id,
                                    venue: `${venue.name} - ${venue.location}`
                                  }));
                                  setShowVenueDropdown(false);
                                }}
                                className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                              >
                                <div className="flex justify-between items-center">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{venue.name}</p>
                                    <p className="text-xs text-gray-500">{venue.location}</p>
                                    {venue.venue_type && (
                                      <p className="text-xs text-blue-600 capitalize">{venue.venue_type.replace('_', ' ')}</p>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                      Capacity: {venue.capacity || 'N/A'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {errors.venue && <p className="text-xs text-red-500 mt-1">{errors.venue}</p>}
                      
                      <p className="text-xs text-gray-500 mt-1">
                        Start typing to see suggestions from existing venues, or enter a custom venue name.
                      </p>
                      
                      {/* Display selected venue confirmation */}
                      {form.venue_id && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm text-green-800 font-medium">Existing venue selected</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Display custom venue confirmation */}
                      {form.venue && !form.venue_id && (
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm text-amber-800 font-medium">Custom venue will be created</span>
                          </div>
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

              {/* Attendance Strategy Preview */}
              <div>
                {/* Attendance Mandatory Checkbox */}
                <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        id="attendance_mandatory"
                        name="attendance_mandatory"
                        checked={form.attendance_mandatory}
                        onChange={(e) => handleCheckboxChange('attendance_mandatory', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="flex-1">
                      <label htmlFor="attendance_mandatory" className="text-sm font-medium text-gray-900 cursor-pointer">
                        Is Event Attendance Mandatory?
                      </label>
                      <p className="text-xs text-gray-600 mt-1">
                        Enable this if you want to track attendance for this event. When disabled, no attendance data will be collected.
                      </p>
                    </div>
                  </div>
                </div>

                {form.attendance_mandatory && (
                  <>
                    <h3 className="text-md font-medium text-gray-900 mb-6 border-b pb-2 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Attendance Strategy Preview
                    </h3>
                    
                    <AttendancePreview
                      eventData={form}
                      onStrategyChange={setCustomAttendanceStrategy}
                      showCustomization={showAttendanceCustomization}
                      onToggleCustomization={() => setShowAttendanceCustomization(!showAttendanceCustomization)}
                    />
                  </>
                )}

                {!form.attendance_mandatory && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Attendance Tracking</h3>
                    <p className="text-sm text-gray-600">
                      Attendance tracking is disabled for this event. No attendance data will be collected.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div>
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                <div className="relative group">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2 text-amber-600 cursor-help">
                    <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5zM16.5 15a.75.75 0 01.712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 010 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 01-1.422 0l-.395-1.183a1.5 1.5 0 00-.948-.948l-1.183-.395a.75.75 0 010-1.422l1.183-.395c.447-.15.799-.5.948-.948l.394-1.183A.75.75 0 0116.5 15z" clipRule="evenodd" />
                  </svg>
                  
                  {/* Tooltip */}
                  <div className="absolute left-0 top-8 w-80 bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-lg z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="flex items-start space-x-2">
                      <div className="w-5 h-5 text-amber-600 mt-0.5">🏆</div>
                      <div className="text-sm text-amber-800">
                        <p className="font-medium mb-2">Certificate Configuration:</p>
                        <ul className="space-y-1 text-xs">
                          <li>• Choose if your event provides certificates to participants</li>
                          <li>• Different event types have different certificate templates</li>
                          <li>• Upload HTML templates for each certificate type</li>
                          <li>• Templates should include placeholders like [Event Name], [Participant Name]</li>
                          <li>• Asset files (images, fonts, CSS) can be uploaded separately</li>
                        </ul>
                      </div>
                    </div>
                    
                    {/* Arrow pointing up */}
                    <div className="absolute -top-2 left-4 w-4 h-4 bg-amber-50 border-l border-t border-amber-200 transform rotate-45"></div>
                  </div>
                </div>
                Certificate Configuration
              </h2>
              <p className="text-sm text-gray-600">Configure certificate templates and settings for your event participants</p>
            </div>

            <div className="space-y-8">
              {/* Certificate Based Event Toggle */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex items-center h-5">
                    <input
                      id="is_certificate_based"
                      name="is_certificate_based"
                      type="checkbox"
                      checked={form.is_certificate_based}
                      onChange={(e) => handleCheckboxChange('is_certificate_based', e.target.checked)}
                      className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                  </div>
                  <div className="flex-1">
                    <label htmlFor="is_certificate_based" className="text-base font-semibold text-gray-900 cursor-pointer">
                      This event provides certificates to participants
                    </label>
                    <p className="text-sm text-gray-600 mt-1">
                      Enable this if participants will receive digital certificates upon event completion.
                      Different certificate types will be available based on your event type.
                    </p>
                  </div>
                </div>
              </div>

              {/* Certificate Templates Section - Only show if certificate-based */}
              {form.is_certificate_based && (
                <div className="space-y-6">
                  {/* Event Type Information */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="text-md font-medium text-gray-900">
                        Certificate Types for {form.event_type ? form.event_type.charAt(0).toUpperCase() + form.event_type.slice(1) : 'Selected'} Event
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      Based on your event type and mode, the following certificate templates are required:
                    </p>
                    {form.event_type && (
                      <div className="mt-3">
                        <div className="flex flex-wrap gap-2">
                          {getCertificateTypes(form.event_type, form.mode).map((type, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {type} – [Event Name]
                            </span>
                          ))}
                        </div>
                        {form.mode === 'offline' && (form.event_type === 'cultural' || form.event_type === 'competition' || form.event_type === 'hackathon') && (
                          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-start space-x-2">
                              <svg className="w-4 h-4 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <p className="text-xs text-amber-800">
                                <strong>Note:</strong> Winner certificates are only available for hybrid or online events. 
                                Change the event mode in Step 2 to include winner certificates.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Certificate Template Uploads */}
                  {form.event_type && (
                    <div className="space-y-4">
                      <h3 className="text-md font-medium text-gray-900 border-b pb-2">Upload Certificate Templates</h3>
                      
                      <div className="grid grid-cols-1 gap-6">
                        {getCertificateTypes(form.event_type, form.mode).map((certificateType, index) => (
                          <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900">{certificateType} – [Event Name]</h4>
                                <p className="text-xs text-gray-500 mt-1">Upload the HTML template for this certificate type</p>
                              </div>
                              {form.certificate_templates[certificateType] && (
                                <div className="flex items-center space-x-2">
                                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                  <span className="text-xs text-green-600 font-medium">Uploaded</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="space-y-3">
                              <input
                                type="file"
                                accept=".html"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    setForm(prev => ({
                                      ...prev,
                                      certificate_templates: {
                                        ...prev.certificate_templates,
                                        [certificateType]: file
                                      }
                                    }));
                                  }
                                }}
                                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                              />
                              
                              {form.certificate_templates[certificateType] && (
                                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                      <span className="text-sm text-green-800 font-medium">
                                        {form.certificate_templates[certificateType].name}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setForm(prev => {
                                          const updated = { ...prev.certificate_templates };
                                          delete updated[certificateType];
                                          return {
                                            ...prev,
                                            certificate_templates: updated
                                          };
                                        });
                                      }}
                                      className="text-red-600 hover:text-red-800 text-xs underline"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {errors.certificate_templates && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                          {errors.certificate_templates}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Event Poster Section */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Event Poster (Optional)
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Upload an event poster image (PNG preferred, but any image format works).
                    </p>
                    
                    <input
                      type="file"
                      name="event_poster"
                      accept="image/*"
                      onChange={handleChange}
                      className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
                    />
                    
                    {form.event_poster && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Selected Poster:</h4>
                        <div className="flex items-center justify-between bg-gray-50 rounded-md p-2">
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm text-gray-700">{form.event_poster.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">{Math.round(form.event_poster.size / 1024)} KB</span>
                            <button
                              type="button"
                              onClick={() => {
                                setForm(prev => ({
                                  ...prev,
                                  event_poster: null
                                }));
                              }}
                              className="text-red-600 hover:text-red-800 text-xs underline"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Certificate Template Guidelines */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                    <h3 className="text-md font-medium text-amber-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 text-amber-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Template Guidelines
                    </h3>
                    <div className="text-sm text-amber-800 space-y-2">
                      <p><strong>Required Placeholders:</strong></p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li><code>[Event Name]</code> - Will be replaced with the actual event name</li>
                        <li><code>[Participant Name]</code> - Will be replaced with participant's name</li>
                        <li><code>[Event Date]</code> - Will be replaced with event date</li>
                        <li><code>[Organization]</code> - Will be replaced with organizing department</li>
                      </ul>
                      <p className="mt-3"><strong>Optional Placeholders:</strong></p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li><code>[Certificate ID]</code> - Unique certificate identifier</li>
                        <li><code>[Issue Date]</code> - Certificate generation date</li>
                        <li><code>[Event Duration]</code> - Event duration or hours</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* No Certificate Section */}
              {!form.is_certificate_based && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Certificates Required</h3>
                  <p className="text-sm text-gray-600 max-w-md mx-auto">
                    This event will not provide certificates to participants. Participants will be able to register and attend, but no certificates will be generated.
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      case 5:
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Review</h2>
              <p className="text-sm text-gray-600">Review all event details before submission</p>
            </div>
            {renderReview()}
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
                    <div className="text-sm text-gray-600">
                      Use the "Create Event" button in the review section below
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Creator Modal */}
      {showCreatorModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Who is creating this event?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Since this is a universal Executive Admin account, please enter your actual name and email to track who is creating events and for approval notifications.
            </p>
            <div className="space-y-4">
              <input
                type="text"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
              <input
                type="email"
                value={creatorEmail}
                onChange={(e) => setCreatorEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleCreatorSubmit();
                  }
                }}
              />
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreatorModal(false);
                  setCreatorName('');
                  setCreatorEmail('');
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
                disabled={!creatorName.trim() || !creatorEmail.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Start Session
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default CreateEvent;
