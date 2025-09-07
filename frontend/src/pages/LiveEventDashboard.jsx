import React, { useState, useEffect } from 'react';
import Layout from '../components/client/Layout';
import universalScannerService from '../services/UniversalScannerService';

const LiveEventDashboard = () => {
  const [currentCode, setCurrentCode] = useState('472-910');
  const [timeRemaining, setTimeRemaining] = useState(285); // seconds
  const [eventStats, setEventStats] = useState({
    totalRegistrations: 156,
    checkedIn: 89,
    activeVolunteers: 3,
    scanLocations: 8
  });
  const [eventId] = useState('EVT_HACKATHON_2025'); // In production, get from URL params
  const [eventSlug] = useState('hackathon-2025');

  const [activeVolunteers, setActiveVolunteers] = useState([]);
  const [recentScans, setRecentScans] = useState([]);

  // Load initial data
  useEffect(() => {
    loadEventData();
  }, []);

  const loadEventData = async () => {
    try {
      // Get current access code
      const codeData = await universalScannerService.getCurrentAccessCode(eventId);
      setCurrentCode(codeData.access_code);
      setTimeRemaining(codeData.time_remaining_seconds);

      // Get live stats
      const stats = await universalScannerService.getLiveEventStats(eventId);
      setEventStats({
        totalRegistrations: stats.total_registrations,
        checkedIn: stats.checked_in,
        activeVolunteers: stats.active_volunteers,
        scanLocations: stats.scan_locations
      });
      setActiveVolunteers(stats.active_volunteer_list || []);
      setRecentScans(stats.recent_scans || []);
    } catch (error) {
      
    }
  };

  // Generate new access code
  const generateNewCode = () => {
    const first = Math.floor(Math.random() * 900) + 100;
    const second = Math.floor(Math.random() * 900) + 100;
    return `${first}-${second}`;
  };

  // Timer effect for code rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Generate new code when timer expires
          setCurrentCode(generateNewCode());
          return 300; // Reset to 5 minutes (300 seconds)
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(currentCode);
    // You could add a toast notification here
  };

  const manualRefreshCode = async () => {
    try {
      const newCodeData = await universalScannerService.refreshAccessCode(eventId);
      setCurrentCode(newCodeData.access_code);
      setTimeRemaining(newCodeData.time_remaining_seconds);
    } catch (error) {
      
      // Fallback to local generation
      setCurrentCode(generateNewCode());
      setTimeRemaining(300);
    }
  };

  const getScannerURL = () => {
    return universalScannerService.getScannerURL(eventSlug);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Live Event Dashboard</h1>
                <p className="text-gray-600 mt-1">48-Hour Hackathon Challenge 2025</p>
              </div>
              <div className="mt-4 md:mt-0 flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Event Status</p>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    Live & Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Live Scanner Access */}
            <div className="lg:col-span-1">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-xl p-6 shadow-lg">
                <div className="text-center">
                  <h2 className="text-xl font-bold mb-2">🔴 LIVE SCANNER ACCESS</h2>
                  <p className="text-blue-100 mb-6">Share this code with volunteers</p>
                  
                  <div className="bg-white/10 backdrop-blur rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="text-3xl font-bold font-mono tracking-wider">{currentCode}</span>
                      <button
                        onClick={copyCodeToClipboard}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        title="Copy to clipboard"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm">Resets in {formatTime(timeRemaining)}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <button
                      onClick={manualRefreshCode}
                      className="w-full bg-white/20 hover:bg-white/30 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                    >
                      🔄 Generate New Code Now
                    </button>
                    
                    <div className="text-xs text-blue-100">
                      <p className="mb-2">📱 Universal Scanner URL:</p>
                      <div className="bg-white/10 p-2 rounded font-mono text-xs break-all">
                        {getScannerURL()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Stats */}
              <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Event Statistics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Registered</span>
                    <span className="font-bold text-2xl text-blue-600">{eventStats.totalRegistrations}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Checked In</span>
                    <span className="font-bold text-2xl text-green-600">{eventStats.checkedIn}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Active Volunteers</span>
                    <span className="font-bold text-2xl text-orange-600">{eventStats.activeVolunteers}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Scan Locations</span>
                    <span className="font-bold text-2xl text-purple-600">{eventStats.scanLocations}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Activity Monitoring */}
            <div className="lg:col-span-2 space-y-6">
              {/* Active Volunteers */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Active Volunteers</h3>
                  <span className="text-sm text-gray-500">{activeVolunteers.length} currently scanning</span>
                </div>
                <div className="space-y-3">
                  {activeVolunteers.map((volunteer, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-bold text-sm">{volunteer.name[0]}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{volunteer.name}</p>
                          <p className="text-sm text-gray-600">{volunteer.location}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          <span className="text-sm font-medium text-gray-900">{volunteer.scans_count || volunteer.scansCount} scans</span>
                        </div>
                        <p className="text-xs text-gray-500">{volunteer.last_scan || volunteer.lastScan}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Real-time Scan Activity</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-500">Live updates</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {recentScans.map((scan) => (
                    <div key={scan.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">{scan.student}</span>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{scan.team}</span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Verified by <strong>{scan.volunteer}</strong> at {scan.location}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-xs text-gray-500">{scan.time}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions Panel */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="font-bold text-amber-900 mb-2">Instructions for Volunteers</h4>
                    <ol className="text-sm text-amber-800 space-y-2 list-decimal list-inside">
                      <li>Send volunteers to: <code className="bg-amber-100 px-1 rounded">{getScannerURL()}</code></li>
                      <li>Give them the current access code: <strong>{currentCode}</strong></li>
                      <li>They enter the code + their full name</li>
                      <li>They select their scanning location</li>
                      <li>Scanner activates for 2 hours (auto-renewal available)</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LiveEventDashboard;
