import React, { useState, useEffect } from 'react';
import QRCodeDisplay from './QRCodeDisplay';
import qrCodeService from '../../services/QRCodeService';

const QRCodeModal = ({ isOpen, onClose, registrationData }) => {
  const [qrCodeURL, setQRCodeURL] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Generate QR code when modal opens
  useEffect(() => {
    if (isOpen && registrationData) {
      generateQRCode();
    }
  }, [isOpen, registrationData]);

  const generateQRCode = async () => {
    if (!registrationData?.registration || !registrationData?.event) {
      setError('Invalid registration data');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const qrURL = await qrCodeService.generateAttendanceQR(
        registrationData.registration,
        registrationData.event
      );
      setQRCodeURL(qrURL);
    } catch (err) {
      
      setError('Failed to generate QR code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (qrCodeURL) {
      const filename = qrCodeService.generateFilename(
        registrationData.registration,
        registrationData.event
      );
      qrCodeService.downloadQRCode(qrCodeURL, filename);
    }
  };

  const isTeamRegistration = registrationData?.registrationType === 'team' || 
                            registrationData?.registrationType === 'team_leader';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {isTeamRegistration ? 'Team QR Code' : 'Attendance QR Code'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {registrationData?.eventName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-sm text-gray-600 mt-2">Generating QR code...</p>
            </div>
          ) : qrCodeURL ? (
            <div className="space-y-4">
              {/* QR Code Display */}
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200 shadow-sm">
                  <img 
                    src={qrCodeURL} 
                    alt="Attendance QR Code" 
                    className="w-64 h-64 object-contain"
                  />
                </div>
              </div>

              {/* Registration Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Registration Type</p>
                    <p className="font-medium text-gray-900">
                      {isTeamRegistration ? `Team Registration${registrationData?.teamName ? ` - ${registrationData.teamName}` : ''}` : 'Individual Registration'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Registration ID</p>
                    <p className="font-mono font-medium text-gray-900">
                      {registrationData?.registration?.registration_id || registrationData?.registration?.registrar_id || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Team Instructions */}
              {isTeamRegistration && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-900 mb-2">Team Attendance Instructions</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• This single QR code represents your entire team</li>
                        <li>• When scanned, organizers can see all team members</li>
                        <li>• Organizers can mark present/absent for each member individually</li>
                        <li>• Team members don't need to be together when marking attendance</li>
                        <li>• Subsequent scans will show previously marked members</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Individual Instructions */}
              {!isTeamRegistration && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-green-900 mb-2">Attendance Instructions</h4>
                      <p className="text-sm text-green-800">
                        Present this QR code to event organizers for attendance marking. 
                        A single scan will mark you as present for the event.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Download Button */}
              <div className="flex justify-center pt-2">
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download QR Code
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;
