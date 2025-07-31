import React, { useState, useEffect } from 'react';
import { 
  MessageCircle, 
  Plus, 
  Search, 
  Filter, 
  Star, 
  Clock, 
  Users,
  AlertCircle,
  CheckCircle,
  Archive
} from 'lucide-react';
import MessageThreadCard from './MessageThreadCard';
import ComposeMessageModal from './ComposeMessageModal';
import { useAuth } from '../../../context/AuthContext';

const MessageInbox = () => {
  const { user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    status: [],
    priority: [],
    unreadOnly: false,
    pinnedOnly: false
  });
  const [statistics, setStatistics] = useState(null);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 20,
    totalPages: 0,
    totalCount: 0
  });

  // Fetch threads
  const fetchThreads = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        per_page: pagination.perPage.toString()
      });
      
      if (searchTerm) params.append('search_query', searchTerm);
      if (selectedFilters.unreadOnly) params.append('unread_only', 'true');
      if (selectedFilters.pinnedOnly) params.append('pinned_only', 'true');
      
      selectedFilters.status.forEach(status => params.append('status', status));
      selectedFilters.priority.forEach(priority => params.append('priority', priority));

      const response = await fetch(`/api/v1/admin/messages/?${params}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setThreads(data.data.threads);
          setPagination(prev => ({
            ...prev,
            totalPages: data.data.pagination.total_pages,
            totalCount: data.data.pagination.total_count
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching threads:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStatistics = async () => {
    try {
      const response = await fetch('/api/v1/admin/messages/statistics', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStatistics(data.data.statistics);
        }
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  useEffect(() => {
    fetchThreads();
    fetchStatistics();
  }, [pagination.page, selectedFilters, searchTerm]);

  // Handle search
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setSelectedFilters(prev => {
      const newFilters = { ...prev };
      
      if (filterType === 'unreadOnly' || filterType === 'pinnedOnly') {
        newFilters[filterType] = value;
      } else {
        if (newFilters[filterType].includes(value)) {
          newFilters[filterType] = newFilters[filterType].filter(item => item !== value);
        } else {
          newFilters[filterType] = [...newFilters[filterType], value];
        }
      }
      
      return newFilters;
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle thread actions
  const handleThreadUpdate = () => {
    fetchThreads();
    fetchStatistics();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'archived': return <Archive className="w-4 h-4 text-gray-500" />;
      case 'closed': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'normal': return 'text-blue-600 bg-blue-50';
      case 'low': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <MessageCircle className="w-6 h-6 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Admin Messages</h1>
            </div>
            <button
              onClick={() => setShowComposeModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Message
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar with filters and stats */}
          <div className="w-80 flex-shrink-0">
            {/* Statistics */}
            {statistics && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Message Overview</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Threads</span>
                    <span className="font-medium">{statistics.total_threads}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active Threads</span>
                    <span className="font-medium text-green-600">{statistics.active_threads}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Unread Messages</span>
                    <span className="font-medium text-red-600">{statistics.unread_messages}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">This Week</span>
                    <span className="font-medium">{statistics.messages_last_7_days}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
              
              {/* Quick filters */}
              <div className="space-y-3 mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedFilters.unreadOnly}
                    onChange={(e) => handleFilterChange('unreadOnly', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Unread only</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedFilters.pinnedOnly}
                    onChange={(e) => handleFilterChange('pinnedOnly', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Pinned only</span>
                </label>
              </div>

              {/* Status filters */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Status</h4>
                <div className="space-y-2">
                  {['active', 'archived', 'closed'].map(status => (
                    <label key={status} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedFilters.status.includes(status)}
                        onChange={() => handleFilterChange('status', status)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize flex items-center">
                        {getStatusIcon(status)}
                        <span className="ml-1">{status}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Priority filters */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Priority</h4>
                <div className="space-y-2">
                  {['urgent', 'high', 'normal', 'low'].map(priority => (
                    <label key={priority} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedFilters.priority.includes(priority)}
                        onChange={() => handleFilterChange('priority', priority)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`ml-2 text-sm capitalize px-2 py-1 rounded-full ${getPriorityColor(priority)}`}>
                        {priority}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1">
            {/* Search bar */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchTerm}
                  onChange={handleSearch}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Thread list */}
            <div className="space-y-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : threads.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                  <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No messages found</h3>
                  <p className="text-gray-600">Start a conversation with your admin colleagues.</p>
                </div>
              ) : (
                threads.map(thread => (
                  <MessageThreadCard
                    key={thread.thread_id}
                    thread={thread}
                    onUpdate={handleThreadUpdate}
                  />
                ))
              )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-6 flex justify-center">
                <nav className="flex items-center space-x-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={pagination.page === 1}
                    className="px-3 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-md disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-2 text-sm text-gray-600">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-3 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-md disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compose Message Modal */}
      {showComposeModal && (
        <ComposeMessageModal
          onClose={() => setShowComposeModal(false)}
          onSuccess={handleThreadUpdate}
        />
      )}
    </div>
  );
};

export default MessageInbox;
