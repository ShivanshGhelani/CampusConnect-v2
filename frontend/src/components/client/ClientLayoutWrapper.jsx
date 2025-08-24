import React from 'react';
import { Outlet } from 'react-router-dom';
import ClientLayout from './Layout';

function ClientLayoutWrapper() {
  return (
    <ClientLayout>
      <Outlet />
    </ClientLayout>
  );
}

export default ClientLayoutWrapper;
