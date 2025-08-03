/**
 * Boilerplate template system for HTML Code Editor
 * Provides templates for different CSS frameworks and page orientations
 */

// Tailwind CSS boilerplate templates
const tailwindBoilerplate = {
  portrait: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HTML Preview</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @page { 
            size: A4 portrait; 
            margin: 1in; 
        }
        body { 
            width: 210mm; 
            min-height: 297mm; 
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
        }
        @media print {
            body {
                width: 210mm;
                min-height: 297mm;
            }
        }
    </style>
</head>
<body>
`,
  landscape: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HTML Preview</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @page { 
            size: A4 landscape; 
            margin: 1in; 
        }
        body { 
            width: 297mm; 
            min-height: 210mm; 
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
        }
        @media print {
            body {
                width: 297mm;
                min-height: 210mm;
            }
        }
    </style>
</head>
<body>
`
};

// Bootstrap boilerplate templates
const bootstrapBoilerplate = {
  portrait: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HTML Preview</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <style>
        @page { 
            size: A4 portrait; 
            margin: 1in; 
        }
        body { 
            width: 210mm; 
            min-height: 297mm; 
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
        }
        @media print {
            body {
                width: 210mm;
                min-height: 297mm;
            }
        }
    </style>
</head>
<body>
`,
  landscape: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HTML Preview</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <style>
        @page { 
            size: A4 landscape; 
            margin: 1in; 
        }
        body { 
            width: 297mm; 
            min-height: 210mm; 
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
        }
        @media print {
            body {
                width: 297mm;
                min-height: 210mm;
            }
        }
    </style>
</head>
<body>
`
};

/**
 * Generate complete HTML boilerplate based on framework and orientation
 * @param {string} framework - 'tailwind' or 'bootstrap'
 * @param {string} orientation - 'portrait' or 'landscape'
 * @returns {string} Complete HTML boilerplate
 */
export function generateBoilerplate(framework, orientation) {
  // Validate inputs
  if (!['tailwind', 'bootstrap'].includes(framework)) {
    throw new Error(`Invalid framework: ${framework}. Must be 'tailwind' or 'bootstrap'`);
  }
  
  if (!['portrait', 'landscape'].includes(orientation)) {
    throw new Error(`Invalid orientation: ${orientation}. Must be 'portrait' or 'landscape'`);
  }

  // Select appropriate template
  const templates = framework === 'tailwind' ? tailwindBoilerplate : bootstrapBoilerplate;
  return templates[orientation];
}

/**
 * Generate complete HTML document by combining boilerplate with user content
 * @param {string} framework - 'tailwind' or 'bootstrap'
 * @param {string} orientation - 'portrait' or 'landscape'
 * @param {string} userContent - User's HTML content
 * @returns {string} Complete HTML document
 */
export function generateCompleteHTML(framework, orientation, userContent = '') {
  const boilerplate = generateBoilerplate(framework, orientation);
  const closingTags = '\n</body>\n</html>';
  
  return boilerplate + userContent + closingTags;
}

/**
 * Get the protected boilerplate portion (everything before <body>)
 * @param {string} framework - 'tailwind' or 'bootstrap'
 * @param {string} orientation - 'portrait' or 'landscape'
 * @returns {string} Protected boilerplate content
 */
export function getProtectedBoilerplate(framework, orientation) {
  return generateBoilerplate(framework, orientation);
}

/**
 * Get available frameworks
 * @returns {string[]} Array of available framework names
 */
export function getAvailableFrameworks() {
  return ['tailwind', 'bootstrap'];
}

/**
 * Get available orientations
 * @returns {string[]} Array of available orientation names
 */
export function getAvailableOrientations() {
  return ['portrait', 'landscape'];
}

/**
 * Get A4 page dimensions for a given orientation
 * @param {string} orientation - 'portrait' or 'landscape'
 * @returns {object} Object with width and height in mm
 */
export function getA4Dimensions(orientation) {
  if (orientation === 'portrait') {
    return { width: '210mm', height: '297mm' };
  } else if (orientation === 'landscape') {
    return { width: '297mm', height: '210mm' };
  } else {
    throw new Error(`Invalid orientation: ${orientation}`);
  }
}
