# CampusConnect Deployment Guide

## Current Status: Development-Ready ✅

The codebase is now **deployment-ready** with environment-aware configuration. No code changes needed for production deployment - just set environment variables.

## Development vs Production Behavior

### Development Mode (Current)
- **Environment**: `ENVIRONMENT=development` (default)
- **CORS**: Flexible - allows localhost, ngrok, --host access
- **Sessions**: HTTP cookies, flexible same-site policy
- **API URL**: Auto-detects from frontend environment

### Production Mode (When deployed)
- **Environment**: `ENVIRONMENT=production`
- **CORS**: Strict - only specified domains allowed
- **Sessions**: HTTPS cookies, secure same-site policy
- **API URL**: Uses `VITE_API_BASE_URL` environment variable

## When Ready to Deploy

### 1. Frontend Environment Variables
Set in your deployment platform (Vercel, Netlify, etc.):

```env
VITE_API_BASE_URL=https://your-backend-domain.com
VITE_SUPABASE_URL=https://gygschntnaivagnbwmgw.supabase.co
VITE_SUPABASE_ANON_KEY=your-key
VITE_APPWRITE_PROJECT_ID=campus-connect-shivansh
VITE_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
```

### 2. Backend Environment Variables
Set in your deployment platform (Railway, Render, etc.):

```env
# Environment
ENVIRONMENT=production

# CORS Configuration
CORS_ORIGINS=https://yourapp.vercel.app,https://your-custom-domain.com

# Session Security
SESSION_SECRET_KEY=your-super-secret-production-key
COOKIE_DOMAIN=.yourdomain.com

# Database
MONGODB_URL=your-production-mongodb-url

# Email (if configured)
SMTP_SERVER=your-smtp-server
SMTP_USERNAME=your-email
SMTP_PASSWORD=your-email-password
```

### 3. Deployment Platforms

#### Option A: Separate Deployments (Recommended)
- **Frontend**: Vercel, Netlify, or Cloudflare Pages
- **Backend**: Railway, Render, DigitalOcean, AWS, or Heroku
- **Database**: MongoDB Atlas

#### Option B: Same Platform
- **Both**: Railway, Render, or similar full-stack platforms

## Pre-Deployment Testing

### Test External Access (Current Development)
1. Start backend: `python main.py`
2. Start frontend: `npm run dev -- --host`
3. Test login from external device/network
4. Verify API calls work properly

### Test Production Configuration Locally
```bash
# Set production environment
export ENVIRONMENT=production
export CORS_ORIGINS=http://localhost:5173
export SESSION_SECRET_KEY=test-secret

# Start backend
python main.py

# Verify it shows "Production mode" in logs
```

## Security Checklist for Production

- [ ] Change `SESSION_SECRET_KEY` to a strong random string
- [ ] Set `CORS_ORIGINS` to only include your actual domains
- [ ] Use HTTPS for all production URLs
- [ ] Set secure database credentials
- [ ] Enable proper logging and monitoring
- [ ] Test authentication flow thoroughly

## Common Issues & Solutions

### Issue: CORS errors in production
**Solution**: Ensure `CORS_ORIGINS` includes your exact frontend domain

### Issue: Login fails with different domains
**Solution**: Check `COOKIE_DOMAIN` setting and HTTPS configuration

### Issue: API calls fail
**Solution**: Verify `VITE_API_BASE_URL` points to correct backend

## Team Lead Review Checklist

- [ ] Authentication works locally with --host/ngrok
- [ ] Environment configuration is complete
- [ ] Security settings are production-ready
- [ ] Database connection is configured
- [ ] Frontend build process works
- [ ] All features tested and working

## Quick Deployment Commands

### Vercel (Frontend)
```bash
cd frontend
npx vercel --prod
```

### Railway (Backend)
```bash
cd backend
# Connect to Railway and deploy
railway login
railway link
railway up
```

---

**Note**: The current code automatically handles development vs production configuration. When `ENVIRONMENT=production` is set, it switches to production mode with strict security settings.
