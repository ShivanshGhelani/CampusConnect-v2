import React, { useState, useRef, forwardRef } from 'react';

const Input = forwardRef(({
  // Basic props
  type = 'text',
  value,
  defaultValue,
  onChange,
  placeholder,
  disabled = false,
  readOnly = false,
  required = false,
  
  // Styling props
  size = 'md',
  variant = 'default',
  className = '',
  
  // Label and help text
  label,
  helpText,
  
  // Validation
  error,
  success,
  
  // Icons
  leftIcon,
  rightIcon,
  
  // Input group
  prefix,
  suffix,
  
  // Character count
  maxLength,
  showCharCount = false,
  
  // Special features
  clearable = false,
  onClear,
  
  // Password specific
  showPasswordToggle = false,
  
  // Number specific
  min,
  max,
  step,
  
  // Focus management
  autoFocus = false,
  selectOnFocus = false,
  
  // Events
  onFocus,
  onBlur,
  onKeyDown,
  onKeyPress,
  onKeyUp,
  
  // Accessibility
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  
  ...props
}, ref) => {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [charCount, setCharCount] = useState(value?.length || defaultValue?.length || 0);
  const inputRef = useRef(null);
  const actualRef = ref || inputRef;

  // Size variants
  const sizeClasses = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-4 text-base'
  };

  // Variant styles
  const variantClasses = {
    default: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
    filled: 'bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-blue-500',
    outlined: 'border-2 border-gray-300 focus:border-blue-500 focus:ring-0',
    minimal: 'border-0 border-b-2 border-gray-300 focus:border-blue-500 rounded-none bg-transparent'
  };

  // Get validation classes
  const getValidationClasses = () => {
    if (error) {
      return 'border-red-300 focus:border-red-500 focus:ring-red-500';
    }
    if (success) {
      return 'border-green-300 focus:border-green-500 focus:ring-green-500';
    }
    return variantClasses[variant];
  };

  // Handle input change
  const handleChange = (e) => {
    const newValue = e.target.value;
    setCharCount(newValue.length);
    if (onChange) onChange(e);
  };

  // Handle focus
  const handleFocus = (e) => {
    setFocused(true);
    if (selectOnFocus) {
      e.target.select();
    }
    if (onFocus) onFocus(e);
  };

  // Handle blur
  const handleBlur = (e) => {
    setFocused(false);
    if (onBlur) onBlur(e);
  };

  // Handle clear
  const handleClear = () => {
    if (actualRef.current) {
      actualRef.current.value = '';
      actualRef.current.focus();
      
      // Create synthetic event for onChange
      const event = {
        target: actualRef.current,
        currentTarget: actualRef.current
      };
      
      setCharCount(0);
      if (onChange) onChange(event);
      if (onClear) onClear();
    }
  };

  // Handle password toggle
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Determine input type
  const getInputType = () => {
    if (type === 'password' && showPasswordToggle) {
      return showPassword ? 'text' : 'password';
    }
    return type;
  };

  // Calculate padding for icons
  const getInputPadding = () => {
    let leftPadding = sizeClasses[size].includes('px-3') ? 'pl-3' : 'pl-4';
    let rightPadding = sizeClasses[size].includes('px-3') ? 'pr-3' : 'pr-4';

    if (leftIcon || prefix) {
      leftPadding = size === 'sm' ? 'pl-10' : size === 'lg' ? 'pl-12' : 'pl-11';
    }

    if (rightIcon || suffix || clearable || showPasswordToggle || (type === 'number')) {
      rightPadding = size === 'sm' ? 'pr-10' : size === 'lg' ? 'pr-12' : 'pr-11';
    }

    return `${leftPadding} ${rightPadding}`;
  };

  return (
    <div className={`${className}`}>
      {/* Label */}
      {label && (
        <label 
          htmlFor={props.id}
          className={`block text-sm font-medium mb-1 ${
            error ? 'text-red-700' : success ? 'text-green-700' : 'text-gray-700'
          }`}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Input container */}
      <div className="relative">
        {/* Prefix */}
        {prefix && (
          <div className={`absolute left-0 top-0 ${sizeClasses[size].replace(/px-\d+/, 'pl-3')} flex items-center pointer-events-none`}>
            <span className="text-gray-500 text-sm">{prefix}</span>
          </div>
        )}

        {/* Left icon */}
        {leftIcon && (
          <div className={`absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none`}>
            {leftIcon}
          </div>
        )}

        {/* Input field */}
        <input
          ref={actualRef}
          type={getInputType()}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={onKeyDown}
          onKeyPress={onKeyPress}
          onKeyUp={onKeyUp}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          maxLength={maxLength}
          min={min}
          max={max}
          step={step}
          autoFocus={autoFocus}
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          className={`
            w-full border rounded-lg shadow-sm transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-opacity-50
            ${sizeClasses[size].replace(/px-\d+/, '')}
            ${getInputPadding()}
            ${getValidationClasses()}
            ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'}
            ${readOnly ? 'bg-gray-50' : ''}
            ${focused ? 'ring-2 ring-opacity-20' : ''}
          `}
          {...props}
        />

        {/* Right side elements */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {/* Clear button */}
          {clearable && value && !disabled && !readOnly && (
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear input"
            >
              <i className="fas fa-times text-sm"></i>
            </button>
          )}

          {/* Password toggle */}
          {type === 'password' && showPasswordToggle && (
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
            </button>
          )}

          {/* Right icon */}
          {rightIcon && (
            <div className="text-gray-400">
              {rightIcon}
            </div>
          )}

          {/* Suffix */}
          {suffix && (
            <span className="text-gray-500 text-sm">{suffix}</span>
          )}

          {/* Validation icon */}
          {(error || success) && (
            <div className={error ? 'text-red-500' : 'text-green-500'}>
              <i className={`fas ${error ? 'fa-exclamation-circle' : 'fa-check-circle'} text-sm`}></i>
            </div>
          )}
        </div>
      </div>

      {/* Help text and character count */}
      <div className="flex justify-between items-center mt-1">
        <div className="flex-1">
          {/* Help text */}
          {helpText && !error && (
            <p className="text-xs text-gray-500">{helpText}</p>
          )}
          
          {/* Error message */}
          {error && (
            <p className="text-xs text-red-600 flex items-center">
              <i className="fas fa-exclamation-circle mr-1"></i>
              {error}
            </p>
          )}
          
          {/* Success message */}
          {success && (
            <p className="text-xs text-green-600 flex items-center">
              <i className="fas fa-check-circle mr-1"></i>
              {success}
            </p>
          )}
        </div>

        {/* Character count */}
        {showCharCount && maxLength && (
          <div className={`text-xs ${
            charCount > maxLength * 0.9 ? 'text-red-500' : 'text-gray-500'
          }`}>
            {charCount}/{maxLength}
          </div>
        )}
      </div>
    </div>
  );
});

// Specialized input components
export const PasswordInput = (props) => (
  <Input type="password" showPasswordToggle {...props} />
);

export const EmailInput = (props) => (
  <Input 
    type="email" 
    leftIcon={<i className="fas fa-envelope text-sm"></i>}
    {...props} 
  />
);

export const SearchInput = (props) => (
  <Input 
    type="search" 
    leftIcon={<i className="fas fa-search text-sm"></i>}
    clearable
    {...props} 
  />
);

export const NumberInput = (props) => (
  <Input type="number" {...props} />
);

export const UrlInput = (props) => (
  <Input 
    type="url" 
    leftIcon={<i className="fas fa-link text-sm"></i>}
    {...props} 
  />
);

export const PhoneInput = (props) => (
  <Input 
    type="tel" 
    leftIcon={<i className="fas fa-phone text-sm"></i>}
    {...props} 
  />
);

Input.displayName = 'Input';

export default Input;
