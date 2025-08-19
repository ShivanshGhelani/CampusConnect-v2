import React, { useState, useEffect } from 'react';
import { qrCodeService } from '../../services/QRCodeService';
import LoadingSpinner from '../LoadingSpinner';

/**
 * Team QR Codes Display Component
 * Generates individual QR codes for each team member
 */
const TeamQRCodes = ({ 
  registrationData, 
  eventData, 
  className = '',
  showDownload = true 
}) => {
  const [teamQRCodes, setTeamQRCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingAll, setDownloadingAll] = useState(false);

  // Generate QR codes for all team members
  useEffect(() => {
    const generateTeamQRs = async () => {
      if (!registrationData || !eventData) {
        setError('Missing registration or event data');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        // Generate QR codes for all team members
        const qrCodesData = qrCodeService.generateTeamQRCodes(registrationData, eventData);
        
        // Generate actual QR code images
        const qrCodesWithImages = await Promise.all(
          qrCodesData.map(async (qrCodeData) => {
            const qrImageURL = await qrCodeService.generateQRCode(qrCodeData.qrData, {
              width: 200
            });
            
            return {
              ...qrCodeData,
              qrImageURL
            };
          })
        );

        setTeamQRCodes(qrCodesWithImages);
      } catch (err) {
        console.error('Error generating team QR codes:', err);
        setError('Failed to generate team QR codes');
      } finally {
        setLoading(false);
      }
    };

    generateTeamQRs();
  }, [registrationData, eventData]);

  // Download individual QR code
  const handleDownloadQR = async (qrCodeData, student) => {
    try {
      const highResQR = await qrCodeService.generateQRCode(qrCodeData.qrData, {
        width: 512,
        quality: 1.0,
        margin: 2
      });
      
      const filename = `QR_${eventData.event_name?.replace(/[^a-zA-Z0-9]/g, '_')}_${student.name.replace(/[^a-zA-Z0-9]/g, '_')}_${qrCodeData.qrData.reg_id}.png`;
      qrCodeService.downloadQRCode(highResQR, filename);
    } catch (err) {
      console.error('Error downloading QR code:', err);
    }
  };

  // Download all team QR codes as separate files
  const handleDownloadAll = async () => {
    try {
      setDownloadingAll(true);
      
      for (const qrCodeData of teamQRCodes) {
        await handleDownloadQR(qrCodeData, qrCodeData.student);
        // Small delay between downloads to prevent browser blocking
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (err) {
      console.error('Error downloading all QR codes:', err);
    } finally {
      setDownloadingAll(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">Generating individual QR codes for all team members...</span>
      </div>
    );
  }

  if (error || teamQRCodes.length === 0) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center">
          <i className="fas fa-exclamation-triangle text-red-500 text-xl mr-3"></i>
          <div>
            <h4 className="font-semibold text-red-800">QR Code Generation Failed</h4>
            <p className="text-red-600 text-sm mt-1">
              {error || 'Unable to generate QR codes for team members'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const leaderQR = teamQRCodes.find(qr => qr.type === 'leader');
  const memberQRs = teamQRCodes.filter(qr => qr.type === 'member');

  return (
    <div className={`team-qr-codes ${className}`}>
      {/* Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2 flex items-center">
          <i className="fas fa-users mr-2"></i>
          Individual QR Codes for Team Members
        </h3>
        <div className="text-sm text-blue-800 space-y-1">
          <p>• Each team member has their own QR code for individual attendance marking</p>
          <p>• Team leader and all members must present their respective QR codes</p>
          <p>• This ensures accurate attendance tracking for each participant</p>
        </div>
        
        {showDownload && (
          <div className="mt-4">
            <button
              onClick={handleDownloadAll}
              disabled={downloadingAll}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center"
            >
              {downloadingAll ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Downloading All...
                </>
              ) : (
                <>
                  <i className="fas fa-download mr-2"></i>
                  Download All QR Codes
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Team Leader QR */}
      {leaderQR && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <div className="flex flex-col lg:flex-row items-start gap-6">
            <div className="flex-shrink-0">
              <div className="bg-white p-3 rounded-lg border shadow-sm">
                <img 
                  src={leaderQR.qrImageURL} 
                  alt="Team Leader QR Code" 
                  className="w-40 h-40"
                />
              </div>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center mb-3">
                <div className="bg-green-100 p-2 rounded-full mr-3">
                  <i className="fas fa-crown text-green-600"></i>
                </div>
                <h4 className="text-lg font-semibold text-green-900">Team Leader</h4>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Name:</span>
                  <span className="text-gray-900">{leaderQR.student.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Enrollment:</span>
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded text-sm">
                    {leaderQR.student.enrollment}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Department:</span>
                  <span className="text-gray-900">{leaderQR.student.department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Registration ID:</span>
                  <span className="font-mono bg-blue-100 px-2 py-1 rounded text-xs">
                    {leaderQR.qrData.reg_id}
                  </span>
                </div>
              </div>
              
              {showDownload && (
                <button
                  onClick={() => handleDownloadQR(leaderQR, leaderQR.student)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors text-sm flex items-center"
                >
                  <i className="fas fa-download mr-2"></i>
                  Download Leader QR
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Team Members QRs */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <i className="fas fa-users mr-2 text-gray-600"></i>
          Team Members ({memberQRs.length})
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {memberQRs.map((memberQR, index) => (
            <div key={memberQR.qrData.reg_id} className="bg-white border border-gray-300 rounded-lg p-4">
              {/* QR Code */}
              <div className="text-center mb-4">
                <div className="inline-block bg-gray-50 p-2 rounded-lg border">
                  <img 
                    src={memberQR.qrImageURL} 
                    alt={`${memberQR.student.name} QR Code`} 
                    className="w-32 h-32"
                  />
                </div>
              </div>
              
              {/* Member Details */}
              <div className="space-y-2 mb-4">
                <div className="text-center">
                  <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                    Member {index + 1}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-center">
                    {memberQR.student.name}
                  </p>
                  <p className="text-sm text-gray-600 text-center">
                    {memberQR.student.enrollment}
                  </p>
                  <p className="text-sm text-gray-600 text-center">
                    {memberQR.student.department}
                  </p>
                </div>
                <div className="text-center">
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                    {memberQR.qrData.reg_id}
                  </span>
                </div>
              </div>
              
              {/* Download Button */}
              {showDownload && (
                <button
                  onClick={() => handleDownloadQR(memberQR, memberQR.student)}
                  className="w-full bg-gray-600 text-white px-3 py-2 rounded-lg font-semibold hover:bg-gray-700 transition-colors text-sm flex items-center justify-center"
                >
                  <i className="fas fa-download mr-2"></i>
                  Download
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
        <h5 className="text-sm font-semibold text-yellow-800 mb-2 flex items-center">
          <i className="fas fa-info-circle mr-2"></i>
          Team Attendance Instructions
        </h5>
        <ul className="text-xs text-yellow-700 space-y-1">
          <li>• <strong>Each team member must present their individual QR code</strong></li>
          <li>• Team leader presents their QR code first to initiate team attendance</li>
          <li>• All present team members scan their respective QR codes individually</li>
          <li>• Absent members will NOT be marked as present automatically</li>
          <li>• Event organizers can track individual attendance for each team member</li>
          <li>• Keep QR codes saved on mobile devices for easy access during events</li>
        </ul>
      </div>
    </div>
  );
};

export default TeamQRCodes;
