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
  Grid3X3,
  List,
  ScanLine,
  Zap,
  Settings,
  Activity,
  Target
} from 'lucide-react';
import AdminLayout from '../AdminLayout';
import PhysicalAttendanceTable from './PhysicalAttendanceTable';
import BulkMarkModal from './BulkMarkModal';
import AttendanceStatsCard from './AttendanceStatsCard';
import AttendanceStatusBadge from './AttendanceStatusBadge';
import LoadingSpinner from '../../LoadingSpinner';
import api from '../../../api/base';
import { useDynamicAttendance } from '../../../hooks/useDynamicAttendance';
import { 
  StrategyInfoCard, 
  SessionStatus, 
  SessionTimer, 
  AttendanceProgress, 
  SessionGrid,
  StrategyRouter 
} from './StrategyComponents';

const PhysicalAttendancePortal = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  
  // Initialize Dynamic Attendance Hook
  const {
    config,
    sessions,
    analytics,
    loading: dynamicLoading,
    error: dynamicError,
    loadConfig,
    markAttendance,
    bulkMarkAttendance,
    getCurrentSession,
    getSessionProgress,
    refreshData
  } = useDynamicAttendance(eventId);
  
  // Legacy state management (will be gradually migrated)
  const [registrations, setRegistrations] = useState([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRegistrations, setSelectedRegistrations] = useState([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'
  const [quickMode, setQuickMode] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  
  // Strategy-specific state
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [showStrategyInfo, setShowStrategyInfo] = useState(true);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(10);
  
  // Success/error notifications
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    // Initialize dynamic attendance configuration
    loadConfig().then(() => {
      fetchRegistrations();
      fetchAttendanceStats();
    }).catch(err => {
      console.warn('Dynamic attendance not available, falling back to legacy mode:', err);
      fetchRegistrations();
      fetchAttendanceStats();
    });
  }, [eventId, currentPage, statusFilter, loadConfig]);

  useEffect(() => {
    // Update current session when sessions change
    if (sessions?.length > 0) {
      const active = getCurrentSession();
      setCurrentSession(active);
      if (active && !selectedSessionId) {
        setSelectedSessionId(active.session_id);
      }
    }
  }, [sessions, getCurrentSession, selectedSessionId]);

  useEffect(() => {
    // Apply search filter to registrations
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

  // Auto-refresh effect with dynamic attendance integration
  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(async () => {
        // Refresh both legacy and dynamic data
        await Promise.all([
          fetchRegistrations(),
          fetchAttendanceStats(),
          refreshData()
        ]);
      }, 30000); // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, eventId, currentPage, statusFilter, refreshData]);

  // Unified error handling
  useEffect(() => {
    if (dynamicError) {
      console.warn('Dynamic attendance error:', dynamicError);
      // Don't show error to user, fall back to legacy mode
    }
  }, [dynamicError]);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage.toString(),
        limit: pageSize.toString()
      };
      
      if (statusFilter !== 'all') {
        params.status_filter = statusFilter;
      }

      const response = await api.get(`/api/v1/admin/event-registration/event/${eventId}`, { params });

      if (response.data.success) {
        setRegistrations(response.data.data.registrations);
        setTotalPages(response.data.data.pagination.total_pages);
      } else {
        setError(response.data.message || 'Failed to fetch registrations');
      }
    } catch (err) {
      console.error('Error fetching registrations:', err);
      setError('Network error while fetching registrations');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceStats = async () => {
    try {
      const response = await api.get(`/api/v1/admin/event-registration/attendance/stats/${eventId}`);

      if (response.data) {
        setAttendanceStats(response.data);
      }
    } catch (err) {
      console.error('Error fetching attendance stats:', err);
    }
  };

  // Enhanced attendance marking with dynamic strategy support
  const handleMarkPhysicalAttendance = async (registrationId, notes = '') => {
    try {
      // Check if dynamic attendance is available
      if (config && markAttendance) {
        const result = await markAttendance(registrationId, {
          notes,
          session_id: selectedSessionId,
          verification_method: 'physical'
        });
        
        if (result.success) {
          showNotification(
            config.strategy === 'single_mark' 
              ? 'Attendance marked successfully'
              : `Attendance marked for ${config.strategy.replace('_', ' ')} strategy`,
            'success'
          );
          
          // Update local state and refresh data
          await Promise.all([
            fetchRegistrations(),
            fetchAttendanceStats(),
            refreshData()
          ]);
          return;
        }
      }
      
      // Fallback to legacy API
      const response = await api.patch(`/api/v1/admin/event-registration/attendance/physical/${registrationId}`, {
        registration_id: registrationId,
        notes: notes
      });

      if (response.data.success) {
        showNotification('Physical attendance marked successfully', 'success');
        
        // Update local state immediately for better UX
        setRegistrations(prev => prev.map(reg => 
          reg.registration_id === registrationId 
            ? { ...reg, 
                physical_attendance_id: response.data.data.physical_attendance_id,
                physical_attendance_timestamp: response.data.data.physical_attendance_timestamp,
                final_attendance_status: response.data.data.final_attendance_status
              }
            : reg
        ));
        
        // Refresh data for accuracy
        fetchRegistrations();
        fetchAttendanceStats();
      } else {
        showNotification(response.data.message || 'Failed to mark attendance', 'error');
      }
    } catch (err) {
      console.error('Error marking attendance:', err);
      showNotification('Network error while marking attendance', 'error');
    }
  };

  // Enhanced bulk attendance marking with dynamic strategy support
  const handleBulkMarkAttendance = async (registrationIds, notes) => {
    try {
      // Check if dynamic attendance is available
      if (config && bulkMarkAttendance) {
        const result = await bulkMarkAttendance(registrationIds, {
          notes,
          session_id: selectedSessionId,
          verification_method: 'physical'
        });
        
        if (result.success) {
          const successCount = result.successful?.length || registrationIds.length;
          showNotification(
            config.strategy === 'single_mark'
              ? `${successCount} students verified as present`
              : `${successCount} students marked for ${config.strategy.replace('_', ' ')} strategy`,
            'success'
          );
          
          setSelectedRegistrations([]);
          setShowBulkModal(false);
          
          // Refresh all data
          await Promise.all([
            fetchRegistrations(),
            fetchAttendanceStats(),
            refreshData()
          ]);
          return;
        }
      }
      
      // Fallback to legacy API
      const response = await api.post('/api/v1/admin/event-registration/attendance/physical/bulk', {
        registration_ids: registrationIds,
        notes: notes
      });

      if (response.data.success) {
        const successCount = response.data.data?.successful?.length || 0;
        showNotification(`${successCount} students verified as present`, 'success');
        setSelectedRegistrations([]);
        setShowBulkModal(false);
        fetchRegistrations();
        fetchAttendanceStats();
      } else {
        showNotification(response.data.message || 'Failed to mark bulk attendance', 'error');
      }
    } catch (err) {
      console.error('Error marking bulk attendance:', err);
      showNotification('Network error while marking bulk attendance', 'error');
    }
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Enhanced refresh function
  const handleRefresh = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchRegistrations(),
        fetchAttendanceStats(),
        refreshData && refreshData()
      ]);
      showNotification('Data refreshed successfully', 'success');
    } catch (error) {
      console.error('Error refreshing data:', error);
      showNotification('Error refreshing data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusFilterOptions = () => [
    { value: 'all', label: 'All Students', icon: Users, count: registrations.length },
    { value: 'absent', label: 'Absent', icon: X, count: registrations.filter(r => r.final_attendance_status === 'absent').length },
    { value: 'virtual_only', label: 'Registered Only', icon: Clock, count: registrations.filter(r => r.final_attendance_status === 'virtual_only').length },
    { value: 'physical_only', label: 'Walk-in Present', icon: AlertCircle, count: registrations.filter(r => r.final_attendance_status === 'physical_only').length },
    { value: 'present', label: 'Present', icon: CheckCircle, count: registrations.filter(r => r.final_attendance_status === 'present').length }
  ];

  const handleQuickMarkAll = async () => {
    const eligibleRegistrations = filteredRegistrations.filter(reg => !reg.physical_attendance_id);
    if (eligibleRegistrations.length === 0) {
      showNotification('No students eligible for quick marking', 'warning');
      return;
    }
    
    const registrationIds = eligibleRegistrations.map(reg => reg.registration_id);
    await handleBulkMarkAttendance(registrationIds, 'Quick mark all - bulk attendance');
  };

  const handleSelectRegistration = (registrationId, isSelected) => {
    if (isSelected) {
      setSelectedRegistrations([...selectedRegistrations, registrationId]);
    } else {
      setSelectedRegistrations(selectedRegistrations.filter(id => id !== registrationId));
    }
  };

  const handleSelectAll = () => {
    if (selectedRegistrations.length === filteredRegistrations.length) {
      setSelectedRegistrations([]);
    } else {
      setSelectedRegistrations(filteredRegistrations.map(reg => reg.registration_id));
    }
  };

  if (loading && registrations.length === 0) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Main Container with proper centering and max-width */}
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
          {/* Enhanced Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate(`/admin/events/${eventId}`)}
                  className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all duration-200 border border-gray-200"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Attendance Portal</h1>
                  <p className="text-gray-600 mt-1">Mark and verify student presence</p>
                </div>
              </div>
              
              {/* Header Actions */}
              <div className="flex items-center gap-3">
                {/* Auto-refresh toggle */}
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg border transition-all duration-200 ${
                    autoRefresh 
                      ? 'bg-green-50 border-green-200 text-green-700 shadow-sm' 
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:shadow-sm'
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                  Auto-refresh
                </button>
                
                {/* Manual refresh */}
                <button
                  onClick={handleRefresh}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:shadow-sm transition-all duration-200"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>

                {/* View mode toggle */}
                <div className="flex bg-white border border-gray-300 rounded-lg shadow-sm">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm transition-all duration-200 rounded-l-lg ${
                      viewMode === 'table' 
                        ? 'bg-blue-50 text-blue-700 border-r border-blue-200' 
                        : 'text-gray-700 hover:bg-gray-50 border-r border-gray-300'
                    }`}
                  >
                    <List className="w-4 h-4" />
                    Table
                  </button>
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm transition-all duration-200 rounded-r-lg ${
                      viewMode === 'cards' 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                    Cards
                  </button>
                </div>
              </div>
            </div>

            {/* Enhanced Attendance Statistics */}
            {attendanceStats && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <AttendanceStatsCard stats={attendanceStats} />
              </div>
            )}

            {/* Dynamic Attendance Strategy Information */}
            {config && showStrategyInfo && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    Attendance Strategy
                  </h3>
                  <button
                    onClick={() => setShowStrategyInfo(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <StrategyInfoCard 
                  strategy={config.strategy}
                  criteria={config.criteria}
                  sessions={sessions}
                />

                {/* Session Management for Session-based Strategy */}
                {config.strategy === 'session_based' && sessions?.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-md font-medium text-gray-900 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-purple-600" />
                        Session Management
                      </h4>
                      {currentSession && (
                        <SessionStatus status={currentSession.status} />
                      )}
                    </div>
                    
                    <div className="max-h-48 overflow-y-auto">
                      <SessionGrid
                        sessions={sessions}
                        selectedSessionId={selectedSessionId}
                        onSessionSelect={(session) => setSelectedSessionId(session.session_id)}
                      />
                    </div>
                  </div>
                )}

                {/* Progress for applicable strategies */}
                {analytics && ['session_based', 'day_based', 'milestone_based'].includes(config.strategy) && (
                  <div className="mt-4">
                    <h4 className="text-md font-medium text-gray-900 mb-2">Overall Progress</h4>
                    <AttendanceProgress
                      current={analytics.current_count || 0}
                      total={analytics.total_count || 0}
                      strategy={config.strategy}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Show Strategy toggle if hidden */}
            {config && !showStrategyInfo && (
              <div className="mt-6">
                <button
                  onClick={() => setShowStrategyInfo(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Show Strategy Information
                </button>
              </div>
            )}
          </div>

          {/* Enhanced Controls */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between">
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-6 flex-1">
                {/* Enhanced Search */}
                <div className="relative min-w-0 flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by name, enrollment, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full shadow-sm transition-all duration-200"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Enhanced Status Filter with counts */}
                <div className="relative min-w-0 flex-1 max-w-xs">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white w-full shadow-sm transition-all duration-200"
                  >
                    {getStatusFilterOptions().map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label} ({option.count})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quick mode toggle */}
                <div className="flex-shrink-0">
                  <button
                    onClick={() => setQuickMode(!quickMode)}
                    className={`flex items-center gap-2 px-6 py-3 text-sm rounded-lg border transition-all duration-200 whitespace-nowrap ${
                      quickMode 
                        ? 'bg-orange-50 border-orange-200 text-orange-700 shadow-sm' 
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:shadow-sm'
                    }`}
                  >
                    <ScanLine className="w-4 h-4" />
                    Quick Mode
                  </button>
                </div>
              </div>

              {/* Enhanced Action Buttons */}
              <div className="flex gap-4 flex-wrap flex-shrink-0">
                {selectedRegistrations.length > 0 && (
                  <button
                    onClick={() => setShowBulkModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <UserCheck className="w-4 h-4" />
                    Mark Selected ({selectedRegistrations.length})
                  </button>
                )}
                
                {quickMode && (
                  <button
                    onClick={handleQuickMarkAll}
                    className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <Zap className="w-4 h-4" />
                    Quick Mark All Eligible
                  </button>
                )}
                
                <button
                  onClick={() => {/* TODO: Implement export */}}
                  className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md bg-white"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>

            {/* Quick stats bar */}
            <div className="mt-6 pt-6 border-t border-gray-100 flex gap-8 text-sm text-gray-600">
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Showing {filteredRegistrations.length} of {registrations.length} students
              </span>
              {searchTerm && (
                <span className="flex items-center gap-2 text-blue-600">
                  <Search className="w-3 h-3" />
                  Filtered by search
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="flex items-center gap-2 text-blue-600">
                  <Filter className="w-3 h-3" />
                  Filtered by status
                </span>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-xl mb-8 flex items-center gap-3 shadow-sm">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          {/* Content Area with proper spacing */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {viewMode === 'table' ? (
              <PhysicalAttendanceTable
                registrations={filteredRegistrations}
                selectedRegistrations={selectedRegistrations}
                onSelectRegistration={handleSelectRegistration}
                onSelectAll={handleSelectAll}
                onMarkAttendance={handleMarkPhysicalAttendance}
                loading={loading}
                quickMode={quickMode}
              />
            ) : (
              <div className="p-10">
                {/* Cards view implementation */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {filteredRegistrations.map((registration) => (
                    <div key={registration.registration_id} className="border border-gray-200 rounded-lg p-8 hover:shadow-md transition-all duration-200 bg-white">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedRegistrations.includes(registration.registration_id)}
                            onChange={(e) => handleSelectRegistration(registration.registration_id, e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {registration.virtual_attendance_id && (
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center" title="Virtual attendance marked">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </div>
                          )}
                          {registration.physical_attendance_id && (
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center" title="Physical attendance verified">
                              <UserCheck className="w-4 h-4 text-blue-600" />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <h3 className="font-semibold text-gray-900 mb-2">
                          {registration.student_data?.full_name || 'N/A'}
                        </h3>
                        <p className="text-sm text-gray-600 mb-1">{registration.student_enrollment}</p>
                        {registration.student_data?.email && (
                          <p className="text-xs text-gray-500">{registration.student_data.email}</p>
                        )}
                      </div>
                      
                      <div className="mb-4">
                        <AttendanceStatusBadge status={registration.final_attendance_status} />
                      </div>
                      
                      {!registration.physical_attendance_id ? (
                        <button
                          onClick={() => handleMarkPhysicalAttendance(registration.registration_id)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          <UserCheck className="w-4 h-4" />
                          Verify Present
                        </button>
                      ) : (
                        <div className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm bg-gray-100 text-gray-500 rounded-lg">
                          <CheckCircle className="w-4 h-4" />
                          Already Verified
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {filteredRegistrations.length === 0 && !loading && (
                  <div className="text-center py-16">
                    <Users className="w-16 h-16 text-gray-400 mx-auto mb-6" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">No registrations found</h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                      {searchTerm || statusFilter !== 'all' 
                        ? 'Try adjusting your search or filter criteria to find students' 
                        : 'No students have registered for this event yet'
                      }
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Enhanced Pagination */}
            {totalPages > 1 && (
              <div className="px-10 py-8 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-6 text-sm text-gray-600">
                  <span className="font-medium">Page {currentPage} of {totalPages}</span>
                  <span className="text-gray-400">•</span>
                  <span>Showing {Math.min(pageSize, filteredRegistrations.length)} of {registrations.length} students</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-all duration-200 bg-white shadow-sm"
                  >
                    First
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-all duration-200 bg-white shadow-sm"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-all duration-200 bg-white shadow-sm"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-all duration-200 bg-white shadow-sm"
                  >
                    Last
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Bulk Mark Modal */}
        {showBulkModal && (
          <BulkMarkModal
            selectedCount={selectedRegistrations.length}
            onConfirm={handleBulkMarkAttendance}
            onCancel={() => setShowBulkModal(false)}
            registrationIds={selectedRegistrations}
          />
        )}

        {/* Enhanced Notification Toast */}
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
              ) : notification.type === 'warning' ? (
                <AlertCircle className="w-6 h-6 mt-0.5" />
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
      </div>
    </AdminLayout>
  );
};

export default PhysicalAttendancePortal;
