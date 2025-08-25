import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

const DateRangePicker = ({ 
  startDate, 
  endDate,
  startTime,
  endTime,
  onDateChange, 
  onTimeChange,
  bookedDates = [], 
  minDate = null,
  maxDate = null,
  className = "",
  placeholder = "Select date range",
  label = "",
  description = "",
  required = false,
  error = null,
  includeTime = false,
  singleDate = false,
  theme = "blue",
  constrainToRegistration = false,
  registrationEndDate = null,
  registrationEndTime = null
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isOpen, setIsOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);
  const dropdownRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  // Update dropdown position when it opens or window resizes/scrolls
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const updatePosition = () => {
        const rect = dropdownRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const dropdownHeight = 500; // Approximate height of dropdown
        
        // Check if there's enough space below, otherwise position above
        const spaceBelow = viewportHeight - rect.bottom - 8;
        const shouldPositionAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
        
        setDropdownPosition({
          top: shouldPositionAbove ? rect.top + window.scrollY - dropdownHeight - 8 : rect.bottom + window.scrollY + 8,
          left: Math.max(8, Math.min(rect.left + window.scrollX, window.innerWidth - 320 - 8)) // Prevent dropdown from going off-screen
        });
      };

      updatePosition();
      
      // Update position on scroll with high frequency for smooth movement
      const handleScroll = () => {
        updatePosition();
      };
      
      // Update position on resize
      const handleResize = () => {
        updatePosition();
      };
      
      // Listen to all possible scroll containers
      const scrollElements = [];
      let element = dropdownRef.current.parentElement;
      while (element && element !== document.body) {
        const computedStyle = window.getComputedStyle(element);
        if (computedStyle.overflowY === 'auto' || computedStyle.overflowY === 'scroll' || computedStyle.overflow === 'auto' || computedStyle.overflow === 'scroll') {
          scrollElements.push(element);
        }
        element = element.parentElement;
      }
      
      // Add listeners
      window.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', handleResize);
      scrollElements.forEach(el => el.addEventListener('scroll', handleScroll, { passive: true }));

      return () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
        scrollElements.forEach(el => el.removeEventListener('scroll', handleScroll));
      };
    }
  }, [isOpen]);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Calculate effective minimum date based on registration constraints
  const getEffectiveMinDate = () => {
    if (constrainToRegistration && registrationEndDate) {
      // Event cannot start before registration ends
      const regEndDate = new Date(registrationEndDate);
      
      // If registration includes time, ensure event starts after registration ends
      if (registrationEndTime) {
        // Add a small buffer (same day is allowed if times are appropriate)
        return regEndDate.toISOString().split('T')[0];
      }
      
      // If no specific time, use the registration end date as minimum
      return regEndDate.toISOString().split('T')[0];
    }
    
    return minDate;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside the input field and the portal dropdown
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        // For portal-based dropdown, we need to check if click is inside the dropdown
        const dropdownElement = document.querySelector('.fixed.bg-white.border.border-gray-200.rounded-xl.shadow-2xl.z-\\[10000\\]');
        if (!dropdownElement || !dropdownElement.contains(event.target)) {
          setIsOpen(false);
        }
      }
    };

    if (isOpen) {
      // Small delay to prevent immediate closing when opening
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const formatDateString = (date) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const formatDisplayDate = (date) => {
    if (!date) return '';
    // Use explicit date formatting to avoid any timezone conversion
    const year = date.getFullYear();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}, ${year}`;
  };

  const isDateBooked = (date) => {
    if (!date) return false;
    const dateString = formatDateString(date);
    return bookedDates.some(bookedDate => {
      if (typeof bookedDate === 'string') {
        return bookedDate === dateString;
      }
      if (bookedDate.start && bookedDate.end) {
        const startDate = new Date(bookedDate.start);
        const endDate = new Date(bookedDate.end);
        return date >= startDate && date <= endDate;
      }
      return false;
    });
  };

  const isDateDisabled = (date) => {
    if (!date) return true;
    
    // Check if date is booked
    if (isDateBooked(date)) return true;
    
    // Check effective min/max dates (including registration constraints)
    const effectiveMinDate = getEffectiveMinDate();
    if (effectiveMinDate && date < new Date(effectiveMinDate)) return true;
    if (maxDate && date > new Date(maxDate)) return true;
    
    return false;
  };

  const isDateInRange = (date) => {
    if (!date || !tempStartDate || !tempEndDate) return false;
    return date >= tempStartDate && date <= tempEndDate;
  };

  const isDateSelected = (date) => {
    if (!date) return false;
    const dateString = formatDateString(date);
    return (tempStartDate && formatDateString(tempStartDate) === dateString) ||
           (tempEndDate && formatDateString(tempEndDate) === dateString);
  };

  const handleDateClick = (date) => {
    if (isDateDisabled(date)) return;

    if (singleDate) {
      // Single date mode - just set the start date
      setTempStartDate(date);
      setTempEndDate(null);
      onDateChange(date, null);
      if (!includeTime) {
        setIsOpen(false);
      }
    } else {
      // Range mode - existing logic
      if (!tempStartDate || (tempStartDate && tempEndDate)) {
        // Start new selection
        setTempStartDate(date);
        setTempEndDate(null);
      } else if (tempStartDate && !tempEndDate) {
        // Complete selection
        if (date >= tempStartDate) {
          setTempEndDate(date);
          onDateChange(tempStartDate, date);
          if (!includeTime) {
            setIsOpen(false);
          }
        } else {
          setTempStartDate(date);
          setTempEndDate(null);
        }
      }
    }
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + direction);
      return newMonth;
    });
  };

  const getThemeColors = () => {
    const themes = {
      blue: {
        primary: 'blue-600',
        primaryHover: 'blue-700',
        light: 'blue-50',
        lightHover: 'blue-100',
        border: 'blue-400',
        ring: 'blue-500',
        text: 'blue-700'
      },
      purple: {
        primary: 'purple-600',
        primaryHover: 'purple-700',
        light: 'purple-50',
        lightHover: 'purple-100',
        border: 'purple-400',
        ring: 'purple-500',
        text: 'purple-700'
      },
      green: {
        primary: 'green-600',
        primaryHover: 'green-700',
        light: 'green-50',
        lightHover: 'green-100',
        border: 'green-400',
        ring: 'green-500',
        text: 'green-700'
      }
    };
    return themes[theme] || themes.blue;
  };

  const colors = getThemeColors();

  const getDayClassName = (date) => {
    const baseClasses = "w-9 h-9 flex items-center justify-center text-sm transition-all duration-200 cursor-pointer rounded-md";
    
    if (isDateDisabled(date)) {
      return `${baseClasses} text-gray-300 cursor-not-allowed bg-red-50 line-through`;
    }
    
    if (isDateSelected(date)) {
      return `${baseClasses} bg-${colors.primary} text-white font-semibold shadow-md`;
    }
    
    if (!singleDate && isDateInRange(date)) {
      return `${baseClasses} bg-${colors.light} text-${colors.text} font-medium`;
    }
    
    const today = new Date();
    const isToday = formatDateString(date) === formatDateString(today);
    
    if (isToday) {
      return `${baseClasses} bg-gray-100 text-gray-900 font-medium border-2 border-${colors.primary}`;
    }
    
    return `${baseClasses} text-gray-700 hover:bg-${colors.light} hover:text-${colors.text}`;
  };

  const handleApply = () => {
    if (singleDate && tempStartDate) {
      onDateChange(tempStartDate, null);
      setIsOpen(false);
    } else if (!singleDate && tempStartDate && tempEndDate) {
      onDateChange(tempStartDate, tempEndDate);
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setTempStartDate(null);
    setTempEndDate(null);
    onDateChange(null, null);
    if (onTimeChange) {
      if (singleDate) {
        onTimeChange('', null);
      } else {
        onTimeChange('', '');
      }
    }
    setIsOpen(false);
  };

  // Helper function to ensure 24-hour time format
  const formatTime24Hour = (timeStr) => {
    if (!timeStr) return '';
    // Ensure we always display in 24-hour format, never AM/PM
    const [hours, minutes] = timeStr.split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  };

  const displayValue = () => {
    if (singleDate && startDate) {
      const dateStr = formatDisplayDate(startDate);
      if (includeTime && startTime) {
        // Force 24-hour format display, never convert timezone
        const time24 = formatTime24Hour(startTime);
        return `${dateStr} ${time24}`;
      }
      return dateStr;
    } else if (!singleDate && startDate && endDate) {
      const start = formatDisplayDate(startDate);
      const end = formatDisplayDate(endDate);
      
      if (includeTime && startTime && endTime) {
        // Force 24-hour format display, never convert timezone
        const startTime24 = formatTime24Hour(startTime);
        const endTime24 = formatTime24Hour(endTime);
        // Explicitly format to prevent any timezone conversion
        return `${start} ${startTime24} - ${end} ${endTime24}`;
      }
      
      return `${start} - ${end}`;
    }
    return placeholder;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <div className="flex items-center space-x-3 mb-4">
          <div className={`w-4 h-4 bg-${colors.primary} rounded-full`}></div>
          <label className={`text-lg font-medium ${theme === 'purple' ? 'text-purple-900' : theme === 'green' ? 'text-green-900' : 'text-blue-900'} cursor-pointer`}>
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        </div>
      )}
      
      {description && (
        <p className={`text-sm ${theme === 'purple' ? 'text-purple-700' : theme === 'green' ? 'text-green-700' : 'text-blue-700'} mb-4`}>
          {description}
        </p>
      )}


      
      <div 
        className={`w-full px-4 py-3 border rounded-lg cursor-pointer bg-white transition-all duration-200 flex items-center justify-between hover:border-${colors.border} focus-within:ring-2 focus-within:ring-${colors.ring} focus-within:border-${colors.ring} ${
          error ? 'border-red-300' : isOpen ? `border-${colors.ring} ring-2 ring-${colors.ring}` : `border-${theme === 'purple' ? 'purple-300' : theme === 'green' ? 'green-300' : 'gray-300'}`
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`text-sm ${(singleDate ? startDate : startDate && endDate) ? 'text-gray-900' : 'text-gray-500'}`}>
          {displayValue()}
        </span>
        <Calendar className={`w-5 h-5 ${isOpen ? `text-${colors.primary}` : 'text-gray-400'} transition-colors`} />
      </div>

      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}

      {isOpen && createPortal(
        <div 
          className="fixed bg-white border border-gray-200 rounded-xl shadow-2xl z-[10000] p-6 min-w-[320px] max-w-sm"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              type="button"
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <h3 className="text-lg font-semibold text-gray-900">
              {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            <button
              type="button"
              onClick={() => navigateMonth(1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 mb-3">
            {daysOfWeek.map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1 mb-6">
            {getDaysInMonth(currentMonth).map((date, index) => (
              <div key={index} className="text-center">
                {date && (
                  <button
                    type="button"
                    onClick={() => handleDateClick(date)}
                    className={getDayClassName(date)}
                    disabled={isDateDisabled(date)}
                    title={isDateBooked(date) ? 'Already booked' : ''}
                  >
                    {date.getDate()}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Time Selection */}
          {includeTime && tempStartDate && (singleDate || tempEndDate) && (
            <div className="border-t pt-4 mb-4">
              {singleDate ? (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={startTime || ''}
                    onChange={(e) => onTimeChange && onTimeChange(e.target.value, null)}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-${colors.ring} focus:border-${colors.ring}`}
                    style={{
                      WebkitAppearance: 'none',
                      MozAppearance: 'textfield'
                    }}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={startTime || ''}
                      onChange={(e) => onTimeChange && onTimeChange(e.target.value, endTime)}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-${colors.ring} focus:border-${colors.ring}`}
                      style={{
                        WebkitAppearance: 'none',
                        MozAppearance: 'textfield'
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">End Time</label>
                    <input
                      type="time"
                      value={endTime || ''}
                      onChange={(e) => onTimeChange && onTimeChange(startTime, e.target.value)}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-${colors.ring} focus:border-${colors.ring}`}
                      style={{
                        WebkitAppearance: 'none',
                        MozAppearance: 'textfield'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Legend */}
          <div className="border-t pt-4 mb-4">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-50 border border-red-200 rounded mr-2"></div>
                  <span className="text-gray-600">Unavailable</span>
                </div>
                <div className="flex items-center">
                  <div className={`w-3 h-3 bg-${colors.primary} rounded mr-2`}></div>
                  <span className="text-gray-600">Selected</span>
                </div>
                <div className="flex items-center">
                  <div className={`w-3 h-3 bg-gray-100 border-2 border-${colors.primary} rounded mr-2`}></div>
                  <span className="text-gray-600">Today</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Clear
            </button>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              {includeTime && (
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={singleDate ? !tempStartDate : (!tempStartDate || !tempEndDate)}
                  className={`px-4 py-2 text-sm bg-${colors.primary} text-white hover:bg-${colors.primaryHover} disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors`}
                >
                  Apply
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default DateRangePicker;
