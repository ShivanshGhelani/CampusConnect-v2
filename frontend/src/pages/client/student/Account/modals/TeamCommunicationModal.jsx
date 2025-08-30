import React, { useState, useEffect, useRef } from 'react';

const TeamCommunicationModal = ({ eventId, teamId, teamMembers = [], onClose, onSuccess }) => {
  const [messageData, setMessageData] = useState({
    title: '',
    content: '',
    priority: 'normal',
    mentions: []
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [showMentionsDropdown, setShowMentionsDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const mentionsInputRef = useRef(null);
  const modalRef = useRef(null);

  // Priority options for messages
  const priorityOptions = [
    { value: 'low', label: 'Low Priority', color: 'text-green-600 bg-green-50 border-green-200', icon: 'fas fa-info-circle' },
    { value: 'normal', label: 'Normal', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: 'fas fa-comment' },
    { value: 'high', label: 'High Priority', color: 'text-orange-600 bg-orange-50 border-orange-200', icon: 'fas fa-exclamation' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-600 bg-red-50 border-red-200', icon: 'fas fa-exclamation-triangle' }
  ];

  // Filter members for mentions (exclude already mentioned)
  const filteredMembers = teamMembers.filter(member => {
    if (!member || !member.name || !member.enrollment_no) return false;
    
    const memberName = (member.name || '').toLowerCase();
    const memberEnrollment = (member.enrollment_no || '').toLowerCase();
    const searchLower = (searchTerm || '').toLowerCase();
    
    const matchesSearch = memberName.includes(searchLower) || memberEnrollment.includes(searchLower);
    const notAlreadyMentioned = !messageData.mentions.includes(member.enrollment_no);
    
    return matchesSearch && notAlreadyMentioned;
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    const handleClickOutsideDropdown = (event) => {
      if (mentionsInputRef.current && !mentionsInputRef.current.contains(event.target)) {
        setShowMentionsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutsideDropdown);
    return () => document.removeEventListener('mousedown', handleClickOutsideDropdown);
  }, []);

  const handleMentionAdd = (member) => {
    setMessageData(prev => ({
      ...prev,
      mentions: [...prev.mentions, member.enrollment_no]
    }));
    setSearchTerm('');
    setShowMentionsDropdown(false);
  };

  const handleMentionRemove = (enrollmentNo) => {
    setMessageData(prev => ({
      ...prev,
      mentions: prev.mentions.filter(m => m !== enrollmentNo)
    }));
  };

  const handleInputChange = (field, value) => {
    setMessageData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!messageData.title.trim()) {
      setError('Message title is required');
      return;
    }

    if (!messageData.content.trim()) {
      setError('Message content is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/client/registration/enhanced/post-message/${eventId}/${teamId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: messageData.title.trim(),
          content: messageData.content.trim(),
          priority: messageData.priority,
          mentions: messageData.mentions.length > 0 ? messageData.mentions : undefined
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onSuccess();
      } else {
        setError(data.message || 'Failed to post message');
      }
    } catch (error) {
      console.error('Error posting message:', error);
      setError('Network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPriority = priorityOptions.find(p => p.value === messageData.priority);
  const mentionedMembers = messageData.mentions.map(enrollment => 
    teamMembers.find(m => m.enrollment_no === enrollment)
  ).filter(Boolean);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div ref={modalRef} className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold mb-2">Team Communication</h2>
              <p className="text-green-100">Send messages to your team members</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-green-200 transition-colors"
              disabled={isLoading}
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                <i className="fas fa-exclamation-circle text-red-600"></i>
                <span className="text-red-800">{error}</span>
              </div>
            )}

            {/* Message Title */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Message Title *
              </label>
              <input
                type="text"
                value={messageData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter message title..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            {/* Priority Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Message Priority
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {priorityOptions.map((priority) => (
                  <button
                    key={priority.value}
                    type="button"
                    onClick={() => handleInputChange('priority', priority.value)}
                    className={`p-3 border-2 rounded-lg text-left transition-all ${
                      messageData.priority === priority.value
                        ? priority.color + ' border-current'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <i className={`${priority.icon} text-lg`}></i>
                      <span className="font-medium text-sm">{priority.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Message Content */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Message Content *
              </label>
              <textarea
                value={messageData.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                placeholder="Type your message here..."
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
              <div className="text-sm text-gray-500">
                {messageData.content.length}/1000 characters
              </div>
            </div>

            {/* Mentions Section */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Mention Team Members (Optional)
              </label>
              
              {/* Mentioned Members Display */}
              {mentionedMembers.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {mentionedMembers.map((member) => (
                    <div
                      key={member.enrollment_no}
                      className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      <i className="fas fa-at"></i>
                      <span>{member.name}</span>
                      <button
                        type="button"
                        onClick={() => handleMentionRemove(member.enrollment_no)}
                        className="text-green-600 hover:text-green-800"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Mention Input with Autocomplete */}
              <div className="relative" ref={mentionsInputRef}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowMentionsDropdown(true);
                  }}
                  onFocus={() => setShowMentionsDropdown(true)}
                  placeholder="Search team members to mention..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <div className="absolute right-3 top-3">
                  <i className="fas fa-at text-gray-400"></i>
                </div>

                {/* Mentions Dropdown */}
                {showMentionsDropdown && filteredMembers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredMembers.map((member) => (
                      <button
                        key={member.enrollment_no}
                        type="button"
                        onClick={() => handleMentionAdd(member)}
                        className="w-full px-4 py-3 text-left hover:bg-green-50 flex items-center gap-3 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <i className="fas fa-user text-green-600 text-sm"></i>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{member.name}</p>
                          <p className="text-sm text-gray-600">{member.enrollment_no}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {showMentionsDropdown && filteredMembers.length === 0 && searchTerm && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500">
                    {messageData.mentions.length === teamMembers.length 
                      ? "All team members are already mentioned"
                      : `No members found matching "${searchTerm}"`
                    }
                  </div>
                )}
              </div>
            </div>

            {/* Message Preview */}
            {(messageData.title || messageData.content) && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                  <i className="fas fa-eye"></i>
                  Message Preview
                </h4>
                
                <div className="bg-white rounded-lg p-4 border border-green-100">
                  {/* Message Header */}
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-semibold text-gray-900">{messageData.title || 'Untitled Message'}</h5>
                    {selectedPriority && (
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${selectedPriority.color}`}>
                        <i className={selectedPriority.icon}></i>
                        <span>{selectedPriority.label}</span>
                      </div>
                    )}
                  </div>

                  {/* Message Content */}
                  {messageData.content && (
                    <div className="text-gray-700 whitespace-pre-wrap mb-3">
                      {messageData.content}
                    </div>
                  )}

                  {/* Mentions */}
                  {mentionedMembers.length > 0 && (
                    <div className="border-t border-gray-100 pt-3">
                      <p className="text-sm text-gray-600 mb-2">Mentioned:</p>
                      <div className="flex flex-wrap gap-1">
                        {mentionedMembers.map((member) => (
                          <span
                            key={member.enrollment_no}
                            className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs"
                          >
                            @{member.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="text-xs text-gray-500 mt-3">
                    Will be sent on {new Date().toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !messageData.title.trim() || !messageData.content.trim()}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading && <i className="fas fa-spinner fa-spin"></i>}
            {isLoading ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeamCommunicationModal;
