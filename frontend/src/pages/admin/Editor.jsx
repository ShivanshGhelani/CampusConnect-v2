import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractEditableElements } from '../../utils/domUtils';
import { exportFromIframe, generateFilename } from '../../utils/exportUtils';

function Editor() {
  const navigate = useNavigate();
  
  // Core state
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateHtml, setTemplateHtml] = useState('');
  const [editableFields, setEditableFields] = useState([]);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [orientation, setOrientation] = useState('landscape'); // 'landscape' or 'portrait'
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Refs
  const canvasRef = useRef(null);

  const handleBackToAdmin = () => {
    navigate('/admin/dashboard');
  };

  // Load available templates
  React.useEffect(() => {
    loadAvailableTemplates();
  }, []);

  const loadAvailableTemplates = async () => {
    try {
      const templates = [
        {
          id: 'modern',
          name: 'Modern Certificate',
          category: 'Business',
          thumbnail: '/templates/modern-certificate.html',
          file: 'modern-certificate.html'
        },
        {
          id: 'classic',
          name: 'Classic Certificate',
          category: 'Academic',
          thumbnail: '/templates/classic-certificate.html',
          file: 'classic-certificate.html'
        },
        {
          id: 'elegant',
          name: 'Elegant Certificate',
          category: 'Achievement',
          thumbnail: '/templates/elegant-certificate.html',
          file: 'elegant-certificate.html'
        }
      ];
      setAvailableTemplates(templates);
    } catch (err) {
      setError('Failed to load templates');
    }
  };

  // Template selection handler
  const handleTemplateSelect = async (template) => {
    try {
      setLoading(true);
      
      // Load template HTML
      const response = await fetch(`/templates/${template.file}`);
      if (!response.ok) throw new Error('Failed to load template');
      
      const htmlContent = await response.text();
      
      setSelectedTemplate(template);
      setTemplateHtml(htmlContent);
      
      // Extract editable fields from the HTML
      const fields = extractEditableElements(htmlContent);
      setEditableFields(fields);
      setSelectedFieldId(null);
      
      setSuccess(`Template "${template.name}" loaded successfully!`);
    } catch (err) {
      setError('Failed to load template');
      console.error('Template loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Field selection handler
  const handleFieldSelect = (fieldId) => {
    setSelectedFieldId(fieldId);
  };

  // Field update handler
  const handleFieldUpdate = (fieldId, updates) => {
    setEditableFields(prevFields => 
      prevFields.map(field => 
        field.id === fieldId 
          ? { ...field, ...updates }
          : field
      )
    );
  };

  // Export handler
  const handleExport = async (format) => {
    try {
      if (!canvasRef.current) {
        throw new Error('Canvas not available for export');
      }

      const iframe = canvasRef.current.querySelector('iframe');
      if (!iframe) {
        throw new Error('Certificate preview not available');
      }

      // Generate meaningful filename
      const templateName = selectedTemplate ? selectedTemplate.name.toLowerCase().replace(/\s+/g, '-') : 'certificate';
      const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const orientationSuffix = orientation === 'portrait' ? '-portrait' : '-landscape';
      const filename = `${templateName}${orientationSuffix}-${timestamp}`;

      await exportFromIframe(iframe, format, filename);
      setSuccess(`Certificate exported as ${filename}.${format}`);
      setShowDownloadModal(false);
    } catch (err) {
      setError(`Failed to export certificate: ${err.message}`);
    }
  };

  // Update HTML with current field values
  const getUpdatedHtml = () => {
    if (!templateHtml) return '';
    
    let updatedHtml = templateHtml;
    editableFields.forEach(field => {
      const regex = new RegExp(`data-editable="${field.id}"[^>]*>([^<]*)`, 'g');
      updatedHtml = updatedHtml.replace(regex, (match) => {
        const beforeContent = match.substring(0, match.lastIndexOf('>') + 1);
        return beforeContent + field.content;
      });
    });
    
    return updatedHtml;
  };

  // Get selected field object
  const selectedField = editableFields.find(field => field.id === selectedFieldId);

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Top Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBackToAdmin}
            className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Back
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <i className="fas fa-certificate text-white text-sm"></i>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Certificate Editor</h1>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Template Selection Dropdown */}
          <div className="relative">
            <select
              value={selectedTemplate?.id || ''}
              onChange={(e) => {
                const template = availableTemplates.find(t => t.id === e.target.value);
                if (template) handleTemplateSelect(template);
              }}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium text-gray-700"
            >
              <option value="">Select Template...</option>
              {availableTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.category})
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <i className="fas fa-chevron-down text-gray-400 text-sm"></i>
            </div>
          </div>

          {/* Orientation Toggle */}
          <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setOrientation('landscape')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                orientation === 'landscape' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <i className="fas fa-expand-arrows-alt mr-1"></i>
              Landscape
            </button>
            <button
              onClick={() => setOrientation('portrait')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                orientation === 'portrait' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <i className="fas fa-arrows-alt-v mr-1"></i>
              Portrait
            </button>
          </div>

          {/* Download Button */}
          <button
            onClick={() => setShowDownloadModal(true)}
            disabled={!selectedTemplate}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedTemplate
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <i className="fas fa-download mr-2"></i>
            Download
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Sidebar - Field Editor */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {selectedField ? 'Edit Field' : 'Certificate Editor'}
            </h2>
            <p className="text-sm text-gray-600">
              {selectedField ? 'Customize the selected element' : 'Select a template and click on any text to edit'}
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            {selectedField ? (
              <div className="space-y-6">
                {/* Text Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Text Content
                  </label>
                  <textarea
                    value={selectedField.content || ''}
                    onChange={(e) => handleFieldUpdate(selectedField.id, { content: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                </div>

                {/* Font Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Font Size
                  </label>
                  <input
                    type="range"
                    min="12"
                    max="48"
                    value={parseInt(selectedField.styles?.fontSize) || 16}
                    onChange={(e) => handleFieldUpdate(selectedField.id, { 
                      styles: { ...selectedField.styles, fontSize: `${e.target.value}px` }
                    })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>12px</span>
                    <span>{parseInt(selectedField.styles?.fontSize) || 16}px</span>
                    <span>48px</span>
                  </div>
                </div>

                {/* Text Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Text Color
                  </label>
                  <input
                    type="color"
                    value={selectedField.styles?.color || '#000000'}
                    onChange={(e) => handleFieldUpdate(selectedField.id, { 
                      styles: { ...selectedField.styles, color: e.target.value }
                    })}
                    className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Font Weight */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Font Weight
                  </label>
                  <select
                    value={selectedField.styles?.fontWeight || 'normal'}
                    onChange={(e) => handleFieldUpdate(selectedField.id, { 
                      styles: { ...selectedField.styles, fontWeight: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="bold">Bold</option>
                    <option value="lighter">Light</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <i className="fas fa-info text-white text-xs"></i>
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">How to Edit</h4>
                      <p className="text-sm text-blue-700">
                        1. Select a template from the dropdown above<br/>
                        2. Click on any text in the preview to edit it<br/>
                        3. Use the controls here to customize the text
                      </p>
                    </div>
                  </div>
                </div>

                {/* Certificate Info */}
                {selectedTemplate && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Current Template</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div><strong>Name:</strong> {selectedTemplate.name}</div>
                      <div><strong>Category:</strong> {selectedTemplate.category}</div>
                      <div><strong>Orientation:</strong> {orientation.charAt(0).toUpperCase() + orientation.slice(1)}</div>
                      <div><strong>Editable Fields:</strong> {editableFields.length}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 bg-gray-100 flex items-center justify-center overflow-hidden">
          {selectedTemplate ? (
            <div 
              ref={canvasRef}
              className={`bg-white shadow-lg ${
                orientation === 'landscape' ? 'w-[850px] h-[600px]' : 'w-[600px] h-[850px]'
              }`}
              style={{ 
                maxWidth: '90%',
                maxHeight: '90%',
                transform: 'scale(0.85)',
                transformOrigin: 'center'
              }}
            >
              {templateHtml && (
                <iframe
                  srcDoc={getUpdatedHtml()}
                  className="w-full h-full border-0"
                  onLoad={(e) => {
                    const iframe = e.target;
                    const doc = iframe.contentDocument;
                    if (doc) {
                      // Add click handlers for editable elements
                      const editableElements = doc.querySelectorAll('[data-editable]');
                      editableElements.forEach(element => {
                        element.style.cursor = 'pointer';
                        element.style.outline = '2px dashed transparent';
                        element.style.transition = 'outline 0.2s';
                        
                        element.addEventListener('mouseenter', () => {
                          element.style.outline = '2px dashed #3b82f6';
                        });
                        
                        element.addEventListener('mouseleave', () => {
                          element.style.outline = selectedFieldId === element.getAttribute('data-editable') 
                            ? '2px solid #3b82f6' 
                            : '2px dashed transparent';
                        });
                        
                        element.addEventListener('click', (e) => {
                          e.preventDefault();
                          const fieldId = element.getAttribute('data-editable');
                          handleFieldSelect(fieldId);
                          
                          // Update outline for selected element
                          doc.querySelectorAll('[data-editable]').forEach(el => {
                            el.style.outline = el === element ? '2px solid #3b82f6' : '2px dashed transparent';
                          });
                        });
                      });
                    }
                  }}
                />
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-certificate text-gray-500 text-3xl"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Template Selected</h3>
              <p className="text-gray-600">Choose a template from the dropdown above to start editing</p>
            </div>
          )}
        </div>
      </div>

      {/* Download Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999]">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Download Certificate</h3>
              <button
                onClick={() => setShowDownloadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <p className="text-gray-600 mb-6">Choose your preferred download format:</p>
            
            <div className="space-y-3">
              <button
                onClick={() => handleExport('png')}
                className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-image text-blue-600"></i>
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">PNG Image</div>
                    <div className="text-sm text-gray-500">High quality image format</div>
                  </div>
                </div>
                <i className="fas fa-download text-gray-400"></i>
              </button>
              
              <button
                onClick={() => handleExport('pdf')}
                className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-file-pdf text-red-600"></i>
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">PDF Document</div>
                    <div className="text-sm text-gray-500">Perfect for printing</div>
                  </div>
                </div>
                <i className="fas fa-download text-gray-400"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success/Error Messages */}
      {success && (
        <div className="fixed top-4 right-4 z-[99999] animate-in slide-in-from-right duration-300">
          <div className="bg-white border border-green-200 rounded-lg shadow-lg p-4 flex items-center space-x-3 max-w-sm">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <i className="fas fa-check text-green-600 text-sm"></i>
            </div>
            <div className="flex-1">
              <p className="text-green-800 font-medium text-sm">{success}</p>
            </div>
            <button
              onClick={() => setSuccess('')}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="fas fa-times text-sm"></i>
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed top-4 right-4 z-[99999] animate-in slide-in-from-right duration-300">
          <div className="bg-white border border-red-200 rounded-lg shadow-lg p-4 flex items-center space-x-3 max-w-sm">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <i className="fas fa-exclamation-triangle text-red-600 text-sm"></i>
            </div>
            <div className="flex-1">
              <p className="text-red-800 font-medium text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError('')}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="fas fa-times text-sm"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Editor;
