import React from 'react';
import { Outlet } from 'react-router-dom';
import ClientLayout from '../client/Layout';

function PersistentClientLayout() {
  return (
    <ClientLayout>
      <Outlet />
    </ClientLayout>
  );
}

export default PersistentClientLayout;
