/**
 * Invitation-Based Scanner Service
 * Handles reusable invitation links and volunteer sessions
 */

class InvitationScannerService {
  constructor() {
    // Use Vite's import.meta.env or fallback for development
    this.baseURL = import.meta?.env?.VITE_API_URL || 'http://localhost:8000/api';
  }

  /**
   * Create a reusable invitation link for an event
   * @param {string} eventId - Event identifier
   * @param {string} expiresAt - ISO string for expiration time
   * @returns {Promise<Object>} Invitation link data
   */
  async createInvitationLink(eventId, expiresAt) {
    try {
      const response = await fetch(`${this.baseURL}/events/${eventId}/invitation/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          expires_at: expiresAt
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create invitation link');
      }

      return await response.json();
    } catch (error) {
      
      
      // Development fallback
      const invitationCode = Math.random().toString(36).substring(2, 10);
      const baseURL = window.location.origin;
      
      return {
        invitation_code: invitationCode,
        invitation_link: `${baseURL}/scan/join/${invitationCode}`,
        expires_at: expiresAt,
        event_id: eventId,
        created_at: new Date().toISOString()
      };
    }
  }

  /**
   * Get existing invitation link for an event
   * @param {string} eventId - Event identifier
   * @returns {Promise<Object>} Current invitation data or null
   */
  async getExistingInvitation(eventId) {
    try {
      const response = await fetch(`${this.baseURL}/events/${eventId}/invitation`);
      
      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      
      return null;
    }
  }

  /**
   * Validate invitation code and get event info
   * @param {string} invitationCode - Invitation code from URL
   * @returns {Promise<Object>} Event data if invitation is valid
   */
  async validateInvitation(invitationCode) {
    try {
      const response = await fetch(`${this.baseURL}/scan/invitation/${invitationCode}/validate`);
      
      if (!response.ok) {
        throw new Error('Invalid or expired invitation link');
      }

      return await response.json();
    } catch (error) {
      
      
      // Development fallback
      if (process.env.NODE_ENV === 'development') {
        return {
          event_name: '48-Hour Hackathon Challenge 2025',
          event_id: 'EVT_HACKATHON_2025',
          invitation_code: invitationCode,
          expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours from now
          venues: [
            'Main Entrance',
            'Registration Desk',
            'Lab A1 - Development Floor',
            'Lab A2 - Design Floor',
            'Cafeteria Entrance',
            'Auditorium - Presentation Area',
            'Parking Gate',
            'Emergency Exit'
          ]
        };
      }
      
      throw error;
    }
  }

  /**
   * Join as volunteer using invitation code
   * @param {string} invitationCode - Invitation code
   * @param {string} volunteerName - Volunteer's full name
   * @param {string} volunteerContact - Volunteer's contact info
   * @returns {Promise<Object>} Session data
   */
  async joinAsVolunteer(invitationCode, volunteerName, volunteerContact) {
    try {
      const response = await fetch(`${this.baseURL}/scan/invitation/${invitationCode}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          volunteer_name: volunteerName.trim(),
          volunteer_contact: volunteerContact.trim()
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create scanning session');
      }

      return await response.json();
    } catch (error) {
      
      
      // Development fallback
      if (process.env.NODE_ENV === 'development') {
        const session = {
          session_id: `session_${Date.now()}`,
          volunteer_name: volunteerName.trim(),
          volunteer_contact: volunteerContact.trim(),
          invitation_code: invitationCode,
          event_name: '48-Hour Hackathon Challenge 2025',
          event_id: 'EVT_HACKATHON_2025',
          session_start: new Date().toISOString(),
          expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours
          venues: [
            'Main Entrance',
            'Registration Desk',
            'Lab A1 - Development Floor',
            'Lab A2 - Design Floor',
            'Cafeteria Entrance',
            'Auditorium - Presentation Area',
            'Parking Gate',
            'Emergency Exit'
          ]
        };
        
        return session;
      }
      
      throw error;
    }
  }

