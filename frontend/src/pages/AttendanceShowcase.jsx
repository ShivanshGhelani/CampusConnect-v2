import React, { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';

// Import all attendance components
import AttendanceStatsCard from '../components/admin/attendance/AttendanceStatsCard';
import AttendanceStatusBadge from '../components/admin/attendance/AttendanceStatusBadge';
import BulkMarkModal from '../components/admin/attendance/BulkMarkModal';
import PhysicalAttendanceTable from '../components/admin/attendance/PhysicalAttendanceTable';
import { SessionsView, StudentsView, AnalyticsView } from '../components/admin/attendance/SessionViewComponents';
import { StrategyInfoCard, SessionStatus, AttendanceProgress } from '../components/admin/attendance/StrategyComponents';

const AttendanceShowcase = () => {
  const [expandedComponents, setExpandedComponents] = useState({});
  const [showBulkModal, setShowBulkModal] = useState(false);

  const toggleComponent = (componentName) => {
    setExpandedComponents(prev => ({
      ...prev,
      [componentName]: !prev[componentName]
    }));
  };

  // Sample data for components
  const sampleStats = {
    totalRegistered: 150,
    totalPresent: 120,
    totalAbsent: 30,
    attendanceRate: 80
  };

  const sampleAttendanceData = [
    { id: '1', name: 'John Doe', email: 'john@example.com', status: 'present', checkedInAt: '2025-08-19T10:30:00Z' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', status: 'absent', checkedInAt: null },
    { id: '3', name: 'Mike Johnson', email: 'mike@example.com', status: 'present', checkedInAt: '2025-08-19T10:45:00Z' },
    { id: '4', name: 'Sarah Wilson', email: 'sarah@example.com', status: 'late', checkedInAt: '2025-08-19T11:15:00Z' }
  ];

  const sampleEvent = {
    id: 'sample-event-1',
    title: 'Sample Event for Testing',
    date: '2025-08-19',
    startTime: '10:00',
    endTime: '16:00',
    venue: 'Main Auditorium',
    type: 'workshop'
  };

  const attendanceComponents = [
    {
      name: 'AttendanceStatsCard',
      description: 'Displays attendance statistics with visual indicators',
      component: (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <AttendanceStatsCard
            title="Total Registered"
            value={sampleStats.totalRegistered}
            icon="users"
            color="blue"
          />
          <AttendanceStatsCard
            title="Present"
            value={sampleStats.totalPresent}
            icon="check"
            color="green"
          />
          <AttendanceStatsCard
            title="Absent"
            value={sampleStats.totalAbsent}
            icon="x"
            color="red"
          />
          <AttendanceStatsCard
            title="Attendance Rate"
            value={`${sampleStats.attendanceRate}%`}
            icon="chart"
            color="purple"
          />
        </div>
      )
    },
    {
      name: 'AttendanceStatusBadge',
      description: 'Shows attendance status with color-coded badges',
      component: (
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Present:</span>
            <AttendanceStatusBadge status="present" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Absent:</span>
            <AttendanceStatusBadge status="absent" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Late:</span>
            <AttendanceStatusBadge status="late" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Excused:</span>
            <AttendanceStatusBadge status="excused" />
          </div>
        </div>
      )
    },
    {
      name: 'BulkMarkModal',
      description: 'Modal for bulk attendance marking operations',
      component: (
        <div>
          <button
            onClick={() => setShowBulkModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Open Bulk Mark Modal
          </button>
          {showBulkModal && (
            <BulkMarkModal
              isOpen={showBulkModal}
              onClose={() => setShowBulkModal(false)}
              students={sampleAttendanceData}
              eventId={sampleEvent.id}
            />
          )}
        </div>
      )
    },
    {
      name: 'PhysicalAttendanceTable',
      description: 'Table displaying attendance data with actions',
      component: (
        <div className="max-w-full overflow-x-auto">
          <PhysicalAttendanceTable
            attendanceData={sampleAttendanceData}
            eventId={sampleEvent.id}
            onMarkAttendance={(studentId, status) => console.log('Mark attendance:', studentId, status)}
            onBulkAction={(action, studentIds) => console.log('Bulk action:', action, studentIds)}
          />
        </div>
      )
    },
    {
      name: 'SessionViewComponents',
      description: 'Components for session-based attendance view',
      component: (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Sessions View</h4>
          <SessionsView
            sessions={[
              { 
                session_id: '1', 
                session_name: 'Morning Session', 
                start_time: '2025-08-19T09:00:00Z', 
                end_time: '2025-08-19T12:00:00Z', 
                status: 'active',
                is_mandatory: true
              },
              { 
                session_id: '2', 
                session_name: 'Afternoon Session', 
                start_time: '2025-08-19T13:00:00Z', 
                end_time: '2025-08-19T16:00:00Z', 
                status: 'pending',
                is_mandatory: false
              }
            ]}
            selectedSessionId="1"
            onSessionSelect={(session) => console.log('Selected session:', session)}
            currentSession={{
              session_id: '1',
              session_name: 'Morning Session',
              start_time: '2025-08-19T09:00:00Z',
              end_time: '2025-08-19T12:00:00Z',
              status: 'active'
            }}
            getSessionProgress={(sessionId) => ({ present: 45, total: 60, percentage: 75 })}
          />
        </div>
      )
    },
    {
      name: 'StrategyComponents',
      description: 'Components for attendance strategy selection and management',
      component: (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Strategy Info Card</h4>
          <StrategyInfoCard 
            strategy="session-based"
            criteria={[
              { id: '1', name: 'Session 1', required: true },
              { id: '2', name: 'Session 2', required: false }
            ]}
            sessions={[
              { id: '1', name: 'Morning Session', attendanceCount: 45 },
              { id: '2', name: 'Afternoon Session', attendanceCount: 38 }
            ]}
          />
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Session Status Examples</h4>
            <div className="flex gap-2 flex-wrap">
              <SessionStatus status="active" />
              <SessionStatus status="completed" />
              <SessionStatus status="pending" />
            </div>
          </div>
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Attendance Progress</h4>
            <AttendanceProgress current={75} total={100} strategy="session-based" />
          </div>
        </div>
      )
    },
    {
      name: 'PhysicalAttendancePortal',
      description: 'Complete portal for physical attendance management',
      component: (
        <div className="min-h-96 bg-gray-50 p-4 rounded-lg">
          <div className="text-center p-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Physical Attendance Portal</h3>
            <p className="text-gray-600 mb-4">Full portal interface for managing physical attendance</p>
            <div className="bg-white rounded p-4 border-2 border-dashed border-gray-300">
              <p className="text-sm text-gray-500">This component requires backend integration</p>
              <p className="text-xs text-gray-400 mt-2">Would load event-specific attendance data and management tools</p>
            </div>
          </div>
        </div>
      )
    },
    {
      name: 'SessionBasedPortal',
      description: 'Portal for session-based attendance tracking',
      component: (
        <div className="min-h-96 bg-gray-50 p-4 rounded-lg">
          <div className="text-center p-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Session-Based Portal</h3>
            <p className="text-gray-600 mb-4">Portal for tracking attendance across multiple sessions</p>
            <div className="bg-white rounded p-4 border-2 border-dashed border-gray-300">
              <p className="text-sm text-gray-500">This component requires backend integration</p>
              <p className="text-xs text-gray-400 mt-2">Would load session data and attendance tracking</p>
            </div>
          </div>
        </div>
      )
    },
    {
      name: 'DayBasedPortal',
      description: 'Portal for multi-day event attendance tracking',
      component: (
        <div className="min-h-96 bg-gray-50 p-4 rounded-lg">
          <div className="text-center p-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Day-Based Portal</h3>
            <p className="text-gray-600 mb-4">Portal for tracking attendance across multiple days</p>
            <div className="bg-white rounded p-4 border-2 border-dashed border-gray-300">
              <p className="text-sm text-gray-500">This component requires backend integration</p>
              <p className="text-xs text-gray-400 mt-2">Would load multi-day event data and day-wise attendance</p>
            </div>
          </div>
        </div>
      )
    },
    {
      name: 'MilestoneBasedPortal',
      description: 'Portal for milestone-based attendance tracking',
      component: (
        <div className="min-h-96 bg-gray-50 p-4 rounded-lg">
          <div className="text-center p-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Milestone-Based Portal</h3>
            <p className="text-gray-600 mb-4">Portal for tracking milestone-based attendance requirements</p>
            <div className="bg-white rounded p-4 border-2 border-dashed border-gray-300">
              <p className="text-sm text-gray-500">This component requires backend integration</p>
              <p className="text-xs text-gray-400 mt-2">Would load milestone definitions and completion tracking</p>
            </div>
          </div>
        </div>
      )
    },
    {
      name: 'ContinuousMonitoringPortal',
      description: 'Portal for continuous attendance monitoring with real-time updates',
      component: (
        <div className="min-h-96 bg-gray-50 p-4 rounded-lg">
          <div className="text-center p-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Continuous Monitoring Portal</h3>
            <p className="text-gray-600 mb-4">Portal for real-time continuous attendance monitoring</p>
            <div className="bg-white rounded p-4 border-2 border-dashed border-gray-300">
              <p className="text-sm text-gray-500">This component requires backend integration</p>
              <p className="text-xs text-gray-400 mt-2">Would load real-time monitoring data and alerts</p>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center">
            <ClipboardDocumentCheckIcon className="h-10 w-10 text-blue-600 mr-3" />
            Attendance Components Showcase
          </h1>
          <p className="text-lg text-gray-600">
            Interactive demonstration of all attendance management components
          </p>
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Testing Environment:</strong> All components are loaded with sample data. 
              Click on component headers to expand/collapse views.
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ClipboardDocumentCheckIcon className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{attendanceComponents.length}</p>
                <p className="text-sm text-gray-600">Total Components</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <div className="h-4 w-4 bg-green-500 rounded-full"></div>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {Object.keys(expandedComponents).filter(key => expandedComponents[key]).length}
                </p>
                <p className="text-sm text-gray-600">Components Expanded</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 font-bold text-sm">✓</span>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">Live</p>
                <p className="text-sm text-gray-600">Interactive Demo</p>
              </div>
            </div>
          </div>
        </div>

        {/* Components Showcase */}
        <div className="space-y-6">
          {attendanceComponents.map((componentData, index) => (
            <div key={index} className="bg-white rounded-lg shadow-lg overflow-hidden">
              <button
                onClick={() => toggleComponent(componentData.name)}
                className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-blue-500 text-white">
                    <ClipboardDocumentCheckIcon className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-xl font-semibold text-gray-900">{componentData.name}</h2>
                    <p className="text-sm text-gray-500">{componentData.description}</p>
                  </div>
                </div>
                {expandedComponents[componentData.name] ? (
                  <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
              
              {expandedComponents[componentData.name] && (
                <div className="p-6 border-t border-gray-200">
                  <div className="mb-4">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-600">
                      /src/components/admin/attendance/{componentData.name}.jsx
                    </code>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {componentData.component}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="fixed bottom-6 right-6 flex flex-col space-y-2">
          <button
            onClick={() => {
              const allExpanded = attendanceComponents.every(comp => expandedComponents[comp.name]);
              if (allExpanded) {
                setExpandedComponents({});
              } else {
                const newState = {};
                attendanceComponents.forEach(comp => newState[comp.name] = true);
                setExpandedComponents(newState);
              }
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition-colors"
          >
            {Object.keys(expandedComponents).length === attendanceComponents.length ? 'Collapse All' : 'Expand All'}
          </button>
          <a
            href="/"
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium text-center transition-colors"
          >
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
};

export default AttendanceShowcase;
