import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { clientAPI } from '../../../../api/client';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import Layout from '../../../../components/client/Layout.jsx';

// Import modal components for enhanced team management
import TaskManagementModal from './modals/TaskManagementModal';
import RoleAssignmentModal from './modals/RoleAssignmentModal';
import ReportGenerationModal from './modals/ReportGenerationModal';

const TeamManagement = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  // Core state management optimized for new collections
  const [event, setEvent] = useState(null);
  const [teamRegistration, setTeamRegistration] = useState(null);
  const [teamStatus, setTeamStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal states - enhanced with team management features
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showTeamStatusModal, setShowTeamStatusModal] = useState(false);
  
  // Enhanced team management modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showTeamManagementDropdown, setShowTeamManagementDropdown] = useState(false);
  
  // New states for roles and tasks
  const [memberRoles, setMemberRoles] = useState({});
  const [memberTasks, setMemberTasks] = useState({});
  const [showMemberTasksModal, setShowMemberTasksModal] = useState(false);
  const [selectedMemberTasks, setSelectedMemberTasks] = useState(null);
  
  // Task review states
  const [showTaskReviewModal, setShowTaskReviewModal] = useState(false);
  const [reviewingTask, setReviewingTask] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  // Form states - optimized for event lifecycle
  const [participantEnrollment, setParticipantEnrollment] = useState('');
  const [enrollmentError, setEnrollmentError] = useState('');
  const [validatingStudent, setValidatingStudent] = useState(false);
  const [validatedStudent, setValidatedStudent] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);

  // Real-time status tracking
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Loading states for team management actions
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth/login', { state: { from: location } });
      return;
    }

    fetchTeamData();
  }, [eventId, isAuthenticated, location]);

  // Optimized data fetching for new student_registrations collection
  const fetchTeamData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');

      // Get registration status from new API structure
      const response = await clientAPI.getRegistrationStatus(eventId);

      if (response.data.success && response.data.registered && response.data.registration_type === 'team') {
        // Parse team registration data from student_registrations collection
        const registration = response.data.full_registration_data;

        // Get event details for UI context
        const eventResponse = await clientAPI.getEventDetails(eventId);
        const eventData = eventResponse.data.success ? eventResponse.data.event : null;

        if (!eventData) {
          throw new Error('Event details not found');
        }

        // Process team data from new collection structure
        const teamData = processTeamRegistration(registration, eventData);

        setTeamRegistration(teamData);
        setEvent(eventData);
        setLastUpdated(new Date());

        // Fetch real-time participation status if event is active
        if (eventData.status === 'ongoing' || eventData.status === 'completed') {
          await fetchParticipationStatus(registration.registration_id);
        }

        // Note: Roles and tasks are now processed directly in processTeamRegistration
        // loadTeamRolesAndTasks is now only used as a fallback or refresh mechanism

      } else if (response.data.success && !response.data.registered) {
        setError('You are not registered for team events in this event.');
      } else {
        setError(response.data.message || 'Failed to load team registration data.');
      }
    } catch (error) {
      console.error('Team fetch error:', error);
      setError('Failed to load team details. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  // Process team registration from student_registrations collection
  const processTeamRegistration = (registration, eventData) => {
    const teamMembers = registration.team_members || [];
    const teamLeader = teamMembers.find(member => member.is_team_leader) || teamMembers[0];
    const otherMembers = teamMembers.filter(member => !member.is_team_leader);

    // Process team roles and tasks from the registration document IMMEDIATELY
    const teamRoles = registration.team_roles || {};
    const teamTasks = registration.tasks || [];
    
    // Initialize member roles and tasks state IMMEDIATELY
    const rolesMap = {};
    const tasksMap = {};
    
    // Process roles
    Object.keys(teamRoles).forEach(enrollment => {
      rolesMap[enrollment] = {
        role: teamRoles[enrollment].role,
        description: teamRoles[enrollment].description || '',
        permissions: teamRoles[enrollment].permissions || []
      };
    });
    
    // Process tasks - group by assigned members
    teamTasks.forEach(task => {
      task.assigned_to.forEach(enrollment => {
        if (!tasksMap[enrollment]) {
          tasksMap[enrollment] = [];
        }
        tasksMap[enrollment].push({
          id: task.task_id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          category: task.category,
          deadline: task.deadline,
          status: task.status || 'pending',
          created_at: task.created_at
        });
      });
    });
    
    // Set the roles and tasks in state IMMEDIATELY
    setMemberRoles(rolesMap);
    setMemberTasks(tasksMap);

    return {
      registration_id: registration.registration_id,
      team_name: registration.team?.team_name || registration.team_name || 'Unnamed Team',
      team_size: teamMembers.length,
      max_size: eventData.team_size_max || 5,
      min_size: eventData.team_size_min || 2,
      status: registration.team?.status || 'active',
      registered_at: registration.team?.registered_at || registration.created_at,

      // Team leader from team_members array with is_team_leader: true
      team_leader: teamLeader ? {
        enrollment_no: teamLeader.student?.enrollment_no || teamLeader.enrollment_no,
        name: teamLeader.student?.name || teamLeader.name || teamLeader.full_name,
        email: teamLeader.student?.email || teamLeader.email,
        phone: teamLeader.student?.phone || teamLeader.phone || teamLeader.mobile_no,
        department: teamLeader.student?.department || teamLeader.department,
        semester: teamLeader.student?.semester || teamLeader.semester,
        // Participation tracking from registration document
        attendance: teamLeader.attendance || { marked: false, sessions: [] },
        feedback: teamLeader.feedback || { submitted: false },
        certificate: teamLeader.certificate || { eligible: false, issued: false }
      } : null,

      // Other team members
      members: otherMembers.map((member, index) => ({
        id: member.registration_id || `member_${index}`,
        enrollment_no: member.student?.enrollment_no || member.enrollment_no,
        name: member.student?.name || member.name || member.full_name,
        email: member.student?.email || member.email,
        phone: member.student?.phone || member.phone || member.mobile_no,
        department: member.student?.department || member.department,
        semester: member.student?.semester || member.semester,
        // Participation tracking from registration document
        attendance: member.attendance || { marked: false, sessions: [] },
        feedback: member.feedback || { submitted: false },
        certificate: member.certificate || { eligible: false, issued: false }
      })),

      // Store the raw data for debugging
      team_roles: teamRoles,
      tasks: teamTasks,

      // Event context
      event: {
        event_id: eventData.event_id,
        event_name: eventData.event_name,
        status: eventData.status,
        sub_status: eventData.sub_status,
        start_datetime: eventData.start_datetime,
        end_datetime: eventData.end_datetime
      }
    };
  };

  // Fetch real-time participation status using event lifecycle APIs
  const fetchParticipationStatus = async (registrationId) => {
    try {
      // This would be a new API endpoint for getting participation status
      // For now, we'll simulate the data structure
      const status = {
        attendance_available: event?.status === 'ongoing',
        feedback_available: ['ongoing', 'completed'].includes(event?.status),
        certificates_available: event?.status === 'completed',

        team_summary: {
          total_members: teamRegistration?.team_size || 0,
          attendance_marked: 0,
          feedback_submitted: 0,
          certificates_issued: 0
        }
      };

      setTeamStatus(status);
    } catch (error) {
      console.error('Failed to fetch participation status:', error);
    }
  };

  // Optimized student validation for new collections
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

    // Check for duplicates in current team
    const allMembers = [
      teamRegistration?.team_leader?.enrollment_no,
      ...(teamRegistration?.members?.map(m => m.enrollment_no) || [])
    ].filter(Boolean);

    if (allMembers.includes(enrollment)) {
      setEnrollmentError('This student is already in the team');
      return;
    }

    try {
      setValidatingStudent(true);
      setEnrollmentError('');

      // Use lookup API to validate student
      const response = await clientAPI.lookupStudent(enrollment);

      if (response.data.success && response.data.found) {
        // Check eligibility for this specific event
        const eligibilityResponse = await clientAPI.checkStudentEligibility(enrollment, eventId);

        if (eligibilityResponse.data.success && eligibilityResponse.data.eligible) {
          setValidatedStudent(response.data.student_data);
          setShowAddModal(false);
          setShowConfirmModal(true);
        } else {
          setEnrollmentError(eligibilityResponse.data.message || 'Student is not eligible for this event');
        }
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

  // Add participant to team using new registration API
  const addParticipant = async () => {
    if (!validatedStudent) return;

    try {
      // Use new team member management API
      const response = await clientAPI.addTeamMember(
        eventId,
        teamRegistration.registration_id,
        validatedStudent.enrollment_no
      );

      if (response.data.success) {
        // FIXED: Handle invitation vs direct addition
        const message = response.data.message;
        if (message.includes('invitation')) {
          showNotification('Team invitation sent successfully! The student will receive an invitation to join your team.', 'info');
        } else {
          showNotification('Team member added successfully!', 'success');
        }
        
        await fetchTeamData(); // Refresh data
        setShowConfirmModal(false);
        setParticipantEnrollment('');
        setValidatedStudent(null);
      } else {
        setError(response.data.message || 'Failed to add team member');
      }
    } catch (error) {
      console.error('Add participant error:', error);
      setError('Failed to add team member. Please try again.');
    }
  };

  // Remove participant using new registration API
  const removeParticipant = async () => {
    if (!removeTarget) return;

    // Check minimum team size requirement
    if (teamRegistration.team_size <= teamRegistration.min_size) {
      setError(`Cannot remove member! Minimum team size required is ${teamRegistration.min_size} members.`);
      setShowRemoveModal(false);
      setRemoveTarget(null);
      return;
    }

    try {
      const response = await clientAPI.removeTeamMember(
        eventId,
        teamRegistration.registration_id,
        removeTarget.enrollment_no
      );

      if (response.data.success) {
        showNotification('Team member removed successfully!', 'success');
        await fetchTeamData(); // Refresh data
        setShowRemoveModal(false);
        setRemoveTarget(null);
      } else {
        setError(response.data.message || 'Failed to remove team member');
      }
    } catch (error) {
      console.error('Remove participant error:', error);
      setError('Failed to remove team member. Please try again.');
    }
  };

  // Cancel entire team registration
  const cancelRegistration = async () => {
    setIsCancelling(true);
    try {
      const response = await clientAPI.cancelRegistration(eventId);

      if (response.data.success) {
        showNotification('Team registration cancelled successfully!', 'success');
        setShowCancelModal(false);

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
    } finally {
      setIsCancelling(false);
    }
  };

  // Export functionality optimized for new data structure
  const exportTeamData = (format) => {
    if (!teamRegistration) return;

    try {
      const exportData = {
        teamName: teamRegistration.team_name,
        eventName: event?.event_name,
        registrationId: teamRegistration.registration_id,
        teamSize: teamRegistration.team_size,
        maxSize: teamRegistration.max_size,
        registrationDate: new Date(teamRegistration.registered_at).toLocaleDateString(),

        teamLeader: teamRegistration.team_leader,
        members: teamRegistration.members,

        // Participation summary
        participationSummary: {
          attendance: {
            marked: (teamRegistration.members || []).filter(m => m.attendance?.marked).length +
              (teamRegistration.team_leader?.attendance?.marked ? 1 : 0),
            total: teamRegistration.team_size
          },
          feedback: {
            submitted: (teamRegistration.members || []).filter(m => m.feedback?.submitted).length +
              (teamRegistration.team_leader?.feedback?.submitted ? 1 : 0),
            total: teamRegistration.team_size
          },
          certificates: {
            issued: (teamRegistration.members || []).filter(m => m.certificate?.issued).length +
              (teamRegistration.team_leader?.certificate?.issued ? 1 : 0),
            total: teamRegistration.team_size
          }
        }
      };

      switch (format) {
        case 'csv':
          exportToCSV(exportData);
          break;
        case 'json':
          exportToJSON(exportData);
          break;
        case 'pdf':
          exportToPDF(exportData);
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

  const exportToCSV = (data) => {
    const headers = ['Name', 'Enrollment', 'Email', 'Phone', 'Department', 'Role', 'Attendance', 'Feedback', 'Certificate'];
    const rows = [];

    // Add team leader
    if (data.teamLeader) {
      rows.push([
        data.teamLeader.name,
        data.teamLeader.enrollment_no,
        data.teamLeader.email,
        data.teamLeader.phone,
        data.teamLeader.department,
        'Team Leader',
        data.teamLeader.attendance?.marked ? 'Marked' : 'Pending',
        data.teamLeader.feedback?.submitted ? 'Submitted' : 'Pending',
        data.teamLeader.certificate?.issued ? 'Issued' : 'Pending'
      ]);
    }

    // Add team members
    data.members.forEach(member => {
      rows.push([
        member.name,
        member.enrollment_no,
        member.email,
        member.phone,
        member.department,
        'Member',
        member.attendance?.marked ? 'Marked' : 'Pending',
        member.feedback?.submitted ? 'Submitted' : 'Pending',
        member.certificate?.issued ? 'Issued' : 'Pending'
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
    link.setAttribute('download', `${data.teamName.replace(/[^a-zA-Z0-9]/g, '_')}_Team_Data.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showNotification('CSV exported successfully!', 'success');
  };

  const exportToJSON = (data) => {
    const jsonData = {
      ...data,
      exportedAt: new Date().toISOString(),
      exportedBy: user?.enrollment_no || user?.username
    };

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${data.teamName.replace(/[^a-zA-Z0-9]/g, '_')}_Team_Data.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showNotification('JSON exported successfully!', 'success');
  };

  const exportToPDF = (data) => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Team Registration Report - ${data.teamName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .team-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
          .participation-summary { background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .members-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .members-table th, .members-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          .members-table th { background-color: #f2f2f2; font-weight: bold; }
          .members-table tr:nth-child(even) { background-color: #f9f9f9; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
          .status-badge { padding: 2px 6px; border-radius: 4px; font-size: 11px; }
          .status-marked { background: #4caf50; color: white; }
          .status-pending { background: #ff9800; color: white; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${data.teamName}</h1>
          <h2>${data.eventName}</h2>
          <p>Team Registration Report</p>
        </div>
        
        <div class="team-info">
          <h3>Team Information</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
              <p><strong>Team Name:</strong> ${data.teamName}</p>
              <p><strong>Event:</strong> ${data.eventName}</p>
              <p><strong>Registration ID:</strong> ${data.registrationId}</p>
            </div>
            <div>
              <p><strong>Team Size:</strong> ${data.teamSize}/${data.maxSize}</p>
              <p><strong>Registration Date:</strong> ${data.registrationDate}</p>
              <p><strong>Status:</strong> Active</p>
            </div>
          </div>
        </div>
        
        <div class="participation-summary">
          <h3>Participation Summary</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; text-align: center;">
            <div>
              <strong>Attendance</strong><br>
              ${data.participationSummary.attendance.marked}/${data.participationSummary.attendance.total} marked
            </div>
            <div>
              <strong>Feedback</strong><br>
              ${data.participationSummary.feedback.submitted}/${data.participationSummary.feedback.total} submitted
            </div>
            <div>
              <strong>Certificates</strong><br>
              ${data.participationSummary.certificates.issued}/${data.participationSummary.certificates.total} issued
            </div>
          </div>
        </div>
        
        <h3>Team Members</h3>
        <table class="members-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Enrollment</th>
              <th>Email</th>
              <th>Department</th>
              <th>Role</th>
              <th>Attendance</th>
              <th>Feedback</th>
              <th>Certificate</th>
            </tr>
          </thead>
          <tbody>
            ${data.teamLeader ? `
              <tr>
                <td>${data.teamLeader.name}</td>
                <td>${data.teamLeader.enrollment_no}</td>
                <td>${data.teamLeader.email}</td>
                <td>${data.teamLeader.department}</td>
                <td><strong>Team Leader</strong></td>
                <td><span class="status-badge ${data.teamLeader.attendance?.marked ? 'status-marked' : 'status-pending'}">${data.teamLeader.attendance?.marked ? 'Marked' : 'Pending'}</span></td>
                <td><span class="status-badge ${data.teamLeader.feedback?.submitted ? 'status-marked' : 'status-pending'}">${data.teamLeader.feedback?.submitted ? 'Submitted' : 'Pending'}</span></td>
                <td><span class="status-badge ${data.teamLeader.certificate?.issued ? 'status-marked' : 'status-pending'}">${data.teamLeader.certificate?.issued ? 'Issued' : 'Pending'}</span></td>
              </tr>
            ` : ''}
            ${data.members.map(member => `
              <tr>
                <td>${member.name}</td>
                <td>${member.enrollment_no}</td>
                <td>${member.email}</td>
                <td>${member.department}</td>
                <td>Member</td>
                <td><span class="status-badge ${member.attendance?.marked ? 'status-marked' : 'status-pending'}">${member.attendance?.marked ? 'Marked' : 'Pending'}</span></td>
                <td><span class="status-badge ${member.feedback?.submitted ? 'status-marked' : 'status-pending'}">${member.feedback?.submitted ? 'Submitted' : 'Pending'}</span></td>
                <td><span class="status-badge ${member.certificate?.issued ? 'status-marked' : 'status-pending'}">${member.certificate?.issued ? 'Issued' : 'Pending'}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Generated on ${new Date().toLocaleString()} | CampusConnect Event Management System</p>
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

  // Utility functions
  const showNotification = (message, type = 'info') => {
    if (type === 'error') {
      setError(message);
    } else {
      setSuccess(message);
    }

    setTimeout(() => {
      setError('');
      setSuccess('');
    }, 5000);
  };

  const handleAddModalClose = () => {
    setShowAddModal(false);
    setParticipantEnrollment('');
    setEnrollmentError('');
    setValidatedStudent(null);
  };

  const handleConfirmModalClose = () => {
    setShowConfirmModal(false);
    setValidatedStudent(null);
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

  const refreshTeamData = async () => {
    setRefreshing(true);
    await fetchTeamData();
    setRefreshing(false);
  };

  // Load team roles and tasks - fallback API call to refresh data
  const loadTeamRolesAndTasks = async () => {
    if (!teamRegistration) return;
    
    try {
      // Only call API if we don't have roles already loaded from registration
      if (Object.keys(memberRoles).length === 0) {
        // Fetch roles using team tools API
        const rolesResponse = await clientAPI.getTeamRoles(eventId);
        
        if (rolesResponse.data?.success) {
          const rolesMap = {};
          const rolesData = rolesResponse.data.roles || [];
          
          rolesData.forEach(roleInfo => {
            rolesMap[roleInfo.enrollment_no] = {
              role: roleInfo.assigned_role,
              description: roleInfo.description || '',
              permissions: roleInfo.permissions || []
            };
          });
          setMemberRoles(rolesMap);
        } else {
          // Use data from teamRegistration as fallback
          if (teamRegistration.team_roles) {
            const rolesMap = {};
            Object.keys(teamRegistration.team_roles).forEach(enrollment => {
              rolesMap[enrollment] = teamRegistration.team_roles[enrollment];
            });
            setMemberRoles(rolesMap);
          }
        }
      }
      
      // Only call tasks API if we don't have tasks already loaded
      if (Object.keys(memberTasks).length === 0) {
        // Fetch tasks using team tools API
        const tasksResponse = await clientAPI.getTeamTasks(eventId);
        
        if (tasksResponse.data?.success) {
          const tasksMap = {};
          const allTasks = tasksResponse.data.tasks || [];
          
          console.log('TeamManagement: Loaded tasks from API:', allTasks);
          
          allTasks.forEach(task => {
            console.log('TeamManagement: Processing task:', task.task_id, task);
            
            task.assigned_to.forEach(enrollment => {
              if (!tasksMap[enrollment]) {
                tasksMap[enrollment] = [];
              }
              tasksMap[enrollment].push({
                ...task, // Keep all original task fields
                id: task.task_id, // Keep backward compatibility
                status: task.status || 'pending' // Ensure status exists
              });
            });
          });
          setMemberTasks(tasksMap);
          
          console.log('TeamManagement: Final tasks map:', tasksMap);
        } else {
          // Use data from teamRegistration as fallback
          if (teamRegistration.tasks) {
            const tasksMap = {};
            teamRegistration.tasks.forEach(task => {
              task.assigned_to.forEach(enrollment => {
                if (!tasksMap[enrollment]) {
                  tasksMap[enrollment] = [];
                }
                tasksMap[enrollment].push(task);
              });
            });
            setMemberTasks(tasksMap);
          }
        }
      }
    } catch (error) {
      console.error('Error in loadTeamRolesAndTasks:', error);
      
      // Fallback to existing data in teamRegistration if API fails
      if (teamRegistration.team_roles && Object.keys(memberRoles).length === 0) {
        const rolesMap = {};
        Object.keys(teamRegistration.team_roles).forEach(enrollment => {
          rolesMap[enrollment] = teamRegistration.team_roles[enrollment];
        });
        setMemberRoles(rolesMap);
      }
      
      if (teamRegistration.tasks && Object.keys(memberTasks).length === 0) {
        const tasksMap = {};
        teamRegistration.tasks.forEach(task => {
          task.assigned_to.forEach(enrollment => {
            if (!tasksMap[enrollment]) {
              tasksMap[enrollment] = [];
            }
            tasksMap[enrollment].push(task);
          });
        });
        setMemberTasks(tasksMap);
      }
    }
  };

  // Get role for a specific member
  const getMemberRole = (enrollment_no) => {
    // Check if this member has an assigned role
    const assignedRole = memberRoles[enrollment_no];
    if (assignedRole) {
      return assignedRole;
    }
    
    // Check if this is the team leader
    if (teamRegistration?.team_leader?.enrollment_no === enrollment_no) {
      return { 
        role: 'Team Leader', 
        description: 'Leads and coordinates the team', 
        permissions: ['manage_team', 'assign_tasks', 'assign_roles'] 
      };
    }
    
    // Default member role
    return { role: 'Team Member', description: 'Contributing team member', permissions: [] };
  };

  // Get tasks for a specific member
  const getMemberTasks = (enrollment_no) => {
    return memberTasks[enrollment_no] || [];
  };

  // Show member tasks modal
  const showMemberTasks = (member) => {
    const tasks = getMemberTasks(member.enrollment_no);
    setSelectedMemberTasks({
      member: member,
      tasks: tasks
    });
    setShowMemberTasksModal(true);
  };

  // Show member work progress (placeholder for future implementation)
  const showMemberProgress = (member) => {
    alert(`🚧 View Work Progress Feature Under Development!\n\nThis feature will display:\n• Work submission links\n• Progress tracking\n• Completed milestones\n• Work quality assessments\n\nFor member: ${member.name} (${member.enrollment_no})\nComing soon! 🔜`);
  };

  // Task review functions for team leaders
  const openTaskReviewModal = (task) => {
    setReviewingTask(task);
    setReviewStatus('approved');
    setReviewNotes('');
    setShowTaskReviewModal(true);
  };

  const closeTaskReviewModal = () => {
    setShowTaskReviewModal(false);
    setReviewingTask(null);
    setReviewStatus('approved');
    setReviewNotes('');
  };

  const submitTaskReview = async () => {
    if (!reviewingTask) return;

    console.log('TeamManagement: Reviewing task object:', reviewingTask);
    const taskId = reviewingTask.task_id || reviewingTask.id;
    console.log('TeamManagement: Task ID for review:', taskId);

    if (!taskId) {
      showNotification('Error: Task ID is missing. Cannot submit review.', 'error');
      return;
    }

    setReviewLoading(true);
    
    try {
      const response = await clientAPI.reviewTask(eventId, taskId, {
        review_status: reviewStatus,
        review_notes: reviewNotes
      });
      
      console.log('TeamManagement: Task review response:', response);
      
      // Refresh team data to reflect changes
      await loadTeamRolesAndTasks();
      showNotification(`Task ${reviewStatus === 'approved' ? 'approved' : reviewStatus === 'rejected' ? 'rejected' : 'needs revision'}!`, 'success');
      closeTaskReviewModal();
      
    } catch (error) {
      console.error('TeamManagement: Error reviewing task:', error);
      showNotification(`Failed to review task: ${error.message}`, 'error');
    } finally {
      setReviewLoading(false);
    }
  };

  // Quick approve function for direct approval
  const quickApproveTask = async (task, status = 'approved', notes = 'Quick approval') => {
    const taskId = task.task_id || task.id;
    
    if (!taskId) {
      showNotification('Error: Task ID is missing. Cannot review task.', 'error');
      return;
    }

    setReviewLoading(true);
    
    try {
      const response = await clientAPI.reviewTask(eventId, taskId, {
        review_status: status,
        review_notes: notes
      });
      
      console.log('TeamManagement: Quick task review response:', response);
      
      // Refresh team data to reflect changes
      await loadTeamRolesAndTasks();
      showNotification(`Task ${status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'needs revision'}!`, 'success');
      
    } catch (error) {
      console.error('TeamManagement: Error quick reviewing task:', error);
      showNotification(`Failed to review task: ${error.message}`, 'error');
    } finally {
      setReviewLoading(false);
    }
  };

  // Enhanced team management functions
  const handleTaskModalSuccess = () => {
    setShowTaskModal(false);
    showNotification('Task created successfully!', 'success');
    loadTeamRolesAndTasks(); // Refresh to get updated tasks
  };

  const handleRoleModalSuccess = () => {
    setShowRoleModal(false);
    showNotification('Role assigned successfully!', 'success');
    loadTeamRolesAndTasks(); // Refresh to get updated roles
  };

  const handleReportModalSuccess = () => {
    setShowReportModal(false);
    showNotification('Report generated successfully!', 'success');
  };

  // Team management permissions helper
  const isTeamLeader = () => {
    if (!user || !teamRegistration) return false;
    return teamRegistration.team_leader?.enrollment_no === user.enrollment_no;
  };

  // Prepare team members data for modals
  const getTeamMembersForModal = () => {
    if (!teamRegistration) return [];
    
    const allMembers = [];
    
    // Add team leader
    if (teamRegistration.team_leader) {
      const leader = teamRegistration.team_leader;
      allMembers.push({
        enrollment_no: leader.enrollment_no || '',
        name: leader.full_name || leader.name || 'Team Leader',
        email: leader.email || '',
        role: 'Team Leader',
        isLeader: true
      });
    }
    
    // Add other members
    if (teamRegistration.members && Array.isArray(teamRegistration.members) && teamRegistration.members.length > 0) {
      teamRegistration.members.forEach((member, index) => {
        if (member && (member.enrollment_no || member.full_name || member.name)) {
          allMembers.push({
            enrollment_no: member.enrollment_no || `member_${index}`,
            name: member.full_name || member.name || `Member ${index + 1}`,
            email: member.email || '',
            role: member.role || 'Member',
            isLeader: false
          });
        }
      });
    }
    
    // Debug log to see what data we're working with
    console.log('🔍 Team members for modal:', allMembers);
    console.log('🔍 Original team registration:', teamRegistration);
    
    return allMembers;
  };

  // Confirm and add team member using new backend API
  const confirmAddMember = async () => {
    if (!validatedStudent || !teamRegistration?.registration_id) return;

    setIsAdding(true);
    try {
      // Check if event allows multiple team registrations
      const allowMultiple = event?.allow_multiple_team_registrations || false;
      
      if (allowMultiple) {
        // Use invitation system for multiple team registration events
        const response = await clientAPI.sendTeamInvitation(
          eventId,
          teamRegistration.registration_id,
          validatedStudent.enrollment_no
        );

        if (response.data.success) {
          showNotification('Team invitation sent successfully! The student will receive a notification.', 'success');
          await fetchTeamData(); // Refresh data
          setShowConfirmModal(false);
          setShowAddModal(false);
          setParticipantEnrollment('');
          setValidatedStudent(null);
        } else {
          setError(response.data.message || 'Failed to send team invitation');
          setShowConfirmModal(false);
          setShowAddModal(true);
        }
      } else {
        // Use direct add for single team registration events
        const response = await clientAPI.addTeamMember(
          eventId,
          teamRegistration.registration_id,
          validatedStudent.enrollment_no
        );

        if (response.data.success) {
          showNotification('Team member added successfully!', 'success');
          await fetchTeamData(); // Refresh data
          setShowConfirmModal(false);
          setShowAddModal(false);
          setParticipantEnrollment('');
          setValidatedStudent(null);
        } else {
          setError(response.data.message || 'Failed to add team member');
          setShowConfirmModal(false);
          setShowAddModal(true);
        }
      }
    } catch (error) {
      console.error('Add member error:', error);
      setError('Failed to add team member. Please try again.');
      setShowConfirmModal(false);
      setShowAddModal(true);
    } finally {
      setIsAdding(false);
    }
  };

  // Confirm and remove team member using new backend API
  const confirmRemoveMember = async () => {
    if (!removeTarget || !teamRegistration?.registration_id) return;

    // Check minimum team size requirement
    if (teamRegistration.team_size <= teamRegistration.min_size) {
      setError(`Cannot remove member! Minimum team size required is ${teamRegistration.min_size} members.`);
      setShowRemoveModal(false);
      return;
    }

    setIsRemoving(true);
    try {
      // Use new team member management API
      const response = await clientAPI.removeTeamMember(
        eventId,
        teamRegistration.registration_id,
        removeTarget.enrollment_no
      );

      if (response.data.success) {
        showNotification('Team member removed successfully!', 'success');
        await fetchTeamData(); // Refresh data
        setShowRemoveModal(false);
        setRemoveTarget(null);
      } else {
        setError(response.data.message || 'Failed to remove team member');
        setShowRemoveModal(false);
      }
    } catch (error) {
      console.error('Remove member error:', error);
      setError('Failed to remove team member. Please try again.');
      setShowRemoveModal(false);
    } finally {
      setIsRemoving(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner />
            <p className="mt-4 text-gray-600">Loading team registration...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (error && !teamRegistration) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <i className="fas fa-exclamation-triangle text-red-600 text-2xl"></i>
              </div>
              <h1 className="text-xl font-bold text-red-900 mb-2">Team Registration Not Found</h1>
              <p className="text-red-700 mb-4">{error}</p>
              <div className="space-x-4">
                <button
                  onClick={() => navigate('/client/dashboard')}
                  className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Return to Dashboard
                </button>
                <button
                  onClick={fetchTeamData}
                  className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!teamRegistration) return null;

  const canAddMembers = teamRegistration.team_size < teamRegistration.max_size;
  const availableSlots = teamRegistration.max_size - teamRegistration.team_size;
  const canRemoveMembers = teamRegistration.team_size > teamRegistration.min_size;
  const isRegistrationOpen = event?.status === 'upcoming' &&
    (event?.sub_status === 'registration_open' ||
      event?.sub_status === 'registration_not_started');

  // Calculate participation statistics
  const allTeamMembers = [teamRegistration.team_leader, ...teamRegistration.members].filter(Boolean);
  const attendanceCount = allTeamMembers.filter(member => member.attendance?.marked).length;
  const feedbackCount = allTeamMembers.filter(member => member.feedback?.submitted).length;
  const certificateCount = allTeamMembers.filter(member => member.certificate?.issued).length;

  // Calculate task statistics for team leader notifications
  const taskStats = (() => {
    const allTasks = Object.values(memberTasks).flat();
    return {
      total: allTasks.length,
      completed: allTasks.filter(t => t.status === 'completed').length,
      submitted: allTasks.filter(t => t.status === 'submitted').length,
      inProgress: allTasks.filter(t => t.status === 'in_progress').length,
      pending: allTasks.filter(t => !t.status || t.status === 'pending').length,
      needsReview: allTasks.filter(t => t.status === 'submitted').length,
      needsRevision: allTasks.filter(t => t.review_status === 'needs_revision').length
    };
  })();

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-6">

          {/* Enhanced Team Header with Real-time Status */}
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-users text-blue-600 text-xl"></i>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{teamRegistration.team_name}</h1>
                  <p className="text-gray-600">{event?.event_name}</p>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                    <span>Registration ID: <code className="font-mono">{teamRegistration.registration_id}</code></span>
                    <span>•</span>
                    <span>Registered: {new Date(teamRegistration.registered_at).toLocaleDateString()}</span>
                    {lastUpdated && (
                      <>
                        <span>•</span>
                        <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Task Status Summary for Team Leader */}
              {isTeamLeader() && taskStats.total > 0 && (
                <div className="text-right">
                  <div className="text-sm text-gray-600 mb-1">Task Overview</div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-green-600 font-medium">{taskStats.completed} Completed</span>
                    {taskStats.needsReview > 0 && (
                      <span className="text-purple-600 font-medium bg-purple-50 px-2 py-1 rounded">
                        {taskStats.needsReview} Need Review
                      </span>
                    )}
                    {taskStats.needsRevision > 0 && (
                      <span className="text-yellow-600 font-medium bg-yellow-50 px-2 py-1 rounded">
                        {taskStats.needsRevision} Need Revision
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={refreshTeamData}
                  disabled={refreshing}
                  className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                  title="Refresh team data"
                >
                  <i className={`fas fa-sync-alt ${refreshing ? 'animate-spin' : ''}`}></i>
                </button>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${teamRegistration.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
                  }`}>
                  {teamRegistration.status === 'active' ? 'Active' : 'Inactive'}
                </div>
              </div>
            </div>
          </div>
          
          {/* Team Leader Task Notifications */}
          {isTeamLeader() && (taskStats.needsReview > 0 || taskStats.needsRevision > 0) && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-exclamation-circle text-purple-600"></i>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-purple-800 mb-1">Team Leader Actions Required</h3>
                  <div className="text-sm text-purple-700 space-y-1">
                    {taskStats.needsReview > 0 && (
                      <p>• {taskStats.needsReview} task(s) have been submitted and are waiting for your review</p>
                    )}
                    {taskStats.needsRevision > 0 && (
                      <p>• {taskStats.needsRevision} task(s) need revision based on your feedback</p>
                    )}
                  </div>
                  <p className="text-xs text-purple-600 mt-2">
                    Click on team members below to view and review their tasks.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Event Status Indicator */}
          <div className="bg-white rounded-lg border p-6 mb-6">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <i className="fas fa-calendar-alt text-blue-600"></i>
                <div>
                  <div className="font-medium text-gray-900">Event Status</div>
                  <div className="text-sm text-gray-600 capitalize">{event?.status?.replace('_', ' ')}</div>
                </div>
              </div>
              <div className="flex items-center space-x-6 text-sm">
                <div className={`flex items-center space-x-2 ${teamStatus?.attendance_available ? 'text-green-600' : 'text-gray-400'}`}>
                  <i className="fas fa-check-circle"></i>
                  <span>Attendance {teamStatus?.attendance_available ? 'Open' : 'Closed'}</span>
                </div>
                <div className={`flex items-center space-x-2 ${teamStatus?.feedback_available ? 'text-purple-600' : 'text-gray-400'}`}>
                  <i className="fas fa-comment"></i>
                  <span>Feedback {teamStatus?.feedback_available ? 'Open' : 'Closed'}</span>
                </div>
                <div className={`flex items-center space-x-2 ${teamStatus?.certificates_available ? 'text-orange-600' : 'text-gray-400'}`}>
                  <i className="fas fa-certificate"></i>
                  <span>Certificates {teamStatus?.certificates_available ? 'Available' : 'Pending'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <i className="fas fa-exclamation-triangle text-red-600 mr-3"></i>
                <span className="text-red-800">{error}</span>
                <button
                  onClick={() => setError('')}
                  className="ml-auto text-red-400 hover:text-red-600"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <i className="fas fa-check-circle text-green-600 mr-3"></i>
                <span className="text-green-800">{success}</span>
                <button
                  onClick={() => setSuccess('')}
                  className="ml-auto text-green-400 hover:text-green-600"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
          )}

          {/* Enhanced Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border text-center">
              <div className="text-2xl font-bold text-blue-600">{teamRegistration.team_size}</div>
              <div className="text-xs text-gray-600">Current Size</div>
            </div>
            <div className="bg-white p-4 rounded-lg border text-center">
              <div className="text-2xl font-bold text-green-600">{availableSlots}</div>
              <div className="text-xs text-gray-600">Available Slots</div>
            </div>
            <div className="bg-white p-4 rounded-lg border text-center">
              <div className="text-2xl font-bold text-emerald-600">{attendanceCount}</div>
              <div className="text-xs text-gray-600">Attendance Marked</div>
            </div>
            <div className="bg-white p-4 rounded-lg border text-center">
              <div className="text-2xl font-bold text-purple-600">{feedbackCount}</div>
              <div className="text-xs text-gray-600">Feedback Submitted</div>
            </div>
            <div className="bg-white p-4 rounded-lg border text-center">
              <div className="text-2xl font-bold text-orange-600">{certificateCount}</div>
              <div className="text-xs text-gray-600">Certificates Issued</div>
            </div>
          </div>

          {/* Action Buttons - Conditional based on event status */}
          <div className="flex flex-wrap gap-4 mb-6">
            {canAddMembers && isRegistrationOpen ? (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex-1 min-w-[200px] bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
              >
                <i className="fas fa-user-plus mr-2"></i>
                Add Member ({availableSlots} slots left)
              </button>
            ) : (
              <div className="flex-1 min-w-[200px] bg-gray-200 text-gray-500 px-6 py-3 rounded-lg font-medium text-center">
                <i className="fas fa-users mr-2"></i>
                {canAddMembers ? 'Registration Closed' : `Team Full (${teamRegistration.team_size}/${teamRegistration.max_size})`}
              </div>
            )}

            <button
              onClick={() => setShowTeamStatusModal(true)}
              className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <i className="fas fa-chart-line mr-2"></i>
              Detailed Status
            </button>

            {/* Team Tools Button - Only for Team Leaders */}
            {isTeamLeader() && (
              <div className="relative">
                <button
                  onClick={() => setShowTeamManagementDropdown(!showTeamManagementDropdown)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <i className="fas fa-cog mr-2"></i>
                  Team Tools
                  <i className={`fas fa-chevron-${showTeamManagementDropdown ? 'up' : 'down'}`}></i>
                </button>

                {showTeamManagementDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white border rounded-lg shadow-lg z-50">
                    <div className="py-2">
                      <button
                        onClick={() => {
                          if (teamRegistration) {
                            setShowTaskModal(true);
                            setShowTeamManagementDropdown(false);
                          } else {
                            showNotification('Team data not loaded yet', 'error');
                            setShowTeamManagementDropdown(false);
                          }
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center gap-3 border-b border-gray-100"
                      >
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <i className="fas fa-tasks text-blue-600 text-sm"></i>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Assign Tasks</p>
                          <p className="text-xs text-gray-600">Create and assign tasks to members</p>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          if (teamRegistration) {
                            setShowRoleModal(true);
                            setShowTeamManagementDropdown(false);
                          } else {
                            showNotification('Team data not loaded yet', 'error');
                            setShowTeamManagementDropdown(false);
                          }
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-purple-50 flex items-center gap-3 border-b border-gray-100"
                      >
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <i className="fas fa-user-tag text-purple-600 text-sm"></i>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Assign Roles</p>
                          <p className="text-xs text-gray-600">Define member roles and responsibilities</p>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          if (teamRegistration) {
                            setShowReportModal(true);
                            setShowTeamManagementDropdown(false);
                          } else {
                            showNotification('Team data not loaded yet', 'error');
                            setShowTeamManagementDropdown(false);
                          }
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-indigo-50 flex items-center gap-3"
                      >
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                          <i className="fas fa-chart-pie text-indigo-600 text-sm"></i>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Generate Report</p>
                          <p className="text-xs text-gray-600">Create detailed team reports</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
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
                  </div>
                </div>
              )}
            </div>

            {isRegistrationOpen && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <i className="fas fa-times mr-2"></i>
                Cancel Registration
              </button>
            )}
          </div>

          {/* Team Members List - Redesigned for event lifecycle */}
          <div className="space-y-4">
            {/* Team Leader */}
            {teamRegistration.team_leader && (
              <div className="bg-white rounded-lg border-l-4 border-l-blue-500 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <i className="fas fa-crown text-blue-600"></i>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{teamRegistration.team_leader.name}</h3>
                      <p className="text-gray-600">{teamRegistration.team_leader.enrollment_no} • Team Leader</p>
                      
                      {/* Role Display */}
                      <div className="mt-2">
                        {(() => {
                          const role = getMemberRole(teamRegistration.team_leader.enrollment_no);
                          return (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                <i className="fas fa-user-tie"></i>
                                {role.role}
                              </span>
                              {role.description && (
                                <span className="text-xs text-gray-500" title={role.description}>
                                  {role.description.length > 30 ? role.description.substring(0, 30) + '...' : role.description}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                        <span>{teamRegistration.team_leader.department}</span>
                        <span>•</span>
                        <span>Sem {teamRegistration.team_leader.semester}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="text-right text-sm text-gray-600">
                      <div>{teamRegistration.team_leader.email}</div>
                      <div>{teamRegistration.team_leader.phone}</div>
                    </div>
                    {/* Participation Status Indicators */}
                    <div className="flex items-center space-x-2">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${teamRegistration.team_leader.attendance?.marked
                        ? 'bg-green-100 text-green-600'
                        : teamStatus?.attendance_available
                          ? 'bg-orange-100 text-orange-600'
                          : 'bg-gray-100 text-gray-400'
                        }`} title={`Attendance: ${teamRegistration.team_leader.attendance?.marked ? 'Marked' : 'Pending'}`}>
                        <i className="fas fa-check text-xs"></i>
                      </div>
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${teamRegistration.team_leader.feedback?.submitted
                        ? 'bg-purple-100 text-purple-600'
                        : teamStatus?.feedback_available
                          ? 'bg-orange-100 text-orange-600'
                          : 'bg-gray-100 text-gray-400'
                        }`} title={`Feedback: ${teamRegistration.team_leader.feedback?.submitted ? 'Submitted' : 'Pending'}`}>
                        <i className="fas fa-comment text-xs"></i>
                      </div>
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${teamRegistration.team_leader.certificate?.issued
                        ? 'bg-orange-100 text-orange-600'
                        : teamStatus?.certificates_available
                          ? 'bg-orange-100 text-orange-600'
                          : 'bg-gray-100 text-gray-400'
                        }`} title={`Certificate: ${teamRegistration.team_leader.certificate?.issued ? 'Available' : 'Pending'}`}>
                        <i className="fas fa-certificate text-xs"></i>
                      </div>
                    </div>
                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                      {/* View Tasks Button */}
                      <button
                        onClick={() => showMemberTasks({
                          enrollment_no: teamRegistration.team_leader.enrollment_no,
                          name: teamRegistration.team_leader.name,
                          role: 'Team Leader'
                        })}
                        className="p-2 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors"
                        title="View assigned tasks"
                      >
                        <i className="fas fa-tasks"></i>
                      </button>
                      
                      {/* View Progress Button */}
                      <button
                        onClick={() => showMemberProgress({
                          enrollment_no: teamRegistration.team_leader.enrollment_no,
                          name: teamRegistration.team_leader.name,
                          role: 'Team Leader'
                        })}
                        className="p-2 rounded-lg text-green-600 hover:text-green-800 hover:bg-green-50 transition-colors"
                        title="View work progress"
                      >
                        <i className="fas fa-chart-line"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Team Members */}
            {teamRegistration.members && teamRegistration.members.length > 0 && teamRegistration.members.map((member, index) => (
              <div key={member.id || index} className="bg-white rounded-lg border p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      <i className="fas fa-user text-gray-600"></i>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{member.name}</h3>
                      <p className="text-gray-600">{member.enrollment_no} • Member</p>
                      
                      {/* Role Display */}
                      <div className="mt-2">
                        {(() => {
                          const role = getMemberRole(member.enrollment_no);
                          return (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                                <i className="fas fa-user-tag"></i>
                                {role.role}
                              </span>
                              {role.description && (
                                <span className="text-xs text-gray-500" title={role.description}>
                                  {role.description.length > 30 ? role.description.substring(0, 30) + '...' : role.description}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                        <span>{member.department}</span>
                        <span>•</span>
                        <span>Sem {member.semester}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="text-right text-sm text-gray-600">
                      <div>{member.email}</div>
                      <div>{member.phone}</div>
                    </div>
                    {/* Participation Status Indicators */}
                    <div className="flex items-center space-x-2">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${member.attendance?.marked
                        ? 'bg-green-100 text-green-600'
                        : teamStatus?.attendance_available
                          ? 'bg-orange-100 text-orange-600'
                          : 'bg-gray-100 text-gray-400'
                        }`} title={`Attendance: ${member.attendance?.marked ? 'Marked' : 'Pending'}`}>
                        <i className="fas fa-check text-xs"></i>
                      </div>
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${member.feedback?.submitted
                        ? 'bg-purple-100 text-purple-600'
                        : teamStatus?.feedback_available
                          ? 'bg-orange-100 text-orange-600'
                          : 'bg-gray-100 text-gray-400'
                        }`} title={`Feedback: ${member.feedback?.submitted ? 'Submitted' : 'Pending'}`}>
                        <i className="fas fa-comment text-xs"></i>
                      </div>
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${member.certificate?.issued
                        ? 'bg-orange-100 text-orange-600'
                        : teamStatus?.certificates_available
                          ? 'bg-orange-100 text-orange-600'
                          : 'bg-gray-100 text-gray-400'
                        }`} title={`Certificate: ${member.certificate?.issued ? 'Available' : 'Pending'}`}>
                        <i className="fas fa-certificate text-xs"></i>
                      </div>
                    </div>
                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                      {/* View Tasks Button */}
                      <button
                        onClick={() => showMemberTasks({
                          enrollment_no: member.enrollment_no,
                          name: member.name,
                          role: 'Member'
                        })}
                        className="p-2 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors"
                        title="View assigned tasks"
                      >
                        <i className="fas fa-tasks"></i>
                      </button>
                      
                      {/* View Progress Button */}
                      <button
                        onClick={() => showMemberProgress({
                          enrollment_no: member.enrollment_no,
                          name: member.name,
                          role: 'Member'
                        })}
                        className="p-2 rounded-lg text-green-600 hover:text-green-800 hover:bg-green-50 transition-colors"
                        title="View work progress"
                      >
                        <i className="fas fa-chart-line"></i>
                      </button>
                      
                      {/* Remove Button */}
                      {isRegistrationOpen && (
                        <button
                          onClick={() => {
                            if (!canRemoveMembers) {
                              setError(`Cannot remove member! Minimum team size required is ${teamRegistration.min_size} members.`);
                              return;
                            }
                            setRemoveTarget(member);
                            setShowRemoveModal(true);
                          }}
                          disabled={!canRemoveMembers}
                          className={`p-2 rounded-lg transition-colors ${
                            canRemoveMembers 
                              ? 'text-red-600 hover:text-red-800 hover:bg-red-50' 
                              : 'text-gray-400 cursor-not-allowed bg-gray-100'
                          }`}
                          title={canRemoveMembers ? "Remove member" : `Cannot remove - minimum ${teamRegistration.min_size} members required`}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Add Member Prompt - Only show if team needs more members and registration is open */}
            {teamRegistration.team_size < teamRegistration.min_size && isRegistrationOpen && (
              <div className="bg-orange-50 border-2 border-dashed border-orange-300 rounded-lg p-8 text-center">
                <div className="w-16 h-16 bg-orange-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-exclamation-triangle text-orange-600 text-2xl"></i>
                </div>
                <h3 className="text-lg font-medium text-orange-900 mb-2">Team Size Requirements</h3>
                <p className="text-orange-700 mb-4">
                  Your team needs at least {teamRegistration.min_size} members to participate.
                  Add {teamRegistration.min_size - teamRegistration.team_size} more member(s).
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  <i className="fas fa-user-plus mr-2"></i>
                  Add Required Members
                </button>
              </div>
            )}

            {/* Add Member Prompt - Regular case */}
            {teamRegistration.team_size >= teamRegistration.min_size &&
              teamRegistration.team_size < teamRegistration.max_size &&
              isRegistrationOpen && (
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-users text-gray-400 text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Add More Team Members</h3>
                  <p className="text-gray-600 mb-4">
                    You can add up to {availableSlots} more member(s) to your team.
                  </p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    <i className="fas fa-user-plus mr-2"></i>
                    Add Team Member
                  </button>
                </div>
              )}
          </div>

          {/* Team Information Cards */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Team Requirements */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <i className="fas fa-info-circle text-blue-600 mr-2"></i>
                Team Requirements
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Team Size</span>
                  <span className="font-medium">
                    {teamRegistration.min_size} - {teamRegistration.max_size} members
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Current Size</span>
                  <span className={`font-medium ${teamRegistration.team_size >= teamRegistration.min_size ? 'text-green-600' : 'text-orange-600'
                    }`}>
                    {teamRegistration.team_size} members
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${teamRegistration.team_size >= teamRegistration.min_size
                    ? 'bg-green-100 text-green-800'
                    : 'bg-orange-100 text-orange-800'
                    }`}>
                    {teamRegistration.team_size >= teamRegistration.min_size ? 'Requirements Met' : 'Needs More Members'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${teamRegistration.team_size >= teamRegistration.min_size ? 'bg-green-500' : 'bg-orange-500'
                      }`}
                    style={{ width: `${Math.min((teamRegistration.team_size / teamRegistration.max_size) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Participation Guide */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <i className="fas fa-map text-green-600 mr-2"></i>
                Participation Guide
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i className="fas fa-check text-xs"></i>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Attendance Marking</span>
                    <p className="text-gray-600">Individual attendance tracking for each team member</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i className="fas fa-comment text-xs"></i>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Feedback Submission</span>
                    <p className="text-gray-600">Each member submits individual feedback</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i className="fas fa-certificate text-xs"></i>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Certificate Generation</span>
                    <p className="text-gray-600">Individual certificates based on participation</p>
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
      {showConfirmModal && validatedStudent && (
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
                    <span className="font-medium">{validatedStudent.full_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Enrollment:</span>
                    <span className="font-mono">{validatedStudent.enrollment_no}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span>{validatedStudent.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mobile:</span>
                    <span>{validatedStudent.mobile_no}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Department:</span>
                    <span>{validatedStudent.department}</span>
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
                {!canRemoveMembers && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-exclamation-triangle text-red-600"></i>
                      <p className="text-sm text-red-700 font-medium">
                        Cannot remove member! Minimum team size required is {teamRegistration.min_size} members.
                      </p>
                    </div>
                  </div>
                )}
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
                disabled={!canRemoveMembers}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  canRemoveMembers 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                title={canRemoveMembers ? "Remove member" : `Cannot remove - minimum ${teamRegistration.min_size} members required`}
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
                        <div className={`p-3 rounded-lg border ${teamInfo.team_leader.attendance?.marked
                          ? 'bg-green-50 border-green-200'
                          : 'bg-orange-50 border-orange-200'
                          }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <i className={`fas fa-check text-xs ${teamInfo.team_leader.attendance?.marked ? 'text-green-600' : 'text-orange-600'
                              }`}></i>
                            <span className={`text-xs font-medium ${teamInfo.team_leader.attendance?.marked ? 'text-green-800' : 'text-orange-800'
                              }`}>Attendance</span>
                          </div>
                          <div className={`text-xs ${teamInfo.team_leader.attendance?.marked ? 'text-green-700' : 'text-orange-700'
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
                        <div className={`p-3 rounded-lg border ${teamInfo.team_leader.feedback?.submitted
                          ? 'bg-purple-50 border-purple-200'
                          : 'bg-orange-50 border-orange-200'
                          }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <i className={`fas fa-comment text-xs ${teamInfo.team_leader.feedback?.submitted ? 'text-purple-600' : 'text-orange-600'
                              }`}></i>
                            <span className={`text-xs font-medium ${teamInfo.team_leader.feedback?.submitted ? 'text-purple-800' : 'text-orange-800'
                              }`}>Feedback</span>
                          </div>
                          <div className={`text-xs ${teamInfo.team_leader.feedback?.submitted ? 'text-purple-700' : 'text-orange-700'
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
                        <div className={`p-3 rounded-lg border ${teamInfo.team_leader.certificate?.earned
                          ? 'bg-orange-50 border-orange-200'
                          : 'bg-gray-50 border-gray-200'
                          }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <i className={`fas fa-certificate text-xs ${teamInfo.team_leader.certificate?.earned ? 'text-orange-600' : 'text-gray-600'
                              }`}></i>
                            <span className={`text-xs font-medium ${teamInfo.team_leader.certificate?.earned ? 'text-orange-800' : 'text-gray-800'
                              }`}>Certificate</span>
                          </div>
                          <div className={`text-xs ${teamInfo.team_leader.certificate?.earned ? 'text-orange-700' : 'text-gray-700'
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
                          <div className={`p-3 rounded-lg border ${participant.attendance?.marked
                            ? 'bg-green-50 border-green-200'
                            : 'bg-orange-50 border-orange-200'
                            }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <i className={`fas fa-check text-xs ${participant.attendance?.marked ? 'text-green-600' : 'text-orange-600'
                                }`}></i>
                              <span className={`text-xs font-medium ${participant.attendance?.marked ? 'text-green-800' : 'text-orange-800'
                                }`}>Attendance</span>
                            </div>
                            <div className={`text-xs ${participant.attendance?.marked ? 'text-green-700' : 'text-orange-700'
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
                          <div className={`p-3 rounded-lg border ${participant.feedback?.submitted
                            ? 'bg-purple-50 border-purple-200'
                            : 'bg-orange-50 border-orange-200'
                            }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <i className={`fas fa-comment text-xs ${participant.feedback?.submitted ? 'text-purple-600' : 'text-orange-600'
                                }`}></i>
                              <span className={`text-xs font-medium ${participant.feedback?.submitted ? 'text-purple-800' : 'text-orange-800'
                                }`}>Feedback</span>
                            </div>
                            <div className={`text-xs ${participant.feedback?.submitted ? 'text-purple-700' : 'text-orange-700'
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
                          <div className={`p-3 rounded-lg border ${participant.certificate?.earned
                            ? 'bg-orange-50 border-orange-200'
                            : 'bg-gray-50 border-gray-200'
                            }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <i className={`fas fa-certificate text-xs ${participant.certificate?.earned ? 'text-orange-600' : 'text-gray-600'
                                }`}></i>
                              <span className={`text-xs font-medium ${participant.certificate?.earned ? 'text-orange-800' : 'text-gray-800'
                                }`}>Certificate</span>
                            </div>
                            <div className={`text-xs ${participant.certificate?.earned ? 'text-orange-700' : 'text-gray-700'
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

              </div>
            </div>

            {/* Enhanced Modals for event lifecycle */}

            {/* Add Member Modal */}
            {showAddModal && (
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Team Member</h3>

                  <form onSubmit={handleValidateSubmit}>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Student Enrollment Number
                      </label>
                      <input
                        type="text"
                        value={participantEnrollment}
                        onChange={handleEnrollmentChange}
                        placeholder="Enter enrollment number"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        maxLength="20"
                        required
                      />
                      {enrollmentError && (
                        <p className="text-red-600 text-sm mt-1">{enrollmentError}</p>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={!participantEnrollment.trim() || isValidating}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {isValidating ? 'Validating...' : 'Validate'}
                      </button>
                      <button
                        type="button"
                        onClick={handleAddModalClose}
                        className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Confirm Add Modal */}
            {showConfirmModal && validatedStudent && (
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Team Member</h3>

                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-gray-700">Name</div>
                        <div className="text-gray-900">{validatedStudent.full_name}</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">Enrollment</div>
                        <div className="text-gray-900">{validatedStudent.enrollment_no}</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">Department</div>
                        <div className="text-gray-900">{validatedStudent.department}</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">Year/Semester</div>
                        <div className="text-gray-900">{validatedStudent.semester}</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">Email</div>
                        <div className="text-gray-900">{validatedStudent.email}</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">Phone</div>
                        <div className="text-gray-900">{validatedStudent.mobile_no}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={confirmAddMember}
                      disabled={isAdding}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {isAdding ? 'Adding...' : 'Confirm & Add'}
                    </button>
                    <button
                      onClick={handleConfirmModalClose}
                      disabled={isAdding}
                      className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      Back
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Remove Member Modal */}
            {showRemoveModal && removeTarget && (
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Remove Team Member</h3>
                  <p className="text-gray-600 mb-6">
                    Are you sure you want to remove <strong>{removeTarget.name}</strong> from the team?
                    This action cannot be undone.
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={confirmRemoveMember}
                      disabled={isRemoving}
                      className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {isRemoving ? 'Removing...' : 'Remove'}
                    </button>
                    <button
                      onClick={handleRemoveModalClose}
                      disabled={isRemoving}
                      className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Cancel Registration Modal */}
            {showCancelModal && (
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                  <div className="text-center">
                    <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                      <i className="fas fa-exclamation-triangle text-red-600 text-2xl"></i>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancel Team Registration</h3>
                    <p className="text-gray-600 mb-6">
                      Are you sure you want to cancel your team registration for this event?
                      This will remove all team members and cannot be undone.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={cancelRegistration}
                      disabled={isCancelling}
                      className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {isCancelling ? 'Cancelling...' : 'Yes, Cancel Registration'}
                    </button>
                    <button
                      onClick={handleCancelModalClose}
                      disabled={isCancelling}
                      className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      Keep Registration
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Team Status Modal - Enhanced for event lifecycle */}
            {showTeamStatusModal && (
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-gray-900">Detailed Team Status</h3>
                    <button
                      onClick={() => setShowTeamStatusModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <i className="fas fa-times text-xl"></i>
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Team Overview */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-3">Team Overview</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-blue-700 font-medium">Members</div>
                          <div className="text-blue-900">{teamRegistration.team_size}</div>
                        </div>
                        <div>
                          <div className="text-blue-700 font-medium">Overall Progress</div>
                          <div className="text-blue-900">
                            {Math.round(((attendanceCount + feedbackCount + certificateCount) / (teamRegistration.team_size * 3)) * 100)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-blue-700 font-medium">Status</div>
                          <div className="text-blue-900 capitalize">{teamRegistration.status}</div>
                        </div>
                      </div>
                    </div>

                    {/* Attendance Summary */}
                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="font-semibold text-green-900 mb-3">Attendance Summary</h4>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-green-700 font-medium">Attended</div>
                          <div className="text-green-900">{attendanceCount}</div>
                        </div>
                        <div>
                          <div className="text-green-700 font-medium">Pending</div>
                          <div className="text-green-900">{teamRegistration.team_size - attendanceCount}</div>
                        </div>
                        <div>
                          <div className="text-green-700 font-medium">Rate</div>
                          <div className="text-green-900">{Math.round((attendanceCount / teamRegistration.team_size) * 100)}%</div>
                        </div>
                        <div>
                          <div className="text-green-700 font-medium">Status</div>
                          <div className="text-green-900">
                            {teamStatus?.attendance_available ? 'Available' : 'Closed'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Feedback Summary */}
                    <div className="bg-purple-50 rounded-lg p-4">
                      <h4 className="font-semibold text-purple-900 mb-3">Feedback Summary</h4>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-purple-700 font-medium">Submitted</div>
                          <div className="text-purple-900">{feedbackCount}</div>
                        </div>
                        <div>
                          <div className="text-purple-700 font-medium">Pending</div>
                          <div className="text-purple-900">{teamRegistration.team_size - feedbackCount}</div>
                        </div>
                        <div>
                          <div className="text-purple-700 font-medium">Rate</div>
                          <div className="text-purple-900">{Math.round((feedbackCount / teamRegistration.team_size) * 100)}%</div>
                        </div>
                        <div>
                          <div className="text-purple-700 font-medium">Status</div>
                          <div className="text-purple-900">
                            {teamStatus?.feedback_available ? 'Available' : 'Closed'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Certificate Summary */}
                    <div className="bg-orange-50 rounded-lg p-4">
                      <h4 className="font-semibold text-orange-900 mb-3">Certificate Summary</h4>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-orange-700 font-medium">Issued</div>
                          <div className="text-orange-900">{certificateCount}</div>
                        </div>
                        <div>
                          <div className="text-orange-700 font-medium">Pending</div>
                          <div className="text-orange-900">{teamRegistration.team_size - certificateCount}</div>
                        </div>
                        <div>
                          <div className="text-orange-700 font-medium">Rate</div>
                          <div className="text-orange-900">{Math.round((certificateCount / teamRegistration.team_size) * 100)}%</div>
                        </div>
                        <div>
                          <div className="text-orange-700 font-medium">Status</div>
                          <div className="text-orange-900">
                            {teamStatus?.certificates_available ? 'Available' : 'Processing'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Individual Member Status */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Individual Member Status</h4>
                      <div className="space-y-3">
                        {/* Team Leader */}
                        {teamRegistration.team_leader && (
                          <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-l-blue-500">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <div className="font-medium text-gray-900 flex items-center">
                                  <i className="fas fa-crown text-blue-600 mr-2"></i>
                                  {teamRegistration.team_leader.name}
                                </div>
                                <div className="text-sm text-gray-600">{teamRegistration.team_leader.enrollment_no}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium text-gray-900">
                                  {Math.round(((teamRegistration.team_leader.attendance?.marked ? 1 : 0) +
                                    (teamRegistration.team_leader.feedback?.submitted ? 1 : 0) +
                                    (teamRegistration.team_leader.certificate?.issued ? 1 : 0)) / 3 * 100)}% Complete
                                </div>
                                <div className="text-xs text-gray-500">Team Leader</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-xs">
                              <div className={`text-center p-2 rounded ${teamRegistration.team_leader.attendance?.marked ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                                }`}>
                                <div>Attendance</div>
                                <div className="font-medium">{teamRegistration.team_leader.attendance?.marked ? 'Marked' : 'Pending'}</div>
                              </div>
                              <div className={`text-center p-2 rounded ${teamRegistration.team_leader.feedback?.submitted ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'
                                }`}>
                                <div>Feedback</div>
                                <div className="font-medium">{teamRegistration.team_leader.feedback?.submitted ? 'Submitted' : 'Pending'}</div>
                              </div>
                              <div className={`text-center p-2 rounded ${teamRegistration.team_leader.certificate?.issued ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-600'
                                }`}>
                                <div>Certificate</div>
                                <div className="font-medium">{teamRegistration.team_leader.certificate?.issued ? 'Issued' : 'Pending'}</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Team Members */}
                        {teamRegistration.members && teamRegistration.members.map((member, index) => (
                          <div key={member.id || index} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <div className="font-medium text-gray-900">{member.name}</div>
                                <div className="text-sm text-gray-600">{member.enrollment_no}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium text-gray-900">
                                  {Math.round(((member.attendance?.marked ? 1 : 0) +
                                    (member.feedback?.submitted ? 1 : 0) +
                                    (member.certificate?.issued ? 1 : 0)) / 3 * 100)}% Complete
                                </div>
                                <div className="text-xs text-gray-500">Member</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-xs">
                              <div className={`text-center p-2 rounded ${member.attendance?.marked ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                                }`}>
                                <div>Attendance</div>
                                <div className="font-medium">{member.attendance?.marked ? 'Marked' : 'Pending'}</div>
                              </div>
                              <div className={`text-center p-2 rounded ${member.feedback?.submitted ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'
                                }`}>
                                <div>Feedback</div>
                                <div className="font-medium">{member.feedback?.submitted ? 'Submitted' : 'Pending'}</div>
                              </div>
                              <div className={`text-center p-2 rounded ${member.certificate?.issued ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-600'
                                }`}>
                                <div>Certificate</div>
                                <div className="font-medium">{member.certificate?.issued ? 'Issued' : 'Pending'}</div>
                              </div>
                            </div>
                          </div>
                        ))}
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

            {/* Click outside to close team management dropdown */}
            {showTeamManagementDropdown && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowTeamManagementDropdown(false)}
              ></div>
            )}
          </div>
        </div>
      )}

      {/* Enhanced Team Management Modals */}
      {showTaskModal && teamRegistration && (
        <TaskManagementModal
          eventId={eventId}
          teamId={teamRegistration?.registration_id}
          teamMembers={getTeamMembersForModal()}
          onClose={() => setShowTaskModal(false)}
          onSuccess={handleTaskModalSuccess}
        />
      )}

      {showRoleModal && teamRegistration && (
        <RoleAssignmentModal
          eventId={eventId}
          teamId={teamRegistration?.registration_id}
          teamMembers={getTeamMembersForModal()}
          onClose={() => setShowRoleModal(false)}
          onSuccess={handleRoleModalSuccess}
        />
      )}

      {showReportModal && teamRegistration && (
        <ReportGenerationModal
          eventId={eventId}
          teamId={teamRegistration?.registration_id}
          teamData={teamRegistration}
          onClose={() => setShowReportModal(false)}
          onSuccess={handleReportModalSuccess}
        />
      )}

      {/* Member Tasks Modal */}
      {showMemberTasksModal && selectedMemberTasks && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Tasks for {selectedMemberTasks.member.name}</h2>
                  <p className="text-blue-100">
                    {selectedMemberTasks.member.role} • {selectedMemberTasks.tasks.length} task(s) assigned
                  </p>
                </div>
                <button
                  onClick={() => setShowMemberTasksModal(false)}
                  className="text-white hover:text-blue-200 transition-colors"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {/* Team Leader Notifications */}
              {isTeamLeader() && selectedMemberTasks.tasks.length > 0 && (
                <div className="mb-6">
                  {(() => {
                    const submittedTasks = selectedMemberTasks.tasks.filter(t => t.status === 'submitted');
                    const needsRevisionTasks = selectedMemberTasks.tasks.filter(t => t.review_status === 'needs_revision');
                    
                    if (submittedTasks.length > 0 || needsRevisionTasks.length > 0) {
                      return (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <i className="fas fa-exclamation-circle text-purple-600"></i>
                            <h4 className="font-semibold text-purple-800">Team Leader Actions Required</h4>
                          </div>
                          {submittedTasks.length > 0 && (
                            <p className="text-sm text-purple-700 mb-1">
                              • {submittedTasks.length} task(s) submitted and awaiting your review
                            </p>
                          )}
                          {needsRevisionTasks.length > 0 && (
                            <p className="text-sm text-purple-700">
                              • {needsRevisionTasks.length} task(s) need revision after your feedback
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
              
              {selectedMemberTasks.tasks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-tasks text-gray-400 text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks assigned</h3>
                  <p className="text-gray-600">
                    {selectedMemberTasks.member.name} doesn't have any tasks assigned yet.
                  </p>
                  {isTeamLeader() && (
                    <button
                      onClick={() => {
                        setShowMemberTasksModal(false);
                        setShowTaskModal(true);
                      }}
                      className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <i className="fas fa-plus mr-2"></i>
                      Assign New Task
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedMemberTasks.tasks.map((task, index) => (
                    <div key={task.id || index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-lg font-semibold text-gray-900">{task.title}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              task.priority === 'high' ? 'bg-red-100 text-red-800' :
                              task.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {task.priority} priority
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              task.status === 'completed' ? 'bg-green-100 text-green-800' :
                              task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              task.status === 'submitted' ? 'bg-indigo-100 text-indigo-800' :
                              task.status === 'under_review' ? 'bg-purple-100 text-purple-800' :
                              task.status === 'paused' ? 'bg-orange-100 text-orange-800' :
                              task.status === 'blocked' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {task.status?.replace('_', ' ') || 'pending'}
                            </span>
                          </div>
                          
                          {task.description && (
                            <p className="text-gray-600 mb-3">{task.description}</p>
                          )}
                          
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <i className="fas fa-tag"></i>
                              <span className="capitalize">{task.category}</span>
                            </div>
                            {task.deadline && (
                              <div className="flex items-center gap-1">
                                <i className="fas fa-calendar"></i>
                                <span>Due: {new Date(task.deadline).toLocaleDateString()}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <i className="fas fa-clock"></i>
                              <span>Created: {new Date(task.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          
                          {/* Submission Link Display */}
                          {task.submission_link && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-blue-800 mb-1">Submitted Work:</p>
                                  <a
                                    href={task.submission_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline text-sm flex items-center gap-1"
                                  >
                                    <i className="fas fa-external-link-alt text-xs"></i>
                                    {task.submission_link}
                                  </a>
                                  {task.submission_notes && (
                                    <p className="text-sm text-gray-600 mt-1">Notes: {task.submission_notes}</p>
                                  )}
                                  {task.submitted_at && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      Submitted: {new Date(task.submitted_at).toLocaleString()}
                                    </p>
                                  )}
                                </div>
                                
                                {/* Review Button for Team Leader */}
                                {task.status === 'submitted' && isTeamLeader() && (
                                  <button
                                    onClick={() => openTaskReviewModal(task)}
                                    className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center gap-1 shadow-md"
                                  >
                                    <i className="fas fa-eye text-xs"></i>
                                    Review Task
                                  </button>
                                )}
                                
                                {/* Show review button for all submitted tasks if you're team leader */}
                                {task.status === 'submitted' && !isTeamLeader() && (
                                  <span className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm flex items-center gap-1">
                                    <i className="fas fa-clock text-xs"></i>
                                    Awaiting Review
                                  </span>
                                )}
                              </div>
                              
                              {/* Review Status and Notes */}
                              {task.review_status && task.review_status !== 'pending' && (
                                <div className="mt-2 pt-2 border-t border-blue-200">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      task.review_status === 'approved' ? 'bg-green-100 text-green-800' :
                                      task.review_status === 'rejected' ? 'bg-red-100 text-red-800' :
                                      'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {task.review_status === 'approved' ? '✅ Approved' :
                                       task.review_status === 'rejected' ? '❌ Rejected' :
                                       '🔄 Needs Revision'}
                                    </span>
                                    {task.reviewed_at && (
                                      <span className="text-xs text-gray-500">
                                        {new Date(task.reviewed_at).toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                  {task.review_notes && (
                                    <p className="text-sm text-gray-700">
                                      <strong>Review Notes:</strong> {task.review_notes}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Task Action Buttons */}
                        <div className="mt-3 flex items-center gap-2">
                          {task.status === 'submitted' && isTeamLeader() && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => openTaskReviewModal(task)}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center gap-2"
                              >
                                <i className="fas fa-eye"></i>
                                Review & Approve
                              </button>
                              <button
                                onClick={() => quickApproveTask(task, 'approved', 'Quick approval by team leader')}
                                disabled={reviewLoading}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm flex items-center gap-2"
                              >
                                <i className="fas fa-check"></i>
                                Quick Approve
                              </button>
                            </div>
                          )}
                          
                          {task.status === 'submitted' && !isTeamLeader() && (
                            <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm flex items-center gap-2">
                              <i className="fas fa-clock"></i>
                              Waiting for team leader review
                            </span>
                          )}
                          
                          {task.status === 'completed' && (
                            <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm flex items-center gap-2">
                              <i className="fas fa-check-circle"></i>
                              Task Completed
                            </span>
                          )}
                          
                          {(task.status === 'pending' || task.status === 'in_progress') && isTeamLeader() && (
                            <button
                              onClick={() => quickApproveTask(task, 'approved', 'Completed by team leader')}
                              disabled={reviewLoading}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm flex items-center gap-2"
                            >
                              <i className="fas fa-check"></i>
                              Mark Complete
                            </button>
                          )}
                          
                          {task.review_status === 'needs_revision' && (
                            <span className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm flex items-center gap-2">
                              <i className="fas fa-edit"></i>
                              Needs Revision - Resubmit Required
                            </span>
                          )}
                          
                          {task.review_status === 'rejected' && (
                            <span className="px-4 py-2 bg-red-100 text-red-800 rounded-lg text-sm flex items-center gap-2">
                              <i className="fas fa-times-circle"></i>
                              Rejected - Task Reset to Pending
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <div className={`w-3 h-3 rounded-full ${
                            task.status === 'completed' ? 'bg-green-500' :
                            task.status === 'in_progress' ? 'bg-blue-500' :
                            'bg-gray-400'
                          }`}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Total: {selectedMemberTasks.tasks.length} task(s) • 
                Completed: {selectedMemberTasks.tasks.filter(t => t.status === 'completed').length} • 
                Submitted: {selectedMemberTasks.tasks.filter(t => t.status === 'submitted').length} • 
                In Progress: {selectedMemberTasks.tasks.filter(t => t.status === 'in_progress').length} • 
                Pending: {selectedMemberTasks.tasks.filter(t => !t.status || t.status === 'pending').length}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowMemberTasksModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                {isTeamLeader() && (
                  <button
                    onClick={() => {
                      setShowMemberTasksModal(false);
                      setShowTaskModal(true);
                    }}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <i className="fas fa-plus mr-2"></i>
                    Assign New Task
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Task Review Modal */}
      {showTaskReviewModal && reviewingTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Review Task Submission</h3>
                  <p className="text-purple-100 mt-1">{reviewingTask.title}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-purple-200">
                    <span>Status: {reviewingTask.status}</span>
                    {reviewingTask.submitted_at && (
                      <span>Submitted: {new Date(reviewingTask.submitted_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={closeTaskReviewModal}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Task Details */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">Task Details:</h4>
                <p className="text-gray-700 mb-2"><strong>Category:</strong> {reviewingTask.category}</p>
                {reviewingTask.description && (
                  <p className="text-gray-700 mb-2"><strong>Description:</strong> {reviewingTask.description}</p>
                )}
                <p className="text-gray-700 mb-2"><strong>Priority:</strong> {reviewingTask.priority}</p>
                <p className="text-gray-700"><strong>Assigned To:</strong> {reviewingTask.assigned_to?.join(', ')}</p>
              </div>
              
              {/* Submission Details - Enhanced Display */}
              {reviewingTask.status === 'submitted' && (
                <div className="mb-6">
                  {reviewingTask.submission_link ? (
                    <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <i className="fas fa-check-circle text-green-600"></i>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-green-800 mb-2">📎 Submitted Work</h4>
                          <div className="space-y-2">
                            <a
                              href={reviewingTask.submission_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400 transition-colors"
                            >
                              <i className="fas fa-external-link-alt"></i>
                              <span className="font-medium">View Submission</span>
                            </a>
                            <p className="text-sm text-green-600 break-all">{reviewingTask.submission_link}</p>
                          </div>
                          
                          {reviewingTask.submission_notes && (
                            <div className="mt-3 p-3 bg-white rounded-lg border border-green-200">
                              <p className="text-sm font-medium text-green-700 mb-1">📝 Submission Notes:</p>
                              <p className="text-sm text-green-600">{reviewingTask.submission_notes}</p>
                            </div>
                          )}
                          
                          <div className="mt-2 flex items-center gap-4 text-xs text-green-500">
                            {reviewingTask.submitted_by && (
                              <span>👤 Submitted by: {reviewingTask.submitted_by}</span>
                            )}
                            {reviewingTask.submitted_at && (
                              <span>🕒 {new Date(reviewingTask.submitted_at).toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                      <div className="flex items-center gap-3">
                        <i className="fas fa-exclamation-triangle text-yellow-600"></i>
                        <div>
                          <h4 className="font-semibold text-yellow-800">⚠️ No Submission Link Found</h4>
                          <p className="text-sm text-yellow-600">This task is marked as submitted but no submission link was provided.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Review Form - Only show for submitted tasks */}
              {reviewingTask.status === 'submitted' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Review Decision <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={reviewStatus}
                      onChange={(e) => setReviewStatus(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="approved">✅ Approved - Task Complete</option>
                      <option value="needs_revision">🔄 Needs Revision</option>
                      <option value="rejected">❌ Rejected - Start Over</option>
                    </select>
                  </div>
                
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Review Notes
                    </label>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Provide feedback on the submitted work..."
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-600 text-center">
                    This task has not been submitted yet and cannot be reviewed.
                  </p>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={closeTaskReviewModal}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  {reviewingTask.status === 'submitted' ? 'Cancel' : 'Close'}
                </button>
                {reviewingTask.status === 'submitted' && (
                  <button
                    onClick={submitTaskReview}
                    disabled={reviewLoading}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {reviewLoading ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Reviewing...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check"></i>
                        Submit Review
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};


export default TeamManagement;
