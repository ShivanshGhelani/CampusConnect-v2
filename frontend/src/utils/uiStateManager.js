/**
 * PHASE 3: UI STATE MANAGEMENT SYSTEM
 * 
 * Advanced client-side state management that eliminates the need for
 * frequent API calls by managing form states, UI updates, and dynamic
 * content generation entirely on the frontend.
 * 
 * This system handles:
 * 1. Dynamic form generation based on event type
 * 2. Real-time participant management
 * 3. Conditional field display
 * 4. Form step progression
 * 5. Live validation and feedback
 * 6. Session persistence and recovery
 * 7. Optimistic UI updates
 * 8. Background sync management
 * 
 * Backend Compatibility: Mirrors all backend form logic and state management
 * Dependencies: React state management, form utilities from Phase 1 & 2
 */

// ==================== FORM STATE MANAGEMENT ====================

/**
 * Advanced form state manager that handles complex multi-step forms
 * with conditional logic, validation, and persistence
 */
export class FormStateManager {
  constructor(formType, initialData = {}) {
    this.formType = formType;
    this.state = {
      currentStep: 1,
      totalSteps: this.calculateTotalSteps(formType),
      formData: { ...initialData },
      validationState: {},
      isDirty: false,
      isSubmitting: false,
      lastSaved: null,
      sessionId: this.generateSessionId(),
      errors: {},
      warnings: {},
      autoSaveEnabled: true
    };
    
    this.listeners = new Set();
    this.validationRules = this.getValidationRules(formType);
    this.conditionalFields = this.getConditionalFields(formType);
    
    // Auto-restore from localStorage if available
    this.restoreFromStorage();
    
    // Set up auto-save
    this.setupAutoSave();
  }

  // Calculate total steps based on form type and conditional logic
  calculateTotalSteps(formType) {
    const stepMappings = {
      'student_registration': 4,
      'faculty_registration': 4,
      'team_registration': 5,
      'event_creation': 10,
      'individual_registration': 3,
      'bulk_registration': 6
    };
    
    return stepMappings[formType] || 4;
  }

  // Get validation rules for specific form type
  getValidationRules(formType) {
    const commonRules = {
      enrollment: { required: true, pattern: /^\d{2}[A-Z]{2,4}\d{5}$/ },
      email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      mobile: { required: true, pattern: /^[0-9]{10}$/ },
      name: { required: true, minLength: 2, maxLength: 50 }
    };

    const formSpecificRules = {
      'student_registration': {
        ...commonRules,
        semester: { required: true, min: 1, max: 8 },
        department: { required: true }
      },
      'faculty_registration': {
        ...commonRules,
        faculty_id: { required: true, pattern: /^[A-Z0-9]{6,12}$/ },
        department: { required: true }
      },
      'team_registration': {
        ...commonRules,
        team_name: { required: true, minLength: 3, maxLength: 50 },
        team_size: { required: true, min: 2, max: 10 }
      },
      'event_creation': {
        event_name: { required: true, minLength: 5, maxLength: 100 },
        event_type: { required: true },
        start_datetime: { required: true },
        end_datetime: { required: true },
        registration_start_date: { required: true },
        registration_end_date: { required: true }
      }
    };

    return formSpecificRules[formType] || commonRules;
  }

  // Define conditional fields based on form data
  getConditionalFields(formType) {
    return {
      'event_creation': {
        'team_size_min': (data) => data.registration_mode === 'Team',
        'team_size_max': (data) => data.registration_mode === 'Team',
        'registration_fee': (data) => data.registration_type === 'Paid',
        'fee_description': (data) => data.registration_type === 'Paid',
        'venue': (data) => data.mode !== 'Online',
        'meeting_link': (data) => data.mode !== 'Offline'
      },
      'team_registration': {
        'participants': (data) => data.registration_mode === 'Team'
      }
    };
  }

