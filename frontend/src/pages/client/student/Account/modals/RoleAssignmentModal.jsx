import React, { useState, useEffect, useRef } from 'react';
import { clientAPI } from '../../../../../api/client';

const RoleAssignmentModal = ({ eventId, teamId, teamMembers = [], onClose, onSuccess }) => {
  const [selectedMember, setSelectedMember] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [customRoleName, setCustomRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentRoles, setCurrentRoles] = useState([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  
  // Smart UI states
  const [currentStep, setCurrentStep] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const [roleSuggestions, setRoleSuggestions] = useState([]);
  const [showRoleCustomization, setShowRoleCustomization] = useState(false);

  const memberInputRef = useRef(null);
  const modalRef = useRef(null);

  // Debug logging
  useEffect(() => {
    console.log('🔍 RoleAssignmentModal props:');
    console.log('  eventId:', eventId);
    console.log('  teamId:', teamId);
    console.log('  teamMembers:', teamMembers);
  }, [eventId, teamId, teamMembers]);

  // Load current role assignments
  useEffect(() => {
    const loadCurrentRoles = async () => {
      if (!eventId) return;
      
      try {
        setIsLoadingRoles(true);
        console.log('🔍 Loading current team roles for event:', eventId);
        
        const response = await clientAPI.getTeamRoles(eventId);
        console.log('✅ Current roles response:', response);
        
        if (response.data && response.data.success) {
          setCurrentRoles(response.data.roles || []);
        }
      } catch (error) {
        console.error('❌ Error loading current roles:', error);
        // Don't set error state here since this is optional functionality
      } finally {
        setIsLoadingRoles(false);
      }
    };

    loadCurrentRoles();
  }, [eventId]);

  // Predefined roles with enhanced metadata
  const predefinedRoles = [
    { 
      value: 'team_leader', 
      label: 'Team Leader', 
      description: 'Overall team coordination and decision making',
      icon: 'fas fa-crown',
      color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      skills: ['Leadership', 'Communication', 'Decision Making'],
      responsibilities: ['Team coordination', 'Final decisions', 'Progress tracking']
    },
    { 
      value: 'technical_lead', 
      label: 'Technical Lead', 
      description: 'Technical guidance and code review',
      icon: 'fas fa-code',
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      skills: ['Programming', 'Architecture', 'Code Review'],
      responsibilities: ['Technical decisions', 'Code quality', 'Architecture design']
    },
    { 
      value: 'project_manager', 
      label: 'Project Manager', 
      description: 'Project planning and timeline management',
      icon: 'fas fa-tasks',
      color: 'text-green-600 bg-green-50 border-green-200',
      skills: ['Planning', 'Organization', 'Time Management'],
      responsibilities: ['Timeline management', 'Resource allocation', 'Risk assessment']
    },
    { 
      value: 'designer', 
      label: 'Designer', 
      description: 'UI/UX design and visual elements',
      icon: 'fas fa-palette',
      color: 'text-pink-600 bg-pink-50 border-pink-200',
      skills: ['Design', 'Creativity', 'User Experience'],
      responsibilities: ['UI design', 'User experience', 'Visual consistency']
    },
    { 
      value: 'developer', 
      label: 'Developer', 
      description: 'Code implementation and development',
      icon: 'fas fa-laptop-code',
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      skills: ['Programming', 'Problem Solving', 'Testing'],
      responsibilities: ['Code implementation', 'Bug fixes', 'Feature development']
    },
    { 
      value: 'tester', 
      label: 'Tester', 
      description: 'Quality assurance and testing',
      icon: 'fas fa-bug',
      color: 'text-red-600 bg-red-50 border-red-200',
      skills: ['Testing', 'Attention to Detail', 'Quality Assurance'],
      responsibilities: ['Test planning', 'Bug reporting', 'Quality validation']
    },
    { 
      value: 'researcher', 
      label: 'Researcher', 
      description: 'Research and analysis',
      icon: 'fas fa-search',
      color: 'text-purple-600 bg-purple-50 border-purple-200',
      skills: ['Research', 'Analysis', 'Documentation'],
      responsibilities: ['Market research', 'Data analysis', 'Documentation']
    },
    { 
      value: 'coordinator', 
      label: 'Coordinator', 
      description: 'Communication and coordination',
      icon: 'fas fa-users',
      color: 'text-teal-600 bg-teal-50 border-teal-200',
      skills: ['Communication', 'Organization', 'Networking'],
      responsibilities: ['Team communication', 'External relations', 'Meeting coordination']
    },
    { 
      value: 'custom', 
      label: 'Custom Role', 
      description: 'Define a custom role',
      icon: 'fas fa-plus-circle',
      color: 'text-gray-600 bg-gray-50 border-gray-200',
      skills: ['Flexible'],
      responsibilities: ['As defined']
    }
  ];

  // Smart role suggestions based on member analysis
  const getSmartRoleSuggestions = (member) => {
    if (!member) return [];
    
    const suggestions = [];
    const memberName = member.name.toLowerCase();
    
    // Simple heuristics for role suggestions
    if (memberName.includes('lead') || member.isLeader) {
      suggestions.push('team_leader', 'technical_lead');
    }
    if (memberName.includes('design') || memberName.includes('ui')) {
      suggestions.push('designer');
    }
    if (memberName.includes('dev') || memberName.includes('code')) {
      suggestions.push('developer', 'technical_lead');
    }
    if (memberName.includes('test') || memberName.includes('qa')) {
      suggestions.push('tester');
    }
    if (memberName.includes('manage') || memberName.includes('pm')) {
      suggestions.push('project_manager');
    }
    
    // Default suggestions if no specific patterns found
    if (suggestions.length === 0) {
      suggestions.push('developer', 'coordinator', 'researcher');
    }
    
    return [...new Set(suggestions)]; // Remove duplicates
  };

  // Get available roles (exclude already assigned roles for uniqueness)
  const getAvailableRoles = () => {
    const assignedRoles = currentRoles.map(role => role.assigned_role.toLowerCase());
    const uniqueRoles = ['team_leader', 'technical_lead', 'project_manager'];
    
    return predefinedRoles.filter(role => {
      if (role.value === 'custom') return true;
      if (uniqueRoles.includes(role.value) && assignedRoles.includes(role.value)) {
        return false; // Don't allow duplicate unique roles
      }
      return true;
    });
  };

  // Smart effects for role suggestions
  useEffect(() => {
    if (selectedMember) {
      const member = teamMembers.find(m => m.enrollment_no === selectedMember);
      if (member) {
        const suggestions = getSmartRoleSuggestions(member);
        setRoleSuggestions(suggestions);
        
        // Auto-advance to step 2 when member is selected
        if (currentStep === 1) {
          setTimeout(() => setCurrentStep(2), 300);
        }
      }
    }
  }, [selectedMember, teamMembers, currentStep]);

  // Auto-show preview when role is selected
  useEffect(() => {
    if (selectedMember && selectedRole) {
      setShowPreview(true);
      // Auto-advance to step 3 for final details
      if (currentStep === 2) {
        setTimeout(() => setCurrentStep(3), 300);
      }
    }
  }, [selectedMember, selectedRole, currentStep]);

  // Smart role customization
  useEffect(() => {
    setShowRoleCustomization(selectedRole === 'custom' || (selectedRole && roleDescription !== ''));
  }, [selectedRole, roleDescription]);

  // Get current role for a member
  const getCurrentRole = (enrollment_no) => {
    const memberRole = currentRoles.find(role => role.enrollment_no === enrollment_no);
    return memberRole ? memberRole.assigned_role : 'No role assigned';
  };

  // Filter members based on search term
  const filteredMembers = teamMembers.filter(member => {
    if (!member || !member.name || !member.enrollment_no) return false;
    
    const memberName = (member.name || '').toLowerCase();
    const memberEnrollment = (member.enrollment_no || '').toLowerCase();
    const searchLower = (searchTerm || '').toLowerCase();
    
    return memberName.includes(searchLower) || memberEnrollment.includes(searchLower);
  });

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
    
    // Smart role pre-selection based on member analysis
    const suggestions = getSmartRoleSuggestions(member);
    if (suggestions.length > 0) {
      // Auto-suggest the first role if it's highly relevant
      const topSuggestion = suggestions[0];
      const roleData = predefinedRoles.find(role => role.value === topSuggestion);
      if (roleData) {
        setRoleDescription(roleData.description);
      }
    }
  };

  const handleRoleSelect = (roleValue) => {
    setSelectedRole(roleValue);
    const roleData = predefinedRoles.find(role => role.value === roleValue);
    
    if (roleData && roleValue !== 'custom') {
      setRoleDescription(roleData.description);
    }
    
    if (roleValue === 'custom') {
      setCustomRoleName('');
      setRoleDescription('');
    }
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
      // Prepare role data according to backend RoleAssignmentData model
      const roleData = {
        member_enrollment: selectedMember,
        role: selectedRole === 'custom' ? customRoleName.trim() : selectedRole,
        permissions: [], // Can be extended later for specific permissions
        description: roleDescription.trim() || (selectedRoleData ? selectedRoleData.description : '')
      };

      console.log('🔧 Assigning role with data:', roleData);
      console.log('🔧 Event ID:', eventId);
      console.log('🔧 Team ID:', teamId);

      // Use clientAPI from client.js
      const response = await clientAPI.assignRole(eventId, roleData);

      console.log('✅ Role assignment response:', response);

      if (response.data && response.data.success) {
        console.log('✅ Role assigned successfully:', response.data.message);
        
        // Refresh current roles to show the update
        try {
          const rolesResponse = await clientAPI.getTeamRoles(eventId);
          if (rolesResponse.data && rolesResponse.data.success) {
            setCurrentRoles(rolesResponse.data.roles || []);
          }
        } catch (rolesError) {
          console.warn('⚠️ Could not refresh roles after assignment:', rolesError);
        }

        // Clear form
        setSelectedMember('');
        setSelectedRole('');
        setCustomRoleName('');
        setRoleDescription('');
        setSearchTerm('');
        
        // Success - call onSuccess callback
        onSuccess();
      } else {
        console.error('❌ Role assignment failed:', response.data);
        setError(response.data?.message || 'Failed to assign role');
      }
    } catch (error) {
      console.error('❌ Error assigning role:', error);
      
      // Handle different types of errors
      if (error.response) {
        // HTTP error response
        console.error('❌ HTTP Error Response:', error.response.data);
        const errorMessage = error.response.data?.detail || 
                           error.response.data?.message || 
                           `Server error: ${error.response.status}`;
        setError(errorMessage);
      } else if (error.request) {
        // Network error
        console.error('❌ Network Error:', error.request);
        setError('Network error occurred. Please check your connection.');
      } else {
        // Other error
        console.error('❌ Unknown Error:', error.message);
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const selectedRoleData = predefinedRoles.find(role => role.value === selectedRole);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div ref={modalRef} className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Smart Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold mb-2">Smart Role Assignment</h2>
              <p className="text-purple-100">
                {currentStep === 1 && "Select a team member to assign a role"}
                {currentStep === 2 && "Choose the perfect role with smart suggestions"}
                {currentStep === 3 && "Customize and finalize the assignment"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-purple-200 transition-colors"
              disabled={isLoading}
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
          
          {/* Progress Indicator */}
          <div className="mt-4 flex items-center space-x-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  step <= currentStep ? 'bg-white text-purple-600' : 'bg-purple-500 text-purple-200'
                }`}>
                  {step < currentStep ? <i className="fas fa-check"></i> : step}
                </div>
                {step < 3 && (
                  <div className={`w-8 h-0.5 transition-all ${
                    step < currentStep ? 'bg-white' : 'bg-purple-500'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Smart Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 mb-6">
              <i className="fas fa-exclamation-circle text-red-600"></i>
              <span className="text-red-800">{error}</span>
            </div>
          )}

          {/* Current Role Assignments Overview */}
          {!isLoadingRoles && currentRoles.length > 0 && currentStep === 1 && (
            <div className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
              <h4 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                <i className="fas fa-users text-blue-600"></i>
                Current Team Structure ({currentRoles.length} assigned)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentRoles.slice(0, 4).map((member) => (
                  <div key={member.enrollment_no} className="bg-white rounded-lg p-3 border border-blue-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        member.is_leader ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        <i className={`fas ${member.is_leader ? 'fa-crown' : 'fa-user'} text-sm`}></i>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">{member.name}</p>
                        <p className="text-xs text-blue-600 font-medium">{member.assigned_role}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {currentRoles.length > 4 && (
                  <div className="bg-blue-100 rounded-lg p-3 flex items-center justify-center">
                    <span className="text-blue-600 font-medium">+{currentRoles.length - 4} more</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 1: Member Selection */}
          {currentStep >= 1 && (
            <div className={`space-y-6 transition-all duration-300 ${currentStep === 1 ? 'opacity-100' : 'opacity-75'}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-user-plus text-purple-600"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Who needs a role assignment?</h3>
              </div>

              {/* Smart Member Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-700">
                  Select Team Member *
                </label>
                
                {/* Search Input */}
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
                    autoFocus={currentStep === 1}
                  />
                  <div className="absolute right-3 top-3">
                    <i className="fas fa-search text-gray-400"></i>
                  </div>

                  {/* Enhanced Dropdown */}
                  {showMemberDropdown && filteredMembers.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                      {filteredMembers.map((member) => {
                        const currentRole = getCurrentRole(member.enrollment_no);
                        const hasRole = currentRole !== 'No role assigned';
                        
                        return (
                          <button
                            key={member.enrollment_no}
                            type="button"
                            onClick={() => handleMemberSelect(member)}
                            className="w-full px-4 py-4 text-left hover:bg-purple-50 flex items-center gap-4 border-b border-gray-100 last:border-b-0 transition-colors"
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              member.isLeader ? 'bg-yellow-100 text-yellow-600' : 
                              hasRole ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'
                            }`}>
                              <i className={`fas ${
                                member.isLeader ? 'fa-crown' : 
                                hasRole ? 'fa-check-circle' : 'fa-user'
                              } text-sm`}></i>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{member.name}</p>
                              <p className="text-sm text-gray-600">{member.enrollment_no}</p>
                              {!isLoadingRoles && (
                                <p className={`text-xs font-medium ${
                                  hasRole ? 'text-green-600' : 'text-gray-500'
                                }`}>
                                  {hasRole ? `Current: ${currentRole}` : 'No role assigned'}
                                </p>
                              )}
                            </div>
                            <div className="text-purple-400">
                              <i className="fas fa-arrow-right"></i>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {showMemberDropdown && filteredMembers.length === 0 && searchTerm && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg p-4 text-center text-gray-500">
                      No members found matching "{searchTerm}"
                    </div>
                  )}
                </div>

                {/* Quick Select Options */}
                {!selectedMember && teamMembers.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-3">💡 Quick select:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {teamMembers.filter(member => getCurrentRole(member.enrollment_no) === 'No role assigned').slice(0, 4).map((member) => (
                        <button
                          key={member.enrollment_no}
                          type="button"
                          onClick={() => handleMemberSelect(member)}
                          className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-purple-50 rounded-lg text-left transition-colors"
                        >
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <i className="fas fa-user text-purple-600 text-sm"></i>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{member.name}</p>
                            <p className="text-xs text-gray-600">Unassigned</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Smart Role Selection */}
          {currentStep >= 2 && selectedMember && (
            <div className={`space-y-6 transition-all duration-300 ${
              currentStep === 2 ? 'opacity-100 mt-8' : 'opacity-75 mt-4'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-star text-blue-600"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">What role fits best?</h3>
              </div>

              {/* Smart Role Suggestions */}
              {roleSuggestions.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-3">🎯 Smart suggestions for {teamMembers.find(m => m.enrollment_no === selectedMember)?.name}:</p>
                  <div className="flex flex-wrap gap-2">
                    {roleSuggestions.slice(0, 3).map((roleValue) => {
                      const role = predefinedRoles.find(r => r.value === roleValue);
                      if (!role) return null;
                      
                      return (
                        <button
                          key={roleValue}
                          type="button"
                          onClick={() => handleRoleSelect(roleValue)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all hover:scale-105 ${
                            selectedRole === roleValue 
                              ? role.color + ' border-current' 
                              : 'bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-300'
                          }`}
                        >
                          <i className={role.icon + ' text-sm'}></i>
                          <span className="font-medium">{role.label}</span>
                          <i className="fas fa-magic text-xs"></i>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* All Available Roles */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-700">
                  Available Roles *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getAvailableRoles().map((role) => {
                    const isRecommended = roleSuggestions.includes(role.value);
                    const isSelected = selectedRole === role.value;
                    
                    return (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => handleRoleSelect(role.value)}
                        className={`relative p-4 border-2 rounded-xl text-left transition-all hover:scale-105 ${
                          isSelected 
                            ? role.color + ' border-current shadow-lg' 
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                        }`}
                      >
                        {isRecommended && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 text-yellow-900 rounded-full flex items-center justify-center">
                            <i className="fas fa-star text-xs"></i>
                          </div>
                        )}
                        
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isSelected ? 'bg-white shadow-sm' : role.color.replace('border-', 'border-2 border-')
                          }`}>
                            <i className={`${role.icon} text-lg`}></i>
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-gray-900">{role.label}</h4>
                              {isRecommended && (
                                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">
                                  Recommended
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{role.description}</p>
                            
                            <div className="space-y-2">
                              <div>
                                <p className="text-xs font-medium text-gray-700 mb-1">Key Skills:</p>
                                <div className="flex flex-wrap gap-1">
                                  {role.skills.slice(0, 3).map((skill, index) => (
                                    <span key={index} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Customization & Details */}
          {currentStep >= 3 && selectedRole && (
            <div className={`space-y-6 transition-all duration-300 ${
              currentStep === 3 ? 'opacity-100 mt-8' : 'opacity-75 mt-4'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-cog text-green-600"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Customize the role details</h3>
              </div>

              {/* Custom Role Name (if custom role selected) */}
              {selectedRole === 'custom' && (
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700">
                    Custom Role Name *
                  </label>
                  <input
                    type="text"
                    value={customRoleName}
                    onChange={(e) => setCustomRoleName(e.target.value)}
                    placeholder="e.g., Content Writer, Marketing Lead, etc."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Role Description Customization */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-700">
                  Role Description {selectedRole !== 'custom' && '(Optional)'}
                </label>
                <textarea
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  placeholder={selectedRole === 'custom' ? "Describe the responsibilities and expectations..." : "Customize the role description or keep the default..."}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                
                {selectedRole !== 'custom' && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <i className="fas fa-lightbulb text-yellow-500"></i>
                    <span>Leave empty to use the default description, or customize it to your needs</span>
                  </div>
                )}
              </div>

              {/* Role Responsibilities Preview */}
              {selectedRole !== 'custom' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h5 className="font-semibold text-blue-800 mb-3">Default Responsibilities:</h5>
                  <div className="space-y-2">
                    {predefinedRoles.find(r => r.value === selectedRole)?.responsibilities.map((responsibility, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-blue-700">
                        <i className="fas fa-check-circle text-blue-600"></i>
                        <span>{responsibility}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Smart Preview */}
          {showPreview && selectedMember && selectedRole && (
            <div className="mt-8 bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6">
              <h4 className="font-bold text-purple-900 mb-4 flex items-center gap-2">
                <i className="fas fa-eye text-purple-600"></i>
                Assignment Preview
              </h4>
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center">
                  <i className={`${predefinedRoles.find(r => r.value === selectedRole)?.icon || 'fas fa-user'} text-2xl text-purple-600`}></i>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h5 className="text-lg font-bold text-purple-900">
                      {teamMembers.find(m => m.enrollment_no === selectedMember)?.name}
                    </h5>
                    <span className="px-3 py-1 bg-white rounded-full text-sm font-medium text-purple-700 border border-purple-200">
                      {selectedRole === 'custom' ? customRoleName : predefinedRoles.find(r => r.value === selectedRole)?.label}
                    </span>
                  </div>
                  <p className="text-purple-800 mb-3">
                    {roleDescription || predefinedRoles.find(r => r.value === selectedRole)?.description}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-purple-700">
                    <div className="flex items-center gap-1">
                      <i className="fas fa-user"></i>
                      <span>{teamMembers.find(m => m.enrollment_no === selectedMember)?.enrollment_no}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <i className="fas fa-calendar"></i>
                      <span>Assigned today</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Smart Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
          <div className="flex gap-3">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev - 1)}
                disabled={isLoading}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Back
              </button>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev + 1)}
                disabled={!selectedMember || (currentStep === 2 && !selectedRole)}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <i className="fas fa-arrow-right ml-2"></i>
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isLoading || !selectedMember || !selectedRole || (selectedRole === 'custom' && !customRoleName.trim())}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading && <i className="fas fa-spinner fa-spin"></i>}
                {isLoading ? 'Assigning...' : 'Assign Role'}
                <i className="fas fa-check ml-1"></i>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleAssignmentModal;
