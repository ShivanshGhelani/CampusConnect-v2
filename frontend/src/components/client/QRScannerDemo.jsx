import React, { useState } from 'react';
import qrCodeService from '../../services/QRCodeService';

// Mock team attendance data for demonstration
const mockTeamAttendanceData = {
  event_id: 'EVT001',
  event_name: 'Tech Symposium 2025',
  team_id: 'TEAM_EVT001_TECHEXPLORERS_123456',
  team_name: 'Tech Explorers',
  registration_id: 'REG_EVT001_123456',
  scan_time: new Date().toISOString(),
  leader: {
    name: 'John Doe',
    enrollment: '21IT123456',
    department: 'Computer Engineering',
    email: 'john.doe@example.com',
    attendance_status: 'pending'
  },
  members: [
    {
      id: 'member_1',
      name: 'Jane Smith',
      enrollment: '21IT123457',
      department: 'Computer Engineering',
      email: 'jane.smith@example.com',
      phone: '+91 9876543210',
      year: '3rd Year',
      attendance_status: 'present', // Already marked from previous scan
      marked_at: '2025-01-15T10:30:00Z',
      marked_by: 'organizer_001'
    },
    {
      id: 'member_2',
      name: 'Mike Johnson',
      enrollment: '21IT123458',
      department: 'Computer Engineering',
      email: 'mike.johnson@example.com',
      phone: '+91 9876543211',
      year: '3rd Year',
      attendance_status: 'present', // Already marked from previous scan
      marked_at: '2025-01-15T10:30:00Z',
      marked_by: 'organizer_001'
    },
    {
      id: 'member_3',
      name: 'Sarah Wilson',
      enrollment: '21IT123459',
      department: 'Computer Engineering',
      email: 'sarah.wilson@example.com',
      phone: '+91 9876543212',
      year: '3rd Year',
      attendance_status: 'pending'
    },
    {
      id: 'member_4',
      name: 'Alex Brown',
      enrollment: '21IT123460',
      department: 'Computer Engineering',
      email: 'alex.brown@example.com',
      phone: '+91 9876543213',
      year: '3rd Year',
      attendance_status: 'pending'
    }
  ]
};

