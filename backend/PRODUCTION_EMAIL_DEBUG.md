# Production Email Debugging Guide

## What to Look For in Render Logs

After deploying the updated code, when you test forgot password, you should see these log messages in sequence:

### Expected Flow (Success):

```
🔐 Initiating password reset for faculty EMP000 with email user@example.com
✅ Faculty found: John Doe
✅ Reset token generated: abcd1234...
📧 Preparing to send reset email to user@example.com
Attempting to send email to user@example.com: 🔐 Password Reset Request
Attempting SMTP connection to smtp.gmail.com:587 (STARTTLS)

EITHER:
✅ Created SMTP connection (STARTTLS) to smtp.gmail.com:587
Email sent successfully to user@example.com in 1.73s

OR (if port 587 blocked):
❌ Port 587 failed (OSError: Network is unreachable), falling back to SSL port 465
Attempting SMTP_SSL connection to smtp.gmail.com:465
✅ Created SMTP_SSL connection (fallback) to smtp.gmail.com:465
Email sent successfully to user@example.com in 2.15s

✅ Password reset email sent successfully to user@example.com
```

### Expected Flow (User Not Found):

```
🔐 Initiating password reset for faculty WRONG123 with email wrong@example.com
⚠️ No faculty found with employee_id=WRONG123 and email=wrong@example.com
```

### Problem Scenarios:

#### Scenario 1: Email Config Missing
```
❌ Failed to create SMTP connection: authentication failed
```
**Fix:** Check Render environment variables (EMAIL_USER, EMAIL_PASSWORD)

#### Scenario 2: Circuit Breaker Open
```
Circuit breaker prevented email to user@example.com
Circuit breaker state: OPEN
```
**Fix:** Wait 5 minutes for auto-reset or restart service

#### Scenario 3: Template Missing
```
Failed to send template email password_reset to user@example.com
```
**Fix:** Ensure `templates/email/password_reset.html` exists in deployment

## How to Test in Production

1. **Deploy updated code** to Render

2. **Test forgot password**:
   ```bash
   curl -X POST https://campusconnect-v2.onrender.com/api/v1/auth/forgot-password/faculty \
     -H "Content-Type: application/json" \
     -d '{"employee_id":"EMP000","email":"your-email@example.com"}'
   ```

3. **Check Render logs** immediately - you should see the emoji log messages:
   - 🔐 Initiating password reset
   - ✅ Faculty found
   - ✅ Reset token generated
   - 📧 Preparing to send email
   - ✅ Email sent successfully

4. **Check API response**:
   ```json
   {
     "message": "Password reset link has been sent...",
     "email_sent": true
   }
   ```
   
   If `email_sent: false`:
   ```json
   {
     "message": "Token generated, but email delivery failed...",
     "email_sent": false,
     "token": "xyz123..."  // For support debugging
   }
   ```

## Environment Variables Checklist (Render Dashboard)

Make sure these are set in Render:

```
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=campusconnectldrp@gmail.com
EMAIL_PASSWORD=vhmrdwekxmehrziu
FROM_EMAIL=campusconnectldrp@gmail.com
FRONTEND_URL=https://campusconnectldrp.vercel.app/
```

## Common Issues & Solutions

### Issue: No logs at all
**Cause:** Request not reaching the endpoint
**Fix:** Check route is correct: `/api/v1/auth/forgot-password/faculty`

### Issue: Logs stop after "Preparing to send email"
**Cause:** Email service hanging or timing out
**Fix:** Check circuit breaker state, restart service

### Issue: "Port 587 failed" but no fallback
**Cause:** Exception not caught properly
**Fix:** Already fixed in new code - should auto-fallback to 465

### Issue: "Email sent successfully" but no email received
**Cause:** Email in spam, or Gmail blocking
**Fix:** 
1. Check spam folder
2. Verify Gmail App Password is correct
3. Check Gmail account isn't locked
4. Try different email address to test

## Quick Health Check

Run this in Render shell (if available):
```bash
curl http://localhost:8000/api/v1/email/health
```

Should return:
```json
{
  "status": "success",
  "data": {
    "status": "healthy",
    "connection_ok": true
  }
}
```
