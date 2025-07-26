import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { clientAPI } from '../../../../api/axios';
import ClientLayout from '../../../../components/client/Layout';
import LoadingSpinner from '../../../../components/LoadingSpinner';

const StudentTeamRegistration = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  // State management
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [registrationBlocked, setRegistrationBlocked] = useState(false);
  
  // Team registration state
  const [teamSizeMin, setTeamSizeMin] = useState(2);
  const [teamSizeMax, setTeamSizeMax] = useState(5);
  const [teamData, setTeamData] = useState({
    team_name: '',
    team_leader_enrollment: '',
    team_leader_name: '',
    team_leader_email: '',
    team_leader_department: '',
    team_description: '',
    project_idea: '',
    collaboration_goals: ''
  });
  
  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth/login', { state: { from: location } });
      return;
    }
    
    fetchEventData();
  }, [eventId, isAuthenticated, location]);

  const fetchEventData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch event details
      const eventResponse = await clientAPI.getEventDetails(eventId);
      if (eventResponse.data.success) {
        const eventData = eventResponse.data.event;
        setEvent(eventData);
        
        // Verify this is a student event and supports teams
        if (eventData.target_audience !== 'students' && eventData.target_audience !== 'both') {
          setError('This event is not available for student registration.');
          setRegistrationBlocked(true);
          return;
        }

        if (eventData.event_type !== 'team' && eventData.registration_type !== 'team') {
          setError('This event does not support team registration.');
          setRegistrationBlocked(true);
          return;
        }

        // Set team size constraints
        setTeamSizeMin(eventData.team_size_min || 2);
        setTeamSizeMax(eventData.team_size_max || 5);
      }

      // Pre-populate team leader data with current student
      if (user) {
        setTeamData(prev => ({
          ...prev,
          team_leader_enrollment: user.enrollment_no || '',
          team_leader_name: user.full_name || user.name || '',
          team_leader_email: user.email || '',
          team_leader_department: user.department || ''
        }));
        
        // Initialize team members array with leader
        setTeamMembers([{
          id: 1,
          enrollment_no: user.enrollment_no || '',
          full_name: user.full_name || user.name || '',
          email: user.email || '',
          department: user.department || '',
          semester: user.semester || '',
          role: 'Team Leader',
          isLeader: true
        }]);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load registration details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTeamDataChange = (e) => {
    const { name, value } = e.target;
    setTeamData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMemberChange = (index, field, value) => {
    setTeamMembers(prev => 
      prev.map((member, i) => 
        i === index ? { ...member, [field]: value } : member
      )
    );
  };

  const addTeamMember = () => {
    if (teamMembers.length < teamSizeMax) {
      setTeamMembers(prev => [...prev, {
        id: Date.now(),
        enrollment_no: '',
        full_name: '',
        email: '',
        department: '',
        semester: '',
        role: 'Team Member',
        isLeader: false
      }]);
    }
  };

  const removeTeamMember = (index) => {
    if (teamMembers.length > teamSizeMin && !teamMembers[index].isLeader) {
      setTeamMembers(prev => prev.filter((_, i) => i !== index));
    }
  };

  const validateForm = () => {
    // Validate team data
    if (!teamData.team_name || !teamData.team_leader_name || !teamData.team_leader_email) {
      setError('Please fill in all required team information.');
      return false;
    }

    // Validate team size
    if (teamMembers.length < teamSizeMin || teamMembers.length > teamSizeMax) {
      setError(`Team must have between ${teamSizeMin} and ${teamSizeMax} members.`);
      return false;
    }

    // Validate all team members
    for (let i = 0; i < teamMembers.length; i++) {
      const member = teamMembers[i];
      if (!member.full_name || !member.email || !member.enrollment_no) {
        setError(`Please fill in all required information for team member ${i + 1}.`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');

      const registrationData = {
        event_id: eventId,
        registration_type: 'team',
        team_data: teamData,
        team_members: teamMembers,
        timestamp: new Date().toISOString()
      };

      // Submit registration
      const response = await clientAPI.registerForEvent(registrationData);
      
      if (response.data.success) {
        setSuccess('Team registration submitted successfully!');
        
        // Navigate to success page
        setTimeout(() => {
          navigate(`/student/events/${eventId}/registration-success`);
        }, 2000);
      } else {
        setError(response.data.message || 'Registration failed. Please try again.');
      }

    } catch (error) {
      console.error('Registration error:', error);
      setError('Failed to submit registration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !event) {
    return (
      <ClientLayout>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </ClientLayout>
    );
  }

  if (registrationBlocked) {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-md mx-auto">
            <div className="bg-white shadow-lg rounded-lg p-6 text-center">
              <div className="text-red-500 text-5xl mb-4">⚠️</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Registration Not Available</h2>
              <p className="text-gray-600">{error}</p>
              <button
                onClick={() => navigate('/student/events')}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Back to Events
              </button>
            </div>
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
              <h1 className="text-2xl font-bold mb-2">Student Team Registration</h1>
              {event && (
                <p className="text-blue-100">
                  Registering for: <span className="font-semibold">{event.title}</span>
                </p>
              )}
              <p className="text-sm text-blue-100 mt-1">
                Team Size: {teamSizeMin} - {teamSizeMax} members
              </p>
            </div>

            {/* Form */}
            <div className="p-6">
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Team Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Team Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Team Name *
                      </label>
                      <input
                        type="text"
                        name="team_name"
                        value={teamData.team_name}
                        onChange={handleTeamDataChange}
                        required
                        placeholder="Enter your team name"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Project Idea
                      </label>
                      <input
                        type="text"
                        name="project_idea"
                        value={teamData.project_idea}
                        onChange={handleTeamDataChange}
                        placeholder="Brief project concept"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Team Description
                    </label>
                    <textarea
                      name="team_description"
                      value={teamData.team_description}
                      onChange={handleTeamDataChange}
                      rows="3"
                      placeholder="Brief description of your team and goals..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Collaboration Goals
                    </label>
                    <textarea
                      name="collaboration_goals"
                      value={teamData.collaboration_goals}
                      onChange={handleTeamDataChange}
                      rows="3"
                      placeholder="What do you hope to achieve through this collaboration..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Team Members */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                      Team Members ({teamMembers.length}/{teamSizeMax})
                    </h3>
                    <button
                      type="button"
                      onClick={addTeamMember}
                      disabled={teamMembers.length >= teamSizeMax}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Member
                    </button>
                  </div>

                  <div className="space-y-4">
                    {teamMembers.map((member, index) => (
                      <div key={member.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-medium text-gray-800">
                            {member.isLeader ? 'Team Leader' : `Team Member ${index}`}
                          </h4>
                          {!member.isLeader && teamMembers.length > teamSizeMin && (
                            <button
                              type="button"
                              onClick={() => removeTeamMember(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Enrollment Number *
                            </label>
                            <input
                              type="text"
                              value={member.enrollment_no}
                              onChange={(e) => handleMemberChange(index, 'enrollment_no', e.target.value)}
                              required
                              disabled={member.isLeader}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Full Name *
                            </label>
                            <input
                              type="text"
                              value={member.full_name}
                              onChange={(e) => handleMemberChange(index, 'full_name', e.target.value)}
                              required
                              disabled={member.isLeader}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Email *
                            </label>
                            <input
                              type="email"
                              value={member.email}
                              onChange={(e) => handleMemberChange(index, 'email', e.target.value)}
                              required
                              disabled={member.isLeader}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Department *
                            </label>
                            <input
                              type="text"
                              value={member.department}
                              onChange={(e) => handleMemberChange(index, 'department', e.target.value)}
                              required
                              disabled={member.isLeader}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Semester
                            </label>
                            <select
                              value={member.semester}
                              onChange={(e) => handleMemberChange(index, 'semester', e.target.value)}
                              disabled={member.isLeader}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                            >
                              <option value="">Select Semester</option>
                              {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                                <option key={sem} value={sem}>{sem}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Role in Team
                            </label>
                            <input
                              type="text"
                              value={member.role}
                              onChange={(e) => handleMemberChange(index, 'role', e.target.value)}
                              disabled={member.isLeader}
                              placeholder="e.g., Developer, Designer"
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center">
                        <LoadingSpinner size="sm" />
                        <span className="ml-2">Submitting Team Registration...</span>
                      </span>
                    ) : (
                      'Submit Team Registration'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
};

export default StudentTeamRegistration;
