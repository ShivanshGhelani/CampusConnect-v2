import React, { useState, useEffect } from 'react';
import { clientAPI } from '../../api/axios';
import ClientLayout from '../../components/client/Layout';
import LoadingSpinner from '../../components/LoadingSpinner';

function Dashboard() {
  const [registrations, setRegistrations] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch user's events and registrations
      const eventsResponse = await clientAPI.getEvents();
      if (eventsResponse.data.success) {
        const events = eventsResponse.data.events || [];
        
        // Filter events where user is registered
        const userRegistrations = events.filter(event => event.user_registered);
        const recentEventsList = events.slice(0, 5); // Show recent 5 events
        
        setRegistrations(userRegistrations);
        setRecentEvents(recentEventsList);
      }
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const getEventStatusBadge = (status, subStatus) => {
    if (status === 'upcoming') {
      if (subStatus === 'registration_open') {
        return <span className="badge-info">Registration Open</span>;
      }
      return <span className="badge-warning">Upcoming</span>;
    }
    if (status === 'ongoing') {
      return <span className="badge-success">Ongoing</span>;
    }
    if (status === 'completed') {
      return <span className="badge-success">Completed</span>;
    }
    return <span className="badge-warning">{status}</span>;
  };

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="container-custom flex justify-center items-center min-h-64">
          <LoadingSpinner size="lg" />
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="container-custom">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's your event overview.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stats Cards */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card">
              <div className="card-content">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Registrations</p>
                    <p className="text-2xl font-bold text-gray-900">{registrations.length}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-content">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Completed Events</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {registrations.filter(event => event.status === 'completed').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-content">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Upcoming Events</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {registrations.filter(event => event.status === 'upcoming').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* My Registrations */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="card-header">
                <h2 className="text-xl font-semibold">My Registrations</h2>
              </div>
              <div className="card-content">
                {registrations.length > 0 ? (
                  <div className="space-y-4">
                    {registrations.map((event) => (
                      <div key={event.event_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-gray-900">{event.event_name}</h3>
                          {getEventStatusBadge(event.status, event.sub_status)}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                        <div className="flex justify-between items-center text-sm text-gray-500">
                          <span>📅 {new Date(event.start_datetime).toLocaleDateString()}</span>
                          <span>📍 {event.venue}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No registrations</h3>
                    <p className="mt-1 text-sm text-gray-500">Start by registering for events!</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Events */}
          <div>
            <div className="card">
              <div className="card-header">
                <h2 className="text-xl font-semibold">Recent Events</h2>
              </div>
              <div className="card-content">
                {recentEvents.length > 0 ? (
                  <div className="space-y-3">
                    {recentEvents.map((event) => (
                      <div key={event.event_id} className="border-l-4 border-primary-500 pl-4">
                        <h4 className="font-medium text-gray-900 text-sm">{event.event_name}</h4>
                        <p className="text-xs text-gray-500">{new Date(event.start_datetime).toLocaleDateString()}</p>
                        {getEventStatusBadge(event.status, event.sub_status)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No recent events available.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}

export default Dashboard;
