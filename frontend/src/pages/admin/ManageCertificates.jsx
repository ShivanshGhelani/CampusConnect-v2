import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import UploadForm from '../../components/admin/certificates/UploadForm';
import TemplateTable from '../../components/admin/certificates/TemplateTable';
import EditModal from '../../components/admin/certificates/EditModal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { adminAPI } from '../../api/admin';
import { Dropdown, SearchBox } from '../../components/ui';

function ManageCertificates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [currentCertificateTemplate, setCurrentCertificateTemplate] = useState(null);
  const [certificateModalOpen, setCertificateModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ field: 'uploaded_at', direction: 'desc' });
  const [stats, setStats] = useState({
    totalTemplates: 0,
    categoriesCount: 0,
    recentUploads: 0
  });

  // Floating panel states for upload form
  const [isFloatingPanelOpen, setIsFloatingPanelOpen] = useState(false);
  const [isFloatingPanelMinimized, setIsFloatingPanelMinimized] = useState(false);

  // Form data for new template upload
  const [newTemplateForm, setNewTemplateForm] = useState({
    name: '',
    category: '',
    newCategory: '',
    tags: '',
    file: null
  });

  // Add/remove modal backdrop blur class
  useEffect(() => {
    const isModalOpen = isEditModalOpen || isPreviewModalOpen || certificateModalOpen;
    
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isEditModalOpen, isPreviewModalOpen, certificateModalOpen]);

  // Cleanup blob URLs when component unmounts
  useEffect(() => {
    return () => {
      if (currentCertificateTemplate && currentCertificateTemplate.url.startsWith('blob:')) {
        URL.revokeObjectURL(currentCertificateTemplate.url);
      }
    };
  }, [currentCertificateTemplate]);

  // Fetch templates on component mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // Using certificate template API endpoint
      const response = await adminAPI.getCertificateTemplatesList();
      
      if (response.data.success) {
        const templatesData = response.data.templates || [];
        setTemplates(templatesData);
        
        // Calculate stats
        const categories = [...new Set(templatesData.map(t => t.category))];
        const recentCount = templatesData.filter(t => {
          const uploadDate = new Date(t.created_at);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return uploadDate > weekAgo;
        }).length;
        
        setStats({
          totalTemplates: templatesData.length,
          categoriesCount: categories.length,
          recentUploads: recentCount
        });
      } else {
        setError('Failed to fetch certificate templates');
      }
    } catch (error) {
      
      setError('Failed to load certificate templates. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    if (type === 'success') {
      setSuccessMessage(message);
      setError('');
    } else {
      setError(message);
      setSuccessMessage('');
    }

    // Auto clear after 5 seconds
    setTimeout(() => {
      setSuccessMessage('');
      setError('');
    }, 5000);
  };

  const handleMigrateTemplates = async () => {
    if (window.confirm('This will migrate existing template files to the database. Continue?')) {
      try {
        setIsLoading(true);
        setError('');
        
        const response = await adminAPI.migrateCertificateTemplates();
        
        if (response.data.success) {
          const migratedCount = response.data.migrated_count || 0;
          showNotification(`Successfully migrated ${migratedCount} certificate templates to database.`, 'success');
          // Refresh the templates list
          await fetchTemplates();
        } else {
          setError('Failed to migrate templates');
        }
      } catch (error) {
        
        setError('Failed to migrate templates. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleUploadSuccess = (newTemplate) => {
    setTemplates(prev => [newTemplate, ...prev]);
    setStats(prev => ({
      ...prev,
      totalTemplates: prev.totalTemplates + 1,
      recentUploads: prev.recentUploads + 1
    }));
    setIsUploading(false);
    
    // Reset form and close panel
    setNewTemplateForm({
      name: '',
      category: '',
      newCategory: '',
      tags: '',
      file: null
    });
    setIsFloatingPanelOpen(false);
    setIsFloatingPanelMinimized(false);
    
    showNotification('Certificate template uploaded successfully!', 'success');
  };

  const handleEditTemplate = (template) => {
    setSelectedTemplate(template);
    setIsEditModalOpen(true);
  };

  const handleDeleteTemplate = async (templateId) => {
    if (window.confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      try {
        setIsLoading(true);
        
        // Call delete API
        await adminAPI.deleteCertificateTemplate(templateId);
        
        // Remove from local state
        setTemplates(prev => prev.filter(t => t.id !== templateId));
        setStats(prev => ({
          ...prev,
          totalTemplates: prev.totalTemplates - 1
        }));
        
        showNotification('Certificate template deleted successfully!', 'success');
      } catch (error) {
        
        showNotification('Failed to delete template. Please try again.', 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleUpdateTemplate = (updatedTemplate) => {
    setTemplates(prev => 
      prev.map(t => t.id === updatedTemplate.id ? updatedTemplate : t)
    );
    setIsEditModalOpen(false);
    setSelectedTemplate(null);
  };

  const handlePreviewTemplate = async (template) => {
    try {
      // Use the file_url from the template
      const templateUrl = template.file_url;
      if (!templateUrl) {
        showNotification('Template URL not found', 'error');
        return;
      }

      // Fetch the HTML content and create a blob URL for proper rendering
      const response = await fetch(templateUrl);
      if (!response.ok) {
        throw new Error('Failed to load template');
      }
      const htmlContent = await response.text();

      // Create a blob URL from the HTML content so it renders properly
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);

      setCurrentCertificateTemplate({
        url: blobUrl,
        originalUrl: templateUrl,
        name: template.name,
        category: template.category,
        created_at: template.created_at,
        file_path: template.file_path,
        tags: template.tags
      });
      setCertificateModalOpen(true);
    } catch (error) {
      
      // Fallback to original URL if fetch fails
      setCurrentCertificateTemplate({
        url: template.file_url,
        originalUrl: template.file_url,
        name: template.name,
        category: template.category,
        created_at: template.created_at,
        file_path: template.file_path,
        tags: template.tags
      });
      setCertificateModalOpen(true);
    }
  };

  const handleDownloadTemplate = async (template) => {
    try {
      const templateUrl = template.file_url;
      if (!templateUrl) {
        showNotification('Template URL not found', 'error');
        return;
      }

      // Fetch the template content
      const response = await fetch(templateUrl);
      if (!response.ok) {
        throw new Error('Failed to download template');
      }
      
      const blob = await response.blob();
      
      // Create download link
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = template.filename || `${template.name.replace(/\s+/g, '_')}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(downloadUrl);
      
      showNotification('Template downloaded successfully!', 'success');
    } catch (error) {
      
      showNotification('Failed to download template. Please try again.', 'error');
    }
  };

  const handleSort = (field) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Filter templates based on search and filters
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (template.tags && template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
    const matchesCategory = !categoryFilter || template.category === categoryFilter;
    const matchesTag = !tagFilter || (template.tags && template.tags.includes(tagFilter));
    
    return matchesSearch && matchesCategory && matchesTag;
  }).sort((a, b) => {
    if (!sortConfig || !sortConfig.field) return 0;
    
    const aValue = a[sortConfig.field];
    const bValue = b[sortConfig.field];
    
    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  // Get unique categories and tags for filters
  const availableCategories = [...new Set(templates.map(t => t.category))];
  const availableTags = [...new Set(templates.flatMap(t => t.tags || []))];

  return (
    <>
      <AdminLayout pageTitle="Certificate Template Manager">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Certificate Template Management</h1>
                <p className="mt-1 text-sm text-gray-600">Manage and organize certificate templates</p>
              </div>
              
              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setIsFloatingPanelOpen(true);
                    setIsFloatingPanelMinimized(false);
                  }}
                  className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Upload Template
                </button>
                <button
                  onClick={() => navigate('/admin/certificate-canvas')}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Certificate Template
                </button>
              </div>
            </div>
          </div>
          {/* Flash Messages */}
          {(successMessage || error) && (
            <div className="mb-6">
              {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md flex items-center">
                  <i className="fas fa-check-circle mr-2 text-green-600"></i>
                  {successMessage}
                </div>
              )}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md flex items-center">
                  <i className="fas fa-exclamation-circle mr-2 text-red-600"></i>
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-file-alt text-blue-600"></i>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Templates</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.totalTemplates}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-layer-group text-green-600"></i>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Categories</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.categoriesCount}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-clock text-purple-600"></i>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Recent Uploads</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.recentUploads}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <i className="fas fa-search mr-2 text-blue-600"></i>
              Search & Filter Templates
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <SearchBox
                  placeholder="Search by name or tags..."
                  value={searchTerm}
                  onChange={(value) => setSearchTerm(value)}
                  showFilters={false}
                  size="lg"
                />
              </div>
              
              <div>
                <Dropdown
                  label="Category"
                  placeholder="All Categories"
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  clearable
                  options={availableCategories.map(category => ({ 
                    label: category, 
                    value: category,
                    icon: <i className="fas fa-folder text-xs"></i>
                  }))}
                  icon={<i className="fas fa-layer-group text-xs"></i>}
                />
              </div>
              
              <div>
                <Dropdown
                  label="Tag"
                  placeholder="All Tags"
                  value={tagFilter}
                  onChange={setTagFilter}
                  clearable
                  options={availableTags.map(tag => ({ 
                    label: tag, 
                    value: tag,
                    icon: <i className="fas fa-tag text-xs"></i>
                  }))}
                  icon={<i className="fas fa-tags text-xs"></i>}
                />
              </div>
            </div>
            
            {(searchTerm || categoryFilter || tagFilter) && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {filteredTemplates.length} of {templates.length} templates
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setCategoryFilter('');
                    setTagFilter('');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
          
          {/* Templates Table */}
          {isLoading ? (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-center">
              <LoadingSpinner size="lg" />
              <p className="text-gray-600 mt-4">Loading templates...</p>
            </div>
          ) : (
            <TemplateTable
              templates={filteredTemplates}
              onEdit={handleEditTemplate}
              onDelete={handleDeleteTemplate}
              onPreview={handlePreviewTemplate}
              onDownload={handleDownloadTemplate}
              sortConfig={sortConfig}
              onSort={handleSort}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
            />
          )}
        </div>
      </AdminLayout>
      
      {/* Floating Upload Template Panel */}
      {isFloatingPanelOpen && createPortal(
        <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ease-in-out ${
          isFloatingPanelMinimized 
            ? 'w-80 h-12' 
            : 'w-96 h-auto max-h-[80vh]'
        }`}>
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
            {/* Panel Header */}
            <div className="bg-purple-600 text-white px-4 py-3 flex items-center justify-between cursor-pointer"
                 onClick={() => setIsFloatingPanelMinimized(!isFloatingPanelMinimized)}>
              <div className="flex items-center">
                <i className="fas fa-upload mr-2"></i>
                <span className="font-medium text-sm">Upload New Template</span>
                {newTemplateForm.name && (
                  <span className="ml-2 text-blue-200 text-xs">
                    - {newTemplateForm.name}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFloatingPanelMinimized(!isFloatingPanelMinimized);
                  }}
                  className="text-blue-200 hover:text-white p-1"
                  title={isFloatingPanelMinimized ? "Restore" : "Minimize"}
                >
                  <i className={`fas fa-${isFloatingPanelMinimized ? 'window-maximize' : 'window-minimize'} text-xs`}></i>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFloatingPanelOpen(false);
                    setIsFloatingPanelMinimized(false);
                    // Reset form when closing
                    setNewTemplateForm({
                      name: '',
                      category: '',
                      newCategory: '',
                      tags: '',
                      file: null
                    });
                  }}
                  className="text-blue-200 hover:text-white p-1"
                  title="Close"
                >
                  <i className="fas fa-times text-xs"></i>
                </button>
              </div>
            </div>

            {/* Panel Content */}
            {!isFloatingPanelMinimized && (
              <div className="max-h-[calc(80vh-48px)] overflow-y-auto">
                <UploadForm 
                  onUploadSuccess={handleUploadSuccess}
                  isUploading={isUploading}
                  setIsUploading={setIsUploading}
                  availableCategories={availableCategories}
                  formData={newTemplateForm}
                  setFormData={setNewTemplateForm}
                  isFloatingPanel={true}
                />
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
      {/* Certificate Preview Modal */}
      {certificateModalOpen && currentCertificateTemplate && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/50 z-[99999] animate-in fade-in duration-200">
          {/* Floating Close Button */}
          <button
            onClick={() => {
              // Clean up blob URL if it exists
              if (currentCertificateTemplate.url.startsWith('blob:')) {
                URL.revokeObjectURL(currentCertificateTemplate.url);
              }
              setCertificateModalOpen(false);
              setCurrentCertificateTemplate(null);
            }}
            className="fixed top-4 right-4 z-[100000] bg-black/80 hover:bg-black text-white rounded-full p-3 transition-colors shadow-lg"
            title="Close Preview"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Floating Actions */}
          <div className="fixed top-4 left-4 z-[100000] flex gap-2">
            <a
              href={currentCertificateTemplate.originalUrl || currentCertificateTemplate.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open Original
            </a>
            <button
              onClick={() => {
                const template = {
                  file_url: currentCertificateTemplate.originalUrl,
                  filename: currentCertificateTemplate.file_path || `${currentCertificateTemplate.name.replace(/\s+/g, '_')}.html`,
                  name: currentCertificateTemplate.name
                };
                handleDownloadTemplate(template);
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download
            </button>
            <div className="bg-black/80 text-white px-4 py-2 rounded-lg text-sm shadow-lg flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {currentCertificateTemplate.name} ({currentCertificateTemplate.category})
            </div>
          </div>

          {/* Template Info Bar */}
          {currentCertificateTemplate.tags && currentCertificateTemplate.tags.length > 0 && (
            <div className="fixed bottom-4 left-4 z-[100000] flex gap-2">
              {currentCertificateTemplate.tags.slice(0, 3).map((tag, index) => (
                <span 
                  key={index}
                  className="bg-black/80 text-white px-3 py-1 rounded-full text-xs shadow-lg"
                >
                  {tag}
                </span>
              ))}
              {currentCertificateTemplate.tags.length > 3 && (
                <span className="bg-black/80 text-white px-3 py-1 rounded-full text-xs shadow-lg">
                  +{currentCertificateTemplate.tags.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Full Screen Template Content */}
          <iframe
            src={currentCertificateTemplate.url}
            title={`Certificate Template - ${currentCertificateTemplate.name}`}
            className="w-full h-full border-0 bg-white"
            onError={() => {
              
            }}
          />
        </div>
      )}
      
      {/* Edit Modal */}
      {isEditModalOpen && selectedTemplate && (
        <EditModal
          template={selectedTemplate}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedTemplate(null);
          }}
          onUpdate={handleUpdateTemplate}
          availableCategories={availableCategories}
          availableTags={availableTags}
        />
      )}
    </>
  );
}

export default ManageCertificates;
