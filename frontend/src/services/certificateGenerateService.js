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

  /**
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
  async fetchTemplate(templateUrl) {
    try {
      const response = await fetch(templateUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch template: ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      
      // Return a fallback template if the URL fails
      return this.getFallbackTemplate();
    }
  }

  /**
   * Get fallback template if URL fetch fails
   */
  getFallbackTemplate() {
    return `
      <html>
        <head>
          <title>Certificate</title>
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
    `;
  }

  /**
   * Convert HTML to React PDF components
   */
  convertHtmlToPdfComponents(htmlContent, studentData) {
    // Extract title from HTML
    const titleMatch = htmlContent.match(/<h1[^>]*class="title"[^>]*>(.*?)<\/h1>/i);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : 'Certificate';

    // Extract name
    const nameMatch = htmlContent.match(/<p[^>]*class="name"[^>]*>(.*?)<\/p>/i);
    const studentName = nameMatch ? nameMatch[1].replace(/<[^>]*>/g, '').trim() : studentData.full_name;

    // Extract content sections
    const contentSections = [];
    const contentMatches = htmlContent.match(/<p[^>]*class="content"[^>]*>(.*?)<\/p>/gi);
    if (contentMatches) {
      contentMatches.forEach(match => {
        const text = match.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        if (text) {
          contentSections.push(text);
        }
      });
    }

    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={styles.certificate}>
            {/* Certificate Border */}
            <View style={styles.border}>
              {/* Title */}
              <Text style={styles.title}>{title}</Text>
              
              {/* Content */}
              <Text style={styles.content}>This is to certify that</Text>
              
              {/* Student Name */}
              <Text style={styles.studentName}>{studentData.full_name}</Text>
              
              {/* Details */}
              <Text style={styles.content}>
                with enrollment number {studentData.enrollment} from {studentData.department}
              </Text>
              <Text style={styles.content}>has successfully participated in</Text>
              
              {/* Event Name */}
              <Text style={styles.eventName}>{studentData.event_name}</Text>
              
              {/* Description */}
              <Text style={styles.content}>
                organized by CampusConnect Institution.
              </Text>
              <Text style={styles.content}>
                The participant has demonstrated exceptional engagement and learning during this event.
              </Text>
              
              {/* Certificate Details */}
              <View style={styles.details}>
                <Text style={styles.detailText}>Certificate ID: {studentData.certificate_id}</Text>
                <Text style={styles.detailText}>Date of Issue: {studentData.certificate_issue_date}</Text>
                <Text style={styles.detailText}>Event Date: {studentData.event_date}</Text>
              </View>
              
              {/* Signature */}
              <View style={styles.signature}>
                <Text style={styles.signatureText}>Digital Signature</Text>
                <Text style={styles.signatureTitle}>Event Coordinator</Text>
                <Text style={styles.signatureTitle}>CampusConnect Institution</Text>
              </View>
            </View>
          </View>
        </Page>
      </Document>
    );
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

      // Fetch the HTML template
      const htmlTemplate = await this.fetchTemplate(templateUrl);

      // Prepare student data
      const studentData = this.prepareStudentData(student, registration, event, attendance);

      // Replace placeholders
      const processedHtml = this.replacePlaceholders(htmlTemplate, studentData);

      // Convert to PDF components
      const pdfComponents = this.convertHtmlToPdfComponents(processedHtml, studentData);

      // Generate PDF
      const pdfBlob = await pdf(pdfComponents).toBlob();

      // Create download
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${certificateType.replace(/\s+/g, '_')}_${studentData.name.replace(/\s+/g, '_')}_${studentData.event_name.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return {
        success: true,
        message: 'Certificate downloaded successfully'
      };

    } catch (error) {
      
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
  content: {
    fontSize: 14,
    lineHeight: 1.6,
    textAlign: 'center',
    marginBottom: 15,
    color: '#2d3748',
  },
  studentName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 10,
    color: '#2b6cb0',
    textAlign: 'center',
  },
  eventName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 10,
    color: '#2b6cb0',
    textAlign: 'center',
  },
  details: {
    marginTop: 40,
    marginBottom: 40,
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
  },
  signatureTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 3,
    color: '#2d3748',
  },
});

// Export singleton instance
export default new CertificateGenerateService();
