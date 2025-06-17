import React from 'react';
import ClientNavigation from './Navigation';

function ClientLayout({ children, noPadding = false }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <ClientNavigation />
      <main className={noPadding ? "" : "py-8"}>
        {children}
      </main>
    </div>
  );
}

export default ClientLayout;
