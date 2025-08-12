import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { clientAPI } from '../../../../api/client';
import ClientLayout from '../../../../components/client/Layout';
import LoadingSpinner from '../../../../components/LoadingSpinner';

// Enhanced Modal Components
import RoleAssignmentModal from './modals/RoleAssignmentModal';
import TaskManagementModal from './modals/TaskManagementModal';
import TeamCommunicationModal from './modals/TeamCommunicationModal';
import ReportGenerationModal from './modals/ReportGenerationModal';

const EnhancedTeamManagement = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  // Enhanced state management
  const [teamData, setTeamData] = useState(null);
  const [teamSummary, setTeamSummary] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal states
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  
  // Tab management
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth/login', { state: { from: location } });
      return;
    }
    
    fetchEnhancedTeamData();
  }, [eventId, isAuthenticated, location]);

  const fetchEnhancedTeamData = async () => {
    try {
      setIsLoading(true);
      
      // Get original team data
      const teamResponse = await clientAPI.getTeamDetails(eventId);
      
      if (teamResponse.data.success && teamResponse.data.registered) {
        const teamInfo = teamResponse.data.full_registration_data;
        
        // Add the top-level fields to the registration data for compatibility
        teamInfo.registration_id = teamResponse.data.registration_id;
        teamInfo.registration_type = teamResponse.data.registration_type;
        teamInfo.registration_datetime = teamResponse.data.registration_datetime;
        
        // Flatten student_data to top level for frontend compatibility
        if (teamInfo.student_data) {
          Object.assign(teamInfo, teamInfo.student_data);
        }
        
        setTeamData(teamInfo);
        
        const teamId = teamInfo.team_registration_id || teamInfo.registration_id;
        
        // Get enhanced team summary
        const summaryResponse = await fetch(`/api/v1/client/registration/enhanced/team-summary/${eventId}/${teamId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          if (summaryData.success) {
            setTeamSummary(summaryData.summary);
            
            // Find user's role
            const roles = summaryData.summary.roles || [];
            const myRole = roles.find(role => role.enrollment_no === user.enrollment_no);
            setUserRole(myRole);
          }
        }
      } else {
        setError('Team registration not found');
      }
      
    } catch (error) {
      console.error('Error fetching enhanced team data:', error);
      setError('Failed to load team data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleAssigned = () => {
    setSuccess('Role assigned successfully!');
    fetchEnhancedTeamData();
    setShowRoleModal(false);
  };

  const handleTaskCreated = () => {
    setSuccess('Task created successfully!');
    fetchEnhancedTeamData();
    setShowTaskModal(false);
  };

  const handleMessagePosted = () => {
    setSuccess('Message posted successfully!');
    fetchEnhancedTeamData();
    setShowMessageModal(false);
  };

  const handleReportGenerated = () => {
    setSuccess('Report generated successfully!');
    setShowReportModal(false);
  };

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </ClientLayout>
    );
  }

  if (error) {
    return (
      <ClientLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <i className="fas fa-exclamation-triangle text-red-600 text-4xl mb-4"></i>
            <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Team Data</h2>
            <p className="text-red-600">{error}</p>
            <button 
              onClick={() => navigate('/client/dashboard')}
              className="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </ClientLayout>
    );
  }

  const isTeamLeader = teamData?.registration_type === 'team' || teamData?.registration_type === 'team_leader';
  const teamId = teamData?.team_registration_id || teamData?.registration_id;

  return (
    <ClientLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">Enhanced Team Management</h1>
              <p className="text-blue-100 mb-4">{teamData?.team_name}</p>
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <i className="fas fa-users"></i>
                  <span>{teamData?.team_members?.length + 1 || 1} Members</span>
                </div>
                {userRole && (
                  <div className="flex items-center gap-2">
                    <i className="fas fa-user-tag"></i>
                    <span>Role: {userRole.custom_role_name || userRole.role}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <i className="fas fa-tasks"></i>
                  <span>{teamSummary?.tasks?.total_tasks || 0} Tasks</span>
                </div>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="flex gap-3">
              {isTeamLeader && (
                <button
                  onClick={() => setShowRoleModal(true)}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <i className="fas fa-user-tag"></i>
                  Assign Roles
                </button>
              )}
              <button
                onClick={() => setShowTaskModal(true)}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <i className="fas fa-plus"></i>
                Add Task
              </button>
              <button
                onClick={() => setShowMessageModal(true)}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <i className="fas fa-comment"></i>
                Message
              </button>
              <button
                onClick={() => setShowReportModal(true)}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <i className="fas fa-download"></i>
                Report
              </button>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <i className="fas fa-check-circle text-green-600"></i>
            <span className="text-green-800">{success}</span>
            <button onClick={() => setSuccess('')} className="ml-auto text-green-600 hover:text-green-800">
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        {/* Enhanced Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex">
              {[
                { id: 'overview', label: 'Overview', icon: 'fas fa-tachometer-alt' },
                { id: 'roles', label: 'Roles & Members', icon: 'fas fa-users-cog' },
                { id: 'tasks', label: 'Task Board', icon: 'fas fa-tasks' },
                { id: 'communication', label: 'Team Messages', icon: 'fas fa-comments' },
                { id: 'analytics', label: 'Analytics', icon: 'fas fa-chart-bar' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <i className={tab.icon}></i>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <OverviewTab teamData={teamData} teamSummary={teamSummary} userRole={userRole} />
            )}
            {activeTab === 'roles' && (
              <RolesTab 
                eventId={eventId} 
                teamId={teamId} 
                teamData={teamData} 
                teamSummary={teamSummary}
                isTeamLeader={isTeamLeader}
                onRefresh={fetchEnhancedTeamData}
              />
            )}
            {activeTab === 'tasks' && (
              <TasksTab 
                eventId={eventId} 
                teamId={teamId} 
                userEnrollment={user.enrollment_no}
                onRefresh={fetchEnhancedTeamData}
              />
            )}
            {activeTab === 'communication' && (
              <CommunicationTab 
                eventId={eventId} 
                teamId={teamId} 
                userEnrollment={user.enrollment_no}
                onRefresh={fetchEnhancedTeamData}
              />
            )}
            {activeTab === 'analytics' && (
              <AnalyticsTab eventId={eventId} teamId={teamId} teamSummary={teamSummary} />
            )}
          </div>
        </div>

        {/* Modals */}
        {showRoleModal && (
          <RoleAssignmentModal
            eventId={eventId}
            teamId={teamId}
            teamMembers={[
              { enrollment_no: teamData.enrollment_no, name: teamData.full_name },
              ...(teamData.team_members || [])
            ]}
            onClose={() => setShowRoleModal(false)}
            onSuccess={handleRoleAssigned}
          />
        )}

        {showTaskModal && (
          <TaskManagementModal
            eventId={eventId}
            teamId={teamId}
            teamMembers={[
              { enrollment_no: teamData.enrollment_no, name: teamData.full_name },
              ...(teamData.team_members || [])
            ]}
            onClose={() => setShowTaskModal(false)}
            onSuccess={handleTaskCreated}
          />
        )}

        {showMessageModal && (
          <TeamCommunicationModal
            eventId={eventId}
            teamId={teamId}
            teamMembers={[
              { enrollment_no: teamData.enrollment_no, name: teamData.full_name },
              ...(teamData.team_members || [])
            ]}
            onClose={() => setShowMessageModal(false)}
            onSuccess={handleMessagePosted}
          />
        )}

        {showReportModal && (
          <ReportGenerationModal
            eventId={eventId}
            teamId={teamId}
            teamData={teamData}
            onClose={() => setShowReportModal(false)}
            onSuccess={handleReportGenerated}
          />
        )}
      </div>
    </ClientLayout>
  );
};

// Overview Tab Component
const OverviewTab = ({ teamData, teamSummary, userRole }) => (
  <div className="space-y-6">
    {/* Team Statistics */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <StatCard 
        icon="fas fa-users" 
        title="Team Members" 
        value={teamData?.team_members?.length + 1 || 1}
        color="blue"
      />
      <StatCard 
        icon="fas fa-user-tag" 
        title="Assigned Roles" 
        value={teamSummary?.role_count || 0}
        color="purple"
      />
      <StatCard 
        icon="fas fa-tasks" 
        title="Total Tasks" 
        value={teamSummary?.tasks?.total_tasks || 0}
        color="green"
      />
      <StatCard 
        icon="fas fa-comments" 
        title="Messages" 
        value={teamSummary?.messages?.total || 0}
        color="orange"
      />
    </div>

    {/* User Role Info */}
    {userRole && (
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
        <h3 className="text-lg font-semibold text-purple-800 mb-2">Your Role</h3>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <i className="fas fa-user-tag text-purple-600"></i>
          </div>
          <div>
            <p className="font-medium text-purple-900">
              {userRole.custom_role_name || userRole.role}
            </p>
            {userRole.role_description && (
              <p className="text-sm text-purple-700">{userRole.role_description}</p>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Recent Activity */}
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {teamSummary?.messages?.recent?.map((message, index) => (
          <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <i className="fas fa-comment text-blue-600"></i>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{message.title}</p>
              <p className="text-sm text-gray-600">
                by {message.sender_name} • {new Date(message.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        )) || (
          <p className="text-gray-500 text-center py-4">No recent activity</p>
        )}
      </div>
    </div>
  </div>
);

// Stat Card Component
const StatCard = ({ icon, title, value, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200'
  };

  return (
    <div className={`rounded-xl p-6 border ${colorClasses[color]}`}>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colorClasses[color]}`}>
          <i className={icon}></i>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-600">{title}</p>
        </div>
      </div>
    </div>
  );
};

// Roles Tab Component (placeholder)
const RolesTab = ({ eventId, teamId, teamData, teamSummary, isTeamLeader, onRefresh }) => (
  <div>
    <h3 className="text-xl font-semibold mb-4">Roles & Members Management</h3>
    <p className="text-gray-600">Roles management interface will be implemented here.</p>
    {/* TODO: Implement detailed roles management interface */}
  </div>
);

// Tasks Tab Component (placeholder)
const TasksTab = ({ eventId, teamId, userEnrollment, onRefresh }) => (
  <div>
    <h3 className="text-xl font-semibold mb-4">Task Board</h3>
    <p className="text-gray-600">Task board interface will be implemented here.</p>
    {/* TODO: Implement Kanban-style task board */}
  </div>
);

// Communication Tab Component (placeholder)
const CommunicationTab = ({ eventId, teamId, userEnrollment, onRefresh }) => (
  <div>
    <h3 className="text-xl font-semibold mb-4">Team Messages</h3>
    <p className="text-gray-600">Team communication interface will be implemented here.</p>
    {/* TODO: Implement team messaging interface */}
  </div>
);

// Analytics Tab Component (placeholder)
const AnalyticsTab = ({ eventId, teamId, teamSummary }) => (
  <div>
    <h3 className="text-xl font-semibold mb-4">Team Analytics</h3>
    <p className="text-gray-600">Analytics dashboard will be implemented here.</p>
    {/* TODO: Implement analytics charts and metrics */}
  </div>
);

export default EnhancedTeamManagement;
