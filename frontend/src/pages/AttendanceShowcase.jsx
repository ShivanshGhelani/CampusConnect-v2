import React, { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';

// Only import the unified attendance portal
import PhysicalAttendancePortal from '../components/admin/attendance/PhysicalAttendancePortal';

const AttendanceShowcase = () => {
  const [expandedComponents, setExpandedComponents] = useState({});

  const toggleComponent = (componentName) => {
    setExpandedComponents(prev => ({
      ...prev,
      [componentName]: !prev[componentName]
    }));
  };

  const attendanceComponents = [
    {
      name: 'UnifiedAttendancePortal',
      description: 'Complete unified portal for all attendance management strategies',
      component: (
        <div className="min-h-96 bg-gray-50 p-4 rounded-lg">
          <div className="text-center p-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Unified Attendance Portal</h3>
            <p className="text-gray-600 mb-4">Single portal that handles all attendance strategies (single_mark, session_based, day_based, milestone_based)</p>
            <div className="bg-white rounded p-4 border-2 border-dashed border-gray-300">
              <p className="text-sm text-gray-500">This component requires backend integration and event data</p>
              <p className="text-xs text-gray-400 mt-2">Would load event-specific attendance strategy and participant management</p>
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
