import React, { useState, useEffect, useRef } from 'react';

const RoleAssignmentModal = ({ eventId, teamId, teamMembers, onClose, onSuccess }) => {
  const [selectedMember, setSelectedMember] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [customRoleName, setCustomRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const memberInputRef = useRef(null);
  const modalRef = useRef(null);

  // Predefined roles
  const predefinedRoles = [
    { value: 'team_leader', label: 'Team Leader', description: 'Overall team coordination and decision making' },
    { value: 'technical_lead', label: 'Technical Lead', description: 'Technical guidance and code review' },
    { value: 'project_manager', label: 'Project Manager', description: 'Project planning and timeline management' },
    { value: 'designer', label: 'Designer', description: 'UI/UX design and visual elements' },
    { value: 'developer', label: 'Developer', description: 'Code implementation and development' },
    { value: 'tester', label: 'Tester', description: 'Quality assurance and testing' },
    { value: 'researcher', label: 'Researcher', description: 'Research and analysis' },
    { value: 'coordinator', label: 'Coordinator', description: 'Communication and coordination' },
    { value: 'custom', label: 'Custom Role', description: 'Define a custom role' }
  ];

  // Filter members based on search term
  const filteredMembers = teamMembers.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.enrollment_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    const handleClickOutsideDropdown = (event) => {
      if (memberInputRef.current && !memberInputRef.current.contains(event.target)) {
        setShowMemberDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutsideDropdown);
    return () => document.removeEventListener('mousedown', handleClickOutsideDropdown);
  }, []);

  const handleMemberSelect = (member) => {
    setSelectedMember(member.enrollment_no);
    setSearchTerm(member.name);
    setShowMemberDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedMember || !selectedRole) {
      setError('Please select both a member and a role');
      return;
    }

    if (selectedRole === 'custom' && !customRoleName.trim()) {
      setError('Please provide a custom role name');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/client/registration/enhanced/assign-role/${eventId}/${teamId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          enrollment_no: selectedMember,
          role: selectedRole === 'custom' ? 'custom' : selectedRole,
          custom_role_name: selectedRole === 'custom' ? customRoleName.trim() : undefined,
          role_description: roleDescription.trim() || undefined
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onSuccess();
      } else {
        setError(data.message || 'Failed to assign role');
      }
    } catch (error) {
      console.error('Error assigning role:', error);
      setError('Network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedRoleData = predefinedRoles.find(role => role.value === selectedRole);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div ref={modalRef} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold mb-2">Role Assignment</h2>
              <p className="text-purple-100">Assign roles to team members with autocomplete</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-purple-200 transition-colors"
              disabled={isLoading}
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                <i className="fas fa-exclamation-circle text-red-600"></i>
                <span className="text-red-800">{error}</span>
              </div>
            )}

            {/* Member Selection with Autocomplete */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Select Team Member *
              </label>
              <div className="relative" ref={memberInputRef}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowMemberDropdown(true);
                    setSelectedMember('');
                  }}
                  onFocus={() => setShowMemberDropdown(true)}
                  placeholder="Search by name or enrollment number..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
                <div className="absolute right-3 top-3">
                  <i className="fas fa-search text-gray-400"></i>
                </div>

                {/* Dropdown */}
                {showMemberDropdown && filteredMembers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredMembers.map((member) => (
                      <button
                        key={member.enrollment_no}
                        type="button"
                        onClick={() => handleMemberSelect(member)}
                        className="w-full px-4 py-3 text-left hover:bg-purple-50 flex items-center gap-3 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <i className="fas fa-user text-purple-600 text-sm"></i>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{member.name}</p>
                          <p className="text-sm text-gray-600">{member.enrollment_no}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {showMemberDropdown && filteredMembers.length === 0 && searchTerm && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500">
                    No members found matching "{searchTerm}"
                  </div>
                )}
              </div>
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Select Role *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {predefinedRoles.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setSelectedRole(role.value)}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      selectedRole === role.value
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-purple-25'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        selectedRole === role.value ? 'bg-purple-500' : 'bg-gray-300'
                      }`}></div>
                      <div>
                        <p className="font-medium text-gray-900">{role.label}</p>
                        <p className="text-sm text-gray-600">{role.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Role Name (if custom role selected) */}
            {selectedRole === 'custom' && (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Custom Role Name *
                </label>
                <input
                  type="text"
                  value={customRoleName}
                  onChange={(e) => setCustomRoleName(e.target.value)}
                  placeholder="Enter custom role name..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>
            )}

            {/* Role Description */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Role Description (Optional)
              </label>
              <textarea
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
                placeholder={selectedRoleData ? selectedRoleData.description : "Describe the role responsibilities..."}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Selected Member Preview */}
            {selectedMember && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-800 mb-2">Assignment Preview</h4>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <i className="fas fa-user text-purple-600"></i>
                  </div>
                  <div>
                    <p className="font-medium text-purple-900">
                      {teamMembers.find(m => m.enrollment_no === selectedMember)?.name}
                    </p>
                    <p className="text-sm text-purple-700">
                      Will be assigned as: {selectedRole === 'custom' ? customRoleName : selectedRoleData?.label}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !selectedMember || !selectedRole || (selectedRole === 'custom' && !customRoleName.trim())}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading && <i className="fas fa-spinner fa-spin"></i>}
            {isLoading ? 'Assigning...' : 'Assign Role'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleAssignmentModal;
