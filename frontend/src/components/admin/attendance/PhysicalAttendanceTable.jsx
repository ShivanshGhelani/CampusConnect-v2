import React from 'react';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  X, 
  UserCheck, 
  User,
  Calendar,
  Mail
} from 'lucide-react';
import AttendanceStatusBadge from './AttendanceStatusBadge';
import LoadingSpinner from '../../LoadingSpinner';

const PhysicalAttendanceTable = ({
  registrations,
  selectedRegistrations,
  onSelectRegistration,
  onSelectAll,
  onMarkAttendance,
  loading,
  quickMode = false
}) => {

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isAllSelected = registrations.length > 0 && 
    selectedRegistrations.length === registrations.length;

  const canMarkPhysical = (registration) => {
    return !registration.physical_attendance_id; // Not already marked
  };

  if (loading && registrations.length === 0) {
    return (
      <div className="p-8 text-center">
        <LoadingSpinner size="lg" />
        <p className="text-gray-500 mt-4">Loading registrations...</p>
      </div>
    );
  }

  if (registrations.length === 0) {
    return (
      <div className="p-8 text-center">
        <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No registrations found</h3>
        <p className="text-gray-500">No students have registered for this event yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {/* Quick mode banner */}
      {quickMode && (
        <div className="bg-orange-50 border-b border-orange-200 px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-orange-800">Quick Mode Active</span>
            <span className="text-xs text-orange-600">- Click any student to instantly mark attendance</span>
          </div>
        </div>
      )}
      
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-3 text-left">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={onSelectAll}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Student Details
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Attendance Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Virtual Attendance
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Physical Attendance
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {registrations.map((registration) => {
            const isSelected = selectedRegistrations.includes(registration.registration_id);
            const studentData = registration.student_data || {};
            
            return (
              <tr 
                key={registration.registration_id}
                className={`hover:bg-gray-50 transition-colors ${
                  isSelected ? 'bg-blue-50' : ''
                } ${quickMode && canMarkPhysical(registration) ? 'cursor-pointer hover:bg-orange-50' : ''}`}
                onClick={() => {
                  if (quickMode && canMarkPhysical(registration)) {
                    onMarkAttendance(registration.registration_id);
                  }
                }}
              >
                {/* Checkbox */}
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => onSelectRegistration(registration.registration_id, e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                </td>

                {/* Student Details */}
                <td className="px-6 py-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {studentData.full_name || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {registration.student_enrollment}
                      </div>
                      {studentData.email && (
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {studentData.email}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        Reg: {formatDate(registration.registration_datetime)}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Attendance Status */}
                <td className="px-6 py-4">
                  <AttendanceStatusBadge status={registration.final_attendance_status} />
                </td>

                {/* Virtual Attendance */}
                <td className="px-6 py-4">
                  {registration.virtual_attendance_id ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <div>
                        <div className="text-sm text-green-700 font-medium">Registered</div>
                        <div className="text-xs text-gray-500">
                          {formatDate(registration.virtual_attendance_timestamp)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">Not registered</span>
                    </div>
                  )}
                </td>

                {/* Physical Attendance */}
                <td className="px-6 py-4">
                  {registration.physical_attendance_id ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-500" />
                      <div>
                        <div className="text-sm text-blue-700 font-medium">Verified Present</div>
                        <div className="text-xs text-gray-500">
                          {formatDate(registration.physical_attendance_timestamp)}
                        </div>
                        {registration.physical_attendance_marked_by && (
                          <div className="text-xs text-gray-400">
                            by {registration.physical_attendance_marked_by}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <X className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">Not verified</span>
                    </div>
                  )}
                </td>

                {/* Actions */}
                <td className="px-6 py-4">
                  {canMarkPhysical(registration) ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent row click in quick mode
                        onMarkAttendance(registration.registration_id);
                      }}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        quickMode 
                          ? 'bg-orange-600 text-white hover:bg-orange-700' 
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      <UserCheck className="w-4 h-4" />
                      {quickMode ? 'Quick Mark' : 'Mark Present'}
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-500 rounded-lg">
                      <CheckCircle className="w-4 h-4" />
                      Already Marked
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {loading && registrations.length > 0 && (
        <div className="p-4 text-center border-t">
          <LoadingSpinner size="sm" />
          <span className="text-sm text-gray-500 ml-2">Updating...</span>
        </div>
      )}
    </div>
  );
};

export default PhysicalAttendanceTable;
