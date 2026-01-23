import QRCode from 'qrcode';

/**
 * Generate QR code and download as PNG
 * @param {string} url - The URL to encode in the QR code
 * @param {string} filename - The filename for the downloaded PNG
 * @param {object} options - QR code options
 */
export const generateAndDownloadQR = async (url, filename = 'qrcode.png', options = {}) => {
  try {
    const defaultOptions = {
      width: 512,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'H',
      ...options
    };

    // Generate QR code as data URL
    const dataUrl = await QRCode.toDataURL(url, defaultOptions);

    // Create a temporary link element
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    
    return true;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
};

/**
 * Generate Event QR Code
 * @param {string} eventId - The event ID
 * @param {string} eventName - The event name (for filename)
 */
export const generateEventQR = async (eventId, eventName = 'event') => {
  const baseUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin;
  const eventUrl = `${baseUrl}/client/events/${eventId}`;
  
  // Sanitize filename
  const sanitizedName = eventName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const filename = `event_qr_${sanitizedName}_${eventId}.png`;
  
  return await generateAndDownloadQR(eventUrl, filename);
};

/**
 * Generate Feedback QR Code
 * @param {string} eventId - The event ID
 * @param {string} eventName - The event name (for filename)
 */
export const generateFeedbackQR = async (eventId, eventName = 'event') => {
  const baseUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin;
  const feedbackUrl = `${baseUrl}/client/events/${eventId}/feedback`;
  
  // Sanitize filename
  const sanitizedName = eventName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const filename = `feedback_qr_${sanitizedName}_${eventId}.png`;
  
  return await generateAndDownloadQR(feedbackUrl, filename);
};
