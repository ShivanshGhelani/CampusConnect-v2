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
  
  // Check if current route is homepage (should have no padding for hero section)
  const isHomepage = location.pathname === '/';
  
  // Check if current route is events list page (should have no padding for custom header)
  const isEventsListPage = location.pathname === '/client/events' || location.pathname === '/events';
  
  return (
    <ClientLayout noPadding={isEventDetailPage || isHomepage || isEventsListPage}>
      <Outlet />
    </ClientLayout>
  );
}

export default PersistentClientLayout;
