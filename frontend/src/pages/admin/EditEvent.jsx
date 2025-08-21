import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../api/admin';
import AdminLayout from '../../components/admin/AdminLayout';
import DateRangePicker from '../../components/common/DateRangePicker';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Dropdown } from '../../components/ui';

function EditEvent() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user, userType } = useAuth();
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
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
    mode: 'Offline',
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
    is_certificate_based: false,
    certificate_templates: {},
    event_poster: null,
    assets: []
  });

  // Load venues and organizers on component mount
  useEffect(() => {
    if (eventId) {
      fetchEvent();
    }
    loadVenues();
    loadExistingOrganizers();
  }, [eventId]);

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

  useEffect(() => {
    if (eventId) {
      fetchEvent();
    }
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      setIsLoading(true);
      const response = await adminAPI.getEvent(eventId);
      
      if (response.data.success) {
        const eventData = response.data.event;
        setEvent(eventData);
        
        // Parse datetime strings to separate date and time
        const parseDateTimeToComponents = (dateTimeString) => {
          if (!dateTimeString) return { date: '', time: '' };
          const date = new Date(dateTimeString);
          const dateStr = date.toISOString().split('T')[0];
          const timeStr = date.toTimeString().split(' ')[0].substring(0, 5); // Hours and minutes format
          return { date: dateStr, time: timeStr };
        };

        // Parse organizers - handle both string and array formats
        const parseOrganizers = (organizersData) => {
          if (!organizersData) return [{ 
            id: null, name: '', email: '', employee_id: '', 
            searchQuery: '', selected: false, isNew: false 
          }];
          
          if (Array.isArray(organizersData)) {
            return organizersData.map(org => ({
              id: org.faculty_id || org.id || null,
              name: org.name || '',
              email: org.email || '',
              employee_id: org.employee_id || '',
              searchQuery: org.name || '',
              selected: !!(org.name),
              isNew: false
            }));
          }
          
          // Handle string format (legacy)
          if (typeof organizersData === 'string' && organizersData.trim()) {
            return organizersData.split('\n').filter(org => org.trim()).map(org => ({
              id: null,
              name: org.trim(),
              email: '',
              employee_id: '',
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

        // Parse contacts
        const parseContacts = (contactsData) => {
          if (!contactsData) return [{ name: '', contact: '' }];
          
          if (Array.isArray(contactsData)) {
            return contactsData.length > 0 ? contactsData : [{ name: '', contact: '' }];
          }
          
          // Handle string format (legacy)
          if (typeof contactsData === 'string' && contactsData.trim()) {
            return contactsData.split('\n').filter(contact => contact.trim()).map(contact => {
              const [name, contactInfo] = contact.split(':').map(part => part.trim());
              return { name: name || '', contact: contactInfo || '' };
            });
          }
          
          return [{ name: '', contact: '' }];
        };

        // Parse date/time components
        const startDateTime = parseDateTimeToComponents(eventData.start_datetime);
        const endDateTime = parseDateTimeToComponents(eventData.end_datetime);
        const regStartDateTime = parseDateTimeToComponents(eventData.registration_start_date);
        const regEndDateTime = parseDateTimeToComponents(eventData.registration_end_date);
        const certEndDateTime = parseDateTimeToComponents(eventData.certificate_end_date);

        setFormData({
          event_name: eventData.event_name || '',
          event_type: eventData.event_type || '',
          target_audience: eventData.target_audience || '',
          is_xenesis_event: eventData.is_xenesis_event || false,
          organizing_department: eventData.organizing_department || '',
          short_description: eventData.short_description || '',
          detailed_description: eventData.detailed_description || '',
          organizers: parseOrganizers(eventData.organizers),
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
          mode: eventData.mode || 'Offline',
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
          is_certificate_based: eventData.is_certificate_based || false,
          certificate_templates: eventData.certificate_templates || {},
          event_poster: null, // Will be loaded separately if needed
          assets: eventData.assets || []
        });
        
        setError('');
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

  // Handle checkbox changes with explicit state updates
  const handleCheckboxChange = (name, checked) => {
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
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

  // Dynamic fields for registration/fee/team
  const showFeeFields = formData.registration_type === 'paid';
  const showTeamFields = formData.registration_mode === 'team';

  const tabs = [
    { id: 1, name: 'Basic Info', icon: 'fas fa-info-circle' },
    { id: 2, name: 'Organizers', icon: 'fas fa-users' },
    { id: 3, name: 'Schedule', icon: 'fas fa-calendar' },
    { id: 4, name: 'Registration', icon: 'fas fa-user-plus' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="event_name"
                  value={formData.event_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter event name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="event_type"
                  value={formData.event_type}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select event type</option>
                  <option value="Technical">Technical</option>
                  <option value="Cultural">Cultural</option>
                  <option value="Sports">Sports</option>
                  <option value="Academic">Academic</option>
                  <option value="Workshops">Workshops</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Audience <span className="text-red-500">*</span>
                </label>
                <select
                  name="target_audience"
                  value={formData.target_audience}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select target audience</option>
                  <option value="Students">Students</option>
                  <option value="Faculty">Faculty</option>
                  <option value="Both">Both Students & Faculty</option>
                  <option value="External">External Participants</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organizing Department <span className="text-red-500">*</span>
                </label>
                <select
                  name="organizing_department"
                  value={formData.organizing_department}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select department</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Mechanical">Mechanical</option>
                  <option value="Civil">Civil</option>
                  <option value="Student Affairs">Student Affairs</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_xenesis_event"
                  name="is_xenesis_event"
                  checked={formData.is_xenesis_event}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_xenesis_event" className="ml-2 text-sm text-gray-700">
                  This is a Xenesis event
                </label>
              </div>

              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Short Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="short_description"
                  value={formData.short_description}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Brief description of the event"
                  required
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Detailed Description
                </label>
                <textarea
                  name="detailed_description"
                  value={formData.detailed_description}
                  onChange={handleInputChange}
                  rows="6"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Detailed event description, objectives, and agenda"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Event Organizers <span className="text-red-500">*</span>
              </label>
              {formData.organizers.map((organizer, idx) => (
                <div key={idx} className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">
                      Organizer {idx + 1}
                    </span>
                    {formData.organizers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOrganizer(idx)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        <i className="fas fa-times"></i> Remove
                      </button>
                    )}
                  </div>
                  
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search faculty by name, email, or employee ID..."
                      value={organizer.searchQuery}
                      onChange={(e) => handleOrganizerSearch(idx, e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    
                    {organizer.selected && (
                      <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-green-800">{organizer.name}</div>
                            <div className="text-sm text-green-600">
                              {organizer.email} • {organizer.employee_id}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => clearOrganizerSelection(idx)}
                            className="text-green-600 hover:text-green-800"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {activeOrganizerDropdown === idx && filteredOrganizers.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredOrganizers.map((faculty) => (
                          <button
                            key={faculty.faculty_id}
                            type="button"
                            className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                            onClick={() => selectExistingOrganizer(idx, faculty)}
                          >
                            <div className="font-medium text-gray-900">{faculty.name}</div>
                            <div className="text-sm text-gray-600">
                              {faculty.email} • {faculty.employee_id}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              <button
                type="button"
                onClick={addOrganizer}
                className="mt-3 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <i className="fas fa-plus mr-2"></i>Add Another Organizer
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Contact Information
              </label>
              {formData.contacts.map((contact, idx) => (
                <div key={idx} className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">
                      Contact {idx + 1}
                    </span>
                    {formData.contacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeContact(idx)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        <i className="fas fa-times"></i> Remove
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Contact person name"
                      value={contact.name}
                      onChange={(e) => handleContactChange(idx, 'name', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Phone number or email"
                      value={contact.contact}
                      onChange={(e) => handleContactChange(idx, 'contact', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              ))}
              
              <button
                type="button"
                onClick={addContact}
                className="mt-3 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <i className="fas fa-plus mr-2"></i>Add Another Contact
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            {/* Event Schedule */}
            <DateRangePicker
              label="Event Schedule"
              description="Select the event start and end dates and times"
              startDate={formData.start_date ? new Date(formData.start_date) : null}
              endDate={formData.end_date ? new Date(formData.end_date) : null}
              startTime={formData.start_time}
              endTime={formData.end_time}
              onDateChange={handleEventDateChange}
              onTimeChange={handleEventTimeChange}
              includeTime={true}
              theme="purple"
              required={true}
            />

            {/* Registration Schedule */}
            <DateRangePicker
              label="Registration Period"
              description="When participants can register for the event"
              startDate={formData.registration_start_date ? new Date(formData.registration_start_date) : null}
              endDate={formData.registration_end_date ? new Date(formData.registration_end_date) : null}
              startTime={formData.registration_start_time}
              endTime={formData.registration_end_time}
              onDateChange={handleRegistrationDateChange}
              onTimeChange={handleRegistrationTimeChange}
              includeTime={true}
              theme="green"
              constrainToRegistration={true}
            />

            {/* Certificate Distribution */}
            <DateRangePicker
              label="Certificate Distribution Deadline"
              description="Last date for certificate distribution"
              startDate={formData.certificate_end_date ? new Date(formData.certificate_end_date) : null}
              endDate={null}
              startTime={formData.certificate_end_time}
              endTime={null}
              onDateChange={handleCertificateDateChange}
              onTimeChange={handleCertificateTimeChange}
              includeTime={true}
              singleDate={true}
              theme="blue"
            />

            {/* Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Mode <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['Offline', 'Online', 'Hybrid'].map((mode) => (
                  <label key={mode} className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="mode"
                      value={mode}
                      checked={formData.mode === mode}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">{mode}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Venue Selection */}
            {(formData.mode === 'Offline' || formData.mode === 'Hybrid') && (
              <div className="relative" ref={venueDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Venue <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.venue}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, venue: e.target.value }));
                    handleVenueSearch(e.target.value);
                    setShowVenueDropdown(true);
                  }}
                  onFocus={() => {
                    setShowVenueDropdown(true);
                    setFilteredVenues(venues);
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search or enter venue name"
                  required={formData.mode !== 'Online'}
                />
                
                {showVenueDropdown && filteredVenues.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredVenues.map((venue) => (
                      <button
                        key={venue.venue_id}
                        type="button"
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                        onClick={() => selectVenue(venue)}
                      >
                        <div className="font-medium text-gray-900">{venue.venue_name}</div>
                        <div className="text-sm text-gray-600">
                          {venue.building} • Capacity: {venue.capacity}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registration Type <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  {['free', 'paid'].map((type) => (
                    <label key={type} className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="registration_type"
                        value={type}
                        checked={formData.registration_type === type}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700 capitalize">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registration Mode <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  {['individual', 'team'].map((mode) => (
                    <label key={mode} className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="registration_mode"
                        value={mode}
                        checked={formData.registration_mode === mode}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700 capitalize">{mode}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Fee Fields */}
              {showFeeFields && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Registration Fee <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="registration_fee"
                      value={formData.registration_fee}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter fee amount"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fee Description
                    </label>
                    <textarea
                      name="fee_description"
                      value={formData.fee_description}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="What does the fee include?"
                    />
                  </div>
                </>
              )}

              {/* Team Fields */}
              {showTeamFields && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Team Size <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="team_size_min"
                      value={formData.team_size_min}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Minimum team size"
                      min="2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Team Size <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="team_size_max"
                      value={formData.team_size_max}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Maximum team size"
                      min="2"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="allow_multiple_team_registrations"
                        checked={formData.allow_multiple_team_registrations}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Allow participants to register with multiple teams
                      </span>
                    </label>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Participants <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="min_participants"
                  value={formData.min_participants}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Minimum participants needed"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Participants
                </label>
                <input
                  type="number"
                  name="max_participants"
                  value={formData.max_participants}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Maximum participants allowed"
                  min="1"
                />
              </div>

              <div className="lg:col-span-2 space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="attendance_mandatory"
                    checked={formData.attendance_mandatory}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Attendance is mandatory for participants
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_certificate_based"
                    checked={formData.is_certificate_based}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    This event will provide certificates
                  </span>
                </label>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AdminLayout pageTitle="Edit Event">
      <div className="min-h-screen bg-gray-50">
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
            <div className={`mb-6 border px-4 py-3 rounded-lg ${
              organizerNotification.type === 'warning' 
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
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
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
