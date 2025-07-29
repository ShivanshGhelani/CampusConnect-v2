# Frontend Cache Clearing Instructions

## Quick Steps to Clear All Caches:

### 1. Clear Browser Cache (Recommended)
1. Open Developer Tools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

OR

1. Press Ctrl+Shift+R (Chrome/Edge)
2. Press Ctrl+F5 (All browsers)

### 2. Clear Browser Storage
Open Developer Tools (F12) and run this in Console:

```javascript
// Clear all storage
localStorage.clear();
sessionStorage.clear();
console.log('✅ Storage cleared');

// Clear cookies
document.cookie.split(";").forEach(c => {
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
console.log('✅ Cookies cleared');

// Force reload
location.reload(true);
```

### 3. Backend Server Restart
If you have access to the backend terminal:
```powershell
# Stop the backend server (Ctrl+C in backend terminal)
# Then restart with:
python main.py
```

### 4. Complete Browser Reset (Nuclear option)
1. Go to Settings → Privacy and Security
2. Clear Browsing Data
3. Select "All time" 
4. Check all boxes
5. Clear data

## Issues This Fixes:
- ✅ Old event cards still showing
- ✅ Cancelled registrations appearing
- ✅ Stale team member data
- ✅ Incorrect registration status
- ✅ Cached API responses

## Verification:
After clearing cache:
1. Login to student account
2. Go to profile/dashboard
3. Event cards should reflect current database state
4. No cancelled registrations should appear
