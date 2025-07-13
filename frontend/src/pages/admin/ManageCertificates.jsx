import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { 
  listCertificateTemplates, 
  uploadCertificateTemplate, 
  deleteCertificateTemplate, 
  getCertificateTemplateStatistics,
  previewCertificateTemplate 
} from '../../api/axios';

function ManageCertificates() {
  // State for template management
  const [templates, setTemplates] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [statistics, setStatistics] = useState(null);

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
      setError('Please enter a template name.');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const uploadedTemplate = await uploadCertificateTemplate(
        selectedFile,
        templateName.trim(),
        description.trim()
      );

      setSuccess('Certificate template uploaded successfully!');
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg">
                <i className="fas fa-file-code text-white text-2xl"></i>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
                  Certificate Templates
                </h1>
                <p className="text-gray-600 mt-1 text-lg">Upload and manage HTML certificate templates</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-6">
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

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="p-8">
              {/* Template Statistics Cards */}
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Total Templates</p>
                      <p className="text-3xl font-bold">{statistics?.total_templates || 0}</p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <i className="fas fa-file-code text-xl"></i>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-100 text-sm font-medium">Storage Used</p>
                      <p className="text-3xl font-bold">{statistics?.total_size || '0 MB'}</p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <i className="fas fa-hdd text-xl"></i>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">Active Templates</p>
                      <p className="text-3xl font-bold">{templates.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <i className="fas fa-check-circle text-xl"></i>
                    </div>
                  </div>
                </div>
              </div>
              {/* Upload Section */}
              <div className="grid lg:grid-cols-2 gap-8 mb-8">
                {/* Upload Form */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                    <i className="fas fa-cloud-upload-alt text-blue-600 me-3"></i>
                    Upload New Template
                  </h3>

                  <form onSubmit={handleUpload} className="space-y-6">
                    {/* Template Name */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Template Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="e.g., Event Participation Certificate"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        This name will be used for the file. Special characters will be replaced.
                      </p>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Optional description for this template..."
                        rows="3"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 resize-none"
                      />
                    </div>

                    {/* File Upload */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        HTML Template File <span className="text-red-500">*</span>
                      </label>
                      <div
                        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer ${
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
                            <i className="fas fa-check-circle text-3xl mb-3"></i>
                            <p className="font-semibold text-lg mb-2">File Selected!</p>
                            <p className="text-sm mb-2">{selectedFile.name}</p>
                            <p className="text-xs text-green-500">
                              Size: {formatFileSize(selectedFile.size)}
                            </p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFile(null);
                              }}
                              className="mt-3 text-xs text-red-600 hover:text-red-800 underline"
                            >
                              Remove file
                            </button>
                          </div>
                        ) : (
                          <div className="text-gray-500">
                            <i className="fas fa-cloud-upload-alt text-4xl mb-4 text-gray-400"></i>
                            <p className="text-lg font-semibold mb-2">Drag & drop your HTML file here</p>
                            <p className="text-sm mb-4">or click to browse</p>
                            <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                              <i className="fas fa-file-code me-2"></i>
                              HTML files only (.html, .htm)
                            </div>
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
                      className={`w-full py-3 px-6 rounded-xl font-semibold text-white transition-all duration-200 ${
                        isUploading || !selectedFile || !templateName.trim()
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 shadow-lg hover:shadow-xl'
                      }`}
                    >
                      {isUploading ? (
                        <>
                          <i className="fas fa-spinner fa-spin me-2"></i>
                          Uploading Template...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-upload me-2"></i>
                          Upload Template
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Quick Tips */}
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl border border-purple-200 p-6">
                  <h3 className="text-xl font-bold text-purple-900 mb-6 flex items-center">
                    <i className="fas fa-lightbulb text-yellow-500 me-3"></i>
                    Template Guidelines
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 me-3 flex-shrink-0"></div>
                      <div>
                        <p className="font-semibold text-purple-900 text-sm">Use placeholders</p>
                        <p className="text-purple-700 text-xs">
                          Use [Student Name], [Event Name], [Date] etc. for dynamic content
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 me-3 flex-shrink-0"></div>
                      <div>
                        <p className="font-semibold text-purple-900 text-sm">Responsive design</p>
                        <p className="text-purple-700 text-xs">
                          Ensure your template works on different screen sizes
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 me-3 flex-shrink-0"></div>
                      <div>
                        <p className="font-semibold text-purple-900 text-sm">Print-friendly</p>
                        <p className="text-purple-700 text-xs">
                          Use CSS print styles for better print output
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 me-3 flex-shrink-0"></div>
                      <div>
                        <p className="font-semibold text-purple-900 text-sm">File size limit</p>
                        <p className="text-purple-700 text-xs">
                          Maximum 10MB per template file
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 bg-white/50 rounded-xl p-4">
                    <p className="text-sm font-semibold text-purple-900 mb-2">
                      <i className="fas fa-download me-2"></i>
                      Sample Template
                    </p>
                    <p className="text-xs text-purple-700 mb-3">
                      Download our sample template to get started quickly
                    </p>
                    <a
                      href="/sample-certificate-template.html"
                      download
                      className="inline-flex items-center px-3 py-2 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition-colors duration-200"
                    >
                      <i className="fas fa-download me-2"></i>
                      Download Sample
                    </a>
                  </div>
                </div>
              </div>

              {/* Templates List */}
              {templates.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center">
                      <i className="fas fa-list text-gray-600 me-3"></i>
                      Uploaded Templates ({templates.length})
                    </h3>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Template
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Size
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Uploaded
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {templates.map((template, index) => (
                          <tr key={template._id} className="hover:bg-gray-50 transition-colors duration-150">
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center me-3">
                                  <i className="fas fa-file-code text-white text-sm"></i>
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900">{template.name}</p>
                                  <p className="text-sm text-gray-500">{template.filename}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              {template.formatted_size}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {formatDate(template.uploaded_at)}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                <button
                                  onClick={() => handlePreview(template)}
                                  className="text-blue-600 hover:text-blue-800 transition-colors duration-150"
                                  title="Preview"
                                >
                                  <i className="fas fa-eye"></i>
                                </button>
                                <button
                                  onClick={() => copyTemplateUrl(template)}
                                  className="text-green-600 hover:text-green-800 transition-colors duration-150"
                                  title="Copy URL"
                                >
                                  <i className="fas fa-copy"></i>
                                </button>
                                <button
                                  onClick={() => handleDelete(template.name)}
                                  className="text-red-600 hover:text-red-800 transition-colors duration-150"
                                  title="Delete"
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {templates.length === 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-file-code text-2xl text-gray-400"></i>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No templates yet</h3>
                  <p className="text-gray-500 mb-6">Upload your first HTML certificate template to get started.</p>
                  <button
                    onClick={() => document.getElementById('fileInput').click()}
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors duration-200"
                  >
                    <i className="fas fa-plus me-2"></i>
                    Upload Your First Template
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Preview Modal */}
        {previewModalOpen && previewTemplate && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full h-full max-w-7xl max-h-[90vh] m-4 overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <i className="fas fa-eye text-blue-600 me-3"></i>
                  Preview: {previewTemplate.name}
                </h3>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => copyTemplateUrl(previewTemplate)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200"
                  >
                    <i className="fas fa-copy me-2"></i>
                    Copy URL
                  </button>
                  <button
                    onClick={() => setPreviewModalOpen(false)}
                    className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
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