  // Generate unique session ID for form persistence
  generateSessionId() {
    return `form_${this.formType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Update form data and trigger validation
  updateField(fieldName, value, options = {}) {
    const { validate = true, autoSave = true } = options;
    
    // Update the field value
    this.state.formData[fieldName] = value;
    this.state.isDirty = true;
    
    // Clear existing errors for this field
    delete this.state.errors[fieldName];
    delete this.state.warnings[fieldName];
    
    // Validate field if requested
    if (validate) {
      this.validateField(fieldName);
    }
    
    // Check conditional fields
    this.updateConditionalFields();
    
    // Auto-save if enabled
    if (autoSave && this.state.autoSaveEnabled) {
      this.scheduleAutoSave();
    }
    
    // Notify listeners
    this.notifyListeners('fieldUpdate', { fieldName, value });
    
    return this;
  }

  // Validate a specific field
  validateField(fieldName) {
    const value = this.state.formData[fieldName];
    const rules = this.validationRules[fieldName];
    
    if (!rules) return true;
    
    const errors = [];
    const warnings = [];
    
    // Required validation
    if (rules.required && (!value || value.toString().trim() === '')) {
      errors.push(`${fieldName} is required`);
    }
    
    if (value && value.toString().trim() !== '') {
      // Pattern validation
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(`${fieldName} format is invalid`);
      }
      
      // Length validation
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`${fieldName} must be at least ${rules.minLength} characters`);
      }
      
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${fieldName} must not exceed ${rules.maxLength} characters`);
      }
      
      // Numeric validation
      if (rules.min && Number(value) < rules.min) {
        errors.push(`${fieldName} must be at least ${rules.min}`);
      }
      
      if (rules.max && Number(value) > rules.max) {
        errors.push(`${fieldName} must not exceed ${rules.max}`);
      }
      
      // Custom validation
      if (rules.custom && typeof rules.custom === 'function') {
        const customResult = rules.custom(value, this.state.formData);
        if (customResult !== true) {
          errors.push(customResult);
        }
      }
    }
    
    // Update validation state
    if (errors.length > 0) {
      this.state.errors[fieldName] = errors;
    }
    
    if (warnings.length > 0) {
      this.state.warnings[fieldName] = warnings;
    }
    
    this.state.validationState[fieldName] = errors.length === 0;
    
    return errors.length === 0;
  }

  // Validate entire form
  validateForm() {
    const allFields = Object.keys(this.validationRules);
    let isValid = true;
    
    for (const field of allFields) {
      if (!this.validateField(field)) {
        isValid = false;
      }
    }
    
    return isValid;
  }

  // Update conditional fields visibility
  updateConditionalFields() {
    const conditionalRules = this.conditionalFields[this.formType] || {};
    
    for (const [fieldName, condition] of Object.entries(conditionalRules)) {
      const shouldShow = condition(this.state.formData);
      
      if (!shouldShow && this.state.formData[fieldName] !== undefined) {
        // Clear field if it should be hidden
        delete this.state.formData[fieldName];
        delete this.state.errors[fieldName];
        delete this.state.warnings[fieldName];
      }
    }
  }

  // Navigate to next step
  nextStep() {
    if (this.state.currentStep < this.state.totalSteps) {
      // Validate current step before proceeding
      if (this.validateCurrentStep()) {
        this.state.currentStep++;
        this.notifyListeners('stepChange', { 
          step: this.state.currentStep, 
          direction: 'next' 
        });
        return true;
      }
    }
    return false;
  }

  // Navigate to previous step
  previousStep() {
    if (this.state.currentStep > 1) {
      this.state.currentStep--;
      this.notifyListeners('stepChange', { 
        step: this.state.currentStep, 
        direction: 'previous' 
      });
      return true;
    }
    return false;
  }

  // Jump to specific step
  goToStep(step) {
    if (step >= 1 && step <= this.state.totalSteps) {
      this.state.currentStep = step;
      this.notifyListeners('stepChange', { 
        step: this.state.currentStep, 
        direction: 'jump' 
      });
      return true;
    }
    return false;
  }

  // Validate current step fields
  validateCurrentStep() {
    const stepFields = this.getStepFields(this.state.currentStep);
    let isValid = true;
    
    for (const field of stepFields) {
      if (!this.validateField(field)) {
        isValid = false;
      }
    }
    
    return isValid;
  }

  // Get fields for specific step
  getStepFields(step) {
    const stepMappings = {
      'student_registration': {
        1: ['name', 'enrollment', 'email', 'mobile'],
        2: ['semester', 'department', 'section'],
        3: ['event_selection'],
        4: ['confirmation']
      },
      'team_registration': {
        1: ['team_name', 'leader_enrollment'],
        2: ['leader_details'],
        3: ['participants'],
        4: ['event_selection'],
        5: ['confirmation']
      },
      'event_creation': {
        1: ['event_name', 'event_type', 'short_description'],
        2: ['organizing_department', 'faculty_organizers'],
        3: ['registration_start_date', 'registration_end_date', 'start_datetime', 'end_datetime'],
        4: ['mode', 'venue'],
        5: ['registration_type', 'registration_mode'],
        6: ['max_participants', 'min_participants'],
        7: ['team_size_min', 'team_size_max'],
        8: ['certificate_template'],
        9: ['review'],
        10: ['submit']
      }
    };
    
    return stepMappings[this.formType]?.[step] || [];
  }

  // Auto-save setup
  setupAutoSave() {
    this.autoSaveTimer = null;
  }

  // Schedule auto-save
  scheduleAutoSave() {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
    
    this.autoSaveTimer = setTimeout(() => {
      this.saveToStorage();
    }, 2000); // Auto-save after 2 seconds of inactivity
  }

  // Save to localStorage
  saveToStorage() {
    try {
      const dataToSave = {
        formType: this.formType,
        state: this.state,
        timestamp: Date.now()
      };
      
      localStorage.setItem(`form_${this.state.sessionId}`, JSON.stringify(dataToSave));
      this.state.lastSaved = new Date();
      
      this.notifyListeners('autoSave', { success: true });
    } catch (error) {
      console.error('Failed to save form to storage:', error);
      this.notifyListeners('autoSave', { success: false, error });
    }
  }

  // Restore from localStorage
  restoreFromStorage() {
    try {
      // Look for existing sessions of this form type
      const sessions = this.getStoredSessions();
      
      if (sessions.length > 0) {
        // Use the most recent session
        const mostRecent = sessions.sort((a, b) => b.timestamp - a.timestamp)[0];
        
        this.state = { ...this.state, ...mostRecent.state };
        this.notifyListeners('sessionRestored', { sessionId: mostRecent.sessionId });
      }
    } catch (error) {
      console.error('Failed to restore form from storage:', error);
    }
  }

  // Get all stored sessions for this form type
  getStoredSessions() {
    const sessions = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      if (key && key.startsWith(`form_${this.formType}_`)) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          if (data && data.formType === this.formType) {
            sessions.push({ sessionId: key, ...data });
          }
        } catch (error) {
          // Invalid session data, skip
        }
      }
    }
    
    return sessions;
  }

  // Clear storage
  clearStorage() {
    localStorage.removeItem(`form_${this.state.sessionId}`);
    this.state.lastSaved = null;
    this.notifyListeners('storageCleared');
  }

  // Add event listener
  addListener(callback) {
    this.listeners.add(callback);
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Notify all listeners
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data, this.state);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  // Get current state (readonly)
  getState() {
    return { ...this.state };
  }

  // Get form progress percentage
  getProgress() {
    return Math.round((this.state.currentStep / this.state.totalSteps) * 100);
  }

  // Check if field should be visible
  isFieldVisible(fieldName) {
    const conditionalRules = this.conditionalFields[this.formType] || {};
    const condition = conditionalRules[fieldName];
    
    if (!condition) return true;
    
    return condition(this.state.formData);
  }

  // Reset form
  reset() {
    this.state = {
      currentStep: 1,
      totalSteps: this.calculateTotalSteps(this.formType),
      formData: {},
      validationState: {},
      isDirty: false,
      isSubmitting: false,
      lastSaved: null,
      sessionId: this.generateSessionId(),
      errors: {},
      warnings: {},
      autoSaveEnabled: true
    };
    
    this.notifyListeners('reset');
  }

  // Submit form
  async submit() {
    this.state.isSubmitting = true;
    
    try {
      // Final validation
      if (!this.validateForm()) {
        throw new Error('Form validation failed');
      }
      
      // Prepare data for submission
      const submissionData = this.prepareSubmissionData();
      
      this.notifyListeners('submitStart', submissionData);
      
      // Note: Actual submission would happen in the component
      // This manager just prepares and validates the data
      
      return submissionData;
    } catch (error) {
      this.notifyListeners('submitError', error);
      throw error;
    } finally {
      this.state.isSubmitting = false;
    }
  }

  // Prepare data for submission
  prepareSubmissionData() {
    // Remove temporary fields and prepare final data structure
    const cleanData = { ...this.state.formData };
    
    // Add metadata
    cleanData._metadata = {
      formType: this.formType,
      sessionId: this.state.sessionId,
      completedSteps: this.state.currentStep,
      totalSteps: this.state.totalSteps,
      submissionTime: new Date().toISOString()
    };
    
    return cleanData;
  }
}

