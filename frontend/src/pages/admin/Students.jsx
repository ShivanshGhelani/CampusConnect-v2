import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api/axios';
import AdminLayout from '../../components/admin/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import StudentCard from '../../components/admin/StudentCard';

function Students() {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [studentsPerPage] = useState(50); // Can be made configurable

  useEffect(() => {
    fetchStudents();
  }, [currentPage]); // Re-fetch when page changes

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== undefined) { // Only fetch if searchTerm has been set
        fetchStudents();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]); // Re-fetch when search term changes

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      
      // Build filters for API call
      const filters = {
        page: currentPage,
        limit: studentsPerPage,
      };
      
      // Add search filter if search term exists
      if (searchTerm.trim()) {
        filters.search = searchTerm.trim();
      }
      
      const response = await adminAPI.getStudents(filters);
      
      // Debug logging
      console.log('API Filters sent:', filters);
      console.log('API Response:', response.data);
      
      if (response.data.success) {
        setStudents(response.data.students || []);
        setTotalPages(response.data.pagination?.total_pages || 1);
        setTotalStudents(response.data.pagination?.total_students || 0);
        setError('');
        
        // More debug logging
        console.log('Students loaded:', response.data.students?.length);
        console.log('Total students from API:', response.data.pagination?.total_students);
        console.log('Total pages from API:', response.data.pagination?.total_pages);
      } else {
        throw new Error(response.data.message || 'Failed to fetch students');
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setError('Failed to load students');
    } finally {
      setIsLoading(false);
    }
  };  // Handle search with debounce and reset to page 1
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const filteredStudents = students; // No client-side filtering since we're doing server-side search
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
        // Update local state
        setStudents(prevStudents => 
          prevStudents.map(student => 
            student.user_id === studentId || student._id === studentId
              ? { ...student, is_active: newStatus }
              : student
          )
        );
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
      <div className="mx-24 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Header with Search */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Students</h2>
            <p className="text-gray-600">Manage student registrations and profiles</p>
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={() => {
                setCurrentPage(1);
                fetchStudents();
              }}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors flex items-center"
            >
              <i className="fas fa-sync-alt mr-2"></i>
              Refresh
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
              placeholder="Search students by name, email, or enrollment number..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <i className="fas fa-users text-xl"></i>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total Students</h3>
                <p className="text-2xl font-semibold text-gray-900">{totalStudents}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <i className="fas fa-user-check text-xl"></i>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Active Students</h3>
                <p className="text-2xl font-semibold text-gray-900">
                  {students.filter(s => s.is_active !== false).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <i className="fas fa-calendar-check text-xl"></i>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Avg. Events/Student</h3>
                <p className="text-2xl font-semibold text-gray-900">
                  {students.length > 0 ? Math.round((students.reduce((acc, s) => acc + getEventParticipationCount(s), 0) / students.length) * 10) / 10 : 0}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Students Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              All Students ({filteredStudents.length})
            </h3>
          </div>
          
          {filteredStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrollment No.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Events Participated</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.map((student) => (
                    <tr key={student.user_id || student._id || student.enrollment_no} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-sm">
                              {student.full_name?.charAt(0)?.toUpperCase() || 'S'}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {student.full_name || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {student.department || 'No Department'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student.enrollment_no || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatPhoneNumber(student.mobile_no || student.phone_number || student.phone)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          student.is_active !== false 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {student.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <i className="fas fa-calendar-check mr-1"></i>
                            {getEventParticipationCount(student)} Events
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.created_at ? formatDate(student.created_at) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex space-x-2 justify-end">
                          <button 
                            className="text-blue-600 hover:text-blue-900 transition-colors px-2 py-1 rounded-md hover:bg-blue-50"
                            title="View Student Details"
                            onClick={() => handleViewStudentDetails(student)}
                          >
                            <i className="fas fa-eye mr-1"></i>
                            View
                          </button>
                          <button 
                            className={`${
                              student.is_active !== false 
                                ? 'text-red-600 hover:text-red-900 hover:bg-red-50' 
                                : 'text-green-600 hover:text-green-900 hover:bg-green-50'
                            } transition-colors px-2 py-1 rounded-md`}
                            title={student.is_active !== false ? 'Deactivate Student' : 'Activate Student'}
                            onClick={() => toggleStudentStatus(student.user_id || student._id, student.is_active !== false)}
                          >
                            <i className={`fas ${student.is_active !== false ? 'fa-user-slash' : 'fa-user-check'} mr-1`}></i>
                            {student.is_active !== false ? 'Deactivate' : 'Activate'}
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
                <i className="fas fa-users text-2xl text-gray-400"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No Students Found' : 'No Students Registered'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm 
                  ? 'Try adjusting your search terms.' 
                  : 'Students will appear here once they register for events.'
                }
              </p>
              {searchTerm && (
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setCurrentPage(1);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Clear Search
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 rounded-lg shadow flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
                  currentPage === 1
                    ? 'border-gray-300 text-gray-500 bg-gray-100 cursor-not-allowed'
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                }`}
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`ml-3 relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
                  currentPage === totalPages
                    ? 'border-gray-300 text-gray-500 bg-gray-100 cursor-not-allowed'
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                }`}
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">{((currentPage - 1) * studentsPerPage) + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * studentsPerPage, totalStudents)}
                  </span>{' '}
                  of <span className="font-medium">{totalStudents}</span> students
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border text-sm font-medium ${
                      currentPage === 1
                        ? 'border-gray-300 text-gray-500 bg-gray-100 cursor-not-allowed'
                        : 'border-gray-300 text-gray-500 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>
                  
                  {/* Page Numbers */}
                  {[...Array(Math.min(totalPages, 5))].map((_, index) => {
                    let pageNumber;
                    if (totalPages <= 5) {
                      pageNumber = index + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = index + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + index;
                    } else {
                      pageNumber = currentPage - 2 + index;
                    }
                    
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === pageNumber
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border text-sm font-medium ${
                      currentPage === totalPages
                        ? 'border-gray-300 text-gray-500 bg-gray-100 cursor-not-allowed'
                        : 'border-gray-300 text-gray-500 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </nav>
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
