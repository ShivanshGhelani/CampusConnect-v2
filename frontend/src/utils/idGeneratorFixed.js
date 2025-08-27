/**
 * Fixed ID Generator Utilities for CampusConnect
 * Complete migration to frontend-only real ID generation
 * 
 * This is a clean version that provides both real and deprecated temp ID functions
 * with proper deprecation warnings.
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
    if (input.length === 0) return hash;
    
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
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
        // Regenerate with new timestamp if too many collisions
        const timestamp = this.generateTimestamp();
        uniqueId = prefix + this.generateRandom(4) + timestamp;
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
      const data = localStorage.getItem('campusconnect_session_ids');
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.warn('Failed to load session data:', error);
      return {};
    }
  }

  /**
   * Save session data to localStorage
   */
  saveSessionData() {
    try {
      localStorage.setItem('campusconnect_session_ids', JSON.stringify(this.sessionData));
    } catch (error) {
      console.warn('Failed to save session data:', error);
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
   * Generate Attendance ID (Regular)
   */
  generateAttendanceId(registrationId, eventId, attendanceType = 'regular') {
    const prefix = ID_PREFIXES.ATTENDANCE;
    const hashInput = `${registrationId}${eventId}${attendanceType}`.toLowerCase();
    const hash = this.simpleHash(hashInput);
    const timestamp = this.generateTimestamp();
    const baseId = prefix + hash + timestamp;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.ATTENDANCE), prefix);
  }

  /**
   * Generate Virtual Attendance ID
   */
  generateVirtualAttendanceId(registrationId, eventId, sessionInfo) {
    const prefix = ID_PREFIXES.VIRTUAL_ATTENDANCE;
    const hashInput = `${registrationId}${eventId}${sessionInfo}`.toLowerCase();
    const hash = this.simpleHash(hashInput);
    const timestamp = this.generateTimestamp();
    const baseId = prefix + hash + timestamp;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.ATTENDANCE), prefix);
  }

  /**
   * Generate Physical Attendance ID
   */
  generatePhysicalAttendanceId(registrationId, eventId, venueInfo) {
    const prefix = ID_PREFIXES.PHYSICAL_ATTENDANCE;
    const hashInput = `${registrationId}${eventId}${venueInfo}`.toLowerCase();
    const hash = this.simpleHash(hashInput);
    const timestamp = this.generateTimestamp();
    const baseId = prefix + hash + timestamp;
    
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
    const baseId = prefix + hash + timestamp;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.CERTIFICATE), prefix);
  }

  /**
   * Generate Feedback ID
   */
  generateFeedbackId(enrollment, eventId) {
    const prefix = ID_PREFIXES.FEEDBACK;
    const hashInput = `${enrollment}${eventId}`.toLowerCase();
    const hash = this.simpleHash(hashInput);
    const timestamp = this.generateTimestamp();
    const baseId = prefix + hash + timestamp;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.FEEDBACK), prefix);
  }

  /**
   * Generate Admin ID
   */
  generateAdminId(username, role = 'admin') {
    const prefix = ID_PREFIXES.ADMIN;
    const hashInput = `${username}${role}`.toLowerCase();
    const hash = this.simpleHash(hashInput);
    const timestamp = this.generateTimestamp();
    const baseId = prefix + hash + timestamp;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.ADMIN), prefix);
  }

  /**
   * Generate Payment ID
   */
  generatePaymentId(registrationId, amount, paymentMethod) {
    const prefix = ID_PREFIXES.PAYMENT;
    const hashInput = `${registrationId}${amount}${paymentMethod}`.toLowerCase();
    const hash = this.simpleHash(hashInput);
    const timestamp = this.generateTimestamp();
    const baseId = prefix + hash + timestamp;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.PAYMENT), prefix);
  }

  /**
   * Generate Notification ID
   */
  generateNotificationId(userId, notificationType, content) {
    const prefix = ID_PREFIXES.NOTIFICATION;
    const hashInput = `${userId}${notificationType}${content}`.toLowerCase();
    const hash = this.simpleHash(hashInput);
    const timestamp = this.generateTimestamp();
    const baseId = prefix + hash + timestamp;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.NOTIFICATION), prefix);
  }

  /**
   * Generate Audit Log ID
   */
  generateAuditId(userId, action, resource) {
    const prefix = ID_PREFIXES.AUDIT;
    const hashInput = `${userId}${action}${resource}`.toLowerCase();
    const hash = this.simpleHash(hashInput);
    const timestamp = this.generateTimestamp();
    const baseId = prefix + hash + timestamp;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.AUDIT), prefix);
  }

  /**
   * Generate Session ID
   */
  generateSessionId(userId = null) {
    const prefix = ID_PREFIXES.SESSION;
    const hashInput = `${userId || 'anonymous'}${Date.now()}`.toLowerCase();
    const hash = this.simpleHash(hashInput);
    const random = this.generateRandom(8);
    const baseId = prefix + hash + random;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.SESSION), prefix);
  }

  /**
   * Generate Participant ID (for complex forms)
   */
  generateParticipantId(index, formType = 'event') {
    const prefix = ID_PREFIXES.PARTICIPANT;
    const hashInput = `${index}${formType}${Date.now()}`.toLowerCase();
    const hash = this.simpleHash(hashInput);
    const baseId = prefix + hash;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.PARTICIPANT), prefix);
  }

  // ===========================
  // DEPRECATED TEMP ID GENERATORS
  // ===========================

  /**
   * @deprecated Use generateRegistrationId instead
   */
  generateTempRegistrationId(enrollment, eventName, participantName) {
    console.warn('generateTempRegistrationId is deprecated. Use generateRegistrationId instead.');
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
   * @deprecated Use generateTeamRegistrationId instead
   */
  generateTempTeamId(teamName, eventName, leaderEnrollment) {
    console.warn('generateTempTeamId is deprecated. Use generateTeamRegistrationId instead.');
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
   * @deprecated Use generateEventId instead
   */
  generateTempEventId(eventName, department = '', organizerInfo = '') {
    console.warn('generateTempEventId is deprecated. Use generateEventId instead.');
    const prefix = ID_PREFIXES.TEMP_EVENT;
    const hash = this.simpleHash(`${eventName}${department}${organizerInfo}`);
    const random = this.generateRandom(3);
    const baseId = prefix + hash + random;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.EVENT), prefix);
  }

  /**
   * @deprecated Use generateAttendanceId instead
   */
  generateTempAttendanceId(registrationId, eventId) {
    console.warn('generateTempAttendanceId is deprecated. Use generateAttendanceId instead.');
    const prefix = ID_PREFIXES.TEMP_ATTENDANCE;
    const hash = this.simpleHash(`${registrationId}${eventId}`);
    const random = this.generateRandom(3);
    const baseId = prefix + hash + random;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.ATTENDANCE), prefix);
  }

  /**
   * @deprecated Use generateVirtualAttendanceId instead
   */
  generateTempVirtualAttendanceId(registrationId, eventId) {
    console.warn('generateTempVirtualAttendanceId is deprecated. Use generateVirtualAttendanceId instead.');
    const prefix = ID_PREFIXES.TEMP_VIRTUAL_ATTENDANCE;
    const hash = this.simpleHash(`${registrationId}${eventId}`);
    const random = this.generateRandom(3);
    const baseId = prefix + hash + random;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.ATTENDANCE), prefix);
  }

  /**
   * @deprecated Use generatePhysicalAttendanceId instead
   */
  generateTempPhysicalAttendanceId(registrationId, eventId) {
    console.warn('generateTempPhysicalAttendanceId is deprecated. Use generatePhysicalAttendanceId instead.');
    const prefix = ID_PREFIXES.TEMP_PHYSICAL_ATTENDANCE;
    const hash = this.simpleHash(`${registrationId}${eventId}`);
    const random = this.generateRandom(3);
    const baseId = prefix + hash + random;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.ATTENDANCE), prefix);
  }

  /**
   * @deprecated Use generateCertificateId instead
   */
  generateTempCertificateId(enrollment, eventName, participantName) {
    console.warn('generateTempCertificateId is deprecated. Use generateCertificateId instead.');
    const prefix = ID_PREFIXES.TEMP_CERTIFICATE;
    const hash = this.simpleHash(`${enrollment}${eventName}${participantName}`);
    const random = this.generateRandom(3);
    const baseId = prefix + hash + random;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.CERTIFICATE), prefix);
  }

  /**
   * @deprecated Use generateFeedbackId instead
   */
  generateTempFeedbackId(enrollment, eventId) {
    console.warn('generateTempFeedbackId is deprecated. Use generateFeedbackId instead.');
    const prefix = ID_PREFIXES.TEMP_FEEDBACK;
    const hash = this.simpleHash(`${enrollment}${eventId}`);
    const random = this.generateRandom(3);
    const baseId = prefix + hash + random;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.FEEDBACK), prefix);
  }

  /**
   * @deprecated Use generateAdminId instead
   */
  generateTempAdminId(username, role = 'admin') {
    console.warn('generateTempAdminId is deprecated. Use generateAdminId instead.');
    const prefix = ID_PREFIXES.TEMP_ADMIN;
    const hash = this.simpleHash(`${username}${role}`);
    const random = this.generateRandom(3);
    const baseId = prefix + hash + random;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.ADMIN), prefix);
  }

  /**
   * @deprecated Use generatePaymentId instead
   */
  generateTempPaymentId(registrationId, amount) {
    console.warn('generateTempPaymentId is deprecated. Use generatePaymentId instead.');
    const prefix = ID_PREFIXES.TEMP_PAYMENT;
    const hash = this.simpleHash(`${registrationId}${amount}`);
    const random = this.generateRandom(3);
    const baseId = prefix + hash + random;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.PAYMENT), prefix);
  }

  /**
   * @deprecated Use generateNotificationId instead
   */
  generateTempNotificationId(userId, notificationType) {
    console.warn('generateTempNotificationId is deprecated. Use generateNotificationId instead.');
    const prefix = ID_PREFIXES.TEMP_NOTIFICATION;
    const hash = this.simpleHash(`${userId}${notificationType}`);
    const random = this.generateRandom(3);
    const baseId = prefix + hash + random;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.NOTIFICATION), prefix);
  }

  /**
   * @deprecated Use generateAuditId instead
   */
  generateTempAuditId(userId, action) {
    console.warn('generateTempAuditId is deprecated. Use generateAuditId instead.');
    const prefix = ID_PREFIXES.TEMP_AUDIT;
    const hash = this.simpleHash(`${userId}${action}`);
    const random = this.generateRandom(3);
    const baseId = prefix + hash + random;
    
    return this.ensureUnique(baseId.substring(0, ID_LENGTHS.AUDIT), prefix);
  }

  /**
   * @deprecated Use generateParticipantId instead
   */
  generateTempParticipantId(index, formType = 'event') {
    console.warn('generateTempParticipantId is deprecated. Use generateParticipantId instead.');
    const prefix = ID_PREFIXES.TEMP_PARTICIPANT;
    const hash = this.simpleHash(`${index}${formType}`);
    const random = this.generateRandom(3);
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
    return participants.map((participant, index) => {
      const id = this.generateRegistrationId(
        participant.enrollment || `BULK${index}`,
        eventName,
        participant.name || `Participant${index}`
      );
      return { ...participant, registration_id: id };
    });
  }

  /**
   * Generate multiple participant IDs for team events
   */
  generateBulkParticipantIds(count, formType = 'team') {
    const ids = [];
    for (let i = 0; i < count; i++) {
      const id = this.generateParticipantId(i + 1, formType);
      ids.push(id);
    }
    return ids;
  }

  /**
   * Generate multiple attendance IDs
   */
  generateBulkAttendanceIds(registrationIds, eventId, attendanceType = 'regular') {
    return registrationIds.map(regId => {
      const id = this.generateAttendanceId(regId, eventId, attendanceType);
      return { registration_id: regId, attendance_id: id };
    });
  }

  /**
   * Generate multiple certificate IDs
   */
  generateBulkCertificateIds(participants, eventName) {
    return participants.map((participant, index) => {
      const id = this.generateCertificateId(
        participant.enrollment || `BULK${index}`,
        eventName,
        participant.name || `Participant${index}`
      );
      return { ...participant, certificate_id: id };
    });
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
    if (!id || typeof id !== 'string') return false;
    
    // Check if ID has a valid prefix
    const prefix = IDValidators.extractPrefix(id);
    return Object.values(ID_PREFIXES).includes(prefix);
  }

  /**
   * Extract prefix from ID
   */
  static extractPrefix(id) {
    if (!id) return null;
    
    // Find where the prefix ends (first digit or end of known prefixes)
    for (const prefix of Object.values(ID_PREFIXES)) {
      if (id.startsWith(prefix)) {
        return prefix;
      }
    }
    
    return null;
  }

  /**
   * Get ID type from prefix
   */
  static getIdType(id) {
    const prefix = IDValidators.extractPrefix(id);
    
    for (const [key, value] of Object.entries(ID_PREFIXES)) {
      if (value === prefix) {
        return key.toLowerCase().replace(/_/g, '_');
      }
    }
    
    return null;
  }

  /**
   * Check if ID is temporary
   */
  static isTemporaryId(id) {
    const prefix = IDValidators.extractPrefix(id);
    return prefix && prefix.startsWith('T');
  }

  /**
   * Get display name for ID
   */
  static getDisplayName(id) {
    const type = IDValidators.getIdType(id);
    if (!type) return 'Unknown ID';
    
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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

// ===========================
// EXPORT FUNCTIONS
// ===========================

// Real ID generation functions (RECOMMENDED)
const generateRegistrationId = (enrollment, eventName, participantName) => 
  idGenerator.generateRegistrationId(enrollment, eventName, participantName);

const generateTeamRegistrationId = (teamName, eventName, leaderEnrollment) => 
  idGenerator.generateTeamRegistrationId(teamName, eventName, leaderEnrollment);

const generateEventId = (eventName, department, organizerInfo) => 
  idGenerator.generateEventId(eventName, department, organizerInfo);

const generateAttendanceId = (registrationId, eventId, attendanceType) => 
  idGenerator.generateAttendanceId(registrationId, eventId, attendanceType);

const generateVirtualAttendanceId = (registrationId, eventId, sessionInfo) => 
  idGenerator.generateVirtualAttendanceId(registrationId, eventId, sessionInfo);

const generatePhysicalAttendanceId = (registrationId, eventId, venueInfo) => 
  idGenerator.generatePhysicalAttendanceId(registrationId, eventId, venueInfo);

const generateCertificateId = (enrollment, eventName, participantName) => 
  idGenerator.generateCertificateId(enrollment, eventName, participantName);

const generateFeedbackId = (enrollment, eventId) => 
  idGenerator.generateFeedbackId(enrollment, eventId);

const generateAdminId = (username, role) => 
  idGenerator.generateAdminId(username, role);

const generatePaymentId = (registrationId, amount, paymentMethod) => 
  idGenerator.generatePaymentId(registrationId, amount, paymentMethod);

const generateNotificationId = (userId, notificationType, content) => 
  idGenerator.generateNotificationId(userId, notificationType, content);

const generateAuditId = (userId, action, resource) => 
  idGenerator.generateAuditId(userId, action, resource);

const generateParticipantId = (index, formType) => 
  idGenerator.generateParticipantId(index, formType);

const generateSessionId = (userId) => 
  idGenerator.generateSessionId(userId);

// Deprecated temp ID functions (with warnings)
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
  
  // Real ID generators (RECOMMENDED)
  generateRegistrationId,
  generateTeamRegistrationId,
  generateEventId,
  generateAttendanceId,
  generateVirtualAttendanceId,
  generatePhysicalAttendanceId,
  generateCertificateId,
  generateFeedbackId,
  generateAdminId,
  generatePaymentId,
  generateNotificationId,
  generateAuditId,
  generateParticipantId,
  generateSessionId,
  
  // Deprecated temp ID generators (with warnings)
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
    IDGenerator,
    SpecificIDGenerators,
    BulkIDGenerator,
    IDValidators,
    
    // Real ID generators (RECOMMENDED)
    generateRegistrationId,
    generateTeamRegistrationId,
    generateEventId,
    generateAttendanceId,
    generateVirtualAttendanceId,
    generatePhysicalAttendanceId,
    generateCertificateId,
    generateFeedbackId,
    generateAdminId,
    generatePaymentId,
    generateNotificationId,
    generateAuditId,
    generateParticipantId,
    generateSessionId,
    
    // Deprecated temp ID generators (with warnings)
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
