import React, { useState, useEffect } from 'react';
import { getAvailableTemplates, loadTemplateHtml } from '../utils/domUtils';

const TemplateLoader = ({ onTemplateSelect, selectedTemplateId }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const availableTemplates = await getAvailableTemplates();
      setTemplates(availableTemplates);
    } catch (err) {
      setError('Failed to load templates');
      console.error('Error loading templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateClick = async (template) => {
    try {
      setError('');
      const htmlContent = await loadTemplateHtml(template.preview);
      onTemplateSelect(template, htmlContent);
    } catch (err) {
      setError(`Failed to load template: ${template.name}`);
      console.error('Error loading template:', err);
    }
  };

  const groupedTemplates = templates.reduce((acc, template) => {
    const category = template.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(template);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <i className="fas fa-file-alt text-blue-600 mr-3"></i>
          Select Template
        </h3>
        <div className="flex items-center justify-center py-8">
          <i className="fas fa-spinner fa-spin text-blue-600 text-2xl mr-3"></i>
          <span className="text-gray-600">Loading templates...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <i className="fas fa-file-alt text-blue-600 mr-3"></i>
        Select Template
      </h3>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <div className="flex items-center">
            <i className="fas fa-exclamation-triangle text-red-600 mr-2"></i>
            <span className="text-red-800 text-sm">{error}</span>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
          <div key={category}>
            <h4 className="text-sm font-medium text-gray-700 mb-3 uppercase tracking-wide">
              {category}
            </h4>
            <div className="grid gap-3">
              {categoryTemplates.map((template) => (
                <div
                  key={template.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
                    selectedTemplateId === template.id
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleTemplateClick(template)}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      selectedTemplateId === template.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      <i className="fas fa-certificate text-sm"></i>
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900 mb-1">
                        {template.name}
                        {selectedTemplateId === template.id && (
                          <i className="fas fa-check-circle text-blue-600 ml-2"></i>
                        )}
                      </h5>
                      <p className="text-sm text-gray-600 mb-2">
                        {template.description}
                      </p>
                      <div className="flex items-center text-xs text-gray-500">
                        <i className="fas fa-tag mr-1"></i>
                        {category}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {templates.length === 0 && !loading && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-file-alt text-2xl text-gray-400"></i>
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Templates Found</h4>
          <p className="text-gray-600 text-sm">
            No certificate templates are available in the templates directory.
          </p>
        </div>
      )}
    </div>
  );
};

export default TemplateLoader;
