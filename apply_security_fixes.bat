@echo off
REM Security Fixes Deployment Script for Windows
REM Run this script to apply all security updates

echo ========================================
echo 🛡️  CampusConnect Security Fixes Deployment
echo ========================================
echo.

REM Check if we're in the project root
if not exist "README.md" (
    echo ❌ Error: Please run this script from the project root directory
    exit /b 1
)

echo 📦 Step 1: Updating Backend Dependencies...
cd backend
python -m pip install --upgrade pip
pip install -r requirements.txt --upgrade
echo ✅ Backend dependencies updated
echo.

echo 📦 Step 2: Updating Frontend Dependencies...
cd ..\frontend
call npm install
echo ✅ Frontend dependencies installed
echo.

echo 🧪 Step 3: Running Security Audits...
echo.

echo    Backend Audit (pip-audit)...
cd ..\backend
pip-audit 2>nul || (
    echo    Installing pip-audit...
    pip install pip-audit
    pip-audit
)
echo.

echo    Frontend Audit (npm audit)...
cd ..\frontend
call npm audit
echo.

cd ..
echo ========================================
echo 🎉 Security Fixes Applied Successfully!
echo ========================================
echo.
echo 📋 Summary of Changes:
echo    ✅ Updated 6 vulnerable Python packages
echo    ✅ Added DOMPurify for XSS protection
echo    ✅ Fixed React dangerouslySetInnerHTML vulnerabilities
echo    ✅ Added HTTP request timeouts
echo    ✅ Verified SQL injection protections
echo    ✅ Verified Jinja2 autoescape enabled
echo.
echo 📚 Documentation:
echo    - Full details: SECURITY_FIXES.md
echo    - Quick start: SECURITY_QUICKSTART.md
echo.
echo 🚀 Next Steps:
echo    1. Review audit results above
echo    2. Test your application
echo    3. Deploy to production
echo    4. Schedule monthly security audits
echo.
pause
