import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  UserCheck,
  Calendar,
  Timer,
  PlayCircle,
  PauseCircle,
  StopCircle,
  BarChart3,
  TrendingUp,
  Target
} from 'lucide-react';
import { SessionStatus, SessionTimer, AttendanceProgress } from './StrategyComponents';

// Sessions View Component
export const SessionsView = ({ 
  sessions, 
  selectedSessionId, 
  onSessionSelect, 
  currentSession,
  getSessionProgress 
}) => {
  if (!sessions?.length) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-6" />
          <h3 className="text-xl font-semibold text-gray-900 mb-3">No Sessions Available</h3>
          <p className="text-gray-500">Sessions haven't been configured for this event yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Session Highlight */}
      {currentSession && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-purple-900 mb-2 flex items-center gap-2">
                <PlayCircle className="w-5 h-5" />
                Current Active Session
              </h3>
              <p className="text-purple-700 font-medium">{currentSession.session_name}</p>
              <p className="text-purple-600 text-sm">
                Started: {new Date(currentSession.start_time).toLocaleTimeString()}
              </p>
            </div>
            <div className="text-right">
              <SessionStatus status={currentSession.status} />
              <div className="mt-2">
                <SessionTimer 
                  endTime={currentSession.end_time}
                  onExpired={() => console.log('Session expired')}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sessions Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-600" />
          All Sessions
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => {
            const progress = getSessionProgress(session.session_id);
            const isSelected = selectedSessionId === session.session_id;
            const isActive = session.status === 'active';
            const isCompleted = session.status === 'completed';
            
            return (
              <div
                key={session.session_id}
                onClick={() => onSessionSelect(session)}
                className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'ring-2 ring-purple-500 border-purple-300 bg-purple-50'
                    : isActive
                    ? 'border-green-200 bg-green-50 hover:border-green-300'
                    : isCompleted
                    ? 'border-blue-200 bg-blue-50 hover:border-blue-300'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900 truncate">{session.session_name}</h4>
                  <SessionStatus status={session.status} isCompact />
                </div>
                
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {new Date(session.start_time).toLocaleTimeString()} - 
                    {new Date(session.end_time).toLocaleTimeString()}
                  </div>
                  
                  {session.is_mandatory && (
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-red-500" />
                      <span className="text-red-600 font-medium">Mandatory</span>
                    </div>
                  )}
                </div>
                
                {/* Session Progress */}
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
                
                {/* Active Session Timer */}
                {isActive && (
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <SessionTimer 
                      endTime={session.end_time}
                      onExpired={() => console.log(`Session ${session.session_id} expired`)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Students View Component
export const StudentsView = ({ 
  registrations, 
  selectedSession,
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
  const handleSelectRegistration = (registrationId, isSelected) => {
    if (isSelected) {
      setSelectedRegistrations(prev => [...prev, registrationId]);
    } else {
      setSelectedRegistrations(prev => prev.filter(id => id !== registrationId));
    }
  };

  const handleSelectAll = () => {
    if (selectedRegistrations.length === registrations.length) {
      setSelectedRegistrations([]);
    } else {
      setSelectedRegistrations(registrations.map(reg => reg.registration_id));
    }
  };

  const getStatusFilterOptions = () => [
    { value: 'all', label: 'All Students', count: registrations.length },
    { value: 'present', label: 'Present in Session', count: registrations.filter(r => r.session_attendance?.includes(selectedSession?.session_id)).length },
    { value: 'absent', label: 'Not Yet Marked', count: registrations.filter(r => !r.session_attendance?.includes(selectedSession?.session_id)).length }
  ];

  if (!selectedSession) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-6" />
          <h3 className="text-xl font-semibold text-gray-900 mb-3">Select a Session</h3>
          <p className="text-gray-500">Choose a session from the Sessions view to manage student attendance.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Session Context */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Managing: {selectedSession.session_name}
            </h3>
            <p className="text-gray-600 text-sm mt-1">
              {new Date(selectedSession.start_time).toLocaleString()} - 
              {new Date(selectedSession.end_time).toLocaleString()}
            </p>
          </div>
          <SessionStatus status={selectedSession.status} />
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative min-w-0 flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 w-full"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="relative min-w-0 flex-1 max-w-xs">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 appearance-none bg-white w-full"
              >
                {getStatusFilterOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.count})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="flex items-center gap-3">
            {selectedRegistrations.length > 0 && (
              <button
                onClick={onBulkMark}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <UserCheck className="w-4 h-4" />
                Mark {selectedRegistrations.length} Present
              </button>
            )}
            
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {selectedRegistrations.length === registrations.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading students...</p>
          </div>
        ) : registrations.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Students Found</h3>
            <p className="text-gray-500">No students match your current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedRegistrations.length === registrations.length}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Enrollment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Session Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {registrations.map((registration) => {
                  const isSelected = selectedRegistrations.includes(registration.registration_id);
                  const hasSessionAttendance = registration.session_attendance?.includes(selectedSession.session_id);
                  
                  return (
                    <tr key={registration.registration_id} className={isSelected ? 'bg-purple-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectRegistration(registration.registration_id, e.target.checked)}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {registration.student_data?.full_name || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {registration.student_data?.email || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {registration.student_enrollment || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {hasSessionAttendance ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Present
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <Clock className="w-3 h-3 mr-1" />
                            Not Marked
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {!hasSessionAttendance ? (
                          <button
                            onClick={() => onMarkAttendance(registration.registration_id)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-purple-600 bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                          >
                            <UserCheck className="w-4 h-4 mr-1" />
                            Mark Present
                          </button>
                        ) : (
                          <span className="text-gray-500 text-sm">Already marked</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// Analytics View Component
export const AnalyticsView = ({ sessions, analytics, sessionStats, config }) => {
  const getOverallStats = () => {
    if (!sessions?.length) return null;
    
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.status === 'completed').length;
    const activeSessions = sessions.filter(s => s.status === 'active').length;
    const upcomingSessions = sessions.filter(s => s.status === 'pending').length;
    
    return {
      total: totalSessions,
      completed: completedSessions,
      active: activeSessions,
      upcoming: upcomingSessions
    };
  };

  const getAttendanceData = () => {
    if (!sessions?.length || !sessionStats) return [];
    
    return sessions.map(session => ({
      name: session.session_name,
      attended: sessionStats[session.session_id]?.attended || 0,
      total: sessionStats[session.session_id]?.total || 0,
      percentage: sessionStats[session.session_id]?.total > 0 
        ? Math.round((sessionStats[session.session_id].attended / sessionStats[session.session_id].total) * 100)
        : 0,
      status: session.status,
      isMandatory: session.is_mandatory
    }));
  };

  const overallStats = getOverallStats();
  const attendanceData = getAttendanceData();

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      {overallStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{overallStats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{overallStats.completed}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <PlayCircle className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active</p>
                <p className="text-2xl font-bold text-gray-900">{overallStats.active}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Upcoming</p>
                <p className="text-2xl font-bold text-gray-900">{overallStats.upcoming}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Attendance Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-600" />
          Session Attendance Overview
        </h3>
        
        {attendanceData.length > 0 ? (
          <div className="space-y-4">
            {attendanceData.map((session, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{session.name}</h4>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <SessionStatus status={session.status} isCompact />
                      {session.isMandatory && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                          Mandatory
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">{session.percentage}%</div>
                    <div className="text-sm text-gray-500">{session.attended}/{session.total}</div>
                  </div>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-300 ${
                      session.percentage >= 80 ? 'bg-green-500' :
                      session.percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${session.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No attendance data available yet</p>
          </div>
        )}
      </div>

      {/* Requirements Check */}
      {config?.criteria?.minimum_percentage && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            Requirement Analysis
          </h3>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h4 className="font-medium text-purple-900">Minimum Attendance Requirement</h4>
                <p className="text-purple-700 text-sm">
                  Students must attend at least {config.criteria.minimum_percentage}% of sessions to be marked present.
                </p>
                <p className="text-purple-600 text-sm mt-1">
                  Required sessions: {Math.ceil((config.criteria.minimum_percentage / 100) * sessions.length)} out of {sessions.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Bulk Session Modal Component
export const BulkSessionModal = ({ 
  selectedCount, 
  sessionName, 
  onConfirm, 
  onCancel, 
  registrationIds 
}) => {
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm(registrationIds, notes);
    } catch (error) {
      console.error('Error in bulk marking:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Mark Session Attendance
        </h3>
        
        <div className="mb-4">
          <p className="text-gray-600">
            Mark <span className="font-medium text-purple-600">{selectedCount} students</span> as present for:
          </p>
          <p className="font-medium text-gray-900 mt-1">{sessionName}</p>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this attendance marking..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
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
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
