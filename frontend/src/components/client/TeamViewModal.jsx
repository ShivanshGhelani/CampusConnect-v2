import React, { useState, useEffect, useCallback } from 'react';
import { clientAPI } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const TeamViewModal = ({ isOpen, onClose, eventId, teamId, teamData }) => {
  const { user } = useAuth();
  const [teamRegistration, setTeamRegistration] = useState(null);
  const [memberTasks, setMemberTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [memberRoles, setMemberRoles] = useState({});
  const [loading, setLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState('');
  const [taskUpdateLoading, setTaskUpdateLoading] = useState({});
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  
  // New states for task submission modal
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [submissionLink, setSubmissionLink] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [submissionLoading, setSubmissionLoading] = useState(false);
  
  // New states for task review modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewStatus, setReviewStatus] = useState('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  // Show notification
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  const loadTeamData = useCallback(async () => {
    if (!eventId) return;

    setLoading(true);
    setError('');

    try {
      console.log('TeamViewModal: Loading team data for eventId:', eventId);
      
      // Get team registration data
      const registrationResponse = await clientAPI.getRegistrationStatus(eventId);
      console.log('TeamViewModal: Registration response:', registrationResponse);

      // Handle different response structures
      let teamReg = null;
      
      if (registrationResponse.data?.success) {
        // Check for different possible data structures
        if (registrationResponse.data?.data?.team_registration) {
          teamReg = registrationResponse.data.data.team_registration;
        } else if (registrationResponse.data?.data && registrationResponse.data.data.registration_type === 'team') {
          teamReg = registrationResponse.data.data;
        } else if (registrationResponse.data?.team_registration) {
          teamReg = registrationResponse.data.team_registration;
        } else if (registrationResponse.data?.registration_type === 'team') {
          teamReg = registrationResponse.data;
        }
      }

      console.log('TeamViewModal: Processed team registration:', teamReg);

      if (teamReg) {
        setTeamRegistration(teamReg);

        // Load team roles and tasks separately using the team-tools API
        try {
          // Get team roles
          const rolesResponse = await clientAPI.getTeamRoles(eventId);
          console.log('TeamViewModal: Roles response:', rolesResponse);
          console.log('TeamViewModal: Roles response.data:', rolesResponse.data);
          
          let teamRoles = {};
          if (rolesResponse.data?.success && rolesResponse.data?.roles) {
            // Handle roles array format: roles: [{enrollment_no: "...", role: "...", ...}, ...]
            const rolesArray = rolesResponse.data.roles;
            console.log('TeamViewModal: Processing roles array:', rolesArray);
            
            teamRoles = {};
            rolesArray.forEach(roleItem => {
              console.log('TeamViewModal: Processing role item:', roleItem);
              
              if (roleItem.enrollment_no || roleItem.member_enrollment) {
                const enrollmentNo = roleItem.enrollment_no || roleItem.member_enrollment;
                
                // Handle different possible field names for the role
                const roleValue = roleItem.role || roleItem.role_name || roleItem.assigned_role || roleItem.position;
                
                teamRoles[enrollmentNo] = {
                  role: roleValue,
                  description: roleItem.description,
                  permissions: roleItem.permissions || [],
                  assigned_by: roleItem.assigned_by,
                  assigned_at: roleItem.assigned_at
                };
                
                console.log('TeamViewModal: Added role for', enrollmentNo, ':', teamRoles[enrollmentNo]);
              }
            });
          } else if (rolesResponse.data?.success) {
            // Handle other possible structures
            teamRoles = rolesResponse.data?.data?.team_roles || rolesResponse.data?.team_roles || {};
          } else if (rolesResponse.data?.team_roles) {
            teamRoles = rolesResponse.data.team_roles;
          } else if (rolesResponse.data) {
            // Sometimes the data might be directly in the response
            teamRoles = rolesResponse.data;
          }
          
          setMemberRoles(teamRoles);
          console.log('TeamViewModal: Team roles processed and set:', teamRoles);

          // Get team tasks
          const tasksResponse = await clientAPI.getTeamTasks(eventId);
          console.log('TeamViewModal: Tasks response:', tasksResponse);
          console.log('TeamViewModal: Tasks response.data:', tasksResponse.data);
          
          let allTeamTasks = [];
          if (tasksResponse.data?.success && tasksResponse.data?.tasks) {
            // Handle tasks array format: tasks: [{task_id: "...", title: "...", ...}, ...]
            allTeamTasks = tasksResponse.data.tasks;
          } else if (tasksResponse.data?.success) {
            // Handle other possible structures
            allTeamTasks = tasksResponse.data?.data?.tasks || tasksResponse.data?.tasks || [];
          } else if (tasksResponse.data?.tasks) {
            allTeamTasks = tasksResponse.data.tasks;
          } else if (Array.isArray(tasksResponse.data)) {
            // Sometimes the data might be directly an array
            allTeamTasks = tasksResponse.data;
          }
          
          setAllTasks(allTeamTasks);
          console.log('TeamViewModal: All tasks processed and set:', allTeamTasks);
          
          // Filter tasks for current user
          const userTasks = allTeamTasks.filter(task => 
            task.assigned_to && Array.isArray(task.assigned_to) && task.assigned_to.includes(user.enrollment_no)
          );
          setMemberTasks(userTasks);
          console.log('TeamViewModal: User tasks filtered and set:', userTasks, 'for user:', user.enrollment_no);
        } catch (apiError) {
          console.error('TeamViewModal: Error loading roles/tasks:', apiError);
          // Don't fail the whole modal for roles/tasks errors
          // Use the data from team registration if available
          const teamRoles = teamReg.team_roles || {};
          const allTeamTasks = teamReg.tasks || [];
          
          setMemberRoles(teamRoles);
          setAllTasks(allTeamTasks);
          
          const userTasks = allTeamTasks.filter(task => 
            task.assigned_to && Array.isArray(task.assigned_to) && task.assigned_to.includes(user.enrollment_no)
          );
          setMemberTasks(userTasks);
          
          console.log('TeamViewModal: Using fallback data - roles:', teamRoles, 'tasks:', userTasks);
        }
      } else {
        console.log('TeamViewModal: No team registration found in response');
        setError('No team registration found for this event');
      }

    } catch (error) {
      console.error('TeamViewModal: Error loading team data:', error);
      setError(`Failed to load team data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [eventId, user.enrollment_no]); // useCallback dependency array

  // Load team data when modal opens
  useEffect(() => {
    if (isOpen && eventId && !hasLoadedOnce) {
      setHasLoadedOnce(true);
      loadTeamData();
    } else if (!isOpen) {
      setHasLoadedOnce(false);
    }
  }, [isOpen, eventId, loadTeamData, hasLoadedOnce]);

  // Smart task submission flow
  const openSubmissionModal = (task) => {
    setSelectedTask(task);
    setSubmissionLink('');
    setSubmissionNotes('');
    setShowSubmissionModal(true);
  };

  const closeSubmissionModal = () => {
    setShowSubmissionModal(false);
    setSelectedTask(null);
    setSubmissionLink('');
    setSubmissionNotes('');
  };

  // Smart task review flow
  const openReviewModal = (task) => {
    setSelectedTask(task);
    setReviewStatus('approved');
    setReviewNotes('');
    setShowReviewModal(true);
  };

  const closeReviewModal = () => {
    setShowReviewModal(false);
    setSelectedTask(null);
    setReviewStatus('approved');
    setReviewNotes('');
  };

  // Get smart link suggestions based on task category
  const getLinkSuggestions = (category) => {
    const suggestions = {
      presentation: [
        { label: 'Google Slides', placeholder: 'https://docs.google.com/presentation/d/...' },
        { label: 'PowerPoint Online', placeholder: 'https://1drv.ms/p/...' },
        { label: 'Canva Presentation', placeholder: 'https://www.canva.com/design/...' },
        { label: 'Prezi', placeholder: 'https://prezi.com/view/...' }
      ],
      development: [
        { label: 'GitHub Repository', placeholder: 'https://github.com/username/repository' },
        { label: 'GitLab Project', placeholder: 'https://gitlab.com/username/project' },
        { label: 'Bitbucket Repo', placeholder: 'https://bitbucket.org/username/repository' },
        { label: 'CodePen', placeholder: 'https://codepen.io/username/pen/...' }
      ],
      design: [
        { label: 'Figma Design', placeholder: 'https://www.figma.com/file/...' },
        { label: 'Adobe XD', placeholder: 'https://xd.adobe.com/view/...' },
        { label: 'Sketch Cloud', placeholder: 'https://www.sketch.com/s/...' },
        { label: 'InVision Prototype', placeholder: 'https://projects.invisionapp.com/...' }
      ],
      documentation: [
        { label: 'Google Docs', placeholder: 'https://docs.google.com/document/d/...' },
        { label: 'Notion Page', placeholder: 'https://www.notion.so/...' },
        { label: 'Confluence', placeholder: 'https://your-domain.atlassian.net/wiki/...' },
        { label: 'GitBook', placeholder: 'https://your-team.gitbook.io/...' }
      ],
      research: [
        { label: 'Google Drive Folder', placeholder: 'https://drive.google.com/drive/folders/...' },
        { label: 'Dropbox Folder', placeholder: 'https://www.dropbox.com/sh/...' },
        { label: 'OneDrive Folder', placeholder: 'https://1drv.ms/f/...' },
        { label: 'Research Document', placeholder: 'https://docs.google.com/document/d/...' }
      ],
      testing: [
        { label: 'Test Report', placeholder: 'https://docs.google.com/document/d/...' },
        { label: 'Bug Tracking', placeholder: 'https://your-domain.atlassian.net/browse/...' },
        { label: 'Test Results', placeholder: 'https://drive.google.com/file/d/...' },
        { label: 'QA Dashboard', placeholder: 'https://your-testing-tool.com/...' }
      ],
      general: [
        { label: 'Google Drive', placeholder: 'https://drive.google.com/...' },
        { label: 'Dropbox', placeholder: 'https://www.dropbox.com/...' },
        { label: 'OneDrive', placeholder: 'https://1drv.ms/...' },
        { label: 'Custom Link', placeholder: 'https://...' }
      ]
    };
    
    return suggestions[category] || suggestions.general;
  };

  // Submit task with link
  const submitTask = async () => {
    if (!submissionLink.trim()) {
      showNotification('Please provide a submission link', 'error');
      return;
    }

    setSubmissionLoading(true);
    
    try {
      const response = await clientAPI.submitTask(eventId, selectedTask.task_id, {
        submission_link: submissionLink,
        submission_notes: submissionNotes
      });
      
      console.log('TeamViewModal: Task submission response:', response);
      
      // Reload team data to reflect changes
      await loadTeamData();
      showNotification('Task submitted successfully! Waiting for team leader review.', 'success');
      closeSubmissionModal();
      
    } catch (error) {
      console.error('TeamViewModal: Error submitting task:', error);
      showNotification(`Failed to submit task: ${error.message}`, 'error');
    } finally {
      setSubmissionLoading(false);
    }
  };

  // Review task (team leader only)
  const reviewTask = async () => {
    setReviewLoading(true);
    
    try {
      const response = await clientAPI.reviewTask(eventId, selectedTask.task_id, {
        review_status: reviewStatus,
        review_notes: reviewNotes
      });
      
      console.log('TeamViewModal: Task review response:', response);
      
      // Reload team data to reflect changes
      await loadTeamData();
      showNotification(`Task ${reviewStatus === 'approved' ? 'approved' : reviewStatus === 'rejected' ? 'rejected' : 'needs revision'}!`, 'success');
      closeReviewModal();
      
    } catch (error) {
      console.error('TeamViewModal: Error reviewing task:', error);
      showNotification(`Failed to review task: ${error.message}`, 'error');
    } finally {
      setReviewLoading(false);
    }
  };

  // Check if user is team leader
  const isTeamLeader = () => {
    return teamRegistration?.team?.team_leader === user.enrollment_no;
  };

  // Update task status (simplified for basic status changes)
  const updateTaskStatus = async (taskId, newStatus) => {
    setTaskUpdateLoading(prev => ({ ...prev, [taskId]: true }));
    
    try {
      console.log('TeamViewModal: Updating task status:', taskId, 'to', newStatus);
      
      if (newStatus === 'submit') {
        // Open submission modal instead of direct completion
        const task = allTasks.find(t => t.task_id === taskId) || memberTasks.find(t => t.task_id === taskId);
        if (task) {
          openSubmissionModal(task);
        }
        return;
      }
      
      if (newStatus === 'review') {
        // Open review modal for team leader
        const task = allTasks.find(t => t.task_id === taskId) || memberTasks.find(t => t.task_id === taskId);
        if (task) {
          openReviewModal(task);
        }
        return;
      }
      
      if (newStatus === 'completed') {
        // Direct completion (team leader only)
        if (!isTeamLeader()) {
          showNotification('Only team leaders can directly complete tasks', 'error');
          return;
        }
        
        const response = await clientAPI.completeTask(eventId, taskId);
        console.log('TeamViewModal: Task completion response:', response);
      } else {
        // For other status updates, simulate locally (until backend supports general updates)
        setAllTasks(prev => prev.map(task => 
          task.task_id === taskId ? { ...task, status: newStatus } : task
        ));
        setMemberTasks(prev => prev.map(task => 
          task.task_id === taskId ? { ...task, status: newStatus } : task
        ));
        
        showNotification(`Task status updated to ${newStatus.replace('_', ' ')}`, 'success');
        return;
      }
      
      // Reload team data to reflect changes from backend
      await loadTeamData();
      showNotification('Task updated successfully!', 'success');
      
    } catch (error) {
      console.error('TeamViewModal: Error updating task:', error);
      setError(`Failed to update task status: ${error.message}`);
    } finally {
      setTaskUpdateLoading(prev => ({ ...prev, [taskId]: false }));
    }
  };

  // Get member role
  const getMemberRole = (enrollmentNo) => {
    console.log('TeamViewModal: Getting role for enrollment:', enrollmentNo);
    console.log('TeamViewModal: Available member roles:', memberRoles);
    
    // Check roles from API first
    const role = memberRoles[enrollmentNo];
    console.log('TeamViewModal: Found role for', enrollmentNo, ':', role);
    
    if (role) {
      return {
        role: role.role || 'Team Member',
        description: role.description || 'Contributing team member'
      };
    }
    
    // Check if team leader
    if (teamRegistration?.team?.team_leader === enrollmentNo) {
      return { role: 'Team Leader', description: 'Leads and coordinates the team' };
    }
    
    // Default fallback
    return { role: 'Team Member', description: 'Contributing team member' };
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'submitted': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'under_review': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'paused': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'blocked': return 'bg-red-100 text-red-800 border-red-200';
      case 'review_requested': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold mb-2">Team Overview</h2>
              <p className="text-purple-100">
                {teamRegistration?.team?.team_name || teamData?.teamName || 'Team Details'} - {teamRegistration?.event?.event_name || teamData?.eventName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-purple-200 transition-colors"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>

        {/* Notification */}
        {notification.show && (
          <div className={`absolute top-4 right-4 z-10 px-4 py-2 rounded-lg shadow-lg ${
            notification.type === 'success' 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          } flex items-center gap-2`}>
            <i className={`fas ${notification.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
            {notification.message}
          </div>
        )}

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <i className="fas fa-spinner fa-spin text-3xl text-purple-600 mb-4"></i>
                <p className="text-gray-600">Loading team data...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <i className="fas fa-exclamation-circle text-red-600 text-xl mb-2"></i>
              <p className="text-red-800">{error}</p>
              <button 
                onClick={loadTeamData}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : teamRegistration ? (
            <div className="space-y-8">
              {/* Team Members Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <i className="fas fa-users text-purple-600"></i>
                  Team Members & Roles
                </h3>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registration ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {teamRegistration.team_members?.map((member, index) => {
                        const memberRole = getMemberRole(member.student.enrollment_no);
                        return (
                          <tr key={index} className={member.student.enrollment_no === user.enrollment_no ? 'bg-blue-50' : ''}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                  member.is_team_leader ? 'bg-yellow-100' : 'bg-gray-100'
                                }`}>
                                  <i className={`fas ${member.is_team_leader ? 'fa-crown text-yellow-600' : 'fa-user text-gray-600'}`}></i>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                    {member.student.name}
                                    {member.student.enrollment_no === user.enrollment_no && (
                                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">You</span>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-500">{member.student.enrollment_no}</div>
                                  <div className="text-sm text-gray-500">{member.student.department}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                member.is_team_leader 
                                  ? 'bg-yellow-100 text-yellow-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {member.is_team_leader ? 'Team Leader' : 'Team Member'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  {memberRole.role}
                                </span>
                                {memberRole.description && (
                                  <p className="text-xs text-gray-500 mt-1">{memberRole.description}</p>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                              {member.registration_id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  member.attendance?.marked || member.attendance?.status === 'present' 
                                    ? 'bg-green-500' 
                                    : 'bg-red-500'
                                }`}></div>
                                <span className="text-sm text-gray-600">
                                  {member.attendance?.marked || member.attendance?.status === 'present' ? 'Present' : 'Pending'}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* My Tasks Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <i className="fas fa-tasks text-green-600"></i>
                  My Assigned Tasks ({memberTasks.length})
                </h3>
                {memberTasks.length > 0 ? (
                  <div className="space-y-4">
                    {memberTasks.map((task, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-lg">{task.title}</h4>
                            {task.description && (
                              <p className="text-gray-600 mt-2">{task.description}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2 ml-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(task.priority)}`}>
                              {task.priority} priority
                            </span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(task.status)}`}>
                              {task.status}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <i className="fas fa-folder"></i>
                              {task.category}
                            </span>
                            <span className="flex items-center gap-1">
                              <i className="fas fa-user"></i>
                              Created by {task.created_by}
                            </span>
                            {task.deadline && (
                              <span className="flex items-center gap-1">
                                <i className="fas fa-calendar"></i>
                                Due: {new Date(task.deadline).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          
                          {/* Task Action Buttons */}
                          <div className="flex items-center gap-2">
                            {task.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => updateTaskStatus(task.task_id, 'in_progress')}
                                  disabled={taskUpdateLoading[task.task_id]}
                                  className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm flex items-center gap-1"
                                >
                                  {taskUpdateLoading[task.task_id] ? (
                                    <i className="fas fa-spinner fa-spin"></i>
                                  ) : (
                                    <>
                                      <i className="fas fa-play text-xs"></i>
                                      Start Task
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => updateTaskStatus(task.task_id, 'blocked')}
                                  disabled={taskUpdateLoading[task.task_id]}
                                  className="px-3 py-1 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors text-sm flex items-center gap-1"
                                >
                                  <i className="fas fa-exclamation-triangle text-xs"></i>
                                  Mark Blocked
                                </button>
                              </>
                            )}
                            
                            {task.status === 'in_progress' && (
                              <>
                                <button
                                  onClick={() => updateTaskStatus(task.task_id, 'submit')}
                                  disabled={taskUpdateLoading[task.task_id]}
                                  className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm flex items-center gap-1"
                                >
                                  {taskUpdateLoading[task.task_id] ? (
                                    <i className="fas fa-spinner fa-spin"></i>
                                  ) : (
                                    <>
                                      <i className="fas fa-upload text-xs"></i>
                                      Submit Task
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => updateTaskStatus(task.task_id, 'paused')}
                                  disabled={taskUpdateLoading[task.task_id]}
                                  className="px-3 py-1 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors text-sm flex items-center gap-1"
                                >
                                  <i className="fas fa-pause text-xs"></i>
                                  Pause
                                </button>
                              </>
                            )}
                            
                            {task.status === 'submitted' && (
                              <>
                                {isTeamLeader() ? (
                                  <>
                                    <button
                                      onClick={() => updateTaskStatus(task.task_id, 'review')}
                                      disabled={taskUpdateLoading[task.task_id]}
                                      className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors text-sm flex items-center gap-1"
                                    >
                                      <i className="fas fa-eye text-xs"></i>
                                      Review Task
                                    </button>
                                    <button
                                      onClick={() => updateTaskStatus(task.task_id, 'completed')}
                                      disabled={taskUpdateLoading[task.task_id]}
                                      className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm flex items-center gap-1"
                                    >
                                      <i className="fas fa-check text-xs"></i>
                                      Direct Approve
                                    </button>
                                  </>
                                ) : (
                                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium flex items-center gap-1">
                                    <i className="fas fa-clock text-xs"></i>
                                    Waiting for Review
                                  </span>
                                )}
                                {task.submission_link && (
                                  <a
                                    href={task.submission_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm flex items-center gap-1"
                                  >
                                    <i className="fas fa-external-link-alt text-xs"></i>
                                    View Submission
                                  </a>
                                )}
                              </>
                            )}
                            
                            {task.status === 'under_review' && (
                              <>
                                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium flex items-center gap-1">
                                  <i className="fas fa-hourglass-half text-xs"></i>
                                  Under Review
                                </span>
                                {task.submission_link && (
                                  <a
                                    href={task.submission_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm flex items-center gap-1"
                                  >
                                    <i className="fas fa-external-link-alt text-xs"></i>
                                    View Submission
                                  </a>
                                )}
                              </>
                            )}
                            
                            {task.status === 'paused' && (
                              <>
                                <button
                                  onClick={() => updateTaskStatus(task.task_id, 'in_progress')}
                                  disabled={taskUpdateLoading[task.task_id]}
                                  className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm flex items-center gap-1"
                                >
                                  <i className="fas fa-play text-xs"></i>
                                  Resume
                                </button>
                                <button
                                  onClick={() => updateTaskStatus(task.task_id, 'pending')}
                                  disabled={taskUpdateLoading[task.task_id]}
                                  className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors text-sm flex items-center gap-1"
                                >
                                  <i className="fas fa-undo text-xs"></i>
                                  Reset
                                </button>
                              </>
                            )}
                            
                            {task.status === 'blocked' && (
                              <>
                                <button
                                  onClick={() => updateTaskStatus(task.task_id, 'pending')}
                                  disabled={taskUpdateLoading[task.task_id]}
                                  className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm flex items-center gap-1"
                                >
                                  <i className="fas fa-unlock text-xs"></i>
                                  Unblock
                                </button>
                                <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-lg text-sm font-medium flex items-center gap-1">
                                  <i className="fas fa-exclamation-triangle text-xs"></i>
                                  Blocked - Contact Team Leader
                                </span>
                              </>
                            )}
                            
                            {task.status === 'completed' && (
                              <>
                                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm font-medium flex items-center gap-1">
                                  <i className="fas fa-check-circle text-xs"></i>
                                  Completed
                                </span>
                                {task.submission_link && (
                                  <a
                                    href={task.submission_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm flex items-center gap-1"
                                  >
                                    <i className="fas fa-external-link-alt text-xs"></i>
                                    View Work
                                  </a>
                                )}
                                {task.review_notes && (
                                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm flex items-center gap-1" title={task.review_notes}>
                                    <i className="fas fa-comment text-xs"></i>
                                    Review Notes
                                  </span>
                                )}
                              </>
                            )}
                            
                            {task.status === 'review_requested' && (
                              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-lg text-sm font-medium flex items-center gap-1">
                                <i className="fas fa-eye text-xs"></i>
                                Under Review
                              </span>
                            )}
                            
                            {task.status === 'completed' && (
                              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm font-medium flex items-center gap-1">
                                <i className="fas fa-check text-xs"></i>
                                Completed
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <i className="fas fa-clipboard text-4xl text-gray-400 mb-4"></i>
                    <p className="text-gray-600 text-lg">No tasks assigned to you yet</p>
                    <p className="text-gray-500 text-sm">Tasks will appear here when the team leader assigns them</p>
                  </div>
                )}
              </div>

              {/* Team Registration & Attendance Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Registration Status */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <i className="fas fa-clipboard-list text-blue-600"></i>
                    Registration Status
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Team Registration ID</p>
                      <p className="font-mono font-medium text-gray-900">{teamRegistration.registration_id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Registration Date</p>
                      <p className="font-medium text-gray-900">
                        {new Date(teamRegistration.team?.registered_at || teamRegistration.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Team Size</p>
                      <p className="font-medium text-gray-900">{teamRegistration.team?.team_size || teamRegistration.team_members?.length} members</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {teamRegistration.team?.status || 'Active'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Attendance Overview */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <i className="fas fa-user-check text-green-600"></i>
                    Team Attendance Overview
                  </h4>
                  <div className="space-y-3">
                    {teamRegistration.team_members?.map((member, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">
                          {member.student.name}
                          {member.student.enrollment_no === user.enrollment_no && ' (You)'}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            member.attendance?.marked || member.attendance?.status === 'present' 
                              ? 'bg-green-500' 
                              : 'bg-red-500'
                          }`}></div>
                          <span className="text-sm text-gray-600">
                            {member.attendance?.marked || member.attendance?.status === 'present' ? 'Present' : 'Not Marked'}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div className="border-t pt-3 mt-3">
                      <div className="flex items-center justify-between font-medium">
                        <span className="text-gray-700">Team Attendance Rate</span>
                        <span className="text-gray-900">
                          {teamRegistration.team_members ? 
                            Math.round((teamRegistration.team_members.filter(m => m.attendance?.marked || m.attendance?.status === 'present').length / teamRegistration.team_members.length) * 100) 
                            : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <i className="fas fa-exclamation-triangle text-4xl mb-4"></i>
              <p className="text-lg">No team data available</p>
              <p className="text-sm">Unable to load team information for this event</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
      
      {/* Task Submission Modal */}
      {showSubmissionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Submit Task</h3>
                  <p className="text-blue-100 mt-1">{selectedTask?.title}</p>
                </div>
                <button
                  onClick={closeSubmissionModal}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <i className="fas fa-lightbulb text-yellow-500"></i>
                  Smart Link Suggestions for "{selectedTask?.category || 'general'}" tasks
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {getLinkSuggestions(selectedTask?.category || 'general').map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => setSubmissionLink(suggestion.placeholder)}
                      className="p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="font-medium text-gray-800">{suggestion.label}</div>
                      <div className="text-sm text-gray-500 truncate">{suggestion.placeholder}</div>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Submission Link <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={submissionLink}
                    onChange={(e) => setSubmissionLink(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Provide a link to your completed work (GitHub, Drive, Figma, etc.)
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Submission Notes (Optional)
                  </label>
                  <textarea
                    value={submissionNotes}
                    onChange={(e) => setSubmissionNotes(e.target.value)}
                    placeholder="Add any notes about your submission..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={closeSubmissionModal}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitTask}
                  disabled={!submissionLink.trim() || submissionLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {submissionLoading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-upload"></i>
                      Submit Task
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Task Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Review Task</h3>
                  <p className="text-purple-100 mt-1">{selectedTask?.title}</p>
                </div>
                <button
                  onClick={closeReviewModal}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {selectedTask?.submission_link && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Submitted Work:</h4>
                  <a
                    href={selectedTask.submission_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline flex items-center gap-2"
                  >
                    <i className="fas fa-external-link-alt"></i>
                    {selectedTask.submission_link}
                  </a>
                  {selectedTask.submission_notes && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-700">Notes:</p>
                      <p className="text-sm text-gray-600">{selectedTask.submission_notes}</p>
                    </div>
                  )}
                </div>
              )}
              
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
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={closeReviewModal}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={reviewTask}
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
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamViewModal;
