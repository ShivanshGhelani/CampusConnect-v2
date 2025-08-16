import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, Users, Target, AlertTriangle, CheckCircle, Settings, Edit3 } from 'lucide-react';
import { adminAPI } from '../api';

const AttendancePreview = ({ 
  eventData, 
  onStrategyChange, 
  showCustomization = false,
  onToggleCustomization 
}) => {
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState(null);
  const [customStrategy, setCustomStrategy] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [validationData, setValidationData] = useState(null);

  // Available strategies for customization
  const availableStrategies = [
    { value: 'single_mark', label: 'Single Check', description: 'One attendance mark for the entire event' },
    { value: 'day_based', label: 'Daily Tracking', description: 'Attendance tracked each day' },
    { value: 'session_based', label: 'Session Checkpoints', description: 'Multiple checkpoints during the event' },
    { value: 'milestone_based', label: 'Milestone Tracking', description: 'Attendance at key milestones' },
    { value: 'continuous', label: 'Continuous Monitoring', description: 'Regular progress checks' }
  ];

  // Generate preview when event data changes
  useEffect(() => {
    if (eventData.event_name && eventData.event_type && eventData.start_date && eventData.start_time && eventData.end_date && eventData.end_time) {
      generatePreview();
    }
  }, [eventData.event_name, eventData.event_type, eventData.start_date, eventData.start_time, eventData.end_date, eventData.end_time, eventData.detailed_description, eventData.registration_mode]);

  // Validate custom strategy when it changes
  useEffect(() => {
    if (customStrategy && eventData.start_date && eventData.start_time && eventData.end_date && eventData.end_time) {
      // Always validate when customStrategy changes, regardless of whether it's the detected strategy
      validateCustomStrategy();
    }
  }, [customStrategy]);

  // Check for missing required fields
  const missingFields = useMemo(() => {
    const missing = [];
    if (!eventData.registration_mode) missing.push('Registration Mode (Individual or Team)');
    if (!eventData.event_type) missing.push('Event Type');
    if (!eventData.start_date || !eventData.start_time) missing.push('Event Start Date/Time');
    if (!eventData.end_date || !eventData.end_time) missing.push('Event End Date/Time');
    return missing;
  }, [eventData.registration_mode, eventData.event_type, eventData.start_date, eventData.start_time, eventData.end_date, eventData.end_time]);

  const generatePreview = async () => {
    if (!eventData.start_date || !eventData.start_time || !eventData.end_date || !eventData.end_time) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Combine date and time for API
      const startDateTime = new Date(`${eventData.start_date}T${eventData.start_time}`);
      const endDateTime = new Date(`${eventData.end_date}T${eventData.end_time}`);

      const requestData = {
        event_name: eventData.event_name,
        event_type: eventData.event_type,
        start_datetime: startDateTime.toISOString(),
        end_datetime: endDateTime.toISOString(),
        detailed_description: eventData.detailed_description || '',
        target_audience: eventData.target_audience || 'students',
        registration_mode: eventData.registration_mode || 'individual'
      };

      console.log('AttendancePreview - Sending request data:', requestData);
      console.log('AttendancePreview - Date validation:', {
        start_date: eventData.start_date,
        start_time: eventData.start_time,
        end_date: eventData.end_date,
        end_time: eventData.end_time,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString()
      });

      const response = await adminAPI.previewAttendanceStrategy(requestData);
      const data = response.data;
      setPreviewData(data);
      
      // Initialize custom strategy with detected strategy and notify parent
      if (data.success && data.detected_strategy) {
        setCustomStrategy(data.detected_strategy.type);
        
        // Immediately notify parent with the detected strategy data
        if (onStrategyChange) {
          const strategyData = {
            strategy: data.detected_strategy.type,
            detected_strategy: data.detected_strategy,
            criteria: data.attendance_config,
            sessions: data.sessions,
            warnings: data.validation_details?.warnings || [],
            recommendations: data.recommendations || [],
            minimum_percentage: data.attendance_config?.minimum_percentage
          };
          
          console.log('AttendancePreview - Sending strategy data to parent:', strategyData);
          onStrategyChange(strategyData);
        }
      }

    } catch (err) {
      console.error('Error generating attendance preview:', err);
      setError('Failed to generate attendance preview. Please check your event details.');
    } finally {
      setLoading(false);
    }
  };

  const validateCustomStrategy = async () => {
    if (!customStrategy || !eventData.start_date || !eventData.start_time || !eventData.end_date || !eventData.end_time) {
      return;
    }

    setValidating(true);
    
    try {
      const startDateTime = new Date(`${eventData.start_date}T${eventData.start_time}`);
      const endDateTime = new Date(`${eventData.end_date}T${eventData.end_time}`);

      // Create a custom strategy configuration object
      const customStrategyConfig = {
        type: customStrategy,
        name: `Custom ${customStrategy.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
        description: `User-selected ${customStrategy} strategy`,
        sessions: [
          {
            name: "Main Session",
            start_time: startDateTime.toISOString(),
            duration: Math.floor(Math.max(60, (endDateTime - startDateTime) / 1000 / 60)) // Convert to integer minutes
          }
        ],
        criteria: {
          strategy: customStrategy,
          minimum_percentage: customStrategy === 'single_mark' ? 100 : (customStrategy === 'continuous' ? 90 : 75),
          auto_calculate: true
        }
      };

      const requestData = {
        event_name: eventData.event_name,
        event_type: eventData.event_type,
        start_datetime: startDateTime.toISOString(),
        end_datetime: endDateTime.toISOString(),
        custom_strategy: customStrategyConfig,
        detailed_description: eventData.detailed_description || '',
        target_audience: eventData.target_audience || 'students',
        registration_mode: eventData.registration_mode || 'individual'
      };

      const response = await adminAPI.validateCustomStrategy(requestData);
      const data = response.data;
      setValidationData(data);

      // Update parent with the complete configuration
      if (onStrategyChange && data.success && data.custom_strategy) {
        onStrategyChange({
          strategy: data.custom_strategy.type,
          criteria: data.custom_strategy.config,
          sessions: data.custom_strategy.sessions,
          warnings: data.validation_details?.warnings || [],
          recommendations: data.recommendations || []
        });
      }

    } catch (err) {
      console.error('Error validating custom strategy:', err);
      setError('Failed to validate custom strategy');
    } finally {
      setValidating(false);
    }
  };

  const handleStrategyChange = (newStrategy) => {
    // Clear previous validation data when changing strategy
    setValidationData(null);
    
    // Update the custom strategy state
    setCustomStrategy(newStrategy);
    
    // If switching back to the detected strategy, we'll use the original preview data
    if (newStrategy === previewData?.detected_strategy?.type) {
      if (onStrategyChange) {
        onStrategyChange({
          strategy: newStrategy,
          criteria: previewData.attendance_config,
          sessions: previewData.sessions,
          warnings: [],
          recommendations: previewData.recommendations
        });
      }
    } else {
      // For other strategies, pass basic info and wait for validation
      if (onStrategyChange) {
        onStrategyChange({
          strategy: newStrategy,
          criteria: null,
          sessions: null,
          warnings: [],
          recommendations: []
        });
      }
    }
  };

  const getStrategyIcon = (strategy) => {
    const icons = {
      'single_mark': <CheckCircle className="w-5 h-5" />,
      'day_based': <Calendar className="w-5 h-5" />,
      'session_based': <Clock className="w-5 h-5" />,
      'milestone_based': <Target className="w-5 h-5" />,
      'continuous': <Users className="w-5 h-5" />
    };
    return icons[strategy] || <Settings className="w-5 h-5" />;
  };

  const getStrategyColor = (strategy) => {
    const colors = {
      'single_mark': 'bg-green-50 border-green-200 text-green-800',
      'day_based': 'bg-blue-50 border-blue-200 text-blue-800',
      'session_based': 'bg-purple-50 border-purple-200 text-purple-800',
      'milestone_based': 'bg-orange-50 border-orange-200 text-orange-800',
      'continuous': 'bg-indigo-50 border-indigo-200 text-indigo-800'
    };
    return colors[strategy] || 'bg-gray-50 border-gray-200 text-gray-800';
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600">Analyzing attendance strategy...</span>
        </div>
      </div>
    );
  }

  // Show missing fields error first
  if (missingFields.length > 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-amber-800 mb-2">
              Complete Required Fields to Generate Attendance Strategy
            </h4>
            <p className="text-sm text-amber-700 mb-3">
              Please complete the following fields to automatically generate your attendance strategy:
            </p>
            <ul className="text-sm text-amber-700 space-y-1">
              {missingFields.map((field, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 bg-amber-600 rounded-full flex-shrink-0"></span>
                  <span>{field}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-amber-600 mt-3">
              Attendance strategy will be generated automatically based on event type, duration, and audience.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <span className="text-sm text-red-800">{error}</span>
        </div>
      </div>
    );
  }

  if (!previewData?.success) {
    return null;
  }

  const data = previewData;
  
  // Determine current data to display based on state
  const currentData = (() => {
    // If we have validation data and it's successful, use it
    if (validationData?.success && validationData.custom_strategy) {
      return validationData.custom_strategy;
    }
    
    // If custom strategy matches detected strategy, use original data
    if (customStrategy === data.detected_strategy?.type) {
      return data;
    }
    
    // Otherwise, fallback to original data
    return data;
  })();

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${getStrategyColor(currentData.type || data.detected_strategy?.type)}`}>
            {getStrategyIcon(currentData.type || data.detected_strategy?.type)}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <span>Attendance Strategy: {currentData.name || data.detected_strategy?.name}</span>
              {validating && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              )}
            </h3>
            <p className="text-sm text-gray-600">
              {data.event_details?.duration_hours}h event • {(currentData.sessions || data.sessions)?.length || 0} session(s)
            </p>
          </div>
        </div>
        
        <button
          type="button"
          onClick={onToggleCustomization}
          className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Edit3 className="w-4 h-4" />
          <span>{showCustomization ? 'Hide Options' : 'Customize'}</span>
        </button>
      </div>

      {/* Strategy Explanation */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">{currentData.description || data.detected_strategy?.description || "Strategy analysis in progress..."}</p>
      </div>

      {/* Warnings (if any) */}
      {validationData?.recommendations?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 mb-1">Recommendations:</p>
              <ul className="text-sm text-amber-700 space-y-1">
                {validationData.recommendations.map((warning, idx) => (
                  <li key={idx}>• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Custom Strategy Selection */}
      {showCustomization && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <h4 className="text-sm font-semibold text-gray-900">Choose Attendance Strategy</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableStrategies.map((strategy) => (
              <button
                key={strategy.value}
                type="button"
                onClick={() => handleStrategyChange(strategy.value)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  customStrategy === strategy.value
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  {getStrategyIcon(strategy.value)}
                  <span className="text-sm font-medium text-gray-900">{strategy.label}</span>
                </div>
                <p className="text-xs text-gray-600">{strategy.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Session Timeline */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-900">Attendance Timeline</h4>
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
        
        <div className="space-y-2">
          {(currentData.sessions || data.sessions).slice(0, showDetails ? undefined : 3).map((session, idx) => (
            <div key={idx} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{session.session_name}</p>
                  <p className="text-xs text-gray-600 capitalize">{session.session_type} session</p>
                </div>
              </div>
              {session.duration_minutes > 0 && (
                <span className="text-xs text-gray-500">
                  {Math.floor(session.duration_minutes / 60)}h {session.duration_minutes % 60}m
                </span>
              )}
            </div>
          ))}
          
          {!showDetails && (currentData.sessions || data.sessions).length > 3 && (
            <div className="text-center py-2">
              <span className="text-xs text-gray-500">
                +{(currentData.sessions || data.sessions).length - 3} more sessions
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <p className="text-lg font-semibold text-gray-900">{(currentData.sessions || data.sessions)?.length || 0}</p>
          <p className="text-xs text-gray-600">Total Sessions</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <p className="text-lg font-semibold text-gray-900">{data.criteria?.minimum_percentage || 'N/A'}%</p>
          <p className="text-xs text-gray-600">Pass Criteria</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <p className="text-lg font-semibold text-gray-900">{data.event_details?.duration_hours || 0}h</p>
          <p className="text-xs text-gray-600">Duration</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <p className="text-lg font-semibold text-gray-900">
            {data.detected_strategy?.type === 'flexible_attendance' ? 'High' : 'Standard'}
          </p>
          <p className="text-xs text-gray-600">Flexibility</p>
        </div>
      </div>

      {/* Recommendations */}
      {(currentData.recommendations || data.recommendations)?.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 Recommendations</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            {(currentData.recommendations || data.recommendations).map((rec, idx) => (
              <li key={idx}>• {rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AttendancePreview;
