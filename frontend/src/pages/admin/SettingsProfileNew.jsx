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
          phone: profile.phone || profile.mobile_no || '' // Check both fields
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
          phone: user.phone || user.mobile_no || '' // Check both fields
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
    <AdminLayout pageTitle="My Profile">
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header Section */}
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">My Profile</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              View and manage your account information, update your personal details, and configure security settings
            </p>
            {user?.role === 'organizer_admin' && (
              <div className="mt-6">
                <button
                  onClick={() => window.history.back()}
                  className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <i className="fas fa-arrow-left mr-2"></i>
                  Back to Events
                </button>
              </div>
            )}
          </div>

          {/* Flash Messages */}
          {(successMessage || error) && (
            <div className="mb-8">
              {successMessage && (
                <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <i className="fas fa-check-circle text-green-400 text-xl"></i>
                    </div>
                    <div className="ml-3">
                      <p className="text-green-800 font-medium">{successMessage}</p>
                    </div>
                    <button
                      onClick={() => setSuccessMessage('')}
                      className="ml-auto text-green-600 hover:text-green-800"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                </div>
              )}
              {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <i className="fas fa-exclamation-circle text-red-400 text-xl"></i>
                    </div>
                    <div className="ml-3">
                      <p className="text-red-800 font-medium">{error}</p>
                    </div>
                    <button
                      onClick={() => setError('')}
                      className="ml-auto text-red-600 hover:text-red-800"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Main Content */}
          <div className="space-y-8">
            {/* Profile Overview Card */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-12 text-white">
                <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-8">
                  <div className="relative">
                    <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white text-3xl font-bold border-2 border-white/30">
                      {getUserInitials(user)}
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-400 rounded-full border-3 border-white flex items-center justify-center">
                      <i className="fas fa-check text-white text-sm"></i>
                    </div>
                  </div>
                  <div className="text-center md:text-left flex-1">
                    <h2 className="text-3xl font-bold mb-2">{user?.fullname || 'Admin User'}</h2>
                    <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4 text-blue-100">
                      <span className="inline-flex items-center justify-center md:justify-start">
                        <i className="fas fa-user-shield mr-2"></i>
                        <span className="font-medium capitalize">
                          {user?.role?.replace('_', ' ') || 'Administrator'}
                        </span>
                      </span>
                      <span className="hidden md:inline">•</span>
                      <span className="inline-flex items-center justify-center md:justify-start">
                        <i className="fas fa-circle text-green-300 mr-2 text-xs"></i>
                        Active Account
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Account Information Section */}
              <div className="p-8">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Account Information</h3>
                  <p className="text-gray-600">Your current account details are displayed below</p>
                </div>
                
                {profileLoading ? (
                  <div className="flex justify-center py-12">
                    <LoadingSpinner size="lg" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Username */}
                    <div className="group">
                      <div className="bg-gray-50 rounded-xl p-6 border-2 border-transparent group-hover:border-blue-100 transition-all duration-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                              <i className="fas fa-user text-blue-600"></i>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Username</p>
                              <p className="text-sm text-gray-400">Your login identifier</p>
                            </div>
                          </div>
                        </div>
                        <p className="text-xl font-bold text-gray-900 break-all">
                          {usernameForm.username || user?.username || 'Not available'}
                        </p>
                      </div>
                    </div>

                    {/* Email */}
                    <div className="group">
                      <div className="bg-gray-50 rounded-xl p-6 border-2 border-transparent group-hover:border-green-100 transition-all duration-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                              <i className="fas fa-envelope text-green-600"></i>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Email Address</p>
                              <p className="text-sm text-gray-400">Your contact email</p>
                            </div>
                          </div>
                        </div>
                        <div className="relative group/email">
                          <p className="text-lg font-bold text-gray-900 break-all" title={profileForm.email || 'Not provided'}>
                            {profileForm.email || (
                              <span className="text-gray-400 italic">Not provided</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="group">
                      <div className="bg-gray-50 rounded-xl p-6 border-2 border-transparent group-hover:border-purple-100 transition-all duration-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                              <i className="fas fa-phone text-purple-600"></i>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Phone Number</p>
                              <p className="text-sm text-gray-400">Your mobile number</p>
                            </div>
                          </div>
                        </div>
                        <p className="text-xl font-bold text-gray-900">
                          {profileForm.phone || (
                            <span className="text-gray-400 italic">Not provided</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Update Profile Section */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Update Your Information</h3>
                <p className="text-gray-600">Keep your profile information up to date. Changes will be saved to your account.</p>
              </div>
              
              {profileLoading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              ) : (
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Full Name */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        <i className="fas fa-user mr-2 text-blue-600"></i>
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={profileForm.fullname}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, fullname: e.target.value }))}
                        required
                        className="w-full px-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
                        placeholder="Enter your full name"
                      />
                      <p className="mt-2 text-sm text-gray-500">This is how your name will appear throughout the system</p>
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        <i className="fas fa-phone mr-2 text-purple-600"></i>
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-200"
                        placeholder="Enter your phone number"
                      />
                      <p className="mt-2 text-sm text-gray-500">We may use this to contact you about important updates</p>
                    </div>
                  </div>

                  {/* Email Address */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                      <i className="fas fa-envelope mr-2 text-green-600"></i>
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-200"
                      placeholder="Enter your email address"
                    />
                    <p className="mt-2 text-sm text-gray-500">This will be used for notifications and account recovery</p>
                  </div>

                  {/* Update Button */}
                  <div className="pt-6">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 px-8 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {isLoading ? (
                        <>
                          <i className="fas fa-spinner fa-spin mr-3"></i>
                          Saving Changes...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save mr-3"></i>
                          Save Profile Changes
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Security Settings Section */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Security & Account Settings</h3>
                <p className="text-gray-600">Manage your login credentials and account security</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Change Password */}
                <button
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="group text-left p-6 bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-100 rounded-xl hover:border-red-200 hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mr-4 group-hover:bg-red-200 transition-colors">
                      <i className="fas fa-key text-red-600 text-xl"></i>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-gray-900 mb-2">Change Password</h4>
                      <p className="text-gray-600 mb-3">Update your account password for better security</p>
                      <span className="inline-flex items-center text-red-600 font-medium group-hover:text-red-700">
                        Update Password
                        <i className="fas fa-arrow-right ml-2 transform group-hover:translate-x-1 transition-transform"></i>
                      </span>
                    </div>
                  </div>
                </button>
                
                {/* Change Username */}
                <button
                  onClick={() => setIsUsernameModalOpen(true)}
                  className="group text-left p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-100 rounded-xl hover:border-blue-200 hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4 group-hover:bg-blue-200 transition-colors">
                      <i className="fas fa-user-edit text-blue-600 text-xl"></i>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-gray-900 mb-2">Change Username</h4>
                      <p className="text-gray-600 mb-3">Update your login username identifier</p>
                      <span className="inline-flex items-center text-blue-600 font-medium group-hover:text-blue-700">
                        Update Username
                        <i className="fas fa-arrow-right ml-2 transform group-hover:translate-x-1 transition-transform"></i>
                      </span>
                    </div>
                  </div>
                </button>
              </div>

              {/* Security Status */}
              <div className="mt-8 p-6 bg-green-50 border-2 border-green-100 rounded-xl">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                    <i className="fas fa-shield-check text-green-600 text-xl"></i>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-green-800">Account Security Active</h4>
                    <p className="text-green-600">Your account is secure and all security features are enabled</p>
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
