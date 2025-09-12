import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { clientAPI } from '../../api/client';
import EventCard from '../../components/client/EventCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import Dropdown from '../../components/ui/Dropdown';
import Pagination from '../../components/ui/Pagination';
import { useAuth } from '../../context/AuthContext';

// Enhanced cache for events data with localStorage support
const eventsCache = {
  key: 'campusconnect_events',
  timestampKey: 'campusconnect_events_timestamp',
  data: null,
  timestamp: null,
  duration: 5 * 60 * 1000, // 5 minutes

  isValid: function () {
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
      
    }

    return false;
  },

  set: function (data) {
    this.data = data;
    this.timestamp = Date.now();

    // Also store in localStorage for persistence
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
      localStorage.setItem(this.timestampKey, this.timestamp.toString());
    } catch (error) {
      
    }
  },

  get: function () {
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
        
      }
    }

    return null;
  },

  clear: function () {
    this.data = null;
    this.timestamp = null;
    try {
      localStorage.removeItem(this.key);
      localStorage.removeItem(this.timestampKey);
    } catch (error) {
      
    }
  },

  getAge: function () {
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
  const { user, userType, isAuthenticated } = useAuth(); // Get authentication state

  const [allEvents, setAllEvents] = useState([]); // Store all events
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [paginatedEvents, setPaginatedEvents] = useState([]); // Events for current page
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [isChangingPage, setIsChangingPage] = useState(false);
  const [eventsPerPage] = useState(9); // Fixed at 9 events per page
  const [totalPages, setTotalPages] = useState(0);

  // Event type counts for filter buttons
  const [eventTypeCounts, setEventTypeCounts] = useState({});
  const [categoryOptions, setCategoryOptions] = useState([]);

  // Calculate if we should show loading state - include user data loading for students
  const shouldShowLoading = isLoading || (isAuthenticated && userType === 'student' && (!user?.department || !user?.semester));

  // Calculate if we're waiting for user data (computed value, not state) 
  const isWaitingForUserData = isAuthenticated && userType === 'student' && (!user?.department || !user?.semester);

  // Ref to prevent multiple simultaneous API calls
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);

  // Update statusFilter when URL parameters change (debounced)
  useEffect(() => {
    const filterParam = searchParams.get('filter') || 'all';
    setStatusFilter(filterParam);
    // Clear search and category filters when switching event status to avoid confusion
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setSelectedCategory('all');
    // Reset to first page when filter changes
    setCurrentPage(1);
  }, [searchParams.get('filter')]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch events only once and cache them
  useEffect(() => {
    
    mountedRef.current = true;

    // Always fetch events on mount (cache will handle duplicates)
    fetchEventsOnce();

    // Cleanup function
    return () => {
      
      mountedRef.current = false;
    };
  }, []); // Only run once on mount
  // Filter events when filter criteria change OR user authentication changes
  useEffect(() => {
    console.log('🔄 Filter effect triggered:', {
      allEventsCount: allEvents.length,
      debouncedSearchTerm,
      selectedCategory,
      statusFilter,
      isAuthenticated,
      userType,
      userDepartment: user?.department,
      userSemester: user?.semester,
      userObject: user
    });

    if (allEvents.length > 0) {
      applyFilters();
      calculateEventTypeCounts();
    } else {
      // Even with no events, we should apply filters to clear the display
      applyFilters();
      calculateEventTypeCounts();
    }
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [allEvents, debouncedSearchTerm, selectedCategory, statusFilter, isAuthenticated, userType, user?.department, user?.semester, user]);

  // Enhanced pagination effect with loading state
  useEffect(() => {
    setIsChangingPage(true);
    const timer = setTimeout(() => {
      const startIndex = (currentPage - 1) * eventsPerPage;
      const endIndex = startIndex + eventsPerPage;
      const paginatedData = filteredEvents.slice(startIndex, endIndex);
      setPaginatedEvents(paginatedData);
      setTotalPages(Math.ceil(filteredEvents.length / eventsPerPage));
      setIsChangingPage(false);
    }, 100);
    return () => clearTimeout(timer);
  }, [filteredEvents, currentPage, eventsPerPage]);

  // Keyboard navigation for pagination
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowLeft' && currentPage > 1) {
        e.preventDefault();
        goToPage(currentPage - 1);
      } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
        e.preventDefault();
        goToPage(currentPage + 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        goToPage(1);
      } else if (e.key === 'End') {
        e.preventDefault();
        goToPage(totalPages);
      }
    };

    if (totalPages > 1) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [currentPage, totalPages]);

  // Helper function to filter events based on user role and profile
  const getUserFilteredEvents = (events) => {
    if (!isAuthenticated) {
      // Show all student events for non-authenticated users
      return events.filter(event =>
        event.target_audience === 'student' || event.target_audience === 'students'
      );
    } else if (userType === 'student') {
      // For students, we require BOTH department and semester for proper filtering
      // If either is missing, the loading state will handle the UI
      if (!user?.department || !user?.semester) {
        
        return []; // This won't be displayed due to loading state
      }

      
      // Show only events that match student's department AND semester
      return events.filter(event => {
        if (event.target_audience !== 'student' && event.target_audience !== 'students') {
          return false;
        }

        const eventDepartments = Array.isArray(event.student_department)
          ? event.student_department
          : (event.student_department ? [event.student_department] : []);

        const eventSemesters = Array.isArray(event.student_semester)
          ? event.student_semester
          : (event.student_semester ? [event.student_semester] : []);

        // Normalize user semester to match event semester format
        const userSemesterNormalized = user.semester.toString().toUpperCase().startsWith('SEM')
          ? user.semester.toUpperCase()
          : `SEM${user.semester}`;

        const departmentMatch = eventDepartments.includes(user.department);
        const semesterMatch = eventSemesters.includes(userSemesterNormalized) ||
          eventSemesters.includes(user.semester.toString());

        // Debug logging for each event
        console.log(`Filtering event ${event.event_id}:`, {
          eventDepartments,
          eventSemesters,
          userDepartment: user.department,
          userSemester: user.semester,
          userSemesterNormalized,
          departmentMatch,
          semesterMatch,
          finalMatch: departmentMatch && semesterMatch
        });

        return departmentMatch && semesterMatch;
      });
    } else if (userType === 'faculty') {
      // Show only faculty events for faculty users
      return events.filter(event =>
        event.target_audience === 'faculty'
      );
    } else {
      // Fallback for admin or other user types - show all events
      return events;
    }
  };

  const fetchEventsOnce = async () => {
    // Prevent multiple simultaneous calls
    if (fetchingRef.current) {
      
      return;
    }

    // Check if component is still mounted
    if (!mountedRef.current) {
      
      return;
    }

    // Check cache first
    const cachedEvents = eventsCache.get();
    if (cachedEvents) {
      
      if (mountedRef.current) {
        setAllEvents(cachedEvents);
        setIsLoading(false);
        setError('');
      }
      return;
    }

    try {
      fetchingRef.current = true;
      
      // Only set loading if we don't have any events yet
      if (mountedRef.current && allEvents.length === 0) {
        setIsLoading(true);
        setError('');
      }

      // First, try to get all events with a high limit
      let response = await clientAPI.getEvents({
        status: 'all',
        limit: 1000 // Set high limit to get all events
      });

      // Check if component is still mounted before processing response
      if (!mountedRef.current) {
        
        return;
      }

      if (response.data && response.data.success) {
        let allFetchedEvents = response.data.events || [];
        
        

        // If there are more pages, fetch them all
        if (response.data.pagination && response.data.pagination.total_pages > 1) {
          

          for (let page = 2; page <= response.data.pagination.total_pages; page++) {
            if (!mountedRef.current) break; // Stop if component unmounted

            try {
              const pageResponse = await clientAPI.getEvents({
                status: 'all',
                page: page,
                limit: 1000
              });

              if (pageResponse.data && pageResponse.data.success) {
                const pageEvents = pageResponse.data.events || [];
                allFetchedEvents = [...allFetchedEvents, ...pageEvents];
                
              }
            } catch (pageError) {
              
            }
          }
        }

        

        // Cache the complete events list
        eventsCache.set(allFetchedEvents);

        // Update state only if component is still mounted
        if (mountedRef.current) {
          setAllEvents(allFetchedEvents);
          setError('');
        }

      } else {
        
        if (mountedRef.current) {
          setError('Failed to load events - API returned unsuccessful response');
        }
      }
    } catch (error) {
      
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

    // Sort events by date (most recent first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.event_date || a.created_at || 0);
      const dateB = new Date(b.event_date || b.created_at || 0);
      return dateB - dateA; // Descending order (newest first)
    });

    // ===== INTELLIGENT USER-BASED FILTERING =====
    console.log('🔍 Applying intelligent user-based filtering...', {
      isAuthenticated,
      userType,
      userDepartment: user?.department,
      userSemester: user?.semester,
      userObject: user,
      totalEvents: filtered.length,
      filteringMode: !isAuthenticated ? 'public' :
        userType === 'faculty' ? 'faculty' :
          userType === 'student' && !user?.department ? 'student-no-dept' :
            userType === 'student' && !user?.semester ? 'student-dept-only' :
              userType === 'student' ? 'student-full' : 'other'
    });

    // Apply user-based filtering using helper function
    filtered = getUserFilteredEvents(filtered);

    
    // ===== END INTELLIGENT USER-BASED FILTERING =====

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(event => event.status === statusFilter);
    }

    // Apply search filter
    if (debouncedSearchTerm.trim()) {
      const search = debouncedSearchTerm.toLowerCase();
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

    // Step 1: Apply user-based filtering using helper function
    const userFilteredEvents = getUserFilteredEvents(allEvents);

    // Step 2: Apply status filter on user-filtered events
    const eventsToCount = statusFilter === 'all'
      ? userFilteredEvents
      : userFilteredEvents.filter(event => event.status === statusFilter);

    eventsToCount.forEach(event => {
      const type = event.event_type || 'Other';
      counts[type] = (counts[type] || 0) + 1;
    });
    setEventTypeCounts(counts);

    // Create category options for dropdown based on user-filtered events
    const options = [
      { value: 'all', label: `All Categories (${eventsToCount.length})` }
    ];

    Object.entries(counts).forEach(([type, count]) => {
      options.push({
        value: type.toLowerCase(),
        label: `${type} (${count})`
      });
    });

    setCategoryOptions(options);
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setCurrentPage(1); // Reset to first page when category changes
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setSelectedCategory('all');
    setCurrentPage(1); // Reset to first page when clearing filters
  };

  // Pagination functions (enhanced)
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setIsChangingPage(true);
      setCurrentPage(page);

      // Smooth scroll to top of events grid
      setTimeout(() => {
        document.getElementById('eventsGrid')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        });
      }, 50);
    }
  };

  const getPageTitle = () => {
    if (!isAuthenticated) {
      if (statusFilter === 'upcoming') return 'Upcoming Student Events';
      if (statusFilter === 'ongoing') return 'Live Student Events';
      return 'Student Events';
    }

    if (userType === 'faculty') {
      if (statusFilter === 'upcoming') return 'Upcoming Faculty Events';
      if (statusFilter === 'ongoing') return 'Live Faculty Events';
      return 'Faculty Events';
    }

    if (userType === 'student') {
      if (statusFilter === 'upcoming') return 'Your Upcoming Events';
      if (statusFilter === 'ongoing') return 'Your Live Events';
      return 'Events for You';
    }

    if (userType === 'admin') {
      if (statusFilter === 'upcoming') return 'All Upcoming Events';
      if (statusFilter === 'ongoing') return 'All Live Events';
      return 'All Campus Events';
    }

    // Default
    if (statusFilter === 'upcoming') return 'Upcoming Events';
    if (statusFilter === 'ongoing') return 'Live Events';
    return 'Campus Events';
  };

  const getPageSubtitle = () => {
    if (!isAuthenticated) {
      if (statusFilter === 'upcoming') return 'Student events you can register for';
      if (statusFilter === 'ongoing') return 'Student events happening right now';
      return 'Discover student events on campus';
    }

    if (userType === 'faculty') {
      if (statusFilter === 'upcoming') return 'Faculty events you can attend';
      if (statusFilter === 'ongoing') return 'Faculty events happening now';
      return 'Events designed for faculty';
    }

    if (userType === 'student' && user?.department && user?.semester) {
      const dept = user.department;
      const sem = user.semester;
      if (statusFilter === 'upcoming') return `Upcoming events for ${dept} - Semester ${sem}`;
      if (statusFilter === 'ongoing') return `Live events for ${dept} - Semester ${sem}`;
      return `Events tailored for ${dept} students in Semester ${sem}`;
    }

    if (userType === 'student') {
      if (statusFilter === 'upcoming') return 'Student events you can register for';
      if (statusFilter === 'ongoing') return 'Student events happening now';
      return 'Events designed for students';
    }

    if (userType === 'admin') {
      if (statusFilter === 'upcoming') return 'All upcoming events across campus';
      if (statusFilter === 'ongoing') return 'All live events across campus';
      return 'Complete overview of campus events';
    }

    // Default
    if (statusFilter === 'upcoming') return 'Events you can register for';
    if (statusFilter === 'ongoing') return 'Events happening right now';
    return 'Find events that interest you';
  }; const getEventStatusCounts = () => {
    // Step 1: Apply user-based filtering using helper function
    const userFilteredEvents = getUserFilteredEvents(allEvents);

    // Step 2: Count statuses from user-filtered events
    const ongoing = userFilteredEvents.filter(e => e.status === 'ongoing').length;
    const upcoming = userFilteredEvents.filter(e => e.status === 'upcoming').length;
    return { ongoing, upcoming };
  };  // Refresh function for manual refresh
  const handleRefresh = () => {
    
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
          
          setIsLoading(false);
          setError('Request timed out. Please try refreshing.');
        }
      }, 15000); // 15 second timeout

      return () => clearTimeout(timeout);
    }
  }, [isLoading]);
  if (isLoading || shouldShowLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-sky-100 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />            <div className="mt-4 text-gray-600">
            <p>{shouldShowLoading && isWaitingForUserData ? 'Loading your personalized events...' : 'Loading events...'}</p>
            {error && (
              <p className="text-red-500 text-sm mt-2">Error: {error}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const statusCounts = getEventStatusCounts(); 
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-sky-100 pt-26">
      {/* Content Layer */}
      <div className="relative">
        {/* Simple Header */}
        <div className="bg-gradient-to-r from-teal-50/80 to-sky-50/80 border-b border-teal-200/50">
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
          <div className="bg-gradient-to-br from-white to-sky-50 rounded-xl shadow-lg border border-teal-200/50 p-6 mb-8">
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
                <Dropdown
                  label="Filter by Category"
                  placeholder="Select category"
                  options={categoryOptions}
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                  className="min-w-64"
                />
              </div>
            </div>            {/* Quick Stats */}
            {allEvents.length > 0 && (
              <div className="mt-6 pt-6 border-t border-teal-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    Showing <span className="font-semibold text-gray-900">{paginatedEvents.length}</span> of <span className="font-semibold text-gray-900">{filteredEvents.length}</span> events
                    {totalPages > 1 && (
                      <span className="ml-2">
                        (Page {currentPage} of {totalPages})
                      </span>
                    )}
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
                      </div>)}
                    {/* Refresh button */}
                    <div className="flex items-center space-x-2">
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
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity duration-200 ${isChangingPage ? 'opacity-50' : 'opacity-100'}`} id="eventsGrid">
              {isChangingPage && (
                <div className="col-span-full flex justify-center py-8">
                  <div className="flex items-center space-x-2 text-teal-600">
                    <i className="fas fa-spinner fa-spin"></i>
                    <span className="text-sm">Loading events...</span>
                  </div>
                </div>
              )}
              {!isChangingPage && paginatedEvents.map((event) => (
                <EventCard key={event.event_id} event={event} />
              ))}
            </div>

            {/* Enhanced Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-12 mb-8">
                <div className="bg-gradient-to-br from-white/90 to-teal-50/90 rounded-xl shadow-lg border border-teal-200/50 p-6 backdrop-blur-sm">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={goToPage}
                    pageSize={eventsPerPage}
                    totalItems={filteredEvents.length}
                    showInfo={true}
                    showFirstLast={totalPages > 7}
                    showPageSizeSelector={false}
                    size="md"
                    variant="outlined"
                    siblingCount={2}
                    boundaryCount={1}
                    className="w-full"
                    aria-label="Events pagination navigation"
                  />

                  {/* Additional UX Enhancement: Quick navigation */}
                  {totalPages > 10 && (
                    <div className="mt-4 pt-4 border-t border-teal-200/50">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
                        <div className="flex items-center space-x-2">
                          <label htmlFor="pageJump" className="text-sm text-gray-600">
                            Jump to page:
                          </label>
                          <input
                            id="pageJump"
                            type="number"
                            min="1"
                            max={totalPages}
                            placeholder={currentPage}
                            className="w-20 px-2 py-1 text-sm border border-teal-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const page = parseInt(e.target.value);
                                if (page >= 1 && page <= totalPages) {
                                  goToPage(page);
                                  e.target.value = '';
                                }
                              }
                            }}
                          />
                        </div>

                        <div className="flex items-center space-x-4">
                          <button
                            onClick={() => goToPage(1)}
                            disabled={currentPage === 1}
                            className="text-xs px-3 py-1 text-teal-600 hover:bg-teal-50 rounded-md disabled:text-gray-400 disabled:hover:bg-transparent transition-colors"
                          >
                            <i className="fas fa-fast-backward mr-1"></i>
                            First
                          </button>
                          <button
                            onClick={() => goToPage(totalPages)}
                            disabled={currentPage === totalPages}
                            className="text-xs px-3 py-1 text-teal-600 hover:bg-teal-50 rounded-md disabled:text-gray-400 disabled:hover:bg-transparent transition-colors"
                          >
                            Last
                            <i className="fas fa-fast-forward ml-1"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Keyboard shortcuts hint */}
                  <div className="mt-3 pt-3 border-t border-teal-100">
                    <div className="text-xs text-gray-400 text-center">
                      <i className="fas fa-keyboard mr-1"></i>
                      Tip: Use ← → arrow keys to navigate pages • Home/End for first/last page
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>          {/* No Events State */}
          {!isLoading && paginatedEvents.length === 0 && (
            <div className="max-w-6xl mx-auto px-4">
              <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
                <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className={`text-2xl text-gray-400 ${isWaitingForUserData
                      ? 'fas fa-spinner fa-spin'
                      : 'fas fa-calendar-times'
                    }`}></i>
                </div>
                <h3 className="text-xl font-bold text-gray-700 mb-3">
                  {isWaitingForUserData
                    ? 'Loading Your Events...'
                    : (allEvents.length === 0 ? 'No Events Found' : 'No Events Match Your Criteria')
                  }
                </h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  {isWaitingForUserData
                    ? 'Please wait while we load events tailored for your profile...'
                    : (allEvents.length === 0
                      ? (() => {
                        if (!isAuthenticated) {
                          return statusFilter === 'upcoming'
                            ? 'No upcoming student events are scheduled at the moment. Check back soon for new events!'
                            : statusFilter === 'ongoing'
                              ? 'No student events are currently live. Browse upcoming events to see what\'s coming next.'
                              : 'No student events are available right now. Check back later for new events!';
                        } else if (userType === 'faculty') {
                          return statusFilter === 'upcoming'
                            ? 'No upcoming faculty events are scheduled. Check back soon!'
                            : statusFilter === 'ongoing'
                              ? 'No faculty events are currently live.'
                              : 'No faculty events are available right now.';
                        } else if (userType === 'student' && user?.department && user?.semester) {
                          return statusFilter === 'upcoming'
                            ? `No upcoming events found for ${user.department} students in Semester ${user.semester}. Events may not be available for your specific department and semester yet.`
                            : statusFilter === 'ongoing'
                              ? `No live events found for ${user.department} students in Semester ${user.semester}.`
                              : `No events found matching your profile (${user.department} - Semester ${user.semester}). Events may not be targeted for your specific department and semester yet.`;
                        } else if (userType === 'student') {
                          return 'Complete your profile with department and semester information to see targeted events.';
                        } else {
                          return 'No events are available right now. Check back later for new events!';
                        }
                      })()
                      : (() => {
                        if (!isAuthenticated) {
                          return 'No student events match your current search. Try adjusting your filters or search terms.';
                        } else if (userType === 'faculty') {
                          return 'No faculty events match your current search. Try adjusting your filters or search terms.';
                        } else if (userType === 'student' && user?.department && user?.semester) {
                          return `No events for ${user.department} students in Semester ${user.semester} match your search. Try adjusting your filters.`;
                        } else if (userType === 'student') {
                          return 'Complete your profile or adjust your filters for better event targeting.';
                        } else {
                          return 'No events match your current search. Try adjusting your filters or search terms.';
                        }
                      })()
                    )
                  }
                </p>
                <div className="space-x-3">
                  {allEvents.length === 0 ? (
                    <>
                      <Link
                        to="/client/events?filter=all"
                        className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                      >
                        <i className="fas fa-calendar mr-2"></i>Browse All Events
                      </Link>
                      {userType === 'student' && user && (!user.department || !user.semester) && (
                        <Link
                          to="/client/student/profile"
                          className="inline-block px-6 py-3 border-2 border-orange-600 text-orange-600 rounded-lg hover:bg-orange-50 transition-colors font-semibold"
                        >
                          <i className="fas fa-user-edit mr-2"></i>Complete Profile
                        </Link>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        onClick={clearFilters}
                        className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                      >
                        <i className="fas fa-refresh mr-2"></i>Clear Filters
                      </button>
                      {userType === 'student' && user && (!user.department || !user.semester) && (
                        <Link
                          to="/client/student/profile"
                          className="inline-block px-6 py-3 border-2 border-orange-600 text-orange-600 rounded-lg hover:bg-orange-50 transition-colors font-semibold"
                        >
                          <i className="fas fa-user-edit mr-2"></i>Complete Profile for Better Results
                        </Link>
                      )}
                    </>
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
  );
}

export default EventList;
