import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api/axios';
import AdminLayout from '../../components/admin/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import FacultyCard from '../../components/admin/FacultyCard';

function Faculty() {
  const [faculty, setFaculty] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false);

  useEffect(() => {
    fetchFaculty();
  }, []);

  const fetchFaculty = async () => {
    try {
      setIsLoading(true);
      const response = await adminAPI.getFaculty();
      
      if (response.data.success) {
        setFaculty(response.data.faculty || []);
        setError('');
      } else {
        throw new Error(response.data.message || 'Failed to fetch faculty');
      }
    } catch (error) {
      console.error('Error fetching faculty:', error);
      setError('Failed to load faculty');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredFaculty = faculty.filter(facultyMember =>
    facultyMember.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    facultyMember.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    facultyMember.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    facultyMember.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    facultyMember.designation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    facultyMember.qualification?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    facultyMember.specialization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    facultyMember.employment_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    facultyMember.contact_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    facultyMember.phone_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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

  const getExperienceYears = (facultyMember) => {
    if (facultyMember.experience_years && typeof facultyMember.experience_years === 'number') {
      return facultyMember.experience_years;
    }
    
    if (facultyMember.date_of_joining) {
      const joiningDate = new Date(facultyMember.date_of_joining);
      const today = new Date();
      const diffTime = Math.abs(today - joiningDate);
      const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365));
      return diffYears;
    }
    
    return 0;
  };

  const toggleFacultyStatus = async (facultyId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      const response = await adminAPI.updateFacultyStatus(facultyId, { is_active: newStatus });
      
      if (response.data.success) {
        // Update local state
        setFaculty(prevFaculty => 
          prevFaculty.map(facultyMember => 
            facultyMember.user_id === facultyId || facultyMember._id === facultyId
              ? { ...facultyMember, is_active: newStatus }
              : facultyMember
          )
        );
      } else {
        throw new Error(response.data.message || 'Failed to update faculty status');
      }
    } catch (error) {
      console.error('Error updating faculty status:', error);
      setError('Failed to update faculty status');
    }
  };

  const handleViewFacultyDetails = (facultyMember) => {
    setSelectedFaculty(facultyMember);
    setIsFacultyModalOpen(true);
  };

  const handleCloseFacultyModal = () => {
    setSelectedFaculty(null);
    setIsFacultyModalOpen(false);
  };

  if (isLoading) {
    return (
      <AdminLayout pageTitle="Faculty Management">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Faculty Management">
      <div className="mx-24 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Header with Search */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Faculty</h2>
            <p className="text-gray-600">Manage faculty members and their profiles</p>
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={fetchFaculty}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors flex items-center"
            >
              <i className="fas fa-sync-alt mr-2"></i>
              Refresh
            </button>
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center">
              <i className="fas fa-plus mr-2"></i>
              Add Faculty
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center">
              <i className="fas fa-download mr-2"></i>
              Export
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i className="fas fa-search text-gray-400"></i>
            </div>
            <input
              type="text"
              placeholder="Search faculty by name, email, employee ID, department, designation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <i className="fas fa-user-tie text-xl"></i>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total Faculty</h3>
                <p className="text-2xl font-semibold text-gray-900">{faculty.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <i className="fas fa-user-check text-xl"></i>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Active Faculty</h3>
                <p className="text-2xl font-semibold text-gray-900">
                  {faculty.filter(f => f.is_active !== false).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <i className="fas fa-building text-xl"></i>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Departments</h3>
                <p className="text-2xl font-semibold text-gray-900">
                  {new Set(faculty.map(f => f.department).filter(d => d)).size}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-orange-100 text-orange-600">
                <i className="fas fa-clock text-xl"></i>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Avg. Experience</h3>
                <p className="text-2xl font-semibold text-gray-900">
                  {faculty.length > 0 ? Math.round((faculty.reduce((acc, f) => acc + getExperienceYears(f), 0) / faculty.length) * 10) / 10 : 0} yrs
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Faculty Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              All Faculty ({filteredFaculty.length})
            </h3>
          </div>
          
          {filteredFaculty.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faculty</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Employee ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Experience</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFaculty.map((facultyMember) => (
                    <tr key={facultyMember.user_id || facultyMember._id || facultyMember.employee_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-indigo-600 font-medium text-sm">
                              {facultyMember.full_name?.charAt(0)?.toUpperCase() || 'F'}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {facultyMember.full_name || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {facultyMember.qualification || 'No Qualification'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {facultyMember.employee_id || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {facultyMember.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatPhoneNumber(facultyMember.phone_number)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {facultyMember.department || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {facultyMember.designation || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          facultyMember.is_active !== false 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {facultyMember.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            <i className="fas fa-clock mr-1"></i>
                            {getExperienceYears(facultyMember)} yrs
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {facultyMember.created_at ? formatDate(facultyMember.created_at) : 'N/A'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex space-x-2 justify-end">
                          <button 
                            className="text-blue-600 hover:text-blue-900 transition-colors px-2 py-1 rounded-md hover:bg-blue-50"
                            title="View Faculty Details"
                            onClick={() => handleViewFacultyDetails(facultyMember)}
                          >
                            <i className="fas fa-eye mr-1"></i>
                            
                          </button>
                          <button 
                            className={`${
                              facultyMember.is_active !== false 
                                ? 'text-red-600 hover:text-red-900 hover:bg-red-50' 
                                : 'text-green-600 hover:text-green-900 hover:bg-green-50'
                            } transition-colors px-2 py-1 rounded-md`}
                            title={facultyMember.is_active !== false ? 'Deactivate Faculty' : 'Activate Faculty'}
                            onClick={() => toggleFacultyStatus(facultyMember.user_id || facultyMember._id, facultyMember.is_active !== false)}
                          >
                            <i className={`fas ${facultyMember.is_active !== false ? 'fa-user-slash' : 'fa-user-check'} mr-1`}></i>
                            {facultyMember.is_active !== false ? '' : ''}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-user-tie text-2xl text-gray-400"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No Faculty Found' : 'No Faculty Registered'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm 
                  ? 'Try adjusting your search terms.' 
                  : 'Faculty members will appear here once they register.'
                }
              </p>
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Clear Search
                </button>
              )}
            </div>
          )}
        </div>

        {/* Faculty Details Modal */}
        <FacultyCard 
          faculty={selectedFaculty}
          isOpen={isFacultyModalOpen}
          onClose={handleCloseFacultyModal}
        />
      </div>
    </AdminLayout>
  );
}

export default Faculty;
