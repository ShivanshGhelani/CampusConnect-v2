import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

function Students() {
  return (
    <AdminLayout>
      <div className="container-custom">
        <div className="card">
          <div className="card-header">
            <h1 className="text-2xl font-bold">Student Management</h1>
          </div>
          <div className="card-content">
            <p className="text-gray-600">
              This page will contain student data management, bulk operations, and analytics.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default Students;
