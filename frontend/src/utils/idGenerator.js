/**
 * ID Generator Utilities for CampusConnect
 * Phase 1: Complete client-side ID generation system
 * 
 * Replaces backend ID generation APIs with optimized client-side alternatives.
 * Supports all CampusConnect entity types with proper prefixes and validation.
 */

// ===========================
// CONFIGURATION & CONSTANTS
// ===========================

const ID_PREFIXES = {
  // Core Registration IDs
  REGISTRATION: 'REG',
  TEAM_REGISTRATION: 'TEAM', 
  TEMP_REGISTRATION: 'TREG',
  TEMP_TEAM: 'TTEAM',
  
  // Event Management IDs
  EVENT: 'EVT',
  TEMP_EVENT: 'TEVT',
  
  // Attendance Tracking IDs
  ATTENDANCE: 'ATT',
  VIRTUAL_ATTENDANCE: 'VATT',
  PHYSICAL_ATTENDANCE: 'PATT',
  TEMP_ATTENDANCE: 'TATT',
  TEMP_VIRTUAL_ATTENDANCE: 'TVATT',
  TEMP_PHYSICAL_ATTENDANCE: 'TPATT',
  
  // Certificate IDs
  CERTIFICATE: 'CERT',
  TEMP_CERTIFICATE: 'TCERT',
  
  // User Management IDs
  STUDENT: 'STU',
  FACULTY: 'FAC',
  ADMIN: 'ADM',
  TEMP_ADMIN: 'TADM',
  
  // System IDs
  SESSION: 'SESS',
  FEEDBACK: 'FB',
  TEMP_FEEDBACK: 'TFB',
  PAYMENT: 'PAY',
  TEMP_PAYMENT: 'TPAY',
  NOTIFICATION: 'NOT',
  TEMP_NOTIFICATION: 'TNOT',
  AUDIT: 'AUD',
  TEMP_AUDIT: 'TAUD',
  
  // Participant IDs for complex forms
  PARTICIPANT: 'PART',
  TEMP_PARTICIPANT: 'TPART'
};

const ID_LENGTHS = {
  REGISTRATION: 12,
  TEAM_REGISTRATION: 14,
  EVENT: 10,
  ATTENDANCE: 15,
  CERTIFICATE: 16,
  FEEDBACK: 10,
  ADMIN: 12,
  PAYMENT: 14,
  NOTIFICATION: 12,
  AUDIT: 14,
  SESSION: 20,
  PARTICIPANT: 10
};

// ===========================
// CORE ID GENERATION ENGINE
// ===========================

class IDGenerator {
  constructor() {
    this.cache = new Map();
    this.sessionData = this.loadSessionData();
  }

  /**
   * Generate a simple hash from input string (frontend-optimized)
   */
  simpleHash(input) {
    let hash = 0;
    if (input.length === 0) return hash.toString(36);
    
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36).toUpperCase().substring(0, 6);
  }

  /**
   * Generate timestamp-based component
   */
  generateTimestamp() {
    return Date.now().toString(36).toUpperCase().substring(-6);
  }

  /**
   * Generate random component
   */
  generateRandom(length = 4) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Ensure ID is unique by checking cache
   */
  ensureUnique(baseId, prefix) {
    let uniqueId = baseId;
    let counter = 1;
    
    while (this.cache.has(uniqueId)) {
      const suffix = counter.toString().padStart(2, '0');
      uniqueId = baseId.substring(0, baseId.length - 2) + suffix;
      counter++;
      
      if (counter > 99) {
        // Fallback: regenerate with new timestamp
        const newTimestamp = this.generateTimestamp();
        uniqueId = prefix + newTimestamp + this.generateRandom(2);
        break;
      }
    }
    
    this.cache.set(uniqueId, Date.now());
    return uniqueId;
  }

  /**
   * Clean old cache entries (LRU-style cleanup)
   */
  cleanCache() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [id, timestamp] of this.cache.entries()) {
      if (now - timestamp > maxAge) {
        this.cache.delete(id);
      }
    }
  }

  /**
   * Load session data from localStorage
   */
  loadSessionData() {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem('campusconnect_id_session');
        return data ? JSON.parse(data) : {};
      }
    } catch (error) {
      console.warn('Failed to load ID session data:', error.message);
    }
    return {};
  }

  /**
   * Save session data to localStorage
   */
  saveSessionData() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('campusconnect_id_session', JSON.stringify(this.sessionData));
      }
    } catch (error) {
      console.warn('Failed to save ID session data:', error.message);
    }
  }
}

