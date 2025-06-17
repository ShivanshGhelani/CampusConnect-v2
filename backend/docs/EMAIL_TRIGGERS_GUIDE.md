# Email System Integration Guide

## Overview

This guide explains all the email triggers implemented in the CampusConnect system and when/how they are sent.

## Email Triggers Summary

### 1. Welcome Email (Account Creation)
**When**: Automatically sent when a student creates a new account
**Template**: `welcome_account_created.html`
**Trigger Location**: `routes/client/client.py` - `student_register` POST endpoint

```python
# Triggered after successful account creation
await email_service.send_welcome_email(
    student_email=email,
    student_name=full_name,
    enrollment_no=enrollment_no,
    department=department,
    semester=semester,
    created_at=created_at,
    platform_url=platform_url
)
```

### 2. Individual Event Registration Confirmation
**When**: Automatically sent when a student registers for an individual event
**Template**: `registration_confirmation.html`
**Trigger Location**: `routes/client/event_registration.py` - `save_individual_registration`

```python
# Triggered after successful individual registration
await email_service.send_registration_confirmation(
    student_email=registration.email,
    student_name=registration.full_name,
    event_title=event.get("event_name"),
    event_date=event.get("start_datetime"),
    event_venue=event.get("venue"),
    registration_id=registration_id
)
```

### 3. Team Registration Confirmation
**When**: Automatically sent to all team members when a team registers for an event
**Template**: `team_registration_confirmation.html`
**Trigger Location**: `routes/client/event_registration.py` - `save_team_registration`

```python
# Triggered after successful team registration
await email_service.send_team_registration_confirmation(
    team_members=team_members_list,
    event_title=event_title,
    event_date=event_date,
    event_venue=event_venue,
    team_name=team_name,
    team_registration_id=team_registration_id
)
```

### 4. Attendance Confirmation
**When**: Automatically sent when admin marks a student's attendance
**Template**: `attendance_confirmation.html`
**Trigger Location**: `routes/admin/attendance.py` - `mark_attendance_submit`

```python
# Triggered after attendance is marked
await email_service.send_attendance_confirmation(
    student_email=student_email,
    student_name=student_name,
    event_title=event_name,
    attendance_date=attendance_date,
    event_venue=venue
)
```

### 5. Feedback Confirmation
**When**: Automatically sent when a student submits event feedback
**Template**: `feedback_confirmation.html`
**Trigger Location**: `routes/client/feedback.py` - `submit_feedback`

```python
# Triggered after feedback submission
await email_service.send_feedback_confirmation(
    student_email=student_email,
    student_name=student_name,
    event_title=event_title,
    event_date=event_date
)
```

### 6. Event Reminders
**When**: Manually triggered via script for upcoming events
**Template**: `event_reminder.html`
**Trigger Location**: `scripts/send_event_reminders.py`

```python
# Send reminders for events happening tomorrow
python scripts/send_event_reminders.py --days_before 1

# Send reminder for specific event
python scripts/send_event_reminders.py --event_id EVENT123

# Send custom reminder
python scripts/send_event_reminders.py --event_id EVENT123 --custom_message "Important update"
```

## Email Templates Location

All email templates are stored in: `templates/email/`

### Available Templates:
- `base_email.html` - Base template for all emails
- `welcome_account_created.html` - Welcome email for new accounts
- `registration_confirmation.html` - Individual registration confirmation
- `team_registration_confirmation.html` - Team registration confirmation
- `attendance_confirmation.html` - Attendance marked confirmation
- `feedback_confirmation.html` - Feedback submission confirmation
- `event_reminder.html` - Event reminder emails
- `certificate_notification.html` - Certificate available notification
- `payment_confirmation.html` - Payment confirmation (existing)
- `new_event_notification.html` - New event announcement (existing)

## Usage Examples

### 1. Student Registration Flow
```
Student fills registration form → Account created → Welcome email sent automatically
```

### 2. Event Registration Flow

**Individual Events:**
```
Student registers → Registration confirmed → Confirmation email sent automatically
```

**Team Events:**
```
Team leader registers with team members → All team members get email with team details
```

### 3. Event Attendance Flow
```
Admin marks attendance → Attendance confirmation email sent automatically
```

