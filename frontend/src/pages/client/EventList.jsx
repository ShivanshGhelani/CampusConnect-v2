import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { clientAPI } from '../../api/axios';
import ClientLayout from '../../components/client/Layout';
import EventCard from '../../components/client/EventCard';
import LoadingSpinner from '../../components/LoadingSpinner';

function EventList() {
  const [searchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [backgroundImage, setBackgroundImage] = useState('');
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('filter') || 'all');
  
  // Event type counts for filter buttons
  const [eventTypeCounts, setEventTypeCounts] = useState({});

  // College event background images
  const eventBackgrounds = [
    'https://images.unsplash.com/photo-1523580494863-6f3031224c94?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80', // College fest
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80', // University corridor
    'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80', // University building
    'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80', // Graduation ceremony
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80', // Students working together
    'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80', // Students studying
  ];

  useEffect(() => {
    fetchEvents();
    // Set a random background image
    const randomImage = eventBackgrounds[Math.floor(Math.random() * eventBackgrounds.length)];
    setBackgroundImage(randomImage);
  }, [statusFilter]);

  useEffect(() => {
    applyFilters();
    calculateEventTypeCounts();
  }, [events, searchTerm, selectedCategory]);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await clientAPI.getEvents();
      
      if (response.data.success) {
        let fetchedEvents = response.data.events || [];
        
        // Filter by status if specified
        if (statusFilter !== 'all') {
          fetchedEvents = fetchedEvents.filter(event => event.status === statusFilter);
        }
        
        setEvents(fetchedEvents);
      } else {
        setError('Failed to load events');
      }
    } catch (error) {
      console.error('Events fetch error:', error);
      setError('Failed to load events. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...events];

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(event => 
        event.event_name?.toLowerCase().includes(search) ||
        event.description?.toLowerCase().includes(search) ||
        event.organizing_department?.toLowerCase().includes(search) ||
        event.event_type?.toLowerCase().includes(search)
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(event => 
        event.event_type?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    setFilteredEvents(filtered);
  };

  const calculateEventTypeCounts = () => {
    const counts = {};
    events.forEach(event => {
      const type = event.event_type || 'Other';
      counts[type] = (counts[type] || 0) + 1;
    });
    setEventTypeCounts(counts);
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
  };

  const getPageTitle = () => {
    if (statusFilter === 'upcoming') return 'Upcoming Events';
    if (statusFilter === 'ongoing') return 'Live Events';
    return 'Campus Events';
  };

  const getPageSubtitle = () => {
    if (statusFilter === 'upcoming') return 'Events you can register for';
    if (statusFilter === 'ongoing') return 'Events happening right now';
    return 'Find events that interest you';
  };

  const getEventStatusCounts = () => {
    const ongoing = events.filter(e => e.status === 'ongoing').length;
    const upcoming = events.filter(e => e.status === 'upcoming').length;
    return { ongoing, upcoming };
  };

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-gradient-to-br from-teal-50 to-sky-100 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </ClientLayout>
    );
  }

  const statusCounts = getEventStatusCounts();  return (
    <ClientLayout>
      <div className="min-h-screen relative overflow-x-hidden">
        {/* Subtle Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
            filter: 'brightness(0.95) contrast(0.8) opacity(0.15)'
          }}
        ></div>
        
        {/* Background Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal-50/90 to-sky-100/90"></div>
        
        {/* Content Layer */}
        <div className="relative z-10">
          {/* Simple Header */}
          <div className="bg-gradient-to-r from-teal-50/80 to-sky-50/80 border-b border-teal-200/50 backdrop-blur-sm">
            <div className="max-w-6xl mx-auto px-4 py-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {getPageTitle()}
              </h1>
              <p className="text-gray-600">
                {getPageSubtitle()}
              </p>
            </div>
          </div>

          {/* Enhanced Search Section */}
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="bg-gradient-to-br from-white/80 to-sky-50/80 rounded-xl shadow-lg border border-teal-200/50 p-6 mb-8 backdrop-blur-sm">
              <div className="flex flex-col lg:flex-row gap-6">
              {/* Search Bar */}
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Events</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="fas fa-search text-teal-400"></i>
                  </div>
                  <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by event name, department, or keywords..." 
                    className="w-full pl-10 pr-4 py-3 border border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all bg-white"
                  />
                </div>
              </div>

              {/* Category Filters */}
              <div className="lg:w-auto">
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Category</label>
                <div className="flex flex-wrap gap-2 max-w-full overflow-hidden">
                  <button 
                    className={`category-filter px-4 py-2 text-sm rounded-lg font-medium transition-all shadow-md whitespace-nowrap ${
                      selectedCategory === 'all' 
                        ? 'bg-gradient-to-r from-teal-500 to-sky-600 text-white' 
                        : 'bg-white text-teal-600 hover:bg-teal-50 border border-teal-300'
                    }`}
                    onClick={() => handleCategoryChange('all')}
                  >
                    All Categories ({events.length})
                  </button>
                  {Object.entries(eventTypeCounts).map(([type, count]) => (
                    <button 
                      key={type}
                      className={`category-filter px-4 py-2 text-sm rounded-lg font-medium transition-all whitespace-nowrap ${
                        selectedCategory === type.toLowerCase() 
                          ? 'bg-gradient-to-r from-teal-500 to-sky-600 text-white' 
                          : 'bg-white text-teal-600 hover:bg-teal-50 border border-teal-300'
                      }`}
                      onClick={() => handleCategoryChange(type.toLowerCase())}
                    >
                      {type} ({count})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            {events.length > 0 && (
              <div className="mt-6 pt-6 border-t border-teal-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    Showing <span className="font-semibold text-gray-900">{filteredEvents.length}</span> events
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
                        <div className="w-2 h-2 bg-sky-500 rounded-full"></div>
                        <span className="text-sky-600 font-medium">{statusCounts.upcoming} Upcoming</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <i className="fas fa-exclamation-triangle text-red-500 mr-3"></i>
                <span className="text-red-700">{error}</span>
                <button 
                  onClick={fetchEvents}
                  className="ml-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Events Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="eventsGrid">
            {filteredEvents.map((event) => (
              <EventCard key={event.event_id} event={event} />
            ))}
          </div>

          {/* No Events State */}
          {!isLoading && filteredEvents.length === 0 && (
            <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
              <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-calendar-times text-2xl text-gray-400"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-700 mb-3">
                {events.length === 0 ? 'No Events Found' : 'No Events Match Your Search'}
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                {events.length === 0 
                  ? statusFilter === 'upcoming'
                    ? 'No upcoming events are scheduled at the moment. Check back soon for new events!'
                    : statusFilter === 'ongoing'
                    ? 'No events are currently live. Browse upcoming events to see what\'s coming next.'
                    : 'No events are available right now. Check back later for new events!'
                  : 'No events match your current search. Try adjusting your filters or search terms.'
                }
              </p>
              <div className="space-x-3">
                {events.length === 0 ? (
                  <Link
                    to="/client/events?filter=all"
                    className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    <i className="fas fa-calendar mr-2"></i>Browse All Events
                  </Link>
                ) : (
                  <button
                    onClick={clearFilters}
                    className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    <i className="fas fa-refresh mr-2"></i>Clear Filters
                  </button>
                )}
                {statusFilter !== 'upcoming' && (
                  <Link
                    to="/client/events?filter=upcoming"
                    className="inline-block px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold"
                  >
                    <i className="fas fa-clock mr-2"></i>View Upcoming
                  </Link>
                )}              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </ClientLayout>
  );
}

export default EventList;
