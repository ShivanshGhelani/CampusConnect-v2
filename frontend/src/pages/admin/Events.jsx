import React from 'react';
import AdminLayout from '../../components/admin/Layout';

function Events() {
  return (
    <AdminLayout>
      <div className="container-custom">
        <div className="card">
          <div className="card-header">
            <h1 className="text-2xl font-bold">Event Management</h1>
          </div>
          <div className="card-content">
            <p className="text-gray-600">
              This page will contain event creation, editing, and management features.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default Events;
