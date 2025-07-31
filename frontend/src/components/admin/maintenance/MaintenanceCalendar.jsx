import React, { useState, useEffect } from 'react';
import { maintenanceAPI, venueApi } from '../../../api/axios';
import { 
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  WrenchScrewdriverIcon,
  ClockIcon,
  BuildingOfficeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const MaintenanceCalendar = () => {
  // State management
  const [currentDate, setCurrentDate] = useState(new Date());
  const [maintenanceWindows, setMaintenanceWindows] = useState([]);
  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMaintenance, setSelectedMaintenance] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Calendar state
  const [calendarDays, setCalendarDays] = useState([]);
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'week'

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Update calendar when date or filters change
  useEffect(() => {
    generateCalendarDays();
    loadMaintenanceWindows();
  }, [currentDate, selectedVenue, viewMode]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [venuesResponse] = await Promise.all([
        venueApi.list()
      ]);
      
      setVenues(venuesResponse.data.venues || []);
    } catch (error) {
      console.error('Error loading venues:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMaintenanceWindows = async () => {
    try {
      const startDate = getViewStartDate();
      const endDate = getViewEndDate();
      
      const filters = {
        venue_id: selectedVenue || undefined,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        include_past: true
      };

      const response = await maintenanceAPI.getMaintenanceWindows(filters);
      setMaintenanceWindows(response.data.maintenance_windows || []);
    } catch (error) {
      console.error('Error loading maintenance windows:', error);
    }
  };

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (viewMode === 'month') {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

      const days = [];
      for (let i = 0; i < 42; i++) { // 6 weeks × 7 days
        const day = new Date(startDate);
        day.setDate(startDate.getDate() + i);
        days.push({
          date: new Date(day),
          isCurrentMonth: day.getMonth() === month,
          isToday: isToday(day)
        });
      }
      setCalendarDays(days);
    } else {
      // Week view
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()); // Start from Sunday

      const days = [];
      for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        days.push({
          date: new Date(day),
          isCurrentMonth: true,
          isToday: isToday(day)
        });
      }
      setCalendarDays(days);
    }
  };

  const getViewStartDate = () => {
    if (viewMode === 'month') {
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - firstDay.getDay());
      return startDate;
    } else {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      return startOfWeek;
    }
  };

  const getViewEndDate = () => {
    if (viewMode === 'month') {
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const endDate = new Date(lastDay);
      endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
      endDate.setHours(23, 59, 59, 999);
      return endDate;
    } else {
      const endOfWeek = new Date(currentDate);
      endOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      return endOfWeek;
    }
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSameDay = (date1, date2) => {
    return date1.toDateString() === date2.toDateString();
  };

  const getMaintenanceForDay = (date) => {
    return maintenanceWindows.filter(maintenance => {
      const startDate = new Date(maintenance.start_time);
      const endDate = new Date(maintenance.end_time);
      
      // Check if maintenance spans this day
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      return (startDate <= dayEnd && endDate >= dayStart);
    });
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + direction);
    } else {
      newDate.setDate(newDate.getDate() + (direction * 7));
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'bg-blue-500',
      in_progress: 'bg-yellow-500',
      completed: 'bg-green-500',
      cancelled: 'bg-gray-500'
    };
    return colors[status] || colors.scheduled;
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const openMaintenanceDetail = (maintenance) => {
    setSelectedMaintenance(maintenance);
    setShowDetailModal(true);
  };

  const getMonthYearLabel = () => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString([], { month: 'long', year: 'numeric' });
    } else {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
        return `${startOfWeek.toLocaleDateString([], { month: 'long', year: 'numeric' })} - Week of ${startOfWeek.getDate()}`;
      } else {
        return `${startOfWeek.toLocaleDateString([], { month: 'short' })} ${startOfWeek.getDate()} - ${endOfWeek.toLocaleDateString([], { month: 'short' })} ${endOfWeek.getDate()}, ${endOfWeek.getFullYear()}`;
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <CalendarDaysIcon className="h-8 w-8 mr-3 text-blue-600" />
            Maintenance Calendar
          </h1>
          <p className="text-gray-600 mt-1">View maintenance schedules in calendar format</p>
        </div>

        <div className="flex space-x-2">
          <select
            value={selectedVenue}
            onChange={(e) => setSelectedVenue(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Venues</option>
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>{venue.name}</option>
            ))}
          </select>

          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-2 text-sm font-medium border border-r-0 rounded-l-md ${
                viewMode === 'month'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-2 text-sm font-medium border rounded-r-md ${
                viewMode === 'week'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Week
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {getMonthYearLabel()}
            </h2>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Today
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 bg-gray-50">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="px-3 py-2 text-center text-sm font-medium text-gray-700 border-r border-gray-200 last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => {
              const dayMaintenance = getMaintenanceForDay(day.date);
              
              return (
                <div
                  key={index}
                  className={`min-h-[120px] border-r border-b border-gray-200 last:border-r-0 p-2 ${
                    !day.isCurrentMonth ? 'bg-gray-50' : 'bg-white'
                  } ${day.isToday ? 'bg-blue-50' : ''}`}
                >
                  <div className={`text-sm font-medium mb-2 ${
                    !day.isCurrentMonth ? 'text-gray-400' : 
                    day.isToday ? 'text-blue-600' : 'text-gray-900'
                  }`}>
                    {day.date.getDate()}
                  </div>

                  <div className="space-y-1">
                    {dayMaintenance.slice(0, viewMode === 'month' ? 3 : 10).map((maintenance) => (
                      <button
                        key={maintenance.id}
                        onClick={() => openMaintenanceDetail(maintenance)}
                        className={`w-full text-left px-2 py-1 rounded text-xs text-white hover:opacity-80 transition-opacity ${getStatusColor(maintenance.status)}`}
                      >
                        <div className="flex items-center space-x-1">
                          <WrenchScrewdriverIcon className="h-3 w-3" />
                          <span className="truncate">
                            {maintenance.venue_name}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 mt-1">
                          <ClockIcon className="h-3 w-3" />
                          <span>
                            {formatTime(maintenance.start_time)} - {formatTime(maintenance.end_time)}
                          </span>
                        </div>
                      </button>
                    ))}
                    
                    {dayMaintenance.length > (viewMode === 'month' ? 3 : 10) && (
                      <div className="text-xs text-gray-500 px-2">
                        +{dayMaintenance.length - (viewMode === 'month' ? 3 : 10)} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Status Legend</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-sm text-gray-700">Scheduled</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-sm text-gray-700">In Progress</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-700">Completed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-500 rounded"></div>
            <span className="text-sm text-gray-700">Cancelled</span>
          </div>
        </div>
      </div>

      {/* Maintenance Detail Modal */}
      {showDetailModal && selectedMaintenance && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Maintenance Details
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Venue</div>
                  <div className="text-sm text-gray-600">{selectedMaintenance.venue_name}</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Maintenance Window</div>
                  <div className="text-sm text-gray-600">
                    {new Date(selectedMaintenance.start_time).toLocaleString()} - {new Date(selectedMaintenance.end_time).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(selectedMaintenance.status)}`}></div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Status</div>
                  <div className="text-sm text-gray-600 capitalize">{selectedMaintenance.status.replace('_', ' ')}</div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <WrenchScrewdriverIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Reason</div>
                  <div className="text-sm text-gray-600">{selectedMaintenance.reason}</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <div>
                  <div className="text-sm font-medium text-gray-900">Created By</div>
                  <div className="text-sm text-gray-600">{selectedMaintenance.created_by}</div>
                </div>
              </div>

              {selectedMaintenance.affected_bookings_count > 0 && (
                <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-md">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
                  <div>
                    <div className="text-sm font-medium text-yellow-800">Booking Conflicts</div>
                    <div className="text-sm text-yellow-700">
                      This maintenance affects {selectedMaintenance.affected_bookings_count} existing booking(s)
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceCalendar;
