// Clear all browser storage and cache
// Run this in browser console (F12) on both frontend and backend pages

// Clear localStorage
localStorage.clear();


// Clear sessionStorage  
sessionStorage.clear();


// Clear cookies for this domain
document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});


// Force page reload without cache
window.location.reload(true);

