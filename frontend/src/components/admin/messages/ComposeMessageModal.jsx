import React, { useState, useEffect } from 'react';
import { 
  X, 
  Users, 
  Tag, 
  AlertCircle, 
  MessageCircle,
  Send,
  Search
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

const ComposeMessageModal = ({ onClose, onSuccess }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    subject: '',
    participants: [],
    initial_message: '',
    priority: 'normal',
    tags: [],
    context: {
      category: '',
      venue_id: '',
      event_id: ''
    }
  });
  const [availableParticipants, setAvailableParticipants] = useState([]);
  const [participantSearch, setParticipantSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [tagInput, setTagInput] = useState('');

  // Fetch available participants
  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const params = new URLSearchParams();
        if (participantSearch) {
          params.append('search', participantSearch);
        }

        const response = await fetch(`/api/v1/admin/messages/participants?${params}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setAvailableParticipants(data.data.participants);
          }
        }
      } catch (error) {
        console.error('Error fetching participants:', error);
      }
    };

    fetchParticipants();
  }, [participantSearch]);

  // Handle form changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Handle participant selection
  const handleParticipantToggle = (username) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.includes(username)
        ? prev.participants.filter(p => p !== username)
        : [...prev.participants, username]
    }));
  };

  // Handle tag addition
  const handleAddTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (!formData.tags.includes(newTag)) {
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, newTag]
        }));
      }
      setTagInput('');
    }
  };

  // Handle tag removal
  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (formData.participants.length === 0) {
      newErrors.participants = 'At least one participant is required';
    }

    if (!formData.initial_message.trim()) {
      newErrors.initial_message = 'Message content is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Clean context data - remove empty fields
      const cleanContext = {};
      if (formData.context.category) cleanContext.category = formData.context.category;
      if (formData.context.venue_id) cleanContext.venue_id = formData.context.venue_id;
      if (formData.context.event_id) cleanContext.event_id = formData.context.event_id;

      const payload = {
        subject: formData.subject.trim(),
        participants: formData.participants,
        initial_message: formData.initial_message.trim(),
        priority: formData.priority,
        tags: formData.tags,
        ...(Object.keys(cleanContext).length > 0 && { context: cleanContext })
      };

      const response = await fetch('/api/v1/admin/messages/thread', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onSuccess();
        onClose();
      } else {
        setErrors({ submit: data.message || 'Failed to create message thread' });
      }
    } catch (error) {
      console.error('Error creating thread:', error);
      setErrors({ submit: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center">
            <MessageCircle className="w-6 h-6 text-blue-600 mr-3" />
            <h3 className="text-lg font-medium text-gray-900">Compose New Message</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject *
            </label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.subject ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter message subject..."
            />
            {errors.subject && (
              <p className="mt-1 text-sm text-red-600">{errors.subject}</p>
            )}
          </div>

          {/* Recipients */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipients * ({formData.participants.length} selected)
            </label>
            
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={participantSearch}
                onChange={(e) => setParticipantSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search admin users..."
              />
            </div>

            {/* Available participants */}
            <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-2">
              {availableParticipants.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No participants found</p>
              ) : (
                <div className="space-y-1">
                  {availableParticipants.map(participant => (
                    <label
                      key={participant.username}
                      className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.participants.includes(participant.username)}
                        onChange={() => handleParticipantToggle(participant.username)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {participant.fullname}
                        </div>
                        <div className="text-sm text-gray-500">
                          @{participant.username} • {participant.role}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            
            {errors.participants && (
              <p className="mt-1 text-sm text-red-600">{errors.participants}</p>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Context */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Context (Optional)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <select
                name="context.category"
                value={formData.context.category}
                onChange={handleChange}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select category</option>
                <option value="general">General</option>
                <option value="venue">Venue</option>
                <option value="event">Event</option>
                <option value="booking">Booking</option>
                <option value="maintenance">Maintenance</option>
              </select>
              <input
                type="text"
                name="context.venue_id"
                value={formData.context.venue_id}
                onChange={handleChange}
                placeholder="Venue ID (if applicable)"
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type and press Enter to add tags..."
            />
            {formData.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Message Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message *
            </label>
            <textarea
              name="initial_message"
              value={formData.initial_message}
              onChange={handleChange}
              rows={6}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.initial_message ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Type your message here..."
            />
            {errors.initial_message && (
              <p className="mt-1 text-sm text-red-600">{errors.initial_message}</p>
            )}
          </div>

          {/* Error message */}
          {errors.submit && (
            <div className="flex items-center p-3 text-sm text-red-600 bg-red-50 rounded-md">
              <AlertCircle className="w-4 h-4 mr-2" />
              {errors.submit}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ComposeMessageModal;
