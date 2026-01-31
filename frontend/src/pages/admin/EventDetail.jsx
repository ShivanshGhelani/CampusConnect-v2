import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../../api/admin';
import AdminLayout from '../../components/admin/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import EventReportModal from '../../components/EventReportModal';
import CustomExportModal from '../../components/admin/CustomExportModal';
import RichTextDisplay from '../../components/RichTextDisplay';
import { useAuth } from '../../context/AuthContext';
import { Calendar, Clock, Users, MapPin, Mail, Phone, FileText, Award, CreditCard, ArrowLeft, RefreshCw, Download, UserCheck, Edit3, FileDown, Trash2, MoreHorizontal, CheckCircle, Eye, QrCode } from 'lucide-react';
import { Dropdown, SearchBox } from '../../components/ui';
import { eventPDFService } from '../../services/EventPDFService';
import { generateEventQR, generateFeedbackQR } from '../../utils/qrCodeGenerator';
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [registrationsModalOpen, setRegistrationsModalOpen] = useState(false);
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
  const [posterLoading, setPosterLoading] = useState(false);
  const [posterZoom, setPosterZoom] = useState(1);
  const [posterError, setPosterError] = useState(false);
  const [certificateModalOpen, setCertificateModalOpen] = useState(false);
  const [certificateLoading, setCertificateLoading] = useState(false);
  const [certificateError, setCertificateError] = useState(false);
  const [currentCertificateTemplate, setCurrentCertificateTemplate] = useState(null);
  const [eventReportModalOpen, setEventReportModalOpen] = useState(false);
  const [customExportModalOpen, setCustomExportModalOpen] = useState(false);
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
        // Backend returns data nested inside "data" object
        const statsData = allData.attendanceStats.data || allData.attendanceStats;

        // Add timestamp to track freshness
        const timestamp = Date.now();

        // Ensure all required fields are present and valid using new system fields
        const validatedStats = {
          _fetchedAt: timestamp,
          event_id: allData.attendanceStats.event_id,
          total_registrations: Math.max(0, statsData.total_registered || statsData.total_registrations || 0),
          present_count: Math.max(0, statsData.total_present || statsData.present_count || statsData.by_status?.present || 0),
          partial_count: Math.max(0, statsData.total_partial || statsData.partial_count || statsData.by_status?.partial || 0),
          absent_count: Math.max(0, statsData.total_absent || statsData.absent_count || statsData.by_status?.absent || 0),
          pending_count: Math.max(0, statsData.total_pending || statsData.pending_count || statsData.by_status?.pending || 0),
          attendance_percentage: Math.min(100, Math.max(0, statsData.attendance_rate || statsData.attendance_percentage || 0)),
          user_type: allData.stats?.stats?.user_type || 'mixed',
          by_status: statsData.by_status || {},
          by_type: statsData.by_type || {}
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
    setCertificateLoading(true);
    setCertificateModalOpen(true);
    setCertificateError(false);
    try {
      // Fetch the HTML content
      const response = await fetch(templateUrl);
      if (!response.ok) {
        if (response.status === 404) {
          setCertificateError(true);
          setCertificateLoading(false);
          return;
        }
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
    } catch (error) {

      // Check if it's a 404 error
      if (error.message.includes('404') || error.message.includes('not found')) {
        setCertificateError(true);
      } else {
        // Fallback to original URL if fetch fails for other reasons
        setCurrentCertificateTemplate({
          url: templateUrl,
          type: templateType,
          originalUrl: templateUrl
        });
      }
    } finally {
      setCertificateLoading(false);
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

  const handleViewAllRegistrations = async () => {
    setRegistrationsModalOpen(true);
    if (allRegistrations.length === 0) {
      await fetchAllRegistrations();
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

  // Event Report Generation Function - FRONTEND ONLY
  const handleEventReportGeneration = async (reportData) => {
    try {
      setError(''); // Clear any previous errors
      console.log('Generating Event Report with data:', reportData);
      
      // Build HTML report similar to attendance_report.html and feedback_report.html
      let htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Report - ${event.event_name}</title>
  <style>
    @page { margin: 0.5in; size: A4; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Arial', sans-serif; font-size: 11pt; line-height: 1.4; color: #000; background: white; }
    
    .page-header {
      text-align: center;
      border-bottom: 3px solid #1f4e78;
      margin-bottom: 25px;
      padding-bottom: 20px;
    }
    
    .header-logos {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 15px;
    }
    
    .logo-section {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .logo-section img {
      width: 50px;
      height: 50px;
      object-fit: contain;
    }
    
    .logo-section img {
      width: 50px;
      height: 50px;
      object-fit: contain;
    }
    
    .brand-name {
      font-size: 20px;
      font-weight: bold;
    }
    
    .brand-name .campus { color: #000; }
    .brand-name .connect { color: #3b82f6; }
    
    .event-id {
      text-align: right;
      font-size: 11px;
      color: #666;
    }
    
    .page-header h1 {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 10px;
      color: #1f4e78;
    }
    
    .event-title-header {
      font-size: 18px;
      font-weight: bold;
      color: #3b82f6;
      margin-bottom: 8px;
    }
    
    .section {
      margin-bottom: 25px;
      border: 1px solid #d1d5db;
      padding: 15px;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-size: 16px;
      font-weight: bold;
      background: #3b82f6;
      color: white;
      padding: 10px;
      margin: -15px -15px 10px -15px;
    }
    
    .table-section {
      margin-bottom: 25px;
      padding: 0;
      page-break-inside: avoid;
      overflow: hidden;
    }
    
    .table-section-title {
      font-size: 16px;
      font-weight: bold;
      background: #3b82f6;
      color: white;
      padding: 10px;
      margin-bottom: 10px;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin: 15px 0;
    }
    
    .stat-box {
      text-align: center;
      padding: 15px;
      background: #f3f4f6;
      border: 1px solid #d1d5db;
    }
    
    .stat-number {
      font-size: 28px;
      font-weight: bold;
      color: #1f4e78;
      display: block;
    }
    
    .stat-label {
      font-size: 12px;
      color: #6b7280;
      margin-top: 5px;
    }
    
    .info-item {
      padding: 8px;
      border-bottom: 1px solid #e5e7eb;
      margin-bottom: 10px;
    }
    
    .info-label {
      font-weight: bold;
      color: #374151;
      margin-right: 8px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 0;
    }
    
    th {
      background: #1f4e78;
      color: white;
      padding: 10px;
      text-align: left;
      font-size: 11px;
      font-weight: bold;
      border: 1px solid #1f4e78;
    }
    
    td {
      border: 1px solid #d1d5db;
      padding: 8px;
      font-size: 10px;
    }
    
    tr:nth-child(even) {
      background: #f9fafb;
    }
    
    .image-gallery {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin: 15px 0;
    }
    
    .image-item img {
      width: 100%;
      max-height: 300px;
      object-fit: contain;
      border: 1px solid #d1d5db;
      background-color: #f9fafb;
    }
    
    .image-caption {
      text-align: center;
      font-size: 10px;
      color: #666;
      margin-top: 5px;
    }
    
    .response-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin: 15px 0;
    }
    
    .response-card {
      page-break-inside: avoid;
      display: flex;
      flex-direction: column;
      border: 1px solid #d1d5db;
    }
    
    .response-header {
      background: #1f4e78;
      color: white;
      padding: 10px;
      font-size: 10px;
      line-height: 1.6;
    }
    
    .response-name {
      font-weight: bold;
      font-size: 11px;
      display: block;
      margin-bottom: 4px;
    }
    
    .response-meta {
      font-size: 9px;
      opacity: 0.9;
    }
    
    .response-table {
      margin: 0;
      width: 100%;
      table-layout: fixed;
    }
    
    .response-table td {
      border: 1px solid #d1d5db;
      word-wrap: break-word;
    }
    
    .response-table .question {
      font-weight: bold;
      background: #f3f4f6;
      width: 35%;
      color: #374151;
      padding: 8px;
      font-size: 9px;
    }
    
    .response-table .answer {
      width: 65%;
      padding: 8px;
      font-size: 9px;
    }
    
    .stars {
      color: #fbbf24;
      font-size: 14px;
      letter-spacing: 1px;
    }
    
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #1f4e78;
      font-size: 11px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="page-header">
    <div class="header-logos">
      <div class="logo-section">
        <img src="${window.location.origin}/logo/ksv.png" alt="KSV Logo" />
        <div class="brand-name">
          <span class="campus">Campus</span><span class="connect">Connect</span>
        </div>
      </div>
      <div class="event-id">Event ID: ${event.event_id}</div>
    </div>
    <h1>Event Report</h1>
    <div class="event-title-header">${event.event_name}</div>
    <div style="font-size: 10pt; color: #666; margin-top: 10px;">
      Generated on: ${new Date().toLocaleString('en-IN', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}
    </div>
  </div>

  <!-- Event Details -->
  <div class="section">
    <div class="section-title">Event Information</div>
    <div class="info-item">
      <div class="info-label">Event Name:</div>
      <div style="color: #6b7280;">${event.event_name || 'N/A'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Event ID:</div>
      <div style="color: #6b7280;">${event.event_id || eventId}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Category:</div>
      <div style="color: #6b7280; text-transform: capitalize;">${event.event_type || 'N/A'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Event Date:</div>
      <div style="color: #6b7280;">${event.start_datetime ? new Date(event.start_datetime).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Venue:</div>
      <div style="color: #6b7280;">${event.venue || event.location || 'N/A'}</div>
    </div>
    ${event.short_description ? `
    <div class="info-item">
      <div class="info-label">Description:</div>
      <div style="color: #6b7280; margin-top: 5px;">${event.short_description}</div>
    </div>` : ''}
    <div class="info-item">
      <div class="info-label">Organizing Department:</div>
      <div style="color: #6b7280;">${event.organizing_department || event.organizing_club || event.department || 'N/A'}</div>
    </div>
    ${event.organizer_details && event.organizer_details.length > 0 ? `
    <div class="info-item">
      <div class="info-label">Organizers:</div>
      <div style="color: #6b7280;">
        ${event.organizer_details.map(org => {
          const name = org.full_name || org.name || org.faculty_name || 'N/A';
          const phone = org.contact_no || org.phone || org.contact || '';
          return `• ${name}${phone ? ' (' + phone + ')' : ''}`;
        }).join('<br>')}
      </div>
    </div>` : event.contacts && event.contacts.length > 0 ? `
    <div class="info-item">
      <div class="info-label">Organizers:</div>
      <div style="color: #6b7280;">
        ${event.contacts.map(contact => {
          const name = contact.name || contact.faculty_name || 'N/A';
          const phone = contact.contact || contact.phone || '';
          return `• ${name}${phone ? ' (' + phone + ')' : ''}`;
        }).join('<br>')}
      </div>
    </div>` : ''}
  </div>

  <!-- Statistics -->
  <div class="section">
    <div class="section-title">Event Statistics</div>
    <div class="stats-grid">
      <div class="stat-box">
        <span class="stat-number">${reportData.statistics.totalRegistrations}</span>
        <span class="stat-label">Total Registrations</span>
      </div>
      <div class="stat-box">
        <span class="stat-number" style="color: #16a34a;">${reportData.statistics.totalAttendance}</span>
        <span class="stat-label">Total Attendance</span>
      </div>
      <div class="stat-box">
        <span class="stat-number" style="color: #2563eb;">${reportData.statistics.attendancePercentage}%</span>
        <span class="stat-label">Attendance Rate</span>
      </div>
      <div class="stat-box">
        <span class="stat-number" style="color: #f59e0b;">${reportData.statistics.feedbacksReceived}</span>
        <span class="stat-label">Feedbacks Received</span>
      </div>
    </div>
  </div>
`;

      // Add Outcomes
      if (reportData.outcomes && reportData.outcomes.length > 0) {
        htmlContent += `
  <div class="section">
    <div class="section-title">Event Outcomes</div>
    ${reportData.outcomes.map((outcome, idx) => `
    <div class="info-item">
      <div class="info-label">Outcome ${idx + 1}: ${outcome.title}</div>
      <div style="color: #6b7280; margin-top: 5px;">${outcome.description}</div>
    </div>
    `).join('')}
  </div>`;
      }

      // Add Budget & Additional Details
      if (reportData.resultsComparison || reportData.actualDuration || reportData.budgetUtilization || 
          reportData.resourcesUsed || reportData.postEventSummary) {
        htmlContent += `
  <div class="section">
    <div class="section-title">Budget & Additional Details</div>
    ${reportData.resultsComparison ? `<div class="info-item"><div class="info-label">Expected vs Actual Results:</div><div style="color: #6b7280;">${reportData.resultsComparison}</div></div>` : ''}
    ${reportData.actualDuration ? `<div class="info-item"><div class="info-label">Actual Duration:</div><div style="color: #6b7280;">${reportData.actualDuration}</div></div>` : ''}
    ${reportData.budgetUtilization ? `<div class="info-item"><div class="info-label">Budget Utilization:</div><div style="color: #6b7280;">${reportData.budgetUtilization}</div></div>` : ''}
    ${reportData.resourcesUsed ? `<div class="info-item"><div class="info-label">Resources Used:</div><div style="color: #6b7280;">${reportData.resourcesUsed}</div></div>` : ''}
    ${reportData.postEventSummary ? `<div class="info-item"><div class="info-label">Post-Event Summary:</div><div style="color: #6b7280;">${reportData.postEventSummary}</div></div>` : ''}
  </div>`;
      }

      // Add Images (base64 from memory)
      if (reportData.images && reportData.images.length > 0) {
        htmlContent += `
  <div class="section">
    <div class="section-title">Event Images</div>
    <div class="image-gallery">
      ${reportData.images.map((img, idx) => `
      <div class="image-item">
        <img src="${img}" alt="Event Image ${idx + 1}">
        <div class="image-caption">${reportData.imageCaptions[idx] || `Image ${idx + 1}`}</div>
      </div>
      `).join('')}
    </div>
  </div>`;
      }

      // Add Winners
      if (reportData.winners && reportData.winners.length > 0) {
        htmlContent += `
  <div class="table-section">
    <div class="table-section-title">Winners & Recognition</div>
    <table>
      <thead>
        <tr>
          <th>Position</th>
          <th>Name</th>
          <th>Department</th>
          <th>ID</th>
        </tr>
      </thead>
      <tbody>
        ${reportData.winners.map(winner => `
        <tr>
          <td>${winner.position}</td>
          <td>${winner.name}</td>
          <td>${winner.department}</td>
          <td>${winner.id}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>`;
      }

      // Add Attendance Report Table (if selected)
      console.log('Attendance report check:', {
        includeSignSheet: reportData.includeSignSheet,
        hasRegistrations: reportData.registrations && reportData.registrations.length > 0,
        registrationsCount: reportData.registrations?.length
      });
      
      if (reportData.includeSignSheet && reportData.registrations && reportData.registrations.length > 0) {
        console.log('Fetching attendance data for report...');
        
        try {
          // Fetch attendance data with actual attendance status
          const attendanceResponse = await adminAPI.getAttendanceConfigAndParticipants(eventId);
          console.log('Attendance API response:', attendanceResponse.data);
          
          if (attendanceResponse.data.success && attendanceResponse.data.data.participants) {
            const attendanceParticipants = attendanceResponse.data.data.participants;
            console.log('Fetched attendance participants:', attendanceParticipants.length);
            
            // Separate by registration type
            const facultyRegs = attendanceParticipants.filter(r => r.registration_type === 'faculty');
            const individualRegs = attendanceParticipants.filter(r => r.registration_type === 'individual');
            const teamRegs = attendanceParticipants.filter(r => r.registration_type === 'team');

            // Helper to generate attendance table
            const generateAttendanceTable = (regs, title) => {
              if (regs.length === 0) return '';
              
              const isTeamTable = title.includes('Team');
              
              let tableRows = '';
              let rowCounter = 1;
              
              regs.forEach((reg, idx) => {
                // Debug: Log first registration to see available fields
                if (idx === 0) {
                  console.log('Sample attendance participant FULL OBJECT:', JSON.stringify(reg, null, 2));
                  console.log('Available keys:', Object.keys(reg));
                  console.log('participant_type:', reg.participant_type);
                  console.log('student:', reg.student);
                  console.log('faculty:', reg.faculty);
                  console.log('registration_type:', reg.registration_type);
                }
                
                // Handle TEAM registrations differently
                if (isTeamTable && reg.registration_type === 'team') {
                  const attendance = reg.attendance || {};
                  const teamName = reg.team?.team_name || reg.team_name || reg.team?.name || 'Unknown Team';
                  const teamSize = reg.team?.team_size || reg.team_size || reg.member_count || reg.team?.members?.length || 0;
                  
                  const teamStatus = attendance.status || reg.team?.status || 'confirmed';
                  
                  let teamStatusBadge = '';
                  let teamStatusPercentage = '';
                  
                  switch (teamStatus) {
                    case 'present':
                      teamStatusBadge = '<span style="color: #16a34a; font-weight: 600;">Present</span>';
                      teamStatusPercentage = '100%';
                      break;
                    case 'partial':
                      teamStatusBadge = '<span style="color: #ca8a04; font-weight: 600;">Partial</span>';
                      teamStatusPercentage = `${attendance.percentage || 0}%`;
                      break;
                    case 'absent':
                      teamStatusBadge = '<span style="color: #dc2626; font-weight: 600;">Absent</span>';
                      teamStatusPercentage = '0%';
                      break;
                    default:
                      teamStatusBadge = '<span style="color: #6b7280;">Not Marked</span>';
                      teamStatusPercentage = '0%';
                  }

                  // Team Header Row (merged cells)
                  tableRows += `
        <tr style="background-color: #dbeafe; border-left: 4px solid #3b82f6;">
          <td colspan="8" style="font-weight: bold; padding: 10px 8px;">
            🏆 ${teamName} 
            <span style="color: #666; font-weight: normal; margin-left: 10px;">
              (Registration ID: ${reg.registration_id || 'N/A'} | ${teamSize} members | Team Status: ${teamStatusBadge} - ${teamStatusPercentage})
            </span>
          </td>
        </tr>
                  `;

                  // Get team members
                  const teamMembers = reg.team_members || reg.team?.members || [];
                  
                  // Sort members to put team leader first
                  const sortedMembers = [...teamMembers].sort((a, b) => {
                    if (a.is_team_leader) return -1;
                    if (b.is_team_leader) return 1;
                    return 0;
                  });

                  // Team Member Rows
                  sortedMembers.forEach((member) => {
                    const memberName = member.student?.name || member.name || member.full_name || 'Unknown Member';
                    const enrollmentId = member.student?.enrollment_no || member.enrollment_no || member.employee_id || 'N/A';
                    const memberRegistrationId = member.registration_id || 'N/A';
                    const department = member.student?.department || member.department || 'N/A';
                    const year = member.student?.semester || member.year || member.semester || 'N/A';
                    const isLeader = member.is_team_leader || false;

                    // Get individual member attendance if available
                    const memberAttendance = member.attendance || {};
                    let memberStatusBadge = '';
                    let memberStatusPercentage = '';
                    
                    switch (memberAttendance.status) {
                      case 'present':
                        memberStatusBadge = '<span style="color: #16a34a; font-weight: 600;">Present</span>';
                        memberStatusPercentage = '100%';
                        break;
                      case 'partial':
                        memberStatusBadge = '<span style="color: #ca8a04; font-weight: 600;">Partial</span>';
                        memberStatusPercentage = `${memberAttendance.percentage || 0}%`;
                        break;
                      case 'absent':
                        memberStatusBadge = '<span style="color: #dc2626; font-weight: 600;">Absent</span>';
                        memberStatusPercentage = '0%';
                        break;
                      default:
                        // Use team status as default
                        memberStatusBadge = teamStatusBadge;
                        memberStatusPercentage = teamStatusPercentage;
                    }

                    tableRows += `
        <tr style="background-color: #f0f9ff;">
          <td>${rowCounter}</td>
          <td>${enrollmentId}</td>
          <td style="font-family: monospace; font-size: 9px;">${memberRegistrationId}</td>
          <td>
            ${memberName}
            ${isLeader ? '<span style="background: #10b981; color: white; padding: 2px 6px; border-radius: 3px; font-size: 7px; margin-left: 5px;">LEADER</span>' : ''}
          </td>
          <td>${department}</td>
          <td>${year}</td>
          <td>${memberStatusBadge}</td>
          <td>${memberStatusPercentage}</td>
        </tr>
                    `;
                    rowCounter++;
                  });
                } else {
                  // Individual/Faculty attendance
                  const attendance = reg.attendance || {};
                  
                  let status = 'Absent';
                  let statusColor = '#dc2626';
                  let percentage = 0;
                  
                  if (attendance.status === 'present') {
                    status = 'Present';
                    statusColor = '#16a34a';
                    percentage = 100;
                  } else if (attendance.status === 'partial') {
                    status = 'Partial';
                    statusColor = '#ca8a04';
                    percentage = attendance.percentage || 0;
                  } else {
                    status = 'Absent';
                    statusColor = '#dc2626';
                    percentage = 0;
                  }
                  
                  // Get profile data
                  const isStudent = reg.participant_type === 'student';
                  const profile = isStudent ? reg.student : reg.faculty;
                  
                  const studentId = profile?.enrollment_no || profile?.employee_id || 'N/A';
                  const studentName = profile?.name || profile?.full_name || 'N/A';
                  const department = profile?.department || 'N/A';
                  const semesterOrDesignation = isStudent 
                    ? (profile?.year || profile?.semester || 'N/A')
                    : (profile?.designation || 'N/A');
                  
                  tableRows += `
        <tr>
          <td>${rowCounter}</td>
          <td>${studentId}</td>
          <td style="font-family: monospace; font-size: 9px;">${reg.registration_id}</td>
          <td>${studentName}</td>
          <td>${department}</td>
          <td>${semesterOrDesignation}</td>
          <td style="color: ${statusColor}; font-weight: bold;">${status}</td>
          <td>${percentage}%</td>
        </tr>
                  `;
                  rowCounter++;
                }
              });
              
              return `
  <div class="table-section">
    <div class="table-section-title">${title}</div>
    <table>
      <thead>
        <tr>
          <th style="width: 5%;">#</th>
          <th style="width: 12%;">ID</th>
          <th style="width: 15%;">Registration ID</th>
          <th style="width: 25%;">Name</th>
          <th style="width: 18%;">Department</th>
          <th style="width: 10%;">${title.includes('Faculty') ? 'Designation' : 'Semester'}</th>
          <th style="width: 10%;">Status</th>
          <th style="width: 5%;">%</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  </div>`;
            };

            htmlContent += generateAttendanceTable(facultyRegs, 'Attendance Report - Faculty');
            htmlContent += generateAttendanceTable(individualRegs, 'Attendance Report - Individual Students');
            htmlContent += generateAttendanceTable(teamRegs, 'Attendance Report - Team Registrations');
          } else {
            // Fallback to basic registration list if attendance data not available
            console.log('No attendance data available, showing basic registration list');
            htmlContent += `
  <div class="section">
    <div class="section-title">Registration List (Attendance data not available)</div>
    <p style="color: #6b7280; margin-bottom: 15px;">Attendance has not been marked for this event yet.</p>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>ID</th>
          <th>Registration ID</th>
          <th>Name</th>
          <th>Department</th>
          <th>Type</th>
        </tr>
      </thead>
      <tbody>
        ${reportData.registrations.map((reg, idx) => {
          const studentId = reg.enrollment_no || reg.employee_id || reg.student_id || reg.faculty_id || 'N/A';
          const studentName = reg.full_name || reg.name || reg.student_name || reg.faculty_name || 'N/A';
          return `
        <tr>
          <td>${idx + 1}</td>
          <td>${studentId}</td>
          <td style="font-family: monospace; font-size: 9px;">${reg.registration_id}</td>
          <td>${studentName}</td>
          <td>${reg.department || 'N/A'}</td>
          <td>${reg.registration_type || reg.user_type || 'N/A'}</td>
        </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  </div>`;
          }
        } catch (error) {
          console.error('Error fetching attendance data:', error);
          htmlContent += `
  <div class="section">
    <div class="section-title">Attendance Report</div>
    <p style="color: #dc2626;">Error loading attendance data. Please try again.</p>
  </div>`;
        }
      }

      // Add Feedback Report Table (if selected and available)
      if (reportData.includeFeedbackReport && reportData.statistics.feedbacksReceived > 0) {
        console.log('Feedback Report - Including feedback table');
        console.log('Feedbacks received:', reportData.statistics.feedbacksReceived);
        
        try {
          // Fetch feedback data
          const [formResponse, responsesResponse] = await Promise.all([
            adminAPI.getFeedbackForm(eventId),
            adminAPI.getFeedbackResponses(eventId, { page: 1, limit: 1000 })
          ]);

          if (responsesResponse.data.success && responsesResponse.data.responses?.length > 0) {
            const feedbackForm = formResponse.data.feedback_form;
            const allResponses = responsesResponse.data.responses;

            console.log('Fetched feedback responses:', allResponses.length);

            // Add Feedback Summary Table
            let feedbackTableRows = '';
            allResponses.forEach((response, idx) => {
              const enrollmentId = response.student_enrollment || response.employee_id || 'N/A';
              const respondent = response.student_info?.name || response.faculty_info?.name || 'Anonymous';
              const department = response.student_info?.department || response.faculty_info?.department || 'N/A';
              const submitDate = new Date(response.submitted_at).toLocaleDateString('en-IN');
              const rating = response.overall_rating || response.responses?.overall_rating || 'N/A';
              const ratingStars = rating !== 'N/A' ? '⭐'.repeat(parseInt(rating)) : 'N/A';

              feedbackTableRows += `
        <tr>
          <td>${idx + 1}</td>
          <td>${enrollmentId}</td>
          <td style="font-family: monospace; font-size: 9px;">${response.registration_id || 'N/A'}</td>
          <td>${respondent}</td>
          <td>${department}</td>
          <td style="font-size: 9px;">${submitDate}</td>
          <td>${ratingStars}</td>
        </tr>`;
            });

            htmlContent += `
  <div class="table-section">
    <div class="table-section-title">Feedback Summary</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>ID</th>
          <th>Registration ID</th>
          <th>Name</th>
          <th>Department</th>
          <th>Submitted</th>
          <th>Rating</th>
        </tr>
      </thead>
      <tbody>
        ${feedbackTableRows}
      </tbody>
    </table>
  </div>`;

            // Add Detailed Responses Cards
            let detailedResponses = '';
            allResponses.forEach((response, index) => {
              const enrollmentId = response.student_enrollment || response.employee_id || 'N/A';
              const respondent = response.student_info?.name || response.faculty_info?.name || 'Anonymous';
              const submitTime = new Date(response.submitted_at).toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              });

              let qaHTML = '';
              if (feedbackForm?.elements && response.responses) {
                feedbackForm.elements.forEach(element => {
                  const value = response.responses[element.id];
                  if (value !== null && value !== undefined && value !== '') {
                    let displayValue = value;
                    if (element.type === 'rating' || element.type === 'star_rating') {
                      const filledStars = '★'.repeat(parseInt(value));
                      const emptyStars = '☆'.repeat(5 - parseInt(value));
                      displayValue = `${value}/5 <span class="stars">${filledStars}${emptyStars}</span>`;
                    } else if (Array.isArray(value)) {
                      displayValue = value.join(', ');
                    } else {
                      displayValue = String(value).replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    }
                    qaHTML += `
                      <tr>
                        <td class="question">${element.label || element.id}</td>
                        <td class="answer">${displayValue}</td>
                      </tr>
                    `;
                  }
                });
              }

              detailedResponses += `
    <div class="response-card">
      <div class="response-header">
        <span class="response-name">#${index + 1} - ${respondent}</span>
        <div class="response-meta">ID: ${enrollmentId} | Reg: ${response.registration_id || 'N/A'}<br>${submitTime}</div>
      </div>
      <table class="response-table">
        ${qaHTML}
      </table>
    </div>
              `;
            });

            htmlContent += `
  <div class="table-section">
    <div class="table-section-title">Detailed Feedback Responses</div>
    <div class="response-grid">
      ${detailedResponses}
    </div>
  </div>`;
          } else {
            // Fallback if API returns no responses
            console.log('No feedback responses from API');
            htmlContent += `
  <div class="section">
    <div class="section-title">Feedback Summary</div>
    <div class="info-item">
      <div class="info-label">Total Feedbacks Received:</div>
      <div style="color: #6b7280; font-size: 18px; font-weight: bold; margin-top: 10px;">${reportData.statistics.feedbacksReceived} feedbacks</div>
    </div>
    <div style="margin-top: 15px; padding: 15px; background: #f3f4f6; border-radius: 8px;">
      <p style="color: #6b7280; font-size: 10pt;">
        📊 <strong>${reportData.statistics.feedbacksReceived}</strong> participants have submitted feedback for this event.
        Detailed feedback responses can be viewed in the Feedback Management section.
      </p>
    </div>
  </div>`;
          }
        } catch (error) {
          console.error('Error fetching feedback data:', error);
          htmlContent += `
  <div class="section">
    <div class="section-title">Feedback Summary</div>
    <div class="info-item">
      <div class="info-label">Total Feedbacks Received:</div>
      <div style="color: #6b7280; font-size: 18px; font-weight: bold; margin-top: 10px;">${reportData.statistics.feedbacksReceived} feedbacks</div>
    </div>
  </div>`;
        }
      }

      htmlContent += `
  <div class="footer">
    <p>This report was generated automatically by CampusConnect Event Management System</p>
    <p>© ${new Date().getFullYear()} - All Rights Reserved</p>
  </div>
</body>
</html>`;

      // Create a new window and print
      const printWindow = window.open('', '_blank');
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
      }, 500);

      alert('Event report opened in new window. Use browser print to save as PDF.');
      setEventReportModalOpen(false);

    } catch (error) {
      setError('Failed to generate event report. Please try again.');
      alert('Failed to generate event report. Please try again.');
      console.error('Error generating event report:', error);
    }
  };

  // Custom Export Handler
  const handleCustomExport = async ({ eventFields, studentFields }) => {
    try {
      // Show loading toast
      const loadingToast = document.createElement('div');
      loadingToast.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3';
      loadingToast.innerHTML = `
        <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Fetching registrations...</span>
      `;
      document.body.appendChild(loadingToast);

      // Fetch all registrations
      let allRegistrations = [];
      const batchSize = 50;
      let currentPage = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await adminAPI.getEventRegistrations(eventId, {
          page: currentPage,
          limit: batchSize,
          status: 'all'
        });

        if (response.data.success && response.data.registrations) {
          allRegistrations = [...allRegistrations, ...response.data.registrations];
          
          loadingToast.innerHTML = `
            <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Loading... (${allRegistrations.length} registrations)</span>
          `;

          hasMore = response.data.has_more || false;
          currentPage++;
        } else {
          hasMore = false;
        }
      }

      if (allRegistrations.length === 0) {
        document.body.removeChild(loadingToast);
        alert('No registrations available to export');
        setCustomExportModalOpen(false);
        return;
      }

      loadingToast.innerHTML = `
        <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Generating PDF...</span>
      `;

      // Fetch HTML template
      const templateResponse = await fetch('/templates/custom_export.html');
      let htmlTemplate = await templateResponse.text();

      // Format dates
      const genDate = new Date().toLocaleDateString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      const startDate = event.start_datetime ? new Date(event.start_datetime).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }) : 'N/A';

      const endDate = event.end_datetime ? new Date(event.end_datetime).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }) : 'N/A';

      // Build event information section if any fields selected
      let eventInfoSection = '';
      if (eventFields.length > 0) {
        let eventInfoItems = '';
        
        // Format organizer info
        let organizerInfo = 'N/A';
        if (event.organizer_details && event.organizer_details.length > 0) {
          organizerInfo = event.organizer_details
            .map(org => `${org.full_name || org.name || 'Unknown'}, ${org.department || 'N/A'}`)
            .join(' | ');
        } else if (event.contacts && event.contacts.length > 0) {
          organizerInfo = event.contacts[0].name;
        }

        const eventFieldData = {
          organizer: organizerInfo,
          department: event.organizing_department || 'N/A',
          duration: `${startDate} - ${endDate}`,
          venue: event.venue || 'N/A',
          description: event.short_description || event.description || 'N/A',
          event_type: event.event_type || 'N/A',
          target_audience: event.target_audience ? event.target_audience.charAt(0).toUpperCase() + event.target_audience.slice(1) : 'N/A'
        };

        const eventFieldLabels = {
          organizer: 'Organizer',
          department: 'Department/Club',
          duration: 'Duration',
          venue: 'Venue',
          description: 'Description',
          event_type: 'Event Type',
          target_audience: 'Target Audience'
        };

        eventFields.forEach(field => {
          const label = eventFieldLabels[field];
          const value = eventFieldData[field];
          const colspan = (field === 'duration' || field === 'description') ? ' style="grid-column: span 2;"' : '';
          eventInfoItems += `
            <div class="info-item"${colspan}>
              <span class="info-label">${label}:</span>
              <span class="info-value">${value}</span>
            </div>
          `;
        });

        eventInfoSection = `
          <div class="section">
            <div class="section-title">Event Information</div>
            <div class="info-grid">
              ${eventInfoItems}
            </div>
          </div>
        `;
      }

      // Build table headers based on selected fields
      // Determine if event is for students or faculty
      const isStudentEvent = !event.target_audience || 
                             event.target_audience === 'student' || 
                             event.target_audience === 'students' || 
                             event.target_audience.toLowerCase().includes('student');

      const fieldLabels = {
        enrollment_no: isStudentEvent ? 'Enrollment No.' : 'Employee ID',
        full_name: 'Full Name',
        department: 'Department',
        semester: isStudentEvent ? 'Year' : 'Designation',
        email: 'Email',
        mobile_no: 'Mobile No.',
        contact: 'Contact',
        registration_datetime: 'Registration Date',
        registration_id: 'Registration ID',
        status: 'Status'
      };

      // Check if both mobile and email are selected, combine them as contact
      const hasBothMobileEmail = studentFields.includes('mobile_no') && studentFields.includes('email');
      let processedFields = [...studentFields];
      
      if (hasBothMobileEmail) {
        // Remove mobile_no and email, add contact
        processedFields = processedFields.filter(f => f !== 'mobile_no' && f !== 'email');
        const mobileIndex = studentFields.indexOf('mobile_no');
        const emailIndex = studentFields.indexOf('email');
        // Insert contact at the position of whichever came first
        const insertIndex = Math.min(mobileIndex, emailIndex);
        processedFields.splice(insertIndex, 0, 'contact');
      }

      // Determine orientation based on field count (including # column)
      const totalColumns = processedFields.length + 1; // +1 for # column
      const isLandscape = totalColumns > 5;

      let tableHeaders = '<th style="width: 5%;">#</th>';
      processedFields.forEach(field => {
        tableHeaders += `<th>${fieldLabels[field]}</th>`;
      });

      // Build table rows
      let tableRows = '';
      allRegistrations.forEach((registration, index) => {
        let rowCells = `<td>${index + 1}</td>`;
        
        processedFields.forEach(field => {
          let value = 'N/A';
          
          switch (field) {
            case 'enrollment_no':
              value = registration.user_type === 'faculty' 
                ? (registration.employee_id || 'N/A')
                : (registration.enrollment_no || 'N/A');
              break;
            case 'full_name':
              value = registration.full_name || registration.name || 'N/A';
              break;
            case 'department':
              value = registration.department || 'N/A';
              break;
            case 'semester':
              value = registration.user_type === 'faculty'
                ? (registration.designation || 'N/A')
                : (registration.semester || registration.year || 'N/A');
              break;
            case 'contact':
              // Combine email and mobile
              const email = registration.email || 'N/A';
              const mobile = registration.mobile_no || registration.contact_no || registration.phone || 'N/A';
              value = `<div style="font-size: 9px; line-height: 1.4;"><div>📧 ${email}</div><div>📞 ${mobile}</div></div>`;
              break;
            case 'email':
              value = registration.email || 'N/A';
              break;
            case 'mobile_no':
              value = registration.mobile_no || registration.contact_no || registration.phone || 'N/A';
              break;
            case 'registration_datetime':
              // Try multiple possible date field names
              const dateValue = registration.registration_datetime || 
                               registration.registration_date || 
                               registration.created_at || 
                               registration.registered_at ||
                               registration.createdAt;
              if (dateValue) {
                try {
                  value = new Date(dateValue).toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  });
                } catch (error) {
                  value = 'N/A';
                }
              } else {
                value = 'N/A';
              }
              break;
            case 'registration_id':
              value = registration.registration_id || 'N/A';
              break;
            case 'status':
              value = registration.status ? registration.status.charAt(0).toUpperCase() + registration.status.slice(1) : 'N/A';
              break;
          }
          
          rowCells += `<td>${value}</td>`;
        });
        
        tableRows += `<tr>${rowCells}</tr>`;
      });

      // Replace template placeholders
      htmlTemplate = htmlTemplate
        .replace(/{{DOCUMENT_TITLE}}/g, `Registration Report - ${event.event_name}`)
        .replace(/{{LOGO_URL}}/g, '/logo/ksv.png')
        .replace(/{{EVENT_ID}}/g, eventId)
        .replace(/{{EVENT_NAME}}/g, event.event_name)
        .replace(/{{GENERATION_DATE}}/g, genDate)
        .replace(/{{EVENT_INFO_SECTION}}/g, eventInfoSection)
        .replace(/{{PAGE_ORIENTATION}}/g, isLandscape ? 'landscape' : 'portrait')
        .replace(/{{TABLE_HEADERS}}/g, tableHeaders)
        .replace(/{{TABLE_ROWS}}/g, tableRows)
        .replace(/{{CURRENT_YEAR}}/g, new Date().getFullYear());

      // Remove loading toast
      document.body.removeChild(loadingToast);

      // Close modal
      setCustomExportModalOpen(false);

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

    } catch (error) {      
      // Remove loading toast if exists
      const loadingToast = document.querySelector('.fixed.top-4.right-4');
      if (loadingToast) {
        document.body.removeChild(loadingToast);
      }
      
      alert('Failed to generate export. Please try again.');
      setCustomExportModalOpen(false);
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
        return false;
      }

      const currentTime = new Date();

      // Calculate time difference in milliseconds
      const timeDifference = eventStartDateTime.getTime() - currentTime.getTime();

      // Convert 3 hours to milliseconds (3 * 60 * 60 * 1000)
      const threeHoursInMs = 3 * 60 * 60 * 1000;

      // Allow attendance if current time is within 3 hours of event start (or after event has started)
      const canTake = timeDifference <= threeHoursInMs;


      return canTake;
    } catch (error) {
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
                onClick={() => navigate(`/admin/events/${eventId}/attendance`, {
                  state: {
                    event_data: event,
                    event_stats: eventStats,
                    attendance_stats: attendanceStats
                  }
                })}
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
                      event_stats: eventStats,
                      attendance_stats: attendanceStats
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
                              setCustomExportModalOpen(true);
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

                          {/* QR Code Options */}
                          <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            QR Codes
                          </div>
                          <div
                            className="w-full flex items-center px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 cursor-pointer"
                            onClick={async () => {
                              try {
                                await generateEventQR(event.event_id, event.name);
                                setExportDropdownOpen(false);
                                setExportDropdownSticky(false);
                              } catch (error) {
                               
                                alert('Failed to generate Event QR code. Please try again.');
                              }
                            }}
                          >
                            <QrCode className="w-4 h-4 mr-3" />
                            Event QR
                          </div>
                          <div
                            className="w-full flex items-center px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 cursor-pointer"
                            onClick={async () => {
                              try {
                                await generateFeedbackQR(event.event_id, event.name);
                                setExportDropdownOpen(false);
                                setExportDropdownSticky(false);
                              } catch (error) {
                               
                                alert('Failed to generate Feedback QR code. Please try again.');
                              }
                            }}
                          >
                            <QrCode className="w-4 h-4 mr-3" />
                            Feedback QR
                          </div>

                          {/* Divider */}
                          <div className="border-t border-gray-200 my-1"></div>

                          {/* Additional Report Options */}
                          <div
                            className="w-full flex items-center px-4 py-2 text-sm text-left text-gray-400 cursor-not-allowed relative group"
                            title="Coming Soon"
                          >
                            <CreditCard className="w-4 h-4 mr-3 opacity-50" />
                            <span className="opacity-50">Budget Report</span>
                            
                            {/* Hover Banner */}
                            <div className="absolute left-0 right-0 top-0 bottom-0 bg-gradient-to-r from-yellow-50 to-yellow-100 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded flex items-center justify-center pointer-events-none">
                              <span className="text-xs font-semibold text-yellow-800 bg-white px-3 py-1 rounded-full shadow-sm">
                                🚀 Coming Soon
                              </span>
                            </div>
                          </div>
                          <div
                            className="w-full flex items-center px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 cursor-pointer"
                            onClick={async () => {
                              try {
                                // Show loading indicator
                                const loadingToast = document.createElement('div');
                                loadingToast.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3';
                                loadingToast.innerHTML = `
                                  <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  <span>Generating sign sheet... Please wait</span>
                                `;
                                document.body.appendChild(loadingToast);

                                // Fetch all registrations using the unified participants API
                                const response = await fetchParticipantsWithCache(eventId, adminAPI, {});

                                if (!response?.success || !response.participants || response.participants.length === 0) {
                                  document.body.removeChild(loadingToast);
                                  alert('No registrations available to generate sign sheet');
                                  setExportDropdownOpen(false);
                                  setExportDropdownSticky(false);
                                  return;
                                }

                                // Transform participants similar to fetchAllRegistrations
                                const allRegistrations = [];
                                const isTeamBasedEvent = event?.is_team_based || false;
                                
                                response.participants.forEach(participant => {
                                  if (participant.registration_type === 'individual') {
                                    if (participant.participant_type === 'faculty') {
                                      // Faculty individual registration
                                      allRegistrations.push({
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
                                      allRegistrations.push({
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
                                    // For team-based events, keep team as a unit
                                    if (isTeamBasedEvent) {
                                      const teamMembers = participant.team_members || [];
                                      
                                      // Flatten team member structure - extract from nested student object
                                      const flattenedMembers = teamMembers.map(member => ({
                                        registration_id: member.registration_id || '',
                                        name: member.name || '',
                                        full_name: member.name || member.full_name || '',
                                        enrollment_no: member.enrollment_no || '',
                                        phone: member.phone || member.mobile_no || '',
                                        mobile_no: member.phone || member.mobile_no || '',
                                        email: member.email || '',
                                        department: member.department || '',
                                        semester: member.semester || '',
                                        is_team_leader: member.is_team_leader || false
                                      }));
                                      
                                      const teamLeader = flattenedMembers.find(m => m.is_team_leader) || flattenedMembers[0] || {};
                                      
                                      allRegistrations.push({
                                        full_name: participant.team_name || participant.name,
                                        name: participant.team_name || participant.name,
                                        team_name: participant.team_name || participant.name,
                                        team_leader_name: teamLeader.name || teamLeader.full_name || 'Unknown',
                                        team_leader_enrollment: teamLeader.enrollment_no || '',
                                        team_leader_phone: teamLeader.phone || teamLeader.mobile_no || '',
                                        team_leader_email: teamLeader.email || '',
                                        team_size: participant.team_size || participant.member_count || flattenedMembers.length,
                                        member_count: participant.member_count || participant.team_size || flattenedMembers.length,
                                        team_members: flattenedMembers,
                                        department: teamLeader.department || participant.department || 'N/A',
                                        registration_date: participant.registration_date,
                                        registration_id: participant.registration_id,
                                        registration_type: 'team',
                                        user_type: participant.participant_type || 'student'
                                      });
                                    } else {
                                      // For non-team events, expand team members as individual entries
                                      const teamMembers = participant.team_members || [];
                                      teamMembers.forEach(member => {
                                        allRegistrations.push({
                                          full_name: member.name || member.full_name || 'Unknown Member',
                                          name: member.name || member.full_name || 'Unknown Member',
                                          enrollment_no: member.enrollment_no || '',
                                          email: member.email || '',
                                          department: member.department || '',
                                          semester: member.semester || '',
                                          phone: member.phone || member.mobile_no || '',
                                          mobile_no: member.phone || member.mobile_no || '',
                                          contact_no: member.phone || member.mobile_no || '',
                                          registration_id: participant.registration_id,
                                          registration_type: 'team_member',
                                          user_type: participant.participant_type || 'student',
                                          team_name: participant.team_name || participant.name,
                                          is_team_leader: member.is_team_leader || false
                                        });
                                      });
                                    }
                                  }
                                });

                                loadingToast.innerHTML = `
                                  <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  <span>Generating PDF... (${allRegistrations.length} registrations)</span>
                                `;

                                // Fetch HTML template
                                const templateResponse = await fetch('/templates/sign_sheet.html');
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
                                if (event.organizer_details && event.organizer_details.length > 0) {
                                  organizerInfo = event.organizer_details
                                    .map(org => `${org.full_name || org.name || 'Unknown'}, ${org.department || 'N/A'}`)
                                    .join(' | ');
                                } else if (event.contacts && event.contacts.length > 0) {
                                  organizerInfo = event.contacts[0].name;
                                }

                                const startDate = event.start_datetime ? new Date(event.start_datetime).toLocaleString('en-IN', {
                                  timeZone: 'Asia/Kolkata',
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                }) : 'N/A';

                                const endDate = event.end_datetime ? new Date(event.end_datetime).toLocaleString('en-IN', {
                                  timeZone: 'Asia/Kolkata',
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                }) : 'N/A';

                                // Format target audience
                                const targetAudience = event.target_audience 
                                  ? event.target_audience.charAt(0).toUpperCase() + event.target_audience.slice(1)
                                  : 'Students & Faculty';

                                // Determine column header based on event's target audience
                                const isFacultyEvent = event.target_audience === 'faculty';
                                const isTeamBased = event?.is_team_based || false;
                                const idColumnHeader = isFacultyEvent ? 'Employee ID' : 'Enrollment No.';

                                // Generate table rows
                                let tableRows = '';
                                let rowCounter = 1;
                                
                                allRegistrations.forEach((registration) => {
                                  if (registration.registration_type === 'team') {
                                    // Team registration - show team header then members
                                    const teamName = registration.team_name || registration.full_name || registration.name || 'Unknown Team';
                                    const teamSize = registration.team_size || registration.member_count || 0;
                                    const teamMembers = registration.team_members || [];

                                    // Team Header Row (merged cells)
                                    tableRows += `
                                      <tr style="background-color: #dbeafe; border-left: 4px solid #3b82f6;">
                                        <td colspan="7" style="font-weight: bold; padding: 10px 8px; font-size: 10px;">
                                          🏆 ${teamName} 
                                          <span style="color: #666; font-weight: normal; margin-left: 10px;">
                                            (Registration ID: ${registration.registration_id || 'N/A'} | ${teamSize} members)
                                          </span>
                                        </td>
                                      </tr>
                                    `;

                                    // Sort members to put team leader first
                                    const sortedMembers = [...teamMembers].sort((a, b) => {
                                      if (a.is_team_leader) return -1;
                                      if (b.is_team_leader) return 1;
                                      return 0;
                                    });

                                    // Team Member Rows
                                    sortedMembers.forEach((member, memberIndex) => {
                                      const memberName = member.student?.name || member.name || member.full_name || 'Unknown Member';
                                      const enrollmentId = member.student?.enrollment_no || member.enrollment_no || 'N/A';
                                      // Use individual member registration ID from backend
                                      const memberRegistrationId = member.registration_id || 'N/A';
                                      const department = member.student?.department || member.department || 'N/A';
                                      const phone = member.student?.phone || member.phone || member.mobile_no || member.contact_no || 'N/A';
                                      const email = member.student?.email || member.email || 'N/A';
                                      const isLeader = member.is_team_leader || false;

                                      tableRows += `
                                        <tr style="background-color: #f0f9ff;">
                                          <td>${rowCounter}</td>
                                          <td>${memberRegistrationId}</td>
                                          <td>${enrollmentId}</td>
                                          <td>
                                            ${memberName}
                                            ${isLeader ? '<span style="background: #10b981; color: white; padding: 2px 6px; border-radius: 3px; font-size: 7px; margin-left: 5px;">LEADER</span>' : ''}
                                          </td>
                                          <td>${department}</td>
                                          <td class="contact-cell">
                                            <div>📞 ${phone}</div>
                                            <div>✉️ ${email}</div>
                                          </td>
                                          <td class="sign-box"></td>
                                        </tr>
                                      `;
                                      rowCounter++;
                                    });
                                  } else {
                                    // Individual registration
                                    const name = registration.full_name || registration.name || 'Unknown';
                                    
                                    // Determine ID field based on the individual registration's user_type
                                    const enrollmentId = registration.user_type === 'faculty' 
                                      ? (registration.employee_id || 'N/A')
                                      : (registration.enrollment_no || 'N/A');
                                    
                                    const department = registration.department || 'N/A';
                                    const phone = registration.mobile_no || registration.contact_no || registration.phone || 'N/A';
                                    const email = registration.email || 'N/A';

                                    tableRows += `
                                      <tr>
                                        <td>${rowCounter}</td>
                                        <td>${registration.registration_id || 'N/A'}</td>
                                        <td>${enrollmentId}</td>
                                        <td>${name}</td>
                                        <td>${department}</td>
                                        <td class="contact-cell">
                                          <div>📞 ${phone}</div>
                                          <div>✉️ ${email}</div>
                                        </td>
                                        <td class="sign-box"></td>
                                      </tr>
                                    `;
                                    rowCounter++;
                                  }
                                });

                                // Replace template placeholders
                                htmlTemplate = htmlTemplate
                                  .replace(/{{DOCUMENT_TITLE}}/g, `Sign Sheet - ${event.event_name}`)
                                  .replace(/{{LOGO_URL}}/g, '/logo/ksv.png')
                                  .replace(/{{EVENT_ID}}/g, eventId)
                                  .replace(/{{EVENT_NAME}}/g, event.event_name)
                                  .replace(/{{GENERATION_DATE}}/g, genDate)
                                  .replace(/{{START_DATE}}/g, startDate)
                                  .replace(/{{END_DATE}}/g, endDate)
                                  .replace(/{{VENUE}}/g, event.venue || 'N/A')
                                  .replace(/{{ORGANIZER}}/g, organizerInfo)
                                  .replace(/{{DEPARTMENT_CLUB}}/g, event.organizing_department || 'N/A')
                                  .replace(/{{TOTAL_REGISTRATIONS}}/g, allRegistrations.length)
                                  .replace(/{{ID_COLUMN_HEADER}}/g, idColumnHeader)
                                  .replace(/{{TABLE_ROWS}}/g, tableRows)
                                  .replace(/{{TEAM_ROWS}}/g, '') // Empty for now, teams handled in TABLE_ROWS
                                  .replace(/{{CURRENT_YEAR}}/g, new Date().getFullYear());

                                // Remove loading toast
                                document.body.removeChild(loadingToast);

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

                              } catch (error) {
                                
                                
                                // Remove loading toast if exists
                                const loadingToast = document.querySelector('.fixed.top-4.right-4');
                                if (loadingToast) {
                                  document.body.removeChild(loadingToast);
                                }
                                
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
                                // Fetch attendance data
                                const [configResponse, analyticsResponse] = await Promise.all([
                                  adminAPI.getAttendanceConfigAndParticipants(eventId),
                                  adminAPI.getAttendanceAnalytics(eventId)
                                ]);

                                if (!configResponse.data.success) {
                                  alert('No attendance data available to export');
                                  setExportDropdownOpen(false);
                                  setExportDropdownSticky(false);
                                  return;
                                }

                                const config = configResponse.data.data.config;
                                const participants = configResponse.data.data.participants;
                                const analytics = analyticsResponse.data.success ? analyticsResponse.data.data : null;

                                if (!participants || participants.length === 0) {
                                  alert('No participants available to export');
                                  setExportDropdownOpen(false);
                                  setExportDropdownSticky(false);
                                  return;
                                }

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
                                if (event.organizer_details && event.organizer_details.length > 0) {
                                  organizerInfo = event.organizer_details
                                    .map(org => `${org.full_name || org.name || 'Unknown'}, ${org.department || 'N/A'}`)
                                    .join(' | ');
                                } else if (event.contacts && event.contacts.length > 0) {
                                  organizerInfo = event.contacts[0].name;
                                }

                                const startDate = event.start_datetime ? new Date(event.start_datetime).toLocaleString('en-IN', {
                                  timeZone: 'Asia/Kolkata',
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                }) : 'N/A';

                                const endDate = event.end_datetime ? new Date(event.end_datetime).toLocaleString('en-IN', {
                                  timeZone: 'Asia/Kolkata',
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                }) : 'N/A';

                                // Get total sessions count
                                const totalSessions = config?.attendance_strategy?.sessions?.length || config?.sessions?.length || 1;

                                // Determine if event is for students or faculty
                                const targetAudience = event?.target_audience || config?.target_audience || 'student';
                                const isStudentEvent = targetAudience === 'student' || targetAudience === 'students' || targetAudience.includes('student');
                                const isTeamBasedEvent = event?.is_team_based || false;
                                const semDesigColumnHeader = isStudentEvent ? 'Year' : 'Designation';

                                // Generate attendance table rows
                                let tableRows = '';
                                let rowCounter = 1;
                                
                                participants.forEach((participant) => {
                                  // Check if this is a team registration
                                  if (isTeamBasedEvent && participant.registration_type === 'team') {
                                    // Team-based attendance
                                    const attendance = participant.attendance || {};
                                    const teamName = participant.team?.team_name || participant.team_name || participant.team?.name || 'Unknown Team';
                                    const teamSize = participant.team?.team_size || participant.team_size || participant.member_count || participant.team?.members?.length || 0;
                                    
                                    // Check both attendance.status and team.status for backward compatibility
                                    const teamStatus = attendance.status || participant.team?.status || 'confirmed';
                                    
                                    let teamStatusBadge = '';
                                    let teamStatusPercentage = '';
                                    
                                    switch (teamStatus) {
                                      case 'present':
                                        teamStatusBadge = '<span style="color: #16a34a; font-weight: 600;">Present</span>';
                                        teamStatusPercentage = '100%';
                                        break;
                                      case 'partial':
                                        teamStatusBadge = '<span style="color: #ca8a04; font-weight: 600;">Partial</span>';
                                        teamStatusPercentage = `${attendance.percentage || 0}%`;
                                        break;
                                      case 'absent':
                                        teamStatusBadge = '<span style="color: #dc2626; font-weight: 600;">Absent</span>';
                                        teamStatusPercentage = '0%';
                                        break;
                                      default:
                                        teamStatusBadge = '<span style="color: #6b7280;">Not Marked</span>';
                                        teamStatusPercentage = '0%';
                                    }

                                    // Calculate sessions marked for team
                                    let teamSessionsMarked;
                                    // Use actual attendance.sessions array or sessions_attended count
                                    const sessionsAttended = attendance.sessions_attended || 
                                      (attendance.sessions && Array.isArray(attendance.sessions) ? 
                                        attendance.sessions.filter(s => s.status === 'present').length : 0);
                                    const totalSessionsForTeam = attendance.total_sessions || totalSessions;
                                    teamSessionsMarked = `${sessionsAttended}/${totalSessionsForTeam}`;

                                    // Team Header Row (merged cells)
                                    tableRows += `
                                      <tr style="background-color: #dbeafe; border-left: 4px solid #3b82f6;">
                                        <td colspan="9" style="font-weight: bold; padding: 10px 8px;">
                                          🏆 ${teamName} 
                                          <span style="color: #666; font-weight: normal; margin-left: 10px;">
                                            (Registration ID: ${participant.registration_id || 'N/A'} | ${teamSize} members | Team Status: ${teamStatusBadge} - ${teamStatusPercentage})
                                          </span>
                                        </td>
                                      </tr>
                                    `;

                                    // Get team members with their individual attendance
                                    const teamMembers = participant.team_members || participant.team?.members || [];
                                    
                                    // Sort members to put team leader first
                                    const sortedMembers = [...teamMembers].sort((a, b) => {
                                      if (a.is_team_leader) return -1;
                                      if (b.is_team_leader) return 1;
                                      return 0;
                                    });

                                    // Team Member Rows
                                    sortedMembers.forEach((member, memberIndex) => {
                                      const memberName = member.student?.name || member.name || member.full_name || 'Unknown Member';
                                      const enrollmentId = member.student?.enrollment_no || member.enrollment_no || member.employee_id || 'N/A';
                                      // Use individual member registration ID from backend
                                      const memberRegistrationId = member.registration_id || 'N/A';
                                      const department = member.student?.department || member.department || 'N/A';
                                      const year = member.student?.semester || member.year || member.semester || 'N/A';
                                      const isLeader = member.is_team_leader || false;

                                      // Get individual member attendance if available
                                      const memberAttendance = member.attendance || {};
                                      let memberStatusBadge = '';
                                      let memberStatusPercentage = '';
                                      
                                      switch (memberAttendance.status) {
                                        case 'present':
                                          memberStatusBadge = '<span style="color: #16a34a; font-weight: 600;">Present</span>';
                                          memberStatusPercentage = '100%';
                                          break;
                                        case 'partial':
                                          memberStatusBadge = '<span style="color: #ca8a04; font-weight: 600;">Partial</span>';
                                          memberStatusPercentage = `${memberAttendance.percentage || 0}%`;
                                          break;
                                        case 'absent':
                                          memberStatusBadge = '<span style="color: #dc2626; font-weight: 600;">Absent</span>';
                                          memberStatusPercentage = '0%';
                                          break;
                                        default:
                                          // Use team status as default
                                          memberStatusBadge = teamStatusBadge;
                                          memberStatusPercentage = teamStatusPercentage;
                                      }

                                      let memberSessionsMarked;
                                      // Use actual member attendance sessions or sessions_attended count
                                      const memberSessionsAttended = memberAttendance.sessions_attended || 
                                        (memberAttendance.sessions && Array.isArray(memberAttendance.sessions) ? 
                                          memberAttendance.sessions.filter(s => s.status === 'present').length : 0);
                                      const memberTotalSessions = memberAttendance.total_sessions || totalSessions;
                                      memberSessionsMarked = `${memberSessionsAttended}/${memberTotalSessions}`;

                                      tableRows += `
                                        <tr style="background-color: #f0f9ff;">
                                          <td>${rowCounter}</td>
                                          <td>${enrollmentId}</td>
                                          <td>${memberRegistrationId}</td>
                                          <td>
                                            ${memberName}
                                            ${isLeader ? '<span style="background: #10b981; color: white; padding: 2px 6px; border-radius: 3px; font-size: 7px; margin-left: 5px;">LEADER</span>' : ''}
                                          </td>
                                          <td>${department}</td>
                                          <td>${year}</td>
                                          <td>${memberStatusBadge}</td>
                                          <td>${memberStatusPercentage}</td>
                                          <td>${memberSessionsMarked}</td>
                                        </tr>
                                      `;
                                      rowCounter++;
                                    });
                                  } else {
                                    // Individual attendance
                                    const isStudent = participant.participant_type === 'student';
                                    const profile = isStudent ? participant.student : participant.faculty;
                                    const attendance = participant.attendance || {};
                                    const enrollmentId = profile?.enrollment_no || profile?.employee_id || 'N/A';
                                    
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

                                    // Calculate sessions marked
                                    let sessionsMarked;
                                    if (attendance.sessions_marked && Array.isArray(attendance.sessions_marked)) {
                                      sessionsMarked = `${attendance.sessions_marked.length}/${totalSessions}`;
                                    } else if (attendance.status === 'present') {
                                      sessionsMarked = `${totalSessions}/${totalSessions}`;
                                    } else if (attendance.status === 'partial') {
                                      const markedCount = Math.round((attendance.percentage / 100) * totalSessions);
                                      sessionsMarked = `${markedCount}/${totalSessions}`;
                                    } else {
                                      sessionsMarked = `0/${totalSessions}`;
                                    }

                                    // Get year/designation
                                    let semesterOrDesignation = 'N/A';
                                    if (isStudent) {
                                      semesterOrDesignation = profile?.year || profile?.semester || participant.student?.year || 'N/A';
                                    } else {
                                      semesterOrDesignation = participant.faculty?.designation || profile?.designation || 'N/A';
                                    }

                                    tableRows += `
                                      <tr>
                                        <td>${rowCounter}</td>
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
                                    rowCounter++;
                                  }
                                });

                                // Calculate attendance percentage
                                const totalRegistrations = analytics?.total_registered || participants.length;
                                const presentCount = analytics?.total_present || 0;
                                const partialCount = analytics?.total_partial || 0;
                                
                                const attendancePercentage = analytics?.attendance_rate 
                                  ? analytics.attendance_rate
                                  : totalRegistrations > 0 
                                    ? ((presentCount + (partialCount * 0.5)) / totalRegistrations * 100).toFixed(1)
                                    : '0.0';

                                // Get strategy name
                                const strategyName = event?.attendance_strategy?.strategy || 
                                                    config?.attendance_strategy?.strategy || 
                                                    config?.attendance_strategy_type ||
                                                    'Single Mark';
                                
                                const formatStrategyName = (strat) => {
                                  if (!strat) return 'Single Mark';
                                  return strat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                };

                                // Replace template placeholders
                                htmlTemplate = htmlTemplate
                                  .replace(/{{DOCUMENT_TITLE}}/g, `Attendance Report - ${event.event_name}`)
                                  .replace(/{{LOGO_URL}}/g, '/logo/ksv.png')
                                  .replace(/{{EVENT_ID}}/g, eventId)
                                  .replace(/{{EVENT_NAME}}/g, event.event_name)
                                  .replace(/{{GENERATION_DATE}}/g, genDate)
                                  .replace(/{{START_DATE}}/g, startDate)
                                  .replace(/{{END_DATE}}/g, endDate)
                                  .replace(/{{VENUE}}/g, event.venue || 'N/A')
                                  .replace(/{{SHORT_DESCRIPTION}}/g, event.short_description || 'N/A')
                                  .replace(/{{ORGANIZER}}/g, organizerInfo)
                                  .replace(/{{DEPARTMENT_CLUB}}/g, event.organizing_department || 'N/A')
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

                              } catch (error) {
                                
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
                                // Fetch feedback data first
                                const [formResponse, analyticsResponse, responsesResponse] = await Promise.all([
                                  adminAPI.getFeedbackForm(eventId),
                                  adminAPI.getFeedbackAnalytics(eventId),
                                  adminAPI.getFeedbackResponses(eventId, { page: 1, limit: 1000 })
                                ]);

                                if (!formResponse.data.success || !responsesResponse.data.success) {
                                  alert('No feedback data available to export');
                                  setExportDropdownOpen(false);
                                  setExportDropdownSticky(false);
                                  return;
                                }

                                const feedbackForm = formResponse.data.feedback_form;
                                const feedbackAnalytics = analyticsResponse.data;
                                const allResponses = responsesResponse.data.responses || [];

                                if (allResponses.length === 0) {
                                  alert('No feedback responses available to export');
                                  setExportDropdownOpen(false);
                                  setExportDropdownSticky(false);
                                  return;
                                }

                                // Fetch HTML template
                                const templateResponse = await fetch('/templates/feedback_report.html');
                                let htmlTemplate = await templateResponse.text();

                                // Populate template with data
                                const genDate = new Date().toLocaleDateString('en-IN', { 
                                  timeZone: 'Asia/Kolkata',
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                });

                                const responseRate = feedbackAnalytics?.summary?.response_rate || 
                                  (eventStats?.registrations_count > 0 ? Math.round((allResponses.length / eventStats.registrations_count) * 100) : 0);

                                const startDate = event.start_datetime ? new Date(event.start_datetime).toLocaleString('en-IN', {
                                  timeZone: 'Asia/Kolkata',
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                }) : 'N/A';

                                const endDate = event.end_datetime ? new Date(event.end_datetime).toLocaleString('en-IN', {
                                  timeZone: 'Asia/Kolkata',
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                }) : 'N/A';

                                // Format organizer details
                                let organizerInfo = 'N/A';
                                if (event.organizer_details && event.organizer_details.length > 0) {
                                  organizerInfo = event.organizer_details
                                    .map(org => `${org.full_name || org.name || 'Unknown'}, ${org.department || 'N/A'}`)
                                    .join(' | ');
                                } else if (event.contacts && event.contacts.length > 0) {
                                  organizerInfo = event.contacts[0].name;
                                }

                                // Generate ratings HTML
                                let ratingsHTML = '';
                                if (feedbackAnalytics?.element_analytics) {
                                  Object.entries(feedbackAnalytics.element_analytics).forEach(([elementId, analytics]) => {
                                    if (analytics.type === 'rating' && analytics.average && typeof analytics.average === 'number') {
                                      const rating = Math.round(analytics.average);
                                      const filledStars = '★'.repeat(rating);
                                      const emptyStars = '☆'.repeat(5 - rating);
                                      ratingsHTML += `
                                        <div class="rating-row">
                                          <span class="rating-label">${analytics.label || 'Rating'}</span>
                                          <span class="rating-stars">${filledStars}${emptyStars}</span>
                                          <span class="rating-value">${analytics.average.toFixed(1)}/5</span>
                                        </div>
                                      `;
                                    }
                                  });
                                }

                                if (!ratingsHTML) {
                                  ratingsHTML = '<p style="padding: 10px; color: #666;">No rating data available</p>';
                                }

                                // Generate table rows
                                let tableRows = '';
                                allResponses.forEach((response, index) => {
                                  const rating = feedbackForm?.elements?.find(el => el.type === 'rating' || el.type === 'star_rating');
                                  const ratingValue = rating ? (response.responses?.[rating.id] || 'N/A') : 'N/A';
                                  const enrollmentId = response.student_enrollment || response.employee_id || 'N/A';
                                  const submitTime = new Date(response.submitted_at).toLocaleString('en-IN', {
                                    timeZone: 'Asia/Kolkata',
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                  });

                                  tableRows += `
                                    <tr>
                                      <td>${index + 1}</td>
                                      <td>${enrollmentId}</td>
                                      <td>${response.registration_id || 'N/A'}</td>
                                      <td>${response.student_info?.name || response.faculty_info?.name || 'Anonymous'}</td>
                                      <td>${response.student_info?.department || response.faculty_info?.department || 'N/A'}</td>
                                      <td>${submitTime}</td>
                                      <td>${ratingValue !== 'N/A' ? `${ratingValue}/5` : 'N/A'}</td>
                                    </tr>
                                  `;
                                });

                                // Generate detailed responses
                                let detailedResponses = '';
                                allResponses.forEach((response, index) => {
                                  const enrollmentId = response.student_enrollment || response.employee_id || 'N/A';
                                  const respondent = response.student_info?.name || response.faculty_info?.name || 'Anonymous';
                                  const submitTime = new Date(response.submitted_at).toLocaleString('en-IN', {
                                    timeZone: 'Asia/Kolkata',
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                  });

                                  let qaHTML = '';
                                  if (feedbackForm?.elements && response.responses) {
                                    feedbackForm.elements.forEach(element => {
                                      const value = response.responses[element.id];
                                      if (value !== null && value !== undefined && value !== '') {
                                        let displayValue = value;
                                        if (element.type === 'rating' || element.type === 'star_rating') {
                                          const filledStars = '★'.repeat(parseInt(value));
                                          const emptyStars = '☆'.repeat(5 - parseInt(value));
                                          displayValue = `${value}/5 <span class="stars">${filledStars}${emptyStars}</span>`;
                                        } else if (Array.isArray(value)) {
                                          displayValue = value.join(', ');
                                        } else {
                                          displayValue = String(value).replace(/</g, '&lt;').replace(/>/g, '&gt;');
                                        }
                                        qaHTML += `
                                          <tr>
                                            <td class="question">${element.label || element.id}</td>
                                            <td class="answer">${displayValue}</td>
                                          </tr>
                                        `;
                                      }
                                    });
                                  }

                                  detailedResponses += `
                                    <div class="response-card">
                                      <div class="response-header">
                                        <span class="response-name">#${index + 1} - ${respondent}</span>
                                        <div class="response-meta">ID: ${enrollmentId} | Reg: ${response.registration_id || 'N/A'}<br>${submitTime}</div>
                                      </div>
                                      <table class="response-table">
                                        ${qaHTML}
                                      </table>
                                    </div>
                                  `;
                                });

                                // Replace template placeholders
                                htmlTemplate = htmlTemplate
                                  .replace(/{{DOCUMENT_TITLE}}/g, `Feedback Report - ${event.event_name}`)
                                  .replace(/{{LOGO_URL}}/g, '/logo/ksv.png')
                                  .replace(/{{EVENT_ID}}/g, eventId)
                                  .replace(/{{EVENT_NAME}}/g, event.event_name)
                                  .replace(/{{GENERATION_DATE}}/g, genDate)
                                  .replace(/{{START_DATE}}/g, startDate)
                                  .replace(/{{END_DATE}}/g, endDate)
                                  .replace(/{{VENUE}}/g, event.venue || 'N/A')
                                  .replace(/{{SHORT_DESCRIPTION}}/g, event.short_description || 'N/A')
                                  .replace(/{{ORGANIZER}}/g, organizerInfo)
                                  .replace(/{{DEPARTMENT_CLUB}}/g, event.organizing_department || 'N/A')
                                  .replace(/{{TOTAL_REGISTRATIONS}}/g, eventStats?.registrations_count || 0)
                                  .replace(/{{ATTENDANCE_COUNT}}/g, 
                                    attendanceStats?.present_count + (attendanceStats?.partial_count || 0) || 
                                    eventStats?.attendance_count || 
                                    0)
                                  .replace(/{{TOTAL_RESPONSES}}/g, allResponses.length)
                                  .replace(/{{RESPONSE_RATE}}/g, responseRate)
                                  .replace(/{{RATINGS_HTML}}/g, ratingsHTML)
                                  .replace(/{{TABLE_ROWS}}/g, tableRows)
                                  .replace(/{{DETAILED_RESPONSES}}/g, detailedResponses)
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

                              } catch (error) {
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
                            onClick={async () => {
                              // Fetch all registrations before opening modal
                              if (allRegistrations.length === 0) {
                                await fetchAllRegistrations();
                              }
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
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 ${event.is_certificate_based ? 'lg:grid-cols-4' : 'lg:grid-cols-3 max-w-4xl mx-auto'}`}>
              <div className="bg-white rounded-lg stats-card border-l-4 border-blue-500 p-4 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <i className="fas fa-users text-blue-500 text-lg"></i>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-gray-500 text-xs font-medium">Total Registrations</p>
                      <p className="text-lg font-bold text-gray-800">
                        {eventStats.is_team_based ?
                          `Teams: ${recentRegistrations.length || 0}` :
                          `Registrations: ${recentRegistrations.length || 0}`
                        }
                      </p>
                      <p className="text-xs text-gray-400">

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
                className="bg-white rounded-lg stats-card border-l-4 border-purple-500 p-4 hover:shadow-lg transition-all duration-300"
                onClick={handleViewAttendanceBreakdown}
                title="Click to view detailed attendance breakdown"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <i className="fas fa-check-circle text-purple-500 text-lg"></i>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-gray-500 text-xs font-medium">
                        Attendance Count
                      </p>
                      <p className="text-xl flex flex-col font-bold text-gray-800">
                        {attendanceStats ?
                          (attendanceStats.present_count + (attendanceStats.partial_count || 0)) :
                          (eventStats?.attendance_count || 0)
                        }
                        
                        <span className="text-green-600 text-xs font-medium">
                          {attendanceStats ?
                            `${attendanceStats.attendance_percentage || 0}% Attendance Rate` :
                            `${eventStats.attendance_count && eventStats.registrations_count ?
                              Math.round((eventStats.attendance_count / eventStats.registrations_count) * 100) :
                              0
                            }% Attendance Rate`
                          }
                        </span>
                      </p>
                     
                    </div>
                  </div>
                  <div className="text-purple-500">
                    <i className="fas fa-chart-pie text-base"></i>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg stats-card border-l-4 border-yellow-500 p-4 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <i className="fas fa-comments text-yellow-500 text-lg"></i>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-gray-500 text-xs font-medium">Total Feedbacks</p>
                      <p className="text-xl font-bold text-gray-800">{eventStats.feedback_count || 0}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        {eventStats.avg_rating ? (
                          <>
                            <i className="fas fa-star text-yellow-400"></i>
                            <span>{eventStats.avg_rating}/5 avg rating</span>
                          </>
                        ) : (
                          <span>No ratings yet</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {event.is_certificate_based && (
                <div className="bg-white rounded-lg stats-card border-l-4 border-green-500 p-4 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <i className="fas fa-certificate text-green-500 text-lg"></i>
                        </div>
                      </div>
                      <div className="ml-3">
                        <p className="text-gray-500 text-xs font-medium">Certificates Issued</p>
                        <p className="text-xl font-bold text-gray-800">{eventStats.certificates_count || 0}</p>
                        <p className="text-xs text-gray-400">
                          {eventStats.feedback_count > 0 ?
                            `${Math.round((eventStats.certificates_count / eventStats.feedback_count) * 100)}% completion rate` :
                            '0% completion rate'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
                      <RichTextDisplay
                        content={event.detailed_description}
                        className="text-sm"
                        maxLength={300}
                        showReadMore={true}
                      />
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
                            onClick={() => {
                              setPosterLoading(true);
                              setPosterError(false);
                              setPosterModalOpen(true);
                            }}
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
                                event.attendance_strategy?.criteria?.minimum_percentage ||
                                event.attendance_strategy?.minimum_percentage ||
                                event.attendance_strategy?.pass_criteria?.minimum_percentage ||
                                event.dynamic_attendance?.criteria?.minimum_percentage ||
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
                      size='sm'
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



          {/* Event Poster Modal */}
          {posterModalOpen && (
            <div className="fixed inset-0 backdrop-blur-sm bg-black/50 flex items-center justify-center z-[99999] animate-in fade-in duration-200 p-4">
              <div className="relative max-w-full max-h-full w-full h-full flex items-center justify-center overflow-auto">
                {/* Close Button - Fixed position with higher z-index */}
                <button
                  onClick={() => {
                    setPosterModalOpen(false);
                    setPosterLoading(false);
                    setPosterZoom(1);
                  }}
                  className="fixed top-4 right-4 z-[100001] bg-black/80 hover:bg-black text-white rounded-full p-2 transition-colors shadow-lg"
                  title="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Zoom Controls - Fixed position */}
                {!posterLoading && (
                  <div className="fixed top-4 left-4 z-[100001] flex gap-2 bg-black/80 rounded-lg p-2 shadow-lg">
                    <button
                      onClick={() => setPosterZoom(prev => Math.min(prev + 0.25, 3))}
                      className="text-white hover:text-blue-400 transition-colors p-2 rounded hover:bg-white/10"
                      title="Zoom In"
                      disabled={posterZoom >= 3}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setPosterZoom(prev => Math.max(prev - 0.25, 0.5))}
                      className="text-white hover:text-blue-400 transition-colors p-2 rounded hover:bg-white/10"
                      title="Zoom Out"
                      disabled={posterZoom <= 0.5}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setPosterZoom(1)}
                      className="text-white hover:text-blue-400 transition-colors px-3 py-2 rounded hover:bg-white/10 text-sm font-medium"
                      title="Reset Zoom"
                    >
                      {Math.round(posterZoom * 100)}%
                    </button>
                  </div>
                )}

                {/* Loading Spinner */}
                {posterLoading && !posterError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-[100000]">
                    <div className="text-center">
                      <svg className="w-12 h-12 animate-spin text-white mx-auto" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <p className="text-white mt-3 text-sm">Loading poster...</p>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {posterError && (
                  <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-2xl max-w-md mx-auto">
                    <svg className="w-16 h-16 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Poster Not Found</h3>
                    <p className="text-gray-600 text-center mb-6">
                      The event poster could not be found or has been removed. Please reupload the poster.
                    </p>
                    <button
                      onClick={() => {
                        setPosterModalOpen(false);
                        setPosterError(false);
                        setPosterLoading(false);
                        // Navigate to edit page
                        navigate(`/admin/events/${eventId}/edit`);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                      Go to Edit Event
                    </button>
                  </div>
                )}

                {/* Poster Image with Zoom */}
                {!posterError && (
                  <img
                    src={event?.event_poster_url}
                    alt={`${event?.event_name} poster`}
                    className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl transition-transform duration-200"
                    style={{ 
                      display: posterLoading ? 'none' : 'block',
                      transform: `scale(${posterZoom})`,
                      cursor: posterZoom > 1 ? 'move' : 'default'
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onLoad={() => setPosterLoading(false)}
                    onError={(e) => {
                      setPosterLoading(false);
                      setPosterError(true);
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Certificate Template Modal */}
          {certificateModalOpen && (
            <div className="fixed inset-0 backdrop-blur-sm bg-black/50 z-[99999] animate-in fade-in duration-200">
              {/* Floating Close Button */}
              <button
                onClick={() => {
                  // Clean up blob URL if it exists
                  if (currentCertificateTemplate?.url?.startsWith('blob:')) {
                    URL.revokeObjectURL(currentCertificateTemplate.url);
                  }
                  setCertificateModalOpen(false);
                  setCurrentCertificateTemplate(null);
                  setCertificateLoading(false);
                  setCertificateError(false);
                }}
                className="fixed top-4 right-4 z-[100000] bg-black/80 hover:bg-black text-white rounded-full p-2 transition-colors shadow-lg"
                title="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Loading Spinner */}
              {certificateLoading && !certificateError && (
                <div className="absolute inset-0 flex items-center justify-center z-[99998]">
                  <div className="text-center">
                    <svg className="w-16 h-16 animate-spin text-white mx-auto" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-white mt-4 text-lg font-medium">Loading certificate template...</p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {certificateError && (
                <div className="absolute inset-0 flex items-center justify-center z-[99998] p-4">
                  <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-2xl max-w-md mx-auto">
                    <svg className="w-16 h-16 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Certificate Template Not Found</h3>
                    <p className="text-gray-600 text-center mb-6">
                      The certificate template could not be found or has been removed. Please reupload the template.
                    </p>
                    <button
                      onClick={() => {
                        setCertificateModalOpen(false);
                        setCertificateError(false);
                        setCertificateLoading(false);
                        setCurrentCertificateTemplate(null);
                        // Navigate to edit page
                        navigate(`/admin/events/${eventId}/edit`);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                      Go to Edit Event
                    </button>
                  </div>
                </div>
              )}

              {/* Floating Actions */}
              {currentCertificateTemplate && (
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
              )}

              {/* Full Screen Template Content */}
              {currentCertificateTemplate && (
                <iframe
                  src={currentCertificateTemplate.url}
                  title={`${currentCertificateTemplate.type} Certificate Template`}
                  className="w-full h-full border-0 bg-white"
                  style={{ display: certificateLoading ? 'none' : 'block' }}
                  onLoad={() => setCertificateLoading(false)}
                  onError={() => {
                    setCertificateLoading(false);
                  }}
                />
              )}
            </div>
          )}

          {/* Event Report Modal */}
          <EventReportModal
            isOpen={eventReportModalOpen}
            onClose={() => setEventReportModalOpen(false)}
            eventId={eventId}
            eventName={event?.event_name || 'Event'}
            eventData={event}
            eventStats={eventStats}
            attendanceStats={attendanceStats}
            registrations={allRegistrations}
            onGenerate={handleEventReportGeneration}
          />

          {/* Custom Export Modal */}
          <CustomExportModal
            isOpen={customExportModalOpen}
            onClose={() => setCustomExportModalOpen(false)}
            eventData={event}
            eventStats={eventStats}
            onExport={handleCustomExport}
          />
        </div>
      </div>
    </AdminLayout>
  );
}

export default EventDetail;

