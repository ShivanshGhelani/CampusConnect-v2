import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Users, 
  Search, 
  Filter, 
  Download, 
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  UserCheck,
  RefreshCw,
  Calendar,
  CalendarDays,
  Target,
  TrendingUp,
  BarChart3,
  Sun,
  Moon,
  CloudSun
} from 'lucide-react';
import AdminLayout from '../AdminLayout';
import LoadingSpinner from '../../LoadingSpinner';
import { useDynamicAttendance } from '../../../hooks/useDynamicAttendance';
import { 
  StrategyInfoCard, 
  AttendanceProgress
} from './StrategyComponents';
import api from '../../../api/base';

const DayBasedPortal = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  
  // Dynamic attendance hook
  const {
    config,
    analytics,
    loading: dynamicLoading,
    error: dynamicError,
    loadConfig,
    markAttendance,
    bulkMarkAttendance,
    refreshData
  } = useDynamicAttendance(eventId);
  
  // Local state
  const [registrations, setRegistrations] = useState([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDay, setSelectedDay] = useState(null);
  const [eventDays, setEventDays] = useState([]);
  const [dayStats, setDayStats] = useState({});
  const [selectedRegistrations, setSelectedRegistrations] = useState([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [notification, setNotification] = useState(null);
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar', 'students', 'analytics'
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Initialize
  useEffect(() => {
    loadConfig().then(() => {
      fetchEventDays();
      fetchDayRegistrations();
    }).catch(err => {
      console.error('Failed to load day-based configuration:', err);
      setError('This event is not configured for day-based attendance');
    });
  }, [eventId, loadConfig]);

  // Set today as default selected day
  useEffect(() => {
    if (eventDays.length > 0 && !selectedDay) {
      const today = new Date().toISOString().split('T')[0];
      const todayEvent = eventDays.find(day => day.date === today);
      setSelectedDay(todayEvent?.date || eventDays[0].date);
    }
  }, [eventDays, selectedDay]);

  // Load day-specific data
  useEffect(() => {
    if (selectedDay) {
      fetchDayRegistrations();
      fetchDayStats();
    }
  }, [selectedDay]);

  // Auto-refresh
  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(async () => {
        await Promise.all([
          fetchDayRegistrations(),
          fetchDayStats(),
          refreshData()
        ]);
      }, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, selectedDay, refreshData]);

  // Search filter
  useEffect(() => {
    if (searchTerm) {
      const filtered = registrations.filter(reg => 
        reg.student_enrollment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.student_data?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.student_data?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredRegistrations(filtered);
    } else {
      setFilteredRegistrations(registrations);
    }
  }, [searchTerm, registrations]);

  const fetchEventDays = async () => {
    try {
      const response = await api.get(`/api/v1/attendance/days/${eventId}`);
      if (response.data.success) {
        setEventDays(response.data.data.days || []);
      } else {
        // Generate days from event start/end dates
        generateEventDays();
      }
    } catch (err) {
      console.error('Error fetching event days:', err);
      generateEventDays();
    }
  };

  const generateEventDays = () => {
    // Fallback: generate days for a multi-day event
    const startDate = new Date();
    const days = [];
    for (let i = 0; i < 3; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push({
        date: date.toISOString().split('T')[0],
        day_name: `Day ${i + 1}`,
        is_active: i === 0,
        activities: [`Day ${i + 1} Activities`]
      });
    }
    setEventDays(days);
  };

  const fetchDayRegistrations = async () => {
    if (!selectedDay) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/api/v1/attendance/days/${selectedDay}/registrations`);
      
      if (response.data.success) {
        setRegistrations(response.data.data.registrations || []);
      } else {
        // Fallback to general registrations
        const fallbackResponse = await api.get(`/api/v1/admin/event-registration/event/${eventId}`);
        if (fallbackResponse.data.success) {
          setRegistrations(fallbackResponse.data.data.registrations || []);
        }
      }
    } catch (err) {
      console.error('Error fetching day registrations:', err);
      setError('Failed to load day registrations');
    } finally {
      setLoading(false);
    }
  };

  const fetchDayStats = async () => {
    if (!selectedDay) return;
    
    try {
      const response = await api.get(`/api/v1/attendance/days/${selectedDay}/stats`);
      if (response.data.success) {
        setDayStats(prev => ({
          ...prev,
          [selectedDay]: response.data.data
        }));
      }
    } catch (err) {
      console.error('Error fetching day stats:', err);
    }
  };

  const handleMarkDayAttendance = async (registrationId, notes = '') => {
    if (!selectedDay) {
      showNotification('Please select a day first', 'error');
      return;
    }

    try {
      const result = await markAttendance(registrationId, {
        notes,
        day: selectedDay,
        verification_method: 'physical'
      });
      
      if (result.success) {
        showNotification('Day attendance marked successfully', 'success');
        await Promise.all([
          fetchDayRegistrations(),
          fetchDayStats(),
          refreshData()
        ]);
      } else {
        showNotification(result.message || 'Failed to mark day attendance', 'error');
      }
    } catch (err) {
      console.error('Error marking day attendance:', err);
      showNotification('Network error while marking attendance', 'error');
    }
  };

  const handleBulkDayMark = async (registrationIds, notes) => {
    if (!selectedDay) {
      showNotification('Please select a day first', 'error');
      return;
    }

    try {
      const result = await bulkMarkAttendance(registrationIds, {
        notes,
        day: selectedDay,
        verification_method: 'physical'
      });
      
      if (result.success) {
        const successCount = result.successful?.length || registrationIds.length;
        showNotification(`${successCount} students marked for ${selectedDay}`, 'success');
        setSelectedRegistrations([]);
        setShowBulkModal(false);
        
        await Promise.all([
          fetchDayRegistrations(),
          fetchDayStats(),
          refreshData()
        ]);
      } else {
        showNotification(result.message || 'Failed to mark bulk attendance', 'error');
      }
    } catch (err) {
      console.error('Error marking bulk day attendance:', err);
      showNotification('Network error while marking bulk attendance', 'error');
    }
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchEventDays(),
        fetchDayRegistrations(),
        fetchDayStats(),
        refreshData()
      ]);
      showNotification('Day data refreshed successfully', 'success');
    } catch (error) {
      console.error('Error refreshing day data:', error);
      showNotification('Error refreshing data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getDayProgress = (day) => {
    if (!dayStats[day]) return { attended: 0, total: registrations.length };
    return {
      attended: dayStats[day].attended || 0,
      total: dayStats[day].total || registrations.length
    };
  };

  const getOverallProgress = () => {
    if (!eventDays.length || !config?.criteria?.minimum_percentage) return null;
    
    const totalDays = eventDays.length;
    const attendedDays = eventDays.filter(day => {
      const progress = getDayProgress(day.date);
      return progress.attended > 0;
    }).length;
    
    const progressPercentage = totalDays > 0 ? (attendedDays / totalDays) * 100 : 0;
    const requiredPercentage = config.criteria.minimum_percentage;
    
    return {
      current: attendedDays,
      total: totalDays,
      percentage: progressPercentage,
      required: requiredPercentage,
      isOnTrack: progressPercentage >= requiredPercentage
    };
  };

  const getDayIcon = (day, index) => {
    if (index === 0) return Sun;
    if (index === eventDays.length - 1) return Moon;
    return CloudSun;
  };

  if (loading && dynamicLoading) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </AdminLayout>
    );
  }

  if (error || (config && config.strategy !== 'day_based')) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Day-Based Attendance Not Available</h3>
            <p className="text-gray-600 mb-4">
              {error || 'This event is not configured for day-based attendance tracking.'}
            </p>
            <button
              onClick={() => navigate(`/admin/events/${eventId}`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Event
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const selectedDayData = eventDays.find(d => d.date === selectedDay);
  const overallProgress = getOverallProgress();

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate(`/admin/events/${eventId}/attendance`)}
                  className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all duration-200 border border-gray-200"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <CalendarDays className="w-8 h-8 text-green-600" />
                    Day-Based Attendance
                  </h1>
                  <p className="text-gray-600 mt-1">Manage attendance across multiple event days</p>
                </div>
              </div>
              
              {/* Header Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg border transition-all duration-200 ${
                    autoRefresh 
                      ? 'bg-green-50 border-green-200 text-green-700 shadow-sm' 
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                  Auto-refresh
                </button>
                
                <button
                  onClick={handleRefresh}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>

                {/* View Mode Toggle */}
                <div className="flex bg-white border border-gray-300 rounded-lg shadow-sm">
                  <button
                    onClick={() => setViewMode('calendar')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm transition-all duration-200 rounded-l-lg ${
                      viewMode === 'calendar' 
                        ? 'bg-green-50 text-green-700 border-r border-green-200' 
                        : 'text-gray-700 hover:bg-gray-50 border-r border-gray-300'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    Calendar
                  </button>
                  <button
                    onClick={() => setViewMode('students')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm transition-all duration-200 ${
                      viewMode === 'students' 
                        ? 'bg-green-50 text-green-700 border-r border-green-200' 
                        : 'text-gray-700 hover:bg-gray-50 border-r border-gray-300'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Students
                  </button>
                  <button
                    onClick={() => setViewMode('analytics')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm transition-all duration-200 rounded-r-lg ${
                      viewMode === 'analytics' 
                        ? 'bg-green-50 text-green-700' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    Analytics
                  </button>
                </div>
              </div>
            </div>

            {/* Strategy Information */}
            {config && (
              <div className="mb-6">
                <StrategyInfoCard 
                  strategy={config.strategy}
                  criteria={config.criteria}
                  sessions={eventDays}
                />
              </div>
            )}

            {/* Overall Progress */}
            {overallProgress && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Overall Day Progress
                  </h3>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    overallProgress.isOnTrack 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {overallProgress.isOnTrack ? 'On Track' : 'Needs Attention'}
                  </div>
                </div>
                
                <AttendanceProgress
                  current={overallProgress.current}
                  total={overallProgress.total}
                  strategy="day_based"
                />
                
                <div className="mt-4 text-sm text-gray-600">
                  {overallProgress.current} of {overallProgress.total} days have attendance recorded
                  • Required: {overallProgress.required}% minimum attendance
                </div>
              </div>
            )}
          </div>

          {/* Calendar View */}
          {viewMode === 'calendar' && (
            <div className="space-y-6">
              {/* Days Calendar */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  Event Days
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {eventDays.map((day, index) => {
                    const progress = getDayProgress(day.date);
                    const isSelected = selectedDay === day.date;
                    const isToday = day.date === new Date().toISOString().split('T')[0];
                    const DayIcon = getDayIcon(day, index);
                    
                    return (
                      <div
                        key={day.date}
                        onClick={() => setSelectedDay(day.date)}
                        className={`border rounded-lg p-6 cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? 'ring-2 ring-green-500 border-green-300 bg-green-50'
                            : isToday
                            ? 'border-blue-200 bg-blue-50 hover:border-blue-300'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <DayIcon className={`w-6 h-6 ${
                              isSelected ? 'text-green-600' : 
                              isToday ? 'text-blue-600' : 'text-gray-600'
                            }`} />
                            <div>
                              <h4 className="font-medium text-gray-900">{day.day_name}</h4>
                              <p className="text-sm text-gray-500">
                                {new Date(day.date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          {isToday && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              Today
                            </span>
                          )}
                        </div>
                        
                        {/* Day Progress */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Attendance</span>
                            <span className="font-medium text-gray-900">
                              {progress.attended}/{progress.total}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                progress.total > 0 && progress.attended === progress.total
                                  ? 'bg-green-500'
                                  : progress.attended > 0
                                  ? 'bg-blue-500'
                                  : 'bg-gray-300'
                              }`}
                              style={{ 
                                width: `${progress.total > 0 ? (progress.attended / progress.total) * 100 : 0}%` 
                              }}
                            />
                          </div>
                        </div>
                        
                        {/* Activities */}
                        {day.activities && day.activities.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-xs text-gray-500 mb-1">Activities:</p>
                            <div className="space-y-1">
                              {day.activities.slice(0, 2).map((activity, idx) => (
                                <p key={idx} className="text-xs text-gray-600 truncate">
                                  • {activity}
                                </p>
                              ))}
                              {day.activities.length > 2 && (
                                <p className="text-xs text-gray-400">
                                  +{day.activities.length - 2} more
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Selected Day Details */}
              {selectedDayData && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedDayData.day_name} Details
                    </h3>
                    <button
                      onClick={() => setViewMode('students')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Manage Students
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-6 h-6 text-green-600" />
                        <div>
                          <p className="text-sm text-gray-600">Date</p>
                          <p className="font-medium text-gray-900">
                            {new Date(selectedDayData.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <Users className="w-6 h-6 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-600">Attendance</p>
                          <p className="font-medium text-gray-900">
                            {getDayProgress(selectedDay).attended} / {getDayProgress(selectedDay).total}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <Target className="w-6 h-6 text-purple-600" />
                        <div>
                          <p className="text-sm text-gray-600">Completion</p>
                          <p className="font-medium text-gray-900">
                            {getDayProgress(selectedDay).total > 0 
                              ? Math.round((getDayProgress(selectedDay).attended / getDayProgress(selectedDay).total) * 100)
                              : 0}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Students View - Reuse from SessionBasedPortal with day context */}
          {viewMode === 'students' && selectedDayData && (
            <DayStudentsView 
              registrations={filteredRegistrations}
              selectedDay={selectedDayData}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              selectedRegistrations={selectedRegistrations}
              setSelectedRegistrations={setSelectedRegistrations}
              onMarkAttendance={handleMarkDayAttendance}
              onBulkMark={() => setShowBulkModal(true)}
              loading={loading}
            />
          )}

          {/* Analytics View */}
          {viewMode === 'analytics' && (
            <DayAnalyticsView 
              eventDays={eventDays}
              analytics={analytics}
              dayStats={dayStats}
              config={config}
              getDayProgress={getDayProgress}
            />
          )}
        </div>
      </div>

      {/* Bulk Mark Modal */}
      {showBulkModal && selectedDayData && (
        <BulkDayModal
          selectedCount={selectedRegistrations.length}
          dayName={selectedDayData.day_name}
          onConfirm={handleBulkDayMark}
          onCancel={() => setShowBulkModal(false)}
          registrationIds={selectedRegistrations}
        />
      )}

      {/* Notification */}
      {notification && (
        <div className={`fixed top-6 right-6 p-6 rounded-xl shadow-lg z-50 max-w-md border-l-4 ${
          notification.type === 'success' 
            ? 'bg-green-50 border-green-400 text-green-800' 
            : notification.type === 'warning'
            ? 'bg-yellow-50 border-yellow-400 text-yellow-800'
            : 'bg-red-50 border-red-400 text-red-800'
        }`}>
          <div className="flex items-start gap-3">
            {notification.type === 'success' ? (
              <CheckCircle className="w-6 h-6 mt-0.5" />
            ) : (
              <AlertCircle className="w-6 h-6 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="font-semibold mb-1">
                {notification.type === 'success' ? 'Success' : 
                 notification.type === 'warning' ? 'Warning' : 'Error'}
              </div>
              <div className="text-sm leading-relaxed">{notification.message}</div>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="ml-2 p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

// Day Students View Component (similar to SessionStudentsView but day-focused)
const DayStudentsView = ({ 
  registrations, 
  selectedDay,
  searchTerm, 
  setSearchTerm,
  statusFilter, 
  setStatusFilter,
  selectedRegistrations,
  setSelectedRegistrations,
  onMarkAttendance,
  onBulkMark,
  loading 
}) => {
  // Implementation similar to StudentsView but with day context
  // This would be similar to the SessionBasedPortal StudentsView
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Students for {selectedDay.day_name}
      </h3>
      <p className="text-gray-600">Day-specific student management interface would be implemented here.</p>
    </div>
  );
};

// Day Analytics View Component
const DayAnalyticsView = ({ eventDays, analytics, dayStats, config, getDayProgress }) => {
  // Implementation for day-based analytics
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Day-Based Analytics
      </h3>
      <p className="text-gray-600">Day-based analytics dashboard would be implemented here.</p>
    </div>
  );
};

// Bulk Day Modal Component
const BulkDayModal = ({ selectedCount, dayName, onConfirm, onCancel, registrationIds }) => {
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm(registrationIds, notes);
    } catch (error) {
      console.error('Error in bulk day marking:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Mark Day Attendance
        </h3>
        
        <div className="mb-4">
          <p className="text-gray-600">
            Mark <span className="font-medium text-green-600">{selectedCount} students</span> as present for:
          </p>
          <p className="font-medium text-gray-900 mt-1">{dayName}</p>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this attendance marking..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
            rows={3}
          />
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Processing...
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4" />
                Mark Present
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DayBasedPortal;
