import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useNotifications } from '../../../context/NotificationContext';
import { maintenanceAPI, venueApi } from '../../../api/axios';
import { 
  WrenchScrewdriverIcon,
  CalendarDaysIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  PencilIcon,
  XMarkIcon,
  CheckCircleIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

const MaintenanceScheduler = () => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  // State management
  const [maintenanceWindows, setMaintenanceWindows] = useState([]);
  const [venues, setVenues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    venue_id: '',
    start_time: '',
    end_time: '',
    reason: '',
    notify_affected_users: true
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    venue_id: '',
    status: [],
    include_past: false
  });

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Reload data when filters change
  useEffect(() => {
    loadMaintenanceWindows();
  }, [filters]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [maintenanceResponse, venuesResponse] = await Promise.all([
        maintenanceAPI.getMaintenanceWindows(filters),
        venueApi.list()
      ]);
      
      setMaintenanceWindows(maintenanceResponse.data.maintenance_windows || []);
      setVenues(venuesResponse.data.venues || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load maintenance data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMaintenanceWindows = async () => {
    try {
      const response = await maintenanceAPI.getMaintenanceWindows(filters);
      setMaintenanceWindows(response.data.maintenance_windows || []);
    } catch (error) {
      console.error('Error loading maintenance windows:', error);
    }
  };

  const handleScheduleMaintenance = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormErrors({});

    try {
      // Validate form
      const errors = validateForm(formData);
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }

      const response = await maintenanceAPI.scheduleMaintenance(formData);
      
      if (response.data.success) {
        addNotification('Maintenance scheduled successfully', 'success');
        setShowScheduleModal(false);
        resetForm();
        loadMaintenanceWindows();
        
        // Show conflicts if any
        if (response.data.conflicts && response.data.conflicts.length > 0) {
          addNotification(
            `Maintenance scheduled but affects ${response.data.affected_bookings_count} existing booking(s)`, 
            'warning'
          );
        }
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      console.error('Error scheduling maintenance:', error);
      setError(error.response?.data?.detail || 'Failed to schedule maintenance');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateMaintenance = async (e) => {
    e.preventDefault();
    if (!selectedMaintenance) return;

    setIsSubmitting(true);
    try {
      const updateData = {
        start_time: formData.start_time || undefined,
        end_time: formData.end_time || undefined,
        reason: formData.reason || undefined,
        status: formData.status || undefined
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => 
        updateData[key] === undefined && delete updateData[key]
      );

      const response = await maintenanceAPI.updateMaintenance(selectedMaintenance.id, updateData);
      
      if (response.data.success) {
        addNotification('Maintenance updated successfully', 'success');
        setShowEditModal(false);
        setSelectedMaintenance(null);
        resetForm();
        loadMaintenanceWindows();
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      console.error('Error updating maintenance:', error);
      setError(error.response?.data?.detail || 'Failed to update maintenance');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelMaintenance = async (maintenanceId, reason = null) => {
    if (!confirm('Are you sure you want to cancel this maintenance window?')) {
      return;
    }

    try {
      const response = await maintenanceAPI.cancelMaintenance(maintenanceId, reason);
      
      if (response.data.success) {
        addNotification('Maintenance cancelled successfully', 'success');
        loadMaintenanceWindows();
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      console.error('Error cancelling maintenance:', error);
      setError(error.response?.data?.detail || 'Failed to cancel maintenance');
    }
  };

  const validateForm = (data) => {
    const errors = {};
    
    if (!data.venue_id) {
      errors.venue_id = 'Venue is required';
    }
    
    if (!data.start_time) {
      errors.start_time = 'Start time is required';
    }
    
    if (!data.end_time) {
      errors.end_time = 'End time is required';
    }
    
    if (data.start_time && data.end_time && new Date(data.start_time) >= new Date(data.end_time)) {
      errors.end_time = 'End time must be after start time';
    }
    
    if (data.start_time && new Date(data.start_time) <= new Date()) {
      errors.start_time = 'Start time must be in the future';
    }
    
    if (!data.reason || data.reason.trim().length < 3) {
      errors.reason = 'Reason must be at least 3 characters';
    }
    
    return errors;
  };

  const resetForm = () => {
    setFormData({
      venue_id: '',
      start_time: '',
      end_time: '',
      reason: '',
      notify_affected_users: true
    });
    setFormErrors({});
  };

  const openEditModal = (maintenance) => {
    setSelectedMaintenance(maintenance);
    setFormData({
      venue_id: maintenance.venue_id,
      start_time: new Date(maintenance.start_time).toISOString().slice(0, 16),
      end_time: new Date(maintenance.end_time).toISOString().slice(0, 16),
      reason: maintenance.reason,
      status: maintenance.status,
      notify_affected_users: true
    });
    setShowEditModal(true);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Scheduled' },
      in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'In Progress' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cancelled' }
    };
    
    const config = statusConfig[status] || statusConfig.scheduled;
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <WrenchScrewdriverIcon className="h-8 w-8 mr-3 text-blue-600" />
            Maintenance Scheduler
          </h1>
          <p className="text-gray-600 mt-1">Manage venue maintenance windows and schedules</p>
        </div>
        
        <button
          onClick={() => setShowScheduleModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Schedule Maintenance
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Venue</label>
            <select
              value={filters.venue_id}
              onChange={(e) => setFilters({ ...filters, venue_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Venues</option>
              {venues.map((venue) => (
                <option key={venue.id} value={venue.id}>{venue.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filters.status.join(',')}
              onChange={(e) => setFilters({ ...filters, status: e.target.value ? e.target.value.split(',') : [] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.include_past}
                onChange={(e) => setFilters({ ...filters, include_past: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Include past maintenance</span>
            </label>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={() => setError('')}
                className="text-sm text-red-600 underline mt-2"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Windows List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : maintenanceWindows.length === 0 ? (
        <div className="text-center py-12">
          <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No maintenance windows</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by scheduling a maintenance window.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Venue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Maintenance Window
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {maintenanceWindows.map((maintenance) => (
                  <tr key={maintenance.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {maintenance.venue_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {maintenance.venue_id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center">
                          <CalendarDaysIcon className="h-4 w-4 text-gray-400 mr-1" />
                          <span>Start: {formatDateTime(maintenance.start_time)}</span>
                        </div>
                        <div className="flex items-center mt-1">
                          <ClockIcon className="h-4 w-4 text-gray-400 mr-1" />
                          <span>End: {formatDateTime(maintenance.end_time)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {maintenance.reason}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(maintenance.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {maintenance.created_by}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {maintenance.status === 'scheduled' && (
                          <>
                            <button
                              onClick={() => openEditModal(maintenance)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleCancelMaintenance(maintenance.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {maintenance.status === 'in_progress' && (
                          <button
                            onClick={() => openEditModal(maintenance)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Schedule Maintenance Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Schedule Maintenance
              </h3>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleMaintenance} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Venue <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.venue_id}
                  onChange={(e) => setFormData({ ...formData, venue_id: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.venue_id ? 'border-red-300' : 'border-gray-300'
                  }`}
                  required
                >
                  <option value="">Select a venue</option>
                  {venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>{venue.name}</option>
                  ))}
                </select>
                {formErrors.venue_id && (
                  <p className="text-sm text-red-600 mt-1">{formErrors.venue_id}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.start_time ? 'border-red-300' : 'border-gray-300'
                  }`}
                  required
                />
                {formErrors.start_time && (
                  <p className="text-sm text-red-600 mt-1">{formErrors.start_time}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.end_time ? 'border-red-300' : 'border-gray-300'
                  }`}
                  required
                />
                {formErrors.end_time && (
                  <p className="text-sm text-red-600 mt-1">{formErrors.end_time}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.reason ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Describe the maintenance work to be performed..."
                  required
                />
                {formErrors.reason && (
                  <p className="text-sm text-red-600 mt-1">{formErrors.reason}</p>
                )}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.notify_affected_users}
                  onChange={(e) => setFormData({ ...formData, notify_affected_users: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Notify users with conflicting bookings
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Scheduling...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      Schedule Maintenance
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Maintenance Modal */}
      {showEditModal && selectedMaintenance && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Edit Maintenance
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateMaintenance} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Venue</label>
                <input
                  type="text"
                  value={selectedMaintenance.venue_name}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                <input
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                <input
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      Update Maintenance
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceScheduler;
