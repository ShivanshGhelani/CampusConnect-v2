import React from 'react';
import AdminNavigation from './Navigation';

function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNavigation />
      <main className="py-8">
        {children}
      </main>
    </div>
  );
}

export default AdminLayout;
