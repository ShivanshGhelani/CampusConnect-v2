import React, { useState, useEffect } from 'react';
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
    password: '',
    role: 'event_admin',
    is_active: true,
    assigned_events: []
  });

  // Form data for editing admin
  const [editAdminForm, setEditAdminForm] = useState({
    admin_id: '',
    fullname: '',
    role: '',
    is_active: true,
    assigned_events: []
  });

  // Dropdown states
  const [isEventsDropdownOpen, setIsEventsDropdownOpen] = useState(false);
  const [isEditEventsDropdownOpen, setIsEditEventsDropdownOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [adminsResponse, eventsResponse] = await Promise.all([
        adminAPI.getAdminUsers(),
        adminAPI.getEvents()
      ]);

      if (adminsResponse.data.success) {
        setAdmins(adminsResponse.data.admins || []);
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
          password: '',
          role: 'event_admin',
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
      const response = await adminAPI.updateAdminUser(editAdminForm.admin_id, editAdminForm);
      
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
      const response = await adminAPI.deleteAdminUser(deleteAdminData.id);
      
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
    setEditAdminForm({
      admin_id: admin.admin_id,
      fullname: admin.fullname,
      role: admin.role,
      is_active: admin.is_active,
      assigned_events: admin.assigned_events || []
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (admin) => {
    setDeleteAdminData({
      id: admin.admin_id,
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
      case 'content_admin':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'event_admin':
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
            <div className="flex items-center mb-2">
              <i className="fas fa-crown text-red-600 mr-2"></i>
              <h4 className="font-semibold text-red-800">Super Admin</h4>
            </div>
            <p className="text-sm text-red-700">Full system access and admin management</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center mb-2">
              <i className="fas fa-users-cog text-blue-600 mr-2"></i>
              <h4 className="font-semibold text-blue-800">Executive Admin</h4>
            </div>
            <p className="text-sm text-blue-700">Manage events, students, and analytics</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
            <div className="flex items-center mb-2">
              <i className="fas fa-edit text-green-600 mr-2"></i>
              <h4 className="font-semibold text-green-800">Content Admin</h4>
            </div>
            <p className="text-sm text-green-700">Manage students and event content</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center mb-2">
              <i className="fas fa-calendar-check text-purple-600 mr-2"></i>
              <h4 className="font-semibold text-purple-800">Event Admin</h4>
            </div>
            <p className="text-sm text-purple-700">Manage assigned events only</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create New Admin Form */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow-lg rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <i className="fas fa-user-plus mr-2 text-blue-600"></i>
                Create New Admin
              </h3>
              
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={newAdminForm.password}
                    onChange={(e) => setNewAdminForm(prev => ({ ...prev, password: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={newAdminForm.role}
                    onChange={(e) => setNewAdminForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="event_admin">Event Admin</option>
                    <option value="content_admin">Content Admin</option>
                    <option value="executive_admin">Executive Admin</option>
                    <option value="super_admin">Super Admin</option>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assign Events</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsEventsDropdownOpen(!isEventsDropdownOpen)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-left flex items-center justify-between"
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
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {events.map(event => (
                            <label key={event.event_id} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newAdminForm.assigned_events.includes(event.event_id)}
                                onChange={() => toggleEventAssignment(event.event_id, false)}
                                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <span className="text-sm text-gray-700">{event.event_name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
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
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <i className="fas fa-users mr-2 text-blue-600"></i>
                  Existing Admins ({admins.length})
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Admin Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assigned Events
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {admins.map((admin) => (
                      <tr key={admin.admin_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <i className="fas fa-user text-blue-600"></i>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{admin.fullname}</div>
                              <div className="text-sm text-gray-500">{admin.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(admin.role)}`}>
                            {formatRoleName(admin.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            admin.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {admin.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {admin.role === 'event_admin' 
                            ? `${admin.assigned_events?.length || 0} events`
                            : 'All events'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => openEditModal(admin)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Edit Admin"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              onClick={() => openDeleteModal(admin)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete Admin"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Admin Modal */}
        {isEditModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl w-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Admin</h3>
              
              <form onSubmit={handleEditAdmin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editAdminForm.fullname}
                    onChange={(e) => setEditAdminForm(prev => ({ ...prev, fullname: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={editAdminForm.role}
                    onChange={(e) => setEditAdminForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="event_admin">Event Admin</option>
                    <option value="content_admin">Content Admin</option>
                    <option value="executive_admin">Executive Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
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

                {/* Event Assignment for Event Admins */}
                {editAdminForm.role === 'event_admin' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assign Events</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsEditEventsDropdownOpen(!isEditEventsDropdownOpen)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-left flex items-center justify-between"
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
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {events.map(event => (
                            <label key={event.event_id} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editAdminForm.assigned_events.includes(event.event_id)}
                                onChange={() => toggleEventAssignment(event.event_id, true)}
                                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <span className="text-sm text-gray-700">{event.event_name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Update Admin
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-exclamation-triangle text-red-600 text-xl"></i>
                </div>
                <h3 className="ml-4 text-lg font-semibold text-gray-900">Confirm Delete</h3>
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
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default ManageAdmin;