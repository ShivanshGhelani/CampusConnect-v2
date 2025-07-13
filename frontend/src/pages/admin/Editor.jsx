import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import TemplateLoader from '../../components/TemplateLoader';
import CertificateCanvas from '../../components/CertificateCanvas';
import SidebarEditor from '../../components/SidebarEditor';
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
  
  // Refs
  const canvasRef = useRef(null);

  const handleBackToAdmin = () => {
    navigate('/admin/dashboard');
  };

  // Effects for notifications
  React.useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Template selection handler
  const handleTemplateSelect = async (template, htmlContent) => {
    try {
      setSelectedTemplate(template);
      setTemplateHtml(htmlContent);
      
      // Extract editable fields from the HTML
      const fields = extractEditableElements(htmlContent);
      setEditableFields(fields);
      setSelectedFieldId(null);
      
      setSuccess(`Template "${template.name}" loaded successfully!`);
    } catch (err) {
      setError('Failed to process template');
      console.error('Template processing error:', err);
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

      const filename = generateFilename(
        selectedTemplate ? selectedTemplate.name.toLowerCase().replace(/\s+/g, '-') : 'certificate',
        format
      );

      await exportFromIframe(iframe, format, filename);
      setSuccess(`Certificate exported as ${format.toUpperCase()} successfully!`);
    } catch (err) {
      setError(`Failed to export certificate: ${err.message}`);
      console.error('Export error:', err);
    }
  };

  // Get selected field object
  const selectedField = editableFields.find(field => field.id === selectedFieldId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header with Back Button */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToAdmin}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Back to Admin Panel
              </button>
              
              <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg">
                <i className="fas fa-magic text-white text-xl"></i>
              </div>
              
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 via-rose-600 to-red-600 bg-clip-text text-transparent">
                  Universal Certificate Editor
                </h1>
                <p className="text-gray-600 mt-1">Create and customize professional certificates with ease</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {success && (
        <div className="fixed top-4 right-4 z-[99999] animate-in slide-in-from-right duration-300">
          <div className="bg-white border border-green-200 rounded-xl shadow-xl p-4 flex items-center space-x-3 max-w-sm">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <i className="fas fa-check text-green-600 text-sm"></i>
            </div>
            <div className="flex-1">
              <p className="text-green-800 font-medium text-sm">{success}</p>
            </div>
            <button
              onClick={() => setSuccess('')}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <i className="fas fa-times text-sm"></i>
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed top-4 right-4 z-[99999] animate-in slide-in-from-right duration-300">
          <div className="bg-white border border-red-200 rounded-xl shadow-xl p-4 flex items-center space-x-3 max-w-sm">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <i className="fas fa-exclamation-triangle text-red-600 text-sm"></i>
            </div>
            <div className="flex-1">
              <p className="text-red-800 font-medium text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError('')}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <i className="fas fa-times text-sm"></i>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Template Loader */}
          <div className="lg:col-span-1">
            <TemplateLoader
              onTemplateSelect={handleTemplateSelect}
              selectedTemplateId={selectedTemplate?.id}
            />
          </div>

          {/* Center - Certificate Canvas */}
          <div className="lg:col-span-2" ref={canvasRef}>
            <CertificateCanvas
              templateHtml={templateHtml}
              fields={editableFields}
              onFieldSelect={handleFieldSelect}
              selectedFieldId={selectedFieldId}
              onFieldUpdate={handleFieldUpdate}
            />
          </div>

          {/* Right Sidebar - Field Editor */}
          <div className="lg:col-span-1">
            <SidebarEditor
              selectedField={selectedField}
              onFieldUpdate={handleFieldUpdate}
              onExport={handleExport}
            />
          </div>
        </div>

        {/* Quick Help Section */}
        {!selectedTemplate && (
          <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-lg p-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-pink-500 to-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-rocket text-white text-3xl"></i>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Get Started with Certificate Editor</h3>
              <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                Welcome to the Universal Certificate Editor! Create beautiful, professional certificates in minutes. 
                Our smart editor automatically detects editable fields in any template and provides intuitive controls for customization.
              </p>
              
              <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <div className="bg-blue-50 rounded-xl p-6">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-mouse-pointer text-white"></i>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">1. Choose Template</h4>
                  <p className="text-sm text-gray-600">
                    Select from our collection of professional certificate templates. Each template is fully customizable.
                  </p>
                </div>
                
                <div className="bg-green-50 rounded-xl p-6">
                  <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-edit text-white"></i>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">2. Edit Content</h4>
                  <p className="text-sm text-gray-600">
                    Click on any text in the preview to edit. Customize fonts, colors, and content to match your needs.
                  </p>
                </div>
                
                <div className="bg-purple-50 rounded-xl p-6">
                  <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-download text-white"></i>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">3. Export & Share</h4>
                  <p className="text-sm text-gray-600">
                    Export your finished certificate as PNG or PDF. Perfect for printing or digital distribution.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Editor;
