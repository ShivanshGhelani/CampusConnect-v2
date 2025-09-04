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
        console.log('📅 Real event data loaded:', eventResponse.data.event);
        console.log('🎖️ Available certificate templates:', eventResponse.data.event.certificate_templates);
        console.log('🗂️ Event has certificates:', !!eventResponse.data.event.certificate_templates);
      } else {
        throw new Error('Failed to fetch event details');
      }

      // Fetch registration status to get registration details
      const registrationResponse = await clientAPI.getRegistrationStatus(eventId);
      if (registrationResponse.data.success) {
        setRegistration(registrationResponse.data.registration);
        console.log('📝 Registration data loaded:', registrationResponse.data.registration);
      } else {
        console.log('⚠️ No registration found for this event');
      }

      // Fetch user profile - OPTIMIZED: Use cached profile data
      try {
        // First check cache for fast loading
        const cachedProfile = getCachedProfile();
        if (cachedProfile?.profile) {
          setUser(cachedProfile.profile);
          console.log('👤 User profile loaded from cache:', cachedProfile.profile);
        } else {
          // Fallback to API with cache
          const profileData = await fetchProfileWithCache();
          if (profileData?.profile) {
            setUser(profileData.profile);
            console.log('👤 User profile loaded from API:', profileData.profile);
          }
        }
      } catch (userError) {
        console.log('User profile not available:', userError);
      }

      // Fetch attendance status
      try {
        const attendanceResponse = await clientAPI.getAttendanceStatus(eventId);
        if (attendanceResponse.data.success && attendanceResponse.data.attended) {
          setAttendance({
            attendance_id: attendanceResponse.data.attendance_data?.attendance_id
          });
          console.log('✅ Attendance confirmed:', attendanceResponse.data.attendance_data);
        }
      } catch (attendanceError) {
        // Attendance might not be marked yet, which is okay
        console.log('Attendance not found:', attendanceError);
      }

    } catch (error) {
      console.error('Data fetch error:', error);
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
        console.log('🔍 Testing direct URL access...');
        try {
          const testResponse = await fetch(templateUrl);
          console.log(`🌐 Direct fetch test: ${testResponse.status} ${testResponse.ok ? '✅' : '❌'}`);
          if (testResponse.ok) {
            const content = await testResponse.text();
            console.log(`📄 Content preview: ${content.substring(0, 200)}...`);
          }
        } catch (testError) {
          console.log('🚫 Direct fetch test failed:', testError.message);
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
      console.log('=== STARTING CERTIFICATE GENERATION ===');
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
      console.error('Certificate generation error:', error);
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
    <div>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Success Message with Animation */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-block p-4 rounded-full bg-green-100 mb-4 animate-success-pop">
            <svg className="w-12 h-12 text-green-600 animate-success-check" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Thank You for Your Feedback!</h1>
          <p className="text-lg text-gray-600 mb-8">Your feedback will help us improve future events.</p>
        </div>

        {/* Event Details Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8 transform hover:scale-[1.02] transition-all duration-300">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
            </svg>
            Event Details
          </h2>
          <div className="border-t border-gray-200 pt-4">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="transform hover:-translate-y-1 transition-all duration-200">
                <dt className="text-sm font-medium text-gray-500">Registration ID</dt>
                <dd className="mt-1 text-lg font-medium text-gray-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
                  </svg>
                  {registration?.registrar_id || registration?.registration_id || 'N/A'}
                </dd>
              </div>
              <div className="transform hover:-translate-y-1 transition-all duration-200">
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-lg text-gray-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                  </svg>
                  {registration?.full_name || user?.full_name || user?.name || 'N/A'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Next Steps Card */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-lg p-8 transform hover:scale-[1.02] transition-all duration-300">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            Next Steps
          </h2>
          <div className="space-y-4">
            <p className="text-gray-600">Your feedback has been successfully submitted! You can now proceed to collect your certificate.</p>
            
            {attendance && attendance.attendance_id && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <div>
                    <p className="font-medium">Certificate Eligibility Confirmed</p>
                    <p className="text-sm">Registration ID: {registration?.registrar_id || registration?.registration_id} | Attendance ID: {attendance.attendance_id}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Certificate Download Section */}
            <div className="space-y-4">
              {certificateMessage && (
                <div className={`p-3 rounded-lg text-sm ${
                  certificateMessage.includes('✅') 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {certificateMessage}
                </div>
              )}
              
              {event?.certificate_templates && Object.keys(event.certificate_templates).length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">Available certificates:</p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    {Object.keys(event.certificate_templates).map((templateName) => (
                      <button
                        key={templateName}
                        onClick={() => handleCertificateDownload(templateName)}
                        disabled={isGeneratingCertificate}
                        className="group bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-3 px-6 rounded-lg inline-flex items-center transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:transform-none disabled:cursor-not-allowed"
                      >
                        {isGeneratingCertificate ? (
                          <>
                            <svg className="w-5 h-5 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Generating...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5 mr-2 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 20 20">
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
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
                  <p className="text-sm">Certificate templates are not available for this event yet. Please contact the event organizers.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="mt-8 text-center">
          <Link 
            to="/client/events"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium group transition-all duration-200"
          >
            <svg className="w-4 h-4 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
