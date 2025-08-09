/**
 * Real-time Form Validation Component
 * Provides instant validation feedback without API calls
 * Replaces backend validation endpoints
 */

import React, { useState, useCallback, useEffect } from 'react';
import { validators, formUtils, ERROR_MESSAGES } from '../utils/validators';

/**
 * Validation Input Component with real-time feedback
 */
export const ValidatedInput = ({
  name,
  value,
  onChange,
  onBlur,
  validationRules = [],
  placeholder = '',
  type = 'text',
  className = '',
  autoFormat = false,
  showValidation = true,
  ...props
}) => {
  const [error, setError] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [touched, setTouched] = useState(false);

  // Validate field
  const validateField = useCallback((inputValue) => {
    if (!validationRules.length) return true;

    for (const rule of validationRules) {
      let isFieldValid;
      
      if (typeof rule === 'string') {
        isFieldValid = validators[rule](inputValue);
        if (!isFieldValid) {
          setError(ERROR_MESSAGES[rule.toUpperCase()] || `Invalid ${name}`);
          setIsValid(false);
          return false;
        }
      } else if (typeof rule === 'object') {
        const { validator, params = [], message } = rule;
        isFieldValid = validators[validator](inputValue, ...params);
        if (!isFieldValid) {
          setError(message || ERROR_MESSAGES[validator.toUpperCase()] || `Invalid ${name}`);
          setIsValid(false);
          return false;
        }
      }
    }

    setError('');
    setIsValid(true);
    return true;
  }, [validationRules, name]);

  // Handle input change
  const handleChange = (e) => {
    let newValue = e.target.value;

    // Auto-format based on field type
    if (autoFormat) {
      switch (name) {
        case 'enrollment_no':
        case 'enrollment_number':
          newValue = formUtils.formatEnrollmentNumber(newValue);
          break;
        case 'mobile_no':
        case 'mobile_number':
        case 'contact_no':
          newValue = formUtils.formatMobileNumber(newValue);
          break;
        case 'faculty_id':
        case 'employee_id':
          newValue = formUtils.formatFacultyId(newValue);
          break;
        case 'full_name':
        case 'name':
          newValue = formUtils.formatName(newValue);
          break;
      }
    }

    onChange(newValue);

    // Validate if field has been touched
    if (touched) {
      validateField(newValue);
    }
  };

  // Handle blur
  const handleBlur = (e) => {
    setTouched(true);
    validateField(e.target.value);
    if (onBlur) onBlur(e);
  };

  // Validation status classes
  const getValidationClasses = () => {
    if (!showValidation || !touched) return '';
    if (error) return 'border-red-500 focus:border-red-500';
    if (isValid) return 'border-green-500 focus:border-green-500';
    return '';
  };

  return (
    <div className="w-full">
      <input
        name={name}
        type={type}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`${className} ${getValidationClasses()}`}
        {...props}
      />
      
      {showValidation && touched && (
        <div className="mt-1 min-h-[20px]">
          {error && (
            <p className="text-sm text-red-600 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          )}
          {isValid && !error && (
            <p className="text-sm text-green-600 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Valid
            </p>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Password Strength Indicator Component
 */
export const PasswordStrengthIndicator = ({ password, showRequirements = true }) => {
  const [strength, setStrength] = useState({ valid: false, score: 0, feedback: [], strength: 'weak' });

  useEffect(() => {
    const result = validators.passwordStrength(password);
    setStrength(result);
  }, [password]);

  const getStrengthColor = () => {
    switch (strength.strength) {
      case 'weak': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'strong': return 'bg-green-500';
      default: return 'bg-gray-300';
    }
  };

  const getStrengthWidth = () => {
    return `${(strength.score / 5) * 100}%`;
  };

  return (
    <div className="mt-2">
      {/* Strength Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor()}`}
          style={{ width: getStrengthWidth() }}
        />
      </div>
      
      {/* Strength Label */}
      <div className="flex justify-between items-center mt-1">
        <span className="text-sm text-gray-600">Password Strength:</span>
        <span className={`text-sm font-medium ${
          strength.strength === 'weak' ? 'text-red-600' :
          strength.strength === 'medium' ? 'text-yellow-600' :
          'text-green-600'
        }`}>
          {strength.strength.charAt(0).toUpperCase() + strength.strength.slice(1)}
        </span>
      </div>

      {/* Requirements */}
      {showRequirements && password && (
        <div className="mt-2 space-y-1">
          {strength.feedback.map((requirement, index) => (
            <div key={index} className="flex items-center text-sm text-gray-600">
              <svg className="w-3 h-3 mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {requirement}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * File Upload Validator Component
 */
export const ValidatedFileUpload = ({
  name,
  accept,
  maxSizeMB = 5,
  allowedTypes = [],
  onChange,
  className = '',
  ...props
}) => {
  const [error, setError] = useState('');
  const [isValid, setIsValid] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setError('');
    setIsValid(false);

    if (!file) {
      onChange(null);
      return;
    }

    // Validate file size
    if (!validators.fileSize(file, maxSizeMB)) {
      setError(`File size must be less than ${maxSizeMB}MB`);
      return;
    }

    // Validate file type
    if (allowedTypes.length > 0 && !validators.fileType(file, allowedTypes)) {
      setError(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
      return;
    }

    setIsValid(true);
    onChange(file);
  };

  return (
    <div className="w-full">
      <input
        name={name}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className={`${className} ${error ? 'border-red-500' : isValid ? 'border-green-500' : ''}`}
        {...props}
      />
      
      {error && (
        <p className="mt-1 text-sm text-red-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      
      {isValid && (
        <p className="mt-1 text-sm text-green-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          File is valid
        </p>
      )}
    </div>
  );
};

/**
 * Form Step Validator Component
 */
export const FormStepValidator = ({
  data,
  validationRules,
  onValidationChange,
  children
}) => {
  const [isStepValid, setIsStepValid] = useState(false);
  const [stepErrors, setStepErrors] = useState({});

  useEffect(() => {
    const validateStep = () => {
      const errors = {};
      let valid = true;

      Object.keys(validationRules).forEach(fieldName => {
        const rules = validationRules[fieldName];
        const value = data[fieldName];

        for (const rule of rules) {
          let isFieldValid;
          
          if (typeof rule === 'string') {
            isFieldValid = validators[rule](value);
          } else if (typeof rule === 'object') {
            const { validator, params = [] } = rule;
            isFieldValid = validators[validator](value, ...params);
          }

          if (!isFieldValid) {
            errors[fieldName] = ERROR_MESSAGES[rule.toUpperCase()] || `Invalid ${fieldName}`;
            valid = false;
            break;
          }
        }
      });

      setStepErrors(errors);
      setIsStepValid(valid);
      
      if (onValidationChange) {
        onValidationChange(valid, errors);
      }
    };

    validateStep();
  }, [data, validationRules, onValidationChange]);

  return (
    <div className="form-step">
      {children}
      
      {/* Step validation summary */}
      {Object.keys(stepErrors).length > 0 && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="text-red-800 font-medium mb-2">Please fix the following errors:</h4>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {Object.entries(stepErrors).map(([field, error]) => (
              <li key={field}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

/**
 * Real-time Enrollment Validator (without API calls)
 */
export const EnrollmentValidator = ({ value, onChange, onValidation, ...props }) => {
  const [validationState, setValidationState] = useState({
    isValid: false,
    error: '',
    semester: '',
    year: ''
  });

  useEffect(() => {
    if (!value) {
      setValidationState({ isValid: false, error: '', semester: '', year: '' });
      return;
    }

    // Format and validate enrollment number
    const formatted = formUtils.formatEnrollmentNumber(value);
    const isValid = validators.enrollmentNumber(formatted);

    let semester = '';
    let year = '';
    let error = '';

    if (isValid) {
      // Extract semester from enrollment (assuming last digit indicates semester)
      const lastDigit = parseInt(formatted.slice(-1), 10);
      if (lastDigit >= 1 && lastDigit <= 8) {
        semester = lastDigit.toString();
        year = formUtils.calculateYear(semester);
      }
    } else {
      error = 'Invalid enrollment number format (e.g., 21BECE40015)';
    }

    const newState = { isValid, error, semester, year };
    setValidationState(newState);
    
    if (onValidation) {
      onValidation(newState);
    }
  }, [value, onValidation]);

  return (
    <ValidatedInput
      value={value}
      onChange={onChange}
      validationRules={['enrollmentNumber']}
      autoFormat={true}
      placeholder="e.g., 21BECE40015"
      {...props}
    />
  );
};

export default {
  ValidatedInput,
  PasswordStrengthIndicator,
  ValidatedFileUpload,
  FormStepValidator,
  EnrollmentValidator
};
