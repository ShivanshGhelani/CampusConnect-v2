import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { clientAPI } from '../../api/client';
import ClientLayout from '../../components/client/Layout';
import LoadingSpinner from '../../components/LoadingSpinner';

const CertificateDownload = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  // State management
  const [event, setEvent] = useState(null);
  const [student, setStudent] = useState(null);
  const [teamInfo, setTeamInfo] = useState(null);
  const [certificate, setCertificate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [certificateContent, setCertificateContent] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState('info');

  // Certificate data object
  const [certificateData, setCertificateData] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth/login', { state: { from: location } });
      return;
    }
    
    loadCertificateData();
  }, [eventId, isAuthenticated]);

  const loadCertificateData = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Fetch event details
      const eventResponse = await clientAPI.getEventDetails(eventId);
      if (!eventResponse.data.success) {
        throw new Error('Failed to load event details');
      }
      const eventData = eventResponse.data.event;

      // Fetch certificate status
      const certificateResponse = await clientAPI.getCertificateStatus(eventId);
      if (!certificateResponse.data.success) {
        throw new Error('Certificate not available for this event');
      }
      const certificateData = certificateResponse.data.certificate;

      // Get student data from user context
      const studentData = user;

      // Check for team info if it's a team event
      let teamData = null;
      if (eventData.is_team_based || eventData.registration_mode === 'team') {
        try {
          const teamResponse = await clientAPI.getTeamDetails(eventId);
          if (teamResponse.data.success && teamResponse.data.registered) {
            teamData = {
              team_name: teamResponse.data.registration_data.team_name
            };
          }
        } catch (teamError) {
          console.warn('Team info not available:', teamError);
        }
      }

      // Set all data
      setEvent(eventData);
      setStudent(studentData);
      setTeamInfo(teamData);
      setCertificate(certificateData);

      // Create certificate data object
      const certData = {
        eventId: eventData.event_id || eventId,
        eventName: eventData.event_name || eventData.name,
        participantName: studentData.full_name || studentData.name,
        department: studentData.department,
        teamName: teamData?.team_name,
        eventDate: eventData.start_datetime ? new Date(eventData.start_datetime).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }) : 'Event Date',
        certificateId: certificateData.certificate_id || 'CERT-ID',
        enrollmentNo: studentData.enrollment_no
      };
      setCertificateData(certData);

      // Load certificate template
      await loadCertificateTemplate(certData);

    } catch (error) {
      console.error('Certificate load error:', error);
      setError(error.message || 'Failed to load certificate details');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCertificateTemplate = async (certData) => {
    try {
      showStatus('Loading certificate template...', 'info');

      // Check if template path is configured
      if (!event?.certificate_template || event.certificate_template === 'None') {
        throw new Error('Certificate template not configured for this event');
      }

      // Load template content from API
      const response = await clientAPI.getCertificateTemplate(eventId);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to load certificate template');
      }

      console.log('✅ Template data received:', response.data);

      // Process template with student data
      const processedTemplate = processTemplateContent(
        response.data.template_content, 
        response.data.placeholder_data || {}
      );

      // Set the processed template
      setCertificateContent(processedTemplate);

      hideStatus();
      console.log('✅ Certificate template loaded and processed successfully');

    } catch (error) {
      console.error('❌ Failed to load certificate template:', error);
      setCertificateContent(`
        <div class="certificate-loading p-8 text-center bg-red-50 border border-red-200 rounded-lg">
          <div class="text-red-600 mb-2">
            <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
            <h3 class="font-bold">Template Loading Error</h3>
          </div>
          <p class="text-red-700">Error: ${error.message}</p>
        </div>
      `);
      showStatus(`Template error: ${error.message}`, 'error');
    }
  };

  const processTemplateContent = (templateHtml, placeholderData) => {
    let processedHtml = templateHtml;

    // Replace participant name placeholder
    processedHtml = processedHtml.replace(
      /\{\{participant_name\}\}/g, 
      placeholderData.participant_name || certificateData.participantName
    );

    // Replace department name placeholder  
    processedHtml = processedHtml.replace(
      /\{\{department_name\}\}/g, 
      placeholderData.department_name || certificateData.department
    );

    // Replace team name placeholder (for team-based events)
    if (placeholderData.team_name || certificateData.teamName) {
      processedHtml = processedHtml.replace(
        /\{\{team_name\}\}/g, 
        placeholderData.team_name || certificateData.teamName
      );
    }

    // Also handle alternative placeholder formats with spaces
    processedHtml = processedHtml.replace(
      /\{\{ participant_name \}\}/g, 
      placeholderData.participant_name || certificateData.participantName
    );
    processedHtml = processedHtml.replace(
      /\{\{ department_name \}\}/g, 
      placeholderData.department_name || certificateData.department
    );
    if (placeholderData.team_name || certificateData.teamName) {
      processedHtml = processedHtml.replace(
        /\{\{ team_name \}\}/g, 
        placeholderData.team_name || certificateData.teamName
      );
    }

    // Extract any styles from the original template
    const styleMatch = templateHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    let extractedStyles = '';
    if (styleMatch) {
      extractedStyles = styleMatch[1];
      console.log('✅ Extracted styles from template');
    }

    // Extract only the body content if this is a complete HTML document
    const bodyMatch = processedHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      processedHtml = bodyMatch[1];
      console.log('✅ Extracted body content from complete HTML document');
    }

    // Remove any remaining <style> tags from the content
    processedHtml = processedHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Store extracted styles separately
    if (extractedStyles) {
      processedHtml = `<div class="certificate-wrapper" data-styles="${encodeURIComponent(extractedStyles)}">${processedHtml}</div>`;
    }

    return processedHtml;
  };

  const showStatus = (message, type = 'info') => {
    setStatusMessage(message);
    setStatusType(type);
  };

  const hideStatus = () => {
    setStatusMessage('');
    setStatusType('info');
  };

  const downloadCertificate = async () => {
    console.log('🚀 Starting certificate download...');
    
    if (!certificateContent || certificateContent.includes('certificate-loading')) {
      showStatus('Certificate template not loaded yet. Please wait...', 'error');
      return;
    }

    setIsDownloading(true);
    showStatus('Generating certificate PDF...', 'info');

    try {
      // Check if required libraries are available
      if (!window.html2canvas || !window.jsPDF) {
        throw new Error('PDF generation libraries not loaded. Please refresh the page.');
      }

      // Create certificate element for PDF generation
      const certificateElement = await createCertificateElement();
      
      // Generate canvas using html2canvas
      showStatus('Rendering certificate...', 'info');
      const canvas = await window.html2canvas(certificateElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: certificateElement.offsetWidth,
        height: certificateElement.offsetHeight
      });

      // Convert canvas to PDF
      showStatus('Creating PDF...', 'info');
      await convertCanvasToPDF(canvas, certificateElement);

      // Send email notification
      await sendEmailNotification(canvas);

      showStatus('Certificate downloaded successfully!', 'success');
      
    } catch (error) {
      console.error('Certificate download error:', error);
      showStatus(`Download failed: ${error.message}`, 'error');
    } finally {
      setIsDownloading(false);
      setTimeout(() => hideStatus(), 3000);
    }
  };

  const createCertificateElement = async () => {
    if (!certificateContent || certificateContent.includes('certificate-loading')) {
      throw new Error('Certificate template not loaded');
    }

    console.log('🎯 Creating certificate element for PDF...');

    // Create a temporary element
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = certificateContent;

    // Get the actual certificate content
    const certificateWrapper = tempDiv.querySelector('.certificate-wrapper');
    const actualContent = certificateWrapper || tempDiv.firstElementChild;

    if (!actualContent) {
      throw new Error('Certificate content not found');
    }

    // Clone the content
    const clonedElement = actualContent.cloneNode(true);

    // Apply styles for PDF generation
    clonedElement.style.position = 'absolute';
    clonedElement.style.left = '-9999px';
    clonedElement.style.top = '0';
    clonedElement.style.backgroundColor = '#ffffff';
    clonedElement.style.fontFamily = 'Arial, sans-serif';
    clonedElement.style.width = '297mm'; // A4 width
    clonedElement.style.height = '210mm'; // A4 height (landscape)
    clonedElement.style.overflow = 'visible';
    clonedElement.style.display = 'block';
    clonedElement.style.visibility = 'visible';

    // Handle extracted styles
    if (clonedElement.hasAttribute('data-styles')) {
      const styles = decodeURIComponent(clonedElement.getAttribute('data-styles'));
      const styleElement = document.createElement('style');
      styleElement.textContent = styles;
      clonedElement.appendChild(styleElement);
    }

    // Fix image paths to absolute URLs
    const images = clonedElement.querySelectorAll('img');
    const imagePromises = Array.from(images).map(async (img) => {
      return new Promise((resolve) => {
        if (img.complete) {
          resolve();
        } else {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }
      });
    });

    // Append to body temporarily
    document.body.appendChild(clonedElement);

    // Wait for images to load
    await Promise.all(imagePromises);

    // Extra time for fonts and rendering
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('✅ Certificate element ready for capture');
    return clonedElement;
  };

  const convertCanvasToPDF = async (canvas, certificateElement) => {
    const imgData = canvas.toDataURL('image/png', 1.0);

    // Clean up temporary element
    if (certificateElement && certificateElement.parentNode) {
      certificateElement.parentNode.removeChild(certificateElement);
    }

    try {
      // Use jsPDF
      const { jsPDF } = window;
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Calculate dimensions to fit A4
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      // Generate filename
      const filename = `certificate_${certificateData.participantName.replace(/[^a-zA-Z0-9]/g, '_')}_${certificateData.eventName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      
      pdf.save(filename);
      console.log('✅ PDF downloaded successfully');

    } catch (error) {
      console.error('PDF generation failed, downloading as PNG:', error);
      
      // Fallback: download as PNG
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `certificate_${certificateData.participantName.replace(/[^a-zA-Z0-9]/g, '_')}_${certificateData.eventName.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      link.click();
    }
  };

  const sendEmailNotification = async (canvas) => {
    try {
      const emailData = {
        eventId: certificateData.eventId,
        participantEmail: student.email,
        participantName: certificateData.participantName,
        eventName: certificateData.eventName
      };

      await clientAPI.sendCertificateEmail(emailData);
      console.log('✅ Email notification sent');
    } catch (error) {
      console.warn('Email notification failed:', error);
      // Don't fail the download for email issues
    }
  };

  const openPreviewModal = () => {
    if (!certificateContent || certificateContent.includes('certificate-loading')) {
      showStatus('Certificate template not loaded yet. Please wait...', 'error');
      return;
    }
    setShowPreviewModal(true);
    document.body.style.overflow = 'hidden';
  };

  const closePreviewModal = () => {
    setShowPreviewModal(false);
    document.body.style.overflow = '';
  };

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </ClientLayout>
    );
  }

  if (error) {
    return (
      <ClientLayout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4">
            <div className="bg-white border border-red-200 rounded-lg p-6 mb-6 shadow-sm">
              <div className="text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-exclamation-triangle text-red-500 text-2xl"></i>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Certificate Not Available</h2>
                <p className="text-gray-600 mb-4">{error}</p>
                <Link 
                  to="/client/events" 
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <i className="fas fa-arrow-left mr-2"></i>
                  Back to Events
                </Link>
              </div>
            </div>
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Download Certificate</h1>
            <h2 className="text-xl text-gray-600">{event?.event_name}</h2>
            <p className="text-gray-500 mt-2">
              Congratulations! Your certificate is ready for download.
            </p>
          </div>

          {/* Certificate Actions */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-8">
            <div className="p-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button
                  onClick={downloadCertificate}
                  disabled={isDownloading}
                  className="download-btn bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center gap-2"
                >
                  {isDownloading ? (
                    <>
                      <div className="loading-spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-download"></i>
                      Download Certificate (PDF)
                    </>
                  )}
                </button>

                <button
                  onClick={openPreviewModal}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center gap-2"
                >
                  <i className="fas fa-eye"></i>
                  Preview Certificate
                </button>
              </div>

              {/* Status Message */}
              {statusMessage && (
                <div className={`mt-4 p-3 rounded-lg text-center font-medium ${
                  statusType === 'success' ? 'bg-green-100 text-green-700' :
                  statusType === 'error' ? 'bg-red-100 text-red-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {statusMessage}
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              <i className="fas fa-info-circle text-blue-500 mr-2"></i>
              Instructions
            </h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start">
                <i className="fas fa-check text-green-500 mr-2 mt-1"></i>
                Click "Download Certificate" to generate and download your certificate as a PDF
              </li>
              <li className="flex items-start">
                <i className="fas fa-check text-green-500 mr-2 mt-1"></i>
                Use "Preview Certificate" to see how your certificate looks before downloading
              </li>
              <li className="flex items-start">
                <i className="fas fa-check text-green-500 mr-2 mt-1"></i>
                A copy will also be sent to your registered email address
              </li>
              <li className="flex items-start">
                <i className="fas fa-check text-green-500 mr-2 mt-1"></i>
                Keep your certificate safe - you can download it multiple times if needed
              </li>
            </ul>
          </div>

          {/* Navigation */}
          <div className="text-center">
            <Link 
              to={`/client/events/${eventId}`}
              className="inline-block px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors mr-4"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Back to Event
            </Link>
            <Link 
              to="/client/events"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <i className="fas fa-calendar mr-2"></i>
              View All Events
            </Link>
          </div>
        </div>
      </div>

      {/* Hidden certificate content for processing */}
      <div 
        id="certificate-content" 
        className="fixed -left-[9999px] top-0"
        style={{ visibility: 'hidden' }}
        dangerouslySetInnerHTML={{ __html: certificateContent }}
      />

      {/* Certificate Preview Modal */}
      {showPreviewModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          style={{ backdropFilter: 'blur(4px)' }}
        >
          <div className="relative bg-white shadow-2xl rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
            {/* Close Button */}
            <button
              onClick={closePreviewModal}
              className="absolute top-3 right-3 z-20 bg-black bg-opacity-80 hover:bg-opacity-100 text-white rounded-full p-2 transition-all duration-200 shadow-lg"
            >
              <i className="fas fa-times"></i>
            </button>
            
            {/* Certificate Content */}
            <div 
              className="p-4"
              dangerouslySetInnerHTML={{ __html: certificateContent }}
            />
          </div>
        </div>
      )}
    </ClientLayout>
  );
};

export default CertificateDownload;
