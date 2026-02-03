/**
 * Certificate Distribution Service
 * Handles certificate template fetching, placeholder replacement, and PDF generation
 */

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import html2pdf from 'html2pdf.js';

class CertificateService {
  constructor() {
    // In-memory cache for templates (cleared on page refresh)
    this.templateCache = new Map();
  }

  /**
   * Fetch certificate HTML template from URL and cache it
   */
  async fetchTemplate(templateUrl) {
    // Check cache first
    if (this.templateCache.has(templateUrl)) {
      console.log('📦 Using cached template');
      return this.templateCache.get(templateUrl);
    }

    try {
      console.log('🌐 Fetching template from:', templateUrl);
      const response = await fetch(templateUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch template: ${response.status} ${response.statusText}`);
      }

      const htmlContent = await response.text();
      
      // Validate HTML content
      if (!htmlContent || htmlContent.trim().length === 0) {
        throw new Error('Empty template received');
      }

      // Cache the template
      this.templateCache.set(templateUrl, htmlContent);
      console.log('✅ Template fetched and cached');
      
      return htmlContent;
    } catch (error) {
      console.error('❌ Error fetching template:', error);
      throw new Error(`Unable to load certificate template: ${error.message}`);
    }
  }

  /**
   * Replace all placeholder formats with actual data
   * Preserves original element styling and positioning
   */
  replacePlaceholders(htmlContent, userData) {
    let processedHtml = htmlContent;

    // Define all placeholder patterns (order matters - do most specific first)
    const patterns = [
      { regex: /\{\{([^}]+)\}\}/g, name: 'double curly' },  // {{PLACEHOLDER}}
      { regex: /\{([^}]+)\}/g, name: 'single curly' },      // {PLACEHOLDER}
      { regex: /\[([^\]]+)\]/g, name: 'square' },           // [PLACEHOLDER]
      { regex: /\(([^)]+)\)/g, name: 'parentheses' }        // (PLACEHOLDER)
    ];

    // Process each pattern
    patterns.forEach(({ regex, name }) => {
      const matches = [...processedHtml.matchAll(regex)];
      
      if (matches.length > 0) {
        console.log(`🔍 Found ${matches.length} ${name} bracket placeholders`);
      }

      processedHtml = processedHtml.replace(regex, (match, placeholder) => {
        // Clean the placeholder key - handle extra spaces
        const key = placeholder.trim().toLowerCase().replace(/[_\s-]+/g, '_');
        
        // Try to find matching data
        if (userData[key] !== undefined && userData[key] !== null && userData[key] !== '') {
          const value = String(userData[key]).trim();
          console.log(`✓ Replaced: ${match} → ${value}`);
          
          // Wrap in span to maintain inline positioning
          return `<span style="display: inline; white-space: nowrap;">${value}</span>`;
        }
        
        // Try variations without special characters
        const cleanKey = key.replace(/[^a-z0-9_]/g, '');
        if (userData[cleanKey] !== undefined && userData[cleanKey] !== null && userData[cleanKey] !== '') {
          const value = String(userData[cleanKey]).trim();
          console.log(`✓ Replaced: ${match} → ${value} (using ${cleanKey})`);
          
          // Wrap in span to maintain inline positioning
          return `<span style="display: inline; white-space: nowrap;">${value}</span>`;
        }
        
        // Keep original if no match found
        console.warn(`⚠️ No data found for placeholder: ${match} (tried keys: ${key}, ${cleanKey})`);
        return match;
      });
    });

    return processedHtml;
  }

  /**
   * Prepare user data in all possible variations for matching
   */
  prepareUserData(registrationData, eventData) {
    const userData = {};
    
    // Extract student/faculty info based on registration type
    const participant = registrationData.student || registrationData.faculty;
    const isTeam = registrationData.registration_type === 'team';
    
    if (!participant) {
      console.error('❌ No participant data found in registration');
      return userData;
    }

    // Participant name variations
    const fullName = participant.name || 'Participant';
    userData['name'] = fullName;
    userData['full_name'] = fullName;
    userData['fullname'] = fullName;
    userData['participant_name'] = fullName;
    userData['participantname'] = fullName;
    userData['participant'] = fullName;
    userData['student_name'] = fullName;
    userData['studentname'] = fullName;
    userData['faculty_name'] = fullName;
    userData['facultyname'] = fullName;

    // Team information (if applicable)
    if (isTeam && registrationData.team) {
      userData['team_name'] = registrationData.team.team_name || 'Team';
      userData['teamname'] = registrationData.team.team_name || 'Team';
      userData['team'] = registrationData.team.team_name || 'Team';
    }

    // Contact information
    userData['email'] = participant.email || '';
    userData['phone'] = participant.phone || participant.contact_no || '';
    userData['contact'] = participant.phone || participant.contact_no || '';
    userData['mobile'] = participant.phone || participant.contact_no || '';

    // Department/Academic info
    userData['department'] = participant.department || '';
    userData['dept'] = participant.department || '';
    
    // Student-specific
    if (registrationData.student) {
      userData['enrollment'] = participant.enrollment_no || '';
      userData['enrollment_no'] = participant.enrollment_no || '';
      userData['enrollmentno'] = participant.enrollment_no || '';
      userData['enrollment_number'] = participant.enrollment_no || '';
      userData['roll_no'] = participant.enrollment_no || '';
      userData['rollno'] = participant.enrollment_no || '';
      userData['year'] = participant.year || '';
      userData['semester'] = participant.semester || '';
      userData['sem'] = participant.semester || '';
    }

    // Faculty-specific
    if (registrationData.faculty) {
      userData['employee_id'] = participant.employee_id || '';
      userData['employeeid'] = participant.employee_id || '';
      userData['designation'] = participant.designation || '';
    }

    // Event information
    userData['event_name'] = eventData.event_name || '';
    userData['eventname'] = eventData.event_name || '';
    userData['event'] = eventData.event_name || '';
    userData['event_type'] = eventData.event_type || '';
    userData['eventtype'] = eventData.event_type || '';

    // Date information
    const eventDate = new Date(eventData.start_datetime || eventData.start_date);
    const issueDate = new Date();
    
    userData['date'] = eventDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    userData['event_date'] = userData['date'];
    userData['eventdate'] = userData['date'];
    userData['issue_date'] = issueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    userData['issuedate'] = userData['issue_date'];
    userData['certificate_date'] = userData['issue_date'];
    userData['certificatedate'] = userData['issue_date'];

    // Registration ID
    userData['registration_id'] = registrationData.registration_id || '';
    userData['registrationid'] = registrationData.registration_id || '';
    userData['reg_id'] = registrationData.registration_id || '';

    console.log('📋 Prepared user data with', Object.keys(userData).length, 'field variations');
    
    return userData;
  }

  /**
   * Generate and download certificate as PDF
   * Mobile: Inline iframe + download link (no popups)
   * Desktop: Print method for best quality
   */
  async generateCertificatePDF(filledHtml, filename) {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Mobile: Use inline approach (no popups blocked)
      return await this.generateCertificatePDF_Mobile(filledHtml, filename);
    } else {
      // Desktop: Use print for perfect quality
      return await this.generateCertificatePDF_Print(filledHtml, filename);
    }
  }

  /**
   * Mobile method: Uses iframe + Print API (same quality as desktop)
   */
  async generateCertificatePDF_Mobile(filledHtml, filename) {
    try {
      console.log('📱 Generating mobile certificate using Print method...');
      
      // Clean HTML
      let cleanedHtml = filledHtml;
      cleanedHtml = cleanedHtml.replace(/<br\s*\/?>/gi, ' ');
      cleanedHtml = cleanedHtml.replace(/oklch\([^)]+\)/gi, 'rgb(0, 0, 0)');
      
      // Add print styles to ensure perfect rendering
      const printStyles = `
        <style>
          @page {
            size: 1052px 744px;
            margin: 0;
          }
          @media print {
            body {
              margin: 0;
              padding: 0;
              width: 1052px;
              height: 744px;
              overflow: hidden;
            }
            .certificate-wrapper {
              width: 1052px !important;
              height: 744px !important;
              page-break-after: avoid;
              page-break-inside: avoid;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
          }
          body {
            margin: 0;
            padding: 0;
            width: 1052px;
            height: 744px;
            overflow: hidden;
          }
          .mobile-print-overlay {
            display: none !important;
          }
          @media print {
            .mobile-print-overlay {
              display: none !important;
            }
          }
        </style>
      `;
      
      // Inject styles into HTML
      if (cleanedHtml.includes('</head>')) {
        cleanedHtml = cleanedHtml.replace('</head>', printStyles + '</head>');
      } else {
        cleanedHtml = printStyles + cleanedHtml;
      }
      
      // Create overlay with instructions
      const overlay = document.createElement('div');
      overlay.className = 'mobile-print-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        z-index: 999999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
        box-sizing: border-box;
      `;
      
      const messageBox = document.createElement('div');
      messageBox.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 12px;
        text-align: center;
        max-width: 400px;
        width: 90%;
      `;
      
      messageBox.innerHTML = `
        <h2 style="margin: 0 0 15px 0; color: #1f2937; font-size: 22px;">📄 Certificate Ready!</h2>
        <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 16px; line-height: 1.5;">
          Tap the button below to open the print dialog.<br>
          Then select <strong>"Save as PDF"</strong> or <strong>"Print to PDF"</strong>
        </p>
        <button id="mobile-print-btn" style="
          background: #3b82f6;
          color: white;
          border: none;
          padding: 15px 30px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          margin-bottom: 10px;
          box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);
        ">
          🖨️ Open Print Dialog
        </button>
        <button id="mobile-cancel-btn" style="
          background: #6b7280;
          color: white;
          border: none;
          padding: 12px 30px;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
          width: 100%;
        ">
          ✕ Cancel
        </button>
      `;
      
      overlay.appendChild(messageBox);
      document.body.appendChild(overlay);
      
      // Create hidden iframe for printing
      const iframe = document.createElement('iframe');
      iframe.style.cssText = `
        position: absolute;
        width: 1052px;
        height: 744px;
        left: -9999px;
        top: 0;
        border: none;
      `;
      document.body.appendChild(iframe);
      
      // Write certificate content to iframe
      const iframeDoc = iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(cleanedHtml);
      iframeDoc.close();
      
      // Wait for iframe to load
      await new Promise(resolve => {
        iframe.onload = resolve;
        setTimeout(resolve, 1000);
      });
      
      // Set up button handlers
      const printBtn = messageBox.querySelector('#mobile-print-btn');
      const cancelBtn = messageBox.querySelector('#mobile-cancel-btn');
      
      printBtn.onclick = () => {
        try {
          // Focus iframe and trigger print
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (err) {
          console.error('Print error:', err);
          alert('Unable to open print dialog. Please try again.');
        }
      };
      
      cancelBtn.onclick = () => {
        document.body.removeChild(overlay);
        document.body.removeChild(iframe);
      };
      
      // Auto-cleanup after print dialog closes (estimated)
      setTimeout(() => {
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 60000); // 1 minute timeout
      
      return { success: true, message: 'Print dialog opened' };
      
    } catch (error) {
      console.error('❌ Error generating mobile certificate:', error);
      
      // Cleanup on error
      const overlay = document.querySelector('.mobile-print-overlay');
      if (overlay && document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
      
      throw new Error(`Failed to generate certificate: ${error.message}`);
    }
  }

  /**
   * Desktop method: Browser native print (perfect quality & positioning)
   */
  async generateCertificatePDF_Print(filledHtml, filename) {
    try {
      console.log('📄 Opening certificate for print-to-PDF...');
      
      // Clean HTML
      let cleanedHtml = filledHtml;
      cleanedHtml = cleanedHtml.replace(/<br\s*\/?>/gi, ' ');
      cleanedHtml = cleanedHtml.replace(/oklch\([^)]+\)/gi, 'rgb(0, 0, 0)');
      
      // Add print styles to ensure perfect rendering
      const printStyles = `
        <style>
          @page {
            size: 1052px 744px;
            margin: 0;
          }
          @media print {
            body {
              margin: 0;
              padding: 0;
              width: 1052px;
              height: 744px;
              overflow: hidden;
            }
            .certificate-wrapper {
              width: 1052px !important;
              height: 744px !important;
              page-break-after: avoid;
              page-break-inside: avoid;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
          }
          body {
            margin: 0;
            padding: 0;
            width: 1052px;
            height: 744px;
            overflow: hidden;
          }
          .no-print {
            display: none !important;
          }
        </style>
      `;
      
      // Add print button and instructions (mobile-friendly)
      const printUI = `
        <div class="no-print" style="position: fixed; top: 10px; left: 50%; transform: translateX(-50%); z-index: 9999; background: white; padding: 15px 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 90vw;">
          <h2 style="margin: 0 0 8px 0; color: #1f2937; font-size: 18px;">Certificate Ready!</h2>
          <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px;">Click Print and select "Save as PDF"</p>
          <button onclick="window.print()" style="background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-size: 15px; cursor: pointer; margin-right: 8px; margin-bottom: 5px;">
            🖨️ Print to PDF
          </button>
          <button onclick="window.close()" style="background: #6b7280; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-size: 15px; cursor: pointer; margin-bottom: 5px;">
            ✕ Close
          </button>
        </div>
      `;
      
      // Inject styles
      if (cleanedHtml.includes('</head>')) {
        cleanedHtml = cleanedHtml.replace('</head>', printStyles + '</head>');
      } else {
        cleanedHtml = printStyles + cleanedHtml;
      }
      
      // Add print UI after body tag
      if (cleanedHtml.includes('<body')) {
        cleanedHtml = cleanedHtml.replace(/(<body[^>]*>)/, '$1' + printUI);
      } else {
        cleanedHtml = printUI + cleanedHtml;
      }
      
      // Open in new window
      const printWindow = window.open('', '_blank', 'width=1052,height=744');
      
      if (!printWindow) {
        throw new Error('Failed to open print window. Please allow pop-ups for this site.');
      }
      
      printWindow.document.write(cleanedHtml);
      printWindow.document.close();
      
      // Wait for content to load
      await new Promise(resolve => {
        if (printWindow.document.readyState === 'complete') {
          resolve();
        } else {
          printWindow.onload = resolve;
        }
      });
      
      console.log('✅ Certificate opened in new window. Use Print to save as PDF.');
      return { success: true, message: 'Certificate opened. Click "Print to PDF" button.' };
      
    } catch (error) {
      console.error('❌ Error opening certificate:', error);
      throw new Error(`Failed to open certificate: ${error.message}`);
    }
  }

  /**
   * Mobile method: html2canvas for better mobile UX
   */
  async generateCertificatePDF_Canvas(filledHtml, filename) {
    try {
      console.log('📱 Generating PDF for mobile...');
      
      // Create iframe
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.top = '-10000px';
      iframe.style.left = '-10000px';
      iframe.style.width = '1052px';
      iframe.style.height = '744px';
      iframe.style.border = 'none';
      iframe.style.background = 'white';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow.document;
      iframeDoc.open();
      
      let cleanedHtml = filledHtml;
      cleanedHtml = cleanedHtml.replace(/<br\s*\/?>/gi, ' ');
      cleanedHtml = cleanedHtml.replace(/oklch\([^)]+\)/gi, 'rgb(0, 0, 0)');
      
      iframeDoc.write(cleanedHtml);
      iframeDoc.close();

      await new Promise(resolve => setTimeout(resolve, 2000));

      const certificateWrapper = iframeDoc.querySelector('.certificate-wrapper');
      if (!certificateWrapper) {
        throw new Error('Certificate wrapper not found');
      }

      console.log('📸 Capturing...');

      const canvas = await html2canvas(certificateWrapper, {
        scale: 6,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 1052,
        height: 744
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [1052, 744]
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, 1052, 744);
      pdf.save(filename || 'certificate.pdf');
      
      document.body.removeChild(iframe);
      
      console.log('✅ PDF downloaded');
      return { success: true };
    } catch (error) {
      console.error('❌ Error:', error);
      const iframe = document.querySelector('iframe[style*="-10000px"]');
      if (iframe) document.body.removeChild(iframe);
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  }

  /**
   * Check if user is eligible for certificate
   */
  checkEligibility(registrationData, eventData) {
    try {
      // Get attendance data
      const attendance = registrationData.attendance;
      
      if (!attendance) {
        return {
          eligible: false,
          reason: 'No attendance record found'
        };
      }

      // Get user's attendance percentage
      const userPercentage = attendance.percentage || 0;

      // Get event's passing criteria
      const passingCriteria = eventData.attendance_strategy?.criteria?.minimum_percentage || 
                             eventData.attendance_strategy?.minimum_percentage ||
                             eventData.minimum_percentage ||
                             75; // Default to 75%

      console.log(`🎯 Eligibility Check: User ${userPercentage}% vs Required ${passingCriteria}%`);

      if (userPercentage >= passingCriteria) {
        return {
          eligible: true,
          percentage: userPercentage,
          required: passingCriteria
        };
      } else {
        return {
          eligible: false,
          reason: `Insufficient attendance`,
          percentage: userPercentage,
          required: passingCriteria
        };
      }
    } catch (error) {
      console.error('❌ Error checking eligibility:', error);
      return {
        eligible: false,
        reason: 'Unable to verify attendance records'
      };
    }
  }

  /**
   * Main method to generate certificate
   */
  async generateCertificate(registrationData, eventData, certificateTemplateUrl, certificateType = 'Certificate') {
    try {
      // 1. Check eligibility first
      const eligibility = this.checkEligibility(registrationData, eventData);
      
      if (!eligibility.eligible) {
        return {
          success: false,
          error: eligibility.reason,
          details: eligibility
        };
      }

      // 2. Fetch template
      const htmlTemplate = await this.fetchTemplate(certificateTemplateUrl);

      // 3. Prepare user data
      const userData = this.prepareUserData(registrationData, eventData);

      // 4. Replace placeholders
      const filledHtml = this.replacePlaceholders(htmlTemplate, userData);

      // 5. Generate filename
      const participantName = (registrationData.student?.name || registrationData.faculty?.name || 'Participant')
        .replace(/[^a-zA-Z0-9]/g, '_');
      const eventName = eventData.event_name.replace(/[^a-zA-Z0-9]/g, '_');
      const certType = certificateType.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${certType}_${eventName}_${participantName}.pdf`;

      // 6. Generate and download PDF
      await this.generateCertificatePDF(filledHtml, filename);

      return {
        success: true,
        message: 'Certificate downloaded successfully!'
      };

    } catch (error) {
      console.error('❌ Certificate generation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clear template cache (optional - useful for testing)
   */
  clearCache() {
    this.templateCache.clear();
    console.log('🗑️ Template cache cleared');
  }
}

// Export singleton instance
export default new CertificateService();
