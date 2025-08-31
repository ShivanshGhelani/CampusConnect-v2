import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCodeDisplay from '../components/client/QRCodeDisplay';
import { qrCodeService } from '../services/QRCodeService';

/**
 * Updated QR Test Page - Test QR code generation with enhanced team data
 */
const QRTest_Updated = () => {
  const navigate = useNavigate();
  const [showQRModal, setShowQRModal] = useState(false);
  const [currentDemo, setCurrentDemo] = useState('team'); // Start with team demo

  // Mock team registration data that matches what we see in the console
  const mockTeamRegistrationData = {
    registration_id: 'REGBX5VGINX',
    registration_type: 'team',
    registration_date: '2025-08-30T17:25:09.508000',
    team_name: 'DIRD',
    team_registration_id: 'TEAM_DIRD_ADLHASTU2025',
    full_name: 'Ritu Sharma',
    enrollment_no: 'REGCJ9CO0U4',
    email: 'ritu.sharma@college.edu',
    department: 'Computer Science',
    // Enhanced with team member data
    team_members: [
      {
        name: 'Shivansh Ghelani',
        enrollment_no: 'REG123TEAM001',
        department: 'Computer Science',
        email: 'shivansh@college.edu',
        is_leader: true
      },
      {
        name: 'Meet Patel', 
        enrollment_no: 'REG123TEAM002',
        department: 'Computer Science',
        email: 'meet@college.edu'
      },
      {
        name: 'Ritu Sharma',
        enrollment_no: 'REGCJ9CO0U4',
        department: 'Computer Science', 
        email: 'ritu@college.edu'
      },
      {
        name: 'Yash Kumar',
        enrollment_no: 'REG123TEAM004',
        department: 'Computer Science',
        email: 'yash@college.edu'
      }
    ]
  };

  const mockEventData = {
    event_name: 'AI & Deep Learning Hackathon',
    organizing_department: 'Computer Science',
    start_datetime: '2025-09-10T10:00:00',
    venue: 'Dr. A.P.J. Abdul Kalam Auditorium - Main Campus, Block A, Ground Floor',
    status: 'upcoming',
    event_id: 'HACKATHON_2025_AI',
    id: 'HACKATHON_2025_AI'
  };

  const handleTestQRGeneration = () => {
    console.log('=== TESTING QR GENERATION ===');
    console.log('Mock Registration Data:', mockTeamRegistrationData);
    console.log('Mock Event Data:', mockEventData);
    
    // Test the QR generation directly
    const qrData = qrCodeService.generateQRData(mockTeamRegistrationData, mockEventData);
    console.log('Generated QR Data Result:', qrData);
    console.log('=============================');
    
    setShowQRModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">QR Code Test - Enhanced</h1>
          <p className="text-gray-600">Testing QR code generation with enhanced team member data</p>
        </div>

        {/* Test Button */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Team QR Code Generation Test</h2>
          <p className="text-gray-600 mb-4">
            This test uses the same data structure that appears in the console logs, including the DIRD team with 4 members.
          </p>
          
          <button
            onClick={handleTestQRGeneration}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Test QR Generation with Enhanced Data
          </button>
        </div>

        {/* Data Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Registration Data</h3>
            <div className="text-sm space-y-1">
              <p><strong>Registration ID:</strong> {mockTeamRegistrationData.registration_id}</p>
              <p><strong>Team Name:</strong> {mockTeamRegistrationData.team_name}</p>
              <p><strong>Team ID:</strong> {mockTeamRegistrationData.team_registration_id}</p>
              <p><strong>Members:</strong> {mockTeamRegistrationData.team_members.length}</p>
              <div className="mt-2">
                <strong>Team Members:</strong>
                <ul className="ml-4 mt-1">
                  {mockTeamRegistrationData.team_members.map((member, idx) => (
                    <li key={idx} className="text-xs">
                      {member.name} ({member.enrollment_no}) {member.is_leader && '👑'}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Event Data</h3>
            <div className="text-sm space-y-1">
              <p><strong>Event:</strong> {mockEventData.event_name}</p>
              <p><strong>Event ID:</strong> {mockEventData.event_id}</p>
              <p><strong>Venue:</strong> {mockEventData.venue}</p>
              <p><strong>Date:</strong> {mockEventData.start_datetime}</p>
            </div>
          </div>
        </div>

        {/* QR Modal */}
        {showQRModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Enhanced QR Code Test</h3>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-6">
                <QRCodeDisplay
                  registrationData={mockTeamRegistrationData}
                  eventData={mockEventData}
                  size="large"
                  showDownload={true}
                  showDetails={true}
                  style="blue"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRTest_Updated;