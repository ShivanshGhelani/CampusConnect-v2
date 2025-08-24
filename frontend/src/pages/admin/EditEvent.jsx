import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../api/admin';
import AdminLayout from '../../components/admin/AdminLayout';
import DateRangePicker from '../../components/common/DateRangePicker';
import LoadingSpinner from '../../components/LoadingSpinner';
import Dropdown from '../../components/ui/Dropdown';
import MultiSelect from '../../components/ui/MultiSelect';
import dropdownOptionsService from '../../services/dropdownOptionsService';

// Helper function to convert backend strategy types to user-friendly labels
const getStrategyDisplayName = (strategyType) => {
  const strategyMap = {
    'day_based': 'Day Based',
    'session_based': 'Session Based',
    'milestone_based': 'Milestone Based',
    'time_based': 'Time Based',
    'percentage_based': 'Percentage Based',
    'single_mark': 'Single Check-in',
    'multi_session': 'Multi-Session',
    'custom': 'Custom',
    'hybrid': 'Hybrid'
  };

  if (!strategyType) return 'Standard';

  // Handle string format (direct strategy type)
  if (typeof strategyType === 'string') {
    return strategyMap[strategyType] || strategyType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  // Handle object format with strategy property
  if (typeof strategyType === 'object' && strategyType.strategy) {
    return strategyMap[strategyType.strategy] || strategyType.strategy.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  return 'Standard';
};

// Certificate template types based on event type
const getCertificateTypes = (eventType, eventMode = null) => {
  const certificateMapping = {
    technical: [
      'Certificate of Participation',
      'Certificate of Achievement'
    ],
    cultural: [
      'Certificate of Participation',
      ...(eventMode === 'hybrid' || eventMode === 'online' ? ['Winner Certificate'] : [])
    ],
    sports: [
      'Certificate of Participation'
    ],
    academic: [
      'Certificate of Completion',
      'Certificate of Excellence'
    ],
    workshop: [
      'Certificate of Completion',
      'Certificate of Excellence'
    ],
    seminar: [
      'Certificate of Attendance'
    ],
    conference: [
      'Certificate of Attendance'
    ],
    competition: [
      'Certificate of Participation',
      ...(eventMode === 'hybrid' || eventMode === 'online' ? ['Winner Certificate'] : [])
    ]
  };

  return certificateMapping[eventType] || ['Certificate of Participation'];
};

// Dropdown options
const eventTypeOptions = [
  { value: 'technical', label: 'Technical' },
  { value: 'cultural', label: 'Cultural' },
  { value: 'sports', label: 'Sports' },
  { value: 'academic', label: 'Academic' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'seminar', label: 'Seminar' },
  { value: 'conference', label: 'Conference' },
  { value: 'competition', label: 'Competition' }
];

const targetAudienceOptions = [
  { value: 'students', label: 'Students' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'both', label: 'Both Students & Faculty' },
  { value: 'external', label: 'External Participants' }
];

const modeOptions = [
  { value: 'offline', label: 'Offline' },
  { value: 'online', label: 'Online' },
  { value: 'hybrid', label: 'Hybrid' }
];

const registrationTypeOptions = [
  { value: 'free', label: 'Free' },
  { value: 'paid', label: 'Paid' }
];

const registrationModeOptions = [
  { value: 'individual', label: 'Individual' },
  { value: 'team', label: 'Team' }
];

function EditEvent() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userType } = useAuth();
  const [event, setEvent] = useState(location.state?.eventData || null);
  const [isLoading, setIsLoading] = useState(!location.state?.eventData);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Venue management states
  const [venues, setVenues] = useState([]);
  const [filteredVenues, setFilteredVenues] = useState([]);
  const [showVenueDropdown, setShowVenueDropdown] = useState(false);
  const venueDropdownRef = useRef(null);

  // Organizer management states
  const [activeOrganizerDropdown, setActiveOrganizerDropdown] = useState(null);
  const [existingOrganizers, setExistingOrganizers] = useState([]);
  const [filteredOrganizers, setFilteredOrganizers] = useState([]);
  const [organizerNotification, setOrganizerNotification] = useState(null);

  // Tab management
  const [activeTab, setActiveTab] = useState(1);

  // Form data state
  const [formData, setFormData] = useState({
    event_name: '',
    event_type: '',
    target_audience: '',
    is_xenesis_event: false,
    organizing_department: '',
    short_description: '',
    detailed_description: '',
    // Student target fields
    student_department: [],
    student_semester: [],
    custom_text: '',
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
    venue: '',
    venue_id: '',
    mode: 'offline',
    registration_type: 'free',
    registration_mode: 'individual',
    registration_fee: '',
    fee_description: '',
    team_size_min: '',
    team_size_max: '',
    allow_multiple_team_registrations: false,
    min_participants: 1,
    max_participants: '',
    attendance_mandatory: true,
    attendance_strategy: null,
    is_certificate_based: false,
    certificate_templates: {},
    event_poster: null,
    assets: []
  });

  // Load venues and organizers on component mount
  useEffect(() => {
    loadVenues();
    loadExistingOrganizers();

    // If we have event data from navigation state, use it
    if (location.state?.eventData && !event) {
      setEvent(location.state.eventData);
      populateFormData(location.state.eventData);
      setIsLoading(false);
    } else if (eventId && !event) {
      // Fallback: fetch event data if not passed
      fetchEvent();
    } else if (event) {
      // Event data already available, populate form
      populateFormData(event);
      setIsLoading(false);
    }
  }, [eventId, location.state?.eventData]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (venueDropdownRef.current && !venueDropdownRef.current.contains(event.target)) {
        setShowVenueDropdown(false);
      }
      if (activeOrganizerDropdown !== null) {
        setActiveOrganizerDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeOrganizerDropdown, showVenueDropdown]);

  // Load venues
  const loadVenues = async () => {
    try {
      const response = await adminAPI.getVenues();
      if (response.success) {
        setVenues(response.venues || []);
        setFilteredVenues(response.venues || []);
      }
    } catch (error) {
      console.error('Error loading venues:', error);
    }
  };

  // Load existing organizers (faculty)
  const loadExistingOrganizers = async () => {
    try {
      const response = await adminAPI.getFaculty();
      if (response.success) {
        setExistingOrganizers(response.faculty || []);
      }
    } catch (error) {
      console.error('Error loading faculty:', error);
    }
  };

  // Venue search and selection
  const handleVenueSearch = (searchTerm) => {
    const filtered = venues.filter(venue =>
      venue.venue_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      venue.building.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredVenues(filtered);
  };

  const selectVenue = (venue) => {
    setFormData(prev => ({
      ...prev,
      venue: venue.venue_name,
      venue_id: venue.venue_id
    }));
    setShowVenueDropdown(false);
  };

  // Organizer management functions
  const addOrganizer = () => {
    setFormData(prev => ({
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
    setFormData(prev => ({
      ...prev,
      organizers: prev.organizers.filter((_, i) => i !== idx)
    }));
    setActiveOrganizerDropdown(null);
  };

  const handleOrganizerSearch = (idx, searchQuery) => {
    setFormData(prev => {
      const updated = [...prev.organizers];
      updated[idx] = { ...updated[idx], searchQuery, selected: false };
      return { ...prev, organizers: updated };
    });

    if (searchQuery.length > 0) {
      const filtered = existingOrganizers.filter(faculty =>
        faculty.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faculty.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faculty.employee_id.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredOrganizers(filtered);
      setActiveOrganizerDropdown(idx);
    } else {
      setFilteredOrganizers([]);
      setActiveOrganizerDropdown(null);
    }
  };

  const selectExistingOrganizer = (idx, faculty) => {
    // Check if this organizer is already selected
    const isAlreadySelected = formData.organizers.some((org, i) =>
      i !== idx && org.selected && org.id === faculty.faculty_id
    );

    if (isAlreadySelected) {
      setOrganizerNotification({
        message: `${faculty.name} is already selected as an organizer.`,
        type: 'warning'
      });
      setTimeout(() => setOrganizerNotification(null), 3000);
      return;
    }

    setFormData(prev => {
      const updated = [...prev.organizers];
      updated[idx] = {
        ...updated[idx],
        id: faculty.faculty_id,
        name: faculty.name,
        email: faculty.email,
        employee_id: faculty.employee_id,
        searchQuery: faculty.name,
        selected: true,
        isNew: false
      };
      return { ...prev, organizers: updated };
    });

    setActiveOrganizerDropdown(null);
    setFilteredOrganizers([]);
  };

  const clearOrganizerSelection = (idx) => {
    setFormData(prev => {
      const updated = [...prev.organizers];
      updated[idx] = {
        ...updated[idx],
        id: null,
        name: '',
        email: '',
        employee_id: '',
        searchQuery: '',
        selected: false,
        isNew: false
      };
      return { ...prev, organizers: updated };
    });
  };

  // Contact management
  const handleContactChange = (idx, field, value) => {
    setFormData(prev => {
      const updated = [...prev.contacts];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, contacts: updated };
    });
  };

  const addContact = () => {
    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, { name: '', contact: '' }]
    }));
  };

  const removeContact = (idx) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== idx)
    }));
  };

  // Date and time handlers
  const handleEventDateChange = (startDate, endDate) => {
    setFormData(prev => ({
      ...prev,
      start_date: startDate ? startDate.toISOString().split('T')[0] : '',
      end_date: endDate ? endDate.toISOString().split('T')[0] : ''
    }));
  };

  const handleEventTimeChange = (startTime, endTime) => {
    setFormData(prev => ({
      ...prev,
      start_time: startTime || '',
      end_time: endTime || ''
    }));
  };

  const handleRegistrationDateChange = (startDate, endDate) => {
    setFormData(prev => ({
      ...prev,
      registration_start_date: startDate ? startDate.toISOString().split('T')[0] : '',
      registration_end_date: endDate ? endDate.toISOString().split('T')[0] : ''
    }));
  };

  const handleRegistrationTimeChange = (startTime, endTime) => {
    setFormData(prev => ({
      ...prev,
      registration_start_time: startTime || '',
      registration_end_time: endTime || ''
    }));
  };

  const handleCertificateDateChange = (endDate) => {
    setFormData(prev => ({
      ...prev,
      certificate_end_date: endDate ? endDate.toISOString().split('T')[0] : ''
    }));
  };

  const handleCertificateTimeChange = (endTime) => {
    setFormData(prev => ({
      ...prev,
      certificate_end_time: endTime || ''
    }));
  };

  // Extract form data population into a separate function
  const populateFormData = (eventData) => {

    // Parse datetime strings to separate date and time
    const parseDateTimeToComponents = (dateTimeString) => {
      if (!dateTimeString) return { date: '', time: '' };
      const date = new Date(dateTimeString);
      const dateStr = date.toISOString().split('T')[0];
      const timeStr = date.toTimeString().split(' ')[0].substring(0, 5); // Hours and minutes format
      return { date: dateStr, time: timeStr };
    };

    // Enhanced organizer parsing - handle both array and string formats
    const parseOrganizers = (organizersData) => {
      if (!organizersData) {
        return [{
          id: null, name: '', email: '', employee_id: '',
          searchQuery: '', selected: false, isNew: false
        }];
      }

      // Handle array format (from EventDetail.jsx - this is the main case)
      if (Array.isArray(organizersData)) {
        const parsedOrganizers = organizersData.map((org, index) => {
          // Handle nested organizer object structure OR direct organizer data
          const organizerData = org.organizer || org;

          const parsedOrg = {
            id: organizerData.faculty_id || organizerData.id || null,
            name: organizerData.full_name || organizerData.name || '',
            email: organizerData.email || '',
            employee_id: organizerData.employee_id || '',
            department: organizerData.department || '',
            designation: organizerData.designation || '',
            phone: organizerData.phone || '',
            searchQuery: organizerData.full_name || organizerData.name || '',
            selected: !!(organizerData.full_name || organizerData.name),
            isNew: false
          };

          return parsedOrg;
        });

        return parsedOrganizers.length > 0 ? parsedOrganizers : [{
          id: null, name: '', email: '', employee_id: '',
          searchQuery: '', selected: false, isNew: false
        }];
      }

      // Handle string format (legacy support)
      if (typeof organizersData === 'string' && organizersData.trim()) {
        return organizersData.split('\n').filter(org => org.trim()).map(org => ({
          id: null,
          name: org.trim(),
          email: '',
          employee_id: '',
          department: '',
          designation: '',
          searchQuery: org.trim(),
          selected: true,
          isNew: true
        }));
      }

      return [{
        id: null, name: '', email: '', employee_id: '',
        searchQuery: '', selected: false, isNew: false
      }];
    };

    // Parse contacts - enhanced to handle different formats
    const parseContacts = (contactsData) => {
      if (!contactsData) return [{ name: '', contact: '' }];

      if (Array.isArray(contactsData)) {
        const parsed = contactsData.filter(c => c && (c.name || c.contact)).map(contact => ({
          name: contact.name || '',
          contact: contact.contact || contact.phone || contact.email || ''
        }));

        return parsed.length > 0 ? parsed : [{ name: '', contact: '' }];
      }

      if (typeof contactsData === 'string' && contactsData.trim()) {
        const contacts = [];
        const lines = contactsData.split('\n').filter(line => line.trim());

        for (const line of lines) {
          const colonIndex = line.indexOf(':');
          if (colonIndex > 0) {
            contacts.push({
              name: line.substring(0, colonIndex).trim(),
              contact: line.substring(colonIndex + 1).trim()
            });
          }
        }

        return contacts.length > 0 ? contacts : [{ name: '', contact: '' }];
      }

      return [{ name: '', contact: '' }];
    };

    // Parse date/time components
    const startDateTime = parseDateTimeToComponents(eventData.start_datetime);
    const endDateTime = parseDateTimeToComponents(eventData.end_datetime);
    const regStartDateTime = parseDateTimeToComponents(eventData.registration_start_date);
    const regEndDateTime = parseDateTimeToComponents(eventData.registration_end_date);
    const certEndDateTime = parseDateTimeToComponents(eventData.certificate_end_date);

    const newFormData = {
      event_name: eventData.event_name || '',
      event_type: eventData.event_type || '',
      target_audience: eventData.target_audience || '',
      is_xenesis_event: eventData.is_xenesis_event || false,
      organizing_department: eventData.organizing_department || '',
      short_description: eventData.short_description || '',
      detailed_description: eventData.detailed_description || '',
      student_department: eventData.student_department || [],
      student_semester: eventData.student_semester || [],
      custom_text: eventData.custom_text || '',
      organizers: parseOrganizers(eventData.organizer_details || eventData.faculty_organizers || eventData.organizers),
      contacts: parseContacts(eventData.contacts),
      start_date: startDateTime.date,
      start_time: startDateTime.time,
      end_date: endDateTime.date,
      end_time: endDateTime.time,
      registration_start_date: regStartDateTime.date,
      registration_start_time: regStartDateTime.time,
      registration_end_date: regEndDateTime.date,
      registration_end_time: regEndDateTime.time,
      certificate_end_date: certEndDateTime.date,
      certificate_end_time: certEndDateTime.time,
      venue: eventData.venue || '',
      venue_id: eventData.venue_id || '',
      mode: eventData.mode || 'offline',
      registration_type: eventData.registration_type || 'free',
      registration_mode: eventData.registration_mode || 'individual',
      registration_fee: eventData.registration_fee || '',
      fee_description: eventData.fee_description || '',
      team_size_min: eventData.team_size_min || '',
      team_size_max: eventData.team_size_max || '',
      allow_multiple_team_registrations: eventData.allow_multiple_team_registrations || false,
      min_participants: eventData.min_participants || 1,
      max_participants: eventData.max_participants || '',
      attendance_mandatory: eventData.attendance_mandatory !== false,
      attendance_strategy: eventData.attendance_strategy || null,
      is_certificate_based: eventData.is_certificate_based || false,
      certificate_templates: eventData.certificate_templates || {},
      event_poster: null,
      assets: eventData.assets || []
    };

    setFormData(newFormData);
    setError('');
  };

  const fetchEvent = async () => {
    try {
      setIsLoading(true);
      const response = await adminAPI.getEvent(eventId);

      if (response.data.success) {
        const eventData = response.data.event;
        setEvent(eventData);
        populateFormData(eventData);
      } else {
        throw new Error(response.data.message || 'Failed to fetch event');
      }
    } catch (error) {
      console.error('Error fetching event:', error);
      setError('Failed to load event details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle dropdown changes
  const handleDropdownChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle checkbox changes with explicit state updates
  const handleCheckboxChange = (name, checked) => {
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  // Special handler for multi-select student fields
  const handleStudentFieldChange = (fieldName, selectedValues) => {
    // Handle "All" selection logic
    if (fieldName === 'student_department') {
      const allDepartments = dropdownOptionsService.getOptions('student', 'departments').map(opt => opt.value);

      if (selectedValues.includes('all')) {
        // If "All" is selected, select all departments except "all"
        const newValues = selectedValues.includes('all') && selectedValues.length === 1
          ? allDepartments
          : selectedValues.filter(val => val !== 'all');
        setFormData(prev => ({ ...prev, [fieldName]: newValues }));
      } else {
        setFormData(prev => ({ ...prev, [fieldName]: selectedValues }));
      }
    } else if (fieldName === 'student_semester') {
      const allSemesters = ['1', '2', '3', '4', '5', '6', '7', '8'];

      if (selectedValues.includes('all')) {
        // If "All" is selected, select all semesters except "all"
        const newValues = selectedValues.includes('all') && selectedValues.length === 1
          ? allSemesters
          : selectedValues.filter(val => val !== 'all');
        setFormData(prev => ({ ...prev, [fieldName]: newValues }));
      } else {
        setFormData(prev => ({ ...prev, [fieldName]: selectedValues }));
      }
    } else {
      setFormData(prev => ({ ...prev, [fieldName]: selectedValues }));
    }
  };

  // Process organizers list from textarea
  const processOrganizers = (organizersText) => {
    if (!organizersText || organizersText.trim() === '') return [];
    return organizersText.split('\n').map(name => name.trim()).filter(name => name.length > 0);
  };

  // Process contacts list from textarea
  const processContacts = (contactsText) => {
    if (!contactsText || contactsText.trim() === '') return [];
    const contacts = [];
    const lines = contactsText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const name = line.substring(0, colonIndex).trim();
        const contact = line.substring(colonIndex + 1).trim();
        if (name && contact) {
          contacts.push({ name, contact });
        }
      }
    }
    return contacts;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setIsSaving(true);

      // Combine date and time for datetime fields
      const combineDateAndTime = (date, time) => {
        if (!date) return null;
        if (!time) return `${date}T00:00:00Z`;
        return `${date}T${time}:00Z`;
      };

      // Process organizers - extract selected ones
      const processOrganizers = (organizers) => {
        return organizers
          .filter(org => org.selected && org.name)
          .map(org => ({
            faculty_id: org.id,
            name: org.name,
            email: org.email,
            employee_id: org.employee_id
          }));
      };

      // Process contacts - filter out empty ones
      const processContacts = (contacts) => {
        return contacts.filter(contact => contact.name && contact.contact);
      };

      // Prepare the data for submission
      const submitData = {
        event_name: formData.event_name,
        event_type: formData.event_type,
        target_audience: formData.target_audience,
        is_xenesis_event: formData.is_xenesis_event,
        organizing_department: formData.organizing_department,
        short_description: formData.short_description,
        detailed_description: formData.detailed_description || null,
        // Student target fields
        student_department: formData.student_department,
        student_semester: formData.student_semester,
        custom_text: formData.custom_text || null,
        start_datetime: combineDateAndTime(formData.start_date, formData.start_time),
        end_datetime: combineDateAndTime(formData.end_date, formData.end_time),
        registration_start_date: combineDateAndTime(formData.registration_start_date, formData.registration_start_time),
        registration_end_date: combineDateAndTime(formData.registration_end_date, formData.registration_end_time),
        certificate_end_date: combineDateAndTime(formData.certificate_end_date, formData.certificate_end_time),
        venue: formData.venue,
        venue_id: formData.venue_id,
        mode: formData.mode,
        registration_type: formData.registration_type,
        registration_mode: formData.registration_mode,
        registration_fee: formData.registration_fee ? parseFloat(formData.registration_fee) : null,
        fee_description: formData.fee_description || null,
        team_size_min: formData.team_size_min ? parseInt(formData.team_size_min) : null,
        team_size_max: formData.team_size_max ? parseInt(formData.team_size_max) : null,
        allow_multiple_team_registrations: formData.allow_multiple_team_registrations,
        min_participants: formData.min_participants ? parseInt(formData.min_participants) : 1,
        max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
        attendance_mandatory: formData.attendance_mandatory,
        is_certificate_based: formData.is_certificate_based,
        certificate_templates: formData.certificate_templates,
        organizers: processOrganizers(formData.organizers),
        event_contacts: processContacts(formData.contacts)
      };

      const response = await adminAPI.updateEvent(eventId, submitData);

      if (response.data.success) {
        // Redirect to event details or events list
        navigate(`/admin/events`);
      } else {
        throw new Error(response.data.message || 'Failed to update event');
      }
    } catch (error) {
      console.error('Error updating event:', error);
      setError('Failed to update event: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout pageTitle="Edit Event">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </AdminLayout>
    );
  }

  if (error && !event) {
    return (
      <AdminLayout pageTitle="Edit Event">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      </AdminLayout>
    );
  }

  const tabs = [
    { id: 1, name: 'Basic Info', icon: 'fas fa-info-circle' },
    { id: 2, name: 'Organizer & Schedule', icon: 'fas fa-users-cog' },
    { id: 3, name: 'Certificates & Poster', icon: 'fas fa-certificate' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 1:
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Basic Event Information</h2>
              <p className="text-sm text-gray-600">View and edit essential event details</p>
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
                    <div className="block w-full px-3 py-2 border rounded-md shadow-sm text-sm bg-gray-50 border-gray-200 text-gray-700">
                      {event?.event_id || formData.event_id || 'Not Available'}
                    </div>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    <span>Event ID is automatically generated and cannot be modified</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Title <span className="text-red-500">*</span>
                  </label>
                  <div className="block w-full px-3 py-2 border rounded-md shadow-sm text-sm bg-gray-50 border-gray-200 text-gray-700">
                    {formData.event_name || 'No title available'}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Event title cannot be modified after creation</p>
                </div>
              </div>

              {/* Event Type and Target Audience in same row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Type <span className="text-red-500">*</span>
                  </label>
                  <div className="block w-full px-3 py-2 border rounded-md shadow-sm text-sm bg-gray-50 border-gray-200 text-gray-700 capitalize">
                    {formData.event_type ?
                      eventTypeOptions.find(opt => opt.value === formData.event_type)?.label || formData.event_type
                      : 'Not specified'
                    }
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Event type is locked after creation</p>
                </div>
                {/* Organizing Department */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organizing Department/Club <span className="text-red-500">*</span>
                  </label>
                  <div className="block w-full px-3 py-2 border rounded-md shadow-sm text-sm bg-gray-50 border-gray-200 text-gray-700">
                    {formData.organizing_department || 'Not specified'}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Department information is read-only</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Audience <span className="text-red-500">*</span>
                  </label>
                  <div className="block w-full px-3 py-2 border rounded-md shadow-sm text-sm bg-gray-50 border-gray-200 text-gray-700 capitalize">
                    {formData.target_audience ?
                      targetAudienceOptions.find(opt => opt.value === formData.target_audience)?.label || formData.target_audience
                      : 'Not specified'
                    }
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Target audience is locked after creation</p>
                </div>
              </div>



              {/* Department, Semester, and Custom Text for Students */}
              {formData.target_audience === 'student' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Departments
                    </label>
                    <div className="block w-full px-3 py-2 border rounded-md shadow-sm text-sm bg-gray-50 border-gray-200 text-gray-700 min-h-[2.5rem]">
                      {formData.student_department && formData.student_department.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {formData.student_department.map((dept, idx) => {
                            const deptOption = dropdownOptionsService.getOptions('student', 'departments').find(opt => opt.value === dept);
                            return (
                              <span key={idx} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                {deptOption?.label || dept}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        'All Departments'
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Department targeting is read-only</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Semesters
                    </label>
                    <div className="block w-full px-3 py-2 border rounded-md shadow-sm text-sm bg-gray-50 border-gray-200 text-gray-700 min-h-[2.5rem]">
                      {formData.student_semester && formData.student_semester.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {formData.student_semester.map((sem, idx) => (
                            <span key={idx} className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                              Sem {sem}
                            </span>
                          ))}
                        </div>
                      ) : (
                        'All Semesters'
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Semester targeting is read-only</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Info <span className="text-gray-400">(Read-Only)</span>
                    </label>
                    <div className="block w-full px-3 py-2 border rounded-md shadow-sm text-sm bg-gray-50 border-gray-200 text-gray-700 min-h-[2.5rem]">
                      {formData.custom_text || 'No additional information'}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Additional info cannot be modified</p>
                  </div>
                </div>
              )}

              {/* Short Description - EDITABLE */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Short Description <span className="text-red-500">*</span>
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                    Editable
                  </span>
                </label>
                <textarea
                  name="short_description"
                  value={formData.short_description}
                  onChange={handleInputChange}
                  required
                  rows={2}
                  placeholder="Write a brief overview of the event (max 200 characters)"
                  className="block w-full px-3 py-2 border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none border-blue-300 focus:border-blue-500"
                />
                <p className="text-xs text-blue-600 mt-1">✓ This field can be edited to update the event summary</p>
              </div>

              {/* Detailed Description - EDITABLE */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Detailed Description <span className="text-red-500">*</span>
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                    Editable
                  </span>
                </label>
                <textarea
                  name="detailed_description"
                  value={formData.detailed_description}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  placeholder="Provide comprehensive details about the event, including objectives, highlights, and what participants can expect"
                  className="block w-full px-3 py-2 border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none border-blue-300 focus:border-blue-500"
                />
                <p className="text-xs text-blue-600 mt-1">✓ This field can be edited to provide updated event details</p>
              </div>

              {/* Information Banner */}
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      <strong>Edit Policy:</strong> Most event details are locked after creation to maintain data integrity and prevent issues with registrations.
                      Only the event descriptions can be modified to provide updated information to participants.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div>
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Organizer, Contact & Schedule Information</h2>
              <p className="text-sm text-gray-600">Event organizer details, contact information, and scheduling settings</p>
            </div>

            <div className="space-y-10">
              {/* Organizer & Contact Information Section */}
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-6 border-b pb-2">Organizer & Contact Information</h3>
                <div className="space-y-6">
                  {/* Organizers - READ ONLY */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event Organizers <span className="text-red-500">*</span>
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        Read Only
                      </span>
                    </label>

                    <div className="space-y-4">
                      {(() => {
                        const selectedOrganizers = formData.organizers?.filter(org => org.selected && org.name) || [];

                        return selectedOrganizers.length > 0 ?
                          selectedOrganizers.map((organizer, idx) => (
                            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50" key={idx}>
                              <div className="flex justify-between items-start mb-3">
                                <h4 className="text-sm font-semibold text-blue-900">Organizer #{idx + 1}</h4>
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                                  </svg>
                                  Faculty Member
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <div>
                                    <p className="text-xs text-blue-600 font-medium">Name:</p>
                                    <p className="text-sm font-semibold text-blue-900">{organizer.name || 'Not Available'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-blue-600 font-medium">Email:</p>
                                    <p className="text-sm text-blue-800">{organizer.email || 'Not Available'}</p>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <div>
                                    <p className="text-xs text-blue-600 font-medium">Employee ID:</p>
                                    <p className="text-sm text-blue-800">{organizer.employee_id || 'Not Available'}</p>
                                  </div>

                                  {(organizer.department || organizer.designation) && (
                                    <div>
                                      <p className="text-xs text-blue-600 font-medium">Department & Role:</p>
                                      <p className="text-sm text-blue-700">
                                        {organizer.department || 'N/A'} • {organizer.designation || 'N/A'}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="mt-3 pt-2 border-t border-blue-200 flex items-center justify-between">
                                <span className="text-xs text-blue-600">✓ Faculty member verified</span>
                                <span className="text-xs text-blue-500 bg-blue-100 px-2 py-1 rounded">Locked</span>
                              </div>
                            </div>
                          )) : (
                            <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 text-center">
                              <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <p className="text-sm text-gray-600 font-medium">No organizers assigned to this event</p>
                              <p className="text-xs text-gray-500 mt-1">Event organizers were not properly configured during creation</p>
                            </div>
                          );
                      })()}
                    </div>

                    <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded p-2 text-center">
                      🔒 Organizer information cannot be modified after event creation
                    </p>
                  </div>

                  {/* Contact Information - EDITABLE */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Volunteer Contact Information <span className="text-red-500">*</span>
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                        Editable
                      </span>
                    </label>
                    <div className="space-y-2">
                      {formData.contacts.map((c, idx) => (
                        <div className="grid grid-cols-[0.65fr_1fr] gap-2" key={idx}>
                          <input
                            type="text"
                            value={c.name}
                            onChange={e => handleContactChange(idx, 'name', e.target.value)}
                            required
                            placeholder="Contact Name (E.g. Smriti Sharma)"
                            className="block w-full px-3 py-2 border border-blue-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={c.contact}
                              onChange={e => handleContactChange(idx, 'contact', e.target.value)}
                              required
                              placeholder="Email/Phone (E.g. smriti.sharma@college.edu / 9876543210)"
                              className="flex w-full px-3 py-2 border border-blue-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            {formData.contacts.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeContact(idx)}
                                className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm font-medium"
                              >
                                −
                              </button>
                            )}
                            {idx === formData.contacts.length - 1 && (
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
                    <p className="text-xs text-blue-600 mt-1">✓ Contact information can be updated</p>
                  </div>
                </div>
              </div>

              {/* Registration Settings & Attendance Settings - Side by Side Layout (All Read-Only) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Registration Settings Section - READ ONLY */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-6 border-b pb-2">Registration Settings</h3>
                  <div className="space-y-4">
                    {/* Registration Type and Mode in same row - READ ONLY */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          Registration Type<span className="text-red-500">*</span>
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            Read Only
                          </span>
                        </label>
                        <div className="px-3 py-2 w-full rounded-lg border border-gray-300 bg-gray-50 text-gray-700 text-sm capitalize">
                          {formData.registration_type === 'free' ? 'Free Registration' :
                            formData.registration_type === 'paid' ? 'Paid Registration' :
                              formData.registration_type === 'sponsored' ? 'Sponsored Event' :
                                formData.registration_type || 'Not Set'}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          Registration Mode<span className="text-red-500">*</span>
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            Read Only
                          </span>
                        </label>
                        <div className="px-3 py-2 w-full rounded-lg border border-gray-300 bg-gray-50 text-gray-700 text-sm capitalize">
                          {formData.registration_mode === 'individual' ? 'Individual Registration' :
                            formData.registration_mode === 'team' ? 'Team Registration' :
                              formData.registration_mode || 'Not Set'}
                        </div>
                      </div>
                    </div>

                    {/* Fee Fields - READ ONLY if exists */}
                    {formData.registration_type === 'paid' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3" id="fee-fields">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Registration Fee</label>
                          <div className="px-3 py-2 w-full rounded-lg border border-gray-300 bg-gray-50 text-gray-700 text-sm">
                            ₹{formData.registration_fee || '0.00'}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Fee Description</label>
                          <div className="px-3 py-2 w-full rounded-lg border border-gray-300 bg-gray-50 text-gray-700 text-sm min-h-[2.5rem]">
                            {formData.fee_description || 'No description'}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Team Fields - READ ONLY if exists */}
                    {formData.registration_mode === 'team' && (
                      <div className="space-y-3" id="team-fields">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Team Size</label>
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Min:</span> {formData.team_size_min || 'Not Set'} • 
                              <span className="font-medium ml-2">Max:</span> {formData.team_size_max || 'Not Set'}
                            </p>
                          </div>

                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Participants Limit</label>
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Min:</span> {formData.min_participants || '1'} • 
                              <span className="font-medium ml-2">Max:</span> {formData.max_participants || 'Unlimited'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
                          <input
                            type="checkbox"
                            checked={formData.allow_multiple_team_registrations}
                            disabled
                            className="w-3 h-3 text-gray-400 bg-gray-200 border-gray-300 rounded cursor-not-allowed"
                          />
                          <label className="text-sm text-gray-500 cursor-not-allowed">Allow Multiple Team Registrations</label>
                        </div>
                      </div>
                    )}

                    {/* For individual registration mode, show participants limit separately */}
                    {formData.registration_mode === 'individual' && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Participants Limit</label>
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Min:</span> {formData.min_participants || '1'} • 
                          <span className="font-medium ml-2">Max:</span> {formData.max_participants || 'Unlimited'}
                        </p>
                      </div>
                    )}

                    {/* Event Mode - READ ONLY */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3.5 mt-7 ">
                        Event Mode<span className="text-red-500">*</span>
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          Read Only
                        </span>
                      </label>
                      <div className="px-3 py-2 w-full rounded-lg border border-gray-300 bg-gray-50 text-gray-700 text-sm capitalize">
                        {formData.mode === 'online' && '🌐 Online Event'}
                        {formData.mode === 'offline' && '📍 Offline Event'}
                        {formData.mode === 'hybrid' && '🔄 Hybrid Event'}
                        {!formData.mode && 'Not Set'}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Event mode cannot be changed after creation</p>
                    </div>

                    <p className="text-xs text-gray-500 mt-2 text-center bg-gray-50 rounded p-2">
                      🔒 All registration settings are locked after event creation
                    </p>
                  </div>
                </div>

                {/* Attendance Settings - READ ONLY */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-6 border-b pb-2">Attendance Settings</h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <div className="flex items-center h-5">
                          <input
                            type="checkbox"
                            checked={formData.attendance_mandatory}
                            disabled
                            className="h-4 w-4 text-gray-400 bg-gray-200 border-gray-300 rounded cursor-not-allowed"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-sm font-medium text-gray-500 cursor-not-allowed">
                            Is Event Attendance Mandatory?
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                              Read Only
                            </span>
                          </label>
                          <p className="text-xs text-gray-500 mt-1">
                            Current: {formData.attendance_mandatory ? 'Mandatory' : 'Optional'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {formData.attendance_mandatory ? (
                      <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <h4 className="text-sm font-medium text-blue-900">Attendance Tracking Enabled</h4>
                          </div>
                          <p className="text-xs text-blue-800">
                            Participants must check in to mark their attendance.
                          </p>
                        </div>

                        {/* Attendance Strategy Display */}
                        {formData.attendance_strategy ? (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-3">
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <h4 className="text-sm font-semibold text-green-900">Attendance Strategy</h4>
                            </div>

                            <div className="space-y-3">
                              {/* Strategy Type */}
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-green-700 font-medium">Strategy Type:</span>
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
                                  {getStrategyDisplayName(formData.attendance_strategy)}
                                </span>
                              </div>

                              {/* Minimum Percentage */}
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-green-700 font-medium">Required Attendance:</span>
                                <span className="text-xs text-green-800 font-semibold">
                                  {formData.attendance_strategy.criteria?.minimum_percentage ||
                                    formData.attendance_strategy.minimum_percentage ||
                                    (formData.attendance_strategy.strategy === 'single_mark' ? '100' : '75')}%
                                </span>
                              </div>

                              {/* Sessions count if available */}
                              {formData.attendance_strategy.sessions?.length > 0 && (
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-green-700 font-medium">Sessions:</span>
                                  <span className="text-xs text-green-800">
                                    {formData.attendance_strategy.sessions.length} session{formData.attendance_strategy.sessions.length !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              )}

                              {/* Strategy Description */}
                              {formData.attendance_strategy.detected_strategy?.description && (
                                <div className="mt-2 pt-2 border-t border-green-200">
                                  <p className="text-xs text-green-700 italic">
                                    "{formData.attendance_strategy.detected_strategy.description}"
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-2">
                              <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                              <h4 className="text-sm font-medium text-yellow-900">Standard Attendance Strategy</h4>
                            </div>
                            <p className="text-xs text-yellow-800">
                              Using default QR code check-in system with standard attendance tracking.
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                        <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <h3 className="text-sm font-medium text-gray-900 mb-1">No Attendance Tracking</h3>
                        <p className="text-xs text-gray-600">
                          No attendance data will be collected for this event.
                        </p>
                      </div>
                    )}

                    <p className="text-xs text-gray-500 text-center bg-gray-50 rounded p-2">
                      🔒 Attendance settings are locked after event creation
                    </p>
                  </div>
                </div>
              </div>

              {/* Schedule Information Section - EDITABLE */}
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-6 border-b pb-2 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="orange" className="w-5 h-5 mr-2">
                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 0 1 .67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 1 1-.671-1.34l.041-.022ZM12 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                  </svg>
                  Event Schedule
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                    Editable
                  </span>
                </h3>

                {/* Main Layout: Left Column (Forms) and Right Column (Preview) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column: Forms */}
                  <div className="space-y-6">
                    {/* Registration Period - EDITABLE */}
                    <div>
                      <DateRangePicker
                        label="Registration Period"
                        startDate={formData.registration_start_date ? new Date(formData.registration_start_date) : null}
                        endDate={formData.registration_end_date ? new Date(formData.registration_end_date) : null}
                        startTime={formData.registration_start_time}
                        endTime={formData.registration_end_time}
                        onDateChange={handleRegistrationDateChange}
                        onTimeChange={handleRegistrationTimeChange}
                        includeTime={true}
                        required={true}
                        placeholder="Select registration period"
                        className="w-full -mb-3"
                        theme="green"
                      />
                    </div>

                    {/* Event Schedule - EDITABLE */}
                    <div>
                      <DateRangePicker
                        label="Event Schedule"
                        startDate={formData.start_date ? new Date(formData.start_date) : null}
                        endDate={formData.end_date ? new Date(formData.end_date) : null}
                        startTime={formData.start_time}
                        endTime={formData.end_time}
                        onDateChange={handleEventDateChange}
                        onTimeChange={handleEventTimeChange}
                        includeTime={true}
                        required={true}
                        placeholder="Select event duration"
                        constrainToRegistration={true}
                        className="w-full"
                        theme="purple"
                      />
                    </div>

                    {/* Event Mode & Location Section */}
                    <div className="pt-4 border-t border-gray-200">
                      <div className="space-y-4">
                        {/* Venue Location Input - EDITABLE for offline and hybrid modes */}
                        {(formData.mode === 'offline' || formData.mode === 'hybrid') && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Venue/Location<span className="text-red-500">*</span>
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                                Editable
                              </span>
                            </label>

                            <div className="relative venue-search-container" ref={venueDropdownRef}>
                              <input
                                type="text"
                                name="venue"
                                value={formData.venue}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setFormData(prev => ({
                                    ...prev,
                                    venue: value,
                                    venue_id: '' // Clear venue_id when manually typing
                                  }));
                                  handleVenueSearch(value);
                                  setShowVenueDropdown(true);
                                }}
                                onFocus={() => {
                                  setShowVenueDropdown(true);
                                  setFilteredVenues(venues); // Show all venues when focused
                                }}
                                placeholder="Click to view all venues or type to search (e.g., Main Auditorium, Room 101)"
                                className="w-full rounded-md border border-blue-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 pr-10"
                                required
                              />

                              {/* Search Icon */}
                              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                              </div>

                              {/* Autocomplete Dropdown - Show all venues when focused or filtered when searching */}
                              {showVenueDropdown && (filteredVenues.length > 0 || (!formData.venue || formData.venue === '')) && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                  {(filteredVenues.length > 0 ? filteredVenues : venues).map((venue) => (
                                    <div
                                      key={venue.venue_id}
                                      onClick={() => selectVenue(venue)}
                                      className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                    >
                                      <div className="flex justify-between items-center">
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-gray-900">{venue.venue_name}</p>
                                          <p className="text-xs text-gray-500">{venue.building}</p>
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

                            <p className="text-xs text-blue-600 mt-1">
                              ✓ Venue location can be updated. Start typing to see suggestions from existing venues.
                            </p>

                            {/* Display selected venue confirmation */}
                            {formData.venue_id && (
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
                            {formData.venue && !formData.venue_id && (
                              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                                <div className="flex items-center gap-2">
                                  <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                  </svg>
                                  <span className="text-sm text-amber-800 font-medium">Custom venue will be updated</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Online Meeting Link Input - EDITABLE for online and hybrid modes */}
                        {(formData.mode === 'online' || formData.mode === 'hybrid') && (
                          <div className={formData.mode === 'hybrid' ? 'mt-4' : ''}>
                            <label className="block text-sm font-medium text-gray-700">
                              {formData.mode === 'hybrid' ? 'Online Meeting Link' : 'Platform/Meeting Link'}
                              <span className="text-red-500">*</span>
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                                Editable
                              </span>
                            </label>
                            <input
                              type="url"
                              name="online_meeting_link"
                              value={formData.online_meeting_link}
                              onChange={handleInputChange}
                              placeholder="e.g., https://meet.google.com/xyz-abc-def or Zoom Meeting ID"
                              required
                              className="mt-1 block w-full rounded-md border border-blue-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3"
                            />
                            <p className="text-xs text-blue-600 mt-1">
                              ✓ {formData.mode === 'hybrid'
                                ? 'Online meeting link can be updated for the online component of this hybrid event'
                                : 'Online meeting platform link can be updated'
                              }
                            </p>
                          </div>
                        )}
                      </div>
                    </div>


                  </div>
                  {/* Right Column: Event Timeline & Location Preview */}
                  <div className="space-y-6">
                    {/* Event Timeline Preview */}
                    <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-xl border border-purple-100">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        Event Timeline
                      </h4>
                      <div className="space-y-4">
                        {/* Registration Period Display */}
                        <div className="bg-green-100 rounded-lg p-4 border-l-4 border-green-500">
                          <h5 className="font-medium text-green-800 mb-2">📝 Registration Period</h5>
                          {formData.registration_start_date && formData.registration_end_date ? (
                            <div className="text-sm text-green-700 space-y-1">
                              <p><span className="font-medium">From:</span> {new Date(formData.registration_start_date).toLocaleDateString('en-US', {
                                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                              })} {formData.registration_start_time && `at ${formData.registration_start_time}`}</p>
                              <p><span className="font-medium">To:</span> {new Date(formData.registration_end_date).toLocaleDateString('en-US', {
                                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                              })} {formData.registration_end_time && `at ${formData.registration_end_time}`}</p>
                            </div>
                          ) : (
                            <p className="text-sm text-green-600 italic">Not set yet</p>
                          )}
                        </div>

                        {/* Event Schedule Display */}
                        <div className="bg-purple-100 rounded-lg p-4 border-l-4 border-purple-500">
                          <h5 className="font-medium text-purple-800 mb-2">🎉 Event Schedule</h5>
                          {formData.start_date && formData.end_date ? (
                            <div className="text-sm text-purple-700 space-y-1">
                              <p><span className="font-medium">From:</span> {new Date(formData.start_date).toLocaleDateString('en-US', {
                                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                              })} {formData.start_time && `at ${formData.start_time}`}</p>
                              <p><span className="font-medium">To:</span> {new Date(formData.end_date).toLocaleDateString('en-US', {
                                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                              })} {formData.end_time && `at ${formData.end_time}`}</p>
                            </div>
                          ) : (
                            <p className="text-sm text-purple-600 italic">Not set yet</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Location Preview */}

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
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2 text-amber-600 cursor-help">
                    <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5zM16.5 15a.75.75 0 01.712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 010 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 01-1.422 0l-.395-1.183a1.5 1.5 0 00-.948-.948l-1.183-.395a.75.75 0 010-1.422l1.183-.395c.447-.15.799-.5.948-.948l.394-1.183A.75.75 0 0116.5 15z" clipRule="evenodd" />
                  </svg>

                  {/* Tooltip */}
                  <div className="absolute left-0 top-8 w-80 bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-lg z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="flex items-start space-x-2">
                      <div className="w-5 h-5 text-amber-600 mt-0.5">🏆</div>
                      <div className="text-sm text-amber-800">
                        <p className="font-medium mb-2">Poster & Certificates:</p>
                        <ul className="space-y-1 text-xs">
                          <li>• Event poster is always optional but recommended for marketing</li>
                          <li>• Certificate distribution date is optional - set it if you want to provide certificates</li>
                          <li>• Certificate templates are only required if you set a distribution date</li>
                          <li>• Different event types require different certificate templates</li>
                          <li>• Templates should include placeholders like [Event Name], [Participant Name]</li>
                        </ul>
                      </div>
                    </div>

                    {/* Arrow pointing up */}
                    <div className="absolute -top-2 left-4 w-4 h-4 bg-amber-50 border-l border-t border-amber-200 transform rotate-45"></div>
                  </div>
                </div>
                Assets & Templates
              </h2>
              <p className="text-sm text-gray-600">Update event poster and configure certificates (if needed)</p>
            </div>

            <div className="space-y-8">
              {/* Event Poster Section - Always visible */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Event Poster
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                    Editable
                  </span>
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Upload an updated event poster image (PNG preferred, but any image format works). This helps with marketing and promotion.
                </p>

                <input
                  type="file"
                  name="event_poster"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    setFormData(prev => ({
                      ...prev,
                      event_poster: file
                    }));
                  }}
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />

                {formData.event_poster && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Selected Poster:</h4>
                    <div className="flex items-center justify-between bg-blue-50 rounded-md p-3">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm text-blue-700 font-medium">{formData.event_poster.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-blue-600">{Math.round(formData.event_poster.size / 1024)} KB</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
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

              {/* Certificate Distribution Date Section */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Certificate Distribution
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                    Editable
                  </span>
                </h3>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 pt-3 pb-3">
                  <DateRangePicker
                    label="Certificate Distribution End Date"
                    startDate={formData.certificate_end_date ? new Date(formData.certificate_end_date) : null}
                    endDate={null}
                    startTime={formData.certificate_end_time}
                    endTime={null}
                    onDateChange={handleCertificateDateChange}
                    onTimeChange={handleCertificateTimeChange}
                    includeTime={true}
                    required={false}
                    placeholder="Optional: Select certificate expiry date"
                    className="w-full"
                    singleDate={true}
                    description="After this date, certificates will no longer be downloadable"
                    theme="purple"
                  />

                  <p className="text-sm text-purple-800 mt-5">
                    <strong>Optional:</strong> Set when certificates will no longer be available for download. Leave blank if no certificates are needed.
                  </p>
                </div>
              </div>

              {/* Certificate Templates Section - Only show if certificate date is set */}
              {formData.certificate_end_date && formData.certificate_end_time ? (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Certificate Templates</h3>
                        <p className="text-sm text-gray-600">Update certificate templates for this event</p>
                      </div>
                    </div>

                    {/* Event Type Information */}
                    <div className="bg-white border border-purple-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h4 className="text-md font-medium text-gray-900">
                          Certificate Types for {formData.event_type ? formData.event_type.charAt(0).toUpperCase() + formData.event_type.slice(1) : 'Selected'} Event
                        </h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        Based on your event type and mode, the following certificate templates can be updated:
                      </p>
                      {formData.event_type && (
                        <div className="mt-3">
                          <div className="flex flex-wrap gap-2">
                            {getCertificateTypes(formData.event_type, formData.mode).map((type, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                              >
                                {type}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Certificate Template Uploads */}
                  {formData.event_type && (
                    <div className="space-y-4">
                      <h3 className="text-md font-medium text-gray-900 border-b pb-2">Update Certificate Templates</h3>

                      <div className="grid grid-cols-1 gap-6">
                        {getCertificateTypes(formData.event_type, formData.mode).map((certificateType, index) => (
                          <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 hover:border-purple-300 transition-colors">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900">{certificateType}</h4>
                                <p className="text-xs text-gray-500 mt-1">Upload a new HTML template for this certificate type</p>
                              </div>
                              {formData.certificate_templates[certificateType] && (
                                <div className="flex items-center space-x-2">
                                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                  <span className="text-xs text-green-600 font-medium">New Template Selected</span>
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
                                    setFormData(prev => ({
                                      ...prev,
                                      certificate_templates: {
                                        ...prev.certificate_templates,
                                        [certificateType]: file
                                      }
                                    }));
                                  }
                                }}
                                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                              />

                              {formData.certificate_templates[certificateType] && (
                                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                      <span className="text-sm text-green-800 font-medium">
                                        {formData.certificate_templates[certificateType].name}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFormData(prev => {
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
                    </div>
                  )}

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
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <div className="text-center">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-md font-medium text-gray-900 mb-2">No Certificate Templates Required</h3>
                    <p className="text-sm text-gray-600">
                      Set a certificate distribution date above to enable certificate template uploads.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AdminLayout pageTitle="Edit Event">
      <div className="min-h-screen flex max-w-5xl justify-center items-center mx-auto">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-4">
              <button
                onClick={() => navigate('/admin/events')}
                className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Back to Events
              </button>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Event</h1>
            <p className="text-gray-600 mt-2">Update event information and settings</p>
          </div>

          {/* Error notification */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Organizer notification */}
          {organizerNotification && (
            <div className={`mb-6 border px-4 py-3 rounded-lg ${organizerNotification.type === 'warning'
              ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}>
              {organizerNotification.message}
            </div>
          )}

          {/* Main Content Card */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-8" aria-label="Tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    <i className={`${tab.icon} mr-2`}></i>
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <form onSubmit={handleSubmit}>
              <div className="p-8">
                {renderTabContent()}
              </div>

              {/* Navigation & Submit */}
              <div className="px-8 py-6 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                <div className="flex space-x-2">
                  {activeTab > 1 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab(activeTab - 1)}
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <i className="fas fa-arrow-left mr-2"></i>Previous
                    </button>
                  )}
                  {activeTab < tabs.length && (
                    <button
                      type="button"
                      onClick={() => setActiveTab(activeTab + 1)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Next<i className="fas fa-arrow-right ml-2"></i>
                    </button>
                  )}
                </div>

                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => navigate('/admin/events')}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors flex items-center"
                  >
                    {isSaving ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Updating Event...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save mr-2"></i>
                        Update Event
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default EditEvent;
