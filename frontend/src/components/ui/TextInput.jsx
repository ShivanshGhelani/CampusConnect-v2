import React, { useState } from 'react';

const TextInput = ({ 
  id,
  name,
  type = "text",
  placeholder = "",
  value = "",
  onChange,
  onBlur,
  disabled = false,
  error = false,
  success = false,
  helperText = "",
  label = "",
  required = false,
  size = "md", // sm, md, lg
  variant = "default", // default, minimal
  icon = null,
  showPasswordToggle = false,
  showPassword = false, // Controlled from parent
  onTogglePassword = null, // Function to call when toggle is clicked
  className = "",
  inputClassName = "",
  loading = false,
  ...props
}) => {
  const [internalShowPassword, setInternalShowPassword] = useState(false);

  // Get size classes to match Dropdown component
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-2 text-sm';
      case 'lg':
        return 'px-4 py-4 text-base';
      default:
        return 'px-4 py-3 text-sm'; // Matches Dropdown component
    }
  };

  // Get variant classes to match Dropdown component
  const getVariantClasses = () => {
    switch (variant) {
      case 'minimal':
        return 'border-0 border-b-2 border-gray-300 rounded-none focus:border-blue-500 bg-transparent';
      default:
        return 'border-2 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white';
    }
  };

  // Get state-specific classes
  const getStateClasses = () => {
    if (error) {
      return 'border-red-400 focus:ring-red-500 focus:border-red-500';
    }
    if (success) {
      return 'border-green-400 focus:ring-green-500 focus:border-green-500';
    }
    return 'border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400';
  };

  const handlePasswordToggle = () => {
    if (onTogglePassword) {
      onTogglePassword(); // Use parent's toggle function
    } else {
      setInternalShowPassword(!internalShowPassword); // Internal state
    }
  };

  const passwordVisible = onTogglePassword ? showPassword : internalShowPassword;
  const inputType = type === 'password' && showPasswordToggle 
    ? (passwordVisible ? 'text' : 'password') 
    : type;

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="text-gray-400">
              {icon}
            </div>
          </div>
        )}
        
        <input
          id={id}
          name={name}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          required={required}
          className={`
            w-full transition-all duration-200 focus:outline-none
            ${getSizeClasses()}
            ${getVariantClasses()}
            ${getStateClasses()}
            ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}
            ${icon ? 'pl-10' : ''}
            ${showPasswordToggle || loading ? 'pr-10' : ''}
            ${inputClassName}
          `}
          {...props}
        />

        {/* Loading spinner */}
        {loading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
          </div>
        )}

        {/* Password toggle button */}
        {showPasswordToggle && !loading && (
          <button
            type="button"
            onClick={handlePasswordToggle}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i className={`fas ${passwordVisible ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
          </button>
        )}
      </div>

      {/* Helper Text */}
      {helperText && (
        <p className={`mt-1 text-xs ${error ? 'text-red-600' : success ? 'text-green-600' : 'text-gray-500'}`}>
          {helperText}
        </p>
      )}
    </div>
  );
};

export default TextInput;
