import React, { useState, useRef, useEffect } from 'react';

const MultiSelect = ({ 
  placeholder = "Select options",
  options = [],
  value = [], // Array of selected values
  onChange, // Function that receives array of selected values
  disabled = false,
  error = false,
  helperText = "",
  label = "",
  required = false,
  size = "md", // sm, md, lg
  className = "",
  dropdownClassName = "",
  maxSelections = null, // Maximum number of selections allowed
  showSelectAll = true, // Show "Select All" option
  searchable = false // Enable search functionality
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
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  // Handle option toggle
  const handleOptionToggle = (optionValue) => {
    if (disabled) return;
    
    const currentValues = Array.isArray(value) ? value : [];
    const isSelected = currentValues.includes(optionValue);
    
    let newValues;
    if (isSelected) {
      // Remove from selection
      newValues = currentValues.filter(v => v !== optionValue);
    } else {
      // Add to selection (check max limit)
      if (maxSelections && currentValues.length >= maxSelections) {
        return; // Don't add if max reached
      }
      newValues = [...currentValues, optionValue];
    }
    
    onChange && onChange(newValues);
  };

  // Handle Select All
  const handleSelectAll = () => {
    if (disabled) return;
    
    const currentValues = Array.isArray(value) ? value : [];
    const allValues = filteredOptions.map(opt => opt.value);
    
    // If all are selected, deselect all, otherwise select all
    const isAllSelected = allValues.every(val => currentValues.includes(val));
    const newValues = isAllSelected ? [] : allValues;
    
    onChange && onChange(newValues);
  };

  // Get display text for selected values
  const getDisplayText = () => {
    const currentValues = Array.isArray(value) ? value : [];
    
    if (currentValues.length === 0) {
      return placeholder;
    }
    
    if (currentValues.length === 1) {
      const selectedOption = options.find(opt => opt.value === currentValues[0]);
      return selectedOption ? selectedOption.label : currentValues[0];
    }
    
    return `${currentValues.length} selected`;
  };

  // Size classes
  const sizeClasses = {
    sm: "h-8 text-sm px-2",
    md: "h-10 text-sm px-3",
    lg: "h-12 text-base px-4"
  };

  // Check if all filtered options are selected
  const isAllSelected = filteredOptions.length > 0 && 
    filteredOptions.every(opt => (Array.isArray(value) ? value : []).includes(opt.value));

  const currentValues = Array.isArray(value) ? value : [];

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {/* Main Select Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          relative w-full border rounded-md shadow-sm bg-white text-left cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          ${sizeClasses[size]}
          ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'}
          ${disabled ? 'bg-gray-50 cursor-not-allowed text-gray-500' : 'hover:border-gray-400'}
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
        `}
      >
        <span className={`block truncate ${currentValues.length === 0 ? 'text-gray-500' : 'text-gray-900'}`}>
          {getDisplayText()}
        </span>
        
        {/* Selected count badge */}
        {currentValues.length > 1 && (
          <span className="absolute right-8 top-1/2 transform -translate-y-1/2 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
            {currentValues.length}
          </span>
        )}
        
        {/* Dropdown arrow */}
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {/* Dropdown Options */}
      {isOpen && (
        <div className={`
          absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto
          ${dropdownClassName}
        `}>
          {/* Search Input */}
          {searchable && (
            <div className="p-2 border-b border-gray-200">
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search options..."
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {/* Select All Option */}
          {showSelectAll && filteredOptions.length > 1 && (
            <div
              onClick={handleSelectAll}
              className="flex items-center px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100"
            >
              <div className="flex items-center">
                <div className={`
                  w-4 h-4 border-2 rounded mr-3 flex items-center justify-center
                  ${isAllSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}
                `}>
                  {isAllSelected && (
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span className="text-sm font-medium text-blue-600">
                  {isAllSelected ? 'Deselect All' : 'Select All'}
                </span>
              </div>
            </div>
          )}

          {/* Options List */}
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => {
              const isSelected = currentValues.includes(option.value);
              const isDisabled = maxSelections && !isSelected && currentValues.length >= maxSelections;
              
              return (
                <div
                  key={`${option.value}-${index}`}
                  onClick={() => !isDisabled && handleOptionToggle(option.value)}
                  className={`
                    flex items-center px-3 py-2 cursor-pointer transition-colors duration-150
                    ${isDisabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-50'}
                    ${isSelected ? 'bg-blue-50' : ''}
                  `}
                >
                  <div className="flex items-center">
                    {/* Checkbox */}
                    <div className={`
                      w-4 h-4 border-2 rounded mr-3 flex items-center justify-center transition-colors duration-150
                      ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}
                      ${isDisabled ? 'opacity-50' : ''}
                    `}>
                      {isSelected && (
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    
                    {/* Label */}
                    <span className={`
                      text-sm
                      ${isSelected ? 'text-blue-900 font-medium' : 'text-gray-900'}
                      ${isDisabled ? 'opacity-50' : ''}
                    `}>
                      {option.label}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500 text-center">
              {searchable && searchTerm ? 'No options found' : 'No options available'}
            </div>
          )}
        </div>
      )}

      {/* Helper Text */}
      {helperText && (
        <p className={`text-xs mt-1 ${error ? 'text-red-600' : 'text-gray-500'}`}>
          {helperText}
        </p>
      )}

      {/* Selected Items Preview (Optional) */}
      {currentValues.length > 0 && currentValues.length <= 3 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {currentValues.map((selectedValue) => {
            const selectedOption = options.find(opt => opt.value === selectedValue);
            return selectedOption ? (
              <span
                key={selectedValue}
                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
              >
                {selectedOption.label}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOptionToggle(selectedValue);
                  }}
                  className="ml-1 inline-flex items-center justify-center w-3 h-3 rounded-full hover:bg-blue-200 focus:outline-none"
                >
                  <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </span>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
};

export default MultiSelect;
