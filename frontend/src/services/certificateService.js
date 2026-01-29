/**
 * Certificate Distribution Service
 * Handles certificate template fetching, placeholder replacement, and PDF generation
 */

import html2canvas from 'html2canvas';
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
   * Supports: {{}}, {}, [], ()
   */
  replacePlaceholders(htmlContent, userData) {
    let processedHtml = htmlContent;

    // Define all placeholder patterns
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
        const key = placeholder.trim().toLowerCase().replace(/[_\s]+/g, '_');
        
        // Try to find matching data
        if (userData[key] !== undefined) {
          console.log(`✓ Replaced: ${match} → ${userData[key]}`);
          return userData[key];
        }
        
        // Keep original if no match found
        console.warn(`⚠️ No data found for placeholder: ${match}`);
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
   */
  async generateCertificatePDF(filledHtml, filename) {
    try {
      console.log('📄 Generating PDF with html2canvas + jsPDF...');
      
      // Create iframe to properly render the HTML
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.top = '-10000px';
      iframe.style.left = '-10000px';
      iframe.style.width = '1052px';
      iframe.style.height = '744px';
      iframe.style.border = 'none';
      iframe.style.background = 'white';
      document.body.appendChild(iframe);

      // Write HTML content to iframe
      const iframeDoc = iframe.contentWindow.document;
      iframeDoc.open();
      // Remove any stray br tags that might break formatting
      const cleanedHtml = filledHtml.replace(/<br\s*\/?>/gi, ' ');
      iframeDoc.write(cleanedHtml);
      iframeDoc.close();

      // Wait for content to load and render completely
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get the certificate wrapper element
      const certificateWrapper = iframeDoc.querySelector('.certificate-wrapper');
      
      if (!certificateWrapper) {
        throw new Error('Certificate wrapper not found in template');
      }

      console.log('🎨 Capturing certificate wrapper...');

      // Capture the element as canvas
      const canvas = await html2canvas(certificateWrapper, {
        scale: 5,
        useCORS: true,
        allowTaint: true,
        logging: true,
        backgroundColor: '#ffffff',
        width: 1052,
        height: 744,
        windowWidth: 1052,
        windowHeight: 744,
        imageTimeout: 0,
        removeContainer: false,
        letterRendering: true,
        onclone: (clonedDoc) => {
          // Ensure text doesn't wrap
          const textElements = clonedDoc.querySelectorAll('.dynamic-element');
          textElements.forEach(el => {
            el.style.whiteSpace = 'nowrap';
            el.style.overflow = 'visible';
          });
        }
      });

      console.log('✅ Canvas captured:', canvas.width, 'x', canvas.height);

      // Create PDF from canvas
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [1052, 744],
        compress: true
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 1052, 744, '', 'SLOW');
      pdf.save(filename || 'certificate.pdf');
      
      // Clean up
      document.body.removeChild(iframe);
      
      console.log('✅ PDF generated and downloaded successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      // Clean up on error
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
