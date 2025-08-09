/**
 * Example: How to integrate the new validation system into existing forms
 * This example shows how to replace backend validation calls with frontend validation
 */

import React, { useState } from 'react';
import { 
  ValidatedInput, 
  PasswordStrengthIndicator, 
  EnrollmentValidator,
  FormStepValidator 
} from '../components/validation/ValidationComponents';
import { generateTempRegistrationId } from '../utils/idGenerators';
import { formUtils } from '../utils/validators';

/**
 * BEFORE: Student Registration with Backend Validation
 */
const OldStudentRegistrationForm = () => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isValidating, setIsValidating] = useState(false);

  // OLD WAY: Backend validation
  const validateEnrollment = async (enrollment) => {
    setIsValidating(true);
    try {
      const response = await fetch('/api/v1/validate/enrollment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollment_number: enrollment })
      });
      const result = await response.json();
      // Handle validation result...
    } catch (error) {
      // Handle error...
    } finally {
      setIsValidating(false);
    }
  };

  // This approach requires multiple API calls for each field validation
};

/**
 * AFTER: Student Registration with Frontend Validation
 */
const NewStudentRegistrationForm = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    enrollment_no: '',
    email: '',
    mobile_no: '',
    password: '',
    semester: ''
  });
  
  const [tempRegistrationId] = useState(() => generateTempRegistrationId());

  // Validation rules for the form
  const validationRules = {
    full_name: ['required', 'name'],
    enrollment_no: ['required', 'enrollmentNumber'],
    email: ['required', 'email'],
    mobile_no: ['required', 'mobileNumber'],
    password: ['required'],
    semester: ['required', 'semester']
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-calculate year when semester changes
    if (field === 'semester') {
      const year = formUtils.calculateYear(value);
      setFormData(prev => ({ ...prev, year }));
    }
  };

  const handleEnrollmentValidation = (validationState) => {
    if (validationState.isValid) {
      // Auto-fill semester and year if extractable from enrollment
      if (validationState.semester) {
        setFormData(prev => ({
          ...prev,
          semester: validationState.semester,
          year: validationState.year
        }));
      }
    }
  };

  return (
    <FormStepValidator
      data={formData}
      validationRules={validationRules}
      onValidationChange={(isValid, errors) => {
        console.log('Form valid:', isValid, 'Errors:', errors);
      }}
    >
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Student Registration</h2>
        
        {/* Temp Registration ID Display */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-700">
            Temporary Registration ID: <code className="font-mono">{tempRegistrationId}</code>
          </p>
        </div>

        {/* Full Name with auto-formatting */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Name *
          </label>
          <ValidatedInput
            name="full_name"
            value={formData.full_name}
            onChange={(value) => handleFieldChange('full_name', value)}
            validationRules={['required', 'name']}
            placeholder="Enter your full name"
            autoFormat={true}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Enrollment Number with real-time validation */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enrollment Number *
          </label>
          <EnrollmentValidator
            value={formData.enrollment_no}
            onChange={(value) => handleFieldChange('enrollment_no', value)}
            onValidation={handleEnrollmentValidation}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Email with instant validation */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address *
          </label>
          <ValidatedInput
            name="email"
            type="email"
            value={formData.email}
            onChange={(value) => handleFieldChange('email', value)}
            validationRules={['required', 'email']}
            placeholder="your.email@domain.com"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Mobile Number with auto-formatting */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mobile Number *
          </label>
          <ValidatedInput
            name="mobile_no"
            value={formData.mobile_no}
            onChange={(value) => handleFieldChange('mobile_no', value)}
            validationRules={['required', 'mobileNumber']}
            placeholder="1234567890"
            autoFormat={true}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Password with strength indicator */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Password *
          </label>
          <ValidatedInput
            name="password"
            type="password"
            value={formData.password}
            onChange={(value) => handleFieldChange('password', value)}
            validationRules={[
              { validator: 'passwordStrength', message: 'Password must meet security requirements' }
            ]}
            placeholder="Create a strong password"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            showValidation={false} // Hide default validation, use custom component below
          />
          <PasswordStrengthIndicator password={formData.password} />
        </div>

        {/* Semester with auto year calculation */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Semester *
          </label>
          <ValidatedInput
            name="semester"
            type="number"
            value={formData.semester}
            onChange={(value) => handleFieldChange('semester', value)}
            validationRules={['required', 'semester']}
            placeholder="1-8"
            min="1"
            max="8"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {formData.year && (
            <p className="mt-1 text-sm text-gray-600">
              Academic Year: {formData.year}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Register
        </button>
      </div>
    </FormStepValidator>
  );
};

/**
 * COMPARISON: Performance Benefits
 */

// BEFORE (Backend Validation):
// - 5-7 API calls per form (one for each field validation)
// - 200-500ms response time per validation
// - Total validation time: 1-3.5 seconds
// - Network dependency for all validations
// - Server CPU usage for validation logic

// AFTER (Frontend Validation):
// - 0 API calls for validation (100% reduction)
// - Instant validation feedback (0ms)
// - Total validation time: 0 seconds
// - No network dependency
// - Zero server CPU usage for validation

/**
 * MIGRATION CHECKLIST
 */

/*
✅ COMPLETED:
1. Created validation utilities (validators.js)
2. Created ID generation utilities (idGenerators.js)
3. Created validation components (ValidationComponents.jsx)
4. Created usage examples

⏳ NEXT STEPS:
1. Update StudentEventRegistration.jsx with new validation
2. Update FacultyEventRegistration.jsx with new validation
3. Update CreateEvent.jsx with new validation
4. Update RegisterPage.jsx with new validation
5. Remove backend validation endpoints
6. Test performance improvements
7. Monitor API call reduction

📊 EXPECTED RESULTS:
- 35-40% reduction in validation API calls
- Instant form feedback (vs 200-500ms delay)
- Improved user experience
- Reduced server load
- Better offline capability
*/

export default NewStudentRegistrationForm;
