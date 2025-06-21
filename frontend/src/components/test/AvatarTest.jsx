import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAvatar } from '../../hooks/useAvatar';
import Avatar from '../common/Avatar';

function AvatarTest() {
  const { user } = useAuth();
  const { avatarUrl, refreshAvatar } = useAvatar(user);

  return (
    <div className="p-8 space-y-6">
      <h2 className="text-2xl font-bold">Avatar Test Component</h2>
      
      <div className="grid grid-cols-4 gap-4">
        <div className="text-center">
          <Avatar src={avatarUrl} size="sm" name={user?.full_name} />
          <p className="text-sm mt-2">Small</p>
        </div>
        
        <div className="text-center">
          <Avatar src={avatarUrl} size="md" name={user?.full_name} />
          <p className="text-sm mt-2">Medium</p>
        </div>
        
        <div className="text-center">
          <Avatar src={avatarUrl} size="lg" name={user?.full_name} />
          <p className="text-sm mt-2">Large</p>
        </div>
        
        <div className="text-center">
          <Avatar src={avatarUrl} size="xl" name={user?.full_name} />
          <p className="text-sm mt-2">Extra Large</p>
        </div>
      </div>
      
      <div>
        <button 
          onClick={refreshAvatar}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Refresh Avatar
        </button>
      </div>
      
      <div className="text-sm text-gray-600">
        <p><strong>User:</strong> {user?.full_name || 'Not logged in'}</p>
        <p><strong>Avatar URL:</strong> {avatarUrl || 'No avatar'}</p>
      </div>
    </div>
  );
}

export default AvatarTest;
