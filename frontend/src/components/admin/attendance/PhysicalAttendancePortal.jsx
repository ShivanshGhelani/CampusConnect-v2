import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Users, 
  Search, 
  Filter, 
  Download, 
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  UserCheck
} from 'lucide-react';
import AdminLayout from '../AdminLayout';
import PhysicalAttendanceTable from './PhysicalAttendanceTable';
import BulkMarkModal from './BulkMarkModal';
import AttendanceStatsCard from './AttendanceStatsCard';
import LoadingSpinner from '../../LoadingSpinner';

const PhysicalAttendancePortal = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  
  // State management
  const [registrations, setRegistrations] = useState([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRegistrations, setSelectedRegistrations] = useState([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [attendanceStats, setAttendanceStats] = useState(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(50);
  
  // Success/error notifications
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    fetchRegistrations();
    fetchAttendanceStats();
  }, [eventId, currentPage, statusFilter]);

  useEffect(() => {
    // Apply search filter to registrations
    if (searchTerm) {
      const filtered = registrations.filter(reg => 
        reg.student_enrollment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.student_data?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredRegistrations(filtered);
    } else {
      setFilteredRegistrations(registrations);
    }
  }, [searchTerm, registrations]);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString()
      });
      
      if (statusFilter !== 'all') {
        params.append('status_filter', statusFilter);
      }

      const response = await fetch(`/api/v1/admin/registrations/event/${eventId}?${params}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRegistrations(data.data.registrations);
          setTotalPages(data.data.pagination.total_pages);
        } else {
          setError(data.message || 'Failed to fetch registrations');
        }
      } else {
        setError('Failed to fetch registrations');
      }
    } catch (err) {
      setError('Network error while fetching registrations');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceStats = async () => {
    try {
      const response = await fetch(`/api/v1/admin/registrations/attendance/stats/${eventId}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAttendanceStats(data);
      }
    } catch (err) {
      console.error('Error fetching attendance stats:', err);
    }
  };

  const handleMarkPhysicalAttendance = async (registrationId, notes = '') => {
    try {
      const response = await fetch(`/api/v1/admin/registrations/attendance/physical/${registrationId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          registration_id: registrationId,
          notes: notes
        })
      });

      const data = await response.json();

      if (data.success) {
        showNotification('Physical attendance marked successfully', 'success');
        fetchRegistrations();
        fetchAttendanceStats();
      } else {
        showNotification(data.message || 'Failed to mark attendance', 'error');
      }
    } catch (err) {
      showNotification('Network error while marking attendance', 'error');
    }
  };

  const handleBulkMarkAttendance = async (registrationIds, notes) => {
    try {
      const response = await fetch('/api/v1/admin/registrations/attendance/physical/bulk', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          registration_ids: registrationIds,
          notes: notes
        })
      });

      const data = await response.json();

      if (data.success) {
        const successCount = data.data?.successful?.length || 0;
        showNotification(`${successCount} students marked as physically present`, 'success');
        setSelectedRegistrations([]);
        setShowBulkModal(false);
        fetchRegistrations();
        fetchAttendanceStats();
      } else {
        showNotification(data.message || 'Failed to mark bulk attendance', 'error');
      }
    } catch (err) {
      showNotification('Network error while marking bulk attendance', 'error');
    }
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const getStatusFilterOptions = () => [
    { value: 'all', label: 'All Students', icon: Users },
    { value: 'absent', label: 'Absent', icon: X },
    { value: 'virtual_only', label: 'Virtual Only', icon: Clock },
    { value: 'physical_only', label: 'Physical Only', icon: AlertCircle },
    { value: 'present', label: 'Present', icon: CheckCircle }
  ];

  const handleSelectRegistration = (registrationId, isSelected) => {
    if (isSelected) {
      setSelectedRegistrations([...selectedRegistrations, registrationId]);
    } else {
      setSelectedRegistrations(selectedRegistrations.filter(id => id !== registrationId));
    }
  };

  const handleSelectAll = () => {
    if (selectedRegistrations.length === filteredRegistrations.length) {
      setSelectedRegistrations([]);
    } else {
      setSelectedRegistrations(filteredRegistrations.map(reg => reg.registration_id));
    }
  };

  if (loading && registrations.length === 0) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate(`/admin/events/${eventId}`)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Physical Attendance</h1>
              <p className="text-gray-600">Mark student attendance at the venue</p>
            </div>
          </div>

          {/* Attendance Statistics */}
          {attendanceStats && (
            <AttendanceStatsCard stats={attendanceStats} />
          )}
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name or enrollment..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-80"
                />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                >
                  {getStatusFilterOptions().map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {selectedRegistrations.length > 0 && (
                <button
                  onClick={() => setShowBulkModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <UserCheck className="w-4 h-4" />
                  Mark Selected ({selectedRegistrations.length})
                </button>
              )}
              
              <button
                onClick={() => {/* TODO: Implement export */}}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Attendance Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <PhysicalAttendanceTable
            registrations={filteredRegistrations}
            selectedRegistrations={selectedRegistrations}
            onSelectRegistration={handleSelectRegistration}
            onSelectAll={handleSelectAll}
            onMarkAttendance={handleMarkPhysicalAttendance}
            loading={loading}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bulk Mark Modal */}
        {showBulkModal && (
          <BulkMarkModal
            selectedCount={selectedRegistrations.length}
            onConfirm={handleBulkMarkAttendance}
            onCancel={() => setShowBulkModal(false)}
            registrationIds={selectedRegistrations}
          />
        )}

        {/* Notification Toast */}
        {notification && (
          <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            notification.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              {notification.message}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default PhysicalAttendancePortal;
