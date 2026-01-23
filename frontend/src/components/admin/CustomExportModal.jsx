import React, { useState } from 'react';
import { X, Download } from 'lucide-react';

function CustomExportModal({ isOpen, onClose, eventData, eventStats, onExport }) {
  const [selectedEventFields, setSelectedEventFields] = useState([
    'organizer',
    'department',
    'duration',
    'venue'
  ]);

  const [selectedStudentFields, setSelectedStudentFields] = useState([
    'enrollment_no',
    'full_name',
    'department'
  ]);

  const [isExporting, setIsExporting] = useState(false);

  // Determine if event is for students or faculty
  const isStudentEvent = !eventData?.target_audience || 
                         eventData.target_audience === 'student' || 
                         eventData.target_audience === 'students' || 
                         eventData.target_audience.toLowerCase().includes('student');

  const eventFieldOptions = [
    { id: 'organizer', label: 'Organizer', defaultChecked: true },
    { id: 'department', label: 'Department/Club', defaultChecked: true },
    { id: 'duration', label: 'Duration', defaultChecked: true },
    { id: 'venue', label: 'Venue', defaultChecked: true },
    { id: 'description', label: 'Description', defaultChecked: false },
    { id: 'event_type', label: 'Event Type', defaultChecked: false },
    { id: 'target_audience', label: 'Target Audience', defaultChecked: false }
  ];

  const studentFieldOptions = [
    { id: 'enrollment_no', label: isStudentEvent ? 'Enrollment No.' : 'Employee ID', defaultChecked: true },
    { id: 'full_name', label: 'Full Name', defaultChecked: true },
    { id: 'department', label: 'Department', defaultChecked: true },
    { id: 'semester', label: isStudentEvent ? 'Year' : 'Designation', defaultChecked: false },
    { id: 'email', label: 'Email', defaultChecked: false },
    { id: 'mobile_no', label: 'Mobile No.', defaultChecked: false },
    { id: 'registration_datetime', label: 'Registration Date', defaultChecked: false },
    { id: 'registration_id', label: 'Registration ID', defaultChecked: false },
    { id: 'status', label: 'Status', defaultChecked: false }
  ];

  const handleEventFieldToggle = (fieldId) => {
    setSelectedEventFields(prev =>
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const handleStudentFieldToggle = (fieldId) => {
    setSelectedStudentFields(prev =>
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport({
        eventFields: selectedEventFields,
        studentFields: selectedStudentFields
      });
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Download className="w-6 h-6 text-blue-600" />
              Custom Export
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Select the fields you want to include in your export
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-8">
            {/* Event Information Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-blue-500">
                Event Information Fields
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Select which event details to include in the header section
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {eventFieldOptions.map((field) => (
                  <label
                    key={field.id}
                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEventFields.includes(field.id)}
                      onChange={() => handleEventFieldToggle(field.id)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {field.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Student/Registration Fields Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-blue-500">
                Registration Data Fields
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Select which registration fields to include in the table
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {studentFieldOptions.map((field) => (
                  <label
                    key={field.id}
                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudentFields.includes(field.id)}
                      onChange={() => handleStudentFieldToggle(field.id)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {field.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Preview Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">ℹ</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-blue-900 mb-1">Export Preview</h4>
                  <p className="text-sm text-blue-800">
                    <strong>Event Fields:</strong> {selectedEventFields.length} selected
                    {' • '}
                    <strong>Registration Fields:</strong> {selectedStudentFields.length} selected
                  </p>
                  {selectedStudentFields.length === 0 && (
                    <p className="text-sm text-red-600 mt-2">
                      ⚠️ Please select at least one registration field to export
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || selectedStudentFields.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-colors"
          >
            {isExporting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>Export as PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomExportModal;
