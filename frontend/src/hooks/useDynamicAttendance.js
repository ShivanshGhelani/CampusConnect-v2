import { useState, useEffect, useCallback } from 'react';
import api from '../api/base';

/**
 * Custom hook for managing dynamic attendance functionality
 * Provides state and methods for attendance configuration, sessions, and marking
 */
export const useDynamicAttendance = (eventId) => {
  // Core state
  const [config, setConfig] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [markingInProgress, setMarkingInProgress] = useState(false);

  // Load attendance configuration
  const loadConfig = useCallback(async () => {
    if (!eventId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      
      
      // Try to get existing configuration
      const response = await api.get(`/api/v1/attendance/config/${eventId}`);
      
      if (response.data.success) {
        setConfig(response.data.data);
        
      } else {
        // Configuration doesn't exist, try to initialize
        
        
        const initResponse = await api.post(`/api/v1/attendance/initialize/${eventId}`);
        
        if (initResponse.data.success) {
          
          
          // Retry loading configuration
          const retryResponse = await api.get(`/api/v1/attendance/config/${eventId}`);
          if (retryResponse.data.success) {
            setConfig(retryResponse.data.data);
            
          }
        } else {
          throw new Error(initResponse.data.message || 'Failed to initialize attendance configuration');
        }
      }
    } catch (err) {
      
      
      // Fallback to single-mark strategy for compatibility
      
      setConfig({
        event_id: eventId,
        strategy: 'single_mark',
        criteria: {
          strategy: 'single_mark',
          minimum_percentage: 100,
          auto_calculate: true
        },
        sessions: [{
          session_id: 'default_session',
          session_name: 'Main Session',
          session_type: 'single',
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
          status: 'active',
          is_mandatory: true,
          weight: 1.0
        }],
        auto_generated: false
      });
      
      setError(`Using fallback strategy: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  // Load active sessions
  const loadActiveSessions = useCallback(async () => {
    if (!eventId) return;
    
    try {
      
      
      const response = await api.get(`/api/v1/attendance/sessions/${eventId}/active`);
      
      if (response.data.success) {
        setSessions(response.data.data);
        
      } else {
        
        setSessions({ active_sessions: [], upcoming_sessions: [], can_mark_attendance: false });
      }
    } catch (err) {
      
      // Don't set error state for sessions, just log it
      setSessions({ active_sessions: [], upcoming_sessions: [], can_mark_attendance: false });
    }
  }, [eventId]);

  // Load analytics
  const loadAnalytics = useCallback(async () => {
    if (!eventId) return;
    
    try {
      
      
      const response = await api.get(`/api/v1/attendance/analytics/${eventId}`);
      
      if (response.data.success) {
        setAnalytics(response.data.data);
        
      } else {
        
        setAnalytics(null);
      }
    } catch (err) {
      
      // Don't set error state for analytics, just log it
      setAnalytics(null);
    }
  }, [eventId]);

  // Mark attendance for a student
  const markAttendance = useCallback(async (studentEnrollment, sessionId = null, notes = '') => {
    if (!eventId || !studentEnrollment) {
      throw new Error('Event ID and student enrollment are required');
    }
    
    setMarkingInProgress(true);
    
    try {
      
      
      const response = await api.post(`/api/v1/attendance/mark/${eventId}`, {
        student_enrollment: studentEnrollment,
        session_id: sessionId,
        notes: notes || 'Marked via dynamic attendance portal'
      });
      
      if (response.data.success) {
        
        
        // Refresh data after successful marking
        await Promise.all([
          loadActiveSessions(),
          loadAnalytics()
        ]);
        
        return response.data;
      } else {
        throw new Error(response.data.message || 'Failed to mark attendance');
      }
    } catch (err) {
      
      throw err;
    } finally {
      setMarkingInProgress(false);
    }
  }, [eventId, loadActiveSessions, loadAnalytics]);

  // Bulk mark attendance
  const bulkMarkAttendance = useCallback(async (studentEnrollments, sessionId = null, notes = '') => {
    if (!eventId || !studentEnrollments?.length) {
      throw new Error('Event ID and student enrollments are required');
    }
    
    setMarkingInProgress(true);
    
    try {
      
      
      const response = await api.post(`/api/v1/attendance/bulk-mark/${eventId}`, {
        student_enrollments: studentEnrollments,
        session_id: sessionId,
        marked_by: 'admin_portal',
        notes: notes || 'Bulk marked via dynamic attendance portal'
      });
      
      if (response.data.success) {
        const successCount = response.data.data.successful_count || 0;
        
        
        // Refresh data after successful marking
        await Promise.all([
          loadActiveSessions(),
          loadAnalytics()
        ]);
        
        return response.data;
      } else {
        throw new Error(response.data.message || 'Failed to mark bulk attendance');
      }
    } catch (err) {
      
      throw err;
    } finally {
      setMarkingInProgress(false);
    }
  }, [eventId, loadActiveSessions, loadAnalytics]);

  // Get student attendance status
  const getStudentStatus = useCallback(async (studentEnrollment) => {
    if (!eventId || !studentEnrollment) return null;
    
    try {
      const response = await api.get(`/api/v1/attendance/status/${eventId}/${studentEnrollment}`);
      
      if (response.data.success) {
        return response.data.data;
      }
      return null;
    } catch (err) {
      
      return null;
    }
  }, [eventId]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    await Promise.all([
      loadConfig(),
      loadActiveSessions(), 
      loadAnalytics()
    ]);
  }, [loadConfig, loadActiveSessions, loadAnalytics]);

  // Initialize data when eventId changes
  useEffect(() => {
    if (eventId) {
      
      refreshData();
    }
  }, [eventId, refreshData]);

  // Auto-refresh active sessions every 30 seconds
  useEffect(() => {
    if (!eventId) return;
    
    const interval = setInterval(() => {
      
      loadActiveSessions();
    }, 30000);

    return () => clearInterval(interval);
  }, [eventId, loadActiveSessions]);

  // Determine if we can mark attendance based on current state
  const canMarkAttendance = config && (
    config.strategy === 'single_mark' || 
    sessions?.can_mark_attendance || 
    sessions?.active_sessions?.length > 0
  );

  // Get current active session for single-session marking
  const getCurrentSession = () => {
    if (!sessions?.active_sessions?.length) return null;
    return sessions.active_sessions[0]; // Return first active session
  };

  // Strategy-specific helpers
  const getStrategyInfo = () => {
    if (!config) return null;
    
    const strategyMap = {
      single_mark: {
        name: 'Single Mark',
        description: 'Students mark attendance once during the event',
        icon: 'target'
      },
      session_based: {
        name: 'Session-Based',
        description: 'Students must attend required sessions',
        icon: 'activity'
      },
      day_based: {
        name: 'Day-Based', 
        description: 'Students must attend required days',
        icon: 'calendar'
      },
      milestone_based: {
        name: 'Milestone-Based',
        description: 'Students must complete key milestones',
        icon: 'flag'
      },
      continuous: {
        name: 'Continuous Monitoring',
        description: 'Continuous engagement tracking',
        icon: 'activity'
      }
    };
    
    return strategyMap[config.strategy] || strategyMap.single_mark;
  };

  return {
    // State
    config,
    sessions,
    analytics,
    loading,
    error,
    markingInProgress,
    
    // Actions
    loadConfig,
    markAttendance,
    bulkMarkAttendance,
    getStudentStatus,
    refreshData,
    
    // Computed
    canMarkAttendance,
    getCurrentSession,
    getStrategyInfo,
    
    // Strategy detection
    strategy: config?.strategy || 'single_mark',
    isMultiSession: config?.strategy === 'session_based',
    isMultiDay: config?.strategy === 'day_based',
    isMilestoneBased: config?.strategy === 'milestone_based',
    isContinuous: config?.strategy === 'continuous',
    isSingleMark: !config || config?.strategy === 'single_mark'
  };
};
