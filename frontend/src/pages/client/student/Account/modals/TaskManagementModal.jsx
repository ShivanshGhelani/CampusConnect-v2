import React, { useState, useEffect, useRef } from 'react';
import { clientAPI } from '../../../../../api/client';

const TaskManagementModal = ({ eventId, teamId, teamMembers = [], onClose, onSuccess }) => {
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    assigned_to: [], // Backend expects List[str] - array of enrollment numbers
    priority: 'medium',
    category: 'general',
    deadline: '', // Will be converted to datetime for backend
    estimated_hours: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const assigneeInputRef = useRef(null);
  const modalRef = useRef(null);

  // Smart suggestions based on category
  const getTaskSuggestions = (category) => {
    const suggestionMap = {
      development: [
        'Setup project repository',
        'Code review session',
        'Unit testing implementation',
        'API integration',
        'Database schema design',
        'Frontend component development'
      ],
      design: [
        'Create wireframes',
        'Design system setup',
        'User interface mockups',
        'Logo design',
        'Brand guidelines',
        'User experience research'
      ],
      research: [
        'Market analysis',
        'Competitive research',
        'User surveys',
        'Technology evaluation',
        'Literature review',
        'Feasibility study'
      ],
      presentation: [
        'Slide deck creation',
        'Demo preparation',
        'Practice session',
        'Content outline',
        'Visual aids design',
        'Q&A preparation'
      ],
      documentation: [
        'Technical documentation',
        'User manual creation',
        'API documentation',
        'Project report',
        'Meeting minutes',
        'Process documentation'
      ],
      general: [
        'Team meeting',
        'Progress review',
        'Planning session',
        'Status update',
        'Quality assurance',
        'Final testing'
      ]
    };
    return suggestionMap[category] || [];
  };

  // Smart priority suggestions based on deadline
  const getSuggestedPriority = (deadline) => {
    if (!deadline) return 'medium';
    
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const daysUntilDeadline = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDeadline <= 1) return 'high';
    if (daysUntilDeadline <= 3) return 'medium';
    return 'low';
  };

  // Smart assignee suggestions based on category
  const getSuggestedAssignees = (category) => {
    // This could be enhanced with actual role data in the future
    const suggestions = [];
    
    switch (category) {
      case 'development':
        suggestions.push('Consider assigning to members with technical skills');
        break;
      case 'design':
        suggestions.push('Best assigned to creative team members');
        break;
      case 'research':
        suggestions.push('Ideal for analytical team members');
        break;
      case 'presentation':
        suggestions.push('Great for confident speakers');
        break;
      default:
        suggestions.push('Can be assigned to any team member');
    }
    
    return suggestions;
  };

  // Priority options (matching backend: low, medium, high)
  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'text-green-600 bg-green-50 border-green-200', icon: 'fas fa-arrow-down' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: 'fas fa-minus' },
    { value: 'high', label: 'High', color: 'text-red-600 bg-red-50 border-red-200', icon: 'fas fa-arrow-up' }
  ];

  // Category options (backend supports categories)
  const categoryOptions = [
    { value: 'general', label: 'General', icon: 'fas fa-tasks' },
    { value: 'development', label: 'Development', icon: 'fas fa-code' },
    { value: 'design', label: 'Design', icon: 'fas fa-palette' },
    { value: 'research', label: 'Research', icon: 'fas fa-search' },
    { value: 'presentation', label: 'Presentation', icon: 'fas fa-presentation' },
    { value: 'documentation', label: 'Documentation', icon: 'fas fa-file-alt' }
  ];

  // Smart effects - update suggestions when category changes
  useEffect(() => {
    setSuggestions(getTaskSuggestions(taskData.category));
  }, [taskData.category]);

  // Smart priority suggestion when deadline changes
  useEffect(() => {
    if (taskData.deadline) {
      const suggestedPriority = getSuggestedPriority(taskData.deadline);
      if (suggestedPriority !== taskData.priority) {
        // Show suggestion but don't auto-change
        setError('');
      }
    }
  }, [taskData.deadline]);

  // Auto-advance steps based on completion
  useEffect(() => {
    if (currentStep === 1 && taskData.title.trim()) {
      // Auto advance to step 2 when title is filled
      setTimeout(() => setCurrentStep(2), 300);
    }
    if (currentStep === 2 && taskData.category && taskData.assigned_to.length > 0) {
      // Show preview when basic info is complete
      setShowPreview(true);
    }
  }, [taskData.title, taskData.category, taskData.assigned_to, currentStep]);

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
      if (assigneeInputRef.current && !assigneeInputRef.current.contains(event.target)) {
        setShowAssigneeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutsideDropdown);
    return () => document.removeEventListener('mousedown', handleClickOutsideDropdown);
  }, []);

  const handleAssigneeSelect = (member) => {
    // Support multiple assignees - toggle selection
    setTaskData(prev => {
      const currentAssignees = prev.assigned_to || [];
      const memberEnrollment = member.enrollment_no;
      
      if (currentAssignees.includes(memberEnrollment)) {
        // Remove if already selected
        return {
          ...prev,
          assigned_to: currentAssignees.filter(e => e !== memberEnrollment)
        };
      } else {
        // Add to selection
        return {
          ...prev,
          assigned_to: [...currentAssignees, memberEnrollment]
        };
      }
    });
    setShowAssigneeDropdown(false);
  };

  const handleInputChange = (field, value) => {
    setTaskData(prev => ({ ...prev, [field]: value }));
    
    // Smart suggestions and auto-updates
    if (field === 'deadline' && value) {
      const suggestedPriority = getSuggestedPriority(value);
      if (suggestedPriority !== taskData.priority) {
        // Don't auto-change, but could show suggestion
        
      }
    }
    
    if (field === 'category') {
      setSuggestions(getTaskSuggestions(value));
    }
  };

  // Smart title suggestions
  const handleTitleSuggestion = (suggestion) => {
    setTaskData(prev => ({ ...prev, title: suggestion }));
    setCurrentStep(2);
  };

  // Smart assignee suggestions
  const getRecommendedAssignees = () => {
    // This could be enhanced with actual skill/role data
    return teamMembers.slice(0, Math.min(3, teamMembers.length));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!taskData.title.trim()) {
      setError('Task title is required');
      return;
    }

    if (!taskData.assigned_to || taskData.assigned_to.length === 0) {
      setError('Please assign the task to at least one team member');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Prepare task data for backend (matching TaskData model)
      const taskDataForBackend = {
        title: taskData.title.trim(),
        description: taskData.description.trim() || "",
        priority: taskData.priority,
        assigned_to: taskData.assigned_to, // Array of enrollment numbers
        category: taskData.category || 'general',
        deadline: taskData.deadline ? new Date(taskData.deadline).toISOString() : null
      };

      
      

      // Use clientAPI from client.js
      const response = await clientAPI.createTask(eventId, taskDataForBackend);

      

      if (response.data && response.data.success) {
        
        
        // Clear form
        setTaskData({
          title: '',
          description: '',
          assigned_to: [],
          priority: 'medium',
          category: 'general',
          deadline: '',
          estimated_hours: ''
        });
        setSearchTerm('');
        
        // Success callback
        onSuccess();
      } else {
        
        setError(response.data?.message || 'Failed to create task');
      }
    } catch (error) {
      
      
      // Handle different types of errors
      if (error.response) {
        // HTTP error response
        
        const errorMessage = error.response.data?.detail || 
                           error.response.data?.message || 
                           `Server error: ${error.response.status}`;
        setError(errorMessage);
      } else if (error.request) {
        // Network error
        
        setError('Network error occurred. Please check your connection.');
      } else {
        // Other error
        
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPriority = priorityOptions.find(p => p.value === taskData.priority);
  const selectedCategory = categoryOptions.find(c => c.value === taskData.category);
  const selectedAssignees = teamMembers.filter(m => taskData.assigned_to.includes(m.enrollment_no));

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div ref={modalRef} className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Smart Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold mb-2">Create Smart Task</h2>
              <p className="text-blue-100">
                {currentStep === 1 && "Let's start with the basics"}
                {currentStep === 2 && "Now let's assign and prioritize"}
                {currentStep === 3 && "Final details and timeline"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200 transition-colors"
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
                  step <= currentStep ? 'bg-white text-blue-600' : 'bg-blue-500 text-blue-200'
                }`}>
                  {step < currentStep ? <i className="fas fa-check"></i> : step}
                </div>
                {step < 3 && (
                  <div className={`w-8 h-0.5 transition-all ${
                    step < currentStep ? 'bg-white' : 'bg-blue-500'
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

          {/* Step 1: Task Basics */}
          {currentStep >= 1 && (
            <div className={`space-y-6 transition-all duration-300 ${currentStep === 1 ? 'opacity-100' : 'opacity-75'}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-pencil-alt text-blue-600"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">What needs to be done?</h3>
              </div>

              {/* Smart Task Title */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-700">
                  Task Title *
                </label>
                <input
                  type="text"
                  value={taskData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="e.g., Create user interface mockups"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  autoFocus={currentStep === 1}
                />
                
                {/* Smart suggestions based on category */}
                {suggestions.length > 0 && !taskData.title && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600 mb-2">💡 Popular {taskData.category} tasks:</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.slice(0, 3).map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleTitleSuggestion(suggestion)}
                          className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Smart Category Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-700">
                  What type of task is this?
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {categoryOptions.map((category) => (
                    <button
                      key={category.value}
                      type="button"
                      onClick={() => handleInputChange('category', category.value)}
                      className={`p-4 border-2 rounded-xl text-left transition-all hover:scale-105 ${
                        taskData.category === category.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <i className={`${category.icon} text-lg`}></i>
                        <span className="font-medium">{category.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
                
                {/* Smart description suggestions */}
                {taskData.category && taskData.category !== 'general' && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      💡 {getSuggestedAssignees(taskData.category)[0]}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Assignment & Priority */}
          {currentStep >= 2 && (
            <div className={`space-y-6 transition-all duration-300 ${
              currentStep === 2 ? 'opacity-100 mt-8' : 'opacity-75 mt-4'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-users text-purple-600"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Who should work on this?</h3>
              </div>

              {/* Smart Team Member Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-700">
                  Assign to team members * {taskData.assigned_to.length > 0 && `(${taskData.assigned_to.length} selected)`}
                </label>

                {/* Quick assign recommendations */}
                {taskData.assigned_to.length === 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">💡 Quick assign:</p>
                    <div className="flex flex-wrap gap-2">
                      {getRecommendedAssignees().map((member) => (
                        <button
                          key={member.enrollment_no}
                          type="button"
                          onClick={() => handleAssigneeSelect(member)}
                          className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-blue-50 rounded-lg text-sm transition-colors"
                        >
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                            <i className="fas fa-user text-blue-600 text-xs"></i>
                          </div>
                          <span>{member.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected Assignees */}
                {taskData.assigned_to.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {teamMembers.filter(m => taskData.assigned_to.includes(m.enrollment_no)).map((member) => (
                      <div key={member.enrollment_no} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                        <span>{member.name}</span>
                        <button
                          type="button"
                          onClick={() => handleAssigneeSelect(member)}
                          className="text-blue-600 hover:text-blue-800 ml-1"
                        >
                          <i className="fas fa-times text-xs"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* All Team Members Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                  {teamMembers.map((member) => {
                    const isSelected = taskData.assigned_to.includes(member.enrollment_no);
                    return (
                      <button
                        key={member.enrollment_no}
                        type="button"
                        onClick={() => handleAssigneeSelect(member)}
                        className={`p-3 border-2 rounded-lg text-left transition-all hover:scale-105 ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                          }`}>
                            <i className={`fas ${isSelected ? 'fa-check' : 'fa-user'} text-sm`}></i>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{member.name}</p>
                            <p className="text-sm text-gray-600">{member.enrollment_no}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Smart Priority Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-700">
                  How urgent is this task?
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {priorityOptions.map((priority) => (
                    <button
                      key={priority.value}
                      type="button"
                      onClick={() => handleInputChange('priority', priority.value)}
                      className={`p-4 border-2 rounded-xl text-center transition-all hover:scale-105 ${
                        taskData.priority === priority.value
                          ? priority.color + ' border-current'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <i className={`${priority.icon} text-xl`}></i>
                        <span className="font-medium">{priority.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Details & Timeline */}
          {currentStep >= 3 && (
            <div className={`space-y-6 transition-all duration-300 ${
              currentStep === 3 ? 'opacity-100 mt-8' : 'opacity-75 mt-4'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-calendar-alt text-green-600"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">When should this be completed?</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700">
                    Deadline (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={taskData.deadline}
                    onChange={(e) => handleInputChange('deadline', e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700">
                    Estimated Hours (Optional)
                  </label>
                  <input
                    type="number"
                    value={taskData.estimated_hours}
                    onChange={(e) => handleInputChange('estimated_hours', e.target.value)}
                    placeholder="How many hours?"
                    min="1"
                    max="999"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Smart Description */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-700">
                  Task Description (Optional)
                </label>
                <textarea
                  value={taskData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Add more details about what needs to be done..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Smart Preview */}
          {showPreview && taskData.title && taskData.assigned_to.length > 0 && (
            <div className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
              <h4 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                <i className="fas fa-eye text-blue-600"></i>
                Task Preview
              </h4>
              <div className="space-y-4">
                <div>
                  <p className="font-semibold text-blue-900 text-lg">{taskData.title}</p>
                  {taskData.description && (
                    <p className="text-blue-700 mt-2">{taskData.description}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-users text-blue-600"></i>
                    <span className="text-blue-900 font-medium">
                      {teamMembers.filter(m => taskData.assigned_to.includes(m.enrollment_no)).map(a => a.name).join(', ')}
                    </span>
                  </div>
                  
                  <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                    priorityOptions.find(p => p.value === taskData.priority)?.color
                  }`}>
                    <i className={priorityOptions.find(p => p.value === taskData.priority)?.icon}></i>
                    <span className="font-medium">{priorityOptions.find(p => p.value === taskData.priority)?.label}</span>
                  </div>
                  
                  <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-purple-100 text-purple-700">
                    <i className={categoryOptions.find(c => c.value === taskData.category)?.icon}></i>
                    <span className="font-medium">{categoryOptions.find(c => c.value === taskData.category)?.label}</span>
                  </div>
                </div>

                {(taskData.deadline || taskData.estimated_hours) && (
                  <div className="flex items-center gap-4 text-sm text-blue-700">
                    {taskData.deadline && (
                      <div className="flex items-center gap-1">
                        <i className="fas fa-calendar"></i>
                        <span>Due: {new Date(taskData.deadline).toLocaleString()}</span>
                      </div>
                    )}
                    {taskData.estimated_hours && (
                      <div className="flex items-center gap-1">
                        <i className="fas fa-clock"></i>
                        <span>{taskData.estimated_hours}h estimated</span>
                      </div>
                    )}
                  </div>
                )}
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
                disabled={!taskData.title.trim() || (currentStep === 2 && taskData.assigned_to.length === 0)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <i className="fas fa-arrow-right ml-2"></i>
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isLoading || !taskData.title.trim() || taskData.assigned_to.length === 0}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading && <i className="fas fa-spinner fa-spin"></i>}
                {isLoading ? 'Creating...' : 'Create Task'}
                <i className="fas fa-check ml-1"></i>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskManagementModal;
