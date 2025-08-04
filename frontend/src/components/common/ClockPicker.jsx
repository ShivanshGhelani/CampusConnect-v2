import React, { useState, useRef, useEffect } from 'react';
import { Clock, X } from 'lucide-react';

const ClockPicker = ({ 
  value = '', 
  onChange, 
  placeholder = "Select time", 
  required = false, 
  error = null,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState(null);
  const [selectedMinute, setSelectedMinute] = useState(null);
  const [isAM, setIsAM] = useState(true);
  const [mode, setMode] = useState('hour'); // 'hour' or 'minute'
  
  const dropdownRef = useRef(null);

  // Initialize from value
  useEffect(() => {
    if (value) {
      const [hours, minutes] = value.split(':').map(Number);
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        setIsAM(hours < 12);
        setSelectedHour(hours === 0 ? 12 : hours > 12 ? hours - 12 : hours);
        setSelectedMinute(minutes);
      }
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setMode('hour');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTime = (hour, minute, isAM) => {
    if (hour === null || minute === null) return '';
    
    let hour24 = hour;
    if (isAM && hour === 12) hour24 = 0;
    else if (!isAM && hour !== 12) hour24 = hour + 12;
    
    return `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const formatDisplayTime = (hour, minute, isAM) => {
    if (hour === null || minute === null) return '';
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${isAM ? 'AM' : 'PM'}`;
  };

  const handleHourClick = (hour) => {
    setSelectedHour(hour);
    setMode('minute');
  };

  const handleMinuteClick = (minute) => {
    setSelectedMinute(minute);
    if (selectedHour !== null) {
      const timeString = formatTime(selectedHour, minute, isAM);
      onChange(timeString);
      setIsOpen(false);
      setMode('hour');
    }
  };

  const handleAMPMToggle = (ampm) => {
    setIsAM(ampm === 'AM');
    if (selectedHour !== null && selectedMinute !== null) {
      const timeString = formatTime(selectedHour, selectedMinute, ampm === 'AM');
      onChange(timeString);
    }
  };

  // Generate clock positions for hours (1-12)
  const getHourPositions = () => {
    const hours = [];
    for (let i = 1; i <= 12; i++) {
      const angle = (i * 30) - 90; // 30 degrees per hour, starting from 12
      const radian = (angle * Math.PI) / 180;
      const x = 80 + 60 * Math.cos(radian);
      const y = 80 + 60 * Math.sin(radian);
      hours.push({ hour: i, x, y, angle });
    }
    return hours;
  };

  // Generate clock positions for minutes (0, 5, 10, ... 55)
  const getMinutePositions = () => {
    const minutes = [];
    for (let i = 0; i < 60; i += 5) {
      const angle = (i * 6) - 90; // 6 degrees per minute, starting from 12
      const radian = (angle * Math.PI) / 180;
      const x = 80 + 60 * Math.cos(radian);
      const y = 80 + 60 * Math.sin(radian);
      minutes.push({ minute: i, x, y, angle });
    }
    return minutes;
  };

  const hourPositions = getHourPositions();
  const minutePositions = getMinutePositions();

  const displayValue = () => {
    if (selectedHour !== null && selectedMinute !== null) {
      return formatDisplayTime(selectedHour, selectedMinute, isAM);
    }
    return placeholder;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div 
        className={`w-full px-4 py-3 border rounded-lg cursor-pointer bg-white transition-all duration-200 flex items-center justify-between hover:border-gray-400 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 ${
          error ? 'border-red-300' : isOpen ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-300'
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`text-sm ${selectedHour !== null && selectedMinute !== null ? 'text-gray-900' : 'text-gray-500'}`}>
          {displayValue()}
        </span>
        <Clock className={`w-5 h-5 ${isOpen ? 'text-blue-600' : 'text-gray-400'} transition-colors`} />
      </div>

      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-6 min-w-[350px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {mode === 'hour' ? 'Select Hour' : 'Select Minute'}
            </h3>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setMode('hour');
              }}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Digital Time Display */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-lg">
              <span className="text-2xl font-mono font-bold text-blue-900">
                {selectedHour !== null ? selectedHour.toString().padStart(2, '0') : '--'}
              </span>
              <span className="text-2xl font-bold text-blue-700">:</span>
              <span className="text-2xl font-mono font-bold text-blue-900">
                {selectedMinute !== null ? selectedMinute.toString().padStart(2, '0') : '--'}
              </span>
              <div className="ml-2 flex flex-col space-y-1">
                <button
                  type="button"
                  onClick={() => handleAMPMToggle('AM')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    isAM ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => handleAMPMToggle('PM')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    !isAM ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  PM
                </button>
              </div>
            </div>
          </div>

          {/* Clock Face */}
          <div className="relative mx-auto" style={{ width: '160px', height: '160px' }}>
            {/* Clock Circle */}
            <svg width="160" height="160" className="absolute inset-0">
              <circle
                cx="80"
                cy="80"
                r="75"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="2"
              />
              <circle
                cx="80"
                cy="80"
                r="4"
                fill="#3b82f6"
              />
            </svg>

            {/* Hour Mode */}
            {mode === 'hour' && hourPositions.map(({ hour, x, y }) => (
              <button
                key={hour}
                type="button"
                onClick={() => handleHourClick(hour)}
                className={`absolute w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all transform -translate-x-1/2 -translate-y-1/2 ${
                  selectedHour === hour
                    ? 'bg-blue-600 text-white shadow-lg scale-110'
                    : 'bg-white text-gray-700 hover:bg-blue-100 border border-gray-300'
                }`}
                style={{ left: `${x}px`, top: `${y}px` }}
              >
                {hour}
              </button>
            ))}

            {/* Minute Mode */}
            {mode === 'minute' && minutePositions.map(({ minute, x, y }) => (
              <button
                key={minute}
                type="button"
                onClick={() => handleMinuteClick(minute)}
                className={`absolute w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all transform -translate-x-1/2 -translate-y-1/2 ${
                  selectedMinute === minute
                    ? 'bg-blue-600 text-white shadow-lg scale-110'
                    : 'bg-white text-gray-700 hover:bg-blue-100 border border-gray-300'
                }`}
                style={{ left: `${x}px`, top: `${y}px` }}
              >
                {minute.toString().padStart(2, '0')}
              </button>
            ))}

            {/* Clock Hand */}
            {((mode === 'hour' && selectedHour !== null) || (mode === 'minute' && selectedMinute !== null)) && (
              <svg width="160" height="160" className="absolute inset-0 pointer-events-none">
                <line
                  x1="80"
                  y1="80"
                  x2={mode === 'hour' 
                    ? 80 + 45 * Math.cos(((selectedHour * 30) - 90) * Math.PI / 180)
                    : 80 + 55 * Math.cos(((selectedMinute * 6) - 90) * Math.PI / 180)
                  }
                  y2={mode === 'hour'
                    ? 80 + 45 * Math.sin(((selectedHour * 30) - 90) * Math.PI / 180)
                    : 80 + 55 * Math.sin(((selectedMinute * 6) - 90) * Math.PI / 180)
                  }
                  stroke="#3b82f6"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </div>

          {/* Mode Toggle */}
          <div className="flex justify-center mt-6 space-x-2">
            <button
              type="button"
              onClick={() => setMode('hour')}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                mode === 'hour' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Hour
            </button>
            <button
              type="button"
              onClick={() => setMode('minute')}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                mode === 'minute' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Minute
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between mt-6">
            <button
              type="button"
              onClick={() => {
                setSelectedHour(null);
                setSelectedMinute(null);
                onChange('');
                setIsOpen(false);
                setMode('hour');
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                if (selectedHour !== null && selectedMinute !== null) {
                  const timeString = formatTime(selectedHour, selectedMinute, isAM);
                  onChange(timeString);
                }
                setIsOpen(false);
                setMode('hour');
              }}
              disabled={selectedHour === null || selectedMinute === null}
              className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClockPicker;
