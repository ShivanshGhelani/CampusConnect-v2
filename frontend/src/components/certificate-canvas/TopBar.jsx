import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaFileExport, FaFilePdf, FaFileImage, FaFont, FaImage, FaSignature, FaPalette, FaMagic, FaChevronDown, FaCertificate, FaUpload, FaTrash, FaThLarge, FaFileCode, FaTimes, FaCheck 
} from 'react-icons/fa';

const TopBar = ({ onAddText, onTemplateReset }) => {
  const navigate = useNavigate();
  const [showExportMenu, setShowExportMenu] = useState(false);



  // Certificate templates with text elements
  const certificateTemplates = [
    {
      id: 'academic-achievement',
      name: 'Academic Achievement',
      description: 'Classic academic certificate design',
      elements: [
        {
          id: 'title',
          type: 'text',
          content: 'Certificate of Achievement',
          x: 400,
          y: 150,
          fontSize: 36,
          fontWeight: 'bold',
          fontFamily: 'Cinzel',
          color: '#2c3e50',
          textAlign: 'center'
        },
        {
          id: 'subtitle',
          type: 'text',
          content: 'This is to certify that',
          x: 400,
          y: 220,
          fontSize: 18,
          fontFamily: 'Lora',
          color: '#34495e',
          textAlign: 'center'
        },
        {
          id: 'recipient',
          type: 'text',
          content: 'Student Name',
          x: 400,
          y: 280,
          fontSize: 32,
          fontWeight: 'bold',
          fontFamily: 'Playfair Display',
          color: '#2a6df4',
          textAlign: 'center'
        },
        {
          id: 'description',
          type: 'text',
          content: 'has successfully completed the requirements and is awarded this certificate',
          x: 400,
          y: 350,
          fontSize: 16,
          fontFamily: 'Lora',
          color: '#34495e',
          textAlign: 'center'
        },
        {
          id: 'course',
          type: 'text',
          content: 'Course/Program Name',
          x: 400,
          y: 420,
          fontSize: 24,
          fontWeight: 'bold',
          fontFamily: 'Montserrat',
          color: '#2c3e50',
          textAlign: 'center'
        },
        {
          id: 'date',
          type: 'text',
          content: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          x: 200,
          y: 520,
          fontSize: 14,
          fontFamily: 'Roboto',
          color: '#34495e',
          textAlign: 'left'
        }
      ]
    },
    {
      id: 'professional-award',
      name: 'Professional Award',
      description: 'Modern professional certificate',
      elements: [
        {
          id: 'title',
          type: 'text',
          content: 'Professional Excellence Award',
          x: 400,
          y: 140,
          fontSize: 40,
          fontWeight: 'bold',
          fontFamily: 'Montserrat',
          color: '#1a237e',
          textAlign: 'center'
        },
        {
          id: 'subtitle',
          type: 'text',
          content: 'Presented to',
          x: 400,
          y: 200,
          fontSize: 20,
          fontFamily: 'Lato',
          color: '#424242',
          textAlign: 'center'
        },
        {
          id: 'recipient',
          type: 'text',
          content: 'Employee Name',
          x: 400,
          y: 260,
          fontSize: 36,
          fontWeight: 'bold',
          fontFamily: 'Raleway',
          color: '#e91e63',
          textAlign: 'center'
        },
        {
          id: 'description',
          type: 'text',
          content: 'For outstanding performance and dedication to excellence',
          x: 400,
          y: 330,
          fontSize: 18,
          fontFamily: 'Open Sans',
          color: '#424242',
          textAlign: 'center'
        },
        {
          id: 'department',
          type: 'text',
          content: 'Department/Division',
          x: 400,
          y: 390,
          fontSize: 20,
          fontWeight: '600',
          fontFamily: 'Poppins',
          color: '#1a237e',
          textAlign: 'center'
        }
      ]
    },
    {
      id: 'course-completion',
      name: 'Course Completion',
      description: 'Training course certificate',
      elements: [
        {
          id: 'title',
          type: 'text',
          content: 'Certificate of Completion',
          x: 400,
          y: 160,
          fontSize: 38,
          fontWeight: 'bold',
          fontFamily: 'Cormorant Garamond',
          color: '#2e7d32',
          textAlign: 'center'
        },
        {
          id: 'subtitle',
          type: 'text',
          content: 'This certifies that',
          x: 400,
          y: 220,
          fontSize: 16,
          fontFamily: 'Libre Baskerville',
          color: '#37474f',
          textAlign: 'center'
        },
        {
          id: 'recipient',
          type: 'text',
          content: 'Participant Name',
          x: 400,
          y: 280,
          fontSize: 30,
          fontWeight: 'bold',
          fontFamily: 'Dancing Script',
          color: '#d32f2f',
          textAlign: 'center'
        },
        {
          id: 'description',
          type: 'text',
          content: 'has successfully completed the training program',
          x: 400,
          y: 340,
          fontSize: 16,
          fontFamily: 'Merriweather',
          color: '#37474f',
          textAlign: 'center'
        },
        {
          id: 'course',
          type: 'text',
          content: 'Course Title',
          x: 400,
          y: 400,
          fontSize: 22,
          fontWeight: 'bold',
          fontFamily: 'Oswald',
          color: '#2e7d32',
          textAlign: 'center'
        },
        {
          id: 'duration',
          type: 'text',
          content: 'Duration: 40 Hours',
          x: 400,
          y: 450,
          fontSize: 14,
          fontFamily: 'Roboto',
          color: '#546e7a',
          textAlign: 'center'
        }
      ]
    },
    {
      id: 'appreciation',
      name: 'Appreciation Certificate',
      description: 'Certificate of appreciation',
      elements: [
        {
          id: 'title',
          type: 'text',
          content: 'Certificate of Appreciation',
          x: 400,
          y: 150,
          fontSize: 36,
          fontWeight: 'bold',
          fontFamily: 'Great Vibes',
          color: '#8e24aa',
          textAlign: 'center'
        },
        {
          id: 'subtitle',
          type: 'text',
          content: 'Gratefully presented to',
          x: 400,
          y: 210,
          fontSize: 18,
          fontFamily: 'Parisienne',
          color: '#4a148c',
          textAlign: 'center'
        },
        {
          id: 'recipient',
          type: 'text',
          content: 'Honoree Name',
          x: 400,
          y: 270,
          fontSize: 34,
          fontWeight: 'bold',
          fontFamily: 'Allura',
          color: '#d32f2f',
          textAlign: 'center'
        },
        {
          id: 'description',
          type: 'text',
          content: 'In recognition of outstanding service and valuable contributions',
          x: 400,
          y: 340,
          fontSize: 16,
          fontFamily: 'Lora',
          color: '#424242',
          textAlign: 'center'
        },
        {
          id: 'organization',
          type: 'text',
          content: 'Organization Name',
          x: 400,
          y: 400,
          fontSize: 20,
          fontWeight: '600',
          fontFamily: 'Cinzel',
          color: '#8e24aa',
          textAlign: 'center'
        }
      ]
    }
  ];

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.relative')) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const downloadPNG = async () => {
    const certificateWrapper = document.getElementById('certificate-wrapper');
    if (!certificateWrapper || !window.html2canvas) return;
    
    // Wait for fonts to load
    await document.fonts.ready;
    await new Promise(r => setTimeout(r, 300));
    
    window.html2canvas(certificateWrapper, { 
      scale: 3,
      useCORS: true,
      allowTaint: false,
      backgroundColor: 'white',
      logging: false,
      letterRendering: true,
      foreignObjectRendering: false
    }).then(canvas => {
      const link = document.createElement('a');
      link.download = 'certificate.png';
      link.href = canvas.toDataURL();
      link.click();
    });
    setShowExportMenu(false);
  };

  const downloadJPG = () => {
    const certificateWrapper = document.getElementById('certificate-wrapper');
    if (!certificateWrapper || !window.html2canvas) return;
    
    window.html2canvas(certificateWrapper, { 
      scale: 2,
      useCORS: true,
      backgroundColor: 'white'
    }).then(canvas => {
      const link = document.createElement('a');
      link.download = 'certificate.jpg';
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
    });
    setShowExportMenu(false);
  };

  const downloadPDF = () => {
    const downloadBtn = document.getElementById('download-pdf');
    if (downloadBtn) {
      downloadBtn.click();
    }
    setShowExportMenu(false);
  };

  const downloadHTML = async () => {
    const certificateWrapper = document.getElementById('certificate-wrapper');
    const backgroundCanvas = document.getElementById('background-canvas');
    
    console.log('🔍 Export Debug - Starting HTML export...');
    console.log('📋 Certificate wrapper found:', !!certificateWrapper);
    console.log('🎨 Background canvas found:', !!backgroundCanvas);
    console.log('🖼️ Current background image:', window.currentBackgroundImage);
    
    if (!certificateWrapper) {
      console.error('❌ Certificate wrapper not found!');
      return;
    }
    
    // Get background image data with comprehensive capture
    let backgroundDataURL = '';
    
    try {
      // Method 1: Direct canvas capture (most reliable for drawn backgrounds)
      if (backgroundCanvas) {
        console.log('📏 Canvas dimensions:', backgroundCanvas.width, 'x', backgroundCanvas.height);
        
        try {
          // First try to capture the canvas directly
          backgroundDataURL = backgroundCanvas.toDataURL('image/jpeg', 0.8);
          console.log('✅ Canvas captured successfully (no CORS issues)');
        } catch (corsError) {
          console.warn('⚠️ Canvas tainted by CORS, using fallback method:', corsError.message);
          
          // Canvas is tainted, so we'll use the stored background image instead
          if (window.currentBackgroundImage) {
            console.log('🔄 Using stored background image due to CORS taint...');
            // Fall through to Method 2
          }
        }
      }
      
      // Method 2: Direct background image processing (fallback for CORS issues)
      if (!backgroundDataURL && window.currentBackgroundImage) {
        console.log('🔄 Method 2: Processing stored background image directly...');
        
        try {
          let imageSrc = window.currentBackgroundImage;
          
          // Handle Supabase URLs - fetch and convert to blob first
          if (imageSrc.includes('supabase.co') || imageSrc.startsWith('https://')) {
            console.log('🌐 Fetching Supabase/external image...');
            const response = await fetch(imageSrc, { 
              mode: 'cors',
              credentials: 'omit'
            });
            
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const blob = await response.blob();
            console.log('📦 Blob created, size:', blob.size, 'bytes');
            
            // Convert blob to data URL
            imageSrc = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          }
          
          // Create optimized version
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          
          await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              console.log('🖼️ Original image size:', img.width, 'x', img.height);
              
              // Optimize dimensions (max 1200x1600 for web)
              const maxWidth = 1200;
              const maxHeight = 1600;
              let { width, height } = img;
              
              if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width *= ratio;
                height *= ratio;
                console.log('📐 Resizing to:', width, 'x', height);
              }
              
              tempCanvas.width = width;
              tempCanvas.height = height;
              tempCtx.drawImage(img, 0, 0, width, height);
              
              backgroundDataURL = tempCanvas.toDataURL('image/jpeg', 0.7);
              console.log('✅ Method 2 successful:', backgroundDataURL.substring(0, 50) + '...');
              resolve();
            };
            img.onerror = (error) => {
              console.error('❌ Failed to load image:', error);
              reject(error);
            };
            // Don't set crossOrigin for data URLs to avoid CORS issues
            if (!imageSrc.startsWith('data:')) {
              img.crossOrigin = 'anonymous';
            }
            img.src = imageSrc;
          });
          
        } catch (error) {
          console.error('❌ Method 2 failed:', error);
        }
      }
      
      // Method 3: CSS background-image extraction (final fallback)
      if (!backgroundDataURL) {
        console.log('🔄 Method 3: Checking CSS background-image...');
        const { backgroundImage } = window.getComputedStyle(certificateWrapper);
        
        if (backgroundImage && backgroundImage !== 'none') {
          console.log('🎨 Found CSS background:', backgroundImage);
          const urlMatch = backgroundImage.match(/url\(["']?([^"']*)["']?\)/);
          
          if (urlMatch && urlMatch[1]) {
            console.log('🔗 Extracted URL:', urlMatch[1]);
            // Process this URL similar to Method 2
            // (Implementation similar to above but from CSS URL)
          }
        }
      }
      
    } catch (error) {
      console.error('❌ Background capture failed:', error);
    }
    
    // Log final result
    if (backgroundDataURL) {
      console.log('🎉 Background successfully captured! Size:', backgroundDataURL.length, 'characters');
    } else {
      console.warn('⚠️ No background captured - export will have no background image');
    }
    
    // Get computed styles for the certificate wrapper
    const computedStyles = window.getComputedStyle(certificateWrapper);
    const wrapperStyles = Array.from(computedStyles).reduce((acc, property) => {
      acc[property] = computedStyles.getPropertyValue(property);
      return acc;
    }, {});
    
    // Create inline styles string (remove background-image from wrapper styles to avoid conflicts)
    const filteredStyles = Object.entries(wrapperStyles)
      .filter(([property]) => property !== 'background-image')
      .map(([property, value]) => `${property}: ${value}`)
      .join('; ');
    
    // Build text elements HTML manually for clean export
    const textElements = certificateWrapper.querySelectorAll('[data-type="text"]');
    const textElementsHTML = Array.from(textElements).map((el, idx) => {
      const computedStyle = window.getComputedStyle(el);
      
      // Clone the element to get clean HTML without resize handles/buttons
      const clone = el.cloneNode(true);
      // Remove all interactive child elements
      clone.querySelectorAll('.resize-handle, .delete-btn, .remove-btn, .toggle-line-btn').forEach(child => child.remove());
      
      // Get the inner HTML with formatting preserved (bold, italic, underline, etc.)
      const innerHTML = clone.innerHTML.trim() || clone.textContent.trim();
      
      console.log(`📝 Element ${idx}:`);
      console.log(`  Original color: ${computedStyle.color}`);
      console.log(`  Original font: ${computedStyle.fontFamily}`);
      console.log(`  Original size: ${computedStyle.fontSize}`);
      console.log(`  innerHTML: ${innerHTML.substring(0, 100)}`);
      
      // Account for padding in position calculation (text elements have 8px padding)
      const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
      const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
      const actualLeft = parseFloat(computedStyle.left) + paddingLeft;
      const actualTop = parseFloat(computedStyle.top) + paddingTop;
      
      // Build inline style - remove flex/padding for static export
      const inlineStyle = [
        `position: absolute`,
        `left: ${actualLeft}px`,
        `top: ${actualTop}px`,
        `font-family: ${computedStyle.fontFamily.replace(/"/g, "'")}`, // Replace double quotes with single quotes
        `font-size: ${computedStyle.fontSize}`,
        `font-weight: ${computedStyle.fontWeight}`,
        `font-style: ${computedStyle.fontStyle}`,
        `color: ${computedStyle.color}`,
        `text-align: ${computedStyle.textAlign}`,
        `line-height: ${computedStyle.lineHeight}`,
        `letter-spacing: ${computedStyle.letterSpacing}`,
        `text-decoration: ${computedStyle.textDecoration}`,
        `text-transform: ${computedStyle.textTransform}`,
        `z-index: ${computedStyle.zIndex}`,
        `white-space: pre-wrap`,
        `word-wrap: break-word`
      ].join('; ');
      
      const htmlElement = `<div style="${inlineStyle}">${innerHTML}</div>`;
      console.log(`  Final HTML: ${htmlElement.substring(0, 300)}`);
      
      return htmlElement;
    }).join('\n');
    
    console.log('🎨 Built', textElements.length, 'text elements with formatting preserved');
    
    // Create a complete HTML document with manually built elements
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificate</title>
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Alfa+Slab+One&family=Allura&family=Amatic+SC:wght@400;700&family=Anton&family=Archivo+Black&family=Arvo:ital,wght@0,400;0,700;1,400&family=Barlow:wght@400;500;700&family=Bebas+Neue&family=Bitter:ital,wght@0,400;0,700;1,400&family=Bodoni+Moda:ital,wght@0,400;0,700;1,400&family=Cardo:ital,wght@0,400;0,700;1,400&family=Caveat:wght@400;700&family=Cinzel:wght@400;700&family=Comfortaa:wght@400;700&family=Cookie&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Crimson+Text:ital,wght@0,400;0,700;1,400&family=Dancing+Script:wght@400;700&family=Domine:wght@400;700&family=EB+Garamond:ital,wght@0,400;0,700;1,400&family=Fjalla+One&family=Fredoka:wght@400;700&family=Great+Vibes&family=Indie+Flower&family=Inter:wght@400;500;700&family=Italiana&family=Karla:ital,wght@0,400;0,700;1,400&family=Kaushan+Script&family=Lato:ital,wght@0,400;0,700;1,400&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,400;0,700;1,400&family=Merriweather:ital,wght@0,400;0,700;1,400&family=Montserrat:wght@400;500;700&family=Mulish:ital,wght@0,400;0,700;1,400&family=Nunito:ital,wght@0,400;0,700;1,400&family=Open+Sans:wght@400;600&family=Oxygen:wght@400;700&family=PT+Sans:ital,wght@0,400;0,700;1,400&family=Parisienne&family=Passion+One:wght@400;700&family=Patrick+Hand&family=Philosopher:ital,wght@0,400;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,700;1,700&family=Poppins:wght@400;600&family=Quicksand:wght@400;500;700&family=Raleway:wght@400;700&family=Righteous&family=Roboto:wght@300;400;700&family=Sacramento&family=Satisfy&family=Shadows+Into+Light&family=Source+Sans+Pro:ital,wght@0,400;0,700;1,400&family=Spectral:ital,wght@0,400;0,700;1,400&family=Tangerine:wght@400;700&family=Ubuntu:ital,wght@0,400;0,700;1,400&family=Unna:ital,wght@0,400;0,700;1,400&family=Vollkorn:ital,wght@0,400;0,700;1,400&family=Work+Sans:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
    <style>
        body {
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: #f0f0f0;
        }
        
        .certificate-wrapper {
            ${filteredStyles};
            position: relative;
            background-image: url('${backgroundDataURL}');
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
        }
        
        /* Force all divs to respect inline styles - NO inheritance */
        .certificate-wrapper > div {
            all: initial;
            position: absolute !important;
            display: block !important;
        }
    </style>