// ===========================
// SPECIFIC ID GENERATORS
// ===========================

class SpecificIDGenerators extends IDGenerator {

  /**
   * Generate Registration ID
   * Format: REG + hash(enrollment+event+name) + timestamp
   */
  generateRegistrationId(enrollment, eventName, participantName) {
    const prefix = ID_PREFIXES.REGISTRATION;
    const hashInput = `${enrollment}${eventName}${participantName}`.toLowerCase();
    const hash = this.simpleHash(hashInput);
    const timestamp = this.generateTimestamp();
    const baseId = prefix + hash + timestamp;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.REGISTRATION), prefix);
  }

  /**
   * Generate Temporary Registration ID (for forms)
   */
  generateTempRegistrationId(enrollment, eventName, participantName) {
    const prefix = ID_PREFIXES.TEMP_REGISTRATION;
    const hash = this.simpleHash(`${enrollment}${eventName}${participantName}`);
    const random = this.generateRandom(3);
    const baseId = prefix + hash + random;
    
    const id = this.ensureUnique(baseId.substring(0, ID_LENGTHS.REGISTRATION), prefix);
    
    // Store in session for form persistence
    this.sessionData[id] = {
      type: 'temp_registration',
      enrollment,
      eventName,
      participantName,
      created: Date.now()
    };
    this.saveSessionData();
    
    return id;
  }

  /**
   * Generate Team Registration ID
   */
  generateTeamRegistrationId(teamName, eventName, leaderEnrollment) {
    const prefix = ID_PREFIXES.TEAM_REGISTRATION;
    const hashInput = `${teamName}${eventName}${leaderEnrollment}`.toLowerCase();
    const hash = this.simpleHash(hashInput);
    const timestamp = this.generateTimestamp();
    const baseId = prefix + hash + timestamp;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.TEAM_REGISTRATION), prefix);
  }

  /**
   * Generate Temporary Team ID
   */
  generateTempTeamId(teamName, eventName, leaderEnrollment) {
    const prefix = ID_PREFIXES.TEMP_TEAM;
    const hash = this.simpleHash(`${teamName}${eventName}${leaderEnrollment}`);
    const random = this.generateRandom(3);
    const baseId = prefix + hash + random;
    
    const id = this.ensureUnique(baseId.substring(0, ID_LENGTHS.TEAM_REGISTRATION), prefix);
    
    this.sessionData[id] = {
      type: 'temp_team',
      teamName,
      eventName,
      leaderEnrollment,
      created: Date.now()
    };
    this.saveSessionData();
    
    return id;
  }

  /**
   * Generate Event ID
   */
  generateEventId(eventName, department, organizerInfo) {
    const prefix = ID_PREFIXES.EVENT;
    const hashInput = `${eventName}${department}${organizerInfo}`.toLowerCase();
    const hash = this.simpleHash(hashInput);
    const timestamp = this.generateTimestamp();
    const baseId = prefix + hash + timestamp;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.EVENT), prefix);
  }

  /**
   * Generate Temporary Event ID
   */
  generateTempEventId(eventName, department = '', organizerInfo = '') {
    const prefix = ID_PREFIXES.TEMP_EVENT;
    const hash = this.simpleHash(`${eventName}${department}${organizerInfo}`);
    const random = this.generateRandom(2);
    const baseId = prefix + hash + random;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.EVENT), prefix);
  }

  /**
   * Generate Attendance ID (Regular)
   */
  generateAttendanceId(registrationId, eventId, attendanceType = 'regular') {
    const prefix = ID_PREFIXES.ATTENDANCE;
    const hash = this.simpleHash(`${registrationId}${eventId}${attendanceType}`);
    const timestamp = this.generateTimestamp();
    const random = this.generateRandom(2);
    const baseId = prefix + hash + timestamp + random;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.ATTENDANCE), prefix);
  }

  /**
   * Generate Virtual Attendance ID
   */
  generateVirtualAttendanceId(registrationId, eventId, sessionInfo) {
    const prefix = ID_PREFIXES.VIRTUAL_ATTENDANCE;
    const hash = this.simpleHash(`${registrationId}${eventId}${sessionInfo}`);
    const timestamp = this.generateTimestamp();
    const baseId = prefix + hash + timestamp;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.ATTENDANCE), prefix);
  }

  /**
   * Generate Physical Attendance ID
   */
  generatePhysicalAttendanceId(registrationId, eventId, venueInfo) {
    const prefix = ID_PREFIXES.PHYSICAL_ATTENDANCE;
    const hash = this.simpleHash(`${registrationId}${eventId}${venueInfo}`);
    const timestamp = this.generateTimestamp();
    const baseId = prefix + hash + timestamp;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.ATTENDANCE), prefix);
  }

  /**
   * Generate Temporary Attendance IDs
   */
  generateTempAttendanceId(registrationId, eventId) {
    const prefix = ID_PREFIXES.TEMP_ATTENDANCE;
    const hash = this.simpleHash(`${registrationId}${eventId}`);
    const random = this.generateRandom(3);
    const baseId = prefix + hash + random;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.ATTENDANCE), prefix);
  }

  generateTempVirtualAttendanceId(registrationId, eventId) {
    const prefix = ID_PREFIXES.TEMP_VIRTUAL_ATTENDANCE;
    const hash = this.simpleHash(`${registrationId}${eventId}virtual`);
    const random = this.generateRandom(2);
    const baseId = prefix + hash + random;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.ATTENDANCE), prefix);
  }

  generateTempPhysicalAttendanceId(registrationId, eventId) {
    const prefix = ID_PREFIXES.TEMP_PHYSICAL_ATTENDANCE;
    const hash = this.simpleHash(`${registrationId}${eventId}physical`);
    const random = this.generateRandom(2);
    const baseId = prefix + hash + random;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.ATTENDANCE), prefix);
  }

  /**
   * Generate Certificate ID
   */
  generateCertificateId(enrollment, eventName, participantName) {
    const prefix = ID_PREFIXES.CERTIFICATE;
    const hashInput = `${enrollment}${eventName}${participantName}`.toLowerCase();
    const hash = this.simpleHash(hashInput);
    const timestamp = this.generateTimestamp();
    const random = this.generateRandom(2);
    const baseId = prefix + hash + timestamp + random;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.CERTIFICATE), prefix);
  }

  /**
   * Generate Temporary Certificate ID
   */
  generateTempCertificateId(enrollment, eventName, participantName) {
    const prefix = ID_PREFIXES.TEMP_CERTIFICATE;
    const hash = this.simpleHash(`${enrollment}${eventName}${participantName}`);
    const random = this.generateRandom(3);
    const baseId = prefix + hash + random;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.CERTIFICATE), prefix);
  }

  /**
   * Generate Feedback ID
   */
  generateFeedbackId(enrollment, eventId) {
    const prefix = ID_PREFIXES.FEEDBACK;
    const hash = this.simpleHash(`${enrollment}${eventId}`);
    const timestamp = this.generateTimestamp();
    const baseId = prefix + hash + timestamp;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.FEEDBACK), prefix);
  }

  /**
   * Generate Temporary Feedback ID
   */
  generateTempFeedbackId(enrollment, eventId) {
    const prefix = ID_PREFIXES.TEMP_FEEDBACK;
    const hash = this.simpleHash(`${enrollment}${eventId}`);
    const random = this.generateRandom(2);
    const baseId = prefix + hash + random;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.FEEDBACK), prefix);
  }

  /**
   * Generate Admin ID
   */
  generateAdminId(username, role = 'admin') {
    const prefix = ID_PREFIXES.ADMIN;
    const hash = this.simpleHash(`${username}${role}`);
    const timestamp = this.generateTimestamp();
    const baseId = prefix + hash + timestamp;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.ADMIN), prefix);
  }

  /**
   * Generate Temporary Admin ID
   */
  generateTempAdminId(username, role = 'admin') {
    const prefix = ID_PREFIXES.TEMP_ADMIN;
    const hash = this.simpleHash(`${username}${role}`);
    const random = this.generateRandom(2);
    const baseId = prefix + hash + random;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.ADMIN), prefix);
  }

  /**
   * Generate Payment ID
   */
  generatePaymentId(registrationId, amount, paymentMethod) {
    const prefix = ID_PREFIXES.PAYMENT;
    const hash = this.simpleHash(`${registrationId}${amount}${paymentMethod}`);
    const timestamp = this.generateTimestamp();
    const random = this.generateRandom(2);
    const baseId = prefix + hash + timestamp + random;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.PAYMENT), prefix);
  }

  /**
   * Generate Temporary Payment ID
   */
  generateTempPaymentId(registrationId, amount) {
    const prefix = ID_PREFIXES.TEMP_PAYMENT;
    const hash = this.simpleHash(`${registrationId}${amount}`);
    const random = this.generateRandom(3);
    const baseId = prefix + hash + random;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.PAYMENT), prefix);
  }

  /**
   * Generate Notification ID
   */
  generateNotificationId(userId, notificationType, content) {
    const prefix = ID_PREFIXES.NOTIFICATION;
    const hash = this.simpleHash(`${userId}${notificationType}${content}`);
    const timestamp = this.generateTimestamp();
    const baseId = prefix + hash + timestamp;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.NOTIFICATION), prefix);
  }

  /**
   * Generate Temporary Notification ID
   */
  generateTempNotificationId(userId, notificationType) {
    const prefix = ID_PREFIXES.TEMP_NOTIFICATION;
    const hash = this.simpleHash(`${userId}${notificationType}`);
    const random = this.generateRandom(2);
    const baseId = prefix + hash + random;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.NOTIFICATION), prefix);
  }

  /**
   * Generate Audit Log ID
   */
  generateAuditId(userId, action, resource) {
    const prefix = ID_PREFIXES.AUDIT;
    const hash = this.simpleHash(`${userId}${action}${resource}`);
    const timestamp = this.generateTimestamp();
    const random = this.generateRandom(2);
    const baseId = prefix + hash + timestamp + random;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.AUDIT), prefix);
  }

  /**
   * Generate Temporary Audit ID
   */
  generateTempAuditId(userId, action) {
    const prefix = ID_PREFIXES.TEMP_AUDIT;
    const hash = this.simpleHash(`${userId}${action}`);
    const random = this.generateRandom(3);
    const baseId = prefix + hash + random;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.AUDIT), prefix);
  }

  /**
   * Generate Session ID
   */
  generateSessionId(userId = null) {
    const prefix = ID_PREFIXES.SESSION;
    const userComponent = userId ? this.simpleHash(userId) : this.generateRandom(6);
    const timestamp = this.generateTimestamp();
    const random = this.generateRandom(6);
    const baseId = prefix + userComponent + timestamp + random;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.SESSION), prefix);
  }

  /**
   * Generate Participant ID (for complex forms)
   */
  generateParticipantId(index, formType = 'event') {
    const prefix = ID_PREFIXES.PARTICIPANT;
    const hash = this.simpleHash(`${formType}${index}${Date.now()}`);
    const random = this.generateRandom(2);
    const baseId = prefix + hash + random;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.PARTICIPANT), prefix);
  }

  /**
   * Generate Temporary Participant ID
   */
  generateTempParticipantId(index, formType = 'event') {
    const prefix = ID_PREFIXES.TEMP_PARTICIPANT;
    const hash = this.simpleHash(`${formType}${index}`);
    const random = this.generateRandom(2);
    const baseId = prefix + hash + random;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.PARTICIPANT), prefix);
  }
}

