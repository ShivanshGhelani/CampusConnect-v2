import React from 'react';
import ClientNavigation from './Navigation';
import TopBanner from './TopBanner';

function ClientLayout({ children, noPadding = false }) {
  return (
    <div className="min-h-screen">
      <TopBanner />
      <div className="pt-8"> {/* Add padding to account for fixed top banner */}
        <ClientNavigation />
        <main>
          {children}
        </main>
      </div>
    </div>
  );
}

export default ClientLayout;
