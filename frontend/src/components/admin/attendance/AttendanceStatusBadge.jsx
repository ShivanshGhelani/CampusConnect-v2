import React from 'react';
import { CheckCircle, Clock, AlertCircle, X } from 'lucide-react';

const AttendanceStatusBadge = ({ status }) => {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'present':
        return {
          icon: CheckCircle,
          label: 'Present',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          iconColor: 'text-green-600'
        };
      case 'virtual_only':
        return {
          icon: Clock,
          label: 'Registered Only',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          iconColor: 'text-yellow-600'
        };
      case 'physical_only':
        return {
          icon: AlertCircle,
          label: 'Walk-in Present',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          iconColor: 'text-blue-600'
        };
      case 'absent':
      default:
        return {
          icon: X,
          label: 'Absent',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          iconColor: 'text-gray-600'
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}>
      <Icon className={`w-3 h-3 ${config.iconColor}`} />
      {config.label}
    </span>
  );
};

export default AttendanceStatusBadge;
