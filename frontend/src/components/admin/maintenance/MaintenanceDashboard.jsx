import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { maintenanceAPI, venueApi } from '../../../api/axios';
import MaintenanceScheduler from './MaintenanceScheduler';
import MaintenanceCalendar from './MaintenanceCalendar';
import { 
  WrenchScrewdriverIcon,
  CalendarDaysIcon,
  ListBulletIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

const MaintenanceDashboard = () => {
  const { user } = useAuth();
  
  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    total_maintenance_windows: 0,
    scheduled_count: 0,
    in_progress_count: 0,
    completed_count: 0,
    cancelled_count: 0,
    upcoming_maintenance: [],
    maintenance_this_week: 0,
    venues_under_maintenance: 0,
    affected_bookings_count: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Load data on component mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load maintenance statistics
      const [maintenanceResponse] = await Promise.all([
        maintenanceAPI.getMaintenanceWindows({
          include_past: true,
          limit: 100
        })
      ]);
      
      const maintenanceWindows = maintenanceResponse.data.maintenance_windows || [];
      calculateStats(maintenanceWindows);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (maintenanceWindows) => {
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Count by status
    const statusCounts = {
      scheduled: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0
    };
    
    let maintenanceThisWeek = 0;
    let affectedBookingsCount = 0;
    const uniqueVenues = new Set();
    const upcomingMaintenance = [];
    
    maintenanceWindows.forEach(maintenance => {
      // Count by status
      statusCounts[maintenance.status] = (statusCounts[maintenance.status] || 0) + 1;
      
      const startTime = new Date(maintenance.start_time);
      const endTime = new Date(maintenance.end_time);
      
      // Count maintenance this week
      if (startTime <= oneWeekFromNow && endTime >= now) {
        maintenanceThisWeek++;
      }
      
      // Count venues under maintenance
      if (maintenance.status === 'scheduled' || maintenance.status === 'in_progress') {
        uniqueVenues.add(maintenance.venue_id);
      }
      
      // Count affected bookings
      if (maintenance.affected_bookings_count) {
        affectedBookingsCount += maintenance.affected_bookings_count;
      }
      
      // Collect upcoming maintenance (next 7 days)
      if (maintenance.status === 'scheduled' && startTime <= oneWeekFromNow && startTime >= now) {
        upcomingMaintenance.push(maintenance);
      }
    });
    
    // Sort upcoming maintenance by start time
    upcomingMaintenance.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    
    setStats({
      total_maintenance_windows: maintenanceWindows.length,
      scheduled_count: statusCounts.scheduled || 0,
      in_progress_count: statusCounts.in_progress || 0,
      completed_count: statusCounts.completed || 0,
      cancelled_count: statusCounts.cancelled || 0,
      upcoming_maintenance: upcomingMaintenance.slice(0, 5), // Top 5 upcoming
      maintenance_this_week: maintenanceThisWeek,
      venues_under_maintenance: uniqueVenues.size,
      affected_bookings_count: affectedBookingsCount
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'text-blue-600 bg-blue-100',
      in_progress: 'text-yellow-600 bg-yellow-100',
      completed: 'text-green-600 bg-green-100',
      cancelled: 'text-gray-600 bg-gray-100'
    };
    return colors[status] || colors.scheduled;
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'scheduler', name: 'Schedule Maintenance', icon: ListBulletIcon },
    { id: 'calendar', name: 'Calendar View', icon: CalendarDaysIcon }
  ];

  const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue' }) => {
    const colorClasses = {
      blue: 'bg-blue-50 text-blue-600',
      yellow: 'bg-yellow-50 text-yellow-600',
      green: 'bg-green-50 text-green-600',
      red: 'bg-red-50 text-red-600',
      gray: 'bg-gray-50 text-gray-600'
    };

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center">
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <WrenchScrewdriverIcon className="h-8 w-8 mr-3 text-blue-600" />
            Maintenance Management
          </h1>
          <p className="text-gray-600 mt-1">Manage venue maintenance schedules and monitor system health</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={() => setError('')}
                className="text-sm text-red-600 underline mt-2"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Statistics Cards */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                    <div className="ml-4 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                      <div className="h-6 bg-gray-200 rounded w-12"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Maintenance Windows"
                value={stats.total_maintenance_windows}
                icon={WrenchScrewdriverIcon}
                color="blue"
              />
              <StatCard
                title="Scheduled"
                value={stats.scheduled_count}
                icon={ClockIcon}
                color="blue"
              />
              <StatCard
                title="In Progress"
                value={stats.in_progress_count}
                icon={ExclamationTriangleIcon}
                color="yellow"
              />
              <StatCard
                title="Completed"
                value={stats.completed_count}
                icon={CheckCircleIcon}
                color="green"
              />
              <StatCard
                title="This Week"
                value={stats.maintenance_this_week}
                subtitle="Maintenance windows"
                icon={CalendarDaysIcon}
                color="blue"
              />
              <StatCard
                title="Venues Under Maintenance"
                value={stats.venues_under_maintenance}
                icon={WrenchScrewdriverIcon}
                color="yellow"
              />
              <StatCard
                title="Affected Bookings"
                value={stats.affected_bookings_count}
                subtitle="Total conflicts"
                icon={ExclamationTriangleIcon}
                color="red"
              />
              <StatCard
                title="Cancelled"
                value={stats.cancelled_count}
                icon={XCircleIcon}
                color="gray"
              />
            </div>
          )}

          {/* Upcoming Maintenance */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Upcoming Maintenance</h3>
              <p className="text-sm text-gray-600">Next 7 days</p>
            </div>
            <div className="divide-y divide-gray-200">
              {isLoading ? (
                <div className="p-6">
                  <div className="animate-pulse space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : stats.upcoming_maintenance.length === 0 ? (
                <div className="p-6 text-center">
                  <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No upcoming maintenance</h3>
                  <p className="mt-1 text-sm text-gray-500">No maintenance windows scheduled for the next 7 days.</p>
                </div>
              ) : (
                stats.upcoming_maintenance.map((maintenance) => (
                  <div key={maintenance.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <WrenchScrewdriverIcon className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">
                            {maintenance.venue_name}
                          </h4>
                          <p className="text-sm text-gray-600">{maintenance.reason}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDateTime(maintenance.start_time)} - {formatDateTime(maintenance.end_time)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(maintenance.status)}`}>
                          {maintenance.status.replace('_', ' ').charAt(0).toUpperCase() + maintenance.status.replace('_', ' ').slice(1)}
                        </span>
                        {maintenance.affected_bookings_count > 0 && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                            {maintenance.affected_bookings_count} conflicts
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setActiveTab('scheduler')}
                className="flex items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ListBulletIcon className="h-6 w-6 text-blue-600 mr-3" />
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">Schedule Maintenance</div>
                  <div className="text-xs text-gray-600">Create new maintenance windows</div>
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('calendar')}
                className="flex items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <CalendarDaysIcon className="h-6 w-6 text-green-600 mr-3" />
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">View Calendar</div>
                  <div className="text-xs text-gray-600">See maintenance schedule</div>
                </div>
              </button>
              
              <button
                onClick={loadDashboardData}
                className="flex items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ChartBarIcon className="h-6 w-6 text-purple-600 mr-3" />
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">Refresh Data</div>
                  <div className="text-xs text-gray-600">Update statistics</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'scheduler' && <MaintenanceScheduler />}
      {activeTab === 'calendar' && <MaintenanceCalendar />}
    </div>
  );
};

export default MaintenanceDashboard;
