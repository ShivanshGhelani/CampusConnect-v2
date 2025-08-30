import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api/admin';
import LoadingSpinner from '../LoadingSpinner';
import Modal from '../ui/Modal';
import Avatar from '../ui/Avatar';

function StudentCard({ student, isOpen, onClose }) {
  const [studentDetails, setStudentDetails] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && student) {
      // Debug log to see what data we receive
      console.log('Student data received:', student);
      
      // Directly use the student data passed from the table
      setStudentDetails(student);
      setError('');
    }
  }, [isOpen, student]);
  // Remove the fetchStudentDetails function since we're using data directly
  
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
    <Modal isOpen={isOpen} onClose={onClose} title="Student Details" size="4xl">
      <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
        {error ? (
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
                  <Avatar
                    src={studentDetails.avatar_url}
                    name={studentDetails.full_name}
                    size="2xl"
                    className="shadow-lg"
                  />
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    Contact & Academic Info
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    {/* Email */}
                    <div className="flex items-start pt-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" /></svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Email Address</p>
                        <button  
                        onClick={() => window.open(`mailto:${studentDetails.email}`)}
                        className="cursor-pointer text-sm font-semibold text-gray-900 break-all">{studentDetails.email || 'N/A'}</button>
                      </div>
                    </div>
                    {/* Phone */}
                    <div className="flex items-start pt-2">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Phone</p>
                        <p className="text-sm font-semibold text-gray-900">{formatPhoneNumber(studentDetails.mobile_no || studentDetails.phone_number || studentDetails.phone)}</p>
                      </div>
                    </div>
                    {/* Department */}
                    <div className="flex items-start pt-2">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Department</p>
                        <p className="text-sm font-semibold text-gray-900">{studentDetails.department || 'N/A'}</p>
                      </div>
                    </div>
                    {/* Semester */}
                    <div className="flex items-start pt-2">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Semester</p>
                        <p className="text-sm font-semibold text-gray-900">{studentDetails.semester || 'N/A'}</p>
                      </div>
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
                            {formatDate(participation.registration_date)}
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
    </Modal>
  );
}

export default StudentCard;
