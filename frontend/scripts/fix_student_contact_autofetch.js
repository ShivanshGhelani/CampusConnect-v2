/**
 * FIX SCRIPT: Student Event Registration Contact Auto-Fetch Issue
 * 
 * This script contains the fix for the contact number auto-fetch issue
 * in StudentEventRegistration.jsx that mirrors the fix applied to FacultyEventRegistration.jsx
 */

// The issue is in the useEffect dependency array and data initialization pattern
// Current problem: User data might not be fully loaded when form initializes

// SOLUTION: Add a separate useEffect specifically for user data updates
// This ensures that when user data becomes available, the form gets updated

const STUDENT_REGISTRATION_FIX = `
// Add this separate useEffect after the main data loading useEffect

// Separate useEffect for user data initialization (FIXES AUTO-FETCH ISSUE)
useEffect(() => {
  if (user && !dataLoadingRef.current) {
    console.log('=== STUDENT USER DATA INITIALIZATION ===');
    console.log('User object received:', user);
    
    // Utility function to resolve contact number from various field names
    const resolveContactNumber = (userData) => {
      const possibleFields = ['mobile_no', 'phone_number', 'contact_no', 'phone', 'mobile', 'contact'];
      for (const field of possibleFields) {
        if (userData[field] && userData[field].trim()) {
          return userData[field];
        }
      }
      return '';
    };

    // Get session storage data as fallback
    let sessionProfile = null;
    try {
      const sessionData = sessionStorage.getItem('complete_profile');
      if (sessionData) {
        sessionProfile = JSON.parse(sessionData);
        console.log('✅ Found session storage profile data');
      }
    } catch (e) {
      console.warn('Could not parse session profile data');
    }

    const sourceData = sessionProfile || user;
    const contactNumber = resolveContactNumber(sourceData);
    
    console.log('Contact number resolution:', {
      fromSession: sessionProfile?.mobile_no || sessionProfile?.phone_number,
      fromUser: user?.mobile_no || user?.phone_number,
      resolved: contactNumber
    });
    
    const transformGender = (gender) => {
      if (!gender) return '';
      return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
    };

    // Update form data with resolved contact number
    setFormData(prev => ({
      ...prev,
      full_name: sourceData.full_name || '',
      enrollment_no: sourceData.enrollment_no || sourceData.enrollment_number || '',
      email: sourceData.email || '',
      mobile_no: contactNumber, // FIXED: Use resolved contact number
      department: sourceData.department || '',
      semester: sourceData.semester || '',
      gender: transformGender(sourceData.gender) || '',
      date_of_birth: sourceData.date_of_birth ? formatDateForInput(sourceData.date_of_birth) : ''
    }));
    
    console.log('Updated student form data with resolved contact number');
  }
}, [user, user?.mobile_no, user?.phone_number, user?.full_name, user?.email]);
`;

// Export the fix for implementation
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    STUDENT_REGISTRATION_FIX,
    description: 'Fix for contact number auto-fetch issue in StudentEventRegistration.jsx',
    implementation: 'Add the provided useEffect hook after the main data loading useEffect'
  };
}

console.log('Student Registration Contact Auto-Fetch Fix Script Loaded');
console.log('Apply STUDENT_REGISTRATION_FIX to StudentEventRegistration.jsx');