const QRScannerDemo = () => {
  const [scannedData, setScannedData] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  // Simulate QR code scanning
  const simulateQRScan = () => {
    setIsScanning(true);
    
    setTimeout(() => {
      // Simulate scanning a team QR code
      const mockQRData = {
        reg_id: 'REG_EVT001_123456',
        event_id: 'EVT001',
        event_name: 'Tech Symposium 2025',
        type: 'team',
        leader: {
          name: 'John Doe',
          enrollment: '21IT123456',
          department: 'Computer Engineering',
          email: 'john.doe@example.com'
        },
        team: {
          team_id: 'TEAM_EVT001_TECHEXPLORERS_123456',
          name: 'Tech Explorers',
          size: 5,
          members: [
            {
              id: 'member_1',
              name: 'Jane Smith',
              enrollment: '21IT123457',
              department: 'Computer Engineering',
              email: 'jane.smith@example.com',
              phone: '+91 9876543210',
              year: '3rd Year',
              attendance_status: 'pending'
            },
            {
              id: 'member_2',
              name: 'Mike Johnson',
              enrollment: '21IT123458',
              department: 'Computer Engineering',
              email: 'mike.johnson@example.com',
              phone: '+91 9876543211',
              year: '3rd Year',
              attendance_status: 'pending'
            },
            {
              id: 'member_3',
              name: 'Sarah Wilson',
              enrollment: '21IT123459',
              department: 'Computer Engineering',
              email: 'sarah.wilson@example.com',
              phone: '+91 9876543212',
              year: '3rd Year',
              attendance_status: 'pending'
            },
            {
              id: 'member_4',
              name: 'Alex Brown',
              enrollment: '21IT123460',
              department: 'Computer Engineering',
              email: 'alex.brown@example.com',
              phone: '+91 9876543213',
              year: '3rd Year',
              attendance_status: 'pending'
            }
          ]
        },
        event: {
          date: '2025-01-20',
          time: '10:00 AM',
          venue: 'Main Auditorium'
        },
        generated: '2025-01-15T08:00:00Z',
        version: '2.0'
      };

      setScannedData(mockQRData);
      
      // Simulate fetching current attendance status from database
      setTimeout(() => {
        setAttendanceData(mockTeamAttendanceData);
        setIsScanning(false);
      }, 500);
    }, 1500);
  };

  const handleAttendanceToggle = (memberId, memberType = 'member') => {
    if (!attendanceData) return;

    const updatedData = { ...attendanceData };
    
    if (memberType === 'leader') {
      const currentStatus = updatedData.leader.attendance_status;
      updatedData.leader.attendance_status = currentStatus === 'present' ? 'pending' : 'present';
      updatedData.leader.marked_at = currentStatus === 'present' ? null : new Date().toISOString();
      updatedData.leader.marked_by = currentStatus === 'present' ? null : 'organizer_demo';
    } else {
      const memberIndex = updatedData.members.findIndex(m => m.id === memberId);
      if (memberIndex !== -1) {
        const currentStatus = updatedData.members[memberIndex].attendance_status;
        updatedData.members[memberIndex].attendance_status = currentStatus === 'present' ? 'pending' : 'present';
        updatedData.members[memberIndex].marked_at = currentStatus === 'present' ? null : new Date().toISOString();
        updatedData.members[memberIndex].marked_by = currentStatus === 'present' ? null : 'organizer_demo';
      }
    }

    setAttendanceData(updatedData);
  };

  const handleSaveAttendance = () => {
    alert('Attendance saved successfully! (This is a demo)');
  };

  const handleReset = () => {
    setScannedData(null);
    setAttendanceData(null);
    setIsScanning(false);
  };

  const getPresentCount = () => {
    if (!attendanceData) return 0;
    
    let count = 0;
    if (attendanceData.leader.attendance_status === 'present') count++;
    count += attendanceData.members.filter(m => m.attendance_status === 'present').length;
    return count;
  };

  const getTotalCount = () => {
    if (!attendanceData) return 0;
    return 1 + attendanceData.members.length; // Leader + members
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">QR Scanner Demo - Team Attendance</h2>
        <p className="text-gray-600">
          This demonstrates how organizers can scan team QR codes and mark individual member attendance.
        </p>
      </div>

      {/* Scanner Interface */}
      {!scannedData && (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          
          {isScanning ? (
            <div className="space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-lg font-medium text-gray-900">Scanning QR Code...</p>
              <p className="text-sm text-gray-600">Processing team registration data</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Ready to Scan QR Code</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Click the button below to simulate scanning a team QR code and see the attendance interface.
              </p>
              <button
                onClick={simulateQRScan}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                Simulate QR Scan
              </button>
            </div>
          )}
        </div>
      )}

      {/* Attendance Interface */}
      {attendanceData && (
        <div className="space-y-6">
          {/* Team Info Header */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-blue-900">{attendanceData.team_name}</h3>
                <p className="text-blue-700">{attendanceData.event_name}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-900">{getPresentCount()}/{getTotalCount()}</p>
                <p className="text-sm text-blue-700">Present</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-blue-600">Registration ID</p>
                <p className="font-mono font-medium text-blue-900">{attendanceData.registration_id}</p>
              </div>
              <div>
                <p className="text-blue-600">Team ID</p>
                <p className="font-mono font-medium text-blue-900 truncate">{attendanceData.team_id}</p>
              </div>
              <div>
                <p className="text-blue-600">Scan Time</p>
                <p className="font-medium text-blue-900">
                  {new Date(attendanceData.scan_time).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>

          {/* Team Leader */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="bg-purple-50 px-4 py-3 border-b border-purple-200">
              <h4 className="font-semibold text-purple-900 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Team Leader
              </h4>
            </div>
            
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h5 className="font-medium text-gray-900">{attendanceData.leader.name}</h5>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      attendanceData.leader.attendance_status === 'present' 
                        ? 'bg-green-100 text-green-800 border border-green-200' 
                        : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                    }`}>
                      {attendanceData.leader.attendance_status === 'present' ? (
                        <>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Present
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Pending
                        </>
                      )}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <p>Enrollment: <span className="font-mono">{attendanceData.leader.enrollment}</span></p>
                      <p>Department: {attendanceData.leader.department}</p>
                    </div>
                    <div>
                      <p>Email: {attendanceData.leader.email}</p>
                      {attendanceData.leader.marked_at && (
                        <p>Marked: {new Date(attendanceData.leader.marked_at).toLocaleTimeString()}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => handleAttendanceToggle(null, 'leader')}
                  className={`ml-4 px-4 py-2 rounded-lg font-medium transition-colors ${
                    attendanceData.leader.attendance_status === 'present'
                      ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
                  }`}
                >
                  {attendanceData.leader.attendance_status === 'present' ? 'Mark Absent' : 'Mark Present'}
                </button>
              </div>
            </div>
          </div>

          {/* Team Members */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="bg-orange-50 px-4 py-3 border-b border-orange-200">
              <h4 className="font-semibold text-orange-900 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Team Members ({attendanceData.members.length})
              </h4>
            </div>
            
            <div className="divide-y divide-gray-200">
              {attendanceData.members.map((member, index) => (
                <div key={member.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                          {index + 1}
                        </span>
                        <h5 className="font-medium text-gray-900">{member.name}</h5>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          member.attendance_status === 'present' 
                            ? 'bg-green-100 text-green-800 border border-green-200' 
                            : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                        }`}>
                          {member.attendance_status === 'present' ? (
                            <>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Present
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Pending
                            </>
                          )}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <p>Enrollment: <span className="font-mono">{member.enrollment}</span></p>
                          <p>Department: {member.department}</p>
                        </div>
                        <div>
                          <p>Year: {member.year}</p>
                          {member.marked_at && (
                            <p>Marked: {new Date(member.marked_at).toLocaleTimeString()}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleAttendanceToggle(member.id)}
                      className={`ml-4 px-4 py-2 rounded-lg font-medium transition-colors ${
                        member.attendance_status === 'present'
                          ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
                      }`}
                    >
                      {member.attendance_status === 'present' ? 'Mark Absent' : 'Mark Present'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleSaveAttendance}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Save Attendance ({getPresentCount()}/{getTotalCount()})
            </button>
            
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Scan Another QR
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRScannerDemo;
