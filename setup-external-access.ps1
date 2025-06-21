# PowerShell script to help set up environment variables for external access
# Run this script when you want to access the app via --host or ngrok

Write-Host "CampusConnect External Access Setup" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# Get the current external IP or ngrok URL
Write-Host ""
Write-Host "Please choose how you're accessing the app:"
Write-Host "1. Local network (--host)"
Write-Host "2. ngrok tunnel"
Write-Host ""
$choice = Read-Host "Enter your choice (1 or 2)"

if ($choice -eq "1") {
    # Get local IP
    Write-Host ""
    Write-Host "Getting your local IP address..." -ForegroundColor Yellow
    
    try {
        $localIPs = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*"} | Select-Object -First 1
        $LOCAL_IP = $localIPs.IPAddress
        
        if (-not $LOCAL_IP) {
            $LOCAL_IP = "192.168.1.100"
            Write-Host "Could not detect IP automatically. Using default: $LOCAL_IP" -ForegroundColor Yellow
            Write-Host "Please update manually if this is incorrect." -ForegroundColor Yellow
        }
    } catch {
        $LOCAL_IP = "192.168.1.100"
        Write-Host "Could not detect IP automatically. Using default: $LOCAL_IP" -ForegroundColor Yellow
        Write-Host "Please update manually if this is incorrect." -ForegroundColor Yellow
    }
    
    $API_URL = "http://$LOCAL_IP:8000"
    Write-Host "Local IP detected: $LOCAL_IP" -ForegroundColor Green
    
} elseif ($choice -eq "2") {
    Write-Host ""
    $NGROK_URL = Read-Host "Enter your ngrok URL (e.g., https://abc123.ngrok-free.app)"
    $API_URL = $NGROK_URL
    
    # Validate ngrok URL format
    if ($NGROK_URL -notmatch "^https://.*\.ngrok.*\.app$" -and $NGROK_URL -notmatch "^https://.*\.ngrok\.io$") {
        Write-Host "Warning: URL format doesn't look like a typical ngrok URL" -ForegroundColor Yellow
        Write-Host "Expected format: https://something.ngrok-free.app or https://something.ngrok.io" -ForegroundColor Yellow
    }
} else {
    Write-Host "Invalid choice. Exiting." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Setting up environment variables..." -ForegroundColor Yellow

# Update the .env file
$frontendPath = Join-Path $PSScriptRoot "frontend"
$envPath = Join-Path $frontendPath ".env"

# Check if frontend directory exists
if (-not (Test-Path $frontendPath)) {
    Write-Host "Error: Frontend directory not found at $frontendPath" -ForegroundColor Red
    exit 1
}

# Change to frontend directory
Set-Location $frontendPath

# Backup existing .env
if (Test-Path $envPath) {
    $backupName = ".env.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Copy-Item $envPath $backupName
    Write-Host "Backed up existing .env file to $backupName" -ForegroundColor Green
}

# Read current .env content
$envContent = @()
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath
}

# Update or add the API URL
$apiLineFound = $false
$newEnvContent = @()

foreach ($line in $envContent) {
    if ($line -match "^VITE_API_BASE_URL=") {
        $newEnvContent += "VITE_API_BASE_URL=$API_URL"
        $apiLineFound = $true
        Write-Host "Updated VITE_API_BASE_URL in .env" -ForegroundColor Green
    } else {
        $newEnvContent += $line
    }
}

# Add new line if not found
if (-not $apiLineFound) {
    $newEnvContent += ""
    $newEnvContent += "VITE_API_BASE_URL=$API_URL"
    Write-Host "Added VITE_API_BASE_URL to .env" -ForegroundColor Green
}

# Write updated content back to .env
$newEnvContent | Out-File -FilePath $envPath -Encoding UTF8

Write-Host ""
Write-Host "Configuration complete!" -ForegroundColor Green
Write-Host "API Base URL set to: $API_URL" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart your frontend development server"
Write-Host "2. Make sure your backend is running and accessible"

if ($choice -eq "1") {
    Write-Host "3. Start frontend with: npm run dev -- --host"
    Write-Host "4. Access the app at: http://$LOCAL_IP:5173"
} elseif ($choice -eq "2") {
    Write-Host "3. Make sure ngrok is also tunneling your backend (port 8000)"
    Write-Host "4. Access the app through your ngrok URL"
}

Write-Host ""
Write-Host "If you still have login issues, check:" -ForegroundColor Yellow
Write-Host "- Backend CORS configuration includes your URL"
Write-Host "- Both frontend and backend are accessible from external network"
Write-Host "- Firewall settings allow the connections"

Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