// ===========================
// BULK ID GENERATION
// ===========================

class BulkIDGenerator extends SpecificIDGenerators {

  /**
   * Generate multiple registration IDs in batch
   */
  generateBulkRegistrationIds(participants, eventName) {
    const ids = [];
    participants.forEach((participant, index) => {
      const id = this.generateTempRegistrationId(
        participant.enrollment || `BULK${index}`,
        eventName,
        participant.name || `Participant${index}`
      );
      ids.push(id);
    });
    return ids;
  }

  /**
   * Generate multiple participant IDs for team events
   */
  generateBulkParticipantIds(count, formType = 'team') {
    const ids = [];
    for (let i = 0; i < count; i++) {
      const id = this.generateTempParticipantId(i + 1, formType);
      ids.push(id);
    }
    return ids;
  }

  /**
   * Generate multiple attendance IDs
   */
  generateBulkAttendanceIds(registrationIds, eventId, attendanceType = 'regular') {
    const ids = [];
    registrationIds.forEach(regId => {
      const id = this.generateTempAttendanceId(regId, eventId);
      ids.push(id);
    });
    return ids;
  }

  /**
   * Generate multiple certificate IDs
   */
  generateBulkCertificateIds(participants, eventName) {
    const ids = [];
    participants.forEach(participant => {
      const id = this.generateTempCertificateId(
        participant.enrollment,
        eventName,
        participant.name
      );
      ids.push(id);
    });
    return ids;
  }
}

