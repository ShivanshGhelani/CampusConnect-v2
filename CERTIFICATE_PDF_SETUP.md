# Certificate PDF Generation Setup

## Backend Setup

### 1. Install Playwright
```powershell
cd backend
pip install playwright
playwright install chromium
```

### 2. Restart Backend Server
```powershell
# Stop current server (Ctrl+C)
# Then restart
python main.py
```

## How It Works

### Mobile Devices
- Certificate HTML is sent to backend server
- Server uses Playwright (headless Chromium) to render HTML
- Google Fonts load perfectly (no CORS issues)
- PDF is generated server-side
- PDF is downloaded to mobile device

### Desktop Devices  
- Uses browser's native print functionality
- Opens in new window with "Print to PDF" button
- Perfect quality with all fonts preserved

## API Endpoint

**POST** `/api/v1/certificates/generate-pdf`

**Request Body:**
```json
{
  "html": "<html>...</html>",
  "filename": "certificate.pdf",
  "width": 1052,
  "height": 744
}
```

**Response:**
- PDF file (application/pdf)
- Downloads automatically

## Benefits

✅ **Perfect Font Rendering** - Google Fonts work flawlessly  
✅ **No CORS Issues** - Server-side rendering bypasses browser restrictions  
✅ **Works on All Devices** - Mobile, tablet, desktop  
✅ **Exact Positioning** - No shifts or alignment issues  
✅ **High Quality** - Vector fonts, crisp text  

## Troubleshooting

If PDF generation fails:
1. Check that Playwright is installed: `playwright --version`
2. Verify chromium browser is installed: `playwright install chromium`
3. Check backend logs for errors
4. Ensure backend server is running on correct port
