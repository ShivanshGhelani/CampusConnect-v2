import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { adminAPI } from '../../api/admin';
import AdminLayout from '../../components/admin/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Dropdown } from '../../components/ui';
import Modal, { ConfirmModal } from '../../components/ui/Modal';

function ManageAdmin() {
  const [admins, setAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isHardDeleteModalOpen, setIsHardDeleteModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [deleteAdminData, setDeleteAdminData] = useState({ id: '', name: '' });
  const [restoreAdminData, setRestoreAdminData] = useState({ id: '', name: '' });
  const [hardDeleteAdminData, setHardDeleteAdminData] = useState({ id: '', name: '' });

  // Form data for creating new admin
  const [newAdminForm, setNewAdminForm] = useState({
    fullname: '',
    username: '',
    email: '',
    password: '',
    role: '',
    is_active: true
  });

  // Form data for editing admin
  const [editAdminForm, setEditAdminForm] = useState({
    username: '',
    fullname: '',
    role: '',
    is_active: true
  });

  // Floating panel states
  const [isFloatingPanelOpen, setIsFloatingPanelOpen] = useState(false);
  const [isFloatingPanelMinimized, setIsFloatingPanelMinimized] = useState(false);

  // Add/remove modal backdrop blur class
  useEffect(() => {
    const isModalOpen = isEditModalOpen || isDeleteModalOpen || isRestoreModalOpen || isHardDeleteModalOpen;
    
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
  }, [isEditModalOpen, isDeleteModalOpen, isRestoreModalOpen, isHardDeleteModalOpen]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching admin data...');
      const adminsResponse = await adminAPI.getAdminUsers();

      console.log('Admins response:', adminsResponse.data);

      if (adminsResponse.data.success) {
        setAdmins(adminsResponse.data.users || []); // Note: API returns 'users' not 'admins'
        console.log('Set admins:', adminsResponse.data.users);
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
          is_active: true
        });
        // Close the floating panel after successful creation
        setIsFloatingPanelOpen(false);
        setIsFloatingPanelMinimized(false);
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
      console.log('Soft deleting admin with username:', deleteAdminData.id);
      const response = await adminAPI.deleteAdminUser(deleteAdminData.id);
      console.log('Soft delete response:', response.data);
      
      if (response.data.success) {
        showNotification('Admin deactivated successfully!', 'success');
        setIsDeleteModalOpen(false);
        fetchData(); // Refresh the list
      } else {
        throw new Error(response.data.message || 'Failed to deactivate admin');
      }
    } catch (error) {
      console.error('Error deactivating admin:', error);
      showNotification(error.response?.data?.message || 'Failed to deactivate admin', 'error');
    }
  };

  const handleRestoreAdmin = async () => {
    try {
      console.log('Restoring admin with username:', restoreAdminData.id);
      const response = await adminAPI.restoreAdminUser(restoreAdminData.id);
      console.log('Restore response:', response.data);
      
      if (response.data.success) {
        showNotification('Admin restored successfully!', 'success');
        setIsRestoreModalOpen(false);
        fetchData(); // Refresh the list
      } else {
        throw new Error(response.data.message || 'Failed to restore admin');
      }
    } catch (error) {
      console.error('Error restoring admin:', error);
      showNotification(error.response?.data?.message || 'Failed to restore admin', 'error');
    }
  };

  const handleHardDeleteAdmin = async () => {
    try {
      console.log('Hard deleting admin with username:', hardDeleteAdminData.id);
      const response = await adminAPI.hardDeleteAdminUser(hardDeleteAdminData.id);
      console.log('Hard delete response:', response.data);
      
      if (response.data.success) {
        showNotification('Admin permanently deleted!', 'success');
        setIsHardDeleteModalOpen(false);
        fetchData(); // Refresh the list
      } else {
        throw new Error(response.data.message || 'Failed to permanently delete admin');
      }
    } catch (error) {
      console.error('Error permanently deleting admin:', error);
      showNotification(error.response?.data?.message || 'Failed to permanently delete admin', 'error');
    }
  };

  const openEditModal = (admin) => {
    console.log('Opening edit modal for admin:', admin);
    setEditAdminForm({
      username: admin.username,
      fullname: admin.fullname,
      role: admin.role,
      is_active: admin.is_active
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

  const openRestoreModal = (admin) => {
    setRestoreAdminData({
      id: admin.username,
      name: admin.fullname
    });
    setIsRestoreModalOpen(true);
  };

  const openHardDeleteModal = (admin) => {
    setHardDeleteAdminData({
      id: admin.username,
      name: admin.fullname
    });
    setIsHardDeleteModalOpen(true);
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'executive_admin':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Admin Management</h1>
            <p className="mt-1 text-sm text-gray-600">Manage admin accounts and permissions</p>
          </div>

          {/* Flash Messages */}
          {(successMessage || error) && (
            <div className="mb-6">
              {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md flex items-center">
                  <i className="fas fa-check-circle mr-2 text-green-600"></i>
                  {successMessage}
                </div>
              )}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md flex items-center">
                  <i className="fas fa-exclamation-circle mr-2 text-red-600"></i>
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Main Content - Full Width Admin List */}
          <div className="bg-white shadow rounded-lg border border-gray-200">
            <div className="px-4 py-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Admin Users</h3>
                <p className="mt-1 text-sm text-gray-600">
                  {admins.length} admin{admins.length !== 1 ? 's' : ''} total
                  {admins.length > 0 && (
                    <span className="ml-2">
                      ({admins.filter(admin => admin.is_active).length} active, {admins.filter(admin => !admin.is_active).length} inactive)
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                {/* Role Legend */}
                <div className="hidden lg:flex items-center space-x-4 text-xs">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                    <span className="text-gray-600">Super Admin</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                    <span className="text-gray-600">Executive Admin</span>
                  </div>
                </div>
                {/* Add Admin Button */}
                <button
                  onClick={() => {
                    setIsFloatingPanelOpen(true);
                    setIsFloatingPanelMinimized(false);
                  }}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Add Admin
                </button>
              </div>
            </div>
            
            {admins.length > 0 ? (
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Admin
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {admins.map((admin) => (
                      <tr key={admin.username} className={`${
                        admin.is_active 
                          ? 'hover:bg-gray-50' 
                          : 'bg-gray-50 hover:bg-gray-100 opacity-75'
                      } transition-colors`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8">
                              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700">
                                  {admin.fullname?.charAt(0)?.toUpperCase() || 'A'}
                                </span>
                              </div>
                            </div>
                            <div className="ml-3">
                              <div className={`text-sm font-medium flex items-center ${
                                admin.is_active ? 'text-gray-900' : 'text-gray-600'
                              }`}>
                                {admin.fullname}
                                {!admin.is_active && (
                                  <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                    <i className="fas fa-user-slash mr-1 text-xs"></i>
                                    Deactivated
                                  </span>
                                )}
                              </div>
                              <div className={`text-sm ${
                                admin.is_active ? 'text-gray-500' : 'text-gray-400'
                              }`}>
                                @{admin.username}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{admin.email}</div>
                          {admin.created_at && (
                            <div className="text-xs text-gray-500">
                              Joined {new Date(admin.created_at).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(admin.role)}`}>
                            <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              admin.role === 'super_admin' ? 'bg-red-500' :
                              admin.role === 'executive_admin' ? 'bg-blue-500' : 'bg-gray-500'
                            }`}></div>
                            {formatRoleName(admin.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            admin.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              admin.is_active ? 'bg-green-500' : 'bg-red-500'
                            }`}></div>
                            {admin.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-3">
                            {admin.is_active ? (
                              // Actions for active admins
                              <>
                                <button
                                  onClick={() => openEditModal(admin)}
                                  className="text-blue-600 hover:text-blue-900 p-1 rounded-md hover:bg-blue-50 transition-colors"
                                  title="Edit Admin"
                                >
                                  <i className="fas fa-edit text-sm"></i>
                                </button>
                                <button
                                  onClick={() => openDeleteModal(admin)}
                                  className="text-orange-600 hover:text-orange-900 p-1 rounded-md hover:bg-orange-50 transition-colors"
                                  title="Deactivate Admin"
                                >
                                  <i className="fas fa-user-slash text-sm"></i>
                                </button>
                              </>
                            ) : (
                              // Actions for inactive (soft deleted) admins
                              <>
                                <button
                                  onClick={() => openRestoreModal(admin)}
                                  className="text-green-600 hover:text-green-900 p-1 rounded-md hover:bg-green-50 transition-colors"
                                  title="Restore Admin"
                                >
                                  <i className="fas fa-user-check text-sm"></i>
                                </button>
                                <button
                                  onClick={() => openHardDeleteModal(admin)}
                                  className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50 transition-colors"
                                  title="Permanently Delete Admin"
                                >
                                  <i className="fas fa-trash text-sm"></i>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <i className="fas fa-users text-xl text-gray-400"></i>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No admin users found</h3>
                <p className="text-gray-600 mb-4">Create your first admin user to get started.</p>
                <button
                  onClick={() => {
                    setIsFloatingPanelOpen(true);
                    setIsFloatingPanelMinimized(false);
                  }}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Add First Admin
                </button>
              </div>
            )}
          </div>
        </div>
      </AdminLayout>

      {/* Floating Add Admin Panel */}
      {isFloatingPanelOpen && createPortal(
        <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ease-in-out ${
          isFloatingPanelMinimized 
            ? 'w-80 h-12' 
            : 'w-96 h-auto max-h-[80vh]'
        }`}>
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
            {/* Panel Header */}
            <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between cursor-pointer"
                 onClick={() => setIsFloatingPanelMinimized(!isFloatingPanelMinimized)}>
              <div className="flex items-center">
                <i className="fas fa-user-plus mr-2"></i>
                <span className="font-medium text-sm">Add New Admin</span>
                {newAdminForm.fullname && (
                  <span className="ml-2 text-blue-200 text-xs">
                    - {newAdminForm.fullname}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFloatingPanelMinimized(!isFloatingPanelMinimized);
                  }}
                  className="text-blue-200 hover:text-white p-1"
                  title={isFloatingPanelMinimized ? "Restore" : "Minimize"}
                >
                  <i className={`fas fa-${isFloatingPanelMinimized ? 'window-maximize' : 'window-minimize'} text-xs`}></i>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFloatingPanelOpen(false);
                    setIsFloatingPanelMinimized(false);
                    // Reset form when closing
                    setNewAdminForm({
                      fullname: '',
                      username: '',
                      email: '',
                      password: '',
                      role: '',
                      is_active: true
                    });
                  }}
                  className="text-blue-200 hover:text-white p-1"
                  title="Close"
                >
                  <i className="fas fa-times text-xs"></i>
                </button>
              </div>
            </div>

            {/* Panel Content */}
            {!isFloatingPanelMinimized && (
              <div className="max-h-[calc(80vh-48px)] overflow-y-auto">
                <form onSubmit={handleCreateAdmin} className="px-4 py-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={newAdminForm.fullname}
                      onChange={(e) => setNewAdminForm(prev => ({ ...prev, fullname: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Enter full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={newAdminForm.username}
                      onChange={(e) => setNewAdminForm(prev => ({ ...prev, username: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Enter username"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={newAdminForm.email}
                      onChange={(e) => setNewAdminForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="admin@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={newAdminForm.password}
                      onChange={(e) => setNewAdminForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                      minLength="8"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Min 8 characters"
                    />
                  </div>

                  <div>
                    <Dropdown
                      label="Role"
                      placeholder="Select Role"
                      value={newAdminForm.role}
                      onChange={(value) => setNewAdminForm(prev => ({ ...prev, role: value }))}
                      required
                      options={[
                        { label: 'Super Admin', value: 'super_admin', icon: <i className="fas fa-crown text-red-500 text-xs"></i> },
                        { label: 'Executive Admin', value: 'executive_admin', icon: <i className="fas fa-user-shield text-blue-500 text-xs"></i> }
                      ]}
                      icon={<i className="fas fa-user-tag text-xs"></i>}
                      size="md"
                    />
                  </div>

                  <div>
                    <Dropdown
                      label="Status"
                      value={newAdminForm.is_active ? 'true' : 'false'}
                      onChange={(value) => setNewAdminForm(prev => ({ ...prev, is_active: value === 'true' }))}
                      options={[
                        { label: 'Active', value: 'true', icon: <i className="fas fa-check-circle text-green-500 text-xs"></i> },
                        { label: 'Inactive', value: 'false', icon: <i className="fas fa-times-circle text-red-500 text-xs"></i> }
                      ]}
                      icon={<i className="fas fa-toggle-on text-xs"></i>}
                      size="md"
                    />
                  </div>

                  <div className="flex space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNewAdminForm({
                          fullname: '',
                          username: '',
                          email: '',
                          password: '',
                          role: '',
                          is_active: true
                        });
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
                    >
                      Clear
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-md hover:bg-blue-700 text-sm font-medium transition-colors"
                    >
                      <i className="fas fa-plus mr-1"></i>
                      Create
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Edit Modal */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Admin"
        backdrop="blur"
        size="md"
      >
        <form onSubmit={handleEditAdmin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={editAdminForm.fullname}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
            />
          </div>

          <div>
            <Dropdown
              label="Role"
              value={editAdminForm.role}
              onChange={(value) => setEditAdminForm(prev => ({ ...prev, role: value }))}
              options={[
                { label: 'Super Admin', value: 'super_admin', icon: <i className="fas fa-crown text-red-500 text-xs"></i> },
                { label: 'Executive Admin', value: 'executive_admin', icon: <i className="fas fa-user-shield text-blue-500 text-xs"></i> }
              ]}
              icon={<i className="fas fa-user-tag text-xs"></i>}
              size="md"
            />
          </div>

          <div>
            <Dropdown
              label="Status"
              value={editAdminForm.is_active ? 'true' : 'false'}
              onChange={(value) => setEditAdminForm(prev => ({ ...prev, is_active: value === 'true' }))}
              options={[
                { label: 'Active', value: 'true', icon: <i className="fas fa-check-circle text-green-500 text-xs"></i> },
                { label: 'Inactive', value: 'false', icon: <i className="fas fa-times-circle text-red-500 text-xs"></i> }
              ]}
              icon={<i className="fas fa-toggle-on text-xs"></i>}
              size="md"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Update Admin
            </button>
          </div>
        </form>
      </Modal>

      {/* Deactivate Confirmation Modal */}
      <Modal 
        isOpen={isDeleteModalOpen} 
        onClose={() => setIsDeleteModalOpen(false)}
        title="Deactivate Admin"
        backdrop="blur"
        size="md"
      >
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-3">
            <i className="fas fa-user-slash text-orange-600"></i>
          </div>
          <span className="text-lg font-medium text-gray-900">Confirm Deactivation</span>
        </div>
        <p className="text-gray-600 mb-6">
          Are you sure you want to deactivate admin "<span className="font-medium">{deleteAdminData.name}</span>"? 
          The admin will be unable to access the system but their data will be preserved. You can restore them later.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => setIsDeleteModalOpen(false)}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteAdmin}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm"
          >
            Deactivate
          </button>
        </div>
      </Modal>

      {/* Restore Confirmation Modal */}
      <Modal 
        isOpen={isRestoreModalOpen} 
        onClose={() => setIsRestoreModalOpen(false)}
        title="Restore Admin"
        backdrop="blur"
        size="md"
      >
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
            <i className="fas fa-user-check text-green-600"></i>
          </div>
          <span className="text-lg font-medium text-gray-900">Confirm Restoration</span>
        </div>
        <p className="text-gray-600 mb-6">
          Are you sure you want to restore admin "<span className="font-medium">{restoreAdminData.name}</span>"? 
          They will regain access to the system with their previous permissions.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => setIsRestoreModalOpen(false)}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleRestoreAdmin}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
          >
            Restore
          </button>
        </div>
      </Modal>

      {/* Hard Delete Confirmation Modal */}
      <Modal 
        isOpen={isHardDeleteModalOpen} 
        onClose={() => setIsHardDeleteModalOpen(false)}
        title="Permanently Delete Admin"
        backdrop="blur"
        size="md"
      >
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
            <i className="fas fa-exclamation-triangle text-red-600"></i>
          </div>
          <span className="text-lg font-medium text-gray-900">⚠️ Permanent Deletion</span>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <p className="text-red-800 text-sm font-medium">
            <i className="fas fa-exclamation-triangle mr-1"></i>
            This action cannot be undone!
          </p>
        </div>
        <p className="text-gray-600 mb-6">
          Are you sure you want to permanently delete admin "<span className="font-medium">{hardDeleteAdminData.name}</span>"? 
          This will completely remove all their data from the system and cannot be restored.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => setIsHardDeleteModalOpen(false)}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleHardDeleteAdmin}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
          >
            Permanently Delete
          </button>
        </div>
      </Modal>
    </>
  );
}

export default ManageAdmin;