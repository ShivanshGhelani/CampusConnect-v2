import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useNotifications } from '../../../context/NotificationContext';
import { adminAPI } from '../../../api/axios';
import { 
  BuildingOfficeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  CogIcon,
  ChartBarIcon,
  FunnelIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  UsersIcon,
  ClipboardDocumentIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const VenueAdminDashboard = () => {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const [activeTab, setActiveTab] = useState('requests');
  const [venues, setVenues] = useState([]);
  const [bookingRequests, setBookingRequests] = useState([]);
  const [bookingHistory, setBookingHistory] = useState([]);
  const [stats, setStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Bulk action states
  const [selectedBookings, setSelectedBookings] = useState(new Set());
  const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState('');
  
  // Filters state
  const [filters, setFilters] = useState({
    status: 'pending',
    venue_id: '',
    date_range: 'all',
    search: ''
  });

  // Venue status management
  const [venueStatusUpdates, setVenueStatusUpdates] = useState({});

  // Fetch all data
  useEffect(() => {
    fetchDashboardData();
  }, [filters]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [
        venuesResponse,
        requestsResponse,
        historyResponse,
        statsResponse
      ] = await Promise.all([
        adminAPI.getVenues({ is_active: true }),
        adminAPI.getVenueBookingRequests(filters),
        adminAPI.getVenueBookingRequests({ ...filters, status: '' }), // All for history
        adminAPI.getVenueBookingStats()
      ]);

      setVenues(venuesResponse.data.venues || []);
      setBookingRequests(requestsResponse.data.bookings || []);
      setBookingHistory(historyResponse.data.bookings || []);
      setStats(statsResponse.data || {});
    } catch (error) {
      console.error('Error fetching venue admin dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle booking approval/rejection with audit logging
  const handleBookingAction = async (bookingId, action, reason = '') => {
    try {
      const booking = bookingRequests.find(req => req.id === bookingId);
      
      if (action === 'approve') {
        await adminAPI.approveVenueBooking(bookingId, { admin_notes: reason });
        
        // Log approval audit entry
        await adminAPI.createAuditLog({
          action: 'APPROVE_VENUE_BOOKING',
          entity_type: 'venue_booking',
          entity_id: bookingId,
          details: {
            venue_name: booking?.venue_name,
            event_name: booking?.event_name,
            organizer: booking?.booked_by,
            start_datetime: booking?.start_datetime,
            end_datetime: booking?.end_datetime,
            admin_notes: reason
          },
          admin_notes: `Approved venue booking for ${booking?.event_name}`
        });
      } else {
        await adminAPI.rejectVenueBooking(bookingId, { 
          rejection_reason: reason || 'No reason provided' 
        });
        
        // Log rejection audit entry
        await adminAPI.createAuditLog({
          action: 'REJECT_VENUE_BOOKING',
          entity_type: 'venue_booking',
          entity_id: bookingId,
          details: {
            venue_name: booking?.venue_name,
            event_name: booking?.event_name,
            organizer: booking?.booked_by,
            start_datetime: booking?.start_datetime,
            end_datetime: booking?.end_datetime,
            rejection_reason: reason
          },
          admin_notes: `Rejected venue booking for ${booking?.event_name}: ${reason}`
        });
      }
      
      // Refresh data
      fetchDashboardData();
    } catch (error) {
      console.error(`Error ${action}ing booking:`, error);
      setError(`Failed to ${action} booking`);
    }
  };

  // Handle venue status update with audit logging
  const handleVenueStatusUpdate = async (venueId, newStatus) => {
    setVenueStatusUpdates(prev => ({
      ...prev,
      [venueId]: newStatus
    }));

    try {
      // Update venue status
      await adminAPI.put(`/venues/${venueId}`, { status: newStatus });
      
      // Log audit entry
      await adminAPI.createAuditLog({
        action: 'UPDATE_VENUE_STATUS',
        entity_type: 'venue',
        entity_id: venueId,
        details: {
          previous_status: venues.find(v => v.id === venueId)?.status,
          new_status: newStatus,
          venue_name: venues.find(v => v.id === venueId)?.name
        },
        admin_notes: `Venue status changed to ${newStatus}`
      });
      
      // Update venues list
      setVenues(prev => prev.map(venue => 
        venue.id === venueId ? { ...venue, status: newStatus } : venue
      ));

      // Show success notification
      console.log(`Venue status updated to ${newStatus} with audit log`);
    } catch (error) {
      console.error('Error updating venue status:', error);
      // Revert the local state change
      setVenueStatusUpdates(prev => {
        const updated = { ...prev };
        delete updated[venueId];
        return updated;
      });
    }
  };

  // Bulk action handlers
  const handleBulkSelection = (bookingId, isSelected) => {
    const newSelected = new Set(selectedBookings);
    if (isSelected) {
      newSelected.add(bookingId);
    } else {
      newSelected.delete(bookingId);
    }
    setSelectedBookings(newSelected);
  };

  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      const allPendingIds = bookingRequests
        .filter(req => req.status === 'pending')
        .map(req => req.id);
      setSelectedBookings(new Set(allPendingIds));
    } else {
      setSelectedBookings(new Set());
    }
  };

  const handleBulkApprove = async () => {
    if (selectedBookings.size === 0) return;

    setBulkActionLoading(true);
    try {
      const bookings = Array.from(selectedBookings).map(id => ({ booking_id: id }));
      
      const response = await adminAPI.bulkBookingAction({
        action: 'approve',
        bookings: bookings,
        common_reason: 'Bulk approval'
      });

      if (response.data.success_count > 0) {
        console.log(`Successfully approved ${response.data.success_count} bookings`);
        setSelectedBookings(new Set());
        fetchDashboardData(); // Refresh data
      }

      if (response.data.failure_count > 0) {
        console.warn(`Failed to approve ${response.data.failure_count} bookings`);
      }
    } catch (error) {
      console.error('Error in bulk approve:', error);
      setError('Failed to approve selected bookings');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkRejectSubmit = async () => {
    if (selectedBookings.size === 0) return;

    setBulkActionLoading(true);
    try {
      const bookings = Array.from(selectedBookings).map(id => ({ booking_id: id }));
      
      const response = await adminAPI.bulkBookingAction({
        action: 'reject',
        bookings: bookings,
        common_reason: bulkRejectReason || 'Bulk rejection'
      });

      if (response.data.success_count > 0) {
        console.log(`Successfully rejected ${response.data.success_count} bookings`);
        setSelectedBookings(new Set());
        setBulkRejectReason('');
        setShowBulkRejectModal(false);
        fetchDashboardData(); // Refresh data
      }

      if (response.data.failure_count > 0) {
        console.warn(`Failed to reject ${response.data.failure_count} bookings`);
      }
    } catch (error) {
      console.error('Error in bulk reject:', error);
      setError('Failed to reject selected bookings');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Format date/time
  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Get status styling
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'approved': return 'text-green-600 bg-green-100 border-green-200';
      case 'rejected': return 'text-red-600 bg-red-100 border-red-200';
      case 'cancelled': return 'text-gray-600 bg-gray-100 border-gray-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  // Get venue status styling
  const getVenueStatusColor = (status) => {
    switch (status) {
      case 'available': return 'text-green-600 bg-green-100';
      case 'maintenance': return 'text-yellow-600 bg-yellow-100';
      case 'blocked': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!user || user.role !== 'venue_admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">Access denied. Venue admin role required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Venue Admin Dashboard</h1>
            <p className="text-gray-600">Manage venue bookings and facility status</p>
          </div>
          {unreadCount > 0 && (
            <div className="flex items-center space-x-2">
              <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                {unreadCount} new notification{unreadCount !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-900">Pending Requests</p>
                <p className="text-2xl font-bold text-blue-900">{stats.pending_bookings || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-900">Approved Today</p>
                <p className="text-2xl font-bold text-green-900">{stats.approved_today || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
            <div className="flex items-center">
              <BuildingOfficeIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-purple-900">Active Venues</p>
                <p className="text-2xl font-bold text-purple-900">{venues.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-orange-900">This Week</p>
                <p className="text-2xl font-bold text-orange-900">{stats.bookings_this_week || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('requests')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'requests'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <ClockIcon className="h-5 w-5" />
                <span>Booking Requests</span>
                {stats.pending_bookings > 0 && (
                  <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                    {stats.pending_bookings}
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={() => setActiveTab('venues')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'venues'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <BuildingOfficeIcon className="h-5 w-5" />
                <span>Venue Management</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <CalendarDaysIcon className="h-5 w-5" />
                <span>Booking History</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analytics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <ChartBarIcon className="h-5 w-5" />
                <span>Analytics</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'audit'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <ClipboardDocumentIcon className="h-5 w-5" />
                <span>Audit Trail</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'requests' && (
            <BookingRequestsTab
              requests={bookingRequests}
              isLoading={isLoading}
              onAction={handleBookingAction}
              filters={filters}
              setFilters={setFilters}
              venues={venues}
              selectedBookings={selectedBookings}
              onBulkSelection={handleBulkSelection}
              onSelectAll={handleSelectAll}
              onBulkApprove={handleBulkApprove}
              onBulkReject={handleBulkReject}
              bulkActionLoading={bulkActionLoading}
            />
          )}

          {activeTab === 'venues' && (
            <VenueManagementTab
              venues={venues}
              onStatusUpdate={handleVenueStatusUpdate}
              venueStatusUpdates={venueStatusUpdates}
            />
          )}

          {activeTab === 'history' && (
            <BookingHistoryTab
              history={bookingHistory}
              isLoading={isLoading}
              filters={filters}
              setFilters={setFilters}
              venues={venues}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsTab
              stats={stats}
              venues={venues}
              bookingHistory={bookingHistory}
            />
          )}

          {activeTab === 'audit' && (
            <AuditTrailTab
              isLoading={isLoading}
            />
          )}
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

      {/* Bulk Rejection Modal */}
      <BulkRejectionModal
        isOpen={showBulkRejectModal}
        onClose={() => setShowBulkRejectModal(false)}
        onConfirm={handleBulkRejectSubmit}
        selectedCount={selectedBookings.size}
        isLoading={bulkActionLoading}
      />
    </div>
  );
};

// Booking Requests Tab Component
const BookingRequestsTab = ({ 
  requests, 
  isLoading, 
  onAction, 
  filters, 
  setFilters, 
  venues,
  selectedBookings,
  onBulkSelection,
  onSelectAll,
  onBulkApprove,
  onBulkReject,
  bulkActionLoading
}) => {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionReason, setActionReason] = useState('');

  const handleAction = async (action) => {
    if (!selectedRequest) return;
    await onAction(selectedRequest.id, action, actionReason);
    setSelectedRequest(null);
    setActionReason('');
  };

  const pendingRequests = requests.filter(req => req.status === 'pending');
  const allSelected = pendingRequests.length > 0 && pendingRequests.every(req => selectedBookings.has(req.id));
  const someSelected = selectedBookings.size > 0;

  return (
    <div className="space-y-6">
      {/* Bulk Actions Bar */}
      {pendingRequests.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Select All ({pendingRequests.length} pending)
                </span>
              </label>
              
              {someSelected && (
                <span className="text-sm text-blue-600">
                  {selectedBookings.size} selected
                </span>
              )}
            </div>

            {someSelected && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={onBulkApprove}
                  disabled={bulkActionLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  <span>{bulkActionLoading ? 'Processing...' : `Approve ${selectedBookings.size}`}</span>
                </button>
                
                <button
                  onClick={onBulkReject}
                  disabled={bulkActionLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  <XCircleIcon className="h-4 w-4" />
                  <span>{bulkActionLoading ? 'Processing...' : `Reject ${selectedBookings.size}`}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

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
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <select
              value={filters.date_range}
              onChange={(e) => setFilters({ ...filters, date_range: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search events..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Requests Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12">
          <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No booking requests</h3>
          <p className="mt-1 text-sm text-gray-500">No requests match your current filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span className="sr-only">Select</span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event / Venue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organizer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {request.status === 'pending' ? (
                      <input
                        type="checkbox"
                        checked={selectedBookings.has(request.id)}
                        onChange={(e) => onBulkSelection(request.id, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    ) : (
                      <span className="w-4 h-4 inline-block"></span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{request.event_name}</div>
                      <div className="text-sm text-gray-500">{request.venue_name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div>Start: {new Date(request.start_datetime).toLocaleString()}</div>
                      <div>End: {new Date(request.end_datetime).toLocaleString()}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {request.booked_by}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {request.status === 'pending' ? (
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Review
                      </button>
                    ) : (
                      <span className="text-gray-400">No actions</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Action Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Review Booking Request
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Event</label>
                <p className="text-sm text-gray-900">{selectedRequest.event_name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Venue</label>
                <p className="text-sm text-gray-900">{selectedRequest.venue_name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Duration</label>
                <p className="text-sm text-gray-900">
                  {new Date(selectedRequest.start_datetime).toLocaleString()} - {new Date(selectedRequest.end_datetime).toLocaleString()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Organizer</label>
                <p className="text-sm text-gray-900">{selectedRequest.booked_by}</p>
              </div>

              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                  Notes/Reason (optional)
                </label>
                <textarea
                  id="reason"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add notes for your decision..."
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => handleAction('approve')}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Approve
              </button>
              <button
                onClick={() => handleAction('reject')}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                <XCircleIcon className="h-4 w-4 mr-2" />
                Reject
              </button>
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setActionReason('');
                }}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Bulk Rejection Modal Component
const BulkRejectionModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  selectedCount, 
  isLoading 
}) => {
  const [rejectionReason, setRejectionReason] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (rejectionReason.trim()) {
      onConfirm(rejectionReason.trim());
    }
  };

  const handleClose = () => {
    setRejectionReason('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Bulk Reject Bookings
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600">
            You are about to reject <strong>{selectedCount}</strong> booking requests. 
            This action cannot be undone.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="bulkRejectionReason" className="block text-sm font-medium text-gray-700 mb-2">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              id="bulkRejectionReason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
              placeholder="Please provide a reason for rejecting these bookings..."
            />
          </div>

          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={!rejectionReason.trim() || isLoading}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <XCircleIcon className="h-4 w-4 mr-2" />
                  Reject {selectedCount} Bookings
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Helper function (shared)
const getStatusColor = (status) => {
  switch (status) {
    case 'pending': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    case 'approved': return 'text-green-600 bg-green-100 border-green-200';
    case 'rejected': return 'text-red-600 bg-red-100 border-red-200';
    case 'cancelled': return 'text-gray-600 bg-gray-100 border-gray-200';
    default: return 'text-gray-600 bg-gray-100 border-gray-200';
  }
};

// Venue Management Tab Component
const VenueManagementTab = ({ venues, onStatusUpdate, venueStatusUpdates }) => {
  const getVenueStatusColor = (status) => {
    switch (status) {
      case 'available': return 'text-green-600 bg-green-100';
      case 'maintenance': return 'text-yellow-600 bg-yellow-100';
      case 'blocked': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Venue Status Management</h3>
        <span className="text-sm text-gray-500">{venues.length} venues</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {venues.map((venue) => (
          <div key={venue.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-lg font-medium text-gray-900">{venue.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{venue.location}</p>
                <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <UsersIcon className="h-4 w-4 mr-1" />
                    <span>Capacity: {venue.capacity}</span>
                  </div>
                  <div className="flex items-center">
                    <MapPinIcon className="h-4 w-4 mr-1" />
                    <span>{venue.venue_type}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={venueStatusUpdates[venue.id] || venue.status || 'available'}
                onChange={(e) => onStatusUpdate(venue.id, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="available">Available</option>
                <option value="maintenance">Under Maintenance</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>

            <div className="mt-3">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getVenueStatusColor(venueStatusUpdates[venue.id] || venue.status || 'available')}`}>
                {(venueStatusUpdates[venue.id] || venue.status || 'available').replace('_', ' ')}
              </span>
            </div>

            {venue.description && (
              <p className="text-sm text-gray-600 mt-3">{venue.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Booking History Tab Component
const BookingHistoryTab = ({ history, isLoading, filters, setFilters, venues }) => {
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <select
              value={filters.date_range}
              onChange={(e) => setFilters({ ...filters, date_range: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Time</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search events or organizers..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* History Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-12">
          <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No booking history</h3>
          <p className="mt-1 text-sm text-gray-500">No bookings match your current filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event / Venue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organizer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {history.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{booking.event_name}</div>
                      <div className="text-sm text-gray-500">{booking.venue_name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div>Start: {new Date(booking.start_datetime).toLocaleString()}</div>
                      <div>End: {new Date(booking.end_datetime).toLocaleString()}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {booking.booked_by}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(booking.status)}`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                    <div className="truncate">
                      {booking.admin_notes || booking.rejection_reason || 'No notes'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Analytics Tab Component
const AnalyticsTab = ({ stats, venues, bookingHistory }) => {
  // Calculate analytics
  const totalBookings = bookingHistory.length;
  const approvalRate = totalBookings > 0 ? ((stats.approved_bookings || 0) / totalBookings * 100).toFixed(1) : 0;
  
  // Venue utilization
  const venueUtilization = venues.map(venue => {
    const venueBookings = bookingHistory.filter(booking => 
      booking.venue_name === venue.name && booking.status === 'approved'
    );
    return {
      name: venue.name,
      bookings: venueBookings.length,
      capacity: venue.capacity
    };
  });

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Venue Analytics Overview</h3>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-900">Total Bookings</p>
              <p className="text-3xl font-bold text-blue-900">{totalBookings}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-6">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-green-900">Approval Rate</p>
              <p className="text-3xl font-bold text-green-900">{approvalRate}%</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-6">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-purple-900">Avg. Response Time</p>
              <p className="text-3xl font-bold text-purple-900">2.3h</p>
            </div>
          </div>
        </div>
      </div>

      {/* Venue Utilization */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Venue Utilization</h4>
        <div className="space-y-4">
          {venueUtilization.map((venue, index) => {
            const utilizationPercent = venue.capacity > 0 ? (venue.bookings / venue.capacity * 100) : 0;
            return (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{venue.name}</span>
                    <span className="text-sm text-gray-500">{venue.bookings} bookings</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Recent Activity Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-3">Most Requested Venues</h5>
            <div className="space-y-2">
              {venueUtilization
                .sort((a, b) => b.bookings - a.bookings)
                .slice(0, 5)
                .map((venue, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-gray-900">{venue.name}</span>
                    <span className="text-sm font-medium text-blue-600">{venue.bookings}</span>
                  </div>
                ))}
            </div>
          </div>

          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-3">Status Distribution</h5>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-900">Approved</span>
                <span className="text-sm font-medium text-green-600">{stats.approved_bookings || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-900">Pending</span>
                <span className="text-sm font-medium text-yellow-600">{stats.pending_bookings || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-900">Rejected</span>
                <span className="text-sm font-medium text-red-600">{stats.rejected_bookings || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Audit Trail Tab Component
const AuditTrailTab = ({ isLoading }) => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditFilters, setAuditFilters] = useState({
    action_type: '',
    entity_type: 'venue',
    date_range: 'week',
    admin_username: ''
  });
  const [auditLoading, setAuditLoading] = useState(false);

  // Load audit logs on component mount and filter changes
  useEffect(() => {
    loadAuditLogs();
  }, [auditFilters]);

  const loadAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const response = await adminAPI.getAuditLogs({
        ...auditFilters,
        per_page: 50
      });
      setAuditLogs(response.data?.logs || []);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'APPROVE_VENUE_BOOKING': return 'text-green-600 bg-green-100';
      case 'REJECT_VENUE_BOOKING': return 'text-red-600 bg-red-100';
      case 'UPDATE_VENUE_STATUS': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Venue Admin Audit Trail</h3>
        <button
          onClick={loadAuditLogs}
          disabled={auditLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {auditLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Audit Filters */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Action Type</label>
            <select
              value={auditFilters.action_type}
              onChange={(e) => setAuditFilters({ ...auditFilters, action_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Actions</option>
              <option value="APPROVE_VENUE_BOOKING">Booking Approvals</option>
              <option value="REJECT_VENUE_BOOKING">Booking Rejections</option>
              <option value="UPDATE_VENUE_STATUS">Status Updates</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Entity Type</label>
            <select
              value={auditFilters.entity_type}
              onChange={(e) => setAuditFilters({ ...auditFilters, entity_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Entities</option>
              <option value="venue">Venues</option>
              <option value="venue_booking">Venue Bookings</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <select
              value={auditFilters.date_range}
              onChange={(e) => setAuditFilters({ ...auditFilters, date_range: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="day">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all">All Time</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Admin</label>
            <input
              type="text"
              value={auditFilters.admin_username}
              onChange={(e) => setAuditFilters({ ...auditFilters, admin_username: e.target.value })}
              placeholder="Filter by admin username"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Audit Logs */}
      {auditLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : auditLogs.length === 0 ? (
        <div className="text-center py-12">
          <ClipboardDocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No audit logs found</h3>
          <p className="mt-1 text-sm text-gray-500">No audit entries match your current filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Admin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {auditLogs.map((log, index) => (
                <tr key={log.id || index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {log.admin_username}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.action)}`}>
                      {log.action.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div>{log.entity_type}</div>
                      <div className="text-xs text-gray-500">{log.entity_id}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                    <div className="space-y-1">
                      {log.admin_notes && (
                        <div className="text-sm">{log.admin_notes}</div>
                      )}
                      {log.details && (
                        <div className="text-xs text-gray-500">
                          {typeof log.details === 'object' ? (
                            Object.entries(log.details).map(([key, value]) => (
                              <div key={key}>
                                <span className="font-medium">{key}:</span> {JSON.stringify(value)}
                              </div>
                            ))
                          ) : (
                            log.details
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default VenueAdminDashboard;
