import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font } from '@react-pdf/renderer';
import { eventPDFService } from '../../services/EventPDFService';
import dropdownOptionsService from '../../services/dropdownOptionsService';

function EventCreatedSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [eventData, setEventData] = useState(null);

  // Helper function to format strategy type for display
  const formatStrategyType = (strategyType) => {
    const strategyMapping = {
      'session_based': 'Session Based',
      'single_mark': 'Single Mark',
      'percentage_based': 'Percentage Based',
      'time_based': 'Time Based',
      'milestone_based': 'Milestone Based',
      'continuous': 'Continuous',
      'hybrid': 'Hybrid'
    };
    
    return strategyMapping[strategyType] || (strategyType ? strategyType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Auto-detected');
  };

  useEffect(() => {
    if (location.state?.eventData) {
      
      
      
      
      
      console.log('All Certificate Related Fields:', {
        certificate_template: location.state.eventData.certificate_template,
        certificate_template_name: location.state.eventData.certificate_template_name,
        certificateTemplate: location.state.eventData.certificateTemplate,
        is_certificate_based: location.state.eventData.is_certificate_based
      });
      
      // Debug attendance strategy data
      
      if (location.state.eventData.attendance_strategy) {
        
        
        
        console.log('Pass Criteria Fields:', {
          minimum_percentage: location.state.eventData.attendance_strategy.minimum_percentage,
          pass_criteria: location.state.eventData.attendance_strategy.pass_criteria,
          criteria: location.state.eventData.attendance_strategy.criteria
        });
        
        if (location.state.eventData.attendance_strategy.sessions?.[0]) {
          console.log('First Session Fields:', {
            session_name: location.state.eventData.attendance_strategy.sessions[0].session_name,
            name: location.state.eventData.attendance_strategy.sessions[0].name,
            duration_minutes: location.state.eventData.attendance_strategy.sessions[0].duration_minutes,
            duration: location.state.eventData.attendance_strategy.sessions[0].duration
          });
        }
      }
      
      setEventData(location.state.eventData);
    } else {
      navigate('/admin/events');
    }
  }, [location.state, navigate]);

  // PDF Styles
  const styles = StyleSheet.create({
    page: {
      flexDirection: 'column',
      backgroundColor: '#FFFFFF',
      padding: 30,
      fontFamily: 'Times-Roman',
      fontSize: 10,
      lineHeight: 1.4,
    },
    header: {
      textAlign: 'center',
      marginBottom: 20,
      paddingBottom: 15,
      borderBottom: '2px solid #000000',
    },
    title: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 12,
      fontWeight: 'bold',
      marginBottom: 5,
    },
    section: {
      marginBottom: 15,
      border: '1px solid #333333',
      padding: 10,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: 'bold',
      marginBottom: 8,
      borderBottom: '1px solid #666666',
      paddingBottom: 3,
    },
    field: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
      borderBottom: '1px dotted #999999',
      paddingBottom: 2,
    },
    fieldLabel: {
      fontWeight: 'bold',
      fontSize: 9,
      flex: 0.4,
    },
    fieldValue: {
      fontSize: 9,
      flex: 0.6,
      textAlign: 'right',
    },
    twoColumn: {
      flexDirection: 'row',
      gap: 15,
    },
    column: {
      flex: 1,
    },
    eventHeader: {
      textAlign: 'center',
      marginBottom: 15,
      paddingBottom: 10,
      borderBottom: '1px solid #cccccc',
    },
    eventTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    badges: {
      flexDirection: 'row',
      justifyContent: 'center',
      flexWrap: 'wrap',
      marginTop: 8,
    },
    badge: {
      border: '1px solid #333333',
      padding: '2 6',
      margin: 1,
      fontSize: 8,
    },
    approvalSection: {
      marginTop: 20,
      border: '2px solid #000000',
      padding: 12,
    },
    checkboxLine: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    signatureContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 15,
    },
    signatureBox: {
      border: '2px solid #000000',
      padding: '20 10 8',
      textAlign: 'center',
      width: '45%',
    },
    footer: {
      marginTop: 20,
      textAlign: 'center',
      borderTop: '1px solid #cccccc',
      paddingTop: 8,
      fontSize: 8,
    },
    statusPending: {
      backgroundColor: '#ffffff',
      border: '2px solid #000000',
      padding: '2 6',
      fontWeight: 'bold',
    },
    descriptionBox: {
      border: '1px solid #333333',
      padding: 6,
      marginTop: 4,
      minHeight: 30,
      fontSize: 9,
    },
  });

  // Helper functions
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return 'N/A';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const minute = parseInt(minutes);
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  // PDF Document Component
  const EventPDFDocument = () => (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={styles.title}>CampusConnect</Text>
            <Text style={[styles.fieldLabel, { fontSize: 10 }]}>Event ID: {eventData.event_id}</Text>
          </View>
          {(user?.role === 'executive_admin' || user?.role === 'super_admin' || user?.role === 'organizer_admin') ? (
            <View>
              <Text style={styles.subtitle}>EVENT CREATION REQUEST FORM</Text>
              <Text>Submitted by: {eventData.event_created_by || user.fullname || user.username || 'Executive Admin'}</Text>
              <Text>Request Date: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
              <View style={[styles.statusPending, { marginTop: 6 }]}>
                <Text>PENDING APPROVAL</Text>
              </View>
            </View>
          ) : (
            <View>
              <Text style={styles.subtitle}>Event Creation Confirmation</Text>
              <Text>Generated on: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
            </View>
          )}
        </View>

        {/* Request Summary for Executive Admin, Super Admin, and Organizer Admin only */}
        {(user?.role === 'executive_admin' || user?.role === 'super_admin' || user?.role === 'organizer_admin') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>REQUEST SUMMARY</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Request Type:</Text>
              <Text style={styles.fieldValue}>New Event Creation</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Requested by:</Text>
              <Text style={styles.fieldValue}>{eventData.event_created_by || user.fullname || user.username || 'Executive Admin'}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Department/Role:</Text>
              <Text style={styles.fieldValue}>
                {user?.role === 'executive_admin' ? 'Executive Administration' : 
                 user?.role === 'super_admin' ? 'Super Administration' :
                 user?.role === 'organizer_admin' ? 'Organizer Administration' : 'Administration'}
              </Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Priority:</Text>
              <Text style={styles.fieldValue}>{eventData.is_xenesis_event ? 'HIGH (Xenesis Event)' : 'NORMAL'}</Text>
            </View>
          </View>
        )}

        {/* Event Header */}
        <View style={styles.eventHeader}>
          <Text style={styles.eventTitle}>{eventData.event_name}</Text>
          <View style={styles.badges}>
            <View style={styles.badge}>
              <Text>{eventData.event_type?.charAt(0).toUpperCase() + eventData.event_type?.slice(1) || 'N/A'}</Text>
            </View>
            <View style={styles.badge}>
              <Text>{eventData.target_audience?.charAt(0).toUpperCase() + eventData.target_audience?.slice(1) || 'N/A'}</Text>
            </View>
            <View style={styles.badge}>
              <Text>{eventData.mode?.charAt(0).toUpperCase() + eventData.mode?.slice(1) || 'N/A'}</Text>
            </View>
            {eventData.is_xenesis_event && (
              <View style={styles.badge}>
                <Text>Xenesis Event</Text>
              </View>
            )}
          </View>
        </View>

        {/* Two Column Layout */}
        <View style={styles.twoColumn}>
          {/* Left Column */}
          <View style={styles.column}>
            {/* Basic Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1. Basic Information</Text>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Event Type:</Text>
                <Text style={styles.fieldValue}>{eventData.event_type?.charAt(0).toUpperCase() + eventData.event_type?.slice(1) || 'N/A'}</Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Target Audience:</Text>
                <Text style={styles.fieldValue}>{eventData.target_audience?.charAt(0).toUpperCase() + eventData.target_audience?.slice(1) || 'N/A'}</Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Short Description:</Text>
                <Text style={styles.fieldValue}>{eventData.short_description || 'N/A'}</Text>
              </View>
              {eventData.detailed_description && (
                <View style={styles.descriptionBox}>
                  <Text>{eventData.detailed_description}</Text>
                </View>
              )}
            </View>

            {/* Schedule */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. Schedule</Text>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Event Start:</Text>
                <Text style={styles.fieldValue}>{formatDate(eventData.start_date)} at {formatTime(eventData.start_time)}</Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Event End:</Text>
                <Text style={styles.fieldValue}>{formatDate(eventData.end_date)} at {formatTime(eventData.end_time)}</Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Registration Opens:</Text>
                <Text style={styles.fieldValue}>{formatDate(eventData.registration_start_date)} at {formatTime(eventData.registration_start_time)}</Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Registration Closes:</Text>
                <Text style={styles.fieldValue}>{formatDate(eventData.registration_end_date)} at {formatTime(eventData.registration_end_time)}</Text>
              </View>
            </View>
          </View>

          {/* Right Column */}
          <View style={styles.column}>
            {/* Venue Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. Venue & Location</Text>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Event Mode:</Text>
                <Text style={styles.fieldValue}>{eventData.mode?.charAt(0).toUpperCase() + eventData.mode?.slice(1) || 'N/A'}</Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{eventData.mode === 'online' ? 'Platform/Link:' : 'Venue/Location:'}</Text>
                <Text style={styles.fieldValue}>{eventData.venue || 'N/A'}</Text>
              </View>
            </View>

            {/* Organizer & Contact Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>4. Organizer & Contact Information</Text>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Organizing Department:</Text>
                <Text style={styles.fieldValue}>{eventData.organizing_department || 'N/A'}</Text>
              </View>
              
              {eventData.organizers && eventData.organizers.length > 0 && (
                <View style={{ marginTop: 6 }}>
                  <Text style={[styles.fieldLabel, { fontSize: 9, fontWeight: 'bold', marginBottom: 4 }]}>Event Organizers:</Text>
                  {eventData.organizers.map((organizer, index) => (
                    <View key={index} style={{ marginBottom: 4, paddingBottom: 4, borderBottom: '1px dotted #999' }}>
                      <Text style={[styles.fieldValue, { fontSize: 8, fontWeight: 'bold' }]}>
                        {index + 1}. {organizer.name || 'Unnamed'}
                      </Text>
                      {organizer.email && (
                        <Text style={[styles.fieldValue, { fontSize: 8 }]}>ðŸ“§ {organizer.email}</Text>
                      )}
                      {organizer.employee_id && (
                        <Text style={[styles.fieldValue, { fontSize: 8 }]}>ðŸ†” {organizer.employee_id}</Text>
                      )}
                      {organizer.isNew && (
                        <Text style={[styles.fieldValue, { fontSize: 8, color: '#856404' }]}>âš ï¸ New Organizer</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
              
              {eventData.contacts && eventData.contacts.length > 0 && (
                <View style={{ marginTop: 6 }}>
                  <Text style={[styles.fieldLabel, { fontSize: 9, fontWeight: 'bold', marginBottom: 4 }]}>Contact Information:</Text>
                  {eventData.contacts.map((contact, index) => (
                    <View key={index} style={styles.field}>
                      <Text style={[styles.fieldValue, { fontSize: 8 }]}>ðŸ“ž {contact.name}: {contact.contact}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Registration & Certificate Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>5. Registration & Certificate Details</Text>
              
              {/* Registration Information */}
              <Text style={[styles.fieldLabel, { fontSize: 9, fontWeight: 'bold', marginTop: 8 }]}>Registration Settings:</Text>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Registration Type:</Text>
                <Text style={styles.fieldValue}>{eventData.registration_type?.charAt(0).toUpperCase() + eventData.registration_type?.slice(1) || 'N/A'}</Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Registration Mode:</Text>
                <Text style={styles.fieldValue}>{eventData.registration_mode?.charAt(0).toUpperCase() + eventData.registration_mode?.slice(1) || 'N/A'}</Text>
              </View>
              {eventData.registration_fee && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Registration Fee:</Text>
                  <Text style={styles.fieldValue}>â‚¹{eventData.registration_fee}</Text>
                </View>
              )}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Min Participants:</Text>
                <Text style={styles.fieldValue}>{eventData.min_participants || 1}</Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Max Participants:</Text>
                <Text style={styles.fieldValue}>{eventData.max_participants || 'No limit'}</Text>
              </View>
              {eventData.registration_mode === 'team' && (
                <>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Min Team Size:</Text>
                    <Text style={styles.fieldValue}>{eventData.team_size_min || 'N/A'}</Text>
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Max Team Size:</Text>
                    <Text style={styles.fieldValue}>{eventData.team_size_max || 'N/A'}</Text>
                  </View>
                </>
              )}
              
              {/* Certificate Information */}
              <Text style={[styles.fieldLabel, { fontSize: 9, fontWeight: 'bold', marginTop: 12, borderTop: '1px solid #ccc', paddingTop: 8 }]}>Certificate & Resources:</Text>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Certificate Required:</Text>
                <Text style={styles.fieldValue}>
                  {eventData.is_certificate_based ? 'Yes' : 'No'}
                </Text>
              </View>
              {eventData.is_certificate_based ? (
                <>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Certificate Template:</Text>
                    <Text style={styles.fieldValue}>
                      {eventData.certificate_template?.name || 
                       eventData.certificate_template?.fileName || 
                       eventData.certificate_template?.originalName || 
                       eventData.certificate_template_name || 
                       eventData.certificateTemplate?.name ||
                       eventData.certificateTemplate ||
                       (eventData.certificate_template && typeof eventData.certificate_template === 'string' ? eventData.certificate_template : null) ||
                       // Check certificate_templates object for any template
                       (eventData.certificate_templates && Object.keys(eventData.certificate_templates).length > 0 ? 
                         `${Object.keys(eventData.certificate_templates).length} template(s) uploaded` : null) ||
                       'No template selected'}
                    </Text>
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Certificate Status:</Text>
                    <Text style={styles.fieldValue}>
                      {(eventData.certificate_template?.name || 
                        eventData.certificate_template?.fileName || 
                        eventData.certificate_template?.originalName || 
                        eventData.certificate_template_name || 
                        eventData.certificateTemplate?.name ||
                        eventData.certificateTemplate ||
                        eventData.certificate_template ||
                        (eventData.certificate_templates && Object.keys(eventData.certificate_templates).length > 0)) ? '✓ Template Uploaded' : '✗ Template Required'}
                    </Text>
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Certificate Available Until:</Text>
                    <Text style={styles.fieldValue}>
                      {formatDate(eventData.certificate_end_date)} at {formatTime(eventData.certificate_end_time)}
                    </Text>
                  </View>
                </>
              ) : (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Certificate Note:</Text>
                  <Text style={styles.fieldValue}>
                    No certificates will be distributed for this event
                  </Text>
                </View>
              )}
              {eventData.assets && eventData.assets.length > 0 && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Additional Assets:</Text>
                  <Text style={styles.fieldValue}>{eventData.assets.length} file(s) uploaded</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Student Target Details Section - Only for student audience */}
        {eventData.target_audience === 'student' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Student Target Details</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Target Audience:</Text>
              <Text style={styles.fieldValue}>Students Only</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Department(s) Selected:</Text>
              <Text style={styles.fieldValue}>{eventData.student_department?.length || 0} department(s)</Text>
            </View>
            {eventData.student_department && eventData.student_department.length > 0 && (
              <View style={{ marginTop: 4, marginBottom: 8 }}>
                <View style={styles.descriptionBox}>
                  <Text style={{ fontSize: 8 }}>
                    {eventData.student_department.map((dept, index) => {
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
                      const deptName = deptMappings[dept.toLowerCase()] || dept;
                      return `• ${deptName}`;
                    }).join('\n')}
                  </Text>
                </View>
              </View>
            )}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Semester(s) Selected:</Text>
              <Text style={styles.fieldValue}>{eventData.student_semester?.length || 0} semester(s)</Text>
            </View>
            {eventData.student_semester && eventData.student_semester.length > 0 && (
              <View style={{ marginTop: 4, marginBottom: 8 }}>
                <View style={styles.descriptionBox}>
                  <Text style={{ fontSize: 8 }}>
                    {eventData.student_semester.sort((a, b) => parseInt(a) - parseInt(b)).map(sem => {
                      const semLabel = sem === '1' ? '1st Semester' : 
                                     sem === '2' ? '2nd Semester' : 
                                     sem === '3' ? '3rd Semester' : 
                                     `${sem}th Semester`;
                      return `• ${semLabel}`;
                    }).join('\n')}
                  </Text>
                </View>
              </View>
            )}
            {eventData.custom_text && (
              <>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Additional Information:</Text>
                  <Text style={styles.fieldValue}>Provided</Text>
                </View>
                <View style={{ marginTop: 4 }}>
                  <View style={styles.descriptionBox}>
                    <Text style={{ fontSize: 8 }}>{eventData.custom_text}</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        )}
      </Page>

      {/* Second Page for Additional Information */}
      {(user?.role === 'executive_admin' || user?.role === 'super_admin' || user?.role === 'organizer_admin') && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.title}>Event Request Form - Page 2</Text>
              <Text style={[styles.fieldLabel, { fontSize: 10 }]}>Event ID: {eventData.event_id}</Text>
            </View>
            <Text style={styles.subtitle}>{eventData.event_name}</Text>
          </View>

          {/* Requirements Section */}
          {(eventData.prerequisites || eventData.what_to_bring) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>6. Requirements & Additional Information</Text>
              {eventData.prerequisites && (
                <View style={{ marginBottom: 8 }}>
                  <Text style={[styles.fieldLabel, { fontSize: 9, fontWeight: 'bold', marginBottom: 4 }]}>Prerequisites:</Text>
                  <View style={styles.descriptionBox}>
                    <Text style={{ fontSize: 9 }}>{eventData.prerequisites}</Text>
                  </View>
                </View>
              )}
              {eventData.what_to_bring && (
                <View style={{ marginBottom: 8 }}>
                  <Text style={[styles.fieldLabel, { fontSize: 9, fontWeight: 'bold', marginBottom: 4 }]}>What to Bring:</Text>
                  <View style={styles.descriptionBox}>
                    <Text style={{ fontSize: 9 }}>{eventData.what_to_bring}</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Attendance Strategy Details Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Attendance Strategy Details</Text>
            
            {eventData.attendance_strategy ? (
              <>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Strategy Type:</Text>
                  <Text style={styles.fieldValue}>
                    {formatStrategyType(
                      eventData.attendance_strategy?.detected_strategy?.name || 
                      eventData.attendance_strategy?.strategy_type ||
                      eventData.attendance_strategy?.strategy ||
                      eventData.attendance_strategy?.type ||
                      eventData.strategy_type ||
                      eventData.strategy ||
                      'Session Based'
                    )}
                  </Text>
                </View>
                
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Strategy Description:</Text>
                  <Text style={styles.fieldValue}>
                    {eventData.attendance_strategy.detected_strategy?.description || 
                     eventData.attendance_strategy.description || 
                     'Strategy determined automatically based on event type'}
                  </Text>
                </View>
                
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Total Sessions:</Text>
                  <Text style={styles.fieldValue}>
                    {eventData.attendance_strategy.sessions?.length || 0}
                  </Text>
                </View>
                
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Pass Criteria:</Text>
                  <Text style={styles.fieldValue}>
                    {(eventData.attendance_strategy?.criteria?.minimum_percentage || 
                     eventData.attendance_strategy?.minimum_percentage || 
                     eventData.attendance_strategy?.pass_criteria ||
                     eventData.minimum_percentage ||
                     eventData.pass_criteria ||
                     75)}% attendance required
                  </Text>
                </View>
                
                {eventData.attendance_strategy.detected_strategy?.reasoning && (
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Strategy Reasoning:</Text>
                    <Text style={styles.fieldValue}>
                      {eventData.attendance_strategy.detected_strategy.reasoning}
                    </Text>
                  </View>
                )}
                
                {eventData.attendance_strategy.detected_strategy?.confidence && (
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Detection Confidence:</Text>
                    <Text style={styles.fieldValue}>
                      {Math.round(eventData.attendance_strategy.detected_strategy.confidence * 100)}%
                    </Text>
                  </View>
                )}

                {eventData.attendance_strategy.sessions?.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={[styles.fieldLabel, { fontSize: 9, fontWeight: 'bold', marginBottom: 4 }]}>
                      Session Breakdown:
                    </Text>
                    {eventData.attendance_strategy.sessions.slice(0, 5).map((session, index) => (
                      <View key={index} style={styles.field}>
                        <Text style={[styles.fieldValue, { fontSize: 8 }]}>
                          {index + 1}. {session?.session_name || session?.name || session?.title || `Session ${index + 1}`} 
                          {session?.session_type && ` (${session.session_type})`}
                          {(session?.duration_minutes || session?.duration || session?.length) && 
                            ` - ${Math.floor((session.duration_minutes || session.duration || session.length) / 60)}h ${(session.duration_minutes || session.duration || session.length) % 60}m`}
                          {session?.is_mandatory === false && ' [Optional]'}
                        </Text>
                      </View>
                    ))}
                    {eventData.attendance_strategy.sessions.length > 5 && (
                      <Text style={[styles.fieldValue, { fontSize: 8, fontStyle: 'italic' }]}>
                        ... and {eventData.attendance_strategy.sessions.length - 5} more sessions
                      </Text>
                    )}
                  </View>
                )}
                
                {eventData.attendance_strategy.recommendations?.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={[styles.fieldLabel, { fontSize: 9, fontWeight: 'bold', marginBottom: 4 }]}>
                      Recommendations:
                    </Text>
                    {eventData.attendance_strategy.recommendations.slice(0, 3).map((rec, index) => (
                      <View key={index} style={styles.field}>
                        <Text style={[styles.fieldValue, { fontSize: 8 }]}>â€¢ {rec}</Text>
                      </View>
                    ))}
                    {eventData.attendance_strategy.recommendations.length > 3 && (
                      <Text style={[styles.fieldValue, { fontSize: 8, fontStyle: 'italic' }]}>
                        ... and {eventData.attendance_strategy.recommendations.length - 3} more recommendations
                      </Text>
                    )}
                  </View>
                )}

                {eventData.attendance_strategy.estimated_completion_rate && (
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Estimated Completion Rate:</Text>
                    <Text style={styles.fieldValue}>
                      {Math.round(eventData.attendance_strategy.estimated_completion_rate * 100)}%
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.field}>
                <Text style={styles.fieldValue}>
                  Attendance strategy will be determined automatically based on event type, duration, and target audience
                </Text>
              </View>
            )}
          </View>

          {/* Budget & Financial Planning Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Budget & Financial Planning</Text>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Estimated Budget:</Text>
              <Text style={styles.fieldValue}>â‚¹ ____________</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Registration Fee:</Text>
              <Text style={styles.fieldValue}>
                {eventData.registration_fee_enabled ? `â‚¹${eventData.registration_fee || 0}` : 'Free'}
              </Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Sponsorship Required:</Text>
              <Text style={styles.fieldValue}>â˜ Yes â˜ No</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Budget Breakdown:</Text>
              <Text style={styles.fieldValue}></Text>
            </View>
            
            <View style={{ marginTop: 8 }}>
              <Text style={[styles.fieldLabel, { fontSize: 9, marginBottom: 4 }]}>Cost Categories:</Text>
              <Text style={[styles.fieldValue, { fontSize: 8, textAlign: 'left' }]}>
                â€¢ Venue Rental: â‚¹ ______{'\n'}
                â€¢ Equipment/Technology: â‚¹ ______{'\n'}
                â€¢ Refreshments/Catering: â‚¹ ______{'\n'}
                â€¢ Materials/Supplies: â‚¹ ______{'\n'}
                â€¢ Speaker/Guest Honorarium: â‚¹ ______{'\n'}
                â€¢ Marketing/Promotion: â‚¹ ______{'\n'}
                â€¢ Certificates/Awards: â‚¹ ______{'\n'}
                â€¢ Miscellaneous: â‚¹ ______{'\n'}
                {'\n'}Total Estimated Cost: â‚¹ ______
              </Text>
            </View>
          </View>

          {/* Resource Requirements Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Resource Requirements</Text>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Technical Requirements:</Text>
              <Text style={styles.fieldValue}>â˜ Projector â˜ Microphone â˜ Laptop â˜ Internet</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Furniture & Setup:</Text>
              <Text style={styles.fieldValue}>â˜ Tables â˜ Chairs â˜ Stage â˜ Podium</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Support Staff Required:</Text>
              <Text style={styles.fieldValue}>_______ persons</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Volunteer Requirements:</Text>
              <Text style={styles.fieldValue}>_______ volunteers</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Special Arrangements:</Text>
              <Text style={styles.fieldValue}>_________________________</Text>
            </View>
          </View>

          {/* High Authority Approvals Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. High Authority Approvals</Text>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Department Head Approval:</Text>
              <Text style={styles.fieldValue}>â˜ Pending â˜ Approved â˜ Rejected</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Principal/Director Approval:</Text>
              <Text style={styles.fieldValue}>â˜ Pending â˜ Approved â˜ Rejected</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Academic Council Approval:</Text>
              <Text style={styles.fieldValue}>â˜ Pending â˜ Approved â˜ Not Required</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Finance Committee Approval:</Text>
              <Text style={styles.fieldValue}>â˜ Pending â˜ Approved â˜ Not Required</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>External Partnership Approval:</Text>
              <Text style={styles.fieldValue}>â˜ Pending â˜ Approved â˜ Not Required</Text>
            </View>
          </View>

          {/* Risk Assessment & Safety Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>10. Risk Assessment & Safety</Text>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Risk Level:</Text>
              <Text style={styles.fieldValue}>â˜ Low â˜ Medium â˜ High</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Safety Measures Required:</Text>
              <Text style={styles.fieldValue}>â˜ Security â˜ Medical Aid â˜ Fire Safety â˜ Crowd Control</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Insurance Coverage:</Text>
              <Text style={styles.fieldValue}>â˜ Required â˜ Not Required</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Emergency Contact:</Text>
              <Text style={styles.fieldValue}>_________________________</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Special Safety Protocols:</Text>
              <Text style={styles.fieldValue}>_________________________</Text>
            </View>
          </View>

          {/* Marketing & Promotion Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>11. Marketing & Promotion</Text>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Promotion Channels:</Text>
              <Text style={styles.fieldValue}>â˜ Social Media â˜ Website â˜ Email â˜ Posters â˜ Word of Mouth</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Media Coverage:</Text>
              <Text style={styles.fieldValue}>â˜ Required â˜ Not Required</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Press Release:</Text>
              <Text style={styles.fieldValue}>â˜ Prepared â˜ To be Prepared â˜ Not Required</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Social Media Hashtag:</Text>
              <Text style={styles.fieldValue}>_________________________</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Photography/Videography:</Text>
              <Text style={styles.fieldValue}>â˜ Professional â˜ In-house â˜ Not Required</Text>
            </View>
          </View>

          {/* Post-Event Requirements Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>12. Post-Event Requirements</Text>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Event Report Required:</Text>
              <Text style={styles.fieldValue}>â˜ Yes â˜ No</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Feedback Collection:</Text>
              <Text style={styles.fieldValue}>â˜ Digital Survey â˜ Physical Forms â˜ Both</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Certificate Distribution:</Text>
              <Text style={styles.fieldValue}>
                {eventData.is_certificate_based ? 'â˜‘ Digital â˜ Physical â˜ Both' : 'â˜ Not Applicable'}
              </Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Financial Settlement:</Text>
              <Text style={styles.fieldValue}>â˜ Pending â˜ Completed</Text>
            </View>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Documentation Archive:</Text>
              <Text style={styles.fieldValue}>â˜ Digital â˜ Physical â˜ Both</Text>
            </View>
          </View>

          {/* Administrative Section */}
          <View style={styles.approvalSection}>
            <Text style={styles.sectionTitle}>13. ADMINISTRATIVE SECTION</Text>
            <View style={styles.checkboxLine}>
              <Text style={styles.fieldLabel}>Event Review:</Text>
              <Text style={styles.fieldValue}>â˜ Approved â˜ Needs Modification</Text>
            </View>
            <View style={styles.checkboxLine}>
              <Text style={styles.fieldLabel}>Budget Approval:</Text>
              <Text style={styles.fieldValue}>â˜ Approved â˜ Not Required</Text>
            </View>
            <View style={styles.checkboxLine}>
              <Text style={styles.fieldLabel}>Venue Confirmation:</Text>
              <Text style={styles.fieldValue}>â˜ Confirmed â˜ Alternative Required</Text>
            </View>

            <View style={styles.signatureContainer}>
              <View style={styles.signatureBox}>
                <Text style={{ fontWeight: 'bold', marginBottom: 20 }}>Academic Coordinator</Text>
                <Text>Date: _____________</Text>
              </View>
              <View style={styles.signatureBox}>
                <Text style={{ fontWeight: 'bold', marginBottom: 20 }}>Department Head</Text>
                <Text>Date: _____________</Text>
              </View>
            </View>

            <View style={{ marginTop: 12, border: '1px solid #333', padding: 8 }}>
              <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Comments/Notes:</Text>
              <Text style={{ marginBottom: 4 }}>_________________________________________________</Text>
              <Text style={{ marginBottom: 4 }}>_________________________________________________</Text>
              <Text style={{ marginBottom: 4 }}>_________________________________________________</Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>FOR OFFICE USE ONLY</Text>
            <Text>Request ID: EVT-{eventData.event_id}-{new Date().getFullYear()}</Text>
            <Text>Generated: {new Date().toLocaleString('en-IN')}</Text>
            <Text>Status: PENDING REVIEW</Text>
            <Text style={{ marginTop: 4 }}>This is an electronically generated document from CampusConnect Event Management System</Text>
          </View>
        </Page>
      )}
    </Document>
  );

  // HTML-based PDF generation using our service
  const handleHTMLPrint = async () => {
    try {
      const htmlContent = await eventPDFService.generatePDFHTML(eventData, user);
      const newWindow = window.open('', '_blank');
      newWindow.document.write(htmlContent);
      newWindow.document.close();
      
      // Wait for content to load, then print
      newWindow.onload = () => {
        newWindow.print();
      };
    } catch (error) {
      
      alert('Error generating PDF. Please try again.');
    }
  };

  if (!eventData) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600 text-sm">Loading event details...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Enhanced Success Header with Card Design */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6 print:hidden">
          {/* Success Status Card */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            {/* Status Banner */}
            <div className="bg-green-50 border-b border-green-100 px-6 py-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <h1 className="text-lg font-semibold text-green-900" id="success-title">
                    {location.state?.message || 'Event Created Successfully'}
                  </h1>
                  <p className="text-sm text-green-700">
                    {(user?.role === 'executive_admin' || user?.role === 'super_admin' || user?.role === 'organizer_admin') ? 'Request submitted for approval' : 'Event is now available for registration'}
                  </p>
                </div>
              </div>
            </div>

            {/* Event Summary */}
            <div className="px-6 py-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">{eventData.event_name}</h2>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {eventData.event_type?.charAt(0).toUpperCase() + eventData.event_type?.slice(1)}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {eventData.target_audience?.charAt(0).toUpperCase() + eventData.target_audience?.slice(1)}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {eventData.mode?.charAt(0).toUpperCase() + eventData.mode?.slice(1)}
                    </span>
                    {eventData.is_xenesis_event && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        â­ Xenesis Event
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Event ID:</span> {eventData.event_id}
                    </div>
                    <div>
                      <span className="font-medium">Department:</span> {eventData.organizing_department}
                    </div>
                    <div>
                      <span className="font-medium">Start Date:</span> {formatDate(eventData.start_date)}
                    </div>
                    <div>
                      <span className="font-medium">Registration:</span> {eventData.registration_type?.charAt(0).toUpperCase() + eventData.registration_type?.slice(1)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
              <div className="flex flex-col sm:flex-row gap-3" role="group" aria-label="Event actions">
                

                {/* HTML-based PDF Download Button (Alternative) */}
                <button
                  onClick={handleHTMLPrint}
                  className="inline-flex items-center justify-center px-4 py-2 bg-green-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                  aria-label="Download formatted document as PDF"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  Download Event Details
                </button>

                {/* Secondary Actions */}
                <div className="flex gap-3">
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => {
                        // Clear the events cache to ensure fresh data is loaded
                        const cacheKey = `admin_events_${user?.username || 'anonymous'}`;
                        localStorage.removeItem(cacheKey);
                        navigate('/admin/events');
                      }}
                      className="inline-flex items-center justify-center px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                      aria-label="Navigate to all events page"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0l-4-4m4 4l-4 4"></path>
                      </svg>
                      View All Events
                    </button>
                  )}

                  <button
                    onClick={() => navigate('/admin/create-event')}
                    className="inline-flex items-center justify-center px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    aria-label="Create a new event"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                    Create Another Event
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rest of the component content with detailed sections */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 print:block">
          {/* Main Content Grid - Using auto-fit for independent heights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Event Details */}
            <div className="bg-white border border-gray-200 rounded-lg h-fit">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4M8 7l8 0M8 7l-4 4m12-4l4 4M5 11v6a2 2 0 002 2h10a2 2 0 002-2v-6"></path>
                  </svg>
                  Event Information
                </h3>
              </div>
              <div className="p-4 space-y-4">
                {/* Event Descriptions Section */}
                <div className="space-y-3">
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Short Description</dt>
                    <dd className="text-sm text-gray-900 bg-gray-50 rounded-md p-3 border border-gray-200">
                      {eventData.short_description || 'No description provided'}
                    </dd>
                  </div>
                  {eventData.detailed_description && (
                    <div>
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Detailed Description</dt>
                      <dd className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 rounded-md p-3 border border-gray-200">
                        {eventData.detailed_description}
                      </dd>
                    </div>
                  )}
                </div>

                {/* Event Schedule Section */}
                <div className="pt-3 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 text-sm mb-3">Event Schedule</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <dt className="text-xs font-medium text-blue-700 uppercase tracking-wide">Start Date & Time</dt>
                      <dd className="mt-1 text-sm font-medium text-blue-900">
                        {formatDate(eventData.start_date)}
                      </dd>
                      <dd className="text-sm text-blue-700">
                        {formatTime(eventData.start_time)}
                      </dd>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <dt className="text-xs font-medium text-red-700 uppercase tracking-wide">End Date & Time</dt>
                      <dd className="mt-1 text-sm font-medium text-red-900">
                        {formatDate(eventData.end_date)}
                      </dd>
                      <dd className="text-sm text-red-700">
                        {formatTime(eventData.end_time)}
                      </dd>
                    </div>
                  </div>
                </div>

                {/* Venue/Location Section */}
                <div className="pt-3 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 text-sm mb-3">Location Details</h4>
                  <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
                    <dt className="text-xs font-medium text-purple-700 uppercase tracking-wide mb-2">
                      {eventData.mode === 'online' ? 'Platform/Meeting Link' : 'Venue'}
                    </dt>
                    <dd className="text-sm font-medium text-purple-900 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {eventData.mode === 'online' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        )}
                      </svg>
                      {eventData.venue || 'Not specified'}
                    </dd>
                    <dd className="text-xs text-purple-600 mt-1 capitalize">
                      {eventData.mode} Event
                    </dd>
                  </div>
                </div>

                {/* Event Type & Audience Section */}
                <div className="pt-3 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 text-sm mb-3">Event Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-green-50 border border-green-200 rounded-md p-3">
                      <dt className="text-xs font-medium text-green-700 uppercase tracking-wide">Event Type</dt>
                      <dd className="mt-1 text-sm font-medium text-green-900 capitalize">
                        {eventData.event_type || 'N/A'}
                      </dd>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                      <dt className="text-xs font-medium text-orange-700 uppercase tracking-wide">Target Audience</dt>
                      <dd className="mt-1 text-sm font-medium text-orange-900">
                        {eventData.target_audience === 'student' ? 'Students Only' :
                         eventData.target_audience === 'faculty' ? 'Faculty Only' :
                         eventData.target_audience === 'all' ? 'All Audiences' :
                         eventData.target_audience?.charAt(0).toUpperCase() + eventData.target_audience?.slice(1) || 'N/A'}
                      </dd>
                    </div>
                  </div>
                  {eventData.is_xenesis_event && (
                    <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-md p-3">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2L13.09 8.26L22 9L13.09 15.74L12 22L10.91 15.74L2 9L10.91 8.26L12 2Z"/>
                        </svg>
                        <span className="text-sm font-medium text-yellow-900">Xenesis Event</span>
                      </div>
                      <p className="text-xs text-yellow-700 mt-1">This is a special Xenesis event with priority handling</p>
                    </div>
                  )}
                </div>

                {/* Student Target Audience Details */}
                {eventData.target_audience === 'student' && (
                  <div className="pt-3 border-t border-gray-200">
                    <h4 className="font-medium text-gray-900 text-sm mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Student Target Details
                    </h4>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                      {/* Department Selection */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-blue-800">Department*</span>
                          <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full font-medium">
                            {eventData.student_department?.length || 0} selected
                          </span>
                        </div>
                        <div className="text-xs text-blue-600 mb-2 italic">
                          Select one or more departments (e.g., CSE, IT, ECE)
                        </div>
                        <div className="space-y-2">
                          {eventData.student_department && eventData.student_department.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {eventData.student_department.map((dept, index) => {
                                try {
                                  const deptOption = dropdownOptionsService.getOptions('student', 'departments').find(opt => opt.value === dept);
                                  return (
                                    <span
                                      key={index}
                                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-200 text-blue-900 border border-blue-300"
                                    >
                                      {deptOption ? deptOption.label : dept}
                                    </span>
                                  );
                                } catch (error) {
                                  return (
                                    <span
                                      key={index}
                                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-200 text-blue-900 border border-blue-300"
                                    >
                                      {dept}
                                    </span>
                                  );
                                }
                              })}
                            </div>
                          ) : (
                            <div className="text-sm text-blue-600 bg-blue-100 rounded-md px-3 py-2 border border-blue-200">
                              No departments selected
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Semester Selection */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-blue-800">Semester*</span>
                          <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full font-medium">
                            {eventData.student_semester?.length || 0} selected
                          </span>
                        </div>
                        <div className="text-xs text-blue-600 mb-2 italic">
                          Select one or more semesters (e.g., 3, 4, 5)
                        </div>
                        <div className="space-y-2">
                          {eventData.student_semester && eventData.student_semester.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {eventData.student_semester.sort((a, b) => parseInt(a) - parseInt(b)).map((sem, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-200 text-green-900 border border-green-300"
                                >
                                  {sem === '1' ? '1st' : sem === '2' ? '2nd' : sem === '3' ? '3rd' : `${sem}th`} Semester
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-blue-600 bg-blue-100 rounded-md px-3 py-2 border border-blue-200">
                              No semesters selected
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div>
                        <span className="text-sm font-medium text-blue-800">Additional Info (Optional)</span>
                        <div className="mt-2">
                          {eventData.custom_text?.trim() ? (
                            <div className="text-sm text-blue-900 bg-blue-100 rounded-md px-3 py-2 border border-blue-200">
                              {eventData.custom_text}
                            </div>
                          ) : (
                            <div className="text-sm text-blue-600 bg-blue-100 rounded-md px-3 py-2 border border-blue-200 italic">
                              Any specific requirements...
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Attendance Strategy Section */}
                {eventData.attendance_mandatory && eventData.attendance_strategy && (
                  <div className="pt-3 border-t border-gray-200">
                    <h4 className="font-medium text-gray-900 text-sm mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      Attendance Strategy
                    </h4>
                    <div className="bg-white p-0 ">
                      {/* Strategy Overview - Bullet Points Format */}
                      <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm mb-3">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <div className="flex-1 flex items-center justify-between">
                              <span className="text-xs font-medium text-gray-700">Strategy Type:</span>
                              <span className="text-xs font-semibold text-gray-900 bg-green-50 px-2 py-1 rounded-full">
                                {formatStrategyType(
                                  eventData.attendance_strategy?.detected_strategy?.name || 
                                  eventData.attendance_strategy?.strategy_type ||
                                  eventData.attendance_strategy?.strategy ||
                                  eventData.attendance_strategy?.type ||
                                  eventData.strategy_type ||
                                  eventData.strategy ||
                                  'Session Based'
                                )}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <div className="flex-1 flex items-center justify-between">
                              <span className="text-xs font-medium text-gray-700">Pass Criteria:</span>
                              <span className="text-xs font-semibold text-gray-900 bg-blue-50 px-2 py-1 rounded-full">
                                {(eventData.attendance_strategy?.criteria?.minimum_percentage || 
                                 eventData.attendance_strategy?.minimum_percentage || 
                                 eventData.attendance_strategy?.pass_criteria ||
                                 eventData.minimum_percentage ||
                                 eventData.pass_criteria ||
                                 75)}% required
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <div className="flex-1 flex items-center justify-between">
                              <span className="text-xs font-medium text-gray-700">Total Sessions:</span>
                              <span className="text-xs font-semibold text-gray-900 bg-purple-50 px-2 py-1 rounded-full">
                                {eventData.attendance_strategy.sessions?.length || 0} session{(eventData.attendance_strategy.sessions?.length || 0) !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Session Overview */}
                      {eventData.attendance_strategy.sessions?.length > 0 && (
                        <div className="bg-white rounded-lg p-3 border border-gray-200 mb-3">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <svg className="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m0 10v-5a2 2 0 012-2h2a2 2 0 012 2v5a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                              </div>
                              <h5 className="text-xs font-medium text-gray-900">Session Overview</h5>
                            </div>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                              {eventData.attendance_strategy.sessions.length} session{eventData.attendance_strategy.sessions.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {eventData.attendance_strategy.sessions.slice(0, 3).map((session, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="flex items-center space-x-2">
                                  <div className="flex-shrink-0">
                                    <span className="w-6 h-6 bg-indigo-600 text-white rounded-lg flex items-center justify-center text-xs font-semibold">
                                      {idx + 1}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-900">
                                      {session?.session_name || session?.name || session?.title || `Session ${idx + 1}`}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Session {idx + 1} of {eventData.attendance_strategy.sessions.length}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-medium text-gray-900">
                                    {(session?.duration_minutes || session?.duration || session?.length) ? 
                                      `${Math.floor((session.duration_minutes || session.duration || session.length) / 60)}h ${(session.duration_minutes || session.duration || session.length) % 60}m` : 
                                      'TBD'
                                    }
                                  </p>
                                  <p className="text-xs text-gray-500">Duration</p>
                                </div>
                              </div>
                            ))}
                            {eventData.attendance_strategy.sessions.length > 3 && (
                              <div className="text-center py-1">
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                  +{eventData.attendance_strategy.sessions.length - 3} more sessions
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Strategy Description */}
                      {eventData.attendance_strategy.detected_strategy?.description && (
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="flex items-start space-x-2">
                            <div className="flex-shrink-0">
                              <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center">
                                <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                            </div>
                            <div className="flex-1">
                              <h5 className="text-xs font-medium text-gray-900 mb-1">Strategy Description</h5>
                              <p className="text-xs text-gray-700">
                                {eventData.attendance_strategy.detected_strategy?.description || 
                                 eventData.attendance_strategy.description || 
                                 'Strategy determined automatically based on event type'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Registration & Organizer Sections */}
            <div className="space-y-6">
              {/* Registration & Certificate Details */}
              <div className="bg-white border border-gray-200 rounded-lg h-fit">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    Registration & Certificate Details
                  </h3>
                </div>
              <div className="p-4 space-y-4">
                {/* Registration Settings */}
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm mb-2">Registration Settings</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Type</dt>
                        <dd className="mt-1 text-gray-900">{eventData.registration_type?.charAt(0).toUpperCase() + eventData.registration_type?.slice(1)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Mode</dt>
                        <dd className="mt-1 text-gray-900">{eventData.registration_mode?.charAt(0).toUpperCase() + eventData.registration_mode?.slice(1)}</dd>
                      </div>
                      {eventData.registration_fee && (
                        <>
                          <div>
                            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fee</dt>
                            <dd className="mt-1 text-gray-900">â‚¹{eventData.registration_fee}</dd>
                          </div>
                          {eventData.fee_description && (
                            <div>
                              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fee Description</dt>
                              <dd className="mt-1 text-gray-900">{eventData.fee_description}</dd>
                            </div>
                          )}
                        </>
                      )}
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Min Participants</dt>
                        <dd className="mt-1 text-gray-900">{eventData.min_participants || 1}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Max Participants</dt>
                        <dd className="mt-1 text-gray-900">{eventData.max_participants || 'No limit'}</dd>
                      </div>
                      {eventData.registration_mode === 'team' && (
                        <>
                          <div>
                            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Min Team Size</dt>
                            <dd className="mt-1 text-gray-900">{eventData.team_size_min || 'N/A'}</dd>
                          </div>
                          <div>
                            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Max Team Size</dt>
                            <dd className="mt-1 text-gray-900">{eventData.team_size_max || 'N/A'}</dd>
                          </div>
                          {eventData.allow_multiple_team_registrations && (
                            <div className="col-span-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                âœ“ Multiple Teams Allowed (with approval)
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Registration Dates */}
                  <div className="pt-3 border-t border-gray-200">
                    <h4 className="font-medium text-gray-900 text-sm mb-2">Registration Period</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Opens</dt>
                        <dd className="mt-1 text-gray-900">
                          {formatDate(eventData.registration_start_date)}<br />
                          <span className="text-gray-600">{formatTime(eventData.registration_start_time)}</span>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Closes</dt>
                        <dd className="mt-1 text-gray-900">
                          {formatDate(eventData.registration_end_date)}<br />
                          <span className="text-gray-600">{formatTime(eventData.registration_end_time)}</span>
                        </dd>
                      </div>
                    </div>
                  </div>

                  {/* Certificate Details */}
                  <div className="pt-3 border-t border-gray-200">
                    <h4 className="font-medium text-gray-900 text-sm mb-2">Certificate & Resources</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Certificate Required:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {eventData.is_certificate_based ? 'Yes' : 'No'}
                        </span>
                      </div>
                      {eventData.is_certificate_based ? (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Certificate Template:</span>
                            <span className="text-sm font-medium text-gray-900">
                              {eventData.certificate_template?.name || 
                               eventData.certificate_template?.fileName || 
                               eventData.certificate_template?.originalName || 
                               eventData.certificate_template_name || 
                               eventData.certificateTemplate?.name ||
                               eventData.certificateTemplate ||
                               (eventData.certificate_template && typeof eventData.certificate_template === 'string' ? eventData.certificate_template : null) ||
                               // Check certificate_templates object for any template
                               (eventData.certificate_templates && Object.keys(eventData.certificate_templates).length > 0 ? 
                                 `${Object.keys(eventData.certificate_templates).length} template(s) uploaded` : null) ||
                               'No template selected'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Status:</span>
                            <span className={`text-sm font-medium ${(eventData.certificate_template?.name || 
                              eventData.certificate_template?.fileName || 
                              eventData.certificate_template?.originalName || 
                              eventData.certificate_template_name || 
                              eventData.certificateTemplate?.name ||
                              eventData.certificateTemplate ||
                              eventData.certificate_template ||
                              (eventData.certificate_templates && Object.keys(eventData.certificate_templates).length > 0)) ? 'text-green-600' : 'text-amber-600'}`}>
                              {(eventData.certificate_template?.name || 
                                eventData.certificate_template?.fileName || 
                                eventData.certificate_template?.originalName || 
                                eventData.certificate_template_name || 
                                eventData.certificateTemplate?.name ||
                                eventData.certificateTemplate ||
                                eventData.certificate_template ||
                                (eventData.certificate_templates && Object.keys(eventData.certificate_templates).length > 0)) ? '✓ Template Uploaded' : '✗ Template Required'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Available Until:</span>
                            <span className="text-sm font-medium text-gray-900">
                              {formatDate(eventData.certificate_end_date)} at {formatTime(eventData.certificate_end_time)}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Note:</span>
                          <span className="text-sm text-gray-500">
                            No certificates will be distributed
                          </span>
                        </div>
                      )}
                      {eventData.assets && eventData.assets.length > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Additional Assets:</span>
                          <span className="text-sm font-medium text-gray-900">{eventData.assets.length} file(s) uploaded</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Organizer Information */}
              <div className="bg-white border border-gray-200 rounded-lg h-fit">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                    </svg>
                    Organizer & Contact Information
                  </h3>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Organizing Department/Club</dt>
                    <dd className="mt-1 text-sm font-medium text-gray-900">{eventData.organizing_department}</dd>
                  </div>
                  
                  {eventData.organizers && eventData.organizers.length > 0 && (
                    <div>
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Event Organizers</dt>
                      <div className="space-y-2">
                        {eventData.organizers.map((organizer, index) => (
                          <div key={index} className="bg-gray-50 border border-gray-200 rounded-md p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  {organizer.name || 'Unnamed Organizer'}
                                </p>
                                {organizer.email && (
                                  <p className="text-xs text-gray-600 mt-1">Email: {organizer.email}</p>
                                )}
                                {organizer.employee_id && (
                                  <p className="text-xs text-gray-600">Employee ID: {organizer.employee_id}</p>
                                )}
                                {organizer.id && (
                                  <p className="text-xs text-gray-500">Faculty ID: {organizer.id}</p>
                                )}
                              </div>
                              <div className="flex flex-col gap-1">
                                {organizer.isNew && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-yellow-50 text-yellow-800 border border-yellow-200">
                                    New Organizer
                                  </span>
                                )}
                                {organizer.selected && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-50 text-green-800 border border-green-200">
                                    Selected
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {eventData.contacts && eventData.contacts.length > 0 && (
                    <div>
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Contact Information</dt>
                      <div className="space-y-2">
                        {eventData.contacts.map((contact, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2">
                            <span className="text-sm font-medium text-gray-900">{contact.name}</span>
                            <span className="text-sm text-gray-600">{contact.contact}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Full Width Requirements Section */}
          <div className="mt-6">
            {/* Requirements & Additional Information */}
            {(eventData.prerequisites || eventData.what_to_bring) && (
              <div className="bg-white border border-gray-200 rounded-lg h-fit">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                    </svg>
                    Requirements & Additional Information
                  </h3>
                </div>
                <div className="p-4 space-y-4">
                  {eventData.prerequisites && (
                    <div>
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Prerequisites</dt>
                      <dd className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 rounded-md p-3 border border-gray-200">
                        {eventData.prerequisites}
                      </dd>
                    </div>
                  )}
                  {eventData.what_to_bring && (
                    <div>
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">What to Bring</dt>
                      <dd className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 rounded-md p-3 border border-gray-200">
                        {eventData.what_to_bring}
                      </dd>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </AdminLayout>
  );
}

export default EventCreatedSuccess;
