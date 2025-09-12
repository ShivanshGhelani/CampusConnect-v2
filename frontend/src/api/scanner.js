/**
 * Public Scanner API
 * No authentication required - uses token-based access
 */
import api from './base';

const scannerAPI = {
  // Get scanner info using token
  getScannerInfo: (token) => 
    api.get(`/api/v1/attendance/scanner-info/${token}`),

  // Mark attendance using scanner token and QR data
  scanAndMark: (token, qrData) =>
    api.post('/api/v1/attendance/scan-mark', qrData, {
      params: { token }
    })
};

export { scannerAPI };
