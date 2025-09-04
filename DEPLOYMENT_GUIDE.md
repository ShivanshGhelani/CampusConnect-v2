# CampusConnect Deployment Guide

## Current Deployment Architecture

### Frontend (Vercel)
- **URL**: `https://campusconnectldrp.vercel.app/`
- **Platform**: Vercel
- **Repository**: Auto-deployed from GitHub repository

### Backend (Local + ngrok)
- **Local URL**: `http://localhost:8000`
- **Public URL**: `https://jaguar-giving-awfully.ngrok-free.app`
- **Platform**: Local development server exposed via ngrok

## Configuration Files

### Frontend Environment Variables (Vercel)

The following environment variables should be configured in the Vercel dashboard:

```env
VITE_SUPABASE_URL=https://gygschntnaivagnbwmgw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5Z3NjaG50bmFpdmFnbmJ3bWd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0MDQ2MTMsImV4cCI6MjA2NTk4MDYxM30.UKLTge4DV5MT-MahETeN6WUwJdN8O4vBiACv1mZUCLQ
VITE_API_BASE_URL=https://jaguar-giving-awfully.ngrok-free.app
VITE_FRONTEND_URL=https://campusconnectldrp.vercel.app
```

### Backend Environment Variables (Local)

Create/update `.env.production` in the backend directory:

```env
ENVIRONMENT=production
DEBUG=false
FRONTEND_URL=https://campusconnectldrp.vercel.app
BACKEND_URL=https://jaguar-giving-awfully.ngrok-free.app
ADDITIONAL_CORS_ORIGINS=https://campusconnectldrp.vercel.app,https://campusconnect-self.vercel.app
SESSION_SECRET_KEY=production-session-secret-key-change-this-in-production
```

## Deployment Steps

### 1. Start Backend with Production Configuration

```powershell
# Navigate to backend directory
cd s:\Projects\ClgCerti\CampusConnect\backend

# Set environment to production
$env:ENVIRONMENT = "production"

# Start the backend server
python main.py
```

### 2. Expose Backend via ngrok

```powershell
# In a new terminal, start ngrok
ngrok http 8000
```

**Important**: Update the ngrok URL in both frontend and backend configurations if it changes.

### 3. Deploy Frontend to Vercel

The frontend auto-deploys when changes are pushed to the GitHub repository. Ensure the environment variables are set correctly in the Vercel dashboard.

## CORS Configuration

The backend is configured to allow the following origins:

- `http://localhost:3000` (local development)
- `https://campusconnectldrp.vercel.app` (production frontend)
- `https://campusconnect-self.vercel.app` (backup frontend URL)
- `https://*.vercel.app` (Vercel preview deployments)
- `https://jaguar-giving-awfully.ngrok-free.app` (ngrok backend)

## Session Management

For cross-origin session management (Vercel → ngrok):

- Sessions use `same_site="none"` and `https_only=True`
- Required for cookies to work across different domains
- Session secret key should be set in production environment

## API Routes

### Authentication Routes
- Student Login: `POST /api/v1/auth/student/login`
- Admin Login: `POST /api/v1/auth/admin/login`
- Faculty Login: `POST /api/v1/auth/faculty/login`

### Legacy Routes (Redirects)
- `/auth/login` → Redirects to frontend login
- `/admin` → Redirects to frontend admin panel
- `/organizer` → Redirects to frontend organizer panel

## Troubleshooting

### 404 Errors on `/auth/login`

**Issue**: Frontend tries to make API calls to `/auth/login` routes that don't exist as API endpoints.

**Solution**: 
1. The `/auth/login` route redirects to the frontend login page
2. API authentication should use `/api/v1/auth/*` endpoints
3. Frontend API interceptor handles 401 redirects properly

### CORS Issues

**Issue**: Cross-origin requests blocked.

**Solution**:
1. Verify ngrok URL is added to CORS origins in backend
2. Check Vercel environment variables are set correctly
3. Ensure `withCredentials: true` is set in frontend API calls

### Session Cookie Issues

**Issue**: Authentication not persisting across requests.

**Solution**:
1. Verify `same_site="none"` and `https_only=True` in session middleware
2. Check that frontend sets `withCredentials: true`
3. Ensure session secret key is consistent

## Monitoring

### Health Check Endpoints
- Backend Health: `GET https://jaguar-giving-awfully.ngrok-free.app/api/health`
- Session Debug: `GET https://jaguar-giving-awfully.ngrok-free.app/api/debug/session`

### Logs
- Backend logs: Check terminal running the FastAPI server
- Frontend logs: Check browser developer console
- ngrok logs: Check ngrok terminal for request/response logs

## Security Notes

1. **Session Secret**: Change the default session secret key in production
2. **CORS**: Only allow necessary origins, remove wildcard patterns for production
3. **HTTPS**: All production traffic should use HTTPS (handled by Vercel and ngrok)
4. **Environment Variables**: Never commit sensitive environment variables to repository

## Future Improvements

1. **Backend Hosting**: Consider deploying backend to a cloud platform (Railway, Render, etc.)
2. **Database**: Ensure MongoDB is properly secured and accessible from cloud backend
3. **CDN**: Consider using CDN for static assets
4. **SSL**: Get proper SSL certificates for custom domains