// ==================== DYNAMIC PARTICIPANT MANAGER ====================

/**
 * Advanced participant management for team registrations and events
 * Handles dynamic addition/removal, validation, and conflict detection
 */
export class ParticipantManager {
  constructor(eventConfig = {}) {
    this.config = {
      teamSizeMin: eventConfig.team_size_min || 2,
      teamSizeMax: eventConfig.team_size_max || 5,
      maxParticipants: eventConfig.max_participants || 100,
      requiresLeader: eventConfig.requires_leader || true,
      allowDuplicateEnrollments: false,
      ...eventConfig
    };
    
    this.participants = [];
    this.leader = null;
    this.listeners = new Set();
  }

  // Add participant
  addParticipant(participantData = {}) {
    const currentSize = this.getCurrentTeamSize();
    
    if (currentSize >= this.config.teamSizeMax) {
      throw new Error(`Maximum team size (${this.config.teamSizeMax}) reached`);
    }
    
    const participant = {
      id: this.generateParticipantId(),
      name: '',
      enrollment: '',
      email: '',
      mobile: '',
      semester: '',
      department: '',
      section: '',
      role: 'participant',
      isValid: false,
      ...participantData
    };
    
    this.participants.push(participant);
    this.notifyListeners('participantAdded', participant);
    
    return participant;
  }

