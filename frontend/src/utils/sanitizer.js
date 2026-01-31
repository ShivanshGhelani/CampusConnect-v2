/**
 * HTML Sanitization Utility
 * Provides secure HTML sanitization to prevent XSS attacks
 * Uses DOMPurify for comprehensive protection
 */

// Install with: npm install dompurify

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param {string} html - The HTML content to sanitize
 * @param {object} options - Optional DOMPurify configuration
 * @returns {string} - Sanitized HTML
 */
export const sanitizeHtml = (html, options = {}) => {
  if (!html) return '';
  
  const defaultConfig = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'a', 'code', 'pre', 'blockquote', 'span', 'div'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: true,
    RETURN_TRUSTED_TYPE: false,
    ...options
  };

  return DOMPurify.sanitize(html, defaultConfig);
};

/**
 * Sanitize HTML for strict contexts (no links, limited formatting)
 * @param {string} html - The HTML content to sanitize
 * @returns {string} - Strictly sanitized HTML
 */
export const sanitizeHtmlStrict = (html) => {
  return sanitizeHtml(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'code'],
    ALLOWED_ATTR: ['class']
  });
};

/**
 * Strip all HTML tags and return plain text
 * @param {string} html - The HTML content
 * @returns {string} - Plain text without HTML
 */
export const stripHtml = (html) => {
  if (!html) return '';
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
};

/**
 * Escape HTML entities in a string
 * @param {string} text - The text to escape
 * @returns {string} - Escaped text
 */
export const escapeHtml = (text) => {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

export default {
  sanitizeHtml,
  sanitizeHtmlStrict,
  stripHtml,
  escapeHtml
};
