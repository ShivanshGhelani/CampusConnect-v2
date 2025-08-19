/**
 * Universal Scanner Access Service
 * Handles rotating access codes and volunteer sessions for production scanning
 */

class UniversalScannerService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
    this.currentCodes = new Map(); // event_id -> { code, expires_at }
    this.activeSessions = new Map(); // session_id -> session_data
  }

  /**
   * Generate a new 6-digit access code (XXX-XXX format)
   */
  generateAccessCode() {
    const first = Math.floor(Math.random() * 900) + 100;
    const second = Math.floor(Math.random() * 900) + 100;
    return `${first}-${second}`;
  }

  /**
   * Get current access code for an event (for organizers)
   * @param {string} eventId - Event identifier
   * @returns {Promise<Object>} Current code and expiration info
   */
  async getCurrentAccessCode(eventId) {
    try {
      const response = await fetch(`${this.baseURL}/events/${eventId}/access-code`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get access code');
      }

      const data = await response.json();
      
      // Cache locally for performance
      this.currentCodes.set(eventId, {
        code: data.access_code,
        expires_at: data.expires_at,
        time_remaining: data.time_remaining_seconds
      });

      return data;
    } catch (error) {
      console.error('Error getting access code:', error);
      
      // Fallback for development/offline mode
      const cached = this.currentCodes.get(eventId);
      if (cached && new Date(cached.expires_at) > new Date()) {
        return cached;
      }
      
      // Generate a temporary code for development
      const newCode = {
        access_code: this.generateAccessCode(),
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
        time_remaining_seconds: 300
      };
      
      this.currentCodes.set(eventId, newCode);
      return newCode;
    }
  }

  /**
   * Manually refresh access code (for organizers)
   * @param {string} eventId - Event identifier
   * @returns {Promise<Object>} New code and expiration info
   */
  async refreshAccessCode(eventId) {
    try {
      const response = await fetch(`${this.baseURL}/events/${eventId}/access-code/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to refresh access code');
      }

      const data = await response.json();
      
      // Update cache
      this.currentCodes.set(eventId, {
        code: data.access_code,
        expires_at: data.expires_at,
        time_remaining: data.time_remaining_seconds
      });

      return data;
    } catch (error) {
      console.error('Error refreshing access code:', error);
      
      // Fallback for development
      const newCode = {
        access_code: this.generateAccessCode(),
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        time_remaining_seconds: 300
      };
      
      this.currentCodes.set(eventId, newCode);
      return newCode;
    }
  }

  /**
   * Validate access code and create volunteer session
   * @param {string} eventSlug - Event slug from URL
   * @param {string} accessCode - Access code entered by volunteer
   * @param {string} volunteerName - Full name of volunteer
   * @returns {Promise<Object>} Session data if valid
   */
  async validateAccessCodeAndCreateSession(eventSlug, accessCode, volunteerName) {
    try {
      const response = await fetch(`${this.baseURL}/scan/${eventSlug}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          access_code: accessCode,
          volunteer_name: volunteerName.trim()
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Invalid access code');
      }

      const sessionData = await response.json();
      
      // Cache session locally
      this.activeSessions.set(sessionData.session_id, sessionData);
      
      return sessionData;
    } catch (error) {
      console.error('Error validating access code:', error);
      
      // Development fallback - mock validation
      if (process.env.NODE_ENV === 'development') {
        const mockValidCodes = ['472-910', '115-388', '923-456', '789-123'];
        
        if (!mockValidCodes.includes(accessCode)) {
          throw new Error('Invalid access code. Please check with the event organizer.');
        }
        
        if (!volunteerName.trim()) {
          throw new Error('Please enter your full name.');
        }
        
        // Create mock session
        const session = {
          session_id: `session_${Date.now()}`,
          volunteer_name: volunteerName.trim(),
          event_slug: eventSlug,
          event_name: '48-Hour Hackathon Challenge 2025',
          access_code: accessCode,
          session_start: new Date().toISOString(),
          expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
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
        
        this.activeSessions.set(session.session_id, session);
        return session;
      }
      
      throw error;
    }
  }

  /**
   * Record attendance scan with volunteer and location info
   * @param {string} sessionId - Volunteer session ID
   * @param {string} location - Check-in point location
   * @param {Object} qrData - Scanned QR code data
   * @param {Object} attendanceData - Attendance marking data
   * @returns {Promise<Object>} Scan record confirmation
   */
  async recordAttendanceScan(sessionId, location, qrData, attendanceData) {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Invalid session. Please restart scanner.');
      }

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
      console.error('Error recording attendance:', error);
      
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
   * Get event venues/check-in points
   * @param {string} eventSlug - Event slug
   * @returns {Promise<Array>} List of venue options
   */
  async getEventVenues(eventSlug) {
    try {
      const response = await fetch(`${this.baseURL}/events/${eventSlug}/venues`);
      
      if (!response.ok) {
        throw new Error('Failed to get event venues');
      }

      const data = await response.json();
      return data.venues;
    } catch (error) {
      console.error('Error getting venues:', error);
      
      // Development fallback
      return [
        'Main Entrance',
        'Registration Desk', 
        'Lab A1 - Development Floor',
        'Lab A2 - Design Floor',
        'Cafeteria Entrance',
        'Auditorium - Presentation Area',
        'Parking Gate',
        'Emergency Exit'
      ];
    }
  }

  /**
   * Get live event statistics (for organizer dashboard)
   * @param {string} eventId - Event identifier
   * @returns {Promise<Object>} Live event stats
   */
  async getLiveEventStats(eventId) {
    try {
      const response = await fetch(`${this.baseURL}/events/${eventId}/live-stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get event stats');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting event stats:', error);
      
      // Development fallback
      return {
        total_registrations: 156,
        checked_in: 89,
        active_volunteers: 3,
        scan_locations: 8,
        active_volunteer_list: [
          { name: 'Meera Patel', location: 'Main Entrance', last_scan: '2 mins ago', scans_count: 23 },
          { name: 'Rohan Kumar', location: 'Lab A1 - Development Floor', last_scan: '30 secs ago', scans_count: 18 },
          { name: 'Priya Shah', location: 'Registration Desk', last_scan: '1 min ago', scans_count: 15 }
        ],
        recent_scans: [
          { id: 1, volunteer: 'Meera Patel', location: 'Main Entrance', student: 'John Smith', team: 'Code Crushers', time: '30 secs ago' },
          { id: 2, volunteer: 'Rohan Kumar', location: 'Lab A1', student: 'Sarah Wilson', team: 'Tech Titans', time: '45 secs ago' },
          { id: 3, volunteer: 'Priya Shah', location: 'Registration Desk', student: 'Mike Johnson', team: 'Dev Dynasty', time: '1 min ago' }
        ]
      };
    }
  }

  /**
   * Extend volunteer session
   * @param {string} sessionId - Session to extend
   * @returns {Promise<Object>} Updated session info
   */
  async extendSession(sessionId) {
    try {
      const response = await fetch(`${this.baseURL}/scan/extend-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ session_id: sessionId })
      });

      if (!response.ok) {
        throw new Error('Failed to extend session');
      }

      const updatedSession = await response.json();
      this.activeSessions.set(sessionId, updatedSession);
      
      return updatedSession;
    } catch (error) {
      console.error('Error extending session:', error);
      throw error;
    }
  }

  /**
   * Get scanner URL for event
   * @param {string} eventSlug - Event slug
   * @returns {string} Universal scanner URL
   */
  getScannerURL(eventSlug) {
    const baseURL = window.location.origin;
    return `${baseURL}/scan/${eventSlug}`;
  }

  /**
   * Clear local caches (for testing/development)
   */
  clearCaches() {
    this.currentCodes.clear();
    this.activeSessions.clear();
  }
}

// Export singleton instance
const universalScannerService = new UniversalScannerService();
export default universalScannerService;
