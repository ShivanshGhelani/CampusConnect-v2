import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../api/admin';
import { organizerAPI } from '../../api/organizer';
import AdminLayout from '../../components/admin/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/ui/Pagination';
import { useAuth } from '../../context/AuthContext';

function Events() {
  const navigate = useNavigate();
  const { user, transitionToOrganizerAdmin } = useAuth();
  const [events, setEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]); // Store all events for client-side filtering
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentFilter, setCurrentFilter] = useState('all');
  const [audienceFilter, setAudienceFilter] = useState('all');
  const [lastFetchTime, setLastFetchTime] = useState(0);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [isChangingPage, setIsChangingPage] = useState(false);
  const eventsPerPage = 9;

  // Cache configuration
  const CACHE_DURATION = 30000; // 30 seconds
  const CACHE_KEY = `admin_events_${user?.username || 'anonymous'}`;

  // Session refresh function for organizer admins missing employee_id
  const refreshOrganizerSession = useCallback(async () => {
    if (user?.role === 'organizer_admin' && !user?.employee_id) {
      try {
        const response = await organizerAPI.accessOrganizerPortal();
        if (response.data.success) {
          await transitionToOrganizerAdmin(response.data);
          return true;
        }
      } catch (error) {
        console.error('Failed to refresh organizer session:', error);
      }
    }
    return false;
  }, [user?.role, user?.employee_id, transitionToOrganizerAdmin]);

  // REMOVED: Automatic refresh to prevent infinite loop
  // useEffect(() => {
  //   refreshOrganizerSession();
  // }, [refreshOrganizerSession]);

  // Memoized filtered events for client-side filtering
  const filteredEvents = useMemo(() => {
    let filtered = [...allEvents];

        // Apply status filter
        if (currentFilter !== 'all') {
          if (currentFilter === 'pending_approval') {
            // Special case: filter by event_approval_status for pending approval
            filtered = filtered.filter(event => event.event_approval_status === 'pending_approval');
          } else {
            // Normal case: filter by status
            filtered = filtered.filter(event => event.status === currentFilter);
          }
        }    // Apply audience filter
    if (audienceFilter !== 'all') {
      filtered = filtered.filter(event => event.target_audience === audienceFilter);
    }

    return filtered;
  }, [allEvents, currentFilter, audienceFilter]);

  // Pagination logic
  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * eventsPerPage;
    const endIndex = startIndex + eventsPerPage;
    return filteredEvents.slice(startIndex, endIndex);
  }, [filteredEvents, currentPage, eventsPerPage]);

  const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);

  // Update events state when paginated events change
  useEffect(() => {
    setIsChangingPage(true);
    const timer = setTimeout(() => {
      setEvents(paginatedEvents);
      setIsChangingPage(false);
    }, 100);
    return () => clearTimeout(timer);
  }, [paginatedEvents]);

  // Enhanced page change handler with smooth scroll
  const handlePageChange = (newPage) => {
    if (newPage === currentPage) return;
    
    setIsChangingPage(true);
    setCurrentPage(newPage);
    
    // Smooth scroll to events grid
    setTimeout(() => {
      const eventsGrid = document.querySelector('.grid');
      if (eventsGrid) {
        eventsGrid.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }
    }, 50);
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [currentFilter, audienceFilter]);

  // Keyboard navigation for pagination
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      if (e.key === 'ArrowLeft' && currentPage > 1) {
        e.preventDefault();
        handlePageChange(currentPage - 1);
      } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
        e.preventDefault();
        handlePageChange(currentPage + 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        handlePageChange(1);
      } else if (e.key === 'End') {
        e.preventDefault();
        handlePageChange(totalPages);
      }
    };

    if (totalPages > 1) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [currentPage, totalPages]);

  // Debounced fetch function to prevent excessive API calls
  const debouncedFetch = useCallback(
    debounce(() => {
      fetchEventsFromAPI();
    }, 300),
    []
  );

  // Check if we need to fetch fresh data
  const shouldFetchFreshData = useCallback(() => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime;
    return timeSinceLastFetch > CACHE_DURATION;
  }, [lastFetchTime]);

  // Load events from cache or API
  const loadEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');

      // Try to load from localStorage first
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData && !shouldFetchFreshData()) {
        try {
          const parsed = JSON.parse(cachedData);
          if (parsed.events && parsed.timestamp) {
            setAllEvents(parsed.events);
            setLastFetchTime(parsed.timestamp);
            setIsLoading(false);
            return;
          }
        } catch (parseError) {
          console.warn('Failed to parse cached events:', parseError);
          localStorage.removeItem(CACHE_KEY);
        }
      }

      // Fetch fresh data if cache is stale or missing
      await fetchEventsFromAPI();
    } catch (error) {
      console.error('Error loading events:', error);
      setError('Failed to load events');
      setIsLoading(false);
    }
  }, [CACHE_KEY, shouldFetchFreshData]);

  // Fetch events from API and cache the result
  const fetchEventsFromAPI = async () => {
    try {
      // Fetch ALL events by setting a high limit for client-side pagination
      const response = await adminAPI.getEvents({ 
        status: 'all', 
        target_audience: 'all',
        limit: 1000, // Request up to 1000 events
        page: 1
      });
      
      if (response.data.success) {
        const eventsData = response.data.events || [];
        setAllEvents(eventsData);
        setError('');
        
        // Cache the data in localStorage
        const cacheData = {
          events: eventsData,
          timestamp: Date.now()
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        setLastFetchTime(Date.now());
      } else {
        throw new Error(response.data.message || 'Failed to fetch events');
      }
    } catch (error) {
      console.error('Error fetching events from API:', error);
      setError('Failed to load events');
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh events (force fetch from API)
  const refreshEvents = useCallback(async () => {
    localStorage.removeItem(CACHE_KEY);
    setLastFetchTime(0);
    await loadEvents();
  }, [CACHE_KEY, loadEvents]);

  // Debounce utility function
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Initial load
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Reset filters if current selection results in no events
  useEffect(() => {
    if (events.length === 0 && !isLoading && !error && allEvents.length > 0) {
      // If current filter combination results in no events, check if we should reset
      if (currentFilter !== 'all' || audienceFilter !== 'all') {
        // Don't reset immediately, but could add a "No events found" message with reset option
      }
    }
  }, [events, isLoading, error, currentFilter, audienceFilter, allEvents.length]);

  const getStatusCounts = () => {
    // Calculate counts from ALL events, not filtered events
    const counts = {
      ongoing: allEvents.filter(event => event.status === 'ongoing').length,
      upcoming: allEvents.filter(event => event.status === 'upcoming').length,
      completed: allEvents.filter(event => event.status === 'completed').length,
      cancelled: allEvents.filter(event => event.status === 'cancelled').length,
      pending_approval: allEvents.filter(event => event.event_approval_status === 'pending_approval').length
    };
    return counts;
  };

  const getAudienceCounts = () => {
    // Calculate counts from ALL events, not filtered events
    const counts = {
      student: allEvents.filter(event => event.target_audience === 'student').length + allEvents.filter(event => event.target_audience === 'students').length || 0,
      faculty: allEvents.filter(event => event.target_audience === 'faculty').length || 0,
      both: allEvents.filter(event => event.target_audience === 'both').length || 0
    };
    return counts;
  };

const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
      dateOnly: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      weekday: date.toLocaleDateString('en-US', { weekday: 'long' }),
      timeOnly: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  }
  const duration = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const durationMs = endDate - startDate;
    const durationMinutes = Math.floor(durationMs / 60000);
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    return `${hours}h ${minutes}m`;
  };
  const handleViewEvent = (eventId) => {
    navigate(`/admin/events/${eventId}`);
  };

  const handleCreateEvent = () => {
    navigate('/admin/create-event');
  };

  const handleApproveEvent = async (eventId, eventName) => {
    if (!confirm(`Are you sure you want to approve "${eventName}"?`)) {
      return;
    }

    try {
      const response = await adminAPI.approveEvent(eventId);
      if (response.data.success) {
        alert(`Event "${eventName}" has been approved successfully!`);
        // Refresh the events list
        await refreshEvents();
      } else {
        alert(`Failed to approve event: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error approving event:', error);
      alert(`Error approving event: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleDeclineEvent = async (eventId, eventName) => {
    const reason = prompt(`Please provide a reason for declining "${eventName}":`);
    if (reason === null) {
      return; // User cancelled
    }
    if (reason.trim() === '') {
      alert('Please provide a reason for declining the event.');
      return;
    }

    try {
      const response = await adminAPI.declineEvent(eventId, { reason: reason.trim() });
      if (response.data.success) {
        alert(`Event "${eventName}" has been declined.`);
        // Refresh the events list
        await refreshEvents();
      } else {
        alert(`Failed to decline event: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error declining event:', error);
      alert(`Error declining event: ${error.response?.data?.detail || error.message}`);
    }
  };

  // Helper function to check if user can approve/decline events
  const canApproveDecline = (event) => {
    if (!user) return false;
    
    // Only pending approval events can be approved/declined
    if (event.event_approval_status !== 'pending_approval') {
      return false;
    }
    
    // Super Admin can approve/decline any pending event
    if (user.role === 'super_admin') {
      return true;
    }
    
    // Organizer Admin can approve/decline events assigned to them
    if (user.role === 'organizer_admin') {
      const facultyOrganizers = event.faculty_organizers || [];
      return user.employee_id && facultyOrganizers.includes(user.employee_id);
    }
    
    return false;
  };

  const statusCounts = getStatusCounts();
  const audienceCounts = getAudienceCounts();
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Events Management">
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Enhanced Header Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {user && user.role === 'organizer_admin' ? 'My Assigned Events' : 'Events Management'}
              </h1>
              <p className="text-gray-600">
                {user && user.role === 'organizer_admin' 
                  ? 'Manage the events assigned to you' 
                  : 'Manage and monitor all campus events'
                }
              </p>
              
            </div>
            {user && ['super_admin', 'executive_admin'].includes(user.role) && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleCreateEvent}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg inline-flex items-center font-semibold transition-all duration-200 transform hover:scale-105 shadow-md"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Create New Event
                </button>
              </div>
            )}
          </div>
          
          {/* Quick Stats */}
          {events.length > 0 && (
            <div className="mt-6 pt-6 border-t border-blue-200">
              <div className="flex items-center justify-between text-sm mb-3">
                <div className="flex items-center space-x-4">
                  <span className="text-gray-600">
                    Showing <span className="font-semibold text-gray-900">{(currentPage - 1) * eventsPerPage + 1}</span> to <span className="font-semibold text-gray-900">{Math.min(currentPage * eventsPerPage, filteredEvents.length)}</span> of <span className="font-semibold text-gray-900">{filteredEvents.length}</span> events
                    {filteredEvents.length < allEvents.length && (
                      <span className="text-gray-500 ml-1">({allEvents.length} total)</span>
                    )}
                  </span>
                  {/* Cache status indicator */}
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${shouldFetchFreshData() ? 'bg-orange-400' : 'bg-green-400'}`}></div>
                    <span className="text-xs text-gray-500">
                      {shouldFetchFreshData() ? 'Data may be stale' : 'Data fresh'}
                    </span>
                    <button
                      onClick={refreshEvents}
                      className="text-xs text-blue-600 hover:text-blue-800 ml-2"
                      title="Refresh data"
                    >
                      <i className="fas fa-refresh"></i>
                    </button>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  {events.filter(event => event.status === 'ongoing').length > 0 && (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-green-600 font-medium">{events.filter(event => event.status === 'ongoing').length} Live</span>
                    </div>
                  )}
                  {events.filter(event => event.status === 'upcoming').length > 0 && (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-blue-600 font-medium">{events.filter(event => event.status === 'upcoming').length} Upcoming</span>
                    </div>
                  )}
                  {events.filter(event => event.event_approval_status === 'pending_approval').length > 0 && (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-orange-600 font-medium">{events.filter(event => event.event_approval_status === 'pending_approval').length} Pending</span>
                    </div>
                  )}
                  {events.filter(event => event.status === 'completed').length > 0 && (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                      <span className="text-gray-600 font-medium">{events.filter(event => event.status === 'completed').length} Completed</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Audience Statistics - Only show if there are events with audience data */}
              {(events.filter(event => event.target_audience === 'student').length > 0 || 
                events.filter(event => event.target_audience === 'faculty').length > 0 || 
                events.filter(event => event.target_audience === 'both').length > 0) && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Audience Distribution (filtered):</span>
                  <div className="flex items-center space-x-6">
                    {events.filter(event => event.target_audience === 'student').length > 0 && (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        <span className="text-emerald-600 font-medium">{events.filter(event => event.target_audience === 'student').length} Student</span>
                      </div>
                    )}
                    {events.filter(event => event.target_audience === 'faculty').length > 0 && (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                        <span className="text-indigo-600 font-medium">{events.filter(event => event.target_audience === 'faculty').length} Faculty</span>
                      </div>
                    )}
                    {events.filter(event => event.target_audience === 'both').length > 0 && (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                        <span className="text-cyan-600 font-medium">{events.filter(event => event.target_audience === 'both').length} Both</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          {/* Status Filters */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-sm font-medium text-gray-700 mr-2">Filter by Status:</span>
            <button
              onClick={() => setCurrentFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                currentFilter === 'all' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <i className="fas fa-list mr-1"></i> All Events
            </button>
            {statusCounts.ongoing > 0 && (
              <button
                onClick={() => setCurrentFilter('ongoing')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  currentFilter === 'ongoing' 
                    ? 'bg-green-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <i className={`fas fa-circle ${currentFilter === 'ongoing' ? 'text-white animate-pulse' : 'text-green-500'} mr-1`}></i> 
                Live / Ongoing ({statusCounts.ongoing})
              </button>
            )}
            {statusCounts.upcoming > 0 && (
              <button
                onClick={() => setCurrentFilter('upcoming')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  currentFilter === 'upcoming' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <i className="fas fa-clock mr-1"></i> Upcoming ({statusCounts.upcoming})
              </button>
            )}
            {statusCounts.pending_approval > 0 && (
              <button
                onClick={() => setCurrentFilter('pending_approval')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  currentFilter === 'pending_approval' 
                    ? 'bg-orange-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <i className="fas fa-hourglass-half mr-1"></i> Pending Approval ({statusCounts.pending_approval})
              </button>
            )}
            {statusCounts.completed > 0 && (
              <button
                onClick={() => setCurrentFilter('completed')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  currentFilter === 'completed' 
                    ? 'bg-gray-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <i className="fas fa-check-circle mr-1"></i> Completed ({statusCounts.completed})
              </button>
            )}
            {statusCounts.cancelled > 0 && (
              <button
                onClick={() => setCurrentFilter('cancelled')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  currentFilter === 'cancelled' 
                    ? 'bg-red-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <i className="fas fa-ban mr-1"></i> Cancelled ({statusCounts.cancelled})
              </button>
            )}
          </div>
          
          {/* Audience Filters - Only show if there are events with audience data */}
          {(audienceCounts.student > 0 || audienceCounts.faculty > 0 || audienceCounts.both > 0) && (
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-200">
              <span className="text-sm font-medium text-gray-700 mr-2">Filter by Audience:</span>
              <button
                onClick={() => setAudienceFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  audienceFilter === 'all' 
                    ? 'bg-purple-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <i className="fas fa-users mr-1"></i> All Audiences
              </button>
              {audienceCounts.student > 0 && (
                <button
                  onClick={() => setAudienceFilter('student')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    audienceFilter === 'student' 
                      ? 'bg-emerald-600 text-white shadow-md' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <i className="fas fa-graduation-cap mr-1"></i> Student Events ({audienceCounts.student})
                </button>
              )}
              {audienceCounts.faculty > 0 && (
                <button
                  onClick={() => setAudienceFilter('faculty')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    audienceFilter === 'faculty' 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <i className="fas fa-chalkboard-teacher mr-1"></i> Faculty Events ({audienceCounts.faculty})
                </button>
              )}
              {audienceCounts.both > 0 && (
                <button
                  onClick={() => setAudienceFilter('both')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    audienceFilter === 'both' 
                      ? 'bg-cyan-600 text-white shadow-md' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <i className="fas fa-user-friends mr-1"></i> Both ({audienceCounts.both})
                </button>
              )}
            </div>
          )}
        </div>

        {/* Enhanced Event Cards Grid */}
        {events.length > 0 ? (
          <>
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity duration-200 ${isChangingPage ? 'opacity-50' : 'opacity-100'}`}>
              {isChangingPage && (
                <div className="col-span-full flex justify-center py-8">
                  <div className="flex items-center space-x-2 text-blue-600">
                    <i className="fas fa-spinner fa-spin"></i>
                    <span className="text-sm">Loading events...</span>
                  </div>
                </div>
              )}
              {!isChangingPage && events.map((event) => {
              const statusConfig = {
                ongoing: { bgClass: 'bg-green-50', textClass: 'text-green-700', dotClass: 'bg-green-500 animate-pulse', label: 'LIVE NOW' },
                upcoming: { bgClass: 'bg-blue-50', textClass: 'text-blue-700', dotClass: 'bg-blue-500', label: 'UPCOMING' },
                pending_approval: { bgClass: 'bg-orange-50', textClass: 'text-orange-700', dotClass: 'bg-orange-500', label: 'PENDING APPROVAL' },
                completed: { bgClass: 'bg-gray-50', textClass: 'text-gray-600', dotClass: 'bg-gray-400', label: 'COMPLETED' },
                cancelled: { bgClass: 'bg-red-50', textClass: 'text-red-600', dotClass: 'bg-red-500', label: 'CANCELLED' }
              };
              
              const config = statusConfig[event.status] || statusConfig.upcoming;
              
              return (
                <div key={event.event_id} className="event-card bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-200 flex flex-col h-full">
                  {/* Status Header */}
                  <div className={`px-4 py-3 ${config.bgClass}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 ${config.dotClass} rounded-full`}></div>
                        <span className={`${config.textClass} font-bold text-sm uppercase tracking-wide`}>
                          {config.label}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 font-medium bg-white px-2 py-1 rounded-full">
                          ID: {event.event_id}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Event Content */}
                  <div className="p-5 flex-grow flex flex-col">
                    <h3 className="font-bold text-xl text-gray-900 mb-2 leading-tight line-clamp-2">
                      {event.event_name}
                    </h3>
                    
                    <div className="mb-4 flex-grow">
                      {event.short_description ? (
                        <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
                          {event.short_description}
                        </p>
                      ) : (
                        <p className="text-gray-400 text-sm italic">No description available</p>
                      )}
                    </div>
                    
                    {/* Event Details with consistent height */}
                    <div className="space-y-2 mb-5 flex flex-col">
                      <div className="flex items-center text-sm">
                        <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center mr-2 flex-shrink-0">
                          <i className="fas fa-calendar text-gray-600 text-xs"></i>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-900 text-xs truncate">
                            {formatDate(event.start_datetime).dateOnly}
                          </div>
                          <div className="text-gray-500 text-xs">
                            {formatDate(event.start_datetime).weekday}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center text-sm">
                        <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center mr-2 flex-shrink-0">
                          <i className="fas fa-clock text-gray-600 text-xs"></i>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-900 text-xs">
                            {formatDate(event.start_datetime).timeOnly}
                          </div>
                          <div className="text-gray-500 text-xs">
                            Duration: {duration(event.start_datetime, event.end_datetime)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center text-sm">
                        <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center mr-2 flex-shrink-0">
                          <i className="fas fa-building text-gray-600 text-xs"></i>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-900 text-xs truncate">
                            {event.venue || 'Venue TBA'}
                          </div>
                          <div className="text-gray-500 text-xs truncate">
                            {event.organizing_department || 'Event Location'}
                          </div>
                        </div>
                      </div>
                    </div>
                      
                    
                    {/* Action Buttons with conditional rendering based on event status and user permissions */}
                    <div className="mt-auto">
                      {event.event_approval_status === 'pending_approval' && canApproveDecline(event) ? (
                        // Show approve/decline buttons for pending events that user can approve
                        <div className="space-y-2">
                          {/* View Details Button */}
                          <button
                            onClick={() => handleViewEvent(event.event_id)}
                            className="block w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-center py-2 px-4 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-sm text-sm"
                          >
                            View Details
                          </button>
                          
                          {/* Approve and Decline Buttons */}
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleApproveEvent(event.event_id, event.event_name)}
                              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-center py-2 px-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-sm text-xs"
                            >
                              <i className="fas fa-check mr-1"></i>
                              Approve
                            </button>
                            <button
                              onClick={() => handleDeclineEvent(event.event_id, event.event_name)}
                              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-center py-2 px-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-sm text-xs"
                            >
                              <i className="fas fa-times mr-1"></i>
                              Decline
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Show only view details for other events
                        <button
                          onClick={() => handleViewEvent(event.event_id)}
                          className="block w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-center py-2.5 px-4 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-sm text-sm"
                        >
                          View Details
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
            
            {/* Enhanced Pagination Component */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <div className="bg-white rounded-xl shadow-lg border border-blue-200/50 p-6 w-full max-w-4xl">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    pageSize={eventsPerPage}
                    totalItems={filteredEvents.length}
                    showInfo={true}
                    showFirstLast={totalPages > 7}
                    showPageSizeSelector={false}
                    size="md"
                    variant="default"
                    siblingCount={2}
                    boundaryCount={1}
                    className="w-full"
                    disabled={isChangingPage}
                    aria-label="Events pagination navigation"
                  />
                  
                  {/* Advanced pagination controls for large datasets */}
                  {totalPages > 10 && (
                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
                        <div className="flex items-center space-x-2">
                          <label htmlFor="adminPageJump" className="text-sm text-gray-600">
                            Go to page:
                          </label>
                          <input
                            id="adminPageJump"
                            type="number"
                            min="1"
                            max={totalPages}
                            placeholder={currentPage}
                            className="w-20 px-2 py-1 text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const page = parseInt(e.target.value);
                                if (page >= 1 && page <= totalPages) {
                                  handlePageChange(page);
                                  e.target.value = '';
                                }
                              }
                            }}
                          />
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="text-xs text-gray-500">
                            Showing {eventsPerPage} events per page
                          </div>
                          <button
                            onClick={() => handlePageChange(1)}
                            disabled={currentPage === 1}
                            className="text-xs px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-md disabled:text-gray-400 disabled:hover:bg-transparent transition-colors"
                          >
                            <i className="fas fa-fast-backward mr-1"></i>
                            First
                          </button>
                          <button
                            onClick={() => handlePageChange(totalPages)}
                            disabled={currentPage === totalPages}
                            className="text-xs px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-md disabled:text-gray-400 disabled:hover:bg-transparent transition-colors"
                          >
                            Last
                            <i className="fas fa-fast-forward ml-1"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Keyboard shortcuts hint */}
                  <div className="mt-3 pt-3 border-t border-blue-100">
                    <div className="text-xs text-gray-400 text-center">
                      <i className="fas fa-keyboard mr-1"></i>
                      Use arrow keys to navigate pages • Enter to jump to specific page
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : error ? (
          /* Enhanced Error State */
          <div className="text-center py-16 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
            <div className="w-20 h-20 bg-red-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-exclamation-triangle text-2xl text-red-600"></i>
            </div>
            <h3 className="text-xl font-bold text-red-700 mb-3">Error Loading Events</h3>
            <p className="text-red-600 mb-6 max-w-md mx-auto">{error}</p>
            <button
              onClick={refreshEvents}
              className="inline-block px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
            >
              <i className="fas fa-sync mr-2"></i>Try Again
            </button>
          </div>
        ) : (
          /* Enhanced Empty State */
          <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-calendar-times text-2xl text-gray-400"></i>
            </div>
            {(currentFilter !== 'all' || audienceFilter !== 'all') ? (
              /* No events found with current filters */
              <>
                <h3 className="text-xl font-bold text-gray-700 mb-3">No Events Match Your Filters</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  No events found for the selected filters. Try adjusting your filters or view all events.
                </p>
                <div className="space-x-3">
                  <button
                    onClick={() => {
                      setCurrentFilter('all');
                      setAudienceFilter('all');
                    }}
                    className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    <i className="fas fa-refresh mr-2"></i>Reset Filters
                  </button>
                  {user && ['super_admin', 'executive_admin'].includes(user.role) && (
                    <button
                      onClick={handleCreateEvent}
                      className="inline-block px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold"
                    >
                      <i className="fas fa-plus mr-2"></i>Create Event
                    </button>
                  )}
                </div>
              </>
            ) : user && user.role === 'organizer_admin' ? (
              <>
                <h3 className="text-xl font-bold text-gray-700 mb-3">No Events Organized Yet</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Ready to organize your first event? Create an event to get started with your organizer journey.
                </p>
                <div className="space-x-3">
                  <button
                    onClick={handleCreateEvent}
                    className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    <i className="fas fa-plus mr-2"></i>Create Event
                  </button>
                  <button
                    onClick={() => navigate('/faculty/profile')}
                    className="inline-block px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
                  >
                    <i className="fas fa-user mr-2"></i>Go to Profile
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-gray-700 mb-3">No Events Found</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  No events have been created yet. Start by creating your first event to get started.
                </p>
                <div className="space-x-3">
                  {user && ['super_admin', 'executive_admin'].includes(user.role) && (
                    <button
                      onClick={handleCreateEvent}
                      className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                    >
                      <i className="fas fa-plus mr-2"></i>Create First Event
                    </button>
                  )}
                  <button
                    onClick={() => navigate('/admin/dashboard')}
                    className="inline-block px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold"
                  >
                    <i className="fas fa-tachometer-alt mr-2"></i>Dashboard
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Enhanced Styling */}
      <style>{`
        .event-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .event-card:hover {
          transform: translateY(-2px);
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: .5;
          }
        }
        
        /* Gradient hover effects */
        .event-card .bg-gradient-to-r {
          background-size: 200% 200%;
          transition: all 0.3s ease;
        }
        
        .event-card:hover .bg-gradient-to-r {
          background-position: right center;
        }
        
        /* Enhanced button interactions */
        .event-card button:hover {
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }
      `}</style>
    </AdminLayout>
  );
}

export default Events;