### 4. Feedback Flow
```
Student submits feedback → Feedback confirmation email sent automatically
```

### 5. Event Reminder Flow
```
Admin runs reminder script → All registered students get reminder emails
```

## Setting Up Automated Reminders

### Daily Reminder Script (Recommended)
Add to cron job or Windows Task Scheduler:

```bash
# Send daily reminders for events happening tomorrow
0 9 * * * cd /path/to/project && python scripts/send_event_reminders.py --days_before 1

# Send weekly reminders for events happening in 7 days
0 9 * * 1 cd /path/to/project && python scripts/send_event_reminders.py --days_before 7
```

### Manual Reminder Commands

```bash
# Remind students about events tomorrow
python scripts/send_event_reminders.py --days_before 1

# Remind students about events in 3 days
python scripts/send_event_reminders.py --days_before 3

# Send reminder for specific event
python scripts/send_event_reminders.py --event_id "TECH001"

# Send urgent reminder for specific event
python scripts/send_event_reminders.py --event_id "TECH001" --custom_message "Urgent update"
```

## Email Configuration

Email settings are configured in `config/settings.py`:

```python
# Required SMTP settings
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
EMAIL_USER = "your-email@domain.com"
EMAIL_PASSWORD = "your-app-password"
FROM_EMAIL = "noreply@campusconnect.edu"
```

## Testing Email System

Run the test script to verify email functionality:

```bash
python test_email_service_enhanced.py
```

## Monitoring Email Delivery

Check the application logs for email delivery status:

```bash
# View recent email logs
tail -f logs/app.log | grep -i email

# Check for failed emails
grep -i "failed.*email" logs/app.log
```

## Email Content Customization

### Customizing Templates
1. Edit templates in `templates/email/`
2. Use Jinja2 syntax for dynamic content
3. Extend `base_email.html` for consistent styling

### Adding New Email Types
1. Create new template in `templates/email/`
2. Add method to `EmailService` class
3. Add trigger in appropriate route/script

### Example: Adding Event Cancellation Email

**Step 1**: Create template `templates/email/event_cancelled.html`
```html
{% extends "email/base_email.html" %}
{% block main_content %}
<h2>Event Cancelled: {{ event_title }}</h2>
<p>We regret to inform you that the event has been cancelled...</p>
{% endblock %}
```

**Step 2**: Add method to `EmailService`
```python
async def send_event_cancellation(self, student_email: str, student_name: str, event_title: str, reason: str = ""):
    subject = f"Event Cancelled - {event_title}"
    html_content = self.render_template('event_cancelled.html', 
                                      student_name=student_name, 
                                      event_title=event_title, 
                                      reason=reason)
    return await self.send_email_async(student_email, subject, html_content)
```

**Step 3**: Add trigger in admin route
```python
# In event cancellation route
await email_service.send_event_cancellation(
    student_email=student.email,
    student_name=student.name,
    event_title=event.title,
    reason="Unforeseen circumstances"
)
```

## Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check SMTP credentials in settings
   - Verify network connectivity
   - Check email provider limits

2. **Template rendering errors**
   - Verify template syntax
   - Check variable names in template context
   - Ensure all required variables are provided

3. **High email volume issues**
   - Use bulk email methods for multiple recipients
   - Consider rate limiting for large batches
   - Monitor SMTP provider limits

### Debug Mode
Enable debug logging to see detailed email processing:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Best Practices

1. **Always handle email failures gracefully** - Don't let email failures break the main functionality
2. **Use bulk methods for multiple emails** - More efficient for large numbers of recipients
3. **Test email templates thoroughly** - Verify with different email clients
4. **Monitor email delivery rates** - Keep track of successful vs failed emails
5. **Respect email provider limits** - Don't exceed sending quotas
6. **Keep email content relevant** - Only send necessary emails to avoid spam classifications

## Security Considerations

1. **Use app passwords** - Don't use regular passwords for SMTP
2. **Enable 2FA** - On email accounts used for sending
3. **Monitor for abuse** - Watch for unusual email patterns
4. **Validate email addresses** - Ensure they're legitimate before sending
5. **Use TLS/SSL** - Always encrypt email connections
