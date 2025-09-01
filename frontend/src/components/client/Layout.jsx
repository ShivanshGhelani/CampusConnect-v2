import React from 'react';
import ClientNavigation from './Navigation';
import TopBanner from './TopBanner';

function ClientLayout({ children, noPadding = false }) {
  return (
    <div className="min-h-screen">
      <TopBanner />
      <ClientNavigation />
      {/* Responsive padding for different navigation layouts */}
      <div className={noPadding ? "" : "pt-26 pb-0 md:pb-0 lg:pb-0"}> {/* TopBanner (40px) + Navigation (64px) = 104px = pt-26 */}
        <main className="pb-20 md:pb-0"> {/* Add bottom padding for mobile nav */}
          {children}
        </main>
      </div>
    </div>
  );
}

export default ClientLayout;
