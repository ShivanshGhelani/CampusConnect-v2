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
      console.log('API Response:', response); // Debug log

      if (response.data.success) {
        const profile = response.data.profile;
        console.log('Profile data:', profile); // Debug log

        setProfileForm({
          fullname: profile.fullname || '',
          email: profile.email || '',
          phone: profile.phone || ''
        });

        setUsernameForm(prev => ({
          ...prev,
          username: profile.username || ''
        }));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setError('Failed to load profile data');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await adminAPI.updateProfile(profileForm);
      if (response.success) {
        setSuccessMessage('Profile updated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(response.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      setError('An error occurred while updating profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError('New passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await adminAPI.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });

      if (response.success) {
        setSuccessMessage('Password changed successfully!');
        setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
        setIsPasswordModalOpen(false);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(response.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Password change error:', error);
      setError('An error occurred while changing password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await adminAPI.changeUsername({
        new_username: usernameForm.username,
        current_password: usernameForm.current_password
      });

      if (response.success) {
        setSuccessMessage('Username changed successfully!');
        setUsernameForm(prev => ({ ...prev, current_password: '' }));
        setIsUsernameModalOpen(false);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(response.message || 'Failed to change username');
      }
    } catch (error) {
      console.error('Username change error:', error);
      setError('An error occurred while changing username');
    } finally {
      setIsLoading(false);
    }
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

  // Function to get initials from full name
  const getInitials = (fullname) => {
    if (!fullname) return 'A';
    const names = fullname.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  if (profileLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header with Avatar */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-8 text-white mb-8 shadow-lg">
            <div className="flex items-center space-x-6">
              {/* Avatar Circle */}
              <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center border-4 border-white border-opacity-30">
                <span className="text-3xl font-bold text-black">
                  {getInitials(profileForm.fullname || user?.fullname)}
                </span>
              </div>

              {/* User Info */}
              <div>
                <h1 className="mt-4 text-4xl font-bold mb-1">
                  {profileForm.fullname || user?.fullname || 'Admin User'}
                </h1>
                <p className="text-lg text-blue-100 mb-2">
                  @{user?.username || 'admin'}
                </p>
              </div>
            </div>
          </div>

          {/* Success/Error Messages */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg mb-6">
              <div className="flex items-center">
                <i className="fas fa-check-circle mr-2"></i>
                {successMessage}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
              <div className="flex items-center">
                <i className="fas fa-exclamation-circle mr-2"></i>
                {error}
              </div>
            </div>
          )}

          {/* Main Content - Compact Layout */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Profile Information */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-gray-900">Profile Information</h3>
                <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  <i className="fas fa-user mr-1"></i>
                  {user?.username || 'Admin'}
                </div>
              </div>

              {/* User Info Display */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mr-4">
                    <i className="fas fa-id-card text-white text-lg"></i>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-600 mb-1">Full Name</div>
                    <div className="font-semibold text-gray-900 text-lg">
                      {profileForm.fullname || (
                        <span className="text-gray-400 italic">Not provided</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mr-4">
                    <i className="fas fa-envelope text-white text-lg"></i>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-600 mb-1">Email</div>
                    <div className="font-semibold text-gray-900 text-lg">
                      {profileForm.email || (
                        <span className="text-gray-400 italic">Not provided</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mr-4">
                    <i className="fas fa-phone text-white text-lg"></i>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-600 mb-1">Phone</div>
                    <div className="font-semibold text-gray-900 text-lg">
                      {profileForm.phone || (
                        <span className="text-gray-400 italic">Not provided</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Update Profile Form */}
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={profileForm.fullname}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, fullname: e.target.value }))}
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
            </div>

            {/* Security Settings */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-8">Security Settings</h3>
              <div className="space-y-4">
                <button
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl hover:from-blue-100 hover:to-blue-200 transition-all duration-200 border border-blue-200"
                >
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mr-4">
                      <i className="fas fa-key text-white text-lg"></i>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-900 text-lg">Change Password</div>
                      <div className="text-sm text-gray-600">Update your account password</div>
                    </div>
                  </div>
                  <i className="fas fa-chevron-right text-gray-400 text-lg"></i>
                </button>

                <button
                  onClick={() => setIsUsernameModalOpen(true)}
                  className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl hover:from-green-100 hover:to-green-200 transition-all duration-200 border border-green-200"
                >
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mr-4">
                      <i className="fas fa-user-edit text-white text-lg"></i>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-900 text-lg">Change Username</div>
                      <div className="text-sm text-gray-600">Update your username</div>
                    </div>
                  </div>
                  <i className="fas fa-chevron-right text-gray-400 text-lg"></i>
                </button>
              </div>

              {/* Security Status */}
              <div className="mt-8 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="size-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                    </svg>

                  </div>
                  <div>
                    <div className="font-semibold text-green-800 text-lg">Account Secure</div>
                    <div className="text-sm text-green-600">All security features are active</div>
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

                {/* Password Match Indicator */}
                {passwordForm.new_password && passwordForm.confirm_password && (
                  <div className="mt-3">
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
                    value={usernameForm.username}
                    onChange={(e) => setUsernameForm(prev => ({ ...prev, username: e.target.value }))}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    placeholder="Enter new username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                  <input
                    type="password"
                    value={usernameForm.current_password}
                    onChange={(e) => setUsernameForm(prev => ({ ...prev, current_password: e.target.value }))}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    placeholder="Enter current password to confirm"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsUsernameModalOpen(false)}
                    className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-lg"
                  >
                    {isLoading ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Updating...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save mr-2"></i>
                        Update Username
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
