# Email Service Debugging Guide for Render Deployment

## 🚀 What Changed

The email service has been enhanced with:

1. **Robust Port Fallback**: Automatically falls back from port 587 to 465 if port 587 is blocked
2. **Better Error Logging**: Detailed error messages with emoji indicators
3. **Test Endpoint**: New `/api/v1/email/test-send` endpoint for production testing
4. **Enhanced Error Handling**: Catches more connection error types for reliable fallback

## 🔍 How to Debug in Production (Render)

### 1. Check Email Service Health
```bash
curl https://your-render-app.onrender.com/api/v1/email/health
```

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "status": "healthy",
    "connection_ok": true,
    "connection_time": 0.234,
    "circuit_breaker": {
      "state": "CLOSED",
      "failure_count": 0
    }
  }
}
```

### 2. Send Test Email
```bash
curl -X POST "https://your-render-app.onrender.com/api/v1/email/test-send?to_email=your-email@gmail.com"
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Test email sent successfully to your-email@gmail.com",
  "timestamp": "2026-01-24T12:00:00"
}
```

### 3. Check Email Statistics
```bash
curl https://your-render-app.onrender.com/api/v1/email/stats
```

### 4. Reset Circuit Breaker (if emails failing)
```bash
curl -X POST https://your-render-app.onrender.com/api/v1/email/circuit-breaker/reset
```

## 📝 Log Messages to Look For

### ✅ Successful Connection (Port 587)
```
🔄 Attempting SMTP connection to smtp.gmail.com:587 (STARTTLS)
✅ Created SMTP connection (STARTTLS) to smtp.gmail.com:587
```

### ✅ Successful Fallback (Port 465)
```
🔄 Attempting SMTP connection to smtp.gmail.com:587 (STARTTLS)
❌ Port 587 failed (OSError: [Errno 111] Connection refused), falling back to SSL port 465
🔄 Attempting SMTP_SSL connection to smtp.gmail.com:465 (fallback)
✅ Created SMTP_SSL connection (fallback) to smtp.gmail.com:465
```

### ❌ Connection Failure
```
❌ SMTP Connection failed - Server unreachable: [Errno 111] Connection refused
   SMTP Server: smtp.gmail.com:587
```

### ❌ Authentication Failure
```
❌ SMTP Authentication failed - Check EMAIL_USER and EMAIL_PASSWORD
   SMTP Server: smtp.gmail.com:587
   Email User: campus...@gmail.com
```

## 🛠️ Common Issues & Solutions

### Issue 1: Port 587 Blocked on Render
**Symptoms:** Logs show port 587 connection timeout or refusal
**Solution:** The service automatically falls back to port 465 (SSL)
**Action:** No action needed - fallback is automatic

### Issue 2: Circuit Breaker is OPEN
**Symptoms:** All emails fail with "Circuit breaker is OPEN"
**Solution:** Reset the circuit breaker
```bash
curl -X POST https://your-render-app.onrender.com/api/v1/email/circuit-breaker/reset
```

### Issue 3: Authentication Failure
**Symptoms:** "SMTP Authentication failed"
**Solution:** Check environment variables on Render:
- `EMAIL_USER`: Your Gmail address
- `EMAIL_PASSWORD`: App password (not regular password!)
- `SMTP_SERVER`: smtp.gmail.com
- `SMTP_PORT`: 587

### Issue 4: Gmail App Password
Gmail requires **App Passwords** for less secure apps:
1. Go to Google Account → Security
2. Enable 2-Step Verification
3. Generate App Password (Mail category)
4. Use this app password as `EMAIL_PASSWORD`

## 🚢 Deployment Checklist

Before deploying to Render:
- [ ] Gmail App Password generated
- [ ] Environment variables set on Render:
  - `SMTP_SERVER=smtp.gmail.com`
  - `SMTP_PORT=587`
  - `EMAIL_USER=your-email@gmail.com`
  - `EMAIL_PASSWORD=your-app-password`
  - `FROM_EMAIL=your-email@gmail.com`
- [ ] Push code changes to GitHub
- [ ] Render auto-deploys from GitHub
- [ ] Test email service: `/api/v1/email/test-send?to_email=test@gmail.com`

## 📊 Monitoring in Production

### Watch Render Logs
```bash
# In Render dashboard, go to: Logs → Live
```

Look for:
- Startup logs showing email service initialization
- Connection success/fallback messages
- Any authentication or connection errors

### Email Service Endpoints
- **Health Check**: `GET /api/v1/email/health`
- **Statistics**: `GET /api/v1/email/stats`
- **Test Send**: `POST /api/v1/email/test-send?to_email=test@gmail.com`
- **Reset Circuit**: `POST /api/v1/email/circuit-breaker/reset`

## 🎯 Testing Workflow

1. **Local Testing** (Development):
   ```bash
   # Start server
   uvicorn main:app --reload
   
   # Test email
   curl -X POST "http://localhost:8000/api/v1/email/test-send?to_email=your-email@gmail.com"
   ```

2. **Production Testing** (Render):
   ```bash
   # Check health
   curl https://your-app.onrender.com/api/v1/email/health
   
   # Send test email
   curl -X POST "https://your-app.onrender.com/api/v1/email/test-send?to_email=your-email@gmail.com"
   ```

3. **Monitor Logs**:
   - Watch for emoji indicators (✅ = success, ❌ = error, 🔄 = trying)
   - Check circuit breaker state
   - Verify connection method (STARTTLS vs SSL)

## 🔥 Emergency Actions

If emails completely stop working:

1. **Check Circuit Breaker**:
   ```bash
   curl https://your-app.onrender.com/api/v1/email/stats
   ```

2. **Reset Circuit Breaker**:
   ```bash
   curl -X POST https://your-app.onrender.com/api/v1/email/circuit-breaker/reset
   ```

3. **Force New Deployment** (resets all connections):
   - Push any small change to GitHub
   - Render will auto-deploy and restart

4. **Check Environment Variables**:
   - Render Dashboard → Environment → Environment Variables
   - Verify all email settings are correct

## 💡 Pro Tips

1. **Port 465 is more reliable** on cloud platforms like Render
2. **App Passwords expire** - regenerate if emails suddenly stop
3. **Circuit breaker opens after 5 failures** - monitor and reset if needed
4. **Test endpoint is your friend** - use it liberally in production
5. **Watch the emoji logs** - they tell you exactly what's happening!

## 📞 Support

If issues persist:
1. Check Render logs for detailed error messages
2. Test with `/api/v1/email/test-send` endpoint
3. Verify Gmail App Password is still valid
4. Check if Gmail has flagged the account for suspicious activity
