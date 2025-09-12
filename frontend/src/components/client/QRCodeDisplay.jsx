import React, { useState, useEffect } from 'react';
import { qrCodeService } from '../../services/QRCodeService';
import LoadingSpinner from '../LoadingSpinner';

/**
 * QR Code Display Component
 * Generates and displays QR codes for event registration
 */
const QRCodeDisplay = ({ 
  registrationData, 
  eventData, 
  size = 'medium',
  showDownload = true,
  showDetails = true,
  className = '',
  style = 'default'
}) => {
  
  
  
  
  
  const [qrCodeDataURL, setQrCodeDataURL] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloadLoading, setDownloadLoading] = useState(false);

  // Size configurations
  const sizeConfig = {
    small: { width: 150, displaySize: 'w-32 h-32' },
    medium: { width: 256, displaySize: 'w-48 h-48' },
    large: { width: 350, displaySize: 'w-64 h-64' },
    xlarge: { width: 512, displaySize: 'w-80 h-80' }
  };

  // Style configurations
  const styleConfig = {
    default: { primaryColor: '#1f2937', backgroundColor: '#ffffff' },
    blue: { primaryColor: '#2563eb', backgroundColor: '#ffffff' },
    green: { primaryColor: '#059669', backgroundColor: '#ffffff' },
    purple: { primaryColor: '#7c3aed', backgroundColor: '#ffffff' },
    branded: { primaryColor: '#1e40af', backgroundColor: '#f8fafc' }
  };

  const currentSize = sizeConfig[size] || sizeConfig.medium;
  const currentStyle = styleConfig[style] || styleConfig.default;

  // Generate QR code on component mount
  useEffect(() => {
    const generateQR = async () => {
      console.log('QRCodeDisplay: Starting generateQR function');
      console.log('QRCodeDisplay: registrationData:', registrationData);
      console.log('QRCodeDisplay: eventData:', eventData);
      
      if (!registrationData || !eventData) {
        console.log('QRCodeDisplay: Missing data, setting error and loading false');
        setError('Missing registration or event data');
        setLoading(false);
        return;
      }

      // Add timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.error('QRCodeDisplay: Generation timeout after 15 seconds');
        setError('QR generation timed out. Please try again.');
        setLoading(false);
      }, 15000);

      try {
        console.log('QRCodeDisplay: Starting QR generation...');
        setLoading(true);
        setError('');

        console.log('QRCodeDisplay: Generating QR with:', {
          registrationData,
          eventData,
          size,
          style
        });

        const options = {
          width: currentSize.width,
          ...currentStyle
        };

        console.log('QRCodeDisplay: Calling qrCodeService.generateQRData...');
        const qrData = await qrCodeService.generateQRData(registrationData, eventData);
        console.log('QRCodeDisplay: Generated QR data:', qrData);
        
        console.log('QRCodeDisplay: Calling qrCodeService.generateQRCode...');
        const qrCodeURL = await qrCodeService.generateQRCode(qrData, options);
        console.log('QRCodeDisplay: Generated QR code URL:', qrCodeURL ? 'Success' : 'Failed');

        if (qrCodeURL) {
          clearTimeout(timeoutId);
          setQrCodeDataURL(qrCodeURL);
          console.log('QRCodeDisplay: Successfully set QR code URL');
        } else {
          clearTimeout(timeoutId);
          throw new Error('QR code generation returned null/undefined');
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.error('QRCodeDisplay: Error:', err);
        console.error('QRCodeDisplay: Error stack:', err.stack);
        setError('Failed to generate QR code: ' + err.message);
      } finally {
        console.log('QRCodeDisplay: Setting loading to false');
        setLoading(false);
      }
    };

    // Only generate QR if we have the required data and we haven't generated it yet
    if (registrationData && eventData && !qrCodeDataURL && !loading) {
      console.log('QRCodeDisplay: Conditions met, calling generateQR...');
      generateQR();
    } else {
      console.log('QRCodeDisplay: Skipping generateQR - loading:', loading, 'hasData:', !!(registrationData && eventData), 'hasQR:', !!qrCodeDataURL);
    }
  }, [registrationData, eventData, size, style, currentSize.width]);

  // Handle QR code download
  const handleDownload = async () => {
    try {
      setDownloadLoading(true);
      
      // Generate high-resolution QR code for download
      const highResQR = await qrCodeService.generateDownloadableQR(
        registrationData, 
        eventData
      );
      
      const filename = qrCodeService.generateFilename(registrationData, eventData);
      qrCodeService.downloadQRCode(highResQR, filename);
    } catch (err) {
      
      setError('Failed to download QR code');
    } finally {
      setDownloadLoading(false);
    }
  };

  // Copy QR data to clipboard (for debugging)
  const handleCopyData = async () => {
    try {
      const qrData = await qrCodeService.generateQRData(registrationData, eventData);
      await navigator.clipboard.writeText(JSON.stringify(qrData, null, 2));
      
    } catch (err) {
      
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${currentSize.displaySize} ${className}`}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !qrCodeDataURL) {
    return (
      <div className={`flex flex-col items-center justify-center ${currentSize.displaySize} bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg ${className}`}>
        <i className="fas fa-exclamation-triangle text-red-500 text-2xl mb-2"></i>
        <p className="text-red-600 text-sm text-center px-2">
          {error || 'Failed to generate QR code'}
        </p>
      </div>
    );
  }

  return (
    <div className={`qr-code-display ${className}`}>
      {/* QR Code Image */}
      <div className="qr-code-container text-center">
        <div className={`inline-block p-4 bg-white rounded-lg shadow-md border border-gray-200`}>
          <img 
            src={qrCodeDataURL} 
            alt="Registration QR Code" 
            className={`${currentSize.displaySize} mx-auto`}
          />
        </div>
      </div>

      {/* QR Code Details */}
      {showDetails && (
        <div className="qr-details mt-4 text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center justify-center">
              <i className="fas fa-qrcode mr-2"></i>
              Attendance QR Code
            </h4>
            <p className="text-xs text-blue-700">
              Show this QR code to event organizers for attendance marking
            </p>
          </div>

          {/* Registration Info */}
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span className="font-medium">Registration ID:</span>
              <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                {registrationData.registration_id || registrationData.registrar_id}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Event:</span>
              <span className="truncate ml-2">
                {eventData.event_name || eventData.title || eventData.name}
              </span>
            </div>
            {registrationData.registration_type === 'team' || registrationData.registration_type === 'team_leader' ? (
              <div className="flex justify-between">
                <span className="font-medium">Team:</span>
                <span className="truncate ml-2">
                  {registrationData.team_name || registrationData.student_data?.team_name || 'N/A'}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {showDownload && (
        <div className="qr-actions mt-4 flex flex-col sm:flex-row gap-2 justify-center">
          <button
            onClick={handleDownload}
            disabled={downloadLoading}
            className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center justify-center"
          >
            {downloadLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Preparing...
              </>
            ) : (
              <>
                <i className="fas fa-download mr-2"></i>
                Download QR Code
              </>
            )}
          </button>
        </div>
      )}

      {/* Usage Instructions */}
      <div className="usage-instructions mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h5 className="text-sm font-semibold text-yellow-800 mb-2 flex items-center">
          <i className="fas fa-info-circle mr-2"></i>
          How to use this QR Code
        </h5>
        <ul className="text-xs text-yellow-700 space-y-1">
          <li>• Present this QR code to event volunteers for attendance marking</li>
          <li>• Download and save to your device for offline access</li>
          <li>• One QR code works for all attendance sessions during the event</li>
          {registrationData.registration_type === 'team' || registrationData.registration_type === 'team_leader' ? (
            <li>• Team leader should present this QR for entire team attendance</li>
          ) : null}
          <li>• Keep your Registration ID handy as backup verification</li>
        </ul>
      </div>
    </div>
  );
};

/**
 * Compact QR Code Component (for cards, lists, etc.)
 */
export const QRCodeCompact = ({ 
  registrationData, 
  eventData, 
  onDownload,
  className = '' 
}) => {
  const [qrCodeDataURL, setQrCodeDataURL] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const generateQR = async () => {
      if (!registrationData || !eventData) return;

      try {
        const qrCodeURL = await qrCodeService.generateAttendanceQR(
          registrationData, 
          eventData
        );
        setQrCodeDataURL(qrCodeURL);
      } catch (err) {
        
      } finally {
        setLoading(false);
      }
    };

    generateQR();
  }, [registrationData, eventData]);

  if (loading) {
    return (
      <div className={`w-20 h-20 flex items-center justify-center border border-gray-200 rounded ${className}`}>
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  if (!qrCodeDataURL) {
    return (
      <div className={`w-20 h-20 flex items-center justify-center bg-gray-100 border border-gray-200 rounded ${className}`}>
        <i className="fas fa-qrcode text-gray-400"></i>
      </div>
    );
  }

  return (
    <div className={`qr-compact ${className}`}>
      <img 
        src={qrCodeDataURL} 
        alt="QR Code" 
        className="w-20 h-20 border border-gray-200 rounded cursor-pointer hover:shadow-md transition-shadow"
        onClick={onDownload}
        title="Click to download QR code"
      />
    </div>
  );
};

export default QRCodeDisplay;
