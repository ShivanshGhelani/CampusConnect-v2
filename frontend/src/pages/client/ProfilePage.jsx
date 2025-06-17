import React from 'react';
import ClientLayout from '../../components/client/Layout';

function ProfilePage() {
  return (
    <ClientLayout>
      <div className="container-custom">
        <div className="card">
          <div className="card-header">
            <h1 className="text-2xl font-bold">My Profile</h1>
          </div>
          <div className="card-content">
            <p className="text-gray-600">
              This page will contain the user's profile information and settings.
            </p>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}

export default ProfilePage;
