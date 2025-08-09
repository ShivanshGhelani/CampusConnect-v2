import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { clientAPI } from '../../api/client';
import LoadingSpinner from '../LoadingSpinner';
import StudentEventRegistration from '../../pages/client/student/EventRegistration/StudentEventRegistration';
import AlreadyRegistered from '../../pages/client/student/EventRegistration/AlreadyRegistered';
import FacultyEventRegistration from '../../pages/client/faculty/EventRegistration/FacultyEventRegistration';
import FacultyAlreadyRegistered from '../../pages/client/faculty/EventRegistration/FacultyAlreadyRegistered';
import Layout from '../client/Layout';

/**
 * RegistrationRouter - Handles comprehensive registration flow logic
 * Checks: Authentication → User Type → Registration Status → Event Type → Show Appropriate Component
 */
const RegistrationRouter = ({ forceTeamMode = false }) => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user, userType, isAuthenticated, isLoading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [registrationStatus, setRegistrationStatus] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkRegistrationFlow = async () => {
      // Wait for auth to complete
      if (authLoading) {
        return;
      }

      // Step 1: Check if user is authenticated
      if (!isAuthenticated) {
        navigate(`/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
      }

      // Step 2: Check if user type is valid (support both students and faculty)
      if (!userType || (userType !== 'student' && userType !== 'faculty')) {
        setError('Invalid user type for event registration');
        setLoading(false);
        return;
      }

      if (!eventId) {
        setError('Event ID is required');
        setLoading(false);
        return;
      }

      try {
        // Step 3: Load event details (for display purposes)
        const eventResponse = await clientAPI.getEventDetails(eventId);
        
        console.log('=== REGISTRATION ROUTER API RESPONSE ===');
        console.log('Full API response:', eventResponse);
        console.log('Response.data structure:', eventResponse.data);
        
        // Correctly access the event data from the API response
        const eventData = eventResponse.data.success ? eventResponse.data.event : eventResponse.data;
        
        console.log('=== REGISTRATION ROUTER EVENT DATA ===');
        console.log('Extracted eventData:', eventData);
        
        if (!eventData) {
          throw new Error('Event data not found in response');
        }
        
        setEvent(eventData);

        // Step 4: Check current registration status
        try {
          const statusResponse = await clientAPI.getRegistrationStatus(eventId);
          console.log('Registration status response in router:', statusResponse.data);
          setRegistrationStatus(statusResponse.data);
          
          // If already registered, we'll show the AlreadyRegistered component
          if (statusResponse.data.success && statusResponse.data.registered) {
            setLoading(false);
            return;
          }
        } catch (statusError) {
          // If status check fails, assume not registered
          console.log('Registration status check failed, assuming not registered');
          setRegistrationStatus({ registered: false, success: false });
        }

        // All checks passed - ready to show registration form
        // Trust that if user reached this page, registration is allowed
        setLoading(false);

      } catch (error) {
        console.error('Error checking registration flow:', error);
        setError('Failed to load event details');
        setLoading(false);
      }
    };

    checkRegistrationFlow();
  }, [eventId, navigate, isAuthenticated, userType, authLoading, user]);

  // Loading state
  if (loading || authLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  // Error state
  if (error) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-red-100 mb-6">
              <i className="fas fa-exclamation-triangle text-red-600 text-2xl"></i>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Registration Not Available</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <button
                onClick={() => navigate(`/client/events/${eventId}`)}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                View Event Details
              </button>
              <button
                onClick={() => navigate('/client/events')}
                className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
              >
                Browse Other Events
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Show appropriate component based on user type and registration status
  // Use user ID and event ID to create a stable key that forces fresh data
  const componentKey = `${userType}-${eventId}-${user?.id || user?.enrollment_no || user?.employee_id || 'unknown'}`;
  
  if (userType === 'student') {
    if (registrationStatus?.success && registrationStatus?.registered) {
      return <AlreadyRegistered key={componentKey} />;
    }
    return <StudentEventRegistration key={componentKey} forceTeamMode={forceTeamMode} />;
  } else if (userType === 'faculty') {
    if (registrationStatus?.success && registrationStatus?.registered) {
      return <FacultyAlreadyRegistered key={componentKey} />;
    }
    return <FacultyEventRegistration key={componentKey} forceTeamMode={forceTeamMode} />;
  }

  // Fallback for unknown user types
  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">Unable to determine user type for registration</p>
          <button
            onClick={() => navigate('/client/events')}
            className="btn-primary"
          >
            Back to Events
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default RegistrationRouter;
