import React, { useState, useRef, useEffect, forwardRef } from 'react';

const TextArea = forwardRef(({
  // Basic props
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
  
  // Resize behavior
  resize = 'vertical',
  autoResize = false,
  minRows = 3,
  maxRows = 10,
  
  // Character count
  maxLength,
  showCharCount = false,
  
  // Special features
  clearable = false,
  onClear,
  
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
  const [charCount, setCharCount] = useState(value?.length || defaultValue?.length || 0);
  const [currentRows, setCurrentRows] = useState(minRows);
  const textAreaRef = useRef(null);
  const actualRef = ref || textAreaRef;

  // Size variants
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-sm',
    lg: 'px-4 py-3 text-base'
  };

  // Variant styles
  const variantClasses = {
    default: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
    filled: 'bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-blue-500',
    outlined: 'border-2 border-gray-300 focus:border-blue-500 focus:ring-0',
    minimal: 'border-0 border-b-2 border-gray-300 focus:border-blue-500 rounded-none bg-transparent'
  };

  // Resize classes
  const resizeClasses = {
    none: 'resize-none',
    both: 'resize',
    horizontal: 'resize-x',
    vertical: 'resize-y'
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

  // Auto-resize functionality
  const adjustHeight = () => {
    if (autoResize && actualRef.current) {
      const textArea = actualRef.current;
      
      // Reset height to calculate scrollHeight
      textArea.style.height = 'auto';
      
      // Calculate the number of rows
      const lineHeight = parseInt(window.getComputedStyle(textArea).lineHeight);
      const newRows = Math.max(
        minRows,
        Math.min(maxRows, Math.ceil(textArea.scrollHeight / lineHeight))
      );
      
      setCurrentRows(newRows);
      textArea.style.height = `${newRows * lineHeight}px`;
    }
  };

  // Handle input change
  const handleChange = (e) => {
    const newValue = e.target.value;
    setCharCount(newValue.length);
    
    if (autoResize) {
      adjustHeight();
    }
    
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
      
      if (autoResize) {
        setCurrentRows(minRows);
        actualRef.current.style.height = 'auto';
      }
    }
  };

  // Handle key events for shortcuts
  const handleKeyDown = (e) => {
    // Ctrl+A to select all
    if (e.ctrlKey && e.key === 'a') {
      e.target.select();
    }
    
    if (onKeyDown) onKeyDown(e);
  };

  // Auto-resize on mount and value change
  useEffect(() => {
    if (autoResize) {
      adjustHeight();
    }
  }, [value, autoResize, minRows, maxRows]);

  // Calculate rows for non-auto-resize
  const getRows = () => {
    if (autoResize) {
      return currentRows;
    }
    return props.rows || minRows;
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

      {/* TextArea container */}
      <div className="relative">
        {/* TextArea field */}
        <textarea
          ref={actualRef}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onKeyPress={onKeyPress}
          onKeyUp={onKeyUp}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          maxLength={maxLength}
          rows={getRows()}
          autoFocus={autoFocus}
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          className={`
            w-full border rounded-lg shadow-sm transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-opacity-50
            ${sizeClasses[size]}
            ${getValidationClasses()}
            ${resizeClasses[resize]}
            ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'}
            ${readOnly ? 'bg-gray-50' : ''}
            ${focused ? 'ring-2 ring-opacity-20' : ''}
          `}
          style={{
            minHeight: autoResize ? `${minRows * 1.5}rem` : undefined,
            maxHeight: autoResize ? `${maxRows * 1.5}rem` : undefined
          }}
          {...props}
        />

        {/* Clear button */}
        {clearable && value && !disabled && !readOnly && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Clear textarea"
          >
            <i className="fas fa-times text-sm"></i>
          </button>
        )}

        {/* Validation icon */}
        {(error || success) && (
          <div className={`absolute top-3 right-3 ${error ? 'text-red-500' : 'text-green-500'}`}>
            <i className={`fas ${error ? 'fa-exclamation-circle' : 'fa-check-circle'} text-sm`}></i>
          </div>
        )}
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

      {/* Auto-resize indicator */}
      {autoResize && (
        <div className="text-xs text-gray-400 mt-1 flex items-center">
          <i className="fas fa-arrows-alt-v mr-1"></i>
          Auto-resizing ({currentRows} of {maxRows} rows)
        </div>
      )}
    </div>
  );
});

// Specialized textarea components
export const CommentTextArea = (props) => (
  <TextArea
    placeholder="Write your comment..."
    autoResize
    minRows={2}
    maxRows={6}
    showCharCount
    maxLength={500}
    {...props}
  />
);

export const DescriptionTextArea = (props) => (
  <TextArea
    placeholder="Enter description..."
    autoResize
    minRows={4}
    maxRows={12}
    showCharCount
    maxLength={2000}
    {...props}
  />
);

export const CodeTextArea = (props) => (
  <TextArea
    variant="filled"
    className="font-mono"
    placeholder="Enter code..."
    resize="both"
    {...props}
  />
);

TextArea.displayName = 'TextArea';

export default TextArea;
