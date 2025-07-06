import React, { useState, useEffect } from 'react';

const DateRangePicker = ({ 
  startDate, 
  endDate, 
  onDateChange, 
  bookedDates = [], 
  minDate = null,
  maxDate = null,
  className = ""
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isOpen, setIsOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

  const isDateBooked = (date) => {
    if (!date) return false;
    const dateString = formatDateString(date);
    return bookedDates.some(bookedDate => {
      if (typeof bookedDate === 'string') {
        return bookedDate === dateString;
      }
      // Handle date range objects
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
    
    // Check min/max dates
    if (minDate && date < new Date(minDate)) return true;
    if (maxDate && date > new Date(maxDate)) return true;
    
    return false;
  };

  const isDateInRange = (date) => {
    if (!date || !tempStartDate || !tempEndDate) return false;
    return date >= tempStartDate && date <= tempEndDate;
  };

  const handleDateClick = (date) => {
    if (isDateDisabled(date)) return;

    if (!tempStartDate || (tempStartDate && tempEndDate)) {
      // Start new selection
      setTempStartDate(date);
      setTempEndDate(null);
    } else if (tempStartDate && !tempEndDate) {
      // Complete selection
      if (date >= tempStartDate) {
        setTempEndDate(date);
        onDateChange(tempStartDate, date);
        setIsOpen(false);
      } else {
        setTempStartDate(date);
        setTempEndDate(null);
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

  const getDayClassName = (date) => {
    let classes = ['cursor-pointer', 'w-8', 'h-8', 'flex', 'items-center', 'justify-center', 'text-sm', 'rounded-full', 'transition-colors'];
    
    if (isDateDisabled(date)) {
      classes.push('text-gray-300', 'cursor-not-allowed', 'bg-red-100');
    } else if (isDateInRange(date)) {
      classes.push('bg-blue-500', 'text-white');
    } else if (tempStartDate && formatDateString(date) === formatDateString(tempStartDate)) {
      classes.push('bg-blue-600', 'text-white', 'font-semibold');
    } else if (tempEndDate && formatDateString(date) === formatDateString(tempEndDate)) {
      classes.push('bg-blue-600', 'text-white', 'font-semibold');
    } else {
      classes.push('text-gray-700', 'hover:bg-blue-100');
    }
    
    return classes.join(' ');
  };

  return (
    <div className={`relative ${className}`}>
      <div 
        className="w-full px-4 py-2 border border-gray-300 rounded-lg cursor-pointer bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <span className="text-gray-700">
            {startDate && endDate 
              ? `${formatDateString(startDate)} to ${formatDateString(endDate)}`
              : 'Select date range'}
          </span>
          <i className="fas fa-calendar-alt text-gray-400"></i>
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => navigateMonth(-1)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <i className="fas fa-chevron-left text-gray-600"></i>
            </button>
            <h3 className="text-lg font-semibold text-gray-800">
              {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            <button
              type="button"
              onClick={() => navigateMonth(1)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <i className="fas fa-chevron-right text-gray-600"></i>
            </button>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {daysOfWeek.map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {getDaysInMonth(currentMonth).map((date, index) => (
              <div key={index} className="text-center">
                {date && (
                  <button
                    type="button"
                    onClick={() => handleDateClick(date)}
                    className={getDayClassName(date)}
                    disabled={isDateDisabled(date)}
                  >
                    {date.getDate()}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-100 rounded mr-2"></div>
                <span>Booked</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                <span>Selected</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => {
                setTempStartDate(null);
                setTempEndDate(null);
                onDateChange(null, null);
                setIsOpen(false);
              }}
              className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
