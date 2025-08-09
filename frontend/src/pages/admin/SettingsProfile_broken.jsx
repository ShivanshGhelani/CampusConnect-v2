import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../api/admin';
import AdminLayout from '../../components/admin/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/ui/Modal';

function SettingsProfile() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  // Modal states
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(false);

  // Profile form data
  const [profileForm, setProfileForm] = useState({
    fullname: '',
    email: '',
    phone: ''
  });

  // Username form data
  const [usernameForm, setUsernameForm] = useState({
    username: '',
    current_password: ''
  });

  // Password form data
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  // Password visibility toggles
  const [passwordVisibility, setPasswordVisibility] = useState({
    current_password: false,
    new_password: false,
    confirm_password: false
  });

  // Load profile data on component mount
  useEffect(() => {
    console.log('User context data:', user); // Debug log
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setProfileLoading(true);
      const response = await adminAPI.getProfile();
      
      console.log('Profile API Response:', response.data); // Debug log
      
      if (response.data.success) {
        const profile = response.data.profile;
        console.log('Profile data:', profile); // Debug log
        
        setProfileForm({
          fullname: profile.fullname || '',
          email: profile.email || '',
          phone: profile.phone || '' // Just use the phone field from backend
        });
        setUsernameForm(prev => ({
          ...prev,
          username: profile.username || ''
        }));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      // Fallback to user context data if API fails
      if (user) {
        console.log('Using fallback user data:', user); // Debug log
        setProfileForm({
          fullname: user.fullname || '',
          email: user.email || '',
          phone: user.phone || user.mobile_no || '' // Fallback check both fields for user context
        });
        setUsernameForm(prev => ({
          ...prev,
          username: user.username || ''
        }));
      }
    } finally {
      setProfileLoading(false);
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

  const togglePasswordVisibility = (field) => {
    setPasswordVisibility(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const checkPasswordMatch = () => {
    return passwordForm.new_password === passwordForm.confirm_password;
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await adminAPI.updateProfile(profileForm);

      if (response.data.success) {
        showNotification('Profile updated successfully!', 'success');
        // Reload profile data to show updated information
        await loadProfileData();
      } else {
        throw new Error(response.data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showNotification(error.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await adminAPI.updateUsername(usernameForm);

      if (response.data.success) {
        showNotification('Username updated successfully!', 'success');
        setUsernameForm(prev => ({ ...prev, current_password: '' }));
        setIsUsernameModalOpen(false);
        // Reload profile data to show updated username
        await loadProfileData();
      } else {
        throw new Error(response.data.message || 'Failed to update username');
      }
    } catch (error) {
      console.error('Error updating username:', error);
      showNotification(error.response?.data?.message || 'Failed to update username', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (!checkPasswordMatch()) {
      showNotification('New passwords do not match', 'error');
      return;
    }

    setIsLoading(true);

    try {
      const response = await adminAPI.updatePassword(passwordForm);

      if (response.data.success) {
        showNotification('Password updated successfully!', 'success');
        setPasswordForm({
          current_password: '',
          new_password: '',
          confirm_password: ''
        });
        setIsPasswordModalOpen(false);
      } else {
        throw new Error(response.data.message || 'Failed to update password');
      }
    } catch (error) {
      console.error('Error updating password:', error);
      showNotification(error.response?.data?.message || 'Failed to update password', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getUserInitials = (user) => {
    if (!user?.fullname) return 'A';
    const names = user.fullname.split(' ');
    return names.length > 1
      ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      : names[0][0].toUpperCase();
  };

  return (
    <AdminLayout pageTitle="Profile & Settings">
      <div className="max-w-6xl mx-auto px-6 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Profile & Settings</h1>
            <p className="text-gray-600">Manage your account information and security</p>
          </div>
          {user?.role === 'organizer_admin' && (
            <button
              onClick={() => window.history.back()}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center space-x-2"
            >
              <i className="fas fa-arrow-left"></i>
              <span>Back to Events</span>
            </button>
          )}
        </div>

        {/* Flash Messages */}
        {(successMessage || error) && (
          <div className="mb-6">
            {successMessage && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
                <i className="fas fa-check-circle mr-2"></i>
                {successMessage}
                <button onClick={() => setSuccessMessage('')} className="ml-auto text-green-600 hover:text-green-800">
                  <i className="fas fa-times"></i>
                </button>
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
                <i className="fas fa-exclamation-circle mr-2"></i>
                {error}
                <button onClick={() => setError('')} className="ml-auto text-red-600 hover:text-red-800">
                  <i className="fas fa-times"></i>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Info Card */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            {/* Profile Header */}
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-xl font-bold">
                {getUserInitials(user)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{user?.fullname || 'Admin User'}</h2>
                <p className="text-gray-600 capitalize">{user?.role?.replace('_', ' ') || 'Administrator'}</p>
              </div>
            </div>

            {/* Account Information */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
              {profileLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Username</label>
                    <p className="text-gray-900 font-medium">{usernameForm.username || user?.username || 'Not available'}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                    <p className="text-gray-900 font-medium truncate" title={profileForm.email}>
                      {profileForm.email || 'Not provided'}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Phone</label>
                    <p className="text-gray-900 font-medium">{profileForm.phone || 'Not provided'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Update Profile Form */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Information</h3>
              {profileLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : (
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={profileForm.fullname}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, fullname: e.target.value }))}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter your phone number"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your email"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Updating...
                      </>
                    ) : (
                      'Update Profile'
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h3>
            <div className="space-y-3">
              <button
                onClick={() => setIsPasswordModalOpen(true)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center">
                  <i className="fas fa-key text-blue-600 mr-3"></i>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Change Password</div>
                    <div className="text-sm text-gray-600">Update your password</div>
                  </div>
                </div>
                <i className="fas fa-chevron-right text-gray-400"></i>
              </button>
              
              <button
                onClick={() => setIsUsernameModalOpen(true)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center">
                  <i className="fas fa-user-edit text-green-600 mr-3"></i>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Change Username</div>
                    <div className="text-sm text-gray-600">Update your username</div>
                  </div>
                </div>
                <i className="fas fa-chevron-right text-gray-400"></i>
              </button>
            </div>

            {/* Security Status */}
            <div className="mt-6 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center">
                <i className="fas fa-shield-check text-green-600 mr-2"></i>
                <div>
                  <div className="font-medium text-green-800">Account Secure</div>
                  <div className="text-sm text-green-600">All security features active</div>
                </div>
              </div>
            </div>
          </div>
        </div>

          {/* Change Password Modal */}
          <Modal 
            isOpen={isPasswordModalOpen} 
            onClose={() => setIsPasswordModalOpen(false)} 
            title="Change Password"
            size="md"
          >
            <div className="p-6">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                  <i className="fas fa-key text-blue-600 text-xl"></i>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Update Your Password</h3>
                  <p className="text-sm text-gray-600">Choose a strong password to secure your account</p>
                </div>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                  <div className="relative">
                    <input
                      type={passwordVisibility.current_password ? 'text' : 'password'}
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, current_password: e.target.value }))}
                      required
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('current_password')}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      <i className={`fas ${passwordVisibility.current_password ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                  <div className="relative">
                    <input
                      type={passwordVisibility.new_password ? 'text' : 'password'}
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))}
                      required
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('new_password')}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      <i className={`fas ${passwordVisibility.new_password ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={passwordVisibility.confirm_password ? 'text' : 'password'}
                      value={passwordForm.confirm_password}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                      required
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('confirm_password')}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      <i className={`fas ${passwordVisibility.confirm_password ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-lg"
                  >
                    {isLoading ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Updating...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save mr-2"></i>
                        Change Password
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </Modal>

          {/* Change Username Modal */}
          <Modal 
            isOpen={isUsernameModalOpen} 
            onClose={() => setIsUsernameModalOpen(false)} 
            title="Change Username"
            size="md"
          >
            <div className="p-6">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                  <i className="fas fa-user-edit text-green-600 text-xl"></i>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Update Your Username</h3>
                  <p className="text-sm text-gray-600">Choose a unique username for your account</p>
                </div>
              </div>

              <form onSubmit={handleUsernameSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Username</label>
                  <input
                    type="text"
                    value={usernameForm.new_username}
                    onChange={(e) => setUsernameForm(prev => ({ ...prev, new_username: e.target.value }))}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    placeholder="Enter new username"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsUsernameModalOpen(false)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={passwordVisibility.confirm_password ? 'text' : 'password'}
                      value={passwordForm.confirm_password}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                      required
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('confirm_password')}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      <i className={`fas ${passwordVisibility.confirm_password ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                </div>

                {/* Password Match Status */}
                {passwordForm.confirm_password && (
                  <div className="text-sm">
                    {checkPasswordMatch() ? (
                      <div className="flex items-center text-green-600 bg-green-50 p-3 rounded-lg">
                        <i className="fas fa-check-circle mr-2"></i>
                        <span>Passwords match!</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-red-600 bg-red-50 p-3 rounded-lg">
                        <i className="fas fa-times-circle mr-2"></i>
                        <span>Passwords do not match</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !checkPasswordMatch()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-lg"
                  >
                    {isLoading ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Updating...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save mr-2"></i>
                        Update Password
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </Modal>
        </div>
      </div>
    </AdminLayout>
  );
}

export default SettingsProfile;
