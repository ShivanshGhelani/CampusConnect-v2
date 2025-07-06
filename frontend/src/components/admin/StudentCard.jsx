import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api/axios';
import LoadingSpinner from '../LoadingSpinner';

function StudentCard({ student, isOpen, onClose }) {
  const [studentDetails, setStudentDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && student) {
      fetchStudentDetails();
    }
  }, [isOpen, student]);
  const fetchStudentDetails = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // Try to fetch detailed student data from API
      if (student.enrollment_no) {
        try {
          const response = await adminAPI.getStudentDetails(student.enrollment_no);
          if (response.data.success) {
            setStudentDetails(response.data.student);
          } else {
            // Fallback to the student data passed in
            setStudentDetails(student);
          }
        } catch (apiError) {
          console.log('API call failed, using passed student data:', apiError);
          // Fallback to the student data passed in
          setStudentDetails(student);
        }
      } else {
        // Use the student data passed in
        setStudentDetails(student);
      }
    } catch (error) {
      console.error('Error fetching student details:', error);
      setError('Failed to load student details');
      // Fallback to the student data passed in
      setStudentDetails(student);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return 'N/A';
    
    const cleaned = phone.toString().replace(/\D/g, '');
    
    if (cleaned.length === 10) {
      return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
    }
    
    return phone;
  };

  const getInitials = (name) => {
    if (!name) return 'S';
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  const getEventParticipations = () => {
    if (!studentDetails) return [];
    
    // If backend provides event participations data
    if (studentDetails.event_participations) {
      return Object.entries(studentDetails.event_participations).map(([eventId, participation]) => ({
        eventId,
        ...participation
      }));
    }
    
    // Mock data for demonstration - replace with actual API call
    return [];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Student Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          ) : studentDetails ? (
            <div className="space-y-6">
              {/* Student Profile Section */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
                <div className="flex items-center space-x-6">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                      {getInitials(studentDetails.full_name)}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-2 border-white ${
                      studentDetails.is_active !== false ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                  </div>
                  
                  {/* Basic Info */}
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">
                      {studentDetails.full_name || 'N/A'}
                    </h3>
                    <p className="text-lg text-gray-600 mb-2">
                      {studentDetails.enrollment_no || 'N/A'}
                    </p>
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        studentDetails.is_active !== false 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        <i className={`fas ${studentDetails.is_active !== false ? 'fa-check-circle' : 'fa-times-circle'} mr-1`}></i>
                        {studentDetails.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-sm text-gray-500">
                        Member since {formatDate(studentDetails.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <i className="fas fa-address-card mr-2 text-blue-600"></i>
                    Contact Information
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <i className="fas fa-envelope w-5 text-gray-400 mr-3"></i>
                      <span className="text-sm text-gray-600 w-20">Email:</span>
                      <span className="text-sm text-gray-900">{studentDetails.email || 'N/A'}</span>
                    </div>
                    <div className="flex items-center">
                      <i className="fas fa-phone w-5 text-gray-400 mr-3"></i>
                      <span className="text-sm text-gray-600 w-20">Phone:</span>
                      <span className="text-sm text-gray-900">
                        {formatPhoneNumber(studentDetails.mobile_no || studentDetails.phone_number || studentDetails.phone)}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <i className="fas fa-building w-5 text-gray-400 mr-3"></i>
                      <span className="text-sm text-gray-600 w-20">Department:</span>
                      <span className="text-sm text-gray-900">{studentDetails.department || 'N/A'}</span>
                    </div>
                    <div className="flex items-center">
                      <i className="fas fa-graduation-cap w-5 text-gray-400 mr-3"></i>
                      <span className="text-sm text-gray-600 w-20">Semester:</span>
                      <span className="text-sm text-gray-900">{studentDetails.semester || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Statistics */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <i className="fas fa-chart-bar mr-2 text-green-600"></i>
                    Participation Statistics
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {studentDetails.statistics?.total_registrations || 
                         (studentDetails.event_participations ? Object.keys(studentDetails.event_participations).length : 0)}
                      </div>
                      <div className="text-sm text-gray-500">Events Registered</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {studentDetails.statistics?.total_attendances || 0}
                      </div>
                      <div className="text-sm text-gray-500">Events Attended</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {studentDetails.statistics?.total_certificates || 0}
                      </div>
                      <div className="text-sm text-gray-500">Certificates Earned</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {studentDetails.statistics?.total_feedbacks || 0}
                      </div>
                      <div className="text-sm text-gray-500">Feedbacks Given</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Participations */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <i className="fas fa-calendar-check mr-2 text-purple-600"></i>
                  Event Participations
                </h4>
                
                {getEventParticipations().length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getEventParticipations().map((participation, index) => (
                      <div key={participation.eventId || index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-gray-900 truncate">
                            {participation.event_name || `Event ${participation.eventId}`}
                          </h5>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            participation.attendance_id ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {participation.attendance_id ? 'Attended' : 'Registered'}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center">
                            <i className="fas fa-calendar w-4 mr-2"></i>
                            {formatDate(participation.registration_datetime)}
                          </div>
                          {participation.team_name && (
                            <div className="flex items-center">
                              <i className="fas fa-users w-4 mr-2"></i>
                              Team: {participation.team_name}
                            </div>
                          )}
                          <div className="flex items-center space-x-3 mt-2">
                            {participation.attendance_id && (
                              <span className="inline-flex items-center text-xs text-green-600">
                                <i className="fas fa-check-circle mr-1"></i>
                                Attended
                              </span>
                            )}
                            {participation.feedback_id && (
                              <span className="inline-flex items-center text-xs text-blue-600">
                                <i className="fas fa-comment mr-1"></i>
                                Feedback
                              </span>
                            )}
                            {participation.certificate_id && (
                              <span className="inline-flex items-center text-xs text-purple-600">
                                <i className="fas fa-certificate mr-1"></i>
                                Certificate
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-calendar-times text-2xl text-gray-400"></i>
                    </div>
                    <h5 className="text-lg font-medium text-gray-900 mb-2">No Event Participations</h5>
                    <p className="text-gray-500">This student hasn't participated in any events yet.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-user text-2xl text-gray-400"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Student Data</h3>
              <p className="text-gray-500">Student details could not be loaded.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default StudentCard;
