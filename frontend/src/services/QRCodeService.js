import QRCode from 'qrcode';

/**
 * QR Code Generation Service for Event Registration
 * Handles QR code generation for attendance marking and verification
 */
class QRCodeService {
  constructor() {
    this.baseUrl = import.meta.env.VITE_APP_BASE_URL || 'https://campusconnect.edu';
  }

  /**
   * Generate QR code data object for registration
   * @param {Object} registrationData - Registration details
   * @param {Object} eventData - Event details
   * @param {Object} options - Additional options
   * @returns {Object} QR data object
   */
  generateQRData(registrationData, eventData, options = {}) {
    console.log('=== QR CODE SERVICE DEBUG ===');
    console.log('Registration Data:', registrationData);
    console.log('Registration Data Keys:', Object.keys(registrationData || {}));
    console.log('Event Data:', eventData);
    console.log('Event Data Keys:', Object.keys(eventData || {}));
    console.log('Options:', options);
    
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

    console.log('Generated QR Data:', qrData);
    console.log('============================');
    
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

    try {
      const qrCodeDataURL = await QRCode.toDataURL(qrString, qrOptions);
      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Generate QR code for attendance scanner apps
   * @param {Object} registrationData - Registration details
   * @param {Object} eventData - Event details
   * @returns {Promise<string>} QR code data URL
   */
  async generateAttendanceQR(registrationData, eventData) {
    const qrData = this.generateQRData(registrationData, eventData);
    return await this.generateQRCode(qrData);
  }

  /**
   * Generate high-resolution QR code for download
   * @param {Object} registrationData - Registration details
   * @param {Object} eventData - Event details
   * @returns {Promise<string>} High-res QR code data URL
   */
  async generateDownloadableQR(registrationData, eventData) {
    const qrData = this.generateQRData(registrationData, eventData);
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
      const qrData = JSON.parse(qrString);
      
      // Validate QR data structure - simplified validation
      if (!qrData.reg_id || !qrData.event_id || !qrData.student) {
        console.warn('Invalid QR code - missing required fields');
        return null;
      }
      
      return qrData;
    } catch (error) {
      console.error('Error parsing QR code data:', error);
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
    console.log('Getting team members from registration data:', registrationData);
    
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
    
    console.log('Found team members:', members);
    
    // If we have enhanced team member data, use it directly (includes leader)
    if (members && members.length > 0 && members[0].enrollment_no) {
      console.log('Using enhanced team member data directly');
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
    
    console.log('Leader data:', leaderData);
    
    // Check if leader is already in the members array
    const leaderExists = members.some(member => 
      member.enrollment_no === leaderData.enrollment_no ||
      member.enrollment === leaderData.enrollment_no ||
      member.student?.enrollment_no === leaderData.enrollment_no
    );
    
    if (!leaderExists && leaderData.name && leaderData.enrollment_no) {
      members = [leaderData, ...members];
    }
    
    console.log('Final team members with leader:', members);
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
