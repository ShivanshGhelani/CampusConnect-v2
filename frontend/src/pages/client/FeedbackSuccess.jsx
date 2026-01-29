import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { clientAPI } from '../../api/client';
import LoadingSpinner from '../../components/LoadingSpinner';
import certificateService from '../../services/certificateService';

const FeedbackSuccess = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [searchParams] = useSearchParams();

  // State management
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [registration, setRegistration] = useState(null);
  const [certificateTypes, setCertificateTypes] = useState([]);
  const [selectedCertificateType, setSelectedCertificateType] = useState('');
  const [certificateStatus, setCertificateStatus] = useState({
    checking: false,
    eligible: false,
    downloading: false,
    message: ''
  });

  useEffect(() => {
    // Check if this is anonymous submission from search params
    const isAnonymous = searchParams.get('anonymous') === 'true';
    
    if (!isAuthenticated && !isAnonymous) {
      navigate('/auth/login', { state: { from: `/client/events/${eventId}/feedback/success` } });
      return;
    }
    
    fetchData();
  }, [eventId, isAuthenticated, searchParams]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Check if this is anonymous submission from search params
      const isAnonymous = searchParams.get('anonymous') === 'true';
      
      // Fetch event details
      const eventResponse = await clientAPI.getEventDetails(eventId);
      if (eventResponse.data.success) {
        setEvent(eventResponse.data.event);
      } else {
        throw new Error('Failed to fetch event details');
      }

      // Fetch registration details if authenticated (for certificate eligibility)
      if (isAuthenticated && user) {
        try {
          const regResponse = await clientAPI.getMyRegistration(eventId);
          if (regResponse.data.success) {
            setRegistration(regResponse.data.registration);
            
            // Check certificate eligibility
            checkCertificateEligibility(regResponse.data.registration, eventResponse.data.event);
          }
        } catch (regError) {
          console.error('Could not fetch registration:', regError);
          // Don't fail the whole page if registration fetch fails
        }
      }

    } catch (error) {
      console.error('Error fetching event details:', error);
      setError('Failed to load event details. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const checkCertificateEligibility = (regData, eventData) => {
    setCertificateStatus(prev => ({ ...prev, checking: true }));

    // Check if event has certificate templates
    const templates = eventData.certificate_templates || {};
    const templateKeys = Object.keys(templates);
    
    if (templateKeys.length === 0) {
      setCertificateStatus({
        checking: false,
        eligible: false,
        downloading: false,
        message: ''
      });
      return;
    }

    // Store available certificate types
    setCertificateTypes(templateKeys);
    setSelectedCertificateType(templateKeys[0]); // Select first by default

    // Check eligibility using service
    const eligibility = certificateService.checkEligibility(regData, eventData);
    
    setCertificateStatus({
      checking: false,
      eligible: eligibility.eligible,
      downloading: false,
      message: eligibility.eligible 
        ? 'Congratulations! You are eligible for the certificate.' 
        : eligibility.reason
    });
  };

  const handleDownloadCertificate = async () => {
    if (!registration || !event || !event.certificate_templates || !selectedCertificateType) {
      return;
    }

    setCertificateStatus(prev => ({ ...prev, downloading: true, message: 'Generating your certificate...' }));

    try {
      const templateUrl = event.certificate_templates[selectedCertificateType];
      const result = await certificateService.generateCertificate(
        registration,
        event,
        templateUrl,
        selectedCertificateType
      );

      if (result.success) {
        setCertificateStatus(prev => ({
          ...prev,
          downloading: false,
          message: result.message
        }));
      } else {
        setCertificateStatus(prev => ({
          ...prev,
          downloading: false,
          eligible: false,
          message: result.error || 'Failed to generate certificate'
        }));
      }
    } catch (error) {
      console.error('Certificate download error:', error);
      setCertificateStatus(prev => ({
        ...prev,
        downloading: false,
        message: 'An error occurred while generating your certificate'
      }));
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

        {/* Certificate Section - Only for authenticated users with eligible attendance */}
        {isAuthenticated && registration && event?.certificate_templates && Object.keys(event.certificate_templates).length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                certificateStatus.eligible ? 'bg-blue-100' : 'bg-orange-100'
              }`}>
                {certificateStatus.eligible ? (
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                )}
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Event Certificate
                </h3>
                
                {certificateStatus.checking ? (
                  <div className="flex items-center gap-2 text-gray-600">
                    <LoadingSpinner size="sm" />
                    <span>Checking eligibility...</span>
                  </div>
                ) : certificateStatus.eligible ? (
                  <>
                    <p className="text-gray-700 mb-3">
                      {certificateStatus.message}
                    </p>
                    
                    {/* Certificate Type Selector */}
                    {certificateTypes.length > 1 && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Certificate Type:
                        </label>
                        <select
                          value={selectedCertificateType}
                          onChange={(e) => setSelectedCertificateType(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {certificateTypes.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    
                    <button
                      onClick={handleDownloadCertificate}
                      disabled={certificateStatus.downloading}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {certificateStatus.downloading ? (
                        <>
                          <LoadingSpinner size="sm" color="white" />
                          <span>Generating Certificate...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                          </svg>
                          <span>Download {selectedCertificateType}</span>
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-orange-800 text-sm">
                      <strong>Certificate Not Available:</strong> {certificateStatus.message}
                    </p>
                    <p className="text-orange-700 text-xs mt-2">
                      Please ensure you met the attendance requirements for this event.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Anonymous user message for certificate */}
        {!isAuthenticated && event?.certificate_templates && Object.keys(event.certificate_templates).length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <p className="text-blue-800 font-medium">Want to download your certificate?</p>
                <p className="text-blue-700 text-sm mt-1">
                  Please{' '}
                  <Link to="/auth/login" className="underline hover:text-blue-900 font-medium">
                    log in
                  </Link>
                  {' '}to check your eligibility and download your participation certificate.
                </p>
              </div>
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
