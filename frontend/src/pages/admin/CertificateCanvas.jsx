import React from 'react';
import Layout from '../../components/certificate-canvas/Layout';

/**
 * Certificate Canvas Page - Visual Certificate Designer
 * Drag-and-drop certificate builder with templates
 */
function CertificateCanvas() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Certificate Canvas */}
      <Layout />
    </div>
  );
}

export default CertificateCanvas;
