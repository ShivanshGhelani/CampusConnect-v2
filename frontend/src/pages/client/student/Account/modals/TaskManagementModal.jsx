import React, { useState, useEffect, useRef } from 'react';

const TaskManagementModal = ({ eventId, teamId, teamMembers, onClose, onSuccess }) => {
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'medium',
    status: 'todo',
    due_date: '',
    estimated_hours: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const assigneeInputRef = useRef(null);
  const modalRef = useRef(null);

  // Priority options
  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'text-green-600 bg-green-50 border-green-200', icon: 'fas fa-arrow-down' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: 'fas fa-minus' },
    { value: 'high', label: 'High', color: 'text-orange-600 bg-orange-50 border-orange-200', icon: 'fas fa-arrow-up' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-600 bg-red-50 border-red-200', icon: 'fas fa-exclamation' }
  ];

  // Status options
  const statusOptions = [
    { value: 'todo', label: 'To Do', color: 'text-gray-600 bg-gray-50 border-gray-200', icon: 'fas fa-circle' },
    { value: 'in_progress', label: 'In Progress', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: 'fas fa-play' },
    { value: 'review', label: 'In Review', color: 'text-purple-600 bg-purple-50 border-purple-200', icon: 'fas fa-eye' },
    { value: 'completed', label: 'Completed', color: 'text-green-600 bg-green-50 border-green-200', icon: 'fas fa-check' }
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
      if (assigneeInputRef.current && !assigneeInputRef.current.contains(event.target)) {
        setShowAssigneeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutsideDropdown);
    return () => document.removeEventListener('mousedown', handleClickOutsideDropdown);
  }, []);

  const handleAssigneeSelect = (member) => {
    setTaskData(prev => ({ ...prev, assigned_to: member.enrollment_no }));
    setSearchTerm(member.name);
    setShowAssigneeDropdown(false);
  };

  const handleInputChange = (field, value) => {
    setTaskData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!taskData.title.trim()) {
      setError('Task title is required');
      return;
    }

    if (!taskData.assigned_to) {
      setError('Please assign the task to a team member');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/client/registration/enhanced/create-task/${eventId}/${teamId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: taskData.title.trim(),
          description: taskData.description.trim() || undefined,
          assigned_to: taskData.assigned_to,
          priority: taskData.priority,
          status: taskData.status,
          due_date: taskData.due_date || undefined,
          estimated_hours: taskData.estimated_hours ? parseInt(taskData.estimated_hours) : undefined
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onSuccess();
      } else {
        setError(data.message || 'Failed to create task');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      setError('Network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPriority = priorityOptions.find(p => p.value === taskData.priority);
  const selectedStatus = statusOptions.find(s => s.value === taskData.status);
  const selectedAssignee = teamMembers.find(m => m.enrollment_no === taskData.assigned_to);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div ref={modalRef} className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold mb-2">Create New Task</h2>
              <p className="text-blue-100">Assign tasks to team members with detailed tracking</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200 transition-colors"
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

            {/* Task Title */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Task Title *
              </label>
              <input
                type="text"
                value={taskData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter task title..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Task Description */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Task Description
              </label>
              <textarea
                value={taskData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe the task in detail..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Assignee Selection with Autocomplete */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Assign To *
              </label>
              <div className="relative" ref={assigneeInputRef}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowAssigneeDropdown(true);
                    setTaskData(prev => ({ ...prev, assigned_to: '' }));
                  }}
                  onFocus={() => setShowAssigneeDropdown(true)}
                  placeholder="Search team member..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <div className="absolute right-3 top-3">
                  <i className="fas fa-user-plus text-gray-400"></i>
                </div>

                {/* Dropdown */}
                {showAssigneeDropdown && filteredMembers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredMembers.map((member) => (
                      <button
                        key={member.enrollment_no}
                        type="button"
                        onClick={() => handleAssigneeSelect(member)}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center gap-3 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <i className="fas fa-user text-blue-600 text-sm"></i>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{member.name}</p>
                          <p className="text-sm text-gray-600">{member.enrollment_no}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {showAssigneeDropdown && filteredMembers.length === 0 && searchTerm && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500">
                    No members found matching "{searchTerm}"
                  </div>
                )}
              </div>
            </div>

            {/* Priority and Status Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Priority Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Priority
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {priorityOptions.map((priority) => (
                    <button
                      key={priority.value}
                      type="button"
                      onClick={() => handleInputChange('priority', priority.value)}
                      className={`p-3 border-2 rounded-lg text-left transition-all ${
                        taskData.priority === priority.value
                          ? priority.color + ' border-current'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <i className={priority.icon}></i>
                        <span className="font-medium">{priority.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Initial Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {statusOptions.map((status) => (
                    <button
                      key={status.value}
                      type="button"
                      onClick={() => handleInputChange('status', status.value)}
                      className={`p-3 border-2 rounded-lg text-left transition-all ${
                        taskData.status === status.value
                          ? status.color + ' border-current'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <i className={status.icon}></i>
                        <span className="font-medium text-sm">{status.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Due Date and Estimated Hours */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Due Date
                </label>
                <input
                  type="date"
                  value={taskData.due_date}
                  onChange={(e) => handleInputChange('due_date', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Estimated Hours
                </label>
                <input
                  type="number"
                  value={taskData.estimated_hours}
                  onChange={(e) => handleInputChange('estimated_hours', e.target.value)}
                  placeholder="Hours needed"
                  min="1"
                  max="999"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Task Preview */}
            {taskData.title && selectedAssignee && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-3">Task Preview</h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <i className="fas fa-tasks text-blue-600 mt-1"></i>
                    <div>
                      <p className="font-medium text-blue-900">{taskData.title}</p>
                      {taskData.description && (
                        <p className="text-sm text-blue-700 mt-1">{taskData.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <i className="fas fa-user text-blue-600"></i>
                      <span className="text-blue-900">{selectedAssignee.name}</span>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${selectedPriority?.color}`}>
                      <i className={selectedPriority?.icon}></i>
                      <span>{selectedPriority?.label}</span>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${selectedStatus?.color}`}>
                      <i className={selectedStatus?.icon}></i>
                      <span>{selectedStatus?.label}</span>
                    </div>
                  </div>

                  {(taskData.due_date || taskData.estimated_hours) && (
                    <div className="flex items-center gap-4 text-sm text-blue-700">
                      {taskData.due_date && (
                        <div className="flex items-center gap-1">
                          <i className="fas fa-calendar"></i>
                          <span>Due: {new Date(taskData.due_date).toLocaleDateString()}</span>
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
            disabled={isLoading || !taskData.title.trim() || !taskData.assigned_to}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading && <i className="fas fa-spinner fa-spin"></i>}
            {isLoading ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskManagementModal;
