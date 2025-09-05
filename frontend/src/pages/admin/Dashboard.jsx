import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api/admin';
import AdminLayout from '../../components/admin/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';


function Dashboard() {
  const [stats, setStats] = useState({
    active_events_count: 0,
    total_events_count: 0,
    pending_jobs: 0,
    system_status: 'Online',
    upcoming_events: 0,
    ongoing_events: 0,
    completed_events: 0,
    draft_events: 0,
    triggers_queued: 0,
    scheduler_running: true
  });
  const [activeJobs, setActiveJobs] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [eventsByStatus, setEventsByStatus] = useState({});
  const [totalEvents, setTotalEvents] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(() => {
    const saved = localStorage.getItem('admin-dashboard-auto-refresh');
    return saved ? saved === 'true' : false;
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [serverTimeOffset, setServerTimeOffset] = useState(0);

  const [isDataFetching, setIsDataFetching] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const MIN_FETCH_INTERVAL = 5000; // Increased from 3 seconds to 5 seconds

  useEffect(() => {
    initializeTime();
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date(Date.now() + serverTimeOffset));
    }, 1000);
    return () => clearInterval(timeInterval);
  }, [serverTimeOffset]);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchDashboardData, 60000); // Changed from 30 seconds to 60 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const initializeTime = () => {
    const now = new Date();
    setCurrentTime(now);
    setLastRefreshed(now);
  };

  const fetchDashboardData = async () => {
    const now = Date.now();
    if (isDataFetching || (now - lastFetchTime) < MIN_FETCH_INTERVAL) {
      return;
    }

    try {
      setIsDataFetching(true);
      setLastFetchTime(now);

      // Fetch consolidated dashboard data
      const dashboardResponse = await adminAPI.getDashboardStats('month', 20);

      if (dashboardResponse.data.success) {
        const dashboardData = dashboardResponse.data.data;
        const analytics = dashboardData.analytics;
        const events = analytics.events;
        const scheduler = analytics.scheduler;
        const systemHealth = analytics.system_health;
        
        console.log('Dashboard Analytics Data:', analytics); // Debug log
        console.log('Events Data:', events); // Debug log
        
        // Extract server time for synchronization
        if (analytics.server_time) {
          const serverTime = new Date(analytics.server_time);
          const localTime = new Date();
          setServerTimeOffset(serverTime.getTime() - localTime.getTime());
          setCurrentTime(serverTime);
        }

        // Update stats with correct data structure
        setStats({
          active_events_count: events.active || 0,
          total_events_count: events.total || 0,
          pending_jobs: scheduler.pending_jobs || 0,
          system_status: scheduler.status || 'Online',
          upcoming_events: events.upcoming || 0,
          ongoing_events: events.live || 0,
          completed_events: events.completed || 0,
          draft_events: events.draft || 0,
          triggers_queued: systemHealth.triggers_queued || 0,
          scheduler_running: systemHealth.scheduler_running !== false
        });

        // Calculate event status distribution for analytics table
        const statusDistribution = {
          'upcoming': events.upcoming || 0,
          'ongoing': events.live || 0,
          'completed': events.completed || 0,
          'draft': events.draft || 0,
          'active': events.active || 0,
        };
        setEventsByStatus(statusDistribution);
        setTotalEvents(events.total || 0);

        // Extract upcoming triggers from scheduler data
        const triggersData = scheduler.upcoming_triggers || [];
        const formattedJobs = triggersData.slice(0, 10).map((trigger, index) => ({
          id: trigger.id || `trigger_${index}`,
          event_id: trigger.event_id || `Event ${index + 1}`,
          trigger_type: trigger.trigger_type || 'unknown',
          trigger_time: trigger.trigger_time || null,
          is_past_due: trigger.is_past_due || false,
          time_until_formatted: trigger.time_until_formatted || 'Unknown'
        }));
        setActiveJobs(formattedJobs);

        // Handle recent activity data
        const recentActivityData = dashboardData.recent_activity;
        if (recentActivityData && recentActivityData.logs) {
          console.log('Recent Activity Data:', recentActivityData.logs); // Debug log
          setRecentActivity(recentActivityData.logs);
        } else {
          console.warn('No recent activity data found');
          setRecentActivity([]);
        }
      } else {
        console.error('Dashboard API returned error:', dashboardResponse.data.message);
        setError(dashboardResponse.data.message || 'Failed to load dashboard data');
      }

    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      setError(err.message || 'Failed to load dashboard data');
      
      setActiveJobs([]);
      setRecentActivity([]);
    } finally {
      setIsLoading(false);
      setIsDataFetching(false);
      setLastRefreshed(new Date());
    }
  };

  const toggleAutoRefresh = (enabled) => {
    setAutoRefresh(enabled);
    localStorage.setItem('admin-dashboard-auto-refresh', enabled.toString());
    if (enabled) {
      fetchDashboardData();
    }
  };

  const handleManualRefresh = () => {
    setIsLoading(true);
    fetchDashboardData();
  };

  const handleClearCache = () => {
    localStorage.removeItem('admin-dashboard-auto-refresh');
    setAutoRefresh(false);
    setError('');
  };

  const formatTime = (date) => {
    if (!date) return '00:00:00';
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date) => {
    if (!date) return 'Invalid Date';
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading && !stats.total_events_count) {
    return (
      <AdminLayout pageTitle="Dashboard Overview">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '16rem' }}>
          <LoadingSpinner size="lg" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Dashboard Overview">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <i className="fas fa-chart-line text-white text-2xl"></i>
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    CampusConnect Dashboard
                  </h1>
                  <p className="text-gray-600 mt-1 text-lg">Real-time monitoring and control center</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="flex items-center text-sm font-medium">
                      {stats.scheduler_running ? (
                        <>
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                          <span className="text-green-600">System Online</span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                          <span className="text-red-600">System Offline</span>
                        </>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      Welcome back, <span className="font-semibold text-gray-700">Admin</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <i className="fas fa-cogs text-blue-600 mr-2"></i>
                    Quick Controls
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50/80 rounded-lg">
                      <span className="text-xs font-medium text-gray-700 mx-2">Auto Refresh</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={autoRefresh}
                          onChange={(e) => toggleAutoRefresh(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50/80 rounded-lg">
                      <span className="text-xs font-medium text-gray-700">Status</span>
                      <span className={`text-xs ${autoRefresh ? 'text-green-600' : 'text-gray-600'}`}>
                        {autoRefresh ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button 
                      onClick={handleManualRefresh}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-medium"
                    >
                      <i className="fas fa-sync-alt mr-1"></i>Refresh
                    </button>
                    <button 
                      onClick={handleClearCache}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-xs font-medium"
                    >
                      <i className="fas fa-trash-alt mr-1"></i>Clear Cache
                    </button>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100 min-w-max">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <div className="flex items-center text-xs font-medium">
                        {stats.scheduler_running ? (
                          <>
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                            <span className="text-green-600">LIVE</span>
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                            <span className="text-red-600">OFFLINE</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-2xl font-mono font-bold text-gray-800">
                      {formatTime(currentTime)}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {formatDate(currentTime)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Updated: <span className="font-mono">{formatTime(lastRefreshed)}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Local Time (IST)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Events</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.active_events_count}</p>
                  <p className="text-xs text-gray-500 mt-1">Currently running</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <i className="fas fa-calendar-alt text-blue-600 text-xl"></i>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Events</p>
                  <p className="text-3xl font-bold text-green-600">{stats.total_events_count}</p>
                  <p className="text-xs text-gray-500 mt-1">All time</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <i className="fas fa-list text-green-600 text-xl"></i>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Jobs</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.pending_jobs}</p>
                  <p className="text-xs text-gray-500 mt-1">In queue</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <i className="fas fa-tasks text-orange-600 text-xl"></i>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Upcoming Events</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.upcoming_events}</p>
                  <p className="text-xs text-gray-500 mt-1">Next 30 days</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <i className="fas fa-calendar-plus text-purple-600 text-xl"></i>
                </div>
              </div>
            </div>
          </div>

          {/* Optimized Tables Section */}
          <div className="grid grid-cols-1 xl:grid-cols-1 gap-8">

            {/* Upcoming Triggers - Enhanced Table */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                      <i className="fas fa-clock text-orange-600 mr-3"></i>
                      Upcoming Triggers
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">Next scheduled events and system triggers</p>
                  </div>
                  <div className="bg-gradient-to-r from-orange-100 to-red-100 rounded-lg px-3 py-2">
                    <div className="text-center">
                      <div className="text-lg font-bold text-orange-700">{activeJobs.length}</div>
                      <div className="text-xs text-gray-600">Queued</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="overflow-hidden">
                {activeJobs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                        <tr>
                          <th className="text-left p-4 font-semibold text-gray-700 border-r border-gray-200">
                            <i className="fas fa-tag mr-2 text-blue-600"></i>Event Details
                          </th>
                          <th className="text-left p-4 font-semibold text-gray-700 border-r border-gray-200">
                            <i className="fas fa-cogs mr-2 text-green-600"></i>Trigger Type
                          </th>
                          <th className="text-left p-4 font-semibold text-gray-700 border-r border-gray-200">
                            <i className="fas fa-calendar mr-2 text-purple-600"></i>Schedule
                          </th>
                          <th className="text-left p-4 font-semibold text-gray-700">
                            <i className="fas fa-traffic-light mr-2 text-orange-600"></i>Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {activeJobs.slice(0, 8).map((trigger, index) => (
                          <tr key={trigger.id} className="hover:bg-blue-50 transition-colors duration-200">
                            <td className="p-4 border-r border-gray-100">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                                  <span className="text-blue-700 font-bold text-xs">#{index + 1}</span>
                                </div>
                                <div>
                                  <div className="font-medium text-gray-800 truncate max-w-[140px]" title={trigger.event_id}>
                                    {trigger.event_id}
                                  </div>
                                  <div className="text-xs text-gray-500">Event ID</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 border-r border-gray-100">
                              <div className="flex items-center space-x-2">
                                {trigger.trigger_type === 'registration_close' && <i className="fas fa-door-closed text-red-600"></i>}
                                {trigger.trigger_type === 'registration_open' && <i className="fas fa-door-open text-green-600"></i>}
                                {trigger.trigger_type === 'event_start' && <i className="fas fa-play text-blue-600"></i>}
                                {trigger.trigger_type === 'event_end' && <i className="fas fa-stop text-gray-600"></i>}
                                {!['registration_close', 'registration_open', 'event_start', 'event_end'].includes(trigger.trigger_type) && 
                                  <i className="fas fa-sync text-purple-600"></i>}
                                <div>
                                  <div className="text-gray-700 font-medium">
                                    {trigger.trigger_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  </div>
                                  <div className="text-xs text-gray-500">Action Type</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 border-r border-gray-100">
                              <div className="text-center">
                                <div className="text-gray-700 font-medium text-xs">
                                  {trigger.trigger_time ? new Date(trigger.trigger_time).toLocaleDateString('en-US', {
                                    month: 'short', day: 'numeric'
                                  }) : 'Not Set'}
                                </div>
                                <div className="text-gray-500 text-xs">
                                  {trigger.trigger_time ? new Date(trigger.trigger_time).toLocaleTimeString('en-US', {
                                    hour: '2-digit', minute: '2-digit'
                                  }) : ''}
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex justify-center">
                                {trigger.is_past_due ? (
                                  <span className="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium border border-red-200">
                                    <i className="fas fa-exclamation-triangle mr-1"></i>
                                    Past Due
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium border border-green-200">
                                    <i className="fas fa-check-circle mr-1"></i>
                                    Scheduled
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-calendar-times text-2xl text-gray-400"></i>
                    </div>
                    <p className="text-gray-500 text-lg font-medium">No Upcoming Triggers</p>
                    <p className="text-gray-400 text-sm mt-1">All scheduled events are up to date</p>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Tables Section - Full Width Layout */}
            <div className="space-y-6">
              {/* Recent Activity - Full Width Dynamic Table */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                        <i className="fas fa-history text-green-600 mr-3"></i>
                        Recent Activity
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">Dynamic system events with intelligent status tracking</p>
                    </div>
                    <div className="bg-gradient-to-r from-green-100 to-blue-100 rounded-lg px-3 py-2">
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-700">{recentActivity.length}</div>
                        <div className="text-xs text-gray-600">Activities</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="overflow-hidden">
                  {recentActivity.length > 0 ? (
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b sticky top-0">
                          <tr>
                            <th className="text-left p-4 font-semibold text-gray-700 border-r border-gray-200">
                              <i className="fas fa-bolt mr-2 text-purple-600"></i>Activity
                            </th>
                            <th className="text-left p-4 font-semibold text-gray-700 border-r border-gray-200">
                              <i className="fas fa-comment-alt mr-2 text-blue-600"></i>Message
                            </th>
                            <th className="text-left p-4 font-semibold text-gray-700 border-r border-gray-200">
                              <i className="fas fa-info-circle mr-2 text-orange-600"></i>Details
                            </th>
                            <th className="text-left p-4 font-semibold text-gray-700">
                              <i className="fas fa-clock mr-2 text-green-600"></i>Time
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {recentActivity.slice(0, 8).map((log, index) => (
                            <tr key={log.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50 transition-all duration-200">
                              <td className="p-4 border-r border-gray-100">
                                <div className="flex items-center space-x-3">
                                  <div className={`w-10 h-10 ${log.activity?.bg_color || 'bg-gray-100'} rounded-full flex items-center justify-center shadow-sm`}>
                                    <i className={`${log.activity?.icon || 'fas fa-clock'} ${log.activity?.color || 'text-gray-600'} text-sm`}></i>
                                  </div>
                                  <div>
                                    <div className="font-semibold text-gray-800">
                                      {log.activity?.action || 'System Activity'}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {log.trigger_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 border-r border-gray-100">
                                <div className="font-medium text-gray-800 mb-1">
                                  {log.activity?.message || `Event ${log.event_id} status changed`}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Event ID: <span className="font-mono bg-gray-100 px-1 rounded">{log.event_id}</span>
                                </div>
                              </td>
                              <td className="p-4 border-r border-gray-100">
                                <div className="text-sm text-gray-700">
                                  {log.activity?.description || `${log.old_status} → ${log.new_status}`}
                                </div>
                                {log.old_status !== log.new_status && (
                                  <div className="flex items-center space-x-2 mt-2">
                                    <span className="inline-flex items-center px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                                      {log.old_status}
                                    </span>
                                    <i className="fas fa-arrow-right text-gray-400 text-xs"></i>
                                    <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                      {log.new_status}
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="p-4">
                                <div className="text-center">
                                  <div className="text-sm font-medium text-gray-800">{log.time_ago}</div>
                                  <div className="text-xs text-gray-500">ago</div>
                                  <div className="text-xs text-gray-400 mt-1">
                                    {log.performed_by || 'System'}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-history text-2xl text-gray-400"></i>
                      </div>
                      <p className="text-gray-500 text-lg font-medium">No Recent Activity</p>
                      <p className="text-gray-400 text-sm mt-1">Dynamic activity tracking will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default Dashboard;
