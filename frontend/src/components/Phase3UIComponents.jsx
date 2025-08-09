/**
 * PHASE 3: ADVANCED UI COMPONENTS
 * 
 * React components that leverage the UI State Management system
 * to provide dynamic forms, real-time updates, and optimized user experience
 * without requiring frequent API calls.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  useFormState, 
  useParticipantManager, 
  useUIState, 
  useEventStatus,
  useDynamicFields 
} from '../hooks/useUIState.js';

// ==================== DYNAMIC FORM COMPONENT ====================

/**
 * Advanced dynamic form that adapts based on form type and conditional logic
 */
export function DynamicForm({ 
  formType, 
  initialData = {}, 
  onSubmit, 
  onStepChange,
  className = '' 
}) {
  const {
    formData,
    currentStep,
    totalSteps,
    isDirty,
    isSubmitting,
    errors,
    updateField,
    validateField,
    nextStep,
    previousStep,
    submitForm,
    getFieldError,
    hasFieldError,
    getProgress
  } = useFormState(formType, initialData);

  const {
    visibleFields,
    getStepFields,
    isFieldVisible,
    getFieldConfig
  } = useDynamicFields(formType, formData);

  const { showNotification } = useUIState();

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    try {
      const submissionData = await submitForm();
      
      if (onSubmit) {
        await onSubmit(submissionData);
      }
      
      showNotification({
        type: 'success',
        title: 'Form Submitted',
        message: 'Your form has been submitted successfully!'
      });
      
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Submission Failed',
        message: error.message || 'Failed to submit form'
      });
    }
  }, [submitForm, onSubmit, showNotification]);

  // Handle step navigation
  const handleNextStep = useCallback(() => {
    if (nextStep()) {
      if (onStepChange) {
        onStepChange(currentStep + 1, 'next');
      }
    }
  }, [nextStep, currentStep, onStepChange]);

  const handlePreviousStep = useCallback(() => {
    if (previousStep()) {
      if (onStepChange) {
        onStepChange(currentStep - 1, 'previous');
      }
    }
  }, [previousStep, currentStep, onStepChange]);

  // Get current step fields
  const currentStepFields = getStepFields(currentStep);

  return (
    <div className={`dynamic-form ${className}`}>
      {/* Progress Indicator */}
      <div className="form-progress mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Step {currentStep} of {totalSteps}
          </span>
          <span className="text-sm text-gray-500">
            {getProgress()}% Complete
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${getProgress()}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Dynamic Fields for Current Step */}
        <div className="form-step">
          {currentStepFields.map(fieldName => (
            <DynamicField
              key={fieldName}
              fieldName={fieldName}
              fieldConfig={getFieldConfig(fieldName)}
              value={formData[fieldName] || ''}
              onChange={(value) => updateField(fieldName, value)}
              onBlur={() => validateField(fieldName)}
              error={getFieldError(fieldName)}
              hasError={hasFieldError(fieldName)}
              isVisible={isFieldVisible(fieldName)}
            />
          ))}
        </div>

        {/* Navigation Buttons */}
        <div className="form-navigation flex justify-between mt-8">
          <button
            type="button"
            onClick={handlePreviousStep}
            disabled={currentStep === 1}
            className="px-4 py-2 text-gray-600 bg-gray-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors"
          >
            Previous
          </button>

          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          )}
        </div>

        {/* Form Status */}
        {isDirty && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              You have unsaved changes. They will be automatically saved.
            </p>
          </div>
        )}
      </form>
    </div>
  );
}

// ==================== DYNAMIC FIELD COMPONENT ====================

/**
 * Dynamic field component that renders different input types based on configuration
 */