// ===========================
// ID VALIDATION SYSTEM
// ===========================

class IDValidators {

  /**
   * Validate ID format based on prefix
   */
  static validateIdFormat(id) {
    if (!id || typeof id !== 'string') {
      return { valid: false, error: 'ID must be a non-empty string' };
    }

    // Check if ID has a valid prefix
    const prefix = this.extractPrefix(id);
    if (!Object.values(ID_PREFIXES).includes(prefix)) {
      return { valid: false, error: `Invalid prefix: ${prefix}` };
    }

    // Check minimum length
    if (id.length < 6) {
      return { valid: false, error: 'ID too short' };
    }

    // Check maximum length
    if (id.length > 20) {
      return { valid: false, error: 'ID too long' };
    }

    // Check character set (alphanumeric)
    if (!/^[A-Z0-9]+$/.test(id)) {
      return { valid: false, error: 'ID contains invalid characters' };
    }

    return { valid: true, prefix: prefix };
  }

  /**
   * Extract prefix from ID
   */
  static extractPrefix(id) {
    if (!id) return '';
    
    // Find the longest matching prefix
    const sortedPrefixes = Object.values(ID_PREFIXES).sort((a, b) => b.length - a.length);
    
    for (const prefix of sortedPrefixes) {
      if (id.startsWith(prefix)) {
        return prefix;
      }
    }
    
    return '';
  }

