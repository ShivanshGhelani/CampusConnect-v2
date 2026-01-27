/**
 * Attendance Session Customization Component
 * ==========================================
 * 
 * Allows event organizers to customize auto-generated attendance sessions
 * for competitions, workshops, and other events.
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

// IST Timezone utilities
const toISTDatetimeLocal = (isoString) => {
  // Convert ISO string (UTC) to IST datetime-local format (YYYY-MM-DDTHH:mm)
  if (!isoString) return '';
  const date = new Date(isoString); // Parse UTC timestamp
  
  // Add IST offset (+5:30) to get IST time
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(date.getTime() + istOffset);
  
  // Extract components using UTC methods (since we've already shifted to IST)
  const year = istDate.getUTCFullYear();
  const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istDate.getUTCDate()).padStart(2, '0');
  const hours = String(istDate.getUTCHours()).padStart(2, '0');
  const minutes = String(istDate.getUTCMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const fromISTDatetimeLocal = (datetimeLocal) => {
  // Convert datetime-local format (IST) to ISO string (UTC)
  if (!datetimeLocal) return null;
  
  // Parse the datetime-local string components (treating as IST)
  const [datePart, timePart] = datetimeLocal.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  
  // Create a date with these components as UTC (temporarily)
  const istDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
  
  // Subtract IST offset to get actual UTC
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utcDate = new Date(istDate.getTime() - istOffset);
  
  return utcDate.toISOString();
};

const AttendanceCustomization = () => {
  const { eventId } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [criteria, setCriteria] = useState({});
  const [showAddSession, setShowAddSession] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Load attendance configuration
  useEffect(() => {
    loadAttendanceConfig();
  }, [eventId]);

  const loadAttendanceConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/attendance/customize/preview/${eventId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load attendance configuration');
      }

      const data = await response.json();
      setConfig(data);
      setSessions(data.sessions || []);
      setCriteria(data.criteria || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateSession = (sessionId, field, value) => {
    setSessions(prevSessions => 
      prevSessions.map(session => 
        session.session_id === sessionId 
          ? { ...session, [field]: value }
          : session
      )
    );
  };

  const removeSession = (sessionId) => {
    if (sessions.length <= 1) {
      setError('Cannot remove the last remaining session');
      return;
    }
    setSessions(prevSessions => 
      prevSessions.filter(session => session.session_id !== sessionId)
    );
  };

  const addNewSession = () => {
    const newSession = {
      session_id: `new_session_${Date.now()}`,
      session_name: 'New Session',
      session_type: 'session',
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours later
      is_mandatory: true,
      weight: 1.0,
      status: 'pending'
    };
    
    setSessions(prevSessions => [...prevSessions, newSession]);
    setShowAddSession(false);
  };

  const saveCustomizations = async () => {
    try {
      setSaving(true);
      setError(null);

      const updates = {
        sessions: sessions.map(session => ({
          session_id: session.session_id,
          session_name: session.session_name,
          start_time: session.start_time,
          end_time: session.end_time,
          is_mandatory: session.is_mandatory,
          weight: session.weight
        })),
        new_sessions: [],
        remove_sessions: [],
        criteria_updates: criteria
      };

      const response = await fetch(`/api/v1/attendance/customize/sessions/${eventId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to save customizations');
      }

      const result = await response.json();
      setSuccess('Attendance sessions customized successfully!');
      
      // Reload configuration
      await loadAttendanceConfig();

    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatDateTime = (dateTimeStr) => {
    return new Date(dateTimeStr).toLocaleString();
  };

  const formatDuration = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end - start;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading attendance configuration...</p>
        </div>
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-red-800 font-semibold">Error Loading Configuration</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customize Attendance Sessions</h1>
            <p className="text-gray-600 mt-1">
              Event: <span className="font-semibold">{config?.event_id}</span> • 
              Strategy: <span className="font-semibold capitalize">{config?.strategy?.replace('_', ' ')}</span>
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={loadAttendanceConfig}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reset Changes
            </button>
            <button
              onClick={saveCustomizations}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center"
            >
              {saving ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-green-700">{success}</p>
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{sessions.length}</div>
          <div className="text-sm text-gray-600">Total Sessions</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">
            {sessions.filter(s => s.is_mandatory).length}
          </div>
          <div className="text-sm text-gray-600">Mandatory Sessions</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">
            {criteria.minimum_percentage || 75}%
          </div>
          <div className="text-sm text-gray-600">Pass Criteria</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-600">
            {config?.preview_meta?.total_duration || 'N/A'}
          </div>
          <div className="text-sm text-gray-600">Total Duration</div>
        </div>
      </div>

      {/* Sessions Customization */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Sessions Configuration</h2>
          <button
            onClick={() => setShowAddSession(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Session
          </button>
        </div>

        <div className="p-6 space-y-4">
          {sessions.map((session, index) => (
            <div key={session.session_id} className="border border-gray-200 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </div>
                  <input
                    type="text"
                    value={session.session_name}
                    onChange={(e) => updateSession(session.session_id, 'session_name', e.target.value)}
                    className="text-lg font-semibold border-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded px-2 py-1"
                    placeholder="Session Name"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-600">Mandatory:</label>
                    <input
                      type="checkbox"
                      checked={session.is_mandatory}
                      onChange={(e) => updateSession(session.session_id, 'is_mandatory', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  
                  {sessions.length > 1 && (
                    <button
                      onClick={() => removeSession(session.session_id)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Remove Session"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time (IST)</label>
                  <input
                    type="datetime-local"
                    value={toISTDatetimeLocal(session.start_time)}
                    onChange={(e) => updateSession(session.session_id, 'start_time', fromISTDatetimeLocal(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time (IST)</label>
                  <input
                    type="datetime-local"
                    value={toISTDatetimeLocal(session.end_time)}
                    onChange={(e) => updateSession(session.session_id, 'end_time', fromISTDatetimeLocal(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
                  <input
                    type="number"
                    min="0.1"
                    max="2.0"
                    step="0.1"
                    value={session.weight}
                    onChange={(e) => updateSession(session.session_id, 'weight', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-md p-3">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Duration: {formatDuration(session.start_time, session.end_time)}</span>
                  <span>Status: <span className="capitalize">{session.status}</span></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Add Session Modal */}
      {showAddSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Session</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will add a new session to your event. You can customize all details after adding.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAddSession(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addNewSession}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Add Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Criteria Configuration */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Pass Criteria</h2>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Attendance Percentage
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={criteria.minimum_percentage || 75}
                  onChange={(e) => setCriteria(prev => ({ ...prev, minimum_percentage: parseInt(e.target.value) }))}
                  className="flex-1"
                />
                <span className="text-lg font-semibold text-blue-600 w-12">
                  {criteria.minimum_percentage || 75}%
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Students need to attend at least this percentage of sessions
              </p>
            </div>

            {config?.strategy === 'session_based' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Required Sessions (Alternative)
                </label>
                <input
                  type="number"
                  min="1"
                  max={sessions.length}
                  value={criteria.required_sessions || Math.ceil(sessions.length * 0.75)}
                  onChange={(e) => setCriteria(prev => ({ ...prev, required_sessions: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Or require attendance at this many sessions
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Customization Suggestions */}
      {config?.customization_options?.suggested_improvements?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-amber-800 mb-3">💡 Suggestions</h3>
          <ul className="space-y-2">
            {config.customization_options.suggested_improvements.map((suggestion, index) => (
              <li key={index} className="flex items-start">
                <span className="text-amber-600 mr-2">•</span>
                <span className="text-amber-700">{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AttendanceCustomization;
