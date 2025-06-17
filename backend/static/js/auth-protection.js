/**
 * Authentication Protection Module
 * Handles browser back button behavior and session management for authenticated users
 */

class AuthProtection {
    constructor() {
        this.authStatusEndpoint = null; // Will be set based on user type
        this.checkInterval = 30000; // Check every 30 seconds
        this.initialized = false;
    }

    /**
     * Initialize authentication protection
     * @param {string} userType - 'student' or 'admin'
     * @param {string} currentPage - Current page identifier
     */
    init(userType, currentPage) {
        if (this.initialized) return;
        
        this.userType = userType;
        this.currentPage = currentPage;
        this.initialized = true;
          // Set the correct auth status endpoint based on user type
        if (userType === 'admin') {
            this.authStatusEndpoint = '/auth/api/status';
        } else {
            this.authStatusEndpoint = '/client/api/auth/status';
        }
        
        this.setupHistoryProtection();
        this.setupEventListeners();
        this.startPeriodicCheck();
        
        console.log(`Auth protection initialized for ${userType} on ${currentPage}`);
    }

    /**
     * Set up history state protection
     */
    setupHistoryProtection() {
        const state = {
            page: this.currentPage,
            userType: this.userType,
            timestamp: Date.now(),
            protected: true
        };
        
        // Replace current history state
        history.replaceState(state, '', window.location.href);
        
        // Listen for popstate events (back/forward navigation)
        window.addEventListener('popstate', (event) => {
            this.handleBackNavigation(event);
        });
    }

    /**
     * Handle back button navigation
     */
    async handleBackNavigation(event) {
        const state = event.state;
        
        // Check authentication status first
        const authStatus = await this.checkAuthStatus();
        
        if (!authStatus.authenticated) {
            // User is not authenticated, redirect to login
            this.redirectToLogin();
            return;
        }

        // Handle based on user type and current location
        if (this.userType === 'student') {
            this.handleStudentBackNavigation(state, authStatus);
        } else if (this.userType === 'admin') {
            this.handleAdminBackNavigation(state, authStatus);
        }
    }

    /**
     * Handle student back navigation
     */
    handleStudentBackNavigation(state, authStatus) {
        if (this.currentPage === 'dashboard') {
            // Student on dashboard - redirect to home/events page on back
            window.location.replace('/client/events');
        } else if (this.currentPage === 'login') {
            // Student on login page but authenticated - redirect to dashboard
            window.location.replace('/client/dashboard');
        } else {
            // Other pages - normal navigation
            return;
        }
    }

    /**
     * Handle admin back navigation with warning system
     */
    handleAdminBackNavigation(state, authStatus) {
        if (this.currentPage === 'dashboard') {
            const visits = (state && state.visits) || 0;
            
            if (visits >= 2) {
                // Show warning after multiple back attempts
                this.showAdminBackWarning();
            } else {
                // Stay on dashboard, update visit count
                const newState = {
                    ...state,
                    visits: visits + 1,
                    timestamp: Date.now()
                };
                history.replaceState(newState, '', window.location.href);
            }
        } else if (this.currentPage === 'login') {
            // Admin on login page but authenticated - redirect to appropriate dashboard
            window.location.replace(authStatus.redirect_url);
        }
    }

