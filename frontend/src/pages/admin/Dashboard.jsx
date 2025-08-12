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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(() => {
    // Load auto-refresh state from localStorage
    const saved = localStorage.getItem('admin-dashboard-auto-refresh');
    return saved ? saved === 'true' : false;
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [serverTimeOffset, setServerTimeOffset] = useState(0);

  // Rate limiting state
  const [isDataFetching, setIsDataFetching] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const MIN_FETCH_INTERVAL = 5000; // Minimum 5 seconds between fetches

  useEffect(() => {
    fetchDashboardData();
    initializeTime();
  }, []);

  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date(Date.now() + serverTimeOffset));
    }, 1000);
    
    return () => clearInterval(timeInterval);
  }, [serverTimeOffset]);

  useEffect(() => {
    let liveDataInterval;
    let fullRefreshInterval;
    
    if (autoRefresh) {
      liveDataInterval = setInterval(fetchLiveData, 60000); // Live data every 1 minute
      fullRefreshInterval = setInterval(fetchDashboardData, 600000); // Full refresh every 10 minutes
    }
    
    return () => {
      if (liveDataInterval) clearInterval(liveDataInterval);
      if (fullRefreshInterval) clearInterval(fullRefreshInterval);
    };
  }, [autoRefresh]);

  const initializeTime = () => {
    const serverTime = new Date();
    const clientTime = new Date();
    setServerTimeOffset(serverTime.getTime() - clientTime.getTime());
    setCurrentTime(new Date(Date.now() + serverTimeOffset));
  };

  const fetchDashboardData = async () => {
    const now = Date.now();
    if (isDataFetching || (now - lastFetchTime) < MIN_FETCH_INTERVAL) {
      console.log('Skipping fetch due to rate limiting');
      return;
    }

    try {
      setIsDataFetching(true);
      setLastFetchTime(now);
      setIsLoading(!stats.total_events_count);
      
      const response = await adminAPI.getDashboardRealTimeStats();
      
      if (response.data.success) {
        const data = response.data.data;
        
        if (data.server_time) {
          const serverTime = new Date(data.server_time);
          const clientTime = new Date();
          const offset = serverTime.getTime() - clientTime.getTime();
          setServerTimeOffset(offset);
          setCurrentTime(new Date(Date.now() + offset));
        }
        
        setStats({
          active_events_count: data.active_events_count || 0,
          total_events_count: data.total_events_count || 0,
          pending_jobs: data.pending_jobs || 0,
          system_status: data.system_status || 'Online',
          upcoming_events: data.upcoming_events || 0,
          ongoing_events: data.ongoing_events || 0,
          completed_events: data.completed_events || 0,
          draft_events: data.draft_events || 0,
          triggers_queued: data.triggers_queued || 0,
          scheduler_running: data.scheduler_running !== false
        });

        // Use real trigger data from scheduler
        const triggersData = data.upcoming_triggers || [];
        const formattedJobs = triggersData.slice(0, 10).map((trigger, index) => ({
          id: index + 1,
          event_id: trigger.event_id || 'N/A',
          trigger_type: trigger.trigger_type || 'unknown',
          status: trigger.is_past_due ? 'past_due' : 'scheduled',
          is_past_due: trigger.is_past_due || false,
          trigger_time: trigger.trigger_time,
          time_until_formatted: trigger.time_until_formatted || 'Unknown'
        }));

        setActiveJobs(formattedJobs);

        // Use real recent activity data
        const recentActivityData = data.recent_activity || [];
        const formattedActivity = recentActivityData.map((activity, index) => ({
          id: index + 1,
          event_id: activity.event_id || `Event ${index + 1}`,
          old_status: activity.old_status || 'unknown',
          new_status: activity.new_status || 'unknown',
          trigger_type: activity.trigger_type || 'system',
          time_ago: activity.time_ago || 'Unknown time',
          timestamp: activity.timestamp ? new Date(activity.timestamp) : new Date()
        }));

        setRecentActivity(formattedActivity);
      } else {
        throw new Error(response.data.message || 'Failed to fetch dashboard data');
      }

      setLastRefreshed(new Date());
      setError('');
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      setError('Failed to load dashboard data');
      
      setStats(prevStats => ({
        ...prevStats,
        system_status: 'Offline',
        scheduler_running: false
      }));
      
      setActiveJobs([]);
      setRecentActivity([]);
    } finally {
      setIsLoading(false);
      setIsDataFetching(false);
    }
  };

  const fetchLiveData = async () => {
    try {
      const response = await adminAPI.getDashboardRealTimeStats();
      
      if (response.data.success) {
        const data = response.data.data;
        
        setStats(prevStats => ({
          ...prevStats,
          active_events_count: data.active_events_count || 0,
          total_events_count: data.total_events_count || 0,
          pending_jobs: data.pending_jobs || 0,
          system_status: data.system_status || 'Online',
          upcoming_events: data.upcoming_events || 0,
          ongoing_events: data.ongoing_events || 0,
          completed_events: data.completed_events || 0,
          draft_events: data.draft_events || 0,
          triggers_queued: data.triggers_queued || 0,
          scheduler_running: data.scheduler_running !== false
        }));

        setLastRefreshed(new Date());
      }
    } catch (error) {
      console.error('Live data fetch error:', error);
    }
  };

  const toggleAutoRefresh = (enabled) => {
    setAutoRefresh(enabled);
    localStorage.setItem('admin-dashboard-auto-refresh', enabled.toString());
  };

  const handleManualRefresh = () => {
    fetchDashboardData();
  };

  const handleClearCache = () => {
    // Clear local storage or cache here
    localStorage.removeItem('admin-dashboard-auto-refresh');
    console.log('Cache cleared');
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date) => {
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
        {/* Dashboard Header */}
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              {/* Header Section */}
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
              
              {/* Control Panel */}                
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
                
                {/* Live Clock */}
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
                      Server Time (UTC)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Dashboard Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Active Events Card */}
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Active Events</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{stats.active_events_count || 0}</p>
                </div>
                <div className="bg-blue-100 rounded-full p-3">
                  <i className="fas fa-calendar-check text-blue-600 text-xl"></i>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-blue-500 text-sm font-semibold">
                    <i className="fas fa-arrow-up mr-1"></i>{stats.upcoming_events || 0} upcoming
                  </span>
                  <span className="text-green-500 text-sm font-semibold">
                    <i className="fas fa-circle mr-1 animate-pulse"></i>{stats.ongoing_events || 0} live
                  </span>
                </div>
              </div>
            </div>

            {/* Total Events Card */}
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Events</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{stats.total_events_count || 0}</p>
                </div>
                <div className="bg-green-100 rounded-full p-3">
                  <i className="fas fa-chart-line text-green-600 text-xl"></i>
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className="text-green-500 text-sm font-semibold">
                  <i className="fas fa-check mr-1"></i>{stats.completed_events || 0} completed
                </span>
                <span className="text-gray-500 text-sm ml-2">{stats.draft_events || 0} drafts</span>
              </div>
            </div>

            {/* Pending Jobs Card */}
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Active Jobs</p>
                  <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pending_jobs || 0}</p>
                </div>
                <div className="bg-yellow-100 rounded-full p-3">
                  <i className="fas fa-clock text-yellow-600 text-xl"></i>
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className="text-yellow-500 text-sm font-semibold">
                  <i className="fas fa-hourglass-half mr-1"></i>{stats.triggers_queued || 0} triggers
                </span>
                <span className="text-gray-500 text-sm ml-2">in scheduler</span>
              </div>
            </div>

            {/* System Status Card */}
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">System Status</p>
                  <p className={`text-3xl font-bold mt-2 ${stats.system_status === 'Online' ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.system_status || 'Unknown'}
                  </p>
                </div>
                <div className={`rounded-full p-3 ${stats.system_status === 'Online' ? 'bg-green-100' : 'bg-red-100'}`}>
                  <i className={`fas fa-server text-xl ${stats.system_status === 'Online' ? 'text-green-600' : 'text-red-600'}`}></i>
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <div className="flex items-center">
                  {stats.scheduler_running ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 animate-pulse rounded-full mr-2"></div>
                      <span className="text-green-500 text-sm font-semibold">Scheduler Running</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                      <span className="text-red-500 text-sm font-semibold">Scheduler Stopped</span>
                    </>
                  )}
                </div>
              </div>
            </div>        
          </div>

          {/* Active Jobs Table */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 mb-8">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <i className="fas fa-tasks text-blue-600 mr-2"></i>
                Active Jobs
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trigger Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Execution</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Until</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activeJobs.length > 0 ? activeJobs.map((trigger) => (
                    <tr key={trigger.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {trigger.event_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {trigger.trigger_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {trigger.is_past_due ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Past Due
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Scheduled
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {trigger.trigger_time ? new Date(trigger.trigger_time).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        }) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {trigger.is_past_due ? (
                          <span className="text-red-600 font-semibold">{trigger.time_until_formatted || 'Past Due'}</span>
                        ) : (
                          <span className="text-gray-600">{trigger.time_until_formatted || 'Unknown'}</span>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                        <i className="fas fa-clock text-3xl mb-2 block"></i>
                        No scheduled triggers found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <i className="fas fa-history text-blue-600 mr-2"></i>
                Recent Activity
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentActivity.length > 0 ? recentActivity.map((log) => (
                  <div key={log.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        {log.trigger_type === 'registration_close' && <i className="fas fa-calendar-check text-blue-600 text-sm"></i>}
                        {log.trigger_type === 'registration_open' && <i className="fas fa-calendar-plus text-blue-600 text-sm"></i>}
                        {log.trigger_type === 'event_start' && <i className="fas fa-play text-blue-600 text-sm"></i>}
                        {log.trigger_type === 'event_end' && <i className="fas fa-stop text-blue-600 text-sm"></i>}
                        {!['registration_close', 'registration_open', 'event_start', 'event_end'].includes(log.trigger_type) && 
                          <i className="fas fa-sync text-blue-600 text-sm"></i>}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        Event <strong>{log.event_id}</strong> changed from 
                        <span className="text-orange-600 font-semibold"> {log.old_status}</span> to 
                        <span className="text-green-600 font-semibold"> {log.new_status}</span>
                        {log.trigger_type && (
                          <> via <em>{log.trigger_type.replace('_', ' ')}</em> trigger</>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{log.time_ago}</p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center text-gray-500 py-8">
                    <i className="fas fa-clock text-3xl mb-2 block"></i>
                    No recent activity
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default Dashboard;
