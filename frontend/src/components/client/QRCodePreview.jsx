import React from 'react';
import { usePreviewQRCode } from '../../hooks/useQRCode';
import LoadingSpinner from '../LoadingSpinner';

/**
 * QR Code Preview Component for Registration Forms
 * Shows a preview of what the QR code will look like before registration
 */
const QRCodePreview = ({ 
  formData, 
  eventData, 
  tempRegistrationId, 
  className = '',
  showInModal = false 
}) => {
  const { previewQR, loading } = usePreviewQRCode(formData, eventData, tempRegistrationId);

  if (!formData || !eventData || !tempRegistrationId) {
    return null;
  }

  const isTeamRegistration = formData.participants && formData.participants.length > 0;

  if (showInModal) {
    return (
      <div className="qr-preview-modal">
        <div className="bg-white rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            QR Code Preview
          </h3>
          <QRPreviewContent 
            previewQR={previewQR}
            loading={loading}
            formData={formData}
            isTeamRegistration={isTeamRegistration}
            tempRegistrationId={tempRegistrationId}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`qr-preview-card bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center">
        <i className="fas fa-eye mr-2"></i>
        QR Code Preview
      </h4>
      <QRPreviewContent 
        previewQR={previewQR}
        loading={loading}
        formData={formData}
        isTeamRegistration={isTeamRegistration}
        tempRegistrationId={tempRegistrationId}
        compact={true}
      />
    </div>
  );
};

/**
 * QR Preview Content Component
 */
const QRPreviewContent = ({ 
  previewQR, 
  loading, 
  formData, 
  isTeamRegistration, 
  tempRegistrationId,
  compact = false 
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="md" />
        <span className="ml-2 text-sm text-gray-600">Generating preview...</span>
      </div>
    );
  }

  if (!previewQR) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-500">
        <i className="fas fa-qrcode text-3xl mb-2 opacity-50"></i>
        <p className="text-sm">QR code will appear here after form completion</p>
      </div>
    );
  }

  return (
    <div className="qr-preview-content">
      {/* QR Code Image */}
      <div className="text-center mb-4">
        <div className="inline-block p-3 bg-white rounded-lg shadow-sm border">
          <img 
            src={previewQR} 
            alt="QR Code Preview" 
            className={compact ? "w-24 h-24" : "w-32 h-32"}
          />
        </div>
        <p className="text-xs text-blue-700 mt-2">
          This is how your attendance QR code will look
        </p>
      </div>

      {/* Preview Details */}
      {!compact && (
        <div className="bg-white rounded-lg p-3 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="font-medium text-gray-700">Registration ID:</span>
            <span className="font-mono bg-gray-100 px-2 py-1 rounded">
              {tempRegistrationId}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="font-medium text-gray-700">Student:</span>
            <span className="truncate ml-2">
              {formData.full_name || 'Your Name'}
            </span>
          </div>
          {isTeamRegistration && (
            <div className="flex justify-between text-xs">
              <span className="font-medium text-gray-700">Team:</span>
              <span className="truncate ml-2">
                {formData.team_name || 'Team Name'}
              </span>
            </div>
          )}
          <div className="flex justify-between text-xs">
            <span className="font-medium text-gray-700">Type:</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
              {isTeamRegistration ? 'Team Registration' : 'Individual'}
            </span>
          </div>
        </div>
      )}

      {/* Compact Details */}
      {compact && (
        <div className="text-center">
          <p className="text-xs text-gray-600 mb-1">
            <strong>{formData.full_name || 'Your Name'}</strong>
          </p>
          {isTeamRegistration && (
            <p className="text-xs text-blue-700">
              Team: {formData.team_name || 'Team Name'}
            </p>
          )}
          <p className="text-xs font-mono text-gray-500">
            ID: {tempRegistrationId.slice(-8)}...
          </p>
        </div>
      )}

      {/* Info Note */}
      <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mt-3">
        <p className="text-xs text-yellow-800 flex items-start">
          <i className="fas fa-info-circle mr-1 mt-0.5 flex-shrink-0"></i>
          You'll get the final QR code after successful registration completion.
        </p>
      </div>
    </div>
  );
};

/**
 * QR Code Preview Button/Trigger
 */
export const QRPreviewTrigger = ({ 
  formData, 
  eventData, 
  tempRegistrationId, 
  onClick,
  disabled = false 
}) => {
  const hasRequiredData = formData?.full_name && formData?.enrollment_no && tempRegistrationId;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !hasRequiredData}
      className={`
        inline-flex items-center px-3 py-2 border border-blue-300 rounded-lg text-sm font-medium
        ${hasRequiredData && !disabled 
          ? 'text-blue-700 bg-blue-50 hover:bg-blue-100 hover:border-blue-400' 
          : 'text-gray-400 bg-gray-50 cursor-not-allowed'
        }
        transition-colors duration-200
      `}
    >
      <i className="fas fa-qrcode mr-2"></i>
      Preview QR Code
    </button>
  );
};

export default QRCodePreview;