</head>
<body>
    <div class="certificate-wrapper">
        ${textElementsHTML}
    </div>
</body>
</html>`;

    console.log('✅ HTML built successfully');

    // Create and download the HTML file
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'certificate.html';
    link.click();
    URL.revokeObjectURL(link.href);
    setShowExportMenu(false);
  };

  // Element actions
  const triggerAddText = () => {
    if (onAddText) {
      onAddText();
    }
  };

  const openTemplateSelector = () => {
    if (window.templateManager) {
      window.templateManager.showModal();
    }
  };

  const triggerAddLogo = () => {
    const logoInput = document.getElementById('upload-logo-dynamic');
    if (logoInput) {
      logoInput.click();
    }
  };

  const triggerAddSignature = () => {
    // Show a modal to choose signature options
    const modalHTML = `
      <div id="signature-options-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div class="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Add Signature</h3>
          <p class="text-sm text-gray-600 mb-4">Choose your signature options:</p>
          
          <div class="space-y-4">
            <label class="flex items-center space-x-3">
              <input type="checkbox" id="include-signature-line" checked class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
              <span class="text-sm text-gray-700">Include signature line</span>
            </label>
            
            <div class="text-xs text-gray-500 bg-gray-50 p-3 rounded">
              <strong>Note:</strong> Background removal will be automatically applied to make signatures transparent.
              You can toggle the signature line later using the toggle button when the signature is selected.
            </div>
          </div>
          
          <div class="flex justify-end space-x-3 mt-6">
            <button id="cancel-signature" class="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button id="upload-signature" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Upload Signature
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const modal = document.getElementById('signature-options-modal');
    const cancelBtn = document.getElementById('cancel-signature');
    const uploadBtn = document.getElementById('upload-signature');
    const includeLineCheckbox = document.getElementById('include-signature-line');
    
    // Handle cancel
    cancelBtn.addEventListener('click', () => {
      modal.remove();
    });
    
    // Handle click outside modal
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
    
    // Handle upload
    uploadBtn.addEventListener('click', () => {
      const includeSignatureLine = includeLineCheckbox.checked;
      modal.remove();
      
      // Create a file input for signature upload
      const signatureInput = document.createElement('input');
      signatureInput.type = 'file';
      signatureInput.accept = 'image/*';
      signatureInput.style.display = 'none';
      
      signatureInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = async (e) => {
            let imageSrc = e.target.result;
            
            // Apply automatic background and shadow removal
            if (window.enhancedBackgroundRemoval) {
              try {
                imageSrc = await window.enhancedBackgroundRemoval(imageSrc, {
                  tolerance: 30,
                  shadowTolerance: 40,
                  edgeSmoothing: true,
                  removeWhite: true,
                  removeShadows: true,
                  shadowDetectionSensitivity: 0.7
                });
              } catch (error) {
                console.warn('Enhanced background removal failed, trying basic removal:', error);
                // Fallback to basic removal
                if (window.removeWhiteBackground) {
                  try {
                    imageSrc = await window.removeWhiteBackground(imageSrc);
                  } catch (fallbackError) {
                    console.warn('Basic background removal also failed:', fallbackError);
                  }
                }
              }
            } else if (window.removeWhiteBackground) {
              try {
                imageSrc = await window.removeWhiteBackground(imageSrc);
              } catch (error) {
                console.warn('Background removal failed, using original image:', error);
              }
            }
            
            // Create signature element using Canvas function with line parameter
            if (window.createSimpleSignatureElement) {
              const element = window.createSimpleSignatureElement(imageSrc, includeSignatureLine);
              const container = document.getElementById('dynamic-elements-container');
              
              if (container) {
                // Position in center
                const containerRect = container.getBoundingClientRect();
                const centerX = containerRect.width / 2 - 75;
                const centerY = containerRect.height / 2 - 40;
                
                element.style.left = centerX + 'px';
                element.style.top = centerY + 'px';
                element.style.transform = 'none';
                
                container.appendChild(element);
                
                // Select the new element
                if (window.selectElement) {
                  window.selectElement(element);
                }
              }
            }
          };
          reader.readAsDataURL(file);
        }
        
        // Clean up
        document.body.removeChild(signatureInput);
      });
      
      // Add to DOM and trigger click
      document.body.appendChild(signatureInput);
      signatureInput.click();
    });
  };

  // PHASE 2 FEATURE: AI Background Generation
  // const generateAIBackground = () => {
  //   const prompt = document.getElementById('ai-prompt')?.value;
  //   const promptInput = document.getElementById('ai-prompt-input');
  //   if (prompt && promptInput) {
  //     promptInput.value = prompt;
  //     document.getElementById('ai-generate-btn')?.click();
  //   }
  // };

  const triggerBackgroundUpload = () => {
    // Create file input for background upload
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    
    fileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageSrc = e.target.result;
          // Use the global setBackgroundImage function from Canvas.jsx
          if (window.setBackgroundImage) {
            window.setBackgroundImage(imageSrc);
          }
        };
        reader.readAsDataURL(file);
      }
    });
    
    // Trigger file selection
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  };

  const resetBackground = () => {
    // Use the global resetBackground function from Canvas.jsx
    if (window.resetBackground) {
      window.resetBackground();
    } else if (window.drawBackground && typeof window.drawBackground === 'function') {
      // Fallback to ornate background
      window.drawBackground();
    }
  };



  const loadCertificateTemplate = (template) => {
    // Use the Layout component's template loading function
    const event = new CustomEvent('loadTemplate', { detail: template });
    window.dispatchEvent(event);
    setShowBackgroundModal(false);
    setSelectedTemplate(null);
  };



  return (
    <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 shadow-sm">
      <div className="flex items-center gap-3">
        <FaCertificate className="text-2xl text-blue-600" />
        <span className="text-lg font-semibold text-gray-800">Certificate Designer</span>
      </div>

      {/* Elements Toolbar */}
      <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
        <button 
          className="px-3 py-2 rounded-md flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          onClick={triggerAddText}
        >
          <FaFont />
          <span>Text</span>
        </button>

        <button 
          className="px-3 py-2 rounded-md flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          onClick={() => {
            if (onTemplateReset) onTemplateReset();
            resetBackground();
          }}
        >
          <FaTrash />
          <span>Reset</span>
        </button>

        {/* Logo button - Hidden */}
        {/* <button 
          className="px-3 py-2 rounded-md flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          onClick={triggerAddLogo}
        >
          <FaImage />
          <span>Logo</span>
        </button> */}

        <button 
          className="px-3 py-2 rounded-md flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          onClick={triggerBackgroundUpload}
        >
          <FaPalette />
          <span>Upload Background</span>
        </button>

        {/* Signature button - Hidden */}
        {/* <button 
          className="px-3 py-2 rounded-md flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          onClick={triggerAddSignature}
        >
          <FaSignature />
          <span>Signature</span>
        </button> */}

        {/* PHASE 2 FEATURE: AI Background Generation */}
        {/* <div className="w-px h-6 bg-gray-300 mx-2"></div>

        <div className="flex items-center gap-2">
          <FaMagic className="text-gray-600" />
          <input 
            id="ai-prompt"
            className="px-2 py-1.5 border border-gray-300 rounded-md text-sm w-40 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="AI background..."
          />
          <button 
            className="px-3 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors"
            onClick={generateAIBackground}
          >
            Generate
          </button>
        </div> */}
      </div>

      <div className="flex items-center gap-3">
        {/* Cancel Button */}
        <button 
          onClick={() => navigate('/admin/dashboard')}
          className="px-4 py-2 bg-red-500 text-white rounded-md text-sm font-medium hover:bg-red-600 transition-colors flex items-center gap-2"
        >
          <span>×</span>
          <span>Cancel</span>
        </button>
        
        {/* Export Button */}
        <div className="relative">
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium flex items-center gap-2 hover:bg-blue-700 transition-colors"
            onClick={() => setShowExportMenu(!showExportMenu)}
          >
            <FaFileExport />
            <span>Export</span>
            <FaChevronDown className={`transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} />
          </button>

        {showExportMenu && (
          <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl min-w-48 z-50 animate-fade-in-down">
            {/* PNG and PDF options hidden for now */}
            {/* <button
              className="w-full px-4 py-3 text-sm text-gray-700 flex items-center gap-3 hover:bg-gray-100"
              onClick={downloadPNG}
            >
              <FaFileImage className="text-blue-500" />
              <span>Download PNG</span>
            </button>
            <button
              className="w-full px-4 py-3 text-sm text-gray-700 flex items-center gap-3 hover:bg-gray-100"
              onClick={downloadPDF}
            >
              <FaFilePdf className="text-red-500" />
              <span>Download PDF</span>
            </button> */}
            <button
              className="w-full px-4 py-3 text-sm text-gray-700 flex items-center gap-3 hover:bg-gray-100"
              onClick={downloadHTML}
            >
              <FaFileCode className="text-orange-500" />
              <span>Download HTML</span>
            </button>
          </div>
          )}
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {showExportMenu && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowExportMenu(false)}
        />
      )}

    </div>
  );
};

export default TopBar;
