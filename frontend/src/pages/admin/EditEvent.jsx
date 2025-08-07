import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../../api/axios';
import AdminLayout from '../../components/admin/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Dropdown } from '../../components/ui';

function EditEvent() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Form data state
  const [formData, setFormData] = useState({
    event_name: '',
    event_type: '',
    organizing_department: '',
    short_description: '',
    detailed_description: '',
    start_datetime: '',
    end_datetime: '',
    registration_start_date: '',
    registration_end_date: '',
    certificate_end_date: '',
    venue: '',
    mode: 'Offline',
    target_outcomes: '',
    prerequisites: '',
    what_to_bring: '',
    registration_type: 'free',
    registration_mode: 'individual',
    registration_fee: '',
    fee_description: '',
    team_size_min: '',
    team_size_max: '',
    min_participants: 1,
    max_participants: '',
    organizers: '',
    contacts: ''
  });

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
        
        // Format datetime fields for datetime-local inputs
        const formatDateTimeLocal = (dateString) => {
          if (!dateString) return '';
          const date = new Date(dateString);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          return `${year}-${month}-${day}T${hours}:${minutes}`;
        };

        // Format organizers array to string
        const formatOrganizers = (organizers) => {
          if (!organizers || !Array.isArray(organizers)) return '';
          return organizers.join('\n');
        };

        // Format contacts array to string
        const formatContacts = (contacts) => {
          if (!contacts || !Array.isArray(contacts)) return '';
          return contacts.map(contact => `${contact.name}: ${contact.contact}`).join('\n');
        };

        setFormData({
          event_name: eventData.event_name || '',
          event_type: eventData.event_type || '',
          organizing_department: eventData.organizing_department || '',
          short_description: eventData.short_description || '',
          detailed_description: eventData.detailed_description || '',
          start_datetime: formatDateTimeLocal(eventData.start_datetime),
          end_datetime: formatDateTimeLocal(eventData.end_datetime),
          registration_start_date: formatDateTimeLocal(eventData.registration_start_date),
          registration_end_date: formatDateTimeLocal(eventData.registration_end_date),
          certificate_end_date: formatDateTimeLocal(eventData.certificate_end_date),
          venue: eventData.venue || '',
          mode: eventData.mode || 'Offline',
          target_outcomes: eventData.target_outcomes || '',
          prerequisites: eventData.prerequisites || '',
          what_to_bring: eventData.what_to_bring || '',
          registration_type: eventData.registration_type || 'free',
          registration_mode: eventData.registration_mode || 'individual',
          registration_fee: eventData.registration_fee || '',
          fee_description: eventData.fee_description || '',
          team_size_min: eventData.team_size_min || '',
          team_size_max: eventData.team_size_max || '',
          min_participants: eventData.min_participants || 1,
          max_participants: eventData.max_participants || '',
          organizers: formatOrganizers(eventData.organizers),
          contacts: formatContacts(eventData.event_contacts)
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
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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
      
      // Prepare the data for submission
      const submitData = {
        event_name: formData.event_name,
        event_type: formData.event_type,
        organizing_department: formData.organizing_department,
        short_description: formData.short_description,
        detailed_description: formData.detailed_description || null,
        start_datetime: formData.start_datetime,
        end_datetime: formData.end_datetime,
        registration_start_date: formData.registration_start_date || null,
        registration_end_date: formData.registration_end_date || null,
        certificate_end_date: formData.certificate_end_date || null,
        venue: formData.venue,
        mode: formData.mode,
        target_outcomes: formData.target_outcomes || null,
        prerequisites: formData.prerequisites || null,
        what_to_bring: formData.what_to_bring || null,
        registration_type: formData.registration_type,
        registration_mode: formData.registration_mode,
        registration_fee: formData.registration_fee ? parseFloat(formData.registration_fee) : null,
        fee_description: formData.fee_description || null,
        team_size_min: formData.team_size_min ? parseInt(formData.team_size_min) : null,
        team_size_max: formData.team_size_max ? parseInt(formData.team_size_max) : null,
        min_participants: formData.min_participants ? parseInt(formData.min_participants) : 1,
        max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
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

  return (
    <AdminLayout pageTitle="Edit Event">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white shadow-lg rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Edit Event</h1>
            <button 
              onClick={() => navigate('/admin/events')}
              className="text-blue-600 hover:text-blue-700 flex items-center"
            >
              <i className="fas fa-arrow-left mr-1"></i>Back to Events
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Event Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-700">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="event_name" className="block text-sm font-medium text-gray-700">Event Name</label>
                  <input 
                    type="text" 
                    id="event_name" 
                    name="event_name" 
                    value={formData.event_name}
                    onChange={handleInputChange}
                    required 
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="event_type" className="block text-sm font-medium text-gray-700">Event Type</label>
                  <input 
                    type="text" 
                    id="event_type" 
                    name="event_type" 
                    value={formData.event_type}
                    onChange={handleInputChange}
                    required 
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Dates and Times */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-700">Dates and Times</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="start_datetime" className="block text-sm font-medium text-gray-700">Start Date & Time</label>
                  <input 
                    type="datetime-local" 
                    id="start_datetime" 
                    name="start_datetime" 
                    value={formData.start_datetime}
                    onChange={handleInputChange}
                    required 
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="end_datetime" className="block text-sm font-medium text-gray-700">End Date & Time</label>
                  <input 
                    type="datetime-local" 
                    id="end_datetime" 
                    name="end_datetime" 
                    value={formData.end_datetime}
                    onChange={handleInputChange}
                    required 
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="registration_start_date" className="block text-sm font-medium text-gray-700">Registration Start Date & Time</label>
                  <input 
                    type="datetime-local" 
                    id="registration_start_date" 
                    name="registration_start_date" 
                    value={formData.registration_start_date}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="registration_end_date" className="block text-sm font-medium text-gray-700">Registration End Date & Time</label>
                  <input 
                    type="datetime-local" 
                    id="registration_end_date" 
                    name="registration_end_date" 
                    value={formData.registration_end_date}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="certificate_end_date" className="block text-sm font-medium text-gray-700">Certificate End Date & Time</label>
                  <input 
                    type="datetime-local" 
                    id="certificate_end_date" 
                    name="certificate_end_date" 
                    value={formData.certificate_end_date}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Department and Venue */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-700">Location & Department</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="organizing_department" className="block text-sm font-medium text-gray-700">Organizing Department</label>
                  <input 
                    type="text" 
                    id="organizing_department" 
                    name="organizing_department" 
                    value={formData.organizing_department}
                    onChange={handleInputChange}
                    required 
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="venue" className="block text-sm font-medium text-gray-700">Venue</label>
                  <input 
                    type="text" 
                    id="venue" 
                    name="venue" 
                    value={formData.venue}
                    onChange={handleInputChange}
                    required 
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="mode" className="block text-sm font-medium text-gray-700">Mode</label>
                  <Dropdown
                    options={[
                      { value: "Online", label: "Online" },
                      { value: "Offline", label: "Offline" },
                      { value: "Hybrid", label: "Hybrid" }
                    ]}
                    value={formData.mode}
                    onChange={(value) => handleInputChange({ target: { name: 'mode', value } })}
                    placeholder="Select Mode"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Descriptions */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-700">Descriptions</h2>
              <div>
                <label htmlFor="short_description" className="block text-sm font-medium text-gray-700">Short Description</label>
                <textarea 
                  id="short_description" 
                  name="short_description" 
                  rows="2" 
                  value={formData.short_description}
                  onChange={handleInputChange}
                  required 
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="detailed_description" className="block text-sm font-medium text-gray-700">Detailed Description</label>
                <textarea 
                  id="detailed_description" 
                  name="detailed_description" 
                  rows="4" 
                  value={formData.detailed_description}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Target Outcomes / Goals */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-700">Target Outcomes & Goals</h2>
              <div>
                <label htmlFor="target_outcomes" className="block text-sm font-medium text-gray-700">Learning Objectives & Goals</label>
                <textarea 
                  id="target_outcomes" 
                  name="target_outcomes" 
                  rows="6" 
                  value={formData.target_outcomes}
                  onChange={handleInputChange}
                  placeholder="Define measurable outcomes or learning objectives for this event..." 
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Specify what participants will learn or achieve by attending this event</p>
              </div>
            </div>

            {/* Prerequisites & What to Bring */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-700">Prerequisites & Requirements</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="prerequisites" className="block text-sm font-medium text-gray-700">Prerequisites</label>
                  <textarea 
                    id="prerequisites" 
                    name="prerequisites" 
                    rows="4" 
                    value={formData.prerequisites}
                    onChange={handleInputChange}
                    placeholder="e.g., Basic knowledge of Python programming, Laptop with Python installed, etc." 
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">List any prerequisites, prior knowledge, or qualifications required</p>
                </div>
                <div>
                  <label htmlFor="what_to_bring" className="block text-sm font-medium text-gray-700">What to Bring</label>
                  <textarea 
                    id="what_to_bring" 
                    name="what_to_bring" 
                    rows="4" 
                    value={formData.what_to_bring}
                    onChange={handleInputChange}
                    placeholder="e.g., Laptop, notebook, pen, ID card, etc." 
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">List any items, materials, or equipment participants should bring</p>
                </div>
              </div>
            </div>

            {/* Registration Details */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-700">Registration Configuration</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="registration_type" className="block text-sm font-medium text-gray-700">Registration Type</label>
                  <Dropdown
                    options={[
                      { value: "free", label: "Free Registration" },
                      { value: "paid", label: "Paid Registration" },
                      { value: "sponsored", label: "Sponsored Event" }
                    ]}
                    value={formData.registration_type}
                    onChange={(value) => handleInputChange({ target: { name: 'registration_type', value } })}
                    placeholder="Select Registration Type"
                  />
                </div>
                <div>
                  <label htmlFor="registration_mode" className="block text-sm font-medium text-gray-700">Registration Mode</label>
                  <Dropdown
                    options={[
                      { value: "individual", label: "Individual Registration" },
                      { value: "team", label: "Team Registration" }
                    ]}
                    value={formData.registration_mode}
                    onChange={(value) => handleInputChange({ target: { name: 'registration_mode', value } })}
                    placeholder="Select Registration Mode"
                  />
                </div>
              </div>

              {/* Fee Fields */}
              {formData.registration_type === 'paid' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="registration_fee" className="block text-sm font-medium text-gray-700">Registration Fee (₹)</label>
                      <input 
                        type="number" 
                        id="registration_fee" 
                        name="registration_fee" 
                        min="0" 
                        step="0.01" 
                        value={formData.registration_fee}
                        onChange={handleInputChange}
                        placeholder="e.g., 500.00" 
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="fee_description" className="block text-sm font-medium text-gray-700">Fee Description</label>
                      <textarea 
                        id="fee_description" 
                        name="fee_description" 
                        rows="2" 
                        value={formData.fee_description}
                        onChange={handleInputChange}
                        placeholder="e.g., Includes lunch, materials, certificate, etc." 
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Team Fields */}
              {formData.registration_mode === 'team' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="team_size_min" className="block text-sm font-medium text-gray-700">Minimum Team Size</label>
                      <input 
                        type="number" 
                        id="team_size_min" 
                        name="team_size_min" 
                        min="1" 
                        value={formData.team_size_min}
                        onChange={handleInputChange}
                        placeholder="e.g., 2" 
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="team_size_max" className="block text-sm font-medium text-gray-700">Maximum Team Size</label>
                      <input 
                        type="number" 
                        id="team_size_max" 
                        name="team_size_max" 
                        min="1" 
                        value={formData.team_size_max}
                        onChange={handleInputChange}
                        placeholder="e.g., 5" 
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Participant Limits */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="min_participants" className="block text-sm font-medium text-gray-700">Minimum Participants</label>
                  <input 
                    type="number" 
                    id="min_participants" 
                    name="min_participants" 
                    min="1" 
                    value={formData.min_participants}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="max_participants" className="block text-sm font-medium text-gray-700">Maximum Participants</label>
                  <input 
                    type="number" 
                    id="max_participants" 
                    name="max_participants" 
                    min="1" 
                    value={formData.max_participants}
                    onChange={handleInputChange}
                    placeholder="Leave empty for unlimited" 
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Organizers and Contacts */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-700">Organizers & Contacts</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="organizers" className="block text-sm font-medium text-gray-700">Organizers</label>
                  <textarea 
                    id="organizers" 
                    name="organizers" 
                    rows="3" 
                    value={formData.organizers}
                    onChange={handleInputChange}
                    placeholder="Enter organizer names, one per line" 
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter each organizer name on a new line</p>
                </div>
                <div>
                  <label htmlFor="contacts" className="block text-sm font-medium text-gray-700">Contact Information</label>
                  <textarea 
                    id="contacts" 
                    name="contacts" 
                    rows="3" 
                    value={formData.contacts}
                    onChange={handleInputChange}
                    placeholder="Name: Email/Phone (one per line)" 
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Format: Name: Email/Phone (one contact per line)</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6 space-x-4">
              <button 
                type="button"
                onClick={() => navigate('/admin/events')}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isSaving}
                className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSaving ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}

export default EditEvent;
