import React from 'react';
import { 
  MessageCircle, 
  Users, 
  Clock, 
  Star, 
  Pin, 
  AlertCircle,
  CheckCircle,
  Archive
} from 'lucide-react';
import { Link } from 'react-router-dom';

const MessageThreadCard = ({ thread, onUpdate }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-500 bg-red-50';
      case 'high': return 'border-l-orange-500 bg-orange-50';
      case 'normal': return 'border-l-blue-500 bg-blue-50';
      case 'low': return 'border-l-gray-500 bg-gray-50';
      default: return 'border-l-gray-500 bg-white';
    }
  };

  const getPriorityBadgeColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-red-700 bg-red-100';
      case 'high': return 'text-orange-700 bg-orange-100';
      case 'normal': return 'text-blue-700 bg-blue-100';
      case 'low': return 'text-gray-700 bg-gray-100';
      default: return 'text-gray-700 bg-gray-100';
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

  const isUnread = thread.unread_count > 0;
  const participantNames = Object.values(thread.participant_names).slice(0, 3);
  const extraParticipants = Math.max(0, thread.participants.length - 3);

  return (
    <Link 
      to={`/admin/messages/thread/${thread.thread_id}`}
      className="block"
    >
      <div className={`
        bg-white rounded-lg shadow-sm border-l-4 p-6 hover:shadow-md transition-shadow cursor-pointer
        ${getPriorityColor(thread.priority)}
        ${isUnread ? 'ring-2 ring-blue-200' : ''}
      `}>
        <div className="flex items-start justify-between">
          {/* Left side - Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              {/* Subject */}
              <h3 className={`text-lg font-medium truncate ${isUnread ? 'text-gray-900 font-semibold' : 'text-gray-800'}`}>
                {thread.subject}
              </h3>
              
              {/* Badges */}
              <div className="flex items-center space-x-2">
                {thread.is_pinned && (
                  <Pin className="w-4 h-4 text-yellow-500" />
                )}
                
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${getPriorityBadgeColor(thread.priority)}`}>
                  {thread.priority}
                </span>
                
                {getStatusIcon(thread.status)}
              </div>
            </div>

            {/* Participants */}
            <div className="flex items-center space-x-2 mb-3">
              <Users className="w-4 h-4 text-gray-400" />
              <div className="flex items-center space-x-1 text-sm text-gray-600">
                <span>
                  {participantNames.join(', ')}
                  {extraParticipants > 0 && ` +${extraParticipants} more`}
                </span>
              </div>
            </div>

            {/* Last message preview */}
            <div className="mb-3">
              <p className={`text-sm ${isUnread ? 'text-gray-900 font-medium' : 'text-gray-600'} line-clamp-2`}>
                {thread.last_message_sender && (
                  <span className="font-medium text-gray-700">
                    {thread.participant_names[thread.last_message_sender]}:{' '}
                  </span>
                )}
                {thread.last_message_preview}
              </p>
            </div>

            {/* Context information */}
            {thread.context && thread.context.category && (
              <div className="mb-3">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                  {thread.context.category}
                  {thread.context.venue_id && ' • Venue'}
                  {thread.context.event_id && ' • Event'}
                  {thread.context.booking_id && ' • Booking'}
                  {thread.context.maintenance_id && ' • Maintenance'}
                </span>
              </div>
            )}

            {/* Tags */}
            {thread.tags && thread.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {thread.tags.slice(0, 3).map((tag, index) => (
                  <span 
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                  >
                    {tag}
                  </span>
                ))}
                {thread.tags.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{thread.tags.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right side - Meta information */}
          <div className="flex flex-col items-end ml-4 space-y-2">
            {/* Timestamp */}
            <div className="flex items-center text-sm text-gray-500">
              <Clock className="w-4 h-4 mr-1" />
              <span>{formatDate(thread.last_message_at || thread.created_at)}</span>
            </div>

            {/* Message count */}
            <div className="text-sm text-gray-500">
              <span>{thread.total_messages} message{thread.total_messages !== 1 ? 's' : ''}</span>
            </div>

            {/* Unread indicator */}
            {isUnread && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span className="text-sm font-medium text-blue-600">
                  {thread.unread_count} unread
                </span>
              </div>
            )}

            {/* Thread status indicator */}
            <div className="text-xs text-gray-400 capitalize">
              {thread.status}
            </div>
          </div>
        </div>

        {/* Bottom row - Additional info */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <span>Created {formatDate(thread.created_at)}</span>
            {thread.context && thread.context.category && (
              <span>• {thread.context.category} related</span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {thread.priority !== 'normal' && (
              <span className={`font-medium ${
                thread.priority === 'urgent' ? 'text-red-600' :
                thread.priority === 'high' ? 'text-orange-600' :
                'text-gray-600'
              }`}>
                {thread.priority.toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default MessageThreadCard;
