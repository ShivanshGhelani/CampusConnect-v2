import React, { useState } from 'react';
import QRCodeDisplay, { QRCodeCompact } from '../components/client/QRCodeDisplay';
import TeamQRCodes from '../components/client/TeamQRCodes';
import QRCodePreview, { QRPreviewTrigger } from '../components/client/QRCodePreview';
import { useQRCode } from '../hooks/useQRCode';
import Layout from '../components/client/Layout';

/**
 * QR Code Demo Page - For testing and demonstrating QR functionality
 * This is a temporary demo page to showcase the QR code system
 */
const QRCodeDemo = () => {
  const [showPreview, setShowPreview] = useState(false);

  // Sample registration data
  const sampleRegistrationData = {
    registration_id: 'REG_2025_EVT_001_STUDENT_001',
    registration_type: 'team',
    full_name: 'John Doe',
    enrollment_no: '21001234567',
    department: 'Computer Science',
    email: 'john.doe@college.edu',
    team_name: 'Code Warriors',
    team_members: [
      {
        name: 'Jane Smith',
        enrollment_no: '21001234568',
        department: 'Computer Science'
      },
      {
        name: 'Bob Johnson',
        enrollment_no: '21001234569',
        department: 'Information Technology'
      }
    ]
  };

  // Sample event data
  const sampleEventData = {
    event_id: 'EVT_001',
    event_name: 'TechFest 2025 - Coding Competition',
    event_date: '2025-09-15',
    event_time: '10:00 AM',
    venue: 'Computer Lab - Block A'
  };

  // Sample form data for preview
  const sampleFormData = {
    full_name: 'John Doe',
    enrollment_no: '21001234567',
    department: 'Computer Science',
    email: 'john.doe@college.edu',
    team_name: 'Code Warriors',
    participants: [
      {
        name: 'Jane Smith',
        enrollment_no: '21001234568',
        department: 'Computer Science'
      }
    ]
  };

  const tempRegistrationId = 'TEMP_REG_001_DEMO';

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">QR Code System Demo</h1>
            <p className="text-lg text-gray-600">
              Demonstrating QR code generation for event registration attendance
            </p>
          </div>

          {/* Main QR Code Display */}
          <div className="grid grid-cols-1 gap-8 mb-8">
            {/* Individual Registration QR */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Individual Registration QR Code
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Single QR code for individual student registration:
              </p>
              <QRCodeDisplay 
                registrationData={{
                  ...sampleRegistrationData,
                  registration_type: 'individual',
                  team_name: null,
                  team_members: []
                }}
                eventData={sampleEventData}
                size="medium"
                showDownload={true}
                showDetails={true}
                style="blue"
              />
            </div>

            {/* Team Registration QRs */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Team Registration QR Codes (New System)
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Individual QR codes for each team member - solves attendance accuracy problem:
              </p>
              <TeamQRCodes 
                registrationData={sampleRegistrationData}
                eventData={sampleEventData}
                showDownload={true}
              />
            </div>
          </div>

          {/* QR Code Variations */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">QR Code Variations</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              
              {/* Small Size */}
              <div className="text-center">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Small (150px)</h3>
                <QRCodeDisplay 
                  registrationData={sampleRegistrationData}
                  eventData={sampleEventData}
                  size="small"
                  showDownload={false}
                  showDetails={false}
                />
              </div>

              {/* Medium Size */}
              <div className="text-center">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Medium (256px)</h3>
                <QRCodeDisplay 
                  registrationData={sampleRegistrationData}
                  eventData={sampleEventData}
                  size="medium"
                  showDownload={false}
                  showDetails={false}
                />
              </div>

              {/* Large Size */}
              <div className="text-center">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Large (350px)</h3>
                <QRCodeDisplay 
                  registrationData={sampleRegistrationData}
                  eventData={sampleEventData}
                  size="large"
                  showDownload={false}
                  showDetails={false}
                />
              </div>

              {/* Compact Version */}
              <div className="text-center">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Compact (80px)</h3>
                <div className="flex justify-center">
                  <QRCodeCompact 
                    registrationData={sampleRegistrationData}
                    eventData={sampleEventData}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Style Variations */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Style Variations</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              
              {['default', 'blue', 'green', 'purple', 'branded'].map(style => (
                <div key={style} className="text-center">
                  <h3 className="text-sm font-medium text-gray-700 mb-3 capitalize">{style}</h3>
                  <QRCodeDisplay 
                    registrationData={sampleRegistrationData}
                    eventData={sampleEventData}
                    size="small"
                    showDownload={false}
                    showDetails={false}
                    style={style}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Data Structure Display */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Individual Team Member QR Data</h2>
            <p className="text-sm text-gray-600 mb-4">
              Each team member gets their own QR code with individual data:
            </p>
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Team Leader QR:</h3>
                  <pre className="text-xs text-gray-800 overflow-auto bg-white p-3 rounded">
                    {JSON.stringify({
                      reg_id: "REG_2025_EVT_001_STUDENT_001",
                      event_id: "EVT_001",
                      event_name: "TechFest 2025",
                      type: "team_leader",
                      student: {
                        name: "John Doe",
                        enrollment: "21001234567",
                        department: "Computer Science"
                      },
                      team: {
                        team_id: "TEAM_EVT_001_CODEWARRIORS_234567",
                        name: "Code Warriors",
                        size: 3,
                        leader: true,
                        my_role: "leader"
                      },
                      individual_attendance: true,
                      event: { date: "2025-09-15", time: "10:00 AM" },
                      version: "1.0"
                    }, null, 2)}
                  </pre>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Team Member QR:</h3>
                  <pre className="text-xs text-gray-800 overflow-auto bg-white p-3 rounded">
                    {JSON.stringify({
                      reg_id: "REG_2025_EVT_001_STUDENT_001_MEMBER_01",
                      event_id: "EVT_001", 
                      event_name: "TechFest 2025",
                      type: "team_member",
                      student: {
                        name: "Jane Smith",
                        enrollment: "21001234568",
                        department: "Computer Science"
                      },
                      team: {
                        team_id: "TEAM_EVT_001_CODEWARRIORS_234567",
                        name: "Code Warriors",
                        size: 3,
                        leader: false,
                        leader_enrollment: "21001234567",
                        my_role: "member"
                      },
                      individual_attendance: true,
                      event: { date: "2025-09-15", time: "10:00 AM" },
                      version: "1.0"
                    }, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {/* Usage Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
            <h2 className="text-xl font-semibold text-blue-900 mb-4">How to Use</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-blue-800 mb-2">For Students</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• QR code appears automatically after successful registration</li>
                  <li>• Download and save QR code to device for offline access</li>
                  <li>• Present QR code to event volunteers for attendance marking</li>
                  <li>• Keep registration ID as backup verification</li>
                  <li>• Team leaders present QR for entire team attendance</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium text-blue-800 mb-2">For Scanner Apps</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• <strong>Individual QR codes</strong> - each person scanned separately</li>
                  <li>• <strong>Accurate attendance</strong> - no more "whole team" marking</li>
                  <li>• <strong>Team linking</strong> - scanner can group by team_id if needed</li>
                  <li>• <strong>Role identification</strong> - knows if person is leader or member</li>
                  <li>• <strong>Verification</strong> - can cross-check with team leader enrollment</li>
                </ul>

              </div>
              <div>
                <h3 className="text-lg font-medium text-blue-800 mb-2">For Event Organizers</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Each team member must be physically present to scan</li>
                  <li>• Accurate attendance tracking per individual</li>
                  <li>• Can identify absent team members easily</li>
                  <li>• Team completion status visible in real-time</li>
                  <li>• Better event management and safety compliance</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="text-center mt-8">
            <button
              onClick={() => window.history.back()}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Back to Application
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default QRCodeDemo;
