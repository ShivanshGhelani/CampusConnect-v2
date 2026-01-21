import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Clock, 
  QrCode, 
  Calendar,
  UserCheck,
  Activity,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Users,
  TrendingUp
} from 'lucide-react';
import LoadingSpinner from '../../LoadingSpinner';
import SearchBox from '../../ui/SearchBox';
import { adminAPI } from '../../../api/admin';

const ScanHistoryModal = ({ isOpen, onClose, eventId, invitationCode }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scanHistory, setScanHistory] = useState([]);
  const [volunteerSessions, setVolunteerSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('scans'); // 'scans' | 'volunteers'
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen && eventId) {
      loadScanHistory();
    }
  }, [isOpen, eventId]);

  const loadScanHistory = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch scan history and volunteer sessions
      const response = await adminAPI.getScannerHistory(eventId, invitationCode);
      
      if (response.data.success) {
        setScanHistory(response.data.data.scans || []);
        setVolunteerSessions(response.data.data.volunteer_sessions || []);
        setStats(response.data.data.stats || null);
      } else {
        setError('Failed to load scan history');
      }
    } catch (err) {
      console.error('Error loading scan history:', err);
      setError('Error loading scan history');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    // Convert UTC to IST (UTC+5:30)
    const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
    
    return istDate.toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });
  };

  const getAttendanceTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'present': return 'text-green-600 bg-green-50';
      case 'absent': return 'text-red-600 bg-red-50';
      case 'partial': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (!isOpen) return null;

  // Filter scans based on search term
  const filteredScans = scanHistory.filter(scan => {
    const searchLower = searchTerm.toLowerCase();
    return (
      scan.participant_name?.toLowerCase().includes(searchLower) ||
      scan.registration_id?.toLowerCase().includes(searchLower) ||
      scan.marked_by?.toLowerCase().includes(searchLower) ||
      scan.session_name?.toLowerCase().includes(searchLower)
    );
  });

  // Filter volunteer sessions based on search term
  const filteredVolunteers = volunteerSessions.filter(session => {
    const searchLower = searchTerm.toLowerCase();
    return (
      session.volunteer_name?.toLowerCase().includes(searchLower) ||
      session.volunteer_contact?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-999 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full my-4 flex flex-col max-h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Scanner Activity</h2>
              <p className="text-sm text-gray-600">View all scans and volunteer sessions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-4 gap-3 p-4 border-b border-gray-200 bg-gray-50">
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <QrCode className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Total Scans</p>
                  <p className="text-xl font-bold text-gray-900">{stats.total_scans || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Volunteers</p>
                  <p className="text-xl font-bold text-gray-900">{stats.total_volunteers || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Unique Attendees</p>
                  <p className="text-xl font-bold text-gray-900">{stats.unique_attendees || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Active Sessions</p>
                  <p className="text-xl font-bold text-gray-900">{stats.active_sessions || 0}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          <button
            onClick={() => setActiveTab('scans')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'scans'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              Scan History ({filteredScans.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('volunteers')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'volunteers'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Volunteer Sessions ({filteredVolunteers.length})
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {/* Search Box - Positioned above content */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <SearchBox
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder={activeTab === 'scans' ? 'Search by name, ID, volunteer, or session...' : 'Search by volunteer name or contact...'}
              size="md"
              variant="default"
              searchIcon={true}
              clearIcon={true}
              debounceMs={300}
              showResultCount={true}
              resultCount={activeTab === 'scans' ? filteredScans.length : filteredVolunteers.length}
            />
          </div>
          
          <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-gray-600">Loading scan history...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <div>
                  <h3 className="font-medium text-red-800">Error</h3>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Scans Tab */}
              {activeTab === 'scans' && (
                <div className="space-y-3">
                  {filteredScans.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <QrCode className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {searchTerm ? 'No matching scans found' : 'No Scans Yet'}
                      </h3>
                      <p className="text-gray-600">
                        {searchTerm ? 'Try adjusting your search terms' : 'Scan history will appear here once volunteers start marking attendance'}
                      </p>
                    </div>
                  ) : (
                    filteredScans.map((scan, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <UserCheck className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm text-gray-900 truncate">
                                {scan.participant_name || 'Unknown Participant'}
                              </h4>
                              <p className="text-xs text-gray-500 truncate">{scan.registration_id || 'No ID'}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 flex-shrink-0">
                            <div className="text-xs">
                              <span className="text-gray-500">By: </span>
                              <span className="font-medium text-gray-900">{scan.marked_by || 'Unknown'}</span>
                            </div>
                            <div className="text-xs">
                              <span className="text-gray-500">{formatDateTime(scan.marked_at)}</span>
                            </div>
                            <div className="text-xs">
                              <span className="text-gray-500">{scan.session_name || scan.session_id || 'N/A'}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getAttendanceTypeColor(scan.attendance_status)}`}>
                              {scan.attendance_status || 'Unknown'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              scan.attendance_percentage >= 75 ? 'bg-green-100 text-green-700' :
                              scan.attendance_percentage >= 50 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {scan.attendance_percentage || 0}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Volunteers Tab */}
              {activeTab === 'volunteers' && (
                <div className="space-y-3">
                  {filteredVolunteers.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {searchTerm ? 'No matching volunteers found' : 'No Volunteer Sessions'}
                      </h3>
                      <p className="text-gray-600">
                        {searchTerm ? 'Try adjusting your search terms' : 'Volunteer sessions will appear here once they join using the scanner link'}
                      </p>
                    </div>
                  ) : (
                    filteredVolunteers.map((session, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm text-gray-900 truncate">{session.volunteer_name}</h4>
                              <p className="text-xs text-gray-500 truncate">{session.volunteer_contact}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 flex-shrink-0">
                            <div className="text-xs">
                              <span className="text-gray-500">Started: </span>
                              <span className="font-medium text-gray-900">{formatDateTime(session.created_at)}</span>
                            </div>
                            <div className="text-xs">
                              <span className="text-gray-500">Last: </span>
                              <span className="font-medium text-gray-900">{formatDateTime(session.last_activity)}</span>
                            </div>
                            <div className="text-xs flex items-center gap-1">
                              <QrCode className="w-3 h-3 text-gray-500" />
                              <span className="font-semibold text-gray-900">{session.total_scans || 0}</span>
                              <span className="text-gray-500">scans</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              new Date(session.expires_at) > new Date() 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {new Date(session.expires_at) > new Date() ? 'Active' : 'Expired'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={loadScanHistory}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScanHistoryModal;
