import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Users, 
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  UserCheck,
  RefreshCw,
  Activity,
  Target,
  Calendar,
  Flag,
  Award,
  QrCode,
  ExternalLink,
  Copy,
  Timer,
  Shield,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import AdminLayout from '../AdminLayout';
import LoadingSpinner from '../../LoadingSpinner';
import Modal from '../../ui/Modal';
import Toast from '../../ui/Toast';
import SearchBox from '../../ui/SearchBox';
import Dropdown from '../../ui/Dropdown';
import { adminAPI } from '../../../api/admin';

const UnifiedAttendancePortal = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [config, setConfig] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [filteredParticipants, setFilteredParticipants] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSession, setSelectedSession] = useState(null);
  const [notification, setNotification] = useState(null);
  const [expandedTeams, setExpandedTeams] = useState(new Set());
  
  // Scanner token state
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scannerToken, setScannerToken] = useState(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [selectedSessionForToken, setSelectedSessionForToken] = useState('');
  const [checkingExistingInvitation, setCheckingExistingInvitation] = useState(false);

  useEffect(() => {
    loadAttendanceData();
  }, [eventId]);

  useEffect(() => {
    filterParticipants();
  }, [searchTerm, statusFilter, participants]);

  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      
      // Load config and participants
      const configResponse = await adminAPI.getAttendanceConfigAndParticipants(eventId);
      if (configResponse.data.success) {
        setConfig(configResponse.data.data.config);
        setParticipants(configResponse.data.data.participants);
      }
      
      // Load analytics
      const analyticsResponse = await adminAPI.getAttendanceAnalytics(eventId);
      if (analyticsResponse.data.success) {
        setAnalytics(analyticsResponse.data.data);
      }
      
    } catch (err) {
      
      setError('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const filterParticipants = () => {
    let filtered = [...participants];
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(participant => {
        const searchLower = searchTerm.toLowerCase();
        
        // For team registrations, search in team name and all team members
        if (participant.registration_type === 'team' && participant.team_members) {
          // Search in team name
          const teamName = participant.team?.team_name?.toLowerCase() || '';
          if (teamName.includes(searchLower)) {
            return true;
          }
          
          // Search in team member names, emails, IDs
          return participant.team_members.some(member => {
            const student = member.student;
            const faculty = member.faculty;
            
            if (student) {
              return student.name?.toLowerCase().includes(searchLower) ||
                     student.enrollment_no?.toLowerCase().includes(searchLower) ||
                     student.email?.toLowerCase().includes(searchLower);
            } else if (faculty) {
              return faculty.name?.toLowerCase().includes(searchLower) ||
                     faculty.employee_id?.toLowerCase().includes(searchLower) ||
                     faculty.email?.toLowerCase().includes(searchLower);
            }
            return false;
          });
        } else {
          // Individual registration search - search by full name
          const student = participant.student;
          const faculty = participant.faculty;
          
          if (student) {
            return student.name?.toLowerCase().includes(searchLower) ||
                   student.full_name?.toLowerCase().includes(searchLower) ||
                   student.enrollment_no?.toLowerCase().includes(searchLower) ||
                   student.email?.toLowerCase().includes(searchLower);
          } else if (faculty) {
            return faculty.name?.toLowerCase().includes(searchLower) ||
                   faculty.full_name?.toLowerCase().includes(searchLower) ||
                   faculty.employee_id?.toLowerCase().includes(searchLower) ||
                   faculty.email?.toLowerCase().includes(searchLower);
          }
          return false;
        }
      });
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(participant => {
        // For team registrations, check if any team member has the specified status
        if (participant.registration_type === 'team' && participant.team_members) {
          return participant.team_members.some(member => {
            const attendance = member.attendance || {};
            return attendance.status === statusFilter;
          });
        } else {
          // Individual registration status check
          const attendance = participant.attendance || {};
          return attendance.status === statusFilter;
        }
      });
    }
    
    setFilteredParticipants(filtered);
  };

  const markAttendance = async (registrationId, attendanceType, sessionId = null, memberIndex = null) => {
    try {
      const attendanceData = {
        registration_id: registrationId,
        attendance_type: attendanceType,
        session_id: sessionId,
        member_index: memberIndex, // For team-based marking individual members
        notes: `Marked via unified portal`
      };
      
      const response = await adminAPI.markAttendance(attendanceData);
      
      if (response.data.success) {
        showNotification('Attendance marked successfully', 'success');
        // Reload data to get updated attendance
        await loadAttendanceData();
      } else {
        showNotification('Failed to mark attendance', 'error');
      }
    } catch (err) {
      
      showNotification('Error marking attendance', 'error');
    }
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Generate search suggestions based on participants
  const getSearchSuggestions = () => {
    const suggestions = [];
    
    participants.forEach(participant => {
      if (participant.registration_type === 'team' && participant.team_members) {
        // Add team name
        if (participant.team?.team_name) {
          suggestions.push(participant.team.team_name);
        }
        
        // Add team member names
        participant.team_members.forEach(member => {
          const profile = member.student || member.faculty;
          if (profile?.full_name) {
            suggestions.push(profile.full_name);
          } else if (profile?.name) {
            suggestions.push(profile.name);
          }
        });
      } else {
        // Individual registration
        const profile = participant.student || participant.faculty;
        if (profile?.full_name) {
          suggestions.push(profile.full_name);
        } else if (profile?.name) {
          suggestions.push(profile.name);
        }
      }
    });
    
    // Remove duplicates and sort
    return [...new Set(suggestions)].sort();
  };

  const toggleTeamExpansion = (teamId) => {
    setExpandedTeams(prev => {
      const newSet = new Set(prev);
      if (newSet.has(teamId)) {
        newSet.delete(teamId);
      } else {
        newSet.add(teamId);
      }
      return newSet;
    });
  };

  const generateScannerToken = async (sessionId = null, expiresInHours = null, forceNew = false) => {
    try {
      setTokenLoading(true);
      setTokenError('');
      
      // If forcing new, deactivate existing invitations first
      if (forceNew && scannerToken?.invitation_code) {
        try {
          await adminAPI.deactivateScannerInvitation(scannerToken.invitation_code);
          console.log('✅ Deactivated old invitation:', scannerToken.invitation_code);
        } catch (err) {
          console.error('❌ Failed to deactivate old invitation:', err);
          // Continue anyway
        }
      }
      
      // Calculate expiry time if hours provided
      let expiresAt = null;
      if (expiresInHours) {
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + expiresInHours);
        expiresAt = expiry.toISOString();
      }
      
      // Get selected target day/session/round
      const targetDay = document.getElementById('target-day-select')?.value || null;
      const targetSession = document.getElementById('target-session-select')?.value || null;
      const targetRound = document.getElementById('target-round-select')?.value || null;
      
      // Use new invitation-based scanner API with target selection
      const response = await adminAPI.createScannerInvitation(
        eventId, 
        expiresAt,
        targetDay ? parseInt(targetDay) : null,
        targetSession,
        targetRound
      );
      
      if (response.data.success) {
        // Transform response to match old format for UI compatibility
        const expiresAtDate = new Date(response.data.data.expires_at);
        const hoursUntilExpiry = Math.ceil((expiresAtDate - new Date()) / (1000 * 60 * 60));
        
        const invitationData = {
          scanner_url: response.data.data.invitation_url,
          invitation_code: response.data.data.invitation_code,
          expires_at: response.data.data.expires_at,
          expires_in_hours: hoursUntilExpiry,
          event_name: response.data.data.event_name,
          attendance_window: response.data.data.attendance_window,
          target_day: targetDay,
          target_session: targetSession,
          target_round: targetRound
        };
        setScannerToken(invitationData);
        showNotification('Scanner invitation link generated successfully!', 'success');
      } else {
        setTokenError('Failed to generate scanner invitation');
      }
    } catch (err) {
      console.error('Error generating scanner invitation:', err);
      setTokenError('Error generating scanner invitation');
    } finally {
      setTokenLoading(false);
    }
  };

  // Check for existing active invitation when opening modal
  const checkExistingInvitation = async () => {
    try {
      setCheckingExistingInvitation(true);
      const response = await adminAPI.getScannerInvitationStats(eventId);
      
      console.log('📊 Stats response:', response.data);
      
      if (response.data.success && response.data.data.has_active_invitation) {
        // Found an active invitation, display it
        const statsData = response.data.data;
        const expiresAtDate = new Date(statsData.expires_at);
        const hoursUntilExpiry = Math.ceil((expiresAtDate - new Date()) / (1000 * 60 * 60));
        
        // Use the invitation URL from backend (already has correct domain)
        const scannerUrl = statsData.invitation_url || `${window.location.origin}/scan/${statsData.invitation_code}`;
        
        const invitationData = {
          scanner_url: scannerUrl,
          invitation_code: statsData.invitation_code,
          expires_at: statsData.expires_at,
          expires_in_hours: hoursUntilExpiry,
          event_name: config?.event_name || 'Event',
          attendance_window: {
            start: statsData.attendance_start_time,
            end: statsData.attendance_end_time
          },
          is_existing: true // Flag to indicate this is an existing invitation
        };
        
        setScannerToken(invitationData);
        console.log('✅ Restored existing active invitation:', statsData.invitation_code);
      } else {
        // No active invitation, user can create a new one
        console.log('ℹ️ No active invitation found');
        setScannerToken(null);
      }
    } catch (err) {
      console.error('❌ Error checking existing invitation:', err);
      // On error, allow creating new invitation
      setScannerToken(null);
    } finally {
      setCheckingExistingInvitation(false);
    }
  };

  // Handle opening the scanner modal
  const handleOpenScannerModal = async () => {
    setShowScannerModal(true);
    await checkExistingInvitation();
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showNotification('Copied to clipboard!', 'success');
    } catch (err) {
      
      showNotification('Failed to copy to clipboard', 'error');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'absent': return <X className="w-4 h-4 text-red-500" />;
      case 'partial': return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStrategyIcon = (strategy) => {
    switch (strategy) {
      case 'session_based': return <Activity className="w-5 h-5" />;
      case 'day_based': return <Calendar className="w-5 h-5" />;
      case 'milestone_based': return <Flag className="w-5 h-5" />;
      case 'single_mark': return <Target className="w-5 h-5" />;
      default: return <UserCheck className="w-5 h-5" />;
    }
  };

  const renderStrategyInfo = () => {
    if (!config) return null;

    const strategy = config.attendance_strategy;
    const attendanceConfig = config.attendance_config || {};
    const sessions = attendanceConfig.sessions || [];

    // Safely format strategy name
    const formatStrategyName = (strategyName) => {
      if (!strategyName || typeof strategyName !== 'string') {
        return 'Unknown Strategy';
      }
      return strategyName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
      <div className="bg-white rounded-lg shadow mb-6 p-6">
        <div className="flex items-center gap-3 mb-4">
          {getStrategyIcon(strategy)}
          <div>
            <h3 className="text-lg font-semibold">
              {formatStrategyName(strategy)} Strategy
            </h3>
            <p className="text-sm text-gray-600">
              {config.attendance_mandatory ? 'Attendance is mandatory' : 'Attendance is optional'}
            </p>
          </div>
        </div>

        {sessions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((session, index) => (
              <div 
                key={session.session_id} 
                className={`p-4 rounded-lg border ${
                  selectedSession === session.session_id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                } cursor-pointer transition-colors`}
                onClick={() => setSelectedSession(
                  selectedSession === session.session_id ? null : session.session_id
                )}
              >
                <div className="font-medium text-sm">{session.session_name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Weight: {session.weight || 1} | Duration: {session.duration_minutes || 'N/A'} min
                </div>
                {session.is_mandatory && (
                  <div className="text-xs text-red-600 mt-1">Mandatory</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderParticipantsList = () => {
    if (filteredParticipants.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No participants found
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {filteredParticipants.map((participant, index) => {
          const isTeamRegistration = participant.registration_type === 'team';
          
          if (isTeamRegistration && participant.team_members) {
            // Team-based registration - render expandable team card
            const team = participant.team || {};
            const teamMembers = participant.team_members || [];
            const teamId = `team-${participant.registration_id}`;
            const isExpanded = expandedTeams.has(teamId);
            
            return (
              <div key={participant.registration_id} className="bg-white rounded-lg shadow border border-gray-200">
                {/* Team Header */}
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-blue-500" />
                          <span className="font-semibold text-lg text-gray-900">
                            {team.team_name || 'Unnamed Team'}
                          </span>
                          <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                            Team Registration
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Team Size: {team.team_size || teamMembers.length}</span>
                        <span>Leader: {teamMembers.find(m => m.is_team_leader)?.student?.full_name || teamMembers.find(m => m.is_team_leader)?.student?.name || 'Unknown'}</span>
                        <span>Status: {team.status || 'active'}</span>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-2">
                        <div className="text-sm">
                          Team Status: <span className="font-medium text-green-600">
                            {team.status || 'registered'}
                          </span>
                        </div>
                        <div className="text-sm">
                          Members: <span className="font-medium">{teamMembers.length}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleTeamExpansion(teamId)}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            Hide Members
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            Show Members
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Team Members - Expandable */}
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    <div className="p-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">
                        Team Members ({teamMembers.length})
                      </h4>
                      <div className="space-y-3">
                        {teamMembers.map((member, memberIndex) => {
                          const memberAttendance = member.attendance || {};
                          const isStudent = member.student;
                          const profile = isStudent ? member.student : member.faculty;
                          
                          return (
                            <div key={member.registration_id} className="bg-white rounded-lg p-3 border border-gray-200">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-1">
                                    <div className="flex items-center gap-2">
                                      {getStatusIcon(memberAttendance.status)}
                                      <span className="font-medium text-gray-900">
                                        {profile?.full_name || profile?.name || 'Unknown Name'}
                                      </span>
                                      <span className="text-sm text-gray-500">
                                        ({profile?.enrollment_no || profile?.employee_id || 'No ID'})
                                      </span>
                                      {member.is_team_leader && (
                                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                                          Leader
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="text-sm text-gray-600 mb-2">
                                    {profile?.email} | {profile?.department || 'No Department'}
                                    {isStudent && profile?.semester && ` | Semester ${profile.semester}`}
                                  </div>
                                  
                                  <div className="flex items-center gap-4 text-sm">
                                    <div>
                                      Status: <span className={`font-medium ${
                                        memberAttendance.status === 'present' ? 'text-green-600' :
                                        memberAttendance.status === 'absent' ? 'text-red-600' :
                                        memberAttendance.status === 'partial' ? 'text-yellow-600' :
                                        'text-gray-600'
                                      }`}>
                                        {memberAttendance.status || 'pending'}
                                      </span>
                                    </div>
                                    <div>
                                      Percentage: <span className="font-medium">{memberAttendance.percentage || 0}%</span>
                                    </div>
                                    {memberAttendance.sessions_attended > 0 && (
                                      <div>
                                        Sessions: {memberAttendance.sessions_attended}/{memberAttendance.total_sessions}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Attendance Marking Buttons for Team Members */}
                                <div className="flex gap-2">
                                  {config?.attendance_strategy === 'single_mark' ? (
                                    <>
                                      <button
                                        onClick={() => markAttendance(member.registration_id, 'present', null, memberIndex)}
                                        className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:opacity-50"
                                        disabled={memberAttendance.status === 'present'}
                                      >
                                        Present
                                      </button>
                                      <button
                                        onClick={() => markAttendance(member.registration_id, 'absent', null, memberIndex)}
                                        className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 disabled:opacity-50"
                                        disabled={memberAttendance.status === 'absent'}
                                      >
                                        Absent
                                      </button>
                                    </>
                                  ) : (
                                    selectedSession && (
                                      <>
                                        <button
                                          onClick={() => markAttendance(member.registration_id, 'present', selectedSession, memberIndex)}
                                          className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                                        >
                                          Mark Present
                                        </button>
                                        <button
                                          onClick={() => markAttendance(member.registration_id, 'absent', selectedSession, memberIndex)}
                                          className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                                        >
                                          Mark Absent
                                        </button>
                                      </>
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          } else {
            // Individual registration - render normal participant card
            const attendance = participant.attendance || {};
            const isStudent = participant.participant_type === 'student';
            const profile = isStudent ? participant.student : participant.faculty;
            const team = participant.team;

            return (
              <div key={participant.registration_id} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(attendance.status)}
                        <span className="font-medium">
                          {profile?.full_name || profile?.name || 'Unknown Name'}
                        </span>
                        <span className="text-sm text-gray-500">
                          ({isStudent ? profile?.enrollment_no : profile?.employee_id || 'No ID'})
                        </span>
                      </div>
                      {team && (
                        <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                          Team: {team.team_name}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-600 mt-1">
                      {profile?.email || 'No Email'} | {isStudent ? profile?.department : participant.faculty?.designation || 'No Department'}
                    </div>
                    
                    <div className="flex items-center gap-4 mt-2">
                      <div className="text-sm">
                        Status: <span className={`font-medium ${
                          attendance.status === 'present' ? 'text-green-600' :
                          attendance.status === 'absent' ? 'text-red-600' :
                          attendance.status === 'partial' ? 'text-yellow-600' :
                          'text-gray-600'
                        }`}>
                          {attendance.status || 'pending'}
                        </span>
                      </div>
                      <div className="text-sm">
                        Percentage: <span className="font-medium">{attendance.percentage || 0}%</span>
                      </div>
                      {attendance.sessions_attended > 0 && (
                        <div className="text-sm">
                          Sessions: {attendance.sessions_attended}/{attendance.total_sessions}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {config?.attendance_strategy === 'single_mark' ? (
                      <>
                        <button
                          onClick={() => markAttendance(participant.registration_id, 'present')}
                          className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                          disabled={attendance.status === 'present'}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => markAttendance(participant.registration_id, 'absent')}
                          className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                          disabled={attendance.status === 'absent'}
                        >
                          Absent
                        </button>
                      </>
                    ) : (
                      selectedSession && (
                        <>
                          <button
                            onClick={() => markAttendance(participant.registration_id, 'present', selectedSession)}
                            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                          >
                            Mark Present
                          </button>
                          <button
                            onClick={() => markAttendance(participant.registration_id, 'absent', selectedSession)}
                            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                          >
                            Mark Absent
                          </button>
                        </>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          }
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <LoadingSpinner />
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <div>
                <h3 className="font-medium text-red-800">Error</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/events')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Events
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Attendance Management
              </h1>
              <p className="text-gray-600">{config?.event_name}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleOpenScannerModal}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              <QrCode className="w-4 h-4" />
              Generate Scanner
            </button>
            <button
              onClick={loadAttendanceData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Registered</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.total_registered}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Present</p>
                  <p className="text-2xl font-bold text-green-600">{analytics.total_present}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Absent</p>
                  <p className="text-2xl font-bold text-red-600">{analytics.total_absent}</p>
                </div>
                <X className="w-8 h-8 text-red-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
                  <p className="text-2xl font-bold text-blue-600">{analytics.attendance_rate}%</p>
                </div>
                <Target className="w-8 h-8 text-blue-500" />
              </div>
            </div>
          </div>
        )}

        {/* Strategy Info */}
        {renderStrategyInfo()}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Search & Filter</h3>
            <p className="text-sm text-gray-600">
              Search by team names, individual member names, enrollment numbers, or email addresses. 
              Filter by attendance status to quickly find specific groups.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <SearchBox
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search participants, teams, or members..."
                searchIcon={true}
                clearIcon={true}
                size="lg"
                variant="default"
                className="w-full"
                aria-label="Search participants"
                showResultCount={true}
                resultCount={filteredParticipants.length}
                suggestions={getSearchSuggestions()}
                showSuggestions={true}
                debounceMs={300}
              />
            </div>
            
            <div className="min-w-48">
              <Dropdown
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="All Status"
                size="md"
                variant="default"
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'present', label: 'Present' },
                  { value: 'absent', label: 'Absent' },
                  { value: 'partial', label: 'Partial' }
                ]}
                icon={<i className="fas fa-filter text-sm"></i>}
                clearable={false}
              />
            </div>
          </div>
        </div>

        {/* Participants List */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">
            Participants ({filteredParticipants.length})
            {config?.attendance_strategy !== 'single_mark' && !selectedSession && (
              <span className="ml-2 text-sm text-amber-600">
                Please select a session above to mark attendance
              </span>
            )}
          </h2>
          {renderParticipantsList()}
        </div>

        {/* Notification */}
        {notification && (
          <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white`}>
            {notification.message}
          </div>
        )}

        {/* Scanner Token Modal */}
        <Modal
          isOpen={showScannerModal}
          onClose={() => {
            setShowScannerModal(false);
            setScannerToken(null);
            setTokenError('');
            setSelectedSessionForToken('');
          }}
          title="Generate QR Scanner Link"
          size="lg"
          headerIcon={<QrCode className="w-5 h-5" />}
        >
          <div className="space-y-6">
            {checkingExistingInvitation ? (
              <div className="flex flex-col items-center justify-center py-8">
                <LoadingSpinner size="lg" />
                <p className="mt-4 text-gray-600">Checking for existing scanner links...</p>
              </div>
            ) : !scannerToken ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-800">Secure Scanner Access</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Generate a secure, time-limited link that allows volunteers to mark attendance using QR codes without admin access.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Target Day/Session/Round Selection - NEW */}
                {config?.attendance_strategy === 'day_based' && config.attendance_config?.sessions && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Which Day to Mark <span className="text-red-500">*</span>
                    </label>
                    <select 
                      id="target-day-select"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      defaultValue=""
                    >
                      <option value="">Select a day...</option>
                      {config.attendance_config.sessions.map((session) => {
                        // Extract day number from session_id (e.g., "day_1" -> 1)
                        const dayMatch = session.session_id.match(/day_(\d+)/);
                        const dayNum = dayMatch ? parseInt(dayMatch[1]) : null;
                        return dayNum ? (
                          <option key={session.session_id} value={dayNum}>
                            Day {dayNum} - {session.session_name}
                          </option>
                        ) : null;
                      })}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      This scanner will only mark attendance for the selected day
                    </p>
                  </div>
                )}

                {config?.attendance_strategy === 'session_based' && config.attendance_config?.sessions && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Which Session to Mark <span className="text-red-500">*</span>
                    </label>
                    <select 
                      id="target-session-select"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      defaultValue=""
                    >
                      <option value="">Select a session...</option>
                      {config.attendance_config.sessions.map((session) => (
                        <option key={session.session_id} value={session.session_id}>
                          {session.session_name}
                          {session.start_time && ` (${new Date(session.start_time).toLocaleString()})`}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      This scanner will only mark attendance for the selected session
                    </p>
                  </div>
                )}

                {config?.attendance_strategy === 'milestone_based' && config.attendance_config?.sessions && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Which Round/Milestone to Mark <span className="text-red-500">*</span>
                    </label>
                    <select 
                      id="target-round-select"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      defaultValue=""
                    >
                      <option value="">Select a round...</option>
                      {config.attendance_config.sessions.map((session) => (
                        <option key={session.session_id} value={session.session_id}>
                          {session.session_name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      This scanner will only mark attendance for the selected round/milestone
                    </p>
                  </div>
                )}

                {/* Session Selection for session-based events */}
                {config?.attendance_strategy && ['session_based', 'day_based', 'milestone_based'].includes(config.attendance_strategy) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Session/Day/Milestone
                    </label>
                    <select 
                      value={selectedSessionForToken}
                      onChange={(e) => setSelectedSessionForToken(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Use manual expiration time</option>
                      {config.attendance_config?.sessions?.map((session) => (
                        <option key={session.session_id} value={session.session_id}>
                          {session.session_name || session.session_id}
                          {session.start_time && ` (${new Date(session.start_time).toLocaleString()} - ${new Date(session.end_time).toLocaleString()})`}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      If you select a session, the token will automatically expire 1 hour after the session ends.
                    </p>
                  </div>
                )}

                {/* Manual expiration - only show when no session is selected */}
                {(!selectedSessionForToken) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Manual Token Expiration
                    </label>
                    <select 
                      id="hours-select"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      defaultValue="24"
                    >
                      <option value="1">1 Hour</option>
                      <option value="6">6 Hours</option>
                      <option value="12">12 Hours</option>
                      <option value="24">24 Hours (Recommended)</option>
                      <option value="48">48 Hours</option>
                      <option value="72">72 Hours</option>
                      <option value="168">1 Week</option>
                    </select>
                  </div>
                )}

                {tokenError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span className="text-red-700 text-sm">{tokenError}</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    const hoursSelect = document.getElementById('hours-select');
                    const sessionId = selectedSessionForToken || null;
                    const hours = sessionId ? null : parseInt(hoursSelect?.value || '24');
                    generateScannerToken(sessionId, hours);
                  }}
                  disabled={tokenLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {tokenLoading ? (
                    <>
                      <LoadingSpinner />
                      Generating...
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4" />
                      Generate Scanner Link
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <div className={`${scannerToken.is_existing ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'} border rounded-lg p-4`}>
                  <div className="flex items-start gap-3">
                    <CheckCircle className={`w-5 h-5 ${scannerToken.is_existing ? 'text-blue-600' : 'text-green-600'} mt-0.5`} />
                    <div>
                      <h4 className={`font-medium ${scannerToken.is_existing ? 'text-blue-800' : 'text-green-800'}`}>
                        {scannerToken.is_existing ? 'Active Scanner Link Found!' : 'Scanner Link Generated!'}
                      </h4>
                      <p className={`text-sm ${scannerToken.is_existing ? 'text-blue-700' : 'text-green-700'} mt-1`}>
                        {scannerToken.is_existing 
                          ? 'You have an active scanner link. Share this with volunteers to mark attendance.'
                          : 'Share this link with volunteers to allow them to mark attendance.'
                        } The link expires on {new Date(scannerToken.expires_at).toLocaleString()}.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scanner URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={scannerToken.scanner_url}
                      readOnly
                      className="flex-1 p-3 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(scannerToken.scanner_url)}
                      className="px-3 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Event</div>
                    <div className="font-medium text-sm">{scannerToken.event_name}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Expires In</div>
                    <div className="font-medium text-sm flex items-center gap-1">
                      <Timer className="w-3 h-3" />
                      {scannerToken.expires_in_hours} hours
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => window.open(scannerToken.scanner_url, '_blank')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Scanner
                  </button>
                  <button
                    onClick={() => copyToClipboard(scannerToken.scanner_url)}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p>• This link allows marking attendance without admin login</p>
                  <p>• Share only with trusted volunteers</p>
                  <p>• Link automatically expires after the specified time</p>
                  <p>• You can generate new links anytime</p>
                </div>

                {scannerToken.is_existing && (
                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={async () => {
                        // Deactivate existing and create new
                        const hoursSelect = document.getElementById('hours-select');
                        const hours = parseInt(hoursSelect?.value || '24');
                        await generateScannerToken(null, hours, true);
                      }}
                      disabled={tokenLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
                    >
                      {tokenLoading ? (
                        <>
                          <LoadingSpinner />
                          Creating...
                        </>
                      ) : (
                        <>
                          <QrCode className="w-4 h-4" />
                          Create New Scanner Link
                        </>
                      )}
                    </button>
                    <p className="text-xs text-gray-500 text-center mt-2">
                      This will deactivate the current link and create a new one
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
};

export default UnifiedAttendancePortal;
