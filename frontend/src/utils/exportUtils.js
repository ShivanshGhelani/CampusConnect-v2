import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Export utilities for certificate generation
 */

/**
 * Export certificate as PNG image
 * @param {HTMLElement} element - The element to capture
 * @param {string} filename - The filename for the export
 * @returns {Promise<void>}
 */
export async function exportAsPNG(element, filename = 'certificate') {
  try {
    const canvas = await html2canvas(element, {
      scale: 2, // Higher resolution
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: element.scrollWidth,
      height: element.scrollHeight,
      scrollX: 0,
      scrollY: 0
    });

    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (error) {
    console.error('Error exporting as PNG:', error);
    throw new Error('Failed to export as PNG');
  }
}

/**
 * Export certificate as PDF
 * @param {HTMLElement} element - The element to capture
 * @param {string} filename - The filename for the export
 * @returns {Promise<void>}
 */
export async function exportAsPDF(element, filename = 'certificate') {
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: element.scrollWidth,
      height: element.scrollHeight,
      scrollX: 0,
      scrollY: 0
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Error exporting as PDF:', error);
    throw new Error('Failed to export as PDF');
  }
}

/**
 * Export certificate from iframe content
 * @param {HTMLIFrameElement} iframe - The iframe containing the certificate
 * @param {string} format - 'png' or 'pdf'
 * @param {string} filename - The filename for the export
 * @returns {Promise<void>}
 */
export async function exportFromIframe(iframe, format = 'png', filename = 'certificate') {
  try {
    if (!iframe || !iframe.contentDocument) {
      throw new Error('Invalid iframe or no content document');
    }

    const doc = iframe.contentDocument;
    const certificateElement = doc.body;

    if (!certificateElement) {
      throw new Error('No certificate content found');
    }

    // Ensure styles are loaded before capturing
    await waitForStyles(doc);

    if (format === 'pdf') {
      await exportAsPDF(certificateElement, filename);
    } else {
      await exportAsPNG(certificateElement, filename);
    }
  } catch (error) {
    console.error('Error exporting from iframe:', error);
    throw error;
  }
}

/**
 * Wait for styles to load in document
 * @param {Document} doc - The document to check
 * @returns {Promise<void>}
 */
function waitForStyles(doc) {
  return new Promise((resolve) => {
    const stylesheets = Array.from(doc.styleSheets);
    const images = Array.from(doc.images);
    
    let loadCount = 0;
    const totalResources = stylesheets.length + images.length;
    
    if (totalResources === 0) {
      resolve();
      return;
    }

    const checkComplete = () => {
      loadCount++;
      if (loadCount >= totalResources) {
        // Add a small delay to ensure rendering is complete
        setTimeout(resolve, 100);
      }
    };

    // Check stylesheets
    stylesheets.forEach((stylesheet) => {
      try {
        // Try to access stylesheet rules to ensure it's loaded
        if (stylesheet.cssRules || stylesheet.rules) {
          checkComplete();
        } else {
          stylesheet.onload = checkComplete;
          stylesheet.onerror = checkComplete;
        }
      } catch (e) {
        // Cross-origin stylesheets may throw errors
        checkComplete();
      }
    });

    // Check images
    images.forEach((img) => {
      if (img.complete) {
        checkComplete();
      } else {
        img.onload = checkComplete;
        img.onerror = checkComplete;
      }
    });
  });
}

/**
 * Generate a filename with timestamp
 * @param {string} baseName - Base name for the file
 * @param {string} extension - File extension
 * @returns {string} Generated filename
 */
export function generateFilename(baseName = 'certificate', extension = 'png') {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
  return `${baseName}_${timestamp}.${extension}`;
}

/**
 * Validate export format
 * @param {string} format - The format to validate
 * @returns {boolean} True if format is valid
 */
export function isValidExportFormat(format) {
  return ['png', 'pdf'].includes(format.toLowerCase());
}

/**
 * Get export options for different formats
 * @param {string} format - Export format
 * @returns {Object} Export options
 */
export function getExportOptions(format) {
  const baseOptions = {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    scrollX: 0,
    scrollY: 0
  };

  switch (format.toLowerCase()) {
    case 'pdf':
      return {
        ...baseOptions,
        scale: 3, // Higher scale for PDF
      };
    case 'png':
    default:
      return baseOptions;
  }
}
