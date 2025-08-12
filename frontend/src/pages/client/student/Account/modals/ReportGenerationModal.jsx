import React, { useState, useEffect, useRef } from 'react';

const ReportGenerationModal = ({ eventId, teamId, teamData, onClose, onSuccess }) => {
  const [reportOptions, setReportOptions] = useState({
    format: 'pdf',
    sections: {
      team_overview: true,
      member_roles: true,
      tasks_summary: true,
      communication_log: true,
      performance_metrics: true,
      timeline: true
    },
    date_range: {
      start_date: '',
      end_date: ''
    },
    include_attachments: false,
    detailed_view: true
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [generationProgress, setGenerationProgress] = useState(0);

  const modalRef = useRef(null);

  // Report format options
  const formatOptions = [
    { value: 'pdf', label: 'PDF Document', icon: 'fas fa-file-pdf', color: 'text-red-600', description: 'Comprehensive PDF report' },
    { value: 'excel', label: 'Excel Spreadsheet', icon: 'fas fa-file-excel', color: 'text-green-600', description: 'Data in spreadsheet format' },
    { value: 'word', label: 'Word Document', icon: 'fas fa-file-word', color: 'text-blue-600', description: 'Editable document format' }
  ];

  // Report sections
  const sectionOptions = [
    { key: 'team_overview', label: 'Team Overview', icon: 'fas fa-users', description: 'Team basic information and statistics' },
    { key: 'member_roles', label: 'Member Roles', icon: 'fas fa-user-tag', description: 'Role assignments and responsibilities' },
    { key: 'tasks_summary', label: 'Tasks Summary', icon: 'fas fa-tasks', description: 'Task progress and completion status' },
    { key: 'communication_log', label: 'Communication Log', icon: 'fas fa-comments', description: 'Team messages and discussions' },
    { key: 'performance_metrics', label: 'Performance Metrics', icon: 'fas fa-chart-bar', description: 'Analytics and performance data' },
    { key: 'timeline', label: 'Timeline', icon: 'fas fa-history', description: 'Chronological activity timeline' }
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    // Set default date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    setReportOptions(prev => ({
      ...prev,
      date_range: {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      }
    }));
  }, []);

  const handleFormatChange = (format) => {
    setReportOptions(prev => ({ ...prev, format }));
  };

  const handleSectionToggle = (sectionKey) => {
    setReportOptions(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionKey]: !prev.sections[sectionKey]
      }
    }));
  };

  const handleDateChange = (field, value) => {
    setReportOptions(prev => ({
      ...prev,
      date_range: {
        ...prev.date_range,
        [field]: value
      }
    }));
  };

  const handleOptionToggle = (option) => {
    setReportOptions(prev => ({ ...prev, [option]: !prev[option] }));
  };

  const simulateProgress = () => {
    setGenerationProgress(0);
    const interval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 200);
    return interval;
  };

  const handleGenerateReport = async () => {
    const selectedSections = Object.keys(reportOptions.sections).filter(
      key => reportOptions.sections[key]
    );

    if (selectedSections.length === 0) {
      setError('Please select at least one report section');
      return;
    }

    if (!reportOptions.date_range.start_date || !reportOptions.date_range.end_date) {
      setError('Please select a valid date range');
      return;
    }

    setIsGenerating(true);
    setError('');
    
    const progressInterval = simulateProgress();

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/client/registration/enhanced/generate-report/${eventId}/${teamId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          format: reportOptions.format,
          sections: selectedSections,
          start_date: reportOptions.date_range.start_date,
          end_date: reportOptions.date_range.end_date,
          include_attachments: reportOptions.include_attachments,
          detailed_view: reportOptions.detailed_view
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        clearInterval(progressInterval);
        setGenerationProgress(100);

        // Download the report
        if (data.report_url) {
          const link = document.createElement('a');
          link.href = data.report_url;
          link.download = data.filename || `team_report_${teamData.team_name}_${new Date().toISOString().split('T')[0]}.${reportOptions.format}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else if (data.report_data) {
          // Handle base64 data
          const blob = new Blob([atob(data.report_data)], { 
            type: reportOptions.format === 'pdf' ? 'application/pdf' : 'application/octet-stream' 
          });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = data.filename || `team_report_${teamData.team_name}_${new Date().toISOString().split('T')[0]}.${reportOptions.format}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }

        setTimeout(() => {
          onSuccess();
        }, 1000);
      } else {
        clearInterval(progressInterval);
        setError(data.message || 'Failed to generate report');
        setGenerationProgress(0);
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Error generating report:', error);
      setError('Network error occurred. Please try again.');
      setGenerationProgress(0);
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        setGenerationProgress(0);
      }, 1000);
    }
  };

  const selectedFormat = formatOptions.find(f => f.value === reportOptions.format);
  const selectedSectionsCount = Object.values(reportOptions.sections).filter(Boolean).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div ref={modalRef} className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold mb-2">Generate Team Report</h2>
              <p className="text-indigo-100">Create comprehensive PDF reports for your team</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-indigo-200 transition-colors"
              disabled={isGenerating}
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 mb-6">
              <i className="fas fa-exclamation-circle text-red-600"></i>
              <span className="text-red-800">{error}</span>
            </div>
          )}

          {/* Generation Progress */}
          {isGenerating && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-cog fa-spin text-indigo-600"></i>
                </div>
                <div>
                  <h4 className="font-semibold text-indigo-900">Generating Report...</h4>
                  <p className="text-indigo-700">Please wait while we compile your team data</p>
                </div>
              </div>
              <div className="w-full bg-indigo-200 rounded-full h-3">
                <div 
                  className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${generationProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-indigo-600 mt-2">{Math.round(generationProgress)}% complete</p>
            </div>
          )}

          <div className="space-y-8">
            {/* Report Format Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Report Format</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {formatOptions.map((format) => (
                  <button
                    key={format.value}
                    type="button"
                    onClick={() => handleFormatChange(format.value)}
                    disabled={isGenerating}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      reportOptions.format === format.value
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-25'
                    } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <i className={`${format.icon} ${format.color} text-xl`}></i>
                      <span className="font-medium text-gray-900">{format.label}</span>
                    </div>
                    <p className="text-sm text-gray-600">{format.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Report Sections */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Report Sections ({selectedSectionsCount} selected)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sectionOptions.map((section) => (
                  <label
                    key={section.key}
                    className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      reportOptions.sections[section.key]
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300'
                    } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={reportOptions.sections[section.key]}
                      onChange={() => handleSectionToggle(section.key)}
                      disabled={isGenerating}
                      className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <i className={`${section.icon} text-indigo-600`}></i>
                        <span className="font-medium text-gray-900">{section.label}</span>
                      </div>
                      <p className="text-sm text-gray-600">{section.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Date Range</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={reportOptions.date_range.start_date}
                    onChange={(e) => handleDateChange('start_date', e.target.value)}
                    disabled={isGenerating}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={reportOptions.date_range.end_date}
                    onChange={(e) => handleDateChange('end_date', e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    disabled={isGenerating}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Additional Options */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Additional Options</h3>
              <div className="space-y-3">
                <label className={`flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 ${
                  isGenerating ? 'opacity-50 cursor-not-allowed' : ''
                }`}>
                  <input
                    type="checkbox"
                    checked={reportOptions.include_attachments}
                    onChange={() => handleOptionToggle('include_attachments')}
                    disabled={isGenerating}
                    className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Include Attachments</span>
                    <p className="text-sm text-gray-600">Include file attachments in the report</p>
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 ${
                  isGenerating ? 'opacity-50 cursor-not-allowed' : ''
                }`}>
                  <input
                    type="checkbox"
                    checked={reportOptions.detailed_view}
                    onChange={() => handleOptionToggle('detailed_view')}
                    disabled={isGenerating}
                    className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Detailed View</span>
                    <p className="text-sm text-gray-600">Include detailed analytics and expanded information</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Report Preview */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
              <h4 className="font-semibold text-indigo-800 mb-4 flex items-center gap-2">
                <i className="fas fa-eye"></i>
                Report Preview
              </h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-indigo-700">Format:</span>
                  <div className="flex items-center gap-2">
                    <i className={`${selectedFormat?.icon} ${selectedFormat?.color}`}></i>
                    <span className="font-medium text-indigo-900">{selectedFormat?.label}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-indigo-700">Sections:</span>
                  <span className="font-medium text-indigo-900">{selectedSectionsCount} of {sectionOptions.length}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-indigo-700">Date Range:</span>
                  <span className="font-medium text-indigo-900">
                    {reportOptions.date_range.start_date} to {reportOptions.date_range.end_date}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-indigo-700">Team:</span>
                  <span className="font-medium text-indigo-900">{teamData.team_name}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {isGenerating ? 'Generating...' : 'Cancel'}
          </button>
          <button
            onClick={handleGenerateReport}
            disabled={isGenerating || selectedSectionsCount === 0}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Generating...
              </>
            ) : (
              <>
                <i className="fas fa-download"></i>
                Generate Report
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportGenerationModal;
