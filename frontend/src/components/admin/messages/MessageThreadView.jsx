import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Send, 
  Users, 
  Pin, 
  Star, 
  MoreVertical,
  Clock,
  CheckCircle,
  AlertCircle,
  Archive,
  Settings,
  Tag
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

const MessageThreadView = () => {
  const { threadId } = useParams();
  const { user } = useAuth();
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  // Fetch thread details
  const fetchThread = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/admin/messages/thread/${threadId}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setThread(data.data.thread);
          
          // Mark thread as read
          await markAsRead();
        } else {
          setError(data.message);
        }
      } else {
        setError('Failed to load thread');
      }
    } catch (error) {
      console.error('Error fetching thread:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Mark messages as read
  const markAsRead = async () => {
    try {
      await fetch(`/api/v1/admin/messages/thread/${threadId}/read`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({}) // Mark all as read
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Send reply
  const handleSendReply = async (e) => {
    e.preventDefault();
    
    if (!replyContent.trim() || isSending) {
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch(`/api/v1/admin/messages/thread/${threadId}/reply`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: replyContent.trim()
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setReplyContent('');
          await fetchThread(); // Refresh thread
        } else {
          setError(data.message);
        }
      } else {
        setError('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Update thread properties
  const handleUpdateThread = async (updates) => {
    try {
      const response = await fetch(`/api/v1/admin/messages/thread/${threadId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          await fetchThread(); // Refresh thread
        } else {
          setError(data.message);
        }
      }
    } catch (error) {
      console.error('Error updating thread:', error);
      setError('Failed to update thread');
    }
  };

  useEffect(() => {
    fetchThread();
  }, [threadId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.messages]);

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'normal': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'low': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'archived': return <Archive className="w-4 h-4 text-gray-500" />;
      case 'closed': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Thread</h3>
          <p className="text-gray-600 mb-4">{error || 'Thread not found'}</p>
          <Link
            to="/admin/messages"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Messages
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link
                to="/admin/messages"
                className="text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div className="flex items-center space-x-3">
                <h1 className="text-xl font-semibold text-gray-900 truncate">
                  {thread.subject}
                </h1>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize border ${getPriorityColor(thread.priority)}`}>
                  {thread.priority}
                </span>
                {thread.is_pinned && (
                  <Pin className="w-4 h-4 text-yellow-500" />
                )}
                {getStatusIcon(thread.status)}
              </div>
            </div>

            {/* Thread actions */}
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              
              {showActions && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        handleUpdateThread({ is_pinned: !thread.is_pinned });
                        setShowActions(false);
                      }}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      <Pin className="w-4 h-4 mr-2" />
                      {thread.is_pinned ? 'Unpin' : 'Pin'} Thread
                    </button>
                    <button
                      onClick={() => {
                        const newStatus = thread.status === 'active' ? 'archived' : 'active';
                        handleUpdateThread({ status: newStatus });
                        setShowActions(false);
                      }}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      <Archive className="w-4 h-4 mr-2" />
                      {thread.status === 'active' ? 'Archive' : 'Unarchive'} Thread
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Thread info */}
      <div className="bg-white border-b px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-1" />
                <span>{thread.participants.length} participants</span>
              </div>
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                <span>Created {formatTime(thread.created_at)}</span>
              </div>
              {thread.context && thread.context.category && (
                <div className="flex items-center">
                  <Tag className="w-4 h-4 mr-1" />
                  <span className="capitalize">{thread.context.category}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Participants */}
          <div className="mt-2">
            <div className="flex flex-wrap gap-2">
              {thread.participants.map(username => (
                <span
                  key={username}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                >
                  {thread.participant_names[username] || username}
                  <span className="ml-1 text-gray-500">
                    ({thread.participant_roles[username]})
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Tags */}
          {thread.tags && thread.tags.length > 0 && (
            <div className="mt-2">
              <div className="flex flex-wrap gap-1">
                {thread.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-6">
            {thread.messages.map((message, index) => {
              const isOwnMessage = message.sender_username === user?.username;
              const isSystemMessage = message.is_system_message;
              
              return (
                <div
                  key={message.message_id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-2xl ${isOwnMessage ? 'ml-12' : 'mr-12'}`}>
                    {/* Message bubble */}
                    <div className={`
                      rounded-lg px-4 py-3 
                      ${isSystemMessage 
                        ? 'bg-gray-100 text-gray-700 text-center' 
                        : isOwnMessage 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-white border border-gray-200 text-gray-900'
                      }
                    `}>
                      {!isSystemMessage && (
                        <div className={`text-xs font-medium mb-1 ${
                          isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {message.sender_name}
                        </div>
                      )}
                      
                      <div className="whitespace-pre-wrap break-words">
                        {message.content}
                      </div>
                      
                      {message.edited_at && (
                        <div className={`text-xs mt-1 ${
                          isOwnMessage ? 'text-blue-100' : 'text-gray-400'
                        }`}>
                          (edited)
                        </div>
                      )}
                    </div>
                    
                    {/* Timestamp and read status */}
                    <div className={`flex items-center justify-between mt-1 text-xs text-gray-500 ${
                      isOwnMessage ? 'flex-row-reverse' : ''
                    }`}>
                      <span>{formatTime(message.timestamp)}</span>
                      
                      {isOwnMessage && message.read_by && message.read_by.length > 0 && (
                        <span className="text-green-600">
                          Read by {message.read_by.length} participant{message.read_by.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Reply form */}
      {thread.status === 'active' && (
        <div className="bg-white border-t">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <form onSubmit={handleSendReply} className="flex items-end space-x-4">
              <div className="flex-1">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Type your reply..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply(e);
                    }
                  }}
                />
                <div className="mt-1 text-xs text-gray-500">
                  Press Enter to send, Shift+Enter for new line
                </div>
              </div>
              <button
                type="submit"
                disabled={!replyContent.trim() || isSending}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isSending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                {isSending ? 'Sending...' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Status message for closed/archived threads */}
      {thread.status !== 'active' && (
        <div className="bg-yellow-50 border-t border-yellow-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-center text-sm text-yellow-800">
              <AlertCircle className="w-4 h-4 mr-2" />
              This thread is {thread.status}. New messages cannot be sent.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageThreadView;
