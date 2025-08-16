import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font } from '@react-pdf/renderer';
import { eventPDFService } from '../../services/EventPDFService';

function EventCreatedSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [eventData, setEventData] = useState(null);

  useEffect(() => {
    if (location.state?.eventData) {
      console.log('Event Data Structure:', location.state.eventData);
      console.log('Organizers:', location.state.eventData.organizers);
      console.log('Certificate Template:', location.state.eventData.certificate_template);
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
            <Text style={styles.title}>CampusConnect Event Management System</Text>
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
                        <Text style={[styles.fieldValue, { fontSize: 8 }]}>📧 {organizer.email}</Text>
                      )}
                      {organizer.employee_id && (
                        <Text style={[styles.fieldValue, { fontSize: 8 }]}>🆔 {organizer.employee_id}</Text>
                      )}
                      {organizer.isNew && (
                        <Text style={[styles.fieldValue, { fontSize: 8, color: '#856404' }]}>⚠️ New Organizer</Text>
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
                      <Text style={[styles.fieldValue, { fontSize: 8 }]}>📞 {contact.name}: {contact.contact}</Text>
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
                  <Text style={styles.fieldValue}>₹{eventData.registration_fee}</Text>
                </View>
              )}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Min Participants:</Text>
                <Text style={styles.fieldValue}>{eventData.min_participants || 1}</Text>
              </View>
              {eventData.max_participants && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Max Participants:</Text>
                  <Text style={styles.fieldValue}>{eventData.max_participants}</Text>
                </View>
              )}
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
                <Text style={styles.fieldLabel}>Certificate Template:</Text>
                <Text style={styles.fieldValue}>
                  {eventData.certificate_template?.name || 
                   eventData.certificate_template_name || 
                   (eventData.certificate_template && typeof eventData.certificate_template === 'string' ? eventData.certificate_template : null) ||
                   'No template selected'}
                </Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Certificate Status:</Text>
                <Text style={styles.fieldValue}>
                  {(eventData.certificate_template?.name || 
                    eventData.certificate_template_name || 
                    eventData.certificate_template) ? '✓ Template Uploaded' : '⚠️ Template Required'}
                </Text>
              </View>
              {eventData.assets && eventData.assets.length > 0 && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Additional Assets:</Text>
                  <Text style={styles.fieldValue}>{eventData.assets.length} file(s) uploaded</Text>
                </View>
              )}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Certificate Available Until:</Text>
                <Text style={styles.fieldValue}>
                  {formatDate(eventData.certificate_end_date)} at {formatTime(eventData.certificate_end_time)}
                </Text>
              </View>
            </View>
          </View>
        </View>
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
                    {eventData.attendance_strategy.detected_strategy?.name || 
                     eventData.attendance_strategy.strategy || 
                     'Auto-detected'}
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
                    {eventData.attendance_strategy.criteria?.minimum_percentage || 
                     eventData.attendance_strategy.minimum_percentage || 'N/A'}% attendance required
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
                          {index + 1}. {session.session_name || `Session ${index + 1}`} 
                          {session.session_type && ` (${session.session_type})`}
                          {session.duration_minutes && ` - ${Math.floor(session.duration_minutes / 60)}h ${session.duration_minutes % 60}m`}
                          {session.is_mandatory === false && ' [Optional]'}
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
                        <Text style={[styles.fieldValue, { fontSize: 8 }]}>• {rec}</Text>
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

          {/* Administrative Section */}
          <View style={styles.approvalSection}>
            <Text style={styles.sectionTitle}>ADMINISTRATIVE SECTION</Text>
            <View style={styles.checkboxLine}>
              <Text style={styles.fieldLabel}>Event Review:</Text>
              <Text style={styles.fieldValue}>☐ Approved ☐ Needs Modification</Text>
            </View>
            <View style={styles.checkboxLine}>
              <Text style={styles.fieldLabel}>Budget Approval:</Text>
              <Text style={styles.fieldValue}>☐ Approved ☐ Not Required</Text>
            </View>
            <View style={styles.checkboxLine}>
              <Text style={styles.fieldLabel}>Venue Confirmation:</Text>
              <Text style={styles.fieldValue}>☐ Confirmed ☐ Alternative Required</Text>
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
      console.error('Error generating HTML for print:', error);
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
                        ⭐ Xenesis Event
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
                      onClick={() => navigate('/admin/events')}
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
                      <dd className="mt-1 text-sm font-medium text-orange-900 capitalize">
                        {eventData.target_audience || 'N/A'}
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
                            <dd className="mt-1 text-gray-900">₹{eventData.registration_fee}</dd>
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
                      {eventData.max_participants && (
                        <div>
                          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Max Participants</dt>
                          <dd className="mt-1 text-gray-900">{eventData.max_participants}</dd>
                        </div>
                      )}
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
                                ✓ Multiple Teams Allowed (with approval)
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
                        <span className="text-sm text-gray-600">Certificate Template:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {eventData.certificate_template?.name || 
                           eventData.certificate_template_name || 
                           (eventData.certificate_template && typeof eventData.certificate_template === 'string' ? eventData.certificate_template : 'No template selected')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Status:</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          (eventData.certificate_template?.name || 
                           eventData.certificate_template_name || 
                           eventData.certificate_template) 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {(eventData.certificate_template?.name || 
                            eventData.certificate_template_name || 
                            eventData.certificate_template) ? '✓ Template Uploaded' : '⚠️ Template Required'}
                        </span>
                      </div>
                      {eventData.assets && eventData.assets.length > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Additional Assets:</span>
                          <span className="text-sm font-medium text-gray-900">{eventData.assets.length} file(s) uploaded</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Available Until:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatDate(eventData.certificate_end_date)} at {formatTime(eventData.certificate_end_time)}
                        </span>
                      </div>
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
                                    ✓ Selected
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
