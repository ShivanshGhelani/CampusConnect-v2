import React, { useState } from 'react';
import certificateService from '../../services/certificateService';
import { clientAPI } from '../../api/client';
import LoadingSpinner from '../../components/LoadingSpinner';

const CertificateTest = () => {
  const [eventId, setEventId] = useState('IS2TESTU2026');
  const [testMode, setTestMode] = useState('student_individual');
  const [certificateType, setCertificateType] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [eventData, setEventData] = useState(null);

  // Mock registration data templates
  const mockRegistrations = {
    student_individual: {
      registration_id: "TEST_REG_001",
      student: {
        enrollment_no: "22BEIT30043",
        name: "Shivansh Ghelani",
        email: "shivansh_22043@ldrp.ac.in",
        phone: "8980811621",
        department: "Information Technology",
        year: 4,
        semester: 7
      },
      event: {
        event_id: "IS2TESTU2026",
        event_name: "Test Event",
        event_type: "workshop"
      },
      registration: {
        type: "individual",
        status: "confirmed"
      },
      team: null,
      attendance: {
        strategy: "session_based",
        status: "present",
        percentage: 100,
        sessions_attended: 2,
        total_sessions: 2
      }
    },
    student_team: {
      registration_id: "TEST_TEAM_REG_001",
      registration_type: "team",
      team: {
        team_name: "VIBE-CODERS",
        team_leader: "22BEIT30043",
        team_size: 3,
        status: "present"
      },
      team_members: [
        {
          registration_id: "TEST_MEMBER_001",
          student: {
            enrollment_no: "22BEIT30043",
            name: "Shivansh Ghelani",
            email: "shivansh_22043@ldrp.ac.in",
            phone: "8980811621",
            department: "Information Technology",
            semester: 7
          },
          is_team_leader: true,
          attendance: {
            strategy: "session_based",
            status: "present",
            percentage: 100,
            sessions_attended: 2,
            total_sessions: 2
          }
        }
      ]
    },
    faculty: {
      registration_id: "TEST_FAC_REG_001",
      faculty: {
        employee_id: "EMP002",
        name: "Dr. Nilam Thakkar",
        email: "nilam.thakkar@ldrp.ac.in",
        contact_no: "9876543210",
        department: "Information Technology",
        designation: "Assistant Professor"
      },
      event: {
        event_id: "IS2TESTU2026",
        event_name: "Test Event",
        event_type: "workshop"
      },
      registration: {
        type: "individual",
        status: "confirmed"
      },
      attendance: {
        strategy: "day_based",
        status: "present",
        percentage: 100,
        days_attended: 5,
        total_days: 5
      }
    }
  };

  const handleFetchEvent = async () => {
    try {
      setLoading(true);
      setResult(null);
      const response = await clientAPI.getEventDetails(eventId);
      if (response.data.success) {
        setEventData(response.data.event);
        // Set first certificate type as default
        const templates = response.data.event.certificate_templates || {};
        const firstType = Object.keys(templates)[0];
        if (firstType) setCertificateType(firstType);
        
        setResult({
          success: true,
          type: 'info',
          message: `Event loaded: ${response.data.event.event_name}`,
          data: response.data.event
        });
      }
    } catch (error) {
      setResult({
        success: false,
        type: 'error',
        message: `Failed to fetch event: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestCertificate = async () => {
    if (!eventData) {
      setResult({
        success: false,
        type: 'error',
        message: 'Please fetch event data first'
      });
      return;
    }

    const templates = eventData.certificate_templates || {};
    if (Object.keys(templates).length === 0) {
      setResult({
        success: false,
        type: 'error',
        message: 'Event does not have any certificate templates configured'
      });
      return;
    }

    if (!certificateType || !templates[certificateType]) {
      setResult({
        success: false,
        type: 'error',
        message: 'Please select a valid certificate type'
      });
      return;
    }

    try {
      setLoading(true);
      setResult({ type: 'info', message: `Generating ${certificateType}...` });

      // Get mock registration based on test mode
      let mockReg = mockRegistrations[testMode];
      
      // For team mode, use the first team member's data
      let registrationData = testMode === 'student_team' 
        ? {
            ...mockReg.team_members[0],
            team: mockReg.team,
            registration_type: 'team'
          }
        : mockReg;

      // Update mock data with actual event info
      registrationData.event = {
        event_id: eventData.event_id,
        event_name: eventData.event_name,
        event_type: eventData.event_type,
        start_datetime: eventData.start_datetime || eventData.start_date
      };

      console.log('🧪 Test Mode:', testMode);
      console.log('🎫 Certificate Type:', certificateType);
      console.log('📋 Mock Registration:', registrationData);
      console.log('🎫 Event Data:', eventData);

      // Generate certificate
      const templateUrl = templates[certificateType];
      const result = await certificateService.generateCertificate(
        registrationData,
        eventData,
        templateUrl,
        certificateType
      );

      if (result.success) {
        setResult({
          success: true,
          type: 'success',
          message: result.message
        });
      } else {
        setResult({
          success: false,
          type: 'error',
          message: result.error,
          details: result.details
        });
      }
    } catch (error) {
      console.error('❌ Test Error:', error);
      setResult({
        success: false,
        type: 'error',
        message: `Test failed: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = () => {
    certificateService.clearCache();
    setResult({
      success: true,
      type: 'info',
      message: 'Template cache cleared successfully'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            🧪 Certificate Generation Test Page
          </h1>
          <p className="text-gray-600">
            Test certificate generation without full registration flow
          </p>
        </div>

        {/* Event Input */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Step 1: Load Event</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              placeholder="Enter Event ID"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleFetchEvent}
              disabled={loading || !eventId}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Fetch Event
            </button>
          </div>
          
          {eventData && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <div className="flex-1">
                  <p className="font-semibold text-green-900">{eventData.event_name}</p>
                  <p className="text-sm text-green-700">ID: {eventData.event_id}</p>
                  <p className="text-sm text-green-700">
                    Templates: {eventData.certificate_templates && Object.keys(eventData.certificate_templates).length > 0 
                      ? `✓ ${Object.keys(eventData.certificate_templates).length} configured (${Object.keys(eventData.certificate_templates).join(', ')})`
                      : '✗ Not configured'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Test Mode Selection */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Step 2: Select Test Mode</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setTestMode('student_individual')}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                testMode === 'student_individual'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  testMode === 'student_individual' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                }`}></div>
                <span className="font-semibold">Student Individual</span>
              </div>
              <p className="text-sm text-gray-600">Individual student registration</p>
            </button>

            <button
              onClick={() => setTestMode('student_team')}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                testMode === 'student_team'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  testMode === 'student_team' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                }`}></div>
                <span className="font-semibold">Student Team</span>
              </div>
              <p className="text-sm text-gray-600">Team registration with team name</p>
            </button>

            <button
              onClick={() => setTestMode('faculty')}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                testMode === 'faculty'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  testMode === 'faculty' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                }`}></div>
                <span className="font-semibold">Faculty</span>
              </div>
              <p className="text-sm text-gray-600">Faculty registration</p>
            </button>
          </div>
        </div>

        {/* Certificate Type Selection */}
        {eventData && eventData.certificate_templates && Object.keys(eventData.certificate_templates).length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Step 3: Select Certificate Type</h2>
            <div className="space-y-3">
              {Object.keys(eventData.certificate_templates).map((type) => (
                <button
                  key={type}
                  onClick={() => setCertificateType(type)}
                  className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                    certificateType === type
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      certificateType === type ? 'border-green-500 bg-green-500' : 'border-gray-300'
                    }`}></div>
                    <span className="font-semibold">{type}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Step 4: Generate Certificate</h2>
          <div className="flex gap-3">
            <button
              onClick={handleTestCertificate}
              disabled={loading || !eventData}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinner size="sm" color="white" />
                  Generating...
                </span>
              ) : (
                '🎓 Generate Test Certificate'
              )}
            </button>
            <button
              onClick={handleClearCache}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Clear Cache
            </button>
          </div>
        </div>

        {/* Result Display */}
        {result && (
          <div className={`rounded-lg shadow-md p-6 ${
            result.type === 'error' ? 'bg-red-50 border border-red-200' :
            result.type === 'success' ? 'bg-green-50 border border-green-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-start gap-3">
              {result.type === 'error' && (
                <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              )}
              {result.type === 'success' && (
                <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              )}
              {result.type === 'info' && (
                <svg className="w-6 h-6 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              )}
              <div className="flex-1">
                <p className={`font-semibold ${
                  result.type === 'error' ? 'text-red-900' :
                  result.type === 'success' ? 'text-green-900' :
                  'text-blue-900'
                }`}>
                  {result.message}
                </p>
                {result.details && (
                  <pre className="mt-2 text-xs bg-white bg-opacity-50 p-2 rounded overflow-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="font-semibold text-blue-900 mb-2">📝 Testing Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            <li>Enter the event ID and click "Fetch Event"</li>
            <li>Ensure the event has a certificate_template URL configured</li>
            <li>Select a test mode (student/team/faculty)</li>
            <li>Click "Generate Test Certificate" to download PDF</li>
            <li>Check browser console for detailed logs</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default CertificateTest;
