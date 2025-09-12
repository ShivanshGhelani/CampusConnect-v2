import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  // Lock body scroll when modal is open (especially important for mobile)
  useEffect(() => {
    if (isOpen) {
      
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh';
      
    } else {
      
      document.body.style.overflow = '';
      document.body.style.height = '';
      
    }
    
    // Cleanup on unmount
    return () => {
      
      document.body.style.overflow = '';
      document.body.style.height = '';
    };
  }, [isOpen]);

  // Debug useEffect to track component lifecycle
  useEffect(() => {
    
    
    
    if (isOpen) {
      // Check if modal exists in DOM
      setTimeout(() => {
        const modalElement = document.querySelector('[data-team-modal="true"]');
        
        if (modalElement) {
          const computedStyle = window.getComputedStyle(modalElement);
          console.log('TeamViewModal: Computed styles:', {
            display: computedStyle.display,
            visibility: computedStyle.visibility,
            opacity: computedStyle.opacity,
            zIndex: computedStyle.zIndex,
            position: computedStyle.position,
            top: computedStyle.top,
            left: computedStyle.left,
            width: computedStyle.width,
            height: computedStyle.height
          });
        }
      }, 100);
    }
    
    return () => {
      
    };
  }, [isOpen, eventId, teamId, teamData]);

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
      
      
      
      // Get team registration data
      const registrationResponse = await clientAPI.getRegistrationStatus(eventId);
      

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

      

      // If we don't have team registration but have teamData with reg_id, 
      // this might be a member's individual registration ID - try to find the team
      if (!teamReg && teamData?.reg_id) {
        
        try {
          // Try to get team data using the member registration ID
          const memberTeamResponse = await clientAPI.getTeamByMemberRegistration(eventId, teamData.reg_id);
          
          
          if (memberTeamResponse.data?.success && memberTeamResponse.data?.team_registration) {
            teamReg = memberTeamResponse.data.team_registration;
            
          }
        } catch (memberTeamError) {
          
          // Continue with original approach if this fails
        }
      }

      if (teamReg) {
        // Process the team registration data
        
        
        // Ensure we have the correct structure for team members
        if (teamReg.team_members) {
          teamReg.team_members = teamReg.team_members.map(member => {
            // Ensure each member has the required fields
            return {
              ...member,
              registration_id: member.registration_id || `REG_${member.student?.enrollment_no}_${Date.now()}`,
              student: {
                ...member.student,
                name: member.student?.name || 'Unknown',
                enrollment_no: member.student?.enrollment_no || 'Unknown',
                department: member.student?.department || 'Unknown'
              },
              is_team_leader: member.is_team_leader || false
            };
          });
        }
        
        // Process team roles from the registration data if available
        if (teamReg.team_roles) {
          
          setMemberRoles(teamReg.team_roles);
        }
        
        // Process tasks from the registration data if available
        if (teamReg.tasks) {
          
          setAllTasks(teamReg.tasks);
          
          // Filter tasks for current user
          const userTasks = teamReg.tasks.filter(task => 
            task.assigned_to && Array.isArray(task.assigned_to) && task.assigned_to.includes(user.enrollment_no)
          );
          setMemberTasks(userTasks);
          
        }
        
        setTeamRegistration(teamReg);

        
        
        console.log('TeamViewModal: Available team ID sources:', {
          'teamReg.team?.team_id': teamReg.team?.team_id,
          'teamReg.team_id': teamReg.team_id,
          'teamData?.teamId': teamData?.teamId,
          'teamId prop': teamId
        });

        // Load additional team roles and tasks from API if not in registration data
        if (!teamReg.team_roles || !teamReg.tasks) {
          try {
            // Get team roles if not in registration
            if (!teamReg.team_roles) {
              const rolesResponse = await clientAPI.getTeamRoles(eventId);
              
              
              let teamRoles = {};
              if (rolesResponse.data?.success && rolesResponse.data?.roles) {
                const rolesArray = rolesResponse.data.roles;
                
                
                teamRoles = {};
                rolesArray.forEach(roleItem => {
                  if (roleItem.enrollment_no || roleItem.member_enrollment) {
                    const enrollmentNo = roleItem.enrollment_no || roleItem.member_enrollment;
                    const roleValue = roleItem.role || roleItem.role_name || roleItem.assigned_role || roleItem.position;
                    
                    teamRoles[enrollmentNo] = {
                      role: roleValue,
                      description: roleItem.description,
                      permissions: roleItem.permissions || [],
                      assigned_by: roleItem.assigned_by,
                      assigned_at: roleItem.assigned_at
                    };
                  }
                });
                setMemberRoles(teamRoles);
              }
            }

            // Get team tasks if not in registration
            if (!teamReg.tasks) {
              const tasksResponse = await clientAPI.getTeamTasks(eventId);
              
              
              let allTeamTasks = [];
              if (tasksResponse.data?.success && tasksResponse.data?.tasks) {
                allTeamTasks = tasksResponse.data.tasks;
              } else if (Array.isArray(tasksResponse.data)) {
                allTeamTasks = tasksResponse.data;
              }
              
              setAllTasks(allTeamTasks);
              
              const userTasks = allTeamTasks.filter(task => 
                task.assigned_to && Array.isArray(task.assigned_to) && task.assigned_to.includes(user.enrollment_no)
              );
              setMemberTasks(userTasks);
            }
          } catch (apiError) {
            
          }
        }
      } else {
        
        setError('No team registration found for this event');
      }

    } catch (error) {
      
      setError(`Failed to load team data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [eventId, user.enrollment_no, teamData]); // Added teamData to dependencies

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
      
      
      
      // Reload team data to reflect changes
      await loadTeamData();
      showNotification('Task submitted successfully! Waiting for team leader review.', 'success');
      closeSubmissionModal();
      
    } catch (error) {
      
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
      
      
      
      // Reload team data to reflect changes
      await loadTeamData();
      showNotification(`Task ${reviewStatus === 'approved' ? 'approved' : reviewStatus === 'rejected' ? 'rejected' : 'needs revision'}!`, 'success');
      closeReviewModal();
      
    } catch (error) {
      
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
      
      setError(`Failed to update task status: ${error.message}`);
    } finally {
      setTaskUpdateLoading(prev => ({ ...prev, [taskId]: false }));
    }
  };

  // Get member role
  const getMemberRole = (enrollmentNo) => {
    
    
    
    // Check roles from API first
    const role = memberRoles[enrollmentNo];
    
    
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

  if (!isOpen) {
    
    return null;
  }

  
  
  
  
  
  

  // Use createPortal to render the modal directly to document.body
  const modalContent = (
    <div 
      data-team-modal="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999999,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0, // Remove padding to ensure perfect centering
        visibility: 'visible',
        opacity: 1,
        pointerEvents: 'auto'
      }}
      onClick={(e) => {
        
        // Allow clicking backdrop to close on desktop
        if (e.target === e.currentTarget && typeof window !== 'undefined' && window.innerWidth >= 1024) {
          onClose();
        }
      }}
    >
      <div 
        style={{
          backgroundColor: 'white',
          width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'auto' : '100%',
          height: typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'auto' : '100%',
          maxWidth: typeof window !== 'undefined' && window.innerWidth >= 1024 ? '56rem' : '100%',
          maxHeight: typeof window !== 'undefined' && window.innerWidth >= 1024 ? '90vh' : '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: typeof window !== 'undefined' && window.innerWidth >= 1024 ? '0.75rem' : '0',
          opacity: 1,
          visibility: 'visible',
          position: 'relative',
          zIndex: 1,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          // Add margin for desktop to ensure centering with some breathing room
          margin: typeof window !== 'undefined' && window.innerWidth >= 1024 ? '2rem' : '0'
        }}
        onClick={(e) => {
          
          e.stopPropagation();
        }} // Prevent closing when clicking inside
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 lg:p-6 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <h2 className="text-lg lg:text-xl font-semibold text-gray-900 leading-tight">Team Overview</h2>
            <p className="text-sm lg:text-base text-gray-600 mt-1 truncate">
              {teamRegistration?.team?.team_name || teamData?.teamName || 'Team Details'}
            </p>
            <p className="text-xs lg:text-sm text-gray-500 truncate">
              {teamRegistration?.event?.event_name || teamData?.eventName || 'Event Name'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5 lg:w-6 lg:h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Notification */}
        {notification.show && (
          <div className={`absolute top-4 right-4 z-10 px-4 py-3 rounded-lg shadow-lg text-sm max-w-sm ${
            notification.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          } flex items-center gap-2`}>
            <svg className={`w-4 h-4 flex-shrink-0 ${notification.type === 'success' ? 'text-green-500' : 'text-red-500'}`} fill="currentColor" viewBox="0 0 20 20">
              {notification.type === 'success' ? (
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              )}
            </svg>
            <span className="break-words">{notification.message}</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center h-full min-h-[300px]">
              <div className="text-center">
                <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600 text-lg">Loading team data...</p>
                <p className="text-gray-500 text-sm mt-1">Please wait while we fetch team information</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full min-h-[300px]">
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <p className="text-red-800 text-lg font-medium mb-2">Error Loading Team Data</p>
                <p className="text-red-600 text-sm mb-4">{error}</p>
                <button 
                  onClick={loadTeamData}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : teamRegistration ? (
            <div className="space-y-6 p-4 lg:p-6">
              {/* Team Members Section */}
              <div>
                <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  Team Members ({teamRegistration.team_members?.length || 0})
                </h3>
                
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">{teamRegistration.team_members?.map((member, index) => {
                    const memberRole = getMemberRole(member.student.enrollment_no);
                    const isCurrentUser = member.student.enrollment_no === user.enrollment_no;
                    const isPresent = member.attendance?.marked || member.attendance?.status === 'present';
                    
                    return (
                      <div key={index} className={`flex items-center justify-between p-4 ${
                        index !== teamRegistration.team_members.length - 1 ? 'border-b border-gray-100' : ''
                      } ${isCurrentUser ? 'bg-blue-50' : 'hover:bg-gray-50'} transition-colors`}>
                        
                        {/* Left side - User info */}
                        <div className="flex items-center gap-4 flex-1">
                          {/* Avatar with leader crown or user icon */}
                          <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                              <span className="text-sm">
                                {member.student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                              </span>
                            </div>
                            {member.is_team_leader && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-white">
                                <svg className="w-3 h-3 text-yellow-800" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          
                          {/* Name and details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-gray-900 truncate">{member.student.name}</h4>
                              {isCurrentUser && (
                                <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full font-medium">You</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 font-mono">{member.student.enrollment_no}</p>
                            <p className="text-sm text-gray-500">{member.student.department}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md font-medium">
                                {memberRole.role}
                              </span>
                              <span className="text-xs text-gray-400 font-mono">ID: {member.registration_id}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* My Tasks Section */}
              <div>
                <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  My Tasks ({memberTasks.length})
                </h3>
                {memberTasks.length > 0 ? (
                  <div className="space-y-3">
                    {memberTasks.map((task, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-base">{task.title}</h4>
                            {task.description && (
                              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                            )}
                          </div>
                          <div className="flex gap-2 ml-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(task.status)}`}>
                              {task.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                              </svg>
                              {task.category}
                            </span>
                            {task.deadline && (
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {new Date(task.deadline).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          
                          {/* Task Action Buttons */}
                          <div className="flex items-center gap-2">{task.status === 'pending' && (
                              <button
                                onClick={() => updateTaskStatus(task.task_id, 'in_progress')}
                                disabled={taskUpdateLoading[task.task_id]}
                                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm flex items-center gap-1"
                              >
                                {taskUpdateLoading[task.task_id] ? (
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Start
                                  </>
                                )}
                              </button>
                            )}
                            
                            {task.status === 'in_progress' && (
                              <button
                                onClick={() => updateTaskStatus(task.task_id, 'submit')}
                                disabled={taskUpdateLoading[task.task_id]}
                                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm flex items-center gap-1"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                Submit
                              </button>
                            )}
                            
                            {task.status === 'submitted' && (
                              <>
                                {isTeamLeader() ? (
                                  <button
                                    onClick={() => updateTaskStatus(task.task_id, 'review')}
                                    disabled={taskUpdateLoading[task.task_id]}
                                    className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors text-sm flex items-center gap-1"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    Review
                                  </button>
                                ) : (
                                  <span className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Pending Review
                                  </span>
                                )}
                                {task.submission_link && (
                                  <a
                                    href={task.submission_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm flex items-center gap-1"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    View
                                  </a>
                                )}
                              </>
                            )}
                            
                            {task.status === 'completed' && (
                              <>
                                <span className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  Completed
                                </span>
                                {task.submission_link && (
                                  <a
                                    href={task.submission_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm flex items-center gap-1"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    View
                                  </a>
                                )}
                              </>
                            )}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                    <p className="text-gray-600 text-lg font-medium">No tasks assigned yet</p>
                    <p className="text-gray-500 text-sm mt-1">Tasks will appear here when assigned by your team leader</p>
                  </div>
                )}
              </div>

              {/* Team Statistics */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Statistics</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{teamRegistration.team_members?.length || 0}</p>
                    <p className="text-sm text-blue-700 font-medium">Team Members</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{memberTasks.filter(t => t.status === 'completed').length}</p>
                    <p className="text-sm text-green-700 font-medium">Tasks Complete</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{memberTasks.filter(t => t.status === 'in_progress').length}</p>
                    <p className="text-sm text-yellow-700 font-medium">In Progress</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">
                      {teamRegistration.team_members ? 
                        Math.round((teamRegistration.team_members.filter(m => m.attendance?.marked || m.attendance?.status === 'present').length / teamRegistration.team_members.length) * 100) 
                        : 0}%
                    </p>
                    <p className="text-sm text-purple-700 font-medium">Attendance</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[300px]">
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <p className="text-gray-600 text-lg font-medium">No team data available</p>
                <p className="text-gray-500 text-sm mt-1">Unable to load team information</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 lg:p-6 border-t border-gray-200 bg-white flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {teamRegistration && (
                <span>Team ID: {
                  teamRegistration.team?.team_id || 
                  teamRegistration.team_id || 
                  teamData?.teamId || 
                  teamId || 
                  'N/A'
                }</span>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
      
      {/* Task Submission Modal */}
      {showSubmissionModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[9999999]">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Submit Task</h3>
                <p className="text-sm text-gray-600 mt-1">{selectedTask?.title}</p>
              </div>
              <button
                onClick={closeSubmissionModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <h4 className="text-base font-medium text-gray-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Quick Links for "{selectedTask?.category || 'general'}" tasks
                </h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {getLinkSuggestions(selectedTask?.category || 'general').map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => setSubmissionLink(suggestion.placeholder)}
                      className="p-4 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="font-medium text-gray-800 text-sm">{suggestion.label}</div>
                      <div className="text-xs text-gray-500 truncate mt-1">{suggestion.placeholder}</div>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Submission Link <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={submissionLink}
                    onChange={(e) => setSubmissionLink(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Provide a direct link to your completed work (GitHub repo, Google Drive, etc.)
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    value={submissionNotes}
                    onChange={(e) => setSubmissionNotes(e.target.value)}
                    placeholder="Add any notes about your submission, special instructions, or context..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Any additional context or instructions for reviewers
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-8">
                <button
                  onClick={closeSubmissionModal}
                  className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitTask}
                  disabled={!submissionLink.trim() || submissionLoading}
                  className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {submissionLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[9999999]">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Review Task</h3>
                <p className="text-sm text-gray-600 mt-1">{selectedTask?.title}</p>
              </div>
              <button
                onClick={closeReviewModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              {selectedTask?.submission_link && (
                <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Submitted Work
                  </h4>
                  <a
                    href={selectedTask.submission_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline flex items-center gap-2 mb-3"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    {selectedTask.submission_link}
                  </a>
                  {selectedTask.submission_notes && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">Submission Notes:</p>
                      <p className="text-sm text-gray-600 bg-white p-3 rounded-lg border">{selectedTask.submission_notes}</p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Review Decision <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  >
                    <option value="approved">✅ Approved - Task Complete</option>
                    <option value="needs_revision">🔄 Needs Revision - Minor Changes Required</option>
                    <option value="rejected">❌ Rejected - Major Issues, Start Over</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Review Feedback
                    {reviewStatus !== 'approved' && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder={reviewStatus === 'approved' 
                      ? "Great work! Optional: Add any positive feedback or suggestions for future tasks..."
                      : reviewStatus === 'needs_revision'
                      ? "Please specify what needs to be revised and provide clear guidance..."
                      : "Please explain what major issues need to be addressed and provide guidance for restarting..."
                    }
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    required={reviewStatus !== 'approved'}
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    {reviewStatus === 'approved' 
                      ? "Optional feedback to encourage the team member"
                      : "Required: Provide clear, constructive feedback to help improve the work"
                    }
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-8">
                <button
                  onClick={closeReviewModal}
                  className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={reviewTask}
                  disabled={reviewLoading || (reviewStatus !== 'approved' && !reviewNotes.trim())}
                  className="px-8 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {reviewLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Reviewing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
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

  // Use createPortal to render outside of any parent containers
  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default TeamViewModal;