    /**
     * Show admin back navigation warning
     */
    showAdminBackWarning() {
        // Remove existing warning if present
        const existingWarning = document.getElementById('auth-back-warning');
        if (existingWarning) {
            existingWarning.remove();
        }

        const warningHtml = `
            <div id="auth-back-warning" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg p-8 max-w-md mx-4 shadow-xl">
                    <div class="text-center">
                        <div class="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
                            <i class="fas fa-exclamation-triangle text-yellow-600 text-2xl"></i>
                        </div>
                        <h3 class="text-xl font-semibold text-gray-900 mb-4">Navigation Notice</h3>
                        <p class="text-gray-600 mb-6">
                            You're trying to navigate away from the admin dashboard. 
                            What would you like to do?
                        </p>
                        <div class="flex flex-col sm:flex-row gap-3 justify-center">
                            <button onclick="authProtection.stayOnDashboard()" 
                                    class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                Stay Here
                            </button>
                            <button onclick="authProtection.checkSession()" 
                                    class="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
                                Check Session
                            </button>
                            <button onclick="authProtection.logout()" 
                                    class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', warningHtml);
        
        // Auto-close after 15 seconds
        setTimeout(() => {
            this.closeWarning();
        }, 15000);
    }

    /**
     * Close the warning modal
     */
    closeWarning() {
        const warning = document.getElementById('auth-back-warning');
        if (warning) {
            warning.remove();
        }
    }

    /**
     * Stay on current dashboard
     */
    stayOnDashboard() {
        this.closeWarning();
        // Reset history state
        history.replaceState({
            page: this.currentPage,
            userType: this.userType,
            timestamp: Date.now(),
            visits: 0,
            protected: true
        }, '', window.location.href);
    }

    /**
     * Trigger session check
     */
    async checkSession() {
        this.closeWarning();
        const authStatus = await this.checkAuthStatus();
        this.showSessionStatus(authStatus.authenticated);
    }

    /**
     * Logout user
     */
    logout() {
        if (this.userType === 'admin') {
            window.location.href = '/auth/logout';
        } else {
            window.location.href = '/client/logout';
        }
    }

    /**
     * Check authentication status
     */
    async checkAuthStatus() {
        try {
            const response = await fetch(this.authStatusEndpoint, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return data;
            } else {
                return { authenticated: false };
            }
        } catch (error) {
            console.log('Auth status check failed:', error);
            return { authenticated: false };
        }
    }    /**
     * Redirect to appropriate login page
     */
    redirectToLogin() {
        if (this.userType === 'admin') {
            window.location.replace('/admin/auth/login');
        } else {
            window.location.replace('/client/login');
        }
    }

    /**
     * Show session status notification
     */
    showSessionStatus(isValid) {
        const statusHtml = `
            <div id="session-status" class="fixed top-4 right-4 z-50 ${isValid ? 'bg-green-500' : 'bg-yellow-500'} text-white px-4 py-2 rounded-lg shadow-lg">
                <i class="fas ${isValid ? 'fa-check-circle' : 'fa-exclamation-triangle'} mr-2"></i>
                ${isValid ? 'Session Valid' : 'Session Check Failed'}
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', statusHtml);
        
        setTimeout(() => {
            const status = document.getElementById('session-status');
            if (status) {
                status.remove();
            }
        }, 3000);
    }

    /**
     * Set up event listeners for page visibility and focus
     */
    setupEventListeners() {
        // Page visibility change
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                setTimeout(() => {
                    this.verifyAuthentication();
                }, 100);
            }
        });

        // Window focus
        window.addEventListener('focus', () => {
            setTimeout(() => {
                this.verifyAuthentication();
            }, 100);
        });

        // Page show (back/forward cache)
        window.addEventListener('pageshow', (event) => {
            if (event.persisted) {
                this.verifyAuthentication();
            }
        });
    }

    /**
     * Verify authentication and handle appropriately
     */
    async verifyAuthentication() {
        const authStatus = await this.checkAuthStatus();
        
        if (!authStatus.authenticated) {
            // User is not authenticated
            if (this.currentPage !== 'login') {
                this.redirectToLogin();
            }
        } else {
            // User is authenticated
            if (this.currentPage === 'login') {
                // On login page but authenticated - redirect
                window.location.replace(authStatus.redirect_url);
            }
        }
    }

    /**
     * Start periodic authentication check
     */
    startPeriodicCheck() {
        setInterval(() => {
            this.verifyAuthentication();
        }, this.checkInterval);
    }
}

// Create global instance
const authProtection = new AuthProtection();

// Make it available globally
window.authProtection = authProtection;
