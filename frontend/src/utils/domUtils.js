/**
 * DOM utility functions for the certificate editor
 */

/**
 * Extract editable elements from HTML string
 * @param {string} htmlString - The HTML template string
 * @returns {Array} Array of editable field objects
 */
export function extractEditableElements(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");
  const elements = doc.querySelectorAll("[data-editable]");
  const fields = [];

  elements.forEach((el) => {
    const id = el.getAttribute("data-editable");
    const content = el.innerHTML.trim();
    const styles = el.getAttribute("data-style") || "";
    const tagName = el.tagName.toLowerCase();
    
    fields.push({
      id,
      content,
      styles,
      tagName,
      className: el.className || "",
      originalElement: el.outerHTML
    });
  });

  return fields;
}

/**
 * Update HTML content with new field values
 * @param {string} htmlString - Original HTML string
 * @param {Array} fields - Updated fields array
 * @returns {string} Updated HTML string
 */
export function updateHtmlWithFields(htmlString, fields) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");
  
  fields.forEach(field => {
    const element = doc.querySelector(`[data-editable="${field.id}"]`);
    if (element) {
      element.innerHTML = field.content;
      
      // Update inline styles
      if (field.styles) {
        element.setAttribute('style', field.styles);
      }
    }
  });
  
  return doc.documentElement.outerHTML;
}

/**
 * Parse styles string into object
 * @param {string} stylesString - CSS styles string (e.g., "font-size:24px;color:#333;")
 * @returns {Object} Styles object
 */
export function parseStyles(stylesString) {
  const styles = {};
  if (!stylesString) return styles;
  
  stylesString.split(';').forEach(style => {
    const [property, value] = style.split(':').map(s => s.trim());
    if (property && value) {
      styles[property] = value;
    }
  });
  
  return styles;
}

/**
 * Convert styles object to string
 * @param {Object} stylesObject - Styles object
 * @returns {string} CSS styles string
 */
export function stringifyStyles(stylesObject) {
  return Object.entries(stylesObject)
    .map(([property, value]) => `${property}:${value}`)
    .join(';');
}

/**
 * Get available template files from public/templates directory
 * @returns {Promise<Array>} Array of template file information
 */
export async function getAvailableTemplates() {
  try {
    // This would ideally come from an API endpoint that scans the templates directory
    // For now, we'll hardcode the available templates
    const templates = [
      {
        id: 'modern-certificate',
        name: 'Modern Certificate',
        description: 'A modern gradient-based certificate design',
        filename: 'modern-certificate.html',
        preview: '/templates/modern-certificate.html',
        category: 'Modern'
      },
      {
        id: 'classic-certificate',
        name: 'Classic Certificate',
        description: 'Traditional certificate with elegant borders',
        filename: 'classic-certificate.html',
        preview: '/templates/classic-certificate.html',
        category: 'Classic'
      },
      {
        id: 'elegant-certificate',
        name: 'Elegant Certificate',
        description: 'Professional certificate with subtle gradients',
        filename: 'elegant-certificate.html',
        preview: '/templates/elegant-certificate.html',
        category: 'Professional'
      }
    ];
    
    return templates;
  } catch (error) {
    console.error('Error loading templates:', error);
    return [];
  }
}

/**
 * Load template HTML content
 * @param {string} templatePath - Path to the template file
 * @returns {Promise<string>} HTML content of the template
 */
export async function loadTemplateHtml(templatePath) {
  try {
    const response = await fetch(templatePath);
    if (!response.ok) {
      throw new Error(`Failed to load template: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.error('Error loading template HTML:', error);
    throw error;
  }
}

/**
 * Generate unique ID for elements
 * @returns {string} Unique identifier
 */
export function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Validate template HTML structure
 * @param {string} htmlString - HTML string to validate
 * @returns {Object} Validation result with isValid boolean and errors array
 */
export function validateTemplate(htmlString) {
  const result = {
    isValid: true,
    errors: [],
    warnings: []
  };
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");
    
    // Check for editable elements
    const editableElements = doc.querySelectorAll("[data-editable]");
    if (editableElements.length === 0) {
      result.warnings.push('No editable elements found. Add data-editable attributes to make elements editable.');
    }
    
    // Check for duplicate editable IDs
    const editableIds = Array.from(editableElements).map(el => el.getAttribute("data-editable"));
    const uniqueIds = [...new Set(editableIds)];
    if (editableIds.length !== uniqueIds.length) {
      result.errors.push('Duplicate data-editable IDs found. Each editable element must have a unique ID.');
      result.isValid = false;
    }
    
    // Check for basic HTML structure
    if (!doc.querySelector('html') || !doc.querySelector('body')) {
      result.errors.push('Invalid HTML structure. Template must have html and body elements.');
      result.isValid = false;
    }
    
  } catch (error) {
    result.errors.push(`Invalid HTML: ${error.message}`);
    result.isValid = false;
  }
  
  return result;
}
