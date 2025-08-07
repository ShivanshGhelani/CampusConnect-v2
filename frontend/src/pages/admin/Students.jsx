import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api/axios';
import AdminLayout from '../../components/admin/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import StudentCard from '../../components/admin/StudentCard';
import { Dropdown, SearchBox } from '../../components/ui';

function Students() {
  const [students, setStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]); // Store all students for client-side filtering
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [availableDepartments, setAvailableDepartments] = useState([]);
  
  // Search suggestions
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [studentsPerPage] = useState(10); // Updated to 10 entries per page

  useEffect(() => {
    // Load all students only once on component mount
    fetchAllStudents();
  }, []);

  // Apply filters whenever search term, department, or status changes
  useEffect(() => {
    applyFilters();
  }, [searchTerm, departmentFilter, statusFilter, allStudents]);

  // Update pagination when filtered students change
  useEffect(() => {
    const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);
    setTotalPages(totalPages);
    
    // Reset to page 1 if current page exceeds total pages
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredStudents, studentsPerPage, currentPage]);

  const fetchAllStudents = async () => {
    try {
      setIsLoading(true);
      
      // Check localStorage first
      const cachedStudents = localStorage.getItem('campusConnect_allStudents');
      const cacheTimestamp = localStorage.getItem('campusConnect_studentsCache_timestamp');
      const now = Date.now();
      const cacheAge = now - (cacheTimestamp ? parseInt(cacheTimestamp) : 0);
      const cacheExpiry = 5 * 60 * 1000; // 5 minutes
      
      if (cachedStudents && cacheAge < cacheExpiry) {
        console.log('Loading students from cache');
        const parsedStudents = JSON.parse(cachedStudents);
        setAllStudents(parsedStudents);
        setTotalStudents(parsedStudents.length);
        
        // Extract departments
        const departments = [...new Set(parsedStudents.map(s => s.department).filter(Boolean))].sort();
        setAvailableDepartments(departments);
        
        setIsLoading(false);
        return;
      }
      
      // Fetch all students without pagination
      const response = await adminAPI.getStudents({ 
        limit: 1000, // Large limit to get all students
        include_all: true 
      });
      
      console.log('API Response:', response.data);
      
      if (response.data.success) {
        const students = response.data.students || [];
        setAllStudents(students);
        setTotalStudents(students.length);
        
        // Cache the students data
        localStorage.setItem('campusConnect_allStudents', JSON.stringify(students));
        localStorage.setItem('campusConnect_studentsCache_timestamp', now.toString());
        
        // Extract unique departments
        const departments = [...new Set(students.map(s => s.department).filter(Boolean))].sort();
        setAvailableDepartments(departments);
        
        setError('');
        
        console.log('Students loaded:', students.length);
        console.log('Departments found:', departments);
      } else {
        throw new Error(response.data.message || 'Failed to fetch students');
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setError('Failed to load students');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allStudents];
    
    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(student => 
        (student.full_name && student.full_name.toLowerCase().includes(searchLower)) ||
        (student.email && student.email.toLowerCase().includes(searchLower)) ||
        (student.enrollment_no && student.enrollment_no.toLowerCase().includes(searchLower)) ||
        (student.department && student.department.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply department filter
    if (departmentFilter.trim()) {
      filtered = filtered.filter(student => 
        student.department && student.department === departmentFilter
      );
    }
    
    // Apply status filter
    if (statusFilter.trim()) {
      if (statusFilter === 'active') {
        filtered = filtered.filter(student => student.is_active !== false);
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(student => student.is_active === false);
      }
    }
    
    setFilteredStudents(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };  // Handle search with instant filtering (no debounce)
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    
    // Generate search suggestions based on current students
    if (value.length > 0 && allStudents.length > 0) {
      const suggestions = allStudents
        .filter(student => 
          student.full_name?.toLowerCase().includes(value.toLowerCase()) ||
          student.email?.toLowerCase().includes(value.toLowerCase()) ||
          student.enrollment_number?.toLowerCase().includes(value.toLowerCase())
        )
        .slice(0, 5)
        .map(student => ({
          label: student.full_name,
          value: student.full_name,
          subtitle: student.email,
          icon: 'fas fa-user'
        }));
      setSearchSuggestions(suggestions);
    } else {
      setSearchSuggestions([]);
    }
  };

  // Handle department filter change
  const handleDepartmentChange = (value) => {
    setDepartmentFilter(value);
  };

  // Handle status filter change
  const handleStatusChange = (value) => {
    setStatusFilter(value);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setDepartmentFilter('');
    setStatusFilter('');
  };

  // Refresh data and clear cache
  const refreshStudents = () => {
    localStorage.removeItem('campusConnect_allStudents');
    localStorage.removeItem('campusConnect_studentsCache_timestamp');
    setCurrentPage(1);
    fetchAllStudents();
  };

  // Get paginated students for current page
  const getPaginatedStudents = () => {
    const startIndex = (currentPage - 1) * studentsPerPage;
    const endIndex = startIndex + studentsPerPage;
    return filteredStudents.slice(startIndex, endIndex);
  };

  const paginatedStudents = getPaginatedStudents();
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
  const getEventParticipationCount = (student) => {
    // Prioritize statistics from backend API
    if (student.statistics && typeof student.statistics.total_registrations === 'number') {
      return student.statistics.total_registrations;
    }
    // Fallback to other possible fields
    if (student.event_participation && Array.isArray(student.event_participation)) {
      return student.event_participation.length;
    }
    if (student.events_participated && Array.isArray(student.events_participated)) {
      return student.events_participated.length;
    }
    if (student.events_attended && typeof student.events_attended === 'number') {
      return student.events_attended;
    }
    if (student.registrations && Array.isArray(student.registrations)) {
      return student.registrations.length;
    }
    return 0;
  };

  const toggleStudentStatus = async (studentId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      const response = await adminAPI.updateStudentStatus(studentId, { is_active: newStatus });
      
      if (response.data.success) {
        // Update both allStudents and cache
        const updatedStudents = allStudents.map(student => 
          student.user_id === studentId || student._id === studentId
            ? { ...student, is_active: newStatus }
            : student
        );
        
        setAllStudents(updatedStudents);
        
        // Update cache
        localStorage.setItem('campusConnect_allStudents', JSON.stringify(updatedStudents));
        localStorage.setItem('campusConnect_studentsCache_timestamp', Date.now().toString());
        
      } else {
        throw new Error(response.data.message || 'Failed to update student status');
      }
    } catch (error) {
      console.error('Error updating student status:', error);
      setError('Failed to update student status');
    }
  };

  const handleViewStudentDetails = (student) => {
    setSelectedStudent(student);
    setIsStudentModalOpen(true);
  };

  const handleCloseStudentModal = () => {
    setSelectedStudent(null);
    setIsStudentModalOpen(false);
  };

  if (isLoading) {
    return (
      <AdminLayout pageTitle="Students Management">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Students Management">
      {/* Centered Container with Industry-Standard Design */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 space-y-8">
        {/* Enhanced Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-xl mb-8 flex items-center gap-3 shadow-sm">
            <i className="fas fa-exclamation-circle text-red-600"></i>
            <span>{error}</span>
          </div>
        )}

        {/* Enhanced Header with Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Students Management</h2>
              <p className="text-gray-600 text-lg">Manage student registrations and profiles</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={refreshStudents}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl transition-all duration-200 flex items-center justify-center font-medium shadow-sm hover:shadow-md"
              >
                <i className="fas fa-sync-alt mr-2"></i>
                Refresh Data
              </button>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-all duration-200 flex items-center justify-center font-medium shadow-sm hover:shadow-md">
                <i className="fas fa-download mr-2"></i>
                Export Students
              </button>
            </div>
          </div>
          
          {/* Enhanced Search Bar with Filters */}
          <div className="mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Search Input */}
              <div className="lg:col-span-6">
                <SearchBox
                  placeholder="Search students by name, email, or enrollment number..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  size="md"
                  suggestions={searchSuggestions}
                  filters={[
                    {
                      label: 'Active Only',
                      value: 'active',
                      active: statusFilter === 'active'
                    },
                    {
                      label: 'Verified Only', 
                      value: 'verified',
                      active: statusFilter === 'verified'
                    }
                  ]}
                />
              </div>
              
              {/* Department Filter */}
              <div className="lg:col-span-3">
                <Dropdown
                  placeholder="All Departments"
                  value={departmentFilter}
                  onChange={handleDepartmentChange}
                  clearable
                  options={availableDepartments.map(dept => ({ 
                    label: dept, 
                    value: dept,
                    icon: <i className="fas fa-building text-xs"></i>
                  }))}
                  icon={<i className="fas fa-building text-xs"></i>}
                  size="md"
                  className="h-full"
                />
              </div>
              
              {/* Status Filter */}
              <div className="lg:col-span-2">
                <Dropdown
                  placeholder="All Status"
                  value={statusFilter}
                  onChange={handleStatusChange}
                  clearable
                  options={[
                    { label: 'Active', value: 'active', icon: <i className="fas fa-check-circle text-green-500 text-xs"></i> },
                    { label: 'Inactive', value: 'inactive', icon: <i className="fas fa-times-circle text-red-500 text-xs"></i> }
                  ]}
                  icon={<i className="fas fa-toggle-on text-xs"></i>}
                  size="md"
                  className="h-full"
                />
              </div>
              
              {/* Clear Filters Button */}
              <div className="lg:col-span-1">
                <button
                  onClick={clearAllFilters}
                  className="w-full h-full px-4 py-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md"
                  title="Clear all filters"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
            
            {/* Active Filters Display */}
            {(searchTerm || departmentFilter || statusFilter) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {searchTerm && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Search: "{searchTerm}"
                    <button
                      onClick={() => setSearchTerm('')}
                      className="ml-2 hover:text-blue-600"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </span>
                )}
                {departmentFilter && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Department: {departmentFilter}
                    <button
                      onClick={() => setDepartmentFilter('')}
                      className="ml-2 hover:text-green-600"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </span>
                )}
                {statusFilter && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    Status: {statusFilter === 'active' ? 'Active' : 'Inactive'}
                    <button
                      onClick={() => setStatusFilter('')}
                      className="ml-2 hover:text-purple-600"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                <i className="fas fa-users text-lg"></i>
              </div>
              <div className="ml-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Students</h3>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totalStudents}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-green-100 text-green-600">
                <i className="fas fa-user-check text-lg"></i>
              </div>
              <div className="ml-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Active Students</h3>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {allStudents.filter(s => s.is_active !== false).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-purple-100 text-purple-600">
                <i className="fas fa-filter text-lg"></i>
              </div>
              <div className="ml-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {(searchTerm || departmentFilter || statusFilter) ? 'Filtered Results' : 'Avg. Events/Student'}
                </h3>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {(searchTerm || departmentFilter || statusFilter) 
                    ? filteredStudents.length 
                    : allStudents.length > 0 
                      ? Math.round((allStudents.reduce((acc, s) => acc + getEventParticipationCount(s), 0) / allStudents.length) * 10) / 10 
                      : 0
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Enhanced Students Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-10 py-8 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                {(searchTerm || departmentFilter || statusFilter) 
                  ? `Filtered Students (${filteredStudents.length})`
                  : `All Students (${totalStudents})`
                }
              </h3>
              {(searchTerm || departmentFilter || statusFilter) && (
                <span className="text-sm text-gray-500">
                  Showing {paginatedStudents.length} of {filteredStudents.length} filtered results
                </span>
              )}
            </div>
          </div>
          
          {paginatedStudents.length > 0 ? (
            <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="w-[30%] px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Student
                      </th>
                      <th className="w-[25%] px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Contact
                      </th>
                      <th className="w-[15%] px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Status
                      </th>
                      <th className="w-[15%] px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Joined
                      </th>
                      <th className="w-[10%] px-8 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Events
                      </th>
                      <th className="w-[5%] px-8 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {paginatedStudents.map((student, index) => (
                      <tr key={student.user_id || student._id || student.enrollment_no} 
                          className={`group hover:bg-blue-50/50 transition-all duration-200 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                          }`}>
                        
                        {/* Student Column - 30% */}
                        <td className="px-8 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                              <span className="text-white font-semibold text-sm">
                                {student.full_name?.charAt(0)?.toUpperCase() || 'S'}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-gray-900 truncate leading-tight">
                                {student.full_name || 'N/A'}
                              </div>
                              <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                                <span className="font-mono">{student.enrollment_no || 'N/A'}</span>
                                <span className="truncate">{student.department || 'No Dept'}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact Column - 25% */}
                        <td className="px-8 py-4">
                          <div className="space-y-2">
                            <div className="flex items-center text-sm text-gray-700">
                              <i className="fas fa-envelope text-blue-500 mr-2 w-4 flex-shrink-0"></i>
                              <span className="truncate font-medium" title={student.email}>
                                {student.email}
                              </span>
                            </div>
                            <div className="flex items-center text-sm text-gray-700">
                              <i className="fas fa-phone text-green-500 mr-2 w-4 flex-shrink-0"></i>
                              <span className="font-medium">{formatPhoneNumber(student.mobile_no || student.phone_number || student.phone)}</span>
                            </div>
                          </div>
                        </td>

                        {/* Status Column - 15% */}
                        <td className="px-8 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            student.is_active !== false 
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                              : 'bg-red-100 text-red-700 border border-red-200'
                          }`}>
                            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                              student.is_active !== false ? 'bg-emerald-500' : 'bg-red-500'
                            }`}></span>
                            {student.is_active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        {/* Joined Column - 15% */}
                        <td className="px-8 py-4">
                          <div className="text-sm text-gray-600 font-medium">
                            {student.created_at ? formatDate(student.created_at) : 'N/A'}
                          </div>
                        </td>

                        {/* Events Column - 10% */}
                        <td className="px-8 py-4 text-center">
                          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 border border-blue-200">
                            <span className="text-sm font-bold text-blue-600">
                              {getEventParticipationCount(student)}
                            </span>
                          </div>
                        </td>

                        {/* Actions Column - 5% */}
                        <td className="px-8 py-4 text-center">
                          <div className="flex flex-col space-y-2">
                            <button 
                              className="w-full px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors duration-150 flex items-center justify-center"
                              title="View Student Details"
                              onClick={() => handleViewStudentDetails(student)}
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                            <button 
                              className={`w-full px-2 py-1.5 text-xs rounded transition-colors duration-150 flex items-center justify-center ${
                                student.is_active !== false 
                                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                                  : 'bg-green-600 hover:bg-green-700 text-white'
                              }`}
                              title={student.is_active !== false ? 'Deactivate Student' : 'Activate Student'}
                              onClick={() => toggleStudentStatus(student.user_id || student._id, student.is_active !== false)}
                            >
                              <i className={`fas ${student.is_active !== false ? 'fa-user-slash' : 'fa-user-check'}`}></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-white border border-gray-200">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-users text-3xl text-gray-400"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {(searchTerm || departmentFilter || statusFilter) ? 'No Students Found' : 'No Students Registered'}
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto text-lg">
                {(searchTerm || departmentFilter || statusFilter)
                  ? 'Try adjusting your search terms or filters to find the students you\'re looking for.' 
                  : 'Students will appear here once they register for events.'
                }
              </p>
              {(searchTerm || departmentFilter || statusFilter) && (
                <button 
                  onClick={clearAllFilters}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-8 bg-white px-10 py-8 border border-gray-200 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-700">
                <span className="font-medium">
                  Showing {((currentPage - 1) * studentsPerPage) + 1} to{' '}
                  {Math.min(currentPage * studentsPerPage, filteredStudents.length)} of{' '}
                  {filteredStudents.length} students
                  {(searchTerm || departmentFilter || statusFilter) && (
                    <span className="text-blue-600 ml-2">(filtered from {totalStudents} total)</span>
                  )}
                </span>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    currentPage === 1
                      ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                      : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 shadow-sm hover:shadow-md'
                  }`}
                >
                  <i className="fas fa-chevron-left mr-2"></i>
                  Previous
                </button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`inline-flex items-center justify-center w-10 h-10 text-sm font-semibold rounded-lg transition-all duration-200 ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 shadow-sm hover:shadow-md'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    currentPage === totalPages
                      ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                      : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 shadow-sm hover:shadow-md'
                  }`}
                >
                  Next
                  <i className="fas fa-chevron-right ml-2"></i>
                </button>
              </div>
            </div>
          </div>
        )}


        {/* Student Details Modal */}
        <StudentCard 
          student={selectedStudent}
          isOpen={isStudentModalOpen}
          onClose={handleCloseStudentModal}
        />
      </div>
    </AdminLayout>
  );
}

export default Students;
