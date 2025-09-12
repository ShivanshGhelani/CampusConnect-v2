/**
 * PHASE 3: REACT HOOKS FOR UI STATE MANAGEMENT
 * 
 * Custom React hooks that integrate with the UI State Management system
 * to provide seamless state management, form handling, and real-time updates
 * without requiring frequent API calls.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { FormStateManager, ParticipantManager, UIStateManager } from '../utils/uiStateManager.js';

// ==================== FORM STATE HOOK ====================

/**
 * Advanced form state hook with validation, persistence, and real-time updates
 */
export function useFormState(formType, initialData = {}, options = {}) {
  const [state, setState] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [warnings, setWarnings] = useState({});
  
  const managerRef = useRef(null);
  
  // Initialize form manager
  useEffect(() => {
    managerRef.current = new FormStateManager(formType, initialData);
    
    // Listen for state changes
    const unsubscribe = managerRef.current.addListener((event, data, newState) => {
      setState({ ...newState });
      
      if (event === 'fieldUpdate') {
        setErrors({ ...newState.errors });
        setWarnings({ ...newState.warnings });
      }
      
      if (event === 'submitStart') {
        setIsLoading(true);
      }
      
      if (event === 'submitError' || event === 'submitComplete') {
        setIsLoading(false);
      }
    });
    
    // Set initial state
    setState(managerRef.current.getState());
    
    return unsubscribe;
  }, [formType]);
  
  // Update field value
  const updateField = useCallback((fieldName, value, options = {}) => {
    if (managerRef.current) {
      managerRef.current.updateField(fieldName, value, options);
    }
  }, []);
  
  // Validate field
  const validateField = useCallback((fieldName) => {
    if (managerRef.current) {
      return managerRef.current.validateField(fieldName);
    }
    return false;
  }, []);
  
  // Validate entire form
  const validateForm = useCallback(() => {
    if (managerRef.current) {
      return managerRef.current.validateForm();
    }
    return false;
  }, []);
  
  // Navigate between steps
  const nextStep = useCallback(() => {
    if (managerRef.current) {
      return managerRef.current.nextStep();
    }
    return false;
  }, []);
  
  const previousStep = useCallback(() => {
    if (managerRef.current) {
      return managerRef.current.previousStep();
    }
    return false;
  }, []);
  
  const goToStep = useCallback((step) => {
    if (managerRef.current) {
      return managerRef.current.goToStep(step);
    }
    return false;
  }, []);
  
  // Submit form
  const submitForm = useCallback(async () => {
    if (managerRef.current) {
      try {
        const submissionData = await managerRef.current.submit();
        return submissionData;
      } catch (error) {
        throw error;
      }
    }
    throw new Error('Form manager not initialized');
  }, []);
  
  // Reset form
  const resetForm = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.reset();
    }
  }, []);
  
  // Check if field is visible (for conditional fields)
  const isFieldVisible = useCallback((fieldName) => {
    if (managerRef.current) {
      return managerRef.current.isFieldVisible(fieldName);
    }
    return true;
  }, [state.formData]); // Re-evaluate when form data changes
  
  // Get field error
  const getFieldError = useCallback((fieldName) => {
    return errors[fieldName]?.[0] || null;
  }, [errors]);
  
  // Check if field has error
  const hasFieldError = useCallback((fieldName) => {
    return errors[fieldName] && errors[fieldName].length > 0;
  }, [errors]);
  
  // Get form progress
  const getProgress = useCallback(() => {
    if (managerRef.current) {
      return managerRef.current.getProgress();
    }
    return 0;
  }, [state.currentStep, state.totalSteps]);
  
  return {
    // State
    formData: state.formData || {},
    currentStep: state.currentStep || 1,
    totalSteps: state.totalSteps || 1,
    isDirty: state.isDirty || false,
    isSubmitting: state.isSubmitting || false,
    isLoading,
    errors,
    warnings,
    lastSaved: state.lastSaved,
    
    // Actions
    updateField,
    validateField,
    validateForm,
    nextStep,
    previousStep,
    goToStep,
    submitForm,
    resetForm,
    
    // Utilities
    isFieldVisible,
    getFieldError,
    hasFieldError,
    getProgress,
    
    // Manager reference (for advanced usage)
    manager: managerRef.current
  };
}

