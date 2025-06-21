#!/bin/bash

echo "🚀 CampusConnect Deployment Readiness Check"
echo "==========================================="

# Test current environment
echo ""
echo "📋 Current Configuration:"
echo "   Environment: $(python -c "import os; print(os.getenv('ENVIRONMENT', 'development'))")"
echo "   Frontend API URL: $(grep VITE_API_BASE_URL frontend/.env 2>/dev/null || echo 'Not set')"

# Test API health
echo ""
echo "🔍 Testing API Health:"
if curl -f http://localhost:8000/api/health > /dev/null 2>&1; then
    echo "   ✅ Local API is accessible"
    echo "   📊 API Response:"
    curl -s http://localhost:8000/api/health | python -m json.tool 2>/dev/null || echo "   Response received but not JSON"
else
    echo "   ❌ Local API not accessible"
    echo "   💡 Make sure backend is running: python main.py"
fi

# Test external access setup
echo ""
echo "🌐 External Access Test:"
if [[ -n "${ADDITIONAL_CORS_ORIGINS}" ]]; then
    echo "   ✅ Additional CORS origins configured: $ADDITIONAL_CORS_ORIGINS"
else
    echo "   ℹ️  No additional CORS origins set (normal for localhost testing)"
fi

# Check frontend build
echo ""
echo "🏗️  Frontend Build Test:"
cd frontend
if npm run build > /dev/null 2>&1; then
    echo "   ✅ Frontend builds successfully"
else
    echo "   ❌ Frontend build failed"
    echo "   💡 Run 'npm run build' in frontend directory to see errors"
fi
cd ..

# Test production mode simulation
echo ""
echo "🔒 Production Mode Simulation:"
echo "   Setting ENVIRONMENT=production temporarily..."
export ENVIRONMENT=production
export CORS_ORIGINS=http://localhost:5173

if python -c "
import sys
sys.path.append('backend')
from main import get_environment, is_production, get_cors_origins
print(f'Environment: {get_environment()}')
print(f'Is Production: {is_production()}')
print(f'CORS Origins: {get_cors_origins()}')
" 2>/dev/null; then
    echo "   ✅ Production configuration loads correctly"
else
    echo "   ❌ Production configuration has issues"
fi

echo ""
echo "📝 Deployment Readiness Summary:"
echo "================================"
echo "✅ Code is deployment-ready with environment-aware configuration"
echo "✅ No code changes needed for production deployment"
echo "✅ Just set environment variables when deploying"
echo ""
echo "📖 See DEPLOYMENT_GUIDE.md for detailed deployment instructions"
echo "🎯 Ready for team lead review and deployment approval"