  /**
   * Get ID type from prefix
   */
  static getIdType(id) {
    const prefix = this.extractPrefix(id);
    
    const typeMap = {
      [ID_PREFIXES.REGISTRATION]: 'Registration',
      [ID_PREFIXES.TEMP_REGISTRATION]: 'Temporary Registration',
      [ID_PREFIXES.TEAM_REGISTRATION]: 'Team Registration',
      [ID_PREFIXES.TEMP_TEAM]: 'Temporary Team',
      [ID_PREFIXES.EVENT]: 'Event',
      [ID_PREFIXES.TEMP_EVENT]: 'Temporary Event',
      [ID_PREFIXES.ATTENDANCE]: 'Attendance',
      [ID_PREFIXES.VIRTUAL_ATTENDANCE]: 'Virtual Attendance',
      [ID_PREFIXES.PHYSICAL_ATTENDANCE]: 'Physical Attendance',
      [ID_PREFIXES.TEMP_ATTENDANCE]: 'Temporary Attendance',
      [ID_PREFIXES.CERTIFICATE]: 'Certificate',
      [ID_PREFIXES.TEMP_CERTIFICATE]: 'Temporary Certificate',
      [ID_PREFIXES.FEEDBACK]: 'Feedback',
      [ID_PREFIXES.TEMP_FEEDBACK]: 'Temporary Feedback',
      [ID_PREFIXES.ADMIN]: 'Admin',
      [ID_PREFIXES.TEMP_ADMIN]: 'Temporary Admin',
      [ID_PREFIXES.PAYMENT]: 'Payment',
      [ID_PREFIXES.TEMP_PAYMENT]: 'Temporary Payment',
      [ID_PREFIXES.NOTIFICATION]: 'Notification',
      [ID_PREFIXES.TEMP_NOTIFICATION]: 'Temporary Notification',
      [ID_PREFIXES.AUDIT]: 'Audit Log',
      [ID_PREFIXES.TEMP_AUDIT]: 'Temporary Audit',
      [ID_PREFIXES.SESSION]: 'Session',
      [ID_PREFIXES.PARTICIPANT]: 'Participant',
      [ID_PREFIXES.TEMP_PARTICIPANT]: 'Temporary Participant'
    };

    return typeMap[prefix] || 'Unknown';
  }

