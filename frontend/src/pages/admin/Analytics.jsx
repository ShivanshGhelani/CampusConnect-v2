import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api/axios';
import AdminLayout from '../../components/admin/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';

function Analytics() {
  const [analytics, setAnalytics] = useState({
    totalEvents: 0,
    totalStudents: 0,
    totalRegistrations: 0,
    completedEvents: 0,
    ongoingEvents: 0,
    upcomingEvents: 0,
    registrationTrends: [],
    eventCategories: [],
    monthlyStats: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const response = await adminAPI.getDashboardStats();
      
      if (response.data.success) {
        const data = response.data.data;
        setAnalytics({
          totalEvents: data.total_events_count || 0,
          totalStudents: data.student_count || 0,
          totalRegistrations: data.total_registrations || 0,
          completedEvents: data.completed_events_count || 0,
          ongoingEvents: data.ongoing_events_count || 0,
          upcomingEvents: data.upcoming_events_count || 0,
          registrationTrends: data.registration_trends || [],
          eventCategories: data.event_categories || [],
          monthlyStats: data.monthly_stats || []
        });
        setError('');
      } else {
        throw new Error(response.data.message || 'Failed to fetch analytics');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout pageTitle="Analytics">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Analytics">
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <i className="fas fa-calendar-alt text-xl"></i>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total Events</h3>
                <p className="text-2xl font-semibold text-gray-900">{analytics.totalEvents}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <i className="fas fa-users text-xl"></i>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total Students</h3>
                <p className="text-2xl font-semibold text-gray-900">{analytics.totalStudents}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <i className="fas fa-user-check text-xl"></i>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Registrations</h3>
                <p className="text-2xl font-semibold text-gray-900">{analytics.totalRegistrations}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                <i className="fas fa-chart-line text-xl"></i>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Completion Rate</h3>
                <p className="text-2xl font-semibold text-gray-900">
                  {analytics.totalEvents > 0 
                    ? Math.round((analytics.completedEvents / analytics.totalEvents) * 100) 
                    : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Event Status Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Status Distribution</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-600">Completed Events</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{analytics.completedEvents}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-600">Ongoing Events</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{analytics.ongoingEvents}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-600">Upcoming Events</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{analytics.upcomingEvents}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button 
                onClick={fetchAnalytics}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <i className="fas fa-sync-alt mr-2"></i>
                Refresh Data
              </button>
              <button className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center">
                <i className="fas fa-download mr-2"></i>
                Export Report
              </button>
              <button className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center">
                <i className="fas fa-chart-bar mr-2"></i>
                View Detailed Charts
              </button>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {analytics.totalEvents > 0 
                  ? Math.round((analytics.totalRegistrations / analytics.totalEvents) * 100) / 100
                  : 0}
              </div>
              <div className="text-sm text-gray-500">Avg Registrations per Event</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {analytics.totalStudents > 0 && analytics.totalRegistrations > 0
                  ? Math.round((analytics.totalRegistrations / analytics.totalStudents) * 100)
                  : 0}%
              </div>
              <div className="text-sm text-gray-500">Student Engagement Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {analytics.totalEvents > 0 
                  ? Math.round((analytics.completedEvents / analytics.totalEvents) * 100)
                  : 0}%
              </div>
              <div className="text-sm text-gray-500">Event Success Rate</div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default Analytics;
