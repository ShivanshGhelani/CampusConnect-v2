import React from 'react';

const Checkbox = ({
  id,
  name,
  checked = false,
  onChange,
  label,
  description,
  disabled = false,
  error,
  className = '',
  size = 'md', // sm, md, lg
  variant = 'default', // default, primary, success, warning, danger
  ...props
}) => {
  // Size classes
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  // Variant classes
  const variantClasses = {
    default: 'text-blue-600 focus:ring-blue-500',
    primary: 'text-blue-600 focus:ring-blue-500',
    success: 'text-green-600 focus:ring-green-500',
    warning: 'text-yellow-600 focus:ring-yellow-500',
    danger: 'text-red-600 focus:ring-red-500'
  };

  // Label size classes
  const labelSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const handleChange = (e) => {
    if (onChange) {
      onChange(e.target.checked, e);
    }
  };

  return (
    <div className={`flex items-start space-x-3 ${className}`}>
      <div className="flex items-center h-5">
        <input
          id={id || name}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          className={`
            ${sizeClasses[size]}
            ${variantClasses[variant]}
            bg-gray-100 border-gray-300 rounded focus:ring-2 focus:ring-offset-0
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-red-300 text-red-600 focus:ring-red-500' : ''}
          `}
          {...props}
        />
      </div>
      
      {(label || description) && (
        <div className="flex-1">
          {label && (
            <label
              htmlFor={id || name}
              className={`
                block font-medium text-gray-700 cursor-pointer
                ${labelSizeClasses[size]}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                ${error ? 'text-red-700' : ''}
              `}
            >
              {label}
            </label>
          )}
          
          {description && (
            <p className={`
              text-gray-500 mt-1
              ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-xs'}
              ${disabled ? 'opacity-50' : ''}
            `}>
              {description}
            </p>
          )}
          
          {error && (
            <p className="text-xs text-red-600 mt-1">{error}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Checkbox;