  // Remove participant
  removeParticipant(participantId) {
    const currentSize = this.getCurrentTeamSize();
    
    if (currentSize <= this.config.teamSizeMin) {
      throw new Error(`Minimum team size (${this.config.teamSizeMin}) required`);
    }
    
    const index = this.participants.findIndex(p => p.id === participantId);
    
    if (index !== -1) {
      const removed = this.participants.splice(index, 1)[0];
      this.notifyListeners('participantRemoved', removed);
      return removed;
    }
    
    return null;
  }

  // Update participant
  updateParticipant(participantId, updates) {
    const participant = this.participants.find(p => p.id === participantId);
    
    if (!participant) {
      throw new Error('Participant not found');
    }
    
    // Check for enrollment conflicts
    if (updates.enrollment && !this.config.allowDuplicateEnrollments) {
      const conflict = this.findEnrollmentConflict(updates.enrollment, participantId);
      if (conflict) {
        throw new Error(`Enrollment ${updates.enrollment} is already used by ${conflict.name}`);
      }
    }
    
    Object.assign(participant, updates);
    participant.isValid = this.validateParticipant(participant);
    
    this.notifyListeners('participantUpdated', participant);
    
    return participant;
  }

  // Set team leader
  setLeader(leaderData) {
    if (!this.config.requiresLeader) {
      throw new Error('This event does not require a team leader');
    }
    
    const leader = {
      id: 'leader',
      role: 'leader',
      isValid: false,
      ...leaderData
    };
    
    leader.isValid = this.validateParticipant(leader);
    this.leader = leader;
    
    this.notifyListeners('leaderSet', leader);
    
    return leader;
  }

  // Validate participant data
  validateParticipant(participant) {
    const errors = [];
    
    // Required fields validation
    if (!participant.name || participant.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters');
    }
    
    if (!participant.enrollment || !/^\d{2}[A-Z]{2,4}\d{5}$/.test(participant.enrollment)) {
      errors.push('Invalid enrollment number format');
    }
    
    if (!participant.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(participant.email)) {
      errors.push('Invalid email format');
    }
    
    if (!participant.mobile || !/^[0-9]{10}$/.test(participant.mobile)) {
      errors.push('Invalid mobile number');
    }
    
    if (!participant.semester || participant.semester < 1 || participant.semester > 8) {
      errors.push('Semester must be between 1 and 8');
    }
    
    // Store errors in participant object
    participant.errors = errors;
    
    return errors.length === 0;
  }

