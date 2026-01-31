import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import CertificateCanvas from './CertificateCanvas';
import ElementProperties from './ElementProperties';
import ImageProperties from './ImageProperties';
import TemplateManager from './TemplateManager';

const Layout = () => {
  const [selectedElement, setSelectedElement] = useState(null);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const canvasRef = useRef(null);

  const handleAddText = () => {
    if (canvasRef.current && canvasRef.current.addTextElement) {
      canvasRef.current.addTextElement();
    }
  };

  const handleTemplateLoad = (template) => {
    console.log('Template load started:', template);
    console.log('Template elements:', template.elements);
    console.log('Template orientation:', template.orientation);
    console.log('Template background:', template.backgroundImage);
    setCurrentTemplate(template);
    
    // Hide the default placeholder text when template is loaded
    const placeholderText = document.getElementById('default-placeholder-text');
    if (placeholderText) {
      placeholderText.style.display = 'none';
    }
    
    // Load background image if template has one
    if (template.backgroundImage) {
      if (window.setBackgroundImage) {
        window.setBackgroundImage(template.backgroundImage);
      }
    } else if (window.drawBackground && typeof window.drawBackground === 'function') {
      // Use default background drawing if no background image
      window.drawBackground();
    }
    
    // Note: Canvas dimensions are now controlled by DimensionSelector
    // No need to change canvas dimensions here - just use what's already set
    
    // Populate signature placeholders when template is loaded
    populateSignaturePlaceholders();
    
    // Clear existing template elements
    const container = document.getElementById('dynamic-elements-container');
    console.log('Container found:', !!container);
    if (container) {
      // Remove only template elements, keep regular elements
      const templateElements = container.querySelectorAll('.template-element');
      templateElements.forEach(el => el.remove());
      
      // Add new template elements
      console.log('Creating', template.elements.length, 'template elements');
      template.elements.forEach((elementData, index) => {
        console.log('Creating element', index, ':', elementData);
        const element = createTemplateElement(elementData);
        container.appendChild(element);
        console.log('Element created and added:', element);
      });
    }
  };

  const handleTemplateReset = () => {
    setCurrentTemplate(null);
    
    // Remove template-active class to return to default state
    const wrapper = document.getElementById('certificate-wrapper');
    if (wrapper) {
      wrapper.classList.remove('template-active', 'landscape-mode', 'portrait-mode');
    }
    
    // Reset to default background (ornate design)
    if (window.resetBackground) {
      window.resetBackground();
    } else if (window.drawBackground && typeof window.drawBackground === 'function') {
      window.drawBackground();
    }
    
    // Clear signature placeholders
    clearSignaturePlaceholders();
    
    // Clear template elements
    const container = document.getElementById('dynamic-elements-container');
    if (container) {
      const templateElements = container.querySelectorAll('.template-element');
      templateElements.forEach(el => el.remove());
    }

    // Show placeholder text when template is reset
    const placeholderText = document.getElementById('default-placeholder-text');
    if (placeholderText) {
      placeholderText.style.display = 'block';
    }
  };

  const populateSignaturePlaceholders = () => {
    const signatureNames = document.querySelectorAll('.signature-block .name');
    const signatureTitles = document.querySelectorAll('.signature-block .title');
    
    const defaultNames = ['{{ Organizer\'s Name }}', '{{ HOD\'s Name }}', '{{ Principal\'s Name }}'];
    const defaultTitles = ['Organizer', 'Head of Department', 'Principal'];
    
    signatureNames.forEach((nameEl, index) => {
      if (index < defaultNames.length) {
        nameEl.textContent = defaultNames[index];
      }
    });
    
    signatureTitles.forEach((titleEl, index) => {
      if (index < defaultTitles.length) {
        titleEl.textContent = defaultTitles[index];
      }
    });
  };

  const clearSignaturePlaceholders = () => {
    const signatureNames = document.querySelectorAll('.signature-block .name');
    const signatureTitles = document.querySelectorAll('.signature-block .title');
    
    signatureNames.forEach(nameEl => {
      nameEl.textContent = '';
    });
    
    signatureTitles.forEach(titleEl => {
      titleEl.textContent = '';
    });
  };

  const createTemplateElement = (elementData) => {
    // Use the universal element creator if available for full functionality
    if (window.universalElementCreator) {
      const element = window.universalElementCreator.createElement({
        type: 'text',
        content: elementData.content,
        customStyles: {
          width: 200,
          height: 50
        }
      });
      
      // Apply template-specific positioning and styling
      element.style.left = `${elementData.x}px`;
      element.style.top = `${elementData.y}px`;
      element.className = 'template-element dynamic-element universal-element';
      element.dataset.templateId = elementData.id;
      
      // Apply template-specific text styling to the inner text element
      const textElement = element.querySelector('div[contenteditable]') || element.querySelector('div');
      if (textElement) {
        textElement.style.fontSize = `${elementData.fontSize}px`;
        textElement.style.fontFamily = `'${elementData.fontFamily}', serif`;
        textElement.style.fontWeight = elementData.fontWeight || 'normal';
        textElement.style.color = elementData.color;
        textElement.style.textAlign = elementData.textAlign || 'center';
        textElement.textContent = elementData.content;
      }
      
      return element;
    }
    
    // Fallback to original implementation if universal creator not available
    const element = document.createElement('div');
    element.className = 'template-element dynamic-element';
    element.dataset.type = elementData.type;
    element.dataset.templateId = elementData.id;
    
    // Create the element structure similar to regular dynamic elements
    const { content } = elementData;
    element.innerHTML = `<span>${content}</span><div class="resize-handle"></div><button class="remove-btn">&times;</button>`;
    
    // Apply positioning and styling
    element.style.cssText = `
      position: absolute;
      left: ${elementData.x}px;
      top: ${elementData.y}px;
      font-size: ${elementData.fontSize}px;
      font-family: '${elementData.fontFamily}', serif;
      font-weight: ${elementData.fontWeight || 'normal'};
      color: ${elementData.color};
      text-align: ${elementData.textAlign || 'center'};
      background: transparent;
      border: 2px solid transparent;
      outline: none;
      cursor: pointer;
      padding: 8px;
      z-index: 15;
      user-select: none;
      min-width: 100px;
      min-height: 30px;
      border-radius: 4px;
      box-sizing: border-box;
      word-wrap: break-word;
      width: auto;
      height: auto;
    `;
    
    // Make template elements fully interactive like regular elements
    makeTemplateElementInteractive(element, elementData);
    
    return element;
  };

  // Function to make template elements interactive with drag, edit, and delete
  const makeTemplateElementInteractive = (element, elementData) => {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    // Add drag functionality
    element.addEventListener('mousedown', dragMouseDown);
    
    // Add double-click to edit
    element.addEventListener('dblclick', handleDoubleClick);
    
    // Add delete button functionality
    const removeBtn = element.querySelector('.remove-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (selectedElement === element) {
          setSelectedElement(null);
        }
        element.remove();
      });
    }

    function dragMouseDown(e) {
      if (e.target.classList.contains('resize-handle') || e.target.classList.contains('remove-btn')) return;
      
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;

      // Select the element
      selectTemplateElement(element);
    }

    function elementDrag(e) {
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      element.style.top = (element.offsetTop - pos2) + "px";
      element.style.left = (element.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }

    function handleDoubleClick() {
      // Enable text editing
      const spanElement = element.querySelector('span');
      if (spanElement) {
        spanElement.setAttribute('contenteditable', 'true');
        spanElement.focus();
        
        // Select all text for easy editing
        const range = document.createRange();
        range.selectNodeContents(spanElement);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
    
    // Handle blur to stop editing
    const spanElement = element.querySelector('span');
    if (spanElement) {
      spanElement.addEventListener('blur', () => {
        spanElement.setAttribute('contenteditable', 'false');
      });
    }

    // Add resize functionality
    const resizer = element.querySelector('.resize-handle');
    if (resizer) {
      resizer.onmousedown = initResize;
    }

    function initResize(e) {
      e.preventDefault();
      e.stopPropagation();
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResize);
    }

    function resize(e) {
      element.style.width = (e.clientX - element.getBoundingClientRect().left) + 'px';
      element.style.height = (e.clientY - element.getBoundingClientRect().top) + 'px';
    }

    function stopResize() {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResize);
    }
  };

  // Function to select template elements
  const selectTemplateElement = (element) => {
    // Clear other selections
    document.querySelectorAll('.dynamic-element').forEach(el => {
      el.style.border = '2px solid transparent';
      el.classList.remove('selected');
    });
    
    // Select this element
    element.style.border = '2px solid #3b82f6';
    element.classList.add('selected');
    
    setSelectedElement(element);
  };

  useEffect(() => {
    const handleElementSelection = (event) => {
      console.log('Element selected event received:', event.detail);
      setSelectedElement(event.detail);
    };

    const handleElementDeselection = (event) => {
      console.log('Element deselected event received');
      setSelectedElement(null);
    };

    const handleTemplateLoadEvent = (event) => {
      if (event.detail) {
        handleTemplateLoad(event.detail);
      }
    };

    const handleTemplateLoadRequest = (event) => {
      const { templateId, dimension } = event.detail;
      console.log('Template load requested:', templateId, 'for dimension:', dimension);
      
      // Trigger the template load through TemplateManager
      const templateLoadEvent = new CustomEvent('loadTemplateById', {
        detail: {
          templateId: templateId,
          dimension: dimension
        }
      });
      window.dispatchEvent(templateLoadEvent);
    };

    // Listen on window for the events dispatched by element-selection.js
    window.addEventListener('elementSelected', handleElementSelection);
    window.addEventListener('elementDeselected', handleElementDeselection);
    window.addEventListener('loadTemplate', handleTemplateLoadEvent);
    window.addEventListener('templateLoadRequested', handleTemplateLoadRequest);

    return () => {
      window.removeEventListener('elementSelected', handleElementSelection);
      window.removeEventListener('elementDeselected', handleElementDeselection);
      window.removeEventListener('loadTemplate', handleTemplateLoadEvent);
      window.removeEventListener('templateLoadRequested', handleTemplateLoadRequest);
    };
  }, []);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar onTemplateLoad={handleTemplateLoad} />
      {/* Hidden TemplateManager for event handling */}
      <TemplateManager onTemplateLoad={handleTemplateLoad} hideUI={true} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onAddText={handleAddText} onTemplateReset={handleTemplateReset} />
        {selectedElement && selectedElement.tagName === 'IMG' ? (
          <ImageProperties selectedElement={selectedElement} />
        ) : selectedElement && selectedElement.dataset?.type === 'text' ? (
          <ElementProperties selectedElement={selectedElement} />
        ) : null}
        <div className='flex-1 flex items-center justify-center overflow-auto p-4 bg-gray-200'>
          <div className="certificate-display-wrapper" style={{
            transform: 'scale(1)',
            transformOrigin: 'center',
            maxWidth: '100%',
            maxHeight: '100%'
          }}>
            <CertificateCanvas onTextElementsChange={canvasRef} template={currentTemplate} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;
