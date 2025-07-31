import React from 'react';
import { Users, CheckCircle, Clock, AlertCircle, X, TrendingUp } from 'lucide-react';

const AttendanceStatsCard = ({ stats }) => {
  const statsData = [
    {
      label: 'Total Registered',
      value: stats.total_registrations,
      icon: Users,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    },
    {
      label: 'Present',
      value: stats.present_count,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      label: 'Virtual Only',
      value: stats.virtual_only_count,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      label: 'Physical Only',
      value: stats.physical_only_count,
      icon: AlertCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      label: 'Absent',
      value: stats.absent_count,
      icon: X,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    }
  ];

  const attendancePercentage = stats.attendance_percentage || 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Attendance Overview</h2>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <TrendingUp className="w-4 h-4" />
          {attendancePercentage.toFixed(1)}% Present
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statsData.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="text-center">
              <div className={`w-12 h-12 ${stat.bgColor} rounded-full flex items-center justify-center mx-auto mb-2`}>
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-gray-600">
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="mt-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Attendance Progress</span>
          <span>{stats.present_count} of {stats.total_registrations}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-green-500 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${attendancePercentage}%` }}
          />
        </div>
      </div>

      {/* Additional Stats */}
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Virtual Marked:</span>
          <span className="font-medium">{stats.virtual_attendance_count}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Physical Verified:</span>
          <span className="font-medium">{stats.physical_attendance_count}</span>
        </div>
      </div>

      <div className="mt-2 text-xs text-gray-500 text-center">
        Last updated: {new Date(stats.last_updated).toLocaleString()}
      </div>
    </div>
  );
};

export default AttendanceStatsCard;
