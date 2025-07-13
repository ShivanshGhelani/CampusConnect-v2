import React, { useState, useRef, useEffect } from 'react';
import { updateHtmlWithFields } from '../utils/domUtils';

const CertificateCanvas = ({ 
  templateHtml, 
  fields, 
  onFieldSelect, 
  selectedFieldId, 
  onFieldUpdate 
}) => {
  const iframeRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (templateHtml && fields) {
      updatePreview();
    }
  }, [templateHtml, fields]);

  const updatePreview = () => {
    if (!templateHtml || !iframeRef.current) return;

    setIsLoading(true);
    
    try {
      const updatedHtml = updateHtmlWithFields(templateHtml, fields);
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      
      doc.open();
      doc.write(updatedHtml);
      doc.close();

      // Add click handlers for editable elements after content loads
      setTimeout(() => {
        addClickHandlers(doc);
        setIsLoading(false);
      }, 100);
    } catch (error) {
      console.error('Error updating preview:', error);
      setIsLoading(false);
    }
  };

  const addClickHandlers = (doc) => {
    const editableElements = doc.querySelectorAll('[data-editable]');
    
    editableElements.forEach(element => {
      const fieldId = element.getAttribute('data-editable');
      
      // Remove existing event listeners
      element.removeEventListener('click', handleElementClick);
      
      // Add click handler
      element.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleElementClick(fieldId, element);
      });

      // Add hover effects
      element.style.cursor = 'pointer';
      element.style.transition = 'all 0.2s ease';
      
      element.addEventListener('mouseenter', () => {
        if (selectedFieldId !== fieldId) {
          element.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
          element.style.outline = '2px dashed rgba(59, 130, 246, 0.3)';
        }
      });
      
      element.addEventListener('mouseleave', () => {
        if (selectedFieldId !== fieldId) {
          element.style.backgroundColor = '';
          element.style.outline = '';
        }
      });

      // Highlight selected element
      if (selectedFieldId === fieldId) {
        element.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
        element.style.outline = '2px solid rgba(59, 130, 246, 0.5)';
      } else {
        element.style.backgroundColor = '';
        element.style.outline = '';
      }
    });
  };

  const handleElementClick = (fieldId, element) => {
    if (onFieldSelect) {
      onFieldSelect(fieldId, element);
    }
  };

  if (!templateHtml) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-certificate text-3xl text-gray-400"></i>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Template Selected</h3>
          <p className="text-gray-600">
            Choose a template from the sidebar to start editing your certificate.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Canvas Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <i className="fas fa-eye text-blue-600"></i>
            <h3 className="text-lg font-semibold text-gray-900">Certificate Preview</h3>
            {isLoading && (
              <i className="fas fa-spinner fa-spin text-blue-600"></i>
            )}
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <i className="fas fa-info-circle"></i>
            <span>Click on any text to edit</span>
          </div>
        </div>
      </div>

      {/* Canvas Content */}
      <div className="p-4">
        <div className="relative">
          {isLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
              <div className="flex items-center space-x-3">
                <i className="fas fa-spinner fa-spin text-blue-600 text-xl"></i>
                <span className="text-gray-600">Updating preview...</span>
              </div>
            </div>
          )}
          
          <iframe
            ref={iframeRef}
            className="w-full border border-gray-300 rounded-lg shadow-sm"
            style={{ 
              height: '600px',
              minHeight: '500px'
            }}
            title="Certificate Preview"
            sandbox="allow-same-origin allow-scripts"
          />
        </div>
      </div>

      {/* Canvas Footer */}
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <div className="w-3 h-3 bg-blue-200 rounded mr-2"></div>
              Hover to highlight
            </span>
            <span className="flex items-center">
              <div className="w-3 h-3 bg-blue-400 rounded mr-2"></div>
              Selected for editing
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span>{fields ? fields.length : 0} editable fields</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateCanvas;
