import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api/admin';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../LoadingSpinner';
import Avatar from '../ui/Avatar';

function FacultyCard({ faculty, isOpen, onClose }) {
  const [facultyDetails, setFacultyDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const { user } = useAuth();

  // Check if current user is super admin
  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    if (isOpen && faculty) {
      fetchFacultyDetails();
    }
  }, [isOpen, faculty]);

  const fetchFacultyDetails = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // Try to fetch detailed faculty data from API
      if (faculty.user_id || faculty._id) {
        try {
          const response = await adminAPI.getFacultyDetails(faculty.user_id || faculty._id);
          if (response.data.success) {
            setFacultyDetails(response.data.faculty);
          } else {
            // Fallback to the faculty data passed in
            setFacultyDetails(faculty);
          }
        } catch (apiError) {
          
          // Fallback to the faculty data passed in
          setFacultyDetails(faculty);
        }
      } else {
        // Use the faculty data passed in
        setFacultyDetails(faculty);
      }
    } catch (error) {
      
      setError('Failed to load faculty details');
      // Fallback to the faculty data passed in
      setFacultyDetails(faculty);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return 'N/A';
    
    // Remove any non-digit characters
    const cleaned = phone.toString().replace(/\D/g, '');
    
    // Format Indian phone numbers
    if (cleaned.length === 10) {
      return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
    } else if (cleaned.length === 13 && cleaned.startsWith('091')) {
      return `+${cleaned.slice(1, 3)} ${cleaned.slice(3, 8)} ${cleaned.slice(8)}`;
    }
    
    // Return as-is if format doesn't match expected patterns
    return phone;
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      setError('');

      // Call the delete faculty API
      const facultyId = facultyDetails._id || facultyDetails.user_id || facultyDetails.id || facultyDetails.employee_id;
      if (!facultyId) {
        setError('Unable to identify faculty for deletion');
        return;
      }
      
      const response = await adminAPI.deleteFaculty(facultyId);
      
      if (response.data.success) {
        // Close confirmation modal
        setDeleteConfirmOpen(false);
        // Close the main modal
        onClose();
        // Show success message (you might want to pass this to parent component)
        alert('Faculty account deleted successfully');
        // Optionally refresh the faculty list in parent component
        window.location.reload(); // Simple refresh - you might want to use a callback instead
      } else {
        setError('Failed to delete faculty account');
      }
    } catch (error) {
      
      setError('Failed to delete faculty account. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-xl">
          <h2 className="text-2xl font-bold text-gray-900">Faculty Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          ) : facultyDetails ? (
            <div className="space-y-6">
              {/* Faculty Profile Header */}
              <div className="flex items-center space-x-4 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <Avatar
                  src={facultyDetails.avatar_url}
                  name={facultyDetails.full_name}
                  size="xl"
                  className="shadow-lg"
                />
                <div className="flex-1 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{facultyDetails.full_name || 'N/A'}</h2>
                    <p className="text-lg text-gray-600">{facultyDetails.designation || 'Faculty Member'}</p>
                    <p className="text-sm text-gray-500">{facultyDetails.department || 'N/A'}</p>
                  </div>
                  
                  {/* Delete Account Button - Only for Super Admin */}
                  {isSuperAdmin && (
                    <button
                      onClick={() => setDeleteConfirmOpen(true)}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                      title="Delete Faculty Account (Super Admin Only)"
                    >
                      <i className="fas fa-trash-alt mr-1.5"></i>
                      Delete Account
                    </button>
                  )}
                </div>
              </div>

              {/* Basic Information */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <i className="fas fa-user mr-2 text-blue-600"></i>
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Full Name</label>
                    <p className="text-gray-900 font-medium">{facultyDetails.full_name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Employee ID</label>
                    <p className="text-gray-900">{facultyDetails.employee_id || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Email</label>
                    <p className="text-gray-900">{facultyDetails.email || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Phone Number</label>
                    <p className="text-gray-900">{formatPhoneNumber(facultyDetails.contact_no || facultyDetails.phone_number)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Status</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      facultyDetails.is_active !== false 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {facultyDetails.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Gender</label>
                    <p className="text-gray-900">{facultyDetails.gender || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Academic Information */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <i className="fas fa-graduation-cap mr-2 text-green-600"></i>
                  Academic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Department</label>
                    <p className="text-gray-900">{facultyDetails.department || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Designation</label>
                    <p className="text-gray-900">{facultyDetails.designation || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Qualification</label>
                    <p className="text-gray-900">{facultyDetails.qualification || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Specialization</label>
                    <p className="text-gray-900">{facultyDetails.specialization || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Experience (Years)</label>
                    <p className="text-gray-900">{facultyDetails.experience_years || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Date of Joining</label>
                    <p className="text-gray-900">{facultyDetails.date_of_joining ? formatDate(facultyDetails.date_of_joining) : 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Employment Type</label>
                    <p className="text-gray-900">{facultyDetails.employment_type || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* System Information */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <i className="fas fa-info-circle mr-2 text-blue-600"></i>
                  System Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Account Created</label>
                    <p className="text-gray-900">{formatDate(facultyDetails.created_at)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Last Updated</label>
                    <p className="text-gray-900">{formatDate(facultyDetails.updated_at)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Faculty ID</label>
                    <p className="text-gray-900 font-mono text-sm bg-gray-200 px-2 py-1 rounded">
                      {facultyDetails.user_id || facultyDetails._id || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-user-tie text-2xl text-gray-400"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
              <p className="text-gray-500">Faculty details could not be loaded.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end rounded-b-xl">
          <button
            onClick={onClose}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/50 flex items-center justify-center z-[100000] animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                <i className="fas fa-exclamation-triangle text-red-600 text-xl"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-900 text-center mb-2">Delete Faculty Account</h3>
              <p className="text-gray-500 text-center mb-6">
                Are you sure you want to delete <strong>{facultyDetails?.full_name}</strong>'s account? This action cannot be undone and will permanently remove all faculty data and associated records.
              </p>
              
              <div className="flex space-x-4">
                <button
                  onClick={() => setDeleteConfirmOpen(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isDeleting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    'Delete Account'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default FacultyCard;