  /**
   * Check if ID is temporary
   */
  static isTemporaryId(id) {
    const prefix = this.extractPrefix(id);
    return prefix.startsWith('T');
  }

  /**
   * Get display name for ID
   */
  static getDisplayName(id) {
    const type = this.getIdType(id);
    const isTemp = this.isTemporaryId(id);
    return isTemp ? `${type} (Draft)` : type;
  }
}

// ===========================
// UTILITY FUNCTIONS
// ===========================

const idUtils = {
  /**
   * Extract prefix from ID
   */
  extractPrefix: (id) => IDValidators.extractPrefix(id),

  /**
   * Get ID type
   */
  getIdType: (id) => IDValidators.getIdType(id),

  /**
   * Get display name
   */
  getDisplayName: (id) => IDValidators.getDisplayName(id),

  /**
   * Check if temporary
   */
  isTemporary: (id) => IDValidators.isTemporaryId(id),

  /**
   * Validate ID format
   */
  validate: (id) => IDValidators.validateIdFormat(id)
};

// ===========================
// MAIN INSTANCE AND EXPORTS
// ===========================

// Create singleton instance
const idGenerator = new BulkIDGenerator();

// Clean cache periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    idGenerator.cleanCache();
  }, 60 * 60 * 1000); // Clean every hour
}

// Export individual functions for backward compatibility
const generateTempRegistrationId = (enrollment, eventName, participantName) => 
  idGenerator.generateTempRegistrationId(enrollment, eventName, participantName);

const generateTempTeamId = (teamName, eventName, leaderEnrollment) => 
  idGenerator.generateTempTeamId(teamName, eventName, leaderEnrollment);

const generateTempEventId = (eventName, department, organizerInfo) => 
  idGenerator.generateTempEventId(eventName, department, organizerInfo);

const generateTempAttendanceId = (registrationId, eventId) => 
  idGenerator.generateTempAttendanceId(registrationId, eventId);

const generateTempVirtualAttendanceId = (registrationId, eventId) => 
  idGenerator.generateTempVirtualAttendanceId(registrationId, eventId);

