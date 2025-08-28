/**
 * DEBUG SCRIPT: Contact Number Auto-Fetch Issue Analysis
 * 
 * Issue: Contact number doesn't auto-fetch on first visit but works after refresh
 * Affects: FacultyEventRegistration.jsx and StudentEventRegistration.jsx
 * 
 * Root Cause Analysis:
 * 1. AuthContext user data might not be fully loaded when component mounts
 * 2. Session storage profile data might not be available immediately
 * 3. useEffect dependencies might not trigger re-initialization when user data updates
 * 4. Race condition between authentication and data loading
 */

// Issue Description:
const ISSUE_ANALYSIS = {
  problem: "Contact number auto-fetch fails on first page visit",
  
  affectedFiles: [
    "FacultyEventRegistration.jsx",
    "StudentEventRegistration.jsx"
  ],
  
  symptoms: [
    "Contact field is empty on first visit",
    "Contact field populates after page refresh",
    "Other user fields (name, email, etc.) load correctly"
  ],
  
  rootCauses: [
    {
      cause: "AuthContext User Data Loading Race Condition",
      description: "User object might not be fully populated when useEffect runs",
      evidence: "StudentEventRegistration uses sessionStorage as fallback, FacultyEventRegistration only uses user object"
    },
    {
      cause: "Field Name Inconsistency",
      description: "Different field names used across the system",
      evidence: "contact_no vs phone_number vs mobile_no variations"
    },
    {
      cause: "Missing Dependency in useEffect",
      description: "useEffect might not re-run when user data updates",
      evidence: "useEffect dependency array might not include user.contact_no"
    }
  ],
  
  solutions: [
    {
      solution: "Add user-specific dependencies to useEffect",
      implementation: "Include user.contact_no, user.phone_number in dependency array"
    },
    {
      solution: "Implement secondary useEffect for user data updates",
      implementation: "Separate useEffect that watches for user data changes"
    },
    {
      solution: "Standardize field name resolution",
      implementation: "Create utility function to resolve contact number from various field names"
    },
    {
      solution: "Add session storage fallback for faculty",
      implementation: "Use same pattern as StudentEventRegistration with session storage"
    }
  ]
};

// Field Name Mapping Analysis
const CONTACT_FIELD_VARIATIONS = {
  faculty: ["contact_no", "phone_number", "mobile_no"],
  student: ["mobile_no", "phone_number", "contact_no"],
  common: ["phone", "mobile", "contact"]
};

// Utility function to resolve contact number
function resolveContactNumber(userData) {
  if (!userData) return '';
  
  const possibleFields = [
    'contact_no',
    'phone_number', 
    'mobile_no',
    'phone',
    'mobile',
    'contact'
  ];
  
  for (const field of possibleFields) {
    if (userData[field] && userData[field].trim()) {
      return userData[field];
    }
  }
  
  return '';
}

// Export for use in components
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ISSUE_ANALYSIS,
    CONTACT_FIELD_VARIATIONS,
    resolveContactNumber
  };
}

console.log('Contact Auto-Fetch Issue Analysis Loaded');
console.log('Use resolveContactNumber(userData) to get contact number from any user object');
