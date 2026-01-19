import QRCode from 'qrcode';
import { clientAPI } from '../api/client';

/**
 * QR Code Generation Service for Event Registration
 * Handles QR code generation for attendance marking and verification
 */
class QRCodeService {
  constructor() {
    this.baseUrl = import.meta.env.VITE_APP_BASE_URL || 'https://campusconnect.edu';
    this.apiBase = '/api'; // Backend API base path
  }

  /**
   * Fetch QR data from backend endpoint
   * @param {Object} registrationData - Registration details
   * @param {Object} eventData - Event details
   * @returns {Promise<Object>} QR data from backend
   */
  async fetchQRDataFromBackend(registrationData, eventData) {
    try {
      // Extract event ID with more fallback options and better validation
      const eventId = eventData?.event_id || eventData?.id || eventData?.eventId;
      const registrationId = registrationData?.registration_id || registrationData?.registrar_id || registrationData?.reg_id;
      
      console.log('=== FETCHING QR DATA FROM BACKEND ===');
      console.log('Event Data received:', JSON.stringify(eventData, null, 2));
      console.log('Registration Data received:', JSON.stringify(registrationData, null, 2));
      console.log('Extracted Event ID:', eventId);
      console.log('Extracted Registration ID:', registrationId);
      
      // Validate required fields with detailed error messages
      if (!eventId || eventId === 'undefined' || eventId === 'null') {
        console.error('VALIDATION ERROR: Event ID is missing or invalid');
        console.error('Event data keys available:', Object.keys(eventData || {}));
        throw new Error(`Event ID is missing or invalid: ${eventId}. Available keys: ${Object.keys(eventData || {}).join(', ')}`);
      }
      
      if (!registrationId || registrationId === 'undefined' || registrationId === 'null') {
        console.error('VALIDATION ERROR: Registration ID is missing or invalid');
        console.error('Registration data keys available:', Object.keys(registrationData || {}));
        throw new Error(`Registration ID is missing or invalid: ${registrationId}. Available keys: ${Object.keys(registrationData || {}).join(', ')}`);
      }
      
      // Determine target audience and type
      const targetAudience = registrationData.employee_id ? 'faculty' : 'student';
      const registrationType = (registrationData.registration_type === 'team' || registrationData.registration_type === 'team_leader') ? 'team' : 'individual';
      
      // For faculty, always use individual
      const finalType = targetAudience === 'faculty' ? 'individual' : registrationType;
      
      console.log('Target Audience:', targetAudience);
      console.log('Registration Type:', finalType);
      
      const params = {
        target_audience: targetAudience,
        registration_type: finalType,
        registration_id: registrationId
      };
      
      console.log('API call params:', params);
      console.log('Calling clientAPI.getQRData with eventId:', eventId);
      console.log('Full API URL will be: /api/v1/attendance/qr-data/' + eventId);
      
      const response = await clientAPI.getQRData(eventId, params);
      
      console.log('Raw Backend Response:', response);
      console.log('Response data structure:', response.data);
      // Handle nested response structure {success: true, data: {...}}
      let qrData;
      if (response.data && response.data.success && response.data.data) {
        qrData = response.data.data;
        console.log('Extracted QR data from nested structure:', qrData);
      } else if (response.data) {
        qrData = response.data;
        console.log('Using direct response data:', qrData);
      } else {
        throw new Error('Invalid response structure from backend');
      }
      
      console.log('Final Backend QR Data:', qrData);
      console.log('=====================================');
      
      return qrData;
      
    } catch (error) {
      console.error('Failed to fetch QR data from backend:', error);
      console.error('Error details:', error.message);
      console.error('Error type:', error.constructor.name);
      console.log('Falling back to local QR data generation...');
      
      // Fallback to local generation
      return this.generateQRDataFallback(registrationData, eventData);
    }
  }

  /**
   * Generate QR code data object for registration (NEW - uses backend)
   * @param {Object} registrationData - Registration details
   * @param {Object} eventData - Event details
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} QR data object from backend
   */
  async generateQRData(registrationData, eventData, options = {}) {
    // Use backend endpoint for proper data
    return await this.fetchQRDataFromBackend(registrationData, eventData);
  }

