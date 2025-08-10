// PDF generation service for event forms
export class EventPDFService {
  constructor() {
    this.templateCache = new Map();
  }

  // Load HTML template from public folder
  async loadTemplate() {
    if (this.templateCache.has('event_form')) {
      return this.templateCache.get('event_form');
    }

    try {
      const response = await fetch('/templates/event_form.html');
      if (!response.ok) {
        throw new Error(`Failed to load template: ${response.statusText}`);
      }
      const template = await response.text();
      this.templateCache.set('event_form', template);
      return template;
    } catch (error) {
      console.error('Error loading PDF template:', error);
      throw error;
    }
  }

  // Format date helper
  formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  }

  // Format time helper
  formatTime(timeString) {
    if (!timeString) return 'N/A';
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const minute = parseInt(minutes);
      const period = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
    } catch {
      return timeString;
    }
  }

  // Generate organizers HTML section
  generateOrganizersSection(organizers) {
    if (!organizers || organizers.length === 0) {
      return '';
    }

    const organizersHTML = organizers.map((organizer, index) => {
      const details = [];
      if (organizer.email) details.push(`📧 ${organizer.email}`);
      if (organizer.employee_id) details.push(`🆔 ${organizer.employee_id}`);
      if (organizer.id) details.push(`Faculty ID: ${organizer.id}`);
      if (organizer.isNew) details.push('⚠️ New Organizer');

      return `
        <div class="organizer-item">
          <div class="organizer-name">${index + 1}. ${organizer.name || 'Unnamed'}</div>
          ${details.length > 0 ? `<div class="organizer-details">${details.join(' • ')}</div>` : ''}
        </div>
      `;
    }).join('');

    return `
      <div style="margin-top: 8px;">
        <div class="field-label" style="font-weight: bold; margin-bottom: 4px;">Event Organizers:</div>
        ${organizersHTML}
      </div>
    `;
  }

  // Generate contacts HTML section
  generateContactsSection(contacts) {
    if (!contacts || contacts.length === 0) {
      return '';
    }

    const contactsHTML = contacts.map(contact => `
      <div class="contact-item">📞 ${contact.name}: ${contact.contact}</div>
    `).join('');

    return `
      <div style="margin-top: 8px;">
        <div class="field-label" style="font-weight: bold; margin-bottom: 4px;">Contact Information:</div>
        ${contactsHTML}
      </div>
    `;
  }

  // Generate team settings HTML
  generateTeamSettings(eventData) {
    if (eventData.registration_mode !== 'team') {
      return '';
    }

    let teamHTML = '';
    if (eventData.team_size_min) {
      teamHTML += `
        <div class="field">
          <span class="field-label">Min Team Size:</span>
          <span class="field-value">${eventData.team_size_min}</span>
        </div>
      `;
    }
    if (eventData.team_size_max) {
      teamHTML += `
        <div class="field">
          <span class="field-label">Max Team Size:</span>
          <span class="field-value">${eventData.team_size_max}</span>
        </div>
      `;
    }
    if (eventData.allow_multiple_team_registrations) {
      teamHTML += `
        <div class="field">
          <span class="field-label">Multiple Teams:</span>
          <span class="field-value">✓ Allowed (with approval)</span>
        </div>
      `;
    }

    return teamHTML;
  }

  // Generate requirements section
  generateRequirementsSection(eventData) {
    if (!eventData.prerequisites && !eventData.what_to_bring) {
      return '';
    }

    let requirementsHTML = '<div class="section"><div class="section-title">6. Requirements</div>';
    
    if (eventData.prerequisites) {
      requirementsHTML += `
        <div style="font-weight: bold; margin-bottom: 5px;">Prerequisites:</div>
        <div class="description-box">${eventData.prerequisites.replace(/\n/g, '<br>')}</div>
      `;
    }

    if (eventData.what_to_bring) {
      requirementsHTML += `
        <div style="font-weight: bold; margin: 10px 0 5px 0;">What to Bring:</div>
        <div class="description-box">${eventData.what_to_bring.replace(/\n/g, '<br>')}</div>
      `;
    }

    requirementsHTML += '</div>';
    return requirementsHTML;
  }

  // Generate administrative section for executive admin
  generateAdministrativeSection(user) {
    if (user?.role !== 'executive_admin') {
      return '';
    }

    return `
      <div class="approval-section">
        <div class="section-title">ADMINISTRATIVE SECTION</div>
        <div class="checkbox-line">
          <span class="field-label">Event Review:</span>
          <span class="field-value">☐ Approved ☐ Needs Modification</span>
        </div>
        <div class="checkbox-line">
          <span class="field-label">Budget Approval:</span>
          <span class="field-value">☐ Approved ☐ Not Required</span>
        </div>
        <div class="checkbox-line">
          <span class="field-label">Venue Confirmation:</span>
          <span class="field-value">☐ Confirmed ☐ Alternative Required</span>
        </div>
        
        <div class="signatures">
          <div class="signature-box">
            <div class="signature-line">
              <strong>Academic Coordinator</strong><br>
              Date: _____________
            </div>
          </div>
          <div class="signature-box">
            <div class="signature-line">
              <strong>Department Head</strong><br>
              Date: _____________
            </div>
          </div>
        </div>
        
        <div class="comments-section">
          <div style="font-weight: bold; margin-bottom: 8px;">Comments/Notes:</div>
          <div class="comment-line"></div>
          <div class="comment-line"></div>
          <div class="comment-line"></div>
        </div>
      </div>
    `;
  }

  // Main method to generate PDF HTML
  async generatePDFHTML(eventData, user) {
    try {
      const template = await this.loadTemplate();
      const currentDate = new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      // Prepare all replacement values
      const replacements = {
        DOCUMENT_TITLE: `${user?.role === 'executive_admin' ? 'Event Request Form' : 'Event Details'} - ${eventData.event_name}`,
        EVENT_ID: eventData.event_id || 'N/A',
        EVENT_NAME: eventData.event_name || 'Untitled Event',
        
        // Header content based on user role
        HEADER_CONTENT: user?.role === 'executive_admin' ? `
          <h2>EVENT CREATION REQUEST FORM</h2>
          <p>Submitted by: ${eventData.event_created_by || user.fullname || user.username || 'Executive Admin'}</p>
          <p>Request Date: ${currentDate}</p>
          <p style="margin-top: 8px;">Status: <span class="status-pending">PENDING APPROVAL</span></p>
        ` : `
          <h2>Event Creation Confirmation</h2>
          <p>Generated on: ${currentDate}</p>
        `,

        // Request Summary for Executive Admin
        REQUEST_SUMMARY: user?.role === 'executive_admin' ? `
          <div class="section">
            <div class="section-title">REQUEST SUMMARY</div>
            <div class="field">
              <span class="field-label">Request Type:</span>
              <span class="field-value">New Event Creation</span>
            </div>
            <div class="field">
              <span class="field-label">Requested by:</span>
              <span class="field-value">${eventData.event_created_by || user.fullname || user.username || 'Executive Admin'}</span>
            </div>
            <div class="field">
              <span class="field-label">Department/Role:</span>
              <span class="field-value">Executive Administration</span>
            </div>
            <div class="field">
              <span class="field-label">Priority:</span>
              <span class="field-value">${eventData.is_xenesis_event ? 'HIGH (Xenesis Event)' : 'NORMAL'}</span>
            </div>
            <div class="field">
              <span class="field-label">Approval Required:</span>
              <span class="field-value">YES - Administrative Review</span>
            </div>
          </div>
        ` : '',

        // Event badges
        EVENT_BADGES: [
          `<span class="badge">${eventData.event_type?.charAt(0).toUpperCase() + eventData.event_type?.slice(1) || 'N/A'}</span>`,
          `<span class="badge">${eventData.target_audience?.charAt(0).toUpperCase() + eventData.target_audience?.slice(1) || 'N/A'}</span>`,
          `<span class="badge">${eventData.mode?.charAt(0).toUpperCase() + eventData.mode?.slice(1) || 'N/A'}</span>`,
          eventData.is_xenesis_event ? '<span class="badge">Xenesis Event</span>' : ''
        ].filter(Boolean).join(''),

        // Basic information
        EVENT_TYPE: eventData.event_type?.charAt(0).toUpperCase() + eventData.event_type?.slice(1) || 'N/A',
        TARGET_AUDIENCE: eventData.target_audience?.charAt(0).toUpperCase() + eventData.target_audience?.slice(1) || 'N/A',
        SHORT_DESCRIPTION: eventData.short_description || 'N/A',
        DETAILED_DESCRIPTION: eventData.detailed_description ? `
          <div class="description-box">${eventData.detailed_description.replace(/\n/g, '<br>')}</div>
        ` : '',

        // Schedule
        EVENT_START: `${this.formatDate(eventData.start_date)} at ${this.formatTime(eventData.start_time)}`,
        EVENT_END: `${this.formatDate(eventData.end_date)} at ${this.formatTime(eventData.end_time)}`,
        REGISTRATION_START: `${this.formatDate(eventData.registration_start_date)} at ${this.formatTime(eventData.registration_start_time)}`,
        REGISTRATION_END: `${this.formatDate(eventData.registration_end_date)} at ${this.formatTime(eventData.registration_end_time)}`,

        // Venue
        EVENT_MODE: eventData.mode?.charAt(0).toUpperCase() + eventData.mode?.slice(1) || 'N/A',
        VENUE_LABEL: eventData.mode === 'online' ? 'Platform/Link' : 'Venue/Location',
        VENUE: eventData.venue || 'N/A',

        // Organizers and contacts
        ORGANIZING_DEPARTMENT: eventData.organizing_department || 'N/A',
        ORGANIZERS_SECTION: this.generateOrganizersSection(eventData.organizers),
        CONTACTS_SECTION: this.generateContactsSection(eventData.contacts),

        // Registration details
        REGISTRATION_TYPE: eventData.registration_type?.charAt(0).toUpperCase() + eventData.registration_type?.slice(1) || 'N/A',
        REGISTRATION_MODE: eventData.registration_mode?.charAt(0).toUpperCase() + eventData.registration_mode?.slice(1) || 'N/A',
        REGISTRATION_FEE: eventData.registration_fee ? `
          <div class="field">
            <span class="field-label">Registration Fee:</span>
            <span class="field-value">₹${eventData.registration_fee}</span>
          </div>
        ` : '',
        FEE_DESCRIPTION: eventData.fee_description ? `
          <div class="field">
            <span class="field-label">Fee Description:</span>
            <span class="field-value">${eventData.fee_description}</span>
          </div>
        ` : '',
        MIN_PARTICIPANTS: eventData.min_participants || '1',
        MAX_PARTICIPANTS: eventData.max_participants ? `
          <div class="field">
            <span class="field-label">Maximum Participants:</span>
            <span class="field-value">${eventData.max_participants}</span>
          </div>
        ` : '',
        TEAM_SETTINGS: this.generateTeamSettings(eventData),

        // Certificate details
        CERTIFICATE_TEMPLATE: eventData.certificate_template?.name || 
                              eventData.certificate_template_name || 
                              (eventData.certificate_template && typeof eventData.certificate_template === 'string' ? eventData.certificate_template : null) ||
                              'No template selected',
        CERTIFICATE_STATUS: (eventData.certificate_template?.name || 
                             eventData.certificate_template_name || 
                             eventData.certificate_template) ? '✓ Template Uploaded' : '⚠️ Template Required',
        ADDITIONAL_ASSETS: (eventData.assets && eventData.assets.length > 0) ? `
          <div class="field">
            <span class="field-label">Additional Assets:</span>
            <span class="field-value">${eventData.assets.length} file(s) uploaded</span>
          </div>
        ` : '',
        CERTIFICATE_AVAILABILITY: `${this.formatDate(eventData.certificate_end_date)} at ${this.formatTime(eventData.certificate_end_time)}`,

        // Additional sections
        REQUIREMENTS_SECTION: this.generateRequirementsSection(eventData),
        REQUEST_SUBMITTED_SECTION: user?.role === 'executive_admin' ? `
          <div class="section">
            <div class="section-title">7. Request Submitted By</div>
            <div class="field">
              <span class="field-label">Submitted By:</span>
              <span class="field-value">${eventData.event_created_by || user.fullname || user.username || 'Executive Admin'}</span>
            </div>
            <div class="field">
              <span class="field-label">Role/Position:</span>
              <span class="field-value">Executive Admin</span>
            </div>
            <div class="field">
              <span class="field-label">Submission Date:</span>
              <span class="field-value">${currentDate}</span>
            </div>
            <div class="field">
              <span class="field-label">Request Status:</span>
              <span class="field-value">PENDING ADMINISTRATIVE REVIEW</span>
            </div>
          </div>
        ` : '',
        ADMINISTRATIVE_SECTION: this.generateAdministrativeSection(user),

        // Footer
        FOOTER_CONTENT: user?.role === 'executive_admin' ? `
          <div style="font-weight: bold; margin-bottom: 6px;">FOR OFFICE USE ONLY</div>
          <div>Request ID: EVT-${eventData.event_id}-${new Date().getFullYear()}</div>
          <div>Generated: ${new Date().toLocaleString('en-IN')}</div>
          <div>Status: PENDING REVIEW</div>
          <div style="margin-top: 4px;">This is an electronically generated document from CampusConnect Event Management System</div>
        ` : `
          <div style="font-weight: bold; margin-bottom: 6px;">CampusConnect Event Management System</div>
          <div>Document ID: EVT-${eventData.event_id}-${new Date().getFullYear()}</div>
          <div>Generated: ${new Date().toLocaleString('en-IN')}</div>
          <div style="margin-top: 4px;">This is an electronically generated document</div>
        `
      };

      // Replace all placeholders in the template
      let html = template;
      Object.entries(replacements).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        html = html.replace(new RegExp(placeholder, 'g'), value || '');
      });

      return html;
    } catch (error) {
      console.error('Error generating PDF HTML:', error);
      throw error;
    }
  }

  // Method to generate and download PDF (for use with html2pdf or similar libraries)
  async generateAndDownloadPDF(eventData, user, filename = null) {
    try {
      const html = await this.generatePDFHTML(eventData, user);
      
      // Use html2pdf if available
      if (typeof window !== 'undefined' && window.html2pdf) {
        const element = document.createElement('div');
        element.innerHTML = html;
        element.style.display = 'none';
        document.body.appendChild(element);

        const opt = {
          margin: 0.5,
          filename: filename || `Event_Details_${eventData.event_name?.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };

        await window.html2pdf().set(opt).from(element).save();
        document.body.removeChild(element);
      } else {
        // Fallback: open in new window for manual printing
        const newWindow = window.open('', '_blank');
        newWindow.document.write(html);
        newWindow.document.close();
        newWindow.print();
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const eventPDFService = new EventPDFService();
