import { Document, Page, Text, View, StyleSheet, pdf, Font, Image } from '@react-pdf/renderer';

/**
 * Certificate Generation Service
 * Fetches HTML templates, replaces placeholders with student data, and generates PDF certificates
 */

class CertificateGenerateService {
  constructor() {
    // Define placeholder patterns to match various bracket types
    this.placeholderPatterns = [
      /\{\{([^}]+)\}\}/g,  // {{placeholder}}
      /\{([^}]+)\}/g,      // {placeholder}
      /\[([^\]]+)\]/g,     // [placeholder]
      /\(([^)]+)\)/g       // (placeholder)
    ];
  }

  /*
   * Extract placeholders from HTML content
   */
  extractPlaceholders(htmlContent) {
    const placeholders = new Set();
    
    this.placeholderPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(htmlContent)) !== null) {
        placeholders.add(match[1].trim().toLowerCase());
      }
    });
    
    return Array.from(placeholders);
  }

  /**
   * Prepare student data for placeholder replacement
   */
  prepareStudentData(student, registration, event, attendance) {
    const now = new Date();
    
    return {
      // Student information
      'full_name': student?.full_name || registration?.full_name || 'N/A',
      'name': student?.full_name || registration?.full_name || 'N/A',
      'student_name': student?.full_name || registration?.full_name || 'N/A',
      'enrollment': student?.enrollment || registration?.registrar_id || 'N/A',
      'enrollment_number': student?.enrollment || registration?.registrar_id || 'N/A',
      'student_id': student?.enrollment || registration?.registrar_id || 'N/A',
      'email': student?.email || registration?.email || 'N/A',
      'department': student?.department || registration?.department || 'N/A',
      'course': student?.course || registration?.course || 'N/A',
      'year': student?.year || registration?.year || 'N/A',
      'semester': student?.semester || registration?.semester || 'N/A',
      'college': student?.college || 'N/A',
      'university': student?.university || 'N/A',
      
      // Event information
      'event_name': event?.event_name || 'N/A',
      'event_title': event?.event_name || 'N/A',
      'event_description': event?.description || 'N/A',
      'event_date': event?.event_date ? new Date(event.event_date).toLocaleDateString() : 'N/A',
      'event_duration': event?.duration || 'N/A',
      'event_venue': event?.venue || 'N/A',
      'event_organizer': event?.organizer || 'CampusConnect',
      
      // Registration information
      'registration_id': registration?.registration_id || registration?.registrar_id || 'N/A',
      'registration_date': registration?.created_at ? new Date(registration.created_at).toLocaleDateString() : 'N/A',
      
      // Attendance information
      'attendance_id': attendance?.attendance_id || 'N/A',
      'attendance_date': attendance?.marked_at ? new Date(attendance.marked_at).toLocaleDateString() : 'N/A',
      
      // Certificate information
      'certificate_issue_date': now.toLocaleDateString(),
      'certificate_date': now.toLocaleDateString(),
      'issue_date': now.toLocaleDateString(),
      'date_issued': now.toLocaleDateString(),
      'current_date': now.toLocaleDateString(),
      'today_date': now.toLocaleDateString(),
      'certificate_id': `CERT_${event?.event_id || 'EVENT'}_${registration?.registrar_id || 'USER'}_${now.getTime()}`,
      
      // Common placeholders
      'college_name': 'CampusConnect Institution',
      'institution': 'CampusConnect Institution',
      'principal_name': 'Dr. Principal Name',
      'hod_name': 'Dr. HOD Name',
      'coordinator_name': 'Event Coordinator',
      'signature': '[Digital Signature]',
      'seal': '[Official Seal]'
    };
  }

  /**
   * Replace placeholders in HTML content
   */
  replacePlaceholders(htmlContent, data) {
    let processedContent = htmlContent;
    
    this.placeholderPatterns.forEach(pattern => {
      processedContent = processedContent.replace(pattern, (match, placeholder) => {
        const key = placeholder.trim().toLowerCase();
        return data[key] || match; // Keep original if no replacement found
      });
    });
    
    return processedContent;
  }

  /**
   * Fetch HTML template from URL
   */
  async fetchTemplate(templateUrl, certificateType = 'Certificate of Participation') {
    try {
      console.log(`Attempting to fetch template from URL: ${templateUrl}`);
      
      // Try multiple methods to fetch the template
      const fetchOptions = [
        { method: 'GET', mode: 'cors' },
        { method: 'GET', mode: 'no-cors' },
        { method: 'GET' }
      ];

      for (const options of fetchOptions) {
        try {
          console.log(`Trying fetch with options:`, options);
          const response = await fetch(templateUrl, options);
          
          if (response.ok) {
            const htmlContent = await response.text();
            console.log(`Successfully fetched template. Content length: ${htmlContent.length}`);
            console.log('Template content preview:', htmlContent.substring(0, 200));
            
            // Validate that we got actual HTML content
            if (htmlContent && htmlContent.length > 50 && htmlContent.includes('<')) {
              console.log('Valid HTML template fetched successfully');
              return htmlContent;
            } else {
              console.warn('Invalid HTML content received');
            }
          } else {
            console.warn(`Fetch failed with status: ${response.status} ${response.statusText}`);
          }
        } catch (fetchError) {
          console.warn(`Fetch attempt failed:`, fetchError.message);
        }
      }
      
      console.error('All fetch attempts failed, using fallback template');
      return this.getFallbackTemplate(certificateType);
      
    } catch (error) {
      console.error('Error in fetchTemplate:', error);
      console.log('Using fallback template due to error');
      return this.getFallbackTemplate(certificateType);
    }
  }

  /**
   * Get fallback template if URL fetch fails
   */
  getFallbackTemplate(certificateType = 'Certificate of Participation') {
    const templates = {
      'Certificate of Participation': `
        <html>
          <head>
            <title>Certificate of Participation</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .certificate { border: 3px solid #1a365d; padding: 40px; margin: 20px; }
              .title { font-size: 32px; color: #1a365d; margin-bottom: 30px; }
              .content { font-size: 18px; line-height: 1.6; margin: 20px 0; }
              .name { font-size: 24px; font-weight: bold; color: #2b6cb0; margin: 20px 0; }
              .date { margin-top: 40px; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="certificate">
              <h1 class="title">Certificate of Participation</h1>
              
              <p class="content">
                This is to certify that
              </p>
              
              <p class="name">{{full_name}}</p>
              
              <p class="content">
                with enrollment number <strong>{{enrollment}}</strong> from <strong>{{department}}</strong>
                has successfully participated in
              </p>
              
              <p class="name">{{event_name}}</p>
              
              <p class="content">
                organized by CampusConnect Institution.
              </p>
              
              <p class="content">
                The participant has demonstrated exceptional engagement and learning during this event.
              </p>
              
              <div class="date">
                <p>Certificate ID: {{certificate_id}}</p>
                <p>Date of Issue: {{certificate_issue_date}}</p>
                <p>Event Date: {{event_date}}</p>
              </div>
              
              <div style="margin-top: 60px;">
                <p>{{signature}}</p>
                <p><strong>Event Coordinator</strong></p>
                <p>CampusConnect Institution</p>
              </div>
            </div>
          </body>
        </html>
      `,
      
      'Certificate of Innovation': `
        <html>
          <head>
            <title>Certificate of Innovation</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .certificate { border: 3px solid #dc2626; padding: 40px; margin: 20px; }
              .title { font-size: 32px; color: #dc2626; margin-bottom: 30px; }
              .content { font-size: 18px; line-height: 1.6; margin: 20px 0; }
              .name { font-size: 24px; font-weight: bold; color: #ea580c; margin: 20px 0; }
              .date { margin-top: 40px; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="certificate">
              <h1 class="title">Certificate of Innovation</h1>
              
              <p class="content">
                This is to certify that
              </p>
              
              <p class="name">{{full_name}}</p>
              
              <p class="content">
                with enrollment number <strong>{{enrollment}}</strong> from <strong>{{department}}</strong>
                has demonstrated exceptional innovation and creativity in
              </p>
              
              <p class="name">{{event_name}}</p>
              
              <p class="content">
                organized by CampusConnect Institution.
              </p>
              
              <p class="content">
                The participant has shown outstanding problem-solving skills and innovative thinking 
                that distinguishes them as a future leader in technology.
              </p>
              
              <div class="date">
                <p>Certificate ID: {{certificate_id}}</p>
                <p>Date of Issue: {{certificate_issue_date}}</p>
                <p>Event Date: {{event_date}}</p>
              </div>
              
              <div style="margin-top: 60px;">
                <p>{{signature}}</p>
                <p><strong>Innovation Director</strong></p>
                <p>CampusConnect Institution</p>
              </div>
            </div>
          </body>
        </html>
      `
    };

    return templates[certificateType] || templates['Certificate of Participation'];
  }

  /**
   * Convert HTML to React PDF components
   */
  convertHtmlToPdfComponents(htmlContent, studentData) {
    console.log('Converting HTML to PDF. HTML length:', htmlContent.length);
    console.log('HTML content preview:', htmlContent.substring(0, 500));
    
    // Check if this is our fallback template (contains specific fallback markers)
    const isFallbackTemplate = htmlContent.includes('Certificate of Participation') && 
                              htmlContent.includes('CampusConnect Institution') &&
                              htmlContent.includes('{{full_name}}');
    
    if (isFallbackTemplate) {
      console.log('Using fallback template layout');
    } else {
      console.log('Using fetched template layout - processing real HTML content');
    }
    
    // Remove HTML tags but preserve line breaks and structure
    let textContent = htmlContent
      .replace(/<style[^>]*>.*?<\/style>/gis, '') // Remove style tags
      .replace(/<script[^>]*>.*?<\/script>/gis, '') // Remove script tags
      .replace(/<br\s*\/?>/gi, '\n') // Convert br tags to line breaks
      .replace(/<\/p>/gi, '\n\n') // Convert p end tags to double line breaks
      .replace(/<\/div>/gi, '\n') // Convert div end tags to line breaks
      .replace(/<\/h[1-6]>/gi, '\n\n') // Convert heading end tags to double line breaks
      .replace(/<[^>]*>/g, ' ') // Remove all remaining HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n\s+/g, '\n') // Clean up line breaks
      .trim();

    console.log('Processed text content:', textContent.substring(0, 300));

    // Split content into lines for better formatting
    const lines = textContent.split('\n').filter(line => line.trim());
    console.log('Number of content lines:', lines.length);
    
    // Try to identify the title from the HTML or processed content
    let titleLine = 'Certificate';
    
    // Look for certificate title in the original HTML
    const titleMatches = [
      htmlContent.match(/<h1[^>]*>(.*?)<\/h1>/i),
      htmlContent.match(/<title[^>]*>(.*?)<\/title>/i),
      htmlContent.match(/certificate\s+of\s+\w+/i),
    ];
    
    for (const match of titleMatches) {
      if (match && match[1]) {
        titleLine = match[1].replace(/<[^>]*>/g, '').trim();
        break;
      }
    }
    
    console.log('Extracted title:', titleLine);

    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={styles.certificate}>
            <View style={styles.border}>
              {/* Title */}
              <Text style={styles.title}>{titleLine}</Text>
              
              {/* Content - render all lines from the actual HTML */}
              <View style={styles.htmlContent}>
                {lines.map((line, index) => {
                  if (line === titleLine) return null; // Skip title line as it's already rendered
                  
                  // Skip empty lines
                  if (!line.trim()) return null;
                  
                  // Determine styling based on content
                  let style = styles.content;
                  const lowerLine = line.toLowerCase();
                  
                  if (lowerLine.includes(studentData.full_name.toLowerCase()) || 
                      (lowerLine.includes('test student') && studentData.full_name === 'Test Student')) {
                    style = styles.studentName;
                  } else if (lowerLine.includes(studentData.event_name.toLowerCase()) || 
                             lowerLine.includes('hackathon') || lowerLine.includes('event')) {
                    style = styles.eventName;
                  } else if (lowerLine.includes('certificate id') || 
                             lowerLine.includes('date of issue') || 
                             lowerLine.includes('cert_') ||
                             lowerLine.match(/\d{1,2}\/\d{1,2}\/\d{4}/)) {
                    style = styles.detailText;
                  } else if (lowerLine.includes('signature') || 
                             lowerLine.includes('coordinator') || 
                             lowerLine.includes('director') ||
                             lowerLine.includes('institution')) {
                    style = styles.signatureText;
                  }
                  
                  return (
                    <Text key={index} style={style}>
                      {line}
                    </Text>
                  );
                })}
              </View>
            </View>
          </View>
        </Page>
      </Document>
    );
  }

  /**
   * Render HTML content as PDF components (simplified version)
   */
  renderHtmlContent(htmlContent, studentData) {
    // This method is now handled within convertHtmlToPdfComponents
    return null;
  }

  /**
   * Generate PDF certificate
   */
  async generateCertificate(event, student, registration, attendance, certificateType = 'Certificate of Participation') {
    try {
      // Get the certificate template URL
      const templateUrl = event?.certificate_templates?.[certificateType];
      
      if (!templateUrl) {
        throw new Error(`Certificate template "${certificateType}" not found for this event`);
      }

      console.log(`Fetching certificate template from: ${templateUrl}`);

      // Fetch the HTML template
      const htmlTemplate = await this.fetchTemplate(templateUrl, certificateType);
      console.log('Fetched HTML template length:', htmlTemplate.length);

      // Prepare student data
      const studentData = this.prepareStudentData(student, registration, event, attendance);
      console.log('Prepared student data:', studentData);

      // Replace placeholders
      const processedHtml = this.replacePlaceholders(htmlTemplate, studentData);
      console.log('Processed HTML length:', processedHtml.length);

      // Convert to PDF components
      const pdfComponents = this.convertHtmlToPdfComponents(processedHtml, studentData);

      // Generate PDF
      const pdfBlob = await pdf(pdfComponents).toBlob();

      // Create download with better filename
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      
      // Clean filename
      const cleanStudentName = studentData.full_name.replace(/[^a-zA-Z0-9]/g, '_');
      const cleanEventName = studentData.event_name.replace(/[^a-zA-Z0-9]/g, '_');
      const cleanCertType = certificateType.replace(/[^a-zA-Z0-9]/g, '_');
      
      link.download = `${cleanCertType}_${cleanStudentName}_${cleanEventName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return {
        success: true,
        message: 'Certificate downloaded successfully'
      };

    } catch (error) {
      console.error('Error generating certificate:', error);
      return {
        success: false,
        message: error.message || 'Failed to generate certificate'
      };
    }
  }

  /**
   * Get available certificate templates for an event
   */
  getAvailableTemplates(event) {
    if (!event?.certificate_templates) {
      return [];
    }

    return Object.keys(event.certificate_templates).map(templateName => ({
      name: templateName,
      url: event.certificate_templates[templateName]
    }));
  }

  /**
   * Preview certificate data (for debugging)
   */
  previewCertificateData(event, student, registration, attendance) {
    const studentData = this.prepareStudentData(student, registration, event, attendance);
    const availableTemplates = this.getAvailableTemplates(event);
    
    return {
      studentData,
      availableTemplates,
      placeholders: this.extractPlaceholders('Sample {{full_name}} content with {email} and [department] and (event_name)')
    };
  }

  /**
   * Test template URL accessibility
   */
  async testTemplateUrl(templateUrl) {
    try {
      console.log(`Testing template URL: ${templateUrl}`);
      const response = await fetch(templateUrl, { method: 'HEAD' });
      console.log(`URL test result: ${response.status} ${response.statusText}`);
      return response.ok;
    } catch (error) {
      console.error(`URL test failed:`, error);
      return false;
    }
  }

  /**
   * Debug certificate generation process
   */
  async debugCertificateGeneration(event, student, registration, attendance, certificateType) {
    console.log('=== CERTIFICATE GENERATION DEBUG ===');
    console.log('Event:', event);
    console.log('Student:', student);
    console.log('Registration:', registration);
    console.log('Certificate Type:', certificateType);
    
    const templateUrl = event?.certificate_templates?.[certificateType];
    console.log('Template URL:', templateUrl);
    
    if (templateUrl) {
      const urlWorks = await this.testTemplateUrl(templateUrl);
      console.log('URL accessible:', urlWorks);
      
      if (urlWorks) {
        const template = await this.fetchTemplate(templateUrl, certificateType);
        console.log('Template fetched successfully, length:', template.length);
        console.log('Template preview:', template.substring(0, 500));
        
        const studentData = this.prepareStudentData(student, registration, event, attendance);
        const processedHtml = this.replacePlaceholders(template, studentData);
        console.log('Placeholders replaced, new length:', processedHtml.length);
        console.log('Processed HTML preview:', processedHtml.substring(0, 500));
      }
    }
    
    console.log('=== END DEBUG ===');
  }
}

// PDF Styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
  },
  certificate: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  border: {
    border: '3pt solid #1a365d',
    padding: 40,
    width: '100%',
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#1a365d',
    textAlign: 'center',
  },
  htmlContent: {
    flex: 1,
    width: '100%',
    marginBottom: 20,
  },
  content: {
    fontSize: 14,
    lineHeight: 1.6,
    textAlign: 'center',
    marginBottom: 10,
    color: '#2d3748',
  },
  studentName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    marginTop: 10,
    color: '#2b6cb0',
    textAlign: 'center',
  },
  eventName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    marginTop: 10,
    color: '#2b6cb0',
    textAlign: 'center',
  },
  details: {
    marginTop: 30,
    marginBottom: 20,
  },
  detailText: {
    fontSize: 12,
    marginBottom: 5,
    textAlign: 'center',
    color: '#4a5568',
  },
  signature: {
    marginTop: 50,
    textAlign: 'center',
  },
  signatureText: {
    fontSize: 12,
    marginBottom: 5,
    color: '#4a5568',
    textAlign: 'center',
  },
  signatureTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 3,
    color: '#2d3748',
    textAlign: 'center',
  },
});

// Export singleton instance
export default new CertificateGenerateService();