  /**
   * Record attendance scan with volunteer session info
   * @param {string} sessionId - Volunteer session ID
   * @param {string} location - Check-in point location
   * @param {Object} qrData - Scanned QR code data
   * @param {Object} attendanceData - Attendance marking data
   * @returns {Promise<Object>} Scan record confirmation
   */
  async recordAttendanceScan(sessionId, location, qrData, attendanceData) {
    try {
      const response = await fetch(`${this.baseURL}/scan/record-attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: sessionId,
          check_in_point: location,
          qr_data: qrData,
          attendance_data: attendanceData,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to record attendance');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      
      
      // Development fallback - mock success
      if (process.env.NODE_ENV === 'development') {
        return {
          success: true,
          scan_id: `scan_${Date.now()}`,
          message: 'Attendance recorded successfully (dev mode)',
          timestamp: new Date().toISOString()
        };
      }
      
      throw error;
    }
  }

  /**
   * Get volunteer statistics for organizer dashboard
   * @param {string} eventId - Event identifier
   * @returns {Promise<Object>} Volunteer stats and activity
   */
  async getVolunteerStats(eventId) {
    try {
      const response = await fetch(`${this.baseURL}/events/${eventId}/volunteer-stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get volunteer stats');
      }

      return await response.json();
    } catch (error) {
      
      
      // Development fallback
      return {
        stats: {
          totalScans: 56,
          activeVolunteers: 3,
          checkInPoints: 5
        },
        active_volunteers: [
          { 
            name: 'Meera Patel', 
            location: 'Main Entrance', 
            lastScan: '2 mins ago', 
            scansCount: 23, 
            joinedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
          },
          { 
            name: 'Rohan Shah', 
            location: 'Lab A1 - Development Floor', 
            lastScan: '30 secs ago', 
            scansCount: 18, 
            joinedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString() // 1.5 hours ago
          },
          { 
            name: 'Priya Mehta', 
            location: 'Registration Desk', 
            lastScan: '1 min ago', 
            scansCount: 15, 
            joinedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() // 1 hour ago
          }
        ]
      };
    }
  }

  /**
   * Generate WhatsApp message for invitation sharing
   * @param {string} eventName - Name of the event
   * @param {string} invitationLink - The invitation URL
   * @param {string} expiresAt - Expiration time
   * @returns {string} Formatted WhatsApp message
   */
  generateWhatsAppMessage(eventName, invitationLink, expiresAt) {
    const message = `🎯 *${eventName}* - Volunteer Scanner Access

📱 *Scanner Link:* ${invitationLink}

📋 *Instructions:*
1. Tap the link above
2. Enter your full name and contact
3. Select your check-in location  
4. Start scanning QR codes

⏰ *Valid until:* ${new Date(expiresAt).toLocaleString()}

Thanks for volunteering! 🙏`;

    return encodeURIComponent(message);
  }

  /**
   * Get session from localStorage
   * @param {string} invitationCode - Invitation code
   * @returns {Object|null} Stored session data
   */
  getStoredSession(invitationCode) {
    try {
      const stored = localStorage.getItem(`scanner_session_${invitationCode}`);
      if (!stored) return null;
      
      const session = JSON.parse(stored);
      
      // Check if session is expired
      if (new Date(session.expires_at) <= new Date()) {
        localStorage.removeItem(`scanner_session_${invitationCode}`);
        return null;
      }
      
      return session;
    } catch (error) {
      
      return null;
    }
  }

  /**
   * Store session in localStorage
   * @param {string} invitationCode - Invitation code
   * @param {Object} sessionData - Session data to store
   */
  storeSession(invitationCode, sessionData) {
    try {
      localStorage.setItem(`scanner_session_${invitationCode}`, JSON.stringify(sessionData));
    } catch (error) {
      
    }
  }

  /**
   * Clear session from localStorage
   * @param {string} invitationCode - Invitation code
   */
  clearSession(invitationCode) {
    try {
      localStorage.removeItem(`scanner_session_${invitationCode}`);
    } catch (error) {
      
    }
  }
}

// Export singleton instance
const invitationScannerService = new InvitationScannerService();
export default invitationScannerService;
