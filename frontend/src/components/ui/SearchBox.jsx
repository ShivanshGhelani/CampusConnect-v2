import React, { useState, useEffect, useRef, useCallback } from 'react';

const SearchBox = ({
  // Basic props
  value = '',
  onChange,
  onSearch,
  placeholder = 'Search...',
  disabled = false,
  
  // Styling props
  size = 'md',
  variant = 'default',
  className = '',
  
  // Advanced features
  suggestions = [],
  showSuggestions = false,
  onSuggestionSelect,
  debounceMs = 300,
  
  // Recent searches
  recentSearches = [],
  showRecentSearches = false,
  onRecentSearchSelect,
  maxRecentSearches = 5,
  
  // Advanced filters
  filters = [],
  selectedFilters = [],
  onFilterChange,
  showFilterTags = true,
  
  // Icons and styling
  searchIcon = true,
  clearIcon = true,
  loading = false,
  
  // Results display
  resultCount,
  showResultCount = false,
  
  // Callbacks
  onFocus,
  onBlur,
  onClear,
  
  // Accessibility
  'aria-label': ariaLabel = 'Search',
  ...props
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  // Size variants
  const sizeClasses = {
    sm: 'h-8 text-sm px-3',
    md: 'h-10 text-sm px-3', 
    lg: 'h-12 text-base px-4'
  };

  // Variant styles
  const variantClasses = {
    default: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
    filled: 'bg-gray-100 border-gray-100 focus:bg-white focus:border-blue-500 focus:ring-blue-500',
    outlined: 'border-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500',
    minimal: 'border-0 border-b-2 border-gray-300 focus:border-blue-500 rounded-none'
  };

  // Debounced search
  const debouncedSearch = useCallback((searchValue) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      if (onChange) onChange(searchValue);
      if (onSearch) onSearch(searchValue);
    }, debounceMs);
  }, [onChange, onSearch, debounceMs]);

  // Handle input change
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    debouncedSearch(newValue);
    
    // Show dropdown if there's content and suggestions/recent searches available
    if (newValue.length > 0 || recentSearches.length > 0) {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion) => {
    setLocalValue(suggestion);
    setShowDropdown(false);
    if (onSuggestionSelect) onSuggestionSelect(suggestion);
    if (onChange) onChange(suggestion);
    if (onSearch) onSearch(suggestion);
  };

  // Handle recent search selection
  const handleRecentSearchSelect = (recentSearch) => {
    setLocalValue(recentSearch);
    setShowDropdown(false);
    if (onRecentSearchSelect) onRecentSearchSelect(recentSearch);
    if (onChange) onChange(recentSearch);
    if (onSearch) onSearch(recentSearch);
  };

  // Handle clear
  const handleClear = () => {
    setLocalValue('');
    setShowDropdown(false);
    if (onClear) onClear();
    if (onChange) onChange('');
    searchRef.current?.focus();
  };

  // Handle focus
  const handleFocus = (e) => {
    setIsExpanded(true);
    if (recentSearches.length > 0 || suggestions.length > 0) {
      setShowDropdown(true);
    }
    if (onFocus) onFocus(e);
  };

  // Handle blur
  const handleBlur = (e) => {
    // Delay to allow clicking on dropdown items
    setTimeout(() => {
      setIsExpanded(false);
      setShowDropdown(false);
    }, 150);
    if (onBlur) onBlur(e);
  };

  // Handle filter removal
  const handleFilterRemove = (filterToRemove) => {
    const newFilters = selectedFilters.filter(f => f !== filterToRemove);
    if (onFilterChange) onFilterChange(newFilters);
  };

  // Handle Enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setShowDropdown(false);
      if (onSearch) onSearch(localValue);
    }
    if (e.key === 'Escape') {
      setShowDropdown(false);
      searchRef.current?.blur();
    }
  };

  // Update local value when prop changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Filter suggestions based on current input
  const filteredSuggestions = suggestions.filter(suggestion => 
    suggestion.toLowerCase().includes(localValue.toLowerCase())
  );

  // Filter recent searches that don't match current input
  const filteredRecentSearches = recentSearches.filter(recent =>
    recent.toLowerCase().includes(localValue.toLowerCase()) && recent !== localValue
  );

  return (
    <div className={`relative ${className}`}>
      {/* Main search input */}
      <div className={`relative flex items-center transition-all duration-200 ${
        isExpanded ? 'scale-[1.02]' : ''
      }`}>
        {/* Search icon */}
        {searchIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {loading ? (
              <div className="animate-spin">
                <i className="fas fa-spinner text-sm"></i>
              </div>
            ) : (
              <i className="fas fa-search text-sm"></i>
            )}
          </div>
        )}

        {/* Input field */}
        <input
          ref={searchRef}
          type="text"
          value={localValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={ariaLabel}
          className={`
            w-full rounded-lg border shadow-sm transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-opacity-50
            ${searchIcon ? 'pl-10' : ''}
            ${clearIcon && localValue ? 'pr-10' : ''}
            ${sizeClasses[size]}
            ${variantClasses[variant]}
            ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'}
            ${isExpanded ? 'ring-2 ring-blue-500' : ''}
          `}
          {...props}
        />

        {/* Clear icon */}
        {clearIcon && localValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Clear search"
          >
            <i className="fas fa-times text-sm"></i>
          </button>
        )}
      </div>

      {/* Filter tags */}
      {showFilterTags && selectedFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedFilters.map((filter, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              {filter}
              <button
                type="button"
                onClick={() => handleFilterRemove(filter)}
                className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-600"
                aria-label={`Remove ${filter} filter`}
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Result count */}
      {showResultCount && resultCount !== undefined && (
        <div className="text-xs text-gray-500 mt-1">
          {resultCount === 0 ? 'No results' : `${resultCount} result${resultCount !== 1 ? 's' : ''}`}
        </div>
      )}

      {/* Dropdown with suggestions and recent searches */}
      {showDropdown && (filteredSuggestions.length > 0 || filteredRecentSearches.length > 0) && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
        >
          {/* Recent searches */}
          {showRecentSearches && filteredRecentSearches.length > 0 && (
            <div className="border-b border-gray-100">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Recent Searches
              </div>
              {filteredRecentSearches.slice(0, maxRecentSearches).map((recent, index) => (
                <button
                  key={`recent-${index}`}
                  onClick={() => handleRecentSearchSelect(recent)}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                >
                  <i className="fas fa-history text-gray-400 mr-2 text-xs"></i>
                  {recent}
                </button>
              ))}
            </div>
          )}

          {/* Suggestions */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div>
              {filteredRecentSearches.length > 0 && (
                <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Suggestions
                </div>
              )}
              {filteredSuggestions.map((suggestion, index) => (
                <button
                  key={`suggestion-${index}`}
                  onClick={() => handleSuggestionSelect(suggestion)}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                >
                  <i className="fas fa-search text-gray-400 mr-2 text-xs"></i>
                  <span>
                    {suggestion.split(new RegExp(`(${localValue})`, 'gi')).map((part, i) => 
                      part.toLowerCase() === localValue.toLowerCase() ? (
                        <mark key={i} className="bg-yellow-200 font-medium">{part}</mark>
                      ) : (
                        part
                      )
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBox;
