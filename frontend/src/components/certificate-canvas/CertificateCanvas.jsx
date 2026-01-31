import React, { useEffect, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { createSimpleTextElement, makeTextElementInteractive } from './SimpleTextElement';
import Loader from './Loader';
import { removeWhiteBackground, enhancedBackgroundRemoval } from '../../utils/imageProcessing';

const Canvas = ({ onTextElementsChange, template }) => {
  const [isLoading, setIsLoading] = useState(true);
  
  // Load enhanced background removal if available
  useEffect(() => {
    // Make functions available globally for legacy compatibility
    window.removeWhiteBackground = removeWhiteBackground;
    window.enhancedBackgroundRemoval = enhancedBackgroundRemoval;
    
    console.log('Image processing utilities loaded');
  }, []);

  // Function to hide placeholder text when content is added
  const hidePlaceholderText = () => {
    const placeholderText = document.getElementById('default-placeholder-text');
    if (placeholderText) {
      placeholderText.style.display = 'none';
      placeholderText.style.opacity = '0';
      placeholderText.style.visibility = 'hidden';
    }
  };

  // Function to show placeholder text when canvas is empty
  const showPlaceholderText = () => {
    const placeholderText = document.getElementById('default-placeholder-text');
    const container = document.getElementById('dynamic-elements-container');
    const hasElements = container && container.children.length > 0;
    const hasBackground = window.currentBackgroundImage || (window.drawBackground && typeof window.drawBackground === 'function');
    
    // Only show placeholder if no elements and no custom background
    if (placeholderText && !hasElements && !hasBackground) {
      placeholderText.style.display = 'block';
      placeholderText.style.opacity = '1';
      placeholderText.style.visibility = 'visible';
    }
  };

  // Simple DOM-based text element creation (matching logo approach)
  const addSimpleTextElement = () => {
    const canvasRect = document.getElementById('certificate-wrapper')?.getBoundingClientRect();
    const centerX = canvasRect ? (canvasRect.width / 2) - 100 : 150;
    const centerY = canvasRect ? (canvasRect.height / 2) - 25 : 150;
    
    const element = createSimpleTextElement('Editable Text', {
      position: { x: centerX, y: centerY },
      size: { width: 200, height: 50 }
    });
    
    // Position element in center of canvas
    element.style.left = `${centerX}px`;
    element.style.top = `${centerY}px`;
    
    const container = document.getElementById('dynamic-elements-container');
    container.appendChild(element);
    
    // Hide placeholder text when element is added
    hidePlaceholderText();
    
    // Make it interactive (same as logo)
    makeTextElementInteractive(element);
    
    // Save state after adding element
    setTimeout(() => saveCanvasState(), 100);
    
    // Force immediate selection and delete button creation
    setTimeout(() => {
      // Clear other selections
      document.querySelectorAll('.dynamic-element').forEach(el => {
        if (el !== element) {
          el.style.border = '2px solid transparent';
          el.classList.remove('selected');
        }
      });
      
      // Select and show delete button
      element.style.border = '2px solid #3b82f6';
      element.classList.add('selected');
      window.selectedElement = element;
      
      // Force trigger click to show delete button
      element.click();
    }, 100);
    
    return element;
  };

  // Expose addTextElement function to parent component
  React.useImperativeHandle(onTextElementsChange, () => ({
    addTextElement: addSimpleTextElement
  }), []);

  useEffect(() => {
    // Prevent multiple loading
    if (window.scriptsLoaded) return;
    window.scriptsLoaded = true;

    // Make libraries available globally for existing JS modules
    window.html2canvas = html2canvas;
    window.jsPDF = jsPDF;
    
    // Initialize global variables to prevent conflicts
    window.elementCounter = 0;
    window.selectedElement = null;

    // Initialize the editor functionality directly
    initializeEditor();
    
    // Expose functions globally for SimpleTextElement.js and other modules
    window.selectElement = selectElement;
    window.makeElementDraggable = makeElementDraggable;
    window.showDeleteButton = showDeleteButton;
    window.showTemplateDeleteButton = showTemplateDeleteButton;
    window.deselectAll = deselectAll;
    window.createSimpleSignatureElement = createSimpleSignatureElement;
    window.triggerAddSignature = triggerAddSignature;
    window.triggerBackgroundUpload = triggerBackgroundUpload;
    window.setBackgroundImage = setBackgroundImage;
    window.resetBackground = resetBackground;
    window.hidePlaceholderText = hidePlaceholderText;
    window.showPlaceholderText = showPlaceholderText;
    window.saveCanvasState = saveCanvasState;
    window.loadCanvasState = loadCanvasState;
    window.makeTextElementInteractive = makeTextElementInteractive;
    
    // Load saved state on page load
    setTimeout(() => {
      loadCanvasState();
    }, 300);
    
    // Auto-save state when changes occur
    const autoSave = () => {
      setTimeout(() => saveCanvasState(), 100);
    };
    
    // Setup MutationObserver to watch for canvas changes
    const container = document.getElementById('dynamic-elements-container');
    if (container) {
      const observer = new MutationObserver(autoSave);
      observer.observe(container, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style']
      });
    }
    
    // Define the canvas click handler function
    const handleCanvasClick = (e) => {
      // Only deselect if clicking on the canvas wrapper itself, not its contents
      if (e.target === certificateWrapper || e.target.id === 'background-canvas') {
        deselectAll();
      }
    };

    // Add canvas click handler for deselection
    const certificateWrapper = document.getElementById('certificate-wrapper');
    if (certificateWrapper) {
      certificateWrapper.addEventListener('click', handleCanvasClick);
    }

    // Cleanup function
    return () => {
      window.scriptsLoaded = false;
      if (certificateWrapper) {
        certificateWrapper.removeEventListener('click', handleCanvasClick);
      }
    };
  }, []);

  // Editor functionality moved directly into React component
  const initializeEditor = () => {
    // Setup add text button
    const addTextBtn = document.getElementById('add-text-btn');
    if (addTextBtn && !addTextBtn.hasAttribute('data-initialized')) {
      addTextBtn.setAttribute('data-initialized', 'true');
      addTextBtn.addEventListener('click', handleAddText);
    }

    // Setup add logo button with protection against duplicate listeners
    const addLogoBtn = document.getElementById('add-logo-btn');
    const logoInput = document.getElementById('upload-logo-dynamic');
    
    if (addLogoBtn && logoInput && !addLogoBtn.hasAttribute('data-initialized')) {
      addLogoBtn.setAttribute('data-initialized', 'true');
      logoInput.setAttribute('data-initialized', 'true');
      
      addLogoBtn.addEventListener('click', () => {
        logoInput.click();
      });
      
      logoInput.addEventListener('change', handleLogoUpload);
    }

    // Setup signature upload buttons
    const signatureInputs = ['upload-sig-1', 'upload-sig-2', 'upload-sig-3'];
    signatureInputs.forEach((inputId) => {
      const sigInput = document.getElementById(inputId);
      if (sigInput && !sigInput.hasAttribute('data-initialized')) {
        sigInput.setAttribute('data-initialized', 'true');
        sigInput.addEventListener('change', handleSignatureUpload);
      }
    });

    // Setup signature line click handlers to trigger new signature system
    const signatureLines = ['sig-line-1', 'sig-line-2', 'sig-line-3'];
    signatureLines.forEach((lineId) => {
      const sigLine = document.getElementById(lineId);
      if (sigLine && !sigLine.hasAttribute('data-initialized')) {
        sigLine.setAttribute('data-initialized', 'true');
        sigLine.addEventListener('click', () => {
          triggerAddSignature();
        });
      }
    });

    // Setup download button
    const downloadBtn = document.getElementById('download-pdf');
    if (downloadBtn && !downloadBtn.hasAttribute('data-initialized')) {
      downloadBtn.setAttribute('data-initialized', 'true');
      downloadBtn.addEventListener('click', handleDownloadPDF);
    }

    // Clear selection when clicking empty area (use global variable to track)
    if (!window.documentClickInitialized) {
      window.documentClickInitialized = true;
      document.addEventListener('click', handleDocumentClick);
    }
  };

  const handleAddText = () => {
    const element = createSimpleTextElement('Editable Text');
    const container = document.getElementById('dynamic-elements-container');
    
    // Position in center with proper pixel values
    const containerRect = container.getBoundingClientRect();
    const centerX = containerRect.width / 2 - 100; // Approximate text width
    const centerY = containerRect.height / 2 - 15; // Approximate text height
    
    element.style.left = centerX + 'px';
    element.style.top = centerY + 'px';
    element.style.transform = 'none'; // Remove transform for proper positioning
    
    container.appendChild(element);
    
    // Hide placeholder text when element is added
    hidePlaceholderText();
    
    selectElement(element);
    
    // Save state after adding element
    setTimeout(() => saveCanvasState(), 100);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const element = createSimpleLogoElement(e.target.result);
        const container = document.getElementById('dynamic-elements-container');
        
        // Position in center with proper pixel values
        const containerRect = container.getBoundingClientRect();
        const centerX = containerRect.width / 2 - 50; // Half of default logo width
        const centerY = containerRect.height / 2 - 50; // Half of default logo height
        
        element.style.left = centerX + 'px';
        element.style.top = centerY + 'px';
        element.style.transform = 'none'; // Remove transform for proper positioning
        
        container.appendChild(element);
        
        // Hide placeholder text when element is added
        hidePlaceholderText();
        
        selectElement(element);
        
        // Clear the file input to prevent issues
        e.target.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        let imageSrc = e.target.result;
        
        // Apply automatic background removal
        if (window.removeWhiteBackground) {
          try {
            imageSrc = await window.removeWhiteBackground(imageSrc);
          } catch (error) {
            console.warn('Background removal failed, using original image:', error);
          }
        }
        
        const element = createSimpleSignatureElement(imageSrc);
        const container = document.getElementById('dynamic-elements-container');
        
        // Position in center with proper pixel values
        const containerRect = container.getBoundingClientRect();
        const centerX = containerRect.width / 2 - 75; // Half of default signature width
        const centerY = containerRect.height / 2 - 40; // Half of default signature height
        
        element.style.left = centerX + 'px';
        element.style.top = centerY + 'px';
        element.style.transform = 'none'; // Remove transform for proper positioning
        
        container.appendChild(element);
        
        // Hide placeholder text when element is added
        hidePlaceholderText();
        
        selectElement(element);
        
        // Clear the file input to prevent issues
        e.target.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerAddSignature = () => {
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
          
          // Apply automatic background removal
          if (window.removeWhiteBackground) {
            try {
              imageSrc = await window.removeWhiteBackground(imageSrc);
            } catch (error) {
              console.warn('Background removal failed, using original image:', error);
            }
          }
          
          const element = createSimpleSignatureElement(imageSrc);
          const container = document.getElementById('dynamic-elements-container');
          
          // Position in center
          const containerRect = container.getBoundingClientRect();
          const centerX = containerRect.width / 2 - 75;
          const centerY = containerRect.height / 2 - 40;
          
          element.style.left = centerX + 'px';
          element.style.top = centerY + 'px';
          element.style.transform = 'none';
          
          container.appendChild(element);
          
          // Hide placeholder text when element is added
          hidePlaceholderText();
          
          selectElement(element);
        };
        reader.readAsDataURL(file);
      }
      
      // Clean up
      document.body.removeChild(signatureInput);
    });
    
    // Add to DOM and trigger click
    document.body.appendChild(signatureInput);
    signatureInput.click();
  };

  // Background design upload and management system
  const handleBackgroundUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageSrc = e.target.result;
        setBackgroundImage(imageSrc);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveCanvasState = () => {
    try {
      const container = document.getElementById('dynamic-elements-container');
      if (!container) return;
      
      const textElements = [];
      const elements = container.querySelectorAll('.dynamic-element[data-type="text"]');
      
      elements.forEach((element) => {
        const computedStyle = window.getComputedStyle(element);
        
        // Clone element and remove UI elements (resize handles, delete buttons)
        const clone = element.cloneNode(true);
        clone.querySelectorAll('.resize-handle, .delete-btn, .toggle-line-btn').forEach(child => child.remove());
        
        textElements.push({
          innerHTML: clone.innerHTML.trim(),
          position: {
            left: element.style.left,
            top: element.style.top,
            transform: element.style.transform
          },
          styles: {
            fontSize: computedStyle.fontSize,
            fontFamily: computedStyle.fontFamily,
            color: computedStyle.color,
            fontWeight: computedStyle.fontWeight,
            fontStyle: computedStyle.fontStyle,
            textDecoration: computedStyle.textDecoration,
            textAlign: element.style.textAlign || 'center',
            width: element.style.width,
            height: element.style.height,
            minWidth: element.style.minWidth,
            minHeight: element.style.minHeight || '40px',
            padding: element.style.padding
          }
        });
      });
      
      const state = {
        textElements,
        backgroundImage: window.currentBackgroundImage || null,
        timestamp: Date.now()
      };
      
      sessionStorage.setItem('canvasState', JSON.stringify(state));
    } catch (error) {
      console.error('Error saving canvas state:', error);
    }
  };

  const loadCanvasState = () => {
    try {
      const savedState = sessionStorage.getItem('canvasState');
      if (!savedState) {
        setIsLoading(false);
        return;
      }
      
      const state = JSON.parse(savedState);
      
      // Restore background image if exists
      if (state.backgroundImage) {
        setBackgroundImage(state.backgroundImage);
      }
      
      // Restore text elements
      if (state.textElements && state.textElements.length > 0) {
        const container = document.getElementById('dynamic-elements-container');
        if (!container) return;
        
        // Clear existing elements first
        container.innerHTML = '';
        
        state.textElements.forEach((savedElement) => {
          const element = document.createElement('div');
          element.className = 'dynamic-element';
          element.dataset.type = 'text';
          element.contentEditable = 'true';
          element.innerHTML = savedElement.innerHTML;
          
          // Apply position
          element.style.position = 'absolute';
          element.style.left = savedElement.position.left;
          element.style.top = savedElement.position.top;
          element.style.transform = savedElement.position.transform;
          
          // Apply styles
          element.style.fontSize = savedElement.styles.fontSize;
          element.style.fontFamily = savedElement.styles.fontFamily;
          element.style.color = savedElement.styles.color;
          element.style.fontWeight = savedElement.styles.fontWeight;
          element.style.fontStyle = savedElement.styles.fontStyle;
          element.style.textDecoration = savedElement.styles.textDecoration;
          element.style.textAlign = savedElement.styles.textAlign;
          element.style.width = savedElement.styles.width;
          element.style.height = savedElement.styles.height;
          element.style.minWidth = savedElement.styles.minWidth;
          element.style.minHeight = savedElement.styles.minHeight;
          element.style.padding = savedElement.styles.padding;
          element.style.cursor = 'move';
          element.style.border = '2px solid transparent';
          element.style.outline = 'none';
          element.style.background = 'transparent';
          element.style.zIndex = '10';
          element.style.userSelect = 'text';
          element.style.borderRadius = '4px';
          element.style.boxSizing = 'border-box';
          element.style.overflow = 'hidden';
          element.style.wordWrap = 'break-word';
          element.style.display = 'flex';
          element.style.alignItems = 'center';
          element.style.justifyContent = 'center';
          
          container.appendChild(element);
          
          // Make element interactive
          if (window.makeTextElementInteractive) {
            window.makeTextElementInteractive(element);
          }
        });
      }
      
      // Mark loading as complete
      setTimeout(() => setIsLoading(false), 100);
    } catch (error) {
      console.error('Error loading canvas state:', error);
      setIsLoading(false);
    }
  };

  const setBackgroundImage = (imageSrc) => {
    const canvas = document.getElementById('background-canvas');
    const ctx = canvas.getContext('2d');
    
    // Load and draw the background image
    const img = new Image();
    img.onload = () => {
      // Clear canvas first
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw image to fill the entire canvas
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Store the background for future use
      window.currentBackgroundImage = imageSrc;
      
      // Hide placeholder text when background is set
      hidePlaceholderText();
      
      // Save state after background change
      setTimeout(() => saveCanvasState(), 100);
    };
    img.src = imageSrc;
  };

  const resetBackground = () => {
    const canvas = document.getElementById('background-canvas');
    const ctx = canvas.getContext('2d');
    
    // Clear current background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Reset to default drawing function
    if (window.drawBackground && typeof window.drawBackground === 'function') {
      window.drawBackground();
    }
    
    // Clear stored background
    delete window.currentBackgroundImage;
    
    // Clear all text elements
    const container = document.getElementById('dynamic-elements-container');
    if (container) {
      container.innerHTML = '';
    }
    
    // Clear session storage
    sessionStorage.removeItem('canvasState');
    
    // Check if we should show placeholder text again
    showPlaceholderText();
  };

  const triggerBackgroundUpload = () => {
    const backgroundInput = document.createElement('input');
    backgroundInput.type = 'file';
    backgroundInput.accept = 'image/*';
    backgroundInput.style.display = 'none';
    
    backgroundInput.addEventListener('change', handleBackgroundUpload);
    
    // Add to DOM and trigger click
    document.body.appendChild(backgroundInput);
    backgroundInput.click();
    
    // Clean up after selection
    setTimeout(() => {
      if (document.body.contains(backgroundInput)) {
        document.body.removeChild(backgroundInput);
      }
    }, 1000);
  };

  const handleDownloadPDF = async () => {
    // Hide selection indicators before generating PDF
    if (window.selectedElement) {
      window.selectedElement.classList.remove('selected');
      window.selectedElement = null;
      const propertiesPanel = document.getElementById('properties-panel');
      if (propertiesPanel) propertiesPanel.style.display = 'none';
    }
    
    // Wait for fonts to load and UI updates to render
    await document.fonts.ready;
    await new Promise(r => setTimeout(r, 300));

    const certificateWrapper = document.getElementById('certificate-wrapper');
    const canvas = document.getElementById('background-canvas');
    
    try {
      const canvasElement = await html2canvas(certificateWrapper, { 
        scale: 3,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        letterRendering: true,
        foreignObjectRendering: false
      });
      
      // Determine orientation based on canvas dimensions
      const isLandscape = canvas.width > canvas.height;
      
      // Create PDF document with appropriate orientation
      const doc = new jsPDF({ 
        orientation: isLandscape ? 'landscape' : 'portrait', 
        unit: 'mm', 
        format: isLandscape ? [297, 210] : [210, 297] // A4 dimensions
      });
      
      const imgData = canvasElement.toDataURL('image/png');
      
      // Add image to PDF with correct dimensions
      if (isLandscape) {
        doc.addImage(imgData, 'PNG', 0, 0, 297, 210); // A4 landscape
      } else {
        doc.addImage(imgData, 'PNG', 0, 0, 210, 297); // A4 portrait
      }
      
      // Generate filename with timestamp and orientation
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const orientation = isLandscape ? 'Landscape' : 'Portrait';
      const filename = `Certificate-${orientation}-${timestamp}.pdf`;
      
      // Save the PDF
      doc.save(filename);
      
      console.log('PDF generated successfully:', filename);
      console.log('Orientation:', orientation);
      console.log('Canvas dimensions:', canvas.width, '×', canvas.height);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handleDocumentClick = (e) => {
    if (!e.target.closest('.dynamic-element') && 
        !e.target.closest('.delete-btn') && 
        !e.target.closest('.resize-handle')) {
      
      deselectAll();
    }
  };

  const deselectAll = () => {
    document.querySelectorAll('.dynamic-element').forEach(el => {
      if (el.classList.contains('template-element')) {
        el.style.border = '2px solid transparent';
        el.style.backgroundColor = 'transparent';
      } else {
        el.style.border = '2px solid transparent';
      }
      el.classList.remove('selected');
      
      // Hide resize handles
      el.querySelectorAll('.resize-handle').forEach(handle => {
        handle.style.display = 'none';
      });
      
      // Blur text elements to exit edit mode
      if (el.dataset.type === 'text') {
        el.blur();
      }
    });
    
    // Remove delete buttons and toggle buttons
    document.querySelectorAll('.delete-btn').forEach(btn => btn.remove());
    document.querySelectorAll('.toggle-line-btn').forEach(btn => btn.remove());
    window.selectedElement = null;
    
    // Check if we should show placeholder text when nothing is selected
    showPlaceholderText();
  };

  // Element creation functions
  const createSimpleTextElement = (text = 'Editable Text') => {
    window.elementCounter = (window.elementCounter || 0) + 1;
    const element = document.createElement('div');
    element.className = 'dynamic-element';
    element.dataset.type = 'text';
    element.contentEditable = 'true';
    element.textContent = text;
    
    // Simple styling with fixed dimensions for resizing
    element.style.cssText = `
      position: absolute;
      font-family: 'Roboto', sans-serif;
      font-size: 24px;
      color: #34495e;
      background: transparent;
      border: 2px dashed transparent;
      outline: none;
      cursor: move;
      padding: 8px;
      z-index: 10;
      user-select: text;
      width: 200px;
      min-height: 40px;
      border-radius: 4px;
      box-sizing: border-box;
      overflow: hidden;
      word-wrap: break-word;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    // Add selection on click
    element.addEventListener('click', (e) => {
      e.stopPropagation();
      selectElement(element);
    });
    
    // Handle focus/blur for editing vs dragging
    element.addEventListener('focus', () => {
      element.style.cursor = 'text';
    });
    
    element.addEventListener('blur', () => {
      element.style.cursor = 'move';
      // Force recreate and show resize handles after editing
      if (element.classList.contains('selected')) {
        setTimeout(() => {
          // Remove old handles first
          element.querySelectorAll('.resize-handle').forEach(handle => handle.remove());
          // Recreate handles using stored function
          if (element.addResizeHandles) {
            element.addResizeHandles();
          }
          // Force show them
          element.querySelectorAll('.resize-handle').forEach(handle => {
            handle.style.display = 'block';
          });
        }, 100);
      }
    });
    
    // Keep element selected and handles visible after editing
    element.addEventListener('input', () => {
      if (element.classList.contains('selected')) {
        setTimeout(() => {
          // Check if handles exist, if not recreate them
          if (element.querySelectorAll('.resize-handle').length === 0 && element.addResizeHandles) {
            element.addResizeHandles();
          }
          // Force show them
          element.querySelectorAll('.resize-handle').forEach(handle => {
            handle.style.display = 'block';
          });
        }, 50);
      }
    });
    
    // Force handles to stay visible while typing
    element.addEventListener('keydown', (e) => {
      e.stopPropagation();
      // Force recreate handles after any key press if selected
      if (element.classList.contains('selected')) {
        setTimeout(() => {
          if (element.querySelectorAll('.resize-handle').length === 0 && element.addResizeHandles) {
            element.addResizeHandles();
          }
          element.querySelectorAll('.resize-handle').forEach(handle => {
            handle.style.display = 'block';
          });
        }, 10);
      }
    });
    
    element.addEventListener('keyup', (e) => {
      // Force recreate handles after typing stops
      if (element.classList.contains('selected')) {
        setTimeout(() => {
          element.querySelectorAll('.resize-handle').forEach(handle => handle.remove());
          if (element.addResizeHandles) {
            element.addResizeHandles();
          }
          element.querySelectorAll('.resize-handle').forEach(handle => {
            handle.style.display = 'block';
          });
        }, 50);
      }
    });
    
    // Make draggable and resizable
    makeElementDraggable(element);
    
    return element;
  };

  const createSimpleLogoElement = (imageSrc) => {
    window.elementCounter = (window.elementCounter || 0) + 1;
    
    // Create a wrapper div to hold the image and resize handles
    const wrapper = document.createElement('div');
    wrapper.className = 'dynamic-element';
    wrapper.dataset.type = 'logo';
    
    // Create the actual image element
    const element = document.createElement('img');
    element.src = imageSrc;
    element.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: contain;
      pointer-events: none;
    `;
    
    // Style the wrapper
    wrapper.style.cssText = `
      position: absolute;
      width: 100px;
      height: 100px;
      cursor: move;
      border: 2px solid transparent;
      z-index: 10;
      user-select: none;
    `;
    
    // Add the image to the wrapper
    wrapper.appendChild(element);
    
    // Add selection on click
    wrapper.addEventListener('click', (e) => {
      e.stopPropagation();
      selectElement(wrapper);
    });
    
    // Add double-click to replace image with proper event handling
    wrapper.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      // Create temporary file input
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.style.display = 'none';
      
      fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            element.src = e.target.result;
          };
          reader.readAsDataURL(file);
        }
        // Clean up
        document.body.removeChild(fileInput);
      });
      
      // Add to DOM and trigger click
      document.body.appendChild(fileInput);
      fileInput.click();
    });
    
    // Make draggable and resizable
    makeElementDraggable(wrapper);
    
    return wrapper;
  };

  // Create signature element function (same as logo but with background removal)
  
  const createSimpleSignatureElement = (imageSrc, includeSignatureLine = true) => {
    window.elementCounter = (window.elementCounter || 0) + 1;
    
    // Create a wrapper div to hold the image, signature line, and resize handles
    const wrapper = document.createElement('div');
    wrapper.className = 'dynamic-element signature-element';
    wrapper.dataset.type = 'signature';
    wrapper.dataset.includeSignatureLine = includeSignatureLine.toString();
    
    // Create container for image and line
    const container = document.createElement('div');
    container.style.cssText = `
      width: 100%;
      height: 100%;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
    `;
    
    // Create signature line element (positioned first, at the bottom)
    const signatureLine = document.createElement('div');
    signatureLine.className = 'signature-line';
    signatureLine.style.cssText = `
      width: 90%;
      height: 2px;
      background-color: #000000;
      position: absolute;
      bottom: 10px;
      left: 50%;
      transform: translateX(-50%);
      display: ${includeSignatureLine ? 'block' : 'none'};
    `;
    
    // Create the actual image element (positioned above the line)
    const element = document.createElement('img');
    element.src = imageSrc;
    element.style.cssText = `
      width: 100%;
      height: 80%;
      object-fit: contain;
      pointer-events: none;
      position: absolute;
      top: 0;
      left: 0;
      z-index: 2;
    `;
    
    // Add elements to container (line first, then image to create layering)
    container.appendChild(signatureLine);
    container.appendChild(element);
    
    // Style the wrapper (better proportions for signatures with line)
    wrapper.style.cssText = `
      position: absolute;
      width: 150px;
      height: ${includeSignatureLine ? '100px' : '80px'};
      cursor: move;
      border: 2px solid transparent;
      z-index: 10;
      user-select: none;
    `;
    
    // Add the container to the wrapper
    wrapper.appendChild(container);
    
    // Add selection on click
    wrapper.addEventListener('click', (e) => {
      e.stopPropagation();
      selectElement(wrapper);
    });
    
    // Add double-click to replace signature with background removal
    wrapper.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      // Create temporary file input
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.style.display = 'none';
      
      fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = async (e) => {
            let processedSrc = e.target.result;
            
            // Apply enhanced background removal if available
            if (window.enhancedBackgroundRemoval) {
              try {
                processedSrc = await window.enhancedBackgroundRemoval(e.target.result, {
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
                    processedSrc = await window.removeWhiteBackground(e.target.result);
                  } catch (fallbackError) {
                    console.warn('Basic background removal also failed:', fallbackError);
                  }
                }
              }
            } else if (window.removeWhiteBackground) {
              try {
                processedSrc = await window.removeWhiteBackground(e.target.result);
              } catch (error) {
                console.warn('Background removal failed, using original:', error);
              }
            }
            
            element.src = processedSrc;
          };
          reader.readAsDataURL(file);
        }
        // Clean up
        document.body.removeChild(fileInput);
      });
      
      // Add to DOM and trigger click
      document.body.appendChild(fileInput);
      fileInput.click();
    });
    
    // Make draggable and resizable with full functionality
    makeElementDraggable(wrapper);
    
    return wrapper;
  };

  const selectElement = (element) => {
    // Clear previous selections
    document.querySelectorAll('.dynamic-element').forEach(el => {
      el.style.border = '2px solid transparent';
      el.classList.remove('selected');
      // Hide all resize handles
      el.querySelectorAll('.resize-handle').forEach(handle => handle.style.display = 'none');
    });
    
    // Select current element with appropriate styling
    if (element.classList.contains('template-element')) {
      element.style.border = '2px solid #3b82f6';
      element.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
    } else {
      element.style.border = '2px solid #3b82f6';
    }
    
    element.classList.add('selected');
    window.selectedElement = element;
    
    // Hide placeholder text when any element is selected
    hidePlaceholderText();
    
    // Dispatch custom event for sidebar properties panel
    const event = new CustomEvent('elementSelected', { 
      detail: element
    });
    window.dispatchEvent(event);
    
    // Handle resize handles - template elements don't need them
    if (!element.classList.contains('template-element')) {
      // Force recreate and show resize handles for regular elements only
      setTimeout(() => {
        // Remove existing handles first
        element.querySelectorAll('.resize-handle').forEach(handle => handle.remove());
        
        // Recreate all handles using stored function
        if (element.addResizeHandles) {
          element.addResizeHandles();
        } else {
          console.log('No addResizeHandles function found on element:', element.dataset.type);
        }
        
        // Force show all handles
        element.querySelectorAll('.resize-handle').forEach(handle => {
          handle.style.display = 'block';
          handle.style.visibility = 'visible';
          handle.style.opacity = '1';
        });
      }, 50);
      
      // Show delete button for regular elements
      showDeleteButton(element);
    } else {
      // Template elements get a special delete behavior (just clear text or reset to default)
      showTemplateDeleteButton(element);
    }
  };

  const showDeleteButton = (element) => {
    // Remove existing delete button first
    const existingBtn = element.querySelector('.delete-btn');
    if (existingBtn) existingBtn.remove();
    
    // Also remove any global delete buttons and toggle buttons
    document.querySelectorAll('.delete-btn').forEach(btn => btn.remove());
    document.querySelectorAll('.toggle-line-btn').forEach(btn => btn.remove());
    
    // Create delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.title = 'Delete element';
    deleteBtn.style.cssText = `
      position: absolute;
      top: -12px;
      right: -12px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #dc3545;
      color: white;
      border: 2px solid white;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
      z-index: 1003;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      transition: all 0.2s ease;
      pointer-events: auto;
    `;
    
    // Add click handler for deletion
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      // Confirm deletion for better UX
      if (confirm('Are you sure you want to delete this element?')) {
        element.remove();
        deleteBtn.remove();
        window.selectedElement = null;
        
        // Hide any remaining delete buttons and toggle buttons
        document.querySelectorAll('.delete-btn').forEach(btn => btn.remove());
        document.querySelectorAll('.toggle-line-btn').forEach(btn => btn.remove());
        
        // Check if we should show placeholder text again after deletion
        showPlaceholderText();
        
        // Save state after deletion
        setTimeout(() => saveCanvasState(), 100);
      }
    });
    
    // Add hover effects
    deleteBtn.addEventListener('mouseenter', () => {
      deleteBtn.style.background = '#c82333';
      deleteBtn.style.transform = 'scale(1.15)';
      deleteBtn.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.4)';
    });
    
    deleteBtn.addEventListener('mouseleave', () => {
      deleteBtn.style.background = '#dc3545';
      deleteBtn.style.transform = 'scale(1)';
      deleteBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    });
    
    // Add keyboard support
    deleteBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        deleteBtn.click();
      }
    });
    
    element.appendChild(deleteBtn);
    
    // Add signature line toggle button if this is a signature element
    if (element.dataset.type === 'signature') {
      const toggleLineBtn = document.createElement('button');
      toggleLineBtn.className = 'toggle-line-btn';
      toggleLineBtn.innerHTML = '─';
      toggleLineBtn.title = 'Toggle signature line';
      toggleLineBtn.style.cssText = `
        position: absolute;
        top: -12px;
        right: 30px;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: #28a745;
        color: white;
        border: 2px solid white;
        cursor: pointer;
        font-size: 16px;
        font-weight: bold;
        z-index: 1003;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        transition: all 0.2s ease;
        pointer-events: auto;
      `;
      
      // Update button appearance based on current state
      const signatureLine = element.querySelector('.signature-line');
      const isLineVisible = signatureLine && signatureLine.style.display !== 'none';
      toggleLineBtn.style.background = isLineVisible ? '#28a745' : '#6c757d';
      toggleLineBtn.innerHTML = isLineVisible ? '─' : '┄';
      
      // Add click handler for toggling signature line
      toggleLineBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        const signatureLine = element.querySelector('.signature-line');
        if (signatureLine) {
          const isCurrentlyVisible = signatureLine.style.display !== 'none';
          signatureLine.style.display = isCurrentlyVisible ? 'none' : 'block';
          
          // Update button appearance
          toggleLineBtn.style.background = isCurrentlyVisible ? '#6c757d' : '#28a745';
          toggleLineBtn.innerHTML = isCurrentlyVisible ? '┄' : '─';
          
          // Update element height based on line visibility
          const newHeight = isCurrentlyVisible ? '80px' : '100px';
          element.style.height = newHeight;
          
          // Update dataset
          element.dataset.includeSignatureLine = (!isCurrentlyVisible).toString();
        }
      });
      
      // Add hover effects
      toggleLineBtn.addEventListener('mouseenter', () => {
        const isLineVisible = signatureLine && signatureLine.style.display !== 'none';
        toggleLineBtn.style.background = isLineVisible ? '#218838' : '#5a6268';
        toggleLineBtn.style.transform = 'scale(1.15)';
        toggleLineBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
      });
      
      toggleLineBtn.addEventListener('mouseleave', () => {
        const isLineVisible = signatureLine && signatureLine.style.display !== 'none';
        toggleLineBtn.style.background = isLineVisible ? '#28a745' : '#6c757d';
        toggleLineBtn.style.transform = 'scale(1)';
        toggleLineBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      });
      
      element.appendChild(toggleLineBtn);
    }
  };

  const showTemplateDeleteButton = (element) => {
    // Remove existing delete button first
    const existingBtn = element.querySelector('.delete-btn');
    if (existingBtn) existingBtn.remove();
    
    // Also remove any global delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => btn.remove());
    
    // Create reset button for template elements
    const resetBtn = document.createElement('button');
    resetBtn.className = 'delete-btn';
    resetBtn.innerHTML = '↺';
    resetBtn.title = 'Reset to default text';
    resetBtn.style.cssText = `
      position: absolute;
      top: -12px;
      right: -12px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #ffc107;
      color: #212529;
      border: 2px solid white;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
      z-index: 1003;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      transition: all 0.2s ease;
      pointer-events: auto;
    `;
    
    // Add click handler for reset
    resetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      // Get original template data and reset text
      const { templateId } = element.dataset;
      if (templateId && confirm('Reset this text to its default value?')) {
        // This would ideally restore from template data
        element.textContent = 'Default Text';
      }
    });
    
    // Add hover effects
    resetBtn.addEventListener('mouseenter', () => {
      resetBtn.style.background = '#e0a800';
      resetBtn.style.transform = 'scale(1.15)';
      resetBtn.style.boxShadow = '0 4px 12px rgba(255, 193, 7, 0.4)';
    });
    
    resetBtn.addEventListener('mouseleave', () => {
      resetBtn.style.background = '#ffc107';
      resetBtn.style.transform = 'scale(1)';
      resetBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    });
    
    element.appendChild(resetBtn);
  };

  const makeElementDraggable = (element) => {
    let isDragging = false;
    let isResizing = false;
    let resizeType = '';
    let startX, startY, startLeft, startTop, startWidth, startHeight;
    
    // Add Canva-style resize handles for all elements
    const addResizeHandles = () => {
      // Remove existing handles
      element.querySelectorAll('.resize-handle').forEach(handle => handle.remove());
      
      // Define all resize handles (corners and sides)
      const handles = [
        { class: 'resize-nw', cursor: 'nw-resize', position: 'top: -5px; left: -5px;' },
        { class: 'resize-n', cursor: 'n-resize', position: 'top: -5px; left: 50%; transform: translateX(-50%);' },
        { class: 'resize-ne', cursor: 'ne-resize', position: 'top: -5px; right: -5px;' },
        { class: 'resize-e', cursor: 'e-resize', position: 'top: 50%; right: -5px; transform: translateY(-50%);' },
        { class: 'resize-se', cursor: 'se-resize', position: 'bottom: -5px; right: -5px;' },
        { class: 'resize-s', cursor: 's-resize', position: 'bottom: -5px; left: 50%; transform: translateX(-50%);' },
        { class: 'resize-sw', cursor: 'sw-resize', position: 'bottom: -5px; left: -5px;' },
        { class: 'resize-w', cursor: 'w-resize', position: 'top: 50%; left: -5px; transform: translateY(-50%);' }
      ];
      
      handles.forEach(handleInfo => {
        const handle = document.createElement('div');
        handle.className = `resize-handle ${handleInfo.class}`;
        handle.style.cssText = `
          position: absolute;
          width: 10px;
          height: 10px;
          background: #007bff;
          border: 2px solid white;
          border-radius: 2px;
          cursor: ${handleInfo.cursor};
          z-index: 1002;
          display: none;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          pointer-events: auto;
          ${handleInfo.position}
        `;
        
        // Add resize functionality to each handle
        handle.addEventListener('mousedown', (e) => {
          e.stopPropagation();
          e.preventDefault();
          
          isResizing = true;
          resizeType = handleInfo.class.replace('resize-', '');
          startX = e.clientX;
          startY = e.clientY;
          
          const rect = element.getBoundingClientRect();
          const container = document.getElementById('dynamic-elements-container');
          const containerRect = container.getBoundingClientRect();
          
          startLeft = rect.left - containerRect.left;
          startTop = rect.top - containerRect.top;
          startWidth = rect.width;
          startHeight = rect.height;
          
          document.addEventListener('mousemove', handleResize);
          document.addEventListener('mouseup', stopResize);
        });
        
        element.appendChild(handle);
      });
    };
    
    const handleResize = (e) => {
      if (!isResizing) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      let newLeft = startLeft;
      let newTop = startTop;
      
      // Calculate new dimensions based on resize direction
      switch (resizeType) {
        case 'se': // Southeast (bottom-right)
          newWidth = startWidth + deltaX;
          newHeight = startHeight + deltaY;
          break;
        case 'sw': // Southwest (bottom-left)
          newWidth = startWidth - deltaX;
          newHeight = startHeight + deltaY;
          newLeft = startLeft + deltaX;
          break;
        case 'ne': // Northeast (top-right)
          newWidth = startWidth + deltaX;
          newHeight = startHeight - deltaY;
          newTop = startTop + deltaY;
          break;
        case 'nw': // Northwest (top-left)
          newWidth = startWidth - deltaX;
          newHeight = startHeight - deltaY;
          newLeft = startLeft + deltaX;
          newTop = startTop + deltaY;
          break;
        case 'n': // North (top)
          newHeight = startHeight - deltaY;
          newTop = startTop + deltaY;
          break;
        case 's': // South (bottom)
          newHeight = startHeight + deltaY;
          break;
        case 'e': // East (right)
          newWidth = startWidth + deltaX;
          break;
        case 'w': // West (left)
          newWidth = startWidth - deltaX;
          newLeft = startLeft + deltaX;
          break;
      }
      
      // Apply minimum size constraints
      const minSize = 20;
      if (newWidth < minSize) {
        newWidth = minSize;
        if (resizeType.includes('w')) newLeft = startLeft + startWidth - minSize;
      }
      if (newHeight < minSize) {
        newHeight = minSize;
        if (resizeType.includes('n')) newTop = startTop + startHeight - minSize;
      }
      
      // Apply the new dimensions and position
      element.style.width = newWidth + 'px';
      element.style.height = newHeight + 'px';
      element.style.left = newLeft + 'px';
      element.style.top = newTop + 'px';
    };
    
    const stopResize = () => {
      isResizing = false;
      resizeType = '';
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', stopResize);
    };
    
    // Add resize handles to the element
    addResizeHandles();
    
    // Store the function on the element for later use
    element.addResizeHandles = addResizeHandles;
    
    // Force show resize handles when element is selected
    const forceShowHandles = () => {
      if (element.classList.contains('selected')) {
        element.querySelectorAll('.resize-handle').forEach(handle => {
          handle.style.display = 'block';
        });
      }
    };
    
    // Show/hide resize handles when element is selected/deselected
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const handles = element.querySelectorAll('.resize-handle');
          if (element.classList.contains('selected')) {
            // If no handles exist, recreate them
            if (handles.length === 0) {
              addResizeHandles();
            }
            // Force show all handles
            element.querySelectorAll('.resize-handle').forEach(handle => {
              handle.style.display = 'block';
            });
          } else {
            handles.forEach(handle => handle.style.display = 'none');
          }
        }
      });
    });
    observer.observe(element, { attributes: true, childList: true, subtree: true });
    
    // Drag functionality
    element.addEventListener('mousedown', (e) => {
      // Don't drag if clicking on resize handles or delete button
      if (e.target.classList.contains('resize-handle') || 
          e.target.classList.contains('delete-btn')) {
        return;
      }
      
      // For text elements, only allow dragging when not in edit mode or when holding Ctrl
      if (element.dataset.type === 'text') {
        // If the element is focused and we're not holding Ctrl, don't drag
        if (document.activeElement === element && !e.ctrlKey) {
          return;
        }
        // Blur the element to exit edit mode when starting drag
        element.blur();
      }
      
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      
      // Get current position
      const computedStyle = getComputedStyle(element);
      startLeft = parseInt(computedStyle.left) || 0;
      startTop = parseInt(computedStyle.top) || 0;
      
      // Remove transform if it exists for proper positioning
      element.style.transform = 'none';
      element.style.left = startLeft + 'px';
      element.style.top = startTop + 'px';
      
      element.style.cursor = 'grabbing';
      
      const handleDragMove = (e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        const newLeft = startLeft + deltaX;
        const newTop = startTop + deltaY;
        
        // Different constraints for template elements vs regular elements
        if (element.classList.contains('template-element')) {
          // Template elements can move within a broader range but stay within certificate
          const container = document.getElementById('certificate-wrapper');
          const containerRect = container.getBoundingClientRect();
          const elementRect = element.getBoundingClientRect();
          
          // Allow template to move within certificate boundaries
          const maxLeft = containerRect.width - elementRect.width;
          const maxTop = containerRect.height - elementRect.height;
          
          element.style.left = Math.max(-50, Math.min(maxLeft + 50, newLeft)) + 'px';
          element.style.top = Math.max(-50, Math.min(maxTop + 50, newTop)) + 'px';
        } else {
          // Regular elements - constrain to certificate boundaries
          const container = document.getElementById('certificate-wrapper');
          const containerRect = container.getBoundingClientRect();
          const elementRect = element.getBoundingClientRect();
          
          const maxLeft = containerRect.width - elementRect.width;
          const maxTop = containerRect.height - elementRect.height;
          
          element.style.left = Math.max(0, Math.min(maxLeft, newLeft)) + 'px';
          element.style.top = Math.max(0, Math.min(maxTop, newTop)) + 'px';
        }
      };
      
      const handleDragUp = () => {
        isDragging = false;
        element.style.cursor = element.dataset.type === 'text' ? 'text' : 'move';
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragUp);
      };
      
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragUp);
      
      e.preventDefault();
      e.stopPropagation();
    });
    
    // Double-click to edit text
    if (element.dataset.type === 'text') {
      element.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        element.focus();
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Force ensure resize handles remain visible during editing
        setTimeout(() => {
          if (element.classList.contains('selected')) {
            if (element.querySelectorAll('.resize-handle').length === 0 && element.addResizeHandles) {
              element.addResizeHandles();
            }
            element.querySelectorAll('.resize-handle').forEach(handle => {
              handle.style.display = 'block';
            });
          }
        }, 100);
      });
    }
  };

  return (
    <>
      {isLoading && <Loader />}
      
      {/* Add Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
      <link href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Alfa+Slab+One&family=Allura&family=Amatic+SC:wght@400;700&family=Anton&family=Archivo+Black&family=Arvo:ital,wght@0,400;0,700;1,400&family=Barlow:wght@400;500;700&family=Bebas+Neue&family=Bitter:ital,wght@0,400;0,700;1,400&family=Bodoni+Moda:ital,wght@0,400;0,700;1,400&family=Cardo:ital,wght@0,400;0,700;1,400&family=Caveat:wght@400;700&family=Cinzel:wght@400;700&family=Comfortaa:wght@400;700&family=Cookie&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Crimson+Text:ital,wght@0,400;0,700;1,400&family=Dancing+Script:wght@400;700&family=Domine:wght@400;700&family=EB+Garamond:ital,wght@0,400;0,700;1,400&family=Fjalla+One&family=Fredoka:wght@400;700&family=Great+Vibes&family=Indie+Flower&family=Inter:wght@400;500;700&family=Italiana&family=Karla:ital,wght@0,400;0,700;1,400&family=Kaushan+Script&family=Lato:ital,wght@0,400;0,700;1,400&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,400;0,700;1,400&family=Merriweather:ital,wght@0,400;0,700;1,400&family=Montserrat:wght@400;500;700&family=Mulish:ital,wght@0,400;0,700;1,400&family=Nunito:ital,wght@0,400;0,700;1,400&family=Open+Sans:wght@400;600&family=Oxygen:wght@400;700&family=PT+Sans:ital,wght@0,400;0,700;1,400&family=Parisienne&family=Passion+One:wght@400;700&family=Patrick+Hand&family=Philosopher:ital,wght@0,400;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,700;1,700&family=Poppins:wght@400;600&family=Quicksand:wght@400;500;700&family=Raleway:wght@400;700&family=Righteous&family=Roboto:wght@300;400;700&family=Sacramento&family=Satisfy&family=Shadows+Into+Light&family=Source+Sans+Pro:ital,wght@0,400;0,700;1,400&family=Spectral:ital,wght@0,400;0,700;1,400&family=Tangerine:wght@400;700&family=Ubuntu:ital,wght@0,400;0,700;1,400&family=Unna:ital,wght@0,400;0,700;1,400&family=Vollkorn:ital,wght@0,400;0,700;1,400&family=Work+Sans:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet" />
      
      <style>
        {`
        /* --- CSS STYLES FOR THE MODERN CORPORATE DESIGN --- */
        
        :root {
            --modern-blue: #2a6df4;
            --modern-dark: #2c3e50;
            --modern-bg: #ffffff;
            --modern-text: #34495e;
        }

        /* Removed body styles to prevent conflicts with Tailwind CSS */

        /* --- ESSENTIAL STRUCTURE --- */
        .certificate-wrapper {
            position: relative;
            width: 1052px;  /* A4 landscape scaled for display (3508 * 0.3) */
            height: 744px;  /* A4 landscape scaled for display (2480 * 0.3) */
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            background-color: var(--modern-bg);
            overflow: hidden;
            margin: 0 auto;
            transition: all 0.3s ease;
        }

        /* Template-specific portrait orientation */
        .certificate-wrapper.template-active.portrait-mode {
            width: 744px;   /* Portrait width for templates (2480 * 0.3) */
            height: 1052px; /* Portrait height for templates (3508 * 0.3) */
        }

        /* Landscape orientation styles - default */
        .certificate-wrapper.landscape-mode {
            width: 1052px;  /* Landscape width for templates (3508 * 0.3) */
            height: 744px;  /* Landscape height for templates (2480 * 0.3) */
        }

        #background-canvas {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            z-index: 1;
        }

        .certificate-container {
            position: relative;
            z-index: 2;
            width: 100%; height: 100%;
        }
       
        #dynamic-elements-container {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            z-index: 10;
            pointer-events: none;
        }

        /* Allow text elements to receive pointer events */
        #dynamic-elements-container > * {
            pointer-events: all;
        }

        /* Text gradient support */
        .text-gradient {
            background-clip: text;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-size: 100% 100%;
        }

        /* Resize handle styles */
        .resize-handle {
            position: absolute;
            background: #3b82f6;
            border: 2px solid white;
            border-radius: 50%;
            width: 12px;
            height: 12px;
            z-index: 20;
        }

        .resize-handle:hover {
            background: #2563eb;
            transform: scale(1.1);
        }

        .certificate-content {
            text-align: center;
            color: var(--modern-text);
            width: 100%; height: 100%;
            padding: 40px;
            position: relative; 
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            box-sizing: border-box;
            z-index: 5;
        }

        /* --- DYNAMIC ELEMENT STYLES --- */
        .dynamic-element {
            position: absolute;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid transparent;
            cursor: move; 
            pointer-events: all;
            min-width: 20px;
            min-height: 20px;
            transition: border-color 0.2s ease;
        }
        .dynamic-element.selected {
            border: 2px solid #007bff !important;
            z-index: 100;
        }
        .dynamic-element:hover:not(.selected) {
            border: 2px dashed rgba(0, 123, 255, 0.5);
        }
        .dynamic-element img {
            width: 100%; 
            height: 100%;
            object-fit: contain;
            pointer-events: none;
        }
        .dynamic-element[data-type="logo"] img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            pointer-events: none;
        }
        .dynamic-element[data-type="text"] {
            cursor: text;
            border: 2px dashed transparent;
            min-width: 50px;
            padding: 4px 8px;
            border-radius: 4px;
        }
        .dynamic-element[data-type="text"]:hover:not(.selected) {
            background-color: rgba(0, 123, 255, 0.05);
            border: 2px dashed rgba(0, 123, 255, 0.3);
        }
        .dynamic-element[data-type="text"].selected {
            background-color: rgba(0, 123, 255, 0.1);
        }
        
        /* Logo hover effects */
        .dynamic-element[data-type="logo"]:hover:not(.selected) {
            border: 2px dashed rgba(0, 123, 255, 0.5);
            box-shadow: 0 2px 8px rgba(0, 123, 255, 0.2);
        }
        .dynamic-element[data-type="logo"]:hover::after {
            content: "Double-click to change image";
            position: absolute;
            bottom: -25px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            white-space: nowrap;
            z-index: 1004;
            pointer-events: none;
        }
        
        /* Resize handle styles - Canva-style */
        .resize-handle {
            position: absolute;
            width: 10px;
            height: 10px;
            background: #007bff;
            border: 2px solid white;
            border-radius: 2px;
            z-index: 1002;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            transition: all 0.2s ease;
        }
        .resize-handle:hover {
            background: #0056b3;
            transform: scale(1.3);
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        }
        
        /* Specific resize handle positioning */
        .resize-nw { cursor: nw-resize; }
        .resize-n { cursor: n-resize; }
        .resize-ne { cursor: ne-resize; }
        .resize-e { cursor: e-resize; }
        .resize-se { cursor: se-resize; }
        .resize-s { cursor: s-resize; }
        .resize-sw { cursor: sw-resize; }
        .resize-w { cursor: w-resize; }
        
        /* Side handles should be rectangular */
        .resize-n, .resize-s {
            width: 20px;
            height: 6px;
            border-radius: 3px;
        }
        .resize-e, .resize-w {
            width: 6px;
            height: 20px;
            border-radius: 3px;
        }
        
        /* Better visual feedback for different element types */
        .dynamic-element[data-type="text"]:hover .resize-handle {
            background: #28a745;
        }
        .dynamic-element[data-type="logo"]:hover .resize-handle {
            background: #007bff;
        }
        .dynamic-element[data-type="signature"]:hover .resize-handle {
            background: #6f42c1;
        }
        
        /* Delete button styles - positioned clearly above border */
        .delete-btn, .remove-btn {
            position: absolute;
            top: -15px;
            right: -15px;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: #dc3545;
            color: white;
            border: 3px solid white;
            cursor: pointer;
            font-size: 18px;
            font-weight: bold;
            z-index: 1005;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 3px 10px rgba(0,0,0,0.4);
            transition: all 0.2s ease;
            line-height: 1;
        }
        .delete-btn:hover, .remove-btn:hover {
            background: #c82333 !important;
            transform: scale(1.1) !important;
            box-shadow: 0 5px 15px rgba(220, 53, 69, 0.5) !important;
        }

        /* --- CONTROLS --- */
        /* Controls moved to sidebar - keeping minimal styles for hidden elements */
        
        /* --- STATIC CONTENT STYLES --- */
        .footer-content {
            display: flex;
            justify-content: space-between; 
            align-items: flex-end;
            width: 100%;
            margin-top: auto;
            position: relative;
            min-height: 120px;
            /* Show by default for A4 landscape */
            opacity: 1;
            visibility: visible;
            transition: all 0.3s ease;
        }

        /* Keep footer visible when template is active */
        .certificate-wrapper.template-active .footer-content {
            opacity: 1;
            visibility: visible;
        }

        .signature-block {
            padding-top: 10px;
            width: 250px;
            position: relative;
            transition: all 0.3s ease;
            /* Show by default for A4 landscape */
            opacity: 1;
            visibility: visible;
        }

        /* Keep signature blocks visible when template is active */
        .certificate-wrapper.template-active .signature-block {
            opacity: 1;
            visibility: visible;
        }

        /* Hide default message when template is active */
        .certificate-wrapper.template-active .default-message {
            opacity: 0 !important;
            visibility: hidden !important;
        }

        /* Template-based absolute positioning for signature blocks */
        .signature-block.template-positioned {
            position: absolute !important;
            width: auto !important;
            min-width: 180px;
            max-width: 220px;
        }

        /* Template element styles - non-draggable but editable */
        .template-element {
            border: 2px solid transparent !important;
            transition: all 0.3s ease;
            background-color: transparent !important;
            cursor: text !important;
            pointer-events: all !important;
        }

        .template-element:hover:not(.selected) {
            border: 2px dashed rgba(59, 130, 246, 0.5) !important;
            background-color: rgba(59, 130, 246, 0.05) !important;
        }

        .template-element.selected {
            border: 2px solid #3b82f6 !important;
            background-color: rgba(59, 130, 246, 0.1) !important;
            outline: none !important;
        }

        .template-element:focus {
            border: 2px solid #3b82f6 !important;
            background-color: rgba(59, 130, 246, 0.1) !important;
            outline: none !important;
        }

        /* Template elements should not have resize handles */
        .template-element .resize-handle {
            display: none !important;
        }

        .signature-line {
             border-top: 1px solid #999;
             height: 50px;
             margin-bottom: 8px;
             cursor: pointer;
             display: flex;
             align-items: center;
             justify-content: center;
        }
        .signature-line.has-image { border-top: 1px solid transparent; }
        .signature-line img { max-height: 100%; max-width: 100%; }

        .signature-block .name, .signature-block .title {
            font-weight: 600;
            letter-spacing: 1px;
            color: var(--modern-dark);
            padding: 2px;
        }
        .signature-block .title { font-size: 0.9rem; font-weight: 300; }
        [contenteditable="true"]:focus {
            outline: none;
        }

        /* --- FLOATING PROPERTIES PANEL --- */
        /* Properties panel moved to sidebar - removing old styles */

        /* Element Selection Styles - adjusted to avoid delete button overlap */
        .dynamic-element.selected {
            outline: 2px solid #007bff !important;
            outline-offset: 3px !important;
            border: 2px solid transparent !important;
        }

        .dynamic-element:hover:not(.selected) {
            outline: 1px dashed rgba(0, 123, 255, 0.5) !important;
        }

        /* Simple delete button styles */
        .delete-btn:hover {
            background: #c82333 !important;
            transform: scale(1.1);
        }
        `}
      </style>

      {/* Parent container with converted body styles using Tailwind */}
      <div className="bg-transparent flex flex-col items-center justify-center min-h-auto m-0 p-0 font-sans" style={{fontFamily: "'Roboto', sans-serif"}}>
        <div className="certificate-wrapper landscape-mode" id="certificate-wrapper">
        <canvas id="background-canvas" width="3508" height="2480"></canvas>
        
        <div className="certificate-container" id="certificate-foreground">
          <div id="dynamic-elements-container">
            {/* DOM-based elements (logos and text) are added here dynamically */}
          </div>

          <div className="certificate-content">
            {/* Default state message - only visible when no template is active */}
            <div id="default-placeholder-text" className="default-message" style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              color: '#9ca3af',
              fontSize: '16px',
              fontFamily: 'Roboto, sans-serif',
              opacity: '1',
              visibility: 'visible',
              transition: 'all 0.3s ease',
              pointerEvents: 'none',
              zIndex: '5'
            }}>
              <div style={{ marginBottom: '8px', fontSize: '18px', fontWeight: '500' }}>
                Certificate Editor
              </div>
              <div style={{ fontSize: '14px' }}>
                Select a template or add elements to get started
              </div>
            </div>
            
            <footer className="footer-content" style={{ display: 'none' }}>
              <div className="signature-block">
                <label htmlFor="upload-sig-1" className="signature-line" id="sig-line-1"></label>
                <p className="name" contentEditable="true" suppressContentEditableWarning={true}></p>
                <p className="title" contentEditable="true" suppressContentEditableWarning={true}></p>
              </div>
              <div className="signature-block">
                <label htmlFor="upload-sig-2" className="signature-line" id="sig-line-2"></label>
                <p className="name" contentEditable="true" suppressContentEditableWarning={true}></p>
                <p className="title" contentEditable="true" suppressContentEditableWarning={true}></p>
              </div>
              <div className="signature-block">
                <label htmlFor="upload-sig-3" className="signature-line" id="sig-line-3"></label>
                <p className="name" contentEditable="true" suppressContentEditableWarning={true}></p>
                <p className="title" contentEditable="true" suppressContentEditableWarning={true}></p>
              </div>
            </footer>
          </div>
        </div>
      </div>

      {/* Hidden controls for sidebar interaction */}
      <div style={{display: 'none'}}>
        <button id="add-text-btn" onClick={handleAddText}>Add some Text</button>
        <button id="add-logo-btn">Add Logo</button>
        <button id="download-pdf" onClick={handleDownloadPDF}>Download PDF</button>
        {/* PHASE 2: AI Background Generation */}
        {/* <button id="ai-generate-btn">Generate AI</button> */}
        {/* <input type="text" id="ai-prompt-input" /> */}
        
        {/* Hidden file inputs */}
        <input type="file" id="upload-sig-1" accept="image/*" />
        <input type="file" id="upload-sig-2" accept="image/*" />
        <input type="file" id="upload-sig-3" accept="image/*" />
        <input type="file" id="upload-logo-dynamic" accept="image/*" />
      </div>
      </div> {/* Close parent container with body styles */}
    </>
  );
};

export default Canvas;
