import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Users, 
  Search, 
  Filter, 
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  UserCheck,
  RefreshCw,
  Flag,
  Target,
  TrendingUp,
  BarChart3,
  Award,
  Star,
  Trophy,
  Zap,
  CheckSquare,
  Square
} from 'lucide-react';
import AdminLayout from '../AdminLayout';
import LoadingSpinner from '../../LoadingSpinner';
import { useDynamicAttendance } from '../../../hooks/useDynamicAttendance';
import { 
  StrategyInfoCard, 
  AttendanceProgress
} from './StrategyComponents';
import api from '../../../api/base';

const MilestoneBasedPortal = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  
  // Dynamic attendance hook
  const {
    config,
    analytics,
    loading: dynamicLoading,
    error: dynamicError,
    loadConfig,
    markAttendance,
    bulkMarkAttendance,
    refreshData
  } = useDynamicAttendance(eventId);
  
  // Local state
  const [registrations, setRegistrations] = useState([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [milestoneStats, setMilestoneStats] = useState({});
  const [selectedRegistrations, setSelectedRegistrations] = useState([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [notification, setNotification] = useState(null);
  const [viewMode, setViewMode] = useState('milestones'); // 'milestones', 'students', 'analytics'
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Initialize
  useEffect(() => {
    loadConfig().then(() => {
      fetchMilestones();
      fetchMilestoneRegistrations();
    }).catch(err => {
      console.error('Failed to load milestone-based configuration:', err);
      setError('This event is not configured for milestone-based attendance');
    });
  }, [eventId, loadConfig]);

  // Set first milestone as default
  useEffect(() => {
    if (milestones.length > 0 && !selectedMilestone) {
      const firstIncomplete = milestones.find(m => !m.is_completed);
      setSelectedMilestone(firstIncomplete?.milestone_id || milestones[0].milestone_id);
    }
  }, [milestones, selectedMilestone]);

  // Load milestone-specific data
  useEffect(() => {
    if (selectedMilestone) {
      fetchMilestoneRegistrations();
      fetchMilestoneStats();
    }
  }, [selectedMilestone]);

  // Auto-refresh
  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(async () => {
        await Promise.all([
          fetchMilestoneRegistrations(),
          fetchMilestoneStats(),
          refreshData()
        ]);
      }, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, selectedMilestone, refreshData]);

  // Search filter
  useEffect(() => {
    if (searchTerm) {
      const filtered = registrations.filter(reg => 
        reg.student_enrollment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.student_data?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.student_data?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredRegistrations(filtered);
    } else {
      setFilteredRegistrations(registrations);
    }
  }, [searchTerm, registrations]);

  const fetchMilestones = async () => {
    try {
      const response = await api.get(`/api/v1/attendance/milestones/${eventId}`);
      if (response.data.success) {
        setMilestones(response.data.data.milestones || []);
      } else {
        // Generate default milestones
        generateDefaultMilestones();
      }
    } catch (err) {
      console.error('Error fetching milestones:', err);
      generateDefaultMilestones();
    }
  };

  const generateDefaultMilestones = () => {
    const defaultMilestones = [
      {
        milestone_id: 'registration',
        milestone_name: 'Event Registration',
        description: 'Complete event registration and check-in',
        is_mandatory: true,
        order: 1,
        is_completed: false,
        icon: 'UserCheck'
      },
      {
        milestone_id: 'orientation',
        milestone_name: 'Orientation Session',
        description: 'Attend the event orientation session',
        is_mandatory: true,
        order: 2,
        is_completed: false,
        icon: 'Flag'
      },
      {
        milestone_id: 'activity_completion',
        milestone_name: 'Core Activity Completion',
        description: 'Complete main event activities',
        is_mandatory: true,
        order: 3,
        is_completed: false,
        icon: 'Target'
      },
      {
        milestone_id: 'feedback',
        milestone_name: 'Feedback Submission',
        description: 'Submit event feedback form',
        is_mandatory: false,
        order: 4,
        is_completed: false,
        icon: 'Star'
      }
    ];
    setMilestones(defaultMilestones);
  };

  const fetchMilestoneRegistrations = async () => {
    if (!selectedMilestone) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/api/v1/attendance/milestones/${selectedMilestone}/registrations`);
      
      if (response.data.success) {
        setRegistrations(response.data.data.registrations || []);
      } else {
        // Fallback to general registrations
        const fallbackResponse = await api.get(`/api/v1/admin/event-registration/event/${eventId}`);
        if (fallbackResponse.data.success) {
          setRegistrations(fallbackResponse.data.data.registrations || []);
        }
      }
    } catch (err) {
      console.error('Error fetching milestone registrations:', err);
      setError('Failed to load milestone registrations');
    } finally {
      setLoading(false);
    }
  };

  const fetchMilestoneStats = async () => {
    if (!selectedMilestone) return;
    
    try {
      const response = await api.get(`/api/v1/attendance/milestones/${selectedMilestone}/stats`);
      if (response.data.success) {
        setMilestoneStats(prev => ({
          ...prev,
          [selectedMilestone]: response.data.data
        }));
      }
    } catch (err) {
      console.error('Error fetching milestone stats:', err);
    }
  };

  const handleMarkMilestone = async (registrationId, notes = '') => {
    if (!selectedMilestone) {
      showNotification('Please select a milestone first', 'error');
      return;
    }

    try {
      const result = await markAttendance(registrationId, {
        notes,
        milestone_id: selectedMilestone,
        verification_method: 'physical'
      });
      
      if (result.success) {
        showNotification('Milestone marked successfully', 'success');
        await Promise.all([
          fetchMilestoneRegistrations(),
          fetchMilestoneStats(),
          refreshData()
        ]);
      } else {
        showNotification(result.message || 'Failed to mark milestone', 'error');
      }
    } catch (err) {
      console.error('Error marking milestone:', err);
      showNotification('Network error while marking milestone', 'error');
    }
  };

  const handleBulkMilestoneMark = async (registrationIds, notes) => {
    if (!selectedMilestone) {
      showNotification('Please select a milestone first', 'error');
      return;
    }

    try {
      const result = await bulkMarkAttendance(registrationIds, {
        notes,
        milestone_id: selectedMilestone,
        verification_method: 'physical'
      });
      
      if (result.success) {
        const successCount = result.successful?.length || registrationIds.length;
        showNotification(`${successCount} students completed milestone`, 'success');
        setSelectedRegistrations([]);
        setShowBulkModal(false);
        
        await Promise.all([
          fetchMilestoneRegistrations(),
          fetchMilestoneStats(),
          refreshData()
        ]);
      } else {
        showNotification(result.message || 'Failed to mark bulk milestone', 'error');
      }
    } catch (err) {
      console.error('Error marking bulk milestone:', err);
      showNotification('Network error while marking bulk milestone', 'error');
    }
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchMilestones(),
        fetchMilestoneRegistrations(),
        fetchMilestoneStats(),
        refreshData()
      ]);
      showNotification('Milestone data refreshed successfully', 'success');
    } catch (error) {
      console.error('Error refreshing milestone data:', error);
      showNotification('Error refreshing data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getMilestoneProgress = (milestoneId) => {
    if (!milestoneStats[milestoneId]) return { completed: 0, total: registrations.length };
    return {
      completed: milestoneStats[milestoneId].completed || 0,
      total: milestoneStats[milestoneId].total || registrations.length
    };
  };

  const getOverallProgress = () => {
    if (!milestones.length) return null;
    
    const mandatoryMilestones = milestones.filter(m => m.is_mandatory);
    const completedMandatory = mandatoryMilestones.filter(milestone => {
      const progress = getMilestoneProgress(milestone.milestone_id);
      return progress.completed > 0;
    }).length;
    
    const totalCompleted = milestones.filter(milestone => {
      const progress = getMilestoneProgress(milestone.milestone_id);
      return progress.completed > 0;
    }).length;
    
    return {
      mandatory: {
        current: completedMandatory,
        total: mandatoryMilestones.length
      },
      overall: {
        current: totalCompleted,
        total: milestones.length
      },
      isComplete: completedMandatory === mandatoryMilestones.length
    };
  };

  const getMilestoneIcon = (iconName) => {
    const iconMap = {
      UserCheck,
      Flag,
      Target,
      Star,
      Trophy,
      Award,
      Zap
    };
    return iconMap[iconName] || Flag;
  };

  if (loading && dynamicLoading) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </AdminLayout>
    );
  }

  if (error || (config && config.strategy !== 'milestone_based')) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Milestone-Based Attendance Not Available</h3>
            <p className="text-gray-600 mb-4">
              {error || 'This event is not configured for milestone-based attendance tracking.'}
            </p>
            <button
              onClick={() => navigate(`/admin/events/${eventId}`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Event
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const selectedMilestoneData = milestones.find(m => m.milestone_id === selectedMilestone);
  const overallProgress = getOverallProgress();

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate(`/admin/events/${eventId}/attendance`)}
                  className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all duration-200 border border-gray-200"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <Flag className="w-8 h-8 text-yellow-600" />
                    Milestone-Based Attendance
                  </h1>
                  <p className="text-gray-600 mt-1">Track completion of event milestones</p>
                </div>
              </div>
              
              {/* Header Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg border transition-all duration-200 ${
                    autoRefresh 
                      ? 'bg-green-50 border-green-200 text-green-700 shadow-sm' 
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                  Auto-refresh
                </button>
                
                <button
                  onClick={handleRefresh}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>

                {/* View Mode Toggle */}
                <div className="flex bg-white border border-gray-300 rounded-lg shadow-sm">
                  <button
                    onClick={() => setViewMode('milestones')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm transition-all duration-200 rounded-l-lg ${
                      viewMode === 'milestones' 
                        ? 'bg-yellow-50 text-yellow-700 border-r border-yellow-200' 
                        : 'text-gray-700 hover:bg-gray-50 border-r border-gray-300'
                    }`}
                  >
                    <Flag className="w-4 h-4" />
                    Milestones
                  </button>
                  <button
                    onClick={() => setViewMode('students')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm transition-all duration-200 ${
                      viewMode === 'students' 
                        ? 'bg-yellow-50 text-yellow-700 border-r border-yellow-200' 
                        : 'text-gray-700 hover:bg-gray-50 border-r border-gray-300'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Students
                  </button>
                  <button
                    onClick={() => setViewMode('analytics')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm transition-all duration-200 rounded-r-lg ${
                      viewMode === 'analytics' 
                        ? 'bg-yellow-50 text-yellow-700' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    Analytics
                  </button>
                </div>
              </div>
            </div>

            {/* Strategy Information */}
            {config && (
              <div className="mb-6">
                <StrategyInfoCard 
                  strategy={config.strategy}
                  criteria={config.criteria}
                  sessions={milestones}
                />
              </div>
            )}

            {/* Overall Progress */}
            {overallProgress && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-yellow-600" />
                    Milestone Progress
                  </h3>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    overallProgress.isComplete
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {overallProgress.isComplete ? 'All Mandatory Complete' : 'In Progress'}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Mandatory Milestones</h4>
                    <AttendanceProgress
                      current={overallProgress.mandatory.current}
                      total={overallProgress.mandatory.total}
                      strategy="milestone_based"
                    />
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Overall Progress</h4>
                    <AttendanceProgress
                      current={overallProgress.overall.current}
                      total={overallProgress.overall.total}
                      strategy="milestone_based"
                    />
                  </div>
                </div>
                
                <div className="mt-4 text-sm text-gray-600">
                  {overallProgress.mandatory.current} of {overallProgress.mandatory.total} mandatory milestones completed
                  • {overallProgress.overall.current} of {overallProgress.overall.total} total milestones
                </div>
              </div>
            )}
          </div>

          {/* Milestones View */}
          {viewMode === 'milestones' && (
            <div className="space-y-6">
              {/* Milestones List */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                  <Flag className="w-5 h-5 text-yellow-600" />
                  Event Milestones
                </h3>
                
                <div className="space-y-4">
                  {milestones.map((milestone, index) => {
                    const progress = getMilestoneProgress(milestone.milestone_id);
                    const isSelected = selectedMilestone === milestone.milestone_id;
                    const isCompleted = progress.completed === progress.total && progress.total > 0;
                    const MilestoneIcon = getMilestoneIcon(milestone.icon);
                    
                    return (
                      <div
                        key={milestone.milestone_id}
                        onClick={() => setSelectedMilestone(milestone.milestone_id)}
                        className={`border rounded-lg p-6 cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? 'ring-2 ring-yellow-500 border-yellow-300 bg-yellow-50'
                            : isCompleted
                            ? 'border-green-200 bg-green-50 hover:border-green-300'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          {/* Milestone Number & Icon */}
                          <div className="flex-shrink-0">
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                              isCompleted 
                                ? 'bg-green-100 text-green-600' 
                                : isSelected
                                ? 'bg-yellow-100 text-yellow-600'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {isCompleted ? (
                                <CheckCircle className="w-6 h-6" />
                              ) : (
                                <MilestoneIcon className="w-6 h-6" />
                              )}
                            </div>
                          </div>
                          
                          {/* Milestone Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-medium text-gray-900">{milestone.milestone_name}</h4>
                              <div className="flex items-center gap-2">
                                {milestone.is_mandatory && (
                                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                                    Mandatory
                                  </span>
                                )}
                                {isCompleted && (
                                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                    Complete
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <p className="text-gray-600 text-sm mb-4">{milestone.description}</p>
                            
                            {/* Progress */}
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Completion</span>
                                <span className="font-medium text-gray-900">
                                  {progress.completed}/{progress.total}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    isCompleted
                                      ? 'bg-green-500'
                                      : progress.completed > 0
                                      ? 'bg-yellow-500'
                                      : 'bg-gray-300'
                                  }`}
                                  style={{ 
                                    width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%` 
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                          
                          {/* Action Button */}
                          <div className="flex-shrink-0">
                            {isSelected && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewMode('students');
                                }}
                                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                              >
                                Manage
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Students View */}
          {viewMode === 'students' && selectedMilestoneData && (
            <MilestoneStudentsView 
              registrations={filteredRegistrations}
              selectedMilestone={selectedMilestoneData}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              selectedRegistrations={selectedRegistrations}
              setSelectedRegistrations={setSelectedRegistrations}
              onMarkMilestone={handleMarkMilestone}
              onBulkMark={() => setShowBulkModal(true)}
              loading={loading}
            />
          )}

          {/* Analytics View */}
          {viewMode === 'analytics' && (
            <MilestoneAnalyticsView 
              milestones={milestones}
              analytics={analytics}
              milestoneStats={milestoneStats}
              config={config}
              getMilestoneProgress={getMilestoneProgress}
            />
          )}
        </div>
      </div>

      {/* Bulk Mark Modal */}
      {showBulkModal && selectedMilestoneData && (
        <BulkMilestoneModal
          selectedCount={selectedRegistrations.length}
          milestoneName={selectedMilestoneData.milestone_name}
          onConfirm={handleBulkMilestoneMark}
          onCancel={() => setShowBulkModal(false)}
          registrationIds={selectedRegistrations}
        />
      )}

      {/* Notification */}
      {notification && (
        <div className={`fixed top-6 right-6 p-6 rounded-xl shadow-lg z-50 max-w-md border-l-4 ${
          notification.type === 'success' 
            ? 'bg-green-50 border-green-400 text-green-800' 
            : notification.type === 'warning'
            ? 'bg-yellow-50 border-yellow-400 text-yellow-800'
            : 'bg-red-50 border-red-400 text-red-800'
        }`}>
          <div className="flex items-start gap-3">
            {notification.type === 'success' ? (
              <CheckCircle className="w-6 h-6 mt-0.5" />
            ) : (
              <AlertCircle className="w-6 h-6 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="font-semibold mb-1">
                {notification.type === 'success' ? 'Success' : 
                 notification.type === 'warning' ? 'Warning' : 'Error'}
              </div>
              <div className="text-sm leading-relaxed">{notification.message}</div>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="ml-2 p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

// Milestone Students View Component
const MilestoneStudentsView = ({ 
  registrations, 
  selectedMilestone,
  searchTerm, 
  setSearchTerm,
  statusFilter, 
  setStatusFilter,
  selectedRegistrations,
  setSelectedRegistrations,
  onMarkMilestone,
  onBulkMark,
  loading 
}) => {
  const handleSelectRegistration = (registrationId, isSelected) => {
    if (isSelected) {
      setSelectedRegistrations(prev => [...prev, registrationId]);
    } else {
      setSelectedRegistrations(prev => prev.filter(id => id !== registrationId));
    }
  };

  const handleSelectAll = () => {
    if (selectedRegistrations.length === registrations.length) {
      setSelectedRegistrations([]);
    } else {
      setSelectedRegistrations(registrations.map(reg => reg.registration_id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Milestone Context */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-lg flex items-center justify-center">
            <Flag className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{selectedMilestone.milestone_name}</h3>
            <p className="text-gray-600 text-sm">{selectedMilestone.description}</p>
            {selectedMilestone.is_mandatory && (
              <span className="inline-block mt-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                Mandatory Milestone
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative min-w-0 flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 w-full"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="relative min-w-0 flex-1 max-w-xs">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 appearance-none bg-white w-full"
              >
                <option value="all">All Students</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="flex items-center gap-3">
            {selectedRegistrations.length > 0 && (
              <button
                onClick={onBulkMark}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                <CheckSquare className="w-4 h-4" />
                Mark {selectedRegistrations.length} Complete
              </button>
            )}
            
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {selectedRegistrations.length === registrations.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading students...</p>
          </div>
        ) : registrations.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Students Found</h3>
            <p className="text-gray-500">No students match your current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedRegistrations.length === registrations.length}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Enrollment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Milestone Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {registrations.map((registration) => {
                  const isSelected = selectedRegistrations.includes(registration.registration_id);
                  const hasMilestone = registration.milestone_completion?.includes(selectedMilestone.milestone_id);
                  
                  return (
                    <tr key={registration.registration_id} className={isSelected ? 'bg-yellow-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectRegistration(registration.registration_id, e.target.checked)}
                          className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {registration.student_data?.full_name || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {registration.student_data?.email || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {registration.student_enrollment || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {hasMilestone ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <Square className="w-3 h-3 mr-1" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {!hasMilestone ? (
                          <button
                            onClick={() => onMarkMilestone(registration.registration_id)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-600 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
                          >
                            <CheckSquare className="w-4 h-4 mr-1" />
                            Mark Complete
                          </button>
                        ) : (
                          <span className="text-gray-500 text-sm">Completed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// Milestone Analytics View Component
const MilestoneAnalyticsView = ({ milestones, analytics, milestoneStats, config, getMilestoneProgress }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Milestone Analytics
      </h3>
      <p className="text-gray-600">Milestone analytics dashboard would be implemented here.</p>
    </div>
  );
};

// Bulk Milestone Modal Component
const BulkMilestoneModal = ({ selectedCount, milestoneName, onConfirm, onCancel, registrationIds }) => {
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm(registrationIds, notes);
    } catch (error) {
      console.error('Error in bulk milestone marking:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Mark Milestone Complete
        </h3>
        
        <div className="mb-4">
          <p className="text-gray-600">
            Mark <span className="font-medium text-yellow-600">{selectedCount} students</span> as completing:
          </p>
          <p className="font-medium text-gray-900 mt-1">{milestoneName}</p>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this milestone completion..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
            rows={3}
          />
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Processing...
              </>
            ) : (
              <>
                <CheckSquare className="w-4 h-4" />
                Mark Complete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MilestoneBasedPortal;
