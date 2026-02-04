/**
 * Certificate Distribution Service
 * Handles certificate template fetching, placeholder replacement, and PDF generation
 */

import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

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
          
          // Return plain value to preserve original template styling
          return value;
        }
        
        // Try variations without special characters
        const cleanKey = key.replace(/[^a-z0-9_]/g, '');
        if (userData[cleanKey] !== undefined && userData[cleanKey] !== null && userData[cleanKey] !== '') {
          const value = String(userData[cleanKey]).trim();
          console.log(`✓ Replaced: ${match} → ${value} (using ${cleanKey})`);
          
          // Return plain value to preserve original template styling
          return value;
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
   * Mobile: Opens in new window with native browser PDF export
   * Desktop: Print method
   */
  async generateCertificatePDF(filledHtml, filename) {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      return await this.generateCertificatePDF_Mobile(filledHtml, filename);
    } else {
      return await this.generateCertificatePDF_Print(filledHtml, filename);
    }
  }

  /**
   * Mobile: Opens certificate in NEW TAB for user to save as PDF via browser
   * This is the ONLY way to preserve fonts - browser's native rendering
   */
  async generateCertificatePDF_Mobile(filledHtml, filename) {
    try {
      console.log('📱 Opening certificate in new tab...');
      
      // Clean HTML
      let cleanedHtml = filledHtml;
      cleanedHtml = cleanedHtml.replace(/<br\s*\/?>/gi, ' ');
      cleanedHtml = cleanedHtml.replace(/oklch\([^)]+\)/gi, 'rgb(0, 0, 0)');
      
      // Open in NEW TAB (not popup) - no size params = new tab on mobile
      const newTab = window.open('about:blank', '_blank');
      
      if (!newTab) {
        throw new Error('Could not open new tab. Please allow popups for this site and try again.');
      }
      
      // Write certificate with print styles and save instructions
      newTab.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${filename.replace('.pdf', '')}</title>
  <style>
    @page { size: landscape; margin: 0; }
    @media print {
      body { margin: 0 !important; padding: 0 !important; }
      #save-instructions { display: none !important; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
    #save-instructions {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #1e40af, #3b82f6);
      color: white;
      padding: 15px;
      text-align: center;
      z-index: 99999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 -4px 20px rgba(0,0,0,0.3);
    }
    #save-instructions button {
      background: white;
      color: #1e40af;
      border: none;
      padding: 12px 24px;
      font-size: 16px;
      font-weight: bold;
      border-radius: 8px;
      cursor: pointer;
      margin: 5px;
    }
    #save-instructions button:hover { background: #f0f0f0; }
    #save-instructions p { margin: 0 0 10px 0; font-size: 14px; }
  </style>
</head>
<body style="margin:0;padding:0;padding-bottom:80px;">
  ${cleanedHtml}
  <div id="save-instructions">
    <p>📱 <strong>To save as PDF:</strong> Tap the button below, then select "Save as PDF"</p>
    <button onclick="window.print()">💾 Save as PDF</button>
    <button onclick="window.close()">✕ Close Tab</button>
  </div>
</body>
</html>`);
      newTab.document.close();
      
      console.log('✅ Certificate opened in new tab. User can save via Print > Save as PDF');
      return { success: true, message: 'Certificate opened in new tab. Use Print to save as PDF.' };
      
    } catch (error) {
      console.error('❌ Error:', error);
      throw new Error(`Failed to open certificate: ${error.message}`);
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
          <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px;">Click Print and select 'Save as PDF'</p>
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
