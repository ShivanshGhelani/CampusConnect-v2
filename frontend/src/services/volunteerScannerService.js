import api from '../api/base';

const STORAGE_KEY_PREFIX = 'volunteer_scanner_session_';

class VolunteerScannerService {
  /**
   * Validate invitation code and get event details
   * @param {string} invitationCode - The invitation code from URL
   * @returns {Promise<object>} - Event and invitation details
   */
  async validateInvitation(invitationCode) {
    try {
      const response = await api.get(`/api/scanner/invitation/${invitationCode}/validate`);
      return response.data.data; // Extract nested data
    } catch (error) {
      console.error('Failed to validate invitation:', error);
      throw new Error(error.response?.data?.detail || 'Invalid or expired invitation link');
    }
  }

  /**
   * Create volunteer scanning session
   * @param {string} invitationCode - The invitation code
   * @param {string} volunteerName - Volunteer's full name
   * @param {string} volunteerContact - Volunteer's contact (phone/email)
   * @returns {Promise<object>} - Session data
   */
  async createSession(invitationCode, volunteerName, volunteerContact) {
    try {
      const response = await api.post(`/api/scanner/invitation/${invitationCode}/session`, {
        volunteer_name: volunteerName,
        volunteer_contact: volunteerContact
      });
      return response.data.data || response.data; // Extract nested data if present
    } catch (error) {
      console.error('Failed to create session:', error);
      throw new Error(error.response?.data?.detail || 'Failed to create scanning session');
    }
  }

  /**
   * Fetch full team registration data for minimal QR code
   * @param {string} sessionId - Active session ID
   * @param {string} registrationId - Team registration ID from QR code
   * @returns {Promise<object>} - Full team data with members
   */
  async fetchTeamData(sessionId, registrationId) {
    try {
      const response = await api.get(`/api/scanner/session/${sessionId}/team/${registrationId}`);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Failed to fetch team data:', error);
      
      // Check for event mismatch error
      if (error.response?.status === 403 && error.response?.data?.detail?.error === 'event_mismatch') {
        throw {
          type: 'event_mismatch',
          ...error.response.data.detail
        };
      }
      
      throw new Error(error.response?.data?.detail || 'Failed to fetch team data');
    }
  }

  /**
   * Mark attendance for scanned QR code
   * @param {string} sessionId - Active session ID
   * @param {object} qrData - Decoded QR code data
   * @param {object} attendanceData - Attendance details (who is present)
   * @param {Array<string>} selectedMembers - For teams: enrollment numbers to mark present
   * @returns {Promise<object>} - Attendance record
   */
  async markAttendance(sessionId, qrData, attendanceData, selectedMembers = null) {
    try {
      const payload = {
        qr_data: qrData,
        attendance_data: attendanceData,
        timestamp: new Date().toISOString()
      };
      
      // Add selected members for team registrations
      if (selectedMembers && selectedMembers.length > 0) {
        payload.selected_members = selectedMembers;
      }
      
      const response = await api.post(`/api/scanner/session/${sessionId}/mark`, payload);
      return response.data.data || response.data; // Extract nested data if present
    } catch (error) {
      console.error('Failed to mark attendance:', error);
      
      // Check for event mismatch error
      if (error.response?.status === 403 && error.response?.data?.detail?.error === 'event_mismatch') {
        throw {
          type: 'event_mismatch',
          ...error.response.data.detail
        };
      }
      
      throw new Error(error.response?.data?.detail || 'Failed to mark attendance');
    }
  }

  /**
   * Get session status (check if still valid)
   * @param {string} sessionId - Session ID to check
   * @returns {Promise<object>} - Session status
   */
  async getSessionStatus(sessionId) {
    try {
      const response = await api.get(`/api/scanner/session/${sessionId}/status`);
      return response.data.data || response.data; // Extract nested data if present
    } catch (error) {
      console.error('Failed to get session status:', error);
      throw new Error(error.response?.data?.detail || 'Session expired or invalid');
    }
  }

  /**
   * Store session in localStorage
   * @param {string} invitationCode - The invitation code
   * @param {object} sessionData - Session data to store
   */
  storeSession(invitationCode, sessionData) {
    try {
      const key = STORAGE_KEY_PREFIX + invitationCode;
      localStorage.setItem(key, JSON.stringify({
        ...sessionData,
        stored_at: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Failed to store session:', error);
    }
  }

  /**
   * Get stored session from localStorage
   * @param {string} invitationCode - The invitation code
   * @returns {object|null} - Session data or null
   */
  getStoredSession(invitationCode) {
    try {
      const key = STORAGE_KEY_PREFIX + invitationCode;
      const stored = localStorage.getItem(key);
      
      if (!stored) return null;
      
      const sessionData = JSON.parse(stored);
      
      // Check if session is expired
      const expiresAt = new Date(sessionData.expires_at);
      if (expiresAt < new Date()) {
        this.clearSession(invitationCode);
        return null;
      }
      
      return sessionData;
    } catch (error) {
      console.error('Failed to get stored session:', error);
      return null;
    }
  }

  /**
   * Clear stored session from localStorage
   * @param {string} invitationCode - The invitation code
   */
  clearSession(invitationCode) {
    try {
      const key = STORAGE_KEY_PREFIX + invitationCode;
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  /**
   * Clear all expired sessions from localStorage
   */
  clearExpiredSessions() {
    try {
      const now = new Date();
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(STORAGE_KEY_PREFIX)) {
          try {
            const sessionData = JSON.parse(localStorage.getItem(key));
            const expiresAt = new Date(sessionData.expires_at);
            if (expiresAt < now) {
              localStorage.removeItem(key);
            }
          } catch (e) {
            // Invalid data, remove it
            localStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      console.error('Failed to clear expired sessions:', error);
    }
  }
}

export default new VolunteerScannerService();
