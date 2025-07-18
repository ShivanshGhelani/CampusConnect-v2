import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { 
  listCertificateTemplates, 
  uploadCertificateTemplate, 
  deleteCertificateTemplate, 
  getCertificateTemplateStatistics,
  previewCertificateTemplate 
} from '../../api/axios';

// Certificate categories configuration
const CERTIFICATE_CATEGORIES = {
  'academic': {
    name: 'Academic / Educational',
    icon: '🎓',
    color: 'blue',
    templates: [
      'Certificate of Completion',
      'Certificate of Achievement', 
      'Certificate of Excellence',
      'Certificate of Participation',
      'Certificate of Merit',
      'Certificate of Appreciation for Teachers',
      'Internship Completion Certificate',
      'Workshop/Seminar Attendance Certificate'
    ]
  },
  'corporate': {
    name: 'Corporate / Professional',
    icon: '🏢',
    color: 'indigo',
    templates: [
      'Employee of the Month Certificate',
      'Certificate of Recognition',
      'Team Contribution Certificate',
      'Client Appreciation Certificate',
      'Sales Performance Award',
      'Leadership Excellence Certificate',
      'Training Completion Certificate'
    ]
  },
  'skill-based': {
    name: 'Skill-based / Talent Programs',
    icon: '🧠',
    color: 'purple',
    templates: [
      'Coding Bootcamp Certificate',
      'Language Course Certificate',
      'Design/Art Contest Participation',
      'Hackathon Winner/Participant Certificate',
      'Startup Pitch Recognition'
    ]
  },
  'creative': {
    name: 'Creative / Custom',
    icon: '🎨',
    color: 'pink',
    templates: [
      'Best Design Award',
      'Innovation Award',
      'Volunteer Service Certificate',
      'Student Council Membership',
      'Club Membership / Role Certificates'
    ]
  },
  'event-competition': {
    name: 'Event / Competition Based',
    icon: '🏆',
    color: 'yellow',
    templates: [
      '1st / 2nd / 3rd Place Certificate',
      'Sports Event Certificate',
      'Quiz / Olympiad Participation',
      'Debate / Elocution Certificate',
      'Science/Tech Fest Participation'
    ]
  }
};

