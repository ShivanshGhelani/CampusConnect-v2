// Simple DOM-based text element that matches logo implementation exactly

export const createSimpleTextElement = (
  text = 'Editable Text',
  options = {}
) => {
  const {
    fontSize = 24,
    fontFamily = 'Roboto',
    color = '#000000',
    fontWeight = 'normal',
    fontStyle = 'normal',
    textAlign = 'center',
    position = { x: 100, y: 100 },
    size = { width: 200, height: 50 }
  } = options;

  window.elementCounter = (window.elementCounter || 0) + 1;
  const element = document.createElement('div');
  element.className = 'dynamic-element';
  element.dataset.type = 'text';
  element.contentEditable = 'true';
  element.textContent = text;
  
  // Simple styling with fixed dimensions for resizing
  element.style.cssText = `
    position: absolute;
    font-family: '${fontFamily}', sans-serif;
    font-size: ${fontSize}px;
    color: ${color};
    font-weight: ${fontWeight};
    font-style: ${fontStyle};
    text-align: ${textAlign};
    background: transparent;
    border: 2px solid transparent;
    outline: none;
    cursor: move;
    padding: 8px;
    z-index: 10;
    user-select: text;
    width: ${size.width}px;
    height: ${size.height}px;
    min-height: 40px;
    border-radius: 4px;
    box-sizing: border-box;
    overflow: hidden;
    word-wrap: break-word;
    display: flex;
    align-items: center;
    justify-content: center;
    left: ${position.x}px;
    top: ${position.y}px;
  `;
  
  return element;
};

