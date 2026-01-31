// PDF generation service for event forms
import DOMPurify from 'dompurify';

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
        throw new Error(`Failed to loa        TARGET_AUDIENCE: eventData.target_audience === 'student' ? 'Students Only' : 
                        eventData.target_audience === 'faculty' ? 'Faculty Only' : 
                        eventData.target_audience === 'all' ? 'All Audiences' :
                        eventData.target_audience?.charAt(0).toUpperCase() + eventData.target_audience?.slice(1) || 'N/A',mplate: ${response.statusText}`);
      }
      const template = await response.text();
      this.templateCache.set('event_form', template);
      return template;
    } catch (error) {
      
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

  // Extract date from datetime string
  extractDate(datetimeString) {
    if (!datetimeString) return null;
    try {
      const date = new Date(datetimeString);
      return date.toISOString().split('T')[0];
    } catch {
      return null;
    }
  }

  // Extract time from datetime string
  extractTime(datetimeString) {
    if (!datetimeString) return null;
    try {
      const date = new Date(datetimeString);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return null;
    }
  }

  // Format complete datetime
  formatDateTime(datetimeString) {
    if (!datetimeString) return 'N/A';
    try {
      const date = new Date(datetimeString);
      const formattedDate = date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const period = hours >= 12 ? 'PM' : 'AM';
      const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      const formattedTime = `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
      return `${formattedDate} ${formattedTime}`;
    } catch {
      return datetimeString;
    }
  }

  // Format strategy type helper
  formatStrategyType(strategyType) {
    if (!strategyType) return 'Session Based';
    const strategyTypeMap = {
      'session_based': 'Session Based',
      'user_based': 'User Based',
      'time_based': 'Time Based',
      'day_based': 'Day Based',
      'milestone_based': 'Milestone Based',
      'percentage_based': 'Percentage Based',
      'custom': 'Custom',
      'hybrid': 'Hybrid'
    };
    return strategyTypeMap[strategyType.toLowerCase()] || strategyType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  // Convert Markdown to HTML
  markdownToHtml(markdown) {
    if (!markdown) return '';
    
    let html = markdown;
    
    // Headers (### H3, ## H2, # H1) - must be done in this order
    html = html.replace(/^### (.+)$/gm, '<h3 style="font-size: 12pt; font-weight: bold; margin: 12px 0 6px 0; color: #1a1a1a;">$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2 style="font-size: 13pt; font-weight: bold; margin: 15px 0 8px 0; color: #1a1a1a;">$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1 style="font-size: 14pt; font-weight: bold; margin: 18px 0 10px 0; color: #000;">$1</h1>');
    
    // Bold (**text** or __text__)
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    
    // Italic (*text* or _text_)
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');
    
    // Unordered lists (lines starting with - or *)
    html = html.replace(/^[\-\*] (.+)$/gm, '<li style="margin-left: 20px;">$1</li>');
    
    // Wrap consecutive <li> tags in <ul>
    html = html.replace(/(<li[^>]*>.*?<\/li>\s*)+/gs, match => {
      return '<ul style="margin: 8px 0; padding-left: 20px; list-style-type: disc;">' + match + '</ul>';
    });
    
    // Code blocks (```code```)
    html = html.replace(/```([\s\S]*?)```/g, '<pre style="background: #f5f5f5; padding: 10px; border: 1px solid #ddd; border-radius: 4px; overflow-x: auto; font-family: monospace; font-size: 9pt; margin: 10px 0;">$1</pre>');
    
    // Inline code (`code`)
    html = html.replace(/`(.+?)`/g, '<code style="background: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-family: monospace; font-size: 9pt;">$1</code>');
    
    // Line breaks (preserve double line breaks as paragraphs, single as <br>)
    html = html.replace(/\n\n/g, '</p><p style="margin: 8px 0;">');
    html = html.replace(/\n/g, '<br>');
    
    // Wrap in paragraph if not already wrapped in block elements
    if (!html.startsWith('<h1') && !html.startsWith('<h2') && !html.startsWith('<h3') && !html.startsWith('<ul') && !html.startsWith('<pre')) {
      html = '<p style="margin: 8px 0;">' + html + '</p>';
    }
    
    // Sanitize HTML to prevent XSS attacks
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'strong', 'em', 'u', 's',
        'ul', 'ol', 'li',
        'pre', 'code',
        'a', 'img',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'div', 'span'
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'style', 'class'],
      ALLOW_DATA_ATTR: false
    });
  }

  // HTML escape helper to prevent XSS
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Generate organizers HTML section
  generateOrganizersSection(organizers) {
    if (!organizers || organizers.length === 0) {
      return '';
    }

    const organizersHTML = organizers.map((organizer, index) => {
      const details = [];
      if (organizer.email) details.push(`📧 ${this.escapeHtml(organizer.email)}`);
      if (organizer.employee_id) details.push(`🆔 ${this.escapeHtml(organizer.employee_id)}`);
      if (organizer.id) details.push(`Faculty ID: ${this.escapeHtml(organizer.id)}`);
      if (organizer.isNew) details.push('⚠️ New Organizer');

      return `
        <div class="organizer-item">
          <div class="organizer-name">${index + 1}. ${this.escapeHtml(organizer.name || 'Unnamed')}</div>
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
      <div class="contact-item">📞 ${this.escapeHtml(contact.name)}: ${this.escapeHtml(contact.contact)}</div>
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

  // Generate student target details section
  generateStudentTargetSection(eventData) {
    if (eventData.target_audience !== 'student') {
      return '';
    }

    let studentHTML = '<div class="section"><div class="section-title">Student Target Details</div>';

    // Department Selection
    studentHTML += `
      <div class="field">
        <span class="field-label">Department*:</span>
        <span class="field-value">${eventData.student_department?.length || 0} selected</span>
      </div>
    `;
    
    if (eventData.student_department && eventData.student_department.length > 0) {
      const departmentLabels = eventData.student_department.map(dept => {
        // Try to map common department codes to full names
        const deptMappings = {
          'cse': 'Computer Science & Engineering',
          'it': 'Information Technology',
          'ece': 'Electronics & Communication Engineering',
          'eee': 'Electrical & Electronics Engineering',
          'mech': 'Mechanical Engineering',
          'civil': 'Civil Engineering',
          'chem': 'Chemical Engineering',
          'bio': 'Biotechnology',
          'mba': 'Master of Business Administration',
          'mca': 'Master of Computer Applications'
        };
        return deptMappings[dept.toLowerCase()] || dept;
      });
      
      studentHTML += `
        <div style="margin-left: 20px; margin-bottom: 10px;">
          <div style="font-weight: bold; margin-bottom: 5px;">Selected Departments:</div>
          <div class="description-box" style="padding: 8px;">
            ${departmentLabels.map(dept => `• ${dept}`).join('<br>')}
          </div>
        </div>
      `;
    }

    // Semester Selection
    studentHTML += `
      <div class="field">
        <span class="field-label">Semester*:</span>
        <span class="field-value">${eventData.student_semester?.length || 0} selected</span>
      </div>
    `;
    
    if (eventData.student_semester && eventData.student_semester.length > 0) {
      const semesterLabels = eventData.student_semester.sort((a, b) => parseInt(a) - parseInt(b)).map(sem => {
        return sem === '1' ? '1st Semester' : 
               sem === '2' ? '2nd Semester' : 
               sem === '3' ? '3rd Semester' : 
               `${sem}th Semester`;
      });
      
      studentHTML += `
        <div style="margin-left: 20px; margin-bottom: 10px;">
          <div style="font-weight: bold; margin-bottom: 5px;">Selected Semesters:</div>
          <div class="description-box" style="padding: 8px;">
            ${semesterLabels.map(sem => `• ${sem}`).join('<br>')}
          </div>
        </div>
      `;
    }

    // Additional Information
    studentHTML += `
      <div class="field">
        <span class="field-label">Additional Info:</span>
        <span class="field-value">${eventData.custom_text ? 'Provided' : 'None'}</span>
      </div>
    `;
    
    if (eventData.custom_text?.trim()) {
      studentHTML += `
        <div style="margin-left: 20px;">
          <div class="description-box">${eventData.custom_text.replace(/\n/g, '<br>')}</div>
        </div>
      `;
    }

    studentHTML += '</div>';
    return studentHTML;
  }

  // Generate requirements section
  generateRequirementsSection(eventData) {
    if (!eventData.prerequisites && !eventData.what_to_bring) {
      return '';
    }

    let requirementsHTML = '<div class="section"><div class="section-title">13. Requirements</div>';
    
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

  // Generate attendance strategy section
  generateAttendanceStrategySection(eventData) {
    if (!eventData.attendance_strategy) {
      return '';
    }

    const strategy = eventData.attendance_strategy;
    let strategyHTML = '';

    // Strategy Overview
    strategyHTML += '<div class="strategy-overview">';
    
    // Strategy Type with multiple fallback options - PRIORITIZE nested structure
    const strategyType = strategy.strategy || 
                        strategy.type ||
                        strategy.detected_strategy?.name || 
                        strategy.strategy_type || 
                        'Session Based';
    strategyHTML += `<div class="strategy-item"><span class="strategy-label">Strategy Type:</span> <span class="strategy-value">${this.formatStrategyType(strategyType)}</span></div>`;
    
    // Pass Criteria with multiple fallback options - handle object properly
    let passCriteria = 75; // default
    if (strategy.criteria && typeof strategy.criteria === 'object') {
      passCriteria = strategy.criteria.minimum_percentage || 75;
    } else if (typeof strategy.pass_criteria === 'object' && strategy.pass_criteria !== null) {
      passCriteria = strategy.pass_criteria.minimum_percentage || 
                    strategy.pass_criteria.threshold || 
                    strategy.pass_criteria.value || 75;
    } else {
      passCriteria = strategy.minimum_percentage || 
                    strategy.pass_criteria ||
                    strategy.threshold ||
                    75;
    }
    strategyHTML += `<div class="strategy-item"><span class="strategy-label">Pass Criteria:</span> <span class="strategy-value">${passCriteria}%</span></div>`;
    
    // Min/Max Participants
    strategyHTML += `<div class="strategy-item"><span class="strategy-label">Min Participants:</span> <span class="strategy-value">${strategy.min_participants || eventData.min_participants || 1}</span></div>`;
    if (strategy.max_participants || eventData.max_participants) {
      strategyHTML += `<div class="strategy-item"><span class="strategy-label">Max Participants:</span> <span class="strategy-value">${strategy.max_participants || eventData.max_participants}</span></div>`;
    } else {
      strategyHTML += `<div class="strategy-item"><span class="strategy-label">Max Participants:</span> <span class="strategy-value">No limit</span></div>`;
    }
    strategyHTML += '</div>';

    // Sessions
    if (strategy.sessions && strategy.sessions.length > 0) {
      strategyHTML += '<div style="margin-top: 15px;"><strong>Sessions:</strong></div>';
      strategyHTML += '<div class="session-list">';
      strategy.sessions.forEach((session, index) => {
        // Session name with multiple fallback options
        const sessionName = session.session_name || 
                           session.name || 
                           session.title || 
                           `Session ${index + 1}`;
        
        // Calculate duration from start_time and end_time or use explicit duration
        let durationText = 'TBD';
        if (session.duration_minutes || session.duration) {
          const duration = session.duration_minutes || session.duration;
          const hours = Math.floor(duration / 60);
          const minutes = duration % 60;
          durationText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes} minutes`;
        } else if (session.start_time && session.end_time) {
          try {
            const start = new Date(session.start_time);
            const end = new Date(session.end_time);
            const durationMs = end - start;
            const durationMinutes = Math.floor(durationMs / (1000 * 60));
            const hours = Math.floor(durationMinutes / 60);
            const minutes = durationMinutes % 60;
            durationText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes} minutes`;
          } catch (e) {
            durationText = 'TBD';
          }
        }
        
        strategyHTML += `
          <div class="session-item">
            <span class="session-number">${index + 1}</span>
            <div class="session-details">
              <div class="session-name">${sessionName}</div>
              <div class="session-duration">Duration: ${durationText}</div>
            </div>
          </div>
        `;
      });
      strategyHTML += '</div>';
    }

    // Recommendations
    if (strategy.recommendations && strategy.recommendations.length > 0) {
      strategyHTML += '<div style="margin-top: 15px;"><strong>Recommendations:</strong></div>';
      strategyHTML += '<div class="recommendation-list">';
      strategy.recommendations.forEach(recommendation => {
        strategyHTML += `<div class="recommendation-item">• ${recommendation}</div>`;
      });
      strategyHTML += '</div>';
    }

    return strategyHTML;
  }

  // Generate administrative section for executive admin
  generateAdministrativeSection(user) {
    if (user?.role !== 'executive_admin') {
      return '';
    }

    return `
      <div class="approval-section">
        <div class="section-title">15. ADMINISTRATIVE SECTION</div>
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
        DOCUMENT_TITLE: `${user?.role === 'executive_admin' ? 'Event Request Form' : 'Event Details'} - ${this.escapeHtml(eventData.event_name)}`,
        EVENT_ID: this.escapeHtml(eventData.event_id) || 'N/A',
        EVENT_NAME: this.escapeHtml(eventData.event_name) || 'Untitled Event',
        
        // Header content based on user role
        HEADER_CONTENT: user?.role === 'executive_admin' ? `
          <h2>EVENT CREATION REQUEST FORM</h2>
          <p>Submitted by: ${this.escapeHtml(eventData.event_created_by || user.fullname || user.username || 'Executive Admin')}</p>
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
              <span class="field-value">${this.escapeHtml(eventData.event_created_by || user.fullname || user.username || 'Executive Admin')}</span>
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
          `<span class="badge">${eventData.target_audience === 'student' ? 'Students Only' : 
                                   eventData.target_audience === 'faculty' ? 'Faculty Only' : 
                                   eventData.target_audience === 'all' ? 'All Audiences' :
                                   eventData.target_audience?.charAt(0).toUpperCase() + eventData.target_audience?.slice(1) || 'N/A'}</span>`,
          `<span class="badge">${eventData.mode?.charAt(0).toUpperCase() + eventData.mode?.slice(1) || 'N/A'}</span>`,
          eventData.is_xenesis_event ? '<span class="badge">Xenesis Event</span>' : ''
        ].filter(Boolean).join(''),

        // Basic information
        EVENT_TYPE: eventData.event_type?.charAt(0).toUpperCase() + eventData.event_type?.slice(1) || 'N/A',
        TARGET_AUDIENCE: eventData.target_audience === 'student' ? 'Students Only' : 
                        eventData.target_audience === 'faculty' ? 'Faculty Only' : 
                        eventData.target_audience === 'all' ? 'All Audiences' :
                        eventData.target_audience?.charAt(0).toUpperCase() + eventData.target_audience?.slice(1) || 'N/A',
        SHORT_DESCRIPTION: this.escapeHtml(eventData.short_description) || 'N/A',
        DETAILED_DESCRIPTION: eventData.detailed_description ? `
          <div class="description-box">${this.markdownToHtml(eventData.detailed_description)}</div>
        ` : '',

        // Schedule
        EVENT_DURATION: `${this.formatDate(eventData.start_date)} ${this.formatTime(eventData.start_time)} - ${this.formatDate(eventData.end_date)} ${this.formatTime(eventData.end_time)}`,
        REGISTRATION_DURATION: `${this.formatDate(eventData.registration_start_date)} ${this.formatTime(eventData.registration_start_time)} - ${this.formatDate(eventData.registration_end_date)} ${this.formatTime(eventData.registration_end_time)}`,


        // Venue
        EVENT_MODE: eventData.mode?.charAt(0).toUpperCase() + eventData.mode?.slice(1) || 'N/A',
        VENUE_LABEL: eventData.mode === 'online' ? 'Platform/Link' : 'Venue/Location',
        VENUE: this.escapeHtml(eventData.venue) || 'N/A',

        // Organizers and contacts
        ORGANIZING_DEPARTMENT: this.escapeHtml(eventData.organizing_department) || 'N/A',
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
            <span class="field-value">${this.escapeHtml(eventData.fee_description)}</span>
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
        CERTIFICATE_TEMPLATE: eventData.is_certificate_based ? (
                              eventData.certificate_template?.name || 
                              eventData.certificate_template?.fileName || 
                              eventData.certificate_template?.originalName || 
                              eventData.certificate_template_name || 
                              eventData.certificateTemplate?.name ||
                              eventData.certificateTemplate ||
                              (eventData.certificate_template && typeof eventData.certificate_template === 'string' ? eventData.certificate_template : null) ||
                              // Check certificate_templates object for any template
                              (eventData.certificate_templates && Object.keys(eventData.certificate_templates).length > 0 ? 
                                `${Object.keys(eventData.certificate_templates).length} template(s) uploaded` : null) ||
                              'No template selected'
                              ) : 'No certificates needed for this event',
        CERTIFICATE_STATUS: eventData.is_certificate_based ? (
                             (eventData.certificate_template?.name || 
                             eventData.certificate_template?.fileName || 
                             eventData.certificate_template?.originalName || 
                             eventData.certificate_template_name || 
                             eventData.certificateTemplate?.name ||
                             eventData.certificateTemplate ||
                             (eventData.certificate_template && typeof eventData.certificate_template === 'string' ? eventData.certificate_template : null) ||
                             (eventData.certificate_templates && Object.keys(eventData.certificate_templates).length > 0)) ? '✓ Template Uploaded' : '⚠️ Template Required'
                             ) : '✓ No certificates required',
        ADDITIONAL_ASSETS: (eventData.assets && eventData.assets.length > 0) ? `
          <div class="field">
            <span class="field-label">Additional Assets:</span>
            <span class="field-value">${eventData.assets.length} file(s) uploaded</span>
          </div>
        ` : '',
        CERTIFICATE_AVAILABILITY: eventData.is_certificate_based ? 
                                   `${this.formatDate(eventData.certificate_end_date)} at ${this.formatTime(eventData.certificate_end_time)}` : 
                                   'No certificates will be issued',

        // Registration fee value for budget section
        REGISTRATION_FEE_VALUE: eventData.registration_fee_enabled ? `₹${eventData.registration_fee || 0}` : 'Free',
        
        // Certificate distribution method for post-event section
        CERTIFICATE_DISTRIBUTION_METHOD: eventData.is_certificate_based ? '☑ Digital ☐ Physical ☐ Both' : '☐ Not Applicable',

        // Additional sections
        STUDENT_TARGET_SECTION: this.generateStudentTargetSection(eventData),
        REQUIREMENTS_SECTION: this.generateRequirementsSection(eventData),
        ATTENDANCE_STRATEGY_SECTION: this.generateAttendanceStrategySection(eventData),
        REQUEST_SUBMITTED_SECTION: user?.role === 'executive_admin' ? `
          <div class="section">
            <div class="section-title">14. Request Submitted By</div>
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
      
      throw error;
    }
  }
}

// Export singleton instance
export const eventPDFService = new EventPDFService();