const generateTempPhysicalAttendanceId = (registrationId, eventId) => 
  idGenerator.generateTempPhysicalAttendanceId(registrationId, eventId);

const generateTempCertificateId = (enrollment, eventName, participantName) => 
  idGenerator.generateTempCertificateId(enrollment, eventName, participantName);

const generateTempFeedbackId = (enrollment, eventId) => 
  idGenerator.generateTempFeedbackId(enrollment, eventId);

const generateTempAdminId = (username, role) => 
  idGenerator.generateTempAdminId(username, role);

const generateTempPaymentId = (registrationId, amount) => 
  idGenerator.generateTempPaymentId(registrationId, amount);

const generateTempNotificationId = (userId, notificationType) => 
  idGenerator.generateTempNotificationId(userId, notificationType);

const generateTempAuditId = (userId, action) => 
  idGenerator.generateTempAuditId(userId, action);

const generateSessionId = (userId) => 
  idGenerator.generateSessionId(userId);

const generateTempParticipantId = (index, formType) => 
  idGenerator.generateTempParticipantId(index, formType);

// Bulk generators
const bulkIdGenerator = {
  generateBulkRegistrationIds: (participants, eventName) => 
    idGenerator.generateBulkRegistrationIds(participants, eventName),
  
  generateBulkParticipantIds: (count, formType) => 
    idGenerator.generateBulkParticipantIds(count, formType),
  
  generateBulkAttendanceIds: (registrationIds, eventId, attendanceType) => 
    idGenerator.generateBulkAttendanceIds(registrationIds, eventId, attendanceType),
  
  generateBulkCertificateIds: (participants, eventName) => 
    idGenerator.generateBulkCertificateIds(participants, eventName)
};

// Validators
const idValidators = {
  validateIdFormat: (id) => IDValidators.validateIdFormat(id),
  extractPrefix: (id) => IDValidators.extractPrefix(id),
  getIdType: (id) => IDValidators.getIdType(id),
  isTemporaryId: (id) => IDValidators.isTemporaryId(id),
  getDisplayName: (id) => IDValidators.getDisplayName(id)
};

// ===========================
// EXPORTS
// ===========================

// For ES6 modules
export {
  // Main classes
  IDGenerator,
  SpecificIDGenerators,
  BulkIDGenerator,
  IDValidators,
  
  // Individual generators
  generateTempRegistrationId,
  generateTempTeamId,
  generateTempEventId,
  generateTempAttendanceId,
  generateTempVirtualAttendanceId,
  generateTempPhysicalAttendanceId,
  generateTempCertificateId,
  generateTempFeedbackId,
  generateTempAdminId,
  generateTempPaymentId,
  generateTempNotificationId,
  generateTempAuditId,
  generateSessionId,
  generateTempParticipantId,
  
  // Bulk generators
  bulkIdGenerator,
  
  // Validators and utilities
  idValidators,
  idUtils,
  
  // Constants
  ID_PREFIXES,
  ID_LENGTHS,
  
  // Main instance
  idGenerator
};

// For CommonJS (Node.js)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // Main classes
    IDGenerator,
    SpecificIDGenerators,
    BulkIDGenerator,
    IDValidators,
    
    // Individual generators
    generateTempRegistrationId,
    generateTempTeamId,
    generateTempEventId,
    generateTempAttendanceId,
    generateTempVirtualAttendanceId,
    generateTempPhysicalAttendanceId,
    generateTempCertificateId,
    generateTempFeedbackId,
    generateTempAdminId,
    generateTempPaymentId,
    generateTempNotificationId,
    generateTempAuditId,
    generateSessionId,
    generateTempParticipantId,
    
    // Bulk generators
    bulkIdGenerator,
    
    // Validators and utilities
    idValidators,
    idUtils,
    
    // Constants
    ID_PREFIXES,
    ID_LENGTHS,
    
    // Main instance
    idGenerator
  };
}