  /**
   * Generate QR code data object for registration (FALLBACK - old method)
   * @param {Object} registrationData - Registration details
   * @param {Object} eventData - Event details
   * @param {Object} options - Additional options
   * @returns {Object} QR data object
   */
  generateQRDataFallback(registrationData, eventData, options = {}) {
    
    
    
    
    
    
    
    const isTeamRegistration = registrationData.registration_type === 'team' || registrationData.registration_type === 'team_leader';
    const isFacultyRegistration = registrationData.employee_id !== undefined;
    
    const qrData = {
      // Core identification
      reg_id: registrationData.registration_id || registrationData.registrar_id,
      event_id: eventData.event_id || eventData.id,
      event_name: eventData.event_name || eventData.title || eventData.name,
      
      // Registration type
      type: isTeamRegistration ? 'team' : 'individual',
      user_type: isFacultyRegistration ? 'faculty' : 'student',
      
      // User info (works for both student and faculty)
      user: {
        name: registrationData.full_name || registrationData.student_data?.full_name || 'User',
        id: registrationData.enrollment_no || registrationData.employee_id || registrationData.student_data?.enrollment_no || 'Unknown',
        department: this.getDepartment(registrationData),
        email: registrationData.email || registrationData.student_data?.email || 'N/A',
        type: isFacultyRegistration ? 'faculty' : 'student'
      },
      
      // Legacy field for backward compatibility (map to user)
      leader: {
        name: registrationData.full_name || registrationData.student_data?.full_name || 'Team Leader',
        enrollment: registrationData.enrollment_no || registrationData.employee_id || registrationData.student_data?.enrollment_no || 'Unknown',
        department: this.getDepartment(registrationData),
        email: registrationData.email || registrationData.student_data?.email || 'N/A'
      },
      
      // Team information (if applicable) - Single QR with full team data
      team: isTeamRegistration ? {
        team_id: this.generateTeamId(registrationData, eventData),
        name: registrationData.team_name || registrationData.student_data?.team_name,
        size: this.calculateTeamSize(registrationData),
        members: this.getTeamMembersForQR(registrationData) // Full team member list for scanner
      } : null,
      
      // Event details
      event: {
        date: eventData.event_date,
        time: eventData.event_time,
        venue: eventData.venue
      },
      
      // Metadata
      generated: new Date().toISOString(),
      version: '2.1' // Updated version for faculty support
    };

    
    
    
    return qrData;
  }

  /**
   * Get team members formatted for QR code with complete information
   * @param {Object} registrationData - Registration data
   * @returns {Array} Team members with attendance tracking info
   */
  getTeamMembersForQR(registrationData) {
    const teamMembers = this.getTeamMembers(registrationData);
    
    // Format members for scanner interface
    return teamMembers.map((member, index) => ({
      id: `member_${index + 1}`,
      name: member.name || member.full_name,
      enrollment: member.enrollment_no,
      department: this.getDepartment(member),
      email: member.email,
      phone: member.phone,
      year: member.year || member.semester,
      // Default attendance status - will be updated by scanner
      attendance_status: 'pending',
      marked_at: null,
      marked_by: null
    }));
  }

  // Remove the generateTeamQRCodes method as we're using single QR per team now

  /**
   * Generate team ID for grouping team members
   * @param {Object} registrationData - Registration data
   * @param {Object} eventData - Event data
   * @returns {string} Team ID
   */
  generateTeamId(registrationData, eventData) {
    // First check if we already have a team registration ID
    if (registrationData.team_registration_id) {
      return registrationData.team_registration_id;
    }
    
    // Otherwise generate one
    const eventId = eventData.event_id || eventData.id || 'EVENT';
    const teamName = (registrationData.team_name || registrationData.student_data?.team_name || 'TEAM')
      .replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const leaderId = (registrationData.enrollment_no || registrationData.employee_id || registrationData.student_data?.enrollment_no || '000')
      .slice(-6);
    
    return `TEAM_${eventId}_${teamName}_${leaderId}`;
  }