function DynamicField({ 
  fieldName, 
  fieldConfig, 
  value, 
  onChange, 
  onBlur, 
  error, 
  hasError, 
  isVisible 
}) {
  if (!isVisible) return null;

  const {
    type = 'text',
    required = false,
    placeholder = '',
    options = []
  } = fieldConfig;

  const baseInputClass = `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    hasError ? 'border-red-500' : 'border-gray-300'
  }`;

  const renderField = () => {
    switch (type) {
      case 'text':
      case 'email':
      case 'url':
      case 'number':
        return (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            required={required}
            className={baseInputClass}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            required={required}
            rows={4}
            className={baseInputClass}
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            required={required}
            className={baseInputClass}
          >
            <option value="">Select {fieldName.replace('_', ' ')}</option>
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'datetime':
        return (
          <input
            type="datetime-local"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            required={required}
            className={baseInputClass}
          />
        );

      case 'participant-manager':
        return <ParticipantManagerComponent onChange={onChange} value={value} />;

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            required={required}
            className={baseInputClass}
          />
        );
    }
  };

  return (
    <div className="form-field mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {renderField()}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

// ==================== PARTICIPANT MANAGER COMPONENT ====================

/**
 * Advanced participant management component for team registrations
 */
export function ParticipantManagerComponent({ 
  eventConfig = {}, 
  onChange, 
  value = null,
  className = '' 
}) {
  const {
    leader,
    participants,
    teamSize,
    isValid,
    validation,
    addParticipant,
    removeParticipant,
    updateParticipant,
    setLeader,
    canAddParticipant,
    canRemoveParticipant
  } = useParticipantManager(eventConfig);

  const { showNotification } = useUIState();

  // Notify parent component of changes
  useEffect(() => {
    if (onChange) {
      onChange({
        leader,
        participants,
        teamSize,
        isValid,
        validation
      });
    }
  }, [leader, participants, teamSize, isValid, validation, onChange]);

  // Handle adding participant
  const handleAddParticipant = useCallback(() => {
    try {
      addParticipant();
      showNotification({
        type: 'success',
        title: 'Participant Added',
        message: 'New participant slot added to your team'
      });
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Cannot Add Participant',
        message: error.message
      });
    }
  }, [addParticipant, showNotification]);

  // Handle removing participant
  const handleRemoveParticipant = useCallback((participantId) => {
    try {
      removeParticipant(participantId);
      showNotification({
        type: 'info',
        title: 'Participant Removed',
        message: 'Participant removed from team'
      });
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Cannot Remove Participant',
        message: error.message
      });
    }
  }, [removeParticipant, showNotification]);

  return (
    <div className={`participant-manager ${className}`}>
      {/* Team Status */}
      <div className="team-status mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium text-gray-900">
            Team Management
          </h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            isValid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {teamSize} / {validation.requiredSize} members
          </span>
        </div>
        
        {!isValid && validation.issues.length > 0 && (
          <div className="text-sm text-yellow-700">
            <ul className="list-disc list-inside">
              {validation.issues.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Team Leader Section */}
      <div className="team-leader mb-6">
        <h4 className="text-md font-medium text-gray-900 mb-3">Team Leader</h4>
        <ParticipantForm
          participant={leader}
          onUpdate={(updates) => setLeader({ ...leader, ...updates })}
          isLeader={true}
        />
      </div>

      {/* Team Participants Section */}
      <div className="team-participants">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-md font-medium text-gray-900">Team Members</h4>
          <button
            type="button"
            onClick={handleAddParticipant}
            disabled={!canAddParticipant()}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add Member
          </button>
        </div>

        {participants.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No team members added yet. Click "Add Member" to start building your team.
          </div>
        ) : (
          <div className="space-y-4">
            {participants.map((participant, index) => (
              <div key={participant.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <h5 className="font-medium text-gray-900">
                    Member {index + 1}
                  </h5>
                  <button
                    type="button"
                    onClick={() => handleRemoveParticipant(participant.id)}
                    disabled={!canRemoveParticipant()}
                    className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Remove
                  </button>
                </div>
                <ParticipantForm
                  participant={participant}
                  onUpdate={(updates) => updateParticipant(participant.id, updates)}
                  isLeader={false}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== PARTICIPANT FORM COMPONENT ====================

/**
 * Individual participant form with validation
 */
function ParticipantForm({ participant, onUpdate, isLeader = false }) {
  const [localData, setLocalData] = useState(participant || {});

  // Update local data when participant changes
  useEffect(() => {
    setLocalData(participant || {});
  }, [participant]);

  // Handle field updates
  const handleFieldUpdate = useCallback((field, value) => {
    const updatedData = { ...localData, [field]: value };
    setLocalData(updatedData);
    
    // Debounce updates to parent
    const timeoutId = setTimeout(() => {
      onUpdate(updatedData);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [localData, onUpdate]);

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="participant-form grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={localData.name || ''}
          onChange={(e) => handleFieldUpdate('name', e.target.value)}
          placeholder="Full name"
          className={inputClass}
        />
        {localData.errors?.includes('Name must be at least 2 characters') && (
          <p className="text-sm text-red-600 mt-1">Name must be at least 2 characters</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Enrollment Number <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={localData.enrollment || ''}
          onChange={(e) => handleFieldUpdate('enrollment', e.target.value.toUpperCase())}
          placeholder="e.g., 23CSAI4041"
          className={inputClass}
        />
        {localData.errors?.includes('Invalid enrollment number format') && (
          <p className="text-sm text-red-600 mt-1">Invalid enrollment number format</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          value={localData.email || ''}
          onChange={(e) => handleFieldUpdate('email', e.target.value)}
          placeholder="email@example.com"
          className={inputClass}
        />
        {localData.errors?.includes('Invalid email format') && (
          <p className="text-sm text-red-600 mt-1">Invalid email format</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Mobile Number <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          value={localData.mobile || ''}
          onChange={(e) => handleFieldUpdate('mobile', e.target.value.replace(/\D/g, ''))}
          placeholder="1234567890"
          maxLength={10}
          className={inputClass}
        />
        {localData.errors?.includes('Invalid mobile number') && (
          <p className="text-sm text-red-600 mt-1">Mobile number must be 10 digits</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Semester <span className="text-red-500">*</span>
        </label>
        <select
          value={localData.semester || ''}
          onChange={(e) => handleFieldUpdate('semester', parseInt(e.target.value))}
          className={inputClass}
        >
          <option value="">Select semester</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
            <option key={sem} value={sem}>Semester {sem}</option>
          ))}
        </select>
        {localData.errors?.includes('Semester must be between 1 and 8') && (
          <p className="text-sm text-red-600 mt-1">Please select a valid semester</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Department <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={localData.department || ''}
          onChange={(e) => handleFieldUpdate('department', e.target.value)}
          placeholder="e.g., Computer Science"
          className={inputClass}
        />
      </div>
    </div>
  );
}

// ==================== REAL-TIME EVENT STATUS COMPONENT ====================

/**
 * Real-time event status display with live updates
 */
export function EventStatusDisplay({ eventData, className = '' }) {
  const { status, timeRemaining, registrationStatus } = useEventStatus(eventData, {
    updateInterval: 1000,
    autoUpdate: true
  });

  if (!eventData || !status) {
    return (
      <div className={`event-status ${className}`}>
        <div className="animate-pulse bg-gray-200 h-6 rounded"></div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      'registration_not_started': 'bg-gray-100 text-gray-800',
      'registration_open': 'bg-green-100 text-green-800',
      'registration_closed': 'bg-yellow-100 text-yellow-800',
      'event_started': 'bg-blue-100 text-blue-800',
      'event_ended': 'bg-purple-100 text-purple-800',
      'certificate_available': 'bg-emerald-100 text-emerald-800'
    };
    return colors[status.subStatus] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className={`event-status ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
            {status.subStatus.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </span>
          
          {timeRemaining && (
            <div className="text-sm text-gray-600">
              <CountdownTimer timeRemaining={timeRemaining} />
            </div>
          )}
        </div>

        {registrationStatus && (
          <div className="text-sm text-gray-500">
            Registration: {registrationStatus.isOpen ? 'Open' : 'Closed'}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== COUNTDOWN TIMER COMPONENT ====================

/**
 * Live countdown timer component
 */
function CountdownTimer({ timeRemaining }) {
  const [display, setDisplay] = useState('');

  useEffect(() => {
    const updateDisplay = () => {
      if (timeRemaining <= 0) {
        setDisplay('Event started');
        return;
      }

      const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

      if (days > 0) {
        setDisplay(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setDisplay(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setDisplay(`${minutes}m ${seconds}s`);
      } else {
        setDisplay(`${seconds}s`);
      }
    };

    updateDisplay();
    const interval = setInterval(updateDisplay, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining]);

  return <span className="font-mono">{display}</span>;
}

// ==================== NOTIFICATION SYSTEM COMPONENT ====================

/**
 * Global notification system
 */
export function NotificationSystem() {
  const { notifications, dismissNotification } = useUIState();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={() => dismissNotification(notification.id)}
        />
      ))}
    </div>
  );
}

function NotificationItem({ notification, onDismiss }) {
  const getNotificationColor = (type) => {
    const colors = {
      'success': 'bg-green-50 border-green-200 text-green-800',
      'error': 'bg-red-50 border-red-200 text-red-800',
      'warning': 'bg-yellow-50 border-yellow-200 text-yellow-800',
      'info': 'bg-blue-50 border-blue-200 text-blue-800'
    };
    return colors[type] || colors.info;
  };

  return (
    <div className={`p-4 border rounded-lg shadow-lg ${getNotificationColor(notification.type)}`}>
      <div className="flex justify-between items-start">
        <div>
          {notification.title && (
            <h4 className="font-medium mb-1">{notification.title}</h4>
          )}
          <p className="text-sm">{notification.message}</p>
        </div>
        <button
          onClick={onDismiss}
          className="ml-3 text-gray-400 hover:text-gray-600 focus:outline-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}

// ==================== EXPORT ALL COMPONENTS ====================

export default {
  DynamicForm,
  ParticipantManagerComponent,
  EventStatusDisplay,
  NotificationSystem
};

export {
  DynamicForm,
  ParticipantManagerComponent,
  EventStatusDisplay,
  NotificationSystem
};
