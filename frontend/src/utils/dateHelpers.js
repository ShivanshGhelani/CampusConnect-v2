/**
 * Date utility functions for consistent date handling across the application
 */

/**
 * Convert a Date object to YYYY-MM-DD format in local timezone
 * This prevents timezone offset issues that occur with toISOString()
 * @param {Date} date - The date object to format
 * @returns {string} - Date string in YYYY-MM-DD format
 */
export const formatDateToLocal = (date) => {
  if (!date) return '';
  
  return date.getFullYear() + '-' + 
    String(date.getMonth() + 1).padStart(2, '0') + '-' + 
    String(date.getDate()).padStart(2, '0');
};

/**
 * Convert a date string to a Date object safely
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {Date|null} - Date object or null if invalid
 */
export const parseLocalDate = (dateString) => {
  if (!dateString) return null;
  
  try {
    // Parse as local date to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  } catch (error) {
    
    return null;
  }
};

/**
 * Format a date for display
 * @param {Date|string} date - Date object or date string
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted date string
 */
export const formatDisplayDate = (date, options = {}) => {
  const dateObj = date instanceof Date ? date : parseLocalDate(date);
  if (!dateObj) return '';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };
  
  return dateObj.toLocaleDateString('en-US', defaultOptions);
};

/**
 * Check if a date is valid
 * @param {Date} date - Date object to validate
 * @returns {boolean} - True if date is valid
 */
export const isValidDate = (date) => {
  return date instanceof Date && !isNaN(date.getTime());
};
