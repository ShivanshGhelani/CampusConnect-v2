import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
  ChevronDown,
  BarChart3,
  Download
} from 'lucide-react';
import AdminLayout from '../AdminLayout';
import LoadingSpinner from '../../LoadingSpinner';
import Modal from '../../ui/Modal';
import Toast from '../../ui/Toast';
import SearchBox from '../../ui/SearchBox';
import Dropdown from '../../ui/Dropdown';
import ScanHistoryModal from './ScanHistoryModal';
import { adminAPI } from '../../../api/admin';

const UnifiedAttendancePortal = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get data passed from EventDetail via navigation state
  const passedData = location.state;
  
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [config, setConfig] = useState(null);
  const [passedEventData, setPassedEventData] = useState(passedData?.event_data || null);
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
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [checkingExistingInvitation, setCheckingExistingInvitation] = useState(false);
  
  // Scan history modal state
  const [showScanHistoryModal, setShowScanHistoryModal] = useState(false);
  const [hasActiveScanner, setHasActiveScanner] = useState(false);

  useEffect(() => {
    loadAttendanceData();
    // Check if there's an active scanner
    checkForActiveScanner();
  }, [eventId]);

  const checkForActiveScanner = async () => {
    try {
      const response = await adminAPI.getScannerInvitationStats(eventId);
      if (response.data.success && response.data.data.has_active_invitation) {
        setHasActiveScanner(true);
      } else {
        setHasActiveScanner(false);
      }
    } catch (err) {
      console.error('Error checking for active scanner:', err);
      setHasActiveScanner(false);
    }
  };

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
        }
      }
      
      // Get the selected session/day from state
      if (!selectedSessionId) {
        setTokenError('Please select a session/day to create scanner for');
        setTokenLoading(false);
        return;
      }
      
      // Find the selected session from config
      const selectedSession = config?.attendance_strategy?.sessions?.find(
        s => s.session_id === selectedSessionId
      );
      
      if (!selectedSession) {
        setTokenError('Selected session not found');
        setTokenLoading(false);
        return;
      }
      
      // Use session end time + 1 hour as expiry (using UTC to avoid timezone issues)
      const sessionEndTime = new Date(selectedSession.end_time);
      const expiresAt = new Date(sessionEndTime.getTime() + (60 * 60 * 1000)).toISOString(); // Add 1 hour in milliseconds
      
      // Determine target parameters based on attendance strategy
      let targetDay = null;
      let targetSession = null;
      let targetRound = null;
      
      const strategy = config?.attendance_strategy?.strategy || config?.attendance_strategy?.strategy;
      
      if (strategy === 'day_based') {
        // Extract day number from session_id (e.g., "day_1" -> 1)
        const dayMatch = selectedSession.session_id.match(/day_(\d+)/);
        targetDay = dayMatch ? parseInt(dayMatch[1]) : null;
      } else if (strategy === 'session_based') {
        targetSession = selectedSession.session_id;
      } else if (strategy === 'milestone_based' || strategy === 'round_based') {
        targetRound = selectedSession.session_id;
      }
      
      // Create scanner invitation with target parameters
      const response = await adminAPI.createScannerInvitation(
        eventId, 
        expiresAt,
        targetDay,
        targetSession,
        targetRound
      );
      
      if (response.data.success) {
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
          target_round: targetRound,
          session_name: selectedSession.session_name
        };
        setScannerToken(invitationData);
        setHasActiveScanner(true);
        showNotification(`Scanner link created for ${selectedSession.session_name}!`, 'success');
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
        
        // Find the session info based on the target from backend
        let sessionName = 'Unknown Session';
        let sessionId = null;
        
        if (statsData.target_day && config?.attendance_strategy?.sessions) {
          // For day-based, find session by matching day number in session_id
          const targetSession = config.attendance_strategy.sessions.find(s => {
            const dayMatch = s.session_id.match(/day_(\d+)/);
            return dayMatch && parseInt(dayMatch[1]) === statsData.target_day;
          });
          if (targetSession) {
            sessionName = targetSession.session_name;
            sessionId = targetSession.session_id;
          }
        } else if (statsData.target_session && config?.attendance_strategy?.sessions) {
          // For session-based, find by session_id
          const targetSession = config.attendance_strategy.sessions.find(s => s.session_id === statsData.target_session);
          if (targetSession) {
            sessionName = targetSession.session_name;
            sessionId = targetSession.session_id;
          }
        } else if (statsData.target_round && config?.attendance_strategy?.sessions) {
          // For round/milestone-based
          const targetSession = config.attendance_strategy.sessions.find(s => s.session_id === statsData.target_round);
          if (targetSession) {
            sessionName = targetSession.session_name;
            sessionId = targetSession.session_id;
          }
        }
        
        const invitationData = {
          scanner_url: scannerUrl,
          invitation_code: statsData.invitation_code,
          expires_at: statsData.expires_at,
          expires_in_hours: hoursUntilExpiry,
          event_name: config?.event_name || 'Event',
          session_name: sessionName,
          target_day: statsData.target_day,
          target_session: statsData.target_session,
          target_round: statsData.target_round,
          attendance_window: {
            start: statsData.attendance_start_time,
            end: statsData.attendance_end_time
          },
          is_existing: true // Flag to indicate this is an existing invitation
        };
        
        // Also restore the selected session in the dropdown
        if (sessionId) {
          setSelectedSessionId(sessionId);
        }
        
        setScannerToken(invitationData);
        setHasActiveScanner(true);
        console.log('✅ Restored existing active invitation:', statsData.invitation_code);
      } else {
        // No active invitation, user can create a new one
        console.log('ℹ️ No active invitation found');
        setScannerToken(null);
        setHasActiveScanner(false);
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

  const handleExportAttendance = async () => {
    try {
      if (!participants || participants.length === 0) {
        showNotification('No attendance data available to export', 'error');
        return;
      }

      // Debug: Log all data sources
      console.group('🔍 ATTENDANCE EXPORT DEBUG');
      console.log('📊 Analytics:', analytics);
      console.log('⚙️ Config:', config);
      console.log('📦 Passed Event Data:', passedEventData);
      console.log('👥 First Participant:', participants[0]);
      console.log('📋 Participant Structure:', {
        participant_type: participants[0]?.participant_type,
        student_fields: participants[0]?.student ? Object.keys(participants[0].student) : 'No student object',
        faculty_fields: participants[0]?.faculty ? Object.keys(participants[0].faculty) : 'No faculty object',
      });
      console.groupEnd();

      // Fetch HTML template
      const templateResponse = await fetch('/templates/attendance_report.html');
      let htmlTemplate = await templateResponse.text();

      // Populate template with data
      const genDate = new Date().toLocaleDateString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      // Format organizer details
      let organizerInfo = 'N/A';
      const eventData = passedEventData || config;
      if (eventData?.organizer_details && eventData.organizer_details.length > 0) {
        organizerInfo = eventData.organizer_details
          .map(org => `${org.full_name || org.name || 'Unknown'}, ${org.department || 'N/A'}`)
          .join(' | ');
      } else if (eventData?.contacts && eventData.contacts.length > 0) {
        organizerInfo = eventData.contacts[0].name;
      }

      const startDate = (eventData?.start_datetime || config?.start_datetime) ? new Date(eventData?.start_datetime || config?.start_datetime).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }) : 'N/A';

      const endDate = (eventData?.end_datetime || config?.end_datetime) ? new Date(eventData?.end_datetime || config?.end_datetime).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }) : 'N/A';

      // Get total sessions count from config
      const totalSessions = config?.attendance_strategy?.sessions?.length || config?.sessions?.length || 1;

      // Determine if event is for students or faculty based on target audience
      const targetAudience = eventData?.target_audience || config?.target_audience || 'student';
      const isStudentEvent = targetAudience === 'student' || targetAudience === 'students' || targetAudience.includes('student');
      const semDesigColumnHeader = isStudentEvent ? 'Year' : 'Designation';

      // Generate attendance table rows
      let tableRows = '';
      participants.forEach((participant, index) => {
        const isStudent = participant.participant_type === 'student';
        const profile = isStudent ? participant.student : participant.faculty;
        const attendance = participant.attendance || {};
        const enrollmentId = profile?.enrollment_no || profile?.employee_id || 'N/A';
        
        // Debug log to see available fields
        if (index === 0) {
          console.log('🔍 First participant data:', {
            participant_type: participant.participant_type,
            profile: profile,
            student: participant.student,
            faculty: participant.faculty,
            available_fields: Object.keys(profile || {})
          });
        }
        
        let statusBadge = '';
        let statusPercentage = '';
        
        switch (attendance.status) {
          case 'present':
            statusBadge = '<span style="color: #16a34a; font-weight: 600;">Present</span>';
            statusPercentage = '100%';
            break;
          case 'partial':
            statusBadge = '<span style="color: #ca8a04; font-weight: 600;">Partial</span>';
            statusPercentage = `${attendance.percentage || 0}%`;
            break;
          case 'absent':
            statusBadge = '<span style="color: #dc2626; font-weight: 600;">Absent</span>';
            statusPercentage = '0%';
            break;
          default:
            statusBadge = '<span style="color: #6b7280;">Not Marked</span>';
            statusPercentage = '0%';
        }

        // Calculate sessions marked vs total
        let sessionsMarked;
        if (attendance.sessions_marked && Array.isArray(attendance.sessions_marked)) {
          // Use actual sessions_marked array if available
          sessionsMarked = `${attendance.sessions_marked.length}/${totalSessions}`;
        } else if (attendance.status === 'present') {
          // If present (100%), show all sessions marked
          sessionsMarked = `${totalSessions}/${totalSessions}`;
        } else if (attendance.status === 'partial') {
          // If partial, calculate based on percentage
          const markedCount = Math.round((attendance.percentage / 100) * totalSessions);
          sessionsMarked = `${markedCount}/${totalSessions}`;
        } else {
          // Absent or not marked
          sessionsMarked = `0/${totalSessions}`;
        }

        // Get semester for students or designation for faculty
        // Try multiple possible field names
        let semesterOrDesignation = 'N/A';
        if (isStudent) {
          // Try various semester/year field names (DB has 'year' field, not 'semester')
          semesterOrDesignation = profile?.year || profile?.semester || profile?.sem || 
                                 profile?.current_semester || profile?.semester_no || 
                                 participant.student?.year || participant.student?.semester || 'N/A';
        } else {
          // For faculty, try various designation field names
          semesterOrDesignation = participant.faculty?.designation || profile?.designation || 
                                 participant.faculty?.position || profile?.position || 'N/A';
        }
        
        // If still N/A, log for debugging
        if (semesterOrDesignation === 'N/A' && index === 0) {
          console.log('⚠️ Semester/Designation not found. Available profile fields:', Object.keys(profile || {}));
        }

        tableRows += `
          <tr>
            <td>${index + 1}</td>
            <td>${enrollmentId}</td>
            <td>${participant.registration_id || 'N/A'}</td>
            <td>${profile?.name || profile?.full_name || 'Unknown'}</td>
            <td>${profile?.department || 'N/A'}</td>
            <td>${semesterOrDesignation}</td>
            <td>${statusBadge}</td>
            <td>${statusPercentage}</td>
            <td>${sessionsMarked}</td>
          </tr>
        `;
      });

      // Calculate attendance percentage
      // Use analytics percentage if available (matches portal display), otherwise calculate manually
      const totalRegistrations = analytics?.total_registered || participants.length;
      const presentCount = analytics?.total_present || 0;
      const partialCount = analytics?.total_partial || 0;
      
      const attendancePercentage = analytics?.attendance_rate 
        ? analytics.attendance_rate
        : totalRegistrations > 0 
          ? ((presentCount + (partialCount * 0.5)) / totalRegistrations * 100).toFixed(1)
          : '0.0';

      // Get strategy name from passed data or config
      const strategyName = eventData?.attendance_strategy?.strategy || 
                          config?.attendance_strategy?.strategy || 
                          config?.attendance_strategy_type ||
                          config?.attendance_strategy?.strategy || 
                          'Single Mark';
      
      // Format strategy name nicely
      const formatStrategyName = (strat) => {
        if (!strat) return 'Single Mark';
        return strat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      };

      // Replace template placeholders
      htmlTemplate = htmlTemplate
        .replace(/{{DOCUMENT_TITLE}}/g, `Attendance Report - ${config?.event_name || 'Event'}`)
        .replace(/{{LOGO_URL}}/g, '/logo/ksv.png')
        .replace(/{{EVENT_ID}}/g, eventId)
        .replace(/{{EVENT_NAME}}/g, config?.event_name || 'N/A')
        .replace(/{{GENERATION_DATE}}/g, genDate)
        .replace(/{{START_DATE}}/g, startDate)
        .replace(/{{END_DATE}}/g, endDate)
        .replace(/{{VENUE}}/g, eventData?.venue || config?.venue || 'N/A')
        .replace(/{{SHORT_DESCRIPTION}}/g, eventData?.short_description || config?.short_description || 'N/A')
        .replace(/{{ORGANIZER}}/g, organizerInfo)
        .replace(/{{DEPARTMENT_CLUB}}/g, eventData?.organizing_department || config?.organizing_department || 'N/A')
        .replace(/{{TOTAL_REGISTRATIONS}}/g, totalRegistrations)
        .replace(/{{PRESENT_COUNT}}/g, presentCount)
        .replace(/{{PARTIAL_COUNT}}/g, partialCount)
        .replace(/{{ABSENT_COUNT}}/g, analytics?.total_absent || 0)
        .replace(/{{ATTENDANCE_PERCENTAGE}}/g, attendancePercentage)
        .replace(/{{STRATEGY}}/g, formatStrategyName(strategyName))
        .replace(/{{SEM_DESIG_HEADER}}/g, semDesigColumnHeader)
        .replace(/{{TABLE_ROWS}}/g, tableRows)
        .replace(/{{CURRENT_YEAR}}/g, new Date().getFullYear());

      // Open in new window for printing
      const printWindow = window.open('', '_blank');
      printWindow.document.write(htmlTemplate);
      printWindow.document.close();

      // Trigger print after load
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };

      showNotification('Attendance report generated successfully', 'success');

    } catch (error) {
      console.error('Export error:', error);
      showNotification('Failed to export attendance data', 'error');
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

    const attendanceStrategy = config.attendance_strategy || {};
    // Extract strategy type from nested structure
    const strategy = attendanceStrategy.strategy || attendanceStrategy.type || 'session_based';
    const sessions = attendanceStrategy.sessions || [];

    // Safely format strategy name
    const formatStrategyName = (strategyName) => {
      if (!strategyName || typeof strategyName !== 'string') {
        return 'Unknown Strategy';
      }
      return strategyName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                                  
                                  {/* Show which specific days/sessions are marked */}
                                  {memberAttendance.sessions && memberAttendance.sessions.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {memberAttendance.sessions.map((session, idx) => (
                                        <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                          <CheckCircle className="w-3 h-3" />
                                          {session.session_name}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Attendance Marking Buttons for Team Members */}
                                <div className="flex gap-2">
                                  {config?.attendance_strategy === 'single_mark' ? (
                                    <>
                                      <button
                                        onClick={() => markAttendance(member.registration_id, 'present', null, memberIndex)}
                                        className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                                      >
                                        Present
                                      </button>
                                      <button
                                        onClick={() => markAttendance(member.registration_id, 'absent', null, memberIndex)}
                                        className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
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
                    
                    {/* Show which specific days/sessions are marked */}
                    {attendance.sessions && attendance.sessions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {attendance.sessions.map((session, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            <CheckCircle className="w-3 h-3" />
                            {session.session_name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {config?.attendance_strategy === 'single_mark' ? (
                      <>
                        <button
                          onClick={() => markAttendance(participant.registration_id, 'present')}
                          className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                        >
                          Present
                        </button>
                        <button
                          onClick={() => markAttendance(participant.registration_id, 'absent')}
                          className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
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
              onClick={handleExportAttendance}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              <Download className="w-4 h-4" />
              Export Data
            </button>
            <button
              onClick={handleOpenScannerModal}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              <QrCode className="w-4 h-4" />
              Generate Scanner
            </button>
            <div className="relative group">
              <button
                onClick={() => setShowScanHistoryModal(true)}
                disabled={!hasActiveScanner && !scannerToken}
                className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
                  hasActiveScanner || scannerToken
                    ? 'bg-purple-500 text-white hover:bg-purple-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                title={hasActiveScanner || scannerToken ? 'View scan history' : 'Create scanner first'}
              >
                <BarChart3 className="w-4 h-4" />
                Scans
              </button>
              {!hasActiveScanner && !scannerToken && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  Create scanner first
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
              )}
            </div>
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
            setSelectedSessionId('');
            // Refresh active scanner status after closing modal
            checkForActiveScanner();
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
                        Generate a secure link for volunteers to mark attendance for a specific session/day using QR codes.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Session Selection - Use event's attendance_strategy.sessions */}
                {config?.attendance_strategy?.sessions && config.attendance_strategy.sessions.length > 0 && (
                  <div>
                    <Dropdown
                      label={`Select ${config.attendance_strategy?.strategy === 'day_based' ? 'Day' : config.attendance_strategy?.strategy === 'session_based' ? 'Session' : 'Milestone/Round'} to Mark`}
                      placeholder={`Select which ${config.attendance_strategy?.strategy === 'day_based' ? 'day' : 'session'} this scanner will mark...`}
                      value={selectedSessionId}
                      onChange={(value) => setSelectedSessionId(value)}
                      options={config.attendance_strategy.sessions.map(session => ({
                        value: session.session_id,
                        label: session.session_name,
                        description: `${new Date(session.start_time).toLocaleString()} - ${new Date(session.end_time).toLocaleString()}${session.is_mandatory ? ' (Mandatory)' : ''}`
                      }))}
                      required={true}
                      size="md"
                      icon={<Calendar className="w-4 h-4" />}
                      helperText="Scanner will only mark attendance for the selected session. Link expires 1 hour after session ends."
                    />
                  </div>
                )}

                {!config?.attendance_strategy?.sessions?.length && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-800">No Sessions Configured</h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          This event doesn't have sessions configured. Please configure attendance sessions first.
                        </p>
                      </div>
                    </div>
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
                  onClick={() => generateScannerToken()}
                  disabled={tokenLoading || !config?.attendance_strategy?.sessions?.length}
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
                    <div className="text-xs text-gray-500 mb-1">Target Session</div>
                    <div className="font-medium text-sm">{scannerToken.session_name}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Valid Until</div>
                    <div className="font-medium text-sm">{new Date(scannerToken.expires_at).toLocaleString()}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Link Expires In</div>
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
                  <p>• This link marks attendance for: <strong>{scannerToken.session_name}</strong></p>
                  <p>• Link expires automatically 1 hour after the session ends</p>
                  <p>• Share only with trusted volunteers for this specific session</p>
                  <p>• Attendance will be marked in the same way as manual marking</p>
                </div>

                {scannerToken.is_existing && (
                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={async () => {
                        // Reset and allow creating new
                        setScannerToken(null);
                        setTokenError('');
                      }}
                      disabled={tokenLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
                    >
                      <QrCode className="w-4 h-4" />
                      Create New Scanner Link (for different session)
                    </button>
                    <p className="text-xs text-gray-500 text-center mt-2">
                      Create a scanner for a different session/day
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </Modal>

        {/* Scan History Modal */}
        <ScanHistoryModal
          
          isOpen={showScanHistoryModal}
          onClose={() => setShowScanHistoryModal(false)}
          eventId={eventId}
          invitationCode={scannerToken?.invitation_code}
        />
      </div>
    </AdminLayout>
  );
};

export default UnifiedAttendancePortal;

