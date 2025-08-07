import React from 'react';
import { ToastProvider } from '../components/ui';
import ComponentShowcase from './ComponentShowcase';

const ComponentShowcaseWithToast = () => {
  return (
    <ToastProvider position="top-right">
      <ComponentShowcase />
    </ToastProvider>
  );
};

export default ComponentShowcaseWithToast;
