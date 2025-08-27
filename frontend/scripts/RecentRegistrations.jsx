/**
 * Recent Registrations Component for EventDetail.jsx
 * =================================================
 * Component to display recent registrations for an event
 * This should be integrated into the EventDetail.jsx component
 */

import React, { useState, useEffect } from 'react';
import { Calendar, User, Users, Clock, Badge } from 'lucide-react';

const RecentRegistrations = ({ eventId }) => {
  const [recentRegistrations, setRecentRegistrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (eventId) {
      fetchRecentRegistrations();
    }
  }, [eventId]);

  const fetchRecentRegistrations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Call the new recent registrations API endpoint
      const response = await fetch(`/api/v1/registrations/event/${eventId}/recent?limit=10`);
      const data = await response.json();
      
      if (data.success) {
        setRecentRegistrations(data.recent_registrations || []);
      } else {
        setError(data.message || 'Failed to load recent registrations');
      }
    } catch (err) {
      setError('Failed to fetch recent registrations');
      console.error('Error fetching recent registrations:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const registrationTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now - registrationTime) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getRegistrationTypeIcon = (type) => {
    return type === 'team' ? <Users className="w-4 h-4" /> : <User className="w-4 h-4" />;
  };

  const getRegistrationTypeBadge = (type, teamInfo) => {
    if (type === 'team') {
      return (
        <div className="flex items-center gap-1">
          <Badge className="w-3 h-3 text-blue-600" />
          <span className="text-xs text-blue-600 font-medium">
            {teamInfo?.role === 'leader' ? 'Team Leader' : 'Team Member'}
          </span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1">
        <Badge className="w-3 h-3 text-green-600" />
        <span className="text-xs text-green-600 font-medium">Individual</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Recent Registrations
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Recent Registrations
        </h3>
        <div className="text-center py-4">
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={fetchRecentRegistrations}
            className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Recent Registrations
        </h3>
        {recentRegistrations.length > 0 && (
          <span className="text-sm text-gray-500">
            {recentRegistrations.length} recent
          </span>
        )}
      </div>

      {recentRegistrations.length === 0 ? (
        <div className="text-center py-8">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No registrations yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {recentRegistrations.map((registration) => (
            <div
              key={registration.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              {/* Avatar */}
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                {getRegistrationTypeIcon(registration.registration.type)}
              </div>

              {/* Student Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-gray-900 truncate">
                    {registration.student.name}
                  </p>
                  {getRegistrationTypeBadge(
                    registration.registration.type,
                    registration.team_info
                  )}
                </div>
                
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <span>{registration.student.enrollment_no}</span>
                  <span>•</span>
                  <span>{registration.student.department}</span>
                  {registration.student.year && (
                    <>
                      <span>•</span>
                      <span>Year {registration.student.year}</span>
                    </>
                  )}
                </div>

                {/* Team Info */}
                {registration.team_info && (
                  <div className="mt-1 text-xs text-blue-600">
                    Team: {registration.team_info.team_name}
                  </div>
                )}
              </div>

              {/* Time */}
              <div className="flex flex-col items-end text-sm text-gray-500">
                <span>{formatTimeAgo(registration.registration.registered_at)}</span>
                <span className="text-xs capitalize">
                  {registration.registration.status}
                </span>
              </div>
            </div>
          ))}

          {/* View All Link */}
          {recentRegistrations.length >= 10 && (
            <div className="text-center pt-2">
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                View all registrations →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecentRegistrations;

/**
 * Usage Instructions for integrating into EventDetail.jsx:
 * 
 * 1. Import this component:
 *    import RecentRegistrations from './RecentRegistrations';
 * 
 * 2. Add it to your EventDetail.jsx component layout:
 *    <RecentRegistrations eventId={eventId} />
 * 
 * 3. Recommended placement: After event information but before footer
 * 
 * 4. Make sure to install required dependencies if not already present:
 *    npm install lucide-react
 * 
 * 5. The component automatically handles:
 *    - Loading states
 *    - Error handling
 *    - Empty states
 *    - Individual vs Team registration display
 *    - Time formatting (e.g., "2h ago", "Just now")
 * 
 * 6. Styling: Uses Tailwind CSS classes - ensure your project has Tailwind CSS
 * 
 * 7. API Integration: Calls `/api/v1/registrations/event/{eventId}/recent`
 *    This endpoint should be implemented in your backend
 */
