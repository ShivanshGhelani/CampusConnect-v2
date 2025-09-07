import { useState, useEffect, useCallback } from 'react';
import { qrCodeService } from '../services/QRCodeService';

/**
 * Hook for QR code generation and management
 * @param {Object} registrationData - Registration details
 * @param {Object} eventData - Event details
 * @param {Object} options - QR generation options
 * @returns {Object} QR code state and methods
 */
export const useQRCode = (registrationData, eventData, options = {}) => {
  const [qrCodeDataURL, setQrCodeDataURL] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateQR = useCallback(async () => {
    if (!registrationData || !eventData) {
      setError('Missing registration or event data');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Use the async generateQRData method that now calls backend
      const qrData = await qrCodeService.generateQRData(registrationData, eventData);
      const qrURL = await qrCodeService.generateQRCode(qrData, options);
      
      setQrCodeDataURL(qrURL);
    } catch (err) {
      
      setError(err.message || 'Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  }, [registrationData, eventData, options]);

  const downloadQR = useCallback(async () => {
    try {
      const highResQR = await qrCodeService.generateDownloadableQR(registrationData, eventData);
      const filename = qrCodeService.generateFilename(registrationData, eventData);
      qrCodeService.downloadQRCode(highResQR, filename);
    } catch (err) {
      
      throw err;
    }
  }, [registrationData, eventData]);

  const regenerateQR = useCallback(() => {
    setQrCodeDataURL(null);
    generateQR();
  }, [generateQR]);

  // Auto-generate QR code when data is available
  useEffect(() => {
    if (registrationData && eventData) {
      generateQR();
    }
  }, [generateQR, registrationData, eventData]);

  return {
    qrCodeDataURL,
    loading,
    error,
    generateQR,
    downloadQR,
    regenerateQR
  };
};

/**
 * Hook for managing QR code in registration forms (before submission)
 * @param {Object} formData - Form data
 * @param {Object} eventData - Event details
 * @param {string} tempRegistrationId - Temporary registration ID
 * @returns {Object} Preview QR code state and methods
 */
export const usePreviewQRCode = (formData, eventData, tempRegistrationId) => {
  const [previewQR, setPreviewQR] = useState(null);
  const [loading, setLoading] = useState(false);

  const generatePreviewQR = useCallback(async () => {
    if (!formData || !eventData || !tempRegistrationId) return;

    try {
      setLoading(true);
      
      // Create mock registration data for preview
      const mockRegistrationData = {
        registration_id: tempRegistrationId,
        registration_type: formData.participants?.length > 0 ? 'team' : 'individual',
        full_name: formData.full_name,
        enrollment_no: formData.enrollment_no,
        department: formData.department,
        email: formData.email,
        team_name: formData.team_name,
        team_members: formData.participants || []
      };

      // Use the async generateQRData method for preview as well
      const qrData = await qrCodeService.generateQRData(mockRegistrationData, eventData);
      const qrURL = await qrCodeService.generateQRCode(qrData, { width: 200 });
      
      setPreviewQR(qrURL);
    } catch (err) {
      
    } finally {
      setLoading(false);
    }
  }, [formData, eventData, tempRegistrationId]);

  // Generate preview when data changes
  useEffect(() => {
    if (formData && eventData && tempRegistrationId) {
      generatePreviewQR();
    }
  }, [generatePreviewQR]);

  return {
    previewQR,
    loading,
    generatePreviewQR
  };
};

export default useQRCode;
