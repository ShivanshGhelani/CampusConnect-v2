import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Users, Target, AlertTriangle, CheckCircle, Settings, Edit3, Plus, Trash2, Save, RotateCcw, Copy, Move, ChevronDown, ChevronRight, Zap, Award, Eye, Lightbulb } from 'lucide-react';
import { adminAPI } from '../api/admin';

// IST Timezone utilities
const toISTDatetimeLocal = (isoString) => {
  // Convert ISO string (UTC) to IST datetime-local format (YYYY-MM-DDTHH:mm)
  if (!isoString) return '';
  const date = new Date(isoString); // Parse UTC timestamp
  
  // Add IST offset (+5:30) to get IST time
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(date.getTime() + istOffset);
  
  // Extract components using UTC methods (since we've already shifted to IST)
  const year = istDate.getUTCFullYear();
  const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istDate.getUTCDate()).padStart(2, '0');
  const hours = String(istDate.getUTCHours()).padStart(2, '0');
  const minutes = String(istDate.getUTCMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const fromISTDatetimeLocal = (datetimeLocal) => {
  // Convert datetime-local format (IST) to ISO string (UTC)
  if (!datetimeLocal) return null;
  
  // Parse the datetime-local string components (treating as IST)
  const [datePart, timePart] = datetimeLocal.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  
  // Create a date with these components as UTC (temporarily)
  const istDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
  
  // Subtract IST offset to get actual UTC
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utcDate = new Date(istDate.getTime() - istOffset);
  
  return utcDate.toISOString();
};

const AttendancePreview = ({ 
  eventData, 
  onStrategyChange, 
  showCustomization = false,
  onToggleCustomization,
  initialCustomData = null,
  onCustomDataChange = null // Callback to notify parent of internal changes
}) => {
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [customStrategy, setCustomStrategy] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [validationData, setValidationData] = useState(null);
  
  // Advanced customization states
  const [showAdvancedCustomization, setShowAdvancedCustomization] = useState(false);
  const [customSessions, setCustomSessions] = useState([]);
  const [customCriteria, setCustomCriteria] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasCustomWork, setHasCustomWork] = useState(false); // Track if user has done custom work
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [draggedSession, setDraggedSession] = useState(null);
  const [hoveredSession, setHoveredSession] = useState(null);
  const [expandedSessions, setExpandedSessions] = useState(new Set());
  const [showPresets, setShowPresets] = useState(false);
  const [animatingChanges, setAnimatingChanges] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true); // Track initialization state

  // Available strategies for customization
  const availableStrategies = [
    { value: 'single_mark', label: 'Single Check', description: 'One attendance mark for the entire event' },
    { value: 'day_based', label: 'Daily Tracking', description: 'Attendance tracked each day' },
    { value: 'session_based', label: 'Session Checkpoints', description: 'Multiple checkpoints during the event' },
    { value: 'milestone_based', label: 'Milestone Tracking', description: 'Attendance at key milestones' },
    { value: 'continuous', label: 'Continuous Monitoring', description: 'Regular progress checks' }
  ];

  // Initialize with saved custom data from localStorage
  useEffect(() => {
    if (initialCustomData) {
      if (initialCustomData.strategy) {
        setCustomStrategy(initialCustomData.strategy);
        setHasCustomWork(true);
      }
      
      if (initialCustomData.sessions && initialCustomData.sessions.length > 0) {
        setCustomSessions(initialCustomData.sessions);
        setHasCustomWork(true);
      }
      
      if (initialCustomData.criteria) {
        setCustomCriteria(initialCustomData.criteria);
        setHasCustomWork(true);
      }
      
      if (initialCustomData.validationData) {
        setValidationData(initialCustomData.validationData);
      }
      
      if (initialCustomData.previewData) {
        setPreviewData(initialCustomData.previewData);
      }
      
      // Mark as having unsaved changes if there were modifications
      if (initialCustomData.hasUnsavedChanges) {
        setHasUnsavedChanges(true);
      }
    }
    
    // Set initialization complete after a brief delay to allow all state to settle
    setTimeout(() => setIsInitializing(false), 100);
  }, [initialCustomData]);

  // Detect date changes and adjust session times proportionally
  useEffect(() => {
    // Only adjust times if we have custom sessions and event dates changed
    if (customSessions.length > 0 && eventData.start_date && eventData.start_time && eventData.end_date && eventData.end_time) {
      // Calculate new event start and end times
      const newEventStart = new Date(`${eventData.start_date}T${eventData.start_time}`);
      const newEventEnd = new Date(`${eventData.end_date}T${eventData.end_time}`);
      
      // Get the first session's current start time to determine the old event start
      const firstSession = customSessions[0];
      if (firstSession && firstSession.start_time) {
        const oldSessionStart = new Date(firstSession.start_time);
        
        // Check if the dates actually changed (compare ISO date strings)
        const newStartISO = newEventStart.toISOString();
        const oldStartISO = oldSessionStart.toISOString();
        
        // Calculate time difference in milliseconds
        const timeDiff = newEventStart.getTime() - oldSessionStart.getTime();
        
        // Only adjust if there's a significant time difference (more than 1 minute)
        if (Math.abs(timeDiff) > 60000) {
          console.log('📅 Event dates changed, adjusting session times...');
          console.log('Old start:', oldSessionStart.toISOString());
          console.log('New start:', newStartISO);
          console.log('Time diff (hours):', timeDiff / 1000 / 60 / 60);
          
          // Adjust all session times by the same offset
          const adjustedSessions = customSessions.map(session => {
            const oldStart = new Date(session.start_time);
            const oldEnd = new Date(session.end_time);
            
            const newStart = new Date(oldStart.getTime() + timeDiff);
            const newEnd = new Date(oldEnd.getTime() + timeDiff);
            
            return {
              ...session,
              start_time: newStart.toISOString(),
              end_time: newEnd.toISOString()
            };
          });
          
          console.log('✅ Sessions adjusted to new dates');
          setCustomSessions(adjustedSessions);
          setHasUnsavedChanges(true);
        }
      }
    }
  }, [eventData.start_date, eventData.start_time, eventData.end_date, eventData.end_time]);

  // Generate preview when event data changes
  useEffect(() => {
    // Only auto-generate preview if:
    // 1. We don't have existing preview data
    // 2. User hasn't done custom work that we should preserve
    // 3. All required fields are present
    // 4. No initial custom data provided
    // 5. Not currently initializing
    // 6. No custom sessions already exist
    if (!previewData && 
        !hasCustomWork &&
        !initialCustomData && // Don't auto-generate if we have initial custom data
        !isInitializing && // Don't auto-generate during initialization
        customSessions.length === 0 && // Don't auto-generate if we have custom sessions
        eventData.event_name && 
        eventData.event_type && 
        eventData.start_date && 
        eventData.start_time && 
        eventData.end_date && 
        eventData.end_time) {
      generatePreview();
    }
  }, [eventData.event_name, eventData.event_type, eventData.start_date, eventData.start_time, eventData.end_date, eventData.end_time, eventData.detailed_description, eventData.registration_mode, hasCustomWork, isInitializing, customSessions.length]);

  // Validate custom strategy when it changes
  useEffect(() => {
    if (customStrategy && 
        eventData.start_date && 
        eventData.start_time && 
        eventData.end_date && 
        eventData.end_time &&
        !isInitializing && // Don't validate during initialization
        customSessions.length === 0) { // Only validate if we don't have custom sessions already
      // Only validate when customStrategy changes and we don't have existing custom sessions
      validateCustomStrategy();
    }
  }, [customStrategy, isInitializing, customSessions.length]);

  // Check for missing required fields
  const missingFields = useMemo(() => {
    const missing = [];
    if (!eventData.registration_mode) missing.push('Registration Mode (Individual or Team)');
    if (!eventData.event_type) missing.push('Event Type');
    if (!eventData.start_date || !eventData.start_time) missing.push('Event Start Date/Time');
    if (!eventData.end_date || !eventData.end_time) missing.push('Event End Date/Time');
    return missing;
  }, [eventData.registration_mode, eventData.event_type, eventData.start_date, eventData.start_time, eventData.end_date, eventData.end_time]);

  const generatePreview = async (forceRegenerate = false) => {
    if (!eventData.start_date || !eventData.start_time || !eventData.end_date || !eventData.end_time) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Combine date and time for API
      const startDateTime = new Date(`${eventData.start_date}T${eventData.start_time}`);
      const endDateTime = new Date(`${eventData.end_date}T${eventData.end_time}`);

      // Validate datetime objects
      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        console.error('Invalid datetime values:', {
          start_date: eventData.start_date,
          start_time: eventData.start_time,
          end_date: eventData.end_date,
          end_time: eventData.end_time,
          startDateTime: startDateTime.toString(),
          endDateTime: endDateTime.toString()
        });
        setError('Invalid date or time values. Please check your event schedule.');
        setLoading(false);
        return;
      }

      const requestData = {
        event_name: eventData.event_name,
        event_type: eventData.event_type,
        start_datetime: startDateTime.toISOString(),
        end_datetime: endDateTime.toISOString(),
        detailed_description: eventData.detailed_description || '',
        target_audience: eventData.target_audience || 'students',
        registration_mode: eventData.registration_mode || 'individual'
      };

      const response = await adminAPI.previewAttendanceStrategy(requestData);
      const data = response.data;
      setPreviewData(data);
      
      // If force regenerate, reset custom work flag
      if (forceRegenerate) {
        setHasCustomWork(false);
        setHasUnsavedChanges(false);
      }
      
      // Initialize custom strategy with detected strategy and notify parent
      if (data.success && data.detected_strategy) {
        setCustomStrategy(data.detected_strategy.type);
        
        // Immediately notify parent with the detected strategy data
        if (onStrategyChange) {
          const strategyData = {
            strategy: data.detected_strategy.type,
            detected_strategy: data.detected_strategy,
            criteria: data.criteria,
            sessions: data.sessions,
            warnings: data.validation_details?.warnings || [],
            recommendations: data.recommendations || [],
            minimum_percentage: data.criteria?.minimum_percentage
          };
          
          
          onStrategyChange(strategyData);
        }
      }

    } catch (err) {
      
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
            end_time: endDateTime.toISOString(),
            duration: Math.floor(Math.max(60, (endDateTime - startDateTime) / 1000 / 60)) // Convert to integer minutes
          }
        ],
        criteria: {
          strategy: customStrategy,
          minimum_percentage: customStrategy === 'single_mark' ? 100 : (customStrategy === 'continuous' ? 90 : 75),
          required_sessions: null,
          required_milestones: null,
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
          criteria: data.custom_strategy.criteria,
          sessions: data.custom_strategy.sessions,
          warnings: data.validation_details?.warnings || [],
          recommendations: data.recommendations || [],
          minimum_percentage: data.custom_strategy.criteria?.minimum_percentage
        });
      }

    } catch (err) {
      
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
    setHasCustomWork(true); // Mark that user has made a custom strategy choice
    
    // Always trigger validation to get new sessions for the selected strategy
    // This will generate appropriate sessions based on the strategy type
    if (onStrategyChange) {
      onStrategyChange({
        strategy: newStrategy,
        criteria: null,
        sessions: null,
        warnings: [],
        recommendations: []
      });
    }
    
    // The useEffect for customStrategy will trigger validateCustomStrategy
    // which will generate the new sessions and update the preview
  };

  // Preset configurations for quick setup
  const presetConfigurations = {
    'competition': {
      name: 'Competition Tournament',
      description: 'Multi-round elimination tournament',
      sessions: [
        { name: 'Registration & Inspection', duration: 120, weight: 0.5, mandatory: true },
        { name: 'Qualification Round', duration: 360, weight: 1.0, mandatory: true },
        { name: 'Quarter Finals', duration: 240, weight: 1.5, mandatory: true },
        { name: 'Semi Finals', duration: 240, weight: 1.5, mandatory: true },
        { name: 'Championship Final', duration: 300, weight: 2.0, mandatory: true },
        { name: 'Victory Ceremony', duration: 60, weight: 0.5, mandatory: false }
      ]
    },
    'hackathon': {
      name: 'Hackathon Event',
      description: 'Coding competition with development phases',
      sessions: [
        { name: 'Opening & Team Formation', duration: 120, weight: 1.0, mandatory: true },
        { name: 'Ideation & Planning', duration: 240, weight: 1.0, mandatory: true },
        { name: 'Development Sprint', duration: 1200, weight: 2.0, mandatory: true },
        { name: 'Final Presentations', duration: 180, weight: 1.5, mandatory: true },
        { name: 'Judging & Awards', duration: 120, weight: 1.0, mandatory: false }
      ]
    },
    'workshop': {
      name: 'Multi-Day Workshop',
      description: 'Educational training program',
      sessions: [
        { name: 'Day 1: Fundamentals', duration: 480, weight: 1.0, mandatory: true },
        { name: 'Day 2: Practical Labs', duration: 480, weight: 1.5, mandatory: true },
        { name: 'Day 3: Advanced Topics', duration: 480, weight: 1.5, mandatory: true },
        { name: 'Day 4: Final Project', duration: 480, weight: 2.0, mandatory: true }
      ]
    },
    'cultural': {
      name: 'Cultural Event',
      description: 'Performance-based cultural program',
      sessions: [
        { name: 'Registration & Rehearsal', duration: 180, weight: 0.5, mandatory: true },
        { name: 'Technical Rehearsal', duration: 120, weight: 0.5, mandatory: false },
        { name: 'Dress Rehearsal', duration: 180, weight: 1.0, mandatory: true },
        { name: 'Main Performance', duration: 240, weight: 2.0, mandatory: true },
        { name: 'Award Ceremony', duration: 90, weight: 1.0, mandatory: false }
      ]
    }
  };

  // Advanced session management functions with better UX
  const updateSession = (sessionId, field, value) => {
    setAnimatingChanges(true);
    setCustomSessions(prevSessions => 
      prevSessions.map(session => 
        session.session_id === sessionId 
          ? { ...session, [field]: value }
          : session
      )
    );
    setHasUnsavedChanges(true);
    setHasCustomWork(true); // Mark that user has done custom work
    
    // Auto-calculate duration if start/end time changes
    if (field === 'start_time' || field === 'end_time') {
      setTimeout(() => {
        setCustomSessions(prevSessions => 
          prevSessions.map(session => {
            if (session.session_id === sessionId) {
              const duration = Math.round((new Date(session.end_time) - new Date(session.start_time)) / (1000 * 60));
              return { ...session, duration_minutes: Math.max(15, duration) };
            }
            return session;
          })
        );
      }, 100);
    }
    
    setTimeout(() => setAnimatingChanges(false), 300);
  };

  const applyPreset = (presetKey) => {
    const preset = presetConfigurations[presetKey];
    if (!preset) return;

    const startTime = new Date(eventData.start_date + 'T' + eventData.start_time);
    let currentTime = new Date(startTime);
    
    const newSessions = preset.sessions.map((sessionTemplate, index) => {
      const sessionStart = new Date(currentTime);
      const sessionEnd = new Date(currentTime.getTime() + sessionTemplate.duration * 60 * 1000);
      
      // Add 30-minute break between sessions (except for the last one)
      if (index < preset.sessions.length - 1) {
        currentTime = new Date(sessionEnd.getTime() + 30 * 60 * 1000);
      }

      return {
        session_id: `preset_session_${index + 1}_${Date.now()}`,
        session_name: sessionTemplate.name,
        session_type: 'session',
        start_time: sessionStart.toISOString(),
        end_time: sessionEnd.toISOString(),
        is_mandatory: sessionTemplate.mandatory,
        weight: sessionTemplate.weight,
        status: 'pending',
        duration_minutes: sessionTemplate.duration
      };
    });

    setCustomSessions(newSessions);
    setHasUnsavedChanges(true);
    setHasCustomWork(true); // Mark that user has done custom work
    setShowPresets(false);
    setAnimatingChanges(true);
    setTimeout(() => setAnimatingChanges(false), 500);
    
    // Update criteria based on preset
    setCustomCriteria({
      minimum_percentage: 80,
      required_sessions: Math.ceil(newSessions.filter(s => s.is_mandatory).length * 0.8)
    });
  };

  const toggleSessionExpanded = (sessionId) => {
    setExpandedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  // Drag and drop functionality
  const handleDragStart = (e, sessionId) => {
    setDraggedSession(sessionId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, sessionId) => {
    e.preventDefault();
    setHoveredSession(sessionId);
  };

  const handleDragEnd = () => {
    setDraggedSession(null);
    setHoveredSession(null);
  };

  const handleDrop = (e, targetSessionId) => {
    e.preventDefault();
    
    if (draggedSession && draggedSession !== targetSessionId) {
      const draggedIndex = customSessions.findIndex(s => s.session_id === draggedSession);
      const targetIndex = customSessions.findIndex(s => s.session_id === targetSessionId);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const newSessions = [...customSessions];
        const [draggedItem] = newSessions.splice(draggedIndex, 1);
        newSessions.splice(targetIndex, 0, draggedItem);
        
        setCustomSessions(newSessions);
        setHasUnsavedChanges(true);
        setAnimatingChanges(true);
        setTimeout(() => setAnimatingChanges(false), 300);
      }
    }
    
    handleDragEnd();
  };

  const addNewSession = () => {
    const lastSession = customSessions[customSessions.length - 1];
    const defaultStartTime = lastSession 
      ? new Date(new Date(lastSession.end_time).getTime() + 30 * 60 * 1000) // 30 minutes after last session
      : new Date(eventData.start_date + 'T' + eventData.start_time);
    
    const defaultEndTime = new Date(defaultStartTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours duration

    const newSession = {
      session_id: `custom_session_${Date.now()}`,
      session_name: `Session ${customSessions.length + 1}`,
      session_type: 'session',
      start_time: defaultStartTime.toISOString(),
      end_time: defaultEndTime.toISOString(),
      is_mandatory: true,
      weight: 1.0,
      status: 'pending',
      duration_minutes: 120
    };
    
    setCustomSessions([...customSessions, newSession]);
    setHasUnsavedChanges(true);
    setHasCustomWork(true); // Mark that user has done custom work
    setEditingSessionId(newSession.session_id);
    setExpandedSessions(prev => new Set([...prev, newSession.session_id]));
    setAnimatingChanges(true);
    setTimeout(() => setAnimatingChanges(false), 300);
    
    // Auto-scroll to new session
    setTimeout(() => {
      const element = document.getElementById(`session-${newSession.session_id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const removeSession = (sessionId) => {
    if (customSessions.length <= 1) {
      setError('Cannot remove the last remaining session');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    // Add animation before removing
    setAnimatingChanges(true);
    
    setTimeout(() => {
      setCustomSessions(prevSessions => 
        prevSessions.filter(session => session.session_id !== sessionId)
      );
      setHasUnsavedChanges(true);
      setHasCustomWork(true); // Mark that user has done custom work
      
      if (editingSessionId === sessionId) {
        setEditingSessionId(null);
      }
      
      setExpandedSessions(prev => {
        const newSet = new Set(prev);
        newSet.delete(sessionId);
        return newSet;
      });
      
      setAnimatingChanges(false);
    }, 200);
  };

  const duplicateSession = (sessionId) => {
    const sessionToDuplicate = customSessions.find(s => s.session_id === sessionId);
    if (!sessionToDuplicate) return;

    const duplicatedSession = {
      ...sessionToDuplicate,
      session_id: `custom_session_${Date.now()}`,
      session_name: `${sessionToDuplicate.session_name} (Copy)`,
      start_time: new Date(new Date(sessionToDuplicate.end_time).getTime() + 30 * 60 * 1000).toISOString(),
      end_time: new Date(new Date(sessionToDuplicate.end_time).getTime() + 30 * 60 * 1000 + (sessionToDuplicate.duration_minutes * 60 * 1000)).toISOString()
    };

    setCustomSessions([...customSessions, duplicatedSession]);
    setHasUnsavedChanges(true);
    setExpandedSessions(prev => new Set([...prev, duplicatedSession.session_id]));
    setAnimatingChanges(true);
    setTimeout(() => setAnimatingChanges(false), 300);
  };

  const resetToDefaults = () => {
    setAnimatingChanges(true);
    
    setTimeout(() => {
      if (validationData?.custom_strategy?.sessions) {
        setCustomSessions([...validationData.custom_strategy.sessions]);
        setCustomCriteria({ ...validationData.custom_strategy.criteria });
      } else if (previewData?.sessions) {
        setCustomSessions([...previewData.sessions]);
        setCustomCriteria({ ...previewData.criteria });
      }
      setHasUnsavedChanges(false);
      setHasCustomWork(false); // Reset custom work flag
      setEditingSessionId(null);
      setExpandedSessions(new Set());
      setSuccess('✨ Reset to default configuration');
      setTimeout(() => setSuccess(null), 3000);
      setAnimatingChanges(false);
    }, 200);
  };

  const saveCustomizations = async () => {
    if (!hasUnsavedChanges) return;

    setSaving(true);
    setError(null);
    setAnimatingChanges(true);

    try {
      // Create a temporary event ID for preview purposes
      const tempEventId = `preview_${Date.now()}`;
      
      // Validate sessions for conflicts
      const sortedSessions = [...customSessions].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
      
      for (let i = 0; i < sortedSessions.length - 1; i++) {
        const current = sortedSessions[i];
        const next = sortedSessions[i + 1];
        
        if (new Date(current.end_time) > new Date(next.start_time)) {
          throw new Error(`⚠️ Session "${current.session_name}" overlaps with "${next.session_name}"`);
        }
      }

      // Update duration for each session
      const updatedSessions = customSessions.map(session => ({
        ...session,
        duration_minutes: Math.round((new Date(session.end_time) - new Date(session.start_time)) / (1000 * 60))
      }));

      // Notify parent component with updated configuration
      if (onStrategyChange) {
        onStrategyChange({
          strategy: customStrategy,
          criteria: customCriteria,
          sessions: updatedSessions,
          warnings: [],
          recommendations: [`🎯 Custom configuration with ${updatedSessions.length} sessions applied`],
          minimum_percentage: customCriteria.minimum_percentage
        });
      }

      setHasUnsavedChanges(false);
      setSuccess('🎉 Custom attendance configuration saved successfully!');
      
      // Collapse all expanded sessions after save
      setExpandedSessions(new Set());
      
      setTimeout(() => setSuccess(null), 5000);

    } catch (err) {
      setError(err.message || 'Failed to save customizations');
    } finally {
      setSaving(false);
      setAnimatingChanges(false);
    }
  };

  const formatDateTime = (dateTime) => {
    return new Date(dateTime).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateDuration = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end - start;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Load custom sessions when validation data changes
  useEffect(() => {
    if (validationData?.custom_strategy?.sessions && !hasUnsavedChanges) {
      setCustomSessions([...validationData.custom_strategy.sessions]);
      setCustomCriteria({ ...validationData.custom_strategy.criteria });
    } else if (previewData?.sessions && !hasUnsavedChanges) {
      setCustomSessions([...previewData.sessions]);
      setCustomCriteria({ ...previewData.criteria });
    }
  }, [validationData, previewData]);

  // Check if we have custom work when sessions or criteria change
  useEffect(() => {
    if (customSessions.length > 0 && previewData?.sessions) {
      // Compare sessions to see if there are differences
      const hasSessionDifferences = customSessions.some((customSession, index) => {
        const originalSession = previewData.sessions[index];
        if (!originalSession) return true; // New session added
        
        return (
          customSession.session_name !== originalSession.session_name ||
          customSession.is_mandatory !== originalSession.is_mandatory ||
          customSession.weight !== originalSession.weight ||
          Math.abs(new Date(customSession.start_time) - new Date(originalSession.start_time)) > 60000 || // More than 1 minute difference
          Math.abs(new Date(customSession.end_time) - new Date(originalSession.end_time)) > 60000
        );
      });
      
      if (hasSessionDifferences || customSessions.length !== previewData.sessions.length) {
        setHasCustomWork(true);
      }
    }
  }, [customSessions, customCriteria, previewData]);

  // Notify parent component when custom data changes
  const previousCustomDataRef = useRef();
  const notificationTimeoutRef = useRef();
  
  useEffect(() => {
    // Don't notify during initialization
    if (isInitializing) return;
    
    if (onCustomDataChange && (hasCustomWork || hasUnsavedChanges)) {
      // Clear any pending notification
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
      
      // Debounce the notification to prevent rapid updates
      notificationTimeoutRef.current = setTimeout(() => {
        const customData = {
          strategy: customStrategy,
          sessions: customSessions,
          criteria: customCriteria,
          hasUnsavedChanges,
          hasCustomWork,
          validationData,
          previewData
        };
        
        // Only notify if the data has actually changed
        const previousData = previousCustomDataRef.current;
        if (!previousData || 
            previousData.strategy !== customData.strategy ||
            previousData.hasUnsavedChanges !== customData.hasUnsavedChanges ||
            previousData.hasCustomWork !== customData.hasCustomWork ||
            previousData.sessions?.length !== customData.sessions?.length ||
            Object.keys(previousData.criteria || {}).length !== Object.keys(customData.criteria || {}).length) {
          
          previousCustomDataRef.current = customData;
          onCustomDataChange(customData);
        }
      }, 100); // 100ms debounce
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, [customStrategy, customSessions, customCriteria, hasUnsavedChanges, hasCustomWork, validationData, previewData, isInitializing]);

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
          <Lightbulb className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
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

  // Check if we have data to show
  if (!previewData?.success && !validationData?.success && !hasCustomWork && customSessions.length === 0) {
    return null;
  }

  // Use the most relevant data source
  const data = previewData || validationData || {};
  
  // Calculate duration from event data or sessions
  const calculateEventDuration = () => {
    // Try to get from event_details first
    if (data.event_details?.duration_hours && data.event_details.duration_hours > 0) {
      return data.event_details.duration_hours;
    }
    
    // Try to calculate from eventData props
    if (eventData?.start_date && eventData?.start_time && eventData?.end_date && eventData?.end_time) {
      const startDateTime = new Date(`${eventData.start_date}T${eventData.start_time}`);
      const endDateTime = new Date(`${eventData.end_date}T${eventData.end_time}`);
      
      if (!isNaN(startDateTime.getTime()) && !isNaN(endDateTime.getTime())) {
        return (endDateTime - startDateTime) / (1000 * 60 * 60); // hours
      }
    }
    
    // Try to sum up sessions duration
    const sessions = customSessions.length > 0 ? customSessions : (currentData?.sessions || data?.sessions || []);
    if (sessions.length > 0) {
      const totalMinutes = sessions.reduce((sum, session) => {
        if (session.duration_minutes) {
          return sum + session.duration_minutes;
        }
        if (session.start_time && session.end_time) {
          const duration = (new Date(session.end_time) - new Date(session.start_time)) / (1000 * 60);
          return sum + (isNaN(duration) ? 0 : duration);
        }
        return sum;
      }, 0);
      return totalMinutes / 60; // convert to hours
    }
    
    return 0;
  };
  
  // Determine current data to display based on state
  const currentData = (() => {
    // If we have validation data and it's successful, use it (this is for custom strategies)
    if (validationData?.success && validationData.custom_strategy) {
      return {
        type: validationData.custom_strategy.type,
        name: validationData.custom_strategy.name,
        description: validationData.custom_strategy.description,
        sessions: validationData.custom_strategy.sessions,
        criteria: validationData.custom_strategy.criteria,
        recommendations: validationData.recommendations || []
      };
    }
    
    // If we have custom sessions but no validation data, create a basic structure
    if (customSessions.length > 0 && (!validationData || !validationData.success)) {
      return {
        type: customStrategy || 'session_based',
        name: `Custom ${(customStrategy || 'session_based').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Strategy`,
        description: 'User-customized attendance strategy',
        sessions: customSessions,
        criteria: customCriteria || {},
        recommendations: []
      };
    }
    
    // If no validation data but we have a custom strategy selected that differs from detected
    if (customStrategy && data?.detected_strategy && customStrategy !== data.detected_strategy?.type) {
      // Show loading state or basic info while waiting for validation
      return {
        type: customStrategy,
        name: `${customStrategy.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Strategy`,
        description: validating ? "Generating strategy details..." : "Strategy being configured",
        sessions: [],
        criteria: {},
        recommendations: []
      };
    }
    
    // Otherwise, use original detected strategy data
    return {
      type: data?.detected_strategy?.type,
      name: data?.detected_strategy?.name,
      description: data?.detected_strategy?.description,
      sessions: data?.sessions || [],
      criteria: data?.criteria || {},
      recommendations: data?.recommendations || []
    };
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
              {(() => {
                const duration = calculateEventDuration();
                return duration > 0 ? `${Math.round(duration)}h event` : 'Event duration';
              })()} • {(currentData.sessions || []).length} session(s)
              {hasUnsavedChanges && (
                <span className="ml-2 text-amber-600 font-medium">• Unsaved changes</span>
              )}
              {hasCustomWork && (
                <span className="ml-2 text-blue-600 font-medium">• Custom configuration</span>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Refresh Preview Button */}
          <button
            type="button"
            onClick={() => {
              if (hasCustomWork || hasUnsavedChanges) {
                if (confirm('This will regenerate the attendance strategy and reset all your customizations. Are you sure?')) {
                  generatePreview(true);
                }
              } else {
                generatePreview(true);
              }
            }}
            disabled={loading}
            className="flex items-center space-x-1 px-3 py-1.5 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh attendance strategy preview"
          >
            <svg className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          {hasUnsavedChanges && (
            <>
              <button
                type="button"
                onClick={resetToDefaults}
                className="flex items-center space-x-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </button>
              <button
                type="button"
                onClick={saveCustomizations}
                disabled={saving}
                className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save</span>
                  </>
                )}
              </button>
            </>
          )}
          {onToggleCustomization && (
            <button
              type="button"
              onClick={onToggleCustomization}
              className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              <span>{showCustomization ? 'Hide Options' : 'Customize'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <motion.div 
          className="bg-green-50 border border-green-200 rounded-lg p-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center">
            <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
            <span className="text-sm text-green-700">{success}</span>
          </div>
        </motion.div>
      )}

      {error && (
        <motion.div 
          className="bg-red-50 border border-red-200 rounded-lg p-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center">
            <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </motion.div>
      )}

      {/* Preset Configurations */}
      {showCustomization && (
        <motion.div 
          className="bg-white border border-gray-200 rounded-lg p-4"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-purple-600" />
              <h4 className="text-sm font-medium text-gray-900">Quick Setup Presets</h4>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowPresets(!showPresets);
              }}
              className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              {showPresets ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span>{showPresets ? 'Hide' : 'Show'} Presets</span>
            </button>
          </div>

          {showPresets && (
            <motion.div 
              className="grid grid-cols-2 gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {Object.entries(presetConfigurations).map(([key, preset]) => (
                <motion.button
                  key={key}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    applyPreset(key);
                  }}
                  className="text-left p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all duration-200 group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <div className={`p-1.5 rounded-md ${preset.color}`}>
                      {preset.icon}
                    </div>
                    <h5 className="text-sm font-medium text-gray-900 group-hover:text-purple-900">
                      {preset.name}
                    </h5>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{preset.description}</p>
                  <div className="text-xs text-gray-500">
                    {preset.sessions.length} sessions • {preset.duration}
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </motion.div>
      )}



      {/* Warnings (if any) */}
      {validationData?.recommendations?.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <Lightbulb className="w-4 h-4 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800 mb-1">Recommendations:</p>
              <ul className="text-sm text-green-700 space-y-1">
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
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">Choose Attendance Strategy</h4>
            <button
              type="button"
              onClick={() => setShowAdvancedCustomization(!showAdvancedCustomization)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              {showAdvancedCustomization ? 'Hide Advanced' : 'Advanced Options'}
            </button>
          </div>
          
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

          {/* Advanced Session Customization */}
          {showAdvancedCustomization && customSessions.length > 0 && (
            <motion.div 
              className="border-t border-gray-200 pt-4 space-y-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Move className="w-4 h-4 text-blue-600" />
                  <h5 className="text-sm font-semibold text-gray-900">Session Configuration</h5>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    Drag to reorder
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={duplicateSession}
                    className="flex items-center space-x-1 px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-xs font-medium transition-colors"
                    title="Duplicate last session"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Duplicate</span>
                  </button>
                  <button
                    type="button"
                    onClick={addNewSession}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Session</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                <AnimatePresence>
                  {customSessions.map((session, index) => (
                    <motion.div
                      key={session.session_id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                      className={`
                        border rounded-lg p-3 cursor-move transition-all duration-200
                        ${editingSessionId === session.session_id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                        ${draggedSession === index ? 'opacity-50 transform scale-95' : ''}
                        ${hoveredSession === index ? 'border-blue-300 shadow-md' : ''}
                        ${animatingChanges ? 'animate-pulse' : ''}
                      `}
                      onMouseEnter={() => setHoveredSession(index)}
                      onMouseLeave={() => setHoveredSession(null)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1">
                            <Move className="w-3 h-3 text-gray-400" />
                            <span className="w-6 h-6 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-medium">
                              {index + 1}
                            </span>
                          </div>
                          {editingSessionId === session.session_id ? (
                            <input
                              type="text"
                              value={session.session_name}
                              onChange={(e) => updateSession(session.session_id, 'session_name', e.target.value)}
                              className="text-sm font-medium border-none bg-transparent focus:ring-1 focus:ring-blue-500 rounded px-1"
                              onBlur={() => setEditingSessionId(null)}
                              onKeyDown={(e) => e.key === 'Enter' && setEditingSessionId(null)}
                              autoFocus
                            />
                          ) : (
                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                onClick={() => setEditingSessionId(session.session_id)}
                                className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
                              >
                                {session.session_name}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setExpandedSessions(prev => {
                                    const newSet = new Set(prev);
                                    if (newSet.has(session.session_id)) {
                                      newSet.delete(session.session_id);
                                    } else {
                                      newSet.add(session.session_id);
                                    }
                                    return newSet;
                                  });
                                }}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                              >
                                {expandedSessions.has(session.session_id) ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          )}
                          {session.is_mandatory && (
                            <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium">
                              Required
                            </span>
                          )}
                          {session.weight > 1 && (
                            <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-medium">
                              High Priority
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => duplicateSession(session.session_id)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Duplicate session"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          {customSessions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSession(session.session_id)}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                              title="Remove session"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {expandedSessions.has(session.session_id) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                            <div>
                              <label className="block text-gray-600 mb-1">Start Time (IST)</label>
                              <input
                                type="datetime-local"
                                value={toISTDatetimeLocal(session.start_time)}
                                onChange={(e) => {
                                  const newStartTime = fromISTDatetimeLocal(e.target.value);
                                  updateSession(session.session_id, 'start_time', newStartTime);
                                  // Auto-adjust end time to maintain duration
                                  const duration = session.duration_minutes || 120;
                                  const startDate = new Date(newStartTime);
                                  const newEndTime = new Date(startDate.getTime() + duration * 60 * 1000).toISOString();
                                  updateSession(session.session_id, 'end_time', newEndTime);
                                }}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-gray-600 mb-1">End Time (IST)</label>
                              <input
                                type="datetime-local"
                                value={toISTDatetimeLocal(session.end_time)}
                                onChange={(e) => updateSession(session.session_id, 'end_time', fromISTDatetimeLocal(e.target.value))}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-gray-600 mb-1">Priority Weight</label>
                              <select
                                value={session.weight}
                                onChange={(e) => updateSession(session.session_id, 'weight', parseFloat(e.target.value))}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                              >
                                <option value={0.5}>0.5x (Low)</option>
                                <option value={1.0}>1.0x (Normal)</option>
                                <option value={1.5}>1.5x (High)</option>
                                <option value={2.0}>2.0x (Critical)</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                            <div className="flex items-center space-x-4">
                              <label className="flex items-center space-x-1">
                                <input
                                  type="checkbox"
                                  checked={session.is_mandatory}
                                  onChange={(e) => updateSession(session.session_id, 'is_mandatory', e.target.checked)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
                                />
                                <span className="text-xs text-gray-600">Mandatory Attendance</span>
                              </label>
                            </div>
                            <div className="text-xs text-gray-500 flex items-center space-x-2">
                              <Clock className="w-3 h-3" />
                              <span>{calculateDuration(session.start_time, session.end_time)}</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Pass Criteria Customization */}
              <div className="border-t border-gray-200 pt-4">
                <h6 className="text-sm font-semibold text-gray-900 mb-3">Pass Criteria</h6>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Minimum Attendance Percentage</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="range"
                        min="50"
                        max="100"
                        step="5"
                        value={customCriteria.minimum_percentage || 75}
                        onChange={(e) => {
                          setCustomCriteria(prev => ({ ...prev, minimum_percentage: parseInt(e.target.value) }));
                          setHasUnsavedChanges(true);
                        }}
                        className="flex-1"
                      />
                      <span className="text-sm font-semibold text-blue-600 w-12">
                        {customCriteria.minimum_percentage || 75}%
                      </span>
                    </div>
                  </div>

                  {customStrategy === 'session_based' && (
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Required Sessions (Alternative)</label>
                      <input
                        type="number"
                        min="1"
                        max={customSessions.length}
                        value={customCriteria.required_sessions || Math.ceil(customSessions.length * 0.75)}
                        onChange={(e) => {
                          setCustomCriteria(prev => ({ ...prev, required_sessions: parseInt(e.target.value) }));
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Session Timeline */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-900">Attendance Timeline</h4>
          <div className="flex items-center space-x-2">
            {hasUnsavedChanges && (
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                Modified
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
          </div>
        </div>
        
        <div className="space-y-2">
          {(customSessions.length > 0 ? customSessions : currentData.sessions || [])
            .slice(0, showDetails ? undefined : 3)
            .map((session, idx) => (
            <div key={session.session_id || idx} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${session.is_mandatory ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
                <div>
                  <p className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                    <span>{session.session_name}</span>
                    {!session.is_mandatory && (
                      <span className="text-xs text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded-full">Optional</span>
                    )}
                    {session.weight > 1 && (
                      <span className="text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">
                        {session.weight}x
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-600 capitalize">{session.session_type} session</p>
                  {showDetails && (
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDateTime(session.start_time)} - {formatDateTime(session.end_time)}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-500">
                  {session.duration_minutes > 0 
                    ? calculateDuration(session.start_time, session.end_time)
                    : Math.floor(session.duration_minutes / 60) + 'h ' + (session.duration_minutes % 60) + 'm'
                  }
                </span>
                {showDetails && session.weight !== 1 && (
                  <p className="text-xs text-gray-400">Weight: {session.weight}</p>
                )}
              </div>
            </div>
          ))}
          
          {!showDetails && (customSessions.length > 0 ? customSessions : currentData.sessions || []).length > 3 && (
            <div className="text-center py-2">
              <span className="text-xs text-gray-500">
                +{(customSessions.length > 0 ? customSessions : currentData.sessions || []).length - 3} more sessions
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <p className="text-lg font-semibold text-gray-900">
            {customSessions.length > 0 ? customSessions.length : (currentData.sessions || []).length}
          </p>
          <p className="text-xs text-gray-600">Total Sessions</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <p className="text-lg font-semibold text-gray-900">
            {customCriteria.minimum_percentage || 
             currentData.criteria?.minimum_percentage || 
             (customStrategy === 'single_mark' ? '100' : '75')}%
          </p>
          <p className="text-xs text-gray-600">Pass Criteria</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <p className="text-lg font-semibold text-gray-900">
            {(() => {
              const duration = calculateEventDuration();
              return duration > 0 ? `${Math.round(duration)}h` : '-';
            })()}
          </p>
          <p className="text-xs text-gray-600">Duration</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
          <p className="text-lg font-semibold text-gray-900">
            {customSessions.length > 0 
              ? customSessions.filter(s => s.is_mandatory).length 
              : (customStrategy === 'continuous' ? 'High' : 'Standard')
            }
            {customSessions.length > 0 && (
              <span className="text-xs text-gray-500 block">
                / {customSessions.length} mandatory
              </span>
            )}
          </p>
          <p className="text-xs text-gray-600">
            {customSessions.length > 0 ? 'Mandatory' : 'Flexibility'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AttendancePreview;
