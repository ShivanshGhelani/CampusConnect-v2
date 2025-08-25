import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import ClientLayout from '../client/Layout';

function PersistentClientLayout() {
  const location = useLocation();
  
  // Check if current route is an event detail page
  const isEventDetailPage = location.pathname.includes('/events/') && 
                           !location.pathname.includes('/feedback') && 
                           !location.pathname.includes('/certificate') && 
                           !location.pathname.includes('/registration') && 
                           !location.pathname.includes('/attendance');
  
  return (
    <ClientLayout noPadding={isEventDetailPage}>
      <Outlet />
    </ClientLayout>
  );
}

export default PersistentClientLayout;
