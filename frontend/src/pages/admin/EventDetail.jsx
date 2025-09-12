import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../../api/admin';
import AdminLayout from '../../components/admin/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import EventReportModal from '../../components/EventReportModal';
import { useAuth } from '../../context/AuthContext';
import { Calendar, Clock, Users, MapPin, Mail, Phone, FileText, Award, CreditCard, ArrowLeft, RefreshCw, Download, UserCheck, Edit3, FileDown, Trash2, MoreHorizontal, CheckCircle, Eye } from 'lucide-react';
import { Dropdown, SearchBox } from '../../components/ui';
import { eventPDFService } from '../../services/EventPDFService';
import {
  fetchAllEventDataWithCache,
  fetchParticipantsWithCache,
  clearAdminEventCache,
  invalidateEventCache,
  getAnyAdminEventCache
} from '../../utils/adminEventCache';

// Helper function to convert backend strategy types to user-friendly labels
const getStrategyDisplayName = (strategyType) => {
  const strategyMap = {
    'day_based': 'Day Based',
    'session_based': 'Session Based',
    'milestone_based': 'Milestone Based',
    'time_based': 'Time Based',
    'percentage_based': 'Percentage Based',
    'custom': 'Custom',
    'hybrid': 'Hybrid'
  };

  if (!strategyType) return 'Not Configured';

  // Handle string format (direct strategy type)
  if (typeof strategyType === 'string') {
    return strategyMap[strategyType] || strategyType.charAt(0).toUpperCase() + strategyType.slice(1).replace(/_/g, ' ');
  }

  return strategyType;
};

function EventDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [eventStats, setEventStats] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [recentRegistrations, setRecentRegistrations] = useState([]);
  const [allRegistrations, setAllRegistrations] = useState([]);
  const [attendeesList, setAttendeesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [registrationsModalOpen, setRegistrationsModalOpen] = useState(false);
  const [attendeesModalOpen, setAttendeesModalOpen] = useState(false);
  const [attendanceStatsModalOpen, setAttendanceStatsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedTeams, setExpandedTeams] = useState(new Set());
  const [presentDropdownOpen, setPresentDropdownOpen] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [exportDropdownSticky, setExportDropdownSticky] = useState(false);
  const [posterModalOpen, setPosterModalOpen] = useState(false);
  const [certificateModalOpen, setCertificateModalOpen] = useState(false);
  const [currentCertificateTemplate, setCurrentCertificateTemplate] = useState(null);
  const [eventReportModalOpen, setEventReportModalOpen] = useState(false);
  const [timeUpdateTrigger, setTimeUpdateTrigger] = useState(0); // For real-time updates

  // Helper function to calculate targeting statistics from registrations
  const calculateTargetingStats = (registrations) => {
    if (!registrations || registrations.length === 0) return null;

    const departmentStats = {};
    const semesterStats = {};

    registrations.forEach(reg => {
      // Count departments
      if (reg.department) {
        departmentStats[reg.department] = (departmentStats[reg.department] || 0) + 1;
      }

      // Count semesters 
      if (reg.semester) {
        semesterStats[reg.semester] = (semesterStats[reg.semester] || 0) + 1;
      }
    });

    return {
      departmentStats,
      semesterStats,
      totalRegistrations: registrations.length
    };
  };

  useEffect(() => {
    if (eventId) {
      fetchEventDetails();
    }
  }, [eventId]);

  // Handle click outside for sticky mode
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportDropdownSticky && exportDropdownOpen) {
        // Find the dropdown container by ID
        const dropdownContainer = document.getElementById('export-dropdown-container');

        // If click is outside the dropdown container, close it
        if (dropdownContainer && !dropdownContainer.contains(event.target)) {
          setExportDropdownOpen(false);
          setExportDropdownSticky(false);
        }
      }
    };

    if (exportDropdownSticky) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [exportDropdownSticky, exportDropdownOpen]);

  // Cleanup blob URLs when component unmounts
  useEffect(() => {
    return () => {
      // Clean up blob URL if it exists when component unmounts
      if (currentCertificateTemplate?.url?.startsWith('blob:')) {
        URL.revokeObjectURL(currentCertificateTemplate.url);
      }
    };
  }, [currentCertificateTemplate]);

  // Real-time updates for attendance availability (update every minute)
  useEffect(() => {
    const interval = setInterval(() => {
      // Trigger re-render to update attendance availability message
      setTimeUpdateTrigger(prev => prev + 1);
    }, 60000); // Update every 60 seconds

    return () => clearInterval(interval);
  }, [event?.start_date, event?.start_time]);

  const ActionButton = ({ onClick, variant = 'secondary', icon: Icon, children, disabled = false, className = "", title = "" }) => {
    const variants = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
      secondary: 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300',
      success: 'bg-green-600 hover:bg-green-700 text-white border-green-600',
      warning: 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600',
      danger: 'bg-red-600 hover:bg-red-700 text-white border-red-600'
    };

    return (
      <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`
          inline-flex items-center px-4 py-2 border rounded-lg font-medium text-sm
          transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variants[variant]} ${className}
        `}
      >
        {Icon && <Icon className={`w-4 h-4 ${children ? 'mr-2' : ''}`} />}
        {children}
      </button>
    );
  };

  const DropdownMenu = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;

    return (
      <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
        <div className="py-1">
          {children}
        </div>
      </div>
    );
  };

  const DropdownItem = ({ onClick, icon: Icon, children, variant = 'default', disabled = false }) => {
    const variants = {
      default: 'text-gray-700 hover:bg-gray-50',
      danger: 'text-red-700 hover:bg-red-50'
    };

    return (
      <button
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        className={`w-full flex items-center px-4 py-2 text-sm text-left ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={disabled ? (isSuperAdmin ? "" : (isEventStarted ? "Cannot edit event after it has started" : "Cannot edit completed event")) : ""}
      >
        {Icon && <Icon className="w-4 h-4 mr-3" />}
        {children}
      </button>
    );
  };

  // Manual refresh function to force reload data
  const refreshData = async () => {
    try {
      setIsLoading(true);
      setError('');


      clearAdminEventCache(eventId);

      // Clear existing data first
      setAttendanceStats(null);
      setEventStats(null);
      setRecentRegistrations([]);

      await fetchEventDetails();
    } catch (error) {
      setError('Failed to refresh data');
      
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEventDetails = async () => {
    try {
      setIsLoading(true);
      setError('');

      

      // Use cached batch fetch to prevent duplicate API calls
      const allData = await fetchAllEventDataWithCache(eventId, adminAPI, {
        includeStats: true,
        includeParticipants: true,
        includeAttendanceStats: true,
        participantFilters: { limit: 5 }
      });

      // Process event details
      if (allData.event?.success) {
        setEvent(allData.event.event);
        
      } else {
        throw new Error(allData.event?.message || 'Failed to fetch event details');
      }

      // Process stats
      if (allData.stats?.success) {
        setEventStats(allData.stats.stats);

      } else {
        pass; // No action needed if stats are not available

      }

      // Process attendance statistics
      if (allData.attendanceStats?.success && allData.attendanceStats.event_id) {
        const stats = allData.attendanceStats;

        // Add timestamp to track freshness
        const timestamp = Date.now();
        stats._fetchedAt = timestamp;

        // Ensure all required fields are present and valid
        const validatedStats = {
          ...stats,
          total_registrations: Math.max(0, stats.total_registrations || 0),
          virtual_attendance_count: Math.max(0, stats.virtual_attendance_count || 0),
          physical_attendance_count: Math.max(0, stats.physical_attendance_count || 0),
          present_count: Math.max(0, stats.present_count || 0),
          virtual_only_count: Math.max(0, stats.virtual_only_count || 0),
          physical_only_count: Math.max(0, stats.physical_only_count || 0),
          absent_count: Math.max(0, stats.absent_count || 0),
          attendance_percentage: Math.min(100, Math.max(0, stats.attendance_percentage || 0)),
          user_type: allData.stats?.stats?.user_type || 'mixed'
        };

        setAttendanceStats(validatedStats);
        
      } else {
        
      }

      // Process recent participants/registrations
      if (allData.participants?.success) {
        const participantsData = allData.participants.participants || allData.participants.registrations || [];

        // Transform participants to match expected frontend structure
        const transformedRecentRegistrations = participantsData.map(reg => {
          if (reg.registration_type === 'individual') {
            if (reg.participant_type === 'faculty') {
              return {
                full_name: reg.full_name || reg.name,
                name: reg.full_name || reg.name,
                employee_id: reg.employee_id,
                email: reg.email,
                department: reg.department,
                designation: reg.designation,
                registration_date: reg.registration_date,
                mobile_no: reg.phone,
                contact_no: reg.phone,
                registration_type: 'individual',
                user_type: 'faculty'
              };
            } else {
              return {
                full_name: reg.full_name || reg.name,
                name: reg.full_name || reg.name,
                enrollment_no: reg.enrollment_no,
                email: reg.email,
                department: reg.department,
                semester: reg.semester,
                registration_date: reg.registration_date,
                mobile_no: reg.phone,
                registration_type: 'individual',
                user_type: 'student'
              };
            }
          } else if (reg.registration_type === 'team') {
            // Handle team registrations - ensure team_members have proper structure
            const teamMembers = reg.team_members || [];

            // Ensure team members have proper name fields
            const processedTeamMembers = teamMembers.map(member => ({
              full_name: member.name || member.full_name || 'Unknown Member',
              name: member.name || member.full_name || 'Unknown Member',
              enrollment_no: member.enrollment_no || '',
              email: member.email || '',
              department: member.department || '',
              semester: member.semester || '',
              phone: member.phone || member.mobile_no || '',
              is_team_leader: member.is_team_leader || false
            }));

            return {
              full_name: reg.team_name || reg.name,
              name: reg.team_name || reg.name,
              team_name: reg.team_name || reg.name,
              team_leader: reg.team_leader,
              team_leader_enrollment: reg.team_leader_enrollment,
              team_size: reg.team_size || teamMembers.length,
              member_count: reg.member_count || teamMembers.length,
              team_members: processedTeamMembers,
              registration_date: reg.registration_date,
              registration_type: 'team',
              user_type: reg.participant_type === 'faculty' ? 'faculty' : 'student'
            };
          }
          return reg;
        });

        setRecentRegistrations(transformedRecentRegistrations);

      } else {
        setRecentRegistrations([]);

      }
    } catch (error) {
      setError('Failed to load event details');
      
    } finally {
      setIsLoading(false);
    }
  };

  // Function to open certificate template in modal
  const openCertificateTemplate = async (templateUrl, templateType) => {
    try {
      // Fetch the HTML content
      const response = await fetch(templateUrl);
      if (!response.ok) {
        throw new Error('Failed to load template');
      }
      const htmlContent = await response.text();

      // Create a blob URL from the HTML content so it renders properly
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);

      setCurrentCertificateTemplate({
        url: blobUrl,
        type: templateType,
        originalUrl: templateUrl
      });
      setCertificateModalOpen(true);
    } catch (error) {
      
      // Fallback to original URL if fetch fails
      setCurrentCertificateTemplate({
        url: templateUrl,
        type: templateType,
        originalUrl: templateUrl
      });
      setCertificateModalOpen(true);
    }
  };

  const handleDeleteEvent = async () => {
    try {
      const response = await adminAPI.deleteEvent(eventId);
      if (response.data.success) {
        // Clear cache after successful deletion
        clearAdminEventCache(eventId);


        navigate('/admin/events', {
          state: { message: 'Event deleted successfully' }
        });
      } else {
        throw new Error(response.data.message || 'Failed to delete event');
      }
    } catch (error) {
      // Provide more user-friendly error messages
      let errorMessage = 'Failed to delete event: ';
      if (error.message.includes('existing registrations')) {
        errorMessage = 'Cannot delete this event because it has existing registrations. Please contact participants and cancel their registrations first, or consider marking the event as cancelled instead of deleting it.';
      } else {
        errorMessage += error.message;
      }

      alert(errorMessage);
    }
    setDeleteModalOpen(false);
  };

  const fetchAllRegistrations = async () => {
    try {
      setModalLoading(true);


      // Use cached fetch for all participants
      const response = await fetchParticipantsWithCache(eventId, adminAPI, {});

      if (response?.success) {
        // Handle new unified API response structure
        const participants = response.participants || [];


        // Transform participants to match expected frontend structure
        // For modal, keep teams as single entries (don't expand into individual members)
        const transformedParticipants = [];
        const seenTeams = new Set(); // Track teams to avoid duplicates

        participants.forEach(participant => {
          if (participant.registration_type === 'individual') {
            if (participant.participant_type === 'faculty') {
              // Faculty individual registration
              transformedParticipants.push({
                full_name: participant.full_name || participant.name,
                name: participant.full_name || participant.name,
                employee_id: participant.employee_id,
                email: participant.email,
                department: participant.department,
                designation: participant.designation,
                registration_date: participant.registration_date,
                mobile_no: participant.phone,
                contact_no: participant.phone,
                phone: participant.phone,
                registration_id: participant.registration_id,
                registration_type: 'individual',
                user_type: 'faculty'
              });
            } else {
              // Student individual registration
              transformedParticipants.push({
                full_name: participant.full_name || participant.name,
                name: participant.full_name || participant.name,
                enrollment_no: participant.enrollment_no,
                email: participant.email,
                department: participant.department,
                semester: participant.semester,
                registration_date: participant.registration_date,
                mobile_no: participant.phone,
                phone: participant.phone,
                registration_id: participant.registration_id,
                registration_type: 'individual',
                user_type: 'student'
              });
            }
          } else if (participant.registration_type === 'team') {
            // Check if we've already processed this team (prevent duplicates)
            const teamKey = participant.registration_id || participant.team_name || `team_${participant.name}`;
            if (seenTeams.has(teamKey)) {

              return; // Skip this duplicate team entry
            }
            seenTeams.add(teamKey);

            // For teams in modal, keep as single team entry (not expanded)
            const teamMembers = participant.team_members || [];

            // Ensure team members have proper structure
            const processedTeamMembers = teamMembers.map(member => ({
              full_name: member.name || member.full_name || 'Unknown Member',
              name: member.name || member.full_name || 'Unknown Member',
              enrollment_no: member.enrollment_no || '',
              email: member.email || '',
              department: member.department || '',
              semester: member.semester || '',
              phone: member.phone || member.mobile_no || '',
              is_team_leader: member.is_team_leader || false
            }));

            transformedParticipants.push({
              full_name: participant.team_name || participant.name,
              name: participant.team_name || participant.name,
              team_name: participant.team_name || participant.name,
              team_leader: participant.team_leader,
              team_leader_enrollment: participant.team_leader_enrollment,
              team_size: participant.team_size || participant.member_count,
              member_count: participant.member_count || participant.team_size,
              team_members: processedTeamMembers,
              registration_date: participant.registration_date,
              registration_id: participant.registration_id,
              registration_type: 'team',
              user_type: participant.participant_type || 'student'
            });


          }
        });


        setAllRegistrations(transformedParticipants);
      } else {
        setAllRegistrations([]);
      }
    } catch (error) {
      
      setAllRegistrations([]);
    } finally {
      setModalLoading(false);
    }
  };

  const fetchAttendees = async () => {
    try {
      setModalLoading(true);
      

      // Use cached fetch for participants with attendance details
      const response = await fetchParticipantsWithCache(eventId, adminAPI, { include_attendance: true });

      if (response?.success) {
        // The API returns participants in response.participants structure
        const allParticipants = response.participants || [];
        

        // For now, let's show all attendees to debug the issue
        // Filter for participants who have BOTH virtual and physical attendance (present status)
        const presentParticipants = allParticipants.filter(participant => {
          const hasVirtual = participant.virtual_attendance_id;
          const hasPhysical = participant.physical_attendance_id;
          const isPresent = participant.final_attendance_status === 'present';
          return isPresent || (hasVirtual && hasPhysical);
        });
        setAttendeesList(presentParticipants);
      } else {
        
        setAttendeesList([]);
      }
    } catch (error) {
      
      setAttendeesList([]);
    } finally {
      setModalLoading(false);
    }
  };

  const handleViewAllRegistrations = async () => {
    setRegistrationsModalOpen(true);
    if (allRegistrations.length === 0) {
      await fetchAllRegistrations();
    }
  };

  const handleViewAttendees = async () => {
    setAttendeesModalOpen(true);
    if (attendeesList.length === 0) {
      await fetchAttendees();
    }
  };

  const handleViewAttendanceBreakdown = async () => {
    setAttendanceStatsModalOpen(true);
    // Attendance stats are already loaded, no need to fetch again
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

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatCompactDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatOrdinalNumber = (number) => {
    if (!number || isNaN(number)) return 'N/A';
    const num = parseInt(number);
    const suffix = ['th', 'st', 'nd', 'rd'];
    const value = num % 100;
    const ordinal = suffix[(value - 20) % 10] || suffix[value] || suffix[0];
    return (
      <span>
        {num}<sup className="text-xs">{ordinal}</sup> Semester
      </span>
    );
  };

  // PDF download function
  const handleHTMLPrint = async () => {
    try {
      const htmlContent = await eventPDFService.generatePDFHTML(event, user);
      const newWindow = window.open('', '_blank');
      newWindow.document.write(htmlContent);
      newWindow.document.close();

      // Wait for content to load, then print
      newWindow.onload = () => {
        newWindow.print();
      };
    } catch (error) {
      alert('Error generating PDF. Please try again.');
    }
  };

  // Event Report Generation Function
  const handleEventReportGeneration = async (reportData) => {
    try {
      setError(''); // Clear any previous errors
      
      // Generate event report with uploaded data
      const response = await adminAPI.generateEventReport(eventId, {
        ...reportData,
        format: 'html'
      });
      
      if (response.data) {
        // Open the generated report in a new window
        const newWindow = window.open('', '_blank');
        newWindow.document.write(response.data);
        newWindow.document.close();
        
        // Optional: Trigger print dialog after a short delay
        setTimeout(() => {
          newWindow.print();
        }, 1000);
      } else {
        throw new Error('No report data received');
      }
      
    } catch (error) {
      console.error('Error generating event report:', error);
      setError('Failed to generate event report. Please try again.');
      alert('Failed to generate event report. Please try again.');
    }
  };

  const filteredRegistrations = allRegistrations.filter(reg => {
    const searchMatch = !searchTerm ||
      (reg.full_name && reg.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (reg.name && reg.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (reg.email && reg.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (reg.enrollment_no && reg.enrollment_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (reg.employee_id && reg.employee_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (reg.team_name && reg.team_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const statusMatch = statusFilter === 'all' ||
      (statusFilter === 'attended' && (reg.attended || reg.attendance_status === 'attended')) ||
      (statusFilter === 'not-attended' && (!reg.attended && reg.attendance_status !== 'attended'));

    return searchMatch && statusMatch;
  });

  const getStatusConfig = (status) => {
    const configs = {
      ongoing: { bg: 'bg-green-100', text: 'text-green-800', icon: 'fas fa-play-circle' },
      upcoming: { bg: 'bg-blue-100', text: 'text-blue-800', icon: 'fas fa-clock' },
      completed: { bg: 'bg-gray-100', text: 'text-gray-800', icon: 'fas fa-check-circle' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: 'fas fa-times-circle' }
    };
    return configs[status] || configs.upcoming;
  };

  const canEdit = user && ['super_admin', 'organizer_admin'].includes(user.role);
  const canDelete = user && ['super_admin', 'organizer_admin'].includes(user.role);
  const isReadOnly = false; // No longer read-only for organizer_admin

  // Helper function to check if attendance can be taken (3 hours before event start)
  const canTakeAttendanceNow = () => {
    if (isSuperAdmin) return true; // Super admin can always take attendance
    
    if (!event?.start_date || !event?.start_time) return false;
    
    try {
      // Combine start_date and start_time to create event start datetime
      // Ensure proper format handling for different date/time formats
      const dateStr = event.start_date.includes('T') ? event.start_date.split('T')[0] : event.start_date;
      const timeStr = event.start_time;
      const eventStartDateTime = new Date(`${dateStr}T${timeStr}`);
      
      // Validate the date
      if (isNaN(eventStartDateTime.getTime())) {
        console.error('Invalid event start date/time:', event.start_date, event.start_time);
        return false;
      }
      
      const currentTime = new Date();
      
      // Calculate time difference in milliseconds
      const timeDifference = eventStartDateTime.getTime() - currentTime.getTime();
      
      // Convert 3 hours to milliseconds (3 * 60 * 60 * 1000)
      const threeHoursInMs = 3 * 60 * 60 * 1000;
      
      // Allow attendance if current time is within 3 hours of event start (or after event has started)
      const canTake = timeDifference <= threeHoursInMs;
      
      console.log('Attendance availability check:', {
        eventStart: eventStartDateTime.toLocaleString(),
        currentTime: currentTime.toLocaleString(),
        timeDifference: Math.round(timeDifference / (1000 * 60)) + ' minutes',
        canTakeAttendance: canTake
      });
      
      return canTake;
    } catch (error) {
      console.error('Error calculating attendance availability:', error);
      return false;
    }
  };

  // Helper function to get attendance availability message
  const getAttendanceAvailabilityMessage = () => {
    if (isSuperAdmin) return null; // Super admin doesn't need this message
    
    if (!event?.start_date || !event?.start_time) return "Event start time not set";
    
    try {
      // Ensure proper format handling for different date/time formats
      const dateStr = event.start_date.includes('T') ? event.start_date.split('T')[0] : event.start_date;
      const timeStr = event.start_time;
      const eventStartDateTime = new Date(`${dateStr}T${timeStr}`);
      
      // Validate the date
      if (isNaN(eventStartDateTime.getTime())) {
        return "Invalid event start time";
      }
      
      const currentTime = new Date();
      const timeDifference = eventStartDateTime.getTime() - currentTime.getTime();
      const threeHoursInMs = 3 * 60 * 60 * 1000;
      
      if (timeDifference <= threeHoursInMs) {
        return null; // Attendance is available
      }
      
      // Calculate when attendance will be available (3 hours before event)
      const attendanceAvailableTime = new Date(eventStartDateTime.getTime() - threeHoursInMs);
      const timeUntilAvailable = attendanceAvailableTime.getTime() - currentTime.getTime();
      
      if (timeUntilAvailable > 0) {
        const daysUntil = Math.floor(timeUntilAvailable / (1000 * 60 * 60 * 24));
        const hoursUntil = Math.floor((timeUntilAvailable % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutesUntil = Math.floor((timeUntilAvailable % (1000 * 60 * 60)) / (1000 * 60));
        
        if (daysUntil > 0) {
          return `Attendance will be available in ${daysUntil}d ${hoursUntil}h (3 hours before event start)`;
        } else if (hoursUntil > 0) {
          return `Attendance will be available in ${hoursUntil}h ${minutesUntil}m (3 hours before event start)`;
        } else {
          return `Attendance will be available in ${minutesUntil} minutes`;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error calculating attendance message:', error);
      return "Unable to determine attendance availability";
    }
  };

  // Conditional button states based on event status
  const isEventStarted = event?.status === 'ongoing' || event?.sub_status === 'event_started';
  const isEventCompleted = event?.status === 'completed';
  const isSuperAdmin = user?.role === 'super_admin';
  const canTakeAttendance = canTakeAttendanceNow(); // Use new time-based logic
  const canEditEvent = isSuperAdmin || (canEdit && !isEventStarted && !isEventCompleted); // Super admin can always edit, others only when event hasn't started and isn't completed



  const InfoCard = ({ icon: Icon, title, children, className = "" }) => (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );

  const InfoRow = ({ label, value, className = "" }) => (
    <div className={`flex justify-between items-start py-2 ${className}`}>
      <span className="text-sm font-medium text-gray-600">{label}</span>
      <span className="text-sm text-gray-900 text-right max-w-[60%]">{value || 'N/A'}</span>
    </div>
  );

  const Badge = ({ children, variant = "default" }) => {
    const variants = {
      default: "bg-gray-100 text-gray-800",
      primary: "bg-blue-100 text-blue-800",
      success: "bg-green-100 text-green-800"
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${variants[variant]}`}>
        {children}
      </span>
    );
  };


  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="text-center py-16 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
          <div className="w-20 h-20 bg-red-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-exclamation-triangle text-2xl text-red-600"></i>
          </div>
          <h3 className="text-xl font-bold text-red-700 mb-3">Error Loading Event</h3>
          <p className="text-red-600 mb-6 max-w-md mx-auto">{error}</p>
          <div className="space-x-3">
            <button
              onClick={fetchEventDetails}
              className="inline-block px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
            >
              <i className="fas fa-sync mr-2"></i>Try Again
            </button>
            <button
              onClick={() => navigate('/admin/events')}
              className="inline-block px-6 py-3 border-2 border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-semibold"
            >
              <i className="fas fa-arrow-left mr-2"></i>Back to Events
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!event) {
    return (
      <AdminLayout>

      </AdminLayout>
    );
  }

  const statusConfig = getStatusConfig(event.status);
  // Compute a safe attendance percentage to display in the header
  const attendancePercent = attendanceStats
    ? attendanceStats.attendance_percentage
    : (eventStats && eventStats.registrations_count ? Math.round(((eventStats.attendance_count || 0) / eventStats.registrations_count) * 100) : 0);

  return (
    <AdminLayout pageTitle={`${event.event_name} - Event Management`}>
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4">

          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            {/* Breadcrumb and Status */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <button
                onClick={() => navigate('/admin/events')}
                className="inline-flex items-center text-gray-600 hover:text-blue-600 transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Events
              </button>

              <div className="flex items-center gap-3">
                {/* Refresh Button - Styled as online indicator */}
                <button
                  onClick={refreshData}
                  disabled={isLoading}
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-xl bg-blue-100 hover:bg-blue-200 transition-colors ${isLoading ? 'cursor-wait' : 'cursor-pointer'}`}
                  title={isLoading ? 'Refreshing data...' : 'Refresh event data'}
                >
                  <RefreshCw className={`w-4 h-4 text-blue-600 ${isLoading ? 'animate-spin' : ''}`} />
                </button>

                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                  <div className={`${statusConfig.icon} mr-2`}></div>
                  {event.status?.charAt(0).toUpperCase() + event.status?.slice(1)}
                </div>
                <span className="text-sm text-gray-500 font-mono">ID: {event.event_id}</span>
              </div>
            </div>

            {/* Main Title */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-blue-50 mb-4">
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.event_name}</h1>
              <p className="text-gray-600">{event.event_type} • Event Management Dashboard</p>
            </div>

            {/* Action Buttons */}
            {/* Action Buttons with conditional enabling based on event status */}
            <div className="flex flex-wrap justify-center gap-3">
              {/* Export Dropdown Button */}


              <ActionButton
                onClick={() => navigate(`/admin/events/${eventId}/attendance`)}
                variant="warning"
                icon={UserCheck}
                disabled={!canTakeAttendance}
                className={!canTakeAttendance ? "cursor-not-allowed" : ""}
                title={!canTakeAttendance ? (isSuperAdmin ? "Take attendance for this event" : "Attendance can be taken starting 3 hours before the event begins") : "Take attendance for this event"}
              >
                Attendance
              </ActionButton>

              <ActionButton
                onClick={() => {
                  // Navigate to feedback management page with registration data
                  navigate(`/admin/events/${eventId}/feedback`, {
                    state: { 
                      registrations_count: eventStats?.registrations_count || allRegistrations?.length || 0,
                      event_data: event,
                      event_stats: eventStats 
                    }
                  });
                }}
                variant="primary"
                icon={FileText}
                title="View and manage feedback for this event"
              >
                Feedback
              </ActionButton>

              {/* Desktop: Show all buttons */}
              <div className="hidden lg:flex gap-3">
                {canEdit && (
                  <ActionButton
                    onClick={() => navigate(`/admin/events/${eventId}/edit`, {
                      state: { eventData: event }
                    })}
                    variant="secondary"
                    icon={Edit3}
                    disabled={!canEditEvent}
                    title={!canEditEvent ? (isSuperAdmin ? "Edit event details" : "Cannot edit event after it has started or when completed") : "Edit event details"}
                  >
                    Edit Event
                  </ActionButton>
                )}
                <div
                  className="relative"
                  id="export-dropdown-container"
                  onMouseEnter={() => {
                    if (!exportDropdownSticky) {
                      setExportDropdownOpen(true);
                    }
                  }}
                  onMouseLeave={() => {
                    if (!exportDropdownSticky) {
                      setExportDropdownOpen(false);
                    }
                  }}
                >
                  <ActionButton
                    onClick={() => {
                      // Toggle sticky mode and keep dropdown open
                      setExportDropdownSticky(!exportDropdownSticky);
                      setExportDropdownOpen(true);
                    }}
                    variant="success"
                    icon={Download}
                    className="flex items-center"
                  >
                    Export Data
                    <i className={`fas fa-chevron-down ml-2 text-xs transition-transform ${exportDropdownOpen ? 'rotate-180' : ''}`}></i>
                  </ActionButton>

                  {/* Dropdown Menu with seamless hover area */}
                  {exportDropdownOpen && (
                    <div className="absolute right-0 top-full w-48 z-10">
                      {/* Invisible bridge to prevent hover gap issues */}
                      <div className="h-2 w-full"></div>
                      <div className="bg-white border border-gray-200 rounded-lg shadow-lg">
                        <div className="py-1">
                          <div
                            className="w-full flex items-center px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              navigate(`/admin/events/${eventId}/export`);
                              setExportDropdownOpen(false);
                              setExportDropdownSticky(false);
                            }}
                          >
                            <Download className="w-4 h-4 mr-3" />
                            Custom Export
                          </div>
                          <div
                            className="w-full flex items-center px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              handleHTMLPrint();
                              setExportDropdownOpen(false);
                              setExportDropdownSticky(false);
                            }}
                          >
                            <FileDown className="w-4 h-4 mr-3" />
                            Event Details
                          </div>

                          {/* Divider */}
                          <div className="border-t border-gray-200 my-1"></div>

                          {/* Additional Report Options */}
                          <div
                            className="w-full flex items-center px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 cursor-pointer"
                            onClick={async () => {
                              try {
                                // Generate budget report
                                const response = await adminAPI.generateBudgetReport(eventId, { format: 'html' });
                                
                                // Open in new window for printing/downloading
                                const newWindow = window.open('', '_blank');
                                newWindow.document.write(response.data);
                                newWindow.document.close();
                                
                              } catch (error) {
                                console.error('Error generating budget report:', error);
                                alert('Failed to generate budget report. Please try again.');
                              }
                              setExportDropdownOpen(false);
                              setExportDropdownSticky(false);
                            }}
                          >
                            <CreditCard className="w-4 h-4 mr-3" />
                            Budget Report
                          </div>
                          <div
                            className="w-full flex items-center px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 cursor-pointer"
                            onClick={async () => {
                              try {
                                // Generate sign sheet PDF
                                const response = await adminAPI.generateSignSheet(eventId, { format: 'html' });
                                
                                // Open in new window for printing/downloading
                                const newWindow = window.open('', '_blank');
                                newWindow.document.write(response.data);
                                newWindow.document.close();
                                
                                // Optional: Trigger print dialog
                                setTimeout(() => {
                                  newWindow.print();
                                }, 1000);
                                
                              } catch (error) {
                                console.error('Error generating sign sheet:', error);
                                alert('Failed to generate sign sheet. Please try again.');
                              }
                              setExportDropdownOpen(false);
                              setExportDropdownSticky(false);
                            }}
                          >
                            <FileText className="w-4 h-4 mr-3" />
                            Sign Sheet
                          </div>
                          <div
                            className="w-full flex items-center px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 cursor-pointer"
                            onClick={async () => {
                              try {
                                // Generate attendance report
                                const response = await adminAPI.generateAttendanceReport(eventId, { format: 'html' });
                                
                                // Open in new window for printing/downloading
                                const newWindow = window.open('', '_blank');
                                newWindow.document.write(response.data);
                                newWindow.document.close();
                                
                              } catch (error) {
                                console.error('Error generating attendance report:', error);
                                alert('Failed to generate attendance report. Please try again.');
                              }
                              setExportDropdownOpen(false);
                              setExportDropdownSticky(false);
                            }}
                          >
                            <UserCheck className="w-4 h-4 mr-3" />
                            Attendance Report
                          </div>
                          <div
                            className="w-full flex items-center px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 cursor-pointer"
                            onClick={async () => {
                              try {
                                // Generate feedback report
                                const response = await adminAPI.generateFeedbackReport(eventId, { format: 'html' });
                                
                                // Open in new window for printing/downloading
                                const newWindow = window.open('', '_blank');
                                newWindow.document.write(response.data);
                                newWindow.document.close();
                                
                              } catch (error) {
                                console.error('Error generating feedback report:', error);
                                alert('Failed to generate feedback report. Please try again.');
                              }
                              setExportDropdownOpen(false);
                              setExportDropdownSticky(false);
                            }}
                          >
                            <Users className="w-4 h-4 mr-3" />
                            Feedback Report
                          </div>
                          <div
                            className="w-full flex items-center px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              setEventReportModalOpen(true);
                              setExportDropdownOpen(false);
                              setExportDropdownSticky(false);
                            }}
                          >
                            <FileText className="w-4 h-4 mr-3" />
                            Event Report
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {canDelete && (
                  <ActionButton
                    onClick={() => setDeleteModalOpen(true)}
                    variant="danger"
                    icon={Trash2}
                  >
                    Cancel Event
                  </ActionButton>
                )}
              </div>

              
              {/* Mobile/Tablet: More Actions Dropdown */}
              <div className="relative lg:hidden">
                <ActionButton
                  onClick={() => setShowMoreActions(!showMoreActions)}
                  variant="secondary"
                  icon={MoreHorizontal}
                >
                  More
                </ActionButton>

                <DropdownMenu isOpen={showMoreActions} onClose={() => setShowMoreActions(false)}>
                  {canEdit && (
                    <DropdownItem
                      onClick={() => {
                        if (canEditEvent) {
                          navigate(`/admin/events/${eventId}/edit`, {
                            state: { eventData: event }
                          });
                          setShowMoreActions(false);
                        }
                      }}
                      icon={Edit3}
                      disabled={!canEditEvent}
                    >
                      Edit Event
                    </DropdownItem>
                  )}

                  {canDelete && (
                    <DropdownItem
                      onClick={() => {
                        setDeleteModalOpen(true);
                        setShowMoreActions(false);
                      }}
                      icon={Trash2}
                      variant="danger"
                    >
                      Cancel Event
                    </DropdownItem>
                  )}
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          {eventStats && recentRegistrations && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg stats-card border-l-4 border-blue-500 p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <i className="fas fa-users text-blue-500 text-xl"></i>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-gray-500 text-sm font-medium">Total Registrations</p>
                      <p className="text-lg font-bold text-gray-800">
                        {eventStats.is_team_based ?
                          `Teams: ${recentRegistrations.length || 0}` :
                          `Registrations: ${recentRegistrations.length || 0}`
                        }
                      </p>
                      <p className="text-xs text-gray-400 mt-1">

                        {eventStats.is_team_based ?
                          `Teams: ${recentRegistrations.length || 0} • Participants: ${eventStats.total_participants || 0}` : (eventStats.user_type === 'student' ?
                            `Students Registered`
                            :
                            `Participants Registered`
                          )
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="bg-white rounded-lg stats-card border-l-4 border-purple-500 p-6 hover:shadow-lg transition-all duration-300 cursor-pointer hover:bg-purple-50"
                onClick={handleViewAttendanceBreakdown}
                title="Click to view detailed attendance breakdown"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <i className="fas fa-check-circle text-purple-500 text-xl"></i>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-gray-500 text-sm font-medium">
                        Present Count
                        {attendanceStats && (
                          <i className="fas fa-shield-check text-green-500 ml-1 text-xs" title="Dual-layer verified attendance"></i>
                        )}
                      </p>
                      <p className="text-2xl font-bold text-gray-800">
                        {attendanceStats ? attendanceStats.present_count : (eventStats?.attendance_count || 0)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {attendanceStats ? (
                          <>
                            {attendanceStats.attendance_percentage}% attendance rate
                            <br />
                            <span className="text-green-600 font-medium">Virtual + Physical verified</span>
                          </>
                        ) : (
                          <>
                            {eventStats?.registrations_count > 0 ?
                              `${Math.round((eventStats.attendance_count / eventStats.registrations_count) * 100)}% attendance rate` :
                              '0% attendance rate'
                            }
                            <br />
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-purple-500">
                    <i className="fas fa-chart-pie text-lg"></i>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg stats-card border-l-4 border-yellow-500 p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <i className="fas fa-comments text-yellow-500 text-xl"></i>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-gray-500 text-sm font-medium">Total Feedbacks</p>
                      <p className="text-2xl font-bold text-gray-800">{eventStats.feedback_count || 0}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {eventStats.attendance_count > 0 ?
                          `${Math.round((eventStats.feedback_count / eventStats.attendance_count) * 100)}% feedback rate` :
                          '0% feedback rate'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg stats-card border-l-4 border-green-500 p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <i className="fas fa-certificate text-green-500 text-xl"></i>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-gray-500 text-sm font-medium">Certificates Issued</p>
                      <p className="text-2xl font-bold text-gray-800">{eventStats.certificates_count || 0}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {eventStats.feedback_count > 0 ?
                          `${Math.round((eventStats.certificates_count / eventStats.feedback_count) * 100)}% completion rate` :
                          '0% completion rate'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Team Event Statistics */}
          {eventStats && eventStats.total_team_members > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
                <i className="fas fa-users-cog mr-2"></i>Team Event Statistics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{eventStats.total_team_registrations || 0}</p>
                  <p className="text-sm text-blue-700">Total Teams</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{eventStats.total_team_members || 0}</p>
                  <p className="text-sm text-blue-700">Team Members</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{eventStats.total_individual_registrations || 0}</p>
                  <p className="text-sm text-blue-700">Individual Registrations</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{eventStats.total_participants || 0}</p>
                  <p className="text-sm text-blue-700">Total Participants</p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Statistics */}
          {eventStats && (eventStats.payments_completed > 0 || eventStats.payments_pending > 0) && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center">
                <i className="fas fa-credit-card mr-2"></i>Payment Statistics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{eventStats.payments_completed || 0}</p>
                  <p className="text-sm text-green-700">Payments Complete</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">{eventStats.payments_pending || 0}</p>
                  <p className="text-sm text-yellow-700">Payments Pending</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-600">
                    {((eventStats.payments_completed || 0) + (eventStats.payments_pending || 0)) > 0 ?
                      Math.round(((eventStats.payments_completed || 0) / ((eventStats.payments_completed || 0) + (eventStats.payments_pending || 0))) * 100) :
                      0
                    }%
                  </p>
                  <p className="text-sm text-gray-700">Payment Success Rate</p>
                </div>
              </div>
            </div>
          )}

          {/* Latest Registrations Section - simplified, sober UI */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
                  <i className="fas fa-user-check text-gray-700"></i>
                  Latest Registrations
                </h2>
                <p className="text-sm text-gray-600 mt-1">Showing the most recent {Math.min(recentRegistrations.length, 5)} registrations</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-700">Total: <span className="font-semibold text-gray-900">{recentRegistrations.length}</span></div>
                <button
                  onClick={handleViewAllRegistrations}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
                >
                  <i className="fas fa-list"></i>
                  <span>View All</span>
                </button>
              </div>
            </div>

            {/* Registration List */}
            <div className="space-y-3">
              {recentRegistrations && recentRegistrations.length > 0 ? (
                eventStats?.is_team_based ? (
                  // Team Registrations - compact, clear cards
                  recentRegistrations.map((reg, index) => (
                    <div key={index} className="border rounded-md bg-white shadow-sm">
                      <div className="flex items-center justify-between p-3">
                        <div>
                          <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                            <i className="fas fa-users text-gray-600"></i>
                            <span className="truncate max-w-[36rem]">{reg.team_name || 'Unnamed Team'}</span>
                            {reg.user_type === 'faculty' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                Faculty Team
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">

                            Leader: <span className="font-medium text-gray-700">{reg.team_leader || 'N/A'}</span> • {reg.member_count} members
                            {reg.user_type === 'faculty' ? ' (Faculty)' : ''}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-xs text-gray-500">{formatCompactDateTime(reg.registration_date)}</div>
                          <button
                            onClick={() => toggleTeamExpansion(`recent-${index}`)}
                            className="text-sm text-blue-600 hover:bg-blue-50 px-2 py-1 rounded"
                          >
                            <i className={`fas ${expandedTeams.has(`recent-${index}`) ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                          </button>
                        </div>
                      </div>

                      {expandedTeams.has(`recent-${index}`) && reg.team_members && (
                        <div className="border-t px-3 py-2 bg-gray-50">
                          <div className="text-xs text-gray-600 mb-3 font-medium">Team Members ({reg.member_count})</div>
                          <div className="space-y-3">
                            {reg.team_members.map((member, memberIndex) => (
                              <div key={memberIndex} className="bg-white rounded-lg p-3 border border-gray-200">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <div className="font-medium text-gray-900 truncate">{member.full_name}</div>
                                      {memberIndex === 0 && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                          Team Leader
                                        </span>
                                      )}
                                    </div>
                                    <div className="space-y-1">
                                      <div className="text-xs text-gray-600 flex items-center gap-3">
                                        <span className="flex items-center gap-1">
                                          <i className="fas fa-id-card text-gray-400"></i>
                                          {reg.user_type === 'student' ? member.enrollment_no : member.employee_id}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <i className="fas fa-building text-gray-400"></i>
                                          {member.department}
                                        </span>
                                      </div>
                                      <div className="text-xs text-gray-600 flex items-center gap-3">
                                        <span className="flex items-center gap-1">
                                          <i className="fas fa-envelope text-gray-400"></i>
                                          {(member.email || '').trim()}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          {reg.user_type === 'student' ? (
                                            <>
                                              <i className="fas fa-layer-group text-gray-400"></i>
                                              {formatOrdinalNumber(member.semester)}
                                            </>
                                          ) : (
                                            <>
                                              <i className="fas fa-briefcase text-gray-400"></i>
                                              {member.designation || 'Faculty'}
                                            </>
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  // Individual registrations - clean table-like list
                  <div className="border rounded-md bg-white overflow-hidden">
                    <div className="grid grid-cols-7 gap-2 px-3 py-2 bg-gray-100 text-xs text-gray-700 font-medium">
                      <div className="col-span-1">Name</div>
                      <div className="col-span-1">ID/Enrollment</div>
                      <div className="col-span-1">Department</div>
                      <div className="col-span-1">Sem/Type</div>
                      <div className="col-span-2">Contact</div>
                      <div className="col-span-1">Registrations Date</div>
                    </div>
                    <div>
                      {recentRegistrations.slice(0, 5).map((reg, index) => (
                        <div key={index} className="grid grid-cols-7 gap-2 px-3 py-3 items-center hover:bg-gray-50 text-sm text-gray-800 border-b last:border-0">
                          <div className="col-span-1 truncate flex items-center gap-2">
                            {reg.registration_type === 'team' ? (
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.196-2.121M9 3a4 4 0 014 4v.07a6.951 6.951 0 00-3.36 6.07M9 3a4 4 0 00-4 4v.07A6.951 6.951 0 0014 13.07M9 3h.01M9 3v.07M14 13.07V13a4 4 0 00-4-4M14 13.07V13a4 4 0 014 4v.07M9 6.93a4 4 0 014 4v.07M9 6.93a4 4 0 00-4 4v.07" />
                                </svg>
                                {reg.team_name}
                              </span>
                            ) : (
                              reg.full_name || reg.name || 'N/A'
                            )}
                          </div>
                          <div className="col-span-1 font-mono truncate">
                            {reg.registration_type === 'team' ? (
                              reg.team_leader_enrollment || 'N/A'
                            ) : (
                              reg.user_type === 'faculty' ? (reg.employee_id || 'N/A') : (reg.enrollment_no || 'N/A')
                            )}
                          </div>
                          <div className="col-span-1">{reg.department || 'N/A'}</div>
                          <div className="col-span-1 text-xs">
                            {reg.registration_type === 'team' ? (
                              `Leader: ${reg.team_leader || 'N/A'} • ${reg.member_count} members`
                            ) : (
                              reg.user_type === 'faculty'
                                ? (reg.designation || 'Faculty')
                                : formatOrdinalNumber(reg.semester) || 'N/A'
                            )}
                          </div>
                          <div className="col-span-2 truncate flex flex-col gap-2">
                            <span className='flex flex-row gap-2.5'>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                              </svg>

                              {(reg.email || 'N/A').trim()}
                            </span>
                            <span className='flex flex-row gap-2.5'>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                              </svg>
                              {reg.mobile_no || reg.contact_no || 'N/A'}
                            </span>
                          </div>
                          <div className="col-span-1 text-xs text-gray-500">{formatCompactDateTime(reg.registration_date) || 'N/A'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 mb-3">
                    <i className="fas fa-users text-2xl text-gray-400"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No Recent Registrations</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {eventStats?.registrations_count > 0
                      ? `There are ${eventStats.registrations_count} total registrations, but none showing in recent list.`
                      : 'No one has registered for this event yet.'
                    }
                  </p>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => fetchEventDetails()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                    >
                      <i className="fas fa-sync mr-2"></i>Refresh
                    </button>
                    {eventStats?.registrations_count > 0 && (
                      <button
                        onClick={handleViewAllRegistrations}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
                      >
                        <i className="fas fa-list mr-2"></i>View All
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Event Details Section */}


          <div className="max-w-7xl mx-auto min-h-screen">
            {/* Header */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Event Details</h1>
                  <p className="text-sm text-gray-600 mt-1">Manage and view comprehensive event information</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Event ID</div>
                  <div className="text-sm font-mono text-gray-900">{event.event_id}</div>
                </div>
              </div>

              {/* Event Summary */}
              <div className="flex items-center gap-4 justify-center">
                <div className="w-24 h-24 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-14 h-14 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">{event.event_name}</h2>
                  <p className="text-gray-600 mb-3">{event.short_description}</p>
                </div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Basic Information */}
                <InfoCard icon={FileText} title="Basic Information">
                  <div className="space-y-0 divide-y divide-gray-100">
                    <InfoRow label="Event Type" value={event.event_type?.charAt(0).toUpperCase() + event.event_type?.slice(1)} />
                    <InfoRow label="Target Audience" value={event.target_audience?.charAt(0).toUpperCase() + event.target_audience?.slice(1)} />
                    <InfoRow label="Mode" value={event.mode?.charAt(0).toUpperCase() + event.mode?.slice(1)} />
                    <InfoRow label="Status" value={event.status?.charAt(0).toUpperCase() + event.status?.slice(1)} />
                  </div>
                  {event.detailed_description && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="text-sm font-medium text-gray-600 mb-2">Description</div>
                      <p className="text-sm text-gray-900 leading-relaxed">{event.detailed_description}</p>
                    </div>
                  )}
                </InfoCard>

                {/* Registration & Pricing */}
                <InfoCard icon={CreditCard} title="Registration & Pricing">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {event.is_paid ? `₹${event.registration_fee}` : 'FREE'}
                      </div>
                      <div className="text-xs text-gray-600">Registration Fee</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {event.is_team_based ? 'Team' : 'Individual'}
                      </div>
                      <div className="text-xs text-gray-600">Participation Mode</div>
                    </div>
                  </div>
                  <div className="space-y-0 divide-y divide-gray-100">
                    <InfoRow label="Min Participants" value={event.min_participants || 1} />
                    <InfoRow label="Max Participants" value={event.max_participants || 'Unlimited'} />

                    {/* Team Size Range - Only show for team-based events */}
                    {event.is_team_based && (
                      <InfoRow
                        label="Team Size"
                        value={(() => {
                          const minSize = event.min_team_size || event.team_size_min || 2;
                          const maxSize = event.max_team_size || event.team_size_max || 'Unlimited';
                          return `${minSize} - ${maxSize}`;
                        })()}
                      />
                    )}
                  </div>
                </InfoCard>
                {/* Organizers */}
                <InfoCard icon={Users} title="Organizers">
                  <div className="space-y-3">
                    {event.organizer_details && event.organizer_details.length > 0 ? (
                      event.organizer_details.map((organizer, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-gray-600" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{organizer.full_name || 'Unnamed'}</div>
                            <div className="text-sm text-gray-600">{organizer.email}</div>
                            {organizer.employee_id && (
                              <div className="text-xs text-gray-500">ID: {organizer.employee_id}</div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-600 text-center py-4">No organizer information available</div>
                    )}
                  </div>
                </InfoCard>

                {/* Contacts */}
                <InfoCard icon={Phone} title="Contact Information">
                  <div className="space-y-3">
                    {event.contacts && event.contacts.length > 0 ? (
                      event.contacts.map((contact, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            {contact.contact.includes('@') ? (
                              <Mail className="w-5 h-5 text-gray-600" />
                            ) : (
                              <Phone className="w-5 h-5 text-gray-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{contact.name}</div>
                            <div className="text-sm text-gray-600">{contact.contact}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-600 text-center py-4">No contact information available</div>
                    )}
                  </div>
                </InfoCard>

              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Schedule */}
                <InfoCard icon={Clock} title="Schedule">
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-gray-900">Registration Period</div>
                          <div className="text-xs text-gray-600">Opens → Closes</div>
                        </div>
                        <div className="text-right text-sm text-gray-900 flex gap-2">
                          <div>{formatDateTime(event.registration_start_date)}</div>
                          <div className="text-gray-600">--</div>
                          <div>{formatDateTime(event.registration_end_date)}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg ">
                        <div>
                          <div className="text-sm font-medium text-gray-900">Event Period</div>
                          <div className="text-xs text-gray-600">Start → End</div>
                        </div>
                        <div className="text-right text-sm text-gray-900 flex gap-2">
                          <div>{formatDateTime(event.start_datetime)}</div>
                          <div className="text-gray-600">--</div>
                          <div>{formatDateTime(event.end_datetime)}</div>
                        </div>
                      </div>

                    </div>
                  </div>
                </InfoCard>

                {/* Venue & Location */}
                <InfoCard icon={MapPin} title="Venue & Location">
                  <div className="space-y-0 divide-y divide-gray-100">
                    <InfoRow label="Mode" value={event.mode?.charAt(0).toUpperCase() + event.mode?.slice(1)} />
                    <InfoRow label="Venue" className='text-wrap' value={event.venue} />
                  </div>
                </InfoCard>

                {/* Student Eligibility Criteria - For student events only */}
                {event.target_audience === 'student' && (event.student_department?.length > 0 || event.student_semester?.length > 0) && (
                  <InfoCard icon={Users} title="Student Eligibility Criteria">
                    <div className="space-y-4">
                      {/* Department Eligibility */}
                      {event.student_department && event.student_department.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium text-gray-700 flex items-center">
                              <i className="fas fa-building text-blue-600 mr-2"></i>Eligible Departments
                            </h4>
                            <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-full">
                              {event.student_department.length} dept{event.student_department.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {event.student_department.map((dept, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {dept}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Semester Eligibility */}
                      {event.student_semester && event.student_semester.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium text-gray-700 flex items-center">
                              <i className="fas fa-calendar-alt text-green-600 mr-2"></i>Eligible Semesters
                            </h4>
                            <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded-full">
                              {event.student_semester.length} sem{event.student_semester.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {event.student_semester
                              .sort((a, b) => parseInt(a) - parseInt(b))
                              .map((sem, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800"
                                >
                                  {sem === '1' ? '1st' : sem === '2' ? '2nd' : sem === '3' ? '3rd' : `${sem}th`} Semester
                                </span>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Additional eligibility info if available */}
                      {event.custom_text && event.custom_text.trim() && (
                        <div className="pt-3 border-t border-gray-100">
                          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <i className="fas fa-info-circle text-indigo-600 mr-2"></i>Additional Eligibility
                          </h4>
                          <p className="text-sm text-gray-600 leading-relaxed">{event.custom_text}</p>
                        </div>
                      )}
                    </div>
                  </InfoCard>
                )}
                {/* Certificates */}
                <InfoCard icon={Award} title="Certificates & Poster">
                  <div className="space-y-0 divide-y divide-gray-100">
                    <InfoRow label="Available Until" value={formatDateTime(event.certificate_end_date)} />
                    {event.assets && event.assets.length > 0 && (
                      <InfoRow label="Assets" value={`${event.assets.length} file(s) attached`} />
                    )}
                    {/* Show certificate template details if available */}
                    {(event.certificate_template || event.certificate_templates) && (
                      <div className="pt-3">
                        <div className="text-sm text-gray-600">
                          Template Status: <span className="text-green-600 font-medium">Configured</span>
                        </div>
                        {event.certificate_templates && typeof event.certificate_templates === 'object' && (
                          <div className="mt-2 text-xs text-gray-500">
                            Available templates: {Object.keys(event.certificate_templates).join(', ')}
                          </div>
                        )}
                        {/* Certificate Template View Buttons */}
                        {event.certificate_templates && Object.keys(event.certificate_templates).length > 0 && (
                          <div className="mt-3 space-y-2">
                            {Object.entries(event.certificate_templates).map(([templateType, templateUrl], index) => (
                              <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                                <div>
                                  <p className="text-sm font-medium text-gray-700">{templateType}</p>
                                  <p className="text-xs text-gray-500">Click to view certificate template</p>
                                </div>
                                <button
                                  onClick={() => openCertificateTemplate(templateUrl, templateType)}
                                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  <Eye className="w-4 h-4" />
                                  View
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Event Poster Section */}
                    <div className="pt-3">
                      <div className="text-sm text-gray-600 mb-3">
                        Event Poster: {event.event_poster_url ? (
                          <span className="text-green-600 font-medium">Available</span>
                        ) : (
                          <span className="text-gray-500 font-medium">Not Available</span>
                        )}
                      </div>
                      {event.event_poster_url ? (
                        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-gray-700">Event Poster</p>
                            <p className="text-xs text-gray-500">Click to view event poster</p>
                          </div>
                          <button
                            onClick={() => setPosterModalOpen(true)}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                        </div>
                      ) : (
                        <div className="text-center py-4 bg-gray-50 rounded-lg">
                          <p className="text-gray-500 text-sm">No poster available</p>
                          <p className="text-xs text-gray-400 mt-1">Set one in event settings</p>
                        </div>
                      )}
                    </div>
                  </div>
                </InfoCard>

              </div>
            </div>


            {/* Attendance Strategy Preview */}
            {(event.attendance_strategy || event.dynamic_attendance) && (
              <div className="mb-8 mt-4">
                <InfoCard icon={CheckCircle} title="Attendance Strategy">
                  <div className="space-y-4">
                    {/* Strategy Overview - Bullet Points Format */}
                    <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <div className="flex-1 flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Strategy Type:</span>
                            <span className="text-sm font-semibold text-gray-900 bg-green-50 px-3 py-1 rounded-full">
                              {getStrategyDisplayName(
                                typeof event.attendance_strategy === 'string'
                                  ? event.attendance_strategy
                                  : event.attendance_strategy?.strategy_type ||
                                  event.attendance_strategy?.strategy ||
                                  event.dynamic_attendance?.strategy_type ||
                                  event.dynamic_attendance?.strategy ||
                                  'session_based'
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <div className="flex-1 flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Pass Criteria:</span>
                            <span className="text-sm font-semibold text-gray-900 bg-blue-50 px-3 py-1 rounded-full">
                              {event.minimum_attendance_percentage ||
                                (typeof event.pass_criteria === 'number' ? event.pass_criteria : event.pass_criteria?.minimum_percentage) ||
                                event.attendance_strategy?.minimum_percentage ||
                                event.attendance_strategy?.pass_criteria?.minimum_percentage ||
                                event.dynamic_attendance?.minimum_percentage ||
                                event.dynamic_attendance?.pass_criteria?.minimum_percentage ||
                                75}% required
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                          <div className="flex-1 flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Total Sessions:</span>
                            <span className="text-sm font-semibold text-gray-900 bg-purple-50 px-3 py-1 rounded-full">
                              {(() => {
                                const sessionCount = event.attendance_strategy?.sessions?.length ||
                                  event.dynamic_attendance?.sessions?.length ||
                                  event.sessions?.length || 0;
                                return `${sessionCount} session${sessionCount !== 1 ? 's' : ''}`;
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Session Overview */}
                    {(() => {
                      const sessions = event.attendance_strategy?.sessions ||
                        event.dynamic_attendance?.sessions ||
                        event.sessions || [];

                      return sessions.length > 0 && (
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m0 10v-5a2 2 0 012-2h2a2 2 0 012 2v5a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                              </div>
                              <h5 className="text-sm font-medium text-gray-900">Session Overview</h5>
                            </div>
                            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                              {sessions.length} session{sessions.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="space-y-3">
                            {sessions.slice(0, 5).map((session, idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="flex items-center space-x-3">
                                  <div className="flex-shrink-0">
                                    <span className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center text-sm font-semibold">
                                      {idx + 1}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      {session?.session_name || session?.name || session?.title || `Session ${idx + 1}`}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      Session {idx + 1} of {sessions.length}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="space-y-1">
                                    {/* Duration */}
                                    <p className="text-sm font-medium text-gray-900">
                                      {(() => {
                                        // Check if we have explicit duration
                                        if (session?.duration_minutes || session?.duration) {
                                          const duration = session.duration_minutes || session.duration;
                                          return `${Math.floor(duration / 60)}h ${duration % 60}m`;
                                        }
                                        // Calculate duration from start_time and end_time
                                        else if (session.start_time && session.end_time) {
                                          const start = new Date(session.start_time);
                                          const end = new Date(session.end_time);
                                          const durationMs = end - start;
                                          const durationMinutes = Math.floor(durationMs / (1000 * 60));
                                          const hours = Math.floor(durationMinutes / 60);
                                          const minutes = durationMinutes % 60;
                                          return `${hours}h ${minutes}m`;
                                        }
                                        // Fallback
                                        else {
                                          return 'Duration TBD';
                                        }
                                      })()}
                                    </p>

                                    {/* Start/End Times */}
                                    {session.start_time || session.end_time || session.scheduled_time ? (
                                      <div className="text-xs text-gray-500 space-y-0.5">
                                        {session.start_time && (
                                          <div>
                                            <span className="font-medium">Start:</span> {new Date(session.start_time).toLocaleString('en-US', {
                                              month: 'short',
                                              day: 'numeric',
                                              year: 'numeric',
                                              hour: 'numeric',
                                              minute: '2-digit'
                                            })}
                                          </div>
                                        )}
                                        {session.end_time && (
                                          <div>
                                            <span className="font-medium">End:</span> {new Date(session.end_time).toLocaleString('en-US', {
                                              month: 'short',
                                              day: 'numeric',
                                              year: 'numeric',
                                              hour: 'numeric',
                                              minute: '2-digit'
                                            })}
                                          </div>
                                        )}
                                        {!session.start_time && !session.end_time && session.scheduled_time && (
                                          <div>
                                            {new Date(session.scheduled_time).toLocaleString('en-US', {
                                              month: 'short',
                                              day: 'numeric',
                                              year: 'numeric',
                                              hour: 'numeric',
                                              minute: '2-digit'
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-gray-500">Time TBD</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}

                            {sessions.length > 5 && (
                              <div className="text-center">
                                <span className="text-sm text-gray-500 bg-gray-100 px-4 py-2 rounded-lg">
                                  ... and {sessions.length - 5} more session{sessions.length - 5 !== 1 ? 's' : ''}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Show empty state only if no sessions found but strategy exists */}
                    {(() => {
                      const sessions = event.attendance_strategy?.sessions ||
                        event.dynamic_attendance?.sessions ||
                        event.sessions || [];

                      return sessions.length === 0 && typeof event.attendance_strategy === 'object' && (
                        <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                          <div className="text-sm text-yellow-800">
                            No session details configured yet. Sessions will be added during event setup.
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </InfoCard>
              </div>
            )}
          </div>
          {/* Delete Confirmation Modal */}
          {deleteModalOpen && (
            <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200">
              <div className="bg-white rounded-lg p-6 max-w-md mx-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-exclamation-triangle text-red-600 text-xl"></i>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Event</h3>
                  <p className="text-gray-600 mb-4">
                    Are you sure you want to delete "{event.event_name}"? This action cannot be undone.
                  </p>

                  {/* Warning about registrations */}
                  {recentRegistrations && recentRegistrations.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                      <div className="flex items-center text-amber-800">
                        <i className="fas fa-exclamation-triangle mr-2"></i>
                        <span className="text-sm font-medium">Warning</span>
                      </div>
                      <p className="text-amber-700 text-sm mt-1">
                        This event has {recentRegistrations.length} registration(s).
                        Deletion will fail if registrations exist.
                      </p>
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <button
                      onClick={() => setDeleteModalOpen(false)}
                      className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteEvent}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* View All Registrations Modal */}
          {registrationsModalOpen && (
            <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col">
                {/* Modal Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900">{event?.event_name} - All Registrations</h3>
                  <button
                    onClick={() => setRegistrationsModalOpen(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <i className="fas fa-times text-xl"></i>
                  </button>
                </div>

                {/* Registration Analysis - Only for student events */}
                {event?.target_audience === 'student' && allRegistrations.length > 0 && (
                  <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                    <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center">
                      <i className="fas fa-chart-pie mr-2"></i>Registration Analysis
                    </h4>
                    {(() => {
                      const stats = calculateTargetingStats(allRegistrations);
                      return stats && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Department Distribution */}
                          {Object.keys(stats.departmentStats).length > 0 && (
                            <div className="bg-white rounded-lg p-3 shadow-sm border border-blue-100">
                              <h5 className="text-xs font-medium text-gray-600 mb-2 flex items-center">
                                <i className="fas fa-building text-blue-600 mr-1"></i>By Department
                              </h5>
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(stats.departmentStats)
                                  .sort(([, a], [, b]) => b - a)
                                  .slice(0, 6)
                                  .map(([dept, count]) => (
                                    <span key={dept} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                      {dept} ({count})
                                    </span>
                                  ))}
                                {Object.keys(stats.departmentStats).length > 6 && (
                                  <span className="text-xs text-gray-500">+{Object.keys(stats.departmentStats).length - 6} more</span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Semester Distribution */}
                          {Object.keys(stats.semesterStats).length > 0 && (
                            <div className="bg-white rounded-lg p-3 shadow-sm border border-green-100">
                              <h5 className="text-xs font-medium text-gray-600 mb-2 flex items-center">
                                <i className="fas fa-calendar-alt text-green-600 mr-1"></i>By Semester
                              </h5>
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(stats.semesterStats)
                                  .sort(([a], [b]) => parseInt(a) - parseInt(b))
                                  .map(([sem, count]) => (
                                    <span key={sem} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                                      {sem === '1' ? '1st' : sem === '2' ? '2nd' : sem === '3' ? '3rd' : `${sem}th`} ({count})
                                    </span>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Modal Content */}
                <div className="p-6 overflow-y-auto flex-grow">
                  <div className="mb-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <SearchBox
                        placeholder="Search registrations..."
                        value={searchTerm}
                        onChange={(value) => setSearchTerm(value)}
                        showFilters={false}
                        size="md"
                      />
                      <Dropdown
                        options={[
                          { value: "all", label: "All Registrations" },
                          { value: "attended", label: "Attended Only" },
                          { value: "not-attended", label: "Not Attended" }
                        ]}
                        value={statusFilter}
                        onChange={(value) => setStatusFilter(value)}
                        placeholder="Filter by status"
                      />
                    </div>
                    <div className="text-gray-600 font-medium">
                      Total: <span>{filteredRegistrations.length}</span>
                    </div>
                  </div>

                  {/* Modal Table Container */}
                  <div className="overflow-x-auto">
                    {modalLoading ? (
                      <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="mt-2 text-gray-600">Loading registrations...</p>
                      </div>
                    ) : filteredRegistrations.length > 0 ? (
                      eventStats?.is_team_based ? (
                        // Team Registrations in Modal - Compact design like Latest Registrations
                        <div className="space-y-3">
                          {filteredRegistrations.map((team, index) => (
                            <div key={index} className="border rounded-md bg-white shadow-sm">
                              <div className="flex items-center justify-between p-3">
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                    <i className="fas fa-users text-gray-600"></i>
                                    <span className="truncate max-w-[24rem]">{team.team_name || 'Unnamed Team'}</span>
                                    {team.user_type === 'faculty' && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                        Faculty Team
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    Leader: <span className="font-medium text-gray-700">{team.team_members?.[0]?.full_name || team.name || 'N/A'}</span> • {team.member_count} members
                                    {team.user_type === 'faculty' ? ' (Faculty)' : ''}
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <div className="text-xs text-gray-500">{formatCompactDateTime(team.registration_date)}</div>
                                  <button
                                    onClick={() => toggleTeamExpansion(`modal-${index}`)}
                                    className="text-sm text-blue-600 hover:bg-blue-50 px-2 py-1 rounded"
                                  >
                                    <i className={`fas ${expandedTeams.has(`modal-${index}`) ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                                  </button>
                                </div>
                              </div>

                              {expandedTeams.has(`modal-${index}`) && team.team_members && (
                                <div className="border-t px-3 py-2 bg-gray-50">
                                  <div className="text-xs text-gray-600 mb-3 font-medium">Team Members ({team.member_count})</div>
                                  <div className="space-y-2">
                                    {team.team_members.map((member, memberIndex) => (
                                      <div key={memberIndex} className="bg-white rounded-lg p-3 border border-gray-200">
                                        <div className="flex items-start justify-between">
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                              <div className="font-medium text-gray-900 truncate">{member.full_name}</div>
                                              {memberIndex === 0 && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                  Team Leader
                                                </span>
                                              )}
                                              {team.user_type === 'faculty' && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                                  Faculty
                                                </span>
                                              )}
                                            </div>
                                            <div className="space-y-1">
                                              <div className="text-xs text-gray-600 flex items-center gap-3">
                                                <span className="flex items-center gap-1">
                                                  <i className="fas fa-id-card text-gray-400"></i>
                                                  {team.user_type === 'faculty' ? member.employee_id : member.enrollment_no}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                  <i className="fas fa-building text-gray-400"></i>
                                                  {member.department}
                                                </span>
                                              </div>
                                              <div className="text-xs text-gray-600 flex items-center gap-3">
                                                <span className="flex items-center gap-1">
                                                  <i className="fas fa-envelope text-gray-400"></i>
                                                  {(member.email || '').trim()}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                  {team.user_type === 'faculty' ? (
                                                    <>
                                                      <i className="fas fa-briefcase text-gray-400"></i>
                                                      {member.designation || 'Faculty'}
                                                    </>
                                                  ) : (
                                                    <>
                                                      <i className="fas fa-layer-group text-gray-400"></i>
                                                      {formatOrdinalNumber(member.semester)}
                                                    </>
                                                  )}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        // Individual Registrations in Modal
                        <div className="overflow-hidden">
                          <table className="w-full table-fixed border-collapse">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="w-[15%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                                  <div className="flex items-center gap-2">
                                    <i className="fas fa-user text-xs"></i>Name
                                  </div>
                                </th>
                                <th className="w-[12%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                                  <div className="flex items-center gap-2">
                                    <i className="fas fa-id-card text-xs"></i>ID
                                  </div>
                                </th>
                                <th className="w-[18%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                                  <div className="flex items-center gap-2">
                                    <i className="fas fa-building text-xs"></i>Department
                                  </div>
                                </th>
                                <th className="w-[14%] px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                                  <div className="flex items-center gap-1">
                                    <i className="fas fa-layer-group text-xs"></i>Info
                                  </div>
                                </th>
                                <th className="w-[20%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                                  <div className="flex items-center gap-2">
                                    <i className="fas fa-envelope text-xs"></i>Contact
                                  </div>
                                </th>
                                <th className="w-[15%] px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  <div className="flex items-center gap-1">
                                    <i className="fas fa-calendar text-xs"></i>Date
                                  </div>
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {filteredRegistrations.map((reg, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="w-[15%] px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-100">
                                    <div className="break-words leading-tight whitespace-normal" title={reg.full_name || reg.name}>
                                      <div className="flex items-center gap-2">
                                        {reg.registration_type === 'team_member' && (
                                          <i className="fas fa-users text-blue-500 text-xs"></i>
                                        )}
                                        <span>{reg.full_name || reg.name}</span>
                                        {reg.is_team_leader && (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            Leader
                                          </span>
                                        )}
                                      </div>
                                      {reg.team_name && (
                                        <div className="text-xs text-gray-500 mt-1">
                                          Team: {reg.team_name}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="w-[15%] px-3 py-3 text-sm text-gray-700 font-mono border-r border-gray-100">
                                    <div className="break-words leading-tight whitespace-normal" title={reg.user_type === 'faculty' ? reg.employee_id : reg.enrollment_no}>
                                      {reg.user_type === 'faculty' ? reg.employee_id : reg.enrollment_no}
                                    </div>
                                  </td>
                                  <td className="w-[18%] px-3 py-3 text-sm text-gray-700 border-r border-gray-100">
                                    <div className="break-words leading-tight whitespace-normal" title={reg.department}>
                                      {reg.department}
                                    </div>
                                  </td>
                                  <td className="w-[8%] px-2 py-3 text-xs text-gray-700 font-medium border-r border-gray-100">
                                    <div className="break-words leading-tight whitespace-normal">
                                      {reg.user_type === 'faculty'
                                        ? reg.designation || 'Faculty'
                                        : formatOrdinalNumber(reg.semester)
                                      }
                                    </div>
                                  </td>
                                  <td className="w-[28%] px-3 py-3 text-sm text-gray-700 border-r border-gray-100">
                                    <div className="break-words leading-tight whitespace-normal flex flex-col gap-2" title={reg.email}>
                                      {(reg.email || '').trim()}
                                      <span className="text-xs text-gray-500 font-mono" title={reg.mobile_no || reg.contact_no}>
                                        {reg.mobile_no || reg.contact_no || 'N/A'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="w-[11%] px-2 py-3 text-xs text-gray-700">
                                    <div className="leading-tight" title={formatDateTime(reg.registration_date)}>
                                      {formatDateTime(reg.registration_date)}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    ) : (
                      <div className="text-center py-8">
                        <i className="fas fa-search text-gray-400 text-3xl mb-3"></i>
                        <p className="text-gray-600">No registrations found matching your search criteria.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-gray-200 flex justify-end">
                  <button
                    onClick={() => setRegistrationsModalOpen(false)}
                    className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Attendees Modal */}
          {attendeesModalOpen && (
            <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col">
                {/* Modal Header */}
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                      <i className="fas fa-check-double text-green-500"></i>
                      Present Students
                    </h2>
                    <p className="text-gray-600 mt-1">
                      {attendeesList.length} students with both virtual and physical attendance for {event?.event_name}
                    </p>
                  </div>
                  <button
                    onClick={() => setAttendeesModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 p-6 overflow-auto">
                  {modalLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <i className="fas fa-spinner fa-spin text-3xl text-green-500 mr-3"></i>
                      <span className="text-lg text-gray-600">Loading present students...</span>
                    </div>
                  ) : attendeesList.length > 0 ? (
                    <div className="space-y-4">
                      {/* Attendees Table */}
                      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-green-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider min-w-[280px]">Student Details</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider min-w-[220px]">Contact Information</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider">Semester</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider min-w-[200px]">Attendance Timeline</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {attendeesList.map((attendee, index) => (
                              <tr key={index} className="hover:bg-green-50 transition-colors">
                                {/* Student Details Column */}
                                <td className="px-6 py-4">
                                  <div className="flex items-center space-x-3">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                                      <span className="text-white font-semibold text-sm">
                                        {(attendee.student_data?.full_name || attendee.full_name || attendee.name)?.charAt(0)?.toUpperCase() || 'S'}
                                      </span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-sm font-semibold text-gray-900 truncate leading-tight">
                                        {attendee.student_data?.full_name || attendee.full_name || attendee.name || 'N/A'}
                                      </div>
                                      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                                        <span className="font-mono">{attendee.student_data?.enrollment_no || attendee.enrollment_no || 'N/A'}</span>
                                        <span className="truncate">{attendee.student_data?.department || attendee.department || 'No Dept'}</span>
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* Contact Information Column */}
                                <td className="px-6 py-4">
                                  <div className="space-y-1">
                                    <div className="text-sm text-gray-700 truncate flex items-center" title={attendee.student_data?.email || attendee.email}>
                                      <i className="fas fa-envelope text-green-500 mr-2 w-4"></i>
                                      <span className="truncate">{attendee.student_data?.email || attendee.email || 'N/A'}</span>
                                    </div>
                                    <div className="text-sm text-gray-700 flex items-center" title={attendee.student_data?.mobile_no || attendee.mobile_no || attendee.phone}>
                                      <i className="fas fa-phone text-blue-500 mr-2 w-4"></i>
                                      <span>{attendee.student_data?.mobile_no || attendee.mobile_no || attendee.phone || 'N/A'}</span>
                                    </div>
                                  </div>
                                </td>

                                {/* Semester Column */}
                                <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    {formatOrdinalNumber(attendee.student_data?.semester || attendee.semester) || 'N/A'}
                                  </span>
                                </td>

                                {/* Attendance Timeline Column */}
                                <td className="px-6 py-4">
                                  <div className="space-y-2">
                                    {/* Virtual Attendance */}
                                    <div className="flex items-center text-sm">
                                      <div className="flex items-center min-w-[90px]">
                                        <i className="fas fa-desktop text-green-500 mr-2 w-4"></i>
                                        <span className="text-green-600 font-medium text-xs">Virtual:</span>
                                      </div>
                                      <span className="text-gray-700 ml-2">
                                        {attendee.virtual_attendance_timestamp ? formatCompactDateTime(attendee.virtual_attendance_timestamp) : 'Not marked'}
                                      </span>
                                    </div>

                                    {/* Physical Attendance */}
                                    <div className="flex items-center text-sm">
                                      <div className="flex items-center min-w-[90px]">
                                        <i className="fas fa-user-check text-blue-500 mr-2 w-4"></i>
                                        <span className="text-blue-600 font-medium text-xs">Physical:</span>
                                      </div>
                                      <span className="text-gray-700 ml-2">
                                        {attendee.physical_attendance_timestamp ? formatCompactDateTime(attendee.physical_attendance_timestamp) : 'Not marked'}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                        <i className="fas fa-check-double text-2xl text-green-500"></i>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Present Students Yet</h3>
                      <p className="text-gray-500">No students have completed both virtual and physical attendance verification yet.</p>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-gray-200 flex justify-end">
                  <button
                    onClick={() => setAttendeesModalOpen(false)}
                    className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Attendance Breakdown Modal */}
          {attendanceStatsModalOpen && (
            <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
                {/* Modal Header */}
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                      <i className="fas fa-chart-pie text-purple-500"></i>
                      Attendance Breakdown
                    </h2>
                    <p className="text-gray-600 mt-1">
                      Detailed dual-layer attendance statistics for {event?.event_name}
                    </p>
                  </div>
                  <button
                    onClick={() => setAttendanceStatsModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 p-6 overflow-auto">
                  {attendanceStats ? (
                    <div className="space-y-6">
                      {/* Summary Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-green-600">{attendanceStats.present_count}</div>
                          <div className="text-sm font-medium text-green-700">Present</div>
                          <div className="text-xs text-green-600 mt-1">Both Virtual & Physical</div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-blue-600">{attendanceStats.virtual_only_count}</div>
                          <div className="text-sm font-medium text-blue-700">Virtual Only</div>
                          <div className="text-xs text-blue-600 mt-1">Self-marked attendance</div>
                        </div>

                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-orange-600">{attendanceStats.physical_only_count}</div>
                          <div className="text-sm font-medium text-orange-700">Physical Only</div>
                          <div className="text-xs text-orange-600 mt-1">Admin verified only</div>
                        </div>

                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-red-600">{attendanceStats.absent_count}</div>
                          <div className="text-sm font-medium text-red-700">Absent</div>
                          <div className="text-xs text-red-600 mt-1">No attendance</div>
                        </div>
                      </div>

                      {/* Data Validation Status */}
                      {attendanceStats._fetchedAt && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                          <div className="flex items-center">
                            <i className="fas fa-shield-check text-green-600 mr-2"></i>
                            <div>
                              <div className="text-sm font-medium text-green-800">Data Validated & Current</div>
                              <div className="text-xs text-green-600">
                                Dual-layer attendance system • Fetched at {new Date(attendanceStats._fetchedAt).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Detailed Breakdown */}
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Analytics</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Total Statistics */}
                          <div className="space-y-4">
                            <h4 className="font-medium text-gray-700">Total Statistics</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                <span className="text-gray-600">Total Registrations:</span>
                                <span className="font-semibold text-gray-900">{attendanceStats.total_registrations}</span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                <span className="text-gray-600">Virtual Attendance:</span>
                                <span className="font-semibold text-blue-600">{attendanceStats.virtual_attendance_count}</span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                <span className="text-gray-600">Physical Attendance:</span>
                                <span className="font-semibold text-orange-600">{attendanceStats.physical_attendance_count}</span>
                              </div>
                              <div className="flex justify-between items-center py-2">
                                <span className="text-gray-600">Overall Attendance Rate:</span>
                                <span className="font-semibold text-purple-600">{attendanceStats.attendance_percentage}%</span>
                              </div>
                            </div>
                          </div>

                          {/* Status Breakdown */}
                          <div className="space-y-4">
                            <h4 className="font-medium text-gray-700">Status Breakdown</h4>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between p-3 bg-green-100 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <i className="fas fa-check-double text-green-600"></i>
                                  <span className="font-medium text-green-700">Present (Both)</span>
                                </div>
                                <span className="font-bold text-green-600">{attendanceStats.present_count}</span>
                              </div>

                              <div className="flex items-center justify-between p-3 bg-blue-100 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <i className="fas fa-laptop text-blue-600"></i>
                                  <span className="font-medium text-blue-700">Virtual Only</span>
                                </div>
                                <span className="font-bold text-blue-600">{attendanceStats.virtual_only_count}</span>
                              </div>

                              <div className="flex items-center justify-between p-3 bg-orange-100 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <i className="fas fa-user-check text-orange-600"></i>
                                  <span className="font-medium text-orange-700">Physical Only</span>
                                </div>
                                <span className="font-bold text-orange-600">{attendanceStats.physical_only_count}</span>
                              </div>

                              <div className="flex items-center justify-between p-3 bg-red-100 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <i className="fas fa-user-times text-red-600"></i>
                                  <span className="font-medium text-red-700">Absent</span>
                                </div>
                                <span className="font-bold text-red-600">{attendanceStats.absent_count}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Information Box */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <i className="fas fa-info-circle text-blue-500 text-lg mt-0.5"></i>
                          <div className="text-blue-800">
                            <h4 className="font-semibold mb-1">Understanding Attendance Status</h4>
                            <ul className="text-sm space-y-1">
                              <li><strong>Present:</strong> Students who have marked both virtual attendance (self-marked) and physical attendance (admin verified)</li>
                              <li><strong>Virtual Only:</strong> Students who self-marked attendance but haven't been physically verified</li>
                              <li><strong>Physical Only:</strong> Students who were verified by admin but didn't self-mark attendance</li>
                              <li><strong>Absent:</strong> Students who haven't marked any form of attendance</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-center gap-4 pt-4">
                        <button
                          onClick={handleViewAttendees}
                          className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                          <i className="fas fa-users"></i>
                          View All Attendees
                        </button>
                        <button
                          onClick={() => navigate(`/admin/events/${eventId}/attendance`)}
                          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                          <i className="fas fa-user-check"></i>
                          Attendance Portal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                        <i className="fas fa-chart-pie text-2xl text-gray-400"></i>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Attendance Data</h3>
                      <p className="text-gray-500">Attendance statistics are not available for this event yet.</p>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-gray-200 flex justify-end">
                  <button
                    onClick={() => setAttendanceStatsModalOpen(false)}
                    className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Event Poster Modal */}
          {posterModalOpen && (
            <div className="fixed inset-0 backdrop-blur-sm bg-black/50 flex items-center justify-center z-[99999] animate-in fade-in duration-200 p-4">
              <div className="relative max-w-4xl max-h-[90vh] w-auto h-auto">
                {/* Close Button */}
                <button
                  onClick={() => setPosterModalOpen(false)}
                  className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors z-10"
                  title="Close"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Poster Image */}
                <img
                  src={event?.event_poster_url}
                  alt={`${event?.event_name} poster`}
                  className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                  onError={(e) => {
                    e.target.src = '/placeholder-poster.png';
                    e.target.alt = 'Poster not available';
                  }}
                />
              </div>
            </div>
          )}

          {/* Certificate Template Modal */}
          {certificateModalOpen && currentCertificateTemplate && (
            <div className="fixed inset-0 backdrop-blur-sm bg-black/50 z-[99999] animate-in fade-in duration-200">
              {/* Floating Close Button */}
              <button
                onClick={() => {
                  // Clean up blob URL if it exists
                  if (currentCertificateTemplate.url.startsWith('blob:')) {
                    URL.revokeObjectURL(currentCertificateTemplate.url);
                  }
                  setCertificateModalOpen(false);
                  setCurrentCertificateTemplate(null);
                }}
                className="fixed top-4 right-4 z-[100000] bg-black/80 hover:bg-black text-white rounded-full p-2 transition-colors shadow-lg"
                title="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Floating Actions */}
              <div className="fixed top-4 left-4 z-[100000] flex gap-2">
                <a
                  href={currentCertificateTemplate.originalUrl || currentCertificateTemplate.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open Original
                </a>
                <div className="bg-black/80 text-white px-3 py-2 rounded-lg text-sm shadow-lg">
                  {currentCertificateTemplate.type}
                </div>
              </div>

              {/* Full Screen Template Content */}
              <iframe
                src={currentCertificateTemplate.url}
                title={`${currentCertificateTemplate.type} Certificate Template`}
                className="w-full h-full border-0 bg-white"
                onError={() => {
                  
                }}
              />
            </div>
          )}

          {/* Event Report Modal */}
          <EventReportModal
            isOpen={eventReportModalOpen}
            onClose={() => setEventReportModalOpen(false)}
            eventId={eventId}
            eventName={event?.event_name || 'Event'}
            onGenerate={handleEventReportGeneration}
          />
        </div>
      </div>
    </AdminLayout>
  );
}

export default EventDetail;

