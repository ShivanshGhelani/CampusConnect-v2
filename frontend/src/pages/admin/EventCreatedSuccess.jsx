import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font } from '@react-pdf/renderer';

function EventCreatedSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [eventData, setEventData] = useState(null);

  useEffect(() => {
    // Get event data from location state
    if (location.state?.eventData) {
      setEventData(location.state.eventData);
    } else {
      // If no event data, redirect to events list
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

  // PDF Document Component
  const EventPDFDocument = () => (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>CampusConnect Event Management System</Text>
          {user?.role === 'executive_admin' ? (
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

        {/* Request Summary for Executive Admin */}
        {user?.role === 'executive_admin' && (
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
              <Text style={styles.fieldValue}>Executive Administration</Text>
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
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Event ID:</Text>
            <Text style={styles.fieldValue}>{eventData.event_id}</Text>
          </View>
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
                <Text style={styles.fieldLabel}>Event ID:</Text>
                <Text style={styles.fieldValue}>{eventData.event_id}</Text>
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

            {/* Registration Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>4. Registration Details</Text>
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
            </View>
          </View>
        </View>
      </Page>

      {/* Second Page for Executive Admin Approval Section */}
      {user?.role === 'executive_admin' && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.title}>Event Request Form - Page 2</Text>
            <Text style={styles.subtitle}>{eventData.event_name}</Text>
          </View>

          {/* Organizer Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Organizer Information</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Organizing Department:</Text>
              <Text style={styles.fieldValue}>{eventData.organizing_department || 'N/A'}</Text>
            </View>
            {eventData.organizers?.map((organizer, index) => (
              <View key={index} style={{ marginBottom: 6, border: '1px solid #ccc', padding: 4 }}>
                <Text style={[styles.fieldLabel, { fontSize: 8 }]}>
                  Organizer {index + 1}: {typeof organizer === 'object' ? organizer.name : organizer}
                </Text>
                {typeof organizer === 'object' && organizer.email && (
                  <Text style={[styles.fieldValue, { fontSize: 8 }]}>Email: {organizer.email}</Text>
                )}
              </View>
            ))}
          </View>

          {/* Approval Section */}
          <View style={styles.approvalSection}>
            <Text style={styles.sectionTitle}>APPROVAL SECTION</Text>
            <View style={styles.checkboxLine}>
              <Text style={styles.fieldLabel}>Administrative Review:</Text>
              <Text style={styles.fieldValue}>☐ Approved ☐ Rejected ☐ Needs Modification</Text>
            </View>
            <View style={styles.checkboxLine}>
              <Text style={styles.fieldLabel}>Budget Approval:</Text>
              <Text style={styles.fieldValue}>☐ Approved ☐ Rejected ☐ Not Required</Text>
            </View>
            <View style={styles.checkboxLine}>
              <Text style={styles.fieldLabel}>Venue Confirmation:</Text>
              <Text style={styles.fieldValue}>☐ Confirmed ☐ Alternative Required</Text>
            </View>
            <View style={styles.checkboxLine}>
              <Text style={styles.fieldLabel}>Final Approval:</Text>
              <Text style={styles.fieldValue}>☐ Approved ☐ Rejected</Text>
            </View>

            <View style={styles.signatureContainer}>
              <View style={styles.signatureBox}>
                <Text style={{ fontWeight: 'bold', marginBottom: 20 }}>Super Admin Signature</Text>
                <Text>Date: _____________</Text>
              </View>
              <View style={styles.signatureBox}>
                <Text style={{ fontWeight: 'bold', marginBottom: 20 }}>Academic Head Signature</Text>
                <Text>Date: _____________</Text>
              </View>
            </View>

            <View style={{ marginTop: 12, border: '1px solid #333', padding: 8 }}>
              <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Comments/Modifications Required:</Text>
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

  const handlePrint = async () => {
    // This function is no longer needed as we're using PDFDownloadLink
    console.log('PDF download handled by PDFDownloadLink component');
  };

  const generatePrintableHTML = () => {
    const currentDate = new Date().toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${user?.role === 'executive_admin' ? 'Event Request Form' : 'Event Details'} - ${eventData.event_name}</title>
    <style>
        @page {
            margin: 0.5in;
            size: A4;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Times New Roman', serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #000;
            background: white;
        }
        
        .page-header {
            text-align: center;
            border-bottom: 2px solid #000;
            margin-bottom: 20px;
            padding-bottom: 15px;
        }
        
        .page-header h1 {
            font-size: 18pt;
            font-weight: bold;
            margin-bottom: 8px;
        }
        
        .page-header h2 {
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .section {
            margin-bottom: 20px;
            border: 1px solid #333;
            padding: 12px;
            page-break-inside: avoid;
        }
        
        .section-title {
            font-size: 12pt;
            font-weight: bold;
            margin-bottom: 10px;
            border-bottom: 1px solid #666;
            padding-bottom: 3px;
        }
        
        .field {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
            border-bottom: 1px dotted #999;
            padding-bottom: 3px;
            align-items: flex-start;
        }
        
        .field-label {
            font-weight: bold;
            min-width: 140px;
            flex-shrink: 0;
        }
        
        .field-value {
            flex: 1;
            text-align: right;
            word-wrap: break-word;
        }
        
        .event-header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid #ccc;
        }
        
        .event-title {
            font-size: 16pt;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .event-badges {
            margin-top: 10px;
        }
        
        .badge {
            display: inline-block;
            border: 1px solid #333;
            padding: 3px 8px;
            margin: 2px;
            font-size: 9pt;
        }
        
        .two-column {
            display: flex;
            gap: 20px;
        }
        
        .column {
            flex: 1;
        }
        
        .approval-section {
            margin-top: 30px;
            border: 2px solid #000;
            padding: 15px;
        }
        
        .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
        }
        
        .signature-box {
            border: 2px solid #000;
            padding: 30px 15px 10px;
            text-align: center;
            min-width: 200px;
            margin: 0 10px;
        }
        
        .signature-line {
            border-top: 1px solid #000;
            margin-top: 40px;
            padding-top: 5px;
            font-size: 10pt;
        }
        
        .footer {
            margin-top: 30px;
            text-align: center;
            border-top: 1px solid #ccc;
            padding-top: 10px;
            font-size: 9pt;
        }
        
        .status-pending {
            background: #fff;
            border: 2px solid #000;
            padding: 3px 8px;
            font-weight: bold;
        }
        
        .description-box {
            border: 1px solid #333;
            padding: 8px;
            margin-top: 5px;
            min-height: 40px;
        }
        
        .checkbox-line {
            margin: 8px 0;
        }
        
        .comments-section {
            margin-top: 15px;
            border: 1px solid #333;
            padding: 10px;
        }
        
        .comment-line {
            border-bottom: 1px solid #ccc;
            margin-bottom: 8px;
            min-height: 25px;
        }
        
        @media print {
            body { -webkit-print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    <!-- Page Header -->
    <div class="page-header">
        <h1>CampusConnect Event Management System</h1>
        ${user?.role === 'executive_admin' ? `
        <h2>EVENT CREATION REQUEST FORM</h2>
        <p>Submitted by: ${eventData.event_created_by || user.fullname || user.username || 'Executive Admin'}</p>
        <p>Request Date: ${currentDate}</p>
        <p style="margin-top: 8px;">Status: <span class="status-pending">PENDING APPROVAL</span></p>
        ` : `
        <h2>Event Creation Confirmation</h2>
        <p>Generated on: ${currentDate}</p>
        `}
    </div>

    ${user?.role === 'executive_admin' ? `
    <!-- Request Summary -->
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
            <span class="field-value">YES - Super Admin Approval</span>
        </div>
    </div>
    ` : ''}

    <!-- Event Header -->
    <div class="event-header">
        <div class="event-title">${eventData.event_name}</div>
        <div class="field">
            <span class="field-label">Event ID:</span>
            <span class="field-value" style="font-family: monospace;">${eventData.event_id}</span>
        </div>
        <div class="event-badges">
            <span class="badge">${eventData.event_type?.charAt(0).toUpperCase() + eventData.event_type?.slice(1) || 'N/A'}</span>
            <span class="badge">${eventData.target_audience?.charAt(0).toUpperCase() + eventData.target_audience?.slice(1) || 'N/A'}</span>
            <span class="badge">${eventData.mode?.charAt(0).toUpperCase() + eventData.mode?.slice(1) || 'N/A'}</span>
            ${eventData.is_xenesis_event ? '<span class="badge">Xenesis Event</span>' : ''}
        </div>
    </div>

    <!-- Two Column Layout -->
    <div class="two-column">
        <!-- Left Column -->
        <div class="column">
            <!-- Basic Information -->
            <div class="section">
                <div class="section-title">1. Basic Information</div>
                <div class="field">
                    <span class="field-label">Event ID:</span>
                    <span class="field-value" style="font-family: monospace;">${eventData.event_id}</span>
                </div>
                <div class="field">
                    <span class="field-label">Short Description:</span>
                    <span class="field-value">${eventData.short_description || 'N/A'}</span>
                </div>
                <div class="field">
                    <span class="field-label">Detailed Description:</span>
                    <span class="field-value">See below</span>
                </div>
                <div class="description-box">
                    ${(eventData.detailed_description || 'N/A').replace(/\n/g, '<br>')}
                </div>
            </div>

            <!-- Organizer Information -->
            <div class="section">
                <div class="section-title">4. Organizer & Contact Information</div>
                <div class="field">
                    <span class="field-label">Organizing Department:</span>
                    <span class="field-value">${eventData.organizing_department || 'N/A'}</span>
                </div>
                
                <div style="margin: 10px 0; font-weight: bold;">Event Organizers:</div>
                ${eventData.organizers?.map((organizer, index) => `
                    <div style="border: 1px solid #ccc; padding: 8px; margin-bottom: 8px;">
                        <div class="field">
                            <span class="field-label">Name:</span>
                            <span class="field-value">${typeof organizer === 'object' ? organizer.name : organizer}</span>
                        </div>
                        ${typeof organizer === 'object' && organizer.email ? `
                        <div class="field">
                            <span class="field-label">Email:</span>
                            <span class="field-value">${organizer.email}</span>
                        </div>
                        ` : ''}
                        ${typeof organizer === 'object' && organizer.employee_id ? `
                        <div class="field">
                            <span class="field-label">Employee ID:</span>
                            <span class="field-value">${organizer.employee_id}</span>
                        </div>
                        ` : ''}
                        ${typeof organizer === 'object' && organizer.isNew ? `
                        <div class="field">
                            <span class="field-label">Status:</span>
                            <span class="field-value">⚠️ New Organizer (Requires Approval)</span>
                        </div>
                        ` : ''}
                    </div>
                `).join('') || '<p>No organizers specified</p>'}
                
                ${eventData.contacts?.length > 0 ? `
                <div style="margin: 15px 0 5px 0; font-weight: bold;">Contact Information:</div>
                ${eventData.contacts.map(contact => `
                    <div class="field">
                        <span class="field-label">${contact.name}:</span>
                        <span class="field-value">${contact.contact}</span>
                    </div>
                `).join('')}
                ` : ''}
            </div>

            ${eventData.target_outcomes ? `
            <!-- Target Outcomes -->
            <div class="section">
                <div class="section-title">Learning Objectives</div>
                <div class="description-box">
                    ${eventData.target_outcomes.replace(/\n/g, '<br>')}
                </div>
            </div>
            ` : ''}
        </div>

        <!-- Right Column -->
        <div class="column">
            <!-- Schedule -->
            <div class="section">
                <div class="section-title">2. Schedule</div>
                <div class="field">
                    <span class="field-label">Event Start:</span>
                    <span class="field-value">${formatDate(eventData.start_date)} at ${formatTime(eventData.start_time)}</span>
                </div>
                <div class="field">
                    <span class="field-label">Event End:</span>
                    <span class="field-value">${formatDate(eventData.end_date)} at ${formatTime(eventData.end_time)}</span>
                </div>
                <div class="field">
                    <span class="field-label">Registration Opens:</span>
                    <span class="field-value">${formatDate(eventData.registration_start_date)} at ${formatTime(eventData.registration_start_time)}</span>
                </div>
                <div class="field">
                    <span class="field-label">Registration Closes:</span>
                    <span class="field-value">${formatDate(eventData.registration_end_date)} at ${formatTime(eventData.registration_end_time)}</span>
                </div>
                <div class="field">
                    <span class="field-label">Certificate Available Until:</span>
                    <span class="field-value">${formatDate(eventData.certificate_end_date)} at ${formatTime(eventData.certificate_end_time)}</span>
                </div>
            </div>

            <!-- Venue Information -->
            <div class="section">
                <div class="section-title">3. Venue & Location</div>
                <div class="field">
                    <span class="field-label">Event Mode:</span>
                    <span class="field-value">${eventData.mode?.charAt(0).toUpperCase() + eventData.mode?.slice(1) || 'N/A'}</span>
                </div>
                <div class="field">
                    <span class="field-label">${eventData.mode === 'online' ? 'Platform/Link:' : 'Venue/Location:'}</span>
                    <span class="field-value">${eventData.venue || 'N/A'}</span>
                </div>
                ${eventData.venue_id ? `
                <div class="field">
                    <span class="field-label">Venue Status:</span>
                    <span class="field-value">Pre-approved Venue</span>
                </div>
                ` : (eventData.mode !== 'online' ? `
                <div class="field">
                    <span class="field-label">Venue Status:</span>
                    <span class="field-value">⚠️ Requires Booking Confirmation</span>
                </div>
                ` : '')}
            </div>

            <!-- Registration Details -->
            <div class="section">
                <div class="section-title">5. Registration Details</div>
                <div class="field">
                    <span class="field-label">Registration Type:</span>
                    <span class="field-value">${eventData.registration_type?.charAt(0).toUpperCase() + eventData.registration_type?.slice(1) || 'N/A'}</span>
                </div>
                <div class="field">
                    <span class="field-label">Registration Mode:</span>
                    <span class="field-value">${eventData.registration_mode?.charAt(0).toUpperCase() + eventData.registration_mode?.slice(1) || 'N/A'}</span>
                </div>
                ${eventData.registration_fee ? `
                <div class="field">
                    <span class="field-label">Registration Fee:</span>
                    <span class="field-value">₹${eventData.registration_fee}</span>
                </div>
                ` : ''}
                ${eventData.fee_description ? `
                <div class="field">
                    <span class="field-label">Fee Description:</span>
                    <span class="field-value">${eventData.fee_description}</span>
                </div>
                ` : ''}
                <div class="field">
                    <span class="field-label">Minimum Participants:</span>
                    <span class="field-value">${eventData.min_participants || 1}</span>
                </div>
                ${eventData.max_participants ? `
                <div class="field">
                    <span class="field-label">Maximum Participants:</span>
                    <span class="field-value">${eventData.max_participants}</span>
                </div>
                ` : ''}
                ${eventData.registration_mode === 'team' ? `
                <div class="field">
                    <span class="field-label">Min Team Size:</span>
                    <span class="field-value">${eventData.team_size_min || 'N/A'}</span>
                </div>
                <div class="field">
                    <span class="field-label">Max Team Size:</span>
                    <span class="field-value">${eventData.team_size_max || 'N/A'}</span>
                </div>
                ${eventData.allow_multiple_team_registrations ? `
                <div class="field">
                    <span class="field-label">Multiple Teams:</span>
                    <span class="field-value">✓ Allowed (with approval)</span>
                </div>
                ` : ''}
                ` : ''}
            </div>

            ${(eventData.prerequisites || eventData.what_to_bring) ? `
            <!-- Prerequisites & What to Bring -->
            <div class="section">
                <div class="section-title">6. Requirements</div>
                ${eventData.prerequisites ? `
                <div style="font-weight: bold; margin-bottom: 5px;">Prerequisites:</div>
                <div class="description-box">
                    ${eventData.prerequisites.replace(/\n/g, '<br>')}
                </div>
                ` : ''}
                ${eventData.what_to_bring ? `
                <div style="font-weight: bold; margin: 10px 0 5px 0;">What to Bring:</div>
                <div class="description-box">
                    ${eventData.what_to_bring.replace(/\n/g, '<br>')}
                </div>
                ` : ''}
            </div>
            ` : ''}

            <!-- Certificate & Resources -->
            <div class="section">
                <div class="section-title">7. Certificate & Resources</div>
                <div class="field">
                    <span class="field-label">Certificate Template:</span>
                    <span class="field-value">${eventData.certificate_template?.name || 'Not Selected'}</span>
                </div>
                <div class="field">
                    <span class="field-label">Certificate Status:</span>
                    <span class="field-value">${eventData.certificate_template ? '✓ Template Uploaded' : '⚠️ Template Required'}</span>
                </div>
                ${eventData.assets?.length > 0 ? `
                <div class="field">
                    <span class="field-label">Additional Assets:</span>
                    <span class="field-value">${eventData.assets.length} file(s) uploaded</span>
                </div>
                ` : ''}
                <div class="field">
                    <span class="field-label">Certificate Availability:</span>
                    <span class="field-value">Until ${formatDate(eventData.certificate_end_date)} at ${formatTime(eventData.certificate_end_time)}</span>
                </div>
            </div>

            ${user?.role === 'executive_admin' ? `
            <!-- Event Creator Information -->
            <div class="section">
                <div class="section-title">8. Request Submitted By</div>
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
                    <span class="field-value">PENDING SUPER ADMIN APPROVAL</span>
                </div>
            </div>
            ` : ''}
        </div>
    </div>

    ${user?.role === 'executive_admin' ? `
    <!-- Approval Section -->
    <div class="approval-section">
        <div class="section-title">APPROVAL SECTION</div>
        <div class="checkbox-line">
            <span class="field-label">Administrative Review:</span>
            <span class="field-value">☐ Approved ☐ Rejected ☐ Needs Modification</span>
        </div>
        <div class="checkbox-line">
            <span class="field-label">Budget Approval:</span>
            <span class="field-value">☐ Approved ☐ Rejected ☐ Not Required</span>
        </div>
        <div class="checkbox-line">
            <span class="field-label">Venue Confirmation:</span>
            <span class="field-value">☐ Confirmed ☐ Alternative Required</span>
        </div>
        <div class="checkbox-line">
            <span class="field-label">Final Approval:</span>
            <span class="field-value">☐ Approved ☐ Rejected</span>
        </div>
        
        <div class="signatures">
            <div class="signature-box">
                <div class="signature-line">
                    <strong>Super Admin Signature</strong><br>
                    Date: _____________
                </div>
            </div>
            <div class="signature-box">
                <div class="signature-line">
                    <strong>Academic Head Signature</strong><br>
                    Date: _____________
                </div>
            </div>
        </div>
        
        <div class="comments-section">
            <div style="font-weight: bold; margin-bottom: 8px;">Comments/Modifications Required:</div>
            <div class="comment-line"></div>
            <div class="comment-line"></div>
            <div class="comment-line"></div>
        </div>
    </div>
    ` : ''}

    <!-- Footer -->
    <div class="footer">
        ${user?.role === 'executive_admin' ? `
        <p style="font-weight: bold; margin-bottom: 8px;">FOR OFFICE USE ONLY</p>
        <div style="display: flex; justify-content: space-between; font-size: 8pt; margin-bottom: 5px;">
            <span>Request ID: EVT-${eventData.event_id}-${new Date().getFullYear()}</span>
            <span>Generated: ${new Date().toLocaleString('en-IN')}</span>
            <span>Status: PENDING REVIEW</span>
        </div>
        <p style="font-size: 8pt;">This is an electronically generated document from CampusConnect Event Management System</p>
        ` : `
        <p>Generated on ${new Date().toLocaleDateString('en-IN')} • CampusConnect Event Management System</p>
        `}
    </div>
</body>
</html>
    `;
  };

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
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (!eventData) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading event details...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        {/* Success Header - Hidden in print */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 print:hidden">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {location.state?.message || 'Event Created Successfully!'}
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              Your event "<span className="font-semibold text-blue-600">{eventData.event_name}</span>" has been created{location.state?.pendingApproval ? ' and is pending approval' : ' and is ready for registration'}.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {/* PDF Download Button using @react-pdf/renderer */}
              <PDFDownloadLink
                document={<EventPDFDocument />}
                fileName={`${user?.role === 'executive_admin' ? 'Event_Request' : 'Event_Details'}_${eventData.event_name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Event'}_${new Date().toISOString().split('T')[0]}.pdf`}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {({ blob, url, loading, error }) => (
                  loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      {user?.role === 'executive_admin' ? 'Download Request Form' : 'Download Event Details'}
                    </>
                  )
                )}
              </PDFDownloadLink>
              
              {/* Show View All Events only for regular admin, not executive admin */}
              {user?.role === 'admin' && (
                <button
                  onClick={() => navigate('/admin/events')}
                  className="inline-flex items-center px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                  View All Events
                </button>
              )}
              
              <button
                onClick={() => navigate('/admin/events/create')}
                className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Create Another Event
              </button>
            </div>
          </div>
        </div>

        {/* Printable Event Details */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div id="printable-content" className="bg-white rounded-xl shadow-lg border border-gray-200 print:shadow-none print:border-none">
            {/* Print Header - Enhanced for Executive Admin */}
            <div className="hidden print:block text-center py-6 border-b border-gray-200 print-header">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">CampusConnect Event Management System</h1>
              {user?.role === 'executive_admin' ? (
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">EVENT CREATION REQUEST FORM</h2>
                  <p className="text-gray-600">Submitted by: {eventData.event_created_by || user.fullname || user.username || 'Executive Admin'}</p>
                  <p className="text-gray-600">Request Date: {new Date().toLocaleDateString('en-IN', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}</p>
                  <p className="text-sm text-gray-500 mt-2">Status: 
                    <span className="event-status ml-2 px-2 py-1 rounded">PENDING APPROVAL</span>
                  </p>
                </div>
              ) : (
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">Event Creation Confirmation</h2>
                  <p className="text-gray-600">Generated on: {new Date().toLocaleDateString('en-IN')}</p>
                </div>
              )}
            </div>

            <div className="p-8">
              {/* Executive Admin Request Summary */}
              {user?.role === 'executive_admin' && (
                <div className="hidden print:block print-section mb-8 p-4 border border-gray-300">
                  <h3 className="text-lg font-bold mb-3">REQUEST SUMMARY</h3>
                  <div className="print-field">
                    <span className="print-field-label">Request Type:</span>
                    <span className="print-field-value">New Event Creation</span>
                  </div>
                  <div className="print-field">
                    <span className="print-field-label">Requested by:</span>
                    <span className="print-field-value">{eventData.event_created_by || user.fullname || user.username || 'Executive Admin'}</span>
                  </div>
                  <div className="print-field">
                    <span className="print-field-label">Department/Role:</span>
                    <span className="print-field-value">Executive Administration</span>
                  </div>
                  <div className="print-field">
                    <span className="print-field-label">Priority:</span>
                    <span className="print-field-value">{eventData.is_xenesis_event ? 'HIGH (Xenesis Event)' : 'NORMAL'}</span>
                  </div>
                  <div className="print-field">
                    <span className="print-field-label">Approval Required:</span>
                    <span className="print-field-value">YES - Super Admin Approval</span>
                  </div>
                </div>
              )}

              {/* Event Header */}
              <div className="text-center mb-8 pb-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{eventData.event_name}</h2>
                <div className="hidden print:block mb-4">
                  <div className="print-field">
                    <span className="print-field-label">Event ID:</span>
                    <span className="print-field-value font-mono">{eventData.event_id}</span>
                  </div>
                </div>
                <div className="flex flex-wrap justify-center gap-3 text-sm print:justify-start print:gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 print:bg-transparent print:border print:border-gray-400">
                    {eventData.event_type?.charAt(0).toUpperCase() + eventData.event_type?.slice(1)}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 print:bg-transparent print:border print:border-gray-400">
                    {eventData.target_audience?.charAt(0).toUpperCase() + eventData.target_audience?.slice(1)}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 text-purple-800 print:bg-transparent print:border print:border-gray-400">
                    {eventData.mode?.charAt(0).toUpperCase() + eventData.mode?.slice(1)}
                  </span>
                  {eventData.is_xenesis_event && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 print:bg-transparent print:border print:border-gray-400">
                      Xenesis Event
                    </span>
                  )}
                </div>
              </div>

              {/* Event Details Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Basic Information */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-600 print:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <span className="hidden print:inline">1. </span>Basic Information
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3 print:bg-white print:border print:border-gray-300 print-section">
                      <div className="print:hidden">
                        <p className="text-sm font-medium text-gray-500">Event ID</p>
                        <p className="text-gray-900 font-mono">{eventData.event_id}</p>
                      </div>
                      <div className="hidden print:block print-field">
                        <span className="print-field-label">Event ID:</span>
                        <span className="print-field-value font-mono">{eventData.event_id}</span>
                      </div>
                      <div className="print:hidden">
                        <p className="text-sm font-medium text-gray-500">Short Description</p>
                        <p className="text-gray-900">{eventData.short_description}</p>
                      </div>
                      <div className="hidden print:block print-field">
                        <span className="print-field-label">Short Description:</span>
                        <span className="print-field-value">{eventData.short_description}</span>
                      </div>
                      <div className="print:hidden">
                        <p className="text-sm font-medium text-gray-500">Detailed Description</p>
                        <p className="text-gray-900 whitespace-pre-wrap">{eventData.detailed_description}</p>
                      </div>
                      <div className="hidden print:block">
                        <div className="print-field">
                          <span className="print-field-label">Detailed Description:</span>
                          <span className="print-field-value">See below</span>
                        </div>
                        <div className="mt-2 p-2 border border-gray-300">
                          <p className="text-gray-900 whitespace-pre-wrap text-sm">{eventData.detailed_description}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Organizer Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-green-600 print:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                      </svg>
                      <span className="hidden print:inline">4. </span>Organizer & Contact Information
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3 print:bg-white print:border print:border-gray-300 print-section">
                      <div className="print:hidden">
                        <p className="text-sm font-medium text-gray-500">Department/Club</p>
                        <p className="text-gray-900">{eventData.organizing_department}</p>
                      </div>
                      <div className="hidden print:block print-field">
                        <span className="print-field-label">Organizing Department/Club:</span>
                        <span className="print-field-value">{eventData.organizing_department}</span>
                      </div>
                      
                      <div className="print:hidden">
                        <p className="text-sm font-medium text-gray-500">Organizers</p>
                        <div className="flex flex-wrap gap-2">
                          {eventData.organizers?.map((organizer, index) => (
                            <span key={index} className="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-800 text-sm">
                              {typeof organizer === 'object' ? organizer.name : organizer}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="hidden print:block">
                        <h4 className="font-bold text-sm mb-2">Event Organizers:</h4>
                        {eventData.organizers?.map((organizer, index) => (
                          <div key={index} className="mb-3 p-2 border border-gray-300">
                            <div className="print-field">
                              <span className="print-field-label">Name:</span>
                              <span className="print-field-value">{typeof organizer === 'object' ? organizer.name : organizer}</span>
                            </div>
                            {typeof organizer === 'object' && organizer.email && (
                              <div className="print-field">
                                <span className="print-field-label">Email:</span>
                                <span className="print-field-value">{organizer.email}</span>
                              </div>
                            )}
                            {typeof organizer === 'object' && organizer.employee_id && (
                              <div className="print-field">
                                <span className="print-field-label">Employee ID:</span>
                                <span className="print-field-value">{organizer.employee_id}</span>
                              </div>
                            )}
                            {typeof organizer === 'object' && organizer.isNew && (
                              <div className="print-field">
                                <span className="print-field-label">Status:</span>
                                <span className="print-field-value">⚠️ New Organizer (Requires Approval)</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      <div className="print:hidden">
                        <p className="text-sm font-medium text-gray-500">Contact Information</p>
                        <div className="space-y-2">
                          {eventData.contacts?.map((contact, index) => (
                            <div key={index} className="flex justify-between items-center bg-white rounded p-2">
                              <span className="font-medium">{contact.name}</span>
                              <span className="text-gray-600">{contact.contact}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="hidden print:block">
                        <h4 className="font-bold text-sm mb-2 mt-4">Contact Information:</h4>
                        {eventData.contacts?.map((contact, index) => (
                          <div key={index} className="print-field">
                            <span className="print-field-label">{contact.name}:</span>
                            <span className="print-field-value">{contact.contact}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Target Outcomes */}
                  {eventData.target_outcomes && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        Learning Objectives
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-900 whitespace-pre-wrap">{eventData.target_outcomes}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Schedule & Venue Information */}
                <div className="space-y-6">
                  {/* Schedule */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-red-600 print:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <span className="hidden print:inline">2. </span>Schedule
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-4 print:bg-white print:border print:border-gray-300 print-section">
                      <div className="print:hidden">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-white rounded p-3">
                            <p className="text-sm font-medium text-gray-500 mb-1">Event Start</p>
                            <p className="text-gray-900 font-medium">{formatDate(eventData.start_date)}</p>
                            <p className="text-gray-600">{formatTime(eventData.start_time)}</p>
                          </div>
                          <div className="bg-white rounded p-3">
                            <p className="text-sm font-medium text-gray-500 mb-1">Event End</p>
                            <p className="text-gray-900 font-medium">{formatDate(eventData.end_date)}</p>
                            <p className="text-gray-600">{formatTime(eventData.end_time)}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-white rounded p-3">
                            <p className="text-sm font-medium text-gray-500 mb-1">Registration Opens</p>
                            <p className="text-gray-900 font-medium">{formatDate(eventData.registration_start_date)}</p>
                            <p className="text-gray-600">{formatTime(eventData.registration_start_time)}</p>
                          </div>
                          <div className="bg-white rounded p-3">
                            <p className="text-sm font-medium text-gray-500 mb-1">Registration Closes</p>
                            <p className="text-gray-900 font-medium">{formatDate(eventData.registration_end_date)}</p>
                            <p className="text-gray-600">{formatTime(eventData.registration_end_time)}</p>
                          </div>
                        </div>
                        <div className="bg-white rounded p-3">
                          <p className="text-sm font-medium text-gray-500 mb-1">Certificate Available Until</p>
                          <p className="text-gray-900 font-medium">{formatDate(eventData.certificate_end_date)}</p>
                          <p className="text-gray-600">{formatTime(eventData.certificate_end_time)}</p>
                        </div>
                      </div>
                      <div className="hidden print:block">
                        <div className="print-field">
                          <span className="print-field-label">Event Start:</span>
                          <span className="print-field-value">{formatDate(eventData.start_date)} at {formatTime(eventData.start_time)}</span>
                        </div>
                        <div className="print-field">
                          <span className="print-field-label">Event End:</span>
                          <span className="print-field-value">{formatDate(eventData.end_date)} at {formatTime(eventData.end_time)}</span>
                        </div>
                        <div className="print-field">
                          <span className="print-field-label">Registration Opens:</span>
                          <span className="print-field-value">{formatDate(eventData.registration_start_date)} at {formatTime(eventData.registration_start_time)}</span>
                        </div>
                        <div className="print-field">
                          <span className="print-field-label">Registration Closes:</span>
                          <span className="print-field-value">{formatDate(eventData.registration_end_date)} at {formatTime(eventData.registration_end_time)}</span>
                        </div>
                        <div className="print-field">
                          <span className="print-field-label">Certificate Available Until:</span>
                          <span className="print-field-value">{formatDate(eventData.certificate_end_date)} at {formatTime(eventData.certificate_end_time)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Venue Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-orange-600 print:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      </svg>
                      <span className="hidden print:inline">3. </span>Venue & Location
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 print:bg-white print:border print:border-gray-300 print-section">
                      <div className="bg-white rounded p-3 print:bg-transparent print:p-0">
                        <div className="print:hidden">
                          <p className="text-sm font-medium text-gray-500 mb-1">Mode</p>
                          <p className="text-gray-900 font-medium capitalize">{eventData.mode}</p>
                          <p className="text-sm font-medium text-gray-500 mb-1 mt-3">Location/Platform</p>
                          <p className="text-gray-900">{eventData.venue}</p>
                        </div>
                        <div className="hidden print:block">
                          <div className="print-field">
                            <span className="print-field-label">Event Mode:</span>
                            <span className="print-field-value capitalize">{eventData.mode}</span>
                          </div>
                          <div className="print-field">
                            <span className="print-field-label">
                              {eventData.mode === 'online' ? 'Platform/Link:' : 'Venue/Location:'}
                            </span>
                            <span className="print-field-value">{eventData.venue}</span>
                          </div>
                          {eventData.venue_id && (
                            <div className="print-field">
                              <span className="print-field-label">Venue Status:</span>
                              <span className="print-field-value">Pre-approved Venue</span>
                            </div>
                          )}
                          {!eventData.venue_id && eventData.mode !== 'online' && (
                            <div className="print-field">
                              <span className="print-field-label">Venue Status:</span>
                              <span className="print-field-value">⚠️ Requires Booking Confirmation</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Registration Details */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-indigo-600 print:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                      </svg>
                      <span className="hidden print:inline">5. </span>Registration Details
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3 print:bg-white print:border print:border-gray-300 print-section">
                      <div className="print:hidden">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white rounded p-3">
                            <p className="text-sm font-medium text-gray-500">Type</p>
                            <p className="text-gray-900 capitalize">{eventData.registration_type}</p>
                          </div>
                          <div className="bg-white rounded p-3">
                            <p className="text-sm font-medium text-gray-500">Mode</p>
                            <p className="text-gray-900 capitalize">{eventData.registration_mode}</p>
                          </div>
                        </div>
                        {eventData.registration_fee && (
                          <div className="bg-white rounded p-3">
                            <p className="text-sm font-medium text-gray-500">Registration Fee</p>
                            <p className="text-gray-900 font-medium">₹{eventData.registration_fee}</p>
                            {eventData.fee_description && (
                              <p className="text-gray-600 text-sm mt-1">{eventData.fee_description}</p>
                            )}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white rounded p-3">
                            <p className="text-sm font-medium text-gray-500">Min Participants</p>
                            <p className="text-gray-900">{eventData.min_participants || 1}</p>
                          </div>
                          {eventData.max_participants && (
                            <div className="bg-white rounded p-3">
                              <p className="text-sm font-medium text-gray-500">Max Participants</p>
                              <p className="text-gray-900">{eventData.max_participants}</p>
                            </div>
                          )}
                        </div>
                        {eventData.registration_mode === 'team' && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white rounded p-3">
                              <p className="text-sm font-medium text-gray-500">Min Team Size</p>
                              <p className="text-gray-900">{eventData.team_size_min}</p>
                            </div>
                            <div className="bg-white rounded p-3">
                              <p className="text-sm font-medium text-gray-500">Max Team Size</p>
                              <p className="text-gray-900">{eventData.team_size_max}</p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="hidden print:block">
                        <div className="print-field">
                          <span className="print-field-label">Registration Type:</span>
                          <span className="print-field-value capitalize">{eventData.registration_type}</span>
                        </div>
                        <div className="print-field">
                          <span className="print-field-label">Registration Mode:</span>
                          <span className="print-field-value capitalize">{eventData.registration_mode}</span>
                        </div>
                        {eventData.registration_fee && (
                          <div className="print-field">
                            <span className="print-field-label">Registration Fee:</span>
                            <span className="print-field-value">₹{eventData.registration_fee}</span>
                          </div>
                        )}
                        {eventData.fee_description && (
                          <div className="print-field">
                            <span className="print-field-label">Fee Description:</span>
                            <span className="print-field-value">{eventData.fee_description}</span>
                          </div>
                        )}
                        <div className="print-field">
                          <span className="print-field-label">Minimum Participants:</span>
                          <span className="print-field-value">{eventData.min_participants || 1}</span>
                        </div>
                        {eventData.max_participants && (
                          <div className="print-field">
                            <span className="print-field-label">Maximum Participants:</span>
                            <span className="print-field-value">{eventData.max_participants}</span>
                          </div>
                        )}
                        {eventData.registration_mode === 'team' && (
                          <>
                            <div className="print-field">
                              <span className="print-field-label">Min Team Size:</span>
                              <span className="print-field-value">{eventData.team_size_min}</span>
                            </div>
                            <div className="print-field">
                              <span className="print-field-label">Max Team Size:</span>
                              <span className="print-field-value">{eventData.team_size_max}</span>
                            </div>
                            {eventData.allow_multiple_team_registrations && (
                              <div className="print-field">
                                <span className="print-field-label">Multiple Teams:</span>
                                <span className="print-field-value">✓ Allowed (with approval)</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Prerequisites & What to Bring */}
                  {(eventData.prerequisites || eventData.what_to_bring) && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-teal-600 print:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        <span className="hidden print:inline">6. </span>Requirements
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3 print:bg-white print:border print:border-gray-300 print-section">
                        {eventData.prerequisites && (
                          <div className="bg-white rounded p-3 print:bg-transparent print:p-0">
                            <div className="print:hidden">
                              <p className="text-sm font-medium text-gray-500 mb-2">Prerequisites</p>
                              <p className="text-gray-900 whitespace-pre-wrap">{eventData.prerequisites}</p>
                            </div>
                            <div className="hidden print:block">
                              <h4 className="font-bold text-sm mb-2">Prerequisites:</h4>
                              <p className="text-gray-900 whitespace-pre-wrap text-sm border border-gray-300 p-2">{eventData.prerequisites}</p>
                            </div>
                          </div>
                        )}
                        {eventData.what_to_bring && (
                          <div className="bg-white rounded p-3 print:bg-transparent print:p-0">
                            <div className="print:hidden">
                              <p className="text-sm font-medium text-gray-500 mb-2">What to Bring</p>
                              <p className="text-gray-900 whitespace-pre-wrap">{eventData.what_to_bring}</p>
                            </div>
                            <div className="hidden print:block">
                              <h4 className="font-bold text-sm mb-2 mt-3">What to Bring:</h4>
                              <p className="text-gray-900 whitespace-pre-wrap text-sm border border-gray-300 p-2">{eventData.what_to_bring}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Certificate and Assets Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-yellow-600 print:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      <span className="hidden print:inline">7. </span>Certificate & Resources
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3 print:bg-white print:border print:border-gray-300 print-section">
                      <div className="print:hidden">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                          </svg>
                          <span className="text-sm text-gray-900">{eventData.certificate_template?.name || 'No template selected'}</span>
                        </div>
                        {eventData.assets && eventData.assets.length > 0 && (
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                            </svg>
                            <span className="text-sm text-gray-900">{eventData.assets.length} asset file(s)</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="hidden print:block">
                        <div className="print-field">
                          <span className="print-field-label">Certificate Template:</span>
                          <span className="print-field-value">{eventData.certificate_template?.name || 'Not Selected'}</span>
                        </div>
                        <div className="print-field">
                          <span className="print-field-label">Certificate Status:</span>
                          <span className="print-field-value">{eventData.certificate_template ? '✓ Template Uploaded' : '⚠️ Template Required'}</span>
                        </div>
                        {eventData.assets && eventData.assets.length > 0 && (
                          <div className="print-field">
                            <span className="print-field-label">Additional Assets:</span>
                            <span className="print-field-value">{eventData.assets.length} file(s) uploaded</span>
                          </div>
                        )}
                        <div className="print-field">
                          <span className="print-field-label">Certificate Availability:</span>
                          <span className="print-field-value">Until {formatDate(eventData.certificate_end_date)} at {formatTime(eventData.certificate_end_time)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Event Creator Information (for Executive Admin) */}
                  {user?.role === 'executive_admin' && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-purple-600 print:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        </svg>
                        <span className="hidden print:inline">8. </span>Request Submitted By
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3 print:bg-white print:border print:border-gray-300 print-section">
                        <div className="print:hidden">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{eventData.event_created_by || user.fullname || user.username || 'Executive Admin'}</p>
                              <p className="text-xs text-green-600">Request Submitted</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="hidden print:block">
                          <div className="print-field">
                            <span className="print-field-label">Submitted By:</span>
                            <span className="print-field-value">{eventData.event_created_by || user.fullname || user.username || 'Executive Admin'}</span>
                          </div>
                          <div className="print-field">
                            <span className="print-field-label">Role/Position:</span>
                            <span className="print-field-value">Executive Admin</span>
                          </div>
                          <div className="print-field">
                            <span className="print-field-label">Submission Date:</span>
                            <span className="print-field-value">{new Date().toLocaleDateString('en-IN', { 
                              day: 'numeric', 
                              month: 'long', 
                              year: 'numeric' 
                            })}</span>
                          </div>
                          <div className="print-field">
                            <span className="print-field-label">Request Status:</span>
                            <span className="print-field-value">PENDING SUPER ADMIN APPROVAL</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Approval Section for Executive Admin */}
              {user?.role === 'executive_admin' && (
                <div className="hidden print:block print-section mt-8 p-4 border border-gray-300">
                  <h3 className="text-lg font-bold mb-4">APPROVAL SECTION</h3>
                  <div className="space-y-4">
                    <div className="print-field">
                      <span className="print-field-label">Administrative Review:</span>
                      <span className="print-field-value">☐ Approved ☐ Rejected ☐ Needs Modification</span>
                    </div>
                    <div className="print-field">
                      <span className="print-field-label">Budget Approval:</span>
                      <span className="print-field-value">☐ Approved ☐ Rejected ☐ Not Required</span>
                    </div>
                    <div className="print-field">
                      <span className="print-field-label">Venue Confirmation:</span>
                      <span className="print-field-value">☐ Confirmed ☐ Alternative Required</span>
                    </div>
                    <div className="print-field">
                      <span className="print-field-label">Final Approval:</span>
                      <span className="print-field-value">☐ Approved ☐ Rejected</span>
                    </div>
                  </div>
                  
                  <div className="print-signature mt-6">
                    <div className="signature-box">
                      <div style={{ minHeight: '40px' }}></div>
                      <div className="border-t border-gray-600 pt-2">
                        <p className="text-sm font-bold">Super Admin Signature</p>
                        <p className="text-xs">Date: _____________</p>
                      </div>
                    </div>
                    <div className="signature-box">
                      <div style={{ minHeight: '40px' }}></div>
                      <div className="border-t border-gray-600 pt-2">
                        <p className="text-sm font-bold">Academic Head Signature</p>
                        <p className="text-xs">Date: _____________</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 border border-gray-300">
                    <p className="text-sm font-bold mb-2">Comments/Modifications Required:</p>
                    <div style={{ minHeight: '60px', borderBottom: '1px solid #ccc', marginBottom: '5px' }}></div>
                    <div style={{ minHeight: '60px', borderBottom: '1px solid #ccc', marginBottom: '5px' }}></div>
                    <div style={{ minHeight: '60px', borderBottom: '1px solid #ccc' }}></div>
                  </div>
                </div>
              )}

              {/* Print Footer */}
              <div className="hidden print:block mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
                {user?.role === 'executive_admin' ? (
                  <div>
                    <p className="font-bold mb-2">FOR OFFICE USE ONLY</p>
                    <div className="flex justify-between text-xs">
                      <span>Request ID: EVT-{eventData.event_id}-{new Date().getFullYear()}</span>
                      <span>Generated: {new Date().toLocaleString('en-IN')}</span>
                      <span>Status: PENDING REVIEW</span>
                    </div>
                    <p className="mt-2 text-xs">This is an electronically generated document from CampusConnect Event Management System</p>
                  </div>
                ) : (
                  <p>Generated on {new Date().toLocaleDateString('en-IN')} • CampusConnect Event Management System</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Keep some basic print styles for fallback */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            .print\\:hidden { display: none !important; }
            .print\\:block { display: block !important; }
          }
        `
      }} />
    </AdminLayout>
  );
}

export default EventCreatedSuccess;
