#!/bin/bash

# Pre-deployment testing script
echo "CampusConnect Deployment Readiness Check"
echo "========================================"

# Check frontend environment
echo ""
echo "1. Checking Frontend Configuration..."
cd frontend

if [ -f ".env.production" ]; then
    echo "✅ .env.production found"
    if grep -q "VITE_API_BASE_URL" .env.production; then
        echo "✅ VITE_API_BASE_URL configured"
        echo "   API URL: $(grep VITE_API_BASE_URL .env.production | cut -d'=' -f2)"
    else
        echo "❌ VITE_API_BASE_URL not found in .env.production"
    fi
else
    echo "❌ .env.production not found"
    echo "   Create .env.production with VITE_API_BASE_URL=https://your-backend-domain.com"
fi

# Check backend environment
echo ""
echo "2. Checking Backend Configuration..."
cd ../backend

if [ -f ".env" ] || [ -n "$CORS_ORIGINS" ]; then
    echo "✅ Environment configuration available"
else
    echo "❌ Backend environment not configured"
    echo "   Set CORS_ORIGINS, ENVIRONMENT, SESSION_SECRET_KEY"
fi

# Check API endpoints
echo ""
echo "3. Testing API Health Check..."
if [ -n "$VITE_API_BASE_URL" ]; then
    API_URL="$VITE_API_BASE_URL"
elif [ -f "../frontend/.env.production" ]; then
    API_URL=$(grep VITE_API_BASE_URL ../frontend/.env.production | cut -d'=' -f2)
else
    API_URL="http://localhost:8000"
fi

echo "   Testing: $API_URL/api/health"
if curl -f "$API_URL/api/health" > /dev/null 2>&1; then
    echo "✅ API health check passed"
else
    echo "❌ API health check failed"
    echo "   Make sure backend is running and accessible"
fi

# Check CORS headers
echo ""
echo "4. Testing CORS Configuration..."
echo "   This requires manual testing with your frontend domain"

echo ""
echo "Deployment Checklist:"
echo "====================="
echo "□ Frontend .env.production configured with correct API URL"
echo "□ Backend CORS_ORIGINS includes your frontend domain"
echo "□ SESSION_SECRET_KEY set for production"
echo "□ Database connection string configured"
echo "□ Both services can reach each other"
echo "□ HTTPS enabled for production"
echo ""
echo "Test login after deployment to verify everything works!"
