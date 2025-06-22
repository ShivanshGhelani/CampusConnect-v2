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
    detailed_status_counts: {
      registration_open: 0,
      live: 0,
      registration_not_started: 0,
      certificate_available: 0
    }
  });
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
    
    // Set up auto-refresh
    let refreshInterval;
    if (autoRefresh) {
      refreshInterval = setInterval(fetchDashboardData, 15000); // Refresh every 15 seconds
    }
    
    return () => {
      clearInterval(timeInterval);
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [autoRefresh, serverTimeOffset]);

  const initializeTime = () => {
    // Initialize server time - in a real app, this would come from the server
    const serverTime = new Date(); // Mock server time
    const clientTime = new Date();
    setServerTimeOffset(serverTime.getTime() - clientTime.getTime());
    setCurrentTime(new Date(Date.now() + serverTimeOffset));
  };

  const fetchDashboardData = async () => {
    try {
      setIsLoading(!stats.total_events_count); // Only show loading spinner on first load
      
      // Mock data - in real app, this would come from API
      setStats({
        active_events_count: 5,
        total_events_count: 25,
        pending_jobs: 3,
        system_status: 'Online',
        upcoming_events: 8,
        ongoing_events: 2,
        completed_events: 15,
        draft_events: 2,
        triggers_queued: 1,
        detailed_status_counts: {
          registration_open: 8,
          live: 2,
          registration_not_started: 10,
          certificate_available: 5
        }
      });

      // Mock recent activity
      setRecentActivity([
        {
          id: 1,
          type: 'event_created',
          message: 'New event "Code Challenge 2025" created',
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          icon: 'fas fa-plus-circle',
          color: 'text-green-600'
        },
        {
          id: 2,
          type: 'student_registered',
          message: '15 new student registrations',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
          icon: 'fas fa-user-plus',
          color: 'text-blue-600'
        },
        {
          id: 3,
          type: 'certificate_generated',
          message: 'Certificates generated for "Workshop 2024"',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
          icon: 'fas fa-certificate',
          color: 'text-purple-600'
        },
        {
          id: 4,
          type: 'event_completed',
          message: 'Event "Tech Symposium" completed successfully',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12),
          icon: 'fas fa-check-circle',
          color: 'text-indigo-600'
        }
      ]);

      setLastRefreshed(new Date());
      setError('');
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
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
    }
  };

  const handleClearCache = async () => {
    const clearBtn = document.getElementById('clear-cache');
    if (clearBtn) {
      const originalContent = clearBtn.innerHTML;
      clearBtn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right: 0.25rem;"></i>Clearing...';
      clearBtn.disabled = true;
      
      try {
        // Mock cache clear API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        showNotification('Cache cleared successfully', 'success');
      } catch (error) {
        showNotification('Failed to clear cache', 'error');
      } finally {
        clearBtn.innerHTML = originalContent;
        clearBtn.disabled = false;
      }
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
      <div style={{
        minHeight: '100%',
        background: 'linear-gradient(to bottom right, #f8fafc, #eff6ff, #eef2ff)',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      }}>
        {/* Dashboard Header */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(229, 231, 235, 0.6)',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          marginBottom: '2rem'
        }}>
          <div style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '2rem 1rem'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: window.innerWidth < 1024 ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: window.innerWidth < 1024 ? 'flex-start' : 'center',
              gap: '1.5rem'
            }}>
              {/* Header Section */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  background: 'linear-gradient(to right, #2563eb, #4f46e5)',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }}>
                  <i className="fas fa-chart-line" style={{ color: 'white', fontSize: '24px' }}></i>
                </div>
                <div>
                  <h1 style={{
                    fontSize: '2.5rem',
                    fontWeight: 'bold',
                    background: 'linear-gradient(to right, #2563eb, #4f46e5, #7c3aed)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    lineHeight: '1.2',
                    margin: '0'
                  }}>
                    Admin Dashboard
                  </h1>
                  <p style={{
                    color: '#6b7280',
                    marginTop: '0.25rem',
                    fontSize: '1.125rem',
                    margin: '0.25rem 0 0.5rem 0'
                  }}>
                    Real-time monitoring and control center
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      Last updated: <span id="last-updated">{formatTime(lastRefreshed)}</span>
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Control Panel */}
              <div style={{
                display: 'flex',
                flexDirection: window.innerWidth < 640 ? 'column' : 'row',
                gap: '1rem',
                width: window.innerWidth < 1024 ? '100%' : 'auto'
              }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(4px)',
                  borderRadius: '12px',
                  padding: '1rem',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #f3f4f6'
                }}>
                  <h3 style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    margin: '0 0 0.75rem 0'
                  }}>
                    <i className="fas fa-cog" style={{ marginRight: '0.5rem' }}></i>
                    Quick Controls
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: window.innerWidth < 640 ? '1fr' : '1fr 1fr',
                    gap: '0.75rem'
                  }}>
                    <button
                      id="manual-refresh"
                      onClick={handleManualRefresh}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.5rem 0.75rem',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
                      onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
                    >
                      <i className="fas fa-sync-alt" style={{ marginRight: '0.25rem' }}></i>
                      Refresh
                    </button>
                    <button
                      id="clear-cache"
                      onClick={handleClearCache}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.5rem 0.75rem',
                        backgroundColor: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => e.target.style.backgroundColor = '#4b5563'}
                      onMouseOut={(e) => e.target.style.backgroundColor = '#6b7280'}
                    >
                      <i className="fas fa-trash" style={{ marginRight: '0.25rem' }}></i>
                      Clear Cache
                    </button>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.5rem',
                    marginTop: '0.75rem'
                  }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '0.875rem'
                    }}>
                      <input
                        id="auto-refresh"
                        type="checkbox"
                        checked={autoRefresh}
                        onChange={(e) => setAutoRefresh(e.target.checked)}
                        style={{ marginRight: '0.5rem' }}
                      />
                      Live Updates
                    </label>
                    <span
                      id="refresh-status"
                      style={{
                        fontSize: '0.75rem',
                        color: autoRefresh ? '#059669' : '#6b7280'
                      }}
                    >
                      {autoRefresh ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                </div>
                
                {/* Live Clock */}
                <div style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '1rem',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #f3f4f6',
                  minWidth: 'max-content'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div
                      id="current-time"
                      style={{
                        fontSize: '1.125rem',
                        fontWeight: 'bold',
                        color: '#1f2937'
                      }}
                    >
                      {formatTime(currentTime)}
                    </div>
                    <div
                      id="current-date"
                      style={{
                        fontSize: '0.875rem',
                        color: '#6b7280'
                      }}
                    >
                      {currentTime.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Dashboard Content */}
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 1rem 2rem'
        }}>
          
          {/* Statistics Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            {/* Active Events Card */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              border: '1px solid #f3f4f6',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)'}
            onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    margin: '0'
                  }}>
                    Active Events
                  </p>
                  <p
                    id="active-events-count"
                    style={{
                      fontSize: '2rem',
                      fontWeight: 'bold',
                      color: '#2563eb',
                      marginTop: '0.5rem',
                      margin: '0.5rem 0 0 0'
                    }}
                  >
                    {stats.active_events_count || 0}
                  </p>
                </div>
                <div style={{
                  background: '#dbeafe',
                  borderRadius: '50%',
                  padding: '0.75rem'
                }}>
                  <i className="fas fa-calendar-check" style={{ color: '#2563eb', fontSize: '1.25rem' }}></i>
                </div>
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center' }}>
                <span style={{
                  color: '#3b82f6',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}>
                  <i className="fas fa-arrow-up" style={{ marginRight: '0.25rem' }}></i>
                  {stats.upcoming_events || 0} upcoming
                </span>
                <span style={{
                  color: '#6b7280',
                  fontSize: '0.875rem',
                  marginLeft: '0.5rem'
                }}>
                  {stats.ongoing_events || 0} ongoing
                </span>
              </div>
            </div>

            {/* Total Events Card */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              border: '1px solid #f3f4f6',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)'}
            onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    margin: '0'
                  }}>
                    Total Events
                  </p>
                  <p
                    id="total-events-count"
                    style={{
                      fontSize: '2rem',
                      fontWeight: 'bold',
                      color: '#059669',
                      marginTop: '0.5rem',
                      margin: '0.5rem 0 0 0'
                    }}
                  >
                    {stats.total_events_count || 0}
                  </p>
                </div>
                <div style={{
                  background: '#d1fae5',
                  borderRadius: '50%',
                  padding: '0.75rem'
                }}>
                  <i className="fas fa-chart-line" style={{ color: '#059669', fontSize: '1.25rem' }}></i>
                </div>
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center' }}>
                <span style={{
                  color: '#10b981',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}>
                  <i className="fas fa-check" style={{ marginRight: '0.25rem' }}></i>
                  {stats.completed_events || 0} completed
                </span>
                <span style={{
                  color: '#6b7280',
                  fontSize: '0.875rem',
                  marginLeft: '0.5rem'
                }}>
                  {stats.draft_events || 0} drafts
                </span>
              </div>
            </div>

            {/* Pending Jobs Card */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              border: '1px solid #f3f4f6',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)'}
            onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    margin: '0'
                  }}>
                    Pending Jobs
                  </p>
                  <p
                    id="pending-jobs-count"
                    style={{
                      fontSize: '2rem',
                      fontWeight: 'bold',
                      color: '#d97706',
                      marginTop: '0.5rem',
                      margin: '0.5rem 0 0 0'
                    }}
                  >
                    {stats.pending_jobs || 0}
                  </p>
                </div>
                <div style={{
                  background: '#fef3c7',
                  borderRadius: '50%',
                  padding: '0.75rem'
                }}>
                  <i className="fas fa-clock" style={{ color: '#d97706', fontSize: '1.25rem' }}></i>
                </div>
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center' }}>
                <span style={{
                  color: '#f59e0b',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}>
                  <i className="fas fa-hourglass-half" style={{ marginRight: '0.25rem' }}></i>
                  {stats.triggers_queued || 0} queued
                </span>
                <span style={{
                  color: '#6b7280',
                  fontSize: '0.875rem',
                  marginLeft: '0.5rem'
                }}>
                  in scheduler
                </span>
              </div>
            </div>

            {/* System Status Card */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              border: '1px solid #f3f4f6',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)'}
            onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    margin: '0'
                  }}>
                    System Status
                  </p>
                  <p
                    id="system-status"
                    style={{
                      fontSize: '2rem',
                      fontWeight: 'bold',
                      color: stats.system_status === 'Online' ? '#059669' : '#dc2626',
                      marginTop: '0.5rem',
                      margin: '0.5rem 0 0 0'
                    }}
                  >
                    {stats.system_status || 'Online'}
                  </p>
                </div>
                <div style={{
                  background: stats.system_status === 'Online' ? '#d1fae5' : '#fee2e2',
                  borderRadius: '50%',
                  padding: '0.75rem'
                }}>
                  <i
                    className={stats.system_status === 'Online' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'}
                    style={{
                      color: stats.system_status === 'Online' ? '#059669' : '#dc2626',
                      fontSize: '1.25rem'
                    }}
                  ></i>
                </div>
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: stats.system_status === 'Online' ? '#10b981' : '#ef4444',
                    marginRight: '0.5rem'
                  }}></div>
                  <span style={{
                    fontSize: '0.875rem',
                    color: '#374151'
                  }}>
                    All systems operational
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #f3f4f6'
          }}>
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #f3f4f6'
            }}>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#1f2937',
                display: 'flex',
                alignItems: 'center',
                margin: '0'
              }}>
                <i className="fas fa-history" style={{ color: '#2563eb', marginRight: '0.5rem' }}></i>
                Recent Activity
              </h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div id="activity-log" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {recentActivity.length > 0 ? (
                  recentActivity.map((log) => (
                    <div
                      key={log.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <i className={log.icon} style={{ color: 'white', fontSize: '0.875rem' }}></i>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{
                          margin: '0',
                          fontSize: '0.875rem',
                          color: '#1f2937',
                          fontWeight: '500'
                        }}>
                          {log.message}
                        </p>
                        <p style={{
                          margin: '0.25rem 0 0 0',
                          fontSize: '0.75rem',
                          color: '#6b7280'
                        }}>
                          {log.timestamp.toLocaleString()}
                        </p>
                      </div>
                      <span style={{
                        fontSize: '0.75rem',
                        color: '#10b981',
                        background: '#dcfce7',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '12px',
                        fontWeight: '500'
                      }}>
                        {log.type.replace('_', ' ')}
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{
                    textAlign: 'center',
                    color: '#6b7280',
                    padding: '2rem',
                    fontSize: '0.875rem'
                  }}>
                    <i className="fas fa-inbox" style={{ fontSize: '2rem', marginBottom: '1rem', display: 'block' }}></i>
                    No recent activity to display
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
