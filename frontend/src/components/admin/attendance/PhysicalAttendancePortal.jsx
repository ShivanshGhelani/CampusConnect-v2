import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Users, 
  Search, 
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  UserCheck,
  RefreshCw,
  Activity,
  Target,
  Calendar,
  Flag,
  Award,
  QrCode,
  ExternalLink,
  Copy,
  Timer,
  Shield
} from 'lucide-react';
import AdminLayout from '../AdminLayout';
import LoadingSpinner from '../../LoadingSpinner';
import Modal from '../../ui/Modal';
import Toast from '../../ui/Toast';
import { adminAPI } from '../../../api/admin';

const UnifiedAttendancePortal = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [config, setConfig] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [filteredParticipants, setFilteredParticipants] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSession, setSelectedSession] = useState(null);
  const [notification, setNotification] = useState(null);
  
  // Scanner token state
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scannerToken, setScannerToken] = useState(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState('');

  useEffect(() => {
    loadAttendanceData();
  }, [eventId]);

  useEffect(() => {
    filterParticipants();
  }, [searchTerm, statusFilter, participants]);

  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      
      // Load config and participants
      const configResponse = await adminAPI.getAttendanceConfigAndParticipants(eventId);
      if (configResponse.data.success) {
        setConfig(configResponse.data.data.config);
        setParticipants(configResponse.data.data.participants);
      }
      
      // Load analytics
      const analyticsResponse = await adminAPI.getAttendanceAnalytics(eventId);
      if (analyticsResponse.data.success) {
        setAnalytics(analyticsResponse.data.data);
      }
      
    } catch (err) {
      console.error('Error loading attendance data:', err);
      setError('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const filterParticipants = () => {
    let filtered = [...participants];
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(participant => {
        const student = participant.student;
        const faculty = participant.faculty;
        const searchLower = searchTerm.toLowerCase();
        
        if (student) {
          return student.name?.toLowerCase().includes(searchLower) ||
                 student.enrollment_no?.toLowerCase().includes(searchLower) ||
                 student.email?.toLowerCase().includes(searchLower);
        } else if (faculty) {
          return faculty.name?.toLowerCase().includes(searchLower) ||
                 faculty.employee_id?.toLowerCase().includes(searchLower) ||
                 faculty.email?.toLowerCase().includes(searchLower);
        }
        return false;
      });
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(participant => {
        const attendance = participant.attendance || {};
        return attendance.status === statusFilter;
      });
    }
    
    setFilteredParticipants(filtered);
  };

  const markAttendance = async (registrationId, attendanceType, sessionId = null) => {
    try {
      const attendanceData = {
        registration_id: registrationId,
        attendance_type: attendanceType,
        session_id: sessionId,
        notes: `Marked via unified portal`
      };
      
      const response = await adminAPI.markAttendance(attendanceData);
      
      if (response.data.success) {
        showNotification('Attendance marked successfully', 'success');
        // Reload data to get updated attendance
        await loadAttendanceData();
      } else {
        showNotification('Failed to mark attendance', 'error');
      }
    } catch (err) {
      console.error('Error marking attendance:', err);
      showNotification('Error marking attendance', 'error');
    }
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const generateScannerToken = async (expiresInHours = 24) => {
    try {
      setTokenLoading(true);
      setTokenError('');
      
      const response = await adminAPI.generateScannerToken(eventId, expiresInHours);
      
      if (response.data.success) {
        setScannerToken(response.data.data);
        showNotification('Scanner token generated successfully!', 'success');
      } else {
        setTokenError('Failed to generate scanner token');
      }
    } catch (err) {
      console.error('Error generating scanner token:', err);
      setTokenError('Error generating scanner token');
    } finally {
      setTokenLoading(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showNotification('Copied to clipboard!', 'success');
    } catch (err) {
      console.error('Failed to copy:', err);
      showNotification('Failed to copy to clipboard', 'error');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'absent': return <X className="w-4 h-4 text-red-500" />;
      case 'partial': return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStrategyIcon = (strategy) => {
    switch (strategy) {
      case 'session_based': return <Activity className="w-5 h-5" />;
      case 'day_based': return <Calendar className="w-5 h-5" />;
      case 'milestone_based': return <Flag className="w-5 h-5" />;
      case 'single_mark': return <Target className="w-5 h-5" />;
      default: return <UserCheck className="w-5 h-5" />;
    }
  };

  const renderStrategyInfo = () => {
    if (!config) return null;

    const strategy = config.attendance_strategy;
    const attendanceConfig = config.attendance_config || {};
    const sessions = attendanceConfig.sessions || [];

    // Safely format strategy name
    const formatStrategyName = (strategyName) => {
      if (!strategyName || typeof strategyName !== 'string') {
        return 'Unknown Strategy';
      }
      return strategyName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
      <div className="bg-white rounded-lg shadow mb-6 p-6">
        <div className="flex items-center gap-3 mb-4">
          {getStrategyIcon(strategy)}
          <div>
            <h3 className="text-lg font-semibold">
              {formatStrategyName(strategy)} Strategy
            </h3>
            <p className="text-sm text-gray-600">
              {config.attendance_mandatory ? 'Attendance is mandatory' : 'Attendance is optional'}
            </p>
          </div>
        </div>

        {sessions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((session, index) => (
              <div 
                key={session.session_id} 
                className={`p-4 rounded-lg border ${
                  selectedSession === session.session_id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                } cursor-pointer transition-colors`}
                onClick={() => setSelectedSession(
                  selectedSession === session.session_id ? null : session.session_id
                )}
              >
                <div className="font-medium text-sm">{session.session_name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Weight: {session.weight || 1} | Duration: {session.duration_minutes || 'N/A'} min
                </div>
                {session.is_mandatory && (
                  <div className="text-xs text-red-600 mt-1">Mandatory</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderParticipantsList = () => {
    if (filteredParticipants.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No participants found
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {filteredParticipants.map((participant) => {
          const attendance = participant.attendance || {};
          const isStudent = participant.participant_type === 'student';
          const profile = isStudent ? participant.student : participant.faculty;
          const team = participant.team;

          return (
            <div key={participant.registration_id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(attendance.status)}
                      <span className="font-medium">
                        {profile.name}
                      </span>
                      <span className="text-sm text-gray-500">
                        ({isStudent ? profile.enrollment_no : profile.employee_id})
                      </span>
                    </div>
                    {team && (
                      <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                        Team: {team.team_name}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-600 mt-1">
                    {profile.email} | {isStudent ? profile.department : participant.faculty.designation}
                  </div>
                  
                  <div className="flex items-center gap-4 mt-2">
                    <div className="text-sm">
                      Status: <span className={`font-medium ${
                        attendance.status === 'present' ? 'text-green-600' :
                        attendance.status === 'absent' ? 'text-red-600' :
                        attendance.status === 'partial' ? 'text-yellow-600' :
                        'text-gray-600'
                      }`}>
                        {attendance.status || 'pending'}
                      </span>
                    </div>
                    <div className="text-sm">
                      Percentage: <span className="font-medium">{attendance.percentage || 0}%</span>
                    </div>
                    {attendance.sessions_attended > 0 && (
                      <div className="text-sm">
                        Sessions: {attendance.sessions_attended}/{attendance.total_sessions}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {config?.attendance_strategy === 'single_mark' ? (
                    <>
                      <button
                        onClick={() => markAttendance(participant.registration_id, 'present')}
                        className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                        disabled={attendance.status === 'present'}
                      >
                        Present
                      </button>
                      <button
                        onClick={() => markAttendance(participant.registration_id, 'absent')}
                        className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                        disabled={attendance.status === 'absent'}
                      >
                        Absent
                      </button>
                    </>
                  ) : (
                    selectedSession && (
                      <>
                        <button
                          onClick={() => markAttendance(participant.registration_id, 'present', selectedSession)}
                          className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                        >
                          Mark Present
                        </button>
                        <button
                          onClick={() => markAttendance(participant.registration_id, 'absent', selectedSession)}
                          className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                        >
                          Mark Absent
                        </button>
                      </>
                    )
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <LoadingSpinner />
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <div>
                <h3 className="font-medium text-red-800">Error</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/events')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Events
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Attendance Management
              </h1>
              <p className="text-gray-600">{config?.event_name}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowScannerModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              <QrCode className="w-4 h-4" />
              Generate Scanner
            </button>
            <button
              onClick={loadAttendanceData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Registered</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.total_registered}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Present</p>
                  <p className="text-2xl font-bold text-green-600">{analytics.total_present}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Absent</p>
                  <p className="text-2xl font-bold text-red-600">{analytics.total_absent}</p>
                </div>
                <X className="w-8 h-8 text-red-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
                  <p className="text-2xl font-bold text-blue-600">{analytics.attendance_rate}%</p>
                </div>
                <Target className="w-8 h-8 text-blue-500" />
              </div>
            </div>
          </div>
        )}

        {/* Strategy Info */}
        {renderStrategyInfo()}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search participants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="partial">Partial</option>
            </select>
          </div>
        </div>

        {/* Participants List */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">
            Participants ({filteredParticipants.length})
            {config?.attendance_strategy !== 'single_mark' && !selectedSession && (
              <span className="ml-2 text-sm text-amber-600">
                Please select a session above to mark attendance
              </span>
            )}
          </h2>
          {renderParticipantsList()}
        </div>

        {/* Notification */}
        {notification && (
          <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white`}>
            {notification.message}
          </div>
        )}

        {/* Scanner Token Modal */}
        <Modal
          isOpen={showScannerModal}
          onClose={() => {
            setShowScannerModal(false);
            setScannerToken(null);
            setTokenError('');
          }}
          title="Generate QR Scanner Link"
          size="lg"
          headerIcon={<QrCode className="w-5 h-5" />}
        >
          <div className="space-y-6">
            {!scannerToken ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-800">Secure Scanner Access</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Generate a secure, time-limited link that allows volunteers to mark attendance using QR codes without admin access.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Token Expiration
                  </label>
                  <select 
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => {
                      // Store selected value for when generating token
                      e.target.dataset.selectedHours = e.target.value;
                    }}
                    defaultValue="24"
                  >
                    <option value="1">1 Hour</option>
                    <option value="6">6 Hours</option>
                    <option value="12">12 Hours</option>
                    <option value="24">24 Hours (Recommended)</option>
                    <option value="48">48 Hours</option>
                    <option value="72">72 Hours</option>
                    <option value="168">1 Week</option>
                  </select>
                </div>

                {tokenError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span className="text-red-700 text-sm">{tokenError}</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    const select = document.querySelector('select[data-selected-hours]');
                    const hours = parseInt(select?.value || '24');
                    generateScannerToken(hours);
                  }}
                  disabled={tokenLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {tokenLoading ? (
                    <>
                      <LoadingSpinner />
                      Generating...
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4" />
                      Generate Scanner Link
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-800">Scanner Link Generated!</h4>
                      <p className="text-sm text-green-700 mt-1">
                        Share this link with volunteers to allow them to mark attendance. The link expires on {new Date(scannerToken.expires_at).toLocaleString()}.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scanner URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={scannerToken.scanner_url}
                      readOnly
                      className="flex-1 p-3 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(scannerToken.scanner_url)}
                      className="px-3 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Event</div>
                    <div className="font-medium text-sm">{scannerToken.event_name}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Expires In</div>
                    <div className="font-medium text-sm flex items-center gap-1">
                      <Timer className="w-3 h-3" />
                      {scannerToken.expires_in_hours} hours
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => window.open(scannerToken.scanner_url, '_blank')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Scanner
                  </button>
                  <button
                    onClick={() => copyToClipboard(scannerToken.scanner_url)}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p>• This link allows marking attendance without admin login</p>
                  <p>• Share only with trusted volunteers</p>
                  <p>• Link automatically expires after the specified time</p>
                  <p>• You can generate new links anytime</p>
                </div>
              </>
            )}
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
};

export default UnifiedAttendancePortal;
