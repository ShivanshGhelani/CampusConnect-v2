import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { adminAPI } from '../../api/admin';
import AdminLayout from '../../components/admin/AdminLayout';
import DateRangePicker from '../../components/common/DateRangePicker';
import LoadingSpinner from '../../components/LoadingSpinner';
import Dropdown from '../../components/ui/Dropdown';
import MultiSelect from '../../components/ui/MultiSelect';
import RichTextEditor from '../../components/RichTextEditor';
import dropdownOptionsService from '../../services/dropdownOptionsService';
import AttendancePreview from '../../components/AttendancePreview';
import { formatDateToLocal } from '../../utils/dateHelpers';
import { Clock } from 'lucide-react';
import unifiedStorage from '../../services/unifiedStorage';
import { updateEventInScheduler } from '../../utils/eventSchedulerUtils';

// Helper function to convert backend strategy types to user-friendly labels
const getStrategyDisplayName = (strategyType) => {
  const strategyMap = {
    'day_based': 'Day Based',
    'session_based': 'Session Based',
    'milestone_based': 'Milestone Based',
    'time_based': 'Time Based',
    'percentage_based': 'Percentage Based',
    'single_mark': 'Single Check-in',
    'multi_session': 'Multi-Session',
    'custom': 'Custom',
    'hybrid': 'Hybrid'
  };

  if (!strategyType) return 'Standard';

  // Handle string format (direct strategy type)
  if (typeof strategyType === 'string') {
    return strategyMap[strategyType] || strategyType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  // Handle object format with strategy property
  if (typeof strategyType === 'object' && strategyType.strategy) {
    return strategyMap[strategyType.strategy] || strategyType.strategy.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  return 'Standard';
};


// Optimized date formatting function
const formatDateTime = (dateTimeString) => {
  if (!dateTimeString) return 'N/A';

  try {
    const date = new Date(dateTimeString);
    // Check if date is valid
    if (isNaN(date.getTime())) return 'Invalid Date';

    // Use optimized formatting with better performance
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  } catch (error) {
    return 'Invalid Date';
  }
};

// Helper to combine date and time for formatting
const formatCombinedDateTime = (date, time) => {
  if (!date || !time) return 'Not set';
  try {
    return formatDateTime(`${date}T${time}:00`);
  } catch (error) {
    return 'Invalid Date';
  }
};

// Certificate template types based on event type
const getCertificateTypes = (eventType, eventMode = null) => {
  const certificateMapping = {
    technical: [
      'Certificate of Participation',
      'Certificate of Achievement'
    ],
    cultural: [
      'Certificate of Participation',
      ...(eventMode === 'hybrid' || eventMode === 'online' ? ['Winner Certificate'] : [])
    ],
    sports: [
      'Certificate of Participation'
    ],
    academic: [
      'Certificate of Completion',
      'Certificate of Excellence'
    ],
    workshop: [
      'Certificate of Completion',
      'Certificate of Excellence'
    ],
    seminar: [
      'Certificate of Attendance'
    ],
    conference: [
      'Certificate of Attendance'
    ],
    competition: [
      'Certificate of Participation',
      ...(eventMode === 'hybrid' || eventMode === 'online' ? ['Winner Certificate'] : [])
    ]
  };

  return certificateMapping[eventType] || ['Certificate of Participation'];
};

// Dropdown options
const eventTypeOptions = [
  { value: 'technical', label: 'Technical' },
  { value: 'cultural', label: 'Cultural' },
  { value: 'sports', label: 'Sports' },
  { value: 'academic', label: 'Academic' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'seminar', label: 'Seminar' },
  { value: 'conference', label: 'Conference' },
  { value: 'competition', label: 'Competition' }
];

const targetAudienceOptions = [
  { value: 'students', label: 'Students' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'both', label: 'Both Students & Faculty' },
  { value: 'external', label: 'External Participants' }
];

const modeOptions = [
  { value: 'offline', label: 'Offline' },
  { value: 'online', label: 'Online' },
  { value: 'hybrid', label: 'Hybrid' }
];

const registrationTypeOptions = [
  { value: 'free', label: 'Free' },
  { value: 'paid', label: 'Paid' }
];

const registrationModeOptions = [
  { value: 'individual', label: 'Individual' },
  { value: 'team', label: 'Team' }
];

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
    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${variants[variant]}`}>
      {children}
    </span>
  );
};

function EditEvent() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userType } = useAuth();
  const { toast } = useToast();
  const [event, setEvent] = useState(location.state?.eventData || null);
  const [isLoading, setIsLoading] = useState(!location.state?.eventData);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  // Venue management states
  const [venues, setVenues] = useState([]);
  const [filteredVenues, setFilteredVenues] = useState([]);
  const [showVenueDropdown, setShowVenueDropdown] = useState(false);
  const venueDropdownRef = useRef(null);

  // Organizer management states
  const [activeOrganizerDropdown, setActiveOrganizerDropdown] = useState(null);
  const [existingOrganizers, setExistingOrganizers] = useState([]);
  const [filteredOrganizers, setFilteredOrganizers] = useState([]);
  const [organizerNotification, setOrganizerNotification] = useState(null);

  // Tab management
  const [activeTab, setActiveTab] = useState(1);

  // Form data state
  const [formData, setFormData] = useState({
    event_name: '',
    event_type: '',
    target_audience: '',
    is_xenesis_event: false,
    organizing_department: '',
    short_description: '',
    detailed_description: '',
    // Student target fields
    student_department: [],
    student_semester: [],
    custom_text: '',
    organizers: [{
      id: null,
      name: '',
      email: '',
      employee_id: '',
      searchQuery: '',
      selected: false,
      isNew: false
    }],
    contacts: [{ name: '', contact: '' }],
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    registration_start_date: '',
    registration_start_time: '',
    registration_end_date: '',
    registration_end_time: '',
    certificate_end_date: '',
    certificate_end_time: '',
    venue: '',
    venue_id: '',
    mode: 'offline',
    registration_type: 'free',
    registration_mode: 'individual',
    registration_fee: '',
    fee_description: '',
    team_size_min: '',
    team_size_max: '',
    allow_multiple_team_registrations: false,
    min_participants: 1,
    max_participants: '',
    attendance_mandatory: true,
    attendance_strategy: null,
    is_certificate_based: false,
    certificate_templates: {},
    event_poster: null,
    assets: []
  });

  // Attendance strategy state for dynamic regeneration
  const [attendanceStrategy, setAttendanceStrategy] = useState(null);

  // Helper function to extract filename from URL
  const getFileNameFromUrl = (url) => {
    if (!url) return 'Unknown File';
    try {
      // Extract filename from URL (after last slash)
      const filename = url.split('/').pop();
      // Remove query parameters if any
      return filename.split('?')[0] || 'Unknown File';
    } catch (error) {
      return 'Unknown File';
    }
  };

  // Helper function to open HTML template in new window with proper rendering
  const openHtmlTemplate = async (templateUrl, templateType) => {
    try {
      // Fetch the HTML content
      const response = await fetch(templateUrl);
      if (!response.ok) {
        throw new Error('Failed to load template');
      }
      const htmlContent = await response.text();

      // Determine certificate type styling
      const getCertificateTypeColor = (type) => {
        const lowerType = type.toLowerCase();
        if (lowerType.includes('completion')) return { bg: '#10B981', light: '#D1FAE5', accent: '#047857' };
        if (lowerType.includes('excellence') || lowerType.includes('achievement')) return { bg: '#8B5CF6', light: '#EDE9FE', accent: '#6D28D9' };
        if (lowerType.includes('participation')) return { bg: '#3B82F6', light: '#DBEAFE', accent: '#1D4ED8' };
        if (lowerType.includes('winner')) return { bg: '#F59E0B', light: '#FEF3C7', accent: '#D97706' };
        if (lowerType.includes('attendance')) return { bg: '#6B7280', light: '#F3F4F6', accent: '#374151' };
        return { bg: '#4F46E5', light: '#E0E7FF', accent: '#3730A3' }; // Default
      };

      const colors = getCertificateTypeColor(templateType);
      const eventName = formData.event_name || 'Sample Event Name';
      const eventType = formData.event_type || 'workshop';

      // Create enhanced window with better styling and information
      const newWindow = window.open('', '_blank', 'width=1000,height=700,scrollbars=yes,resizable=yes');

      if (newWindow) {
        // Write the HTML content to the new window
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${templateType} - Certificate Template Preview | ${eventName}</title>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                * {
                  box-sizing: border-box;
                }
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                  margin: 0;
                  padding: 20px;
                  line-height: 1.6;
                  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                  min-height: 100vh;
                }
                .template-container {
                  max-width: 1200px;
                  margin: 0 auto;
                  background: white;
                  border-radius: 12px;
                  box-shadow: 0 10px 30px rgba(0,0,0,0.15);
                  overflow: hidden;
                }
                .template-header {
                  background: linear-gradient(135deg, ${colors.bg} 0%, ${colors.accent} 100%);
                  color: white;
                  padding: 25px;
                  text-align: center;
                  position: relative;
                  overflow: hidden;
                }
                .template-header::before {
                  content: '';
                  position: absolute;
                  top: -50%;
                  left: -50%;
                  width: 200%;
                  height: 200%;
                  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                  animation: pulse 4s ease-in-out infinite;
                }
                @keyframes pulse {
                  0%, 100% { opacity: 0.3; transform: scale(1); }
                  50% { opacity: 0.1; transform: scale(1.1); }
                }
                .template-header h1 {
                  margin: 0 0 10px 0;
                  font-size: 2rem;
                  font-weight: 700;
                  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
                  position: relative;
                  z-index: 1;
                }
                .template-header p {
                  margin: 0;
                  font-size: 1.1rem;
                  opacity: 0.9;
                  position: relative;
                  z-index: 1;
                }
                .template-info {
                  background: ${colors.light};
                  border-left: 4px solid ${colors.bg};
                  padding: 20px;
                  margin: 0;
                }
                .template-info h3 {
                  margin: 0 0 15px 0;
                  color: ${colors.accent};
                  font-size: 1.1rem;
                  display: flex;
                  align-items: center;
                  gap: 8px;
                }
                .info-grid {
                  display: grid;
                  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                  gap: 15px;
                  margin-bottom: 15px;
                }
                .info-item {
                  display: flex;
                  flex-direction: column;
                  gap: 4px;
                }
                .info-label {
                  font-size: 0.85rem;
                  font-weight: 600;
                  color: ${colors.accent};
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                }
                .info-value {
                  font-size: 0.95rem;
                  color: #374151;
                  font-weight: 500;
                }
                .placeholder-note {
                  background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
                  border: 2px solid #F59E0B;
                  padding: 20px;
                  margin: 20px;
                  border-radius: 10px;
                  font-size: 14px;
                  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.15);
                }
                .placeholder-note strong {
                  color: #92400E;
                  font-size: 1.1rem;
                }
                .template-content {
                  padding: 30px;
                  min-height: 500px;
                  position: relative;
                }
                .template-content::before {
                  content: '';
                  position: absolute;
                  top: 0;
                  left: 0;
                  right: 0;
                  bottom: 0;
                  background: url('data:image/svg+xml,<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><g fill="%23f3f4f6" fill-opacity="0.4"><circle cx="3" cy="3" r="1"/></g></svg>') repeat;
                  pointer-events: none;
                  z-index: 0;
                }
                .certificate-frame {
                  position: relative;
                  z-index: 1;
                  background: white;
                  border-radius: 8px;
                  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                  padding: 20px;
                }
                .print-button {
                  position: fixed;
                  top: 20px;
                  right: 20px;
                  background: ${colors.bg};
                  color: white;
                  border: none;
                  padding: 12px 20px;
                  border-radius: 8px;
                  font-weight: 600;
                  cursor: pointer;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                  z-index: 1000;
                  transition: all 0.3s ease;
                }
                .print-button:hover {
                  transform: translateY(-2px);
                  box-shadow: 0 6px 16px rgba(0,0,0,0.2);
                }
                @media print {
                  body { background: white !important; padding: 0 !important; }
                  .template-header, .template-info, .placeholder-note, .print-button { display: none !important; }
                  .template-container { box-shadow: none !important; border-radius: 0 !important; }
                  .template-content { padding: 0 !important; }
                }
                @media (max-width: 768px) {
                  .template-header h1 { font-size: 1.5rem; }
                  .info-grid { grid-template-columns: 1fr; }
                  body { padding: 10px; }
                }
              </style>
            </head>
            <body>
              <div class="template-container">
                <div class="template-header">
                  <h1>📜 ${templateType}</h1>
                  <p>Certificate Template Preview</p>
                </div>
                
                <div class="template-info">
                  <h3>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Template Information
                  </h3>
                  <div class="info-grid">
                    <div class="info-item">
                      <div class="info-label">Event Name</div>
                      <div class="info-value">${eventName}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Event Type</div>
                      <div class="info-value">${eventType.charAt(0).toUpperCase() + eventType.slice(1)}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Certificate Type</div>
                      <div class="info-value">${templateType}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Template Status</div>
                      <div class="info-value">✅ Active & Ready</div>
                    </div>
                  </div>
                  <div style="font-size: 0.85rem; color: #6B7280; margin-top: 10px;">
                    💡 This preview shows how your certificate will appear when generated for participants.
                  </div>
                </div>

                <div class="placeholder-note">
                  <strong>📝 Important Preview Notes:</strong><br/>
                  • This is a preview of your certificate template with placeholder data<br/>
                  • Dynamic fields like [Participant Name], [Event Name], [Date] will be replaced with actual data during certificate generation<br/>
                  • The final certificate may include additional elements like QR codes, verification links, or digital signatures<br/>
                  • Use the print button (top-right) to see how the certificate will look when printed
                </div>

                <div class="template-content">
                  <div class="certificate-frame">
                    ${htmlContent}
                  </div>
                </div>
              </div>

              <button class="print-button" onclick="window.print()">
                🖨️ Print Preview
              </button>

              <script>
                // Focus management for accessibility
                document.addEventListener('DOMContentLoaded', function() {
                  document.title = '${templateType} - ${eventName} Certificate Preview';
                });
              </script>
            </body>
          </html>
        `);
        newWindow.document.close();
        
        // Set focus to the new window
        newWindow.focus();
      } else {
        // Show user-friendly message if popup is blocked
        toast.warning("Please allow popups for this site to preview certificates, or try opening the template directly.");
        
        // Fallback to direct URL opening
        window.open(templateUrl, '_blank');
      }
    } catch (error) {
      toast.error("Failed to load certificate template. Opening direct link instead.");
      
      // Fallback to direct URL opening
      window.open(templateUrl, '_blank');
    }
  };

  // Load venues and organizers on component mount
  useEffect(() => {
    loadVenues();
    loadExistingOrganizers();

    // If we have event data from navigation state, use it
    if (location.state?.eventData && !event) {
      setEvent(location.state.eventData);
      populateFormData(location.state.eventData);
      setIsLoading(false);
    } else if (eventId && !event) {
      // Fallback: fetch event data if not passed
      fetchEvent();
    } else if (event) {
      // Event data already available, populate form
      populateFormData(event);
      setIsLoading(false);
    }
  }, [eventId, location.state?.eventData]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (venueDropdownRef.current && !venueDropdownRef.current.contains(event.target)) {
        setShowVenueDropdown(false);
      }
      if (activeOrganizerDropdown !== null) {
        setActiveOrganizerDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeOrganizerDropdown, showVenueDropdown]);

  // Load venues
  const loadVenues = async () => {
    try {
      
      const response = await adminAPI.getVenues(); // Single endpoint - defaults to active venues only

      if (response.data || response.success) {
        // Handle both cached and API responses
        const apiData = response.success ? response.data : (response.data.data || response.data);
        const venueArray = Array.isArray(apiData) ? apiData : [];
        setVenues(venueArray);
        // Initialize filteredVenues with all active venues
        const activeVenues = venueArray.filter(v => v.is_active);
        setFilteredVenues(activeVenues);
        
      }
    } catch (error) {
      // Handle error silently
    }
  };

  // Load existing organizers (faculty)
  const loadExistingOrganizers = async () => {
    try {
      const response = await adminAPI.getFaculty();
      if (response.success) {
        setExistingOrganizers(response.faculty || []);
      }
    } catch (error) {
      // Handle error silently
    }
  };

  // Venue search and selection
  const handleVenueSearch = (searchTerm) => {
    const filtered = venues.filter(venue =>
      venue.is_active &&
      (venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venue.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${venue.name} - ${venue.location}`.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredVenues(filtered);
  };

  const selectVenue = (venue) => {
    setFormData(prev => ({
      ...prev,
      venue: `${venue.name} - ${venue.location}`,
      venue_id: venue.venue_id
    }));
    setShowVenueDropdown(false);
  };

  // Organizer management functions
  const addOrganizer = () => {
    setFormData(prev => ({
      ...prev,
      organizers: [...prev.organizers, {
        id: null,
        name: '',
        email: '',
        employee_id: '',
        searchQuery: '',
        selected: false,
        isNew: false
      }]
    }));
  };

  const removeOrganizer = (idx) => {
    setFormData(prev => ({
      ...prev,
      organizers: prev.organizers.filter((_, i) => i !== idx)
    }));
    setActiveOrganizerDropdown(null);
  };

  const handleOrganizerSearch = (idx, searchQuery) => {
    setFormData(prev => {
      const updated = [...prev.organizers];
      updated[idx] = { ...updated[idx], searchQuery, selected: false };
      return { ...prev, organizers: updated };
    });

    if (searchQuery.length > 0) {
      const filtered = existingOrganizers.filter(faculty =>
        faculty.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faculty.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faculty.employee_id.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredOrganizers(filtered);
      setActiveOrganizerDropdown(idx);
    } else {
      setFilteredOrganizers([]);
      setActiveOrganizerDropdown(null);
    }
  };

  const selectExistingOrganizer = (idx, faculty) => {
    // Check if this organizer is already selected
    const isAlreadySelected = formData.organizers.some((org, i) =>
      i !== idx && org.selected && org.id === faculty.faculty_id
    );

    if (isAlreadySelected) {
      setOrganizerNotification({
        message: `${faculty.name} is already selected as an organizer.`,
        type: 'warning'
      });
      setTimeout(() => setOrganizerNotification(null), 3000);
      return;
    }

    setFormData(prev => {
      const updated = [...prev.organizers];
      updated[idx] = {
        ...updated[idx],
        id: faculty.faculty_id,
        name: faculty.name,
        email: faculty.email,
        employee_id: faculty.employee_id,
        searchQuery: faculty.name,
        selected: true,
        isNew: false
      };
      return { ...prev, organizers: updated };
    });

    setActiveOrganizerDropdown(null);
    setFilteredOrganizers([]);
  };

  const clearOrganizerSelection = (idx) => {
    setFormData(prev => {
      const updated = [...prev.organizers];
      updated[idx] = {
        ...updated[idx],
        id: null,
        name: '',
        email: '',
        employee_id: '',
        searchQuery: '',
        selected: false,
        isNew: false
      };
      return { ...prev, organizers: updated };
    });
  };

  // Contact management
  const handleContactChange = (idx, field, value) => {
    setFormData(prev => {
      const updated = [...prev.contacts];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, contacts: updated };
    });
  };

  const addContact = () => {
    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, { name: '', contact: '' }]
    }));
  };

  const removeContact = (idx) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== idx)
    }));
  };

  // Date and time handlers - these are now handled inline in DateRangePicker components

  // Extract form data population into a separate function
  const populateFormData = (eventData) => {

    // Parse datetime strings to separate date and time - TIMEZONE SAFE
    const parseDateTimeToComponents = (dateTimeString) => {
      if (!dateTimeString) return { date: '', time: '' };

      // Handle different date formats safely without timezone conversion
      let dateStr = '';
      let timeStr = '';

      if (dateTimeString.includes('T')) {
        // ISO format: "2025-09-01T10:00:00" or "2025-09-01T10:00:00.000Z"
        const [datePart, timePart] = dateTimeString.split('T');
        dateStr = datePart;
        timeStr = timePart.split('.')[0].substring(0, 5); // Get HH:MM only
      } else if (dateTimeString.includes(' ')) {
        // Format: "2025-09-01 10:00:00"
        const [datePart, timePart] = dateTimeString.split(' ');
        dateStr = datePart;
        timeStr = timePart.substring(0, 5); // Get HH:MM only
      } else {
        // Date only: "2025-09-01"
        dateStr = dateTimeString;
        timeStr = '';
      }

      return { date: dateStr, time: timeStr };
    };

    // Enhanced organizer parsing - handle both array and string formats
    const parseOrganizers = (organizersData) => {
      if (!organizersData) {
        return [{
          id: null, name: '', email: '', employee_id: '',
          searchQuery: '', selected: false, isNew: false
        }];
      }

      // Handle array format (from EventDetail.jsx - this is the main case)
      if (Array.isArray(organizersData)) {
        const parsedOrganizers = organizersData.map((org, index) => {
          // Handle nested organizer object structure OR direct organizer data
          const organizerData = org.organizer || org;

          const parsedOrg = {
            id: organizerData.faculty_id || organizerData.id || null,
            name: organizerData.full_name || organizerData.name || '',
            email: organizerData.email || '',
            employee_id: organizerData.employee_id || '',
            department: organizerData.department || '',
            designation: organizerData.designation || '',
            phone: organizerData.phone || '',
            searchQuery: organizerData.full_name || organizerData.name || '',
            selected: !!(organizerData.full_name || organizerData.name),
            isNew: false
          };

          return parsedOrg;
        });

        return parsedOrganizers.length > 0 ? parsedOrganizers : [{
          id: null, name: '', email: '', employee_id: '',
          searchQuery: '', selected: false, isNew: false
        }];
      }

      // Handle string format (legacy support)
      if (typeof organizersData === 'string' && organizersData.trim()) {
        return organizersData.split('\n').filter(org => org.trim()).map(org => ({
          id: null,
          name: org.trim(),
          email: '',
          employee_id: '',
          department: '',
          designation: '',
          searchQuery: org.trim(),
          selected: true,
          isNew: true
        }));
      }

      return [{
        id: null, name: '', email: '', employee_id: '',
        searchQuery: '', selected: false, isNew: false
      }];
    };

    // Parse contacts - enhanced to handle different formats
    const parseContacts = (contactsData) => {
      if (!contactsData) return [{ name: '', contact: '' }];

      if (Array.isArray(contactsData)) {
        const parsed = contactsData.filter(c => c && (c.name || c.contact)).map(contact => ({
          name: contact.name || '',
          contact: contact.contact || contact.phone || contact.email || ''
        }));

        return parsed.length > 0 ? parsed : [{ name: '', contact: '' }];
      }

      if (typeof contactsData === 'string' && contactsData.trim()) {
        const contacts = [];
        const lines = contactsData.split('\n').filter(line => line.trim());

        for (const line of lines) {
          const colonIndex = line.indexOf(':');
          if (colonIndex > 0) {
            contacts.push({
              name: line.substring(0, colonIndex).trim(),
              contact: line.substring(colonIndex + 1).trim()
            });
          }
        }

        return contacts.length > 0 ? contacts : [{ name: '', contact: '' }];
      }

      return [{ name: '', contact: '' }];
    };

    // Parse date/time components
    const startDateTime = parseDateTimeToComponents(eventData.start_datetime);
    const endDateTime = parseDateTimeToComponents(eventData.end_datetime);
    const regStartDateTime = parseDateTimeToComponents(eventData.registration_start_date);
    const regEndDateTime = parseDateTimeToComponents(eventData.registration_end_date);
    const certEndDateTime = parseDateTimeToComponents(eventData.certificate_end_date);

    const newFormData = {
      event_name: eventData.event_name || '',
      event_type: eventData.event_type || '',
      target_audience: eventData.target_audience || '',
      is_xenesis_event: eventData.is_xenesis_event || false,
      organizing_department: eventData.organizing_department || '',
      short_description: eventData.short_description || '',
      detailed_description: eventData.detailed_description || '',
      student_department: eventData.student_department || [],
      student_semester: eventData.student_semester || [],
      custom_text: eventData.custom_text || '',
      organizers: parseOrganizers(eventData.organizer_details || eventData.faculty_organizers || eventData.organizers),
      contacts: parseContacts(eventData.contacts),
      start_date: startDateTime.date,
      start_time: startDateTime.time,
      end_date: endDateTime.date,
      end_time: endDateTime.time,
      registration_start_date: regStartDateTime.date,
      registration_start_time: regStartDateTime.time,
      registration_end_date: regEndDateTime.date,
      registration_end_time: regEndDateTime.time,
      certificate_end_date: certEndDateTime.date,
      certificate_end_time: certEndDateTime.time,
      venue: eventData.venue || '',
      venue_id: eventData.venue_id || '',
      mode: eventData.mode || 'offline',
      registration_type: eventData.registration_type || 'free',
      registration_mode: eventData.registration_mode || 'individual',
      registration_fee: eventData.registration_fee || '',
      fee_description: eventData.fee_description || '',
      team_size_min: eventData.team_size_min || '',
      team_size_max: eventData.team_size_max || '',
      allow_multiple_team_registrations: eventData.allow_multiple_team_registrations || false,
      min_participants: eventData.min_participants || 1,
      max_participants: eventData.max_participants || '',
      attendance_mandatory: eventData.attendance_mandatory !== false,
      attendance_strategy: eventData.attendance_strategy || null,
      is_certificate_based: eventData.is_certificate_based || false,
      certificate_templates: eventData.certificate_templates || {},
      event_poster: null,
      assets: eventData.assets || []
    };

    setFormData(newFormData);

    // Initialize attendance strategy state for dynamic regeneration
    setAttendanceStrategy(eventData.attendance_strategy || null);

    setError('');
  };

  const fetchEvent = async () => {
    try {
      setIsLoading(true);
      const response = await adminAPI.getEvent(eventId);

      if (response.data.success) {
        const eventData = response.data.event;
        setEvent(eventData);
        populateFormData(eventData);
      } else {
        throw new Error(response.data.message || 'Failed to fetch event');
      }
    } catch (error) {
      setError('Failed to load event details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle dropdown changes
  const handleDropdownChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle checkbox changes with explicit state updates
  const handleCheckboxChange = (name, checked) => {
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  // Special handler for multi-select student fields
  const handleStudentFieldChange = (fieldName, selectedValues) => {
    // Handle "All" selection logic
    if (fieldName === 'student_department') {
      const allDepartments = dropdownOptionsService.getOptions('student', 'departments').map(opt => opt.value);

      if (selectedValues.includes('all')) {
        // If "All" is selected, select all departments except "all"
        const newValues = selectedValues.includes('all') && selectedValues.length === 1
          ? allDepartments
          : selectedValues.filter(val => val !== 'all');
        setFormData(prev => ({ ...prev, [fieldName]: newValues }));
      } else {
        setFormData(prev => ({ ...prev, [fieldName]: selectedValues }));
      }
    } else if (fieldName === 'student_semester') {
      const allSemesters = ['1', '2', '3', '4', '5', '6', '7', '8'];

      if (selectedValues.includes('all')) {
        // If "All" is selected, select all semesters except "all"
        const newValues = selectedValues.includes('all') && selectedValues.length === 1
          ? allSemesters
          : selectedValues.filter(val => val !== 'all');
        setFormData(prev => ({ ...prev, [fieldName]: newValues }));
      } else {
        setFormData(prev => ({ ...prev, [fieldName]: selectedValues }));
      }
    } else {
      setFormData(prev => ({ ...prev, [fieldName]: selectedValues }));
    }
  };

  // Process organizers list from textarea
  const processOrganizers = (organizersText) => {
    if (!organizersText || organizersText.trim() === '') return [];
    return organizersText.split('\n').map(name => name.trim()).filter(name => name.length > 0);
  };

  // Process contacts list from textarea
  const processContacts = (contactsText) => {
    if (!contactsText || contactsText.trim() === '') return [];
    const contacts = [];
    const lines = contactsText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const name = line.substring(0, colonIndex).trim();
        const contact = line.substring(colonIndex + 1).trim();
        if (name && contact) {
          contacts.push({ name, contact });
        }
      }
    }
    return contacts;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setIsSaving(true);
      setUploadStatus('');

      // Check if there are any new files to upload
      const hasNewCertificateTemplates = formData.certificate_templates && 
        Object.values(formData.certificate_templates).some(template => template instanceof File);
      const hasNewEventPoster = formData.event_poster && formData.event_poster instanceof File;

      // Delete existing files before uploading new ones (for replacement)
      if (hasNewCertificateTemplates || hasNewEventPoster) {
        setUploadStatus('Removing old files...');
        try {
          // Build list of file types to delete
          const fileTypesToDelete = [];
          
          if (hasNewEventPoster) {
            fileTypesToDelete.push('event_poster');
          }
          
          if (hasNewCertificateTemplates) {
            // Add the specific certificate template types being replaced
            Object.keys(formData.certificate_templates).forEach(templateType => {
              if (formData.certificate_templates[templateType] instanceof File) {
                fileTypesToDelete.push(templateType);
              }
            });
          }
          
          if (fileTypesToDelete.length > 0) {
            const deleteResult = await unifiedStorage.deleteSpecificEventFiles(event?.event_id || eventId, fileTypesToDelete);
            
            if (!deleteResult.success) {
              toast.warning('Old files could not be removed, but new files will be uploaded');
            } else {
              if (deleteResult.deletedCount > 0) {
                toast.info(`Removed ${deleteResult.deletedCount} old files (${deleteResult.fileTypesDeleted?.join(', ') || 'various types'})`);
              }
            }
            
            // Add a small delay to ensure deletion completes before upload
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
        } catch (error) {
          toast.warning('Could not remove old files, but proceeding with upload');
        }
      }

      // Upload new certificate templates if any
      let certificateTemplateUrls = {};
      if (hasNewCertificateTemplates) {
        setUploadStatus('Uploading certificate templates...');

        try {
          // Filter out only the File objects for upload
          const templatesForUpload = {};
          Object.entries(formData.certificate_templates).forEach(([type, template]) => {
            if (template instanceof File) {
              templatesForUpload[type] = template;
            }
          });

          const uploadResults = await unifiedStorage.uploadCertificateTemplates(
            templatesForUpload,
            event?.event_id || eventId
          );

          // Process upload results
          for (const [certificateType, result] of Object.entries(uploadResults)) {
            if (result.success) {
              certificateTemplateUrls[certificateType] = result.url;
            } else {
              
              toast.error(`Failed to upload ${certificateType}: ${result.error}`);
              setIsSaving(false);
              setUploadStatus('');
              return;
            }
          }
        } catch (error) {
          toast.error('Failed to upload certificate templates. Please try again.');
          setIsSaving(false);
          setUploadStatus('');
          return;
        }
      }

      // Upload new event poster if any
      let eventPosterUrl = null;
      if (hasNewEventPoster) {
        setUploadStatus('Uploading event poster...');

        try {
          const posterResult = await unifiedStorage.uploadEventPoster(
            formData.event_poster,
            event?.event_id || eventId
          );

          if (posterResult.success) {
            eventPosterUrl = posterResult.url;
          } else {
            toast.error(`Failed to upload event poster: ${posterResult.error}`);
            setIsSaving(false);
            setUploadStatus('');
            return;
          }
        } catch (error) {
          toast.error('Failed to upload event poster. Please try again.');
          setIsSaving(false);
          setUploadStatus('');
          return;
        }
      }

      setUploadStatus('Updating event...');

      // Combine date and time for datetime fields - FORCE LOCAL TIMEZONE
      const combineDateAndTime = (date, time) => {
        if (!date) return null;

        // If no time specified, use start of day (00:00:00)
        if (!time) {
          return `${date}T00:00:00.000+05:30`; // Explicit IST timezone
        }

        // Combine date and time WITH IST timezone to prevent UTC conversion
        return `${date}T${time}:00.000+05:30`; // Explicit IST timezone
      };

      // Check if event dates have changed - compare properly by converting both to date strings
      const hasDateChanged = event && (() => {
        try {
          const newStartDate = combineDateAndTime(formData.start_date, formData.start_time);
          const newEndDate = combineDateAndTime(formData.end_date, formData.end_time);
          
          // Extract date portions for comparison (YYYY-MM-DD HH:mm)
          const getDateComparison = (dateStr) => {
            if (!dateStr) return null;
            const date = new Date(dateStr);
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
          };
          
          const newStart = getDateComparison(newStartDate);
          const newEnd = getDateComparison(newEndDate);
          const oldStart = getDateComparison(event.start_datetime);
          const oldEnd = getDateComparison(event.end_datetime);
          
          const changed = newStart !== oldStart || newEnd !== oldEnd;
          
          if (changed) {
            console.log('🔄 Date change detected:', {
              oldStart, newStart,
              oldEnd, newEnd
            });
          }
          
          return changed;
        } catch (error) {
          console.error('Error comparing dates:', error);
          return false;
        }
      })();

      // If dates changed and we have an attendance strategy, regenerate it with new dates
      let finalAttendanceStrategy = attendanceStrategy || formData.attendance_strategy;
      if (hasDateChanged && finalAttendanceStrategy) {
        console.log('⚠️ Date changed - regenerating attendance strategy with new dates');
        console.log('📋 Current attendance strategy:', finalAttendanceStrategy);
        
        try {
          // Call the attendance strategy validation API to get new strategy with updated dates
          setUploadStatus('Regenerating attendance strategy with new dates...');
          
          // Send the strategy object with required fields for validation
          // Backend will generate NEW sessions anyway, but validation requires valid structure
          const updatedStrategy = {
            type: finalAttendanceStrategy.strategy,  // 'strategy' -> 'type'
            criteria: finalAttendanceStrategy.criteria,
            sessions: finalAttendanceStrategy.sessions?.map((session) => ({
              name: session.name || session.session_name || `Session ${session.day || ''}`,
              start_time: session.start_time || new Date().toISOString(),  // Keep old time for validation
              description: session.description || '',
              day: session.day
            }))
          };
          
          console.log('📦 Updated strategy being sent:', updatedStrategy);
          
          const strategyPayload = {
            event_name: formData.event_name,
            event_type: formData.event_type,
            start_datetime: combineDateAndTime(formData.start_date, formData.start_time),
            end_datetime: combineDateAndTime(formData.end_date, formData.end_time),
            registration_mode: formData.registration_mode,
            min_participants: formData.min_participants ? parseInt(formData.min_participants) : 1,
            max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
            custom_strategy: updatedStrategy
          };
          
          console.log('📤 Sending strategy validation payload:', strategyPayload);
          
          const strategyResponse = await adminAPI.validateCustomStrategy(strategyPayload);
          
          console.log('📥 Strategy validation response:', strategyResponse);
          
          if (strategyResponse.data?.success && strategyResponse.data?.custom_strategy) {
            // Backend returns custom_strategy with new sessions
            const responseData = strategyResponse.data.custom_strategy;
            const newStrategy = {
              strategy: responseData.type,
              criteria: responseData.criteria,
              sessions: responseData.sessions.map(session => ({
                session_id: session.session_id,
                session_name: session.session_name,
                session_type: session.session_type,
                start_time: session.start_time,
                end_time: session.end_time,
                duration_minutes: session.duration_minutes,
                is_mandatory: session.is_mandatory,
                weight: session.weight
              })),
              warnings: responseData.warnings || [],
              recommendations: strategyResponse.data.recommendations || [],
              minimum_percentage: responseData.criteria?.minimum_percentage || 75
            };
            
            finalAttendanceStrategy = newStrategy;
            console.log('✅ New attendance strategy generated:', finalAttendanceStrategy);
            toast.success('Attendance strategy updated with new event schedule');
          } else {
            console.warn('⚠️ Strategy validation returned no strategy, using existing');
            console.warn('Response data:', strategyResponse.data);
            toast.warning('Could not regenerate attendance strategy - using existing');
          }
        } catch (error) {
          console.error('❌ Error regenerating attendance strategy:', error);
          console.error('Error details:', error.response?.data);
          if (error.response?.data?.detail) {
            console.error('Validation errors:', JSON.stringify(error.response.data.detail, null, 2));
          }
          toast.warning('Could not regenerate attendance strategy - using existing');
        }
      }

      // Process organizers - extract selected ones
      const processOrganizers = (organizers) => {
        return organizers
          .filter(org => org.selected && org.name)
          .map(org => ({
            faculty_id: org.id,
            name: org.name,
            email: org.email,
            employee_id: org.employee_id
          }));
      };

      // Process contacts - filter out empty ones
      const processContacts = (contacts) => {
        const processed = contacts.filter(contact => contact.name && contact.contact);
        return processed;
      };

      // Merge existing certificate templates with new uploads
      let finalCertificateTemplates = {};
      if (event?.certificate_templates) {
        finalCertificateTemplates = { ...event.certificate_templates };
      }
      // Override with new uploaded templates
      if (Object.keys(certificateTemplateUrls).length > 0) {
        finalCertificateTemplates = { ...finalCertificateTemplates, ...certificateTemplateUrls };
      }

      // Prepare the data for submission
      const submitData = {
        event_name: formData.event_name,
        event_type: formData.event_type,
        target_audience: formData.target_audience,
        is_xenesis_event: formData.is_xenesis_event,
        organizing_department: formData.organizing_department,
        short_description: formData.short_description,
        detailed_description: formData.detailed_description || null,
        // Student target fields
        student_department: formData.student_department,
        student_semester: formData.student_semester,
        custom_text: formData.custom_text || null,
        start_datetime: combineDateAndTime(formData.start_date, formData.start_time),
        end_datetime: combineDateAndTime(formData.end_date, formData.end_time),
        registration_start_date: combineDateAndTime(formData.registration_start_date, formData.registration_start_time),
        registration_end_date: combineDateAndTime(formData.registration_end_date, formData.registration_end_time),
        certificate_end_date: combineDateAndTime(formData.certificate_end_date, formData.certificate_end_time),
        venue: formData.venue,
        venue_id: formData.venue_id,
        mode: formData.mode,
        registration_type: formData.registration_type,
        registration_mode: formData.registration_mode,
        registration_fee: formData.registration_fee ? parseFloat(formData.registration_fee) : null,
        fee_description: formData.fee_description || null,
        team_size_min: formData.team_size_min ? parseInt(formData.team_size_min) : null,
        team_size_max: formData.team_size_max ? parseInt(formData.team_size_max) : null,
        allow_multiple_team_registrations: formData.allow_multiple_team_registrations,
        min_participants: formData.min_participants ? parseInt(formData.min_participants) : 1,
        max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
        attendance_mandatory: formData.attendance_mandatory,
        attendance_strategy: finalAttendanceStrategy,
        is_certificate_based: formData.is_certificate_based,
        certificate_templates: finalCertificateTemplates,
        // Only include event_poster_url if we uploaded a new one
        ...(eventPosterUrl && { event_poster_url: eventPosterUrl }),
        organizers: processOrganizers(formData.organizers),
        event_contacts: processContacts(formData.contacts),
        contacts: processContacts(formData.contacts) // Try both field names
      };

      const response = await adminAPI.updateEvent(eventId, submitData);

      if (response.data.success) {
        // Update event in client-side scheduler
        try {
          updateEventInScheduler(eventId, response.data.event || formData);
          
        } catch (schedulerError) {
          
          // Don't fail the update process
        }

        // Update local state with the response data to reflect changes immediately
        if (response.data.event) {
          setEvent(response.data.event);
          populateFormData(response.data.event);
        }

        // Show success message
        toast.success('The event has been updated and all files have been uploaded successfully.');

        // Clear upload status
        setUploadStatus('');

        // Navigate back to event detail page
        navigate(`/admin/events/${event?.event_id || eventId}`);
      } else {
        throw new Error(response.data.message || 'Failed to update event');
      }
    } catch (error) {
      
      toast.error('Failed to update event: ' + error.message);
    } finally {
      setIsSaving(false);
      setUploadStatus('');
    }
  };

  if (isLoading) {
    return (
      <AdminLayout pageTitle="Edit Event">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </AdminLayout>
    );
  }

  if (error && !event) {
    return (
      <AdminLayout pageTitle="Edit Event">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      </AdminLayout>
    );
  }

  const tabs = [
    { id: 1, name: 'Basic Info', icon: 'fas fa-info-circle' },
    { id: 2, name: 'Organizer & Schedule', icon: 'fas fa-users-cog' },
    { id: 3, name: 'Certificates & Poster', icon: 'fas fa-certificate' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 1:
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Basic Event Information</h2>
              <p className="text-sm text-gray-600">View and edit essential event details</p>
            </div>

            <div className="space-y-6">
              {/* Event ID and Event Title in same row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Event ID <span className="text-red-500">*</span>
                    </label>
                  </div>
                  <div className="relative">
                    <div className="block w-full px-3 py-2 border rounded-md shadow-sm text-sm bg-gray-50 border-gray-200 text-gray-700">
                      {event?.event_id || formData.event_id || 'Not Available'}
                    </div>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    <span>Event ID is automatically generated and cannot be modified</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Title <span className="text-red-500">*</span>
                  </label>
                  <div className="block w-full px-3 py-2 border rounded-md shadow-sm text-sm bg-gray-50 border-gray-200 text-gray-700">
                    {formData.event_name || 'No title available'}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Event title cannot be modified after creation</p>
                </div>
              </div>

              {/* Event Type and Target Audience in same row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Type <span className="text-red-500">*</span>
                  </label>
                  <div className="block w-full px-3 py-2 border rounded-md shadow-sm text-sm bg-gray-50 border-gray-200 text-gray-700 capitalize">
                    {formData.event_type ?
                      eventTypeOptions.find(opt => opt.value === formData.event_type)?.label || formData.event_type
                      : 'Not specified'
                    }
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Event type is locked after creation</p>
                </div>
                {/* Organizing Department */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organizing Department/Club <span className="text-red-500">*</span>
                  </label>
                  <div className="block w-full px-3 py-2 border rounded-md shadow-sm text-sm bg-gray-50 border-gray-200 text-gray-700">
                    {formData.organizing_department || 'Not specified'}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Department information is read-only</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Audience <span className="text-red-500">*</span>
                  </label>
                  <div className="block w-full px-3 py-2 border rounded-md shadow-sm text-sm bg-gray-50 border-gray-200 text-gray-700 capitalize">
                    {formData.target_audience ?
                      targetAudienceOptions.find(opt => opt.value === formData.target_audience)?.label || formData.target_audience
                      : 'Not specified'
                    }
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Target audience is locked after creation</p>
                </div>
              </div>



              {/* Department, Semester, and Custom Text for Students */}
              {formData.target_audience === 'student' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Departments
                    </label>
                    <div className="block w-full px-3 py-2 border rounded-md shadow-sm text-sm bg-gray-50 border-gray-200 text-gray-700 min-h-[2.5rem]">
                      {formData.student_department && formData.student_department.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {formData.student_department.map((dept, idx) => {
                            const deptOption = dropdownOptionsService.getOptions('student', 'departments').find(opt => opt.value === dept);
                            return (
                              <span key={idx} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                {deptOption?.label || dept}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        'All Departments'
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Department targeting is read-only</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Semesters
                    </label>
                    <div className="block w-full px-3 py-2 border rounded-md shadow-sm text-sm bg-gray-50 border-gray-200 text-gray-700 min-h-[2.5rem]">
                      {formData.student_semester && formData.student_semester.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {formData.student_semester.map((sem, idx) => (
                            <span key={idx} className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                              Sem {sem}
                            </span>
                          ))}
                        </div>
                      ) : (
                        'All Semesters'
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Semester targeting is read-only</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Info <span className="text-gray-400">(Read-Only)</span>
                    </label>
                    <div className="block w-full px-3 py-2 border rounded-md shadow-sm text-sm bg-gray-50 border-gray-200 text-gray-700 min-h-[2.5rem]">
                      {formData.custom_text || 'No additional information'}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Additional info cannot be modified</p>
                  </div>
                </div>
              )}

              {/* Short Description - EDITABLE */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Short Description <span className="text-red-500">*</span>
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                    Editable
                  </span>
                </label>
                <textarea
                  name="short_description"
                  value={formData.short_description}
                  onChange={handleInputChange}
                  required
                  rows={2}
                  placeholder="Write a brief overview of the event (max 200 characters)"
                  className="block w-full px-3 py-2 border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none border-blue-300 focus:border-blue-500"
                />
                <p className="text-xs text-blue-600 mt-1">✓ This field can be edited to update the event summary</p>
              </div>

              {/* Detailed Description - EDITABLE */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Detailed Description <span className="text-red-500">*</span>
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                    Editable with Rich Text
                  </span>
                </label>
                <RichTextEditor
                  value={formData.detailed_description}
                  onChange={(value) => setFormData(prev => ({ ...prev, detailed_description: value }))}
                  placeholder="Provide comprehensive details about the event, including objectives, highlights, and what participants can expect.

You can use formatting like:
**Bold text**, *Italic text*, `Code`, # Headers
- Bullet points
1. Numbered lists
[Link text](URL)"
                  rows={6}
                  maxLength={2000}
                />
                <p className="text-xs text-blue-600 mt-1">✓ Rich text formatting supported for better event descriptions</p>
              </div>

              {/* Information Banner */}
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      <strong>Edit Policy:</strong> Most event details are locked after creation to maintain data integrity and prevent issues with registrations.
                      Only the event descriptions can be modified to provide updated information to participants.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div>
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Organizer, Contact & Schedule Information</h2>
              <p className="text-sm text-gray-600">Event organizer details, contact information, and scheduling settings</p>
            </div>

            <div className="space-y-4">
              {/* Organizer & Contact Information Section */}
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-6 border-b pb-2">Organizer & Contact Information</h3>
                <div className="space-y-6">
                  {/* Organizers - READ ONLY */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event Organizers <span className="text-red-500">*</span>
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        Read Only
                      </span>
                    </label>

                    <div className="space-y-4">
                      {(() => {
                        const selectedOrganizers = formData.organizers?.filter(org => org.selected && org.name) || [];

                        return selectedOrganizers.length > 0 ?
                          selectedOrganizers.map((organizer, idx) => (
                            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50" key={idx}>
                              <div className="flex justify-between items-start mb-3">
                                <h4 className="text-sm font-semibold text-blue-900">Organizer #{idx + 1}</h4>
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                                  </svg>
                                  Faculty Member
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <div>
                                    <p className="text-xs text-blue-600 font-medium">Name:</p>
                                    <p className="text-sm font-semibold text-blue-900">{organizer.name || 'Not Available'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-blue-600 font-medium">Email:</p>
                                    <p className="text-sm text-blue-800">{organizer.email || 'Not Available'}</p>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <div>
                                    <p className="text-xs text-blue-600 font-medium">Employee ID:</p>
                                    <p className="text-sm text-blue-800">{organizer.employee_id || 'Not Available'}</p>
                                  </div>

                                  {(organizer.department || organizer.designation) && (
                                    <div>
                                      <p className="text-xs text-blue-600 font-medium">Department & Role:</p>
                                      <p className="text-sm text-blue-700">
                                        {organizer.department || 'N/A'} • {organizer.designation || 'N/A'}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="mt-3 pt-2 border-t border-blue-200 flex items-center justify-between">
                                <span className="text-xs text-blue-600">✓ Faculty member verified</span>
                                <span className="text-xs text-blue-500 bg-blue-100 px-2 py-1 rounded">Locked</span>
                              </div>
                            </div>
                          )) : (
                            <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 text-center">
                              <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <p className="text-sm text-gray-600 font-medium">No organizers assigned to this event</p>
                              <p className="text-xs text-gray-500 mt-1">Event organizers were not properly configured during creation</p>
                            </div>
                          );
                      })()}
                    </div>

                    <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded p-2 text-center">
                      🔒 Organizer information cannot be modified after event creation
                    </p>
                  </div>

                  {/* Contact Information - EDITABLE */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Volunteer Contact Information <span className="text-red-500">*</span>
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                        Editable
                      </span>
                    </label>
                    <div className="space-y-2">
                      {formData.contacts.map((c, idx) => (
                        <div className="grid grid-cols-[0.65fr_1fr] gap-2" key={idx}>
                          <input
                            type="text"
                            value={c.name}
                            onChange={e => handleContactChange(idx, 'name', e.target.value)}
                            required
                            placeholder="Contact Name (E.g. Smriti Sharma)"
                            className="block w-full px-3 py-2 border border-blue-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={c.contact}
                              onChange={e => handleContactChange(idx, 'contact', e.target.value)}
                              required
                              placeholder="Email/Phone (E.g. smriti.sharma@college.edu / 9876543210)"
                              className="flex w-full px-3 py-2 border border-blue-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            {formData.contacts.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeContact(idx)}
                                className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm font-medium"
                              >
                                −
                              </button>
                            )}
                            {idx === formData.contacts.length - 1 && (
                              <button
                                type="button"
                                onClick={addContact}
                                className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm font-medium"
                              >
                                +
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-blue-600 mt-1">✓ Contact information can be updated</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-6 border-b pb-2 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="orange" className="w-5 h-5 mr-2">
                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 0 1 .67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 1 1-.671-1.34l.041-.022ZM12 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                  </svg>
                  Event Data
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                    Editable
                  </span>
                </h3>

                {/* Main Layout: Left Column (Forms) and Right Column (Preview) */}
                <div className="grid grid-cols-1 lg:grid-cols-2  gap-8">
                  {/* Left Column: Forms */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-md font-medium text-gray-900 mb-6 border-b pb-2">Registration Settings</h3>
                      <div className="space-y-4">
                        {/* Registration Type and Mode in same row - READ ONLY */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                              Registration Type<span className="text-red-500">*</span>
                              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                Read Only
                              </span>
                            </label>
                            <div className="px-3 py-2 w-full rounded-lg border border-gray-300 bg-gray-50 text-gray-700 text-sm capitalize">
                              {formData.registration_type === 'free' ? 'Free Registration' :
                                formData.registration_type === 'paid' ? 'Paid Registration' :
                                  formData.registration_type === 'sponsored' ? 'Sponsored Event' :
                                    formData.registration_type || 'Not Set'}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                              Registration Mode<span className="text-red-500">*</span>
                              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                Read Only
                              </span>
                            </label>
                            <div className="px-3 py-2 w-full rounded-lg border border-gray-300 bg-gray-50 text-gray-700 text-sm capitalize">
                              {formData.registration_mode === 'individual' ? 'Individual Registration' :
                                formData.registration_mode === 'team' ? 'Team Registration' :
                                  formData.registration_mode || 'Not Set'}
                            </div>
                          </div>
                        </div>

                        {/* Fee Fields - READ ONLY if exists */}
                        {formData.registration_type === 'paid' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3" id="fee-fields">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">Registration Fee</label>
                              <div className="px-3 py-2 w-full rounded-lg border border-gray-300 bg-gray-50 text-gray-700 text-sm">
                                ₹{formData.registration_fee || '0.00'}
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">Fee Description</label>
                              <div className="px-3 py-2 w-full rounded-lg border border-gray-300 bg-gray-50 text-gray-700 text-sm min-h-[2.5rem]">
                                {formData.fee_description || 'No description'}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Team Fields - READ ONLY if exists */}
                        {formData.registration_mode === 'team' && (
                          <div className="space-y-3" id="team-fields">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Team Size</label>
                                <p className="text-sm text-gray-700">
                                  <span className="font-medium">Min:</span> {formData.team_size_min || 'Not Set'} •
                                  <span className="font-medium ml-2">Max:</span> {formData.team_size_max || 'Not Set'}
                                </p>
                              </div>

                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Participants Limit</label>
                                <p className="text-sm text-gray-700">
                                  <span className="font-medium">Min:</span> {formData.min_participants || '1'} •
                                  <span className="font-medium ml-2">Max:</span> {formData.max_participants || 'Unlimited'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
                              <input
                                type="checkbox"
                                checked={formData.allow_multiple_team_registrations}
                                disabled
                                className="w-3 h-3 text-gray-400 bg-gray-200 border-gray-300 rounded cursor-not-allowed"
                              />
                              <label className="text-sm text-gray-500 cursor-not-allowed">Allow Multiple Team Registrations</label>
                            </div>
                          </div>
                        )}

                        {/* For individual registration mode, show participants limit separately */}
                        {formData.registration_mode === 'individual' && (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Participants Limit</label>
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Min:</span> {formData.min_participants || '1'} •
                              <span className="font-medium ml-2">Max:</span> {formData.max_participants || 'Unlimited'}
                            </p>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-2 text-center bg-gray-50 rounded p-2">
                          🔒 All registration settings are locked after event creation
                        </p>
                      </div>
                    </div>
                    {/* Registration Period - EDITABLE */}
                    <div className="space-y-3">
                      <DateRangePicker
                        label="Registration Period"
                        startDate={formData.registration_start_date ? (() => {
                          const [year, month, day] = formData.registration_start_date.split('-');
                          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                        })() : null}
                        endDate={formData.registration_end_date ? (() => {
                          const [year, month, day] = formData.registration_end_date.split('-');
                          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                        })() : null}
                        startTime={formData.registration_start_time}
                        endTime={formData.registration_end_time}
                        onDateChange={(startDate, endDate) => {
                          setFormData(prev => {
                            const updates = {
                              ...prev,
                              registration_start_date: startDate ? formatDateToLocal(startDate) : '',
                              registration_end_date: endDate ? formatDateToLocal(endDate) : ''
                            };
                            // Set default time to 23:59 if date is selected but time is empty
                            if (startDate && !prev.registration_start_time) {
                              updates.registration_start_time = '23:59';
                            }
                            if (endDate && !prev.registration_end_time) {
                              updates.registration_end_time = '23:59';
                            }
                            return updates;
                          });
                        }}
                        onTimeChange={(startTime, endTime) => {
                          setFormData(prev => ({
                            ...prev,
                            registration_start_time: startTime || '',
                            registration_end_time: endTime || ''
                          }));
                        }}
                        includeTime={true}
                        required={true}
                        placeholder="Select registration period"
                        className="w-full"
                        theme="green"
                      />

                      <DateRangePicker
                        label="Event Schedule"
                        startDate={formData.start_date ? (() => {
                          const [year, month, day] = formData.start_date.split('-');
                          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                        })() : null}
                        endDate={formData.end_date ? (() => {
                          const [year, month, day] = formData.end_date.split('-');
                          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                        })() : null}
                        startTime={formData.start_time}
                        endTime={formData.end_time}
                        onDateChange={(startDate, endDate) => {
                          setFormData(prev => {
                            const updates = {
                              ...prev,
                              start_date: startDate ? formatDateToLocal(startDate) : '',
                              end_date: endDate ? formatDateToLocal(endDate) : ''
                            };
                            // Set default time to 23:59 if date is selected but time is empty
                            if (startDate && !prev.start_time) {
                              updates.start_time = '23:59';
                            }
                            if (endDate && !prev.end_time) {
                              updates.end_time = '23:59';
                            }
                            return updates;
                          });
                        }}
                        onTimeChange={(startTime, endTime) => {
                          setFormData(prev => ({
                            ...prev,
                            start_time: startTime || '',
                            end_time: endTime || ''
                          }));
                        }}
                        includeTime={true}
                        required={true}
                        placeholder="Select event duration"
                        className="w-full"
                        theme="purple"
                        constrainToRegistration={true}
                        registrationEndDate={formData.registration_end_date}
                        registrationEndTime={formData.registration_end_time}
                        minDate={formData.registration_end_date || formData.registration_start_date ? (() => {
                          const targetDate = formData.registration_end_date || formData.registration_start_date;
                          const [year, month, day] = targetDate.split('-');
                          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                        })() : null}
                      />
                    </div>
                    {/* Schedule Information Section - EDITABLE */}
                    {/* Event Mode & Location Section */}



                  </div>
                  {/* Right Column: Event Timeline & Location Preview */}
                  <div className="space-y-0">
                    <div>
                      <h3 className="text-md font-medium text-gray-900 mb-6 border-b pb-2">Event Venue Settings</h3>
                      <div className="space-y-4">
                        {/* Venue Location Input - EDITABLE for offline and hybrid modes */}
                        {(formData.mode === 'offline' || formData.mode === 'hybrid') && (
                          <div className='mb-4'>
                            {/* Event Mode - READ ONLY */}
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Event Mode<span className="text-red-500">*</span>
                                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                  Read Only
                                </span>
                              </label>
                              <div className="px-3 py-2 w-full rounded-lg border border-gray-300 bg-gray-50 text-gray-700 text-sm capitalize">
                                {formData.mode === 'online' && '🌐 Online Event'}
                                {formData.mode === 'offline' && '📍 Offline Event'}
                                {formData.mode === 'hybrid' && '🔄 Hybrid Event'}
                                {!formData.mode && 'Not Set'}
                              </div>
                              <p className="text-xs text-gray-500 mt-1">Event mode cannot be changed after creation</p>
                            </div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 mt-3">
                              Venue/Location<span className="text-red-500">*</span>
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                                Editable
                              </span>
                            </label>

                            <div className="relative venue-search-container" ref={venueDropdownRef}>
                              <input
                                type="text"
                                name="venue"
                                value={formData.venue}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setFormData(prev => ({
                                    ...prev,
                                    venue: value,
                                    venue_id: '' // Clear venue_id when manually typing
                                  }));

                                  // Show autocomplete suggestions - all venues if empty, filtered if has text
                                  if (value.trim()) {
                                    const filtered = venues.filter(v =>
                                      v.is_active &&
                                      (v.name.toLowerCase().includes(value.toLowerCase()) ||
                                        v.location.toLowerCase().includes(value.toLowerCase()) ||
                                        `${v.name} - ${v.location}`.toLowerCase().includes(value.toLowerCase()))
                                    );
                                    setFilteredVenues(filtered);
                                    setShowVenueDropdown(true);
                                  } else {
                                    // Show all active venues when field is empty
                                    const allActiveVenues = venues.filter(v => v.is_active);
                                    setFilteredVenues(allActiveVenues);
                                    setShowVenueDropdown(allActiveVenues.length > 0);
                                  }
                                }}
                                onFocus={() => {
                                  // Show all active venues when focused
                                  const allActiveVenues = venues.filter(v => v.is_active);
                                  setFilteredVenues(allActiveVenues);
                                  setShowVenueDropdown(allActiveVenues.length > 0);
                                }}
                                placeholder="Click to view all venues or type to search (e.g., Main Auditorium, Room 101)"
                                className="w-full rounded-md border border-blue-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 pr-10"
                                required
                              />

                              {/* Search Icon */}
                              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                              </div>

                              {/* Autocomplete Dropdown - Show all venues when focused or filtered when searching */}
                              {showVenueDropdown && filteredVenues.length > 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                  {filteredVenues.map((venue) => (
                                    <div
                                      key={venue.venue_id}
                                      onClick={() => selectVenue(venue)}
                                      className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                    >
                                      <div className="flex justify-between items-center">
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-gray-900">{venue.name}</p>
                                          <p className="text-xs text-gray-500">{venue.location}</p>
                                          {venue.venue_type && (
                                            <p className="text-xs text-blue-600 capitalize">{venue.venue_type.replace('_', ' ')}</p>
                                          )}
                                        </div>
                                        <div className="text-right">
                                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                            Capacity: {venue.capacity || 'N/A'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <p className="text-xs text-blue-600 mt-1">
                              ✓ Venue location can be updated. Start typing to see suggestions from existing venues.
                            </p>

                            {/* Display selected venue confirmation */}
                            {formData.venue_id && (
                              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                                <div className="flex items-center gap-2">
                                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                  <span className="text-sm text-green-800 font-medium">Existing venue selected</span>
                                </div>
                              </div>
                            )}

                            {/* Display custom venue confirmation */}
                            {formData.venue && !formData.venue_id && (
                              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                                <div className="flex items-center gap-2">
                                  <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                  </svg>
                                  <span className="text-sm text-amber-800 font-medium">Custom venue will be updated</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Online Meeting Link Input - EDITABLE for online and hybrid modes */}
                        {(formData.mode === 'online' || formData.mode === 'hybrid') && (
                          <div className={formData.mode === 'hybrid' ? 'mt-4' : ''}>
                            <label className="block text-sm font-medium text-gray-700">
                              {formData.mode === 'hybrid' ? 'Online Meeting Link' : 'Platform/Meeting Link'}
                              <span className="text-red-500">*</span>
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                                Editable
                              </span>
                            </label>
                            <input
                              type="url"
                              name="online_meeting_link"
                              value={formData.online_meeting_link}
                              onChange={handleInputChange}
                              placeholder="e.g., https://meet.google.com/xyz-abc-def or Zoom Meeting ID"
                              required
                              className="mt-1 block w-full rounded-md border border-blue-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3"
                            />
                            <p className="text-xs text-blue-600 mt-1">
                              ✓ {formData.mode === 'hybrid'
                                ? 'Online meeting link can be updated for the online component of this hybrid event'
                                : 'Online meeting platform link can be updated'
                              }
                            </p>
                          </div>
                        )}
                      </div>
                      {/* Registration Settings Section - READ ONLY */}

                      <InfoCard icon={Clock} title="Schedule">
                        <div className="space-y-2">
                          {/* Registration Period */}
                          <div className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                            <div className="text-xs font-medium text-green-800 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Registration
                            </div>
                            <div className="text-xs text-green-700">
                              {formatCombinedDateTime(formData.registration_start_date, formData.registration_start_time)} → {formatCombinedDateTime(formData.registration_end_date, formData.registration_end_time)}
                            </div>
                          </div>

                          {/* Event Period */}
                          <div className="flex items-center justify-between p-2 bg-purple-50 rounded border border-purple-200">
                            <div className="text-xs font-medium text-purple-800 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                              </svg>
                              Event
                            </div>
                            <div className="text-xs text-purple-700">
                              {formatCombinedDateTime(formData.start_date, formData.start_time)} → {formatCombinedDateTime(formData.end_date, formData.end_time)}
                            </div>
                          </div>

                          {/* Duration */}
                          {formData.start_date && formData.start_time && formData.end_date && formData.end_time && (
                            <div className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200">
                              <div className="text-xs font-medium text-blue-800 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                </svg>
                                Duration
                              </div>
                              <div className="text-xs font-semibold text-blue-800">
                                {(() => {
                                  try {
                                    const start = new Date(`${formData.start_date}T${formData.start_time}:00`);
                                    const end = new Date(`${formData.end_date}T${formData.end_time}:00`);
                                    const diffMs = end - start;
                                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

                                    if (diffDays > 0) return `${diffDays}d ${diffHours}h ${diffMinutes}m`;
                                    if (diffHours > 0) return `${diffHours}h ${diffMinutes}m`;
                                    return `${diffMinutes}m`;
                                  } catch (error) {
                                    return 'Invalid';
                                  }
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      </InfoCard>
                    </div>
                  </div>
                </div>
              </div>
              {/* Registration Settings & Attendance Settings - Side by Side Layout (All Read-Only) */}
              <div className="">
                {/* Attendance Settings - READ ONLY */}
                <h3 className="text-md font-medium text-gray-900 mb-6 border-b pb-2">Attendance Settings</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <div className="flex items-center h-5">
                        <input
                          type="checkbox"
                          checked={formData.attendance_mandatory}
                          disabled
                          className="h-4 w-4 text-gray-400 bg-gray-200 border-gray-300 rounded cursor-not-allowed"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-sm font-medium text-gray-500 cursor-not-allowed">
                          Is Event Attendance Mandatory?
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            Read Only
                          </span>
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Current: {formData.attendance_mandatory ? 'Mandatory' : 'Optional'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {formData.attendance_mandatory ? (
                    <div className="space-y-4">
                      {/* Dynamic Attendance Strategy Generation */}
                      <AttendancePreview
                        eventData={formData}
                        initialCustomData={attendanceStrategy || formData.attendance_strategy}
                        onStrategyChange={(strategy) => {
                          setAttendanceStrategy(strategy);
                          // Also update formData for immediate display
                          setFormData(prev => ({
                            ...prev,
                            attendance_strategy: strategy
                          }));
                        }}
                        onCustomDataChange={(customData) => {
                          // Update attendance strategy when custom data changes
                          setAttendanceStrategy(customData);
                        }}
                      />
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                      <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <h3 className="text-sm font-medium text-gray-900 mb-1">No Attendance Tracking</h3>
                      <p className="text-xs text-gray-600">
                        No attendance data will be collected for this event.
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 text-center bg-gray-50 rounded p-2">
                    🔒 Attendance settings are locked after event creation
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div>
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                <div className="relative group">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2 text-amber-600 cursor-help">
                    <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5zM16.5 15a.75.75 0 01.712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 010 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 01-1.422 0l-.395-1.183a1.5 1.5 0 00-.948-.948l-1.183-.395a.75.75 0 010-1.422l1.183-.395c.447-.15.799-.5.948-.948l.394-1.183A.75.75 0 0116.5 15z" clipRule="evenodd" />
                  </svg>

                  {/* Tooltip */}
                  <div className="absolute left-0 top-8 w-80 bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-lg z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="flex items-start space-x-2">
                      <div className="w-5 h-5 text-amber-600 mt-0.5">🏆</div>
                      <div className="text-sm text-amber-800">
                        <p className="font-medium mb-2">Poster & Certificates:</p>
                        <ul className="space-y-1 text-xs">
                          <li>• Event poster is always optional but recommended for marketing</li>
                          <li>• Certificate distribution date is optional - set it if you want to provide certificates</li>
                          <li>• Certificate templates are only required if you set a distribution date</li>
                          <li>• Different event types require different certificate templates</li>
                          <li>• Templates should include placeholders like [Event Name], [Participant Name]</li>
                        </ul>
                      </div>
                    </div>

                    {/* Arrow pointing up */}
                    <div className="absolute -top-2 left-4 w-4 h-4 bg-amber-50 border-l border-t border-amber-200 transform rotate-45"></div>
                  </div>
                </div>
                Poster & Certificates
              </h2>
              <p className="text-sm text-gray-600">Update event poster and configure certificates (if needed)</p>
            </div>

            <div className="space-y-8">
              {/* Event Poster Section - Always visible */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Event Poster
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                    Editable
                  </span>
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Upload an updated event poster image (PNG preferred, but any image format works). This helps with marketing and promotion.
                </p>

                {/* Current Poster Display */}
                {event?.event_poster_url && !formData.event_poster && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Current Poster:</h4>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <img
                            src={event.event_poster_url}
                            alt="Current event poster"
                            className="w-16 h-20 object-cover rounded-md border border-gray-300"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'block';
                            }}
                          />
                          <div className="w-16 h-20 bg-gray-100 rounded-md border border-gray-300 flex items-center justify-center" style={{ display: 'none' }}>
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium text-gray-900">Poster Uploaded</span>
                          </div>
                          <p className="text-xs text-gray-600">Upload a new file below to replace the current poster</p>
                          <a
                            href={event.event_poster_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 underline mt-1 inline-block"
                          >
                            View Full Size →
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <input
                  type="file"
                  name="event_poster"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    setFormData(prev => ({
                      ...prev,
                      event_poster: file
                    }));
                  }}
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />

                {formData.event_poster && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">New Poster Selected:</h4>
                    <div className="flex items-center justify-between bg-blue-50 rounded-md p-3">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm text-blue-700 font-medium">{formData.event_poster.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-blue-600">{Math.round(formData.event_poster.size / 1024)} KB</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              event_poster: null
                            }));
                          }}
                          className="text-red-600 hover:text-red-800 text-xs underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Certificate Distribution Date Section */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Certificate Distribution
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                    Editable
                  </span>
                </h3>

                {/* Current Certificate Distribution Date Display */}
                {event?.certificate_end_date && (
                  <div className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-purple-900 mb-2 flex items-center">
                      <svg className="w-4 h-4 text-purple-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Current Certificate Distribution End Date:
                    </h4>
                    <div className="text-sm text-purple-800">
                      <span className="font-medium">{formatDateTime(event.certificate_end_date)}</span>
                      <p className="text-xs text-purple-600 mt-1">Set a new date below to change the certificate distribution deadline</p>
                    </div>
                  </div>
                )}

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 pt-3 pb-3">
                  <DateRangePicker
                    label="Certificate Distribution End Date"
                    startDate={formData.certificate_end_date ? (() => {
                      try {
                        const [year, month, day] = formData.certificate_end_date.split('-');
                        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                      } catch (error) {
                        
                        return null;
                      }
                    })() : null}
                    endDate={null}
                    startTime={formData.certificate_end_time || '23:59'}
                    endTime={null}
                    onDateChange={(startDate, endDate) => {
                      setFormData(prev => {
                        const updates = {
                          ...prev,
                          certificate_end_date: startDate ? formatDateToLocal(startDate) : ''
                        };
                        // Set default time to 23:59 if date is selected but time is empty
                        if (startDate && !prev.certificate_end_time) {
                          updates.certificate_end_time = '23:59';
                        }
                        return updates;
                      });
                    }}
                    onTimeChange={(startTime, endTime) => {
                      setFormData(prev => ({
                        ...prev,
                        certificate_end_time: startTime || '23:59'
                      }));
                    }}
                    includeTime={true}
                    required={false}
                    placeholder="Optional: Select certificate expiry date"
                    className="w-full"
                    singleDate={true}
                    description="After this date, certificates will no longer be downloadable"
                    theme="purple"
                    minDate={formData.end_date ? (() => {
                      try {
                        const [year, month, day] = formData.end_date.split('-');
                        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                      } catch (error) {
                        
                        return new Date(); // Fallback to today
                      }
                    })() : new Date()}
                  />

                  <p className="text-sm text-purple-800 mt-5">
                    <strong>Optional:</strong> If you want to provide certificates to participants, set when certificates will no longer be available for download. Leave blank if no certificates are needed.
                  </p>
                </div>
              </div>

              {/* Certificate Templates Section - Show if certificate date is set OR if existing templates exist */}
              {(formData.certificate_end_date && formData.certificate_end_time) || (event?.certificate_templates && Object.keys(event.certificate_templates).length > 0) ? (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Certificate Templates</h3>
                        <p className="text-sm text-gray-600">Update certificate templates for this event</p>
                      </div>
                    </div>

                    {/* Event Type Information */}
                    <div className="bg-white border border-purple-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h4 className="text-md font-medium text-gray-900">
                          Certificate Types for {formData.event_type ? formData.event_type.charAt(0).toUpperCase() + formData.event_type.slice(1) : 'Selected'} Event
                        </h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        Based on your event type and mode, the following certificate templates can be updated:
                      </p>
                      {formData.event_type && (
                        <div className="mt-3">
                          <div className="flex flex-wrap gap-2">
                            {getCertificateTypes(formData.event_type, formData.mode).map((type, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                              >
                                {type}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Certificate Template Uploads */}
                  {formData.event_type && (
                    <div className="space-y-6">
                      {/* Current Certificate Templates Display */}
                      {event?.certificate_templates && Object.keys(event.certificate_templates).length > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                          <h4 className="text-md font-medium text-green-900 mb-4 flex items-center">
                            <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Current Certificate Templates:
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(event.certificate_templates).map(([templateType, templateUrl], index) => (
                              <div key={index} className="bg-white border border-green-200 rounded-md p-4">
                                <div className="flex items-center space-x-3">
                                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </div>
                                  <div className="flex-1">
                                    <h5 className="text-sm font-medium text-gray-900">{templateType}</h5>
                                    <p className="text-xs text-gray-600 mb-1">
                                      File: <span className="font-mono text-green-700">{getFileNameFromUrl(templateUrl)}</span>
                                    </p>
                                    <p className="text-xs text-gray-500">Template uploaded and ready</p>
                                    {templateUrl && (
                                      <div className="flex items-center space-x-3 mt-2">
                                        <button
                                          type="button"
                                          onClick={() => openHtmlTemplate(templateUrl, templateType)}
                                          className="text-xs text-green-600 hover:text-green-800 underline inline-flex items-center"
                                        >
                                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                          </svg>
                                          Preview Template
                                        </button>
                                        <a
                                          href={templateUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-blue-600 hover:text-blue-800 underline inline-flex items-center"
                                        >
                                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                          </svg>
                                          Download
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <p className="text-sm text-green-800 mt-4">
                            Upload new templates below to replace existing ones.
                          </p>
                        </div>
                      )}

                      {/* Only show upload section if certificate date is set */}
                      {formData.certificate_end_date && formData.certificate_end_time && (
                        <>
                          <h3 className="text-md font-medium text-gray-900 border-b pb-2">Update Certificate Templates</h3>

                          <div className="grid grid-cols-1 gap-6">
                            {getCertificateTypes(formData.event_type, formData.mode).map((certificateType, index) => (
                              <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 hover:border-purple-300 transition-colors">
                                <div className="flex items-center justify-between mb-4">
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-900">{certificateType}</h4>
                                    <p className="text-xs text-gray-500 mt-1">Upload a new HTML template for this certificate type</p>
                                  </div>
                                  {formData.certificate_templates[certificateType] && (
                                    <div className="flex items-center space-x-2">
                                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                      <span className="text-xs text-green-600 font-medium">New Template Selected</span>
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-3">
                                  <input
                                    type="file"
                                    accept=".html"
                                    onChange={(e) => {
                                      const file = e.target.files[0];
                                      if (file) {
                                        setFormData(prev => ({
                                          ...prev,
                                          certificate_templates: {
                                            ...prev.certificate_templates,
                                            [certificateType]: file
                                          }
                                        }));
                                      }
                                    }}
                                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                                  />

                                  {formData.certificate_templates[certificateType] && (
                                    <div className="bg-green-50 border border-green-200 rounded-md p-3">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                          </svg>
                                          <div className="flex-1">
                                            <span className="text-sm text-green-800 font-medium block">
                                              {formData.certificate_templates[certificateType].name}
                                            </span>
                                            <span className="text-xs text-green-600">
                                              {formData.certificate_templates[certificateType].size ?
                                                `${Math.round(formData.certificate_templates[certificateType].size / 1024)} KB • Ready to upload` :
                                                'File size unknown • Ready to upload'
                                              }
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              // Enhanced preview with better error handling
                                              const file = formData.certificate_templates[certificateType];

                                              // Validate file exists and is valid
                                              if (!file || !(file instanceof File)) {
                                                alert('Invalid file selected. Please try uploading the file again.');
                                                return;
                                              }

                                              // Check if it's an HTML file
                                              if (!file.name.toLowerCase().endsWith('.html')) {
                                                alert('Please select an HTML file for the certificate template.');
                                                return;
                                              }

                                              const reader = new FileReader();

                                              reader.onload = (e) => {
                                                try {
                                                  const htmlContent = e.target.result;
                                                  const newWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');

                                                  if (newWindow) {
                                                    newWindow.document.write(`
                                                  <!DOCTYPE html>
                                                  <html lang="en">
                                                  <head>
                                                    <meta charset="utf-8">
                                                    <title>${certificateType} - New Template Preview</title>
                                                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                                    <style>
                                                      :root {
                                                        --primary: #059669;
                                                        --primary-dark: #047857;
                                                        --bg-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                                        --radius: 12px;
                                                      }
                                                      body { 
                                                        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                                        margin: 0; 
                                                        line-height: 1.6;
                                                        background: var(--bg-gradient);
                                                        min-height: 100vh;
                                                        padding: 20px;
                                                        display: flex;
                                                        justify-content: center;
                                                        align-items: flex-start;
                                                      }
                                                      .preview-container {
                                                        width: 100%;
                                                        max-width: 1000px;
                                                      }
                                                      /* Header */
                                                      .template-header {
                                                        background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
                                                        color: white;
                                                        padding: 20px;
                                                        border-radius: var(--radius) var(--radius) 0 0;
                                                        text-align: center;
                                                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                                                      }
                                                      .template-header h1 {
                                                        margin: 0 0 6px 0;
                                                        font-size: 1.6rem;
                                                        font-weight: 600;
                                                      }
                                                      .template-header p {
                                                        margin: 0;
                                                        opacity: 0.85;
                                                        font-size: 0.9rem;
                                                      }
                                                      /* Note */
                                                      .placeholder-note {
                                                        background: #ecfdf5;
                                                        border-left: 4px solid var(--primary);
                                                        padding: 14px 16px;
                                                        margin: 0;
                                                        font-size: 0.9rem;
                                                        color: #065f46;
                                                      }
                                                      /* Main content */
                                                      .template-content {
                                                        background: white;
                                                        padding: 32px;
                                                        border-radius: 0 0 var(--radius) var(--radius);
                                                        box-shadow: 0 4px 10px rgba(0,0,0,0.08);
                                                        min-height: 480px;
                                                        position: relative;
                                                      }
                                                      .preview-watermark {
                                                        position: absolute;
                                                        top: 16px;
                                                        right: 16px;
                                                        background: rgba(5, 150, 105, 0.08);
                                                        color: var(--primary);
                                                        padding: 6px 10px;
                                                        border-radius: 6px;
                                                        font-size: 0.75rem;
                                                        font-weight: 600;
                                                        border: 1px solid var(--primary);
                                                      }
                                                      /* Close button */
                                                      .close-btn {
                                                        position: fixed;
                                                        top: 20px;
                                                        right: 20px;
                                                        background: rgba(0,0,0,0.75);
                                                        color: white;
                                                        border: none;
                                                        padding: 10px 14px;
                                                        border-radius: 8px;
                                                        cursor: pointer;
                                                        font-size: 14px;
                                                        transition: background 0.2s ease;
                                                        z-index: 1000;
                                                      }
                                                      .close-btn:hover {
                                                        background: rgba(0,0,0,0.9);
                                                      }
                                                      /* Print optimization */
                                                      @media print {
                                                        .template-header, .placeholder-note, .preview-watermark, .close-btn {
                                                          display: none !important;
                                                        }
                                                        body {
                                                          background: white;
                                                          padding: 0;
                                                        }
                                                        .template-content {
                                                          box-shadow: none !important;
                                                          border-radius: 0 !important;
                                                        }
                                                      }
                                                    </style>
                                                  </head>
                                                  <body>
                                                    <button class="close-btn" onclick="window.close()">✕ Close Preview</button>
                                                    <div class="preview-container">
                                                      <div class="template-header">
                                                        <h1>📜 ${certificateType}</h1>
                                                        <p>New Template Preview • File: ${file.name}</p>
                                                      </div>
                                                      <div class="placeholder-note">
                                                        <strong>🆕 Preview:</strong> This is your selected template. Placeholders like <code>[Participant Name]</code> and <code>[Event Name]</code> will be replaced with actual data.<br>
                                                        <strong>💡 Tip:</strong> Use <kbd>Ctrl + P</kbd> to print or save as PDF.
                                                      </div>
                                                      <div class="template-content">
                                                        <div class="preview-watermark">PREVIEW</div>
                                                        ${htmlContent}
                                                      </div>
                                                    </div>
                                                  </body>
                                                  </html>

                                                `);
                                                    newWindow.document.close();

                                                    // Focus the new window
                                                    newWindow.focus();
                                                  } else {
                                                    // Fallback if popup is blocked
                                                    alert('Popup blocked! Please allow popups for this site to preview templates.');
                                                  }
                                                } catch (error) {
                                                  
                                                  alert('Error creating preview. Please check if the HTML file is valid.');
                                                }
                                              };

                                              reader.onerror = (error) => {
                                                
                                                alert('Error reading the file. Please try selecting the file again.');
                                              };

                                              // Read the file as text
                                              reader.readAsText(file);
                                            }}
                                            className="text-xs text-green-600 hover:text-green-800 underline"
                                          >
                                            Preview
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setFormData(prev => {
                                                const updated = { ...prev.certificate_templates };
                                                delete updated[certificateType];
                                                return {
                                                  ...prev,
                                                  certificate_templates: updated
                                                };
                                              });
                                            }}
                                            className="text-red-600 hover:text-red-800 text-xs underline"
                                          >
                                            Remove
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {/* Show guidelines only if certificate date is set */}
                      {formData.certificate_end_date && formData.certificate_end_time && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                          <h3 className="text-md font-medium text-amber-900 mb-4 flex items-center">
                            <svg className="w-5 h-5 text-amber-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Template Guidelines
                          </h3>
                          <div className="text-sm text-amber-800 space-y-2">
                            <p><strong>Required Placeholders:</strong></p>
                            <ul className="list-disc pl-5 space-y-1">
                              <li><code>[Event Name]</code> - Will be replaced with the actual event name</li>
                              <li><code>[Participant Name]</code> - Will be replaced with participant's name</li>
                              <li><code>[Event Date]</code> - Will be replaced with event date</li>
                              <li><code>[Organization]</code> - Will be replaced with organizing department</li>
                            </ul>
                            <p className="mt-3"><strong>Optional Placeholders:</strong></p>
                            <ul className="list-disc pl-5 space-y-1">
                              <li><code>[Certificate ID]</code> - Unique certificate identifier</li>
                              <li><code>[Issue Date]</code> - Certificate generation date</li>
                              <li><code>[Event Duration]</code> - Event duration or hours</li>
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Show message when no certificate templates are available */}
                  {!formData.certificate_end_date && !formData.certificate_end_time && !(event?.certificate_templates && Object.keys(event.certificate_templates).length > 0) && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                      <div className="text-center">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="text-md font-medium text-gray-900 mb-2">No Certificate Templates Required</h3>
                        <p className="text-sm text-gray-600">
                          Set a certificate distribution date above to enable certificate template uploads.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <div className="text-center">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-md font-medium text-gray-900 mb-2">No Certificate Templates Available</h3>
                    <p className="text-sm text-gray-600">
                      Set a certificate distribution date above to enable certificate template uploads and view current templates.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AdminLayout pageTitle="Edit Event">
      <div className="min-h-screen flex max-w-5xl justify-center items-start mx-auto">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-4">
              <button
                onClick={() => navigate(`/admin/events/${eventId}`)}
                className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Back to Event Details
              </button>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Event</h1>
            <p className="text-gray-600 mt-2">Update event information and settings</p>
          </div>

          {/* Error notification */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Organizer notification */}
          {organizerNotification && (
            <div className={`mb-6 border px-4 py-3 rounded-lg ${organizerNotification.type === 'warning'
              ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}>
              {organizerNotification.message}
            </div>
          )}

          {/* Main Content Card */}
          <div className="bg-white rounded-xl shadow-lg">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-8" aria-label="Tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    <i className={`${tab.icon} mr-2`}></i>
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <form onSubmit={handleSubmit}>
              <div className="p-8">
                {renderTabContent()}
              </div>

              {/* Navigation & Submit */}
              <div className="px-8 py-6 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                <div className="flex space-x-2">
                  {activeTab > 1 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab(activeTab - 1)}
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <i className="fas fa-arrow-left mr-2"></i>Previous
                    </button>
                  )}
                  {activeTab < tabs.length && (
                    <button
                      type="button"
                      onClick={() => setActiveTab(activeTab + 1)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Next<i className="fas fa-arrow-right ml-2"></i>
                    </button>
                  )}
                </div>

                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => navigate('/admin/events')}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors flex items-center"
                  >
                    {isSaving ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {uploadStatus || 'Updating Event...'}
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save mr-2"></i>
                        Update Event
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default EditEvent;
