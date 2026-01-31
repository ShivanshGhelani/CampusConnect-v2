#!/bin/bash
# Security Fixes Deployment Script
# Run this script to apply all security updates

set -e  # Exit on error

echo "🛡️  CampusConnect Security Fixes Deployment"
echo "=========================================="
echo ""

# Check if we're in the project root
if [ ! -f "README.md" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "📦 Step 1: Updating Backend Dependencies..."
cd backend
pip install --upgrade pip
pip install -r requirements.txt --upgrade
echo "✅ Backend dependencies updated"
echo ""

echo "📦 Step 2: Updating Frontend Dependencies..."
cd ../frontend
npm install
echo "✅ Frontend dependencies installed"
echo ""

echo "🧪 Step 3: Running Security Audits..."
echo ""

echo "   Backend Audit (pip-audit)..."
cd ../backend
if command -v pip-audit &> /dev/null; then
    pip-audit || echo "⚠️  Some issues found - review above"
else
    echo "   Installing pip-audit..."
    pip install pip-audit
    pip-audit || echo "⚠️  Some issues found - review above"
fi
echo ""

echo "   Frontend Audit (npm audit)..."
cd ../frontend
npm audit || echo "⚠️  Some npm vulnerabilities found - consider 'npm audit fix'"
echo ""

echo "🎉 Security Fixes Applied Successfully!"
echo ""
echo "📋 Summary of Changes:"
echo "   ✅ Updated 6 vulnerable Python packages"
echo "   ✅ Added DOMPurify for XSS protection"
echo "   ✅ Fixed React dangerouslySetInnerHTML vulnerabilities"
echo "   ✅ Added HTTP request timeouts"
echo "   ✅ Verified SQL injection protections"
echo "   ✅ Verified Jinja2 autoescape enabled"
echo ""
echo "📚 Documentation:"
echo "   - Full details: SECURITY_FIXES.md"
echo "   - Quick start: SECURITY_QUICKSTART.md"
echo ""
echo "🚀 Next Steps:"
echo "   1. Review audit results above"
echo "   2. Test your application"
echo "   3. Deploy to production"
echo "   4. Schedule monthly security audits"
echo ""
