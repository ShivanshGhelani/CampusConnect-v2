import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../../api/axios';
import AdminLayout from '../../components/admin/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';

function ExportData() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFields, setSelectedFields] = useState([
    'enrollment_no',
    'full_name', 
    'department',
    'registration_datetime'
  ]);
  const [isExporting, setIsExporting] = useState(false);

  const availableFields = [
    { id: 'enrollment_no', label: 'Enrollment No.', checked: true },
    { id: 'full_name', label: 'Full Name', checked: true },
    { id: 'department', label: 'Department', checked: true },
    { id: 'semester', label: 'Semester', checked: false },
    { id: 'email', label: 'Email', checked: false },
    { id: 'mobile_no', label: 'Mobile No.', checked: false },
    { id: 'gender', label: 'Gender', checked: false },
    { id: 'registration_datetime', label: 'Registration Date', checked: true }
  ];

  useEffect(() => {
    if (eventId) {
      fetchEventDetails();
    }
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      setIsLoading(true);
      setError('');

      const response = await adminAPI.getEvent(eventId);
      if (response.data.success) {
        setEvent(response.data.event);
      } else {
        throw new Error(response.data.message || 'Failed to fetch event details');
      }
    } catch (error) {
      console.error('Error fetching event details:', error);
      setError('Failed to load event details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldToggle = (fieldId) => {
    setSelectedFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const handleQuickReport = async () => {
    try {
      setIsExporting(true);
      
      // Call API for quick standard report
      const response = await adminAPI.exportEventData(eventId, {
        type: 'quick-standard',
        fields: ['enrollment_no', 'full_name', 'department', 'semester', 'email', 'mobile_no', 'registration_datetime']
      });
      
      // Handle file download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${event.event_name}_registration_report.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating quick report:', error);
      alert('Failed to generate report');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSignSheet = async () => {
    try {
      setIsExporting(true);
      // Call API for sign sheet
      const response = await adminAPI.exportEventData(eventId, {
        type: 'sign-sheet',
        fields: ['enrollment_no', 'full_name', 'department', 'semester']
      });
      
      // Handle file download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${event.event_name}_sign_sheet.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating sign sheet:', error);
      alert('Failed to generate sign sheet');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCustomExport = async () => {
    try {
      setIsExporting(true);
      
      // Call API for custom export
      const response = await adminAPI.exportEventData(eventId, {
        type: 'custom',
        fields: selectedFields
      });
      
      // Handle file download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${event.event_name}_custom_report.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating custom report:', error);
      alert('Failed to generate custom report');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout pageTitle="Export Data">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout pageTitle="Export Data">
        <div className="container mx-auto px-6 py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!event) {
    return (
      <AdminLayout pageTitle="Export Data">
        <div className="container mx-auto px-6 py-8">
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
            Event not found
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle={`Export Registrations - ${event.event_name}`}>
      <div className="container mx-auto px-6 py-8">
        {/* Breadcrumb and Actions */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-2 text-gray-600">
            <button 
              onClick={() => navigate('/admin/events')}
              className="hover:text-blue-600"
            >
              Events
            </button>
            <span>→</span>
            <button 
              onClick={() => navigate(`/admin/events/${event.event_id}`)}
              className="hover:text-blue-600"
            >
              {event.event_name}
            </button>
            <span>→</span>
            <span className="text-gray-800 font-medium">Export Registrations</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2 mb-2">
                <i className="fas fa-file-export text-blue-500"></i> Export Registration Data
              </h2>
              <p className="text-gray-600">Select the fields you want to include in the export</p>
              
              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 mb-6">
                {/* Quick Standard Report */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-lg font-medium text-blue-800 mb-2 flex items-center gap-2">
                    <i className="fas fa-file-pdf"></i> Quick Report
                  </h3>
                  <p className="text-blue-700 text-sm mb-3">Generate registration report with predefined fields: Enrollment No., Full Name, Department, Semester, Email, Mobile No., and Registration Date</p>
                  <button 
                    onClick={handleQuickReport}
                    disabled={isExporting}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isExporting ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i> Generating...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-download"></i> Generate Report
                      </>
                    )}
                  </button>
                </div>
                
                {/* Sign Sheet */}
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="text-lg font-medium text-green-800 mb-2 flex items-center gap-2">
                    <i className="fas fa-signature"></i> Attendance Sign Sheet
                  </h3>
                  <p className="text-green-700 text-sm mb-3">Generate a sign sheet for attendance with predefined fields: Enrollment No., Full Name, Department, Semester and Signature column</p>
                  <button 
                    onClick={handleSignSheet}
                    disabled={isExporting}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isExporting ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i> Generating...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-signature"></i> Generate Sign Sheet
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Custom Field Selection */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Custom Field Selection</h3>
              <p className="text-gray-600 mb-4">Select specific fields to include in your custom export</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {availableFields.map((field) => (
                  <div key={field.id} className="flex items-center space-x-3">
                    <input 
                      type="checkbox" 
                      id={field.id}
                      checked={selectedFields.includes(field.id)}
                      onChange={() => handleFieldToggle(field.id)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor={field.id} className="text-gray-700 cursor-pointer">
                      {field.label}
                    </label>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <button 
                  onClick={() => navigate(`/admin/events/${eventId}`)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCustomExport}
                  disabled={isExporting || selectedFields.length === 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  {isExporting ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Exporting...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-download"></i> Export as PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default ExportData;
