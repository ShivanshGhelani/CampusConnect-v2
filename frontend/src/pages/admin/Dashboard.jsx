import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api/axios';
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
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [serverTimeOffset, setServerTimeOffset] = useState(0);

  useEffect(() => {
    fetchDashboardData();
    initializeTime();
    
    // Set up time update
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date(Date.now() + serverTimeOffset));
    }, 1000);
    
    // Set up auto-refresh for live data
    let liveDataInterval;
    let fullRefreshInterval;
    
    if (autoRefresh) {
      liveDataInterval = setInterval(fetchLiveData, 15000); // Live data every 15 seconds
      fullRefreshInterval = setInterval(fetchDashboardData, 120000); // Full refresh every 2 minutes
    }
    
    return () => {
      clearInterval(timeInterval);
      if (liveDataInterval) clearInterval(liveDataInterval);
      if (fullRefreshInterval) clearInterval(fullRefreshInterval);
    };
  }, [autoRefresh, serverTimeOffset]);

  const initializeTime = () => {
    // In a real app, this would come from the server
    const serverTime = new Date();
    const clientTime = new Date();
    setServerTimeOffset(serverTime.getTime() - clientTime.getTime());
    setCurrentTime(new Date(Date.now() + serverTimeOffset));
  };

  const fetchDashboardData = async () => {
    try {
      setIsLoading(!stats.total_events_count); // Only show loading spinner on first load
      
      // Fetch complete dashboard data
      const response = await adminAPI.getDashboardStats();
      
      if (response.data.success) {
        const data = response.data.data;
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

        // Mock active jobs data
        setActiveJobs([
          {
            id: 1,
            name: 'Email Reminders - Tech Workshop',
            type: 'email_reminder',
            status: 'running',
            progress: 75,
            estimated_completion: '2 min'
          },
          {
            id: 2,
            name: 'Certificate Generation - Hackathon 2025',
            type: 'certificate_generation',
            status: 'queued',
            progress: 0,
            estimated_completion: '5 min'
          },
          {
            id: 3,
            name: 'Attendance Analytics - Code Challenge',
            type: 'analytics',
            status: 'completed',
            progress: 100,
            estimated_completion: 'Completed'
          }
        ]);
      } else {
        throw new Error(response.data.message || 'Failed to fetch dashboard data');
      }

      // Enhanced recent activity with more variety
      setRecentActivity([
        {
          id: 1,
          type: 'event_created',
          message: 'New event "AI Workshop 2025" created by Admin',
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          icon: 'fas fa-plus-circle',
          color: 'text-green-600',
          priority: 'normal'
        },
        {
          id: 2,
          type: 'registration_spike',
          message: '50 new registrations in the last hour',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1),
          icon: 'fas fa-user-plus',
          color: 'text-blue-600',
          priority: 'high'
        },
        {
          id: 3,
          type: 'system_alert',
          message: 'Email service temporarily unavailable',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
          icon: 'fas fa-exclamation-triangle',
          color: 'text-yellow-600',
          priority: 'high'
        },
        {
          id: 4,
          type: 'certificate_generated',
          message: 'Certificates generated for "Tech Symposium"',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
          icon: 'fas fa-certificate',
          color: 'text-purple-600',
          priority: 'normal'
        },
        {
          id: 5,
          type: 'event_completed',
          message: 'Event "Data Science Bootcamp" completed successfully',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12),
          icon: 'fas fa-check-circle',
          color: 'text-indigo-600',
          priority: 'normal'
        }
      ]);

      setLastRefreshed(new Date());
      setError('');
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      setError('Failed to load dashboard data');
      
      // Set fallback values on error
      setStats(prevStats => ({
        ...prevStats,
        system_status: 'Offline',
        scheduler_running: false
      }));
      
      setActiveJobs([]);
      setRecentActivity([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLiveData = async () => {
    try {
      // Simulate live data endpoint
      const response = await adminAPI.getDashboardStats();
      
      if (response.data.success) {
        const data = response.data.data;
        
        // Update only live statistics without full re-render
        setStats(prevStats => ({
          ...prevStats,
          active_events_count: data.active_events_count || prevStats.active_events_count,
          pending_jobs: data.pending_jobs || prevStats.pending_jobs,
          triggers_queued: data.triggers_queued || prevStats.triggers_queued,
          scheduler_running: data.scheduler_running !== false
        }));
        
        updateLastRefreshedTime();
        
        // Show success notification for live updates (less intrusive)
        if (autoRefresh) {
          showNotification('Data updated', 'success', 2000);
        }
      }
    } catch (error) {
      console.error('Live data fetch error:', error);
      // Don't show error notifications for live data failures to avoid spam
    }
  };

  const updateLastRefreshedTime = () => {
    setLastRefreshed(new Date(Date.now() + serverTimeOffset));
  };

  const handleManualRefresh = async () => {
    const refreshBtn = document.getElementById('manual-refresh');
    if (refreshBtn) {
      const originalContent = refreshBtn.innerHTML;
      refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right: 0.25rem;"></i>Refreshing...';
      refreshBtn.disabled = true;
      
      await fetchDashboardData();
      showNotification('Dashboard refreshed successfully', 'success');
      
      refreshBtn.innerHTML = originalContent;
      refreshBtn.disabled = false;
    } else {
      await fetchDashboardData();
      showNotification('Dashboard refreshed successfully', 'success');
    }
  };

  const handleClearCache = async () => {
    const clearBtn = document.getElementById('clear-cache');
    const isButton = clearBtn !== null;
    
    if (isButton) {
      const originalContent = clearBtn.innerHTML;
      clearBtn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right: 0.25rem;"></i>Clearing...';
      clearBtn.disabled = true;
    }
    
    try {
      // Mock cache clear API call - replace with real endpoint when available
      await new Promise(resolve => setTimeout(resolve, 1500));
      showNotification('Cache cleared successfully', 'success');
    } catch (error) {
      showNotification('Failed to clear cache', 'error');
    } finally {
      if (isButton) {
        clearBtn.innerHTML = clearBtn.originalContent || '<i class="fas fa-trash" style="margin-right: 0.25rem;"></i>Clear Cache';
        clearBtn.disabled = false;
      }
    }
  };

  const toggleAutoRefresh = (enabled) => {
    setAutoRefresh(enabled);
    localStorage.setItem('admin-dashboard-auto-refresh', enabled.toString());
    
    if (enabled) {
      showNotification('Live updates enabled', 'success', 3000);
    } else {
      showNotification('Live updates disabled', 'info', 3000);
    }
  };

  const showNotification = (message, type = 'info', duration = 5000) => {
    const notification = document.createElement('div');
    notification.className = `fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full opacity-0 ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      type === 'warning' ? 'bg-yellow-500 text-white' :
      'bg-blue-500 text-white'
    }`;
    
    notification.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium">${message}</span>
        <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
      notification.style.opacity = '1';
    }, 100);
    
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, duration);
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


  const getJobStatusColor = (status) => {
    switch (status) {
      case 'running': return { bg: '#dbeafe', text: '#2563eb' };
      case 'completed': return { bg: '#dcfce7', text: '#059669' };
      case 'queued': return { bg: '#fef3c7', text: '#d97706' };
      case 'failed': return { bg: '#fee2e2', text: '#dc2626' };
      default: return { bg: '#f3f4f6', text: '#6b7280' };
    }
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
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <i className="fas fa-chart-line text-white text-2xl"></i>
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Admin Dashboard
                  </h1>
                  <p className="text-gray-600 text-lg mt-1">Real-time monitoring and control center</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-sm text-gray-500">
                      Last updated: <span id="last-updated" className="font-medium">{formatTime(lastRefreshed)}</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${stats.scheduler_running ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                      <span className="text-sm text-gray-500">
                        System {stats.scheduler_running ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Control Panel */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <i className="fas fa-cog mr-2"></i>Quick Controls
                  </h3>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button
                      id="manual-refresh"
                      onClick={handleManualRefresh}
                      className="flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      <i className="fas fa-sync-alt mr-1"></i>Refresh
                    </button>
                    <button
                      id="clear-cache"
                      onClick={handleClearCache}
                      className="flex items-center justify-center px-3 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
                    >
                      <i className="fas fa-trash mr-1"></i>Cache
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center text-sm">
                      <input
                        id="auto-refresh"
                        type="checkbox"
                        checked={autoRefresh}
                        onChange={(e) => toggleAutoRefresh(e.target.checked)}
                        className="mr-2"
                      />
                      Live Updates
                    </label>
                    <span className={`text-xs ${autoRefresh ? 'text-green-600' : 'text-gray-600'}`}>
                      {autoRefresh ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                </div>
                
                {/* Live Clock */}
                <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100 min-w-max">
                  <div className="text-center">
                    <div id="current-time" className="text-xl font-bold text-gray-900">
                      {formatTime(currentTime)}
                    </div>
                    <div id="current-date" className="text-sm text-gray-600">
                      {formatDate(currentTime)}
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
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Active Events</p>
                  <p id="active-events-count" className="text-3xl font-bold text-blue-600 mt-2">
                    {stats.active_events_count || 0}
                  </p>
                  <div className="flex items-center mt-3 text-sm">
                    <span className="text-blue-600 font-medium">
                      <i className="fas fa-arrow-up mr-1"></i>{stats.upcoming_events || 0} upcoming
                    </span>
                    <span className="text-gray-500 ml-3">{stats.ongoing_events || 0} live</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-calendar-check text-blue-500 text-xl"></i>
                </div>
              </div>
            </div>

            {/* Total Events Card */}
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Events</p>
                  <p id="total-events-count" className="text-3xl font-bold text-green-600 mt-2">
                    {stats.total_events_count || 0}
                  </p>
                  <div className="flex items-center mt-3 text-sm">
                    <span className="text-green-600 font-medium">
                      <i className="fas fa-check mr-1"></i>{stats.completed_events || 0} completed
                    </span>
                    <span className="text-gray-500 ml-3">{stats.draft_events || 0} drafts</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-chart-line text-green-500 text-xl"></i>
                </div>
              </div>
            </div>

            {/* Pending Jobs Card */}
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Pending Jobs</p>
                  <p id="pending-jobs-count" className="text-3xl font-bold text-yellow-600 mt-2">
                    {stats.pending_jobs || 0}
                  </p>
                  <div className="flex items-center mt-3 text-sm">
                    <span className="text-yellow-600 font-medium">
                      <i className="fas fa-hourglass-half mr-1"></i>{stats.triggers_queued || 0} queued
                    </span>
                    <span className="text-gray-500 ml-3">in scheduler</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-clock text-yellow-500 text-xl"></i>
                </div>
              </div>
            </div>

            {/* System Status Card */}
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">System Status</p>
                  <p id="system-status" className={`text-3xl font-bold mt-2 ${stats.scheduler_running ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.scheduler_running ? 'Online' : 'Offline'}
                  </p>
                  <div className="flex items-center mt-3">
                    <div className={`w-2 h-2 rounded-full mr-2 ${stats.scheduler_running ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-sm text-gray-700">All systems operational</span>
                  </div>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stats.scheduler_running ? 'bg-green-100' : 'bg-red-100'}`}>
                  <i className={`fas ${stats.scheduler_running ? 'fa-check-circle text-green-500' : 'fa-exclamation-circle text-red-500'} text-xl`}></i>
                </div>
              </div>
            </div>
          </div>



          {/* Active Jobs Table */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 mb-8">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <i className="fas fa-tasks text-purple-500 mr-3"></i>
                Active Background Jobs
              </h2>
              <p className="text-gray-600 mt-1">Currently running and queued system tasks</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ETA</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activeJobs.length > 0 ? (
                    activeJobs.map((job) => {
                      const statusColor = getJobStatusColor(job.status);
                      return (
                        <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{job.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-500 capitalize">
                              {job.type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span 
                              className="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                              style={{ 
                                backgroundColor: statusColor.bg, 
                                color: statusColor.text 
                              }}
                            >
                              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2 mr-3">
                                <div 
                                  className="h-2 rounded-full transition-all duration-300"
                                  style={{ 
                                    width: `${job.progress}%`,
                                    backgroundColor: job.status === 'completed' ? '#10b981' : 
                                                   job.status === 'running' ? '#3b82f6' : '#6b7280'
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-600">{job.progress}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {job.estimated_completion}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                        <i className="fas fa-tasks text-3xl mb-2 block"></i>
                        No active background jobs
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
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <i className="fas fa-history text-green-500 mr-3"></i>
                Recent Activity
              </h2>
              <p className="text-gray-600 mt-1">Latest system events and notifications</p>
            </div>
            <div className="p-6">
              <div id="activity-log" className="space-y-4">
                {recentActivity.length > 0 ? (
                  recentActivity.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        log.priority === 'high' ? 'bg-red-100' : 'bg-blue-100'
                      }`}>
                        <i className={`${log.icon} ${log.priority === 'high' ? 'text-red-600' : 'text-blue-600'} text-sm`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          {log.message}
                        </p>
                        <p className="text-xs text-gray-500">
                          {log.timestamp.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {log.priority === 'high' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            High Priority
                          </span>
                        )}
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          log.type === 'system_alert' ? 'bg-yellow-100 text-yellow-800' :
                          log.type === 'event_created' ? 'bg-green-100 text-green-800' :
                          log.type === 'registration_spike' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {log.type.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <i className="fas fa-inbox text-3xl mb-3 block"></i>
                    <p className="text-sm">No recent activity to display</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Styling */}
      <style jsx>{`
        .progress-bar {
          transition: width 0.5s ease;
        }
        
        .bg-gradient-to-br {
          background-image: linear-gradient(to bottom right, var(--tw-gradient-stops));
        }
        
        .backdrop-blur-md {
          backdrop-filter: blur(12px);
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        .hover\\:shadow-xl:hover {
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        
        .hover\\:-translate-y-1:hover {
          transform: translateY(-0.25rem);
        }
        
        .transition-all {
          transition-property: all;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          transition-duration: 300ms;
        }
      `}</style>
    </AdminLayout>
  );
}

export default Dashboard;
