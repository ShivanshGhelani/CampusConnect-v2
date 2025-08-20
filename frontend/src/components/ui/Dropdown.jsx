import React, { useState, useRef, useEffect } from 'react';

const Dropdown = ({ 
  placeholder = "Select an option",
  options = [],
  value = "",
  onChange,
  disabled = false,
  error = false,
  helperText = "",
  label = "",
  required = false,
  size = "md", // sm, md, lg
  variant = "default", // default, minimal
  icon = null,
  clearable = false,
  searchable = false,
  className = "",
  dropdownClassName = "",
  optionClassName = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  // Filter options based on search term
  const filteredOptions = searchable && searchTerm
    ? options.filter(option => 
        option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        option.value.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  // Get size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-2 text-sm';
      case 'lg':
        return 'px-4 py-4 text-base';
      default:
        return 'px-4 py-3 text-sm'; // Changed to match text inputs
    }
  };

  // Get variant classes
  const getVariantClasses = () => {
    switch (variant) {
      case 'minimal':
        return 'border-0 border-b-2 border-gray-300 rounded-none focus:border-blue-500 bg-transparent';
      default:
        return 'border-2 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white';
    }
  };

  const handleSelect = (option) => {
    onChange(option.value);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
    setSearchTerm("");
  };

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            w-full text-left flex items-center justify-between transition-all duration-200
            ${getSizeClasses()}
            ${getVariantClasses()}
            ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
            ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'hover:border-gray-400 cursor-pointer'}
            ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
          `}
        >
          <div className="flex items-center flex-1 min-w-0">
            {icon && (
              <div className="flex-shrink-0 mr-2 text-gray-400">
                {icon}
              </div>
            )}
            <span className={`block truncate ${selectedOption ? 'text-gray-900' : 'text-gray-500'}`}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>
          
          <div className="flex items-center ml-2">
            {clearable && value && !disabled && (
              <button
                onClick={handleClear}
                className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                type="button"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            )}
            <div className={`flex-shrink-0 ml-1 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
              <i className="fas fa-chevron-down text-gray-400 text-xs"></i>
            </div>
          </div>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className={`
            absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg 
            max-h-60 overflow-hidden ${dropdownClassName}
          `}>
            {searchable && (
              <div className="p-2 border-b border-gray-100">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="fas fa-search text-gray-400 text-xs"></i>
                  </div>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search options..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}
            
            <div className="max-h-48 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => (
                  <button
                    key={option.value || index}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={`
                      w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors
                      ${value === option.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-900'}
                      ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      ${optionClassName}
                    `}
                    disabled={option.disabled}
                  >
                    <div className="flex items-center">
                      {option.icon && (
                        <div className="flex-shrink-0 mr-2 text-gray-400">
                          {option.icon}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="font-medium">{option.label}</div>
                        {option.description && (
                          <div className="text-xs text-gray-500 mt-0.5">{option.description}</div>
                        )}
                      </div>
                      {value === option.value && (
                        <div className="flex-shrink-0 ml-2">
                          <i className="fas fa-check text-blue-600 text-xs"></i>
                        </div>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-3 py-6 text-center text-gray-500 text-sm">
                  {searchTerm ? 'No options found' : 'No options available'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Helper Text */}
      {helperText && (
        <p className={`mt-1 text-xs ${error ? 'text-red-600' : 'text-gray-500'}`}>
          {helperText}
        </p>
      )}
    </div>
  );
};

export default Dropdown;
