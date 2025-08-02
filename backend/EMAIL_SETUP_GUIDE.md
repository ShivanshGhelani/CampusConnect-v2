# 📧 Email Configuration Guide for CampusConnect

## Quick Setup Instructions

### Step 1: Configure Gmail SMTP (Recommended)

1. **Run the setup script**:
   ```powershell
   cd s:\Projects\ClgCerti\CampusConnect\backend
   .\setup_email.ps1
   ```

2. **When prompted, enter**:
   - Your Gmail address (e.g., `yourname@gmail.com`)
   - Your Gmail App Password (NOT your regular password)

### Step 2: Get Gmail App Password

1. **Enable 2-Factor Authentication** on your Gmail account (required)
2. **Generate App Password**:
   - Go to [Google Account Settings](https://myaccount.google.com/)
   - Security → 2-Step Verification → App passwords
   - Select "Mail" as the app
   - Copy the 16-character password (format: `xxxx xxxx xxxx xxxx`)

### Step 3: Test Email Configuration

1. **Restart FastAPI server** (required after config changes)
2. **Test forgot password flow**:
   - Go to `http://127.0.0.1:3000/auth/forgot-password`
   - Enter valid student/faculty credentials
   - Check your email for reset link

## Manual Configuration (Alternative)

If the PowerShell script doesn't work, create `.env` file manually:

```bash
# Email Configuration
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_16_character_app_password
FROM_EMAIL=your_email@gmail.com

# Development mode (set to false for production)
EMAIL_DEVELOPMENT_MODE=false
```

## Email Service Features

### ✅ Implemented Email Types
- **Password Reset**: Professional HTML template with security notices
- **Registration Confirmation**: Event registration confirmations
- **Payment Confirmation**: Payment processing confirmations
- **Attendance Confirmation**: Event attendance confirmations
- **Certificate Notification**: Certificate availability notifications
- **Event Reminders**: Upcoming event reminders
- **Welcome Email**: Account creation confirmations

### 🔐 Security Features
- **Token Expiration**: Password reset tokens expire in 10 minutes
- **Secure Token Generation**: Using Python `secrets` module
- **User Enumeration Prevention**: Same response for valid/invalid users
- **Automatic Cleanup**: Expired tokens cleaned up automatically
- **Professional Templates**: CampusConnect branding with security warnings

## Troubleshooting

### Common Issues

1. **Emails not being sent**:
   - Check if Gmail App Password is correct (16 characters)
   - Verify 2FA is enabled on Gmail account
   - Restart FastAPI server after configuration changes

2. **SMTP Authentication Failed**:
   - Double-check Gmail credentials
   - Ensure using App Password, not regular password
   - Verify Gmail account has 2FA enabled

3. **Development Mode**:
   - If `EMAIL_DEVELOPMENT_MODE=true`, emails are logged instead of sent
   - Check `backend/logs/app.log` for email content
   - Set to `false` for actual email delivery

### Email Service Status Check

Run this in PowerShell to check service status:
```powershell
python -c "from services.email.service import EmailService; es = EmailService(); print('Email service initialized successfully')"
```

### Test Email Configuration

```powershell
# Test if SMTP settings work
python -c "
import smtplib, ssl
from config.settings import get_settings
settings = get_settings()
context = ssl.create_default_context()
server = smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT)
server.starttls(context=context)
server.login(settings.EMAIL_USER, settings.EMAIL_PASSWORD)
print('SMTP configuration working!')
server.quit()
"
```

## Current Email Template Preview

The password reset email includes:
- **Professional CampusConnect branding** with gradient header
- **Security warnings** about token expiration (10 minutes)
- **Clear call-to-action** button for password reset
- **Alternative text link** if button doesn't work
- **Responsive design** for mobile devices
- **Security notices** about unauthorized requests

## Production Considerations

### Email Delivery Optimization
- **Connection Pooling**: SMTP connections are reused for efficiency
- **Async Processing**: All emails sent asynchronously
- **Retry Logic**: Automatic retry with exponential backoff
- **Error Handling**: Comprehensive error logging and handling

### Security Best Practices
- **Token Storage**: Redis with automatic expiration
- **Secure Headers**: SMTP over TLS encryption
- **User Privacy**: No sensitive data in email content
- **Audit Logging**: All email activities logged

## Next Steps

1. **Configure Gmail SMTP** using the setup script
2. **Test password reset flow** end-to-end
3. **Verify email delivery** and template rendering
4. **Monitor logs** for any delivery issues

---

**Need Help?** Check the FastAPI logs at `backend/logs/app.log` for detailed email service information.