// Function to make text element interactive (exactly like logo)
export const makeTextElementInteractive = (element) => {
  let originalText = element.textContent; // Store original text for cancel functionality
  let userColor = element.style.color || '#34495e'; // Store user's chosen color
  
  // Add selection on click (exactly like logo implementation)
  element.addEventListener('click', (e) => {
    e.stopPropagation();
    
    // Clear other selections first
    document.querySelectorAll('.dynamic-element').forEach(el => {
      el.style.border = '2px solid transparent';
      el.classList.remove('selected');
      // Hide all resize handles
      el.querySelectorAll('.resize-handle').forEach(handle => handle.style.display = 'none');
    });
    
    // Remove all existing delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => btn.remove());
    
    // Select current element
    element.style.border = '2px solid #3b82f6';
    element.classList.add('selected');
    window.selectedElement = element;
    
    // Store current color before any operations
    if (element.style.color && element.style.color !== 'rgb(153, 153, 153)') {
      userColor = element.style.color;
    }
    
    // Force create and show delete button immediately
    createDeleteButtonForElement(element);
    
    // Clear placeholder text if user clicks on it
    if (element.textContent.trim() === 'Text must be present') {
      element.textContent = '';
      element.style.color = userColor; // Use stored color, not hardcoded
      element.style.fontStyle = 'normal';
      originalText = '';
      // Focus the element for immediate editing
      setTimeout(() => element.focus(), 10);
    }
    
    // Use the selectElement function if available (for resize handles)
    if (window.selectElement) {
      window.selectElement(element);
    }
  });
  
  // Create delete button function specifically for text elements
  function createDeleteButtonForElement(element) {
    // Remove existing delete button first
    const existingBtn = element.querySelector('.delete-btn');
    if (existingBtn) existingBtn.remove();
    
    // Create delete button with proper positioning above the border
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.title = 'Delete element';
    deleteBtn.style.cssText = `
      position: absolute !important;
      top: -15px !important;
      right: -15px !important;
      width: 28px !important;
      height: 28px !important;
      border-radius: 50% !important;
      background: #dc3545 !important;
      color: white !important;
      border: 3px solid white !important;
      cursor: pointer !important;
      font-size: 18px !important;
      font-weight: bold !important;
      z-index: 1005 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      box-shadow: 0 3px 10px rgba(0,0,0,0.4) !important;
      transition: all 0.2s ease !important;
      pointer-events: auto !important;
      visibility: visible !important;
      opacity: 1 !important;
      line-height: 1 !important;
    `;
    
    // Add click handler for deletion
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      // Confirm deletion
      if (confirm('Are you sure you want to delete this element?')) {
        element.remove();
        deleteBtn.remove();
        window.selectedElement = null;
        
        // Hide any remaining delete buttons
        document.querySelectorAll('.delete-btn').forEach(btn => btn.remove());
        
        // Dispatch event to hide text formatting panel
        const event = new CustomEvent('elementDeselected', { 
          detail: null
        });
        window.dispatchEvent(event);
      }
    });
    
    // Add hover effects
    deleteBtn.addEventListener('mouseenter', () => {
      deleteBtn.style.background = '#c82333';
      deleteBtn.style.transform = 'scale(1.1)';
      deleteBtn.style.boxShadow = '0 5px 15px rgba(220, 53, 69, 0.5)';
    });
    
    deleteBtn.addEventListener('mouseleave', () => {
      deleteBtn.style.background = '#dc3545';
      deleteBtn.style.transform = 'scale(1)';
      deleteBtn.style.boxShadow = '0 3px 10px rgba(0,0,0,0.4)';
    });
    
    element.appendChild(deleteBtn);
  }
  
  // Handle focus/blur for editing vs dragging
  element.addEventListener('focus', () => {
    // Store current color before clearing placeholder
    if (element.style.color && element.style.color !== 'rgb(153, 153, 153)') {
      userColor = element.style.color;
    }
    
    // Clear placeholder if present
    if (element.textContent.trim() === 'Text must be present') {
      element.textContent = '';
      element.style.color = userColor; // Restore user's color
      element.style.fontStyle = 'normal';
      originalText = ''; // Reset original text since we're starting fresh
    }
    
    element.style.cursor = 'text';
    element.style.outline = '2px solid #007bff';
    element.style.outlineOffset = '2px';
    element.style.backgroundColor = 'rgba(0, 123, 255, 0.05)';
    
    // Ensure delete button stays visible during editing
    const deleteBtn = element.querySelector('.delete-btn');
    if (deleteBtn) {
      deleteBtn.style.display = 'flex !important';
      deleteBtn.style.visibility = 'visible !important';
      deleteBtn.style.opacity = '1 !important';
    }
  });
  
  element.addEventListener('blur', () => {
    element.style.cursor = 'move';
    element.style.outline = 'none';
    element.style.backgroundColor = 'transparent';
    
    // Check if text is empty and add placeholder
    const text = element.textContent.trim();
    if (text === '') {
      element.style.color = '#999';
      element.textContent = 'Text must be present';
      element.style.fontStyle = 'italic';
      
      // Hide text formatting panel when no text
      const event = new CustomEvent('elementDeselected', { 
        detail: null
      });
      window.dispatchEvent(event);
    } else {
      originalText = element.textContent; // Update stored text after editing
      // Don't reset color - keep user's chosen color
      if (element.style.fontStyle === 'italic' && element.textContent !== 'Text must be present') {
        element.style.fontStyle = 'normal';
      }
    }
    
    // Ensure delete button remains visible after editing
    const deleteBtn = element.querySelector('.delete-btn');
    if (deleteBtn) {
      deleteBtn.style.display = 'flex !important';
      deleteBtn.style.visibility = 'visible !important';
      deleteBtn.style.opacity = '1 !important';
    }
    
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
  
  // Add beforeinput event to clear placeholder immediately when user types
  element.addEventListener('beforeinput', (e) => {
    // Store current color
    if (element.style.color && element.style.color !== 'rgb(153, 153, 153)') {
      userColor = element.style.color;
    }
    
    // Clear placeholder text immediately when user starts typing
    if (element.textContent.trim() === 'Text must be present') {
      element.textContent = '';
      element.style.color = userColor; // Restore user's color
      element.style.fontStyle = 'normal';
      originalText = '';
    }
  });
  
  // Add keyboard support for better editing experience
  element.addEventListener('keydown', (e) => {
    // Store current color
    if (element.style.color && element.style.color !== 'rgb(153, 153, 153)') {
      userColor = element.style.color;
    }
    
    // Clear placeholder text when user starts typing any character
    if (element.textContent.trim() === 'Text must be present' && 
        e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      element.textContent = '';
      element.style.color = userColor; // Restore user's color
      element.style.fontStyle = 'normal';
      originalText = '';
    }
    
    if (e.key === 'Escape') {
      // Cancel editing and restore original text
      e.preventDefault();
      if (originalText === '' || originalText === 'Text must be present') {
        element.style.color = '#999';
        element.textContent = 'Text must be present';
        element.style.fontStyle = 'italic';
      } else {
        element.textContent = originalText;
        // Restore user's color, don't reset to default
        element.style.color = userColor;
        element.style.fontStyle = 'normal';
      }
      element.blur();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      // Finish editing on Enter (unless Shift+Enter for new line)
      e.preventDefault();
      element.blur();
    }
  });
  
  // Add text validation and enhanced input handling
  element.addEventListener('input', () => {
    const text = element.textContent.trim();
    
    // Clear placeholder styling as soon as user types anything
    if (element.style.color === 'rgb(153, 153, 153)' || element.style.fontStyle === 'italic') {
      element.style.color = userColor; // Restore user's color, not hardcoded default
      element.style.fontStyle = 'normal';
    }
    
    // If text becomes empty after editing, show placeholder message
    if (text === '' || text === 'Text must be present') {
      setTimeout(() => {
        // Only show placeholder if still empty after a brief delay
        if (element.textContent.trim() === '') {
          element.style.color = '#999';
          element.textContent = 'Text must be present';
          element.style.fontStyle = 'italic';
          
          // Hide text formatting panel when no text
          const event = new CustomEvent('elementDeselected', { 
            detail: null
          });
          window.dispatchEvent(event);
        }
      }, 100);
    } else {
      // Show text formatting panel when text exists and element is selected
      if (element.classList.contains('selected')) {
        const event = new CustomEvent('elementSelected', { 
          detail: element
        });
        window.dispatchEvent(event);
      }
    }
    
    if (element.classList.contains('selected')) {
      // Ensure delete button stays visible during typing
      const deleteBtn = element.querySelector('.delete-btn');
      if (deleteBtn) {
        deleteBtn.style.display = 'flex !important';
        deleteBtn.style.visibility = 'visible !important';
        deleteBtn.style.opacity = '1 !important';
      }
      
      setTimeout(() => {
        // Check if handles exist, if not recreate them
        const handles = element.querySelectorAll('.resize-handle');
        if (handles.length === 0 && element.addResizeHandles) {
          element.addResizeHandles();
        }
        // Force show handles
        element.querySelectorAll('.resize-handle').forEach(handle => {
          handle.style.display = 'block';
        });
      }, 50);
    }
  });
  
  // Listen for style changes from ElementProperties and update stored color
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const currentColor = element.style.color;
        if (currentColor && currentColor !== 'rgb(153, 153, 153)' && currentColor !== '#999') {
          userColor = currentColor;
        }
      }
    });
  });
  
  observer.observe(element, {
    attributes: true,
    attributeFilter: ['style']
  });
  
  // Use the same makeElementDraggable function as logo
  if (window.makeElementDraggable) {
    window.makeElementDraggable(element);
  }
  
  return element;
};
