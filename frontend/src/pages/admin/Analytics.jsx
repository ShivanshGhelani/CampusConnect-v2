import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

function Analytics() {
  return (
    <AdminLayout>
      <div className="container-custom">
        <div className="card">
          <div className="card-header">
            <h1 className="text-2xl font-bold">Analytics & Reports</h1>
          </div>
          <div className="card-content">
            <p className="text-gray-600">
              This page will contain detailed analytics, charts, and reports.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default Analytics;