  /**
   * Generate QR code as data URL
   * @param {Object} qrData - QR data object
   * @param {Object} options - QR generation options
   * @returns {Promise<string>} Base64 data URL
   */
  async generateQRCode(qrData, options = {}) {
    console.log('generateQRCode: Starting QR code generation...');
    console.log('generateQRCode: QR data received:', qrData);
    console.log('generateQRCode: Options received:', options);
    
    const defaultOptions = {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 256
    };

    const qrOptions = { ...defaultOptions, ...options };
    const qrString = JSON.stringify(qrData);

    console.log('generateQRCode: QR string length:', qrString.length);
    console.log('generateQRCode: Final options:', qrOptions);

    try {
      console.log('generateQRCode: Calling QRCode.toDataURL...');
      const qrCodeDataURL = await QRCode.toDataURL(qrString, qrOptions);
      console.log('generateQRCode: Successfully generated QR code URL');
      return qrCodeDataURL;
    } catch (error) {
      console.error('generateQRCode: Error generating QR code:', error);
      console.error('generateQRCode: Error stack:', error.stack);
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }
  }

  /**
   * Generate QR code for attendance scanner apps
   * @param {Object} registrationData - Registration details
   * @param {Object} eventData - Event details
   * @returns {Promise<string>} QR code data URL
   */
  async generateAttendanceQR(registrationData, eventData) {
    const qrData = await this.generateQRData(registrationData, eventData);
    return await this.generateQRCode(qrData);
  }

  /**
   * Generate high-resolution QR code for download
   * @param {Object} registrationData - Registration details
   * @param {Object} eventData - Event details
   * @returns {Promise<string>} High-res QR code data URL
   */
  async generateDownloadableQR(registrationData, eventData) {
    const qrData = await this.generateQRData(registrationData, eventData);
    const options = {
      width: 512,
      quality: 1.0,
      margin: 2
    };
    return await this.generateQRCode(qrData, options);
  }

