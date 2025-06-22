import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { clientAPI } from '../../api/axios';
import ClientLayout from '../../components/client/Layout';
import EventCard from '../../components/client/EventCard';
import LoadingSpinner from '../../components/LoadingSpinner';

// Enhanced cache for events data with localStorage support
const eventsCache = {
  key: 'campusconnect_events',
  timestampKey: 'campusconnect_events_timestamp',
  data: null,
  timestamp: null,
  duration: 5 * 60 * 1000, // 5 minutes
  
  isValid: function() {
    // Check memory cache first
    if (this.data && this.timestamp && (Date.now() - this.timestamp) < this.duration) {
      return true;
    }
    
    // Check localStorage cache
    try {
      const storedTimestamp = localStorage.getItem(this.timestampKey);
      if (storedTimestamp) {
        const timestamp = parseInt(storedTimestamp);
        return (Date.now() - timestamp) < this.duration;
      }
    } catch (error) {
      console.warn('localStorage access failed:', error);
    }
    
    return false;
  },
  
  set: function(data) {
    this.data = data;
    this.timestamp = Date.now();
    
    // Also store in localStorage for persistence
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
      localStorage.setItem(this.timestampKey, this.timestamp.toString());
    } catch (error) {
      console.warn('Failed to cache in localStorage:', error);
    }
  },
  
  get: function() {
    // Return memory cache if valid
    if (this.data && this.timestamp && (Date.now() - this.timestamp) < this.duration) {
      return this.data;
    }
    
    // Try localStorage cache
    if (this.isValid()) {
      try {
        const stored = localStorage.getItem(this.key);
        const storedTimestamp = localStorage.getItem(this.timestampKey);
        if (stored && storedTimestamp) {
          const data = JSON.parse(stored);
          // Update memory cache
          this.data = data;
          this.timestamp = parseInt(storedTimestamp);
          return data;
        }
      } catch (error) {
        console.warn('Failed to retrieve from localStorage:', error);
      }
    }
    
    return null;
  },
  
  clear: function() {
    this.data = null;
    this.timestamp = null;
    try {
      localStorage.removeItem(this.key);
      localStorage.removeItem(this.timestampKey);
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  },
  
  getAge: function() {
    const timestamp = this.timestamp || (localStorage.getItem(this.timestampKey) ? parseInt(localStorage.getItem(this.timestampKey)) : null);
    if (timestamp) {
      return Math.floor((Date.now() - timestamp) / 1000);
    }
    return null;
  }
};