// ==================== PARTICIPANT MANAGEMENT HOOK ====================

/**
 * Hook for managing team participants with validation and real-time updates
 */
export function useParticipantManager(eventConfig = {}) {
  const [teamData, setTeamData] = useState({
    leader: null,
    participants: [],
    teamSize: 0,
    isValid: false,
    validation: { isValid: false, issues: [], currentSize: 0, requiredSize: '' }
  });
  
  const managerRef = useRef(null);
  
  // Initialize participant manager
  useEffect(() => {
    managerRef.current = new ParticipantManager(eventConfig);
    
    // Listen for changes
    const unsubscribe = managerRef.current.addListener((event, data) => {
      // Update team data on any change
      setTeamData(managerRef.current.getTeamData());
    });
    
    // Set initial state
    setTeamData(managerRef.current.getTeamData());
    
    return unsubscribe;
  }, [eventConfig]);
  
  // Add participant
  const addParticipant = useCallback((participantData = {}) => {
    if (managerRef.current) {
      try {
        return managerRef.current.addParticipant(participantData);
      } catch (error) {
        throw error;
      }
    }
    throw new Error('Participant manager not initialized');
  }, []);
  
  // Remove participant
  const removeParticipant = useCallback((participantId) => {
    if (managerRef.current) {
      try {
        return managerRef.current.removeParticipant(participantId);
      } catch (error) {
        throw error;
      }
    }
    return null;
  }, []);
  
  // Update participant
  const updateParticipant = useCallback((participantId, updates) => {
    if (managerRef.current) {
      try {
        return managerRef.current.updateParticipant(participantId, updates);
      } catch (error) {
        throw error;
      }
    }
    throw new Error('Participant manager not initialized');
  }, []);
  
  // Set team leader
  const setLeader = useCallback((leaderData) => {
    if (managerRef.current) {
      try {
        return managerRef.current.setLeader(leaderData);
      } catch (error) {
        throw error;
      }
    }
    throw new Error('Participant manager not initialized');
  }, []);
  
  // Check if can add more participants
  const canAddParticipant = useCallback(() => {
    if (managerRef.current) {
      const currentSize = managerRef.current.getCurrentTeamSize();
      return currentSize < managerRef.current.config.teamSizeMax;
    }
    return false;
  }, [teamData.teamSize]);
  
  // Check if can remove participants
  const canRemoveParticipant = useCallback(() => {
    if (managerRef.current) {
      const currentSize = managerRef.current.getCurrentTeamSize();
      return currentSize > managerRef.current.config.teamSizeMin;
    }
    return false;
  }, [teamData.teamSize]);
  
  // Get participant by ID
  const getParticipant = useCallback((participantId) => {
    if (participantId === 'leader') {
      return teamData.leader;
    }
    return teamData.participants.find(p => p.id === participantId);
  }, [teamData]);
  
  // Reset team
  const resetTeam = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.reset();
    }
  }, []);
  
  // Import team data
  const importTeamData = useCallback((data) => {
    if (managerRef.current) {
      managerRef.current.importTeamData(data);
    }
  }, []);
  
  return {
    // State
    leader: teamData.leader,
    participants: teamData.participants,
    teamSize: teamData.teamSize,
    isValid: teamData.isValid,
    validation: teamData.validation,
    
    // Actions
    addParticipant,
    removeParticipant,
    updateParticipant,
    setLeader,
    resetTeam,
    importTeamData,
    
    // Utilities
    canAddParticipant,
    canRemoveParticipant,
    getParticipant,
    
    // Manager reference
    manager: managerRef.current
  };
}

// ==================== UI STATE HOOK ====================

/**
 * Hook for managing global UI state, notifications, modals, and background sync
 */