function ManageCertificates() {
  // State for template management
  const [templates, setTemplates] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('academic');
  const [selectedTemplateType, setSelectedTemplateType] = useState('');
  const [customTemplateName, setCustomTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // Effects
  useEffect(() => {
    loadTemplates();
    loadStatistics();
  }, []);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Data loading functions
  const loadTemplates = async () => {
    try {
      const templatesList = await listCertificateTemplates();
      setTemplates(templatesList);
    } catch (error) {
      console.error('Error loading templates:', error);
      setError('Failed to load certificate templates');
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await getCertificateTemplateStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  // File handling functions
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      handleSingleFile(file);
    }
  };

  const handleSingleFile = (file) => {
    if (!file.type.includes('text/html') && !file.name.toLowerCase().endsWith('.html') && !file.name.toLowerCase().endsWith('.htm')) {
      setError('Please select a valid HTML file (.html or .htm).');
      return;
    }
    setSelectedFile(file);
    setError('');
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      handleSingleFile(files[0]);
    }
  };

  // Upload function
  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setError('Please select an HTML file to upload.');
      return;
    }

    if (!templateName.trim()) {
      setError('Please enter a template name or select a template type.');
      return;
    }

    if (!selectedCategory) {
      setError('Please select a category.');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const uploadedTemplate = await uploadCertificateTemplate(
        selectedFile,
        templateName.trim(),
        description.trim(),
        selectedCategory
      );

      setSuccess(`Template "${templateName}" uploaded successfully to ${CERTIFICATE_CATEGORIES[selectedCategory].name}!`);
      resetForm();
      loadTemplates();
      loadStatistics();
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.response?.data?.detail || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Delete function
  const handleDelete = async (templateName) => {
    if (!window.confirm('Are you sure you want to delete this certificate template?')) {
      return;
    }

    try {
      await deleteCertificateTemplate(templateName);
      setSuccess('Certificate template deleted successfully!');
      loadTemplates();
      loadStatistics();
      if (previewTemplate && previewTemplate.name === templateName) {
        setPreviewModalOpen(false);
        setPreviewTemplate(null);
      }
    } catch (error) {
      console.error('Delete error:', error);
      setError(error.response?.data?.detail || 'Failed to delete template');
    }
  };

  // Reset form function
  const resetForm = () => {
    setSelectedFile(null);
    setTemplateName('');
    setSelectedCategory('academic');
    setSelectedTemplateType('');
    setCustomTemplateName('');
    setDescription('');
  };

  // Preview function
  const handlePreview = async (template) => {
    try {
      const previewData = await previewCertificateTemplate(template.name);
      setPreviewTemplate(previewData);
      setPreviewModalOpen(true);
    } catch (error) {
      console.error('Preview error:', error);
      setError('Failed to load template preview');
    }
  };

  // Copy template URL function
  const copyTemplateUrl = (template) => {
    const url = `${window.location.origin}/templates/${template.filename}`;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(() => {
        setSuccess('Template URL copied to clipboard!');
      }).catch(() => {
        fallbackCopyTextToClipboard(url);
      });
    } else {
      fallbackCopyTextToClipboard(url);
    }
  };

  const fallbackCopyTextToClipboard = (text) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      setSuccess('Template URL copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy URL:', err);
      setError('Failed to copy URL to clipboard');
    } finally {
      document.body.removeChild(textArea);
    }
  };

  // Utility functions
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };
  return (
    <AdminLayout pageTitle="Certificate Templates">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <i className="fas fa-file-certificate text-white"></i>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Certificate Templates</h1>
                <p className="text-sm text-gray-600">Manage and organize certificate templates by category</p>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="flex items-center space-x-6 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{statistics?.total_templates || 0}</div>
                <div className="text-gray-500">Templates</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{statistics?.total_size || '0 MB'}</div>
                <div className="text-gray-500">Storage</div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6">
          {/* Alert Messages */}
          {success && (
            <div className="fixed top-4 right-4 z-[99999] animate-in slide-in-from-right duration-300">
              <div className="bg-white border border-green-200 rounded-lg shadow-lg p-4 flex items-center space-x-3 max-w-sm">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-check text-green-600 text-sm"></i>
                </div>
                <div className="flex-1">
                  <p className="text-green-800 font-medium text-sm">{success}</p>
                </div>
                <button onClick={() => setSuccess('')} className="text-gray-400 hover:text-gray-600">
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
                <button onClick={() => setError('')} className="text-gray-400 hover:text-gray-600">
                  <i className="fas fa-times text-sm"></i>
                </button>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'upload'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <i className="fas fa-upload mr-2"></i>
                  Upload Template
                </button>
                <button
                  onClick={() => setActiveTab('browse')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'browse'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <i className="fas fa-folder-open mr-2"></i>
                  Browse Templates
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'upload' && (
                <div className="grid lg:grid-cols-2 gap-8">
                  {/* Upload Form */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload New Template</h3>
                    
                    <form onSubmit={handleUpload} className="space-y-4">
                      {/* Category Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Category <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={selectedCategory}
                          onChange={(e) => {
                            setSelectedCategory(e.target.value);
                            setSelectedTemplateType('');
                            setCustomTemplateName('');
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          {Object.entries(CERTIFICATE_CATEGORIES).map(([key, category]) => (
                            <option key={key} value={key}>
                              {category.icon} {category.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Template Type Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Template Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={selectedTemplateType}
                          onChange={(e) => {
                            setSelectedTemplateType(e.target.value);
                            if (e.target.value !== 'custom') {
                              setTemplateName(e.target.value);
                              setCustomTemplateName('');
                            } else {
                              setTemplateName('');
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          <option value="">Select template type...</option>
                          {CERTIFICATE_CATEGORIES[selectedCategory]?.templates.map((template, index) => (
                            <option key={index} value={template}>
                              {template}
                            </option>
                          ))}
                          <option value="custom">Custom Template Name</option>
                        </select>
                      </div>

                      {/* Custom Template Name */}
                      {selectedTemplateType === 'custom' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Custom Template Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={customTemplateName}
                            onChange={(e) => {
                              setCustomTemplateName(e.target.value);
                              setTemplateName(e.target.value);
                            }}
                            placeholder="Enter custom template name"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                      )}

                      {/* Description */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description
                        </label>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Optional description..."
                          rows="2"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        />
                      </div>

                      {/* File Upload */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          HTML File <span className="text-red-500">*</span>
                        </label>
                        <div
                          className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer ${
                            selectedFile 
                              ? 'border-green-300 bg-green-50' 
                              : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
                          }`}
                          onDragOver={handleDragOver}
                          onDrop={handleDrop}
                          onClick={() => document.getElementById('fileInput').click()}
                        >
                          {selectedFile ? (
                            <div className="text-green-600">
                              <i className="fas fa-check-circle text-2xl mb-2"></i>
                              <p className="font-medium">{selectedFile.name}</p>
                              <p className="text-sm text-green-500">
                                {formatFileSize(selectedFile.size)}
                              </p>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedFile(null);
                                }}
                                className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                              >
                                Remove file
                              </button>
                            </div>
                          ) : (
                            <div className="text-gray-500">
                              <i className="fas fa-cloud-upload-alt text-3xl mb-2 text-gray-400"></i>
                              <p className="font-medium">Drop HTML file here or click to browse</p>
                              <p className="text-sm text-gray-400">HTML files only, max 10MB</p>
                            </div>
                          )}
                        </div>
                        <input
                          type="file"
                          id="fileInput"
                          accept=".html,.htm"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={isUploading || !selectedFile || !templateName.trim()}
                        className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                          isUploading || !selectedFile || !templateName.trim()
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                        }`}
                      >
                        {isUploading ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-upload mr-2"></i>
                            Upload Template
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  {/* Category Guide */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories Guide</h3>
                    <div className="space-y-3">
                      {Object.entries(CERTIFICATE_CATEGORIES).map(([key, category]) => (
                        <div 
                          key={key}
                          className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                            selectedCategory === key 
                              ? `border-${category.color}-200 bg-${category.color}-50` 
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                          onClick={() => {
                            setSelectedCategory(key);
                            setSelectedTemplateType('');
                            setCustomTemplateName('');
                          }}
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{category.icon}</span>
                            <div>
                              <h4 className="font-medium text-gray-900">{category.name}</h4>
                              <p className="text-sm text-gray-600">{category.templates.length} template types</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'browse' && (
                <div>
                  {/* Category Filter */}
                  <div className="flex items-center space-x-4 mb-6">
                    <label className="text-sm font-medium text-gray-700">Filter by category:</label>
                    <select
                      value={selectedCategoryFilter}
                      onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">All Categories</option>
                      {Object.entries(CERTIFICATE_CATEGORIES).map(([key, category]) => (
                        <option key={key} value={key}>
                          {category.icon} {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Templates List */}
                  {templates.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {templates
                        .filter(template => 
                          selectedCategoryFilter === 'all' || 
                          template.category === selectedCategoryFilter
                        )
                        .map((template, index) => (
                        <div key={template._id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">
                                {CERTIFICATE_CATEGORIES[template.category || 'academic']?.icon || '📄'}
                              </span>
                              <div>
                                <h4 className="font-medium text-gray-900 text-sm">{template.name}</h4>
                                <p className="text-xs text-gray-500">{template.category || 'academic'}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-xs text-gray-500 mb-3">
                            <div>Size: {template.formatted_size}</div>
                            <div>Added: {formatDate(template.uploaded_at)}</div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handlePreview(template)}
                              className="flex-1 py-1.5 px-2 bg-blue-50 text-blue-600 text-xs font-medium rounded hover:bg-blue-100 transition-colors duration-150"
                              title="Preview"
                            >
                              <i className="fas fa-eye mr-1"></i>
                              Preview
                            </button>
                            <button
                              onClick={() => copyTemplateUrl(template)}
                              className="py-1.5 px-2 bg-green-50 text-green-600 text-xs font-medium rounded hover:bg-green-100 transition-colors duration-150"
                              title="Copy URL"
                            >
                              <i className="fas fa-copy"></i>
                            </button>
                            <button
                              onClick={() => handleDelete(template.name)}
                              className="py-1.5 px-2 bg-red-50 text-red-600 text-xs font-medium rounded hover:bg-red-100 transition-colors duration-150"
                              title="Delete"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-file-certificate text-2xl text-gray-400"></i>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
                      <p className="text-gray-500 mb-4">Upload your first certificate template to get started.</p>
                      <button
                        onClick={() => setActiveTab('upload')}
                        className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
                      >
                        <i className="fas fa-plus mr-2"></i>
                        Upload Template
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Preview Modal */}
        {previewModalOpen && previewTemplate && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full h-full max-w-6xl max-h-[90vh] m-4 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <i className="fas fa-eye text-blue-600 mr-2"></i>
                  {previewTemplate.name}
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => copyTemplateUrl(previewTemplate)}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors duration-200"
                  >
                    <i className="fas fa-copy mr-1"></i>
                    Copy URL
                  </button>
                  <button
                    onClick={() => setPreviewModalOpen(false)}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors duration-200"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              </div>
              <div className="h-full overflow-hidden">
                <iframe
                  src={`data:text/html;charset=utf-8,${encodeURIComponent(previewTemplate.content)}`}
                  className="w-full h-full border-none"
                  title="Template Preview"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default ManageCertificates;
