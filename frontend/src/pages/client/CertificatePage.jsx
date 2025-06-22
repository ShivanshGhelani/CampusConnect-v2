import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ClientLayout from '../../components/client/Layout';
import { clientAPI } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

function CertificatePage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, user, userType } = useAuth();
  
  // State management
  const [event, setEvent] = useState(null);
  const [student, setStudent] = useState(null);
  const [certificate, setCertificate] = useState(null);
  const [teamInfo, setTeamInfo] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ message: '', type: 'info', visible: false });
  const [buttonLoading, setButtonLoading] = useState(false);
  const [certificateData, setCertificateData] = useState(null);
  
  // Refs
  const certificateContentRef = useRef(null);
  const modalRef = useRef(null);  // Check authentication and load data
  useEffect(() => {
    console.log('🔍 Certificate page effect triggered:', {
      authLoading,
      isAuthenticated,
      userType,
      user: user?.enrollment_no || user?.username
    });
    
    if (!authLoading) {
      if (!isAuthenticated || userType !== 'student') {
        console.log('🔒 Not authenticated as student, redirecting to login');
        navigate('/login', { state: { returnUrl: `/client/events/${eventId}/certificate` } });
        return;
      }
      console.log('✅ Authentication verified, loading certificate data');
      loadCertificateData();
    }
  }, [eventId, isAuthenticated, authLoading, userType]);const loadCertificateData = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Loading certificate data for event:', eventId);
      console.log('🔍 Authenticated user:', user);
      
      // Get event details first
      const eventResponse = await clientAPI.getEventDetails(eventId);
      const certificateStatusResponse = await clientAPI.getCertificateStatus(eventId);
      
      console.log('📊 Event response:', eventResponse.data);
      console.log('🎫 Certificate status response:', certificateStatusResponse.data);
      
      if (eventResponse.data.success && certificateStatusResponse.data.success) {
        setEvent(eventResponse.data.event);
        setStudent(certificateStatusResponse.data.student);
        setCertificate(certificateStatusResponse.data.certificate);
        setTeamInfo(certificateStatusResponse.data.team_info);        
        // Set certificate data for processing
        setCertificateData({
          eventId: eventResponse.data.event.event_id,
          eventName: eventResponse.data.event.event_name,
          participantName: certificateStatusResponse.data.student.full_name || "Student Name",
          department: certificateStatusResponse.data.student.department || "Department",
          teamName: certificateStatusResponse.data.team_info?.team_name || null,
          eventDate: new Date(eventResponse.data.event.start_datetime).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          certificateId: certificateStatusResponse.data.certificate?.certificate_id || "CERT-ID",
          enrollmentNo: certificateStatusResponse.data.student.enrollment_no
        });
        
        // Load certificate template
        await loadCertificateTemplate();
      } else {
        setError('Certificate not available for this event or student not eligible');
      }    } catch (err) {
      console.error('Error loading certificate data:', err);
      
      // Handle specific authentication errors
      if (err.response?.status === 401) {
        console.log('🔒 Authentication required, redirecting to login');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        navigate('/login', { state: { returnUrl: `/client/events/${eventId}/certificate` } });
        return;
      } else if (err.response?.status === 403) {
        setError('You do not have permission to access this certificate');
      } else if (err.response?.status === 404) {
        setError('Event not found or certificate not available');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to load certificate data. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };
  const loadCertificateTemplate = async () => {
    try {
      if (!certificateContentRef.current) return;
      
      console.log('🎨 Loading certificate template for event:', eventId);
      
      // Show loading state
      certificateContentRef.current.innerHTML = `
        <div class="certificate-loading w-full h-64 flex flex-col justify-center items-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p class="text-gray-600 text-center">Loading certificate template...</p>
        </div>
      `;      // Load template from API
      const templateResponse = await clientAPI.getCertificateTemplate(eventId);
      
      console.log('🎯 Template response:', templateResponse.data);
      if (templateResponse.data && templateResponse.data.success) {
        const templateHtml = templateResponse.data.template_content;
        const processedHtml = processTemplateContent(templateHtml, {
          participant_name: certificateData?.participantName,
          department_name: certificateData?.department,
          team_name: certificateData?.teamName
        });
        
        certificateContentRef.current.innerHTML = processedHtml;
        scaleCertificateContent();
        detectAndApplyOrientation();
      }
    } catch (error) {
      console.error('Error loading certificate template:', error);
      if (certificateContentRef.current) {
        certificateContentRef.current.innerHTML = `
          <div class="w-full h-64 flex flex-col justify-center items-center bg-red-50 rounded-lg border-2 border-dashed border-red-300">
            <p class="text-red-600 text-center">Failed to load certificate template</p>
            <button onclick="loadCertificateTemplate()" class="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
              Retry
            </button>
          </div>
        `;
      }
    }
  };

  const processTemplateContent = (templateHtml, placeholderData) => {
    let processedHtml = templateHtml;
    
    // Replace participant name placeholder
    processedHtml = processedHtml.replace(/\{\{participant_name\}\}/g, placeholderData.participant_name || certificateData?.participantName);
    
    // Replace department name placeholder  
    processedHtml = processedHtml.replace(/\{\{department_name\}\}/g, placeholderData.department_name || certificateData?.department);
    
    // Replace team name placeholder (for team-based events)
    if (placeholderData.team_name || certificateData?.teamName) {
      processedHtml = processedHtml.replace(/\{\{team_name\}\}/g, placeholderData.team_name || certificateData?.teamName);
    }
    
    // Also handle alternative placeholder formats with spaces
    processedHtml = processedHtml.replace(/\{\{ participant_name \}\}/g, placeholderData.participant_name || certificateData?.participantName);
    processedHtml = processedHtml.replace(/\{\{ department_name \}\}/g, placeholderData.department_name || certificateData?.department);
    if (placeholderData.team_name || certificateData?.teamName) {
      processedHtml = processedHtml.replace(/\{\{ team_name \}\}/g, placeholderData.team_name || certificateData?.teamName);
    }
    
    // Extract any styles from the original template for separate handling
    const styleMatch = templateHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    let extractedStyles = '';
    if (styleMatch) {
      extractedStyles = styleMatch[1];
    }
    
    // Extract only the body content if this is a complete HTML document
    const bodyMatch = processedHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      processedHtml = bodyMatch[1];
    }
    
    // Remove any remaining <style> tags from the content to prevent text display
    processedHtml = processedHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // Store extracted styles separately for proper injection
    if (extractedStyles) {
      processedHtml = `<div data-styles="${extractedStyles.replace(/"/g, '&quot;')}">${processedHtml}</div>`;
    }
    
    return processedHtml;
  };

  const scaleCertificateContent = () => {
    const certificateContent = certificateContentRef.current;
    const previewFrame = document.getElementById('certificate-preview-frame');
    
    if (!certificateContent || !previewFrame) return;
    
    // Remove any existing transforms
    certificateContent.style.transform = '';
    
    // Get the actual content dimensions
    const contentChild = certificateContent.firstElementChild;
    if (!contentChild) return;
    
    // Wait for rendering and then calculate scale
    setTimeout(() => {
      const contentRect = contentChild.getBoundingClientRect();
      const frameRect = previewFrame.getBoundingClientRect();
      
      if (contentRect.width > 0 && contentRect.height > 0) {
        const scaleX = (frameRect.width - 40) / contentRect.width;
        const scaleY = (frameRect.height - 40) / contentRect.height;
        const scale = Math.min(scaleX, scaleY, 1);
        
        certificateContent.style.transform = `scale(${scale})`;
        certificateContent.style.transformOrigin = 'top left';
      }
    }, 200);
  };

  const detectAndApplyOrientation = () => {
    const certificateContent = certificateContentRef.current;
    const previewFrame = document.getElementById('certificate-preview-frame');
    
    if (!certificateContent || !previewFrame) return;
    
    // Look for orientation hints in the template
    let isLandscape = true; // Default to landscape
    
    // Check CSS @page rules in the content
    const styleElements = certificateContent.querySelectorAll('style');
    let foundPageRule = false;
    
    styleElements.forEach(style => {
      if (style.textContent.includes('@page') && style.textContent.includes('portrait')) {
        isLandscape = false;
        foundPageRule = true;
      }
    });
    
    // If no explicit @page rule found, try to detect from dimensions
    if (!foundPageRule) {
      setTimeout(() => {
        const contentChild = certificateContent.firstElementChild;
        if (contentChild) {
          const rect = contentChild.getBoundingClientRect();
          isLandscape = rect.width > rect.height;
        }
        previewFrame.setAttribute('data-orientation', isLandscape ? 'landscape' : 'portrait');
      }, 100);
    }
    
    // Apply orientation information (for PDF generation only - no UI changes)
    setTimeout(() => {
      console.log(`✅ Detected ${isLandscape ? 'landscape' : 'portrait'} orientation for PDF generation`);
      previewFrame.setAttribute('data-orientation', isLandscape ? 'landscape' : 'portrait');
    }, 200);
  };

  const showStatus = (message, type = 'info') => {
    setStatus({ message, type, visible: true });
  };

  const hideStatus = () => {
    setStatus({ ...status, visible: false });
  };

  const downloadCertificate = async () => {
    console.log('🚀 Starting certificate download...');
    
    if (!certificateData) {
      showStatus('Certificate data not loaded', 'error');
      return;
    }

    setButtonLoading(true);
    showStatus('Preparing certificate...', 'info');

    try {
      // Check if certificate content is loaded
      const certificateContent = certificateContentRef.current;
      if (!certificateContent || !certificateContent.innerHTML.trim() || certificateContent.innerHTML.includes('Loading certificate template')) {
        showStatus('Certificate template not loaded. Please wait and try again.', 'error');
        return;
      }

      // Import required libraries dynamically
      const html2canvas = await import('html2canvas');
      const jsPDF = await import('jspdf');

      showStatus('Generating certificate...', 'info');

      // Create certificate element for PDF generation
      const certificateElement = await createCertificateElement();
      
      showStatus('Capturing certificate...', 'info');

      // Capture the certificate
      const canvas = await html2canvas.default(certificateElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: certificateElement.offsetWidth,
        height: certificateElement.offsetHeight,
        scrollX: 0,
        scrollY: 0
      });

      showStatus('Converting to PDF...', 'info');

      // Convert to PDF
      await convertCanvasToPDF(canvas, certificateElement);
      
      showStatus('Certificate downloaded successfully!', 'success');
      setTimeout(() => hideStatus(), 3000);

    } catch (error) {
      console.error('Certificate download error:', error);
      showStatus(`Download failed: ${error.message}`, 'error');
    } finally {
      setButtonLoading(false);
    }
  };

  const createCertificateElement = async () => {
    // Get the certificate content element
    const certificateContent = certificateContentRef.current;
    if (!certificateContent || !certificateContent.innerHTML.trim()) {
      throw new Error('Certificate content not available');
    }

    console.log('🎯 Creating certificate element for PDF...');

    // Get the actual certificate content (look for wrapper first)
    const certificateWrapper = certificateContent.querySelector('.certificate-wrapper');
    const actualContent = certificateWrapper || certificateContent.firstElementChild;

    if (!actualContent || actualContent.classList.contains('certificate-loading')) {
      throw new Error('Certificate content is still loading');
    }

    // Clone the actual content directly
    const clonedElement = actualContent.cloneNode(true);

    // Ensure cloned element is properly styled for rendering
    clonedElement.style.display = 'block';
    clonedElement.style.visibility = 'visible';
    clonedElement.style.position = 'static';

    // Handle extracted styles for PDF generation
    let stylesForPdf = '';
    if (clonedElement.hasAttribute('data-styles')) {
      stylesForPdf = clonedElement.getAttribute('data-styles').replace(/&quot;/g, '"');
    }

    // Determine orientation from data attribute
    const previewFrame = document.getElementById('certificate-preview-frame');
    const isLandscape = previewFrame?.getAttribute('data-orientation') === 'landscape';
    console.log(`📐 Using ${isLandscape ? 'landscape' : 'portrait'} orientation for PDF`);

    // Create a wrapper container for proper sizing
    const wrapperDiv = document.createElement('div');

    // Include styles in the wrapper if available
    if (stylesForPdf) {
      const styleElement = document.createElement('style');
      styleElement.textContent = stylesForPdf;
      wrapperDiv.appendChild(styleElement);
    }

    wrapperDiv.appendChild(clonedElement);

    // Apply specific styling for PDF generation based on orientation
    wrapperDiv.style.position = 'absolute';
    wrapperDiv.style.left = '-9999px';
    wrapperDiv.style.top = '0';
    wrapperDiv.style.backgroundColor = '#ffffff';
    wrapperDiv.style.fontFamily = 'Arial, sans-serif';
    wrapperDiv.style.overflow = 'visible';
    wrapperDiv.style.zoom = '1';
    wrapperDiv.style.transform = 'none';

    if (isLandscape) {
      wrapperDiv.style.width = '297mm';
      wrapperDiv.style.height = '210mm';
    } else {
      wrapperDiv.style.width = '210mm';
      wrapperDiv.style.height = '297mm';
    }

    // Ensure the cloned content fills the wrapper
    clonedElement.style.width = '100%';
    clonedElement.style.height = '100%';
    clonedElement.style.margin = '0';
    clonedElement.style.padding = '0';
    clonedElement.style.transform = 'none';
    clonedElement.style.overflow = 'visible';

    // Fix image paths to use absolute URLs
    const images = wrapperDiv.querySelectorAll('img');
    const imageLoadPromises = Array.from(images).map(async (img) => {
      return new Promise((resolve) => {
        if (img.complete) {
          resolve();
        } else {
          img.onload = resolve;
          img.onerror = resolve;
        }
      });
    });

    // Append to body temporarily
    document.body.appendChild(wrapperDiv);

    // Wait for all images to load
    console.log(`⏳ Waiting for ${images.length} images to load...`);
    await Promise.all(imageLoadPromises);

    // Extra time for fonts and rendering
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('✅ Certificate element ready for capture');
    return wrapperDiv;
  };

  const convertCanvasToPDF = async (canvas, certificateElement) => {
    const imgData = canvas.toDataURL('image/png', 1.0);

    // Clean up temporary element if provided
    if (certificateElement && certificateElement.parentNode) {
      certificateElement.parentNode.removeChild(certificateElement);
    }

    try {
      // Try jsPDF
      const { jsPDF } = await import('jspdf');
      
      // Determine orientation
      const previewFrame = document.getElementById('certificate-preview-frame');
      const isLandscape = previewFrame?.getAttribute('data-orientation') === 'landscape';
      
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Calculate image dimensions to fit page
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);

      const finalWidth = imgWidth * ratio;
      const finalHeight = imgHeight * ratio;

      // Center the image
      const x = (pageWidth - finalWidth) / 2;
      const y = (pageHeight - finalHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);

      // Download the PDF
      const fileName = `certificate_${certificateData.participantName.replace(/[^a-zA-Z0-9]/g, '_')}_${certificateData.eventName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      pdf.save(fileName);

      console.log('✅ Certificate downloaded as PDF');
    } catch (error) {
      console.error('PDF generation failed:', error);
      
      // Fallback: Just download the image
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `certificate_${certificateData.participantName.replace(/[^a-zA-Z0-9]/g, '_')}_${certificateData.eventName.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      link.click();
      
      console.warn('PDF generation failed, downloaded as PNG instead');
    }
  };

  const openPreviewModal = () => {
    console.log('🔍 Opening certificate preview modal');
    
    // Check if certificate content is loaded
    const certificateContent = certificateContentRef.current;
    if (!certificateContent || !certificateContent.innerHTML.trim() || certificateContent.innerHTML.includes('Loading certificate template')) {
      showStatus('Certificate not loaded yet. Please wait and try again.', 'warning');
      return;
    }

    // Get the actual certificate content
    const certificateWrapper = certificateContent.querySelector('.certificate-wrapper');
    const actualContent = certificateWrapper || certificateContent.firstElementChild;

    if (!actualContent || actualContent.classList.contains('certificate-loading')) {
      showStatus('Certificate is still loading. Please wait and try again.', 'warning');
      return;
    }

    // Get modal container
    const modalContent = document.getElementById('modal-certificate-content');
    
    // Create a clean copy of the certificate content
    const contentClone = actualContent.cloneNode(true);
    
    // Remove any wrapper styling to make it pure certificate content
    contentClone.style.position = 'static';
    contentClone.style.transform = 'none';
    contentClone.style.margin = '0';
    contentClone.style.padding = '0';
    contentClone.style.display = 'block';
    contentClone.style.visibility = 'visible';
    contentClone.style.borderRadius = '8px';
    contentClone.style.overflow = 'hidden';
    contentClone.style.backgroundColor = '#ffffff';

    // Apply certificate styles if available
    if (contentClone.hasAttribute('data-styles')) {
      const styles = contentClone.getAttribute('data-styles').replace(/&quot;/g, '"');
      const styleElement = document.createElement('style');
      styleElement.id = 'modal-certificate-styles';
      styleElement.textContent = styles;
      modalContent.appendChild(styleElement);
    }

    // Clear any existing content and add certificate as the main content
    const existingCertificate = modalContent.querySelector('div:not(button)');
    if (existingCertificate) {
      existingCertificate.remove();
    }

    modalContent.appendChild(contentClone);    // Show the modal
    const modal = document.getElementById('certificate-preview-modal');
    modal.classList.remove('hidden');
    modal.style.display = 'flex';

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Auto-scale certificate to fit viewport
    setTimeout(() => {
      scaleFloatingCertificate();
    }, 100);

    console.log('✅ Certificate preview modal opened');
  };

  const closePreviewModal = () => {
    console.log('❌ Closing certificate preview modal');    // Hide the modal
    const modal = document.getElementById('certificate-preview-modal');
    modal.classList.add('hidden');
    modal.style.display = 'none';

    // Reset modal content transform
    const modalContent = document.getElementById('modal-certificate-content');
    modalContent.style.transform = 'none';

    // Remove existing certificate content
    const existingCertificate = modalContent.querySelector('div:not(button)');
    if (existingCertificate) {
      existingCertificate.remove();
    }

    // Clean up modal-specific styles
    const modalStyles = document.getElementById('modal-certificate-styles');
    if (modalStyles) {
      modalStyles.remove();
    }

    // Restore body scroll
    document.body.style.overflow = '';

    console.log('✅ Certificate preview modal closed');
  };

  const scaleFloatingCertificate = () => {
    const modalContent = document.getElementById('modal-certificate-content');
    const certificateElement = modalContent?.querySelector('div:not(button)');

    if (!modalContent || !certificateElement) return;

    // Reset any existing transform to get natural dimensions
    modalContent.style.transform = 'none';
    certificateElement.style.transform = 'none';

    // Wait for render and then calculate optimal scale
    setTimeout(() => {
      const modalRect = modalContent.getBoundingClientRect();
      const viewportWidth = window.innerWidth * 0.9;
      const viewportHeight = window.innerHeight * 0.9;

      if (modalRect.width > 0 && modalRect.height > 0) {
        const scaleX = viewportWidth / modalRect.width;
        const scaleY = viewportHeight / modalRect.height;
        const scale = Math.min(scaleX, scaleY, 1);

        modalContent.style.transform = `scale(${scale})`;
        modalContent.style.transformOrigin = 'center center';
      }
    }, 50);
  };

  // Handle modal clicks and keyboard events
  useEffect(() => {
    const handleModalClick = (event) => {
      const modal = document.getElementById('certificate-preview-modal');
      if (event.target === modal) {
        closePreviewModal();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closePreviewModal();
      }
    };

    const handleResize = () => {
      const modal = document.getElementById('certificate-preview-modal');
      if (modal && !modal.classList.contains('hidden')) {
        scaleFloatingCertificate();
      }
    };

    document.addEventListener('click', handleModalClick);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('click', handleModalClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  if (authLoading || loading) {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{authLoading ? 'Checking authentication...' : 'Loading certificate data...'}</p>
          </div>
        </div>
      </ClientLayout>
    );
  }
  if (error) {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <div className="text-red-600 text-6xl mb-4">⚠️</div>
              <h1 className="text-2xl font-bold text-red-800 mb-2">Certificate Not Available</h1>
              <p className="text-red-600 mb-4">{error}</p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => navigate(-1)}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Go Back
                </button>
                <button
                  onClick={() => navigate('/login', { state: { returnUrl: `/client/events/${eventId}/certificate` } })}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Login to Access Certificate
                </button>
              </div>
            </div>
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      {/* Certificate Styling */}
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          
          .loading-spinner {
            display: inline-block;
            width: 18px;
            height: 18px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: #ffffff;
            animation: spin 1s linear infinite;
          }
          
          .download-btn {
            background: #2563eb;
            transition: background-color 0.2s;
          }
          
          .download-btn:hover {
            background: #1d4ed8;
          }
          
          .download-btn:disabled {
            background: #9ca3af;
            cursor: not-allowed;
          }
          
          /* Hidden certificate content for processing */
          #certificate-preview-frame {
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
            position: relative;
          }
          
          #certificate-content {
            overflow: visible !important;
          }
          
          /* Modal Styles for Floating Iframe Effect */
          #certificate-preview-modal {
            backdrop-filter: blur(4px);
          }
          
          /* Certificate as direct floating iframe - no container wrapper */
          #modal-certificate-content {
            max-width: 90vw;
            max-height: 90vh;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            border-radius: 8px;
            overflow: hidden;
            transition: transform 0.3s ease-in-out;
          }
          
          /* Floating close button styling */
          #modal-certificate-content button {
            position: absolute;
            top: -40px;
            right: 0;
            z-index: 10;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            border: none;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background-color 0.2s;
          }
          
          #modal-certificate-content button:hover {
            background: rgba(0, 0, 0, 1);
          }
          
          /* Responsive adjustments for smaller screens */
          @media (max-width: 768px) {
            #modal-certificate-content {
              max-width: 95vw;
              max-height: 85vh;
            }
          }

          /* Loading state */
          .certificate-loading {
            background: linear-gradient(90deg, #f0f0f0 25%, transparent 25%, transparent 50%, #f0f0f0 50%, #f0f0f0 75%, transparent 75%, transparent);
            background-size: 20px 20px;
            animation: loading-shimmer 1.5s infinite linear;
          }
          
          @keyframes loading-shimmer {
            0% { background-position: 0 0; }
            100% { background-position: 20px 0; }
          }
        `}
      </style>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Certificate Download</h1>
                <p className="text-gray-600">Download your participation certificate for <strong>{event?.event_name}</strong></p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Event ID: {eventId}</p>
                {certificate && (
                  <p className="text-sm text-gray-500">Certificate ID: {certificate.certificate_id}</p>
                )}
              </div>
            </div>
          </div>

          {/* Certificate Preview Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Certificate Preview</h2>
              <button
                onClick={openPreviewModal}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
                <span>Full Preview</span>
              </button>
            </div>
            
            {/* Certificate Preview Frame */}
            <div id="certificate-preview-frame" className="w-full h-96 flex justify-center items-center overflow-hidden">
              <div id="certificate-content" ref={certificateContentRef} className="transform-gpu">
                <div className="certificate-loading w-full h-64 flex flex-col justify-center items-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-600 text-center">Loading certificate template...</p>
                </div>
              </div>
            </div>
          </div>

          {/* Download Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Download Options</h2>
            
            {/* Status Message */}
            {status.visible && (
              <div
                id="status-message"
                className={`mb-4 p-3 rounded-lg text-center font-medium ${
                  status.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
                  status.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
                  status.type === 'warning' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                  'bg-blue-100 text-blue-800 border border-blue-200'
                }`}
              >
                {status.message}
              </div>
            )}

            {/* Download Button */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              <button
                id="download-certificate-btn"
                onClick={downloadCertificate}
                disabled={buttonLoading}
                className={`download-btn flex items-center space-x-2 px-6 py-3 text-white rounded-lg font-medium transition-all ${
                  buttonLoading ? 'cursor-not-allowed opacity-75' : 'hover:shadow-lg transform hover:scale-105'
                }`}
              >
                {buttonLoading ? (
                  <>
                    <div className="loading-spinner"></div>
                    <span>Generating Certificate...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Download Certificate PDF</span>
                  </>
                )}
              </button>

              <button
                onClick={() => navigate(-1)}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Back to Event
              </button>
            </div>

            {/* Certificate Info */}
            {certificateData && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">Participant Details</h3>
                  <p className="text-sm text-gray-600">Name: {certificateData.participantName}</p>
                  <p className="text-sm text-gray-600">Department: {certificateData.department}</p>
                  {certificateData.teamName && (
                    <p className="text-sm text-gray-600">Team: {certificateData.teamName}</p>
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Event Details</h3>
                  <p className="text-sm text-gray-600">Event: {certificateData.eventName}</p>
                  <p className="text-sm text-gray-600">Date: {certificateData.eventDate}</p>
                  <p className="text-sm text-gray-600">Certificate ID: {certificateData.certificateId}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Certificate Preview Modal */}      <div
        id="certificate-preview-modal"
        className="fixed inset-0 bg-black bg-opacity-50 z-50 hidden"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      >
        {/* Certificate Content as Direct Floating Window */}
        <div
          id="modal-certificate-content"
          className="relative bg-white shadow-2xl transform-gpu"
          style={{ transformOrigin: 'center center' }}
        >
          {/* Close Button */}
          <button
            onClick={closePreviewModal}
            className="absolute -top-10 right-0 z-10 bg-black bg-opacity-80 text-white border-none rounded-full w-8 h-8 flex items-center justify-center cursor-pointer hover:bg-black transition-colors"
          >
            ✕
          </button>
          {/* Certificate content will be dynamically inserted here */}
        </div>
      </div>
    </ClientLayout>
  );
}

export default CertificatePage;
