# Email Flow Testing Guide

## 🧪 Test Scripts Overview

Two comprehensive test scripts have been created to test all email functionality:

### 1. Complete Email Flow Test (`test_complete_email_flow.py`)
- **Purpose**: Tests with real database data
- **Requires**: Actual event and student data in database
- **Best for**: Production-like testing

### 2. Simple Email Flow Test (`test_email_flow_simple.py`)
- **Purpose**: Tests with mock data (no database required)
- **Flexible**: Can use real or mock data
- **Best for**: Quick testing and development

## 🚀 How to Run the Tests

### Option 1: Test with Real Database Data

```bash
# Test with specific event and student
python test_complete_email_flow.py --event_id "TECH001" --enrollment_no "22BEIT30043"

# With verbose logging
python test_complete_email_flow.py --event_id "TECH001" --enrollment_no "22BEIT30043" --verbose
```

### Option 2: Test with Mock Data (Recommended for Testing)

```bash
# Use mock data (no database required)
python test_email_flow_simple.py --mock

# Test with specific IDs but mock email data
python test_email_flow_simple.py --event_id "TEST001" --enrollment_no "22BEIT30043"

# Specify your email address for testing
python test_email_flow_simple.py --mock --email "your.email@example.com"
```

## 📧 What Gets Tested

Both scripts test all 5 email types in sequence with 10-second gaps:

1. **✅ Welcome Email** (Account Creation)
   - Subject: "Welcome to CampusConnect - [Student Name]!"
   - Content: Account details, platform features, getting started tips

2. **✅ Registration Confirmation** (Event Registration)
   - Subject: "Registration Confirmed - [Event Name]"
   - Content: Event details, registration ID, venue information

3. **✅ Attendance Confirmation** (Attendance Marked)
   - Subject: "Attendance Confirmed - [Event Name]"
   - Content: Attendance confirmation, certificate eligibility

4. **✅ Event Reminder** (Pre-Event Reminder)
   - Subject: "Reminder: [Event Name] - Upcoming"
   - Content: Event starting soon, preparation reminders

5. **✅ Feedback Confirmation** (Feedback Submitted)
   - Subject: "Thank you for your feedback - [Event Name]"
   - Content: Feedback received acknowledgment

## ⚙️ Configuration Required

### 1. Email Settings
Make sure your SMTP settings are configured in `config/settings.py`:

```python
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
EMAIL_USER = "your-email@gmail.com"
EMAIL_PASSWORD = "your-app-password"
FROM_EMAIL = "noreply@campusconnect.edu"
```

### 2. Test Email Address
**Important**: Edit the test scripts to use your email address:

In `test_email_flow_simple.py`, line ~85:
```python
"email": "your.email@example.com",  # Replace with your email
```

In `test_complete_email_flow.py`, you can pass your email as the student email.

## 📋 Test Output Example

```
================================================================================
🧪 EMAIL SYSTEM TEST - ALL EMAIL TYPES
================================================================================
📋 Using mock test data...
Event: Test Technical Workshop
Student: Test Student (your.email@example.com)
Test Started: 2025-06-13 14:30:00
================================================================================

📧 1/5 TESTING WELCOME EMAIL (ACCOUNT CREATION)...
------------------------------------------------------------
✅ Welcome email sent successfully to your.email@example.com
   Subject: Welcome to CampusConnect - Test Student!
   Content: Account creation welcome with platform overview

⏳ Waiting 10 seconds before Registration Confirmation...
   10 seconds remaining...
   9 seconds remaining...
   ...

📧 2/5 TESTING REGISTRATION CONFIRMATION...
------------------------------------------------------------
✅ Registration confirmation sent successfully!
   Subject: Registration Confirmed - Test Technical Workshop
   Registration ID: REG20250613043

... (continues for all 5 emails) ...

================================================================================
📊 TEST RESULTS SUMMARY
================================================================================
1. Welcome Email                ✅ SUCCESS
2. Registration Confirmation    ✅ SUCCESS
3. Attendance Confirmation     ✅ SUCCESS
4. Event Reminder              ✅ SUCCESS
5. Feedback Confirmation       ✅ SUCCESS
--------------------------------------------------------------------------------
Overall Success Rate: 5/5 (100.0%)
🎉 ALL EMAILS SENT SUCCESSFULLY!
Check your email inbox to see all the different email types!
================================================================================
```

## 🎯 Quick Test Commands

### For Development/Testing (Recommended)
```bash
python test_email_flow_simple.py --mock
```

### For Real Data Testing
```bash
python test_complete_email_flow.py --event_id "YOUR_EVENT_ID" --enrollment_no "YOUR_STUDENT_ID"
```

### Test Connection Only
```bash
python test_email_service_enhanced.py
```

## 🔧 Troubleshooting

### Common Issues:

1. **SMTP Authentication Error**
   - Check email credentials in settings
   - Use app password for Gmail (not regular password)
   - Enable 2FA and generate app password

2. **Connection Timeout**
   - Check network connectivity
   - Verify SMTP server and port settings
   - Check firewall settings

3. **Template Rendering Error**
   - Ensure all email templates exist in `templates/email/`
   - Check template syntax for errors

4. **No Emails Received**
   - Check spam/junk folder
   - Verify email address in test script
   - Check email service logs

### Debug Mode:
Add `--verbose` flag to see detailed logging:
```bash
python test_complete_email_flow.py --event_id "TEST001" --enrollment_no "22BEIT30043" --verbose
```

## 📝 Customizing Tests

### Change Test Email Address:
Edit the email address in the test scripts to your own email address to receive the test emails.

### Add Custom Event Data:
Modify the `_get_mock_data()` function in `test_email_flow_simple.py` to use your custom event details.

### Test Specific Email Types:
You can modify the scripts to test only specific email types by commenting out unwanted tests in the `email_tests` list.

## ✅ Success Indicators

- **All emails sent**: You should receive 5 different emails in your inbox
- **10-second gaps**: Each email arrives 10 seconds after the previous
- **Different templates**: Each email has distinct styling and content
- **Connection reuse**: Logs show connection pooling in action
- **No errors**: Test completes with 100% success rate

After running the test successfully, you'll have verified that all email triggers are working correctly! 🎉