function EventList() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [allEvents, setAllEvents] = useState([]); // Store all events
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [backgroundImage, setBackgroundImage] = useState('');
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Event type counts for filter buttons
  const [eventTypeCounts, setEventTypeCounts] = useState({});
    // Ref to prevent multiple simultaneous API calls
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);

  // Update statusFilter when URL parameters change (debounced)
  useEffect(() => {
    const filterParam = searchParams.get('filter') || 'all';
    setStatusFilter(filterParam);
    // Clear search and category filters when switching event status to avoid confusion
    setSearchTerm('');
    setSelectedCategory('all');
  }, [searchParams.get('filter')]);

  // College event background images
  const eventBackgrounds = [
    'https://images.unsplash.com/photo-1523580494863-6f3031224c94?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80', // College fest
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80', // University corridor
    'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80', // University building
    'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80', // Graduation ceremony
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80', // Students working together
    'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80', // Students studying
  ];  // Fetch events only once and cache them
  useEffect(() => {
    console.log('EventList mounted, initializing...');
    mountedRef.current = true;
    
    // Set a random background image only once
    const randomImage = eventBackgrounds[Math.floor(Math.random() * eventBackgrounds.length)];
    setBackgroundImage(randomImage);
    
    // Always fetch events on mount (cache will handle duplicates)
    fetchEventsOnce();
    
    // Cleanup function
    return () => {
      console.log('EventList unmounting...');
      mountedRef.current = false;
    };
  }, []); // Only run once on mount
  // Filter events when filter criteria change
  useEffect(() => {
    if (allEvents.length > 0) {
      applyFilters();
      calculateEventTypeCounts();
    } else {
      // Even with no events, we should apply filters to clear the display
      applyFilters();
      calculateEventTypeCounts();
    }
  }, [allEvents, searchTerm, selectedCategory, statusFilter]);const fetchEventsOnce = async () => {
    // Prevent multiple simultaneous calls
    if (fetchingRef.current) {
      console.log('Fetch already in progress, skipping...');
      return;
    }
    
    // Check if component is still mounted
    if (!mountedRef.current) {
      console.log('Component unmounted, skipping fetch...');
      return;
    }
    
    // Check cache first
    const cachedEvents = eventsCache.get();
    if (cachedEvents) {
      console.log('Using cached events data:', cachedEvents.length, 'events');
      if (mountedRef.current) {
        setAllEvents(cachedEvents);
        setIsLoading(false);
        setError('');
      }
      return;
    }

    try {
      fetchingRef.current = true;
      console.log('Fetching fresh events from API...');
      // Only set loading if we don't have any events yet
      if (mountedRef.current && allEvents.length === 0) {
        setIsLoading(true);
        setError('');
      }
      
      const response = await clientAPI.getEvents();
      
      // Check if component is still mounted before processing response
      if (!mountedRef.current) {
        console.log('Component unmounted during API call, aborting...');
        return;
      }

      if (response.data && response.data.success) {
        const fetchedEvents = response.data.events || [];
        console.log('Successfully fetched events from API:', fetchedEvents.length, 'events');
        
        // Cache the events (both memory and localStorage)
        eventsCache.set(fetchedEvents);
        
        // Update state only if component is still mounted
        if (mountedRef.current) {
          setAllEvents(fetchedEvents);
          setError('');
        }
        
      } else {
        console.error('API response indicates failure:', response.data);
        if (mountedRef.current) {
          setError('Failed to load events - API returned unsuccessful response');
        }
      }
    } catch (error) {
      console.error('API call failed with error:', error);
      if (mountedRef.current) {
        setError(`Failed to load events: ${error.message}`);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
      fetchingRef.current = false;
    }
  };  // Regular filtering function (not wrapped in useMemo)
  const applyFilters = () => {
    let filtered = [...allEvents];

    // Apply status filter first (most selective)
    if (statusFilter !== 'all') {
      filtered = filtered.filter(event => event.status === statusFilter);
    }

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

  // Regular event type counts calculation (not wrapped in useMemo)
  const calculateEventTypeCounts = () => {
    const counts = {};
    // Only count events that match the current status filter
    const eventsToCount = statusFilter === 'all' 
      ? allEvents 
      : allEvents.filter(event => event.status === statusFilter);
      
    eventsToCount.forEach(event => {
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
  };  const getEventStatusCounts = () => {
    const filtered = statusFilter === 'all' ? allEvents : allEvents.filter(e => e.status === statusFilter);
    const ongoing = filtered.filter(e => e.status === 'ongoing').length;
    const upcoming = filtered.filter(e => e.status === 'upcoming').length;
    return { ongoing, upcoming };
  };  // Refresh function for manual refresh
  const handleRefresh = () => {
    console.log('Manual refresh triggered');
    eventsCache.clear();
    fetchingRef.current = false; // Reset the flag
    setError(''); // Clear any existing errors
    if (mountedRef.current) {
      fetchEventsOnce();
    }
  };

  // Add a timeout for loading state
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        if (isLoading && mountedRef.current) {
          console.warn('Loading timeout reached, forcing loading to false');
          setIsLoading(false);
          setError('Request timed out. Please try refreshing.');
        }
      }, 15000); // 15 second timeout

      return () => clearTimeout(timeout);
    }
  }, [isLoading]);
  if (isLoading) {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-gradient-to-br from-teal-50 to-sky-100 flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <div className="mt-4 text-gray-600">
              <p>Loading events...</p>              <p className="text-sm mt-2">
                Cache: {eventsCache.isValid() ? `🟢 Valid (${eventsCache.getAge()}s old)` : '🔴 Invalid'} | 
                Fetching: {fetchingRef.current ? '🔄 Yes' : '✅ No'} |
                Events: {allEvents.length}
              </p>
              {error && (
                <p className="text-red-500 text-sm mt-2">Error: {error}</p>
              )}
            </div>
          </div>
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
                    All Categories ({statusFilter === 'all' ? allEvents.length : allEvents.filter(e => e.status === statusFilter).length})
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
            </div>            {/* Quick Stats */}
            {allEvents.length > 0 && (
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
                    {/* Cache status and refresh button */}
                    <div className="flex items-center space-x-2">                      <span className="text-xs text-gray-400">
                        {eventsCache.isValid() ? `🟢 Cached (${eventsCache.getAge()}s)` : '🔴 Fresh'}
                      </span>
                      <button
                        onClick={handleRefresh}
                        className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                        title="Refresh events"
                      >
                        <i className="fas fa-sync-alt"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>          {/* Error State */}
          {error && (
            <div className="max-w-6xl mx-auto px-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <i className="fas fa-exclamation-triangle text-red-500 mr-3"></i>
                  <span className="text-red-700">{error}</span>
                  <button 
                    onClick={handleRefresh}
                    className="ml-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Events Grid */}
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="eventsGrid">
              {filteredEvents.map((event) => (
                <EventCard key={event.event_id} event={event} />
              ))}
            </div>
          </div>          {/* No Events State */}
          {!isLoading && filteredEvents.length === 0 && (
            <div className="max-w-6xl mx-auto px-4">
              <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
                <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-calendar-times text-2xl text-gray-400"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-700 mb-3">
                  {allEvents.length === 0 ? 'No Events Found' : 'No Events Match Your Search'}
                </h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  {allEvents.length === 0 
                    ? statusFilter === 'upcoming'
                      ? 'No upcoming events are scheduled at the moment. Check back soon for new events!'
                      : statusFilter === 'ongoing'
                      ? 'No events are currently live. Browse upcoming events to see what\'s coming next.'
                      : 'No events are available right now. Check back later for new events!'
                    : 'No events match your current search. Try adjusting your filters or search terms.'
                  }
                </p>
                <div className="space-x-3">
                  {allEvents.length === 0 ? (
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
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </ClientLayout>
  );
}

export default EventList;
