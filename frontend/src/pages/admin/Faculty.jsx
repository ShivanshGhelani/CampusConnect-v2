import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api/admin';
import AdminLayout from '../../components/admin/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import FacultyCard from '../../components/admin/FacultyCard';
import { SearchBox, Dropdown } from '../../components/ui';
import Avatar from '../../components/ui/Avatar';

function Faculty() {
  const [faculty, setFaculty] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false);
  
  // Filter states
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedDesignation, setSelectedDesignation] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState('name');

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

  const filteredFaculty = faculty
    .filter(facultyMember => {
      // Text search filter
      const matchesSearch = facultyMember.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        facultyMember.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        facultyMember.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        facultyMember.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        facultyMember.designation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        facultyMember.qualification?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        facultyMember.specialization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        facultyMember.employment_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        facultyMember.contact_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        facultyMember.phone_number?.toLowerCase().includes(searchTerm.toLowerCase());

      // Department filter
      const matchesDepartment = !selectedDepartment || facultyMember.department === selectedDepartment;
      
      // Designation filter
      const matchesDesignation = !selectedDesignation || facultyMember.designation === selectedDesignation;
      
      // Status filter
      const matchesStatus = !selectedStatus || 
        (selectedStatus === 'active' && facultyMember.is_active !== false) ||
        (selectedStatus === 'inactive' && facultyMember.is_active === false);

      return matchesSearch && matchesDepartment && matchesDesignation && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.full_name || '').localeCompare(b.full_name || '');
        case 'department':
          return (a.department || '').localeCompare(b.department || '');
        case 'designation':
          return (a.designation || '').localeCompare(b.designation || '');
        case 'experience':
          return getExperienceYears(b) - getExperienceYears(a);
        case 'joined':
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        default:
          return 0;
      }
    });

  // Get unique departments and designations for filters
  const departments = [...new Set(faculty.map(f => f.department).filter(d => d))].sort();
  const designations = [...new Set(faculty.map(f => f.designation).filter(d => d))].sort();

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
            facultyMember.employee_id === facultyId || facultyMember.user_id === facultyId || facultyMember._id === facultyId
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
            <i className="fas fa-exclamation-circle mr-2"></i>
            {error}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Faculty Management</h1>
            <p className="text-gray-600 mt-1">Manage faculty members and their profiles</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={fetchFaculty}
              className="inline-flex items-center justify-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
            >
              <i className="fas fa-sync-alt mr-2"></i>
              Refresh
            </button>
            <button className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
              <i className="fas fa-download mr-2"></i>
              Export
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Search Bar */}
            <div className="flex-1">
              <SearchBox
                placeholder="Search faculty by name, email, employee ID..."
                value={searchTerm}
                onChange={(value) => setSearchTerm(value)}
                showFilters={false}
                size="md"
              />
            </div>

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-3 lg:w-auto">
              <Dropdown
                placeholder="All Departments"
                value={selectedDepartment}
                onChange={setSelectedDepartment}
                clearable
                options={departments.map(dept => ({ label: dept, value: dept }))}
                icon={<i className="fas fa-building text-xs"></i>}
                className="w-full sm:w-48"
              />

              <Dropdown
                placeholder="All Designations"
                value={selectedDesignation}
                onChange={setSelectedDesignation}
                clearable
                options={designations.map(des => ({ label: des, value: des }))}
                icon={<i className="fas fa-user-tie text-xs"></i>}
                className="w-full sm:w-48"
              />

              <Dropdown
                placeholder="All Status"
                value={selectedStatus}
                onChange={setSelectedStatus}
                clearable
                options={[
                  { label: 'Active', value: 'active', icon: <i className="fas fa-check-circle text-green-500 text-xs"></i> },
                  { label: 'Inactive', value: 'inactive', icon: <i className="fas fa-times-circle text-red-500 text-xs"></i> }
                ]}
                icon={<i className="fas fa-toggle-on text-xs"></i>}
                className="w-full sm:w-32"
              />

              <Dropdown
                placeholder="Sort by"
                value={sortBy}
                onChange={setSortBy}
                options={[
                  { label: 'Name', value: 'name' },
                  { label: 'Department', value: 'department' },
                  { label: 'Designation', value: 'designation' },
                  { label: 'Experience', value: 'experience' },
                  { label: 'Joined Date', value: 'joined' }
                ]}
                icon={<i className="fas fa-sort text-xs"></i>}
                className="w-full sm:w-40"
              />
            </div>
          </div>

          {/* Active Filters */}
          {(selectedDepartment || selectedDesignation || selectedStatus || searchTerm) && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-600">Active filters:</span>
                {searchTerm && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Search: "{searchTerm}"
                    <button onClick={() => setSearchTerm('')} className="ml-1 text-blue-600 hover:text-blue-800">
                      <i className="fas fa-times text-xs"></i>
                    </button>
                  </span>
                )}
                {selectedDepartment && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    Department: {selectedDepartment}
                    <button onClick={() => setSelectedDepartment('')} className="ml-1 text-purple-600 hover:text-purple-800">
                      <i className="fas fa-times text-xs"></i>
                    </button>
                  </span>
                )}
                {selectedDesignation && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Designation: {selectedDesignation}
                    <button onClick={() => setSelectedDesignation('')} className="ml-1 text-green-600 hover:text-green-800">
                      <i className="fas fa-times text-xs"></i>
                    </button>
                  </span>
                )}
                {selectedStatus && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    Status: {selectedStatus}
                    <button onClick={() => setSelectedStatus('')} className="ml-1 text-orange-600 hover:text-orange-800">
                      <i className="fas fa-times text-xs"></i>
                    </button>
                  </span>
                )}
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedDepartment('');
                    setSelectedDesignation('');
                    setSelectedStatus('');
                  }}
                  className="text-xs text-gray-600 hover:text-gray-800 underline"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
                <i className="fas fa-user-tie text-xl"></i>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total Faculty</h3>
                <p className="text-2xl font-bold text-gray-900">{faculty.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-100 text-green-600">
                <i className="fas fa-user-check text-xl"></i>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Active Faculty</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {faculty.filter(f => f.is_active !== false).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
                <i className="fas fa-building text-xl"></i>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Departments</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {departments.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-orange-100 text-orange-600">
                <i className="fas fa-clock text-xl"></i>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Avg. Experience</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {faculty.length > 0 ? Math.round((faculty.reduce((acc, f) => acc + getExperienceYears(f), 0) / faculty.length) * 10) / 10 : 0} yrs
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Faculty Table */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Faculty Directory
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {filteredFaculty.length} of {faculty.length} faculty members
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">
                  Showing {filteredFaculty.length} results
                </span>
              </div>
            </div>
          </div>
          
          {filteredFaculty.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Faculty Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department & Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Events
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Experience
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFaculty.map((facultyMember) => (
                    <tr key={facultyMember.user_id || facultyMember._id || facultyMember.employee_id} className="hover:bg-gray-50 transition-colors">
                      {/* Faculty Details */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Avatar
                            src={facultyMember.avatar_url}
                            name={facultyMember.full_name || 'Faculty'}
                            size="lg"
                          />
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-gray-900">
                              {facultyMember.full_name || 'N/A'}
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {facultyMember.employee_id || 'N/A'}
                            </div>
                            {facultyMember.qualification && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                {facultyMember.qualification}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm text-gray-900">
                            <i className="fas fa-envelope text-gray-400 text-xs mr-2"></i>
                            <span className="truncate max-w-[200px]" title={facultyMember.email}>
                              {facultyMember.email}
                            </span>
                          </div>
                          {facultyMember.contact_no && (
                            <div className="flex items-center text-sm text-gray-600">
                              <i className="fas fa-phone text-gray-400 text-xs mr-2"></i>
                              <span>{formatPhoneNumber(facultyMember.contact_no)}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Department & Role */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <i className="fas fa-building mr-1"></i>
                              {facultyMember.department || 'N/A'}
                            </span>
                          </div>
                          {facultyMember.designation && (
                            <div className="text-sm text-gray-600 font-medium">
                              {facultyMember.designation}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            facultyMember.is_active !== false 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              facultyMember.is_active !== false ? 'bg-green-500' : 'bg-red-500'
                            }`}></div>
                            {facultyMember.is_active !== false ? 'Active' : 'Inactive'}
                          </span>
                          {facultyMember.created_at && (
                            <div className="text-xs text-gray-500">
                              <i className="fas fa-calendar mr-1"></i>
                              Joined {formatDate(facultyMember.created_at)}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Organized Events */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white text-sm font-semibold shadow-sm">
                          {facultyMember.organized_events_count || 0}
                        </div>
                      </td>

                      {/* Experience */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            <i className="fas fa-clock mr-1"></i>
                            {getExperienceYears(facultyMember)} yrs
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center space-x-1">
                          <button 
                            className="w-8 h-8 flex items-center justify-center text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 hover:text-blue-700 transition-colors"
                            title="View Faculty Details"
                            onClick={() => handleViewFacultyDetails(facultyMember)}
                          >
                            <i className="fas fa-eye text-xs"></i>
                          </button>
                          <button 
                            className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                              facultyMember.is_active !== false 
                                ? 'text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700' 
                                : 'text-green-600 bg-green-50 hover:bg-green-100 hover:text-green-700'
                            }`}
                            title={facultyMember.is_active !== false ? 'Deactivate Faculty' : 'Activate Faculty'}
                            onClick={() => toggleFacultyStatus(facultyMember.employee_id || facultyMember.user_id || facultyMember._id, facultyMember.is_active !== false)}
                          >
                            <i className={`fas ${facultyMember.is_active !== false ? 'fa-user-slash' : 'fa-user-check'} text-xs`}></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-user-tie text-3xl text-gray-400"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || selectedDepartment || selectedDesignation || selectedStatus ? 'No Faculty Found' : 'No Faculty Registered'}
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                {searchTerm || selectedDepartment || selectedDesignation || selectedStatus
                  ? 'Try adjusting your search criteria or filters to find what you\'re looking for.' 
                  : 'Faculty members will appear here once they register in the system.'
                }
              </p>
              {(searchTerm || selectedDepartment || selectedDesignation || selectedStatus) && (
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedDepartment('');
                    setSelectedDesignation('');
                    setSelectedStatus('');
                  }}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <i className="fas fa-times mr-2"></i>
                  Clear All Filters
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