export function useUIState() {
  const [uiState, setUIState] = useState({
    notifications: [],
    modals: {},
    loading: {},
    errors: {},
    connectivity: navigator.onLine,
    backgroundSync: { queue: [], syncing: false, lastSync: null }
  });
  
  const managerRef = useRef(null);
  
  // Initialize UI state manager (singleton pattern)
  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = new UIStateManager();
    }
    
    // Listen for state changes
    const unsubscribe = managerRef.current.addListener((event, data, newState) => {
      setUIState({ ...newState });
    });
    
    // Set initial state
    setUIState(managerRef.current.getState());
    
    return unsubscribe;
  }, []);
  
  // Show notification
  const showNotification = useCallback((notification) => {
    if (managerRef.current) {
      return managerRef.current.showNotification(notification);
    }
    return null;
  }, []);
  
  // Dismiss notification
  const dismissNotification = useCallback((id) => {
    if (managerRef.current) {
      managerRef.current.dismissNotification(id);
    }
  }, []);
  
  // Show modal
  const showModal = useCallback((modalId, modalData = {}) => {
    if (managerRef.current) {
      managerRef.current.showModal(modalId, modalData);
    }
  }, []);
  
  // Hide modal
  const hideModal = useCallback((modalId) => {
    if (managerRef.current) {
      managerRef.current.hideModal(modalId);
    }
  }, []);
  
  // Set loading state
  const setLoading = useCallback((key, isLoading, message = '') => {
    if (managerRef.current) {
      managerRef.current.setLoading(key, isLoading, message);
    }
  }, []);
  
  // Set error state
  const setError = useCallback((key, error) => {
    if (managerRef.current) {
      managerRef.current.setError(key, error);
    }
  }, []);
  
  // Add to background sync queue
  const addToSyncQueue = useCallback((action) => {
    if (managerRef.current) {
      managerRef.current.addToSyncQueue(action);
    }
  }, []);
  
  // Check if currently loading
  const isLoading = useCallback((key) => {
    return !!uiState.loading[key];
  }, [uiState.loading]);
  
  // Get error for key
  const getError = useCallback((key) => {
    return uiState.errors[key] || null;
  }, [uiState.errors]);
  
  // Check if modal is visible
  const isModalVisible = useCallback((modalId) => {
    return uiState.modals[modalId]?.visible || false;
  }, [uiState.modals]);
  
  return {
    // State
    notifications: uiState.notifications,
    modals: uiState.modals,
    loading: uiState.loading,
    errors: uiState.errors,
    connectivity: uiState.connectivity,
    backgroundSync: uiState.backgroundSync,
    
    // Actions
    showNotification,
    dismissNotification,
    showModal,
    hideModal,
    setLoading,
    setError,
    addToSyncQueue,
    
    // Utilities
    isLoading,
    getError,
    isModalVisible,
    
    // Manager reference
    manager: managerRef.current
  };
}

// ==================== REAL-TIME EVENT STATUS HOOK ====================

/**
 * Hook for real-time event status updates using Phase 2 date/time utilities
 */
