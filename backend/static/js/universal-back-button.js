/**
 * Universal Back Button System for Client Pages
 * Tracks navigation history and provides contextual back functionality
 * Excludes home/index page from showing back button
 */

class UniversalBackButton {
    constructor() {
        this.history = [];
        this.currentPath = window.location.pathname;
        this.homePages = ['/', '/client/', '/client'];
        this.init();
    }

    init() {
        // Load saved history from sessionStorage
        this.loadHistory();
        
        // Track current page visit
        this.trackPageVisit();
        
        // Set up back button if not on home page
        if (!this.isHomePage()) {
            this.setupBackButton();
        }
        
        // Listen for navigation events
        this.setupNavigationListeners();
    }

    isHomePage() {
        return this.homePages.includes(this.currentPath) || 
               this.currentPath.endsWith('/client') || 
               this.currentPath.endsWith('/client/');
    }

    loadHistory() {
        try {
            const savedHistory = sessionStorage.getItem('ucg_navigation_history');
            if (savedHistory) {
                this.history = JSON.parse(savedHistory);
            }
        } catch (error) {
            console.warn('Could not load navigation history:', error);
            this.history = [];
        }
    }

    saveHistory() {
        try {
            // Keep only last 10 entries to prevent storage bloat
            const trimmedHistory = this.history.slice(-10);
            sessionStorage.setItem('ucg_navigation_history', JSON.stringify(trimmedHistory));
        } catch (error) {
            console.warn('Could not save navigation history:', error);
        }
    }

    trackPageVisit() {
        const now = new Date().toISOString();
        const pageTitle = document.title;
        
        // Don't track the same page twice in a row
        const lastEntry = this.history[this.history.length - 1];
        if (!lastEntry || lastEntry.path !== this.currentPath) {
            this.history.push({
                path: this.currentPath,
                title: pageTitle,
                timestamp: now,
                referrer: document.referrer
            });
            this.saveHistory();
        }
    }

    getPreviousPage() {
        // Look for the most recent page that's not the current page
        for (let i = this.history.length - 2; i >= 0; i--) {
            const entry = this.history[i];
            if (entry.path !== this.currentPath && !this.isHomePage(entry.path)) {
                return entry;
            }
        }
        
        // If no previous page found, check document.referrer
        if (document.referrer && !document.referrer.includes(window.location.origin + this.currentPath)) {
            try {
                const referrerUrl = new URL(document.referrer);
                // Check if referrer is from same origin
                if (referrerUrl.origin === window.location.origin) {
                    return {
                        path: referrerUrl.pathname,
                        title: 'Previous Page',
                        external: false
                    };
                }
            } catch (error) {
                console.warn('Could not parse referrer URL:', error);
            }
        }
        
        // Default to home page
        return {
            path: '/client/',
            title: 'Home',
            external: false
        };
    }    setupBackButton() {
        // Always create a simple, visible back button
        this.createBackButton();
    }    createBackButton() {
        console.log('Universal Back Button: Creating back button');
        
        // Remove any existing back button first
        const existingButton = document.getElementById('universal-back-button-container');
        if (existingButton) {
            existingButton.remove();
        }        // Create a clean floating back button in top-left area
        const backButtonContainer = document.createElement('div');
        backButtonContainer.id = 'universal-back-button-container';
        
        // Position it in the top-left area where navigation is expected
        backButtonContainer.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 1000;
        `;
        
        backButtonContainer.innerHTML = `
            <button 
                id="universal-back-button" 
                class="inline-flex items-center space-x-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg px-3 py-2 shadow-md hover:shadow-lg transition-all duration-200"
                title="Go back to previous page"
            >
                <i class="fas fa-arrow-left text-sm"></i>
                <span class="text-sm font-medium hidden sm:inline">Back</span>
            </button>
        `;

        // Add to body
        document.body.appendChild(backButtonContainer);
        console.log('Universal Back Button: Added as top-left navigation button');
        
        // Add click handler
        const backButton = document.getElementById('universal-back-button');
        if (backButton) {
            backButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.goBack();
            });
            console.log('Universal Back Button: Click handler added');
        } else {
            console.error('Universal Back Button: Could not find button element');
        }
    }

    truncateTitle(title) {
        return title.length > 15 ? title.substring(0, 15) + '...' : title;
    }

    goBack() {
        const previousPage = this.getPreviousPage();
        
        if (previousPage && previousPage.path) {
            // Use browser's back if the previous page is in browser history
            if (window.history.length > 1 && !previousPage.external) {
                window.history.back();
            } else {
                // Navigate directly to the previous page
                window.location.href = previousPage.path;
            }
        } else {
            // Fallback to home page
            window.location.href = '/client/';
        }
    }

    setupNavigationListeners() {
        // Listen for popstate events (browser back/forward)
        window.addEventListener('popstate', () => {
            this.currentPath = window.location.pathname;
            this.trackPageVisit();
        });

        // Listen for page visibility changes to update tracking
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.currentPath = window.location.pathname;
                this.trackPageVisit();
            }
        });
    }

    // Public method to manually add a page to history (for AJAX navigation)
    addToHistory(path, title) {
        this.history.push({
            path: path,
            title: title,
            timestamp: new Date().toISOString(),
            referrer: this.currentPath
        });
        this.saveHistory();
    }

    // Public method to clear history (for logout, etc.)
    clearHistory() {
        this.history = [];
        sessionStorage.removeItem('ucg_navigation_history');
    }
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Universal Back Button: DOM loaded, current path:', window.location.pathname);
    
    // Only initialize on client pages
    if (window.location.pathname.startsWith('/client')) {
        console.log('Universal Back Button: Initializing for client page');
        window.ucgBackButton = new UniversalBackButton();
    } else {
        console.log('Universal Back Button: Not a client page, skipping initialization');
    }
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UniversalBackButton;
}
