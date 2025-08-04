import React from 'react';
import ClientNavigation from './Navigation';
import TopBanner from './TopBanner';

function ClientLayout({ children, noPadding = false }) {
  return (
    <div className="min-h-screen">
      <TopBanner />
      <ClientNavigation />
      <div className={noPadding ? "" : "pt-20"}> {/* TopBanner (~32px with py-2 + content) + Navigation (64px) = ~96px, using pt-20 (80px) */}
        <main>
          {children}
        </main>
      </div>
    </div>
  );
}

export default ClientLayout;
