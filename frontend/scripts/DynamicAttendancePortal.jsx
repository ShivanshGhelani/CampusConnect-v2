import React, { useState, useEffect, useCallback } from 'react';
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
  Calendar,
  Target,
  Activity,
  Timer,
  PlayCircle,
  PauseCircle,
  StopCircle
} from 'lucide-react';
import AdminLayout from '../AdminLayout';
import LoadingSpinner from '../../LoadingSpinner';
import api from '../../../api/base';

// Strategy-specific components
const SingleMarkInterface = ({ students, onMarkAttendance, loading }) => (
  <div className="space-y-4">
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center space-x-2">
        <Target className="w-5 h-5 text-blue-600" />
        <h3 className="text-sm font-medium text-blue-900">Single Mark Strategy</h3>
      </div>
      <p className="text-sm text-blue-700 mt-1">
        Students need to mark attendance once during the event to be considered present.
      </p>
    </div>
    <StudentList students={students} onMarkAttendance={onMarkAttendance} loading={loading} />
  </div>
);

const SessionBasedInterface = ({ sessions, students, onMarkAttendance, loading }) => {
  const [selectedSession, setSelectedSession] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState({});

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const newTimeRemaining = {};
      
      sessions.forEach(session => {
        if (session.status === 'active') {
          const endTime = new Date(session.end_time);
          const remaining = Math.max(0, endTime - now);
          newTimeRemaining[session.session_id] = remaining;
        }
      });
      
      setTimeRemaining(newTimeRemaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [sessions]);

  const formatTime = (milliseconds) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getSessionStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSessionIcon = (status) => {
    switch (status) {
      case 'active': return PlayCircle;
      case 'pending': return Clock;
      case 'completed': return CheckCircle;
      default: return PauseCircle;
    }
  };

  return (
    <div className="space-y-6">
      {/* Strategy Info */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-purple-600" />
          <h3 className="text-sm font-medium text-purple-900">Session-Based Strategy</h3>
        </div>
        <p className="text-sm text-purple-700 mt-1">
          Students must attend at least 75% of sessions to be marked present.
        </p>
      </div>

      {/* Session Management */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Management</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {sessions.map((session) => {
            const StatusIcon = getSessionIcon(session.status);
            const isActive = session.status === 'active';
            const remaining = timeRemaining[session.session_id];
            
            return (
              <div
                key={session.session_id}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedSession?.session_id === session.session_id
                    ? 'ring-2 ring-blue-500 border-blue-300'
                    : 'border-gray-200 hover:border-gray-300'
                } ${isActive ? 'bg-green-50' : ''}`}
                onClick={() => setSelectedSession(session)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <StatusIcon className={`w-4 h-4 ${isActive ? 'text-green-600' : 'text-gray-600'}`} />
                    <span className="text-sm font-medium text-gray-900">{session.session_name}</span>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSessionStatusColor(session.status)}`}>
                    {session.status}
                  </span>
                </div>
                
                {isActive && remaining && (
                  <div className="flex items-center space-x-2 text-sm text-green-700">
                    <Timer className="w-4 h-4" />
                    <span>Ends in {formatTime(remaining)}</span>
                  </div>
                )}
                
                {session.status === 'pending' && (
                  <div className="text-xs text-gray-500">
                    Starts: {new Date(session.start_time).toLocaleString()}
                  </div>
                )}
                
                {session.is_mandatory && (
                  <div className="text-xs text-red-600 mt-1">Mandatory</div>
                )}
              </div>
            );
          })}
        </div>

        {selectedSession && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">
              Marking Attendance for: {selectedSession.session_name}
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              {selectedSession.status === 'active' 
                ? 'This session is currently active. You can mark attendance now.'
                : selectedSession.status === 'pending'
                ? 'This session hasn\'t started yet.'
                : 'This session has ended.'
              }
            </p>
            
            {selectedSession.status === 'active' && (
              <button
                onClick={() => onMarkAttendance(null, selectedSession.session_id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Mark Attendance for Active Students
              </button>
            )}
          </div>
        )}
      </div>

      {/* Student List for Selected Session */}
      {selectedSession && (
        <StudentList 
          students={students} 
          onMarkAttendance={(studentId) => onMarkAttendance(studentId, selectedSession.session_id)}
          loading={loading}
          sessionContext={selectedSession}
        />
      )}
    </div>
  );
};

const DayBasedInterface = ({ sessions, students, onMarkAttendance, loading }) => {
  const getDayFromSession = (session) => {
    return new Date(session.start_time).toDateString();
  };

  const groupSessionsByDay = (sessions) => {
    const grouped = {};
    sessions.forEach(session => {
      const day = getDayFromSession(session);
      if (!grouped[day]) {
        grouped[day] = [];
      }
      grouped[day].push(session);
    });
    return grouped;
  };

  const dayGroups = groupSessionsByDay(sessions);
  const [selectedDay, setSelectedDay] = useState(Object.keys(dayGroups)[0]);

  return (
    <div className="space-y-6">
      {/* Strategy Info */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-green-600" />
          <h3 className="text-sm font-medium text-green-900">Day-Based Strategy</h3>
        </div>
        <p className="text-sm text-green-700 mt-1">
          Students must attend at least 80% of event days to be marked present.
        </p>
      </div>

      {/* Day Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Day Selection</h3>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.keys(dayGroups).map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedDay === day
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {new Date(day).toLocaleDateString(undefined, { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
              })}
            </button>
          ))}
        </div>

        {selectedDay && dayGroups[selectedDay] && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dayGroups[selectedDay].map((session) => (
              <div key={session.session_id} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900">{session.session_name}</h4>
                <p className="text-sm text-gray-600">
                  {new Date(session.start_time).toLocaleTimeString()} - 
                  {new Date(session.end_time).toLocaleTimeString()}
                </p>
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full mt-2 ${
                  session.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {session.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Student List for Selected Day */}
      <StudentList 
        students={students} 
        onMarkAttendance={onMarkAttendance}
        loading={loading}
        dayContext={selectedDay}
      />
    </div>
  );
};

const MilestoneInterface = ({ sessions, students, onMarkAttendance, loading }) => {
  const milestones = sessions.filter(session => session.session_type === 'milestone');
  
  return (
    <div className="space-y-6">
      {/* Strategy Info */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <Target className="w-5 h-5 text-yellow-600" />
          <h3 className="text-sm font-medium text-yellow-900">Milestone-Based Strategy</h3>
        </div>
        <p className="text-sm text-yellow-700 mt-1">
          Students must complete all mandatory milestones to be marked present.
        </p>
      </div>

      {/* Milestone Progress */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Milestone Progress</h3>
        
        <div className="space-y-4">
          {milestones.map((milestone, index) => (
            <div key={milestone.session_id} className="flex items-center space-x-4">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                milestone.status === 'completed' 
                  ? 'bg-green-100 text-green-800'
                  : milestone.status === 'active'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {index + 1}
              </div>
              
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900">{milestone.session_name}</h4>
                <p className="text-xs text-gray-600">{milestone.session_type}</p>
              </div>
              
              <div className={`px-3 py-1 text-xs font-medium rounded-full ${
                milestone.status === 'completed' 
                  ? 'bg-green-100 text-green-800'
                  : milestone.status === 'active'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {milestone.status}
              </div>
              
              {milestone.is_mandatory && (
                <span className="text-xs text-red-600">Required</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <StudentList students={students} onMarkAttendance={onMarkAttendance} loading={loading} />
    </div>
  );
};

const ContinuousInterface = ({ sessions, students, onMarkAttendance, loading }) => (
  <div className="space-y-6">
    {/* Strategy Info */}
    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
      <div className="flex items-center space-x-2">
        <Activity className="w-5 h-5 text-indigo-600" />
        <h3 className="text-sm font-medium text-indigo-900">Continuous Monitoring Strategy</h3>
      </div>
      <p className="text-sm text-indigo-700 mt-1">
        Students must maintain 90% engagement throughout the event duration.
      </p>
    </div>

    {/* Real-time Monitoring */}
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Real-time Engagement</h3>
      <p className="text-sm text-gray-600 mb-4">
        Continuous monitoring tracks student engagement through multiple checkpoints.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">90%</div>
          <div className="text-sm text-blue-800">Required Engagement</div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{sessions.length}</div>
          <div className="text-sm text-green-800">Check Points</div>
        </div>
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">Live</div>
          <div className="text-sm text-purple-800">Monitoring</div>
        </div>
      </div>
    </div>

    <StudentList students={students} onMarkAttendance={onMarkAttendance} loading={loading} />
  </div>
);

const StudentList = ({ students, onMarkAttendance, loading, sessionContext, dayContext }) => (
  <div className="bg-white rounded-lg border border-gray-200">
    <div className="px-6 py-4 border-b border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900">
        Student Registrations
        {sessionContext && ` - ${sessionContext.session_name}`}
        {dayContext && ` - ${new Date(dayContext).toLocaleDateString()}`}
      </h3>
    </div>
    
    <div className="divide-y divide-gray-200">
      {students.map((student) => (
        <div key={student.id} className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">{student.name}</h4>
              <p className="text-sm text-gray-600">{student.enrollment}</p>
            </div>
          </div>
          
          <button
            onClick={() => onMarkAttendance(student.id)}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Marking...' : 'Mark Present'}
          </button>
        </div>
      ))}
    </div>
  </div>
);

const DynamicAttendancePortal = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  
  // Core state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attendanceConfig, setAttendanceConfig] = useState(null);
  const [activeSessions, setActiveSessions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [students, setStudents] = useState([]);
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [markingLoading, setMarkingLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  
  // Initialize data
  useEffect(() => {
    loadAttendanceData();
  }, [eventId]);

  // Auto-refresh active sessions
  useEffect(() => {
    const interval = setInterval(loadActiveSessions, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [eventId]);

  const loadAttendanceData = async () => {
    setLoading(true);
    try {
      // Load attendance configuration
      await loadAttendanceConfig();
      
      // Load active sessions
      await loadActiveSessions();
      
      // Load analytics
      await loadAnalytics();
      
      // Load students (using old API for now, but can be migrated)
      await loadStudents();
      
    } catch (err) {
      setError('Failed to load attendance data');
      console.error('Error loading attendance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendanceConfig = async () => {
    try {
      const response = await api.get(`/api/v1/attendance/config/${eventId}`);
      if (response.data.success) {
        setAttendanceConfig(response.data.data);
      } else {
        // Try to initialize if config doesn't exist
        const initResponse = await api.post(`/api/v1/attendance/initialize/${eventId}`);
        if (initResponse.data.success) {
          // Reload config after initialization
          const configResponse = await api.get(`/api/v1/attendance/config/${eventId}`);
          if (configResponse.data.success) {
            setAttendanceConfig(configResponse.data.data);
          }
        }
      }
    } catch (err) {
      console.error('Error loading attendance config:', err);
      // Fall back to single-mark strategy
      setAttendanceConfig({
        strategy: 'single_mark',
        sessions: [{
          session_id: 'default',
          session_name: 'Main Session',
          session_type: 'single',
          status: 'active',
          is_mandatory: true
        }]
      });
    }
  };

  const loadActiveSessions = async () => {
    try {
      const response = await api.get(`/api/v1/attendance/sessions/${eventId}/active`);
      if (response.data.success) {
        setActiveSessions(response.data.data);
      }
    } catch (err) {
      console.error('Error loading active sessions:', err);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await api.get(`/api/v1/attendance/analytics/${eventId}`);
      if (response.data.success) {
        setAnalytics(response.data.data);
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
    }
  };

  const loadStudents = async () => {
    try {
      // For now, use existing registration API
      // TODO: Migrate to unified API
      const response = await api.get(`/api/v1/admin/event-registration/event/${eventId}`);
      if (response.data.success) {
        const registrations = response.data.data.registrations || [];
        const formattedStudents = registrations.map(reg => ({
          id: reg.registration_id,
          name: reg.student_data?.full_name || 'Unknown',
          enrollment: reg.student_enrollment,
          status: reg.final_attendance_status || 'pending'
        }));
        setStudents(formattedStudents);
      }
    } catch (err) {
      console.error('Error loading students:', err);
    }
  };

  const handleMarkAttendance = async (studentId, sessionId = null) => {
    setMarkingLoading(true);
    try {
      let student;
      if (studentId) {
        student = students.find(s => s.id === studentId);
      }
      
      if (studentId && !student) {
        throw new Error('Student not found');
      }

      // Use new dynamic attendance API
      const response = await api.post(`/api/v1/attendance/mark/${eventId}`, {
        student_enrollment: student?.enrollment,
        session_id: sessionId,
        notes: `Marked via dynamic attendance portal`
      });

      if (response.data.success) {
        showNotification(
          `Attendance marked successfully${sessionId ? ` for ${response.data.data.session_name}` : ''}`,
          'success'
        );
        
        // Refresh data
        await loadAnalytics();
        await loadStudents();
      } else {
        throw new Error(response.data.message || 'Failed to mark attendance');
      }
      
    } catch (err) {
      showNotification(err.message || 'Failed to mark attendance', 'error');
      console.error('Error marking attendance:', err);
    } finally {
      setMarkingLoading(false);
    }
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const renderStrategyInterface = () => {
    if (!attendanceConfig) return null;

    const strategy = attendanceConfig.strategy;
    const sessions = attendanceConfig.sessions || [];
    const filteredStudents = students.filter(student =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.enrollment.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const props = {
      sessions,
      students: filteredStudents,
      onMarkAttendance: handleMarkAttendance,
      loading: markingLoading
    };

    switch (strategy) {
      case 'session_based':
        return <SessionBasedInterface {...props} />;
      case 'day_based':
        return <DayBasedInterface {...props} />;
      case 'milestone_based':
        return <MilestoneInterface {...props} />;
      case 'continuous':
        return <ContinuousInterface {...props} />;
      default:
        return <SingleMarkInterface {...props} />;
    }
  };

  if (loading) {
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
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
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
                  <h1 className="text-3xl font-bold text-gray-900">Dynamic Attendance Portal</h1>
                  <p className="text-gray-600 mt-1">
                    {attendanceConfig ? 
                      `${attendanceConfig.strategy.replace('_', ' ').toUpperCase()} Strategy` : 
                      'Loading strategy...'
                    }
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={loadAttendanceData}
                  className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:shadow-sm transition-all duration-200"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Notifications */}
          {notification && (
            <div className={`mb-6 p-4 rounded-lg ${
              notification.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
              notification.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
              'bg-blue-50 text-blue-800 border border-blue-200'
            }`}>
              {notification.message}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-800 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          {/* Strategy-specific Interface */}
          {renderStrategyInterface()}
        </div>
      </div>
    </AdminLayout>
  );
};

export default DynamicAttendancePortal;
