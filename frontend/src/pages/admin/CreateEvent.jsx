import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import DateRangePicker from '../../components/common/DateRangePicker';

// Helper for step progress
const steps = [
  'Basic Info',
  'Organizer & Contact',
  'Date & Time',
  'Mode & Location',
  'Outcomes',
  'Prerequisites',
  'Registration',
  'Certificate',
  'Review'
];

function CreateEvent() {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = steps.length;
  const [venues, setVenues] = useState([]);
  const [selectedVenueId, setSelectedVenueId] = useState('');
  const [venueBookings, setVenueBookings] = useState([]);
  const [showVenueAvailability, setShowVenueAvailability] = useState(false);
  const [bookingDateRange, setBookingDateRange] = useState({ start: null, end: null });
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
    organizers: [''],
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
    target_outcomes: '',
    prerequisites: '',
    what_to_bring: '',
    registration_type: '',
    registration_fee: '',
    fee_description: '',
    registration_mode: '',
    team_size_min: '',
    team_size_max: '',
    max_participants: '',
    min_participants: '1',
    certificate_template: null,
    assets: [],
  });
  const [errors, setErrors] = useState({});

  // Load venues on component mount
  useEffect(() => {
    loadVenues();
  }, []);

  const loadVenues = async () => {
    try {
      const response = await fetch('/api/v1/admin/venues');
      if (response.ok) {
        const data = await response.json();
        setVenues(data.venues || []);
      }
    } catch (err) {
      console.error('Error loading venues:', err);
    }
  };

  // Check venue availability when venue or date changes
  useEffect(() => {
    if (selectedVenueId && form.start_date) {
      checkVenueAvailability();
    }
  }, [selectedVenueId, form.start_date]);

  const checkVenueAvailability = async () => {
    if (!selectedVenueId || selectedVenueId === 'custom') return;
    
    try {
      setCheckingAvailability(true);
      const response = await fetch(`/api/v1/admin/venues/${selectedVenueId}/bookings`);
      if (response.ok) {
        const data = await response.json();
        setVenueBookings(data.bookings || []);
        
        // Convert bookings to date ranges for the date picker
        const bookedRanges = data.bookings?.map(booking => ({
          start: booking.start_datetime.split('T')[0],
          end: booking.end_datetime.split('T')[0],
          eventName: booking.event_name
        })) || [];
        
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
  const addOrganizer = () => setForm((prev) => ({ ...prev, organizers: [...prev.organizers, ''] }));
  const removeOrganizer = (idx) => {
    const newOrganizers = form.organizers.filter((_, i) => i !== idx);
    setForm((prev) => ({ ...prev, organizers: newOrganizers }));
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
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      }));
    }
  };

  // Dynamic fields for registration/fee/team
  const showFeeFields = form.registration_type === 'paid';
  const showTeamFields = form.registration_mode === 'team';

  // Validation logic for each step
  const validateStep = (step) => {
    let stepErrors = {};
    if (step === 1) {
      if (!form.event_id) stepErrors.event_id = 'Event ID is required';
      if (!form.event_name) stepErrors.event_name = 'Event Title is required';
      if (!form.event_type) stepErrors.event_type = 'Event Type is required';
      if (!form.target_audience) stepErrors.target_audience = 'Target Audience is required';
      if (!form.short_description) stepErrors.short_description = 'Short Description is required';
      if (!form.detailed_description) stepErrors.detailed_description = 'Detailed Description is required';
    } else if (step === 2) {
      if (!form.organizing_department) stepErrors.organizing_department = 'Organizing Department/Club is required';
      if (!form.organizers.length || form.organizers.some((o) => !o)) stepErrors.organizers = 'At least one organizer is required';
      if (!form.contacts.length || form.contacts.some((c) => !c.name || !c.contact)) stepErrors.contacts = 'At least one contact with name and contact is required';
    } else if (step === 3) {
      ['start_date','start_time','end_date','end_time','registration_start_date','registration_start_time','registration_end_date','registration_end_time','certificate_end_date','certificate_end_time'].forEach((f) => { if (!form[f]) stepErrors[f] = 'Required'; });
      // Date/time logic
      const start = new Date(`${form.start_date}T${form.start_time}`);
      const end = new Date(`${form.end_date}T${form.end_time}`);
      const regStart = new Date(`${form.registration_start_date}T${form.registration_start_time}`);
      const regEnd = new Date(`${form.registration_end_date}T${form.registration_end_time}`);
      if (end <= start) stepErrors.end_time = 'End must be after start';
      if (regEnd <= regStart) stepErrors.registration_end_time = 'Reg end must be after reg start';
      if (regEnd > start) stepErrors.registration_end_time = 'Reg end must be before event start';
    } else if (step === 4) {
      if (!form.mode) stepErrors.mode = 'Mode is required';
      if (!form.venue) stepErrors.venue = 'Venue/Platform is required';
    } else if (step === 5) {
      if (!form.target_outcomes) stepErrors.target_outcomes = 'Learning objectives are required';
    } else if (step === 7) {
      if (!form.registration_type) stepErrors.registration_type = 'Registration Type is required';
      if (showFeeFields && !form.registration_fee) stepErrors.registration_fee = 'Fee is required';
      if (!form.registration_mode) stepErrors.registration_mode = 'Registration Mode is required';
      if (showTeamFields) {
        if (!form.team_size_min) stepErrors.team_size_min = 'Min team size required';
        if (!form.team_size_max) stepErrors.team_size_max = 'Max team size required';
      }
    } else if (step === 8) {
      if (!form.certificate_template) stepErrors.certificate_template = 'Certificate template is required';
    }
    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  // Navigation with validation
  const nextStep = () => {
    if (validateStep(currentStep)) setCurrentStep((s) => Math.min(s + 1, totalSteps));
  };
  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 1));

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
        <p><strong>Organizers:</strong> {form.organizers.join(', ')}</p>
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
        <h3 className="font-semibold text-lg mb-2">Target Outcomes / Goals</h3>
        <p><strong>Learning Objectives:</strong> {form.target_outcomes}</p>
      </div>
      {(form.prerequisites || form.what_to_bring) && (
        <div>
          <h3 className="font-semibold text-lg mb-2">Prerequisites & What to Bring</h3>
          {form.prerequisites && <p><strong>Prerequisites:</strong> {form.prerequisites}</p>}
          {form.what_to_bring && <p><strong>What to Bring:</strong> {form.what_to_bring}</p>}
        </div>
      )}
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
    </div>
  );

  // Form submission (optional backend integration)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(currentStep)) return;
    
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
        organizers: form.organizers.filter(org => org.trim() !== ''),
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
        max_participants: form.max_participants ? parseInt(form.max_participants) : null,
        min_participants: parseInt(form.min_participants) || 1
      };

      console.log('Submitting event data:', eventData);

      const response = await fetch('/api/v1/admin/events/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for session-based auth
        body: JSON.stringify(eventData)
      });

      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response data:', result);

      if (response.ok && result.success) {
        alert(`Event "${form.event_name}" created successfully! Event ID: ${result.event_id}`);
        // Reset form or redirect
        window.location.href = '/admin/events';
      } else {
        // More detailed error reporting
        if (response.status === 401) {
          alert('Authentication required. Please log in as admin first.');
          window.location.href = '/auth/login?mode=admin';
        } else if (response.status === 403) {
          alert('Access denied. You do not have permission to create events.');
        } else if (response.status === 422) {
          alert(`Validation error: ${result.detail || 'Please check your form data'}`);
          console.error('Validation errors:', result.detail);
        } else {
          alert(`Error creating event: ${result.message || result.detail || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Network error creating event. Please check your connection and try again.');
    }
  };

  // Render step content
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="form-section">
            <h2 className="text-xl font-semibold mb-6">Basic Event Information</h2>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Event ID<span className="text-red-500">*</span>
                </label>
                <input type="text" name="event_id" value={form.event_id} onChange={handleChange} required pattern="[A-Za-z0-9_]+" title="No spaces allowed. Use letters, numbers and underscores only." placeholder="e.g., PYWS2025" className={`mt-1 px-4 py-2 w-full rounded-lg border ${errors.event_id ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`} />
                <p className="helper-text text-xs text-gray-500 mt-1">Unique identifier for the event. No spaces allowed, use underscores instead.</p>
                {errors.event_id && <p className="text-xs text-red-500">{errors.event_id}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Event Title<span className="text-red-500">*</span>
                </label>
                <input type="text" name="event_name" value={form.event_name} onChange={handleChange} required placeholder="e.g., Python Workshop 2025" className={`mt-1 px-4 py-2 w-full rounded-lg border ${errors.event_name ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`} />
                <p className="helper-text text-xs text-gray-500 mt-1">Choose a clear, descriptive title that reflects the event's purpose</p>
                {errors.event_name && <p className="text-xs text-red-500">{errors.event_name}</p>}
              </div>
              
              {/* Event Type, Target Audience, and Xenesis Event in same row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700">
                    Event Type<span className="text-red-500">*</span>
                  </label>
                  <select name="event_type" value={form.event_type} onChange={handleChange} required className={`mt-1 px-4 py-2 w-full rounded-lg border ${errors.event_type ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}>
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
                  {errors.event_type && <p className="text-xs text-red-500">{errors.event_type}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700">
                    Target Audience<span className="text-red-500">*</span>
                  </label>
                  <select name="target_audience" value={form.target_audience} onChange={handleChange} required className={`mt-1 px-4 py-2 w-full rounded-lg border ${errors.target_audience ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}>
                    <option value="">Select Audience</option>
                    <option value="student">Students Only</option>
                    <option value="faculty">Faculty Only</option>
                    <option value="both">Students & Faculty</option>
                  </select>
                  {errors.target_audience && <p className="text-xs text-red-500">{errors.target_audience}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700">
                    Event Category
                  </label>
                  <div className="mt-1 px-4 py-2 w-full rounded-lg border border-gray-300 bg-white min-h-[42px] flex items-center">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="is_xenesis_event"
                        checked={form.is_xenesis_event}
                        onChange={(e) => setForm(prev => ({ ...prev, is_xenesis_event: e.target.checked }))}
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">Xenesis Event</span>
                    </label>
                  </div>
                  <p className="helper-text text-xs text-gray-500 mt-1">Check if this is a Xenesis category event</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Short Description<span className="text-red-500">*</span>
                </label>
                <textarea name="short_description" value={form.short_description} onChange={handleChange} required rows={2} placeholder="Write a brief overview of the event (max 200 characters)" className={`mt-1 px-4 py-2 w-full rounded-lg border ${errors.short_description ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`} />
                <p className="helper-text text-xs text-gray-500 mt-1">A concise summary that will appear in event listings</p>
                {errors.short_description && <p className="text-xs text-red-500">{errors.short_description}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Detailed Description<span className="text-red-500">*</span>
                </label>
                <textarea name="detailed_description" value={form.detailed_description} onChange={handleChange} required rows={6} placeholder="Provide comprehensive details about the event, including objectives, highlights, and what participants can expect" className={`mt-1 px-4 py-2 w-full rounded-lg border ${errors.detailed_description ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`} />
                <p className="helper-text text-xs text-gray-500 mt-1">Full description of the event, including agenda, requirements, and other important information</p>
                {errors.detailed_description && <p className="text-xs text-red-500">{errors.detailed_description}</p>}
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="form-section">
            <h2 className="text-xl font-semibold mb-6">Organizer & Contact Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Organizing Department/Club<span className="text-red-500">*</span></label>
                <input type="text" name="organizing_department" value={form.organizing_department} onChange={handleChange} required className={`mt-1 block w-full rounded-md border ${errors.organizing_department ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500`} />
                {errors.organizing_department && <p className="text-xs text-red-500">{errors.organizing_department}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Organizers<span className="text-red-500">*</span></label>
                <div className="space-y-2">
                  {form.organizers.map((org, idx) => (
                    <div className="flex gap-2" key={idx}>
                      <input type="text" value={org} onChange={e => handleOrganizerChange(idx, e.target.value)} required className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="Organizer Name" />
                      {form.organizers.length > 1 && (
                        <button type="button" onClick={() => removeOrganizer(idx)} className="px-3 py-2 bg-red-500 text-white rounded-md">-</button>
                      )}
                      {idx === form.organizers.length - 1 && (
                        <button type="button" onClick={addOrganizer} className="px-3 py-2 bg-blue-500 text-white rounded-md">+</button>
                      )}
                    </div>
                  ))}
                </div>
                {errors.organizers && <p className="text-xs text-red-500">{errors.organizers}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contact Information<span className="text-red-500">*</span></label>
                <div className="space-y-2">
                  {form.contacts.map((c, idx) => (
                    <div className="flex gap-2" key={idx}>
                      <input type="text" value={c.name} onChange={e => handleContactChange(idx, 'name', e.target.value)} required className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="Contact Name" />
                      <input type="text" value={c.contact} onChange={e => handleContactChange(idx, 'contact', e.target.value)} required className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="Email/Phone" />
                      {form.contacts.length > 1 && (
                        <button type="button" onClick={() => removeContact(idx)} className="px-3 py-2 bg-red-500 text-white rounded-md">-</button>
                      )}
                      {idx === form.contacts.length - 1 && (
                        <button type="button" onClick={addContact} className="px-3 py-2 bg-blue-500 text-white rounded-md">+</button>
                      )}
                    </div>
                  ))}
                </div>
                {errors.contacts && <p className="text-xs text-red-500">{errors.contacts}</p>}
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="form-section">
            <h2 className="text-xl font-semibold mb-6">Date & Time</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date & Time<span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Date</label>
                    <input type="date" name="start_date" value={form.start_date} onChange={handleChange} required className={`block w-full rounded-md border ${errors.start_date ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500`} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Time</label>
                    <input type="time" name="start_time" value={form.start_time} onChange={handleChange} required className={`block w-full rounded-md border ${errors.start_time ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500`} />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date & Time<span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Date</label>
                    <input type="date" name="end_date" value={form.end_date} onChange={handleChange} required className={`block w-full rounded-md border ${errors.end_date ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500`} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Time</label>
                    <input type="time" name="end_time" value={form.end_time} onChange={handleChange} required className={`block w-full rounded-md border ${errors.end_time ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500`} />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Registration Start Date & Time<span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Date</label>
                    <input type="date" name="registration_start_date" value={form.registration_start_date} onChange={handleChange} required className={`block w-full rounded-md border ${errors.registration_start_date ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500`} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Time</label>
                    <input type="time" name="registration_start_time" value={form.registration_start_time} onChange={handleChange} required className={`block w-full rounded-md border ${errors.registration_start_time ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500`} />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Registration End Date & Time<span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Date</label>
                    <input type="date" name="registration_end_date" value={form.registration_end_date} onChange={handleChange} required className={`block w-full rounded-md border ${errors.registration_end_date ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500`} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Time</label>
                    <input type="time" name="registration_end_time" value={form.registration_end_time} onChange={handleChange} required className={`block w-full rounded-md border ${errors.registration_end_time ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500`} />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Certificate Distribution End Date & Time<span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Date</label>
                    <input type="date" name="certificate_end_date" value={form.certificate_end_date} onChange={handleChange} required className={`block w-full rounded-md border ${errors.certificate_end_date ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500`} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Time</label>
                    <input type="time" name="certificate_end_time" value={form.certificate_end_time} onChange={handleChange} required className={`block w-full rounded-md border ${errors.certificate_end_time ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500`} />
                  </div>
                </div>
                <p className="helper-text text-xs text-gray-500 mt-2">After this date and time, certificates will no longer be available for download</p>
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="form-section">
            <h2 className="text-xl font-semibold mb-6">Event Mode & Location</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Mode<span className="text-red-500">*</span></label>
                <select name="mode" value={form.mode} onChange={handleChange} required className={`mt-1 block w-full rounded-md border ${errors.mode ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-blue-500 focus:ring-blue-500`}>
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
                          {venue.venue_name} - {venue.location} (Capacity: {venue.facilities?.capacity || 'N/A'})
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
                                <p><strong>Capacity:</strong> {selectedVenue.facilities?.capacity || 'N/A'} people</p>
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
                        minDate={new Date().toISOString().split('T')[0]}
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
        );
      case 5:
        return (
          <div className="form-section">
            <div className="border-b border-gray-200 pb-4 mb-6">
              <h2 className="text-xl font-bold text-gray-800">Target Outcomes / Goals</h2>
              <p className="text-sm text-gray-500 mt-1">Define measurable outcomes or learning objectives for this event</p>
            </div>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Learning Objectives & Goals <span className="text-red-500">*</span>
                </label>
                <textarea name="target_outcomes" value={form.target_outcomes} onChange={handleChange} rows={6} required placeholder="Examples:\n• Promote awareness about cybersecurity best practices\n• Teach basics of Arduino programming to beginners\n• Encourage creativity through design thinking challenges\n• Develop practical skills in blockchain development\n• Foster innovation in AI/ML solutions" className={`mt-1 px-4 py-2 w-full rounded-lg border ${errors.target_outcomes ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`} />
                <p className="helper-text text-xs text-gray-500 mt-1">List the key learning objectives, goals, and expected outcomes for participants. Be specific and measurable where possible.</p>
                {errors.target_outcomes && <p className="text-xs text-red-500">{errors.target_outcomes}</p>}
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-800 mb-2">💡 Tips for Writing Effective Goals:</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Use action verbs (learn, develop, create, understand, apply)</li>
                  <li>• Be specific about what participants will achieve</li>
                  <li>• Make goals measurable and realistic</li>
                  <li>• Align with your target audience's skill level</li>
                  <li>• Consider both technical and soft skills development</li>
                </ul>
              </div>
            </div>
          </div>
        );
      case 6:
        return (
          <div className="form-section">
            <div className="border-b border-gray-200 pb-4 mb-6">
              <h2 className="text-xl font-bold text-gray-800">Prerequisites & What to Bring</h2>
              <p className="text-sm text-gray-500 mt-1">Optional information about event requirements and what participants should bring</p>
            </div>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Prerequisites <span className="text-gray-500">(Optional)</span>
                </label>
                <textarea name="prerequisites" value={form.prerequisites} onChange={handleChange} rows={4} placeholder="e.g., Basic knowledge of Python programming, Laptop with Python installed, etc." className="mt-1 px-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
                <p className="helper-text text-xs text-gray-500 mt-1">List any prerequisites, prior knowledge, or qualifications required for this event</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  What to Bring <span className="text-gray-500">(Optional)</span>
                </label>
                <textarea name="what_to_bring" value={form.what_to_bring} onChange={handleChange} rows={4} placeholder="e.g., Laptop, notebook, pen, ID card, etc." className="mt-1 px-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
                <p className="helper-text text-xs text-gray-500 mt-1">List any items, materials, or equipment participants should bring to the event</p>
              </div>
            </div>
          </div>
        );
      case 7:
        return (
          <div className="form-section">
            <div className="border-b border-gray-200 pb-4 mb-6">
              <h2 className="text-xl font-bold text-gray-800">Registration Type & Fee Structure</h2>
              <p className="text-sm text-gray-500 mt-1">Configure how participants can register and any associated fees</p>
            </div>
            <div className="grid grid-cols-1 gap-6">
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
        );
      case 8:
        return (
          <div className="form-section">
            <h2 className="text-xl font-semibold mb-6">Certificate Template</h2>
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
      case 9:
        return (
          <div className="form-section">
            <h2 className="text-xl font-semibold mb-6">Review</h2>
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
      <div className="max-w-4xl mx-auto py-8 px-2">
        {/* Progress Steps */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="relative">
            {/* Progress Bar */}
            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-1 bg-gray-200">
              <div
                className="absolute left-0 top-0 h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            {/* Steps */}
            <div className="relative z-10 flex justify-between">
              {steps.map((label, idx) => {
                const stepNum = idx + 1;
                let stepClass = 'step';
                if (stepNum === currentStep) stepClass += ' active';
                else if (stepNum < currentStep) stepClass += ' completed';
                return (
                  <div key={label} className={`flex flex-col items-center ${stepClass}`} style={{ minWidth: 0 }}>
                    <div
                      className={`step-circle ${stepNum === currentStep ? 'bg-blue-700 text-white border-blue-700' : stepNum < currentStep ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-400 border-gray-300'}`}
                    >
                      {stepNum}
                    </div>
                    <span className={`step-label mt-2 text-xs ${stepNum === currentStep ? 'text-blue-700 font-semibold' : stepNum < currentStep ? 'text-green-500 font-semibold' : 'text-gray-400'}`}>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Multi-step Form */}
        <form className="bg-white shadow-sm rounded-lg p-6" onSubmit={handleSubmit}>
          {renderStep()}

          {/* Navigation Controls */}
          <div className="mt-8 pt-6 border-t border-gray-200 flex justify-between items-center">
            <button
              type="button"
              onClick={prevStep}
              className={`prev-step px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-colors ${currentStep === 1 ? 'hidden' : ''}`}
            >
              Previous
            </button>
            <div className="flex-1"></div>
            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={nextStep}
                className="next-step px-4 py-2 rounded-lg bg-blue-700 text-white font-semibold hover:bg-blue-800 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                className="submit-form px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors"
              >
                Create Event
              </button>
            )}
          </div>
        </form>
      </div>
      <style>{`
        .step-circle {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.125rem;
          font-weight: 600;
          border: 2px solid;
        }
        .step.active .step-circle {
          background-color: #1e40af;
          color: white;
          border-color: #1e40af;
        }
        .step:not(.active) .step-circle {
          background-color: white;
          color: #9ca3af;
          border-color: #d1d5db;
        }
        .step.completed .step-circle {
          background-color: #22c55e;
          color: white;
          border-color: #22c55e;
        }
        .step-connector {
          flex: 1;
          height: 2px;
          background-color: #e5e7eb;
        }
        .step.active .step-label {
          color: #1e40af;
          font-weight: 600;
        }
        .step:not(.active) .step-label {
          color: #6b7280;
        }
        .step.completed .step-label {
          color: #22c55e;
          font-weight: 600;
        }
        .form-section {
          background-color: white;
          border-radius: 0.5rem;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          padding: 2rem;
          margin-bottom: 1.5rem;
        }
      `}</style>
    </AdminLayout>
  );
}

export default CreateEvent;
