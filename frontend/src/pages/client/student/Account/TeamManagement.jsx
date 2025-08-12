import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { clientAPI } from '../../../../api/client';
import ClientLayout from '../../../../components/client/Layout';
import LoadingSpinner from '../../../../components/LoadingSpinner';

const TeamManagement = () => {
  const { eventId } = useParams(); // Only get eventId from URL
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  // State management
  const [event, setEvent] = useState(null);
  const [teamInfo, setTeamInfo] = useState(null);
  const [teamParticipationStatus, setTeamParticipationStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showTeamStatusModal, setShowTeamStatusModal] = useState(false);

  // Form states
  const [participantEnrollment, setParticipantEnrollment] = useState('');
  const [enrollmentError, setEnrollmentError] = useState('');
  const [validatingStudent, setValidatingStudent] = useState(false);
  const [studentDetails, setStudentDetails] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth/login', { state: { from: location } });
      return;
    }
    
    fetchTeamData();
  }, [eventId, isAuthenticated, location]);

  const fetchTeamData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch actual data using only eventId
      const response = await clientAPI.getTeamDetails(eventId);
      
      if (response.data.success && response.data.registered) {
        const registrationData = response.data.full_registration_data;
        
        // Add the top-level fields to the registration data for compatibility
        registrationData.registration_id = response.data.registration_id;
        registrationData.registration_type = response.data.registration_type;
        registrationData.registration_datetime = response.data.registration_datetime;
        
        // Flatten student_data to top level for frontend compatibility
        if (registrationData.student_data) {
          Object.assign(registrationData, registrationData.student_data);
        }
        
        // Fetch full event details to get status and substatus information
        let eventData;
        try {
          const eventResponse = await clientAPI.getEventDetails(eventId);
          eventData = eventResponse.data.success ? eventResponse.data.event : eventResponse.data;
          // Add the missing fields if not available
          eventData = {
            ...eventData,
            event_name: eventData.event_name || registrationData.event_name || `Event ${eventId}`,
            event_id: eventId,
            team_size_min: eventData.team_size_min || 2,
            team_size_max: eventData.team_size_max || 5
          };
        } catch (eventError) {
          console.error('Error fetching event details:', eventError);
          // Fallback to minimal event data if full details fetch fails
          eventData = {
            event_name: registrationData.event_name || `Event ${eventId}`,
            event_id: eventId,
            team_size_min: 2,
            team_size_max: 5,
            status: 'upcoming', // Default assumption
            sub_status: 'registration_open' // Default assumption for fallback
          };
        }
        
        // Create team info object from registration data
        const teamData = {
          team_name: registrationData.team_name,
          team_id: registrationData.team_registration_id || registrationData.registration_id,
          participant_count: 1 + (registrationData.team_members?.length || 0), // Leader + members
          departments_count: 1, // Can be calculated from team members if needed
          registration_date: registrationData.registration_datetime ? 
            new Date(registrationData.registration_datetime).toLocaleDateString() : new Date().toLocaleDateString(),
          team_leader: {
            name: registrationData.full_name,
            enrollment: registrationData.enrollment_no,
            email: registrationData.email,
            mobile: registrationData.mobile_no,
            department: registrationData.department,
            semester: registrationData.semester,
            year: Math.ceil(parseInt(registrationData.semester || '1') / 2).toString(),
            // TODO: Fetch actual participation status from API
            attendance: { marked: false, attendance_id: null },
            feedback: { submitted: false, feedback_id: null },
            certificate: { earned: false, certificate_id: null }
          },
          participants: registrationData.team_members?.map((member, index) => ({
            id: `p${index + 1}`,
            name: member.name || member.full_name,
            enrollment: member.enrollment_no,
            email: member.email,
            mobile: member.mobile_no,
            department: member.department,
            semester: member.semester,
            year: Math.ceil(parseInt(member.semester || '1') / 2).toString(),
            // TODO: Fetch actual participation status from API
            attendance: { marked: false, attendance_id: null },
            feedback: { submitted: false, feedback_id: null },
            certificate: { earned: false, certificate_id: null }
          })) || []
        };
        
        // TODO: Fetch actual team participation status from dedicated API
        const participationStatus = {
          event_status: eventData.status,
          attendance_open: eventData.status === 'ongoing',
          feedback_open: eventData.status === 'ongoing' || eventData.status === 'completed',
          certificates_available: eventData.status === 'completed',
          team_attendance_summary: {
            total_members: teamData.participant_count,
            attended: 0,
            pending: teamData.participant_count,
            attendance_rate: 0
          },
          team_feedback_summary: {
            total_members: teamData.participant_count,
            submitted: 0,
            pending: teamData.participant_count,
            feedback_rate: 0
          },
          team_certificate_summary: {
            total_members: teamData.participant_count,
            earned: 0,
            pending: teamData.participant_count,
            certificate_rate: 0
          }
        };
        
        setEvent(eventData);
        setTeamInfo(teamData);
        setTeamParticipationStatus(participationStatus);
      } else {
        setError('Failed to load team details or not registered for team events');
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
      
      const response = await clientAPI.validateParticipant(enrollment, eventId, teamInfo?.team_id);
      
      if (response.data.success) {
        // The API returns student_data, not student
        const studentData = response.data.student_data || response.data.student;
        setStudentDetails(studentData);
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
      const response = await clientAPI.addTeamParticipant(eventId, teamInfo?.team_id, studentDetails.enrollment_no);
      
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
      const response = await clientAPI.removeTeamParticipant(eventId, teamInfo?.team_id, removeTarget.enrollment);
      
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

  const cancelRegistration = async () => {
    try {
      const response = await clientAPI.cancelRegistration(eventId);
      
      if (response.data.success) {
        showNotification('Registration cancelled successfully!', 'success');
        setShowCancelModal(false);
        
        // Navigate back to dashboard after showing success message
        setTimeout(() => {
          navigate('/client/dashboard');
        }, 1500);
      } else {
        setError(response.data.message || 'Failed to cancel registration');
        setShowCancelModal(false);
      }
    } catch (error) {
      console.error('Cancel registration error:', error);
      setError('Failed to cancel registration. Please try again.');
      setShowCancelModal(false);
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

  const handleCancelModalClose = () => {
    setShowCancelModal(false);
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
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border text-center">
              <div className="text-xl font-bold text-green-600">{teamInfo.participant_count}</div>
              <div className="text-xs text-gray-600">Current</div>
            </div>
            <div className="bg-white p-4 rounded-lg border text-center">
              <div className="text-xl font-bold text-blue-600">{availableSlots}</div>
              <div className="text-xs text-gray-600">Available</div>
            </div>
            <div className="bg-white p-4 rounded-lg border text-center">
              <div className="text-xl font-bold text-emerald-600">
                {teamParticipationStatus ? teamParticipationStatus.team_attendance_summary.attended : '-'}
              </div>
              <div className="text-xs text-gray-600">Attended</div>
            </div>
            <div className="bg-white p-4 rounded-lg border text-center">
              <div className="text-xl font-bold text-purple-600">
                {teamParticipationStatus ? teamParticipationStatus.team_feedback_summary.submitted : '-'}
              </div>
              <div className="text-xs text-gray-600">Feedback</div>
            </div>
            <div className="bg-white p-4 rounded-lg border text-center">
              <div className="text-xl font-bold text-orange-600">
                {teamParticipationStatus ? teamParticipationStatus.team_certificate_summary.earned : '-'}
              </div>
              <div className="text-xs text-gray-600">Certificates</div>
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

            <button 
              onClick={() => setShowTeamStatusModal(true)}
              className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <i className="fas fa-chart-line mr-2"></i>
              Team Status
            </button>

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

            {/* Cancel Registration Button - Only show when registration is open */}
            {event?.status === 'upcoming' && event?.sub_status === 'registration_open' && (
              <button 
                onClick={() => setShowCancelModal(true)}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <i className="fas fa-times mr-2"></i>
                Cancel Registration
              </button>
            )}
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
                <div className="text-right">
                  <div className="text-sm text-gray-600 mb-2">
                    <div>{teamInfo.team_leader.email}</div>
                    <div>{teamInfo.team_leader.mobile}</div>
                  </div>
                  {/* Participation Status Icons */}
                  <div className="flex items-center space-x-2">
                    {/* Attendance Status */}
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full ${
                      teamInfo.team_leader.attendance?.marked 
                        ? 'bg-green-100 text-green-600' 
                        : event?.status === 'ongoing' 
                        ? 'bg-orange-100 text-orange-600'
                        : 'bg-gray-100 text-gray-400'
                    }`} title={`Attendance: ${teamInfo.team_leader.attendance?.marked ? 'Marked' : 'Pending'}`}>
                      <i className="fas fa-check text-xs"></i>
                    </div>
                    {/* Feedback Status */}
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full ${
                      teamInfo.team_leader.feedback?.submitted 
                        ? 'bg-purple-100 text-purple-600' 
                        : (event?.status === 'ongoing' || event?.status === 'completed')
                        ? 'bg-orange-100 text-orange-600'
                        : 'bg-gray-100 text-gray-400'
                    }`} title={`Feedback: ${teamInfo.team_leader.feedback?.submitted ? 'Submitted' : 'Pending'}`}>
                      <i className="fas fa-comment text-xs"></i>
                    </div>
                    {/* Certificate Status */}
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full ${
                      teamInfo.team_leader.certificate?.earned 
                        ? 'bg-orange-100 text-orange-600' 
                        : event?.status === 'completed'
                        ? 'bg-orange-100 text-orange-600'
                        : 'bg-gray-100 text-gray-400'
                    }`} title={`Certificate: ${teamInfo.team_leader.certificate?.earned ? 'Available' : 'Pending'}`}>
                      <i className="fas fa-certificate text-xs"></i>
                    </div>
                  </div>
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
                    {/* Participation Status Icons */}
                    <div className="flex items-center space-x-2">
                      {/* Attendance Status */}
                      <div className={`flex items-center justify-center w-6 h-6 rounded-full ${
                        participant.attendance?.marked 
                          ? 'bg-green-100 text-green-600' 
                          : event?.status === 'ongoing' 
                          ? 'bg-orange-100 text-orange-600'
                          : 'bg-gray-100 text-gray-400'
                      }`} title={`Attendance: ${participant.attendance?.marked ? 'Marked' : 'Pending'}`}>
                        <i className="fas fa-check text-xs"></i>
                      </div>
                      {/* Feedback Status */}
                      <div className={`flex items-center justify-center w-6 h-6 rounded-full ${
                        participant.feedback?.submitted 
                          ? 'bg-purple-100 text-purple-600' 
                          : (event?.status === 'ongoing' || event?.status === 'completed')
                          ? 'bg-orange-100 text-orange-600'
                          : 'bg-gray-100 text-gray-400'
                      }`} title={`Feedback: ${participant.feedback?.submitted ? 'Submitted' : 'Pending'}`}>
                        <i className="fas fa-comment text-xs"></i>
                      </div>
                      {/* Certificate Status */}
                      <div className={`flex items-center justify-center w-6 h-6 rounded-full ${
                        participant.certificate?.earned 
                          ? 'bg-orange-100 text-orange-600' 
                          : event?.status === 'completed'
                          ? 'bg-orange-100 text-orange-600'
                          : 'bg-gray-100 text-gray-400'
                      }`} title={`Certificate: ${participant.certificate?.earned ? 'Available' : 'Pending'}`}>
                        <i className="fas fa-certificate text-xs"></i>
                      </div>
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

          {/* Participation Status Indicators */}
          <div className="mt-8 bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Participation Status Guide</h3>
            <div className="grid grid-cols-3 gap-6 text-sm">
              <div>
                <div className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <i className="fas fa-check text-green-600"></i>
                  Attendance Indicators
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                      <i className="fas fa-check text-xs"></i>
                    </div>
                    <span className="text-gray-600">Attendance marked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
                      <i className="fas fa-check text-xs"></i>
                    </div>
                    <span className="text-gray-600">Available to mark</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center">
                      <i className="fas fa-check text-xs"></i>
                    </div>
                    <span className="text-gray-600">Not yet available</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <i className="fas fa-comment text-purple-600"></i>
                  Feedback Indicators
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
                      <i className="fas fa-comment text-xs"></i>
                    </div>
                    <span className="text-gray-600">Feedback submitted</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
                      <i className="fas fa-comment text-xs"></i>
                    </div>
                    <span className="text-gray-600">Feedback available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center">
                      <i className="fas fa-comment text-xs"></i>
                    </div>
                    <span className="text-gray-600">Not yet available</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <i className="fas fa-certificate text-orange-600"></i>
                  Certificate Indicators
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
                      <i className="fas fa-certificate text-xs"></i>
                    </div>
                    <span className="text-gray-600">Certificate available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center">
                      <i className="fas fa-certificate text-xs"></i>
                    </div>
                    <span className="text-gray-600">Processing/Pending</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Note: Certificates require attendance completion
                  </div>
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
                    <span className="font-medium">{studentDetails.full_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Enrollment:</span>
                    <span className="font-mono">{studentDetails.enrollment_no}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span>{studentDetails.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mobile:</span>
                    <span>{studentDetails.mobile_no}</span>
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

      {/* Cancel Registration Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="bg-red-500 px-6 py-4 rounded-t-lg">
              <h3 className="text-lg font-semibold text-white">Cancel Registration</h3>
            </div>
            
            <div className="p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-exclamation-triangle text-red-600"></i>
                </div>
                <div>
                  <h4 className="font-semibold">Cancel Team Registration</h4>
                  <p className="text-gray-600">{event?.event_name}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700 mb-3">
                  Are you sure you want to cancel your team registration for this event?
                </p>
                <div className="text-xs text-gray-600">
                  <div className="flex items-center mb-1">
                    <i className="fas fa-info-circle mr-2"></i>
                    This will remove the entire team registration
                  </div>
                  <div className="flex items-center mb-1">
                    <i className="fas fa-users mr-2"></i>
                    All team members will be unregistered
                  </div>
                  <div className="flex items-center">
                    <i className="fas fa-warning mr-2"></i>
                    This action cannot be undone
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end space-x-3">
              <button 
                onClick={handleCancelModalClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Keep Registration
              </button>
              <button 
                onClick={cancelRegistration}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
              >
                Cancel Registration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Status Modal */}
      {showTeamStatusModal && teamParticipationStatus && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-hidden border border-gray-200">
            {/* Modal Header */}
            <div className="px-8 py-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <i className="fas fa-chart-line text-white"></i>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Team Participation Status</h3>
                    <span className="text-sm text-slate-500 font-medium">{event?.event_name} • {teamInfo.team_name}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowTeamStatusModal(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all duration-200 group"
                >
                  <i className="fas fa-times group-hover:rotate-90 transition-transform duration-200"></i>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-8 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-6">
                {/* Team Overview Stats */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-6">
                  <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <i className="fas fa-users text-purple-600"></i>
                    Team Overview
                  </h4>
                  
                  <div className="grid grid-cols-3 gap-4">
                    {/* Attendance Summary */}
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                      <div className="flex items-center gap-2 mb-2">
                        <i className="fas fa-check text-green-600"></i>
                        <span className="text-sm font-medium text-slate-600">Attendance</span>
                      </div>
                      <div className="text-2xl font-bold text-green-600 mb-1">
                        {teamParticipationStatus.team_attendance_summary.attended}/{teamParticipationStatus.team_attendance_summary.total_members}
                      </div>
                      <div className="text-xs text-slate-500">
                        {teamParticipationStatus.team_attendance_summary.attendance_rate.toFixed(1)}% attendance rate
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${teamParticipationStatus.team_attendance_summary.attendance_rate}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Feedback Summary */}
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                      <div className="flex items-center gap-2 mb-2">
                        <i className="fas fa-comment text-purple-600"></i>
                        <span className="text-sm font-medium text-slate-600">Feedback</span>
                      </div>
                      <div className="text-2xl font-bold text-purple-600 mb-1">
                        {teamParticipationStatus.team_feedback_summary.submitted}/{teamParticipationStatus.team_feedback_summary.total_members}
                      </div>
                      <div className="text-xs text-slate-500">
                        {teamParticipationStatus.team_feedback_summary.feedback_rate.toFixed(1)}% feedback rate
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-purple-500 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${teamParticipationStatus.team_feedback_summary.feedback_rate}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Certificate Summary */}
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                      <div className="flex items-center gap-2 mb-2">
                        <i className="fas fa-certificate text-orange-600"></i>
                        <span className="text-sm font-medium text-slate-600">Certificates</span>
                      </div>
                      <div className="text-2xl font-bold text-orange-600 mb-1">
                        {teamParticipationStatus.team_certificate_summary.earned}/{teamParticipationStatus.team_certificate_summary.total_members}
                      </div>
                      <div className="text-xs text-slate-500">
                        {teamParticipationStatus.team_certificate_summary.certificate_rate.toFixed(1)}% certificate rate
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-orange-500 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${teamParticipationStatus.team_certificate_summary.certificate_rate}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Member Status */}
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-6">
                  <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <i className="fas fa-list-check text-emerald-600"></i>
                    Individual Member Status
                  </h4>

                  <div className="space-y-4">
                    {/* Team Leader Status */}
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <i className="fas fa-crown text-blue-600"></i>
                          </div>
                          <div>
                            <h5 className="text-sm font-semibold text-slate-900">{teamInfo.team_leader.name}</h5>
                            <p className="text-xs text-slate-600">{teamInfo.team_leader.enrollment} • Team Leader</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-medium">
                          <i className="fas fa-crown"></i>
                          Leader
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        {/* Attendance Status */}
                        <div className={`p-3 rounded-lg border ${
                          teamInfo.team_leader.attendance?.marked 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-orange-50 border-orange-200'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <i className={`fas fa-check text-xs ${
                              teamInfo.team_leader.attendance?.marked ? 'text-green-600' : 'text-orange-600'
                            }`}></i>
                            <span className={`text-xs font-medium ${
                              teamInfo.team_leader.attendance?.marked ? 'text-green-800' : 'text-orange-800'
                            }`}>Attendance</span>
                          </div>
                          <div className={`text-xs ${
                            teamInfo.team_leader.attendance?.marked ? 'text-green-700' : 'text-orange-700'
                          }`}>
                            {teamInfo.team_leader.attendance?.marked 
                              ? `✓ Marked (${teamInfo.team_leader.attendance.type || 'physical'})` 
                              : 'Pending'}
                          </div>
                          {teamInfo.team_leader.attendance?.attendance_id && (
                            <div className="text-xs text-slate-500 mt-1 font-mono">
                              ID: {teamInfo.team_leader.attendance.attendance_id}
                            </div>
                          )}
                        </div>

                        {/* Feedback Status */}
                        <div className={`p-3 rounded-lg border ${
                          teamInfo.team_leader.feedback?.submitted 
                            ? 'bg-purple-50 border-purple-200' 
                            : 'bg-orange-50 border-orange-200'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <i className={`fas fa-comment text-xs ${
                              teamInfo.team_leader.feedback?.submitted ? 'text-purple-600' : 'text-orange-600'
                            }`}></i>
                            <span className={`text-xs font-medium ${
                              teamInfo.team_leader.feedback?.submitted ? 'text-purple-800' : 'text-orange-800'
                            }`}>Feedback</span>
                          </div>
                          <div className={`text-xs ${
                            teamInfo.team_leader.feedback?.submitted ? 'text-purple-700' : 'text-orange-700'
                          }`}>
                            {teamInfo.team_leader.feedback?.submitted ? '✓ Submitted' : 'Pending'}
                          </div>
                          {teamInfo.team_leader.feedback?.feedback_id && (
                            <div className="text-xs text-slate-500 mt-1 font-mono">
                              ID: {teamInfo.team_leader.feedback.feedback_id}
                            </div>
                          )}
                        </div>

                        {/* Certificate Status */}
                        <div className={`p-3 rounded-lg border ${
                          teamInfo.team_leader.certificate?.earned 
                            ? 'bg-orange-50 border-orange-200' 
                            : 'bg-gray-50 border-gray-200'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <i className={`fas fa-certificate text-xs ${
                              teamInfo.team_leader.certificate?.earned ? 'text-orange-600' : 'text-gray-600'
                            }`}></i>
                            <span className={`text-xs font-medium ${
                              teamInfo.team_leader.certificate?.earned ? 'text-orange-800' : 'text-gray-800'
                            }`}>Certificate</span>
                          </div>
                          <div className={`text-xs ${
                            teamInfo.team_leader.certificate?.earned ? 'text-orange-700' : 'text-gray-700'
                          }`}>
                            {teamInfo.team_leader.certificate?.earned ? '✓ Available' : 'Pending'}
                          </div>
                          {teamInfo.team_leader.certificate?.certificate_id && (
                            <div className="text-xs text-slate-500 mt-1 font-mono">
                              ID: {teamInfo.team_leader.certificate.certificate_id}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Team Members Status */}
                    {teamInfo.participants && teamInfo.participants.map((participant, index) => (
                      <div key={participant.id || index} className="bg-white rounded-xl p-4 border border-slate-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                              <i className="fas fa-user text-gray-600"></i>
                            </div>
                            <div>
                              <h5 className="text-sm font-semibold text-slate-900">{participant.name}</h5>
                              <p className="text-xs text-slate-600">{participant.enrollment} • Member</p>
                            </div>
                          </div>
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 rounded-lg text-xs font-medium">
                            <i className="fas fa-user"></i>
                            Member
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3">
                          {/* Attendance Status */}
                          <div className={`p-3 rounded-lg border ${
                            participant.attendance?.marked 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-orange-50 border-orange-200'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <i className={`fas fa-check text-xs ${
                                participant.attendance?.marked ? 'text-green-600' : 'text-orange-600'
                              }`}></i>
                              <span className={`text-xs font-medium ${
                                participant.attendance?.marked ? 'text-green-800' : 'text-orange-800'
                              }`}>Attendance</span>
                            </div>
                            <div className={`text-xs ${
                              participant.attendance?.marked ? 'text-green-700' : 'text-orange-700'
                            }`}>
                              {participant.attendance?.marked 
                                ? `✓ Marked (${participant.attendance.type || 'physical'})` 
                                : 'Pending'}
                            </div>
                            {participant.attendance?.attendance_id && (
                              <div className="text-xs text-slate-500 mt-1 font-mono">
                                ID: {participant.attendance.attendance_id}
                              </div>
                            )}
                          </div>

                          {/* Feedback Status */}
                          <div className={`p-3 rounded-lg border ${
                            participant.feedback?.submitted 
                              ? 'bg-purple-50 border-purple-200' 
                              : 'bg-orange-50 border-orange-200'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <i className={`fas fa-comment text-xs ${
                                participant.feedback?.submitted ? 'text-purple-600' : 'text-orange-600'
                              }`}></i>
                              <span className={`text-xs font-medium ${
                                participant.feedback?.submitted ? 'text-purple-800' : 'text-orange-800'
                              }`}>Feedback</span>
                            </div>
                            <div className={`text-xs ${
                              participant.feedback?.submitted ? 'text-purple-700' : 'text-orange-700'
                            }`}>
                              {participant.feedback?.submitted ? '✓ Submitted' : 'Pending'}
                            </div>
                            {participant.feedback?.feedback_id && (
                              <div className="text-xs text-slate-500 mt-1 font-mono">
                                ID: {participant.feedback.feedback_id}
                              </div>
                            )}
                          </div>

                          {/* Certificate Status */}
                          <div className={`p-3 rounded-lg border ${
                            participant.certificate?.earned 
                              ? 'bg-orange-50 border-orange-200' 
                              : 'bg-gray-50 border-gray-200'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <i className={`fas fa-certificate text-xs ${
                                participant.certificate?.earned ? 'text-orange-600' : 'text-gray-600'
                              }`}></i>
                              <span className={`text-xs font-medium ${
                                participant.certificate?.earned ? 'text-orange-800' : 'text-gray-800'
                              }`}>Certificate</span>
                            </div>
                            <div className={`text-xs ${
                              participant.certificate?.earned ? 'text-orange-700' : 'text-gray-700'
                            }`}>
                              {participant.certificate?.earned ? '✓ Available' : 'Pending'}
                            </div>
                            {participant.certificate?.certificate_id && (
                              <div className="text-xs text-slate-500 mt-1 font-mono">
                                ID: {participant.certificate.certificate_id}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Legend */}
                <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl p-6">
                  <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <i className="fas fa-info-circle text-blue-600"></i>
                    Status Legend
                  </h4>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                      <h5 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                        <i className="fas fa-check text-green-600"></i>
                        Attendance Tracking
                      </h5>
                      <div className="text-xs text-slate-600 space-y-1">
                        <div>• <span className="text-green-600">Green:</span> Attendance marked</div>
                        <div>• <span className="text-orange-600">Orange:</span> Available to mark</div>
                        <div>• <span className="text-gray-600">Gray:</span> Not yet available</div>
                        <div className="mt-2 text-slate-500">Both physical and virtual attendance tracked with unique IDs</div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                      <h5 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                        <i className="fas fa-comment text-purple-600"></i>
                        Feedback System
                      </h5>
                      <div className="text-xs text-slate-600 space-y-1">
                        <div>• <span className="text-purple-600">Purple:</span> Feedback submitted</div>
                        <div>• <span className="text-orange-600">Orange:</span> Feedback available</div>
                        <div>• <span className="text-gray-600">Gray:</span> Not yet available</div>
                        <div className="mt-2 text-slate-500">Feedback tracked with submission timestamps and IDs</div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                      <h5 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                        <i className="fas fa-certificate text-orange-600"></i>
                        Certificate Issuance
                      </h5>
                      <div className="text-xs text-slate-600 space-y-1">
                        <div>• <span className="text-orange-600">Orange:</span> Certificate available</div>
                        <div>• <span className="text-gray-600">Gray:</span> Processing/Pending</div>
                        <div>• Requires attendance completion</div>
                        <div className="mt-2 text-slate-500">Certificates issued post-event with unique IDs</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => setShowTeamStatusModal(false)}
                    className="flex-1 px-6 py-3 text-slate-600 hover:text-slate-800 transition-colors font-semibold rounded-xl hover:bg-slate-50 border border-slate-200"
                  >
                    Close
                  </button>
                </div>
              </div>
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
