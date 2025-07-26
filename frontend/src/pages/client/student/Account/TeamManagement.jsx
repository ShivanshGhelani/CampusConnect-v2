import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { clientAPI } from '../../../../api/axios';
import ClientLayout from '../../../../components/client/Layout';
import LoadingSpinner from '../../../../components/LoadingSpinner';

const TeamManagement = () => {
  const { eventId, teamId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  // State management
  const [event, setEvent] = useState(null);
  const [teamInfo, setTeamInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // Form states
  const [participantEnrollment, setParticipantEnrollment] = useState('');
  const [enrollmentError, setEnrollmentError] = useState('');
  const [validatingStudent, setValidatingStudent] = useState(false);
  const [studentDetails, setStudentDetails] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);

  useEffect(() => {
    // Check if we're in development mode and accessing via /dev/ route
    const isDevelopmentMode = location.pathname.startsWith('/dev/');
    
    if (!isAuthenticated && !isDevelopmentMode) {
      navigate('/auth/login', { state: { from: location } });
      return;
    }
    
    fetchTeamData();
  }, [eventId, teamId, isAuthenticated, location]);

  const fetchTeamData = async () => {
    try {
      setIsLoading(true);
      
      // Check if we're in development mode
      const isDevelopmentMode = location.pathname.startsWith('/dev/');
      
      if (isDevelopmentMode) {
        // Provide mock data for development testing
        const mockEventData = {
          event_name: 'Mock Event: Hackathon 2025',
          event_id: 'mock-event-team-001',
          team_size_min: 2,
          team_size_max: 5
        };
        
        const mockTeamData = {
          team_name: 'Code Warriors',
          team_id: 'team-001',
          participant_count: 3,
          departments_count: 2,
          registration_date: '2025-07-15',
          team_leader: {
            name: 'Alice Johnson',
            enrollment: '21BECE40001',
            email: 'alice.johnson@example.com',
            mobile: '9876543210',
            department: 'Computer Engineering',
            semester: '6',
            year: '3'
          },
          participants: [
            {
              id: 'p1',
              name: 'Bob Smith',
              enrollment: '21BECE40002',
              email: 'bob.smith@example.com',
              mobile: '9876543211',
              department: 'Computer Engineering',
              semester: '6',
              year: '3'
            },
            {
              id: 'p2',
              name: 'Carol Davis',
              enrollment: '21BMEC40003',
              email: 'carol.davis@example.com',
              mobile: '9876543212',
              department: 'Mechanical Engineering',
              semester: '4',
              year: '2'
            }
          ]
        };
        
        setEvent(mockEventData);
        setTeamInfo(mockTeamData);
        setIsLoading(false);
        return;
      }
      
      // In production, fetch actual data
      const response = await clientAPI.getTeamDetails(eventId, teamId);
      
      if (response.data.success) {
        setEvent(response.data.event);
        setTeamInfo(response.data.team);
      } else {
        setError('Failed to load team details');
      }
    } catch (error) {
      console.error('Team fetch error:', error);
      setError('Failed to load team details. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const validateParticipant = async (enrollment) => {
    if (!enrollment.trim()) {
      setEnrollmentError('Enrollment number is required');
      return;
    }

    const enrollmentPattern = /^\d{2}[A-Z]{2,4}\d{5}$/;
    if (!enrollmentPattern.test(enrollment)) {
      setEnrollmentError('Invalid enrollment number format (e.g., 21BECE40015)');
      return;
    }

    // Check for duplicates
    const existingEnrollments = [
      teamInfo?.team_leader?.enrollment,
      ...(teamInfo?.participants?.map(p => p.enrollment) || [])
    ].filter(Boolean);

    if (existingEnrollments.includes(enrollment)) {
      setEnrollmentError('This student is already in the team');
      return;
    }

    try {
      setValidatingStudent(true);
      setEnrollmentError('');
      
      // Check if we're in development mode
      const isDevelopmentMode = location.pathname.startsWith('/dev/');
      
      if (isDevelopmentMode) {
        // Mock validation response
        setTimeout(() => {
          const mockStudent = {
            name: 'David Wilson',
            enrollment: enrollment,
            email: 'david.wilson@example.com',
            mobile: '9876543213',
            department: 'Information Technology',
            semester: '4',
            year: '2'
          };
          
          setStudentDetails(mockStudent);
          setValidatingStudent(false);
          setShowAddModal(false);
          setShowConfirmModal(true);
        }, 1000);
        return;
      }
      
      const response = await clientAPI.validateParticipant(enrollment, eventId, teamId);
      
      if (response.data.success) {
        setStudentDetails(response.data.student);
        setShowAddModal(false);
        setShowConfirmModal(true);
      } else {
        setEnrollmentError(response.data.message || 'Student not found');
      }
    } catch (error) {
      console.error('Validation error:', error);
      setEnrollmentError('Unable to validate enrollment number');
    } finally {
      setValidatingStudent(false);
    }
  };

  const addParticipant = async () => {
    try {
      const isDevelopmentMode = location.pathname.startsWith('/dev/');
      
      if (isDevelopmentMode) {
        // Mock add participant
        showNotification('Participant added successfully!', 'success');
        setShowConfirmModal(false);
        setParticipantEnrollment('');
        setStudentDetails(null);
        
        // Update mock team data
        const newParticipant = {
          ...studentDetails,
          id: `p${teamInfo.participants.length + 1}`
        };
        
        setTeamInfo(prev => ({
          ...prev,
          participants: [...prev.participants, newParticipant],
          participant_count: prev.participant_count + 1
        }));
        
        return;
      }
      
      const response = await clientAPI.addTeamParticipant(eventId, teamId, studentDetails.enrollment);
      
      if (response.data.success) {
        showNotification('Participant added successfully!', 'success');
        fetchTeamData(); // Refresh team data
        setShowConfirmModal(false);
        setParticipantEnrollment('');
        setStudentDetails(null);
      } else {
        setError(response.data.message || 'Failed to add participant');
      }
    } catch (error) {
      console.error('Add participant error:', error);
      setError('Failed to add participant. Please try again.');
    }
  };

  const removeParticipant = async () => {
    if (!removeTarget) return;

    try {
      const isDevelopmentMode = location.pathname.startsWith('/dev/');
      
      if (isDevelopmentMode) {
        // Mock remove participant
        showNotification('Participant removed successfully!', 'success');
        setShowRemoveModal(false);
        setRemoveTarget(null);
        
        // Update mock team data
        setTeamInfo(prev => ({
          ...prev,
          participants: prev.participants.filter(p => p.enrollment !== removeTarget.enrollment),
          participant_count: prev.participant_count - 1
        }));
        
        return;
      }
      
      const response = await clientAPI.removeTeamParticipant(eventId, teamId, removeTarget.enrollment);
      
      if (response.data.success) {
        showNotification('Participant removed successfully!', 'success');
        fetchTeamData(); // Refresh team data
        setShowRemoveModal(false);
        setRemoveTarget(null);
      } else {
        setError(response.data.message || 'Failed to remove participant');
      }
    } catch (error) {
      console.error('Remove participant error:', error);
      setError('Failed to remove participant. Please try again.');
    }
  };

  const exportTeamData = (format) => {
    if (!teamInfo) return;

    try {
      const teamData = {
        teamName: teamInfo.team_name,
        eventName: event?.event_name,
        teamLeader: teamInfo.team_leader,
        members: teamInfo.participants || [],
        totalMembers: teamInfo.participant_count,
        registrationDate: teamInfo.registration_date
      };

      switch (format) {
        case 'csv':
          exportToCSV(teamData);
          break;
        case 'json':
          exportToJSON(teamData);
          break;
        case 'pdf':
          exportToPDF(teamData);
          break;
        case 'print':
          printTeamData(teamData);
          break;
        default:
          showNotification('Export format not supported', 'error');
      }
      
      setShowExportDropdown(false);
    } catch (error) {
      console.error('Export failed:', error);
      showNotification('Export failed: ' + error.message, 'error');
    }
  };

  const exportToCSV = (teamData) => {
    const headers = ['Name', 'Enrollment', 'Email', 'Mobile', 'Department', 'Year', 'Semester', 'Role'];
    const rows = [];

    // Add team leader
    rows.push([
      teamData.teamLeader.name,
      teamData.teamLeader.enrollment,
      teamData.teamLeader.email,
      teamData.teamLeader.mobile,
      teamData.teamLeader.department,
      teamData.teamLeader.year,
      teamData.teamLeader.semester,
      'Team Leader'
    ]);

    // Add team members
    teamData.members.forEach(member => {
      rows.push([
        member.name,
        member.enrollment,
        member.email,
        member.mobile,
        member.department,
        member.year,
        member.semester,
        'Member'
      ]);
    });

    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${teamData.teamName.replace(/[^a-zA-Z0-9]/g, '_')}_Team_Data.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showNotification('CSV exported successfully!', 'success');
  };

  const exportToJSON = (teamData) => {
    const jsonData = {
      team: teamData.teamName,
      event: teamData.eventName,
      leader: teamData.teamLeader,
      members: teamData.members,
      statistics: {
        totalMembers: teamData.totalMembers,
        registrationDate: teamData.registrationDate
      },
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${teamData.teamName.replace(/[^a-zA-Z0-9]/g, '_')}_Team_Data.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showNotification('JSON exported successfully!', 'success');
  };

  const exportToPDF = (teamData) => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Team Data - ${teamData.teamName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .team-info { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
          .members-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .members-table th, .members-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .members-table th { background-color: #f2f2f2; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${teamData.teamName}</h1>
          <h2>${teamData.eventName}</h2>
        </div>
        
        <div class="team-info">
          <h3>Team Information</h3>
          <p><strong>Team Name:</strong> ${teamData.teamName}</p>
          <p><strong>Event:</strong> ${teamData.eventName}</p>
          <p><strong>Total Members:</strong> ${teamData.totalMembers}</p>
          <p><strong>Registration Date:</strong> ${teamData.registrationDate}</p>
        </div>
        
        <h3>Team Members</h3>
        <table class="members-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Enrollment</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>Department</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${teamData.teamLeader.name}</td>
              <td>${teamData.teamLeader.enrollment}</td>
              <td>${teamData.teamLeader.email}</td>
              <td>${teamData.teamLeader.mobile}</td>
              <td>${teamData.teamLeader.department}</td>
              <td><strong>Team Leader</strong></td>
            </tr>
            ${teamData.members.map(member => `
              <tr>
                <td>${member.name}</td>
                <td>${member.enrollment}</td>
                <td>${member.email}</td>
                <td>${member.mobile}</td>
                <td>${member.department}</td>
                <td>Member</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 500);

    showNotification('PDF export opened in new window. Use your browser\'s print function to save as PDF.', 'success');
  };

  const printTeamData = (teamData) => {
    exportToPDF(teamData); // Same as PDF export
  };

  const showNotification = (message, type = 'info') => {
    if (type === 'error') {
      setError(message);
    } else {
      setSuccess(message);
    }

    // Clear after 5 seconds
    setTimeout(() => {
      setError('');
      setSuccess('');
    }, 5000);
  };

  const handleAddModalClose = () => {
    setShowAddModal(false);
    setParticipantEnrollment('');
    setEnrollmentError('');
    setStudentDetails(null);
  };

  const handleConfirmModalClose = () => {
    setShowConfirmModal(false);
    setStudentDetails(null);
    setShowAddModal(true);
  };

  const handleRemoveModalClose = () => {
    setShowRemoveModal(false);
    setRemoveTarget(null);
  };

  const handleEnrollmentChange = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setParticipantEnrollment(value);
    setEnrollmentError('');
  };

  const handleValidateSubmit = (e) => {
    e.preventDefault();
    validateParticipant(participantEnrollment);
  };

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </ClientLayout>
    );
  }

  if (error && !teamInfo) {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <i className="fas fa-exclamation-triangle text-red-600 text-2xl"></i>
              </div>
              <h1 className="text-xl font-bold text-red-900 mb-2">Error Loading Team</h1>
              <p className="text-red-700 mb-4">{error}</p>
              <button 
                onClick={() => navigate('/client/dashboard')}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      </ClientLayout>
    );
  }

  if (!teamInfo) return null;

  const canAddMembers = teamInfo.participant_count < (event?.team_size_max || 5);
  const maxMembers = event?.team_size_max || 5;
  const availableSlots = maxMembers - teamInfo.participant_count;

  return (
    <ClientLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-6">
          
          {/* Team Header */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{teamInfo.team_name}</h1>
                <p className="text-gray-600">Team Management for {event?.event_name}</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Team ID</div>
                <div className="font-mono text-lg font-semibold">{teamInfo.team_id}</div>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <i className="fas fa-exclamation-triangle text-red-600 mr-3"></i>
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <i className="fas fa-check-circle text-green-600 mr-3"></i>
                <span className="text-green-800">{success}</span>
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border text-center">
              <div className="text-xl font-bold text-green-600">{teamInfo.participant_count}</div>
              <div className="text-xs text-gray-600">Current</div>
            </div>
            <div className="bg-white p-4 rounded-lg border text-center">
              <div className="text-xl font-bold text-blue-600">{availableSlots}</div>
              <div className="text-xs text-gray-600">Available</div>
            </div>
            <div className="bg-white p-4 rounded-lg border text-center">
              <div className="text-xl font-bold text-purple-600">{teamInfo.departments_count || 1}</div>
              <div className="text-xs text-gray-600">Departments</div>
            </div>
            <div className="bg-white p-4 rounded-lg border text-center">
              <div className="text-sm font-bold text-gray-700">{teamInfo.registration_date}</div>
              <div className="text-xs text-gray-600">Registered</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 mb-6">
            {canAddMembers ? (
              <button 
                onClick={() => setShowAddModal(true)}
                className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <i className="fas fa-user-plus mr-2"></i>
                Add Member
              </button>
            ) : (
              <div className="flex-1 bg-gray-200 text-gray-500 px-6 py-3 rounded-lg font-medium text-center">
                <i className="fas fa-users mr-2"></i>
                Team Full ({maxMembers}/{maxMembers})
              </div>
            )}

            <div className="relative">
              <button 
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <i className="fas fa-download mr-2"></i>
                Export
              </button>
              
              {/* Export Options Dropdown */}
              {showExportDropdown && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border rounded-lg shadow-lg z-50">
                  <div className="p-2">
                    <button
                      onClick={() => exportTeamData('csv')}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md flex items-center"
                    >
                      <i className="fas fa-file-csv text-green-600 mr-3"></i>
                      Export as CSV
                    </button>
                    <button
                      onClick={() => exportTeamData('json')}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md flex items-center"
                    >
                      <i className="fas fa-file-code text-blue-600 mr-3"></i>
                      Export as JSON
                    </button>
                    <button
                      onClick={() => exportTeamData('pdf')}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md flex items-center"
                    >
                      <i className="fas fa-file-pdf text-red-600 mr-3"></i>
                      Export as PDF
                    </button>
                    <button
                      onClick={() => exportTeamData('print')}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md flex items-center"
                    >
                      <i className="fas fa-print text-purple-600 mr-3"></i>
                      Print Team List
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Team Members */}
          <div className="space-y-4">
            {/* Team Leader */}
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <i className="fas fa-crown text-blue-600"></i>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{teamInfo.team_leader.name}</h3>
                    <p className="text-gray-600">{teamInfo.team_leader.enrollment} • Team Leader</p>
                    <div className="text-xs text-gray-500">{teamInfo.team_leader.department}</div>
                  </div>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <div>{teamInfo.team_leader.email}</div>
                  <div>{teamInfo.team_leader.mobile}</div>
                </div>
              </div>
            </div>

            {/* Team Members */}
            {teamInfo.participants && teamInfo.participants.length > 0 && teamInfo.participants.map((participant, index) => (
              <div key={participant.id || index} className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      <i className="fas fa-user text-gray-600"></i>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{participant.name}</h3>
                      <p className="text-gray-600">{participant.enrollment} • Member</p>
                      <div className="text-xs text-gray-500">{participant.department}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right text-sm text-gray-600">
                      <div>{participant.email}</div>
                      <div>{participant.mobile}</div>
                    </div>
                    <button
                      onClick={() => {
                        setRemoveTarget(participant);
                        setShowRemoveModal(true);
                      }}
                      className="text-red-600 hover:text-red-800 p-2"
                      title="Remove member"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Add Member Prompt */}
            {teamInfo.participant_count <= 1 && (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-users text-gray-400 text-2xl"></i>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Add Team Members</h3>
                <p className="text-gray-600 mb-4">Your team needs more members to participate.</p>
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  <i className="fas fa-user-plus mr-2"></i>
                  Add First Member
                </button>
              </div>
            )}
          </div>

          {/* Team Requirements */}
          <div className="mt-8 bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Requirements</h3>
            <div className="grid grid-cols-3 gap-6 text-sm">
              <div>
                <div className="font-medium text-gray-900 mb-2">Team Size</div>
                <div className="text-gray-600">
                  Minimum: {event?.team_size_min || 2} members<br />
                  Maximum: {event?.team_size_max || 5} members
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-900 mb-2">Current Status</div>
                <div className="text-gray-600">
                  {teamInfo.participant_count} of {event?.team_size_max || 5} members<br />
                  {canAddMembers ? `${availableSlots} slots available` : 'Team is full'}
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-900 mb-2">Departments</div>
                <div className="text-gray-600">
                  {teamInfo.departments_count || 1} different departments<br />
                  Cross-departmental teams encouraged
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Participant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="bg-cyan-500 px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Add Team Member</h3>
                <button 
                  onClick={handleAddModalClose}
                  className="text-white hover:text-gray-200"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleValidateSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Student Enrollment Number
                  </label>
                  <input
                    type="text"
                    value={participantEnrollment}
                    onChange={handleEnrollmentChange}
                    placeholder="e.g., 21BECE40015"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    required
                  />
                  {enrollmentError && (
                    <p className="text-red-600 text-sm mt-1">{enrollmentError}</p>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  Enter the enrollment number of the student you want to add to your team.
                  The system will validate if the student exists and is eligible.
                </div>
              </form>
            </div>
            
            <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end space-x-3">
              <button 
                onClick={handleAddModalClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button 
                onClick={handleValidateSubmit}
                disabled={validatingStudent}
                className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {validatingStudent ? 'Validating...' : 'Validate Student'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && studentDetails && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full">
            <div className="bg-green-500 px-6 py-4 rounded-t-lg">
              <h3 className="text-lg font-semibold text-white">Confirm Team Member</h3>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-4">Student Details</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{studentDetails.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Enrollment:</span>
                    <span className="font-mono">{studentDetails.enrollment}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span>{studentDetails.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mobile:</span>
                    <span>{studentDetails.mobile}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Department:</span>
                    <span>{studentDetails.department}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end space-x-3">
              <button 
                onClick={handleConfirmModalClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button 
                onClick={addParticipant}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
              >
                Add to Team
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Participant Modal */}
      {showRemoveModal && removeTarget && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="bg-red-500 px-6 py-4 rounded-t-lg">
              <h3 className="text-lg font-semibold text-white">Remove Team Member</h3>
            </div>
            
            <div className="p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-user-minus text-red-600"></i>
                </div>
                <div>
                  <h4 className="font-semibold">{removeTarget.name}</h4>
                  <p className="text-gray-600">{removeTarget.enrollment}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  Are you sure you want to remove this member from your team? 
                  This action cannot be undone.
                </p>
              </div>
            </div>
            
            <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end space-x-3">
              <button 
                onClick={handleRemoveModalClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button 
                onClick={removeParticipant}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
              >
                Remove Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close dropdowns */}
      {showExportDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowExportDropdown(false)}
        ></div>
      )}
    </ClientLayout>
  );
};

export default TeamManagement;