  /**
   * Download QR code as PNG file
   * @param {string} qrCodeDataURL - QR code data URL
   * @param {string} filename - File name for download
   */
  downloadQRCode(qrCodeDataURL, filename) {
    const link = document.createElement('a');
    link.href = qrCodeDataURL;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Generate filename for QR code download
   * @param {Object} registrationData - Registration details
   * @param {Object} eventData - Event details
   * @returns {string} Generated filename
   */
  generateFilename(registrationData, eventData) {
    const regId = registrationData.registration_id || registrationData.registrar_id;
    const eventName = (eventData.event_name || eventData.title || eventData.name || 'Event')
      .replace(/[^a-zA-Z0-9]/g, '_');
    const userName = (registrationData.full_name || registrationData.student_data?.full_name || 'User')
      .replace(/[^a-zA-Z0-9]/g, '_');
    const userType = registrationData.employee_id ? 'Faculty' : 'Student';
    
    return `QR_${eventName}_${userType}_${userName}_${regId}.png`;
  }

  /**
   * Utility: Get department from various possible data structures
   * @param {Object} data - Data object
   * @returns {string} Department name
   */
  getDepartment(data) {
    return data?.department || 
           data?.student_data?.department ||
           data?.dept ||
           data?.branch ||
           'N/A';
  }

  /**
   * Utility: Get team members from registration data
   * @param {Object} registrationData - Registration data
   * @returns {Array} Team members array
   */
  getTeamMembers(registrationData) {
    if (registrationData.team_members) return registrationData.team_members;
    if (registrationData.student_data?.team_members) return registrationData.student_data.team_members;
    if (registrationData.team_info?.participants) return registrationData.team_info.participants;
    return [];
  }

  /**
   * Utility: Calculate team size including leader
   * @param {Object} registrationData - Registration data
   * @returns {number} Total team size
   */
  calculateTeamSize(registrationData) {
    const teamMembers = this.getTeamMembers(registrationData);
    return teamMembers.length + 1; // +1 for team leader
  }

  /**
   * Parse QR code data (for scanner applications)
   * @param {string} qrString - QR code string content
   * @returns {Object|null} Parsed QR data or null if invalid
   */
  parseQRData(qrString) {
    try {
      console.log('📋 Parsing QR string:', qrString);
      const qrData = JSON.parse(qrString);
      console.log('📋 Parsed JSON:', qrData);
      
      // Validate QR data structure - accept multiple formats
      const hasRegistrationId = qrData.reg_id || qrData.registration_id;
      const hasEventId = qrData.event_id;
      const hasUserData = qrData.student || qrData.user || qrData.leader;
      
      console.log('Validation:', { hasRegistrationId, hasEventId, hasUserData });
      
      if (!hasRegistrationId || !hasEventId || !hasUserData) {
        console.warn('❌ QR validation failed - missing required fields');
        return null;
      }
      
      console.log('✅ QR data is valid');
      return qrData;
    } catch (error) {
      console.error('❌ Failed to parse QR data:', error.message);
      return null;
    }
  }

  /**
   * Validate QR code data integrity
   * @param {Object} qrData - Parsed QR data
   * @returns {boolean} True if valid
   */
  validateQRData(qrData) {
    if (!qrData) return false;
    
    // Simplified validation - just check essential fields
    const requiredFields = ['reg_id', 'event_id', 'student', 'generated', 'version'];
    
    return requiredFields.every(field => 
      qrData.hasOwnProperty(field) && qrData[field]
    );
  }

  /**
   * Generate QR code with custom styling (for branded QR codes)
   * @param {Object} qrData - QR data object
   * @param {Object} styleOptions - Custom styling options
   * @returns {Promise<string>} Styled QR code data URL
   */
  async generateStyledQRCode(qrData, styleOptions = {}) {
    const defaultStyle = {
      errorCorrectionLevel: 'H', // High error correction for styling
      width: 300,
      margin: 2,
      color: {
        dark: styleOptions.primaryColor || '#1f2937',
        light: styleOptions.backgroundColor || '#ffffff'
      }
    };

    const finalOptions = { ...defaultStyle, ...styleOptions };
    return await this.generateQRCode(qrData, finalOptions);
  }

  /**
   * Utility: Get department from various possible data structures
   * @param {Object} data - Data object
   * @returns {string} Department name
   */
  getDepartment(data) {
    return data?.department || 
           data?.student_data?.department || 
           data?.student?.department || 
           'N/A';
  }

  /**
   * Utility: Get team members from registration data
   * @param {Object} registrationData - Registration data
   * @returns {Array} Team members array
   */
  getTeamMembers(registrationData) {
    
    
    // Handle different possible structures for team members
    let members = [];
    
    // Check various possible structures
    if (registrationData.team_members && Array.isArray(registrationData.team_members)) {
      members = registrationData.team_members;
    } else if (registrationData.student_data?.team_members && Array.isArray(registrationData.student_data.team_members)) {
      members = registrationData.student_data.team_members;
    } else if (registrationData.members && Array.isArray(registrationData.members)) {
      members = registrationData.members;
    }
    
    
    
    // If we have enhanced team member data, use it directly (includes leader)
    if (members && members.length > 0 && members[0].enrollment_no) {
      
      return members;
    }
    
    // Fallback: Always include the team leader/registrant as first member if not already included
    const leaderData = {
      name: registrationData.full_name || registrationData.student_data?.full_name || 'Team Leader',
      enrollment_no: registrationData.enrollment_no || registrationData.student_data?.enrollment_no,
      department: this.getDepartment(registrationData),
      email: registrationData.email || registrationData.student_data?.email,
      is_leader: true
    };
    
    
    
    // Check if leader is already in the members array
    const leaderExists = members.some(member => 
      member.enrollment_no === leaderData.enrollment_no ||
      member.enrollment === leaderData.enrollment_no ||
      member.student?.enrollment_no === leaderData.enrollment_no
    );
    
    if (!leaderExists && leaderData.name && leaderData.enrollment_no) {
      members = [leaderData, ...members];
    }
    
    
    return members;
  }

  /**
   * Utility: Calculate team size including leader
   * @param {Object} registrationData - Registration data
   * @returns {number} Total team size
   */
  calculateTeamSize(registrationData) {
    const members = this.getTeamMembers(registrationData);
    return members.length;
  }
}

// Export singleton instance
export const qrCodeService = new QRCodeService();
export default qrCodeService;
