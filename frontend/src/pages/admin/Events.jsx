import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../api/admin';
import AdminLayout from '../../components/admin/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';

function Events() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentFilter, setCurrentFilter] = useState('all');

  useEffect(() => {
    fetchEvents();
  }, [currentFilter]);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const response = await adminAPI.getEvents({ status: currentFilter });
      
      if (response.data.success) {
        const eventsData = response.data.events || [];
        setEvents(eventsData);
        setError('');
      } else {
        throw new Error(response.data.message || 'Failed to fetch events');
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      setError('Failed to load events');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusCounts = () => {
    const counts = {
      ongoing: events.filter(event => event.status === 'ongoing').length,
      upcoming: events.filter(event => event.status === 'upcoming').length,
      completed: events.filter(event => event.status === 'completed').length,
      cancelled: events.filter(event => event.status === 'cancelled').length
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

  const statusCounts = getStatusCounts();
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
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  Showing <span className="font-semibold text-gray-900">{events.length}</span> events
                </span>
                <div className="flex items-center space-x-6">
                  {statusCounts.ongoing > 0 && (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-green-600 font-medium">{statusCounts.ongoing} Live</span>
                    </div>
                  )}
                  {statusCounts.upcoming > 0 && (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-blue-600 font-medium">{statusCounts.upcoming} Upcoming</span>
                    </div>
                  )}
                  {statusCounts.completed > 0 && (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                      <span className="text-gray-600 font-medium">{statusCounts.completed} Completed</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-2">
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
            <button
              onClick={() => setCurrentFilter('ongoing')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                currentFilter === 'ongoing' 
                  ? 'bg-green-600 text-white shadow-md' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <i className={`fas fa-circle ${currentFilter === 'ongoing' ? 'text-white animate-pulse' : 'text-green-500'} mr-1`}></i> 
              Live / Ongoing
            </button>
            <button
              onClick={() => setCurrentFilter('upcoming')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                currentFilter === 'upcoming' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <i className="fas fa-clock mr-1"></i> Upcoming
            </button>
            <button
              onClick={() => setCurrentFilter('completed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                currentFilter === 'completed' 
                  ? 'bg-gray-600 text-white shadow-md' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <i className="fas fa-check-circle mr-1"></i> Completed
            </button>
          </div>
        </div>

        {/* Enhanced Event Cards Grid */}
        {events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const statusConfig = {
                ongoing: { bgClass: 'bg-green-50', textClass: 'text-green-700', dotClass: 'bg-green-500 animate-pulse', label: 'LIVE NOW' },
                upcoming: { bgClass: 'bg-blue-50', textClass: 'text-blue-700', dotClass: 'bg-blue-500', label: 'UPCOMING' },
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
                      
                    
                    {/* Action Button with consistent positioning */}
                    <div className="mt-auto">
                      <button
                        onClick={() => handleViewEvent(event.event_id)}
                        className="block w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-center py-2.5 px-4 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-sm text-sm"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : error ? (
          /* Enhanced Error State */
          <div className="text-center py-16 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
            <div className="w-20 h-20 bg-red-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-exclamation-triangle text-2xl text-red-600"></i>
            </div>
            <h3 className="text-xl font-bold text-red-700 mb-3">Error Loading Events</h3>
            <p className="text-red-600 mb-6 max-w-md mx-auto">{error}</p>
            <button
              onClick={fetchEvents}
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
            {user && user.role === 'organizer_admin' ? (
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
                  <button
                    onClick={handleCreateEvent}
                    className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    <i className="fas fa-plus mr-2"></i>Create First Event
                  </button>
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
