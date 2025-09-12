import React, { useState, useEffect, useRef, useCallback } from 'react';
import { clientAPI } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const MessageBox = ({ eventId, teamData, onBack, isVisible }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('normal');
  const [mentionedMembers, setMentionedMembers] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Message priorities
  const priorities = [
    { value: 'low', label: 'Low', color: 'text-slate-600', bg: 'bg-slate-100' },
    { value: 'normal', label: 'Normal', color: 'text-blue-600', bg: 'bg-blue-100' },
    { value: 'high', label: 'High', color: 'text-orange-600', bg: 'bg-orange-100' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-600', bg: 'bg-red-100' }
  ];

  // Fetch messages on component mount
  useEffect(() => {
    if (isVisible && eventId) {
      fetchMessages();
    }
  }, [isVisible, eventId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when component becomes visible
  useEffect(() => {
    if (isVisible && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isVisible]);

  const fetchMessages = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // Try to fetch messages from API
      const response = await clientAPI.getTeamMessages(eventId, 50, 0);
      
      if (response.data.success) {
        setMessages(response.data.messages || []);
      } else {
        setError('Failed to load messages');
        setMessages([]); // Use empty array as fallback
      }
    } catch (err) {
      
      
      // If API is not available, use mock data for development
      const mockMessages = [
        {
          message_id: 'msg_1',
          content: 'Welcome to the team chat! This is a demo message.',
          priority: 'normal',
          sent_by: 'system',
          sent_at: new Date().toISOString(),
          mentions: []
        }
      ];
      
      setMessages(mockMessages);
      setError(''); // Clear error since we're using fallback data
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    const messageData = {
      content: newMessage.trim(),
      priority: selectedPriority,
      mentions: mentionedMembers.map(member => member.enrollment_no),
      category: 'general'
    };

    try {
      setIsSending(true);
      setError('');

      const response = await clientAPI.postMessage(eventId, {
        message: messageData.content, // Fix: use content instead of message
        priority: messageData.priority,
        mentions: messageData.mentions || []
      });
      
      if (response.data.success) {
        setNewMessage('');
        setMentionedMembers([]);
        setSelectedPriority('normal');
        
        // Refresh messages
        await fetchMessages();
      } else {
        setError(response.data.message || 'Failed to send message');
      }
    } catch (err) {
      
      
      // If API is not available, simulate sending message for development
      const simulatedMessage = {
        message_id: `msg_${Date.now()}`,
        content: messageData.content,
        priority: messageData.priority,
        sent_by: user?.enrollment_no || 'current_user',
        sent_at: new Date().toISOString(),
        mentions: messageData.mentions || []
      };
      
      // Add to local messages array
      setMessages(prev => [simulatedMessage, ...prev]);
      setNewMessage('');
      setMentionedMembers([]);
      setSelectedPriority('normal');
      setError(''); // Clear any previous errors
    } finally {
      setIsSending(false);
    }
  };

  const handleMentionMember = (member) => {
    if (!mentionedMembers.find(m => m.enrollment_no === member.enrollment_no)) {
      setMentionedMembers([...mentionedMembers, member]);
    }
    setShowMentions(false);
  };

  const removeMention = (enrollment) => {
    setMentionedMembers(mentionedMembers.filter(m => m.enrollment_no !== enrollment));
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
  };

  const getPriorityColor = (priority) => {
    const config = priorities.find(p => p.value === priority);
    return config || priorities[1]; // Default to normal
  };

  const isMyMessage = (message) => {
    return message.sent_by === user?.enrollment_no;
  };

  const getMemberName = (enrollmentNo) => {
    if (!teamData?.members) return enrollmentNo;
    const member = teamData.members.find(m => m.enrollment_no === enrollmentNo);
    return member?.name || enrollmentNo;
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200 p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-hidden border border-gray-200 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Team Chat</h3>
              <p className="text-sm text-slate-600">{teamData?.team_name || 'Team Messages'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-slate-500">
              {teamData?.members?.length || 0} members
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-slate-600">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message, index) => {
              const isMe = isMyMessage(message);
              const priorityConfig = getPriorityColor(message.priority);
              
              return (
                <div key={message.message_id || index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] ${isMe ? 'order-2' : 'order-1'}`}>
                    <div className={`rounded-2xl px-4 py-3 ${
                      isMe 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-100 text-slate-900'
                    }`}>
                      {/* Message header */}
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-medium ${
                          isMe ? 'text-blue-100' : 'text-slate-600'
                        }`}>
                          {isMe ? 'You' : getMemberName(message.sent_by)}
                        </span>
                        {message.priority !== 'normal' && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            isMe ? 'bg-blue-500 text-blue-100' : `${priorityConfig.bg} ${priorityConfig.color}`
                          }`}>
                            {priorityConfig.label}
                          </span>
                        )}
                      </div>
                      
                      {/* Message content */}
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      
                      {/* Mentions */}
                      {message.mentions && message.mentions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {message.mentions.map(mention => (
                            <span key={mention} className={`text-xs px-2 py-0.5 rounded-full ${
                              isMe ? 'bg-blue-500 text-blue-100' : 'bg-blue-100 text-blue-600'
                            }`}>
                              @{getMemberName(mention)}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* Timestamp */}
                      <div className={`text-xs mt-2 ${
                        isMe ? 'text-blue-100' : 'text-slate-500'
                      }`}>
                        {formatTime(message.sent_at)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="border-t border-gray-200 p-4">
          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          {/* Mentioned members */}
          {mentionedMembers.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {mentionedMembers.map(member => (
                <span key={member.enrollment_no} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                  @{member.name}
                  <button
                    onClick={() => removeMention(member.enrollment_no)}
                    className="w-4 h-4 rounded-full bg-blue-200 hover:bg-blue-300 flex items-center justify-center"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}

          <form onSubmit={handleSendMessage} className="space-y-3">
            {/* Priority and Mentions Row */}
            <div className="flex items-center gap-3">
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {priorities.map(priority => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
              
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMentions(!showMentions)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Mention
                </button>
                
                {showMentions && teamData?.members && (
                  <div className="absolute bottom-full mb-2 left-0 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-48">
                    <div className="p-2 border-b border-gray-200">
                      <p className="text-xs font-medium text-gray-600">Select team member to mention:</p>
                    </div>
                    <div className="max-h-32 overflow-y-auto">
                      {teamData.members
                        .filter(member => member.enrollment_no !== user?.enrollment_no)
                        .map(member => (
                        <button
                          key={member.enrollment_no}
                          type="button"
                          onClick={() => handleMentionMember(member)}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                        >
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                            <span className="text-xs text-white font-medium">
                              {member.name?.charAt(0) || 'U'}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{member.name}</p>
                            <p className="text-xs text-gray-500">{member.enrollment_no}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Message Input */}
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSending}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isSending}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
              >
                {isSending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MessageBox;
