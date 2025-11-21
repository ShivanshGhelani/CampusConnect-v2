# Email Service Deployment Guide

## Issue: SMTP Port 587 Blocked on Render Free Tier

### Problem
Render's free tier blocks outbound connections on port 587 (STARTTLS), which prevents Gmail SMTP from working:
```
[Errno 101] Network is unreachable
```

### Solution Implemented
The email service now automatically falls back to SSL port 465 when port 587 is blocked.

### How It Works
1. **Primary**: Tries port 587 with STARTTLS (standard Gmail SMTP)
2. **Fallback**: If port 587 fails, automatically switches to port 465 with SSL
3. **Logs**: Shows which method succeeded for debugging

### Gmail App Password Setup (Required)
Since you're using Gmail SMTP, you need an **App Password** (not your regular Gmail password):

1. Go to Google Account: https://myaccount.google.com/
2. Security → 2-Step Verification (enable if not already)
3. Security → App passwords
4. Generate app password for "Mail"
5. Copy the 16-character password
6. Set it as `EMAIL_PASSWORD` in your environment variables

### Environment Variables
```env
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
FROM_EMAIL=your-email@gmail.com
```

### Testing
```bash
# Test forgot password endpoint
curl -X POST https://campusconnect-v2.onrender.com/api/v1/auth/forgot-password/student \
  -H "Content-Type: application/json" \
  -d '{"email": "student@example.com"}'
```

### Logs to Watch
**Success (Port 587)**:
```
Created SMTP connection (STARTTLS) to smtp.gmail.com:587
Email sent successfully to user@example.com
```

**Success (Port 465 Fallback)**:
```
Port 587 failed (Network is unreachable), falling back to SSL port 465
Created SMTP_SSL connection (fallback) to smtp.gmail.com:465
Email sent successfully to user@example.com
```

### Alternative Solutions

#### Option 1: Use SendGrid (Recommended for Production)
- Free tier: 100 emails/day
- No port blocking issues
- Better deliverability
- Setup: https://sendgrid.com/

#### Option 2: Use Render Paid Tier
- Upgrade to paid plan ($7/month)
- No port restrictions
- Better for production

#### Option 3: Use Mailgun
- Free tier: 5,000 emails/month (first 3 months)
- HTTP API (no SMTP port issues)
- Setup: https://www.mailgun.com/

### Current Status
✅ Automatic fallback to port 465 implemented
✅ Works on Render free tier with Gmail
✅ No code changes needed when deploying
✅ Graceful degradation with proper error logging

### Development vs Production
- **Local Development**: Uses port 587 (STARTTLS) - faster
- **Render Free Tier**: Auto-falls back to port 465 (SSL)
- **Render Paid Tier**: Can use either port

### Troubleshooting

**Email still not sending after deployment?**
1. Check Gmail App Password is correct
2. Check environment variables are set in Render dashboard
3. Check logs for "Created SMTP_SSL connection (fallback)"
4. Verify Gmail account has 2FA enabled
5. Check circuit breaker isn't open (max 5 failures)

**Circuit breaker opened?**
Wait 5 minutes for automatic reset, or restart the service.