export function useEventStatus(eventData, options = {}) {
  const [status, setStatus] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [registrationStatus, setRegistrationStatus] = useState(null);
  
  const { updateInterval = 1000, autoUpdate = true } = options;
  const intervalRef = useRef(null);
  
  // Import Phase 2 utilities
  const updateEventStatus = useCallback(() => {
    if (!eventData) return;
    
    try {
      // Use Phase 2 date/time utilities for calculations
      const eventStatusResult = calculateEventStatus(eventData);
      const timeRemainingResult = calculateTimeRemaining(eventData);
      const regStatusResult = calculateRegistrationStatus(eventData);
      
      setStatus(eventStatusResult);
      setTimeRemaining(timeRemainingResult);
      setRegistrationStatus(regStatusResult);
      
    } catch (error) {
      
    }
  }, [eventData]);
  
  // Set up real-time updates
  useEffect(() => {
    if (autoUpdate && eventData) {
      // Initial update
      updateEventStatus();
      
      // Set up interval
      intervalRef.current = setInterval(updateEventStatus, updateInterval);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [eventData, autoUpdate, updateInterval, updateEventStatus]);
  
  // Manual refresh
  const refreshStatus = useCallback(() => {
    updateEventStatus();
  }, [updateEventStatus]);
  
  return {
    status,
    timeRemaining,
    registrationStatus,
    refreshStatus,
    isUpdating: autoUpdate
  };
}

// ==================== DYNAMIC FORM FIELD HOOK ====================

/**
 * Hook for managing dynamic form fields with conditional logic
 */
export function useDynamicFields(formType, formData = {}) {
  const [visibleFields, setVisibleFields] = useState([]);
  const [fieldConfigs, setFieldConfigs] = useState({});
  
  // Define field configurations for different form types
  const getFormFieldConfig = useCallback((formType) => {
    const configs = {
      'event_creation': {
        'event_name': { required: true, step: 1, type: 'text' },
        'event_type': { required: true, step: 1, type: 'select' },
        'short_description': { required: true, step: 1, type: 'textarea' },
        'organizing_department': { required: true, step: 2, type: 'select' },
        'faculty_organizers': { required: true, step: 2, type: 'multi-select' },
        'registration_start_date': { required: true, step: 3, type: 'datetime' },
        'registration_end_date': { required: true, step: 3, type: 'datetime' },
        'start_datetime': { required: true, step: 3, type: 'datetime' },
        'end_datetime': { required: true, step: 3, type: 'datetime' },
        'mode': { required: true, step: 4, type: 'select' },
        'venue': { 
          required: true, 
          step: 4, 
          type: 'text',
          visible: (data) => data.mode !== 'Online'
        },
        'meeting_link': {
          required: true,
          step: 4,
          type: 'url',
          visible: (data) => data.mode !== 'Offline'
        },
        'registration_type': { required: true, step: 5, type: 'select' },
        'registration_mode': { required: true, step: 5, type: 'select' },
        'registration_fee': {
          required: false,
          step: 5,
          type: 'number',
          visible: (data) => data.registration_type === 'Paid'
        },
        'team_size_min': {
          required: false,
          step: 6,
          type: 'number',
          visible: (data) => data.registration_mode === 'Team'
        },
        'team_size_max': {
          required: false,
          step: 6,
          type: 'number',
          visible: (data) => data.registration_mode === 'Team'
        }
      },
      'team_registration': {
        'team_name': { required: true, step: 1, type: 'text' },
        'leader_name': { required: true, step: 2, type: 'text' },
        'leader_enrollment': { required: true, step: 2, type: 'text' },
        'leader_email': { required: true, step: 2, type: 'email' },
        'participants': {
          required: true,
          step: 3,
          type: 'participant-manager',
          visible: (data) => data.registration_mode === 'Team'
        }
      }
    };
    
    return configs[formType] || {};
  }, []);
  
  // Update visible fields based on form data
  useEffect(() => {
    const config = getFormFieldConfig(formType);
    const visible = [];
    const updatedConfigs = {};
    
    Object.entries(config).forEach(([fieldName, fieldConfig]) => {
      // Check if field should be visible
      const shouldShow = !fieldConfig.visible || fieldConfig.visible(formData);
      
      if (shouldShow) {
        visible.push(fieldName);
      }
      
      updatedConfigs[fieldName] = {
        ...fieldConfig,
        isVisible: shouldShow
      };
    });
    
    setVisibleFields(visible);
    setFieldConfigs(updatedConfigs);
  }, [formType, formData, getFormFieldConfig]);
  
  // Get fields for specific step
  const getStepFields = useCallback((step) => {
    return visibleFields.filter(fieldName => {
      return fieldConfigs[fieldName]?.step === step;
    });
  }, [visibleFields, fieldConfigs]);
  
  // Check if field is visible
  const isFieldVisible = useCallback((fieldName) => {
    return visibleFields.includes(fieldName);
  }, [visibleFields]);
  
  // Get field configuration
  const getFieldConfig = useCallback((fieldName) => {
    return fieldConfigs[fieldName] || {};
  }, [fieldConfigs]);
  
  return {
    visibleFields,
    fieldConfigs,
    getStepFields,
    isFieldVisible,
    getFieldConfig
  };
}

// ==================== EXPORT ALL HOOKS ====================

export default {
  useFormState,
  useParticipantManager,
  useUIState,
  useEventStatus,
  useDynamicFields
};

// Individual exports for convenience
export {
  useFormState,
  useParticipantManager,
  useUIState,
  useEventStatus,
  useDynamicFields
};