  // Find enrollment conflicts
  findEnrollmentConflict(enrollment, excludeId = null) {
    const allParticipants = [
      ...(this.leader ? [this.leader] : []),
      ...this.participants
    ];
    
    return allParticipants.find(p => 
      p.enrollment === enrollment && 
      p.id !== excludeId
    );
  }

  // Get current team size
  getCurrentTeamSize() {
    return this.participants.length + (this.leader ? 1 : 0);
  }

  // Check if team is valid
  isTeamValid() {
    const currentSize = this.getCurrentTeamSize();
    
    // Check size constraints
    if (currentSize < this.config.teamSizeMin || currentSize > this.config.teamSizeMax) {
      return false;
    }
    
    // Check leader validity
    if (this.config.requiresLeader && (!this.leader || !this.leader.isValid)) {
      return false;
    }
    
    // Check all participants validity
    return this.participants.every(p => p.isValid);
  }

  // Get team validation status
  getValidationStatus() {
    const currentSize = this.getCurrentTeamSize();
    const issues = [];
    
    if (currentSize < this.config.teamSizeMin) {
      issues.push(`Team needs at least ${this.config.teamSizeMin} members`);
    }
    
    if (currentSize > this.config.teamSizeMax) {
      issues.push(`Team cannot exceed ${this.config.teamSizeMax} members`);
    }
    
    if (this.config.requiresLeader && (!this.leader || !this.leader.isValid)) {
      issues.push('Valid team leader is required');
    }
    
    const invalidParticipants = this.participants.filter(p => !p.isValid);
    if (invalidParticipants.length > 0) {
      issues.push(`${invalidParticipants.length} participant(s) have validation errors`);
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      currentSize,
      requiredSize: `${this.config.teamSizeMin}-${this.config.teamSizeMax}`
    };
  }

