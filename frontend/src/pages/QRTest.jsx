import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCodeDisplay from '../components/client/QRCodeDisplay';
import QRScannerDemo from '../components/client/QRScannerDemo';
import QRCodeModal from '../components/client/QRCodeModal';
import Layout from '../components/client/Layout';

/**
 * Quick Test Page - Demonstrates Single QR per Team Approach
 */
const QRTest = () => {
  const navigate = useNavigate();
  const [showQRModal, setShowQRModal] = useState(false);
  const [modalRegistrationData, setModalRegistrationData] = useState(null);
  const [currentDemo, setCurrentDemo] = useState('individual'); // 'individual', 'team', 'scanner'

  // Mock data that matches real registration structure
  const mockIndividualData = {
    registration_id: 'REG_2025_WORKSHOP_IND_456',
    registrar_id: 'REG_2025_WORKSHOP_IND_456',
    registration_type: 'individual',
    registration_datetime: '2025-08-19T14:30:00.000Z',
    payment_status: 'completed',
    full_name: 'John Smith',
    enrollment_no: '21IT1234567',
    email: 'john.smith@college.edu',
    department: 'Information Technology',
    semester: '6'
  };

  const mockTeamData = {
    registration_id: 'REG_2025_HACKATHON_TEAM_789',
    registrar_id: 'REG_2025_HACKATHON_TEAM_789',
    registration_type: 'team',
    registration_datetime: '2025-08-19T14:30:00.000Z',
    payment_status: 'completed',
    full_name: 'Alice Johnson',
    enrollment_no: '21CS1234567',
    email: 'alice.johnson@college.edu',
    department: 'Computer Science',
    semester: '6',
    team_name: 'Algorithm Ninjas',
    student_data: {
      full_name: 'Alice Johnson',
      enrollment_no: '21CS1234567',
      email: 'alice.johnson@college.edu',
      department: 'Computer Science',
      semester: '6'
    },
    team_members: [
      {
        name: 'Bob Wilson',
        enrollment_no: '21CS1234568',
        department: 'Computer Science'
      },
      {
        name: 'Carol Davis',
        enrollment_no: '21IT1234569',
        department: 'Information Technology'
      },
      {
        name: 'David Brown',
        enrollment_no: '21CS1234570',
        department: 'Computer Science'
      }
    ]
  };

  const mockEventData = {
    event_id: 'EVT_HACKATHON_2025',
    id: 'EVT_HACKATHON_2025',
    event_name: '48-Hour Hackathon Challenge 2025',
    title: '48-Hour Hackathon Challenge 2025',
    name: '48-Hour Hackathon Challenge 2025',
    event_date: '2025-09-20',
    event_time: '09:00 AM',
    venue: 'Innovation Hub - Tech Park Campus',
    registration_mode: 'team'
  };

  const handleViewQRCode = (data) => {
    setModalRegistrationData(data);
    setShowQRModal(true);
  };

  const getCurrentRegistrationData = () => {
    return currentDemo === 'individual' ? mockIndividualData : mockTeamData;
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">QR Code System Demo</h1>
            <p className="text-gray-600 mb-6">
              Demonstration of our improved QR code system with single QR per team and smart attendance marking
            </p>
            
            {/* Demo Mode Selector */}
            <div className="flex justify-center space-x-4 mb-6">
              <button
                onClick={() => setCurrentDemo('individual')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentDemo === 'individual'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Individual Registration
              </button>
              <button
                onClick={() => setCurrentDemo('team')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentDemo === 'team'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Team Registration
              </button>
              <button
                onClick={() => setCurrentDemo('scanner')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentDemo === 'scanner'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Scanner Interface
              </button>
            </div>
          </div>

          {/* Demo Content */}
          {currentDemo === 'scanner' ? (
            <QRScannerDemo />
          ) : (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  {currentDemo === 'individual' ? 'Individual Registration QR Code' : 'Team Registration QR Code'}
                </h2>
                <p className="text-gray-600">
                  {currentDemo === 'individual' 
                    ? 'Single QR code for individual attendance marking'
                    : 'Single QR code for entire team with individual member attendance marking'
                  }
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* QR Code Display */}
                <div className="flex flex-col items-center">
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-4">
                    <QRCodeDisplay 
                      registrationData={getCurrentRegistrationData()}
                      eventData={mockEventData}
                      size="large"
                      showDownload={true}
                      showDetails={false}
                      style="blue"
                    />
                  </div>
                  
                  <button
                    onClick={() => handleViewQRCode({
                      registration: getCurrentRegistrationData(),
                      event: mockEventData,
                      eventId: mockEventData.event_id,
                      eventName: mockEventData.event_name,
                      registrationType: getCurrentRegistrationData().registration_type,
                      teamName: getCurrentRegistrationData().team_name
                    })}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    View QR Code Modal
                  </button>
                </div>

                {/* Registration Details */}
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Registration Details</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Registration ID:</span> {getCurrentRegistrationData().registration_id}</div>
                      <div><span className="font-medium">Type:</span> {getCurrentRegistrationData().registration_type}</div>
                      <div><span className="font-medium">Student Name:</span> {getCurrentRegistrationData().full_name}</div>
                      <div><span className="font-medium">Enrollment:</span> {getCurrentRegistrationData().enrollment_no}</div>
                      <div><span className="font-medium">Department:</span> {getCurrentRegistrationData().department}</div>
                      {getCurrentRegistrationData().team_name && (
                        <>
                          <div><span className="font-medium">Team Name:</span> {getCurrentRegistrationData().team_name}</div>
                          <div><span className="font-medium">Team Size:</span> {(getCurrentRegistrationData().team_members?.length || 0) + 1} members</div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className={`border rounded-lg p-4 ${
                    currentDemo === 'team' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'
                  }`}>
                    <h3 className={`font-semibold mb-3 ${
                      currentDemo === 'team' ? 'text-blue-900' : 'text-green-900'
                    }`}>
                      How It Works
                    </h3>
                    {currentDemo === 'individual' ? (
                      <ul className="text-sm text-green-800 space-y-1">
                        <li>• Student presents QR code to organizers</li>
                        <li>• Single scan marks individual as present</li>
                        <li>• Simple and straightforward process</li>
                        <li>• Backup verification with Registration ID</li>
                      </ul>
                    ) : (
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• One QR code represents the entire team</li>
                        <li>• Organizers scan and see all team members</li>
                        <li>• Individual attendance marking for each member</li>
                        <li>• Members don't need to be together for attendance</li>
                        <li>• Real-time attendance status updates</li>
                        <li>• Much simpler than individual QR codes per member!</li>
                      </ul>
                    )}
                  </div>

                  {currentDemo === 'team' && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <h3 className="font-semibold text-purple-900 mb-3">Team Members</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{getCurrentRegistrationData().full_name} (Leader)</span>
                          <span className="text-purple-600">{getCurrentRegistrationData().enrollment_no}</span>
                        </div>
                        {getCurrentRegistrationData().team_members?.map((member, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span>{member.name}</span>
                            <span className="text-purple-600">{member.enrollment_no}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Back Button */}
          <div className="text-center mt-8">
            <button
              onClick={() => navigate(-1)}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      <QRCodeModal 
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        registrationData={modalRegistrationData}
      />
    </Layout>
  );
};

export default QRTest;
