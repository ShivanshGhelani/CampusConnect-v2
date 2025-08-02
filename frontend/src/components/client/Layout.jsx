import React from 'react';
import ClientNavigation from './Navigation';
import TopBanner from './TopBanner';

function ClientLayout({ children, noPadding = false }) {
  return (
    <div className="min-h-screen">
      <TopBanner />
      <ClientNavigation />
      <div className="pt-28"> {/* Increased padding to account for fixed top banner + fixed navigation */}
        <main>
          {children}
        </main>
      </div>
    </div>
  );
}

export default ClientLayout;
