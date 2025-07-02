import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { adminAPI } from '../../api/axios';
import AdminLayout from '../../components/admin/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';

function ManageAdmin() {
  const [admins, setAdmins] = useState([]);
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [deleteAdminData, setDeleteAdminData] = useState({ id: '', name: '' });

  // Form data for creating new admin
  const [newAdminForm, setNewAdminForm] = useState({
    fullname: '',
    username: '',
    email: '',
    password: '',
    role: '',
    is_active: true,
    assigned_events: []
  });

  // Form data for editing admin
  const [editAdminForm, setEditAdminForm] = useState({
    username: '',
    fullname: '',
    role: '',
    is_active: true,
    assigned_events: []
  });

  // Dropdown states
  const [isEventsDropdownOpen, setIsEventsDropdownOpen] = useState(false);
  const [isEditEventsDropdownOpen, setIsEditEventsDropdownOpen] = useState(false);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close create events dropdown
      if (isEventsDropdownOpen && !event.target.closest('#eventsDropdown')) {
        setIsEventsDropdownOpen(false);
      }
      // Close edit events dropdown
      if (isEditEventsDropdownOpen && !event.target.closest('#editEventsDropdown')) {
        setIsEditEventsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEventsDropdownOpen, isEditEventsDropdownOpen]);

  // Add/remove modal backdrop blur class
  useEffect(() => {
    const isModalOpen = isEditModalOpen || isDeleteModalOpen;
    
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      console.log('Modal opened, body overflow hidden');
    } else {
      document.body.style.overflow = 'unset';
      console.log('Modal closed, body overflow restored');
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isEditModalOpen, isDeleteModalOpen]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching admin data...');
      const [adminsResponse, eventsResponse] = await Promise.all([
        adminAPI.getAdminUsers(),
        adminAPI.getEvents()
      ]);

      console.log('Admins response:', adminsResponse.data);
      console.log('Events response:', eventsResponse.data);

      if (adminsResponse.data.success) {
        setAdmins(adminsResponse.data.users || []); // Note: API returns 'users' not 'admins'
        console.log('Set admins:', adminsResponse.data.users);
      }

      if (eventsResponse.data.success) {
        setEvents(eventsResponse.data.events || []);
      }

      setError('');
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load admin data');
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    if (type === 'success') {
      setSuccessMessage(message);
      setError('');
    } else {
      setError(message);
      setSuccessMessage('');
    }

    // Auto clear after 5 seconds
    setTimeout(() => {
      setSuccessMessage('');
      setError('');
    }, 5000);
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    
    try {
      const response = await adminAPI.createAdminUser(newAdminForm);
      
      if (response.data.success) {
        showNotification('Admin created successfully!', 'success');
        setNewAdminForm({
          fullname: '',
          username: '',
          email: '',
          password: '',
          role: '',
          is_active: true,
          assigned_events: []
        });
        fetchData(); // Refresh the list
      } else {
        throw new Error(response.data.message || 'Failed to create admin');
      }
    } catch (error) {
      console.error('Error creating admin:', error);
      showNotification(error.response?.data?.message || 'Failed to create admin', 'error');
    }
  };

  const handleEditAdmin = async (e) => {
    e.preventDefault();
    
    try {
      const response = await adminAPI.updateAdminUser(editAdminForm.username, editAdminForm);
      
      if (response.data.success) {
        showNotification('Admin updated successfully!', 'success');
        setIsEditModalOpen(false);
        fetchData(); // Refresh the list
      } else {
        throw new Error(response.data.message || 'Failed to update admin');
      }
    } catch (error) {
      console.error('Error updating admin:', error);
      showNotification(error.response?.data?.message || 'Failed to update admin', 'error');
    }
  };

  const handleDeleteAdmin = async () => {
    try {
      console.log('Deleting admin with username:', deleteAdminData.id);
      const response = await adminAPI.deleteAdminUser(deleteAdminData.id);
      console.log('Delete response:', response.data);
      
      if (response.data.success) {
        showNotification('Admin deleted successfully!', 'success');
        setIsDeleteModalOpen(false);
        fetchData(); // Refresh the list
      } else {
        throw new Error(response.data.message || 'Failed to delete admin');
      }
    } catch (error) {
      console.error('Error deleting admin:', error);
      showNotification(error.response?.data?.message || 'Failed to delete admin', 'error');
    }
  };

  const openEditModal = (admin) => {
    console.log('Opening edit modal for admin:', admin);
    setEditAdminForm({
      username: admin.username,
      fullname: admin.fullname,
      role: admin.role,
      is_active: admin.is_active,
      assigned_events: admin.assigned_events || []
    });
    setIsEditModalOpen(true);
    console.log('Edit modal state set to true');
  };

  const openDeleteModal = (admin) => {
    setDeleteAdminData({
      id: admin.username,
      name: admin.fullname
    });
    setIsDeleteModalOpen(true);
  };

  const toggleEventAssignment = (eventId, isEdit = false) => {
    const formKey = isEdit ? 'editAdminForm' : 'newAdminForm';
    const setForm = isEdit ? setEditAdminForm : setNewAdminForm;
    const currentForm = isEdit ? editAdminForm : newAdminForm;

    const currentEvents = currentForm.assigned_events || [];
    const updatedEvents = currentEvents.includes(eventId)
      ? currentEvents.filter(id => id !== eventId)
      : [...currentEvents, eventId];

    setForm(prev => ({
      ...prev,
      assigned_events: updatedEvents
    }));
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'executive_admin':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'event_admin':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'content_admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatRoleName = (role) => {
    return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <AdminLayout pageTitle="Admin Management">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <AdminLayout pageTitle="Admin Management">
        <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Management</h1>
          <p className="text-gray-600">Manage admin accounts and their roles (Super Admin Only)</p>
        </div>

        {/* Flash Messages */}
        {(successMessage || error) && (
          <div className="mb-6">
            {successMessage && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
                <i className="fas fa-check-circle mr-2"></i>
                {successMessage}
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
                <i className="fas fa-exclamation-circle mr-2"></i>
                {error}
              </div>
            )}
          </div>
        )}

        {/* Role Descriptions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
            <h3 className="font-semibold text-red-800 mb-2">
              <i className="fas fa-crown mr-2"></i>Super Admin
            </h3>
            <p className="text-sm text-red-700">Full access to all system features and admin management</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">
              <i className="fas fa-user-tie mr-2"></i>Executive Admin
            </h3>
            <p className="text-sm text-blue-700">Read-only access to admin panel + event creation capabilities</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
            <h3 className="font-semibold text-green-800 mb-2">
              <i className="fas fa-calendar-check mr-2"></i>Event Admin
            </h3>
            <p className="text-sm text-green-700">Access limited to assigned events only</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
            <h3 className="font-semibold text-purple-800 mb-2">
              <i className="fas fa-edit mr-2"></i>Content Admin
            </h3>
            <p className="text-sm text-purple-700">Manage content, announcements, and basic event operations</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create New Admin Form */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow-lg rounded-lg p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                <i className="fas fa-user-plus mr-2 text-seafoam-600"></i>Create New Admin
              </h2>
              
              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={newAdminForm.fullname}
                    onChange={(e) => setNewAdminForm(prev => ({ ...prev, fullname: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input
                    type="text"
                    value={newAdminForm.username}
                    onChange={(e) => setNewAdminForm(prev => ({ ...prev, username: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newAdminForm.email}
                    onChange={(e) => setNewAdminForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={newAdminForm.password}
                    onChange={(e) => setNewAdminForm(prev => ({ ...prev, password: e.target.value }))}
                    required
                    minLength="8"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter password"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={newAdminForm.role}
                    onChange={(e) => setNewAdminForm(prev => ({ ...prev, role: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Role</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="executive_admin">Executive Admin</option>
                    <option value="event_admin">Event Admin</option>
                    <option value="content_admin">Content Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={newAdminForm.is_active ? 'true' : 'false'}
                    onChange={(e) => setNewAdminForm(prev => ({ ...prev, is_active: e.target.value === 'true' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>

                {/* Event Assignment for Event Admins */}
                {newAdminForm.role === 'event_admin' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Events</label>
                    <div className="relative" id="eventsDropdown">
                      <button
                        type="button"
                        onClick={() => setIsEventsDropdownOpen(!isEventsDropdownOpen)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-left flex justify-between items-center"
                      >
                        <span className={newAdminForm.assigned_events.length === 0 ? 'text-gray-500' : 'text-gray-900 font-medium'}>
                          {newAdminForm.assigned_events.length === 0 
                            ? 'Select events to assign...' 
                            : `${newAdminForm.assigned_events.length} event${newAdminForm.assigned_events.length > 1 ? 's' : ''} selected`
                          }
                        </span>
                        <i className={`fas fa-chevron-${isEventsDropdownOpen ? 'up' : 'down'} text-gray-400`}></i>
                      </button>
                      
                      {isEventsDropdownOpen && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {events.map(event => (
                            <label key={event.event_id} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newAdminForm.assigned_events.includes(event.event_id)}
                                onChange={() => toggleEventAssignment(event.event_id, false)}
                                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900">{event.event_name}</div>
                                <div className="text-xs text-gray-500 flex items-center space-x-2">
                                  <span>ID: {event.event_id}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                                    event.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                                    event.status === 'ongoing' ? 'bg-green-100 text-green-800' :
                                    event.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {event.status ? event.status.charAt(0).toUpperCase() + event.status.slice(1) : 'Unknown'}
                                  </span>
                                </div>
                              </div>
                            </label>
                          ))}
                          {events.length === 0 && (
                            <div className="px-3 py-4 text-center text-gray-500 text-sm">
                              <i className="fas fa-calendar-times mb-2 text-xl"></i>
                              <p>No events available</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">For Event Admins only. Select one or more events to assign.</p>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-seafoam-500 to-sky-500 text-black py-3 px-4 rounded-lg hover:from-seafoam-600 hover:to-sky-600 transition-all font-medium shadow-lg"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Create Admin
                </button>
              </form>
            </div>
          </div>

          {/* Existing Admins List */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow-lg rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <i className="fas fa-users-cog mr-2 text-seafoam-600"></i>
                  Existing Admins
                </h2>
              </div>
              
              {admins.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-2 font-medium text-gray-700">Admin Details</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-700">Role</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-700">Status</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admins.map((admin) => (
                        <tr key={admin.username} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 px-2">
                            <div>
                              <p className="font-medium text-gray-900">{admin.fullname}</p>
                              <p className="text-sm text-gray-600">@{admin.username}</p>
                              <p className="text-sm text-gray-500">{admin.email}</p>
                              {admin.created_by && (
                                <p className="text-xs text-gray-400">Created by: {admin.created_by}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(admin.role)}`}>
                              {admin.role === 'super_admin' && <i className="fas fa-crown mr-1"></i>}
                              {admin.role === 'executive_admin' && <i className="fas fa-user-tie mr-1"></i>}
                              {admin.role === 'event_admin' && <i className="fas fa-calendar-check mr-1"></i>}
                              {admin.role === 'content_admin' && <i className="fas fa-edit mr-1"></i>}
                              {formatRoleName(admin.role)}
                            </span>
                            
                            {admin.assigned_events && admin.assigned_events.length > 0 && (
                              <div className="mt-1">
                                <p className="text-xs text-gray-500">Assigned Events: {admin.assigned_events.length}</p>
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              admin.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {admin.is_active ? 'Active' : 'Inactive'}
                            </span>
                            {admin.last_login && (
                              <p className="text-xs text-gray-500 mt-1">Last: {admin.last_login}</p>
                            )}
                          </td>
                          <td className="py-4 px-2">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => openEditModal(admin)}
                                className="text-blue-600 hover:text-blue-800 text-sm"
                                title="Edit Admin"
                              >
                                <i className="fas fa-edit mr-1"></i>Edit
                              </button>
                              <button
                                onClick={() => openDeleteModal(admin)}
                                className="text-red-600 hover:text-red-800 text-sm"
                                title="Delete Admin"
                              >
                                <i className="fas fa-trash mr-1"></i>Delete
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
                  <i className="fas fa-users text-4xl text-gray-300 mb-4"></i>
                  <p className="text-gray-600">No admin users found.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        </div>
      </AdminLayout>
    
      {/* Modals rendered via portal for proper z-index */}
      {isEditModalOpen && createPortal(
        <div 
          className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsEditModalOpen(false);
            }
          }}
        >
          <div className="bg-white/95 backdrop-blur-md rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl border border-white/20 animate-in slide-in-from-bottom-4 duration-300">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Admin</h3>
            
            <form onSubmit={handleEditAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editAdminForm.fullname}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editAdminForm.is_active ? 'true' : 'false'}
                  onChange={(e) => setEditAdminForm(prev => ({ ...prev, is_active: e.target.value === 'true' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={editAdminForm.role}
                  onChange={(e) => setEditAdminForm(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="super_admin">Super Admin</option>
                  <option value="executive_admin">Executive Admin</option>
                  <option value="event_admin">Event Admin</option>
                  <option value="content_admin">Content Admin</option>
                </select>
              </div>

              {/* Event Assignment for Event Admins */}
              {editAdminForm.role === 'event_admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign Events</label>
                  <div className="relative" id="editEventsDropdown">
                    <button
                      type="button"
                      onClick={() => setIsEditEventsDropdownOpen(!isEditEventsDropdownOpen)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-left flex items-center justify-between bg-white"
                    >
                      <span className={editAdminForm.assigned_events.length === 0 ? 'text-gray-500' : 'text-gray-900 font-medium'}>
                        {editAdminForm.assigned_events.length === 0 
                          ? 'Select events to assign...' 
                          : `${editAdminForm.assigned_events.length} event${editAdminForm.assigned_events.length > 1 ? 's' : ''} selected`
                        }
                      </span>
                      <i className={`fas fa-chevron-${isEditEventsDropdownOpen ? 'up' : 'down'} text-gray-400`}></i>
                    </button>
                    
                    {isEditEventsDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {events.map(event => (
                          <label key={event.event_id} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editAdminForm.assigned_events.includes(event.event_id)}
                              onChange={() => toggleEventAssignment(event.event_id, true)}
                              className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{event.event_name}</div>
                              <div className="text-xs text-gray-500 flex items-center space-x-2">
                                <span>ID: {event.event_id}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs ${
                                  event.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                                  event.status === 'ongoing' ? 'bg-green-100 text-green-800' :
                                  event.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {event.status ? event.status.charAt(0).toUpperCase() + event.status.slice(1) : 'Unknown'}
                                </span>
                              </div>
                            </div>
                          </label>
                        ))}
                        {events.length === 0 && (
                          <div className="px-3 py-4 text-center text-gray-500 text-sm">
                            <i className="fas fa-calendar-times mb-2 text-xl"></i>
                            <p>No events available</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-white rounded bg-blue-500 hover:bg-blue-600  transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white rounded bg-green-500 hover:bg-green-600  transition-colors"
                >
                  Update Admin
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && createPortal(
        <div 
          className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsDeleteModalOpen(false);
            }
          }}
        >
          <div className="bg-white/95 backdrop-blur-md rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl border border-white/20 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <i className="fas fa-exclamation-triangle text-red-600 text-xl"></i>
              </div>
              <h3 className="ml-4 text-lg font-semibold text-gray-900">Delete Admin</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete admin "<span className="font-medium">{deleteAdminData.name}</span>"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAdmin}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default ManageAdmin;