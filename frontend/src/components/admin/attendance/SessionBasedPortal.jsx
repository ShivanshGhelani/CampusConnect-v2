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
  Activity,
  Calendar,
  Target,
  TrendingUp,
  BarChart3,
  Timer,
  PlayCircle,
  PauseCircle,
  StopCircle
} from 'lucide-react';
import AdminLayout from '../AdminLayout';
import LoadingSpinner from '../../LoadingSpinner';
import { useDynamicAttendance } from '../../../hooks/useDynamicAttendance';
import { 
  StrategyInfoCard, 
  SessionStatus, 
  SessionTimer, 
  AttendanceProgress, 
  SessionGrid 
} from './StrategyComponents';
import { SessionsView, StudentsView, AnalyticsView, BulkSessionModal } from './SessionViewComponents';
import api from '../../../api/base';

const SessionBasedPortal = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  
  // Dynamic attendance hook
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
    getSessionProgress: getHookSessionProgress,
    refreshData
  } = useDynamicAttendance(eventId);
  
  // Local state
  const [registrations, setRegistrations] = useState([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [sessionStats, setSessionStats] = useState({});
  const [selectedRegistrations, setSelectedRegistrations] = useState([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [notification, setNotification] = useState(null);
  const [viewMode, setViewMode] = useState('sessions'); // 'sessions', 'students', 'analytics'
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Initialize
  useEffect(() => {
    loadConfig().then(() => {
      fetchSessionRegistrations();
    }).catch(err => {
      console.error('Failed to load session-based configuration:', err);
      setError('This event is not configured for session-based attendance');
    });
  }, [eventId, loadConfig]);

  // Update current session
  useEffect(() => {
    if (sessions?.length > 0) {
      const active = getCurrentSession();
      setCurrentSession(active);
      if (active && !selectedSessionId) {
        setSelectedSessionId(active.session_id);
      } else if (!selectedSessionId) {
        setSelectedSessionId(sessions[0].session_id);
      }
    }
  }, [sessions, getCurrentSession, selectedSessionId]);

  // Load session-specific registrations
  useEffect(() => {
    if (selectedSessionId) {
      fetchSessionRegistrations();
      fetchSessionStats();
    }
  }, [selectedSessionId]);

  // Auto-refresh
  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(async () => {
        await Promise.all([
          fetchSessionRegistrations(),
          fetchSessionStats(),
          refreshData()
        ]);
      }, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, selectedSessionId, refreshData]);

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

  const fetchSessionRegistrations = async () => {
    if (!selectedSessionId) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/api/v1/attendance/sessions/${selectedSessionId}/registrations`);
      
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
      console.error('Error fetching session registrations:', err);
      setError('Failed to load session registrations');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionStats = async () => {
    if (!selectedSessionId) return;
    
    try {
      const response = await api.get(`/api/v1/attendance/sessions/${selectedSessionId}/stats`);
      if (response.data.success) {
        setSessionStats(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching session stats:', err);
    }
  };

  const handleMarkSessionAttendance = async (registrationId, notes = '') => {
    if (!selectedSessionId) {
      showNotification('Please select a session first', 'error');
      return;
    }

    try {
      const result = await markAttendance(registrationId, {
        notes,
        session_id: selectedSessionId,
        verification_method: 'physical'
      });
      
      if (result.success) {
        showNotification('Session attendance marked successfully', 'success');
        await Promise.all([
          fetchSessionRegistrations(),
          fetchSessionStats(),
          refreshData()
        ]);
      } else {
        showNotification(result.message || 'Failed to mark session attendance', 'error');
      }
    } catch (err) {
      console.error('Error marking session attendance:', err);
      showNotification('Network error while marking attendance', 'error');
    }
  };

  const handleBulkSessionMark = async (registrationIds, notes) => {
    if (!selectedSessionId) {
      showNotification('Please select a session first', 'error');
      return;
    }

    try {
      const result = await bulkMarkAttendance(registrationIds, {
        notes,
        session_id: selectedSessionId,
        verification_method: 'physical'
      });
      
      if (result.success) {
        const successCount = result.successful?.length || registrationIds.length;
        showNotification(`${successCount} students marked for this session`, 'success');
        setSelectedRegistrations([]);
        setShowBulkModal(false);
        
        await Promise.all([
          fetchSessionRegistrations(),
          fetchSessionStats(),
          refreshData()
        ]);
      } else {
        showNotification(result.message || 'Failed to mark bulk attendance', 'error');
      }
    } catch (err) {
      console.error('Error marking bulk session attendance:', err);
      showNotification('Network error while marking bulk attendance', 'error');
    }
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSessionSelect = (session) => {
    setSelectedSessionId(session.session_id);
    setSelectedRegistrations([]);
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchSessionRegistrations(),
        fetchSessionStats(),
        refreshData()
      ]);
      showNotification('Session data refreshed successfully', 'success');
    } catch (error) {
      console.error('Error refreshing session data:', error);
      showNotification('Error refreshing data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getSessionProgress = (sessionId) => {
    if (!sessionStats[sessionId]) return { attended: 0, total: registrations.length };
    return {
      attended: sessionStats[sessionId].attended || 0,
      total: sessionStats[sessionId].total || registrations.length
    };
  };

  const getOverallProgress = () => {
    if (!sessions?.length || !config?.criteria?.minimum_percentage) return null;
    
    const totalSessions = sessions.length;
    const attendedSessions = sessions.filter(session => {
      const progress = getSessionProgress(session.session_id);
      return progress.attended > 0;
    }).length;
    
    const progressPercentage = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0;
    const requiredPercentage = config.criteria.minimum_percentage;
    
    return {
      current: attendedSessions,
      total: totalSessions,
      percentage: progressPercentage,
      required: requiredPercentage,
      isOnTrack: progressPercentage >= requiredPercentage
    };
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

  if (error || (config && config.strategy !== 'session_based')) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Session-Based Attendance Not Available</h3>
            <p className="text-gray-600 mb-4">
              {error || 'This event is not configured for session-based attendance tracking.'}
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

  const selectedSession = sessions?.find(s => s.session_id === selectedSessionId);
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
                    <Activity className="w-8 h-8 text-purple-600" />
                    Session-Based Attendance
                  </h1>
                  <p className="text-gray-600 mt-1">Manage attendance across multiple sessions</p>
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
                    onClick={() => setViewMode('sessions')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm transition-all duration-200 rounded-l-lg ${
                      viewMode === 'sessions' 
                        ? 'bg-purple-50 text-purple-700 border-r border-purple-200' 
                        : 'text-gray-700 hover:bg-gray-50 border-r border-gray-300'
                    }`}
                  >
                    <Activity className="w-4 h-4" />
                    Sessions
                  </button>
                  <button
                    onClick={() => setViewMode('students')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm transition-all duration-200 ${
                      viewMode === 'students' 
                        ? 'bg-purple-50 text-purple-700 border-r border-purple-200' 
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
                        ? 'bg-purple-50 text-purple-700' 
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
                  sessions={sessions}
                />
              </div>
            )}

            {/* Overall Progress */}
            {overallProgress && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    Overall Session Progress
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
                  strategy="session_based"
                />
                
                <div className="mt-4 text-sm text-gray-600">
                  {overallProgress.current} of {overallProgress.total} sessions have attendance recorded
                  • Required: {overallProgress.required}% minimum attendance
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          {viewMode === 'sessions' && (
            <SessionsView 
              sessions={sessions}
              selectedSessionId={selectedSessionId}
              onSessionSelect={handleSessionSelect}
              currentSession={currentSession}
              getSessionProgress={getSessionProgress}
            />
          )}

          {viewMode === 'students' && (
            <StudentsView 
              registrations={filteredRegistrations}
              selectedSession={selectedSession}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              selectedRegistrations={selectedRegistrations}
              setSelectedRegistrations={setSelectedRegistrations}
              onMarkAttendance={handleMarkSessionAttendance}
              onBulkMark={() => setShowBulkModal(true)}
              loading={loading}
            />
          )}

          {viewMode === 'analytics' && (
            <AnalyticsView 
              sessions={sessions}
              analytics={analytics}
              sessionStats={sessionStats}
              config={config}
            />
          )}
        </div>
      </div>

      {/* Bulk Mark Modal */}
      {showBulkModal && (
        <BulkSessionModal
          selectedCount={selectedRegistrations.length}
          sessionName={selectedSession?.session_name}
          onConfirm={handleBulkSessionMark}
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

export default SessionBasedPortal;
