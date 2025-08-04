import React, { useState } from 'react';
import { Calendar, Clock } from 'lucide-react';

const DateTimePicker = ({
  label,
  startDate,
  startTime,
  endDate,
  endTime,
  onStartDateChange,
  onStartTimeChange,
  onEndDateChange,
  onEndTimeChange,
  required = false,
  errors = {},
  className = ""
}) => {
  const [focusedField, setFocusedField] = useState(null);

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    // If it's already in YYYY-MM-DD format, return as is
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return dateString;
    // Otherwise, convert from Date object or other format
    return new Date(dateString).toISOString().split('T')[0];
  };

  const getFieldClassName = (fieldName, hasError) => {
    const baseClasses = "block w-full px-3 py-2 text-sm border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2";
    
    if (hasError) {
      return `${baseClasses} border-red-300 focus:border-red-500 focus:ring-red-500`;
    }
    
    if (focusedField === fieldName) {
      return `${baseClasses} border-blue-500 ring-2 ring-blue-500`;
    }
    
    return `${baseClasses} border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-blue-500`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center space-x-2 mb-3">
        <Calendar className="w-5 h-5 text-blue-600" />
        <label className="text-sm font-medium text-gray-900">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      </div>

      {/* Start Date & Time */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm font-medium text-gray-700">Start</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600">Date</label>
            <div className="relative">
              <input
                type="date"
                value={formatDateForInput(startDate)}
                onChange={(e) => onStartDateChange(e.target.value)}
                onFocus={() => setFocusedField('startDate')}
                onBlur={() => setFocusedField(null)}
                required={required}
                min={new Date().toISOString().split('T')[0]}
                className={getFieldClassName('startDate', errors.start_date)}
              />
              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {errors.start_date && (
              <p className="text-xs text-red-600">{errors.start_date}</p>
            )}
          </div>
          
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600">Time</label>
            <div className="relative">
              <input
                type="time"
                value={startTime || ''}
                onChange={(e) => onStartTimeChange(e.target.value)}
                onFocus={() => setFocusedField('startTime')}
                onBlur={() => setFocusedField(null)}
                required={required}
                className={getFieldClassName('startTime', errors.start_time)}
              />
              <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {errors.start_time && (
              <p className="text-xs text-red-600">{errors.start_time}</p>
            )}
          </div>
        </div>
      </div>

      {/* End Date & Time */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span className="text-sm font-medium text-gray-700">End</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600">Date</label>
            <div className="relative">
              <input
                type="date"
                value={formatDateForInput(endDate)}
                onChange={(e) => onEndDateChange(e.target.value)}
                onFocus={() => setFocusedField('endDate')}
                onBlur={() => setFocusedField(null)}
                required={required}
                min={startDate || new Date().toISOString().split('T')[0]}
                className={getFieldClassName('endDate', errors.end_date)}
              />
              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {errors.end_date && (
              <p className="text-xs text-red-600">{errors.end_date}</p>
            )}
          </div>
          
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600">Time</label>
            <div className="relative">
              <input
                type="time"
                value={endTime || ''}
                onChange={(e) => onEndTimeChange(e.target.value)}
                onFocus={() => setFocusedField('endTime')}
                onBlur={() => setFocusedField(null)}
                required={required}
                className={getFieldClassName('endTime', errors.end_time)}
              />
              <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {errors.end_time && (
              <p className="text-xs text-red-600">{errors.end_time}</p>
            )}
          </div>
        </div>
      </div>

      {/* Duration Display */}
      {startDate && startTime && endDate && endTime && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-800 font-medium">
              Duration: {(() => {
                const start = new Date(`${startDate}T${startTime}`);
                const end = new Date(`${endDate}T${endTime}`);
                const diffMs = end - start;
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                const diffDays = Math.floor(diffHours / 24);
                
                if (diffDays > 0) {
                  return `${diffDays} day${diffDays > 1 ? 's' : ''} ${diffHours % 24}h ${diffMinutes}m`;
                } else if (diffHours > 0) {
                  return `${diffHours}h ${diffMinutes}m`;
                } else {
                  return `${diffMinutes}m`;
                }
              })()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateTimePicker;