  // Generate participant ID
  generateParticipantId() {
    return `participant_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  }

  // Add event listener
  addListener(callback) {
    this.listeners.add(callback);
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Notify listeners
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Participant manager listener error:', error);
      }
    });
  }

  // Get all team data
  getTeamData() {
    return {
      leader: this.leader,
      participants: [...this.participants],
      teamSize: this.getCurrentTeamSize(),
      isValid: this.isTeamValid(),
      validation: this.getValidationStatus()
    };
  }

  // Reset team
  reset() {
    this.participants = [];
    this.leader = null;
    this.notifyListeners('teamReset');
  }

  // Import team data
  importTeamData(teamData) {
    this.reset();
    
    if (teamData.leader) {
      this.setLeader(teamData.leader);
    }
    
    if (teamData.participants) {
      teamData.participants.forEach(p => {
        this.addParticipant(p);
      });
    }
    
    this.notifyListeners('teamImported', teamData);
  }
}

// ==================== REAL-TIME UI STATE MANAGER ====================

/**
 * Manages real-time UI state updates, notifications, and background sync
 */
export class UIStateManager {
  constructor() {
    this.state = {
      notifications: [],
      modals: {},
      loading: {},
      errors: {},
      theme: 'light',
      locale: 'en',
      connectivity: navigator.onLine,
      backgroundSync: {
        queue: [],
        syncing: false,
        lastSync: null
      }
    };
    
    this.listeners = new Set();
    this.setupConnectivityListeners();
    this.setupBackgroundSync();
  }

  // Show notification
  showNotification(notification) {
    const id = notification.id || `notification_${Date.now()}`;
    
    const notificationObj = {
      id,
      type: 'info',
      title: '',
      message: '',
      duration: 5000,
      persistent: false,
      actions: [],
      timestamp: Date.now(),
      ...notification
    };
    
    this.state.notifications.push(notificationObj);
    this.notifyListeners('notificationAdded', notificationObj);
    
    // Auto-remove non-persistent notifications
    if (!notificationObj.persistent && notificationObj.duration > 0) {
      setTimeout(() => {
        this.dismissNotification(id);
      }, notificationObj.duration);
    }
    
    return id;
  }

  // Dismiss notification
  dismissNotification(id) {
    const index = this.state.notifications.findIndex(n => n.id === id);
    
    if (index !== -1) {
      const notification = this.state.notifications.splice(index, 1)[0];
      this.notifyListeners('notificationDismissed', notification);
    }
  }

  // Show modal
  showModal(modalId, modalData = {}) {
    this.state.modals[modalId] = {
      id: modalId,
      visible: true,
      data: modalData,
      timestamp: Date.now()
    };
    
    this.notifyListeners('modalShown', { modalId, modalData });
  }

  // Hide modal
  hideModal(modalId) {
    if (this.state.modals[modalId]) {
      this.state.modals[modalId].visible = false;
      this.notifyListeners('modalHidden', { modalId });
      
      // Clean up after a delay
      setTimeout(() => {
        delete this.state.modals[modalId];
      }, 1000);
    }
  }

  // Set loading state
  setLoading(key, isLoading, message = '') {
    if (isLoading) {
      this.state.loading[key] = {
        active: true,
        message,
        startTime: Date.now()
      };
    } else {
      delete this.state.loading[key];
    }
    
    this.notifyListeners('loadingChanged', { key, isLoading, message });
  }

  // Set error state
  setError(key, error) {
    if (error) {
      this.state.errors[key] = {
        message: error.message || error,
        timestamp: Date.now(),
        details: error
      };
    } else {
      delete this.state.errors[key];
    }
    
    this.notifyListeners('errorChanged', { key, error });
  }

  // Add to background sync queue
  addToSyncQueue(action) {
    const syncItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      action,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: 3
    };
    
    this.state.backgroundSync.queue.push(syncItem);
    this.notifyListeners('syncQueued', syncItem);
    
    // Trigger sync if online
    if (this.state.connectivity) {
      this.processSyncQueue();
    }
  }

  // Process background sync queue
  async processSyncQueue() {
    if (this.state.backgroundSync.syncing || !this.state.connectivity) {
      return;
    }
    
    this.state.backgroundSync.syncing = true;
    this.notifyListeners('syncStarted');
    
    const queue = [...this.state.backgroundSync.queue];
    
    for (const item of queue) {
      try {
        // Process sync item (implement based on action type)
        await this.processSyncItem(item);
        
        // Remove from queue on success
        this.removeSyncItem(item.id);
        
      } catch (error) {
        item.retries++;
        
        if (item.retries >= item.maxRetries) {
          // Remove failed items after max retries
          this.removeSyncItem(item.id);
          this.setError(`sync_${item.id}`, error);
        }
      }
    }
    
    this.state.backgroundSync.syncing = false;
    this.state.backgroundSync.lastSync = Date.now();
    this.notifyListeners('syncCompleted');
  }

  // Process individual sync item
  async processSyncItem(item) {
    // This would be implemented based on specific sync requirements
    // For now, just simulate processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    this.notifyListeners('syncItemProcessed', item);
  }

  // Remove sync item
  removeSyncItem(id) {
    const index = this.state.backgroundSync.queue.findIndex(item => item.id === id);
    if (index !== -1) {
      this.state.backgroundSync.queue.splice(index, 1);
    }
  }

  // Setup connectivity listeners
  setupConnectivityListeners() {
    window.addEventListener('online', () => {
      this.state.connectivity = true;
      this.notifyListeners('connectivityChanged', true);
      this.showNotification({
        type: 'success',
        title: 'Back Online',
        message: 'Connection restored. Syncing pending changes...'
      });
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.state.connectivity = false;
      this.notifyListeners('connectivityChanged', false);
      this.showNotification({
        type: 'warning',
        title: 'Offline Mode',
        message: 'Working offline. Changes will sync when connection is restored.',
        persistent: true
      });
    });
  }

  // Setup background sync
  setupBackgroundSync() {
    // Process queue periodically
    setInterval(() => {
      if (this.state.backgroundSync.queue.length > 0) {
        this.processSyncQueue();
      }
    }, 30000); // Every 30 seconds
  }

  // Add event listener
  addListener(callback) {
    this.listeners.add(callback);
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Notify listeners
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data, this.state);
      } catch (error) {
        console.error('UI state manager listener error:', error);
      }
    });
  }

  // Get current state
  getState() {
    return { ...this.state };
  }
}

// ==================== EXPORT ALL MANAGERS ====================

export default {
  FormStateManager,
  ParticipantManager,
  UIStateManager
};
