import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { clientAPI } from '../../api/client';
import certificateGenerateService from '../../services/certificateGenerateService.jsx';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getCachedProfile, fetchProfileWithCache } from '../../utils/profileCache';

const FeedbackSuccess = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [searchParams] = useSearchParams();

  // State management
  const [event, setEvent] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isGeneratingCertificate, setIsGeneratingCertificate] = useState(false);
  const [certificateMessage, setCertificateMessage] = useState('');

  useEffect(() => {
    // Check if this is test mode from search params
    const isTestMode = searchParams.get('test_mode') === 'true';
    
    if (!isAuthenticated && !isTestMode) {
      navigate('/auth/login', { state: { from: `/client/events/${eventId}/feedback/success` } });
      return;
    }
    
    fetchData();
  }, [eventId, isAuthenticated, searchParams]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Check if this is test mode
      const isTestMode = searchParams.get('test_mode') === 'true';
      
      if (isTestMode) {
        // For test mode, set mock data - URLs will fail and use fallback templates
        setEvent({
          event_id: eventId,
          event_name: "AI & Deep Learning Hackathon",
          description: "Test event for feedback system",
          certificate_templates: {
            "Certificate of Participation": "https://gygschntnaivagnbwmgw.supabase.co/storage/v1/object/public/campusconnect/certificate-templates/participation-template.html",
            "Certificate of Innovation": "https://gygschntnaivagnbwmgw.supabase.co/storage/v1/object/public/campusconnect/certificate-templates/innovation-template.html"
          }
        });
        setRegistration({
          registrar_id: "22beit3004111",
          registration_id: "test_reg_" + Date.now(),
          full_name: "Test Student",
          email: "22beit3004111@test.edu",
          department: "Computer Engineering",
          course: "B.E. Information Technology"
        });
        setAttendance({
          attendance_id: "test_attendance_" + Date.now(),
          marked_at: new Date().toISOString()
        });
        return;
      }

      // Fetch event details
      const eventResponse = await clientAPI.getEventDetails(eventId);
      if (eventResponse.data.success) {
        setEvent(eventResponse.data.event);
        console.log('📅 Event Data:', eventResponse.data.event);
        console.log('📜 Certificate Templates:', eventResponse.data.event.certificate_templates);
        console.log('🎓 Is Certificate Based:', eventResponse.data.event.certificate_based);
      } else {
        throw new Error('Failed to fetch event details');
      }

      // Fetch registration status to get registration details
      const registrationResponse = await clientAPI.getRegistrationStatus(eventId);
      console.log('🎟️ Full Registration Response:', registrationResponse.data);
      if (registrationResponse.data.success) {
        const regData = registrationResponse.data.registration;
        console.log('📋 Registration Data:', regData);
        console.log('🔑 Registration ID:', regData?.registration_id);
        console.log('👤 Registrar ID:', regData?.registrar_id);
        setRegistration(regData);
      } else {
        console.error('❌ Failed to fetch registration');
      }

      // Fetch user profile - OPTIMIZED: Use cached profile data
      try {
        // First check cache for fast loading
        const cachedProfile = getCachedProfile();
        if (cachedProfile?.profile) {
          setUser(cachedProfile.profile);
          
        } else {
          // Fallback to API with cache
          const profileData = await fetchProfileWithCache();
          if (profileData?.profile) {
            setUser(profileData.profile);
            
          }
        }
      } catch (userError) {
        
      }

      // Fetch attendance status
      try {
        const attendanceResponse = await clientAPI.getAttendanceStatus(eventId);
        if (attendanceResponse.data.success && attendanceResponse.data.attended) {
          setAttendance({
            attendance_id: attendanceResponse.data.attendance_data?.attendance_id
          });
          
        }
      } catch (attendanceError) {
        // Attendance might not be marked yet, which is okay
        
      }

    } catch (error) {
      
      setError('Failed to load event details. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (dateTimeString, format = 'full') => {
    if (!dateTimeString) return 'N/A';
    
    const date = new Date(dateTimeString);
    
    if (format === 'full') {
      return date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
    
    return date.toLocaleDateString();
  };

  const handleCertificateDownload = async (certificateType = 'Certificate of Participation') => {
    try {
      setIsGeneratingCertificate(true);
      setCertificateMessage('');

      // Check if certificate templates are available
      if (!event?.certificate_templates || Object.keys(event.certificate_templates).length === 0) {
        throw new Error('No certificate templates available for this event');
      }

      // Test direct URL access first
      const templateUrl = event.certificate_templates[certificateType];
      if (templateUrl) {
        
        try {
          const testResponse = await fetch(templateUrl);
          
          if (testResponse.ok) {
            const content = await testResponse.text();
            
          }
        } catch (testError) {
          
        }
      }

      // Get user data (for test mode, use registration data)
      const isTestMode = searchParams.get('test_mode') === 'true';
      const studentData = isTestMode ? {
        full_name: registration?.full_name || 'Test Student',
        enrollment: registration?.registrar_id || '22beit3004111',
        email: `${registration?.registrar_id || '22beit3004111'}@test.edu`,
        department: 'Computer Engineering',
        course: 'B.E. Information Technology'
      } : user;

      // Debug the certificate generation process
      
      await certificateGenerateService.debugCertificateGeneration(
        event,
        studentData,
        registration,
        attendance,
        certificateType
      );

      // Generate certificate
      const result = await certificateGenerateService.generateCertificate(
        event,
        studentData,
        registration,
        attendance,
        certificateType
      );

      if (result.success) {
        setCertificateMessage('✅ Certificate downloaded successfully!');
      } else {
        throw new Error(result.message);
      }

    } catch (error) {
      
      setCertificateMessage(`❌ ${error.message}`);
    } finally {
      setIsGeneratingCertificate(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Event Not Found</h2>
          <p className="text-gray-600 mb-4">{error || 'The event you are looking for does not exist.'}</p>
          <Link 
            to="/client/events" 
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 md:min-h-[calc(100vh-120px)] md:flex md:items-center md:justify-center px-4">
      <div className="w-full max-w-2xl mx-auto space-y-6">
        {/* Success Message with Animation */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 rounded-full bg-green-100">
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Thank You for Your Feedback!</h1>
          <p className="text-gray-600">Your feedback will help us improve future events.</p>
        </div>

        {/* Certificate Collection Section - Only show if certificates are available */}
        {event?.certificate_based !== false && event?.certificate_templates && Object.keys(event.certificate_templates).length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-lg md:text-xl font-semibold text-gray-800 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              Collect Your Certificate
            </h2>
            
            <p className="text-sm text-gray-600">Your certificate is ready for download!</p>
            
            {certificateMessage && (
              <div className={`p-3 rounded-lg text-sm ${
                certificateMessage.includes('✅') 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {certificateMessage}
              </div>
              )}
              
              <div className="flex flex-wrap gap-3 justify-center">
                {Object.keys(event.certificate_templates).map((templateName) => (
                  <button
                    key={templateName}
                    onClick={() => handleCertificateDownload(templateName)}
                    disabled={isGeneratingCertificate}
                    className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-2.5 px-5 rounded-lg inline-flex items-center gap-2 transition-all shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
                  >
                    {isGeneratingCertificate ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                        </svg>
                        Download {templateName}
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>
          
        )}

        {/* Navigation Links */}
        <div className="text-center">
          <Link 
            to="/client/events"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            Back to Events
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FeedbackSuccess;
