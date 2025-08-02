import React from 'react';
import { Users, CheckCircle, Clock, AlertCircle, X, TrendingUp, Target, Award } from 'lucide-react';

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
      label: 'Registered Only',
      value: stats.virtual_only_count,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      label: 'Walk-in Present',
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
  const totalAttended = stats.present_count + stats.virtual_only_count + stats.physical_only_count;
  const isHighAttendance = attendancePercentage >= 80;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            isHighAttendance ? 'bg-green-100' : 'bg-blue-100'
          }`}>
            {isHighAttendance ? (
              <Award className={`w-6 h-6 text-green-600`} />
            ) : (
              <Target className={`w-6 h-6 text-blue-600`} />
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Attendance Overview</h2>
            <p className="text-sm text-gray-600">Real-time attendance tracking</p>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${
            isHighAttendance ? 'text-green-600' : 'text-blue-600'
          }`}>
            {attendancePercentage.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-500">Overall Attendance</div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {statsData.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="text-center p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
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

      {/* Progress Section */}
      <div className="space-y-4">
        {/* Main Progress Bar */}
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span className="font-medium">Attendance Progress</span>
            <span>{totalAttended} of {stats.total_registrations} attended</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${
                isHighAttendance ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${attendancePercentage}%` }}
            />
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-green-800">Registered</span>
              <span className="text-lg font-bold text-green-700">{stats.virtual_attendance_count}</span>
            </div>
            <div className="w-full bg-green-200 rounded-full h-1.5">
              <div 
                className="bg-green-500 h-1.5 rounded-full transition-all duration-300" 
                style={{ width: `${(stats.virtual_attendance_count / stats.total_registrations) * 100}%` }}
              />
            </div>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-blue-800">Verified Present</span>
              <span className="text-lg font-bold text-blue-700">{stats.physical_attendance_count}</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-1.5">
              <div 
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" 
                style={{ width: `${(stats.physical_attendance_count / stats.total_registrations) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Live data</span>
        </div>
        <span>Last updated: {new Date(stats.last_updated).toLocaleString()}</span>
      </div>
    </div>
  );
};

export default AttendanceStatsCard;
