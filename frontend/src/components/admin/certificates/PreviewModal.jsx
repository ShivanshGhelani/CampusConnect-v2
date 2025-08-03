import React from 'react';

const PreviewModal = ({ template, isOpen, onClose }) => {
  if (!isOpen || !template) return null;

  const handleOpenInNewTab = () => {
    if (template.url) {
      window.open(template.url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-0 border w-full max-w-4xl shadow-lg rounded-xl bg-white max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">Template Preview</h3>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleOpenInNewTab}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open in New Tab
              </button>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Template Info */}
          <div className="mt-4 text-blue-100">
            <h4 className="text-lg font-medium">{template.name}</h4>
            <div className="flex items-center space-x-6 mt-2 text-sm">
              <span>Category: {template.category}</span>
              <span>Size: {template.file_size ? (template.file_size / 1024).toFixed(1) + ' KB' : 'Unknown'}</span>
              <span>Created: {template.created_at ? new Date(template.created_at).toLocaleDateString() : 'Unknown'}</span>
            </div>
          </div>
        </div>

        {/* Body - iframe for template preview */}
        <div className="p-6 bg-gray-50" style={{ height: 'calc(90vh - 200px)' }}>
          <div className="bg-white rounded-lg shadow-inner h-full overflow-hidden">
            {template.url ? (
              <iframe
                src={template.url}
                className="w-full h-full border-0 rounded-lg"
                title={`Preview of ${template.name}`}
                sandbox="allow-same-origin allow-scripts"
                onError={() => {
                  console.error('Failed to load template preview');
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-lg font-medium">Preview Not Available</p>
                  <p className="text-sm mt-2">Template URL not found or inaccessible</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Loading state for iframe */}
          <div className="absolute inset-0 bg-white flex items-center justify-center" id="preview-loading">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading template preview...</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {template.tags && template.tags.length > 0 && (
                <div className="flex items-center">
                  <span className="text-sm text-gray-600 mr-2">Tags:</span>
                  <div className="flex flex-wrap gap-1">
                    {template.tags.map((tag, index) => (
                      <span 
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Script to hide loading when iframe loads */}
      <script dangerouslySetInnerHTML={{
        __html: `
          setTimeout(() => {
            const loading = document.getElementById('preview-loading');
            if (loading) loading.style.display = 'none';
          }, 2000);
        `
      }} />
    </div>
  );
};

export default PreviewModal;
