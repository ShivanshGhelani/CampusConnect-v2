# CampusConnect Email Configuration Setup
# Run this PowerShell script to set up your Gmail SMTP configuration

Write-Host "=== CampusConnect Email Configuration Setup ===" -ForegroundColor Cyan
Write-Host ""

# Get user input for Gmail configuration
$smtpUsername = Read-Host "Enter your Gmail address"
$smtpPassword = Read-Host "Enter your Gmail App Password (not regular password)" -AsSecureString
$fromName = Read-Host "Enter sender name (default: CampusConnect Support)"

if ([string]::IsNullOrEmpty($fromName)) {
    $fromName = "CampusConnect Support"
}

# Convert secure string to plain text for environment variable
$smtpPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($smtpPassword))

Write-Host ""
Write-Host "Setting up environment variables..." -ForegroundColor Yellow

# Set environment variables for current session
$env:SMTP_SERVER = "smtp.gmail.com"
$env:SMTP_PORT = "587"
$env:SMTP_USERNAME = $smtpUsername
$env:SMTP_PASSWORD = $smtpPasswordPlain
$env:FROM_EMAIL = $smtpUsername
$env:FROM_NAME = $fromName

Write-Host "✅ Environment variables set for current session!" -ForegroundColor Green
Write-Host ""
Write-Host "Email Configuration:" -ForegroundColor Cyan
Write-Host "SMTP Server: smtp.gmail.com" -ForegroundColor White
Write-Host "SMTP Port: 587" -ForegroundColor White
Write-Host "Username: $smtpUsername" -ForegroundColor White
Write-Host "From Name: $fromName" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Important Notes:" -ForegroundColor Yellow
Write-Host "1. Make sure you're using a Gmail App Password, not your regular password" -ForegroundColor White
Write-Host "2. Enable 2-Factor Authentication on your Gmail account" -ForegroundColor White
Write-Host "3. Generate App Password from: https://myaccount.google.com/apppasswords" -ForegroundColor White
Write-Host "4. These environment variables are only set for this session" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Your CampusConnect email service is now configured!" -ForegroundColor Green
Write-Host "🔄 Restart your FastAPI server to apply the changes" -ForegroundColor Cyan
